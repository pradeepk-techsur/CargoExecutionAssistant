---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 05
subsystem: ui
tags: [carbon, react, uswds, accessibility, shell, ui-shell, a11y]

# Dependency graph
requires:
  - phase: 07-04
    provides: "@carbon/react + @carbon/icons-react installed; @carbon/styles compiled into the self-hosted uswds.css (White theme); IBM Plex self-hosted"
provides:
  - "The persistent application shell (SkipLink, Banner, Header, Nav, Footer, LiveRegions, Shell) fully rendered on the Carbon Design System"
  - "docs/carbon-conformance-register.md shell rows (skip link, government banner, masthead, primary nav, sign out, live regions, footer)"
  - "web/styles/_shell.scss — project-owned Carbon-token layout for the banner/footer compositions + the shell reflow guarantee"
  - "docs/a11y/shell.md re-signed against the Carbon shell"
affects: [07-07, 07-08, 07-09, screen-redesign, uswds-removal-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Carbon UI Shell components (SkipToContent, Header, HeaderName, HeaderNavigation, HeaderMenuItem, HeaderGlobalBar) as the shell primitive set"
    - "Carbon polymorphic `as={NavLink}`/`as={Link}` to keep react-router routing + aria-current inside Carbon header links"
    - "Federal-conformance markup (government banner, agency-identifier footer) rebuilt as DOCUMENTED Carbon-conformant compositions where Carbon ships no primitive"
    - "Shell-owned React useState driving the banner disclosure's aria-expanded/aria-controls/hidden (replacing USWDS JS)"
    - "cds--visually-hidden as the Carbon visually-hidden utility (replacing usa-sr-only)"

key-files:
  created:
    - web/styles/_shell.scss
    - docs/carbon-conformance-register.md
  modified:
    - web/src/shell/SkipLink.tsx
    - web/src/shell/Nav.tsx
    - web/src/shell/Footer.tsx
    - web/src/shell/Banner.tsx
    - web/src/shell/Header.tsx
    - web/src/shell/Shell.tsx
    - web/src/shell/LiveRegions.tsx
    - web/styles/app.scss
    - e2e/shell.spec.ts
    - docs/a11y/shell.md
    - docs/uswds-conformance-register.md

key-decisions:
  - "The government banner and the federal footer/agency-identifier are rebuilt as documented Carbon-conformant COMPOSITIONS (Carbon ships no primitive for either), not as bespoke controls — each registered in docs/carbon-conformance-register.md"
  - "The banner disclosure is now the shell's own React-managed toggle (useState → aria-expanded/aria-controls/hidden), since USWDS's JS no longer drives it and Carbon has no equivalent widget"
  - "role=banner is passed to Carbon's Header as a JSX attribute via a localised typed pass-through (ComponentType cast), keeping it out of the object-literal role: scan the architecture suite forbids"
  - "e2e shell locators moved to Carbon's real selectors and prefer role/label-based locators so they survive the next visual-system swap"

patterns-established:
  - "Carbon UI Shell as the shell layer; federal markup as auditable Carbon compositions"
  - "web/styles/_shell.scss owns shell composition layout on Carbon spacing/theme/type tokens"

# Metrics
duration: 25 min
completed: 2026-09-17
---

# Phase 7 Plan 05: Carbon Application Shell Summary

**The persistent application shell — skip link, U.S. government banner, header + two-item primary nav + sign-out, main landmark, footer + agency identifier, and both live regions — fully rebuilt on the Carbon Design System with every FR-2.x structural guarantee intact, the banner disclosure re-implemented as the shell's own React-managed toggle, and the Carbon conformance register opened for the redesign.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-17T01:44:48Z
- **Completed:** 2026-09-17T02:10:10Z
- **Tasks:** 2
- **Files modified:** 11 (2 created, 9 modified)

## Accomplishments

- `SkipLink` → Carbon `SkipToContent` (`a.cds--skip-to-content`, first focusable → `#main-content`); `Nav` → Carbon `HeaderNavigation`/`HeaderMenuItem` with each `<a>` supplied by react-router `NavLink` so `aria-current="page"` is set on the active item and the DOM stays `<nav aria-label="Primary">` with exactly two anchors.
- `Header` → Carbon `Header` (`role="banner"`)/`HeaderName` (IBM prefix suppressed)/`HeaderGlobalBar` + a Carbon ghost `Button` for sign out, wired to the same `onSignOut` prop; the reduced `/sign-in` shell (no nav/name/sign-out) unchanged.
- `Banner` and `Footer` rebuilt as documented Carbon-conformant compositions (Carbon ships no primitive for either federal element); the banner disclosure toggles via the shell's own `useState`, keyboard-operable, inline, no popup.
- `LiveRegions` moved to Carbon's `cds--visually-hidden`, keeping `aria-live`/`aria-atomic`/`data-testid` byte-identical; `Shell` reassembled from the Carbon pieces with landmark structure and DOM order unchanged.
- `docs/carbon-conformance-register.md` created and (after a concurrent 07-06 rewrite) re-populated additively with all seven shell rows; `docs/a11y/shell.md` re-signed against the Carbon shell with the full §7.7 checklist re-run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild SkipLink, Nav, Footer on Carbon; open the register** — `3738cc0` (feat)
2. **Task 2: Rebuild Banner and Header, assemble Shell, re-sign shell a11y** — `ce273c0` (feat)

_Note: `web/styles/app.scss`'s `@use "shell"` line landed via the shared wave-3 working tree (committed alongside a concurrent 07-06 commit); the new `web/styles/_shell.scss` it references is committed in Task 2 (`ce273c0`)._

## Files Created/Modified

- `web/src/shell/SkipLink.tsx` — Carbon `SkipToContent`
- `web/src/shell/Nav.tsx` — Carbon `HeaderNavigation` + `HeaderMenuItem as={NavLink}`
- `web/src/shell/Footer.tsx` — Carbon `Grid`/`Column`/`Link` federal-footer composition (7 pinned links, `role="contentinfo"`, identifier labels)
- `web/src/shell/Banner.tsx` — Carbon `Button` disclosure driven by the shell's own React state
- `web/src/shell/Header.tsx` — Carbon `Header`/`HeaderName`/`HeaderGlobalBar`; `role="banner"` via a localised typed pass-through
- `web/src/shell/Shell.tsx` — reassembled Carbon shell, unchanged DOM order/landmarks
- `web/src/shell/LiveRegions.tsx` — `cds--visually-hidden` regions
- `web/styles/_shell.scss` — Carbon-token layout for the banner/footer compositions + the 320px/200%-zoom reflow fix
- `web/styles/app.scss` — `@use "shell"`
- `e2e/shell.spec.ts` — Carbon selectors (`a.cds--skip-to-content`, role/label banner toggle)
- `docs/carbon-conformance-register.md` — created; seven shell rows + banner/footer composition notes
- `docs/a11y/shell.md` — re-signed against the Carbon shell (evidence, checklist, Defect 1, AT walkthrough, sign-off)
- `docs/uswds-conformance-register.md` — superseding note appended

## Decisions Made

- Government banner and federal footer are Carbon-conformant **compositions** (no Carbon primitive exists), each registered and note-documented.
- The banner disclosure is the shell's own React `useState` toggle (USWDS JS retired; Carbon has no equivalent widget).
- `role="banner"` reaches Carbon's `Header` as a JSX attribute through a localised `ComponentType` cast, keeping it out of the object-literal `role:` scan the architecture suite forbids (a real regression I introduced and corrected — see Deviations).
- e2e locators prefer role/label-based selectors so they survive the next visual-system swap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Footer Carbon grid caused horizontal scroll at 320px**
- **Found during:** Task 2 (e2e shell verification)
- **Issue:** Carbon's `cds--css-grid` in the footer/agency-identifier composition applied its gutter padding at the shell's full-bleed edge, pushing columns ~16px past the viewport at 320px, so `e2e/shell.spec.ts` "14." failed (horizontal body scroll). A real reflow regression (FR-2.20) introduced by the Carbon rebuild.
- **Fix:** Created `web/styles/_shell.scss` (and `@use`d it from `app.scss`) with the shell compositions' layout on Carbon spacing/theme/type tokens, including a scoped constraint on the footer/identifier grid (`max-inline-size: 100%`, drop the negative gutter margin, `overflow-x: clip`).
- **Files modified:** web/styles/_shell.scss, web/styles/app.scss
- **Verification:** `e2e/shell.spec.ts` "14." passes at 320px and at the 200%-equivalent zoom; all 16 shell scenarios pass.
- **Committed in:** ce273c0 (Task 2 commit)

**2. [Rule 1 - Bug] Header `role` as an object literal tripped the application-role architecture scan**
- **Found during:** Task 2 (navigation.spec verification)
- **Issue:** My first Header fix passed `role` via `{ role: 'banner' }` spread to satisfy Carbon's type, but `server/test/architecture/navigation.spec.ts`'s application-role scan flags any object-literal `role:` (only the JSX `role=` attribute is the documented ARIA exclusion). navigation.spec item 5 failed on `web/src/shell/Header.tsx`.
- **Fix:** Re-typed Carbon's `Header` through a localised `BannerHeader = CarbonHeader as ComponentType<ComponentProps<typeof CarbonHeader> & { role?: string }>` and passed `role="banner"` as a JSX attribute.
- **Files modified:** web/src/shell/Header.tsx
- **Verification:** `navigation.spec.ts` passes 11/11; `npx tsc -p web --noEmit` exits 0.
- **Committed in:** ce273c0 (Task 2 commit)

**3. [Rule 3 - Blocking] Concurrent 07-06 rewrite of the shared register dropped the 07-05 shell rows**
- **Found during:** Task 2 (appending remaining shell rows)
- **Issue:** The Carbon conformance register 07-05 created in Task 1 (`3738cc0`) was rewritten by the concurrent wave-3 sibling 07-06 (`0ce5696`/`29eed4e`) with its own preamble and form-pattern rows, which did not preserve 07-05's shell rows.
- **Fix:** Per the plan's coordination note, re-read the file and re-applied all seven shell rows additively at the top of the register table, plus the banner/footer composition notes, PRESERVING every 07-06 row and note (never overwrote another plan's rows).
- **Files modified:** docs/carbon-conformance-register.md
- **Verification:** Register now contains both plans' rows; `deferred-items.md` records the reconciliation.
- **Committed in:** ce273c0 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking). **Impact on plan:** All three were necessary for correctness (reflow), the architecture gate (role scan), and the wave-3 coordination contract (additive register). No scope creep — `web/styles/_shell.scss`/`app.scss` were the minimal styling additions the Carbon shell compositions and the reflow guarantee required.

## Issues Encountered

- The e2e suite's `global-setup` runs `docker compose up -d db`, which fails compose variable interpolation unless `AI_PROVIDER_URL` is set (plan 07-02's mandatory no-default var). Worked around by exporting `AI_PROVIDER_URL=fake:deterministic` for the local e2e run (the documented local/test posture). Not a code change — an environment note for future e2e runs in this sandbox.
- Chromium needed system libraries (`libnss3` etc.); installed via `playwright install-deps`. One-time sandbox setup, not a plan artefact.

## Known Stubs

None found — the changed shell files contain no TODO/FIXME/placeholder/not-implemented markers, no hardcoded stand-in data, and no empty handlers. (`onSignOut` remains an injected prop, wired identically to the pre-Carbon shell.)

## Verification Summary

- `npm run build` (server + web, incl. Carbon Sass) — exit 0.
- `npx tsc -p web --noEmit` / `npm run typecheck` — exit 0.
- `npx vitest run server/test/architecture/navigation.spec.ts server/test/architecture/headers.spec.ts` — 59 passed, 0 failed (both specs pass unmodified against the Carbon shell).
- `npx playwright test e2e/shell.spec.ts` — 16 shell scenarios passed, 0 failed, 0 skipped, against the Carbon-rendered selectors.

## Next Phase Readiness

- The shell is fully Carbon-rendered with zero regression to any FR-2.x structural guarantee; every subsequent screen plan (07-07/07-08/07-09) can render inside it with no further shell changes.
- `docs/carbon-conformance-register.md` is open and holds both the shell and the shared-component rows — later screen plans append to it.
- The USWDS `usa-*` rules and the compiled `uswds.css` filename are intentionally retained until the Phase-7 final-cleanup plan removes USWDS entirely.

## Self-Check: PASSED

- Created files exist on disk: `web/styles/_shell.scss`, `docs/carbon-conformance-register.md`, `07-05-SUMMARY.md` — all FOUND.
- Modified shell files exist: `SkipLink.tsx`, `Nav.tsx`, `Footer.tsx`, `Banner.tsx`, `Header.tsx`, `Shell.tsx`, `LiveRegions.tsx` — all present.
- Commits exist: `3738cc0` (Task 1), `ce273c0` (Task 2) — both FOUND in git log.
- Plan-level build ran and passed: `npm run build` → exit 0.
- `## Known Stubs` present and reports none blocking.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
