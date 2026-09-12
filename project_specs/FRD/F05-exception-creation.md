## F5: Exception Creation from Validation Failure

**Priority:** P0 · **Surface:** Programmatic API / Data · **Dependencies:** F0, F4, F13 · **PRD trace:** §5.2 F5, §4.3 #4, SM-8, NFR-6

**Description:** F5 derives an exception from a failed validation. An exception is the failure outcome of F4 and nothing else: there is no exception-authoring endpoint, no manual "open exception" action, and no import path, which is what keeps the link between "which rule was not satisfied" and "why this case is open" intact for the life of the case. Creation opens the case in `OPEN` state, stamps its immutable receipt position for queue ordering (F7), binds the validation result as the exception's stated basis, creates the `PENDING` recommendation placeholder that F9 will fulfil, and writes the opening audit entry (F13) — all inside the receipt transaction.

**Terminology (feature-specific):**
- **Derivation:** the act of creating an exception as a consequence of a validation failure, within the same transaction as that validation. The exception has no independent existence.
- **Stated basis:** the `validation_results` row (and its findings) that the exception references. Immutable, and never amended by a later resolution.
- **Receipt position:** the `bigint` drawn from a dedicated database sequence at creation. Sole ordering dimension for F7, immutable for the life of the exception.
- **Terminal state:** `RESOLVED` or `REJECTED`. There is no reopen, revert, or un-resolve transition.

**Sub-features:**
- Automatic exception creation on, and only on, validation failure
- Validation findings carried forward as the stated basis
- Lifecycle state machine with no path that skips a human decision
- Receipt-order position assignment
- Case reference exposure for UI and audit trail
- Opening audit entry written in the creation transaction
- `PENDING` recommendation placeholder creation

---

### Process — Derivation

1. F4 has returned `outcome = 'FAIL'` with *n* ≥ 1 findings, and the `validation_results` / `validation_findings` rows are already persisted in this transaction (F3 steps 8–9).
2. F5 inserts one `exceptions` row: `entry_id`, `validation_result_id`, `validation_outcome = 'FAIL'` (satisfying the composite foreign key of F0 FR-0.11), `state = 'OPEN'`, `receipt_position = nextval('exception_receipt_position_seq')`, `opened_at = now()`, `decision_id = NULL`, `closed_at = NULL`.
3. F5 inserts one `recommendations` row: `exception_id`, `status = 'PENDING'`, `requested_at = now()`, all result columns `NULL`.
4. F5 writes audit entry `EXCEPTION_OPENED` via F13, with `before_state = NULL`, `after_state = 'OPEN'`, `actor_type = 'SYSTEM'`, `actor_specialist_id = ` the submitting specialist, and one `audit_entry_values` row per finding (`field_name` = the finding's field, `after_value` = the finding's failure code and message, `after_origin = 'HUMAN'` for the specialist-submitted value being judged).
5. Control returns to F3, which commits. F0's deferred constraint triggers verify at commit that the exception has both a failing validation basis and its `EXCEPTION_OPENED` audit entry.
6. After commit, F3 dispatches F9 generation for the new exception.

### Process — Closure (initiated by F11, specified here for state-machine completeness)

1. F11 has validated a decision request and taken a row lock on the exception.
2. F11 inserts the `decisions` row (the only writer of a resolution).
3. F11 updates the exception: `state = 'RESOLVED' | 'REJECTED'`, `closed_at = now()`, `decision_id = ` the new decision.
4. F11 writes the corresponding decision audit entry.
5. On commit, F0's human-in-the-loop constraint trigger verifies that a `decisions` row with a non-null human `decided_by` and a matching `resulting_state` exists. Without it, the commit is refused.

---

### Functional Requirements

- **FR-5.1 — Sole creation path.** An `exceptions` row MUST be created only by F5, only inside a receipt transaction, and only when the transaction's validation result has `outcome = 'FAIL'`. There MUST be no `POST /api/exceptions` endpoint, no admin creation tool, no UI affordance, and no service method that creates an exception from anything other than a validation failure (§4.3 #4).
- **FR-5.2 — Universal derivation.** Every entry whose validation fails MUST open exactly one exception — no threshold on the number of findings, no rule whose failure is tolerated, no sampling, no suppression (SM-8: 100%).
- **FR-5.3 — One exception per entry.** `exceptions.entry_id` MUST be `UNIQUE`. An entry can never accumulate a second exception, because it is validated exactly once.
- **FR-5.4 — Stated basis binding.** The exception MUST reference its `validation_result_id`, and the database MUST reject a reference to a passing result (F0 FR-0.11). The findings MUST NOT be copied onto the exception in mutable form; they are read through the referenced validation result so that the basis and the record of the basis cannot diverge.
- **FR-5.5 — Basis immutability.** Adding, removing, re-wording, or re-ordering findings after creation MUST be impossible: `validation_findings` has no update or delete path (F4 FR-4.12). A resolution recorded later (F11) does not touch them.
- **FR-5.6 — Lifecycle states.** `state` MUST be exactly one of `OPEN`, `RESOLVED`, `REJECTED`, with allowed transitions `OPEN → RESOLVED` and `OPEN → REJECTED` only. `RESOLVED` and `REJECTED` are terminal. There MUST be no `REOPEN`, `IN_PROGRESS`, `ON_HOLD`, `ESCALATED`, `PENDING_REVIEW`, `CLAIMED`, or `SNOOZED` state — each of those would imply workflow, assignment, or supervision that is out of scope (PRD §10 #2, #4).
- **FR-5.7 — No transition without a human decision.** The only writer of `exceptions.state` MUST be F11's decision handler. No other service, job, worker, retry path, cron task, or database trigger may write it. The constraint trigger of F0 FR-0.9 enforces this at the database, so even a direct SQL update fails unless a matching human decision row exists in the same transaction (NFR-5, SM-4).
- **FR-5.8 — Receipt position.** `receipt_position` MUST be assigned from a dedicated sequence at insert, be `NOT NULL UNIQUE`, and be immutable. It MUST be the only ordering attribute exposed to F7. Gaps in the sequence (from rolled-back transactions) are acceptable and MUST NOT be compacted, renumbered, or reused — renumbering would rewrite queue history.
- **FR-5.9 — No prioritisation surface.** The exception MUST carry no `priority`, `severity`, `risk_score`, `due_at`, `sla_*`, `assigned_to`, `claimed_by`, or `escalated_at` column, and no such value may be derivable from the API response. Receipt order is the whole ordering model (§4.3 #5, PRD §10 #4).
- **FR-5.10 — Case reference exposure.** The exception MUST expose the entry's `case_reference` in every API representation and in the UI, obtained by join rather than duplication, so one case has exactly one reference in exactly one place.
- **FR-5.11 — Opening audit entry.** Exactly one `EXCEPTION_OPENED` audit entry MUST be written in the creation transaction, and the commit MUST fail without it (F0 FR-0.10c, NFR-6).
- **FR-5.12 — Recommendation placeholder.** F5 MUST create the `recommendations` row in `PENDING` status in the same transaction, so the case detail screen can distinguish "the recommendation is being generated" from "no recommendation was ever requested". Creating the placeholder MUST NOT itself write an audit entry — the `EXCEPTION_OPENED` entry covers the transaction's state change, and the recommendation's own audit entry is written when it reaches a terminal status (F9, F13).
- **FR-5.13 — Placeholder is not a resolution.** The `PENDING` recommendation MUST NOT affect the exception's state, MUST NOT populate any resolution value, and MUST NOT be returned as if it were a decision. Structurally, `recommendations` and `decisions` are separate tables with separate lifecycles; only a `decisions` row constitutes a resolution (F11 FR-11.1).
- **FR-5.14 — Closure fields.** `closed_at` and `decision_id` MUST be `NULL` while `state = 'OPEN'` and `NOT NULL` in a terminal state, enforced by a `CHECK`. A "closed" exception with no decision, or an open exception with a decision, is therefore unrepresentable.
- **FR-5.15 — No deletion.** There MUST be no endpoint or service method that deletes an exception, an entry, a validation result, or a decision. Cases are permanent; the audit trail depends on their continued existence.

---

**Inputs (internal — F5 has no public interface):**
- `entry_id` (uuid) — the entry just persisted
- `validation_result_id` (uuid) with `outcome = 'FAIL'`
- `findings` (Finding[], ≥ 1) from F4
- `actor_specialist_id` (uuid) — the submitting specialist, recorded as the `SYSTEM`-action principal
- Open transaction handle and the case-anchor row lock

**Outputs:**
- Persisted `exceptions` row (`state = 'OPEN'`, `receipt_position` assigned)
- Persisted `recommendations` row (`status = 'PENDING'`)
- `EXCEPTION_OPENED` audit entry with one value row per finding
- `{ exception_id, state, receipt_position, case_reference }` returned to F3 for the receipt response

**Validation:**
- `outcome` MUST be `FAIL`; a `PASS` result MUST raise before any insert, and is additionally refused by the composite foreign key.
- `findings` MUST be non-empty; an empty finding list with a `FAIL` outcome is an engine contradiction and aborts the transaction.
- `entry_id` MUST NOT already have an exception (`UNIQUE`).
- The transaction MUST be the same one that persisted the entry and the validation result; F5 MUST NOT be callable outside a receipt transaction (enforced by requiring the transaction handle and the receipt context object as parameters, with no default).

**Error States:**

| Scenario | Handling | Error code | Result |
|---|---|---|---|
| Invoked with a `PASS` validation result | Raise; transaction aborts | `EXCEPTION_WITHOUT_BASIS` | HTTP 500; receipt rolled back, nothing saved |
| Invoked with zero findings | Raise; transaction aborts | `EXCEPTION_WITHOUT_BASIS` | HTTP 500; receipt rolled back |
| Entry already has an exception | `UNIQUE` violation; transaction aborts | `EXCEPTION_ALREADY_EXISTS` | HTTP 500 (unreachable via the API, since validation runs once) |
| Audit entry write fails | Transaction aborts at commit | `AUDIT_COUPLING_VIOLATION` | HTTP 500; no exception persisted |
| Attempted state change without a decision | Constraint trigger refuses commit | `HITL_VIOLATION` | Commit refused; state unchanged |

**API Surface (this feature):** none of its own. The exception becomes visible through `POST /api/entries` (F3), `GET /api/exceptions` (F7), and `GET /api/exceptions/{id}` (F7). There is deliberately **no** create, update, or delete endpoint for exceptions; the only mutating exception endpoint in the product is `POST /api/exceptions/{id}/decision` (F11). See `Y1-api.md` §3.

**Schema Surface (this feature):** writes `exceptions` (id, entry_id, validation_result_id, validation_outcome, state, receipt_position, opened_at, closed_at, decision_id) and the `PENDING` `recommendations` row; depends on `exception_receipt_position_seq`. See `Y0-schema.md` §4 Exceptions.

**Acceptance Criteria:**
1. Every entry that fails validation has exactly one `OPEN` exception after receipt; every entry that passes has none.
2. Three sequential failing entries receive strictly increasing `receipt_position` values.
3. `INSERT INTO exceptions` referencing a `PASS` validation result is rejected by the database.
4. `UPDATE exceptions SET state = 'RESOLVED'` executed directly in SQL, with no `decisions` row, fails at `COMMIT` with `HITL_VIOLATION`.
5. No route exists to create, update (other than via decision), or delete an exception.
6. A schema dump of `exceptions` contains no priority, assignment, or SLA column, and no state outside the three enumerated values.
7. A newly opened exception has a `PENDING` recommendation row and no `decisions` row.
8. Rolling back a receipt after `receipt_position` allocation leaves a sequence gap, and the queue order of surrounding cases is unaffected.

---
