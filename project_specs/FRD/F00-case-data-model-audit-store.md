## F0: Case Data Model & Append-Only Audit Store

**Priority:** P0 · **Surface:** Data · **Dependencies:** none (foundation) · **PRD trace:** §5.1 F0, NFR-3, NFR-4, NFR-6, SM-6, SM-7, SM-8

**Description:** F0 is the persistence foundation the rest of the product is built on: cargo entries, validation results and findings, exceptions, recommendations and their proposed values, decisions and their resolution values, and audit entries with per-value before/after detail. Its defining characteristic is that the governance guarantees are **properties of the schema**, not of application code. Append-only audit storage is enforced by revoked `UPDATE`/`DELETE` privileges plus a mutation-rejecting trigger; the impossibility of an AI-applied resolution is enforced by a deferred constraint trigger that requires a human-authored decision row for any exception state change; and the 1:1 coupling of state changes to audit entries is enforced by deferred constraint triggers rather than by convention. An application bug, an ORM convenience method, or a direct `psql` session cannot circumvent any of them.

**Terminology (feature-specific):**
- **Append-only store:** a table on which the application database role holds `SELECT` and `INSERT` only, and on which a `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger raises unconditionally, so mutation fails for *every* role including the owner.
- **Deferred constraint trigger:** a `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` that evaluates an invariant at `COMMIT`, allowing multi-statement writes inside one transaction while still refusing to commit an invalid combination.
- **Case anchor:** `cargo_entries.id`. Every audit entry references it, because the first case event (`ENTRY_RECEIVED`) predates the exception.
- **Hash chain:** per-case linkage where each audit entry stores `prev_entry_hash` (the prior entry's `entry_hash` for that case, or 32 zero bytes for sequence 1) and `entry_hash` = SHA-256 over the entry's canonical serialisation concatenated with `prev_entry_hash`.
- **Canonical serialisation:** deterministic JSON encoding used for hashing and for value comparison — object keys sorted lexicographically, no insignificant whitespace, `timestamptz` as RFC 3339 UTC with microsecond precision, `NULL` as JSON `null`, decimals as unquoted fixed-scale numbers.

**Sub-features:**
- Relational schema for the eight core entities and their relationships
- Append-only audit store: `audit_entries` + `audit_entry_values`
- Per-value provenance modelling (`AI` | `HUMAN`) on entry, recommendation, decision, and audit values
- Monotonic per-case audit sequencing with a global sequence tiebreaker
- Tamper-evidence via per-entry sequence and prior-entry hash linkage
- Structural human-in-the-loop enforcement at the database level
- Transactional coupling of state changes to audit entries
- Forward-only migrations

---

### Entities and Relationships

| Entity | Table | Cardinality | Mutability after insert |
|---|---|---|---|
| Specialist | `specialists` | 1 | `last_sign_in_at`, `is_active` only |
| Session | `sessions` | N per specialist | `last_seen_at`, `revoked_at` only |
| Cargo entry | `cargo_entries` | 1 per case | **immutable** (entry of record) |
| Entry field origin | `cargo_entry_field_origins` | N per entry | **immutable** |
| Validation result | `validation_results` | exactly 1 per entry | **immutable** |
| Validation finding | `validation_findings` | 0..N per result | **immutable** |
| Exception | `exceptions` | 0..1 per entry | `state`, `closed_at`, `decision_id` only, once, `OPEN` → terminal |
| Recommendation | `recommendations` | 0..1 per exception | `status` and result columns once, `PENDING` → terminal |
| Recommendation value | `recommendation_values` | 0..N per recommendation | **immutable** |
| Decision | `decisions` | 0..1 per exception | **immutable** |
| Decision value | `decision_values` | 0..N per decision | **immutable** |
| Audit entry | `audit_entries` | N per case | **append-only (enforced)** |
| Audit entry value | `audit_entry_values` | 0..N per audit entry | **append-only (enforced)** |

Relationship chain: `cargo_entries 1—1 validation_results 1—0..N validation_findings`; `cargo_entries 1—0..1 exceptions 1—0..1 recommendations`; `exceptions 1—0..1 decisions`; `cargo_entries 1—N audit_entries 1—0..N audit_entry_values`.

**Explicitly absent columns** (scope boundary, PRD §10): no `assigned_to`, `assignee_id`, `priority`, `severity_rank`, `sla_due_at`, `age_days`, `role`, `permission`, `tenant_id`, `exported_at`, `source_system`, `ingestion_batch_id`, `is_seed`, `tariff_*`, or `hts_code` column exists on any table.

---

### Functional Requirements

- **FR-0.1 — Entry immutability.** `cargo_entries` rows MUST be insert-only from the application's perspective: no service method, endpoint, or UI affordance updates a cargo entry after receipt. Corrections live on `decision_values` as a resolution, never as an overwrite of the entry of record.
- **FR-0.2 — Per-value provenance.** Every table that stores a *value* (`cargo_entry_field_origins`, `recommendation_values`, `decision_values`, `audit_entry_values`) MUST carry an `origin` column constrained to `('AI','HUMAN')`. There MUST be no code path that persists a value without an origin; the columns are `NOT NULL` (nullable only for the `before_origin` of a value that had no prior state).
- **FR-0.3 — Constant-origin enforcement.** `cargo_entry_field_origins.origin` MUST be `CHECK (origin = 'HUMAN')` — manually typed entry values are human by construction. `recommendation_values.origin` MUST be `CHECK (origin = 'AI')` — a proposal is machine-originated by construction. Mixed origin is possible only on `decision_values`, which is exactly where a human edit of an AI proposal is recorded.
- **FR-0.4 — Audit append-only privileges.** The application database role (`cargoexec_app`) MUST hold only `SELECT, INSERT` on `audit_entries` and `audit_entry_values`. `UPDATE`, `DELETE`, and `TRUNCATE` MUST be revoked from `cargoexec_app` and from `PUBLIC`. Revocation is a migration artefact, verified by a test that asserts the privilege set via `information_schema.table_privileges`.
- **FR-0.5 — Audit mutation trigger.** In addition to FR-0.4, a `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger on both audit tables MUST raise an exception with error code `AUDIT_IMMUTABLE` unconditionally. This defends against a connection made with the owner or superuser role, which privilege revocation alone does not cover. `ON CONFLICT DO UPDATE` against an audit table MUST therefore also fail.
- **FR-0.6 — Monotonic per-case sequence.** `audit_entries` MUST carry `case_sequence integer NOT NULL` with `UNIQUE (case_id, case_sequence)` and `CHECK (case_sequence >= 1)`. Sequence assignment MUST occur under a row lock on the case anchor (`SELECT ... FROM cargo_entries WHERE id = :case_id FOR UPDATE`), so concurrent writers to the same case serialise and no gap or duplicate can arise. A monotonically increasing `global_sequence bigint` (identity column) MUST provide a total order across cases for tiebreaking in tests.
- **FR-0.7 — Hash linkage.** Each audit entry MUST store `prev_entry_hash bytea NOT NULL` and `entry_hash bytea NOT NULL`, both 32 bytes (`CHECK (octet_length(...) = 32)`), with `UNIQUE (entry_hash)`. For `case_sequence = 1`, `prev_entry_hash` MUST be 32 zero bytes. For `case_sequence = n > 1`, it MUST equal the `entry_hash` of entry `n-1` of the same case — enforced by a deferred constraint trigger, not only by application code.
- **FR-0.8 — Chain verifiability.** A read-only verification routine MUST recompute the chain for a case and report `chain_verified: true|false` plus the `case_sequence` of the first divergence. It is consumed by F14's audit read (`GET /api/exceptions/{id}/audit`). It MUST be read-only: it never repairs, rewrites, or annotates the chain.
- **FR-0.9 — Human-in-the-loop constraint trigger.** A deferred constraint trigger on `exceptions` MUST refuse to commit any transition out of `OPEN` unless, at commit time, a `decisions` row exists for that exception whose `decided_by` is a non-null `specialists.id` and whose `resulting_state` equals the exception's new `state`. Violation raises `HITL_VIOLATION`. Combined with `decisions.decided_by NOT NULL REFERENCES specialists(id)`, this makes an AI- or system-resolved exception structurally unrepresentable: the AI has no row in `specialists`, so it cannot satisfy the foreign key.
- **FR-0.10 — Audit-coupling constraint triggers.** Deferred constraint triggers MUST refuse to commit: (a) a `cargo_entries` insert without an `audit_entries` row for that case with `action_type = 'ENTRY_RECEIVED'`; (b) a `validation_results` insert without a `VALIDATION_COMPLETED` entry; (c) an `exceptions` insert without an `EXCEPTION_OPENED` entry; (d) a `decisions` insert without exactly one audit entry referencing that `decision_id`; (e) a `recommendations` status transition to `AVAILABLE`/`UNAVAILABLE` without exactly one audit entry referencing that `recommendation_id` with the matching action. Violation raises `AUDIT_COUPLING_VIOLATION`. This is NFR-6 enforced by the database rather than by discipline.
- **FR-0.11 — Exception derivation integrity.** `validation_results` MUST carry `UNIQUE (id, outcome)`, and `exceptions` MUST carry `validation_result_id` plus a redundant `validation_outcome` column with `CHECK (validation_outcome = 'FAIL')` and a composite foreign key `(validation_result_id, validation_outcome) REFERENCES validation_results (id, outcome)`. An exception whose basis is a passing validation is therefore rejected by the database (SM-8: zero exceptions without a validation basis), with no trigger required.
- **FR-0.12 — Single decision per exception.** `decisions` MUST carry `UNIQUE (exception_id)`. A second decision attempt fails at the database even if application-level conflict handling is bypassed (R-11).
- **FR-0.13 — Single recommendation per exception.** `recommendations` MUST carry `UNIQUE (exception_id)`. v1 generates one recommendation per exception; there is no recommendation history or regeneration surface.
- **FR-0.14 — Receipt ordering.** `exceptions.receipt_position bigint` MUST be assigned from a dedicated database sequence at insert, be `NOT NULL UNIQUE`, and have no `UPDATE` path in application code. It is the sole ordering dimension for F7.
- **FR-0.15 — Reason storage and non-emptiness.** `decisions.reason text` MUST satisfy `CHECK (decision_type = 'APPROVE' OR (reason IS NOT NULL AND length(btrim(reason)) >= 10))` and `CHECK (reason IS NULL OR length(reason) <= 2000)`. Mandatory reason capture on edit and reject is therefore a storage invariant as well as an API rule (F11), so a bypass of the API layer still cannot record a reasonless edit or rejection.
- **FR-0.16 — Timestamps.** All timestamps MUST be `timestamptz` defaulting to `now()` where the database is authoritative (`audit_entries.occurred_at`, `cargo_entries.received_at`). Audit timestamps MUST NOT be client-supplied.
- **FR-0.17 — Migrations.** Schema creation and evolution MUST be forward-only, numbered, transactional migration files applied by a distinct owner role (`cargoexec_owner`); the application role has no DDL privilege. Privilege revocations and triggers of FR-0.4, FR-0.5, FR-0.9, and FR-0.10 MUST be created in the same migration as the tables they protect, so no deployment window exists in which the audit store is mutable.
- **FR-0.18 — No seed data.** Migrations MUST create schema objects only. No migration inserts a cargo entry, exception, recommendation, decision, or audit entry (PRD §10 #7). Creating the first specialist account is an operational provisioning step performed outside migrations (F1 FR-1.13).

**Inputs:** F0 exposes no HTTP interface. Its consumers are the service layer of F3, F4, F5, F9, F11, F13, F7, and F1. Its inputs are therefore repository-level writes within the transactions those features define.

**Outputs:**
- A migrated PostgreSQL schema with all constraints, indexes, privileges, and triggers in place
- A privilege-verification test report asserting `cargoexec_app` cannot `UPDATE`/`DELETE` either audit table
- A chain-verification routine consumed by F14

**Validation:**
- Origin values MUST be one of `AI`, `HUMAN`; any other value is rejected by a `CHECK`.
- State values MUST be one of the enumerated sets (`exceptions.state ∈ {OPEN, RESOLVED, REJECTED}`; `recommendations.status ∈ {PENDING, AVAILABLE, UNAVAILABLE}`; `cargo_entries.receipt_outcome ∈ {VALIDATED_CLEAN, EXCEPTION_OPENED}`).
- `audit_entries.actor_specialist_id` MUST be `NOT NULL` when `actor_type = 'SPECIALIST'` and `NULL` when `actor_type = 'AI'` (`CHECK`).
- Hash columns MUST be exactly 32 bytes.
- `case_reference` MUST match `^CE-[0-9]{4}-[0-9]{6}$` (`CHECK`) and be unique.

**Error States:**

| Scenario | Raised by | Error code | Result |
|---|---|---|---|
| `UPDATE`/`DELETE` on an audit table by app role | privilege check | `AUDIT_IMMUTABLE` | Statement rejected (`42501`); transaction aborts |
| `UPDATE`/`DELETE` on an audit table by owner/superuser | mutation trigger | `AUDIT_IMMUTABLE` | Statement rejected; transaction aborts |
| Exception state change with no matching decision row | HITL trigger | `HITL_VIOLATION` | `COMMIT` refused |
| State change committed without its audit entry | coupling trigger | `AUDIT_COUPLING_VIOLATION` | `COMMIT` refused |
| Exception created from a passing validation result | composite FK | `EXCEPTION_WITHOUT_BASIS` | Insert rejected |
| Second decision for one exception | `UNIQUE (exception_id)` | `EXCEPTION_ALREADY_DECIDED` | Insert rejected; surfaced as HTTP 409 by F11 |
| Edit/reject decision with blank reason | `CHECK` | `REASON_REQUIRED` | Insert rejected; surfaced as HTTP 422 by F11 |
| Broken hash linkage on insert | chain trigger | `AUDIT_CHAIN_BROKEN` | `COMMIT` refused |

**API Surface (this feature):** none. F0 is a data feature; it publishes no endpoint. See `Y1-api.md` for the endpoints that consume it.

**Schema Surface (this feature):** all of it. `Y0-schema.md` is the authoritative DDL for `specialists`, `sessions`, `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, `exceptions`, `recommendations`, `recommendation_values`, `decisions`, `decision_values`, `audit_entries`, `audit_entry_values`, plus the privilege revocations and the four trigger families (immutability, chain, HITL, audit coupling).

**Acceptance Criteria:**
1. `UPDATE audit_entries SET action_type = 'X'` executed as `cargoexec_app` fails; executed as `cargoexec_owner` also fails.
2. `DELETE FROM audit_entry_values` fails for both roles.
3. A transaction that sets `exceptions.state = 'RESOLVED'` without inserting a `decisions` row fails at `COMMIT` with `HITL_VIOLATION`.
4. A transaction that inserts a `decisions` row without an audit entry fails at `COMMIT` with `AUDIT_COUPLING_VIOLATION`.
5. Inserting an `exceptions` row referencing a `validation_results` row with `outcome = 'PASS'` fails.
6. Two concurrent audit writes to the same case produce `case_sequence` 1 and 2 with correct `prev_entry_hash` linkage and no gap.
7. A schema dump contains none of the columns listed in §Explicitly absent columns.

---
