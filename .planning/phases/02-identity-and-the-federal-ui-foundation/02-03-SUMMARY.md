---
phase: 02-identity-and-the-federal-ui-foundation
plan: 03
subsystem: auth
tags: [argon2id, sessions, sha256, throttle, cli, postgres, clock-injection]

requires:
  - phase: 02-01
    provides: "SpecialistDto/SessionDto wire contract, argon2@0.41.1 pin, config self-checks"
  - phase: 01-governed-record-substrate
    provides: "specialists + sessions tables (migration 0001), cargoexec_app pool, withTransaction, testdb helpers"
provides:
  - "signIn/signOut/loadSessionByToken/expireSession/touchSession — the only credential-verifying module"
  - "clock.ts — injected Clock/systemClock/fixedClock for testable expiry"
  - "db/repositories/{specialists,sessions}.ts — hand-written parameterised SQL"
  - "cli/create-specialist.ts — the sole operational account-creation path (FR-1.13)"
  - "test/helpers/identityFixtures.ts — Argon2id specialist fixture reused by every later phase-2 suite"
affects: [02-04, 02-06, 02-08, phase-3, phase-4, phase-5, phase-6]

tech-stack:
  added: []
  patterns:
    - "Clock injected as a parameter, never read from env (no CLOCK_OFFSET) — §8.2/§6.6"
    - "Argon2id verify runs in BOTH sign-in branches (dummy hash when no row) for timing parity"
    - "Raw token/CSRF returned once; only 32-byte SHA-256 Buffers persisted"
    - "In-process throttle keyed by sha256(email); no lockout state, no unlock surface (§4.2)"
    - "Structural Queryable interface serves Pool, PoolClient and one-shot Client"
    - "pg is CommonJS — value imports use the interop-default form under native ESM"

key-files:
  created:
    - server/src/clock.ts
    - server/src/db/repositories/types.ts
    - server/src/db/repositories/specialists.ts
    - server/src/db/repositories/sessions.ts
    - server/src/services/session.service.ts
    - server/src/cli/create-specialist.ts
    - server/test/helpers/identityFixtures.ts
    - server/test/db/session.service.spec.ts
    - server/test/unit/throttle.spec.ts
  modified: []

key-decisions:
  - "Password verified BEFORE the is_active check so a deactivated account cannot be probed by response timing"
  - "Throttle checked before any DB access, identically for a non-existent email, so it is not an account oracle"
  - "revokeSession guarded by revoked_at IS NULL so a sign-out/expiry race keeps the first-recorded reason"
  - "--from-env checks bootstrap keys before the DB URL so the container command runs unconditionally"
  - "pg named value-imports fail under native ESM; CLI uses the interop-default form (latent same bug flagged in pool.app/ai.ts for 02-04)"

patterns-established:
  - "Injected clock: fixedClock(start).advance(ms) proves 30-min idle / 8-h absolute expiry with no real waiting"
  - "Dummy-hash timing equaliser: verified structurally (call always runs) + corroborated by a loose timing bound"

duration: 9min
completed: 2026-09-14
---

# Phase 2 Plan 03: Identity Layer Below HTTP Summary

**Argon2id credential verification with timing-parity dummy hashing, opaque SHA-256-at-rest server sessions with injected-clock idle/absolute expiry, an in-process hash-keyed sign-in throttle, and a CLI-only account-creation path — proven against a real PostgreSQL.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-14T22:01:46Z
- **Completed:** 2026-09-14T22:11:23Z
- **Tasks:** 3
- **Files created:** 9 (0 modified)

## Accomplishments
- `signIn` verifies Argon2id in both the found and not-found branches (module-level `DUMMY_HASH` when no row), so an unknown email and a wrong password return the byte-identical `{ok:false,reason:'AUTH_FAILED'}` and take comparable time (T-02-14).
- Sessions store only 32-byte SHA-256 digests of a 256-bit token and CSRF token; the raw values are returned exactly once and never persisted or logged (FR-1.2, FR-1.14).
- Idle (30 min) and absolute (8 h) expiry are proven with an injected `fixedClock` — no real-time waiting — and recorded as `revoked_at` + `revocation_reason = 'EXPIRED'`; sign-out records `'SIGNED_OUT'` and cannot be overwritten by a later expiry.
- The sign-in throttle is an in-process map keyed by `sha256(normalisedEmail)` (5 failures / rolling 15 min), identical for a non-existent email, with no lockout column and no unlock surface (§4.2).
- `create-specialist` is the only operational account path (FR-1.13): interactive echo-off TTY entry or idempotent `--from-env --if-absent` bootstrap, connecting on the owner role; no self-registration, reset, invite, or admin subcommand.
- A reusable Argon2id specialist fixture that inserts through the same repository the CLI uses, so test data cannot drift from production.

## Task Commits

1. **Task 1: Clock + two identity repositories** — `bca98f8` (feat)
2. **Task 2: session.service — Argon2id, tokens, revocation, throttle** — `479ae34` (feat)
3. **Task 3: create-specialist CLI, fixture, DB suite** — `bb77044` (feat)

## Files Created
- `server/src/clock.ts` — injected `Clock` / `systemClock` / `fixedClock`; no env-driven time skew.
- `server/src/db/repositories/types.ts` — structural `Queryable` (query-method interface).
- `server/src/db/repositories/specialists.ts` — parameterised SQL; `ON CONFLICT DO NOTHING` for idempotent bootstrap.
- `server/src/db/repositories/sessions.ts` — insert/find/revoke/updateLastSeen; `findSessionByTokenHash` omits `token_hash`; `revokeSession` writes both revocation columns guarded by `revoked_at IS NULL`.
- `server/src/services/session.service.ts` — the sole credential-verifying module; imports neither `express` nor the audit writer.
- `server/src/cli/create-specialist.ts` — operational account provisioning.
- `server/test/helpers/identityFixtures.ts` — `createTestSpecialist` / `TEST_PASSWORD`.
- `server/test/db/session.service.spec.ts` — 11 DB-backed integration cases.
- `server/test/unit/throttle.spec.ts` — 8 pure-unit throttle cases.

## Decisions Made
See key-decisions in frontmatter. All are correctness/security orderings mandated by F1 (timing parity, throttle-as-oracle avoidance, revocation-reason immutability) plus two implementation choices (structural `Queryable`, pg interop-default import).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pg CommonJS named import breaks the CLI at runtime**
- **Found during:** Task 3 (running the built CLI)
- **Issue:** `import { Client } from 'pg'` compiles (esModuleInterop) but throws `SyntaxError: Named export 'Client' not found` under Node's native ESM loader when `server/dist/cli/create-specialist.js` is executed directly — the CLI would never run.
- **Fix:** Switched to the interop-default form `import pg from 'pg'; const { Client } = pg;`. Verified the CLI now runs end-to-end (create + idempotent re-run) against the real database.
- **Files modified:** server/src/cli/create-specialist.ts
- **Committed in:** bb77044

**2. [Rule 3 - Blocking] --from-env required the DB URL before checking bootstrap keys**
- **Found during:** Task 3 (CLI verification)
- **Issue:** The plan requires `--from-env --if-absent` to exit 0 and create nothing when the bootstrap keys are absent, so the container command in 02-08 can run unconditionally. The first draft resolved `DATABASE_URL_OWNER` before checking the keys, so it errored (exit 1) in an environment that had not provisioned the owner URL.
- **Fix:** Reordered so the bootstrap-key presence check runs first; the owner URL is only resolved once there is actually an account to create.
- **Files modified:** server/src/cli/create-specialist.ts
- **Committed in:** bb77044

**3. [Rule 3 - Blocking] Queryable = Pool | PoolClient excluded the CLI's one-shot Client**
- **Found during:** Task 3 (build)
- **Issue:** The repositories were shared by the CLI, which uses a one-shot `pg.Client` (owner role). `Client` is neither `Pool` nor `PoolClient`, and under `exactOptionalPropertyTypes` the union rejected it.
- **Fix:** Redefined `Queryable` as a structural interface exposing just the `query` method, which `Pool`, `PoolClient` and `Client` all satisfy.
- **Files modified:** server/src/db/repositories/types.ts
- **Committed in:** bb77044

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking). **Impact:** all necessary for a runnable CLI and a compiling shared repository layer; no scope creep — no new table, dependency, or forbidden column.

## Known Stubs
None found. A stub scan of all nine created files found only the phrase "`$n` placeholder" in SQL-describing comments — no `TODO`/`FIXME`, no empty bodies, no hardcoded-return handlers, no swallowed errors (the one `catch {}` in `signIn` is the deliberate, documented dummy-hash timing equaliser).

## Issues Encountered
- **Parallel plan 02-04 in flight on the same branch** (config `parallelization: true`; this plan is wave 2). Its untracked HTTP-layer files (`server/src/http/{logger,cookies,requestId,headers,errorMapper}.ts`, `server/test/unit/errorMapper.spec.ts`) transiently broke `npm run typecheck` and currently leave 3 `errorMapper.spec.ts` unit failures. These are 02-04's territory, not a 02-03 regression: every 02-03-scoped gate is green (see Self-Check). Logged to `deferred-items.md`. No 02-03 file touches the HTTP layer.

## Next Phase Readiness
- The identity layer below HTTP is complete and green against a real PostgreSQL: `signIn` mints, `loadSessionByToken` resolves, expiry/sign-out record, the throttle guards, and the CLI provisions.
- **Ready for 02-04** (session cookie middleware + `/api/session` routes), which consumes `signIn`/`loadSessionByToken`/`signOut`/`touchSession`, `SESSION_*_MS`, and the CSRF hash from `LoadedSession`. 02-04 should also convert the `pg` named value-imports in `pool.app.ts`/`pool.ai.ts` to the interop-default form before wiring the server entry point (see `deferred-items.md`).
- `createTestSpecialist` / `TEST_PASSWORD` are ready for the 02-04 API suite and the 02-06 governance suite.

## Self-Check: PASSED

- All 9 created files exist on disk.
- All 3 task commits present in history (`bca98f8`, `479ae34`, `bb77044`).
- Plan-level build gate: `npm run build:server` → exit 0.
- 02-03-scoped test gates green: `npm run test:db` (114/114), `npm run test:arch` (67/67), `npm run test:unit` throttle (8/8), `npm run typecheck` clean.
- `## Known Stubs`: none blocking.
- Out-of-scope 02-04 WIP failures (3 in `errorMapper.spec.ts`) documented in `deferred-items.md`, not a 02-03 regression.

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-14*
