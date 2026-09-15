import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { randomBytes } from 'node:crypto';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import {
  allocateReceiptStamp,
  insertEntry,
  insertFieldOrigins,
  type CanonicalEntryRecord,
} from '../../src/db/repositories/entries.js';
import {
  insertValidationResult,
  insertFindings,
  loadValidationByEntry,
} from '../../src/db/repositories/validation.js';
import {
  insertException,
  insertPendingRecommendation,
} from '../../src/db/repositories/exceptions.js';
import type { EntryFieldName, FindingDto } from '@cargoexec/contract';

// ─────────────────────────────────────────────────────────────────────────────
// db tier — every repository insert works from cargoexec_app against the real
// schema (plan 03-01, phase criteria for F3/F4/F5 persistence).
//
// The audit-coupling triggers are DEFERRABLE INITIALLY DEFERRED and fire at
// COMMIT; a repository-only test therefore runs each case inside a BEGIN …
// ROLLBACK so the repositories are exercised in isolation (the full committed
// path is plan 03-05's receipt spec). Every refusal is asserted by SQLSTATE AND
// the named constraint, each with a positive control in the same file — the
// Phase 1 convention.
//
// All statements run as cargoexec_app (the application role, so the migration
// grants are exercised as deployed).
// ─────────────────────────────────────────────────────────────────────────────

type PgError = Error & { code?: string; constraint?: string };

function expectPgError(err: unknown, sqlstate: string, constraint?: string): void {
  const e = err as PgError;
  expect(e).toBeInstanceOf(Error);
  expect(e.code, `expected SQLSTATE ${sqlstate}, got ${e.code}: ${e.message}`).toBe(sqlstate);
  if (constraint !== undefined) {
    expect(e.constraint, `expected constraint ${constraint}, got ${e.constraint}`).toBe(constraint);
  }
}

/** The fourteen fields all null — the "entirely empty entry" baseline. */
function emptyValues(): CanonicalEntryRecord {
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

describe('entries.repo — receipt persistence works from cargoexec_app', () => {
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

  /** Run `fn` inside a BEGIN … ROLLBACK so repositories are exercised in isolation. */
  async function inRolledBackTx<T>(fn: (tx: Client) => Promise<T>): Promise<T> {
    const c = await appClient();
    try {
      await c.query('BEGIN');
      try {
        return await fn(c);
      } finally {
        await c.query('ROLLBACK');
      }
    } finally {
      await c.end();
    }
  }

  /** Create a specialist inside the current tx and return its id (for created_by). */
  async function aSpecialist(tx: Client): Promise<string> {
    const email = `entry-repo-${randomBytes(6).toString('hex')}@example.gov`;
    const res = await tx.query<{ id: string }>(
      `INSERT INTO specialists (email, display_name, password_hash)
       VALUES ($1, 'Repo Test', 'argon2id$placeholder') RETURNING id`,
      [email],
    );
    return res.rows[0]!.id;
  }

  // ── Case 1: receipt stamp ───────────────────────────────────────────────────

  it('case 1: allocateReceiptStamp returns a CE-YYYY-NNNNNN whose year is the UTC year of received_at, and two calls increase', async () => {
    await inRolledBackTx(async (tx) => {
      const first = await allocateReceiptStamp(tx);
      const second = await allocateReceiptStamp(tx);

      expect(first.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);
      expect(second.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);

      const utcYear = String(new Date(first.received_at).getUTCFullYear());
      expect(first.case_reference.slice(3, 7)).toBe(utcYear);

      const seq = (ref: string): number => Number(ref.slice(8));
      expect(seq(second.case_reference)).toBeGreaterThan(seq(first.case_reference));
    });
  });

  // ── Case 2: full insert, byte-identical read-back (no normalisation) ─────────

  it('case 2: insertEntry with all fourteen values populated stores the text byte-identically (no repository normalisation)', async () => {
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const values: CanonicalEntryRecord = {
        entry_number: 'abc12345678', // lowercase on purpose — must come back lowercase
        importer_of_record_id: 'IMP-001',
        port_of_entry_code: 'USLAX',
        mode_of_transport: 'VESSEL',
        carrier_code: 'MAEU',
        conveyance_name: 'Ever Given',
        bill_of_lading_number: 'BOL-99',
        air_waybill_number: null,
        country_of_origin_code: 'CN',
        goods_description: 'Assorted  Machine   PARTS',
        quantity: '12.500',
        quantity_uom: 'KG',
        declared_value_usd: '1000.00',
        arrival_date: '2026-09-01',
      };
      const { id } = await insertEntry(tx, {
        values,
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'VALIDATED_CLEAN',
      });
      expect(id).toMatch(/^[0-9a-f-]{36}$/);

      const back = await tx.query<{
        entry_number: string;
        goods_description: string;
        quantity: string;
        arrival_date: string;
        receipt_outcome: string;
      }>(
        `SELECT entry_number, goods_description, quantity::text AS quantity,
                to_char(arrival_date,'YYYY-MM-DD') AS arrival_date, receipt_outcome
           FROM cargo_entries WHERE id = $1`,
        [id],
      );
      const row = back.rows[0]!;
      expect(row.entry_number).toBe('abc12345678'); // still lowercase
      expect(row.goods_description).toBe('Assorted  Machine   PARTS'); // double spaces survive
      expect(row.quantity).toBe('12.500');
      expect(row.arrival_date).toBe('2026-09-01');
      expect(row.receipt_outcome).toBe('VALIDATED_CLEAN');
    });
  });

  // ── Case 3: entirely empty entry is receivable ──────────────────────────────

  it('case 3: insertEntry with every field null succeeds with receipt_outcome EXCEPTION_OPENED', async () => {
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'EXCEPTION_OPENED',
      });
      const back = await tx.query<{ receipt_outcome: string; entry_number: string | null }>(
        `SELECT receipt_outcome, entry_number FROM cargo_entries WHERE id = $1`,
        [id],
      );
      expect(back.rows[0]!.receipt_outcome).toBe('EXCEPTION_OPENED');
      expect(back.rows[0]!.entry_number).toBeNull();
    });
  });

  // ── Case 4: field origins ───────────────────────────────────────────────────

  it('case 4: insertFieldOrigins writes exactly one HUMAN row per provided field; an empty array writes none', async () => {
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'EXCEPTION_OPENED',
      });

      const fields: EntryFieldName[] = ['entry_number', 'port_of_entry_code', 'goods_description'];
      await insertFieldOrigins(tx, entryId, fields);

      const rows = await tx.query<{ field_name: string; origin: string }>(
        `SELECT field_name, origin FROM cargo_entry_field_origins WHERE entry_id = $1 ORDER BY field_name`,
        [entryId],
      );
      expect(rows.rowCount).toBe(3);
      for (const r of rows.rows) {
        expect(r.origin).toBe('HUMAN');
      }
      expect(rows.rows.map((r) => r.field_name).sort()).toEqual([...fields].sort());

      // Empty array — no statement, no rows. Use a second entry to keep it clean.
      const { id: entry2 } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: (await allocateReceiptStamp(tx)).case_reference,
        receipt_outcome: 'EXCEPTION_OPENED',
      });
      await insertFieldOrigins(tx, entry2, []);
      const none = await tx.query(
        `SELECT 1 FROM cargo_entry_field_origins WHERE entry_id = $1`,
        [entry2],
      );
      expect(none.rowCount).toBe(0);
    });
  });

  // ── Case 5: validation result + findings, ordering ──────────────────────────

  it('case 5: insertValidationResult + insertFindings persist two findings readable in ascending rule_id', async () => {
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'EXCEPTION_OPENED',
      });

      const { id: vrId, evaluated_at } = await insertValidationResult(tx, {
        entry_id: entryId,
        outcome: 'FAIL',
        rule_set_version: 'RIV-2026.09',
        rules_evaluated_count: 31,
        findings_count: 2,
      });
      expect(vrId).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(evaluated_at).toString()).not.toBe('Invalid Date');

      // Caller order is ascending rule_id (F4 FR-4.8).
      const findings: FindingDto[] = [
        { rule_id: 'RIV-010', field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message: 'Provide a goods description.' },
        { rule_id: 'RIV-020', field_name: 'port_of_entry_code', failure_code: 'MISSING_REQUIRED', message: 'Provide a port of entry.' },
      ];
      await insertFindings(tx, vrId, findings);

      const loaded = await loadValidationByEntry(tx, entryId);
      expect(loaded).not.toBeNull();
      expect(loaded!.outcome).toBe('FAIL');
      expect(loaded!.rule_set_version).toBe('RIV-2026.09');
      expect(loaded!.findings.map((f) => f.rule_id)).toEqual(['RIV-010', 'RIV-020']);
      expect(loaded!.findings[0]!.field_name).toBe('goods_description');
    });
  });

  // ── Case 6: PASS/count integrity ────────────────────────────────────────────

  it('case 6: a PASS result with findings_count 0 succeeds; PASS with findings_count 1 is refused by validation_results_counts_chk (23514)', async () => {
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'VALIDATED_CLEAN',
      });

      // Positive control: PASS / 0 findings is the recorded clean pass.
      const { id } = await insertValidationResult(tx, {
        entry_id: entryId,
        outcome: 'PASS',
        rule_set_version: 'RIV-2026.09',
        rules_evaluated_count: 31,
        findings_count: 0,
      });
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });

    // Refusal: PASS with a positive findings_count. Separate entry (unique index).
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'VALIDATED_CLEAN',
      });
      let threw: unknown;
      try {
        await insertValidationResult(tx, {
          entry_id: entryId,
          outcome: 'PASS',
          rule_set_version: 'RIV-2026.09',
          rules_evaluated_count: 31,
          findings_count: 1,
        });
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectPgError(threw, '23514', 'validation_results_counts_chk');
    });
  });

  // ── Case 7: exception basis integrity ───────────────────────────────────────

  it('case 7: insertException against a FAIL result opens an OPEN exception with a positive receipt_position; against a PASS result it is refused by exceptions_basis_fk (23503)', async () => {
    // Positive control: FAIL basis → OPEN exception.
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'EXCEPTION_OPENED',
      });
      const { id: vrId } = await insertValidationResult(tx, {
        entry_id: entryId,
        outcome: 'FAIL',
        rule_set_version: 'RIV-2026.09',
        rules_evaluated_count: 31,
        findings_count: 1,
      });
      await insertFindings(tx, vrId, [
        { rule_id: 'RIV-010', field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message: 'Provide a goods description.' },
      ]);
      const ex = await insertException(tx, { entry_id: entryId, validation_result_id: vrId });
      expect(ex.state).toBe('OPEN');
      expect(Number.isInteger(ex.receipt_position)).toBe(true);
      expect(ex.receipt_position).toBeGreaterThan(0);
    });

    // Refusal: PASS basis. The composite FK (id,'FAIL') references no row when the
    // result is PASS, so exceptions_basis_fk fails at the statement.
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'VALIDATED_CLEAN',
      });
      const { id: vrId } = await insertValidationResult(tx, {
        entry_id: entryId,
        outcome: 'PASS',
        rule_set_version: 'RIV-2026.09',
        rules_evaluated_count: 31,
        findings_count: 0,
      });
      let threw: unknown;
      try {
        await insertException(tx, { entry_id: entryId, validation_result_id: vrId });
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectPgError(threw, '23503', 'exceptions_basis_fk');
    });
  });

  // ── Case 8: pending recommendation placeholder ──────────────────────────────

  it('case 8: insertPendingRecommendation creates a PENDING row with generated_at and failed_at both NULL', async () => {
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'EXCEPTION_OPENED',
      });
      const { id: vrId } = await insertValidationResult(tx, {
        entry_id: entryId,
        outcome: 'FAIL',
        rule_set_version: 'RIV-2026.09',
        rules_evaluated_count: 31,
        findings_count: 1,
      });
      await insertFindings(tx, vrId, [
        { rule_id: 'RIV-010', field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message: 'Provide a goods description.' },
      ]);
      const ex = await insertException(tx, { entry_id: entryId, validation_result_id: vrId });
      const rec = await insertPendingRecommendation(tx, ex.id);

      const back = await tx.query<{ status: string; generated_at: Date | null; failed_at: Date | null }>(
        `SELECT status, generated_at, failed_at FROM recommendations WHERE id = $1`,
        [rec.id],
      );
      expect(back.rows[0]!.status).toBe('PENDING');
      expect(back.rows[0]!.generated_at).toBeNull();
      expect(back.rows[0]!.failed_at).toBeNull();
    });
  });

  // ── Case 9: one exception per entry, ever ───────────────────────────────────

  it('case 9: a second insertException for the same entry is refused by uq_exceptions_entry (23505)', async () => {
    await inRolledBackTx(async (tx) => {
      const createdBy = await aSpecialist(tx);
      const stamp = await allocateReceiptStamp(tx);
      const { id: entryId } = await insertEntry(tx, {
        values: emptyValues(),
        created_by: createdBy,
        received_at: stamp.received_at,
        case_reference: stamp.case_reference,
        receipt_outcome: 'EXCEPTION_OPENED',
      });
      const { id: vrId } = await insertValidationResult(tx, {
        entry_id: entryId,
        outcome: 'FAIL',
        rule_set_version: 'RIV-2026.09',
        rules_evaluated_count: 31,
        findings_count: 1,
      });
      await insertFindings(tx, vrId, [
        { rule_id: 'RIV-010', field_name: 'goods_description', failure_code: 'MISSING_REQUIRED', message: 'Provide a goods description.' },
      ]);

      // First exception — the positive control.
      const first = await insertException(tx, { entry_id: entryId, validation_result_id: vrId });
      expect(first.state).toBe('OPEN');

      // Second exception for the SAME entry is refused by the unique index.
      let threw: unknown;
      try {
        await insertException(tx, { entry_id: entryId, validation_result_id: vrId });
      } catch (err) {
        threw = err;
      }
      expect(threw).toBeDefined();
      expectPgError(threw, '23505', 'uq_exceptions_entry');
    });
  });
});
