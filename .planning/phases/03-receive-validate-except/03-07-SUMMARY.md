---
phase: 03-receive-validate-except
plan: 07
subsystem: testing
tags: [exception-derivation, atomicity, architecture-tests, composite-fk, criterion-4, criterion-5, receipt]

# Dependency graph
requires:
  - phase: 03-05
    provides: "receipt.service.ts receiveEntry — the atomic receipt transaction and sole writer of the receipt tables"
  - phase: 03-06
    provides: "routes/entries.ts + API_ROUTE_TABLE (five-of-ten implemented) — the reachable POST/GET /api/entries"
  - phase: 01
    provides: "composite basis FK, deferred coupling triggers, HITL trigger, per-role privileges, verify_audit_chain"
provides:
  - "server/test/db/exceptionBasis.spec.ts — criterion 4 evidenced by SQL from cargoexec_app (14 cases)"
  - "server/test/db/receiptAtomicity.spec.ts — criterion 5 eight-table census under forced mid-transaction failures (12 cases)"
  - "server/test/architecture/receiptPaths.spec.ts — criterion 4 evidenced by code/API/UI (11 assertion groups); permanent R-L5 guard"
affects: [03-09, 03-11, phase-4-queue, phase-6-decision]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two documented HITL-trigger findings asserted as ACTUAL behaviour with the guarantee-carrying mechanism named, never weakened to a false refusal"
    - "Architecture assertions proven RED on planted violations before being trusted (Phase 2 02-09 precedent extended)"

key-files:
  created:
    - server/test/db/exceptionBasis.spec.ts
    - server/test/db/receiptAtomicity.spec.ts
    - server/test/architecture/receiptPaths.spec.ts
  modified: []

key-decisions:
  - "The HITL trigger guards only state changes away from OPEN, so an UPDATE of validation_result_id or receipt_position on an OPEN exception is NOT refused at the DB — basis/receipt-position immutability rests on the single write path (asserted architecturally), and the db spec asserts the actual behaviour explicitly"
  - "receiptPaths.spec.ts identifies the insert-function CALLER set by scanning for the six insert function NAMES, so the validation engine's type-only CanonicalEntryRecord import does not spuriously join the write-path allowlist"
  - "The forbidden-content audit lever (Bearer/sk- shaped goods_description) is the primary mid-transaction failure injection — a real, causal failure after the entry INSERT with no mocking"

patterns-established:
  - "Census helper: count all eight receipt-touching tables, compare before/after a forced failure"
  - "Allowlist seams (UPDATE exceptions, insert-function callers) documented in-comment for the owning future phase to extend, never a skipped test"

# Metrics
duration: 12 min
completed: 2026-09-15
---

# Phase 3 Plan 07: Exception-Derivation Integrity Evidence Summary

**Three test files proving, from the application role and by reading the shipped tree, that an exception is unforgeable (composite FK), unauthorable (one write path, no route, no affordance) and atomic (a forced mid-transaction failure leaves an eight-table census byte-identical).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-15T16:55:00Z
- **Completed:** 2026-09-15T17:07:00Z
- **Tasks:** 3
- **Files created:** 3 (all test-only; zero production code changed)

## Accomplishments

- **Criterion 4 by SQL** (`exceptionBasis.spec.ts`, 14 cases, all as `cargoexec_app`): an exception on a PASS result is refused by `exceptions_basis_fk` (`23503`, asserted to be a foreign-key violation and NOT a `P0001` trigger raise); explicit `validation_outcome='PASS'` refused by `exceptions_basis_is_failure_chk` (`23514`); NOT NULL basis; findings uniqueness (`uq_validation_findings_rule`); one-exception-per-entry and one-result-per-entry; `receipt_position` strictly increasing, unique, never compacted after a rollback with the surviving queue order intact; the `exceptions` column set asserted equal to exactly the nine of migration 0004 (no priority/severity/SLA/assignment column); `exceptions_state_chk` admits exactly `OPEN/RESOLVED/REJECTED`. Every negative has a positive control.
- **Criterion 5 by census** (`receiptAtomicity.spec.ts`, 12 cases): real mid-transaction failures (forbidden audit content after the entry INSERT; duplicate `entry_number`; over-length `cargo_entries_len_chk`) each leave the eight-table census identical, including zero new `cargo_entries` (F3 acceptance 3); five whole-database orphan/coupling invariants and per-entry audit-pair `HAVING count(*) <> 1` queries each return 0; a positive control proves the exact row deltas on both outcomes; every committed case's chain verifies with contiguous `case_sequence`.
- **Criterion 4 by code/API/UI** (`receiptPaths.spec.ts`, 11 assertion groups): the `INSERT INTO` file set is exactly the three repositories; the only caller of the insert functions is `receipt.service.ts` and `routes/entries.ts` imports none; no UPDATE/DELETE on the five immutable tables; no `UPDATE exceptions` at all (Phase 6 allowlist seam documented); no exception-authoring function name; no state-changing route on an exception collection (table still ten, `POST …/decision` the only mutating exception row); no ingest/bulk/export/admin/search/metrics path; no open/create-exception copy; no state-changing fetch to an exception collection; no file input / drag-and-drop / template download / batch paste; no draft/autosave/duplicate store.

## Task Commits

1. **Task 1: exceptionBasis.spec.ts** — `1bf7156` (test)
2. **Task 2: receiptAtomicity.spec.ts** — `d704fd6` (test)
3. **Task 3: receiptPaths.spec.ts** — `3f87f34` (test)

_(Plan metadata commit follows this summary.)_

## Files Created/Modified

- `server/test/db/exceptionBasis.spec.ts` (710 lines) — criterion 4, SQL path, 14 cases as `cargoexec_app`
- `server/test/db/receiptAtomicity.spec.ts` (408 lines) — criterion 5, eight-table census, 12 cases
- `server/test/architecture/receiptPaths.spec.ts` (447 lines) — criterion 4, code/API/UI paths, 11 assertion groups

## Decisions Made

- **HITL trigger scope (the plan's cases 6 & 11 branch).** Reading `0009_invariant_triggers.sql` before writing the assertions confirmed `exceptions_require_human_decision` guards only `NEW.state <> 'OPEN'`. An `UPDATE exceptions SET validation_result_id = …` or `SET receipt_position = …` that leaves the row `OPEN` is therefore **not** refused at the database, and `cargoexec_app` holds `UPDATE` on `exceptions` (migration 0008, for the F11 closure path). The spec asserts the **actual** behaviour (the UPDATE succeeds, performed inside a rolled-back transaction) and records that basis and receipt-position immutability are carried by the **single write path** — proven by `receiptPaths.spec.ts` assertion 4 (no `UPDATE exceptions` anywhere in `server/src` outside the Phase 6 decision-service allowlist). This is the exact contingency the plan anticipated; the guarantee is intact, just via a different mechanism than a DB refusal.
- **State-CHECK isolation (case 14).** A non-OPEN state also trips `exceptions_closure_consistency_chk`, which can fire first. To isolate `exceptions_state_chk`, the forbidden-state UPDATE supplies a genuine `decision_id` (a real REJECT decision) and `closed_at`, all inside a rolled-back transaction so the decision's deferred coupling trigger never fires.
- **Caller-set scan by function name (assertion 2).** The validation engine imports `CanonicalEntryRecord` type-only from `repositories/entries`. Scanning for the six insert **function** names (`insertEntry`, …) rather than the module path keeps the engine out of the write-path allowlist correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `bareReceivedEntry` helper rebuilt to use the real audit writer**
- **Found during:** Task 1
- **Issue:** The first draft hand-wrote the ENTRY_RECEIVED audit row with a hardcoded `entry_hash` (`repeat('11',32)`). `uq_audit_entries_entry_hash` is global, so the second call collided (`23505`), and the hardcoded hash would also fail chain verification.
- **Fix:** Rebuilt the helper to insert the coupled ENTRY_RECEIVED through `append()` inside `withTransaction`, so the hash chain is genuine and unique across repeated calls.
- **Files modified:** server/test/db/exceptionBasis.spec.ts (test-only)
- **Verification:** All 14 cases pass; full `test:db` 160/160.
- **Committed in:** `1bf7156`

---

**Total deviations:** 1 auto-fixed (1 blocking, test-only). **Impact:** none on production code — the fix corrected a test helper. No scope creep.

## Known Stubs

None found. The three files contain no TODO/FIXME/placeholder, no `.skip`/`.only`/`.todo`, and no un-implemented assertion. Deferred future surfaces (Phase 4 read services joining the caller set; Phase 6 `decision.service.ts` joining the `UPDATE exceptions` allowlist) are in-comment allowlist seams, not skipped tests.

## Red-Proof Record (architecture assertions)

Per the plan's requirement and the Phase 2 `02-09` precedent, the following `receiptPaths.spec.ts` assertions were proven to FAIL on a planted violation, then the violation removed:

- **Assertion 1** (INSERT-INTO file set) — planted `INSERT INTO exceptions (…)` in a scratch `server/src` file → failed.
- **Assertion 4** (no `UPDATE exceptions`) — planted `UPDATE exceptions SET state = …` → failed.
- **Assertion 5** (no authoring function name) — the scratch file's `createException()` also tripped this → failed (bonus proof).
- **Assertion 8** (no authoring UI copy) — planted `<button>Open an exception</button>` in a scratch `web/src` component → failed.

All four returned green once the scratch files were deleted.

## Verification

- `npm run build:server` → exit 0
- `npm run typecheck` → exit 0
- `npm run test` → unit 218 / db 160 / api 104 / arch 148 = **630 passed, 0 failed, 0 skipped**
- `git diff --stat 5ec308f..HEAD -- server/src web/src contract/src` → empty (no production code changed)

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 3 now has evidence for both its *(no screen)* success criteria (4 and 5). Remaining phase-3 plan: **03-09** (`/entries/new` screen). The UI-absence assertions in `receiptPaths.spec.ts` are absence assertions and will re-run green against `web/src/screens/NewEntry.tsx` once 03-09 lands.
- `receiptPaths.spec.ts` is a permanent guard: when Phase 4 adds read services and Phase 6 adds `decision.service.ts`, the owning plan extends the documented allowlist seams (caller set / `UPDATE exceptions`) deliberately.

## Self-Check: PASSED

- Created files exist on disk: exceptionBasis.spec.ts, receiptAtomicity.spec.ts, receiptPaths.spec.ts — all FOUND.
- Commits exist: `1bf7156`, `d704fd6`, `3f87f34` — all FOUND.
- Test-only plan: `build:server` and `typecheck` both exit 0; there is no separate app build to run.
- `## Known Stubs` present; no blocking stub.

---
*Phase: 03-receive-validate-except*
*Completed: 2026-09-15*
