## F3: Manual Cargo Entry Creation (API)

**Priority:** P0 · **Surface:** Programmatic API · **Dependencies:** F0, F1, F4, F5 · **PRD trace:** §5.2 F3, §4.3 #4, NFR-6, NFR-11, SM-8

**Description:** F3 is the server-side capability that receives a manually authored cargo entry, persists it, and returns the outcome of its receipt. It is the **only** way data enters CargoExec: there is no file upload, no bulk import, no ingestion adapter, and no interface to ACE or ATS (PRD §10 #6). Receipt is atomic — persist the entry, validate it (F4), open an exception on failure (F5), write the audit entries (F13) — all inside one database transaction, so an entry can never exist in a state where it was received but never assessed. The entry is the entry of record and is never mutated afterwards; a specialist's later corrections are recorded as a resolution on a decision (F11), not as an edit of the entry.

**Terminology (feature-specific):**
- **Entry field set:** the fourteen fields a specialist may submit, enumerated below. This set is fixed; there is no custom-field or extension mechanism.
- **Structural validation:** transport-level checks on the *shape* of the request (types, lengths, unknown fields). Failure is a client error (`422`), not an exception.
- **Required-information validation:** the F4 rule evaluation on the *content* of the entry. Failure produces findings and an exception, not a client error.
- **Receipt outcome:** `VALIDATED_CLEAN` or `EXCEPTION_OPENED`, decided inside the receipt transaction and immutable.

**Sub-features:**
- Create-entry endpoint for an authenticated specialist
- Entry persistence with author and receipt timestamp
- Case reference assignment
- Atomic receipt transaction: persist → validate → open exception on failure
- Receipt response reporting the outcome with the case reference
- Single-entry retrieval with current derived state
- `HUMAN`-origin provenance baseline for every submitted field value

---

### The Entry Field Set

Every field is **optional at the transport layer**. This is deliberate and central: an incomplete entry must be *receivable*, because an incomplete entry is precisely what the product exists to process. Completeness is judged by F4, whose verdict produces findings and an exception — never a transport error.

| Field | Type | Structural limit |
|---|---|---|
| `entry_number` | string | ≤ 20 chars |
| `importer_of_record_id` | string | ≤ 20 chars |
| `port_of_entry_code` | string | ≤ 8 chars |
| `mode_of_transport` | string | ≤ 16 chars |
| `carrier_code` | string | ≤ 8 chars |
| `conveyance_name` | string | ≤ 100 chars |
| `bill_of_lading_number` | string | ≤ 40 chars |
| `air_waybill_number` | string | ≤ 20 chars |
| `country_of_origin_code` | string | ≤ 4 chars |
| `goods_description` | string | ≤ 2000 chars |
| `quantity` | decimal(14,3) as JSON number or numeric string | ≤ 14 digits, ≤ 3 decimals |
| `quantity_uom` | string | ≤ 8 chars |
| `declared_value_usd` | decimal(14,2) as JSON number or numeric string | ≤ 14 digits, ≤ 2 decimals |
| `arrival_date` | string | ISO-8601 `YYYY-MM-DD`, ≤ 10 chars |

All string values are stored exactly as submitted after trimming leading/trailing whitespace; internal whitespace and case are preserved, because the audit record must show what the specialist actually typed. Normalisation for rule evaluation (uppercasing a code, for example) happens inside F4 and is applied to the *comparison*, never to the stored value.

---

### Process — Receipt (atomic)

1. Middleware authenticates the request and resolves the request principal (F1).
2. Handler applies structural validation to the body. Failure ⇒ `422 REQUEST_MALFORMED` with per-field detail; nothing is persisted and no audit entry is written.
3. Transaction `BEGIN`.
4. Build the canonical entry record (values trimmed, empty-equivalents as `NULL` — FR-3.8), take `received_at = now()` and a `case_reference` from the case-reference sequence, **evaluate F4 against that canonical record**, and insert `cargo_entries` **once** with those values, `created_by = principal.id`, `received_at`, `case_reference`, and the final `receipt_outcome`. The evaluated content is byte-identical to the recorded content, and `RIV-132` sees the same `received_at` that is stored. The row is never updated afterwards (FR-3.6); validating before the single insert is what keeps that true under `cargoexec_app`'s `SELECT, INSERT`-only grant on `cargo_entries` (`Y0-schema.md` FR-Y0.3).
5. Take the case-anchor row lock (`SELECT ... FROM cargo_entries WHERE id = :id FOR UPDATE`) used by F13 for sequence assignment.
6. Insert one `cargo_entry_field_origins` row per **submitted** field (present and non-empty after trim) with `origin = 'HUMAN'`.
7. Write audit entry `ENTRY_RECEIVED` via F13 (`before_state = NULL`, `after_state = 'RECEIVED'`, values = every submitted field with `after_origin = 'HUMAN'`).
8. Persist the `validation_results` row and any `validation_findings` produced by the step-4 evaluation.
9. Write audit entry `VALIDATION_COMPLETED` via F13 (`before_state = 'RECEIVED'`, `after_state = 'VALIDATED_CLEAN' | 'EXCEPTION_OPENED'`, with the findings summarised in the entry's value rows).
10. *(No update occurs.* `receipt_outcome` was written with its final value in step 4; there is no code path that updates a cargo entry, ever.)
11. If the outcome is `EXCEPTION_OPENED`, invoke F5: insert the `exceptions` row (`state = 'OPEN'`, `receipt_position` from sequence), insert the `recommendations` row with `status = 'PENDING'`, and write audit entry `EXCEPTION_OPENED`.
12. `COMMIT`. The deferred constraint triggers of F0 (FR-0.10) verify audit coupling at this point; any missing audit entry aborts the whole receipt.
13. **After commit**, and only after commit, enqueue AI recommendation generation (F9). Generation is never part of the receipt transaction and never delays the response.
14. Return `201` with the receipt outcome, the case reference, the validation result, and the exception reference if one was opened.

---

### Functional Requirements

- **FR-3.1 — Authenticated creation only.** `POST /api/entries` MUST require a valid session and a valid CSRF token. An unauthenticated request returns `401 UNAUTHENTICATED` and persists nothing.
- **FR-3.2 — Manual entry only.** The endpoint MUST accept exactly one entry per request, as a JSON object. It MUST NOT accept an array, a multipart file, `text/csv`, or any batch wrapper. `Content-Type` other than `application/json` returns `415 UNSUPPORTED_MEDIA_TYPE`. There MUST be no second creation path (no import endpoint, no CLI import command, no adapter) (PRD §10 #6).
- **FR-3.3 — Atomicity.** Persistence, validation, exception opening, and all receipt audit entries MUST occur in a single transaction. If any step fails, the transaction rolls back entirely and the response is `500 RECEIPT_FAILED`; no orphan entry, no unvalidated entry, and no unaudited state change can exist (§4.3 #2, NFR-6).
- **FR-3.4 — Validation is unconditional and non-bypassable.** Every entry MUST be validated during its receipt transaction. There MUST be no request parameter, header, body flag, environment variable, or configuration switch that skips, defers, weakens, or re-runs validation (`?skip_validation`, `force=true`, and equivalents MUST NOT exist; an unknown field of that kind is rejected by FR-3.7).
- **FR-3.5 — Human provenance baseline.** Every submitted field value MUST be recorded with `HUMAN` origin (F0 FR-0.3). This is the baseline against which a later AI proposal and a later human edit are compared (NFR-4).
- **FR-3.6 — Entry immutability.** There MUST be no `PUT`, `PATCH`, or `DELETE` endpoint for a cargo entry, and no service method that updates `cargo_entries` after insert. The row is written exactly once, including its final `receipt_outcome`, inside the receipt transaction (Process step 4); the application database role holds no `UPDATE` privilege on the table at all. A specialist who needs different values records them as a resolution (F11) or submits a new entry.
- **FR-3.7 — Unknown fields rejected.** A body containing any property outside the fourteen-field set MUST be rejected with `422 REQUEST_MALFORMED` naming the unknown property. Silent ignoring is prohibited, because a silently dropped value would be absent from the audit record the specialist believes they created.
- **FR-3.8 — Empty-string handling.** An empty string, a whitespace-only string, and an absent property MUST be treated identically by F4 (all are "not provided") and MUST be recorded identically: the field is stored as `NULL` and receives **no** `cargo_entry_field_origins` row, because no value was provided to attribute.
- **FR-3.9 — Duplicate entry number.** `cargo_entries.entry_number` MUST be `UNIQUE` where non-null. A submission whose entry number already exists returns `409 ENTRY_NUMBER_DUPLICATE` and persists nothing. This is deliberately **not** a validation rule and therefore never produces an exception: a uniqueness test depends on database state rather than on the entry's content, and making it a rule would violate the determinism requirement (NFR-11, F4 FR-4.4). The response identifies the case reference of the existing entry so the specialist can navigate to it.
- **FR-3.10 — Receipt response is explicit.** The response MUST state the receipt outcome as a discriminated value (`receipt_outcome: "VALIDATED_CLEAN" | "EXCEPTION_OPENED"`), the `case_reference`, the full `validation` result with findings, and, when an exception was opened, `exception: { id, state, receipt_position }`. The specialist must never have to infer what happened to their entry (F6 depends on this).
- **FR-3.11 — Entry retrieval.** `GET /api/entries/{entryId}` MUST return the stored entry values, its `case_reference`, `received_at`, the submitting specialist's id and display name, per-field `HUMAN` origin, the validation result with findings, the `receipt_outcome`, and — if one exists — the exception's `id`, `state`, and `receipt_position`. The "current state" of an entry is derived: `receipt_outcome` plus the exception's state where applicable; there is no separate mutable entry-status column to drift out of sync.
- **FR-3.12 — No listing endpoint for entries.** There MUST be no `GET /api/entries` collection endpoint. The only list surface in the product is the receipt-ordered open-exception queue (F7); an entry list would be an unscoped browse/search surface that no requirement asks for.
- **FR-3.13 — Case reference allocation.** `case_reference` MUST be allocated as `CE-{YYYY}-{NNNNNN}` where `YYYY` is the UTC year of receipt and `NNNNNN` is a zero-padded value from a database sequence, unique across the deployment. Allocation MUST occur inside the receipt transaction, and the reference MUST be immutable.
- **FR-3.14 — Recommendation generation is post-commit and non-blocking.** The receipt response MUST NOT wait for AI generation. The `recommendations` row is created `PENDING` inside the transaction; generation is dispatched after commit (F9). AI provider failure MUST NOT affect receipt success (NFR-9).
- **FR-3.15 — Request size limit.** The request body MUST be limited to 64 KB; a larger body returns `413 REQUEST_TOO_LARGE`. This cap exists to bound a single typed entry, not to enable batching.
- **FR-3.16 — Idempotency of receipt.** Receipt is **not** idempotent and MUST NOT accept an idempotency key: two identical submissions are two distinct entries (and the second is rejected only if the entry number collides, per FR-3.9). The entry form prevents accidental double submission client-side (F6 FR-6.9, F2 FR-2.16 pattern).

---

**Inputs:**
- `POST /api/entries` body: the fourteen-field object above; every field optional; unknown fields rejected.
- `cargoexec_sid` cookie (required) and `X-CSRF-Token` header (required).
- `GET /api/entries/{entryId}`: `entryId` (uuid, path) — a non-uuid value returns `400 INVALID_IDENTIFIER`.

**Outputs:**
- `201` receipt response: `{ entry: {...}, case_reference, receipt_outcome, validation: { outcome, rule_set_version, evaluated_at, findings: [...] }, exception: { id, state, receipt_position } | null, next: { case_url | queue_url } }`
- `200` entry retrieval response (FR-3.11)
- Persisted `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, and — on failure — `exceptions` and a `PENDING` `recommendations` row
- Audit entries `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, and (on failure) `EXCEPTION_OPENED`

**Validation (structural — this feature; content rules are F4):**
- Body MUST be a JSON object (not array, not scalar) ⇒ else `422 REQUEST_MALFORMED`.
- Every property MUST be a member of the fourteen-field set ⇒ else `422 REQUEST_MALFORMED` (`unknown_field`).
- String fields MUST be JSON strings within their length limit ⇒ else `422` (`wrong_type` / `too_long`).
- `quantity` and `declared_value_usd` MUST be a JSON number or a numeric string parseable as a decimal within scale ⇒ else `422` (`not_numeric` / `too_many_decimals`). A value that parses but is zero, negative, or otherwise implausible is **not** a structural error — it is F4's business (rules `RIV-101` for quantity and `RIV-121` for declared value).
- `arrival_date` MUST be a string; if it is present and not a syntactically valid ISO calendar date it is stored as `NULL` and F4 reports `RIV-130` (missing) and/or `RIV-131` (invalid) — a malformed date MUST NOT become a `422`, because "the specialist typed the date wrongly" is exactly a required-information finding. (An over-length date string is still a `422`.)
- `mode_of_transport` structural check is length only; presence is F4's rule `RIV-040` and membership in the code list is `RIV-041`.

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| No session | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| Missing/invalid CSRF token | 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." |
| Non-JSON content type | 415 | `UNSUPPORTED_MEDIA_TYPE` | "Send this entry as JSON." |
| Body too large | 413 | `REQUEST_TOO_LARGE` | "This entry is too large to accept." |
| Unknown field, wrong type, over-length | 422 | `REQUEST_MALFORMED` | "The request could not be read." + per-field detail |
| Duplicate entry number | 409 | `ENTRY_NUMBER_DUPLICATE` | "Entry number {n} already exists on case {ref}." |
| Non-uuid entry id | 400 | `INVALID_IDENTIFIER` | "That identifier is not valid." |
| Entry not found | 404 | `ENTRY_NOT_FOUND` | "That entry could not be found." |
| Transaction failure at any receipt step | 500 | `RECEIPT_FAILED` | "The entry could not be received. Nothing was saved. Try again." |

Note: **no** error code in this table is produced by a required-information failure. A validation failure is a `201` with `receipt_outcome: "EXCEPTION_OPENED"` — it is a successful receipt with a business outcome, not an error.

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/entries` | session + CSRF | Receive one manually authored entry |
| `GET` | `/api/entries/{entryId}` | session | Retrieve one entry with its derived state |

Full schemas in `Y1-api.md` §2 Entries.

**Schema Surface (this feature):** writes `cargo_entries`, `cargo_entry_field_origins`; drives writes to `validation_results`, `validation_findings` (F4), `exceptions`, `recommendations` (F5/F9), `audit_entries`, `audit_entry_values` (F13). See `Y0-schema.md` §2 Entries.

**Acceptance Criteria:**
1. An entry submitted with only `goods_description` filled in returns `201` with `receipt_outcome: "EXCEPTION_OPENED"` and a case reference.
2. A complete, rule-satisfying entry returns `201` with `receipt_outcome: "VALIDATED_CLEAN"` and `exception: null`.
3. Forcing a failure in the audit writer during receipt leaves zero `cargo_entries` rows for that submission.
4. `POST /api/entries` with an array body, a CSV body, or a `skip_validation` property is rejected; no such capability exists.
5. Every non-empty submitted field has a `cargo_entry_field_origins` row with `origin = 'HUMAN'`; absent and whitespace-only fields have none.
6. A second submission reusing an entry number returns `409` and creates nothing.
7. Stopping the AI provider entirely does not change any receipt response.
8. No `PUT`/`PATCH`/`DELETE` route exists for entries, and no `GET /api/entries` collection route exists.

---
