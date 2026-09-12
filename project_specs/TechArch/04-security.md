## 4. Security Architecture

### 4.1 Threat model and posture

CargoExec's security requirements are driven by **accountability** before perimeter defence: the audit trail cannot attribute a decision unless the actor is identified, so authentication exists to make the record truthful. The realistic threats this architecture is built against, in priority order:

| # | Threat | Primary control |
|---|---|---|
| T-1 | History is revised after the fact (by app bug, ORM convenience, or direct SQL) | Append-only privileges + unconditional mutation trigger + hash chain (§2.9) |
| T-2 | A resolution is recorded without an accountable human | `decided_by` FK to `specialists` + HITL deferred trigger + worker role with no decision privilege (§2.8, §2.9.1) |
| T-3 | A value's origin is falsified or lost | `origin` `NOT NULL` with constant `CHECK`s; server-only origin computation; client-supplied `origin` rejected as unknown property |
| T-4 | Cross-site request forgery against the decision endpoint | Double-submit CSRF token compared in constant time, required on every state-changing request |
| T-5 | Session theft / fixation | Opaque 256-bit token, only its SHA-256 stored, `HttpOnly`, absolute + idle expiry, revocation on sign-out and expiry |
| T-6 | Credential enumeration or brute force | Identical `401` for unknown email and wrong password, dummy-hash verification for timing parity, per-email throttle |
| T-7 | Secret leakage into logs, responses, or the audit trail | Env-only secrets, pino redaction, audit writer denylist that *fails the transaction* rather than dropping silently |
| T-8 | Injection | Parameterised SQL only, no ORM, no string interpolation of client input, `zod` strict parsing at the boundary |
| T-9 | Sensitive data sent to the AI provider | Request payload constructed from entry values + findings only; no identity, token, or credential can be in the type |

Explicitly **not** in the threat model for v1: privilege escalation between application roles (there is one role), tenant isolation (single tenant), export-channel leakage (no export exists), and federation compromise (no IdP exists).

### 4.2 Authentication — one role, server-side sessions

There is exactly one authenticated role, `cargo specialist`. Authorisation is **binary**: a request either carries a valid session or it does not. No `role`, `is_supervisor`, `permissions`, or `scope` column, claim, or configuration value exists anywhere in the system, and no handler performs a role check (F1 FR-1.1). Anything that looks like an authorisation decision in this architecture is really an *authentication* decision.

| Element | Design |
|---|---|
| Credential store | `specialists.password_hash`, Argon2id (memory ≥ 19 MiB, iterations ≥ 2, parallelism ≥ 1) via the native `argon2` binding |
| Sign-in | Email normalised (trim + lowercase); Argon2id verify runs **even when no row was found**, against a fixed dummy hash, so timing does not disclose account existence; identical `401 AUTH_FAILED` body for unknown email and wrong password |
| Session token | 256-bit CSPRNG value; the raw token exists **only** in the client cookie; `sessions.token_hash` stores its SHA-256. No JWT, no signed payload, no identity claim in the cookie |
| Absolute expiry | 8 hours from creation, not extendable |
| Idle expiry | 30 minutes from `last_seen_at`; `last_seen_at` is refreshed at most once per 60 s per session to bound write amplification |
| Expiry bookkeeping | An expired session is marked `revoked_at = now()`, `revocation_reason = 'EXPIRED'` at the moment it is rejected, so the `sessions` table records what happened |
| Sign-out | `DELETE /api/session` sets `revoked_at`/`SIGNED_OUT`, clears the cookie, returns `204`. Revokes only the requesting session; concurrent sessions are permitted and there is no session-management screen (administrative surface) |
| Request principal | Resolved by middleware and attached to the request; it is the **sole** source of `audit_entries.actor_specialist_id` and `decisions.decided_by`. A body property naming an actor is rejected as unknown (`422`) |
| Throttle | 5 failed attempts per normalised email within a rolling 15-minute window ⇒ `429 TOO_MANY_ATTEMPTS` with `Retry-After` for 15 minutes, without revealing whether the email exists. Counters live in an in-process TTL map keyed by a hash of the email — **not** a table, **not** account state: there is no lockout flag and no unlock surface, because there is no administrative role |
| Provisioning | `create-specialist --email --display-name` CLI, password entered interactively. No self-registration, no password reset, no invite flow, no user-administration UI — each absent because each is an administrative surface (F1 FR-1.13) |
| Federation | None. No SSO, SAML, OIDC, LDAP, or PIV/CAC, and no hook prepared for one (FR-Y3.8) |

**Unauthenticated request behaviour** — differentiated by request type, so both the API and the browser behave correctly (F1 FR-1.7):

| Request | Response |
|---|---|
| Path starts `/api/` or `Accept: application/json` | `401` `{"error":{"code":"UNAUTHENTICATED","message":"Sign in to continue."}}`, no `WWW-Authenticate`, no redirect, no data |
| HTML document request to a session route | `302 /sign-in?next={percent-encoded path}` |
| HTML request to `/sign-in` **with** a valid session | `302 /queue` |
| Any request to `POST /api/session`, `GET /sign-in`, or a static asset | Allowed unauthenticated |

`next` must match `^/[A-Za-z0-9/_\-]*$` (same-origin absolute path); anything else is discarded and `/queue` is used — open-redirect prevention. On mid-session expiry the SPA receives `401`, discards in-memory state, navigates to `/sign-in?next={current path}`, and announces "Your session expired. Sign in again to continue." In-progress form input is never silently resubmitted after re-authentication; the specialist re-enters it deliberately, because a silently replayed decision would be an unaccountable one.

### 4.3 Cookie profiles (deviation D-2)

```
Set-Cookie: cargoexec_sid=<opaque 256-bit token>; HttpOnly; Path=/;
            SameSite=<profile>; [Secure]
```

Fixed attributes in every profile: name `cargoexec_sid`, `HttpOnly`, `Path=/`, **no** `Domain`, and **no** `Max-Age`/`Expires` — it is a session cookie, so server-side expiry is the only authority on lifetime (F1 FR-1.3).

| Profile | `SameSite` | `Secure` | When to use | Trade-off |
|---|---|---|---|---|
| `governed` **(default)** | `Lax` | yes | Any TLS deployment, and any preview proxy that serves the app **same-origin under a path** | Exactly the FRD value; no deviation in effect |
| `demo-iframe` | `None` | yes | Only when the preview proxy embeds the app from a **different origin**, where a `Lax` cookie would not be sent at all and sign-in would be impossible | Relies on CSRF double-submit (which does not depend on `SameSite`) for cross-site request protection; documented as demonstration-only |

The profile is selected by `SESSION_COOKIE_PROFILE`; the application refuses to start if `demo-iframe` is combined with a non-TLS origin, because `SameSite=None` requires `Secure` and a silently dropped cookie is worse than a startup failure. **Recommendation: configure the preview proxy to serve the application same-origin under a path and keep the `governed` profile**, so the deviation stays documented-but-unused.

### 4.4 CSRF

- Every state-changing request (`POST /api/session` excepted, as it creates the session; `POST /api/entries`, `POST /api/exceptions/{id}/decision`, `DELETE /api/session` required) must carry `X-CSRF-Token`.
- Double-submit: the token is issued in the sign-in response and re-readable from `GET /api/session`; the server compares its SHA-256 against `sessions.csrf_token_hash` with a **constant-time** comparison.
- Mismatch or absence ⇒ `403 CSRF_INVALID`, and **no audit entry is written** — the request never reaches a service.
- `GET` requests are never CSRF-checked and never change state. This is an invariant, not a convention: there is no `GET` endpoint that writes, and the four read endpoints call read-only services on read-only queries.
- CSRF protection is independent of the cookie's `SameSite` value, which is what makes deviation D-2 acceptable.

### 4.5 Response headers and iframe policy (deviation D-1)

The application is demonstrated inside a sandbox preview **IFRAME**. Therefore:

**Never sent, under any configuration:**
- `X-Frame-Options` (no `DENY`, no `SAMEORIGIN`) — the header has no allowlist form, so any value would break the demonstration.
- CSP `frame-ancestors 'none'` or a bare `frame-ancestors 'self'`.
- `Cross-Origin-Embedder-Policy` (would break framing and third-party-free asset loading for no benefit here).

**Sent on every response:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  frame-src 'none';
  [frame-ancestors <FRAME_ANCESTORS>;]      ← emitted ONLY when configured
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Strict-Transport-Security: max-age=31536000    ← only when the origin is HTTPS
```

`frame-ancestors` behaviour is explicit and safe-by-default-for-the-demo:

| `FRAME_ANCESTORS` value | Emitted directive | Effect |
|---|---|---|
| unset (default) | **directive omitted entirely** | The app is embeddable; no frame-blocking exists. This is the demonstration default. |
| `*` | `frame-ancestors *` | Equivalent to omitting; explicit for operators who prefer it stated |
| `https://preview.example.dev https://*.sandbox.example` | that allowlist | Scoped embedding — the recommended value once the preview origin is known |
| `'none'` or `'self'` | **rejected at startup** | A configuration self-check refuses to boot, because these values break the one environment the walkthrough happens in (D-1) |

No inline script is used anywhere, so `script-src 'self'` needs no `unsafe-inline` and no nonce machinery. `style-src 'self'` holds because USWDS Sass is compiled to a served stylesheet (§6.4). `connect-src 'self'` holds because the SPA only ever calls its own origin — the AI provider is called **server-side only**, never from the browser.

`Cache-Control: no-store` is set on every `/api` response. Static assets are content-hashed and cached normally; `index.html` is `no-store` so a stale shell never renders against a new API.

### 4.6 Input handling

| Layer | Control |
|---|---|
| Body size | 64 KB hard limit before parsing (`413 REQUEST_TOO_LARGE`) |
| Content type | `application/json` only on body-bearing endpoints (`415`); this is also the rejection path for any multipart, CSV, or upload attempt — no multipart parser is installed at all |
| Shape | `zod` schema per endpoint with `.strict()`: unknown property, wrong type, over-length string, over-scale decimal, duplicate field ⇒ `422 REQUEST_MALFORMED` with `details[]` naming each offender. Silent ignoring never occurs, because a silently dropped value would be absent from the audit record the specialist believes they created |
| Identifiers | Path parameters must be a uuid or `CE-YYYY-NNNNNN`; anything else ⇒ `400 INVALID_IDENTIFIER` before any query runs |
| Query strings | The whole API accepts zero query parameters; `GET /api/exceptions` rejects any with `400 UNSUPPORTED_QUERY_PARAMETER` |
| SQL | Hand-written parameterised statements only; no ORM, no query builder, no interpolation of client input. A lint rule forbids template literals in the `pg` `query()` text position |
| Output encoding | React escapes by default; no `dangerouslySetInnerHTML` anywhere (lint-enforced). Finding messages that interpolate a submitted `{value}` are truncated to 60 characters and escaped at render |
| Storage | Values are stored verbatim after trimming leading/trailing whitespace only — the record must show what the specialist typed, so no normalisation, case folding, or rounding happens on the write path |

### 4.7 Secrets and logging

| Secret | Source | Never appears in |
|---|---|---|
| Database credentials (`app`, `ai`, `owner`) | environment only | source control, logs, responses, audit entries |
| AI provider API key | environment only | source control, logs (redacted), responses, audit entries |
| Session tokens, CSRF tokens | generated at runtime, hashed at rest | logs (session referenced by `sessions.id` only), responses beyond the issuing one, audit entries |
| Password hashes / plaintext passwords | never logged, never returned, never audited | anywhere |

Mechanisms:

- **pino redaction** configured with a denylist of paths (`req.headers.cookie`, `req.headers['x-csrf-token']`, `req.headers.authorization`, `password`, `token`, `api_key`, `authorization`) plus a serialiser that drops request bodies for `POST /api/session` entirely.
- **Audit writer denylist** (F13 FR-13.12): `append` rejects a value row whose `field_name` is outside the entry field set / finding-scoped names, or whose value matches a secret shape (bearer token, `sk-` prefixed key, Argon2 hash prefix, long base64url). The attempt raises `AUDIT_WRITE_FORBIDDEN_CONTENT` and **fails the transaction** rather than silently dropping the value — a partially-recorded audit entry is worse than a failed write.
- **Provider error handling**: provider response bodies are never persisted on the recommendation row and never returned to the client; they are logged with credentials redacted and summarised into one of the seven enumerated `failure_reason` values.
- **`.env.example`** lists every key with no real value; `.env` is git-ignored; a startup self-check fails fast on a missing required key rather than starting in a degraded security posture.

### 4.8 Data protection at rest and in transit

| Concern | Design |
|---|---|
| In transit (browser ↔ app) | HTTPS with HSTS in any hosted deployment; plain HTTP permitted only for a local demonstration on `localhost`/sandbox, where the `governed` cookie profile drops `Secure` and the application logs a startup warning naming the reduced posture |
| In transit (app ↔ provider) | HTTPS only; the adapter refuses a non-`https:` provider endpoint at startup |
| In transit (app ↔ database) | TLS when the database is remote (`PGSSLMODE=require`); in-cluster/compose demonstration uses the container network |
| At rest | Passwords: Argon2id. Session and CSRF tokens: SHA-256 of a 256-bit random value. Case content is stored in plaintext by design — the audit trail must show actual values to answer "what did the human change" (R-12); it is protected by authentication and by having **no export surface** at all |
| Backup / retention | No purge, rollup, archive, or retention job exists; audit entries are permanent for the life of the deployment (F13 FR-13.14). Database backup is an operational concern of the hosting environment, not an application feature |

### 4.9 Security properties verified by test

| Property | Test |
|---|---|
| Every endpoint except `POST /api/session` rejects an unauthenticated call | Parameterised test over the ten-route table |
| Unknown email and wrong password produce byte-identical responses | Response body + status comparison |
| A decision without `X-CSRF-Token` returns `403` and writes **no** audit entry | API test + audit-count assertion |
| A session used 31 minutes after its last request returns `401` and is marked `EXPIRED` | Clock-controlled test |
| A replayed post-sign-out cookie returns `401` | API test |
| An audit entry's actor always equals the signed-in specialist; no code path accepts a client-supplied actor | API test + schema/grep test |
| No response header named `X-Frame-Options` is ever emitted, on any route, in any profile | Header test across all ten routes + the SPA document |
| `frame-ancestors 'none'` / `'self'` configuration refuses to start | Startup self-check test |
| No log line, response body, or audit entry contains the provider API key | Log-capture test with a sentinel key value |
| The audit writer rejects a secret-shaped value and aborts the transaction | Writer unit test |
| No `dangerouslySetInnerHTML`, no template-literal SQL, no ORM dependency | Lint + dependency allowlist test |

---
