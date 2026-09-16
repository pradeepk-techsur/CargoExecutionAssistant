// The PERMANENT F11 regression suite (TechArch §3.1 row 9; FRD F11
// FR-11.1–FR-11.21). supertest against the harness app and a real migrated
// database.
//
// POST /api/exceptions/:exceptionId/decision is the ONLY code path in the
// product permitted to write a decision or close an exception. This suite is
// the executable form of every F11 acceptance criterion: the three decision
// types, per-value provenance (trim-then-byte-compare), the one-decision-ever
// guarantee under concurrency, the mandatory-reason rule, degraded-mode
// completability (direct resolution), idempotency, the strict body contract,
// and the entry-of-record / findings immutability after a decision.
//
// Cases are built directly against the database with the SAME governed fixtures
// (createGovernedCase / createPendingRecommendation) the F7/F9 suites use — an
// exception is DERIVED, never authored (F5 FR-5.1). `makeAvailable` moves a
// case's recommendation to AVAILABLE through a governed transaction (the
// AVAILABLE UPDATE + proposed values + the RECOMMENDATION_GENERATED audit entry
// committed together), mirroring recommendation.spec.ts — the deferred coupling
// trigger would reject a bare status change at COMMIT.

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

/** The three proposed values a "3-field" AVAILABLE recommendation carries. */
const THREE_PROPOSED: { field_name: string; proposed_value: string; rule_id: string }[] = [
  { field_name: 'goods_description', proposed_value: 'Assorted machine parts', rule_id: 'RIV-010' },
  { field_name: 'country_of_origin_code', proposed_value: 'CN', rule_id: 'RIV-040' },
  { field_name: 'quantity_uom', proposed_value: 'KG', rule_id: 'RIV-050' },
];

/**
 * Transition a case's recommendation to AVAILABLE with N proposed values through
 * a governed transaction. Mirrors recommendation.spec.ts::makeAvailable.
 */
async function makeAvailable(
  appUrl: string,
  gc: GovernedCase,
  proposed: { field_name: string; proposed_value: string; rule_id: string }[] = THREE_PROPOSED,
): Promise<void> {
  const c = new Client({ connectionString: appUrl });
  await c.connect();
  try {
    await c.query('BEGIN');
    const rec = await c.query<{ id: string }>(
      `UPDATE recommendations
          SET status = 'AVAILABLE', recommended_action = 'Complete the required fields and re-file',
              rationale = 'These fields are required for this mode of transport.',
              model_id = 'gpt-test-1', prompt_version = 'p-2026.09',
              generated_at = now(), latency_ms = 1200
        WHERE exception_id = $1
      RETURNING id`,
      [gc.exceptionId],
    );
    const recId = rec.rows[0]!.id;
    for (const p of proposed) {
      await c.query(
        `INSERT INTO recommendation_values
           (recommendation_id, field_name, proposed_value, addresses_rule_ids)
         VALUES ($1, $2, $3, ARRAY[$4])`,
        [recId, p.field_name, p.proposed_value, p.rule_id],
      );
    }
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

describe('POST /api/exceptions/:exceptionId/decision — the F11 decision write (FR-11.1–FR-11.21)', () => {
  withApi((h) => {
    let cookie = '';
    let csrfToken = '';

    beforeAll(async () => {
      const sp = await createTestSpecialist(h.db.appUrl, { display_name: 'Dana Decider' });
      const signedIn = await h.signIn(sp.email, TEST_PASSWORD);
      cookie = signedIn.cookie;
      csrfToken = signedIn.csrfToken;
    });

    function post(exceptionId: string, body: unknown, opts: { key?: string; csrf?: boolean } = {}) {
      let req = supertest(h.app)
        .post('/api/exceptions/' + exceptionId + '/decision')
        .set('Cookie', cookie)
        .set('Content-Type', 'application/json');
      if (opts.csrf !== false) {
        req = req.set('X-CSRF-Token', csrfToken);
      }
      if (opts.key !== undefined) {
        req = req.set('Idempotency-Key', opts.key);
      }
      return req.send(body as object);
    }

    /** Count rows in a table (whole database — tests use isolated fixtures per case). */
    async function countFor(exceptionId: string, table: 'decisions' | 'audit_entries'): Promise<number> {
      if (table === 'decisions') {
        const r = await h.pool.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM decisions WHERE exception_id = $1`,
          [exceptionId],
        );
        return Number(r.rows[0]!.n);
      }
      // audit_entries: count entries whose decision references this exception.
      const r = await h.pool.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM audit_entries a
           JOIN decisions d ON d.id = a.decision_id
          WHERE d.exception_id = $1`,
        [exceptionId],
      );
      return Number(r.rows[0]!.n);
    }

    // 1 ───────────────────────────────────────────────────────────────────────
    it('1. no cookie ⇒ 401 (guard.spec owns the full unauthenticated matrix)', async () => {
      const res = await supertest(h.app)
        .post('/api/exceptions/11111111-1111-4111-8111-111111111111/decision')
        .set('Content-Type', 'application/json')
        .send({ decision_type: 'REJECT', reason: 'no cookie present here' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    // 2 ───────────────────────────────────────────────────────────────────────
    it('2. missing / invalid CSRF token ⇒ 403 CSRF_INVALID', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);

      const noToken = await post(gc.exceptionId, { decision_type: 'REJECT', reason: 'rejecting without csrf token' }, { csrf: false });
      expect(noToken.status).toBe(403);
      expect(noToken.body.error.code).toBe('CSRF_INVALID');

      const badToken = await supertest(h.app)
        .post('/api/exceptions/' + gc.exceptionId + '/decision')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'not-the-real-token')
        .set('Content-Type', 'application/json')
        .send({ decision_type: 'REJECT', reason: 'rejecting with a bad token' });
      expect(badToken.status).toBe(403);
      expect(badToken.body.error.code).toBe('CSRF_INVALID');
    });

    // 3 ───────────────────────────────────────────────────────────────────────
    it('3. APPROVE on an AVAILABLE recommendation ⇒ 201, every value origin AI, one RECOMMENDATION_APPROVED entry, RESOLVED', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const res = await post(gc.exceptionId, { decision_type: 'APPROVE' });
      expect(res.status).toBe(201);
      expect(res.body.decision.decision_type).toBe('APPROVE');
      expect(res.body.exception.state).toBe('RESOLVED');
      expect(typeof res.body.exception.closed_at).toBe('string');
      expect(res.body.idempotent_replay).toBe(false);
      expect(res.body.resolution_values).toHaveLength(3);
      for (const v of res.body.resolution_values) {
        expect(v.origin).toBe('AI');
        expect(v.changed_from_proposal).toBe(false);
      }

      // Exactly one RECOMMENDATION_APPROVED audit entry for this case.
      const audit = await h.pool.query<{ action_type: string }>(
        `SELECT a.action_type FROM audit_entries a
           JOIN decisions d ON d.id = a.decision_id
          WHERE d.exception_id = $1`,
        [gc.exceptionId],
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0]!.action_type).toBe('RECOMMENDATION_APPROVED');

      // The audit entry id is real and present on the response.
      expect(typeof res.body.audit_entry_id).toBe('string');
      const av = await h.pool.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM audit_entry_values WHERE audit_entry_id = $1`,
        [res.body.audit_entry_id],
      );
      expect(Number(av.rows[0]!.n)).toBe(3); // one value row per resolution value

      // exceptions row is terminal.
      const ex = await h.pool.query<{ state: string; decision_id: string | null }>(
        `SELECT state, decision_id FROM exceptions WHERE id = $1`,
        [gc.exceptionId],
      );
      expect(ex.rows[0]!.state).toBe('RESOLVED');
      expect(ex.rows[0]!.decision_id).toBe(res.body.decision.id);
    });

    // 4 ───────────────────────────────────────────────────────────────────────
    it('4. EDIT_APPROVE changing 1 of 3 proposed values ⇒ that field HUMAN, other two AI; prior_value populated on all three', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const res = await post(gc.exceptionId, {
        decision_type: 'EDIT_APPROVE',
        reason: 'Corrected the goods description to match the manifest.',
        resolution_values: [
          { field_name: 'goods_description', value: 'Industrial ball bearings' }, // CHANGED
          { field_name: 'country_of_origin_code', value: 'CN' }, // unchanged
          { field_name: 'quantity_uom', value: 'KG' }, // unchanged
        ],
      });
      expect(res.status).toBe(201);
      expect(res.body.exception.state).toBe('RESOLVED');

      const byField: Record<string, { origin: string; changed_from_proposal: boolean; prior_value: string | null; prior_origin: string | null }> = {};
      for (const v of res.body.resolution_values) {
        byField[v.field_name] = v;
      }
      expect(byField['goods_description']!.origin).toBe('HUMAN');
      expect(byField['goods_description']!.changed_from_proposal).toBe(true);
      expect(byField['country_of_origin_code']!.origin).toBe('AI');
      expect(byField['country_of_origin_code']!.changed_from_proposal).toBe(false);
      expect(byField['quantity_uom']!.origin).toBe('AI');
      expect(byField['quantity_uom']!.changed_from_proposal).toBe(false);
      // prior_value populated (= the proposal) on all three; prior_origin AI.
      for (const f of ['goods_description', 'country_of_origin_code', 'quantity_uom']) {
        expect(byField[f]!.prior_value).not.toBeNull();
        expect(byField[f]!.prior_origin).toBe('AI');
      }

      // Response shape matches DecisionRecordResponse exactly (top-level keys).
      expect(Object.keys(res.body).sort()).toEqual(
        ['audit_entry_id', 'decision', 'exception', 'idempotent_replay', 'resolution_values'].sort(),
      );

      const audit = await h.pool.query<{ action_type: string }>(
        `SELECT a.action_type FROM audit_entries a JOIN decisions d ON d.id = a.decision_id WHERE d.exception_id = $1`,
        [gc.exceptionId],
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0]!.action_type).toBe('RECOMMENDATION_EDITED_AND_APPROVED');
    });

    // 5 ───────────────────────────────────────────────────────────────────────
    describe('5. EDIT_APPROVE / REJECT with a missing/blank/short reason ⇒ 422 REASON_REQUIRED, case stays OPEN, no audit entry', () => {
      const badReasons: { label: string; reason?: string }[] = [
        { label: 'empty string', reason: '' },
        { label: 'whitespace only', reason: '   ' },
        { label: 'too short', reason: 'ok' },
        { label: 'absent', reason: undefined },
      ];
      for (const decision_type of ['EDIT_APPROVE', 'REJECT'] as const) {
        for (const { label, reason } of badReasons) {
          it(`${decision_type} + reason ${label}`, async () => {
            const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
            await createPendingRecommendation(h.pool, gc.exceptionId);
            await makeAvailable(h.db.appUrl, gc);

            const body: Record<string, unknown> = { decision_type };
            if (reason !== undefined) body['reason'] = reason;
            if (decision_type === 'EDIT_APPROVE') {
              body['resolution_values'] = [
                { field_name: 'goods_description', value: 'Assorted machine parts' },
                { field_name: 'country_of_origin_code', value: 'CN' },
                { field_name: 'quantity_uom', value: 'KG' },
              ];
            }
            const res = await post(gc.exceptionId, body);
            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('REASON_REQUIRED');

            // Case stays OPEN; zero decisions; zero audit entries for this case.
            const ex = await h.pool.query<{ state: string }>(`SELECT state FROM exceptions WHERE id = $1`, [gc.exceptionId]);
            expect(ex.rows[0]!.state).toBe('OPEN');
            expect(await countFor(gc.exceptionId, 'decisions')).toBe(0);
            expect(await countFor(gc.exceptionId, 'audit_entries')).toBe(0);
          });
        }
      }
    });

    // 6 ───────────────────────────────────────────────────────────────────────
    it('6. two concurrent POSTs on the same open case ⇒ exactly one 201 and one 409; DB has one decision + one audit entry', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const [a, b] = await Promise.all([
        post(gc.exceptionId, { decision_type: 'APPROVE' }),
        post(gc.exceptionId, { decision_type: 'APPROVE' }),
      ]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 409]);
      const conflict = a.status === 409 ? a : b;
      expect(conflict.body.error.code).toBe('EXCEPTION_ALREADY_DECIDED');

      expect(await countFor(gc.exceptionId, 'decisions')).toBe(1);
      expect(await countFor(gc.exceptionId, 'audit_entries')).toBe(1);
    });

    // 7 ───────────────────────────────────────────────────────────────────────
    it('7. APPROVE on a PENDING case ⇒ 409 RECOMMENDATION_NOT_AVAILABLE; then EDIT_APPROVE (direct) ⇒ 201, all HUMAN, resolves (SM-13)', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);

      const approve = await post(gc.exceptionId, { decision_type: 'APPROVE' });
      expect(approve.status).toBe(409);
      expect(approve.body.error.code).toBe('RECOMMENDATION_NOT_AVAILABLE');
      // Still OPEN — nothing written.
      const stillOpen = await h.pool.query<{ state: string }>(`SELECT state FROM exceptions WHERE id = $1`, [gc.exceptionId]);
      expect(stillOpen.rows[0]!.state).toBe('OPEN');

      const edit = await post(gc.exceptionId, {
        decision_type: 'EDIT_APPROVE',
        reason: 'Resolving directly; no AI recommendation is available for this case.',
        resolution_values: [
          { field_name: 'goods_description', value: 'Assorted machine parts' },
          { field_name: 'country_of_origin_code', value: 'CN' },
        ],
      });
      expect(edit.status).toBe(201);
      expect(edit.body.exception.state).toBe('RESOLVED');
      for (const v of edit.body.resolution_values) {
        expect(v.origin).toBe('HUMAN');
        expect(v.changed_from_proposal).toBe(true);
      }
    });

    // 8 ───────────────────────────────────────────────────────────────────────
    it('8. a body naming origin / decided_by / applied ⇒ 422 REQUEST_MALFORMED', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const withActor = await post(gc.exceptionId, {
        decision_type: 'APPROVE',
        decided_by: '00000000-0000-4000-8000-000000000000',
      });
      expect(withActor.status).toBe(422);
      expect(withActor.body.error.code).toBe('REQUEST_MALFORMED');

      const withApplied = await post(gc.exceptionId, { decision_type: 'APPROVE', applied: true });
      expect(withApplied.status).toBe(422);
      expect(withApplied.body.error.code).toBe('REQUEST_MALFORMED');

      const withOrigin = await post(gc.exceptionId, {
        decision_type: 'EDIT_APPROVE',
        reason: 'trying to smuggle an origin field into a resolution value',
        resolution_values: [{ field_name: 'goods_description', value: 'x', origin: 'AI' }],
      });
      expect(withOrigin.status).toBe(422);
      expect(withOrigin.body.error.code).toBe('REQUEST_MALFORMED');
    });

    // 9 ───────────────────────────────────────────────────────────────────────
    it('9. after a decision, cargo_entries and validation_findings for that case are byte-identical to before', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const entryBefore = await h.pool.query(`SELECT * FROM cargo_entries WHERE id = $1`, [gc.caseId]);
      const findingsBefore = await h.pool.query(
        `SELECT * FROM validation_findings WHERE validation_result_id = $1 ORDER BY id`,
        [gc.validationResultId],
      );

      const res = await post(gc.exceptionId, {
        decision_type: 'EDIT_APPROVE',
        reason: 'Corrected description; the entry of record must be untouched.',
        resolution_values: [
          { field_name: 'goods_description', value: 'A completely different description' },
          { field_name: 'country_of_origin_code', value: 'US' },
          { field_name: 'quantity_uom', value: 'LB' },
        ],
      });
      expect(res.status).toBe(201);

      const entryAfter = await h.pool.query(`SELECT * FROM cargo_entries WHERE id = $1`, [gc.caseId]);
      const findingsAfter = await h.pool.query(
        `SELECT * FROM validation_findings WHERE validation_result_id = $1 ORDER BY id`,
        [gc.validationResultId],
      );
      expect(entryAfter.rows).toEqual(entryBefore.rows);
      expect(findingsAfter.rows).toEqual(findingsBefore.rows);
    });

    // 10 ──────────────────────────────────────────────────────────────────────
    it('10. Idempotency-Key: identical replay ⇒ same 201 with idempotent_replay:true, no second row; different body ⇒ 409 IDEMPOTENCY_KEY_REUSED', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const key = 'idem-key-abc-123';
      const first = await post(gc.exceptionId, { decision_type: 'APPROVE' }, { key });
      expect(first.status).toBe(201);
      expect(first.body.idempotent_replay).toBe(false);

      const replay = await post(gc.exceptionId, { decision_type: 'APPROVE' }, { key });
      expect(replay.status).toBe(201);
      expect(replay.body.idempotent_replay).toBe(true);
      expect(replay.body.decision.id).toBe(first.body.decision.id);
      expect(replay.body.audit_entry_id).toBe(first.body.audit_entry_id);

      // No second decision / audit entry.
      expect(await countFor(gc.exceptionId, 'decisions')).toBe(1);
      expect(await countFor(gc.exceptionId, 'audit_entries')).toBe(1);

      // Same key, DIFFERENT body ⇒ 409 IDEMPOTENCY_KEY_REUSED.
      const different = await post(
        gc.exceptionId,
        { decision_type: 'REJECT', reason: 'a different decision under the same key' },
        { key },
      );
      expect(different.status).toBe(409);
      expect(different.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    });

    // 11 ──────────────────────────────────────────────────────────────────────
    it('11. resolution_values sent with APPROVE or REJECT ⇒ 422 RESOLUTION_VALUES_NOT_ALLOWED', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const approve = await post(gc.exceptionId, {
        decision_type: 'APPROVE',
        resolution_values: [{ field_name: 'goods_description', value: 'x' }],
      });
      expect(approve.status).toBe(422);
      expect(approve.body.error.code).toBe('RESOLUTION_VALUES_NOT_ALLOWED');

      const reject = await post(gc.exceptionId, {
        decision_type: 'REJECT',
        reason: 'rejecting but wrongly supplying resolution values',
        resolution_values: [{ field_name: 'goods_description', value: 'x' }],
      });
      expect(reject.status).toBe(422);
      expect(reject.body.error.code).toBe('RESOLUTION_VALUES_NOT_ALLOWED');
    });

    // 12 ──────────────────────────────────────────────────────────────────────
    it('12. EDIT_APPROVE against AVAILABLE with a missing + an unexpected field ⇒ 422 RESOLUTION_VALUES_INCOMPLETE naming both', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc); // proposes goods_description, country_of_origin_code, quantity_uom

      const res = await post(gc.exceptionId, {
        decision_type: 'EDIT_APPROVE',
        reason: 'Submitting a value set that neither matches nor completes the proposal.',
        resolution_values: [
          { field_name: 'goods_description', value: 'Assorted machine parts' },
          { field_name: 'country_of_origin_code', value: 'CN' },
          // quantity_uom MISSING, carrier_code UNEXPECTED
          { field_name: 'carrier_code', value: 'ABCD' },
        ],
      });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('RESOLUTION_VALUES_INCOMPLETE');
      const fields = (res.body.error.details ?? []).map((d: { field?: string }) => d.field);
      expect(fields).toContain('quantity_uom'); // missing
      expect(fields).toContain('carrier_code'); // unexpected
      expect(res.body.error.message).toContain('quantity_uom');
    });

    // 13 ──────────────────────────────────────────────────────────────────────
    it('13. a supplied recommendation_id that does not match the case ⇒ 409 RECOMMENDATION_MISMATCH', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const res = await post(gc.exceptionId, {
        decision_type: 'APPROVE',
        recommendation_id: '00000000-0000-4000-8000-000000000000',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RECOMMENDATION_MISMATCH');
    });

    // 14 ──────────────────────────────────────────────────────────────────────
    it('14. a well-formed but unmatched identifier ⇒ 404 EXCEPTION_NOT_FOUND; a malformed one ⇒ 400 INVALID_IDENTIFIER', async () => {
      const notFound = await post('99999999-9999-4999-8999-999999999999', { decision_type: 'REJECT', reason: 'no such exception exists' });
      expect(notFound.status).toBe(404);
      expect(notFound.body.error.code).toBe('EXCEPTION_NOT_FOUND');

      const malformed = await post('not-a-valid-id', { decision_type: 'REJECT', reason: 'the identifier is malformed here' });
      expect(malformed.status).toBe(400);
      expect(malformed.body.error.code).toBe('INVALID_IDENTIFIER');
    });

    // 15 ──────────────────────────────────────────────────────────────────────
    it('15. the response carries Cache-Control: no-store', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);
      const res = await post(gc.exceptionId, { decision_type: 'APPROVE' });
      expect(res.status).toBe(201);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    // 16 ──────────────────────────────────────────────────────────────────────
    it('16. a second decision on an already-RESOLVED case ⇒ 409 EXCEPTION_ALREADY_DECIDED naming the real type, actor and timestamp', async () => {
      const gc = await createGovernedCase(h.pool, { findings: findingSet('RIV-010', 'Goods description is required') });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      await makeAvailable(h.db.appUrl, gc);

      const first = await post(gc.exceptionId, { decision_type: 'APPROVE' });
      expect(first.status).toBe(201);

      const second = await post(gc.exceptionId, {
        decision_type: 'REJECT',
        reason: 'trying to decide a case that is already resolved',
      });
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('EXCEPTION_ALREADY_DECIDED');
      // The message interpolates real values, not a placeholder.
      expect(second.body.error.message).toContain('resolved');
      expect(second.body.error.message).toContain('Dana Decider');
      expect(second.body.error.message).not.toContain('{');
    });
  });
});
