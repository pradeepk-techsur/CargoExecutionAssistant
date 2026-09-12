## Epic 1: Cargo Specialist Authentication & Session (F1)

Sign-in exists for a governance reason, not a perimeter reason: the audit trail cannot attribute
a decision to an actor unless that actor is identified. There is exactly one role.

### US-1.1: Sign in as a cargo specialist
**As a** cargo specialist, **I want to** sign in with my email and password on an accessible USWDS sign-in screen, **so that** the decisions I take afterwards are recorded against my identity.

**Acceptance Criteria:**
- [ ] Given the route `/sign-in`, when it renders, then it shows the official-site banner, a header without navigation or sign-out, one `<h1>` "Sign in to CargoExec", an email field (`type="email"`, `autocomplete="username"`), a password field (`type="password"`, `autocomplete="current-password"`), and exactly one primary "Sign in" button.
- [ ] Given correct credentials for an active account, when I submit, then the server creates a server-side session, returns `201` with my `id`, `display_name`, `email`, and a CSRF token, sets the `cargoexec_sid` cookie (`HttpOnly`, `Secure`, `Path=/`, no `Max-Age`, and `SameSite` per the configured cookie profile — `Lax` under the default `governed` profile, `None` only under the cross-origin `demo-iframe` profile, FRD F1 FR-1.3), and I land on `/queue` or the validated `next` path.
- [ ] Given an unknown email and, separately, a wrong password for a known email, when each is submitted, then both responses are byte-identical `401 AUTH_FAILED` with "Email or password is incorrect."; no field-level styling indicates which input was wrong.
- [ ] Given a failed sign-in, when the response renders, then a USWDS error summary appears at the top of `main` with `role="alert"` and `tabindex="-1"`, receives focus, states the generic message, clears the password field, and retains the email value.
- [ ] Given a deactivated account with correct credentials, when I submit, then the response is `403 ACCOUNT_INACTIVE` with "This account is not active." and no session is created.
- [ ] Given the screen and a keyboard only, when I tab, then order is email → password → submit, `Enter` submits from either field, focus is visibly indicated throughout, labels are programmatically associated, and the error summary is associated to the form via `aria-describedby`.
- [ ] Given a submission in flight, when I activate the button again, then the second activation is ignored — the button is `aria-disabled="true"` with visible "Signing in…" text and the status announced politely.
- [ ] Given the sign-in screen, when it is inspected, then it offers no "remember me", no third-party sign-in, no self-registration, no password-reset link, and no invite flow.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.2: Be kept out of the application until I am signed in
**As a** cargo specialist, **I want to** be sent to sign-in whenever I reach a protected screen without a session, **so that** no case data or decision surface is reachable by an unidentified user.

**Acceptance Criteria:**
- [ ] Given no session cookie, when `GET /api/exceptions` is called, then the response is `401` with body `{"error":{"code":"UNAUTHENTICATED","message":"Sign in to continue."}}`, no data, and no redirect.
- [ ] Given no session, when I navigate the browser to `/queue`, then I am redirected `302` to `/sign-in?next=%2Fqueue`.
- [ ] Given a `next` parameter that is not a same-origin absolute path matching `^/[A-Za-z0-9/_\-]*$`, when sign-in succeeds, then the value is discarded and I land on `/queue` (open-redirect prevention).
- [ ] Given a valid session, when I navigate to `/sign-in`, then I am redirected `302` to `/queue`.
- [ ] Given a state-changing request without a matching `X-CSRF-Token` header, when it is sent, then the response is `403 CSRF_INVALID`, no state changes, and no audit entry is written.
- [ ] Given the route table, when it is reviewed, then every route and endpoint except `POST /api/session`, `GET /sign-in`, and static assets requires a valid session, and authorisation is binary — no role, permission, scope, or RBAC check exists anywhere.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.3: Have my identity attached to everything I do
**As a** cargo specialist, **I want to** have my signed-in identity — and only my signed-in identity — recorded as the actor on every change I cause, **so that** the audit trail names a real accountable person and cannot be made to name someone else.

**Acceptance Criteria:**
- [ ] Given an authenticated request, when a handler writes an audit entry, then `audit_entries.actor_specialist_id` is taken from the request principal resolved from the session cookie.
- [ ] Given a request body containing `decided_by`, `actor`, `on_behalf_of`, or `specialist_id`, when it is submitted to any endpoint, then it is rejected as an unknown field with `422 REQUEST_MALFORMED` and nothing is written.
- [ ] Given a `SYSTEM`-actor derivation inside my request (validation completion, exception opening), when its audit entry is written, then `actor_type = 'SYSTEM'` and the entry still records me as the specialist whose submission caused it.
- [ ] Given an `AI`-actor entry, when it is written, then `actor_type = 'AI'` and `actor_specialist_id` is `NULL`, enforced by a `CHECK` on the actor pairing.
- [ ] Given the deployment, when accounts are provisioned, then they are created only by the operational CLI (`create-specialist --email --display-name`); there is no self-registration endpoint, no password-reset endpoint, and no user-administration screen.
- [ ] Given logs, error responses, and audit entries, when they are searched, then no plaintext password, password hash, session token, CSRF token, or AI provider key appears; log lines reference a session by its `id` only.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.4: Have my session end predictably and sign out deliberately
**As a** cargo specialist, **I want to** sign out explicitly and have an idle or overlong session expire on its own, **so that** my identity cannot be used at my unattended workstation and my in-progress typing is never submitted on my behalf.

**Acceptance Criteria:**
- [ ] Given a session created at *T*, when a request arrives after `T + 8 hours`, then it is rejected `401 UNAUTHENTICATED` regardless of activity, and `sessions.revoked_at` is set with `revocation_reason = 'EXPIRED'`.
- [ ] Given a session whose last request was 31 minutes ago, when the next request arrives, then it returns `401` and the session is marked revoked with reason `EXPIRED`.
- [ ] Given I activate "Sign out" in the header, when the client sends `DELETE /api/session` with the CSRF header, then the server sets `revoked_at` with reason `SIGNED_OUT`, clears the cookie, returns `204`, and I land on `/sign-in` with a confirmation announced in the polite live region.
- [ ] Given a signed-out session cookie, when it is replayed on any endpoint, then the response is `401`.
- [ ] Given a session that expires while I am filling in a form, when the next API call returns `401`, then the client discards state, navigates to `/sign-in?next={current path}`, and announces "Your session expired. Sign in again to continue." — and after re-authentication my unsaved input is **not** silently submitted.
- [ ] Given two browsers signed in as me, when I sign out of one, then only that session is revoked and the other remains valid; no session-management screen exists.
- [ ] Given sign-in, sign-out, and expiry events, when `audit_entries` is queried, then none of them wrote a case audit entry — session history lives on the `sessions` table, because no case state changed.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.5: Be protected from repeated guessing at my account
**As a** cargo specialist, **I want to** have repeated failed sign-in attempts against my email throttled, **so that** my identity — the thing every decision is attributed to — cannot be brute-forced.

**Acceptance Criteria:**
- [ ] Given 5 failed attempts for one normalised email within a rolling 15-minute window, when a sixth is submitted, then the response is `429 TOO_MANY_ATTEMPTS` with a `Retry-After` header, for 15 minutes.
- [ ] Given a throttled email that does not exist in `specialists`, when it is submitted, then the throttled response is identical to that for an existing email, disclosing nothing about account existence.
- [ ] Given a `429`, when the screen renders, then "Too many sign-in attempts. Try again in about 15 minutes." appears in the same focus-receiving error-summary pattern as a failed sign-in.
- [ ] Given a successful sign-in, when it completes, then the throttle counter for that identifier is reset and `specialists.last_sign_in_at` is updated.
- [ ] Given throttle state, when the schema is inspected, then it is held in the application's own store keyed by a hash of the email — there is no account-lockout flag, no unlock surface, and no administrative role to operate one.
- [ ] Given a sign-in attempt for an email with no matching row, when it is processed, then password verification still runs against a dummy hash so response timing does not disclose account existence.

**Priority:** P1 | **Feature Ref:** F1

---
