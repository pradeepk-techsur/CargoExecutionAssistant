import pg from 'pg';

const { Pool } = pg;
type Pool = pg.Pool;

/**
 * The request-path connection pool, connected as `cargoexec_app`.
 *
 * This is the only role the HTTP request path ever uses (TechArch A-1): it can
 * INSERT the entry of record, the validation results, exceptions, decisions and
 * audit rows, but holds no UPDATE on the entry of record and no UPDATE/DELETE on
 * the append-only audit store. A separate pool (`pool.ai.ts`) carries the
 * strictly weaker `cargoexec_ai` credentials for the recommendation worker.
 *
 * The pool is constructed lazily on first `getAppPool()` rather than at import
 * time, so importing this module opens no socket. A module that is only
 * type-checked, or a test that never touches the database, must not force a
 * connection (and must not fail because `DATABASE_URL_APP` is unset in a
 * type-only context).
 *
 * The connection string is never logged: a thrown error mentions only the name
 * of the missing environment variable, never its value (T-01-37).
 */

let pool: Pool | undefined;

export function getAppPool(): Pool {
  if (pool === undefined) {
    const url = process.env['DATABASE_URL_APP'];
    if (url === undefined || url === '') {
      throw new Error(
        'DATABASE_URL_APP is not set; the request-path pool (cargoexec_app) cannot be constructed',
      );
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

/** Close the app pool if it was opened. Used by graceful shutdown and tests. */
export async function closeAppPool(): Promise<void> {
  if (pool !== undefined) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
}
