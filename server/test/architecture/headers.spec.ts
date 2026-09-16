// Architecture suite — deviation D-1 as a build constraint, both halves
// (TechArch §8.3 test:arch header rows, §4.5, §4.6; D-1; FR-Y3.9a; FR-2.25 / §7.8).
//
// D-1: the application is demonstrated INSIDE a preview IFRAME, and any
// frame-blocking response header renders it unreachable there with no visible
// cause. X-Frame-Options has NO allowlist form — DENY and SAMEORIGIN are equally
// fatal — so it must NEVER be emitted, on any route, in any configuration; and
// CSP frame-ancestors 'none' / bare 'self' and Cross-Origin-Embedder-Policy are
// equally prohibited.
//
// This D-1 guarantee is proven TWO ways, because each catches a failure the
// other cannot:
//   - BEHAVIOURAL: assemble the real createApp and drive supertest over every
//     API_ROUTE_TABLE path and the SPA document paths, under all three
//     cookie-profile/origin configurations. Catches a header actually emitted.
//   - SOURCE: a filesystem scan. Catches a header a future route WOULD emit but
//     that today's routes do not exercise, and the startup self-checks whose
//     silent absence is worst.
//
// No database is needed: the header assertions run before any handler queries,
// and sessionMiddleware only queries when a cookie is present (an absent cookie
// leaves the principal unset without touching the pool). We therefore inject a
// stub pool that is never queried. See the note on server/tsconfig in
// navigation.spec.ts for why importing app source here is typecheck-safe.

import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import type { Pool } from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

import { createApp } from '../../src/http/app.js';
import { loadConfig, type AppConfig } from '../../src/config.js';
import { API_ROUTE_TABLE } from '../../src/http/routes/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const SERVER_SRC = join(REPO_ROOT, 'server', 'src');
const WEB_SRC = join(REPO_ROOT, 'web', 'src');

/** A pool that fails loudly if any header assertion ever reaches the database. */
const STUB_POOL = {
  query() {
    throw new Error('STUB_POOL was queried — the header assertions need no database');
  },
  connect() {
    throw new Error('STUB_POOL was connected — the header assertions need no database');
  },
} as unknown as Pool;

/** The base test config; each configuration below overrides the relevant keys. */
function baseConfig(): AppConfig {
  return {
    nodeEnv: 'test',
    host: '0.0.0.0',
    port: 3000,
    databaseUrlApp: 'postgres://stub',
    sessionCookieProfile: 'governed',
    frameAncestors: null,
    logLevel: 'silent',
    originIsHttps: false,
  };
}

/** Substitute concrete values for path parameters so every route is reachable. */
function concretePath(path: string): string {
  return path
    .replace(':entryId', '11111111-1111-1111-1111-111111111111')
    .replace(':idOrReference', 'CE-2026-000001')
    .replace(':exceptionId', '22222222-2222-2222-2222-222222222222');
}

// Every API path plus the SPA document paths (§3.17).
const API_PATHS = API_ROUTE_TABLE.map((r) => ({
  method: r.method.toLowerCase() as 'get' | 'post' | 'delete',
  path: concretePath(r.path),
}));
const DOC_PATHS = ['/sign-in', '/queue', '/'];

// The three configurations to prove D-1 holds regardless of cookie profile or
// scheme: governed+http, governed+https, demo-iframe+https (demo-iframe requires
// https — loadConfig refuses it over http, §4.3).
const CONFIGS: Array<{ name: string; config: AppConfig }> = [
  { name: 'governed + non-HTTPS', config: { ...baseConfig() } },
  {
    name: 'governed + HTTPS',
    config: { ...baseConfig(), originIsHttps: true },
  },
  {
    name: 'demo-iframe + HTTPS',
    config: {
      ...baseConfig(),
      sessionCookieProfile: 'demo-iframe',
      originIsHttps: true,
      frameAncestors: '*',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Behavioural half — the real assembled app, driven over every route.
// ─────────────────────────────────────────────────────────────────────────────

describe('headers — D-1: no frame-blocking header on any route (behavioural)', () => {
  for (const { name, config } of CONFIGS) {
    const app = createApp({ config, pool: STUB_POOL, serveStatic: false });

    for (const { method, path } of API_PATHS) {
      it(`[${name}] ${method.toUpperCase()} ${path} sends no X-Frame-Options and no COEP`, async () => {
        const res = await supertest(app)[method](path);
        const keys = Object.keys(res.headers).map((k) => k.toLowerCase());
        expect(
          keys.includes('x-frame-options'),
          `D-1 violated: the application is demonstrated inside a preview IFRAME ` +
            `and X-Frame-Options has no allowlist form — it must never be emitted ` +
            `(${method.toUpperCase()} ${path}, ${name}).`,
        ).toBe(false);
        expect(
          keys.includes('cross-origin-embedder-policy'),
          `Cross-Origin-Embedder-Policy would break framing for no benefit here ` +
            `(${method.toUpperCase()} ${path}, ${name}).`,
        ).toBe(false);
      });
    }

    for (const path of DOC_PATHS) {
      it(`[${name}] document ${path} sends no X-Frame-Options and no COEP`, async () => {
        const res = await supertest(app)
          .get(path)
          .set('Accept', 'text/html,application/xhtml+xml');
        const keys = Object.keys(res.headers).map((k) => k.toLowerCase());
        expect(keys.includes('x-frame-options')).toBe(false);
        expect(keys.includes('cross-origin-embedder-policy')).toBe(false);
      });
    }
  }
});

describe('headers — the CSP frame-ancestors contract (behavioural)', () => {
  it('with frameAncestors: null, the CSP omits frame-ancestors entirely', async () => {
    const app = createApp({
      config: { ...baseConfig(), frameAncestors: null },
      pool: STUB_POOL,
      serveStatic: false,
    });
    const res = await supertest(app).get('/api/session');
    const csp = String(res.headers['content-security-policy'] ?? '');
    expect(csp.length).toBeGreaterThan(0);
    expect(csp).not.toMatch(/frame-ancestors/i);
  });

  it('with an allowlist configured, the CSP contains exactly that allowlist', async () => {
    const app = createApp({
      config: { ...baseConfig(), frameAncestors: 'https://preview.example' },
      pool: STUB_POOL,
      serveStatic: false,
    });
    const res = await supertest(app).get('/api/session');
    const csp = String(res.headers['content-security-policy'] ?? '');
    expect(csp).toMatch(/frame-ancestors https:\/\/preview\.example/);
  });

  it("no configuration emits frame-ancestors 'none' or a bare 'self'", async () => {
    for (const { config } of CONFIGS) {
      const app = createApp({ config, pool: STUB_POOL, serveStatic: false });
      const res = await supertest(app).get('/api/session');
      const csp = String(res.headers['content-security-policy'] ?? '');
      expect(csp).not.toMatch(/frame-ancestors\s+'none'/i);
      expect(csp).not.toMatch(/frame-ancestors\s+'self'\s*(;|$)/i);
    }
  });
});

describe('headers — §3.2 conventions on /api responses (behavioural)', () => {
  const app = createApp({ config: baseConfig(), pool: STUB_POOL, serveStatic: false });

  it('every /api response carries Cache-Control: no-store and an X-Request-Id', async () => {
    for (const { method, path } of API_PATHS) {
      const res = await supertest(app)[method](path);
      expect(res.headers['cache-control'], `${method} ${path}`).toBe('no-store');
      expect(
        typeof res.headers['x-request-id'],
        `${method} ${path} X-Request-Id`,
      ).toBe('string');
      expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source half — filesystem scans covering routes that do not exist yet.
// ─────────────────────────────────────────────────────────────────────────────

/** Recursively list source files under `root`. */
function walk(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        stack.push(full);
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

/** Strip comments so we scan executable text only. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

describe('headers — D-1 source guarantees', () => {
  it('X-Frame-Options is never SET anywhere under server/src', () => {
    // Match a header SET (setHeader/header/res.set) whose name is X-Frame-Options.
    // Occurrences inside comments are permitted and expected — headers.ts explains
    // the rule in prose — so we scan comment-stripped source only.
    const setForms = [
      /setHeader\(\s*['"`]x-frame-options['"`]/i,
      /\.header\(\s*['"`]x-frame-options['"`]/i,
      /res\.set\(\s*['"`]x-frame-options['"`]/i,
      /['"`]x-frame-options['"`]\s*:/i, // an object of headers
    ];
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      if (setForms.some((re) => re.test(src))) {
        offenders.push(relative(REPO_ROOT, file));
      }
    }
    expect(
      offenders,
      `X-Frame-Options is SET in: ${offenders.join(', ')}. It must never be ` +
        'emitted (D-1, FR-Y3.9a).',
    ).toEqual([]);
  });

  it('helmet is configured with frameguard: false', () => {
    // helmet sends X-Frame-Options: SAMEORIGIN by default; frameguard: false is
    // therefore the whole point, and a refactor dropping it must fail HERE, not
    // in the preview.
    const headersSrc = readFileSync(join(SERVER_SRC, 'http', 'headers.ts'), 'utf8');
    expect(headersSrc).toMatch(/frameguard\s*:\s*false/);
  });

  it('loadConfig refuses FRAME_ANCESTORS of none/self and a loopback HOST', () => {
    const base = {
      DATABASE_URL_APP: 'postgres://stub',
      NODE_ENV: 'test',
      HOST: '0.0.0.0',
      // The AI environment is mandatory since plan 05-01; the fake posture keeps
      // this header/host-focused check's positive control valid without a real
      // provider or API key.
      AI_PROVIDER_URL: 'fake:deterministic',
      AI_MODEL_ID: 'test-model',
      PROMPT_VERSION: '2026.09.1',
    };
    expect(() => loadConfig({ ...base, FRAME_ANCESTORS: "'none'" })).toThrow();
    expect(() => loadConfig({ ...base, FRAME_ANCESTORS: 'none' })).toThrow();
    expect(() => loadConfig({ ...base, FRAME_ANCESTORS: "'self'" })).toThrow();
    expect(() => loadConfig({ ...base, FRAME_ANCESTORS: 'self' })).toThrow();
    expect(() => loadConfig({ ...base, HOST: 'localhost' })).toThrow();
    expect(() => loadConfig({ ...base, HOST: '127.0.0.1' })).toThrow();
    expect(() => loadConfig({ ...base, HOST: '::1' })).toThrow();
    // A benign allowlist is accepted (positive control).
    expect(() =>
      loadConfig({ ...base, FRAME_ANCESTORS: 'https://preview.example' }),
    ).not.toThrow();
  });

  it('no dangerouslySetInnerHTML anywhere under web/src (§4.6, §8.3)', () => {
    const offenders: string[] = [];
    for (const file of walk(WEB_SRC)) {
      const src = readFileSync(file, 'utf8');
      if (/dangerouslySetInnerHTML/.test(src)) {
        offenders.push(relative(REPO_ROOT, file));
      }
    }
    expect(
      offenders,
      `dangerouslySetInnerHTML in: ${offenders.join(', ')}. React's default ` +
        'escaping must be the only rendering path for server text (§4.6).',
    ).toEqual([]);
  });

  it('no template-literal SQL under server/src (R-L8, §4.6, FR-Y1.6)', () => {
    // No `.query(` call whose text argument is a template literal that
    // interpolates CALLER DATA. R-L8's threat is user-controlled values reaching
    // query text; a template literal that only assembles a STATIC, bind-only
    // scaffold is not that threat. Two documented exclusions (extended
    // deliberately by later phases, never weakened), each carrying no
    // caller-controlled data:
    //  - server/src/db/tx.ts — `SET LOCAL statement_timeout = '${n}ms'`, where
    //    `n` is a positive integer validated at the top of withTransaction, and
    //    statement_timeout is a SESSION SETTING that cannot take a bind
    //    parameter. Not caller data; not an injection vector.
    //  - server/src/services/audit/writer.ts — the multi-row bulk INSERT builds
    //    its `VALUES ($1,$2,…),($8,…)` PLACEHOLDER tuples via `${tuples.join(',')}`
    //    from a fixed column count and the row index; every actual value goes
    //    through the `params` bind array. The interpolation is placeholder
    //    scaffolding, not data — the canonical safe bulk-insert pattern.
    //  - server/src/db/repositories/recommendations.ts — the multi-row
    //    `recommendation_values` insert builds its `VALUES (…),(…)` placeholder
    //    tuples from a fixed column count and the row index; every actual value
    //    goes through the `params` bind array. The same canonical safe
    //    bulk-insert pattern, extended deliberately, never weakened.
    const EXCLUDED = new Set([
      join('server', 'src', 'db', 'tx.ts'),
      join('server', 'src', 'services', 'audit', 'writer.ts'),
      join('server', 'src', 'db', 'repositories', 'recommendations.ts'),
    ]);
    const offenders: string[] = [];
    for (const file of walk(SERVER_SRC)) {
      const rel = relative(REPO_ROOT, file);
      if (EXCLUDED.has(rel)) continue;
      const src = stripComments(readFileSync(file, 'utf8'));
      // .query( followed (allowing whitespace) by a backtick template literal
      // that contains ${ before the call is closed on that region.
      for (const m of src.matchAll(/\.query\(\s*`([^`]*)`/g)) {
        if ((m[1] as string).includes('${')) {
          offenders.push(`${rel}: ${(m[0] as string).slice(0, 60)}…`);
        }
      }
    }
    expect(
      offenders,
      `Template-literal SQL in: ${offenders.join(', ')}. Queries take a static ` +
        'text and $-placeholders only (R-L8, FR-Y1.6).',
    ).toEqual([]);
  });
});
