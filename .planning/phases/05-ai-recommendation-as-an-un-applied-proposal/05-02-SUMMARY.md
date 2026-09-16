---
phase: 05-ai-recommendation-as-an-un-applied-proposal
plan: 02
subsystem: database
tags: [postgres, recommendations, idempotence, audit-coupling, privilege-wall, cargoexec_ai, FR-9.16, FR-9.17]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate
    provides: recommendations/recommendation_values tables (0005), the audit-coupling trigger trg_recommendations_audit (0009), the case-anchor lock privilege split app/ai (0008/0011), and append() the single audit chokepoint
  - phase: 03-receive-validate-except
    provides: the exceptions row + PENDING recommendation placeholder created inside the receipt transaction
  - phase: 04-the-receipt-ordered-queue
    provides: the read-only recommendations.ts/exceptions.ts/entries.ts repositories these functions extend
provides:
  - "markRecommendationAvailable / markRecommendationUnavailable — the idempotent PENDING→AVAILABLE/UNAVAILABLE terminal write (WHERE status='PENDING' guard)"
  - "insertRecommendationValues — the multi-row bind-only proposed-values insert"
  - "loadExceptionForGeneration / loadEntryValuesForRecommendation — the two AI-safe reads that compose the F9 provider request without touching specialist identity"
  - "DB-tier proof (recommendationWrite.repo.spec.ts) of idempotence, the audit-coupling trigger, and the cargoexec_ai privilege wall"
affects: [05-04, 05-05, ai-generation-job]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotence by construction: UPDATE ... WHERE id=$1 AND status='PENDING' RETURNING id; rowCount===1 means the transition fired, 0 means a no-op — no read-modify-write, no advisory lock"
    - "The recommendation terminal write runs over cargoexec_app (append() needs the case-anchor UPDATE privilege the AI role is denied); cargoexec_ai is used only for the job's OWN reads"
    - "A second documented, deliberate exclusion added to the template-literal-SQL gate for the recommendation_values bulk insert — the canonical safe placeholder-scaffold pattern, never weakened"

key-files:
  created:
    - server/test/db/recommendationWrite.repo.spec.ts
  modified:
    - server/src/db/repositories/recommendations.ts
    - server/src/db/repositories/exceptions.ts
    - server/src/db/repositories/entries.ts
    - server/test/architecture/headers.spec.ts

key-decisions:
  - "The terminal write runs over cargoexec_app, not cargoexec_ai: append()'s unconditional case-anchor FOR UPDATE lock requires UPDATE on cargo_entries, granted only to cargoexec_app (0011). Proven behaviourally in test 4 with this plan's own functions, so widening the AI role's privileges fails loudly."
  - "loadEntryValuesForRecommendation deliberately does NOT reuse loadEntryDetail: that function joins specialists (which cargoexec_ai has no privilege on and which would leak identity, FR-9.16)."

patterns-established:
  - "Terminal-status write idempotence lives in the WHERE clause, not in application logic"
  - "AI-safe reads are physically separated from identity-joining reads so the privilege wall is a second, independent guarantee behind the code-level one"

# Metrics
duration: 12 min
completed: 2026-09-15
---

# Phase 5 Plan 02: Recommendation Write Path + AI-Safe Reads Summary

**Idempotent PENDING→AVAILABLE/UNAVAILABLE recommendation writes guarded by `WHERE status='PENDING'`, two specialist-free AI-safe reads (FR-9.16), and a DB-tier proof that the terminal write is idempotent by construction and structurally impossible to complete over the `cargoexec_ai` role.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-15T22:22:00Z (approx)
- **Completed:** 2026-09-15T22:27:00Z (approx)
- **Tasks:** 3
- **Files modified:** 5 (4 modified, 1 created)

## Accomplishments
- Added the three recommendation WRITE functions (`markRecommendationAvailable`, `markRecommendationUnavailable`, `insertRecommendationValues`) alongside the existing reads, acting on `recommendations.ts`'s long-standing "Phase 5 owns writing those" note and repointing it at `ai/job.ts` (plan 05-04).
- Added the two AI-safe READ functions (`loadExceptionForGeneration`, `loadEntryValuesForRecommendation`) that compose the F9 provider request without any `specialists` join — proven safe under `cargoexec_ai`.
- Proved, at the DB tier with this plan's own functions, three guarantees: idempotence (second write is a no-op, row byte-identical, exactly one audit entry), the audit-coupling trigger (an uncoupled terminal transition is rejected `AUDIT_COUPLING_VIOLATION` at COMMIT and stays PENDING), and the `cargoexec_ai` privilege wall (write functions succeed over the AI role, but `append()`'s case-anchor lock is refused `42501`, so the sequence cannot be completed end-to-end over `cargoexec_ai`).
- Extended the `headers.spec.ts` template-literal-SQL exclusion set by exactly one line with a third documented bullet, mirroring the existing two.

## Task Commits

1. **Task 1: AI-safe read functions** — `b928058` (feat)
2. **Task 2: recommendation terminal-write functions + headers exclusion** — `12d53fb` (feat)
3. **Task 3: DB-tier proof suite** — `ad6fb2b` (test)

## Files Created/Modified
- `server/src/db/repositories/recommendations.ts` — three write functions + updated file header; imports `RecommendationFailureReason`
- `server/src/db/repositories/exceptions.ts` — `loadExceptionForGeneration` (no join, safe for cargoexec_ai)
- `server/src/db/repositories/entries.ts` — `loadEntryValuesForRecommendation` (14 values, no specialists join)
- `server/test/architecture/headers.spec.ts` — `recommendations.ts` added to the template-literal-SQL `EXCLUDED` set with a third documented bullet
- `server/test/db/recommendationWrite.repo.spec.ts` — 8 tests over a real migrated database (idempotence, audit coupling ×2, privilege wall, no-entry-mutation, AI-safe reads)

## Decisions Made
- The terminal write runs over `cargoexec_app`, following the Phase 1 architecture (append() needs the case-anchor UPDATE privilege the AI role is denied). This is not a new deviation — plan 05-04's job uses `cargoexec_ai` only for its own reads (this plan's two read functions).
- `loadEntryValuesForRecommendation` is written fresh rather than reusing `loadEntryDetail` precisely because the latter joins `specialists`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed project dependencies**
- **Found during:** Task 1 (first build)
- **Issue:** `tsc` and `vitest` were absent from `node_modules/.bin` in a fresh sandbox — `npm run build:server` failed `sh: 1: tsc: not found`.
- **Fix:** `npm install --include=dev` (per runtime-environment.md §4 — devDependencies carry the build toolchain).
- **Files modified:** none (node_modules only)
- **Verification:** `npm run build:server` exits 0.
- **Committed in:** n/a (environment setup, no source change)

**2. [Rule 3 - Blocking] `--reporter=list` unsupported by installed vitest**
- **Found during:** Task 3 (running the new suite)
- **Issue:** The plan's verify command used `--reporter=list`; vitest 2.1.5 rejects it (`Failed to load custom Reporter from list`).
- **Fix:** Ran the suite and the full `test:db` with the default reporter (equivalent coverage/output). No source change.
- **Verification:** `npx vitest run server/test/db/recommendationWrite.repo.spec.ts` → 8/8; `npm run test:db` → 183/183.
- **Committed in:** n/a (invocation only)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking, environment/tooling only). No source deviation from the plan.
**Impact on plan:** None on the delivered code — the plan's functions and tests were implemented verbatim. Both blockers were sandbox setup, not design.

## Issues Encountered
- A transient stale TypeScript incremental-build artifact (from the uncommitted, in-progress plan 05-01 AI-config work present in the working tree) surfaced a spurious `logger.ts` "missing AppConfig fields" error on one combined `build:server` run. A clean recompile (`tsc -b contract server` directly, then the full script) resolved it with exit 0; the error was not reproducible and involved no file this plan owns. Noted so 05-01's executor is aware its work is still uncommitted in the tree.

## Note on working-tree state (out of scope)
The working tree carries uncommitted plan-05-01 work (`server/src/config.ts`, `server/src/http/logger.ts`, `package.json`, `server/test/api/boot.spec.ts`, and untracked `server/src/ai/**`, `server/test/api/recommendation.spec.ts`). This plan touched none of those files and left them exactly as found. `.planning/fragments/phase-5-roadmap.yaml` is also untracked and untouched.

## Known Stubs
None found. All "placeholder" occurrences in the changed files are the domain term (PENDING recommendation placeholder / SQL placeholder tuples) in comments, not incomplete code.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- Plan 05-04's generation job can now call `loadExceptionForGeneration` + `loadEntryValuesForRecommendation` (over `cargoexec_ai`) to compose its request, and `markRecommendationAvailable`/`markRecommendationUnavailable` + `insertRecommendationValues` + `append()` (over `cargoexec_app`) to persist the terminal result idempotently.
- `npm run test:db` is green at 183 tests; `npm run typecheck` and `npm run build:server` exit 0.
- No blockers for 05-03/05-04/05-05.

## Self-Check: PASSED

- All created/modified files exist on disk.
- All three task commits present (`b928058`, `12d53fb`, `ad6fb2b`).
- `npm run build:server` → exit 0; `npm run typecheck` → exit 0; `npm run test:db` → 183/183; `headers.spec.ts` → 48/48; new suite → 8/8.
- Known Stubs: none blocking.

---
*Phase: 05-ai-recommendation-as-an-un-applied-proposal*
*Completed: 2026-09-15*
