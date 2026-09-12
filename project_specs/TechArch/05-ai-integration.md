## 5. AI Integration Design

### 5.1 What the AI is, architecturally

The AI is a **stateless, outbound, request/response drafting service** that produces a proposal record. It is not a participant in the case lifecycle. Expressed as capabilities:

| The AI *can* | The AI *cannot* |
|---|---|
| Read the fourteen entry values and the ordered validation findings for one exception | Read any specialist identity, session, credential, or audit entry |
| Return a recommended action, a plain-language rationale, and proposed field values | Write `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, or `validation_findings` |
| Cause one `recommendations` row to reach `AVAILABLE` or `UNAVAILABLE`, with `recommendation_values` marked `origin='AI'` | Write `decisions` or `decision_values`, or change `exceptions.state` — by code path, by foreign key, by trigger, **and** by database privilege |
| Cause exactly one `RECOMMENDATION_GENERATED` or `RECOMMENDATION_UNAVAILABLE` audit entry | Update or delete any audit entry, or write an audit entry with a `SPECIALIST` actor |
| Fail — visibly, terminally, and without blocking anything | Retry itself after a terminal outcome, be re-triggered from the UI, or be regenerated |

### 5.2 Component topology

```
 receipt transaction COMMITs
          │
          │ post-commit dispatch (fire-and-forget, logged, never awaited)
          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ai/worker.ts        in-process · bounded concurrency (default 2)     │
 │   • accepts dispatch(exceptionId) only from receipt.service          │
 │   • no scheduler, no cron, no sweeper, no queue, no retry loop       │
 │   • connection pool: cargoexec_ai  ← cannot write decisions (A-1)    │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │ RecommendationRequest  (entry values + findings only)
                 ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ai/provider.ts      interface RecommendationProvider                 │
 │   generate(req) → ProviderResult  (ok:draft | ok:false:failure)      │
 │   The ONLY type surface the rest of the system sees. No method here  │
 │   writes anything or references a decision or an exception state.    │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │ (the only implementation, and the only module
                 │  permitted to import an HTTP client for this purpose)
                 ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ai/adapter.http.ts                                                   │
 │   prompt render (versioned template) → HTTPS POST → parse →          │
 │   output-schema validation → draft | enumerated failure_reason       │
 │   20 s per attempt · 1 retry on timeout/429/5xx/conn · 45 s budget   │
 │   credentials redacted from every log line                           │
 └───────────────┬──────────────────────────────────────────────────────┘
                 ▼  HTTPS (the only outbound network call in the system)
        ┌────────────────────────┐
        │ hosted LLM endpoint    │  consumed only; no training, no tuning,
        │ (OpenAI-compatible)    │  no embedding store, no feedback loop
        └────────────────────────┘
```

### 5.3 How the recommendation and its rationale are produced

1. **Trigger.** `receipt.service` commits a receipt that opened an exception (which also created the `PENDING` recommendation row inside that transaction) and *then* calls `worker.dispatch(exceptionId)`. Dispatch is the only trigger. There is no endpoint, UI control, schedule, or batch job that starts generation, and none that starts it for a closed case (F9 FR-9.6). Dispatch failure is logged and cannot affect the already-committed receipt.
2. **Idempotence gate.** The job opens a transaction on the `cargoexec_ai` pool, takes a row lock on the recommendation, and proceeds only while `status = 'PENDING'`. A duplicate dispatch therefore performs no second write and produces no second audit entry (F9 FR-9.17).
3. **Request composition.** `RecommendationRequest` is built from the fourteen entry values as submitted, the ordered findings (`rule_id`, `field_name`, `failure_code`, `message`), and the `rule_set_version`. The type has **no** field capable of carrying a specialist id, name, email, session token, case reference, or audit content — the model sees the cargo entry and why it failed validation, and nothing about who typed it (FR-9.16, FR-Y3.2).
4. **Prompt render.** The adapter renders the immutable template identified by `PROMPT_VERSION` (§5.4). The template instructs: plain language intelligible to a non-technical reader; no rule identifiers, regular expressions, internal codes, or model self-reference in the rationale; one sentence for the action; explain *why* the recommendation follows from the unsatisfied requirements (F9 FR-9.9).
5. **Call.** HTTPS POST with a 20-second per-attempt timeout. Exactly one retry after a 2-second delay on timeout, HTTP 429, 5xx, or connection failure. Total budget 45 seconds. A structured-output response format (JSON schema) is requested where the provider supports it, but the response is validated by the application regardless — the provider's schema support is an optimisation, never the guarantee.
6. **Output validation.** The response is validated against the `RecommendationDraft` schema **before any persistence**:
   - `recommended_action`: string, 1–500 chars after trim
   - `rationale`: string, 1–2000 chars after trim
   - `proposed_values`: 0–14 items of `{field_name, proposed_value, addresses_rule_ids}`; `field_name` must be a member of the fourteen-field set; `proposed_value` within that field's structural limit; `addresses_rule_ids` non-empty and every element a `rule_id` present in **this** exception's findings
   - duplicate `field_name` ⇒ invalid; any additional top-level property ⇒ invalid
   - **any** field outside the fourteen — including `hts_code`, `duty_amount`, `tariff_rate`, `classification`, `admissibility`, `penalty`, or `risk_score` — makes the response schema-invalid and drives the case to `UNAVAILABLE` (F9 FR-9.8, PRD §10 #9). Excluded determinations are unrepresentable in the output contract, not merely discouraged in the prompt.
   - An over-length `proposed_value` is **invalid rather than truncated**, so the record never shows a silently altered proposal.
7. **Persist success** — one transaction: `UPDATE recommendations SET status='AVAILABLE', recommended_action, rationale, model_id, prompt_version, generated_at, latency_ms`; `INSERT recommendation_values` (one per proposed value, `origin='AI'` by `CHECK`); `auditWriter.append(tx, RECOMMENDATION_GENERATED)` with `actor_type='AI'`, `actor_specialist_id=NULL`, `before_state='PENDING'`, `after_state='AVAILABLE'`, and one value row per proposal (`before_value` = the entry's current value with `before_origin='HUMAN'` or `NULL` if never provided; `after_value` = the proposal with `after_origin='AI'`). Commit.
8. **Persist failure** — one transaction: `UPDATE recommendations SET status='UNAVAILABLE', failure_reason, failed_at, model_id, prompt_version`; `auditWriter.append(tx, RECOMMENDATION_UNAVAILABLE)` with `actor_type='AI'`, `after_state='UNAVAILABLE'`, no value rows. Commit.
9. **In both branches**: `exceptions.state` remains `OPEN` and `cargo_entries` is untouched — the first is impossible for this role to change, the second is impossible for any role to change (§2.9.1, D-3).

### 5.4 What is persisted for traceability

| Persisted | Where | Why |
|---|---|---|
| `recommended_action`, `rationale` | `recommendations` | The record answers "what did the AI say" exactly as it was said — verbatim, never re-worded or summarised downstream |
| `proposed_value` per field, with `addresses_rule_ids` | `recommendation_values` (`origin='AI'`) | Per-value provenance, plus the justification linking each proposal to the rule it addresses |
| `model_id` | `recommendations` | Provider model identifier **and version string** (e.g. `gpt-4o-2024-11-20`), so the record states which model spoke |
| `prompt_version` | `recommendations` | Template identifier (e.g. `p-2026.09.1`) — a pointer to exact prompt text, see the manifest below |
| `generated_at`, `requested_at`, `latency_ms` | `recommendations` | When it was said, and how long it took |
| `failure_reason`, `failed_at` | `recommendations` | Why no recommendation exists, from a closed set of seven values |
| Exactly one audit entry per terminal outcome | `audit_entries` (+ values) | The trail shows the AI's contribution as an event, with `actor_type='AI'` and no specialist identity |

**Prompt traceability without duplicating prompts (addition A-2).** Prompt *text* is not persisted per case — it is identical for every case at a given `prompt_version`, and storing it per row would bloat the record without adding information. Instead:

- Templates live at `server/src/ai/prompt/{prompt_version}.md` and are **immutable once shipped**.
- `server/src/ai/prompt/manifest.json` maps each `prompt_version` to the SHA-256 of its template text.
- A **startup self-check** recomputes every digest and refuses to boot on a mismatch, so an edited template cannot run under an old version label.
- Editing a template therefore requires a new `prompt_version` and a manifest entry. `prompt_version` on a stored recommendation is consequently a *provable* pointer to exact text at a repository tag.

**Never persisted**: the raw provider response body, provider error text, the API key, and any request/response metadata beyond the columns above (F9 FR-9.13).

### 5.5 The hard guarantee: the AI cannot write a resolution

Five independent mechanisms, any one of which is sufficient. All five are present, so no single defect produces an auto-applied recommendation:

| # | Layer | Mechanism | Failure mode if code is wrong |
|---|---|---|---|
| 1 | **Record separation** | Proposals live in `recommendations`/`recommendation_values`; resolutions live in `decisions`/`decision_values`. No shared column; no view, job, or trigger copies one into the other. "Applying" a recommendation would require inserting a `decisions` row | There is nothing to "flip"; a proposal has no state that closes a case |
| 2 | **Foreign key** | `decisions.decided_by uuid NOT NULL REFERENCES specialists(id)`, populated only from the authenticated principal. `specialists` contains no AI row and no system row | Insert fails with a foreign-key violation |
| 3 | **Deferred trigger** | `trg_exceptions_hitl` refuses any commit that moves an exception out of `OPEN` without a matching `decisions` row whose `resulting_state` equals the new state | `COMMIT` refused, `HITL_VIOLATION` |
| 4 | **Database privilege (A-1)** | The worker's pool connects as `cargoexec_ai`, which holds **no** privilege on `decisions`/`decision_values` and **no** `UPDATE` on `exceptions` | Statement rejected, `42501` |
| 5 | **Code capability** | `ai/worker.ts` and `ai/adapter.http.ts` cannot import `decision.service` or any decision-writing repository (import-graph test). No scheduler, cron, queue consumer, retry path, database trigger, or migration writes `exceptions.state`; a repo-wide test asserts exactly one writer exists | Test failure before merge |

Two further structural facts complete the argument: **there is no non-request actor** in the system at all (the worker is the only asynchronous actor and its capability is limited to recommendation generation, FR-Y3.11), and **the API has no apply, auto, force, or bulk parameter** — `decision_type` is required, single-case, and has no default, so even a fully compromised client cannot express "apply this for me" (F11 FR-11.2, FR-11.20).

Verification: `EDIT_APPROVE` changing one of three proposed values records that value `HUMAN` and the other two `AI`; direct SQL setting `exceptions.state='RESOLVED'` without a decision fails at commit; the worker's code path contains no reference to the decision service; and SM-4 (auto-apply incidents) is asserted as zero by test rather than by observation.

### 5.6 Degradation and unavailability

**The specialist must still be able to decide.** Every failure mode is terminal, visible, and non-blocking:

| Failure | Recommendation status | `failure_reason` | Specialist can still | Displayed cause |
|---|---|---|---|---|
| Timeout after retry | `UNAVAILABLE` | `PROVIDER_TIMEOUT` | `EDIT_APPROVE` (direct resolution) or `REJECT` | "The AI service did not respond in time." |
| 5xx / connection failure | `UNAVAILABLE` | `PROVIDER_UNAVAILABLE` | same | "The AI service could not be reached." |
| 429 after retry | `UNAVAILABLE` | `PROVIDER_RATE_LIMITED` | same | "The AI service was busy." |
| 401/403 (bad key) | `UNAVAILABLE` | `PROVIDER_AUTH_FAILED` | same | "The AI service rejected this deployment's credentials." (key never shown or logged) |
| Response fails the output schema | `UNAVAILABLE` | `SCHEMA_INVALID` | same | "The AI response could not be used." |
| Provider content filter | `UNAVAILABLE` | `CONTENT_FILTERED` | same | "The AI service declined to answer for this case." |
| Unexpected internal error | `UNAVAILABLE` | `INTERNAL_ERROR` | same | "A recommendation could not be produced." |
| Dispatch lost / process restart | stays `PENDING` | — | same | "No AI recommendation is available yet." (stale after 60 s) |
| Provider entirely absent (no key configured) | `UNAVAILABLE` at first dispatch | `PROVIDER_AUTH_FAILED` | same | as above |

Guarantees around degradation:

- **Nothing in the receipt path depends on the provider.** Generation is post-commit and off the request path; stopping the provider does not change any receipt response (F9 acceptance 7).
- **No failure blocks entry creation, validation, exception opening, queue listing, the decision path, or audit writing** (NFR-9).
- **`APPROVE` is refused, not faked.** With `PENDING` or `UNAVAILABLE`, `APPROVE` ⇒ `409 RECOMMENDATION_NOT_AVAILABLE`; `permitted_decisions` returns `["EDIT_APPROVE","REJECT"]`. An absent recommendation can never be "approved" — which is why degraded mode does not create a rubber-stamp path.
- **Direct resolution** (`EDIT_APPROVE` with no available proposal) records every value with `origin='HUMAN'` and requires a reason ≥ 10 characters, so the degraded loop still produces a complete, attributable, self-explaining record (SM-13).
- **No automatic retry after a terminal outcome** — no background retry, scheduled re-attempt, retry-on-view, or "regenerate" button. A silent later retry would change what the case showed at decision time and would undermine the trail's account of what the AI said when the human decided (F9 FR-9.14).
- **No sweeper for stuck `PENDING`.** After a process restart a `PENDING` recommendation is presented as pending-then-stale by the UI rather than resurrected; v1 has no recovery scheduler, and a case with no recommendation is fully decidable (F9 FR-9.19).
- **Latency never affects interactive response time.** Bounded worker concurrency, generation off the request path, and a case screen that polls without blocking navigation or disabling the decision controls (NFR-10).

### 5.7 UI contract for the AI's contribution

The recommendation is always presented as an **un-applied proposal awaiting a decision**, never as an outcome:

- Every AI-proposed value renders through `AttributedValue` → `ProvenanceBadge` ("AI-suggested"), conveyed by text + icon + token colour and exposed to assistive technology as text — never colour alone.
- `model_id`, `prompt_version`, and `generated_at` are shown with the recommendation, so the reader can see which model said this, under which prompt, and when.
- The rationale is rendered in full, verbatim, adjacent to the recommended action — never collapsed behind a disclosure that a specialist could approve without opening.
- While `PENDING`: poll every 3 s for at most 60 s; the decision controls stay enabled, navigation is never blocked, focus is never stolen, and the terminal outcome is announced politely.
- `UNAVAILABLE`/stale-`PENDING`: the `Degraded` component states the plain-language cause and explicitly states that the case can still be decided.
- The three decision actions are presented with **no pre-selected default**, so approving the AI is a deliberate act rather than the path of least resistance (F12, R-1).

### 5.8 Provider substitution and configuration

| Property | Value |
|---|---|
| Interface | `RecommendationProvider.generate(req) → ProviderResult` — the only surface callers see |
| Substitution cost | Change `ai/adapter.http.ts` and configuration. No change to F5, F7, F10, F11, F12, F13, or F14 is permitted or required (FR-9.15) |
| SDK policy | No provider SDK is a dependency; the adapter uses the platform `fetch`. No provider-specific type may appear in a signature outside the adapter (FR-Y3.1, import-graph test) |
| Test double | `FakeProvider` can produce every outcome branch, including each of the seven `failure_reason` values, so degraded-mode behaviour is fully testable with no network access (FR-Y3.4) |
| Configuration (environment only) | `AI_PROVIDER_URL` (must be `https:`), `AI_API_KEY`, `AI_MODEL_ID`, `PROMPT_VERSION`, `AI_TIMEOUT_MS` (default 20000), `AI_WORKER_CONCURRENCY` (default 2) |
| Absent | No training, fine-tuning, embedding store, vector database, evaluation harness, or feedback-to-model loop. A specialist's edit or rejection is recorded in the audit trail and goes nowhere near the model (FR-Y3.7, PRD §10 #11) |

---
