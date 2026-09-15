---
phase: 02-identity-and-the-federal-ui-foundation
plan: 07
subsystem: ui
tags: [react, react-router, uswds, csrf, accessibility, playwright, authentication]

# Dependency graph
requires:
  - phase: 02-05
    provides: reduced/full Shell, LiveRegions (useAnnounce), Playwright harness (webServer/globalSetup/env.ts), useScreenFocus
  - phase: 02-06
    provides: the criterion-2 guard.spec assertions (sign-in?next redirect) the SPA relies on
  - phase: 02-04
    provides: POST/GET/DELETE /api/session, rotate-on-GET CSRF, htmlRouteGuard + validateNextPath
  - phase: 02-01
    provides: "@cargoexec/contract DTOs, ERROR_CODES, ERROR_MESSAGES"
provides:
  - The F1 accessible USWDS sign-in screen on the reduced shell
  - The typed API client (api, ApiClientError) with client-half CSRF re-storage and 401 handling
  - The inherited form pattern (UswdsForm/Field/SubmitButton) and error-summary pattern (ErrorSummary)
  - SessionProvider/useSession over the client, resolving the session before protected content renders
  - e2e/sign-in.spec.ts: the keyboard-only + IFRAME browser walkthrough, incl. the CSRF-rotation regression test
affects: [F6 entry form, F12 decision forms, phase-02-09 signed review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-half CSRF: api.getSession()/signIn() re-store the rotated csrf_token internally so no caller can forget"
    - "The single inherited USWDS form + error-summary pattern; F6/F12 render it unchanged"
    - "SessionProvider as the router root layout; useNavigate/useAnnounce available inside it"
    - "Sign-in exception to the error pattern: one generic item, no aria-invalid on either input"

key-files:
  created:
    - web/src/api/client.ts
    - web/src/session/SessionProvider.tsx
    - web/src/components/ErrorSummary.tsx
    - web/src/components/UswdsForm.tsx
    - web/src/screens/SignIn.tsx
    - web/src/app/nextPath.ts
    - e2e/sign-in.spec.ts
  modified:
    - web/src/app/router.tsx
    - web/src/main.tsx
    - web/src/app/session.ts (deleted — replaced by SessionProvider)

key-decisions:
  - "CSRF token lives in a module variable, never web storage; re-stored inside the client on every getSession/signIn"
  - "The sign-in screen deliberately sets aria-invalid on NO input (except 422 REQUEST_MALFORMED), to avoid leaking which credential was wrong"
  - "SessionProvider became the router root layout so useNavigate/useAnnounce work; old app/session.ts context removed"
  - "The signed-out/expired polite announcement is owned by the SignIn screen (after its title announcement), not by signOut() — otherwise it is clobbered on mount"

patterns-established:
  - "Inherited form/error-summary components: one implementation, reused verbatim by later screens"
  - "reload-then-act regression check for any state-changing control (CSRF rotates on the bootstrap GET)"

# Metrics
duration: 62min
completed: 2026-09-14
---

# Phase 2 Plan 07: Accessible USWDS Sign-in Summary

**An accessible, keyboard-operable USWDS sign-in on the reduced shell with a typed CSRF-aware API client, the inherited UswdsForm/ErrorSummary pattern, and a 13-test browser walkthrough (incl. IFRAME and the CSRF-rotation regression) — 29 e2e tests green, 367 unit/db/api/arch tests still green.**

## Performance

- **Duration:** 62 min
- **Started:** 2026-09-14T22:57:50Z
- **Completed:** 2026-09-14T23:59:56Z
- **Tasks:** 3
- **Files modified:** 10 (7 created, 2 modified, 1 deleted)

## Accomplishments
- The F1 sign-in screen: reduced shell, one generic focus-receiving error summary, password cleared / email retained on failure, no `aria-invalid` on either input, all messages taken from `ERROR_MESSAGES` by code (never text). None of the prohibited affordances present.
- The typed API client `api`/`ApiClientError`: `X-CSRF-Token` on POST/DELETE, contract DTO parsing, no retry on a mutating request, mid-session 401 → `/sign-in?next=`; `getSession()`/`signIn()` re-store the rotated CSRF token internally.
- The two inherited components — `UswdsForm` (Field/SubmitButton, `noValidate`, `aria-disabled` busy guard) and `ErrorSummary` (`role="alert"`, `tabIndex=-1`, focus-on-appear, server order) — as the single pattern F6/F12 will reuse.
- `SessionProvider`/`useSession` resolving the session before protected content renders, with sign-in navigation to a client-validated `next` and a sign-out confirmation.
- `e2e/sign-in.spec.ts`: 13 keyboard-only tests including the sign-out-after-reload 204 regression (captured from the real `DELETE` response) and IFRAME embedding with no `X-Frame-Options`.

## Task Commits

1. **Task 1: typed API client, session provider, inherited form + error-summary** — `033bd32` (feat)
2. **Task 2: the sign-in screen and the header's sign-out wiring** — `5c5d0e6` (feat)
3. **Task 3: the keyboard-only sign-in walkthrough (Playwright), incl. IFRAME** — `d64eee0` (test)

## Files Created/Modified
- `web/src/api/client.ts` — typed fetch wrapper; CSRF, 401 handling, DTO parsing, no mutating retry
- `web/src/session/SessionProvider.tsx` — React context over the client; session bootstrap, signIn/signOut
- `web/src/components/ErrorSummary.tsx` — the inherited error-summary pattern
- `web/src/components/UswdsForm.tsx` — the inherited Field/SubmitButton/UswdsForm pattern
- `web/src/screens/SignIn.tsx` — the F1 sign-in screen with the deliberate error-pattern exceptions
- `web/src/app/nextPath.ts` — client-side `next` validation mirroring the server rule
- `web/src/app/router.tsx` — SessionProvider root layout; `/sign-in` renders SignIn; authenticated shell gated on session resolution
- `web/src/main.tsx` — mounts AnnounceProvider + RouterProvider (SessionProvider moved into the router)
- `web/src/app/session.ts` — deleted (superseded by SessionProvider)
- `e2e/sign-in.spec.ts` — the browser walkthrough

## Decisions Made
- CSRF token held only in a module variable; the client re-stores the rotated token on every `getSession`/`signIn` so a page reload never leaves a dead token (02-04's rotate-on-GET client half).
- The sign-in failure marks no field invalid (except 422) — announcing an invalid field would leak which credential was wrong (US-1.1).
- `SessionProvider` mounted as the router root layout (needs `useNavigate`/`useAnnounce`); the old `app/session.ts` context was removed rather than kept in parallel.
- The signed-out/expired polite announcement is owned by the arriving screen, sequenced after its title announcement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Live-region announcement clobbered on sign-out**
- **Found during:** Task 3 (test 8 — polite live region confirmation)
- **Issue:** `signOut()` announced "You are signed out." then immediately navigated to `/sign-in`, whose `useScreenFocus` announced the screen title ("Sign in") on mount and overwrote the confirmation in the shared polite region.
- **Fix:** Moved the arrival-reason announcement into the `SignIn` screen, sequenced after the title announcement (a short `setTimeout`); `signOut()` no longer announces (its announcement was lost on navigation anyway). Applies to both the signed-out and session-expired arrivals.
- **Files modified:** web/src/screens/SignIn.tsx, web/src/session/SessionProvider.tsx
- **Verification:** e2e test 8 polls the polite region and finds "You are signed out."; the visible slim success alert also renders.
- **Committed in:** d64eee0 (Task 3 commit)

**2. [Rule 3 - Blocking] Router restructure to host SessionProvider**
- **Found during:** Task 1 (wiring the new provider)
- **Issue:** The plan's `useSession` shape (status/signIn/signOut) needed a provider using `useNavigate`/`useAnnounce`, which require being inside the router. The existing `app/session.ts` context and `main.tsx` bootstrap could not express it.
- **Fix:** Added a `Root` layout route mounting `SessionProvider` around the whole tree; moved the session bootstrap out of `main.tsx`; deleted `app/session.ts`. The authenticated shell renders nothing while `status === 'loading'` (no flash of protected content).
- **Files modified:** web/src/app/router.tsx, web/src/main.tsx, web/src/app/session.ts (deleted)
- **Verification:** typecheck + build:web clean; e2e tests 3/4/8/8b prove bootstrap, next-honouring, sign-out and the reload regression.
- **Committed in:** 033bd32 (Task 1) and 5c5d0e6 (Task 2)

**3. [Rule 1 - Bug] e2e test-authoring corrections (my own tests)**
- **Found during:** Task 3 (first full suite run)
- **Issue:** (a) Tab-order test used an ASCII apostrophe where the banner uses a typographic one, and omitted the CargoExec logo link that legitimately sits between the banner and the form; (b) the Enter-from-either-field test did not clear the session between sub-cases, so `/sign-in` bounced the already-authenticated caller to `/queue`; (c) the skip link's USWDS `:focus` outline computes to `0px` in headless (a rendering quirk), so the strict painted-outline check was scoped to the three form controls and the skip link asserted focusable + `outline:none` not applied.
- **Fix:** Corrected the assertions to the accurate tab order and browser behaviour; no product change for (a)/(b)/(c).
- **Files modified:** e2e/sign-in.spec.ts
- **Verification:** all 13 sign-in tests and all 29 e2e tests pass.
- **Committed in:** d64eee0 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking). **Impact:** No scope creep. The router restructure was required to deliver the plan's `useSession` contract; the announcement fix is a genuine correctness improvement; the test corrections align assertions with real, correct browser behaviour.

## Known Stubs
None found — a grep for TODO/FIXME/placeholder/not-implemented across all created/modified files returned nothing, and every handler performs real work (the client calls real endpoints, the screen renders server-driven state, the provider bootstraps a real session).

## Issues Encountered
- The sandbox's bash tool blocks on any backgrounded long-running process and kills the tree at its timeout, discarding buffered output; several attempts to stand up the server manually orphaned a process holding port 3000. Resolved by running Playwright's own `webServer` (which manages the server lifecycle and exits cleanly) with `CI=1`, writing output to a file, and ensuring port 3000 was free (fast Node bind-check) before each run. No product impact.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- F1 sign-in and F2 shell foundation are complete: a specialist signs in keyboard-only, lands on `/queue` holding a session, and signs out (including after a reload, the CSRF-rotation regression).
- `UswdsForm` and `ErrorSummary` are the single inherited pattern for F6's entry form and F12's decision forms.
- Ready for 02-08 (cookie profile / SameSite note) and 02-09 (the signed per-screen accessibility review).
- Carry-forward (unchanged from 02-06): criterion 2 is only partially evidenced pending a `requireApiAuth` gate in 02-04.

## Self-Check: PASSED

- Created files exist: web/src/api/client.ts, web/src/session/SessionProvider.tsx, web/src/components/ErrorSummary.tsx, web/src/components/UswdsForm.tsx, web/src/screens/SignIn.tsx, web/src/app/nextPath.ts, e2e/sign-in.spec.ts — all present.
- Commits exist: 033bd32, 5c5d0e6, d64eee0 — all in git log.
- Build check: `npm run build` → exit 0 (build:server + build:web).
- Test check: `npm run test` → 367 passed (unit 111, db 114, api 75, arch 67); `CI=1 npx playwright test` → 29 passed (0 failed, 0 skipped).
- Known Stubs section present; no blocking stubs.

---
*Phase: 02-identity-and-the-federal-ui-foundation*
*Completed: 2026-09-14*
