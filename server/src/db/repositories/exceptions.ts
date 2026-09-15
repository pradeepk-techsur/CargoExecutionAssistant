import type { ExceptionRef } from '@cargoexec/contract';
import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for `exceptions` and the PENDING placeholder in
 * `recommendations` (migrations 0004 / 0005).
 *
 * `Queryable`-first, static SQL, `$n` binds only (R-L1, R-L2, R-L8).
 *
 * There is NO function that writes `exceptions.state`, `closed_at` or
 * `decision_id` in this module — `decision.service.ts` (Phase 6) is the only
 * permitted writer (R-L4, F5 FR-5.7) — and no delete path for an exception (F5
 * FR-5.15). There is also NO `createException`-from-anything: an exception is
 * derived from a failing validation inside a receipt transaction, and nowhere
 * else (F5 FR-5.1).
 */

/**
 * Open the exception for a failing validation. Binds ONLY `entry_id` and
 * `validation_result_id`; `validation_outcome`, `state` and `receipt_position`
 * are DDL defaults (`'FAIL'`, `'OPEN'`, `nextval('exception_receipt_position_seq')`).
 *
 * Because `(validation_result_id, validation_outcome)` is a composite FK onto
 * `validation_results (id, outcome)` and `validation_outcome` is CHECK-pinned to
 * `'FAIL'`, an exception whose basis is a PASSING validation is rejected by the
 * database with NO TRIGGER involved (F0 FR-0.11, F5 FR-5.4). Plan 03-07 asserts
 * that integrity behaviourally; the statement-level half is asserted in
 * `entries.repo.spec.ts` (this plan).
 */
export async function insertException(
  db: Queryable,
  input: { entry_id: string; validation_result_id: string },
): Promise<{ id: string; state: 'OPEN'; receipt_position: number }> {
  const res = await db.query<{ id: string; state: string; receipt_position: string }>(
    `INSERT INTO exceptions (entry_id, validation_result_id)
     VALUES ($1,$2)
     RETURNING id, state, receipt_position`,
    [input.entry_id, input.validation_result_id],
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('insertException: INSERT returned no row');
  }
  // receipt_position is a bigint — pg returns it as a string; the sequence is far
  // below Number.MAX_SAFE_INTEGER for any realistic receipt volume.
  return { id: row.id, state: row.state as 'OPEN', receipt_position: Number(row.receipt_position) };
}

/**
 * Create the PENDING recommendation placeholder for a freshly opened exception.
 * `status` defaults to `'PENDING'` and `requested_at` to `now()`; every result
 * column stays NULL (F5 FR-5.12). Creating the placeholder writes NO audit entry
 * — the `EXCEPTION_OPENED` entry covers the transaction's state change.
 */
export async function insertPendingRecommendation(
  db: Queryable,
  exceptionId: string,
): Promise<{ id: string }> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO recommendations (exception_id) VALUES ($1) RETURNING id`,
    [exceptionId],
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('insertPendingRecommendation: INSERT returned no id');
  }
  return row;
}

/**
 * Load the exception reference for an entry (F3 FR-3.11): the receipt/detail
 * responses carry it or `null`. Returns `null` when the entry validated clean.
 */
export async function loadExceptionRefByEntry(
  db: Queryable,
  entryId: string,
): Promise<ExceptionRef | null> {
  const res = await db.query<{ id: string; state: ExceptionRef['state']; receipt_position: string }>(
    `SELECT id, state, receipt_position FROM exceptions WHERE entry_id = $1`,
    [entryId],
  );
  const row = res.rows[0];
  if (row === undefined) {
    return null;
  }
  return { id: row.id, state: row.state, receipt_position: Number(row.receipt_position) };
}
