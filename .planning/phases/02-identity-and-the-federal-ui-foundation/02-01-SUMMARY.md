---
phase: 02-identity-and-the-federal-ui-foundation
plan: 01
subsystem: infra
tags: [dependencies, typescript, contract, config, express, react, uswds, argon2, zod]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate
    provides: "the contract package (@cargoexec/contract), INTERNAL_INVARIANT_CODES, ENTRY_FIELDS, the two-project tsc build, the single-fork vitest config"
provides:
  - "Pinned web-tier dependency set (express, helmet, zod, argon2, pino, react, react-dom, react-router-dom, @uswds/uswds) at exact TechArch §6.2 versions"
  - "Third workspace `web` with a standalone non-composite tsconfig; workspaces order [contract, server, web]"
  - "Full script set: build/build:server/build:web/build:css/build:assets, dev, start, create-specialist, test:unit/db/api/arch/e2e, test, test:all, typecheck"
  - "Shared session wire contract (SpecialistDto, SessionRequest, SessionDto, ActorRef) and error envelope (ApiErrorBody, ApiErrorDetail) defined once in contract/src/dto.ts"
  - "Closed 23-member Y2 ErrorCode union + ERROR_MESSAGES, disjoint from the 8 internal invariant codes"
  - "server/src/config.ts loadConfig()/ConfigError with four boot self-checks (loopback HOST, FRAME_ANCESTORS none/self, demo-iframe over http, missing DATABASE_URL_APP)"
affects: [02-02, 02-03, 02-04, 02-05, 02-07, 02-09, F3, F6, F7, F8, F9, F10, F11, F12, F14]

# Tech tracking
tech-stack:
  added: [express@4.21.1, helmet@8.0.0, zod@3.23.8, argon2@0.41.1, pino@9.5.0, react@18.3.1, react-dom@18.3.1, react-router-dom@6.28.0, "@uswds/uswds@3.11.0", sass@1.80.6, vite@5.4.11, supertest@7.0.0, "@playwright/test@1.48.2"]
  patterns:
    - "Environment-only configuration with fail-loud startup self-checks (no config file, no ENABLE_* toggle)"
    - "One shared contract package for wire types; server and SPA import rather than re-declare"
    - "Client-facing error codes kept a closed union disjoint from internal invariant codes"
    - "Config error messages name the offending KEY, never its value (§4.7)"

key-files:
  created: [contract/src/dto.ts, server/src/config.ts, server/test/unit/contract.spec.ts, server/test/unit/config.spec.ts, web/package.json, web/tsconfig.json, web/src/placeholder.ts]
  modified: [package.json, contract/package.json, contract/src/errors.ts, contract/src/index.ts, vitest.config.ts, .env.example]

key-decisions:
  - "test:e2e kept OUT of `test`; the phase-completion gate is `test:all` (needs a built app + live DB + browser)"
  - "web/src/placeholder.ts added so `tsc -p web --noEmit` has an input until the real SPA source lands in 02-05"
  - "contract exports point at ./dist/index.js so `node server/dist/index.js` resolves; `npm run build:server` (or typecheck) is the first command after a fresh clone"
  - "AI/DATABASE_URL_AI config keys deferred to phase 5 as a comment, not a skipped test"

patterns-established:
  - "Startup self-check: every silent failure mode is made a loud ConfigError before listen"
  - "Deferred future surface is a comment naming the owning phase, never a skipped test (phase-1 convention continued)"

# Metrics
duration: 5 min
completed: 2026-09-14
---

# Phase 2 Plan 01: Web-Tier Foundation Summary

**Pinned Express/React/USWDS/argon2 stack, a three-workspace repo, the F1 session wire contract and closed 23-member Y2 error union defined once, and a config module whose four boot self-checks refuse a loopback HOST, a frame-blocking FRAME_ANCESTORS, demo-iframe over plain HTTP, or a missing DATABASE_URL_APP.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-14T21:52:00Z
- **Completed:** 2026-09-14T21:58:00Z
- **Tasks:** 3
- **Files modified:** 13 (7 created, 6 modified)

## Accomplishments
- Installed the nine new runtime deps + four dev deps at exact TechArch §6.2 pins; `argon2` native binding loads; `npm run test:arch` still green (67 tests — nothing forbidden entered the tree).
- Added the `web` workspace and the full build/test/typecheck script set; `contract` now resolves `.` to its built JS so the server is runnable.
- Defined the session wire types and error envelope once in `contract/src/dto.ts`, and the closed 23-member `ErrorCode` union + canonical session messages in `contract/src/errors.ts`, proven disjoint from the 8 internal invariant codes.
- Wrote `server/src/config.ts` — environment-only, with four self-checks that throw before `listen`, each covering a silent failure mode; 28 unit tests exercise every refusal and every accepted default/allowlist.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin web-tier deps, add web workspace, define scripts** - `3c01b9b` (feat)
2. **Task 2: Define session wire contract and Y2 error-code union** - `fa97410` (feat)
3. **Task 3: Config module with startup self-checks** - `320a9b4` (feat)

## Files Created/Modified
- `package.json` - web workspace, pinned deps, full script set (test:api/test:e2e/test:all/build/start/typecheck)
- `contract/package.json` - exports `.` → `./dist/index.js` (types → `./dist/index.d.ts`)
- `contract/src/dto.ts` - session wire types, error envelope, governance enums (§3.9/§3.10/§3.11)
- `contract/src/errors.ts` - added `ERROR_CODES`, `ErrorCode`, `ERROR_MESSAGES`
- `contract/src/index.ts` - re-export dto
- `server/src/config.ts` - `loadConfig`, `AppConfig`, `ConfigError` + four self-checks
- `server/test/unit/contract.spec.ts` - 5 tests (count, dupes, disjointness, messages, type-level)
- `server/test/unit/config.spec.ts` - 28 tests (all four refusals + accepted cases)
- `web/package.json`, `web/tsconfig.json`, `web/src/placeholder.ts` - the web workspace scaffold
- `vitest.config.ts` - added `esbuild: { jsx: 'automatic', jsxImportSource: 'react' }`
- `.env.example` - HOST/PORT/NODE_ENV/PUBLIC_ORIGIN/SESSION_COOKIE_PROFILE/FRAME_ANCESTORS/LOG_LEVEL

## Decisions Made
- **`test` excludes `test:e2e`; `test:all` is the phase-completion gate.** A deliberate divergence from §8.1: `test:e2e` needs a built app, a live DB, and a browser, so it must not be in the wave gate every later phase re-runs. `test:all` (which includes the keyboard-only / focus-management / in-iframe Playwright suites carrying criterion-4 functional evidence and deviation D-1's browser proof) is the command a phase closes on. `test:unit`/`test:db`/`test:api`/`test:arch` are the fast inner loop.
- **First command after a fresh clone is `npm run build:server` (or `npm run typecheck`).** `contract/package.json` now resolves `@cargoexec/contract` to `./dist/index.js`, so any vitest suite importing it needs `tsc -b contract` to have run once. Several `<verify>` blocks in this phase call `npx vitest` before `npm run typecheck`; that is benign on a built tree and confusing on a fresh clone.
- **`build:css`/`build:assets`/`build:web` inputs do not exist yet** (`web/styles/uswds.scss`, `web/scripts/copy-uswds-assets.mjs`, `web/vite.config.ts`) — created by plan 02-05. Those scripts fail until then, which is correct.
- AI keys deferred to phase 5 via a `TODO(phase 5 …)` comment, not a skipped test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `web/src/placeholder.ts` so `tsc -p web --noEmit` has an input**
- **Found during:** Task 1
- **Issue:** `npm run typecheck` runs `tsc -p web --noEmit`, but `web`'s only source (`web/src/*`, `web/vite.config.ts`) is created by plan 02-05. With no matching input, `tsc` exits 2 with `TS18003: No inputs were found`, breaking `typecheck` — which Task 2's and Task 3's own `<verify>` blocks invoke.
- **Fix:** Created a one-line, self-documenting placeholder module (`export const WEB_WORKSPACE_INITIALISED = true`) with a comment naming plan 02-05 as the owner and instructing its deletion once real source exists.
- **Files modified:** web/src/placeholder.ts (new)
- **Verification:** `tsc -p web --noEmit` exits 0; `npm run typecheck` exits 0.
- **Committed in:** `3c01b9b` (Task 1 commit)

**2. [Rule 3 - Blocking] Used the default vitest reporter instead of `--reporter=list`**
- **Found during:** Task 2 / Task 3 verification
- **Issue:** The plan's `<verify>` blocks call `npx vitest run … --reporter=list`. vitest 2.1.5 does not ship a reporter named `list` and errors at startup (`Failed to load url list`).
- **Fix:** Ran the same specs with the default reporter (equivalent output). No code change — a verify-command quirk only.
- **Files modified:** none
- **Verification:** Both specs run and pass (5 + 28 tests).
- **Committed in:** n/a (no code change)

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both are environment/forward-reference friction, not scope changes. The placeholder is a documented, disposable scaffold; the reporter change is a command substitution with identical semantics. No design decision altered.

## Known Stubs
- `web/src/placeholder.ts` — **cosmetic.** A disposable one-line scaffold so the empty `web` workspace type-checks; the real SPA source lands in plan 02-05. Does not defeat this plan's objective (a buildable, type-checkable three-workspace repo).
- `server/src/config.ts:158` `TODO(phase 5 — AI recommendation)` — **cosmetic / by design.** The plan explicitly requires the AI config keys be deferred to phase 5 as a comment, not read as required now (a build with no AI code must still boot). Not a stub of this plan's behaviour.
- No blocking stubs found.

## Issues Encountered
- `npm install` emits `EBADENGINE` because the sandbox runs Node v20.20.2 while `engines.node` is pinned to `22.11.0` (a warning, not an error — install completed, argon2 loaded, all suites pass). The engine pin is a TechArch §6.2 settled decision and was not touched; it will be satisfied by the runtime image, not by relaxing the pin.

## User Setup Required
None - no external service configuration required by this plan.

## Next Phase Readiness
- The dependency set, the shared contract, and the configuration module are in place — every later plan in phase 2 (02-02 errorMapper/headers, 02-03 session service, 02-04 routes/bootstrap, 02-05 web build, 02-07 api client, 02-09 shell) can build on them.
- Reminder for later plans: run `npm run build:server` (or `npm run typecheck`) once after a fresh clone before any `npx vitest` that imports `@cargoexec/contract`.
- `build:web` is not yet runnable (its inputs arrive in 02-05); `test:e2e`/`test:all` become meaningful once the app and its docker-compose DB exist.

## Self-Check: PASSED
- Created files verified present: contract/src/dto.ts, server/src/config.ts, server/test/unit/contract.spec.ts, server/test/unit/config.spec.ts, web/package.json, web/tsconfig.json, web/src/placeholder.ts.
- Commits verified: 3c01b9b, fa97410, 320a9b4.
- Build/typecheck check: `npm run typecheck` → exit 0 (this plan has no separate compiled build beyond typecheck; `build:web` inputs are owned by 02-05).
- test:unit (56) + test:arch (67) green; all deps pinned exact; no a11y runner; no .github dir.
- Known Stubs section present; no blocking stubs.

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-14*
