## Epic 9: AI Resolution Recommendation Generation (F9)

A recommended resolution action plus a plain-language rationale, generated when the exception
opens, persisted as a proposal marked `AI`, and never applied to anything.

### US-9.1: Have a recommendation prepared for me without waiting for it
**As a** cargo specialist, **I want to** have the AI recommendation generated automatically as soon as my entry opens an exception, without it delaying my receipt response, **so that** a draft is usually waiting when I open the case and the entry form never hangs on a model call.

**Acceptance Criteria:**
- [ ] Given a receipt that opened an exception, when the transaction commits, then generation is dispatched only after commit, never inside the receipt transaction, and the receipt response does not wait for it.
- [ ] Given a dispatch failure, when it occurs, then it is logged and the already-committed receipt is unaffected.
- [ ] Given the `PENDING` recommendation, when generation succeeds, then the row transitions to `AVAILABLE` with `recommended_action`, `rationale`, `model_id`, `prompt_version`, `generated_at`, and `latency_ms`, plus one `recommendation_values` row per proposed value.
- [ ] Given the provider, when it is called, then the per-attempt timeout is 20 seconds with exactly one retry after 2 seconds on a timeout or retryable transport error (429, 5xx, connection failure), within a total budget of 45 seconds.
- [ ] Given the job is dispatched twice for one exception, when both run, then the row lock and the `PENDING`-only guard mean one recommendation and one audit entry exist.
- [ ] Given the generation workers, when a backlog exists, then no interactive response is delayed — generation runs with bounded concurrency off the HTTP request path.
- [ ] Given the API surface, when it is enumerated, then generation is triggered only by that post-commit hook: there is no endpoint, UI control, schedule, or batch job that triggers or re-triggers it, and none that triggers it for a closed case.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.2: Read a recommendation that is stored as a proposal, not as a change
**As a** cargo specialist, **I want to** have every AI-proposed value stored as a separate proposal marked `AI` and never written into my entry, **so that** nothing the machine produced can be mistaken for something I entered or for an applied outcome.

**Acceptance Criteria:**
- [ ] Given a generated recommendation, when storage is inspected, then proposals live in `recommendations`/`recommendation_values`, which share no column with `decisions`/`decision_values`, and no view or job copies one into the other.
- [ ] Given any generated recommendation, when the entry is compared before and after, then `cargo_entries` and `cargo_entry_field_origins` are byte-identical — no proposed value ever appears in the entry of record.
- [ ] Given each `recommendation_values` row, when it is read, then `origin = 'AI'` enforced by `CHECK (origin = 'AI')`, with no mechanism to mark a proposal human-originated at this stage.
- [ ] Given generation in either branch, when it completes, then the exception's `state` remains `OPEN`.
- [ ] Given `recommendations`, when constraints are inspected, then `UNIQUE (exception_id)` applies — one recommendation per exception, with no regenerate action, no alternatives list, and no recommendation history.
- [ ] Given a proposed value, when it is stored, then it is stored verbatim within the field's structural limit; an over-long proposal makes the response schema-invalid rather than being silently truncated.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.3: Know exactly what the AI said, and which model said it
**As a** cargo specialist, **I want to** have the recommended action, the rationale, the model identity, the prompt version, and the generation time preserved as recorded, **so that** the case can later answer "what did the AI say when the human decided" exactly as it was said.

**Acceptance Criteria:**
- [ ] Given a successful generation, when the record is read, then `model_id`, `prompt_version`, `generated_at`, and `latency_ms` are persisted on the recommendation and rendered on the case screen.
- [ ] Given the provider response, when it is validated, then `recommended_action` is 1–500 characters after trim (one plain-language sentence stating the action) and `rationale` is 1–2000 characters after trim, both non-empty.
- [ ] Given `proposed_values`, when they are validated, then each has a `field_name` in the fourteen-field entry set, a `proposed_value` within that field's structural limit, and a non-empty `addresses_rule_ids` array whose members are rule ids present in this exception's findings; duplicate field names and any additional top-level property make the response schema-invalid.
- [ ] Given the prompt, when it is reviewed, then it instructs plain language intelligible to a non-technical reader, with no rule identifiers as the explanation, no regular expressions, no internal codes, and no model self-reference.
- [ ] Given reaching `AVAILABLE`, when audit is checked, then exactly one `RECOMMENDATION_GENERATED` entry exists with `actor_type = 'AI'`, `actor_specialist_id = NULL`, `before_state = 'PENDING'`, `after_state = 'AVAILABLE'`, and one value row per proposed value whose `before_value` is my submitted value (`before_origin = 'HUMAN'`, or `NULL` where I provided none) and whose `after_value` is the proposal with `after_origin = 'AI'`.
- [ ] Given sampled recommendations during walkthrough, when reviewing specialists judge them, then 100% are rated plain-language and decision-useful (SM-9).

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.4: Keep working the case when the AI is unavailable
**As a** cargo specialist, **I want to** be able to resolve or reject a case with a full audit record when the model fails, times out, or returns something unusable, **so that** a third-party outage never blocks the governed loop.

**Acceptance Criteria:**
- [ ] Given the provider is stopped, when an entry is submitted, then receipt still succeeds, the recommendation becomes `UNAVAILABLE` with `failure_reason = 'PROVIDER_UNAVAILABLE'`, and the case is still fully resolvable with a complete audit record (SM-13).
- [ ] Given a terminal failure, when `failure_reason` is set, then it is one of `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `SCHEMA_INVALID`, `CONTENT_FILTERED`, `INTERNAL_ERROR`, each mapped to plain-language copy for the case screen.
- [ ] Given a provider error body, when the failure is recorded, then the raw provider text is not persisted on the recommendation and is never shown to me; it may be logged only with secrets redacted.
- [ ] Given reaching `UNAVAILABLE`, when audit is checked, then exactly one `RECOMMENDATION_UNAVAILABLE` entry exists with `actor_type = 'AI'`, `after_state = 'UNAVAILABLE'`, the `failure_reason`, and no value rows.
- [ ] Given an `UNAVAILABLE` case, when I decide it, then `EDIT_APPROVE` (a direct resolution with every value `HUMAN`) and `REJECT` are both available, each requiring a reason, while `APPROVE` is refused because there is nothing to approve.
- [ ] Given a terminal `UNAVAILABLE` status, when time passes or I revisit the case, then no background retry, scheduled re-attempt, retry-on-view, or "regenerate" control occurs or exists — a silent later retry would change what the case showed at decision time.
- [ ] Given a recommendation left `PENDING` by a process restart, when I open the case, then it presents as pending-then-stale and the case remains decidable; no sweeper or recovery scheduler resurrects it.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.5: Be certain the AI cannot decide, and cannot stray outside its remit
**As a** cargo specialist, **I want to** have the generation path structurally unable to write a decision, compute an excluded determination, or see my identity, **so that** the accountable decision is unavoidably mine and the model is given only what it needs.

**Acceptance Criteria:**
- [ ] Given the generation code path, when it is inspected, then it has no import of or reference to the decision service, and a test asserts this along with the absence of any AI principal row in `specialists`.
- [ ] Given a hypothetical attempt by the generation job to write a decision, when it executes, then `decisions.decided_by NOT NULL REFERENCES specialists(id)` fails, so an AI-resolved exception is structurally unrepresentable.
- [ ] Given a provider response containing an `hts_code`, `duty_amount`, tariff rate, admissibility ruling, penalty, or risk score field, when it is validated, then it is rejected as `SCHEMA_INVALID` and the case goes `UNAVAILABLE`; the prompt requests none of them.
- [ ] Given the provider request, when it is composed, then it contains the fourteen entry field values, the ordered findings, and the rule set version — and no session token, credential, specialist name, or specialist identifier.
- [ ] Given the provider API key, when logs, response bodies, and audit entries are searched, then it appears in none of them; it is supplied only by environment configuration and never committed to source.
- [ ] Given the `RecommendationProvider` interface, when a provider is swapped, then no change is required in exception creation, the queue, the case screen, the decision API, the decision UI, the audit writer, or the audit trail UI, and a test double can produce every outcome branch including each `failure_reason`.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.6: Know that the recommendation shown came from a real model, not the test fake
**As a** delivery sponsor, **I want to** see that the recommendation demonstrated to me was produced by a real hosted LLM rather than the deterministic fake used only for automated tests, **so that** the AI capability CargoExec is demonstrating is the genuine thing, not a scripted stand-in.

**Acceptance Criteria:**
- [ ] Given the demonstration/production deployment, when it starts, then it is configured with `AI_PROVIDER_URL` pointing at a real HTTPS LLM endpoint and a valid `AI_API_KEY`/`AI_MODEL_ID` — not the `fake:deterministic` provider (FR-9.20).
- [ ] Given the `fake:deterministic` provider, when its configuration is reviewed, then it appears only in the automated test suite's own configuration, never as the default, fallback, or unconfigured-state behaviour of a deployed environment (FR-9.20).
- [ ] Given this posture change, when the `RecommendationProvider` interface, retry/timeout logic, and output schema are reviewed, then none of them changed to introduce it — FR-9.20 governs deployment configuration only, not architecture (PRD §4.1, §5.4 F9 Phase 7 note).
- [ ] Given a walkthrough of the demonstrated case, when the recommended action and rationale are read, then they are the real model's own output — not a canned string returned by the deterministic fake — and the recorded `model_id` names the real provider's model, not a fake or test identifier.
- [ ] Given every other Epic 9 story (US-9.1 … US-9.5), when this posture change is applied, then their acceptance criteria are unaffected — degraded mode, provenance, provider abstraction, and audit behaviour are identical regardless of which concrete provider is configured.

**Priority:** P0 | **Feature Ref:** F9

---
