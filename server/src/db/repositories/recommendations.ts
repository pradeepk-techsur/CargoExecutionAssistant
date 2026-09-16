import type {
  EntryFieldName,
  RecommendationFailureReason,
  RecommendationStatus,
} from '@cargoexec/contract';
import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for `recommendations` and
 * `recommendation_values` (migration 0005). Mirrors the file-header convention
 * of `exceptions.ts`: `Queryable`-first, static SQL, `$n` binds only (R-L1,
 * R-L2, R-L8).
 *
 * The READ functions (`loadRecommendationByException`,
 * `loadRecommendationValues`) are used by the Phase 4 case-read services. The
 * WRITE functions (`markRecommendationAvailable`, `markRecommendationUnavailable`,
 * `insertRecommendationValues`) live here alongside them: the terminal write of
 * a generated or failed recommendation. Their SOLE caller is `ai/job.ts`
 * (plan 05-04, the F9 generation job), which runs the status transition + its
 * coupled audit entry over the `cargoexec_app` pool (see the note on
 * `markRecommendationAvailable`). The PENDING placeholder is still created by
 * `insertPendingRecommendation` in `exceptions.ts` inside the receipt
 * transaction and nowhere else.
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

// ---- write path for a generated / failed recommendation (F9, plan 05-04) ---

/**
 * Conditionally transition a PENDING recommendation to AVAILABLE (F9 FR-9.17,
 * the idempotence guard). The WHERE clause is the ENTIRE idempotence
 * mechanism: a second call for an already-resolved recommendation matches
 * zero rows and returns { updated: false } — no error, no second write,
 * nothing for the caller to do but exit. This function issues NO
 * `SELECT ... FOR UPDATE` of its own; combined with `append()`'s existing
 * case-anchor lock (called by the SAME transaction, see plan 05-04's job),
 * the row-level `trg_recommendations_audit` constraint trigger (migration
 * 0009) requires the matching `RECOMMENDATION_GENERATED` audit entry to exist
 * by COMMIT whenever this UPDATE actually changes a row.
 */
export async function markRecommendationAvailable(
  db: Queryable,
  input: {
    recommendation_id: string;
    recommended_action: string;
    rationale: string;
    model_id: string;
    prompt_version: string;
    latency_ms: number;
  },
): Promise<{ updated: boolean }> {
  const res = await db.query(
    `UPDATE recommendations
        SET status = 'AVAILABLE', recommended_action = $2, rationale = $3,
            model_id = $4, prompt_version = $5, generated_at = now(), latency_ms = $6
      WHERE id = $1 AND status = 'PENDING'
      RETURNING id`,
    [
      input.recommendation_id, input.recommended_action, input.rationale,
      input.model_id, input.prompt_version, input.latency_ms,
    ],
  );
  return { updated: res.rowCount === 1 };
}

/** The UNAVAILABLE mirror of markRecommendationAvailable. Same idempotence guard. */
export async function markRecommendationUnavailable(
  db: Queryable,
  input: {
    recommendation_id: string;
    failure_reason: RecommendationFailureReason;
    model_id: string | null;
    prompt_version: string | null;
  },
): Promise<{ updated: boolean }> {
  const res = await db.query(
    `UPDATE recommendations
        SET status = 'UNAVAILABLE', failure_reason = $2, failed_at = now(),
            model_id = $3, prompt_version = $4
      WHERE id = $1 AND status = 'PENDING'
      RETURNING id`,
    [input.recommendation_id, input.failure_reason, input.model_id, input.prompt_version],
  );
  return { updated: res.rowCount === 1 };
}

/**
 * Insert the proposed values for a NOW-AVAILABLE recommendation. Uses the same
 * tuple-placeholder-scaffold pattern as `services/audit/writer.ts`'s
 * `audit_entry_values` insert (see the deliberate exclusion this plan adds to
 * headers.spec.ts) — `unnest()` is awkward here because `addresses_rule_ids`
 * is itself an array column; a per-row `$n::text[]` bind avoids a nested-array
 * unnest entirely. Every VALUE is still a bind parameter; only the tuple
 * COUNT varies with `values.length` (<=14, never caller-supplied length logic
 * beyond that bound). Returns early with no statement when `values` is empty.
 */
export async function insertRecommendationValues(
  db: Queryable,
  recommendationId: string,
  values: readonly { field_name: EntryFieldName; proposed_value: string; addresses_rule_ids: readonly string[] }[],
): Promise<void> {
  if (values.length === 0) return;
  const cols = 4;
  const params: unknown[] = [];
  const tuples: string[] = [];
  values.forEach((v, i) => {
    const base = i * cols;
    tuples.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4}::text[])`);
    params.push(recommendationId, v.field_name, v.proposed_value, v.addresses_rule_ids as readonly string[]);
  });
  await db.query(
    `INSERT INTO recommendation_values (recommendation_id, field_name, proposed_value, addresses_rule_ids)
     VALUES ${tuples.join(',')}`,
    params,
  );
}
