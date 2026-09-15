import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client, type PoolClient } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import { withTransaction } from '../../src/db/tx.js';
import {
  createGovernedCase,
  createPendingRecommendation,
  poolFor,
  type GovernedCase,
} from '../helpers/caseFixtures.js';
import { append } from '../../src/services/audit/writer.js';
import { listQueue } from '../../src/services/queue.service.js';
import { loadCase } from '../../src/services/caseRead.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Plan 04-02 — DB-tier proof of the two F7 composition services against a real
// migrated database. Every function under test is READ-ONLY. This suite proves
// the plan's three must-have truths:
//   1. failure_summary is derived per FR-7.6 (first two finding messages in
//      server order, "and N more" when count > 2);
//   2. permitted_decisions is exactly the FR-7.8 matrix for all four reachable
//      state × recommendation-status combinations;
//   3. the 500/501 truncation boundary (FR-7.9): 501 open exceptions serve as
//      500 rows truncated:true, the 500 lowest receipt_position values; ≤500
//      serve whole truncated:false.
// plus the ENTRY_PASSED_VALIDATION / NOT_FOUND identifier pass-throughs (FR-7.14).
//
// NOTE on seeding under the governance triggers (plan-execution deviation,
// Rule 3): the plan proposed bulk-inserting 501 cargo_entries/validation_results/
// exceptions rows via a single raw unnest() statement. That is INFEASIBLE here —
// migration 0009's DEFERRABLE coupling triggers refuse the COMMIT unless every
// cargo_entries / validation_results / exceptions insert carries its matching
// ENTRY_RECEIVED / VALIDATION_COMPLETED / EXCEPTION_OPENED audit entry (with a
// valid per-case hash chain). A bare bulk insert would raise
// AUDIT_COUPLING_VIOLATION at COMMIT. Instead we build all 501 governed cases the
// product's own way — through append() — but inside ONE transaction, so the cost
// is 501 iterations without 501 separate commits. That is fast enough and, unlike
// the raw bulk insert, actually commits.
// ─────────────────────────────────────────────────────────────────────────────

describe('queue/caseRead services — F7 composition (plan 04-02)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await dropTestDatabase(db);
  });

  // ── seeding helpers ─────────────────────────────────────────────────────────

  /**
   * Build one fully-audited governed OPEN case (cargo_entries + field origin +
   * validation_result + one finding + exception + PENDING recommendation), inside
   * the CALLER's already-open transaction so many can be built without a commit
   * per case. Mirrors createGovernedCase's coupling but takes the tx from outside.
   * Returns the exception id and its receipt_position.
   */
  async function seedGovernedCaseInTx(
    tx: PoolClient,
    seq: number,
  ): Promise<{ exceptionId: string; receiptPosition: number }> {
    const specialistRes = await tx.query<{ id: string }>(
      `INSERT INTO specialists (email, display_name, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      [`bulk-${seq}-${randomUUID().slice(0, 8)}@example.gov`, 'Bulk Specialist', 'argon2id$placeholder'],
    );
    const specialistId = specialistRes.rows[0]!.id;

    const refRes = await tx.query<{ case_reference: string }>(
      `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS case_reference`,
    );
    const caseReference = refRes.rows[0]!.case_reference;

    const entryRes = await tx.query<{ id: string }>(
      `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
       VALUES ($1, $2, 'EXCEPTION_OPENED', 'Bulk shipment')
       RETURNING id`,
      [caseReference, specialistId],
    );
    const caseId = entryRes.rows[0]!.id;

    await tx.query(
      `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
       VALUES ($1, 'goods_description', 'HUMAN')`,
      [caseId],
    );

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
          after_value: 'Bulk shipment',
          after_origin: 'HUMAN',
        },
      ],
    });

    const vrRes = await tx.query<{ id: string }>(
      `INSERT INTO validation_results
         (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
       VALUES ($1, 'FAIL', 'RIV-2026.09', 31, 1)
       RETURNING id`,
      [caseId],
    );
    const validationResultId = vrRes.rows[0]!.id;

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
    });

    const exRes = await tx.query<{ id: string; receipt_position: string }>(
      `INSERT INTO exceptions (entry_id, validation_result_id)
       VALUES ($1, $2) RETURNING id, receipt_position`,
      [caseId, validationResultId],
    );
    const exceptionId = exRes.rows[0]!.id;
    const receiptPosition = Number(exRes.rows[0]!.receipt_position);

    await tx.query(
      `INSERT INTO recommendations (exception_id, status) VALUES ($1, 'PENDING')`,
      [exceptionId],
    );

    await append(tx, {
      case_id: caseId,
      exception_id: exceptionId,
      action_type: 'EXCEPTION_OPENED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: null,
      after_state: 'OPEN',
    });

    return { exceptionId, receiptPosition };
  }

  /**
   * Build a VALIDATED_CLEAN entry (a PASS result, no exception) through the
   * product's own path — the cargo_entries insert coupled to its ENTRY_RECEIVED
   * audit entry. Returns the case_reference. This is the ENTRY_PASSED_VALIDATION
   * shape FR-7.14 names.
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

  /**
   * Move a governed case's PENDING recommendation to AVAILABLE, coupled to its
   * RECOMMENDATION_GENERATED audit entry (the PENDING→AVAILABLE transition the AI
   * service performs). Returns nothing; the exception stays OPEN.
   */
  async function setRecommendationAvailable(gc: GovernedCase): Promise<void> {
    const c = new Client({ connectionString: db.appUrl });
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
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      await c.end();
    }
  }

  /**
   * Move a governed case's PENDING recommendation to UNAVAILABLE, coupled to its
   * RECOMMENDATION_UNAVAILABLE audit entry (the provider-failure path). Exception
   * stays OPEN.
   */
  async function setRecommendationUnavailable(gc: GovernedCase): Promise<void> {
    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      await c.query('BEGIN');
      const rec = await c.query<{ id: string }>(
        `UPDATE recommendations
            SET status = 'UNAVAILABLE', failure_reason = 'PROVIDER_TIMEOUT', failed_at = now()
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

  /**
   * Close a governed case as RESOLVED through the product's own path: an
   * AVAILABLE recommendation + its audit entry, a matching APPROVE decision + its
   * audit entry, then the closure UPDATE — all in one committed transaction.
   * Same positive-control sequence as hitl.spec.ts's TEST-DB-04(positive control).
   */
  async function closeCaseAsResolved(gc: GovernedCase): Promise<void> {
    const c = new Client({ connectionString: db.appUrl });
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

  // ── 1. Failure summary (FR-7.6) ─────────────────────────────────────────────

  it('1. deriveFailureSummary: three findings ⇒ first two messages + " and 1 more"; one finding ⇒ just that message', async () => {
    const pool = poolFor(db.appUrl);
    try {
      // A governed case with THREE findings, deliberately supplied out of rule_id
      // order so the ascending "server order" guarantee is genuinely exercised.
      const three = await createGovernedCase(pool, {
        findings: [
          { rule_id: 'RIV-073', field_name: 'bill_of_lading_number', failure_code: 'CONFLICT', message: 'Third message' },
          { rule_id: 'RIV-010', field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message: 'First message' },
          { rule_id: 'RIV-041', field_name: 'port_of_entry_code', failure_code: 'UNKNOWN_CODE', message: 'Second message' },
        ],
      });
      await createPendingRecommendation(pool, three.exceptionId);

      const one = await createGovernedCase(pool, {
        findings: [
          { rule_id: 'RIV-010', field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message: 'Only message' },
        ],
      });
      await createPendingRecommendation(pool, one.exceptionId);

      const queue = await listQueue(pool);
      const threeRow = queue.exceptions.find((r) => r.id === three.exceptionId);
      const oneRow = queue.exceptions.find((r) => r.id === one.exceptionId);
      expect(threeRow).toBeDefined();
      expect(oneRow).toBeDefined();

      // First two messages in ascending rule_id order, then "and 1 more".
      expect(threeRow!.failure_summary).toBe('First message; Second message and 1 more');
      expect(threeRow!.finding_count).toBe(3);

      // A single finding: just its message, no "more" suffix.
      expect(oneRow!.failure_summary).toBe('Only message');
      expect(oneRow!.finding_count).toBe(1);

      // The row carries exactly the seven FR-7.5 fields.
      expect(Object.keys(oneRow!).sort()).toEqual(
        ['case_reference', 'entry_number', 'failure_summary', 'finding_count', 'id', 'receipt_position', 'received_at'].sort(),
      );
    } finally {
      await pool.end();
    }
  });

  // ── 2. permitted_decisions matrix (FR-7.8), all four reachable combinations ──

  it('2a. OPEN + PENDING ⇒ [EDIT_APPROVE, REJECT]', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const gc = await createGovernedCase(pool);
      await createPendingRecommendation(pool, gc.exceptionId);

      const detail = await loadCase(pool, 'UUID', gc.exceptionId);
      expect(typeof detail).not.toBe('string');
      const d = detail as Exclude<typeof detail, string>;
      expect(d.exception.state).toBe('OPEN');
      expect(d.recommendation.status).toBe('PENDING');
      expect(d.is_closed).toBe(false);
      expect(d.permitted_decisions).toEqual(['EDIT_APPROVE', 'REJECT']);
    } finally {
      await pool.end();
    }
  });

  it('2b. OPEN + UNAVAILABLE ⇒ [EDIT_APPROVE, REJECT]', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const gc = await createGovernedCase(pool);
      await createPendingRecommendation(pool, gc.exceptionId);
      await setRecommendationUnavailable(gc);

      const detail = await loadCase(pool, 'UUID', gc.exceptionId);
      const d = detail as Exclude<typeof detail, string>;
      expect(d.recommendation.status).toBe('UNAVAILABLE');
      expect(d.recommendation.failure_reason).toBe('PROVIDER_TIMEOUT');
      // UNAVAILABLE must NOT leak AVAILABLE-only fields.
      expect(d.recommendation.recommended_action).toBeUndefined();
      expect(d.recommendation.proposed_values).toBeUndefined();
      expect(d.permitted_decisions).toEqual(['EDIT_APPROVE', 'REJECT']);
    } finally {
      await pool.end();
    }
  });

  it('2c. OPEN + AVAILABLE ⇒ [APPROVE, EDIT_APPROVE, REJECT]', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const gc = await createGovernedCase(pool);
      await createPendingRecommendation(pool, gc.exceptionId);
      await setRecommendationAvailable(gc);

      const detail = await loadCase(pool, 'UUID', gc.exceptionId);
      const d = detail as Exclude<typeof detail, string>;
      expect(d.recommendation.status).toBe('AVAILABLE');
      expect(d.recommendation.recommended_action).toBe('APPROVE');
      expect(d.recommendation.rationale).toBe('documentation complete');
      // AVAILABLE must NOT leak UNAVAILABLE-only fields.
      expect(d.recommendation.failure_reason).toBeUndefined();
      expect(d.permitted_decisions).toEqual(['APPROVE', 'EDIT_APPROVE', 'REJECT']);
    } finally {
      await pool.end();
    }
  });

  it('2d. Closed (RESOLVED) ⇒ [] regardless of recommendation status', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const gc = await createGovernedCase(pool);
      await createPendingRecommendation(pool, gc.exceptionId);
      await closeCaseAsResolved(gc);

      const detail = await loadCase(pool, 'UUID', gc.exceptionId);
      const d = detail as Exclude<typeof detail, string>;
      expect(d.exception.state).toBe('RESOLVED');
      expect(d.is_closed).toBe(true);
      expect(d.permitted_decisions).toEqual([]);
      // A closed case carries its recorded decision.
      expect(d.decision).not.toBeNull();
      expect(d.decision!.decision_type).toBe('APPROVE');
      expect(d.decision!.decided_by.display_name).toBe('Test Specialist');
    } finally {
      await pool.end();
    }
  });

  // ── 3. Truncation boundary (FR-7.9) ─────────────────────────────────────────

  it('3a. 501 open exceptions serve as 500 rows, truncated:true, the 500 lowest receipt_position values', async () => {
    // A dedicated database: the 501-row assertion must be the ONLY open queue.
    const bulkDb = await createTestDatabase();
    const pool = poolFor(bulkDb.appUrl);
    try {
      // Build all 501 governed cases in ONE transaction (see the seeding note at
      // the top of this file): coupled to their audit entries, so the COMMIT is
      // accepted, but without 501 separate commits.
      const positions: number[] = [];
      await withTransaction(pool, async (tx) => {
        for (let i = 0; i < 501; i += 1) {
          const { receiptPosition } = await seedGovernedCaseInTx(tx, i);
          positions.push(receiptPosition);
        }
      });
      expect(positions).toHaveLength(501);

      const queue = await listQueue(pool);
      expect(queue.exceptions).toHaveLength(500);
      expect(queue.returned_count).toBe(500);
      expect(queue.truncated).toBe(true);

      // The 500 returned rows are the 500 LOWEST receipt_position values — the one
      // highest-position row is dropped ("emits the first 500", FR-7.9).
      const ascending = [...positions].sort((a, b) => a - b);
      const expected500 = ascending.slice(0, 500);
      const returnedPositions = queue.exceptions.map((r) => r.receipt_position);
      expect(returnedPositions).toEqual(expected500);
      // The highest-position row is the one dropped.
      expect(returnedPositions).not.toContain(ascending[500]);
    } finally {
      await pool.end();
      await dropTestDatabase(bulkDb);
    }
  }, 120_000);

  it('3b. a queue of ≤500 open exceptions serves whole, truncated:false', async () => {
    // A dedicated small database so the count is exact and isolated from the
    // other tests' open exceptions in the shared suite database.
    const smallDb = await createTestDatabase();
    const pool = poolFor(smallDb.appUrl);
    try {
      await withTransaction(pool, async (tx) => {
        for (let i = 0; i < 5; i += 1) {
          await seedGovernedCaseInTx(tx, i);
        }
      });
      const queue = await listQueue(pool);
      expect(queue.exceptions).toHaveLength(5);
      expect(queue.returned_count).toBe(5);
      expect(queue.truncated).toBe(false);
    } finally {
      await pool.end();
      await dropTestDatabase(smallDb);
    }
  });

  // ── 4. Identifier pass-throughs (FR-7.14) ───────────────────────────────────

  it('4. loadCase surfaces ENTRY_PASSED_VALIDATION and NOT_FOUND distinctly', async () => {
    const pool = poolFor(db.appUrl);
    try {
      const cleanRef = await createCleanEntry();
      expect(await loadCase(pool, 'CASE_REF', cleanRef)).toBe('ENTRY_PASSED_VALIDATION');

      expect(await loadCase(pool, 'UUID', randomUUID())).toBe('NOT_FOUND');
      expect(await loadCase(pool, 'CASE_REF', 'CE-2026-999999')).toBe('NOT_FOUND');
    } finally {
      await pool.end();
    }
  });
});
