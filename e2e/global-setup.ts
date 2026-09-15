// Playwright global setup — ONE job: make the database reachable.
//
// It brings the db container up (idempotent) and runs the shared wait-for-db
// poll. Nothing else: it does NOT migrate, does NOT provision the account, and
// does NOT export environment variables — the webServer command owns migrate +
// account bootstrap, and e2e/env.ts owns the environment. This is what makes the
// suite independent of whether Playwright runs globalSetup before or after
// webServer (see playwright.config.ts).

import { spawnSync } from 'node:child_process';
import { E2E_ENV } from './env.js';

export default async function globalSetup(): Promise<void> {
  // 1. Bring the database up. `docker compose up -d db` is idempotent —
  //    re-running against an already-up container converges instead of erroring.
  const up = spawnSync('docker', ['compose', 'up', '-d', 'db'], {
    stdio: 'inherit',
  });
  if (up.status !== 0) {
    throw new Error(
      `global-setup: "docker compose up -d db" exited ${String(up.status)}`,
    );
  }

  // 2. Wait for the database to accept connections, using the SAME bounded poll
  //    the webServer command uses (one definition of "the database is ready").
  const wait = spawnSync('node', ['e2e/wait-for-db.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL_OWNER: E2E_ENV.DATABASE_URL_OWNER },
  });
  if (wait.status !== 0) {
    throw new Error(
      `global-setup: database did not become ready (wait-for-db exited ${String(wait.status)})`,
    );
  }
}
