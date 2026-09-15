---
phase: 04-the-receipt-ordered-queue
plan: 01
subsystem: api
tags: [postgres, sql, read-model, queue, dto, contract]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate
    provides: exceptions/recommendations/decisions tables, receipt_position sequence, deferred coupling triggers, append() audit writer
  - phase: 03-receive-validate-except
    provides: cargo_entries/validation_results/validation_findings rows, receipt transaction, Queryable-first repository conventions
provides:
  - "contract DTOs: RowSummaryDto, QueueResponse, CaseExceptionRef, RecommendationProposedValueDto, RecommendationDetailDto, DecisionValueDto, DecisionDetailDto, CaseDetailResponse"
  - "read repositories: listOpenExceptions, resolveCaseIdentifier, loadExceptionDetail (exceptions.ts)"
  - "loadFindingsByValidationResultIds (validation.ts)"
  - "loadRecommendationByException, loadRecommendationValues (recommendations.ts, new)"
  - "loadDecisionByException, loadDecisionValues (decisions.ts, new)"
affects: [04-02, 04-03, 04-04, F7, F8]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-only repository modules mirror the exceptions.ts file-header convention: Queryable-first, static SQL, $n binds only, no INSERT/UPDATE/DELETE"
    - "= ANY($1::uuid[]) for batch-by-id reads grouped into a Map in JS with an empty-array early return"
    - "LEFT JOIN discriminates ENTRY_PASSED_VALIDATION (clean entry, null exception) from NOT_FOUND (no entry)"

key-files:
  created:
    - server/src/db/repositories/recommendations.ts
    - server/src/db/repositories/decisions.ts
    - server/test/db/queueRead.repo.spec.ts
  modified:
    - contract/src/dto.ts
    - server/src/db/repositories/exceptions.ts
    - server/src/db/repositories/validation.ts

key-decisions:
  - "resolveCaseIdentifier trusts a caller-supplied form discriminator but binds the value as $1 in every branch, so an unvalidated identifier is safe here (T-04-01); the route (04-03) validates form"
  - "loadFindingsByValidationResultIds batches many validation results in one = ANY($1::uuid[]) query, grouped ascending by (validation_result_id, rule_id), to serve both queue finding_count and case-detail composition"
  - "A closed exception stays directly reachable by resolveCaseIdentifier (acceptance 6) while being filtered from listOpenExceptions by state = 'OPEN'"

patterns-established:
  - "Pattern 1: two new read-only repositories (recommendations.ts, decisions.ts) that Phase 5/6 will later join as WRITERS, documented in their file headers"
  - "Pattern 2: the queue read is parameterless by construction — no filter/sort/paging bind exists (FR-7.2/7.3), only a fixed LIMIT 501 truncation ceiling"

# Metrics
duration: 6min
completed: 2026-09-15
---

# Phase 4 Plan 01: The Receipt-Ordered Queue Read Model Summary

**Read-only data layer for F7: contract DTOs for the queue row and case detail, plus eight parameterised-SQL repository functions (open-queue projection, three-way identifier resolution, exception/recommendation/decision reads) proven against a real migrated database.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-15T19:44:01Z
- **Completed:** 2026-09-15T19:49:38Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- Added eight exported contract types for the queue row, case detail, recommendation and decision sections — the shapes both the server (04-02/04-03) and the SPA (04-04) import.
- Added `listOpenExceptions` (the parameterless, receipt-ordered `state = 'OPEN'` projection with a `LIMIT 501` truncation ceiling), `resolveCaseIdentifier` (three-way FOUND / ENTRY_PASSED_VALIDATION / NOT_FOUND via a LEFT JOIN), and `loadExceptionDetail`.
- Added `loadFindingsByValidationResultIds` (batch `= ANY($1::uuid[])`, grouped ascending by rule_id) and two new read-only repositories (`recommendations.ts`, `decisions.ts`) with four functions.
- Proved ordering, OPEN-only filtering with closed-case reachability, identifier resolution, findings composition, and recommendation/decision reads in a new DB-tier suite (7 tests) against a real migrated database.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the queue and case-detail DTOs to the contract package** - `df95cbb` (feat)
2. **Task 2: Add the five read-only repository functions** - `5747fe5` (feat)
3. **Task 3: DB-tier proof of ordering, OPEN-only filtering and identifier resolution** - `80b6297` (test)

## Files Created/Modified
- `contract/src/dto.ts` - Eight new exported types (RowSummaryDto, QueueResponse, RecommendationProposedValueDto, RecommendationDetailDto, DecisionValueDto, DecisionDetailDto, CaseExceptionRef, CaseDetailResponse); reuses existing EntryDto/ValidationDto/Origin/DecisionType/RecommendationStatus.
- `server/src/db/repositories/exceptions.ts` - Added QueueRow/ExceptionIdentifierResolution/ExceptionDetailRow types and listOpenExceptions/resolveCaseIdentifier/loadExceptionDetail; imports ExceptionState.
- `server/src/db/repositories/validation.ts` - Added loadFindingsByValidationResultIds (batch, grouped, empty-array early return).
- `server/src/db/repositories/recommendations.ts` - New read-only module: loadRecommendationByException, loadRecommendationValues.
- `server/src/db/repositories/decisions.ts` - New read-only module: loadDecisionByException (decider joined from specialists), loadDecisionValues.
- `server/test/db/queueRead.repo.spec.ts` - New DB-tier suite (7 tests) reusing createGovernedCase/createPendingRecommendation/poolFor and the hitl.spec.ts governed-closure pattern.

## Decisions Made
- **resolveCaseIdentifier is safe on unvalidated input by construction** — the identifier value is bound as `$1` in every query branch, never interpolated (T-04-01, R-L8). The route validates the identifier *form* before calling; this function trusts only the `form` discriminator.
- **Batch findings read serves two consumers from one query** — `loadFindingsByValidationResultIds` uses `= ANY($1::uuid[])` ordered `(validation_result_id, rule_id)` so both the queue's finding_count/failure_summary and the case-detail findings compose from a single statement.
- **Closed cases stay reachable** — `state = 'OPEN'` filters the open queue while `resolveCaseIdentifier` still resolves a RESOLVED/REJECTED case's reference to FOUND (acceptance 6).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed workspace dependencies (devDependencies included)**
- **Found during:** Task 1 (first build)
- **Issue:** `node_modules` was absent on the fresh workspace — `tsc: not found`, so `npm run build:server` could not run.
- **Fix:** Ran `npm install --include=dev` (per runtime contract §4: never omit dev before building). Only the toolchain was installed; no `package.json`/lockfile change was authored.
- **Files modified:** none committed (node_modules is gitignored)
- **Verification:** `npm run build:server` and `npm run typecheck` subsequently exit 0.
- **Committed in:** n/a (environment setup, no source change)

---

**Total deviations:** 1 auto-fixed (1 blocking — environment setup).
**Impact on plan:** No source-level scope change. The plan's three tasks were implemented exactly as written.

## Issues Encountered
- **Test-code fixes during Task 3 (before the Task 3 commit, not deviations to production code):**
  1. The plan's clean-entry insert had to write through `append()` — a bare `cargo_entries` INSERT is refused by the deferred coupling trigger (`AUDIT_COUPLING_VIOLATION`), exactly as the governance layer guarantees. `createCleanEntry` now inserts the entry, its field origin, and the coupled ENTRY_RECEIVED + VALIDATION_COMPLETED audit entries in one transaction.
  2. `closeCaseAsResolved` had to UPDATE the exception's existing PENDING recommendation to AVAILABLE rather than INSERT a second one (`uq_recommendations_exception` permits exactly one per exception) — matching the real PENDING→AVAILABLE transition.
  Both were errors in the test harness code, caught by the real database; the production repository functions were unaffected.
- The `--reporter=list` flag in the plan's verify commands is not a recognised built-in reporter in this vitest 2.1.5 install (it tries to load a module named "list"); the default reporter was used and produced identical pass/fail results. No behavioural difference.

## Known Stubs
None found. The "placeholder" strings in the changed files refer to the legitimate PENDING recommendation placeholder concept and the fixture password `argon2id$placeholder` — no incomplete implementations, no hardcoded handler responses, no swallowed errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The read model is complete and DB-proven. **Ready for 04-02** (the F7 services — `queue.service.ts` and `caseRead.service.ts` — which compose these repositories into the `GET /api/exceptions` and `GET /api/exceptions/:idOrReference` responses).
- `receiptPaths.spec.ts` already documents (assertion 2) that the Phase 4 read services will legitimately join the repository caller set; none of the eight new functions issues an INSERT/UPDATE/DELETE, so that guard stays green.
- No blockers.

## Self-Check: PASSED

---
*Phase: 04-the-receipt-ordered-queue*
*Completed: 2026-09-15*
