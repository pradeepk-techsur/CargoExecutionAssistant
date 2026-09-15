import type { EntryFieldName, RecommendationStatus } from '@cargoexec/contract';
import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for `recommendations` and
 * `recommendation_values` (migration 0005). Mirrors the file-header convention
 * of `exceptions.ts`: `Queryable`-first, static SQL, `$n` binds only (R-L1,
 * R-L2, R-L8).
 *
 * Every function here is READ-ONLY. There is deliberately NO `INSERT`/`UPDATE`
 * of `recommendations.status`, `recommended_action`, `rationale`, the
 * traceability metadata, or `recommendation_values` in this module — Phase 5
 * (the AI recommendation service) owns writing those. The PENDING placeholder
 * is created by `insertPendingRecommendation` in `exceptions.ts` inside the
 * receipt transaction and nowhere else.
 */

/** The recommendation row for an exception, timestamps stringified. */
export type RecommendationRow = {
  id: string;
  status: RecommendationStatus;
  recommended_action: string | null;
  rationale: string | null;
  model_id: string | null;
  prompt_version: string | null;
  generated_at: string | null;
  failure_reason: string | null;
  failed_at: string | null;
  requested_at: string;
};

/**
 * Load the single recommendation for an exception (FR-7.7). The
 * `uq_recommendations_exception` unique index guarantees at most one row. Every
 * exception this phase reads has a PENDING placeholder (Phase 5 has not run) —
 * that is normal, expected data. Returns `null` when no row exists.
 */
export async function loadRecommendationByException(
  db: Queryable,
  exceptionId: string,
): Promise<RecommendationRow | null> {
  const res = await db.query<{
    id: string;
    status: RecommendationStatus;
    recommended_action: string | null;
    rationale: string | null;
    model_id: string | null;
    prompt_version: string | null;
    generated_at: Date | null;
    failure_reason: string | null;
    failed_at: Date | null;
    requested_at: Date;
  }>(
    `SELECT id, status, recommended_action, rationale, model_id, prompt_version,
            generated_at, failure_reason, failed_at, requested_at
       FROM recommendations
      WHERE exception_id = $1`,
    [exceptionId],
  );
  const r = res.rows[0];
  if (r === undefined) {
    return null;
  }
  return {
    id: r.id,
    status: r.status,
    recommended_action: r.recommended_action,
    rationale: r.rationale,
    model_id: r.model_id,
    prompt_version: r.prompt_version,
    generated_at: r.generated_at === null ? null : r.generated_at.toISOString(),
    failure_reason: r.failure_reason,
    failed_at: r.failed_at === null ? null : r.failed_at.toISOString(),
    requested_at: r.requested_at.toISOString(),
  };
}

/** One AI-proposed value on a recommendation. */
export type RecommendationValueRow = {
  field_name: EntryFieldName;
  proposed_value: string;
  addresses_rule_ids: readonly string[];
};

/**
 * Load the proposed values for a recommendation (FR-7.7), ascending
 * `field_name`. Empty for a PENDING/UNAVAILABLE recommendation. READ-ONLY.
 */
export async function loadRecommendationValues(
  db: Queryable,
  recommendationId: string,
): Promise<RecommendationValueRow[]> {
  const res = await db.query<{
    field_name: EntryFieldName;
    proposed_value: string;
    addresses_rule_ids: string[];
  }>(
    `SELECT field_name, proposed_value, addresses_rule_ids
       FROM recommendation_values
      WHERE recommendation_id = $1
      ORDER BY field_name`,
    [recommendationId],
  );
  return res.rows.map((r) => ({
    field_name: r.field_name,
    proposed_value: r.proposed_value,
    addresses_rule_ids: r.addresses_rule_ids,
  }));
}
