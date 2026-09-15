// Express application assembly (TechArch §1A.3, §4.6, §6.5).
//
// The middleware order below is NORMATIVE (§1A.3). Two orderings carry a
// security consequence. `session` runs BEFORE `csrf`: the CSRF check compares
// the presented token against the session's stored hash, so it must run after
// the session is resolved. And `requireApiAuth` runs AFTER `session` (it reads
// the principal that middleware attached) and BEFORE `csrf`: a caller with no
// session must be answered 401 UNAUTHENTICATED, not masked as 403 CSRF_INVALID
// (F1 FR-1.7, §4.2). `errorMapper` is registered LAST, as Express's error
// middleware. `htmlRouteGuard` runs AFTER the API routes so an unmatched
// `/api/...` produces a JSON 404 envelope rather than the SPA document (§6.5).
//
//   requestId → headers → bodyLimit(64KB) → [static] → session → requireApiAuth
//             → csrf → routes (+ /api 404, +405) → htmlRouteGuard
//             → [SPA fallback] → errorMapper
//
// createApp constructs NOTHING at import time and takes the pool as a parameter,
// so an API test can hand it a per-suite database — which is also what makes the
// context-boot test possible.

import express from 'express';
import type { Pool } from 'pg';
import type { Clock } from '../clock.js';
import { systemClock } from '../clock.js';
import type { AppConfig } from '../config.js';
import { requestId } from './requestId.js';
import { securityHeaders } from './headers.js';
import { errorMapper, ApiError } from './errorMapper.js';
import { sessionMiddleware } from './session.middleware.js';
import { requireApiAuth } from './requireApiAuth.js';
import { csrfMiddleware } from './csrf.middleware.js';
import { htmlRouteGuard } from './htmlRouteGuard.js';
import { registerRoutes, API_ROUTE_TABLE } from './routes/index.js';

export interface CreateAppOptions {
  config: AppConfig;
  /** The request-path pool (cargoexec_app). Injected; never constructed here. */
  pool: Pool;
  /** Injected by tests for deterministic expiry; defaults to systemClock. */
  clock?: Clock;
  /** Serve the built SPA + static assets. false in API tests, true in prod. */
  serveStatic?: boolean;
  /** Where the built web bundle lives, when serveStatic is true. */
  webDist?: string;
}

/**
 * Assemble the Express app in the normative middleware order (§1A.3).
 *
 * Middleware order is normative (TechArch §1A.3):
 *  requestId -> headers -> bodyLimit(64KB) -> cookies -> static
 *  -> session -> requireApiAuth -> csrf -> routes -> htmlRouteGuard
 *  -> errorMapper
 */
export function createApp(opts: CreateAppOptions): express.Express {
  const { config, pool } = opts;
  const clock = opts.clock ?? systemClock;
  const serveStatic = opts.serveStatic ?? false;

  const app = express();

  // trust proxy so req.protocol reflects X-Forwarded-Proto behind the preview
  // proxy. Without it, originIsHttps detection and the Secure cookie attribute
  // are wrong in exactly the environment the demonstration runs in (§6.5).
  app.set('trust proxy', true);
  app.disable('x-powered-by');

  // 1. Correlation id + per-request logger.
  app.use(requestId());

  // 2. Security headers (helmet with framing/CSP disabled + the §4.5 CSP + the
  //    per-path Cache-Control). NEVER X-Frame-Options (D-1).
  for (const handler of securityHeaders(config)) {
    app.use(handler);
  }

  // 3. Body parsing: 64 KB hard cap, application/json only. A body-bearing
  //    request with any other content type is refused 415, and no multipart
  //    parser is installed at all (§4.6). The 413 (too large) and 415
  //    (unsupported media type) cases are mapped to their Y2 codes below.
  app.use(express.json({ limit: '64kb', type: 'application/json' }));
  app.use(bodyErrorGuard());

  // (Cookies are parsed on demand by parseCookies; no cookie middleware.)

  // 4. Static assets (production SPA serving). index:false so the SPA fallback
  //    below — not express.static — owns document delivery.
  if (serveStatic && opts.webDist !== undefined) {
    app.use(express.static(opts.webDist, { index: false }));
  }

  // 5. Session resolution (attaches req.principal from the cookie alone).
  app.use(sessionMiddleware({ pool, clock }));

  // 5a. API authentication gate. Runs AFTER session (reads the principal it
  //     attached) and BEFORE csrf: any /api/* request except POST /api/session
  //     with no principal is refused 401 UNAUTHENTICATED here, uniformly across
  //     implemented, unimplemented and unknown paths, so a missing session is
  //     never masked as 403 CSRF_INVALID and no path-existence oracle leaks
  //     (F1 FR-1.7, §4.2). Static assets and HTML documents (not under /api)
  //     pass through — the sign-in SPA bundle must reach an anonymous browser.
  app.use(requireApiAuth());

  // 6. CSRF (double-submit) on every state-changing request bar POST /api/session.
  app.use(csrfMiddleware());

  // 7. The API routes, registered from the single ROUTES array.
  const apiRouter = express.Router();
  registerRoutes(apiRouter, { pool, config, clock });
  app.use(apiRouter);

  // 7a. Any /api path not answered above: 405 for a KNOWN path with an
  //     unregistered method, otherwise a JSON 404 envelope. Both are JSON, never
  //     the SPA document (§4.2, §3.7).
  app.use('/api', apiNotFoundOr405());

  // 8. HTML document guard — runs after the API routes so /api/unknown is JSON.
  app.use(htmlRouteGuard());

  // 9. SPA fallback: any remaining GET returns index.html (production only).
  if (serveStatic && opts.webDist !== undefined) {
    const indexPath = `${opts.webDist}/index.html`;
    app.get('*', (req, res, nextFn) => {
      if (req.path.startsWith('/api/')) {
        return nextFn();
      }
      res.sendFile(indexPath);
    });
  }

  // 10. The single translation point from failure to response envelope. LAST.
  app.use(errorMapper());

  return app;
}

/**
 * Map body-parsing failures to their Y2 codes. express.json throws a 413-shaped
 * error when the body exceeds the limit, and — because `type` restricts it to
 * application/json — a body-bearing request with another content type is left
 * unparsed. We turn the size error into REQUEST_TOO_LARGE, a wrong content type
 * on a body-bearing request into UNSUPPORTED_MEDIA_TYPE, and a JSON syntax error
 * into REQUEST_MALFORMED (§4.6).
 */
function bodyErrorGuard(): express.ErrorRequestHandler {
  return (err, req, _res, next) => {
    const e = err as { type?: string; status?: number; statusCode?: number };
    const status = e.status ?? e.statusCode;
    if (e.type === 'entity.too.large' || status === 413) {
      return next(new ApiError(413, 'REQUEST_TOO_LARGE'));
    }
    if (e.type === 'charset.unsupported' || e.type === 'encoding.unsupported') {
      return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE'));
    }
    if (e.type === 'entity.parse.failed' || status === 400) {
      return next(new ApiError(422, 'REQUEST_MALFORMED'));
    }
    return next(err);
  };
}

/** The set of implemented /api method+path pairs and the known path set. */
const KNOWN_API_PATHS = new Set(API_ROUTE_TABLE.map((r) => r.path));
const IMPLEMENTED_BY_PATH = new Map<string, Set<string>>();
for (const r of API_ROUTE_TABLE) {
  if (!r.implemented) continue;
  const set = IMPLEMENTED_BY_PATH.get(r.path) ?? new Set<string>();
  set.add(r.method.toUpperCase());
  IMPLEMENTED_BY_PATH.set(r.path, set);
}

/**
 * For an /api request not answered by a route: 405 METHOD_NOT_ALLOWED when the
 * path is a KNOWN implemented path but the method is not registered on it,
 * otherwise 404 ENTRY_NOT_FOUND-shaped JSON envelope. Only the three F1 paths
 * are implemented, so a known path with a wrong method is only reachable for
 * `/api/session`.
 */
function apiNotFoundOr405(): express.RequestHandler {
  return (req, _res, next) => {
    const path = req.baseUrl + (req.path === '/' ? '' : req.path);
    const method = req.method.toUpperCase();
    const implementedMethods = IMPLEMENTED_BY_PATH.get(path);
    if (implementedMethods !== undefined && !implementedMethods.has(method)) {
      return next(new ApiError(405, 'METHOD_NOT_ALLOWED'));
    }
    // Unknown path (or a not-yet-implemented known path) → 404. Reuse the
    // generic not-found code; there is no route, so nothing more specific.
    void KNOWN_API_PATHS;
    return next(new ApiError(404, 'ENTRY_NOT_FOUND'));
  };
}
