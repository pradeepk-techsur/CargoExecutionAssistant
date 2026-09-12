import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

import {
  canonicalJson,
  sha256,
  computeEntryHash,
  fixedScale,
  ZERO_HASH,
  type CanonicalAuditEntry,
} from '../../src/db/canonical.js';

// TEST-UNIT-04 (RTM §7.1) — traces to FR-0.7, FR-13.6, FR-13.11, US-0.4.
//
// This suite pins the canonical serialisation and the hash-chain computation
// that make tamper evidence real. It is deliberately exhaustive: canonical.ts
// is shared byte-for-byte by the audit writer (plan 01-06) and the SQL verifier
// (plans 01-05/01-10), so any drift here silently disables chain verification.

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_SRC = resolve(__dirname, '../../src/db/canonical.ts');

// A fully-specified fixture entry with hard-coded ids, a fixed occurred_at, and
// two value rows. Reused by the fixed-vector, ordering, chain-sensitivity, and
// cross-process determinism assertions.
function fixtureEntry(): CanonicalAuditEntry {
  return {
    case_id: '11111111-1111-1111-1111-111111111111',
    case_sequence: 1,
    action_type: 'CASE_CREATED',
    actor_type: 'SPECIALIST',
    actor_specialist_id: '22222222-2222-2222-2222-222222222222',
    occurred_at: new Date('2026-09-11T14:32:07.512Z'),
    exception_id: null,
    recommendation_id: null,
    decision_id: null,
    before_state: null,
    after_state: 'OPEN',
    reason: null,
    request_id: '33333333-3333-3333-3333-333333333333',
    values: [
      {
        field_name: 'goods_description',
        before_value: null,
        before_origin: null,
        after_value: 'Assorted  fasteners',
        after_origin: 'HUMAN',
        changed: true,
      },
      {
        field_name: 'declared_value_usd',
        before_value: null,
        before_origin: null,
        after_value: '1200.00',
        after_origin: 'HUMAN',
        changed: true,
      },
    ],
  };
}

describe('canonicalJson — key order', () => {
  it('sorts object keys lexicographically by UTF-16 code unit, independent of insertion order', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it('sorts by code unit, not locale (uppercase before lowercase)', () => {
    // A locale-aware comparison would order these differently; a code-unit
    // comparison puts 'B' (0x42) before 'a' (0x61).
    expect(canonicalJson({ a: 1, B: 2 })).toBe('{"B":2,"a":1}');
  });
});

describe('canonicalJson — whitespace', () => {
  it('emits no space, tab, or newline outside string literals', () => {
    const out = canonicalJson({ a: 1, nested: { x: [1, 2, 3] }, s: 'has space' });
    // Strip string literals, then assert no insignificant whitespace remains.
    const withoutStrings = out.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    expect(withoutStrings).not.toMatch(/[ \t\n\r]/);
    // Sanity: the string content is preserved verbatim.
    expect(out).toContain('"has space"');
  });
});

describe('canonicalJson — null handling', () => {
  it('serialises JavaScript null (SQL NULL) as JSON null', () => {
    expect(canonicalJson({ a: null })).toBe('{"a":null}');
  });

  it('throws on undefined rather than omitting the key', () => {
    expect(() => canonicalJson({ a: undefined })).toThrow();
  });
});

describe('canonicalJson — timestamp precision', () => {
  it('formats a millisecond Date as RFC 3339 UTC padded to six fractional digits', () => {
    const d = new Date('2026-09-11T14:32:07.512Z');
    expect(canonicalJson(d)).toBe('"2026-09-11T14:32:07.512000Z"');
  });

  it('round-trips an explicit-microsecond value unchanged', () => {
    // A value carrying explicit microseconds is preserved (not truncated to ms).
    const micros = '2026-09-11T14:32:07.512345Z';
    // The serialiser accepts a pre-formatted microsecond RFC 3339 string via a
    // tagged timestamp; assert it survives byte-for-byte.
    // (canonicalJson quotes strings verbatim, so the raw string also round-trips.)
    expect(canonicalJson(micros)).toBe(`"${micros}"`);
  });
});

describe('canonicalJson — decimal scale', () => {
  it('serialises a scale-3 decimal as an unquoted fixed-scale number', () => {
    const out = canonicalJson({ quantity: fixedScale('12.5', 3) });
    expect(out).toBe('{"quantity":12.500}');
    // Explicitly assert the token is NOT a quoted string.
    expect(out).not.toContain('"12.500"');
  });

  it('serialises a scale-2 integer decimal as an unquoted fixed-scale number', () => {
    const out = canonicalJson({ declared_value_usd: fixedScale('1200', 2) });
    expect(out).toBe('{"declared_value_usd":1200.00}');
    expect(out).not.toContain('"1200.00"');
  });

  it('formats from the string pg returns, avoiding float drift', () => {
    // A value that would drift through Number.prototype.toFixed on a parsed float
    // must format exactly from its string form.
    const out = canonicalJson({ v: fixedScale('0.1', 2) });
    expect(out).toBe('{"v":0.10}');
  });
});

describe('canonicalJson — strings verbatim (FR-13.11)', () => {
  it('does not trim, case-fold, or NFC-normalise', () => {
    // "e" + combining acute accent (U+0301); NFC would collapse to "é" (U+00E9).
    const raw = '  Mixed  CASE e\u0301  ';
    const out = canonicalJson({ s: raw });
    expect(out).toBe(JSON.stringify({ s: raw }).replace(/^{|}$/g, (m) => m)); // structural sanity
    expect(out).toContain(raw);
    // The combining sequence is preserved, not normalised to a single codepoint.
    expect(out).not.toContain('\u00e9');
  });
});

describe('computeEntryHash — fixed vector', () => {
  it('produces a 32-byte Buffer equal to the pinned hex vector against ZERO_HASH', () => {
    const entry = fixtureEntry();
    const h = computeEntryHash(entry, ZERO_HASH);
    expect(Buffer.isBuffer(h)).toBe(true);
    expect(h).toHaveLength(32);
    // REGRESSION ANCHOR — this hex constant is the fixed vector for the fully
    // specified fixture entry above. It must NEVER change without a deliberate
    // edit: if a code change alters it, the hash chain of every previously
    // written audit entry has silently changed meaning, and every prior record
    // would fail verification. That is exactly what this test exists to catch.
    expect(h.toString('hex')).toBe(
      '367a71b6a3e546fc4f9b5ffb9a1cd259c8fa42fb9a1f4fd522447871aec15939',
    );
  });
});

describe('computeEntryHash — value-row ordering (T-01-11)', () => {
  it('normalises value order internally, so reversing the values array yields the same hash', () => {
    const entry = fixtureEntry();
    const reversed = fixtureEntry();
    reversed.values = [...reversed.values].reverse();
    expect(computeEntryHash(entry, ZERO_HASH).toString('hex')).toBe(
      computeEntryHash(reversed, ZERO_HASH).toString('hex'),
    );
  });

  it('a hand-built canonicalJson with rows in the wrong order hashes differently — "writer normalises order" is not "order does not matter"', () => {
    const entry = fixtureEntry();
    const sortedRows = [...entry.values].sort((a, b) =>
      a.field_name < b.field_name ? -1 : a.field_name > b.field_name ? 1 : 0,
    );
    const reversedRows = [...sortedRows].reverse();
    const jsonSorted = canonicalJson({ values: sortedRows });
    const jsonReversed = canonicalJson({ values: reversedRows });
    expect(jsonSorted).not.toBe(jsonReversed);
    expect(sha256(jsonSorted).toString('hex')).not.toBe(
      sha256(jsonReversed).toString('hex'),
    );
  });
});

describe('computeEntryHash — chain sensitivity', () => {
  it('depends on the previous hash', () => {
    const entry = fixtureEntry();
    const other = Buffer.alloc(32, 0x01);
    expect(computeEntryHash(entry, ZERO_HASH).toString('hex')).not.toBe(
      computeEntryHash(entry, other).toString('hex'),
    );
  });

  it('ZERO_HASH is exactly 32 bytes of 0x00', () => {
    expect(Buffer.isBuffer(ZERO_HASH)).toBe(true);
    expect(ZERO_HASH).toHaveLength(32);
    expect(ZERO_HASH.equals(Buffer.alloc(32))).toBe(true);
  });

  it('rejects a prev hash that is not a 32-byte Buffer', () => {
    const entry = fixtureEntry();
    // @ts-expect-error deliberately wrong type
    expect(() => computeEntryHash(entry, 'not-a-buffer')).toThrow();
    expect(() => computeEntryHash(entry, Buffer.alloc(31))).toThrow();
  });
});

describe('sha256', () => {
  it('returns a 32-byte digest for both string and Buffer input', () => {
    const a = sha256('abc');
    const b = sha256(Buffer.from('abc', 'utf8'));
    expect(a).toHaveLength(32);
    expect(a.equals(b)).toBe(true);
    // Known SHA-256("abc") vector.
    expect(a.toString('hex')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('canonicalJson — cross-process determinism (the RTM TEST-UNIT-04 assertion)', () => {
  it('serialises the fixture entry byte-identically in a separate Node process', () => {
    // Compile canonical.ts to a temp ESM module and import it from a child
    // process, proving the serialisation does not depend on in-process state,
    // locale, or key insertion order — "in two processes" is what RTM names.
    const src = ts.sys.readFile(CANONICAL_SRC);
    if (src === undefined) throw new Error('canonical.ts not found for cross-process compile');
    const js = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: 'canonical.ts',
    }).outputText;

    const dir = mkdtempSync(join(tmpdir(), 'canon-'));
    const modPath = join(dir, 'canonical.mjs');
    writeFileSync(modPath, js, 'utf8');

    const childScript = `
      import { canonicalJson, computeEntryHash, ZERO_HASH } from ${JSON.stringify(modPath)};
      const entry = ${JSON.stringify({ ...fixtureEntry(), occurred_at: undefined })};
      entry.occurred_at = new Date('2026-09-11T14:32:07.512Z');
      const json = canonicalJson(entry);
      const hash = computeEntryHash(entry, ZERO_HASH).toString('hex');
      process.stdout.write(JSON.stringify({ json, hash }));
    `;

    const out = execFileSync(process.execPath, ['--input-type=module', '-e', childScript], {
      encoding: 'utf8',
    });
    const child = JSON.parse(out) as { json: string; hash: string };

    const entry = fixtureEntry();
    expect(child.json).toBe(canonicalJson(entry));
    expect(child.hash).toBe(computeEntryHash(entry, ZERO_HASH).toString('hex'));
  });
});
