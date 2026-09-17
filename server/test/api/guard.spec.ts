// The unauthenticated matrix and the HTML redirect contract (Phase 2 criterion 2;
// TechArch §4.2, §4.9 row 1; F1 FR-1.7, acceptance 1 and 2; US-1.2).
//
// This suite is the executable form of one of the phase's five success criteria:
// nothing reaches case data without identification. It drives the FULL ten
// method/path pairs of TechArch §3.1 — including the seven that phases 3–6 will
// implement — from the exported `API_ROUTE_TABLE`, so a future eleventh route
// cannot be added without entering this assertion.
//
// ─────────────────────────────────────────────────────────────────────────────
// IDENTIFICATION PRECEDES ROUTING — the uniform 401, now enforced by a gate.
//
// Every §3.1 pair EXCEPT POST /api/session answers 401 UNAUTHENTICATED to a
// caller with no session — the ten implemented and unimplemented alike, and an
// unknown /api path too. This holds because `requireApiAuth` (plan 03-03) runs
// AFTER `sessionMiddleware` (which attaches `req.principal` from the cookie
// alone) and BEFORE `csrfMiddleware` and route matching. So:
//
//   GET    /api/session          no cookie → 401 UNAUTHENTICATED (gate)
//   DELETE /api/session          no cookie → 401 UNAUTHENTICATED (gate, NOT 403)
//   the 7 unimplemented pairs     no cookie → 401 UNAUTHENTICATED (gate, NOT 404)
//   GET    /api/unknown-path      no cookie → 401 UNAUTHENTICATED (gate, NOT 404)
//
// The uniform answer is DELIBERATE: an anonymous caller cannot probe which /api
// paths exist by comparing a 404 against a 401. The 404/405 distinction survives
// only for an AUTHENTICATED caller, to whom it discloses nothing.
//
// This closes the carry-forward recorded in 02-06-SUMMARY.md: the phase-2
// must_have "all ten §3.1 pairs answer 401 unauthenticated" (Phase 2 criterion
// 2) is now fully satisfied, so this suite evidences criterion 2 in full.
// ─────────────────────────────────────────────────────────────────────────────
//
// supertest against the harness app (serveStatic: false) and a real migrated
// database. Every assertion reads a value the SPA, the trail or the redirect
// contract actually depends on. Nothing asserts on prose.

import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { withApi } from './helpers/appHarness.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import { __resetThrottle } from '../../src/services/session.service.js';
import { API_ROUTE_TABLE } from '../../src/http/routes/index.js';
import { validateNextPath } from '../../src/http/htmlRouteGuard.js';

/** Substitute a concrete, well-formed value for each path parameter. */
function concretePath(path: string): string {
  return path
    .replace(':entryId', '11111111-1111-1111-1111-111111111111')
    .replace(':idOrReference', 'CE-2026-000001')
    .replace(':exceptionId', '22222222-2222-2222-2222-222222222222');
}

/** Issue a request of the given method against `app` with no cookie. */
function requestNoCookie(app: import('express').Express, method: string, path: string) {
  const agent = supertest(app);
  const m = method.toLowerCase() as 'get' | 'post' | 'delete';
  return agent[m](path);
}

// The protected UI document routes of TechArch §3.17, plus an unknown path.
const PROTECTED_UI_ROUTES = [
  '/',
  '/queue',
  '/entries/new',
  '/cases/CE-2026-000001',
  '/cases/CE-2026-000001/audit',
  '/some/unknown/screen',
];

// Hostile `next` values (FR-1.7): each must be discarded for /queue.
//
// NOTE on the 4096-character path: `validateNextPath` in 02-04 has NO length
// cap — a long path consisting only of unreserved characters is a structurally
// VALID same-origin path and is preserved. The plan listed a 4096-char path as
// "hostile", but the owning module treats length as immaterial (only structure
// matters), and a same-origin path of any length cannot cause an open redirect
// (the threat FR-1.7 defends). We therefore do NOT assert it is discarded; it is
// asserted PRESERVED in the legitimate-values test below, matching the shipped
// behaviour. This departure is recorded in the SUMMARY.
const HOSTILE_NEXT = [
  '//evil.example',
  'https://evil.example/x',
  'http:/evil',
  '/queue?x=1',
  '/%2F%2Fevil.example',
  '/path with space',
  '/path.with.dot',
  '/path:colon',
  'javascript:alert(1)',
  '\\evil.example',
  '',
];

// Legitimate `next` values: each must survive unchanged. Includes the long path,
// which is a valid same-origin path under the shipped validator (see note above).
const LEGITIMATE_NEXT = [
  '/queue',
  '/entries/new',
  '/cases/CE-2026-000001',
  '/cases/CE-2026-000001/audit',
  '/',
  '/' + 'a'.repeat(4095), // 4096-character same-origin path — structurally valid
];

describe('guard — the unauthenticated matrix and the redirect contract (criterion 2)', () => {
  withApi((h) => {
    // ── The API matrix: all ten §3.1 pairs, driven from API_ROUTE_TABLE ───────

    it('1. covers exactly the ten §3.1 pairs (a regression anchor on the table itself)', () => {
      // If a future route is added to the table, this count changes and the
      // author is forced to look at the matrix below.
      expect(API_ROUTE_TABLE.length).toBe(10);
    });

    for (const route of API_ROUTE_TABLE) {
      const path = concretePath(route.path);
      const isSignInPost = route.method === 'POST' && route.path === '/api/session';

      if (isSignInPost) {
        it(`2. ${route.method} ${route.path} with no cookie stays reachable (never refused for a missing session)`, async () => {
          __resetThrottle();
          const res = await requestNoCookie(h.app, route.method, path)
            .set('Content-Type', 'application/json')
            .send({ email: 'nobody@cbp.example.gov', password: 'correct-horse-battery' });
          // Reachable unauthenticated: it may 401 AUTH_FAILED on the credential,
          // but it is NEVER refused for lack of a session (UNAUTHENTICATED). A
          // regression that gated sign-in cannot hide behind a 401 of a different
          // flavour: a 401 here is only acceptable if it is AUTH_FAILED.
          expect(res.body?.error?.code).not.toBe('UNAUTHENTICATED');
          expect(res.status !== 401 || res.body.error.code === 'AUTH_FAILED').toBe(true);
        });
        continue;
      }

      // Every OTHER §3.1 pair — GET /api/session, DELETE /api/session, and the
      // seven unimplemented pairs — answers the SAME thing to a caller with no
      // cookie: 401 UNAUTHENTICATED, before CSRF and before route matching,
      // because `requireApiAuth` runs there. Cases 3 and 4 asserted the same
      // envelope; they are collapsed into this one shared branch.
      it(`3+4. ${route.method} ${route.path} with no cookie ⇒ 401 UNAUTHENTICATED, exact envelope, no challenge, no redirect, no data`, async () => {
        __resetThrottle();
        const res = await requestNoCookie(h.app, route.method, path);

        expect(res.status).toBe(401);
        // Exact Y2 §1 envelope: code + message verbatim, request_id present.
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
        expect(res.body.error.message).toBe('Sign in to continue.');
        expect(typeof res.body.error.request_id).toBe('string');
        expect(res.body.error.request_id.length).toBeGreaterThan(0);
        // No data of any kind beyond the envelope: top-level keys exactly ['error'],
        // and the error object carries exactly {code, message, request_id} — no
        // case data, no details.
        expect(Object.keys(res.body)).toEqual(['error']);
        expect(Object.keys(res.body.error).sort()).toEqual(['code', 'message', 'request_id']);
        // An API request is never challenged and never redirected.
        expect(res.headers['www-authenticate']).toBeUndefined();
        expect(res.headers['location']).toBeUndefined();
        // §3.2 conventions hold even on the refusal.
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.headers['x-request-id']).toBe(res.body.error.request_id);
      });
    }

    it('5. GET /api/unknown-path with no session ⇒ 401 UNAUTHENTICATED JSON, never the SPA document and never a path-existence oracle', async () => {
      __resetThrottle();
      const res = await supertest(h.app).get('/api/unknown-path');
      // The gate answers an unknown /api path with the SAME 401 as a known one:
      // an anonymous caller cannot tell an implemented path from an unimplemented
      // or unknown one. And the API surface is never handed to an anonymous
      // caller as the SPA document — it is always the JSON error envelope.
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.headers['location']).toBeUndefined();
      expect(Object.keys(res.body)).toEqual(['error']);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    // ── The ordering is the whole substance of the fix — prove it both ways ───

    it('6. DELETE /api/session with no cookie and no CSRF header ⇒ 401, NOT 403 (the gate precedes CSRF)', async () => {
      __resetThrottle();
      // A missing session must never be reported as CSRF_INVALID. This is the
      // assertion that fails if a future refactor moves requireApiAuth after
      // csrfMiddleware.
      const res = await supertest(h.app).delete('/api/session');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.body.error.code).not.toBe('CSRF_INVALID');
    });

    it('7. an authenticated DELETE /api/session with a missing CSRF header still ⇒ 403 CSRF_INVALID (the gate does not swallow the CSRF check)', async () => {
      __resetThrottle();
      // The gate must let a caller who DOES have a session through to CSRF. Sign
      // in for a real cookie, then send the DELETE with no X-CSRF-Token.
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      const res = await supertest(h.app).delete('/api/session').set('Cookie', cookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_INVALID');
    });

    // ── The HTML redirect contract (§4.2, US-1.2) ─────────────────────────────

    for (const uiPath of PROTECTED_UI_ROUTES) {
      it(`8. document request to ${uiPath} with no session ⇒ 302 /sign-in?next=<percent-encoded path>`, async () => {
        const res = await supertest(h.app)
          .get(uiPath)
          .set('Accept', 'text/html,application/xhtml+xml');
        expect(res.status).toBe(302);
        const expectedNext = encodeURIComponent(validateNextPath(uiPath));
        expect(res.headers['location']).toBe(`/sign-in?next=${expectedNext}`);
      });
    }

    it('9. /queue specifically yields Location: /sign-in?next=%2Fqueue exactly (US-1.2 AC-2)', async () => {
      const res = await supertest(h.app)
        .get('/queue')
        .set('Accept', 'text/html,application/xhtml+xml');
      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/sign-in?next=%2Fqueue');
    });

    it('10. GET /sign-in with a valid session ⇒ 302 /queue (§4.2 row 3, US-1.2 AC-4)', async () => {
      __resetThrottle();
      const sp = await createTestSpecialist(h.db.appUrl);
      const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

      const res = await supertest(h.app)
        .get('/sign-in')
        .set('Accept', 'text/html,application/xhtml+xml')
        .set('Cookie', cookie);
      // htmlRouteGuard issues this redirect itself — no static serving involved,
      // so serveStatic: false is irrelevant to it. This assertion stays here.
      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/queue');
    });

    it('11. GET /sign-in with no cookie ⇒ NOT a 3xx and no Location (the provable negative: no redirect loop)', async () => {
      const res = await supertest(h.app)
        .get('/sign-in')
        .set('Accept', 'text/html,application/xhtml+xml');
      // We do NOT assert 200 here: the withApi harness assembles the app with
      // serveStatic: false (plan 02-04 Task 3), so an unauthenticated /sign-in
      // falls through htmlRouteGuard to Express's default 404 — web/dist does not
      // exist until wave 4. The load-bearing fact this suite CAN prove is the
      // absence of a redirect loop: /sign-in never bounces an unauthenticated
      // caller back to itself.
      expect(res.status >= 300 && res.status < 400).toBe(false);
      expect(res.headers['location']).toBeUndefined();
    });

    // ── Open-redirect prevention (FR-1.7): validateNextPath, twice over ───────

    // Driven through the HTTP surface: a hostile `next` on /sign-in, with a valid
    // session, redirects to /queue (the validated value), never the hostile one.
    for (const hostile of HOSTILE_NEXT) {
      it(`12. hostile next through /sign-in is discarded for /queue: ${JSON.stringify(hostile).slice(0, 40)}`, async () => {
        __resetThrottle();
        const sp = await createTestSpecialist(h.db.appUrl);
        const { cookie } = await h.signIn(sp.email, TEST_PASSWORD);

        const res = await supertest(h.app)
          .get(`/sign-in?next=${encodeURIComponent(hostile)}`)
          .set('Accept', 'text/html,application/xhtml+xml')
          .set('Cookie', cookie);
        // A signed-in caller of /sign-in is bounced to the DEFAULT landing screen
        // (/queue); never to a caller-supplied next, hostile or not.
        expect(res.status).toBe(302);
        expect(res.headers['location']).toBe('/queue');
      });
    }

    // Driven directly as a table (unit-style) so the validation is asserted at
    // its own boundary, independent of where it is called from.
    it('13. validateNextPath discards every hostile value for /queue', () => {
      for (const hostile of HOSTILE_NEXT) {
        expect(validateNextPath(hostile)).toBe('/queue');
      }
    });

    it('14. validateNextPath preserves every legitimate same-origin path unchanged', () => {
      for (const legit of LEGITIMATE_NEXT) {
        expect(validateNextPath(legit)).toBe(legit);
      }
    });
  });
});

// ─── Assertions handed over to e2e/shell.spec.ts item 0 (plan 02-05 Task 3) ───
// Two criterion-2 assertions are NOT provable on this serveStatic: false harness,
// so they live in the real static-serving e2e suite rather than being dropped:
//   (a) GET /sign-in with no session returns 200 and serves the SPA document, and
//   (b) a static asset (GET /assets/app.css) is reachable unauthenticated
//       (neither 401 nor 302, §4.2 row 4).
// A reader auditing criterion 2 finds the missing half there. No .skip is used
// here — a skipped test would read as coverage this suite does not have.
