// The context-boot test (TechArch §8.2, §8.3; F1 acceptance 6, 8).
//
// The cheapest test in the suite and the highest yield. A duplicate route
// registration, a module that opens a socket at import time, a middleware that
// throws on assembly, and a pool constructed before config loads are ALL
// invisible to `tsc` and to every unit test — and all fatal at boot. This test
// converts them into a red `npm run test:api` minutes after the code is written,
// rather than a dead application discovered at human verification.

import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import supertest from 'supertest';
import { withApi, TEST_CONFIG } from './helpers/appHarness.js';
import { API_ROUTE_TABLE, ROUTES, buildRoutes } from '../../src/http/routes/index.js';

describe('context boot', () => {
  withApi((h) => {
    it('createApp assembles against a real migrated database without throwing', () => {
      // If assembly threw (a bad middleware, a route collision, a pool built at
      // import time), beforeAll would have failed and we would never get here.
      expect(h.app).toBeDefined();
      expect(typeof h.app.listen).toBe('function');
    });

    it('answers 401 on an unauthenticated GET /api/session — the whole chain runs end to end', async () => {
      // Proves requestId → headers → session → route → errorMapper actually run,
      // not merely that the object was constructed.
      const res = await supertest(h.app).get('/api/session');
      expect(res.status).toBe(401);
      expect(res.body?.error?.code).toBe('UNAUTHENTICATED');
      // The correlation header is present and matches the envelope's request_id.
      const reqId = res.headers['x-request-id'];
      expect(typeof reqId).toBe('string');
      expect(res.body.error.request_id).toBe(reqId);
    });

    it('binds a non-loopback address and closes cleanly (§6.5)', async () => {
      await new Promise<void>((resolve, reject) => {
        const server = h.app.listen(0, '0.0.0.0', () => {
          try {
            const addr = server.address() as AddressInfo;
            expect(addr).not.toBeNull();
            // Not a loopback address: the preview proxy could never reach one.
            expect(addr.address).not.toBe('127.0.0.1');
            expect(addr.address).not.toBe('::1');
            server.close((err) => (err ? reject(err) : resolve()));
          } catch (e) {
            server.close(() => reject(e));
          }
        });
        server.on('error', reject);
      });
    });

    it('registers exactly the five implemented routes and no more', async () => {
      // API_ROUTE_TABLE declares all ten §3.1 pairs; exactly five are implemented
      // (the three F1 session pairs and the two F3 entry pairs).
      const implemented = API_ROUTE_TABLE.filter((r) => r.implemented);
      expect(implemented).toHaveLength(5);
      expect(ROUTES).toHaveLength(5);
      expect(implemented.map((r) => `${r.method} ${r.path}`).sort()).toEqual([
        'DELETE /api/session',
        'GET /api/entries/:entryId',
        'GET /api/session',
        'POST /api/entries',
        'POST /api/session',
      ]);

      // The registry and the ROUTER cannot disagree: the five registered
      // method+path pairs are EXACTLY the five implemented rows, matched as a set.
      // If a handler were registered that the table did not implement (or vice
      // versa), this diverges. buildRoutes takes the injected per-suite pool.
      const registered = buildRoutes({
        pool: h.pool,
        config: { ...TEST_CONFIG, databaseUrlApp: h.db.appUrl },
        clock: h.clock,
      });
      const registeredSet = registered
        .map((r) => `${r.method.toUpperCase()} ${r.path}`)
        .sort();
      const implementedSet = implemented
        .map((r) => `${r.method.toUpperCase()} ${r.path}`)
        .sort();
      expect(registeredSet).toEqual(implementedSet);

      // Behavioural proof that an UNIMPLEMENTED route is still not registered: an
      // unauthenticated GET /api/exceptions is not answered by a route-level
      // success — it is a 4xx (the session middleware ran, no route handled it).
      const res = await supertest(h.app).get('/api/exceptions');
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });
});
