## Epic 11: Human Decision Processing — Edit / Approve / Reject (F11)

The server-side enforcement of the accountable human decision. `POST /api/exceptions/{id}/decision`
is the only path that writes a resolution or changes an exception's state.

### US-11.1: Approve the recommendation as proposed
**As a** cargo specialist, **I want to** approve a recommendation exactly as it stands and have my approval recorded against my name, **so that** adopting the AI's draft is still an accountable act with a traceable record.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case with an `AVAILABLE` recommendation, when I submit `decision_type: "APPROVE"`, then the response is `201`, the exception becomes `RESOLVED` with `closed_at` and `decision_id` set, and the decision records me as `decided_by` from the session principal.
- [ ] Given the approval, when resolution values are written, then they are copied server-side from `recommendation_values` and every one retains `origin = 'AI'`, because I adopted the machine's value unchanged — my contribution is the decision, not authorship of the values.
- [ ] Given an approval body containing `resolution_values`, when it is submitted, then the response is `422 RESOLUTION_VALUES_NOT_ALLOWED` and nothing is written.
- [ ] Given the approval, when audit is checked, then exactly one `RECOMMENDATION_APPROVED` entry exists with `actor_type = 'SPECIALIST'`, my id, `before_state = 'OPEN'`, `after_state = 'RESOLVED'`, and one value row per resolution value whose `before_value` is the proposal (`before_origin = 'AI'`) and `after_origin = 'AI'`.
- [ ] Given an optional reason supplied with an approval, when it is stored, then it must satisfy the same 10–2000 character bounds; a reason is not required, because approving as-is adds no divergence to explain.
- [ ] Given the `201` response, when it is read, then it returns the recorded decision (id, type, `decided_at`, my id and display name, reason), the resulting state, the resolution values with per-value `origin`, `prior_value`, and `changed_from_proposal`, the `audit_entry_id`, and `idempotent_replay`.

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.2: Edit the recommendation and approve my version
**As a** cargo specialist, **I want to** change the values I disagree with, approve the modified resolution, and have only my changes attributed to me, **so that** "what did the human change" is answerable value by value.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case with three proposed values, when I submit `decision_type: "EDIT_APPROVE"` with all three values and one changed, then the changed value is recorded `origin = 'HUMAN'` with `changed_from_proposal = true`, the other two retain `origin = 'AI'` with `changed_from_proposal = false`, and `prior_value` is populated on all three.
- [ ] Given each submitted value, when provenance is computed, then the server compares it with the AI proposal after trimming leading and trailing whitespace and comparing byte-for-byte thereafter; equal ⇒ `AI`, not equal ⇒ `HUMAN`, no proposal for that field ⇒ `HUMAN`.
- [ ] Given a body containing an `origin` property on any resolution value, when it is submitted, then it is rejected as an unknown field with `422 REQUEST_MALFORMED` — origin is never accepted from the client.
- [ ] Given an `EDIT_APPROVE` on a case with a recommendation, when the value set does not exactly equal the proposal's `field_name` set, then the response is `422 RESOLUTION_VALUES_INCOMPLETE` naming the missing and unexpected fields, so an omitted field is never ambiguous between "unchanged" and "dropped".
- [ ] Given a direct resolution (no available recommendation), when I submit `EDIT_APPROVE`, then at least one value is required, every `field_name` must be in the fourteen-field entry set, and every value is recorded `HUMAN` with `prior_value` taken from my submitted entry value where one exists.
- [ ] Given the edit-and-approve, when audit is checked, then exactly one `RECOMMENDATION_EDITED_AND_APPROVED` entry exists carrying my reason verbatim and per-value origins matching the decision exactly.
- [ ] Given an `EDIT_APPROVE` in which I changed nothing, when it is submitted with a reason, then it is accepted and recorded with all values retaining `AI` origin — the server, not the client, decides whether a change occurred.

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.3: Reject a recommendation and close the case without adopting it
**As a** cargo specialist, **I want to** reject a recommendation with my reason and have nothing adopted, **so that** declining a draft is recorded as deliberately as accepting one.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case, when I submit `decision_type: "REJECT"` with a valid reason, then the response is `201` and the exception becomes `REJECTED` with `closed_at` and `decision_id` set.
- [ ] Given a rejection, when storage is inspected, then no `decision_values` rows were written, because nothing was adopted.
- [ ] Given a rejection body containing `resolution_values`, when it is submitted, then the response is `422 RESOLUTION_VALUES_NOT_ALLOWED` and nothing is written.
- [ ] Given the rejection, when audit is checked, then exactly one `RECOMMENDATION_REJECTED` entry exists with my reason on the entry and one value row per declined proposed value where `before_value` is the proposal (`before_origin = 'AI'`) and `after_value` is `NULL`.
- [ ] Given a rejected case, when it is read, then no reopen, amend, undo, correct, or supersede operation exists — a mistaken decision is addressed by a new case, never by rewriting history.
- [ ] Given a rejection on a case with no available recommendation, when it is submitted with a reason, then it succeeds, so degraded cases can always be closed.

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.4: Be required to say why whenever I edit or reject
**As a** cargo specialist, **I want to** be required to write a substantive reason for every edit and every rejection, **so that** a later reviewer reads my justification rather than inferring my intent from an outcome.

**Acceptance Criteria:**
- [ ] Given `EDIT_APPROVE` or `REJECT` with `reason` absent, `""`, `"   "`, or `"ok"`, when it is submitted, then the response is `422 REASON_REQUIRED` with "Enter a reason of at least 10 characters for this {edit/rejection}.", the case remains `OPEN`, and no audit entry is written.
- [ ] Given a reason of 10–2000 characters after trim, when it is submitted, then it is accepted and stored verbatim.
- [ ] Given a reason over 2000 characters, when it is submitted, then it is rejected as malformed.
- [ ] Given an API bypass that writes a decision row directly, when an `EDIT_APPROVE` or `REJECT` row with a blank or short reason is inserted, then the database `CHECK` rejects it — the rule is enforced independently at both layers.
- [ ] Given a recorded edit or rejection, when the audit entry is read, then the reason is present on the entry itself, not merely referenced through the decision, so the trail is self-contained.
- [ ] Given all recorded edits and rejections in the deployment, when they are queried, then 100% carry a non-empty reason (SM-5).

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.5: Be certain nothing resolves without my decision
**As a** cargo specialist, **I want to** have resolution state reachable only through an explicit decision of mine, with no job, worker, or default that can close a case, **so that** "the AI decided this" is not a possible outcome and my accountability cannot be bypassed.

**Acceptance Criteria:**
- [ ] Given a request with no `decision_type`, when it is submitted, then it is rejected `422 REQUEST_MALFORMED` — there is no default, no inferred decision, no "accept all", and no empty-body semantics.
- [ ] Given a repository-wide search, when it is performed, then exactly one code path writes `exceptions.state`, and no scheduler, worker, queue consumer, retry path, database trigger, or migration references the decision service.
- [ ] Given direct SQL setting `exceptions.state = 'RESOLVED'` with no `decisions` row, when it commits, then it fails with `HITL_VIOLATION`.
- [ ] Given an unauthenticated or CSRF-invalid decision request, when it is sent, then it returns `401 UNAUTHENTICATED` or `403 CSRF_INVALID` respectively, with no state change and no audit entry.
- [ ] Given any failure inside the decision transaction, when it aborts, then the case remains `OPEN` with no decision and no audit entry, and the response is `500 DECISION_FAILED` stating that nothing was saved.
- [ ] Given the endpoint, when it is exercised, then it accepts exactly one decision for exactly one exception — no batch, multi-case, or "approve all" endpoint or parameter exists.
- [ ] Given any recorded decision, when the entry and findings are compared before and after, then `cargo_entries` and `validation_findings` for that case are byte-identical; the handler never modifies, closes, annotates, or deletes a finding.
- [ ] Given all resolved cases in the deployment, when they are audited, then zero reached a resolved state without a recorded human decision (SM-4).

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.6: Never decide the same case twice, even from two tabs
**As a** cargo specialist, **I want to** have a second or concurrent decision on a case refused with an explanation, **so that** the record can never contain two contradictory outcomes for one case.

**Acceptance Criteria:**
- [ ] Given a decided case, when a second decision is submitted, then the response is `409 EXCEPTION_ALREADY_DECIDED` including the existing decision's type, the deciding specialist's display name, and the timestamp, so the screen can explain what happened.
- [ ] Given two concurrent decision requests for one case, when both are processed, then the `SELECT ... FOR UPDATE` lock plus `UNIQUE (exception_id)` yield exactly one `201` and one `409`, and the database holds one decision and one audit entry.
- [ ] Given a repeated request carrying the same `Idempotency-Key` and the same body, when it is replayed, then the original `201` body is returned with `idempotent_replay: true`, and no second decision and no second audit entry are created.
- [ ] Given the same `Idempotency-Key` with a different body, when it is submitted, then the response is `409 IDEMPOTENCY_KEY_REUSED`.
- [ ] Given a request without an `Idempotency-Key`, when it is processed, then it is handled normally with the single-decision constraint as the backstop.
- [ ] Given a supplied `recommendation_id` that is not the case's current one, when the decision is submitted, then the response is `409 RECOMMENDATION_MISMATCH`, so a stale-tab approval is detectable rather than silent.

**Priority:** P1 | **Feature Ref:** F11

---

### US-11.7: Be prevented from approving a recommendation that does not exist
**As a** cargo specialist, **I want to** have approval refused when there is nothing to approve, while still being able to resolve the case myself, **so that** an absent recommendation can never be rubber-stamped into the record.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case whose recommendation is `UNAVAILABLE`, when I submit `APPROVE`, then the response is `409 RECOMMENDATION_NOT_AVAILABLE` with "There is no AI recommendation to approve. Edit and approve, or reject."
- [ ] Given the same case, when I submit `EDIT_APPROVE` with values and a reason, then it succeeds, every value is recorded `HUMAN`, and the case becomes `RESOLVED` (SM-13).
- [ ] Given an `OPEN` case whose recommendation is still `PENDING`, when I submit `APPROVE`, then it is refused with the same `409`.
- [ ] Given the same pending case, when I submit `REJECT` with a reason, then it succeeds and the case becomes `REJECTED`.
- [ ] Given the case detail response, when `permitted_decisions` is read for an unavailable or pending recommendation, then it is `["EDIT_APPROVE","REJECT"]`, and the server re-checks the rule on submission regardless of what the client rendered.
- [ ] Given a decision on a case that does not exist, when it is submitted, then the response is `404 EXCEPTION_NOT_FOUND` and nothing is written.

**Priority:** P0 | **Feature Ref:** F11

---
