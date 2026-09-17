---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 04
subsystem: ui
tags: [carbon, "@carbon/react", "@carbon/styles", ibm-plex, sass, uswds, csp, self-hosted-assets, design-system]

# Dependency graph
requires:
  - phase: 07-03
    provides: "docs/uswds-coupling-audit.md — the USWDS coupling inventory and the _tokens.scss design-token seam this plan retires"
provides:
  - "@carbon/react 1.116.0 + @carbon/icons-react 11.88.0 installed as exact-pinned production deps, resolved against React 18.3.1"
  - "@carbon/styles (White theme) forwarded into web/styles/app.scss, compiling into the single self-hosted web/public/assets/uswds.css alongside the untouched USWDS forward (usa-* and cds-- coexist)"
  - "IBM Plex self-hosted under web/public/assets/fonts/plex via copy-carbon-assets.mjs (no CDN; @font-face src is same-origin)"
  - "The White theme decision, documented with reasoning in app.scss and the coupling audit"
  - "The 07-03 --cargoexec-* token seam explicitly marked SUPERSEDED (retired, not deleted, not the redesign mechanism)"
affects: ["07-05", "07-06", "07-07", "07-08", "07-09", "07-10", "07-11", "phase-7 redesign screen plans"]

# Tech tracking
tech-stack:
  added: ["@carbon/react 1.116.0", "@carbon/icons-react 11.88.0", "@ibm/plex 6.4.1 (promoted transitive → direct pinned dep)"]
  patterns:
    - "Additive design-system migration: Carbon compiled INTO the same self-hosted stylesheet as USWDS, so the app never passes through a visually-broken intermediate state during the multi-wave migration"
    - "Self-hosted third-party fonts via an idempotent copy-*-assets.mjs script wired into build:assets, font-path repointed to a same-origin /assets path, CDN toggle left off"

key-files:
  created:
    - "web/scripts/copy-carbon-assets.mjs"
  modified:
    - "package.json"
    - "web/styles/app.scss"
    - "docs/uswds-coupling-audit.md"

key-decisions:
  - "Carbon theme = White (Carbon's default light theme): read-heavy federal case-review screens, matches USWDS light/high-contrast convention, best-documented WCAG-AA-clearing theme; it is @carbon/styles' $theme default so no override is needed"
  - "@carbon/icons-react pinned at 11.x (its own major line), not ^1: the icons package's semver line is independent of @carbon/react 1.x"
  - "@ibm/plex promoted from a transitive dep of @carbon/styles to a direct, pinned (6.4.1) production dependency so the font self-hosting has a declared source"
  - "07-03 token seam (_tokens.scss / --cargoexec-*) is SUPERSEDED — Carbon ships its own token system — and retired in place (deletion deferred to the Phase-7 final-cleanup plan, not a mid-migration removal)"

patterns-established:
  - "Additive design-system install: both frameworks' disjoint-prefixed classes (usa-* / cds--*) compile into one self-hosted <link> stylesheet"
  - "Self-hosted webfont pipeline: repoint the design system's $font-path to a same-origin /assets path + copy the font families at build time; never the vendor CDN"

# Metrics
duration: 4 min
completed: 2026-09-17
---

# Phase 7 Plan 04: Carbon Design System Build-Pipeline Foundation Summary

**Carbon (@carbon/react 1.116.0, White theme) installed and compiling to the same self-hosted uswds.css as USWDS, with IBM Plex self-hosted (no CDN) — an additive foundation that leaves every current screen visually unchanged and unblocks the remaining Phase-7 redesign plans.**

## Performance

- **Duration:** 4 min (build/compile time dominates; Carbon's full CSS is ~7700 rules)
- **Started:** 2026-09-17T01:36:49Z
- **Completed:** 2026-09-17T01:41:18Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `@carbon/react` (1.116.0) + `@carbon/icons-react` (11.88.0) installed as exact-pinned production dependencies, resolved cleanly against the project's pinned React 18.3.1.
- `web/styles/app.scss` now `@use`s `@carbon/styles` (default White theme) immediately after the untouched `@forward "uswds";`, so `npm run build:css` produces ONE compiled stylesheet carrying BOTH pre-existing `usa-*` rules (86 `usa-banner` matches, unchanged) and new `cds--*` rules (7726 matches).
- IBM Plex (Sans/Mono/Serif) self-hosted under `web/public/assets/fonts/plex/` by the new idempotent `copy-carbon-assets.mjs`, wired into `build:assets`. All 90 `@font-face` `src: url(...)` references in the compiled CSS resolve to same-origin files verified present on disk; zero CDN hosts.
- The White theme decision is documented with its full reasoning in `app.scss` and `docs/uswds-coupling-audit.md` — not left as an open question.
- The 07-03 `_tokens.scss` seam is explicitly marked `SUPERSEDED` and retired in place.
- No `.tsx` file was touched; every currently-shipped screen still renders on USWDS.

## Task Commits

1. **Task 1: Install Carbon, choose the theme, forward its Sass alongside USWDS** — `0b68d6e` (feat)
2. **Task 2: Self-host IBM Plex; retire the 07-03 token seam; confirm CSP/CDN gates hold** — `96307d3` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md)_ — see final docs commit

## Files Created/Modified

- `web/scripts/copy-carbon-assets.mjs` — new idempotent `fs.cp` script self-hosting IBM Plex Sans/Mono/Serif into `web/public/assets/fonts/plex/`, mirroring `copy-uswds-assets.mjs`'s shape.
- `package.json` — added `@carbon/react` 1.116.0, `@carbon/icons-react` 11.88.0, `@ibm/plex` 6.4.1 (all exact-pinned); `build:assets` now runs both copy scripts.
- `web/styles/app.scss` — Carbon `@use "@carbon/styles"` block (White theme, `$font-path` → `/assets/fonts/plex`) added after the untouched USWDS forward, with theme reasoning; `SUPERSEDED` note added above the `@use "tokens";` line.
- `docs/uswds-coupling-audit.md` — appended "Phase 7 update — Carbon installed" section (versions, theme decision + reasoning, IBM Plex self-hosting location, token-seam retirement).

## Decisions Made

- **Theme = White**, for the reasons captured in the plan and reproduced in `app.scss`/the audit doc. White is `@carbon/styles`' `$theme` default (`compat.$white`), so no explicit theme override was required — the correct minimal wiring.
- **`@carbon/icons-react` pinned at 11.x**, not `^1`: its major line is independent of `@carbon/react` 1.x. The plan's `@^1` spec for icons had no matching version (`ETARGET`); the resolved current major is 11. (See Deviations.)
- **`@ibm/plex` promoted to a direct pinned dependency** so the font copy has a declared, stable source rather than relying on a transitive install path.
- **Token seam retired in place, not deleted** — deletion is a later-wave cleanup once nothing could reference it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@carbon/icons-react@^1` does not exist — pinned the actual major (11.x)**
- **Found during:** Task 1 (install)
- **Issue:** The plan's literal `npm install @carbon/react@^1 @carbon/icons-react@^1` failed with `npm error code ETARGET / No matching version found for @carbon/icons-react@^1`. The icons package versions on its own major line (current: 11.88.0), independently of `@carbon/react`'s 1.x line. The plan explicitly said to read the version from what actually resolves, not to guess — so this is the plan's own contingency, resolved by installing `@carbon/icons-react@^11`.
- **Fix:** Installed `@carbon/react@^1 @carbon/icons-react@^11`, then edited both to exact pins (`1.116.0`, `11.88.0`) per the project's no-caret convention.
- **Files modified:** package.json, package-lock.json
- **Verification:** `node -e` reads the resolved versions; `grep -q '"@carbon/react"'` and `'"@carbon/icons-react"'` both pass; React stays 18.3.1.
- **Committed in:** 0b68d6e (Task 1 commit)

**2. [Rule 3 - Blocking] Added `@ibm/plex` 6.4.1 as a direct pinned dependency**
- **Found during:** Task 2 (font self-hosting)
- **Issue:** IBM Plex ships as separate `@ibm/plex*` npm packages pulled transitively by `@carbon/styles`; the copy script needs a stable, declared source. The plan anticipated this ("if IBM Plex ships as a separate npm package, install it … as a production dependency first").
- **Fix:** Pinned `@ibm/plex: 6.4.1` in root `dependencies`; `copy-carbon-assets.mjs` copies its Sans/Mono/Serif family directories.
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm install` resolves it; all 90 referenced font files exist on disk after `build:assets`.
- **Committed in:** 0b68d6e (Task 1) / used in 96307d3 (Task 2)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — Blocking, both explicitly anticipated by the plan's "read the resolved version / install if separate" instructions).
**Impact on plan:** None on scope or outcome. Both are the plan's own documented contingencies for version/package resolution; no architectural change, no `.tsx` touched, no new mechanism introduced.

## Known Stubs

None found. The one `placeholder` grep hit (`docs/uswds-coupling-audit.md:105`) is pre-existing prose describing a USWDS class, not a stub in this plan's changes.

## Issues Encountered

- Carbon's Sass compile emits ~1000 non-fatal deprecation warnings (Sass division / global built-in / nested-declaration deprecations from within `@carbon/styles` and `@uswds/uswds`). These are upstream-library warnings, not errors — `build:css` and `build` both exit 0. No action taken (out of scope; not our source).
- The `test:db` and `test:api` tiers require a running Postgres and were not run: this plan touches only the web build pipeline (no `server/src`, no migration, no route change), so those tiers are unaffected by construction — consistent with 07-03's precedent for a web-only plan. The relevant gates (build, `test:unit` 297, `test:arch` 155) are all green.

## Self-Check: PASSED

- `web/scripts/copy-carbon-assets.mjs` exists on disk: FOUND
- Task commits present: `0b68d6e` FOUND, `96307d3` FOUND
- Plan-level build ran and passed: `npm run build` → exit 0 (server tsc + prompt copy + build:css + build:assets + vite build, all green)
- `test:arch` 155 passed, `test:unit` 297 passed
- `## Known Stubs` present with no blocking entry

## Next Phase Readiness

- Every subsequent Phase-7 plan (07-05 … 07-11) can now `import` and render `@carbon/react` components immediately against a working, CSP-compliant (`style-src 'self'`, `font-src 'self'`), self-hosted Carbon build.
- The current rendered screens are visually unchanged (USWDS still drives every `.tsx`; only new, unconsumed Carbon CSS exists in the bundle).
- The theme decision (White) and the token-seam retirement are both explicit, documented facts — not open questions carried forward.
- No blockers.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
