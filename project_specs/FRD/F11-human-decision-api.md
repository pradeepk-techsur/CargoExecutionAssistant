## F11: Human Decision Processing — Edit / Approve / Reject (API)

**Priority:** P0 · **Surface:** Programmatic API · **Dependencies:** F0, F1, F9, F13 · **PRD trace:** §5.5 F11, §4.3 #1, NFR-4, NFR-5, NFR-6, SM-3, SM-4, SM-5, R-1, R-5, R-11

**Description:** F11 is the server-side enforcement of the accountable human decision. An exception's state changes only through this capability, and only when the request carries an explicit decision from an authenticated specialist: **approve** the recommendation as proposed, **edit** it and approve the modified resolution, or **reject** it. Edits and rejections require a non-empty reason, stored as part of the decision so the record explains itself. Values the specialist changed are recorded with `HUMAN` origin while untouched approved values retain `AI` origin, which is what makes "what did the human change" answerable per value. There is no auto-apply path, and no scheduled or system actor that can resolve a case.

### Why no recommendation can auto-apply — the structural argument

This is the product's central guarantee, and it is structural rather than procedural. Four independent facts combine:

1. **A recommendation is a different record from a resolution.** Proposals live in `recommendations`/`recommendation_values`; resolutions live in `decisions`/`decision_values` (F9 FR-9.1). No column is shared, and no view or job copies one into the other.
2. **Only a decision closes an exception.** `exceptions.state` is written by exactly one code path — this handler — and the deferred constraint trigger of F0 FR-0.9 refuses any commit that moves an exception out of `OPEN` without a `decisions` row whose `resulting_state` matches.
3. **A decision requires a human identity.** `decisions.decided_by` is `NOT NULL REFERENCES specialists(id)`, populated solely from the authenticated request principal (F1 FR-1.6), never from the request body. The AI has no `specialists` row, so an AI-authored decision fails a foreign key.
4. **There is no non-request actor.** No scheduled job, worker, queue consumer, retry path, database trigger, or migration writes `decisions` or `exceptions.state`. The generation job (F9) has no access to the decision service.

Therefore "the AI resolved it" is not a reachable state, and the absence of an auto-apply path is verified by test rather than asserted (NFR-5, SM-4).

**Terminology (feature-specific):**
- **Decision type:** `APPROVE`, `EDIT_APPROVE`, or `REJECT`. Closed set; no other value is accepted.
- **Resolution values:** the accepted corrected field values recorded on `decision_values`, each with an origin and the prior value. They are the resolution; the entry of record is never overwritten (F3 FR-3.6).
- **Re-stamping:** the act of assigning `HUMAN` origin to a value the specialist changed from the AI's proposal, while values left identical retain `AI`.
- **Direct resolution:** an `EDIT_APPROVE` on a case with no available recommendation, where every resolution value is specialist-authored and therefore `HUMAN`.
- **Decision conflict:** an attempt to decide a case that already has a decision.

---

### Process — Decision

1. Middleware authenticates and verifies CSRF (F1). Unauthenticated ⇒ `401`, no state change, no audit entry.
2. Handler validates the request body shape and the decision-type-specific rules (see Validation). Any failure ⇒ `4xx`, **nothing written, no audit entry**.
3. If an `Idempotency-Key` header is present and a decision already exists for this exception with the same key, the handler returns the original `201` body with `idempotent_replay: true` and writes nothing (FR-11.11).
4. Transaction `BEGIN`.
5. `SELECT ... FROM exceptions WHERE id = :id FOR UPDATE` — serialises concurrent decisions on one case.
6. If `state <> 'OPEN'` ⇒ rollback, `409 EXCEPTION_ALREADY_DECIDED` with the existing decision's type, actor, and timestamp.
7. Load the recommendation. For `APPROVE`, require `status = 'AVAILABLE'`; otherwise ⇒ rollback, `409 RECOMMENDATION_NOT_AVAILABLE`.
8. Take the case-anchor row lock used for audit sequencing (F13).
9. Compute the resolution value set and each value's origin (FR-11.7, FR-11.8).
10. Insert `decisions`: `exception_id`, `decision_type`, `decided_by = principal.id`, `decided_at = now()`, `reason`, `recommendation_id` (null for a direct resolution), `resulting_state`.
11. Insert one `decision_values` row per resolution value: `field_name`, `value`, `origin`, `prior_value`, `prior_origin`, `changed_from_proposal` (boolean).
12. Update `exceptions`: `state = resulting_state`, `closed_at = now()`, `decision_id`.
13. Write exactly one audit entry via F13 — `RECOMMENDATION_APPROVED`, `RECOMMENDATION_EDITED_AND_APPROVED`, or `RECOMMENDATION_REJECTED` — with `actor_type = 'SPECIALIST'`, the actor id, `before_state = 'OPEN'`, `after_state = resulting_state`, the reason, and one `audit_entry_values` row per resolution value carrying before/after values and before/after origins.
14. `COMMIT`. F0's deferred triggers verify at this point that the state change has a matching human decision (`HITL_VIOLATION` otherwise) and exactly one audit entry (`AUDIT_COUPLING_VIOLATION` otherwise).
15. Return `201` with the recorded decision, the new exception state, and the resolution values with their origins.

---

### Functional Requirements

- **FR-11.1 — Decisions are the only writer of resolution and state.** This handler MUST be the only code path that inserts `decisions`/`decision_values` and the only one that writes `exceptions.state`, `closed_at`, and `decision_id`.
- **FR-11.2 — Explicit decision required.** The request MUST carry an explicit `decision_type`. There MUST be no default, no inferred decision, no "accept all", no empty-body semantics, and no endpoint that resolves a case without naming the decision.
- **FR-11.3 — Approve.** `APPROVE` adopts the recommendation exactly as proposed. Resolution values MUST be copied from `recommendation_values` server-side; the client MUST NOT supply values with an approval (a body containing `resolution_values` with `APPROVE` ⇒ `422 RESOLUTION_VALUES_NOT_ALLOWED`). Every resolution value retains `origin = 'AI'`, because the human adopted the machine's value unchanged — the human's contribution is the *decision*, recorded on `decisions.decided_by`, not an authorship claim over the values.
- **FR-11.4 — Edit-and-approve.** `EDIT_APPROVE` adopts a specialist-modified resolution. The body MUST contain `resolution_values` and a `reason`. Changed values are re-stamped `HUMAN`; values identical to the proposal retain `AI` (FR-11.8).
- **FR-11.5 — Reject.** `REJECT` closes the case without adopting the recommendation. The body MUST contain a `reason` and MUST NOT contain `resolution_values` (⇒ `422 RESOLUTION_VALUES_NOT_ALLOWED`). No `decision_values` rows are written, because nothing was adopted; the audit entry records the rejection with its reason and the values that were declined as `before_value` detail.
- **FR-11.6 — Permitted decisions by recommendation status.** With an `AVAILABLE` recommendation: `APPROVE`, `EDIT_APPROVE`, `REJECT`. With `PENDING` or `UNAVAILABLE`: `EDIT_APPROVE` (direct resolution) and `REJECT` only — there is nothing to approve, so `APPROVE` ⇒ `409 RECOMMENDATION_NOT_AVAILABLE`. This guarantees loop completability in degraded mode (NFR-9, SM-13) without ever letting an absent recommendation be "approved".
- **FR-11.7 — Resolution value set completeness.** For `EDIT_APPROVE` **with** a recommendation, `resolution_values` MUST contain exactly the `field_name` set of the recommendation's proposed values — no additions, no omissions (⇒ `422 RESOLUTION_VALUES_INCOMPLETE`, naming missing and unexpected fields). Requiring the full set removes all ambiguity about whether an omitted field was left unchanged or deliberately dropped, so per-value provenance is never inferred. For a **direct resolution** (no available recommendation), `resolution_values` MUST contain at least one field, and every `field_name` MUST be a member of the F3 entry field set.
- **FR-11.8 — Provenance computation (normative).** For each supplied resolution value, the server compares the submitted value with the AI's proposed value for the same field using canonical string comparison (trim leading/trailing whitespace; compare byte-for-byte thereafter; a null/absent proposal is unequal to any non-empty value):
  - equal ⇒ `origin = 'AI'`, `changed_from_proposal = false`
  - not equal ⇒ `origin = 'HUMAN'`, `changed_from_proposal = true`
  - no proposal exists for that field (direct resolution, or a field the AI did not propose) ⇒ `origin = 'HUMAN'`, `changed_from_proposal = true`
  
  `prior_value` MUST be set to the AI's proposed value where one exists, otherwise to the entry's submitted value, otherwise null; `prior_origin` MUST be `'AI'`, `'HUMAN'`, or null correspondingly. Origin MUST NOT be accepted from the client under any circumstance — a body containing an `origin` property is rejected as an unknown field (FR-11.15). Zero unattributed values may exist (SM-3).
- **FR-11.9 — Mandatory reason on edit and reject.** `reason` MUST be present, and after trimming MUST be ≥ 10 and ≤ 2000 characters, for `EDIT_APPROVE` and `REJECT`. Absent, empty, whitespace-only, or shorter than 10 characters ⇒ `422 REASON_REQUIRED` (with a distinct detail for too-short). The minimum length is a deliberate, testable guard against a single-character formality (R-8). `APPROVE` MAY carry a reason (stored if present, same length bounds); it is not required, because approving the proposal as-is adds no divergence to explain. The same rule is enforced independently at the database (F0 FR-0.15), so an API bypass cannot record a reasonless edit or rejection.
- **FR-11.10 — One decision per case, ever.** `UNIQUE (exception_id)` on `decisions` plus the `FOR UPDATE` lock make double and concurrent decisions impossible. A second attempt ⇒ `409 EXCEPTION_ALREADY_DECIDED`, including the existing decision's type, deciding specialist display name, and timestamp so the UI can explain what happened (R-11). No reopen, amend, undo, correct, or supersede operation exists — the append-only record means a mistaken decision is addressed by a new case, not by rewriting history.
- **FR-11.11 — Idempotency.** The endpoint SHOULD accept an `Idempotency-Key` header (≤ 128 chars). Persisted on `decisions.idempotency_key` with `UNIQUE (exception_id, idempotency_key)`, a replay with the same key and the same exception returns the original `201` body with `idempotent_replay: true` and writes nothing — no second decision, no second audit entry. A replay with the same key but a *different* body ⇒ `409 IDEMPOTENCY_KEY_REUSED`. Requests without the header are processed normally, with FR-11.10 as the backstop.
- **FR-11.12 — Transactional coupling.** The decision insert, the value inserts, the exception update, and the audit entry MUST commit together or not at all (NFR-6). A failure at any step leaves the case `OPEN` with no decision and no audit entry.
- **FR-11.13 — Exactly one audit entry.** Exactly one audit entry MUST be written per decision, with the action matching the decision type. A decision with zero or two entries MUST be impossible (F0 FR-0.10d, SM-6).
- **FR-11.14 — Actor from session only.** `decided_by` MUST come from the authenticated principal. The endpoint MUST reject any body property naming an actor (`decided_by`, `actor`, `on_behalf_of`, `specialist_id`) as an unknown field. No impersonation or delegation mechanism exists — there is one role and no supervisor (F1 FR-1.1).
- **FR-11.15 — Unknown fields rejected.** Any property outside `{decision_type, reason, resolution_values, recommendation_id}` ⇒ `422 REQUEST_MALFORMED`. In `resolution_values` items, any property outside `{field_name, value}` is likewise rejected — which is what blocks a client-supplied `origin`.
- **FR-11.16 — Recommendation reference consistency.** If the body supplies `recommendation_id`, it MUST equal the case's current recommendation id; a mismatch ⇒ `409 RECOMMENDATION_MISMATCH`. This lets the client assert "I decided on the proposal I was shown" and makes a stale-tab approval detectable rather than silent.
- **FR-11.17 — Value length limits.** Each `value` MUST respect the F3 structural limit for its field; a longer value ⇒ `422 REQUEST_MALFORMED`. Values are stored as supplied after trimming leading/trailing whitespace only, so the record shows what the specialist typed.
- **FR-11.18 — Entry of record untouched.** The handler MUST NOT write `cargo_entries` or `cargo_entry_field_origins`. The resolution is the corrected set; the submitted entry remains exactly as received, which is what allows the audit trail to show before and after (F3 FR-3.6).
- **FR-11.19 — Findings untouched.** The handler MUST NOT modify, close, resolve, annotate, or delete `validation_findings`. The stated basis of the exception survives the decision unchanged (F5 FR-5.5).
- **FR-11.20 — No bulk decision.** The endpoint MUST accept exactly one decision for exactly one exception. There MUST be no batch, multi-case, or "approve all" endpoint or parameter — a bulk approval is precisely the rubber-stamping the human-in-the-loop requirement exists to prevent (R-1).
- **FR-11.21 — Response content.** The `201` response MUST return the recorded decision (id, type, `decided_at`, deciding specialist id and display name, reason), the resulting exception state, the resolution values with per-value `origin`, `prior_value`, and `changed_from_proposal`, the `audit_entry_id` written, and `idempotent_replay`. The client therefore confirms what was recorded from the server's record, not from its own optimistic assumption (F12 FR-12.10).

---

**Inputs:**

`POST /api/exceptions/{exceptionId}/decision`

| Field | Type | Required | Notes |
|---|---|---|---|
| `decision_type` | enum `APPROVE` \| `EDIT_APPROVE` \| `REJECT` | yes | Closed set; no default |
| `reason` | string | for `EDIT_APPROVE`, `REJECT` | 10–2000 chars after trim; optional on `APPROVE` |
| `resolution_values` | array of `{ field_name, value }` | for `EDIT_APPROVE` | Prohibited for `APPROVE` and `REJECT` |
| `recommendation_id` | uuid | no | If supplied, must match the case's recommendation |

Headers: `cargoexec_sid` cookie (required), `X-CSRF-Token` (required), `Idempotency-Key` (optional). Path: `exceptionId` (uuid or case reference).

**Outputs:**
- `201` with the recorded decision, resulting state, per-value provenance, and `audit_entry_id`
- Persisted `decisions` row and `decision_values` rows (none for `REJECT`)
- Updated `exceptions` row in a terminal state
- Exactly one audit entry with one value row per resolution value
- No other write of any kind

**Validation:**
- `decision_type` present and within the closed set ⇒ else `422 REQUEST_MALFORMED`.
- `reason` present and 10–2000 chars after trim for `EDIT_APPROVE`/`REJECT` ⇒ else `422 REASON_REQUIRED`.
- `resolution_values` present and non-empty for `EDIT_APPROVE`; absent for `APPROVE` and `REJECT` ⇒ else `422 RESOLUTION_VALUES_NOT_ALLOWED`.
- With a recommendation: `resolution_values` field set exactly equals the proposal's field set ⇒ else `422 RESOLUTION_VALUES_INCOMPLETE`.
- Every `field_name` is a member of the F3 entry field set; no duplicates ⇒ else `422 REQUEST_MALFORMED`.
- Every `value` within its field's structural limit ⇒ else `422 REQUEST_MALFORMED`.
- Exception exists ⇒ else `404 EXCEPTION_NOT_FOUND`; is `OPEN` ⇒ else `409 EXCEPTION_ALREADY_DECIDED`.
- For `APPROVE`: recommendation `AVAILABLE` ⇒ else `409 RECOMMENDATION_NOT_AVAILABLE`.
- `recommendation_id`, if supplied, matches ⇒ else `409 RECOMMENDATION_MISMATCH`.
- No unknown property anywhere in the body ⇒ else `422 REQUEST_MALFORMED`.

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| No session | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| Missing/invalid CSRF token | 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." |
| Case not found | 404 | `EXCEPTION_NOT_FOUND` | "That case could not be found." |
| Case already decided | 409 | `EXCEPTION_ALREADY_DECIDED` | "This case was already {resolved/rejected} by {name} on {date}." |
| Approve with no available recommendation | 409 | `RECOMMENDATION_NOT_AVAILABLE` | "There is no AI recommendation to approve. Edit and approve, or reject." |
| Stale recommendation reference | 409 | `RECOMMENDATION_MISMATCH` | "The recommendation changed. Reload the case and review it again." |
| Idempotency key reused with a different body | 409 | `IDEMPOTENCY_KEY_REUSED` | "That request identifier was already used for a different decision." |
| Missing or too-short reason | 422 | `REASON_REQUIRED` | "Enter a reason of at least 10 characters for this {edit/rejection}." |
| Values sent with approve or reject | 422 | `RESOLUTION_VALUES_NOT_ALLOWED` | "Resolution values cannot be sent with this decision." |
| Value set incomplete or unexpected | 422 | `RESOLUTION_VALUES_INCOMPLETE` | "Include every recommended field. Missing: {list}." |
| Unknown field / wrong type / too long | 422 | `REQUEST_MALFORMED` | "The request could not be read." |
| Audit or coupling failure at commit | 500 | `DECISION_FAILED` | "The decision could not be recorded. Nothing was saved. Try again." |

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/exceptions/{exceptionId}/decision` | session + CSRF | Record the one human decision that closes the case |

No `PUT`, `PATCH`, or `DELETE` on decisions exists. Full schemas in `Y1-api.md` §4 Decisions.

**Schema Surface (this feature):** writes `decisions` (exception_id UNIQUE, decision_type, decided_by NOT NULL → specialists, decided_at, reason, recommendation_id, resulting_state, idempotency_key) and `decision_values` (decision_id, field_name, value, origin, prior_value, prior_origin, changed_from_proposal); updates `exceptions.state/closed_at/decision_id`; writes `audit_entries`/`audit_entry_values` via F13. See `Y0-schema.md` §6 Decisions.

**Acceptance Criteria:**
1. `APPROVE` on an available recommendation resolves the case with every resolution value `origin = 'AI'` and exactly one `RECOMMENDATION_APPROVED` audit entry.
2. `EDIT_APPROVE` changing one of three proposed values records that value `HUMAN` and the other two `AI`, with `prior_value` populated on all three.
3. `EDIT_APPROVE` or `REJECT` with `reason: ""`, `"   "`, `"ok"`, or the field absent returns `422 REASON_REQUIRED`, leaves the case `OPEN`, and writes no audit entry.
4. Two concurrent decisions on one case yield exactly one `201` and one `409`; the database contains one decision and one audit entry.
5. `APPROVE` on an `UNAVAILABLE` recommendation returns `409`; `EDIT_APPROVE` on the same case succeeds with all values `HUMAN` and resolves it (SM-13).
6. A body containing `origin`, `decided_by`, or `applied: true` is rejected as malformed.
7. Direct SQL setting `exceptions.state = 'RESOLVED'` without a decision fails at commit (`HITL_VIOLATION`).
8. A repository-wide search finds exactly one code path writing `exceptions.state`, and no scheduler, worker, or job references the decision service (SM-4).
9. After any decision, `cargo_entries` and `validation_findings` for that case are byte-identical to before.
10. Replaying a request with the same `Idempotency-Key` returns the original decision with `idempotent_replay: true` and creates no second audit entry.

---
