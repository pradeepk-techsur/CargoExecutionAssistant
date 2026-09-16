// The PERMANENT F13/F14-backend regression suite (TechArch §3.1 row 10; FRD
// F13 FR-13.15/FR-13.18, F14). supertest against the harness app and a real
// migrated database.
//
// GET /api/exceptions/:exceptionId/audit is the endpoint the per-case
// audit-trail UI (F14, plan 06-04) fetches. This suite is the executable form
// of the F13-read contract: the full ordered trail of a governed case, the
// AI-vs-human distinction in the response shape itself (actor null + model_id
// for AI, {id,display_name} for a person), the auth/identifier/query-parameter
// contract, the read-only guarantee, the GET-only surface, and — the
// load-bearing case — that a TAMPERED hash chain is REPORTED (chain_verified
// false + first_divergence_sequence) with the entries still rendered, never
// repaired and never an error.
//
// The route is GET-only, so NO CSRF token is needed for any request here.
//
// Cases are built directly against the database with the SAME governed fixtures
// the F7/F9/F11 suites use — an exception is DERIVED, never authored (F5
// FR-5.1). This suite does NOT depend on 06-01's route being callable: it drives
// a case through PENDING→AVAILABLE and through a REJECT decision with direct
// governed SQL + append(), exactly the way recommendation.spec.ts::makeAvailable
// and hitl.spec.ts's REJECT positive control do — the deferred coupling triggers
// would reject a bare status/state change at COMMIT, so each fixture is a
// legitimately governed case, not a worked-around one. Production code never
// writes these bare.

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

const MODEL_ID = 'gpt-test-1';

/** The three proposed values a "3-field" AVAILABLE recommendation carries. */
const THREE_PROPOSED: { field_name: string; proposed_value: string; rule_id: string }[] = [
  { field_name: 'goods_description', proposed_value: 'Assorted machine parts', rule_id: 'RIV-010' },
  { field_name: 'country_of_origin_code', proposed_value: 'CN', rule_id: 'RIV-040' },
  { field_name: 'quantity_uom', proposed_value: 'KG', rule_id: 'RIV-050' },
];

/**
 * Transition a case's recommendation to AVAILABLE with N proposed values through
 * a governed transaction (the AVAILABLE UPDATE + proposed values + the
 * RECOMMENDATION_GENERATED audit entry committed together). Mirrors
 * recommendation.spec.ts / decision.spec.ts::makeAvailable. Returns the
 * recommendation id so the caller can build the coupled REJECT.
 */
async function makeAvailable(
  appUrl: string,
  gc: GovernedCase,
  proposed = THREE_PROPOSED,
): Promise<string> {
  const c = new Client({ connectionString: appUrl });
  await c.connect();
  try {
    await c.query('BEGIN');
    const rec = await c.query<{ id: string }>(
      `UPDATE recommendations
          SET status = 'AVAILABLE', recommended_action = 'Complete the required fields and re-file',
              rationale = 'These fields are required for this mode of transport.',
              model_id = $2, prompt_version = 'p-2026.09',
              generated_at = now(), latency_ms = 1200
        WHERE exception_id = $1
      RETURNING id`,
      [gc.exceptionId, MODEL_ID],
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
    return recId;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    await c.end();
  }
}

/**
 * Reject the AVAILABLE recommendation on a case through a governed transaction —
 * the decision row (recommendation_id ALWAYS stamped, F5 FR-5.12), the coupled
 * RECOMMENDATION_REJECTED audit entry whose value rows record the DECLINED
 * proposal (before = each proposed value with origin AI, after = null), and the
 * one UPDATE exceptions → REJECTED. Mirrors decision.service.ts's REJECT path
 * (TechArch §3.6) and hitl.spec.ts's REJECT positive control — all committed
 * together so the HITL and coupling triggers are genuinely satisfied.
 */
async function rejectCase(
  appUrl: string,
  gc: GovernedCase,
  recId: string,
  reason: string,
  proposed = THREE_PROPOSED,
): Promise<void> {
  const c = new Client({ connectionString: appUrl });
  await c.connect();
  try {
    await c.query('BEGIN');
    const dec = await c.query<{ id: string }>(
      `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, recommendation_id, resulting_state)
       VALUES ($1, 'REJECT', $2, $3, $4, 'REJECTED') RETURNING id`,
      [gc.exceptionId, gc.specialistId, reason, recId],
    );
    const decId = dec.rows[0]!.id;
    await append(c as unknown as PoolClient, {
      case_id: gc.caseId,
      exception_id: gc.exceptionId,
      recommendation_id: recId,
      decision_id: decId,
      action_type: 'RECOMMENDATION_REJECTED',
      actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
      before_state: 'OPEN',
      after_state: 'REJECTED',
      reason,
      // The declined proposal, recorded verbatim: before = proposal (AI),
      // after = null (nothing adopted).
      values: proposed.map((p) => ({
        field_name: p.field_name,
        before_value: p.proposed_value,
        before_origin: 'AI' as const,
        after_value: null,
        after_origin: null,
      })),
    });
    await c.query(
      `UPDATE exceptions SET state = 'REJECTED', closed_at = now(), decision_id = $2 WHERE id = $1`,
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

describe('GET /api/exceptions/:exceptionId/audit — the F13 audit-trail read (FR-13.15/13.18, F14)', () => {
  withApi((h) => {
    let cookie = '';

    beforeAll(async () => {
      const sp = await createTestSpecialist(h.db.appUrl, { display_name: 'Audit Reader' });
      const signedIn = await h.signIn(sp.email, TEST_PASSWORD);
      cookie = signedIn.cookie;
    });

    function get(exceptionId: string) {
      return supertest(h.app)
        .get('/api/exceptions/' + exceptionId + '/audit')
        .set('Cookie', cookie);
    }

    /**
     * Build a case taken through the full governed loop to a REJECT decision:
     * ENTRY_RECEIVED → VALIDATION_COMPLETED → EXCEPTION_OPENED (createGovernedCase)
     * → RECOMMENDATION_GENERATED/AVAILABLE (makeAvailable) →
     * RECOMMENDATION_REJECTED (rejectCase). Exactly 5 audit entries.
     */
    async function rejectedCase(): Promise<GovernedCase> {
      const gc = await createGovernedCase(h.pool, {
        findings: findingSet('RIV-010', 'Goods description is required'),
      });
      await createPendingRecommendation(h.pool, gc.exceptionId);
      const recId = await makeAvailable(h.db.appUrl, gc);
      await rejectCase(
        h.db.appUrl,
        gc,
        recId,
        'The manifest does not support these values; rejecting the recommendation.',
      );
      return gc;
    }

    // 1 ───────────────────────────────────────────────────────────────────────
    it('1. no cookie ⇒ 401 (guard.spec owns the full unauthenticated matrix)', async () => {
      const res = await supertest(h.app).get(
        '/api/exceptions/11111111-1111-4111-8111-111111111111/audit',
      );
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    // 2 ───────────────────────────────────────────────────────────────────────
    it('2. a fully-decided case ⇒ 200 with exactly 5 entries in ascending case_sequence', async () => {
      const gc = await rejectedCase();
      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      expect(res.body.entries).toHaveLength(5);
      expect(res.body.entries.map((e: { case_sequence: number }) => e.case_sequence)).toEqual([
        1, 2, 3, 4, 5,
      ]);
      expect(res.body.entries.map((e: { action_type: string }) => e.action_type)).toEqual([
        'ENTRY_RECEIVED',
        'VALIDATION_COMPLETED',
        'EXCEPTION_OPENED',
        'RECOMMENDATION_GENERATED',
        'RECOMMENDATION_REJECTED',
      ]);
      expect(res.body.case_reference).toBe(gc.caseReference);
    });

    // 3 ───────────────────────────────────────────────────────────────────────
    it('3. the AI entry has actor null + model_id; every SPECIALIST/SYSTEM entry has {id,display_name}', async () => {
      const gc = await rejectedCase();
      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      const byAction: Record<string, {
        actor_type: string;
        actor: { id: string; display_name: string } | null;
        model_id?: string;
      }> = {};
      for (const e of res.body.entries) byAction[e.action_type] = e;

      // The AI-authored event: actor null, model_id present and equal to the
      // fixture's model_id, and NEVER a person-like name (F14 FR-14.4).
      const gen = byAction['RECOMMENDATION_GENERATED']!;
      expect(gen.actor_type).toBe('AI');
      expect(gen.actor).toBeNull();
      expect(gen.model_id).toBe(MODEL_ID);

      // Every human/system event carries {id, display_name} matching the
      // fixture specialist, and NO model_id.
      for (const action of [
        'ENTRY_RECEIVED', // SPECIALIST
        'VALIDATION_COMPLETED', // SYSTEM on behalf
        'EXCEPTION_OPENED', // SYSTEM on behalf
        'RECOMMENDATION_REJECTED', // SPECIALIST
      ]) {
        const e = byAction[action]!;
        expect(e.actor).not.toBeNull();
        expect(e.actor!.id).toBe(gc.specialistId);
        expect(typeof e.actor!.display_name).toBe('string');
        expect(e.actor!.display_name.length).toBeGreaterThan(0);
        expect(e.model_id).toBeUndefined();
      }
    });

    // 4 ───────────────────────────────────────────────────────────────────────
    it('4. the REJECTED entry records the declined proposal: before=proposed (AI), after=null', async () => {
      const gc = await rejectedCase();
      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      const rejected = res.body.entries.find(
        (e: { action_type: string }) => e.action_type === 'RECOMMENDATION_REJECTED',
      );
      expect(rejected).toBeDefined();
      expect(rejected.values).toHaveLength(THREE_PROPOSED.length);
      const proposedByField = new Map(THREE_PROPOSED.map((p) => [p.field_name, p.proposed_value]));
      for (const v of rejected.values) {
        expect(v.before_value).toBe(proposedByField.get(v.field_name));
        expect(v.before_origin).toBe('AI');
        expect(v.after_value).toBeNull();
        expect(v.after_origin).toBeNull();
      }
    });

    // 5 ───────────────────────────────────────────────────────────────────────
    it('5. a healthy case reports chain_verified true, first_divergence_sequence null, entry_count 5', async () => {
      const gc = await rejectedCase();
      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200);
      expect(res.body.chain_verified).toBe(true);
      expect(res.body.first_divergence_sequence).toBeNull();
      expect(res.body.entry_count).toBe(5);
    });

    // 6 ───────────────────────────────────────────────────────────────────────
    it('6. a well-formed but unmatched uuid ⇒ 404 EXCEPTION_NOT_FOUND; a malformed id ⇒ 400 INVALID_IDENTIFIER', async () => {
      const notFound = await get('99999999-9999-4999-8999-999999999999');
      expect(notFound.status).toBe(404);
      expect(notFound.body.error.code).toBe('EXCEPTION_NOT_FOUND');

      const malformed = await get('not-a-uuid');
      expect(malformed.status).toBe(400);
      expect(malformed.body.error.code).toBe('INVALID_IDENTIFIER');
    });

    // 7 ───────────────────────────────────────────────────────────────────────
    it('7. any query string ⇒ 400 UNSUPPORTED_QUERY_PARAMETER, never a filtered response', async () => {
      const gc = await rejectedCase();
      const res = await supertest(h.app)
        .get('/api/exceptions/' + gc.exceptionId + '/audit?foo=1')
        .set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_QUERY_PARAMETER');
      expect(res.body.entries).toBeUndefined();
      const fields = (res.body.error.details ?? []).map((d: { field?: string }) => d.field);
      expect(fields).toContain('foo');
    });

    // 8 ───────────────────────────────────────────────────────────────────────
    it('8. POST / PUT / PATCH / DELETE on this path ⇒ never a mutation (405 / 404, never a success)', async () => {
      // The load-bearing guarantee is that no mutating method reaches the audit
      // store. app.ts's apiNotFoundOr405 keys 405 on ROUTE PATTERNS while the
      // request carries a CONCRETE path — so, exactly like the F7 detail and F9
      // recommendation routes, a wrong method on a parameterised path answers
      // 404 not 405. Either way it is a 4xx: the audit store is append-only and
      // this surface is read-only. Framework-wide, pre-exists this plan.
      const gc = await rejectedCase();
      for (const method of ['post', 'put', 'patch', 'delete'] as const) {
        const res = await supertest(h.app)
          [method]('/api/exceptions/' + gc.exceptionId + '/audit')
          .set('Cookie', cookie);
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect([404, 405]).toContain(res.status);
      }
    });

    // 9 ───────────────────────────────────────────────────────────────────────
    it('9. the response carries Cache-Control: no-store', async () => {
      const gc = await rejectedCase();
      const res = await get(gc.exceptionId);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    // 10 ──────────────────────────────────────────────────────────────────────
    it('10. reading writes NO row of any kind (acceptance: read-only)', async () => {
      const gc = await rejectedCase();

      const tables = [
        'specialists',
        'sessions',
        'cargo_entries',
        'cargo_entry_field_origins',
        'validation_results',
        'validation_findings',
        'exceptions',
        'recommendations',
        'recommendation_values',
        'decisions',
        'decision_values',
        'audit_entries',
        'audit_entry_values',
      ];
      async function counts(): Promise<Record<string, string>> {
        const out: Record<string, string> = {};
        for (const t of tables) {
          const r = await h.pool.query<{ count: string }>(
            `SELECT count(*)::text AS count FROM ${t}`,
          );
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

    // 11 ──────────────────────────────────────────────────────────────────────
    it('11. a tampered entry_hash ⇒ chain_verified false, the right first_divergence_sequence, entries still render', async () => {
      const gc = await rejectedCase();

      // Tamper the STORED entry_hash at case_sequence 2. The immutability
      // triggers refuse an UPDATE from EVERY role — even cargoexec_owner (Step 1
      // of chain.spec.ts proves the owner's DELETE is refused). Manufacturing a
      // tampered artefact therefore requires DROPPING those guards first, EXACTLY
      // as chain.spec.ts does. This is safe and contained here because withApi
      // gives this suite its OWN throwaway database, DROP'd in afterAll: the guard
      // never leaves this suite's disposable DB, and test 11 is the last test, so
      // no later fixture relies on it. No production code drops a trigger.
      //
      // This mirrors chain.spec.ts's "alteration" copy: n=1 intact; n=2's prev
      // still matches entry 1 → passes; at n=3 the row's prev holds entry 2's
      // ORIGINAL hash, which no longer equals entry 2's now-altered stored
      // entry_hash → the link breaks at stored sequence 3.
      const owner = new Client({ connectionString: h.db.ownerUrl });
      await owner.connect();
      try {
        await owner.query('DROP TRIGGER trg_audit_entries_immutable ON audit_entries');
        await owner.query('DROP TRIGGER trg_audit_entries_immutable_row ON audit_entries');
        // A guaranteed-different 32-byte hash (all 0xEE bytes will not equal a
        // real sha256 chain link of the fixture).
        await owner.query(
          `UPDATE audit_entries
              SET entry_hash = decode(repeat('ee', 32), 'hex')
            WHERE case_id = $1 AND case_sequence = 2`,
          [gc.caseId],
        );
      } finally {
        await owner.end();
      }

      const res = await get(gc.exceptionId);
      expect(res.status).toBe(200); // a broken chain is reported, not an error
      expect(res.body.chain_verified).toBe(false);
      expect(res.body.first_divergence_sequence).toBe(3);
      // The entries themselves STILL render — the caller decides how to present
      // a broken chain; the endpoint never withholds the history.
      expect(res.body.entries).toHaveLength(5);
      expect(res.body.entries.map((e: { case_sequence: number }) => e.case_sequence)).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });
  });
});
