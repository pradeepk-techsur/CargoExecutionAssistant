## Y2: Error Catalogue (Cross-Feature)

Every error the product can return, in one place. All are returned in the standard envelope (`Y1-api.md` §0). Messages are the exact, plain-language text shown to a specialist; they never expose stack traces, SQL, provider responses, or credentials (NFR-8).

### 1. Authentication and session (F1)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 401 | `AUTH_FAILED` | "Email or password is incorrect." | Unknown email **or** wrong password — deliberately indistinguishable | Re-enter credentials |
| 401 | `UNAUTHENTICATED` | "Sign in to continue." | No session, expired session, or revoked session on an API call | Sign in again; HTML routes redirect instead |
| 403 | `ACCOUNT_INACTIVE` | "This account is not active." | `specialists.is_active = false` | Contact the deployment operator; there is no self-service unlock |
| 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." | Missing or mismatched `X-CSRF-Token` | Refresh the page to obtain a current token |
| 429 | `TOO_MANY_ATTEMPTS` | "Too many sign-in attempts. Try again in about 15 minutes." | 5 failures for one email within 15 minutes | Wait; `Retry-After` is set |

### 2. Request shape (all endpoints)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 400 | `INVALID_IDENTIFIER` | "That identifier is not valid." | Path segment is neither a uuid nor `CE-YYYY-NNNNNN` | Use a link from the queue or the receipt outcome |
| 400 | `UNSUPPORTED_QUERY_PARAMETER` | "This endpoint accepts no query parameters." | Any query string on `GET /api/exceptions` — including `sort`, `filter`, `state`, `assignee`, `page` | Request the endpoint with no parameters; queue management does not exist (PRD §10 #4) |
| 405 | `METHOD_NOT_ALLOWED` | "That action is not available." | Method not defined for the path (e.g. `PUT /api/entries/{id}`, `DELETE /api/exceptions/{id}/audit`) | None — the capability does not exist |
| 413 | `REQUEST_TOO_LARGE` | "This entry is too large to accept." | Body over 64 KB | Shorten the goods description; the cap is per single typed entry, not a batch limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | "Send this entry as JSON." | Non-JSON content type; includes any attempt at multipart or CSV upload (PRD §10 #6) | Submit through the entry form |
| 422 | `REQUEST_MALFORMED` | "The request could not be read." | Unknown property, wrong type, over-length string, duplicate field, or a client-supplied `origin`/`decided_by` | Correct the client; `details[]` names each offending field |

### 3. Entry receipt (F3, F4)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 404 | `ENTRY_NOT_FOUND` | "That entry could not be found." | No such entry id | Return to the review queue |
| 409 | `ENTRY_NUMBER_DUPLICATE` | "Entry number {n} already exists on case {ref}." | `UNIQUE` on `entry_number`; deliberately not a validation rule (F3 FR-3.9) | Open the existing case or use the correct entry number |
| 500 | `RECEIPT_FAILED` | "The entry could not be received. Nothing was saved. Try again." | Any failure inside the receipt transaction — persistence, validation engine, exception derivation, or audit write | Re-submit; atomicity guarantees nothing partial was stored |

**Not errors:** a required-information failure returns `201` with `receipt_outcome: "EXCEPTION_OPENED"` and findings. No `RIV-*` failure code ever appears as an HTTP error code.

### 4. Queue and case retrieval (F7)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 404 | `EXCEPTION_NOT_FOUND` | "That case could not be found." | No exception for the identifier | Return to the review queue |
| 404 | `EXCEPTION_NOT_FOUND` | "That entry passed validation, so it has no exception." | Entry exists but validated clean | None needed — a clean entry has no case to work |

### 5. Decision (F11)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 409 | `EXCEPTION_ALREADY_DECIDED` | "This case was already {resolved/rejected} by {name} on {date}." | A decision exists; `UNIQUE (exception_id)` plus the row lock | None — decisions are final; no reopen, amend, or undo exists |
| 409 | `RECOMMENDATION_NOT_AVAILABLE` | "There is no AI recommendation to approve. Edit and approve, or reject." | `APPROVE` attempted while the recommendation is `PENDING` or `UNAVAILABLE` | Use edit-and-approve (direct resolution) or reject |
| 409 | `RECOMMENDATION_MISMATCH` | "The recommendation changed. Reload the case and review it again." | Supplied `recommendation_id` is not the case's current one | Reload the case and decide on what is shown |
| 409 | `IDEMPOTENCY_KEY_REUSED` | "That request identifier was already used for a different decision." | Same `Idempotency-Key`, different body | Reload the case to see what was recorded |
| 422 | `REASON_REQUIRED` | "Enter a reason of at least 10 characters for this {edit/rejection}." | Reason absent, blank, whitespace-only, or under 10 characters on `EDIT_APPROVE`/`REJECT` | Enter a substantive reason; also enforced by a database `CHECK` |
| 422 | `RESOLUTION_VALUES_NOT_ALLOWED` | "Resolution values cannot be sent with this decision." | Values sent with `APPROVE` or `REJECT` | Approve adopts the proposal as-is; reject records no values |
| 422 | `RESOLUTION_VALUES_INCOMPLETE` | "Include every recommended field. Missing: {list}." | Value set does not exactly match the proposal's field set | Send the complete set so per-value provenance is unambiguous |
| 500 | `DECISION_FAILED` | "The decision could not be recorded. Nothing was saved. Try again." | Any failure inside the decision transaction, including audit coupling | Reload the case and retry; the case remains `OPEN` |

### 6. AI recommendation (F9) — degraded, not failed

These are **recommendation statuses**, not HTTP errors. The case remains fully decidable in every one (NFR-9, SM-13). `failure_reason` maps to the plain-language copy F10 renders.

| `failure_reason` | Displayed cause | Retryable |
|---|---|---|
| `PROVIDER_TIMEOUT` | "The AI service did not respond in time." | No — terminal by design (F9 FR-9.14) |
| `PROVIDER_UNAVAILABLE` | "The AI service could not be reached." | No |
| `PROVIDER_RATE_LIMITED` | "The AI service was busy." | No |
| `PROVIDER_AUTH_FAILED` | "The AI service rejected this deployment's credentials." | No — an operator issue; the key is never displayed or logged |
| `SCHEMA_INVALID` | "The AI response could not be used." | No |
| `CONTENT_FILTERED` | "The AI service declined to answer for this case." | No |
| `INTERNAL_ERROR` | "A recommendation could not be produced." | No |

### 7. Database-enforced invariants (never surfaced verbatim)

These are raised by the database (`Y0-schema.md`) and abort the transaction. They reach the client only as the caller's generic `500` (`RECEIPT_FAILED` or `DECISION_FAILED`), with the internal code logged against the `request_id`.

| Internal code | Raised by | Meaning |
|---|---|---|
| `AUDIT_IMMUTABLE` | Privilege revocation + mutation trigger | An `UPDATE`/`DELETE`/`TRUNCATE` was attempted on an audit table by any role |
| `AUDIT_CHAIN_BROKEN` | Chain constraint trigger | `prev_entry_hash` did not match the prior entry for the case |
| `AUDIT_COUPLING_VIOLATION` | Coupling constraint triggers | A state change had zero or more than one audit entry at commit |
| `HITL_VIOLATION` | HITL constraint trigger | An exception left `OPEN` without a matching human decision |
| `EXCEPTION_WITHOUT_BASIS` | Composite FK / F5 guard | An exception referenced a passing validation result, or had no findings |
| `AUDIT_SEQUENCE_CONFLICT` | `UNIQUE (case_id, case_sequence)` | Two writers raced on one case's audit sequence |
| `AUDIT_WRITE_INVALID` | Audit writer validation | Invalid action, actor pairing, missing required reason, or no transaction |
| `AUDIT_WRITE_FORBIDDEN_CONTENT` | Audit writer denylist | An attempt to write a secret-shaped value or denylisted field name |
| `RULE_SET_INVALID` | Startup self-check | The validation rule registry failed its integrity check; the application refuses to start |
| `VALIDATION_ENGINE_FAILURE` | Validation engine | A rule predicate threw, or a finding named an unknown field |

### 8. Client-side and shell states (F2)

| Scenario | Presentation | Announcement |
|---|---|---|
| Unknown route | "Page not found" inside the shell, link to the review queue | Polite |
| Network failure on a load | `ErrorState` with "Try again" | Assertive |
| Network failure on a submit | Error summary above the form; entered values preserved | Assertive |
| Unknown outcome after a submit | Advice to check the review queue or reload the case; never an automatic retry | Assertive |
| Unhandled client exception | `ErrorState` with a generic cause; no stack trace shown | Assertive |
| Audit chain verification failed | USWDS error alert naming the divergent sequence; no repair action offered | Assertive |

### 9. Error-handling principles

- **FR-Y2.1** A required-information failure is never an error. It is a successful receipt whose outcome is an exception.
- **FR-Y2.2** A `4xx` or `5xx` from a mutating endpoint means **nothing was written** — no partial state, no orphan record, no audit entry. Messages say so explicitly where a specialist might otherwise retry blindly.
- **FR-Y2.3** Error codes are stable identifiers; messages may be reworded without changing a code. Clients branch on codes, never on message text.
- **FR-Y2.4** `details[]` names the offending field and a field-level code so the UI can bind the error to a control (F2 FR-2.13).
- **FR-Y2.5** No error message discloses account existence, internal identifiers beyond the case reference, provider error text, SQL, or configuration.
- **FR-Y2.6** Every error response carries a `request_id` that correlates with server logs and with any audit entry written during that request.

---
