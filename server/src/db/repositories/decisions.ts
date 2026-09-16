import type { PoolClient } from 'pg';
import type { DecisionType, EntryFieldName, Origin } from '@cargoexec/contract';
import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for `decisions` and `decision_values`
 * (migration 0006). Mirrors the file-header convention of `exceptions.ts`:
 * `Queryable`-first, static SQL, `$n` binds only (R-L1, R-L2, R-L8).
 *
 * This module is the sole WRITER and READER of `decisions`/`decision_values`.
 * The READ functions (`loadDecisionByException`, `loadDecisionValues`,
 * `loadDecisionByIdempotencyKey`) serve the F7 case-read services and the F11
 * decision service's replay/conflict checks. The WRITE functions
 * (`insertDecision`, `insertDecisionValues`) have EXACTLY ONE caller —
 * `services/decision.service.ts` (Phase 6, F11) — which runs them inside its
 * one governed transaction. A write function that must run inside an
 * already-open transaction takes a `PoolClient` (matching `audit/writer.ts`'s
 * convention), not the generic `Queryable` the reads use, so it can never be
 * called outside a transaction.
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
  changed_from_proposal: boolean;
};

/**
 * Load the resolution values for a decision (FR-7.7), ascending `field_name`.
 * Empty for an APPROVE/REJECT decision that changed no proposed value.
 * `changed_from_proposal` (FR-11.21) is carried through so the F7 case-read
 * caller (`caseRead.service.ts`'s `composeDecision`, which spreads the row) and
 * the F11 response both pick it up with no further change. READ-ONLY.
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
    changed_from_proposal: boolean;
  }>(
    `SELECT field_name, value, origin, prior_value, prior_origin, changed_from_proposal
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
    changed_from_proposal: r.changed_from_proposal,
  }));
}

/**
 * Look up an existing decision by (exception_id, idempotency_key) for the
 * pre-transaction replay check (F11 FR-11.11). Same shape/join as
 * `loadDecisionByException`, filtered additionally by `idempotency_key = $2`.
 * Returns `null` when no row matches — a fresh key, or one never used on this
 * exception. READ-ONLY.
 */
export async function loadDecisionByIdempotencyKey(
  db: Queryable,
  exceptionId: string,
  idempotencyKey: string,
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
      WHERE d.exception_id = $1 AND d.idempotency_key = $2`,
    [exceptionId, idempotencyKey],
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

// ---- write path (F11, plan 06-01) ------------------------------------------
//
// The two functions below are the ONLY INSERTs into `decisions`/`decision_values`
// in the codebase. Their sole caller is `services/decision.service.ts`, which
// runs them inside its one `withTransaction` — hence the `PoolClient` first
// argument (they cannot be run outside a transaction). Every value is a `$n`
// bind (R-L8); no request-derived string is ever concatenated into SQL text.

export type InsertDecisionInput = {
  exception_id: string;
  decision_type: DecisionType;
  decided_by: string;
  reason: string | null;
  recommendation_id: string; // ALWAYS present — F5 FR-5.12 guarantees every
                              // exception has a recommendation row (PENDING at
                              // minimum), so this column is never null in
                              // practice even though the DDL allows it.
  resulting_state: 'RESOLVED' | 'REJECTED';
  idempotency_key: string | null;
};

/** Insert the one decisions row for a case (F11 FR-11.1). Mirrors insertException's RETURNING style. */
export async function insertDecision(
  tx: PoolClient,
  input: InsertDecisionInput,
): Promise<{ id: string; decided_at: string }> {
  const res = await tx.query<{ id: string; decided_at: Date }>(
    `INSERT INTO decisions
       (exception_id, decision_type, decided_by, reason, recommendation_id, resulting_state, idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, decided_at`,
    [
      input.exception_id,
      input.decision_type,
      input.decided_by,
      input.reason,
      input.recommendation_id,
      input.resulting_state,
      input.idempotency_key,
    ],
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('insertDecision: INSERT returned no row');
  }
  return { id: row.id, decided_at: row.decided_at.toISOString() };
}

export type InsertDecisionValueInput = {
  field_name: EntryFieldName;
  value: string;
  origin: Origin;
  prior_value: string | null;
  prior_origin: Origin | null;
  changed_from_proposal: boolean;
};

/**
 * Insert the decision_values rows (empty array for REJECT — writes nothing, a
 * valid no-op). Built exactly like `audit/writer.ts`'s multi-row INSERT: a
 * seven-column tuple per row (decision_id, field_name, value, origin,
 * prior_value, prior_origin, changed_from_proposal), every value a `$n` bind,
 * only the tuple COUNT varying with `values.length` (<= 14).
 */
export async function insertDecisionValues(
  tx: PoolClient,
  decisionId: string,
  values: readonly InsertDecisionValueInput[],
): Promise<void> {
  if (values.length === 0) return;
  const cols = 7;
  const params: unknown[] = [];
  const tuples: string[] = [];
  values.forEach((v, i) => {
    const base = i * cols;
    tuples.push(
      `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`,
    );
    params.push(
      decisionId,
      v.field_name,
      v.value,
      v.origin,
      v.prior_value,
      v.prior_origin,
      v.changed_from_proposal,
    );
  });
  await tx.query(
    `INSERT INTO decision_values
       (decision_id, field_name, value, origin, prior_value, prior_origin, changed_from_proposal)
     VALUES ${tuples.join(',')}`,
    params,
  );
}
