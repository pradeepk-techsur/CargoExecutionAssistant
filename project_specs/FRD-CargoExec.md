# Functional Requirements Document (FRD)
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.0 |
| **Date** | 2026-09-11 |
| **Author** | Pivota Spec Framework — FRD Generator |
| **Upstream Documents** | `.planning/PROJECT.md`, `project_specs/PRD-CargoExec.md` |
| **Downstream Documents** | TechArch-CargoExec, UserStories-CargoExec |
| **Feature Coverage** | F0–F14 (all PRD features, all P0) |

---

## 0. How To Read This Document

### 0.1 Scope Statement

This FRD specifies the behaviour of CargoExec v1 in implementable detail: every screen, every endpoint, every validation rule, every state transition, and every audit write. It covers exactly the fifteen features defined in PRD §5 (F0–F14) and nothing else. The PRD §10 exclusion list and the `.planning/PROJECT.md` "Out of Scope" list are **binding on this document**: no requirement, endpoint, table, column, query parameter, or UI control specified here exists to serve an excluded capability. Where an obvious-looking extension was deliberately not specified, this document says so explicitly rather than leaving silence (see §0.6).

The product's purpose is a complete and provable governed decision loop:

**receive → validate → except → recommend → human decide → audit**

Every requirement below serves one of those six stages, the statutory UI standard (USWDS + Section 508 / WCAG 2.1 AA), or the accountability guarantee (append-only audit, per-value provenance, no auto-apply).

### 0.2 Conventions

- **Feature IDs** (`F0`–`F14`) are inherited unchanged from PRD §5. Chunk filenames are zero-padded (`F00`…`F14`) for sort order; the feature is still named `F0`…`F14` in prose.
- **Requirement IDs** are `FR-{feature}.{n}` — e.g. `FR-4.3` is the third functional requirement of F4. Each is independently testable.
- **Validation rule IDs** are `RIV-{nnn}` (Required-Information Validation). See F4.
- **Error codes** are `SCREAMING_SNAKE_CASE` and catalogued once in `Y2-errors.md`.
- **Audit action types** are `SCREAMING_SNAKE_CASE` and enumerated once in §0.5 below.
- **State names** are `UPPER_CASE` (`OPEN`, `RESOLVED`, `REJECTED`).
- **Per-feature API and Schema sections are summaries.** The authoritative request/response schemas live in `Y1-api.md`; the authoritative DDL lives in `Y0-schema.md`.
- **Types**: `string`, `integer`, `decimal(12,2)`, `uuid`, `date` (ISO-8601 `YYYY-MM-DD`), `timestamptz` (ISO-8601 with offset, stored UTC), `boolean`, `enum`.
- **MUST / MUST NOT** denote requirements verified by acceptance test. **SHOULD** appears only where a genuine implementation latitude exists.
- **Assumption markers**: `[ASSUMPTION]` flags a decision this document makes that the PRD left open, so it is visible as an assumption rather than a silent invention. There is exactly one substantive assumption block — the F4 validation rule set.

### 0.3 Feature Chunk Index

| Chunk | Feature | Surface |
|---|---|---|
| `F00-case-data-model-audit-store.md` | F0: Case Data Model & Append-Only Audit Store | Data |
| `F01-authentication-session.md` | F1: Cargo Specialist Authentication & Session | API + sign-in screen |
| `F02-uswds-shell-accessibility.md` | F2: USWDS Application Shell & Accessibility Foundation | **UI** / assets |
| `F03-manual-entry-api.md` | F3: Manual Cargo Entry Creation (API) | API |
| `F04-required-information-validation.md` | F4: Required-Information Validation on Receipt | API / Data |
| `F05-exception-creation.md` | F5: Exception Creation from Validation Failure | API / Data |
| `F06-cargo-entry-web-ui.md` | F6: Cargo Entry Web UI | **UI** |
| `F07-review-queue-api.md` | F7: Review Queue (API) | API |
| `F08-review-queue-web-ui.md` | F8: Review Queue Web UI | **UI** |
| `F09-ai-recommendation-generation.md` | F9: AI Resolution Recommendation Generation | Integration / async |
| `F10-case-detail-recommendation-ui.md` | F10: Exception Case Detail & Recommendation Presentation UI | **UI** |
| `F11-human-decision-api.md` | F11: Human Decision Processing — Edit / Approve / Reject (API) | API |
| `F12-decision-web-ui.md` | F12: Decision Web UI — Edit, Approve, Reject with Reason Capture | **UI** |
| `F13-audit-entry-writer.md` | F13: Audit Entry Writer — Append-Only on Every State Change | API / Data |
| `F14-audit-trail-web-ui.md` | F14: Per-Case Audit Trail Web UI | **UI** |

### 0.4 Cross-Feature Chunk Index

| Chunk | Content |
|---|---|
| `Y0-schema.md` | Complete PostgreSQL DDL: tables, constraints, indexes, append-only privilege revocation, immutability triggers, human-in-the-loop constraint triggers, audit-coupling constraint triggers, migrations |
| `Y1-api.md` | Complete REST endpoint catalogue with request/response schemas, status codes, headers, and UI route table |
| `Y2-errors.md` | Cross-feature error catalogue: HTTP status, error code, message, cause, retry guidance |
| `Y3-integrations.md` | External integration contracts: hosted LLM provider, browser/session integration, data-handling boundaries |

### 0.5 Shared Terminology

These terms are used with exactly this meaning throughout the document. Feature-specific terms are defined in their own chunk.

- **Cargo entry** (or **entry**): the set of field values a specialist typed in and submitted. Persisted as received and **never mutated afterwards** — not by the AI, not by a decision. It is the entry of record.
- **Receipt**: the single atomic operation in which an entry is persisted, validated, and (on failure) turned into an exception. One transaction.
- **Case**: the whole lifecycle anchored on one cargo entry — the entry, its validation result, its exception (if any), its recommendation, its decision, and its audit entries. A case is identified by a human-readable **case reference** assigned at receipt.
- **Case reference**: display identifier of the form `CE-{YYYY}-{NNNNNN}` (e.g. `CE-2026-000137`), assigned at receipt, unique, immutable. Used in the UI, in URLs, and in the audit trail.
- **Validation finding** (or **finding**): one unsatisfied required-information rule, naming the rule, the field, and why it was not satisfied. Findings are the evidentiary basis of an exception.
- **Exception**: a case opened **because** validation failed. Derived, never authored. States `OPEN` → `RESOLVED` | `REJECTED`.
- **Receipt position**: the monotonically increasing integer assigned to an exception at creation. It is the **only** queue ordering dimension and is immutable.
- **Recommendation**: an AI-generated **proposal** attached to an exception — a recommended resolution action, a plain-language rationale, and a set of proposed field values, every one marked `AI` origin. A recommendation is a *separate record* from a resolution and has no effect on any state until a human decides.
- **Resolution**: the set of corrected field values a specialist has accepted, recorded on a **decision**. A resolution exists only as part of a decision record. There is no resolution without a decision, and no decision without an authenticated human actor.
- **Decision**: the accountable human act that closes an exception — `APPROVE`, `EDIT_APPROVE`, or `REJECT` — carrying actor, timestamp, reason (where required), resolution values, and per-value provenance.
- **Provenance / origin**: the `AI` or `HUMAN` attribution carried by an **individual value** (not by a record). Stored structurally and rendered distinguishably.
- **Audit entry**: one immutable, append-only record of one state change, sequenced within its case.
- **Specialist**: an authenticated user. The only role in the system. There is no other role (PRD §10 #3).
- **Actor type**: `SPECIALIST` (a named human), `AI` (machine-originated proposal), or `SYSTEM` (deterministic derivation performed inside a specialist's request, e.g. validation completion). `SYSTEM` and `AI` actors can never produce a decision (F11, Y0 §Human-in-the-loop triggers).
- **Degraded mode**: the state in which no recommendation is available for an exception because the AI provider failed. The case remains fully workable.

### 0.6 State Machines (Authoritative)

Every transition below writes **exactly one** audit entry, in the same transaction as the transition (F13, NFR-6). No other transitions exist.

**Entry receipt outcome** — set once inside the receipt transaction, immutable thereafter:

| From | To | Trigger | Audit action |
|---|---|---|---|
| (none) | `RECEIVED` | `POST /api/entries` accepted | `ENTRY_RECEIVED` |
| `RECEIVED` | `VALIDATED_CLEAN` | F4 produced zero findings | `VALIDATION_COMPLETED` |
| `RECEIVED` | `EXCEPTION_OPENED` | F4 produced ≥ 1 finding | `VALIDATION_COMPLETED` |

**Exception lifecycle** — terminal states; there is no reopen path:

| From | To | Trigger | Audit action |
|---|---|---|---|
| (none) | `OPEN` | validation failure (F5) — the only creation path | `EXCEPTION_OPENED` |
| `OPEN` | `RESOLVED` | specialist `APPROVE` (F11) | `RECOMMENDATION_APPROVED` |
| `OPEN` | `RESOLVED` | specialist `EDIT_APPROVE` (F11) | `RECOMMENDATION_EDITED_AND_APPROVED` |
| `OPEN` | `REJECTED` | specialist `REJECT` (F11) | `RECOMMENDATION_REJECTED` |

**Recommendation lifecycle** — a proposal record, never a resolution:

| From | To | Trigger | Audit action |
|---|---|---|---|
| (none) | `PENDING` | exception opened (F5 → F9) | *(none — part of `EXCEPTION_OPENED`)* |
| `PENDING` | `AVAILABLE` | provider returned a schema-valid recommendation | `RECOMMENDATION_GENERATED` |
| `PENDING` | `UNAVAILABLE` | provider error, timeout, or unusable response | `RECOMMENDATION_UNAVAILABLE` |

**Complete audit action set** (8 actions; verified 1:1 against transitions by test — SM-6):
`ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED`, `RECOMMENDATION_GENERATED`, `RECOMMENDATION_UNAVAILABLE`, `RECOMMENDATION_APPROVED`, `RECOMMENDATION_EDITED_AND_APPROVED`, `RECOMMENDATION_REJECTED`.

Sign-in, sign-out, and session expiry are **session** events, not case state changes; they are recorded on the `sessions` table and are deliberately **not** case audit entries (see F1 §Non-Requirements and F13 §Boundary).

### 0.7 Global Non-Requirements (Scope Boundary Restated)

This document specifies **no** requirement, endpoint, table, column, query parameter, field, or UI control for any of the following. Each is excluded by PRD §10 and `.planning/PROJECT.md`. A column or endpoint that exists "for later" is scope leakage and is absent by design:

1. No CI accessibility gate, axe-core integration, or `.github/workflows` file.
2. No supervisor dashboard and no queue-health, aging, volume, throughput, workload, reassignment, or re-prioritisation capability — and therefore no `assigned_to`, `priority`, `age_days`, or `sla_*` column anywhere in `Y0-schema.md`.
3. Exactly one authenticated role (`cargo specialist`). No `role` column, no permission table, no RBAC check. Authorisation is binary: authenticated or not.
4. No queue filtering, sorting, assignment, or prioritisation. `GET /api/exceptions` accepts **zero** query parameters.
5. No audit export in any format — no CSV, PDF, JSON, or print-package endpoint.
6. No file or API ingestion, bulk upload, ingestion adapter, or ACE/ATS interface. The only way data enters the system is one human filling in one form.
7. No seeded demonstration dataset, seed script, or fixture data in the deployed application. Domain code lists used by validation are compiled-in constants of the rule set, not seeded data rows (see F4 §Domain Code Lists).
8. No autonomous AI resolution. No scheduled job, worker, retry path, or system actor can change exception state.
9. No duty or tariff calculation and no classification rulings. Validation is presence, format, and simple domain-code checks only.
10. No native mobile client.
11. No model training or fine-tuning; the AI provider is consumed through a request/response API only.

---
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
## F1: Cargo Specialist Authentication & Session

**Priority:** P0 · **Surface:** Integrations / API + sign-in screen · **Dependencies:** F0 (schema), F2 (shell, for the sign-in screen) · **PRD trace:** §5.1 F1, §11.1 "Sign in | F1 + F2", NFR-8

**Description:** F1 provides credential-based sign-in, server-side session management, and explicit sign-out for the single authenticated role, `cargo specialist`. Its reason for existing is governance rather than perimeter security: the audit trail cannot attribute a decision to an actor unless the actor is identified, so every mutating request resolves to a concrete `specialists.id` that the audit writer (F13) consumes as `actor_specialist_id`. There is exactly one role — no supervisor, no auditor or read-only account, and no role-based access separation — so authorisation in CargoExec is binary: a request either carries a valid session or it does not. This feature also owns the sign-in screen, built on the F2 shell.

**Terminology (feature-specific):**
- **Session:** a server-side record in `sessions` identified by an opaque, high-entropy token whose hash is stored; the raw token exists only in the client cookie.
- **Absolute expiry:** the fixed lifetime from session creation (8 hours), after which the session is invalid regardless of activity.
- **Idle expiry:** the maximum gap between requests (30 minutes) before the session is invalid.
- **Request principal:** the `specialists` row resolved from the session cookie and attached to the request context; consumed by every mutating handler and by F13.
- **Binary authorisation:** authenticated ⇒ full product capability; unauthenticated ⇒ no capability except sign-in.

**Sub-features:**
- Credential sign-in establishing a server-side session
- Session validation middleware attaching the request principal
- Session expiry (absolute + idle) and explicit sign-out
- CSRF protection on state-changing requests
- Sign-in failure throttling
- Unauthenticated-access rejection for every route and endpoint except sign-in
- Sign-in screen (USWDS, accessible)

---

### Process — Sign-in

1. Specialist opens `/sign-in` (or is redirected there from a protected route, with the attempted path retained as the `next` parameter).
2. Specialist submits email and password.
3. Server looks up `specialists` by normalised email (lowercased, trimmed).
4. Server verifies the password against the stored Argon2id hash. Verification MUST run even when no specialist row was found, against a dummy hash, so response timing does not disclose account existence.
5. On failure: server increments the throttle counter and returns `401 AUTH_FAILED` with the single message "Email or password is incorrect." — identical for unknown email and wrong password.
6. On success: server checks `is_active`. If false, returns `403 ACCOUNT_INACTIVE`.
7. Server generates a 256-bit random token, stores its SHA-256 hash in `sessions` with `created_at`, `absolute_expires_at = created_at + 8h`, `last_seen_at = created_at`, and the user agent string.
8. Server issues the session cookie and a CSRF token, resets the throttle counter for that identifier, and updates `specialists.last_sign_in_at`.
9. Server returns `201` with the specialist's `id`, `display_name`, `email`, and the CSRF token.
10. Client navigates to `next` if it is a safe in-app path, otherwise to `/queue`.

### Process — Authenticated request

1. Middleware reads the session cookie; absent ⇒ unauthenticated outcome (see FR-1.7).
2. Middleware hashes the token and looks up the session; not found ⇒ unauthenticated outcome.
3. Middleware rejects the session if `revoked_at IS NOT NULL`, `now() > absolute_expires_at`, or `now() > last_seen_at + 30 minutes`. An expired session MUST be marked `revoked_at = now()` with `revocation_reason = 'EXPIRED'`.
4. Middleware loads the specialist; rejects if `is_active = false`.
5. For `POST`, `PUT`, `PATCH`, `DELETE`: middleware requires the `X-CSRF-Token` header to match the session's CSRF token; mismatch ⇒ `403 CSRF_INVALID`.
6. Middleware sets `last_seen_at = now()` (at most once per 60 seconds per session, to limit write amplification) and attaches the request principal.
7. Handler executes. Any audit entry it writes takes `actor_specialist_id` from the request principal.

### Process — Sign-out

1. Specialist activates "Sign out" in the F2 header.
2. Client sends `DELETE /api/session` with the CSRF header.
3. Server sets `revoked_at = now()`, `revocation_reason = 'SIGNED_OUT'`, clears the cookie, returns `204`.
4. Client discards in-memory state and navigates to `/sign-in` with a confirmation status message announced in the F2 live region.

---

### Functional Requirements

- **FR-1.1 — Single role.** Every authenticated user is a cargo specialist with identical capability. There MUST be no `role`, `is_supervisor`, `permissions`, or `scope` column, claim, or configuration value anywhere in the system (PRD §10 #3). No handler performs a role check.
- **FR-1.2 — Server-side sessions.** Session state MUST be server-side. The cookie MUST carry an opaque random token only — no identity claims, no signed payload, no JWT. Only the token's SHA-256 hash is persisted.
- **FR-1.3 — Cookie attributes.** The session cookie MUST be named `cargoexec_sid` and set `HttpOnly`, `Secure`, `Path=/`, and no `Domain`. It MUST be a session cookie with no `Max-Age`/`Expires`, so server-side expiry is the only authority on lifetime. `SameSite` is set by the configured cookie profile: **`governed` (the default) uses `SameSite=Lax`** and is the value to run in every deployment that can serve the application same-origin; a `demo-iframe` profile using `SameSite=None; Secure` is permitted **only** where a preview proxy embeds the application from a different origin, in which case a `Lax` cookie would never be sent and sign-in would be impossible (TechArch §0.4 D-2). The application MUST refuse to start if `demo-iframe` is combined with a non-TLS origin. CSRF protection does not depend on `SameSite` (FR-1.9), so neither profile weakens it.
- **FR-1.4 — Password storage.** Passwords MUST be hashed with Argon2id (memory ≥ 19 MiB, iterations ≥ 2, parallelism ≥ 1). Plaintext passwords MUST never be logged, included in an error response, or written to an audit entry (NFR-8).
- **FR-1.5 — Expiry.** Absolute expiry MUST be 8 hours from creation; idle expiry MUST be 30 minutes from `last_seen_at`. Neither is extendable beyond the absolute limit.
- **FR-1.6 — Identity available to the audit writer.** The request principal MUST be available to every handler and MUST be the sole source of `audit_entries.actor_specialist_id` for `SPECIALIST`-actor entries. A handler MUST NOT accept an actor identifier from the request body; if a body contains an actor field it is rejected as an unknown field (`422 REQUEST_MALFORMED`).
- **FR-1.7 — Unauthenticated access outcome.** Every route and endpoint except `POST /api/session`, `GET /sign-in`, and static assets requires a valid session. The outcome depends on request type:
  - **API request** (path starts `/api/`, or `Accept: application/json`): `401` with body `{"error":{"code":"UNAUTHENTICATED","message":"Sign in to continue."}}`, `WWW-Authenticate` omitted, no redirect.
  - **HTML document request** for a protected route: `302` to `/sign-in?next={percent-encoded original path}`.
  - **Already on `/sign-in` with a valid session:** `302` to `/queue`.
  The `next` value MUST be validated as a same-origin absolute path matching `^/[A-Za-z0-9/_\-]*$`; anything else is discarded and `/queue` is used (open-redirect prevention).
- **FR-1.8 — Session expiry during use.** When a session expires mid-session, the next API call returns `401 UNAUTHENTICATED`. The SPA MUST then discard state, navigate to `/sign-in?next={current path}`, and display the status message "Your session expired. Sign in again to continue." announced via the F2 live region. In-progress unsaved form input MUST NOT be silently submitted after re-authentication; the specialist re-enters it deliberately.
- **FR-1.9 — CSRF.** Every state-changing request MUST carry `X-CSRF-Token` matching the session's stored CSRF token (double-submit, compared with a constant-time comparison). The token is issued in the sign-in response and re-readable via `GET /api/session`. `GET` requests MUST NOT change state and are not CSRF-checked.
- **FR-1.10 — Sign-in throttling.** After 5 failed attempts for the same normalised email within a rolling 15-minute window, further attempts for that email return `429 TOO_MANY_ATTEMPTS` with `Retry-After`, for 15 minutes, without revealing whether the email exists. Throttle counters are held in the application's own store keyed by a hash of the email; they are **not** audit entries and **not** account state (there is no account-lockout flag, and no unlock surface, because there is no administrative role).
- **FR-1.11 — Concurrent sessions.** Multiple concurrent sessions for one specialist are permitted; sign-out revokes only the session that made the request. There is no session-management screen (it would be an administrative surface).
- **FR-1.12 — Session events are not case audit entries.** Sign-in, sign-out, and expiry MUST NOT write to `audit_entries`, which requires a `case_id` (F0 FR-0.6) and exists to record *case* state changes. Session history lives in the `sessions` table. This is a deliberate boundary, restated in F13 §Boundary; it is not an audit gap, because no case state changes at sign-in.
- **FR-1.13 — Account provisioning.** Specialist accounts are created by an operational CLI command run against the deployment (`create-specialist --email --display-name`, password set interactively). There is MUST be no self-registration, no password-reset endpoint, no invite flow, and no user-administration UI — all would be administrative surfaces outside v1 scope. This is stated so the absence is visible rather than accidental.
- **FR-1.14 — Secrets handling.** Session tokens, CSRF tokens, password hashes, and AI provider keys MUST never appear in logs, error responses, or audit entries (NFR-8). Log lines referencing a session MUST use the session's `id`, never its token.

---

### Sign-in Screen (User-Facing)

**Route:** `/sign-in` — the only unauthenticated screen. Built from the F2 shell in its reduced form: official-site banner, header without navigation links, `main` landmark, footer, and **no** sign-out affordance.

- **FR-1.15 — Form structure.** A single USWDS form with `<h1>` "Sign in to CargoExec", an email field (`type="email"`, `autocomplete="username"`), a password field (`type="password"`, `autocomplete="current-password"`), and one primary "Sign in" button. Both fields are programmatically required (`required` + visible "required" marking per F2). No "remember me", no third-party sign-in button, no registration or password-reset link (FR-1.13).
- **FR-1.16 — Client-side checks never substitute for the server.** The browser may flag an empty field, but the server decision is authoritative; the screen MUST handle a `401` for input the client considered valid.
- **FR-1.17 — Error presentation.** A failed sign-in renders a USWDS error summary at the top of `main` with `role="alert"`, receives focus, and states "Email or password is incorrect." The password field is cleared; the email value is retained. Field-level error styling MUST NOT indicate *which* field was wrong, because the server does not distinguish them.
- **FR-1.18 — Throttled presentation.** A `429` renders "Too many sign-in attempts. Try again in about 15 minutes." in the same error-summary pattern.
- **FR-1.19 — Pending state.** While the request is in flight the submit button is disabled with an accessible busy state (`aria-disabled="true"` plus visible "Signing in…" text), and the status is announced in the polite live region. Double submission MUST be prevented.
- **FR-1.20 — Keyboard and AT.** The whole screen is operable by keyboard alone (SM-11): tab order email → password → submit, `Enter` submits from either field, visible focus indicator throughout, labels programmatically associated, errors associated to the form via `aria-describedby` on the summary container.
- **FR-1.21 — Post-sign-in destination.** On success the specialist lands on `/queue` (or the validated `next` path). The header then exposes the specialist's display name and the sign-out control on every subsequent screen.

---

**Inputs:**
- `email` (string, required): trimmed and lowercased before lookup; max 254 chars; must contain exactly one `@` with a non-empty local part and a dot-containing domain.
- `password` (string, required): 12–256 characters; never trimmed; never logged.
- `X-CSRF-Token` (header, required on state-changing requests).
- `cargoexec_sid` (cookie, required on all authenticated requests).

**Outputs:**
- `201` sign-in response: `{ specialist: { id, email, display_name }, csrf_token, session: { absolute_expires_at } }` plus `Set-Cookie`.
- `200 GET /api/session`: the same body shape for the current session, used by the SPA on load to decide between the sign-in screen and the application shell.
- `204` sign-out response with a cookie-clearing `Set-Cookie`.
- A request principal attached to every authenticated request, consumed by F3, F7, F11, and F13.

**Validation:**
- Email MUST be present, ≤ 254 chars, and structurally a mail address; failure ⇒ `422 REQUEST_MALFORMED` (this is a request-shape error, distinct from wrong credentials).
- Password MUST be present and 12–256 chars; a present-but-short password MUST still return the generic `401 AUTH_FAILED` rather than a length error, so the response does not describe the stored credential policy of an existing account.
- Unknown body fields MUST be rejected (`422 REQUEST_MALFORMED`).
- `next` MUST match the same-origin path pattern or be discarded.

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| Wrong password or unknown email | 401 | `AUTH_FAILED` | "Email or password is incorrect." |
| Malformed request body | 422 | `REQUEST_MALFORMED` | "The request could not be read." |
| Account deactivated | 403 | `ACCOUNT_INACTIVE` | "This account is not active." |
| No/invalid/expired session on an API call | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| No session on an HTML route | 302 | — | Redirect to `/sign-in?next=…` |
| Missing or mismatched CSRF token | 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." |
| Throttled | 429 | `TOO_MANY_ATTEMPTS` | "Too many sign-in attempts. Try again in about 15 minutes." |

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/session` | none | Sign in; create session |
| `GET` | `/api/session` | session | Current principal + CSRF token |
| `DELETE` | `/api/session` | session + CSRF | Sign out; revoke session |

Full schemas in `Y1-api.md` §1 Session.

**Schema Surface (this feature):** `specialists` (id, email, display_name, password_hash, is_active, created_at, last_sign_in_at), `sessions` (id, specialist_id, token_hash, csrf_token_hash, created_at, absolute_expires_at, last_seen_at, revoked_at, revocation_reason, user_agent). No role or permission table. See `Y0-schema.md` §1 Identity.

**Acceptance Criteria:**
1. `GET /api/exceptions` without a cookie returns `401 UNAUTHENTICATED` and no data.
2. A browser navigation to `/queue` without a session redirects to `/sign-in?next=%2Fqueue`.
3. Sign-in with an unknown email and sign-in with a wrong password return byte-identical response bodies and status codes.
4. A `POST /api/exceptions/{id}/decision` without `X-CSRF-Token` returns `403 CSRF_INVALID` and writes no audit entry.
5. A session used 31 minutes after its last request returns `401`, and its `sessions.revoked_at` is set with reason `EXPIRED`.
6. After sign-out, replaying the old cookie returns `401`.
7. An audit entry written during a request carries the signed-in specialist's `id`; no code path allows the actor to be supplied by the client.
8. Sign-in completes using the keyboard only, with the error summary receiving focus on failure.

---
## F2: USWDS Application Shell & Accessibility Foundation

**Priority:** P0 (statutory constraint) · **Surface:** **User-facing interface** / Content & assets · **Dependencies:** none · **PRD trace:** §5.1 F2, NFR-1, NFR-2, NFR-10, NFR-12, SM-10, SM-11, SM-12

**Description:** F2 is the shared user-interface foundation every screen is built from: the USWDS asset pipeline and component library, the page shell (official-site banner, header, `main` landmark, footer), navigation, the form and validation-message patterns, error/empty/loading/degraded states, focus management, and the live regions through which status and error messages reach assistive technology. It is the feature that makes Section 508 / WCAG 2.1 AA conformance a property of the delivered interface rather than an aspiration: the accessible patterns are defined and built once here and inherited by F1's sign-in screen, F6, F8, F10, F12, and F14. Conformance is achieved by design and **manual** review — including an assistive-technology walkthrough of every screen — and explicitly not by an automated gate; v1 adds no CI accessibility workflow and no `.github/workflows` file (PRD §10 #1).

**Terminology (feature-specific):**
- **Shell:** the persistent page frame (banner, header, main, footer) plus the routing outlet into which screens render.
- **Screen:** a routed view owned by a UI feature (sign-in, entry form, queue, case detail, audit trail).
- **Error summary:** the USWDS pattern that lists all field errors at the top of a form, is `role="alert"`, receives focus on appearance, and links to each offending field.
- **Live region:** an `aria-live` container used to announce state changes that are not focus changes. Two exist in the shell: one `polite` for status, one `assertive` for errors.
- **Provenance badge:** the shared component that marks a value or event as AI-originated or human-originated, using text plus icon plus colour — never colour alone (NFR-2, NFR-4).
- **Reduced-motion mode:** the behaviour applied when `prefers-reduced-motion: reduce` is set.

**Sub-features:**
- USWDS component library, design tokens, typography, and asset pipeline
- Standard page shell: banner, header with sign-out affordance, `main`, footer
- Primary navigation and route structure
- Accessible form pattern: labels, hints, required marking, inline errors, error summary with focus movement
- Shared state components: loading, empty, error, degraded, read-only
- Provenance badge component
- Status/error live-region announcement service
- Focus management on navigation and on dynamic content change
- Per-screen accessibility design-and-review checklist (manual process)

---

### Process — Screen render and focus management

1. Router resolves the route; if the session is absent, F1 FR-1.7 applies before any screen renders.
2. Shell renders banner, header, `main`, footer once; subsequent navigations replace only the contents of `main`.
3. On every completed navigation the shell sets the document title to `{Screen name} — CargoExec`, announces the new title in the polite live region, and moves focus to the screen's `<h1>`, which carries `tabindex="-1"`.
4. The screen renders its state: `loading` → (`ready` | `empty` | `error`).
5. A `loading` state that persists beyond 300 ms renders the USWDS loading indicator with `aria-busy="true"` on the region being loaded and an announced "Loading…" status.
6. An `error` state renders the shared error component with a stated cause and, where the action is retryable, a "Try again" button; the message is announced in the assertive region.
7. On any content replacement that is not a navigation (for example, submitting the decision form in place), focus MUST be moved deliberately to the element that explains the outcome — the error summary on failure, or the confirmation heading on success.

### Process — Form submission pattern (inherited by F6 and F12)

1. Specialist submits the form.
2. The submit control enters a busy state (visible text change plus `aria-disabled="true"`), and repeat submission is blocked.
3. The server response is authoritative. Client-side hints MUST NOT prevent a submission that the server has not yet judged (F6 FR-6.4, F12 FR-12.9).
4. On a validation failure response, the screen renders (a) an error summary listing every server finding in server order, each a link to its field, and (b) an inline error message on each affected field, programmatically associated via `aria-describedby` with `aria-invalid="true"` on the control.
5. Focus moves to the error summary container; the assertive live region announces "{n} problems with your submission".
6. On success, the screen renders the outcome region and moves focus to its heading, announcing the outcome politely.

---

### Functional Requirements

- **FR-2.1 — USWDS component provenance.** Every interactive control MUST be a USWDS component or a composition documented in the project's USWDS conformance register as USWDS-conformant. Bespoke interactive controls MUST NOT be introduced. Verified per screen by design review (NFR-1, SM-12).
- **FR-2.2 — Design tokens.** Typography, spacing, and colour MUST come from USWDS design tokens. No hard-coded hex colour or pixel spacing value may appear in screen-level styles.
- **FR-2.3 — Asset pipeline.** USWDS styles, fonts, and icon sprite MUST be bundled and served by the application itself (no third-party CDN dependency at runtime), so the demonstration environment renders correctly without external network access.
- **FR-2.4 — Page shell landmarks.** Every screen MUST render exactly one `<header role="banner">`, one `<main id="main-content">`, one `<footer role="contentinfo">`, and — on authenticated screens — one `<nav aria-label="Primary">`. A "Skip to main content" link MUST be the first focusable element on the page and MUST move focus into `main`.
- **FR-2.5 — Official-site banner.** The USWDS government banner ("An official website of the United States government") MUST render above the header on every screen, with its expandable detail keyboard-operable.
- **FR-2.6 — Header content.** The authenticated header MUST show the product name (linking to `/queue`), the signed-in specialist's display name, and a "Sign out" control wired to F1. The sign-in screen renders the header without navigation or sign-out (F1 FR-1.15).
- **FR-2.7 — Navigation set.** Primary navigation MUST contain exactly two destinations: "Review queue" (`/queue`) and "New cargo entry" (`/entries/new`). The current destination MUST be marked with `aria-current="page"`. No other navigation item exists — there is no dashboard, no reports, no settings, and no administration item (PRD §10 #2, #5).
- **FR-2.8 — Heading order.** Each screen MUST have exactly one `<h1>`, and heading levels MUST descend without skipping. Section headings within the case detail screen follow the reading order entry → findings → recommendation → decision → audit (F10 FR-10.10).
- **FR-2.9 — Accessible names.** Every interactive element MUST have a programmatic accessible name. Icon-only controls MUST NOT be used for any primary action; where an icon accompanies text, the icon MUST be `aria-hidden="true"`.
- **FR-2.10 — Label association.** Every form control MUST have a `<label for>` bound to its `id`. Hint text MUST be associated via `aria-describedby`. Placeholder text MUST NOT be used as a label or as the only hint.
- **FR-2.11 — Required-field indication.** Required fields MUST be marked with the USWDS required indicator (visible text `*` with a legend "Required", plus `required` on the control). A form containing required fields MUST state the convention above the first field. Optional fields MUST be visibly marked "(optional)" where a form mixes both.
- **FR-2.12 — Error summary.** The error summary MUST appear as the first child of the form region, use `role="alert"` and `tabindex="-1"`, receive focus when it appears, list one item per error in the order the server returned them, and link each item to the corresponding field's control `id`. Activating a summary link MUST move focus to that control.
- **FR-2.13 — Inline error text.** Each field error MUST render inside the field's USWDS error wrapper, be associated to the control via `aria-describedby`, and set `aria-invalid="true"`. Error text MUST state what is wrong and what to do, in plain language, and MUST NOT expose a raw error code as its only content (the code may appear as supplementary detail).
- **FR-2.14 — Keyboard operability.** Every interactive component MUST be reachable and operable by keyboard alone, in a DOM-order tab sequence, with no keyboard trap. Custom `tabindex` values greater than 0 MUST NOT be used. All five product tasks MUST be completable using the keyboard alone (SM-11).
- **FR-2.15 — Visible focus.** A visible focus indicator meeting WCAG 2.1 AA non-text contrast MUST be present on every focusable element; `outline: none` without a compliant replacement is prohibited.
- **FR-2.16 — Live regions.** The shell MUST render one `aria-live="polite"` status region and one `aria-live="assertive"` alert region, both present in the DOM from initial load (so that later content insertion is announced). An announcement service MUST expose `announceStatus(text)` and `announceError(text)` to screens. Announcements MUST be short, complete sentences and MUST NOT duplicate text that focus movement already reads.
- **FR-2.17 — Colour independence.** No information may be conveyed by colour alone. This binds specifically on: AI-vs-human provenance (FR-2.20), validation error indication (icon + text, not red alone), and exception state (text label, not a coloured dot alone). Verified per screen in review (NFR-2, NFR-4).
- **FR-2.18 — Contrast.** Text and meaningful non-text elements MUST meet WCAG 2.1 AA contrast (4.5:1 body text, 3:1 large text and UI component boundaries), satisfied by using USWDS token pairings from the project's approved palette.
- **FR-2.19 — Text resize and reflow.** Content MUST remain usable with no loss of function or content at 200% browser zoom and at a 320 CSS-pixel viewport width, with no horizontal scrolling of body content. The layout MUST be responsive and usable at tablet width (NFR-12). No native mobile client is in scope (PRD §10 #10).
- **FR-2.20 — Provenance badge component.** A shared component MUST render value and event provenance as: a text label ("AI-suggested" / "Specialist-entered"), a distinct icon, and a token-based colour treatment. It MUST expose the provenance to assistive technology as text (visually hidden text where the visual treatment is compact) so a screen-reader user receives the same distinction. The component is used by F10, F12, and F14 without variation.
- **FR-2.21 — Reduced motion.** Any transition or animated indicator MUST be disabled or reduced to an instantaneous state change when `prefers-reduced-motion: reduce` is set. No content may rely on motion to be understood, and nothing auto-animates for longer than 5 seconds.
- **FR-2.22 — Shared state components.** The shell MUST provide reusable `Loading`, `Empty`, `ErrorState`, `Degraded`, and `ReadOnlyNotice` components with consistent semantics, so F6/F8/F10/F12/F14 do not re-implement them divergently. `Empty` takes a message plus one optional call-to-action; `ErrorState` takes a cause plus an optional retry handler.
- **FR-2.23 — Responsiveness budget.** Shell and screen render MUST complete within 2 seconds under demonstration load for sign-in, entry form, queue, case detail, and audit trail (NFR-10). Long-running AI recommendation status is presented by F10 without blocking navigation or freezing the interface.
- **FR-2.24 — Language and document metadata.** `<html lang="en">` MUST be set; every page MUST have a unique, descriptive `<title>` following `{Screen name} — CargoExec`.
- **FR-2.25 — No automated accessibility gate.** v1 MUST NOT add an automated accessibility test gate, an axe-core CI job, or any `.github/workflows` file (PRD §10 #1). The enforcement mechanism is the checklist of FR-2.26, which is therefore mandatory rather than optional (R-3).
- **FR-2.26 — Per-screen accessibility review checklist.** Each screen MUST be signed off against a written checklist before it is considered delivered. The checklist MUST cover, at minimum: single `h1` and descending heading order; landmark structure; skip link; label and hint association; required marking; error summary focus movement; inline error association; full keyboard traversal of every control and completion of the screen's task by keyboard alone; visible focus on all controls; AA contrast on text and UI boundaries; colour-independence of provenance, error, and state indication; live-region announcement of each status and error; 200% zoom and 320 px reflow; reduced-motion behaviour; and an assistive-technology walkthrough of the screen's primary task with a screen reader. Sign-off records the reviewer, date, screen, and any defects with their resolution. Target: zero violations, 100% of screens reviewed (SM-10, SM-11).

---

**Inputs (to the shell, from screens and from F1):**
- Route path and parameters (case reference, etc.)
- Current session principal (display name) from `GET /api/session`
- Screen-supplied content: `h1` text, page title, state (`loading` | `ready` | `empty` | `error`), field error list, announcement text

**Outputs:**
- A rendered, landmark-correct, keyboard-operable page frame with USWDS styling
- Focus placed deterministically after every navigation and content replacement
- Status and error text announced to assistive technology
- Reusable form, state, and provenance components consumed by all other UI features
- A completed accessibility review record per screen

**Validation (shell-level):**
- An unknown route MUST render a "Page not found" screen inside the shell with a link to `/queue`, status announced, focus moved to its `h1`.
- An unexpected client-side exception MUST render the `ErrorState` component rather than a blank page, with a "Try again" action that re-runs the failed load.
- A route requiring a session MUST NOT render any screen content before the session check resolves (no flash of protected content).

**Error States:**

| Scenario | Presentation | Announcement | Recovery |
|---|---|---|---|
| Route not found | "Page not found" screen in shell | Polite: page title | Link to review queue |
| Session expired mid-use | Redirect to sign-in (F1 FR-1.8) | Polite: "Your session expired…" | Re-authenticate |
| Network failure on a load | `ErrorState`: "We could not load this page." | Assertive | "Try again" button |
| Network failure on a submit | Error summary above the form; input preserved | Assertive | Re-submit |
| Unhandled client exception | `ErrorState` with generic cause | Assertive | "Try again"; no stack trace shown |

**API Surface (this feature):** none of its own; consumes `GET /api/session` (F1) for header identity. See `Y1-api.md` §5 UI Routes for the route table this shell implements.

**Schema Surface (this feature):** none. F2 introduces no tables or columns.

**Acceptance Criteria:**
1. Every screen exposes exactly one `h1`, one `main`, one `banner`, one `contentinfo`, and (authenticated) one primary `nav`.
2. The skip link is the first focusable element and moves focus into `main`.
3. After navigating from the queue to a case, focus is on the case screen's `h1` and the document title has changed.
4. Submitting an invalid form moves focus to the error summary, whose items link to and focus their fields.
5. Primary navigation contains exactly "Review queue" and "New cargo entry" — no third item exists in the DOM.
6. Provenance is discoverable with colour disabled and via a screen reader on F10, F12, and F14.
7. All screens remain usable at 200% zoom and 320 px width with no horizontal body scrolling.
8. The repository contains no `.github/workflows` directory and no accessibility test runner in the build pipeline.
9. A signed accessibility review record exists for every screen, including an assistive-technology walkthrough.

---
## F3: Manual Cargo Entry Creation (API)

**Priority:** P0 · **Surface:** Programmatic API · **Dependencies:** F0, F1, F4, F5 · **PRD trace:** §5.2 F3, §4.3 #4, NFR-6, NFR-11, SM-8

**Description:** F3 is the server-side capability that receives a manually authored cargo entry, persists it, and returns the outcome of its receipt. It is the **only** way data enters CargoExec: there is no file upload, no bulk import, no ingestion adapter, and no interface to ACE or ATS (PRD §10 #6). Receipt is atomic — persist the entry, validate it (F4), open an exception on failure (F5), write the audit entries (F13) — all inside one database transaction, so an entry can never exist in a state where it was received but never assessed. The entry is the entry of record and is never mutated afterwards; a specialist's later corrections are recorded as a resolution on a decision (F11), not as an edit of the entry.

**Terminology (feature-specific):**
- **Entry field set:** the fourteen fields a specialist may submit, enumerated below. This set is fixed; there is no custom-field or extension mechanism.
- **Structural validation:** transport-level checks on the *shape* of the request (types, lengths, unknown fields). Failure is a client error (`422`), not an exception.
- **Required-information validation:** the F4 rule evaluation on the *content* of the entry. Failure produces findings and an exception, not a client error.
- **Receipt outcome:** `VALIDATED_CLEAN` or `EXCEPTION_OPENED`, decided inside the receipt transaction and immutable.

**Sub-features:**
- Create-entry endpoint for an authenticated specialist
- Entry persistence with author and receipt timestamp
- Case reference assignment
- Atomic receipt transaction: persist → validate → open exception on failure
- Receipt response reporting the outcome with the case reference
- Single-entry retrieval with current derived state
- `HUMAN`-origin provenance baseline for every submitted field value

---

### The Entry Field Set

Every field is **optional at the transport layer**. This is deliberate and central: an incomplete entry must be *receivable*, because an incomplete entry is precisely what the product exists to process. Completeness is judged by F4, whose verdict produces findings and an exception — never a transport error.

| Field | Type | Structural limit |
|---|---|---|
| `entry_number` | string | ≤ 20 chars |
| `importer_of_record_id` | string | ≤ 20 chars |
| `port_of_entry_code` | string | ≤ 8 chars |
| `mode_of_transport` | string | ≤ 16 chars |
| `carrier_code` | string | ≤ 8 chars |
| `conveyance_name` | string | ≤ 100 chars |
| `bill_of_lading_number` | string | ≤ 40 chars |
| `air_waybill_number` | string | ≤ 20 chars |
| `country_of_origin_code` | string | ≤ 4 chars |
| `goods_description` | string | ≤ 2000 chars |
| `quantity` | decimal(14,3) as JSON number or numeric string | ≤ 14 digits, ≤ 3 decimals |
| `quantity_uom` | string | ≤ 8 chars |
| `declared_value_usd` | decimal(14,2) as JSON number or numeric string | ≤ 14 digits, ≤ 2 decimals |
| `arrival_date` | string | ISO-8601 `YYYY-MM-DD`, ≤ 10 chars |

All string values are stored exactly as submitted after trimming leading/trailing whitespace; internal whitespace and case are preserved, because the audit record must show what the specialist actually typed. Normalisation for rule evaluation (uppercasing a code, for example) happens inside F4 and is applied to the *comparison*, never to the stored value.

---

### Process — Receipt (atomic)

1. Middleware authenticates the request and resolves the request principal (F1).
2. Handler applies structural validation to the body. Failure ⇒ `422 REQUEST_MALFORMED` with per-field detail; nothing is persisted and no audit entry is written.
3. Transaction `BEGIN`.
4. Build the canonical entry record (values trimmed, empty-equivalents as `NULL` — FR-3.8), take `received_at = now()` and a `case_reference` from the case-reference sequence, **evaluate F4 against that canonical record**, and insert `cargo_entries` **once** with those values, `created_by = principal.id`, `received_at`, `case_reference`, and the final `receipt_outcome`. The evaluated content is byte-identical to the recorded content, and `RIV-132` sees the same `received_at` that is stored. The row is never updated afterwards (FR-3.6); validating before the single insert is what keeps that true under `cargoexec_app`'s `SELECT, INSERT`-only grant on `cargo_entries` (`Y0-schema.md` FR-Y0.3).
5. Take the case-anchor row lock (`SELECT ... FROM cargo_entries WHERE id = :id FOR UPDATE`) used by F13 for sequence assignment.
6. Insert one `cargo_entry_field_origins` row per **submitted** field (present and non-empty after trim) with `origin = 'HUMAN'`.
7. Write audit entry `ENTRY_RECEIVED` via F13 (`before_state = NULL`, `after_state = 'RECEIVED'`, values = every submitted field with `after_origin = 'HUMAN'`).
8. Persist the `validation_results` row and any `validation_findings` produced by the step-4 evaluation.
9. Write audit entry `VALIDATION_COMPLETED` via F13 (`before_state = 'RECEIVED'`, `after_state = 'VALIDATED_CLEAN' | 'EXCEPTION_OPENED'`, with the findings summarised in the entry's value rows).
10. *(No update occurs.* `receipt_outcome` was written with its final value in step 4; there is no code path that updates a cargo entry, ever.)
11. If the outcome is `EXCEPTION_OPENED`, invoke F5: insert the `exceptions` row (`state = 'OPEN'`, `receipt_position` from sequence), insert the `recommendations` row with `status = 'PENDING'`, and write audit entry `EXCEPTION_OPENED`.
12. `COMMIT`. The deferred constraint triggers of F0 (FR-0.10) verify audit coupling at this point; any missing audit entry aborts the whole receipt.
13. **After commit**, and only after commit, enqueue AI recommendation generation (F9). Generation is never part of the receipt transaction and never delays the response.
14. Return `201` with the receipt outcome, the case reference, the validation result, and the exception reference if one was opened.

---

### Functional Requirements

- **FR-3.1 — Authenticated creation only.** `POST /api/entries` MUST require a valid session and a valid CSRF token. An unauthenticated request returns `401 UNAUTHENTICATED` and persists nothing.
- **FR-3.2 — Manual entry only.** The endpoint MUST accept exactly one entry per request, as a JSON object. It MUST NOT accept an array, a multipart file, `text/csv`, or any batch wrapper. `Content-Type` other than `application/json` returns `415 UNSUPPORTED_MEDIA_TYPE`. There MUST be no second creation path (no import endpoint, no CLI import command, no adapter) (PRD §10 #6).
- **FR-3.3 — Atomicity.** Persistence, validation, exception opening, and all receipt audit entries MUST occur in a single transaction. If any step fails, the transaction rolls back entirely and the response is `500 RECEIPT_FAILED`; no orphan entry, no unvalidated entry, and no unaudited state change can exist (§4.3 #2, NFR-6).
- **FR-3.4 — Validation is unconditional and non-bypassable.** Every entry MUST be validated during its receipt transaction. There MUST be no request parameter, header, body flag, environment variable, or configuration switch that skips, defers, weakens, or re-runs validation (`?skip_validation`, `force=true`, and equivalents MUST NOT exist; an unknown field of that kind is rejected by FR-3.7).
- **FR-3.5 — Human provenance baseline.** Every submitted field value MUST be recorded with `HUMAN` origin (F0 FR-0.3). This is the baseline against which a later AI proposal and a later human edit are compared (NFR-4).
- **FR-3.6 — Entry immutability.** There MUST be no `PUT`, `PATCH`, or `DELETE` endpoint for a cargo entry, and no service method that updates `cargo_entries` after insert. The row is written exactly once, including its final `receipt_outcome`, inside the receipt transaction (Process step 4); the application database role holds no `UPDATE` privilege on the table at all. A specialist who needs different values records them as a resolution (F11) or submits a new entry.
- **FR-3.7 — Unknown fields rejected.** A body containing any property outside the fourteen-field set MUST be rejected with `422 REQUEST_MALFORMED` naming the unknown property. Silent ignoring is prohibited, because a silently dropped value would be absent from the audit record the specialist believes they created.
- **FR-3.8 — Empty-string handling.** An empty string, a whitespace-only string, and an absent property MUST be treated identically by F4 (all are "not provided") and MUST be recorded identically: the field is stored as `NULL` and receives **no** `cargo_entry_field_origins` row, because no value was provided to attribute.
- **FR-3.9 — Duplicate entry number.** `cargo_entries.entry_number` MUST be `UNIQUE` where non-null. A submission whose entry number already exists returns `409 ENTRY_NUMBER_DUPLICATE` and persists nothing. This is deliberately **not** a validation rule and therefore never produces an exception: a uniqueness test depends on database state rather than on the entry's content, and making it a rule would violate the determinism requirement (NFR-11, F4 FR-4.4). The response identifies the case reference of the existing entry so the specialist can navigate to it.
- **FR-3.10 — Receipt response is explicit.** The response MUST state the receipt outcome as a discriminated value (`receipt_outcome: "VALIDATED_CLEAN" | "EXCEPTION_OPENED"`), the `case_reference`, the full `validation` result with findings, and, when an exception was opened, `exception: { id, state, receipt_position }`. The specialist must never have to infer what happened to their entry (F6 depends on this).
- **FR-3.11 — Entry retrieval.** `GET /api/entries/{entryId}` MUST return the stored entry values, its `case_reference`, `received_at`, the submitting specialist's id and display name, per-field `HUMAN` origin, the validation result with findings, the `receipt_outcome`, and — if one exists — the exception's `id`, `state`, and `receipt_position`. The "current state" of an entry is derived: `receipt_outcome` plus the exception's state where applicable; there is no separate mutable entry-status column to drift out of sync.
- **FR-3.12 — No listing endpoint for entries.** There MUST be no `GET /api/entries` collection endpoint. The only list surface in the product is the receipt-ordered open-exception queue (F7); an entry list would be an unscoped browse/search surface that no requirement asks for.
- **FR-3.13 — Case reference allocation.** `case_reference` MUST be allocated as `CE-{YYYY}-{NNNNNN}` where `YYYY` is the UTC year of receipt and `NNNNNN` is a zero-padded value from a database sequence, unique across the deployment. Allocation MUST occur inside the receipt transaction, and the reference MUST be immutable.
- **FR-3.14 — Recommendation generation is post-commit and non-blocking.** The receipt response MUST NOT wait for AI generation. The `recommendations` row is created `PENDING` inside the transaction; generation is dispatched after commit (F9). AI provider failure MUST NOT affect receipt success (NFR-9).
- **FR-3.15 — Request size limit.** The request body MUST be limited to 64 KB; a larger body returns `413 REQUEST_TOO_LARGE`. This cap exists to bound a single typed entry, not to enable batching.
- **FR-3.16 — Idempotency of receipt.** Receipt is **not** idempotent and MUST NOT accept an idempotency key: two identical submissions are two distinct entries (and the second is rejected only if the entry number collides, per FR-3.9). The entry form prevents accidental double submission client-side (F6 FR-6.9, F2 FR-2.16 pattern).

---

**Inputs:**
- `POST /api/entries` body: the fourteen-field object above; every field optional; unknown fields rejected.
- `cargoexec_sid` cookie (required) and `X-CSRF-Token` header (required).
- `GET /api/entries/{entryId}`: `entryId` (uuid, path) — a non-uuid value returns `400 INVALID_IDENTIFIER`.

**Outputs:**
- `201` receipt response: `{ entry: {...}, case_reference, receipt_outcome, validation: { outcome, rule_set_version, evaluated_at, findings: [...] }, exception: { id, state, receipt_position } | null, next: { case_url | queue_url } }`
- `200` entry retrieval response (FR-3.11)
- Persisted `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, and — on failure — `exceptions` and a `PENDING` `recommendations` row
- Audit entries `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, and (on failure) `EXCEPTION_OPENED`

**Validation (structural — this feature; content rules are F4):**
- Body MUST be a JSON object (not array, not scalar) ⇒ else `422 REQUEST_MALFORMED`.
- Every property MUST be a member of the fourteen-field set ⇒ else `422 REQUEST_MALFORMED` (`unknown_field`).
- String fields MUST be JSON strings within their length limit ⇒ else `422` (`wrong_type` / `too_long`).
- `quantity` and `declared_value_usd` MUST be a JSON number or a numeric string parseable as a decimal within scale ⇒ else `422` (`not_numeric` / `too_many_decimals`). A value that parses but is zero, negative, or otherwise implausible is **not** a structural error — it is F4's business (rules `RIV-101` for quantity and `RIV-121` for declared value).
- `arrival_date` MUST be a string; if it is present and not a syntactically valid ISO calendar date it is stored as `NULL` and F4 reports `RIV-130` (missing) and/or `RIV-131` (invalid) — a malformed date MUST NOT become a `422`, because "the specialist typed the date wrongly" is exactly a required-information finding. (An over-length date string is still a `422`.)
- `mode_of_transport` structural check is length only; presence is F4's rule `RIV-040` and membership in the code list is `RIV-041`.

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| No session | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| Missing/invalid CSRF token | 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." |
| Non-JSON content type | 415 | `UNSUPPORTED_MEDIA_TYPE` | "Send this entry as JSON." |
| Body too large | 413 | `REQUEST_TOO_LARGE` | "This entry is too large to accept." |
| Unknown field, wrong type, over-length | 422 | `REQUEST_MALFORMED` | "The request could not be read." + per-field detail |
| Duplicate entry number | 409 | `ENTRY_NUMBER_DUPLICATE` | "Entry number {n} already exists on case {ref}." |
| Non-uuid entry id | 400 | `INVALID_IDENTIFIER` | "That identifier is not valid." |
| Entry not found | 404 | `ENTRY_NOT_FOUND` | "That entry could not be found." |
| Transaction failure at any receipt step | 500 | `RECEIPT_FAILED` | "The entry could not be received. Nothing was saved. Try again." |

Note: **no** error code in this table is produced by a required-information failure. A validation failure is a `201` with `receipt_outcome: "EXCEPTION_OPENED"` — it is a successful receipt with a business outcome, not an error.

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/entries` | session + CSRF | Receive one manually authored entry |
| `GET` | `/api/entries/{entryId}` | session | Retrieve one entry with its derived state |

Full schemas in `Y1-api.md` §2 Entries.

**Schema Surface (this feature):** writes `cargo_entries`, `cargo_entry_field_origins`; drives writes to `validation_results`, `validation_findings` (F4), `exceptions`, `recommendations` (F5/F9), `audit_entries`, `audit_entry_values` (F13). See `Y0-schema.md` §2 Entries.

**Acceptance Criteria:**
1. An entry submitted with only `goods_description` filled in returns `201` with `receipt_outcome: "EXCEPTION_OPENED"` and a case reference.
2. A complete, rule-satisfying entry returns `201` with `receipt_outcome: "VALIDATED_CLEAN"` and `exception: null`.
3. Forcing a failure in the audit writer during receipt leaves zero `cargo_entries` rows for that submission.
4. `POST /api/entries` with an array body, a CSV body, or a `skip_validation` property is rejected; no such capability exists.
5. Every non-empty submitted field has a `cargo_entry_field_origins` row with `origin = 'HUMAN'`; absent and whitespace-only fields have none.
6. A second submission reusing an entry number returns `409` and creates nothing.
7. Stopping the AI provider entirely does not change any receipt response.
8. No `PUT`/`PATCH`/`DELETE` route exists for entries, and no `GET /api/entries` collection route exists.

---
## F4: Required-Information Validation on Receipt

**Priority:** P0 · **Surface:** Programmatic API / Data · **Dependencies:** F0 · **PRD trace:** §5.2 F4, §4.3 #4, NFR-11, SM-8, R-10

**Description:** F4 is the rule evaluation that runs against every cargo entry at the moment of receipt, inside the receipt transaction (F3). It is deterministic and explanatory: it does not return a bare pass/fail but names every unsatisfied rule, the field it concerns, and why it was not satisfied, because those findings become the stated basis of the exception (F5), the input the AI reasons over (F9), and the text the specialist reads on the case screen (F10). Validation runs on receipt only — it is not a separately invocable user action, there is no re-validate endpoint, and no code path lets an entry reach a persisted state without a validation result attached.

**Terminology (feature-specific):**
- **Rule:** one independently testable check with a stable `rule_id`, a target field, a deterministic predicate, a failure code, and a human-readable message.
- **Rule set:** the complete, ordered collection of rules, identified by a `rule_set_version` string (v1: `RIV-2026.09`).
- **Finding:** the record of one failed rule — `{ rule_id, field_name, failure_code, message }`.
- **Applicable rule:** a rule whose preconditions hold for this entry (see Evaluation Semantics). Non-applicable rules are skipped and produce no finding.
- **Normalised comparison value:** a transformation applied only for the purpose of evaluating a predicate (trim, collapse internal whitespace, uppercase, strip hyphens/spaces from identifier codes). The stored entry value is never normalised (F3).
- **Domain code list:** a closed, compiled-in set of valid codes, versioned together with the rule set.

**Sub-features:**
- The required-information rule set, evaluated as a unit on receipt
- Per-rule findings naming rule, field, and reason
- Deterministic, order-stable, complete evaluation (all failures reported)
- Persisted validation result as the evidentiary basis of any exception
- Clean-pass result recorded for entries satisfying every rule

---

### [ASSUMPTION] The Required-Information Rule Set — `RIV-2026.09`

> **This rule set is an implementation assumption, open to CBP refinement.** The PRD defines the validation *mechanism* (F4) but deliberately leaves the required-information rule content to be specified. What follows is a concrete, demonstration-appropriate rule set built from ordinary cargo-entry data elements. It is recorded here as an assumption so it is visible as one rather than mistaken for a CBP-authored requirement.
>
> **Refinement boundary.** The rule *content* may be revised without touching any other feature: rules are data-driven, version-stamped, and consumed only through the finding structure. The rule *characteristics* are not negotiable — every rule must remain (a) deterministic, (b) presence / format / closed-domain-membership only, and (c) independently testable. In particular this rule set contains **no duty or tariff computation and no classification determination** (PRD §10 #9): no rule computes a duty amount, assigns or checks an HTS code, derives a rate, or makes a substantive customs determination.

#### Rules

| Rule ID | Field | Deterministic check |
|---|---|---|
| `RIV-010` | `entry_number` | Present (non-empty after trim) |
| `RIV-011` | `entry_number` | Normalised (uppercase, hyphens/spaces removed) matches `^[A-Z0-9]{3}[0-9]{8}$` |
| `RIV-020` | `importer_of_record_id` | Present |
| `RIV-021` | `importer_of_record_id` | Normalised matches IRS EIN form `^[0-9]{2}-?[0-9]{7}(-?[0-9]{2})?$` **or** CBP-assigned form `^[A-Z]{2}[0-9]{7}$` |
| `RIV-030` | `port_of_entry_code` | Present |
| `RIV-031` | `port_of_entry_code` | Normalised matches `^[0-9]{4}$` |
| `RIV-032` | `port_of_entry_code` | Normalised value is a member of the `PORT_OF_ENTRY` domain code list |
| `RIV-040` | `mode_of_transport` | Present |
| `RIV-041` | `mode_of_transport` | Normalised value ∈ `{OCEAN, AIR, TRUCK, RAIL}` |
| `RIV-050` | `carrier_code` | Present |
| `RIV-051` | `carrier_code` | If `mode_of_transport` normalises to `AIR`: matches `^[A-Z0-9]{2,3}$`; otherwise (including when mode is missing or unknown): matches SCAC form `^[A-Z]{2,4}$` |
| `RIV-060` | `conveyance_name` | Present (vessel name and voyage, flight number, or truck/rail conveyance identifier) |
| `RIV-070` | `bill_of_lading_number`, `air_waybill_number` | A transport document is present: if mode normalises to `AIR`, `air_waybill_number` present; if mode ∈ `{OCEAN, TRUCK, RAIL}`, `bill_of_lading_number` present; if mode is missing or unknown, at least one of the two present |
| `RIV-071` | `air_waybill_number` | Normalised (digits only) matches `^[0-9]{11}$` (3-digit airline prefix + 8-digit serial) |
| `RIV-072` | `bill_of_lading_number` | Normalised (uppercase, spaces removed) matches `^[A-Z0-9]{6,30}$` |
| `RIV-073` | `bill_of_lading_number`, `air_waybill_number` | Not both present (a single shipment carries one transport document type) |
| `RIV-080` | `country_of_origin_code` | Present |
| `RIV-081` | `country_of_origin_code` | Normalised matches `^[A-Z]{2}$` |
| `RIV-082` | `country_of_origin_code` | Normalised value is a member of the `COUNTRY` domain code list (ISO 3166-1 alpha-2) |
| `RIV-090` | `goods_description` | Present |
| `RIV-091` | `goods_description` | Length after trim ≥ 10 characters |
| `RIV-092` | `goods_description` | Normalised (lowercase, trimmed, internal whitespace collapsed, trailing punctuation removed) is **not** a member of the `GENERIC_DESCRIPTION` denylist |
| `RIV-100` | `quantity` | Present |
| `RIV-101` | `quantity` | Parses as a decimal and is strictly greater than 0 |
| `RIV-110` | `quantity_uom` | Present |
| `RIV-111` | `quantity_uom` | Normalised value is a member of the `UNIT_OF_MEASURE` domain code list |
| `RIV-120` | `declared_value_usd` | Present |
| `RIV-121` | `declared_value_usd` | Parses as a decimal, is strictly greater than 0, and has at most 2 decimal places |
| `RIV-130` | `arrival_date` | Present |
| `RIV-131` | `arrival_date` | Is a syntactically and calendrically valid ISO-8601 date (`YYYY-MM-DD`) |
| `RIV-132` | `arrival_date` | Falls within `[date(received_at) − 60 days, date(received_at) + 180 days]` inclusive, evaluated in UTC against the entry's own persisted `received_at` |

#### Failure codes and messages

| Rule ID | Failure code | Human-readable message |
|---|---|---|
| `RIV-010` | `ENTRY_NUMBER_MISSING` | "Enter the entry number." |
| `RIV-011` | `ENTRY_NUMBER_FORMAT` | "Entry number must be a 3-character filer code followed by 8 digits, for example ABC12345678." |
| `RIV-020` | `IMPORTER_ID_MISSING` | "Enter the importer of record identifier." |
| `RIV-021` | `IMPORTER_ID_FORMAT` | "Importer of record identifier must be an IRS number like 12-3456789 or a CBP-assigned number like AB1234567." |
| `RIV-030` | `PORT_OF_ENTRY_MISSING` | "Enter the port of entry code." |
| `RIV-031` | `PORT_OF_ENTRY_FORMAT` | "Port of entry code must be 4 digits, for example 2704." |
| `RIV-032` | `PORT_OF_ENTRY_UNKNOWN` | "Port of entry code {value} is not a recognised port code." |
| `RIV-040` | `MODE_OF_TRANSPORT_MISSING` | "Select the mode of transport." |
| `RIV-041` | `MODE_OF_TRANSPORT_UNKNOWN` | "Mode of transport must be ocean, air, truck, or rail." |
| `RIV-050` | `CARRIER_CODE_MISSING` | "Enter the carrier code." |
| `RIV-051` | `CARRIER_CODE_FORMAT` | "Carrier code must be a 2–4 letter SCAC, or a 2–3 character airline code for air shipments." |
| `RIV-060` | `CONVEYANCE_MISSING` | "Enter the conveyance — vessel and voyage, flight number, or vehicle identifier." |
| `RIV-070` | `TRANSPORT_DOCUMENT_MISSING` | "Enter the transport document number — an air waybill for air shipments, or a bill of lading otherwise." |
| `RIV-071` | `AIR_WAYBILL_FORMAT` | "Air waybill number must be 11 digits — a 3-digit airline prefix and an 8-digit serial." |
| `RIV-072` | `BILL_OF_LADING_FORMAT` | "Bill of lading number must be 6 to 30 letters and digits." |
| `RIV-073` | `TRANSPORT_DOCUMENT_CONFLICT` | "Enter either an air waybill number or a bill of lading number, not both." |
| `RIV-080` | `COUNTRY_OF_ORIGIN_MISSING` | "Enter the country of origin." |
| `RIV-081` | `COUNTRY_OF_ORIGIN_FORMAT` | "Country of origin must be a 2-letter country code, for example CN." |
| `RIV-082` | `COUNTRY_OF_ORIGIN_UNKNOWN` | "Country of origin {value} is not a recognised country code." |
| `RIV-090` | `GOODS_DESCRIPTION_MISSING` | "Describe the goods." |
| `RIV-091` | `GOODS_DESCRIPTION_TOO_SHORT` | "Describe the goods in at least 10 characters." |
| `RIV-092` | `GOODS_DESCRIPTION_NOT_SPECIFIC` | "\"{value}\" is too general. Describe what the goods actually are." |
| `RIV-100` | `QUANTITY_MISSING` | "Enter the quantity." |
| `RIV-101` | `QUANTITY_NOT_POSITIVE` | "Quantity must be greater than zero." |
| `RIV-110` | `QUANTITY_UOM_MISSING` | "Enter the unit of measure for the quantity." |
| `RIV-111` | `QUANTITY_UOM_UNKNOWN` | "Unit of measure {value} is not a recognised unit." |
| `RIV-120` | `DECLARED_VALUE_MISSING` | "Enter the declared value in US dollars." |
| `RIV-121` | `DECLARED_VALUE_INVALID` | "Declared value must be greater than zero, with at most 2 decimal places." |
| `RIV-130` | `ARRIVAL_DATE_MISSING` | "Enter the arrival date." |
| `RIV-131` | `ARRIVAL_DATE_INVALID` | "Arrival date must be a real date in YYYY-MM-DD form." |
| `RIV-132` | `ARRIVAL_DATE_OUT_OF_WINDOW` | "Arrival date must be within 60 days before or 180 days after the date this entry was received." |

#### Cross-field rules and the singular `field_name`

`RIV-070` and `RIV-073` are the only rules that concern two fields. A finding carries exactly **one** `field_name`, which is the rule's declared **primary field**, so every finding binds to one named control in storage and in the API:

| Rule | Declared primary field |
|---|---|
| `RIV-070` | `air_waybill_number` when `mode_of_transport` normalises to `AIR`; otherwise `bill_of_lading_number` |
| `RIV-073` | `air_waybill_number` |

Their **presentation binding is the enclosing fieldset, not that single control**: F6 FR-6.10 renders both on the Transport fieldset via `aria-describedby` on the `<fieldset>`, which is the intended behaviour and deliberately overrides the general "render on the control whose `id` matches `field_name`" rule for these two rules only. The primary field is what the record stores; the fieldset is what the specialist sees.

#### Domain code lists

| List | Contents | Source |
|---|---|---|
| `PORT_OF_ENTRY` | Closed set of 4-digit CBP port codes | Compiled-in constant, versioned with the rule set |
| `COUNTRY` | ISO 3166-1 alpha-2 codes | Compiled-in constant |
| `UNIT_OF_MEASURE` | `KG, LB, MT, L, M3, PCS, CTN, PLT, BOX, SET` | Compiled-in constant |
| `GENERIC_DESCRIPTION` | `goods, cargo, freight, merchandise, items, products, general merchandise, various, various goods, assorted, assorted goods, misc, miscellaneous, sample, samples, parts, spare parts, n/a, na, tbd, unknown, see attached, as per invoice` | Compiled-in constant |

- **FR-4.1 — Domain lists are constants, not data.** Domain code lists MUST be compiled-in application constants versioned with `rule_set_version`. They MUST NOT be database tables, seeded rows, editable configuration, or a runtime-administered reference data set. This keeps evaluation deterministic, keeps the schema free of reference tables, and keeps the deployment free of seed data (PRD §10 #7). Changing a list is a code change that increments `rule_set_version`.

---

### Evaluation Semantics

- **FR-4.2 — Runs on receipt, only on receipt.** F4 MUST be invoked exactly once per entry, inside the receipt transaction (F3 step 4, immediately before the single `cargo_entries` insert). There MUST be no `POST /api/validate`, no re-validate action, no scheduled re-evaluation, and no UI control that re-runs validation on a stored entry. Client-side hints in F6 are not validation and carry no authority.
- **FR-4.3 — Completeness.** All *applicable* rules MUST be evaluated and **every** failure reported. Evaluation MUST NOT short-circuit on the first failure (R-10).
- **FR-4.4 — Determinism.** Identical entry content MUST always produce an identical outcome and an identical, identically-ordered finding list (NFR-11). Therefore a rule MUST NOT read the wall clock, database state, another entry, a random source, an external service, or any mutable configuration. `RIV-132` satisfies this by evaluating against the entry's own persisted `received_at`, so re-evaluating a stored entry at any later time yields the same result. Uniqueness of the entry number is deliberately **not** a rule, because it would depend on database state (F3 FR-3.9).
- **FR-4.5 — Presence gating.** A field's format and domain rules are applicable only if that field's presence rule passed. When `RIV-010` fails, `RIV-011` is skipped and produces no finding; likewise for every other field. A specialist therefore never sees "enter the port code" and "port code must be 4 digits" for the same empty field.
- **FR-4.6 — Format gating for domain rules.** A domain-membership rule is applicable only if the same field's format rule passed: `RIV-032` is skipped when `RIV-031` failed, and `RIV-082` is skipped when `RIV-081` failed.
- **FR-4.7 — Conditional applicability.** `RIV-051` and `RIV-070` branch on the normalised `mode_of_transport`, with a defined fallback when mode is missing or unknown (stated in the rule text). `RIV-071` is applicable only when `air_waybill_number` is present; `RIV-072` only when `bill_of_lading_number` is present. `RIV-073` is applicable only when both are present. There MUST be no unreachable rule and no combination of inputs for which applicability is ambiguous.
- **FR-4.8 — Finding order.** Findings MUST be emitted in ascending `rule_id` order. This order is the contract consumed by the API response, the F6 error summary, and the F10 findings list, so the specialist sees a stable presentation.
- **FR-4.9 — No severity, no ranking.** A finding MUST NOT carry a severity, weight, score, priority, or risk rating, and the outcome MUST NOT be graded. An entry either satisfies every applicable rule or it does not. Introducing severity would introduce prioritisation, which is out of scope (PRD §10 #4).
- **FR-4.10 — Outcome.** The outcome MUST be `PASS` when zero findings are produced and `FAIL` when one or more are produced. There is no partial, warning, or conditional outcome.
- **FR-4.11 — Result persistence.** Exactly one `validation_results` row MUST be persisted per entry (`UNIQUE (entry_id)`), carrying `outcome`, `rule_set_version`, `evaluated_at`, `rules_evaluated_count`, `findings_count`, and one immutable `validation_findings` row per finding (`UNIQUE (validation_result_id, rule_id)`). A clean pass MUST be recorded as a `PASS` row with zero findings — the absence of an exception is itself evidenced, not inferred from missing data.
- **FR-4.12 — Result immutability.** `validation_results` and `validation_findings` MUST have no update or delete path in application code. A later human resolution does not amend the findings; it is recorded separately as a decision (F11), so the original basis of the exception survives intact.
- **FR-4.13 — Message rendering.** Messages MUST be plain-language, imperative where a corrective action exists, and free of rule identifiers, regular expressions, and internal jargon. Where a message interpolates `{value}`, the submitted (non-normalised) value MUST be used, truncated to 60 characters with an ellipsis if longer, and HTML-escaped at render time.
- **FR-4.14 — Findings feed downstream consumers unchanged.** The same finding structure MUST be consumed by F5 (basis of the exception), F6 (field-level error rendering), F9 (AI prompt input), and F10 (findings display). No consumer re-derives, re-words, re-orders, or filters findings.
- **FR-4.15 — Rule registry testability.** Each rule MUST be implemented as a discrete, independently unit-testable predicate registered in a rule registry keyed by `rule_id`, with at least one passing and one failing test case each, plus a test asserting that the registry's rule id set exactly matches this document's table.

---

**Inputs:**
- The canonical cargo entry record (all fourteen fields, exactly as they are about to be stored) — F4 evaluates the record that the receipt transaction inserts verbatim in the same step, so the evaluated content is byte-identical to the recorded content
- `received_at` (timestamptz) — sole temporal input, used only by `RIV-132`
- `rule_set_version` (string constant) and the compiled-in domain code lists

**Outputs:**
- `ValidationResult`: `{ outcome: "PASS" | "FAIL", rule_set_version, evaluated_at, rules_evaluated_count, findings: Finding[] }`
- `Finding`: `{ rule_id, field_name, failure_code, message }`
- Persisted `validation_results` and `validation_findings` rows
- The `VALIDATION_COMPLETED` audit entry written by F3 step 9 via F13

**Validation (of the rule set itself, verified by test):**
- Every rule in the registry has a unique `rule_id` and a unique `failure_code`.
- Every rule targets at least one field in the F3 field set; no rule targets a field that does not exist.
- Every `field_name` emitted by a finding is a member of the F3 field set, so F6 can always bind the error to a control.
- Presence-gating and format-gating relationships are declared on the rule, not implied by evaluation order.
- Evaluating the same entry twice in the same process, and in two processes, yields byte-identical serialised results.
- No rule implementation references the system clock, the database, the network, or a random source (enforced by unit-test isolation: the rule module has no such dependencies available).

**Error States:**

Required-information failure is a **business outcome, not an error** — it yields `outcome: "FAIL"` with findings and a successfully received entry (F3 FR-3.10). The error states below concern the evaluator malfunctioning:

| Scenario | Handling | Error code | Result |
|---|---|---|---|
| A rule predicate throws | Receipt transaction aborts; nothing persisted | `VALIDATION_ENGINE_FAILURE` | HTTP 500; specialist told nothing was saved |
| Rule registry fails its integrity self-check at startup | Application refuses to start | `RULE_SET_INVALID` | Deployment fails fast rather than validating inconsistently |
| A finding names a field outside the entry field set | Blocked by test; would abort receipt at runtime | `VALIDATION_ENGINE_FAILURE` | HTTP 500 |

**API Surface (this feature):** none of its own. F4 has **no** endpoint — it is invoked only inside F3's receipt transaction, and its output is returned within the `POST /api/entries` response and the case detail response (`Y1-api.md` §2, §3).

**Schema Surface (this feature):** writes `validation_results` (with `UNIQUE (id, outcome)` supporting F0 FR-0.11) and `validation_findings`. No reference/lookup tables. See `Y0-schema.md` §3 Validation.

**Acceptance Criteria:**
1. An entry with every field blank produces exactly the 13 presence findings (`RIV-010, 020, 030, 040, 050, 060, 070, 080, 090, 100, 110, 120, 130`) and no format or domain findings.
2. An entry with `port_of_entry_code = "ZZ"` produces `RIV-031` only, not `RIV-032`.
3. An entry with `port_of_entry_code = "9999"` (well-formed, unknown) produces `RIV-032` only.
4. An entry with `mode_of_transport = "AIR"` and only a bill of lading produces `RIV-070`.
5. An entry with both a bill of lading and an air waybill produces `RIV-073`.
6. `goods_description = "assorted goods"` produces `RIV-092`; `"Stainless steel fasteners, M8"` produces none.
7. The same entry validated twice produces identical, identically ordered findings; re-validating a stored entry a month later still produces the same `RIV-132` result.
8. A clean entry persists a `validation_results` row with `outcome = 'PASS'` and zero findings, and opens no exception.
9. No endpoint accepts a validation request, and no flag disables validation.
10. Every finding's `field_name` resolves to a control on the F6 form.

---
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
## F6: Cargo Entry Web UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F3 · **PRD trace:** §5.2 F6, §11.1, NFR-1, NFR-2, NFR-10, SM-1, SM-11

**Description:** F6 is the screen a cargo specialist actually uses to create a cargo entry: a USWDS form with labelled fields, required-field indication, inline and summarised error messaging, and a submit action. On submission the specialist is told plainly what happened — the entry either passed validation or it opened an exception — with the case reference and a direct link to the case. Because there is no seeded demonstration dataset, this screen is the beginning of every demonstration path, and its explicitness about the receipt outcome is what makes the *validate* and *except* stages of the governed loop visible rather than inferred.

**Terminology (feature-specific):**
- **Entry form:** the single-page USWDS form rendering all fourteen entry fields in four labelled fieldsets.
- **Receipt outcome panel:** the region rendered after a successful `201`, stating `VALIDATED_CLEAN` or `EXCEPTION_OPENED` with the case reference and onward navigation.
- **Findings list:** the server's F4 findings, rendered both as an error summary and inline against each field.
- **Client hint:** a browser-side affordance (input mode, pattern hint, character counter). Advisory only; never authoritative.

**Sub-features:**
- USWDS cargo entry form with accessible labels, hints, and required marking
- Client-side affordances that never substitute for server validation
- Explicit receipt outcome presentation with case reference and link
- Server findings rendered field-by-field plus an error summary that moves focus
- Full keyboard operability and screen-reader-announced outcome
- Navigation from outcome into the queue or the opened case

---

### Screen: New Cargo Entry — `/entries/new`

**Layout** (inside the F2 shell; `<h1>` "New cargo entry"):

1. Intro paragraph: one sentence explaining that the entry is checked against required-information rules as soon as it is submitted, and that anything missing opens an exception for review.
2. Required-field convention statement ("A star (*) marks required information.").
3. Error summary slot (rendered only after a failed or exception-producing submission).
4. Four fieldsets:
   - **Entry identification** — `entry_number`*, `importer_of_record_id`*, `port_of_entry_code`*
   - **Transport** — `mode_of_transport`* (USWDS select: Ocean, Air, Truck, Rail), `carrier_code`*, `conveyance_name`*, `bill_of_lading_number`, `air_waybill_number`
   - **Goods** — `country_of_origin_code`*, `goods_description`* (textarea), `quantity`*, `quantity_uom`*, `declared_value_usd`*
   - **Arrival** — `arrival_date`* (USWDS date input, `YYYY-MM-DD`)
5. Primary button "Submit entry"; secondary link "Cancel" returning to `/queue`.
6. Receipt outcome panel slot (replaces the form region on success).

**Field presentation requirements:**

- **FR-6.1 — Field set parity.** The form MUST render exactly the fourteen fields of F3's entry field set — the four fieldsets above account for all fourteen, with `country_of_origin_code` placed first in **Goods** (origin of the goods belongs with the goods; UX-Mockup Y4 A-1) — no more (no free-text notes field, no attachment control, no HTS/classification field, no duty field) and no fewer.
- **FR-6.2 — Labels and hints.** Every control MUST have a visible `<label>` bound via `for`/`id`, plus USWDS hint text where a format expectation exists — for example "3-character filer code and 8 digits, for example ABC12345678" (`entry_number`), "4-digit port code" (`port_of_entry_code`), "2-letter country code, for example CN" (`country_of_origin_code`), "YYYY-MM-DD" (`arrival_date`). Hints MUST be associated via `aria-describedby` (F2 FR-2.10).
- **FR-6.3 — Required marking.** The twelve fields whose presence is checked by a `RIV-0x0` rule MUST be marked required with the USWDS indicator. `bill_of_lading_number` and `air_waybill_number` MUST NOT be individually marked required; their fieldset MUST carry the conditional statement "Enter an air waybill number for air shipments, or a bill of lading number otherwise." (rule `RIV-070`).
- **FR-6.4 — Client hints never gate submission.** The form MUST be submittable in any state, including entirely empty. Native `required` attributes and constraint-validation blocking MUST be disabled (`novalidate` on the form) so the server is always the authority and the specialist can deliberately create an incomplete entry — which is the primary demonstration path. Client-side hints may format or advise but MUST NOT prevent, alter, or pre-filter the submitted values.
- **FR-6.5 — Values submitted as typed.** The client MUST send values exactly as typed after trimming leading/trailing whitespace only. It MUST NOT uppercase codes, strip hyphens, reformat dates, round numbers, or drop fields it considers empty-equivalent beyond sending them as empty strings. What the specialist typed is what is recorded and audited.
- **FR-6.6 — Input affordances.** `quantity` and `declared_value_usd` MUST use `inputmode="decimal"` with `type="text"` (avoiding spinner and locale coercion); `arrival_date` MUST use the USWDS date input with an explicit format hint; `mode_of_transport` and `quantity_uom` MUST be USWDS selects populated from the F4 domain code lists, with an empty default option ("- Select -") so nothing is pre-chosen on the specialist's behalf.
- **FR-6.7 — No draft, autosave, or duplicate-entry shortcut.** The form MUST NOT autosave, persist a draft, or offer "duplicate this entry" / "create another from this one". Every entry is typed deliberately; a draft store would be an unaudited shadow of the entry of record.

---

### Process — Submit and outcome

1. Specialist activates "Submit entry".
2. The button enters its busy state ("Submitting…", `aria-disabled="true"`); repeat activation is ignored (F2 form pattern).
3. Client `POST`s the fourteen fields with the CSRF header.
4. **Response `201` with `receipt_outcome = "VALIDATED_CLEAN"`:** the form region is replaced by the receipt outcome panel — an `<h2>` "Entry received and validated", the case reference, a plain statement that no exception was opened, and two actions: "Create another entry" and "Go to review queue". Focus moves to the panel heading; the polite live region announces "Entry received. Validation passed. Case {reference}."
5. **Response `201` with `receipt_outcome = "EXCEPTION_OPENED"`:** the screen renders **both** (a) the receipt outcome panel — `<h2>` "Entry received. Exception opened.", the case reference, the count of unsatisfied rules, and the primary action "Open case {reference}" plus secondary "Go to review queue" and "Create another entry"; and (b) the findings, listed in the panel in server order and rendered inline against each affected field in the form below, which remains visible read-only beneath the panel so the specialist can see what they submitted. Focus moves to the panel heading; the polite live region announces "Entry received. {n} required-information problems. Exception opened as case {reference}."
6. **Response `4xx`:** the submission failed and nothing was saved. The error summary renders above the form with the server's per-field detail; focus moves to the summary; the assertive live region announces the problem count. All entered values are preserved.
7. **Response `5xx` or network failure:** the error summary states "The entry could not be received. Nothing was saved. Try again." with a "Try again" action that re-submits the unchanged form. Values are preserved.

---

### Functional Requirements

- **FR-6.8 — Outcome is never ambiguous.** The screen MUST distinguish three states in words, not by styling alone: *validated clean*, *exception opened*, and *submission failed (nothing saved)*. The specialist MUST never have to infer which occurred. An exception being opened MUST NOT be presented as an error or a failure — it is a successful receipt with a business outcome, and the copy MUST reflect that.
- **FR-6.9 — Double-submission prevention.** The client MUST block a second submission while one is in flight, and MUST NOT auto-retry a submission whose outcome is unknown (a timeout may have created an entry). On an unknown outcome the screen MUST say so and direct the specialist to the review queue to check, rather than silently retrying (receipt is not idempotent — F3 FR-3.16).
- **FR-6.10 — Inline findings binding.** Each F4 finding MUST be rendered on the control whose `id` matches its `field_name`, with `aria-invalid="true"` and `aria-describedby` pointing at the error text (F2 FR-2.13). The two cross-field rules `RIV-070` and `RIV-073` are the sole exception: although each carries a single `field_name` (its declared primary field — F4 §Cross-field rules), both MUST be rendered on the Transport fieldset containing both transport-document controls, inside the fieldset's error slot and associated via `aria-describedby` on the `<fieldset>`, because the finding concerns the pair rather than either field alone.
- **FR-6.11 — Summary ordering.** The error summary MUST list findings in the exact order the server returned them (ascending `rule_id` — F4 FR-4.8), each item linking to and focusing its control.
- **FR-6.12 — Message fidelity.** Server messages MUST be rendered verbatim. The client MUST NOT substitute its own wording, translate codes, merge findings, or suppress any finding. Rule identifiers MUST NOT be displayed as the primary message text; they MAY appear as supplementary small text next to the message.
- **FR-6.13 — Navigation from outcome.** "Open case {reference}" MUST navigate to `/cases/{case_reference}` (F10). "Go to review queue" MUST navigate to `/queue` (F8). "Create another entry" MUST reset to an empty form with focus on the first field and an announced status; it MUST NOT retain the previous values.
- **FR-6.14 — Read-only submitted values.** After a successful receipt, the form fields MUST become non-editable (rendered as a read-only summary list, not as disabled inputs, so screen-reader users can still read the values). Editing a received entry is impossible by design (F3 FR-3.6), and the screen MUST NOT imply otherwise.
- **FR-6.15 — Duplicate entry number.** A `409 ENTRY_NUMBER_DUPLICATE` MUST render in the error summary with the message plus a link to the existing case, and an inline error on `entry_number`.
- **FR-6.16 — Session expiry on submit.** A `401` MUST preserve the typed values in memory, navigate to `/sign-in?next=/entries/new`, and after re-authentication return to an empty form with a status message explaining that the entry was not saved and must be re-entered. The client MUST NOT silently re-submit after re-authentication (F1 FR-1.8).
- **FR-6.17 — Performance.** Initial render MUST complete within 2 seconds under demonstration load (NFR-10). Submission feedback MUST appear within 2 seconds or show the busy state continuously until it does.
- **FR-6.18 — Accessibility sign-off.** The screen MUST pass the F2 FR-2.26 checklist, including completion of "create an incomplete entry and read its outcome" using the keyboard alone and with a screen reader (SM-10, SM-11).
- **FR-6.19 — No ingestion affordance.** The screen MUST contain no file input, drag-and-drop target, paste-a-batch control, template download, "import from ACE" action, or any other bulk path (PRD §10 #6). Manual typing is the only input method.

---

**Inputs (from the specialist):** the fourteen entry fields as typed; the submit activation. **Inputs (from the server):** the `POST /api/entries` response — `receipt_outcome`, `case_reference`, `validation.findings[]`, `exception`, and error bodies.

**Outputs:**
- A `POST /api/entries` request containing exactly the fourteen fields
- A rendered receipt outcome panel stating the outcome, the case reference, and onward navigation
- Rendered findings (summary + inline) in server order
- Announcements for submission start, outcome, and errors

**Validation (client-side, advisory only):**
- Trim leading/trailing whitespace on all string values before sending.
- Cap input lengths at the F3 structural limits so a `422` for over-length is not reachable through normal typing (the server check remains authoritative).
- Send `quantity` and `declared_value_usd` as the typed string; do not coerce, round, or localise.
- Do **not** block submission for any reason other than an in-flight request.

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Validation findings (exception opened) | Outcome panel "Exception opened" + summary + inline errors | Panel heading | Polite: outcome and finding count |
| Duplicate entry number (409) | Error summary with link to existing case + inline error | Error summary | Assertive |
| Malformed request (422) | Error summary with per-field detail | Error summary | Assertive |
| Receipt failure (500) | Error summary "Nothing was saved. Try again." + retry | Error summary | Assertive |
| Network failure / unknown outcome | Error summary advising to check the review queue | Error summary | Assertive |
| Session expired (401) | Redirect to sign-in with explanatory status | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `POST /api/entries` (F3). No endpoint of its own. See `Y1-api.md` §2.

**Schema Surface (this feature):** none directly; renders `cargo_entries`, `validation_findings`, and `exceptions` data returned by F3.

**Acceptance Criteria:**
1. Submitting a completely empty form succeeds with `201`, opens an exception, and renders 13 findings inline and in the summary.
2. The browser does not block the empty submission (no native constraint-validation bubble appears).
3. A clean entry renders "Entry received and validated" with a case reference and no findings.
4. Each finding's summary item moves focus to its control when activated.
5. `RIV-070` renders on the Transport fieldset, not on an arbitrary single field.
6. Typing `abc12345678` submits `abc12345678`, and that exact string appears in the entry record and audit trail.
7. The whole task — fill, submit, read outcome, open the case — is completable by keyboard alone and announced to a screen reader.
8. The screen contains no file input, no draft save, and no field outside the fourteen.

---
## F7: Review Queue (API)

**Priority:** P0 · **Surface:** Programmatic API · **Dependencies:** F0, F1, F5 · **PRD trace:** §5.3 F7, §4.3 #5, PRD §10 #2 and #4

**Description:** F7 is the server-side projection that returns open exceptions in receipt order, plus the single-case retrieval endpoint that the case detail screen reads. It is deliberately one query with one ordering and **no parameters**: no filtering, no sorting, no assignment, no prioritisation, no search, no pagination controls. A receipt-ordered list is sufficient to demonstrate queue → open → decide, and adding dimensions to it would widen the surface without deepening the loop. The list endpoint returns only open exceptions and only the fields a list row needs; the detail endpoint returns everything a specialist needs to take a decision.

**Terminology (feature-specific):**
- **Queue:** the ordered projection of `exceptions` where `state = 'OPEN'`, ascending by `receipt_position`. It is a query result, not a stored structure — nothing is enqueued or dequeued, and no row is removed from a queue table on closure.
- **Row summary:** the minimum payload for a list row — case reference, receipt timestamp, originating entry identifier, and a validation-failure summary.
- **Case detail:** the composed read model for one exception: entry values with origins, validation findings, recommendation (or its absence), decision (if any), and state.
- **Failure summary:** a short derived string plus the finding count, used to tell rows apart in the list.

**Sub-features:**
- Parameterless list endpoint returning open exceptions in ascending receipt order
- Stable, deterministic ordering across repeated requests
- Row summary payload
- Closed cases excluded from the queue
- Single-case retrieval with findings, recommendation, decision state, and entry values

---

### Process — List

1. Middleware authenticates (F1); unauthenticated ⇒ `401`.
2. Handler rejects the request if **any** query string is present (FR-7.2).
3. Handler executes exactly one query: `SELECT ... FROM exceptions e JOIN cargo_entries c ON c.id = e.entry_id WHERE e.state = 'OPEN' ORDER BY e.receipt_position ASC LIMIT 501`.
4. Handler composes the failure summary per row from the referenced validation findings.
5. If 501 rows were returned, the handler emits the first 500 and sets `truncated: true` (FR-7.9).
6. Handler returns `200` with `{ exceptions: [...], returned_count, truncated }`.

### Process — Single case

1. Middleware authenticates.
2. Handler resolves the identifier: the path segment MAY be either the exception `uuid` or the `case_reference` (`CE-YYYY-NNNNNN`), so a UI route keyed on the human-readable reference needs no extra lookup. Anything matching neither form ⇒ `400 INVALID_IDENTIFIER`.
3. Handler loads the exception, its entry and per-field origins, its validation result and findings, its recommendation with proposed values (if any), and its decision with decision values (if any).
4. Handler returns `200` with the composed case detail, including `state`, `is_closed`, and `permitted_decisions` (FR-7.8).

---

### Functional Requirements

- **FR-7.1 — Ordering is receipt order, strictly.** The list MUST be ordered `receipt_position ASC` and by nothing else. `receipt_position` is assigned at exception creation and is immutable (F5 FR-5.8), so ordering is total, stable, and identical across repeated requests and across processes. There MUST be no secondary sort key, no tie-break (the column is unique), and no ordering configuration.
- **FR-7.2 — Zero query parameters.** `GET /api/exceptions` MUST accept no query parameters at all. A request carrying any query string — including `?state=`, `?sort=`, `?order=`, `?q=`, `?assignee=`, `?priority=`, `?page=`, `?limit=`, `?since=`, or any unrecognised parameter — MUST be rejected with `400 UNSUPPORTED_QUERY_PARAMETER` naming the offending parameter. Rejection rather than silent ignoring is deliberate: it makes the absence of queue management an enforced contract rather than an undocumented gap (PRD §10 #4).
- **FR-7.3 — No filtering, sorting, assignment, or prioritisation, anywhere.** Beyond the parameter ban, no header, body, cookie, or configuration value may alter the queue's membership or order, and the response MUST contain no field that would support client-side queue management — no `priority`, `severity`, `risk`, `assigned_to`, `claimed_by`, `age_days`, `age_bucket`, `due_at`, `sla_status`, or `is_overdue`. Client-side sorting or filtering controls are likewise prohibited (F8 FR-8.4).
- **FR-7.4 — Open cases only.** The list MUST include exactly the exceptions in `OPEN` state. `RESOLVED` and `REJECTED` exceptions MUST be excluded, with no parameter, toggle, or alternate endpoint to include them. A closed case remains reachable **only** by its direct URL (`GET /api/exceptions/{id}`), which is how the audit trail of a decided case stays readable (F14) without introducing a second list surface or a history browse.
- **FR-7.5 — Row summary payload.** Each row MUST contain exactly: `id`, `case_reference`, `receipt_position`, `received_at`, `entry_number` (nullable — an exception may exist precisely because it is missing), `finding_count`, and `failure_summary`. Nothing else. Full entry values, recommendation text, and findings detail are not list data.
- **FR-7.6 — Failure summary derivation.** `failure_summary` MUST be derived deterministically from the findings: the messages of the first two findings in server order, joined by "; ", suffixed with " and {n} more" when more than two exist. It is presentation shorthand only; the authoritative findings are returned by the detail endpoint. It MUST NOT include a severity, score, or ranking term (F4 FR-4.9).
- **FR-7.7 — Case detail payload.** `GET /api/exceptions/{idOrReference}` MUST return: the exception (`id`, `case_reference`, `state`, `receipt_position`, `opened_at`, `closed_at`); the entry (all fourteen values with per-field `origin`, `received_at`, submitting specialist id and display name); the validation result (`outcome`, `rule_set_version`, `evaluated_at`, findings in server order); the recommendation (`status`, and when `AVAILABLE`: `recommended_action`, `rationale`, `proposed_values[]` each with `field_name`, `proposed_value`, `origin: "AI"`, `addresses_rule_ids[]`, plus `model_id`, `prompt_version`, `generated_at`; when `UNAVAILABLE`: `failure_reason` and `failed_at`; when `PENDING`: `requested_at`); and the decision when one exists (`decision_type`, `decided_at`, `decided_by` id and display name, `reason`, `resolution_values[]` with per-value `origin` and `prior_value`).
- **FR-7.8 — Permitted decisions are server-declared.** The case detail response MUST include `permitted_decisions: string[]` computed server-side: `[]` when the case is closed; `["APPROVE","EDIT_APPROVE","REJECT"]` when open with an `AVAILABLE` recommendation; `["EDIT_APPROVE","REJECT"]` when open with an `UNAVAILABLE` or `PENDING` recommendation (approval requires something to approve — F11 FR-11.6). The UI derives its controls from this field rather than re-implementing the rule, and the API re-checks it on submission regardless.
- **FR-7.9 — Bounded response without pagination.** The list MUST return at most 500 rows and set `truncated: true` when more open exceptions exist. This is a safety bound, not pagination: there MUST be no page, offset, cursor, or limit parameter, and no "next page" link. At demonstration scale the bound is not reachable; it exists so an unbounded response cannot occur.
- **FR-7.10 — Read-only.** Both endpoints MUST be `GET`-only and side-effect free. Reading the queue or a case MUST NOT change any state, MUST NOT claim or lock a case, and MUST NOT write an audit entry — viewing is not a state change, and recording views would both miss the point of the audit trail and create a per-specialist activity record that supervision (out of scope) would consume.
- **FR-7.11 — Authenticated, single role.** Both endpoints require a valid session. Every authenticated specialist sees the identical queue and the identical case content; there is no per-user visibility scoping, because there is one role and no assignment (F1 FR-1.1).
- **FR-7.12 — No caching of stale state.** Responses MUST be sent with `Cache-Control: no-store` so a decided case never renders from cache as though it were still open.
- **FR-7.13 — Determinism under concurrency.** Two specialists requesting the queue at the same moment MUST receive the same rows in the same order. A case decided between the two requests simply disappears from the later one; no ordering of the remaining rows changes, because positions are immutable.
- **FR-7.14 — Not found.** An identifier that is well-formed but matches no exception MUST return `404 EXCEPTION_NOT_FOUND`. A well-formed identifier matching an entry that passed validation (and therefore has no exception) MUST also return `404`, with the message distinguishing "this entry passed validation and has no exception" so the UI can explain it.

---

**Inputs:**
- `GET /api/exceptions`: session cookie only. No parameters, no body.
- `GET /api/exceptions/{idOrReference}`: session cookie; path segment matching `^[0-9a-f-]{36}$` or `^CE-[0-9]{4}-[0-9]{6}$`.

**Outputs:**
- `200` queue: `{ exceptions: RowSummary[], returned_count, truncated }` in ascending receipt order
- `200` case detail: the composed read model of FR-7.7 plus `permitted_decisions`
- No writes of any kind

**Validation:**
- Reject any query string (FR-7.2).
- Reject a path identifier matching neither accepted form (`400 INVALID_IDENTIFIER`).
- Reject non-`GET` methods on both paths with `405 METHOD_NOT_ALLOWED` (the only mutating exception route is `POST /api/exceptions/{id}/decision`).

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| No session | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| Any query parameter supplied | 400 | `UNSUPPORTED_QUERY_PARAMETER` | "This endpoint accepts no query parameters." |
| Malformed identifier | 400 | `INVALID_IDENTIFIER` | "That case identifier is not valid." |
| No such exception | 404 | `EXCEPTION_NOT_FOUND` | "That case could not be found." |
| Entry exists but passed validation | 404 | `EXCEPTION_NOT_FOUND` | "That entry passed validation, so it has no exception." |
| Non-GET method | 405 | `METHOD_NOT_ALLOWED` | "That action is not available." |

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/exceptions` | session | Open exceptions in receipt order; no parameters |
| `GET` | `/api/exceptions/{idOrReference}` | session | Full case detail for one exception |

Full schemas in `Y1-api.md` §3 Queue & Cases.

**Schema Surface (this feature):** reads `exceptions`, `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, `recommendations`, `recommendation_values`, `decisions`, `decision_values`, `specialists`. Requires index `idx_exceptions_open_receipt_order` on `(receipt_position)` `WHERE state = 'OPEN'`. See `Y0-schema.md` §4 and §8.

**Acceptance Criteria:**
1. Three open exceptions are returned in ascending `receipt_position`, identically on repeated calls.
2. Deciding the first case removes it from the next response and leaves the order of the others unchanged.
3. `GET /api/exceptions?sort=received_at` returns `400 UNSUPPORTED_QUERY_PARAMETER`.
4. `GET /api/exceptions?state=RESOLVED` returns `400`, not a filtered list.
5. The response JSON contains no priority, assignment, age, or SLA field.
6. A resolved case is absent from the list but fully readable at its direct URL, including its decision.
7. `permitted_decisions` is `["EDIT_APPROVE","REJECT"]` for an open case whose recommendation is `UNAVAILABLE`, and `[]` for any closed case.
8. Reading the queue or a case writes no audit entry and changes no row.

---
## F8: Review Queue Web UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F7 · **PRD trace:** §5.3 F8, §11.1, NFR-1, NFR-2, NFR-10, SM-11

**Description:** F8 is the screen where a specialist sees the open exceptions and chooses one to work. It is a single USWDS table in receipt order, where each row identifies the case and why it is open, and activating a row opens the case detail screen (F10). No filter controls, sort headers, assignment actions, or priority badges appear — their absence is the design, not an omission. An empty queue states plainly that there are no open exceptions and offers the path to create an entry, which matters because there is no seeded dataset and an empty queue is the normal starting state of a demonstration.

**Terminology (feature-specific):**
- **Queue table:** the USWDS table listing open exceptions, one row per case, in receipt order.
- **Row activation:** opening a case from a row, via a link in the case-reference cell.
- **Empty state:** the presentation shown when zero open exceptions exist.
- **Truncation notice:** the message shown when the server reports `truncated: true` (F7 FR-7.9).

**Sub-features:**
- Receipt-ordered list of open exceptions with case reference, receipt time, and failure summary
- Row activation opening the case detail screen, by keyboard and pointer
- Accessible table semantics with a programmatic row count
- Empty state with a route to cargo entry creation
- Return-to-queue navigation that preserves the specialist's place in the flow

---

### Screen: Review Queue — `/queue` (also the post-sign-in landing route)

**Layout** (inside the F2 shell; `<h1>` "Review queue"):

1. `<h1>` "Review queue", followed by a one-sentence explanation: "Open exceptions, oldest first by receipt. Open a case to review its AI recommendation and record your decision."
2. A visible count: "{n} open exceptions" (singular form for 1), which is also the table's accessible caption text.
3. The queue table, or the empty state.
4. A secondary action "New cargo entry" linking to `/entries/new`.

**Table structure:**

| Column | Content | Notes |
|---|---|---|
| Case | `case_reference` as a link to `/cases/{case_reference}` | Row's accessible entry point |
| Received | `received_at` | Absolute local datetime, e.g. "11 Sep 2026, 14:32" |
| Entry number | `entry_number` or "Not provided" | Never blank |
| Why it is open | `failure_summary` with the finding count | Plain text |

---

### Functional Requirements

- **FR-8.1 — Order mirrors the server.** Rows MUST be rendered in the exact order the API returned them (ascending receipt position). The client MUST NOT re-order, re-group, or re-rank rows for any reason.
- **FR-8.2 — Columns are fixed.** Exactly the four columns above MUST be rendered. There MUST be no priority, severity, age, days-open, assignee, status, or action-menu column (PRD §10 #2, #4).
- **FR-8.3 — No sort affordance.** Column headers MUST be plain `<th scope="col">` text. They MUST NOT be buttons, links, or otherwise activatable, MUST NOT carry `aria-sort`, and MUST NOT display sort arrows. The USWDS sortable-table variant MUST NOT be used.
- **FR-8.4 — No filter, search, assignment, or bulk control.** The screen MUST contain no search input, filter chip, date-range control, state toggle ("show closed"), select-all checkbox, row checkbox, bulk action bar, "assign to me" action, "claim" action, or per-row overflow menu. Nothing on the screen mutates state; the only interactive elements are the row links and the "New cargo entry" link.
- **FR-8.5 — Row activation.** Each row MUST be openable via the link in its Case cell, operable by pointer and by keyboard (`Enter`). The whole `<tr>` MUST NOT be a click target with a JavaScript handler in place of a real link, so middle-click, copy-link, and screen-reader link navigation all work. The link's accessible name MUST include the case reference (e.g. "Open case CE-2026-000137").
- **FR-8.6 — Table semantics.** The table MUST use `<table>` with a `<caption>` stating "Open exceptions in receipt order — {n} cases", `<thead>` with `scope="col"` headers, and `<tbody>` rows. Layout tables, ARIA grid roles, and virtualised rendering MUST NOT be used. The visible count plus the caption provide the programmatic row count (FR-8.9).
- **FR-8.7 — Empty state.** When zero open exceptions exist, the screen MUST render the F2 `Empty` component: `<h2>` "No open exceptions", the sentence "Every exception has been decided. Create a cargo entry to start a new case.", and a primary link "New cargo entry". The empty state MUST NOT be an error, MUST NOT suggest a filter is hiding results, and MUST NOT render an empty table skeleton.
- **FR-8.8 — Loading and error states.** While loading, the F2 `Loading` component renders with `aria-busy="true"` on the table region. A failed load renders the F2 `ErrorState` with "We could not load the review queue." and a "Try again" action; the error is announced assertively.
- **FR-8.9 — Announcements.** After a successful load the polite live region MUST announce "Review queue. {n} open exceptions." After a refresh that changes the count, the new count MUST be announced.
- **FR-8.10 — Refresh is explicit, not automatic.** The queue MUST NOT poll, auto-refresh, or push updates. It refreshes on navigation to the screen and on activation of a "Refresh" button placed after the table heading. Automatic refresh would move rows under a keyboard or screen-reader user mid-read, and a live-updating queue is the beginning of queue-health monitoring, which is out of scope.
- **FR-8.11 — Return-to-queue continuity.** Navigating back from a case (via the F10 "Back to review queue" link or the browser back button) MUST return to `/queue`, re-fetch the list, and place focus on the queue `<h1>`. When the case just decided is no longer in the list, the polite region MUST announce "Case {reference} was {resolved|rejected} and is no longer in the queue. {n} open exceptions remain." — so the specialist understands why the row vanished rather than suspecting a lost case.
- **FR-8.12 — Truncation notice.** When `truncated` is true, an informational USWDS alert MUST appear above the table: "Showing the first 500 open exceptions in receipt order." No pagination control may be offered (F7 FR-7.9).
- **FR-8.13 — Closed cases are not listed here.** The screen MUST NOT offer any way to browse closed cases (no tab, toggle, or "recently decided" panel). A closed case is reached by its direct URL, typically by following the link shown after a decision (F12) or a link retained by the specialist.
- **FR-8.14 — Dates are unambiguous.** `received_at` MUST render as an absolute local date and time with the month in words to avoid day/month ambiguity, and MUST carry the machine-readable value in a `<time datetime="…">` element. Relative phrasing ("2 days ago") MUST NOT be used — it is aging language, and aging is out of scope.
- **FR-8.15 — Performance.** The screen MUST render within 2 seconds under demonstration load (NFR-10).
- **FR-8.16 — Accessibility sign-off.** The screen MUST pass the F2 FR-2.26 checklist, including traversing the table with a screen reader's table navigation and opening a case using the keyboard alone (SM-10, SM-11).

---

**Inputs:**
- `GET /api/exceptions` response: `exceptions[]` (`id`, `case_reference`, `receipt_position`, `received_at`, `entry_number`, `finding_count`, `failure_summary`), `returned_count`, `truncated`
- Specialist interactions: row link activation, "Refresh", "New cargo entry"

**Outputs:**
- A rendered, receipt-ordered accessible table (or the empty state)
- Navigation to `/cases/{case_reference}` on row activation
- Navigation to `/entries/new` from the empty state or the secondary action
- Status announcements for load, count, refresh, and post-decision removal

**Validation (presentation-level):**
- `entry_number` that is null MUST render as "Not provided" rather than an empty cell.
- `failure_summary` MUST be rendered as text and escaped; it MUST NOT be rendered as HTML.
- `received_at` MUST be parsed as an ISO-8601 instant and rendered in the browser's local zone with the zone abbreviation shown.
- A row whose `case_reference` is missing or malformed MUST render without a link and log a client-side warning rather than producing a broken route.

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Load failure (5xx/network) | `ErrorState` with "Try again" | Error region | Assertive |
| Session expired | Redirect to sign-in (F1 FR-1.8) | Sign-in `h1` | Polite |
| Query-parameter rejection (400) | Cannot occur from the UI — the client never sends parameters; if seen, `ErrorState` with generic cause | Error region | Assertive |
| Zero open exceptions | `Empty` state (not an error) | Screen `h1` | Polite: "No open exceptions." |

**API Surface (this feature):** consumes `GET /api/exceptions` (F7) with no parameters. No endpoint of its own. See `Y1-api.md` §3.

**Schema Surface (this feature):** none directly.

**Acceptance Criteria:**
1. With three open exceptions, rows appear oldest-first by receipt and match the API order exactly.
2. No column header is activatable, and the rendered DOM contains no `aria-sort`, no sort icon, no search input, and no checkbox.
3. A case opens by tabbing to its link and pressing `Enter`.
4. With zero open exceptions, the empty state renders with a working "New cargo entry" link and no table.
5. Deciding a case and returning to the queue shows one fewer row, with the removal explained in an announcement.
6. The queue does not change without an explicit navigation or refresh.
7. A screen reader reports the table caption, the row count, and each row's four cells with their column headers.
8. The rendered response contains no representation of a closed case.

---
## F9: AI Resolution Recommendation Generation

**Priority:** P0 · **Surface:** Integrations / Background-async · **Dependencies:** F0, F5, F13 · **PRD trace:** §5.4 F9, NFR-4, NFR-9, SM-9, SM-13, R-1, R-6

**Description:** F9 generates a recommended resolution action for an exception together with a plain-language rationale explaining why that action is recommended. The AI is consumed through a hosted model API behind a provider abstraction; there is no training and no fine-tuning infrastructure (PRD §10 #11). The recommendation is a **draft only**: it is persisted as a proposal attached to the case, every proposed value is marked `AI` in origin, and it never mutates the entry or the exception state. Generation is triggered by the exception coming into being, and its result is recorded with the model identity, prompt version, and timestamp, so the record can later answer "what did the AI say" exactly as it was said. If the provider is unavailable, slow, or returns something unusable, the case remains fully workable and the human decision path is unaffected.

**Terminology (feature-specific):**
- **Provider abstraction:** the internal `RecommendationProvider` interface (`generate(request) → RecommendationDraft`) behind which the hosted model client sits. The decision and audit layers depend only on this interface.
- **Recommendation draft:** the provider's parsed, schema-valid output: a recommended action, a rationale, and proposed field values with the rule ids each addresses.
- **Proposed value:** a field value the AI suggests, stored on `recommendation_values` with `origin = 'AI'` (constant-checked) and never written into `cargo_entries`.
- **Degraded mode:** the terminal `UNAVAILABLE` recommendation status, reached when generation cannot produce a usable draft. The case is still decidable.
- **Generation attempt:** one dispatch of the generation job for one exception, including its internal transport retry.

**Sub-features:**
- Recommendation request composed from entry values and validation findings
- Recommended resolution action plus plain-language rationale
- Proposed values persisted with `AI` provenance, never applied
- Model identity, prompt version, and generation timestamp recorded
- Audit entry on each terminal outcome via F13
- Degraded mode that never blocks the human decision path
- Provider abstraction permitting substitution without touching decision or audit layers

---

### Process — Generation

1. F3 commits the receipt transaction, which created the exception and a `PENDING` recommendation row (F5).
2. **After commit**, F3 dispatches an in-process background job for that `exception_id`. Dispatch failure MUST be logged and MUST NOT affect the already-committed receipt.
3. The job loads the exception, the entry values, and the findings. If the recommendation row is no longer `PENDING`, the job exits without effect (idempotence).
4. The job composes the request: the fourteen entry field values as submitted, the ordered findings (`rule_id`, `field_name`, `failure_code`, `message`), the `rule_set_version`, and the prompt template identified by `prompt_version`.
5. The job calls the provider with a 20-second per-attempt timeout. On a timeout or a retryable transport error (HTTP 429, 5xx, connection failure) it makes **one** retry after a 2-second delay. Total budget 45 seconds.
6. The response is parsed against the output schema (FR-9.7). A parse or schema failure is terminal for the attempt — it is not retried, because a schema-invalid response is not a transient condition.
7. **Success:** in one transaction, update the recommendation row to `status = 'AVAILABLE'` with `recommended_action`, `rationale`, `model_id`, `prompt_version`, `generated_at`, `latency_ms`; insert one `recommendation_values` row per proposed value; write the `RECOMMENDATION_GENERATED` audit entry via F13. Commit.
8. **Failure:** in one transaction, update the recommendation row to `status = 'UNAVAILABLE'` with `failure_reason`, `failed_at`, and the `model_id`/`prompt_version` attempted; write the `RECOMMENDATION_UNAVAILABLE` audit entry via F13. Commit.
9. In both branches the exception's `state` MUST remain `OPEN` and `cargo_entries` MUST be untouched.

---

### Functional Requirements

- **FR-9.1 — A recommendation is a proposal, structurally.** The recommendation MUST be persisted in `recommendations`/`recommendation_values`, which are **separate tables from `decisions`/`decision_values`**. No column of `recommendations` participates in the exception's state, and no read path presents a recommendation as a resolution. This separation is the structural reason a recommendation cannot auto-apply: applying one would require a `decisions` row, and only F11 — invoked by an authenticated human — writes one (F11 FR-11.1, F0 FR-0.9).
- **FR-9.2 — The AI cannot write a decision.** The generation job MUST have no access to the decision service, and `decisions.decided_by` is `NOT NULL REFERENCES specialists(id)` with no AI or system account in that table. Even a compromised or buggy generation path therefore cannot resolve a case; the attempt fails on a foreign key (NFR-5, SM-4).
- **FR-9.3 — Entry of record untouched.** Generation MUST NOT write to `cargo_entries` or `cargo_entry_field_origins` under any circumstance. Proposed values live only on `recommendation_values`.
- **FR-9.4 — Origin is `AI`, always.** Every `recommendation_values` row MUST carry `origin = 'AI'`, enforced by `CHECK (origin = 'AI')` (F0 FR-0.3). There is no mechanism to mark a proposed value as human-originated at this stage.
- **FR-9.5 — One recommendation per exception.** `UNIQUE (exception_id)` applies. v1 has no regenerate action, no alternatives list, and no recommendation history; a specialist who disagrees edits or rejects (F11), which is the accountable act the product exists to record.
- **FR-9.6 — Trigger is exception creation only.** Generation MUST be dispatched only by the post-commit hook of a receipt that opened an exception. There MUST be no endpoint, UI control, schedule, or batch job that triggers generation, and none that triggers it for a closed case.
- **FR-9.7 — Output contract.** The provider response MUST be validated against this schema before persistence; any violation ⇒ `UNAVAILABLE` with `failure_reason = 'SCHEMA_INVALID'`:
  - `recommended_action` (string, 1–500 chars after trim) — one plain-language sentence stating the action to take
  - `rationale` (string, 1–2000 chars after trim) — plain-language explanation referencing the unsatisfied rules in ordinary words
  - `proposed_values` (array, 0–14 items) of `{ field_name, proposed_value, addresses_rule_ids }` where `field_name` is a member of the F3 entry field set, `proposed_value` is a string within that field's structural limit, and `addresses_rule_ids` is a non-empty array of rule ids present in this exception's findings
  - Duplicate `field_name` entries MUST be rejected as schema-invalid
  - Any additional top-level property MUST be rejected
- **FR-9.8 — No computation of excluded determinations.** The prompt MUST NOT request, and the output schema MUST NOT accept, a duty amount, tariff rate, HTS or classification code, admissibility ruling, penalty, or risk score. A `field_name` outside the fourteen-field set — including any classification field — makes the response schema-invalid (PRD §10 #9).
- **FR-9.9 — Rationale quality.** The prompt MUST instruct plain language intelligible to a non-technical reader: no rule identifiers as the explanation, no regular expressions, no internal codes, no model self-reference. Intelligibility is judged by reviewing specialists during walkthrough (SM-9).
- **FR-9.10 — Provenance metadata recorded.** `model_id` (provider model identifier and version string), `prompt_version` (template identifier), `generated_at`, and `latency_ms` MUST be persisted on the recommendation and rendered by F10, so the record states which model said what, when.
- **FR-9.11 — Exactly one audit entry per terminal outcome.** Reaching `AVAILABLE` MUST write exactly one `RECOMMENDATION_GENERATED` entry with `actor_type = 'AI'`, `actor_specialist_id = NULL`, `before_state = 'PENDING'`, `after_state = 'AVAILABLE'`, and one `audit_entry_values` row per proposed value (`before_value` = the entry's current value for that field, `before_origin = 'HUMAN'` or `NULL` if never provided; `after_value` = the proposed value, `after_origin = 'AI'`). Reaching `UNAVAILABLE` MUST write exactly one `RECOMMENDATION_UNAVAILABLE` entry with `actor_type = 'AI'`, `after_state = 'UNAVAILABLE'`, `recommendation_id` set, and no value rows; the `failure_reason` is recorded on `recommendations.failure_reason` and read back through that reference, never copied onto the audit entry (no audit column exists for it). `PENDING` creation writes no entry of its own (F5 FR-5.12).
- **FR-9.12 — Degraded mode never blocks the loop.** Provider unavailability, latency, or malformed output MUST NOT block entry creation, validation, exception opening, queue listing, the human decision path, or audit writing (NFR-9). An `UNAVAILABLE` case MUST remain decidable via `EDIT_APPROVE` (the specialist authors the resolution values themselves, all `HUMAN` origin) or `REJECT`, both requiring a reason (F11 FR-11.6, SM-13).
- **FR-9.13 — Failure reasons are enumerated.** `failure_reason` MUST be one of `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `SCHEMA_INVALID`, `CONTENT_FILTERED`, `INTERNAL_ERROR`. Each maps to plain-language copy in F10; the raw provider error body MUST NOT be shown to the specialist and MUST NOT be persisted in the recommendation row (it may be logged with secrets redacted).
- **FR-9.14 — No automatic retry after a terminal outcome.** Once `UNAVAILABLE`, there MUST be no background retry, scheduled re-attempt, retry-on-view, or UI "regenerate" button. A silent later retry would change what the case showed at decision time and undermine the audit record's account of what the AI said when the human decided.
- **FR-9.15 — Provider abstraction.** The hosted-model client MUST sit behind the `RecommendationProvider` interface. Swapping providers MUST require no change to F5, F7, F10, F11, F12, F13, or F14. The interface MUST NOT expose provider-specific types to callers, and a test double MUST be able to produce every outcome branch, including each `failure_reason`.
- **FR-9.16 — Credentials and data handling.** The provider API key MUST come from environment configuration, never from source control, and MUST never appear in logs, error messages, responses, or audit entries (NFR-8). Requests to the provider MUST NOT include session tokens, specialist credentials, specialist names, or specialist identifiers — the model receives entry content and findings only. Data handling is documented in `Y3-integrations.md`.
- **FR-9.17 — Concurrency and idempotence.** The job MUST take a row lock on the recommendation and act only while `status = 'PENDING'`, so a duplicate dispatch performs no second write and produces no second audit entry.
- **FR-9.18 — Bounded resource use.** Generation MUST run with a bounded worker concurrency and MUST NOT block the HTTP request path. A backlog MUST NOT delay any interactive response (NFR-10); pending cases simply display as pending in F10.
- **FR-9.19 — Process restart.** A recommendation left `PENDING` by a process restart MUST be presented as pending-then-stale by F10 (FR-10.7) rather than resurrected by a sweeper job: v1 has no recovery scheduler, and a case with no recommendation is fully decidable. This is a deliberate simplification consistent with degraded mode.

---

**Inputs (internal):**
- `exception_id` (uuid) with `recommendations.status = 'PENDING'`
- Entry values (fourteen fields, as submitted) and per-field origins
- Ordered findings from F4 with `rule_set_version`
- Prompt template (`prompt_version`), provider configuration (endpoint, `model_id`, timeout, API key)

**Outputs:**
- Updated `recommendations` row in a terminal status (`AVAILABLE` or `UNAVAILABLE`) with provenance metadata
- Zero or more `recommendation_values` rows, each `origin = 'AI'`
- Exactly one audit entry: `RECOMMENDATION_GENERATED` or `RECOMMENDATION_UNAVAILABLE`
- No change to entry, validation, or exception state

**Validation:**
- Response MUST satisfy the FR-9.7 schema; otherwise terminal `SCHEMA_INVALID`.
- Every `field_name` MUST be in the entry field set; every `addresses_rule_ids` element MUST be a `rule_id` present in this exception's findings; otherwise schema-invalid.
- `proposed_value` MUST respect the field's structural limit; a longer value is schema-invalid rather than truncated, so the record never shows a silently altered proposal.
- `recommended_action` and `rationale` MUST be non-empty after trim.
- The job MUST refuse to run for an exception in a terminal state (defensive; unreachable via the normal trigger).

**Error States:**

| Scenario | Recommendation status | `failure_reason` | Effect on the case |
|---|---|---|---|
| Provider timeout after retry | `UNAVAILABLE` | `PROVIDER_TIMEOUT` | Decidable via edit-and-approve or reject |
| Provider 5xx / connection failure | `UNAVAILABLE` | `PROVIDER_UNAVAILABLE` | Decidable |
| Provider 429 after retry | `UNAVAILABLE` | `PROVIDER_RATE_LIMITED` | Decidable |
| Invalid/expired API key (401/403) | `UNAVAILABLE` | `PROVIDER_AUTH_FAILED` | Decidable; key never logged |
| Response fails output schema | `UNAVAILABLE` | `SCHEMA_INVALID` | Decidable |
| Provider content filter blocked the response | `UNAVAILABLE` | `CONTENT_FILTERED` | Decidable |
| Unexpected internal error in the job | `UNAVAILABLE` | `INTERNAL_ERROR` | Decidable |
| Job never ran (dispatch lost, restart) | remains `PENDING` | — | Decidable; F10 shows pending/stale |

In no row of this table does the exception's state change, and in no row is the specialist prevented from deciding.

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/exceptions/{id}/recommendation` | session | Read the recommendation's current status and content, for F10 to poll while `PENDING` |

There is deliberately **no** `POST`/`PUT` recommendation endpoint, no regenerate endpoint, and no apply endpoint. Full schemas in `Y1-api.md` §4 Recommendation.

**Schema Surface (this feature):** writes `recommendations` (exception_id, status, requested_at, recommended_action, rationale, model_id, prompt_version, generated_at, latency_ms, failure_reason, failed_at) and `recommendation_values` (recommendation_id, field_name, proposed_value, origin `CHECK = 'AI'`, addresses_rule_ids). See `Y0-schema.md` §5 Recommendations.

**Acceptance Criteria:**
1. Opening an exception produces a `PENDING` recommendation that becomes `AVAILABLE` with an action, a rationale, and proposed values marked `AI`.
2. No proposed value ever appears in `cargo_entries`; the entry row is byte-identical before and after generation.
3. With the provider stopped, receipt still succeeds, the recommendation becomes `UNAVAILABLE` with `PROVIDER_UNAVAILABLE`, and the case is still resolvable with a full audit record (SM-13).
4. A provider response containing an `hts_code` or `duty_amount` field is rejected as schema-invalid and the case goes `UNAVAILABLE`.
5. Exactly one audit entry exists per terminal recommendation outcome, with `actor_type = 'AI'` and `actor_specialist_id` null.
6. The generation code path has no import of, or reference to, the decision service; a test asserts this and asserts that no AI principal exists in `specialists`.
7. Dispatching the job twice for one exception produces one recommendation and one audit entry.
8. No log line, response body, or audit entry contains the provider API key.

---
## F10: Exception Case Detail & Recommendation Presentation UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F7, F9 · **PRD trace:** §5.4 F10, §11.1, NFR-2, NFR-4, NFR-9, NFR-10, R-1

**Description:** F10 is the screen where the specialist does the work: the case in full — the submitted entry values, the validation findings that opened the exception, and the AI's recommended action with its plain-language rationale. The AI's contribution is marked as AI-originated visually **and** programmatically wherever it appears, so a reader can tell a machine proposal from a human value on sight and through assistive technology, not only by consulting the audit trail. The screen presents the recommendation as a proposal awaiting a decision and never as an applied outcome, and it hosts the decision controls (F12) and the per-case audit trail (F14).

**Terminology (feature-specific):**
- **Case detail screen:** the route `/cases/{caseReference}` rendering one exception in full.
- **Proposal framing:** the presentation rule that the recommendation is always described as suggested and not yet applied, in the heading, the badge, and the body copy.
- **Comparison row:** the presentation of one proposed value as *submitted value* → *AI-suggested value*, with the rules it addresses.
- **Pending presentation:** the state shown while the recommendation is `PENDING`.
- **Stale pending:** a `PENDING` recommendation older than 60 seconds, presented as no-recommendation-available while remaining technically pending (F9 FR-9.19).
- **Closed-case presentation:** the read-only rendering of a `RESOLVED` or `REJECTED` case.

**Sub-features:**
- Case header with reference, receipt time, and current state
- Submitted entry values and the validation findings that caused the exception
- AI recommended action and rationale, presented as an un-applied proposal
- Explicit AI-origin marking on every AI-proposed value, beyond colour alone
- "No recommendation available" presentation with the decision path unaffected
- Accessible heading structure and reading order across all case sections
- Closed-case read-only presentation showing the recorded decision

---

### Screen: Case Detail — `/cases/{caseReference}`

**Section order** (this reading order is normative — FR-10.10):

1. **Header** — `<h1>` "Case {case_reference}"; below it a definition list: current state (`Open` / `Resolved` / `Rejected` as text), received date and time, submitting specialist, receipt position label ("Received {n}th in order" is **not** shown — see FR-10.14), and a "Back to review queue" link.
2. **Why this case is open** (`<h2>`) — the findings from F4 in server order, as an ordered list; each item shows the plain-language message, the field it concerns, and the rule identifier as supplementary small text. A sentence above states "This entry did not satisfy {n} required-information rules when it was received."
3. **Submitted entry** (`<h2>`) — all fourteen fields as a definition list in the F6 fieldset order, each with its value or "Not provided", and each provided value carrying the "Specialist-entered" provenance badge (F2 FR-2.20).
4. **AI recommendation** (`<h2>`) — one of the four presentations in the table below.
5. **Your decision** (`<h2>`) — the F12 decision region (controls when open; recorded decision when closed).
6. **Audit trail** (`<h2>`) — the F14 region, rendered in place with a `#audit-trail` anchor and reachable directly at `/cases/{caseReference}/audit`.

**Recommendation presentations:**

| Recommendation status | Presentation |
|---|---|
| `AVAILABLE` | "AI-suggested resolution" badge + `recommended_action` + "Why the AI suggests this" rationale block + comparison rows for each proposed value + model metadata footnote |
| `PENDING` (< 60s) | F2 `Loading` with `aria-busy`, text "Generating an AI recommendation…", polite announcement, automatic refresh (FR-10.7) |
| `PENDING` (≥ 60s, stale) | Degraded presentation (below) with copy "No AI recommendation is available yet." |
| `UNAVAILABLE` | F2 `Degraded`: `<h3>` "No AI recommendation available", plain-language cause, and the sentence "You can still resolve or reject this case. Your decision and reason will be recorded as usual." |

---

### Functional Requirements

- **FR-10.1 — Proposal framing everywhere.** Every rendering of recommendation content MUST state that it is suggested and not applied. The section heading MUST be "AI recommendation"; the action MUST be introduced as "The AI suggests:"; the block MUST carry the sentence "Nothing here has been applied. It is recorded only if you decide to approve it." Words implying application ("Resolution applied", "Fixed", "Corrected", "Updated", "Auto-resolved") MUST NOT appear.
- **FR-10.2 — Per-value AI marking.** Every AI-proposed value MUST carry the F2 provenance badge with the text "AI-suggested", a distinct icon, and token colour — never colour alone (NFR-2, NFR-4). The badge text MUST be available to assistive technology, so a screen-reader user hears the provenance of each value.
- **FR-10.3 — Comparison rows.** Each proposed value MUST render as: the field's label; the submitted value (or "Not provided") badged "Specialist-entered" where one exists; the AI-suggested value badged "AI-suggested"; and the plain-language message(s) of the rules it addresses (from `addresses_rule_ids`). A proposal for a field that had no submitted value MUST be presented as an addition, not as a change.
- **FR-10.4 — Rationale presentation.** The rationale MUST be rendered in full, verbatim, as escaped plain text preserving paragraph breaks, under the sub-heading "Why the AI suggests this". It MUST NOT be truncated, summarised, collapsed behind a disclosure by default, or rendered as HTML/Markdown from the model.
- **FR-10.5 — Model metadata.** The model identifier, prompt version, and generation timestamp MUST be shown as a footnote to the recommendation section, so the reader can see which model produced the proposal and when (F9 FR-9.10).
- **FR-10.6 — Findings are the stated basis.** Findings MUST be rendered from the case's validation result in server order (F4 FR-4.8), verbatim, with no client re-wording, re-ordering, merging, or filtering, and with no severity, score, or ranking language (F4 FR-4.9).
- **FR-10.7 — Pending behaviour.** While `PENDING`, the screen MUST poll `GET /api/exceptions/{id}/recommendation` every 3 seconds for at most 60 seconds. Polling MUST NOT block navigation, MUST NOT disable the decision controls, and MUST stop on first terminal status, on stale timeout, or when the specialist leaves the screen. On reaching a terminal status the region MUST update in place and announce politely ("An AI recommendation is now available." / "No AI recommendation is available."). Focus MUST NOT be stolen by the update (NFR-10).
- **FR-10.8 — Degraded presentation is not an error.** An `UNAVAILABLE` recommendation MUST render with the `Degraded` component, not the `ErrorState` component: nothing failed from the specialist's point of view, and the copy MUST state plainly that the case is still decidable. The cause MUST be rendered from a mapped plain-language string per `failure_reason` (F9 FR-9.13) — for example `PROVIDER_TIMEOUT` → "The AI service did not respond in time." — and MUST NOT expose a raw provider error or a stack trace. No "Retry" or "Regenerate" control may be offered (F9 FR-9.14).
- **FR-10.9 — Decision controls always present when open.** For an `OPEN` case the decision region MUST render the F12 controls regardless of recommendation status, with the control set driven by `permitted_decisions` from the API (F7 FR-7.8). A pending or unavailable recommendation MUST NOT hide, disable, or defer the decision path (NFR-9, SM-13).
- **FR-10.10 — Heading structure and reading order.** The screen MUST have exactly one `<h1>` and `<h2>` headings in the normative order above (findings → entry → recommendation → decision → audit), with `<h3>` used only inside those sections. Visual layout MUST match DOM order so keyboard and screen-reader traversal follow the same sequence as the visual reading order. Sections MUST be navigable via a "On this page" set of in-page links placed after the header.
- **FR-10.11 — Closed-case presentation.** For `RESOLVED` or `REJECTED` cases the screen MUST render: the state as text in the header; the findings and submitted entry unchanged; the recommendation exactly as it stood (including `UNAVAILABLE`), still framed as a proposal; and the recorded decision read-only — decision type, deciding specialist, timestamp, reason (for edit and reject), and the resolution values each with their `AI`/`HUMAN` badge and the prior value where changed. The F12 controls MUST NOT be rendered at all (not merely disabled), and the screen MUST state "This case is closed. The decision below is final and cannot be changed."
- **FR-10.12 — No mutation of anything but the decision.** The screen MUST offer no control that edits the entry, edits or deletes a finding, edits the recommendation, reopens a closed case, deletes the case, or exports anything (PRD §10 #5). The only state-changing action reachable from this screen is the F12 decision.
- **FR-10.13 — Deep link and identifier tolerance.** The route MUST accept the case reference (`CE-YYYY-NNNNNN`); a URL bearing an exception uuid MUST resolve equivalently and canonicalise to the case-reference URL via replace-state, so links shared between specialists always work and the address bar always shows the human-readable reference.
- **FR-10.14 — No queue-position or aging language.** The screen MUST NOT display the numeric `receipt_position`, a place-in-queue indicator, a time-open duration, an age, or a due date. Receipt time is shown as an absolute datetime only (PRD §10 #2, #4).
- **FR-10.15 — Not-found and forbidden states.** A `404` MUST render "Case not found" inside the shell with a link to the queue, distinguishing the "this entry passed validation, so it has no exception" case (F7 FR-7.14). A `401` MUST redirect to sign-in (F1 FR-1.8).
- **FR-10.16 — Value escaping.** All model-generated text (`recommended_action`, `rationale`, `proposed_value`) and all specialist-entered text MUST be rendered as escaped text. Markup, scripts, and links in model output MUST NOT be interpreted.
- **FR-10.17 — Performance.** The screen MUST render within 2 seconds under demonstration load from a single `GET /api/exceptions/{idOrReference}` call; recommendation polling is additive and non-blocking (NFR-10).
- **FR-10.18 — Accessibility sign-off.** The screen MUST pass the F2 FR-2.26 checklist, including a screen-reader walkthrough that confirms every AI-suggested value is announced as AI-suggested and every specialist-entered value as specialist-entered, and a verification that provenance remains distinguishable with colour removed (SM-3, SM-10).

---

**Inputs:**
- `GET /api/exceptions/{idOrReference}` response (F7 FR-7.7): exception, entry with per-field origins, validation result with findings, recommendation with proposed values and metadata, decision when present, `permitted_decisions`
- `GET /api/exceptions/{id}/recommendation` polling response while `PENDING`
- Route parameter `caseReference`

**Outputs:**
- A fully rendered case: header, findings, submitted entry, recommendation (in one of four presentations), decision region (F12), audit trail region (F14)
- Provenance badges on every displayed value
- Polite announcements for load, recommendation arrival, and degraded outcome
- Navigation targets: back to queue, in-page section links, audit deep link

**Validation (presentation-level):**
- `permitted_decisions` MUST be treated as authoritative for which controls render; the client MUST NOT infer them from status fields, and the server re-checks on submission regardless (F11 FR-11.6).
- A recommendation with `status = 'AVAILABLE'` but a missing action or rationale MUST render the degraded presentation rather than an empty block, and log a client-side warning.
- A proposed value whose `field_name` does not match a known field MUST be rendered in a "Other suggested values" sub-list rather than dropped, so nothing the record contains is hidden from the reader.
- Timestamps MUST render as absolute local datetimes with month in words and a machine-readable `<time datetime>` value; relative phrasing MUST NOT be used (FR-10.14).

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Case load failure (5xx/network) | `ErrorState` "We could not load this case." + "Try again" | Error region | Assertive |
| Case not found (404) | "Case not found" screen + queue link | Screen `h1` | Polite |
| Entry passed validation (404 variant) | "That entry passed validation, so it has no exception." + queue link | Screen `h1` | Polite |
| Recommendation unavailable | `Degraded` block; decision controls unaffected | Not moved | Polite |
| Recommendation still pending at 60s | Stale-pending degraded copy; polling stops | Not moved | Polite |
| Recommendation poll failure | Degraded block with generic cause; polling stops | Not moved | Polite |
| Session expired | Redirect to sign-in | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `GET /api/exceptions/{idOrReference}` (F7) and `GET /api/exceptions/{id}/recommendation` (F9). Submits nothing itself; the decision request belongs to F12/F11. See `Y1-api.md` §3, §4.

**Schema Surface (this feature):** none directly; renders `exceptions`, `cargo_entries`, `cargo_entry_field_origins`, `validation_findings`, `recommendations`, `recommendation_values`, `decisions`, `decision_values`.

**Acceptance Criteria:**
1. An open case with an available recommendation shows the action, the full rationale, and one comparison row per proposed value, each badged "AI-suggested" with text and icon.
2. With CSS colour overridden to monochrome, AI-vs-specialist origin is still discoverable on every value; a screen reader announces it too.
3. The words "applied", "fixed", or "auto-resolved" appear nowhere on the screen.
4. With the provider stopped, the screen shows "No AI recommendation available" and the decision controls still work end to end.
5. A `PENDING` recommendation appears within 3 seconds of becoming available without the specialist reloading, and without focus moving.
6. Heading order is `h1` → the five `h2`s in the normative order, with no skipped level.
7. A closed case renders no decision controls in the DOM and states that the decision is final.
8. `/cases/{uuid}` canonicalises to `/cases/CE-YYYY-NNNNNN` in the address bar.
9. No control on the screen edits the entry, the findings, or the recommendation, and no export control exists.

---
## F11: Human Decision Processing — Edit / Approve / Reject (API)

**Priority:** P0 · **Surface:** Programmatic API · **Dependencies:** F0, F1, F9, F13 · **PRD trace:** §5.5 F11, §4.3 #1, NFR-4, NFR-5, NFR-6, SM-3, SM-4, SM-5, R-1, R-5, R-11

**Description:** F11 is the server-side enforcement of the accountable human decision. An exception's state changes only through this capability, and only when the request carries an explicit decision from an authenticated specialist: **approve** the recommendation as proposed, **edit** it and approve the modified resolution, or **reject** it. Edits and rejections require a non-empty reason, stored as part of the decision so the record explains itself. Values the specialist changed are recorded with `HUMAN` origin while untouched approved values retain `AI` origin, which is what makes "what did the human change" answerable per value. There is no auto-apply path, and no scheduled or system actor that can resolve a case.

### Why no recommendation can auto-apply — the structural argument

This is the product's central guarantee, and it is structural rather than procedural. Four independent facts combine:

1. **A recommendation is a different record from a resolution.** Proposals live in `recommendations`/`recommendation_values`; resolutions live in `decisions`/`decision_values` (F9 FR-9.1). No column is shared, and no view or job copies one into the other.
2. **Only a decision closes an exception.** `exceptions.state` is written by exactly one code path — this handler — and the deferred constraint trigger of F0 FR-0.9 refuses any commit that moves an exception out of `OPEN` without a `decisions` row whose `resulting_state` matches.
3. **A decision requires a human identity.** `decisions.decided_by` is `NOT NULL REFERENCES specialists(id)`, populated solely from the authenticated request principal (F1 FR-1.6), never from the request body. The AI has no `specialists` row, so an AI-authored decision fails a foreign key.
4. **There is no non-request actor.** No scheduled job, worker, queue consumer, retry path, database trigger, or migration writes `decisions` or `exceptions.state`. The generation job (F9) has no access to the decision service.

Therefore "the AI resolved it" is not a reachable state, and the absence of an auto-apply path is verified by test rather than asserted (NFR-5, SM-4).

**Terminology (feature-specific):**
- **Decision type:** `APPROVE`, `EDIT_APPROVE`, or `REJECT`. Closed set; no other value is accepted.
- **Resolution values:** the accepted corrected field values recorded on `decision_values`, each with an origin and the prior value. They are the resolution; the entry of record is never overwritten (F3 FR-3.6).
- **Re-stamping:** the act of assigning `HUMAN` origin to a value the specialist changed from the AI's proposal, while values left identical retain `AI`.
- **Direct resolution:** an `EDIT_APPROVE` on a case with no available recommendation, where every resolution value is specialist-authored and therefore `HUMAN`.
- **Decision conflict:** an attempt to decide a case that already has a decision.

---

### Process — Decision

1. Middleware authenticates and verifies CSRF (F1). Unauthenticated ⇒ `401`, no state change, no audit entry.
2. Handler validates the request body shape and the decision-type-specific rules (see Validation). Any failure ⇒ `4xx`, **nothing written, no audit entry**.
3. If an `Idempotency-Key` header is present and a decision already exists for this exception with the same key, the handler returns the original `201` body with `idempotent_replay: true` and writes nothing (FR-11.11).
4. Transaction `BEGIN`.
5. `SELECT ... FROM exceptions WHERE id = :id FOR UPDATE` — serialises concurrent decisions on one case.
6. If `state <> 'OPEN'` ⇒ rollback, `409 EXCEPTION_ALREADY_DECIDED` with the existing decision's type, actor, and timestamp.
7. Load the recommendation. For `APPROVE`, require `status = 'AVAILABLE'`; otherwise ⇒ rollback, `409 RECOMMENDATION_NOT_AVAILABLE`.
8. Take the case-anchor row lock used for audit sequencing (F13).
9. Compute the resolution value set and each value's origin (FR-11.7, FR-11.8).
10. Insert `decisions`: `exception_id`, `decision_type`, `decided_by = principal.id`, `decided_at = now()`, `reason`, `recommendation_id` (null for a direct resolution), `resulting_state`.
11. Insert one `decision_values` row per resolution value: `field_name`, `value`, `origin`, `prior_value`, `prior_origin`, `changed_from_proposal` (boolean).
12. Update `exceptions`: `state = resulting_state`, `closed_at = now()`, `decision_id`.
13. Write exactly one audit entry via F13 — `RECOMMENDATION_APPROVED`, `RECOMMENDATION_EDITED_AND_APPROVED`, or `RECOMMENDATION_REJECTED` — with `actor_type = 'SPECIALIST'`, the actor id, `before_state = 'OPEN'`, `after_state = resulting_state`, the reason, and one `audit_entry_values` row per resolution value carrying before/after values and before/after origins.
14. `COMMIT`. F0's deferred triggers verify at this point that the state change has a matching human decision (`HITL_VIOLATION` otherwise) and exactly one audit entry (`AUDIT_COUPLING_VIOLATION` otherwise).
15. Return `201` with the recorded decision, the new exception state, and the resolution values with their origins.

---

### Functional Requirements

- **FR-11.1 — Decisions are the only writer of resolution and state.** This handler MUST be the only code path that inserts `decisions`/`decision_values` and the only one that writes `exceptions.state`, `closed_at`, and `decision_id`.
- **FR-11.2 — Explicit decision required.** The request MUST carry an explicit `decision_type`. There MUST be no default, no inferred decision, no "accept all", no empty-body semantics, and no endpoint that resolves a case without naming the decision.
- **FR-11.3 — Approve.** `APPROVE` adopts the recommendation exactly as proposed. Resolution values MUST be copied from `recommendation_values` server-side; the client MUST NOT supply values with an approval (a body containing `resolution_values` with `APPROVE` ⇒ `422 RESOLUTION_VALUES_NOT_ALLOWED`). Every resolution value retains `origin = 'AI'`, because the human adopted the machine's value unchanged — the human's contribution is the *decision*, recorded on `decisions.decided_by`, not an authorship claim over the values.
- **FR-11.4 — Edit-and-approve.** `EDIT_APPROVE` adopts a specialist-modified resolution. The body MUST contain `resolution_values` and a `reason`. Changed values are re-stamped `HUMAN`; values identical to the proposal retain `AI` (FR-11.8).
- **FR-11.5 — Reject.** `REJECT` closes the case without adopting the recommendation. The body MUST contain a `reason` and MUST NOT contain `resolution_values` (⇒ `422 RESOLUTION_VALUES_NOT_ALLOWED`). No `decision_values` rows are written, because nothing was adopted; the audit entry records the rejection with its reason and the values that were declined as `before_value` detail.
- **FR-11.6 — Permitted decisions by recommendation status.** With an `AVAILABLE` recommendation: `APPROVE`, `EDIT_APPROVE`, `REJECT`. With `PENDING` or `UNAVAILABLE`: `EDIT_APPROVE` (direct resolution) and `REJECT` only — there is nothing to approve, so `APPROVE` ⇒ `409 RECOMMENDATION_NOT_AVAILABLE`. This guarantees loop completability in degraded mode (NFR-9, SM-13) without ever letting an absent recommendation be "approved".
- **FR-11.7 — Resolution value set completeness.** For `EDIT_APPROVE` **with** a recommendation, `resolution_values` MUST contain exactly the `field_name` set of the recommendation's proposed values — no additions, no omissions (⇒ `422 RESOLUTION_VALUES_INCOMPLETE`, naming missing and unexpected fields). Requiring the full set removes all ambiguity about whether an omitted field was left unchanged or deliberately dropped, so per-value provenance is never inferred. For a **direct resolution** (no available recommendation), `resolution_values` MUST contain at least one field, and every `field_name` MUST be a member of the F3 entry field set.
- **FR-11.8 — Provenance computation (normative).** For each supplied resolution value, the server compares the submitted value with the AI's proposed value for the same field using canonical string comparison (trim leading/trailing whitespace; compare byte-for-byte thereafter; a null/absent proposal is unequal to any non-empty value):
  - equal ⇒ `origin = 'AI'`, `changed_from_proposal = false`
  - not equal ⇒ `origin = 'HUMAN'`, `changed_from_proposal = true`
  - no proposal exists for that field (direct resolution, or a field the AI did not propose) ⇒ `origin = 'HUMAN'`, `changed_from_proposal = true`
  
  `prior_value` MUST be set to the AI's proposed value where one exists, otherwise to the entry's submitted value, otherwise null; `prior_origin` MUST be `'AI'`, `'HUMAN'`, or null correspondingly. Origin MUST NOT be accepted from the client under any circumstance — a body containing an `origin` property is rejected as an unknown field (FR-11.15). Zero unattributed values may exist (SM-3).
- **FR-11.9 — Mandatory reason on edit and reject.** `reason` MUST be present, and after trimming MUST be ≥ 10 and ≤ 2000 characters, for `EDIT_APPROVE` and `REJECT`. Absent, empty, whitespace-only, or shorter than 10 characters ⇒ `422 REASON_REQUIRED` (with a distinct detail for too-short). The minimum length is a deliberate, testable guard against a single-character formality (R-8). `APPROVE` MAY carry a reason (stored if present, same length bounds); it is not required, because approving the proposal as-is adds no divergence to explain. The same rule is enforced independently at the database (F0 FR-0.15), so an API bypass cannot record a reasonless edit or rejection.
- **FR-11.10 — One decision per case, ever.** `UNIQUE (exception_id)` on `decisions` plus the `FOR UPDATE` lock make double and concurrent decisions impossible. A second attempt ⇒ `409 EXCEPTION_ALREADY_DECIDED`, including the existing decision's type, deciding specialist display name, and timestamp so the UI can explain what happened (R-11). No reopen, amend, undo, correct, or supersede operation exists — the append-only record means a mistaken decision is addressed by a new case, not by rewriting history.
- **FR-11.11 — Idempotency.** The endpoint SHOULD accept an `Idempotency-Key` header (≤ 128 chars). Persisted on `decisions.idempotency_key` with `UNIQUE (exception_id, idempotency_key)`, a replay with the same key and the same exception returns the original `201` body with `idempotent_replay: true` and writes nothing — no second decision, no second audit entry. A replay with the same key but a *different* body ⇒ `409 IDEMPOTENCY_KEY_REUSED`. Requests without the header are processed normally, with FR-11.10 as the backstop.
- **FR-11.12 — Transactional coupling.** The decision insert, the value inserts, the exception update, and the audit entry MUST commit together or not at all (NFR-6). A failure at any step leaves the case `OPEN` with no decision and no audit entry.
- **FR-11.13 — Exactly one audit entry.** Exactly one audit entry MUST be written per decision, with the action matching the decision type. A decision with zero or two entries MUST be impossible (F0 FR-0.10d, SM-6).
- **FR-11.14 — Actor from session only.** `decided_by` MUST come from the authenticated principal. The endpoint MUST reject any body property naming an actor (`decided_by`, `actor`, `on_behalf_of`, `specialist_id`) as an unknown field. No impersonation or delegation mechanism exists — there is one role and no supervisor (F1 FR-1.1).
- **FR-11.15 — Unknown fields rejected.** Any property outside `{decision_type, reason, resolution_values, recommendation_id}` ⇒ `422 REQUEST_MALFORMED`. In `resolution_values` items, any property outside `{field_name, value}` is likewise rejected — which is what blocks a client-supplied `origin`.
- **FR-11.16 — Recommendation reference consistency.** If the body supplies `recommendation_id`, it MUST equal the case's current recommendation id; a mismatch ⇒ `409 RECOMMENDATION_MISMATCH`. This lets the client assert "I decided on the proposal I was shown" and makes a stale-tab approval detectable rather than silent.
- **FR-11.17 — Value length limits.** Each `value` MUST respect the F3 structural limit for its field; a longer value ⇒ `422 REQUEST_MALFORMED`. Values are stored as supplied after trimming leading/trailing whitespace only, so the record shows what the specialist typed.
- **FR-11.18 — Entry of record untouched.** The handler MUST NOT write `cargo_entries` or `cargo_entry_field_origins`. The resolution is the corrected set; the submitted entry remains exactly as received, which is what allows the audit trail to show before and after (F3 FR-3.6).
- **FR-11.19 — Findings untouched.** The handler MUST NOT modify, close, resolve, annotate, or delete `validation_findings`. The stated basis of the exception survives the decision unchanged (F5 FR-5.5).
- **FR-11.20 — No bulk decision.** The endpoint MUST accept exactly one decision for exactly one exception. There MUST be no batch, multi-case, or "approve all" endpoint or parameter — a bulk approval is precisely the rubber-stamping the human-in-the-loop requirement exists to prevent (R-1).
- **FR-11.21 — Response content.** The `201` response MUST return the recorded decision (id, type, `decided_at`, deciding specialist id and display name, reason), the resulting exception state, the resolution values with per-value `origin`, `prior_value`, and `changed_from_proposal`, the `audit_entry_id` written, and `idempotent_replay`. The client therefore confirms what was recorded from the server's record, not from its own optimistic assumption (F12 FR-12.10).

---

**Inputs:**

`POST /api/exceptions/{exceptionId}/decision`

| Field | Type | Required | Notes |
|---|---|---|---|
| `decision_type` | enum `APPROVE` \| `EDIT_APPROVE` \| `REJECT` | yes | Closed set; no default |
| `reason` | string | for `EDIT_APPROVE`, `REJECT` | 10–2000 chars after trim; optional on `APPROVE` |
| `resolution_values` | array of `{ field_name, value }` | for `EDIT_APPROVE` | Prohibited for `APPROVE` and `REJECT` |
| `recommendation_id` | uuid | no | If supplied, must match the case's recommendation |

Headers: `cargoexec_sid` cookie (required), `X-CSRF-Token` (required), `Idempotency-Key` (optional). Path: `exceptionId` (uuid or case reference).

**Outputs:**
- `201` with the recorded decision, resulting state, per-value provenance, and `audit_entry_id`
- Persisted `decisions` row and `decision_values` rows (none for `REJECT`)
- Updated `exceptions` row in a terminal state
- Exactly one audit entry with one value row per resolution value
- No other write of any kind

**Validation:**
- `decision_type` present and within the closed set ⇒ else `422 REQUEST_MALFORMED`.
- `reason` present and 10–2000 chars after trim for `EDIT_APPROVE`/`REJECT` ⇒ else `422 REASON_REQUIRED`.
- `resolution_values` present and non-empty for `EDIT_APPROVE`; absent for `APPROVE` and `REJECT` ⇒ else `422 RESOLUTION_VALUES_NOT_ALLOWED`.
- With a recommendation: `resolution_values` field set exactly equals the proposal's field set ⇒ else `422 RESOLUTION_VALUES_INCOMPLETE`.
- Every `field_name` is a member of the F3 entry field set; no duplicates ⇒ else `422 REQUEST_MALFORMED`.
- Every `value` within its field's structural limit ⇒ else `422 REQUEST_MALFORMED`.
- Exception exists ⇒ else `404 EXCEPTION_NOT_FOUND`; is `OPEN` ⇒ else `409 EXCEPTION_ALREADY_DECIDED`.
- For `APPROVE`: recommendation `AVAILABLE` ⇒ else `409 RECOMMENDATION_NOT_AVAILABLE`.
- `recommendation_id`, if supplied, matches ⇒ else `409 RECOMMENDATION_MISMATCH`.
- No unknown property anywhere in the body ⇒ else `422 REQUEST_MALFORMED`.

**Error States:**

| Scenario | HTTP | Error code | Message |
|---|---|---|---|
| No session | 401 | `UNAUTHENTICATED` | "Sign in to continue." |
| Missing/invalid CSRF token | 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." |
| Case not found | 404 | `EXCEPTION_NOT_FOUND` | "That case could not be found." |
| Case already decided | 409 | `EXCEPTION_ALREADY_DECIDED` | "This case was already {resolved/rejected} by {name} on {date}." |
| Approve with no available recommendation | 409 | `RECOMMENDATION_NOT_AVAILABLE` | "There is no AI recommendation to approve. Edit and approve, or reject." |
| Stale recommendation reference | 409 | `RECOMMENDATION_MISMATCH` | "The recommendation changed. Reload the case and review it again." |
| Idempotency key reused with a different body | 409 | `IDEMPOTENCY_KEY_REUSED` | "That request identifier was already used for a different decision." |
| Missing or too-short reason | 422 | `REASON_REQUIRED` | "Enter a reason of at least 10 characters for this {edit/rejection}." |
| Values sent with approve or reject | 422 | `RESOLUTION_VALUES_NOT_ALLOWED` | "Resolution values cannot be sent with this decision." |
| Value set incomplete or unexpected | 422 | `RESOLUTION_VALUES_INCOMPLETE` | "Include every recommended field. Missing: {list}." |
| Unknown field / wrong type / too long | 422 | `REQUEST_MALFORMED` | "The request could not be read." |
| Audit or coupling failure at commit | 500 | `DECISION_FAILED` | "The decision could not be recorded. Nothing was saved. Try again." |

**API Surface (this feature):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/exceptions/{exceptionId}/decision` | session + CSRF | Record the one human decision that closes the case |

No `PUT`, `PATCH`, or `DELETE` on decisions exists. Full schemas in `Y1-api.md` §4 Decisions.

**Schema Surface (this feature):** writes `decisions` (exception_id UNIQUE, decision_type, decided_by NOT NULL → specialists, decided_at, reason, recommendation_id, resulting_state, idempotency_key) and `decision_values` (decision_id, field_name, value, origin, prior_value, prior_origin, changed_from_proposal); updates `exceptions.state/closed_at/decision_id`; writes `audit_entries`/`audit_entry_values` via F13. See `Y0-schema.md` §6 Decisions.

**Acceptance Criteria:**
1. `APPROVE` on an available recommendation resolves the case with every resolution value `origin = 'AI'` and exactly one `RECOMMENDATION_APPROVED` audit entry.
2. `EDIT_APPROVE` changing one of three proposed values records that value `HUMAN` and the other two `AI`, with `prior_value` populated on all three.
3. `EDIT_APPROVE` or `REJECT` with `reason: ""`, `"   "`, `"ok"`, or the field absent returns `422 REASON_REQUIRED`, leaves the case `OPEN`, and writes no audit entry.
4. Two concurrent decisions on one case yield exactly one `201` and one `409`; the database contains one decision and one audit entry.
5. `APPROVE` on an `UNAVAILABLE` recommendation returns `409`; `EDIT_APPROVE` on the same case succeeds with all values `HUMAN` and resolves it (SM-13).
6. A body containing `origin`, `decided_by`, or `applied: true` is rejected as malformed.
7. Direct SQL setting `exceptions.state = 'RESOLVED'` without a decision fails at commit (`HITL_VIOLATION`).
8. A repository-wide search finds exactly one code path writing `exceptions.state`, and no scheduler, worker, or job references the decision service (SM-4).
9. After any decision, `cargo_entries` and `validation_findings` for that case are byte-identical to before.
10. Replaying a request with the same `Idempotency-Key` returns the original decision with `idempotent_replay: true` and creates no second audit entry.

---
## F12: Decision Web UI — Edit, Approve, Reject with Reason Capture

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F10, F11 · **PRD trace:** §5.5 F12, §11.1, NFR-2, NFR-5, SM-5, SM-11, R-1, R-8

**Description:** F12 is the region of the case detail screen through which the specialist takes the decision: approve, edit, or reject, presented as three deliberate and equally available actions with no pre-selected default that would nudge the human toward rubber-stamping the AI. Choosing edit opens the recommended values in an editable USWDS form with a required reason field; choosing reject requires a reason before the action can complete. The region shows what will be recorded before it is recorded, and confirms afterwards what was recorded, including which values the specialist changed.

**Terminology (feature-specific):**
- **Decision region:** the "Your decision" section of `/cases/{caseReference}` (F10 section 5).
- **Action chooser:** the three-button group (Approve / Edit and approve / Reject) presented when the case is open.
- **Edit form:** the USWDS form pre-populated with the AI-proposed values, plus the required reason field.
- **Reject form:** the reason-capture form shown after choosing Reject.
- **Pre-submission summary:** the "This is what will be recorded" panel shown before the decision is sent.
- **Confirmation:** the post-decision panel rendered from the server's `201` response.
- **Modified marker:** the visual + programmatic indication that a field's value now differs from the AI's proposal.

**Sub-features:**
- Approve, Edit, and Reject presented without a default or pre-selection
- Editable resolution form pre-populated with AI-proposed values, changed fields visibly marked
- Required reason input for edit and reject, with accessible required marking and error messaging
- Pre-submission summary and post-decision confirmation
- Controls absent on closed cases, with the recorded decision shown read-only
- Full keyboard operability with announced outcomes
- Server-side reason rejection surfaced as an inline, focus-managed error

---

### Presentation states

| Case / recommendation state | What renders |
|---|---|
| Open, recommendation `AVAILABLE` | Action chooser with all three actions |
| Open, recommendation `PENDING` or `UNAVAILABLE` | Action chooser with "Edit and approve" (labelled "Resolve directly") and "Reject"; Approve absent with the note "There is no AI recommendation to approve." |
| Edit chosen | Edit form (values + reason) + Cancel |
| Reject chosen | Reject form (reason) + Cancel |
| Any action confirmed | Pre-submission summary + "Record decision" + "Back" |
| Decision recorded | Confirmation panel |
| Closed case | No controls in the DOM; read-only recorded decision (F10 FR-10.11) |

---

### Process — Approve

1. Specialist activates "Approve".
2. The region renders the pre-submission summary: the decision type in words ("Approve the AI-recommended resolution"), every value that will be recorded with its "AI-suggested" badge, and the sentence "All values will be recorded as AI-suggested, and this decision will be recorded against your name."
3. An optional reason field is offered, labelled "Reason (optional)".
4. Specialist activates "Record decision". `POST /api/exceptions/{id}/decision` with `decision_type: "APPROVE"`, the optional reason, `recommendation_id`, and an `Idempotency-Key` generated when the summary was rendered.
5. On `201`, the confirmation panel renders from the response.

### Process — Edit and approve

1. Specialist activates "Edit and approve".
2. The edit form renders one input per proposed field, pre-populated with the AI-proposed value, each labelled with the field name and carrying its current provenance badge ("AI-suggested" until changed). For a **direct resolution** (no available recommendation) the form instead renders one input per field named by the validation findings, pre-populated with the submitted entry value (or empty), badged "Specialist-entered".
3. As the specialist changes a value, the field's badge changes to "Specialist-modified" and a "Changed" marker appears (text + icon, not colour alone). Reverting to the exact proposed value restores the "AI-suggested" badge. The marker is announced politely at most once per field per change, and the running count of changed fields is announced ("2 fields changed").
4. The required "Reason for your changes" textarea renders with the USWDS required indicator, hint "At least 10 characters. Explain why you changed the recommendation.", and a character counter.
5. Activating "Continue" applies client-side checks (FR-12.9) and renders the pre-submission summary: each field as *AI suggested X → you are recording Y*, with unchanged fields shown as retaining AI origin, plus the reason text as it will be stored.
6. Activating "Record decision" posts `decision_type: "EDIT_APPROVE"`, `reason`, and the **complete** `resolution_values` set (every field shown in the form — F11 FR-11.7).
7. On `201`, the confirmation panel renders from the response.

### Process — Reject

1. Specialist activates "Reject".
2. The reject form renders the required "Reason for rejecting" textarea (same pattern, hint "At least 10 characters. Explain why the recommendation is not being adopted.") and a plain statement: "Rejecting closes this case without adopting the recommendation. No resolution values will be recorded."
3. "Continue" → pre-submission summary showing the decision type, the reason, and the declined values for the record.
4. "Record decision" posts `decision_type: "REJECT"` with the reason only.
5. On `201`, the confirmation panel renders from the response.

---

### Functional Requirements

- **FR-12.1 — No default, no pre-selection, no emphasis asymmetry.** The three actions MUST be presented as three separate activatable controls with no radio pre-selected, no focus pre-placed on any one of them, no `autofocus`, and no styling that makes one the obvious path — specifically, "Approve" MUST NOT be the only primary-styled button while the others are de-emphasised links. Tab order MUST be Approve → Edit and approve → Reject, matching DOM order, and no keyboard shortcut may exist for any action (R-1).
- **FR-12.2 — Two-step commitment.** Every decision MUST pass through the pre-submission summary before it is sent. No single activation may both choose and record a decision, so approval is a deliberate act rather than one click on the screen the specialist was already reading.
- **FR-12.3 — Control set from the server.** Which actions render MUST be driven by `permitted_decisions` from the case response (F7 FR-7.8). When `APPROVE` is not permitted, the control MUST be absent from the DOM (not rendered disabled) and the reason stated in text.
- **FR-12.4 — Reason required on edit and reject.** Both forms MUST mark the reason required with the USWDS indicator, enforce a minimum of 10 characters after trim client-side, and render an inline error plus error summary when it is missing or too short. The specialist MUST NOT be able to reach the pre-submission summary without a satisfying reason. Approve's reason field MUST be explicitly labelled optional.
- **FR-12.5 — Reason is free text, never a canned list.** The reason MUST be a free-text `<textarea>`. There MUST be no dropdown of pre-written reasons, no "quick reason" chips, no default text, and no placeholder that could be submitted as-is — canned reasons produce a record that does not actually explain the decision (R-8).
- **FR-12.6 — Changed-field marking.** A field whose value differs from the AI proposal MUST be marked as specialist-modified with text and icon, conveyed to assistive technology, never by colour alone (F2 FR-2.17/FR-2.20). The marking MUST be derived by comparing against the proposed value using the same trim-then-compare rule the server applies (F11 FR-11.8), so the client's preview of provenance always matches the server's record.
- **FR-12.7 — Complete value set submitted.** For `EDIT_APPROVE` the client MUST submit every field rendered in the edit form, changed or not, as `{field_name, value}` pairs. It MUST NOT submit an origin, a changed flag, a diff, or a partial set — provenance is computed server-side and only server-side (F11 FR-11.8, FR-11.15).
- **FR-12.8 — Pre-submission summary content.** The summary MUST state, in words: the decision type; for each value, the AI-suggested value and the value being recorded, with which origin each will carry; the reason text exactly as it will be stored; and that the decision is recorded permanently against the specialist's name and cannot be changed afterwards. It MUST offer "Back" to return to the form with all input preserved.
- **FR-12.9 — Client checks never substitute for the server.** Client-side reason checking is a convenience. The screen MUST correctly handle a `422 REASON_REQUIRED`, `422 RESOLUTION_VALUES_INCOMPLETE`, or any other `4xx` for input the client considered valid, by rendering the server's message in the error summary and inline on the field, moving focus to the summary, and preserving every entered value (F2 FR-2.12).
- **FR-12.10 — Confirmation is rendered from the server response.** The confirmation panel MUST be built from the `201` body — never from the client's optimistic assumption. It MUST show: `<h3>` "Decision recorded"; the decision type in words; the deciding specialist and timestamp as returned; the reason; each recorded value with its server-assigned `AI` / `HUMAN` badge and the prior value where it changed; the new case state; and links "View the audit trail for this case" (to `#audit-trail`) and "Back to review queue". Focus MUST move to the confirmation heading and the outcome MUST be announced politely.
- **FR-12.11 — Controls disappear after a decision.** Once recorded, the action chooser and all forms MUST be removed from the DOM and the region MUST show the recorded decision read-only, with the statement that the case is closed and the decision final (F10 FR-10.11). Disabled-but-present controls MUST NOT be used, because a disabled control implies a capability that does not exist.
- **FR-12.12 — Already-decided handling.** A `409 EXCEPTION_ALREADY_DECIDED` (another tab, another specialist, a stale screen) MUST render an informational alert — "This case was already {resolved/rejected} by {name} on {date}." — remove the controls, refresh the case from the server, and announce the change assertively. It MUST NOT be presented as the specialist's error.
- **FR-12.13 — Stale recommendation handling.** A `409 RECOMMENDATION_MISMATCH` MUST prompt a reload of the case with the message "The recommendation changed. Review it again before deciding." and MUST discard the stale pre-submission summary rather than re-posting it.
- **FR-12.14 — Double-submission prevention.** "Record decision" MUST be disabled with a busy state while in flight, and the client MUST send the `Idempotency-Key` generated when the summary was rendered, so a retry after an ambiguous network failure cannot produce a second decision (F11 FR-11.11). The client MUST NOT auto-retry; on an unknown outcome it MUST tell the specialist to reload the case to see whether the decision was recorded.
- **FR-12.15 — Cancel is lossless and non-mutating.** "Cancel" from any form MUST return to the action chooser without sending a request and without recording anything. If the specialist typed a reason or changed a value, cancelling MUST ask for confirmation before discarding it.
- **FR-12.16 — No bulk or shortcut decision.** The region MUST offer no "approve all", no "apply and next", no "decide and open next case" control, and no way to act on more than the case being read (F11 FR-11.20, PRD §10 #4).
- **FR-12.17 — Keyboard completeness.** The entire decision path — choose an action, edit values, enter a reason, review the summary, record, read the confirmation — MUST be completable using the keyboard alone, with visible focus at every step and every outcome announced (SM-11).
- **FR-12.18 — Accessibility sign-off.** The region MUST pass the F2 FR-2.26 checklist as part of the case detail screen, including a screen-reader walkthrough of an edit-and-approve with a reason and of a missing-reason error recovery (SM-10).

---

**Inputs:**
- From the case response: `permitted_decisions`, recommendation proposed values, entry values, findings, current state
- From the specialist: chosen action, edited values, reason text, "Continue", "Record decision", "Back", "Cancel"

**Outputs:**
- `POST /api/exceptions/{id}/decision` with `decision_type`, `reason` (where required), complete `resolution_values` (edit only), `recommendation_id`, and `Idempotency-Key`
- Rendered pre-submission summary and server-derived confirmation
- Announcements for changed-field count, validation errors, and the recorded outcome
- Navigation to the audit trail region and back to the queue

**Validation (client-side, advisory; server is authoritative):**
- `reason` required, ≥ 10 chars after trim, ≤ 2000 chars for edit and reject; blocked at "Continue" with an inline error and focus movement.
- Every rendered field MUST be included in the submitted value set; the client MUST refuse to construct a partial payload.
- Each value MUST respect the F3 structural length limit, with a character counter on the longer fields.
- The client MUST NOT block a decision for any other reason; in particular, it MUST NOT require that at least one value be changed before allowing `EDIT_APPROVE` — that determination is the server's (a no-change edit is simply an edit that changed nothing, which the server records with all values retaining `AI` origin and the reason explaining the specialist's intent).

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Missing/short reason (client) | Inline error + error summary | Error summary | Assertive |
| Missing/short reason (server 422) | Server message inline + summary; input preserved | Error summary | Assertive |
| Incomplete value set (422) | Error summary naming missing fields | Error summary | Assertive |
| Already decided (409) | Informational alert; controls removed; case refreshed | Alert | Assertive |
| Stale recommendation (409) | Alert prompting review; summary discarded | Alert | Assertive |
| Approve not permitted (409) | Alert explaining no recommendation to approve; chooser re-rendered | Alert | Assertive |
| Decision failed (500) | Error summary "Nothing was saved. Try again." | Error summary | Assertive |
| Network failure / unknown outcome | Alert advising reload to check whether it was recorded | Alert | Assertive |
| Session expired (401) | Redirect to sign-in; input discarded with explanation | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `POST /api/exceptions/{exceptionId}/decision` (F11) and re-reads `GET /api/exceptions/{idOrReference}` (F7) after conflicts. See `Y1-api.md` §4.

**Schema Surface (this feature):** none directly; renders `recommendation_values`, `decisions`, and `decision_values` as returned by the API.

**Acceptance Criteria:**
1. On an open case with a recommendation, three controls render with no pre-selection, no autofocus, and equal visual weight.
2. Attempting "Continue" on the edit form with an empty reason shows an inline error, moves focus to the error summary, and sends no request.
3. A two-character reason is refused client-side and, when forced past the client, refused by the server with `422 REASON_REQUIRED`.
4. Changing one of three values marks that field "Specialist-modified", and the confirmation shows it `HUMAN` with the other two `AI`.
5. The confirmation panel's values and origins come from the server response and match the audit trail exactly.
6. After recording, no decision control exists in the DOM and the case states it is closed and final.
7. Deciding the same case in a second tab produces the already-decided alert, not a duplicate decision.
8. The entire edit-and-approve path is completable by keyboard alone with each step announced.
9. No "approve all", "apply and next", or canned-reason control exists anywhere in the region.

---
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
## F14: Per-Case Audit Trail Web UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F10, F13 · **PRD trace:** §5.6 F14, §11.1, NFR-2, NFR-4, NFR-7, SM-2, SM-3, SM-11

**Description:** F14 is the screen — presented within the case — where the specialist reads the complete history of a case in chronological order and gets a direct answer to "who decided this, what did the AI say, and what did the human change" without leaving the application. Each event shows its actor, action, timestamp, before and after values, the reason where one was captured, and an unmistakable AI-versus-human origin marker. It is read-only by construction: the UI exposes no editing, correcting, or deleting affordance, and no export. The trail is answered in place, which is the point.

**Terminology (feature-specific):**
- **Trail:** the ordered list of audit entries for one case, ascending by `case_sequence`.
- **Event:** one audit entry rendered as one item in the trail.
- **Value change row:** one `audit_entry_values` record rendered as *before → after* with origin badges on each side.
- **Integrity statement:** the rendering of `chain_verified` from the audit read.
- **In-place answer:** the design property that oversight questions are answered on this screen without export, query tooling, or a second system (NFR-7).

**Sub-features:**
- Chronological per-case event list with actor, action, timestamp, before/after values
- AI-versus-human origin shown per event and per changed value, beyond colour alone
- Reason text displayed for edits and rejections
- Read-only presentation with no edit, correct, or delete affordance anywhere
- Accessible list semantics and reading order for screen-reader traversal
- Reachable from case detail for both open and closed cases

---

### Presentation: Audit trail region — within `/cases/{caseReference}`, anchor `#audit-trail`, deep link `/cases/{caseReference}/audit`

**Structure:**

1. `<h2>` "Audit trail" with the sentence "Every state change on this case, oldest first. This record cannot be edited or deleted."
2. Integrity statement (FR-14.10).
3. An ordered list (`<ol>`) of events. Each event is an `<li>` containing:
   - `<h3>` with the action in plain language (see the action label table)
   - A definition list: **Who** (actor), **When** (absolute local datetime with `<time datetime>`), **What changed** (state before → after, in words)
   - The reason block, when a reason was captured
   - The value change table, when value rows exist
   - The sequence number as supplementary small text ("Event 4 of 7")

**Action labels (plain language, normative):**

| Action | Label | Actor rendering |
|---|---|---|
| `ENTRY_RECEIVED` | "Cargo entry received" | "{display name} (specialist)" |
| `VALIDATION_COMPLETED` | "Validated against required-information rules" | "System, during {display name}'s submission" |
| `EXCEPTION_OPENED` | "Exception opened" | "System, during {display name}'s submission" |
| `RECOMMENDATION_GENERATED` | "AI recommendation generated" | "AI ({model_id})" |
| `RECOMMENDATION_UNAVAILABLE` | "No AI recommendation available" | "AI ({model_id or 'not reached'})" |
| `RECOMMENDATION_APPROVED` | "Recommendation approved by specialist" | "{display name} (specialist)" |
| `RECOMMENDATION_EDITED_AND_APPROVED` | "Recommendation edited and approved by specialist" | "{display name} (specialist)" |
| `RECOMMENDATION_REJECTED` | "Recommendation rejected by specialist" | "{display name} (specialist)" |

**Value change table** (per event, USWDS table, four columns): Field · Before · After · Origin of the recorded value. Both the Before and After cells carry the provenance badge for their own side; the Origin column states the after-value origin in words ("AI-suggested" / "Specialist-entered").

---

### Functional Requirements

- **FR-14.1 — Chronological order, server order.** Events MUST render in ascending `case_sequence` exactly as returned, oldest first. The client MUST NOT re-order, reverse, group, collapse by type, or paginate the trail. Every event for the case MUST be rendered — no truncation, no "show more" that hides events by default.
- **FR-14.2 — Complete event content.** Each event MUST show actor, action, timestamp, before state, after state, reason (where captured), and every value row. No field of an audit entry that the API returns may be omitted from the rendering.
- **FR-14.3 — Provenance per event and per value.** The actor line MUST make AI-versus-human unmistakable, and each value in a change row MUST carry the F2 provenance badge for its own origin. Provenance MUST be conveyed by text and icon as well as colour, and MUST be exposed to assistive technology (NFR-2, NFR-4, SM-3).
- **FR-14.4 — The AI is never rendered as a person.** An `AI`-actor event MUST be labelled "AI" with the model identifier, never with a person-like name, avatar, or pronoun, so the reader can never mistake a machine proposal for a human action.
- **FR-14.5 — Reason displayed verbatim.** For edited and rejected decisions the reason MUST be rendered in full, escaped, preserving line breaks, under the label "Reason given". It MUST NOT be truncated, summarised, or collapsed behind a disclosure by default (SM-5, R-8).
- **FR-14.6 — Before/after completeness.** A value row MUST render both sides. "Not provided" MUST be shown where a side is null — an empty cell MUST NOT be used, because an empty cell is ambiguous between "no value" and "not rendered". A rejection's `after_value = NULL` MUST render as "Not recorded (rejected)".
- **FR-14.7 — Read-only by construction.** The region MUST contain no button, link, menu, form control, or keyboard affordance that edits, annotates, corrects, hides, redacts, deletes, or re-orders an event. There is nothing to disable, because nothing is rendered. The introductory sentence MUST state that the record cannot be edited or deleted.
- **FR-14.8 — No export.** The region MUST offer no download, CSV, PDF, print-package, copy-all, share, or email action (PRD §10 #5). Browser-native printing and text selection are not features and MUST NOT be enhanced with a print stylesheet, a "print view", or a "copy trail" control.
- **FR-14.9 — Answers the three questions in place.** For any decided case the region MUST make all three answerable without leaving the screen: *who decided this* (the decision event's actor), *what did the AI say* (the recommendation event's after values and the case's recommendation section), and *what did the human change* (the decision event's value rows with per-value origin and before/after) (NFR-7, SM-2).
- **FR-14.10 — Integrity statement.** The region MUST render the `chain_verified` result: when true, "Record integrity verified — {n} events in sequence."; when false, a prominent USWDS error alert "Record integrity check failed at event {sequence}. Report this immediately." announced assertively. The UI MUST NOT offer any repair action.
- **FR-14.11 — Available for open and closed cases.** The trail MUST render for a case in any state. On an open case it shows the events so far (typically receipt, validation, exception opening, and the recommendation outcome); on a closed case it additionally shows the decision event. It MUST be reachable from the case detail screen's in-page navigation and by the direct `/cases/{caseReference}/audit` URL, which scrolls to and focuses the region's heading.
- **FR-14.12 — Live update only on decision.** The trail MUST refresh after a decision is recorded on the same screen, so the specialist immediately sees their own decision in the record. It MUST NOT poll or auto-refresh otherwise.
- **FR-14.13 — Accessible list semantics.** The trail MUST be an `<ol>` of `<li>` events with `<h3>` per event, giving screen-reader users list position ("4 of 7") and heading navigation. Each value change table MUST be a real `<table>` with a `<caption>` naming its event ("Values recorded — recommendation edited and approved"), `scope="col"` headers, and no ARIA grid roles.
- **FR-14.14 — Reading order.** Within an event the DOM order MUST be heading → who → when → state change → reason → values, matching the visual order, so keyboard and screen-reader traversal follow the reading order.
- **FR-14.15 — Timestamps unambiguous.** Timestamps MUST render as absolute local date and time with month in words and the time zone abbreviation, carried by `<time datetime>`. Relative phrasing ("2 hours ago") MUST NOT be used. Where two events share a displayed minute, the sequence number disambiguates their order.
- **FR-14.16 — Escaping.** All values, reasons, and model-generated text MUST be rendered as escaped text; no field may be interpreted as HTML or Markdown.
- **FR-14.17 — Empty and loading states.** A trail can never legitimately be empty (receipt always writes an entry), so an empty result MUST render the `ErrorState` "The audit trail could not be loaded for this case." rather than an empty-state message — silence about history is an error, not a normal state. While loading, the F2 `Loading` component renders with `aria-busy`.
- **FR-14.18 — Performance.** The region MUST render within 2 seconds under demonstration load (NFR-10); it is fetched alongside or immediately after the case detail and MUST NOT block the rest of the case screen from rendering.
- **FR-14.19 — Accessibility sign-off.** The region MUST pass the F2 FR-2.26 checklist as part of the case detail screen, including a screen-reader walkthrough that traverses every event and confirms that AI-versus-human origin is announced for each event and each value (SM-10, SM-11).

---

**Inputs:**
- `GET /api/exceptions/{exceptionId}/audit` response: `entries[]` each with `case_sequence`, `action_type`, `actor_type`, `actor_display_name`, `occurred_at`, `before_state`, `after_state`, `reason`, `model_id` (for AI events), `values[]` (`field_name`, `before_value`, `before_origin`, `after_value`, `after_origin`, `changed`); plus `chain_verified`, `first_divergence_sequence`, `entry_count`
- Route/anchor context from F10

**Outputs:**
- A rendered chronological event list with full per-event detail
- Provenance badges on every actor and every value
- Reason text for edits and rejections
- The integrity statement
- A polite announcement on load ("Audit trail. {n} events.") and after a post-decision refresh ("Audit trail updated. {n} events.")

**Validation (presentation-level):**
- An unknown `action_type` MUST render with the raw action name as the heading rather than being skipped — nothing in the record may be hidden because the client did not recognise it.
- An event with `actor_type = 'AI'` and a non-null actor name MUST still render as "AI"; the client MUST NOT attribute an AI event to a person.
- `chain_verified: false` MUST render the failure alert even if the entries themselves render normally.
- `values[]` MUST render in stable order by `field_name` so repeated views of the same event are identical.

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Load failure (5xx/network) | `ErrorState` "We could not load the audit trail." + "Try again" | Error region | Assertive |
| Empty trail returned | `ErrorState` (a case always has events) | Error region | Assertive |
| Integrity check failed | USWDS error alert naming the sequence; events still rendered | Alert | Assertive |
| Case not found (404) | Handled by the case screen (F10 FR-10.15) | Screen `h1` | Polite |
| Session expired (401) | Redirect to sign-in | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `GET /api/exceptions/{exceptionId}/audit` (F13). No endpoint of its own, and no export endpoint exists. See `Y1-api.md` §4 Audit.

**Schema Surface (this feature):** none directly; renders `audit_entries` and `audit_entry_values` joined to `specialists` for display names.

**Acceptance Criteria:**
1. A case decided by edit-and-approve renders events in order: entry received → validated → exception opened → AI recommendation generated → recommendation edited and approved.
2. The decision event shows the deciding specialist, the timestamp, the reason verbatim, and per-value before/after with `AI` or `HUMAN` origin on each side.
3. The AI event is attributed to "AI ({model_id})" and never to a person.
4. With colour removed and with a screen reader, every event's and every value's origin is still distinguishable.
5. The region contains no control that edits, deletes, prints, downloads, or exports anything.
6. "Who decided this, what did the AI say, and what did the human change" is answerable for a decided case from this region alone, with no other tool (SM-2).
7. A tampered copy of the database renders the integrity failure alert at the correct sequence.
8. Recording a decision refreshes the trail in place so the new event appears without a manual reload.
9. A screen reader announces list position for each event and reads each value table with its column headers.

---
## Y0: Database Schema (Authoritative DDL)

PostgreSQL 15+. This is the authoritative schema for CargoExec v1. Per-feature "Schema Surface" sections summarise; this section governs.

**Roles.** Two database roles are required, and one further connection role is permitted. `cargoexec_owner` owns the schema and is used **only** by the migration runner. `cargoexec_app` is the application's connection role and holds no DDL privilege. A third connection role, `cargoexec_ai`, MAY be used by the recommendation worker's pool; where it exists it MUST hold `SELECT` on the tables it reads, `INSERT`/`UPDATE` on `recommendations`, `INSERT` on `recommendation_values` and the two audit tables, and **no privilege of any kind on `decisions` or `decision_values` and no `UPDATE` on `exceptions`**, so "the AI cannot write a resolution" holds at the privilege layer as well as at the foreign-key and trigger layers (TechArch §0.4 A-1). None of the three is an application role — CargoExec has exactly one application role, `cargo specialist`, which is not represented in the database's privilege system and is not selectable, configurable, or surfaced anywhere (F1 FR-1.1).

**Scope note.** No table below carries an `assigned_to`, `claimed_by`, `priority`, `severity`, `risk_score`, `age_days`, `due_at`, `sla_status`, `role`, `permission`, `tenant_id`, `exported_at`, `source_system`, `ingestion_batch_id`, `is_seed`, `hts_code`, or `duty_amount` column. Their absence is enforced by the schema test of F0 FR-0.18 / §0.7.

---

### 1. Identity

```sql
CREATE TABLE specialists (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  display_name     text NOT NULL,
  password_hash    text NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at  timestamptz,
  CONSTRAINT specialists_email_lower_chk CHECK (email = lower(email)),
  CONSTRAINT specialists_email_len_chk   CHECK (char_length(email) BETWEEN 3 AND 254),
  CONSTRAINT specialists_name_len_chk    CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 120)
);
CREATE UNIQUE INDEX uq_specialists_email ON specialists (email);
-- No role column: every row is a cargo specialist with identical capability (F1 FR-1.1).

CREATE TABLE sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id       uuid NOT NULL REFERENCES specialists (id),
  token_hash          bytea NOT NULL,
  csrf_token_hash     bytea NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  absolute_expires_at timestamptz NOT NULL,
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  revocation_reason   text,
  user_agent          text,
  CONSTRAINT sessions_token_hash_len_chk CHECK (octet_length(token_hash) = 32),
  CONSTRAINT sessions_csrf_hash_len_chk  CHECK (octet_length(csrf_token_hash) = 32),
  CONSTRAINT sessions_revocation_chk CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL) OR
    (revoked_at IS NOT NULL AND revocation_reason IN ('SIGNED_OUT','EXPIRED'))
  ),
  CONSTRAINT sessions_expiry_after_creation_chk CHECK (absolute_expires_at > created_at)
);
CREATE UNIQUE INDEX uq_sessions_token_hash ON sessions (token_hash);
CREATE INDEX idx_sessions_specialist ON sessions (specialist_id);
```

---

### 2. Entries

```sql
CREATE SEQUENCE case_reference_seq;

CREATE TABLE cargo_entries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_reference         text NOT NULL,
  created_by             uuid NOT NULL REFERENCES specialists (id),
  received_at            timestamptz NOT NULL DEFAULT now(),
  receipt_outcome        text NOT NULL,

  -- The fourteen submitted fields, stored exactly as typed (trimmed only).
  entry_number           text,
  importer_of_record_id  text,
  port_of_entry_code     text,
  mode_of_transport      text,
  carrier_code           text,
  conveyance_name        text,
  bill_of_lading_number  text,
  air_waybill_number     text,
  country_of_origin_code text,
  goods_description      text,
  quantity               numeric(14,3),
  quantity_uom           text,
  declared_value_usd     numeric(14,2),
  arrival_date           date,

  CONSTRAINT cargo_entries_case_reference_fmt_chk
    CHECK (case_reference ~ '^CE-[0-9]{4}-[0-9]{6}$'),
  CONSTRAINT cargo_entries_receipt_outcome_chk
    CHECK (receipt_outcome IN ('VALIDATED_CLEAN','EXCEPTION_OPENED')),
  CONSTRAINT cargo_entries_len_chk CHECK (
    coalesce(char_length(entry_number),0)           <= 20 AND
    coalesce(char_length(importer_of_record_id),0)  <= 20 AND
    coalesce(char_length(port_of_entry_code),0)     <= 8  AND
    coalesce(char_length(mode_of_transport),0)      <= 16 AND
    coalesce(char_length(carrier_code),0)           <= 8  AND
    coalesce(char_length(conveyance_name),0)        <= 100 AND
    coalesce(char_length(bill_of_lading_number),0)  <= 40 AND
    coalesce(char_length(air_waybill_number),0)     <= 20 AND
    coalesce(char_length(country_of_origin_code),0) <= 4  AND
    coalesce(char_length(goods_description),0)      <= 2000 AND
    coalesce(char_length(quantity_uom),0)           <= 8
  )
);
CREATE UNIQUE INDEX uq_cargo_entries_case_reference ON cargo_entries (case_reference);
CREATE UNIQUE INDEX uq_cargo_entries_entry_number
  ON cargo_entries (entry_number) WHERE entry_number IS NOT NULL;  -- F3 FR-3.9
CREATE INDEX idx_cargo_entries_received_at ON cargo_entries (received_at);

-- Per-value provenance baseline: one row per field the specialist actually provided.
CREATE TABLE cargo_entry_field_origins (
  entry_id     uuid NOT NULL REFERENCES cargo_entries (id),
  field_name   text NOT NULL,
  origin       text NOT NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, field_name),
  CONSTRAINT cefo_origin_human_chk CHECK (origin = 'HUMAN'),          -- F0 FR-0.3
  CONSTRAINT cefo_field_name_chk CHECK (field_name IN (
    'entry_number','importer_of_record_id','port_of_entry_code','mode_of_transport',
    'carrier_code','conveyance_name','bill_of_lading_number','air_waybill_number',
    'country_of_origin_code','goods_description','quantity','quantity_uom',
    'declared_value_usd','arrival_date'))
);
```

---

### 3. Validation

```sql
CREATE TABLE validation_results (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              uuid NOT NULL REFERENCES cargo_entries (id),
  outcome               text NOT NULL,
  rule_set_version      text NOT NULL,
  evaluated_at          timestamptz NOT NULL DEFAULT now(),
  rules_evaluated_count integer NOT NULL,
  findings_count        integer NOT NULL,
  CONSTRAINT validation_results_outcome_chk CHECK (outcome IN ('PASS','FAIL')),
  CONSTRAINT validation_results_counts_chk CHECK (
    findings_count >= 0 AND rules_evaluated_count >= findings_count AND
    ((outcome = 'PASS' AND findings_count = 0) OR (outcome = 'FAIL' AND findings_count > 0))
  ),
  -- Supports the composite FK that makes an exception without a failure impossible (F0 FR-0.11):
  CONSTRAINT uq_validation_results_id_outcome UNIQUE (id, outcome)
);
CREATE UNIQUE INDEX uq_validation_results_entry ON validation_results (entry_id);

CREATE TABLE validation_findings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_result_id uuid NOT NULL REFERENCES validation_results (id),
  rule_id              text NOT NULL,
  field_name           text NOT NULL,
  failure_code         text NOT NULL,
  message              text NOT NULL,
  CONSTRAINT vf_rule_id_fmt_chk CHECK (rule_id ~ '^RIV-[0-9]{3}$'),
  CONSTRAINT vf_message_len_chk CHECK (char_length(message) BETWEEN 1 AND 500),
  CONSTRAINT uq_validation_findings_rule UNIQUE (validation_result_id, rule_id)
  -- No severity, weight, score, or priority column (F4 FR-4.9).
);
CREATE INDEX idx_validation_findings_result ON validation_findings (validation_result_id, rule_id);
```

---

### 4. Exceptions

```sql
CREATE SEQUENCE exception_receipt_position_seq;

CREATE TABLE exceptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id             uuid NOT NULL REFERENCES cargo_entries (id),
  validation_result_id uuid NOT NULL,
  validation_outcome   text NOT NULL DEFAULT 'FAIL',
  state                text NOT NULL DEFAULT 'OPEN',
  receipt_position     bigint NOT NULL DEFAULT nextval('exception_receipt_position_seq'),
  opened_at            timestamptz NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  decision_id          uuid,
  CONSTRAINT exceptions_state_chk CHECK (state IN ('OPEN','RESOLVED','REJECTED')),
  CONSTRAINT exceptions_basis_is_failure_chk CHECK (validation_outcome = 'FAIL'),
  CONSTRAINT exceptions_basis_fk
    FOREIGN KEY (validation_result_id, validation_outcome)
    REFERENCES validation_results (id, outcome),                       -- F0 FR-0.11
  CONSTRAINT exceptions_closure_consistency_chk CHECK (
    (state = 'OPEN'     AND closed_at IS NULL     AND decision_id IS NULL) OR
    (state <> 'OPEN'    AND closed_at IS NOT NULL AND decision_id IS NOT NULL)
  )                                                                    -- F5 FR-5.14
  -- No priority, assignee, age, SLA, or escalation column (F5 FR-5.9).
);
CREATE UNIQUE INDEX uq_exceptions_entry ON exceptions (entry_id);
CREATE UNIQUE INDEX uq_exceptions_receipt_position ON exceptions (receipt_position);
-- The single index serving the queue projection (F7 FR-7.1):
CREATE INDEX idx_exceptions_open_receipt_order
  ON exceptions (receipt_position) WHERE state = 'OPEN';
```

---

### 5. Recommendations (proposals — never resolutions)

```sql
CREATE TABLE recommendations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id       uuid NOT NULL REFERENCES exceptions (id),
  status             text NOT NULL DEFAULT 'PENDING',
  requested_at       timestamptz NOT NULL DEFAULT now(),
  recommended_action text,
  rationale          text,
  model_id           text,
  prompt_version     text,
  generated_at       timestamptz,
  latency_ms         integer,
  failure_reason     text,
  failed_at          timestamptz,
  CONSTRAINT recommendations_status_chk CHECK (status IN ('PENDING','AVAILABLE','UNAVAILABLE')),
  CONSTRAINT recommendations_available_chk CHECK (
    status <> 'AVAILABLE' OR (
      recommended_action IS NOT NULL AND char_length(btrim(recommended_action)) BETWEEN 1 AND 500 AND
      rationale          IS NOT NULL AND char_length(btrim(rationale))          BETWEEN 1 AND 2000 AND
      model_id IS NOT NULL AND prompt_version IS NOT NULL AND generated_at IS NOT NULL
    )
  ),
  CONSTRAINT recommendations_unavailable_chk CHECK (
    status <> 'UNAVAILABLE' OR (
      failed_at IS NOT NULL AND failure_reason IN (
        'PROVIDER_TIMEOUT','PROVIDER_UNAVAILABLE','PROVIDER_RATE_LIMITED',
        'PROVIDER_AUTH_FAILED','SCHEMA_INVALID','CONTENT_FILTERED','INTERNAL_ERROR')
    )
  ),
  CONSTRAINT recommendations_pending_chk CHECK (
    status <> 'PENDING' OR (generated_at IS NULL AND failed_at IS NULL)
  )
);
CREATE UNIQUE INDEX uq_recommendations_exception ON recommendations (exception_id);

CREATE TABLE recommendation_values (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id  uuid NOT NULL REFERENCES recommendations (id),
  field_name         text NOT NULL,
  proposed_value     text NOT NULL,
  origin             text NOT NULL DEFAULT 'AI',
  addresses_rule_ids text[] NOT NULL,
  CONSTRAINT rv_origin_ai_chk CHECK (origin = 'AI'),                   -- F0 FR-0.3
  CONSTRAINT rv_addresses_nonempty_chk CHECK (array_length(addresses_rule_ids, 1) >= 1),
  CONSTRAINT rv_value_len_chk CHECK (char_length(proposed_value) BETWEEN 1 AND 2000),
  CONSTRAINT uq_recommendation_values_field UNIQUE (recommendation_id, field_name)
);
```

---

### 6. Decisions (the only writer of a resolution)

```sql
CREATE TABLE decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id      uuid NOT NULL REFERENCES exceptions (id),
  decision_type     text NOT NULL,
  decided_by        uuid NOT NULL REFERENCES specialists (id),   -- human identity required (F11 §structural)
  decided_at        timestamptz NOT NULL DEFAULT now(),
  reason            text,
  recommendation_id uuid REFERENCES recommendations (id),
  resulting_state   text NOT NULL,
  idempotency_key   text,
  CONSTRAINT decisions_type_chk CHECK (decision_type IN ('APPROVE','EDIT_APPROVE','REJECT')),
  CONSTRAINT decisions_resulting_state_chk CHECK (
    (decision_type IN ('APPROVE','EDIT_APPROVE') AND resulting_state = 'RESOLVED') OR
    (decision_type = 'REJECT' AND resulting_state = 'REJECTED')
  ),
  -- Mandatory reason on edit and reject, enforced in storage as well as at the API (F0 FR-0.15):
  CONSTRAINT decisions_reason_required_chk CHECK (
    decision_type = 'APPROVE' OR (reason IS NOT NULL AND char_length(btrim(reason)) >= 10)
  ),
  CONSTRAINT decisions_reason_len_chk CHECK (reason IS NULL OR char_length(reason) <= 2000),
  CONSTRAINT decisions_approve_needs_recommendation_chk CHECK (
    decision_type <> 'APPROVE' OR recommendation_id IS NOT NULL
  ),
  CONSTRAINT decisions_idempotency_key_len_chk CHECK (
    idempotency_key IS NULL OR char_length(idempotency_key) <= 128
  )
);
CREATE UNIQUE INDEX uq_decisions_exception ON decisions (exception_id);   -- one decision, ever
CREATE UNIQUE INDEX uq_decisions_idempotency
  ON decisions (exception_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE exceptions
  ADD CONSTRAINT exceptions_decision_fk FOREIGN KEY (decision_id) REFERENCES decisions (id);

CREATE TABLE decision_values (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id           uuid NOT NULL REFERENCES decisions (id),
  field_name            text NOT NULL,
  value                 text NOT NULL,
  origin                text NOT NULL,
  prior_value           text,
  prior_origin          text,
  changed_from_proposal boolean NOT NULL,
  CONSTRAINT dv_origin_chk CHECK (origin IN ('AI','HUMAN')),
  CONSTRAINT dv_prior_origin_chk CHECK (prior_origin IS NULL OR prior_origin IN ('AI','HUMAN')),
  CONSTRAINT dv_value_len_chk CHECK (char_length(value) BETWEEN 1 AND 2000),
  CONSTRAINT uq_decision_values_field UNIQUE (decision_id, field_name)
);
```

---

### 7. Audit store (append-only)

```sql
CREATE TABLE audit_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             uuid NOT NULL REFERENCES cargo_entries (id),
  case_sequence       integer NOT NULL,
  global_sequence     bigint GENERATED ALWAYS AS IDENTITY,
  action_type         text NOT NULL,
  actor_type          text NOT NULL,
  actor_specialist_id uuid REFERENCES specialists (id),
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  exception_id        uuid REFERENCES exceptions (id),
  recommendation_id   uuid REFERENCES recommendations (id),
  decision_id         uuid REFERENCES decisions (id),
  before_state        text,
  after_state         text NOT NULL,
  reason              text,
  request_id          text,
  prev_entry_hash     bytea NOT NULL,
  entry_hash          bytea NOT NULL,
  CONSTRAINT ae_action_chk CHECK (action_type IN (
    'ENTRY_RECEIVED','VALIDATION_COMPLETED','EXCEPTION_OPENED',
    'RECOMMENDATION_GENERATED','RECOMMENDATION_UNAVAILABLE',
    'RECOMMENDATION_APPROVED','RECOMMENDATION_EDITED_AND_APPROVED',
    'RECOMMENDATION_REJECTED')),
  CONSTRAINT ae_actor_type_chk CHECK (actor_type IN ('SPECIALIST','AI','SYSTEM')),
  CONSTRAINT ae_actor_pairing_chk CHECK (
    (actor_type = 'SPECIALIST' AND actor_specialist_id IS NOT NULL) OR
    (actor_type = 'AI'         AND actor_specialist_id IS NULL)     OR
    (actor_type = 'SYSTEM'     AND actor_specialist_id IS NOT NULL)
  ),
  CONSTRAINT ae_case_sequence_chk CHECK (case_sequence >= 1),
  CONSTRAINT ae_hash_len_chk CHECK (
    octet_length(prev_entry_hash) = 32 AND octet_length(entry_hash) = 32
  ),
  CONSTRAINT ae_reason_only_on_decisions_chk CHECK (
    reason IS NULL OR action_type IN (
      'RECOMMENDATION_APPROVED','RECOMMENDATION_EDITED_AND_APPROVED','RECOMMENDATION_REJECTED')
  ),
  CONSTRAINT ae_reason_required_chk CHECK (
    action_type NOT IN ('RECOMMENDATION_EDITED_AND_APPROVED','RECOMMENDATION_REJECTED')
    OR (reason IS NOT NULL AND char_length(btrim(reason)) >= 10)
  ),
  CONSTRAINT uq_audit_entries_case_sequence UNIQUE (case_id, case_sequence),
  CONSTRAINT uq_audit_entries_entry_hash UNIQUE (entry_hash)
);
CREATE INDEX idx_audit_entries_case ON audit_entries (case_id, case_sequence);
CREATE INDEX idx_audit_entries_decision ON audit_entries (decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX idx_audit_entries_recommendation
  ON audit_entries (recommendation_id) WHERE recommendation_id IS NOT NULL;

CREATE TABLE audit_entry_values (
  audit_entry_id uuid NOT NULL REFERENCES audit_entries (id),
  field_name     text NOT NULL,
  before_value   text,
  before_origin  text,
  after_value    text,
  after_origin   text,
  changed        boolean NOT NULL,
  PRIMARY KEY (audit_entry_id, field_name),
  CONSTRAINT aev_before_origin_chk CHECK (before_origin IS NULL OR before_origin IN ('AI','HUMAN')),
  CONSTRAINT aev_after_origin_chk  CHECK (after_origin  IS NULL OR after_origin  IN ('AI','HUMAN')),
  CONSTRAINT aev_some_value_chk CHECK (before_value IS NOT NULL OR after_value IS NOT NULL),
  CONSTRAINT aev_origin_present_chk CHECK (
    (before_value IS NULL OR before_origin IS NOT NULL) AND
    (after_value  IS NULL OR after_origin  IS NOT NULL)
  )                                                                    -- F13 FR-13.9
);
```

#### 7.1 Append-only enforcement — privileges (F0 FR-0.4)

```sql
REVOKE ALL ON audit_entries, audit_entry_values FROM PUBLIC;
GRANT SELECT, INSERT ON audit_entries, audit_entry_values TO cargoexec_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries, audit_entry_values FROM cargoexec_app;
-- Also revoked on future objects in this schema:
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE UPDATE, DELETE, TRUNCATE ON TABLES FROM PUBLIC;
```

#### 7.2 Append-only enforcement — trigger (F0 FR-0.5, defends against owner/superuser)

```sql
CREATE OR REPLACE FUNCTION audit_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_IMMUTABLE: % on % is not permitted; the audit store is append-only',
    TG_OP, TG_TABLE_NAME USING ERRCODE = 'P0001';
END $$;

CREATE TRIGGER trg_audit_entries_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_entries
  FOR EACH STATEMENT EXECUTE FUNCTION audit_reject_mutation();
CREATE TRIGGER trg_audit_entries_immutable_row
  BEFORE UPDATE OR DELETE ON audit_entries
  FOR EACH ROW EXECUTE FUNCTION audit_reject_mutation();
CREATE TRIGGER trg_audit_entry_values_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_entry_values
  FOR EACH STATEMENT EXECUTE FUNCTION audit_reject_mutation();
CREATE TRIGGER trg_audit_entry_values_immutable_row
  BEFORE UPDATE OR DELETE ON audit_entry_values
  FOR EACH ROW EXECUTE FUNCTION audit_reject_mutation();
```

#### 7.3 Hash chain linkage (F0 FR-0.7, F13 FR-13.6)

```sql
CREATE OR REPLACE FUNCTION audit_check_chain() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE expected bytea;
BEGIN
  IF NEW.case_sequence = 1 THEN
    expected := decode(repeat('00', 32), 'hex');
  ELSE
    SELECT entry_hash INTO expected FROM audit_entries
     WHERE case_id = NEW.case_id AND case_sequence = NEW.case_sequence - 1;
  END IF;
  IF expected IS NULL OR expected <> NEW.prev_entry_hash THEN
    RAISE EXCEPTION 'AUDIT_CHAIN_BROKEN: prev_entry_hash mismatch at case % sequence %',
      NEW.case_id, NEW.case_sequence USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER trg_audit_chain
  AFTER INSERT ON audit_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION audit_check_chain();
```

#### 7.4 Human-in-the-loop enforcement (F0 FR-0.9, NFR-5)

```sql
CREATE OR REPLACE FUNCTION exceptions_require_human_decision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state <> 'OPEN' THEN
    PERFORM 1 FROM decisions d
      JOIN specialists s ON s.id = d.decided_by
     WHERE d.exception_id = NEW.id
       AND d.id = NEW.decision_id
       AND d.resulting_state = NEW.state;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'HITL_VIOLATION: exception % cannot leave OPEN without a matching human decision',
        NEW.id USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER trg_exceptions_hitl
  AFTER INSERT OR UPDATE ON exceptions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION exceptions_require_human_decision();
```

#### 7.5 Audit-coupling enforcement (F0 FR-0.10, NFR-6)

```sql
CREATE OR REPLACE FUNCTION require_audit_entry(
  p_case_id uuid, p_actions text[], p_count integer, p_context text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM audit_entries
   WHERE case_id = p_case_id AND action_type = ANY (p_actions);
  IF n <> p_count THEN
    RAISE EXCEPTION 'AUDIT_COUPLING_VIOLATION: % expected % audit entr(y/ies), found %',
      p_context, p_count, n USING ERRCODE = 'P0001';
  END IF;
END $$;

-- (a) entry received
CREATE OR REPLACE FUNCTION entries_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM require_audit_entry(NEW.id, ARRAY['ENTRY_RECEIVED'], 1, 'cargo_entries insert');
      RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER trg_entries_audit AFTER INSERT ON cargo_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION entries_require_audit();

-- (b) validation completed
CREATE OR REPLACE FUNCTION validation_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM require_audit_entry(NEW.entry_id, ARRAY['VALIDATION_COMPLETED'], 1, 'validation_results insert');
      RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER trg_validation_audit AFTER INSERT ON validation_results
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validation_require_audit();

-- (c) exception opened
CREATE OR REPLACE FUNCTION exceptions_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM require_audit_entry(NEW.entry_id, ARRAY['EXCEPTION_OPENED'], 1, 'exceptions insert');
      RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER trg_exceptions_audit AFTER INSERT ON exceptions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION exceptions_require_audit();

-- (d) decision recorded — exactly one entry referencing this decision
CREATE OR REPLACE FUNCTION decisions_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM audit_entries WHERE decision_id = NEW.id;
  IF n <> 1 THEN
    RAISE EXCEPTION 'AUDIT_COUPLING_VIOLATION: decision % has % audit entries, expected 1',
      NEW.id, n USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_decisions_audit AFTER INSERT ON decisions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION decisions_require_audit();

-- (e) recommendation terminal status — exactly one matching entry
CREATE OR REPLACE FUNCTION recommendations_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; expected text;
BEGIN
  IF NEW.status = 'PENDING' THEN RETURN NULL; END IF;
  expected := CASE NEW.status WHEN 'AVAILABLE' THEN 'RECOMMENDATION_GENERATED'
                              ELSE 'RECOMMENDATION_UNAVAILABLE' END;
  SELECT count(*) INTO n FROM audit_entries
   WHERE recommendation_id = NEW.id AND action_type = expected;
  IF n <> 1 THEN
    RAISE EXCEPTION 'AUDIT_COUPLING_VIOLATION: recommendation % status % has % % entries, expected 1',
      NEW.id, NEW.status, n, expected USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_recommendations_audit AFTER INSERT OR UPDATE ON recommendations
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION recommendations_require_audit();
```

#### 7.6 Chain verification (read-only, F0 FR-0.8)

```sql
CREATE OR REPLACE FUNCTION verify_audit_chain(p_case_id uuid)
RETURNS TABLE (chain_verified boolean, first_divergence_sequence integer, entry_count integer)
LANGUAGE plpgsql STABLE AS $$
DECLARE r record; expected bytea := decode(repeat('00', 32), 'hex'); n integer := 0;
BEGIN
  FOR r IN SELECT case_sequence, prev_entry_hash, entry_hash FROM audit_entries
            WHERE case_id = p_case_id ORDER BY case_sequence LOOP
    n := n + 1;
    IF r.case_sequence <> n OR r.prev_entry_hash <> expected THEN
      RETURN QUERY SELECT false, r.case_sequence, n; RETURN;
    END IF;
    expected := r.entry_hash;
  END LOOP;
  RETURN QUERY SELECT true, NULL::integer, n;
END $$;
-- Read-only: it reports divergence and never repairs, rewrites, or annotates (F0 FR-0.8).
```

---

### 8. Migrations and privileges

- **FR-Y0.1** Migrations are forward-only, numbered (`0001_…`, `0002_…`), each wrapped in a transaction, applied by `cargoexec_owner`. There is no down-migration path in v1.
- **FR-Y0.2** Every table is created in the same migration as its constraints, indexes, privilege grants/revocations, and triggers, so no deployment window exists in which the audit store is mutable or an invariant is unenforced (F0 FR-0.17).
- **FR-Y0.3** `cargoexec_app` grants: `SELECT, INSERT, UPDATE` on `specialists` (last_sign_in_at, is_active), `sessions`, `recommendations`, `exceptions`; `SELECT, INSERT` on `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, `recommendation_values`, `decisions`, `decision_values`, `audit_entries`, `audit_entry_values`. `DELETE` is granted on **no** table. `TRUNCATE` is granted on no table.
- **FR-Y0.4** Migrations insert no domain data. Validation domain code lists are compiled-in constants (F4 FR-4.1); demonstration data is created by hand through the UI (PRD §10 #7). The only operational insert is the initial specialist account, created by CLI outside migrations (F1 FR-1.13).
- **FR-Y0.5** A schema test asserts: the absent-column list of §0.7 is absent from every table; `cargoexec_app` lacks `UPDATE`/`DELETE` on both audit tables; and the eight audit action values in `ae_action_chk` match the eight transitions of §0.6 exactly.

---
## Y1: API Endpoints (Authoritative Contract)

All endpoints are JSON over HTTPS under `/api`. This section is the authoritative request/response contract; per-feature "API Surface" sections summarise it.

### 0. Conventions

- **Authentication:** every endpoint except `POST /api/session` requires the `cargoexec_sid` session cookie. Unauthenticated ⇒ `401 UNAUTHENTICATED` (F1 FR-1.7).
- **CSRF:** every state-changing request (`POST`, `DELETE`) requires `X-CSRF-Token` matching the session token ⇒ else `403 CSRF_INVALID`.
- **Content type:** requests and responses are `application/json; charset=utf-8`. Any other request content type on a body-bearing endpoint ⇒ `415 UNSUPPORTED_MEDIA_TYPE`.
- **Unknown properties** in any request body ⇒ `422 REQUEST_MALFORMED`. Silent ignoring never occurs.
- **Error envelope** (every non-2xx): `{"error":{"code":"…","message":"…","details":[{"field":"…","code":"…","message":"…"}],"request_id":"…"}}`. `details` is omitted when empty.
- **Caching:** all responses carry `Cache-Control: no-store`.
- **Timestamps:** RFC 3339 UTC with offset, e.g. `2026-09-11T14:32:07.512Z`.
- **Identifiers:** `{exceptionId}` and `{idOrReference}` accept a uuid or a case reference `CE-YYYY-NNNNNN`.
- **Complete endpoint list — there are ten method/path pairs.** Anything not listed does not exist: no export, no import, no batch, no admin, no search, no metrics, no user management, no role management, no recommendation regeneration, no entry mutation, no audit mutation.

| # | Method | Path | Feature |
|---|---|---|---|
| 1 | `POST` | `/api/session` | F1 |
| 2 | `GET` | `/api/session` | F1 |
| 3 | `DELETE` | `/api/session` | F1 |
| 4 | `POST` | `/api/entries` | F3 |
| 5 | `GET` | `/api/entries/{entryId}` | F3 |
| 6 | `GET` | `/api/exceptions` | F7 |
| 7 | `GET` | `/api/exceptions/{idOrReference}` | F7 |
| 8 | `GET` | `/api/exceptions/{exceptionId}/recommendation` | F9 |
| 9 | `POST` | `/api/exceptions/{exceptionId}/decision` | F11 |
| 10 | `GET` | `/api/exceptions/{exceptionId}/audit` | F13 |

(Ten rows, ten endpoints — three session, two entry, three exception-read, one decision, one audit-read. Adding or removing one requires a change to this table. All other methods on these paths ⇒ `405 METHOD_NOT_ALLOWED`.)

---

### 1. Session (F1)

**`POST /api/session`** — sign in. No auth, no CSRF.

```jsonc
// request
{ "email": "specialist@cbp.example.gov", "password": "…" }
// 201
{ "specialist": { "id": "uuid", "email": "specialist@cbp.example.gov", "display_name": "A. Rivera" },
  "csrf_token": "…", "session": { "absolute_expires_at": "2026-09-11T22:32:07Z" } }
// Set-Cookie: cargoexec_sid=…; HttpOnly; Secure; SameSite=Lax; Path=/   ← `governed` profile (default); see F1 FR-1.3
```
Errors: `401 AUTH_FAILED` · `403 ACCOUNT_INACTIVE` · `422 REQUEST_MALFORMED` · `429 TOO_MANY_ATTEMPTS` (with `Retry-After`).

**`GET /api/session`** — current principal and CSRF token. `200` with the same body shape; `401 UNAUTHENTICATED` if absent/expired.

**`DELETE /api/session`** — sign out. `204`, cookie cleared. `401` if no session.

---

### 2. Entries (F3, F4)

**`POST /api/entries`** — receive one manually authored entry. Session + CSRF.

```jsonc
// request — every field optional; an incomplete entry is the primary demonstration path
{ "entry_number": "ABC12345678", "importer_of_record_id": "12-3456789",
  "port_of_entry_code": "2704", "mode_of_transport": "OCEAN", "carrier_code": "MAEU",
  "conveyance_name": "MV Northern Star / V.118", "bill_of_lading_number": "MAEU123456789",
  "air_waybill_number": null, "country_of_origin_code": "CN",
  "goods_description": "Stainless steel fasteners, M8 hex bolts",
  "quantity": "1200.000", "quantity_uom": "PCS", "declared_value_usd": "8450.00",
  "arrival_date": "2026-09-20" }
```

```jsonc
// 201 — exception opened
{ "entry": { "id": "uuid", "case_reference": "CE-2026-000137", "received_at": "…",
             "created_by": { "id": "uuid", "display_name": "A. Rivera" },
             "values": { "entry_number": "ABC12345678", "port_of_entry_code": null, "…": "…" },
             "field_origins": { "entry_number": "HUMAN", "…": "HUMAN" } },
  "case_reference": "CE-2026-000137",
  "receipt_outcome": "EXCEPTION_OPENED",
  "validation": { "outcome": "FAIL", "rule_set_version": "RIV-2026.09", "evaluated_at": "…",
    "findings": [ { "rule_id": "RIV-030", "field_name": "port_of_entry_code",
                    "failure_code": "PORT_OF_ENTRY_MISSING",
                    "message": "Enter the port of entry code." } ] },
  "exception": { "id": "uuid", "state": "OPEN", "receipt_position": 42 },
  "next": { "case_url": "/cases/CE-2026-000137", "queue_url": "/queue" } }

// 201 — validated clean
{ "…": "…", "receipt_outcome": "VALIDATED_CLEAN",
  "validation": { "outcome": "PASS", "findings": [] }, "exception": null,
  "next": { "case_url": null, "queue_url": "/queue" } }
```
Errors: `401` · `403 CSRF_INVALID` · `409 ENTRY_NUMBER_DUPLICATE` (details carry the existing `case_reference`) · `413 REQUEST_TOO_LARGE` · `415` · `422 REQUEST_MALFORMED` · `500 RECEIPT_FAILED`.
Note: a validation failure is **not** an error — it is a `201` with `receipt_outcome: "EXCEPTION_OPENED"` (F3 FR-3.10).

**`GET /api/entries/{entryId}`** — `200` with the entry, field origins, validation result with findings, `receipt_outcome`, and `exception` summary or null. Errors: `400 INVALID_IDENTIFIER` · `401` · `404 ENTRY_NOT_FOUND`.

---

### 3. Queue and Cases (F7)

**`GET /api/exceptions`** — the queue. **Accepts no query parameters** (F7 FR-7.2).

```jsonc
// 200
{ "exceptions": [
    { "id": "uuid", "case_reference": "CE-2026-000137", "receipt_position": 42,
      "received_at": "2026-09-11T14:32:07Z", "entry_number": "ABC12345678",
      "finding_count": 3,
      "failure_summary": "Enter the port of entry code.; Describe the goods. and 1 more" } ],
  "returned_count": 1, "truncated": false }
```
Ordering is `receipt_position ASC`, always. Errors: `400 UNSUPPORTED_QUERY_PARAMETER` · `401` · `405`.

**`GET /api/exceptions/{idOrReference}`** — full case detail.

```jsonc
// 200
{ "exception": { "id": "uuid", "case_reference": "CE-2026-000137", "state": "OPEN",
                 "receipt_position": 42, "opened_at": "…", "closed_at": null },
  "entry": { "id": "uuid", "received_at": "…",
             "created_by": { "id": "uuid", "display_name": "A. Rivera" },
             "values": { "entry_number": "ABC12345678", "port_of_entry_code": null, "…": "…" },
             "field_origins": { "entry_number": "HUMAN", "…": "HUMAN" } },
  "validation": { "outcome": "FAIL", "rule_set_version": "RIV-2026.09", "evaluated_at": "…",
                  "findings": [ { "rule_id": "RIV-030", "field_name": "port_of_entry_code",
                                  "failure_code": "PORT_OF_ENTRY_MISSING",
                                  "message": "Enter the port of entry code." } ] },
  "recommendation": { "id": "uuid", "status": "AVAILABLE",
    "recommended_action": "Add the missing port of entry code and expand the goods description.",
    "rationale": "The entry did not include a port of entry, and …",
    "proposed_values": [ { "field_name": "port_of_entry_code", "proposed_value": "2704",
                           "origin": "AI", "addresses_rule_ids": ["RIV-030"] } ],
    "model_id": "…", "prompt_version": "p-2026.09.1", "generated_at": "…",
    "failure_reason": null, "requested_at": "…" },
  "decision": null,
  "permitted_decisions": ["APPROVE", "EDIT_APPROVE", "REJECT"] }
```
For a closed case: `exception.state` is `RESOLVED`/`REJECTED`, `permitted_decisions` is `[]`, and `decision` is populated:
```jsonc
{ "decision": { "id": "uuid", "decision_type": "EDIT_APPROVE", "decided_at": "…",
    "decided_by": { "id": "uuid", "display_name": "A. Rivera" },
    "reason": "Port code corrected to the actual arrival port per the bill of lading.",
    "resolution_values": [ { "field_name": "port_of_entry_code", "value": "2709",
        "origin": "HUMAN", "prior_value": "2704", "prior_origin": "AI",
        "changed_from_proposal": true } ] } }
```
Errors: `400 INVALID_IDENTIFIER` · `401` · `404 EXCEPTION_NOT_FOUND` · `405`.

---

### 4. Recommendation, Decision, Audit (F9, F11, F13)

**`GET /api/exceptions/{exceptionId}/recommendation`** — polled by F10 while `PENDING`.

```jsonc
// 200 — available
{ "id": "uuid", "status": "AVAILABLE", "recommended_action": "…", "rationale": "…",
  "proposed_values": [ { "field_name": "…", "proposed_value": "…", "origin": "AI",
                         "addresses_rule_ids": ["RIV-030"] } ],
  "model_id": "…", "prompt_version": "…", "generated_at": "…", "requested_at": "…" }
// 200 — unavailable (degraded mode; the case remains decidable)
{ "id": "uuid", "status": "UNAVAILABLE", "failure_reason": "PROVIDER_TIMEOUT",
  "failed_at": "…", "requested_at": "…" }
// 200 — pending
{ "id": "uuid", "status": "PENDING", "requested_at": "…" }
```
There is no `POST`, `PUT`, regenerate, or apply operation on this resource. Errors: `400` · `401` · `404 EXCEPTION_NOT_FOUND` · `405`.

**`POST /api/exceptions/{exceptionId}/decision`** — the only mutating case endpoint. Session + CSRF. Optional `Idempotency-Key` header.

```jsonc
// request — approve
{ "decision_type": "APPROVE", "recommendation_id": "uuid" }
// request — edit and approve (complete value set required)
{ "decision_type": "EDIT_APPROVE", "recommendation_id": "uuid",
  "reason": "Port code corrected to the actual arrival port per the bill of lading.",
  "resolution_values": [ { "field_name": "port_of_entry_code", "value": "2709" },
                         { "field_name": "goods_description",  "value": "Stainless steel M8 hex bolts, 1200 pieces" } ] }
// request — reject
{ "decision_type": "REJECT", "reason": "The suggested port code conflicts with the vessel's manifest." }
```

```jsonc
// 201
{ "decision": { "id": "uuid", "decision_type": "EDIT_APPROVE", "decided_at": "…",
    "decided_by": { "id": "uuid", "display_name": "A. Rivera" },
    "reason": "…",
    "resolution_values": [ { "field_name": "port_of_entry_code", "value": "2709",
        "origin": "HUMAN", "prior_value": "2704", "prior_origin": "AI",
        "changed_from_proposal": true },
      { "field_name": "goods_description", "value": "Stainless steel M8 hex bolts, 1200 pieces",
        "origin": "AI", "prior_value": "Stainless steel M8 hex bolts, 1200 pieces",
        "prior_origin": "AI", "changed_from_proposal": false } ] },
  "exception": { "id": "uuid", "state": "RESOLVED", "closed_at": "…" },
  "audit_entry_id": "uuid",
  "idempotent_replay": false }
```
`origin` is computed server-side and is never accepted from the client (F11 FR-11.8, FR-11.15).
Errors: `401` · `403 CSRF_INVALID` · `404 EXCEPTION_NOT_FOUND` · `409 EXCEPTION_ALREADY_DECIDED` · `409 RECOMMENDATION_NOT_AVAILABLE` · `409 RECOMMENDATION_MISMATCH` · `409 IDEMPOTENCY_KEY_REUSED` · `422 REASON_REQUIRED` · `422 RESOLUTION_VALUES_NOT_ALLOWED` · `422 RESOLUTION_VALUES_INCOMPLETE` · `422 REQUEST_MALFORMED` · `500 DECISION_FAILED`.

**`GET /api/exceptions/{exceptionId}/audit`** — one case's trail, ascending sequence.

```jsonc
// 200
{ "case_reference": "CE-2026-000137", "entry_count": 5,
  "chain_verified": true, "first_divergence_sequence": null,
  "entries": [
    { "id": "uuid", "case_sequence": 1, "action_type": "ENTRY_RECEIVED",
      "actor_type": "SPECIALIST", "actor": { "id": "uuid", "display_name": "A. Rivera" },
      "occurred_at": "…", "before_state": null, "after_state": "RECEIVED", "reason": null,
      "model_id": null,
      "values": [ { "field_name": "entry_number", "before_value": null, "before_origin": null,
                    "after_value": "ABC12345678", "after_origin": "HUMAN", "changed": true } ] },
    { "id": "uuid", "case_sequence": 4, "action_type": "RECOMMENDATION_GENERATED",
      "actor_type": "AI", "actor": null, "model_id": "…",
      "occurred_at": "…", "before_state": "PENDING", "after_state": "AVAILABLE", "reason": null,
      "values": [ { "field_name": "port_of_entry_code", "before_value": null, "before_origin": null,
                    "after_value": "2704", "after_origin": "AI", "changed": true } ] },
    { "id": "uuid", "case_sequence": 5, "action_type": "RECOMMENDATION_EDITED_AND_APPROVED",
      "actor_type": "SPECIALIST", "actor": { "id": "uuid", "display_name": "A. Rivera" },
      "occurred_at": "…", "before_state": "OPEN", "after_state": "RESOLVED",
      "reason": "Port code corrected to the actual arrival port per the bill of lading.",
      "values": [ { "field_name": "port_of_entry_code", "before_value": "2704",
                    "before_origin": "AI", "after_value": "2709", "after_origin": "HUMAN",
                    "changed": true } ] } ] }
```
Read-only, single-case, JSON only. There is no export representation, no `Accept` variant producing a file, no `?format=` parameter, and no multi-case audit query (F13 FR-13.18, PRD §10 #5). Errors: `400` · `401` · `404 EXCEPTION_NOT_FOUND` · `405`.

---

### 5. UI Routes (F2 shell; screens owned by F1, F6, F8, F10, F12, F14)

| Route | Screen | Owner | Auth |
|---|---|---|---|
| `/sign-in` | Sign in | F1 + F2 | none |
| `/` | Redirect to `/queue` | F2 | session |
| `/queue` | Review queue (receipt-ordered open exceptions) | F8 | session |
| `/entries/new` | New cargo entry form + receipt outcome | F6 | session |
| `/cases/{caseReference}` | Case detail: findings, entry, recommendation (F10), decision (F12), audit (F14) | F10 | session |
| `/cases/{caseReference}/audit` | Case detail, deep-linked and focused on the audit trail region | F14 | session |
| `*` | Page not found (inside the shell) | F2 | session |

An unauthenticated HTML request to any session route ⇒ `302 /sign-in?next={path}` (F1 FR-1.7). There is no dashboard route, no reports route, no settings route, no admin route, and no closed-case browse route.

---

### 6. Cross-cutting API requirements

- **FR-Y1.1** The endpoint list above is exhaustive. Adding an endpoint requires a corresponding feature requirement in this FRD; no endpoint may be added "for later".
- **FR-Y1.2** No endpoint accepts a query parameter except none at all — v1 has zero query parameters across the whole API. `GET /api/exceptions` rejects any; the others take only path parameters.
- **FR-Y1.3** Response bodies MUST NOT include any field that would enable queue management, supervision, or export: no priority, assignee, age, throughput, count-by-state, or download link (PRD §10 #2, #4, #5).
- **FR-Y1.4** `request_id` MUST be generated per request, returned in the error envelope and the `X-Request-Id` response header, and recorded on audit entries written during that request (F13).
- **FR-Y1.5** Rate limiting applies only to `POST /api/session` (F1 FR-1.10). No other endpoint is throttled in v1.
- **FR-Y1.6** All input is validated server-side and all database access uses parameterised queries (NFR-8). No endpoint interpolates client input into SQL.
- **FR-Y1.7** Error messages are plain language, safe to display, and never disclose stack traces, SQL, provider errors, credentials, or whether an email address exists.

---
## Y2: Error Catalogue (Cross-Feature)

Every error the product can return, in one place. All are returned in the standard envelope (`Y1-api.md` §0). Messages are the exact, plain-language text shown to a specialist; they never expose stack traces, SQL, provider responses, or credentials (NFR-8).

### 1. Authentication and session (F1)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 401 | `AUTH_FAILED` | "Email or password is incorrect." | Unknown email **or** wrong password — deliberately indistinguishable | Re-enter credentials |
| 401 | `UNAUTHENTICATED` | "Sign in to continue." | No session, expired session, or revoked session on an API call | Sign in again; HTML routes redirect instead |
| 403 | `ACCOUNT_INACTIVE` | "This account is not active." | `specialists.is_active = false` | Contact the deployment operator; there is no self-service unlock |
| 403 | `CSRF_INVALID` | "Your session could not be verified. Refresh and try again." | Missing or mismatched `X-CSRF-Token` | Refresh the page to obtain a current token |
| 429 | `TOO_MANY_ATTEMPTS` | "Too many sign-in attempts. Try again in about 15 minutes." | 5 failures for one email within 15 minutes | Wait; `Retry-After` is set |

### 2. Request shape (all endpoints)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 400 | `INVALID_IDENTIFIER` | "That identifier is not valid." | Path segment is neither a uuid nor `CE-YYYY-NNNNNN` | Use a link from the queue or the receipt outcome |
| 400 | `UNSUPPORTED_QUERY_PARAMETER` | "This endpoint accepts no query parameters." | Any query string on `GET /api/exceptions` — including `sort`, `filter`, `state`, `assignee`, `page` | Request the endpoint with no parameters; queue management does not exist (PRD §10 #4) |
| 405 | `METHOD_NOT_ALLOWED` | "That action is not available." | Method not defined for the path (e.g. `PUT /api/entries/{id}`, `DELETE /api/exceptions/{id}/audit`) | None — the capability does not exist |
| 413 | `REQUEST_TOO_LARGE` | "This entry is too large to accept." | Body over 64 KB | Shorten the goods description; the cap is per single typed entry, not a batch limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | "Send this entry as JSON." | Non-JSON content type; includes any attempt at multipart or CSV upload (PRD §10 #6) | Submit through the entry form |
| 422 | `REQUEST_MALFORMED` | "The request could not be read." | Unknown property, wrong type, over-length string, duplicate field, or a client-supplied `origin`/`decided_by` | Correct the client; `details[]` names each offending field |

### 3. Entry receipt (F3, F4)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 404 | `ENTRY_NOT_FOUND` | "That entry could not be found." | No such entry id | Return to the review queue |
| 409 | `ENTRY_NUMBER_DUPLICATE` | "Entry number {n} already exists on case {ref}." | `UNIQUE` on `entry_number`; deliberately not a validation rule (F3 FR-3.9) | Open the existing case or use the correct entry number |
| 500 | `RECEIPT_FAILED` | "The entry could not be received. Nothing was saved. Try again." | Any failure inside the receipt transaction — persistence, validation engine, exception derivation, or audit write | Re-submit; atomicity guarantees nothing partial was stored |

**Not errors:** a required-information failure returns `201` with `receipt_outcome: "EXCEPTION_OPENED"` and findings. No `RIV-*` failure code ever appears as an HTTP error code.

### 4. Queue and case retrieval (F7)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 404 | `EXCEPTION_NOT_FOUND` | "That case could not be found." | No exception for the identifier | Return to the review queue |
| 404 | `EXCEPTION_NOT_FOUND` | "That entry passed validation, so it has no exception." | Entry exists but validated clean | None needed — a clean entry has no case to work |

### 5. Decision (F11)

| HTTP | Code | Message | Cause | Recovery |
|---|---|---|---|---|
| 409 | `EXCEPTION_ALREADY_DECIDED` | "This case was already {resolved/rejected} by {name} on {date}." | A decision exists; `UNIQUE (exception_id)` plus the row lock | None — decisions are final; no reopen, amend, or undo exists |
| 409 | `RECOMMENDATION_NOT_AVAILABLE` | "There is no AI recommendation to approve. Edit and approve, or reject." | `APPROVE` attempted while the recommendation is `PENDING` or `UNAVAILABLE` | Use edit-and-approve (direct resolution) or reject |
| 409 | `RECOMMENDATION_MISMATCH` | "The recommendation changed. Reload the case and review it again." | Supplied `recommendation_id` is not the case's current one | Reload the case and decide on what is shown |
| 409 | `IDEMPOTENCY_KEY_REUSED` | "That request identifier was already used for a different decision." | Same `Idempotency-Key`, different body | Reload the case to see what was recorded |
| 422 | `REASON_REQUIRED` | "Enter a reason of at least 10 characters for this {edit/rejection}." | Reason absent, blank, whitespace-only, or under 10 characters on `EDIT_APPROVE`/`REJECT` | Enter a substantive reason; also enforced by a database `CHECK` |
| 422 | `RESOLUTION_VALUES_NOT_ALLOWED` | "Resolution values cannot be sent with this decision." | Values sent with `APPROVE` or `REJECT` | Approve adopts the proposal as-is; reject records no values |
| 422 | `RESOLUTION_VALUES_INCOMPLETE` | "Include every recommended field. Missing: {list}." | Value set does not exactly match the proposal's field set | Send the complete set so per-value provenance is unambiguous |
| 500 | `DECISION_FAILED` | "The decision could not be recorded. Nothing was saved. Try again." | Any failure inside the decision transaction, including audit coupling | Reload the case and retry; the case remains `OPEN` |

### 6. AI recommendation (F9) — degraded, not failed

These are **recommendation statuses**, not HTTP errors. The case remains fully decidable in every one (NFR-9, SM-13). `failure_reason` maps to the plain-language copy F10 renders.

| `failure_reason` | Displayed cause | Retryable |
|---|---|---|
| `PROVIDER_TIMEOUT` | "The AI service did not respond in time." | No — terminal by design (F9 FR-9.14) |
| `PROVIDER_UNAVAILABLE` | "The AI service could not be reached." | No |
| `PROVIDER_RATE_LIMITED` | "The AI service was busy." | No |
| `PROVIDER_AUTH_FAILED` | "The AI service rejected this deployment's credentials." | No — an operator issue; the key is never displayed or logged |
| `SCHEMA_INVALID` | "The AI response could not be used." | No |
| `CONTENT_FILTERED` | "The AI service declined to answer for this case." | No |
| `INTERNAL_ERROR` | "A recommendation could not be produced." | No |

### 7. Database-enforced invariants (never surfaced verbatim)

These are raised by the database (`Y0-schema.md`) and abort the transaction. They reach the client only as the caller's generic `500` (`RECEIPT_FAILED` or `DECISION_FAILED`), with the internal code logged against the `request_id`.

| Internal code | Raised by | Meaning |
|---|---|---|
| `AUDIT_IMMUTABLE` | Privilege revocation + mutation trigger | An `UPDATE`/`DELETE`/`TRUNCATE` was attempted on an audit table by any role |
| `AUDIT_CHAIN_BROKEN` | Chain constraint trigger | `prev_entry_hash` did not match the prior entry for the case |
| `AUDIT_COUPLING_VIOLATION` | Coupling constraint triggers | A state change had zero or more than one audit entry at commit |
| `HITL_VIOLATION` | HITL constraint trigger | An exception left `OPEN` without a matching human decision |
| `EXCEPTION_WITHOUT_BASIS` | Composite FK / F5 guard | An exception referenced a passing validation result, or had no findings |
| `AUDIT_SEQUENCE_CONFLICT` | `UNIQUE (case_id, case_sequence)` | Two writers raced on one case's audit sequence |
| `AUDIT_WRITE_INVALID` | Audit writer validation | Invalid action, actor pairing, missing required reason, or no transaction |
| `AUDIT_WRITE_FORBIDDEN_CONTENT` | Audit writer denylist | An attempt to write a secret-shaped value or denylisted field name |
| `RULE_SET_INVALID` | Startup self-check | The validation rule registry failed its integrity check; the application refuses to start |
| `VALIDATION_ENGINE_FAILURE` | Validation engine | A rule predicate threw, or a finding named an unknown field |

### 8. Client-side and shell states (F2)

| Scenario | Presentation | Announcement |
|---|---|---|
| Unknown route | "Page not found" inside the shell, link to the review queue | Polite |
| Network failure on a load | `ErrorState` with "Try again" | Assertive |
| Network failure on a submit | Error summary above the form; entered values preserved | Assertive |
| Unknown outcome after a submit | Advice to check the review queue or reload the case; never an automatic retry | Assertive |
| Unhandled client exception | `ErrorState` with a generic cause; no stack trace shown | Assertive |
| Audit chain verification failed | USWDS error alert naming the divergent sequence; no repair action offered | Assertive |

### 9. Error-handling principles

- **FR-Y2.1** A required-information failure is never an error. It is a successful receipt whose outcome is an exception.
- **FR-Y2.2** A `4xx` or `5xx` from a mutating endpoint means **nothing was written** — no partial state, no orphan record, no audit entry. Messages say so explicitly where a specialist might otherwise retry blindly.
- **FR-Y2.3** Error codes are stable identifiers; messages may be reworded without changing a code. Clients branch on codes, never on message text.
- **FR-Y2.4** `details[]` names the offending field and a field-level code so the UI can bind the error to a control (F2 FR-2.13).
- **FR-Y2.5** No error message discloses account existence, internal identifiers beyond the case reference, provider error text, SQL, or configuration.
- **FR-Y2.6** Every error response carries a `request_id` that correlates with server logs and with any audit entry written during that request.

---
## Y3: Integration Points

CargoExec v1 has exactly **two** external dependencies: a hosted large-language-model API and the browser. Everything else is internal. In particular there is **no** integration with ACE, ATS, or any other CBP system; no file or API ingestion boundary; no export destination; no identity provider federation; no email, notification, or messaging service; no analytics, telemetry, or monitoring SaaS; and no model training pipeline (PRD §10 #1, #5, #6, #11).

---

### 1. Hosted LLM provider (F9)

| Property | Value |
|---|---|
| Purpose | Generate a recommended resolution action and a plain-language rationale for one exception |
| Direction | Outbound only, request/response; the provider never calls CargoExec |
| Interface | Internal `RecommendationProvider` abstraction: `generate(request) → RecommendationDraft` |
| Trigger | Post-commit dispatch after an exception is opened (F3 step 13); never scheduled, never user-triggered |
| Transport | HTTPS to the configured provider endpoint |
| Timeout | 20 s per attempt; one retry on timeout / 429 / 5xx / connection failure; 45 s total budget |
| Failure mode | Terminal `UNAVAILABLE` with an enumerated `failure_reason`; the case remains decidable |
| Authentication | API key from environment configuration; never in source control, logs, responses, or audit entries |

**Request payload sent to the provider** (F9 FR-9.16): the fourteen entry field values as submitted, the ordered validation findings (`rule_id`, `field_name`, `failure_code`, `message`), and the `rule_set_version`, rendered into the versioned prompt template.

**Never sent to the provider:** session tokens, CSRF tokens, passwords or password hashes, specialist names, specialist identifiers, email addresses, case references tied to an actor, audit entries, or any other specialist-identifying data. The model sees the cargo entry and why it failed validation — nothing about who typed it.

**Response contract:** validated against the F9 FR-9.7 output schema before any persistence. `field_name` values outside the fourteen-field set — including any classification, HTS, duty, tariff, penalty, or risk field — make the response schema-invalid and drive the case to `UNAVAILABLE` (F9 FR-9.8, PRD §10 #9).

**Boundary guarantees:**

- **FR-Y3.1** The provider client MUST be reachable only through the `RecommendationProvider` interface. No other module may import a provider SDK type, and no provider-specific type may appear in a function signature outside the adapter.
- **FR-Y3.2** The provider path MUST have no access to the decision service, and no AI principal exists in `specialists`, so provider output cannot become a decision (F9 FR-9.2, F11 §structural argument).
- **FR-Y3.3** Provider output MUST NOT be written to `cargo_entries`, `validation_findings`, `decisions`, or `decision_values` — only to `recommendations` / `recommendation_values` with `origin = 'AI'`.
- **FR-Y3.4** Provider substitution MUST require changing only the adapter and its configuration. A test double MUST be able to produce every outcome branch, including each of the seven `failure_reason` values, so degraded-mode behaviour is testable without network access.
- **FR-Y3.5** Provider errors MUST be logged with the API key and any credential material redacted, and MUST NOT be returned to the client verbatim (F9 FR-9.13, NFR-8).
- **FR-Y3.6** Provider latency MUST NOT affect any interactive response time (NFR-10); generation runs off the request path with bounded worker concurrency.
- **FR-Y3.7** No training, fine-tuning, embedding store, evaluation harness, or feedback-to-model loop exists. A specialist's edit or rejection is recorded in the audit trail and goes nowhere near the model (PRD §10 #11).

**Configuration** (environment only, never in source): provider endpoint URL, API key, `model_id`, `prompt_version`, per-attempt timeout, worker concurrency.

---

### 2. Browser / session integration (F1, F2)

| Property | Value |
|---|---|
| Client | Current versions of mainstream desktop browsers; responsive to tablet viewports (NFR-12) |
| Session transport | `cargoexec_sid` cookie — opaque token, `HttpOnly`, `Secure`, no `Max-Age`; `SameSite=Lax` under the default `governed` profile (F1 FR-1.3) |
| CSRF | `X-CSRF-Token` header, double-submit against the session's stored token, constant-time comparison |
| Assets | USWDS styles, fonts, and icon sprite bundled and served by the application — no runtime CDN dependency (F2 FR-2.3) |
| Assistive technology | Screen readers via standard semantic HTML and ARIA live regions; no AT-specific integration or vendor API |

- **FR-Y3.8** Authentication is local credential verification against `specialists`. There is **no** federation, SSO, SAML, OIDC, LDAP, PIV/CAC, or external identity provider in v1, and no hook prepared for one. The single role is a property of the application, not of an external directory (F1 FR-1.1).
- **FR-Y3.9** Responses MUST set security headers: `Strict-Transport-Security`, `Content-Security-Policy` (self-only script and style sources, no inline script), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, and `Cache-Control: no-store` on API responses (NFR-8).
- **FR-Y3.9a — No frame-blocking header.** `X-Frame-Options` MUST NOT be sent on any route, in any configuration, with any value. The application is demonstrated inside a sandbox preview **IFRAME**, and a browser walkthrough — not an API transcript — is the acceptance evidence for SM-1 and SM-2 (PRD R-7); the header has no allowlist form, so any value makes the running application unreachable in the one environment the walkthrough happens in. Frame policy MUST be expressed only through CSP `frame-ancestors`, which MUST either be omitted or set to an explicit allowlist of the preview origin, and MUST NOT be `'none'` or a bare `'self'`. Clickjacking is mitigated instead by CSRF double-submit on every state-changing request (F1 FR-1.9), the absence of any state-changing `GET`, and the fact that the only mutating action is a deliberate multi-field form submission rather than a single click. (This requirement supersedes the earlier `X-Frame-Options: DENY` instruction; see TechArch §0.4 D-1.)
- **FR-Y3.10** No third-party script, font, analytics tag, session-replay tool, error-reporting SaaS, chat widget, or tracking pixel may be loaded by any screen. The demonstration must run correctly with no outbound network access other than the AI provider call.

---

### 3. Deployment-internal dependencies (not external integrations)

| Component | Relationship |
|---|---|
| PostgreSQL | The application's own database; two DB roles (`cargoexec_owner` for migrations, `cargoexec_app` for runtime) — see `Y0-schema.md` |
| Migration runner | Executes forward-only migrations as the owner role at deploy time |
| Specialist provisioning CLI | Operational command creating the initial account; no self-registration, no password reset, no user-administration UI (F1 FR-1.13) |
| Background worker | In-process, same deployment unit; runs AI generation only, and can write only `recommendations` / `recommendation_values` / audit entries |

- **FR-Y3.11** The background worker MUST be the only asynchronous actor in the system, and its capability MUST be limited to recommendation generation. It MUST NOT be given, now or later, the ability to resolve, reject, reassign, escalate, re-prioritise, close, re-validate, or delete anything (NFR-5, SM-4).
- **FR-Y3.12** The deployment MUST be a single web service plus a database, runnable locally for demonstration. No message broker, cache, object store, search index, or scheduler is introduced in v1.
- **FR-Y3.13** All secrets (database credentials, AI provider key, session signing material) MUST come from environment configuration, MUST be absent from source control, and MUST NOT appear in any log line, error response, or audit entry (NFR-8, R-12).

---

### 4. Integration surfaces deliberately absent

Each of the following has no adapter, no configuration key, no interface stub, no feature flag, and no placeholder module. Their absence is verified by SM-14 (zero shipped features falling within a §10 exclusion).

| Absent surface | Authority |
|---|---|
| ACE / ATS interface, file ingestion, bulk upload, ingestion adapter | PRD §10 #6 |
| Audit or case export — file, report, feed, print package, oversight bundle | PRD §10 #5 |
| Supervisory dashboard, metrics sink, throughput or queue-health reporting | PRD §10 #2 |
| External identity provider, role directory, permission service | PRD §10 #3 |
| Accessibility CI service, axe-core runner, `.github/workflows` | PRD §10 #1 |
| Seed/fixture data loader for demonstration content | PRD §10 #7 |
| Model training, fine-tuning, or feedback pipeline | PRD §10 #11 |
| Native mobile client or mobile push service | PRD §10 #10 |
| Duty/tariff calculation or classification ruling service | PRD §10 #9 |

---

*End of FRD-CargoExec. Source of truth: `.planning/PROJECT.md`; upstream: `project_specs/PRD-CargoExec.md`. Chunk sources: `project_specs/FRD/`.*
