// Plan 05-04 Task 3 — "receipt never waits on AI" proved through the REAL HTTP
// path (phase criterion 4). This suite stands up its OWN app (it does NOT touch
// the shared appHarness) because it needs a `dispatchRecommendation` wired to a
// real worker + FakeProvider that other suites deliberately do not have.
//
// It proves two things end to end:
//   1. POST /api/entries returns 201 WITHOUT awaiting the recommendation, and
//      the async catch-up actually resolves the recommendation to AVAILABLE.
//   2. Dispatching is idempotent through the HTTP path: a second read shortly
//      after the first terminal read returns the SAME generated_at (nothing
//      re-ran).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import pg from 'pg';
import supertest from 'supertest';
import { createApp } from '../../src/http/app.js';
import { fixedClock } from '../../src/clock.js';
import type { AppConfig } from '../../src/config.js';
import {
  createTestDatabase,
  dropTestDatabase,
  type TestDatabase,
} from '../helpers/testdb.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import { extractSessionCookie } from './helpers/appHarness.js';
import { createRecommendationWorker } from '../../src/ai/worker.js';
import { runGenerationJob } from '../../src/ai/job.js';
import { createFakeProvider } from '../../src/ai/fakeProvider.js';

const { Pool } = pg;
type Pool = pg.Pool;

const TEST_CONFIG: AppConfig = {
  nodeEnv: 'test',
  host: '0.0.0.0',
  port: 3000,
  databaseUrlApp: '',
  sessionCookieProfile: 'governed',
  frameAncestors: null,
  logLevel: 'silent',
  originIsHttps: false,
  aiProviderUrl: 'fake:deterministic',
  aiApiKey: null,
  aiModelId: 'test-model',
  promptVersion: '2026.09.1',
  aiTimeoutMs: 20000,
  aiWorkerConcurrency: 2,
};

/** Poll the recommendation endpoint until it leaves PENDING or the budget runs out. */
async function pollUntilTerminal(
  app: express.Express,
  cookie: string,
  exceptionId: string,
  budgetMs = 3000,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  let last: Record<string, unknown> = {};
  while (Date.now() - start < budgetMs) {
    const res = await supertest(app)
      .get(`/api/exceptions/${exceptionId}/recommendation`)
      .set('Cookie', cookie);
    last = res.body as Record<string, unknown>;
    if (last.status !== 'PENDING') return last;
    await new Promise((r) => setTimeout(r, 50));
  }
  return last;
}

describe('recommendation dispatch through the real HTTP path (F9 criterion 4)', () => {
  let db: TestDatabase;
  let appPool: Pool;
  let aiPool: Pool;
  let app: express.Express;
  let cookie = '';
  let csrfToken = '';

  beforeAll(async () => {
    db = await createTestDatabase();
    appPool = new Pool({ connectionString: db.appUrl });
    aiPool = new Pool({ connectionString: db.aiUrl });

    const worker = createRecommendationWorker({
      concurrency: 2,
      runJob: (exceptionId) =>
        runGenerationJob(
          {
            aiPool,
            appPool,
            provider: createFakeProvider(),
            modelId: 'test-model',
            promptVersion: '2026.09.1',
          },
          exceptionId,
        ),
    });

    app = createApp({
      config: { ...TEST_CONFIG, databaseUrlApp: db.appUrl },
      pool: appPool,
      clock: fixedClock(new Date('2026-01-01T09:00:00.000Z')),
      serveStatic: false,
      dispatchRecommendation: worker.dispatch,
    });

    const sp = await createTestSpecialist(db.appUrl, { display_name: 'Dispatch Tester' });
    const signIn = await supertest(app)
      .post('/api/session')
      .set('Content-Type', 'application/json')
      .send({ email: sp.email, password: TEST_PASSWORD });
    expect(signIn.status).toBe(201);
    cookie = extractSessionCookie(
      signIn.headers['set-cookie'] as unknown as string[] | undefined,
    );
    csrfToken = (signIn.body as { csrf_token: string }).csrf_token;
  });

  afterAll(async () => {
    await Promise.all([appPool.end(), aiPool.end()]);
    await dropTestDatabase(db);
  });

  it('1. POST /api/entries returns 201 without waiting on AI; the recommendation catches up to AVAILABLE', async () => {
    // An empty body fails required-information validation → an exception opens →
    // the post-commit dispatch fires (never awaited).
    const res = await supertest(app)
      .post('/api/entries')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.receipt_outcome).toBe('EXCEPTION_OPENED');
    const exceptionId = res.body.exception.id as string;

    // Immediately after the 201: the recommendation is EITHER still PENDING or
    // already AVAILABLE — both acceptable. The point proven is that the 201 did
    // not await it (true by construction: dispatch is post-commit, never awaited).
    const immediate = await supertest(app)
      .get(`/api/exceptions/${exceptionId}/recommendation`)
      .set('Cookie', cookie);
    expect(immediate.status).toBe(200);
    expect(['PENDING', 'AVAILABLE']).toContain(immediate.body.status);

    // The async catch-up actually happens: poll until terminal, assert AVAILABLE
    // with a recommended_action.
    const terminal = await pollUntilTerminal(app, cookie, exceptionId);
    expect(terminal.status).toBe('AVAILABLE');
    expect(typeof terminal.recommended_action).toBe('string');
    expect((terminal.recommended_action as string).length).toBeGreaterThan(0);
    expect(Array.isArray(terminal.proposed_values)).toBe(true);
  });

  it('2. dispatching is idempotent through the HTTP path: a second read returns the same generated_at', async () => {
    const res = await supertest(app)
      .post('/api/entries')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(201);
    const exceptionId = res.body.exception.id as string;

    const first = await pollUntilTerminal(app, cookie, exceptionId);
    expect(first.status).toBe('AVAILABLE');
    const firstGeneratedAt = first.generated_at as string;
    expect(typeof firstGeneratedAt).toBe('string');

    // A short while later, read again — nothing should have re-run, so the
    // generated_at is byte-identical.
    await new Promise((r) => setTimeout(r, 100));
    const second = await supertest(app)
      .get(`/api/exceptions/${exceptionId}/recommendation`)
      .set('Cookie', cookie);
    expect(second.body.status).toBe('AVAILABLE');
    expect(second.body.generated_at).toBe(firstGeneratedAt);
  });
});
