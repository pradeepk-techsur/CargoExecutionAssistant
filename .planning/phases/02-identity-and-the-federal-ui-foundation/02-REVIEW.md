---
phase: 2
status: issues_found
blockers: 0
warnings: 3
files_reviewed: 26
files_reviewed_list:
  - server/src/http/app.ts
  - server/src/http/session.middleware.ts
  - server/src/http/csrf.middleware.ts
  - server/src/http/htmlRouteGuard.ts
  - server/src/http/routes/index.ts
  - server/src/http/routes/session.ts
  - server/src/http/errorMapper.ts
  - server/src/http/headers.ts
  - server/src/http/cookies.ts
  - server/src/http/requestId.ts
  - server/src/http/logger.ts
  - server/src/services/session.service.ts
  - server/src/db/repositories/sessions.ts
  - server/src/config.ts
  - server/src/index.ts
  - contract/src/dto.ts
  - contract/src/errors.ts
  - web/src/api/client.ts
  - web/src/session/SessionProvider.tsx
  - web/src/app/router.tsx
  - web/src/app/nextPath.ts
  - web/src/screens/SignIn.tsx
  - web/src/screens/NotBuiltYet.tsx
  - web/src/shell/Header.tsx
  - web/src/shell/Shell.tsx
  - web/src/shell/navItems.ts
reviewed_at: 2026-09-15T00:48:12Z
iteration: 1
---

# Phase 2 Code Review

Scope: the phase-2 diff from marker commit `3c01b9b` to `HEAD`, excluding `.planning`
and lockfiles. Cross-file seams (routes↔callers, contract↔consumers,
CSRF↔client) were traced explicitly. `npm run typecheck` (contract + server +
web) passes clean. Every finding below survived a self-refutation pass.

The headline carry-forward (no unified API auth gate) was assessed against
ROADMAP criterion 2 and is recorded as **W1** — with the reasoning for
WARNING-not-BLOCKER stated in full.

## BLOCKERs

None.

The one candidate that could have been a BLOCKER — the missing `requireApiAuth`
gate (W1) — does not open a security hole or expose case data on the shipped
surface, so it is a WARNING. See W1 for the refutation.

## WARNINGs

### W1: Criterion 2's literal "an API request returns 401" is only partially met — no unified API auth gate

- **File:** server/src/http/app.ts:87-104 (middleware chain); server/src/http/session.middleware.ts:14-20 (never rejects); server/src/http/routes/index.ts:6-13 (the comment claiming the matrix "can assert 401 across ALL ten" is inaccurate for the shipped chain)
- **Category:** security / integration
- **Evidence:** ROADMAP criterion 2 reads: *"…an API request returns `401` — so there is no way into case data that skips identification."* The shipped HTTP chain has no authentication gate between `sessionMiddleware` (which only attaches `req.principal` and deliberately never rejects — session.middleware.ts:15-20) and the routes. The 401 is emitted per-handler. So for an unauthenticated caller the actual surface is:
  - `GET /api/session` → **401 UNAUTHENTICATED** (session.ts:146-148) ✓
  - `DELETE /api/session` → **403 CSRF_INVALID** — `csrfMiddleware` runs first and `req.csrfTokenHash` is undefined without a session (csrf.middleware.ts:80-82)
  - the 7 unimplemented `API_ROUTE_TABLE` pairs → **404 ENTRY_NOT_FOUND** (app.ts:165-177, no handler registered)

  Only 1 of the 9 non-sign-in pairs answers the literal `401`.

  **Why this is a WARNING, not a BLOCKER (refutation):** the *intent* of criterion 2 — "no way into case data that skips identification" — holds. Every route is still closed to an anonymous caller (403/404, never 2xx, never a `Location`, body is the Y2 envelope only, `Cache-Control: no-store`; proven by guard.spec.ts item 4). The 7 unimplemented pairs have **no handler and no case data behind them** (features F3/F7/F9/F11/F13, phases 3–6), so a 404 exposes nothing. `DELETE /api/session` returning 403 instead of 401 for an anonymous caller is a status-code mismatch, not a data leak. There is no case-data endpoint in this phase that an unidentified caller can reach. The deviation was raised via a Rule-4 checkpoint and explicitly approved by the user (02-06-SUMMARY.md lines 77, 86-87, 116).
- **Fix direction:** As the owning-module (02-04) fix already identified in 02-06-SUMMARY.md line 116: add a small `requireApiAuth` middleware in `server/src/http/app.ts`, after `sessionMiddleware` and before `csrfMiddleware`, that rejects any `/api/*` request except `POST /api/session` lacking `req.principal` with `401 UNAUTHENTICATED`. Then tighten guard.spec's four adjusted assertions back to expecting 401, and correct the now-inaccurate claim in routes/index.ts:6-13. This is a status-code/contract-fidelity fix, safe to schedule before or alongside phase 3 (the first phase to add a case-data route, at which point a real 401-vs-404 gate becomes load-bearing rather than cosmetic).

### W2: SignIn marks a field `aria-invalid` on a 422 but renders no inline error message

- **File:** web/src/screens/SignIn.tsx:210-229 (Field usage); web/src/components/UswdsForm.tsx:82-86 (inline message only renders when `invalid && errorText !== undefined`)
- **Category:** bug
- **Evidence:** `viewForError` (SignIn.tsx:52-77) builds an `invalidFields` set for the `REQUEST_MALFORMED` (422) case and passes `invalid={failure?.invalidFields.has(EMAIL_ID)}` to `<Field>`, but never passes `errorText`. `Field` only renders the inline `usa-error-message` when BOTH `invalid` and `errorText` are set (UswdsForm.tsx:55, 82). So on a 422 the email/password control gets `aria-invalid="true"` and the error border, but the per-field message the server returned appears ONLY in the ErrorSummary, never inline beside the field. The `UswdsForm.tsx:82` inline-error path is documented as load-bearing for the inherited pattern (F6/F12 reuse it), yet the one screen that exercises it wires it half-way.
- **Fix direction:** Either pass the matching detail message as `errorText` to the invalid `<Field>`, or (matching Screen-00's intent that sign-in shows one generic summary item and marks no field) reconsider whether the 422 branch should set `aria-invalid` at all. Low severity for sign-in specifically — the 422 branch is reachable only via a malformed email and the summary still carries the message — but the pattern is inherited verbatim by later forms, so the wiring should be correct at its first use.

### W3: `AuthenticatedShell` renders protected screens for a signed-out client-side navigation; only full-document loads are guarded

- **File:** web/src/app/router.tsx:45-59
- **Category:** security (defence-in-depth, not a data exposure this phase)
- **Evidence:** `AuthenticatedShell` returns `null` only while `status === 'loading'`; once resolution finishes it renders the `Shell` for ANY status, including `'signed-out'` (router.tsx:47-58). The comment (router.tsx:41-43) states the server-side `htmlRouteGuard` is authoritative and this is "the client-side belt." That belt only catches a *full document request* — the server 302s a signed-out `GET /queue`. A purely client-side route change to a protected path while `status === 'signed-out'` (e.g. after a `signOut()` race, or a client navigation that does not hit the server) would render the protected screen shell. In this phase the protected screens are all `NotBuiltYet`/`NotFound` placeholders holding no data, and the header exposes no nav links while signed-out, so there is nothing to leak today — hence WARNING, not BLOCKER. But the guard becomes a real gap once phase 3–6 screens render case data client-side.
- **Fix direction:** In `AuthenticatedShell`, when `status === 'signed-out'`, redirect to `/sign-in?next=<path>` (a `<Navigate>`), rather than rendering the authenticated shell. This makes the client belt actually redundant with the server guard instead of relying on every protected screen being reachable only via a document load. Worth closing before the first data-bearing screen lands.

## Cross-file seams checked

- `API_ROUTE_TABLE` (routes/index.ts) ↔ `app.ts` (KNOWN_API_PATHS / IMPLEMENTED_BY_PATH), `csrf.middleware.ts` (IMPLEMENTED_STATE_CHANGING), `guard.spec.ts` — OK; single source of truth, `.implemented` filter consistent across all three consumers.
- CSRF rotate-on-GET contract: server `rotateCsrfToken` (session.service.ts:416) → `getSession` handler (session.ts:151) → client `api.getSession()` re-stores `csrf_token` (client.ts:183-190) → `SessionProvider` mount (SessionProvider.tsx:47) — OK; the load-bearing client half is present and the token lives in a module variable, never web storage.
- `SessionRequest` / `SessionDto` / `SpecialistDto` (contract/dto.ts) ↔ server response assembly (session.ts:77-87) ↔ client parse + SessionProvider/Header consumption — OK; shapes match, `absolute_expires_at` ISO string produced and typed.
- `ErrorCode` union + `ERROR_MESSAGES` (contract/errors.ts) ↔ `ApiError` default message (errorMapper.ts:43) ↔ client `ApiClientError.code` branching (client.ts) ↔ SignIn `viewForError` (SignIn.tsx) — OK; UI branches on codes, never message text; `UNAUTHENTICATED` message verbatim in both.
- `validateNextPath` server (htmlRouteGuard.ts:39) vs client (nextPath.ts:20) — OK; byte-for-byte identical regex + `%`-reject rule; client is not the weaker of the two.
- `req.principal` / `req.sessionId` / `req.csrfTokenHash` augmentation (requestId.ts:21-42) ↔ writers (session.middleware.ts:99-101) ↔ readers (session.ts, csrf.middleware.ts) — OK; typed optional, all reads guard for undefined.
- `api.setCsrfToken` object method (client.ts:209-211) delegating to the module-level `setCsrfToken` (client.ts:215) — OK; NOT infinite recursion (the identifier resolves to the module function, not `this.setCsrfToken`).
- `NotBuiltYet` "other destination" logic (NotBuiltYet.tsx:30) ↔ `NAV_ITEMS` labels (navItems.ts:17-18) vs titles passed in router.tsx:73,76 — OK; "Review queue"/"New cargo entry" match exactly, so the cross-link never self-links; `title="Case"` falls back to `NAV_ITEMS[0]` sensibly.
- SQL in sessions repository (repositories/sessions.ts) — OK; every value is a `$n` placeholder, `revokeSession` guarded by `revoked_at IS NULL` (idempotent), no interpolation.
- Timing-equalisation seam: `signIn` verifies against `dummyHash` on the unknown-email branch and checks activity AFTER password (session.service.ts:238-272) — OK; unknown-email and wrong-password return identical `AUTH_FAILED`, no account-existence oracle.
- Body-error mapping (app.ts:131-146) ↔ Y2 codes (contract/errors.ts) — OK; 413→REQUEST_TOO_LARGE, 415→UNSUPPORTED_MEDIA_TYPE, parse→422 REQUEST_MALFORMED.
- Known-stub verification: 02-06-SUMMARY "Known Stubs" declares the criterion-2 gap as the sole carry-forward and claims "no blocking stubs." Verified — the stub is genuinely non-data-exposing this phase (W1), so it is correctly non-blocking; escalated to a WARNING with a scheduled fix rather than silently accepted.
