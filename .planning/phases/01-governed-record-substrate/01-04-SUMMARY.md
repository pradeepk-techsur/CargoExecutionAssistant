---
phase: 01-governed-record-substrate
plan: 04
subsystem: database
tags: [postgres, sql, migrations, audit, provenance, governance, node-pg-migrate]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate (plan 01-02)
    provides: "migrations 0001–0004 — specialists, cargo_entries, validation_results, exceptions (with bare decision_id and exceptions_closure_consistency_chk)"
provides:
  - "server/migrations/0005_recommendations.sql — recommendations + recommendation_values with constant CHECK (origin = 'AI')"
  - "server/migrations/0006_decisions.sql — decisions (decided_by NOT NULL REFERENCES specialists) + decision_values + exceptions_decision_fk"
  - "server/migrations/0007_audit.sql — append-only audit_entries + audit_entry_values with per-value origin-presence and 32-byte hash constraints"
  - "Thirteen application tables now exist; the audit store is created but NOT yet protected (privileges + triggers land in plan 01-05, migrations 0008–0009)"
affects: [01-05 privileges and triggers, 01-06 audit writer, 01-07 schema suite, F9 recommendation worker, F11 decision API, F13 audit entry writer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Constant-CHECK provenance: rv_origin_ai_chk (= 'AI') mirrors cefo_origin_human_chk (= 'HUMAN'); mixed AI/HUMAN origin is representable only on decision_values"
    - "Human-identity crux: decisions.decided_by uuid NOT NULL REFERENCES specialists (id) with no default, against a specialists table containing no AI/SYSTEM row — a machine-authored decision fails the FK before any trigger runs"
    - "aev_origin_present_chk: a value without an origin is unstorable — per-value provenance in its hardest form (SM-3)"
    - "Verbatim DDL fidelity: migration bodies copied byte-for-byte from TechArch §2.7–§2.9, constraint names preserved for the 01-07 schema suite"

key-files:
  created:
    - server/migrations/0005_recommendations.sql
    - server/migrations/0006_decisions.sql
    - server/migrations/0007_audit.sql
  modified: []

key-decisions:
  - "Audit store created in 0007 but left mutable until plan 01-05 (0008 privileges + 0009 triggers); FR-0.17/FR-Y0.2 require the whole set to land in one `npm run migrate` invocation so no deployment window exposes a mutable store"
  - "exceptions.decision_id becomes a real foreign key (exceptions_decision_fk) only now that decisions exists"
  - "No auto-apply path, no delete path, no cascade, and no forbidden column on any of the five new tables — scope exclusions are structural, not policy"

patterns-established:
  - "Provenance constant CHECK per table: 'AI' on recommendation_values, 'HUMAN' on cargo_entry_field_origins, ('AI','HUMAN') only on decision_values"
  - "Terminal-audit coupling readiness: audit_entries carries decision_id/recommendation_id partial indexes for the coupling triggers of 01-05"

# Metrics
duration: 8 min
completed: 2026-09-12
---

# Phase 01 Plan 04: Governance Migrations (Recommendations, Decisions, Audit Store) Summary

**Migrations 0005–0007 add the five governance tables — AI proposals that are structurally not resolutions, human-only decisions gated by a `specialists` foreign key, and the append-only audit store whose per-value origin-presence and 32-byte hash-chain constraints make tamper evidence and zero-unattributed-value guarantees representable.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-12T13:29:00Z
- **Completed:** 2026-09-12T13:34:00Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- **Migration 0005** — `recommendations` (PENDING/AVAILABLE/UNAVAILABLE lifecycle CHECKs, one-per-exception unique index, seven enumerated `failure_reason` values) and `recommendation_values` with the constant `rv_origin_ai_chk CHECK (origin = 'AI')`. No column participates in exception state; no view/trigger copies a proposal into a decision — the no-auto-apply guarantee.
- **Migration 0006** — `decisions` with `decided_by uuid NOT NULL REFERENCES specialists (id)` (no default), the reason-required CHECK (≥10 trimmed chars on EDIT_APPROVE/REJECT), one-decision-per-exception unique index, and `decision_values` (the only mixed-origin table). Attaches `exceptions_decision_fk` on `exceptions.decision_id`.
- **Migration 0007** — `audit_entries` (ten named constraints + three indexes, `UNIQUE (case_id, case_sequence)`, 32-byte hash columns, exactly eight `ae_action_chk` values) and `audit_entry_values` with `aev_origin_present_chk`. No forbidden column; no cascade delete path.
- Thirteen application tables now exist (`schema_migrations` holds seven rows).

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0005 — recommendations** — `5bdce7d` (feat)
2. **Task 2: Migration 0006 — decisions** — `03fecdb` (feat)
3. **Task 3: Migration 0007 — audit store** — `9ebd4f2` (feat)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified
- `server/migrations/0005_recommendations.sql` — recommendations + recommendation_values; constant AI-origin CHECK; one-per-exception index
- `server/migrations/0006_decisions.sql` — decisions + decision_values; human-identity FK; reason CHECK; exceptions_decision_fk
- `server/migrations/0007_audit.sql` — append-only audit_entries + audit_entry_values; hash-chain and origin-presence constraints

## Constraints on the two audit tables

**`audit_entries`:** `ae_action_chk` (exactly 8 actions), `ae_actor_type_chk`, `ae_actor_pairing_chk`, `ae_case_sequence_chk`, `ae_hash_len_chk` (both hashes 32 bytes), `ae_reason_only_on_decisions_chk`, `ae_reason_required_chk`, `uq_audit_entries_case_sequence`, `uq_audit_entries_entry_hash`. Indexes: `idx_audit_entries_case`, `idx_audit_entries_decision` (partial), `idx_audit_entries_recommendation` (partial).

**`audit_entry_values`:** PK `(audit_entry_id, field_name)`, `aev_before_origin_chk`, `aev_after_origin_chk`, `aev_some_value_chk`, `aev_origin_present_chk`. Foreign key on `audit_entry_id` uses the default `NO ACTION` — no cascade, no delete path.

## Decisions Made
- Followed the plan and TechArch §2.7–§2.9 verbatim. DDL copied byte-for-byte including explanatory comments, since plan 01-07's schema suite asserts several constraint names by name.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None found. Migrations are pure DDL — no `TODO`/`FIXME`/placeholder, no `INSERT` into any domain table, no `-- Down Migration`.

## Issues Encountered
None. All three per-task `<verify>` blocks passed against a freshly rebuilt `postgres:16.4` compose database. Functional constraint tests confirmed the plan's `must_haves` truths:
- `aev_origin_present_chk` rejects an audit value carrying a value but no origin.
- `decisions_reason_required_chk` rejects an EDIT_APPROVE with a 9-character reason and accepts a 10-character one.
- `uq_decisions_exception` rejects a second decision on the same exception.
- `decisions_approve_needs_recommendation_chk` / `decided_by` FK reject a machine- or recommendation-less decision.

## Verification Results
- `npm run migrate` applied 0001–0007 cleanly on a fresh DB; `schema_migrations` holds 7 rows.
- 13 application tables present (`audit_entries, audit_entry_values, cargo_entries, cargo_entry_field_origins, decision_values, decisions, exceptions, recommendation_values, recommendations, sessions, specialists, validation_findings, validation_results`).
- `npm run typecheck` (`tsc -b contract server`) → exit 0.
- `rv_origin_ai_chk` def contains `origin = 'AI'`; `ae_action_chk` lists exactly 8 values; no forbidden audit columns; no cascade delete on `audit_entry_values`.

## Next Phase Readiness
- **The audit store is still mutable.** Plan 01-05 (migrations 0008 privileges + 0009 invariant triggers) must land in the same migration set to make it append-only and to add the hash-chain, HITL, and five audit-coupling triggers. Until then `UPDATE`/`DELETE` on `audit_entries` succeeds for the owner.
- Ready for plan 01-05.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-12*

## Self-Check: PASSED
- All three migration files exist on disk.
- All three task commits (`5bdce7d`, `03fecdb`, `9ebd4f2`) exist in git.
- Migrations 0001–0007 apply cleanly on a fresh compose DB; `npm run typecheck` → exit 0 (no build step for SQL migrations).
- SUMMARY `## Known Stubs` section present; no blocking stubs.
