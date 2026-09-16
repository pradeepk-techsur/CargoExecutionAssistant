---
phase: 05-ai-recommendation-as-an-un-applied-proposal
plan: 05
subsystem: ui
tags: [react, react-router, uswds, provenance, recommendation, polling, accessibility, f10]

# Dependency graph
requires:
  - phase: 05-03
    provides: "GET /api/exceptions/:exceptionId/recommendation (F9 polling endpoint, all three PENDING/AVAILABLE/UNAVAILABLE shapes)"
  - phase: 05-04
    provides: "the async in-process generation worker that drives a PENDING recommendation to a terminal status"
  - phase: 04-04
    provides: "api.getCase, CaseDetailResponse read model, Queue.tsx row-link target /cases/:case_reference"
  - phase: 02
    provides: "states.tsx (Loading/ErrorState/Degraded/ReadOnlyNotice), useScreenFocus, LiveRegions/useAnnounce, formatDateTime, router table, USWDS token bundle"
provides:
  - "web/src/components/ProvenanceBadge.tsx — the shared AI-suggested / Specialist-entered per-value badge (text + icon + token colour)"
  - "web/src/api/client.ts api.getRecommendation(exceptionId) — the F9 polling client method"
  - "web/src/screens/CaseDetail.tsx — the F10 case-detail screen with the full normative section order and all four recommendation presentations"
  - "/cases/:caseReference now serves the real F10 screen (was NotBuiltYet)"
affects: [phase-6-decision, phase-6-audit-trail, 05-06-accessibility-signoff]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-value provenance badge: one shared control, distinguished by text + icon + token colour (never colour alone) — inherited by every value display from here"
    - "Section-driven in-page navigation: an 'On this page' <nav> whose links are native #fragment anchors to <h2 id> targets (no JS interception, not a useScreenFocus moment)"
    - "Poll-in-place lifecycle: setTimeout-chained 3s poll bounded to 60s, updating a section in place and announcing politely without moving focus"

key-files:
  created:
    - "web/src/components/ProvenanceBadge.tsx"
    - "web/src/screens/CaseDetail.tsx"
  modified:
    - "web/src/api/client.ts"
    - "web/src/app/router.tsx"

key-decisions:
  - "The AVAILABLE comparison rows read the submitted value from the loaded entry.values (EntryValues), not from RecommendationDetailDto — the DTO carries only the proposed values, so the submitted side is passed down from the case load"
  - "The 'On this page' links are native fragment anchors with no onClick/preventDefault — browser default scroll-and-focus is the wanted behaviour and is explicitly NOT one of useScreenFocus's four focus moments"
  - "The retry path re-invokes api.getCase directly (the mount effect is keyed on caseReference, which is unchanged on a retry) rather than toggling a synthetic key"

patterns-established:
  - "ProvenanceBadge is THE per-value provenance control; later value displays render through it"
  - "A degraded/absent AI recommendation is a stated condition (Degraded/heading), never an ErrorState — parking a case is worse than deciding it"

# Metrics
duration: 4 min
completed: 2026-09-15
---

# Phase 5 Plan 05: F10 Case-Detail & Recommendation Presentation UI Summary

**The F10 case-detail screen renders the full normative section order — header, an unconditional "On this page" in-page nav, why-open findings, the badged submitted entry, and all four AI-recommendation presentations (PENDING with a 3s poll, stale, AVAILABLE, UNAVAILABLE) — read-only, with uuid→case-reference URL canonicalisation, served at /cases/:caseReference.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-15T22:49:36Z
- **Completed:** 2026-09-15T22:53:19Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `ProvenanceBadge` — the single shared control that marks every AI-suggested and specialist-entered value, distinguished by TEXT ("AI-suggested" / "Specialist-entered") + a distinct USWDS sprite icon (`settings` / `person`) + a distinct token colour pair, so it is legible in monochrome and through a screen reader (phase success criterion 2, WCAG 1.4.1).
- `api.getRecommendation(exceptionId)` — the F9 polling client method (GET, no CSRF header, matching getCase/getQueue).
- `CaseDetail.tsx` — the F10 screen: one `<h1>`, then `<h2>`s in the exact FR-10.10 order, each carrying the id its "On this page" link targets; "Why this case is open" (server-order findings verbatim, no severity language); "Submitted entry" (all 14 fields with plain-language labels, HUMAN badge only when a value is present); "AI recommendation" branching on all four statuses; and heading-only Phase 6 stubs for "Your decision" and "Audit trail".
- The recommendation section polls every 3s while PENDING (setTimeout-chained so a slow response cannot overlap), stops at a terminal status / after 60s / on unmount, updates in place, announces the FR-10.7 sentence politely, and never moves focus.
- uuid→case-reference canonicalisation (FR-10.13) via react-router `navigate(..., {replace:true})` — address-bar change with no full reload and no focus move.
- Dedicated "Case not found" presentation (FR-10.15); read-only throughout (FR-10.12) — no `<select>`, no `<textarea>`, no mutation control, the only `<button>` being the "Try again" inside the reused `ErrorState`.
- `/cases/:caseReference` now serves the real screen in place of `NotBuiltYet` (audit route left as NotBuiltYet for Phase 6).

## Task Commits

1. **Task 1: ProvenanceBadge + api.getRecommendation** — `ce292d3` (feat)
2. **Task 2: CaseDetail screen + router wiring** — `2f48cc6` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md, committed next)_

## Files Created/Modified

- `web/src/components/ProvenanceBadge.tsx` — the shared per-value provenance badge (text + icon + token colour).
- `web/src/screens/CaseDetail.tsx` — the F10 case-detail screen.
- `web/src/api/client.ts` — added `api.getRecommendation` and the `RecommendationDetailDto` import.
- `web/src/app/router.tsx` — `/cases/:caseReference` now renders `CaseDetail`.

## Decisions Made

- **Submitted value source for the AVAILABLE comparison rows:** `RecommendationDetailDto` carries only the AI-proposed values, so the submitted side of each comparison row is read from the loaded `entry.values` (`EntryValues`), passed down from the case load into the recommendation section. A proposal against a `null` submitted value is presented as an "Adding:" addition, otherwise a "Changing:" change (FR-10.3).
- **In-page nav uses native fragment anchors** (`href="#id"`) with no `onClick`/`preventDefault`: the browser's default scroll-and-focus-to-target is exactly the wanted behaviour and is explicitly NOT one of `useScreenFocus`'s four focus moments (FR-10.10).
- **Retry re-invokes `api.getCase` directly** rather than toggling a synthetic key, because the mount effect is keyed on `caseReference` (unchanged on a retry) and would not re-fire.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded a code comment to avoid the forbidden `dangerouslySetInnerHTML` token**
- **Found during:** Task 2 (full architecture suite run)
- **Issue:** `headers.spec.ts`'s D-1 source guarantee scans RAW web/src source (no comment stripping) for the literal string `dangerouslySetInnerHTML`; my T-05-13 threat-model comment named the prop to document that it is deliberately unused, which tripped the scan (1 failing test).
- **Fix:** Reworded the comment to describe "the only such React prop" without writing the literal token, preserving the documented intent.
- **Files modified:** `web/src/screens/CaseDetail.tsx`
- **Verification:** `npx vitest run server/test/architecture` → 153/153 pass; `npm run typecheck` and `npm run build` still green.
- **Committed in:** `2f48cc6` (Task 2 commit)

**2. [Rule 1 - Bug] Removed a placeholder helper that would have rendered every comparison row as "Not provided"**
- **Found during:** Task 2 (while wiring the AVAILABLE presentation)
- **Issue:** An initial `findSubmittedValue` helper always returned `null`, because I first assumed the submitted value lived on the recommendation DTO; it does not, so every comparison row would have shown "Not provided" for the submitted side — a real presentation bug (a blocking stub had it shipped).
- **Fix:** Threaded the loaded `entry.values` (`EntryValues`) down into the recommendation section and read the submitted value from it; deleted the placeholder helper.
- **Files modified:** `web/src/screens/CaseDetail.tsx`
- **Verification:** `npm run typecheck` green; the AVAILABLE branch now reads real submitted values and correctly distinguishes Adding vs Changing.
- **Committed in:** `2f48cc6` (Task 2 commit — caught and fixed before commit)

---

**Total deviations:** 2 auto-fixed (2 bugs). **Impact on plan:** Both were caught and corrected before the Task 2 commit landed a broken state; no scope creep, no architectural change. The plan executed as written otherwise.

## Verification Ran

- `npm run typecheck` → exit 0 (contract + server build, web `--noEmit`).
- `npm run build` → exit 0 (server + css + assets + vite; Sass deprecation warnings are pre-existing USWDS internals, not from this plan's code).
- `npx vitest run server/test/architecture` → 153/153 pass (absence, navigation, receiptPaths, headers, validation, privileges, aiCapability, schema) — 0 regressions against the new files.
- `npm run test:unit` → 297/297; `npm run test:api` → 136/136.
- Structural proofs: each of the five `<h2>` ids (`why-open`, `submitted-entry`, `ai-recommendation`, `your-decision`, `audit-trail`) present exactly once; exactly five `href="#..."` in-page links (FR-10.10).

_Note: `test:db` requires a provisioned database and was not run here; this plan touches only `web/src` (no `server/src` or migration change), so the db tier is unaffected. Playwright/e2e browser proof of activating each in-page link and the accessibility sign-off are plan 05-06's job, as the plan states._

## Known Stubs

- **"Your decision" and "Audit trail" sections** (`web/src/screens/CaseDetail.tsx`) — heading-only stubs by design (Phase 6 owns F11/F12 decision controls and F14 audit-trail rendering). Cosmetic/deferred per the phase scope note, not blocking: the plan's objective (present the case, findings, and recommendation with marked provenance) works fully. The FR-10.10 in-page-nav requirement for these headings is satisfied now.
- No blocking stubs. No TODO/FIXME/placeholder markers in the changed files.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05-06 (accessibility sign-off) is ready: it owns adding `ProvenanceBadge` to `docs/uswds-conformance-register.md`, the Playwright/e2e proof that each "On this page" link moves to the right heading, and the per-screen a11y register for the case-detail screen.
- Phase 6 (F11/F12 decision + F14 audit trail) has its attachment points: the `#your-decision` and `#audit-trail` heading stubs, the `permitted_decisions` matrix already on `CaseDetailResponse`, and the read-only-when-closed defensive branch (FR-10.11) documented as deliberately deferred for the full decision-values rendering.

---
*Phase: 05-ai-recommendation-as-an-un-applied-proposal*
*Completed: 2026-09-15*

## Self-Check: PASSED

- `web/src/components/ProvenanceBadge.tsx` — FOUND
- `web/src/screens/CaseDetail.tsx` — FOUND
- `web/src/api/client.ts` — FOUND (modified)
- `web/src/app/router.tsx` — FOUND (modified)
- Commit `ce292d3` — FOUND
- Commit `2f48cc6` — FOUND
- Build check: `npm run build` → exit 0
- `## Known Stubs` section present; no blocking stubs.
