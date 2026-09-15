import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import {
  createGovernedCase,
  createPendingRecommendation,
  poolFor,
  type GovernedCase,
} from '../helpers/caseFixtures.js';
import { append } from '../../src/services/audit/writer.js';
import {
  listOpenExceptions,
  resolveCaseIdentifier,
  loadExceptionDetail,
} from '../../src/db/repositories/exceptions.js';
import { loadFindingsByValidationResultIds } from '../../src/db/repositories/validation.js';
import {
  loadRecommendationByException,
  loadRecommendationValues,
} from '../../src/db/repositories/recommendations.js';
import {
  loadDecisionByException,
  loadDecisionValues,
} from '../../src/db/repositories/decisions.js';

// ─────────────────────────────────────────────────────────────────────────────
// Plan 04-01 — DB-tier proof of the receipt-ordered queue read model.
//
// Every function under test is READ-ONLY. This suite proves, against a real
// migrated database, the four must-have truths of the plan:
//   1. an open-queue read returns rows in ascending receipt_position,
//      identically on repeated reads (FR-7.1, acceptance 1);
//   2. a closed (RESOLVED) exception is never returned by the open-queue read,
//      yet stays directly reachable by identifier (FR-7.4, acceptance 6);
//   3. a well-formed but unmatched identifier resolves to NOT_FOUND, distinct
//      from FOUND and from ENTRY_PASSED_VALIDATION (FR-7.14);
//   4. an entry that validated clean is distinguishable, at the repository
//      layer, from a case reference that matches nothing at all (FR-7.14).
//
// The one case-closure here follows the SAME positive-control pattern as
// hitl.spec.ts's TEST-DB-04(positive control): a real AVAILABLE recommendation,
// a real decision, the coupled RECOMMENDATION_APPROVED audit entry via append(),
// then the closure UPDATE + COMMIT. No trigger is dropped, forced immediate, or
// bypassed — a governed closure is the only way an exception leaves OPEN.
// ─────────────────────────────────────────────────────────────────────────────

describe('queueRead — receipt-ordered queue read model (F7, plan 04-01)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await dropTestDatabase(db);
  });

  /**
   * Close a governed case through the product's own path: an AVAILABLE
   * recommendation, a matching decision, its coupled audit entry, and the
   * closure UPDATE — all in one transaction that must COMMIT cleanly.
   * Returns the decision id.
   */
  async function closeCaseAsResolved(gc: GovernedCase): Promise<string> {
    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      await c.query('BEGIN');

      // The exception already carries a PENDING recommendation placeholder
      // (createPendingRecommendation). Move it to AVAILABLE — the same PENDING→
      // AVAILABLE transition the AI service performs — coupled to its
      // RECOMMENDATION_GENERATED audit entry, rather than inserting a second row
      // (uq_recommendations_exception permits exactly one per exception).
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
      await append(c, {
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

      await append(c, {
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
      return decId;
    } finally {
      await c.end();
    }
  }

  /**
   * Build a VALIDATED_CLEAN entry (a PASS result, no exception) through the
   * product's own path — one transaction, the cargo_entries insert coupled to
   * its ENTRY_RECEIVED audit entry (the coupling trigger refuses a bare insert).
   * This is exactly the ENTRY_PASSED_VALIDATION shape FR-7.14 names. Returns the
   * case_reference.
   */
  async function createCleanEntry(): Promise<string> {
    const c = new Client({ connectionString: db.appUrl });
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

      // ENTRY_RECEIVED — the coupling trigger requires exactly one audit entry
      // for the cargo_entries insert.
      await append(c, {
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
            after_origin: 'HUMAN' as const,
          },
        ],
      });

      // A clean entry records a PASS validation result with no findings and no
      // exception.
      await c.query(
        `INSERT INTO validation_results
           (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
         VALUES ($1, 'PASS', 'RIV-2026.09', 31, 0)`,
        [entryId],
      );

      // VALIDATION_COMPLETED — the validation_results insert is likewise coupled.
      await append(c, {
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

  // ── 1. Ordering (FR-7.1, acceptance 1) ─────────────────────────────────────

  it('1. listOpenExceptions returns rows in ascending receipt_position, identically on repeated reads', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const cases: GovernedCase[] = [];
      for (let i = 0; i < 3; i += 1) {
        const gc = await createGovernedCase(pool);
        await createPendingRecommendation(pool, gc.exceptionId);
        cases.push(gc);
      }

      const first = await listOpenExceptions(pool);
      const second = await listOpenExceptions(pool);

      // The three ids we built are present, ascending by receipt_position.
      const ourIds = new Set(cases.map((c) => c.exceptionId));
      const firstOurs = first.filter((r) => ourIds.has(r.id));
      expect(firstOurs).toHaveLength(3);

      const positions = firstOurs.map((r) => r.receipt_position);
      const ascending = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(ascending);

      // Whole-read determinism: two calls are byte-identical.
      expect(second).toEqual(first);

      // The projected shape carries exactly the read-model columns.
      const row = firstOurs[0]!;
      expect(row).toHaveProperty('case_reference');
      expect(row).toHaveProperty('received_at');
      expect(row).toHaveProperty('validation_result_id');
      expect(typeof row.findings_count).toBe('number');
      expect(typeof row.receipt_position).toBe('number');
    } finally {
      await pool.end();
    }
  });

  // ── 2. OPEN-only filtering + closed reachability (FR-7.4, acceptance 6) ─────

  it('2. a RESOLVED exception drops out of the open queue but stays reachable by identifier', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const a = await createGovernedCase(pool);
      const b = await createGovernedCase(pool);
      const closed = await createGovernedCase(pool);
      for (const gc of [a, b, closed]) {
        await createPendingRecommendation(pool, gc.exceptionId);
      }

      await closeCaseAsResolved(closed);

      const open = await listOpenExceptions(pool);
      const openIds = open.map((r) => r.id);
      expect(openIds).toContain(a.exceptionId);
      expect(openIds).toContain(b.exceptionId);
      // The closed case is gone from the open queue.
      expect(openIds).not.toContain(closed.exceptionId);

      // Ascending order still holds across the whole open set.
      const positions = open.map((r) => r.receipt_position);
      expect(positions).toEqual([...positions].sort((x, y) => x - y));

      // A closed case remains directly reachable by its case reference.
      const resolved = await resolveCaseIdentifier(pool, 'CASE_REF', closed.caseReference);
      expect(resolved).toEqual({ status: 'FOUND', exceptionId: closed.exceptionId });
    } finally {
      await pool.end();
    }
  });

  // ── 3 & 4. Identifier resolution (FR-7.14) ─────────────────────────────────

  it('3. resolveCaseIdentifier distinguishes FOUND, NOT_FOUND, and ENTRY_PASSED_VALIDATION', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const gc = await createGovernedCase(pool);
      await createPendingRecommendation(pool, gc.exceptionId);

      // UUID form → a real open exception id resolves FOUND.
      expect(await resolveCaseIdentifier(pool, 'UUID', gc.exceptionId)).toEqual({
        status: 'FOUND',
        exceptionId: gc.exceptionId,
      });

      // UUID form → a well-formed but unmatched uuid resolves NOT_FOUND.
      expect(await resolveCaseIdentifier(pool, 'UUID', randomUUID())).toEqual({
        status: 'NOT_FOUND',
      });

      // CASE_REF → an entry that validated clean (no exception) is distinct.
      const cleanRef = await createCleanEntry();
      expect(await resolveCaseIdentifier(pool, 'CASE_REF', cleanRef)).toEqual({
        status: 'ENTRY_PASSED_VALIDATION',
      });

      // CASE_REF → a reference belonging to an exception resolves FOUND.
      expect(await resolveCaseIdentifier(pool, 'CASE_REF', gc.caseReference)).toEqual({
        status: 'FOUND',
        exceptionId: gc.exceptionId,
      });

      // CASE_REF → no such entry at all resolves NOT_FOUND.
      expect(await resolveCaseIdentifier(pool, 'CASE_REF', 'CE-2026-999999')).toEqual({
        status: 'NOT_FOUND',
      });
    } finally {
      await pool.end();
    }
  });

  // ── 5. Findings composition input (FR-7.6) ─────────────────────────────────

  it('5. loadFindingsByValidationResultIds groups findings ascending by rule_id, and short-circuits on []', async () => {
    const pool = poolFor(db.appUrl);
    try {
      // A case with several findings, deliberately supplied out of rule_id order
      // so the ascending guarantee is genuinely exercised.
      const gc = await createGovernedCase(pool, {
        findings: [
          { rule_id: 'RIV-073', field_name: 'bill_of_lading_number', failure_code: 'CONFLICT', message: 'Conflicting transport documents' },
          { rule_id: 'RIV-010', field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message: 'Goods description is required' },
          { rule_id: 'RIV-041', field_name: 'port_of_entry_code', failure_code: 'UNKNOWN_CODE', message: 'Port of entry code is not recognised' },
        ],
      });

      const map = await loadFindingsByValidationResultIds(pool, [gc.validationResultId]);
      const findings = map.get(gc.validationResultId);
      expect(findings).toBeDefined();
      expect(findings!.map((f) => f.rule_id)).toEqual(['RIV-010', 'RIV-041', 'RIV-073']);

      // Empty ids → empty map, NO query executed (early return in the repository;
      // a spy is awkward against a bound Pool, so we assert the contract shape).
      const empty = await loadFindingsByValidationResultIds(pool, []);
      expect(empty.size).toBe(0);
    } finally {
      await pool.end();
    }
  });

  // ── 6. Recommendation / decision reads (FR-7.7) ────────────────────────────

  it('6. loadRecommendationByException returns the PENDING placeholder with all result fields null', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const gc = await createGovernedCase(pool);
      await createPendingRecommendation(pool, gc.exceptionId);

      const rec = await loadRecommendationByException(pool, gc.exceptionId);
      expect(rec).not.toBeNull();
      expect(rec!.status).toBe('PENDING');
      expect(rec!.recommended_action).toBeNull();
      expect(rec!.rationale).toBeNull();
      expect(rec!.model_id).toBeNull();
      expect(rec!.prompt_version).toBeNull();
      expect(rec!.generated_at).toBeNull();
      expect(rec!.failure_reason).toBeNull();
      expect(rec!.failed_at).toBeNull();
      expect(typeof rec!.requested_at).toBe('string');

      // A PENDING recommendation has no proposed values.
      const values = await loadRecommendationValues(pool, rec!.id);
      expect(values).toEqual([]);
    } finally {
      await pool.end();
    }
  });

  it('7. loadDecisionByException is null for OPEN cases and returns the joined decider for a closed one', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const stillOpen = await createGovernedCase(pool);
      const toClose = await createGovernedCase(pool);
      for (const gc of [stillOpen, toClose]) {
        await createPendingRecommendation(pool, gc.exceptionId);
      }

      // Two still-open cases have no decision.
      expect(await loadDecisionByException(pool, stillOpen.exceptionId)).toBeNull();
      expect(await loadDecisionByException(pool, toClose.exceptionId)).toBeNull();

      const decId = await closeCaseAsResolved(toClose);

      const decision = await loadDecisionByException(pool, toClose.exceptionId);
      expect(decision).not.toBeNull();
      expect(decision!.id).toBe(decId);
      expect(decision!.decision_type).toBe('APPROVE');
      // The decider's display name is joined from specialists (Test Specialist).
      expect(decision!.decided_by_id).toBe(toClose.specialistId);
      expect(decision!.decided_by_display_name).toBe('Test Specialist');
      expect(typeof decision!.decided_at).toBe('string');

      // An APPROVE with no edited values has no decision_values.
      const values = await loadDecisionValues(pool, decId);
      expect(values).toEqual([]);
    } finally {
      await pool.end();
    }
  });

  // ── loadExceptionDetail (FR-7.7) ───────────────────────────────────────────

  it('8. loadExceptionDetail returns identity + lifecycle, and null for a missing id', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const gc = await createGovernedCase(pool);
      await createPendingRecommendation(pool, gc.exceptionId);

      const detail = await loadExceptionDetail(pool, gc.exceptionId);
      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(gc.exceptionId);
      expect(detail!.case_reference).toBe(gc.caseReference);
      expect(detail!.entry_id).toBe(gc.caseId);
      expect(detail!.state).toBe('OPEN');
      expect(typeof detail!.receipt_position).toBe('number');
      expect(typeof detail!.opened_at).toBe('string');
      expect(detail!.closed_at).toBeNull();

      // A closed case reports its closure timestamp.
      await closeCaseAsResolved(gc);
      const closed = await loadExceptionDetail(pool, gc.exceptionId);
      expect(closed!.state).toBe('RESOLVED');
      expect(closed!.closed_at).not.toBeNull();

      // A well-formed but unmatched id is null (the route maps that to 404).
      expect(await loadExceptionDetail(pool, randomUUID())).toBeNull();
    } finally {
      await pool.end();
    }
  });
});
