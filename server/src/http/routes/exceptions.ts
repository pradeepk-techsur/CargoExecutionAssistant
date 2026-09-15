// The two F7 endpoints (TechArch §3.1; FRD F7 FR-7.1–7.14).
//
//   GET /api/exceptions                     the receipt-ordered open queue.
//   GET /api/exceptions/:idOrReference       one case, by exception uuid OR
//                                            case_reference.
//
// This module is a THIN HTTP translation layer over the two F7 composition
// services (04-02): `listQueue` and `loadCase`. It does exactly three things a
// service cannot: it refuses any query parameter (FR-7.2), it re-checks
// authentication belt-and-braces, and it validates the FORM of the path
// identifier BEFORE calling `loadCase`, then maps `loadCase`'s three outcomes
// (a `CaseDetailResponse`, `'ENTRY_PASSED_VALIDATION'`, `'NOT_FOUND'`) to HTTP.
// No filter, sort, page or include parameter is reachable on either route —
// the FRD forbids every one, and the blanket query-string rejection is the
// enforcement (FR-7.2, T-04-06).
//
// Both routes are GET-only by design (FR-7.10): there is deliberately NO
// post/put/patch/delete handler here. `csrf.middleware.ts` and `app.ts`'s
// `apiNotFoundOr405` answer any other method on these two paths without any
// change — both are data-driven from `API_ROUTE_TABLE` (updated in Task 2).
// Reading the queue or a case writes NO row and NO audit entry: neither
// service calls `append()` (FR-7.10).

import type { Request, Response, RequestHandler } from 'express';
import { ApiError } from '../errorMapper.js';
import { listQueue } from '../../services/queue.service.js';
import { loadCase, type CaseIdentifierForm } from '../../services/caseRead.service.js';
import type { RouteDeps } from './index.js';

// The exception uuid form — the SAME case-insensitive five-group shape
// entries.ts's UUID_RE uses. An identifier matching this is treated as an
// exception id and handed to loadCase with form 'UUID'.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The case_reference form: CE-YYYY-NNNNNN. case_reference is ALWAYS upper-case
// `CE` (never case-insensitive), matching cargo_entries_case_reference_fmt_chk.
const CASE_REF_RE = /^CE-[0-9]{4}-[0-9]{6}$/;

// ── GET /api/exceptions — the receipt-ordered open queue ──────────────────────

function getExceptions(deps: RouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // 1. No query parameter of any kind (FR-7.2, FR-7.9, FR-7.12). Every
    //    rejected query string is the SAME 400 regardless of the parameter's
    //    plausibility, so there is nothing to enumerate (T-04-06). The offending
    //    key is named in a detail so a client learns which parameter it sent.
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

    // 2. Belt-and-braces auth re-check (requireApiAuth already answered 401 for a
    //    session-less caller; this keeps the handler correct in isolation and
    //    fails loudly on a middleware regression).
    if (req.principal === undefined) {
      throw new ApiError(401, 'UNAUTHENTICATED');
    }

    // 3. The receipt-ordered queue. listQueue owns the failure-summary derivation
    //    and the 500-row truncation ceiling (FR-7.6/7.9); the route only serves
    //    what it returns. Cache-Control: no-store is set globally for every /api
    //    response by securityHeaders (§3.2) — no second header write here.
    const response = await listQueue(deps.pool);
    res.status(200).json(response);
  };
}

// ── GET /api/exceptions/:idOrReference — one case by uuid or reference ─────────

function getException(deps: RouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // 1. No query parameter here either (FR-7.2) — same rule as the queue route.
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

    // 2. Belt-and-braces auth re-check.
    if (req.principal === undefined) {
      throw new ApiError(401, 'UNAUTHENTICATED');
    }

    // 3. Resolve the identifier FORM before any service/DB call (T-04-05): a uuid
    //    is an exception id; a CE-YYYY-NNNNNN is a case reference; anything else
    //    is refused 400 INVALID_IDENTIFIER and never reaches loadCase. The value
    //    that DOES reach loadCase is always bound as $1 inside
    //    resolveCaseIdentifier (04-01), never concatenated.
    const idOrReference = req.params['idOrReference'] ?? '';
    let form: CaseIdentifierForm;
    if (UUID_RE.test(idOrReference)) {
      form = 'UUID';
    } else if (CASE_REF_RE.test(idOrReference)) {
      form = 'CASE_REF';
    } else {
      throw new ApiError(400, 'INVALID_IDENTIFIER');
    }

    // 4. Load the case. loadCase returns one of three outcomes (FR-7.14):
    //    - a CaseDetailResponse (open OR closed — a closed case stays reachable
    //      by identifier) ⇒ 200;
    //    - 'NOT_FOUND' (nothing matched) ⇒ 404 EXCEPTION_NOT_FOUND, generic
    //      message;
    //    - 'ENTRY_PASSED_VALIDATION' (a well-formed reference whose entry
    //      validated clean, so no exception exists) ⇒ 404 EXCEPTION_NOT_FOUND
    //      with the SAME code but a DISTINGUISHING message (FRD error table).
    const result = await loadCase(deps.pool, form, idOrReference);
    if (result === 'NOT_FOUND') {
      throw new ApiError(404, 'EXCEPTION_NOT_FOUND', 'That case could not be found.');
    }
    if (result === 'ENTRY_PASSED_VALIDATION') {
      throw new ApiError(
        404,
        'EXCEPTION_NOT_FOUND',
        'That entry passed validation, so it has no exception.',
      );
    }
    res.status(200).json(result);
  };
}

/**
 * The two F7 route handlers, built with their dependencies. Consumed by
 * `routes/index.ts` where they are registered from the single ROUTES array.
 * Exports exactly this factory — there is NO mutating handler for an exception
 * (F7 is GET-only, FR-7.10); an exception is never authored (F5 FR-5.1).
 */
export function exceptionRoutes(deps: RouteDeps): {
  get: RequestHandler;
  getOne: RequestHandler;
} {
  return {
    get: getExceptions(deps),
    getOne: getException(deps),
  };
}
