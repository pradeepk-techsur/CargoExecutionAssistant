import type { Pool, PoolClient } from 'pg';

/**
 * The single transaction boundary for the whole codebase.
 *
 * This is the ONLY module under `server/src/` permitted to issue a
 * transaction-control statement — `BEGIN`, `COMMIT` or `ROLLBACK` (rule R-L2;
 * TEST-ARCH-07 asserts exactly one module contains a `BEGIN`). The audit writer
 * (`services/audit/writer.ts`) deliberately does NOT import this module: it
 * receives an already-open `PoolClient` so that a state change and its audit
 * entry commit together or not at all (F13 FR-13.3). Opening a transaction
 * inside the writer would let a caller audit without changing, or change without
 * auditing — the coupling triggers only fire at COMMIT.
 *
 * `SET LOCAL statement_timeout` bounds every request-path transaction so a stuck
 * statement releases the case-anchor lock rather than blocking every other
 * writer on that case (TechArch §8.8, T-01-36). It is `LOCAL`, so it reverts
 * with the transaction and never leaks into a pooled connection's next use.
 *
 * The error from `fn` propagates UNCHANGED after the rollback. The deferred
 * coupling triggers (`AUDIT_COUPLING_VIOLATION`, `AUDIT_CHAIN_BROKEN`,
 * `HITL_VIOLATION`) raise at COMMIT with a `code` of `P0001`; a caller must be
 * able to read the original `error.message` and `error.code` to map them to the
 * generic `RECEIPT_FAILED` / `DECISION_FAILED` (F13 FR-13.16). There is no retry
 * loop: `AUDIT_SEQUENCE_CONFLICT` is surfaced to the caller, never silently
 * retried (F13 §Error States).
 */

export type WithTransactionOptions = {
  /**
   * Statement timeout for the transaction, in milliseconds. Defaults to 10_000
   * (TechArch §8.8). A longer-running fixture or a concurrency test may raise
   * it; the request path never should.
   */
  statementTimeoutMs?: number;
};

export async function withTransaction<T>(
  pool: Pool,
  fn: (tx: PoolClient) => Promise<T>,
  options: WithTransactionOptions = {},
): Promise<T> {
  const statementTimeoutMs = options.statementTimeoutMs ?? 10_000;
  if (!Number.isInteger(statementTimeoutMs) || statementTimeoutMs <= 0) {
    throw new Error(
      `withTransaction: statementTimeoutMs must be a positive integer, got ${String(statementTimeoutMs)}`,
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Parameterised out of an abundance of caution even though the value is a
    // trusted integer: statement_timeout takes a string, so format the ms value
    // into a `<n>ms` interval literal via a bind parameter.
    await client.query(`SET LOCAL statement_timeout = '${statementTimeoutMs}ms'`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* connection already gone; the original error below is what matters */
    }
    throw err;
  } finally {
    client.release();
  }
}
