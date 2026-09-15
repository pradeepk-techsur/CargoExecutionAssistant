import type { Pool } from 'pg';
import type {
  CaseDetailResponse,
  DecisionType,
  DecisionDetailDto,
  ExceptionState,
  RecommendationStatus,
  RecommendationDetailDto,
  RecommendationFailureReason,
  RecommendationProposedValueDto,
} from '@cargoexec/contract';
import {
  resolveCaseIdentifier,
  loadExceptionDetail,
} from '../db/repositories/exceptions.js';
import { loadEntryDetail, loadFieldOrigins } from '../db/repositories/entries.js';
import { loadValidationByEntry } from '../db/repositories/validation.js';
import {
  loadRecommendationByException,
  loadRecommendationValues,
  type RecommendationRow,
} from '../db/repositories/recommendations.js';
import {
  loadDecisionByException,
  loadDecisionValues,
  type DecisionRow,
} from '../db/repositories/decisions.js';

/**
 * THE single-case read (F7 FR-7.7 / FR-7.8 / FR-7.14).
 *
 * READ-ONLY: composes the 04-01 read repositories into the `CaseDetailResponse`
 * the route (04-03) hands to the client. It writes NOTHING and calls no
 * `append()`. It reuses `loadEntryDetail`/`loadFieldOrigins`/`loadValidationByEntry`
 * exactly as `routes/entries.ts` does for `GET /api/entries/:entryId` — it does
 * NOT duplicate their SQL — and it keeps FR-7.8's `permitted_decisions` matrix
 * out of the route, mirroring the `receipt.service.ts` split.
 */

export type CaseIdentifierForm = 'UUID' | 'CASE_REF';

/**
 * Resolve a caller-supplied identifier to a full case detail (FR-7.14). The
 * three resolution outcomes are surfaced distinctly to the caller:
 *   - a `CaseDetailResponse` for a match (open OR closed — a closed case stays
 *     reachable by identifier, FR-7.4);
 *   - the string `'ENTRY_PASSED_VALIDATION'` for a well-formed case reference
 *     whose entry validated clean (no exception exists);
 *   - the string `'NOT_FOUND'` for an identifier that matches nothing.
 *
 * The route maps these to 200 / a distinct 200-or-404 / 404 respectively.
 */
export async function loadCase(
  pool: Pool,
  form: CaseIdentifierForm,
  value: string,
): Promise<CaseDetailResponse | 'ENTRY_PASSED_VALIDATION' | 'NOT_FOUND'> {
  const resolved = await resolveCaseIdentifier(pool, form, value);
  if (resolved.status === 'NOT_FOUND') return 'NOT_FOUND';
  if (resolved.status === 'ENTRY_PASSED_VALIDATION') return 'ENTRY_PASSED_VALIDATION';

  const exceptionRow = await loadExceptionDetail(pool, resolved.exceptionId);
  if (exceptionRow === null) {
    // Resolved a moment ago, gone now: an internal invariant breach (exceptions
    // are permanent, F5 FR-5.15), never a client-facing shape. Thrown as a plain
    // Error with an internal-only prefix so it propagates to errorMapper's
    // generic-500 fallback (RECEIPT_FAILED) with no internal detail leaked
    // (T-04-03).
    throw new Error(
      `CASE_READ_INVARIANT: exception ${resolved.exceptionId} vanished between resolve and load`,
    );
  }

  const [entryDetail, fieldOrigins, validation, recommendationRow, decisionRow] =
    await Promise.all([
      loadEntryDetail(pool, exceptionRow.entry_id),
      loadFieldOrigins(pool, exceptionRow.entry_id),
      loadValidationByEntry(pool, exceptionRow.entry_id),
      loadRecommendationByException(pool, resolved.exceptionId),
      loadDecisionByException(pool, resolved.exceptionId),
    ]);

  if (entryDetail === null || validation === null) {
    throw new Error(
      `CASE_READ_INVARIANT: exception ${resolved.exceptionId} has no entry or validation result`,
    );
  }

  const recommendation = await composeRecommendation(pool, recommendationRow);
  const decision = decisionRow === null ? null : await composeDecision(pool, decisionRow);

  return {
    exception: {
      id: exceptionRow.id,
      case_reference: exceptionRow.case_reference,
      state: exceptionRow.state,
      receipt_position: exceptionRow.receipt_position,
      opened_at: exceptionRow.opened_at,
      closed_at: exceptionRow.closed_at,
    },
    entry: {
      id: entryDetail.id,
      case_reference: entryDetail.case_reference,
      received_at: entryDetail.received_at.toISOString(),
      created_by: {
        id: entryDetail.created_by_id,
        display_name: entryDetail.created_by_display_name,
      },
      values: entryDetail.values,
      field_origins: fieldOrigins,
    },
    validation: {
      outcome: validation.outcome,
      rule_set_version: validation.rule_set_version,
      evaluated_at: validation.evaluated_at,
      findings: validation.findings,
    },
    recommendation,
    decision,
    is_closed: exceptionRow.state !== 'OPEN',
    permitted_decisions: permittedDecisions(
      exceptionRow.state,
      recommendationRow?.status ?? 'PENDING',
    ),
  };
}

/**
 * The FR-7.8 permitted-decisions matrix, exact — there is NO other combination.
 * A closed exception permits nothing (its decision is already recorded). An open
 * exception with an AVAILABLE recommendation permits the plain APPROVE alongside
 * EDIT_APPROVE and REJECT; an open exception whose recommendation is PENDING or
 * UNAVAILABLE permits EDIT_APPROVE and REJECT only — there is no AI proposal to
 * approve as-is, but a specialist can always resolve by editing or rejecting.
 *
 * The matrix is DECLARED here by the server, never derived by the client, so a
 * screen cannot offer an action the server would refuse.
 */
function permittedDecisions(
  state: ExceptionState,
  recStatus: RecommendationStatus,
): DecisionType[] {
  if (state !== 'OPEN') return [];
  return recStatus === 'AVAILABLE'
    ? ['APPROVE', 'EDIT_APPROVE', 'REJECT']
    : ['EDIT_APPROVE', 'REJECT'];
}

/**
 * Compose the recommendation section (FR-7.7), emitting ONLY the fields the
 * row's status assigns. A PENDING/UNAVAILABLE row never leaks
 * `recommended_action`/`proposed_values`; an AVAILABLE row never leaks
 * `failure_reason`. When `row` is null (should not happen — every exception gets
 * a PENDING placeholder at receipt, F5 FR-5.12 — but composed defensively),
 * report PENDING.
 */
async function composeRecommendation(
  pool: Pool,
  row: RecommendationRow | null,
): Promise<RecommendationDetailDto> {
  if (row === null) {
    return { status: 'PENDING' };
  }

  if (row.status === 'AVAILABLE') {
    const valueRows = await loadRecommendationValues(pool, row.id);
    const proposed_values: RecommendationProposedValueDto[] = valueRows.map((v) => ({
      field_name: v.field_name,
      proposed_value: v.proposed_value,
      origin: 'AI',
      addresses_rule_ids: v.addresses_rule_ids,
    }));
    // exactOptionalPropertyTypes: omit keys rather than assign undefined. Every
    // AVAILABLE recommendation Phase 5 writes carries these columns non-null;
    // the guards keep the DTO shape honest if a column is ever absent.
    const detail: {
      -readonly [K in keyof RecommendationDetailDto]?: RecommendationDetailDto[K];
    } = { status: 'AVAILABLE', proposed_values };
    if (row.recommended_action !== null) detail.recommended_action = row.recommended_action;
    if (row.rationale !== null) detail.rationale = row.rationale;
    if (row.model_id !== null) detail.model_id = row.model_id;
    if (row.prompt_version !== null) detail.prompt_version = row.prompt_version;
    if (row.generated_at !== null) detail.generated_at = row.generated_at;
    return detail as RecommendationDetailDto;
  }

  if (row.status === 'UNAVAILABLE') {
    const detail: {
      -readonly [K in keyof RecommendationDetailDto]?: RecommendationDetailDto[K];
    } = { status: 'UNAVAILABLE' };
    if (row.failure_reason !== null) {
      detail.failure_reason = row.failure_reason as RecommendationFailureReason;
    }
    if (row.failed_at !== null) detail.failed_at = row.failed_at;
    return detail as RecommendationDetailDto;
  }

  // PENDING.
  return { status: 'PENDING', requested_at: row.requested_at };
}

/**
 * Compose the decision section (FR-7.7). No exception this phase reads will have
 * a decision (Phase 6 has not run); this is exercised by the test's positive
 * control that closes a case through the product's own path.
 */
async function composeDecision(
  pool: Pool,
  row: DecisionRow,
): Promise<DecisionDetailDto> {
  const resolution_values = await loadDecisionValues(pool, row.id);
  return {
    decision_type: row.decision_type,
    decided_at: row.decided_at,
    decided_by: { id: row.decided_by_id, display_name: row.decided_by_display_name },
    reason: row.reason,
    resolution_values,
  };
}
