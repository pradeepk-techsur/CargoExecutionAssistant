import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import {
  createGovernedCase,
  createPendingRecommendation,
  createSpecialist,
  poolFor,
  type GovernedCase,
} from '../helpers/caseFixtures.js';
import { append } from '../../src/services/audit/writer.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST-DB-05, TEST-DB-06, TEST-DB-07 — the five deferred audit-coupling triggers
// (F0 FR-0.10, F13 FR-13.4). Migration 0009 attaches a DEFERRABLE INITIALLY
// DEFERRED constraint trigger to cargo_entries, validation_results, exceptions,
// decisions and recommendations, each demanding EXACTLY ONE matching audit entry.
//
// Phase success criterion 2: a half-written transaction (a state change with no
// coupled audit entry) must fail at COMMIT rather than committing half of itself.
// Every test therefore issues its statements explicitly, awaits each (all must
// succeed), and wraps only COMMIT in expect(...).rejects.
//
// "Exactly one, not at least one" is the crux the RTM bolds: each trigger is
// exercised in BOTH directions — zero entries AND two entries — so the guarantee
// is pinned at the n <> p_count comparison, not merely at n = 0.
//
// All statements run as cargoexec_app (db.appUrl). Enforcement is never relaxed.
// ─────────────────────────────────────────────────────────────────────────────

type PgError = Error & { code?: string; constraint?: string };

function expectCouplingViolation(err: unknown): void {
  const e = err as PgError;
  expect(e).toBeInstanceOf(Error);
  expect(e.code).toBe('P0001');
  expect(e.message.startsWith('AUDIT_COUPLING_VIOLATION')).toBe(true);
}

describe('TEST-DB-05 / 06 / 07 — the five audit-coupling triggers', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await dropTestDatabase(db);
  });

  function appClient(): Promise<Client> {
    const c = new Client({ connectionString: db.appUrl });
    return c.connect().then(() => c);
  }

  async function freshCase(): Promise<GovernedCase> {
    const pool = poolFor(db.appUrl);
    try {
      return await createGovernedCase(pool);
    } finally {
      await pool.end();
    }
  }

  /** Count rows in a table matching a single-column predicate, via a short client. */
  async function countWhere(table: string, column: string, value: string): Promise<number> {
    const c = await appClient();
    try {
      // table/column are test-literal constants, never client input.
      const res = await c.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM ${table} WHERE ${column} = $1`,
        [value],
      );
      return res.rows[0]!.n;
    } finally {
      await c.end();
    }
  }

  async function readExceptionState(id: string): Promise<string> {
    const c = await appClient();
    try {
      const res = await c.query<{ state: string }>('SELECT state FROM exceptions WHERE id = $1', [id]);
      return res.rows[0]!.state;
    } finally {
      await c.end();
    }
  }

  /** Allocate a fresh CE-2026-NNNNNN case reference. */
  async function nextCaseReference(c: Client): Promise<string> {
    const res = await c.query<{ r: string }>(
      `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS r`,
    );
    return res.rows[0]!.r;
  }

  // ── TEST-DB-06 — creation coupling (a) cargo_entries, (b) validation, (c) exceptions

  it('TEST-DB-06(a): cargo_entries insert with NO ENTRY_RECEIVED entry fails at COMMIT (AUDIT_COUPLING_VIOLATION)', async () => {
    const c = await appClient();
    let caseReference = '';
    try {
      await c.query('BEGIN');
      const specialistId = await createSpecialist(c);
      caseReference = await nextCaseReference(c);
      await c.query(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
         VALUES ($1, $2, 'EXCEPTION_OPENED', 'widgets')`,
        [caseReference, specialistId],
      );
      // Deliberately append NOTHING. The INSERT above succeeded.
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
    // The whole transaction rolled back: zero rows for this reference.
    expect(await countWhere('cargo_entries', 'case_reference', caseReference)).toBe(0);
  });

  it('TEST-DB-06(a, two-entry): cargo_entries with TWO ENTRY_RECEIVED entries also fails at COMMIT (exactly one, not at least one)', async () => {
    const c = await appClient();
    let caseReference = '';
    try {
      await c.query('BEGIN');
      const specialistId = await createSpecialist(c);
      caseReference = await nextCaseReference(c);
      const entryRes = await c.query<{ id: string }>(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
         VALUES ($1, $2, 'EXCEPTION_OPENED', 'widgets') RETURNING id`,
        [caseReference, specialistId],
      );
      const caseId = entryRes.rows[0]!.id;
      // TWO ENTRY_RECEIVED entries (case_sequence 1 and 2) — the writer allows two
      // entries with the same action; the trigger requires exactly one.
      for (const seq of [1, 2]) {
        await append(c, {
          case_id: caseId,
          action_type: 'ENTRY_RECEIVED',
          actor: { type: 'SPECIALIST', specialist_id: specialistId },
          before_state: seq === 1 ? null : 'RECEIVED',
          after_state: 'RECEIVED',
        });
      }
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
    expect(await countWhere('cargo_entries', 'case_reference', caseReference)).toBe(0);
  });

  it('TEST-DB-06(b): validation_results insert with NO VALIDATION_COMPLETED entry fails at COMMIT', async () => {
    // Build a valid entry (with its ENTRY_RECEIVED) so the ONLY missing coupling
    // is the validation one — isolating trg_validation_audit.
    const c = await appClient();
    let vrId = '';
    try {
      await c.query('BEGIN');
      const specialistId = await createSpecialist(c);
      const caseReference = await nextCaseReference(c);
      const entryRes = await c.query<{ id: string }>(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
         VALUES ($1, $2, 'EXCEPTION_OPENED', 'widgets') RETURNING id`,
        [caseReference, specialistId],
      );
      const caseId = entryRes.rows[0]!.id;
      await append(c, {
        case_id: caseId,
        action_type: 'ENTRY_RECEIVED',
        actor: { type: 'SPECIALIST', specialist_id: specialistId },
        before_state: null,
        after_state: 'RECEIVED',
      });
      const vr = await c.query<{ id: string }>(
        `INSERT INTO validation_results (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
         VALUES ($1, 'FAIL', 'v1', 31, 1) RETURNING id`,
        [caseId],
      );
      vrId = vr.rows[0]!.id;
      // No VALIDATION_COMPLETED entry appended.
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
    expect(await countWhere('validation_results', 'id', vrId)).toBe(0);
  });

  it('TEST-DB-06(c): exceptions insert with NO EXCEPTION_OPENED entry fails at COMMIT', async () => {
    const c = await appClient();
    let exId = '';
    try {
      await c.query('BEGIN');
      const specialistId = await createSpecialist(c);
      const caseReference = await nextCaseReference(c);
      const entryRes = await c.query<{ id: string }>(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
         VALUES ($1, $2, 'EXCEPTION_OPENED', 'widgets') RETURNING id`,
        [caseReference, specialistId],
      );
      const caseId = entryRes.rows[0]!.id;
      await append(c, {
        case_id: caseId,
        action_type: 'ENTRY_RECEIVED',
        actor: { type: 'SPECIALIST', specialist_id: specialistId },
        before_state: null,
        after_state: 'RECEIVED',
      });
      const vr = await c.query<{ id: string }>(
        `INSERT INTO validation_results (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
         VALUES ($1, 'FAIL', 'v1', 31, 1) RETURNING id`,
        [caseId],
      );
      const vrId = vr.rows[0]!.id;
      await append(c, {
        case_id: caseId,
        action_type: 'VALIDATION_COMPLETED',
        actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
        before_state: 'RECEIVED',
        after_state: 'EXCEPTION_OPENED',
      });
      const ex = await c.query<{ id: string }>(
        `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2) RETURNING id`,
        [caseId, vrId],
      );
      exId = ex.rows[0]!.id;
      // No EXCEPTION_OPENED entry appended.
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
    expect(await countWhere('exceptions', 'id', exId)).toBe(0);
  });

  // ── TEST-DB-05 — decision coupling (d): zero entries and two entries ─────────

  it('TEST-DB-05: a decision moving the exception to RESOLVED with NO referencing audit entry fails at COMMIT', async () => {
    const gc = await freshCase();
    const c = await appClient();
    try {
      await c.query('BEGIN');
      const rec = await c.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id, status, recommended_action, rationale, model_id, prompt_version, generated_at)
         VALUES ($1, 'AVAILABLE', 'APPROVE', 'ok', 'm1', 'p1', now()) RETURNING id`,
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
      await c.query<{ id: string }>(
        `INSERT INTO decisions (exception_id, decision_type, decided_by, recommendation_id, resulting_state)
         VALUES ($1, 'APPROVE', $2, $3, 'RESOLVED') RETURNING id`,
        [gc.exceptionId, gc.specialistId, recId],
      );
      // No audit entry referencing that decision_id. trg_decisions_audit → COMMIT fails.
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
    // Zero decisions rows for this exception; exception still OPEN.
    expect(await countWhere('decisions', 'exception_id', gc.exceptionId)).toBe(0);
    expect(await readExceptionState(gc.exceptionId)).toBe('OPEN');
  });

  it('TEST-DB-05(two-entry): a decision with TWO referencing audit entries fails at COMMIT (exactly one)', async () => {
    const gc = await freshCase();
    const c = await appClient();
    try {
      await c.query('BEGIN');
      const rec = await c.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id, status, recommended_action, rationale, model_id, prompt_version, generated_at)
         VALUES ($1, 'AVAILABLE', 'APPROVE', 'ok', 'm1', 'p1', now()) RETURNING id`,
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
        `INSERT INTO decisions (exception_id, decision_type, decided_by, recommendation_id, resulting_state)
         VALUES ($1, 'APPROVE', $2, $3, 'RESOLVED') RETURNING id`,
        [gc.exceptionId, gc.specialistId, recId],
      );
      const decId = dec.rows[0]!.id;
      // TWO entries both carrying this decision_id.
      for (const _ of [0, 1]) {
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
      }
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
    expect(await countWhere('decisions', 'exception_id', gc.exceptionId)).toBe(0);
    expect(await readExceptionState(gc.exceptionId)).toBe('OPEN');
  });

  it('TEST-DB-05(positive control): a decision with EXACTLY ONE referencing audit entry COMMITs', async () => {
    const gc = await freshCase();
    const c = await appClient();
    let decId = '';
    try {
      await c.query('BEGIN');
      const rec = await c.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id, status, recommended_action, rationale, model_id, prompt_version, generated_at)
         VALUES ($1, 'AVAILABLE', 'APPROVE', 'ok', 'm1', 'p1', now()) RETURNING id`,
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
        `INSERT INTO decisions (exception_id, decision_type, decided_by, recommendation_id, resulting_state)
         VALUES ($1, 'APPROVE', $2, $3, 'RESOLVED') RETURNING id`,
        [gc.exceptionId, gc.specialistId, recId],
      );
      decId = dec.rows[0]!.id;
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
        `UPDATE exceptions SET state='RESOLVED', closed_at=now(), decision_id=$2 WHERE id=$1`,
        [gc.exceptionId, decId],
      );
      await c.query('COMMIT');
    } finally {
      await c.end();
    }
    expect(await countWhere('decisions', 'id', decId)).toBe(1);
    expect(await readExceptionState(gc.exceptionId)).toBe('RESOLVED');
  });

  // ── TEST-DB-07 — recommendation terminal coupling (e) ───────────────────────

  it('TEST-DB-07: PENDING -> AVAILABLE with NO RECOMMENDATION_GENERATED entry fails at COMMIT', async () => {
    const gc = await freshCase();
    const pool = poolFor(db.appUrl);
    let recId = '';
    try {
      recId = await createPendingRecommendation(pool, gc.exceptionId);
    } finally {
      await pool.end();
    }
    const c = await appClient();
    try {
      await c.query('BEGIN');
      await c.query(
        `UPDATE recommendations
           SET status='AVAILABLE', recommended_action='APPROVE', rationale='ok',
               model_id='m1', prompt_version='p1', generated_at=now()
         WHERE id=$1`,
        [recId],
      );
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
    // Rolled back: still PENDING.
    const c2 = await appClient();
    try {
      const res = await c2.query<{ status: string }>('SELECT status FROM recommendations WHERE id=$1', [recId]);
      expect(res.rows[0]!.status).toBe('PENDING');
    } finally {
      await c2.end();
    }
  });

  it('TEST-DB-07(two-entry): AVAILABLE with TWO RECOMMENDATION_GENERATED entries fails at COMMIT', async () => {
    const gc = await freshCase();
    const pool = poolFor(db.appUrl);
    let recId = '';
    try {
      recId = await createPendingRecommendation(pool, gc.exceptionId);
    } finally {
      await pool.end();
    }
    const c = await appClient();
    try {
      await c.query('BEGIN');
      await c.query(
        `UPDATE recommendations
           SET status='AVAILABLE', recommended_action='APPROVE', rationale='ok',
               model_id='m1', prompt_version='p1', generated_at=now()
         WHERE id=$1`,
        [recId],
      );
      for (const _ of [0, 1]) {
        await append(c, {
          case_id: gc.caseId,
          exception_id: gc.exceptionId,
          recommendation_id: recId,
          action_type: 'RECOMMENDATION_GENERATED',
          actor: { type: 'AI' },
          before_state: 'PENDING',
          after_state: 'AVAILABLE',
        });
      }
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
  });

  it('TEST-DB-07: PENDING -> UNAVAILABLE with NO RECOMMENDATION_UNAVAILABLE entry fails at COMMIT', async () => {
    const gc = await freshCase();
    const pool = poolFor(db.appUrl);
    let recId = '';
    try {
      recId = await createPendingRecommendation(pool, gc.exceptionId);
    } finally {
      await pool.end();
    }
    const c = await appClient();
    try {
      await c.query('BEGIN');
      await c.query(
        `UPDATE recommendations
           SET status='UNAVAILABLE', failure_reason='PROVIDER_TIMEOUT', failed_at=now()
         WHERE id=$1`,
        [recId],
      );
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
  });

  it('TEST-DB-07: a GENERATED entry paired with a move to UNAVAILABLE (wrong action for the status) fails at COMMIT', async () => {
    // The trigger matches on the EXPECTED action for the status: UNAVAILABLE
    // demands a RECOMMENDATION_UNAVAILABLE entry, so a RECOMMENDATION_GENERATED
    // entry does not satisfy it.
    const gc = await freshCase();
    const pool = poolFor(db.appUrl);
    let recId = '';
    try {
      recId = await createPendingRecommendation(pool, gc.exceptionId);
    } finally {
      await pool.end();
    }
    const c = await appClient();
    try {
      await c.query('BEGIN');
      await c.query(
        `UPDATE recommendations
           SET status='UNAVAILABLE', failure_reason='PROVIDER_TIMEOUT', failed_at=now()
         WHERE id=$1`,
        [recId],
      );
      await append(c, {
        case_id: gc.caseId,
        exception_id: gc.exceptionId,
        recommendation_id: recId,
        action_type: 'RECOMMENDATION_GENERATED', // wrong action for UNAVAILABLE
        actor: { type: 'AI' },
        before_state: 'PENDING',
        after_state: 'UNAVAILABLE',
      });
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectCouplingViolation(threw);
    } finally {
      await c.end();
    }
  });

  it('TEST-DB-07(positive control, AVAILABLE): exactly one RECOMMENDATION_GENERATED entry COMMITs', async () => {
    const gc = await freshCase();
    const pool = poolFor(db.appUrl);
    let recId = '';
    try {
      recId = await createPendingRecommendation(pool, gc.exceptionId);
    } finally {
      await pool.end();
    }
    const c = await appClient();
    try {
      await c.query('BEGIN');
      await c.query(
        `UPDATE recommendations
           SET status='AVAILABLE', recommended_action='APPROVE', rationale='ok',
               model_id='m1', prompt_version='p1', generated_at=now()
         WHERE id=$1`,
        [recId],
      );
      await append(c, {
        case_id: gc.caseId,
        exception_id: gc.exceptionId,
        recommendation_id: recId,
        action_type: 'RECOMMENDATION_GENERATED',
        actor: { type: 'AI' },
        before_state: 'PENDING',
        after_state: 'AVAILABLE',
      });
      await c.query('COMMIT');
    } finally {
      await c.end();
    }
    const c2 = await appClient();
    try {
      const res = await c2.query<{ status: string }>('SELECT status FROM recommendations WHERE id=$1', [recId]);
      expect(res.rows[0]!.status).toBe('AVAILABLE');
    } finally {
      await c2.end();
    }
  });

  it('TEST-DB-07(positive control, UNAVAILABLE): exactly one RECOMMENDATION_UNAVAILABLE entry COMMITs', async () => {
    const gc = await freshCase();
    const pool = poolFor(db.appUrl);
    let recId = '';
    try {
      recId = await createPendingRecommendation(pool, gc.exceptionId);
    } finally {
      await pool.end();
    }
    const c = await appClient();
    try {
      await c.query('BEGIN');
      await c.query(
        `UPDATE recommendations
           SET status='UNAVAILABLE', failure_reason='PROVIDER_TIMEOUT', failed_at=now()
         WHERE id=$1`,
        [recId],
      );
      await append(c, {
        case_id: gc.caseId,
        exception_id: gc.exceptionId,
        recommendation_id: recId,
        action_type: 'RECOMMENDATION_UNAVAILABLE',
        actor: { type: 'AI' },
        before_state: 'PENDING',
        after_state: 'UNAVAILABLE',
      });
      await c.query('COMMIT');
    } finally {
      await c.end();
    }
    const c2 = await appClient();
    try {
      const res = await c2.query<{ status: string }>('SELECT status FROM recommendations WHERE id=$1', [recId]);
      expect(res.rows[0]!.status).toBe('UNAVAILABLE');
    } finally {
      await c2.end();
    }
  });

  it('TEST-DB-07: inserting a PENDING recommendation needs NO audit entry and COMMITs (trigger returns early for PENDING)', async () => {
    const gc = await freshCase();
    const c = await appClient();
    let recId = '';
    try {
      await c.query('BEGIN');
      const rec = await c.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id, status) VALUES ($1, 'PENDING') RETURNING id`,
        [gc.exceptionId],
      );
      recId = rec.rows[0]!.id;
      // No audit entry — FRD §0.6: (none)->PENDING writes no entry of its own.
      await c.query('COMMIT');
    } finally {
      await c.end();
    }
    expect(await countWhere('recommendations', 'id', recId)).toBe(1);
  });

  // ── SM-6 — one audit entry per state transition, gapless case_sequence ───────

  it('SM-6: a case taken through the fixture path plus one decision has exactly 4 audit entries, case_sequence 1..4 with no gap', async () => {
    // The fixture wrote 3 transitions (ENTRY_RECEIVED, VALIDATION_COMPLETED,
    // EXCEPTION_OPENED). A REJECT decision adds exactly one more — and, unlike
    // APPROVE, needs no recommendation, so the whole case's audit history is
    // precisely 4 entries with no intervening recommendation lifecycle. That is
    // SM-6 in its cleanest form: one audit entry per state change, gapless.
    const gc = await freshCase();
    const c = await appClient();
    try {
      await c.query('BEGIN');
      const dec = await c.query<{ id: string }>(
        `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, resulting_state)
         VALUES ($1, 'REJECT', $2, 'documentation cannot be verified against manifest', 'REJECTED') RETURNING id`,
        [gc.exceptionId, gc.specialistId],
      );
      const decId = dec.rows[0]!.id;
      await append(c, {
        case_id: gc.caseId,
        exception_id: gc.exceptionId,
        decision_id: decId,
        action_type: 'RECOMMENDATION_REJECTED',
        actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
        before_state: 'OPEN',
        after_state: 'REJECTED',
        reason: 'documentation cannot be verified against manifest',
      });
      await c.query(
        `UPDATE exceptions SET state='REJECTED', closed_at=now(), decision_id=$2 WHERE id=$1`,
        [gc.exceptionId, decId],
      );
      await c.query('COMMIT');
    } finally {
      await c.end();
    }

    const c2 = await appClient();
    try {
      const res = await c2.query<{ case_sequence: number; action_type: string }>(
        `SELECT case_sequence, action_type FROM audit_entries WHERE case_id=$1 ORDER BY case_sequence`,
        [gc.caseId],
      );
      const seqs = res.rows.map((r) => Number(r.case_sequence));
      // Exactly one audit entry per state transition: 3 (fixture) + 1 (decision) = 4.
      expect(res.rows.length).toBe(4);
      // case_sequence is exactly 1,2,3,4 — gapless.
      expect(seqs).toEqual([1, 2, 3, 4]);
    } finally {
      await c2.end();
    }
  });
});
