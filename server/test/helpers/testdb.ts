// Per-suite database lifecycle (TechArch §8.2).
//
// Teardown DROPs the database rather than emptying its tables in place. This is
// not a stylistic choice: bulk-clearing the audit tables is rejected by an
// unconditional trigger for every role including the owner, so teardown by
// clearing rows is impossible by design — the append-only guarantee constrains
// the test harness itself (TechArch §8.2). This helper must only ever DROP.

import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
// @ts-expect-error - plain .mjs runner shared with the deployment path
import { runMigrations } from '../../scripts/migrate.mjs';

export type TestDatabase = {
  name: string;
  ownerUrl: string;
  appUrl: string;
  aiUrl: string;
  superuserUrl: string;
};

// Database names are generated, never client-supplied. They are additionally
// validated against this pattern immediately before interpolation, because
// CREATE DATABASE / DROP DATABASE cannot take a bind parameter.
const DB_NAME_RE = /^cargoexec_test_[0-9a-f]{12}$/;

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function config() {
  const host = env('PGHOST', 'localhost');
  const port = env('PGPORT', '5432');
  const ownerPassword = env('CARGOEXEC_OWNER_PASSWORD', 'cargoexec_local_owner');
  const appPassword = env('CARGOEXEC_APP_PASSWORD', 'cargoexec_local_app');
  const aiPassword = env('CARGOEXEC_AI_PASSWORD', 'cargoexec_local_ai');
  const superuserPassword = env('POSTGRES_SUPERUSER_PASSWORD', 'cargoexec_local_superuser');
  return { host, port, ownerPassword, appPassword, aiPassword, superuserPassword };
}

function urlFor(user: string, password: string, dbName: string): string {
  const { host, port } = config();
  return `postgres://${user}:${password}@${host}:${port}/${dbName}`;
}

/** Connect to a database URL and return a connected pg.Client. */
export async function connect(url: string): Promise<Client> {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

/** Run `fn` with a connected client, always closing it afterwards. */
export async function withClient<T>(url: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await connect(url);
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Create a fresh, migrated database for one test suite.
 * Connects to the `postgres` maintenance database as cargoexec_owner (which
 * holds CREATEDB), creates a uniquely named database, and applies the full
 * migration set through the same runner the deployment path uses.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const c = config();
  const name = 'cargoexec_test_' + randomBytes(6).toString('hex');
  if (!DB_NAME_RE.test(name)) {
    throw new Error(`generated database name failed validation: ${name}`);
  }

  const maintenanceUrl = urlFor('cargoexec_owner', c.ownerPassword, 'postgres');
  await withClient(maintenanceUrl, async (client) => {
    await client.query(`CREATE DATABASE "${name}"`);
  });

  const ownerUrl = urlFor('cargoexec_owner', c.ownerPassword, name);
  await runMigrations({ databaseUrl: ownerUrl });

  return {
    name,
    ownerUrl,
    appUrl: urlFor('cargoexec_app', c.appPassword, name),
    aiUrl: urlFor('cargoexec_ai', c.aiPassword, name),
    superuserUrl: urlFor('postgres', c.superuserPassword, name),
  };
}

/**
 * Drop a test database. Only ever DROP — see the file header. Active backends
 * are terminated first so DROP DATABASE does not fail on open connections.
 */
export async function dropTestDatabase(db: TestDatabase): Promise<void> {
  if (!DB_NAME_RE.test(db.name)) {
    throw new Error(`refusing to drop database with invalid name: ${db.name}`);
  }
  const c = config();
  const maintenanceUrl = urlFor('cargoexec_owner', c.ownerPassword, 'postgres');
  await withClient(maintenanceUrl, async (client) => {
    await client.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [db.name],
    );
    await client.query(`DROP DATABASE IF EXISTS "${db.name}"`);
  });
}
