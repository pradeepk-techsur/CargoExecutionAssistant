// The F14 per-case audit-trail region (UX Screen; F14 FR-14.1 … FR-14.19;
// TechArch §9.1's named component `AuditTrailRegion`; Phase 6 success criterion
// 3). This is where the phase's third success criterion is answered in its
// literal, rendered form: "who decided this, what did the AI say, what did the
// human change" is readable INSIDE the application, in chronological order, with
// no export and no second tool.
//
// READ-ONLY BY CONSTRUCTION (FR-14.7, FR-14.8). This file renders no clickable
// action element of any kind — no button, no link pointing at a downloadable
// file, no window.print() call, and no "copy" affordance — there is nothing to
// click here, because there is nothing to do to history but read it. The
// introductory sentence states the record cannot be edited or deleted. The e2e
// suite (acceptance 5) proves the rendered region holds zero such controls.
//
// T-06-12 (stored XSS, FR-14.16): every server-supplied string — actor names,
// reasons, and every before/after value — is rendered as a plain JSX text-node
// child, relying on React's default escaping. No raw-HTML injection prop is used
// anywhere (the global headers.spec.ts source scan forbids the only such React
// prop under web/src, and it reads raw source — so the prop name must not appear
// even in a comment). The reason's line-preserving split still emits a plain
// <p>{line}</p> per line.
//
// T-06-13 (AI misattributed as a human, FR-14.4): the actor renderer branches
// FIRST on actor_type === 'AI' and, in that branch, NEVER reads entry.actor — so
// a future data anomaly (a non-null actor alongside actor_type='AI') cannot leak
// a person's name into an AI event.

import { useEffect, useRef, useState } from 'react';
import type {
  AuditActionType,
  AuditEntryDto,
  AuditTrailResponse,
  Origin,
} from '@cargoexec/contract';
import { api } from '../api/client.js';
import { formatDateTime } from '../lib/formatDateTime.js';
import { useAnnounce } from '../shell/LiveRegions.js';
import { Loading, ErrorState } from './states.js';
import { ProvenanceBadge } from './ProvenanceBadge.js';

// ─── props ───────────────────────────────────────────────────────────────────

export interface AuditTrailRegionProps {
  readonly exceptionId: string;
  /** Bump (any changing number) to force a refetch — e.g. CaseDetail
   *  increments a caseVersion counter every successful case reload, including
   *  the one DecisionPanel triggers via onDecided (FR-14.12: no polling, only a
   *  decision-triggered refresh). */
  readonly refreshToken: number;
  /** True only when reached via the /cases/:caseReference/audit deep link
   *  (FR-14.11): scrolls to and focuses this region's heading on load. */
  readonly focusOnMount?: boolean;
}

// ─── action-label table (FRD "Action labels", normative) ─────────────────────

/** The FRD's eight action rows, EXACTLY. Each carries the plain-language label
 *  the <h3> renders. The actor rendering is computed by `whoText` below (it
 *  needs the entry's actor/model, not just the action). An action_type not in
 *  this table renders its RAW string as the heading (FRD Validation rule —
 *  nothing in the record is hidden because the client did not recognise it). */
const ACTION_LABELS: Record<AuditActionType, string> = {
  ENTRY_RECEIVED: 'Cargo entry received',
  VALIDATION_COMPLETED: 'Validated against required-information rules',
  EXCEPTION_OPENED: 'Exception opened',
  RECOMMENDATION_GENERATED: 'AI recommendation generated',
  RECOMMENDATION_UNAVAILABLE: 'No AI recommendation available',
  RECOMMENDATION_APPROVED: 'Recommendation approved by specialist',
  RECOMMENDATION_EDITED_AND_APPROVED:
    'Recommendation edited and approved by specialist',
  RECOMMENDATION_REJECTED: 'Recommendation rejected by specialist',
};

function actionLabel(entry: AuditEntryDto): string {
  // A known action → its normative label; an unknown one → its raw string, so
  // no event is ever skipped for being unrecognised (FRD Validation rule).
  return (
    ACTION_LABELS[entry.action_type as AuditActionType] ??
    (entry.action_type as string)
  );
}

/**
 * The actor line, per the FRD's "Actor rendering" column. Branches FIRST on
 * actor_type === 'AI' and in that branch renders ONLY "AI ({model_id})",
 * NEVER a person's name (FR-14.4, T-06-13) — it does not read entry.actor at
 * all. SPECIALIST events render "{display name} (specialist)"; SYSTEM events
 * (the validation/exception-opened rows written during submission) render
 * "System, during {display name}'s submission".
 */
function whoText(entry: AuditEntryDto): string {
  if (entry.actor_type === 'AI') {
    return `AI (${entry.model_id ?? 'not reached'})`;
  }
  const name = entry.actor?.display_name ?? 'Unknown';
  if (entry.actor_type === 'SYSTEM') {
    return `System, during ${name}'s submission`;
  }
  // SPECIALIST.
  return `${name} (specialist)`;
}

/** Turn a stored state token into plain title-case text. null → "—". */
function humanState(state: string | null): string {
  if (state === null) return '—';
  const lower = state.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// ─── per-value field labels ──────────────────────────────────────────────────

// A small, DELIBERATE duplication of CaseDetail.tsx's FIELD_LABELS. The two
// files do not currently share a labels module; rather than introduce one for a
// single reuse, the fourteen entry-field labels are duplicated here verbatim so
// this region reads the same plain-language field names the case screen does. A
// value row whose field_name is not in this map falls back to the raw name
// (defensive: an audit value could in principle carry a non-entry field).
const FIELD_LABELS: Record<string, string> = {
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

function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

/** The after-value origin stated IN WORDS for the table's fourth column — plain
 *  text, not another badge instance (the FRD's Origin column is textual). */
function originInWords(origin: Origin): string {
  return origin === 'AI' ? 'AI-suggested' : 'Specialist-entered';
}

// ─── region state ────────────────────────────────────────────────────────────

type RegionState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'loaded'; readonly data: AuditTrailResponse };

export function AuditTrailRegion(props: AuditTrailRegionProps): JSX.Element {
  const { exceptionId, refreshToken, focusOnMount } = props;
  const [state, setState] = useState<RegionState>({ status: 'loading' });
  const { announceStatus } = useAnnounce();

  const headingRef = useRef<HTMLHeadingElement>(null);
  // Whether the FIRST successful load has happened yet — chooses the
  // announcement text ("Audit trail." vs "Audit trail updated.") and gates the
  // one-time deep-link focus move.
  const hadFirstLoadRef = useRef(false);
  // Whether the one-time deep-link focus has been spent. Guarding with a ref
  // means a later refreshToken bump (a post-decision refresh) does NOT re-steal
  // focus — matching the project's "focus moves at exactly four moments"
  // discipline: this is moment (1), completed navigation to THIS anchor, not an
  // in-place refresh.
  const focusSpentRef = useRef(false);

  // Fetch on mount and whenever exceptionId/refreshToken changes — NEVER on an
  // interval (FR-14.12 forbids polling). announceStatus is intentionally NOT a
  // dependency: it is a stable useCallback, and re-running the fetch on an
  // announce identity change would be a spurious refetch.
  useEffect(() => {
    let cancelled = false;
    // A refresh keeps the previous content until the new load resolves would be
    // nicer, but the spec's announcement contract keys off first-vs-subsequent
    // load, not on flicker; a brief Loading on refresh is acceptable and honest.
    setState({ status: 'loading' });
    void (async () => {
      try {
        const data = await api.getAuditTrail(exceptionId);
        if (cancelled) return;
        // FR-14.17: a trail can never legitimately be empty (receipt always
        // writes ENTRY_RECEIVED). An empty result is an ERROR, never an
        // empty-state message.
        if (data.entries.length === 0) {
          setState({ status: 'error' });
          return;
        }
        setState({ status: 'loaded', data });
        // Announcement: first load vs a post-decision refresh (both polite).
        if (hadFirstLoadRef.current) {
          announceStatus(`Audit trail updated. ${data.entry_count} events.`);
        } else {
          announceStatus(`Audit trail. ${data.entry_count} events.`);
          hadFirstLoadRef.current = true;
        }
      } catch {
        if (cancelled) return;
        setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exceptionId, refreshToken]);

  // Deep-link focus (FR-14.11): on the FIRST successful load reached via the
  // deep link, scroll the heading into view and focus it. One-time — guarded so
  // a later refreshToken bump does not re-steal focus.
  useEffect(() => {
    if (focusOnMount !== true) return;
    if (focusSpentRef.current) return;
    if (state.status !== 'loaded') return;
    focusSpentRef.current = true;
    headingRef.current?.scrollIntoView();
    headingRef.current?.focus();
  }, [focusOnMount, state.status]);

  return (
    <>
      <h2 id="audit-trail" tabIndex={-1} ref={headingRef}>
        Audit trail
      </h2>
      {/* FR-14.7's required introductory statement. */}
      <p>
        Every state change on this case, oldest first. This record cannot be
        edited or deleted.
      </p>

      {state.status === 'loading' && (
        <div aria-busy="true">
          <Loading region="Audit trail" label="Loading the audit trail…" />
        </div>
      )}

      {state.status === 'error' && (
        <ErrorState cause="The audit trail could not be loaded for this case." />
      )}

      {state.status === 'loaded' && <LoadedTrail data={state.data} />}
    </>
  );
}

// ─── the loaded trail ────────────────────────────────────────────────────────

function LoadedTrail(props: { readonly data: AuditTrailResponse }): JSX.Element {
  const { data } = props;
  return (
    <>
      <IntegrityStatement
        verified={data.chain_verified}
        entryCount={data.entry_count}
        firstDivergence={data.first_divergence_sequence}
      />
      {/* FR-14.1: one <li> per entry IN SERVER ORDER — never re-ordered,
          grouped, collapsed, or paginated. */}
      <ol>
        {data.entries.map((entry, i) => (
          <AuditEvent
            key={entry.id}
            entry={entry}
            position={i + 1}
            total={data.entries.length}
          />
        ))}
      </ol>
    </>
  );
}

// ─── integrity statement (FR-14.10) ──────────────────────────────────────────

function IntegrityStatement(props: {
  readonly verified: boolean;
  readonly entryCount: number;
  readonly firstDivergence: number | null;
}): JSX.Element {
  if (props.verified) {
    return (
      <p>
        Record integrity verified — {props.entryCount} event
        {props.entryCount === 1 ? '' : 's'} in sequence.
      </p>
    );
  }
  // Failure: a prominent, assertive USWDS error alert naming the divergent
  // sequence. NO repair action anywhere, ever (FR-14.10). role="alert" is
  // announced assertively by assistive technology.
  return (
    <div className="usa-alert usa-alert--error" role="alert">
      <div className="usa-alert__body">
        <p className="usa-alert__text">
          Record integrity check failed at event {props.firstDivergence}. Report
          this immediately.
        </p>
      </div>
    </div>
  );
}

// ─── one event ───────────────────────────────────────────────────────────────

function AuditEvent(props: {
  readonly entry: AuditEntryDto;
  readonly position: number;
  readonly total: number;
}): JSX.Element {
  const { entry, position, total } = props;

  // Split the reason on newlines into separate <p>s, preserving line breaks,
  // NEVER truncated (FR-14.5) — the same pattern CaseDetail.tsx uses for the
  // rationale. Rendered as plain text-node children (T-06-12).
  const reasonLines =
    entry.reason !== null
      ? entry.reason.split('\n').map((l) => l)
      : [];

  return (
    <li>
      {/* DOM order (FR-14.14): heading → who → when → state change → reason →
          values. */}
      <h3>{actionLabel(entry)}</h3>
      <dl>
        <dt>Who</dt>
        <dd>{whoText(entry)}</dd>
        <dt>When</dt>
        <dd>
          {/* Absolute only, never relative (FR-14.15). */}
          <time dateTime={entry.occurred_at}>
            {formatDateTime(entry.occurred_at)}
          </time>
        </dd>
        <dt>What changed</dt>
        <dd>
          {humanState(entry.before_state)} → {humanState(entry.after_state)}
        </dd>
      </dl>

      {entry.reason !== null && (
        <div>
          <p>
            <strong>Reason given</strong>
          </p>
          {reasonLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {entry.values.length > 0 && <ValueChangeTable entry={entry} />}

      <p>
        <small>
          Event {position} of {total}
        </small>
      </p>
    </li>
  );
}

// ─── the per-event value change table (FRD "Value change table") ─────────────

function ValueChangeTable(props: { readonly entry: AuditEntryDto }): JSX.Element {
  const { entry } = props;
  return (
    <table className="usa-table usa-table--borderless">
      <caption>Values recorded — {actionLabel(entry)}</caption>
      <thead>
        <tr>
          <th scope="col">Field</th>
          <th scope="col">Before</th>
          <th scope="col">After</th>
          <th scope="col">Origin</th>
        </tr>
      </thead>
      <tbody>
        {entry.values.map((v) => {
          // After (FR-14.6): a rejection's null after_value renders the explicit
          // "Not recorded (rejected)" phrasing; any other null renders "Not
          // provided". A present after value carries its own provenance badge.
          const afterIsRejection =
            v.after_value === null &&
            entry.action_type === 'RECOMMENDATION_REJECTED';
          return (
            <tr key={v.field_name}>
              <th scope="row">{fieldLabel(v.field_name)}</th>
              <td>
                {v.before_value ?? 'Not provided'}{' '}
                {v.before_origin !== null && (
                  <ProvenanceBadge origin={v.before_origin} />
                )}
              </td>
              <td>
                {afterIsRejection
                  ? 'Not recorded (rejected)'
                  : (v.after_value ?? 'Not provided')}{' '}
                {v.after_value !== null && v.after_origin !== null && (
                  <ProvenanceBadge origin={v.after_origin} />
                )}
              </td>
              <td>
                {/* The after-value origin IN WORDS — plain text, not a badge. */}
                {v.after_origin !== null ? originInWords(v.after_origin) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
