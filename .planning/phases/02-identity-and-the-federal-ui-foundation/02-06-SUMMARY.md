---
phase: 02-identity-and-the-federal-ui-foundation
plan: 06
subsystem: testing
tags: [auth, session, csrf, supertest, expiry, actor, redirect, regression-suite]

# Dependency graph
requires:
  - phase: 02-04
    provides: withApi harness + fixedClock, createApp assembled middleware chain, API_ROUTE_TABLE, validateNextPath/htmlRouteGuard, sessionMiddleware/csrfMiddleware, the three §3.3 session endpoints
  - phase: 02-03
    provides: session service (signIn/signOut/loadSessionByToken/expireSessionByToken), createTestSpecialist fixture, __resetThrottle
provides:
  - server/test/api/guard.spec.ts — criterion 2 evidence (the unauthenticated matrix over API_ROUTE_TABLE + the HTML redirect/next-path contract)
  - server/test/api/actor.spec.ts — criterion 3 evidence (the server-resolved actor; four reachable naming vectors closed + a source scan)
  - server/test/api/expiry.spec.ts — criterion 1 evidence (idle/absolute expiry recorded EXPIRED, sign-out SIGNED_OUT, replay refused, CSRF writes nothing)
affects: [phase-3, phase-4, phase-5, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Governance criteria as permanent regression suites: the attempt is MADE in a test and observed to be refused (the Phase 2 analogue of Phase 1's refusal suites)"
    - "The auth matrix is parameterised over the exported API_ROUTE_TABLE, so a future eleventh route cannot escape the assertion"
    - "Every time-dependent assertion uses the injected fixedClock — no test waits in real time (§8.2)"
    - "Deferred coverage is a comment naming its owning phase, never a skipped test"

key-files:
  created:
    - server/test/api/guard.spec.ts
    - server/test/api/actor.spec.ts
    - server/test/api/expiry.spec.ts
  modified: []

key-decisions:
  - "Assert the middleware chain 02-04 actually ships rather than restructure it from a test-only plan (user decision): criterion 2 is evidenced as TRUE today, and the unmet 'all ten pairs answer 401' must-have is called out as a gap for the phase gate rather than silently passed."
  - "validateNextPath has no length cap in 02-04; a long same-origin path is structurally valid and preserved. The plan's 4096-char 'hostile' value is asserted PRESERVED, not discarded — a same-origin path of any length cannot cause an open redirect (the threat FR-1.7 defends)."

patterns-established:
  - "A refused-but-not-401 API surface is still proven closed: non-2xx, non-3xx, no Location, body is the Y2 error envelope and nothing else, Cache-Control: no-store"

# Metrics
duration: 13 min
completed: 2026-09-14
---

# Phase 2 Plan 06: The Governance Suites — Unauthenticated Matrix, Server-Resolved Actor, and Session Expiry Summary

**Three supertest suites (60 tests) that make Phase 2's governance properties permanent regression assets: nothing reaches case data without identification (criterion 2), the actor is the session-resolved specialist and cannot be renamed by the caller (criterion 3), and a session ends on its own terms with the `sessions` row recording how (criterion 1) — all on the plan 02-04 harness, with zero production code changed.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-14T22:31:00Z
- **Completed:** 2026-09-14T22:44:01Z
- **Tasks:** 3
- **Files modified:** 3 (3 created, 0 production files)

## Accomplishments
- **guard.spec.ts (34 tests):** the unauthenticated matrix parameterised over all ten `API_ROUTE_TABLE` pairs; `GET /api/session` unauth ⇒ the exact Y2 §1 `401 UNAUTHENTICATED` envelope with no `WWW-Authenticate`, no `Location`, no data; every protected §3.17 UI route ⇒ `302 /sign-in?next=<percent-encoded>`; `/sign-in`+session ⇒ `302 /queue`; `validateNextPath` discards eleven hostile `next` values for `/queue` and preserves legitimate same-origin paths, driven both through the HTTP surface and as a direct table.
- **actor.spec.ts (15 tests):** two specialists A/B once per suite; A signs in and every reachable actor-naming vector tries and fails to name B — six body properties (`422` + no session row), four headers (ignored), a forged/second cookie (A's opaque token never resolves to B), a query parameter (ignored) — with B's own cookie resolving to B as the positive control, plus a source scan over `server/src` proving no module reads a client-supplied actor.
- **expiry.spec.ts (11 tests):** idle expiry at 30 min + 1 ms ⇒ `401` and `revocation_reason='EXPIRED'` (29 min still valid as the negative control); `last_seen_at` throttled to once per 60 s; an active session surviving 80 min of 20-minute-spaced requests; absolute expiry at 8 h + 1 min ⇒ `401` despite continuous activity; sign-out ⇒ `204`/cleared cookie/`SIGNED_OUT`/replay `401`; a concurrent session surviving; an expired reason not overwritten by a stale DELETE; CSRF-less/wrong/other-session DELETE ⇒ `403` with the session intact and **zero** audit entries; and both audit tables empty at suite end (FR-1.12). No test waits in real time — everything is driven by the injected `fixedClock`.
- **Gate green:** `npm run test` exits 0 — unit 111 + db 114 + api 75 + arch 67 = 367 tests; typecheck clean; no skipped tests anywhere under `server/test/api`.

## Task Commits

1. **Task 1: guard.spec (criterion 2)** — `9e5c249` (test)
2. **Task 2: actor.spec (criterion 3)** — `983f12b` (test)
3. **Task 3: expiry.spec (criterion 1)** — `0b83dda` (test)

## Files Created/Modified
- `server/test/api/guard.spec.ts` (294 lines) — the unauthenticated matrix + the HTML redirect / next-path contract
- `server/test/api/actor.spec.ts` (236 lines) — the server-resolved actor: four reachable vectors closed + a source scan + the Phase 3/6 forward contract
- `server/test/api/expiry.spec.ts` (303 lines) — idle/absolute expiry, throttle, sign-out, replay, CSRF-writes-nothing, audit-empty

## Decisions Made
- **Assert what 02-04 ships, not what the plan presumed** (user decision at the criterion-2 gate). The plan's `must_haves` assume an API authentication gate that answers `401 UNAUTHENTICATED` for *every* §3.1 pair with no session, including the seven unimplemented ones ("identification precedes routing"). 02-04 has no such gate: `sessionMiddleware` only attaches `req.principal`, and the 401 is emitted inside the `GET`/`DELETE` session handlers. So the real behaviour is `GET /api/session` ⇒ 401, `DELETE /api/session` ⇒ 403 (CSRF runs first), the seven unimplemented pairs ⇒ 404, and `/api/unknown` ⇒ 404. Rather than restructure the normative middleware chain from a test-only plan, the suites assert the shipped behaviour and record the stronger guarantee as an unmet must-have (below).
- **`validateNextPath` treats path length as immaterial.** It validates structure (a single leading `/`, unreserved characters, no `%`/`:`/`.`), not length; a 4096-character same-origin path is valid and preserved. The plan listed it as "hostile", but a same-origin path of any length cannot produce an open redirect, so it is asserted preserved alongside the other legitimate values.

## Deviations from Plan

### Adjusted assertions (no production code changed — this is a test-only plan)

**1. [Rule 4 — Architectural, resolved by user decision] No API authentication gate in 02-04**
- **Found during:** Task 1 (the unauthenticated matrix)
- **Issue:** The plan's central criterion-2 truth — "every §3.1 pair except `POST /api/session` returns 401 UNAUTHENTICATED to a caller with no session, including the seven unimplemented ones" — is not implemented. `sessionMiddleware` never rejects; the 401 is per-handler. Actual behaviour: `DELETE /api/session` ⇒ 403 (CSRF), the seven unimplemented pairs ⇒ 404, `/api/unknown` ⇒ 404.
- **Decision:** Asked via checkpoint (Rule 4). The user chose to **assert the shipped behaviour** rather than add an auth gate / reorder the middleware chain. guard.spec therefore proves: the ONE endpoint that answers 401 for a missing session does so exactly (full envelope), and every OTHER protected API surface is refused (non-2xx, non-3xx, no `Location`, body = Y2 error envelope only, `Cache-Control: no-store`). `/api/unknown` is proven never handed to an anonymous caller as the SPA document.
- **Files modified:** server/test/api/guard.spec.ts (assertions only)
- **Committed in:** 9e5c249

**2. [Adjusted assertion] 4096-char next value is preserved, not discarded**
- **Found during:** Task 1
- **Issue:** `validateNextPath` has no length cap; the long same-origin path is structurally valid.
- **Fix:** Asserted preserved among the legitimate values; the eleven genuinely hostile values remain asserted discarded.
- **Committed in:** 9e5c249

**3. [Adjusted assertion] Stale DELETE on an expired session ⇒ 403, not 401**
- **Found during:** Task 3 (expiry test 8)
- **Issue:** Same ordering artifact as #1 — an already-revoked session has no principal, so `csrfMiddleware` (before the handler) refuses the DELETE 403.
- **Fix:** Asserted the DELETE is refused (4xx) and — the load-bearing point — that it does **not** overwrite the recorded reason: the row still reads `'EXPIRED'` (revokeSession is guarded by `revoked_at IS NULL`).
- **Committed in:** 0b83dda

**4. [Environment] `fs.globSync` unavailable on the sandbox Node runtime (v20.20.2)**
- **Found during:** Task 2 (the source-scan test)
- **Issue:** The runtime is Node 20 (not the target-stack Node 22), so `fs.globSync` is not a function.
- **Fix:** Replaced with a `readdirSync` recursive walk, mirroring the architecture suite's existing `walk` helper.
- **Committed in:** 983f12b

---

**Total deviations:** 1 architectural (asked, resolved by user to assert-as-shipped) + 3 adjusted assertions/environment. All within the test-only boundary; **no production source file changed.**
**Impact on plan:** The three criteria are evidenced as permanent regression assets. Criterion 2 is **partially** evidenced (see below); criteria 1 and 3 are fully evidenced.

## Unmet must-haves (for the phase gate)

- **`must_haves.truths` #1 is NOT fully met:** "Every one of the ten §3.1 pairs except POST /api/session returns 401 UNAUTHENTICATED to a caller with no session — including the seven not yet implemented." 02-04 has no API auth gate, so only `GET /api/session` answers 401; the others are refused with 403/404. The suite proves the surface is *closed* (never open to an anonymous caller) but not that it answers 401 uniformly. **Recommended follow-up:** a small `requireApiAuth` middleware in `server/src/http/app.ts` (after `sessionMiddleware`, before `csrfMiddleware`): any `/api/*` path except `POST /api/session` with no `req.principal` ⇒ `401 UNAUTHENTICATED`. That single change would make all four adjusted assertions above collapse back to the plan's original 401 expectations. It is an owning-module (02-04) change, deliberately not made here per the user decision.

## Known Stubs
None found. These are test suites; no stubbed behaviour. The Phase 3/Phase 6 forward-contract note in actor.spec is a comment naming the owning phase, not a skipped test.

## Issues Encountered
- The plan's `--reporter=list` flag fails in this sandbox (vite resolves "list" as a module id and errors). Used the default reporter for every run; results are equivalent. Not a code issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The three governance suites are inherited as a regression gate by every later phase; the actor suite's Phase 3/Phase 6 forward contract marks exactly where the `audit_entries.actor_specialist_id` / `decisions.decided_by` assertions attach.
- **Carry forward:** the criterion-2 gap above. If a later reviewer wants criterion 2 fully evidenced, add the `requireApiAuth` gate to 02-04's chain and tighten guard.spec's four adjusted assertions back to 401.

## Self-Check: PASSED

- Created files verified on disk: guard.spec.ts, actor.spec.ts, expiry.spec.ts all present.
- Commits verified in `git log`: `9e5c249`, `983f12b`, `0b83dda`.
- Plan-level gate: `npm run test` → exit 0 (unit 111 + db 114 + api 75 + arch 67 = 367). Typecheck clean. No skipped tests under `server/test/api`.
- `## Known Stubs` present; no blocking stubs.
- No production source file changed (test-only plan honored): `git diff --name-only` over this plan's commits shows only `server/test/**`.
- `min_lines` contracts met: guard 294 ≥ 140, actor 236 ≥ 130, expiry 303 ≥ 120.

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-14*
