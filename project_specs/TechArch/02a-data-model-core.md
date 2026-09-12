## 2. Data Model

**Target: PostgreSQL 16.4** (FRD specifies 15+; 16 is pinned for the demonstration). The DDL in §2.3–§2.12 is complete and is the same schema as FRD `Y0-schema` — thirteen tables, no table added, no table removed, and no column added. Where this document adds anything it is a *privilege* (the `cargoexec_ai` role, addition A-1), never a column, table, or index that serves an excluded capability.

### 2.1 Entity–relationship diagram

```
                          ┌───────────────────┐
                          │    specialists    │  the ONLY actor table.
                          │  id (PK)          │  No role column. No AI row.
                          │  email (UQ)       │  No system row. Ever.
                          │  display_name     │
                          │  password_hash    │
                          │  is_active        │
                          └───┬───────────┬───┘
              created_by      │           │  decided_by (NOT NULL)
       ┌──────────────────────┘           └──────────────────┐
       │                                                      │
       │                  ┌──────────────┐                    │
       │                  │   sessions   │ specialist_id ─────┘ (FK only;
       │                  │  token_hash  │  server-side session state
       │                  │  csrf_hash   │  session events are NOT audit)
       │                  └──────────────┘
       ▼
┌──────────────────────────┐        1:N       ┌───────────────────────────────┐
│      cargo_entries       │─────────────────►│  cargo_entry_field_origins    │
│  id (PK) = CASE ANCHOR   │                  │  (entry_id, field_name) PK    │
│  case_reference (UQ)     │                  │  origin CHECK ('HUMAN')       │
│  created_by → specialists│                  └───────────────────────────────┘
│  received_at             │
│  receipt_outcome         │  IMMUTABLE: app role holds SELECT+INSERT only
│  14 submitted fields     │  (D-3: written once, with its final outcome)
└──────┬────────────┬──────┘
       │ 1:1        │ 1:N
       ▼            │                        ┌───────────────────────────────┐
┌──────────────────┐│                  1:N   │     validation_findings       │
│validation_results││─────────────────────── │  rule_id (RIV-nnn)            │
│  id (PK)         ││                        │  field_name · failure_code    │
│  outcome PASS|FAIL                         │  message                      │
│  UNIQUE(id,outcome) ◄──┐                   │  no severity/weight/priority  │
│  rule_set_version ││   │ composite FK      └───────────────────────────────┘
└──────────────────┘│   │ guarantees an exception's
                    │   │ basis is a FAILING result
       ┌────────────┘   │
       ▼ 1:0..1         │
┌─────────────────────────────────┐
│           exceptions            │  state OPEN → RESOLVED | REJECTED
│  id (PK)                        │  receipt_position (UQ, sole ordering)
│  entry_id (UQ) → cargo_entries  │  NO priority/assignee/age/SLA column
│  validation_result_id ──────────┘  closed_at & decision_id NULL iff OPEN
│  validation_outcome CHECK 'FAIL'│
│  decision_id → decisions ───────┐
└───────┬─────────────────┬───────┘│
        │ 1:0..1          │ 1:0..1 │
        ▼                 ▼        │
┌──────────────────┐  ┌────────────┴──────────────┐
│ recommendations  │  │        decisions          │  THE ONLY RESOLUTION
│ PROPOSAL ONLY    │  │  decided_by NOT NULL ─────┼─► specialists
│ status PENDING → │  │  decision_type            │  (AI has no row here,
│  AVAILABLE |     │  │   APPROVE|EDIT_APPROVE|   │   so it cannot decide)
│  UNAVAILABLE     │  │   REJECT                  │  UNIQUE(exception_id)
│ model_id         │  │  reason (CHECK ≥10 unless │  reason enforced in DDL
│ prompt_version   │  │   APPROVE)                │
│ failure_reason   │  │  resulting_state          │
└────────┬─────────┘  └──────────┬────────────────┘
         │ 1:N                   │ 1:N
         ▼                       ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│ recommendation_values  │  │       decision_values        │
│ origin CHECK ('AI')    │  │ origin ∈ {AI, HUMAN}  ◄──────┼── the ONLY table
│ addresses_rule_ids[]   │  │ prior_value / prior_origin   │   where origin is
│ proposed_value         │  │ changed_from_proposal        │   mixed: exactly
└────────────────────────┘  └──────────────────────────────┘   where a human
                                                               edits an AI value

   ╔════════════════════════════ APPEND-ONLY ════════════════════════════╗
   ║  ┌────────────────────────────┐        1:N  ┌──────────────────────┐ ║
   ║  │       audit_entries        │────────────►│  audit_entry_values  │ ║
   ║  │ case_id → cargo_entries    │             │ (audit_entry_id,     │ ║
   ║  │ case_sequence  UQ(case,seq)│             │  field_name) PK      │ ║
   ║  │ global_sequence (identity) │             │ before_value/origin  │ ║
   ║  │ action_type (8 values)     │             │ after_value/origin   │ ║
   ║  │ actor_type SPECIALIST|AI|  │             │ changed              │ ║
   ║  │            SYSTEM          │             └──────────────────────┘ ║
   ║  │ exception_id/recommendation│                                      ║
   ║  │  _id/decision_id           │   UPDATE · DELETE · TRUNCATE         ║
   ║  │ before_state / after_state │   revoked from every role AND        ║
   ║  │ reason · request_id        │   rejected by trigger for ALL roles  ║
   ║  │ prev_entry_hash/entry_hash │   incl. owner and superuser          ║
   ║  └────────────────────────────┘                                      ║
   ╚══════════════════════════════════════════════════════════════════════╝
```

**Relationship chain.** `cargo_entries 1—1 validation_results 1—0..N validation_findings`; `cargo_entries 1—0..1 exceptions 1—0..1 recommendations`; `exceptions 1—0..1 decisions`; `cargo_entries 1—N audit_entries 1—0..N audit_entry_values`. The **case anchor** is `cargo_entries.id`: every audit entry references it because the first case event (`ENTRY_RECEIVED`) predates the exception.

### 2.2 Mutability contract

| Table | After insert, the application may change | Enforced by |
|---|---|---|
| `specialists` | `last_sign_in_at`, `is_active` | grant: `SELECT, INSERT, UPDATE` (column discipline in the repository; no endpoint exposes either) |
| `sessions` | `last_seen_at`, `revoked_at`, `revocation_reason` | grant: `SELECT, INSERT, UPDATE` |
| `cargo_entries` | **nothing** | grant: `SELECT, INSERT` only (D-3) |
| `cargo_entry_field_origins` | **nothing** | grant: `SELECT, INSERT` only |
| `validation_results` | **nothing** | grant: `SELECT, INSERT` only |
| `validation_findings` | **nothing** | grant: `SELECT, INSERT` only |
| `exceptions` | `state`, `closed_at`, `decision_id` — once, `OPEN` → terminal | grant `UPDATE`; HITL trigger + closure `CHECK` |
| `recommendations` | `status` and result columns — once, `PENDING` → terminal | grant `UPDATE`; status `CHECK`s |
| `recommendation_values` | **nothing** | grant: `SELECT, INSERT` only |
| `decisions` | **nothing** | grant: `SELECT, INSERT` only |
| `decision_values` | **nothing** | grant: `SELECT, INSERT` only |
| `audit_entries` | **nothing — append-only** | privilege revocation **and** unconditional trigger |
| `audit_entry_values` | **nothing — append-only** | privilege revocation **and** unconditional trigger |

`DELETE` is granted on **no table**. `TRUNCATE` is granted on **no table**. There is no deletion path for an entry, a finding, an exception, a recommendation, a decision, or an audit entry (F5 FR-5.15, F13 FR-13.14).

### 2.3 Identity

```sql
-- Migration 0001_identity.sql  (owner: cargoexec_owner)
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), digest()

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
-- No role, is_supervisor, permissions, or scope column: every row is a cargo
-- specialist with identical capability (F1 FR-1.1). No AI row, no SYSTEM row --
-- which is what makes decisions.decided_by structurally human (F11 §structural).

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
-- Raw tokens exist only in the client cookie; only SHA-256 hashes are stored.
-- No session-management screen and no admin surface reads this table.
```

### 2.4 Entries

```sql
-- Migration 0002_entries.sql
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
  ON cargo_entries (entry_number) WHERE entry_number IS NOT NULL;   -- F3 FR-3.9
CREATE INDEX idx_cargo_entries_received_at ON cargo_entries (received_at);
-- receipt_outcome is written in the single INSERT (D-3); the application role
-- holds no UPDATE privilege on this table, so the entry of record is physically
-- immutable. Corrections live on decision_values, never as an overwrite.

-- Per-value provenance baseline: one row per field the specialist actually
-- provided (absent and whitespace-only fields get no row -- F3 FR-3.8).
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
-- A manually typed value is HUMAN by construction: the CHECK is a constant, so
-- no code path -- including a compromised one -- can mark an entry value as AI.
```

### 2.5 Validation and exceptions

```sql
-- Migration 0003_validation.sql
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
  -- Supports the composite FK that makes an exception without a failure
  -- impossible (F0 FR-0.11):
  CONSTRAINT uq_validation_results_id_outcome UNIQUE (id, outcome)
);
CREATE UNIQUE INDEX uq_validation_results_entry ON validation_results (entry_id);
-- Exactly one result per entry: validation runs once, on receipt, and there is
-- no re-validate path anywhere in the API or the CLI (F4 FR-4.2).

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
  -- No severity, weight, score, risk, or priority column (F4 FR-4.9): grading a
  -- finding would be prioritisation, which is out of scope (PRD §10 #4).
);
CREATE INDEX idx_validation_findings_result ON validation_findings (validation_result_id, rule_id);
-- field_name is the rule's declared primary_field (clarification C-2), so every
-- finding binds to exactly one control on the F6 form.

-- Migration 0004_exceptions.sql
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
  -- No priority, severity, risk_score, due_at, sla_*, assigned_to, claimed_by,
  -- or escalated_at column (F5 FR-5.9). No IN_PROGRESS, ON_HOLD, ESCALATED,
  -- CLAIMED, SNOOZED, or PENDING_REVIEW state: those imply workflow,
  -- assignment, or supervision (PRD §10 #2, #4). No REOPEN transition.
);
CREATE UNIQUE INDEX uq_exceptions_entry ON exceptions (entry_id);
CREATE UNIQUE INDEX uq_exceptions_receipt_position ON exceptions (receipt_position);
-- The single index serving the queue projection (F7 FR-7.1). It is a partial
-- index on the only ordering dimension that exists; there is no index -- and
-- therefore no efficient query -- supporting any other ordering or filter.
CREATE INDEX idx_exceptions_open_receipt_order
  ON exceptions (receipt_position) WHERE state = 'OPEN';
```

The composite foreign key deserves emphasis: because `exceptions.validation_outcome` is `CHECK`-pinned to `'FAIL'` and `(validation_result_id, validation_outcome)` references `validation_results (id, outcome)`, **an exception whose basis is a passing validation is rejected by the database with no trigger involved** (SM-8: zero exceptions without a validation basis). Sequence gaps in `receipt_position` from rolled-back transactions are accepted and never compacted — renumbering would rewrite queue history (F5 FR-5.8).

### 2.6 Index inventory and rationale

Every index exists to serve a query the FRD requires. No index anticipates a capability that does not exist.

| Index | Serves | Why it is the only one needed |
|---|---|---|
| `uq_specialists_email` | sign-in lookup by normalised email | The only lookup key for an account |
| `uq_sessions_token_hash` | session resolution on every authenticated request | Hash lookup, O(1) per request |
| `idx_sessions_specialist` | sign-out and expiry housekeeping | FK index |
| `uq_cargo_entries_case_reference` | `/cases/{caseReference}` resolution | Case reference is a first-class identifier in URLs |
| `uq_cargo_entries_entry_number` (partial) | duplicate entry-number rejection (409) | Deliberately not a validation rule (F3 FR-3.9) |
| `idx_cargo_entries_received_at` | receipt-time ordering support for case reads | Not a queue ordering; the queue orders by `receipt_position` |
| `uq_validation_results_entry` | one-result-per-entry invariant + case read | Enforces F4 FR-4.11 |
| `uq_validation_results_id_outcome` | the exception basis composite FK | Structural, not performance |
| `idx_validation_findings_result` | findings in `rule_id` order for a case | Matches F4 FR-4.8 emission order |
| `uq_exceptions_entry` | one exception per entry (F5 FR-5.3) | |
| `uq_exceptions_receipt_position` | ordering uniqueness | |
| `idx_exceptions_open_receipt_order` (partial, `state='OPEN'`) | **the** queue query | Partial on `OPEN` because closed cases are excluded from the queue and there is no closed-case browse surface |
| `uq_recommendations_exception` | one recommendation per exception (F9 FR-9.5) | |
| `uq_recommendation_values_field` | one proposal per field | |
| `uq_decisions_exception` | one decision per exception, ever (F11 FR-11.10) | The double-decision backstop |
| `uq_decisions_idempotency` (partial) | idempotent replay | |
| `uq_decision_values_field` | one resolution value per field | |
| `idx_audit_entries_case` | the per-case trail read, ascending sequence | The only audit read shape that exists |
| `uq_audit_entries_case_sequence` | monotonic sequencing backstop | |
| `uq_audit_entries_entry_hash` | chain uniqueness / tamper evidence | |
| `idx_audit_entries_decision` (partial) | decision-coupling trigger | |
| `idx_audit_entries_recommendation` (partial) | recommendation-coupling trigger | |

**Absent by design:** no index on `exceptions.opened_at`, `closed_at`, or `state` alone (would serve aging, throughput, or state-count queries); no index on `decisions.decided_by` or `decided_at` (would serve per-specialist workload reporting); no full-text index on `goods_description` (would serve search). None of those queries exists, so neither do their indexes.

---
