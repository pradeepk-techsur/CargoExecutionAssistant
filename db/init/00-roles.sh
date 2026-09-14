#!/bin/bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- pgcrypto is created here as superuser as well as in migration 0001, so
  -- gen_random_uuid() is available regardless of which role migrates first.
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- Three DATABASE roles. None of them is an application role: CargoExec has
  -- exactly one application role, 'cargo specialist', which is not represented
  -- in the database privilege system at all (FRD Y0 §Roles, F1 FR-1.1).
  CREATE ROLE cargoexec_owner LOGIN PASSWORD '${CARGOEXEC_OWNER_PASSWORD}' CREATEDB;
  CREATE ROLE cargoexec_app   LOGIN PASSWORD '${CARGOEXEC_APP_PASSWORD}';
  CREATE ROLE cargoexec_ai    LOGIN PASSWORD '${CARGOEXEC_AI_PASSWORD}';

  -- The owner owns the schema and is used ONLY by the migration runner.
  ALTER DATABASE ${POSTGRES_DB} OWNER TO cargoexec_owner;
  ALTER SCHEMA public OWNER TO cargoexec_owner;

  -- Neither runtime role may create objects.
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL
