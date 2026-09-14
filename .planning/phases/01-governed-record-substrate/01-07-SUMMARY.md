---
phase: 01-governed-record-substrate
plan: 07
subsystem: testing
tags: [vitest, architecture-tests, scope-discipline, information_schema, privileges, postgres]

requires:
  - phase: 01-governed-record-substrate (plan 01-05)
    provides: migration 0008 grant matrix (cargoexec_app / cargoexec_ai privileges, DELETE/TRUNCATE granted to nobody, no-DDL for runtime roles)
  - phase: 01-governed-record-substrate (plan 01-01)
    provides: createTestDatabase / dropTestDatabase (per-suite freshly migrated database)
provides:
  - "server/test/architecture/absence.spec.ts — TEST-ARCH-09/11: no CI, no accessibility runner, no forbidden dependency, no seed/ingest/export/rbac directory, no domain-data INSERT, no down-migration"
  - "server/test/architecture/schema.spec.ts — TEST-ARCH-10 / FR-Y0.5: 25 forbidden columns absent, exactly 13 application tables, 8 audit actions, no delete path, no scope-leaking object name"
  - "server/test/architecture/privileges.spec.ts — §2.14 items 3–6: the declared grant matrix read from information_schema"
  - "npm run test:arch now green (66 tests, 0 skips) — PRD §10's exclusion list is a build constraint"
  - "Exported schema-contract constants FORBIDDEN_COLUMNS, APPLICATION_TABLES, AUDIT_ACTIONS"
affects: [01-08 behavioural privilege/immutability suite, every phase 2-6 that adds a router/component/provider surface with its own architecture assertions]

tech-stack:
  added: []
  patterns:
    - "Architecture tests assert ABSENCE, not presence — an added column/dependency/CI-file fails the build"
    - "Deferred future-surface assertions are recorded as comments naming the responsible phase, never as skipped tests (a skip reads as coverage)"
    - "Declaration test (this plan) and behavioural test (01-08) of the same privilege surface are paired and cross-referenced"

key-files:
  created:
    - server/test/architecture/absence.spec.ts
    - server/test/architecture/schema.spec.ts
    - server/test/architecture/privileges.spec.ts
  modified:
    - .planning/phases/01-governed-record-substrate/deferred-items.md

key-decisions:
  - "Item 6 (DELETE/TRUNCATE granted to no role) is asserted against non-owner grantees only: cargoexec_owner holds them implicitly by ownership and cannot be revoked; the owner's raw-DELETE ability is neutralised by trigger, asserted behaviourally in 01-08 (§2.14 item 8)."
  - "Twelve of TechArch §8.3's seventeen architecture assertions concern surfaces (routers, React components, provider adapter, USWDS markup) that do not exist until phases 2–6; they are deferred with named owners rather than written as skipped tests."

patterns-established:
  - "Scope discipline (SM-14) is enforced at build time: the exclusion list is executable, not documentary."
  - "Forbidden-dependency assertions name the PRD §10 exclusion in the failure message so a future reader learns why, not just what."

duration: 8 min
completed: 2026-09-14
---

# Phase 1 Plan 7: Architecture Suite — Absence, Schema, and Declared Privileges Summary

**Three `server/test/architecture/*.spec.ts` specs run by `npm run test:arch` (66 tests, 0 skips) that turn PRD §10's exclusion list into a build constraint: a `.github/` directory, a CI workflow, an ORM/a11y-runner/export/scheduler dependency, a 26th column, a 14th application table, a widened grant, a domain-data INSERT, or a cascading delete path each fails the build.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-14T02:41:00Z
- **Completed:** 2026-09-14T02:49:00Z
- **Tasks:** 3
- **Files created:** 3 (plus 1 planning file updated)

## Accomplishments

- **Absence suite** (`absence.spec.ts`, 49 tests) — no `.github` and no CI workflow file anywhere; no forbidden dependency across the three workspace `package.json` files (each assertion naming its PRD §10 exclusion); no `seeds/`, `fixtures/`, `adapters/ingest/`, `export/`, `reports/`, `rbac/`, `roles/` directory; no `INSERT INTO` and no `-- Down Migration` in any migration file.
- **Schema suite** (`schema.spec.ts`, 6 tests) against a freshly migrated database — the 25 forbidden columns absent from every table; the base-table set equals exactly the 13 application tables plus `schema_migrations` (both directions); no object name matches the export/report/dashboard/metric/seed/fixture/ingest/assign/priorit pattern; `ae_action_chk` enumerates exactly the 8 FRD §0.6 actions; no foreign key declares a cascading/nulling delete; neither audit table carries a `failure_reason`/redaction/retention/export column.
- **Privilege suite** (`privileges.spec.ts`, 11 tests) against a freshly migrated database — the full `cargoexec_app` grant matrix equals FR-Y0.3 set-for-set; `cargoexec_app` holds SELECT+INSERT but no UPDATE/DELETE/TRUNCATE on the audit tables and no UPDATE on `cargo_entries`; `cargoexec_ai` has zero privilege on `decisions`/`decision_values`/`specialists`/`sessions` and no UPDATE on `exceptions`, while positively holding its six SELECTs and recommendation writes; DELETE/TRUNCATE granted to no non-owner role; neither runtime role holds schema CREATE, both hold USAGE.
- `npm run test:arch` is green (previously exited 1 with "no test files" — the 01-05 deferred item, now resolved).

## Task Commits

1. **Task 1: Absence suite** — `a241380` (test)
2. **Task 2: Schema suite** — `184e558` (test)
3. **Task 3: Privilege suite** — `b9d9148` (test)

_(Commit `f0c14b5` between them is plan 01-06's audit writer, executing in parallel on this branch — not part of 01-07.)_

## Files Created/Modified

- `server/test/architecture/absence.spec.ts` — filesystem + manifest assertions; fast, DB-free, runs first.
- `server/test/architecture/schema.spec.ts` — `information_schema` / `pg_class` / `pg_constraint` assertions against a fresh migrated DB; exports `FORBIDDEN_COLUMNS`, `APPLICATION_TABLES`, `AUDIT_ACTIONS`.
- `server/test/architecture/privileges.spec.ts` — `information_schema.table_privileges` + `has_schema_privilege` assertions against a fresh migrated DB; cross-references 01-08's behavioural suite by name.
- `.planning/phases/01-governed-record-substrate/deferred-items.md` — marked the 01-05 `test:arch` item resolved; logged the out-of-scope 01-06 `writer.spec.ts` failure.

## TechArch §8.3 Architecture Inventory — Implemented vs Deferred

The §8.3 "Architecture (`test:arch`)" table has **17** assertions. This plan (per its `scope_note`) implements the **5** checkable against the migration set and repo as they exist today, plus the declared-privilege matrix (a §2.14 addition also checkable now). The other 12 concern surfaces that do not exist until phases 2–6 and are **deferred with named owners** — deliberately as comments/records, not skipped tests.

**Implemented now:**

| §8.3 assertion | Where | Enforces |
|---|---|---|
| No `.github/`; no CI workflow file anywhere; no accessibility runner in the build | `absence.spec.ts` | §10 #1 |
| No migration file inserts domain data | `absence.spec.ts` | §10 #7, FR-Y0.4 |
| Schema contains none of the 25 forbidden column names; exactly 13 application tables | `schema.spec.ts` | §10 #2–#9, §2.14 items 1–2 |
| Forbidden packages absent (partial dependency check — see deferred equality row) | `absence.spec.ts` | PRD §10 (all), TechArch §6.2 |
| Declared grant matrix (§2.14 items 3–6, FR-Y0.3) — DELETE/TRUNCATE granted to nobody, AI privilege wall, no-DDL | `privileges.spec.ts` | FR-Y0.3, §2.14 items 3–6, A-1 |

Also implemented, adjacent to the inventory: `ae_action_chk` = 8 FRD §0.6 actions (item 7 / SM-6 support), no cascading delete path (§2.2), no audit-table scope-leak column (C-1).

**Deferred (12), with the phase that should own each:**

| §8.3 assertion | Owning phase (surface it depends on) |
|---|---|
| Router's route array equals the ten pairs of §3.1 exactly | Phase 2 (F/Y1 — the Express router) |
| No route registration reads `req.query` except the rejection guard | Phase 2 (the router) |
| `audit_entries`/`audit_entry_values` referenced by exactly one module | Phase 2 (once the audit-read module + writer are the only referencers; writer lands in 01-06) |
| Exactly one module writes `exceptions.state`/`decisions`/`decision_values` | Phase 5 (F11 decision service) |
| `ai/*` does not import `decision.service` or any decision-writing repo | Phase 4 (F9 AI recommendation service) |
| No provider SDK type outside `ai/adapter.http.ts`; no provider SDK dependency | Phase 4 (FR-Y3.1 — the AI HTTP adapter) |
| `BEGIN` appears only in `db/tx.ts` | Phase 2 (once `db/tx.ts` exists as the sole transaction boundary) |
| **Dependency set equals the §6.2 allowlist** (equality, not just "forbidden absent") | The phase completing the runtime+E2E stack (Phase 6 — after playwright/supertest/uswds/vite land). Left as a TODO comment in `absence.spec.ts` naming this. |
| No `X-Frame-Options` on any route or the SPA document | Phase 2 (D-1 — the header policy in the server) |
| Startup rejects `FRAME_ANCESTORS` `'none'`/`'self'` and a loopback `HOST` | Phase 2 (§6.5 startup validation) |
| Prompt manifest digests match the template files | Phase 4 (A-2 — the prompt manifest) |
| Primary navigation renders exactly two items | Phase 2 (FR-2.7 — the app shell) |
| No `dangerouslySetInnerHTML`; no template-literal SQL; no raw hex/px in screen styles | Phase 2+ (React screens / repositories) |
| Case values rendered only through `AttributedValue` | Phase 5/6 (§3.18 — the case UI) |

(That is fourteen deferred rows because two §8.3 rows bundle several checks; the plan's "twelve" refers to the twelve distinct future *surfaces*. Either way, every deferred assertion is attributed to the phase that ships the surface it inspects.)

## Decisions Made

- **Item 6 asserts non-owner grantees only.** On a freshly migrated database `information_schema.table_privileges` shows `cargoexec_owner` holding DELETE and TRUNCATE on all 14 tables — these are *implicit ownership* privileges, not grants, and cannot be revoked without breaking the migration runner. TechArch §2.14 item 6 ("granted to no role") is about explicit grants to the non-owner roles; the owner's ability to actually issue a raw `DELETE`/`TRUNCATE` is *neutralised by trigger* (migration 0009) and asserted behaviourally in plan 01-08 (§2.14 item 8, and the §2.14 note "DELETE FROM audit_entries … fails as cargoexec_owner"). The suite therefore excludes `cargoexec_owner` from the item-6 check with an explaining comment. See Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the DELETE/TRUNCATE verify to exclude the schema owner**
- **Found during:** Task 3 (privilege suite)
- **Issue:** The plan's Task 3 verify command and item-4 wording read DELETE/TRUNCATE grants across *all* grantees and expect zero (`grep -qx 0`). Against the real migrated database that count is 28, because `cargoexec_owner` owns every table and holds those privileges *implicitly by ownership* — they are not grants and are not revocable. The literal assertion is therefore incorrect and would fail on a correct schema.
- **Fix:** Asserted that DELETE/TRUNCATE are held by **no non-owner grantee** (excluding `cargoexec_owner`), which is what §2.14 item 6 means; the owner's raw-DELETE capability is separately neutralised by trigger and is 01-08's behavioural assertion (item 8), cross-referenced in a file comment. Confirmed: excluding the owner, the count is 0.
- **Files modified:** server/test/architecture/privileges.spec.ts
- **Verification:** `SELECT count(*) … AND grantee <> 'cargoexec_owner'` returns 0; the 11-test suite passes; `has_schema_privilege` DDL/USAGE probe returns `falsefalsetrue`.
- **Committed in:** `b9d9148`

**2. [Rule 3 - Blocking] `--reporter=list` is not a valid reporter in vitest 2.1.5**
- **Found during:** Task 1 (running the plan's verify command)
- **Issue:** The plan's verify snippets pass `--reporter=list`; this project's vitest (2.1.5) has no `list` reporter and errors at startup ("Failed to load custom Reporter from list").
- **Fix:** Ran the suites with vitest's default reporter (which prints the same per-file/per-test pass output). No production code affected — purely a verification-invocation correction.
- **Files modified:** none (invocation only).
- **Verification:** `npm run test:arch` runs all three files green with the default reporter.
- **Committed in:** n/a (no file change).

---

**Total deviations:** 2 auto-fixed (1 bug in the verify assertion, 1 blocking invocation fix).
**Impact on plan:** Neither changes scope. Deviation 1 makes the item-6 assertion correct against a real owned schema while preserving its intent (and its behavioural half in 01-08); deviation 2 is a reporter-flag mismatch. No production/migration code was touched by this plan at all — it adds test specs only.

## Issues Encountered

- **`npm run test` (the aggregate) shows 8 failures in `server/test/db/writer.spec.ts` — OUT OF SCOPE.** That file and `server/test/helpers/caseFixtures.ts` are **untracked** artifacts of plan **01-06** (the audit writer, `server/src/services/audit/writer.ts`), executing in parallel on this branch (commit `f0c14b5`). They appeared in the working tree during 01-07 execution. The failure ("permission denied for table cargo_entries") is a fixture/privilege bug in 01-06's own helper, unrelated to anything 01-07 changed. Per the SCOPE BOUNDARY rule it was **not fixed here**; it is logged to `deferred-items.md` with owner "plan 01-06". This plan's own deliverable (`npm run test:arch`) plus the unit (23) and db-harness (2) suites are all green (91 in-scope tests pass), and typecheck is clean.

## Known Stubs

None found. The three spec files contain no `.skip`/`.todo`/`xit`/`xdescribe` and no placeholder logic. The single `TODO(` in `absence.spec.ts` is the plan-mandated comment naming the phase that should add the dependency-set *equality* assertion once the full allowlist is present — the plan's `<done>` criterion explicitly requires this be a comment, not a skipped test. It is non-blocking: the plan's objective (make the exclusion list a build constraint) works today.

## Next Phase Readiness

- **Plan 01-08** (behavioural governance suite) is unblocked: this plan established the paired declaration/behaviour pattern and named `privileges.spec.ts`'s behavioural counterpart. 01-08 should add `enforcement.spec.ts` asserting UPDATE/DELETE on the audit tables actually fail (including as `cargoexec_owner`) — §2.14 item 8 / §8.3 DB invariants 1–3.
- **Phases 2–6** each inherit responsibility for the deferred §8.3 architecture assertions attributed to them in the table above; they should add those specs alongside the surface they inspect.
- No blockers. The DB container `cargoexec-db` is left running for the post-plan gate.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-14*

## Self-Check: PASSED

- All three spec files exist on disk. ✔
- Task commits `a241380`, `184e558`, `b9d9148` present in git history. ✔
- Build gate: `npm run test:arch` → exit 0 (66 tests, 0 skips); `npm run typecheck` → exit 0. ✔
- `## Known Stubs`: None found (the single TODO is the plan-mandated deferred-assertion comment, non-blocking). ✔
- Out-of-scope `writer.spec.ts` failure (parallel plan 01-06) logged to deferred-items.md, not fixed here. ✔
