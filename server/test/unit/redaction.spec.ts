import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { createLogger } from '../../src/http/logger.js';
import type { AppConfig } from '../../src/config.js';

// A minimal AppConfig sufficient for the logger. Only logLevel is read.
const config: AppConfig = {
  nodeEnv: 'test',
  host: '0.0.0.0',
  port: 3000,
  databaseUrlApp: 'postgres://ignored',
  sessionCookieProfile: 'governed',
  frameAncestors: null,
  logLevel: 'info',
  originIsHttps: false,
};

/** A pino destination that collects every emitted line as a string. */
function collectingSink(): { lines: string[]; stream: Writable } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString());
      cb();
    },
  });
  return { lines, stream };
}

describe('logger redaction (§4.7, FR-1.14)', () => {
  it('censors a session cookie header — neither the token nor the raw value survives', () => {
    const { lines, stream } = collectingSink();
    const log = createLogger(config, stream);
    log.info(
      { req: { headers: { cookie: 'cargoexec_sid=SENTINEL_TOKEN' } } },
      'incoming',
    );
    const out = lines.join('');
    expect(out).not.toContain('SENTINEL_TOKEN');
    expect(out).not.toContain('cargoexec_sid=SENTINEL_TOKEN');
    expect(out).toContain('[redacted]');
  });

  it('censors x-csrf-token and authorization request headers', () => {
    const { lines, stream } = collectingSink();
    const log = createLogger(config, stream);
    log.info(
      {
        req: {
          headers: {
            'x-csrf-token': 'SENTINEL_CSRF',
            authorization: 'Bearer SENTINEL_BEARER',
          },
        },
      },
      'incoming',
    );
    const out = lines.join('');
    expect(out).not.toContain('SENTINEL_CSRF');
    expect(out).not.toContain('SENTINEL_BEARER');
  });

  it('censors a password at the top level and nested one level deep', () => {
    const { lines, stream } = collectingSink();
    const log = createLogger(config, stream);
    log.info(
      { password: 'SENTINEL_PASSWORD', body: { password: 'SENTINEL_NESTED' } },
      'saving',
    );
    const out = lines.join('');
    expect(out).not.toContain('SENTINEL_PASSWORD');
    expect(out).not.toContain('SENTINEL_NESTED');
  });

  it('censors an api_key', () => {
    const { lines, stream } = collectingSink();
    const log = createLogger(config, stream);
    log.info({ api_key: 'sk-SENTINEL' }, 'configured');
    const out = lines.join('');
    expect(out).not.toContain('sk-SENTINEL');
  });

  it('drops the POST /api/session request body entirely — no headers key at all', () => {
    const { lines, stream } = collectingSink();
    const log = createLogger(config, stream);
    log.info(
      {
        req: {
          method: 'POST',
          url: '/api/session',
          id: 'req-1',
          headers: {
            cookie: 'cargoexec_sid=SHOULD_NOT_APPEAR',
            'content-type': 'application/json',
          },
        },
      },
      'sign-in',
    );
    const out = lines.join('');
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.req).toBeDefined();
    expect(parsed.req.headers).toBeUndefined();
    expect(parsed.req.method).toBe('POST');
    expect(parsed.req.url).toBe('/api/session');
    expect(out).not.toContain('SHOULD_NOT_APPEAR');
  });

  it('keeps headers (redacted) for a non-session request', () => {
    const { lines, stream } = collectingSink();
    const log = createLogger(config, stream);
    log.info(
      {
        req: {
          method: 'GET',
          url: '/api/cases',
          id: 'req-2',
          headers: { cookie: 'cargoexec_sid=SENTINEL_TOKEN', accept: 'application/json' },
        },
      },
      'listing',
    );
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.req.headers).toBeDefined();
    expect(parsed.req.headers.accept).toBe('application/json');
    expect(parsed.req.headers.cookie).toBe('[redacted]');
    expect(lines.join('')).not.toContain('SENTINEL_TOKEN');
  });
});
