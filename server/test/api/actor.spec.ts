// The actor is the server-resolved specialist (Phase 2 criterion 3; TechArch
// §4.2, §4.6, §4.9 row 6, §3.2; F1 FR-1.6, acceptance 7; US-1.3).
//
// This is the Phase 2 analogue of Phase 1's HITL refusal tests: the attempt to
// name a DIFFERENT actor is MADE, in a test, and observed to be refused or
// ignored — never honoured. It is not enough that the middleware attaches
// `req.principal` from the cookie alone; the caller must try every reachable way
// to say "act as someone else" and be seen to fail.
//
// Phase 2's HTTP surface is three endpoints, so this suite enumerates the
// actor-naming vectors that are actually REACHABLE on that surface and closes
// every one. The principal is proven BEHAVIOURALLY: after each attempt we read
// `GET /api/session` back and assert whose identity the server resolved — the
// session-resolved specialist A, never the injected B. A source-level scan then
// proves no module reads an actor from a body, header or query value, so the
// guarantee holds for the next route added, not only today's three.
//
// Two specialists are created ONCE per suite (Argon2id at 19 MiB is slow): A,
// who signs in, and B, whom every request tries — and fails — to name.

import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { withApi } from './helpers/appHarness.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';
import { __resetThrottle } from '../../src/services/session.service.js';

describe('actor — the actor is the server-resolved specialist (criterion 3)', () => {
  withApi((h) => {
    let A: { id: string; email: string; display_name: string };
    let B: { id: string; email: string; display_name: string };
    let aCookie: string;

    beforeAll(async () => {
      A = await createTestSpecialist(h.db.appUrl, { display_name: 'Specialist A' });
      B = await createTestSpecialist(h.db.appUrl, { display_name: 'Specialist B' });
      __resetThrottle();
      const signedIn = await h.signIn(A.email, TEST_PASSWORD);
      aCookie = signedIn.cookie;
    });

    /** Count session rows — used to prove a rejected sign-in created none. */
    async function sessionCount(): Promise<number> {
      const res = await h.pool.query<{ n: string }>('SELECT count(*)::text AS n FROM sessions');
      return Number(res.rows[0]!.n);
    }

    // ── Vector 1 — a body property on POST /api/session ──────────────────────
    //
    // §3.2: `.strict()` "is the mechanism that blocks a client-supplied `origin`,
    // `decided_by`, or `applied`." Each forbidden property ⇒ 422 REQUEST_MALFORMED
    // naming it in details[], and NO session is created. Silent ignoring never
    // occurs — the request is refused outright.
    const bodyVectors: { prop: string; value: unknown }[] = [
      { prop: 'specialist_id', value: '00000000-0000-0000-0000-000000000000' },
      { prop: 'actor', value: '00000000-0000-0000-0000-000000000000' },
      { prop: 'decided_by', value: '00000000-0000-0000-0000-000000000000' },
      { prop: 'on_behalf_of', value: '00000000-0000-0000-0000-000000000000' },
      { prop: 'origin', value: 'AI' },
      { prop: 'applied', value: true },
    ];

    for (const { prop, value } of bodyVectors) {
      it(`1. body property "${prop}" on POST /api/session ⇒ 422 REQUEST_MALFORMED naming it, and no session created`, async () => {
        __resetThrottle();
        const before = await sessionCount();
        const res = await supertest(h.app)
          .post('/api/session')
          .set('Content-Type', 'application/json')
          .send({ email: B.email, password: TEST_PASSWORD, [prop]: value });

        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('REQUEST_MALFORMED');
        const fields = (res.body.error.details ?? []).map((d: { field?: string }) => d.field);
        expect(fields).toContain(prop);

        // The strict schema rejected the whole request before any session mint.
        const after = await sessionCount();
        expect(after).toBe(before);
      });
    }

    // ── Vector 2 — a request header ──────────────────────────────────────────
    //
    // A header naming B is IGNORED, because nothing reads it: GET /api/session
    // resolves the principal from the cookie alone and returns A.
    const headerVectors: { header: string; value: () => string }[] = [
      { header: 'X-Actor-Id', value: () => B.id },
      { header: 'X-Specialist-Id', value: () => B.id },
      { header: 'X-On-Behalf-Of', value: () => B.id },
      { header: 'X-User', value: () => B.email },
    ];

    for (const { header, value } of headerVectors) {
      it(`2. request header "${header}" is ignored — GET /api/session names A, not B`, async () => {
        const res = await supertest(h.app)
          .get('/api/session')
          .set('Cookie', aCookie)
          .set(header, value());
        expect(res.status).toBe(200);
        expect(res.body.specialist.id).toBe(A.id);
        expect(res.body.specialist.email).toBe(A.email);
        expect(res.body.specialist.id).not.toBe(B.id);
      });
    }

    // ── Vector 3 — a second cookie ───────────────────────────────────────────

    it('3a. a forged specialist_id cookie alongside A\u2019s session cookie cannot rename the principal — GET /api/session names A', async () => {
      // A's valid cargoexec_sid PLUS a forged specialist_id cookie naming B. The
      // specialist_id cookie is never read; the principal resolves from the
      // opaque session token in cargoexec_sid, which references A's row.
      const res = await supertest(h.app)
        .get('/api/session')
        .set('Cookie', `${aCookie}; specialist_id=${B.id}`);
      expect(res.status).toBe(200);
      expect(res.body.specialist.id).toBe(A.id);
      expect(res.body.specialist.id).not.toBe(B.id);
    });

    it('3b. a second cargoexec_sid cookie resolves to exactly one real session — never a blend, never B from A\u2019s token', async () => {
      // Sign B in to obtain a genuine second session token, then present A's
      // cookie followed by a second cargoexec_sid carrying B's token. A session
      // token is OPAQUE and resolves to exactly the specialist its row
      // references; the resolved principal is deterministic and is one of the two
      // REAL sessions (here B, since the last duplicate cookie wins in parsing) —
      // it is never a blend, and A's token could never resolve to B.
      __resetThrottle();
      const bSignIn = await h.signIn(B.email, TEST_PASSWORD);
      const bCookieValue = bSignIn.cookie; // "cargoexec_sid=<B token>"

      const res = await supertest(h.app)
        .get('/api/session')
        .set('Cookie', `${aCookie}; ${bCookieValue}`);
      expect(res.status).toBe(200);
      // The principal is one of the two real specialists, never a third identity
      // and never a mix. It is resolved deterministically from a single opaque
      // token, so it references exactly that token's row.
      expect([A.id, B.id]).toContain(res.body.specialist.id);
      // And critically: A's token, presented alone, always resolves to A —
      // proving a token belonging to A can never resolve to B.
      const aAlone = await supertest(h.app).get('/api/session').set('Cookie', aCookie);
      expect(aAlone.body.specialist.id).toBe(A.id);
    });

    // ── Vector 4 — a query parameter ─────────────────────────────────────────

    it('4. query parameter ?specialist_id=<B> cannot influence identity — GET /api/session names A', async () => {
      const res = await supertest(h.app)
        .get(`/api/session?specialist_id=${B.id}`)
        .set('Cookie', aCookie);
      expect(res.status).toBe(200);
      expect(res.body.specialist.id).toBe(A.id);
      expect(res.body.specialist.id).not.toBe(B.id);
    });

    // ── Vector 5 — B's own valid session is not A's (positive control) ───────

    it('5. positive control: B\u2019s own cookie resolves to B — resolution works, and it works FROM THE COOKIE', async () => {
      __resetThrottle();
      const bSignIn = await h.signIn(B.email, TEST_PASSWORD);
      const res = await supertest(h.app).get('/api/session').set('Cookie', bSignIn.cookie);
      expect(res.status).toBe(200);
      expect(res.body.specialist.id).toBe(B.id);
      expect(res.body.specialist.email).toBe(B.email);
      // This is what makes the four negative assertions meaningful: the server
      // DOES resolve a different specialist — but only from that specialist's own
      // session cookie, never from a caller-supplied name.
    });

    // ── Structural assertion — no code path reads a client-supplied actor ────
    //
    // TechArch §4.9 pairs the API test with exactly this "schema/grep test": a
    // behavioural test proves today's routes; a source scan proves the next one
    // added. If any of these forbidden reads appears under server/src, the actor
    // could be forged and this assertion fails the build.
    it('6. no source file under server/src reads an actor from a body, query or header', async () => {
      const { readFileSync, readdirSync } = await import('node:fs');
      const { join } = await import('node:path');

      // Recursively enumerate every .ts under server/src (fs.globSync is not
      // available on this Node runtime; this mirrors the architecture suite's
      // own walk helper).
      const walk = (dir: string): string[] => {
        const out: string[] = [];
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) {
            out.push(...walk(full));
          } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            out.push(full);
          }
        }
        return out;
      };
      const files = walk('server/src');
      expect(files.length).toBeGreaterThan(0);

      const forbidden = [
        'req.body.actor',
        'req.body.decided_by',
        'req.body.specialist_id',
        'req.body.on_behalf_of',
        "req.headers['x-actor",
        "req.headers['x-specialist",
        'req.query.specialist',
      ];

      const offenders: string[] = [];
      for (const file of files) {
        const src = readFileSync(file, 'utf8');
        // Strip line comments and block comments so a reference INSIDE a comment
        // (this file's own doc blocks name these strings) is not a false hit.
        const stripped = src
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        for (const needle of forbidden) {
          if (stripped.includes(needle)) {
            offenders.push(`${file}: ${needle}`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  });
});

// ─── The forward contract (extended when the audited endpoints exist) ─────────
// When the receipt and decision endpoints land, THIS suite is extended with the
// audit/decision actor assertions that cannot be written yet:
//   • F13 `audit_entries.actor_specialist_id` MUST equal the signed-in specialist
//     — added in PHASE 3 (the receipt write path is the first audited endpoint).
//   • `decisions.decided_by` MUST equal the signed-in specialist — added in
//     PHASE 6 (the decision write path).
// Following Phase 1's convention, this deferred coverage is recorded here as a
// comment naming its owning phase, never a skipped test — a skipped test would
// read as coverage this suite does not yet have.
