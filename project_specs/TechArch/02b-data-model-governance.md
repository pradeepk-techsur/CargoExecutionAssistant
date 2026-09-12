### 2.7 Recommendations — proposals that are structurally not resolutions

```sql
-- Migration 0005_recommendations.sql
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
-- An AVAILABLE recommendation cannot exist without its traceability metadata:
-- model_id, prompt_version, and generated_at are CHECK-required (F9 FR-9.10),
-- so "the record cannot say what the AI said" is not a reachable state.
-- NOTE: no column of this table participates in the exception's state, and no
-- view, job, or trigger copies a row here into decisions/decision_values.
-- That separation IS the no-auto-apply guarantee (F9 FR-9.1, F11 §structural).

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
-- origin is a CHECK-pinned constant: a proposal is machine-originated by
-- construction, and there is no mechanism anywhere to mark one HUMAN at this
-- stage. Every proposed value must also justify itself by naming the rule(s)
-- it addresses, all of which must be findings of this exception (F9 FR-9.7).
```

### 2.8 Decisions — the only writer of a resolution

```sql
-- Migration 0006_decisions.sql
CREATE TABLE decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id      uuid NOT NULL REFERENCES exceptions (id),
  decision_type     text NOT NULL,
  decided_by        uuid NOT NULL REFERENCES specialists (id),   -- human identity REQUIRED
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
  -- Mandatory reason on edit and reject, enforced in storage as well as at the
  -- API (F0 FR-0.15), so an API bypass still cannot record a reasonless edit:
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
-- This is the ONLY table where origin may be either value, because it is the
-- only place a human edits a machine proposal. origin is computed server-side
-- by canonical comparison (§3.5.3) and is rejected as an unknown field if a
-- client sends it (F11 FR-11.8, FR-11.15). No NULL origin is representable.
```

**Why `decided_by` is the crux.** It is `NOT NULL REFERENCES specialists(id)` and is populated *only* from the authenticated request principal. `specialists` contains no AI row and no system row (§2.3), and no code path inserts one. Therefore an AI-authored or job-authored decision fails a foreign-key check before any trigger is consulted — and because the HITL trigger (§2.10) additionally requires a matching decision row for any exit from `OPEN`, an exception cannot be closed by anything other than a named human.

### 2.9 Audit store (append-only)

```sql
-- Migration 0007_audit.sql
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
-- Eight action values, matching the eight transitions of FRD 00-header §0.6
-- exactly; a schema test asserts the CHECK list equals the transition list
-- (FR-Y0.5). occurred_at is DEFAULT now() and is never client-supplied.
-- For RECOMMENDATION_UNAVAILABLE, after_state = 'UNAVAILABLE' and the
-- enumerated failure_reason is read through recommendation_id (clarification
-- C-1): no failure_reason column is added here.

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
-- aev_origin_present_chk is the per-value provenance guarantee in its hardest
-- form: a value without an origin cannot be stored (SM-3: zero unattributed
-- values). Values are recorded verbatim -- no normalisation, truncation,
-- rounding, or case folding (F13 FR-13.11).
```

#### 2.9.1 Database roles and privileges

```sql
-- Migration 0008_privileges.sql   (applied in the same migration set as the
-- tables it protects, so no deployment window exists in which the audit store
-- is mutable -- F0 FR-0.17, FR-Y0.2)

-- Roles. NONE of these is an application role: CargoExec has exactly one
-- application role, `cargo specialist`, which is not represented in the
-- database privilege system at all (F1 FR-1.1).
--   cargoexec_owner : owns the schema; used ONLY by the migration runner
--   cargoexec_app   : the request-path connection pool
--   cargoexec_ai    : the recommendation worker's connection pool  (A-1)

-- ---- Audit store: append-only for every role (F0 FR-0.4) -------------------
REVOKE ALL ON audit_entries, audit_entry_values FROM PUBLIC;
GRANT SELECT, INSERT ON audit_entries, audit_entry_values TO cargoexec_app;
GRANT SELECT, INSERT ON audit_entries, audit_entry_values TO cargoexec_ai;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries, audit_entry_values FROM cargoexec_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries, audit_entry_values FROM cargoexec_ai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE UPDATE, DELETE, TRUNCATE ON TABLES FROM PUBLIC;

-- ---- Request-path role (FR-Y0.3) ------------------------------------------
GRANT SELECT, INSERT, UPDATE ON specialists, sessions, recommendations, exceptions
  TO cargoexec_app;
GRANT SELECT, INSERT ON cargo_entries, cargo_entry_field_origins, validation_results,
  validation_findings, recommendation_values, decisions, decision_values TO cargoexec_app;
GRANT USAGE ON SEQUENCE case_reference_seq, exception_receipt_position_seq TO cargoexec_app;
-- DELETE is granted on no table. TRUNCATE is granted on no table.
-- No UPDATE on cargo_entries (D-3): the entry of record is physically immutable.

-- ---- AI worker role: structurally incapable of resolving a case (A-1) ------
GRANT SELECT ON cargo_entries, validation_results, validation_findings, exceptions,
  recommendations, recommendation_values TO cargoexec_ai;
GRANT INSERT, UPDATE ON recommendations TO cargoexec_ai;
GRANT INSERT ON recommendation_values TO cargoexec_ai;
-- Deliberately NOT granted to cargoexec_ai, and revoked explicitly so the
-- intent is auditable in the schema rather than implied by omission:
REVOKE ALL ON decisions, decision_values FROM cargoexec_ai;
REVOKE UPDATE, DELETE, TRUNCATE ON exceptions FROM cargoexec_ai;
REVOKE ALL ON specialists, sessions FROM cargoexec_ai;
-- The worker therefore cannot write a resolution, cannot change an exception's
-- state, and cannot read a specialist identity -- three independent reasons,
-- on top of the FK and the HITL trigger, why "the AI decided it" is impossible.

-- ---- No DDL for either runtime role ---------------------------------------
REVOKE CREATE ON SCHEMA public FROM cargoexec_app, cargoexec_ai, PUBLIC;
```

#### 2.9.2 Append-only enforcement — mutation trigger (F0 FR-0.5)

Privilege revocation does not bind the table owner or a superuser. The trigger does, unconditionally:

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

Consequences worth stating explicitly, because they shape the application code: `INSERT ... ON CONFLICT DO UPDATE` against an audit table fails; a "fix a typo in history" migration fails; `DELETE FROM audit_entries WHERE …` fails as `cargoexec_owner`; and `TRUNCATE` fails even in a test teardown — test databases are dropped and recreated rather than truncated (§8.2).

### 2.10 Hash chain, HITL, and audit-coupling triggers

```sql
-- Migration 0009_invariant_triggers.sql

-- ---- 1. Hash chain linkage (F0 FR-0.7, F13 FR-13.6) -----------------------
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

-- ---- 2. Human-in-the-loop (F0 FR-0.9, NFR-5) ------------------------------
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

-- ---- 3. Audit coupling: exactly one entry per state change (FR-0.10) ------
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

-- (d) decision recorded -- exactly one entry referencing this decision
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

-- (e) recommendation terminal status -- exactly one matching entry
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

**Why deferred constraint triggers.** `DEFERRABLE INITIALLY DEFERRED` lets the receipt transaction insert the entry *before* its audit entry (the audit row has a foreign key to the entry, so the order is forced) while still refusing to commit the combination if the audit entry never arrives. The invariant is checked at `COMMIT`, which is the only moment at which it is meaningful. A service that "forgets" to audit does not produce an unaudited change — it produces a failed transaction and a `500 RECEIPT_FAILED`/`DECISION_FAILED` telling the specialist nothing was saved.

### 2.11 Chain verification (read-only)

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
-- STABLE and read-only by construction: it reports divergence and never
-- repairs, rewrites, or annotates the chain (F0 FR-0.8). The UI surfaces the
-- result and offers no repair action (F14).
```

### 2.12 Canonical serialisation, hashing, and sequencing

These three algorithms are shared by the audit writer and the verifier and must be implemented once, in `db/canonical.ts`.

**Canonical JSON** (used for hashing and for value comparison):
- object keys sorted lexicographically by UTF-16 code unit; no insignificant whitespace
- `timestamptz` as RFC 3339 UTC with microsecond precision (`2026-09-11T14:32:07.512000Z`)
- SQL `NULL` as JSON `null`
- decimals as unquoted fixed-scale numbers at the column's scale (`quantity` → 3 dp, `declared_value_usd` → 2 dp)
- strings verbatim, NFC-unnormalised — the record shows exactly what was typed

**Entry hash**:

```
entry_hash = SHA-256(
    canonical_json({
      case_id, case_sequence, action_type, actor_type, actor_specialist_id,
      occurred_at, exception_id, recommendation_id, decision_id,
      before_state, after_state, reason, request_id,
      values: [ {field_name, before_value, before_origin,
                 after_value, after_origin, changed} ]   -- sorted by field_name
    })
 ‖ prev_entry_hash )                                      -- ‖ = byte concatenation
```

`prev_entry_hash` is 32 zero bytes at `case_sequence = 1`, otherwise the previous entry's `entry_hash` for the same case. Because `occurred_at` is the database's `now()` and is included, and because the value rows are included in sorted order, any excision, substitution, or reordering within a case breaks verification (R-4).

**Sequence assignment.** The caller holds the case-anchor lock (`SELECT id FROM cargo_entries WHERE id = $1 FOR UPDATE`) before calling `append`. The writer computes `case_sequence = coalesce(max(case_sequence), 0) + 1` for that case inside the lock, so concurrent writers to one case serialise; `UNIQUE (case_id, case_sequence)` is the backstop and surfaces as the internal code `AUDIT_SEQUENCE_CONFLICT`. `global_sequence` is an identity column providing a total order across cases for test tiebreaking.

### 2.13 Migrations

| Rule | Detail |
|---|---|
| **Forward-only** | Numbered files `0001_…sql` … `0010_…sql`, each applied in a single transaction, tracked in a `schema_migrations` table owned by `cargoexec_owner`. No down-migration path exists in v1 (FR-Y0.1). |
| **Applied as the owner** | The migration runner connects as `cargoexec_owner`; `cargoexec_app` and `cargoexec_ai` hold no DDL privilege and no `CREATE` on the schema. |
| **Protection lands with the table** | Every table is created in the same migration set as its constraints, indexes, grants, revocations, and triggers, so there is no deployment window in which the audit store is mutable or an invariant is unenforced (FR-Y0.2). |
| **No data** | Migrations create schema objects only. No migration inserts a cargo entry, validation result, exception, recommendation, decision, or audit entry, and none inserts a domain code list — those are compiled-in frozen constants of the rule set (F4 FR-4.1, PRD §10 #7). A test parses every migration file and fails on any `INSERT` into a domain table. |
| **The one operational insert** | The first specialist account is created by `create-specialist --email --display-name` (password entered interactively, hashed with Argon2id), run outside migrations (F1 FR-1.13). There is no self-registration, password-reset, invite, or user-administration surface. |

**Migration order** (also the dependency order of the schema):

```
0001_identity.sql            specialists, sessions, pgcrypto
0002_entries.sql             case_reference_seq, cargo_entries, cargo_entry_field_origins
0003_validation.sql          validation_results, validation_findings
0004_exceptions.sql          exception_receipt_position_seq, exceptions
0005_recommendations.sql     recommendations, recommendation_values
0006_decisions.sql           decisions, decision_values, exceptions.decision_id FK
0007_audit.sql               audit_entries, audit_entry_values
0008_privileges.sql          roles' grants + audit revocations + default privileges
0009_invariant_triggers.sql  chain, HITL, five coupling triggers, mutation triggers
0010_verify_chain_fn.sql     verify_audit_chain()
```

### 2.14 Schema-level scope assertions

A schema test (`test/architecture/schema.spec.ts`) asserts all of the following against a freshly migrated database, so scope discipline is verified rather than asserted (FR-Y0.5, SM-14):

1. No table has a column named `assigned_to`, `assignee_id`, `claimed_by`, `priority`, `severity`, `severity_rank`, `risk_score`, `age_days`, `due_at`, `sla_due_at`, `sla_status`, `role`, `is_supervisor`, `permission`, `permissions`, `scope`, `tenant_id`, `exported_at`, `export_format`, `source_system`, `ingestion_batch_id`, `is_seed`, `hts_code`, `tariff_rate`, or `duty_amount`.
2. Exactly thirteen application tables exist (plus `schema_migrations`).
3. `cargoexec_app` has no `UPDATE`, `DELETE`, or `TRUNCATE` on `audit_entries` or `audit_entry_values` (read from `information_schema.table_privileges`).
4. `cargoexec_app` has no `UPDATE` on `cargo_entries` (D-3).
5. `cargoexec_ai` has no privilege of any kind on `decisions` or `decision_values`, and no `UPDATE` on `exceptions` (A-1).
6. `DELETE` and `TRUNCATE` are granted to no role on any table.
7. The `ae_action_chk` value list is exactly the eight transitions of FRD `00-header §0.6`.
8. `UPDATE audit_entries` and `DELETE FROM audit_entry_values` fail as `cargoexec_app`, `cargoexec_ai`, **and** `cargoexec_owner`.
9. No table, view, materialised view, or function name matches `/export|report|dashboard|metric|seed|fixture|ingest|assign|priorit/i`.

---
