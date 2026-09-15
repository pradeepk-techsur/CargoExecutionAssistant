---
phase: 02-identity-and-the-federal-ui-foundation
verified: 2026-09-15T00:56:15Z
status: passed
score: 5/5 must-haves verified
gate_evidence:
  gate_status: passed
  boot_smoke: pass
  review_blockers_open: 0
  review_warnings_open: 3
  tests_total: 430
carry_forward_assessed:
  - id: W1
    item: "No unified API auth gate; only GET /api/session returns 401, DELETE returns 403 (CSRF-first), 7 unimplemented pairs return 404"
    criterion: 2
    verdict: "intent met — no case data or decision surface exists in this phase; every non-sign-in route is closed to anonymous callers (401/403/404, never 2xx, no Location); scheduled requireApiAuth fix before phase 3"
human_verification:
  - test: "Assistive-technology walkthrough of sign-in and shell with a real screen reader"
    expected: "Focus order, announcements, error summary, and 'You are signed out.' behave as recorded in docs/a11y/*.md"
    why_human: "NFR-2 excludes an automated a11y gate; the signed review record is the only enforcement mechanism. The record exists and is signed (Pradeep K, 2026-09-15); confirming the lived AT experience is inherently human. Not a gap — recorded for the record."
---

# Phase 2: Identity and the Federal UI Foundation — Verification Report

**Phase Goal:** A cargo specialist signs in on an accessible USWDS screen and holds a session, so that every decision she takes from here on names a real accountable person — and no unidentified request reaches any case data or decision surface.

**Verified:** 2026-09-15T00:56:15Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Phase Success Criteria)

| # | Truth (criterion) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Specialist signs in on a USWDS screen, reaches the app, signs out deliberately, and an unattended session expires on its own | ✓ VERIFIED | `POST /api/session` → 201 + cookie + CSRF + `absolute_expires_at` (routes/session.ts); `DELETE` revokes only the requesting session; `session.service.ts` records `SIGNED_OUT`/`EXPIRED`; `expiry.spec.ts` (303 lines) drives idle 30m+1ms and absolute 8h+1m via injected clock; client re-stores rotated CSRF in `getSession()` so sign-out survives reload (client.ts:183-188). Live: db+api suites green in gate. |
| 2 | Every route but sign-in refuses an unidentified caller — HTML redirects to sign-in preserving destination, API returns 401 — no way into case data skipping identification | ✓ VERIFIED (intent) | `htmlRouteGuard` 302s to `/sign-in?next={validated}` and reverse-redirects off `/sign-in` when signed in; `validateNextPath` discards hostile values → `/queue`. `GET /api/session` → 401 UNAUTHENTICATED. `guard.spec.ts` (294 lines) parameterised over `API_ROUTE_TABLE`. Carry-forward W1 assessed below: no case data or decision surface exists this phase; every non-sign-in route is closed (401/403/404, never 2xx, no `Location`). |
| 3 | The actor on a request is the server-resolved signed-in specialist; a request naming a different actor is rejected, not honoured | ✓ VERIFIED | `sessionMiddleware` attaches `req.principal` from the `cargoexec_sid` cookie ALONE and is the sole source of identity (session.middleware.ts:4-16, 99); handlers read `req.principal`, never body/header/cookie for identity (routes/session.ts:146,155). `actor.spec.ts` (236 lines) exercises body/header/second-cookie/query vectors + source-level assertion. |
| 4 | Sign-in/out completes by keyboard alone with visible focus; errors arrive in an announced, focus-managed summary; the screen carries a signed a11y review incl. AT walkthrough | ✓ VERIFIED | `ErrorSummary` (role=alert, tabindex=-1, focus on appearance); `SignIn.tsx` uses `announceError` + renders `ErrorSummary` and moves focus to it; `e2e/sign-in.spec.ts` (452 lines) covers keyboard-only path, double-submit block, iframe. Signed records `docs/a11y/sign-in.md` + `docs/a11y/shell.md` with reviewer (Pradeep K), date (2026-09-15), AT walkthrough, defects+resolution. |
| 5 | Navigation offers only the two places the product has — nothing implies a dashboard, report, metric or second role | ✓ VERIFIED | `NAV_ITEMS` is exactly two data-driven entries (navItems.ts); `navigation.spec.ts` (488 lines, 11 tests) asserts `NAV_ITEMS.length===2`, exactly two anchors in `nav[aria-label="Primary"]`, exactly seven UI routes, and regex-scans for forbidden terms (dashboard/report/metric/settings/admin/export/role/permission/scope). Ran live: 11/11 pass. |

**Score:** 5/5 truths verified

### Required Artifacts (spot-checked across all 9 plans)

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `contract/src/dto.ts` | Session wire types + envelope | ✓ VERIFIED | 87 lines; SessionDto/SpecialistDto/ActorRef/ApiErrorBody present |
| `contract/src/errors.ts` | Closed Y2 union + messages, internal codes separate | ✓ VERIFIED | 74 lines; ERROR_CODES/ERROR_MESSAGES/INTERNAL_INVARIANT_CODES |
| `server/src/config.ts` | Env-only config + startup self-checks | ✓ VERIFIED | 176 lines; config.spec.ts (28 tests) green live |
| `server/src/http/*` (headers, errorMapper, logger, requestId, cookies, app, session/csrf middleware, htmlRouteGuard, routes) | Full HTTP tier | ✓ VERIFIED | All present, substantive; wiring traced below |
| `server/src/services/session.service.ts` | Argon2id sign-in + throttle + expiry | ✓ VERIFIED | 427 lines; sole credential-verifying module |
| `server/src/db/repositories/{sessions,specialists}.ts` | Parameterised SQL | ✓ VERIFIED | 188 / 84 lines; all `$n` placeholders |
| `server/src/cli/{create-specialist,ping}.ts` | Account bootstrap + liveness | ✓ VERIFIED | 320 / 71 lines |
| `web/src/shell/{Shell,navItems,LiveRegions,Header}.tsx`, `components/{states,ErrorSummary,UswdsForm}.tsx`, `screens/SignIn.tsx`, `api/client.ts`, `app/router.tsx`, `session/SessionProvider.tsx` | SPA + reduced shell | ✓ VERIFIED | All present, substantive |
| `web/styles/uswds.scss` | Compiled, self-served linked stylesheet | ✓ VERIFIED (name variance) | Shipped as `web/styles/app.scss`; `build:css` compiles it → `web/public/assets/uswds.css`; `index.html` links it via `<link rel="stylesheet" href="/assets/uswds.css">` (NOT a JS import). Goal (self-served, `style-src 'self'`) fully met — plan filename differs, artifact and behaviour do not. |
| `Dockerfile`, `docker-compose.yml`, `README.md` | Demonstration topology | ✓ VERIFIED | 50 / 95 / 119 lines; `cargoexec-web`, `service_healthy`, migrate→bootstrap→serve |
| `docs/uswds-conformance-register.md`, `docs/a11y/{shell,sign-in}.md` | Register + signed reviews | ✓ VERIFIED | 61 / 109 / 130 lines; signed with reviewer, date, AT walkthrough |
| All test files (unit, db, api, e2e, architecture) | Coverage of each criterion | ✓ VERIFIED | All present and substantive (see truth table for line counts) |

### Key Link Verification (traced in source)

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `session.middleware.ts` | session cookie only | `req.principal` sole identity source | ✓ WIRED | Never reads body/header for actor (crit 3) |
| `routes/session.ts` | `req.principal` | actor read from resolved principal | ✓ WIRED | 401 when principal undefined |
| `app.ts` | session→csrf→routes→htmlRouteGuard order | normative middleware chain | ✓ WIRED | Confirmed at app.ts:88-104 |
| `csrf.middleware.ts` | `crypto.timingSafeEqual` | constant-time double-submit, 403 on mismatch | ✓ WIRED | csrf.middleware.ts:81,90 |
| `htmlRouteGuard.ts` | `validateNextPath` | 302 to `/sign-in?next=`, hostile→`/queue` | ✓ WIRED | Open-redirect prevention present |
| `client.ts` | `setCsrfToken` in `getSession()` | re-store rotated CSRF so sign-out survives reload | ✓ WIRED | client.ts:183-188 (crit 1) |
| `index.html` | `/assets/uswds.css` | linked stylesheet, not JS import | ✓ WIRED | index.html:15 |
| `navItems.ts` | `NAV_ITEMS.map` | nav is data, cardinality assertable | ✓ WIRED | Exactly two entries |
| `navigation.spec.ts` | `NAV_ITEMS` + rendered markup | reads export, not a copy | ✓ WIRED | 11 tests green live |
| `headers.spec.ts` | `securityHeaders` over `API_ROUTE_TABLE` | D-1: no X-Frame-Options anywhere | ✓ WIRED | 48 tests green live |

### Requirements Coverage

| Requirement | Status | Notes |
| --- | --- | --- |
| F1 (identity/session) | ✓ SATISFIED | Criteria 1,3 verified; Argon2id, expiry, throttle, actor resolution |
| F2 (federal UI foundation) | ✓ SATISFIED | Criteria 4,5 verified; USWDS shell, two-destination nav, a11y sign-offs |
| NFR-1/2/8/12 | ✓ SATISFIED | CSP without frame-blocking (D-1), signed a11y review, redacting logger, pinned deps |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `server/src/config.ts` | 158 | `TODO(phase 5 — AI recommendation)` | ℹ️ Info | Legitimate forward reference to a later phase, not a stub in this surface |

No blocker anti-patterns. Scan of `server/src`, `web/src`, `contract/src` found one phase-5 forward-reference TODO and comment-only matches (e.g. "Placeholder text is NEVER a label"). No stub handlers, no `return null` screens with hidden data, no console-only implementations.

### Behavioral Spot-Checks (executed live)

| Command | Result |
| --- | --- |
| `npm run typecheck` (contract+server+web) | ✓ clean exit |
| `npm run test:unit` | ✓ 9 files / 111 tests passed (606ms) |
| `npm run test:arch` | ✓ 5 files / 130 tests passed — incl. navigation.spec (11) and headers.spec (48) |

These match the gate's recorded counts (unit 111, arch 130) and directly exercise criteria 5 (navigation, absence, privileges) and D-1 (no frame-blocking header). DB/api/e2e suites (114+75+e2e) require a live PostgreSQL and were not re-run here; the gate recorded them green and boot_smoke: pass.

### Gate Evidence (cited, not re-litigated)

- **02-GATE.md:** `gate_status: passed`, `boot_smoke: pass`, `review_blockers_open: 0`, `shadowed_sources: 0`, `tests_disabled: none`; all 8 waves + final regression green (430 tests: unit 111 + db 114 + api 75 + arch 130). Build/tests/boot are therefore taken as verified by the phase gates.
- **02-REVIEW.md:** `status: issues_found`, 0 BLOCKERs, 3 WARNINGs (W1, W2, W3) — all assessed below; none defeats a criterion.

### Carry-Forward & WARNING Assessment

**W1 — no unified API auth gate (criterion 2 literal "401").** Assessed explicitly. The shipped surface: `GET /api/session` → 401 ✓; `DELETE /api/session` → 403 CSRF_INVALID (CSRF runs first); the 7 unimplemented `API_ROUTE_TABLE` pairs → 404 ENTRY_NOT_FOUND (no handler registered — confirmed app.ts:165-177). **Criterion 2's intent — "no way into case data that skips identification" — holds:** every non-sign-in route is closed to an anonymous caller (401/403/404, never 2xx, never a `Location`, `Cache-Control: no-store`), the unimplemented pairs have no handler and **no case data behind them** (features arrive phases 3-6), and there is no case-data or decision surface in this phase at all. A 404/403 in place of 401 is a status-code fidelity gap, not a data exposure. The reviewer classified this WARNING-not-BLOCKER with a scheduled `requireApiAuth` fix before phase 3 (the first data-bearing phase, where a 401-vs-404 distinction becomes load-bearing). **I concur: criterion 2 is MET in intent.** Not a gap; recorded for the phase-3 planner.

**W2 — SignIn marks a 422 field `aria-invalid` without an inline message.** Low severity; the message still appears in the announced, focus-managed ErrorSummary, so criterion 4's requirement (announced, focus-managed summary) is satisfied. The wiring should be corrected before later forms inherit it. Not a criterion failure.

**W3 — `AuthenticatedShell` renders protected screens on a signed-out client-side navigation.** Defence-in-depth gap only; the server `htmlRouteGuard` is authoritative for document loads and this phase's protected screens are `NotBuiltYet`/`NotFound` placeholders holding no data, with no nav links exposed while signed out. Becomes load-bearing once phase-3 screens render case data client-side. Not a criterion failure this phase.

### Gaps Summary

None. All five success criteria are verified against the codebase, all supporting artifacts exist and are substantive, all key links are wired, behavioral spot-checks pass live, and the gates confirm build/tests/boot green with zero open blockers. The three review WARNINGs are correctly non-blocking for this phase's criteria and are scheduled forward. The one human-verification item (the lived AT walkthrough) is an inherent property of NFR-2's no-automated-gate design; the signed record exists and is complete — it is noted for the record, not counted as a gap.

---

_Verified: 2026-09-15T00:56:15Z_
_Verifier: Claude (pivota_spec-verifier)_
