---
phase: 01-governed-record-substrate
plan: 09
subsystem: testing
tags: [governance, invariants, triggers, deferred-constraints, hitl, audit-coupling, provenance, postgres, vitest, sqlstate]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate (plan 01-06)
    provides: "createGovernedCase / createPendingRecommendation / createSpecialist fixtures and the append(tx, entry) audit writer, plus poolFor"
  - phase: 01-governed-record-substrate (plan 01-05)
    provides: "migrations 0008–0010 — privileges, the eleven invariant triggers (trg_exceptions_hitl, the five coupling triggers), and verify_audit_chain"
  - phase: 01-governed-record-substrate (plans 01-02..01-06)
    provides: "the thirteen application tables and their CHECK/UNIQUE/FK constraints (exceptions_closure_consistency_chk, exceptions_basis_fk, uq_decisions_exception, decisions_reason_required_chk, aev_origin_present_chk, rv_origin_ai_chk, cefo_origin_human_chk, dv_origin_chk)"
provides:
  - "server/test/db/hitl.spec.ts — TEST-DB-04, TEST-DB-18: HITL refusal and closure consistency, evidence for phase success criterion 3"
  - "server/test/db/coupling.spec.ts — TEST-DB-05/06/07: the five deferred audit-coupling triggers in both zero-entry and two-entry directions, evidence for criterion 2"
  - "server/test/db/provenance.spec.ts — TEST-DB-08/09/10/11/12: derivation basis, single decision, reason floor, and origin integrity, evidence for criterion 4"
affects: [01-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Refusal-layer discrimination: a deferred constraint trigger is proved by issuing each statement explicitly (all succeed) and wrapping only COMMIT in expect(...).rejects; a CHECK/FK/NOT NULL is proved to fail at the statement — the two are asserted apart, which is exactly criterion 2's 'fails at COMMIT rather than committing half of itself'"
    - "Every refusal asserted by SQLSTATE AND the named constraint or the P0001 message prefix (HITL_VIOLATION / AUDIT_COUPLING_VIOLATION), never a bare rejects.toThrow() — a bare throw would pass on a missing table"
    - "Two-direction coverage: each coupling trigger is exercised at n=0 AND n=2 to pin 'exactly one' at the n <> p_count comparison rather than 'at least one'"
    - "Positive controls in every block: a correctly formed transaction commits, so a suite that accidentally broke all writes cannot masquerade as a pass"
    - "Adversary role: every attempt runs as cargoexec_app (the full application privileges), never the owner — criterion 3 requires the refusal to hold from a direct SQL session with application privileges"
    - "Raw pg.Client with explicit BEGIN/COMMIT (not withTransaction) so the test observes precisely which statement throws; append() is called on that raw client since it accepts any open PoolClient/Client"

key-files:
  created:
    - "server/test/db/hitl.spec.ts"
    - "server/test/db/coupling.spec.ts"
    - "server/test/db/provenance.spec.ts"
  modified: []

key-decisions:
  - "SM-6's '3 fixture + 1 decision = 4 gapless entries' is proved with a REJECT decision, not APPROVE: REJECT needs no recommendation, so the case's audit history is exactly the four state transitions with case_sequence 1..4 and no intervening recommendation lifecycle to muddy the count"
  - "TEST-DB-08 asserts both spellings of a PASS-basis exception: validation_outcome='PASS' hits exceptions_basis_is_failure_chk (23514); the default 'FAIL' against a PASS result hits the composite exceptions_basis_fk (23503) — each additionally asserted to carry no 'trigger' in the message"

patterns-established:
  - "Pattern: a wave-6 governance suite is one file per invariant family, each self-contained (fresh migrated DB per file, its own GovernedCase per test), so a failed transaction in one test cannot leave another depending on rolled-back state"

# Metrics
duration: 9min
completed: 2026-09-14
---

# Phase 1 Plan 09: Governance Refusal Suite Summary

**Fifty-two database tests that deliberately mis-write transactions from the `cargoexec_app` role and assert the exact refusal — `HITL_VIOLATION`/`AUDIT_COUPLING_VIOLATION` (P0001) at `COMMIT` for the five deferred coupling triggers and the HITL trigger, and named `CHECK`/`FK`/`UNIQUE`/`NOT NULL` failures at the statement for closure consistency, derivation basis, the one-decision rule, the 10-character reason floor, and per-value origin — the terminal evidence table for phase success criteria 2, 3 and 4.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-09-14T02:57:52Z
- **Completed:** 2026-09-14T03:06:52Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments
- **Criterion 2 (fails at COMMIT, not half-committed):** all five DEFERRABLE INITIALLY DEFERRED coupling triggers exercised in both the zero-entry and two-entry directions; every refusal proved to arrive at `COMMIT` while every preceding `INSERT`/`UPDATE` succeeded.
- **Criterion 3 (no resolution without an accountable human, from full app privileges):** an exception cannot leave `OPEN` without a matching `decisions` row; the missing-decision, wrong-exception, and wrong-resulting-state variants all raise `HITL_VIOLATION`; a decision naming a non-existent specialist fails `decisions_decided_by_fkey` (23503) before any trigger.
- **Criterion 4 (no unattributed value, ever):** an audit value with a value and no origin, no values, or an out-of-set origin is rejected by the named CHECK; `recommendation_values` rejects `HUMAN`, `cargo_entry_field_origins` rejects `AI`, `decision_values` accepts both and rejects `ROBOT`; omitting `origin` entirely fails `NOT NULL` (23502), proving there is no nullable or default path.
- Exception derivation integrity (both spellings), one-decision-per-exception (`uq_decisions_exception`), and the 10-character reason floor (pinned at 9→reject / 10→accept, plus the 2001-char upper bound and `APPROVE`-with-NULL) all proved at the storage layer.
- Every guarantee carries a positive control that commits, so the suite proves a *precise* refusal rather than a broken table.
- Combined run green: **52 tests passed** (hitl 10, coupling 15, provenance 27); `tsc -b contract server` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: TEST-DB-04 and TEST-DB-18 — HITL and closure consistency** — `88c2552` (test)
2. **Task 2: TEST-DB-05/06/07 — the five coupling triggers** — `552206e` (test)
3. **Task 3: TEST-DB-08..12 — derivation, single decision, reason floor, origins** — `2937db7` (test)

**Plan metadata:** _(this SUMMARY + STATE.md, committed after self-check)_

## Files Created/Modified
- `server/test/db/hitl.spec.ts` — 10 tests. TEST-DB-04 (HITL: FK layer, wrong-exception, wrong-state, human-identity crux, positive control) and TEST-DB-18 (five closure-consistency variants, each at the statement with 23514).
- `server/test/db/coupling.spec.ts` — 15 tests. TEST-DB-06 (a/b/c creation coupling, zero + two-entry), TEST-DB-05 (decision coupling, zero + two-entry + positive control), TEST-DB-07 (recommendation terminal coupling: AVAILABLE/UNAVAILABLE, wrong-action, two-entry, PENDING-needs-no-entry, two positive controls), plus the SM-6 gapless-sequence assertion.
- `server/test/db/provenance.spec.ts` — 27 tests. TEST-DB-08 (both PASS-basis spellings + FAIL positive control), TEST-DB-09 (uq_decisions_exception), TEST-DB-10 (reason floor across EDIT_APPROVE/REJECT × 5 bad reasons + 10-char accept + 2001 reject + APPROVE-NULL accept), TEST-DB-11 (origin-present, some-value, out-of-set origin + positive control), TEST-DB-12 (rv/cefo/dv constant origins + the 23502 no-nullable-path property).

## Evidence table — RTM TEST-DB-04…12 and TEST-DB-18

| RTM | Spec file | Refusal layer | SQLSTATE | Constraint / trigger |
|-----|-----------|---------------|----------|----------------------|
| TEST-DB-04 | hitl.spec.ts | COMMIT (deferred trigger) | P0001 | `trg_exceptions_hitl` → `HITL_VIOLATION` |
| TEST-DB-04 (identity) | hitl.spec.ts | statement (FK) | 23503 | `decisions_decided_by_fkey` |
| TEST-DB-18 | hitl.spec.ts | statement (CHECK) | 23514 | `exceptions_closure_consistency_chk` |
| TEST-DB-05 | coupling.spec.ts | COMMIT (deferred trigger) | P0001 | `trg_decisions_audit` → `AUDIT_COUPLING_VIOLATION` |
| TEST-DB-06 | coupling.spec.ts | COMMIT (deferred trigger) | P0001 | `trg_entries_audit` / `trg_validation_audit` / `trg_exceptions_audit` → `AUDIT_COUPLING_VIOLATION` |
| TEST-DB-07 | coupling.spec.ts | COMMIT (deferred trigger) | P0001 | `trg_recommendations_audit` → `AUDIT_COUPLING_VIOLATION` |
| TEST-DB-08 | provenance.spec.ts | statement (CHECK / FK) | 23514 / 23503 | `exceptions_basis_is_failure_chk` / `exceptions_basis_fk` |
| TEST-DB-09 | provenance.spec.ts | statement (UNIQUE) | 23505 | `uq_decisions_exception` |
| TEST-DB-10 | provenance.spec.ts | statement (CHECK) | 23514 | `decisions_reason_required_chk` / `decisions_reason_len_chk` |
| TEST-DB-11 | provenance.spec.ts | statement (CHECK) | 23514 | `aev_origin_present_chk` / `aev_some_value_chk` / `aev_after_origin_chk` |
| TEST-DB-12 | provenance.spec.ts | statement (CHECK / NOT NULL) | 23514 / 23502 | `rv_origin_ai_chk` / `cefo_origin_human_chk` / `dv_origin_chk` / not-null |

## Decisions Made
- **SM-6 proved via a REJECT decision, not APPROVE.** REJECT requires no recommendation (`decisions_approve_needs_recommendation_chk` applies only to APPROVE), so the case's audit history is exactly its four state transitions (ENTRY_RECEIVED, VALIDATION_COMPLETED, EXCEPTION_OPENED, RECOMMENDATION_REJECTED) with `case_sequence` `[1,2,3,4]` and no intervening recommendation lifecycle — the cleanest possible demonstration of "one audit entry per state change, gapless".
- **TEST-DB-08 covers both spellings and asserts the absence of a trigger in the message.** The plan calls for both `exceptions_basis_is_failure_chk` (when `validation_outcome='PASS'` is supplied) and `exceptions_basis_fk` (when the default `'FAIL'` is used against a PASS result); each test additionally asserts the message does not contain `trigger`, confirming derivation integrity is a plain CHECK/FK, not a trigger.

## Deviations from Plan

None - plan executed exactly as written.

The one wording change worth noting is not a behavioural deviation: the header comment in `hitl.spec.ts` originally spelled out the forbidden tokens (`SET CONSTRAINTS`, `DROP TRIGGER`, `session_replication_role`) in prose, which tripped the plan's own negative `grep` guard — the same false-positive class documented in plans 01-03 and 01-06. The comment was reworded to describe the prohibitions without the literal tokens; no test logic changed.

## Authentication Gates
None — the local Postgres compose stack (`postgres:16.4`) was already up and healthy; no external service or credential prompt occurred.

## Known Stubs
- `server/test/db/provenance.spec.ts:171,235` — the `password_hash` literal `'argon2id$placeholder'` when building ad-hoc specialists for the PASS-basis cases. **Cosmetic, intended:** the same placeholder pattern established in 01-06 (phase 2 owns real hashing); no login path exists in phase 1 and these specialists exist only to satisfy `cargo_entries.created_by` / `decisions.decided_by` foreign keys. Not blocking.
- No blocking stubs. This is a test-only plan; every test executes real transactions against a real migrated Postgres and asserts real refusals.

## Issues Encountered
- The plan's `--reporter=list` flag is unsupported on this repo's pinned vitest 2.1.5 (documented in 01-03 and 01-06). The suites were run with the default reporter, which reports pass/fail per test identically. Not a code issue.

## Database Contract Compliance
DB-backed app; the compose stack (`docker-compose.yml`, `postgres:16.4`, healthcheck, published `5432`) established in 01-01 is unchanged. This plan adds no migration: every test creates a fresh database, runs the full migration set 0001–0011, asserts, and DROPs it (the audit tables cannot be truncated — §8.2). No compose changes were needed.

## Next Phase Readiness
- **Ready for 01-10 (wave 7):** the full-suite gate. Plans 01-08 and 01-09 ran in parallel in wave 6; 01-10 depends on both and runs alone, so its `npm run test:db` invocation now sees these three complete spec files. Nine of the eighteen governance assertions (TEST-DB-04…12, TEST-DB-18) are in place; 01-08 owns the immutability/behavioural half.
- No blockers. Phase success criteria 2, 3 and 4 are demonstrated at the storage layer with refusals and positive controls.

## Self-Check: PASSED

- Files present on disk: `hitl.spec.ts`, `coupling.spec.ts`, `provenance.spec.ts` — all FOUND; line counts 418 / 720 / 600 exceed the plan minimums of 100 / 130 / 120.
- Commits present: `88c2552` (Task 1), `552206e` (Task 2), `2937db7` (Task 3) — all FOUND.
- Build/typecheck: `npx tsc -b contract server` → exit 0. (Test-only plan; there is no separate application build for a governance test suite — the TypeScript project build is the compile gate and it passes.)
- Combined suite: `npx vitest run server/test/db/hitl.spec.ts server/test/db/coupling.spec.ts server/test/db/provenance.spec.ts` → 52 passed, 0 failed, 0 skipped.
- Plan verify guards: all `provides`-contract greps return ≥ expected; every refusal asserted by SQLSTATE + constraint/prefix; no `SET CONSTRAINTS` / `DROP TRIGGER` / `DISABLE TRIGGER` / `session_replication_role` in any spec; every block has a positive control.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-14*
