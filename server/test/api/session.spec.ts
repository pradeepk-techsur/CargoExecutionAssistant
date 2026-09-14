// The session-endpoint suite (TechArch §3.3, §8.3 "Auth"; F1 acceptance 3, 6,
// 8; FR-1.7, FR-1.9, FR-1.11).
//
// supertest against the harness app and a real migrated database. Every
// assertion reads a value the SPA or the audit trail actually depends on —
// status, body shape, cookie attributes, header presence. Nothing asserts on
// prose.

import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { withApi, extractSessionCookie } from './helpers/appHarness.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import { __resetThrottle } from '../../src/services/session.service.js';

/** Strip the per-request request_id so two failure bodies can be compared. */
function withoutRequestId(body: unknown): unknown {
  const b = JSON.parse(JSON.stringify(body)) as { error?: { request_id?: unknown } };
  if (b.error !== undefined) {
    delete b.error.request_id;
  }
  return b;
}

describe('session endpoints', () => {
  withApi((h) => {
    it('1. sign-in success: 201, exact SessionDto, cookie with governed attributes and no Secure/Domain/Max-Age', async () => {
      const sp = await createTestSpecialist(h.db.appUrl);
      const res = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: sp.email, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body.specialist).toEqual({
        id: sp.id,
        email: sp.email,
        display_name: sp.display_name,
      });
      expect(typeof res.body.csrf_token).toBe('string');
      expect(res.body.csrf_token.length).toBeGreaterThan(0);

      // absolute_expires_at is an RFC 3339 UTC string 8h after the fixed clock.
      const exp = new Date(res.body.session.absolute_expires_at);
      expect(res.body.session.absolute_expires_at).toMatch(/Z$/);
      expect(exp.getTime()).toBe(h.clock.now().getTime() + 8 * 60 * 60 * 1000);

      const setCookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
      expect(setCookie).toContain('cargoexec_sid=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/');
      expect(setCookie).toContain('SameSite=Lax');
      // Not HTTPS in the test config ⇒ no Secure, and never Domain/Max-Age/Expires.
      expect(setCookie).not.toContain('Secure');
      expect(setCookie).not.toContain('Domain');
      expect(setCookie).not.toContain('Max-Age');
      expect(setCookie).not.toContain('Expires');
    });

    it('2. unknown email and wrong password produce byte-identical 401 bodies (F1 acceptance 3)', async () => {
      const sp = await createTestSpecialist(h.db.appUrl);
      __resetThrottle();

      const wrongPw = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: sp.email, password: 'this-is-not-the-password' });
      __resetThrottle();
      const unknown = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: `nobody-${Date.now()}@cbp.example.gov`, password: 'this-is-not-the-password' });

      expect(wrongPw.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrongPw.body.error.code).toBe('AUTH_FAILED');
      // After removing the per-request request_id, the bodies are identical.
      expect(withoutRequestId(wrongPw.body)).toEqual(withoutRequestId(unknown.body));
    });

    it('3. deactivated account ⇒ 403 ACCOUNT_INACTIVE and no Set-Cookie', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl, { is_active: false });
      const res = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: sp.email, password: TEST_PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
      expect(res.body.error.message).toBe('This account is not active.');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('4. malformed body: unknown property ⇒ 422 naming it; long email ⇒ 422; 5-char password ⇒ 401 AUTH_FAILED', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);

      // Unknown property (a client-supplied actor) ⇒ 422 with a detail naming it.
      const extra = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: sp.email, password: TEST_PASSWORD, specialist_id: 'x' });
      expect(extra.status).toBe(422);
      expect(extra.body.error.code).toBe('REQUEST_MALFORMED');
      const fields = (extra.body.error.details ?? []).map((d: { field?: string }) => d.field);
      expect(fields).toContain('specialist_id');

      // Email over 254 chars ⇒ 422.
      const longEmail = 'a'.repeat(250) + '@cbp.example.gov';
      const long = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: longEmail, password: TEST_PASSWORD });
      expect(long.status).toBe(422);
      expect(long.body.error.code).toBe('REQUEST_MALFORMED');

      // A 5-char password ⇒ 401 AUTH_FAILED, NOT 422 (F1 Validation): a length
      // error would describe the credential policy of an existing account.
      __resetThrottle();
      const shortPw = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: sp.email, password: 'short' });
      expect(shortPw.status).toBe(401);
      expect(shortPw.body.error.code).toBe('AUTH_FAILED');
    });

    it('5. throttle: a sixth failure ⇒ 429 TOO_MANY_ATTEMPTS with Retry-After; identical for a non-existent email', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      for (let i = 0; i < 5; i++) {
        const r = await supertest(h.app)
          .post('/api/session')
          .set('Content-Type', 'application/json')
          .send({ email: sp.email, password: 'wrong-password-attempt' });
        expect(r.status).toBe(401);
      }
      const sixth = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: sp.email, password: 'wrong-password-attempt' });
      expect(sixth.status).toBe(429);
      expect(sixth.body.error.code).toBe('TOO_MANY_ATTEMPTS');
      expect(sixth.headers['retry-after']).toBeDefined();
      expect(Number(sixth.headers['retry-after'])).toBeGreaterThan(0);

      // The same sixth attempt for an email that does not exist is identical:
      // build up five failures for a fresh unknown email, then a sixth.
      __resetThrottle();
      const ghost = `ghost-${Date.now()}@cbp.example.gov`;
      for (let i = 0; i < 5; i++) {
        await supertest(h.app)
          .post('/api/session')
          .set('Content-Type', 'application/json')
          .send({ email: ghost, password: 'wrong-password-attempt' });
      }
      const ghostSixth = await supertest(h.app)
        .post('/api/session')
        .set('Content-Type', 'application/json')
        .send({ email: ghost, password: 'wrong-password-attempt' });
      expect(ghostSixth.status).toBe(429);
      expect(withoutRequestId(ghostSixth.body)).toEqual(withoutRequestId(sixth.body));
    });

    it('6. GET /api/session: 200 with the cookie; 401 UNAUTHENTICATED without, no WWW-Authenticate, no redirect', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      const withCookie = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(withCookie.status).toBe(200);
      expect(withCookie.body.specialist.email).toBe(sp.email);
      expect(typeof withCookie.body.csrf_token).toBe('string');
      expect(typeof withCookie.body.session.absolute_expires_at).toBe('string');

      const without = await supertest(h.app).get('/api/session');
      expect(without.status).toBe(401);
      expect(without.body).toEqual({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Sign in to continue.',
          request_id: without.body.error.request_id,
        },
      });
      expect(without.headers['www-authenticate']).toBeUndefined();
      expect(without.headers['location']).toBeUndefined();
    });

    it('7. DELETE /api/session with cookie + CSRF ⇒ 204, cleared cookie, SIGNED_OUT; replay ⇒ 401', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie, csrfToken } = await h.signIn(sp.email, TEST_PASSWORD);

      const del = await supertest(h.app)
        .delete('/api/session')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken);
      expect(del.status).toBe(204);
      const cleared = extractSessionCookie(
        del.headers['set-cookie'] as unknown as string[],
      );
      expect(cleared).toBe('cargoexec_sid=');

      // The sessions row now records SIGNED_OUT.
      const row = await h.pool.query<{ revocation_reason: string | null }>(
        'SELECT revocation_reason FROM sessions WHERE specialist_id = $1 ORDER BY created_at DESC LIMIT 1',
        [sp.id],
      );
      expect(row.rows[0]!.revocation_reason).toBe('SIGNED_OUT');

      // Replaying the same cookie afterwards ⇒ 401 (F1 acceptance 6).
      const replay = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(replay.status).toBe(401);
    });

    it('8. DELETE /api/session without the CSRF header ⇒ 403 CSRF_INVALID and the session stays valid (§4.4)', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      const del = await supertest(h.app).delete('/api/session').set('Cookie', cookie);
      expect(del.status).toBe(403);
      expect(del.body.error.code).toBe('CSRF_INVALID');

      // The request never reached the service: the session is STILL valid.
      const stillValid = await supertest(h.app).get('/api/session').set('Cookie', cookie);
      expect(stillValid.status).toBe(200);
    });

    it('9. concurrent sessions: sign in twice, sign out the first, the second still returns 200 (FR-1.11)', async () => {
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

      // The second session is untouched.
      const secondStill = await supertest(h.app).get('/api/session').set('Cookie', second.cookie);
      expect(secondStill.status).toBe(200);
      // And the first is revoked.
      const firstGone = await supertest(h.app).get('/api/session').set('Cookie', first.cookie);
      expect(firstGone.status).toBe(401);
    });

    it('10. conventions (§3.2): every /api response carries Cache-Control: no-store and X-Request-Id matching the body', async () => {
      __resetThrottle();
      const res = await supertest(h.app).get('/api/session');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.body.error.request_id).toBe(res.headers['x-request-id']);
    });

    it('11. method not allowed: PUT /api/session ⇒ 405 METHOD_NOT_ALLOWED', async () => {
      __resetThrottle();
      const res = await supertest(h.app)
        .put('/api/session')
        .set('Content-Type', 'application/json')
        .send({});
      expect(res.status).toBe(405);
      expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
