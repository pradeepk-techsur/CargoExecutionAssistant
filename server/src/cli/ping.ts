import process from 'node:process';
// `pg` is a CommonJS module: under Node's native ESM loader a named import
// (`import { Client } from 'pg'`) throws "Named export 'Client' not found" at
// runtime, even though esModuleInterop lets the compiler accept it. This CLI is
// executed directly as an ESM entry point (server/dist/cli/ping.js), so it must
// use the interop-default form.
import pg from 'pg';

const { Client } = pg;

/**
 * ping — the out-of-band liveness check (TechArch §8.6).
 *
 * WHY THIS IS A CLI AND NOT AN HTTP ROUTE. The endpoint inventory is exhaustive
 * at ten §3.1 pairs by requirement (FR-Y1.1), and an architecture test pins it
 * so no eleventh route can be added silently. An HTTP liveness endpoint would be
 * that eleventh route. §8.6 therefore specifies liveness as a command run
 * *beside* the server, not inside it: `node server/dist/cli/ping.js` opens a
 * database connection, runs `SELECT 1`, closes it, and exits 0 on success or 1
 * on any failure. This comment exists — as §8.6 requires — "so a future reader
 * does not 'fix' the omission" by adding a health route.
 *
 * It connects on `DATABASE_URL_APP` (the request-path pool's credential): a
 * liveness check answers "can the process that serves requests reach the
 * database on the connection it actually uses?", so it uses that same
 * connection, not the owner credential.
 *
 * The failure path names the failure CLASS and exits 1 without ever printing the
 * connection string (§4.7): a password or host must not reach a log line by way
 * of a liveness diagnostic.
 */
export async function main(): Promise<number> {
  const url = process.env['DATABASE_URL_APP'];
  if (url === undefined || url === '') {
    process.stderr.write(
      'ping: DATABASE_URL_APP is not set; cannot check database liveness.\n',
    );
    return 1;
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return 0;
  } catch (err) {
    // Name the failure class only — never the connection string (§4.7).
    const name = err instanceof Error ? err.name : 'UnknownError';
    process.stderr.write(`ping: database liveness check failed (${name}).\n`);
    return 1;
  } finally {
    // end() may itself reject if connect() never succeeded; swallow that so the
    // exit code reflects the check result, not a teardown race.
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

// Run when invoked directly (server/dist/cli/ping.js).
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      const name = err instanceof Error ? err.name : 'UnknownError';
      process.stderr.write(`ping: unexpected failure (${name}).\n`);
      process.exit(1);
    });
}
