---
phase: 05-ai-recommendation-as-an-un-applied-proposal
plan: 03
subsystem: api
tags: [express, recommendation, polling, read-only, f9, postgres]

# Dependency graph
requires:
  - phase: 04-the-receipt-ordered-queue
    provides: "read repositories loadRecommendationByException / loadRecommendationValues, resolveCaseIdentifier, the RouteDeps route-factory pattern, the createGovernedCase / createPendingRecommendation fixtures"
provides:
  - "GET /api/exceptions/:exceptionId/recommendation — the read-only F9 polling endpoint serving all three PENDING/AVAILABLE/UNAVAILABLE recommendation shapes"
  - "loadRecommendationDetail(pool, exceptionId): RecommendationDetailDto | 'NOT_FOUND' — the status-discriminated recommendation composer"
  - "API_ROUTE_TABLE F9 row flipped implemented:true (eight of ten now implemented)"
affects: [05-05-case-detail-screen, F10, phase-6-decision-loop]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin HTTP translation route over a read service, mirroring exceptions.ts: query-param refusal, belt-and-braces auth re-check, identifier-FORM validation before any DB call, service-outcome-to-HTTP mapping"
    - "GET-only route factory exporting exactly { get } — no post/put/patch/delete surface, enforcing the read-only API design"
    - "Governed-transaction test fixtures (status UPDATE + matching audit entry via append) as positive controls for read-path testing, independent of the generation job"

key-files:
  created:
    - server/src/services/recommendationRead.service.ts
    - server/src/http/routes/recommendation.ts
    - server/test/api/recommendation.spec.ts
  modified:
    - server/src/http/routes/index.ts
    - server/test/api/boot.spec.ts

key-decisions:
  - "Used resolveCaseIdentifier(pool, 'UUID', exceptionId) as the exception-existence probe instead of the plan's named-but-nonexistent loadExceptionForGeneration"
  - "Duplicated the small status-discriminated composition logic from caseRead.service.ts's composeRecommendation rather than importing it, keeping caseRead.service.ts untouched per STATE.md"

patterns-established:
  - "The F9 polling read is fully buildable/testable today off the always-present PENDING recommendation row, with zero dependency on the generation mechanism (05-01/05-02/05-04)"

# Metrics
duration: 4 min
completed: 2026-09-15
---

# Phase 5 Plan 03: F9 Recommendation Polling Endpoint Summary

**Read-only `GET /api/exceptions/:exceptionId/recommendation` serving all three PENDING/AVAILABLE/UNAVAILABLE recommendation shapes off the always-present recommendation row, with its permanent 10-test API regression suite — no dependency on the AI generation job.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-15T22:21:50Z
- **Completed:** 2026-09-15T22:26:18Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `loadRecommendationDetail` read service composes the RecommendationDetailDto, emitting ONLY each status's contract-allowed fields; returns `'NOT_FOUND'` for an unmatched exception (distinct from a normal PENDING 200)
- The F9 polling route: rejects any query parameter, re-checks auth, validates uuid form before any DB call, maps NOT_FOUND to 404 EXCEPTION_NOT_FOUND; exports exactly `{ get }` — no regenerate/apply/manual-trigger surface (FR-9.6/FR-9.14)
- `API_ROUTE_TABLE` F9 row flipped to `implemented: true`; route wired into `buildRoutes()` in §3.1 order; eight of ten pairs now implemented
- Permanent `recommendation.spec.ts` (10 tests): all three status shapes with exact-key assertions, 401/400/404 paths, no-query-param rule, GET-only method contract, `Cache-Control: no-store`, and a before/after row-count read-only proof; `boot.spec.ts` updated to assert eight implemented routes

## Task Commits

1. **Task 1: recommendationRead.service.ts** - `046185f` (feat)
2. **Task 2: route + wiring + route-table flip** - `29c25fb` (feat)
3. **Task 3: boot.spec.ts update + F9 regression suite** - `0f03998` (test)

_Note: 05-03's commits are interleaved with parallel wave-1 plans 05-01/05-02 in the branch history._

## Files Created/Modified
- `server/src/services/recommendationRead.service.ts` - the status-discriminated recommendation composer (read-only, no append)
- `server/src/http/routes/recommendation.ts` - the F9 polling route handler, GET-only
- `server/src/http/routes/index.ts` - F9 row flipped implemented:true, route registered, doc comments updated seven→eight
- `server/test/api/recommendation.spec.ts` - the permanent F9 API regression suite (10 tests)
- `server/test/api/boot.spec.ts` - asserts exactly eight implemented routes, sorted array includes the F9 path

## Decisions Made
- **Existence probe:** the plan referenced `loadExceptionForGeneration`, which does not exist in this codebase (the generation-time reads belong to plans 05-01/05-02, not yet present when 05-03 executed). Used the already-built, bind-only, read-only `resolveCaseIdentifier(pool, 'UUID', exceptionId)` — FOUND ⇒ exists, NOT_FOUND ⇒ does not — which gives the exact 404-on-unmatched-uuid behaviour the plan specifies.
- **Duplicated composition logic:** the AVAILABLE/UNAVAILABLE/PENDING field-emission logic is duplicated from `caseRead.service.ts`'s private `composeRecommendation` rather than imported, keeping `caseRead.service.ts` untouched (STATE.md marks it as needing no changes) and both call sites independently honest to the DTO contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Substituted resolveCaseIdentifier for the nonexistent loadExceptionForGeneration**
- **Found during:** Task 1 (recommendationRead.service.ts)
- **Issue:** The plan's service body imports `loadExceptionForGeneration` from `../db/repositories/exceptions.js` as the exception-existence check. That function does not exist — `exceptions.ts` exports only insert/loadExceptionRefByEntry/listOpenExceptions/resolveCaseIdentifier/loadExceptionDetail. Importing it would fail to compile, blocking the task.
- **Fix:** Used `resolveCaseIdentifier(pool, 'UUID', exceptionId)` (returns FOUND/NOT_FOUND for a bound uuid) — the existing lightest read that answers "does this exception exist?", binding the id as `$1`. Semantically identical for this purpose: FOUND ⇒ proceed to compose, otherwise ⇒ `'NOT_FOUND'`.
- **Files modified:** server/src/services/recommendationRead.service.ts
- **Verification:** `npm run build:server` passes; recommendation.spec.ts case 5 (well-formed unmatched uuid ⇒ 404) and cases 2/3/4 (real exception ⇒ 200) pass.
- **Committed in:** 046185f (Task 1 commit)

**2. [Rule 1 - Bug] UNAVAILABLE fixture used the wrong audit action_type**
- **Found during:** Task 3 (recommendation.spec.ts)
- **Issue:** The `makeUnavailable` test fixture wrote a `RECOMMENDATION_GENERATED` audit entry alongside the UNAVAILABLE status UPDATE, but the deferred coupling trigger requires a `RECOMMENDATION_UNAVAILABLE` entry for that transition — COMMIT failed with `AUDIT_COUPLING_VIOLATION`.
- **Fix:** Changed the fixture's `action_type` to `RECOMMENDATION_UNAVAILABLE` (a valid member of `AUDIT_ACTION_TYPES`).
- **Files modified:** server/test/api/recommendation.spec.ts
- **Verification:** all 10 recommendation.spec.ts tests pass.
- **Committed in:** 0f03998 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug — both in this plan's own new code).
**Impact on plan:** No scope change. Both were corrections to make the plan's own artefacts compile/pass against the real codebase. No architectural change.

## Issues Encountered

**Parallel-plan config failures (out of scope — logged, NOT fixed).** The full `npm run test` gate shows 8 failures (7 in `server/test/unit/config.spec.ts`, 1 in `server/test/architecture/headers.spec.ts:274`), all raising the SAME `ConfigError: AI_PROVIDER_URL must be an https:// URL or the literal 'fake:deterministic'`. These come from an in-flight, **uncommitted** `server/src/config.ts` change added by a parallel wave-1 plan (05-01/05-02) — the older config tests do not yet supply the new required env key. 05-03 touches no config or AI-provider code; per the SCOPE BOUNDARY rule these were logged to `.planning/phases/05-ai-recommendation-as-an-un-applied-proposal/deferred-items.md` (owner = the config-authoring plan) and left unfixed. 05-03's own work is fully green: **api 134/134, db 183/183, arch route/allowlist assertions all pass** (the only arch failure is the same foreign config check).

## Known Stubs
None found. (One "placeholder" grep hit is inside an explanatory comment referring to the DB's PENDING placeholder row, not an incomplete implementation.)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The F9 polling contract is live and stable for plan 05-05 (the case-detail screen) to depend on without waiting for the AI generation mechanism.
- No blockers introduced by this plan. The foreign config-test failures will clear once the parallel config-authoring plan finishes wiring `AI_PROVIDER_URL` into the config test fixtures.

## Self-Check: PASSED
- Files created exist: recommendationRead.service.ts, recommendation.ts, recommendation.spec.ts — all FOUND.
- Commits exist: 046185f, 29c25fb, 0f03998 — all in history.
- Plan-level build: `npm run build:server` → exit 0.
- `## Known Stubs` present; no blocking stub.
- 05-03 test tiers green (api 134, db 183, arch route assertions); only out-of-scope parallel-plan config failures remain, documented under Issues Encountered + deferred-items.md.

---
*Phase: 05-ai-recommendation-as-an-un-applied-proposal*
*Completed: 2026-09-15*
