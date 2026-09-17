---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 11
subsystem: ui
tags: [carbon, uswds, sass, build-pipeline, architecture-tests, regression-gate, playwright]

# Dependency graph
requires:
  - phase: 07-07
    provides: SignIn/NotBuiltYet/NotFound rebuilt on Carbon (the last three USWDS-coupled screens' own markup)
  - phase: 07-08
    provides: Queue.tsx rebuilt on Carbon plain table primitives
  - phase: 07-10
    provides: DecisionPanel/AuditTrailRegion on Carbon — the final two files, completing the 18-file migration; the ErrorSummary interactive-child fix pattern
provides:
  - "@uswds/uswds removed entirely from package.json, the Sass pipeline, and the build scripts"
  - "compiled stylesheet (web/public/assets/app.css) is Carbon-only — 0 usa-* rules, 7729 cds-- rules"
  - "the three named architecture tests re-verified UNMODIFIED against the fully-Carbon codebase"
  - "docs/carbon-conformance-register.md finalized as the complete, product-wide, final control register"
  - "full regression gate green: npm run test (818) + npm run test:e2e (67), 0 failures, 0 skips"
affects: [any future visual redesign, any new UI phase, Phase 7 completion/transition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Carbon InlineNotification children must be non-interactive (useNoInteractiveChildren throws); interactive recovery links go in a SIBLING element, never in the notification"
    - "docker compose up -d <one-service> interpolates the WHOLE compose file, so a mandatory ${VAR:?} in an untargeted service must still be present in the environment"
    - "project-owned static images (the banner flag) are vendored under web/assets/ (git-tracked) and copied into the gitignored web/public/assets/ at build time by copy-carbon-assets.mjs"

key-files:
  created:
    - web/assets/img/us_flag_small.png
    - .planning/phases/07-redesign-ui-seeded-demo-data-and-real-llm-integration/07-11-SUMMARY.md
  modified:
    - package.json
    - web/styles/app.scss
    - web/index.html
    - web/scripts/copy-carbon-assets.mjs
    - web/src/screens/NotBuiltYet.tsx
    - e2e/global-setup.ts
    - e2e/whole-loop.spec.ts
    - e2e/shell.spec.ts
    - server/test/api/guard.spec.ts
    - docs/carbon-conformance-register.md
    - docs/uswds-conformance-register.md
  deleted:
    - web/styles/_tokens.scss
    - web/scripts/copy-uswds-assets.mjs

key-decisions:
  - "The banner flag (us_flag_small.png) is a plain federal image, not a USWDS-coupled asset — vendored as a git-tracked project asset rather than left dependent on the removed @uswds dist"
  - "The three named architecture tests passed UNMODIFIED — no assertion was touched to force a pass; a clean re-verification against the fully-Carbon codebase"
  - "Two real crashing/blocking bugs found by the final regression gate were fixed in-plan (last wave, nowhere to defer): the e2e compose-interpolation abort and the NotBuiltYet InlineNotification interactive-child crash"

patterns-established:
  - "Pattern: interactive children never nest inside a Carbon InlineNotification — sibling placement inside a shared role container"
  - "Pattern: compose one-service `up` still needs every mandatory ${VAR:?} in env"

# Metrics
duration: 11 min
completed: 2026-09-17
---

# Phase 7 Plan 11: USWDS Removal & Carbon Migration Close-out Summary

**`@uswds/uswds` deleted from the dependency tree, Sass pipeline, and build scripts; the compiled stylesheet is now Carbon-only (0 `usa-*` / 7729 `cds--*` rules); the three named architecture tests re-verified unmodified; the Carbon conformance register finalized; and the full regression gate (`npm run test` + `npm run test:e2e`, 885 tests) green with zero failures and zero skips.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-17T02:44:28Z
- **Completed:** 2026-09-17T02:55:31Z
- **Tasks:** 2
- **Files modified:** 11 (2 created, 2 deleted, 9 modified)

## Accomplishments
- **USWDS is gone.** `@uswds/uswds` removed from `package.json` (`npm uninstall`); the `@use "uswds-core"` / `@forward "uswds"` Sass, `web/styles/_tokens.scss` (the superseded token seam), `web/scripts/copy-uswds-assets.mjs`, and the `uswds.min.js` `<script>` tag are all deleted. Carbon is the ONLY design system present.
- **Compiled stylesheet renamed and proven Carbon-only.** `build:css` output moved from `/assets/uswds.css` to `/assets/app.css` (with the `<link>`, `e2e/shell.spec.ts`, and `guard.spec.ts` references updated); the compiled `app.css` contains **0** `usa-*` rules and **7729** `cds--*` rules.
- **The three named architecture tests re-verified UNMODIFIED** against the fully-Carbon codebase — `navigation.spec.ts` (11), `headers.spec.ts` (48), `absence.spec.ts`'s raw-hex/px + CDN-absence + dependency-allowlist scans (54). None needed a code change; no assertion's intent was weakened.
- **Carbon conformance register finalized** with a row-by-row cross-check against the retired USWDS register (every product control mapped) and a Phase 7 close-out note; the USWDS register carries its final superseding line.
- **Full regression gate GREEN** — `npm run test` (unit 297 / db 196 / api 170 / arch 155 = 818) and `npm run test:e2e` (67), 0 failures, 0 skips.

## Task Commits

1. **Task 1: Remove USWDS from the dependency tree and build pipeline entirely** — `de6a097` (feat)
2. **Task 2: Re-verify architecture tests, finalize register, run full regression gate** — `1dba8b2` (fix)

**Plan metadata:** (this commit — docs: complete plan)

## Files Created/Modified
- `package.json` — removed `@uswds/uswds`; `build:css` output `/assets/app.css` with `--load-path=node_modules` only; `build:assets` runs only `copy-carbon-assets.mjs`
- `web/styles/app.scss` — removed the USWDS `@use`/`@forward` and `@use "tokens"`; Carbon (`@carbon/styles`, White theme) is the sole design system forwarded; all project-owned rules retained
- `web/index.html` — stylesheet `<link>` → `/assets/app.css`; `uswds.min.js` `<script>` removed
- `web/scripts/copy-carbon-assets.mjs` — now also copies the vendored `web/assets/img` (the banner flag) into the gitignored `web/public/assets/img`
- `web/assets/img/us_flag_small.png` — **created**: the banner flag vendored as a git-tracked project asset (was previously build-copied from the now-removed @uswds dist)
- `web/styles/_tokens.scss` — **deleted** (superseded token seam)
- `web/scripts/copy-uswds-assets.mjs` — **deleted**
- `web/src/screens/NotBuiltYet.tsx` — moved the recovery `<Link>` out of the Carbon `InlineNotification` (which throws on interactive children) to a sibling `<p>`
- `e2e/global-setup.ts` — pass `AI_PROVIDER_URL=fake:deterministic` into the `docker compose up -d db` env so the now-mandatory `${AI_PROVIDER_URL:?}` interpolation resolves
- `e2e/whole-loop.spec.ts` — skip-link locator `a.usa-skipnav` → `a.cds--skip-to-content`
- `e2e/shell.spec.ts`, `server/test/api/guard.spec.ts` — `/assets/uswds.css` → `/assets/app.css` references
- `docs/carbon-conformance-register.md` — finalized: USWDS-register cross-check + Phase 7 close-out
- `docs/uswds-conformance-register.md` — final superseding line appended

## Decisions Made
- The `us_flag_small.png` banner flag is a plain federal image (not USWDS-coupled markup), so it is vendored as a git-tracked project asset under `web/assets/img` rather than left dependent on the removed `@uswds` package.
- The three named architecture tests passed **unmodified** — a clean re-verification, not a forced pass. No assertion was touched.
- Both real bugs the final regression gate revealed were fixed in-plan; as the last wave there is no later plan to defer to (the plan explicitly requires this).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vendored the banner flag as a git-tracked project asset**
- **Found during:** Task 1
- **Issue:** `web/src/shell/Banner.tsx` renders `/assets/img/us_flag_small.png`, which was build-copied from the `@uswds` dist by `copy-uswds-assets.mjs`. Removing the package and that copy script (as the plan directs) would leave the flag 404ing on a fresh build. `web/public/assets/` is gitignored, so the flag is not otherwise tracked.
- **Fix:** Vendored the 244-byte flag at `web/assets/img/us_flag_small.png` (git-tracked) and extended `copy-carbon-assets.mjs` to copy `web/assets/img` into `web/public/assets/img` at build time — making Carbon's asset-copy step the genuinely sole one without breaking the banner.
- **Files modified:** web/assets/img/us_flag_small.png (created), web/scripts/copy-carbon-assets.mjs
- **Verification:** `npm run build` succeeds; the flag lands in `web/public/assets/img/`; the shell and whole-loop e2e specs (which render the banner) pass.
- **Committed in:** de6a097 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed e2e/global-setup.ts compose-interpolation abort**
- **Found during:** Task 2 (running `npm run test:e2e`)
- **Issue:** `docker compose up -d db` interpolates the ENTIRE compose file before acting. Since plan 07-02 made the `web` service's `AI_PROVIDER_URL` a mandatory no-default variable (`${AI_PROVIDER_URL:?…}`, FR-9.20), the db-only `up` now aborted with "required variable AI_PROVIDER_URL is missing a value" — taking the whole e2e tier's global setup down. Surfaced now because this is the first plan to run the full e2e suite after 07-02's compose change landed.
- **Fix:** Pass `AI_PROVIDER_URL: E2E_ENV.AI_PROVIDER_URL` (`fake:deterministic`, the e2e tier's canonical value) into the `spawnSync` env for the compose call. Satisfies the interpolation without weakening the FR-9.20 guarantee — a real deployment still has no silent default. `AI_API_KEY` keeps its compose-level `${AI_API_KEY:-}` empty default.
- **Files modified:** e2e/global-setup.ts
- **Verification:** `npm run test:e2e` global setup succeeds and the suite runs to completion (67 pass).
- **Committed in:** 1dba8b2 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed NotBuiltYet.tsx crash (Carbon InlineNotification interactive child)**
- **Found during:** Task 2 (`shell.spec.ts` test 11 failed on all retries)
- **Issue:** `NotBuiltYet.tsx` (the `/entries/new` and `/queue`-placeholder screens, migrated to Carbon in 07-07) placed the recovery react-router `<Link>` inside a Carbon `InlineNotification`. Carbon's notification runs `useNoInteractiveChildren` and **throws** ("component should have no interactive child nodes") on any interactive descendant — the exact defect plan 07-10 fixed for `ErrorSummary` but never applied here. The route rendered the react-router error boundary instead of the screen (title updated, but focus never reached the h1). A genuine crashing regression, latent since 07-07 and caught here by the full-suite cross-screen gate (T-07-32).
- **Fix:** Moved the `<Link>` out of the notification (which now carries text only via its `title`) to a sibling `<p>`, mirroring the 07-10 ErrorSummary fix. `role="status"` and the no-orphan-screen affordance both preserved. Scanned the whole `web/src` tree — no other `InlineNotification` has interactive children.
- **Files modified:** web/src/screens/NotBuiltYet.tsx
- **Verification:** `/entries/new` renders the real screen (no error boundary); `shell.spec.ts` test 11 passes; full e2e suite 67/67 green; `tsc -p web` clean.
- **Committed in:** 1dba8b2 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All three were required for a correct, non-regressed close-out — the flag vendoring is essential for the banner to render after USWDS removal, and the two bugs were real crashes the mandatory regression gate exists precisely to catch (the plan's own threat model, T-07-32, anticipated the cross-screen integration gap). No scope creep — each fix is the minimal correction, and two of the three (compose interpolation, NotBuiltYet crash) were latent defects from earlier plans surfaced only by this final full-suite gate.

## Issues Encountered
None beyond the deviations above. The three named architecture tests required no changes.

## User Setup Required
None - no external service configuration required for this plan. (The pre-existing `07-USER-SETUP.md` from 07-02, for supplying a real LLM key, is unchanged and unaffected — the e2e tier and this plan run on `fake:deterministic`.)

## Known Stubs
None found. `NotBuiltYet.tsx` remains a documented transitional placeholder for future phases, but it is a pre-existing intentional screen (not introduced or stubbed by this plan) and now functions correctly (its crash was fixed here).

## Next Phase Readiness
- **The Carbon migration is complete and proven.** Carbon is the ONLY design system in the repository; there is no dead USWDS dependency, no dead build step, and no `usa-*` rule in the shipped CSS. All 18 originally USWDS-coupled `.tsx` files render on Carbon.
- **F2's redesign goal is realized** — the swap happened cleanly in dependency-ordered waves, with the full regression suite (885 tests) green as the closing proof. "A future visual redesign is a swap, not a rewrite" (07-03's premise) now holds against a Carbon baseline.
- This is the last plan of Phase 7's Carbon-migration line of work. Phase 7 is ready for its completion / verification.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*

## Self-Check: PASSED

- Created files exist on disk: `web/assets/img/us_flag_small.png`, `07-11-SUMMARY.md`, compiled `web/public/assets/app.css` — all FOUND.
- Deleted files gone: `web/styles/_tokens.scss`, `web/scripts/copy-uswds-assets.mjs` — both GONE.
- Task commits exist in git history: `de6a097` (Task 1), `1dba8b2` (Task 2) — both FOUND.
- Plan-level build ran and passed: `npm run build` exit 0 (server + web; 966 modules transformed; `app.css` emitted).
- `@uswds/uswds` absent from `package.json` — confirmed.
- Full regression gate green: `npm run test` (818) + `npm run test:e2e` (67), 0 failures, 0 skips.
- `## Known Stubs` present; no blocking stubs.
