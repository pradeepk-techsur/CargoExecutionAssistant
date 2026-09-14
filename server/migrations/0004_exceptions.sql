-- Up Migration
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
