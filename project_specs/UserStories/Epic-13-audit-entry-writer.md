## Epic 13: Audit Entry Writer — Append-Only on Every State Change (F13)

The single chokepoint through which all history is written: one append-only entry per state change,
inside the same transaction as the change it describes.

### US-13.1: Have every state change on my case recorded exactly once
**As a** cargo specialist, **I want to** have each of the eight state changes write exactly one audit entry in the same transaction as the change, **so that** an unaudited change to a case I worked is not a possible outcome.

**Acceptance Criteria:**
- [ ] Given a test enumerating the eight transitions — `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED`, `RECOMMENDATION_GENERATED`, `RECOMMENDATION_UNAVAILABLE`, `RECOMMENDATION_APPROVED`, `RECOMMENDATION_EDITED_AND_APPROVED`, `RECOMMENDATION_REJECTED` — when each is exercised, then exactly one audit entry exists with the expected action, actor type, before/after states, and value rows (SM-6: 100%, zero unaudited transitions).
- [ ] Given the writer's interface, when it is inspected, then it exposes exactly one operation, `append(tx, entry)`, requiring an active transaction handle as its first argument, with no way to open its own transaction or write outside the caller's.
- [ ] Given a state change committed with zero or two audit entries, when the transaction commits, then the deferred coupling triggers refuse it with `AUDIT_COUPLING_VIOLATION`.
- [ ] Given the audit tables, when the codebase is searched, then they are referenced by exactly one module — no other module, repository, ORM model, or migration inserts into them.
- [ ] Given the action set, when it is compared with the state machine, then there are exactly eight actions and exactly eight transitions, with no action lacking a transition and no transition lacking an action.
- [ ] Given `occurred_at`, when an entry is written, then it is the database's `now()` within the transaction and is not a parameter of the writer.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.2: Have who, what, when, before, after, and origin all captured
**As a** cargo specialist, **I want to** have each entry record the actor, the action, the time, the before and after values, and the AI-versus-human origin of each value, **so that** the trail answers the oversight questions without anyone needing to ask me.

**Acceptance Criteria:**
- [ ] Given any audit entry, when it is read, then it carries `case_id`, `case_sequence`, `global_sequence`, `action_type`, `actor_type`, `actor_specialist_id`, `occurred_at`, `before_state`, `after_state`, the linked `exception_id`/`recommendation_id`/`decision_id` where applicable, `request_id`, `prev_entry_hash`, and `entry_hash`.
- [ ] Given a `SPECIALIST` entry, when it is written, then `actor_specialist_id` comes from the request principal and is non-null; given an `AI` entry, then it is `NULL`; given a `SYSTEM` entry, then it records the specialist whose request caused the derivation.
- [ ] Given each value row, when it is read, then it carries `field_name`, `before_value`, `before_origin`, `after_value`, `after_origin`, and `changed`, with `before_origin` null only where no prior value existed and `after_origin` null only where the after value is null (a decline).
- [ ] Given an `ENTRY_RECEIVED` entry, when it is read, then it holds one value row per submitted field with `after_origin = 'HUMAN'`; given `RECOMMENDATION_GENERATED`, one per proposed value with `before_origin = 'HUMAN'` or `NULL` and `after_origin = 'AI'`.
- [ ] Given a `RECOMMENDATION_EDITED_AND_APPROVED` entry, when it is read, then `after_origin` is `HUMAN` for changed values and `AI` for unchanged ones, with `changed` set accordingly.
- [ ] Given any stored value, when it is read, then it is exactly as submitted or proposed — without normalisation, truncation, rounding, or case folding — with numeric and date values serialised canonically so comparisons in the trail are exact.
- [ ] Given a value row, when it is validated, then at least one of `before_value` / `after_value` is non-null and every `field_name` is a member of the entry field set or a finding-scoped name.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.3: Have my reason travel with the event that carries it
**As a** cargo specialist, **I want to** have my reason copied verbatim onto the audit entry for an edit or a rejection, **so that** the trail explains the decision on its own when someone reads only the history.

**Acceptance Criteria:**
- [ ] Given a `RECOMMENDATION_EDITED_AND_APPROVED` entry, when it is read, then `reason` holds my text verbatim, not merely a reference to the decision row.
- [ ] Given a `RECOMMENDATION_REJECTED` entry, when it is read, then `reason` holds my text verbatim.
- [ ] Given `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED`, `RECOMMENDATION_GENERATED`, or `RECOMMENDATION_UNAVAILABLE`, when each is written, then `reason` is absent or `NULL`.
- [ ] Given an edit or reject entry written with an empty reason, when the writer validates it, then it raises `AUDIT_WRITE_INVALID` and the transaction aborts.
- [ ] Given a reason containing line breaks, when it is stored and later rendered, then the text is preserved exactly and escaped at render time.
- [ ] Given `RECOMMENDATION_APPROVED` with an optional reason supplied, when the entry is written, then the reason is carried if present and the entry is valid without one.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.4: Know that no one can edit or delete the history — ever
**As a** cargo specialist, **I want to** have mutation of stored history rejected at the persistence layer for every role, with no retention or purge path, **so that** the record behind my decisions is permanent for the life of the deployment.

**Acceptance Criteria:**
- [ ] Given `UPDATE audit_entries` and `DELETE FROM audit_entries`, when each is executed as `cargoexec_app` and as `cargoexec_owner`, then all four attempts fail (SM-7: 100% rejected, including attempts made directly against the database).
- [ ] Given the writer's implementation, when it is inspected, then no update, delete, upsert, merge, redact, correct, anonymise, backfill, or truncate operation exists in the interface or the implementation.
- [ ] Given the deployment, when scheduled tasks are enumerated, then there is no scheduled deletion, retention window, rollup, compaction, archival job, or "clear history" operation.
- [ ] Given a copy of the database with a middle entry removed, when the chain is verified, then `chain_verified` is false at the expected sequence, because any excision, substitution, or reordering breaks the hash linkage.
- [ ] Given the read path, when it is used, then it is separate from the write path, strictly read-only, and returns a case's entries in ascending `case_sequence` with their value rows, the linked specialist display names, and the `chain_verified` result.
- [ ] Given F13's API surface, when it is enumerated, then it exposes only `GET /api/exceptions/{exceptionId}/audit` — no write endpoint, no bulk read, no download, no report, no streaming feed, and no cross-case query.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.5: Have an unauditable change fail loudly rather than proceed quietly
**As a** cargo specialist, **I want to** have any failure to write history abort the change it described, and have secrets refused outright, **so that** I never end up responsible for a change the record cannot explain.

**Acceptance Criteria:**
- [ ] Given the writer fails during a decision, when the transaction aborts, then the case remains `OPEN` with no decision row and no audit entry, and the API returns `500 DECISION_FAILED` stating nothing was saved.
- [ ] Given an `append` failure, when it occurs, then the exception propagates and aborts the caller's transaction — it is never caught and logged-and-continued, retried outside the transaction, queued for later, or written to a fallback file.
- [ ] Given an invalid action type or an actor pairing violation (`SPECIALIST` without an id, `AI` with one), when `append` is called, then it raises `AUDIT_WRITE_INVALID` and nothing commits.
- [ ] Given an attempt to write a password, session token, CSRF token, API key, or authorisation header as a value or a denylisted `field_name`, when `append` is called, then it raises `AUDIT_WRITE_FORBIDDEN_CONTENT` and fails the transaction rather than silently dropping the value.
- [ ] Given two writers racing on one case's audit sequence, when the `UNIQUE (case_id, case_sequence)` constraint is violated, then the transaction aborts with `AUDIT_SEQUENCE_CONFLICT` and is never silently retried by the server.
- [ ] Given any internal audit error, when it reaches the client, then it is surfaced only as the caller's generic `RECEIPT_FAILED` or `DECISION_FAILED` with the message that nothing was saved; internal audit codes are never returned to the client.
- [ ] Given I view a queue, a case, or an audit trail, and given I sign in or out, when the audit tables are queried afterwards, then no entry was written — reads and session events are deliberately outside the case audit boundary, because no case state changed.

**Priority:** P0 | **Feature Ref:** F13

---
