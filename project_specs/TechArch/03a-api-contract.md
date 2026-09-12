## 3. API Design

### 3.1 Endpoint inventory — exactly ten, no query parameters

The inventory below is the FRD `Y1-api` list carried forward unchanged (clarification **C-4**: ten method/path pairs). The router registers routes from a single exported array, and an architecture test asserts that array equals this table — adding an endpoint requires editing both the test and this document, which is the intended friction.

| # | Method | Path | Feature | Auth | CSRF | Body | Query params |
|---|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/session` | F1 | none | no | yes | none |
| 2 | `GET` | `/api/session` | F1 | session | no | no | none |
| 3 | `DELETE` | `/api/session` | F1 | session | **yes** | no | none |
| 4 | `POST` | `/api/entries` | F3 | session | **yes** | yes | none |
| 5 | `GET` | `/api/entries/{entryId}` | F3 | session | no | no | none |
| 6 | `GET` | `/api/exceptions` | F7 | session | no | no | **none — rejects any** |
| 7 | `GET` | `/api/exceptions/{idOrReference}` | F7 | session | no | no | none |
| 8 | `GET` | `/api/exceptions/{exceptionId}/recommendation` | F9 | session | no | no | none |
| 9 | `POST` | `/api/exceptions/{exceptionId}/decision` | F11 | session | **yes** | yes | none |
| 10 | `GET` | `/api/exceptions/{exceptionId}/audit` | F13 | session | no | no | none |

**Anything not on this list does not exist**: no export, import, batch, admin, search, metrics, count, user-management, role-management, regenerate, apply, reopen, amend, undo, entry-mutation, entry-listing, or audit-mutation endpoint. Any other method on a listed path returns `405 METHOD_NOT_ALLOWED`. The whole API accepts **zero** query parameters (FR-Y1.2); `GET /api/exceptions` rejects any query string at all with `400 UNSUPPORTED_QUERY_PARAMETER`, which is the endpoint that would otherwise grow filtering, sorting, assignment, and pagination.

### 3.2 Conventions

| Concern | Rule |
|---|---|
| Transport | JSON over HTTPS under `/api`; `application/json; charset=utf-8` both ways. Any other content type on a body-bearing endpoint ⇒ `415 UNSUPPORTED_MEDIA_TYPE` (this is also what rejects a multipart or CSV upload attempt — PRD §10 #6). |
| Unknown properties | Rejected, never ignored: every body is parsed by a `zod` schema with `.strict()`, so an unknown property ⇒ `422 REQUEST_MALFORMED` with `details[]` naming it. This is the mechanism that blocks a client-supplied `origin`, `decided_by`, or `applied`. |
| Error envelope | `{"error":{"code","message","details"?,"request_id"}}` on every non-2xx. `details` is omitted when empty. |
| Identifiers | `{exceptionId}` / `{idOrReference}` accept a uuid **or** a case reference `CE-YYYY-NNNNNN`; anything else ⇒ `400 INVALID_IDENTIFIER`. |
| Timestamps | RFC 3339 UTC with offset, e.g. `2026-09-11T14:32:07.512Z`. Server-authoritative; never accepted from a client. |
| Caching | `Cache-Control: no-store` on every API response. |
| Correlation | `X-Request-Id` on every response; the same value appears in the error envelope, in server logs, and on any audit entry written during the request (FR-Y1.4). |
| Body size | 64 KB limit; larger ⇒ `413 REQUEST_TOO_LARGE`. The cap bounds one typed entry; it does not enable batching. |
| Rate limiting | `POST /api/session` only (5 failures / 15 min per normalised email). No other endpoint is throttled (FR-Y1.5). |
| SQL | Every statement is parameterised; no endpoint interpolates client input into SQL (FR-Y1.6). |

### 3.3 Session endpoints (F1)

**`POST /api/session`** — sign in. No auth, no CSRF.

```
Request   { email, password }
201       { specialist: {id, email, display_name},
            csrf_token, session: {absolute_expires_at} }
          Set-Cookie: cargoexec_sid=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/
Errors    401 AUTH_FAILED        (unknown email and wrong password are
                                  byte-identical responses)
          403 ACCOUNT_INACTIVE
          422 REQUEST_MALFORMED  (request shape, not credentials)
          429 TOO_MANY_ATTEMPTS  (+ Retry-After)
```

Argon2id verification runs even when no specialist row was found, against a dummy hash, so response timing does not disclose account existence. A present-but-short password still returns the generic `401`, never a length error.

**`GET /api/session`** — current principal and CSRF token; `200` with the same body shape, `401 UNAUTHENTICATED` if absent/expired. The SPA calls this on load to choose between the sign-in screen and the application shell.

**`DELETE /api/session`** — sign out. Session + CSRF. `204`, cookie cleared, `revoked_at`/`SIGNED_OUT` recorded. Revokes only the session that made the request; there is no session-management screen (an administrative surface).

Sign-in, sign-out, and expiry write **no** audit entry — `audit_entries.case_id` is `NOT NULL` and no case state changes at authentication. Session history lives on `sessions` (F1 FR-1.12, F13 FR-13.17). This is a boundary, not a gap.

### 3.4 Entry endpoints (F3, F4)

**`POST /api/entries`** — receive one manually authored entry. Session + CSRF.

Every one of the fourteen fields is optional at the transport layer. This is central, not lax: an incomplete entry must be *receivable*, because an incomplete entry is exactly what the product exists to process. Completeness is judged by F4, whose verdict produces findings and an exception — never a transport error.

```
Request   { entry_number?, importer_of_record_id?, port_of_entry_code?,
            mode_of_transport?, carrier_code?, conveyance_name?,
            bill_of_lading_number?, air_waybill_number?,
            country_of_origin_code?, goods_description?,
            quantity?, quantity_uom?, declared_value_usd?, arrival_date? }

201       { entry: { id, case_reference, received_at,
                     created_by: {id, display_name},
                     values: {…14 fields, null where absent…},
                     field_origins: {<provided field>: "HUMAN", …} },
            case_reference,
            receipt_outcome: "EXCEPTION_OPENED" | "VALIDATED_CLEAN",
            validation: { outcome, rule_set_version, evaluated_at,
                          findings: [{rule_id, field_name, failure_code, message}] },
            exception: { id, state, receipt_position } | null,
            next: { case_url, queue_url } }

Errors    401 · 403 CSRF_INVALID · 409 ENTRY_NUMBER_DUPLICATE (details carry the
          existing case_reference) · 413 · 415 · 422 REQUEST_MALFORMED ·
          500 RECEIPT_FAILED ("Nothing was saved.")
```

A required-information failure is **not** an error: it is a `201` with `receipt_outcome: "EXCEPTION_OPENED"` and findings (F3 FR-3.10, FR-Y2.1). No `RIV-*` code ever appears as an HTTP error code.

Structural vs. content validation, precisely:

| Input | Outcome |
|---|---|
| Unknown property, array body, wrong JSON type, over-length string, over-scale decimal | `422 REQUEST_MALFORMED` — nothing persisted, no audit entry |
| Empty string / whitespace-only / absent | Treated identically as "not provided": stored `NULL`, **no** `cargo_entry_field_origins` row (F3 FR-3.8) |
| Syntactically invalid `arrival_date` (within length) | Stored `NULL`; reported by F4 as `RIV-131` — a mistyped date is a required-information finding, not a client error |
| `quantity = "0"`, negative, or implausible | Parses structurally; judged by `RIV-101`/`RIV-121` (clarification **C-3**) |
| Duplicate `entry_number` | `409 ENTRY_NUMBER_DUPLICATE`, nothing persisted — deliberately not a validation rule, because uniqueness depends on database state and would break determinism (F4 FR-4.4) |

**`GET /api/entries/{entryId}`** — `200` with the stored entry values, `case_reference`, `received_at`, submitting specialist, per-field `HUMAN` origins, the validation result with findings, the `receipt_outcome`, and the exception summary or `null`. The entry's "current state" is **derived** (`receipt_outcome` + exception state); there is no mutable status column to drift. Errors: `400 INVALID_IDENTIFIER` · `401` · `404 ENTRY_NOT_FOUND`.

There is no `GET /api/entries` collection endpoint and no `PUT`/`PATCH`/`DELETE` on an entry (F3 FR-3.6, FR-3.12).

### 3.5 Queue, case, recommendation, decision, audit

**`GET /api/exceptions`** — the queue. Zero query parameters.

```
200       { exceptions: [ { id, case_reference, receipt_position, received_at,
                            entry_number, finding_count, failure_summary } ],
            returned_count, truncated }
Errors    400 UNSUPPORTED_QUERY_PARAMETER · 401 · 405
```

Ordering is `receipt_position ASC`, always, served by the partial index. `returned_count` and `truncated` describe the response, not the workload: there is no total count, no state breakdown, no age, no priority, and no assignee in any row (FR-Y1.3). `truncated` exists only as a hard safety bound on response size and is `false` in all realistic demonstration volumes.

**`GET /api/exceptions/{idOrReference}`** — full case detail in one call: exception, entry with per-field origins, validation result with findings, recommendation with proposed values and its traceability metadata, decision with resolution values (closed cases), and `permitted_decisions`. `permitted_decisions` is computed server-side:

| Exception state | Recommendation status | `permitted_decisions` |
|---|---|---|
| `OPEN` | `AVAILABLE` | `["APPROVE","EDIT_APPROVE","REJECT"]` |
| `OPEN` | `PENDING` or `UNAVAILABLE` | `["EDIT_APPROVE","REJECT"]` — nothing to approve, but the case stays decidable (SM-13) |
| `RESOLVED` / `REJECTED` | any | `[]` |

The UI renders its controls from this array rather than deriving permission locally, so the server remains the single authority on what may be decided.

**`GET /api/exceptions/{exceptionId}/recommendation`** — polled by the case screen while `PENDING` (every 3 s, at most 60 s). Three response shapes, discriminated on `status`: `AVAILABLE` (action, rationale, proposed values, `model_id`, `prompt_version`, `generated_at`), `UNAVAILABLE` (`failure_reason`, `failed_at`), `PENDING` (`requested_at` only). There is no `POST`, `PUT`, regenerate, or apply operation on this resource — deliberately, because a silent regeneration would change what the case showed at decision time (F9 FR-9.14).

**`POST /api/exceptions/{exceptionId}/decision`** — the only mutating case endpoint, and the only writer of a resolution. Session + CSRF, optional `Idempotency-Key`.

```
APPROVE        { decision_type:"APPROVE", recommendation_id }
               no resolution_values (⇒ 422 RESOLUTION_VALUES_NOT_ALLOWED)
               reason optional
EDIT_APPROVE   { decision_type:"EDIT_APPROVE", recommendation_id?, reason,
                 resolution_values:[{field_name, value}, …] }
               reason ≥ 10 chars after trim; complete field set required
REJECT         { decision_type:"REJECT", reason }
               no resolution_values; reason ≥ 10 chars

201            { decision: { id, decision_type, decided_at,
                             decided_by:{id, display_name}, reason,
                             resolution_values:[{field_name, value, origin,
                               prior_value, prior_origin, changed_from_proposal}] },
                 exception: { id, state, closed_at },
                 audit_entry_id, idempotent_replay }
```

#### 3.5.1 Decision rules the endpoint enforces

| Rule | Behaviour |
|---|---|
| Explicit decision required | `decision_type` is required with no default, no inference, no "accept all", no empty-body semantics (F11 FR-11.2) |
| One decision per case, ever | `FOR UPDATE` lock + `UNIQUE (exception_id)`; second attempt ⇒ `409 EXCEPTION_ALREADY_DECIDED` naming the existing type, deciding specialist, and timestamp. No reopen, amend, undo, correct, or supersede operation exists (F11 FR-11.10) |
| Approve needs an available proposal | `APPROVE` on `PENDING`/`UNAVAILABLE` ⇒ `409 RECOMMENDATION_NOT_AVAILABLE` — an absent recommendation can never be "approved" |
| Stale-tab detection | Supplied `recommendation_id` must match the case's current one ⇒ else `409 RECOMMENDATION_MISMATCH` |
| Complete value set | For `EDIT_APPROVE` with a recommendation, `resolution_values` must be exactly the proposal's field set ⇒ else `422 RESOLUTION_VALUES_INCOMPLETE` (naming missing and unexpected fields). Completeness removes any ambiguity about whether an omitted field was unchanged or dropped, so provenance is never inferred (F11 FR-11.7) |
| Direct resolution | For `EDIT_APPROVE` with no available recommendation, at least one value, every `field_name` in the 14-field set, all origins `HUMAN` |
| Reason | Required and 10–2000 chars after trim for `EDIT_APPROVE`/`REJECT`; optional (stored if present) for `APPROVE`. Enforced independently at the API and by `decisions_reason_required_chk`, so an API bypass still cannot record a reasonless edit (R-8) |
| Actor | `decided_by` comes from the session principal only; a body naming an actor (`decided_by`, `actor`, `on_behalf_of`, `specialist_id`) is rejected as unknown. No impersonation or delegation mechanism exists — there is one role and no supervisor |
| No bulk | Exactly one decision for exactly one exception. No batch, multi-case, or "approve all" endpoint or parameter — bulk approval is precisely the rubber-stamping the human-in-the-loop requirement exists to prevent (F11 FR-11.20, R-1) |
| Untouched records | The handler never writes `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, or `validation_findings`. The entry of record and the exception's stated basis survive the decision unchanged (F11 FR-11.18, FR-11.19) |

#### 3.5.2 Idempotency

`Idempotency-Key` (≤ 128 chars) is persisted on `decisions.idempotency_key` with `UNIQUE (exception_id, idempotency_key)`. Replay with the same key and the same canonical body returns the original `201` with `idempotent_replay: true` and writes nothing — no second decision, no second audit entry. Same key with a different body ⇒ `409 IDEMPOTENCY_KEY_REUSED`. Requests without the header are processed normally, with the one-decision-per-case uniqueness as the backstop.

#### 3.5.3 Per-value provenance computation (normative, server-only)

For each supplied resolution value, the server compares the submitted value against the AI's proposed value for the same field using canonical comparison — trim leading/trailing whitespace, then byte-for-byte:

```
proposal exists and equal      → origin='AI',    changed_from_proposal=false
proposal exists and different  → origin='HUMAN', changed_from_proposal=true
no proposal for that field     → origin='HUMAN', changed_from_proposal=true
```

`prior_value` is the AI's proposed value where one exists, otherwise the entry's submitted value, otherwise `null`; `prior_origin` is `'AI'`, `'HUMAN'`, or `null` correspondingly. `origin` is **never** accepted from a client under any circumstance. `APPROVE` copies values from `recommendation_values` server-side and every resolution value retains `origin = 'AI'` — the human's contribution is the *decision*, recorded on `decisions.decided_by`, not an authorship claim over values they did not write. `REJECT` writes no `decision_values`; the audit entry records the declined proposals as `before_value` with `after_value = NULL`.

#### 3.5.4 Audit read

**`GET /api/exceptions/{exceptionId}/audit`** — one case's trail in ascending `case_sequence`, with per-entry value rows, actor display names, and the chain verification result:

```
200       { case_reference, entry_count, chain_verified,
            first_divergence_sequence,
            entries: [ { id, case_sequence, action_type, actor_type,
                         actor: {id, display_name} | null, model_id | null,
                         occurred_at, before_state, after_state, reason,
                         values: [ { field_name, before_value, before_origin,
                                     after_value, after_origin, changed } ] } ] }
```

Read-only, single-case, JSON only. There is no export representation, no `Accept` variant producing a file, no `?format=`, no multi-case query, and no download route (F13 FR-13.18, PRD §10 #5). For an `AVAILABLE`/`UNAVAILABLE` recommendation entry, `model_id` is joined from `recommendations`; the enumerated `failure_reason` is likewise joined for display (clarification **C-1**).

### 3.6 Audit action → payload mapping

The eight actions are the complete transition set. This is the writer's contract:

| Action | Actor | `before_state` → `after_state` | Value rows |
|---|---|---|---|
| `ENTRY_RECEIVED` | `SPECIALIST` | `null` → `RECEIVED` | one per provided field; `after_value` = submitted value, `after_origin='HUMAN'` |
| `VALIDATION_COMPLETED` | `SYSTEM` (records the requesting specialist) | `RECEIVED` → `VALIDATED_CLEAN` \| `EXCEPTION_OPENED` | one per finding; `field_name` = finding's primary field, `after_value` = failure code + message |
| `EXCEPTION_OPENED` | `SYSTEM` | `null` → `OPEN` | one per finding (the stated basis) |
| `RECOMMENDATION_GENERATED` | `AI` (`actor_specialist_id NULL`) | `PENDING` → `AVAILABLE` | one per proposed value; `before_value` = entry's value (`before_origin='HUMAN'` or `null`), `after_value` = proposal, `after_origin='AI'` |
| `RECOMMENDATION_UNAVAILABLE` | `AI` | `PENDING` → `UNAVAILABLE` | none (C-1) |
| `RECOMMENDATION_APPROVED` | `SPECIALIST` | `OPEN` → `RESOLVED` | one per resolution value; before = proposal (`AI`), after = recorded value (`AI`) |
| `RECOMMENDATION_EDITED_AND_APPROVED` | `SPECIALIST` | `OPEN` → `RESOLVED` | one per resolution value; `after_origin` = `HUMAN` for changed, `AI` for unchanged; `changed` set accordingly; `reason` verbatim on the entry |
| `RECOMMENDATION_REJECTED` | `SPECIALIST` | `OPEN` → `REJECTED` | one per declined proposal; before = proposal (`AI`), `after_value = NULL`; `reason` verbatim on the entry |

A ninth action may not be added without a corresponding transition, and a transition may not exist without an action. A test enumerates the eight and asserts 1:1 coverage (SM-6).

### 3.7 Error mapping

`errorMapper.ts` is the single translation point. Domain errors and PostgreSQL `SQLSTATE`s map to `Y2` codes; internal database invariant codes never reach a client verbatim.

| Source | Surfaces as |
|---|---|
| zod parse failure | `422 REQUEST_MALFORMED` + `details[]` (field, field-level code, message) |
| `23505` on `cargo_entries.entry_number` | `409 ENTRY_NUMBER_DUPLICATE` (with the existing `case_reference`) |
| `23505` on `decisions.exception_id` | `409 EXCEPTION_ALREADY_DECIDED` |
| `23505` on `decisions (exception_id, idempotency_key)` | `409 IDEMPOTENCY_KEY_REUSED` |
| `23514` `decisions_reason_required_chk` | `422 REASON_REQUIRED` (defence in depth; the API check fires first) |
| `23503` on `exceptions_basis_fk` | internal `EXCEPTION_WITHOUT_BASIS` → `500 RECEIPT_FAILED` |
| `P0001 HITL_VIOLATION` | internal → `500 DECISION_FAILED` (and a `logger.error` with the `request_id`) |
| `P0001 AUDIT_COUPLING_VIOLATION` / `AUDIT_CHAIN_BROKEN` / `AUDIT_IMMUTABLE` | internal → `500 RECEIPT_FAILED` \| `DECISION_FAILED` |
| `42501` (privilege denied on an audit table) | internal `AUDIT_IMMUTABLE` → `500` |
| `AUDIT_WRITE_INVALID` / `AUDIT_WRITE_FORBIDDEN_CONTENT` | internal → `500` |
| Session middleware, no principal | `401 UNAUTHENTICATED` (API) or `302 /sign-in?next=` (HTML) |
| CSRF mismatch | `403 CSRF_INVALID` |
| Unknown route under `/api` | `404` with envelope; unknown method on a known path ⇒ `405 METHOD_NOT_ALLOWED` |
| Any query string on `GET /api/exceptions` | `400 UNSUPPORTED_QUERY_PARAMETER` |

Principles the mapper enforces: a `4xx`/`5xx` from a mutating endpoint means **nothing was written**, and the message says so where a specialist might otherwise retry blindly; error codes are stable identifiers that clients branch on (never message text); and no message discloses account existence, stack traces, SQL, provider error text, configuration, or internal identifiers beyond the case reference (FR-Y2.2–FR-Y2.7).

---
