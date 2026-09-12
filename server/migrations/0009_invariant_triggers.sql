-- Up Migration

-- ---- 0. Append-only enforcement -- mutation trigger (F0 FR-0.5) -----------
-- Privilege revocation does not bind the table owner or a superuser. The
-- trigger does, unconditionally.
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
-- The statement-level trigger is what makes the guarantee absolute: it fires
-- even when the WHERE clause matches zero rows, and it fires on TRUNCATE, which
-- has no row-level trigger. Consequences worth stating explicitly, because they
-- shape the application code: `INSERT ... ON CONFLICT DO UPDATE` against an audit
-- table fails; a "fix a typo in history" migration fails; `DELETE FROM
-- audit_entries WHERE ...` fails as cargoexec_owner; and TRUNCATE fails even in a
-- test teardown -- test databases are dropped and recreated rather than
-- truncated (§8.2).

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

-- Why deferred constraint triggers. `DEFERRABLE INITIALLY DEFERRED` lets the
-- receipt transaction insert the entry *before* its audit entry (the audit row
-- has a foreign key to the entry, so the order is forced) while still refusing
-- to commit the combination if the audit entry never arrives. The invariant is
-- checked at COMMIT, which is the only moment at which it is meaningful. A
-- service that "forgets" to audit does not produce an unaudited change -- it
-- produces a failed transaction and a 500 RECEIPT_FAILED/DECISION_FAILED
-- telling the specialist nothing was saved.
