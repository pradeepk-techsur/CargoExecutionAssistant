## Epic 3: Manual Cargo Entry Creation (F3)

The only way data enters CargoExec: one human filling in one form. Receipt is atomic — persist,
validate, open an exception on failure, write the audit entries — in a single transaction.

### US-3.1: Have my entry received and assessed in one indivisible step
**As a** cargo specialist, **I want to** submit a cargo entry and have it persisted, validated, and turned into an exception if it fails, all in one transaction, **so that** an entry can never sit in the system having been received but never assessed.

**Acceptance Criteria:**
- [ ] Given an authenticated request with a valid CSRF token to `POST /api/entries`, when the body is one JSON object of the fourteen entry fields, then the server persists the entry with `created_by`, `received_at`, and a `case_reference` of the form `CE-{YYYY}-{NNNNNN}` allocated inside the transaction.
- [ ] Given an entry with only `goods_description` filled in, when it is submitted, then the response is `201` with `receipt_outcome: "EXCEPTION_OPENED"`, the case reference, the full validation result with findings, and `exception: { id, state: "OPEN", receipt_position }`.
- [ ] Given a complete, rule-satisfying entry, when it is submitted, then the response is `201` with `receipt_outcome: "VALIDATED_CLEAN"` and `exception: null`.
- [ ] Given a forced failure in the audit writer during receipt, when the transaction aborts, then zero `cargo_entries` rows exist for that submission, the response is `500 RECEIPT_FAILED` with "The entry could not be received. Nothing was saved. Try again.", and no orphan validation result or exception exists.
- [ ] Given receipt has committed, when the response is produced, then it is returned without waiting for AI generation; the `recommendations` row was created `PENDING` inside the transaction and generation is dispatched only after commit.
- [ ] Given the AI provider is stopped entirely, when an entry is submitted, then the receipt response is unchanged in shape and status.
- [ ] Given `GET /api/entries/{entryId}`, when it is called for a received entry, then it returns the stored values, `case_reference`, `received_at`, the submitting specialist's id and display name, per-field `HUMAN` origin, the validation result with findings, the `receipt_outcome`, and the exception's `id`, `state`, and `receipt_position` where one exists.

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.2: Have my keystrokes recorded exactly as typed and attributed to me
**As a** cargo specialist, **I want to** have every value I submit stored exactly as I typed it and marked `HUMAN` in origin, **so that** the audit record shows what I actually entered and gives a baseline against which any later AI proposal is compared.

**Acceptance Criteria:**
- [ ] Given a submitted field with a non-empty value, when receipt commits, then one `cargo_entry_field_origins` row exists for it with `origin = 'HUMAN'`.
- [ ] Given an absent property, an empty string, and a whitespace-only string for the same field, when each is submitted, then all three are treated identically as "not provided": the field is stored as `NULL` and receives **no** origin row.
- [ ] Given I type `abc12345678` into `entry_number`, when receipt commits, then `abc12345678` — not `ABC12345678` — is the stored value and the value appearing in the audit trail; normalisation applies only to rule comparison.
- [ ] Given a string field, when it is stored, then only leading and trailing whitespace has been trimmed; internal whitespace and letter case are preserved.
- [ ] Given the `ENTRY_RECEIVED` audit entry, when it is read, then it carries one value row per submitted field with `after_value` equal to the submitted value and `after_origin = 'HUMAN'`.
- [ ] Given `quantity` or `declared_value_usd` submitted as a numeric string, when it is stored, then it is not rounded, reformatted, or localised.

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.3: Be told plainly when the entry number already exists
**As a** cargo specialist, **I want to** be stopped with a clear message and a route to the existing case when I reuse an entry number, **so that** I do not create a second case for a shipment that is already in the system.

**Acceptance Criteria:**
- [ ] Given an entry number already stored on another entry, when I submit it, then the response is `409 ENTRY_NUMBER_DUPLICATE` with "Entry number {n} already exists on case {ref}." and nothing is persisted.
- [ ] Given that `409`, when the response body is read, then it identifies the `case_reference` of the existing entry so the UI can link to it.
- [ ] Given the validation rule set, when it is inspected, then entry-number uniqueness is deliberately **not** a `RIV-*` rule and therefore never produces a finding or an exception, because a uniqueness test depends on database state and would break determinism.
- [ ] Given two submissions of the same complete content with different entry numbers, when both are received, then two distinct entries exist — receipt is not idempotent and accepts no idempotency key.
- [ ] Given a structurally malformed request (unknown property, wrong type, over-length string, non-object body), when it is submitted, then the response is `422 REQUEST_MALFORMED` naming each offending field, and nothing is persisted and no audit entry is written.
- [ ] Given a request body over 64 KB, when it is submitted, then the response is `413 REQUEST_TOO_LARGE`; given a non-JSON content type, `415 UNSUPPORTED_MEDIA_TYPE`; given a non-uuid entry id on retrieval, `400 INVALID_IDENTIFIER`.

**Priority:** P1 | **Feature Ref:** F3

---

### US-3.4: Have no way to get data in that skips validation
**As a** cargo specialist, **I want to** have manual entry be the only ingestion path and validation be unskippable, **so that** every case in the queue has a genuine validation basis behind it and the loop has no back door.

**Acceptance Criteria:**
- [ ] Given a request body that is a JSON array, a multipart upload, or `text/csv`, when it is submitted to `POST /api/entries`, then it is rejected (`422 REQUEST_MALFORMED` or `415 UNSUPPORTED_MEDIA_TYPE`) and no batch wrapper is accepted.
- [ ] Given a property such as `skip_validation`, `force`, or `validate: false`, when it is included in the body, then it is rejected as an unknown field with `422 REQUEST_MALFORMED`; no request parameter, header, environment variable, or configuration switch skips, defers, weakens, or re-runs validation.
- [ ] Given the deployed application, when its routes and CLI commands are enumerated, then there is no import endpoint, no bulk-upload endpoint, no ingestion adapter, no CLI import command, and no ACE/ATS interface.
- [ ] Given the route table, when it is reviewed, then no `PUT`, `PATCH`, or `DELETE` route exists for a cargo entry and no `GET /api/entries` collection route exists — the only list surface in the product is the receipt-ordered open-exception queue.
- [ ] Given every received entry, when `validation_results` is queried, then exactly one row exists per entry, written inside that entry's receipt transaction.
- [ ] Given the deployed database, when migrations are reviewed, then none inserts a cargo entry, exception, recommendation, decision, or audit entry — there is no seeded demonstration dataset.

**Priority:** P0 | **Feature Ref:** F3

---
