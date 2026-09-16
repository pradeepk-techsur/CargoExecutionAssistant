// The single F13 read endpoint (TechArch §3.1 row 10; FRD F13 FR-13.15/
// FR-13.18, F14):
//
//   GET /api/exceptions/:exceptionId/audit   the per-case audit-trail read.
//
// This is the endpoint the per-case audit-trail UI (F14, plan 06-04) fetches.
// It is the TENTH and FINAL row of §3.1 — with it, the API surface is complete.
//
// It is a THIN HTTP translation over `loadAuditTrailResponse`
// (auditRead.service.ts): mirroring recommendation.ts, it refuses any query
// parameter, re-checks authentication belt-and-braces, validates the FORM of
// the path identifier (always a uuid — the SPA calls this with the exception id
// it already holds) BEFORE any service/DB call, then maps the service's two
// outcomes (an `AuditTrailResponse`, or `'NOT_FOUND'`) to HTTP.
//
// This route is GET-only by design (F13 is read-only; the store is append-only
// and offers no repair affordance — Y2 §8): there is deliberately NO
// post/put/patch/delete handler. Reading the trail writes NO row and NO audit
// entry — the service calls no `append()`. A broken hash chain is REPORTED in
// the 200 body (chain_verified:false + first_divergence_sequence), never an
// error: the caller decides how to present it, and nothing is repaired.

import type { Request, Response, RequestHandler } from 'express';
import { ApiError } from '../errorMapper.js';
import { loadAuditTrailResponse } from '../../services/auditRead.service.js';
import type { RouteDeps } from './index.js';

// The exception uuid form — the SAME case-insensitive five-group shape
// recommendation.ts/exceptions.ts use. The identifier here is ALWAYS a uuid.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAudit(deps: RouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // 1. No query parameter of any kind (mirroring the recommendation route).
    //    Every rejected query string is the SAME 400; the offending key is
    //    named in a detail so a client learns which parameter it sent.
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

    // 3. Validate the identifier FORM before any service/DB call (T-06-06): a
    //    malformed id is refused 400 INVALID_IDENTIFIER and never reaches the
    //    service. The value that DOES reach the service is always bound as $1
    //    inside resolveCaseIdentifier, never concatenated.
    const exceptionId = req.params['exceptionId'] ?? '';
    if (!UUID_RE.test(exceptionId)) {
      throw new ApiError(400, 'INVALID_IDENTIFIER');
    }

    // 4. Load the trail. loadAuditTrailResponse returns one of two outcomes: an
    //    AuditTrailResponse ⇒ 200 (including the chain-broken case, which is a
    //    reported fact, not an error); or 'NOT_FOUND' (no such exception) ⇒ 404
    //    EXCEPTION_NOT_FOUND. Cache-Control: no-store is set globally for every
    //    /api response by securityHeaders (§3.2).
    const result = await loadAuditTrailResponse(deps.pool, exceptionId);
    if (result === 'NOT_FOUND') {
      throw new ApiError(404, 'EXCEPTION_NOT_FOUND');
    }
    res.status(200).json(result);
  };
}

/**
 * The F13 audit-read route handler, built with its dependencies. Exports
 * exactly `{ get }` — there is deliberately NO post/put/patch/delete: the audit
 * store is append-only and this surface is read-only (F13). Consumed by
 * `routes/index.ts` where it is registered from the single ROUTES array.
 */
export function auditRoutes(deps: RouteDeps): { get: RequestHandler } {
  return { get: getAudit(deps) };
}
