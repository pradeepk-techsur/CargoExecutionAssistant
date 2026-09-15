---
phase: 04-the-receipt-ordered-queue
plan: 02
subsystem: api
tags: [queue, case-detail, business-logic, service-layer, F7, postgres]

# Dependency graph
requires:
  - phase: 04-01
    provides: "read repositories (listOpenExceptions, resolveCaseIdentifier, loadExceptionDetail, loadFindingsByValidationResultIds, recommendations/decisions reads) and contract DTOs (QueueResponse, CaseDetailResponse)"
provides:
  - "listQueue(pool) -> QueueResponse: the receipt-ordered queue projection with FR-7.6 failure-summary derivation and FR-7.9 500-row truncation"
  - "loadCase(pool, form, value) -> CaseDetailResponse | 'ENTRY_PASSED_VALIDATION' | 'NOT_FOUND': the single-case read with the server-declared FR-7.8 permitted_decisions matrix"
  - "CaseIdentifierForm type ('UUID' | 'CASE_REF')"
affects: [04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service composition layer over read repositories, mirroring the entries.ts/receipt.service.ts route-vs-service split — business logic (summary derivation, decision matrix) lives in the service, out of the thin HTTP route"
    - "Read services are strictly side-effect-free: no INSERT/UPDATE/DELETE, no append() (FR-7.10)"
    - "Server-declared permitted_decisions matrix — the client never derives the allowed actions"

key-files:
  created:
    - server/src/services/queue.service.ts
    - server/src/services/caseRead.service.ts
    - server/test/db/queueService.spec.ts
  modified: []

key-decisions:
  - "deriveFailureSummary uses the authoritative validation_results.findings_count for the 'and N more' suffix while showing the first two finding messages, so the count and the shown messages never disagree"
  - "The 501-row truncation test seeds through append() in ONE transaction, not a raw unnest() bulk insert — the DB's DEFERRABLE coupling triggers refuse a bare cargo_entries/validation_results/exceptions insert at COMMIT"

patterns-established:
  - "Composition service pattern: a business service takes only a Pool, composes read repositories, and returns the exact contract DTO the route hands to the client"
  - "exactOptionalPropertyTypes-safe DTO composition: build optional-key objects by conditional assignment (omit keys) rather than assigning undefined"

# Metrics
duration: 6 min
completed: 2026-09-15
---

# Phase 4 Plan 02: F7 Composition Services Summary

**listQueue and loadCase compose the 04-01 read repositories into the F7 queue projection (FR-7.6 failure-summary + FR-7.9 500-row truncation) and the single-case read (FR-7.8 permitted_decisions matrix), proven at the DB tier against real data.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-15T19:53:23Z
- **Completed:** 2026-09-15T19:59:16Z
- **Tasks:** 3
- **Files modified:** 3 (all created)

## Accomplishments
- `listQueue(pool)` — the receipt-ordered queue projection: derives each row's plain-language `failure_summary` from the first two findings in server (ascending rule_id) order with an "and N more" suffix (FR-7.6), and enforces the fixed 500-row truncation ceiling (FR-7.9) with no filter/sort/paging parameter reachable through its signature (FR-7.2/7.3, T-04-04).
- `loadCase(pool, form, value)` — the single-case read: resolves a UUID or case reference to a full `CaseDetailResponse`, surfacing `ENTRY_PASSED_VALIDATION` and `NOT_FOUND` distinctly (FR-7.14), and computes the server-declared `permitted_decisions` matrix (FR-7.8) so the client never derives allowed actions.
- Both services are strictly read-only — no writes, no `append()` (FR-7.10) — and reuse the existing entries/validation read repositories rather than duplicating SQL.
- DB-tier suite (8 tests) proving the summary derivation, the full four-combination decision matrix, and the 500/501 truncation boundary; full DB tier now 175/175 (was 167, +8), 0 regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: queue.service.ts** — `9a2665e` (feat)
2. **Task 2: caseRead.service.ts** — `9dae847` (feat)
3. **Task 3: queueService.spec.ts** — `8c2c318` (test)

## Files Created/Modified
- `server/src/services/queue.service.ts` - `listQueue(pool)` + `deriveFailureSummary`; the FR-7.6 composition and FR-7.9 truncation. Read-only.
- `server/src/services/caseRead.service.ts` - `loadCase(pool, form, value)` + `permittedDecisions`/`composeRecommendation`/`composeDecision`; the FR-7.8 matrix and FR-7.7 status-scoped field emission. Read-only.
- `server/test/db/queueService.spec.ts` - 8 DB-tier tests: failure summary (3 vs 1 finding), the permitted_decisions matrix (OPEN+PENDING/UNAVAILABLE/AVAILABLE, closed), the 500/501 truncation boundary, and the ENTRY_PASSED_VALIDATION/NOT_FOUND pass-throughs.

## Decisions Made
- **failure_summary count source:** the "and N more" suffix uses `validation_results.findings_count` (the authoritative total) while the shown text is the first two finding messages, so a partial findings list could never make the count and the shown messages disagree.
- **exactOptionalPropertyTypes composition:** `composeRecommendation` builds the status-specific DTO by conditionally assigning present keys rather than assigning `undefined`, because `exactOptionalPropertyTypes: true` forbids `undefined` on an optional property. This also enforces FR-7.7's no-leakage rule structurally (an AVAILABLE row never carries `failure_reason`, a PENDING/UNAVAILABLE row never carries `recommended_action`).
- **Internal invariant handling (T-04-03):** a resolved-then-vanished exception, or a resolved exception missing its entry/validation, is thrown as a plain `Error` with a `CASE_READ_INVARIANT:` prefix so it reaches errorMapper's generic-500 branch with no internal detail leaked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Truncation-test seeding could not use a raw bulk insert**
- **Found during:** Task 3 (the FR-7.9 truncation proof)
- **Issue:** The plan's Task 3 instructed seeding the 501 rows via "a single `unnest()`-based SQL statement" directly inserting `cargo_entries` + `validation_results` + `exceptions`. That approach is infeasible against the real schema: migration 0009's `DEFERRABLE INITIALLY DEFERRED` coupling triggers (`trg_entries_audit`, `trg_validation_audit`, `trg_exceptions_audit`) refuse the COMMIT unless every such insert carries its matching `ENTRY_RECEIVED` / `VALIDATION_COMPLETED` / `EXCEPTION_OPENED` audit entry, with a valid per-case hash chain. A bare bulk insert would raise `AUDIT_COUPLING_VIOLATION` at COMMIT. (This is the same reason 04-01's test built cases through `append()`.)
- **Fix:** Seeded all 501 governed cases the product's own way — through `append()` — but inside **one** `withTransaction` callback (`seedGovernedCaseInTx`), so the cost is 501 iterations without 501 separate commits. This is both correct (COMMIT accepted) and fast (the 501-row test runs in ~0.8s).
- **Files modified:** server/test/db/queueService.spec.ts
- **Verification:** `queueService.spec.ts` 8/8 pass; the 501→500 truncation assertion (500 lowest receipt_position values, truncated:true) passes.
- **Committed in:** 8c2c318 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation changed only the test's seeding mechanism, not any assertion or any production code. All three must-have truths are proven exactly as specified. No scope creep.

## Known Stubs
None found. The `placeholder` grep hits are benign: the caseRead comment refers to the PENDING recommendation *placeholder* (a real domain concept from F5 FR-5.12), and the test files use `argon2id$placeholder` password-hash literals, matching the existing `caseFixtures.ts` convention.

## Issues Encountered
- `exactOptionalPropertyTypes: true` initially rejected assigning `undefined` to optional `RecommendationDetailDto` fields. Resolved by building the DTO with conditional key assignment (see Decisions). This was caught by `npm run build:server` and fixed before any commit.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The two F7 services are ready for Plan 04-03 to call directly from the queue and case-detail routes (`listQueue` and `loadCase` are exported with the exact contract shapes the routes hand to the client).
- Plan 04-04 (the F8 web screen) renders `QueueResponse` and `CaseDetailResponse` — both now fully composed, including the server-declared `permitted_decisions` the screen must honour.
- No blockers.

## Self-Check: PASSED
- Files: FOUND server/src/services/queue.service.ts, server/src/services/caseRead.service.ts, server/test/db/queueService.spec.ts
- Commits: FOUND 9a2665e, 9dae847, 8c2c318
- Build check: `npm run build:server` → exit 0 (BUILD OK)
- Plan verification: `npm run test:db` → 175/175 pass, 0 regressions
- Known Stubs: none blocking

---
*Phase: 04-the-receipt-ordered-queue*
*Completed: 2026-09-15*
