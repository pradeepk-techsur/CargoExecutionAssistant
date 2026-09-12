---
phase: 01-governed-record-substrate
plan: 02
subsystem: database
tags: [postgres, sql, migrations, ddl, check-constraints, composite-foreign-key, provenance]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate (plan 01-01)
    provides: "forward-only migration runner (schema_migrations), postgres:16.4 compose stack, cargoexec_owner role, ENTRY_FIELDS contract"
provides:
  - "server/migrations/0001_identity.sql — specialists + sessions (sole actor table, no role/AI row)"
  - "server/migrations/0002_entries.sql — case_reference_seq, cargo_entries (case anchor, 14 submitted fields), cargo_entry_field_origins with CHECK (origin = 'HUMAN')"
  - "server/migrations/0003_validation.sql — validation_results (UNIQUE (id, outcome)) + validation_findings (no severity column)"
  - "server/migrations/0004_exceptions.sql — exception_receipt_position_seq + exceptions (composite basis FK, closure-consistency CHECK)"
affects: [01-04, 01-05, 01-06, 01-07, F0, F13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Constant-value CHECK (origin = 'HUMAN') — not an enum — makes an AI/unattributed typed value unrepresentable for every role"
    - "Composite foreign key (validation_result_id, validation_outcome) → validation_results (id, outcome) enforces exception derivation integrity at the database with no trigger"
    - "Column comments record why columns are ABSENT (no role, no severity, no SLA) — scope exclusions documented in the DDL itself"
    - "receipt_position via a dedicated sequence + partial index on state='OPEN' — the only ordering dimension that exists"

key-files:
  created:
    - "server/migrations/0001_identity.sql"
    - "server/migrations/0002_entries.sql"
    - "server/migrations/0003_validation.sql"
    - "server/migrations/0004_exceptions.sql"
  modified: []

key-decisions:
  - "exceptions.decision_id left as a bare uuid with NO foreign key — decisions table does not exist until migration 0006 (plan 01-04), which adds exceptions_decision_fk"
  - "cargo_entry_field_origins.origin is NOT NULL with a constant CHECK and no column DEFAULT — an omitted origin fails NOT NULL, so there is no nullable path to an unattributed value"
  - "No validation_rules / rule_set_version table — the rule registry is a compiled-in constant (F4 FR-4.1); rule_id is a text column with a format CHECK and rule_set_version is a text column on the result"

patterns-established:
  - "DDL copied verbatim from FRD Y0-schema.md — constraint/index names are contracts asserted by plan 01-07's schema suite"
  - "Every migration is `-- Up Migration` only, no down path, no INSERT into any domain table (FR-Y0.1, FR-0.18)"

# Metrics
duration: 2min
completed: 2026-09-12
---

# Phase 1 Plan 02: Core Entity Migrations Summary

**Four forward-only migrations (identity, entries, validation, exceptions) whose constant-`HUMAN` origin CHECK and composite basis foreign key make an unattributed entry value and a failure-less exception structurally unrepresentable at the database.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-12T13:22:24Z
- **Completed:** 2026-09-12T13:24:38Z
- **Tasks:** 3
- **Files modified:** 4 created

## Accomplishments
- `specialists` / `sessions` (0001): the sole actor table with no `role`/`is_supervisor`/`permissions`/`scope` column and no seeded AI/SYSTEM row; sessions store only 32-byte token and CSRF hashes.
- `cargo_entries` / `cargo_entry_field_origins` (0002): the case anchor with 5 metadata + 14 submitted fields, plus per-value provenance where `origin` carries `CHECK (origin = 'HUMAN')` as a constant with no default — a typed value can never be marked `AI` and never be unattributed.
- `validation_results` / `validation_findings` (0003): PASS/FAIL results with a counts-consistency CHECK and `UNIQUE (id, outcome)`; findings graded by no severity/weight/score/priority column.
- `exceptions` (0004): derivation integrity via the composite FK `(validation_result_id, validation_outcome) → validation_results (id, outcome)` combined with `exceptions_basis_is_failure_chk`, and closure consistency via `exceptions_closure_consistency_chk` — proven by a rejected `PASS`-basis insert with no trigger involved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0001 — identity** — `51a7949` (feat)
2. **Task 2: Migration 0002 — entries and constant-HUMAN origin table** — `e4b36ab` (feat)
3. **Task 3: Migrations 0003 and 0004 — validation, exceptions** — `0529229` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md, committed after self-check)_

## Files Created/Modified
- `server/migrations/0001_identity.sql` — `specialists` (email lowercase + length CHECKs, unique email index), `sessions` (32-byte hash CHECKs, revocation + expiry CHECKs); `pgcrypto` extension
- `server/migrations/0002_entries.sql` — `case_reference_seq`; `cargo_entries` (case_reference format CHECK, per-field length CHECK, 3 indexes incl. partial `entry_number`); `cargo_entry_field_origins` (constant `HUMAN` origin CHECK, 14-name field CHECK)
- `server/migrations/0003_validation.sql` — `validation_results` (outcome CHECK, counts CHECK, `uq_validation_results_id_outcome`, one-per-entry unique index); `validation_findings` (RIV-nnn format CHECK, message length CHECK)
- `server/migrations/0004_exceptions.sql` — `exception_receipt_position_seq`; `exceptions` (state CHECK, basis-is-failure CHECK, composite basis FK, closure-consistency CHECK, 4 indexes)

## Decisions Made
- **`exceptions.decision_id` is a bare `uuid` with no foreign key yet.** The `decisions` table does not exist until migration 0006 (plan 01-04), which will add `exceptions_decision_fk`. No placeholder table was invented (per plan instruction).
- **No column default on `cargo_entry_field_origins.origin`.** Combined with `NOT NULL` and the constant CHECK, this closes the "nullable path to an unattributed value" — half-proving phase success criterion 4 at the entry layer.
- **No `validation_rules` / `rule_set_version` table.** The rule registry is a compiled-in constant (F4 FR-4.1); a rule change is a data change plus a `rule_set_version` bump, never a schema change.

## Deviations from Plan

None - plan executed exactly as written.

All DDL was copied verbatim from the plan (sourced from `project_specs/FRD/Y0-schema.md` / `project_specs/TechArch/02a-data-model-core.md`). Every task `<verify>` block, every `<done>` criterion, and the plan-level `<verification>` block passed on first run with no fixes required.

**Total deviations:** 0.
**Impact on plan:** None — no scope creep, no auto-fixes needed.

## Known Stubs
None found — `grep` for `TODO|FIXME|placeholder|not.?implemented|coming soon` across all four migration files returns nothing. `exceptions.decision_id` without a foreign key is not a stub: it is the deliberate deferral of `exceptions_decision_fk` to migration 0006, documented in the DDL comment and in the plan.

## Issues Encountered
None. `npm run migrate` applied 0001–0004 cleanly (4 rows in `schema_migrations`), `tsc -b contract server` exits 0, and every constraint/index assertion passed.

## Database Contract Compliance
DDL-only plan — no runtime/app service changes. Migrations run against the plan-01-01 compose `postgres:16.4` stack via the forward-only runner as `cargoexec_owner`. No compose file change, no `.planning/infrastructure.json`.

## Next Phase Readiness
- Ready for **01-03** (already in progress on `phase-1`) and **01-04** — the six core tables (`specialists`, `sessions`, `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`) plus `exceptions` are in place. Migration 0006 (plan 01-04) must add the `decisions` table and `exceptions_decision_fk`; migration 0009 (plan 01-05) adds the HITL/coupling triggers that complete the closure guard.
- No blockers.

## Self-Check: PASSED

- All 4 created migration files present on disk.
- All 3 task commits present in history (`51a7949`, `e4b36ab`, `0529229`).
- Build check: `npm run typecheck` (`tsc -b contract server`) → exit 0.
- Plan-level verification: `npm run migrate` records 4 rows in `schema_migrations`; `exceptions` PASS-basis insert rejected; `grep -ci "insert into"` = 0 and `grep -c "Down Migration"` = 0 for all four files.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-12*
