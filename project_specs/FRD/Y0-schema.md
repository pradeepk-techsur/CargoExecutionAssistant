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
