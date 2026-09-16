// The F9 recommendation-polling-endpoint suite (TechArch §3.1 row 8; FRD F9
// FR-9.6 / FR-9.7 / FR-9.14). supertest against the harness app and a real
// migrated database.
//
// This is the PERMANENT regression asset for GET
// /api/exceptions/:exceptionId/recommendation — the endpoint the case-detail
// screen (plan 05-05) polls every 3s while a recommendation is PENDING
// (FR-10.7). It proves the three status shapes (PENDING / AVAILABLE /
// UNAVAILABLE), the read-only guarantee, the auth/identifier/query-parameter
// contract, that the API surface is GET-only (no regenerate/apply/trigger),
// and the response conventions.
//
// The route is GET-only, so NO CSRF token is needed for any request here.
//
// Cases are built directly against the database with the SAME fixtures
// 04-01/04-02 used (createGovernedCase / createPendingRecommendation), not
// through an authoring endpoint — an exception is DERIVED, never authored
// (F5 FR-5.1). The AVAILABLE/UNAVAILABLE transitions this suite drives are
// test-only direct mutations for READ-path testing: this plan does NOT depend
// on the generation job existing. Each transition is wrapped in a transaction
// that ALSO writes the matching RECOMMENDATION_GENERATED audit entry via
// append() — the deferred coupling trigger would reject a bare status change
// at COMMIT — so the fixture itself is a legitimately governed case, exactly
// like exceptions.spec.ts's closeCaseAsResolved positive control. Production
// code never writes these bare.

import { describe, it, expect, beforeAll } from 'vitest';
import { Client, type PoolClient } from 'pg';
import supertest from 'supertest';
import { withApi } from './helpers/appHarness.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import {
  createGovernedCase,
  createPendingRecommendation,
  type GovernedCase,
} from '../helpers/caseFixtures.js';
import { append } from '../../src/services/audit/writer.js';

const findingSet = (rule_id: string, message: string) => [
  { rule_id, field_name: 'goods_description' as const, failure_code: 'MISSING_REQUIRED', message },
];

/**
 * Transition a case's recommendation to AVAILABLE through a governed
 * transaction — the AVAILABLE-status UPDATE + one recommendation_values row +
 * the RECOMMENDATION_GENERATED audit entry, all committed together so the
 * coupling trigger is genuinely satisfied (not worked around). Mirrors
 * exceptions.spec.ts's closeCaseAsResolved positive-control pattern.
 */
async function makeAvailable(appUrl: string, gc: GovernedCase): Promise<void> {
  const c = new Client({ connectionString: appUrl });
  await c.connect();
  try {
    await c.query('BEGIN');
    const rec = await c.query<{ id: string }>(
      `UPDATE recommendations
          SET status = 'AVAILABLE', recommended_action = 'Add the goods description and re-file',
              rationale = 'The goods description is required for this mode of transport.',
              model_id = 'gpt-test-1', prompt_version = 'p-2026.09',
              generated_at = now(), latency_ms = 1200
        WHERE exception_id = $1
      RETURNING id`,
      [gc.exceptionId],
    );
    const recId = rec.rows[0]!.id;
    await c.query(
      `INSERT INTO recommendation_values
         (recommendation_id, field_name, proposed_value, addresses_rule_ids)
       VALUES ($1, 'goods_description', 'Assorted machine parts', ARRAY['RIV-010'])`,
      [recId],
    );
    await append(c as unknown as PoolClient, {
      case_id: gc.caseId,
      exception_id: gc.exceptionId,
      recommendation_id: recId,
      action_type: 'RECOMMENDATION_GENERATED',
      actor: { type: 'AI' },
      before_state: 'OPEN',
      after_state: 'AVAILABLE',
    });
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    await c.end();
  }
}

/**
 * Transition a case's recommendation to UNAVAILABLE through a governed
 * transaction — the UNAVAILABLE-status UPDATE + the RECOMMENDATION_GENERATED
 * audit entry, committed together so the coupling trigger is satisfied.
 */
async function makeUnavailable(appUrl: string, gc: GovernedCase): Promise<void> {
  const c = new Client({ connectionString: appUrl });
  await c.connect();
  try {
    await c.query('BEGIN');
    const rec = await c.query<{ id: string }>(
      `UPDATE recommendations
          SET status = 'UNAVAILABLE', failure_reason = 'PROVIDER_UNAVAILABLE', failed_at = now()
        WHERE exception_id = $1
      RETURNING id`,
      [gc.exceptionId],
    );
    const recId = rec.rows[0]!.id;
    await append(c as unknown as PoolClient, {
      case_id: gc.caseId,
      exception_id: gc.exceptionId,
      recommendation_id: recId,
      action_type: 'RECOMMENDATION_UNAVAILABLE',
      actor: { type: 'AI' },
      before_state: 'OPEN',
      after_state: 'UNAVAILABLE',
    });
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    await c.end();
  }
}

describe('GET /api/exceptions/:exceptionId/recommendation — the F9 polling read (FR-9.6/9.7/9.14)', () => {
  withApi((h) => {
    let cookie = '';

    beforeAll(async () => {
      const sp = await createTestSpecialist(h.db.appUrl, { display_name: 'Recommendation Reader' });
      const signedIn = await h.signIn(sp.email, TEST_PASSWORD);
      cookie = signedIn.cookie;
    });

    function get(exceptionId: string) {
      return supertest(h.app)
        .get('/api/exceptions/' + exceptionId + '/recommendation')
        .set('Cookie', cookie);
    }

    it('1. no cookie ⇒ 401 (guard.spec covers the full unauthenticated matrix)', async () => {
      const res = await supertest(h.app).get(
        '/api/exceptions/11111111-1111-4111-8111-111111111111/recommendation',
      );
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('2. a real open case with its DEFAULT PENDING recommendation ⇒ 200 { status: PENDING, requested_at } and no other key', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);

      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING');
      expect(typeof res.body.requested_at).toBe('string');
      // EXACTLY these two keys — no AVAILABLE/UNAVAILABLE fields leak.
      expect(Object.keys(res.body).sort()).toEqual(['requested_at', 'status']);
    });

    it('3. an AVAILABLE recommendation ⇒ 200 with the AVAILABLE shape and NO failure/pending keys', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('AVAILABLE');
      expect(res.body.recommended_action).toBe('Add the goods description and re-file');
      expect(res.body.rationale).toBe('The goods description is required for this mode of transport.');
      expect(res.body.model_id).toBe('gpt-test-1');
      expect(res.body.prompt_version).toBe('p-2026.09');
      expect(typeof res.body.generated_at).toBe('string');
      expect(res.body.proposed_values).toHaveLength(1);
      expect(res.body.proposed_values[0]).toEqual({
        field_name: 'goods_description',
        proposed_value: 'Assorted machine parts',
        origin: 'AI',
        addresses_rule_ids: ['RIV-010'],
      });
      // No failure or pending keys.
      expect(res.body.failure_reason).toBeUndefined();
      expect(res.body.failed_at).toBeUndefined();
      expect(res.body.requested_at).toBeUndefined();
    });

    it('4. an UNAVAILABLE recommendation ⇒ 200 with the UNAVAILABLE shape and NO available/pending keys', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-020', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeUnavailable(h.db.appUrl, gc);

      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UNAVAILABLE');
      expect(res.body.failure_reason).toBe('PROVIDER_UNAVAILABLE');
      expect(typeof res.body.failed_at).toBe('string');
      // No available or pending keys.
      expect(res.body.recommended_action).toBeUndefined();
      expect(res.body.rationale).toBeUndefined();
      expect(res.body.proposed_values).toBeUndefined();
      expect(res.body.model_id).toBeUndefined();
      expect(res.body.prompt_version).toBeUndefined();
      expect(res.body.requested_at).toBeUndefined();
    });

    it('5. a well-formed but unmatched uuid ⇒ 404 EXCEPTION_NOT_FOUND', async () => {
      const res = await get('99999999-9999-4999-8999-999999999999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXCEPTION_NOT_FOUND');
    });

    it('6. a malformed id ⇒ 400 INVALID_IDENTIFIER', async () => {
      const res = await get('not-a-uuid');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
    });

    it('7. any query string ⇒ 400 UNSUPPORTED_QUERY_PARAMETER, never a filtered response', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      const res = await supertest(h.app)
        .get('/api/exceptions/' + gc.exceptionId + '/recommendation?foo=1')
        .set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_QUERY_PARAMETER');
      expect(res.body.status).toBeUndefined();
      const fields = (res.body.error.details ?? []).map((d: { field?: string }) => d.field);
      expect(fields).toContain('foo');
    });

    it('8. POST / PUT / PATCH / DELETE on this path ⇒ never a mutation (405 / 404, never a success)', async () => {
      // The load-bearing guarantee is that no mutating method reaches the
      // recommendation. app.ts's apiNotFoundOr405 keys 405 on ROUTE PATTERNS
      // ('/api/exceptions/:exceptionId/recommendation') while the request
      // carries a CONCRETE path — so, exactly like the F7 detail route, a
      // wrong method on a parameterised path answers 404 not 405. Either way it
      // is a 4xx: no regenerate, no apply, no manual trigger exists (FR-9.6/
      // FR-9.14). Framework-wide, pre-exists this plan; logged in
      // deferred-items.md.
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      for (const method of ['post', 'put', 'patch', 'delete'] as const) {
        const res = await supertest(h.app)
          [method]('/api/exceptions/' + gc.exceptionId + '/recommendation')
          .set('Cookie', cookie);
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect([404, 405]).toContain(res.status);
      }
    });

    it('9. the response carries Cache-Control: no-store', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      const res = await get(gc.exceptionId);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('10. reading writes NO row and NO audit entry (acceptance: read-only)', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);

      const tables = [
        'cargo_entries',
        'cargo_entry_field_origins',
        'validation_results',
        'validation_findings',
        'exceptions',
        'recommendations',
        'recommendation_values',
        'decisions',
        'audit_entries',
        'audit_entry_values',
      ];
      async function counts(): Promise<Record<string, string>> {
        const out: Record<string, string> = {};
        for (const t of tables) {
          const r = await h.pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${t}`);
          out[t] = r.rows[0]!.count;
        }
        return out;
      }
      const before = await counts();
      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      const after = await counts();
      expect(after).toEqual(before);
    });
  });
});
