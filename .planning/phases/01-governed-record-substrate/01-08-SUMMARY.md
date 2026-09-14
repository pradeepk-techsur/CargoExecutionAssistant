---
phase: 01-governed-record-substrate
plan: 08
subsystem: testing
tags: [postgres, immutability, audit, privileges, triggers, rls, sqlstate, vitest, governance]

# Dependency graph
requires:
  - phase: 01-06
    provides: createGovernedCase / createSpecialist fixtures (a real three-entry audit chain to attempt to tamper with) and the append() writer
  - phase: 01-01
    provides: createTestDatabase / dropTestDatabase with ownerUrl, appUrl, aiUrl role connections
  - phase: 01-05
    provides: migration 0009 invariant triggers (audit_reject_mutation raising AUDIT_IMMUTABLE / P0001) and 0008 append-only privileges
provides:
  - "server/test/db/immutability.spec.ts — the SM-7 behavioural evidence: 100% of mutation attempts rejected, including attempts made directly against the database as the schema owner"
  - "The refusal layer (privilege 42501 vs trigger AUDIT_IMMUTABLE/P0001) identified per role×statement, so a regression that removes the trigger but keeps the revocation fails the owner assertions"
affects: [01-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Refusal asserted by SQLSTATE + message, never by 'something threw' (a relation-does-not-exist would otherwise pass as refused)"
    - "Owner-role assertions require the TRIGGER layer (P0001/AUDIT_IMMUTABLE) specifically; app/ai accept either privilege (42501) or trigger"
    - "Before/after byte-level snapshot (hashes as hex) re-read after every attempt to prove a refusal left zero partial change"

key-files:
  created:
    - server/test/db/immutability.spec.ts
  modified: []

key-decisions:
  - "TEST-DB-16 reframed to match migration 0011 (user-approved): cargoexec_app HOLDS UPDATE on cargo_entries for the FOR UPDATE anchor lock, so a raw UPDATE succeeds; entry-of-record immutability is proved application-level (no UPDATE cargo_entries in server/src) plus the DB refusals that DO hold (DELETE cargo_entries, UPDATE/DELETE cargo_entry_field_origins → 42501)"
  - "The AI worker cannot invoke append() at all: append() takes SELECT ... FOR UPDATE on cargo_entries, which needs table UPDATE privilege that A-1 deliberately denies cargoexec_ai — pinned as a test so a future UPDATE grant to the AI role fails loudly"
  - "TRUNCATE audit_entries alone is refused by Postgres's FK-reference guard (0A000) before the statement trigger; the trigger's own AUDIT_IMMUTABLE refusal of TRUNCATE is proved via TRUNCATE audit_entry_values (unreferenced) and the CASCADE form"

patterns-established:
  - "Three-role coverage (owner/app/ai) is mandatory for any audit-store negative test — a suite testing only the app role passes against a completely unprotected store"

# Metrics
duration: 14 min
completed: 2026-09-14
---

# Phase 1 Plan 08: Immutability / Behavioural Governance Suite Summary

**Proves the negative at the persistence layer: every UPDATE/DELETE/TRUNCATE/upsert against the audit store is attempted and refused — including as the schema owner (AUDIT_IMMUTABLE/P0001) — and the entry-of-record and AI-worker privilege walls are proved behaviourally, with 34 passing assertions in `server/test/db/immutability.spec.ts`.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-14T02:58Z
- **Completed:** 2026-09-14T03:08Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- **TEST-DB-01/02/03** — every `UPDATE`, `DELETE`, `TRUNCATE` and `INSERT … ON CONFLICT DO UPDATE` variant is attempted against `audit_entries` / `audit_entry_values` as `cargoexec_app`, `cargoexec_ai` **and** `cargoexec_owner` and refused. Owner cases assert `AUDIT_IMMUTABLE` / `P0001` specifically, proving the trigger — not a privilege — did the refusing (FR-0.5). `ON CONFLICT DO NOTHING` on a conflicting row is confirmed **allowed**, distinguishing "upsert blocked" from "insert broken".
- **TEST-DB-16** — `cargoexec_app` is refused `DELETE cargo_entries` and `UPDATE`/`DELETE cargo_entry_field_origins` with `42501`; the stored `goods_description` reads back byte-identical preserving internal double-spaces and mixed case (US-0.3); the source-level immutability guarantee (no `UPDATE cargo_entries` in `server/src`) is asserted directly.
- **TEST-DB-17** — `cargoexec_ai` is refused `INSERT decisions`/`decision_values`, `SELECT decisions`/`specialists`/`sessions`, and `UPDATE`/`DELETE exceptions`, all with `42501`; its narrow positive path (PENDING recommendation + recommendation_values) is asserted; after every refused attempt the exception is still `OPEN` with `closed_at` and `decision_id` null and zero `decisions` rows.
- After every attempt each block re-reads a full byte-level snapshot and re-runs `verify_audit_chain`, confirming byte-identity and `chain_verified = true` with three entries.

## Task Commits

1. **Task 1: TEST-DB-01/02/03** — `cf2b128` (test)
2. **Task 2: TEST-DB-16/17** — `3b8c2c5` (test)

## The refusal-layer map (the SM-7 / phase criterion 1 evidence)

| Statement | cargoexec_app | cargoexec_ai | cargoexec_owner |
|-----------|---------------|--------------|-----------------|
| `UPDATE audit_entries` (all forms, incl. `WHERE false`) | 42501 or AUDIT_IMMUTABLE | 42501 or AUDIT_IMMUTABLE | **AUDIT_IMMUTABLE / P0001** (trigger) |
| `UPDATE audit_entry_values` | 42501 or AUDIT_IMMUTABLE | 42501 or AUDIT_IMMUTABLE | **AUDIT_IMMUTABLE / P0001** |
| `DELETE audit_entries` / `audit_entry_values` | 42501 or AUDIT_IMMUTABLE | 42501 or AUDIT_IMMUTABLE | **AUDIT_IMMUTABLE / P0001** |
| `TRUNCATE audit_entries` (alone) | 42501 or AUDIT_IMMUTABLE | 42501 or AUDIT_IMMUTABLE | **0A000** (FK-reference guard, precedes trigger) |
| `TRUNCATE audit_entry_values` (alone) | 42501 or AUDIT_IMMUTABLE | 42501 or AUDIT_IMMUTABLE | **AUDIT_IMMUTABLE / P0001** (trigger) |
| `TRUNCATE … CASCADE` (both) | 42501 or AUDIT_IMMUTABLE | 42501 or AUDIT_IMMUTABLE | **AUDIT_IMMUTABLE / P0001** |
| `INSERT … ON CONFLICT DO UPDATE` (both audit tables) | — | — | **AUDIT_IMMUTABLE / P0001** (row trigger on the update branch) |
| `INSERT … ON CONFLICT DO NOTHING` (conflict) | — | — | **allowed**, 0 rows |
| `UPDATE cargo_entries` | **succeeds** (0011 grant; immutability is source-level) | 42501 | — |
| `DELETE cargo_entries` | **42501** | 42501 | — |
| `UPDATE`/`DELETE cargo_entry_field_origins` | **42501** | — | — |
| `INSERT decisions` / `decision_values` | — | **42501** | — |
| `SELECT decisions` / `specialists` / `sessions` | — | **42501** | — |
| `UPDATE`/`DELETE exceptions` | — | **42501** | — |
| `SELECT … FOR UPDATE cargo_entries` (the append() anchor lock) | granted | **42501** (so append() is unreachable to the AI role) | — |

## Files Created/Modified

- `server/test/db/immutability.spec.ts` — 34 assertions across five describe blocks (TEST-DB-01/02/03 in one top-level suite over a shared governed case; TEST-DB-16/17 in a second suite over a fresh DB with a tricky whitespace/case entry). Includes a self-contained `createCaseWithGoodsDescription` helper built from the exported `createSpecialist` / `withTransaction` / `append` primitives so the entry of record carries a caller-chosen value. No trigger is disabled, no replication-role escape hatch, no superuser connection.

## Decisions Made

See `key-decisions` in the frontmatter. The two that shape later phases:

1. **Entry-of-record immutability is application-level, not privilege-level.** Migration 0011 grants `cargoexec_app` UPDATE on `cargo_entries` so the audit writer can take the `SELECT … FOR UPDATE` anchor lock. A raw `UPDATE cargo_entries` therefore *succeeds* at the DB — the guarantee that no correction overwrites the entry of record rests on the *absence* of any `UPDATE cargo_entries` statement in `server/src`, asserted both here and in 01-07's architecture suite.
2. **The AI worker cannot call `append()`.** `append()` unconditionally acquires the case-anchor `FOR UPDATE` lock, which needs table UPDATE privilege that A-1 denies `cargoexec_ai`. In the product, recommendation-status audit entries are written on a path that already holds the anchor (the request path). This is pinned as an assertion so a future UPDATE grant to the AI role fails loudly.

## Deviations from Plan

### Auto-fixed / user-approved changes

**1. [Rule 4 - Architectural, user-approved] TEST-DB-16 reframed to match migration 0011**
- **Found during:** Task 2 (TEST-DB-16)
- **Issue:** The plan asserted `UPDATE cargo_entries` is refused for `cargoexec_app` with `42501`. Migration 0011 (user-approved, recorded in STATE.md during plan 01-06) grants `cargoexec_app` UPDATE on `cargo_entries` for the FOR UPDATE anchor lock, so that UPDATE *succeeds* at the DB. I confirmed empirically (rowCount=1).
- **Resolution:** Asked the user (checkpoint via `question`); they chose "Reframe to match 0011". TEST-DB-16 now proves D-3 via the refusals that genuinely hold (`DELETE cargo_entries`, `UPDATE`/`DELETE cargo_entry_field_origins` → `42501`), a direct source-level assertion that no `UPDATE cargo_entries` statement exists in `server/src`, and byte-identical read-back. The two false "UPDATE → 42501" assertions were dropped with a documented rationale in-file.
- **Files modified:** server/test/db/immutability.spec.ts
- **Verification:** 34/34 tests pass; typecheck clean.
- **Committed in:** 3b8c2c5

**2. [Rule 1 - Bug] The AI role cannot invoke append() — positive-capability test corrected**
- **Found during:** Task 2 (TEST-DB-17)
- **Issue:** The plan's positive half asserted `cargoexec_ai` could write a `RECOMMENDATION_UNAVAILABLE` entry through `append()`. It cannot: `append()` takes `SELECT … FOR UPDATE cargo_entries`, which requires table UPDATE privilege that A-1 deliberately denies the AI role (`42501: permission denied for table cargo_entries`).
- **Fix:** Replaced that test with the AI worker's real positive path (PENDING recommendation + `recommendation_values`) and added an explicit assertion that the AI role is refused the anchor lock — documenting that this is A-1 working, not a defect, and pinning it against a future regression.
- **Files modified:** server/test/db/immutability.spec.ts
- **Verification:** empirically probed with a throwaway spec (removed after use); final suite green.
- **Committed in:** 3b8c2c5

**3. [Rule 1 - Bug] TRUNCATE audit_entries alone refuses via FK-guard (0A000), not the trigger**
- **Found during:** Task 1 (TEST-DB-02)
- **Issue:** A lone `TRUNCATE audit_entries` as owner fails with `0A000` ("cannot truncate a table referenced in a foreign key constraint") because `audit_entry_values` references it and is not included — that check precedes the TRUNCATE statement trigger. The initial assertion demanded `P0001` and failed.
- **Fix:** The lone-table case accepts either `AUDIT_IMMUTABLE`/`P0001` or the FK-reference guard `0A000` (both are genuine refusals — the table is not emptied). The trigger's own AUDIT_IMMUTABLE refusal of TRUNCATE is proved unambiguously by `TRUNCATE audit_entry_values` (unreferenced → only the trigger can stop it) and the `CASCADE` form.
- **Files modified:** server/test/db/immutability.spec.ts
- **Verification:** 17/17 Task-1 tests pass.
- **Committed in:** cf2b128

**4. [Rule 3 - Blocking] Plan verify command uses `--reporter=list`, unsupported in vitest 2.1.5**
- **Found during:** Task 1 (running the plan's `<verify>` command)
- **Issue:** `npx vitest run … --reporter=list` fails at startup in vitest 2.1.5 (`Failed to load url list` — it resolves `list` as a module path, not a built-in reporter name).
- **Fix:** Ran the suite with the default reporter; all other verify greps (three roles exercised, trigger code asserted, no bypass used, test IDs present, privilege SQLSTATE asserted) were executed and passed. No source change required — only the verify invocation was adjusted.
- **Verification:** `npx vitest run server/test/db/immutability.spec.ts` → 34 passed, 0 failed, 0 skipped.

---

**Total deviations:** 4 (1 architectural user-approved, 2 bugs, 1 blocking). **Impact:** All necessary for correctness — the two Task-2 deviations reflect a genuine interaction between the writer's locking (01-06) and the AI privilege model (A-1) that strengthens rather than weakens the governance proof. No scope creep.

## Known Stubs

None found. The suite contains no TODO/FIXME/placeholder, no swallowed errors, and no bypassed guards.

## Issues Encountered

None beyond the deviations above. The throwaway probe specs used to establish real DB behaviour were removed before commit; no probe file remains in the tree.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase success criterion 1 is now demonstrated behaviourally, not merely asserted: audit-store mutation is refused including as the schema owner, with the refusal layer identified per case.
- Plan 01-10 (the full-suite gate, wave 7) can now run against this file alongside 01-09's specs; this plan gated only on its own spec by design (01-08 and 01-09 run in parallel in wave 6).
- No blockers.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-14*

## Self-Check: PASSED

- `server/test/db/immutability.spec.ts` exists on disk.
- `.planning/phases/01-governed-record-substrate/01-08-SUMMARY.md` exists on disk.
- Both task commits present: `cf2b128` (Task 1), `3b8c2c5` (Task 2).
- Plan-level build/typecheck (`tsc -b contract server`) → exit 0.
- Suite green: `npx vitest run server/test/db/immutability.spec.ts` → 34 passed, 0 failed, 0 skipped.
- Regression check: db + architecture + unit suites → 187 passed.
- `## Known Stubs` present with no blocking entries.
