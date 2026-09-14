import runnerDefault, { runner as runnerNamed } from 'node-pg-migrate';

// node-pg-migrate 7.x exports the runner as the default; accept the named export
// too so a packaging change surfaces as a clear error rather than a crash.
const runner = typeof runnerDefault === 'function' ? runnerDefault : runnerNamed;
if (typeof runner !== 'function') {
  throw new Error('node-pg-migrate runner export not found');
}

export async function runMigrations({ databaseUrl, dir = 'server/migrations', log = () => {} }) {
  if (!databaseUrl) throw new Error('runMigrations: databaseUrl is required');
  await runner({
    databaseUrl,
    dir,
    migrationsTable: 'schema_migrations',
    direction: 'up',
    count: Infinity,
    singleTransaction: false, // each migration file gets its own transaction
    log,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMigrations({
    databaseUrl: process.env.DATABASE_URL_OWNER,
    log: (m) => console.log(m),
  });
  console.log('migrations applied');
}
