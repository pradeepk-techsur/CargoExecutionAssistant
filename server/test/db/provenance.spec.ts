import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import { createGovernedCase, poolFor, type GovernedCase } from '../helpers/caseFixtures.js';
import { append } from '../../src/services/audit/writer.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST-DB-08 — exception derivation integrity  (FR-0.11)
// TEST-DB-09 — one decision per exception, ever (FR-0.12)
// TEST-DB-10 — the 10-character reason floor    (FR-0.15, US-0.5)
// TEST-DB-11 — an audit value with no origin is rejected (FR-13.9, SM-3)
// TEST-DB-12 — constant origins                 (FR-0.2, FR-0.3)
//
// Phase success criterion 4: no default, no nullable path, and no insert route
// yields a stored value without an AI or HUMAN origin. These are CHECK / UNIQUE /
// FK / NOT NULL constraints — immediate, so they fail at the STATEMENT (not at
// COMMIT). Every refusal is asserted by SQLSTATE AND the named constraint, so a
// broken table could not masquerade as a pass. All statements run as
// cargoexec_app; enforcement is never relaxed.
// ─────────────────────────────────────────────────────────────────────────────

type PgError = Error & { code?: string; constraint?: string };

function expectPgError(err: unknown, sqlstate: string, constraint?: string): void {
  const e = err as PgError;
  expect(e).toBeInstanceOf(Error);
  expect(e.code).toBe(sqlstate);
  if (constraint !== undefined) {
    expect(e.constraint).toBe(constraint);
  }
}

describe('TEST-DB-08..12 — derivation, single decision, reason floor, origin integrity', () => {
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

  /** Run a single statement in its own transaction and capture any thrown error. */
  async function attempt(sql: string, params: unknown[]): Promise<unknown> {
    const c = await appClient();
    try {
      await c.query('BEGIN');
      let threw: unknown;
      try {
        await c.query(sql, params);
      } catch (err) {
        threw = err;
      }
      await c.query('ROLLBACK');
      return threw;
    } finally {
      await c.end();
    }
  }

  /** Run a single statement expected to SUCCEED; commits it. */
  async function succeed(sql: string, params: unknown[]): Promise<void> {
    const c = await appClient();
    try {
      await c.query('BEGIN');
      await c.query(sql, params);
      await c.query('COMMIT');
    } finally {
      await c.end();
    }
  }

  /** An id of a real audit_entries row for the given case (case_sequence 1). */
  async function anAuditEntryId(caseId: string): Promise<string> {
    const c = await appClient();
    try {
      const res = await c.query<{ id: string }>(
        'SELECT id FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence LIMIT 1',
        [caseId],
      );
      return res.rows[0]!.id;
    } finally {
      await c.end();
    }
  }

  /** A real recommendation_id (AVAILABLE, with its coupling entry) for an exception. */
  async function anAvailableRecommendation(gc: GovernedCase): Promise<string> {
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
      await c.query('COMMIT');
      return recId;
    } finally {
      await c.end();
    }
  }

  /** Record a valid REJECT decision (with its coupling entry) and return its id. */
  async function aRecordedDecision(gc: GovernedCase): Promise<string> {
    const c = await appClient();
    try {
      await c.query('BEGIN');
      const dec = await c.query<{ id: string }>(
        `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, resulting_state)
         VALUES ($1, 'REJECT', $2, 'documentation cannot be reconciled', 'REJECTED') RETURNING id`,
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
        reason: 'documentation cannot be reconciled',
      });
      await c.query(
        `UPDATE exceptions SET state='REJECTED', closed_at=now(), decision_id=$2 WHERE id=$1`,
        [gc.exceptionId, decId],
      );
      await c.query('COMMIT');
      return decId;
    } finally {
      await c.end();
    }
  }

  // ── TEST-DB-08 — exception derivation integrity (no trigger involved) ────────

  it('TEST-DB-08(a): a PASS-basis exception is rejected by exceptions_basis_is_failure_chk (23514) when validation_outcome is spelled PASS', async () => {
    // Build a fresh entry with a PASS validation result and its coupling entry.
    const c = await appClient();
    let vrId = '';
    try {
      await c.query('BEGIN');
      const sp = await c.query<{ id: string }>(
        `INSERT INTO specialists (email, display_name, password_hash)
         VALUES ($1, 'X', 'argon2id$placeholder') RETURNING id`,
        [`pass-${Date.now()}-a@example.gov`],
      );
      const specialistId = sp.rows[0]!.id;
      const ref = await c.query<{ r: string }>(
        `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS r`,
      );
      const entry = await c.query<{ id: string }>(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
         VALUES ($1, $2, 'VALIDATED_CLEAN', 'clean goods') RETURNING id`,
        [ref.rows[0]!.r, specialistId],
      );
      const caseId = entry.rows[0]!.id;
      await append(c, {
        case_id: caseId,
        action_type: 'ENTRY_RECEIVED',
        actor: { type: 'SPECIALIST', specialist_id: specialistId },
        before_state: null,
        after_state: 'RECEIVED',
      });
      const vr = await c.query<{ id: string }>(
        `INSERT INTO validation_results (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
         VALUES ($1, 'PASS', 'v1', 31, 0) RETURNING id`,
        [caseId],
      );
      vrId = vr.rows[0]!.id;
      await append(c, {
        case_id: caseId,
        action_type: 'VALIDATION_COMPLETED',
        actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
        before_state: 'RECEIVED',
        after_state: 'VALIDATED_CLEAN',
      });

      // Spelling 1: supply validation_outcome='PASS' explicitly. The
      // exceptions_basis_is_failure_chk CHECK (validation_outcome='FAIL') fails
      // at the statement, with no trigger in the message.
      let threw: unknown;
      try {
        await c.query(
          `INSERT INTO exceptions (entry_id, validation_result_id, validation_outcome)
           VALUES ($1, $2, 'PASS')`,
          [caseId, vrId],
        );
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectPgError(threw, '23514', 'exceptions_basis_is_failure_chk');
      const msg = (threw as PgError).message;
      expect(msg.includes('trigger')).toBe(false);
      await c.query('ROLLBACK');
    } finally {
      await c.end();
    }
    expect(vrId).not.toBe('');
  });

  it('TEST-DB-08(b): a PASS-basis exception with the default validation_outcome (FAIL) is rejected by the composite FK exceptions_basis_fk (23503)', async () => {
    const c = await appClient();
    try {
      await c.query('BEGIN');
      const sp = await c.query<{ id: string }>(
        `INSERT INTO specialists (email, display_name, password_hash)
         VALUES ($1, 'X', 'argon2id$placeholder') RETURNING id`,
        [`pass-${Date.now()}-b@example.gov`],
      );
      const specialistId = sp.rows[0]!.id;
      const ref = await c.query<{ r: string }>(
        `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS r`,
      );
      const entry = await c.query<{ id: string }>(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
         VALUES ($1, $2, 'VALIDATED_CLEAN', 'clean goods') RETURNING id`,
        [ref.rows[0]!.r, specialistId],
      );
      const caseId = entry.rows[0]!.id;
      await append(c, {
        case_id: caseId,
        action_type: 'ENTRY_RECEIVED',
        actor: { type: 'SPECIALIST', specialist_id: specialistId },
        before_state: null,
        after_state: 'RECEIVED',
      });
      const vr = await c.query<{ id: string }>(
        `INSERT INTO validation_results (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
         VALUES ($1, 'PASS', 'v1', 31, 0) RETURNING id`,
        [caseId],
      );
      const vrId = vr.rows[0]!.id;
      await append(c, {
        case_id: caseId,
        action_type: 'VALIDATION_COMPLETED',
        actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
        before_state: 'RECEIVED',
        after_state: 'VALIDATED_CLEAN',
      });

      // Spelling 2: omit validation_outcome (defaults to 'FAIL'). Now
      // exceptions_basis_is_failure_chk passes, but the composite FK
      // (validation_result_id,'FAIL') references no row — the PASS result only
      // has a (id,'PASS') pair — so exceptions_basis_fk fails at the statement.
      let threw: unknown;
      try {
        await c.query(
          `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2)`,
          [caseId, vrId],
        );
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectPgError(threw, '23503', 'exceptions_basis_fk');
      const msg = (threw as PgError).message;
      expect(msg.includes('trigger')).toBe(false);
      await c.query('ROLLBACK');
    } finally {
      await c.end();
    }
  });

  it('TEST-DB-08(positive control): an exception referencing a FAIL result is accepted (the fixture already builds one)', async () => {
    const gc = await freshCase();
    const c = await appClient();
    try {
      const res = await c.query<{ state: string; validation_outcome: string }>(
        'SELECT state, validation_outcome FROM exceptions WHERE id = $1',
        [gc.exceptionId],
      );
      expect(res.rows[0]!.state).toBe('OPEN');
      expect(res.rows[0]!.validation_outcome).toBe('FAIL');
    } finally {
      await c.end();
    }
  });

  // ── TEST-DB-09 — one decision per exception, ever ───────────────────────────

  it('TEST-DB-09: a second decision for the same exception is rejected by uq_decisions_exception (23505)', async () => {
    const gc = await freshCase();
    // First decision recorded (surfaced by F11 as HTTP 409 EXCEPTION_ALREADY_DECIDED,
    // but the guarantee lives HERE — a unique index, not the API).
    await aRecordedDecision(gc);

    const threw = await attempt(
      `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, resulting_state)
       VALUES ($1, 'REJECT', $2, 'a second decision must never be recorded', 'REJECTED')`,
      [gc.exceptionId, gc.specialistId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23505', 'uq_decisions_exception');
  });

  // ── TEST-DB-10 — the reason floor, bypassing the API entirely (US-0.5) ───────
  //
  // US-0.5's "inserted directly in SQL bypassing the API" criterion: this is the
  // STORAGE invariant (decisions_reason_required_chk), not the API rule. Every
  // blank, whitespace-only and 9-character reason on EDIT_APPROVE / REJECT is
  // refused by the database; a 10-character reason is accepted, pinning the
  // boundary in both directions.

  for (const decisionType of ['EDIT_APPROVE', 'REJECT'] as const) {
    const resultingState = decisionType === 'REJECT' ? 'REJECTED' : 'RESOLVED';
    const badReasons: { label: string; reason: string | null }[] = [
      { label: 'NULL', reason: null },
      { label: 'empty string', reason: '' },
      { label: 'whitespace only', reason: '   ' },
      { label: "'ok' (2 chars)", reason: 'ok' },
      { label: '9 characters', reason: '123456789' },
    ];

    for (const br of badReasons) {
      it(`TEST-DB-10: ${decisionType} with reason ${br.label} is rejected by decisions_reason_required_chk (23514)`, async () => {
        const gc = await freshCase();
        // EDIT_APPROVE requires a recommendation_id? No — only APPROVE does
        // (decisions_approve_needs_recommendation_chk). Supply one anyway for
        // EDIT_APPROVE realism; REJECT needs none.
        const recId = decisionType === 'EDIT_APPROVE' ? await anAvailableRecommendation(gc) : null;
        const threw = await attempt(
          `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, recommendation_id, resulting_state)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [gc.exceptionId, decisionType, gc.specialistId, br.reason, recId, resultingState],
        );
        expect(threw).toBeDefined();
        expectPgError(threw, '23514', 'decisions_reason_required_chk');
      });
    }

    it(`TEST-DB-10: ${decisionType} with a 10-character reason is ACCEPTED (boundary pinned)`, async () => {
      const gc = await freshCase();
      const recId = decisionType === 'EDIT_APPROVE' ? await anAvailableRecommendation(gc) : null;
      // A bare INSERT of the decision fails the deferred coupling trigger at
      // COMMIT unless its audit entry exists — so record it the proper way.
      const c = await appClient();
      let ok = false;
      try {
        await c.query('BEGIN');
        const dec = await c.query<{ id: string }>(
          `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, recommendation_id, resulting_state)
           VALUES ($1, $2, $3, '1234567890', $4, $5) RETURNING id`,
          [gc.exceptionId, decisionType, gc.specialistId, recId, resultingState],
        );
        const decId = dec.rows[0]!.id;
        await append(c, {
          case_id: gc.caseId,
          exception_id: gc.exceptionId,
          recommendation_id: recId,
          decision_id: decId,
          action_type:
            decisionType === 'REJECT' ? 'RECOMMENDATION_REJECTED' : 'RECOMMENDATION_EDITED_AND_APPROVED',
          actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
          before_state: 'OPEN',
          after_state: resultingState,
          reason: '1234567890',
        });
        await c.query(
          `UPDATE exceptions SET state=$2, closed_at=now(), decision_id=$3 WHERE id=$1`,
          [gc.exceptionId, resultingState, decId],
        );
        await c.query('COMMIT');
        ok = true;
      } finally {
        await c.end();
      }
      expect(ok).toBe(true);
    });
  }

  it('TEST-DB-10: a 2001-character reason is rejected by decisions_reason_len_chk (23514)', async () => {
    const gc = await freshCase();
    const longReason = 'x'.repeat(2001);
    const threw = await attempt(
      `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, resulting_state)
       VALUES ($1, 'REJECT', $2, $3, 'REJECTED')`,
      [gc.exceptionId, gc.specialistId, longReason],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'decisions_reason_len_chk');
  });

  it('TEST-DB-10: APPROVE with a NULL reason is ACCEPTED (a reason is not required for a plain approval)', async () => {
    const gc = await freshCase();
    const recId = await anAvailableRecommendation(gc);
    const c = await appClient();
    let ok = false;
    try {
      await c.query('BEGIN');
      const dec = await c.query<{ id: string }>(
        `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, recommendation_id, resulting_state)
         VALUES ($1, 'APPROVE', $2, NULL, $3, 'RESOLVED') RETURNING id`,
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
        `UPDATE exceptions SET state='RESOLVED', closed_at=now(), decision_id=$2 WHERE id=$1`,
        [gc.exceptionId, decId],
      );
      await c.query('COMMIT');
      ok = true;
    } finally {
      await c.end();
    }
    expect(ok).toBe(true);
  });

  // ── TEST-DB-11 — an audit value with no origin is rejected ───────────────────
  //
  // SM-3 in its hardest form: zero unattributed values. The value tables accept a
  // direct INSERT (only mutation is blocked), so we insert directly and assert the
  // CHECKs on origin presence, some-value, and the origin domain.

  it('TEST-DB-11: after_value with NULL after_origin is rejected by aev_origin_present_chk (23514)', async () => {
    const gc = await freshCase();
    const entryId = await anAuditEntryId(gc.caseId);
    const threw = await attempt(
      `INSERT INTO audit_entry_values (audit_entry_id, field_name, after_value, after_origin, changed)
       VALUES ($1, 'goods_description', 'x', NULL, true)`,
      [entryId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'aev_origin_present_chk');
  });

  it('TEST-DB-11: before_value with NULL before_origin is rejected by aev_origin_present_chk (23514)', async () => {
    const gc = await freshCase();
    const entryId = await anAuditEntryId(gc.caseId);
    const threw = await attempt(
      `INSERT INTO audit_entry_values (audit_entry_id, field_name, before_value, before_origin, changed)
       VALUES ($1, 'goods_description', 'x', NULL, true)`,
      [entryId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'aev_origin_present_chk');
  });

  it('TEST-DB-11: both values NULL is rejected by aev_some_value_chk (23514)', async () => {
    const gc = await freshCase();
    const entryId = await anAuditEntryId(gc.caseId);
    const threw = await attempt(
      `INSERT INTO audit_entry_values (audit_entry_id, field_name, before_value, after_value, changed)
       VALUES ($1, 'goods_description', NULL, NULL, false)`,
      [entryId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'aev_some_value_chk');
  });

  it("TEST-DB-11: an out-of-set after_origin ('ROBOT') is rejected by aev_after_origin_chk (23514)", async () => {
    const gc = await freshCase();
    const entryId = await anAuditEntryId(gc.caseId);
    const threw = await attempt(
      `INSERT INTO audit_entry_values (audit_entry_id, field_name, after_value, after_origin, changed)
       VALUES ($1, 'goods_description', 'x', 'ROBOT', true)`,
      [entryId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'aev_after_origin_chk');
  });

  it("TEST-DB-11(positive control): after_value='x', after_origin='HUMAN', changed=true is accepted", async () => {
    const gc = await freshCase();
    const entryId = await anAuditEntryId(gc.caseId);
    // Use a field this entry does not already carry to avoid the PK collision.
    await succeed(
      `INSERT INTO audit_entry_values (audit_entry_id, field_name, after_value, after_origin, changed)
       VALUES ($1, 'entry_number', 'x', 'HUMAN', true)`,
      [entryId],
    );
  });

  // ── TEST-DB-12 — constant origins ───────────────────────────────────────────

  it("TEST-DB-12: recommendation_values with origin='HUMAN' is rejected by rv_origin_ai_chk (23514); 'AI' is accepted", async () => {
    const gc = await freshCase();
    const recId = await anAvailableRecommendation(gc);

    const threw = await attempt(
      `INSERT INTO recommendation_values (recommendation_id, field_name, proposed_value, origin, addresses_rule_ids)
       VALUES ($1, 'goods_description', 'proposed', 'HUMAN', ARRAY['RIV-010'])`,
      [recId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'rv_origin_ai_chk');

    await succeed(
      `INSERT INTO recommendation_values (recommendation_id, field_name, proposed_value, origin, addresses_rule_ids)
       VALUES ($1, 'goods_description', 'proposed', 'AI', ARRAY['RIV-010'])`,
      [recId],
    );
  });

  it("TEST-DB-12: cargo_entry_field_origins with origin='AI' is rejected by cefo_origin_human_chk (23514); 'HUMAN' is accepted", async () => {
    const gc = await freshCase();

    // A field not already recorded by the fixture (it records goods_description
    // and port_of_entry_code) to avoid the (entry_id, field_name) PK collision.
    const threw = await attempt(
      `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
       VALUES ($1, 'entry_number', 'AI')`,
      [gc.caseId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'cefo_origin_human_chk');

    await succeed(
      `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
       VALUES ($1, 'carrier_code', 'HUMAN')`,
      [gc.caseId],
    );
  });

  it("TEST-DB-12: decision_values with origin='ROBOT' is rejected by dv_origin_chk (23514); BOTH 'AI' and 'HUMAN' are accepted (the one mixed-origin table)", async () => {
    const gc = await freshCase();
    const decId = await aRecordedDecision(gc);

    const threw = await attempt(
      `INSERT INTO decision_values (decision_id, field_name, value, origin, changed_from_proposal)
       VALUES ($1, 'goods_description', 'v', 'ROBOT', false)`,
      [decId],
    );
    expect(threw).toBeDefined();
    expectPgError(threw, '23514', 'dv_origin_chk');

    // decision_values is the ONLY table where origin may be either value: it is
    // exactly where a human edits a machine proposal.
    await succeed(
      `INSERT INTO decision_values (decision_id, field_name, value, origin, changed_from_proposal)
       VALUES ($1, 'goods_description', 'ai value', 'AI', false)`,
      [decId],
    );
    await succeed(
      `INSERT INTO decision_values (decision_id, field_name, value, origin, changed_from_proposal)
       VALUES ($1, 'port_of_entry_code', 'human value', 'HUMAN', true)`,
      [decId],
    );
  });

  it('TEST-DB-12: the no-nullable-path property — omitting origin entirely fails NOT NULL (23502) on both single-origin write paths', async () => {
    const gc = await freshCase();
    const decId = await aRecordedDecision(gc);

    // decision_values.origin has no default: omit it → not_null_violation.
    const dvThrew = await attempt(
      `INSERT INTO decision_values (decision_id, field_name, value, changed_from_proposal)
       VALUES ($1, 'goods_description', 'v', false)`,
      [decId],
    );
    expect(dvThrew).toBeDefined();
    expectPgError(dvThrew, '23502');

    // cargo_entry_field_origins.origin has no default: omit it → not_null_violation.
    const cefoThrew = await attempt(
      `INSERT INTO cargo_entry_field_origins (entry_id, field_name)
       VALUES ($1, 'entry_number')`,
      [gc.caseId],
    );
    expect(cefoThrew).toBeDefined();
    expectPgError(cefoThrew, '23502');
  });
});
