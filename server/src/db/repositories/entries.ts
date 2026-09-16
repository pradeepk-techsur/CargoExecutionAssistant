import type { EntryFieldName, EntryFieldOrigins, ReceiptOutcome } from '@cargoexec/contract';
import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for the receipt tables `cargo_entries` and
 * `cargo_entry_field_origins` (migrations 0002 / 0008 / 0011).
 *
 * Every function takes a `Queryable` as its first argument so the receipt
 * transaction passes its `PoolClient`: a repository NEVER touches a pool and
 * NEVER issues `BEGIN` (R-L1, R-L2). All SQL is static text with `$n` binds —
 * no ORM, no query builder, no template-literal interpolation of caller data
 * (R-L8). The two multi-row inserts use `unnest()` array parameters so the query
 * text stays a constant string; `headers.spec.ts`'s template-literal-SQL gate
 * therefore keeps its exclusion list at exactly two files.
 *
 * This module carries NO business logic: no normalisation (the receipt service
 * trims and null-collapses), no validation (F4's engine), no receipt-outcome
 * decision (the service passes the FINAL outcome). It reads and writes rows.
 *
 * There is deliberately NO `updateEntry` / `deleteEntry` / `upsertEntry` and NO
 * `listEntries` / `findAllEntries` of any shape: the entry of record is
 * immutable after insert (F3 FR-3.6 — `immutability.spec.ts` asserts no
 * cargo-entry UPDATE statement exists in `server/src`), and there is no unscoped
 * collection endpoint (F3 FR-3.12, PRD §10 exclusion).
 */

/**
 * The fourteen fields after transport normalisation: leading/trailing
 * whitespace trimmed, and '' / whitespace-only collapsed to null (F3 FR-3.8 —
 * empty string, whitespace-only and absent are treated IDENTICALLY). Values are
 * carried as TEXT, including quantity / declared_value_usd / arrival_date,
 * because F4 evaluates the submitted text (RIV-101 "parses as a decimal",
 * RIV-131 "is a calendrically valid date") and the audit record must show what
 * the specialist actually typed. The INSERT casts at the bind site.
 *
 * NOTE (plan 03-02): the validation registry imports this type-only while both
 * plans run in wave 1; the type is defined verbatim in each so the two are
 * byte-compatible.
 */
export type CanonicalEntryRecord = { readonly [K in EntryFieldName]: string | null };

/**
 * Allocate the receipt stamp: `received_at` and `case_reference` from ONE
 * statement, so both come from the same transaction snapshot. `case_reference`
 * is `CE-{YYYY}-{NNNNNN}` with `YYYY` the UTC year of receipt and `NNNNNN`
 * zero-padded from `case_reference_seq` (F3 FR-3.13).
 *
 * The `cargo_entries_case_reference_fmt_chk` CHECK is `^CE-[0-9]{4}-[0-9]{6}$`,
 * so a sequence past 999999 fails the CHECK rather than silently widening — that
 * is correct and needs no handling here. `pg` returns a `Date` for
 * `timestamptz`; we hand it back as an ISO string.
 */
export async function allocateReceiptStamp(
  db: Queryable,
): Promise<{ received_at: string; case_reference: string }> {
  const res = await db.query<{ received_at: Date; case_reference: string }>(
    `SELECT now() AS received_at,
            'CE-' || to_char(now() AT TIME ZONE 'UTC', 'YYYY') || '-' ||
            lpad(nextval('case_reference_seq')::text, 6, '0') AS case_reference`,
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('allocateReceiptStamp: SELECT returned no row');
  }
  return { received_at: row.received_at.toISOString(), case_reference: row.case_reference };
}

/**
 * The SINGLE INSERT into `cargo_entries`, carrying the FINAL `receipt_outcome`
 * (deviation D-3: the outcome is written once, at receipt, never updated). There
 * is no other write of this table beyond `lockCaseAnchor`'s `SELECT … FOR
 * UPDATE`; `immutability.spec.ts` pins the absence of any cargo-entry UPDATE.
 *
 * ⚠️ PRECONDITION: `values.arrival_date` MUST already be `null` when it is not a
 * calendrically valid ISO date. `'2026-02-30'::date` raises `22008` in
 * PostgreSQL, which would turn a mistyped date into a `500` instead of the
 * `RIV-131` finding the FRD requires (F3 §Validation: a malformed date MUST NOT
 * become a 422 — nor a 500). The receipt service is responsible for passing
 * `null` there; the `$18::date` cast below assumes that has been done.
 */
export async function insertEntry(
  db: Queryable,
  input: {
    values: CanonicalEntryRecord;
    created_by: string;
    received_at: string;
    case_reference: string;
    receipt_outcome: ReceiptOutcome;
  },
): Promise<{ id: string }> {
  const v = input.values;
  const res = await db.query<{ id: string }>(
    `INSERT INTO cargo_entries (
       case_reference, created_by, received_at, receipt_outcome,
       entry_number, importer_of_record_id, port_of_entry_code, mode_of_transport,
       carrier_code, conveyance_name, bill_of_lading_number, air_waybill_number,
       country_of_origin_code, goods_description, quantity, quantity_uom,
       declared_value_usd, arrival_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
             $15::numeric, $16, $17::numeric, $18::date)
     RETURNING id`,
    [
      input.case_reference,
      input.created_by,
      input.received_at,
      input.receipt_outcome,
      v.entry_number,
      v.importer_of_record_id,
      v.port_of_entry_code,
      v.mode_of_transport,
      v.carrier_code,
      v.conveyance_name,
      v.bill_of_lading_number,
      v.air_waybill_number,
      v.country_of_origin_code,
      v.goods_description,
      v.quantity,
      v.quantity_uom,
      v.declared_value_usd,
      v.arrival_date,
    ],
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('insertEntry: INSERT returned no id');
  }
  return row;
}

/**
 * Take the case-anchor lock the audit writer needs for `case_sequence`
 * assignment (FR-0.6 / FR-13.5). `SELECT … FOR UPDATE` is a LOCK, not a
 * mutation — this is why migration 0011 grants `cargoexec_app` UPDATE on the
 * table, and the reason the entry-of-record immutability guarantee is
 * application-level (no cargo-entry UPDATE statement exists anywhere).
 */
export async function lockCaseAnchor(db: Queryable, entryId: string): Promise<void> {
  await db.query(`SELECT id FROM cargo_entries WHERE id = $1 FOR UPDATE`, [entryId]);
}

/**
 * Record one provenance row per PROVIDED field (`origin = 'HUMAN'`). Absent and
 * whitespace-only fields get none (F3 FR-3.8). Static query text via
 * `unnest($2::text[])` — no `($1,$2),($3,$4)` placeholder scaffold. Returns
 * early with NO statement when `fields` is empty (an entirely empty entry is the
 * primary demonstration path and legitimately has zero origin rows).
 */
export async function insertFieldOrigins(
  db: Queryable,
  entryId: string,
  fields: readonly EntryFieldName[],
): Promise<void> {
  if (fields.length === 0) {
    return;
  }
  await db.query(
    `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
     SELECT $1, f, 'HUMAN' FROM unnest($2::text[]) AS f`,
    [entryId, fields as readonly string[]],
  );
}

/**
 * Find the existing case reference for an entry number. Used AFTER the receipt
 * transaction has rolled back on `23505` to name the existing case in the
 * `409 ENTRY_NUMBER_DUPLICATE` response (F3 FR-3.9, §1.5 step 9). It runs on the
 * POOL, not in the dead transaction — the duplicate lookup must not hold the
 * failed transaction open. Returns `null` when no entry carries that number.
 */
export async function findCaseReferenceByEntryNumber(
  db: Queryable,
  entryNumber: string,
): Promise<string | null> {
  const res = await db.query<{ case_reference: string }>(
    `SELECT case_reference FROM cargo_entries WHERE entry_number = $1`,
    [entryNumber],
  );
  return res.rows[0]?.case_reference ?? null;
}

/** One entry-of-record row, numeric/date columns already stringified. */
export type EntryDetailRow = {
  id: string;
  case_reference: string;
  received_at: Date;
  receipt_outcome: ReceiptOutcome;
  created_by_id: string;
  created_by_display_name: string;
  values: CanonicalEntryRecord;
};

/**
 * Load the entry of record for `GET /api/entries/{entryId}` (F3 FR-3.11). The
 * numeric and date columns are cast to text (`::text` / `to_char`) so they reach
 * the wire as strings — `EntryValues` stays `string | null` and no float
 * rounding is introduced. Returns `null` when no row (the route maps that to
 * `404 ENTRY_NOT_FOUND`).
 */
export async function loadEntryDetail(
  db: Queryable,
  entryId: string,
): Promise<EntryDetailRow | null> {
  const res = await db.query<{
    id: string;
    case_reference: string;
    received_at: Date;
    receipt_outcome: ReceiptOutcome;
    entry_number: string | null;
    importer_of_record_id: string | null;
    port_of_entry_code: string | null;
    mode_of_transport: string | null;
    carrier_code: string | null;
    conveyance_name: string | null;
    bill_of_lading_number: string | null;
    air_waybill_number: string | null;
    country_of_origin_code: string | null;
    goods_description: string | null;
    quantity: string | null;
    quantity_uom: string | null;
    declared_value_usd: string | null;
    arrival_date: string | null;
    created_by_id: string;
    created_by_display_name: string;
  }>(
    `SELECT e.id, e.case_reference, e.received_at, e.receipt_outcome,
            e.entry_number, e.importer_of_record_id, e.port_of_entry_code,
            e.mode_of_transport, e.carrier_code, e.conveyance_name,
            e.bill_of_lading_number, e.air_waybill_number,
            e.country_of_origin_code, e.goods_description,
            e.quantity::text AS quantity, e.quantity_uom,
            e.declared_value_usd::text AS declared_value_usd,
            to_char(e.arrival_date, 'YYYY-MM-DD') AS arrival_date,
            s.id AS created_by_id, s.display_name AS created_by_display_name
       FROM cargo_entries e JOIN specialists s ON s.id = e.created_by
      WHERE e.id = $1`,
    [entryId],
  );
  const r = res.rows[0];
  if (r === undefined) {
    return null;
  }
  return {
    id: r.id,
    case_reference: r.case_reference,
    received_at: r.received_at,
    receipt_outcome: r.receipt_outcome,
    created_by_id: r.created_by_id,
    created_by_display_name: r.created_by_display_name,
    values: {
      entry_number: r.entry_number,
      importer_of_record_id: r.importer_of_record_id,
      port_of_entry_code: r.port_of_entry_code,
      mode_of_transport: r.mode_of_transport,
      carrier_code: r.carrier_code,
      conveyance_name: r.conveyance_name,
      bill_of_lading_number: r.bill_of_lading_number,
      air_waybill_number: r.air_waybill_number,
      country_of_origin_code: r.country_of_origin_code,
      goods_description: r.goods_description,
      quantity: r.quantity,
      quantity_uom: r.quantity_uom,
      declared_value_usd: r.declared_value_usd,
      arrival_date: r.arrival_date,
    },
  };
}

/**
 * Load the 14 submitted field values for the F9 generation job — DELIBERATELY
 * NO JOIN to `specialists` (FR-9.16: the AI reads entry content + findings
 * ONLY, never a specialist's identity/name/email). This is why
 * `loadEntryDetail` — which joins `specialists` for `created_by_display_name`
 * — is NOT reused here: that join would fail under the `cargoexec_ai` role
 * (migration 0008 revokes ALL privilege on `specialists` from `cargoexec_ai`),
 * and would leak specialist identity to the provider even if it did not.
 * Returns `null` if the entry does not exist.
 */
export async function loadEntryValuesForRecommendation(
  db: Queryable,
  entryId: string,
): Promise<CanonicalEntryRecord | null> {
  const res = await db.query<{
    entry_number: string | null; importer_of_record_id: string | null;
    port_of_entry_code: string | null; mode_of_transport: string | null;
    carrier_code: string | null; conveyance_name: string | null;
    bill_of_lading_number: string | null; air_waybill_number: string | null;
    country_of_origin_code: string | null; goods_description: string | null;
    quantity: string | null; quantity_uom: string | null;
    declared_value_usd: string | null; arrival_date: string | null;
  }>(
    `SELECT entry_number, importer_of_record_id, port_of_entry_code, mode_of_transport,
            carrier_code, conveyance_name, bill_of_lading_number, air_waybill_number,
            country_of_origin_code, goods_description,
            quantity::text AS quantity, quantity_uom,
            declared_value_usd::text AS declared_value_usd,
            to_char(arrival_date, 'YYYY-MM-DD') AS arrival_date
       FROM cargo_entries WHERE id = $1`,
    [entryId],
  );
  const r = res.rows[0];
  if (r === undefined) return null;
  return { ...r };
}

/**
 * Load the field-origin map for an entry — every recorded field maps to
 * `'HUMAN'` by construction (`cefo_origin_human_chk`). Companion to
 * `loadEntryDetail` for the `GET /api/entries/{entryId}` read (F3 FR-3.11).
 */
export async function loadFieldOrigins(
  db: Queryable,
  entryId: string,
): Promise<EntryFieldOrigins> {
  const res = await db.query<{ field_name: EntryFieldName }>(
    `SELECT field_name FROM cargo_entry_field_origins WHERE entry_id = $1`,
    [entryId],
  );
  const origins: { -readonly [K in EntryFieldName]?: 'HUMAN' } = {};
  for (const row of res.rows) {
    origins[row.field_name] = 'HUMAN';
  }
  return origins;
}
