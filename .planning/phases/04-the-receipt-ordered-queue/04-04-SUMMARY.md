---
phase: 04-the-receipt-ordered-queue
plan: 04
subsystem: ui
tags: [react, react-router, uswds, accessibility, queue, playwright, intl]

requires:
  - phase: 04-the-receipt-ordered-queue
    provides: "the live F7 API (GET /api/exceptions, GET /api/exceptions/:idOrReference) from 04-03, and the QueueResponse/CaseDetailResponse contract DTOs from 04-01"
provides:
  - "the F8 review-queue screen at /queue, replacing the NotBuiltYet placeholder"
  - "api.getQueue() and api.getCase(idOrReference) — the SPA's read client for the F7 endpoints"
  - "web/src/lib/formatDateTime.ts — the one fixed-locale absolute date+time formatter, reused unchanged by Phase 5/6 case-detail screens"
  - "e2e/queue.spec.ts — the review-queue browser proof (8 scenarios)"
  - "docs/a11y/queue.md — the signed NFR-2 accessibility record for /queue"
affects: [phase-5-case-detail, phase-6-audit-trail]

tech-stack:
  added: []
  patterns:
    - "GET-only read client methods follow getEntry's request() pattern (no CSRF header on GET)"
    - "one fixed-locale (en-GB) date formatter with runtime-independent 3-letter month names"
    - "wide data tables live in a focusable usa-table-container--scrollable region so the body never scrolls horizontally at 320px"

key-files:
  created:
    - web/src/screens/Queue.tsx
    - web/src/lib/formatDateTime.ts
    - e2e/queue.spec.ts
    - docs/a11y/queue.md
  modified:
    - web/src/api/client.ts
    - web/src/app/router.tsx
    - server/test/architecture/receiptPaths.spec.ts
    - e2e/sign-in.spec.ts

key-decisions:
  - "formatDateTime pins its own 3-letter month names rather than trusting Intl month:'short' — this runtime renders September as 'Sept', which drifts from the FRD 'Sep' shape reused across Phase 5/6"
  - "the queue table sits in a scrollable focusable region (USWDS usa-table-container--scrollable) so a wide table scrolls within itself, never the document body, at 320px"
  - "receiptPaths.spec.ts test 9's blanket 'client names no /api/exceptions path' assertion was narrowed to its true intent — GET reads are permitted, only a mutating method against an exception collection is the offence"

patterns-established:
  - "F8 read client: GET-only api.getQueue/getCase, no CSRF header, mirrors getEntry"
  - "screens reuse Loading/Empty/ErrorState from components/states.tsx verbatim (no re-implementation)"

duration: 27 min
completed: 2026-09-15
---

# Phase 4 Plan 04: The Receipt-Ordered Queue Web UI Summary

**The F8 review-queue screen rendered against the live F7 API — a receipt-ordered accessible USWDS table with loading/empty/error/truncated states, keyboard-and-pointer case links, an explicit-Refresh contract, a shared fixed-locale date formatter, an 8-scenario Playwright proof, and a signed NFR-2 accessibility record.**

## Performance

- **Duration:** ~27 min
- **Started:** 2026-09-15T20:14Z
- **Completed:** 2026-09-15T20:26Z
- **Tasks:** 3
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- `/queue` now serves the real F8 screen: one accessible `<table>` in exact API (receipt) order, per-row `<Link>` case activation by keyboard Enter and pointer, a truncation notice, empty and error states reusing the shared components, and FR-8.9 polite/assertive announcements.
- Two GET-only read client methods (`api.getQueue`, `api.getCase`) wired to the live F7 endpoints.
- A single fixed-locale date formatter (`formatDateTime`) that renders the FRD's "11 Sep 2026, 14:32" shape identically on any runtime — the reusable date primitive Phase 5/6 inherit.
- A full end-to-end Playwright proof: create a real exception via the API, see it as a row, open it by keyboard, and return to a re-fetched, re-focused queue — plus mocked empty/truncated/error coverage and forbidden-affordance absence.
- The signed `docs/a11y/queue.md` NFR-2 record with every checklist line citing a real passing test.

## Task Commits

1. **Task 1: api client methods + shared date formatter** — `a17161b` (feat)
2. **Task 2: the Queue screen, its Playwright proof, and router wiring** — `fb0484f` (feat)
3. **Task 3a: code deviations (table scroll region, arch-spec narrowing, sign-in de-flake)** — `3c43a97` (fix)
4. **Task 3b: the NFR-2 accessibility sign-off record** — `baac039` (docs)

## Files Created/Modified
- `web/src/screens/Queue.tsx` — the F8 review-queue screen (created)
- `web/src/lib/formatDateTime.ts` — fixed-locale absolute date+time formatter (created)
- `e2e/queue.spec.ts` — 8-scenario review-queue browser proof (created)
- `docs/a11y/queue.md` — signed NFR-2 accessibility record (created)
- `web/src/api/client.ts` — added `getQueue`/`getCase` (modified)
- `web/src/app/router.tsx` — routes `/queue` to `<Queue/>` (modified)
- `server/test/architecture/receiptPaths.spec.ts` — narrowed test 9 to permit GET reads (modified)
- `e2e/sign-in.spec.ts` — de-flaked test 2's clear-cookies/navigate race (modified)

## Decisions Made
See key-decisions in frontmatter. In brief: the date formatter pins its own month names for cross-runtime stability; the table is wrapped in a scrollable focusable region for 320px reflow; the stale receiptPaths assertion was corrected to its real GET-vs-mutation intent.

## Known Stubs
None found. `Queue.tsx` fully implements the FRD screen; the only `NotBuiltYet` reference is an intentional comment in the e2e spec noting the still-placeholder `/cases/:ref` destination (Phase 5's deliverable, correctly left in place — its deletion condition is not yet met).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] formatDateTime rendered "Sept" instead of "Sep"**
- **Found during:** Task 2 (e2e test 7)
- **Issue:** `Intl.DateTimeFormat('en-GB', { month: 'short' })` renders September as "Sept" (4 letters) on this runtime's ICU build, drifting from the FRD's "11 Sep 2026" example and from the shape Phase 5/6 will reuse.
- **Fix:** the formatter now derives the LOCAL day/month/year via `formatToParts` and maps the month index to a module-pinned 3-letter table; day/year/time still come from Intl so the local calendar day and wall-clock time are honoured.
- **Files modified:** web/src/lib/formatDateTime.ts
- **Verification:** e2e/queue.spec.ts test 7 passes (`/\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/`, no relative phrasing).
- **Committed in:** fb0484f (Task 2 commit)

**2. [Rule 1 - Bug] the queue table scrolled the document body horizontally at 320px**
- **Found during:** Task 3 (shell.spec.ts test 14, which navigates to /queue)
- **Issue:** the real four-column table overflowed the viewport at 320px, causing document-body horizontal scroll — a reflow/accessibility failure the old NotBuiltYet `/queue` never exposed.
- **Fix:** wrapped the table in USWDS `usa-table-container--scrollable` with `role="region"`, `tabIndex={0}` and an aria-label, so the table scrolls within its own focusable region.
- **Files modified:** web/src/screens/Queue.tsx
- **Verification:** shell.spec.ts test 14 passes; queue suite still green.
- **Committed in:** 3c43a97

**3. [Rule 3 - Blocking] receiptPaths.spec.ts test 9 blocked the phase gate**
- **Found during:** Task 3 (`npm run test`)
- **Issue:** a stale architecture assertion ("api/client.ts references no /api/exceptions path — no exception mutation exists yet") pre-dated the F8 read client and failed the moment Task 1 legitimately added the GET read routes.
- **Fix:** narrowed the assertion to its true intent (criterion 4) — the client may reference an exceptions path only under GET; a POST/PUT/PATCH/DELETE against an exception collection is the offence. The test's own first half already enforced exactly this.
- **Files modified:** server/test/architecture/receiptPaths.spec.ts
- **Verification:** receiptPaths.spec.ts 11/11 green; `npm run test:arch` 148/148 green.
- **Committed in:** 3c43a97

**4. [Rule 1 - Bug] sign-in.spec.ts test 2 flaked with net::ERR_ABORTED**
- **Found during:** Task 3 (full playwright run)
- **Issue:** the real Review-queue screen fires `GET /api/exceptions` on mount; test 2 lands on `/queue`, then immediately `clearCookies()` + `goto('/sign-in')`, racing the in-flight fetch — Chromium aborted the new document request. The old NotBuiltYet `/queue` made no request, so 04-04 exposed the latent race.
- **Fix:** wait for `networkidle` on `/queue` before clearing cookies and re-navigating (`waitUntil: 'domcontentloaded'`).
- **Files modified:** e2e/sign-in.spec.ts
- **Verification:** test 2 passed 3× in isolation and in the full `test:all` run.
- **Committed in:** 3c43a97

---

**Total deviations:** 4 auto-fixed (2 bugs in this plan's own code, 1 blocking stale arch assertion, 1 pre-existing flake that 04-04 aggravated).
**Impact on plan:** all four were necessary for correctness and a green phase gate. No scope creep — no new capability, control, or route was added; the exclusion invariants (no filter/sort/assign/priority/search) remain proven by the untouched navigation.spec.ts scan and e2e test 2.

## Issues Encountered
- The plan's Task 2 verify command used `--reporter=list` for the vitest nav-scan; vitest rejects that (it is a Playwright reporter). Ran the vitest nav scan with the default reporter instead (11/11 pass). No code impact.
- Playwright's Chromium browser and its Linux system deps were not installed in the sandbox; installed via `npx playwright install chromium` + `install-deps chromium` (Rule 3 blocking, resolved) before the e2e tiers could run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 is COMPLETE: 04-01 (read model), 04-02 (composition services), 04-03 (HTTP surface), 04-04 (web UI) all have summaries and green gates.
- All five phase success criteria are observable end-to-end: receipt-ordered accessible list; one-action case open + disorientation-free return; closed cases absent from the open list but reachable by reference (API tier in 04-03, rendered absence here); zero choice controls anywhere on screen; a plain, actionable empty state.
- `api.getCase(idOrReference)` and `web/src/lib/formatDateTime.ts` are ready, unchanged, for Phase 5's case-detail screen. `/cases/:caseReference` remains a `NotBuiltYet` placeholder (Phase 5's deliverable).
- `npm run test:all` is fully green: unit 218, db 175, api 124, arch 148, e2e 37 — 0 failures, 0 skipped.

## Self-Check: PASSED
- Created files exist on disk: Queue.tsx, formatDateTime.ts, queue.spec.ts, queue.md — all FOUND.
- Task commits exist: a17161b, fb0484f, 3c43a97, baac039 — all FOUND.
- Plan-level build ran and passed: `npm run build` → exit 0; `npm run test:all` (the phase gate) → exit 0 (665 unit/db/api/arch + 37 e2e, 0 failures, 0 skipped).
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 04-the-receipt-ordered-queue*
*Completed: 2026-09-15*
