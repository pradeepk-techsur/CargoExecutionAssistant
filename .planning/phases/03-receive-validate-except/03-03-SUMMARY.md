---
phase: 03-receive-validate-except
plan: 03
subsystem: api
tags: [express, middleware, authentication, csrf, session, http]

# Dependency graph
requires:
  - phase: 02-identity-and-the-federal-ui-foundation
    provides: sessionMiddleware's req.principal (plan 02-04), errorMapper single translation point, API_ROUTE_TABLE
provides:
  - requireApiAuth gate — uniform 401 UNAUTHENTICATED on every /api/* request with no principal, except POST /api/session
  - Phase 2 criterion 2 now fully evidenced (all ten §3.1 pairs answer 401 unauthenticated)
  - the middleware ordering guarantee (gate after session, before CSRF) pinned by test
affects: [F3, F5, F7, F9, F11, F13, 03-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth gate as a standalone RequestHandler mounted between sessionMiddleware and csrfMiddleware; refusal via next(new ApiError(401, 'UNAUTHENTICATED')) through the single §3.7 translation point"
    - "Uniform refusal across implemented/unimplemented/unknown /api paths so an anonymous caller cannot probe path existence"

key-files:
  created:
    - server/src/http/requireApiAuth.ts
  modified:
    - server/src/http/app.ts
    - server/test/api/guard.spec.ts
    - server/test/api/session.spec.ts

key-decisions:
  - "requireApiAuth reads ONLY req.principal — never a header, body property, or query value (FR-1.6); refusal routed through errorMapper, not a second res.status().json()"
  - "The 404/405 distinction survives only for AUTHENTICATED callers; session.spec case 11 (PUT /api/session ⇒ 405) now signs in first, because an unauthenticated PUT is uniformly 401"

patterns-established:
  - "Middleware ordering with a security consequence is pinned positionally in app.ts by Task 1's verify AND behaviourally by guard.spec case 6 (a refactor moving the gate after CSRF fails the build)"

# Metrics
duration: 4min
completed: 2026-09-15
---

# Phase 3 Plan 03: API Authentication Gate Summary

**`requireApiAuth` mounted between `sessionMiddleware` and `csrfMiddleware` so every `/api/*` request except `POST /api/session` with no principal answers a uniform `401 UNAUTHENTICATED` — closing the Phase 2 carry-forward before any Phase 3 route writes case data.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-09-15T16:11:40Z
- **Completed:** 2026-09-15T16:16:02Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- New `server/src/http/requireApiAuth.ts`: refuses any `/api/*` request with `req.principal === undefined` (exempting `POST /api/session`) via `next(new ApiError(401, 'UNAUTHENTICATED'))`, reading only `req.principal`.
- Wired strictly between `sessionMiddleware` and `csrfMiddleware` in `app.ts`; the normative order diagram and the `createApp` order comment updated to match.
- `guard.spec.ts` tightened: every `/api/*` pair except `POST /api/session` now asserted at `401 UNAUTHENTICATED` with the exact Y2 §1 envelope (no `WWW-Authenticate`, no `Location`, `Cache-Control: no-store`); unknown `/api` path is 401 too. New cases 6 (unauthenticated `DELETE` is 401 not masking 403) and 7 (authenticated `DELETE` with a bad CSRF is still 403).
- Phase 2 criterion 2 ("all ten §3.1 pairs answer 401 unauthenticated") is now fully evidenced — the 02-06 carry-forward is closed.

## Task Commits

1. **Task 1: requireApiAuth gate, wired between session and CSRF** — `4b004b7` (feat)
2. **Task 2: tighten guard.spec to the uniform 401, prove gate ordering** — `bcc55e2` (test)

**Plan metadata:** (docs commit — this SUMMARY + STATE.md + deferred-items.md)

## Files Created/Modified

- `server/src/http/requireApiAuth.ts` — the API authentication gate (created)
- `server/src/http/app.ts` — `requireApiAuth` mounted after session, before CSRF; order diagram + comment updated
- `server/test/api/guard.spec.ts` — header rewritten; cases 3+4 collapsed to the uniform 401; case 5 → 401; new cases 6 & 7; downstream cases renumbered 8–14
- `server/test/api/session.spec.ts` — case 11 (`PUT /api/session` ⇒ 405) now authenticates first

## Decisions Made

- The gate reads only `req.principal`; refusal goes through `errorMapper` (the single §3.7 translation point) rather than a second `res.status(401).json(...)`, so the envelope, `request_id`, `Cache-Control: no-store`, and the absence of `Location`/`WWW-Authenticate` all come from code already in place.
- The 404/405 distinction is deliberately reserved for authenticated callers (it discloses nothing to them); an anonymous caller gets a uniform 401 across implemented, unimplemented and unknown paths so path existence cannot be probed. This is why `session.spec` case 11 now signs in before the `PUT`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `session.spec.ts` case 11 pinned the pre-gate status**
- **Found during:** Task 2 (running the full api tier after adding the gate)
- **Issue:** Case 11 asserted an *unauthenticated* `PUT /api/session` ⇒ 405 `METHOD_NOT_ALLOWED`. With the gate in place, an unauthenticated `PUT` is now uniformly refused 401 before route matching (the correct, intended behaviour — the 405 distinction is only for authenticated callers). The old assertion would have failed.
- **Fix:** The test now signs in first, so the request reaches the route stage and gets the shape error (405). Comment explains the 401-vs-405 reasoning.
- **Files modified:** `server/test/api/session.spec.ts`
- **Verification:** `npm run test:api` — 77 tests pass, 0 skipped.
- **Committed in:** `bcc55e2` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a test assertion that pinned the old status, exactly the class Task 2 directed fixing).
**Impact on plan:** Necessary and in-scope (Task 2 explicitly says "fix any assertion in those suites that pinned the old status"). No scope creep.

## Known Stubs

None found — no `TODO`/`FIXME`/placeholder/`not implemented` markers in the changed files; the gate is a complete synchronous property read with no I/O.

## Issues Encountered

- **Out-of-scope pre-existing failure (NOT fixed):** `server/test/unit/scaffolding.spec.ts` fails — `INTERNAL_INVARIANT_CODES` now has 9 codes but the test asserts 8. Root cause is plan **03-01** (commit `f12ed52`) adding `VALIDATION_ENGINE_FAILURE` to `contract/src/errors.ts` without updating the scaffolding spec. It is unrelated to this plan's files and is logged in `.planning/phases/03-receive-validate-except/deferred-items.md` for the owning plan (03-01) to resolve. The api (77) and arch (130) tiers this plan owns are fully green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 criterion 2 is closed: every protected `/api` route added from here (plan 03-06's `POST /api/entries` first) inherits the uniform 401 gate — no route can be shipped behind no auth gate.
- The 02-06 carry-forward recorded in STATE.md "Blockers/Concerns" can be retired.
- Ready for the next Phase 3 plan.

---
*Phase: 03-receive-validate-except*
*Completed: 2026-09-15*

## Self-Check: PASSED

- Created files exist: `server/src/http/requireApiAuth.ts`, `03-03-SUMMARY.md`, `deferred-items.md` — all FOUND.
- Commits exist: `4b004b7` (Task 1 feat), `bcc55e2` (Task 2 test) — both FOUND.
- Plan-level build ran and passed: `npm run build` → exit 0 (server tsc + web vite build).
- Test tiers this plan owns pass: `npm run test:api` 77/77, `npm run test:arch` 130/130.
- Task 1 verify (`npm run typecheck && npm run build:server` + positional middleware-order check) → `MIDDLEWARE ORDER OK`.
- Task 2 verify: `grep -c UNAUTHENTICATED guard.spec.ts` = 13; carry-forward text removed (`CARRY-FORWARD TEXT REMOVED`).
- `## Known Stubs` present — none blocking.
- One out-of-scope pre-existing unit failure (03-01's `INTERNAL_INVARIANT_CODES` drift) documented under Issues Encountered and in `deferred-items.md`; not this plan's files.
