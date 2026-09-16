// Architecture suite — criterion 4, the code / API / UI paths (plan 03-07).
//
// "There is no way to open an exception by hand" is not a convention in this
// product; it is three independent structural mechanisms, each asserted by a
// test that fails the build if it is weakened (PRD R-2, scope pressure is the
// named risk). The composite basis FK is proved from SQL in
// server/test/db/exceptionBasis.spec.ts. THIS file proves the other two halves
// by reading the shipped tree:
//
//   R-L5 — exactly ONE write path: the SQL lives in the three repositories, the
//          only caller of the insert functions is receipt.service.ts, and there
//          is no UPDATE/DELETE against the five immutable receipt tables and no
//          exception-authoring function of any name.
//   No authoring API shape — no state-changing route on an exception collection;
//          the route table is still ten; POST …/decision is the only mutating
//          exception row.
//   No authoring UI affordance — no open/create-exception copy, no state-changing
//          fetch to an exception collection, no ingestion affordance, no draft
//          store.
//
// Conventions follow absence.spec.ts / navigation.spec.ts: read sources from
// disk, stripComments FIRST, assert on ABSENCE, and give every assertion a
// comment naming the requirement it defends. A deferred future-surface is a
// comment naming the owning phase, never a skipped test. This is a NEW spec —
// absence.spec.ts and navigation.spec.ts are NOT modified (plan 03-11 reviews
// those; a second writer would collide).
//
// Filesystem + import of the route table only — no database — so it is fast and
// runs alongside the other architecture specs.
//
// ─── Assertions proven RED during development (recorded in the SUMMARY) ───────
// 1  planting `INSERT INTO exceptions (…)` in a scratch server/src file → the
//    INSERT-file-set assertion failed until removed.
// 4  planting an `UPDATE exceptions SET state = …` line in a scratch file → the
//    no-UPDATE-exceptions assertion failed until removed.
// 8  planting the string "Open an exception" in a scratch web/src component →
//    the no-authoring-copy assertion failed until removed.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, sep } from 'node:path';

import { API_ROUTE_TABLE } from '../../src/http/routes/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
// server/test/architecture -> repository root
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const SERVER_SRC = join(REPO_ROOT, 'server', 'src');
const WEB_SRC = join(REPO_ROOT, 'web', 'src');

/** Recursively list every .ts/.tsx source file under `root`. */
function walk(root: string): string[] {
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
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

/** Strip line and block comments so token scans see executable text only. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** The repo-relative POSIX path of a file. */
function rel(file: string): string {
  return relative(REPO_ROOT, file).split(sep).join('/');
}

// The five (six with recommendations) tables the receipt owns exclusively.
const RECEIPT_TABLES = [
  'cargo_entries',
  'cargo_entry_field_origins',
  'validation_results',
  'validation_findings',
  'exceptions',
  'recommendations',
];

// The three repository modules that legitimately hold the receipt SQL.
const REPOSITORY_MODULES = new Set([
  'server/src/db/repositories/entries.ts',
  'server/src/db/repositories/validation.ts',
  'server/src/db/repositories/exceptions.ts',
]);

// The insert FUNCTIONS the repositories export — the ones only the receipt
// service may call. A type-only import (CanonicalEntryRecord) does not name any
// of these, so the validation engine's type import does not join the caller set.
const INSERT_FUNCTIONS = [
  'insertEntry',
  'insertFieldOrigins',
  'insertValidationResult',
  'insertFindings',
  'insertException',
  'insertPendingRecommendation',
];

// ─────────────────────────────────────────────────────────────────────────────
// R-L5 — one write path (F5 FR-5.1, the "no service method" half).
// ─────────────────────────────────────────────────────────────────────────────

describe('receiptPaths — one write path to the receipt tables (R-L5, F5 FR-5.1)', () => {
  it('1. the INSERT INTO file set for the six receipt tables is EXACTLY the three repository modules', () => {
    // The SQL lives in the repositories and nowhere else. A new INSERT INTO any
    // of these tables in a service, route or CLI is a second write path.
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const table of RECEIPT_TABLES) {
        const re = new RegExp(`insert\\s+into\\s+${table}\\b`, 'i');
        if (re.test(src)) {
          const r = rel(file);
          if (!REPOSITORY_MODULES.has(r)) {
            offenders.push(`${r}: INSERT INTO ${table}`);
          }
        }
      }
    }
    expect(
      offenders,
      'INSERT INTO a receipt table outside the three repositories:\n' +
        offenders.join('\n') +
        '\nThe receipt SQL lives in db/repositories/{entries,validation,exceptions}.ts only (R-L5).',
    ).toEqual([]);
  });

  it('2. the only module that CALLS the insert functions is receipt.service.ts; routes/entries.ts imports none of them', () => {
    // Collect every file that imports at least one insert FUNCTION by name. A
    // type-only `CanonicalEntryRecord` import (the validation engine) names none
    // of these, so it does not appear here.
    const callers = new Set<string>();
    for (const file of walk(SERVER_SRC)) {
      const r = rel(file);
      if (REPOSITORY_MODULES.has(r)) continue; // the repositories DECLARE them
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const fn of INSERT_FUNCTIONS) {
        // The function used as an identifier (import specifier or call site).
        const re = new RegExp(`\\b${fn}\\b`);
        if (re.test(src)) {
          callers.add(r);
          break;
        }
      }
    }
    // Exactly the receipt service. The route may READ (loadEntryDetail,
    // loadFieldOrigins, loadValidationByEntry, loadExceptionRefByEntry) but must
    // name NONE of the insert functions.
    //
    // Phases that will legitimately join the READ set: services/queue.service.ts
    // and services/caseRead.service.ts (Phase 4, read-only) and
    // services/decision.service.ts (Phase 6, writes exceptions.state only). None
    // of those calls an INSERT function; when they arrive their owning plan
    // extends this allowlist deliberately rather than deleting the test.
    expect([...callers].sort()).toEqual(['server/src/services/receipt.service.ts']);

    // Belt-and-braces: routes/entries.ts provably names none of the insert
    // functions (it uses the READ functions only).
    const routeSrc = stripComments(
      readFileSync(join(SERVER_SRC, 'http', 'routes', 'entries.ts'), 'utf8'),
    );
    for (const fn of INSERT_FUNCTIONS) {
      expect(
        new RegExp(`\\b${fn}\\b`).test(routeSrc),
        `routes/entries.ts must not name ${fn} — only receipt.service.ts writes (R-L5).`,
      ).toBe(false);
    }
  });

  it('3. server/src contains no UPDATE or DELETE against the five immutable receipt tables', () => {
    // Cases are permanent; the audit trail depends on their continued existence
    // (F3 FR-3.6, F4 FR-4.12, F5 FR-5.15). No overwrite, no purge.
    const forbidden: RegExp[] = [
      /update\s+cargo_entries\b/i,
      /update\s+validation_results\b/i,
      /update\s+validation_findings\b/i,
      /delete\s+from\s+cargo_entries\b/i,
      /delete\s+from\s+cargo_entry_field_origins\b/i,
      /delete\s+from\s+validation_results\b/i,
      /delete\s+from\s+validation_findings\b/i,
      /delete\s+from\s+exceptions\b/i,
      /delete\s+from\s+recommendations\b/i,
    ];
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const re of forbidden) {
        if (re.test(src)) {
          offenders.push(`${rel(file)}: /${re.source}/`);
        }
      }
    }
    expect(
      offenders,
      'UPDATE/DELETE against an immutable receipt table:\n' +
        offenders.join('\n') +
        '\nThe entry of record, its validation and its findings are permanent (F3/F4/F5).',
    ).toEqual([]);
  });

  it('4. server/src contains no `UPDATE exceptions` / `exceptions SET` statement at all yet', () => {
    // Phase 6's decision.service.ts is the ONLY module that will EVER be
    // permitted an `UPDATE exceptions` (R-L4, F5 FR-5.7 — it writes state /
    // closed_at / decision_id on the closure path). Until it exists the count is
    // zero. When it arrives, its owning plan extends this allowlist deliberately
    // rather than deleting the test.
    const ALLOWLIST = new Set<string>([
      'server/src/services/decision.service.ts', // Phase 6 (F11) — the ONE permitted UPDATE exceptions (R-L4, FR-5.7)
    ]);
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const r = rel(file);
      if (ALLOWLIST.has(r)) continue;
      const src = stripComments(readFileSync(file, 'utf8'));
      if (/update\s+exceptions\b/i.test(src) || /\bexceptions\s+set\b/i.test(src)) {
        offenders.push(r);
      }
    }
    expect(
      offenders,
      'UPDATE exceptions outside the Phase 6 decision-service allowlist:\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });

  it('5. no exception-authoring function name exists anywhere in server/src', () => {
    // There is no createException / openException / raiseException / … of any
    // name (F5 FR-5.1). `insertException` is EXCLUDED: it is the repository
    // primitive the receipt service calls inside the derivation branch, the one
    // legitimate write, already pinned to a single caller by assertion 2.
    const AUTHORING_RE =
      /\b(create(Exception|Case)|openException|raiseException|newException|makeException|authorException)\b/i;
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      // Remove the permitted primitive so `insertException` never trips the scan.
      const scrubbed = src.replace(/\binsertException\b/g, ' ');
      const m = AUTHORING_RE.exec(scrubbed);
      if (m !== null) {
        offenders.push(`${rel(file)}: "${m[0]}"`);
      }
    }
    expect(
      offenders,
      'Exception-authoring function name(s) found:\n' +
        offenders.join('\n') +
        '\nAn exception is DERIVED inside the receipt transaction, never authored (F5 FR-5.1).',
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// No authoring API shape (F5 FR-5.1, the "no endpoint" half).
// ─────────────────────────────────────────────────────────────────────────────

describe('receiptPaths — no exception-authoring API shape (F5 FR-5.1)', () => {
  it('6. no state-changing route on an exception collection; POST …/decision is the only mutating exception row; table is ten', () => {
    // The route table is exhaustive at ten (§3.1); "anything not on this list
    // does not exist".
    expect(API_ROUTE_TABLE.length).toBe(10);

    const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    const mutatingExceptionRows = API_ROUTE_TABLE.filter(
      (r) => STATE_CHANGING.has(r.method) && /\/api\/exceptions/.test(r.path),
    );

    // No POST/PUT/PATCH/DELETE on /api/exceptions or /api/exceptions/:idOrReference.
    const collectionAuthoring = mutatingExceptionRows.filter(
      (r) =>
        r.path === '/api/exceptions' ||
        /^\/api\/exceptions\/:[A-Za-z]+$/.test(r.path), // a single-segment id param
    );
    expect(
      collectionAuthoring.map((r) => `${r.method} ${r.path}`),
      'A state-changing route authors on an exception collection — F5 FR-5.1 forbids it.',
    ).toEqual([]);

    // The ONLY state-changing exception route in the product is the F11 decision.
    expect(mutatingExceptionRows.map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /api/exceptions/:exceptionId/decision',
    ]);
  });

  it('7. no route path is an ingestion / bulk / export / admin / search / metrics surface', () => {
    // §3.1 is exhaustive at ten; there is no second data-entry path (F3 FR-3.2,
    // PRD §10 #6).
    const FORBIDDEN: RegExp[] = [
      /validate/i,
      /import/i,
      /upload/i,
      /bulk/i,
      /batch/i,
      /export/i,
      /admin/i,
      /search/i,
      /metrics/i,
    ];
    const offenders: string[] = [];
    for (const row of API_ROUTE_TABLE) {
      for (const re of FORBIDDEN) {
        if (re.test(row.path)) {
          offenders.push(`${row.method} ${row.path} matches /${re.source}/`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// No authoring screen affordance (F5 FR-5.1, the "no UI affordance" half).
// ─────────────────────────────────────────────────────────────────────────────

describe('receiptPaths — no exception-authoring or ingestion UI affordance', () => {
  it('8. no rendered copy invites opening/creating/raising an exception', () => {
    // The specialist never opens an exception; the system derives one. Scan the
    // whole web/src tree with comments stripped.
    const AUTHORING_COPY =
      /open an exception|create an exception|new exception|raise an exception|flag for review|mark as exception/i;
    const offenders: string[] = [];
    for (const file of walk(WEB_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const m = AUTHORING_COPY.exec(src);
      if (m !== null) {
        offenders.push(`${rel(file)}: "${m[0]}"`);
      }
    }
    expect(
      offenders,
      'Exception-authoring copy in the UI:\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  it('9. web/src makes no state-changing fetch/api call to an exception collection', () => {
    // The SPA has no way to POST to an exception collection. In practice
    // api/client.ts is the only module that calls fetch — assert on it
    // specifically as well as across the directory.
    const offenders: string[] = [];
    for (const file of walk(WEB_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      // A fetch/method literal referencing an /api/exceptions* collection path.
      // We look for a POST/PUT/PATCH/DELETE method near an exceptions path.
      if (/['"`]\/api\/exceptions[^'"`]*['"`]/.test(src)) {
        // Any exceptions path at all in the client is worth inspecting; only the
        // read routes are permitted, and none exist yet. A path with a
        // state-changing method literal nearby is the offence.
        if (/\b(POST|PUT|PATCH|DELETE)\b/.test(src) && /\/api\/exceptions/.test(src)) {
          // Confirm the method and the exceptions path co-occur on the same call
          // by a coarse proximity check per matched path.
          for (const m of src.matchAll(/['"`](\/api\/exceptions[^'"`]*)['"`]/g)) {
            const idx = m.index ?? 0;
            const window = src.slice(Math.max(0, idx - 120), idx + 120);
            if (/\b(POST|PUT|PATCH|DELETE)\b/.test(window)) {
              offenders.push(`${rel(file)}: ${m[1]} with a state-changing method`);
            }
          }
        }
      }
    }
    expect(
      offenders,
      'State-changing call to an exception collection in web/src:\n' + offenders.join('\n'),
    ).toEqual([]);

    // api/client.ts specifically: as of Phase 4 (plan 04-04) it names the F7 READ
    // routes /api/exceptions and /api/exceptions/:idOrReference — but ONLY under
    // GET. It must never carry a POST/PUT/PATCH/DELETE against an exception
    // collection (criterion 4: no exception-authoring/mutation UI). We check
    // every request() call that names an exceptions path and assert its method
    // literal is 'GET'.
    const clientSrc = stripComments(readFileSync(join(WEB_SRC, 'api', 'client.ts'), 'utf8'));
    for (const m of clientSrc.matchAll(/['"`](\/api\/exceptions[^'"`]*)['"`]/g)) {
      const idx = m.index ?? 0;
      // The method literal in a request('GET', '/api/exceptions', …) call sits a
      // short distance BEFORE the path; scan a window around the path for a
      // mutating method literal.
      const window = clientSrc.slice(Math.max(0, idx - 60), idx + 60);
      expect(
        /\b(POST|PUT|PATCH|DELETE)\b/.test(window),
        `api/client.ts calls a mutating method against ${m[1]} — the F7 exception ` +
          'routes are read-only (GET); no exception-authoring/mutation call may exist.',
      ).toBe(false);
    }
  });

  it('10. no ingestion affordance: no file input, drag-and-drop, template download or batch paste', () => {
    // Manual typing is the only input method (F6 FR-6.19, PRD §10 #6).
    // navigation.spec.ts already forbids a `download` DESTINATION; this is the
    // control half.
    const FORBIDDEN: Array<{ re: RegExp; what: string }> = [
      { re: /type\s*=\s*["']file["']/i, what: 'a file input' },
      { re: /\baccept\s*=/i, what: 'an accept= attribute' },
      { re: /\bonDrop\b/, what: 'an onDrop handler' },
      { re: /\bonDragOver\b/, what: 'an onDragOver handler' },
      { re: /\bdataTransfer\b/, what: 'a dataTransfer reference' },
      { re: /import from (ACE|ATS)/i, what: 'an ACE/ATS import affordance' },
      { re: /template download|download template/i, what: 'a template download' },
      { re: /paste a batch|bulk paste/i, what: 'a batch-paste affordance' },
    ];
    const offenders: string[] = [];
    for (const file of walk(WEB_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const { re, what } of FORBIDDEN) {
        if (re.test(src)) {
          offenders.push(`${rel(file)}: ${what} (/${re.source}/)`);
        }
      }
    }
    expect(
      offenders,
      'Ingestion affordance in the UI:\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  it('11. no draft, autosave or duplicate-entry shortcut (F6 FR-6.7)', () => {
    // A draft store would be an unaudited shadow of the entry of record. NOTE:
    // "Create another entry" (resetting to an EMPTY form) is required by FR-6.13
    // and must NOT be caught — the regex is anchored on the forbidden phrases
    // only.
    const FORBIDDEN: Array<{ re: RegExp; what: string }> = [
      { re: /\blocalStorage\b/, what: 'localStorage' },
      { re: /\bsessionStorage\b/, what: 'sessionStorage' },
      { re: /\bindexedDB\b/i, what: 'indexedDB' },
      { re: /autosave/i, what: 'an autosave affordance' },
      { re: /save.?draft|draft.?save/i, what: 'a draft store' },
      { re: /duplicate this entry|create another from this/i, what: 'a duplicate-entry shortcut' },
    ];
    const offenders: string[] = [];
    for (const file of walk(WEB_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const { re, what } of FORBIDDEN) {
        if (re.test(src)) {
          offenders.push(`${rel(file)}: ${what} (/${re.source}/)`);
        }
      }
    }
    expect(
      offenders,
      'Draft/autosave/duplicate affordance in the UI:\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});
