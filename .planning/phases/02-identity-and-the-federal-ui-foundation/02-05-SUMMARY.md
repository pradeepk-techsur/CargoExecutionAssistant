---
phase: 02-identity-and-the-federal-ui-foundation
plan: 05
subsystem: ui
tags: [uswds, react, vite, dart-sass, playwright, accessibility, react-router, spa, shell]

# Dependency graph
requires:
  - phase: 02-04
    provides: createApp with production-mode static serving + SPA fallback, GET /api/session, the 0.0.0.0:3000 bootstrap, create-specialist --from-env --if-absent
  - phase: 02-01
    provides: contract DTOs (SessionDto, SpecialistDto), build:css/build:assets/build:web/test:e2e scripts, the web workspace
provides:
  - The USWDS asset pipeline (dart-sass → web/public/assets/uswds.css; copied fonts, icon sprite and uswds.min.js — no CDN)
  - The application shell (Shell) — banner, skip link, header, two-item nav, main#main-content, footer/identifier, live regions
  - NAV_ITEMS — the exactly-two-destination navigation as assertable data
  - LiveRegions/useAnnounce/AnnounceProvider — both regions from first paint
  - useScreenFocus — title + polite announce + focus-to-h1 on every completed navigation, with the four-moments focus discipline
  - The five shared state components (Loading, Empty, ErrorState, Degraded, ReadOnlyNotice)
  - The §3.17 route table (react-router-dom) with no excluded route; NotBuiltYet transitional placeholder; NotFound
  - The Playwright tier: env.ts, wait-for-db.mjs, global-setup.ts, playwright.config.ts, and shell.spec.ts (16 functional browser assertions)
affects: [02-06, 02-07, 02-09, phase-3, phase-4, phase-5, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "USWDS consumed as Sass + JS + icon sprite (project owns the DOM), served entirely from its own origin — no CDN, no external network (FR-2.3)"
    - "Stylesheet is a <link> to the dart-sass output, never a JS import — CSP style-src 'self' holds with no unsafe-inline (§4.5)"
    - "NAV_ITEMS is a two-member `as const` array rendered by .map; nav cardinality is a value a test reads (toHaveCount(2))"
    - "useScreenFocus owns title + polite announce + focus-to-h1 on navigation; the four-moments focus rule is documented so later phases inherit it"
    - "The government banner is stock USWDS markup driven by uswds.min.js — React does not also control the disclosure (two controllers fight)"
    - "The e2e webServer runs the SAME boot sequence as the compose service (build → wait-for-db → migrate → create-specialist → serve) with the complete E2E_ENV, so e2e and deployment exercise one boot path"

key-files:
  created:
    - web/styles/app.scss
    - web/scripts/copy-uswds-assets.mjs
    - web/index.html
    - web/vite.config.ts
    - web/src/main.tsx
    - web/src/app/router.tsx
    - web/src/app/session.ts
    - web/src/shell/Shell.tsx
    - web/src/shell/SkipLink.tsx
    - web/src/shell/Banner.tsx
    - web/src/shell/Header.tsx
    - web/src/shell/Nav.tsx
    - web/src/shell/navItems.ts
    - web/src/shell/Footer.tsx
    - web/src/shell/LiveRegions.tsx
    - web/src/shell/useScreenFocus.ts
    - web/src/components/states.tsx
    - web/src/screens/NotFound.tsx
    - web/src/screens/NotBuiltYet.tsx
    - playwright.config.ts
    - e2e/env.ts
    - e2e/wait-for-db.mjs
    - e2e/global-setup.ts
    - e2e/shell.spec.ts
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "The Sass entry point is web/styles/app.scss, not uswds.scss: a file named uswds.scss doing `@forward \"uswds\"` self-references and deadlocks dart-sass with a module loop. Renamed; build:css updated. Output is still uswds.css."
  - "The government banner is stock USWDS accordion markup driven by uswds.min.js — a React-controlled toggle fought the USWDS JS and aria-expanded never flipped."
  - "SkipLink renders before Banner so it is genuinely the first focusable element in the DOM, honouring the plan's stated invariant over its illustrative DOM-order list."
  - "vite.config.ts server block is type-widened for `allowedHosts: true` — the option lands in Vite 6's types but the project pins Vite 5.4.11, whose runtime honours it while the type does not declare it."

patterns-established:
  - "Affordance-scan exemption for the footer is auditable: the usa-identifier required-links set is pinned explicitly in Footer.tsx, with a comment explaining 'Performance reports' is statutory, not a product report surface."
  - "The e2e suite is independent of globalSetup/webServer ordering: the server command self-waits for the DB and self-migrates/bootstraps, and specs read credentials from e2e/env.ts, never from process.env keys globalSetup mutates."

# Metrics
duration: 35 min
completed: 2026-09-14
---

# Phase 2 Plan 05: The USWDS Shell and Federal UI Foundation Summary

**The self-served USWDS asset pipeline (dart-sass, bundled fonts and icon sprite, no CDN) plus the accessible application shell — landmarks, a first-focus skip link, the exactly-two-destination navigation, focus/title management, both live regions and the five shared state components — proven in a real Chromium by 16 functional Playwright assertions against the real static-serving server.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-14T22:30:00Z (approx)
- **Completed:** 2026-09-14T23:05:00Z (approx)
- **Tasks:** 3
- **Files modified:** 26 (24 created, 2 modified)

## Accomplishments
- USWDS 3.11 compiled with dart-sass to one linked stylesheet, with fonts, the icon sprite and uswds.min.js copied into `web/public/assets` — nothing loads from a CDN (FR-2.3), and the stylesheet is a `<link>` so `style-src 'self'` holds (§4.5).
- The application shell rendering exactly one `banner`, one `main#main-content`, one `contentinfo`, and a `nav[aria-label="Primary"]` only when authenticated; the skip link is the first focusable element and moves focus into `main`; the government banner disclosure is keyboard-operable.
- `NAV_ITEMS` — exactly two destinations as data, `.map`-rendered with `aria-current="page"` on the active one; no third affordance anywhere in nav/header/main (criterion 5, verified in-browser).
- `useScreenFocus` (title + polite announce + focus-to-h1 on navigation) with the four-moments focus discipline documented; both live regions present from first paint via `AnnounceProvider`; the five shared state components in one module.
- The Playwright tier proving all of it in a real browser: 16 assertions, green from a completely clean slate (build → wait-for-db → migrate → bootstrap → serve) with no ambient `.env` and no already-running server.

## Task Commits

1. **Task 1: The USWDS asset pipeline** — `bd95df6` (feat)
2. **Task 2: The application shell** — `488cd68` (feat)
3. **Task 3: Playwright config and the shell browser suite** — `4520a22` (test)

## Files Created/Modified
- `web/styles/app.scss` — USWDS Sass entry (`@use uswds-core with (...)` + `@forward uswds`) and the reduced-motion block
- `web/scripts/copy-uswds-assets.mjs` — idempotent copy of dist img/fonts/js into web/public/assets
- `web/index.html` — SPA document, lang=en, linked stylesheet, no inline script/style, no CDN
- `web/vite.config.ts` — 0.0.0.0:3000, strictPort, allowedHosts (type-widened for Vite 5)
- `web/src/main.tsx` — session bootstrap before protected render, AnnounceProvider + RouterProvider
- `web/src/app/router.tsx` — the seven §3.17 routes; `web/src/app/session.ts` — client session context
- `web/src/shell/*` — Shell, SkipLink, Banner, Header, Nav, navItems, Footer, LiveRegions, useScreenFocus
- `web/src/components/states.tsx` — Loading/Empty/ErrorState/Degraded/ReadOnlyNotice
- `web/src/screens/NotFound.tsx`, `web/src/screens/NotBuiltYet.tsx` — the 404 and the transitional placeholder
- `playwright.config.ts`, `e2e/env.ts`, `e2e/wait-for-db.mjs`, `e2e/global-setup.ts`, `e2e/shell.spec.ts`
- `package.json` — build:css points at app.scss; `.gitignore` — build artefacts + playwright output

## Decisions Made
- **Sass entry renamed to `app.scss`.** A file named `uswds.scss` doing `@forward "uswds"` resolves the forward to itself and dart-sass fails with "Module loop: this module is already being loaded". Renamed to `app.scss` (build:css updated); the compiled output is still `uswds.css`, so the `<link href="/assets/uswds.css">` is unchanged.
- **The banner is driven by USWDS JS, not React.** `uswds.min.js` binds the disclosure toggle to `.usa-banner__button` and manages `aria-expanded` itself; a React `onClick`/`useState` toggle on the same button fought it and `aria-expanded` never flipped. The banner is now stock USWDS accordion markup that USWDS drives — deterministic and keyboard-operable, as the browser test proves.
- **SkipLink precedes Banner in the DOM** so it is genuinely the first focusable element (the plan's stated invariant), rather than sitting behind the banner's disclosure button.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sass module loop from the `uswds.scss` filename**
- **Found during:** Task 1
- **Issue:** `web/styles/uswds.scss` doing `@forward "uswds"` self-referenced and dart-sass aborted with "Module loop: this module is already being loaded"; no CSS compiled.
- **Fix:** Renamed the entry to `web/styles/app.scss` and pointed `build:css` at it; output remains `web/public/assets/uswds.css`. Also corrected the entry to the canonical `@use "uswds-core" with (...)` then `@forward "uswds"` form.
- **Files modified:** web/styles/app.scss (was uswds.scss), package.json
- **Verification:** `npm run build:css` exits 0, 740 KB stylesheet compiled.
- **Committed in:** `bd95df6`

**2. [Rule 3 - Blocking] `allowedHosts` not in Vite 5's ServerOptions type**
- **Found during:** Task 1 (typecheck)
- **Issue:** The plan-mandated `server.allowedHosts: true` (§6.5) is only typed in Vite 6; the project pins Vite 5.4.11, so `tsc -p web --noEmit` failed with TS2769.
- **Fix:** Type-widened the server block (`as ServerOptions & { allowedHosts: true }`) with a comment; the Vite 5 runtime honours the option.
- **Files modified:** web/vite.config.ts
- **Verification:** `npm run typecheck` exits 0.
- **Committed in:** `bd95df6`

**3. [Rule 1 - Bug] Skip link was not the first focusable element**
- **Found during:** Task 3 (e2e test 4)
- **Issue:** The plan's DOM-order list places Banner #1 and SkipLink #2, but its own stated truth requires the skip link to be the first focusable element; the banner's disclosure button preceded it.
- **Fix:** Render `<SkipLink/>` before `<Banner/>` in Shell (the skip link is visually hidden until focused, so no visual reordering).
- **Files modified:** web/src/shell/Shell.tsx
- **Verification:** e2e test 4 confirms `usa-skipnav` is the first tabbable and Enter moves focus into `main`.
- **Committed in:** `4520a22`

**4. [Rule 1 - Bug] Banner disclosure toggle never flipped aria-expanded**
- **Found during:** Task 3 (e2e test 3)
- **Issue:** A React-controlled banner toggle and `uswds.min.js` both bound the same `.usa-banner__button`; the two controllers fought and `aria-expanded` stayed `false` on keyboard activation.
- **Fix:** Reverted the banner to stock USWDS accordion markup and let `uswds.min.js` own the disclosure (managing `aria-expanded` and the hidden content).
- **Files modified:** web/src/shell/Banner.tsx
- **Verification:** e2e test 3 confirms Enter toggles `aria-expanded` true/false.
- **Committed in:** `4520a22`

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All four were necessary to make the pipeline compile, typecheck and pass the real-browser suite. No scope was added or removed — the shell, its landmarks, the two-item nav, focus management and the state components are exactly as specified.

## Known Stubs

None blocking. Two intentional transitional artefacts, both documented in the plan:
- `web/src/screens/NotBuiltYet.tsx` — the plan's explicit transitional placeholder for `/queue` (F8, Phase 4) and `/entries/new` (F6, Phase 3); its header names both phases and its scheduled deletion.
- `main.tsx`'s `signOut` redirects to `/sign-in` for now; plan 02-07 wires the real CSRF-guarded `DELETE /api/session` (the rotate-on-GET client half from 02-04). Documented inline.

## Issues Encountered
- A lingering background server from a manual debug run held port 3000 and made a fresh `CI=1` Playwright run fail with "port already used". Resolved by killing the stale PID; the suite then ran green from a clean slate. (`lsof -i:3000` reported nothing in this sandbox even while the process was alive — killing by process name pattern was avoided because `pkill -f "server/dist/index.js"` matches the invoking shell and hangs; killing by PID from `ps` is the reliable method here.)

## Deferred Issues
None. `npm run build`, `npm run test` (unit 111 + db 114 + api 75 + arch 67) and `npx playwright test e2e/shell.spec.ts` (16/16) all exit 0.

## User Setup Required
None - no external service configuration required (no `user_setup` in the plan frontmatter).

## Next Phase Readiness
- The shell every screen inherits is built and proven in a browser; plan 02-07 can replace the `/sign-in` `NotBuiltYet` with the real sign-in screen inside the reduced shell, and wire `api.getSession` (re-storing the CSRF token) and the CSRF-guarded sign-out.
- Plan 02-06's `GET /sign-in` positive-serve and unauthenticated-static-asset assertions are already delivered here (test 0), as the plan directed.
- Plan 02-09 can add the durable architecture version of the excluded-affordance scan using the same canonical term list.

## Self-Check: PASSED

- Created files verified on disk: all 24 present.
- Commits verified: `bd95df6`, `488cd68`, `4520a22` all in `git log`.
- Plan-level build check: `npm run build` → exit 0 (build:server + build:web).
- `## Known Stubs` present; no blocking stubs (two documented transitional artefacts).
- `npm run test` exits 0 (111 + 114 + 75 + 67); `npx playwright test e2e/shell.spec.ts` 16/16 passing from a clean slate with no ambient env.
- No `reports/` and no `.github/` directory; no accessibility scanner installed.

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-14*
