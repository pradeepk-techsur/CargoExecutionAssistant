import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client, Pool, type PoolClient } from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import {
  createGovernedCase,
  createPendingRecommendation,
  poolFor,
} from '../helpers/caseFixtures.js';
import { append } from '../../src/services/audit/writer.js';
import {
  markRecommendationAvailable,
  markRecommendationUnavailable,
  insertRecommendationValues,
} from '../../src/db/repositories/recommendations.js';
import {
  loadExceptionForGeneration,
} from '../../src/db/repositories/exceptions.js';
import {
  loadEntryValuesForRecommendation,
} from '../../src/db/repositories/entries.js';

// ─────────────────────────────────────────────────────────────────────────────
// Plan 05-02 — the WRITE side of recommendations / recommendation_values, proved
// against a real migrated database. This suite pins three separate guarantees,
// each with THIS plan's own functions (not raw SQL), so a future change that
// weakens any of them fails HERE, loudly:
//
//   1. Idempotence by construction — the WHERE status='PENDING' guard means a
//      second terminal write for an already-resolved recommendation affects zero
//      rows and leaves the first write byte-identical, with exactly one audit
//      entry (FR-9.5 / FR-9.17, acceptance 7).
//   2. Audit coupling — a terminal status transition that COMMITs without its
//      matching RECOMMENDATION_GENERATED / RECOMMENDATION_UNAVAILABLE audit entry
//      is rejected at COMMIT by trg_recommendations_audit (migration 0009,
//      P0001 / AUDIT_COUPLING_VIOLATION). This is a REGRESSION proof of an
//      already-shipped trigger.
//   3. The cargoexec_ai privilege wall — markRecommendation* / insertRecommendationValues
//      SUCCEED over cargoexec_ai (it holds those grants), but append()'s
//      unconditional case-anchor FOR UPDATE lock is refused with 42501, so the
//      terminal write sequence cannot be completed end-to-end over cargoexec_ai.
//      This is exactly why plan 05-04's job MUST run this sequence over the app
//      pool. (Regression proof of the Phase 1 finding — see immutability.spec.ts's
//      "the AI worker cannot even take the audit case-anchor lock".)
//
// Suite conventions match the other db-tier files: one fresh database, teardown
// DROPs, refusals asserted by SQLSTATE / message prefix, no trigger ever
// disabled, no escape hatch.
// ─────────────────────────────────────────────────────────────────────────────

const P0001 = 'P0001';
const AUDIT_COUPLING = 'AUDIT_COUPLING_VIOLATION';
const INSUFFICIENT_PRIVILEGE = '42501';

type PgError = Error & { code?: string; message?: string };

/** Assert a P0001 whose message begins with the given governance prefix. */
function expectRaise(err: unknown, prefix: string): void {
  const e = err as PgError;
  expect(e).toBeInstanceOf(Error);
  expect(e.code, `expected P0001, got ${e.code}: ${e.message}`).toBe(P0001);
  expect(e.message.startsWith(prefix), `expected message to start with ${prefix}, got: ${e.message}`).toBe(true);
}

/** A full byte-level snapshot of a recommendation row, for before/after comparison. */
async function readRecommendation(reader: Pool, recId: string): Promise<Record<string, unknown>> {
  const res = await reader.query(
    `SELECT id, exception_id, status, recommended_action, rationale, model_id,
            prompt_version, generated_at, latency_ms, failure_reason, failed_at, requested_at
       FROM recommendations WHERE id = $1`,
    [recId],
  );
  return res.rows[0] as Record<string, unknown>;
}

/** Snapshot of a cargo_entries row + its field-origins count, to prove no F9 mutation. */
async function snapshotEntry(
  reader: Pool,
  entryId: string,
): Promise<{ entry: Record<string, unknown>; originsCount: number }> {
  const entry = await reader.query(`SELECT * FROM cargo_entries WHERE id = $1`, [entryId]);
  const origins = await reader.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM cargo_entry_field_origins WHERE entry_id = $1`,
    [entryId],
  );
  return { entry: entry.rows[0] as Record<string, unknown>, originsCount: origins.rows[0]!.n };
}

describe('recommendation writes: idempotence, audit coupling and the cargoexec_ai wall', () => {
  let db: TestDatabase;
  let appPool: Pool;
  let aiPool: Pool;

  beforeAll(async () => {
    db = await createTestDatabase();
    appPool = poolFor(db.appUrl);
    aiPool = poolFor(db.aiUrl);
  });

  afterAll(async () => {
    await Promise.all([appPool.end(), aiPool.end()]);
    await dropTestDatabase(db);
  });

  // ── 1. Idempotence (FR-9.5 / FR-9.17, acceptance 7) ────────────────────────
  describe('1. markRecommendationAvailable is idempotent by construction', () => {
    it('a second terminal write affects zero rows, leaves the first write byte-identical, and writes exactly one audit entry', async () => {
      const gc = await createGovernedCase(appPool);
      const recId = await createPendingRecommendation(appPool, gc.exceptionId);

      // FIRST terminal write — one committed transaction, coupled to its audit entry.
      const c1 = new Client({ connectionString: db.appUrl });
      await c1.connect();
      try {
        await c1.query('BEGIN');
        const tx1 = c1 as unknown as PoolClient;
        const first = await markRecommendationAvailable(tx1, {
          recommendation_id: recId,
          recommended_action: 'APPROVE',
          rationale: 'documentation complete',
          model_id: 'm1',
          prompt_version: 'p1',
          latency_ms: 1234,
        });
        expect(first).toEqual({ updated: true });
        await insertRecommendationValues(tx1, recId, [
          { field_name: 'goods_description', proposed_value: 'Corrected description', addresses_rule_ids: ['RIV-010'] },
        ]);
        await append(tx1, {
          case_id: gc.caseId,
          exception_id: gc.exceptionId,
          recommendation_id: recId,
          action_type: 'RECOMMENDATION_GENERATED',
          actor: { type: 'AI' },
          before_state: 'OPEN',
          after_state: 'AVAILABLE',
        });
        await c1.query('COMMIT');
      } catch (err) {
        await c1.query('ROLLBACK');
        throw err;
      } finally {
        await c1.end();
      }

      const afterFirst = await readRecommendation(appPool, recId);
      expect(afterFirst.status).toBe('AVAILABLE');

      // SECOND terminal write, different arguments — must be a no-op.
      const c2 = new Client({ connectionString: db.appUrl });
      await c2.connect();
      try {
        await c2.query('BEGIN');
        const second = await markRecommendationAvailable(c2 as unknown as PoolClient, {
          recommendation_id: recId,
          recommended_action: 'REJECT',
          rationale: 'entirely different rationale that must never take effect',
          model_id: 'DIFFERENT-MODEL',
          prompt_version: 'DIFFERENT-PROMPT',
          latency_ms: 9999,
        });
        expect(second).toEqual({ updated: false });
        await c2.query('COMMIT');
      } finally {
        await c2.end();
      }

      // The row is byte-identical to what the first call wrote.
      const afterSecond = await readRecommendation(appPool, recId);
      expect(afterSecond).toEqual(afterFirst);

      // Exactly one RECOMMENDATION_GENERATED audit entry exists for this recommendation.
      const count = await appPool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM audit_entries
          WHERE recommendation_id = $1 AND action_type = 'RECOMMENDATION_GENERATED'`,
        [recId],
      );
      expect(count.rows[0]!.n).toBe(1);
    });
  });

  // ── 2. Audit coupling — AVAILABLE without append() is rejected at COMMIT ────
  describe('2. the audit-coupling trigger rejects an uncoupled AVAILABLE transition at COMMIT', () => {
    it('markRecommendationAvailable + insertRecommendationValues without append() is rejected AUDIT_COUPLING_VIOLATION, and the recommendation stays PENDING', async () => {
      const gc = await createGovernedCase(appPool);
      const recId = await createPendingRecommendation(appPool, gc.exceptionId);

      const c = new Client({ connectionString: db.appUrl });
      await c.connect();
      let threw: unknown;
      try {
        await c.query('BEGIN');
        const tx = c as unknown as PoolClient;
        const updated = await markRecommendationAvailable(tx, {
          recommendation_id: recId,
          recommended_action: 'APPROVE',
          rationale: 'documentation complete',
          model_id: 'm1',
          prompt_version: 'p1',
          latency_ms: 10,
        });
        expect(updated).toEqual({ updated: true });
        await insertRecommendationValues(tx, recId, [
          { field_name: 'goods_description', proposed_value: 'Corrected', addresses_rule_ids: ['RIV-010'] },
        ]);
        // Deliberately NO append() — the COMMIT must be rejected.
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
        await c.query('ROLLBACK').catch(() => undefined);
      } finally {
        await c.end();
      }
      expectRaise(threw, AUDIT_COUPLING);

      // The whole transaction rolled back: the recommendation is STILL PENDING.
      const row = await readRecommendation(appPool, recId);
      expect(row.status).toBe('PENDING');
    });
  });

  // ── 3. The UNAVAILABLE mirror of 2 ─────────────────────────────────────────
  describe('3. the audit-coupling trigger rejects an uncoupled UNAVAILABLE transition at COMMIT', () => {
    it('markRecommendationUnavailable without append() is rejected AUDIT_COUPLING_VIOLATION, and the recommendation stays PENDING', async () => {
      const gc = await createGovernedCase(appPool);
      const recId = await createPendingRecommendation(appPool, gc.exceptionId);

      const c = new Client({ connectionString: db.appUrl });
      await c.connect();
      let threw: unknown;
      try {
        await c.query('BEGIN');
        const updated = await markRecommendationUnavailable(c as unknown as PoolClient, {
          recommendation_id: recId,
          failure_reason: 'PROVIDER_UNAVAILABLE',
          model_id: null,
          prompt_version: null,
        });
        expect(updated).toEqual({ updated: true });
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
        await c.query('ROLLBACK').catch(() => undefined);
      } finally {
        await c.end();
      }
      expectRaise(threw, AUDIT_COUPLING);

      const row = await readRecommendation(appPool, recId);
      expect(row.status).toBe('PENDING');
    });
  });

  // ── 4. The cargoexec_ai privilege wall ─────────────────────────────────────
  describe('4. the terminal write sequence cannot be completed over cargoexec_ai', () => {
    it('markRecommendationAvailable + insertRecommendationValues SUCCEED over cargoexec_ai, but append() is refused 42501 (no case-anchor lock)', async () => {
      const gc = await createGovernedCase(appPool);
      const recId = await createPendingRecommendation(appPool, gc.exceptionId);

      const c = new Client({ connectionString: db.aiUrl });
      await c.connect();
      let threw: unknown;
      try {
        await c.query('BEGIN');
        const tx = c as unknown as PoolClient;

        // cargoexec_ai HOLDS UPDATE on recommendations (migration 0008).
        const updated = await markRecommendationAvailable(tx, {
          recommendation_id: recId,
          recommended_action: 'APPROVE',
          rationale: 'documentation complete',
          model_id: 'm1',
          prompt_version: 'p1',
          latency_ms: 5,
        });
        expect(updated).toEqual({ updated: true });

        // cargoexec_ai HOLDS INSERT on recommendation_values.
        await insertRecommendationValues(tx, recId, [
          { field_name: 'goods_description', proposed_value: 'Corrected', addresses_rule_ids: ['RIV-010'] },
        ]);

        // append() takes SELECT ... FOR UPDATE on cargo_entries — refused 42501.
        await append(tx, {
          case_id: gc.caseId,
          exception_id: gc.exceptionId,
          recommendation_id: recId,
          action_type: 'RECOMMENDATION_GENERATED',
          actor: { type: 'AI' },
          before_state: 'OPEN',
          after_state: 'AVAILABLE',
        });
        // Unreachable — append() throws above.
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
        await c.query('ROLLBACK').catch(() => undefined);
      } finally {
        await c.end();
      }

      const e = threw as PgError;
      expect(e, 'expected append() to throw over cargoexec_ai').toBeTruthy();
      expect(
        e.code,
        `ai append() FOR UPDATE cargo_entries — expected 42501 (no UPDATE privilege → no anchor lock), got ${e.code}: ${e.message}`,
      ).toBe(INSUFFICIENT_PRIVILEGE);

      // The transaction rolled back: the recommendation is STILL PENDING.
      const row = await readRecommendation(appPool, recId);
      expect(row.status).toBe('PENDING');
    });
  });

  // ── 5. No cargo_entries / cargo_entry_field_origins mutation (FR-9.3) ───────
  describe('5. no F9 write ever mutates cargo_entries or cargo_entry_field_origins', () => {
    it('the entry row is byte-identical and its field-origins count unchanged across a full terminal write', async () => {
      const gc = await createGovernedCase(appPool);
      const recId = await createPendingRecommendation(appPool, gc.exceptionId);

      const before = await snapshotEntry(appPool, gc.caseId);

      const c = new Client({ connectionString: db.appUrl });
      await c.connect();
      try {
        await c.query('BEGIN');
        const tx = c as unknown as PoolClient;
        await markRecommendationAvailable(tx, {
          recommendation_id: recId,
          recommended_action: 'APPROVE',
          rationale: 'documentation complete',
          model_id: 'm1',
          prompt_version: 'p1',
          latency_ms: 7,
        });
        await insertRecommendationValues(tx, recId, [
          { field_name: 'goods_description', proposed_value: 'Corrected', addresses_rule_ids: ['RIV-010'] },
        ]);
        await append(tx, {
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

      const after = await snapshotEntry(appPool, gc.caseId);
      expect(after.entry).toEqual(before.entry);
      expect(after.originsCount).toBe(before.originsCount);
    });
  });

  // ── 6. The two AI-safe read functions (Task 1) ─────────────────────────────
  describe('6. loadExceptionForGeneration / loadEntryValuesForRecommendation', () => {
    it('both return the expected shape for a real governed case', async () => {
      const gc = await createGovernedCase(appPool);

      const ex = await loadExceptionForGeneration(appPool, gc.exceptionId);
      expect(ex).not.toBeNull();
      expect(ex!.entry_id).toBe(gc.caseId);
      expect(ex!.validation_result_id).toBe(gc.validationResultId);

      const values = await loadEntryValuesForRecommendation(appPool, gc.caseId);
      expect(values).not.toBeNull();
      // The fixture populates goods_description and port_of_entry_code.
      expect(values!.goods_description).toBe('Assorted machine parts');
      expect(values!.port_of_entry_code).toBe('USLAX');
      // All 14 keys are present (the CanonicalEntryRecord shape).
      expect(Object.keys(values!).sort()).toEqual(
        [
          'air_waybill_number', 'arrival_date', 'bill_of_lading_number', 'carrier_code',
          'conveyance_name', 'country_of_origin_code', 'declared_value_usd', 'entry_number',
          'goods_description', 'importer_of_record_id', 'mode_of_transport', 'port_of_entry_code',
          'quantity', 'quantity_uom',
        ].sort(),
      );
    });

    it('both succeed when called over cargoexec_ai (usable by the AI role, FR-9.16)', async () => {
      const gc = await createGovernedCase(appPool);

      const ex = await loadExceptionForGeneration(aiPool, gc.exceptionId);
      expect(ex).not.toBeNull();
      expect(ex!.entry_id).toBe(gc.caseId);

      const values = await loadEntryValuesForRecommendation(aiPool, gc.caseId);
      expect(values).not.toBeNull();
      expect(values!.goods_description).toBe('Assorted machine parts');
    });

    it('neither function\'s SQL text contains the substring "specialists" (source-level, FR-9.16)', () => {
      const here = dirname(fileURLToPath(import.meta.url));
      const repoRoot = resolve(here, '..', '..', '..');
      const exceptionsSrc = readFileSync(
        resolve(repoRoot, 'server', 'src', 'db', 'repositories', 'exceptions.ts'),
        'utf8',
      );
      const entriesSrc = readFileSync(
        resolve(repoRoot, 'server', 'src', 'db', 'repositories', 'entries.ts'),
        'utf8',
      );

      // Extract each function body and assert no `specialists` inside it.
      const exBody = extractFn(exceptionsSrc, 'loadExceptionForGeneration');
      const enBody = extractFn(entriesSrc, 'loadEntryValuesForRecommendation');
      expect(exBody.toLowerCase()).not.toContain('specialists');
      expect(enBody.toLowerCase()).not.toContain('specialists');
    });
  });
});

/**
 * Extract the source of the named `export async function` up to the next
 * top-level `export ` (or end of file) — enough to scan one function's SQL text
 * in isolation, so a `specialists` join in a NEIGHBOURING function cannot mask a
 * regression in the one under test.
 */
function extractFn(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}`);
  if (start < 0) {
    throw new Error(`extractFn: function ${name} not found`);
  }
  const rest = src.slice(start + `export async function ${name}`.length);
  const nextExport = rest.indexOf('\nexport ');
  return nextExport < 0 ? rest : rest.slice(0, nextExport);
}
