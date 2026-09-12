## F1: Cargo Specialist Authentication & Session

**Priority:** P0 · **Surface:** Integrations / API + sign-in screen · **Dependencies:** F0 (schema), F2 (shell, for the sign-in screen) · **PRD trace:** §5.1 F1, §11.1 "Sign in | F1 + F2", NFR-8

**Description:** F1 provides credential-based sign-in, server-side session management, and explicit sign-out for the single authenticated role, `cargo specialist`. Its reason for existing is governance rather than perimeter security: the audit trail cannot attribute a decision to an actor unless the actor is identified, so every mutating request resolves to a concrete `specialists.id` that the audit writer (F13) consumes as `actor_specialist_id`. There is exactly one role — no supervisor, no auditor or read-only account, and no role-based access separation — so authorisation in CargoExec is binary: a request either carries a valid session or it does not. This feature also owns the sign-in screen, built on the F2 shell.

**Terminology (feature-specific):**
- **Session:** a server-side record in `sessions` identified by an opaque, high-entropy token whose hash is stored; the raw token exists only in the client cookie.
- **Absolute expiry:** the fixed lifetime from session creation (8 hours), after which the session is invalid regardless of activity.
- **Idle expiry:** the maximum gap between requests (30 minutes) before the session is invalid.
- **Request principal:** the `specialists` row resolved from the session cookie and attached to the request context; consumed by every mutating handler and by F13.
- **Binary authorisation:** authenticated ⇒ full product capability; unauthenticated ⇒ no capability except sign-in.

**Sub-features:**
- Credential sign-in establishing a server-side session
- Session validation middleware attaching the request principal
- Session expiry (absolute + idle) and explicit sign-out
- CSRF protection on state-changing requests
- Sign-in failure throttling
- Unauthenticated-access rejection for every route and endpoint except sign-in
- Sign-in screen (USWDS, accessible)

---

### Process — Sign-in

1. Specialist opens `/sign-in` (or is redirected there from a protected route, with the attempted path retained as the `next` parameter).
2. Specialist submits email and password.
3. Server looks up `specialists` by normalised email (lowercased, trimmed).
4. Server verifies the password against the stored Argon2id hash. Verification MUST run even when no specialist row was found, against a dummy hash, so response timing does not disclose account existence.
5. On failure: server increments the throttle counter and returns `401 AUTH_FAILED` with the single message "Email or password is incorrect." — identical for unknown email and wrong password.
6. On success: server checks `is_active`. If false, returns `403 ACCOUNT_INACTIVE`.
7. Server generates a 256-bit random token, stores its SHA-256 hash in `sessions` with `created_at`, `absolute_expires_at = created_at + 8h`, `last_seen_at = created_at`, and the user agent string.
8. Server issues the session cookie and a CSRF token, resets the throttle counter for that identifier, and updates `specialists.last_sign_in_at`.
9. Server returns `201` with the specialist's `id`, `display_name`, `email`, and the CSRF token.
10. Client navigates to `next` if it is a safe in-app path, otherwise to `/queue`.

### Process — Authenticated request

1. Middleware reads the session cookie; absent ⇒ unauthenticated outcome (see FR-1.7).
2. Middleware hashes the token and looks up the session; not found ⇒ unauthenticated outcome.
3. Middleware rejects the session if `revoked_at IS NOT NULL`, `now() > absolute_expires_at`, or `now() > last_seen_at + 30 minutes`. An expired session MUST be marked `revoked_at = now()` with `revocation_reason = 'EXPIRED'`.
4. Middleware loads the specialist; rejects if `is_active = false`.
5. For `POST`, `PUT`, `PATCH`, `DELETE`: middleware requires the `X-CSRF-Token` header to match the session's CSRF token; mismatch ⇒ `403 CSRF_INVALID`.
6. Middleware sets `last_seen_at = now()` (at most once per 60 seconds per session, to limit write amplification) and attaches the request principal.
7. Handler executes. Any audit entry it writes takes `actor_specialist_id` from the request principal.

### Process — Sign-out

1. Specialist activates "Sign out" in the F2 header.
2. Client sends `DELETE /api/session` with the CSRF header.
3. Server sets `revoked_at = now()`, `revocation_reason = 'SIGNED_OUT'`, clears the cookie, returns `204`.
4. Client discards in-memory state and navigates to `/sign-in` with a confirmation status message announced in the F2 live region.

---

### Functional Requirements

- **FR-1.1 — Single role.** Every authenticated user is a cargo specialist with identical capability. There MUST be no `role`, `is_supervisor`, `permissions`, or `scope` column, claim, or configuration value anywhere in the system (PRD §10 #3). No handler performs a role check.
- **FR-1.2 — Server-side sessions.** Session state MUST be server-side. The cookie MUST carry an opaque random token only — no identity claims, no signed payload, no JWT. Only the token's SHA-256 hash is persisted.
- **FR-1.3 — Cookie attributes.** The session cookie MUST be named `cargoexec_sid` and set `HttpOnly`, `Secure`, `Path=/`, and no `Domain`. It MUST be a session cookie with no `Max-Age`/`Expires`, so server-side expiry is the only authority on lifetime. `SameSite` is set by the configured cookie profile: **`governed` (the default) uses `SameSite=Lax`** and is the value to run in every deployment that can serve the application same-origin; a `demo-iframe` profile using `SameSite=None; Secure` is permitted **only** where a preview proxy embeds the application from a different origin, in which case a `Lax` cookie would never be sent and sign-in would be impossible (TechArch §0.4 D-2). The application MUST refuse to start if `demo-iframe` is combined with a non-TLS origin. CSRF protection does not depend on `SameSite` (FR-1.9), so neither profile weakens it.
- **FR-1.4 — Password storage.** Passwords MUST be hashed with Argon2id (memory ≥ 19 MiB, iterations ≥ 2, parallelism ≥ 1). Plaintext passwords MUST never be logged, included in an error response, or written to an audit entry (NFR-8).
- **FR-1.5 — Expiry.** Absolute expiry MUST be 8 hours from creation; idle expiry MUST be 30 minutes from `last_seen_at`. Neither is extendable beyond the absolute limit.
- **FR-1.6 — Identity available to the audit writer.** The request principal MUST be available to every handler and MUST be the sole source of `audit_entries.actor_specialist_id` for `SPECIALIST`-actor entries. A handler MUST NOT accept an actor identifier from the request body; if a body contains an actor field it is rejected as an unknown field (`422 REQUEST_MALFORMED`).
- **FR-1.7 — Unauthenticated access outcome.** Every route and endpoint except `POST /api/session`, `GET /sign-in`, and static assets requires a valid session. The outcome depends on request type:
  - **API request** (path starts `/api/`, or `Accept: application/json`): `401` with body `{"error":{"code":"UNAUTHENTICATED","message":"Sign in to continue."}}`, `WWW-Authenticate` omitted, no redirect.
  - **HTML document request** for a protected route: `302` to `/sign-in?next={percent-encoded original path}`.
  - **Already on `/sign-in` with a valid session:** `302` to `/queue`.
  The `next` value MUST be validated as a same-origin absolute path matching `^/[A-Za-z0-9/_\-]*$`; anything else is discarded and `/queue` is used (open-redirect prevention).
- **FR-1.8 — Session expiry during use.** When a session expires mid-session, the next API call returns `401 UNAUTHENTICATED`. The SPA MUST then discard state, navigate to `/sign-in?next={current path}`, and display the status message "Your session expired. Sign in again to continue." announced via the F2 live region. In-progress unsaved form input MUST NOT be silently submitted after re-authentication; the specialist re-enters it deliberately.
- **FR-1.9 — CSRF.** Every state-changing request MUST carry `X-CSRF-Token` matching the session's stored CSRF token (double-submit, compared with a constant-time comparison). The token is issued in the sign-in response and re-readable via `GET /api/session`. `GET` requests MUST NOT change state and are not CSRF-checked.
- **FR-1.10 — Sign-in throttling.** After 5 failed attempts for the same normalised email within a rolling 15-minute window, further attempts for that email return `429 TOO_MANY_ATTEMPTS` with `Retry-After`, for 15 minutes, without revealing whether the email exists. Throttle counters are held in the application's own store keyed by a hash of the email; they are **not** audit entries and **not** account state (there is no account-lockout flag, and no unlock surface, because there is no administrative role).
- **FR-1.11 — Concurrent sessions.** Multiple concurrent sessions for one specialist are permitted; sign-out revokes only the session that made the request. There is no session-management screen (it would be an administrative surface).
- **FR-1.12 — Session events are not case audit entries.** Sign-in, sign-out, and expiry MUST NOT write to `audit_entries`, which requires a `case_id` (F0 FR-0.6) and exists to record *case* state changes. Session history lives in the `sessions` table. This is a deliberate boundary, restated in F13 §Boundary; it is not an audit gap, because no case state changes at sign-in.
- **FR-1.13 — Account provisioning.** Specialist accounts are created by an operational CLI command run against the deployment (`create-specialist --email --display-name`, password set interactively). There is MUST be no self-registration, no password-reset endpoint, no invite flow, and no user-administration UI — all would be administrative surfaces outside v1 scope. This is stated so the absence is visible rather than accidental.
- **FR-1.14 — Secrets handling.** Session tokens, CSRF tokens, password hashes, and AI provider keys MUST never appear in logs, error responses, or audit entries (NFR-8). Log lines referencing a session MUST use the session's `id`, never its token.

---

### Sign-in Screen (User-Facing)

**Route:** `/sign-in` — the only unauthenticated screen. Built from the F2 shell in its reduced form: official-site banner, header without navigation links, `main` landmark, footer, and **no** sign-out affordance.

- **FR-1.15 — Form structure.** A single USWDS form with `<h1>` "Sign in to CargoExec", an email field (`type="email"`, `autocomplete="username"`), a password field (`type="password"`, `autocomplete="current-password"`), and one primary "Sign in" button. Both fields are programmatically required (`required` + visible "required" marking per F2). No "remember me", no third-party sign-in button, no registration or password-reset link (FR-1.13).
- **FR-1.16 — Client-side checks never substitute for the server.** The browser may flag an empty field, but the server decision is authoritative; the screen MUST handle a `401` for input the client considered valid.
- **FR-1.17 — Error presentation.** A failed sign-in renders a USWDS error summary at the top of `main` with `role="alert"`, receives focus, and states "Email or password is incorrect." The password field is cleared; the email value is retained. Field-level error styling MUST NOT indicate *which* field was wrong, because the server does not distinguish them.
- **FR-1.18 — Throttled presentation.** A `429` renders "Too many sign-in attempts. Try again in about 15 minutes." in the same error-summary pattern.
- **FR-1.19 — Pending state.** While the request is in flight the submit button is disabled with an accessible busy state (`aria-disabled="true"` plus visible "Signing in…" text), and the status is announced in the polite live region. Double submission MUST be prevented.
- **FR-1.20 — Keyboard and AT.** The whole screen is operable by keyboard alone (SM-11): tab order email → password → submit, `Enter` submits from either field, visible focus indicator throughout, labels programmatically associated, errors associated to the form via `aria-describedby` on the summary container.
- **FR-1.21 — Post-sign-in destination.** On success the specialist lands on `/queue` (or the validated `next` path). The header then exposes the specialist's display name and the sign-out control on every subsequent screen.

---

**Inputs:**
- `email` (string, required): trimmed and lowercased before lookup; max 254 chars; must contain exactly one `@` with a non-empty local part and a dot-containing domain.
- `password` (string, required): 12–256 characters; never trimmed; never logged.
- `X-CSRF-Token` (header, required on state-changing requests).
- `cargoexec_sid` (cookie, required on all authenticated requests).

**Outputs:**
- `201` sign-in response: `{ specialist: { id, email, display_name }, csrf_token, session: { absolute_expires_at } }` plus `Set-Cookie`.
- `200 GET /api/session`: the same body shape for the current session, used by the SPA on load to decide between the sign-in screen and the application shell.
- `204` sign-out response with a cookie-clearing `Set-Cookie`.
- A request principal attached to every authenticated request, consumed by F3, F7, F11, and F13.

**Validation:**
- Email MUST be present, ≤ 254 chars, and structurally a mail address; failure ⇒ `422 REQUEST_MALFORMED` (this is a request-shape error, distinct from wrong credentials).
- Password MUST be present and 12–256 chars; a present-but-short password MUST still return the generic `401 AUTH_FAILED` rather than a length error, so the response does not describe the stored credential policy of an existing account.
- Unknown body fields MUST be rejected (`422 REQUEST_MALFORMED`).
- `next` MUST match the same-origin path pattern or be discarded.

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| Wrong password or unknown email | 401 | `AUTH_FAILED` | "Email or password is incorrect." |
| Malformed request body | 422 | `REQUEST_MALFORMED` | "The request could not be read." |
| Account deactivated | 403 | `ACCOUNT_INACTIVE` | "This account is not active." |
| No/invalid/expired session on an API call | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| No session on an HTML route | 302 | — | Redirect to `/sign-in?next=…` |
| Missing or mismatched CSRF token | 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." |
| Throttled | 429 | `TOO_MANY_ATTEMPTS` | "Too many sign-in attempts. Try again in about 15 minutes." |

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/session` | none | Sign in; create session |
| `GET` | `/api/session` | session | Current principal + CSRF token |
| `DELETE` | `/api/session` | session + CSRF | Sign out; revoke session |

Full schemas in `Y1-api.md` §1 Session.

**Schema Surface (this feature):** `specialists` (id, email, display_name, password_hash, is_active, created_at, last_sign_in_at), `sessions` (id, specialist_id, token_hash, csrf_token_hash, created_at, absolute_expires_at, last_seen_at, revoked_at, revocation_reason, user_agent). No role or permission table. See `Y0-schema.md` §1 Identity.

**Acceptance Criteria:**
1. `GET /api/exceptions` without a cookie returns `401 UNAUTHENTICATED` and no data.
2. A browser navigation to `/queue` without a session redirects to `/sign-in?next=%2Fqueue`.
3. Sign-in with an unknown email and sign-in with a wrong password return byte-identical response bodies and status codes.
4. A `POST /api/exceptions/{id}/decision` without `X-CSRF-Token` returns `403 CSRF_INVALID` and writes no audit entry.
5. A session used 31 minutes after its last request returns `401`, and its `sessions.revoked_at` is set with reason `EXPIRED`.
6. After sign-out, replaying the old cookie returns `401`.
7. An audit entry written during a request carries the signed-in specialist's `id`; no code path allows the actor to be supplied by the client.
8. Sign-in completes using the keyboard only, with the error summary receiving focus on failure.

---
