// The single F9 endpoint (TechArch §3.1 row 8; FRD F9 FR-9.6/FR-9.7/FR-9.14).
//
//   GET /api/exceptions/:exceptionId/recommendation   the polling read.
//
// This is the endpoint the case-detail screen (plan 05-05) polls every 3s
// while a recommendation is PENDING (FR-10.7). It is a THIN HTTP translation
// over `loadRecommendationDetail` (05-03): it refuses any query parameter,
// re-checks authentication belt-and-braces, validates the FORM of the path
// identifier (always a uuid — TechArch §3.1 row 8 has no dual uuid/reference
// form the case-detail route carries) BEFORE any service/DB call, then maps
// the service's two outcomes (a `RecommendationDetailDto`, or `'NOT_FOUND'`)
// to HTTP.
//
// This route is GET-only by design (F9 FR-9.6/FR-9.14): there is deliberately
// NO post/put/patch/delete handler — no regenerate, no apply, no manual
// trigger. Generation triggers on exception creation ONLY; the API surface is
// read-only. Reading a recommendation writes NO row and NO audit entry — the
// service calls no `append()`.

import type { Request, Response, RequestHandler } from 'express';
import { ApiError } from '../errorMapper.js';
import { loadRecommendationDetail } from '../../services/recommendationRead.service.js';
import type { RouteDeps } from './index.js';

// The exception uuid form — the SAME case-insensitive five-group shape
// exceptions.ts's UUID_RE uses. The identifier here is ALWAYS a uuid.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getRecommendation(deps: RouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // 1. No query parameter of any kind (matching the F7 routes' FR-7.2-style
    //    rule). Every rejected query string is the SAME 400; the offending key
    //    is named in a detail so a client learns which parameter it sent.
    const keys = Object.keys(req.query);
    if (keys.length > 0) {
      const key = keys[0] as string;
      throw new ApiError(400, 'UNSUPPORTED_QUERY_PARAMETER', undefined, [
        {
          field: key,
          code: 'unsupported_query_parameter',
          message: `This endpoint accepts no query parameters (received: ${key}).`,
        },
      ]);
    }

    // 2. Belt-and-braces auth re-check (requireApiAuth already answered 401 for
    //    a session-less caller; this keeps the handler correct in isolation and
    //    fails loudly on a middleware regression).
    if (req.principal === undefined) {
      throw new ApiError(401, 'UNAUTHENTICATED');
    }

    // 3. Validate the identifier FORM before any service/DB call (T-05-07): a
    //    malformed id is refused 400 INVALID_IDENTIFIER and never reaches the
    //    service. The value that DOES reach the service is always bound as $1
    //    inside resolveCaseIdentifier/loadRecommendationByException, never
    //    concatenated.
    const exceptionId = req.params['exceptionId'] ?? '';
    if (!UUID_RE.test(exceptionId)) {
      throw new ApiError(400, 'INVALID_IDENTIFIER');
    }

    // 4. Load the recommendation. loadRecommendationDetail returns one of two
    //    outcomes: a RecommendationDetailDto (one of the three PENDING/
    //    AVAILABLE/UNAVAILABLE shapes) ⇒ 200; or 'NOT_FOUND' (no such
    //    exception) ⇒ 404 EXCEPTION_NOT_FOUND. Cache-Control: no-store is set
    //    globally for every /api response by securityHeaders (§3.2).
    const result = await loadRecommendationDetail(deps.pool, exceptionId);
    if (result === 'NOT_FOUND') {
      throw new ApiError(404, 'EXCEPTION_NOT_FOUND');
    }
    res.status(200).json(result);
  };
}

/**
 * The F9 route handler, built with its dependencies. Exports exactly `{ get }`
 * — there is deliberately NO post/put/patch/delete: no regenerate, no apply, no
 * manual trigger (F9 FR-9.6/FR-9.14 — generation triggers on exception creation
 * ONLY). Consumed by `routes/index.ts` where it is registered from the single
 * ROUTES array.
 */
export function recommendationRoutes(deps: RouteDeps): { get: RequestHandler } {
  return { get: getRecommendation(deps) };
}
