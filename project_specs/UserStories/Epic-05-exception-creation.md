## Epic 5: Exception Creation from Validation Failure (F5)

An exception is the failure outcome of validation and nothing else — derived, never authored.

### US-5.1: Have a failing entry become a case with a stated basis
**As a** cargo specialist, **I want to** have an entry that fails validation automatically open one exception carrying the findings as its stated basis, **so that** "why is this case open" is always answerable from the record and never a matter of inference.

**Acceptance Criteria:**
- [ ] Given a validation result with `outcome = 'FAIL'` and *n* ≥ 1 findings, when receipt commits, then exactly one `exceptions` row exists for that entry with `state = 'OPEN'`, `opened_at` set, `decision_id = NULL`, and `closed_at = NULL`.
- [ ] Given that exception, when it is read, then it references its `validation_result_id` with `validation_outcome = 'FAIL'`, and the findings are read through that reference rather than copied in mutable form, so the basis and the record of the basis cannot diverge.
- [ ] Given an entry that passes validation, when receipt commits, then no exception exists for it (100% derivation for failures, zero exceptions without a basis — SM-8).
- [ ] Given a failing entry, when receipt commits, then exactly one `EXCEPTION_OPENED` audit entry exists for the case with `before_state = NULL`, `after_state = 'OPEN'`, `actor_type = 'SYSTEM'`, the submitting specialist recorded, and one value row per finding.
- [ ] Given a receipt transaction in which the `EXCEPTION_OPENED` audit entry is missing, when it commits, then a deferred constraint trigger refuses the commit with `AUDIT_COUPLING_VIOLATION` and no exception is persisted.
- [ ] Given a newly opened exception, when it is read, then a `recommendations` row exists with `status = 'PENDING'` and no `decisions` row exists; the placeholder writes no audit entry of its own and affects no state.
- [ ] Given any exception, when `exceptions.entry_id` is checked, then it is `UNIQUE` — an entry can never accumulate a second exception.

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.2: Have cases ordered by when they arrived, permanently
**As a** cargo specialist, **I want to** have each exception stamped with an immutable receipt position at creation, **so that** I can work the queue from the top in a stable order that never rearranges itself under me.

**Acceptance Criteria:**
- [ ] Given three sequential failing entries, when each opens an exception, then each receives a strictly increasing `receipt_position` from a dedicated database sequence, `NOT NULL UNIQUE`.
- [ ] Given an exception, when any later action occurs, then `receipt_position` is unchanged — no application code path updates it.
- [ ] Given a rolled-back receipt that had already allocated a position, when subsequent entries are received, then the sequence gap remains and is never compacted, renumbered, or reused, and the queue order of surrounding cases is unaffected.
- [ ] Given the queue projection, when it is built, then `receipt_position` is the only ordering attribute exposed to it.
- [ ] Given an `exceptions` row, when its columns are inspected, then no `priority`, `severity`, `risk_score`, `due_at`, `sla_*`, `assigned_to`, `claimed_by`, or `escalated_at` column exists, and no such value is derivable from any API response.
- [ ] Given the case detail screen, when it renders, then the numeric receipt position is not displayed as a place-in-queue, age, duration, or due date.

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.3: Have no way to open, reopen, or park a case outside the loop
**As a** cargo specialist, **I want to** have exceptions be creatable only by a validation failure and closable only by my decision, **so that** the link between the unsatisfied rule and the open case holds for the life of the case and no workflow state hides work from the record.

**Acceptance Criteria:**
- [ ] Given the API surface, when it is enumerated, then there is no `POST /api/exceptions`, no admin creation tool, and no UI affordance that opens an exception; the only mutating exception endpoint is `POST /api/exceptions/{id}/decision`.
- [ ] Given the exception service, when it is invoked with a `PASS` validation result or with zero findings, then it raises `EXCEPTION_WITHOUT_BASIS`, the receipt transaction aborts, and nothing is saved.
- [ ] Given `exceptions.state`, when its allowed values are inspected, then they are exactly `OPEN`, `RESOLVED`, `REJECTED`, with transitions `OPEN → RESOLVED` and `OPEN → REJECTED` only; `RESOLVED` and `REJECTED` are terminal and no reopen, revert, or un-resolve transition exists.
- [ ] Given the state enumeration, when it is checked, then no `IN_PROGRESS`, `ON_HOLD`, `ESCALATED`, `PENDING_REVIEW`, `CLAIMED`, or `SNOOZED` state exists — each would imply workflow, assignment, or supervision that is out of scope.
- [ ] Given a direct SQL `UPDATE exceptions SET state = 'RESOLVED'` with no `decisions` row, when it is committed, then it fails with `HITL_VIOLATION`; the decision handler is the only writer of `state`, `closed_at`, and `decision_id`.
- [ ] Given `closed_at` and `decision_id`, when constraints are inspected, then both are `NULL` while `state = 'OPEN'` and `NOT NULL` in a terminal state — a closed exception with no decision, or an open exception with a decision, is unrepresentable.
- [ ] Given the endpoint catalogue, when it is reviewed, then no endpoint or service method deletes an exception.

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.4: Identify a case by one human-readable reference everywhere
**As a** cargo specialist, **I want to** refer to a case by a single readable reference used in the UI, the URL, and the audit trail, **so that** I can quote a case to a colleague or a reviewer without translating identifiers.

**Acceptance Criteria:**
- [ ] Given a received entry, when its case reference is allocated, then it matches `^CE-[0-9]{4}-[0-9]{6}$` (for example `CE-2026-000137`), is unique across the deployment, uses the UTC year of receipt, and is allocated inside the receipt transaction.
- [ ] Given a case reference, when any later action occurs, then it is immutable.
- [ ] Given an exception's API representation, when it is returned, then the case reference is obtained by join from the entry rather than duplicated, so one case has exactly one reference in exactly one place.
- [ ] Given `GET /api/exceptions/{idOrReference}`, when either the exception uuid or the case reference is supplied, then both resolve to the same case.
- [ ] Given a URL containing the exception uuid, when the case detail screen loads, then it canonicalises the address bar to `/cases/CE-YYYY-NNNNNN` so shared links always show the human-readable reference.
- [ ] Given a case reference, when it appears in the receipt outcome, the queue row, the case header, and each audit event, then it is the identical string in all four places.

**Priority:** P0 | **Feature Ref:** F5

---
