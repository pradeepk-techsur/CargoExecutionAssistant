---
phase: 02-identity-and-the-federal-ui-foundation
plan: 04
subsystem: api
tags: [express, session, csrf, middleware, supertest, http, auth]

# Dependency graph
requires:
  - phase: 02-02
    provides: securityHeaders, errorMapper/ApiError, cookies (SESSION_COOKIE_NAME, buildSessionCookie, buildClearedSessionCookie, parseCookies), requestId + Request augmentation
  - phase: 02-03
    provides: session service (signIn, signOut, loadSessionByToken, touchSession, expireSession, throttle), clock injection, createTestSpecialist fixture, testdb harness
provides:
  - createApp — the assembled Express app in the normative middleware order, pool injected
  - The three F1 session endpoints (POST/GET/DELETE /api/session) exactly per §3.3
  - sessionMiddleware (req.principal from the cookie alone), csrfMiddleware (double-submit), htmlRouteGuard (302 to /sign-in) + validateNextPath
  - API_ROUTE_TABLE (all ten §3.1 pairs as data, three implemented) + ROUTES + registerRoutes
  - server/src/index.ts — process bootstrap binding 0.0.0.0:3000 with self-checks before listen
  - withApi — the reusable per-suite API harness reused by 02-06 and phases 3–6
affects: [02-05, 02-06, 02-07, phase-3, phase-4, phase-5, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "req.principal is the SOLE actor source (FR-1.6); no handler reads an actor from body/header/query"
    - "Data-driven route registration from one array (API_ROUTE_TABLE/ROUTES) an arch test can pin"
    - "createApp takes the pool as a parameter, constructing nothing at import time — enables per-suite test databases and the context-boot test"
    - "Rotate-on-GET CSRF: GET /api/session mints a fresh token and re-stores its hash (store holds only hashes)"
    - "withApi harness: fresh migrated DB + assembled app per suite, dropped afterwards"

key-files:
  created:
    - server/src/http/session.middleware.ts
    - server/src/http/csrf.middleware.ts
    - server/src/http/htmlRouteGuard.ts
    - server/src/http/routes/session.ts
    - server/src/http/routes/index.ts
    - server/src/http/app.ts
    - server/src/index.ts
    - server/test/api/helpers/appHarness.ts
    - server/test/api/boot.spec.ts
    - server/test/api/session.spec.ts
  modified:
    - server/src/services/session.service.ts
    - server/src/db/repositories/sessions.ts
    - server/src/http/requestId.ts
    - server/src/db/pool.app.ts
    - server/src/db/pool.ai.ts

key-decisions:
  - "Ships production-mode SPA serving only (no Vite middleware); §6.5's one-origin-one-port-on-0.0.0.0:3000 is satisfied. Recorded deviation, not an unremarked omission."
  - "csrfMiddleware lets a state-changing method with no implemented route pass through so a 405 (shape error) is not masked by a 403 CSRF_INVALID (§3.1)"
  - "expireSessionByToken added to the service so the middleware records expiry without reaching into a repository (keeps http off the repository layer)"
  - "pool.app.ts/pool.ai.ts converted to the pg interop-default import so the pools load under native ESM at server boot"

patterns-established:
  - "Rotate-on-GET CSRF has a mandatory client half (plan 02-07 api.getSession must re-store csrf_token); a reload followed by any POST/DELETE 403s if the client stops re-storing while every in-session test still passes"
  - "async route handlers are wrapped so a rejected promise reaches errorMapper (Express 4 does not await handlers)"

# Metrics
duration: 10 min
completed: 2026-09-14
---

# Phase 2 Plan 04: The HTTP Surface — Session Middlewares, Endpoints, App Assembly and Boot Summary

**Express app assembled in the normative middleware order, wiring 02-02's cross-cutting concerns and 02-03's identity layer into three working F1 session endpoints, with a context-boot test that proves the whole thing starts against a real PostgreSQL and answers 401 unauthenticated.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-14T22:16:57Z
- **Completed:** 2026-09-14T22:27:40Z
- **Tasks:** 3
- **Files modified:** 15 (10 created, 5 modified)

## Accomplishments
- The three identity middlewares: `sessionMiddleware` (attaches `req.principal` from the `cargoexec_sid` cookie alone, records `revoked_at`/`'EXPIRED'` at the moment of rejection, throttles `last_seen_at` to once per 60 s), `csrfMiddleware` (constant-time double-submit with a length guard), and `htmlRouteGuard` (302 to `/sign-in?next=<validated path>`, reverse redirect off `/sign-in`).
- The three F1 session endpoints copied verbatim from §3.3: `POST` signs in (201 + cookie), `GET` returns the principal and rotates the CSRF token, `DELETE` signs out (204, cleared cookie, `SIGNED_OUT`).
- `createApp` assembling everything in the normative order with `session` before `csrf` and `errorMapper` last; `API_ROUTE_TABLE` (all ten §3.1 pairs, three implemented) as a pinnable data array; the process bootstrap binding `0.0.0.0:3000` with self-checks before listen and graceful shutdown.
- The reusable `withApi` harness, the context-boot test, and the eleven-case session suite — `npm run test` (unit 111 + db 114 + api 15 + arch 67) exits 0 end to end.

## Task Commits

1. **Task 1: The three middlewares** — `2031508` (feat)
2. **Task 2: Session routes, route registry, app assembly, bootstrap** — `ef70303` (feat)
3. **Task 3: API harness, context-boot test, session suite** — `c73f2c4` (test)

## Files Created/Modified
- `server/src/http/session.middleware.ts` — principal resolution from the cookie alone; expiry recorded; last_seen throttle
- `server/src/http/csrf.middleware.ts` — double-submit CSRF, `timingSafeEqual` + length guard, exempts GET/HEAD + POST /api/session + unimplemented-method paths
- `server/src/http/htmlRouteGuard.ts` — HTML document redirect logic + `validateNextPath`/`NEXT_PATH_RE`
- `server/src/http/routes/session.ts` — the three §3.3 endpoints; `.strict()` request schema; short-password → 401
- `server/src/http/routes/index.ts` — `API_ROUTE_TABLE`, `ROUTES`, `registerRoutes`, async-handler wrapper
- `server/src/http/app.ts` — `createApp` in the normative order; 413/415/422 body mapping; 404/405 for /api; SPA fallback
- `server/src/index.ts` — bootstrap: loadConfig self-checks → listen 0.0.0.0:3000 → graceful shutdown
- `server/test/api/helpers/appHarness.ts` — `withApi`, `TEST_CONFIG`, `extractSessionCookie`
- `server/test/api/boot.spec.ts` — the context-boot test (4 cases)
- `server/test/api/session.spec.ts` — the eleven-case session suite
- `server/src/services/session.service.ts` — added `expireSessionByToken`, `rotateCsrfToken`
- `server/src/db/repositories/sessions.ts` — added `findSessionById`, `updateCsrfTokenHash`
- `server/src/http/requestId.ts` — extended Request augmentation with `sessionId`, `csrfTokenHash`
- `server/src/db/pool.app.ts` / `pool.ai.ts` — pg interop-default import (ESM runtime fix)

## Decisions Made
- **Production-mode SPA serving only** (no Vite middleware in the bootstrap). §6.5's Vite-middleware excerpt is normative, so this is a recorded deviation rather than an unremarked omission. The demonstration path is the production path (`npm run build && npm start`), and §6.5's load-bearing requirement — one origin, one port, bound to `0.0.0.0:3000` — is satisfied exactly.
- **Rotate-on-GET CSRF pairing is load-bearing and has a client half.** Only the CSRF token's hash is stored, so `GET /api/session` mints a fresh token and re-stores its hash on every load. Plan 02-07's `api.getSession()` MUST re-store the returned `csrf_token`; if that client half is ever dropped, a reload followed by any `POST`/`DELETE` returns `403 CSRF_INVALID` while every in-session test still passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pg pool modules fail under native ESM at boot**
- **Found during:** Task 1 (the server bootstrap is the first code to execute the pools)
- **Issue:** `import { Pool } from 'pg'` in `pool.app.ts`/`pool.ai.ts` — `pg` is CommonJS, so a named value import throws `SyntaxError: Named export 'Pool' not found` under Node's native ESM loader. Flagged in deferred-items by 02-01/02-03; 02-04 owns the bootstrap that first runs them.
- **Fix:** Converted both to the interop-default form (`import pg from 'pg'; const { Pool } = pg;`), matching the fix 02-03 already applied to the CLI.
- **Files modified:** server/src/db/pool.app.ts, server/src/db/pool.ai.ts
- **Verification:** `DATABASE_URL_APP=… node -e "import('./server/dist/db/pool.app.js')…"` constructs a pool; the server boots against the real DB and answers 401.
- **Committed in:** 2031508 (Task 1 commit)

**2. [Rule 1 - Bug] PUT on a listed path was masked by CSRF (403 instead of 405)**
- **Found during:** Task 3 (session suite case 11)
- **Issue:** `csrfMiddleware` runs before route matching, so `PUT /api/session` (a state-changing, non-exempt method) was refused `403 CSRF_INVALID` before the route stage could answer `405 METHOD_NOT_ALLOWED`. §3.1 requires "any other method on a listed path returns 405".
- **Fix:** `csrfMiddleware` now consults `API_ROUTE_TABLE` and lets a state-changing method that no *implemented* route handles pass through, so the 405 (a request-shape error, not a mutation to defend) is produced downstream. CSRF still guards every implemented state-changing route.
- **Files modified:** server/src/http/csrf.middleware.ts
- **Verification:** session suite case 11 (`PUT /api/session ⇒ 405`) passes; all other CSRF cases (including case 8, CSRF-refusal-leaves-session-valid) still pass.
- **Committed in:** c73f2c4 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both essential for correctness. The pool fix was a prerequisite for any server boot; the CSRF/405 fix aligns behaviour with the §3.1 contract. No scope creep.

## Known Stubs

None found. The seven `implemented: false` rows in `API_ROUTE_TABLE` are the plan's explicit `ten_routes_rule` design contract (data listing the full inventory), NOT stubs — the rule forbids placeholder handlers for them, and `registerRoutes` registers only the three implemented rows.

## Issues Encountered
None during planned work beyond the two deviations above.

## Deferred Issues

- **`npm run build` (full) fails at `build:web`** because `web/styles/uswds.scss` and the SPA do not exist yet — those are plan **02-05**'s deliverables. `npm run build:server` (this plan's scope) exits 0. `server/src/index.ts` already serves `web/dist` when static serving is on, so once 02-05 lands the web build the full build passes with no server change. Logged in `deferred-items.md`.

## User Setup Required
None - no external service configuration required (no `user_setup` in the plan frontmatter).

## Next Phase Readiness
- The HTTP surface is proven: the app boots against a real PostgreSQL, binds a non-loopback address, and answers the three F1 endpoints exactly per §3.3.
- Ready for **02-05** (the SPA shell served by this app), **02-06** (the governance suite reuses `withApi` and drives this app), and **02-07** (the SPA calls these endpoints — note the mandatory rotate-on-GET client half).

## Self-Check: PASSED

- Created files verified on disk: all 10 present.
- Commits verified: `2031508`, `ef70303`, `c73f2c4` all in `git log`.
- Plan-level build check: `npm run build:server` → exit 0 (server scope). Full `npm run build` fails only at `build:web` for a pre-existing, out-of-scope reason (web SPA is plan 02-05) — documented above and in deferred-items.
- `## Known Stubs` present; no blocking stubs.
- `npm run test` (unit + db + api + arch) exits 0: 111 + 114 + 15 + 67 tests passing.

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-14*
