-- Up Migration
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
