## F7: Review Queue (API)

**Priority:** P0 · **Surface:** Programmatic API · **Dependencies:** F0, F1, F5 · **PRD trace:** §5.3 F7, §4.3 #5, PRD §10 #2 and #4

**Description:** F7 is the server-side projection that returns open exceptions in receipt order, plus the single-case retrieval endpoint that the case detail screen reads. It is deliberately one query with one ordering and **no parameters**: no filtering, no sorting, no assignment, no prioritisation, no search, no pagination controls. A receipt-ordered list is sufficient to demonstrate queue → open → decide, and adding dimensions to it would widen the surface without deepening the loop. The list endpoint returns only open exceptions and only the fields a list row needs; the detail endpoint returns everything a specialist needs to take a decision.

**Terminology (feature-specific):**
- **Queue:** the ordered projection of `exceptions` where `state = 'OPEN'`, ascending by `receipt_position`. It is a query result, not a stored structure — nothing is enqueued or dequeued, and no row is removed from a queue table on closure.
- **Row summary:** the minimum payload for a list row — case reference, receipt timestamp, originating entry identifier, and a validation-failure summary.
- **Case detail:** the composed read model for one exception: entry values with origins, validation findings, recommendation (or its absence), decision (if any), and state.
- **Failure summary:** a short derived string plus the finding count, used to tell rows apart in the list.

**Sub-features:**
- Parameterless list endpoint returning open exceptions in ascending receipt order
- Stable, deterministic ordering across repeated requests
- Row summary payload
- Closed cases excluded from the queue
- Single-case retrieval with findings, recommendation, decision state, and entry values

---

### Process — List

1. Middleware authenticates (F1); unauthenticated ⇒ `401`.
2. Handler rejects the request if **any** query string is present (FR-7.2).
3. Handler executes exactly one query: `SELECT ... FROM exceptions e JOIN cargo_entries c ON c.id = e.entry_id WHERE e.state = 'OPEN' ORDER BY e.receipt_position ASC LIMIT 501`.
4. Handler composes the failure summary per row from the referenced validation findings.
5. If 501 rows were returned, the handler emits the first 500 and sets `truncated: true` (FR-7.9).
6. Handler returns `200` with `{ exceptions: [...], returned_count, truncated }`.

### Process — Single case

1. Middleware authenticates.
2. Handler resolves the identifier: the path segment MAY be either the exception `uuid` or the `case_reference` (`CE-YYYY-NNNNNN`), so a UI route keyed on the human-readable reference needs no extra lookup. Anything matching neither form ⇒ `400 INVALID_IDENTIFIER`.
3. Handler loads the exception, its entry and per-field origins, its validation result and findings, its recommendation with proposed values (if any), and its decision with decision values (if any).
4. Handler returns `200` with the composed case detail, including `state`, `is_closed`, and `permitted_decisions` (FR-7.8).

---

### Functional Requirements

- **FR-7.1 — Ordering is receipt order, strictly.** The list MUST be ordered `receipt_position ASC` and by nothing else. `receipt_position` is assigned at exception creation and is immutable (F5 FR-5.8), so ordering is total, stable, and identical across repeated requests and across processes. There MUST be no secondary sort key, no tie-break (the column is unique), and no ordering configuration.
- **FR-7.2 — Zero query parameters.** `GET /api/exceptions` MUST accept no query parameters at all. A request carrying any query string — including `?state=`, `?sort=`, `?order=`, `?q=`, `?assignee=`, `?priority=`, `?page=`, `?limit=`, `?since=`, or any unrecognised parameter — MUST be rejected with `400 UNSUPPORTED_QUERY_PARAMETER` naming the offending parameter. Rejection rather than silent ignoring is deliberate: it makes the absence of queue management an enforced contract rather than an undocumented gap (PRD §10 #4).
- **FR-7.3 — No filtering, sorting, assignment, or prioritisation, anywhere.** Beyond the parameter ban, no header, body, cookie, or configuration value may alter the queue's membership or order, and the response MUST contain no field that would support client-side queue management — no `priority`, `severity`, `risk`, `assigned_to`, `claimed_by`, `age_days`, `age_bucket`, `due_at`, `sla_status`, or `is_overdue`. Client-side sorting or filtering controls are likewise prohibited (F8 FR-8.4).
- **FR-7.4 — Open cases only.** The list MUST include exactly the exceptions in `OPEN` state. `RESOLVED` and `REJECTED` exceptions MUST be excluded, with no parameter, toggle, or alternate endpoint to include them. A closed case remains reachable **only** by its direct URL (`GET /api/exceptions/{id}`), which is how the audit trail of a decided case stays readable (F14) without introducing a second list surface or a history browse.
- **FR-7.5 — Row summary payload.** Each row MUST contain exactly: `id`, `case_reference`, `receipt_position`, `received_at`, `entry_number` (nullable — an exception may exist precisely because it is missing), `finding_count`, and `failure_summary`. Nothing else. Full entry values, recommendation text, and findings detail are not list data.
- **FR-7.6 — Failure summary derivation.** `failure_summary` MUST be derived deterministically from the findings: the messages of the first two findings in server order, joined by "; ", suffixed with " and {n} more" when more than two exist. It is presentation shorthand only; the authoritative findings are returned by the detail endpoint. It MUST NOT include a severity, score, or ranking term (F4 FR-4.9).
- **FR-7.7 — Case detail payload.** `GET /api/exceptions/{idOrReference}` MUST return: the exception (`id`, `case_reference`, `state`, `receipt_position`, `opened_at`, `closed_at`); the entry (all fourteen values with per-field `origin`, `received_at`, submitting specialist id and display name); the validation result (`outcome`, `rule_set_version`, `evaluated_at`, findings in server order); the recommendation (`status`, and when `AVAILABLE`: `recommended_action`, `rationale`, `proposed_values[]` each with `field_name`, `proposed_value`, `origin: "AI"`, `addresses_rule_ids[]`, plus `model_id`, `prompt_version`, `generated_at`; when `UNAVAILABLE`: `failure_reason` and `failed_at`; when `PENDING`: `requested_at`); and the decision when one exists (`decision_type`, `decided_at`, `decided_by` id and display name, `reason`, `resolution_values[]` with per-value `origin` and `prior_value`).
- **FR-7.8 — Permitted decisions are server-declared.** The case detail response MUST include `permitted_decisions: string[]` computed server-side: `[]` when the case is closed; `["APPROVE","EDIT_APPROVE","REJECT"]` when open with an `AVAILABLE` recommendation; `["EDIT_APPROVE","REJECT"]` when open with an `UNAVAILABLE` or `PENDING` recommendation (approval requires something to approve — F11 FR-11.6). The UI derives its controls from this field rather than re-implementing the rule, and the API re-checks it on submission regardless.
- **FR-7.9 — Bounded response without pagination.** The list MUST return at most 500 rows and set `truncated: true` when more open exceptions exist. This is a safety bound, not pagination: there MUST be no page, offset, cursor, or limit parameter, and no "next page" link. At demonstration scale the bound is not reachable; it exists so an unbounded response cannot occur.
- **FR-7.10 — Read-only.** Both endpoints MUST be `GET`-only and side-effect free. Reading the queue or a case MUST NOT change any state, MUST NOT claim or lock a case, and MUST NOT write an audit entry — viewing is not a state change, and recording views would both miss the point of the audit trail and create a per-specialist activity record that supervision (out of scope) would consume.
- **FR-7.11 — Authenticated, single role.** Both endpoints require a valid session. Every authenticated specialist sees the identical queue and the identical case content; there is no per-user visibility scoping, because there is one role and no assignment (F1 FR-1.1).
- **FR-7.12 — No caching of stale state.** Responses MUST be sent with `Cache-Control: no-store` so a decided case never renders from cache as though it were still open.
- **FR-7.13 — Determinism under concurrency.** Two specialists requesting the queue at the same moment MUST receive the same rows in the same order. A case decided between the two requests simply disappears from the later one; no ordering of the remaining rows changes, because positions are immutable.
- **FR-7.14 — Not found.** An identifier that is well-formed but matches no exception MUST return `404 EXCEPTION_NOT_FOUND`. A well-formed identifier matching an entry that passed validation (and therefore has no exception) MUST also return `404`, with the message distinguishing "this entry passed validation and has no exception" so the UI can explain it.

---

**Inputs:**
- `GET /api/exceptions`: session cookie only. No parameters, no body.
- `GET /api/exceptions/{idOrReference}`: session cookie; path segment matching `^[0-9a-f-]{36}$` or `^CE-[0-9]{4}-[0-9]{6}$`.

**Outputs:**
- `200` queue: `{ exceptions: RowSummary[], returned_count, truncated }` in ascending receipt order
- `200` case detail: the composed read model of FR-7.7 plus `permitted_decisions`
- No writes of any kind

**Validation:**
- Reject any query string (FR-7.2).
- Reject a path identifier matching neither accepted form (`400 INVALID_IDENTIFIER`).
- Reject non-`GET` methods on both paths with `405 METHOD_NOT_ALLOWED` (the only mutating exception route is `POST /api/exceptions/{id}/decision`).

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| No session | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| Any query parameter supplied | 400 | `UNSUPPORTED_QUERY_PARAMETER` | "This endpoint accepts no query parameters." |
| Malformed identifier | 400 | `INVALID_IDENTIFIER` | "That case identifier is not valid." |
| No such exception | 404 | `EXCEPTION_NOT_FOUND` | "That case could not be found." |
| Entry exists but passed validation | 404 | `EXCEPTION_NOT_FOUND` | "That entry passed validation, so it has no exception." |
| Non-GET method | 405 | `METHOD_NOT_ALLOWED` | "That action is not available." |

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/exceptions` | session | Open exceptions in receipt order; no parameters |
| `GET` | `/api/exceptions/{idOrReference}` | session | Full case detail for one exception |

Full schemas in `Y1-api.md` §3 Queue & Cases.

**Schema Surface (this feature):** reads `exceptions`, `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, `recommendations`, `recommendation_values`, `decisions`, `decision_values`, `specialists`. Requires index `idx_exceptions_open_receipt_order` on `(receipt_position)` `WHERE state = 'OPEN'`. See `Y0-schema.md` §4 and §8.

**Acceptance Criteria:**
1. Three open exceptions are returned in ascending `receipt_position`, identically on repeated calls.
2. Deciding the first case removes it from the next response and leaves the order of the others unchanged.
3. `GET /api/exceptions?sort=received_at` returns `400 UNSUPPORTED_QUERY_PARAMETER`.
4. `GET /api/exceptions?state=RESOLVED` returns `400`, not a filtered list.
5. The response JSON contains no priority, assignment, age, or SLA field.
6. A resolved case is absent from the list but fully readable at its direct URL, including its decision.
7. `permitted_decisions` is `["EDIT_APPROVE","REJECT"]` for an open case whose recommendation is `UNAVAILABLE`, and `[]` for any closed case.
8. Reading the queue or a case writes no audit entry and changes no row.

---
