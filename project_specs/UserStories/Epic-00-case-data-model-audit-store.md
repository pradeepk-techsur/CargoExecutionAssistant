## Epic 0: Case Data Model & Append-Only Audit Store (F0)

The persistence foundation. These stories are written from the cargo specialist's point of view
because the guarantees are hers to rely on: her decision is the thing being made unrewritable,
her keystrokes are the entry of record, and her accountability is what per-value provenance
protects. The behaviour is verified at the database, not in application code.

### US-0.1: Decision history that cannot be rewritten afterwards
**As a** cargo specialist, **I want to** know that once my decision is recorded it cannot be altered or deleted by anyone, **so that** the record still means what it said when a later reviewer questions the case months from now.

**Acceptance Criteria:**
- [ ] Given a stored audit entry, when `UPDATE audit_entries SET action_type = 'X'` is executed as the application role `cargoexec_app`, then the statement is rejected (privileges are `SELECT, INSERT` only) and the transaction aborts with internal code `AUDIT_IMMUTABLE`.
- [ ] Given the same entry, when the identical `UPDATE` is executed as `cargoexec_owner` or a superuser, then an unconditional `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger raises `AUDIT_IMMUTABLE` and the statement still fails.
- [ ] Given stored value rows, when `DELETE FROM audit_entry_values` or `TRUNCATE audit_entries` is attempted by any role, then it is rejected.
- [ ] Given an insert attempt written as `INSERT ... ON CONFLICT DO UPDATE` against an audit table, when it executes, then it fails rather than silently updating a row.
- [ ] Given the deployed application, when the codebase and API surface are searched, then no update, delete, redact, correct, anonymise, backfill, purge, retention-window, or archival operation exists for audit data.
- [ ] Given the privilege configuration, when a test reads `information_schema.table_privileges`, then `cargoexec_app` holds no `UPDATE`, `DELETE`, or `TRUNCATE` on either audit table, and the revocation was created in the same migration as the tables it protects.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Every recorded value attributed to AI or to me, value by value
**As a** cargo specialist, **I want to** have each individual value in the record marked as `AI` or `HUMAN` in origin, **so that** my own contribution to a partially-edited resolution is provable rather than inferred.

**Acceptance Criteria:**
- [ ] Given any table that stores a value (`cargo_entry_field_origins`, `recommendation_values`, `decision_values`, `audit_entry_values`), when its DDL is inspected, then it carries a `NOT NULL` `origin` column constrained to `('AI','HUMAN')` — nullable only for a `before_origin` where no prior value existed.
- [ ] Given a manually typed entry field, when it is persisted, then its origin row satisfies `CHECK (origin = 'HUMAN')`; there is no code path that stores a typed value as `AI`.
- [ ] Given an AI-proposed value, when it is persisted, then its row satisfies `CHECK (origin = 'AI')`; there is no mechanism to mark a proposal human-originated.
- [ ] Given an edit-and-approve decision over three proposed values where one was changed, when `decision_values` is read, then the changed value carries `HUMAN`, the two unchanged carry `AI`, and every row carries `prior_value` and `prior_origin` — zero unattributed values (SM-3).
- [ ] Given an attempt to persist a value with an `origin` outside `{AI, HUMAN}`, when the insert executes, then a `CHECK` constraint rejects it.
- [ ] Given `decision_values`, when the schema is reviewed, then it is the only value table permitting mixed origin, which is exactly where a human edit of a machine proposal is recorded.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.3: My submitted entry preserved exactly as I typed it
**As a** cargo specialist, **I want to** have the entry I submitted kept unchanged as the entry of record, with corrections recorded separately as a resolution, **so that** the audit trail can show a genuine before and after instead of an overwritten value.

**Acceptance Criteria:**
- [ ] Given a received entry, when any later action occurs (recommendation generation, approve, edit-and-approve, reject), then `cargo_entries` and `cargo_entry_field_origins` for that case are byte-identical to their state at receipt.
- [ ] Given a specialist correction to a field, when the decision is recorded, then the corrected value is written to `decision_values` and never to `cargo_entries`.
- [ ] Given the API surface, when routes are enumerated, then no `PUT`, `PATCH`, or `DELETE` route exists for a cargo entry, and no service method updates `cargo_entries` after the receipt transaction.
- [ ] Given a stored string value, when it is read back, then internal whitespace and letter case are preserved exactly as submitted (only leading and trailing whitespace was trimmed); normalisation used for rule evaluation never reaches storage.
- [ ] Given a validation result and its findings, when a decision is later recorded, then `validation_results` and `validation_findings` are unchanged — the stated basis of the exception survives the decision.
- [ ] Given the endpoint catalogue, when it is reviewed, then no endpoint or service method deletes an entry, validation result, exception, decision, or audit entry.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.4: Unambiguous event order with tamper evidence
**As a** cargo specialist, **I want to** read a case's events in one unambiguous order and be told if the record has been tampered with, **so that** nobody can quietly remove or reorder an event between my decision and a later review.

**Acceptance Criteria:**
- [ ] Given a case, when its audit entries are read, then each carries `case_sequence` starting at 1 with `UNIQUE (case_id, case_sequence)` and `CHECK (case_sequence >= 1)`, plus a `global_sequence` identity value giving a total order across cases.
- [ ] Given two concurrent audit writes to the same case, when both commit, then they hold sequences 1 and 2 with correct `prev_entry_hash` linkage and no gap or duplicate, because assignment occurs under `SELECT ... FROM cargo_entries WHERE id = :case_id FOR UPDATE`.
- [ ] Given the first entry of a case, when its hash columns are read, then `prev_entry_hash` is 32 zero bytes; for entry *n > 1* it equals entry *n−1*'s `entry_hash` for the same case, with both columns 32 bytes and `UNIQUE (entry_hash)`.
- [ ] Given an insert whose `prev_entry_hash` does not match the prior entry, when the transaction commits, then a deferred constraint trigger refuses it with `AUDIT_CHAIN_BROKEN`.
- [ ] Given a copy of the database with one middle entry excised, when the verification routine runs, then it reports `chain_verified: false` and the `case_sequence` of the first divergence, and it performs no repair, rewrite, or annotation.
- [ ] Given `occurred_at` on any audit entry, when its provenance is checked, then it is the database's `now()` inside the transaction and is not accepted as a parameter from any client or service.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.5: Structural impossibility of a case closing without my decision
**As a** cargo specialist, **I want to** have the database itself refuse any case closure that lacks my recorded decision, an audit entry, or a validation basis, **so that** "the AI resolved it" and "nobody knows who decided" are not reachable outcomes even if the application has a bug.

**Acceptance Criteria:**
- [ ] Given an `OPEN` exception, when a transaction sets `state = 'RESOLVED'` without inserting a `decisions` row, then the commit is refused with `HITL_VIOLATION`.
- [ ] Given `decisions.decided_by`, when the schema is inspected, then it is `NOT NULL REFERENCES specialists(id)` and no `AI` or `SYSTEM` principal row exists in `specialists`, so a machine-authored decision fails the foreign key.
- [ ] Given a `decisions` insert with no audit entry referencing that `decision_id`, when the transaction commits, then it is refused with `AUDIT_COUPLING_VIOLATION`; the same applies to a `cargo_entries` insert without `ENTRY_RECEIVED`, a `validation_results` insert without `VALIDATION_COMPLETED`, an `exceptions` insert without `EXCEPTION_OPENED`, and a recommendation status transition without its matching entry.
- [ ] Given a `validation_results` row with `outcome = 'PASS'`, when an `exceptions` row referencing it is inserted, then the composite foreign key `(validation_result_id, validation_outcome)` with `CHECK (validation_outcome = 'FAIL')` rejects the insert (`EXCEPTION_WITHOUT_BASIS`).
- [ ] Given an exception that already has a decision, when a second `decisions` row is inserted for it, then `UNIQUE (exception_id)` rejects it and F11 surfaces HTTP 409 `EXCEPTION_ALREADY_DECIDED`.
- [ ] Given an `EDIT_APPROVE` or `REJECT` decision with a blank or 9-character reason, when it is inserted directly in SQL bypassing the API, then `CHECK (decision_type = 'APPROVE' OR (reason IS NOT NULL AND length(btrim(reason)) >= 10))` rejects it.
- [ ] Given a schema dump, when it is searched, then no `assigned_to`, `assignee_id`, `priority`, `severity_rank`, `sla_due_at`, `age_days`, `role`, `permission`, `exported_at`, `source_system`, `ingestion_batch_id`, `is_seed`, `tariff_*`, or `hts_code` column exists on any table, and no migration inserts demonstration data.

**Priority:** P0 | **Feature Ref:** F0

---
