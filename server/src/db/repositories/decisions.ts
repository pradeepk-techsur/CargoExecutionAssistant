import type { DecisionType, EntryFieldName, Origin } from '@cargoexec/contract';
import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for `decisions` and `decision_values`
 * (migration 0006). Mirrors the file-header convention of `exceptions.ts`:
 * `Queryable`-first, static SQL, `$n` binds only (R-L1, R-L2, R-L8).
 *
 * Every function here is READ-ONLY. There is deliberately NO `INSERT`/`UPDATE`
 * of `decisions` or `decision_values` in this module — Phase 6 (the decision
 * service) is the only permitted writer. No exception this phase reads will ever
 * have a decision (Phase 6 has not run); `null` is normal, expected data.
 */

/** The decision row for an exception, timestamp stringified, decider joined. */
export type DecisionRow = {
  id: string;
  decision_type: DecisionType;
  decided_at: string;
  decided_by_id: string;
  decided_by_display_name: string;
  reason: string | null;
};

/**
 * Load the single decision for an exception (FR-7.7). The
 * `uq_decisions_exception` unique index guarantees at most one row, ever. The
 * decider's display name is joined from `specialists`. Returns `null` when the
 * exception has no decision (i.e. it is still OPEN).
 */
export async function loadDecisionByException(
  db: Queryable,
  exceptionId: string,
): Promise<DecisionRow | null> {
  const res = await db.query<{
    id: string;
    decision_type: DecisionType;
    decided_at: Date;
    decided_by_id: string;
    decided_by_display_name: string;
    reason: string | null;
  }>(
    `SELECT d.id, d.decision_type, d.decided_at,
            d.decided_by AS decided_by_id, s.display_name AS decided_by_display_name,
            d.reason
       FROM decisions d JOIN specialists s ON s.id = d.decided_by
      WHERE d.exception_id = $1`,
    [exceptionId],
  );
  const r = res.rows[0];
  if (r === undefined) {
    return null;
  }
  return {
    id: r.id,
    decision_type: r.decision_type,
    decided_at: r.decided_at.toISOString(),
    decided_by_id: r.decided_by_id,
    decided_by_display_name: r.decided_by_display_name,
    reason: r.reason,
  };
}

/** One value on a recorded decision. */
export type DecisionValueRow = {
  field_name: EntryFieldName;
  value: string;
  origin: Origin;
  prior_value: string | null;
  prior_origin: Origin | null;
};

/**
 * Load the resolution values for a decision (FR-7.7), ascending `field_name`.
 * Empty for an APPROVE/REJECT decision that changed no proposed value.
 * READ-ONLY.
 */
export async function loadDecisionValues(
  db: Queryable,
  decisionId: string,
): Promise<DecisionValueRow[]> {
  const res = await db.query<{
    field_name: EntryFieldName;
    value: string;
    origin: Origin;
    prior_value: string | null;
    prior_origin: Origin | null;
  }>(
    `SELECT field_name, value, origin, prior_value, prior_origin
       FROM decision_values
      WHERE decision_id = $1
      ORDER BY field_name`,
    [decisionId],
  );
  return res.rows.map((r) => ({
    field_name: r.field_name,
    value: r.value,
    origin: r.origin,
    prior_value: r.prior_value,
    prior_origin: r.prior_origin,
  }));
}
