-- Up Migration
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
--
-- Why decided_by is the crux: it is NOT NULL REFERENCES specialists(id) and is
-- populated ONLY from the authenticated request principal. specialists contains
-- no AI row and no system row, and no code path inserts one. Therefore an
-- AI-authored or job-authored decision fails a foreign-key check before any
-- trigger is consulted (TechArch §2.8, F11 §structural).
