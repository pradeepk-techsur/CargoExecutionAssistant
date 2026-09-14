import { describe, it, expect } from 'vitest';
import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { ApiError, errorMapper } from '../../src/http/errorMapper.js';
import { requestId } from '../../src/http/requestId.js';
import { ERROR_CODES } from '@cargoexec/contract';

/**
 * Build a bare express app: requestId() → a route that throws whatever the test
 * supplies → errorMapper(). A capturing logger is bound to req.log so a test
 * can assert what the mapper logged internally.
 */
function appThatThrows(err: unknown): { app: Express; logged: unknown[] } {
  const logged: unknown[] = [];
  const app = express();
  app.use(requestId());
  // Overwrite req.log with a capturing child so the internal-log assertions can
  // read what the mapper wrote, without touching stdout.
  const capture: RequestHandler = (req, _res, next) => {
    req.log = {
      error: (obj: unknown) => {
        logged.push(obj);
      },
      // requestId() already set req.log.child was used; we only need .error here.
    } as unknown as typeof req.log;
    next();
  };
  app.use(capture);
  app.get('/boom', () => {
    throw err;
  });
  app.use(errorMapper());
  return { app, logged };
}

describe('errorMapper — ApiError pass-through', () => {
  it('surfaces status, code, and the default Y2 message; request_id matches the header; no details key', async () => {
    const { app } = appThatThrows(new ApiError(401, 'UNAUTHENTICATED'));
    const res = await request(app).get('/boom');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.body.error.message).toBe('Sign in to continue.');
    expect(res.body.error.request_id).toBe(res.headers['x-request-id']);
    expect(res.body.error.request_id).not.toBe('');
    expect(res.body.error).not.toHaveProperty('details');
  });
});

describe('errorMapper — ZodError → 422 REQUEST_MALFORMED', () => {
  it('rejects an unknown property with a details entry naming it (§4.6, §3.2)', async () => {
    let zerr: unknown;
    try {
      z.object({ email: z.string().email() })
        .strict()
        .parse({ email: 'not-an-email', extra: 1 });
    } catch (e) {
      zerr = e;
    }
    const { app } = appThatThrows(zerr);
    const res = await request(app).get('/boom');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REQUEST_MALFORMED');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    const fields = res.body.error.details.map(
      (d: { field?: string }) => d.field,
    );
    expect(fields).toContain('extra');
    expect(res.body.error.request_id).toBe(res.headers['x-request-id']);
  });
});

describe('errorMapper — internal invariant codes never reach the client', () => {
  it('P0001 HITL_VIOLATION → generic 500; body omits the code; log contains it', async () => {
    const { app, logged } = appThatThrows({
      code: 'P0001',
      message: 'HITL_VIOLATION: a machine may not decide',
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(ERROR_CODES).toContain(res.body.error.code);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('HITL_VIOLATION');
    // The internal code WAS logged against the request id.
    const loggedStr = JSON.stringify(logged);
    expect(loggedStr).toContain('HITL_VIOLATION');
    expect(loggedStr).toContain(res.headers['x-request-id']);
  });

  it('42501 (insufficient_privilege) → generic 500', async () => {
    const { app } = appThatThrows({ code: '42501', message: 'permission denied' });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(ERROR_CODES).toContain(res.body.error.code);
    expect(JSON.stringify(res.body)).not.toContain('permission denied');
  });
});

describe('errorMapper — no disclosure of SQL, stack, provider or config', () => {
  it('an unknown Error → 500 generic; body contains neither the message nor a stack', async () => {
    const { app } = appThatThrows(new Error('boom'));
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('boom');
    expect(body).not.toContain('at Object.');
    expect(body).not.toContain('Error:');
  });

  it("a mapped PG error's body leaks none of SELECT/INSERT/at Object./pg/password", async () => {
    const { app } = appThatThrows({
      code: '23505',
      constraint: 'cargo_entries_entry_number_key',
      message:
        'duplicate key value violates unique constraint on SELECT ... INSERT pg password at Object.foo',
    });
    const res = await request(app).get('/boom');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('SELECT ');
    expect(body).not.toContain('INSERT ');
    expect(body).not.toContain('at Object.');
    expect(body).not.toMatch(/\bpg\b/);
    expect(body).not.toContain('password');
  });
});

describe('errorMapper — every returned code is in ERROR_CODES', () => {
  const cases: Array<{ name: string; err: unknown }> = [
    { name: 'ApiError', err: new ApiError(409, 'ENTRY_NUMBER_DUPLICATE') },
    {
      name: 'PG 23505 entry_number',
      err: { code: '23505', constraint: 'cargo_entries_entry_number_key', message: 'entry_number' },
    },
    {
      name: 'PG 23514 reason required',
      err: { code: '23514', constraint: 'decisions_reason_required_chk', message: 'reason' },
    },
    { name: 'PG P0001 audit', err: { code: 'P0001', message: 'AUDIT_CHAIN_BROKEN: tamper' } },
    { name: 'unknown', err: new Error('x') },
  ];
  for (const c of cases) {
    it(`${c.name}: returned code is a member of ERROR_CODES`, async () => {
      const { app } = appThatThrows(c.err);
      const res = await request(app).get('/boom');
      expect(ERROR_CODES).toContain(res.body.error.code);
    });
  }
});
