---
phase: 7
status: issues_found
blockers: 0
warnings: 2
files_reviewed: 39
files_reviewed_list:
  - .env.example
  - docker-compose.yml
  - e2e/audit-trail.spec.ts
  - e2e/case-detail.spec.ts
  - e2e/decision.spec.ts
  - e2e/global-setup.ts
  - e2e/queue.spec.ts
  - e2e/shell.spec.ts
  - e2e/sign-in.spec.ts
  - e2e/whole-loop.spec.ts
  - package.json
  - server/src/cli/seed-demo-case.ts
  - server/test/api/guard.spec.ts
  - server/test/architecture/absence.spec.ts
  - server/test/architecture/validation.spec.ts
  - web/assets/img/us_flag_small.png
  - web/index.html
  - web/scripts/copy-carbon-assets.mjs
  - web/scripts/copy-uswds-assets.mjs
  - web/src/components/AuditTrailRegion.tsx
  - web/src/components/DecisionPanel.tsx
  - web/src/components/ErrorSummary.tsx
  - web/src/components/ProvenanceBadge.tsx
  - web/src/components/UswdsForm.tsx
  - web/src/components/states.tsx
  - web/src/screens/CaseDetail.tsx
  - web/src/screens/NotBuiltYet.tsx
  - web/src/screens/NotFound.tsx
  - web/src/screens/Queue.tsx
  - web/src/screens/SignIn.tsx
  - web/src/shell/Banner.tsx
  - web/src/shell/Footer.tsx
  - web/src/shell/Header.tsx
  - web/src/shell/LiveRegions.tsx
  - web/src/shell/Nav.tsx
  - web/src/shell/Shell.tsx
  - web/src/shell/SkipLink.tsx
  - web/styles/_shell.scss
  - web/styles/app.scss
reviewed_at: 2026-09-17T03:03:33Z
iteration: 1
---

# Phase 7 Code Review

Phase 7 does two things: (1) rebuilds all 18 USWDS-coupled `.tsx` files on Carbon
and removes USWDS from the tree entirely, and (2) adds the F15 seed-demo-case CLI
plus the "real LLM required, no silent fake default" config posture.

The seed CLI, the config/compose posture change, the e2e-setup interpolation fix,
and the architecture-test scoped exceptions are all correct and well-integrated —
I traced every server-side service/repository signature the seed calls and every
contract type the migrated components consume, and found no signature or
integration drift. No BLOCKERs survived refutation.

Two WARNINGs, both a single root cause: the USWDS removal deleted the stylesheet
that defined the page-content-container layout classes, but the components that
emit those class names were left unchanged, so the classes are now undefined in
the shipped CSS.

## BLOCKERs

None.

## WARNINGs

### W1: Main content container class `.grid-container` is undefined after USWDS removal — every screen renders full-bleed with no max-width, centering, or gutters
- **File:** web/src/shell/Shell.tsx:58 (emitter); web/styles/app.scss (missing rule); web/public/assets/app.css (compiled)
- **Category:** bug (layout regression)
- **Evidence:** `Shell.tsx` wraps the routing outlet in `<div className="grid-container">`. This class was previously supplied by USWDS's bundle (old `app.scss` did `@forward "uswds"`, which ships `.grid-container` with a `max-width`/auto-margin/gutter treatment). Plan 07-11 replaced the entry point with `@use "@carbon/styles"` + `@use "shell"` and did NOT re-add a `.grid-container` rule, but left the `Shell.tsx` wrapper untouched. Verified against the freshly-compiled 1 MB `web/public/assets/app.css`: `grep -c "\.grid-container"` → **0**. Carbon's grid class is `cds--grid`, not `grid-container`, so nothing back-fills it. Net effect: on every page the `<main>` content spans the full viewport width with no reading-width cap and no side gutters — a real degradation of the redesign's read-heavy screens (queue table, case detail, audit trail), not merely a taste issue. It is NOT a functional break: all content renders, is reachable, and the shell's own reflow guard (`_shell.scss`, footer/identifier) is intact, so no horizontal-scroll bug is introduced. The 07-11 SUMMARY's `## Known Stubs` says "None found" — this regression was not disclosed, and the gate suites are DOM/a11y-oriented and styling-blind, so it slipped the green gate.
- **Fix direction:** Either add a project-owned content-container rule (a `max-inline-size` + auto inline margins + Carbon-token side padding) keyed on the wrapper, or switch the wrapper to Carbon's own layout (`cds--grid`/`Grid`), or drop the now-meaningless `grid-container` class and style `#main-content`. Style only — no component-behaviour change.
- **Resolution:** fixed (7def176) — defined a project-owned `.grid-container` rule in `web/styles/app.scss` (`max-inline-size: 80rem`, `margin-inline: auto`, Carbon-spacing side/block padding), style-only, Shell.tsx wrapper untouched. Verified: `build:css` clean, compiled `web/public/assets/app.css` `grep -c "grid-container"` → **1** (was 0).

### W2: The prose-container wrapper classes `.cargoexec-prose` and `.cds--content-prose` are also undefined in the shipped CSS
- **File:** web/src/screens/CaseDetail.tsx:229, web/src/screens/Queue.tsx:93, web/src/components/states.tsx:62, web/src/screens/NotBuiltYet.tsx:50, web/src/screens/NotFound.tsx:20
- **Category:** bug (layout regression)
- **Evidence:** Same root cause as W1. `CaseDetail`, `states.Empty`, `NotBuiltYet`, and `NotFound` render their content inside `<div className="cargoexec-prose">`; `Queue` uses `<div className="cds--content-prose">`. Verified against compiled `app.css`: `grep -c "cargoexec-prose"` → **0** and `grep -c "content-prose"` → **0**. `cds--content-prose` is not a real Carbon class (Carbon ships `cds--content`, not `cds--content-prose`), so it was never going to resolve. Carbon components inside these wrappers still carry their own typography from `@carbon/styles`, so text is legible — the loss is any wrapper-level prose max-width/spacing the class was meant to provide. Lower-impact than W1 (individual `cargoexec-*` composition classes ARE defined and applied — `cargoexec-detail-list`, `cargoexec-in-page-nav`, `cargoexec-decision-actions`, `cargoexec-provenance-badge` all present in the built CSS), but it is the same undisclosed "class emitted, rule missing" defect and should be resolved together with W1.
- **Fix direction:** Define `.cargoexec-prose` (and either define or replace `.cds--content-prose` with `.cargoexec-prose`/`cds--content`) in `web/styles/app.scss` using Carbon tokens, OR remove the dead class names from the components if the wrapper carries no intended styling. Keep Queue and CaseDetail on the SAME resolved class so the two screens do not diverge.
- **Resolution:** fixed (2b42397) — defined a project-owned `.cargoexec-prose` rule in `web/styles/app.scss` (`max-inline-size: 42rem` reading-width cap + `> * + *` Carbon-spacing vertical rhythm), and replaced Queue's non-existent `.cds--content-prose` with `.cargoexec-prose` (`Queue.tsx:93`) so Queue and CaseDetail share the SAME resolved class. Style-only, no component behaviour change. Verified: `build:css` clean, `tsc -p web --noEmit` clean, compiled `app.css` `grep -c "cargoexec-prose"` → **2** (was 0) and `grep -c "content-prose"` → **0** (dead class gone).

## Observations (not findings — out of scope or defensive-by-design)

- `docker-compose.yml` makes `AI_PROVIDER_URL` a mandatory no-default variable (the phase's point), but `AI_MODEL_ID` keeps `${AI_MODEL_ID:-demo-fake-model}`. An operator who sets a real `AI_PROVIDER_URL` but forgets `AI_MODEL_ID` would boot against a real provider with model id `demo-fake-model` (config.ts only checks non-empty, not correctness). This is operator-configuration hygiene, arguably out of the v1 review scope and mitigated by `07-USER-SETUP.md`; noting, not filing.
- `Queue.tsx:215` guards `row.case_reference` though the contract types it non-nullable, and `MissingReference` warns+renders plain text — correct defensive handling, not a defect.

## Cross-file seams checked
- seed-demo-case.ts → receiveEntry / recordDecision / runGenerationJob / createSpecialist signatures — OK (all four match; EDIT_APPROVE exact-field-set requirement satisfied by mapping all proposed values; suffix guarantees ≥1 HUMAN value; `<2` guard prevents a degenerate single-value case).
- seed-demo-case.ts → repositories (findSpecialistByEmail, findCaseReferenceByEntryNumber, resolveCaseIdentifier, loadRecommendationByException, loadRecommendationValues, loadDecisionByException) — OK (return shapes/nullability consumed correctly).
- seed-demo-case.ts direct-invoke guard (`import.meta.url === file://${process.argv[1]}`) — OK (identical to create-specialist.ts; correct on Linux abs paths).
- package.json `seed:demo-case` → `server/dist/cli/seed-demo-case.js` — OK.
- DecisionPanel / CaseDetail / AuditTrailRegion / SignIn / Queue → @cargoexec/contract DTOs (DecisionCreateRequest, DecisionRecordResponse, EntryValues total map, QueueResponse.returned_count/truncated, RowSummaryDto, ERROR_MESSAGES/ErrorCode, ApiClientError.details) — OK (all fields exist and match usage; EntryValues is a total map so `submitted === null` addition-detection is correct).
- copy-carbon-assets.mjs → app.scss `$font-path: "/assets/fonts/plex"` → node_modules/@ibm/plex family dirs (`IBM-Plex-Sans/fonts/split`) — OK (directory structure verified on disk; compiled `@font-face` paths resolve same-origin; no CDN).
- index.html linked `<link rel="stylesheet" href="/assets/app.css">` → build:css output — OK.
- Shell/Header/Nav/Banner/Footer landmark roles (banner/contentinfo/nav/note) and skip-link `#main-content` target — OK.
- e2e/global-setup.ts passes `AI_PROVIDER_URL=E2E_ENV.AI_PROVIDER_URL` into compose to satisfy the new mandatory-variable interpolation for `docker compose up -d db` — OK (E2E_ENV.AI_PROVIDER_URL exists, defaults to fake:deterministic).
- guard.spec.ts / architecture absence.spec.ts / validation.spec.ts test edits — OK (asset path renamed uswds.css→app.css; new one-seed-file scans use the correct per-file `walk` signatures — `walk(root)` in absence.spec with default skip-set, `walk(root, () => true)` in validation.spec with match-fn; scoped exception documented, general seed/fixture bans untouched).
- Removed `web/scripts/copy-uswds-assets.mjs` and `@uswds/uswds` — OK (no dangling references except in comments; no `usa-*` rule in built CSS).
- `.grid-container` / `.cargoexec-prose` / `.cds--content-prose` content containers ↔ compiled CSS — see W1/W2.
