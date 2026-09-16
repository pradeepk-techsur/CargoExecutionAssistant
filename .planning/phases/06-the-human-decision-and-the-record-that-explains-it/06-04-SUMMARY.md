---
phase: 06-the-human-decision-and-the-record-that-explains-it
plan: 04
subsystem: ui
tags: [react, audit-trail, provenance, uswds, playwright, F14, F13]

# Dependency graph
requires:
  - phase: 06-02
    provides: "GET /api/exceptions/:exceptionId/audit + AuditTrailResponse/AuditEntryDto DTOs — the read this region renders"
  - phase: 06-03
    provides: "CaseDetail fetchCase/refetch plumbing + DecisionPanel wiring the audit refresh keys off"
  - phase: 05-05
    provides: "CaseDetail F10 screen with the heading-only 'Audit trail' stub this replaces; ProvenanceBadge; states.tsx; formatDateTime"
provides:
  - "web/src/components/AuditTrailRegion.tsx — the F14 chronological per-case audit-trail region"
  - "api.getAuditTrail(exceptionId) — the typed client read of the F13 endpoint"
  - "the /cases/:caseReference/audit deep-link route rendering CaseDetail with focusAuditTrail (FR-14.11)"
  - "the post-decision live refresh of the trail via a bumped caseVersion refreshToken (FR-14.12)"
  - "e2e/audit-trail.spec.ts — the F14 Playwright regression suite (10 scenarios)"
affects: [06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "refreshToken counter: CaseDetail bumps caseVersion on every successful fetchCase; a child re-reads by watching that number, never by polling"
    - "one-time deep-link focus guarded by a ref so a later refresh does not re-steal focus (focus-moves-at-four-moments discipline)"
    - "e2e chain tamper: drop the two audit_entries immutability triggers as owner, UPDATE one entry_hash with gen_random_bytes(32), re-create the triggers in a finally"

key-files:
  created:
    - "web/src/components/AuditTrailRegion.tsx"
    - "e2e/audit-trail.spec.ts"
  modified:
    - "web/src/api/client.ts"
    - "web/src/screens/CaseDetail.tsx"
    - "web/src/app/router.tsx"
    - "e2e/case-detail.spec.ts"

key-decisions:
  - "The F14 RECOMMENDATION_UNAVAILABLE action label ('No AI recommendation available') deliberately matches the F10 section heading; case-detail.spec test 2 was scoped to .first() rather than renaming the FRD-normative label"
  - "FIELD_LABELS is duplicated verbatim from CaseDetail.tsx into AuditTrailRegion.tsx (a documented small duplication) rather than extracting a shared labels module for a single reuse"
  - "The e2e chain tamper drops/re-creates only the two audit_entries immutability triggers (never the audit_reject_mutation function) and restores them in a finally, keeping the store append-only for every other test"

patterns-established:
  - "Audit provenance Origin column is TEXTUAL ('AI-suggested'/'Specialist-entered'), distinct from the per-value ProvenanceBadge — the FRD's fourth column is words, not a second badge"

# Metrics
duration: 10 min
completed: 2026-09-16
---

# Phase 6 Plan 04: Per-Case Audit Trail Web UI (F14) Summary

**The F14 audit-trail region: the complete per-case history rendered in server order with per-value AI/HUMAN provenance, verbatim reasons, the chain-integrity statement, a `/cases/{ref}/audit` deep link, and an in-place refresh after every decision — read-only by construction, no export, no second tool.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-16T11:47:57Z
- **Completed:** 2026-09-16T11:57:35Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `AuditTrailRegion.tsx` renders every event the F13 writer recorded, in ascending `case_sequence`, oldest first, with no truncation/re-ordering/filtering: the eight-row normative action-label table, per-event Who → When → What changed (FR-14.14 DOM order), verbatim line-preserving reasons under "Reason given" (FR-14.5), and a real `<table>` (caption + `scope="col"`) of before/after values with a ProvenanceBadge on each present side and the after-origin stated in words.
- The AI actor is unmistakable and never a person: the `whoText` renderer branches first on `actor_type === 'AI'` and never reads `entry.actor` in that branch (FR-14.4 / T-06-13), rendering `AI ({model_id})`.
- The integrity statement renders both paths (FR-14.10): healthy → "Record integrity verified — {n} events in sequence."; tampered → a prominent `role="alert"` USWDS error naming the divergent sequence with the events still rendered and no repair action anywhere.
- The `/cases/{caseReference}/audit` deep link renders the same case screen and focuses the "Audit trail" heading once (FR-14.11); recording a decision on the screen refreshes the trail in place via a bumped `caseVersion` refreshToken, with no polling and no reload (FR-14.12).
- `e2e/audit-trail.spec.ts` proves every FRD acceptance criterion in a real browser (10/10), including the tampered-chain path via a direct owner-connection database tamper.

## Task Commits

1. **Task 1: api.getAuditTrail + the AuditTrailRegion component** — `922ee57` (feat)
2. **Task 2: Wire into CaseDetail + deep link + Playwright suite** — `b72b761` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md, docs commit)_

## Files Created/Modified

- `web/src/components/AuditTrailRegion.tsx` — the F14 region: fetch keyed on `[exceptionId, refreshToken]`, empty→ErrorState (FR-14.17), action-label + who/state renderers, integrity statement, event `<ol>`, value change `<table>`.
- `web/src/api/client.ts` — `api.getAuditTrail(exceptionId)`: GET-only read of the F13 endpoint, no CSRF header.
- `web/src/screens/CaseDetail.tsx` — `CaseDetailProps.focusAuditTrail`; a `caseVersion` counter bumped on every successful `fetchCase`, threaded to `AuditTrailRegion` as `refreshToken`; the audit stub replaced by the real region; header comment updated.
- `web/src/app/router.tsx` — `/cases/:caseReference/audit` renders `<CaseDetail focusAuditTrail />` (was `NotBuiltYet`); route-table comment updated. `NotBuiltYet` retained for `/entries/new`.
- `e2e/audit-trail.spec.ts` — the 10-scenario F14 suite.
- `e2e/case-detail.spec.ts` — test 7 updated for the real Phase-6 sections; test 2 scoped to `.first()`.

## Decisions Made

- **FRD-normative label kept over test convenience:** the F14 `RECOMMENDATION_UNAVAILABLE` label "No AI recommendation available" matches the F10 section heading. Rather than rename the normative label, case-detail.spec test 2's heading assertion was scoped to `.first()` (the F10 section, which precedes the trail in DOM order).
- **FIELD_LABELS duplicated, not shared:** the fourteen entry-field labels are duplicated verbatim from `CaseDetail.tsx` with a documenting comment, since the two files do not currently share a labels module and a single reuse does not justify introducing one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pg named import fails under native ESM in the e2e spec**
- **Found during:** Task 2 (running the Playwright suite)
- **Issue:** `import { Client } from 'pg'` threw at runtime "The requested module 'pg' does not provide an export named 'Client'" — pg is CommonJS (the exact interop issue recorded in STATE.md for the server pool modules).
- **Fix:** Switched to the interop-default form `import pg from 'pg'; const { Client } = pg;`.
- **Files modified:** e2e/audit-trail.spec.ts
- **Verification:** the suite loads and runs.
- **Committed in:** b72b761

**2. [Rule 1 - Bug] tamper query referenced a non-existent column**
- **Found during:** Task 2 (test 7 first run)
- **Issue:** the tamper read `SELECT case_id FROM exceptions` — `exceptions` has no `case_id`. The audit anchor `audit_entries.case_id` references `cargo_entries.id`, which is `exceptions.entry_id`.
- **Fix:** query `SELECT entry_id FROM exceptions WHERE id = $1` and use it as the case anchor.
- **Files modified:** e2e/audit-trail.spec.ts
- **Verification:** test 7 passes.
- **Committed in:** b72b761

**3. [Rule 1 - Bug] fixed tamper hash collided across persisted-DB runs**
- **Found during:** Task 2 (second full-suite run)
- **Issue:** the tamper set a fixed `entry_hash` (`repeat('ab',32)`), which violated `uq_audit_entries_entry_hash` on the second run because the dev DB persists.
- **Fix:** overwrite with `gen_random_bytes(32)` — different from the original (breaks the chain) and globally unique every run.
- **Files modified:** e2e/audit-trail.spec.ts
- **Verification:** the full suite passes repeatably.
- **Committed in:** b72b761

**4. [Rule 1 - Bug] pre-existing e2e assertions broke on the replaced stub / new heading**
- **Found during:** Task 2 (case-detail.spec regression run)
- **Issue:** case-detail.spec test 7 asserted the old Phase-5 stub text (already partly stale after 06-03) and test 2's global "No AI recommendation available" heading now matched two elements (the F10 section AND the new F14 audit event of the same label).
- **Fix:** test 7 rewritten to assert the real Phase-6 sections (live decision controls + the audit region's intro statement and receipt event); test 2 heading assertion scoped to `.first()`.
- **Files modified:** e2e/case-detail.spec.ts
- **Verification:** case-detail.spec 10/10 green.
- **Committed in:** b72b761

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking). **Impact on plan:** all necessary for a passing, repeatable e2e tier; no scope creep — every fix was in the new/adjacent e2e code the plan authored.

## Known Stubs

None found. The only `NotBuiltYet` reference remaining is the intentional `/entries/new` (F6, Phase 3) route, out of this plan's scope.

## Issues Encountered

- The compose `cargoexec-web` container was serving stale code on :3000, which Playwright's `reuseExistingServer` would have reused. Stopped it before the run so Playwright built and served a fresh server, then restarted it afterward. (Environment hygiene, not a code issue.)

## Self-Check: PASSED

- Created files exist: `web/src/components/AuditTrailRegion.tsx`, `e2e/audit-trail.spec.ts` — FOUND.
- Commits exist: `922ee57`, `b72b761` — FOUND.
- Build check: `npm run build` → exit 0.
- Typecheck: `npm run typecheck` → exit 0.
- e2e: audit-trail 10/10, case-detail 10/10, decision 8/8 (regression) — all green.
- `## Known Stubs` present; no blocking stubs.

## Next Phase Readiness

- F14 is fully real and proven; the phase's third success criterion ("who decided this, what did the AI say, what did the human change" answered in place) holds in a real browser.
- All feature-implementing plans of Phase 6 are done (06-01 F11, 06-02 F13, 06-03 F12, 06-04 F14). Ready for **06-05**, the whole-stack compose demo + phase sign-off (which also owns adding the five AI env keys to the compose `web` service — the 05-06 deferred item — and runs `npm run test:all` in full).

---
*Phase: 06-the-human-decision-and-the-record-that-explains-it*
*Completed: 2026-09-16*
