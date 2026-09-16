// The API test harness (TechArch §8.2, §8.3).
//
// Every API suite in this phase and in phases 3–6 reuses `withApi`: it stands up
// a fresh, migrated database and an assembled `createApp` ONCE per suite (not per
// test — Argon2id at 19 MiB is deliberately slow), and tears the database down
// by DROP afterwards (the audit tables cannot be truncated, §8.2). A `fixedClock`
// makes expiry advanceable, and `signIn` is a convenience that returns exactly
// the cookie a later request must send plus the CSRF token the SPA would hold.

import { beforeAll, afterAll } from 'vitest';
import express from 'express';
import pg from 'pg';
import supertest from 'supertest';
import type { SessionDto } from '@cargoexec/contract';
import { createApp } from '../../../src/http/app.js';
import { fixedClock, type Clock } from '../../../src/clock.js';
import type { AppConfig } from '../../../src/config.js';
import {
  createTestDatabase,
  dropTestDatabase,
  type TestDatabase,
} from '../../helpers/testdb.js';

const { Pool } = pg;
type Pool = pg.Pool;

/**
 * The test AppConfig. Not HTTPS (so the cookie omits Secure and the assertions
 * on cookie attributes hold), no frame-blocking, the governed cookie profile.
 */
export const TEST_CONFIG: AppConfig = {
  nodeEnv: 'test',
  host: '0.0.0.0',
  port: 3000,
  databaseUrlApp: '',
  sessionCookieProfile: 'governed',
  frameAncestors: null,
  logLevel: 'silent',
  originIsHttps: false,
  // AI environment in the deterministic fake posture (plan 05-01): the api
  // tier exercises no real provider, so no URL/key is needed.
  aiProviderUrl: 'fake:deterministic',
  aiApiKey: null,
  aiModelId: 'test-model',
  promptVersion: '2026.09.1',
  aiTimeoutMs: 20000,
  aiWorkerConcurrency: 2,
};

export interface ApiHarness {
  app: express.Express;
  db: TestDatabase;
  pool: Pool;
  clock: Clock & { advance(ms: number): void };
  /**
   * Sign in through the real endpoint and return the cookie a later request must
   * send, the CSRF token the SPA would hold, and the parsed body.
   */
  signIn(
    email: string,
    password: string,
  ): Promise<{ cookie: string; csrfToken: string; body: SessionDto }>;
}

/**
 * Extract the `cargoexec_sid=<value>` pair from a Set-Cookie header, as the
 * exact `name=value` string a later request sends in its `Cookie` header.
 */
export function extractSessionCookie(setCookie: string[] | undefined): string {
  const header = (setCookie ?? []).find((c) => c.startsWith('cargoexec_sid='));
  if (header === undefined) {
    throw new Error('extractSessionCookie: no cargoexec_sid Set-Cookie present');
  }
  const semi = header.indexOf(';');
  return semi === -1 ? header : header.slice(0, semi);
}

/**
 * Run `fn` with a fresh per-suite harness. Registers its own beforeAll/afterAll,
 * so a suite calls `withApi((h) => { it(...) })` inside a `describe`.
 */
export function withApi(fn: (h: ApiHarness) => void | Promise<void>): void {
  const clock = fixedClock(new Date('2026-01-01T09:00:00.000Z'));
  const harness = { clock } as ApiHarness;

  beforeAll(async () => {
    const db = await createTestDatabase();
    const pool = new Pool({ connectionString: db.appUrl });
    const app = createApp({
      config: { ...TEST_CONFIG, databaseUrlApp: db.appUrl },
      pool,
      clock,
      serveStatic: false,
    });
    harness.db = db;
    harness.pool = pool;
    harness.app = app;
    harness.signIn = async (email, password) => {
      const res = await supertest(app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email, password });
      if (res.status !== 201) {
        throw new Error(
          `harness.signIn: expected 201, got ${res.status}: ${JSON.stringify(res.body)}`,
        );
      }
      const cookie = extractSessionCookie(
        res.headers['set-cookie'] as unknown as string[] | undefined,
      );
      const body = res.body as SessionDto;
      return { cookie, csrfToken: body.csrf_token, body };
    };
  });

  afterAll(async () => {
    if (harness.pool !== undefined) {
      await harness.pool.end();
    }
    if (harness.db !== undefined) {
      await dropTestDatabase(harness.db);
    }
  });

  void fn(harness);
}
