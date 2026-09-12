---
phase: 01-governed-record-substrate
plan: 05
subsystem: database
tags: [postgres, triggers, privileges, audit, append-only, hash-chain, hitl, plpgsql]

requires:
  - phase: 01-governed-record-substrate (plan 01-04)
    provides: audit_entries, audit_entry_values, decisions, decision_values tables (migrations 0006, 0007)
  - phase: 01-governed-record-substrate (plans 01-02)
    provides: cargo_entries, validation_results, exceptions, recommendations tables and the two sequences
provides:
  - "Migration 0008: audit append-only grants, request-path grants, the cargoexec_ai privilege wall, no DDL for runtime roles"
  - "Migration 0009: eleven invariant triggers (mutation rejection, hash chain, HITL, five audit-coupling)"
  - "Migration 0010: verify_audit_chain(uuid) — read-only STABLE chain verifier"
  - "The complete migration set 0001–0010 applying forward-only in one npm run migrate"
affects: [01-06 audit writer, 01-07, 01-08, 01-09, 01-10 governance test suite, F14 chain UI phase 6]

tech-stack:
  added: []
  patterns:
    - "Deferred constraint triggers (DEFERRABLE INITIALLY DEFERRED) enforce cross-row invariants at COMMIT"
    - "Unconditional trigger (no role/GUC/session_user test) binds owner and superuser where privilege revocation cannot"
    - "Explicit REVOKE as a record of intent even where the privilege was never granted"
    - "Read-only STABLE verifier reports divergence, never repairs"

key-files:
  created:
    - server/migrations/0008_privileges.sql
    - server/migrations/0009_invariant_triggers.sql
    - server/migrations/0010_verify_chain_fn.sql
  modified: []

key-decisions:
  - "Plain TRUNCATE audit_entries is refused one step earlier by the FK guard (audit_entry_values references it); the TRUNCATE trigger fires on audit_entry_values and on TRUNCATE ... CASCADE. The audit store is un-truncatable either way — verbatim DDL from spec, not a deviation."
  - "test:arch failing (no test files) is a pre-existing out-of-scope condition; the architecture/schema suite is a deliverable of plans 01-08/09/10."

patterns-established:
  - "Invariant enforcement lives in the same migration set as the tables it protects (FR-Y0.2): no window of a mutable audit store."
  - "Every governance invariant raises P0001 with a fixed message prefix asserted verbatim by later test plans."

duration: 6 min
completed: 2026-09-12
---

# Phase 1 Plan 5: Enforcement — Privileges, Invariant Triggers, and the Chain Verifier Summary

**Turns the schema into a governed record: append-only audit store bound even against the owner by trigger, a deferred hash-chain / HITL / audit-coupling trigger set that refuses incomplete transactions at COMMIT, the AI privilege wall, and a read-only chain verifier — the full migration set 0001–0010 applying in one `npm run migrate`.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-12T13:34:40Z
- **Completed:** 2026-09-12T13:40:16Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments

- **Migration 0008** — audit store is `SELECT, INSERT` only for both runtime roles; `UPDATE/DELETE/TRUNCATE` revoked; `DELETE`/`TRUNCATE` granted on no table; `cargoexec_ai` holds no privilege on `decisions`/`decision_values` and no `UPDATE` on `exceptions`; `cargoexec_app` holds no `UPDATE` on `cargo_entries`; `CREATE` revoked from both runtime roles.
- **Migration 0009** — eleven triggers: four unconditional mutation-rejection triggers (`AUDIT_IMMUTABLE`), the deferred hash-chain trigger (`AUDIT_CHAIN_BROKEN`), the deferred HITL trigger joining `decisions` to `specialists` (`HITL_VIOLATION`), and five deferred audit-coupling triggers (`AUDIT_COUPLING_VIOLATION`).
- **Migration 0010** — `verify_audit_chain(uuid)`, `STABLE`, no write statement in its body, returns `(true, NULL, 0)` for an unknown/empty case.
- The complete set **0001–0010** applies forward-only; `schema_migrations` holds exactly ten rows.

## Task Commits

1. **Task 1: Migration 0008 — privileges & AI privilege wall** — `b21394f` (feat)
2. **Task 2: Migration 0009 — the four trigger families** — `2a751fd` (feat)
3. **Task 3: Migration 0010 — read-only chain verifier** — `5e023c7` (feat)

## Files Created

- `server/migrations/0008_privileges.sql` — grants, revocations, AI wall, no-DDL revocation; two mechanical `GRANT USAGE ON SCHEMA public` lines.
- `server/migrations/0009_invariant_triggers.sql` — `audit_reject_mutation`, `audit_check_chain`, `exceptions_require_human_decision`, `require_audit_entry` + five coupling trigger functions, and the eleven triggers.
- `server/migrations/0010_verify_chain_fn.sql` — `verify_audit_chain(uuid)` + `GRANT EXECUTE`.

## Reference Data For Later Plans (01-07 … 01-10)

**Error-message prefixes (all `ERRCODE = 'P0001'`):**
`AUDIT_IMMUTABLE:` · `AUDIT_CHAIN_BROKEN:` · `HITL_VIOLATION:` · `AUDIT_COUPLING_VIOLATION:`

**Eleven triggers (7 `DEFERRABLE INITIALLY DEFERRED`):**

| Trigger | Deferred | Raises |
|---|---|---|
| `trg_audit_entries_immutable` (statement) | no | AUDIT_IMMUTABLE |
| `trg_audit_entries_immutable_row` (row) | no | AUDIT_IMMUTABLE |
| `trg_audit_entry_values_immutable` (statement) | no | AUDIT_IMMUTABLE |
| `trg_audit_entry_values_immutable_row` (row) | no | AUDIT_IMMUTABLE |
| `trg_audit_chain` | yes | AUDIT_CHAIN_BROKEN |
| `trg_exceptions_hitl` | yes | HITL_VIOLATION |
| `trg_entries_audit` | yes | AUDIT_COUPLING_VIOLATION |
| `trg_validation_audit` | yes | AUDIT_COUPLING_VIOLATION |
| `trg_exceptions_audit` | yes | AUDIT_COUPLING_VIOLATION |
| `trg_decisions_audit` | yes | AUDIT_COUPLING_VIOLATION |
| `trg_recommendations_audit` | yes | AUDIT_COUPLING_VIOLATION |

**Grant matrix read back from `information_schema.table_privileges`:**

`cargoexec_app` — `SELECT,INSERT,UPDATE` on `specialists, sessions, recommendations, exceptions`; `SELECT,INSERT` on `cargo_entries, cargo_entry_field_origins, validation_results, validation_findings, recommendation_values, decisions, decision_values, audit_entries, audit_entry_values`.

`cargoexec_ai` — `SELECT` on `cargo_entries, validation_results, validation_findings, exceptions`; `SELECT,INSERT,UPDATE` on `recommendations`; `SELECT,INSERT` on `recommendation_values, audit_entries, audit_entry_values`. **No** privilege on `decisions`, `decision_values`, `specialists`, `sessions`; **no** `UPDATE` on `exceptions`.

Zero `DELETE` and zero `TRUNCATE` grants for any role on any table.

**`verify_audit_chain` return shape:** `TABLE (chain_verified boolean, first_divergence_sequence integer, entry_count integer)`, `LANGUAGE plpgsql STABLE`; `(true, NULL, 0)` for a case with no entries.

## Decisions Made

- **Plain `TRUNCATE audit_entries` is refused by the FK guard before the trigger.** `audit_entry_values` has a foreign key to `audit_entries`, so Postgres rejects a bare `TRUNCATE audit_entries` with "cannot truncate a table referenced in a foreign key constraint". The TRUNCATE trigger was verified to fire on `TRUNCATE audit_entry_values` and on `TRUNCATE audit_entries CASCADE`, both raising `AUDIT_IMMUTABLE`. The audit store is un-truncatable by every path — phase criterion 1 holds. DDL is verbatim from TechArch §2.9.2; no change made.

## Deviations from Plan

None - plan executed exactly as written. DDL copied verbatim from TechArch §2.9.1, §2.9.2, §2.10, §2.11 (identical to FRD Y0 §7.1–§7.6), plus the two required mechanical `GRANT USAGE ON SCHEMA public` lines specified in the plan's `ddl_fidelity_rule`.

## Known Stubs

None found. All three migrations are complete, verbatim DDL; no TODO/FIXME/placeholder/bypass tokens; no trigger references `current_setting`, `session_user`, or any bypass flag; the verifier body contains no write statement.

## Issues Encountered

- **`npm run test:arch` exits 1 — "No test files found".** Pre-existing and out of scope: `server/test/architecture/` does not exist yet; the schema/scope suite (TechArch §2.14) is a deliverable of plans 01-08/09/10. Logged to `deferred-items.md`. Unit (23) and db (2) suites pass; typecheck clean; all 10 migrations apply.

## Verification Results

- `npm run migrate` applies 0001–0010; `schema_migrations` holds **10** rows. ✔
- `UPDATE`/`DELETE` on audit tables refused as `cargoexec_owner` with `AUDIT_IMMUTABLE`; `TRUNCATE audit_entry_values` and `TRUNCATE ... CASCADE` refused with `AUDIT_IMMUTABLE`. ✔
- 11 user triggers exist; 7 are `DEFERRABLE INITIALLY DEFERRED`; 9 trigger functions exist. ✔
- A `cargo_entries` insert with no `ENTRY_RECEIVED` entry succeeds at statement level, **fails at COMMIT** with `AUDIT_COUPLING_VIOLATION`, and leaves zero rows. ✔
- Zero `DELETE`/`TRUNCATE` grants anywhere; `cargoexec_ai` has no privilege on `decisions`/`decision_values`, no `UPDATE` on `exceptions`; `cargoexec_app` no `UPDATE` on `cargo_entries`, no audit mutation; `cargoexec_app` can `SELECT audit_entries` but cannot `CREATE TABLE`. ✔
- `verify_audit_chain` is `STABLE`, read-only, returns `(true, NULL, 0)` for an empty case, executable by `cargoexec_app`. ✔
- `npm run typecheck` clean; unit + db test suites green (25 tests). ✔

## Next Phase Readiness

- Four of the five phase success criteria are now enforced by the database and demonstrable from a direct `psql` owner session.
- Ready for plan **01-06** (audit writer): the coupling triggers require the writer to insert exactly one audit entry per state change inside the caller's transaction; `verify_audit_chain` verifies linkage while `server/src/db/canonical.ts` computes the hash content (both asserted by plan 01-10).
- The DB container `cargoexec-db` is left running for the post-plan build & test gate.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-12*

## Self-Check: PASSED

- All three migration files exist on disk. ✔
- SUMMARY.md exists. ✔
- Task commits `b21394f`, `2a751fd`, `5e023c7` present in git history. ✔
- Migration gate: `npm run migrate` (build equivalent for this SQL-only plan) applies 0001–0010; `schema_migrations` = 10; typecheck clean; unit+db suites green. ✔
- `## Known Stubs`: None found (no blocking stubs). ✔
