import type { Pool } from 'pg';
import type {
  RecommendationDetailDto,
  RecommendationFailureReason,
  RecommendationProposedValueDto,
} from '@cargoexec/contract';
import {
  loadRecommendationByException,
  loadRecommendationValues,
} from '../db/repositories/recommendations.js';
import { resolveCaseIdentifier } from '../db/repositories/exceptions.js';

/**
 * Load the F9 polling response for an exception (TechArch §3.1 row 8, FR-9's
 * own API surface). Returns the string 'NOT_FOUND' when no such exception
 * exists at all — distinct from a real exception whose recommendation happens
 * to be PENDING, which is a normal 200. READ-ONLY: calls no write function,
 * no append().
 *
 * NOTE on the existence probe: this uses `resolveCaseIdentifier(pool, 'UUID',
 * exceptionId)` — the existing lightest read that answers "does an exception
 * with this id exist?" against a bound `$1`. (The plan named a
 * `loadExceptionForGeneration` that does not exist in this codebase; the
 * generation-time reads belong to plans 05-01/05-02 and are not yet present.
 * `resolveCaseIdentifier` in UUID form is the correct, already-built,
 * bind-only, read-only equivalent — FOUND ⇒ the exception exists, NOT_FOUND ⇒
 * it does not. A well-formed but unmatched uuid therefore returns 'NOT_FOUND'
 * here, giving the route its 404.)
 *
 * This mirrors the status-discriminated composition already private inside
 * `caseRead.service.ts`'s `composeRecommendation`. It is deliberately
 * duplicated here rather than imported: STATE.md marks `caseRead.service.ts` as
 * needing no changes, both call sites independently emit ONLY the fields each
 * status assigns (per FR-9.7 / the RecommendationDetailDto contract), and the
 * logic is small and stable.
 */
export async function loadRecommendationDetail(
  pool: Pool,
  exceptionId: string,
): Promise<RecommendationDetailDto | 'NOT_FOUND'> {
  // Confirm the exception itself exists (a well-formed but unmatched uuid must
  // be 404, not a defensive PENDING). resolveCaseIdentifier in UUID form is the
  // lightest existing read that answers this, binding the id as $1.
  const resolved = await resolveCaseIdentifier(pool, 'UUID', exceptionId);
  if (resolved.status !== 'FOUND') {
    return 'NOT_FOUND';
  }

  const row = await loadRecommendationByException(pool, exceptionId);
  if (row === null) {
    // Should not happen — every exception gets a PENDING placeholder at
    // receipt (F5 FR-5.12) — but compose defensively rather than throw.
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
    // exactOptionalPropertyTypes: omit keys rather than assign undefined.
    const detail: { -readonly [K in keyof RecommendationDetailDto]?: RecommendationDetailDto[K] } =
      { status: 'AVAILABLE', proposed_values };
    if (row.recommended_action !== null) detail.recommended_action = row.recommended_action;
    if (row.rationale !== null) detail.rationale = row.rationale;
    if (row.model_id !== null) detail.model_id = row.model_id;
    if (row.prompt_version !== null) detail.prompt_version = row.prompt_version;
    if (row.generated_at !== null) detail.generated_at = row.generated_at;
    return detail as RecommendationDetailDto;
  }

  if (row.status === 'UNAVAILABLE') {
    const detail: { -readonly [K in keyof RecommendationDetailDto]?: RecommendationDetailDto[K] } =
      { status: 'UNAVAILABLE' };
    if (row.failure_reason !== null) {
      detail.failure_reason = row.failure_reason as RecommendationFailureReason;
    }
    if (row.failed_at !== null) detail.failed_at = row.failed_at;
    return detail as RecommendationDetailDto;
  }

  return { status: 'PENDING', requested_at: row.requested_at };
}
