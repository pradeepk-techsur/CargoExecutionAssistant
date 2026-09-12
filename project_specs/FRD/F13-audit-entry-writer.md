## F13: Audit Entry Writer — Append-Only on Every State Change

**Priority:** P0 · **Surface:** Programmatic API / Data · **Dependencies:** F0 · **PRD trace:** §5.6 F13, NFR-3, NFR-4, NFR-6, SM-6, SM-7, R-4

**Description:** F13 is the single chokepoint through which all history is written. Every state change in the system — entry received, validation completed, exception opened, recommendation generated, recommendation unavailable, recommendation approved, recommendation edited and approved, recommendation rejected — writes exactly one append-only audit entry recording who acted, what action occurred, when, the before and after values, and the AI-vs-human origin of each value involved. The writer is invoked inside the same transaction as the change it describes, so an unaudited state change is not a possible outcome, and it offers no update or delete operation at all.

**Terminology (feature-specific):**
- **Audit writer:** the single service module exposing one method, `append(tx, entry)`. It has no other public operation — no `update`, no `delete`, no `redact`, no `correct`, no `backfill`.
- **Value row:** an `audit_entry_values` record describing one field's before/after values and their origins, attached to an audit entry.
- **Case sequence:** the monotonic per-case ordinal (`case_sequence`), assigned under the case-anchor row lock.
- **Chain link:** `prev_entry_hash` → `entry_hash`, which makes any excision or substitution within a case detectable.
- **Actor:** `SPECIALIST` with an id, `AI` with no id, or `SYSTEM` (a deterministic derivation performed inside a specialist's request, which still records the requesting specialist for traceability).

**Sub-features:**
- One audit entry per state change, written transactionally with that change
- Recorded fields: actor identity (or `AI`), action type, timestamp, before value, after value, per-value origin
- Reason text carried onto the entry for edit and reject decisions
- Insert-only interface — no update or delete operation exposed or implemented
- Coverage of the full state-change set, verified 1:1 by test
- Monotonic per-case sequencing establishing unambiguous order
- Mutation attempts rejected at the persistence layer

---

### The audit entry shape

| Field | Type | Content |
|---|---|---|
| `id` | uuid | Primary key |
| `case_id` | uuid | The case anchor (`cargo_entries.id`) — always present |
| `case_sequence` | integer | Monotonic within the case, from 1 |
| `global_sequence` | bigint | Identity column; total order across cases |
| `action_type` | enum | One of the eight actions |
| `actor_type` | enum | `SPECIALIST` \| `AI` \| `SYSTEM` |
| `actor_specialist_id` | uuid | The human actor; `NULL` when `actor_type = 'AI'`; the requesting specialist when `SYSTEM` |
| `occurred_at` | timestamptz | Database `now()`; never client-supplied |
| `exception_id` | uuid | Set from `EXCEPTION_OPENED` onward |
| `recommendation_id` | uuid | Set on recommendation actions |
| `decision_id` | uuid | Set on decision actions |
| `before_state` | text | State before the change, or `NULL` for a creation |
| `after_state` | text | State after the change |
| `reason` | text | Decision reason for edit and reject; `NULL` otherwise |
| `request_id` | text | Correlation identifier for the originating request |
| `prev_entry_hash` | bytea(32) | Previous entry's hash, or 32 zero bytes at sequence 1 |
| `entry_hash` | bytea(32) | SHA-256 of the canonical serialisation ‖ `prev_entry_hash` |

Each value row (`audit_entry_values`): `audit_entry_id`, `field_name`, `before_value`, `before_origin` (`AI`\|`HUMAN`\|`NULL`), `after_value`, `after_origin` (`AI`\|`HUMAN`\|`NULL`), `changed` (boolean), PK `(audit_entry_id, field_name)`.

---

### Action coverage — exactly one entry per transition

| Action | Written by | Actor | before → after | Value rows |
|---|---|---|---|---|
| `ENTRY_RECEIVED` | F3 step 7 | `SPECIALIST` | `NULL` → `RECEIVED` | One per submitted field: `after_value` = submitted value, `after_origin = 'HUMAN'` |
| `VALIDATION_COMPLETED` | F3 step 9 | `SYSTEM` | `RECEIVED` → `VALIDATED_CLEAN` \| `EXCEPTION_OPENED` | One per finding: `field_name` = finding field, `after_value` = failure code + message |
| `EXCEPTION_OPENED` | F5 step 4 | `SYSTEM` | `NULL` → `OPEN` | One per finding (the stated basis) |
| `RECOMMENDATION_GENERATED` | F9 step 7 | `AI` | `PENDING` → `AVAILABLE` | One per proposed value: `before_value` = submitted value (`before_origin = 'HUMAN'` or `NULL`), `after_value` = proposal, `after_origin = 'AI'` |
| `RECOMMENDATION_UNAVAILABLE` | F9 step 8 | `AI` | `PENDING` → `UNAVAILABLE` | None. `after_state` is exactly `'UNAVAILABLE'`; the enumerated `failure_reason` lives on `recommendations.failure_reason` and is joined for display through `audit_entries.recommendation_id`. **No `failure_reason` column exists or may be added on either audit table.** |
| `RECOMMENDATION_APPROVED` | F11 step 13 | `SPECIALIST` | `OPEN` → `RESOLVED` | One per resolution value: `before_value` = proposal, `before_origin = 'AI'`, `after_value` = recorded value, `after_origin = 'AI'` |
| `RECOMMENDATION_EDITED_AND_APPROVED` | F11 step 13 | `SPECIALIST` | `OPEN` → `RESOLVED` | One per resolution value with `after_origin` = `HUMAN` for changed values and `AI` for unchanged; `changed` set accordingly; `reason` on the entry |
| `RECOMMENDATION_REJECTED` | F11 step 13 | `SPECIALIST` | `OPEN` → `REJECTED` | One per declined proposed value: `before_value` = proposal, `before_origin = 'AI'`, `after_value = NULL`; `reason` on the entry |

There are exactly eight actions and exactly eight transitions (§0.6). A ninth action type MUST NOT be added without a corresponding transition, and a transition MUST NOT exist without an action.

---

### Functional Requirements

- **FR-13.1 — Single writer.** All audit writes MUST go through the audit writer module. No other module, repository, ORM model, or migration may insert into `audit_entries` or `audit_entry_values` directly; a test MUST assert that the tables are referenced by exactly one module.
- **FR-13.2 — Insert-only interface.** The writer MUST expose exactly one operation, `append(tx, entry)`. No update, delete, upsert, merge, redact, correct, anonymise, backfill, or truncate operation may exist in the interface or the implementation (NFR-3).
- **FR-13.3 — Transactional coupling.** `append` MUST require an active transaction handle as its first argument and MUST have no way to open its own transaction or write outside the caller's. The state change and its audit entry therefore commit together or neither commits (NFR-6). F0's deferred constraint triggers verify the pairing at commit (FR-0.10).
- **FR-13.4 — Exactly one entry per state change.** Each transition MUST produce exactly one entry. Two entries for one change, or a change with none, MUST fail — the former by the coupling triggers' "exactly one" check, the latter by their existence check. Verified 1:1 by automated test across every transition type (SM-6).
- **FR-13.5 — Sequence assignment.** `case_sequence` MUST be assigned as `max(case_sequence) + 1` for the case, computed while holding the case-anchor row lock (`SELECT ... FROM cargo_entries WHERE id = :case_id FOR UPDATE`) acquired by the caller. Concurrent writers to one case serialise; `UNIQUE (case_id, case_sequence)` is the backstop.
- **FR-13.6 — Hash chain computation.** `prev_entry_hash` MUST be the previous entry's `entry_hash` for the case (32 zero bytes at sequence 1). `entry_hash` MUST be `SHA-256(canonical_json(entry_without_hashes ‖ ordered value rows) ‖ prev_entry_hash)`, where canonical JSON is defined in F0. Any excision, substitution, or reordering within a case therefore breaks verification (R-4).
- **FR-13.7 — Actor rules.** `actor_specialist_id` MUST come from the request principal (F1 FR-1.6) and MUST NOT be accepted from any client input. For `AI` actions it MUST be `NULL` and the entry MUST additionally record `model_id` context via the linked recommendation. For `SYSTEM` actions it MUST record the specialist whose request caused the derivation, so the trail shows whose action produced the validation and the exception.
- **FR-13.8 — Timestamp authority.** `occurred_at` MUST be the database's `now()` within the transaction. A client- or service-supplied timestamp MUST be rejected by the writer's signature (the field is not a parameter).
- **FR-13.9 — Per-value before/after with origin.** Every value row MUST carry `field_name`, `before_value`, `after_value`, and an origin for each side that exists. `before_origin` is `NULL` only where no prior value existed; `after_origin` is `NULL` only where the after value is `NULL` (a decline). No value may be recorded without an origin where a value exists (NFR-4, SM-3).
- **FR-13.10 — Reason carried onto the entry.** For `RECOMMENDATION_EDITED_AND_APPROVED` and `RECOMMENDATION_REJECTED`, `reason` MUST be copied verbatim onto the audit entry, not merely referenced through the decision, so the trail is self-contained when read (SM-5, NFR-7).
- **FR-13.11 — Values are recorded verbatim.** Values MUST be stored exactly as they were submitted or proposed, without normalisation, truncation, rounding, or case folding. `before_value` and `after_value` are `text`; numeric and date values are serialised canonically (F0) so comparisons in the trail are exact.
- **FR-13.12 — Secrets never written.** The writer MUST NOT accept, and MUST NOT persist, passwords, session tokens, CSRF tokens, API keys, or authorisation headers. A denylist check on `field_name` and a value-shape check MUST reject an attempt to write one, failing the transaction rather than silently dropping it (NFR-8, R-12).
- **FR-13.13 — Mutation rejected at the persistence layer.** `UPDATE` and `DELETE` against either audit table MUST fail for every role, by revoked privilege for the application role and by an unconditional trigger for all roles including the owner (F0 FR-0.4, FR-0.5). Verified including a direct database attempt (SM-7, 100% rejected).
- **FR-13.14 — No retention, archival, or purge path.** There MUST be no scheduled deletion, retention window, rollup, compaction, archival job, or "clear history" operation. Audit entries are permanent for the life of the deployment.
- **FR-13.15 — Read path.** F13 MUST expose a read operation returning a case's entries in ascending `case_sequence` with their value rows and the linked specialist display names, plus a `chain_verified` result from the F0 verification routine. The read path MUST be separate from the write path and MUST be strictly read-only (consumed by F14 through `GET /api/exceptions/{id}/audit`).
- **FR-13.16 — Failure is loud.** If `append` fails for any reason, the exception MUST propagate and abort the caller's transaction. It MUST NOT be caught, logged-and-continued, retried outside the transaction, queued for later, or written to a fallback file. A state change that could not be audited MUST NOT occur.
- **FR-13.17 — Boundary: session events are not case audit entries.** Sign-in, sign-out, and session expiry MUST NOT be written here: `case_id` is `NOT NULL` and no case state changes at authentication. Session history lives on the `sessions` table (F1 FR-1.12). Likewise **reads are not audited** — viewing a queue, a case, or an audit trail changes no state, and recording views would create per-specialist activity data that supervisory monitoring (out of scope) would consume (F7 FR-7.10).
- **FR-13.18 — No export surface.** F13 MUST expose no bulk read, no download, no report, no streaming feed, and no cross-case query endpoint. The trail is read per case, in the UI (PRD §10 #5, NFR-7).

---

**Inputs (to `append`, all from server-side callers):**
- `tx` (transaction handle, required)
- `case_id` (uuid, required), `exception_id` / `recommendation_id` / `decision_id` (uuid, optional per action)
- `action_type` (enum, required — one of the eight)
- `actor` (`{ type: 'SPECIALIST', specialist_id }` | `{ type: 'AI' }` | `{ type: 'SYSTEM', on_behalf_of_specialist_id }`)
- `before_state` (text, nullable), `after_state` (text, required)
- `reason` (text, nullable — required by the caller for edit and reject)
- `values` (array of `{ field_name, before_value, before_origin, after_value, after_origin }`)
- `request_id` (text, optional)

**Outputs:**
- One `audit_entries` row with its assigned `case_sequence`, `global_sequence`, and hash chain link
- Zero or more `audit_entry_values` rows
- The new `audit_entry_id`, returned to the caller for inclusion in API responses (F11 FR-11.21)

**Validation:**
- `action_type` MUST be one of the eight; anything else raises.
- `actor_type` and `actor_specialist_id` MUST satisfy the pairing rule (`SPECIALIST` ⇒ id present; `AI` ⇒ id absent).
- `after_state` MUST be non-empty; `before_state` MUST be `NULL` only for creation actions.
- `reason` MUST be non-empty for the two decision actions that require it, and `NULL` or absent for `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED`, `RECOMMENDATION_GENERATED`, and `RECOMMENDATION_UNAVAILABLE`.
- Every `field_name` MUST be a member of the F3 entry field set, or a finding-scoped name for validation actions; `field_name` MUST NOT match the secrets denylist (FR-13.12).
- A value row MUST have at least one of `before_value` / `after_value` non-null.
- `case_id` MUST exist and MUST be locked by the caller; `case_sequence` MUST be exactly one greater than the case's current maximum.

**Error States:**

| Scenario | Handling | Error code | Result |
|---|---|---|---|
| Called without a transaction | Type error at compile time; runtime raise | `AUDIT_WRITE_INVALID` | Caller aborts |
| Invalid action or actor pairing | Raise | `AUDIT_WRITE_INVALID` | Transaction aborts; no state change |
| Missing required reason | Raise | `AUDIT_WRITE_INVALID` | Transaction aborts |
| Secret-shaped value or denylisted field | Raise | `AUDIT_WRITE_FORBIDDEN_CONTENT` | Transaction aborts |
| Sequence collision under concurrency | `UNIQUE` violation | `AUDIT_SEQUENCE_CONFLICT` | Transaction aborts; caller retried by the client, never silently |
| Broken chain link | Constraint trigger refuses commit | `AUDIT_CHAIN_BROKEN` | Commit refused |
| State change present with no entry | Deferred coupling trigger | `AUDIT_COUPLING_VIOLATION` | Commit refused |
| `UPDATE` / `DELETE` attempt | Privilege + trigger | `AUDIT_IMMUTABLE` | Statement rejected for every role |

All of the above surface to the API as `500` with the caller's generic code (`RECEIPT_FAILED` or `DECISION_FAILED`) and the message that nothing was saved; internal audit codes are never returned to the client.

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/exceptions/{exceptionId}/audit` | session | Read one case's audit trail in ascending sequence, with `chain_verified` |

No write endpoint exists. Full schemas in `Y1-api.md` §4 Audit.

**Schema Surface (this feature):** writes `audit_entries` and `audit_entry_values` (the only writer). Depends on the privilege revocations and triggers of `Y0-schema.md` §7 Audit.

**Acceptance Criteria:**
1. A test enumerating the eight transitions confirms exactly one audit entry per transition, with the expected action, actor type, before/after states, and value rows (SM-6).
2. Forcing the writer to fail during a decision leaves the case `OPEN`, with no decision row and no audit entry.
3. `UPDATE audit_entries` and `DELETE FROM audit_entries` fail as `cargoexec_app` and as `cargoexec_owner` (SM-7).
4. Deleting a middle entry is impossible; simulating one in a copy makes `chain_verified` false at the expected sequence.
5. An edit-and-approve entry carries the reason verbatim and per-value origins matching the decision exactly.
6. The audit writer module exposes exactly one public method, and no other module references the audit tables.
7. Viewing a case writes no audit entry; signing in writes no audit entry.
8. No endpoint returns audit entries for more than one case, and no download or export route exists.

---
