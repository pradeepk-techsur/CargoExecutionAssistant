// The F10 exception case-detail & recommendation-presentation screen
// (UX Screen; F10 FR-10.1 … FR-10.16; Phase 5 goal).
//
// This is the screen the phase goal is written around: the specialist "reads why
// the case is open, what the AI recommends and why, with every machine-proposed
// value marked as the machine's." The section order is normative (FR-10.10): one
// <h1>, then <h2>s in EXACTLY this order — "On this page", "Why this case is
// open", "Submitted entry", "AI recommendation", "Your decision", "Audit trail"
// — each <h2> carrying the id its "On this page" link targets, so the whole
// screen is traversable heading-by-heading and by in-page fragment navigation.
//
// DELIBERATELY READ-ONLY (FR-10.12): this screen mutates nothing. The only
// <button> anywhere is the "Try again" inside the reused ErrorState; there is no
// <select>, no <textarea>, and no onClick that calls any API method other than
// api.getCase / api.getRecommendation. "Your decision" (F11/F12) and "Audit
// trail" (F14) are Phase 6 — rendered here as heading-only stubs so the
// normative order and the FR-10.10 in-page-nav requirement are already correct
// and Phase 6 has somewhere to attach its controls.
//
// The uuid→case-reference canonicalisation (FR-10.13) is a client-side
// react-router replace (never window.location, which would reload); it changes
// the address bar without a full reload and without moving focus.
//
// T-05-13 (stored XSS): every server-supplied string — finding messages, entry
// values, the AI rationale and recommended_action — is rendered as a plain JSX
// text-node child, relying on React's default escaping. No raw-HTML injection
// prop is used anywhere (the global headers.spec.ts source scan forbids the only
// such React prop under web/src, and that scan reads raw source — so the prop's
// name must not appear even in a comment). The rationale's paragraph split still
// emits plain <p>{text}</p> per paragraph.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  CaseDetailResponse,
  EntryFieldName,
  EntryValues,
  ExceptionState,
  FindingDto,
  RecommendationDetailDto,
  RecommendationFailureReason,
} from '@cargoexec/contract';
import { ENTRY_FIELDS } from '@cargoexec/contract';
import { useScreenFocus } from '../shell/useScreenFocus.js';
import { useAnnounce } from '../shell/LiveRegions.js';
import { api, ApiClientError } from '../api/client.js';
import { formatDateTime } from '../lib/formatDateTime.js';
import {
  Degraded,
  ErrorState,
  Loading,
  ReadOnlyNotice,
} from '../components/states.js';
import { ProvenanceBadge } from '../components/ProvenanceBadge.js';

// ─── plain-language labels ───────────────────────────────────────────────────

/** Plain-language label for each of the 14 entry fields — never the raw
 *  snake_case name (FR-10.3, the "field label" the comparison rows render). */
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

/** The lifecycle state as plain title-case text — no receipt-position or
 *  queue-place language anywhere (FR-10.14). */
const STATE_LABELS: Record<ExceptionState, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

/** The FRD's seven-row failure-reason → plain-language mapping (FR-10.8). */
const FAILURE_CONDITIONS: Record<RecommendationFailureReason, string> = {
  PROVIDER_TIMEOUT: 'The AI service did not respond in time.',
  PROVIDER_UNAVAILABLE: 'The AI service could not be reached.',
  PROVIDER_RATE_LIMITED: 'The AI service was busy.',
  PROVIDER_AUTH_FAILED: "The AI service rejected this deployment's credentials.",
  SCHEMA_INVALID: 'The AI response could not be used.',
  CONTENT_FILTERED: 'The AI service declined to answer for this case.',
  INTERNAL_ERROR: 'A recommendation could not be produced.',
};

/** The single "what you can still do" sentence used by both degraded branches. */
const STILL_DO =
  'You can still resolve or reject this case. Your decision and reason will be recorded as usual.';

// ─── screen state ────────────────────────────────────────────────────────────

type ScreenState =
  | { readonly status: 'loading' }
  | { readonly status: 'not-found'; readonly message: string }
  | { readonly status: 'error' }
  | { readonly status: 'loaded'; readonly data: CaseDetailResponse };

export function CaseDetail(): JSX.Element {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useScreenFocus({ title: 'Case', h1Ref });
  const { caseReference } = useParams<{ caseReference: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // Fetch the case on mount (and whenever the identifier in the URL changes).
  // The route param may itself be a uuid (FR-10.13): api.getCase accepts either.
  useEffect(() => {
    let cancelled = false;
    const identifier = caseReference ?? '';
    setState({ status: 'loading' });
    void (async (): Promise<void> => {
      try {
        const data = await api.getCase(identifier);
        if (!cancelled) setState({ status: 'loaded', data });
      } catch (err) {
        if (cancelled) return;
        // A not-found is a DEDICATED presentation (FR-10.15), not a generic
        // error: the server's message already distinguishes "passed validation"
        // from a plain not-found. A mid-session 401 is handled globally by the
        // client's redirect-to-sign-in — nothing to do here.
        if (
          err instanceof ApiClientError &&
          err.code === 'EXCEPTION_NOT_FOUND'
        ) {
          setState({ status: 'not-found', message: err.message });
        } else {
          setState({ status: 'error' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseReference]);

  // uuid→case-reference canonicalisation (FR-10.13): once the case is loaded, if
  // the URL param is not already the case reference (i.e. a uuid or any other
  // string reached this screen), replace the URL with the canonical
  // /cases/{case_reference}. `replace` adds no history entry; react-router's
  // client-side navigate changes the address bar with NO full reload and NO
  // focus move (window.location.replace WOULD reload — never use it here).
  useEffect(() => {
    if (state.status !== 'loaded') return;
    const canonical = state.data.exception.case_reference;
    if (caseReference !== canonical) {
      navigate(`/cases/${canonical}`, { replace: true });
    }
  }, [state, caseReference, navigate]);

  return (
    <div className="usa-prose">
      {state.status === 'loading' && (
        <>
          <h1 tabIndex={-1} ref={h1Ref}>
            Case
          </h1>
          <div aria-busy="true">
            <Loading region="Case" />
          </div>
        </>
      )}

      {state.status === 'not-found' && (
        <>
          <h1 tabIndex={-1} ref={h1Ref}>
            Case not found
          </h1>
          <p>{state.message}</p>
          <p>
            <Link to="/queue">Back to review queue</Link>
          </p>
        </>
      )}

      {state.status === 'error' && (
        <>
          <h1 tabIndex={-1} ref={h1Ref}>
            Case
          </h1>
          <ErrorState
            cause="We could not load this case."
            onRetry={() => {
              // Re-run the mount fetch by resetting to loading; the effect keyed
              // on caseReference will not re-fire (the param is unchanged), so
              // re-fetch explicitly here.
              const identifier = caseReference ?? '';
              setState({ status: 'loading' });
              void api
                .getCase(identifier)
                .then((data) => setState({ status: 'loaded', data }))
                .catch((err: unknown) => {
                  if (
                    err instanceof ApiClientError &&
                    err.code === 'EXCEPTION_NOT_FOUND'
                  ) {
                    setState({ status: 'not-found', message: err.message });
                  } else {
                    setState({ status: 'error' });
                  }
                });
            }}
          />
        </>
      )}

      {state.status === 'loaded' && (
        <CaseLoaded data={state.data} h1Ref={h1Ref} />
      )}
    </div>
  );
}

// ─── the loaded case ─────────────────────────────────────────────────────────

function CaseLoaded(props: {
  readonly data: CaseDetailResponse;
  readonly h1Ref: React.RefObject<HTMLHeadingElement>;
}): JSX.Element {
  const { data, h1Ref } = props;
  const { exception, entry, validation, recommendation } = data;

  return (
    <>
      {/* 1. Header ------------------------------------------------------- */}
      <h1 tabIndex={-1} ref={h1Ref}>
        Case {exception.case_reference}
      </h1>
      <dl>
        <dt>Status</dt>
        <dd>{STATE_LABELS[exception.state]}</dd>
        <dt>Received</dt>
        <dd>
          <time dateTime={entry.received_at}>
            {formatDateTime(entry.received_at)}
          </time>
        </dd>
        <dt>Submitted by</dt>
        <dd>{entry.created_by.display_name}</dd>
      </dl>
      <p>
        <Link to="/queue">Back to review queue</Link>
      </p>

      {/* 1a. "On this page" in-page navigation (FR-10.10, UNCONDITIONAL) --
          one link per <h2> below, in the same order. Pure fragment navigation:
          no onClick/preventDefault — the browser's native scroll-and-focus-to-
          target is exactly the wanted behaviour, and is NOT a useScreenFocus
          moment. */}
      <nav aria-label="On this page">
        <ul className="usa-list usa-list--unstyled">
          <li>
            <a href="#why-open">Why this case is open</a>
          </li>
          <li>
            <a href="#submitted-entry">Submitted entry</a>
          </li>
          <li>
            <a href="#ai-recommendation">AI recommendation</a>
          </li>
          <li>
            <a href="#your-decision">Your decision</a>
          </li>
          <li>
            <a href="#audit-trail">Audit trail</a>
          </li>
        </ul>
      </nav>

      {/* 2. Why this case is open --------------------------------------- */}
      <h2 id="why-open">Why this case is open</h2>
      <p>
        This entry did not satisfy {validation.findings.length} required-information
        rule{validation.findings.length === 1 ? '' : 's'} when it was received.
      </p>
      {/* FR-10.6: server order verbatim — no re-wording, reordering, filtering,
          or severity language. */}
      <ol>
        {validation.findings.map((finding) => (
          <li key={finding.rule_id}>
            {finding.message}{' '}
            <small>
              {humanLabel(finding.field_name)} · {finding.rule_id}
            </small>
          </li>
        ))}
      </ol>

      {/* 3. Submitted entry --------------------------------------------- */}
      <h2 id="submitted-entry">Submitted entry</h2>
      <dl>
        {ENTRY_FIELDS.map((field) => {
          const value = entry.values[field];
          return (
            <div key={field}>
              <dt>{humanLabel(field)}</dt>
              <dd>
                {value ?? 'Not provided'}{' '}
                {/* The badge appears ONLY when a value is present: "Not
                    provided" carries no badge (FR-10.3). */}
                {value !== null && <ProvenanceBadge origin="HUMAN" />}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* 4. AI recommendation ------------------------------------------- */}
      <h2 id="ai-recommendation">AI recommendation</h2>
      <RecommendationSection
        exceptionId={exception.id}
        initial={recommendation}
        findings={validation.findings}
        submittedValues={entry.values}
      />

      {/* 5. Your decision — Phase 6 stub (F11/F12) ---------------------- */}
      <h2 id="your-decision">Your decision</h2>
      {/* Closed-case defensive minimum (FR-10.11): UNREACHABLE in Phase 5 (no
          case can close before Phase 6 exists). The full resolution-values
          presentation is deliberately deferred to Phase 6, which owns decision
          rendering; here we only state the case is final. */}
      {data.is_closed && (
        <ReadOnlyNotice
          message={
            exception.state === 'RESOLVED'
              ? 'This case is resolved.'
              : 'This case is rejected.'
          }
        />
      )}
      <div className="usa-alert usa-alert--info usa-alert--slim" role="status">
        <div className="usa-alert__body">
          <p className="usa-alert__text">
            Decision controls are not yet available in this build.
          </p>
        </div>
      </div>

      {/* 6. Audit trail — Phase 6 stub (F14) ---------------------------- */}
      <h2 id="audit-trail">Audit trail</h2>
      <div className="usa-alert usa-alert--info usa-alert--slim" role="status">
        <div className="usa-alert__body">
          <p className="usa-alert__text">
            The audit trail is not yet available in this build.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── the AI-recommendation section (its own polling lifecycle) ───────────────

const POLL_INTERVAL_MS = 3_000;
const STALE_AFTER_MS = 60_000;

function RecommendationSection(props: {
  readonly exceptionId: string;
  readonly initial: RecommendationDetailDto;
  readonly findings: readonly FindingDto[];
  readonly submittedValues: EntryValues;
}): JSX.Element {
  const { exceptionId, initial, findings, submittedValues } = props;
  const { announceStatus } = useAnnounce();
  const [current, setCurrent] = useState<RecommendationDetailDto>(initial);
  // Whether the PENDING window has elapsed (>= 60s) without a terminal status.
  const [stale, setStale] = useState(false);

  // The clock the elapsed-time budget is measured from: the server's
  // requested_at when available, else this component's first mount.
  const startRef = useRef<number>(
    initial.requested_at !== undefined
      ? new Date(initial.requested_at).getTime()
      : Date.now(),
  );

  useEffect(() => {
    // Only PENDING drives a poll. A recommendation that arrived already terminal
    // (AVAILABLE/UNAVAILABLE) needs no polling and no timers.
    if (current.status !== 'PENDING') return;
    if (stale) return;

    let timer: number | undefined;
    let cancelled = false;

    const tick = async (): Promise<void> => {
      // Stop once the 60s budget is spent — no further requests once stale.
      if (Date.now() - startRef.current >= STALE_AFTER_MS) {
        if (!cancelled) setStale(true);
        return;
      }
      try {
        const next = await api.getRecommendation(exceptionId);
        if (cancelled) return;
        if (next.status !== 'PENDING') {
          // Terminal: update IN PLACE, announce the FR-10.7 sentence, and do NOT
          // move focus (FR-10.7: focus must not be stolen by a poll).
          setCurrent(next);
          announceStatus(
            next.status === 'AVAILABLE'
              ? 'An AI recommendation is now available.'
              : 'No AI recommendation is available.',
          );
          return; // stop scheduling
        }
        // Still pending: schedule the next poll (setTimeout chaining, so a slow
        // response cannot overlap the next request).
        timer = window.setTimeout(() => {
          void tick();
        }, POLL_INTERVAL_MS);
      } catch {
        // A transient poll failure is not a terminal state: try again on the
        // next tick until the case either resolves or goes stale.
        if (cancelled) return;
        timer = window.setTimeout(() => {
          void tick();
        }, POLL_INTERVAL_MS);
      }
    };

    // First poll after one interval (the initial render already shows PENDING).
    timer = window.setTimeout(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    // Stop on unmount — "stops on … leaving the screen".
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [current.status, stale, exceptionId, announceStatus]);

  // PENDING, still within budget → a busy region announcing generation.
  if (current.status === 'PENDING' && !stale) {
    return (
      <div aria-busy="true">
        <Loading
          region="AI recommendation"
          label="Generating an AI recommendation…"
        />
      </div>
    );
  }

  // PENDING, budget spent (stale) → a stated condition, never an error.
  if (current.status === 'PENDING' && stale) {
    return (
      <Degraded
        condition="No AI recommendation is available yet."
        whatYouCanStillDo={STILL_DO}
      />
    );
  }

  if (current.status === 'UNAVAILABLE') {
    const reason = current.failure_reason;
    const condition =
      reason !== undefined
        ? FAILURE_CONDITIONS[reason]
        : 'A recommendation could not be produced.';
    return (
      <>
        {/* The FRD's literal required heading ABOVE the degraded block; no
            Retry/Regenerate control anywhere (FR-10.8). */}
        <h3>No AI recommendation available</h3>
        <Degraded condition={condition} whatYouCanStillDo={STILL_DO} />
      </>
    );
  }

  // AVAILABLE.
  return (
    <AvailableRecommendation
      recommendation={current}
      findings={findings}
      submittedValues={submittedValues}
    />
  );
}

/** The AVAILABLE presentation (FR-10.1, FR-10.3, FR-10.4, FR-10.5). */
function AvailableRecommendation(props: {
  readonly recommendation: RecommendationDetailDto;
  readonly findings: readonly FindingDto[];
  readonly submittedValues: EntryValues;
}): JSX.Element {
  const { recommendation: rec, findings, submittedValues } = props;

  // Look a rule id up against this exception's findings so the comparison rows
  // render the finding's plain-language message, not the bare rule id (FR-10.3).
  const messageForRule = (ruleId: string): string | undefined =>
    findings.find((f) => f.rule_id === ruleId)?.message;

  // Split the rationale into paragraphs on blank lines (or single newlines),
  // rendered as plain <p>{text}</p> — never truncated, summarised, collapsed, or
  // rendered as HTML (FR-10.4, T-05-13).
  const rationaleParagraphs = (rec.rationale ?? '')
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <>
      {/* Badges the recommendation as a WHOLE (not one value), so a plain tag
          rather than ProvenanceBadge, which is per-value. */}
      <p>
        <span className="usa-tag bg-primary-darker text-white">
          AI-suggested resolution
        </span>
      </p>
      <p>The AI suggests: {rec.recommended_action}</p>
      <p>
        Nothing here has been applied. It is recorded only if you decide to
        approve it.
      </p>

      <h3>Why the AI suggests this</h3>
      {rationaleParagraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}

      {/* Comparison rows (FR-10.3): for each proposed value, the field label, the
          submitted value (or "Not provided") badged HUMAN when present, the
          AI-suggested value badged AI, and the plain-language message(s) of the
          rule(s) it addresses. A proposal for a field whose submitted value is
          null is an ADDITION ("Adding:"), not a change ("Changing:"). */}
      {rec.proposed_values !== undefined && rec.proposed_values.length > 0 && (
        <dl>
          {rec.proposed_values.map((pv) => {
            const submitted = submittedValues[pv.field_name];
            const isAddition = submitted === null;
            return (
              <div key={pv.field_name}>
                <dt>{humanLabel(pv.field_name)}</dt>
                <dd>
                  <div>
                    Submitted: {submitted ?? 'Not provided'}{' '}
                    {submitted !== null && <ProvenanceBadge origin="HUMAN" />}
                  </div>
                  <div>
                    AI-suggested: {pv.proposed_value} <ProvenanceBadge origin="AI" />
                  </div>
                  <div>
                    {isAddition ? 'Adding: ' : 'Changing: '}
                    {pv.addresses_rule_ids
                      .map((rid) => messageForRule(rid) ?? rid)
                      .join(' ')}
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {/* FR-10.5 footnote: model, prompt version, generation time. */}
      <p>
        <small>
          Model: {rec.model_id} · Prompt: {rec.prompt_version} · Generated:{' '}
          {rec.generated_at !== undefined
            ? formatDateTime(rec.generated_at)
            : ''}
        </small>
      </p>
    </>
  );
}
