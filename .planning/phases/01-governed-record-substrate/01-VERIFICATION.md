---
phase: 01-governed-record-substrate
verified: 2026-09-14T03:31:18Z
status: passed
score: 5/5 must-haves verified
gaps: []
human_verification: []
---

# Phase 01: Governed Record Substrate Verification Report

**Phase Goal:** The record the whole loop writes into exists and is governed by the database rather than by application convention — append-only, per-value provenance, a human behind every resolution, and exactly one audit entry per state change — so that a defect in any code written later cannot produce a governance failure.

**Verified:** 2026-09-14T03:31:18Z
**Status:** passed
**Re-verification:** No — initial verification

## Gate Evidence (cited, not re-litigated)

- `01-GATE.md`: `gate_status: passed`, `review_blockers_open: 0`, `boot_smoke: skipped`, `shadowed_sources: 0`, `tests_disabled_during_fixes: none`. All 7 waves build+tests pass, fix_attempts 0. Final tree: full suite **193 tests green** (23 unit + 103 db + 67 arch); `tsc -b contract server` exit 0.
- `boot_smoke: skipped` is the expected path for phase 1 — it ships no server / no `.pivota/start-dev.sh`; the governance substrate is migrations + a writer/reader library exercised by the DB test suite. This is a legitimate skip, not an absent verdict.
- `01-REVIEW.md`: `status: issues_found`, **0 BLOCKERs, 3 WARNINGs** (advisory). The WARNINGs are addressed under "Anti-Patterns / Advisory Findings" below and none blocks the phase goal.

The success criteria are marked "no screen — verify by SQL and test." Verification therefore rests on the DB/arch test suite, which the gate ran green on the final tree. Each criterion below is proven by named negative (refusal) tests plus positive controls.

## Goal Achievement

### Observable Truths (= the 5 success criteria)

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | UPDATE/DELETE/TRUNCATE against a stored audit entry is refused — including in psql as schema owner, not only through the app | ✓ VERIFIED | `0009_invariant_triggers.sql:6-24` statement- AND row-level `audit_reject_mutation` triggers fire unconditionally (bind the owner/superuser, not just revoked roles). `immutability.spec.ts` TEST-DB-01/02 connect as `ownerPool` and assert `expectTriggerRefusal` (SQLSTATE P0001, `AUDIT_IMMUTABLE`) for UPDATE (incl. `WHERE false` zero-row), DELETE and TRUNCATE, then assert rows byte-identical after every attempt. |
| 2 | A tx changing case state without its audit entry (or vice versa) fails at COMMIT, not half-committing | ✓ VERIFIED | `0009:80-145` five `DEFERRABLE INITIALLY DEFERRED` constraint triggers enforce exactly-one entry per change, checked at COMMIT. `coupling.spec.ts` TEST-DB-05/06/07 prove the no-entry, two-entry (exactly-one, not at-least-one) and wrong-action cases each fail at COMMIT, with positive controls that a correct pairing commits. |
| 3 | Moving an exception out of OPEN without a decisions row naming a real specialist is refused by the DB, even from a full-privilege SQL session | ✓ VERIFIED | `0009:57-78` `exceptions_require_human_decision` requires a matching `decisions`→`specialists` row (id, exception_id, resulting_state) or raises `HITL_VIOLATION`. Defence-in-depth: `0008_privileges.sql:34-46` revokes ALL on `decisions`/`decision_values` and UPDATE on `exceptions` from `cargoexec_ai`. `hitl.spec.ts` TEST-DB-04(a–d) proves FK refusal for a non-existent specialist (23503), HITL_VIOLATION for wrong exception / wrong resulting_state, plus a positive control. |
| 4 | Every stored value carries AI or HUMAN origin — no default, nullable path, or insert route yielding an unattributed value | ✓ VERIFIED | `0007_audit.sql:66-72` `aev_origin_present_chk` + `aev_some_value_chk`; single-origin CHECKs on `cargo_entry_field_origins` (HUMAN), `recommendation_values` (AI), mixed on `decision_values`. `provenance.spec.ts` TEST-DB-11/12 prove NULL-origin (23514), out-of-set origin (23514), and the "omit origin entirely" NOT NULL path (23502) are all refused, with positive controls. |
| 5 | A removed/altered/reordered audit entry is detectable from per-case sequence + hash chain, and the verifier reports the break rather than repairing it | ✓ VERIFIED | `0010_verify_chain_fn.sql` `verify_audit_chain` is `STABLE`/read-only, returns `(chain_verified, first_divergence_sequence, entry_count)` and never repairs. `chain.spec.ts` TEST-DB-15 tampers throwaway TEMPLATE copies: excision→(false,4,3), alteration→(false,3,3), reordering→(false,2,2) via linkage; content-substitution caught by independent `computeEntryHash` recomputation; re-runs verify a second time and asserts rows byte-identical (no healing). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Provides | Status | Details |
| -------- | -------- | ------ | ------- |
| `server/migrations/0007_audit.sql` | audit_entries/audit_entry_values schema + provenance CHECKs | ✓ VERIFIED | 77 lines; origin/some-value/actor-pairing/hash-len/reason CHECKs + unique(case,sequence) + unique(entry_hash). |
| `server/migrations/0008_privileges.sql` | append-only grants; AI structurally cannot resolve | ✓ VERIFIED | 49 lines; REVOKE UPDATE/DELETE/TRUNCATE on audit tables from every runtime role; AI denied decisions/specialists/exceptions-UPDATE; no CREATE. |
| `server/migrations/0009_invariant_triggers.sql` | immutability, hash-chain, HITL, audit-coupling triggers | ✓ VERIFIED | 154 lines; 11 triggers across 4 invariant classes. |
| `server/migrations/0010_verify_chain_fn.sql` | read-only chain verifier | ✓ VERIFIED | STABLE fn, reports divergence, no repair. |
| `server/migrations/0011_case_anchor_lock_privilege.sql` | FOR UPDATE anchor-lock grant for sequencing | ✓ VERIFIED | Minimum UPDATE grant on anchor row for concurrent-safe sequencing (TEST-DB-13). |
| `server/src/db/canonical.ts` | deterministic hash / canonicalisation | ✓ VERIFIED | Exports `computeEntryHash`, `ZERO_HASH`, `sha256`, `canonicalJson`, `Origin`, `CanonicalAuditEntry/Value`; hash parity vs DB proven in chain.spec Step 2. |
| `server/src/services/audit/writer.ts` | append-only writer, superset of DB CHECKs | ✓ VERIFIED | Imports canonical; $n-parameterised; validation is a faithful superset of DB constraints (per REVIEW). Wired into all db specs. |
| `server/src/services/auditRead.service.ts` | per-case trail + chain_verified read | ✓ VERIFIED | Exports only `readCaseTrail` (no repair op — asserted by chain.spec). See W1 note. |
| `server/src/db/tx.ts` | single-BEGIN transaction wrapper | ✓ VERIFIED | Sole issuer of BEGIN/COMMIT/ROLLBACK (arch TEST-ARCH-07). See W2 note. |
| `server/src/db/pool.app.ts` / `pool.ai.ts` | role-scoped pools | ✓ VERIFIED | Lazy construction, no import-time socket; AI pool deliberately under-privileged. |
| Test suite (`server/test/db/*`, `server/test/architecture/*`, `server/test/unit/*`) | behavioural proof of all 5 criteria | ✓ VERIFIED | 193 tests green on final tree per gate (immutability 34, coupling 15, provenance 27, hitl 10, chain 6, writer 9, harness 2; arch absence 49 / privileges 12 / schema 6). |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| writer.ts | canonical.ts | `computeEntryHash`/`ZERO_HASH` import | ✓ WIRED | Hash parity with DB proven (chain.spec Step 2). |
| writer.ts validation | 0007 CHECKs | superset of DB constraints | ✓ WIRED | Reviewer confirmed faithful superset. |
| exceptions state change | decisions→specialists | 0009 HITL trigger | ✓ WIRED | Refusal proven hitl.spec TEST-DB-04. |
| state-change inserts | audit_entries | 0009 deferred coupling triggers | ✓ WIRED | COMMIT-time refusal proven coupling.spec. |
| stored value | AI/HUMAN origin | 0007 aev_origin_present_chk + single-origin CHECKs | ✓ WIRED | provenance.spec TEST-DB-11/12. |
| verify_audit_chain / computeEntryHash | tamper detection | linkage + recomputation | ✓ WIRED | chain.spec TEST-DB-15 four tamper classes. |

### Requirements Coverage

All five phase success criteria (SM/F0/F13 governance requirements) map to VERIFIED truths above; none BLOCKED.

### Anti-Patterns / Advisory Findings

| Source | Finding | Severity | Impact on phase goal |
| ------ | ------- | -------- | -------------------- |
| REVIEW W1 | `readCaseTrail` surfaces linkage-only `chain_verified`; content-substitution not recomputed in the shipped reader | ⚠️ Warning | None for phase 1. Criterion 5 (**detectability**) is proven by the test suite running BOTH mechanisms (chain.spec Step 7 recomputation). The gap is a *future* phase-6 UI concern (the UI consumer does not exist yet). Correctly a WARNING, not a phase-1 gap. |
| REVIEW W2 | `tx.ts` comment claims a bind parameter for `statement_timeout` while it interpolates a validated positive integer | ⚠️ Warning | None — not exploitable (unconditional integer guard runs first). Misleading comment only. |
| REVIEW W3 | duplicate `field_name` in one entry's values[] surfaces as unclassified 23505 instead of a pre-SQL typed error | ⚠️ Warning | None — DB still rejects loudly (no silent corruption); internal callers only. Degraded error surface. |

No blocker anti-patterns. No TODO/placeholder/stub implementations found in the reviewed source; all deferred-items.md entries were resolved within the phase (arch suite landed 01-07; writer fixture privilege fixed by 01-06).

### Human Verification Required

None. All five criteria are "no screen" and are verifiable by SQL/test, which the green gate exercised.

### Gaps Summary

No gaps. The governance substrate is enforced by the database (triggers, CHECKs, privilege grants, constraint-deferred coupling, hash chain + read-only verifier), not by application convention — matching the phase goal that "a defect in any code written later cannot produce a governance failure." Every criterion is proven by named negative tests (the database refusing the forbidden operation, including as the schema owner) plus positive controls, and the full 193-test suite passed on the final tree per the phase gate. The three review WARNINGs are advisory and do not affect phase-1 goal achievement; W1 in particular is a forward-looking note for the phase-6 UI, not a break in phase-1 detectability.

---

_Verified: 2026-09-14T03:31:18Z_
_Verifier: Claude (pivota_spec-verifier)_
