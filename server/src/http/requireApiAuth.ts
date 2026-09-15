// The API authentication gate (F1 FR-1.7, TechArch §4.2).
//
// `sessionMiddleware` deliberately NEVER rejects — it only attaches
// `req.principal`, because the same condition needs two different answers: a
// protected API route answers 401 UNAUTHENTICATED, an HTML document request
// answers 302 to /sign-in. This middleware is the API half of that split, and
// `htmlRouteGuard` is the document half.
//
// ORDER IS LOAD-BEARING: this runs AFTER sessionMiddleware (it reads the
// principal that middleware attached) and BEFORE csrfMiddleware. Running it
// after CSRF would answer `403 CSRF_INVALID` to a caller whose real problem is
// that they have no session — which is what plan 02-04 shipped and what plan
// 02-06 recorded as the phase-2 carry-forward.
//
// POST /api/session is the sole exemption: it CREATES the session, so requiring
// one would make sign-in unreachable.
//
// Refusal is UNIFORM across every /api path — implemented, not-yet-implemented,
// and unknown alike. That is deliberate: an anonymous caller must not be able to
// probe which /api paths exist by comparing a 404 against a 401 (information
// disclosure). The 404/405 distinction is for AUTHENTICATED callers, where it is
// useful and discloses nothing.
//
// The gate reads ONLY `req.principal` — never a header, a body property, or a
// query value. `req.principal` is the sole source of actor identity in the
// product (FR-1.6), resolved from the `cargoexec_sid` cookie alone by
// session.middleware.ts; plan 02-09's architecture scan fails the build on any
// forging shape.

import type { RequestHandler } from 'express';
import { ApiError } from './errorMapper.js';

export function requireApiAuth(): RequestHandler {
  return (req, _res, next) => {
    // Non-/api paths (static assets, SPA documents, the HTML routes) pass
    // straight through — the sign-in SPA bundle must reach an unauthenticated
    // browser, and the document half of the split is htmlRouteGuard's.
    if (!req.path.startsWith('/api/') && req.path !== '/api') {
      return next();
    }
    // The one exemption: POST /api/session mints the session, so requiring one
    // would make sign-in unreachable.
    if (req.method.toUpperCase() === 'POST' && req.path === '/api/session') {
      return next();
    }
    // A resolved principal (from the cookie alone) is the only thing that opens
    // the gate.
    if (req.principal !== undefined) {
      return next();
    }
    // No principal ⇒ uniform 401 UNAUTHENTICATED, routed through errorMapper —
    // the single §3.7 translation point — so the envelope, request_id,
    // Cache-Control: no-store, and the absence of Location / WWW-Authenticate
    // all come from code already in place.
    return next(new ApiError(401, 'UNAUTHENTICATED'));
  };
}
