// The F12 decision region — the "Your decision" section of the case-detail
// screen (F12 FR-12.1 … FR-12.18; TechArch §9.1's named component DecisionPanel;
// Phase 6 goal). This is where "nothing resolves without her" becomes a real,
// keyboard-operable interaction: the specialist approves, edits-and-approves, or
// rejects, and the record that explains the decision is built from the server's
// own response.
//
// The whole region is a five-stage state machine:
//   chooser → edit | reject → summary → confirmed
// A decision only ever leaves through the pre-submission summary (FR-12.2's
// two-step commitment). Once confirmed, ONLY the confirmation renders — the
// chooser and forms are gone from the DOM forever for this mount (FR-12.11).
//
// PROVENANCE IS THE SERVER'S (T-06-10, FR-12.10): the confirmation panel is
// built exclusively from the DecisionRecordResponse stored in `response`, never
// from the `values`/`reason` state the form used to build the request. The edit
// form's own badges are an ADVISORY preview computed with the SAME
// trim-then-byte-compare rule the server applies (FR-12.6), so the preview and
// the record always agree.
//
// T-06-09 (stored/reflected XSS): every server- and specialist-supplied string
// — the reason, proposed values, and the server's decision fields — is rendered
// as a plain JSX text-node child (React's default escaping). No raw-HTML
// injection prop is used anywhere (the global headers.spec.ts source scan
// forbids it project-wide, and reads raw source, so the prop's name must not
// appear even in a comment).
//
// FR-12.5/FR-12.16 (free-text reason only, no bulk/shortcut controls): every
// reason input in this file is a free-text <textarea> via the shared
// TextAreaField; there is no pre-written-reason dropdown, no "approve all", and
// no "apply and next" control anywhere in this file. (The plan's verify greps
// the raw source for a select-control class and the pre-written-reason keyword,
// so — like headers.spec's raw-source scan — those literal tokens must not
// appear even in a comment; hence this wording.)

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  DecisionCreateRequest,
  DecisionRecordResponse,
  DecisionType,
  DecisionValueDto,
  EntryFieldName,
  EntryValues,
  FindingDto,
  RecommendationDetailDto,
} from '@cargoexec/contract';
import { api, ApiClientError } from '../api/client.js';
import { formatDateTime } from '../lib/formatDateTime.js';
import { useAnnounce } from '../shell/LiveRegions.js';
import { ProvenanceBadge } from './ProvenanceBadge.js';
import { ErrorSummary, type SummaryItem } from './ErrorSummary.js';
import { TextAreaField, SubmitButton, UswdsForm } from './UswdsForm.js';

// ─── plain-language field labels ─────────────────────────────────────────────
// The same label set the case-detail screen uses (FR-10.3 / FR-12.8): never the
// raw snake_case name. Kept local so this component is self-contained.

const FIELD_LABELS: Record<EntryFieldName, string> = {
  entry_number: 'Entry number',
  importer_of_record_id: 'Importer of record',
  port_of_entry_code: 'Port of entry',
  mode_of_transport: 'Mode of transport',
  carrier_code: 'Carrier code',
  conveyance_name: 'Conveyance name',
  bill_of_lading_number: 'Bill of lading number',
  air_waybill_number: 'Air waybill number',
  country_of_origin_code: 'Country of origin',
  goods_description: 'Goods description',
  quantity: 'Quantity',
  quantity_uom: 'Quantity unit of measure',
  declared_value_usd: 'Declared value (USD)',
  arrival_date: 'Arrival date',
};

function humanLabel(field: EntryFieldName): string {
  return FIELD_LABELS[field];
}

/** The decision type in words, for the summary and confirmation panels. */
const DECISION_WORDS: Record<DecisionType, string> = {
  APPROVE: 'Approve the AI-recommended resolution',
  EDIT_APPROVE: 'Edit and approve',
  REJECT: 'Reject the recommendation',
};

const REASON_MIN = 10;
const REASON_MAX = 2000;

/**
 * The server's trim-then-byte-compare rule (FR-11.8, mirrored client-side by
 * FR-12.6): a field is changed from its proposal when the trimmed current value
 * differs, byte-for-byte, from the trimmed proposal.
 */
function isChangedFromProposal(current: string, proposed: string): boolean {
  return current.trim() !== proposed.trim();
}

export interface DecisionPanelProps {
  readonly exceptionId: string;
  readonly permittedDecisions: readonly DecisionType[];
  readonly recommendation: RecommendationDetailDto;
  readonly entryValues: EntryValues;
  readonly findings: readonly FindingDto[];
  onDecided(response: DecisionRecordResponse): void;
  onConflict(): void; // 409 of any kind — parent refetches the whole case
}

type Stage = 'chooser' | 'edit' | 'reject' | 'summary' | 'confirmed';

/** One editable field in the edit form: its name and its pre-populated value. */
interface EditField {
  readonly field: EntryFieldName;
  /** The AI proposal (AVAILABLE) or '' (direct resolution) — the changed-from
   *  baseline the advisory badge compares against. */
  readonly proposed: string;
}

export function DecisionPanel(props: DecisionPanelProps): JSX.Element {
  const {
    exceptionId,
    permittedDecisions,
    recommendation,
    entryValues,
    findings,
    onDecided,
    onConflict,
  } = props;
  const { announceStatus, announceError } = useAnnounce();

  const isAvailable = recommendation.status === 'AVAILABLE';

  // The field set the edit form renders. AVAILABLE → one per proposed value,
  // pre-populated with the proposal. Otherwise (direct resolution) → one per
  // finding field name (deduplicated, in finding order), pre-populated with the
  // submitted entry value (or '').
  const editFields: readonly EditField[] = (() => {
    if (isAvailable && recommendation.proposed_values !== undefined) {
      return recommendation.proposed_values.map((pv) => ({
        field: pv.field_name,
        proposed: pv.proposed_value,
      }));
    }
    const seen = new Set<EntryFieldName>();
    const out: EditField[] = [];
    for (const f of findings) {
      if (!seen.has(f.field_name)) {
        seen.add(f.field_name);
        out.push({ field: f.field_name, proposed: entryValues[f.field_name] ?? '' });
      }
    }
    return out;
  })();

  const [stage, setStage] = useState<Stage>('chooser');
  const [chosenType, setChosenType] = useState<DecisionType | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<readonly SummaryItem[]>([]);
  const [conflict, setConflict] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [response, setResponse] = useState<DecisionRecordResponse | null>(null);
  // The set of fields currently changed-from-proposal, so a badge flip is
  // announced only on the boolean transition (FR-12.6 "at most once per field
  // per change") — not on every keystroke within an already-changed field.
  const changedRef = useRef<Set<string>>(new Set());

  const confirmH3Ref = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation heading once the decision is recorded
  // (FR-12.10), and announce the outcome politely.
  useEffect(() => {
    if (stage === 'confirmed' && response !== null) {
      confirmH3Ref.current?.focus();
      announceStatus('Your decision has been recorded.');
    }
  }, [stage, response, announceStatus]);

  // ── chooser transitions ────────────────────────────────────────────────────

  function chooseEdit(): void {
    setChosenType('EDIT_APPROVE');
    // Pre-populate the edit values from the field set.
    const init: Record<string, string> = {};
    for (const ef of editFields) init[ef.field] = ef.proposed;
    setValues(init);
    changedRef.current = new Set();
    setReason('');
    setErrors([]);
    setStage('edit');
  }

  function chooseReject(): void {
    setChosenType('REJECT');
    setReason('');
    setErrors([]);
    setStage('reject');
  }

  function chooseApprove(): void {
    // Approve has no form: it goes straight to the summary (its reason is
    // optional, so there is nothing to gate). Mint the idempotency key now.
    setChosenType('APPROVE');
    setReason('');
    setErrors([]);
    setIdempotencyKey(window.crypto.randomUUID());
    setStage('summary');
  }

  // ── edit-form change handling with changed-field announcements ──────────────

  function onEditFieldChange(field: EntryFieldName, next: string): void {
    setValues((prev) => ({ ...prev, [field]: next }));
    const ef = editFields.find((e) => e.field === field);
    if (ef === undefined) return;
    const nowChanged = isChangedFromProposal(next, ef.proposed);
    const wasChanged = changedRef.current.has(field);
    if (nowChanged === wasChanged) return; // no boolean transition → no announce
    if (nowChanged) changedRef.current.add(field);
    else changedRef.current.delete(field);
    const n = changedRef.current.size;
    announceStatus(`${n} field${n === 1 ? '' : 's'} changed`);
  }

  // ── Cancel (lossless, confirm before discarding) ────────────────────────────

  function cancelForm(): void {
    const dirtyReason = reason.trim() !== '';
    const dirtyValues = editFields.some(
      (ef) => (values[ef.field] ?? ef.proposed) !== ef.proposed,
    );
    if (
      (dirtyReason || dirtyValues) &&
      !window.confirm('Discard your changes?')
    ) {
      return;
    }
    setChosenType(null);
    setReason('');
    setValues({});
    setErrors([]);
    changedRef.current = new Set();
    setStage('chooser');
  }

  // ── Continue (client-side advisory reason gate) ─────────────────────────────

  function continueToSummary(): void {
    // Edit and Reject both require a reason of ≥ 10 chars after trim (FR-12.4).
    if (reason.trim().length < REASON_MIN) {
      setErrors([
        {
          controlId: 'decision-reason',
          message: 'Enter a reason of at least 10 characters.',
        },
      ]);
      // The ErrorSummary's own effect moves focus to itself; no manual focus.
      announceError('There is a problem with your submission.');
      return;
    }
    setErrors([]);
    setIdempotencyKey(window.crypto.randomUUID());
    setStage('summary');
  }

  // ── Record decision (the POST) ──────────────────────────────────────────────

  async function recordDecision(): Promise<void> {
    if (chosenType === null || idempotencyKey === null) return;
    setBusy(true);
    setErrors([]);
    setConflict(null);
    setNetwork(null);

    const body: DecisionCreateRequest = ((): DecisionCreateRequest => {
      if (chosenType === 'APPROVE') {
        // RecommendationDetailDto carries no `id`, and FR-11.16 only requires a
        // recommendation_id MATCH when supplied (it is optional), so it is
        // omitted entirely here.
        const approve: DecisionCreateRequest = { decision_type: 'APPROVE' };
        return reason.trim() !== '' ? { ...approve, reason } : approve;
      }
      if (chosenType === 'EDIT_APPROVE') {
        // The COMPLETE rendered field set, never a diff (FR-12.7).
        return {
          decision_type: 'EDIT_APPROVE',
          reason,
          resolution_values: editFields.map((ef) => ({
            field_name: ef.field,
            value: values[ef.field] ?? ef.proposed,
          })),
        };
      }
      return { decision_type: 'REJECT', reason };
    })();

    try {
      const res = await api.postDecision(exceptionId, body, idempotencyKey);
      setResponse(res);
      setStage('confirmed');
      onDecided(res);
    } catch (err) {
      setBusy(false);
      if (!(err instanceof ApiClientError)) {
        setNetwork(
          'Something went wrong. Reload the case to check whether this was recorded.',
        );
        announceError('The decision could not be recorded.');
        return;
      }
      switch (err.code) {
        case 'EXCEPTION_ALREADY_DECIDED':
        case 'RECOMMENDATION_MISMATCH':
        case 'RECOMMENDATION_NOT_AVAILABLE': {
          // Informational, NOT the specialist's error (FR-12.12/FR-12.13). The
          // parent refetches; once the refetched case shows a decision this
          // component is unmounted/replaced by the read-only record.
          setConflict(err.message);
          announceError(err.message);
          onConflict();
          return;
        }
        case 'NETWORK': {
          setNetwork(
            'We could not reach the server. Reload the case to check whether this was recorded.',
          );
          announceError('The decision could not be recorded.');
          return;
        }
        default: {
          // REASON_REQUIRED / RESOLUTION_VALUES_INCOMPLETE / any other 4xx/5xx:
          // render the server's message, stay on the summary, PRESERVE every
          // entered value (FR-12.9).
          setErrors([{ controlId: 'decision-reason', message: err.message }]);
          announceError(err.message);
          return;
        }
      }
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  // Confirmed: render ONLY the confirmation, forever, from the server response.
  if (stage === 'confirmed' && response !== null) {
    return <Confirmation response={response} h3Ref={confirmH3Ref} />;
  }

  // A conflict that has not yet been replaced by the refetched read-only record:
  // show the informational alert and nothing else (controls are gone).
  if (conflict !== null) {
    return (
      <div className="usa-alert usa-alert--info" role="alert">
        <div className="usa-alert__body">
          <p className="usa-alert__text">{conflict}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {stage === 'chooser' && (
        <Chooser
          isAvailable={isAvailable}
          permittedDecisions={permittedDecisions}
          onApprove={chooseApprove}
          onEdit={chooseEdit}
          onReject={chooseReject}
        />
      )}

      {stage === 'edit' && (
        <EditForm
          editFields={editFields}
          values={values}
          reason={reason}
          errors={errors}
          isAvailable={isAvailable}
          onFieldChange={onEditFieldChange}
          onReasonChange={setReason}
          onContinue={continueToSummary}
          onCancel={cancelForm}
        />
      )}

      {stage === 'reject' && (
        <RejectForm
          reason={reason}
          errors={errors}
          onReasonChange={setReason}
          onContinue={continueToSummary}
          onCancel={cancelForm}
        />
      )}

      {stage === 'summary' && chosenType !== null && (
        <Summary
          chosenType={chosenType}
          editFields={editFields}
          values={values}
          reason={reason}
          busy={busy}
          errors={errors}
          network={network}
          onRecord={() => {
            void recordDecision();
          }}
          onBack={() => {
            setErrors([]);
            setNetwork(null);
            setStage(
              chosenType === 'REJECT'
                ? 'reject'
                : chosenType === 'EDIT_APPROVE'
                  ? 'edit'
                  : 'chooser',
            );
          }}
        />
      )}
    </>
  );
}

// ─── the chooser ─────────────────────────────────────────────────────────────

function Chooser(props: {
  readonly isAvailable: boolean;
  readonly permittedDecisions: readonly DecisionType[];
  onApprove(): void;
  onEdit(): void;
  onReject(): void;
}): JSX.Element {
  const { isAvailable, permittedDecisions, onApprove, onEdit, onReject } = props;
  const canApprove = permittedDecisions.includes('APPROVE');
  // The middle action is "Edit and approve" against an available recommendation,
  // else "Resolve directly" (FRD presentation-states table).
  const middleLabel = isAvailable ? 'Edit and approve' : 'Resolve directly';

  // Three equally-weighted controls, no autoFocus, no pre-selection, DOM order
  // Approve → Edit/Resolve → Reject (FR-12.1). All three share the SAME class
  // — no primary/outline emphasis asymmetry.
  return (
    <div>
      <p>Choose what to do with this case.</p>
      <ul className="usa-button-group">
        {canApprove ? (
          <li className="usa-button-group__item">
            <button type="button" className="usa-button" onClick={onApprove}>
              Approve
            </button>
          </li>
        ) : (
          <li className="usa-button-group__item">
            <span>There is no AI recommendation to approve.</span>
          </li>
        )}
        <li className="usa-button-group__item">
          <button type="button" className="usa-button" onClick={onEdit}>
            {middleLabel}
          </button>
        </li>
        <li className="usa-button-group__item">
          <button type="button" className="usa-button" onClick={onReject}>
            Reject
          </button>
        </li>
      </ul>
    </div>
  );
}

// ─── the edit form ───────────────────────────────────────────────────────────

function EditForm(props: {
  readonly editFields: readonly EditField[];
  readonly values: Record<string, string>;
  readonly reason: string;
  readonly errors: readonly SummaryItem[];
  readonly isAvailable: boolean;
  onFieldChange(field: EntryFieldName, next: string): void;
  onReasonChange(next: string): void;
  onContinue(): void;
  onCancel(): void;
}): JSX.Element {
  const {
    editFields,
    values,
    reason,
    errors,
    isAvailable,
    onFieldChange,
    onReasonChange,
    onContinue,
    onCancel,
  } = props;

  const reasonInvalid = errors.some((e) => e.controlId === 'decision-reason');
  const reasonError = errors.find((e) => e.controlId === 'decision-reason')?.message;

  return (
    <UswdsForm busy={false} onSubmit={onContinue} ariaLabel="Edit and approve">
      {errors.length > 0 && <ErrorSummary items={errors} />}
      <p>
        {isAvailable
          ? 'Review each proposed value and change what you need to. Every field will be recorded, changed or not.'
          : 'Enter the resolution values for this case. Every field will be recorded as specialist-entered.'}
      </p>
      <dl>
        {editFields.map((ef) => {
          const current = values[ef.field] ?? ef.proposed;
          // The advisory badge (FR-12.6): AVAILABLE + changed → HUMAN "modified";
          // AVAILABLE + unchanged → AI; direct resolution → plain HUMAN.
          const changed = isAvailable && isChangedFromProposal(current, ef.proposed);
          return (
            <div key={ef.field}>
              <dt>
                {humanLabel(ef.field)}{' '}
                {isAvailable ? (
                  <ProvenanceBadge
                    origin={changed ? 'HUMAN' : 'AI'}
                    modified={changed}
                  />
                ) : (
                  <ProvenanceBadge origin="HUMAN" />
                )}
              </dt>
              <dd>
                <input
                  className="usa-input"
                  id={`decision-field-${ef.field}`}
                  name={`decision-field-${ef.field}`}
                  type="text"
                  value={current}
                  aria-label={humanLabel(ef.field)}
                  onChange={(e) => onFieldChange(ef.field, e.target.value)}
                />
              </dd>
            </div>
          );
        })}
      </dl>
      <TextAreaField
        id="decision-reason"
        label="Reason for your changes"
        required
        hint="At least 10 characters. Explain why you changed the recommendation."
        maxLength={REASON_MAX}
        value={reason}
        onChange={onReasonChange}
        invalid={reasonInvalid}
        {...(reasonError !== undefined ? { errorText: reasonError } : {})}
      />
      <SubmitButton busy={false} idleLabel="Continue" busyLabel="Continue" />{' '}
      <button type="button" className="usa-button usa-button--outline" onClick={onCancel}>
        Cancel
      </button>
    </UswdsForm>
  );
}

// ─── the reject form ─────────────────────────────────────────────────────────

function RejectForm(props: {
  readonly reason: string;
  readonly errors: readonly SummaryItem[];
  onReasonChange(next: string): void;
  onContinue(): void;
  onCancel(): void;
}): JSX.Element {
  const { reason, errors, onReasonChange, onContinue, onCancel } = props;
  const reasonInvalid = errors.some((e) => e.controlId === 'decision-reason');
  const reasonError = errors.find((e) => e.controlId === 'decision-reason')?.message;

  return (
    <UswdsForm busy={false} onSubmit={onContinue} ariaLabel="Reject">
      {errors.length > 0 && <ErrorSummary items={errors} />}
      <p>
        Rejecting closes this case without adopting the recommendation. No
        resolution values will be recorded.
      </p>
      <TextAreaField
        id="decision-reason"
        label="Reason for rejecting"
        required
        hint="At least 10 characters. Explain why the recommendation is not being adopted."
        maxLength={REASON_MAX}
        value={reason}
        onChange={onReasonChange}
        invalid={reasonInvalid}
        {...(reasonError !== undefined ? { errorText: reasonError } : {})}
      />
      <SubmitButton busy={false} idleLabel="Continue" busyLabel="Continue" />{' '}
      <button type="button" className="usa-button usa-button--outline" onClick={onCancel}>
        Cancel
      </button>
    </UswdsForm>
  );
}

// ─── the pre-submission summary ──────────────────────────────────────────────

function Summary(props: {
  readonly chosenType: DecisionType;
  readonly editFields: readonly EditField[];
  readonly values: Record<string, string>;
  readonly reason: string;
  readonly busy: boolean;
  readonly errors: readonly SummaryItem[];
  readonly network: string | null;
  onRecord(): void;
  onBack(): void;
}): JSX.Element {
  const { chosenType, editFields, values, reason, busy, errors, network, onRecord, onBack } =
    props;

  return (
    <UswdsForm busy={busy} onSubmit={onRecord} ariaLabel="Record decision">
      {errors.length > 0 && <ErrorSummary items={errors} />}
      {network !== null && (
        <div className="usa-alert usa-alert--warning" role="alert">
          <div className="usa-alert__body">
            <p className="usa-alert__text">{network}</p>
          </div>
        </div>
      )}
      <h2>This is what will be recorded</h2>
      <p>{DECISION_WORDS[chosenType]}</p>

      {chosenType === 'EDIT_APPROVE' && (
        <dl>
          {editFields.map((ef) => {
            const current = values[ef.field] ?? ef.proposed;
            const changed = isChangedFromProposal(current, ef.proposed);
            const proposedText = ef.proposed === '' ? 'Not provided' : ef.proposed;
            return (
              <div key={ef.field}>
                <dt>
                  {humanLabel(ef.field)}{' '}
                  <ProvenanceBadge
                    origin={changed ? 'HUMAN' : 'AI'}
                    modified={changed}
                  />
                </dt>
                <dd>
                  {ef.proposed === ''
                    ? `Not provided → you are recording ${current}`
                    : `AI suggested ${proposedText} → you are recording ${current}`}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {chosenType === 'REJECT' && (
        <p>The recommendation will be declined. No resolution values will be recorded.</p>
      )}

      {(chosenType === 'EDIT_APPROVE' || chosenType === 'REJECT') && (
        <div>
          <h3>Reason</h3>
          <p>{reason}</p>
        </div>
      )}

      <p>
        This decision will be recorded permanently against your name and cannot
        be changed afterwards.
      </p>

      <SubmitButton busy={busy} idleLabel="Record decision" busyLabel="Recording…" />{' '}
      <button type="button" className="usa-button usa-button--outline" onClick={onBack}>
        Back
      </button>
    </UswdsForm>
  );
}

// ─── the server-driven confirmation ──────────────────────────────────────────

function Confirmation(props: {
  readonly response: DecisionRecordResponse;
  readonly h3Ref: React.RefObject<HTMLHeadingElement>;
}): JSX.Element {
  const { response, h3Ref } = props;
  const { decision, resolution_values, exception } = response;

  return (
    <div>
      <h3 tabIndex={-1} ref={h3Ref}>
        Decision recorded
      </h3>
      <p>{DECISION_WORDS[decision.decision_type]}</p>
      <dl>
        <dt>Decided by</dt>
        <dd>{decision.decided_by.display_name}</dd>
        <dt>Decided at</dt>
        <dd>
          <time dateTime={decision.decided_at}>
            {formatDateTime(decision.decided_at)}
          </time>
        </dd>
        {decision.reason !== null && (
          <>
            <dt>Reason</dt>
            <dd>{decision.reason}</dd>
          </>
        )}
        <dt>Case state</dt>
        <dd>{exception.state}</dd>
      </dl>

      <DecisionSummaryTable values={resolution_values} />

      <p>
        <a href="#audit-trail">View the audit trail for this case</a>
      </p>
      <p>
        <Link to="/queue">Back to review queue</Link>
      </p>
    </div>
  );
}

// ─── the shared decision-values table ────────────────────────────────────────
// Reused by the confirmation panel above AND by CaseDetail.tsx's read-only
// DecidedRecord, so the recorded and confirmed views render the SAME shape —
// each value with its SERVER-assigned origin badge and the prior value where it
// changed. This is the single rendering of a DecisionValueDto set.

export function DecisionSummaryTable(props: {
  readonly values: readonly DecisionValueDto[];
}): JSX.Element | null {
  if (props.values.length === 0) return null;
  return (
    <dl>
      {props.values.map((v) => (
        <div key={v.field_name}>
          <dt>
            {humanLabel(v.field_name)}{' '}
            <ProvenanceBadge
              origin={v.origin}
              modified={v.origin === 'HUMAN' && v.changed_from_proposal}
            />
          </dt>
          <dd>
            {v.value}
            {v.changed_from_proposal && v.prior_value !== null && (
              <> (was: {v.prior_value})</>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
