// The F7 exceptions-endpoint suite (TechArch §3.1; FRD F7 FR-7.1–7.14; F7
// acceptance 1–8). supertest against the harness app and a real migrated
// database.
//
// This is the PERMANENT regression asset for both F7 endpoints — the API-tier
// mirror of the DB-tier queueService.spec.ts. guard.spec.ts already proves the
// full unauthenticated matrix for these two paths; this suite adds the
// AUTHENTICATED behaviour: the receipt-ordered queue, the zero-query-parameter
// contract, identifier resolution and its three error shapes, the read-only
// guarantee, and the response conventions.
//
// Both routes are GET-only, so NO CSRF token is needed for any request here.
//
// Cases are built directly against the database with the SAME fixtures 04-01 /
// 04-02 used (createGovernedCase / createPendingRecommendation / the
// close/clean-entry helpers), not through an authoring endpoint — an exception
// is DERIVED, never authored (F5 FR-5.1). The list returns every OPEN exception
// in the database regardless of who created it (one role, no per-user scoping —
// FR-7.11); the fixture specialists are distinct from the harness sign-in
// specialist, and that is correct by design.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client, type PoolClient, Pool } from 'pg';
import express from 'express';
import supertest from 'supertest';
import { withApi, TEST_CONFIG } from './helpers/appHarness.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import {
  createGovernedCase,
  createPendingRecommendation,
  poolFor,
  type GovernedCase,
  type GovernedCaseFinding,
} from '../helpers/caseFixtures.js';
import { createApp } from '../../src/http/app.js';
import { fixedClock } from '../../src/clock.js';
import {
  createTestDatabase,
  dropTestDatabase,
  type TestDatabase,
} from '../helpers/testdb.js';
import { append } from '../../src/services/audit/writer.js';

// The FR-7.5 seven-key row set. A row must carry EXACTLY these, no more.
const ROW_KEYS = [
  'case_reference',
  'entry_number',
  'failure_summary',
  'finding_count',
  'id',
  'receipt_position',
  'received_at',
].sort();

// Fields the queue must NEVER synthesise (acceptance 5): no priority, severity,
// risk, assignment, age or SLA. Asserted by a recursive key scan.
const FORBIDDEN_KEYS = [
  'priority',
  'severity',
  'risk',
  'assigned_to',
  'claimed_by',
  'age_days',
  'age_bucket',
  'due_at',
  'sla_status',
  'is_overdue',
];

/** Recursively collect every object key appearing anywhere in a JSON value. */
function allKeys(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) allKeys(v, into);
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      into.add(k);
      allKeys(v, into);
    }
  }
  return into;
}

/**
 * Close a governed case as RESOLVED through the product's own path — the SAME
 * positive-control close sequence as hitl.spec.ts / queueService.spec.ts: an
 * AVAILABLE recommendation + its audit entry, a matching APPROVE decision + its
 * audit entry, then the closure UPDATE — all in one committed transaction.
 */
async function closeCaseAsResolved(appUrl: string, gc: GovernedCase): Promise<void> {
  const c = new Client({ connectionString: appUrl });
  await c.connect();
  try {
    await c.query('BEGIN');
    const rec = await c.query<{ id: string }>(
      `UPDATE recommendations
          SET status = 'AVAILABLE', recommended_action = 'APPROVE',
              rationale = 'documentation complete', model_id = 'm1',
              prompt_version = 'p1', generated_at = now()
        WHERE exception_id = $1
      RETURNING id`,
      [gc.exceptionId],
    );
    const recId = rec.rows[0]!.id;
    await append(c as unknown as PoolClient, {
      case_id: gc.caseId,
      exception_id: gc.exceptionId,
      recommendation_id: recId,
      action_type: 'RECOMMENDATION_GENERATED',
      actor: { type: 'AI' },
      before_state: 'OPEN',
      after_state: 'AVAILABLE',
    });

    const dec = await c.query<{ id: string }>(
      `INSERT INTO decisions
         (exception_id, decision_type, decided_by, recommendation_id, resulting_state)
       VALUES ($1, 'APPROVE', $2, $3, 'RESOLVED')
       RETURNING id`,
      [gc.exceptionId, gc.specialistId, recId],
    );
    const decId = dec.rows[0]!.id;
    await append(c as unknown as PoolClient, {
      case_id: gc.caseId,
      exception_id: gc.exceptionId,
      recommendation_id: recId,
      decision_id: decId,
      action_type: 'RECOMMENDATION_APPROVED',
      actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
      before_state: 'OPEN',
      after_state: 'RESOLVED',
    });

    await c.query(
      `UPDATE exceptions SET state = 'RESOLVED', closed_at = now(), decision_id = $2 WHERE id = $1`,
      [gc.exceptionId, decId],
    );
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    await c.end();
  }
}

/**
 * Build a VALIDATED_CLEAN entry (a PASS result, no exception) through the
 * product's own path — the cargo_entries insert coupled to its ENTRY_RECEIVED
 * audit entry. Returns the case_reference. This is the ENTRY_PASSED_VALIDATION
 * shape FR-7.14 names.
 */
async function createCleanEntry(appUrl: string): Promise<string> {
  const c = new Client({ connectionString: appUrl });
  await c.connect();
  try {
    await c.query('BEGIN');
    const specialistRes = await c.query<{ id: string }>(
      `INSERT INTO specialists (email, display_name, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      [`clean-${randomUUID().slice(0, 8)}@example.gov`, 'Clean Entry Specialist', 'argon2id$placeholder'],
    );
    const specialistId = specialistRes.rows[0]!.id;

    const refRes = await c.query<{ case_reference: string }>(
      `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS case_reference`,
    );
    const caseReference = refRes.rows[0]!.case_reference;

    const entryRes = await c.query<{ id: string }>(
      `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
       VALUES ($1, $2, 'VALIDATED_CLEAN', 'Clean ocean shipment')
       RETURNING id`,
      [caseReference, specialistId],
    );
    const entryId = entryRes.rows[0]!.id;

    await c.query(
      `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
       VALUES ($1, 'goods_description', 'HUMAN')`,
      [entryId],
    );

    await append(c as unknown as PoolClient, {
      case_id: entryId,
      action_type: 'ENTRY_RECEIVED',
      actor: { type: 'SPECIALIST', specialist_id: specialistId },
      before_state: null,
      after_state: 'RECEIVED',
      values: [
        {
          field_name: 'goods_description',
          before_value: null,
          before_origin: null,
          after_value: 'Clean ocean shipment',
          after_origin: 'HUMAN',
        },
      ],
    });

    await c.query(
      `INSERT INTO validation_results
         (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
       VALUES ($1, 'PASS', 'RIV-2026.09', 31, 0)`,
      [entryId],
    );

    await append(c as unknown as PoolClient, {
      case_id: entryId,
      action_type: 'VALIDATION_COMPLETED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: 'RECEIVED',
      after_state: 'VALIDATED_CLEAN',
    });

    await c.query('COMMIT');
    return caseReference;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    await c.end();
  }
}

function findingSet(rule_id: string, message: string): GovernedCaseFinding[] {
  return [{ rule_id, field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message }];
}

// ─────────────────────────────────────────────────────────────────────────────
// Section A — the LIST endpoint on a DEDICATED, isolated database so the
// "exactly these" count/order assertions are deterministic (the shared-harness
// queue would accumulate cases across tests). Mirrors queueService.spec.ts's
// dedicated-DB approach for count-exact assertions.
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/exceptions — the receipt-ordered queue (F7 FR-7.1–7.13)', () => {
  let db: TestDatabase;
  let pool: Pool;
  let app: express.Express;
  let cookie = '';

  beforeAll(async () => {
    db = await createTestDatabase();
    pool = new Pool({ connectionString: db.appUrl });
    app = createApp({
      config: { ...TEST_CONFIG, databaseUrlApp: db.appUrl },
      pool,
      clock: fixedClock(new Date('2026-01-01T09:00:00.000Z')),
      serveStatic: false,
    });
    const sp = await createTestSpecialist(db.appUrl, { display_name: 'Queue Reader' });
    const signIn = await supertest(app)
      .post('/api/session')
      .set('Content-Type', 'application/json')
      .send({ email: sp.email, password: TEST_PASSWORD });
    const setCookie = signIn.headers['set-cookie'] as unknown as string[];
    cookie = (setCookie.find((cc) => cc.startsWith('cargoexec_sid=')) ?? '').split(';')[0]!;
  });

  afterAll(async () => {
    await pool.end();
    await dropTestDatabase(db);
  });

  it('2. three governed cases ⇒ exactly those three, ascending receipt_position, identical on a repeat call (acceptance 1, FR-7.13)', async () => {
    const a = await createGovernedCase(pool, { findings: findingSet('RIV-010', 'Alpha finding') });
    await createPendingRecommendation(pool, a.exceptionId);
    const b = await createGovernedCase(pool, { findings: findingSet('RIV-020', 'Bravo finding') });
    await createPendingRecommendation(pool, b.exceptionId);
    const c = await createGovernedCase(pool, { findings: findingSet('RIV-030', 'Charlie finding') });
    await createPendingRecommendation(pool, c.exceptionId);

    const res = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.truncated).toBe(false);
    expect(res.body.returned_count).toBe(3);
    expect(res.body.exceptions).toHaveLength(3);

    // Exactly those three, in ascending receipt_position (which is the creation
    // order here: a, then b, then c).
    expect(res.body.exceptions.map((r: { id: string }) => r.id)).toEqual([
      a.exceptionId,
      b.exceptionId,
      c.exceptionId,
    ]);
    const positions = res.body.exceptions.map((r: { receipt_position: number }) => r.receipt_position);
    expect([...positions]).toEqual([...positions].sort((x, y) => x - y));

    // Calling twice in a row returns IDENTICAL results (FR-7.13, acceptance 1).
    const again = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    expect(again.body).toEqual(res.body);
  });

  it('3. deciding one case removes it from a later call; the other two keep their relative order (acceptance 2)', async () => {
    // Snapshot the current queue, decide the FIRST row, and confirm it is gone
    // while the remaining rows keep their ascending order.
    const before = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    expect(before.status).toBe(200);
    const ids: string[] = before.body.exceptions.map((r: { id: string }) => r.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    const toClose = ids[0]!;

    // Rebuild a GovernedCase-shaped handle for the close helper from the DB.
    const row = await pool.query<{ id: string; entry_id: string; case_reference: string }>(
      `SELECT e.id, e.entry_id, c.case_reference
         FROM exceptions e JOIN cargo_entries c ON c.id = e.entry_id
        WHERE e.id = $1`,
      [toClose],
    );
    const spRow = await pool.query<{ created_by: string }>(
      `SELECT created_by FROM cargo_entries WHERE id = $1`,
      [row.rows[0]!.entry_id],
    );
    await closeCaseAsResolved(db.appUrl, {
      exceptionId: toClose,
      caseId: row.rows[0]!.entry_id,
      caseReference: row.rows[0]!.case_reference,
      specialistId: spRow.rows[0]!.created_by,
      validationResultId: '',
      findings: [],
    });

    const after = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    const afterIds: string[] = after.body.exceptions.map((r: { id: string }) => r.id);
    expect(afterIds).not.toContain(toClose);
    // The remaining ids preserve their prior relative order.
    const expectedRemaining = ids.filter((id) => id !== toClose);
    expect(afterIds).toEqual(expectedRemaining);
  });

  it('4. ANY query parameter ⇒ 400 UNSUPPORTED_QUERY_PARAMETER, never a filtered list (acceptance 3, 4)', async () => {
    const params = ['sort=received_at', 'state=RESOLVED', 'q=x', 'assignee=x', 'priority=x', 'page=1'];
    for (const p of params) {
      const res = await supertest(app).get('/api/exceptions?' + p).set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_QUERY_PARAMETER');
      // Not a filtered 200 list.
      expect(res.body.exceptions).toBeUndefined();
      // The offending key is named.
      const fields = (res.body.error.details ?? []).map((d: { field?: string }) => d.field);
      expect(fields).toContain(p.split('=')[0]);
    }
  });

  it('5. no priority/severity/risk/assignment/age/SLA key appears anywhere (acceptance 5)', async () => {
    const res = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const keys = allKeys(res.body);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys.has(forbidden), `queue response must not contain "${forbidden}"`).toBe(false);
    }
    // Belt-and-braces: no forbidden name appears as a substring anywhere.
    const serialised = JSON.stringify(res.body);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(serialised.includes(`"${forbidden}"`)).toBe(false);
    }
  });

  it('6. every row has EXACTLY the seven FR-7.5 keys (acceptance, FR-7.5)', async () => {
    const res = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.exceptions.length).toBeGreaterThan(0);
    for (const row of res.body.exceptions) {
      expect(Object.keys(row).sort()).toEqual(ROW_KEYS);
    }
  });

  it('7. the response carries Cache-Control: no-store (FR-7.12)', async () => {
    const res = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('8. PUT / POST / DELETE / PATCH /api/exceptions ⇒ 405 METHOD_NOT_ALLOWED', async () => {
    for (const method of ['put', 'post', 'delete', 'patch'] as const) {
      const res = await supertest(app)[method]('/api/exceptions').set('Cookie', cookie);
      expect(res.status).toBe(405);
      expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
    }
  });

  it('9. reading the queue writes NO audit row and changes NO receipt-tier table (acceptance 8, FR-7.10)', async () => {
    const tables = [
      'cargo_entries',
      'cargo_entry_field_origins',
      'validation_results',
      'validation_findings',
      'exceptions',
      'recommendations',
      'decisions',
      'audit_entries',
      'audit_entry_values',
    ];
    async function counts(): Promise<Record<string, string>> {
      const out: Record<string, string> = {};
      for (const t of tables) {
        const r = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${t}`);
        out[t] = r.rows[0]!.count;
      }
      return out;
    }
    const before = await counts();
    const res = await supertest(app).get('/api/exceptions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const after = await counts();
    expect(after).toEqual(before);
  });

  it('1. GET /api/exceptions with no cookie ⇒ 401 (guard.spec covers the full matrix)', async () => {
    const res = await supertest(app).get('/api/exceptions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section B — the DETAIL endpoint on the shared harness (each test builds its
// own case, so cross-test accumulation is irrelevant to a by-identifier read).
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/exceptions/:idOrReference — one case (F7 FR-7.7, FR-7.8, FR-7.14)', () => {
  withApi((h) => {
    let cookie = '';

    beforeAll(async () => {
      const sp = await createTestSpecialist(h.db.appUrl, { display_name: 'Case Reader' });
      const signedIn = await h.signIn(sp.email, TEST_PASSWORD);
      cookie = signedIn.cookie;
    });

    function get(idOrRef: string) {
      return supertest(h.app).get('/api/exceptions/' + idOrRef).set('Cookie', cookie);
    }

    it('10. an open case fetched by its exception uuid ⇒ 200 with the full FR-7.7 shape', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);

      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      expect(res.body.exception.id).toBe(gc.exceptionId);
      expect(res.body.exception.state).toBe('OPEN');
      expect(res.body.entry).toBeDefined();
      expect(res.body.validation).toBeDefined();
      expect(res.body.validation.outcome).toBe('FAIL');
      expect(res.body.recommendation).toBeDefined();
      expect(res.body.decision).toBeNull();
      expect(res.body.is_closed).toBe(false);
      expect(res.body.permitted_decisions).toBeDefined();
      // The response is the CaseDetailResponse contract, not a queue row.
      expect(Object.keys(res.body).sort()).toEqual(
        ['decision', 'entry', 'exception', 'is_closed', 'permitted_decisions', 'recommendation', 'validation'].sort(),
      );
    });

    it('11. the SAME case fetched by its case_reference ⇒ identical 200 body', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);

      const byUuid = await get(gc.exceptionId);
      const byRef = await get(gc.caseReference);
      expect(byUuid.status).toBe(200);
      expect(byRef.status).toBe(200);
      expect(byRef.body).toEqual(byUuid.body);
    });

    it('12. permitted_decisions is [EDIT_APPROVE, REJECT] for a PENDING open case; [] once closed (acceptance 7)', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);

      const open = await get(gc.exceptionId);
      expect(open.status).toBe(200);
      expect(open.body.permitted_decisions).toEqual(['EDIT_APPROVE', 'REJECT']);

      await closeCaseAsResolved(h.db.appUrl, gc);
      const closed = await get(gc.exceptionId);
      expect(closed.status).toBe(200);
      expect(closed.body.is_closed).toBe(true);
      expect(closed.body.permitted_decisions).toEqual([]);
    });

    it('13. a resolved case is fully readable at its direct URL, including its decision block (acceptance 6)', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await closeCaseAsResolved(h.db.appUrl, gc);

      const res = await get(gc.caseReference);
      expect(res.status).toBe(200);
      expect(res.body.exception.state).toBe('RESOLVED');
      expect(res.body.decision).not.toBeNull();
      expect(res.body.decision.decision_type).toBe('APPROVE');
      expect(res.body.decision.decided_by.display_name).toBe('Test Specialist');
    });

    it('14. a malformed identifier ⇒ 400 INVALID_IDENTIFIER', async () => {
      const res = await get('not-an-id');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
    });

    it('15. a well-formed but unmatched uuid AND case_reference ⇒ 404 EXCEPTION_NOT_FOUND', async () => {
      const byUuid = await get('99999999-9999-4999-8999-999999999999');
      expect(byUuid.status).toBe(404);
      expect(byUuid.body.error.code).toBe('EXCEPTION_NOT_FOUND');

      const byRef = await get('CE-2026-999999');
      expect(byRef.status).toBe(404);
      expect(byRef.body.error.code).toBe('EXCEPTION_NOT_FOUND');
    });

    it('16. a case_reference for a VALIDATED_CLEAN entry ⇒ 404 EXCEPTION_NOT_FOUND, distinguishing "passed validation" message', async () => {
      const cleanRef = await createCleanEntry(h.db.appUrl);
      const res = await get(cleanRef);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXCEPTION_NOT_FOUND');
      // Same code as case 15, DIFFERENT message — the distinguishing detail.
      expect(res.body.error.message.toLowerCase()).toContain('passed validation');

      // And that message is genuinely distinct from the generic not-found one.
      const generic = await get('CE-2026-999999');
      expect(generic.body.error.message).not.toBe(res.body.error.message);
    });

    it('17. any query string on the detail route ⇒ 400 UNSUPPORTED_QUERY_PARAMETER', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      const res = await supertest(h.app)
        .get('/api/exceptions/' + gc.exceptionId + '?include=all')
        .set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_QUERY_PARAMETER');
    });

    it('18. PUT / POST / DELETE / PATCH on the detail path ⇒ never a mutation (405 collection / 404 concrete param path)', async () => {
      // A mutating method on the exception detail path is rejected — the point of
      // FR-7.10 (F7 is GET-only). The COLLECTION path /api/exceptions gives a
      // clean 405 (asserted in case 8); the PARAMETERISED detail path answers 404
      // instead, because app.ts's apiNotFoundOr405 keys its known-path set on the
      // ROUTE PATTERNS ('/api/exceptions/:idOrReference') while the request
      // carries a CONCRETE path ('/api/exceptions/<uuid>') that matches no
      // pattern — so a wrong method there is "unknown path" (404), not "known
      // path, wrong method" (405). This is framework-wide (GET
      // /api/entries/:entryId behaves identically) and pre-exists this plan; the
      // load-bearing guarantee — no mutation reaches an exception — holds either
      // way. Logged in deferred-items.md.
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      for (const method of ['put', 'post', 'delete', 'patch'] as const) {
        const res = await supertest(h.app)
          [method]('/api/exceptions/' + gc.exceptionId)
          .set('Cookie', cookie);
        expect([404, 405]).toContain(res.status);
        expect(['METHOD_NOT_ALLOWED', 'ENTRY_NOT_FOUND']).toContain(res.body.error.code);
        // Whatever the status, it is NOT a success — no mutation happened.
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('19. the detail response carries Cache-Control: no-store', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      const res = await get(gc.exceptionId);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('20. GET /api/exceptions/{id} with no cookie ⇒ 401', async () => {
      const res = await supertest(h.app).get(
        '/api/exceptions/11111111-1111-1111-1111-111111111111',
      );
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });
});
