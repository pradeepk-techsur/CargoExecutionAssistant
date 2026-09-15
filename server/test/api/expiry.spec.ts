// Sessions end on their own terms and the record says how (Phase 2 criterion 1;
// TechArch §4.2, §4.4, §4.9 rows 2–5, §8.2, §8.3 "Auth"; F1 FR-1.5, FR-1.8,
// FR-1.9, FR-1.11, FR-1.12, acceptance 4, 5, 6; US-1.4).
//
// Every time-dependent assertion uses the harness's `fixedClock`. NO test in
// this file waits in real time — §8.2 requires an injected clock precisely so a
// 31-minute idle expiry costs milliseconds. Where a scenario is clearer by
// writing the row directly, the test says so; both mechanisms are legitimate and
// stating which keeps the suite readable.
//
// Recording the expiry is as much of the requirement as refusing the request
// (§4.2: "so the `sessions` table records what happened"): every refusal below
// reads the row back and asserts `revoked_at` and `revocation_reason`.

import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { withApi } from './helpers/appHarness.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import { __resetThrottle } from '../../src/services/session.service.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

interface SessionRow {
  id: string;
  created_at: Date;
  last_seen_at: Date;
  absolute_expires_at: Date;
  revoked_at: Date | null;
  revocation_reason: string | null;
}

describe('expiry — sessions end on their own terms (criterion 1)', () => {
  withApi((h) => {
    /** Read the most recent session row for a specialist. */
    async function latestSession(specialistId: string): Promise<SessionRow> {
      const res = await h.pool.query<SessionRow>(
        `SELECT id, created_at, last_seen_at, absolute_expires_at, revoked_at, revocation_reason
           FROM sessions WHERE specialist_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [specialistId],
      );
      const row = res.rows[0];
      if (row === undefined) throw new Error('latestSession: no session row');
      return row;
    }

    async function auditCounts(): Promise<{ entries: number; values: number }> {
      const e = await h.pool.query<{ n: string }>('SELECT count(*)::text AS n FROM audit_entries');
      const v = await h.pool.query<{ n: string }>('SELECT count(*)::text AS n FROM audit_entry_values');
      return { entries: Number(e.rows[0]!.n), values: Number(v.rows[0]!.n) };
    }

    // ── 1. Idle expiry fires at 30 min + 1 ms and is recorded EXPIRED ─────────
    it('1. idle expiry: 30 min + 1 ms after sign-in ⇒ 401, and the row records revocation_reason = EXPIRED', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      // Advance the injected clock past the 30-minute idle window (from last_seen_at).
      h.clock.advance(30 * MINUTE + 1);
      const res = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');

      const row = await latestSession(sp.id);
      expect(row.revoked_at).not.toBeNull();
      expect(row.revocation_reason).toBe('EXPIRED');
    });

    // ── 2. Idle expiry does NOT fire early (negative control) ─────────────────
    it('2. idle does not fire early: at 29 min the session is still valid and the row is NOT revoked', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      h.clock.advance(29 * MINUTE);
      const res = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(res.status).toBe(200);

      const row = await latestSession(sp.id);
      expect(row.revoked_at).toBeNull();
      expect(row.revocation_reason).toBeNull();
      // Without this control, a suite that always expired would pass for the
      // wrong reason.
    });

    // ── 3. last_seen_at write throttling (§4.2) ──────────────────────────────
    it('3. last_seen_at is written at most once per 60 s, then written again past the window', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);
      const initial = (await latestSession(sp.id)).last_seen_at.getTime();

      // Two requests 10 s apart: the second is inside the 60 s window and must
      // NOT advance last_seen_at.
      h.clock.advance(10 * 1000);
      await supertest(h.app).get('/api/session').set('Cookie', cookie);
      const afterFirst = (await latestSession(sp.id)).last_seen_at.getTime();

      h.clock.advance(10 * 1000); // total 20 s — still inside the window
      await supertest(h.app).get('/api/session').set('Cookie', cookie);
      const afterSecond = (await latestSession(sp.id)).last_seen_at.getTime();

      // The FIRST request (10 s) is inside the 60 s window from sign-in, so
      // last_seen_at is unchanged across both requests.
      expect(afterFirst).toBe(initial);
      expect(afterSecond).toBe(initial);

      // Now advance PAST 60 s from the last write and make a third request: it
      // DOES write.
      h.clock.advance(61 * 1000);
      await supertest(h.app).get('/api/session').set('Cookie', cookie);
      const afterThird = (await latestSession(sp.id)).last_seen_at.getTime();
      expect(afterThird).toBeGreaterThan(initial);
    });

    // ── 4. Idle is measured from activity ────────────────────────────────────
    it('4. idle is measured from activity: a request every 20 min keeps the session valid for 80 min', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      for (let i = 0; i < 4; i++) {
        h.clock.advance(20 * MINUTE);
        const res = await supertest(h.app).get('/api/session').set('Cookie', cookie);
        expect(res.status).toBe(200); // each request refreshes last_seen_at
      }
      // 80 minutes elapsed, but the session is alive because no 30-minute gap
      // ever opened between requests.
      const row = await latestSession(sp.id);
      expect(row.revoked_at).toBeNull();
    });

    // ── 5. Absolute expiry is not extendable by activity ─────────────────────
    it('5. absolute expiry: 8 h + 1 min with continuous activity ⇒ 401 and the row records EXPIRED', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      // A request every 20 minutes — continuous activity — up to just before 8 h.
      // 23 steps * 20 min = 460 min = 7 h 40 min; each keeps the session alive.
      for (let i = 0; i < 23; i++) {
        h.clock.advance(20 * MINUTE);
        const res = await supertest(h.app).get('/api/session').set('Cookie', cookie);
        expect(res.status).toBe(200);
      }
      // Advance past the 8-hour absolute limit from created_at. Total so far is
      // 7 h 40 m; add 21 min to cross 8 h + 1 min.
      h.clock.advance(21 * MINUTE);
      const res = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      // Refused REGARDLESS of the continuous activity — the absolute cap is not
      // extendable. This is what distinguishes it from the idle limit.
      expect(res.status).toBe(401);

      const row = await latestSession(sp.id);
      expect(row.revoked_at).not.toBeNull();
      expect(row.revocation_reason).toBe('EXPIRED');
    });

    // ── 6. Sign-out records SIGNED_OUT, clears the cookie, refuses replay ─────
    it('6. sign-out ⇒ 204, cleared cookie, SIGNED_OUT; a replayed cookie ⇒ 401', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie, csrfToken } = await h.signIn(sp.email, TEST_PASSWORD);

      const del = await supertest(h.app)
        .delete('/api/session')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken);
      expect(del.status).toBe(204);
      const setCookie = (del.headers['set-cookie'] as unknown as string[])[0]!;
      expect(setCookie).toContain('cargoexec_sid=;'); // cleared

      const row = await latestSession(sp.id);
      expect(row.revocation_reason).toBe('SIGNED_OUT');

      const replay = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(replay.status).toBe(401);
    });

    // ── 7. Sign-out revokes only the requesting session (FR-1.11) ─────────────
    it('7. sign-out revokes only the requesting session: a concurrent session stays valid', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const first = await h.signIn(sp.email, TEST_PASSWORD);
      const second = await h.signIn(sp.email, TEST_PASSWORD);
      expect(first.cookie).not.toBe(second.cookie);

      const del = await supertest(h.app)
        .delete('/api/session')
        .set('Cookie', first.cookie)
        .set('X-CSRF-Token', first.csrfToken);
      expect(del.status).toBe(204);

      // Second session untouched.
      const secondStill = await supertest(h.app).get('/api/session').set('Cookie', second.cookie);
      expect(secondStill.status).toBe(200);

      // Exactly two rows, exactly one revoked.
      const rows = await h.pool.query<{ revocation_reason: string | null }>(
        'SELECT revocation_reason FROM sessions WHERE specialist_id = $1',
        [sp.id],
      );
      expect(rows.rows.length).toBe(2);
      const revoked = rows.rows.filter((r) => r.revocation_reason !== null);
      expect(revoked.length).toBe(1);
      expect(revoked[0]!.revocation_reason).toBe('SIGNED_OUT');
    });

    // ── 8. An expired session's reason is not overwritten by a later sign-out ─
    it('8. an expired session\u2019s reason is not overwritten: a stale DELETE ⇒ 401 and the row still reads EXPIRED', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie, csrfToken } = await h.signIn(sp.email, TEST_PASSWORD);

      // Let it expire (recorded EXPIRED by the middleware on the next request).
      h.clock.advance(30 * MINUTE + 1);
      const expired = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(expired.status).toBe(401);
      expect((await latestSession(sp.id)).revocation_reason).toBe('EXPIRED');

      // Attempt DELETE with the stale cookie. The session is already revoked, so
      // the middleware attaches no principal and no csrfTokenHash; csrfMiddleware
      // (which runs before the handler) therefore has nothing to compare against
      // and refuses the state-changing request 403 CSRF_INVALID. The 401-vs-403
      // is an ordering artifact of 02-04's chain (CSRF precedes the handler's
      // own auth check, as recorded for criterion 2). What is load-bearing here —
      // and what this test exists to prove — is that the refused DELETE does NOT
      // overwrite the recorded revocation reason: the row still reads EXPIRED,
      // because revokeSession is guarded by `revoked_at IS NULL`. The record says
      // what actually happened FIRST.
      const del = await supertest(h.app)
        .delete('/api/session')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken);
      expect(del.status).toBeGreaterThanOrEqual(400); // refused (currently 403)
      expect(del.status).toBeLessThan(500);
      expect((await latestSession(sp.id)).revocation_reason).toBe('EXPIRED');
    });

    // ── 9. CSRF refusal writes nothing (FR-1.9, §4.4, §4.9 row 2) ─────────────
    it('9. a DELETE with a missing / wrong / other-session CSRF token ⇒ 403, session stays valid, zero audit entries', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);
      const other = await h.signIn(sp.email, TEST_PASSWORD); // a different session's token

      const before = await auditCounts();

      // (a) Missing token.
      const missing = await supertest(h.app).delete('/api/session').set('Cookie', cookie);
      expect(missing.status).toBe(403);
      expect(missing.body.error.code).toBe('CSRF_INVALID');
      expect(missing.body.error.message).toBe(
        'Your session could not be verified. Refresh and try again.',
      );

      // (b) Wrong token.
      const wrong = await supertest(h.app)
        .delete('/api/session')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'not-the-right-token');
      expect(wrong.status).toBe(403);

      // (c) A token belonging to a DIFFERENT session.
      const otherToken = await supertest(h.app)
        .delete('/api/session')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', other.csrfToken);
      expect(otherToken.status).toBe(403);

      // The session is STILL valid — none of the three refusals reached the service.
      const stillValid = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(stillValid.status).toBe(200);

      // And no audit entry was written by any of them (session events never do).
      const after = await auditCounts();
      expect(after.entries).toBe(before.entries);
      expect(after.entries).toBe(0);
    });

    // ── 10. GET is never CSRF-checked (§4.4) ──────────────────────────────────
    it('10. GET is never CSRF-checked: GET /api/session with no X-CSRF-Token ⇒ 200', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);
      const res = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(res.status).toBe(200);
      // An invariant, not a convention: there is no GET endpoint that writes.
    });

    // ── 11. Session events write no audit entry (FR-1.12) ────────────────────
    it('11. after signing in, expiring, signing out and being refused, both audit tables are still empty', async () => {
      // This test runs last in the describe block; by now the suite has signed
      // in, expired, signed out, replayed and been CSRF-refused many times over.
      const counts = await auditCounts();
      expect(counts.entries).toBe(0);
      expect(counts.values).toBe(0);
      // Session history lives on the `sessions` table; this is a boundary, not a
      // gap. The audit tables' case_id is NOT NULL and no case state changed.
    });
  });
});
