## Epic 7: Review Queue (F7)

One query, one ordering, zero parameters — plus the single-case read model the case screen needs.

### US-7.1: Get the open exceptions in strict receipt order
**As a** cargo specialist, **I want to** retrieve the open exceptions in ascending receipt order with a stable ordering, **so that** I can work from the top of a list that never rearranges itself between requests.

**Acceptance Criteria:**
- [ ] Given three open exceptions, when `GET /api/exceptions` is called, then they are returned ordered `receipt_position ASC` and identically on repeated calls, with no secondary sort key and no ordering configuration.
- [ ] Given two specialists calling the queue at the same moment, when both responses are compared, then they contain the same rows in the same order.
- [ ] Given each row, when it is inspected, then it contains exactly `id`, `case_reference`, `receipt_position`, `received_at`, `entry_number` (nullable), `finding_count`, and `failure_summary` — and nothing else.
- [ ] Given a row's `failure_summary`, when it is derived, then it is the messages of the first two findings in server order joined by "; ", suffixed with " and {n} more" when more than two exist, and it contains no severity, score, or ranking term.
- [ ] Given more than 500 open exceptions, when the queue is called, then at most 500 rows are returned with `truncated: true` — and no page, offset, cursor, limit parameter, or "next page" link exists.
- [ ] Given the response, when its headers are inspected, then `Cache-Control: no-store` is set so a decided case never renders from cache as though still open.
- [ ] Given no session, when the queue is called, then the response is `401 UNAUTHENTICATED` with no data; every authenticated specialist sees the identical queue, because there is one role and no assignment.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.2: See only open cases in the queue, and still reach a decided one by its link
**As a** cargo specialist, **I want to** have the queue contain exactly the open exceptions while a decided case stays readable at its own URL, **so that** my working list is only work, and the record of a finished case is never lost.

**Acceptance Criteria:**
- [ ] Given exceptions in `OPEN`, `RESOLVED`, and `REJECTED` states, when the queue is called, then only the `OPEN` ones are returned.
- [ ] Given I decide the first case in the queue, when I call the queue again, then that row is absent and the order of the remaining rows is unchanged, because positions are immutable.
- [ ] Given a `RESOLVED` case, when `GET /api/exceptions/{idOrReference}` is called, then it returns the full case including its decision.
- [ ] Given the API surface, when it is enumerated, then no parameter, toggle, or alternate endpoint includes closed cases in a list, and no second list or history-browse surface exists.
- [ ] Given the queue or a case is read, when the database is inspected afterwards, then no row changed and no audit entry was written — viewing is not a state change, and no per-specialist activity record is created.
- [ ] Given a non-`GET` method on either read path, when it is sent, then the response is `405 METHOD_NOT_ALLOWED`.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.3: Have the queue carry no management dimensions at all
**As a** cargo specialist, **I want to** have the queue refuse filtering, sorting, assignment, and prioritisation outright, **so that** the single ordered list stays a single ordered list and cannot be quietly turned into a management surface.

**Acceptance Criteria:**
- [ ] Given `GET /api/exceptions?sort=received_at`, when it is called, then the response is `400 UNSUPPORTED_QUERY_PARAMETER` naming the offending parameter — not a sorted list.
- [ ] Given `GET /api/exceptions?state=RESOLVED`, when it is called, then the response is `400 UNSUPPORTED_QUERY_PARAMETER` — not a filtered list; the same applies to `order`, `q`, `assignee`, `priority`, `page`, `limit`, `since`, and any unrecognised parameter.
- [ ] Given any query string at all, when it is present, then it is rejected rather than silently ignored, making the absence of queue management an enforced contract rather than an undocumented gap.
- [ ] Given the queue response JSON, when it is searched, then it contains no `priority`, `severity`, `risk`, `assigned_to`, `claimed_by`, `age_days`, `age_bucket`, `due_at`, `sla_status`, or `is_overdue` field.
- [ ] Given any header, body, cookie, or configuration value, when it is varied, then neither the queue's membership nor its order changes.
- [ ] Given the queue index, when the schema is inspected, then it is `idx_exceptions_open_receipt_order` on `(receipt_position) WHERE state = 'OPEN'` — receipt order is the whole ordering model.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.4: Open one case and receive everything I need to decide it
**As a** cargo specialist, **I want to** retrieve a single case with its entry values, findings, recommendation, decision state, and the decisions I am permitted to take, **so that** I can judge the case from one read without assembling it from several calls.

**Acceptance Criteria:**
- [ ] Given `GET /api/exceptions/{idOrReference}`, when it succeeds, then it returns the exception (`id`, `case_reference`, `state`, `receipt_position`, `opened_at`, `closed_at`), the entry (all fourteen values with per-field `origin`, `received_at`, submitting specialist id and display name), and the validation result (`outcome`, `rule_set_version`, `evaluated_at`, findings in server order).
- [ ] Given a recommendation with `status = 'AVAILABLE'`, when the case is returned, then it includes `recommended_action`, `rationale`, `proposed_values[]` each with `field_name`, `proposed_value`, `origin: "AI"`, `addresses_rule_ids[]`, plus `model_id`, `prompt_version`, and `generated_at`.
- [ ] Given a recommendation with `status = 'UNAVAILABLE'`, when the case is returned, then it includes `failure_reason` and `failed_at`; given `PENDING`, it includes `requested_at`.
- [ ] Given a decided case, when it is returned, then it includes the decision's `decision_type`, `decided_at`, `decided_by` id and display name, `reason`, and `resolution_values[]` with per-value `origin` and `prior_value`.
- [ ] Given an open case with an `AVAILABLE` recommendation, when it is returned, then `permitted_decisions` is `["APPROVE","EDIT_APPROVE","REJECT"]`; with `PENDING` or `UNAVAILABLE`, `["EDIT_APPROVE","REJECT"]`; for any closed case, `[]`.
- [ ] Given a well-formed identifier matching no exception, when the case is requested, then the response is `404 EXCEPTION_NOT_FOUND`; given an identifier matching an entry that passed validation, then `404` with the message "That entry passed validation, so it has no exception."
- [ ] Given a path segment matching neither `^[0-9a-f-]{36}$` nor `^CE-[0-9]{4}-[0-9]{6}$`, when it is requested, then the response is `400 INVALID_IDENTIFIER`.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.5: Rely on the server, not the screen, to say which decisions are available
**As a** cargo specialist, **I want to** have the available decision actions declared by the server and re-checked when I submit, **so that** a stale screen can never let me take a decision the case does not permit.

**Acceptance Criteria:**
- [ ] Given `permitted_decisions`, when it is produced, then it is computed server-side from the case state and recommendation status — the client does not re-implement the rule.
- [ ] Given a decision submitted for an action not in `permitted_decisions`, when the server processes it, then it re-checks and refuses regardless of what the client rendered (`409 RECOMMENDATION_NOT_AVAILABLE` for an approval with nothing to approve).
- [ ] Given a closed case, when its detail is read, then `permitted_decisions` is `[]` and the screen therefore renders no decision controls at all.
- [ ] Given an open case whose recommendation becomes `UNAVAILABLE` after the case was loaded, when a decision is submitted, then the server's current view governs the outcome.
- [ ] Given both read endpoints, when they are exercised, then they are side-effect free: they do not claim, lock, or reserve a case for the reader.
- [ ] Given demonstration load, when the case detail is read, then the composed read model is returned in a single call that renders within 2 seconds.

**Priority:** P0 | **Feature Ref:** F7

---
