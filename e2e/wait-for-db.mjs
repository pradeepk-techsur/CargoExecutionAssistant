// The ONE bounded database-readiness poll, shared by webServer.command and
// globalSetup so the boot sequence cannot race a database that is not listening.
//
// A plain .mjs run by `node` with no build step (the same shape as
// server/scripts/migrate.mjs, and for the same reason: it runs before tsc output
// is guaranteed present). It opens a pg.Client on DATABASE_URL_OWNER, retries on
// connection failure every 500 ms up to a bounded 60-second budget, and on
// timeout exits 1 with a message naming the host and port but NEVER the
// connection string (§4.7 — the same rule config.ts follows).
//
// Bind/connect asymmetry (intentional): the server BINDS 0.0.0.0 (§6.5 — a
// loopback bind would be invisible to the preview proxy and loadConfig refuses
// it); the test CONNECTS to 127.0.0.1/localhost, which is simply how the test
// process reaches it.

import pg from 'pg';

const { Client } = pg;

const BUDGET_MS = 60_000;
const INTERVAL_MS = 500;

/** Redact everything but host:port so no credential reaches a log line. */
function hostPort(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}`;
  } catch {
    return '(unparseable DATABASE_URL_OWNER)';
  }
}

export async function waitForDb(
  connectionString = process.env.DATABASE_URL_OWNER,
) {
  if (!connectionString) {
    throw new Error(
      'wait-for-db: DATABASE_URL_OWNER is not set; cannot poll the database',
    );
  }
  const where = hostPort(connectionString);
  const deadline = Date.now() + BUDGET_MS;

  for (;;) {
    const client = new Client({ connectionString, connectionTimeoutMillis: 2000 });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch {
      await client.end().catch(() => {});
      if (Date.now() >= deadline) {
        throw new Error(
          `wait-for-db: database at ${where} did not become ready within ${BUDGET_MS / 1000}s`,
        );
      }
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  waitForDb()
    .then(() => {
      process.stdout.write('wait-for-db: database is ready\n');
    })
    .catch((err) => {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    });
}
