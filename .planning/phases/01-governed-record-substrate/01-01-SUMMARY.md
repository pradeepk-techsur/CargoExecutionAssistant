---
phase: 01-governed-record-substrate
plan: 01
subsystem: infra
tags: [postgres, docker-compose, node-pg-migrate, pg, typescript, vitest, npm-workspaces]

# Dependency graph
requires: []
provides:
  - "npm workspace root with exact-pinned versions and a committed lockfile"
  - "PostgreSQL 16.4 under docker compose with a healthcheck, named volume, and published port 5432"
  - "Three database roles: cargoexec_owner (CREATEDB, owns db+schema), cargoexec_app, cargoexec_ai"
  - "Forward-only migration runner (server/scripts/migrate.mjs, exports runMigrations, migrationsTable schema_migrations)"
  - "Per-suite test-database lifecycle helper (createTestDatabase / dropTestDatabase / connect / withClient), teardown by DROP"
  - "contract/src/fields.ts (ENTRY_FIELDS, 14 names) and contract/src/errors.ts (INTERNAL_INVARIANT_CODES, 8 codes)"
affects: [01-02, 01-04, 01-05, 01-06, 01-07, 01-08, F0, F13]

# Tech tracking
tech-stack:
  added:
    - "pg 8.13.1"
    - "node-pg-migrate 7.9.0"
    - "typescript 5.6.3"
    - "vitest 2.1.5"
    - "@types/node 22.9.0"
    - "@types/pg 8.11.10"
    - "postgres:16.4 (docker image)"
    - "node:22.11-bookworm-slim (migrate image)"
  patterns:
    - "One migration runner shared by the compose migrate service and the test harness — tests migrate exactly as deployment does"
    - "Generated (never client-supplied) test database names validated by regex before interpolation into CREATE/DROP DATABASE"
    - "Teardown by DROP DATABASE, never by clearing rows — the append-only guarantee constrains the harness itself"
    - "Three DATABASE roles, no application role in the privilege system; DDL privilege held only by cargoexec_owner"

key-files:
  created:
    - "package.json"
    - "tsconfig.base.json"
    - "vitest.config.ts"
    - ".env.example"
    - "docker-compose.yml"
    - "db/init/00-roles.sh"
    - "contract/src/fields.ts"
    - "contract/src/errors.ts"
    - "contract/src/index.ts"
    - "server/scripts/migrate.mjs"
    - "server/test/helpers/testdb.ts"
    - "server/test/db/harness.spec.ts"
    - "server/test/unit/scaffolding.spec.ts"
  modified:
    - ".gitignore"

key-decisions:
  - "node-pg-migrate is a runtime dependency (not dev): the compose migrate service runs it in the deployment sequence"
  - "engines.node pins 22.11.0 but the sandbox runs Node 20.20.2; the field is advisory and the runner uses --env-file (Node 20.6+), so everything runs — no engine-strict enforced"
  - "test:arch is intentionally empty until plan 01-07; only test:unit and test:db are in this plan's scope"

patterns-established:
  - "Exact version pinning (no ^/~) enforced by a guard in Task 1's verify"
  - "Migration table name is schema_migrations (not node-pg-migrate's default pgmigrations), fixed for all later plans"

# Metrics
duration: 5min
completed: 2026-09-12
---

# Phase 1 Plan 01: Governed Record Substrate — Foundation Summary

**A pinned PostgreSQL 16.4 under docker compose with the three governance roles, a forward-only node-pg-migrate runner, and a create-migrate-drop test-database harness — the substrate every later plan in this phase asserts against.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-12T13:14:34Z
- **Completed:** 2026-09-12T13:18:55Z
- **Tasks:** 3
- **Files modified:** 14 created, 1 modified

## Accomplishments
- npm workspace (`contract` + `server`) with exact-pinned dependencies and a committed `package-lock.json`; `tsc -b` compiles under `strict` + `noUncheckedIndexedAccess`.
- `docker compose up -d db` brings a healthy `postgres:16.4` up on published port 5432, with `cargoexec_owner` (CREATEDB, owns database + schema), `cargoexec_app`, and `cargoexec_ai` created by an idempotent init script that revokes `CREATE ON SCHEMA public FROM PUBLIC`.
- `npm run migrate` connects as the owner, creates a `schema_migrations` table, and applies the (currently empty) forward-only migration set.
- A test suite can create a uniquely named database, migrate it through the same runner deployment uses, and **drop** it afterwards — proven green by `npm run test:db`.
- Shared `contract` constants (`ENTRY_FIELDS` — the 14 submitted entry fields; `INTERNAL_INVARIANT_CODES` — the 8 Y2 §7 database-enforced codes) that the audit writer will consume.

## Task Commits

Each task was committed atomically:

1. **Task 1: Workspace scaffolding with pinned versions** — `8b0d8a6` (feat)
2. **Task 2: PostgreSQL 16.4 compose stack with the three governance roles** — `f2b9617` (feat)
3. **Task 3: Forward-only migration runner and drop-not-truncate test harness** — `c6418a7` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md, committed after self-check)_

## Files Created/Modified
- `package.json` — workspace root; `pg`/`node-pg-migrate` deps, pinned devDeps, `migrate`/`test:*`/`typecheck` scripts
- `tsconfig.base.json` — strict TS base extended by both workspaces
- `vitest.config.ts` — single-fork sequential runner (real Postgres, per-suite databases)
- `.env.example` — container-local DB credentials, blank AI keys; `.env` gitignored
- `docker-compose.yml` — `postgres:16.4` (`db`) + one-shot `migrate` service behind a compose profile
- `db/init/00-roles.sh` — creates the three roles, transfers ownership, revokes PUBLIC CREATE
- `contract/src/fields.ts` — `ENTRY_FIELDS` (14) + `EntryFieldName`
- `contract/src/errors.ts` — `INTERNAL_INVARIANT_CODES` (8) + `InternalInvariantCode`
- `contract/src/index.ts` — re-exports both modules
- `server/scripts/migrate.mjs` — `runMigrations({ databaseUrl, dir?, log? })`, `migrationsTable: 'schema_migrations'`, direction up, per-migration transactions
- `server/test/helpers/testdb.ts` — `createTestDatabase`/`dropTestDatabase`/`connect`/`withClient`; `TestDatabase` shape
- `server/test/db/harness.spec.ts` — lifecycle test (create → migrate → drop)
- `server/test/unit/scaffolding.spec.ts` — guards the 14 field names and 8 invariant codes
- `.gitignore` — added `.env` and `*.tsbuildinfo` outside the Pivota-managed block

## Integration contract shapes (for later plans)

- `runMigrations({ databaseUrl: string, dir?: string, log?: fn }): Promise<void>` — node-pg-migrate runner, `direction: 'up'`, `migrationsTable: 'schema_migrations'`, `singleTransaction: false`.
- `TestDatabase = { name; ownerUrl; appUrl; aiUrl; superuserUrl }`; `createTestDatabase()` → CREATE DATABASE + full migration set; `dropTestDatabase(db)` → terminate backends + DROP DATABASE.
- Connection-string env vars: `DATABASE_URL_OWNER` (migrations/harness), `DATABASE_URL_APP`, `DATABASE_URL_AI`, `DATABASE_URL_SUPERUSER`; plus `PGHOST`/`PGPORT` and the four `*_PASSWORD` vars.
- Compose services: `db` (published `5432:5432`, healthcheck `pg_isready -U postgres -d cargoexec`) and `migrate` (profile `migrate`).
- `ENTRY_FIELDS` (14 names) and `INTERNAL_INVARIANT_CODES` (8 codes) exported from `@cargoexec/contract`.

## Decisions Made
- **node-pg-migrate as a runtime dependency**, not devDependency — the compose `migrate` service runs it as part of the deployment sequence (TechArch §8.7 step 3).
- **`engines.node` pins 22.11.0; sandbox runs Node 20.20.2.** The field is advisory (no `engine-strict`), `npm install` succeeds with only an `EBADENGINE` warning, and the `--env-file` flag the migrate script relies on has been available since Node 20.6, so every task ran correctly. No code change made; the pin remains as the spec requires.
- **`test:arch` left empty** — architecture specs arrive in plan 01-07; this plan's verification only exercises `test:unit` and `test:db`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded harness comments so the `grep -qi 'truncate'` guard passes**
- **Found during:** Task 3
- **Issue:** The plan simultaneously (a) instructs the harness to carry a file-level comment "stating why teardown drops rather than truncates" and "Never add a `TRUNCATE`", and (b) makes the task's own `<verify>` fail if `grep -qi 'truncate'` matches anywhere in the file. The mandated explanatory comment contained the word `TRUNCATE`, which tripped the case-insensitive guard and failed verification.
- **Fix:** Kept the rationale in full but reworded it to avoid the literal token (e.g. "bulk-clearing the audit tables … teardown by clearing rows is impossible"), so the SQL statement is still never used *and* the guard/`done` criterion ("the word `TRUNCATE` appears nowhere in the harness") is satisfied.
- **Files modified:** `server/test/helpers/testdb.ts`
- **Verification:** Re-ran the full Task 3 `<verify>` — `NO TRUNCATE IN HARNESS` / `HARNESS OK`; `npm run test:db` still passes.
- **Committed in:** `c6418a7` (Task 3 commit)

**2. [Rule 3 - Blocking] Added `*.tsbuildinfo` to `.gitignore`**
- **Found during:** Task 1
- **Issue:** `tsc -b` emits `contract/tsconfig.tsbuildinfo` (incremental build metadata) which the Pivota-managed `.gitignore` did not cover, so it appeared as an untracked build artifact.
- **Fix:** Added `.env` and `*.tsbuildinfo` in a project-specific block *outside* the Pivota-managed markers (as the file's own instructions require).
- **Files modified:** `.gitignore`
- **Verification:** `git check-ignore contract/tsconfig.tsbuildinfo` and `git check-ignore .env` both match; neither is staged.
- **Committed in:** `8b0d8a6` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both are trivial mechanical fixes required to satisfy the plan's own verification; no behavioural change and no scope creep. Every `<done>` criterion and the plan-level `<verification>` block pass.

## Known Stubs
None found — `grep` for `TODO|FIXME|placeholder|not.?implemented|coming soon` across all created files returns nothing. The empty `server/migrations/` directory and `schema_migrations` table with zero applied migrations are intentional (migrations arrive in plan 01-02), not stubs.

## Issues Encountered
None beyond the two documented deviations. `npm run test` (the aggregate) exits non-zero only because `test:arch` finds no spec files yet — architecture specs are scheduled for plan 01-07 and are out of this plan's scope. `test:unit` and `test:db` (this plan's suites) both pass with zero failures.

## Database Contract Compliance
- DB-backed: `docker-compose.yml` ships `postgres:16.4` with a `healthcheck`, a named `pgdata` volume, published `5432:5432`, and connection strings pointing at the compose service name (`db:5432`) inside the migrate service. Image version pinned. The one-shot `migrate` service runs the forward-only runner and `depends_on: db: service_healthy`. No web/app service exists yet by design (it arrives in phase 2). No `.planning/infrastructure.json` authored.

## Next Phase Readiness
- Ready for **01-02** — the migration substrate (runner, roles, `schema_migrations`, drop-not-truncate harness) is in place; 01-02 fills `server/migrations/` with the numbered forward-only files and the DB-invariant suites can build on `createTestDatabase`/`dropTestDatabase`.
- No blockers.

## Self-Check: PASSED

- All 13 created files present on disk.
- All 3 task commits present in history (`8b0d8a6`, `f2b9617`, `c6418a7`).
- Build check: `tsc -b contract server` → exit 0.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-12*
