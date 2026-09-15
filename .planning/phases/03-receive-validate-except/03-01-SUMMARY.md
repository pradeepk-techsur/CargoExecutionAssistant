---
phase: 03-receive-validate-except
plan: 01
subsystem: database
tags: [postgres, pg, contract, dto, repositories, sql, unnest, receipt, validation, exceptions]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate
    provides: the thirteen tables + grants + case_reference_seq / exception_receipt_position_seq (F0), specialists.id for created_by (F1)
  - phase: 02-identity-and-the-federal-ui-foundation
    provides: Queryable interface, contract build/export wiring, @cargoexec/contract resolution
provides:
  - "contract/src/dto.ts §3.12 wire types: EntryValues, EntryFieldOrigins, EntryDto, FindingDto, ValidationDto, ExceptionRef, ReceiptResponse, EntryDetailResponse, EntryCreateRequest"
  - "VALIDATION_ENGINE_FAILURE added to INTERNAL_INVARIANT_CODES (disjoint from ERROR_CODES)"
  - "entries repository: allocateReceiptStamp, insertEntry, lockCaseAnchor, insertFieldOrigins, findCaseReferenceByEntryNumber, loadEntryDetail, loadFieldOrigins"
  - "validation repository: insertValidationResult, insertFindings, loadValidationByEntry"
  - "exceptions repository: insertException, insertPendingRecommendation, loadExceptionRefByEntry"
  - "db-tier proof entries.repo.spec.ts: nine cases exercised as cargoexec_app"
affects: [03-02 rule engine, 03-05 receipt service, 03-06 entries route, 03-07 exception integrity, F6 entry UI, F7 queue read, F9 recommendation, F10 case detail, F11 decision]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Queryable-first repositories: every function takes the caller's tx handle, never a pool; no BEGIN inside a repository (R-L1, R-L2)"
    - "Static-SQL / bind-parameters-only; multi-row inserts use unnest(text[]) so the query text stays a constant (R-L8, headers.spec.ts gate)"
    - "Numeric/date columns cast to text on read (::text / to_char) so wire values stay string|null with no float rounding"
    - "insertException binds only entry_id + validation_result_id; the composite FK rejects a PASS basis with no trigger"

key-files:
  created:
    - server/src/db/repositories/validation.ts
    - server/src/db/repositories/exceptions.ts
    - server/test/db/entries.repo.spec.ts
  modified:
    - contract/src/dto.ts
    - contract/src/errors.ts
    - server/src/db/repositories/entries.ts
    - server/test/unit/contract.spec.ts
    - server/test/unit/scaffolding.spec.ts

key-decisions:
  - "VALIDATION_ENGINE_FAILURE is an application-level internal invariant code (rule predicate throws / out-of-set finding), placed in INTERNAL_INVARIANT_CODES, never ERROR_CODES — logged against request_id, surfaced only as the generic 500 RECEIPT_FAILED"
  - "No migration 0012 was added: all thirteen tables and both sequences pre-exist from Phase 1; schema.spec.ts still pins thirteen tables"
  - "entries.ts pre-existed (created type-only by plan 03-02 in the same wave); this plan completed it with the repository functions, preserving CanonicalEntryRecord byte-compatibly"

patterns-established:
  - "unnest() for every multi-row insert keeps the template-literal-SQL exclusion list at exactly two files (db/tx.ts, services/audit/writer.ts)"
  - "db-tier repo specs run each case in BEGIN … ROLLBACK so deferred audit-coupling triggers do not fire, exercising repositories in isolation; every refusal asserted by SQLSTATE + constraint name with a positive control"

# Metrics
duration: ~35 min
completed: 2026-09-15
---

# Phase 3 Plan 01: Receipt Persistence Surface Summary

**The §3.12 receipt wire types plus three Queryable-first, static-SQL repositories (entries, validation, exceptions) that the receipt transaction will drive, proven insert-by-insert against the real schema as cargoexec_app.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-15T16:09Z (approx.)
- **Completed:** 2026-09-15T16:18Z
- **Tasks:** 3
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments
- Added the eight TechArch §3.12 wire types verbatim plus `EntryCreateRequest`, all keyed by `EntryFieldName` so a fifteenth field cannot be introduced on one side only (compile-time `satisfies` + runtime key check).
- Completed `entries.ts` with the receipt-stamp allocator, the single immutable `cargo_entries` INSERT (final `receipt_outcome`, D-3), the `SELECT … FOR UPDATE` case-anchor lock, the `unnest()` field-origin insert, the pool-side duplicate lookup, and the `GET /api/entries/{id}` read (numeric/date cast to text).
- Built `validation.ts` and `exceptions.ts`: result + findings persistence (findings via 4×`text[]` `unnest`, ascending `rule_id` preserved), and exception opening that binds only `entry_id` + `validation_result_id` so the composite FK rejects a passing basis with no trigger, plus the PENDING recommendation placeholder.
- Proved every insert with `entries.repo.spec.ts` — nine db-tier cases as `cargoexec_app`, three of them refusals (`validation_results_counts_chk` 23514, `exceptions_basis_fk` 23503, `uq_exceptions_entry` 23505) each with SQLSTATE + constraint + a positive control.

## Task Commits

1. **Task 1: §3.12 contract types + VALIDATION_ENGINE_FAILURE** — `f12ed52` (feat)
2. **Task 2: entries repository** — `a79339c` (feat) — see note below
3. **Task 3: validation + exceptions repositories + db-tier spec** — `4e00dc2` (feat)
4. **Deviation: scaffolding spec for the ninth internal code** — `341e032` (fix)

_Note on Task 2's commit hash:_ this plan ran in parallel with plans 03-02 and
03-03 on the same `phase-3` branch. The `server/src/db/repositories/entries.ts`
changes staged for Task 2 were swept into a concurrently-created commit that is
labelled `feat(03-02): domain code lists…` (`a79339c`). The **code is present
and correct at HEAD** (verified: `git show HEAD:…/entries.ts` contains
`allocateReceiptStamp` and all Task 2 exports; `git log -S'allocateReceiptStamp'`
→ `a79339c`). The mislabelled commit message is cosmetic; no work was lost.

## Files Created/Modified
- `contract/src/dto.ts` — §3.12 entry/validation/receipt wire types + `EntryCreateRequest`, `import type { EntryFieldName }`
- `contract/src/errors.ts` — `VALIDATION_ENGINE_FAILURE` added to `INTERNAL_INVARIANT_CODES`
- `server/src/db/repositories/entries.ts` — completed with the six+ repository functions (was type-only from 03-02)
- `server/src/db/repositories/validation.ts` — result/findings inserts + per-entry read (created)
- `server/src/db/repositories/exceptions.ts` — exception + PENDING recommendation inserts + per-entry ref read (created)
- `server/test/db/entries.repo.spec.ts` — nine-case db-tier proof (created)
- `server/test/unit/contract.spec.ts` — internal-code count/disjointness + §3.12 key-coverage assertions
- `server/test/unit/scaffolding.spec.ts` — updated for the ninth internal invariant code (deviation)

## Decisions Made
- Placed `VALIDATION_ENGINE_FAILURE` in `INTERNAL_INVARIANT_CODES` only (never `ERROR_CODES`) — an application-level abort code that must surface as the generic `500 RECEIPT_FAILED`.
- No migration added; relied entirely on the Phase 1 schema, grants and sequences.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed devDependencies to obtain the build/test toolchain**
- **Found during:** Pre-execution baseline check (before Task 1)
- **Issue:** The workspace's `node_modules` was installed with `--omit=dev` (the container runtime image), so `tsc`, `vitest`, `supertest` etc. were absent — the plan's every `<verify>` was unrunnable.
- **Fix:** `npm install --include=dev` (per runtime-environment.md §4 — devDependencies are the build toolchain). No source or manifest change.
- **Files modified:** none (node_modules only; package-lock unchanged in the working tree)
- **Verification:** `npm run build:server` and `npm run typecheck` subsequently exit 0.
- **Committed in:** n/a (no tracked files changed)

**2. [Rule 1 - Bug] Updated scaffolding.spec.ts for the ninth internal invariant code**
- **Found during:** Final verification (`npm run test:unit`)
- **Issue:** `server/test/unit/scaffolding.spec.ts` pinned `INTERNAL_INVARIANT_CODES.length === 8`. Adding `VALIDATION_ENGINE_FAILURE` (a required Task-1 change) broke that exact assertion — a regression my own change caused, directly in scope.
- **Fix:** Split the assertion — the eight database-enforced codes must all be present (subset check), and the new application-level `VALIDATION_ENGINE_FAILURE` is asserted separately, keeping the documented total at nine.
- **Files modified:** server/test/unit/scaffolding.spec.ts
- **Verification:** `npm run test:unit` → 189 passed, 0 failed, 0 skipped.
- **Committed in:** `341e032`

### Non-blocking observations (not deviations)

- **`--reporter=list` is not a valid vitest 2.1.5 reporter.** Every `<verify>` block used `--reporter=list`, which the installed vitest rejects with a startup error ("Failed to load custom Reporter from list"). Verification was run with vitest's default reporter, which reports the same pass/fail/skip counts. No behaviour changed; this is a wording mismatch between the plan and the pinned tool version.
- **Parallel-wave commit attribution.** As noted above, Task 2's diff landed under a 03-02-labelled commit due to concurrent execution on the shared `phase-3` branch. The code is correct at HEAD.

---

**Total deviations:** 2 auto-fixed (1 blocking — toolchain install; 1 bug — test regression from an in-scope change).
**Impact on plan:** Both necessary; no scope creep. All plan artifacts delivered exactly as specified.

## Issues Encountered
- Working-tree changes to `server/test/api/guard.spec.ts` and `server/test/api/session.spec.ts` appeared during execution from the parallel plan 03-03 (requireApiAuth gate). These are **not** this plan's files and were deliberately left unstaged/uncommitted by this plan; the api tier including them passes (77/77).

## Known Stubs
None found. The `grep` scan flagged only the domain word "placeholder" in legitimate prose (SQL placeholder scaffolding; the PENDING recommendation placeholder, a real F5 FR-5.12 entity) — no incomplete implementations, no blocking stubs.

## User Setup Required
None - no external service configuration required.

## Verification (final gate)
- `npm run build:server` → exit 0
- `npm run typecheck` → exit 0
- `npm run test:unit` → 189 passed, 0 skipped
- `npm run test:db` → 123 passed, 0 skipped (includes entries.repo.spec.ts: 9/9)
- `npm run test:api` → 77 passed, 0 skipped
- `npm run test:arch` → 130 passed, 0 skipped (schema.spec.ts still pins thirteen tables — no migration added)

## Next Phase Readiness
- The receipt persistence surface is complete and typed: 03-02 (rule engine) already imports `CanonicalEntryRecord`; 03-05 (receipt service) can drive the three repositories inside one transaction; 03-06 (route) types against the §3.12 DTOs.
- No blockers introduced. The parallel plans 03-02 and 03-03 committed on the same branch during this run; their SUMMARYs cover their own work.

## Self-Check: PASSED
- `server/src/db/repositories/validation.ts` — FOUND
- `server/src/db/repositories/exceptions.ts` — FOUND
- `server/test/db/entries.repo.spec.ts` — FOUND
- `contract/src/dto.ts` §3.12 types — FOUND (grep CONTRACT_OK)
- Commits f12ed52, a79339c (Task 2 code at HEAD), 4e00dc2, 341e032 — FOUND
- Plan-level build ran and passed: `npm run build:server` → exit 0; `npm run typecheck` → exit 0
- Known Stubs section present; no blocking stubs

---
*Phase: 03-receive-validate-except*
*Completed: 2026-09-15*
