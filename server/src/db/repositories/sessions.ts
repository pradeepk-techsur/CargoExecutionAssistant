import type { Queryable } from './types.js';
import type { SpecialistRow } from './specialists.js';

/**
 * Hand-written parameterised SQL for the `sessions` table (migration 0001).
 *
 * No business logic: no token generation, no hashing, no expiry decisions. The
 * service constructs the 32-byte SHA-256 `Buffer`s and the timestamps; this
 * module only reads and writes rows. Every value is a `$n` placeholder (R-L8).
 *
 * `token_hash` and `csrf_token_hash` are `bytea` of EXACTLY 32 bytes — pass a
 * raw `Buffer`, never a hex string. `pg` binds a `Buffer` to `bytea` directly;
 * a 64-character hex string would be rejected by `sessions_token_hash_len_chk`
 * (octet_length = 32), which is the constraint doing its job.
 */

export type SessionRow = {
  id: string;
  specialist_id: string;
  csrf_token_hash: Buffer;
  created_at: Date;
  absolute_expires_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
  revocation_reason: string | null;
};

/** Insert a freshly minted session. Returns the new session id. */
export async function insertSession(
  q: Queryable,
  input: {
    specialist_id: string;
    token_hash: Buffer;
    csrf_token_hash: Buffer;
    created_at: Date;
    absolute_expires_at: Date;
    user_agent: string | null;
  },
): Promise<{ id: string }> {
  const res = await q.query<{ id: string }>(
    `INSERT INTO sessions (
       specialist_id, token_hash, csrf_token_hash,
       created_at, absolute_expires_at, last_seen_at, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $4, $6)
     RETURNING id`,
    [
      input.specialist_id,
      input.token_hash,
      input.csrf_token_hash,
      input.created_at,
      input.absolute_expires_at,
      input.user_agent,
    ],
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('insertSession: INSERT returned no id');
  }
  return row;
}

/**
 * Resolve a session (and its specialist principal) by the SHA-256 of the raw
 * token. The specialist is joined so a single round trip resolves the principal.
 *
 * The select list deliberately OMITS `token_hash`: nothing downstream needs it,
 * and a row that carries session-token material is a row that could be logged
 * (§4.7, T-02-17). `csrf_token_hash` IS returned — the middleware needs it to
 * validate the double-submit CSRF token on state-changing requests.
 */
export async function findSessionByTokenHash(
  q: Queryable,
  tokenHash: Buffer,
): Promise<(SessionRow & { specialist: SpecialistRow }) | null> {
  const res = await q.query<{
    id: string;
    specialist_id: string;
    csrf_token_hash: Buffer;
    created_at: Date;
    absolute_expires_at: Date;
    last_seen_at: Date;
    revoked_at: Date | null;
    revocation_reason: string | null;
    sp_id: string;
    sp_email: string;
    sp_display_name: string;
    sp_password_hash: string;
    sp_is_active: boolean;
  }>(
    `SELECT
       s.id, s.specialist_id, s.csrf_token_hash,
       s.created_at, s.absolute_expires_at, s.last_seen_at,
       s.revoked_at, s.revocation_reason,
       sp.id            AS sp_id,
       sp.email         AS sp_email,
       sp.display_name  AS sp_display_name,
       sp.password_hash AS sp_password_hash,
       sp.is_active     AS sp_is_active
     FROM sessions s
     JOIN specialists sp ON sp.id = s.specialist_id
     WHERE s.token_hash = $1`,
    [tokenHash],
  );
  const r = res.rows[0];
  if (r === undefined) {
    return null;
  }
  return {
    id: r.id,
    specialist_id: r.specialist_id,
    csrf_token_hash: r.csrf_token_hash,
    created_at: r.created_at,
    absolute_expires_at: r.absolute_expires_at,
    last_seen_at: r.last_seen_at,
    revoked_at: r.revoked_at,
    revocation_reason: r.revocation_reason,
    specialist: {
      id: r.sp_id,
      email: r.sp_email,
      display_name: r.sp_display_name,
      password_hash: r.sp_password_hash,
      is_active: r.sp_is_active,
    },
  };
}

/**
 * Look up a session by its id (used when rotating the CSRF token on a GET, where
 * the principal is already resolved from the cookie and only the row's expiry is
 * needed). Returns the session's own columns; the specialist is NOT joined here.
 */
export async function findSessionById(
  q: Queryable,
  sessionId: string,
): Promise<SessionRow | null> {
  const res = await q.query<SessionRow>(
    `SELECT id, specialist_id, csrf_token_hash,
            created_at, absolute_expires_at, last_seen_at,
            revoked_at, revocation_reason
       FROM sessions
      WHERE id = $1`,
    [sessionId],
  );
  return res.rows[0] ?? null;
}

/**
 * Replace a session's `csrf_token_hash` with a freshly minted digest. Pass a
 * raw 32-byte `Buffer` (the SHA-256 of the new token), never a hex string —
 * `sessions_csrf_hash_len_chk` enforces octet_length = 32.
 */
export async function updateCsrfTokenHash(
  q: Queryable,
  sessionId: string,
  csrfTokenHash: Buffer,
): Promise<void> {
  await q.query(`UPDATE sessions SET csrf_token_hash = $2 WHERE id = $1`, [
    sessionId,
    csrfTokenHash,
  ]);
}

/**
 * Revoke a session, writing `revoked_at` and `revocation_reason` TOGETHER in one
 * statement — `sessions_revocation_chk` rejects either column alone.
 *
 * Guarded by `revoked_at IS NULL` so it is idempotent and a race between a
 * sign-out and an expiry cannot overwrite the first-recorded reason: the row
 * keeps what actually happened first. A second call is a no-op.
 */
export async function revokeSession(
  q: Queryable,
  sessionId: string,
  reason: 'SIGNED_OUT' | 'EXPIRED',
  at: Date,
): Promise<void> {
  await q.query(
    `UPDATE sessions
        SET revoked_at = $2, revocation_reason = $3
      WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId, at, reason],
  );
}

/** Advance a session's `last_seen_at`. The caller decides whether the 60-second throttle has elapsed. */
export async function updateLastSeen(q: Queryable, sessionId: string, at: Date): Promise<void> {
  await q.query(`UPDATE sessions SET last_seen_at = $2 WHERE id = $1`, [sessionId, at]);
}
