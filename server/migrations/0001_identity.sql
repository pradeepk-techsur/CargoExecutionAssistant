-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), digest()

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
-- No role, is_supervisor, permissions, or scope column: every row is a cargo
-- specialist with identical capability (F1 FR-1.1). No AI row, no SYSTEM row --
-- which is what makes decisions.decided_by structurally human (F11 §structural).

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
-- Raw tokens exist only in the client cookie; only SHA-256 hashes are stored.
-- No session-management screen and no admin surface reads this table.
