import { describe, it, expect } from 'vitest';
import { ENTRY_FIELDS, type EntryFieldName } from '@cargoexec/contract';

import { evaluate } from '../../src/services/validation/engine.js';
import { RULES } from '../../src/services/validation/rules.js';
import type { RuleDefinition, RuleId } from '../../src/services/validation/types.js';
import type { CanonicalEntryRecord } from '../../src/db/repositories/entries.js';

// TEST-UNIT (RTM §8.8) — the FR-4.15 registry integrity suite, kept SEPARATE
// from the engine spec so a rule-set revision has one obvious file to re-read.
// It pins the registry against the FRD F4 table and proves the whole set is
// hygienic, gated acyclically, reachable and free of rule identifiers / regex /
// jargon in its resolved messages (FR-4.13).

function blank(): CanonicalEntryRecord {
  const r: Record<string, string | null> = {};
  for (const f of ENTRY_FIELDS) r[f] = null;
  return r as CanonicalEntryRecord;
}
function withFields(
  partial: Partial<Record<EntryFieldName, string | null>>,
): CanonicalEntryRecord {
  return { ...blank(), ...partial };
}
function resolveMessage(r: RuleDefinition, rec: CanonicalEntryRecord): string {
  return typeof r.message === 'function' ? r.message(rec) : r.message;
}

// The 31 rule ids of the FRD F4 table, HARD-CODED as the anchor (FR-4.15: "a
// test asserting that the registry's rule id set exactly matches this
// document's table"). A rule added to the code without updating the FRD fails
// case 22, and vice versa.
const FRD_RULE_IDS: readonly RuleId[] = [
  'RIV-010', 'RIV-011',
  'RIV-020', 'RIV-021',
  'RIV-030', 'RIV-031', 'RIV-032',
  'RIV-040', 'RIV-041',
  'RIV-050', 'RIV-051',
  'RIV-060',
  'RIV-070', 'RIV-071', 'RIV-072', 'RIV-073',
  'RIV-080', 'RIV-081', 'RIV-082',
  'RIV-090', 'RIV-091', 'RIV-092',
  'RIV-100', 'RIV-101',
  'RIV-110', 'RIV-111',
  'RIV-120', 'RIV-121',
  'RIV-130', 'RIV-131', 'RIV-132',
];

describe('registry integrity (FR-4.15)', () => {
  it('case 21 — RULES.length === 31', () => {
    expect(RULES.length).toBe(31);
  });

  it('case 22 — the registry rule id set exactly equals the FRD F4 table', () => {
    expect(FRD_RULE_IDS.length).toBe(31);
    expect([...RULES.map((r) => r.rule_id)].sort()).toEqual([...FRD_RULE_IDS].sort());
  });

  it('case 23 — ids unique & well-formed, codes unique, fields & static primary_fields in ENTRY_FIELDS', () => {
    const fieldSet = new Set<string>(ENTRY_FIELDS);
    const ids = RULES.map((r) => r.rule_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^RIV-[0-9]{3}$/);

    const codes = RULES.map((r) => r.failure_code);
    expect(new Set(codes).size).toBe(codes.length);

    for (const r of RULES) {
      for (const f of r.fields) expect(fieldSet.has(f)).toBe(true);
    }

    // Resolve the two functional primary_fields against a record too.
    const probes = [blank(), withFields({ mode_of_transport: 'AIR' }), withFields({ mode_of_transport: 'OCEAN' })];
    for (const r of RULES) {
      for (const rec of probes) {
        const pf = typeof r.primary_field === 'function' ? r.primary_field(rec) : r.primary_field;
        expect(fieldSet.has(pf)).toBe(true);
      }
    }
  });

  it('case 24 — every requires_passed exists, no self-gating, the gating graph is acyclic', () => {
    const idSet = new Set(RULES.map((r) => r.rule_id));
    for (const r of RULES) {
      for (const dep of r.requires_passed) {
        expect(idSet.has(dep)).toBe(true);
        expect(dep).not.toBe(r.rule_id);
      }
    }
    // Topological sort (Kahn): if it completes, the graph is acyclic.
    const remaining = new Map<RuleId, Set<RuleId>>();
    for (const r of RULES) remaining.set(r.rule_id, new Set(r.requires_passed));
    let progressed = true;
    while (remaining.size > 0 && progressed) {
      progressed = false;
      for (const [id, deps] of remaining) {
        for (const d of [...deps]) if (!remaining.has(d)) deps.delete(d);
        if (deps.size === 0) {
          remaining.delete(id);
          progressed = true;
        }
      }
    }
    expect(remaining.size).toBe(0);
  });

  it('case 25 — every rule is reachable: a small corpus makes each of the 31 produce a finding', () => {
    // One or more records per rule, chosen so the rule is un-gated AND
    // applicable AND unsatisfied. The union of emitted ids must cover all 31.
    const corpus: CanonicalEntryRecord[] = [
      // Presence: the blank record fails all thirteen RIV-*0 rules.
      blank(),
      // Format/domain rules: satisfy the presence gate, then break the format.
      withFields({ entry_number: 'AB1234567' }), // RIV-011
      withFields({ importer_of_record_id: 'nope' }), // RIV-021
      withFields({ port_of_entry_code: '27A4' }), // RIV-031
      withFields({ port_of_entry_code: '9999' }), // RIV-032
      withFields({ mode_of_transport: 'SPACE' }), // RIV-041
      withFields({ carrier_code: 'A', mode_of_transport: 'OCEAN' }), // RIV-051
      withFields({ air_waybill_number: '123' }), // RIV-071
      withFields({ bill_of_lading_number: 'AB' }), // RIV-072
      withFields({ bill_of_lading_number: 'MAEU123456', air_waybill_number: '12345678901' }), // RIV-073
      withFields({ country_of_origin_code: 'X' }), // RIV-081
      withFields({ country_of_origin_code: 'ZZ' }), // RIV-082
      withFields({ goods_description: 'bolts' }), // RIV-091 (too short)
      withFields({ goods_description: 'assorted goods' }), // RIV-092
      withFields({ quantity: '0' }), // RIV-101
      withFields({ quantity_uom: 'KILOS' }), // RIV-111
      withFields({ declared_value_usd: '1.005' }), // RIV-121
      withFields({ arrival_date: '2026-02-30' }), // RIV-131
      withFields({ arrival_date: '2020-01-01' }), // RIV-132 (out of window)
    ];
    const covered = new Set<string>();
    for (const rec of corpus) {
      for (const f of evaluate(rec, '2026-09-15T00:00:00.000Z').findings) {
        covered.add(f.rule_id);
      }
    }
    const missing = RULES.map((r) => r.rule_id).filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
    expect(covered.size).toBe(31);
  });

  it('case 26 — every resolved message is non-empty, ≤ 500 chars, and free of rule ids / regex / jargon (FR-4.13)', () => {
    // Resolve each message against a record likely to exercise interpolation.
    const probe = withFields({
      port_of_entry_code: '9999',
      country_of_origin_code: 'ZZ',
      quantity_uom: 'KILOS',
      goods_description: 'assorted goods',
    });
    for (const r of RULES) {
      const msg = resolveMessage(r, probe);
      expect(msg.length).toBeGreaterThanOrEqual(1);
      expect(msg.length).toBeLessThanOrEqual(500);
      // No rule identifier token.
      expect(msg).not.toMatch(/RIV-\d{3}/);
      // No regular-expression metacharacter clusters / jargon.
      expect(msg).not.toContain('\\d');
      expect(msg).not.toContain('[A-Z]');
      expect(msg).not.toContain('{2,');
      expect(msg.includes('^') && msg.includes('$')).toBe(false);
    }
  });
});
