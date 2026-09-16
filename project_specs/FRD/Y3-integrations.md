## Y3: Integration Points

CargoExec v1 has exactly **two** external dependencies: a hosted large-language-model API and the browser. Everything else is internal. In particular there is **no** integration with ACE, ATS, or any other CBP system; no file or API ingestion boundary; no export destination; no identity provider federation; no email, notification, or messaging service; no analytics, telemetry, or monitoring SaaS; and no model training pipeline (PRD §10 #1, #5, #6, #11).

---

### 1. Hosted LLM provider (F9)

| Property | Value |
|---|---|
| Purpose | Generate a recommended resolution action and a plain-language rationale for one exception |
| Direction | Outbound only, request/response; the provider never calls CargoExec |
| Interface | Internal `RecommendationProvider` abstraction: `generate(request) → RecommendationDraft` |
| Trigger | Post-commit dispatch after an exception is opened (F3 step 13); never scheduled, never user-triggered |
| Transport | HTTPS to the configured provider endpoint |
| Timeout | 20 s per attempt; one retry on timeout / 429 / 5xx / connection failure; 45 s total budget |
| Failure mode | Terminal `UNAVAILABLE` with an enumerated `failure_reason`; the case remains decidable |
| Authentication | API key from environment configuration; never in source control, logs, responses, or audit entries |

**Request payload sent to the provider** (F9 FR-9.16): the fourteen entry field values as submitted, the ordered validation findings (`rule_id`, `field_name`, `failure_code`, `message`), and the `rule_set_version`, rendered into the versioned prompt template.

**Never sent to the provider:** session tokens, CSRF tokens, passwords or password hashes, specialist names, specialist identifiers, email addresses, case references tied to an actor, audit entries, or any other specialist-identifying data. The model sees the cargo entry and why it failed validation — nothing about who typed it.

**Response contract:** validated against the F9 FR-9.7 output schema before any persistence. `field_name` values outside the fourteen-field set — including any classification, HTS, duty, tariff, penalty, or risk field — make the response schema-invalid and drive the case to `UNAVAILABLE` (F9 FR-9.8, PRD §10 #9).

**Boundary guarantees:**

- **FR-Y3.1** The provider client MUST be reachable only through the `RecommendationProvider` interface. No other module may import a provider SDK type, and no provider-specific type may appear in a function signature outside the adapter.
- **FR-Y3.2** The provider path MUST have no access to the decision service, and no AI principal exists in `specialists`, so provider output cannot become a decision (F9 FR-9.2, F11 §structural argument).
- **FR-Y3.3** Provider output MUST NOT be written to `cargo_entries`, `validation_findings`, `decisions`, or `decision_values` — only to `recommendations` / `recommendation_values` with `origin = 'AI'`.
- **FR-Y3.4** Provider substitution MUST require changing only the adapter and its configuration. A test double MUST be able to produce every outcome branch, including each of the seven `failure_reason` values, so degraded-mode behaviour is testable without network access.
- **FR-Y3.5** Provider errors MUST be logged with the API key and any credential material redacted, and MUST NOT be returned to the client verbatim (F9 FR-9.13, NFR-8).
- **FR-Y3.6** Provider latency MUST NOT affect any interactive response time (NFR-10); generation runs off the request path with bounded worker concurrency.
- **FR-Y3.7** No training, fine-tuning, embedding store, evaluation harness, or feedback-to-model loop exists. A specialist's edit or rejection is recorded in the audit trail and goes nowhere near the model (PRD §10 #11).

**Configuration** (environment only, never in source): provider endpoint URL, API key, `model_id`, `prompt_version`, per-attempt timeout, worker concurrency.

---

### 2. Browser / session integration (F1, F2)

| Property | Value |
|---|---|
| Client | Current versions of mainstream desktop browsers; responsive to tablet viewports (NFR-12) |
| Session transport | `cargoexec_sid` cookie — opaque token, `HttpOnly`, `Secure`, no `Max-Age`; `SameSite=Lax` under the default `governed` profile (F1 FR-1.3) |
| CSRF | `X-CSRF-Token` header, double-submit against the session's stored token, constant-time comparison |
| Assets | USWDS styles, fonts, and icon sprite bundled and served by the application — no runtime CDN dependency (F2 FR-2.3) |
| Assistive technology | Screen readers via standard semantic HTML and ARIA live regions; no AT-specific integration or vendor API |

- **FR-Y3.8** Authentication is local credential verification against `specialists`. There is **no** federation, SSO, SAML, OIDC, LDAP, PIV/CAC, or external identity provider in v1, and no hook prepared for one. The single role is a property of the application, not of an external directory (F1 FR-1.1).
- **FR-Y3.9** Responses MUST set security headers: `Strict-Transport-Security`, `Content-Security-Policy` (self-only script and style sources, no inline script), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, and `Cache-Control: no-store` on API responses (NFR-8).
- **FR-Y3.9a — No frame-blocking header.** `X-Frame-Options` MUST NOT be sent on any route, in any configuration, with any value. The application is demonstrated inside a sandbox preview **IFRAME**, and a browser walkthrough — not an API transcript — is the acceptance evidence for SM-1 and SM-2 (PRD R-7); the header has no allowlist form, so any value makes the running application unreachable in the one environment the walkthrough happens in. Frame policy MUST be expressed only through CSP `frame-ancestors`, which MUST either be omitted or set to an explicit allowlist of the preview origin, and MUST NOT be `'none'` or a bare `'self'`. Clickjacking is mitigated instead by CSRF double-submit on every state-changing request (F1 FR-1.9), the absence of any state-changing `GET`, and the fact that the only mutating action is a deliberate multi-field form submission rather than a single click. (This requirement supersedes the earlier `X-Frame-Options: DENY` instruction; see TechArch §0.4 D-1.)
- **FR-Y3.10** No third-party script, font, analytics tag, session-replay tool, error-reporting SaaS, chat widget, or tracking pixel may be loaded by any screen. The demonstration must run correctly with no outbound network access other than the AI provider call.

---

### 3. Deployment-internal dependencies (not external integrations)

| Component | Relationship |
|---|---|
| PostgreSQL | The application's own database; two DB roles (`cargoexec_owner` for migrations, `cargoexec_app` for runtime) — see `Y0-schema.md` |
| Migration runner | Executes forward-only migrations as the owner role at deploy time |
| Specialist provisioning CLI | Operational command creating the initial account; no self-registration, no password reset, no user-administration UI (F1 FR-1.13) |
| Background worker | In-process, same deployment unit; runs AI generation only, and can write only `recommendations` / `recommendation_values` / audit entries |

- **FR-Y3.11** The background worker MUST be the only asynchronous actor in the system, and its capability MUST be limited to recommendation generation. It MUST NOT be given, now or later, the ability to resolve, reject, reassign, escalate, re-prioritise, close, re-validate, or delete anything (NFR-5, SM-4).
- **FR-Y3.12** The deployment MUST be a single web service plus a database, runnable locally for demonstration. No message broker, cache, object store, search index, or scheduler is introduced in v1.
- **FR-Y3.13** All secrets (database credentials, AI provider key, session signing material) MUST come from environment configuration, MUST be absent from source control, and MUST NOT appear in any log line, error response, or audit entry (NFR-8, R-12).

---

### 4. Integration surfaces deliberately absent

Each of the following has no adapter, no configuration key, no interface stub, no feature flag, and no placeholder module. Their absence is verified by SM-14 (zero shipped features falling within a §10 exclusion).

| Absent surface | Authority |
|---|---|
| ACE / ATS interface, file ingestion, bulk upload, ingestion adapter | PRD §10 #6 |
| Audit or case export — file, report, feed, print package, oversight bundle | PRD §10 #5 |
| Supervisory dashboard, metrics sink, throughput or queue-health reporting | PRD §10 #2 |
| External identity provider, role directory, permission service | PRD §10 #3 |
| Accessibility CI service, axe-core runner, `.github/workflows` | PRD §10 #1 |
| Model training, fine-tuning, or feedback pipeline | PRD §10 #11 |
| Native mobile client or mobile push service | PRD §10 #10 |
| Duty/tariff calculation or classification ruling service | PRD §10 #9 |

---

*End of FRD-CargoExec. Source of truth: `.planning/PROJECT.md`; upstream: `project_specs/PRD-CargoExec.md`. Chunk sources: `project_specs/FRD/`.*
