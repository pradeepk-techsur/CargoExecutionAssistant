// Architecture suite — the VALIDATION mechanism's permanent constraints
// (TEST-ARCH, RTM §8.8). Traces to F4 FR-4.1/4.2/4.9, R-L10, and F3 FR-3.4.
//
// This is a NEW spec (absence.spec.ts is reviewed by plan 03-11; a second writer
// there would collide). It makes five things build constraints rather than
// intentions, each re-run by every later phase:
//
//   1. The validation directory is PURE (R-L10) — no clock, pool, repository
//      value, crypto, fs, http or randomness. Determinism is structural.
//   2. There is NO validate/revalidate route (FR-4.2); API_ROUTE_TABLE stays 10.
//   3. There is NO skip/force/bypass/revalidate identifier and no VALIDAT* env
//      key anywhere in server/src or web/src (F3 FR-3.4) — validation cannot be
//      configured away or re-run.
//   4. There is NO severity/grading surface (FR-4.9) in the validation directory
//      or the contract DTOs.
//   5. Domain lists are NOT tables or seeds (FR-4.1).

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

import { API_ROUTE_TABLE } from '../../src/http/routes/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const SERVER_SRC = join(REPO_ROOT, 'server', 'src');
const WEB_SRC = join(REPO_ROOT, 'web', 'src');
const VALIDATION_DIR = join(SERVER_SRC, 'services', 'validation');
const CONTRACT_DTO = join(REPO_ROOT, 'contract', 'src', 'dto.ts');
const MIGRATIONS_DIR = join(REPO_ROOT, 'server', 'migrations');

/** Recursively list source files under `root`, skipping node_modules/dist. */
function walk(root: string, match: (name: string) => boolean = (n) => /\.tsx?$/.test(n)): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        stack.push(full);
      } else if (entry.isFile() && match(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

/** Strip line and block comments so token scans see executable text only
 *  (the stripComments pattern used by navigation.spec.ts / headers.spec.ts). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Purity (R-L10). Determinism is structural, not merely tested behaviourally.
// ─────────────────────────────────────────────────────────────────────────────

describe('validation directory purity (R-L10, T-03-17)', () => {
  // Proven RED once during development by planting `Date.now()` in engine.ts and
  // watching this fail; then removed (recorded in the plan SUMMARY).
  const FORBIDDEN_VALUE_IMPORTS = [
    /from\s+['"]pg['"]/,
    /from\s+['"]express['"]/,
    /from\s+['"]node:crypto['"]/,
    /from\s+['"]node:fs['"]/,
    /from\s+['"]node:https?['"]/,
    /from\s+['"][^'"]*db\/pool\.app\.js['"]/,
    /from\s+['"][^'"]*db\/pool\.ai\.js['"]/,
    /from\s+['"][^'"]*db\/tx\.js['"]/,
  ];
  // `Date.now()` and the ZERO-ARGUMENT `new Date()` are clock reads and forbidden.
  // The ARGUMENT form `new Date(isoTimestamp)` / `new Date(epochMs)` is a pure,
  // deterministic parse of a value the caller supplies — normalise.ts's RIV-132
  // UTC helpers use exactly that and nothing else (see its header). Forbidding
  // all `new Date(` would flag deterministic parsing, defeating the assertion's
  // own purpose (determinism), so we match only the empty-argument form.
  const FORBIDDEN_CALLS = [
    /Math\.random\b/,
    /Date\.now\s*\(/,
    /new\s+Date\s*\(\s*\)/,
    /\bprocess\.env\b/,
    /\bcrypto\./,
  ];

  it('no module under services/validation/ imports a clock, pool, repository, crypto, fs or network', () => {
    const offenders: string[] = [];
    for (const file of walk(VALIDATION_DIR)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const rel = relative(REPO_ROOT, file);

      for (const re of FORBIDDEN_VALUE_IMPORTS) {
        if (re.test(src)) offenders.push(`${rel}: forbidden import ${re}`);
      }
      // A `repositories/` VALUE import is forbidden; a type-only import
      // (`import type { CanonicalEntryRecord }`) is permitted and required.
      for (const m of src.matchAll(/import\s+(type\s+)?[^;]*from\s+['"][^'"]*repositories\/[^'"]*['"]/g)) {
        if (m[1] === undefined) {
          offenders.push(`${rel}: value import from repositories/ (only \`import type\` is allowed)`);
        }
      }
      for (const re of FORBIDDEN_CALLS) {
        if (re.test(src)) offenders.push(`${rel}: forbidden call ${re}`);
      }
    }
    expect(
      offenders,
      'The validation directory must be pure (R-L10): determinism (NFR-11) is ' +
        'structural, not merely tested. Offenders:\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. No validation endpoint (FR-4.2).
// ─────────────────────────────────────────────────────────────────────────────

describe('no validate/revalidate route (FR-4.2, T-03-16)', () => {
  it('API_ROUTE_TABLE has no /validate or /revalidate path, and is still exactly 10', () => {
    for (const route of API_ROUTE_TABLE) {
      expect(route.path).not.toMatch(/validate/i);
      expect(route.path).not.toMatch(/revalidate/i);
    }
    expect(API_ROUTE_TABLE.length).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. No skip/force/bypass switch (F3 FR-3.4).
// ─────────────────────────────────────────────────────────────────────────────

describe('no skip/force/bypass/revalidate switch (F3 FR-3.4, T-03-16)', () => {
  // Property/variable identifiers that would weaken, defer, skip or re-run
  // validation. The JSX/HTML `noValidate` attribute on a <form> is REQUIRED
  // markup (UswdsForm defers native constraint validation to the server), so it
  // is excluded the way navigation.spec.ts excludes the ARIA `role=` attribute:
  // we match the identifier as a property/variable, never the `=` attribute.
  const FORBIDDEN_IDENTIFIERS = [
    'skip_validation', 'skipValidation',
    'force_validation', 'forceValidation',
    'bypass_validation', 'bypassValidation',
    'no_validate', 'noValidate',
    'revalidate', 're_validate', 'validateAgain',
  ];

  it('no skip/force/bypass/revalidate identifier appears in server/src or web/src', () => {
    const offenders: string[] = [];
    for (const root of [SERVER_SRC, WEB_SRC]) {
      for (const file of walk(root)) {
        const src = stripComments(readFileSync(file, 'utf8'));
        const rel = relative(REPO_ROOT, file);
        for (const ident of FORBIDDEN_IDENTIFIERS) {
          // As a property access or key: `.ident`, `ident:`, or a bare
          // declaration `ident`. Deliberately NOT the JSX attribute `ident=`.
          const re = new RegExp(`(?:\\.${ident}\\b|\\b${ident}\\s*:)`, 'g');
          for (const m of src.matchAll(re)) {
            const idx = m.index ?? 0;
            const context = src.slice(Math.max(0, idx - 30), idx + 30).trim();
            offenders.push(`${rel}: "${ident}" near "${context}"`);
          }
        }
      }
    }
    expect(
      offenders,
      'Validation cannot be skipped, forced, bypassed or re-run (F3 FR-3.4). ' +
        'The JSX noValidate attribute on a <form> is excluded; a noValidate ' +
        'property/variable is not. Offenders:\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  it('no process.env key under server/src matches /VALIDAT/i (no configuration switch)', () => {
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const rel = relative(REPO_ROOT, file);
      // process.env.SOMETHING_VALIDATION or process.env['...VALIDAT...'].
      for (const m of src.matchAll(/process\.env(?:\.([A-Za-z0-9_]+)|\[\s*['"]([^'"]+)['"]\s*\])/g)) {
        const key = m[1] ?? m[2] ?? '';
        if (/VALIDAT/i.test(key)) offenders.push(`${rel}: process.env key "${key}"`);
      }
    }
    expect(
      offenders,
      'No VALIDAT* environment key may exist: a configuration switch that could ' +
        'weaken validation is scope leakage (§6.6, F3 FR-3.4).\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. No severity/grading surface (FR-4.9).
// ─────────────────────────────────────────────────────────────────────────────

describe('no severity/grading surface (FR-4.9)', () => {
  // navigation.spec.ts already forbids a `priority` affordance in the UI; this
  // is the DATA-MODEL half — the validation directory and the contract DTOs.
  const GRADING_IDENTIFIERS = [
    'severity', 'weight', 'score', 'priority', 'risk_score', 'rank', 'grade',
  ];

  it('no severity/weight/score/priority/risk_score/rank/grade property in the validation directory or contract DTOs', () => {
    const files = [...walk(VALIDATION_DIR)];
    if (existsSync(CONTRACT_DTO)) files.push(CONTRACT_DTO);
    const offenders: string[] = [];
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const rel = relative(REPO_ROOT, file);
      for (const ident of GRADING_IDENTIFIERS) {
        const re = new RegExp(`(?:\\.${ident}\\b|\\b${ident}\\s*[:?]\\s)`, 'g');
        for (const m of src.matchAll(re)) {
          const idx = m.index ?? 0;
          const context = src.slice(Math.max(0, idx - 30), idx + 30).trim();
          offenders.push(`${rel}: "${ident}" near "${context}"`);
        }
      }
    }
    expect(
      offenders,
      'A finding and an outcome have no severity, weight, score, priority, rank ' +
        'or grade (FR-4.9): validation is binary, not scored.\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Domain lists are not tables or seeds (FR-4.1).
// ─────────────────────────────────────────────────────────────────────────────

describe('domain lists are compiled-in, not tables or seeds (FR-4.1)', () => {
  // schema.spec.ts already pins the thirteen-table set; this asserts the INTENT,
  // so a future reader sees WHY no reference table exists: the four domain lists
  // (port/country/uom/generic) are compiled-in constants versioned with
  // rule_set_version, never a database table, seed row or editable config.
  it('no migration creates a port/country/uom/code-list/lookup/reference table', () => {
    const offenders: string[] = [];
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?["']?([a-z0-9_.]+)/gi;
    for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/--[^\n]*/g, ' ');
      for (const m of sql.matchAll(re)) {
        const name = m[1] ?? '';
        if (/port|countr|unit_of_measure|uom|code_list|lookup|reference/i.test(name)) {
          offenders.push(`${file}: CREATE TABLE ${name}`);
        }
      }
    }
    expect(
      offenders,
      'The four domain code lists are compiled-in constants (FR-4.1), never a ' +
        'reference/lookup table.\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  it('there is no seeds/ or fixtures/ directory anywhere in the repository', () => {
    const offenders: string[] = [];
    const stack: string[] = [REPO_ROOT];
    while (stack.length > 0) {
      const dir = stack.pop() as string;
      let entries: import('node:fs').Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        const full = join(dir, entry.name);
        if (entry.name === 'seeds' || entry.name === 'fixtures') {
          if (statSync(full).isDirectory()) offenders.push(relative(REPO_ROOT, full));
        }
        stack.push(full);
      }
    }
    expect(
      offenders,
      'No seeds/ or fixtures/ directory may exist: the record starts empty and ' +
        'domain lists are compiled-in (FR-4.1, PRD §10 #7).\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});
