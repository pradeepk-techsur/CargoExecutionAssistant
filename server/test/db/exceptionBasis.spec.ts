import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client, Pool } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import { createTestSpecialist } from '../helpers/identityFixtures.js';
import {
  receiveEntry,
  type ReceiptPrincipal,
} from '../../src/services/receipt.service.js';
import type { CanonicalEntryRecord } from '../../src/db/repositories/entries.js';
import { withTransaction } from '../../src/db/tx.js';
import { append } from '../../src/services/audit/writer.js';
import type { EntryFieldName } from '@cargoexec/contract';

// ─────────────────────────────────────────────────────────────────────────────
// Criterion 4, the SQL-path half (plan 03-07, F5 FR-5.1/5.3/5.4/5.6/5.8/5.9,
// F4 FR-4.11, F0 FR-0.11). This suite proves — from the DEPLOYED application
// role, cargoexec_app, never the owner — that an exception cannot be authored,
// forged, re-based, duplicated, prioritised, or given an out-of-set state by
// direct SQL. A proof from cargoexec_owner would prove nothing about the posture
// an attacker who reaches the application role actually faces.
//
// House style (coupling.spec.ts / hitl.spec.ts): each refusal is asserted by
// SQLSTATE **and** constraint name, and each has a positive control in the same
// file. Where a mechanism is a foreign key rather than a trigger, that too is
// asserted (a P0001 would mean the guarantee rested on a trigger that could be
// dropped; a 23503 means it is structural).
//
// TWO documented behavioural findings, established by reading migration 0009
// before writing the assertions (see cases 6 and 11): the HITL constraint
// trigger `trg_exceptions_hitl` fires only when `NEW.state <> 'OPEN'`
// (0009_invariant_triggers.sql, `exceptions_require_human_decision`). An UPDATE
// that rewrites `validation_result_id` or `receipt_position` while leaving the
// row OPEN is therefore NOT refused at the database. Basis and receipt-position
// immutability rest on the single write path (Task 3 asserts there is no
// `UPDATE exceptions` anywhere in server/src outside Phase 6's decision service).
// These cases assert the ACTUAL behaviour explicitly and name which mechanism
// carries the guarantee, rather than weakening the assertion to a false refusal.
// ─────────────────────────────────────────────────────────────────────────────

type PgError = Error & { code?: string; constraint?: string };

const ALL_FIELDS: readonly EntryFieldName[] = [
  'entry_number',
  'importer_of_record_id',
  'port_of_entry_code',
  'mode_of_transport',
  'carrier_code',
  'conveyance_name',
  'bill_of_lading_number',
  'air_waybill_number',
  'country_of_origin_code',
  'goods_description',
  'quantity',
  'quantity_uom',
  'declared_value_usd',
  'arrival_date',
];

/** The fourteen fields all null — the "entirely empty entry" (a FAIL). */
function blankEntry(): CanonicalEntryRecord {
  return {
    entry_number: null,
    importer_of_record_id: null,
    port_of_entry_code: null,
    mode_of_transport: null,
    carrier_code: null,
    conveyance_name: null,
    bill_of_lading_number: null,
    air_waybill_number: null,
    country_of_origin_code: null,
    goods_description: null,
    quantity: null,
    quantity_uom: null,
    declared_value_usd: null,
    arrival_date: null,
  };
}

/** today + 30 days in UTC — always inside RIV-132's [-60, +180] window. */
function arrivalWithinWindow(): string {
  const d = new Date(Date.now() + 30 * 86_400_000);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

let entryNumberCounter = 0;
function uniqueEntryNumber(): string {
  entryNumberCounter += 1;
  return 'ABC' + String(10_000_000 + entryNumberCounter).slice(-8);
}

/** A fully rule-satisfying record — validates PASS, produces no exception. */
function cleanEntry(overrides: Partial<CanonicalEntryRecord> = {}): CanonicalEntryRecord {
  return {
    entry_number: uniqueEntryNumber(),
    importer_of_record_id: '12-3456789',
    port_of_entry_code: '2704',
    mode_of_transport: 'OCEAN',
    carrier_code: 'MAEU',
    conveyance_name: 'MV Northern Star / V.118',
    bill_of_lading_number: 'MAEU123456789',
    air_waybill_number: null,
    country_of_origin_code: 'CN',
    goods_description: 'Stainless steel fasteners, M8 hex bolts',
    quantity: '1200.000',
    quantity_uom: 'PCS',
    declared_value_usd: '8450.00',
    arrival_date: arrivalWithinWindow(),
    ...overrides,
  };
}

function providedFrom(record: CanonicalEntryRecord): readonly EntryFieldName[] {
  return ALL_FIELDS.filter((f) => record[f] !== null);
}

describe('exceptionBasis — an exception exists only where a failing validation does (criterion 4, SQL path)', () => {
  let db: TestDatabase;
  let pool: Pool;
  let principal: ReceiptPrincipal;

  beforeAll(async () => {
    db = await createTestDatabase();
    pool = new Pool({ connectionString: db.appUrl });
    const spec = await createTestSpecialist(db.appUrl, { display_name: 'Basis Tester' });
    principal = { id: spec.id, display_name: spec.display_name };
  });

  afterAll(async () => {
    await pool.end();
    await dropTestDatabase(db);
  });

  function deps() {
    return { pool, principal };
  }

  /** A connected cargoexec_app client — every statement in this suite is app-role. */
  async function appClient(): Promise<Client> {
    const c = new Client({ connectionString: db.appUrl });
    await c.connect();
    return c;
  }

  /**
   * Build a governed case through the real receipt service, so its validation
   * result, exception and audit are genuine. Returns the ids the direct-SQL
   * probes below need. `outcome` chooses a FAIL (blank entry) or a PASS
   * (clean entry) basis.
   */
  async function receive(kind: 'FAIL' | 'PASS'): Promise<{
    entryId: string;
    validationResultId: string;
    exceptionId: string | null;
  }> {
    const record = kind === 'FAIL' ? blankEntry() : cleanEntry();
    const res = await receiveEntry(deps(), record, providedFrom(record));
    const vr = await pool.query<{ id: string }>(
      'SELECT id FROM validation_results WHERE entry_id = $1',
      [res.entry.id],
    );
    return {
      entryId: res.entry.id,
      validationResultId: vr.rows[0]!.id,
      exceptionId: res.exception?.id ?? null,
    };
  }

  /**
   * Create an ENTRY_RECEIVED-audited entry that has NO validation result and NO
   * exception yet, so a hand-built exception INSERT can be attempted against a
   * chosen validation result. We build it through a short transaction that
   * commits (the coupling trigger needs exactly one ENTRY_RECEIVED).
   */
  async function bareReceivedEntry(): Promise<string> {
    // Built through the real audit writer so the hash chain is genuine and
    // uq_audit_entries_entry_hash is satisfied across repeated calls — a
    // hand-coded entry_hash would collide on the second call.
    return withTransaction(pool, async (tx) => {
      const ref = await tx.query<{ r: string }>(
        `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS r`,
      );
      const entry = await tx.query<{ id: string }>(
        `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
         VALUES ($1, $2, 'EXCEPTION_OPENED', 'widgets') RETURNING id`,
        [ref.rows[0]!.r, principal.id],
      );
      const entryId = entry.rows[0]!.id;
      // Its coupled ENTRY_RECEIVED (case_sequence 1) — without it the
      // cargo_entries insert would fail the deferred coupling trigger at COMMIT.
      await append(tx, {
        case_id: entryId,
        action_type: 'ENTRY_RECEIVED',
        actor: { type: 'SPECIALIST', specialist_id: principal.id },
        before_state: null,
        after_state: 'RECEIVED',
        values: [
          {
            field_name: 'goods_description',
            before_value: null,
            before_origin: null,
            after_value: 'widgets',
            after_origin: 'HUMAN',
          },
        ],
      });
      return entryId;
    });
  }

  // ── The basis cannot be a passing validation ──────────────────────────────

  it('1. an exception referencing a PASS validation result is refused by exceptions_basis_fk (23503, a foreign key, NOT a P0001 trigger raise)', async () => {
    // The composite FK (validation_result_id, validation_outcome) ->
    // validation_results (id, outcome), with validation_outcome CHECK-pinned to
    // 'FAIL', makes the row unstorable. It is integrity, not a trigger: assert
    // the SQLSTATE is 23503 (foreign_key_violation) and NOT P0001.
    const pass = await receive('PASS');
    const entryId = await bareReceivedEntry();
    const c = await appClient();
    let err: PgError | undefined;
    try {
      // Default validation_outcome is 'FAIL'; pointing it at a PASS result means
      // the composite (id, 'FAIL') has no matching row in validation_results.
      await c.query(
        `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2)`,
        [entryId, pass.validationResultId],
      );
    } catch (e) {
      err = e as PgError;
    } finally {
      await c.end();
    }
    expect(err).toBeInstanceOf(Error);
    expect(err!.code).toBe('23503');
    expect(err!.constraint).toBe('exceptions_basis_fk');
    // The integrity is STRUCTURAL: not a P0001 raise from a trigger that could
    // be dropped.
    expect(err!.code).not.toBe('P0001');
    expect(err!.message.startsWith('AUDIT_')).toBe(false);
    expect(err!.message.startsWith('HITL_')).toBe(false);
  });

  it('2. positive control — an exception referencing a FAIL result inserts (inside a rolled-back probe so it leaves no orphan)', async () => {
    // A real FAIL result already owns its exception (uq_exceptions_entry). To
    // isolate "the FK accepts a FAIL basis", we attempt the insert for a fresh
    // entry against a FAIL result that belongs to a different entry, and assert
    // the FK does NOT reject it — it is case 8's uniqueness / case 3's CHECK
    // that would, not the basis FK. We roll back so no orphan survives.
    const fail = await receive('FAIL');
    const entryId = await bareReceivedEntry();
    const c = await appClient();
    let fkRejected = false;
    try {
      await c.query('BEGIN');
      // Point at a genuine FAIL result: the composite (id, 'FAIL') resolves.
      await c.query(
        `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2)`,
        [entryId, fail.validationResultId],
      );
      // It inserted: the basis FK accepted a FAIL result. Roll back — this row
      // would fail its own EXCEPTION_OPENED coupling at COMMIT anyway.
      await c.query('ROLLBACK');
    } catch (e) {
      const err = e as PgError;
      // The ONLY acceptable rejection here is NOT the basis FK.
      fkRejected = err.constraint === 'exceptions_basis_fk';
      await c.query('ROLLBACK').catch(() => undefined);
    } finally {
      await c.end();
    }
    expect(fkRejected).toBe(false);
  });

  it('3. explicitly supplying validation_outcome = PASS is refused by exceptions_basis_is_failure_chk (23514) — the CHECK is not a defaultable default', async () => {
    const fail = await receive('FAIL');
    const entryId = await bareReceivedEntry();
    const c = await appClient();
    let err: PgError | undefined;
    try {
      await c.query(
        `INSERT INTO exceptions (entry_id, validation_result_id, validation_outcome)
         VALUES ($1, $2, 'PASS')`,
        [entryId, fail.validationResultId],
      );
    } catch (e) {
      err = e as PgError;
    } finally {
      await c.end();
    }
    expect(err!.code).toBe('23514');
    expect(err!.constraint).toBe('exceptions_basis_is_failure_chk');
  });

  it('4. a validation_result_id that does not exist at all is refused by the same composite FK (23503)', async () => {
    const entryId = await bareReceivedEntry();
    const c = await appClient();
    let err: PgError | undefined;
    try {
      await c.query(
        `INSERT INTO exceptions (entry_id, validation_result_id)
         VALUES ($1, '00000000-0000-0000-0000-000000000000')`,
        [entryId],
      );
    } catch (e) {
      err = e as PgError;
    } finally {
      await c.end();
    }
    expect(err!.code).toBe('23503');
    expect(err!.constraint).toBe('exceptions_basis_fk');
  });

  // ── The basis cannot be absent or forged after the fact ────────────────────

  it('5. validation_result_id is NOT NULL: omitting it is refused (23502)', async () => {
    const entryId = await bareReceivedEntry();
    const c = await appClient();
    let err: PgError | undefined;
    try {
      // Omitting validation_result_id — there is no default, and the column is
      // NOT NULL.
      await c.query(`INSERT INTO exceptions (entry_id) VALUES ($1)`, [entryId]);
    } catch (e) {
      err = e as PgError;
    } finally {
      await c.end();
    }
    expect(err!.code).toBe('23502');
    // The offending column is validation_result_id.
    expect(err!.message).toMatch(/validation_result_id/);
  });

  it('6. FINDING: UPDATE exceptions SET validation_result_id (leaving state OPEN) is NOT refused by the HITL trigger — basis immutability rests on the single write path', async () => {
    // Migration 0009 `exceptions_require_human_decision` guards only
    // `NEW.state <> 'OPEN'`. An open exception's basis re-pointed to another
    // FAIL result does NOT trip the trigger, and cargoexec_app holds UPDATE on
    // exceptions (0008, for the F11 closure path). So this UPDATE succeeds at
    // the database. We assert the ACTUAL behaviour and record that immutability
    // is carried by the ABSENCE of any such UPDATE in server/src (Task 3's
    // receiptPaths.spec.ts assertion 4), not by a database refusal.
    //
    // We perform it inside a rolled-back transaction so the mutation leaves no
    // residue in the shared suite database.
    const a = await receive('FAIL');
    const b = await receive('FAIL'); // a second, unrelated FAIL result to point at
    expect(a.exceptionId).not.toBeNull();

    const c = await appClient();
    let updateSucceeded = false;
    let refusal: PgError | undefined;
    try {
      await c.query('BEGIN');
      const res = await c.query(
        `UPDATE exceptions SET validation_result_id = $2 WHERE id = $1`,
        [a.exceptionId, b.validationResultId],
      );
      updateSucceeded = (res.rowCount ?? 0) === 1;
      await c.query('ROLLBACK'); // never persist a re-based exception
    } catch (e) {
      refusal = e as PgError;
      await c.query('ROLLBACK').catch(() => undefined);
    } finally {
      await c.end();
    }

    if (refusal !== undefined) {
      // If a future migration tightens the HITL trigger to also guard basis
      // changes, this branch documents the refusal explicitly instead.
      expect(refusal.code).toBe('P0001');
      expect(refusal.message.startsWith('HITL_VIOLATION')).toBe(true);
    } else {
      // The observed behaviour on migration 0009: the UPDATE is not refused at
      // the DB. Basis immutability is an application-level guarantee.
      expect(updateSucceeded).toBe(true);
    }
  });

  it('7. validation_findings cannot be silently duplicated: a second finding with the same (validation_result_id, rule_id) is refused by uq_validation_findings_rule (23505); a different rule_id succeeds', async () => {
    const fail = await receive('FAIL');
    const c = await appClient();
    let dupErr: PgError | undefined;
    try {
      // Duplicate an existing (result, rule) pair. RIV-010 is present on a blank
      // entry's FAIL result.
      await c.query('BEGIN');
      await c.query(
        `INSERT INTO validation_findings (validation_result_id, rule_id, field_name, failure_code, message)
         VALUES ($1, 'RIV-010', 'goods_description', 'MISSING_REQUIRED', 'dup')`,
        [fail.validationResultId],
      );
    } catch (e) {
      dupErr = e as PgError;
    } finally {
      await c.query('ROLLBACK').catch(() => undefined);
      await c.end();
    }
    expect(dupErr!.code).toBe('23505');
    expect(dupErr!.constraint).toBe('uq_validation_findings_rule');

    // Positive control: a DIFFERENT rule_id on the same result inserts (rolled
    // back so it does not desync findings_count).
    const c2 = await appClient();
    let controlInserted = false;
    try {
      await c2.query('BEGIN');
      const res = await c2.query(
        `INSERT INTO validation_findings (validation_result_id, rule_id, field_name, failure_code, message)
         VALUES ($1, 'RIV-999', 'goods_description', 'SYNTHETIC', 'control finding')`,
        [fail.validationResultId],
      );
      controlInserted = (res.rowCount ?? 0) === 1;
      await c2.query('ROLLBACK');
    } finally {
      await c2.end();
    }
    expect(controlInserted).toBe(true);
  });

  // ── One exception per entry, and no second basis ──────────────────────────

  it('8. a second exception for the same entry_id is refused by uq_exceptions_entry (23505)', async () => {
    const fail = await receive('FAIL');
    const c = await appClient();
    let err: PgError | undefined;
    try {
      await c.query(
        `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2)`,
        [fail.entryId, fail.validationResultId],
      );
    } catch (e) {
      err = e as PgError;
    } finally {
      await c.end();
    }
    expect(err!.code).toBe('23505');
    expect(err!.constraint).toBe('uq_exceptions_entry');
  });

  it('9. a second validation_results row for the same entry is refused by uq_validation_results_entry (23505) — exactly one result per entry, so the basis is singular', async () => {
    const fail = await receive('FAIL');
    const c = await appClient();
    let err: PgError | undefined;
    try {
      await c.query(
        `INSERT INTO validation_results (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
         VALUES ($1, 'FAIL', 'RIV-2026.09', 31, 1)`,
        [fail.entryId],
      );
    } catch (e) {
      err = e as PgError;
    } finally {
      await c.end();
    }
    expect(err!.code).toBe('23505');
    expect(err!.constraint).toBe('uq_validation_results_entry');
  });

  // ── The receipt position is immutable and never renumbered (F5 FR-5.8) ──────

  it('10. three exceptions created through receiveEntry have strictly increasing receipt_position values, NOT NULL and unique', async () => {
    const positions: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const r = await receive('FAIL');
      const row = await pool.query<{ receipt_position: string | null }>(
        'SELECT receipt_position FROM exceptions WHERE id = $1',
        [r.exceptionId],
      );
      const pos = row.rows[0]!.receipt_position;
      expect(pos).not.toBeNull();
      positions.push(Number(pos));
    }
    expect(positions[1]!).toBeGreaterThan(positions[0]!);
    expect(positions[2]!).toBeGreaterThan(positions[1]!);
    expect(new Set(positions).size).toBe(3); // unique
  });

  it('11. FINDING: UPDATE exceptions SET receipt_position (leaving state OPEN) is NOT refused by the HITL trigger — receipt-position immutability rests on the single write path', async () => {
    // Same mechanism as case 6: the HITL trigger guards only state changes away
    // from OPEN. Re-numbering an open exception is not refused at the DB, and
    // cargoexec_app holds UPDATE on exceptions. The guarantee that queue history
    // is never rewritten rests on there being no `UPDATE exceptions` in
    // server/src outside Phase 6's decision service (Task 3 assertion 4).
    // Performed in a rolled-back transaction.
    const r = await receive('FAIL');
    const before = await pool.query<{ receipt_position: string }>(
      'SELECT receipt_position FROM exceptions WHERE id = $1',
      [r.exceptionId],
    );
    const original = Number(before.rows[0]!.receipt_position);

    const c = await appClient();
    let updateSucceeded = false;
    let refusal: PgError | undefined;
    try {
      await c.query('BEGIN');
      const res = await c.query(
        `UPDATE exceptions SET receipt_position = $2 WHERE id = $1`,
        [r.exceptionId, original + 100000],
      );
      updateSucceeded = (res.rowCount ?? 0) === 1;
      await c.query('ROLLBACK');
    } catch (e) {
      refusal = e as PgError;
      await c.query('ROLLBACK').catch(() => undefined);
    } finally {
      await c.end();
    }

    if (refusal !== undefined) {
      expect(refusal.code).toBe('P0001');
      expect(refusal.message.startsWith('HITL_VIOLATION')).toBe(true);
    } else {
      expect(updateSucceeded).toBe(true);
    }
    // The persisted value is unchanged (we rolled back).
    const after = await pool.query<{ receipt_position: string }>(
      'SELECT receipt_position FROM exceptions WHERE id = $1',
      [r.exceptionId],
    );
    expect(Number(after.rows[0]!.receipt_position)).toBe(original);
  });

  it('12. a rolled-back receipt leaves an uncompacted sequence gap; the surviving queue order is unaffected', async () => {
    // Two survivors bracketing a rolled-back attempt. Because the sequence
    // default is nextval() and a rollback does not return the number, the second
    // survivor's receipt_position is strictly greater than the first with a gap.
    const first = await receive('FAIL');
    const firstPos = Number(
      (await pool.query<{ receipt_position: string }>(
        'SELECT receipt_position FROM exceptions WHERE id = $1',
        [first.exceptionId],
      )).rows[0]!.receipt_position,
    );

    // Force a receipt to consume a receipt_position and then roll back: open a
    // transaction, insert an exception (which calls nextval), then ROLLBACK.
    const bareId = await bareReceivedEntry();
    const failForBasis = await receive('FAIL');
    let consumedPos = 0;
    const c = await appClient();
    try {
      await c.query('BEGIN');
      const ins = await c.query<{ receipt_position: string }>(
        `INSERT INTO exceptions (entry_id, validation_result_id)
         VALUES ($1, $2) RETURNING receipt_position`,
        [bareId, failForBasis.validationResultId],
      );
      consumedPos = Number(ins.rows[0]!.receipt_position);
      await c.query('ROLLBACK'); // the gap: this position is never reused
    } finally {
      await c.end();
    }
    expect(consumedPos).toBeGreaterThan(firstPos);

    // A subsequent successful failing receipt: its position is greater than the
    // rolled-back one, so a gap exists and nothing was compacted or reused.
    const second = await receive('FAIL');
    const secondPos = Number(
      (await pool.query<{ receipt_position: string }>(
        'SELECT receipt_position FROM exceptions WHERE id = $1',
        [second.exceptionId],
      )).rows[0]!.receipt_position,
    );
    expect(secondPos).toBeGreaterThan(consumedPos);

    // The consumed position belongs to no surviving row (never reused).
    const reused = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM exceptions WHERE receipt_position = $1',
      [consumedPos],
    );
    expect(reused.rows[0]!.n).toBe(0);

    // Queue order of the two survivors is creation order, ascending by position.
    const order = await pool.query<{ id: string; receipt_position: string }>(
      `SELECT id, receipt_position FROM exceptions
        WHERE id = ANY($1::uuid[]) AND state = 'OPEN'
        ORDER BY receipt_position ASC`,
      [[first.exceptionId, second.exceptionId]],
    );
    expect(order.rows.map((r) => r.id)).toEqual([first.exceptionId, second.exceptionId]);
  });

  // ── No prioritisation surface (F5 FR-5.9, F5 acceptance 6) ─────────────────

  it('13. the exceptions column set is exactly the nine columns of migration 0004 — no priority/severity/SLA/assignment column', async () => {
    const c = await appClient();
    let columns: string[];
    try {
      const res = await c.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_name = 'exceptions' AND table_schema = 'public'
          ORDER BY column_name`,
      );
      columns = res.rows.map((r) => r.column_name);
    } finally {
      await c.end();
    }

    // None of the prioritisation / assignment / SLA surfaces exists.
    const FORBIDDEN = [
      'priority',
      'severity',
      'risk_score',
      'due_at',
      'assigned_to',
      'claimed_by',
      'escalated_at',
      'rank',
      'weight',
      'score',
    ];
    for (const col of FORBIDDEN) {
      expect(columns).not.toContain(col);
    }
    // No sla_* column of any name.
    expect(columns.some((c2) => c2.startsWith('sla_'))).toBe(false);

    // The full column set is EXACTLY the nine of migration 0004 — a tenth column
    // is then a deliberate, failing change.
    expect(columns.slice().sort()).toEqual(
      [
        'id',
        'entry_id',
        'validation_result_id',
        'validation_outcome',
        'state',
        'receipt_position',
        'opened_at',
        'closed_at',
        'decision_id',
      ].sort(),
    );
  });

  it('14. exceptions_state_chk admits exactly OPEN, RESOLVED, REJECTED — every workflow state is refused (23514); OPEN succeeds', async () => {
    const FORBIDDEN_STATES = [
      'IN_PROGRESS',
      'ON_HOLD',
      'ESCALATED',
      'CLAIMED',
      'SNOOZED',
      'PENDING_REVIEW',
      'REOPENED',
    ];
    // A non-OPEN state ALSO trips exceptions_closure_consistency_chk (which
    // demands closed_at + decision_id when state <> OPEN), and that CHECK can
    // fire first. To isolate exceptions_state_chk we satisfy closure-consistency
    // with a genuine decision_id + closed_at, so the ONLY remaining objection is
    // the state value itself. Everything is done inside a rolled-back
    // transaction, so the decision's deferred coupling trigger never fires and
    // no residue survives.
    for (const state of FORBIDDEN_STATES) {
      const fail = await receive('FAIL');
      const c = await appClient();
      let err: PgError | undefined;
      try {
        await c.query('BEGIN');
        // A real REJECT decision for this exception → a valid decision_id.
        const dec = await c.query<{ id: string }>(
          `INSERT INTO decisions (exception_id, decision_type, decided_by, reason, resulting_state)
           VALUES ($1, 'REJECT', $2, 'synthetic reason for state-check isolation', 'REJECTED')
           RETURNING id`,
          [fail.exceptionId, principal.id],
        );
        // UPDATE the existing OPEN exception to the forbidden state, closure
        // fields satisfied → only the state CHECK can object.
        await c.query(
          `UPDATE exceptions SET state = $2, closed_at = now(), decision_id = $3 WHERE id = $1`,
          [fail.exceptionId, state, dec.rows[0]!.id],
        );
        await c.query('ROLLBACK');
      } catch (e) {
        err = e as PgError;
        await c.query('ROLLBACK').catch(() => undefined);
      } finally {
        await c.end();
      }
      expect(err, `state ${state} must be refused`).toBeDefined();
      expect(err!.code, `state ${state} SQLSTATE`).toBe('23514');
      expect(err!.constraint, `state ${state} constraint`).toBe('exceptions_state_chk');
    }

    // Positive control: 'OPEN' is admitted by the state CHECK. A bare exception
    // INSERT with state OPEN attempted in a rolled-back transaction — the state
    // CHECK must NOT be the thing that objects.
    const fail = await receive('FAIL');
    const entryId = await bareReceivedEntry();
    const c = await appClient();
    let stateChkRejected = false;
    try {
      await c.query('BEGIN');
      await c.query(
        `INSERT INTO exceptions (entry_id, validation_result_id, state)
         VALUES ($1, $2, 'OPEN')`,
        [entryId, fail.validationResultId],
      );
      await c.query('ROLLBACK');
    } catch (e) {
      const err = e as PgError;
      stateChkRejected = err.constraint === 'exceptions_state_chk';
      await c.query('ROLLBACK').catch(() => undefined);
    } finally {
      await c.end();
    }
    expect(stateChkRejected).toBe(false);
  });
});
