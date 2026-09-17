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
// The F10 read-only sections mutate nothing (FR-10.12): no <select>, no
// <textarea>, and no onClick calling any API method other than api.getCase /
// api.getRecommendation. As of Phase 6 the last two <h2> sections are REAL, not
// stubs: "Your decision" is the F11/F12 DecisionPanel (or the read-only decided
// record) and "Audit trail" is the F14 AuditTrailRegion. The DecisionPanel does
// introduce controls, and a recorded decision refetches the whole case — which
// bumps `caseVersion` and so refreshes the audit trail in place (FR-14.12).
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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Link as CarbonLink,
  ListItem,
  OrderedList,
  Stack,
} from '@carbon/react';
import type {
  CaseDetailResponse,
  DecisionDetailDto,
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
import { DecisionPanel, DecisionSummaryTable } from '../components/DecisionPanel.js';
import { AuditTrailRegion } from '../components/AuditTrailRegion.js';

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

/**
 * Props for the case-detail screen. `focusAuditTrail` is true ONLY for the
 * /cases/:caseReference/audit deep-link route (F14 FR-14.11): it is threaded
 * down to the AuditTrailRegion (as its `focusOnMount` prop) so the region
 * scrolls to and focuses the "Audit trail" heading on load. The default
 * /cases/:caseReference route passes nothing, so ordinary navigation lands on
 * the screen h1 as usual.
 */
export interface CaseDetailProps {
  readonly focusAuditTrail?: boolean;
}

export function CaseDetail(props: CaseDetailProps = {}): JSX.Element {
  const { focusAuditTrail } = props;
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useScreenFocus({ title: 'Case', h1Ref });
  const { caseReference } = useParams<{ caseReference: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // The SINGLE refresh signal both the read-only decided record and the audit
  // trail key off. `caseVersion` increments on every SUCCESSFUL case fetch —
  // the mount load, the error-state retry, and (the load-bearing one for F14)
  // the post-decision refetch DecisionPanel triggers via onDecided. Passing it
  // to AuditTrailRegion as `refreshToken` is exactly FR-14.12: the trail
  // refreshes after a decision on the same screen, and never polls otherwise.
  const [caseVersion, setCaseVersion] = useState(0);

  // A refetch triggered by recording a decision must NOT snap focus back to the
  // screen h1: FR-12.10 requires focus on the "Decision recorded" heading, which
  // the read-only DecidedRecord (rendered from the refetched case) grabs itself.
  // This ref suppresses the h1 re-focus for exactly the loading→loaded edge that
  // a decision refetch produces; every ordinary navigation/retry still lands on
  // the h1.
  const skipH1FocusRef = useRef(false);

  // FR-2.24 focus contract: useScreenFocus moves focus to the h1 present at
  // mount — but that is the LOADING-state h1, which React unmounts when the
  // screen transitions to its terminal (loaded / not-found / error)
  // presentation, dropping focus to <body>. So re-assert focus on the h1 once
  // the terminal presentation has rendered. This is moment (1) of the focus
  // discipline (a completed navigation lands on the screen h1), not a poll- or
  // announcement-driven move — every terminal branch renders its own <h1
  // tabIndex={-1} ref={h1Ref}>, so this lands on the heading the specialist
  // should read first. It runs only on the loading→terminal edge (keyed on the
  // status), never on the in-place recommendation transitions below.
  const status = state.status;
  useEffect(() => {
    if (status === 'loading') return;
    if (skipH1FocusRef.current) {
      // A post-decision refetch: let DecidedRecord own the focus move.
      skipH1FocusRef.current = false;
      return;
    }
    // After paint, the terminal-state h1 is mounted and focusable.
    h1Ref.current?.focus();
  }, [status]);

  // The ONE fetch path, shared by the mount effect, the error-state retry, and
  // the post-decision refetch (F12: onDecided/onConflict). Extracting the fetch
  // into a useCallback means a decision recorded in the DecisionPanel refreshes
  // the whole case — the read-only decided record and, in plan 06-04, the audit
  // trail — from the same authoritative read the mount used.
  const fetchCase = useCallback(async (): Promise<void> => {
    const identifier = caseReference ?? '';
    setState({ status: 'loading' });
    try {
      const data = await api.getCase(identifier);
      setState({ status: 'loaded', data });
      // A successful load bumps the version — this is the token AuditTrailRegion
      // watches, so a post-decision refetch re-reads the trail (FR-14.12).
      setCaseVersion((v) => v + 1);
    } catch (err) {
      // A not-found is a DEDICATED presentation (FR-10.15), not a generic
      // error: the server's message already distinguishes "passed validation"
      // from a plain not-found. A mid-session 401 is handled globally by the
      // client's redirect-to-sign-in — nothing to do here.
      if (err instanceof ApiClientError && err.code === 'EXCEPTION_NOT_FOUND') {
        setState({ status: 'not-found', message: err.message });
      } else {
        setState({ status: 'error' });
      }
    }
  }, [caseReference]);

  // Fetch the case on mount (and whenever the identifier in the URL changes).
  // The route param may itself be a uuid (FR-10.13): api.getCase accepts either.
  useEffect(() => {
    void fetchCase();
  }, [fetchCase]);

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
    <div className="cargoexec-prose">
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
            <CarbonLink as={RouterLink} to="/queue">
              Back to review queue
            </CarbonLink>
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
              void fetchCase();
            }}
          />
        </>
      )}

      {state.status === 'loaded' && (
        <CaseLoaded
          data={state.data}
          h1Ref={h1Ref}
          caseVersion={caseVersion}
          focusAuditTrail={focusAuditTrail === true}
          refetch={() => {
            // A decision was recorded (or a conflict refetch): the resulting
            // read-only record owns the focus move, so suppress the h1 re-focus.
            skipH1FocusRef.current = true;
            void fetchCase();
          }}
        />
      )}
    </div>
  );
}

// ─── the loaded case ─────────────────────────────────────────────────────────

function CaseLoaded(props: {
  readonly data: CaseDetailResponse;
  readonly h1Ref: React.RefObject<HTMLHeadingElement>;
  readonly caseVersion: number;
  readonly focusAuditTrail: boolean;
  readonly refetch: () => void;
}): JSX.Element {
  const { data, h1Ref, caseVersion, focusAuditTrail, refetch } = props;
  const { exception, entry, validation, recommendation } = data;

  return (
    <>
      {/* 1. Header ------------------------------------------------------- */}
      {/* Carbon typography: the <h1> inherits Carbon's productive heading
          scale from the global @carbon/styles reset (07-04); the focus-
          management contract (tabIndex={-1} + h1Ref) is UNCHANGED — the same
          heading FR-2.24 lands focus on and FR-10.13 canonicalisation never
          moves. */}
      <h1 tabIndex={-1} ref={h1Ref}>
        Case {exception.case_reference}
      </h1>
      {/* Status / received / submitted-by as a definition list styled with
          Carbon tokens (a plain, standards-based <dl> is not a bespoke
          interactive control — it is structural markup Carbon has no dedicated
          component for; registered as a composition). */}
      <dl className="cargoexec-detail-list">
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
        <CarbonLink as={RouterLink} to="/queue">
          Back to review queue
        </CarbonLink>
      </p>

      {/* 1a. "On this page" in-page navigation (FR-10.10, UNCONDITIONAL) --
          one link per <h2> below, in the same order. Carbon has no dedicated
          in-page-navigation primitive (USWDS's usa-in-page-navigation has no
          Carbon equivalent), so this is a documented composition: a plain,
          unconditional list of native #fragment anchors rendered with Carbon
          `Link` and laid out with Carbon `Stack`/tokens. Native `<a href="#…">`
          in-page navigation is standard HTML, NOT a "bespoke interactive
          control" (FR-2.1). Pure fragment navigation: no onClick/preventDefault
          — the browser's native scroll-and-focus-to-target is exactly the
          wanted behaviour (the e2e "On this page" test clicks each link and
          asserts toBeInViewport()), and is NOT a useScreenFocus moment. The
          fixed reading order (entry → findings → recommendation → decision →
          audit) is preserved verbatim. */}
      <nav aria-label="On this page" className="cargoexec-in-page-nav">
        <Stack as="ul" gap={2}>
          <ListItem>
            <CarbonLink href="#why-open">Why this case is open</CarbonLink>
          </ListItem>
          <ListItem>
            <CarbonLink href="#submitted-entry">Submitted entry</CarbonLink>
          </ListItem>
          <ListItem>
            <CarbonLink href="#ai-recommendation">AI recommendation</CarbonLink>
          </ListItem>
          <ListItem>
            <CarbonLink href="#your-decision">Your decision</CarbonLink>
          </ListItem>
          <ListItem>
            <CarbonLink href="#audit-trail">Audit trail</CarbonLink>
          </ListItem>
        </Stack>
      </nav>

      {/* 2. Why this case is open --------------------------------------- */}
      <h2 id="why-open">Why this case is open</h2>
      <p>
        This entry did not satisfy {validation.findings.length} required-information
        rule{validation.findings.length === 1 ? '' : 's'} when it was received.
      </p>
      {/* FR-10.6: server order verbatim — no re-wording, reordering, filtering,
          or severity language. Rendered on Carbon's `OrderedList`/`ListItem`
          (still a native <ol>/<li>), preserving verbatim, server-order rendering
          with NO severity language added. */}
      <OrderedList>
        {validation.findings.map((finding) => (
          <ListItem key={finding.rule_id}>
            {finding.message}{' '}
            <small>
              {humanLabel(finding.field_name)} · {finding.rule_id}
            </small>
          </ListItem>
        ))}
      </OrderedList>

      {/* 3. Submitted entry --------------------------------------------- */}
      {/* The 14-field display as a definition list styled with Carbon tokens.
          Each present value renders its HUMAN `ProvenanceBadge` via the UNCHANGED
          07-06 import (only the surrounding layout markup is Carbon here — the
          badge component and its usage are untouched). */}
      <h2 id="submitted-entry">Submitted entry</h2>
      <dl className="cargoexec-detail-list">
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

      {/* 5. Your decision — the real F11/F12 decision region ------------ */}
      <h2 id="your-decision">Your decision</h2>
      {/* When a decision exists (or the case is otherwise closed), the region is
          the read-only recorded record — no controls in the DOM (FR-12.11 /
          FR-10.11). Otherwise it is the live DecisionPanel: the specialist takes
          the one decision the product exists to require, and a recorded decision
          refetches the whole case so this branch flips to the read-only record. */}
      {data.decision !== null || data.is_closed ? (
        <>
          <ReadOnlyNotice
            message={
              exception.state === 'REJECTED'
                ? 'This case is rejected. The decision below is final and cannot be changed.'
                : 'This case is resolved. The decision below is final and cannot be changed.'
            }
          />
          {data.decision !== null && (
            <DecidedRecord decision={data.decision} state={exception.state} />
          )}
        </>
      ) : (
        <DecisionPanel
          exceptionId={exception.id}
          permittedDecisions={data.permitted_decisions}
          recommendation={recommendation}
          entryValues={entry.values}
          findings={validation.findings}
          onDecided={() => {
            // A recorded decision refreshes the whole case: the region flips to
            // the read-only DecidedRecord (the server-driven confirmation) and,
            // in plan 06-04, the audit trail re-reads too.
            refetch();
          }}
          onConflict={() => {
            // A 409 (already decided / stale recommendation / not-approvable) is
            // NOT refetched here on purpose: the DecisionPanel already renders
            // the informational alert with the server's message and has removed
            // its own controls (FR-12.12/FR-12.13). Tearing that alert down with
            // an immediate full-case refetch would replace the "this was already
            // decided" explanation before the specialist reads it. The audit
            // trail's own refresh on conflict is plan 06-04's concern; for this
            // region the informational alert is the correct terminal state.
          }}
        />
      )}

      {/* 6. Audit trail — the real F14 region (renders its own <h2
          id="audit-trail">) ---------------------------------------------- */}
      {/* refreshToken={caseVersion} makes the trail re-read after any successful
          case fetch — crucially the post-decision refetch above (FR-14.12);
          focusOnMount is set only on the /cases/:caseReference/audit deep link
          (FR-14.11). */}
      <AuditTrailRegion
        exceptionId={exception.id}
        refreshToken={caseVersion}
        focusOnMount={focusAuditTrail}
      />
    </>
  );
}

// ─── the read-only decided record ────────────────────────────────────────────

/**
 * The read-only rendering of a recorded decision — and, because a decision made
 * in the DecisionPanel refetches the whole case, THE post-decision confirmation
 * itself. It renders the SAME "Decision recorded" heading, the SAME
 * server-driven values (via DecisionSummaryTable), and the SAME navigation links
 * the DecisionPanel's in-place confirmation would, so a just-recorded decision
 * and a reloaded one are indistinguishable (FR-12.10/FR-12.11). It moves focus
 * to its own heading on mount so the confirmation-after-refetch still lands
 * focus where FR-12.10 requires; it holds NO mutation control.
 */
const DECIDED_WORDS: Record<DecisionDetailDto['decision_type'], string> = {
  APPROVE: 'Approve the AI-recommended resolution',
  EDIT_APPROVE: 'Edit and approve',
  REJECT: 'Reject the recommendation',
};

function DecidedRecord(props: {
  readonly decision: DecisionDetailDto;
  readonly state: ExceptionState;
}): JSX.Element {
  const { decision, state } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { announceStatus } = useAnnounce();
  useEffect(() => {
    headingRef.current?.focus();
    announceStatus('Your decision has been recorded.');
  }, [announceStatus]);
  return (
    <div>
      <h3 tabIndex={-1} ref={headingRef}>
        Decision recorded
      </h3>
      <p>{DECIDED_WORDS[decision.decision_type]}</p>
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
        <dd>{STATE_LABELS[state]}</dd>
      </dl>
      <DecisionSummaryTable values={decision.resolution_values} />
      <p>
        <CarbonLink href="#audit-trail">
          View the audit trail for this case
        </CarbonLink>
      </p>
      <p>
        <CarbonLink as={RouterLink} to="/queue">
          Back to review queue
        </CarbonLink>
      </p>
    </div>
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
