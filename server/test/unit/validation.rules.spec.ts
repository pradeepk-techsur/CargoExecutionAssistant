import { describe, it, expect } from 'vitest';
import { ENTRY_FIELDS, type EntryFieldName } from '@cargoexec/contract';

import { RULES } from '../../src/services/validation/rules.js';
import type { RuleDefinition, RuleId } from '../../src/services/validation/types.js';
import type { CanonicalEntryRecord } from '../../src/db/repositories/entries.js';

// TEST-UNIT (RTM §8.8) — traces to F4 FR-4.15, FR-4.5, FR-4.6, FR-4.7, FR-4.13.
//
// A pure unit suite: no database, no fixtures directory. Every rule answers only
// "am I applicable?" and "am I satisfied?" for a given record — the evaluation
// loop, gating semantics, ordering and determinism are plan 03-04's engine and
// are NOT exercised here. This suite proves each of the 31 rules in isolation
// with at least one passing and one failing record, plus the branch, boundary,
// normalisation, hygiene and immutability assertions.

const RECEIVED_AT = '2026-09-15T00:00:00.000Z';

/** A CanonicalEntryRecord with all fourteen fields null. */
function blank(): CanonicalEntryRecord {
  const r: Record<string, string | null> = {};
  for (const f of ENTRY_FIELDS) r[f] = null;
  return r as CanonicalEntryRecord;
}

/** A blank record with the given fields overridden. */
function withFields(partial: Partial<Record<EntryFieldName, string | null>>): CanonicalEntryRecord {
  return { ...blank(), ...partial };
}

const RULE_BY_ID = new Map<string, RuleDefinition>(RULES.map((r) => [r.rule_id, r]));

function rule(id: RuleId): RuleDefinition {
  const r = RULE_BY_ID.get(id);
  if (r === undefined) throw new Error(`rule ${id} not found in RULES`);
  return r;
}

function resolvePrimary(r: RuleDefinition, rec: CanonicalEntryRecord): EntryFieldName {
  return typeof r.primary_field === 'function' ? r.primary_field(rec) : r.primary_field;
}

function resolveMessage(r: RuleDefinition, rec: CanonicalEntryRecord): string {
  return typeof r.message === 'function' ? r.message(rec) : r.message;
}

// ---------------------------------------------------------------------------
// 1. Per-rule table: one PASSING and one FAILING record for each of the 31 rules.
//    Each entry asserts rule.satisfied(pass, RECEIVED_AT) === true and
//    rule.satisfied(fail, RECEIVED_AT) === false. (FR-4.15)
// ---------------------------------------------------------------------------

interface RuleCase {
  readonly rule_id: RuleId;
  readonly pass: Partial<Record<EntryFieldName, string | null>>;
  readonly fail: Partial<Record<EntryFieldName, string | null>>;
}

const CASES: readonly RuleCase[] = [
  { rule_id: 'RIV-010', pass: { entry_number: 'ABC12345678' }, fail: { entry_number: null } },
  { rule_id: 'RIV-011', pass: { entry_number: 'ABC12345678' }, fail: { entry_number: 'AB1234567' } },
  { rule_id: 'RIV-020', pass: { importer_of_record_id: '12-3456789' }, fail: { importer_of_record_id: null } },
  { rule_id: 'RIV-021', pass: { importer_of_record_id: '12-3456789' }, fail: { importer_of_record_id: '1234' } },
  { rule_id: 'RIV-030', pass: { port_of_entry_code: '2704' }, fail: { port_of_entry_code: null } },
  { rule_id: 'RIV-031', pass: { port_of_entry_code: '2704' }, fail: { port_of_entry_code: '27A4' } },
  { rule_id: 'RIV-032', pass: { port_of_entry_code: '2704' }, fail: { port_of_entry_code: '9999' } },
  { rule_id: 'RIV-040', pass: { mode_of_transport: 'OCEAN' }, fail: { mode_of_transport: null } },
  { rule_id: 'RIV-041', pass: { mode_of_transport: 'ocean' }, fail: { mode_of_transport: 'SPACE' } },
  { rule_id: 'RIV-050', pass: { carrier_code: 'MAEU' }, fail: { carrier_code: null } },
  { rule_id: 'RIV-051', pass: { carrier_code: 'MAEU', mode_of_transport: 'OCEAN' }, fail: { carrier_code: 'AA1', mode_of_transport: 'OCEAN' } },
  { rule_id: 'RIV-060', pass: { conveyance_name: 'MV Ever Given / 042E' }, fail: { conveyance_name: null } },
  { rule_id: 'RIV-070', pass: { mode_of_transport: 'OCEAN', bill_of_lading_number: 'MAEU123456' }, fail: { mode_of_transport: 'OCEAN' } },
  { rule_id: 'RIV-071', pass: { air_waybill_number: '12345678901' }, fail: { air_waybill_number: '1234567890' } },
  { rule_id: 'RIV-072', pass: { bill_of_lading_number: 'MAEU123456' }, fail: { bill_of_lading_number: 'AB' } },
  { rule_id: 'RIV-073', pass: { bill_of_lading_number: 'MAEU123456' }, fail: { bill_of_lading_number: 'MAEU123456', air_waybill_number: '12345678901' } },
  { rule_id: 'RIV-080', pass: { country_of_origin_code: 'CN' }, fail: { country_of_origin_code: null } },
  { rule_id: 'RIV-081', pass: { country_of_origin_code: 'CN' }, fail: { country_of_origin_code: 'CHN' } },
  { rule_id: 'RIV-082', pass: { country_of_origin_code: 'CN' }, fail: { country_of_origin_code: 'XX' } },
  { rule_id: 'RIV-090', pass: { goods_description: 'Stainless steel fasteners, M8' }, fail: { goods_description: null } },
  { rule_id: 'RIV-091', pass: { goods_description: 'Stainless steel fasteners' }, fail: { goods_description: 'bolts' } },
  { rule_id: 'RIV-092', pass: { goods_description: 'Stainless steel fasteners, M8' }, fail: { goods_description: 'assorted goods' } },
  { rule_id: 'RIV-100', pass: { quantity: '100' }, fail: { quantity: null } },
  { rule_id: 'RIV-101', pass: { quantity: '100.5' }, fail: { quantity: '0' } },
  { rule_id: 'RIV-110', pass: { quantity_uom: 'KG' }, fail: { quantity_uom: null } },
  { rule_id: 'RIV-111', pass: { quantity_uom: 'kg' }, fail: { quantity_uom: 'KILOS' } },
  { rule_id: 'RIV-120', pass: { declared_value_usd: '1200.00' }, fail: { declared_value_usd: null } },
  { rule_id: 'RIV-121', pass: { declared_value_usd: '1200.00' }, fail: { declared_value_usd: '1200.005' } },
  { rule_id: 'RIV-130', pass: { arrival_date: '2026-09-20' }, fail: { arrival_date: null } },
  { rule_id: 'RIV-131', pass: { arrival_date: '2024-02-29' }, fail: { arrival_date: '2026-02-30' } },
  { rule_id: 'RIV-132', pass: { arrival_date: '2026-09-20' }, fail: { arrival_date: '2025-01-01' } },
];

describe('per-rule satisfied() — one passing + one failing record each (FR-4.15)', () => {
  for (const c of CASES) {
    it(`${c.rule_id} passes its passing record and fails its failing record`, () => {
      const r = rule(c.rule_id);
      expect(r.satisfied(withFields(c.pass), RECEIVED_AT)).toBe(true);
      expect(r.satisfied(withFields(c.fail), RECEIVED_AT)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. The table covers every rule_id in RULES and no id outside it.
// ---------------------------------------------------------------------------

describe('per-rule table completeness', () => {
  it('the case table keys equal the RULES ids exactly (set equality)', () => {
    const rulesIds = new Set(RULES.map((r) => r.rule_id));
    const tableIds = new Set(CASES.map((c) => c.rule_id));
    expect(tableIds.size).toBe(CASES.length); // no duplicate ids in the table
    expect([...tableIds].sort()).toEqual([...rulesIds].sort());
    expect(rulesIds.size).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// 3. RIV-051 mode-sensitive branch.
// ---------------------------------------------------------------------------

describe('RIV-051 — carrier code format branches on normalised mode', () => {
  const r = () => rule('RIV-051');
  it("'MAEU' passes with mode OCEAN (SCAC)", () => {
    expect(r().satisfied(withFields({ carrier_code: 'MAEU', mode_of_transport: 'OCEAN' }), RECEIVED_AT)).toBe(true);
  });
  it("'MAEU' passes with mode MISSING (SCAC fallback)", () => {
    expect(r().satisfied(withFields({ carrier_code: 'MAEU' }), RECEIVED_AT)).toBe(true);
  });
  it("'AA1' passes under mode AIR", () => {
    expect(r().satisfied(withFields({ carrier_code: 'AA1', mode_of_transport: 'AIR' }), RECEIVED_AT)).toBe(true);
  });
  it("'AA1' fails under mode OCEAN (SCAC rejects the digit)", () => {
    expect(r().satisfied(withFields({ carrier_code: 'AA1', mode_of_transport: 'OCEAN' }), RECEIVED_AT)).toBe(false);
  });
  it("'AA1' fails under a MISSING mode (SCAC fallback rejects the digit)", () => {
    expect(r().satisfied(withFields({ carrier_code: 'AA1' }), RECEIVED_AT)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. RIV-070 transport-document branches.
// ---------------------------------------------------------------------------

describe('RIV-070 — a transport document present for the mode', () => {
  const r = () => rule('RIV-070');
  it('mode AIR + only a bill of lading ⇒ not satisfied', () => {
    expect(r().satisfied(withFields({ mode_of_transport: 'AIR', bill_of_lading_number: 'MAEU123456' }), RECEIVED_AT)).toBe(false);
  });
  it('mode AIR + an air waybill ⇒ satisfied', () => {
    expect(r().satisfied(withFields({ mode_of_transport: 'AIR', air_waybill_number: '12345678901' }), RECEIVED_AT)).toBe(true);
  });
  it('mode OCEAN + only an air waybill ⇒ not satisfied', () => {
    expect(r().satisfied(withFields({ mode_of_transport: 'OCEAN', air_waybill_number: '12345678901' }), RECEIVED_AT)).toBe(false);
  });
  it('mode OCEAN + a bill of lading ⇒ satisfied', () => {
    expect(r().satisfied(withFields({ mode_of_transport: 'OCEAN', bill_of_lading_number: 'MAEU123456' }), RECEIVED_AT)).toBe(true);
  });
  it('mode missing + either one present ⇒ satisfied', () => {
    expect(r().satisfied(withFields({ air_waybill_number: '12345678901' }), RECEIVED_AT)).toBe(true);
    expect(r().satisfied(withFields({ bill_of_lading_number: 'MAEU123456' }), RECEIVED_AT)).toBe(true);
  });
  it('neither present ⇒ not satisfied under every mode', () => {
    for (const mode of [null, 'AIR', 'OCEAN', 'TRUCK', 'RAIL', 'SPACE']) {
      expect(r().satisfied(withFields({ mode_of_transport: mode }), RECEIVED_AT)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. RIV-070 primary_field resolves by mode.
// ---------------------------------------------------------------------------

describe('RIV-070 — declared primary_field resolves by mode', () => {
  const r = () => rule('RIV-070');
  it('resolves to air_waybill_number under mode AIR', () => {
    expect(resolvePrimary(r(), withFields({ mode_of_transport: 'AIR' }))).toBe('air_waybill_number');
  });
  it('resolves to bill_of_lading_number under mode OCEAN', () => {
    expect(resolvePrimary(r(), withFields({ mode_of_transport: 'OCEAN' }))).toBe('bill_of_lading_number');
  });
  it('resolves to bill_of_lading_number under a missing mode', () => {
    expect(resolvePrimary(r(), withFields({}))).toBe('bill_of_lading_number');
  });
});

// ---------------------------------------------------------------------------
// 6. RIV-073 applicability.
// ---------------------------------------------------------------------------

describe('RIV-073 — applicable only when both documents present', () => {
  const r = () => rule('RIV-073');
  it('applicable when both present', () => {
    expect(r().applicable(withFields({ bill_of_lading_number: 'MAEU123456', air_waybill_number: '12345678901' }))).toBe(true);
  });
  it('not applicable when only one present', () => {
    expect(r().applicable(withFields({ bill_of_lading_number: 'MAEU123456' }))).toBe(false);
    expect(r().applicable(withFields({ air_waybill_number: '12345678901' }))).toBe(false);
  });
  it('not applicable when neither present', () => {
    expect(r().applicable(withFields({}))).toBe(false);
  });
  it('when applicable, not satisfied (a conflict exists)', () => {
    expect(r().satisfied(withFields({ bill_of_lading_number: 'MAEU123456', air_waybill_number: '12345678901' }), RECEIVED_AT)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. RIV-092 normalisation.
// ---------------------------------------------------------------------------

describe('RIV-092 — generic-description normalisation', () => {
  const r = () => rule('RIV-092');
  it("'assorted goods', 'Assorted Goods.' and '  various   goods ' all fail", () => {
    expect(r().satisfied(withFields({ goods_description: 'assorted goods' }), RECEIVED_AT)).toBe(false);
    expect(r().satisfied(withFields({ goods_description: 'Assorted Goods.' }), RECEIVED_AT)).toBe(false);
    expect(r().satisfied(withFields({ goods_description: '  various   goods ' }), RECEIVED_AT)).toBe(false);
  });
  it("'Stainless steel fasteners, M8' passes", () => {
    expect(r().satisfied(withFields({ goods_description: 'Stainless steel fasteners, M8' }), RECEIVED_AT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. RIV-131 calendar validity.
// ---------------------------------------------------------------------------

describe('RIV-131 — calendrical validity', () => {
  const r = () => rule('RIV-131');
  it("'2026-02-30' fails", () => expect(r().satisfied(withFields({ arrival_date: '2026-02-30' }), RECEIVED_AT)).toBe(false));
  it("'2024-02-29' passes", () => expect(r().satisfied(withFields({ arrival_date: '2024-02-29' }), RECEIVED_AT)).toBe(true));
  it("'2026-13-01' fails", () => expect(r().satisfied(withFields({ arrival_date: '2026-13-01' }), RECEIVED_AT)).toBe(false));
  it("'2026-9-20' fails (not zero-padded)", () => expect(r().satisfied(withFields({ arrival_date: '2026-9-20' }), RECEIVED_AT)).toBe(false));
});

// ---------------------------------------------------------------------------
// 9 & 10. RIV-132 window boundaries (inclusive) and timezone stability.
// ---------------------------------------------------------------------------

describe('RIV-132 — arrival-date window, inclusive, UTC-stable', () => {
  const r = () => rule('RIV-132');
  // Recomputed arithmetically in UTC against RECEIVED_AT = 2026-09-15:
  //   lower bound = 2026-09-15 − 60d = 2026-07-17 (inclusive)
  //   upper bound = 2026-09-15 + 180d = 2027-03-14 (inclusive)
  it('60 days before (2026-07-17) passes; 61 days before (2026-07-16) fails', () => {
    expect(r().satisfied(withFields({ arrival_date: '2026-07-17' }), RECEIVED_AT)).toBe(true);
    expect(r().satisfied(withFields({ arrival_date: '2026-07-16' }), RECEIVED_AT)).toBe(false);
  });
  it('180 days after (2027-03-14) passes; 181 days after (2027-03-15) fails', () => {
    expect(r().satisfied(withFields({ arrival_date: '2027-03-14' }), RECEIVED_AT)).toBe(true);
    expect(r().satisfied(withFields({ arrival_date: '2027-03-15' }), RECEIVED_AT)).toBe(false);
  });
  it('is stable across received_at times on the same UTC day', () => {
    const rec = withFields({ arrival_date: '2026-07-17' });
    expect(r().satisfied(rec, '2026-09-15T00:30:00.000Z')).toBe(true);
    expect(r().satisfied(rec, '2026-09-15T23:30:00.000Z')).toBe(true);
  });
  it('is timezone-stable — the same answer regardless of the ambient TZ', () => {
    // The predicate must derive the comparison via the UTC normaliser, not the
    // local timezone. This assertion holds under TZ=UTC and TZ=Pacific/Kiritimati
    // (the spec is run under both in CI/verify).
    const rec = withFields({ arrival_date: '2026-07-16' });
    expect(r().satisfied(rec, RECEIVED_AT)).toBe(false);
    const recOk = withFields({ arrival_date: '2026-07-17' });
    expect(r().satisfied(recOk, RECEIVED_AT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 11. Registry hygiene (provable without the engine).
// ---------------------------------------------------------------------------

describe('registry hygiene', () => {
  it('exactly 31 rules', () => {
    expect(RULES.length).toBe(31);
  });

  it('all rule_id values are unique and match ^RIV-[0-9]{3}$', () => {
    const ids = RULES.map((r) => r.rule_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^RIV-[0-9]{3}$/);
  });

  it('all failure_code values are unique', () => {
    const codes = RULES.map((r) => r.failure_code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every fields member is a member of ENTRY_FIELDS', () => {
    const fieldSet = new Set<string>(ENTRY_FIELDS);
    for (const r of RULES) {
      for (const f of r.fields) expect(fieldSet.has(f)).toBe(true);
    }
  });

  it('every resolved primary_field is a member of ENTRY_FIELDS (across relevant modes)', () => {
    const fieldSet = new Set<string>(ENTRY_FIELDS);
    const probes = [blank(), withFields({ mode_of_transport: 'AIR' }), withFields({ mode_of_transport: 'OCEAN' })];
    for (const r of RULES) {
      for (const rec of probes) {
        expect(fieldSet.has(resolvePrimary(r, rec))).toBe(true);
      }
    }
  });

  it('RULES is in ascending rule_id order', () => {
    const ids = RULES.map((r) => r.rule_id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('every requires_passed id exists in the registry and no rule gates on itself', () => {
    const ids = new Set(RULES.map((r) => r.rule_id));
    for (const r of RULES) {
      for (const dep of r.requires_passed) {
        expect(ids.has(dep)).toBe(true);
        expect(dep).not.toBe(r.rule_id);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 12. {value} interpolation uses the SUBMITTED value, truncated to 60 + ellipsis.
// ---------------------------------------------------------------------------

describe('{value} interpolation uses the submitted value', () => {
  it("RIV-032 message contains the submitted (already-trimmed) code '9999'", () => {
    const rec = withFields({ port_of_entry_code: '9999' });
    expect(resolveMessage(rule('RIV-032'), rec)).toContain('9999');
  });

  it('RIV-092 message interpolated segment is 61 chars (60 + ellipsis) for a 70-char value', () => {
    // A 70-char generic-adjacent description. The message wraps the value in
    // literal double quotes; the interpolated segment (between the quotes) must be
    // truncate60 output: 60 chars + a trailing ellipsis = 61 chars.
    const desc = 'assorted goods ' + 'x'.repeat(55); // 70 chars total
    expect(desc.length).toBe(70);
    const rec = withFields({ goods_description: desc });
    const msg = resolveMessage(rule('RIV-092'), rec);
    const m = /"([^"]*)"/.exec(msg);
    expect(m).not.toBeNull();
    expect(m?.[1]?.length).toBe(61);
    expect(m?.[1]?.endsWith('…')).toBe(true);
  });

  it('all four {value}-interpolating rules expose a message function', () => {
    for (const id of ['RIV-032', 'RIV-082', 'RIV-092', 'RIV-111'] as const) {
      expect(typeof rule(id).message).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// 13. No predicate mutates its argument.
// ---------------------------------------------------------------------------

describe('predicate immutability', () => {
  it('satisfied() and applicable() never mutate a deep-frozen record', () => {
    for (const r of RULES) {
      const rec = Object.freeze(
        withFields({
          entry_number: 'ABC12345678',
          importer_of_record_id: '12-3456789',
          port_of_entry_code: '2704',
          mode_of_transport: 'OCEAN',
          carrier_code: 'MAEU',
          conveyance_name: 'MV Test / 001E',
          bill_of_lading_number: 'MAEU123456',
          country_of_origin_code: 'CN',
          goods_description: 'Stainless steel fasteners, M8',
          quantity: '100',
          quantity_uom: 'KG',
          declared_value_usd: '1200.00',
          arrival_date: '2026-09-20',
        }),
      ) as CanonicalEntryRecord;
      expect(() => r.applicable(rec)).not.toThrow();
      expect(() => r.satisfied(rec, RECEIVED_AT)).not.toThrow();
    }
  });
});
