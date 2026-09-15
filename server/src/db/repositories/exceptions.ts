import type { ExceptionRef, ExceptionState } from '@cargoexec/contract';
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
 * Convert a bigint `receipt_position` (pg returns it as a string) to the
 * `number` the contract types it as (dto.ts ExceptionRef.receipt_position). The
 * sequence sits far below Number.MAX_SAFE_INTEGER for any realistic receipt
 * volume; should a future high-volume deployment ever exceed 2^53, THROW rather
 * than truncate silently — a lost-precision receipt position is an internal
 * invariant breach, never a value we quietly round.
 */
function toReceiptPosition(raw: string): number {
  const n = Number(raw);
  if (!Number.isSafeInteger(n)) {
    throw new Error(
      `receipt_position ${raw} exceeds Number.MAX_SAFE_INTEGER; the contract types it as number`,
    );
  }
  return n;
}

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
  return { id: row.id, state: row.state as 'OPEN', receipt_position: toReceiptPosition(row.receipt_position) };
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
  return { id: row.id, state: row.state, receipt_position: toReceiptPosition(row.receipt_position) };
}

// ---- read model for the receipt-ordered queue (F7) -------------------------
//
// The functions below are READ-ONLY: no INSERT/UPDATE/DELETE against exceptions
// or any receipt table. They are the projection the Phase 4 queue and case-read
// services (04-02) compose. `decision.service.ts` (Phase 6) remains the only
// permitted writer of `exceptions.state`.

/** One row of the receipt-ordered open queue, as read from the DB. */
export type QueueRow = {
  id: string;
  case_reference: string;
  receipt_position: number;
  received_at: string;
  entry_number: string | null;
  validation_result_id: string;
  findings_count: number;
};

/**
 * The receipt-ordered open-queue query (F7 FR-7.1 / FR-7.9). There are NO
 * parameters — the FRD forbids any filter, sort or paging control
 * (FR-7.2/FR-7.3). `state = 'OPEN'` uses `idx_exceptions_open_receipt_order`,
 * the only index that exists, so the sole possible ordering is ascending
 * `receipt_position`. `LIMIT 501` is a fixed ceiling: the caller reads 500 rows
 * and treats a 501st as the "truncated" signal.
 */
export async function listOpenExceptions(db: Queryable): Promise<QueueRow[]> {
  const res = await db.query<{
    id: string;
    case_reference: string;
    receipt_position: string;
    received_at: Date;
    entry_number: string | null;
    validation_result_id: string;
    findings_count: number;
  }>(
    `SELECT e.id, c.case_reference, e.receipt_position, c.received_at,
            c.entry_number, e.validation_result_id, vr.findings_count
       FROM exceptions e
       JOIN cargo_entries c ON c.id = e.entry_id
       JOIN validation_results vr ON vr.id = e.validation_result_id
      WHERE e.state = 'OPEN'
      ORDER BY e.receipt_position ASC
      LIMIT 501`,
  );
  return res.rows.map((r) => ({
    id: r.id,
    case_reference: r.case_reference,
    receipt_position: toReceiptPosition(r.receipt_position),
    received_at: r.received_at.toISOString(),
    entry_number: r.entry_number,
    validation_result_id: r.validation_result_id,
    findings_count: r.findings_count,
  }));
}

/**
 * The result of resolving a caller-supplied identifier to an exception. The
 * three outcomes are DISTINCT (FR-7.14): a match, a well-formed reference that
 * belongs to an entry which validated clean (no exception), and nothing at all.
 */
export type ExceptionIdentifierResolution =
  | { status: 'FOUND'; exceptionId: string }
  | { status: 'ENTRY_PASSED_VALIDATION' }
  | { status: 'NOT_FOUND' };

/**
 * Resolve an identifier to an exception (FR-7.14). `value` is ALWAYS bound as
 * `$1` — never interpolated into the SQL text (R-L8, T-04-01) — so even an
 * unvalidated string is safe here. The route (04-03) validates the identifier
 * FORM before calling; this function trusts the `form` discriminator.
 *
 * - `UUID`: the value is an exception id. FOUND or NOT_FOUND.
 * - `CASE_REF`: a LEFT JOIN distinguishes a clean (no-exception) entry from no
 *   entry at all. No row → NOT_FOUND. A row with a NULL exception_id →
 *   ENTRY_PASSED_VALIDATION. A row with a non-null exception_id → FOUND.
 */
export async function resolveCaseIdentifier(
  db: Queryable,
  form: 'UUID' | 'CASE_REF',
  value: string,
): Promise<ExceptionIdentifierResolution> {
  if (form === 'UUID') {
    const res = await db.query<{ id: string }>(
      `SELECT id FROM exceptions WHERE id = $1`,
      [value],
    );
    const row = res.rows[0];
    return row === undefined ? { status: 'NOT_FOUND' } : { status: 'FOUND', exceptionId: row.id };
  }
  const res = await db.query<{ exception_id: string | null }>(
    `SELECT e.id AS exception_id
       FROM cargo_entries c
       LEFT JOIN exceptions e ON e.entry_id = c.id
      WHERE c.case_reference = $1`,
    [value],
  );
  const row = res.rows[0];
  if (row === undefined) {
    return { status: 'NOT_FOUND' };
  }
  if (row.exception_id === null) {
    return { status: 'ENTRY_PASSED_VALIDATION' };
  }
  return { status: 'FOUND', exceptionId: row.exception_id };
}

/** The exception identity + lifecycle row for a case detail. */
export type ExceptionDetailRow = {
  id: string;
  case_reference: string;
  entry_id: string;
  state: ExceptionState;
  receipt_position: number;
  opened_at: string;
  closed_at: string | null;
};

/**
 * Load the exception identity + lifecycle section of a case detail (FR-7.7).
 * `opened_at`/`closed_at` return as `Date | null` from pg; they are handed back
 * as ISO strings, with `closed_at` staying `null` when the column is null.
 * Returns `null` when no exception carries that id.
 */
export async function loadExceptionDetail(
  db: Queryable,
  exceptionId: string,
): Promise<ExceptionDetailRow | null> {
  const res = await db.query<{
    id: string;
    case_reference: string;
    entry_id: string;
    state: ExceptionState;
    receipt_position: string;
    opened_at: Date;
    closed_at: Date | null;
  }>(
    `SELECT e.id, c.case_reference, e.entry_id, e.state, e.receipt_position, e.opened_at, e.closed_at
       FROM exceptions e JOIN cargo_entries c ON c.id = e.entry_id
      WHERE e.id = $1`,
    [exceptionId],
  );
  const r = res.rows[0];
  if (r === undefined) {
    return null;
  }
  return {
    id: r.id,
    case_reference: r.case_reference,
    entry_id: r.entry_id,
    state: r.state,
    receipt_position: toReceiptPosition(r.receipt_position),
    opened_at: r.opened_at.toISOString(),
    closed_at: r.closed_at === null ? null : r.closed_at.toISOString(),
  };
}
