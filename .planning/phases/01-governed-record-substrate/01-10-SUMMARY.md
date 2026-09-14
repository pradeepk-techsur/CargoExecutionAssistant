---
phase: 01-governed-record-substrate
plan: 10
subsystem: audit
tags: [audit, hash-chain, verify_audit_chain, concurrency, tamper-detection, postgres, read-path, F13, F0]

# Dependency graph
requires:
  - phase: 01-06
    provides: audit writer append() and createGovernedCase fixture
  - phase: 01-03
    provides: computeEntryHash / ZERO_HASH canonical hashing
  - phase: 01-05
    provides: verify_audit_chain SQL verifier (migration 0010)
  - phase: 01-08
    provides: immutability suite (test:db glob sibling)
  - phase: 01-09
    provides: governance-refusal suites (test:db glob siblings)
provides:
  - "readCaseTrail(pool, caseId): strictly read-only, strictly per-case audit trail with chain_verified (F13 FR-13.15)"
  - "TEST-DB-13/14/15: concurrency serialisation, deferred chain refusal, and four-way tamper detection — phase success criterion 5"
  - "Full-suite test:db gate green over every wave 1–7 spec file"
affects: [F14 per-case audit trail UI (phase 6), any future verification endpoint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-only audit consumer: sole reader module, three parameterised SELECTs, verify result returned unmodified"
    - "Tamper testing via independent CREATE DATABASE ... TEMPLATE copies with immutability triggers dropped only in the throwaway copy"
    - "Deterministic concurrency observation: second append raced against a timer to prove it blocks on the anchor lock"

key-files:
  created:
    - server/src/services/auditRead.service.ts
    - server/test/db/chain.spec.ts
  modified: []

key-decisions:
  - "verify_audit_chain checks LINKAGE only; content substitution is caught by recomputing computeEntryHash over the stored row — both mechanisms together satisfy TechArch §2.12"
  - "The writer's 23505 -> AUDIT_SEQUENCE_CONFLICT mapping is guarding a race the anchor lock prevents; the observable, deterministic assertion is the unique-index rejection (constraint uq_audit_entries_case_sequence)"
  - "DROP TRIGGER is confined to chain.spec.ts, run only against throwaway TEMPLATE copies dropped in afterAll — the single place a guard is dropped in the phase"

patterns-established:
  - "Four independent tamper copies, one tamper each, so no divergence masks another — never cumulative against a single copy"
  - "Post-tamper byte-identity + double-verify assertions prove the verifier repairs nothing"

# Metrics
duration: 10 min
completed: 2026-09-14
---

# Phase 1 Plan 10: Chain Verification & Read Path Summary

**Per-case audit chain proven tamper-evident end to end — concurrent sequencing under the anchor lock, deferred `AUDIT_CHAIN_BROKEN` refusal, and four-way tamper detection across independent TEMPLATE copies — plus F13's strictly read-only `readCaseTrail` service surfacing `chain_verified` to the UI layer.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-14T03:13:00Z
- **Completed:** 2026-09-14T03:23:33Z
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments

- `readCaseTrail(pool, caseId)`: three parameterised `SELECT`s (entries ascending, value rows by field_name, `verify_audit_chain`), `LEFT JOIN specialists` so AI actions carry a `null` display name, chain result returned unmodified. Strictly read-only, strictly per-case, no bulk/export/repair surface.
- TEST-DB-13: two concurrent `append`s on distinct connections yield contiguous `case_sequence` 4 and 5 with correct `prev_entry_hash` linkage and strictly increasing `global_sequence`; the second writer is observably blocked (raced against a 400 ms timer) until the first commits; a bypassed-lock double-insert is rejected by `uq_audit_entries_case_sequence` (23505) and not retried.
- TEST-DB-14: a forged `prev_entry_hash` INSERTs but COMMIT raises `AUDIT_CHAIN_BROKEN` (P0001) in all three variants (mismatched link, non-zero genesis prev, skipped sequence); correctly linked append is the positive control; entry count and verify result unchanged after each refusal.
- TEST-DB-15: four independent `TEMPLATE` copies, one tamper each, detected without repair; `readCaseTrail` surfaces the break with no repair export.
- Full `npm run test` (unit → db → arch) green: 23 unit + 103 db (incl. 6 new) + 67 arch.

## readCaseTrail signature and return shape

```ts
export function readCaseTrail(pool: Pool, caseId: string): Promise<CaseTrail>;

type CaseTrail = {
  entries: CaseTrailEntry[];            // ascending case_sequence
  chain_verified: boolean;
  first_divergence_sequence: number | null;
  entry_count: number;
};
// CaseTrailEntry carries actor_display_name (null for AI), per-value origins,
// and the entry's exception/recommendation/decision links.
```

## Observed (chain_verified, first_divergence_sequence, entry_count) triples

Fixture: 5 audit entries (ENTRY_RECEIVED, VALIDATION_COMPLETED, EXCEPTION_OPENED, + two RECOMMENDATION_GENERATED at seq 4/5).

| Copy | Tamper (from pristine) | verify_audit_chain triple | Detected by |
|------|------------------------|---------------------------|-------------|
| A | Excise middle entry (sequence 3) | `(false, 4, 3)` | linkage (walk position vs stored sequence) |
| B | Alter stored `entry_hash` at sequence 2 | `(false, 3, 3)` | linkage (prev_entry_hash mismatch) |
| C | Swap sequences 2 and 3 | `(false, 2, 2)` | linkage (prev_entry_hash expectation) |
| D | Rewrite stored `after_state` + one stored value | `(true, NULL, 5)` | **not** linkage — caught by `computeEntryHash` recomputation diverging from stored `entry_hash` |

Pristine parity control: `computeEntryHash` recomputed over every stored row equals its stored `entry_hash` — proving the divergences in copy D are real substitution detection, not a hasher mismatch.

## Files Created/Modified

- `server/src/services/auditRead.service.ts` — read-only per-case trail service (`readCaseTrail`, `CaseTrail`, `CaseTrailEntry`, `CaseTrailValue`); sole reader of the audit tables.
- `server/test/db/chain.spec.ts` — TEST-DB-13/14/15; four-copy tamper harness; the only file containing `DROP TRIGGER` (throwaway copies only).

## Decisions Made

- **Linkage vs recomputation division of labour:** `verify_audit_chain` checks linkage only and cannot see content substitution (asserted explicitly as `(true, NULL, 5)` in copy D). Substitution is caught by recomputing `computeEntryHash` over the stored row. Both mechanisms together make TechArch §2.12's claim true; any future verification endpoint must run both.
- **Writer AUDIT_SEQUENCE_CONFLICT mapping:** the writer's `23505 → AUDIT_SEQUENCE_CONFLICT` branch guards a race the anchor lock prevents. The deterministic, observable assertion is the unique-index rejection (`uq_audit_entries_case_sequence`), asserted twice (bypassed-lock backstop + direct duplicate). See deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1 verify grep is self-contradictory on the `export` keyword**
- **Found during:** Task 1
- **Issue:** The plan's Task 1 `<verify>` includes `! grep -qEi "...export..."` (case-insensitive) to forbid a data-export surface, but the same contract *requires* `export async function readCaseTrail`. The `-i` flag makes every TypeScript `export` statement match, so the check can never pass for any valid ES module.
- **Fix:** Implemented the module with no data-export/download/CSV/PDF/format/limit/offset surface (the check's actual intent) and confirmed with an intent-correct grep (`\b(download|csv|pdf|all cases)\b|limit |offset |format\b` → no match). The only `export` occurrences are the four contract-required TypeScript `export` statements.
- **Files modified:** server/src/services/auditRead.service.ts
- **Verification:** `tsc -b contract server` clean; intent-correct grep clean; the surface exposes exactly `readCaseTrail` + its types.
- **Committed in:** 3aa6481

**2. [Rule 1 - Bug] Task 1 verify greps collide with descriptive comments**
- **Found during:** Task 1
- **Issue:** The verify greps `! grep -qEi "INSERT INTO|UPDATE |...|TRUNCATE"` also matched a documentation comment that *named* those forbidden operations to explain their absence.
- **Fix:** Reworded the file-header comment to describe the read-only contract without quoting the literal SQL keywords, preserving the intent while making the read-only greps pass.
- **Files modified:** server/src/services/auditRead.service.ts
- **Verification:** all Task 1 read-only greps pass.
- **Committed in:** 3aa6481

**3. [Rule 3 - Blocking] Superuser (not owner) used for copy-database maintenance**
- **Found during:** Task 3
- **Issue:** `cargoexec_owner` is `CREATEDB` but not a superuser, so `pg_terminate_backend` against a `cargoexec_app` backend fails with "permission denied to terminate process" — blocking the `CREATE DATABASE ... TEMPLATE` (which requires the template to have no active connections).
- **Fix:** Routed the terminate + `CREATE DATABASE` + copy `DROP DATABASE` maintenance through the superuser role (which can terminate any backend), while still creating copies `OWNER cargoexec_owner` and tampering them as owner. Also fixed a leaked app pool in TEST-DB-13 that left an untermINABLE backend at teardown.
- **Files modified:** server/test/db/chain.spec.ts
- **Verification:** all four copies create, tamper, verify, and drop cleanly; full suite green.
- **Committed in:** 2b1ec96

**4. [Rule 1 - Bug] Writer-mapping assertion made honest and deterministic**
- **Found during:** Task 2
- **Issue:** An initial attempt to force the writer's own `23505` branch was non-deterministic (the anchor lock serialises appends, so append-vs-append never collides) and produced convoluted, misleading test code.
- **Fix:** Replaced it with an honest, deterministic assertion of the unique-index rejection — the observable source of `AUDIT_SEQUENCE_CONFLICT` — via a duplicate `(case_id, case_sequence)` insert asserting `23505` + `uq_audit_entries_case_sequence`, plus the bypassed-lock backstop the plan describes. Documented that the writer's mapping guards a race the lock prevents.
- **Files modified:** server/test/db/chain.spec.ts
- **Verification:** TEST-DB-13 backstop passes; assertion is deterministic.
- **Committed in:** 2b1ec96

---

**Total deviations:** 4 auto-fixed (3 Rule 1 bugs, 1 Rule 3 blocking).
**Impact on plan:** Deviations 1–2 correct self-contradictory verify greps in the plan text (the implementation matches intent exactly); 3 is a role-privilege fix required for the copy harness to run; 4 keeps the concurrency backstop honest and deterministic. No scope creep, no change to the delivered behaviour.

## Known Stubs

None found. The single "placeholder" grep hit (`argon2id$placeholder` password_hash) is the established fixture convention (identical to `createSpecialist` in caseFixtures.ts); phase 2 owns real hashing.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase success criterion 5 is demonstrated end to end: removal, alteration and reordering are each detectable and the verifier reports without repairing; content substitution is additionally shown detectable by hash recomputation.
- F13's read path (`readCaseTrail`) exists and is consumed by F14's per-case audit trail UI in phase 6.
- This was the last plan of phase 1 (wave 7, the full `test:db` gate). All 10 phase-1 plans now have SUMMARYs; the full suite (unit + db + arch) is green. Phase complete, ready for transition.

## Self-Check: PASSED

- FOUND: server/src/services/auditRead.service.ts
- FOUND: server/test/db/chain.spec.ts
- FOUND commit 3aa6481 (Task 1), 2b1ec96 (Tasks 2 & 3)
- Build/test gate: `npm run test` → unit 23 + db 103 + arch 67, all green; `tsc -b contract server` exit 0
- Known Stubs: none blocking

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-14*
