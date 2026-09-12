## F9: AI Resolution Recommendation Generation

**Priority:** P0 · **Surface:** Integrations / Background-async · **Dependencies:** F0, F5, F13 · **PRD trace:** §5.4 F9, NFR-4, NFR-9, SM-9, SM-13, R-1, R-6

**Description:** F9 generates a recommended resolution action for an exception together with a plain-language rationale explaining why that action is recommended. The AI is consumed through a hosted model API behind a provider abstraction; there is no training and no fine-tuning infrastructure (PRD §10 #11). The recommendation is a **draft only**: it is persisted as a proposal attached to the case, every proposed value is marked `AI` in origin, and it never mutates the entry or the exception state. Generation is triggered by the exception coming into being, and its result is recorded with the model identity, prompt version, and timestamp, so the record can later answer "what did the AI say" exactly as it was said. If the provider is unavailable, slow, or returns something unusable, the case remains fully workable and the human decision path is unaffected.

**Terminology (feature-specific):**
- **Provider abstraction:** the internal `RecommendationProvider` interface (`generate(request) → RecommendationDraft`) behind which the hosted model client sits. The decision and audit layers depend only on this interface.
- **Recommendation draft:** the provider's parsed, schema-valid output: a recommended action, a rationale, and proposed field values with the rule ids each addresses.
- **Proposed value:** a field value the AI suggests, stored on `recommendation_values` with `origin = 'AI'` (constant-checked) and never written into `cargo_entries`.
- **Degraded mode:** the terminal `UNAVAILABLE` recommendation status, reached when generation cannot produce a usable draft. The case is still decidable.
- **Generation attempt:** one dispatch of the generation job for one exception, including its internal transport retry.

**Sub-features:**
- Recommendation request composed from entry values and validation findings
- Recommended resolution action plus plain-language rationale
- Proposed values persisted with `AI` provenance, never applied
- Model identity, prompt version, and generation timestamp recorded
- Audit entry on each terminal outcome via F13
- Degraded mode that never blocks the human decision path
- Provider abstraction permitting substitution without touching decision or audit layers

---

### Process — Generation

1. F3 commits the receipt transaction, which created the exception and a `PENDING` recommendation row (F5).
2. **After commit**, F3 dispatches an in-process background job for that `exception_id`. Dispatch failure MUST be logged and MUST NOT affect the already-committed receipt.
3. The job loads the exception, the entry values, and the findings. If the recommendation row is no longer `PENDING`, the job exits without effect (idempotence).
4. The job composes the request: the fourteen entry field values as submitted, the ordered findings (`rule_id`, `field_name`, `failure_code`, `message`), the `rule_set_version`, and the prompt template identified by `prompt_version`.
5. The job calls the provider with a 20-second per-attempt timeout. On a timeout or a retryable transport error (HTTP 429, 5xx, connection failure) it makes **one** retry after a 2-second delay. Total budget 45 seconds.
6. The response is parsed against the output schema (FR-9.7). A parse or schema failure is terminal for the attempt — it is not retried, because a schema-invalid response is not a transient condition.
7. **Success:** in one transaction, update the recommendation row to `status = 'AVAILABLE'` with `recommended_action`, `rationale`, `model_id`, `prompt_version`, `generated_at`, `latency_ms`; insert one `recommendation_values` row per proposed value; write the `RECOMMENDATION_GENERATED` audit entry via F13. Commit.
8. **Failure:** in one transaction, update the recommendation row to `status = 'UNAVAILABLE'` with `failure_reason`, `failed_at`, and the `model_id`/`prompt_version` attempted; write the `RECOMMENDATION_UNAVAILABLE` audit entry via F13. Commit.
9. In both branches the exception's `state` MUST remain `OPEN` and `cargo_entries` MUST be untouched.

---

### Functional Requirements

- **FR-9.1 — A recommendation is a proposal, structurally.** The recommendation MUST be persisted in `recommendations`/`recommendation_values`, which are **separate tables from `decisions`/`decision_values`**. No column of `recommendations` participates in the exception's state, and no read path presents a recommendation as a resolution. This separation is the structural reason a recommendation cannot auto-apply: applying one would require a `decisions` row, and only F11 — invoked by an authenticated human — writes one (F11 FR-11.1, F0 FR-0.9).
- **FR-9.2 — The AI cannot write a decision.** The generation job MUST have no access to the decision service, and `decisions.decided_by` is `NOT NULL REFERENCES specialists(id)` with no AI or system account in that table. Even a compromised or buggy generation path therefore cannot resolve a case; the attempt fails on a foreign key (NFR-5, SM-4).
- **FR-9.3 — Entry of record untouched.** Generation MUST NOT write to `cargo_entries` or `cargo_entry_field_origins` under any circumstance. Proposed values live only on `recommendation_values`.
- **FR-9.4 — Origin is `AI`, always.** Every `recommendation_values` row MUST carry `origin = 'AI'`, enforced by `CHECK (origin = 'AI')` (F0 FR-0.3). There is no mechanism to mark a proposed value as human-originated at this stage.
- **FR-9.5 — One recommendation per exception.** `UNIQUE (exception_id)` applies. v1 has no regenerate action, no alternatives list, and no recommendation history; a specialist who disagrees edits or rejects (F11), which is the accountable act the product exists to record.
- **FR-9.6 — Trigger is exception creation only.** Generation MUST be dispatched only by the post-commit hook of a receipt that opened an exception. There MUST be no endpoint, UI control, schedule, or batch job that triggers generation, and none that triggers it for a closed case.
- **FR-9.7 — Output contract.** The provider response MUST be validated against this schema before persistence; any violation ⇒ `UNAVAILABLE` with `failure_reason = 'SCHEMA_INVALID'`:
  - `recommended_action` (string, 1–500 chars after trim) — one plain-language sentence stating the action to take
  - `rationale` (string, 1–2000 chars after trim) — plain-language explanation referencing the unsatisfied rules in ordinary words
  - `proposed_values` (array, 0–14 items) of `{ field_name, proposed_value, addresses_rule_ids }` where `field_name` is a member of the F3 entry field set, `proposed_value` is a string within that field's structural limit, and `addresses_rule_ids` is a non-empty array of rule ids present in this exception's findings
  - Duplicate `field_name` entries MUST be rejected as schema-invalid
  - Any additional top-level property MUST be rejected
- **FR-9.8 — No computation of excluded determinations.** The prompt MUST NOT request, and the output schema MUST NOT accept, a duty amount, tariff rate, HTS or classification code, admissibility ruling, penalty, or risk score. A `field_name` outside the fourteen-field set — including any classification field — makes the response schema-invalid (PRD §10 #9).
- **FR-9.9 — Rationale quality.** The prompt MUST instruct plain language intelligible to a non-technical reader: no rule identifiers as the explanation, no regular expressions, no internal codes, no model self-reference. Intelligibility is judged by reviewing specialists during walkthrough (SM-9).
- **FR-9.10 — Provenance metadata recorded.** `model_id` (provider model identifier and version string), `prompt_version` (template identifier), `generated_at`, and `latency_ms` MUST be persisted on the recommendation and rendered by F10, so the record states which model said what, when.
- **FR-9.11 — Exactly one audit entry per terminal outcome.** Reaching `AVAILABLE` MUST write exactly one `RECOMMENDATION_GENERATED` entry with `actor_type = 'AI'`, `actor_specialist_id = NULL`, `before_state = 'PENDING'`, `after_state = 'AVAILABLE'`, and one `audit_entry_values` row per proposed value (`before_value` = the entry's current value for that field, `before_origin = 'HUMAN'` or `NULL` if never provided; `after_value` = the proposed value, `after_origin = 'AI'`). Reaching `UNAVAILABLE` MUST write exactly one `RECOMMENDATION_UNAVAILABLE` entry with `actor_type = 'AI'`, `after_state = 'UNAVAILABLE'`, `recommendation_id` set, and no value rows; the `failure_reason` is recorded on `recommendations.failure_reason` and read back through that reference, never copied onto the audit entry (no audit column exists for it). `PENDING` creation writes no entry of its own (F5 FR-5.12).
- **FR-9.12 — Degraded mode never blocks the loop.** Provider unavailability, latency, or malformed output MUST NOT block entry creation, validation, exception opening, queue listing, the human decision path, or audit writing (NFR-9). An `UNAVAILABLE` case MUST remain decidable via `EDIT_APPROVE` (the specialist authors the resolution values themselves, all `HUMAN` origin) or `REJECT`, both requiring a reason (F11 FR-11.6, SM-13).
- **FR-9.13 — Failure reasons are enumerated.** `failure_reason` MUST be one of `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `SCHEMA_INVALID`, `CONTENT_FILTERED`, `INTERNAL_ERROR`. Each maps to plain-language copy in F10; the raw provider error body MUST NOT be shown to the specialist and MUST NOT be persisted in the recommendation row (it may be logged with secrets redacted).
- **FR-9.14 — No automatic retry after a terminal outcome.** Once `UNAVAILABLE`, there MUST be no background retry, scheduled re-attempt, retry-on-view, or UI "regenerate" button. A silent later retry would change what the case showed at decision time and undermine the audit record's account of what the AI said when the human decided.
- **FR-9.15 — Provider abstraction.** The hosted-model client MUST sit behind the `RecommendationProvider` interface. Swapping providers MUST require no change to F5, F7, F10, F11, F12, F13, or F14. The interface MUST NOT expose provider-specific types to callers, and a test double MUST be able to produce every outcome branch, including each `failure_reason`.
- **FR-9.16 — Credentials and data handling.** The provider API key MUST come from environment configuration, never from source control, and MUST never appear in logs, error messages, responses, or audit entries (NFR-8). Requests to the provider MUST NOT include session tokens, specialist credentials, specialist names, or specialist identifiers — the model receives entry content and findings only. Data handling is documented in `Y3-integrations.md`.
- **FR-9.17 — Concurrency and idempotence.** The job MUST take a row lock on the recommendation and act only while `status = 'PENDING'`, so a duplicate dispatch performs no second write and produces no second audit entry.
- **FR-9.18 — Bounded resource use.** Generation MUST run with a bounded worker concurrency and MUST NOT block the HTTP request path. A backlog MUST NOT delay any interactive response (NFR-10); pending cases simply display as pending in F10.
- **FR-9.19 — Process restart.** A recommendation left `PENDING` by a process restart MUST be presented as pending-then-stale by F10 (FR-10.7) rather than resurrected by a sweeper job: v1 has no recovery scheduler, and a case with no recommendation is fully decidable. This is a deliberate simplification consistent with degraded mode.

---

**Inputs (internal):**
- `exception_id` (uuid) with `recommendations.status = 'PENDING'`
- Entry values (fourteen fields, as submitted) and per-field origins
- Ordered findings from F4 with `rule_set_version`
- Prompt template (`prompt_version`), provider configuration (endpoint, `model_id`, timeout, API key)

**Outputs:**
- Updated `recommendations` row in a terminal status (`AVAILABLE` or `UNAVAILABLE`) with provenance metadata
- Zero or more `recommendation_values` rows, each `origin = 'AI'`
- Exactly one audit entry: `RECOMMENDATION_GENERATED` or `RECOMMENDATION_UNAVAILABLE`
- No change to entry, validation, or exception state

**Validation:**
- Response MUST satisfy the FR-9.7 schema; otherwise terminal `SCHEMA_INVALID`.
- Every `field_name` MUST be in the entry field set; every `addresses_rule_ids` element MUST be a `rule_id` present in this exception's findings; otherwise schema-invalid.
- `proposed_value` MUST respect the field's structural limit; a longer value is schema-invalid rather than truncated, so the record never shows a silently altered proposal.
- `recommended_action` and `rationale` MUST be non-empty after trim.
- The job MUST refuse to run for an exception in a terminal state (defensive; unreachable via the normal trigger).

**Error States:**

| Scenario | Recommendation status | `failure_reason` | Effect on the case |
|---|---|---|---|
| Provider timeout after retry | `UNAVAILABLE` | `PROVIDER_TIMEOUT` | Decidable via edit-and-approve or reject |
| Provider 5xx / connection failure | `UNAVAILABLE` | `PROVIDER_UNAVAILABLE` | Decidable |
| Provider 429 after retry | `UNAVAILABLE` | `PROVIDER_RATE_LIMITED` | Decidable |
| Invalid/expired API key (401/403) | `UNAVAILABLE` | `PROVIDER_AUTH_FAILED` | Decidable; key never logged |
| Response fails output schema | `UNAVAILABLE` | `SCHEMA_INVALID` | Decidable |
| Provider content filter blocked the response | `UNAVAILABLE` | `CONTENT_FILTERED` | Decidable |
| Unexpected internal error in the job | `UNAVAILABLE` | `INTERNAL_ERROR` | Decidable |
| Job never ran (dispatch lost, restart) | remains `PENDING` | — | Decidable; F10 shows pending/stale |

In no row of this table does the exception's state change, and in no row is the specialist prevented from deciding.

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/exceptions/{id}/recommendation` | session | Read the recommendation's current status and content, for F10 to poll while `PENDING` |

There is deliberately **no** `POST`/`PUT` recommendation endpoint, no regenerate endpoint, and no apply endpoint. Full schemas in `Y1-api.md` §4 Recommendation.

**Schema Surface (this feature):** writes `recommendations` (exception_id, status, requested_at, recommended_action, rationale, model_id, prompt_version, generated_at, latency_ms, failure_reason, failed_at) and `recommendation_values` (recommendation_id, field_name, proposed_value, origin `CHECK = 'AI'`, addresses_rule_ids). See `Y0-schema.md` §5 Recommendations.

**Acceptance Criteria:**
1. Opening an exception produces a `PENDING` recommendation that becomes `AVAILABLE` with an action, a rationale, and proposed values marked `AI`.
2. No proposed value ever appears in `cargo_entries`; the entry row is byte-identical before and after generation.
3. With the provider stopped, receipt still succeeds, the recommendation becomes `UNAVAILABLE` with `PROVIDER_UNAVAILABLE`, and the case is still resolvable with a full audit record (SM-13).
4. A provider response containing an `hts_code` or `duty_amount` field is rejected as schema-invalid and the case goes `UNAVAILABLE`.
5. Exactly one audit entry exists per terminal recommendation outcome, with `actor_type = 'AI'` and `actor_specialist_id` null.
6. The generation code path has no import of, or reference to, the decision service; a test asserts this and asserts that no AI principal exists in `specialists`.
7. Dispatching the job twice for one exception produces one recommendation and one audit entry.
8. No log line, response body, or audit entry contains the provider API key.

---
