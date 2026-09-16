// Architecture suite — A-1 mechanism #5: the AI code path cannot write a
// decision, and the AI credentials are constructed only at the bootstrap
// (plan 05-04, Task 3).
//
// TechArch §5.5 lists FIVE independent guarantees that "the AI decided it" is
// impossible. Four are database-level (no cargoexec_ai privilege on decisions,
// the decisions.decided_by FK, the HITL trigger, the audit-coupling triggers —
// all Phase 1, proved in the db tier). This file proves the FIFTH: the one YOUR
// code must uphold — no file under server/src/ai/ so much as references a
// decision-writing surface, and no request-path module reaches for the AI pool.
//
// Conventions follow receiptPaths.spec.ts / absence.spec.ts exactly: read the
// shipped tree from disk, stripComments FIRST, assert on ABSENCE, and give every
// assertion a comment naming the requirement it defends. Filesystem + string
// scan only — no database — so it runs fast alongside the other arch specs.
//
// ── Assertions proven RED during development (recorded in the SUMMARY) ────────
// 1  planting `import { insertDecision } from '../db/repositories/decisions.js'`
//    in a scratch server/src/ai file → assertion 1 failed until removed.
// 3  planting `import { getAiPool } from '../db/pool.ai.js'` in a scratch
//    server/src/http/routes file → assertion 3 failed until removed.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// server/test/architecture -> repository root
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const SERVER_SRC = join(REPO_ROOT, 'server', 'src');
const AI_DIR = join(SERVER_SRC, 'ai');

/** Recursively list every .ts source file under `root`. */
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
      } else if (entry.isFile() && /\.ts$/.test(entry.name)) {
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. No decision-writing reference anywhere under server/src/ai/
//    (TechArch §5.5 mechanism #5, T-05-09).
// ─────────────────────────────────────────────────────────────────────────────

describe('aiCapability — no AI file references a decision-writing surface (mechanism #5)', () => {
  it('1. no file under server/src/ai/ names decision.service, insertDecision, decision_values, … or imports the decisions repository', () => {
    // A single reference to any decision-writing identifier from AI code is a
    // structural leak: the whole point of A-1 mechanism #5 is that the AI code
    // path has no idea how to write a decision. This fails the build if one
    // appears.
    const FORBIDDEN: RegExp[] = [
      /\bdecision\.service\b/i,
      /\bdecisions\.service\b/i,
      /\binsertDecision\b/,
      /\bupdateDecision\b/,
      /\bdecision_values\b/i,
      /\bwriteDecision\b/,
      /\brecordDecision\b/,
    ];
    const offenders: string[] = [];
    for (const file of walk(AI_DIR)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const re of FORBIDDEN) {
        if (re.test(src)) {
          offenders.push(`${rel(file)}: /${re.source}/`);
        }
      }
      // Also: no import of the decisions repository, by any specifier form.
      if (/from\s+['"][^'"]*repositories\/decisions(\.js)?['"]/.test(src)) {
        offenders.push(`${rel(file)}: imports the decisions repository`);
      }
    }
    expect(
      offenders,
      'A decision-writing reference under server/src/ai/:\n' +
        offenders.join('\n') +
        '\nThe AI code path cannot write a decision (TechArch §5.5 mechanism #5).',
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. No AI/system principal minted in `specialists` from AI code
  //    (F9 acceptance 6, positive half). There is no schema path to insert one
  //    (Phase 1 proved it); here we assert the AI code never tries.
  // ───────────────────────────────────────────────────────────────────────────
  it('2. no file under server/src/ai/ contains INSERT INTO specialists or an AI-specialist factory', () => {
    const FORBIDDEN: RegExp[] = [
      /insert\s+into\s+specialists\b/i,
      /\bcreateAiSpecialist\b/i,
      /\bcreateSystemSpecialist\b/i,
      /\bcreateAiPrincipal\b/i,
    ];
    const offenders: string[] = [];
    for (const file of walk(AI_DIR)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const re of FORBIDDEN) {
        if (re.test(src)) {
          offenders.push(`${rel(file)}: /${re.source}/`);
        }
      }
    }
    expect(
      offenders,
      'An attempt to mint an AI/system specialist from AI code:\n' +
        offenders.join('\n') +
        '\nThere is no accountable machine identity (F9 acceptance 6).',
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Only the bootstrap imports pool.ai.js directly.
  //
  //    As built in Task 2, ai/job.ts receives the ai pool as an INJECTED
  //    `deps.aiPool: Pool` parameter and imports the pool module NOT AT ALL;
  //    ai/worker.ts likewise never imports it. The ONLY module that imports
  //    `getAiPool`/`pool.ai.js` is server/src/index.ts — the process bootstrap
  //    that constructs the real pool and closes it over the worker's runJob. So
  //    the expected import-specifier set is EXACTLY { server/src/index.ts }.
  //
  //    The invariant this protects: NO request-path route/service file
  //    (http/routes/*, services/*) ever imports the AI credentials directly —
  //    routing request-path work through the weaker cargoexec_ai role would
  //    quietly change the privilege set the code runs under.
  // ───────────────────────────────────────────────────────────────────────────
  it('3. the set of modules that IMPORT pool.ai.js is exactly { server/src/index.ts }', () => {
    const importers = new Set<string>();
    for (const file of walk(SERVER_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      // An import statement whose specifier ends in pool.ai.js (any relative depth).
      if (/from\s+['"][^'"]*pool\.ai(\.js)?['"]/.test(src)) {
        importers.add(rel(file));
      }
    }
    expect([...importers].sort()).toEqual(['server/src/index.ts']);
  });

  it('3b. no http/routes/* or services/* file imports pool.ai.js (the request path never reaches for AI credentials)', () => {
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const r = rel(file);
      const isRequestPath =
        r.startsWith('server/src/http/routes/') ||
        r.startsWith('server/src/services/');
      if (!isRequestPath) continue;
      const src = stripComments(readFileSync(file, 'utf8'));
      if (/from\s+['"][^'"]*pool\.ai(\.js)?['"]/.test(src)) {
        offenders.push(r);
      }
    }
    expect(
      offenders,
      'A request-path module imports pool.ai.js directly:\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. No provider SDK dependency.
  //    Already covered by absence.spec.ts's FORBIDDEN dependency list
  //    (openai / @anthropic-ai/sdk / @azure/openai / langchain). NOT duplicated
  //    here — see server/test/architecture/absence.spec.ts. The real adapter
  //    (adapter.http.ts) uses the platform fetch and no vendor SDK.
  // ───────────────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────────────
  // 5. ai/job.ts and ai/adapter.http.ts only ever append() as actor {type:'AI'}.
  //    The AI code writes exactly two audit actions (RECOMMENDATION_GENERATED /
  //    RECOMMENDATION_UNAVAILABLE), always as an AI actor — never SPECIALIST or
  //    SYSTEM, which would misattribute machine work to a human.
  // ───────────────────────────────────────────────────────────────────────────
  it("5. every `actor:` literal in ai/job.ts and ai/adapter.http.ts has type 'AI'", () => {
    const files = [
      join(AI_DIR, 'job.ts'),
      join(AI_DIR, 'adapter.http.ts'),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'));
      // Find every `actor:` object literal and inspect the `type` inside it.
      for (const m of src.matchAll(/actor:\s*\{([^}]*)\}/g)) {
        const inner = m[1] ?? '';
        const typeMatch = /type:\s*'([^']*)'/.exec(inner);
        const actorType = typeMatch?.[1];
        if (actorType !== 'AI') {
          offenders.push(`${rel(file)}: actor type ${JSON.stringify(actorType)} (must be 'AI')`);
        }
      }
    }
    expect(
      offenders,
      "An append() call from AI code uses a non-AI actor:\n" +
        offenders.join('\n') +
        "\nAI-authored audit entries must carry actor { type: 'AI' } (F9 FR-9.11).",
    ).toEqual([]);
  });
});
