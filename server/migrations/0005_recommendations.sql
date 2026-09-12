-- Up Migration
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
