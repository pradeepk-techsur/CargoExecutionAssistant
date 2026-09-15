---
phase: 02-identity-and-the-federal-ui-foundation
plan: 08
subsystem: infra
tags: [docker, docker-compose, postgres, deployment, bootstrap, liveness, argon2]

# Dependency graph
requires:
  - phase: 02-07
    provides: the built SPA and the working keyboard-only sign-in path
  - phase: 02-04
    provides: the process bootstrap (loadConfig before app.listen, production-mode static SPA serving)
  - phase: 02-03
    provides: create-specialist --from-env --if-absent (the FR-1.13 operational account path)
  - phase: 02-01
    provides: the npm build/start scripts and workspace layout
provides:
  - "A runnable stack: docker compose up -d --build serves the product on port 3000"
  - "docker-compose.yml web service: build -> migrate -> bootstrap account -> serve, healthchecked by ping"
  - "server/src/cli/ping.ts: the out-of-band liveness check (SELECT 1), not an HTTP route"
  - "A multi-stage Dockerfile: build stage with toolchain, slim runtime stage"
  - "A demonstration README: the §8.7 run sequence and the preview-iframe cookie/frame guidance"
affects: [phase-03, phase-04, phase-05, phase-06, uat, walkthrough]

# Tech tracking
tech-stack:
  added: [docker multi-stage build, docker-compose web service]
  patterns:
    - "The compose file IS how the app runs: migrate -> idempotent bootstrap -> serve, in the app command, on every boot"
    - "Liveness is out-of-band (node ping.js), never an HTTP route (§8.6)"
    - "One boot path shared by deployment and e2e (playwright.config webServer mirrors the compose command)"

key-files:
  created:
    - Dockerfile
    - .dockerignore
    - server/src/cli/ping.ts
  modified:
    - docker-compose.yml
    - .env.example
    - README.md

key-decisions:
  - "Runtime stage uses `npm ci --omit=dev` (not a node_modules copy from build): argon2's prebuild re-resolved cleanly in the slim runtime image, so the documented fallback was not needed."
  - "The bootstrap specialist account runs from the container command via create-specialist --from-env --if-absent; it is the FR-1.13 operational path, not seed data — one row in `specialists`, no case data."
  - "Liveness kept as a CLI (ping.js) with the §8.6 justification in the file header, so no future reader adds an eleventh HTTP route."

patterns-established:
  - "Pattern: idempotent boot command — migrate.mjs forward-only against schema_migrations, create-specialist ON CONFLICT DO NOTHING; a second `up` neither fails nor duplicates (proven by restart-against-persisted-volume verify)."
  - "Pattern: connection strings address the compose service name db:5432, never localhost (which inside the container is the container itself)."

# Metrics
duration: 6 min
completed: 2026-09-15
---

# Phase 2 Plan 08: Make the Application Run Summary

**A multi-stage Docker image and a three-service compose topology (db + profiled migrate + web) that boots migrate → idempotent specialist bootstrap → serve on `0.0.0.0:3000`, healthchecked by an out-of-band `ping.js`, with both Playwright suites passing against the composed stack.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-15T00:04:11Z
- **Completed:** 2026-09-15T00:11:05Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `docker compose up -d --build` from an empty volume brings `db` and `web` to `Up (healthy)`; the app serves `/sign-in` (200) on port 3000 and can be signed into with the bootstrap account (`POST /api/session` → `201` with `Set-Cookie: cargoexec_sid=…`).
- The app container command runs **migrate → `create-specialist --from-env --if-absent` → serve** in that order on every boot; a `docker compose restart web` against the persisted volume reports "No migrations to run!" and "specialist … already exists; nothing to do." — idempotent, no duplication.
- Liveness is the out-of-band `node server/dist/cli/ping.js` (`SELECT 1`, exit 0/1, never prints the connection string). **No** HTTP health route was added; the endpoint inventory stays exhaustive at ten (arch tests still green).
- No `X-Frame-Options` header on any response (verified against the running container), so the app is embeddable in the preview iframe (D-1).
- Both Playwright suites (29 tests: 16 shell + 13 sign-in) pass against the composed stack with `E2E_BASE_URL=http://localhost:3000` — 0 failing, 0 skipped. This is the "the deployment works", not just "the code works", proof.
- `npm run test` (unit 111, db 114, api 75, arch 67) and `npm run typecheck` exit 0; no `.github`, `seeds` or `fixtures` directory and no migration `INSERT` introduced.

## Task Commits

1. **Task 1: Multi-stage Dockerfile + out-of-band liveness check** — `ba3fbbb` (feat)
2. **Task 2: The compose topology — migrate then bootstrap then serve** — `eb5ccc8` (feat)
3. **Task 3: E2E against the composed stack + demonstration README** — `22bf3c3` (docs)

## Files Created/Modified

- `Dockerfile` — Two stages (§6.4): build (node:22.11-bookworm-slim + python3/make/g++ for argon2's native binding) runs `npm ci` + `npm run build`; runtime (slim, no toolchain) runs `npm ci --omit=dev` and copies `contract/dist`, `server/dist`, `web/dist`, `server/migrations`, `server/scripts`.
- `.dockerignore` — Excludes `node_modules`, `.git`, `.planning`, `project_specs`, test output, local build dirs and `.env` (T-02-51).
- `server/src/cli/ping.ts` — Opens a `pg.Client` on `DATABASE_URL_APP`, `SELECT 1`, exits 0/1, logs only the error class name (§4.7, §8.6).
- `docker-compose.yml` — Adds the `web` service (`cargoexec-web`): `build: .`, `ports: ["3000:3000"]`, `depends_on: db service_healthy`, service-name connection strings, migrate→bootstrap→serve command, `ping.js` healthcheck. Keeps the phase-1 `db` and profiled `migrate` services unchanged.
- `.env.example` — Appends `BOOTSTRAP_SPECIALIST_{EMAIL,NAME,PASSWORD}` with the not-seed-data distinction.
- `README.md` — Replaces the stub with the §8.7 demonstration procedure.

## Decisions Made

- **Runtime `npm ci --omit=dev` rather than copying `node_modules` from the build stage.** The plan offered this as a fallback if argon2's prebuild failed to re-resolve in the slim runtime image; it re-resolved cleanly (`require('argon2')` loads in the runtime image), so the simpler `--omit=dev` install was kept and the fallback was not needed.
- **The bootstrap account stays the FR-1.13 operational path, invoked non-interactively.** `create-specialist --from-env --if-absent` inserts one row in `specialists` and nothing else; the distinction from seed data (PRD §10 #7) is documented in the compose comment, `.env.example` and the README so a later reader neither deletes it as scope leakage nor extends it into a dataset.

## Deviations from Plan

None - plan executed exactly as written. Every artifact, contract and verify command in the plan matched the codebase as built in 02-01…02-07; no bug, missing critical, blocking or architectural deviation arose.

## Known Stubs

None found. The stub scan (`TODO|FIXME|placeholder|not.?implemented|coming soon`) over all six changed files returned nothing; the `ping.ts` and compose command implement real behaviour proven by the running container.

## Issues Encountered

- **Transient api-tier flake in one back-to-back `npm run test` run.** During one piped invocation the api tier reported "1 failed | 4 passed (5)" while still counting all 75 tests passed and the overall runner exited 0. Running `test:api` alone (5 files, 75 tests, exit 0) and re-running the full `npm run test` (exit 0, all tiers green) both passed cleanly. The cause is per-suite database contention under vitest's shared `singleFork` when tiers run consecutively against one Postgres; it is non-deterministic and not introduced by this plan (which added no test). Resolved by confirmation via a clean re-run; recorded here for transparency.

## User Setup Required

None - no external service configuration required. The stack is fully local: `cp .env.example .env && docker compose up -d --build`.

## Next Phase Readiness

- The application now runs end to end in a container: this is the stack every later phase builds and demonstrates against, and the UAT walkthrough of phases 3–6 runs here.
- **Carry-forward (unchanged by this plan):** criterion 2 of the phase remains PARTIALLY evidenced — 02-04 has no API auth gate, so only `GET /api/session` answers 401 unauthenticated. This is an owning-module follow-up in 02-04 (add `requireApiAuth` after `sessionMiddleware`, before `csrfMiddleware`), noted in 02-06 and 02-07 summaries and STATE.md.

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-15*

## Self-Check: PASSED

- Created files exist on disk: `Dockerfile`, `.dockerignore`, `server/src/cli/ping.ts` — all FOUND.
- Task commits present: `ba3fbbb`, `eb5ccc8`, `22bf3c3` — all FOUND.
- Build gate: `docker build -t pivota-build-check .` exits 0 and the runtime image runs `node server/dist/index.js`; `npm run typecheck` exits 0.
- Plan-level verify green: `docker compose up -d --build` healthy, `/sign-in` 200, no `X-Frame-Options`, `POST /api/session` 201, both Playwright suites (29) pass against the composed stack, `npm run test` + `test:arch` exit 0, no forbidden directories.
- Known Stubs: none (no blocking stubs).
