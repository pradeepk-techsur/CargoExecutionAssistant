---
phase: 02-identity-and-the-federal-ui-foundation
plan: 09
subsystem: testing
tags: [architecture-tests, accessibility, uswds, csp, scope-discipline, vitest, playwright]

requires:
  - phase: 02-identity-and-the-federal-ui-foundation
    provides: "the shell + sign-in screen to assert against and review (02-07), the running compose stack the walkthrough is performed on (02-08), NAV_ITEMS (02-05), API_ROUTE_TABLE (02-04), securityHeaders/loadConfig (02-02/02-01)"
provides:
  - "server/test/architecture/navigation.spec.ts — criterion 5 as a build constraint: exactly two nav items (data + rendered), exactly the seven §3.17 routes, no excluded affordance in any destination/label/rendered control outside the pinned footer, no application role/permission/scope identifier in server/src or web/src"
  - "server/test/architecture/headers.spec.ts — deviation D-1 as a build constraint: behavioural + source proof that no X-Frame-Options / COEP is emitted and frame-ancestors is never 'none'/bare 'self', across three cookie-profile/origin configs; loadConfig refusals; no dangerouslySetInnerHTML; no template-literal SQL"
  - "absence.spec.ts extended: forbidden-dependency gate now covers web/package.json and self-checks it covers the root workspaces array; persistent no-raw-hex/px gate over web/src/**/*.tsx; no html report / reports outputDir; no CDN host under web/"
  - "docs/uswds-conformance-register.md — the §7.3 control→USWDS map, append-only across phases"
  - "docs/a11y/shell.md and docs/a11y/sign-in.md — the signed §7.7 review records incl. the AT walkthrough"
affects: [every-later-ui-phase, phase-3, phase-4, phase-5, phase-6]

tech-stack:
  added: []
  patterns:
    - "Cross-workspace render assertion in the architecture suite: server/test/** imports web/src components and renders them with react-dom/server; safe under npm run typecheck because server/tsconfig.json include is ['src'] so tsc -b never sees test/, and vitest transforms the .tsx imports via esbuild (jsx: automatic). Kept JSX-free with createElement so the file is literally navigation.spec.ts."
    - "Affordance scan (not source-token scan): criterion 5 tests DESTINATIONS (to/href/path, both object-literal and JSX forms), NAV_ITEMS labels, and rendered link/button names — never raw source tokens — so export/Array#filter/Array#sort/reporter cannot trip it."
    - "Documented, extend-never-weaken exclusions: PG role names and ARIA role=/HTML scope= for the RBAC scan; tx.ts SET LOCAL and writer.ts bulk-insert placeholder scaffold for the template-literal-SQL scan; the federal footer for the affordance scan (its link set pinned and asserted equal)."
    - "The §7.7 signed review record is the sole accessibility enforcement mechanism (no CI gate, by design): machine-settleable checklist lines pre-filled and annotated with the proving test; human-only lines settled at a countersigned checkpoint."

key-files:
  created:
    - server/test/architecture/navigation.spec.ts
    - server/test/architecture/headers.spec.ts
    - docs/uswds-conformance-register.md
    - docs/a11y/shell.md
    - docs/a11y/sign-in.md
  modified:
    - server/test/architecture/absence.spec.ts

key-decisions:
  - "navigation.spec.ts is a .ts file that renders via createElement (no JSX) so it keeps the plan's exact filename while importing web/src .tsx components; the cross-workspace import is typecheck-safe because server/tsconfig excludes test/."
  - "The template-literal-SQL gate targets the INJECTION threat (caller data in query text), not the mere presence of a template literal; tx.ts's SET LOCAL statement_timeout (validated integer, session setting, no bind form) and writer.ts's multi-row INSERT placeholder scaffold (values go through the params bind array) are documented exclusions, not weakenings."
  - "The no-raw-hex/px screen-style gate excludes the whole web/styles/ tree (USWDS $theme-* settings live in web/styles/app.scss, not the plan's named web/styles/uswds.scss — a naming deviation recorded below)."
  - "The two signed a11y records name Pradeep K as reviewer (2026-09-15), captured at the checkpoint; no reviewer name, date or walkthrough outcome was fabricated."

patterns-established:
  - "Absence verified, not remembered: PRD §10 exclusions and deviation D-1 are now build constraints re-run by every later phase."
  - "The forbidden-dependency gate is workspace-complete and self-guarding: it covers every entry of the root workspaces array and fails if a new workspace is added without being registered."

duration: 22 min
completed: 2026-09-15
---

# Phase 2 Plan 09: Exclusion & Accessibility as Artefacts Summary

**Criterion 5 (scope exclusion) and criterion 4 (accessibility) turned from intentions into artefacts: two new architecture specs that fail the build on a third nav item, an excluded affordance, an RBAC identifier or any frame-blocking header; an extended absence gate that now covers the `web` workspace; and two signed §7.7 accessibility review records plus the USWDS conformance register.**

## Performance

- **Duration:** ~22 min
- **Completed:** 2026-09-15
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files created:** 5 · **modified:** 1

## Accomplishments

- **`navigation.spec.ts`** makes phase criterion 5 executable: `NAV_ITEMS` and the rendered `<nav aria-label="Primary">` both assert exactly two destinations; the router registers exactly the seven §3.17 routes; the durable affordance scan (destinations, nav labels, rendered Shell link/button names, footer excluded but its link set pinned-and-asserted) rejects any excluded surface; and no application role/permission/scope/RBAC identifier exists in `server/src` or `web/src`. Proven red on a planted third nav item, green on the conformant tree.
- **`headers.spec.ts`** makes deviation D-1 executable both ways: behaviourally over every `API_ROUTE_TABLE` path and the SPA document paths under all three cookie-profile/origin configurations (no `X-Frame-Options`, no COEP, correct `frame-ancestors` behaviour, `no-store`+`X-Request-Id` on every `/api`), and by source scan (`frameguard: false`, `loadConfig` refusals, no `dangerouslySetInnerHTML`, no template-literal SQL).
- **`absence.spec.ts`** extended so the forbidden-dependency gate finally covers `web/package.json` (proven: a planted `axe-core` in `web` now fails the build), with a self-guard that `PKG_PATHS` covers every root workspace; plus persistent gates for raw hex/px in screens, a Playwright html/report artefact, and any CDN host under `web/`. Nothing weakened.
- **The USWDS conformance register and two signed accessibility records** were drafted from evidence, then countersigned at the checkpoint (reviewer **Pradeep K**, 2026-09-15, no defects), including the assistive-technology walkthrough that a machine cannot perform.

## Task Commits

1. **Task 1: navigation.spec — exclusion criterion** — `b16fc16` (test)
2. **Task 2: headers.spec + extended absence** — `dbb4e95` (test)
3. **Task 3: register + signed a11y reviews (checkpoint)** — `d1ccc22` (docs)

## Files Created/Modified

- `server/test/architecture/navigation.spec.ts` — criterion-5 assertions (11 tests)
- `server/test/architecture/headers.spec.ts` — D-1 header assertions (48 tests)
- `server/test/architecture/absence.spec.ts` — extended: web workspace coverage + 3 new gates (53 tests, was 49)
- `docs/uswds-conformance-register.md` — §7.3 control→USWDS map
- `docs/a11y/shell.md` — signed §7.7 review record for the shell
- `docs/a11y/sign-in.md` — signed §7.7 review record for sign-in

## Decisions Made

See `key-decisions` in frontmatter. In brief: `.ts` + `createElement` to keep the plan's exact filename while importing `.tsx`; template-literal-SQL gate targets the injection threat with two audited exclusions; `web/styles/` excluded wholesale from the hex/px gate; reviewer details captured, never fabricated.

## Deviations from Plan

### Auto-fixed / adaptations (no code changed; test-only + docs plan)

**1. [Rule 3 - Blocking] `--reporter=list` is unsupported by this vitest version**
- **Found during:** Task 1 verification
- **Issue:** `npx vitest run … --reporter=list` fails at startup ("Failed to load custom Reporter from list") — vitest 2.1.5 does not accept `list` as a reporter name.
- **Fix:** used the default reporter for vitest runs; `--reporter=list` is still used for `npx playwright test`, where it is valid.
- **Files modified:** none (invocation only).

**2. [Rule 1 - Bug] template-literal-SQL scan false positives on conformant bulk SQL**
- **Found during:** Task 2 verification
- **Issue:** a naive "any `.query(` template literal containing `${`" flagged `server/src/db/tx.ts` (`SET LOCAL statement_timeout = '${n}ms'`, a validated integer into a session setting that cannot take a bind param) and `server/src/services/audit/writer.ts` (a multi-row INSERT whose `${tuples.join(',')}` builds only `($1,$2,…)` placeholder scaffolding — every value goes through the `params` bind array). Neither carries caller data; neither is R-L8's injection threat.
- **Fix:** the gate targets caller-data injection and documents both as excluded, WITH the reason, in the assertion — extend-never-weaken, matching the RBAC/footer exclusion style.
- **Files modified:** server/test/architecture/headers.spec.ts (the assertion + its comment).

**3. [Documentation] the plan named `web/styles/uswds.scss`; the actual settings file is `web/styles/app.scss`**
- **Found during:** Task 2
- **Issue:** the plan told the hex/px gate to exclude `web/styles/uswds.scss`, which does not exist.
- **Fix:** the gate excludes the whole `web/styles/` tree (broader and correct — USWDS `$theme-*` settings legitimately carry hex/px there), recorded in the spec comment.
- **Files modified:** server/test/architecture/absence.spec.ts (comment).

**4. [Contract-path note] some integration-contract paths were nominal, not literal**
- The plan's `key_links` referenced e.g. `server/src/http/routes/index.ts` and imports like `../../../web/src/shell/navItems.js`; the real exports resolve at those symbols (`API_ROUTE_TABLE`, `NAV_ITEMS`, `securityHeaders`) and all five `integration_contracts.requires` verifies pass. No change needed.

---

**Total deviations:** 2 substantive (1 blocking invocation fix, 1 gate-correctness exclusion) + 2 documentation. **Impact:** none on scope — both exclusions are audited and carry no caller data; the reporter change is cosmetic. No production code was modified in this plan.

## Known Stubs

None found. The a11y records and register carry no placeholders (no "to be supplied", no blank sign-off lines, no `[OPEN]` checklist lines remaining after sign-off).

## Authentication Gates

None.

## Issues Encountered

None beyond the deviations above. The checkpoint returned only the option label on the first two attempts (no typed free text); the reviewer name was captured on a follow-up question ("Pradeep K") rather than fabricated.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

- **Phase 2 is complete: all nine plans have SUMMARY records.** Its five criteria are now evidenced — criterion 5 (exclusion) and criterion 4 (accessibility) closed here; criteria 1/3 by the 02-06 governance suites; criterion 2 remains **partially** evidenced (see below).
- **Carry-forward (unchanged by this plan):** criterion 2's "all ten §3.1 pairs answer 401 unauthenticated" is only partial — 02-04 ships no API auth gate, so only `GET /api/session` answers 401. Fix belongs in the owning module (02-04): add `requireApiAuth` after `sessionMiddleware`, before `csrfMiddleware`. This plan asserted the *shipped* behaviour honestly (guard.spec) rather than restructure the chain from a test-only plan.
- **For every later UI phase:** append control rows to `docs/uswds-conformance-register.md`, add a signed `docs/a11y/{screen}.md` record, and let the criterion-5 assertions grow as new screens land. The forbidden-dependency gate now covers `web/` and self-guards new workspaces; the allowlist-equality assertion is deferred to Phase 5.

## Self-Check: PASSED

- All 5 created files + SUMMARY present on disk.
- All 3 task commits present (`b16fc16`, `dbb4e95`, `d1ccc22`).
- Plan-level build ran: `npm run build` → exit 0. `npm run typecheck` → exit 0.
- Full test suite: `npm run test` → exit 0 (unit 111 / db 114 / api 75 / arch 130, 0 skipped); `npx playwright test` → 29 passed, 0 skipped.
- `## Known Stubs` present — none found (no blocking stubs).

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-15*
