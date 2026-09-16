import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import {
  createTestDatabase,
  dropTestDatabase,
  type TestDatabase,
} from '../helpers/testdb.js';
import { poolFor } from '../helpers/caseFixtures.js';
import { withTransaction } from '../../src/db/tx.js';
import { append } from '../../src/services/audit/writer.js';
import { runGenerationJob } from '../../src/ai/job.js';
import { createFakeProvider, FAKE_AI_TRIGGERS } from '../../src/ai/fakeProvider.js';
import {
  PROVIDER_FAILURE_REASONS,
  type ProviderFailureReason,
} from '../../src/ai/provider.js';

// ─────────────────────────────────────────────────────────────────────────────
// Plan 05-04 Task 2 — the generation JOB, proved end to end against a real
// migrated database by calling runGenerationJob DIRECTLY (no HTTP), injecting
// the deterministic FakeProvider (plan 05-01). Two pools are constructed — one
// over cargoexec_ai (the reads) and one over cargoexec_app (the terminal write)
// — because that split is the whole point (append()'s case-anchor FOR UPDATE
// needs UPDATE on cargo_entries, denied to cargoexec_ai).
//
// Covered:
//   1. SUCCESS: AVAILABLE + values (origin=AI) + one RECOMMENDATION_GENERATED
//      audit entry with the right before/after values.
//   2. Each of the seven failure branches → UNAVAILABLE + reason + one
//      RECOMMENDATION_UNAVAILABLE audit entry, no values, exception stays OPEN.
//   3. Idempotence: a second runGenerationJob for the same id is a no-op.
//   4. No cargo_entries / cargo_entry_field_origins mutation.
//   5. SCHEMA_INVALID lands UNAVAILABLE with zero recommendation_values.
//   6. A vanished exception returns without throwing and writes nothing.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a fully-audited governed case whose goods_description carries `goodsValue`
 * (so a FAKE_AI_TRIGGERS marker can be planted there), in ONE transaction, the
 * way createGovernedCase does but with the entry value parameterised. Returns
 * the ids the job and the assertions need, plus a PENDING recommendation.
 */
async function createCaseWithGoods(
  pool: Pool,
  goodsValue: string,
): Promise<{
  specialistId: string;
  caseId: string;
  validationResultId: string;
  exceptionId: string;
  recommendationId: string;
  findingField: string;
}> {
  return withTransaction(pool, async (tx: PoolClient) => {
    const email = `specialist-${randomUUID().slice(0, 12)}@example.gov`;
    const spRes = await tx.query<{ id: string }>(
      `INSERT INTO specialists (email, display_name, password_hash)
       VALUES ($1, 'Test Specialist', 'argon2id$placeholder') RETURNING id`,
      [email],
    );
    const specialistId = spRes.rows[0]!.id;

    const refRes = await tx.query<{ case_reference: string }>(
      `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS case_reference`,
    );
    const caseReference = refRes.rows[0]!.case_reference;

    const entryRes = await tx.query<{ id: string }>(
      `INSERT INTO cargo_entries
         (case_reference, created_by, receipt_outcome, goods_description, port_of_entry_code)
       VALUES ($1, $2, 'EXCEPTION_OPENED', $3, 'USLAX')
       RETURNING id`,
      [caseReference, specialistId, goodsValue],
    );
    const caseId = entryRes.rows[0]!.id;

    for (const field of ['goods_description', 'port_of_entry_code']) {
      await tx.query(
        `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
         VALUES ($1, $2, 'HUMAN')`,
        [caseId, field],
      );
    }

    await append(tx, {
      case_id: caseId,
      action_type: 'ENTRY_RECEIVED',
      actor: { type: 'SPECIALIST', specialist_id: specialistId },
      before_state: null,
      after_state: 'RECEIVED',
      values: [
        {
          field_name: 'goods_description',
          before_value: null,
          before_origin: null,
          after_value: goodsValue,
          after_origin: 'HUMAN',
        },
        {
          field_name: 'port_of_entry_code',
          before_value: null,
          before_origin: null,
          after_value: 'USLAX',
          after_origin: 'HUMAN',
        },
      ],
    });

    const vrRes = await tx.query<{ id: string }>(
      `INSERT INTO validation_results
         (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
       VALUES ($1, 'FAIL', 'RIV-2026.09', 31, 1) RETURNING id`,
      [caseId],
    );
    const validationResultId = vrRes.rows[0]!.id;
    // One finding on goods_description (RIV-010) — the field the fake proposes on.
    await tx.query(
      `INSERT INTO validation_findings
         (validation_result_id, rule_id, field_name, failure_code, message)
       VALUES ($1, 'RIV-010', 'goods_description', 'MISSING_REQUIRED', 'Goods description is required')`,
      [validationResultId],
    );

    await append(tx, {
      case_id: caseId,
      action_type: 'VALIDATION_COMPLETED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: 'RECEIVED',
      after_state: 'EXCEPTION_OPENED',
      values: [
        {
          field_name: 'goods_description',
          before_value: null,
          before_origin: null,
          after_value: 'RIV-010',
          after_origin: 'HUMAN',
        },
      ],
    });

    const exRes = await tx.query<{ id: string }>(
      `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2) RETURNING id`,
      [caseId, validationResultId],
    );
    const exceptionId = exRes.rows[0]!.id;

    // PENDING recommendation placeholder (no audit entry — coupling trigger
    // returns early for PENDING).
    const recRes = await tx.query<{ id: string }>(
      `INSERT INTO recommendations (exception_id) VALUES ($1) RETURNING id`,
      [exceptionId],
    );
    const recommendationId = recRes.rows[0]!.id;

    await append(tx, {
      case_id: caseId,
      exception_id: exceptionId,
      action_type: 'EXCEPTION_OPENED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: null,
      after_state: 'OPEN',
      values: [
        {
          field_name: 'goods_description',
          before_value: null,
          before_origin: null,
          after_value: 'RIV-010',
          after_origin: 'HUMAN',
        },
      ],
    });

    return {
      specialistId,
      caseId,
      validationResultId,
      exceptionId,
      recommendationId,
      findingField: 'goods_description',
    };
  });
}

describe('runGenerationJob — end to end over two pools with FakeProvider', () => {
  let db: TestDatabase;
  let appPool: Pool;
  let aiPool: Pool;

  const jobDeps = () => ({
    aiPool,
    appPool,
    provider: createFakeProvider(),
    modelId: 'test-model',
    promptVersion: '2026.09.1',
  });

  beforeAll(async () => {
    db = await createTestDatabase();
    appPool = poolFor(db.appUrl);
    aiPool = poolFor(db.aiUrl);
  });

  afterAll(async () => {
    await Promise.all([appPool.end(), aiPool.end()]);
    await dropTestDatabase(db);
  });

  // ── 1. Success ─────────────────────────────────────────────────────────────
  it('1. SUCCESS: recommendation AVAILABLE with values (origin AI) and one RECOMMENDATION_GENERATED audit entry', async () => {
    const c = await createCaseWithGoods(appPool, 'Assorted machine parts');

    await runGenerationJob(jobDeps(), c.exceptionId);

    const rec = await appPool.query(
      `SELECT status, recommended_action, rationale, model_id, prompt_version,
              generated_at, latency_ms
         FROM recommendations WHERE id = $1`,
      [c.recommendationId],
    );
    const r = rec.rows[0]!;
    expect(r.status).toBe('AVAILABLE');
    expect(r.recommended_action).toBeTruthy();
    expect(r.rationale).toBeTruthy();
    expect(r.model_id).toBe('test-model');
    expect(r.prompt_version).toBe('2026.09.1');
    expect(r.generated_at).not.toBeNull();
    expect(r.latency_ms).not.toBeNull();

    // One recommendation_values row per distinct finding field, origin AI.
    const vals = await appPool.query(
      `SELECT field_name, proposed_value, addresses_rule_ids
         FROM recommendation_values WHERE recommendation_id = $1`,
      [c.recommendationId],
    );
    expect(vals.rows).toHaveLength(1);
    expect(vals.rows[0]!.field_name).toBe('goods_description');
    expect(vals.rows[0]!.addresses_rule_ids).toEqual(['RIV-010']);

    // Exactly one RECOMMENDATION_GENERATED audit entry, actor AI, PENDING→AVAILABLE.
    const audit = await appPool.query(
      `SELECT actor_type, actor_specialist_id, before_state, after_state
         FROM audit_entries
        WHERE recommendation_id = $1 AND action_type = 'RECOMMENDATION_GENERATED'`,
      [c.recommendationId],
    );
    expect(audit.rows).toHaveLength(1);
    const a = audit.rows[0]!;
    expect(a.actor_type).toBe('AI');
    expect(a.actor_specialist_id).toBeNull();
    expect(a.before_state).toBe('PENDING');
    expect(a.after_state).toBe('AVAILABLE');

    // One audit_entry_values row per proposed field, before=stored value, after=AI.
    const aevRes = await appPool.query(
      `SELECT aev.field_name, aev.before_value, aev.before_origin, aev.after_value, aev.after_origin
         FROM audit_entry_values aev
         JOIN audit_entries ae ON ae.id = aev.audit_entry_id
        WHERE ae.recommendation_id = $1 AND ae.action_type = 'RECOMMENDATION_GENERATED'`,
      [c.recommendationId],
    );
    expect(aevRes.rows).toHaveLength(1);
    const v = aevRes.rows[0]!;
    expect(v.field_name).toBe('goods_description');
    // The entry stored 'Assorted machine parts' for goods_description.
    expect(v.before_value).toBe('Assorted machine parts');
    expect(v.before_origin).toBe('HUMAN');
    expect(v.after_origin).toBe('AI');
  });

  it('1b. SUCCESS: before_value is null when the proposed field was never provided', async () => {
    // A case whose finding is on a field the entry did NOT populate. The fake
    // proposes on the FINDING field; if that field has no stored value the audit
    // before_value/before_origin are null.
    const c = await withTransaction(appPool, async (tx) => {
      const email = `specialist-${randomUUID().slice(0, 12)}@example.gov`;
      const sp = await tx.query<{ id: string }>(
        `INSERT INTO specialists (email, display_name, password_hash)
         VALUES ($1, 'S', 'argon2id$placeholder') RETURNING id`,
        [email],
      );
      const specialistId = sp.rows[0]!.id;
      const ref = await tx.query<{ case_reference: string }>(
        `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS case_reference`,
      );
      const entry = await tx.query<{ id: string }>(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, port_of_entry_code)
         VALUES ($1, $2, 'EXCEPTION_OPENED', 'USLAX') RETURNING id`,
        [ref.rows[0]!.case_reference, specialistId],
      );
      const caseId = entry.rows[0]!.id;
      await tx.query(
        `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin) VALUES ($1, 'port_of_entry_code', 'HUMAN')`,
        [caseId],
      );
      await append(tx, {
        case_id: caseId,
        action_type: 'ENTRY_RECEIVED',
        actor: { type: 'SPECIALIST', specialist_id: specialistId },
        before_state: null,
        after_state: 'RECEIVED',
        values: [
          { field_name: 'port_of_entry_code', before_value: null, before_origin: null, after_value: 'USLAX', after_origin: 'HUMAN' },
        ],
      });
      const vr = await tx.query<{ id: string }>(
        `INSERT INTO validation_results (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
         VALUES ($1, 'FAIL', 'RIV-2026.09', 31, 1) RETURNING id`,
        [caseId],
      );
      const vrId = vr.rows[0]!.id;
      await tx.query(
        `INSERT INTO validation_findings (validation_result_id, rule_id, field_name, failure_code, message)
         VALUES ($1, 'RIV-010', 'goods_description', 'MISSING_REQUIRED', 'Goods description is required')`,
        [vrId],
      );
      await append(tx, {
        case_id: caseId,
        action_type: 'VALIDATION_COMPLETED',
        actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
        before_state: 'RECEIVED',
        after_state: 'EXCEPTION_OPENED',
        values: [
          { field_name: 'goods_description', before_value: null, before_origin: null, after_value: 'RIV-010', after_origin: 'HUMAN' },
        ],
      });
      const ex = await tx.query<{ id: string }>(
        `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2) RETURNING id`,
        [caseId, vrId],
      );
      const exceptionId = ex.rows[0]!.id;
      const rec = await tx.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id) VALUES ($1) RETURNING id`,
        [exceptionId],
      );
      await append(tx, {
        case_id: caseId,
        exception_id: exceptionId,
        action_type: 'EXCEPTION_OPENED',
        actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
        before_state: null,
        after_state: 'OPEN',
        values: [
          { field_name: 'goods_description', before_value: null, before_origin: null, after_value: 'RIV-010', after_origin: 'HUMAN' },
        ],
      });
      return { caseId, exceptionId, recommendationId: rec.rows[0]!.id };
    });

    await runGenerationJob(jobDeps(), c.exceptionId);

    const aevRes = await appPool.query(
      `SELECT aev.before_value, aev.before_origin, aev.after_origin
         FROM audit_entry_values aev
         JOIN audit_entries ae ON ae.id = aev.audit_entry_id
        WHERE ae.recommendation_id = $1 AND ae.action_type = 'RECOMMENDATION_GENERATED'`,
      [c.recommendationId],
    );
    expect(aevRes.rows).toHaveLength(1);
    expect(aevRes.rows[0]!.before_value).toBeNull();
    expect(aevRes.rows[0]!.before_origin).toBeNull();
    expect(aevRes.rows[0]!.after_origin).toBe('AI');
  });

  // ── 2. Each of the seven failure branches ──────────────────────────────────
  describe('2. every failure branch → UNAVAILABLE with the matching reason', () => {
    for (const reason of PROVIDER_FAILURE_REASONS) {
      it(`${reason}: UNAVAILABLE, one RECOMMENDATION_UNAVAILABLE audit entry, no values, exception stays OPEN`, async () => {
        const marker = FAKE_AI_TRIGGERS[reason as ProviderFailureReason];
        const c = await createCaseWithGoods(appPool, marker);

        await runGenerationJob(jobDeps(), c.exceptionId);

        const rec = await appPool.query(
          `SELECT status, failure_reason, failed_at FROM recommendations WHERE id = $1`,
          [c.recommendationId],
        );
        expect(rec.rows[0]!.status).toBe('UNAVAILABLE');
        expect(rec.rows[0]!.failure_reason).toBe(reason);
        expect(rec.rows[0]!.failed_at).not.toBeNull();

        // No recommendation_values on a failure.
        const vals = await appPool.query(
          `SELECT count(*)::int AS n FROM recommendation_values WHERE recommendation_id = $1`,
          [c.recommendationId],
        );
        expect(vals.rows[0]!.n).toBe(0);

        // Exactly one RECOMMENDATION_UNAVAILABLE audit entry, no value rows.
        const audit = await appPool.query(
          `SELECT id, actor_type, before_state, after_state FROM audit_entries
            WHERE recommendation_id = $1 AND action_type = 'RECOMMENDATION_UNAVAILABLE'`,
          [c.recommendationId],
        );
        expect(audit.rows).toHaveLength(1);
        expect(audit.rows[0]!.actor_type).toBe('AI');
        expect(audit.rows[0]!.before_state).toBe('PENDING');
        expect(audit.rows[0]!.after_state).toBe('UNAVAILABLE');
        const aev = await appPool.query(
          `SELECT count(*)::int AS n FROM audit_entry_values WHERE audit_entry_id = $1`,
          [audit.rows[0]!.id],
        );
        expect(aev.rows[0]!.n).toBe(0);

        // exceptions.state remains OPEN.
        const ex = await appPool.query(
          `SELECT state FROM exceptions WHERE id = $1`,
          [c.exceptionId],
        );
        expect(ex.rows[0]!.state).toBe('OPEN');
      });
    }
  });

  // ── 3. Idempotence ─────────────────────────────────────────────────────────
  it('3. a second runGenerationJob for the same exception is a no-op (one outcome, one audit entry)', async () => {
    const c = await createCaseWithGoods(appPool, 'Assorted machine parts');

    await runGenerationJob(jobDeps(), c.exceptionId);
    const firstGeneratedAt = (
      await appPool.query(`SELECT generated_at FROM recommendations WHERE id = $1`, [
        c.recommendationId,
      ])
    ).rows[0]!.generated_at;

    // Second call — the pre-check detects status !== PENDING and returns early.
    await runGenerationJob(jobDeps(), c.exceptionId);

    const after = await appPool.query(
      `SELECT status, generated_at FROM recommendations WHERE id = $1`,
      [c.recommendationId],
    );
    expect(after.rows[0]!.status).toBe('AVAILABLE');
    expect(after.rows[0]!.generated_at).toEqual(firstGeneratedAt);

    // Exactly one audit entry total for this recommendation across both actions.
    const audit = await appPool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM audit_entries
        WHERE recommendation_id = $1
          AND action_type IN ('RECOMMENDATION_GENERATED', 'RECOMMENDATION_UNAVAILABLE')`,
      [c.recommendationId],
    );
    expect(audit.rows[0]!.n).toBe(1);
  });

  // ── 4. No cargo_entries / cargo_entry_field_origins mutation ────────────────
  it('4. the entry row and its field-origins are byte-identical before and after generation', async () => {
    const c = await createCaseWithGoods(appPool, 'Assorted machine parts');

    const before = await appPool.query(`SELECT * FROM cargo_entries WHERE id = $1`, [c.caseId]);
    const beforeOrigins = await appPool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM cargo_entry_field_origins WHERE entry_id = $1`,
      [c.caseId],
    );

    await runGenerationJob(jobDeps(), c.exceptionId);

    const after = await appPool.query(`SELECT * FROM cargo_entries WHERE id = $1`, [c.caseId]);
    const afterOrigins = await appPool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM cargo_entry_field_origins WHERE entry_id = $1`,
      [c.caseId],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(afterOrigins.rows[0]!.n).toBe(beforeOrigins.rows[0]!.n);
  });

  // ── 5. SCHEMA_INVALID never reaches the DB as content ───────────────────────
  it('5. a SCHEMA_INVALID provider response lands UNAVAILABLE with zero recommendation_values', async () => {
    const c = await createCaseWithGoods(appPool, FAKE_AI_TRIGGERS.SCHEMA_INVALID);

    await runGenerationJob(jobDeps(), c.exceptionId);

    const rec = await appPool.query(
      `SELECT status, failure_reason FROM recommendations WHERE id = $1`,
      [c.recommendationId],
    );
    expect(rec.rows[0]!.status).toBe('UNAVAILABLE');
    expect(rec.rows[0]!.failure_reason).toBe('SCHEMA_INVALID');
    const vals = await appPool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM recommendation_values WHERE recommendation_id = $1`,
      [c.recommendationId],
    );
    expect(vals.rows[0]!.n).toBe(0);
  });

  // ── 6. A vanished exception ─────────────────────────────────────────────────
  it('6. runGenerationJob with a random unknown exception id returns without throwing and writes nothing', async () => {
    const randomId = randomUUID();
    const beforeCount = (
      await appPool.query<{ n: number }>(`SELECT count(*)::int AS n FROM recommendations`)
    ).rows[0]!.n;

    await expect(runGenerationJob(jobDeps(), randomId)).resolves.toBeUndefined();

    const afterCount = (
      await appPool.query<{ n: number }>(`SELECT count(*)::int AS n FROM recommendations`)
    ).rows[0]!.n;
    expect(afterCount).toBe(beforeCount);
  });
});
