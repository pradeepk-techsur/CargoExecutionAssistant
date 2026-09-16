---
phase: 06-the-human-decision-and-the-record-that-explains-it
plan: 01
subsystem: api
tags: [decision, hitl, provenance, idempotency, csrf, audit, postgres, express, zod]

# Dependency graph
requires:
  - phase: 05-ai-recommendation-as-an-un-applied-proposal
    provides: F9 recommendations/recommendation_values (the proposal a decision may adopt or diverge from) and loadRecommendationByException/loadRecommendationValues
  - phase: 01-governed-record-substrate
    provides: F13 append() audit writer, the decisions/decision_values schema (0006), and the HITL + coupling deferred triggers (0009)
provides:
  - "POST /api/exceptions/{exceptionId}/decision — the F11 decision write, the ONLY code path that writes decisions/decision_values or exceptions.state/closed_at/decision_id"
  - "recordDecision(deps, exceptionId, body, idempotencyKey) — the transactional F11 service with per-value provenance and one coupled audit entry"
  - "decisions repository write path (insertDecision, insertDecisionValues, loadDecisionByIdempotencyKey)"
  - "DecisionCreateRequest / DecisionRecordResponse contract types; DecisionValueDto.changed_from_proposal"
  - "server/test/api/decision.spec.ts — the permanent F11 regression suite"
affects: [F12 decision web UI (06-03), F14 audit trail, phase 6 whole-loop UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service error classes mapped to Y2 codes in the route (instanceof-branch), mirroring receipt.service.ts/entries.ts"
    - "Idempotency-Key replay pre-check OUTSIDE the transaction; the transaction is the sole writer"
    - "CSRF middleware matches route PATTERNS as anchored regexes against the concrete req.path (parameterised-route-safe)"

key-files:
  created:
    - server/src/services/decision.service.ts
    - server/src/http/routes/decision.ts
    - server/test/api/decision.spec.ts
  modified:
    - contract/src/dto.ts
    - server/src/db/repositories/decisions.ts
    - server/src/http/routes/index.ts
    - server/src/http/csrf.middleware.ts
    - server/test/architecture/receiptPaths.spec.ts
    - server/test/architecture/headers.spec.ts
    - server/test/api/boot.spec.ts

key-decisions:
  - "recommendation_id is ALWAYS stamped on the decision row (F5 FR-5.12 guarantees a PENDING placeholder), so there is no null-recommendation branch"
  - "The idempotent-replay comparison compares resolution_values only when the client supplied them (EDIT_APPROVE); APPROVE/REJECT are identified by decision_type + trimmed reason alone"
  - "CSRF pattern-matching bug fixed generally in the middleware rather than special-cased for the decision route"

patterns-established:
  - "Pattern: a state-changing route with a path parameter is now correctly CSRF-guarded — the middleware compiles API_ROUTE_TABLE patterns to regexes"
  - "Pattern: decision.service.ts is the sole writer of exceptions.state (receiptPaths.spec allowlist) and of decisions/decision_values"

# Metrics
duration: 10 min
completed: 2026-09-16
---

# Phase 6 Plan 01: The F11 Human Decision API Summary

**POST /api/exceptions/{id}/decision — the sole code path that closes a cargo exception: approve / edit-and-approve / reject, per-value AI-vs-HUMAN provenance by trim-then-byte-compare, one coupled audit entry, idempotency, and one-decision-ever under concurrency.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-16T11:16:12Z
- **Completed:** 2026-09-16T11:26:19Z
- **Tasks:** 3
- **Files modified:** 11 (3 created, 8 modified)

## Accomplishments
- The F11 decision endpoint is real, reachable, and is the ONLY writer of `decisions`/`decision_values` and of `exceptions.state`/`closed_at`/`decision_id` (FR-11.1), proven structurally by receiptPaths.spec's allowlist.
- `recordDecision` computes per-value origin server-side (FR-11.8): a changed value → `HUMAN`, an identical one → `AI`, a direct resolution → all `HUMAN`; the client can never assert origin (rejected as an unknown key).
- Every F11 acceptance criterion (1–10) is proven by `decision.spec.ts` (16 scenarios, 23 cases): APPROVE all-AI, EDIT_APPROVE mixed provenance, mandatory-reason 8-case matrix, concurrent-double-decide, degraded-mode direct resolution, strict-body rejection, entry/findings immutability, idempotent replay, values-not-allowed, incomplete-set, recommendation mismatch, identifier resolution, no-store, and already-decided messaging.
- A real CSRF gap was found and fixed generally: parameterised state-changing routes were silently escaping CSRF; the middleware now matches route patterns as regexes.

## Task Commits

1. **Task 1: Contract types + decisions repository write path** — `5d5b2fb` (feat)
2. **Task 2: decision.service.ts — the F11 transaction** — `3e55a5a` (feat)
3. **Task 3: HTTP route + route-table wiring + regression suite** — `6a14bf3` (feat)

## Files Created/Modified
- `server/src/services/decision.service.ts` — the F11 transaction: FOR UPDATE lock, provenance computation, one UPDATE exceptions, exactly one append(), seven typed error classes, idempotency pre-check + replay assembly.
- `server/src/http/routes/decision.ts` — POST route: uuid-or-case-ref resolution, strict zod body, Idempotency-Key header, service-error → Y2 mapping (201 for both fresh and replay).
- `server/src/db/repositories/decisions.ts` — added insertDecision/insertDecisionValues (PoolClient write path) + loadDecisionByIdempotencyKey; extended loadDecisionValues/DecisionValueRow with changed_from_proposal.
- `contract/src/dto.ts` — DecisionCreateRequest, DecisionResolutionValueRequest, DecisionRecordResponse; DecisionValueDto.changed_from_proposal.
- `server/src/http/routes/index.ts` — row 9 implemented:true; decisionRoutes registered.
- `server/src/http/csrf.middleware.ts` — pattern→regex matching for parameterised routes (see Deviations).
- `server/test/api/decision.spec.ts` — the permanent F11 regression suite.
- `server/test/architecture/{receiptPaths,headers}.spec.ts`, `server/test/api/boot.spec.ts` — allowlist/exclusion/count updates.

## Decisions Made
- `recommendation_id` is always present on the decision row (F5 FR-5.12), so no "no recommendation" branch exists — a PENDING/UNAVAILABLE case simply routes EDIT_APPROVE through direct resolution.
- Idempotent replay is identified by `decision_type` + trimmed `reason`, plus submitted `resolution_values` only when the client actually sent them; APPROVE's server-derived stored values are never compared against an empty body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] CSRF middleware skipped parameterised state-changing routes**
- **Found during:** Task 3 (decision.spec test 2 returned 201 instead of 403 for a missing CSRF token)
- **Issue:** `csrfMiddleware` built its implemented-state-changing set from `API_ROUTE_TABLE` route PATTERNS (`/api/exceptions/:exceptionId/decision`) and compared them as plain strings against the concrete `req.path` (`/api/exceptions/<uuid>/decision`). The two never match for a parameterised path, so CSRF was silently not enforced on the first such route — POST …/decision. Prior implemented state-changing routes were `POST /api/session` (exempt) and `POST /api/entries` (flat path), so the gap had never been exercised.
- **Fix:** Compile each implemented state-changing pattern to an anchored regex (`:param` → `[^/]+`) and test `req.path` against it. General fix, not special-cased.
- **Files modified:** server/src/http/csrf.middleware.ts
- **Verification:** decision.spec test 2 (missing + bad token ⇒ 403 CSRF_INVALID) passes; full API tier (159) still green, incl. entries/session CSRF tests.
- **Committed in:** 6a14bf3

**2. [Rule 1 - Bug] Idempotent replay wrongly rejected an APPROVE replay as key-reused**
- **Found during:** Task 3 (decision.spec test 10 returned 409 instead of the replayed 201)
- **Issue:** `decisionMatchesReplay` compared the stored `decision_values` (server-derived: 3 AI values copied from the proposal on APPROVE) against `body.resolution_values` (empty for APPROVE), so length 0 ≠ 3 falsely triggered IDEMPOTENCY_KEY_REUSED.
- **Fix:** Only compare resolution_values when `body.resolution_values !== undefined` (EDIT_APPROVE); APPROVE/REJECT are identified by decision_type + trimmed reason.
- **Files modified:** server/src/services/decision.service.ts
- **Verification:** decision.spec test 10 (identical replay ⇒ 201 idempotent_replay:true, no second row; different body ⇒ 409) passes.
- **Committed in:** 6a14bf3

**3. [Rule 3 - Blocking] headers.spec template-literal-SQL exclusion**
- **Found during:** Task 3 (test:arch headers.spec failed on decisions.ts)
- **Issue:** `insertDecisionValues` uses the canonical safe bulk-insert scaffold (`VALUES ${tuples.join(',')}`, placeholders only, all values bound) — the exact pattern the plan instructed (writer.ts) — which the R-L8 template-literal-SQL gate flags unless the file is on the documented exclusion list.
- **Fix:** Added `db/repositories/decisions.ts` to headers.spec's EXCLUDED set with a comment, alongside writer.ts and recommendations.ts (extended deliberately, never weakened).
- **Files modified:** server/test/architecture/headers.spec.ts
- **Verification:** test:arch 153/153 green.
- **Committed in:** 6a14bf3

---

**Total deviations:** 3 auto-fixed (1 missing-critical security, 1 bug, 1 blocking test-allowlist).
**Impact on plan:** The CSRF fix is a genuine security hardening beyond this route (every future parameterised mutation is now guarded); the replay fix is correctness; the allowlist extension is the documented, intended pattern. No scope creep.

## Known Stubs
None found — the "PENDING placeholder", "no placeholder handler", and "not implemented (405)" hits in a grep are all descriptive comments, not incomplete code.

## Authentication Gates
None — no external service or credential was needed.

## Issues Encountered
None beyond the three auto-fixed deviations above.

## Test Results (fast inner loop — all green)
- unit: 297 passed
- db: 196 passed
- api: 159 passed (incl. decision.spec 23, guard 36, boot 4, entries 27, session 11)
- arch: 153 passed (incl. receiptPaths 11, headers 48)
- `npm run build` (server + web) exit 0; `npm run typecheck` exit 0.
- test:e2e not run for this plan — it touches only server/src + contract + tests, no web/src screen; the F12 decision UI and the whole-loop browser walk are later Phase 6 plans.

## Next Phase Readiness
- The governed loop's server half now closes: an exception is decidable exactly once, by an accountable human, through one audited path. Ready for **06-02** (next plan) — the F12 decision web UI posts to this endpoint (F11 FR-12.10 confirms from the server's DecisionRecordResponse).
- Carried forward for the Phase 6 whole-stack demo (unchanged from Phase 5's deferral): the compose `web` service still lacks the five AI env keys; the whole-loop UAT plan owns that fix.

## Self-Check: PASSED
- Created files exist on disk: decision.service.ts, decision.ts (route), decision.spec.ts, SUMMARY.md.
- Task commits present: 5d5b2fb, 3e55a5a, 6a14bf3.
- Plan-level build ran: `npm run build` → exit 0. typecheck → exit 0.
- Known Stubs section present, no blocking stubs.

---
*Phase: 06-the-human-decision-and-the-record-that-explains-it*
*Completed: 2026-09-16*
