import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import { fixedClock } from '../../src/clock.js';
import {
  signIn,
  signOut,
  loadSessionByToken,
  expireSession,
  __resetThrottle,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
} from '../../src/services/session.service.js';
import { createSpecialist } from '../../src/cli/create-specialist.js';

// Real-PostgreSQL integration coverage of the identity layer (F1). One fresh,
// migrated database for the whole suite (dropped at the end — the audit tables
// cannot be truncated, §8.2), so every assertion runs against the real
// constraints and privileges. The app pool is used for the request-path calls;
// the CLI test uses the owner URL.

function sha256(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

describe('session service (identity) integration', () => {
  let db: TestDatabase;
  let pool: Pool;

  beforeAll(async () => {
    db = await createTestDatabase();
    pool = new Pool({ connectionString: db.appUrl });
  });

  afterAll(async () => {
    await pool.end();
    await dropTestDatabase(db);
  });

  beforeEach(() => {
    __resetThrottle();
  });

  it('1. sign-in succeeds: returns a session, tokens, and an absoluteExpiresAt exactly 8h after created_at', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const start = new Date('2026-01-01T09:00:00.000Z');
    const clock = fixedClock(start);

    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD }, clock);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.sessionId).toMatch(/[0-9a-f-]{36}/);
    expect(typeof res.token).toBe('string');
    expect(typeof res.csrfToken).toBe('string');
    expect(res.absoluteExpiresAt.getTime()).toBe(start.getTime() + SESSION_ABSOLUTE_MS);

    const row = await pool.query<{ created_at: Date; absolute_expires_at: Date }>(
      'SELECT created_at, absolute_expires_at FROM sessions WHERE id = $1',
      [res.sessionId],
    );
    const { created_at, absolute_expires_at } = row.rows[0]!;
    expect(absolute_expires_at.getTime() - created_at.getTime()).toBe(SESSION_ABSOLUTE_MS);
  });

  it('2. only hashes are stored: token_hash and csrf_token_hash are 32 bytes and never the raw token', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const row = await pool.query<{ token_hash: Buffer; csrf_token_hash: Buffer }>(
      'SELECT token_hash, csrf_token_hash FROM sessions WHERE id = $1',
      [res.sessionId],
    );
    const { token_hash, csrf_token_hash } = row.rows[0]!;
    expect(token_hash.length).toBe(32);
    expect(csrf_token_hash.length).toBe(32);
    // Stored value is the SHA-256 of the raw token, not the token itself.
    expect(token_hash.equals(sha256(res.token))).toBe(true);
    expect(token_hash.toString('utf8')).not.toContain(res.token);

    // No row anywhere contains the raw token text.
    const raw = await pool.query(
      "SELECT count(*)::int AS n FROM sessions WHERE encode(token_hash,'escape') = $1",
      [res.token],
    );
    expect(raw.rows[0]!.n).toBe(0);
  });

  it('3. unknown email and wrong password are indistinguishable in shape and comparable in timing', async () => {
    const sp = await createTestSpecialist(db.appUrl);

    const t1 = Date.now();
    const wrongPw = await signIn(pool, { email: sp.email, password: 'definitely-not-the-password' });
    const wrongPwMs = Date.now() - t1;
    __resetThrottle();

    const t2 = Date.now();
    const unknown = await signIn(pool, {
      email: `nobody-${Date.now()}@cbp.example.gov`,
      password: 'definitely-not-the-password',
    });
    const unknownMs = Date.now() - t2;

    // Structural guarantee: byte-identical failure shape.
    expect(wrongPw).toEqual({ ok: false, reason: 'AUTH_FAILED' });
    expect(unknown).toEqual({ ok: false, reason: 'AUTH_FAILED' });

    // Corroborating (deliberately loose) timing check — the real guarantee is
    // the dummy-hash verify running on the unknown-email branch; this only
    // confirms it is actually running. Keep the bound generous to avoid flake.
    const slower = Math.max(wrongPwMs, unknownMs);
    const faster = Math.max(1, Math.min(wrongPwMs, unknownMs));
    expect(slower).toBeLessThan(faster * 3);
  });

  it('4. deactivated account returns ACCOUNT_INACTIVE and creates no sessions row', async () => {
    const sp = await createTestSpecialist(db.appUrl, { is_active: false });
    const before = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM sessions WHERE specialist_id = $1',
      [sp.id],
    );
    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    expect(res).toEqual({ ok: false, reason: 'ACCOUNT_INACTIVE' });

    const after = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM sessions WHERE specialist_id = $1',
      [sp.id],
    );
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
  });

  it('5. loadSessionByToken: VALID for a fresh token, ABSENT for a random token, REVOKED after signOut, INACTIVE after deactivation', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const valid = await loadSessionByToken(pool, res.token);
    expect(valid.state).toBe('VALID');

    const absent = await loadSessionByToken(pool, 'this-is-not-a-real-token');
    expect(absent.state).toBe('ABSENT');

    await signOut(pool, res.sessionId);
    const revoked = await loadSessionByToken(pool, res.token);
    expect(revoked.state).toBe('REVOKED');

    // Deactivation is only observable on a non-revoked session, so make a fresh one.
    const res2 = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    expect(res2.ok).toBe(true);
    if (!res2.ok) return;
    await pool.query('UPDATE specialists SET is_active = false WHERE id = $1', [sp.id]);
    const inactive = await loadSessionByToken(pool, res2.token);
    expect(inactive.state).toBe('INACTIVE');
  });

  it('6. idle expiry with an injected clock is EXPIRED and recorded as revocation_reason = EXPIRED', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const start = new Date('2026-02-01T09:00:00.000Z');
    const clock = fixedClock(start);
    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD }, clock);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // Advance past the idle window; absolute limit is not yet reached.
    clock.advance(SESSION_IDLE_MS + 1);
    const load = await loadSessionByToken(pool, res.token, clock);
    expect(load.state).toBe('EXPIRED');

    await expireSession(pool, res.sessionId, clock);
    const row = await pool.query<{ revoked_at: Date | null; revocation_reason: string | null }>(
      'SELECT revoked_at, revocation_reason FROM sessions WHERE id = $1',
      [res.sessionId],
    );
    expect(row.rows[0]!.revoked_at).not.toBeNull();
    expect(row.rows[0]!.revocation_reason).toBe('EXPIRED');
  });

  it('7. absolute expiry with an injected clock: still EXPIRED even with last_seen_at kept fresh', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const start = new Date('2026-03-01T09:00:00.000Z');
    const clock = fixedClock(start);
    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD }, clock);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // Keep last_seen_at fresh at the far edge, but pass the absolute cap.
    clock.advance(SESSION_ABSOLUTE_MS + 1);
    await pool.query('UPDATE sessions SET last_seen_at = $2 WHERE id = $1', [
      res.sessionId,
      clock.now(),
    ]);
    const load = await loadSessionByToken(pool, res.token, clock);
    expect(load.state).toBe('EXPIRED');
  });

  it('8. sign-out sets SIGNED_OUT; a second sign-out does not overwrite the first reason', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    await signOut(pool, res.sessionId);
    const first = await pool.query<{ revoked_at: Date; revocation_reason: string }>(
      'SELECT revoked_at, revocation_reason FROM sessions WHERE id = $1',
      [res.sessionId],
    );
    expect(first.rows[0]!.revocation_reason).toBe('SIGNED_OUT');
    const firstRevokedAt = first.rows[0]!.revoked_at.getTime();

    // A later expire attempt must not overwrite the recorded sign-out.
    await expireSession(pool, res.sessionId);
    const second = await pool.query<{ revoked_at: Date; revocation_reason: string }>(
      'SELECT revoked_at, revocation_reason FROM sessions WHERE id = $1',
      [res.sessionId],
    );
    expect(second.rows[0]!.revocation_reason).toBe('SIGNED_OUT');
    expect(second.rows[0]!.revoked_at.getTime()).toBe(firstRevokedAt);
  });

  it('9. concurrent sessions: two sign-ins yield two rows; signing out one leaves the other VALID (FR-1.11)', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const a = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    const b = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.sessionId).not.toBe(b.sessionId);

    await signOut(pool, a.sessionId);
    expect((await loadSessionByToken(pool, a.token)).state).toBe('REVOKED');
    expect((await loadSessionByToken(pool, b.token)).state).toBe('VALID');
  });

  it('10. no audit entry is written by sign-in, expiry or sign-out (FR-1.12)', async () => {
    const sp = await createTestSpecialist(db.appUrl);
    const start = new Date('2026-04-01T09:00:00.000Z');
    const clock = fixedClock(start);
    const res = await signIn(pool, { email: sp.email, password: TEST_PASSWORD }, clock);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    clock.advance(SESSION_IDLE_MS + 1);
    await expireSession(pool, res.sessionId, clock);

    const res2 = await signIn(pool, { email: sp.email, password: TEST_PASSWORD });
    if (res2.ok) await signOut(pool, res2.sessionId);

    const entries = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM audit_entries');
    const values = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM audit_entry_values');
    expect(entries.rows[0]!.n).toBe(0);
    expect(values.rows[0]!.n).toBe(0);
  });

  it('11. createSpecialist is idempotent: true then false, and exactly one row', async () => {
    const email = `cli-${Date.now()}@cbp.example.gov`;
    const first = await createSpecialist(db.ownerUrl, {
      email,
      display_name: 'CLI Specialist',
      password: 'a-strong-enough-password',
    });
    expect(first.created).toBe(true);

    const second = await createSpecialist(db.ownerUrl, {
      email,
      display_name: 'CLI Specialist',
      password: 'a-strong-enough-password',
    });
    expect(second.created).toBe(false);
    expect(second.id).toBe(first.id);

    const rows = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM specialists WHERE email = $1',
      [email],
    );
    expect(rows.rows[0]!.n).toBe(1);

    // And the created account can actually sign in.
    const res = await signIn(pool, { email, password: 'a-strong-enough-password' });
    expect(res.ok).toBe(true);
  });
});
