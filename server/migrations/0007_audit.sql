-- Up Migration
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
