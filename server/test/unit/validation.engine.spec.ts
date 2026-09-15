import { describe, it, expect, afterEach, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ENTRY_FIELDS, type EntryFieldName } from '@cargoexec/contract';

import { evaluate, ValidationEngineError } from '../../src/services/validation/engine.js';
import { RULES } from '../../src/services/validation/rules.js';
import type {
  RuleDefinition,
  ValidationEvaluation,
} from '../../src/services/validation/types.js';
import type { CanonicalEntryRecord } from '../../src/db/repositories/entries.js';

// TEST-UNIT (RTM §8.8) — traces to F4 FR-4.3/4.4/4.5/4.6/4.7/4.8/4.9/4.10 and
// the eight F4 acceptance criteria + criterion 10.
//
// A pure unit suite of the EVALUATION MECHANISM (plan 03-04), distinct from the
// per-rule content suite (validation.rules.spec.ts). It proves gating,
// completeness, ordering, outcome, the no-grading shape, engine-failure
// handling, and — the point of NFR-11 — DETERMINISM by three independent
// mechanisms rather than by prose.
//
// Case 16 (two processes) requires the built engine: run `npm run build:server`
// first (the plan's <verify> does).

const RECEIVED_AT = '2026-09-15T14:32:07.512Z';

/** A CanonicalEntryRecord with all fourteen fields null. Duplicated here on
 *  purpose (the plan permits duplicate-or-extract) so this spec does not import
 *  from the sibling spec file. */
function blank(): CanonicalEntryRecord {
  const r: Record<string, string | null> = {};
  for (const f of ENTRY_FIELDS) r[f] = null;
  return r as CanonicalEntryRecord;
}

/** A blank record with the given fields overridden. */
function withFields(
  partial: Partial<Record<EntryFieldName, string | null>>,
): CanonicalEntryRecord {
  return { ...blank(), ...partial };
}

function ids(ev: ValidationEvaluation): string[] {
  return ev.findings.map((f) => f.rule_id);
}

// A fully valid entry: every rule passes. arrival_date is well inside the
// RIV-132 window relative to RECEIVED_AT (2026-09-15).
function cleanRecord(): CanonicalEntryRecord {
  return withFields({
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
    arrival_date: '2026-09-20',
  });
}

// The thirteen presence rules, in ascending rule_id — the exact set a blank
// entry must produce (F4 acceptance 1).
const THIRTEEN_PRESENCE = [
  'RIV-010', 'RIV-020', 'RIV-030', 'RIV-040', 'RIV-050', 'RIV-060', 'RIV-070',
  'RIV-080', 'RIV-090', 'RIV-100', 'RIV-110', 'RIV-120', 'RIV-130',
];

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Gating and completeness.
// ---------------------------------------------------------------------------

describe('gating and completeness (FR-4.3, FR-4.5, FR-4.6)', () => {
  it('F4 acceptance 1 — the blank entry yields exactly the thirteen presence findings, in order', () => {
    const ev = evaluate(blank(), RECEIVED_AT);
    // Full ordered array, not just length: presence gating suppressed every
    // RIV-0x1 / RIV-0x2 so a specialist never sees both "enter the port code"
    // and "port code must be 4 digits" for the same empty field.
    expect(ids(ev)).toEqual(THIRTEEN_PRESENCE);
    // No format or domain finding at all.
    for (const id of ids(ev)) {
      expect(id.endsWith('0')).toBe(true);
    }
  });

  it('F4 acceptance 2 — a format failure suppresses the domain rule (RIV-031 only, never RIV-032)', () => {
    const ev = evaluate(withFields({ port_of_entry_code: 'ZZ' }), RECEIVED_AT);
    expect(ids(ev)).toContain('RIV-031');
    expect(ids(ev)).not.toContain('RIV-032');
  });

  it('F4 acceptance 3 — well-formed but unknown yields RIV-032 only', () => {
    const ev = evaluate(withFields({ port_of_entry_code: '9999' }), RECEIVED_AT);
    expect(ids(ev)).toContain('RIV-032');
    expect(ids(ev)).not.toContain('RIV-031');
  });

  it('country: X ⇒ RIV-081 only; ZZ ⇒ RIV-082 only; CN ⇒ neither', () => {
    const bad = evaluate(withFields({ country_of_origin_code: 'X' }), RECEIVED_AT);
    expect(ids(bad)).toContain('RIV-081');
    expect(ids(bad)).not.toContain('RIV-082');

    const unknown = evaluate(withFields({ country_of_origin_code: 'ZZ' }), RECEIVED_AT);
    expect(ids(unknown)).toContain('RIV-082');
    expect(ids(unknown)).not.toContain('RIV-081');

    const ok = evaluate(withFields({ country_of_origin_code: 'CN' }), RECEIVED_AT);
    expect(ids(ok)).not.toContain('RIV-081');
    expect(ids(ok)).not.toContain('RIV-082');
  });

  it('F4 acceptance 4 — mode AIR with only a bill of lading yields RIV-070', () => {
    const ev = evaluate(
      withFields({ mode_of_transport: 'AIR', bill_of_lading_number: 'MAEU123456' }),
      RECEIVED_AT,
    );
    expect(ids(ev)).toContain('RIV-070');
  });

  it('F4 acceptance 5 — both a bill of lading and an air waybill yields RIV-073', () => {
    const ev = evaluate(
      withFields({
        mode_of_transport: 'OCEAN',
        bill_of_lading_number: 'MAEU123456',
        air_waybill_number: '12345678901',
      }),
      RECEIVED_AT,
    );
    expect(ids(ev)).toContain('RIV-073');
  });

  it('F4 acceptance 6 — a generic goods description yields RIV-092; a specific one yields none', () => {
    const generic = evaluate(withFields({ goods_description: 'assorted goods' }), RECEIVED_AT);
    expect(ids(generic)).toContain('RIV-092');

    const specific = evaluate(
      withFields({ goods_description: 'Stainless steel fasteners, M8' }),
      RECEIVED_AT,
    );
    expect(ids(specific)).not.toContain('RIV-092');
    expect(ids(specific)).not.toContain('RIV-091');
    expect(ids(specific)).not.toContain('RIV-090');
  });

  it('no short-circuit — three unrelated field failures return all three findings in one call', () => {
    // entry_number bad format, port unknown, quantity not positive — three
    // independent branches, none gating another.
    const ev = evaluate(
      withFields({
        entry_number: 'AB1234567', // RIV-011 (present, bad format)
        importer_of_record_id: '12-3456789',
        port_of_entry_code: '9999', // RIV-032 (present, well-formed, unknown)
        mode_of_transport: 'OCEAN',
        carrier_code: 'MAEU',
        conveyance_name: 'MV Test / 001E',
        bill_of_lading_number: 'MAEU123456',
        country_of_origin_code: 'CN',
        goods_description: 'Stainless steel fasteners, M8',
        quantity: '0', // RIV-101 (present, not positive)
        quantity_uom: 'KG',
        declared_value_usd: '8450.00',
        arrival_date: '2026-09-20',
      }),
      RECEIVED_AT,
    );
    expect(ids(ev)).toEqual(['RIV-011', 'RIV-032', 'RIV-101']);
  });

  it('no short-circuit — a blank record returns thirteen findings, never one', () => {
    expect(evaluate(blank(), RECEIVED_AT).findings.length).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// Ordering (FR-4.8).
// ---------------------------------------------------------------------------

describe('ordering — findings are ascending by rule_id (FR-4.8)', () => {
  it('findings.map(rule_id) is strictly ascending across several fields', () => {
    const ev = evaluate(
      withFields({
        entry_number: 'AB1234567', // RIV-011
        port_of_entry_code: '9999', // RIV-032
        country_of_origin_code: 'ZZ', // RIV-082
        goods_description: 'assorted goods', // RIV-092
        quantity: '0', // RIV-101
      }),
      RECEIVED_AT,
    );
    const arr = ids(ev);
    expect(arr).toEqual([...arr].sort());
    // Strictly ascending: no duplicates.
    expect(new Set(arr).size).toBe(arr.length);
  });

  it('order comes from rule_id, not field-declaration order', () => {
    // country_of_origin_code (RIV-08x) is declared BEFORE goods_description
    // (RIV-09x) in ENTRY_FIELDS; construct only a later-field and an
    // earlier-field failure and confirm the rule-id order regardless. Here we
    // fail arrival_date (RIV-131, late) and entry_number (RIV-011, early): the
    // engine must emit RIV-011 before RIV-131.
    const ev = evaluate(
      withFields({
        entry_number: 'AB1234567', // RIV-011
        importer_of_record_id: '12-3456789',
        port_of_entry_code: '2704',
        mode_of_transport: 'OCEAN',
        carrier_code: 'MAEU',
        conveyance_name: 'MV Test / 001E',
        bill_of_lading_number: 'MAEU123456',
        country_of_origin_code: 'CN',
        goods_description: 'Stainless steel fasteners, M8',
        quantity: '1200',
        quantity_uom: 'KG',
        declared_value_usd: '8450.00',
        arrival_date: '2026-02-30', // RIV-131 (present, not a real date)
      }),
      RECEIVED_AT,
    );
    expect(ids(ev)).toEqual(['RIV-011', 'RIV-131']);
  });

  it('F4 acceptance 10 — every finding field_name is a member of ENTRY_FIELDS', () => {
    const fieldSet = new Set<string>(ENTRY_FIELDS);
    // Exercise a corpus so functional primary_fields (RIV-070) are exercised too.
    const corpus = [
      blank(),
      withFields({ mode_of_transport: 'AIR' }),
      withFields({
        mode_of_transport: 'OCEAN',
        bill_of_lading_number: 'MAEU1',
        air_waybill_number: '12345678901',
      }),
      withFields({ port_of_entry_code: '9999', country_of_origin_code: 'ZZ' }),
    ];
    for (const rec of corpus) {
      for (const f of evaluate(rec, RECEIVED_AT).findings) {
        expect(fieldSet.has(f.field_name)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Outcome (FR-4.9, FR-4.10).
// ---------------------------------------------------------------------------

describe('outcome — two values only, no grading (FR-4.9, FR-4.10)', () => {
  it('F4 acceptance 8 — a fully valid entry yields PASS with zero findings', () => {
    const ev = evaluate(cleanRecord(), RECEIVED_AT);
    expect(ev.outcome).toBe('PASS');
    expect(ev.findings).toEqual([]);
  });

  it('one finding ⇒ FAIL; zero ⇒ PASS; there is no third value', () => {
    expect(evaluate(withFields({ ...cleanRecord(), entry_number: null }), RECEIVED_AT).outcome).toBe('FAIL');
    expect(evaluate(cleanRecord(), RECEIVED_AT).outcome).toBe('PASS');
    // By construction the engine returns only these two.
    const seen = new Set<string>();
    for (const rec of [blank(), cleanRecord(), withFields({ ...cleanRecord(), quantity: '0' })]) {
      seen.add(evaluate(rec, RECEIVED_AT).outcome);
    }
    expect([...seen].sort()).toEqual(['FAIL', 'PASS']);
  });

  it('no finding carries a severity/weight/score/priority/risk key', () => {
    const ev = evaluate(blank(), RECEIVED_AT);
    for (const f of ev.findings) {
      expect(Object.keys(f).sort()).toEqual([
        'failure_code', 'field_name', 'message', 'rule_id',
      ]);
    }
  });

  it('rule_set_version is exactly RIV-2026.09, and there is no evaluated_at', () => {
    const ev = evaluate(blank(), RECEIVED_AT);
    expect(ev.rule_set_version).toBe('RIV-2026.09');
    expect('evaluated_at' in ev).toBe(false);
  });

  it('rules_evaluated_count >= findings.length for every record, and equals the gating-derived expectation for a blank record', () => {
    for (const rec of [blank(), cleanRecord(), withFields({ port_of_entry_code: '9999' })]) {
      const ev = evaluate(rec, RECEIVED_AT);
      expect(ev.rules_evaluated_count).toBeGreaterThanOrEqual(ev.findings.length);
    }
    // For a blank record, ONLY rules with no requires_passed are un-gated and
    // evaluated — compute that from the registry rather than hard-coding.
    const unGatedCount = RULES.filter((r) => r.requires_passed.length === 0).length;
    // ... minus any un-gated rule that is not applicable to a blank record.
    const applicableUnGated = RULES.filter(
      (r) => r.requires_passed.length === 0 && r.applicable(blank()),
    ).length;
    expect(evaluate(blank(), RECEIVED_AT).rules_evaluated_count).toBe(applicableUnGated);
    // Sanity: the two counts agree only if no un-gated rule is inapplicable to a
    // blank record — RIV-071/072/073 are gated by applicability, not
    // requires_passed, so they differ; assert the applicable-derived one holds.
    expect(applicableUnGated).toBeLessThanOrEqual(unGatedCount);
  });
});

// ---------------------------------------------------------------------------
// Determinism — NFR-11, proven not asserted.
// ---------------------------------------------------------------------------

describe('determinism (NFR-11, FR-4.4)', () => {
  const eightMixed = withFields({
    entry_number: 'AB1234567', // RIV-011
    importer_of_record_id: 'bad', // RIV-021
    port_of_entry_code: '9999', // RIV-032
    mode_of_transport: 'SPACE', // RIV-041
    carrier_code: 'MAEU', // ok under unknown mode? SCAC form ⇒ passes
    conveyance_name: 'MV Test / 001E',
    bill_of_lading_number: 'MAEU123456',
    country_of_origin_code: 'ZZ', // RIV-082
    goods_description: 'assorted goods', // RIV-092
    quantity: '0', // RIV-101
    quantity_uom: 'KILOS', // RIV-111
    declared_value_usd: '1200.005', // RIV-121
    arrival_date: '2026-09-20',
  });

  it('case 15 — same process, twice, byte-identical for blank / clean / mixed', () => {
    for (const rec of [blank(), cleanRecord(), eightMixed]) {
      const a = JSON.stringify(evaluate(rec, RECEIVED_AT));
      const b = JSON.stringify(evaluate(rec, RECEIVED_AT));
      expect(a).toBe(b);
    }
  });

  it('case 16 — two processes yield byte-identical serialised results', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const engineUrl = new URL(
      '../../dist/services/validation/engine.js',
      import.meta.url,
    ).href;
    // The three records, described so the child rebuilds them identically.
    const overrides = [
      {}, // blank
      {
        entry_number: 'ABC12345678', importer_of_record_id: '12-3456789',
        port_of_entry_code: '2704', mode_of_transport: 'OCEAN', carrier_code: 'MAEU',
        conveyance_name: 'MV Northern Star / V.118', bill_of_lading_number: 'MAEU123456789',
        air_waybill_number: null, country_of_origin_code: 'CN',
        goods_description: 'Stainless steel fasteners, M8 hex bolts', quantity: '1200.000',
        quantity_uom: 'PCS', declared_value_usd: '8450.00', arrival_date: '2026-09-20',
      },
      {
        entry_number: 'AB1234567', importer_of_record_id: 'bad', port_of_entry_code: '9999',
        mode_of_transport: 'SPACE', carrier_code: 'MAEU', conveyance_name: 'MV Test / 001E',
        bill_of_lading_number: 'MAEU123456', country_of_origin_code: 'ZZ',
        goods_description: 'assorted goods', quantity: '0', quantity_uom: 'KILOS',
        declared_value_usd: '1200.005', arrival_date: '2026-09-20',
      },
    ];

    const script = `
      import { evaluate } from ${JSON.stringify(engineUrl)};
      import { ENTRY_FIELDS } from '@cargoexec/contract';
      const RECEIVED_AT = ${JSON.stringify(RECEIVED_AT)};
      const overrides = ${JSON.stringify(overrides)};
      const out = [];
      for (const o of overrides) {
        const rec = {};
        for (const f of ENTRY_FIELDS) rec[f] = null;
        Object.assign(rec, o);
        out.push(JSON.stringify(evaluate(rec, RECEIVED_AT)));
      }
      process.stdout.write(JSON.stringify(out));
    `;

    const childStdout = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', script],
      { cwd: resolve(here, '..', '..', '..'), encoding: 'utf8' },
    );
    const childResults = JSON.parse(childStdout) as string[];

    const inProcess = overrides.map((o) => {
      const rec = blank();
      Object.assign(rec, o);
      return JSON.stringify(evaluate(rec as CanonicalEntryRecord, RECEIVED_AT));
    });

    expect(childResults).toEqual(inProcess);
  });

  it('case 17 — re-evaluation a month later still agrees (RIV-132 reads received_at, not the clock)', () => {
    const rec = withFields({ ...cleanRecord(), arrival_date: '2026-09-20' });
    const before = JSON.stringify(evaluate(rec, RECEIVED_AT));

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T00:00:00.000Z')); // +31 days
    const after = JSON.stringify(evaluate(rec, RECEIVED_AT));
    expect(after).toBe(before);
    vi.useRealTimers();

    // Converse control: a DIFFERENT receivedAt changes the RIV-132 verdict for a
    // date near the boundary — proving indifference to the CLOCK, not to the
    // received_at INPUT. arrival 2026-07-17 is exactly 60 days before
    // 2026-09-15 (in window), but 61 days before 2026-09-16 (out of window).
    const boundaryRec = withFields({ ...cleanRecord(), arrival_date: '2026-07-17' });
    const inWindow = evaluate(boundaryRec, '2026-09-15T12:00:00.000Z');
    const outOfWindow = evaluate(boundaryRec, '2026-09-16T12:00:00.000Z');
    expect(inWindow.findings.map((f) => f.rule_id)).not.toContain('RIV-132');
    expect(outOfWindow.findings.map((f) => f.rule_id)).toContain('RIV-132');
  });

  it('case 18 — order is stable under key permutation (findings order comes from rule_id)', () => {
    const clean = cleanRecord();
    const reversedKeys = [...ENTRY_FIELDS].reverse();
    const permuted: Record<string, string | null> = {};
    for (const k of reversedKeys) permuted[k] = clean[k as EntryFieldName];
    const a = JSON.stringify(evaluate(clean, RECEIVED_AT));
    const b = JSON.stringify(evaluate(permuted as CanonicalEntryRecord, RECEIVED_AT));
    expect(b).toBe(a);

    // And with findings present.
    const failing = withFields({ port_of_entry_code: '9999', country_of_origin_code: 'ZZ' });
    const failingReversed: Record<string, string | null> = {};
    for (const k of reversedKeys) failingReversed[k] = failing[k as EntryFieldName];
    expect(JSON.stringify(evaluate(failingReversed as CanonicalEntryRecord, RECEIVED_AT))).toBe(
      JSON.stringify(evaluate(failing, RECEIVED_AT)),
    );
  });
});

// ---------------------------------------------------------------------------
// Engine failure (T-03-18).
// ---------------------------------------------------------------------------

describe('engine failure — abort, never a partial result', () => {
  it('case 19 — a rule whose satisfied() throws makes evaluate throw ValidationEngineError naming the rule', () => {
    const throwing: RuleDefinition = {
      rule_id: 'RIV-999',
      fields: ['entry_number'],
      primary_field: 'entry_number',
      failure_code: 'THROWS',
      message: 'x',
      requires_passed: [],
      applicable: () => true,
      satisfied: () => {
        throw new Error('boom');
      },
    };
    expect(() => evaluate(blank(), RECEIVED_AT, [throwing])).toThrow(ValidationEngineError);
    try {
      evaluate(blank(), RECEIVED_AT, [throwing]);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationEngineError);
      expect((err as ValidationEngineError).code).toBe('VALIDATION_ENGINE_FAILURE');
      expect((err as ValidationEngineError).rule_id).toBe('RIV-999');
    }
  });

  it('case 20 — a rule resolving a field_name outside ENTRY_FIELDS throws ValidationEngineError', () => {
    const badField: RuleDefinition = {
      rule_id: 'RIV-998',
      fields: ['entry_number'],
      // resolves to a non-field once the rule is unsatisfied.
      primary_field: (() => 'not_a_field') as unknown as RuleDefinition['primary_field'],
      failure_code: 'BAD_FIELD',
      message: 'x',
      requires_passed: [],
      applicable: () => true,
      satisfied: () => false,
    };
    expect(() => evaluate(blank(), RECEIVED_AT, [badField])).toThrow(ValidationEngineError);
    try {
      evaluate(blank(), RECEIVED_AT, [badField]);
    } catch (err) {
      expect((err as ValidationEngineError).code).toBe('VALIDATION_ENGINE_FAILURE');
      expect((err as ValidationEngineError).rule_id).toBe('RIV-998');
    }
  });
});
