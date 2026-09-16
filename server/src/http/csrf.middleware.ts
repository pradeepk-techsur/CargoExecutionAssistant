// Double-submit CSRF protection (TechArch §4.4, §3.1; F1 FR-1.9).
//
// The session cookie authenticates every request automatically, which is
// exactly what makes a cross-site forged request dangerous: a malicious page
// can cause the browser to send an authenticated POST/DELETE without the
// specialist's intent. The defence is a token the attacker cannot read: on
// every state-changing request the caller must present `X-CSRF-Token`, whose
// SHA-256 must equal the digest stored on the session row (`csrf_token_hash`).
// The token was returned to the SPA once at sign-in (and re-issued on each
// `GET /api/session`) and is held in memory by the page; a cross-site page has
// no way to obtain it, so it cannot forge the header.
//
// This protection is INDEPENDENT of the cookie's SameSite value, which is what
// makes deviation D-2 (SameSite=None under the demo-iframe profile) acceptable
// (§4.4): even a cookie that is sent cross-site cannot carry a matching CSRF
// token. Do not "simplify" this away in favour of SameSite alone.
//
// The comparison is constant-time (`crypto.timingSafeEqual`) so a byte-by-byte
// timing side channel cannot be used to recover a valid token.

import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { ApiError } from './errorMapper.js';
import { API_ROUTE_TABLE } from './routes/index.js';

// Only these methods change state and are therefore CSRF-checked. GET and HEAD
// are NEVER checked and — by the ten-route contract — never change state; that
// is an invariant of the API surface, not a convention of this file (§4.4).
const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// The IMPLEMENTED state-changing method+path pairs, so CSRF only guards a
// request that an actual state-changing route would handle. A state-changing
// method on a known path that is NOT implemented (e.g. PUT /api/session) is a
// 405 METHOD_NOT_ALLOWED — a request-shape error, not a forged mutation — and
// must be allowed past CSRF so the route stage can answer 405 (§3.1: "any other
// method on a listed path returns 405"). Checking CSRF first would mask the 405
// with a 403, contradicting the contract.
//
// csrfMiddleware runs BEFORE route matching, so `req.route` is not yet
// available; the incoming `req.path` is a CONCRETE path
// (`/api/exceptions/<uuid>/decision`) while the route table declares PATTERNS
// (`/api/exceptions/:exceptionId/decision`). Matching the two as plain strings
// silently skips CSRF for every parameterised state-changing route — which
// POST …/decision (F11) is the first to exercise. Compile each implemented
// state-changing pattern to an anchored regex so a `:param` segment matches any
// single non-slash segment of the concrete path.
const IMPLEMENTED_STATE_CHANGING: ReadonlyArray<{ method: string; re: RegExp }> =
  API_ROUTE_TABLE.filter(
    (r) => r.implemented && STATE_CHANGING.has(r.method.toUpperCase()),
  ).map((r) => ({ method: r.method.toUpperCase(), re: patternToRegExp(r.path) }));

/** Compile a route pattern (with `:param` segments) to an anchored path regex. */
function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('/')
    .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${escaped}$`);
}

/** Whether a concrete method+path matches an implemented state-changing route. */
function isImplementedStateChanging(method: string, path: string): boolean {
  return IMPLEMENTED_STATE_CHANGING.some((r) => r.method === method && r.re.test(path));
}

// POST /api/session is the ONE state-changing request that is exempt: it CREATES
// the session, so there is no stored token to compare against yet (§4.4; §3.1
// shows CSRF "no" for that row). Sign-in is protected by the credential itself,
// not by a token that does not exist until it succeeds.
function isExempt(method: string, path: string): boolean {
  return method === 'POST' && path === '/api/session';
}

/**
 * Refuse any state-changing request whose `X-CSRF-Token` does not match the
 * session's stored `csrf_token_hash`. A failure — missing header, no session,
 * length mismatch, or value mismatch — throws `ApiError(403, 'CSRF_INVALID')`
 * BEFORE the request reaches any route or service, so no state changes and no
 * audit entry is written (§4.4, US-1.2 AC-5).
 */
export function csrfMiddleware(): RequestHandler {
  return (req, _res, next) => {
    const method = req.method.toUpperCase();
    if (!STATE_CHANGING.has(method)) {
      return next(); // GET/HEAD/OPTIONS — never checked, never mutate
    }
    if (isExempt(method, req.path)) {
      return next(); // POST /api/session mints the session; nothing to compare
    }

    // A state-changing method on a path that no implemented route handles is a
    // 405 (a shape error), not a mutation to defend. Let it through so the route
    // stage answers METHOD_NOT_ALLOWED rather than masking it with a 403.
    if (!isImplementedStateChanging(method, req.path)) {
      return next();
    }

    const stored = req.csrfTokenHash;
    const header = req.header('x-csrf-token');

    // No session (thus no stored hash) or no header ⇒ cannot verify ⇒ refuse.
    if (stored === undefined || header === undefined || header === '') {
      throw new ApiError(403, 'CSRF_INVALID');
    }

    const presented = crypto.createHash('sha256').update(header, 'utf8').digest();

    // Length guard FIRST: timingSafeEqual throws on unequal-length buffers.
    // Both are SHA-256 digests so both are 32 bytes; a differing length is
    // itself a failure, handled before the constant-time compare.
    if (presented.length !== stored.length) {
      throw new ApiError(403, 'CSRF_INVALID');
    }

    if (!crypto.timingSafeEqual(presented, stored)) {
      throw new ApiError(403, 'CSRF_INVALID');
    }

    return next();
  };
}
