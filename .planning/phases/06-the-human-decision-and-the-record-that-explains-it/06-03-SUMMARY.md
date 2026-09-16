---
phase: 06-the-human-decision-and-the-record-that-explains-it
plan: 03
subsystem: ui
tags: [react, uswds, decision, provenance, idempotency-key, accessibility, playwright]

requires:
  - phase: 06-01
    provides: "POST /api/exceptions/{id}/decision (F11 write) + DecisionCreateRequest/DecisionRecordResponse contract types"
  - phase: 05-05
    provides: "the F10 CaseDetail screen this region is a section of, and the ProvenanceBadge control it extends"
provides:
  - "web/src/components/DecisionPanel.tsx — the real F12 decision region (chooser → edit/reject → pre-submission summary → server-driven confirmation)"
  - "api.postDecision(exceptionId, body, idempotencyKey) — the SPA's only exception-write call"
  - "ProvenanceBadge `modified` prop — the FR-12.6 Specialist-modified marker (text + icon)"
  - "CaseDetail wiring: DecisionPanel for an open undecided case, a read-only DecidedRecord otherwise"
  - "e2e/decision.spec.ts — the F12 region's own Playwright regression suite (8 scenarios)"
affects: [06-04 audit-trail, phase-6-uat, phase-6-verification]

tech-stack:
  added: []
  patterns:
    - "A form region as a client-side stage machine (chooser|edit|reject|summary|confirmed) that only leaves through a pre-submission summary (two-step commitment)"
    - "The confirmation panel and the read-only decided record render from server data only (DecisionValueDto), via one shared DecisionSummaryTable"
    - "An advisory client-side provenance preview computed with the SAME trim-then-byte-compare rule the server applies, so preview and record never disagree"
    - "Caller-minted Idempotency-Key carried through request()'s new extra-headers bag (spread first, so content-type/CSRF always win)"

key-files:
  created:
    - "web/src/components/DecisionPanel.tsx"
    - "e2e/decision.spec.ts"
  modified:
    - "web/src/api/client.ts"
    - "web/src/components/ProvenanceBadge.tsx"
    - "web/src/screens/CaseDetail.tsx"
    - "server/test/architecture/receiptPaths.spec.ts"

key-decisions:
  - "The read-only DecidedRecord IS the post-decision confirmation: a recorded decision refetches the whole case, so DecidedRecord renders the same 'Decision recorded' heading, the same server-driven values, and the same nav links the panel's in-place confirmation would — one view whether just-recorded or reloaded (FR-12.10/FR-12.11)."
  - "onConflict does NOT immediately refetch: the DecisionPanel's informational alert (with the server's already-decided/stale message) is the correct terminal state; a full-case refetch would tear that explanation down before the specialist reads it. The audit trail's own conflict refresh is 06-04's concern."
  - "recommendation_id is omitted from the APPROVE body: RecommendationDetailDto carries no id, and FR-11.16 only requires a match when supplied (it is optional)."

patterns-established:
  - "Stage-machine decision region rendering server-authoritative provenance"
  - "Shared DecisionSummaryTable for confirmed + recorded decision views"

duration: 14 min
completed: 2026-09-16
---

# Phase 6 Plan 03: F12 Decision Web UI Summary

**The "Your decision" region is real: three equally-weighted actions with no pre-selection, mandatory ≥10-char reasons on edit/reject, a two-step pre-submission summary, complete-value-set EDIT_APPROVE submission, and a confirmation whose provenance comes only from the server's 201 — proven end to end in a real browser.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-16T11:29:00Z
- **Completed:** 2026-09-16T11:43:00Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `DecisionPanel.tsx`: the full F12 chooser → edit/reject form → pre-submission summary → server-response-driven confirmation state machine, with the advisory changed-field marking mirroring the server's trim-then-byte-compare (FR-12.6), the COMPLETE-set EDIT_APPROVE body (never a diff, FR-12.7), 409/422/network branching (FR-12.9/12/13/14), a busy-gated single submit, and a caller-minted Idempotency-Key (FR-12.14).
- `api.postDecision` + a caller extra-headers bag on `request()` (spread first so content-type/CSRF can never be overridden), so the F12 write attaches the rotated CSRF token like every other call.
- `ProvenanceBadge` gained one optional, backward-compatible `modified` prop (F10's existing usages untouched) that swaps HUMAN text to "Specialist-modified" with the same icon/colour.
- `CaseDetail.tsx` renders the real DecisionPanel for an open, undecided case and a read-only `DecidedRecord` (the same server-driven confirmation shape) once a decision exists; the h1 re-focus is suppressed on a decision refetch so the confirmation heading owns focus.
- `e2e/decision.spec.ts`: 8 scenarios (all green) covering the three equal controls, the client + server reason gates, changed-field marking with server-sourced confirmation provenance, controls-gone-after-decision, the already-decided conflict, full keyboard operability, and no forbidden control.

## Task Commits

1. **Task 1: api.postDecision + ProvenanceBadge extension + DecisionPanel** — `2af4e9a` (feat)
2. **Task 2: Wire DecisionPanel into CaseDetail + Playwright suite** — `0193b4c` (feat)

**Plan metadata:** committed with STATE.md/SUMMARY.md (docs)

## Files Created/Modified
- `web/src/components/DecisionPanel.tsx` (created) — the F12 decision region + shared `DecisionSummaryTable`
- `e2e/decision.spec.ts` (created) — the region's Playwright regression suite
- `web/src/api/client.ts` — `postDecision`, `request()` extra-headers bag
- `web/src/components/ProvenanceBadge.tsx` — optional `modified` prop (FR-12.6 marker)
- `web/src/screens/CaseDetail.tsx` — `fetchCase` useCallback, `refetch` thread, DecisionPanel/DecidedRecord wiring, focus suppression on decision refetch
- `server/test/architecture/receiptPaths.spec.ts` — criterion-4 allowlist for the F11/F12 decision write

## Decisions Made
See `key-decisions` in the frontmatter. The load-bearing one: **the read-only DecidedRecord and the panel's in-place confirmation are one and the same server-driven "Decision recorded" view**, reached either by recording a decision (refetch) or by reloading a closed case — so FR-12.10 (confirmation from the 201) and FR-12.11 (controls gone, read-only record) are satisfied by a single rendering, and a decision refetch cannot leave the specialist without a confirmation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale architecture assertion forbade the F12 decision write**
- **Found during:** Task 2 (after wiring `api.postDecision`)
- **Issue:** `receiptPaths.spec.ts` criterion 4 ("no exception-authoring/mutation UI") scans `web/src` and failed on any state-changing method against an `/api/exceptions*` path. `api.postDecision` legitimately POSTs to `/api/exceptions/{id}/decision` — the F11/F12 human decision, the exact capability this phase exists to add. The test predated any exception write and was correct only while none existed.
- **Fix:** Allowlisted the `/decision` **sub-resource** POST specifically (a `DECISION_SUBRESOURCE` regex) while keeping every other mutating method against an exceptions path — and any mutation of the exception **collection** (opening/creating/raising) — forbidden. The client-specific check now permits GET or the POST-to-`/decision`, and still forbids PUT/PATCH/DELETE even on the decision sub-resource.
- **Files modified:** `server/test/architecture/receiptPaths.spec.ts`
- **Verification:** `npx vitest run server/test/architecture` → 153/153 green (receiptPaths 11/11)
- **Committed in:** `0193b4c` (Task 2 commit)

**2. [Rule 1 - Bug] Decision refetch clobbered the confirmation and stole focus**
- **Found during:** Task 2 (Playwright tests 4/5/7 failing: the "Decision recorded" heading never appeared)
- **Issue:** `onDecided` → `refetch()` sets the screen to `loading` and remounts `CaseLoaded`, unmounting the DecisionPanel's own `stage='confirmed'` panel; and the top-level h1 re-focus effect (parent effect, runs after child effects) then stole focus from any confirmation heading.
- **Fix:** Made the read-only `DecidedRecord` the canonical post-decision confirmation (same "Decision recorded" heading, server-driven `DecisionSummaryTable`, and nav links; grabs focus on mount and announces politely), and added a `skipH1FocusRef` so the h1 re-focus yields to `DecidedRecord` for exactly the decision-refetch edge. `onConflict` was changed to NOT refetch, so the panel's informational alert survives (FR-12.12/12.13).
- **Files modified:** `web/src/screens/CaseDetail.tsx`, `web/src/components/DecisionPanel.tsx` (via the shared table)
- **Verification:** `npx playwright test e2e/decision.spec.ts` → 8/8 green
- **Committed in:** `0193b4c` (Task 2 commit)

**3. [Rule 3 - Blocking] Raw-source verify greps tripped on comment prose; Playwright browser + OS deps absent**
- **Found during:** Task 1 (canned/select grep) and Task 2 (browser launch)
- **Issue:** The Task-1 verify greps the raw source for a select-control class and the pre-written-reason keyword — matching them even inside an explanatory comment (the same raw-source-scan pattern noted for 05-05's headers.spec). Separately, the sandbox had no Chromium binary or its system libraries, so Playwright could not launch.
- **Fix:** Reworded the DecisionPanel comment to avoid the literal tokens; ran `npx playwright install chromium` and `install-deps chromium`.
- **Files modified:** `web/src/components/DecisionPanel.tsx` (comment)
- **Verification:** the grep returns 0; Playwright launches and the suite runs.
- **Committed in:** `2af4e9a`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking). **Impact:** All necessary for correctness (server-authoritative provenance, focus, and a truthful architecture gate) and to run the suite. No scope creep — the receiptPaths change is a precise allowlist for the write this phase adds, nothing wider.

## Known Stubs
None found — the region is fully implemented (no TODO/FIXME/placeholder/not-implemented in any changed file).

## Issues Encountered
None beyond the deviations above. The stale `cargoexec-web` container (serving an old build on port 3000) was stopped so Playwright's `reuseExistingServer` would boot a fresh `node server/dist/index.js` from the current build; it was restarted afterward (web:200).

## User Setup Required
None — no external service configuration required. (The whole-stack compose AI-env gap remains 06-05's concern, unchanged by this plan.)

## Next Phase Readiness
- Ready for `06-04` (the audit-trail read region) — it attaches to the same `CaseDetail.tsx` "Audit trail" stub and can rely on `onDecided`'s refetch to re-read the case after a decision.
- The governed loop now closes in the browser: an open exception can be approved / edited-and-approved / rejected with a recorded, server-provenanced decision, and the region becomes read-only afterward.

## Self-Check: PASSED
- Created files exist: `web/src/components/DecisionPanel.tsx`, `e2e/decision.spec.ts`
- Task commits present: `2af4e9a`, `0193b4c`
- Plan-level build: `npm run build` → exit 0
- Typecheck: `npm run typecheck` → exit 0
- Playwright `e2e/decision.spec.ts`: 8/8 passed
- Architecture suite: 153/153 passed (receiptPaths 11/11)
- `## Known Stubs`: None found (no blocking stubs)
