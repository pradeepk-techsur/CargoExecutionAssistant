import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import { createGovernedCase, poolFor, type GovernedCase } from '../helpers/caseFixtures.js';
import { append } from '../../src/services/audit/writer.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST-DB-04 — human-in-the-loop refusal (F0 FR-0.9, trg_exceptions_hitl)
// TEST-DB-18 — closure consistency CHECK (F5 FR-5.14,
//              exceptions_closure_consistency_chk)
//
// Phase success criterion 3: an exception cannot leave OPEN without a matching
// human decision, and the refusal must hold *even from a direct SQL session with
// full application privileges*. So every statement here runs as `cargoexec_app`
// (db.appUrl) — exactly those privileges, not the owner's.
//
// The distinction criterion 2 turns on — "fails at COMMIT rather than committing
// half of itself" — is asserted structurally: the individual INSERT/UPDATE
// statements are issued one at a time and awaited (each must succeed), and only
// the COMMIT is wrapped in `expect(...).rejects`. That is what separates a
// DEFERRABLE INITIALLY DEFERRED constraint trigger (COMMIT-time, P0001) from an
// immediate CHECK (statement-time, 23514).
//
// This suite never relaxes enforcement to "make the error arrive earlier": no
// forcing constraints immediate, no disabling a trigger, no replication-role
// escape hatch. Doing so would defeat the whole point.
// ─────────────────────────────────────────────────────────────────────────────

/** A pg error narrowed to the fields these assertions read. */
type PgError = Error & { code?: string; constraint?: string };

/** Assert a thrown value is a Postgres error with the given SQLSTATE (+ optional constraint). */
function expectPgError(err: unknown, sqlstate: string, constraint?: string): void {
  const e = err as PgError;
  expect(e).toBeInstanceOf(Error);
  expect(e.code).toBe(sqlstate);
  if (constraint !== undefined) {
    expect(e.constraint).toBe(constraint);
  }
}

/** Assert a P0001 whose message begins with the given governance prefix. */
function expectRaise(err: unknown, prefix: string): void {
  const e = err as PgError;
  expect(e).toBeInstanceOf(Error);
  expect(e.code).toBe('P0001');
  expect(e.message.startsWith(prefix)).toBe(true);
}

describe('TEST-DB-04 / TEST-DB-18 — human-in-the-loop and closure consistency', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await dropTestDatabase(db);
  });

  /** A fresh, fully-audited OPEN exception built through the product's own path. */
  async function freshCase(): Promise<GovernedCase> {
    const pool = poolFor(db.appUrl);
    try {
      return await createGovernedCase(pool);
    } finally {
      await pool.end();
    }
  }

  /** Re-read an exception's closure-relevant columns via a short-lived app client. */
  async function readException(
    id: string,
  ): Promise<{ state: string; closed_at: Date | null; decision_id: string | null }> {
    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      const res = await c.query<{ state: string; closed_at: Date | null; decision_id: string | null }>(
        'SELECT state, closed_at, decision_id FROM exceptions WHERE id = $1',
        [id],
      );
      const row = res.rows[0];
      if (row === undefined) throw new Error('readException: exception not found');
      return row;
    } finally {
      await c.end();
    }
  }

  /** verify_audit_chain must still hold after any refused transaction. */
  async function chainOk(caseId: string): Promise<boolean> {
    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      const res = await c.query<{ chain_verified: boolean }>(
        'SELECT chain_verified FROM verify_audit_chain($1)',
        [caseId],
      );
      return res.rows[0]?.chain_verified === true;
    } finally {
      await c.end();
    }
  }

  // ── TEST-DB-04 ────────────────────────────────────────────────────────────

  it('TEST-DB-04(a): decision_id referencing no decisions row fails on the FK at the statement (23503, exceptions_decision_fk)', async () => {
    const gc = await freshCase();
    const fakeUuid = '00000000-0000-0000-0000-0000000000ff';

    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      await c.query('BEGIN');
      // This is the FIRST enforcement layer and worth asserting on its own: the
      // FK rejects a decision_id that points at nothing, at the statement.
      let threw: unknown;
      try {
        await c.query(
          `UPDATE exceptions SET state = 'RESOLVED', closed_at = now(), decision_id = $2 WHERE id = $1`,
          [gc.exceptionId, fakeUuid],
        );
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectPgError(threw, '23503', 'exceptions_decision_fk');
      await c.query('ROLLBACK');
    } finally {
      await c.end();
    }

    const ex = await readException(gc.exceptionId);
    expect(ex.state).toBe('OPEN');
    expect(ex.closed_at).toBeNull();
    expect(ex.decision_id).toBeNull();
    expect(await chainOk(gc.caseId)).toBe(true);
  });

  it("TEST-DB-04(b): a decision for a DIFFERENT exception satisfies the FK but the COMMIT raises HITL_VIOLATION (d.exception_id <> NEW.id)", async () => {
    const gc = await freshCase();
    const other = await freshCase();

    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      await c.query('BEGIN');

      // 1. A recommendation for the OTHER exception, moved to AVAILABLE with its
      //    coupled entry, so the decision's recommendation_id is real. (APPROVE
      //    needs a recommendation_id per decisions_approve_needs_recommendation_chk.)
      const rec = await c.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id, status, recommended_action, rationale, model_id, prompt_version, generated_at)
         VALUES ($1, 'AVAILABLE', 'APPROVE', 'looks fine', 'm1', 'p1', now()) RETURNING id`,
        [other.exceptionId],
      );
      const recId = rec.rows[0]!.id;
      await append(c, {
        case_id: other.caseId,
        exception_id: other.exceptionId,
        recommendation_id: recId,
        action_type: 'RECOMMENDATION_GENERATED',
        actor: { type: 'AI' },
        before_state: 'OPEN',
        after_state: 'AVAILABLE',
      });

      // 2. A decision that belongs to the OTHER exception.
      const dec = await c.query<{ id: string }>(
        `INSERT INTO decisions (exception_id, decision_type, decided_by, recommendation_id, resulting_state)
         VALUES ($1, 'APPROVE', $2, $3, 'RESOLVED') RETURNING id`,
        [other.exceptionId, other.specialistId, recId],
      );
      const decId = dec.rows[0]!.id;
      // The decision's own coupling entry (so trg_decisions_audit is satisfied at COMMIT).
      await append(c, {
        case_id: other.caseId,
        exception_id: other.exceptionId,
        recommendation_id: recId,
        decision_id: decId,
        action_type: 'RECOMMENDATION_APPROVED',
        actor: { type: 'SPECIALIST', specialist_id: other.specialistId },
        before_state: 'OPEN',
        after_state: 'RESOLVED',
      });

      // 3. Now point OUR (unrelated) exception at that decision. The FK is
      //    satisfied (decId exists) but d.exception_id <> gc.exceptionId, so the
      //    HITL trigger has no matching decision for this exception.
      await c.query(
        `UPDATE exceptions SET state = 'RESOLVED', closed_at = now(), decision_id = $2 WHERE id = $1`,
        [gc.exceptionId, decId],
      );

      // Every statement above SUCCEEDED. Only the COMMIT must throw, and at the
      // deferred HITL trigger — this is criterion 2's "fails at COMMIT" in the flesh.
      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectRaise(threw, 'HITL_VIOLATION');
    } finally {
      await c.end();
    }

    const ex = await readException(gc.exceptionId);
    expect(ex.state).toBe('OPEN');
    expect(ex.closed_at).toBeNull();
    expect(ex.decision_id).toBeNull();
    expect(await chainOk(gc.caseId)).toBe(true);
  });

  it('TEST-DB-04(c): a decision whose resulting_state <> the new state raises HITL_VIOLATION at COMMIT', async () => {
    const gc = await freshCase();

    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      await c.query('BEGIN');

      // A REJECT decision (resulting_state = 'REJECTED') for THIS exception, with
      // its coupling entry. A REJECT reason must be >= 10 non-blank chars.
      const dec = await c.query<{ id: string }>(
        `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, resulting_state)
         VALUES ($1, 'REJECT', $2, 'insufficient documentation provided', 'REJECTED') RETURNING id`,
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
        reason: 'insufficient documentation provided',
      });

      // Move the exception to RESOLVED — but the decision resolves to REJECTED,
      // so d.resulting_state <> NEW.state and the trigger refuses at COMMIT.
      await c.query(
        `UPDATE exceptions SET state = 'RESOLVED', closed_at = now(), decision_id = $2 WHERE id = $1`,
        [gc.exceptionId, decId],
      );

      let threw: unknown;
      try {
        await c.query('COMMIT');
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectRaise(threw, 'HITL_VIOLATION');
    } finally {
      await c.end();
    }

    const ex = await readException(gc.exceptionId);
    expect(ex.state).toBe('OPEN');
    expect(ex.decision_id).toBeNull();
    expect(await chainOk(gc.caseId)).toBe(true);
  });

  it('TEST-DB-04(d): the human-identity crux — a decision naming a non-existent specialist fails on decisions_decided_by_fkey (23503) before any trigger', async () => {
    // FR-0.9 / TechArch §2.8: decisions.decided_by is NOT NULL REFERENCES
    // specialists(id) and specialists has no AI/SYSTEM row, so a machine-authored
    // decision fails the foreign key at the INSERT statement — before the deferred
    // HITL trigger is ever consulted. This is the structural reason "resolved by
    // the AI" is unrepresentable.
    const gc = await freshCase();
    const randomSpecialist = '00000000-0000-0000-0000-0000000000aa';

    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      await c.query('BEGIN');
      let threw: unknown;
      try {
        await c.query(
          `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, resulting_state)
           VALUES ($1, 'REJECT', $2, 'a machine tried to decide this on its own', 'REJECTED')`,
          [gc.exceptionId, randomSpecialist],
        );
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      // FR-0.9 / TechArch §2.8: no specialists row for a machine → FK refusal.
      expectPgError(threw, '23503', 'decisions_decided_by_fkey');
      await c.query('ROLLBACK');
    } finally {
      await c.end();
    }
  });

  it('TEST-DB-04(positive control): a correctly formed resolution — matching decision + its audit entry — COMMITs successfully', async () => {
    const gc = await freshCase();

    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      await c.query('BEGIN');

      // A real AVAILABLE recommendation for this exception (APPROVE needs one).
      const rec = await c.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id, status, recommended_action, rationale, model_id, prompt_version, generated_at)
         VALUES ($1, 'AVAILABLE', 'APPROVE', 'documentation complete', 'm1', 'p1', now()) RETURNING id`,
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

      // The one RECOMMENDATION_APPROVED entry referencing that decision, by a real specialist.
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

      // Without this control a suite that accidentally broke every write would
      // masquerade as a pass. It must COMMIT cleanly.
      await c.query('COMMIT');
    } finally {
      await c.end();
    }

    const ex = await readException(gc.exceptionId);
    expect(ex.state).toBe('RESOLVED');
    expect(ex.closed_at).not.toBeNull();
    expect(ex.decision_id).not.toBeNull();
    expect(await chainOk(gc.caseId)).toBe(true);
  });

  // ── TEST-DB-18 — closure consistency CHECK (immediate: statement, not COMMIT) ─

  const closureCases: { label: string; sql: string }[] = [
    {
      label: "state='RESOLVED' with decision_id NULL",
      sql: `UPDATE exceptions SET state='RESOLVED', closed_at=now(), decision_id=NULL WHERE id=$1`,
    },
    {
      label: "state='RESOLVED' with closed_at NULL",
      // decision_id set to a syntactically valid uuid; the CHECK fires before the FK
      // is relevant because closed_at IS NULL breaks the (state<>'OPEN') branch.
      sql: `UPDATE exceptions SET state='RESOLVED', closed_at=NULL, decision_id='00000000-0000-0000-0000-0000000000bb' WHERE id=$1`,
    },
    {
      label: "state='REJECTED' with both closed_at and decision_id NULL",
      sql: `UPDATE exceptions SET state='REJECTED', closed_at=NULL, decision_id=NULL WHERE id=$1`,
    },
    {
      label: "state='OPEN' with a non-null decision_id",
      sql: `UPDATE exceptions SET state='OPEN', closed_at=NULL, decision_id='00000000-0000-0000-0000-0000000000bb' WHERE id=$1`,
    },
    {
      label: "state='OPEN' with a non-null closed_at",
      sql: `UPDATE exceptions SET state='OPEN', closed_at=now(), decision_id=NULL WHERE id=$1`,
    },
  ];

  for (const tc of closureCases) {
    it(`TEST-DB-18: closure inconsistency rejected at the STATEMENT with 23514 (exceptions_closure_consistency_chk) — ${tc.label}`, async () => {
      const gc = await freshCase();
      const c = new Client({ connectionString: db.appUrl });
      await c.connect();
      try {
        await c.query('BEGIN');
        let threw: unknown;
        try {
          await c.query(tc.sql, [gc.exceptionId]);
        } catch (err) {
          threw = err;
        }
        // The CHECK is immediate: it fails at the UPDATE statement, not at COMMIT.
        // That is what distinguishes the CHECK layer from the deferred triggers.
        expect(threw).toBeDefined();
        expectPgError(threw, '23514', 'exceptions_closure_consistency_chk');
        await c.query('ROLLBACK');
      } finally {
        await c.end();
      }

      const ex = await readException(gc.exceptionId);
      expect(ex.state).toBe('OPEN');
      expect(ex.closed_at).toBeNull();
      expect(ex.decision_id).toBeNull();
    });
  }
});
