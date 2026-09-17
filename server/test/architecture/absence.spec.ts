// Architecture suite — ABSENCES (TEST-ARCH-09, TEST-ARCH-11).
//
// In a product whose scope discipline is a stated success metric (SM-14) and
// whose named risk is scope pressure (PRD R-2), absence must be *verified*, not
// remembered. This file is the mechanism by which PRD §10's exclusion list
// becomes a build constraint rather than an intention: adding a CI workflow, an
// accessibility runner, an ORM, an export writer, a seed directory, or a domain
// INSERT in a migration fails `npm run test:arch`.
//
// This file makes only filesystem and manifest assertions — no database is
// needed, so it is fast and runs first among the three architecture specs.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, sep, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// server/test/architecture -> repository root
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'server', 'migrations');

// The thirteen application tables (schema_migrations is the runner's own
// bookkeeping and is not an application table). Re-used to make the migration
// domain-data assertion precise if ever needed; the blanket check below is
// preferred and explained inline.
const APPLICATION_TABLES = [
  'specialists',
  'sessions',
  'cargo_entries',
  'cargo_entry_field_origins',
  'validation_results',
  'validation_findings',
  'exceptions',
  'recommendations',
  'recommendation_values',
  'decisions',
  'decision_values',
  'audit_entries',
  'audit_entry_values',
];

/** Recursively list every file path under `root`, excluding heavy/vcs dirs. */
function walk(root: string, skip: Set<string> = new Set(['node_modules', 'dist', '.git'])): string[] {
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
        if (skip.has(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

/** Read a package.json if it exists, returning its dependency name set. */
function dependencyNames(pkgPath: string): Set<string> {
  const names = new Set<string>();
  if (!existsSync(pkgPath)) return names;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  for (const bag of [
    pkg.dependencies,
    pkg.devDependencies,
    pkg.optionalDependencies,
    pkg.peerDependencies,
  ]) {
    if (bag) for (const name of Object.keys(bag)) names.add(name);
  }
  return names;
}

/** Strip SQL comments so INSERT/keyword scans only see executable text. */
function stripSqlComments(sql: string): string {
  // Block comments first, then line comments (-- to end of line).
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => join(MIGRATIONS_DIR, f));
}

describe('architecture — no continuous integration (TEST-ARCH-09, PRD §10 #1)', () => {
  // The recorded decision: v1 adds no automated accessibility gate and no
  // .github/workflows file; WCAG 2.1 AA conformance is met by design and by
  // signed manual + assistive-technology review, per screen, inside each UI
  // phase (FRD FR-2.25, TechArch §7.8, RTM §7.4). As TechArch §7.8 puts it:
  // "we added a quick axe check in CI" fails the build it was meant to join.
  it('has no .github directory at the repository root', () => {
    expect(
      existsSync(join(REPO_ROOT, '.github')),
      'A .github directory exists. v1 runs no CI and no accessibility gate ' +
        '(PRD §10 #1, NFR-2, TechArch §7.8): there is no .github/workflows path.',
    ).toBe(false);
  });

  it('contains no CI workflow file anywhere in the repository', () => {
    const offenders: string[] = [];
    for (const file of walk(REPO_ROOT)) {
      const rel = relative(REPO_ROOT, file);
      const relPosix = rel.split(sep).join('/');
      if (relPosix.includes('/.github/') || relPosix.startsWith('.github/')) {
        offenders.push(rel);
        continue;
      }
      if (/\.(gitlab-ci|circleci|travis|drone)\.ya?ml$/i.test(relPosix)) {
        offenders.push(rel);
        continue;
      }
      // GitHub Actions live under **/workflows/*.y*ml — the .github check above
      // catches the canonical location; this catches a workflows/ dir anywhere.
      if (/(^|\/)workflows\/[^/]+\.ya?ml$/i.test(relPosix)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `CI workflow file(s) present: ${offenders.join(', ')}. v1 runs no CI ` +
        '(PRD §10 #1, TechArch §7.8); conformance is signed manual review, not a gate.',
    ).toEqual([]);
  });
});

describe('architecture — no forbidden dependency (PRD §10, TechArch §6.2)', () => {
  // Each entry maps to an explicit PRD §10 exclusion. The message names the
  // exclusion so a future reader learns WHY, not merely WHAT.
  const FORBIDDEN: Array<{ name: string; exclusion: string }> = [
    // ORMs / query builders — TechArch §6.2: hand-written SQL, no ORM.
    { name: 'typeorm', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no ORM' },
    { name: 'prisma', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no ORM' },
    { name: '@prisma/client', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no ORM' },
    { name: 'sequelize', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no ORM' },
    { name: 'knex', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no query builder' },
    { name: 'drizzle-orm', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no ORM' },
    { name: 'mikro-orm', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no ORM' },
    { name: '@mikro-orm/core', exclusion: 'PRD §10 / TechArch §6.2 — hand-written SQL, no ORM' },
    // Accessibility runners — PRD §10, NFR-2: no automated a11y gate in v1.
    { name: 'axe-core', exclusion: 'PRD §10 / NFR-2 — no automated accessibility gate' },
    { name: 'jest-axe', exclusion: 'PRD §10 / NFR-2 — no automated accessibility gate' },
    { name: 'pa11y', exclusion: 'PRD §10 / NFR-2 — no automated accessibility gate' },
    { name: 'lighthouse-ci', exclusion: 'PRD §10 / NFR-2 — no automated accessibility gate' },
    { name: '@lhci/cli', exclusion: 'PRD §10 / NFR-2 — no automated accessibility gate' },
    // Export writers — PRD §10: no export capability in v1.
    { name: 'csv-stringify', exclusion: 'PRD §10 — no export capability' },
    { name: 'csv-parse', exclusion: 'PRD §10 — no ingestion/export capability' },
    { name: 'exceljs', exclusion: 'PRD §10 — no export capability' },
    { name: 'pdfkit', exclusion: 'PRD §10 — no export capability' },
    { name: 'puppeteer', exclusion: 'PRD §10 — no export/report rendering capability' },
    // Multipart parsers — PRD §10: no file upload / ingestion path in v1.
    { name: 'multer', exclusion: 'PRD §10 — no upload/ingestion path' },
    { name: 'busboy', exclusion: 'PRD §10 — no upload/ingestion path' },
    { name: 'formidable', exclusion: 'PRD §10 — no upload/ingestion path' },
    // Schedulers — PRD §10: no background scheduling in v1.
    { name: 'node-cron', exclusion: 'PRD §10 — no scheduler / background jobs' },
    { name: 'agenda', exclusion: 'PRD §10 — no scheduler / background jobs' },
    { name: 'bullmq', exclusion: 'PRD §10 — no queue / scheduler' },
    { name: 'bull', exclusion: 'PRD §10 — no queue / scheduler' },
    { name: 'node-schedule', exclusion: 'PRD §10 — no scheduler / background jobs' },
    // Brokers / caches — PRD §10: no message broker or external cache in v1.
    { name: 'amqplib', exclusion: 'PRD §10 — no message broker' },
    { name: 'kafkajs', exclusion: 'PRD §10 — no message broker' },
    { name: 'ioredis', exclusion: 'PRD §10 — no external cache / broker' },
    { name: 'redis', exclusion: 'PRD §10 — no external cache / broker' },
    // AI provider SDKs — TechArch: the AI provider is reached over plain HTTP,
    // no vendor SDK, so the provider is swappable and un-privileged.
    { name: 'openai', exclusion: 'PRD §10 / TechArch — AI over plain HTTP, no vendor SDK' },
    { name: '@anthropic-ai/sdk', exclusion: 'PRD §10 / TechArch — AI over plain HTTP, no vendor SDK' },
    { name: '@azure/openai', exclusion: 'PRD §10 / TechArch — AI over plain HTTP, no vendor SDK' },
    { name: 'langchain', exclusion: 'PRD §10 / TechArch — no orchestration framework' },
    // Auth federation — PRD §10: no SSO / federation in v1.
    { name: 'passport-saml', exclusion: 'PRD §10 — no auth federation / SSO' },
    { name: 'openid-client', exclusion: 'PRD §10 — no auth federation / SSO' },
  ];

  // ⚠️ web/package.json MUST be here. Phase 1 had three workspaces (root /
  // contract / server); plan 02-01 added a FOURTH, `web`. Every
  // forbidden-dependency assertion below iterates PKG_PATHS, so until `web` is
  // covered, an accessibility runner declared in web/package.json passes the
  // build whose entire purpose is to fail it (§7.8: "'we added a quick axe check
  // in CI' fails the build it was meant to join").
  const PKG_PATHS = [
    join(REPO_ROOT, 'package.json'),
    join(REPO_ROOT, 'contract', 'package.json'),
    join(REPO_ROOT, 'server', 'package.json'),
    join(REPO_ROOT, 'web', 'package.json'),
  ];

  const declared = new Map<string, Set<string>>();
  for (const p of PKG_PATHS) declared.set(p, dependencyNames(p));

  it('PKG_PATHS covers every workspace declared in the root package.json', () => {
    // So the NEXT workspace anyone adds cannot silently escape the gate either:
    // if `workspaces` grows, this fails until its package.json is added above.
    const rootPkg = JSON.parse(
      readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'),
    ) as { workspaces?: string[] };
    const workspaceDirs = rootPkg.workspaces ?? [];
    const covered = new Set(
      PKG_PATHS.map((p) => relative(REPO_ROOT, p).split(sep).join('/')),
    );
    const missing: string[] = [];
    for (const ws of workspaceDirs) {
      const expected = `${ws}/package.json`;
      if (!covered.has(expected)) missing.push(expected);
    }
    expect(
      missing,
      `Workspace(s) not covered by the forbidden-dependency gate: ${missing.join(', ')}. ` +
        'Add each to PKG_PATHS so a forbidden dependency there fails the build.',
    ).toEqual([]);
  });

  for (const { name, exclusion } of FORBIDDEN) {
    it(`does not depend on ${name}`, () => {
      const offending: string[] = [];
      for (const [p, names] of declared) {
        if (names.has(name)) offending.push(relative(REPO_ROOT, p));
      }
      expect(
        offending,
        `Forbidden dependency "${name}" appears in ${offending.join(', ')}. ` +
          `Excluded by ${exclusion}.`,
      ).toEqual([]);
    });
  }

  it('rejects any @axe-core/* scoped accessibility runner', () => {
    const offending: string[] = [];
    for (const [p, names] of declared) {
      for (const n of names) {
        if (/^@axe-core\//.test(n)) offending.push(`${relative(REPO_ROOT, p)}:${n}`);
      }
    }
    expect(
      offending,
      `Forbidden @axe-core/* runner(s): ${offending.join(', ')}. ` +
        'Excluded by PRD §10 / NFR-2 — no automated accessibility gate.',
    ).toEqual([]);
  });

  it('rejects any @node-saml/* auth federation package', () => {
    const offending: string[] = [];
    for (const [p, names] of declared) {
      for (const n of names) {
        if (/^@node-saml\//.test(n)) offending.push(`${relative(REPO_ROOT, p)}:${n}`);
      }
    }
    expect(
      offending,
      `Forbidden @node-saml/* package(s): ${offending.join(', ')}. ` +
        'Excluded by PRD §10 — no auth federation / SSO.',
    ).toEqual([]);
  });

  // TODO(Phase 5 — the AI recommendation phase, the LAST to add a runtime
  // dependency): the allowlist-equality assertion closes there. Phase 2 has now
  // added express, helmet, zod, argon2, pino, react, react-dom,
  // react-router-dom, @uswds/uswds, sass, vite, supertest and @playwright/test —
  // so the set is complete EXCEPT for whatever Phases 3–4 add and the AI
  // client's dependencies in Phase 5. Once Phase 5's runtime deps land, add an
  // assertion that the union of every workspace's dependency set EQUALS the
  // TechArch §6.2 allowlist, so an unlisted package fails the build. It is
  // deliberately NOT a skipped test here: phases 3–5 legitimately grow the set,
  // and a skipped test reads as coverage it does not have.
});

describe('architecture — no seed/ingest/export/rbac surface (TechArch §1A.1 "ABSENT BY DESIGN")', () => {
  // These directories are excluded capabilities. server/test/helpers/ is
  // permitted: it is test-only code excluded from any production build and is
  // NOT a fixture loader (it constructs a fresh database per suite, it does not
  // load domain fixtures).
  const FORBIDDEN_DIRS = [
    'seeds',
    'fixtures',
    'adapters/ingest',
    'export',
    'reports',
    'rbac',
    'roles',
  ];

  for (const dir of FORBIDDEN_DIRS) {
    it(`has no ${dir}/ directory at the repository root`, () => {
      const full = join(REPO_ROOT, ...dir.split('/'));
      const present = existsSync(full) && statSync(full).isDirectory();
      expect(
        present,
        `Directory "${dir}/" exists. It is ABSENT BY DESIGN (TechArch §1A.1): ` +
          'v1 has no seed, ingestion, export, reporting, or RBAC surface.',
      ).toBe(false);
    });
  }
});

describe('architecture — exactly one seed-named file exists (F15, TechArch §1A.1a/§8.9)', () => {
  // F15 REVERSES exactly one v1 exclusion (PRD §10 #7's "no seeded demonstration
  // dataset") with a SINGLE, named, reviewed file. This asserts that reversal is
  // narrow: the ONLY file in the repository whose name contains "seed" is
  // server/src/cli/seed-demo-case.ts. The general FORBIDDEN_DIRS ban (no seeds/
  // directory) and the migration-INSERT ban above stay UNMODIFIED — this is a
  // scoped exception, not a hole for a second seed mechanism.
  //
  // Scoped to filenames containing "seed" — deliberately NOT "fixture", because
  // server/test/helpers/caseFixtures.ts already exists and is NOT a seed/fixture
  // LOADER (it is a test-only builder constructing data through the public API,
  // §8.2). TechArch §1A.1a's own wording is "the only file whose name contains
  // `seed`", not `fixture` — matched precisely so this does not collide with the
  // pre-existing helper.
  //
  // The scan covers the CODE trees where a real seed MECHANISM would live
  // (server/, web/, db/) — a second seed loader, script, migration or helper.
  // It deliberately excludes prose trees (project_specs/, docs/, .planning/) and
  // the platform's own agent tooling (.opencode/): F15's own FRD/user-story
  // files and its required FR-15.9 runbook (docs/seed-demo-case.md) legitimately
  // carry "seed" in their names, and a spec/doc named after the feature is not a
  // second seed mechanism. This is the whole point of the exception — narrow it
  // to executable seed code, not documentation of it (recorded as a deviation in
  // the 07-01 SUMMARY).
  const SEED_SCAN_ROOTS = [
    join(REPO_ROOT, 'server'),
    join(REPO_ROOT, 'web'),
    join(REPO_ROOT, 'db'),
  ];
  it('server/src/cli/seed-demo-case.ts is the only seed-named file in the code trees', () => {
    const offenders: string[] = [];
    for (const root of SEED_SCAN_ROOTS) {
      for (const file of walk(root)) {
        const rel = relative(REPO_ROOT, file).split(sep).join('/');
        if (/seed/i.test(basename(rel)) && rel !== 'server/src/cli/seed-demo-case.ts') {
          offenders.push(rel);
        }
      }
    }
    expect(
      offenders,
      `Unexpected seed-named file(s): ${offenders.join(', ')}. F15 is a single, ` +
        'named, reviewed exception (server/src/cli/seed-demo-case.ts) — not a ' +
        'hole for a second seed mechanism (TechArch §1A.1a).',
    ).toEqual([]);
  });
});

describe('architecture — migrations contain no domain data (TEST-ARCH-11, FR-0.18, FR-Y0.4)', () => {
  // A migration that seeds domain rows makes the record untrustworthy (a
  // decision nobody made, an entry nobody received). We strip comments and then
  // reject ANY `INSERT INTO` in any migration file: `INSERT INTO
  // schema_migrations` is the runner's own bookkeeping and lives in the runner,
  // never in a migration file — so a blanket "no INSERT INTO" assertion is both
  // correct and simpler than enumerating the thirteen application tables.
  void APPLICATION_TABLES; // referenced for documentation; blanket check preferred

  it('no migration file contains an INSERT INTO statement', () => {
    const offenders: string[] = [];
    for (const file of migrationFiles()) {
      const body = stripSqlComments(readFileSync(file, 'utf8'));
      if (/\binsert\s+into\b/i.test(body)) {
        offenders.push(relative(REPO_ROOT, file));
      }
    }
    expect(
      offenders,
      `Migration(s) contain domain-data inserts: ${offenders.join(', ')}. ` +
        'Migrations create structure only (FR-0.18, FR-Y0.4); the record starts empty.',
    ).toEqual([]);
  });

  it('no migration file contains a down-migration section (FR-Y0.1)', () => {
    // v1 has no down-migration path: the migration set is forward-only.
    const offenders: string[] = [];
    for (const file of migrationFiles()) {
      const raw = readFileSync(file, 'utf8');
      if (/--\s*Down\s+Migration/i.test(raw)) {
        offenders.push(relative(REPO_ROOT, file));
      }
    }
    expect(
      offenders,
      `Migration(s) contain a "-- Down Migration" section: ${offenders.join(', ')}. ` +
        'v1 is forward-only (FR-Y0.1); there is no down path.',
    ).toEqual([]);
  });
});

// ─── web/src scope + external-network gates (§8.3, FR-2.2, FR-2.3) ────────────

const WEB_SRC = join(REPO_ROOT, 'web', 'src');

/** Recursively list source files under `root` matching an extension test. */
function walkFiles(root: string, match: (name: string) => boolean): string[] {
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

describe('architecture — no raw hex/px in screen styles (§8.3, FR-2.2)', () => {
  // The USWDS design tokens are the ONLY source of colour and spacing (FR-2.2).
  // A raw hex colour or a raw px length in a screen bypasses the token system and
  // drifts from the federal palette/scale. Until now this was a one-off <verify>
  // grep in plans 02-05/02-07 that checks once and leaves nothing behind; as a
  // spec it is re-run by every later UI phase.
  //
  // web/styles/ is excluded: USWDS $theme-* Sass settings legitimately carry hex
  // and px there. (The plan named web/styles/uswds.scss; the actual settings file
  // is web/styles/app.scss — recorded as a deviation in the SUMMARY. We exclude
  // the whole web/styles/ tree, which is broader and correct.)
  it('no raw hex colour or raw px value in web/src/**/*.tsx', () => {
    const offenders: string[] = [];
    for (const file of walkFiles(WEB_SRC, (n) => n.endsWith('.tsx'))) {
      const src = stripLineAndBlockComments(readFileSync(file, 'utf8'));
      const hex = src.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g) ?? [];
      const px = src.match(/\b\d+px\b/g) ?? [];
      if (hex.length > 0 || px.length > 0) {
        offenders.push(
          `${relative(REPO_ROOT, file)}: ${[...hex, ...px].join(', ')}`,
        );
      }
    }
    expect(
      offenders,
      `Raw hex/px in screen source: ${offenders.join(' | ')}. Screens use USWDS ` +
        'design tokens only (FR-2.2); colour/spacing never appears as a raw literal.',
    ).toEqual([]);
  });
});

describe('architecture — no report artefact from the e2e runner (PRD §10 #5)', () => {
  // reports/ is already covered as a forbidden directory above; a Playwright HTML
  // report or an outputDir named `reports` would collide with a name PRD §10
  // excludes for a reason, and a report artefact is not a deliverable here.
  it('playwright.config.ts configures no html reporter and no reports/ outputDir', () => {
    const cfgPath = join(REPO_ROOT, 'playwright.config.ts');
    if (!existsSync(cfgPath)) return; // no e2e runner configured → nothing to check
    const cfg = readFileSync(cfgPath, 'utf8');
    expect(
      /reporter\s*:\s*\[[^\]]*['"]html['"]/.test(cfg),
      'playwright.config.ts configures an html reporter — an HTML report directory ' +
        'is a report artefact excluded by PRD §10 #5.',
    ).toBe(false);
    expect(
      /outputDir\s*:\s*['"][^'"]*reports/.test(cfg),
      'playwright.config.ts sets an outputDir under reports/ — the name is excluded ' +
        'by PRD §10 #5. Use test-results/ instead.',
    ).toBe(false);
  });
});

describe('architecture — the demonstration reaches no external network (FR-2.3, FR-Y3.10)', () => {
  // FR-2.3 requires the demonstration to render with NO external network access.
  // A single stray CDN font or script link would break that silently — the
  // preview would look fine until it ran offline. Assert no CDN host is
  // referenced anywhere under web/ (source, HTML and styles alike).
  it('no CDN host is referenced anywhere under web/', () => {
    const CDN = /cdn\.|unpkg|jsdelivr|googleapis/i;
    const offenders: string[] = [];
    const webRoot = join(REPO_ROOT, 'web');
    for (const file of walkFiles(
      webRoot,
      (n) => /\.(ts|tsx|html|scss|css)$/.test(n),
    )) {
      const src = readFileSync(file, 'utf8');
      if (CDN.test(src)) offenders.push(relative(REPO_ROOT, file));
    }
    expect(
      offenders,
      `CDN host referenced in: ${offenders.join(', ')}. The demonstration must ` +
        'render with no external network access (FR-2.3, FR-Y3.10).',
    ).toEqual([]);
  });
});

/** Strip // and block comments (used by the hex/px scan). */
function stripLineAndBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}
