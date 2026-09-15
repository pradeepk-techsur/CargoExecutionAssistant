// The F3 entries-endpoint suite (TechArch §3.1, §1.5; FRD Y2 §3; F3
// FR-3.1–3.16, F4, F5; US-3.x). supertest against the harness app and a real
// migrated database.
//
// This file is the backend mirror of the Playwright rule: it is a PERMANENT
// regression asset that every later phase's gates re-run. Every assertion reads
// a value the SPA, the audit trail or the contract actually depends on — status,
// body shape, finding order, header presence. Nothing asserts on prose.
//
// The load-bearing fact this suite proves over and over: a REQUIRED-INFORMATION
// failure is a 201 with receipt_outcome EXCEPTION_OPENED and findings — never an
// HTTP error, and no RIV code is ever an HTTP error code (FR-3.10). STRUCTURAL
// failures (an unknown property, an array body, an over-scale number, a wrong
// content type, an over-length field) are the only 4xx/415/413s.

import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { withApi } from './helpers/appHarness.js';
import { createTestSpecialist, TEST_PASSWORD } from '../helpers/identityFixtures.js';

// A fully rule-satisfying body (RIV-2026.09): every presence, format, domain and
// window rule is satisfied, so receipt validates CLEAN. Ocean mode ⇒ a bill of
// lading and no air waybill (RIV-070/073). arrival_date is filled at suite start
// with today's UTC date so RIV-132's ±window always holds against the DB's now().
function cleanBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    entry_number: 'ABC12345678',
    importer_of_record_id: '12-3456789',
    port_of_entry_code: '2704',
    mode_of_transport: 'ocean',
    carrier_code: 'MAEU',
    conveyance_name: 'Maersk Sentosa V.123',
    bill_of_lading_number: 'MAEU1234567',
    country_of_origin_code: 'CN',
    goods_description: 'Industrial steel fasteners, grade 8',
    // Numeric fields are submitted in the column's canonical scale
    // (quantity numeric(14,3), declared_value_usd numeric(14,2)) so the stored
    // value round-trips byte-identically through the GET read path — the
    // byte-verbatim guarantee (F6 acceptance 6) holds exactly when the submitted
    // text already carries the column scale, matching 03-05's receipt.spec.
    quantity: '100.000',
    quantity_uom: 'PCS',
    declared_value_usd: '5000.00',
    arrival_date: TODAY_UTC,
    ...overrides,
  };
}

const TODAY_UTC = new Date().toISOString().slice(0, 10);

// A globally-unique entry number so parallel/repeated runs never collide on the
// entry-number uniqueness constraint across suites sharing a fresh DB.
let seq = 0;
function uniqueEntryNumber(): string {
  seq += 1;
  // 3-char filer code + 8 digits (RIV-011). Encode the counter into the digits.
  return `ABC${String(10000000 + seq).slice(0, 8)}`;
}

describe('entries endpoints (F3/F4/F5)', () => {
  withApi((h) => {
    let cookie = '';
    let csrfToken = '';
    let specialistDisplayName = '';

    beforeAll(async () => {
      const sp = await createTestSpecialist(h.db.appUrl, { display_name: 'Dana Specialist' });
      specialistDisplayName = sp.display_name;
      const signedIn = await h.signIn(sp.email, TEST_PASSWORD);
      cookie = signedIn.cookie;
      csrfToken = signedIn.csrfToken;
    });

    /** POST with the suite's cookie + CSRF token. */
    function post(body: unknown) {
      return supertest(h.app)
        .post('/api/entries')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .set('Content-Type', 'application/json')
        .send(body as object);
    }

    // ── Happy paths — assert the response CONTRACT, not just the status ────────

    it('1. a fully rule-satisfying body ⇒ 201 VALIDATED_CLEAN with the full contract', async () => {
      const res = await post(cleanBody({ entry_number: uniqueEntryNumber() }));
      expect(res.status).toBe(201);
      expect(res.body.receipt_outcome).toBe('VALIDATED_CLEAN');
      expect(res.body.exception).toBeNull();
      expect(res.body.validation.outcome).toBe('PASS');
      expect(res.body.validation.findings).toHaveLength(0);
      expect(res.body.validation.rule_set_version).toBe('RIV-2026.09');
      expect(res.body.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);
      expect(res.body.next.case_url).toBeNull();
      expect(res.body.next.queue_url).toBe('/queue');
      expect(res.body.entry.created_by.display_name).toBe(specialistDisplayName);
      for (const field of Object.keys(res.body.entry.field_origins)) {
        expect(res.body.entry.field_origins[field]).toBe('HUMAN');
      }
      // A genuinely clean ocean entry provides THIRTEEN fields, not fourteen: it
      // carries a bill_of_lading_number and NO air_waybill_number, because
      // supplying both is a RIV-073 conflict. Every provided field is HUMAN.
      expect(Object.keys(res.body.entry.field_origins)).toHaveLength(13);
      expect(res.body.entry.field_origins.air_waybill_number).toBeUndefined();
      // Top-level key set is exact so a future field addition is deliberate.
      expect(Object.keys(res.body).sort()).toEqual(
        ['case_reference', 'entry', 'exception', 'next', 'receipt_outcome', 'validation'].sort(),
      );
    });

    it('2. an entirely EMPTY body {} ⇒ 201 EXCEPTION_OPENED with thirteen ordered findings', async () => {
      const res = await post({});
      expect(res.status).toBe(201);
      expect(res.body.receipt_outcome).toBe('EXCEPTION_OPENED');
      expect(res.body.validation.outcome).toBe('FAIL');
      const ruleIds = res.body.validation.findings.map((f: { rule_id: string }) => f.rule_id);
      expect(ruleIds).toEqual([
        'RIV-010', 'RIV-020', 'RIV-030', 'RIV-040', 'RIV-050', 'RIV-060',
        'RIV-070', 'RIV-080', 'RIV-090', 'RIV-100', 'RIV-110', 'RIV-120', 'RIV-130',
      ]);
      expect(res.body.exception.state).toBe('OPEN');
      expect(Number.isInteger(res.body.exception.receipt_position)).toBe(true);
      expect(res.body.exception.receipt_position).toBeGreaterThan(0);
      expect(res.body.next.case_url).toBe('/cases/' + res.body.case_reference);
      // No field was provided ⇒ no origin rows.
      expect(Object.keys(res.body.entry.field_origins)).toHaveLength(0);
      // Every finding has EXACTLY these keys — no severity, no score.
      for (const f of res.body.validation.findings) {
        expect(Object.keys(f).sort()).toEqual(
          ['failure_code', 'field_name', 'message', 'rule_id'].sort(),
        );
      }
    });

    it('3. only goods_description filled ⇒ 201 EXCEPTION_OPENED with a case reference', async () => {
      const res = await post({ goods_description: 'Industrial steel fasteners, grade 8' });
      expect(res.status).toBe(201);
      expect(res.body.receipt_outcome).toBe('EXCEPTION_OPENED');
      expect(res.body.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);
    });

    it('4. no RIV code is ever an HTTP error code (cases 2 and 3 are 201 with no error key)', async () => {
      const empty = await post({});
      const partial = await post({ goods_description: 'Industrial steel fasteners, grade 8' });
      expect(empty.status).toBe(201);
      expect(partial.status).toBe(201);
      expect(empty.body.error).toBeUndefined();
      expect(partial.body.error).toBeUndefined();
    });

    // ── Structural failures (422), each with a per-field detail ───────────────

    it('5. an unknown property ⇒ 422 REQUEST_MALFORMED naming it', async () => {
      const res = await post({ notes: 'x' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('REQUEST_MALFORMED');
      const fields = (res.body.error.details ?? []).map((d: { field?: string }) => d.field);
      expect(fields).toContain('notes');
    });

    it('6. skip_validation / force ⇒ 422 naming the property (no such capability exists)', async () => {
      const skip = await post({ skip_validation: true });
      expect(skip.status).toBe(422);
      expect(skip.body.error.code).toBe('REQUEST_MALFORMED');
      expect((skip.body.error.details ?? []).map((d: { field?: string }) => d.field)).toContain(
        'skip_validation',
      );

      const force = await post({ force: true });
      expect(force.status).toBe(422);
      expect((force.body.error.details ?? []).map((d: { field?: string }) => d.field)).toContain(
        'force',
      );
    });

    it('7. a client-supplied actor or outcome ⇒ 422 naming the property (FR-1.6)', async () => {
      const cases: Array<[Record<string, unknown>, string]> = [
        [{ created_by: 'someone' }, 'created_by'],
        [{ origin: 'AI' }, 'origin'],
        [{ receipt_outcome: 'VALIDATED_CLEAN' }, 'receipt_outcome'],
        [{ case_reference: 'CE-2026-000001' }, 'case_reference'],
      ];
      for (const [body, field] of cases) {
        const res = await post(body);
        expect(res.status).toBe(422);
        expect((res.body.error.details ?? []).map((d: { field?: string }) => d.field)).toContain(
          field,
        );
      }
    });

    it('8. an array body [{}] ⇒ 422; a scalar body "x" ⇒ 422 (no batch wrapper)', async () => {
      const arr = await post([{}]);
      expect(arr.status).toBe(422);
      expect(arr.body.error.code).toBe('REQUEST_MALFORMED');

      const scalar = await supertest(h.app)
        .post('/api/entries')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify('x'));
      expect(scalar.status).toBe(422);
    });

    it('9. entry_number of 21 chars ⇒ 422; of 20 ⇒ accepted (positive control)', async () => {
      const tooLong = await post(cleanBody({ entry_number: 'A'.repeat(21) }));
      expect(tooLong.status).toBe(422);
      expect(tooLong.body.error.code).toBe('REQUEST_MALFORMED');

      // A 20-char entry number is accepted structurally (it will fail the format
      // rule RIV-011 and open an exception, but that is a 201, not a 422).
      const ok = await post(cleanBody({ entry_number: 'A'.repeat(20) }));
      expect(ok.status).toBe(201);
    });

    it('10. quantity abc ⇒ 422; 1.2345 ⇒ 422; "0" ⇒ 201 + RIV-101; declared_value -5 ⇒ 201 + RIV-121', async () => {
      const notNumeric = await post(cleanBody({ entry_number: uniqueEntryNumber(), quantity: 'abc' }));
      expect(notNumeric.status).toBe(422);
      expect((notNumeric.body.error.details ?? []).some((d: { code?: string }) => d.code === 'not_numeric')).toBe(true);

      const tooManyDecimals = await post(cleanBody({ entry_number: uniqueEntryNumber(), quantity: '1.2345' }));
      expect(tooManyDecimals.status).toBe(422);
      expect((tooManyDecimals.body.error.details ?? []).some((d: { code?: string }) => d.code === 'too_many_decimals')).toBe(true);

      // "0" parses cleanly — it is F4's business (RIV-101), NOT a 422.
      const zeroQty = await post(cleanBody({ entry_number: uniqueEntryNumber(), quantity: '0' }));
      expect(zeroQty.status).toBe(201);
      expect(zeroQty.body.validation.findings.map((f: { rule_id: string }) => f.rule_id)).toContain('RIV-101');

      // "-5" parses cleanly — F4's business (RIV-121), NOT a 422.
      const negValue = await post(cleanBody({ entry_number: uniqueEntryNumber(), declared_value_usd: '-5' }));
      expect(negValue.status).toBe(201);
      expect(negValue.body.validation.findings.map((f: { rule_id: string }) => f.rule_id)).toContain('RIV-121');
    });

    it('11. arrival_date 2026-02-30 ⇒ 201 + RIV-131 + stored null; an 11-char string ⇒ 422 (over-length)', async () => {
      const invalidDate = await post(cleanBody({ entry_number: uniqueEntryNumber(), arrival_date: '2026-02-30' }));
      expect(invalidDate.status).toBe(201);
      expect(invalidDate.body.validation.findings.map((f: { rule_id: string }) => f.rule_id)).toContain('RIV-131');
      expect(invalidDate.body.entry.values.arrival_date).toBeNull();

      const overLong = await post(cleanBody({ entry_number: uniqueEntryNumber(), arrival_date: 'not-a-date-x' }));
      expect(overLong.status).toBe(422);
      expect(overLong.body.error.code).toBe('REQUEST_MALFORMED');
    });

    it('12. a non-JSON content type with a body ⇒ 415', async () => {
      const res = await supertest(h.app)
        .post('/api/entries')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .set('Content-Type', 'text/csv')
        .send('entry_number,quantity\nABC12345678,100\n');
      expect(res.status).toBe(415);
      expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('13. a body over 64 KB ⇒ 413', async () => {
      const huge = 'x'.repeat(70 * 1024);
      const res = await supertest(h.app)
        .post('/api/entries')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ goods_description: huge }));
      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('REQUEST_TOO_LARGE');
    });

    // ── Duplicate (409) ───────────────────────────────────────────────────────

    it('14. a duplicate entry number ⇒ 409 naming the existing case, persisting nothing', async () => {
      const num = uniqueEntryNumber();
      const first = await post(cleanBody({ entry_number: num }));
      expect(first.status).toBe(201);
      const firstId = first.body.entry.id;

      const before = await h.pool.query<{ count: string }>('SELECT count(*)::text FROM cargo_entries');
      const second = await post(cleanBody({ entry_number: num }));
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('ENTRY_NUMBER_DUPLICATE');
      expect(second.body.error.message).toContain(num);
      expect(second.body.error.message).toContain(first.body.case_reference);
      const detailFields = (second.body.error.details ?? []).map((d: { field?: string }) => d.field);
      expect(detailFields).toContain('entry_number');

      // Nothing was persisted by the second call: the count is unchanged and the
      // first entry still reads.
      const after = await h.pool.query<{ count: string }>('SELECT count(*)::text FROM cargo_entries');
      expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
      const getFirst = await supertest(h.app).get('/api/entries/' + firstId).set('Cookie', cookie);
      expect(getFirst.status).toBe(200);
    });

    // ── Method and path surface ───────────────────────────────────────────────

    it('15. PUT / DELETE / PATCH /api/entries ⇒ 405 METHOD_NOT_ALLOWED', async () => {
      for (const method of ['put', 'delete', 'patch'] as const) {
        const req = supertest(h.app)
          [method]('/api/entries')
          .set('Cookie', cookie)
          .set('X-CSRF-Token', csrfToken);
        const res = await req.set('Content-Type', 'application/json').send({});
        expect(res.status).toBe(405);
        expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
      }
    });

    it('16. GET /api/entries (the collection) ⇒ not 200 and never a list', async () => {
      const res = await supertest(h.app).get('/api/entries').set('Cookie', cookie);
      expect([404, 405]).toContain(res.status);
      expect(res.body.entries).toBeUndefined();
      expect(res.body.error).toBeDefined();
    });

    // ── Auth and CSRF enforcement ─────────────────────────────────────────────

    it('17. POST with no cookie ⇒ 401 UNAUTHENTICATED, nothing persisted', async () => {
      const before = await h.pool.query<{ count: string }>('SELECT count(*)::text FROM cargo_entries');
      const res = await supertest(h.app)
        .post('/api/entries')
        .set('Content-Type', 'application/json')
        .send(cleanBody({ entry_number: uniqueEntryNumber() }));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      const after = await h.pool.query<{ count: string }>('SELECT count(*)::text FROM cargo_entries');
      expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
    });

    it('18. POST with a cookie but no / wrong CSRF token ⇒ 403 CSRF_INVALID, nothing persisted', async () => {
      const before = await h.pool.query<{ count: string }>('SELECT count(*)::text FROM cargo_entries');

      const noToken = await supertest(h.app)
        .post('/api/entries')
        .set('Cookie', cookie)
        .set('Content-Type', 'application/json')
        .send(cleanBody({ entry_number: uniqueEntryNumber() }));
      expect(noToken.status).toBe(403);
      expect(noToken.body.error.code).toBe('CSRF_INVALID');

      const wrongToken = await supertest(h.app)
        .post('/api/entries')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'not-the-real-token')
        .set('Content-Type', 'application/json')
        .send(cleanBody({ entry_number: uniqueEntryNumber() }));
      expect(wrongToken.status).toBe(403);
      expect(wrongToken.body.error.code).toBe('CSRF_INVALID');

      const after = await h.pool.query<{ count: string }>('SELECT count(*)::text FROM cargo_entries');
      expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
    });

    it('19. GET /api/entries/{id} with no cookie ⇒ 401', async () => {
      const res = await supertest(h.app).get(
        '/api/entries/11111111-1111-1111-1111-111111111111',
      );
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    // ── GET /api/entries/{entryId} ────────────────────────────────────────────

    it('20. after a clean receipt, GET returns the derived state (values byte-for-byte, all HUMAN, PASS)', async () => {
      const num = uniqueEntryNumber();
      const submitted = cleanBody({ entry_number: num });
      const receipt = await post(submitted);
      expect(receipt.status).toBe(201);
      const id = receipt.body.entry.id;

      const res = await supertest(h.app).get('/api/entries/' + id).set('Cookie', cookie);
      expect(res.status).toBe(200);
      for (const [field, value] of Object.entries(submitted)) {
        expect(res.body.entry.values[field]).toBe(value);
      }
      for (const field of Object.keys(res.body.entry.field_origins)) {
        expect(res.body.entry.field_origins[field]).toBe('HUMAN');
      }
      expect(res.body.receipt_outcome).toBe('VALIDATED_CLEAN');
      expect(res.body.validation.outcome).toBe('PASS');
      expect(res.body.validation.findings).toHaveLength(0);
      expect(res.body.exception).toBeNull();
    });

    it('21. after a failing receipt, GET returns EXCEPTION_OPENED with the same findings in order + OPEN exception', async () => {
      const receipt = await post({});
      const id = receipt.body.entry.id;
      const postRuleIds = receipt.body.validation.findings.map((f: { rule_id: string }) => f.rule_id);
      const postPosition = receipt.body.exception.receipt_position;

      const res = await supertest(h.app).get('/api/entries/' + id).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.receipt_outcome).toBe('EXCEPTION_OPENED');
      expect(res.body.validation.findings.map((f: { rule_id: string }) => f.rule_id)).toEqual(postRuleIds);
      expect(res.body.exception.state).toBe('OPEN');
      expect(res.body.exception.receipt_position).toBe(postPosition);
    });

    it('22. a non-uuid id ⇒ 400 INVALID_IDENTIFIER', async () => {
      const res = await supertest(h.app).get('/api/entries/not-a-uuid').set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
    });

    it('23. a well-formed but unknown uuid ⇒ 404 ENTRY_NOT_FOUND', async () => {
      const res = await supertest(h.app)
        .get('/api/entries/99999999-9999-4999-8999-999999999999')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENTRY_NOT_FOUND');
    });

    it('24. any query parameter ⇒ 400 UNSUPPORTED_QUERY_PARAMETER', async () => {
      const num = uniqueEntryNumber();
      const receipt = await post(cleanBody({ entry_number: num }));
      const id = receipt.body.entry.id;
      const res = await supertest(h.app)
        .get('/api/entries/' + id + '?include=all')
        .set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_QUERY_PARAMETER');
    });

    // ── Values as typed (F3 §The Entry Field Set, F6 acceptance 6) ─────────────

    it('25. entry_number "  abc12345678  " is trimmed but NOT normalised; RIV-011 still fires on lowercase-format? (positive control)', async () => {
      // Trimming happens (leading/trailing whitespace removed). Normalisation does
      // NOT: the stored value stays lowercase. NOTE (per 03-05 decision): RIV-011
      // NORMALISES with upperAlnum() before matching, so a lowercase entry number
      // PASSES the format rule while stored verbatim. We therefore assert the
      // trimming and the byte-verbatim storage — the load-bearing facts — and that
      // RIV-011 does NOT appear (it passed on the normalised comparison).
      const res = await post(cleanBody({ entry_number: '  abc12345678  ' }));
      expect(res.status).toBe(201);
      expect(res.body.entry.values.entry_number).toBe('abc12345678'); // trimmed, still lowercase
      expect(res.body.validation.findings.map((f: { rule_id: string }) => f.rule_id)).not.toContain('RIV-011');
    });

    it('26. empty string and whitespace-only are treated as not provided (identical to absent)', async () => {
      const res = await post({ goods_description: '', conveyance_name: '   ' });
      expect(res.status).toBe(201);
      expect(res.body.entry.values.goods_description).toBeNull();
      expect(res.body.entry.values.conveyance_name).toBeNull();
      expect(res.body.entry.field_origins.goods_description).toBeUndefined();
      expect(res.body.entry.field_origins.conveyance_name).toBeUndefined();
      const ruleIds = res.body.validation.findings.map((f: { rule_id: string }) => f.rule_id);
      expect(ruleIds).toContain('RIV-090');
      expect(ruleIds).toContain('RIV-060');
    });

    // ── Conventions (§3.2) ─────────────────────────────────────────────────────

    it('27. every response carries Cache-Control: no-store and X-Request-Id matching the failure body request_id', async () => {
      const ok = await post(cleanBody({ entry_number: uniqueEntryNumber() }));
      expect(ok.headers['cache-control']).toBe('no-store');
      expect(ok.headers['x-request-id']).toBeDefined();

      const fail = await post({ notes: 'x' });
      expect(fail.headers['cache-control']).toBe('no-store');
      expect(fail.headers['x-request-id']).toBe(fail.body.error.request_id);
    });
  });
});
