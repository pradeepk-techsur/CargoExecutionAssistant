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
import type { EntryFieldName } from '@cargoexec/contract';

// ─────────────────────────────────────────────────────────────────────────────
// Criterion 5 (plan 03-07, F3 FR-3.3 acceptance 3, NFR-6): when any part of
// receipt fails, NOTHING at all is saved — no entry without its assessment, no
// exception without its entry, no orphan audit entry — proven by forcing a
// failure mid-transaction and finding the database unchanged.
//
// This is a CENSUS, not a spot check: after each forced failure we count rows in
// every one of the eight tables a receipt can touch and assert each is identical
// to the pre-call value. The failures are REAL and causal — no repository or
// writer is mocked — so the test proves the transaction boundary rather than a
// stub's behaviour. Case 10's positive control proves the census would notice a
// service that saved nothing.
//
// Everything runs as cargoexec_app against a per-suite migrated database.
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

/** Every table a receipt can touch. Census compares each before/after. */
const CENSUS_TABLES = [
  'cargo_entries',
  'cargo_entry_field_origins',
  'validation_results',
  'validation_findings',
  'exceptions',
  'recommendations',
  'audit_entries',
  'audit_entry_values',
] as const;

type Census = Record<(typeof CENSUS_TABLES)[number], number>;

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

describe('receiptAtomicity — a failed receipt leaves the database byte-unchanged (criterion 5)', () => {
  let db: TestDatabase;
  let pool: Pool;
  let principal: ReceiptPrincipal;

  beforeAll(async () => {
    db = await createTestDatabase();
    pool = new Pool({ connectionString: db.appUrl });
    const spec = await createTestSpecialist(db.appUrl, { display_name: 'Atomicity Tester' });
    principal = { id: spec.id, display_name: spec.display_name };
  });

  afterAll(async () => {
    await pool.end();
    await dropTestDatabase(db);
  });

  function deps() {
    return { pool, principal };
  }

  /** Row counts for every table a receipt can touch. */
  async function census(): Promise<Census> {
    const out = {} as Census;
    for (const table of CENSUS_TABLES) {
      // table is a test-literal constant, never client input.
      const res = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
      out[table] = res.rows[0]!.n;
    }
    return out;
  }

  async function scalar(sql: string, params: unknown[] = []): Promise<number> {
    const res = await pool.query<{ n: number }>(sql, params);
    return res.rows[0]!.n;
  }

  // ── 1. Failure after the entry INSERT, before any audit entry ──────────────

  it('1. a poisoned goods_description fails in the audit writer AFTER the entry INSERT — census identical, zero new cargo_entries (F3 acceptance 3)', async () => {
    const before = await census();
    // 'Bearer …' matches the audit writer's SECRET_VALUE_RES; append() raises
    // AUDIT_WRITE_FORBIDDEN_CONTENT at step 12, AFTER the cargo_entries INSERT of
    // step 9. A real, causal, mid-transaction failure with no mocking.
    const record: CanonicalEntryRecord = {
      ...blankEntry(),
      entry_number: uniqueEntryNumber(),
      goods_description: 'Bearer abcdefghijklmnop',
    };
    await expect(receiveEntry(deps(), record, providedFrom(record))).rejects.toMatchObject({
      code: 'AUDIT_WRITE_FORBIDDEN_CONTENT',
    });
    const after = await census();
    expect(after).toEqual(before);
    // Named explicitly (F3 acceptance 3): zero new entry, result, audit rows.
    expect(after.cargo_entries).toBe(before.cargo_entries);
    expect(after.validation_results).toBe(before.validation_results);
    expect(after.audit_entries).toBe(before.audit_entries);
  });

  // ── 2. Failure at the entry INSERT — duplicate entry_number ────────────────

  it('2. a duplicate entry_number fails before any audit entry — census identical', async () => {
    // Seed a first entry that owns the number, then re-submit it.
    const number = uniqueEntryNumber();
    const first = cleanEntry({ entry_number: number });
    await receiveEntry(deps(), first, providedFrom(first));

    const before = await census();
    const dup = { ...blankEntry(), entry_number: number };
    await expect(receiveEntry(deps(), dup, providedFrom(dup))).rejects.toBeInstanceOf(
      EntryNumberDuplicateError,
    );
    const after = await census();
    expect(after).toEqual(before);
  });

  // ── 3. Failure at the entry INSERT — over-length goods_description ──────────

  it('3. an over-length goods_description is refused by cargo_entries_len_chk (23514) at the INSERT — census identical', async () => {
    const before = await census();
    const record: CanonicalEntryRecord = {
      ...blankEntry(),
      entry_number: uniqueEntryNumber(),
      goods_description: 'x'.repeat(2001), // exceeds the 2000 CHECK
    };
    let err: (Error & { code?: string }) | undefined;
    try {
      await receiveEntry(deps(), record, providedFrom(record));
    } catch (e) {
      err = e as Error & { code?: string };
    }
    expect(err, 'the over-length insert must fail').toBeDefined();
    // Failing for the reason it claims: the DDL CHECK, not something incidental.
    expect(err!.code).toBe('23514');
    const after = await census();
    expect(after).toEqual(before);
  });

  // ── 4–9. Whole-database invariants after a mixed suite of successes/failures ─

  it('4–9. after a mixed sequence of clean/failing successes, every whole-database coupling invariant holds', async () => {
    // A handful of successes of both kinds, interleaved with failures that must
    // save nothing, then assert the invariants across the WHOLE database.
    await receiveEntry(deps(), cleanEntry(), providedFrom(cleanEntry()));
    await receiveEntry(deps(), blankEntry(), providedFrom(blankEntry()));
    const poisoned: CanonicalEntryRecord = {
      ...blankEntry(),
      entry_number: uniqueEntryNumber(),
      goods_description: 'Bearer poisonedvalue123',
    };
    await receiveEntry(deps(), poisoned, providedFrom(poisoned)).catch(() => undefined);
    await receiveEntry(deps(), blankEntry(), providedFrom(blankEntry()));

    // 4. No entry without its assessment.
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM cargo_entries e
          LEFT JOIN validation_results v ON v.entry_id = e.id
          WHERE v.id IS NULL`,
      ),
    ).toBe(0);

    // 5. No exception without its entry.
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM exceptions x
          LEFT JOIN cargo_entries e ON e.id = x.entry_id
          WHERE e.id IS NULL`,
      ),
    ).toBe(0);

    // 6. No orphan audit entry, and no orphan audit value.
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM audit_entries a
          LEFT JOIN cargo_entries e ON e.id = a.case_id
          WHERE e.id IS NULL`,
      ),
    ).toBe(0);
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM audit_entry_values v
          LEFT JOIN audit_entries a ON a.id = v.audit_entry_id
          WHERE a.id IS NULL`,
      ),
    ).toBe(0);

    // 7. No exception without a failing basis, and none whose basis has zero
    //    findings — every open case carries findings as its stated basis.
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM exceptions x
           JOIN validation_results v ON v.id = x.validation_result_id
          WHERE v.outcome <> 'FAIL'`,
      ),
    ).toBe(0);
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM exceptions x
           JOIN validation_results v ON v.id = x.validation_result_id
          WHERE v.findings_count = 0`,
      ),
    ).toBe(0);

    // 8. Every exception's basis belongs to its own entry.
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM exceptions x
           JOIN validation_results v ON v.id = x.validation_result_id
          WHERE v.entry_id <> x.entry_id`,
      ),
    ).toBe(0);

    // 9. Every committed entry has exactly one ENTRY_RECEIVED and exactly one
    //    VALIDATION_COMPLETED; every exception exactly one EXCEPTION_OPENED.
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM (
           SELECT e.id FROM cargo_entries e
             LEFT JOIN audit_entries a
               ON a.case_id = e.id AND a.action_type = 'ENTRY_RECEIVED'
            GROUP BY e.id HAVING count(a.id) <> 1
         ) offending`,
      ),
    ).toBe(0);
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM (
           SELECT e.id FROM cargo_entries e
             LEFT JOIN audit_entries a
               ON a.case_id = e.id AND a.action_type = 'VALIDATION_COMPLETED'
            GROUP BY e.id HAVING count(a.id) <> 1
         ) offending`,
      ),
    ).toBe(0);
    expect(
      await scalar(
        `SELECT count(*)::int AS n FROM (
           SELECT x.id FROM exceptions x
             LEFT JOIN audit_entries a
               ON a.exception_id = x.id AND a.action_type = 'EXCEPTION_OPENED'
            GROUP BY x.id HAVING count(a.id) <> 1
         ) offending`,
      ),
    ).toBe(0);
  });

  // ── 10. Positive control for the whole suite ───────────────────────────────

  it('10. a clean and a failing receipt both commit with the exact expected row deltas', async () => {
    const before = await census();

    // Clean receipt: +1 entry, +1 result, +0 findings, +0 exception,
    // +0 recommendation, +2 audit entries (ENTRY_RECEIVED + VALIDATION_COMPLETED).
    // A clean entry provides 13 fields (RIV-073 forbids BOL+AWB together, so a
    // conformant ocean entry has no AWB) → +13 field origins + 13 ENTRY_RECEIVED
    // value rows, and the clean VALIDATION_COMPLETED has 0 value rows.
    const cleanRec = cleanEntry();
    const providedClean = providedFrom(cleanRec);
    await receiveEntry(deps(), cleanRec, providedClean);
    const afterClean = await census();
    expect(afterClean.cargo_entries).toBe(before.cargo_entries + 1);
    expect(afterClean.validation_results).toBe(before.validation_results + 1);
    expect(afterClean.validation_findings).toBe(before.validation_findings + 0);
    expect(afterClean.exceptions).toBe(before.exceptions + 0);
    expect(afterClean.recommendations).toBe(before.recommendations + 0);
    expect(afterClean.audit_entries).toBe(before.audit_entries + 2);
    expect(afterClean.cargo_entry_field_origins).toBe(
      before.cargo_entry_field_origins + providedClean.length,
    );

    // Failing receipt (blank entry): +1 entry, +1 result, +13 findings,
    // +1 exception, +1 recommendation (PENDING), +3 audit entries.
    await receiveEntry(deps(), blankEntry(), providedFrom(blankEntry()));
    const afterFail = await census();
    expect(afterFail.cargo_entries).toBe(afterClean.cargo_entries + 1);
    expect(afterFail.validation_results).toBe(afterClean.validation_results + 1);
    expect(afterFail.validation_findings).toBe(afterClean.validation_findings + 13);
    expect(afterFail.exceptions).toBe(afterClean.exceptions + 1);
    expect(afterFail.recommendations).toBe(afterClean.recommendations + 1);
    expect(afterFail.audit_entries).toBe(afterClean.audit_entries + 3);
  });

  // ── 11. The audit chain survives the failures ──────────────────────────────

  it('11. after the mixed sequence, every committed case verifies and case_sequence is contiguous with no gap or duplicate', async () => {
    // The suite above committed several cases and rolled back several attempts.
    // Every committed case's chain must verify, and no rolled-back attempt may
    // have consumed a case_sequence number for a case that exists.
    const cases = await pool.query<{ id: string }>('SELECT id FROM cargo_entries');
    for (const row of cases.rows) {
      const verified = await pool.query<{ chain_verified: boolean }>(
        'SELECT chain_verified FROM verify_audit_chain($1)',
        [row.id],
      );
      expect(verified.rows[0]!.chain_verified, `chain for case ${row.id}`).toBe(true);

      // case_sequence is contiguous from 1 with no gap and no duplicate.
      const seqs = await pool.query<{ case_sequence: string }>(
        'SELECT case_sequence FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence',
        [row.id],
      );
      const nums = seqs.rows.map((r) => Number(r.case_sequence));
      const expected = Array.from({ length: nums.length }, (_, i) => i + 1);
      expect(nums, `case_sequence for ${row.id}`).toEqual(expected);
      expect(new Set(nums).size, `no duplicate sequence for ${row.id}`).toBe(nums.length);
    }
  });

  // ── 12. The response tells the truth ───────────────────────────────────────

  it('12. the poisoned receipt surfaces an AuditWriteError (errorMapper → 500 RECEIPT_FAILED), not a partial success', async () => {
    const record: CanonicalEntryRecord = {
      ...blankEntry(),
      entry_number: uniqueEntryNumber(),
      goods_description: 'Bearer sk-truthfultokenvalue12345',
    };
    let err: (Error & { code?: string; name?: string }) | undefined;
    try {
      await receiveEntry(deps(), record, providedFrom(record));
    } catch (e) {
      err = e as Error & { code?: string; name?: string };
    }
    expect(err, 'the poisoned receipt must reject').toBeDefined();
    // The service-level error identity errorMapper translates to 500
    // RECEIPT_FAILED: an internal invariant code carried by AuditWriteError, not
    // a client-facing ApiError and not a resolved response.
    expect(err!.name).toBe('AuditWriteError');
    expect(err!.code).toBe('AUDIT_WRITE_FORBIDDEN_CONTENT');
  });
});
