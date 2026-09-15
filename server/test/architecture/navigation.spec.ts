// Architecture suite — the EXCLUSION criterion as a build constraint
// (phase criterion 5; TechArch §8.1, §8.3 "Primary navigation renders exactly
// two items"; §3.17 the UI route table; F2 FR-2.7; F1 FR-1.1; PRD §10 #2–#5).
//
// TechArch §8.1: "in a product whose scope discipline is a stated success metric
// (SM-14), absence must be verified, not remembered." This file is the durable,
// re-run-every-phase form of plan 02-05's <excluded_affordance_scan>: it proves,
// by reading the shipped tree, that
//   - the navigation set is EXACTLY two, in data AND in the rendered DOM,
//   - the router registers EXACTLY the seven §3.17 routes,
//   - no excluded affordance (dashboard/report/metric/settings/admin/export/
//     search/filter/sort/assign/priority) reaches any destination, nav label, or
//     rendered link/button name outside the pinned federal footer, and
//   - no application role/permission/scope/RBAC identifier exists in server/src
//     or web/src — authorisation in CargoExec is binary.
//
// ─── Why a cross-workspace .tsx import is safe here ──────────────────────────
// This spec imports web/src components and renders them with react-dom/server.
// `server/tsconfig.json` has `"include": ["src"]`, so `server/test/**` is NOT in
// the `tsc -b` graph (inherited from Phase 1) — `npm run typecheck` never sees
// this file. vitest transforms the .tsx imports through esbuild
// (`jsx: 'automatic'`, set in vitest.config.ts by plan 02-01). Do NOT "fix" the
// server tsconfig to include test/: that would break this spec's typecheck.
//
// This spec makes filesystem and render assertions only — no database — so it is
// fast and runs alongside absence.spec.ts.

import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

import { NAV_ITEMS } from '../../../web/src/shell/navItems.js';
import { Nav } from '../../../web/src/shell/Nav.js';
import { Shell } from '../../../web/src/shell/Shell.js';

const HERE = dirname(fileURLToPath(import.meta.url));
// server/test/architecture -> repository root
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const WEB_SRC = join(REPO_ROOT, 'web', 'src');
const SERVER_SRC = join(REPO_ROOT, 'server', 'src');

/** Recursively list every source file under `root`. */
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

// ─────────────────────────────────────────────────────────────────────────────
// 1 & 2. The navigation set is exactly two, in data and in the rendered DOM.
// ─────────────────────────────────────────────────────────────────────────────

describe('navigation — exactly two destinations (FR-2.7, §8.3, criterion 5)', () => {
  it('NAV_ITEMS has exactly the two §2 destinations and nothing else', () => {
    // UX 00-overview §2 names precisely these two destinations. A third does not
    // exist — not disabled, not hidden: absent.
    expect(NAV_ITEMS.length).toBe(2);
    expect(NAV_ITEMS.map((i) => ({ to: i.to, label: i.label }))).toEqual([
      { to: '/queue', label: 'Review queue' },
      { to: '/entries/new', label: 'New cargo entry' },
    ]);
  });

  it('the rendered <nav aria-label="Primary"> contains exactly two anchors', () => {
    // FR-2.7 binds on the DOM, and §8.3 lists this exact assertion. Data and DOM
    // must agree: Nav renders NAV_ITEMS.map(...), so a third item added anywhere
    // would show here as a third anchor.
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(Nav)),
    );
    const navMarkup = extractNavPrimary(html);
    expect(navMarkup).not.toBeNull();
    const anchors = (navMarkup as string).match(/<a\s/g) ?? [];
    expect(
      anchors.length,
      'The primary navigation must render exactly two anchors (FR-2.7, §8.3). ' +
        'A third destination is a scope expansion PRD §10 forbids.',
    ).toBe(2);
  });
});

/** Return the substring inside <nav aria-label="Primary"> … </nav>, or null. */
function extractNavPrimary(html: string): string | null {
  const open = html.indexOf('<nav aria-label="Primary"');
  if (open === -1) return null;
  const close = html.indexOf('</nav>', open);
  if (close === -1) return null;
  return html.slice(open, close + '</nav>'.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. The UI route table is exactly the seven of §3.17.
// ─────────────────────────────────────────────────────────────────────────────

describe('navigation — the router registers exactly the seven §3.17 routes', () => {
  it('web/src/app/router.tsx declares exactly the seven §3.17 path patterns', () => {
    // §3.17: "There is no dashboard route, no reports route, no settings route,
    // no admin route, no user-management route, no closed-case browse route, and
    // no search route." We read the registered `path:` literals from the router
    // source and assert the SET is exactly the seven expected.
    const routerSrc = stripComments(
      readFileSync(join(WEB_SRC, 'app', 'router.tsx'), 'utf8'),
    );
    const registered = new Set<string>();
    for (const m of routerSrc.matchAll(/\bpath:\s*'([^']*)'/g)) {
      registered.add(m[1] as string);
    }
    const expected = [
      '/sign-in',
      '/',
      '/queue',
      '/entries/new',
      '/cases/:caseReference',
      '/cases/:caseReference/audit',
      '*',
    ].sort();
    expect([...registered].sort()).toEqual(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. No excluded affordance exists anywhere in the UI.
//
// The durable implementation of plan 02-05's <excluded_affordance_scan>. Keep
// this and that block identical. We scan AFFORDANCES — reachable destinations
// and operable controls — NOT source tokens: `export` is in every module,
// `filter`/`sort` are Array methods, and `report` is a substring of `reporter`.
// A gate that cannot pass on a conformant tree gets weakened by whoever hits it,
// and this is the one assertion standing against PRD R-2's named scope risk.
// ─────────────────────────────────────────────────────────────────────────────

// Terms (case-insensitive; word-boundary where the word is also ordinary English
// so `\breports?\b` does NOT match `reporter`). Each maps to a PRD §10 exclusion.
const EXCLUDED_TERMS: Array<{ re: RegExp; exclusion: string }> = [
  { re: /dashboard/i, exclusion: 'PRD §10 #2 — no dashboard' },
  { re: /\breports?\b/i, exclusion: 'PRD §10 #5 — no reporting surface' },
  { re: /\bmetrics?\b/i, exclusion: 'PRD §10 #5 — no metrics surface' },
  { re: /analytics/i, exclusion: 'PRD §10 #5 — no analytics' },
  { re: /settings/i, exclusion: 'PRD §10 #4 — no settings' },
  { re: /preferences/i, exclusion: 'PRD §10 #4 — no preferences' },
  { re: /\badmin(istration)?\b/i, exclusion: 'PRD §10 #3 — no administration' },
  { re: /user management/i, exclusion: 'PRD §10 #3 — no user management' },
  { re: /\bexport\b/i, exclusion: 'PRD §10 — no export capability' },
  { re: /download/i, exclusion: 'PRD §10 — no export/download capability' },
  { re: /\bsearch\b/i, exclusion: 'PRD §10 — no search surface' },
  { re: /\bfilter\b/i, exclusion: 'PRD §10 — no filter affordance' },
  { re: /sort by/i, exclusion: 'PRD §10 — no sort affordance' },
  { re: /assign/i, exclusion: 'PRD §10 — no queue-management/assignment surface' },
  { re: /priority/i, exclusion: 'PRD §10 — no queue-management/priority surface' },
];

/** Test one candidate string against every excluded term; return the offence. */
function findExcluded(value: string): { term: string; exclusion: string } | null {
  for (const { re, exclusion } of EXCLUDED_TERMS) {
    if (re.test(value)) {
      return { term: re.source, exclusion };
    }
  }
  return null;
}

describe('navigation — no excluded affordance in any UI destination or control', () => {
  it('4a. no router/nav destination is an excluded affordance', () => {
    // Surface (a): the values of `to`, `href` and `path` across web/src, in BOTH
    // the JSX-attribute form (href="…") and the object-literal form ({ to: '…' },
    // { path: '…' }). We extract the VALUES first, then test the values — an
    // attribute-only scan would miss a `{ to: '/dashboard' }` in navItems.ts,
    // which is a .ts file, verified against a planted third nav item.
    const offenders: string[] = [];
    for (const file of walk(WEB_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const values: string[] = [];
      // object-literal: to:/path:/href: '…' or "…"
      for (const m of src.matchAll(/\b(?:to|path|href)\s*:\s*['"]([^'"]*)['"]/g)) {
        values.push(m[1] as string);
      }
      // JSX attribute: href="…" / to="…" / path="…"
      for (const m of src.matchAll(/\b(?:to|path|href)=["']([^"']*)["']/g)) {
        values.push(m[1] as string);
      }
      for (const v of values) {
        const hit = findExcluded(v);
        if (hit !== null) {
          offenders.push(
            `${relative(REPO_ROOT, file)}: destination "${v}" matches /${hit.term}/ (${hit.exclusion})`,
          );
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('4b. no NAV_ITEMS label is an excluded affordance', () => {
    // Surface (b): the visible labels of the primary navigation.
    const offenders: string[] = [];
    for (const item of NAV_ITEMS) {
      const hit = findExcluded(item.label);
      if (hit !== null) {
        offenders.push(`NAV_ITEMS label "${item.label}" matches /${hit.term}/ (${hit.exclusion})`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('4c. no rendered <Shell> link/button name outside the footer is an excluded affordance', () => {
    // Surface (c): the text and aria-label of <a>/<button> in the rendered Shell,
    // EXCLUDING the footer[role="contentinfo"] subtree (see 4d for why, and its
    // pinned link set). We render the authenticated shell with a stub specialist
    // so the header shows the nav and the "Sign out" control.
    const specialist = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'reviewer@cbp.example.gov',
      display_name: 'Test Specialist',
    } as unknown as import('@cargoexec/contract').SpecialistDto;

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(Shell, {
          reduced: false,
          specialist,
          onSignOut: () => undefined,
          children: createElement('div', null, 'content'),
        }),
      ),
    );

    const scanned = stripFooterSubtree(html);
    const offenders: string[] = [];
    for (const name of interactiveNames(scanned)) {
      const hit = findExcluded(name);
      if (hit !== null) {
        offenders.push(`rendered control "${name}" matches /${hit.term}/ (${hit.exclusion})`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('4d. the footer link set equals the list pinned in Footer.tsx (exemption is auditable)', () => {
    // The footer is EXCLUDED from the affordance scan because the USWDS
    // usa-identifier required-links row is federal conformance markup whose link
    // set is fixed by USWDS and includes the statutory "Performance reports" link
    // — NOT a product reporting surface (PRD §10 #5 excludes the latter). To keep
    // that exemption auditable rather than a blind spot, Footer.tsx pins the link
    // set as data; we assert the RENDERED footer links equal exactly that pinned
    // list, so the exemption cannot be used to smuggle in an eighth link.
    const PINNED_FOOTER_LINKS = [
      'About CBP',
      'Accessibility statement',
      'FOIA requests',
      'No FEAR Act data',
      'Office of the Inspector General',
      'Performance reports',
      'Privacy policy',
    ];

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(Shell, {
          reduced: true,
        }),
      ),
    );
    const footer = extractFooterSubtree(html);
    expect(footer).not.toBeNull();
    // Only the anchor TEXT — not the aria-labels of the identifier's landmark
    // wrappers ("Agency identifier", "Important links"), which are structural
    // markup, not links.
    const links = anchorTexts(footer as string).sort();
    expect(links).toEqual([...PINNED_FOOTER_LINKS].sort());
  });
});

/** Remove the usa-identifier / footer subtree from the markup before scanning. */
function stripFooterSubtree(html: string): string {
  // The Footer renders <footer role="contentinfo">…</footer> followed by
  // <div class="usa-identifier">…</div>. Both are federal conformance markup and
  // both are exempt; remove from the <footer …> open tag to end of document.
  const footerOpen = html.indexOf('<footer');
  if (footerOpen === -1) return html;
  return html.slice(0, footerOpen);
}

/** Return the footer + usa-identifier subtree, or null. */
function extractFooterSubtree(html: string): string | null {
  const footerOpen = html.indexOf('<footer');
  if (footerOpen === -1) return null;
  return html.slice(footerOpen);
}

/** Extract the accessible names (text + aria-label) of <a> and <button> tags. */
function interactiveNames(html: string): string[] {
  const names: string[] = [];
  // aria-label values on any element
  for (const m of html.matchAll(/aria-label=["']([^"']*)["']/g)) {
    names.push(m[1] as string);
  }
  // visible text inside <a>…</a> and <button>…</button>, tags stripped
  for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
    names.push(stripTags(m[1] as string));
  }
  for (const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) {
    names.push(stripTags(m[1] as string));
  }
  return names.map((n) => n.trim()).filter((n) => n.length > 0);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/** Extract only the visible text of <a>…</a> tags (no aria-labels). */
function anchorTexts(html: string): string[] {
  const names: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
    names.push(stripTags(m[1] as string).trim());
  }
  return names.filter((n) => n.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. One role, no permission model (F1 FR-1.1, PRD §10 #3).
// ─────────────────────────────────────────────────────────────────────────────

describe('navigation — no application role/permission/scope model anywhere (F1 FR-1.1)', () => {
  // Program identifiers that would betray a permission model. We match them as
  // IDENTIFIERS (property access, declaration or object key), not as prose, so a
  // comment or a docstring cannot trip the gate.
  const RBAC_IDENTIFIERS = [
    'roles',
    'is_supervisor',
    'isSupervisor',
    'permission',
    'permissions',
    'rbac',
    'hasRole',
    'isAdmin',
  ];

  // Standalone `role`/`scope` need care because of required markup and DB roles;
  // handled with dedicated exclusions below.
  it('finds no RBAC identifier in server/src or web/src', () => {
    const offenders: string[] = [];
    for (const root of [SERVER_SRC, WEB_SRC]) {
      for (const file of walk(root)) {
        const src = stripComments(readFileSync(file, 'utf8'));
        for (const id of RBAC_IDENTIFIERS) {
          // as a declaration, property access, or object key
          const re = new RegExp(
            `(?:\\.|\\b(?:const|let|var|function|class)\\s+|['"\`]?\\b)${id}\\b\\s*[:=(.]`,
          );
          // simpler robust check: the identifier used with a following : = ( . or as .id
          const used = new RegExp(`(?:\\.${id}\\b|\\b${id}\\s*[:=])`);
          void re;
          if (used.test(src)) {
            offenders.push(`${relative(REPO_ROOT, file)}: uses identifier "${id}"`);
          }
        }
      }
    }
    expect(
      offenders,
      'Authorisation in CargoExec is BINARY: a request either carries a valid ' +
        'session or it does not (F1 FR-1.1, PRD §10 #3). No role, permission or ' +
        'scope model may exist.\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });

  it('finds no application `role` identifier (ARIA role= and PG role names excluded)', () => {
    // Documented exclusions, extended deliberately by later phases, never weakened:
    //  - the ARIA `role=` attribute — required markup;
    //  - the HTML `scope=` attribute (scope="col"/scope="row") — required markup
    //    on a data table's header cells; F8's review-queue table lands in Phase 4
    //    and cannot pass without it, so it is excluded now WITH THE REASON rather
    //    than having Phase 4 discover the collision and relax the assertion;
    //  - the three database role names cargoexec_owner / cargoexec_app /
    //    cargoexec_ai — PostgreSQL roles, not application roles (migration 0008);
    //  - comments (already stripped).
    const PG_ROLE_NAMES = /cargoexec_(owner|app|ai)/;
    const offenders: string[] = [];
    for (const root of [SERVER_SRC, WEB_SRC]) {
      for (const file of walk(root)) {
        const src = stripComments(readFileSync(file, 'utf8'));
        // Application `role` as a property access or object key: `.role`,
        // `role:` — but NOT the JSX/HTML attribute `role=` (required ARIA markup),
        // and NOT `role="..."` inside a SQL string naming a PG role.
        for (const m of src.matchAll(/(?:\.role\b|\brole\s*:)/g)) {
          const idx = m.index ?? 0;
          const context = src.slice(Math.max(0, idx - 40), idx + 40);
          if (PG_ROLE_NAMES.test(context)) continue; // PG role name in SQL
          offenders.push(
            `${relative(REPO_ROOT, file)}: application "role" identifier near "${context.trim()}"`,
          );
        }
        // A `scope` identifier used as a program value (not the HTML scope= attr).
        for (const m of src.matchAll(/(?:\.scope\b|\bscope\s*:)/g)) {
          const idx = m.index ?? 0;
          const context = src.slice(Math.max(0, idx - 20), idx + 20);
          offenders.push(
            `${relative(REPO_ROOT, file)}: "scope" identifier near "${context.trim()}"`,
          );
        }
      }
    }
    expect(
      offenders,
      'No application role or scope identifier may exist; authorisation is binary ' +
        '(F1 FR-1.1). ARIA role=, the HTML scope= attribute, and the three PG role ' +
        'names are the documented exclusions.\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 & 7. No supervisory affordance in the shell; the reduced shell has no nav.
// ─────────────────────────────────────────────────────────────────────────────

describe('navigation — no second-role affordance; reduced shell has no navigation', () => {
  it('6. the authenticated shell contains no supervisory affordance', () => {
    const specialist = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'reviewer@cbp.example.gov',
      display_name: 'Test Specialist',
    } as unknown as import('@cargoexec/contract').SpecialistDto;

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(Shell, {
          reduced: false,
          specialist,
          onSignOut: () => undefined,
          children: createElement('div', null, 'content'),
        }),
      ),
    );
    expect(
      /supervisor|approver|reviewer queue|team|workload|throughput|SLA/i.test(html),
      'The shell must offer no supervisory, team, workload or SLA affordance — ' +
        'there is one role (F1 FR-1.1).',
    ).toBe(false);
  });

  it('7. the reduced (/sign-in) shell renders no primary nav and no sign-out control', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(Shell, { reduced: true }),
      ),
    );
    expect(html.includes('aria-label="Primary"')).toBe(false);
    expect(/>\s*Sign out\s*</.test(html)).toBe(false);
  });
});
