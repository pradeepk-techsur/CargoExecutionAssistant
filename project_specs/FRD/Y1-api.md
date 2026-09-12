## Y1: API Endpoints (Authoritative Contract)

All endpoints are JSON over HTTPS under `/api`. This section is the authoritative request/response contract; per-feature "API Surface" sections summarise it.

### 0. Conventions

- **Authentication:** every endpoint except `POST /api/session` requires the `cargoexec_sid` session cookie. Unauthenticated ⇒ `401 UNAUTHENTICATED` (F1 FR-1.7).
- **CSRF:** every state-changing request (`POST`, `DELETE`) requires `X-CSRF-Token` matching the session token ⇒ else `403 CSRF_INVALID`.
- **Content type:** requests and responses are `application/json; charset=utf-8`. Any other request content type on a body-bearing endpoint ⇒ `415 UNSUPPORTED_MEDIA_TYPE`.
- **Unknown properties** in any request body ⇒ `422 REQUEST_MALFORMED`. Silent ignoring never occurs.
- **Error envelope** (every non-2xx): `{"error":{"code":"…","message":"…","details":[{"field":"…","code":"…","message":"…"}],"request_id":"…"}}`. `details` is omitted when empty.
- **Caching:** all responses carry `Cache-Control: no-store`.
- **Timestamps:** RFC 3339 UTC with offset, e.g. `2026-09-11T14:32:07.512Z`.
- **Identifiers:** `{exceptionId}` and `{idOrReference}` accept a uuid or a case reference `CE-YYYY-NNNNNN`.
- **Complete endpoint list — there are ten method/path pairs.** Anything not listed does not exist: no export, no import, no batch, no admin, no search, no metrics, no user management, no role management, no recommendation regeneration, no entry mutation, no audit mutation.

| # | Method | Path | Feature |
|---|---|---|---|
| 1 | `POST` | `/api/session` | F1 |
| 2 | `GET` | `/api/session` | F1 |
| 3 | `DELETE` | `/api/session` | F1 |
| 4 | `POST` | `/api/entries` | F3 |
| 5 | `GET` | `/api/entries/{entryId}` | F3 |
| 6 | `GET` | `/api/exceptions` | F7 |
| 7 | `GET` | `/api/exceptions/{idOrReference}` | F7 |
| 8 | `GET` | `/api/exceptions/{exceptionId}/recommendation` | F9 |
| 9 | `POST` | `/api/exceptions/{exceptionId}/decision` | F11 |
| 10 | `GET` | `/api/exceptions/{exceptionId}/audit` | F13 |

(Ten rows, ten endpoints — three session, two entry, three exception-read, one decision, one audit-read. Adding or removing one requires a change to this table. All other methods on these paths ⇒ `405 METHOD_NOT_ALLOWED`.)

---

### 1. Session (F1)

**`POST /api/session`** — sign in. No auth, no CSRF.

```jsonc
// request
{ "email": "specialist@cbp.example.gov", "password": "…" }
// 201
{ "specialist": { "id": "uuid", "email": "specialist@cbp.example.gov", "display_name": "A. Rivera" },
  "csrf_token": "…", "session": { "absolute_expires_at": "2026-09-11T22:32:07Z" } }
// Set-Cookie: cargoexec_sid=…; HttpOnly; Secure; SameSite=Lax; Path=/   ← `governed` profile (default); see F1 FR-1.3
```
Errors: `401 AUTH_FAILED` · `403 ACCOUNT_INACTIVE` · `422 REQUEST_MALFORMED` · `429 TOO_MANY_ATTEMPTS` (with `Retry-After`).

**`GET /api/session`** — current principal and CSRF token. `200` with the same body shape; `401 UNAUTHENTICATED` if absent/expired.

**`DELETE /api/session`** — sign out. `204`, cookie cleared. `401` if no session.

---

### 2. Entries (F3, F4)

**`POST /api/entries`** — receive one manually authored entry. Session + CSRF.

```jsonc
// request — every field optional; an incomplete entry is the primary demonstration path
{ "entry_number": "ABC12345678", "importer_of_record_id": "12-3456789",
  "port_of_entry_code": "2704", "mode_of_transport": "OCEAN", "carrier_code": "MAEU",
  "conveyance_name": "MV Northern Star / V.118", "bill_of_lading_number": "MAEU123456789",
  "air_waybill_number": null, "country_of_origin_code": "CN",
  "goods_description": "Stainless steel fasteners, M8 hex bolts",
  "quantity": "1200.000", "quantity_uom": "PCS", "declared_value_usd": "8450.00",
  "arrival_date": "2026-09-20" }
```

```jsonc
// 201 — exception opened
{ "entry": { "id": "uuid", "case_reference": "CE-2026-000137", "received_at": "…",
             "created_by": { "id": "uuid", "display_name": "A. Rivera" },
             "values": { "entry_number": "ABC12345678", "port_of_entry_code": null, "…": "…" },
             "field_origins": { "entry_number": "HUMAN", "…": "HUMAN" } },
  "case_reference": "CE-2026-000137",
  "receipt_outcome": "EXCEPTION_OPENED",
  "validation": { "outcome": "FAIL", "rule_set_version": "RIV-2026.09", "evaluated_at": "…",
    "findings": [ { "rule_id": "RIV-030", "field_name": "port_of_entry_code",
                    "failure_code": "PORT_OF_ENTRY_MISSING",
                    "message": "Enter the port of entry code." } ] },
  "exception": { "id": "uuid", "state": "OPEN", "receipt_position": 42 },
  "next": { "case_url": "/cases/CE-2026-000137", "queue_url": "/queue" } }

// 201 — validated clean
{ "…": "…", "receipt_outcome": "VALIDATED_CLEAN",
  "validation": { "outcome": "PASS", "findings": [] }, "exception": null,
  "next": { "case_url": null, "queue_url": "/queue" } }
```
Errors: `401` · `403 CSRF_INVALID` · `409 ENTRY_NUMBER_DUPLICATE` (details carry the existing `case_reference`) · `413 REQUEST_TOO_LARGE` · `415` · `422 REQUEST_MALFORMED` · `500 RECEIPT_FAILED`.
Note: a validation failure is **not** an error — it is a `201` with `receipt_outcome: "EXCEPTION_OPENED"` (F3 FR-3.10).

**`GET /api/entries/{entryId}`** — `200` with the entry, field origins, validation result with findings, `receipt_outcome`, and `exception` summary or null. Errors: `400 INVALID_IDENTIFIER` · `401` · `404 ENTRY_NOT_FOUND`.

---

### 3. Queue and Cases (F7)

**`GET /api/exceptions`** — the queue. **Accepts no query parameters** (F7 FR-7.2).

```jsonc
// 200
{ "exceptions": [
    { "id": "uuid", "case_reference": "CE-2026-000137", "receipt_position": 42,
      "received_at": "2026-09-11T14:32:07Z", "entry_number": "ABC12345678",
      "finding_count": 3,
      "failure_summary": "Enter the port of entry code.; Describe the goods. and 1 more" } ],
  "returned_count": 1, "truncated": false }
```
Ordering is `receipt_position ASC`, always. Errors: `400 UNSUPPORTED_QUERY_PARAMETER` · `401` · `405`.

**`GET /api/exceptions/{idOrReference}`** — full case detail.

```jsonc
// 200
{ "exception": { "id": "uuid", "case_reference": "CE-2026-000137", "state": "OPEN",
                 "receipt_position": 42, "opened_at": "…", "closed_at": null },
  "entry": { "id": "uuid", "received_at": "…",
             "created_by": { "id": "uuid", "display_name": "A. Rivera" },
             "values": { "entry_number": "ABC12345678", "port_of_entry_code": null, "…": "…" },
             "field_origins": { "entry_number": "HUMAN", "…": "HUMAN" } },
  "validation": { "outcome": "FAIL", "rule_set_version": "RIV-2026.09", "evaluated_at": "…",
                  "findings": [ { "rule_id": "RIV-030", "field_name": "port_of_entry_code",
                                  "failure_code": "PORT_OF_ENTRY_MISSING",
                                  "message": "Enter the port of entry code." } ] },
  "recommendation": { "id": "uuid", "status": "AVAILABLE",
    "recommended_action": "Add the missing port of entry code and expand the goods description.",
    "rationale": "The entry did not include a port of entry, and …",
    "proposed_values": [ { "field_name": "port_of_entry_code", "proposed_value": "2704",
                           "origin": "AI", "addresses_rule_ids": ["RIV-030"] } ],
    "model_id": "…", "prompt_version": "p-2026.09.1", "generated_at": "…",
    "failure_reason": null, "requested_at": "…" },
  "decision": null,
  "permitted_decisions": ["APPROVE", "EDIT_APPROVE", "REJECT"] }
```
For a closed case: `exception.state` is `RESOLVED`/`REJECTED`, `permitted_decisions` is `[]`, and `decision` is populated:
```jsonc
{ "decision": { "id": "uuid", "decision_type": "EDIT_APPROVE", "decided_at": "…",
    "decided_by": { "id": "uuid", "display_name": "A. Rivera" },
    "reason": "Port code corrected to the actual arrival port per the bill of lading.",
    "resolution_values": [ { "field_name": "port_of_entry_code", "value": "2709",
        "origin": "HUMAN", "prior_value": "2704", "prior_origin": "AI",
        "changed_from_proposal": true } ] } }
```
Errors: `400 INVALID_IDENTIFIER` · `401` · `404 EXCEPTION_NOT_FOUND` · `405`.

---

### 4. Recommendation, Decision, Audit (F9, F11, F13)

**`GET /api/exceptions/{exceptionId}/recommendation`** — polled by F10 while `PENDING`.

```jsonc
// 200 — available
{ "id": "uuid", "status": "AVAILABLE", "recommended_action": "…", "rationale": "…",
  "proposed_values": [ { "field_name": "…", "proposed_value": "…", "origin": "AI",
                         "addresses_rule_ids": ["RIV-030"] } ],
  "model_id": "…", "prompt_version": "…", "generated_at": "…", "requested_at": "…" }
// 200 — unavailable (degraded mode; the case remains decidable)
{ "id": "uuid", "status": "UNAVAILABLE", "failure_reason": "PROVIDER_TIMEOUT",
  "failed_at": "…", "requested_at": "…" }
// 200 — pending
{ "id": "uuid", "status": "PENDING", "requested_at": "…" }
```
There is no `POST`, `PUT`, regenerate, or apply operation on this resource. Errors: `400` · `401` · `404 EXCEPTION_NOT_FOUND` · `405`.

**`POST /api/exceptions/{exceptionId}/decision`** — the only mutating case endpoint. Session + CSRF. Optional `Idempotency-Key` header.

```jsonc
// request — approve
{ "decision_type": "APPROVE", "recommendation_id": "uuid" }
// request — edit and approve (complete value set required)
{ "decision_type": "EDIT_APPROVE", "recommendation_id": "uuid",
  "reason": "Port code corrected to the actual arrival port per the bill of lading.",
  "resolution_values": [ { "field_name": "port_of_entry_code", "value": "2709" },
                         { "field_name": "goods_description",  "value": "Stainless steel M8 hex bolts, 1200 pieces" } ] }
// request — reject
{ "decision_type": "REJECT", "reason": "The suggested port code conflicts with the vessel's manifest." }
```

```jsonc
// 201
{ "decision": { "id": "uuid", "decision_type": "EDIT_APPROVE", "decided_at": "…",
    "decided_by": { "id": "uuid", "display_name": "A. Rivera" },
    "reason": "…",
    "resolution_values": [ { "field_name": "port_of_entry_code", "value": "2709",
        "origin": "HUMAN", "prior_value": "2704", "prior_origin": "AI",
        "changed_from_proposal": true },
      { "field_name": "goods_description", "value": "Stainless steel M8 hex bolts, 1200 pieces",
        "origin": "AI", "prior_value": "Stainless steel M8 hex bolts, 1200 pieces",
        "prior_origin": "AI", "changed_from_proposal": false } ] },
  "exception": { "id": "uuid", "state": "RESOLVED", "closed_at": "…" },
  "audit_entry_id": "uuid",
  "idempotent_replay": false }
```
`origin` is computed server-side and is never accepted from the client (F11 FR-11.8, FR-11.15).
Errors: `401` · `403 CSRF_INVALID` · `404 EXCEPTION_NOT_FOUND` · `409 EXCEPTION_ALREADY_DECIDED` · `409 RECOMMENDATION_NOT_AVAILABLE` · `409 RECOMMENDATION_MISMATCH` · `409 IDEMPOTENCY_KEY_REUSED` · `422 REASON_REQUIRED` · `422 RESOLUTION_VALUES_NOT_ALLOWED` · `422 RESOLUTION_VALUES_INCOMPLETE` · `422 REQUEST_MALFORMED` · `500 DECISION_FAILED`.

**`GET /api/exceptions/{exceptionId}/audit`** — one case's trail, ascending sequence.

```jsonc
// 200
{ "case_reference": "CE-2026-000137", "entry_count": 5,
  "chain_verified": true, "first_divergence_sequence": null,
  "entries": [
    { "id": "uuid", "case_sequence": 1, "action_type": "ENTRY_RECEIVED",
      "actor_type": "SPECIALIST", "actor": { "id": "uuid", "display_name": "A. Rivera" },
      "occurred_at": "…", "before_state": null, "after_state": "RECEIVED", "reason": null,
      "model_id": null,
      "values": [ { "field_name": "entry_number", "before_value": null, "before_origin": null,
                    "after_value": "ABC12345678", "after_origin": "HUMAN", "changed": true } ] },
    { "id": "uuid", "case_sequence": 4, "action_type": "RECOMMENDATION_GENERATED",
      "actor_type": "AI", "actor": null, "model_id": "…",
      "occurred_at": "…", "before_state": "PENDING", "after_state": "AVAILABLE", "reason": null,
      "values": [ { "field_name": "port_of_entry_code", "before_value": null, "before_origin": null,
                    "after_value": "2704", "after_origin": "AI", "changed": true } ] },
    { "id": "uuid", "case_sequence": 5, "action_type": "RECOMMENDATION_EDITED_AND_APPROVED",
      "actor_type": "SPECIALIST", "actor": { "id": "uuid", "display_name": "A. Rivera" },
      "occurred_at": "…", "before_state": "OPEN", "after_state": "RESOLVED",
      "reason": "Port code corrected to the actual arrival port per the bill of lading.",
      "values": [ { "field_name": "port_of_entry_code", "before_value": "2704",
                    "before_origin": "AI", "after_value": "2709", "after_origin": "HUMAN",
                    "changed": true } ] } ] }
```
Read-only, single-case, JSON only. There is no export representation, no `Accept` variant producing a file, no `?format=` parameter, and no multi-case audit query (F13 FR-13.18, PRD §10 #5). Errors: `400` · `401` · `404 EXCEPTION_NOT_FOUND` · `405`.

---

### 5. UI Routes (F2 shell; screens owned by F1, F6, F8, F10, F12, F14)

| Route | Screen | Owner | Auth |
|---|---|---|---|
| `/sign-in` | Sign in | F1 + F2 | none |
| `/` | Redirect to `/queue` | F2 | session |
| `/queue` | Review queue (receipt-ordered open exceptions) | F8 | session |
| `/entries/new` | New cargo entry form + receipt outcome | F6 | session |
| `/cases/{caseReference}` | Case detail: findings, entry, recommendation (F10), decision (F12), audit (F14) | F10 | session |
| `/cases/{caseReference}/audit` | Case detail, deep-linked and focused on the audit trail region | F14 | session |
| `*` | Page not found (inside the shell) | F2 | session |

An unauthenticated HTML request to any session route ⇒ `302 /sign-in?next={path}` (F1 FR-1.7). There is no dashboard route, no reports route, no settings route, no admin route, and no closed-case browse route.

---

### 6. Cross-cutting API requirements

- **FR-Y1.1** The endpoint list above is exhaustive. Adding an endpoint requires a corresponding feature requirement in this FRD; no endpoint may be added "for later".
- **FR-Y1.2** No endpoint accepts a query parameter except none at all — v1 has zero query parameters across the whole API. `GET /api/exceptions` rejects any; the others take only path parameters.
- **FR-Y1.3** Response bodies MUST NOT include any field that would enable queue management, supervision, or export: no priority, assignee, age, throughput, count-by-state, or download link (PRD §10 #2, #4, #5).
- **FR-Y1.4** `request_id` MUST be generated per request, returned in the error envelope and the `X-Request-Id` response header, and recorded on audit entries written during that request (F13).
- **FR-Y1.5** Rate limiting applies only to `POST /api/session` (F1 FR-1.10). No other endpoint is throttled in v1.
- **FR-Y1.6** All input is validated server-side and all database access uses parameterised queries (NFR-8). No endpoint interpolates client input into SQL.
- **FR-Y1.7** Error messages are plain language, safe to display, and never disclose stack traces, SQL, provider errors, credentials, or whether an email address exists.

---
