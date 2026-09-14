---
phase: 02-identity-and-the-federal-ui-foundation
plan: 02
subsystem: api
tags: [express, helmet, pino, csp, cookies, error-mapping, security-headers, request-id, zod]

# Dependency graph
requires:
  - phase: 02-01
    provides: AppConfig/loadConfig, the closed Y2 ErrorCode union + ERROR_MESSAGES + INTERNAL_INVARIANT_CODES, ApiErrorBody/ApiErrorDetail, SpecialistDto
provides:
  - "securityHeaders(config): the §4.5 CSP + helmet with frameguard/CSP disabled — X-Frame-Options is never sent (D-1)"
  - "errorMapper() + ApiError: the single translation point from any failure to a Y2 envelope (§3.7, §1A.3)"
  - "createLogger(config) + lazy logger: pino with the §4.7 redaction denylist and a serialiser that drops the sign-in body"
  - "requestId(): server-generated X-Request-Id, echoed and bound to a pino child; the Express req.log/req.principal augmentation"
  - "cookies: parseCookies + the two §4.3 Set-Cookie profiles (SESSION_COOKIE_NAME=cargoexec_sid)"
affects: [02-04, 02-06, 02-09, phase-3, phase-4, phase-5, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "helmet configured for absence: frameguard:false + contentSecurityPolicy:false, then a hand-written CSP — the framework's defaults are the threat"
    - "Two independent secret-suppression mechanisms in the logger (path denylist + whole-body drop of POST /api/session)"
    - "One error-translation chokepoint (errorMapper) so no internal invariant code can reach the wire from anywhere"
    - "Structural (not instanceof) detection of ZodError, robust to dual package copies"
    - "Lazy module logger with a config-less fallback so logging never crashes request handling"

key-files:
  created:
    - server/src/http/logger.ts
    - server/src/http/requestId.ts
    - server/src/http/cookies.ts
    - server/src/http/headers.ts
    - server/src/http/errorMapper.ts
    - server/test/unit/redaction.spec.ts
    - server/test/unit/cookies.spec.ts
    - server/test/unit/headers.spec.ts
    - server/test/unit/errorMapper.spec.ts
  modified: []

key-decisions:
  - "X-Frame-Options is never SET (matching is on setHeader/res.set/.header shapes, not the bare name) so the comment explaining the rule survives — mirrors plan 02-09 Task 2"
  - "The lazy module-level logger falls back to a default-config logger (same §4.7 redaction) when loadConfig() is unavailable, so request correlation never throws in a config-less context"
  - "ZodError is detected structurally (name==='ZodError' + issues array), not by instanceof, to survive two zod copies; unrecognized_keys surfaces the rejected key as the detail field"
  - "The full §3.7 PG mapping table (rows for phases 3 & 6 included) is implemented now to avoid drift; unreachable rows carry an owning-phase comment, never a skipped test"

patterns-established:
  - "Absence-first security config: disable helmet's framing/CSP defaults and own the CSP by hand"
  - "Single translation point for errors; internal codes logged against request_id, generic 500 to the client"

# Metrics
duration: 16 min
completed: 2026-09-14
---

# Phase 2 Plan 02: Cross-cutting HTTP Concerns Summary

**helmet with `frameguard:false` + a hand-written §4.5 CSP that never sends X-Frame-Options, a pino logger whose redaction denylist and whole-body drop keep every credential out of the log, a server-generated `X-Request-Id` bound to a per-request child logger, the two §4.3 cookie profiles, and `errorMapper` — the one place any failure becomes a Y2 envelope, with internal invariant codes logged but never returned.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-09-14T22:03Z
- **Completed:** 2026-09-14T22:11Z
- **Tasks:** 3
- **Files created:** 9

## Accomplishments
- **The header that is never sent.** `securityHeaders(config)` disables helmet's default `X-Frame-Options: SAMEORIGIN` and its CSP, then emits the ten always-on §4.5 CSP directives plus `frame-ancestors` only when configured (never `'none'`/`'self'`, which `loadConfig` already refuses), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, HSTS only over HTTPS, and `Cache-Control: no-store` on `/api` and HTML documents. No COEP.
- **Secrets never reach the log.** `createLogger` applies the §4.7 path denylist (cookie / x-csrf-token / authorization headers; password / token / api_key top-level and nested) and a `req` serialiser that drops the `POST /api/session` body entirely — not field-by-field. Asserted with sentinel tokens, passwords and API keys.
- **Request correlation.** `requestId()` mints `crypto.randomUUID()` per request (never trusting an inbound id), echoes `X-Request-Id`, and binds `req.log = logger.child({ request_id })`; the Express `req.log`/`req.principal` augmentation is declared here for 02-04 to agree with.
- **The single error-translation point.** `errorMapper()` maps `ApiError` (message defaulting from `ERROR_MESSAGES`), `ZodError` → `422 REQUEST_MALFORMED` with per-issue details, and the full §3.7 PG table to Y2 codes. Internal invariant codes (`HITL_VIOLATION`, `AUDIT_*`, …) are logged against `request_id` and surfaced as a generic 500; every envelope carries `request_id` and omits `details` when empty.
- **Cookie profiles without a dependency.** `parseCookies` is malformed-safe (a crafted `Cookie` header cannot 500 the origin); `buildSessionCookie` emits `HttpOnly; Path=/` always, no `Domain`, no `Max-Age`/`Expires`, `SameSite=Lax` + conditional `Secure` under `governed` and `SameSite=None; Secure` under `demo-iframe`; `buildClearedSessionCookie` adds `Max-Age=0`.

## Task Commits

1. **Task 1: logger + requestId + cookies (+ tests)** - `0023775` (feat)
2. **Task 2: security headers (+ test)** - `8b22a07` (feat)
3. **Task 3: errorMapper (+ test, + logger fallback fix)** - `99707b2` (feat)

## Files Created/Modified
- `server/src/http/logger.ts` - pino §4.7 redaction + sign-in-body drop; lazy logger with config-less fallback; `sessionRef`
- `server/src/http/requestId.ts` - per-request `X-Request-Id`, pino child, Express type augmentation
- `server/src/http/cookies.ts` - `parseCookies` + the two §4.3 Set-Cookie profiles, no third-party dependency
- `server/src/http/headers.ts` - `securityHeaders(config)`: helmet-for-absence + hand-written §4.5 CSP + per-path cache
- `server/src/http/errorMapper.ts` - `ApiError` + `errorMapper()`: the single §3.7 translation point
- `server/test/unit/{redaction,cookies,headers,errorMapper}.spec.ts` - 47 new unit tests

## Decisions Made
- Detect `ZodError` structurally rather than by `instanceof`, so a second copy of zod (bundler/test harness) cannot slip an unmapped validation error through to a generic 500 and lose its per-field details. `unrecognized_keys` puts the rejected key in `issue.keys` (path is empty), so the detail's `field` is taken from there.
- The lazy module logger falls back to a default-config logger (identical §4.7 redaction, `LOG_LEVEL`/`info` level) when `loadConfig()` throws. Rationale: logging must never be the thing that crashes request handling, and unit tests of the HTTP layer must not require `DATABASE_URL_APP`. The boot path (02-04) still calls `loadConfig()` separately and refuses to start on a bad environment, so this never masks a real production misconfiguration.
- Implemented the full §3.7 PG mapping table now, including rows whose tables (`cargo_entries`, `decisions`) have no routes until phases 3 and 6, with owning-phase comments and no skipped tests — splitting the table across phases would guarantee drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pino default-import is not callable under NodeNext**
- **Found during:** Task 1 (logger build)
- **Issue:** `import pino from 'pino'` compiled to a namespace with no call signatures under `module/moduleResolution: NodeNext`; `pino(options)` failed to type-check.
- **Fix:** Switched to the named imports pino actually exports (`import { pino, type Logger, type LoggerOptions, type DestinationStream } from 'pino'`).
- **Files modified:** server/src/http/logger.ts
- **Verification:** `npm run build:server` exits 0; redaction suite green.
- **Committed in:** `0023775`

**2. [Rule 1 - Bug] Lazy logger threw ConfigError during request handling**
- **Found during:** Task 3 (errorMapper tests)
- **Issue:** `requestId()` binds `req.log = logger.child(...)`, which forced the lazy `loadConfig()`; in any context without a full environment (unit tests, and any early request before config is proven) this threw `ConfigError`, so `req.log` was never set and the correlation id / internal-error logging silently broke.
- **Fix:** `resolveLogger()` now falls back to a default-config logger carrying the same §4.7 redaction when `loadConfig()` throws.
- **Files modified:** server/src/http/logger.ts
- **Verification:** errorMapper's internal-log assertion (P0001 HITL_VIOLATION logged against `request_id`) passes; all 4 suites green.
- **Committed in:** `99707b2`

**3. [Rule 1 - Bug] ZodError not mapped when detected by instanceof**
- **Found during:** Task 3 (errorMapper tests)
- **Issue:** `err instanceof ZodError` returned false for the ZodError thrown by the test's zod, so validation errors fell through to a generic 500 instead of `422 REQUEST_MALFORMED`.
- **Fix:** Structural `isZodError` (name + issues array) in addition to `instanceof`; and `unrecognized_keys` field extraction from `issue.keys`.
- **Files modified:** server/src/http/errorMapper.ts
- **Verification:** Zod unknown-key test asserts 422 + a `details` entry naming `extra`.
- **Committed in:** `99707b2`

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs). **Impact on plan:** all three were necessary for the modules to compile and behave as the plan specified; no scope change.

## Issues Encountered

**Parallel-execution collision with plan 02-03 (wave 2, same branch).** Mid-execution, the concurrently-running 02-03 agent swept three of my still-untracked source files (`server/src/http/{logger,cookies,requestId}.ts`) as unrecognised "leftovers" and logged them (mis-attributed to 02-04) in `deferred-items.md`. Resolution: recreated the files with the pino fix and committed each task's sources immediately after its tests passed, so tracked files could not be swept again. No work was lost. Also corrected the attribution in `deferred-items.md` and recorded the lesson (commit-per-task-immediately) for future parallel waves. An inherited latent bug flagged by 02-03 (`import { Pool } from 'pg'` failing under native ESM in the 02-01 pool modules) is out of this plan's scope — my HTTP modules do not import `pg` — and is noted for 02-04, which wires the server entry point.

## Known Stubs
None found — every export is fully implemented. PG mapping rows for phases 3 & 6 are the documented contract (not stubs) and carry owning-phase comments rather than skipped tests.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 02-04 can now assemble the middleware chain: `requestId()` → `securityHeaders(config)` → route(s) → `errorMapper()` (registered last), plus the cookie helpers for sign-in/sign-out and the CSRF middleware referenced by T-02-13.
- 02-06 can write behavioural header/error assertions against these modules; 02-09's durable X-Frame-Options architecture assertion matches the same set-shape rule used here.
- **Carry-forward for 02-04:** convert `server/src/db/pool.app.ts` / `pool.ai.ts` to the `pg` interop-default import before booting the server (inherited from 02-01, flagged by 02-03).

## Self-Check: PASSED

- All 9 created files exist on disk.
- All 3 task commits present (`0023775`, `8b22a07`, `99707b2`).
- Build gate: `npm run build:server` → exit 0. Full `npm run typecheck` → exit 0.
- `npm run test:unit` → 111 passed (9 files); `npm run test:arch` → 67 passed.
- `## Known Stubs`: None found (no blocking stubs).

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-14*
