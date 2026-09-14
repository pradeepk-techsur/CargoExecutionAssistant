import { describe, it, expect } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { securityHeaders } from '../../src/http/headers.js';
import type { AppConfig } from '../../src/config.js';

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    host: '0.0.0.0',
    port: 3000,
    databaseUrlApp: 'postgres://ignored',
    sessionCookieProfile: 'governed',
    frameAncestors: null,
    logLevel: 'silent',
    originIsHttps: false,
    ...overrides,
  };
}

/**
 * Mount securityHeaders(config) plus a set of trivial routes covering an /api
 * path, an HTML document path and a hashed static asset path.
 */
function appFor(config: AppConfig): Express {
  const app = express();
  for (const handler of securityHeaders(config)) {
    app.use(handler);
  }
  app.get('/api/ping', (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/dashboard', (_req, res) => {
    res.type('html').send('<!doctype html><title>shell</title>');
  });
  app.get('/assets/app.abc123.js', (_req, res) => {
    res.type('application/javascript').send('console.log(1)');
  });
  return app;
}

/** Lower-case header keys of a supertest response. */
function headerKeys(res: { headers: Record<string, unknown> }): string[] {
  return Object.keys(res.headers).map((k) => k.toLowerCase());
}

describe('securityHeaders — D-1: X-Frame-Options is NEVER sent', () => {
  const profiles: Array<Partial<AppConfig>> = [
    { sessionCookieProfile: 'governed', originIsHttps: false },
    { sessionCookieProfile: 'demo-iframe', originIsHttps: true },
  ];
  const paths = ['/api/ping', '/dashboard', '/assets/app.abc123.js'];

  for (const profile of profiles) {
    for (const path of paths) {
      it(`D-1 VIOLATED if X-Frame-Options present on ${path} under ${profile.sessionCookieProfile}`, async () => {
        const res = await request(appFor(makeConfig(profile))).get(path);
        expect(headerKeys(res)).not.toContain('x-frame-options');
      });
    }
  }
});

describe('securityHeaders — CSP (§4.5)', () => {
  it('emits the ten always-on directives verbatim', async () => {
    const res = await request(appFor(makeConfig())).get('/api/ping');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-src 'none'");
  });

  it('omits frame-ancestors entirely when frameAncestors is null', async () => {
    const res = await request(appFor(makeConfig({ frameAncestors: null }))).get(
      '/api/ping',
    );
    expect(res.headers['content-security-policy']).not.toContain(
      'frame-ancestors',
    );
  });

  it('appends frame-ancestors with the configured origin', async () => {
    const res = await request(
      appFor(makeConfig({ frameAncestors: 'https://preview.example.dev' })),
    ).get('/api/ping');
    expect(res.headers['content-security-policy']).toContain(
      'frame-ancestors https://preview.example.dev',
    );
  });

  it('appends frame-ancestors * when configured as a wildcard', async () => {
    const res = await request(
      appFor(makeConfig({ frameAncestors: '*' })),
    ).get('/api/ping');
    expect(res.headers['content-security-policy']).toContain('frame-ancestors *');
  });
});

describe('securityHeaders — other §4.5 / §3.2 headers', () => {
  it('sets X-Content-Type-Options: nosniff and Referrer-Policy: same-origin', async () => {
    const res = await request(appFor(makeConfig())).get('/api/ping');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('same-origin');
  });

  it('sets Strict-Transport-Security only when the origin is HTTPS', async () => {
    const https = await request(
      appFor(makeConfig({ originIsHttps: true })),
    ).get('/api/ping');
    expect(https.headers['strict-transport-security']).toBeDefined();

    const http = await request(
      appFor(makeConfig({ originIsHttps: false })),
    ).get('/api/ping');
    expect(http.headers['strict-transport-security']).toBeUndefined();
  });

  it('never emits Cross-Origin-Embedder-Policy', async () => {
    const res = await request(appFor(makeConfig())).get('/api/ping');
    expect(headerKeys(res)).not.toContain('cross-origin-embedder-policy');
  });

  it('sets Cache-Control: no-store on an /api path', async () => {
    const res = await request(appFor(makeConfig())).get('/api/ping');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('sets Cache-Control: no-store on the HTML document', async () => {
    const res = await request(appFor(makeConfig())).get('/dashboard');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('does not force no-store on a hashed static asset', async () => {
    const res = await request(appFor(makeConfig())).get(
      '/assets/app.abc123.js',
    );
    expect(res.headers['cache-control']).not.toBe('no-store');
  });
});
