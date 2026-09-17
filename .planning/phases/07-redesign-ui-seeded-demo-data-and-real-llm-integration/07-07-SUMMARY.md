---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 07
subsystem: ui
tags: [carbon, react, sign-in, accessibility, uswds-migration, inline-notification, grid]

# Dependency graph
requires:
  - phase: 07-06
    provides: "Carbon-rebuilt shared form pattern (Field/SubmitButton/UswdsForm) and ErrorSummary — consumed via UNCHANGED imports"
  - phase: 07-05
    provides: "Carbon application shell (SkipToContent → a.cds--skip-to-content, Header, Footer, Banner) that these three screens render inside"
provides:
  - "SignIn.tsx rendered entirely on Carbon (Grid/Column + InlineNotification) with byte-identical failure-handling logic"
  - "NotBuiltYet.tsx and NotFound.tsx rendered on Carbon with zero usa-* class remaining"
  - "docs/a11y/sign-in.md re-signed against the Carbon rebuild"
  - "e2e/sign-in.spec.ts updated to Carbon DOM locators; 13/13 passing"
  - "carbon-conformance-register rows for the sign-in form, its two inline notices, NotBuiltYet, and NotFound"
affects: [07-10, phase-7-final-cleanup, verify-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Screen-level USWDS→Carbon swap as a pure consumption exercise: import the 07-06 shared components unchanged, replace only the screen's own remaining usa-* markup (layout + inline alerts)"
    - "Carbon InlineNotification for a screen's own inline notices (kind=info/success, role=status); link/content carried in children (Carbon types subtitle as string)"
    - "Carbon Grid/Column responsive column-span (sm=4 md=4 lg=6) replacing USWDS grid-col-12 tablet:grid-col-6 desktop:grid-col-4"

key-files:
  created:
    - .planning/phases/07-redesign-ui-seeded-demo-data-and-real-llm-integration/07-07-SUMMARY.md
  modified:
    - web/src/screens/SignIn.tsx
    - web/src/screens/NotBuiltYet.tsx
    - web/src/screens/NotFound.tsx
    - e2e/sign-in.spec.ts
    - docs/a11y/sign-in.md
    - docs/carbon-conformance-register.md
    - .planning/phases/07-redesign-ui-seeded-demo-data-and-real-llm-integration/deferred-items.md

key-decisions:
  - "SignIn's remaining USWDS markup (grid layout + the expired/signed-out inline alerts) moved to Carbon Grid/Column + InlineNotification; the ErrorSummary failure alert was already Carbon via 07-06 and was left untouched"
  - "NotBuiltYet's OTHER-nav-destination Link lives in the InlineNotification children slot because Carbon types subtitle as string"
  - "e2e skip-link check now accepts a border-based focus indicator (Carbon's SkipToContent uses border:4px + outline:none, the opposite of USWDS's outline token)"

patterns-established:
  - "A screen migrating from USWDS to Carbon touches only its own markup and consumes 07-05/07-06 unchanged — the shared-component contract requires zero consumer-side prop changes (proven by typecheck + green e2e)"

# Metrics
duration: 22 min
completed: 2026-09-17
---

# Phase 7 Plan 07: Sign-in / NotBuiltYet / NotFound Carbon Rebuild Summary

**The authentication entry point and both fallback screens now render entirely on Carbon (Grid/Column + InlineNotification) via the unchanged 07-06 shared components, with byte-identical sign-in failure-handling and the sign-in a11y record re-signed — proving the 07-05/07-06 contract needs no consumer-side edits.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-17T02:03:00Z (approx)
- **Completed:** 2026-09-17T02:25:27Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- **SignIn.tsx** rebuilt on Carbon: the USWDS `grid-row`/`grid-col-12 tablet:grid-col-6 desktop:grid-col-4` layout became Carbon `Grid`/`Column` (`sm=4 md=4 lg=6`); the two inline session notices (`usa-alert--info` "Your session expired…", `usa-alert--success` "You are signed out.") became Carbon `InlineNotification` (`kind="info"`/`"success"`, `role="status"`), wording verbatim. It consumes the unchanged 07-06 `Field`/`SubmitButton`/`UswdsForm`/`ErrorSummary` imports. **No behavioural change:** the single generic fieldless error on credential failure, no-`aria-invalid`/no-field-leak rule, the 422 per-field path, password-cleared/email-retained, and every deliberate absence are byte-identical.
- **NotBuiltYet.tsx** and **NotFound.tsx** rebuilt on Carbon: `usa-alert--info` → Carbon `InlineNotification kind="info"` (role=status, OTHER-nav-destination Link in children); `usa-prose` → `cargoexec-prose` with Carbon global typography. `useScreenFocus`, the NAV_ITEMS "other destination" logic, and the deliberate-absence constraints are unchanged.
- **docs/a11y/sign-in.md** re-signed against the Carbon rebuild with updated checklist references (skip link → `a.cds--skip-to-content`, error summary → `.cargoexec-error-summary`), a Carbon-rebuild re-sign block, and no new defect.
- **e2e/sign-in.spec.ts** updated to Carbon DOM: `a.usa-skipnav` → `a.cds--skip-to-content`, `[role="alert"].usa-alert--error` → `getByRole('alert')` + `.cargoexec-error-summary`, and the skip-link focus-indicator check now accepts Carbon's border-based indicator. **13/13 scenarios pass** against a real server + DB.
- **carbon-conformance-register.md** gained four additive rows (sign-in form, sign-in session notices, NotBuiltYet notice, NotFound screen), re-applied after a concurrent-branch race dropped them.

## Task Commits

1. **Task 1: Rebuild SignIn on Carbon; re-sign a11y record** — originally `adcac44` (detached by a concurrent sibling commit), re-committed as `e31d204`
2. **Task 2: Rebuild NotBuiltYet and NotFound on Carbon** — `cb06e36`
3. **Task 1 verification fix: skip-link focus-indicator check** — `c9ddd22`

## Files Created/Modified

- `web/src/screens/SignIn.tsx` — Carbon Grid/Column + InlineNotification; unchanged failure logic
- `web/src/screens/NotBuiltYet.tsx` — Carbon InlineNotification; unchanged NAV_ITEMS + deliberate absences
- `web/src/screens/NotFound.tsx` — Carbon prose typography; plain prose + /queue link, no alert role
- `e2e/sign-in.spec.ts` — Carbon DOM locators; skip-link border-indicator check; 13/13 green
- `docs/a11y/sign-in.md` — Carbon rebuild re-sign
- `docs/carbon-conformance-register.md` — 4 additive rows
- `.planning/.../deferred-items.md` — parallel wave-4 CaseDetail/Queue build-breakage log (resolved when siblings committed)

## Decisions Made

- SignIn's `ErrorSummary` failure alert was already Carbon (07-06); only the two screen-owned inline notices (expired/signed-out) and the layout needed migrating.
- NotBuiltYet's Link goes in `InlineNotification` children, not `subtitle` (Carbon types `subtitle` as `string`).
- The skip-link e2e check accepts a border/outline/box-shadow focus indicator, matching Carbon `SkipToContent`'s `border:4px + outline:none` mechanism.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] e2e skip-link focus-indicator assertion incompatible with Carbon's border-based indicator**
- **Found during:** Task 1 verification (running the full `e2e/sign-in.spec.ts`)
- **Issue:** After swapping the step-9 skip-link locator to `a.cds--skip-to-content`, the assertion still required a non-`none` `outline-style`. Carbon's `SkipToContent` paints its focus indicator with `border: 4px solid $focus` and explicitly sets `outline: none` on `:focus` (verified in `@carbon/styles` ui-shell header), so the test failed (1/13).
- **Fix:** the skip-link check now accepts any of border / outline / box-shadow as the painted indicator (the same shape the three form-control checks already use).
- **Files modified:** `e2e/sign-in.spec.ts`
- **Verification:** full `e2e/sign-in.spec.ts` re-run → 13/13 passing.
- **Committed in:** `c9ddd22`

**2. [Rule 3 - Blocking] Concurrent-branch race detached the Task 1 commit; re-committed on current HEAD**
- **Found during:** Task 2 commit
- **Issue:** A concurrent wave-4 sibling's commit (07-09, `f60148f`) landed between this plan's Task 1 (`adcac44`) and Task 2 commits, so Task 2 (`cb06e36`) branched from `f60148f` rather than from `adcac44` — detaching the SignIn Task 1 work from branch HEAD, and the shared conformance register temporarily lost this plan's rows. `cb06e36` also swept in some already-staged parallel-plan working-tree changes (an artefact of the shared index during concurrent execution); those files belong to 07-08/07-09 and their owners' own commits carry the authoritative versions.
- **Fix:** re-committed the intact working-tree Task 1 changes (SignIn.tsx, sign-in.spec.ts, sign-in.md, deferred-items.md) plus the re-applied register rows on top of current HEAD (`e31d204`), per the coordination note ("on a commit conflict, re-read and re-apply your rows").
- **Files modified:** re-committed `web/src/screens/SignIn.tsx`, `e2e/sign-in.spec.ts`, `docs/a11y/sign-in.md`, `docs/carbon-conformance-register.md`, `deferred-items.md`
- **Verification:** `git show HEAD:` confirms all sign-in Carbon markup, the a11y re-sign, and the four register rows are present in HEAD; the queue rows (07-08) were preserved.
- **Committed in:** `e31d204`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking/concurrency). **Impact:** both necessary for a correct, complete, green result. No scope creep — the sign-in rebuild's logic and the two fallback screens were delivered exactly as specified; the deviations were a test-assertion correction and a git-race reconciliation.

## Known Stubs

None found. NotBuiltYet is an intentional transitional placeholder screen (its documented purpose per the plan objective — "rendered at /entries/new until F6 exists"), not an incomplete implementation.

## Deferred Issues

None for this plan's own scope. The transient full-build breakage caused by sibling wave-4 plans' (07-08 queue, 07-09 case-detail) in-flight `Queue.tsx`/`CaseDetail.tsx` edits (logged in `deferred-items.md`) **resolved on its own** once those siblings committed: `npm run build` and `tsc -p web --noEmit` both exit 0 with all wave-4 work integrated.

## Issues Encountered

- Concurrent execution on the shared `phase-7` branch made the git index and the shared conformance register volatile mid-plan (see Deviation 2). Handled by re-reading and re-committing per the coordination note.

## User Setup Required

None — no external service configuration required by this plan.

## Verification Evidence

- `npm run build` → exit 0 (server build + CSS compile + asset copy + vite bundle, 966 modules)
- `tsc -p web --noEmit` → exit 0 (SignIn/NotBuiltYet/NotFound all clean)
- `npx vitest run server/test/architecture/navigation.spec.ts` → 11/11 (route-table assertion intact)
- `npx playwright test e2e/sign-in.spec.ts` (against real server + `cargoexec-db` postgres:16.4, `AI_PROVIDER_URL=fake:deterministic`) → **13/13 passing**, covering field input, invalid-credentials generic failure (password cleared / email retained / zero aria-invalid), the identical-screen unknown-email case, double-submit blocking (aria-disabled), the expired/signed-out notices, focus indicators (form controls + Carbon skip link), iframe embedding, and 320px reflow.

## Next Phase Readiness

- Three of the eighteen USWDS-coupled files are now fully Carbon-rendered with zero behavioural regression; the shared-component contract from 07-05/07-06 is proven to require no consumer-side prop changes.
- Ready for the remaining wave-4 / later screen-redesign plans (07-08, 07-09, 07-10) and the eventual Phase-7 final-cleanup plan (which owns deleting the retired `_tokens.scss` seam and renaming `UswdsForm.tsx`).

## Self-Check: PASSED

- Created files exist on disk: SignIn.tsx, NotBuiltYet.tsx, NotFound.tsx, docs/a11y/sign-in.md, 07-07-SUMMARY.md — all FOUND.
- Task commits reachable: `cb06e36`, `e31d204`, `c9ddd22` — all FOUND.
- Plan-level build ran: `npm run build` → exit 0; `tsc -p web --noEmit` → exit 0.
- `## Known Stubs` section present; no blocking stubs (NotBuiltYet is an intentional transitional placeholder, not a stub).
- Full `e2e/sign-in.spec.ts` → 13/13 passing against a real server + DB.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
