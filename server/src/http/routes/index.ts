// The route registry (TechArch §1A.3, §3.1; FRD Y1 §0; FR-Y1.1).
//
// Two exported data structures, and one function that registers routes from
// them:
//
//   API_ROUTE_TABLE  — the FULL ten method/path pairs of §3.1, as data. Five
//                      are not yet implemented (phases 4–6); they are listed so
//                      the auth matrix in plan 02-06 can assert 401 across ALL
//                      ten (which it can, because sessionMiddleware runs before
//                      route matching), and so the phase that completes each has
//                      one place to read. "Anything not on this list does not
//                      exist" (§3.1). Adding an eleventh row requires a feature
//                      requirement in the FRD — that friction is the point.
//
//   ROUTES           — the concrete handlers for the five IMPLEMENTED rows,
//                      the single array an architecture test can pin. Route
//                      registration is data-driven from one array (§1A.3).
//
// registerRoutes registers ONLY the implemented rows. There is deliberately no
// placeholder handler for the five unimplemented pairs: an endpoint that exists
// and returns 501 is still an endpoint, and 501 is not in the Y2 catalogue. An
// unmatched /api path is answered by the JSON 404 envelope in app.ts.

import type { Pool } from 'pg';
import { Router, type RequestHandler } from 'express';
import type { Clock } from '../../clock.js';
import type { AppConfig } from '../../config.js';
import { sessionRoutes } from './session.js';
import { entryRoutes } from './entries.js';

export type HttpMethod = 'get' | 'post' | 'delete';

/**
 * The full ten method/path pairs of TechArch §3.1, as data. `implemented`
 * marks the five now registered (the three F1 session pairs and the two F3
 * entry pairs); the other five belong to the feature that owns them. Adding a
 * row requires an FRD requirement (FR-Y1.1).
 */
export const API_ROUTE_TABLE = [
  { method: 'POST', path: '/api/session', feature: 'F1', implemented: true },
  { method: 'GET', path: '/api/session', feature: 'F1', implemented: true },
  { method: 'DELETE', path: '/api/session', feature: 'F1', implemented: true },
  { method: 'POST', path: '/api/entries', feature: 'F3', implemented: true },
  { method: 'GET', path: '/api/entries/:entryId', feature: 'F3', implemented: true },
  { method: 'GET', path: '/api/exceptions', feature: 'F7', implemented: false },
  { method: 'GET', path: '/api/exceptions/:idOrReference', feature: 'F7', implemented: false },
  {
    method: 'GET',
    path: '/api/exceptions/:exceptionId/recommendation',
    feature: 'F9',
    implemented: false,
  },
  {
    method: 'POST',
    path: '/api/exceptions/:exceptionId/decision',
    feature: 'F11',
    implemented: false,
  },
  { method: 'GET', path: '/api/exceptions/:exceptionId/audit', feature: 'F13', implemented: false },
] as const;

/** Dependencies every route handler is built with. */
export interface RouteDeps {
  pool: Pool;
  config: AppConfig;
  clock: Clock;
}

/** One implemented route: method, path, handler. The pinnable array (§1A.3). */
export interface RouteEntry {
  method: HttpMethod;
  path: string;
  handler: RequestHandler;
}

/**
 * Build the single ROUTES array of implemented handlers. Kept as a builder (not
 * a module constant) because each handler closes over the request-path pool and
 * config, which are injected — createApp hands a per-suite pool to the tests.
 */
export function buildRoutes(deps: RouteDeps): RouteEntry[] {
  const session = sessionRoutes({
    pool: deps.pool,
    config: deps.config,
    clock: deps.clock,
  });
  const entries = entryRoutes({
    pool: deps.pool,
    config: deps.config,
    clock: deps.clock,
  });
  // Registration order follows §3.1: the session routes first, then the entries
  // routes. The parameterised GET /api/entries/:entryId does not collide with
  // the flat /api/entries POST, and keeping it after the session routes lets the
  // array read in §3.1 order.
  return [
    { method: 'post', path: '/api/session', handler: session.post },
    { method: 'get', path: '/api/session', handler: session.get },
    { method: 'delete', path: '/api/session', handler: session.delete },
    { method: 'post', path: '/api/entries', handler: entries.post },
    { method: 'get', path: '/api/entries/:entryId', handler: entries.get },
  ];
}

/**
 * Register every implemented route onto `router` from the single ROUTES array.
 * Async handlers are wrapped so a rejected promise reaches Express's error
 * pipeline (and therefore errorMapper) rather than becoming an unhandled
 * rejection — Express 4 does not await handlers.
 */
export function registerRoutes(router: Router, deps: RouteDeps): void {
  for (const route of buildRoutes(deps)) {
    router[route.method](route.path, wrapAsync(route.handler));
  }
}

/** Also exported for the boot test, which asserts exactly five are registered. */
export const ROUTES = API_ROUTE_TABLE.filter((r) => r.implemented);

/**
 * Wrap a handler so any thrown error or rejected promise is forwarded to
 * `next(err)`. Without this, an `async` handler that rejects would escape the
 * error middleware entirely (Express 4 does not catch async rejections).
 */
function wrapAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    try {
      const out = handler(req, res, next) as unknown;
      if (out instanceof Promise) {
        out.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}
