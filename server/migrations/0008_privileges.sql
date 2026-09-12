-- Up Migration
-- (applied in the same migration set as the tables it protects, so no
-- deployment window exists in which the audit store is mutable -- F0 FR-0.17,
-- FR-Y0.2)

-- Roles. NONE of these is an application role: CargoExec has exactly one
-- application role, `cargo specialist`, which is not represented in the
-- database privilege system at all (F1 FR-1.1).
--   cargoexec_owner : owns the schema; used ONLY by the migration runner
--   cargoexec_app   : the request-path connection pool
--   cargoexec_ai    : the recommendation worker's connection pool  (A-1)

-- Mechanical prerequisite: without schema USAGE a granted table privilege is
-- unreachable. This grants visibility only; CREATE is revoked below.
GRANT USAGE ON SCHEMA public TO cargoexec_app, cargoexec_ai;

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
