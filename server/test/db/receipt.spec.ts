import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import { createTestSpecialist } from '../helpers/identityFixtures.js';
import {
  receiveEntry,
  EntryNumberDuplicateError,
  type ReceiptPrincipal,
} from '../../src/services/receipt.service.js';
import type { CanonicalEntryRecord } from '../../src/db/repositories/entries.js';
import { insertValidationResult } from '../../src/db/repositories/validation.js';
import { withTransaction } from '../../src/db/tx.js';
import type { EntryFieldName } from '@cargoexec/contract';

// ─────────────────────────────────────────────────────────────────────────────
// db tier — the COMMITTED receipt (plan 03-05, F3/F4/F5).
//
// Unlike plan 03-01's repository spec, these cases COMMIT: every assertion runs
// after `receiveEntry` has resolved, so the Phase 1 deferred coupling triggers,
// the composite basis FK and the hash chain are all exercised for real. A
// receipt that commits is a receipt whose audit coupling the database verified.
//
// Everything runs on cargoexec_app (db.appUrl) against a per-suite migrated
// database, with a real specialist created through the identity fixture.
// ─────────────────────────────────────────────────────────────────────────────

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

/** The fourteen fields all null — the "entirely empty entry" baseline. */
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

/**
 * A fully rule-satisfying record (the same shape plan 03-04's engine spec uses,
 * restated here rather than imported across test tiers). Every rule passes; the
 * arrival_date is computed relative to the run clock so the suite does not rot.
 */
function cleanEntry(overrides: Partial<CanonicalEntryRecord> = {}): CanonicalEntryRecord {
  return {
    entry_number: 'ABC12345678',
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

/** The list of fields present (non-null) in a record, in canonical field order. */
function providedFrom(record: CanonicalEntryRecord): readonly EntryFieldName[] {
  return ALL_FIELDS.filter((f) => record[f] !== null);
}

/** A fresh, unique entry number so a case does not collide with a prior one. */
let entryNumberCounter = 0;
function uniqueEntryNumber(): string {
  entryNumberCounter += 1;
  // filer code ABC + 8 digits, satisfying RIV-011.
  return 'ABC' + String(10_000_000 + entryNumberCounter).slice(-8);
}

describe('receipt.service — the committed receipt on both outcomes', () => {
  let db: TestDatabase;
  let pool: Pool;
  let principal: ReceiptPrincipal;

  beforeAll(async () => {
    db = await createTestDatabase();
    pool = new Pool({ connectionString: db.appUrl });
    const spec = await createTestSpecialist(db.appUrl, { display_name: 'Dana Ochoa' });
    principal = { id: spec.id, display_name: spec.display_name };
  });

  afterAll(async () => {
    await pool.end();
    await dropTestDatabase(db);
  });

  function deps() {
    return { pool, principal };
  }

  async function countWhere(table: string, column: string, value: string): Promise<number> {
    const res = await pool.query<{ n: number }>(
      // table/column are test-literal constants, never client input.
      `SELECT count(*)::int AS n FROM ${table} WHERE ${column} = $1`,
      [value],
    );
    return res.rows[0]!.n;
  }

  async function verifyChain(caseId: string): Promise<boolean> {
    const res = await pool.query<{ chain_verified: boolean }>(
      'SELECT chain_verified FROM verify_audit_chain($1)',
      [caseId],
    );
    return res.rows[0]!.chain_verified;
  }

  // ── The clean path (VALIDATED_CLEAN) ───────────────────────────────────────

  describe('the clean path (VALIDATED_CLEAN)', () => {
    it('1. a rule-satisfying entry returns VALIDATED_CLEAN, no exception, PASS with no findings', async () => {
      const record = cleanEntry({ entry_number: uniqueEntryNumber() });
      const res = await receiveEntry(deps(), record, providedFrom(record));

      expect(res.receipt_outcome).toBe('VALIDATED_CLEAN');
      expect(res.exception).toBeNull();
      expect(res.validation.outcome).toBe('PASS');
      expect(res.validation.findings).toEqual([]);
      expect(res.next.case_url).toBeNull();
      expect(res.next.queue_url).toBe('/queue');
    });

    it('2. after commit: one VALIDATED_CLEAN entry, one PASS result, zero findings/exceptions/recommendations', async () => {
      const record = cleanEntry({ entry_number: uniqueEntryNumber() });
      const res = await receiveEntry(deps(), record, providedFrom(record));
      const entryId = res.entry.id;

      const entry = await pool.query<{
        receipt_outcome: string;
        created_by: string;
        case_reference: string;
      }>('SELECT receipt_outcome, created_by, case_reference FROM cargo_entries WHERE id = $1', [entryId]);
      expect(entry.rowCount).toBe(1);
      expect(entry.rows[0]!.receipt_outcome).toBe('VALIDATED_CLEAN');
      expect(entry.rows[0]!.created_by).toBe(principal.id);
      expect(entry.rows[0]!.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);

      const vr = await pool.query<{ outcome: string; findings_count: number; rule_set_version: string }>(
        'SELECT outcome, findings_count, rule_set_version FROM validation_results WHERE entry_id = $1',
        [entryId],
      );
      expect(vr.rowCount).toBe(1);
      expect(vr.rows[0]!.outcome).toBe('PASS');
      expect(vr.rows[0]!.findings_count).toBe(0);
      expect(vr.rows[0]!.rule_set_version).toBe('RIV-2026.09');

      const vrId = await pool.query<{ id: string }>(
        'SELECT id FROM validation_results WHERE entry_id = $1',
        [entryId],
      );
      expect(await countWhere('validation_findings', 'validation_result_id', vrId.rows[0]!.id)).toBe(0);
      expect(await countWhere('exceptions', 'entry_id', entryId)).toBe(0);
    });

    it('3. the clean path commits exactly two audit entries — ENTRY_RECEIVED then VALIDATION_COMPLETED', async () => {
      const record = cleanEntry({ entry_number: uniqueEntryNumber() });
      const res = await receiveEntry(deps(), record, providedFrom(record));
      const entryId = res.entry.id;

      const entries = await pool.query<{ case_sequence: number; action_type: string; after_state: string; id: string }>(
        'SELECT id, case_sequence, action_type, after_state FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence',
        [entryId],
      );
      expect(entries.rows.map((r) => Number(r.case_sequence))).toEqual([1, 2]);
      expect(entries.rows.map((r) => r.action_type)).toEqual(['ENTRY_RECEIVED', 'VALIDATION_COMPLETED']);
      expect(entries.rows.map((r) => r.after_state)).toEqual(['RECEIVED', 'VALIDATED_CLEAN']);

      // VALIDATION_COMPLETED has zero value rows on a clean pass.
      const validationEntryId = entries.rows[1]!.id;
      const values = await pool.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM audit_entry_values WHERE audit_entry_id = $1',
        [validationEntryId],
      );
      expect(values.rows[0]!.n).toBe(0);
    });

    it('4. verify_audit_chain confirms the clean case chain', async () => {
      const record = cleanEntry({ entry_number: uniqueEntryNumber() });
      const res = await receiveEntry(deps(), record, providedFrom(record));
      expect(await verifyChain(res.entry.id)).toBe(true);
    });
  });

  // ── The exception path (EXCEPTION_OPENED) ──────────────────────────────────

  describe('the exception path (EXCEPTION_OPENED)', () => {
    it('5. an all-null entry returns EXCEPTION_OPENED, FAIL with the thirteen presence findings, an OPEN exception', async () => {
      const record = blankEntry();
      const res = await receiveEntry(deps(), record, providedFrom(record));

      expect(res.receipt_outcome).toBe('EXCEPTION_OPENED');
      expect(res.validation.outcome).toBe('FAIL');
      const ids = res.validation.findings.map((f) => f.rule_id);
      expect(ids).toEqual([
        'RIV-010', 'RIV-020', 'RIV-030', 'RIV-040', 'RIV-050', 'RIV-060', 'RIV-070',
        'RIV-080', 'RIV-090', 'RIV-100', 'RIV-110', 'RIV-120', 'RIV-130',
      ]);
      expect(res.exception).not.toBeNull();
      expect(res.exception!.state).toBe('OPEN');
      expect(res.exception!.receipt_position).toBeGreaterThan(0);
      expect(res.next.case_url).toBe(`/cases/${res.case_reference}`);
    });

    it('6. after commit: FAIL result with 13 findings, one OPEN exception, one PENDING recommendation, zero decisions', async () => {
      const record = blankEntry();
      const res = await receiveEntry(deps(), record, providedFrom(record));
      const entryId = res.entry.id;

      const entry = await pool.query<{ receipt_outcome: string }>(
        'SELECT receipt_outcome FROM cargo_entries WHERE id = $1',
        [entryId],
      );
      expect(entry.rows[0]!.receipt_outcome).toBe('EXCEPTION_OPENED');

      const vr = await pool.query<{ id: string; outcome: string; findings_count: number }>(
        'SELECT id, outcome, findings_count FROM validation_results WHERE entry_id = $1',
        [entryId],
      );
      expect(vr.rows[0]!.outcome).toBe('FAIL');
      expect(vr.rows[0]!.findings_count).toBe(13);

      const findings = await pool.query<{ rule_id: string; field_name: string; failure_code: string; message: string }>(
        'SELECT rule_id, field_name, failure_code, message FROM validation_findings WHERE validation_result_id = $1 ORDER BY rule_id',
        [vr.rows[0]!.id],
      );
      expect(findings.rows.length).toBe(13);
      // Field-for-field equality with the response's findings.
      expect(findings.rows).toEqual(
        res.validation.findings.map((f) => ({
          rule_id: f.rule_id,
          field_name: f.field_name,
          failure_code: f.failure_code,
          message: f.message,
        })),
      );

      const ex = await pool.query<{
        state: string;
        validation_outcome: string;
        closed_at: Date | null;
        decision_id: string | null;
        validation_result_id: string;
      }>(
        'SELECT state, validation_outcome, closed_at, decision_id, validation_result_id FROM exceptions WHERE entry_id = $1',
        [entryId],
      );
      expect(ex.rowCount).toBe(1);
      expect(ex.rows[0]!.state).toBe('OPEN');
      expect(ex.rows[0]!.validation_outcome).toBe('FAIL');
      expect(ex.rows[0]!.closed_at).toBeNull();
      expect(ex.rows[0]!.decision_id).toBeNull();
      expect(ex.rows[0]!.validation_result_id).toBe(vr.rows[0]!.id);

      const exId = res.exception!.id;
      const rec = await pool.query<{ status: string; generated_at: Date | null; failed_at: Date | null }>(
        'SELECT status, generated_at, failed_at FROM recommendations WHERE exception_id = $1',
        [exId],
      );
      expect(rec.rowCount).toBe(1);
      expect(rec.rows[0]!.status).toBe('PENDING');
      expect(rec.rows[0]!.generated_at).toBeNull();
      expect(rec.rows[0]!.failed_at).toBeNull();

      expect(await countWhere('decisions', 'exception_id', exId)).toBe(0);
    });

    it('7. the exception path commits three audit entries — SPECIALIST / SYSTEM / SYSTEM, SYSTEM recording the specialist', async () => {
      const record = blankEntry();
      const res = await receiveEntry(deps(), record, providedFrom(record));
      const entryId = res.entry.id;

      const entries = await pool.query<{
        id: string;
        case_sequence: number;
        action_type: string;
        actor_type: string;
        actor_specialist_id: string | null;
      }>(
        'SELECT id, case_sequence, action_type, actor_type, actor_specialist_id FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence',
        [entryId],
      );
      expect(entries.rows.map((r) => Number(r.case_sequence))).toEqual([1, 2, 3]);
      expect(entries.rows.map((r) => r.action_type)).toEqual([
        'ENTRY_RECEIVED',
        'VALIDATION_COMPLETED',
        'EXCEPTION_OPENED',
      ]);
      expect(entries.rows.map((r) => r.actor_type)).toEqual(['SPECIALIST', 'SYSTEM', 'SYSTEM']);
      // Both SYSTEM entries record the requesting specialist (§3.6).
      expect(entries.rows[1]!.actor_specialist_id).toBe(principal.id);
      expect(entries.rows[2]!.actor_specialist_id).toBe(principal.id);

      // The EXCEPTION_OPENED entry has thirteen value rows, one per finding.
      const exceptionEntryId = entries.rows[2]!.id;
      const values = await pool.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM audit_entry_values WHERE audit_entry_id = $1',
        [exceptionEntryId],
      );
      expect(values.rows[0]!.n).toBe(13);
    });

    it('8. verify_audit_chain confirms the exception case chain', async () => {
      const record = blankEntry();
      const res = await receiveEntry(deps(), record, providedFrom(record));
      expect(await verifyChain(res.entry.id)).toBe(true);
    });
  });

  // ── Provenance (F3 FR-3.5, FR-3.8) ─────────────────────────────────────────

  describe('provenance', () => {
    it('9. three provided fields and eleven absent creates exactly three HUMAN field-origin rows', async () => {
      const record: CanonicalEntryRecord = {
        ...blankEntry(),
        entry_number: uniqueEntryNumber(),
        goods_description: 'Assorted machine parts and fittings',
        port_of_entry_code: '2704',
      };
      const res = await receiveEntry(deps(), record, providedFrom(record));
      const entryId = res.entry.id;

      const origins = await pool.query<{ field_name: string; origin: string }>(
        'SELECT field_name, origin FROM cargo_entry_field_origins WHERE entry_id = $1 ORDER BY field_name',
        [entryId],
      );
      expect(origins.rows.length).toBe(3);
      expect(origins.rows.every((r) => r.origin === 'HUMAN')).toBe(true);
      expect(origins.rows.map((r) => r.field_name).sort()).toEqual(
        ['entry_number', 'goods_description', 'port_of_entry_code'].sort(),
      );
    });

    it('10. an all-null entry creates zero field-origin rows and still commits', async () => {
      const record = blankEntry();
      const res = await receiveEntry(deps(), record, providedFrom(record));
      expect(await countWhere('cargo_entry_field_origins', 'entry_id', res.entry.id)).toBe(0);
      // It committed: the entry row exists.
      expect(await countWhere('cargo_entries', 'id', res.entry.id)).toBe(1);
    });

    it('11. values are stored as typed: lowercase entry_number is stored, returned and audited byte-identically — never reformatted', async () => {
      // 'abc12345678' is lowercase. The stored/returned/audited value is the
      // exact text the specialist typed: the receipt never uppercases, strips
      // hyphens or reformats (F3 §The Entry Field Set, F6 acceptance 6,
      // JRN-01 US-3.2). NOTE: the plan predicted this would also FAIL RIV-011,
      // but RIV-011 normalises the value with upperAlnum() before matching
      // (`^[A-Z0-9]{3}[0-9]{8}$`), so 'abc12345678' → 'ABC12345678' SATISFIES the
      // format rule. Byte-identity of the STORED value is what this case pins;
      // the (non-)finding is asserted against the rule's real behaviour.
      const record: CanonicalEntryRecord = { ...blankEntry(), entry_number: 'abc12345678' };
      const res = await receiveEntry(deps(), record, providedFrom(record));
      const entryId = res.entry.id;

      // Stored column.
      const stored = await pool.query<{ entry_number: string }>(
        'SELECT entry_number FROM cargo_entries WHERE id = $1',
        [entryId],
      );
      expect(stored.rows[0]!.entry_number).toBe('abc12345678');
      // Response.
      expect(res.entry.values.entry_number).toBe('abc12345678');
      // ENTRY_RECEIVED audit value row.
      const auditValue = await pool.query<{ after_value: string }>(
        `SELECT v.after_value
           FROM audit_entry_values v
           JOIN audit_entries e ON e.id = v.audit_entry_id
          WHERE e.case_id = $1 AND e.action_type = 'ENTRY_RECEIVED' AND v.field_name = 'entry_number'`,
        [entryId],
      );
      expect(auditValue.rows[0]!.after_value).toBe('abc12345678');

      // Neither the presence (RIV-010) nor the format (RIV-011) rule fires:
      // normalisation for the PREDICATE accepts the lowercase form, while the
      // STORED value stays verbatim — the two are decoupled by design.
      const ids = res.validation.findings.map((f) => f.rule_id);
      expect(ids).not.toContain('RIV-010');
      expect(ids).not.toContain('RIV-011');
    });
  });

  // ── Determinism through the committed path (NFR-11) ────────────────────────

  it('12. the same content received twice yields identical ordered findings', async () => {
    const base = blankEntry();
    const first = await receiveEntry(deps(), { ...base, entry_number: uniqueEntryNumber() }, providedFrom({ ...base, entry_number: 'x' }));
    const second = await receiveEntry(deps(), { ...base, entry_number: uniqueEntryNumber() }, providedFrom({ ...base, entry_number: 'x' }));

    // Compare findings ignoring the entry_number-specific findings (both provide
    // an entry_number so their finding sets are structurally identical).
    expect(first.validation.findings).toEqual(second.validation.findings);
  });

  // ── The 409 and the atomicity guarantee ────────────────────────────────────

  it('13. a duplicate entry_number throws EntryNumberDuplicateError with the existing case_reference and saves nothing', async () => {
    const entryNumber = uniqueEntryNumber();
    const firstRecord = cleanEntry({ entry_number: entryNumber });
    const firstRes = await receiveEntry(deps(), firstRecord, providedFrom(firstRecord));
    const existingReference = firstRes.case_reference;

    const before = {
      entries: (await pool.query('SELECT count(*)::int AS n FROM cargo_entries')).rows[0].n as number,
      results: (await pool.query('SELECT count(*)::int AS n FROM validation_results')).rows[0].n as number,
      exceptions: (await pool.query('SELECT count(*)::int AS n FROM exceptions')).rows[0].n as number,
      recommendations: (await pool.query('SELECT count(*)::int AS n FROM recommendations')).rows[0].n as number,
      audit: (await pool.query('SELECT count(*)::int AS n FROM audit_entries')).rows[0].n as number,
    };

    // A second, DIFFERENT content reusing the same entry number.
    const dupRecord = blankEntry();
    dupRecord.entry_number = entryNumber;
    let thrown: unknown;
    try {
      await receiveEntry(deps(), dupRecord, providedFrom(dupRecord));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(EntryNumberDuplicateError);
    expect((thrown as EntryNumberDuplicateError).entry_number).toBe(entryNumber);
    expect((thrown as EntryNumberDuplicateError).case_reference).toBe(existingReference);

    const after = {
      entries: (await pool.query('SELECT count(*)::int AS n FROM cargo_entries')).rows[0].n as number,
      results: (await pool.query('SELECT count(*)::int AS n FROM validation_results')).rows[0].n as number,
      exceptions: (await pool.query('SELECT count(*)::int AS n FROM exceptions')).rows[0].n as number,
      recommendations: (await pool.query('SELECT count(*)::int AS n FROM recommendations')).rows[0].n as number,
      audit: (await pool.query('SELECT count(*)::int AS n FROM audit_entries')).rows[0].n as number,
    };
    expect(after).toEqual(before);

    // A subsequent successful receipt gets a HIGHER reference than the first —
    // the sequence gap from the failed attempt is acceptable, nothing renumbered.
    const nextRecord = cleanEntry({ entry_number: uniqueEntryNumber() });
    const nextRes = await receiveEntry(deps(), nextRecord, providedFrom(nextRecord));
    const seqOf = (ref: string) => Number(ref.slice(-6));
    expect(seqOf(nextRes.case_reference)).toBeGreaterThan(seqOf(existingReference));
  });

  it('14. INTENDED: a bearer-token-shaped goods_description is refused by the audit writer and nothing is saved', async () => {
    const before = {
      entries: (await pool.query('SELECT count(*)::int AS n FROM cargo_entries')).rows[0].n as number,
      results: (await pool.query('SELECT count(*)::int AS n FROM validation_results')).rows[0].n as number,
      audit: (await pool.query('SELECT count(*)::int AS n FROM audit_entries')).rows[0].n as number,
    };

    const record: CanonicalEntryRecord = {
      ...blankEntry(),
      entry_number: uniqueEntryNumber(),
      goods_description: 'Bearer abcdefghijklmnop',
    };
    await expect(receiveEntry(deps(), record, providedFrom(record))).rejects.toMatchObject({
      code: 'AUDIT_WRITE_FORBIDDEN_CONTENT',
    });

    const after = {
      entries: (await pool.query('SELECT count(*)::int AS n FROM cargo_entries')).rows[0].n as number,
      results: (await pool.query('SELECT count(*)::int AS n FROM validation_results')).rows[0].n as number,
      audit: (await pool.query('SELECT count(*)::int AS n FROM audit_entries')).rows[0].n as number,
    };
    expect(after).toEqual(before);
  });

  // ── Receipt position (F5 FR-5.8) ───────────────────────────────────────────

  it('15. three sequential failing entries receive strictly increasing receipt_position values', async () => {
    const positions: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await receiveEntry(deps(), blankEntry(), providedFrom(blankEntry()));
      expect(res.exception).not.toBeNull();
      positions.push(res.exception!.receipt_position);
    }
    expect(positions[1]!).toBeGreaterThan(positions[0]!);
    expect(positions[2]!).toBeGreaterThan(positions[1]!);
  });

  // ── Immutability of the record (F3 FR-3.6, F4 FR-4.12) ─────────────────────

  it('16. the validation_results row is byte-stable and unique — a second insert for the same entry is refused with 23505', async () => {
    const record = cleanEntry({ entry_number: uniqueEntryNumber() });
    const res = await receiveEntry(deps(), record, providedFrom(record));
    const entryId = res.entry.id;

    const read1 = await pool.query(
      'SELECT * FROM validation_results WHERE entry_id = $1',
      [entryId],
    );
    const read2 = await pool.query(
      'SELECT * FROM validation_results WHERE entry_id = $1',
      [entryId],
    );
    expect(read1.rows.length).toBe(1);
    expect(read1.rows[0]).toEqual(read2.rows[0]);

    // Positive control: the first insert succeeded (above). A second
    // insertValidationResult for the same entry is refused by
    // uq_validation_results_entry (23505). Roll it back so it leaves no residue.
    let thrown: unknown;
    try {
      await withTransaction(pool, async (tx) => {
        await insertValidationResult(tx, {
          entry_id: entryId,
          outcome: 'PASS',
          rule_set_version: 'RIV-2026.09',
          rules_evaluated_count: 14,
          findings_count: 0,
        });
      });
    } catch (err) {
      thrown = err;
    }
    expect((thrown as { code?: string }).code).toBe('23505');
  });
});
