import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for the `specialists` table (migration 0001).
 *
 * This module holds NO business logic: no email normalisation, no password
 * hashing, no credential verification, no error mapping. It returns rows or
 * `null`. The service layer (`services/session.service.ts`,
 * `cli/create-specialist.ts`) owns normalisation and hashing and passes values
 * that are already correct. Every value is bound with a `$n` placeholder; no
 * caller value is ever interpolated into the statement text (R-L8, no-ORM rule).
 *
 * There is no `role`, `is_supervisor`, `permissions` or `scope` here because
 * there is no such column: every specialist has identical capability (F1
 * FR-1.1), and `schema.spec.ts` fails the build if one of those names ever
 * appears.
 */

export type SpecialistRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  is_active: boolean;
};

/**
 * Look up a specialist by email. The caller passes the email ALREADY NORMALISED
 * (trimmed and lower-cased): the column carries an `email = lower(email)` CHECK,
 * so a non-normalised value could never match a stored row anyway. We do NOT
 * `lower()` in SQL — doing so would defeat the `uq_specialists_email` index and
 * force a full scan.
 */
export async function findSpecialistByEmail(
  q: Queryable,
  email: string,
): Promise<SpecialistRow | null> {
  const res = await q.query<SpecialistRow>(
    `SELECT id, email, display_name, password_hash, is_active
       FROM specialists
      WHERE email = $1`,
    [email],
  );
  return res.rows[0] ?? null;
}

/** Look up a specialist by id (used when resolving a session's principal). */
export async function findSpecialistById(
  q: Queryable,
  id: string,
): Promise<SpecialistRow | null> {
  const res = await q.query<SpecialistRow>(
    `SELECT id, email, display_name, password_hash, is_active
       FROM specialists
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

/**
 * Insert one specialist. Idempotent by email via `ON CONFLICT DO NOTHING`, so
 * the bootstrap path (plan 02-08) can run unconditionally: when the row already
 * existed nothing is returned and the caller re-selects. The email is expected
 * already-normalised and the password already-hashed.
 */
export async function insertSpecialist(
  q: Queryable,
  input: { email: string; display_name: string; password_hash: string },
): Promise<{ id: string } | null> {
  const res = await q.query<{ id: string }>(
    `INSERT INTO specialists (email, display_name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [input.email, input.display_name, input.password_hash],
  );
  return res.rows[0] ?? null;
}

/** Record the last successful sign-in time for a specialist. */
export async function touchLastSignIn(q: Queryable, id: string, at: Date): Promise<void> {
  await q.query(`UPDATE specialists SET last_sign_in_at = $2 WHERE id = $1`, [id, at]);
}
