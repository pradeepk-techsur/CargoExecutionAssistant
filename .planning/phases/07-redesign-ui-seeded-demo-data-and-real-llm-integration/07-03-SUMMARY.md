---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 03
subsystem: ui
tags: [uswds, sass, design-tokens, css-custom-properties, accessibility, csp]

# Dependency graph
requires:
  - phase: 02-identity-and-the-federal-ui-foundation
    provides: USWDS 3.11.0 Sass entry point (web/styles/app.scss), self-hosted asset pipeline (copy-uswds-assets.mjs), and the CSP style-src 'self' constraint (server/src/http/headers.ts)
provides:
  - "docs/uswds-coupling-audit.md — complete USWDS-coupling inventory (18 coupled .tsx files, Sass entry point, asset pipeline, CSP constraint)"
  - "web/styles/_tokens.scss — design-token abstraction seam: eight --cargoexec-* CSS custom properties at :root, computed from USWDS's own current theme"
affects: [future visual-redesign phase, F2, F15 seed arch guards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Design-token seam: CSS custom properties (--cargoexec-*) computed from USWDS core's public color()/units()/family() functions — no hand-typed values"
    - "A partial that @use()s the already-configured uswds-core instance (never re-configuring it) to reach the same theme without deadlock"

key-files:
  created:
    - docs/uswds-coupling-audit.md
    - web/styles/_tokens.scss
  modified:
    - web/styles/app.scss

key-decisions:
  - "Phase 7 F2 reduced to INFRASTRUCTURE-ONLY: the approved design (claude.ai/design link) is 403/inaccessible, so no reskin is possible — this plan only audits coupling and adds a swappable token seam re-exposing USWDS's own current values"
  - "Token values are function-derived (color()/units()/family()) not hand-typed, guaranteeing byte-identical rendering to today's shell"
  - "_tokens.scss wired via @use (not @forward) so its :root block is emitted into the compiled uswds.css"

patterns-established:
  - "Design-token seam: override --cargoexec-* custom properties (or replace uswds.css) to apply a future design as a token/CSS swap, not a per-component rewrite of 18 coupled files"

# Metrics
duration: 15 min
completed: 2026-09-17
---

# Phase 7 Plan 03: USWDS Coupling Audit & Design-Token Seam Summary

**Enumerated every USWDS coupling point (18 `.tsx` files + Sass entry, asset pipeline, CSP) and introduced a behaviour-preserving `--cargoexec-*` CSS-custom-property seam computed from USWDS's own current theme — no reskin, no `.tsx` touched.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-17T01:15:00Z (approx)
- **Completed:** 2026-09-17T01:30:36Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Complete, re-derived USWDS-coupling inventory: all 18 coupled `.tsx` files under `web/src` listed individually with the primitives each depends on (3 uncoupled exceptions named), plus the single Sass entry point, the self-hosting asset pipeline, and the `style-src 'self'` CSP constraint — with a plain statement that any replacement design must still compile to one self-hosted `<link>` stylesheet.
- A design-token abstraction seam (`web/styles/_tokens.scss`) publishing eight `--cargoexec-*` CSS custom properties at `:root`, every value function-derived from USWDS core's own theme (`color()`, `units()`, `family()`) — guaranteed identical to today's rendering and consumed by nothing yet.
- Verified byte-for-byte behaviour preservation: no `.tsx` file touched, existing `usa-*` rules unchanged, and no colour/spacing value invented.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enumerate every USWDS coupling point** - `e824378` (docs)
2. **Task 2: Introduce the design-token abstraction seam** - `df091fa` (feat)

## Files Created/Modified
- `docs/uswds-coupling-audit.md` (created) - The USWDS-coupling inventory: every coupled `.tsx` file, `app.scss` Sass entry, `copy-uswds-assets.mjs` pipeline, the CSP constraint, and the note that `uswds-conformance-register.md` needs future re-authoring.
- `web/styles/_tokens.scss` (created) - Eight `--cargoexec-*` custom properties at `:root`, computed via USWDS's public `color()`/`units()`/`family()` functions.
- `web/styles/app.scss` (modified) - `@use "tokens";` added after the `@use "uswds-core" with (...)` config block so the seam's `:root` block lands in the compiled `uswds.css`.

## Decisions Made
- **F2 scoped to infrastructure only.** The externally-supplied approved design is HTTP 403 / inaccessible; no design detail is known. The plan therefore audits coupling and adds a swappable seam rather than guessing at a reskin.
- **Values are function-derived, never guessed.** Before writing `_tokens.scss` the installed USWDS 3.11.0 public Sass API was inspected and probed: `color("primary")`=`#005ea2`, `color("primary-dark")`=`#1a4480`, `color("error")`=`#d54309`, `color("ink")`=`#1b1b1b`, `units(1|2|3)`=`0.5rem/1rem/1.5rem`, `family("body")`=the Source Sans Pro stack — all confirmed to compile before use, so `npm run build:css` cannot break on a non-existent function name.
- **`@use "tokens"` (not `@forward`).** The seam's `:root` block must be emitted into `app.scss`'s own compiled output; `@use` achieves that, verified in the build artifact (8 properties present).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None found. The only "placeholder" string in the changed files is descriptive prose in the audit doc naming the existing `NotBuiltYet.tsx` placeholder screen — not a code stub. No blocking or cosmetic stubs introduced.

## Issues Encountered

**`test:arch` — 2 pre-existing F15 failures (out of scope, logged not fixed).**
`npm run test:arch` reports 2 failures (153 pass / 2 fail):
`absence.spec.ts` and `validation.spec.ts` both assert `server/src/cli/seed-demo-case.ts` is the *only* seed-named file in the repo, but three F15 seed-named files now exist (`project_specs/UserStories/Epic-15-…md`, `project_specs/FRD/F15-…md`, `.opencode/commands/pivota_spec-seed-uat-data.md`). The F15 seed CLI was committed by plan **07-01** (`a078aff`); none of these files are in 07-03's diff. Stashing all 07-03 changes reproduces the identical 2 failures, proving they pre-date this plan. Per the SCOPE BOUNDARY rule this is logged to `deferred-items.md` and left for the owning F15 plan(s) to resolve (narrow those two arch allowlists or relocate the spec/command docs). **07-03 introduces zero new test failures.**

Fast gate after this plan: unit 297 ✓, db 196 ✓, api 170 ✓, arch 153 pass (2 pre-existing F15 fails), `npm run build` (server+web) and `npm run build:css` both exit 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- A future visual-redesign phase can read `docs/uswds-coupling-audit.md` to know exactly which 18 files it must touch, and can apply a design by overriding `web/styles/_tokens.scss`'s `--cargoexec-*` properties (or replacing the compiled stylesheet) rather than rewriting every component.
- The actual visual reskin remains **blocked pending** the (currently inaccessible, 403) approved design — explicitly stated in both the plan's artifacts and this summary.
- Pre-existing F15 seed arch-guard failures (see Issues Encountered / `deferred-items.md`) are a concern owned by the F15 seed plan, not by any redesign work.

## Self-Check: PASSED

- Created files exist on disk: `docs/uswds-coupling-audit.md`, `web/styles/_tokens.scss`, `07-03-SUMMARY.md` — all FOUND.
- Task commits exist: `e824378` (Task 1), `df091fa` (Task 2) — both FOUND.
- Build check: `npm run build` (server+web) exit 0; `npm run build:css` exit 0; compiled `uswds.css` carries the 8 `--cargoexec-*` properties additively.
- `## Known Stubs` present, no blocking stubs.
- No new test failures introduced (the 2 `test:arch` fails are pre-existing F15, out of scope — proven by stash-and-rerun, logged to `deferred-items.md`).

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
