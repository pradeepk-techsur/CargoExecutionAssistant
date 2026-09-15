import pg from 'pg';

const { Pool } = pg;
type Pool = pg.Pool;

/**
 * The recommendation worker's connection pool, connected as `cargoexec_ai`.
 *
 * Two distinct credentials, per TechArch A-1: `cargoexec_ai` is deliberately
 * weaker than `cargoexec_app`. It can read the case, write a recommendation and
 * its proposed values, and append the two AI-authored audit actions — and it
 * can do nothing else. It holds no privilege on `decisions`, `decision_values`,
 * `specialists` or `sessions`, and cannot change an exception's state. "The AI
 * decided it" is impossible at the privilege layer alone, before the FK and the
 * HITL trigger are even reached.
 *
 * IMPORT RULE: only `ai/worker.ts` may import this pool. A later architecture
 * test asserts that no request-path module reaches for AI credentials — routing
 * request-path work through this pool would quietly widen (or, for decisions,
 * narrow to failure) the privilege set the code runs under.
 *
 * Lazy like `pool.app.ts`: importing this module opens no socket, and the
 * connection string is never logged (T-01-37).
 */

let pool: Pool | undefined;

export function getAiPool(): Pool {
  if (pool === undefined) {
    const url = process.env['DATABASE_URL_AI'];
    if (url === undefined || url === '') {
      throw new Error(
        'DATABASE_URL_AI is not set; the AI worker pool (cargoexec_ai) cannot be constructed',
      );
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

/** Close the AI pool if it was opened. Used by graceful shutdown and tests. */
export async function closeAiPool(): Promise<void> {
  if (pool !== undefined) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
}
