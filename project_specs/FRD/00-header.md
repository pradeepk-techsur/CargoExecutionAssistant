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
