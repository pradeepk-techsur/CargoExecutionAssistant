// Response security headers (TechArch §4.5 + deviation D-1, §3.2, FR-Y3.9,
// FR-Y3.9a).
//
// This module owns every security-relevant response header the product emits,
// and — just as importantly — the one header it must NEVER emit.
//
// ─── The header that is never sent ──────────────────────────────────────────
// X-Frame-Options MUST NOT be emitted on any route, in any configuration, with
// any value (FR-Y3.9a, D-1). The application is demonstrated inside a sandbox
// preview IFRAME, and X-Frame-Options has no allowlist form: `DENY` and
// `SAMEORIGIN` are equally fatal to the only environment the walkthrough happens
// in. helmet sends `X-Frame-Options: SAMEORIGIN` BY DEFAULT — `frameguard:
// false` below is therefore not optional polish, it is the whole point. (The
// header name appears in this file only inside comments explaining the rule;
// nothing here ever *sets* it.)
//
// Equally prohibited: CSP `frame-ancestors 'none'`, a bare `frame-ancestors
// 'self'`, and Cross-Origin-Embedder-Policy. `loadConfig` already refuses the
// first two, so no defensive re-check is needed here.

import helmet from 'helmet';
import type { RequestHandler } from 'express';
import type { AppConfig } from '../config.js';

/**
 * The always-on CSP directives of TechArch §4.5, in order. `frame-ancestors`
 * is NOT here — it is appended conditionally below.
 *
 * No `unsafe-inline` and no nonce machinery: there is no inline script anywhere
 * (§4.5). The USWDS stylesheet is a compiled file served from the same origin
 * and referenced by a `<link rel="stylesheet">` in web/index.html (plan 02-05)
 * — it is NOT imported from JavaScript. A JS-injected `<style>` element would
 * violate `style-src 'self'` and the stylesheet would silently not apply; keep
 * that dependency in mind before adding any runtime style injection.
 */
const CSP_ALWAYS_ON = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
] as const;

/**
 * Assemble the Content-Security-Policy header value for this config.
 *
 * `frame-ancestors` is appended ONLY when `config.frameAncestors !== null`.
 * Unset is the demonstration default and means the directive is omitted
 * entirely — the app is embeddable and no frame-blocking exists. `loadConfig`
 * has already refused `'none'` and `'self'` (see config.ts self-check 3), so no
 * value that would break the preview can reach here.
 */
function buildCsp(config: AppConfig): string {
  const directives: string[] = [...CSP_ALWAYS_ON];
  if (config.frameAncestors !== null) {
    directives.push(`frame-ancestors ${config.frameAncestors}`);
  }
  return directives.join('; ');
}

/**
 * The ordered array of response-header handlers every route inherits.
 *
 * Order: helmet first (baseline headers with framing/CSP disabled), then the
 * hand-written CSP and the per-path cache header.
 */
export function securityHeaders(config: AppConfig): RequestHandler[] {
  const helmetHandler = helmet({
    frameguard: false, // D-1: X-Frame-Options is NEVER sent
    contentSecurityPolicy: false, // the CSP below is hand-written (§4.5)
    crossOriginEmbedderPolicy: false, // would break framing for no benefit here
    hsts: config.originIsHttps ? { maxAge: 31536000 } : false,
    referrerPolicy: { policy: 'same-origin' },
    // noSniff stays on -> X-Content-Type-Options: nosniff
  }) as unknown as RequestHandler;

  const csp = buildCsp(config);

  const cspAndCache: RequestHandler = (req, res, next) => {
    // The §4.5 CSP on every response.
    res.setHeader('Content-Security-Policy', csp);

    // Cache policy (§3.2, §4.5):
    //  - no-store on every /api response, so a stale API answer is never reused
    //  - no-store on the SPA document, so a stale shell never renders against a
    //    new API. Static hashed assets are left to express.static's defaults.
    const path = req.path ?? req.url ?? '';
    if (path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (isHtmlDocumentRequest(req)) {
      res.setHeader('Cache-Control', 'no-store');
    }

    next();
  };

  return [helmetHandler, cspAndCache];
}

/**
 * Whether this request is for an HTML document (the SPA shell). We treat a
 * request that accepts HTML and is not for a file with an extension as a
 * document request; hashed static assets (`/assets/app.abc123.js`) carry an
 * extension and are excluded.
 */
function isHtmlDocumentRequest(req: {
  path?: string;
  url?: string;
  accepts?: (type: string) => string | false;
  headers?: Record<string, unknown>;
}): boolean {
  const path = req.path ?? req.url ?? '';
  const last = path.split('/').pop() ?? '';
  const hasExtension = last.includes('.');
  if (hasExtension) {
    return false;
  }
  // Prefer express's content negotiation when available.
  if (typeof req.accepts === 'function') {
    return req.accepts('html') !== false;
  }
  const accept = String(req.headers?.['accept'] ?? '');
  return accept.includes('text/html') || accept.includes('*/*') || accept === '';
}
