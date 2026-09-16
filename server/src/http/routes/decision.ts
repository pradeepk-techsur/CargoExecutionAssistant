// The single F11 endpoint (TechArch §3.1 row 9; FRD F11 FR-11.1–FR-11.21).
//
//   POST /api/exceptions/:exceptionId/decision   record the one human decision
//                                                 that closes the case.
//
// This module is a THIN HTTP translation over `recordDecision` (the F11
// transaction). It does what a service cannot: it resolves the path identifier
// (uuid OR case reference — unlike the uuid-only recommendation route), it
// parses the body with a `.strict()` zod schema (so a client-supplied
// `origin`/`decided_by`/`actor`/`applied` is an unknown key → 422), it reads
// the optional `Idempotency-Key` header, and it maps each service error class to
// its Y2 code. `decided_by` is NEVER read from the body — the service takes it
// from `req.principal` (FR-11.14).
//
// This route is POST-only by design: there is deliberately NO put/patch/delete
// (no reopen/amend/undo — the record is append-only, FR-11.10).

import type { Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { ENTRY_FIELDS, type DecisionCreateRequest } from '@cargoexec/contract';
import { ApiError } from '../errorMapper.js';
import {
  recordDecision,
  ExceptionAlreadyDecidedError,
  RecommendationNotAvailableError,
  RecommendationMismatchError,
  ReasonRequiredError,
  ResolutionValuesNotAllowedError,
  ResolutionValuesIncompleteError,
  DecisionRequestMalformedError,
  IdempotencyKeyReusedError,
} from '../../services/decision.service.js';
import { resolveCaseIdentifier } from '../../db/repositories/exceptions.js';
import type { RouteDeps } from './index.js';

// Identifier forms — the SAME shapes exceptions.ts uses. A uuid is an exception
// id; a CE-YYYY-NNNNNN is a case reference; anything else is a 400.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CASE_REF_RE = /^CE-[0-9]{4}-[0-9]{6}$/;

const MAX_IDEMPOTENCY_KEY = 128;

// ── Body schema (§4.6, FR-11.15) ─────────────────────────────────────────────
//
// `.strict()` is the whole of FR-11.14/FR-11.15: any property outside the named
// set — `origin`, `decided_by`, `actor`, `on_behalf_of`, `applied`, … — is an
// unrecognised key and errorMapper answers 422 REQUEST_MALFORMED naming it.
const ResolutionValueBody = z
  .object({
    field_name: z.enum(ENTRY_FIELDS as unknown as [string, ...string[]]),
    // The outer 2000 ceiling; per-field structural limits are re-checked in the
    // service against the F3 field set.
    value: z.string().max(2000),
  })
  .strict();

const DecisionBody = z
  .object({
    decision_type: z.enum(['APPROVE', 'EDIT_APPROVE', 'REJECT']),
    reason: z.string().max(2000).optional(),
    resolution_values: z.array(ResolutionValueBody).optional(),
    recommendation_id: z.string().uuid().optional(),
  })
  .strict();

// A duplicate field_name within resolution_values is checked in the service
// (decision.service.ts::assertNoDuplicateFields) and surfaced as a
// DecisionRequestMalformedError → 422 REQUEST_MALFORMED here.

function postDecision(deps: RouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // 1. Content-type belt (mirror entries.ts). A body-bearing non-JSON request
    //    is 415 rather than reaching the schema as `{}`.
    if (hasBody(req) && req.is('application/json') === false) {
      throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    // 2. Belt-and-braces auth re-check (requireApiAuth already answered 401 for a
    //    session-less caller; CSRF is enforced by csrfMiddleware).
    if (req.principal === undefined) {
      throw new ApiError(401, 'UNAUTHENTICATED');
    }

    // 3. Resolve the identifier FORM before any service/DB call. A uuid or a
    //    CE-YYYY-NNNNNN reference is accepted (FRD: "exceptionId (uuid or case
    //    reference)"); anything else is 400 INVALID_IDENTIFIER. The value is
    //    always bound as $1 inside resolveCaseIdentifier, never concatenated.
    const raw = req.params['exceptionId'] ?? '';
    let form: 'UUID' | 'CASE_REF';
    if (UUID_RE.test(raw)) {
      form = 'UUID';
    } else if (CASE_REF_RE.test(raw)) {
      form = 'CASE_REF';
    } else {
      throw new ApiError(400, 'INVALID_IDENTIFIER');
    }
    const resolution = await resolveCaseIdentifier(deps.pool, form, raw);
    if (resolution.status === 'NOT_FOUND') {
      throw new ApiError(404, 'EXCEPTION_NOT_FOUND', 'That case could not be found.');
    }
    if (resolution.status === 'ENTRY_PASSED_VALIDATION') {
      throw new ApiError(
        404,
        'EXCEPTION_NOT_FOUND',
        'That entry passed validation, so it has no exception.',
      );
    }
    const exceptionId = resolution.exceptionId;

    // 4. The body MUST be a JSON object — reject an array/scalar before the schema.
    const body: unknown = req.body;
    if (Array.isArray(body) || typeof body !== 'object' || body === null) {
      throw new ApiError(422, 'REQUEST_MALFORMED', undefined, [
        {
          field: '(body)',
          code: 'wrong_type',
          message: 'The request body must be a single JSON object.',
        },
      ]);
    }

    // 5. Structural validation. A ZodError propagates to errorMapper → 422
    //    REQUEST_MALFORMED, naming any unknown key (FR-11.15).
    const parsed = DecisionBody.parse(body) as DecisionCreateRequest;

    // 6. Idempotency-Key header (FR-11.11): trimmed, <= 128 chars, else 422.
    const idempotencyKey = readIdempotencyKey(req);

    // 7. Record the decision. Each service error class maps to a Y2 code; any
    //    other error (a P0001 HITL/coupling violation, a DB failure) propagates
    //    to errorMapper as the generic 500 DECISION_FAILED.
    try {
      const response = await recordDecision(
        {
          pool: deps.pool,
          principal: { id: req.principal.id, display_name: req.principal.display_name },
          ...(readRequestId(res) !== undefined ? { requestId: readRequestId(res) as string } : {}),
        },
        exceptionId,
        parsed,
        idempotencyKey,
      );
      // 201 for a fresh decision AND for an idempotent replay (per the FRD).
      res.status(201).json(response);
    } catch (err) {
      throw mapDecisionError(err, parsed);
    }
  };
}

/** Translate a decision-service error class into its Y2 ApiError. Anything not a
 * known class is re-thrown unchanged so errorMapper handles it (generic 500). */
function mapDecisionError(err: unknown, body: DecisionCreateRequest): unknown {
  if (err instanceof ExceptionAlreadyDecidedError) {
    const verb = err.decision_type === 'REJECT' ? 'rejected' : 'resolved';
    const date = formatDecisionDate(err.decided_at);
    return new ApiError(
      409,
      'EXCEPTION_ALREADY_DECIDED',
      `This case was already ${verb} by ${err.decided_by_display_name} on ${date}.`,
    );
  }
  if (err instanceof RecommendationNotAvailableError) {
    return new ApiError(
      409,
      'RECOMMENDATION_NOT_AVAILABLE',
      'There is no AI recommendation to approve. Edit and approve, or reject.',
    );
  }
  if (err instanceof RecommendationMismatchError) {
    return new ApiError(
      409,
      'RECOMMENDATION_MISMATCH',
      'The recommendation changed. Reload the case and review it again.',
    );
  }
  if (err instanceof ReasonRequiredError) {
    const kind = body.decision_type === 'REJECT' ? 'rejection' : 'edit';
    return new ApiError(
      422,
      'REASON_REQUIRED',
      `Enter a reason of at least 10 characters for this ${kind}.`,
      [{ field: 'reason', code: err.tooShort ? 'too_short' : 'required', message: `Enter a reason of at least 10 characters for this ${kind}.` }],
    );
  }
  if (err instanceof ResolutionValuesNotAllowedError) {
    return new ApiError(
      422,
      'RESOLUTION_VALUES_NOT_ALLOWED',
      'Resolution values cannot be sent with this decision.',
    );
  }
  if (err instanceof ResolutionValuesIncompleteError) {
    const details = [
      ...err.missing.map((f) => ({ field: f, code: 'missing', message: `Missing field: ${f}.` })),
      ...err.unexpected.map((f) => ({ field: f, code: 'unexpected', message: `Unexpected field: ${f}.` })),
    ];
    const missingList = err.missing.length > 0 ? err.missing.join(', ') : '(none)';
    return new ApiError(
      422,
      'RESOLUTION_VALUES_INCOMPLETE',
      `Include every recommended field. Missing: ${missingList}.`,
      details,
    );
  }
  if (err instanceof DecisionRequestMalformedError) {
    return new ApiError(422, 'REQUEST_MALFORMED');
  }
  if (err instanceof IdempotencyKeyReusedError) {
    return new ApiError(
      409,
      'IDEMPOTENCY_KEY_REUSED',
      'That request identifier was already used for a different decision.',
    );
  }
  return err;
}

// ── helpers ────────────────────────────────────────────────────────────────────

/** Whether the request carries a body worth a content-type check. */
function hasBody(req: Request): boolean {
  const len = req.headers['content-length'];
  if (typeof len === 'string' && len !== '' && len !== '0') {
    return true;
  }
  const te = req.headers['transfer-encoding'];
  return typeof te === 'string' && te.length > 0;
}

/** The optional Idempotency-Key header, trimmed. Empty ⇒ null; over-length ⇒ 422. */
function readIdempotencyKey(req: Request): string | null {
  const raw = req.header('idempotency-key');
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  if (trimmed.length > MAX_IDEMPOTENCY_KEY) {
    throw new ApiError(422, 'REQUEST_MALFORMED', undefined, [
      {
        field: 'Idempotency-Key',
        code: 'too_long',
        message: `The Idempotency-Key header may be at most ${MAX_IDEMPOTENCY_KEY} characters.`,
      },
    ]);
  }
  return trimmed;
}

/** The correlation id assigned by requestId(); read from res.locals. */
function readRequestId(res: Response): string | undefined {
  const id = res.locals['requestId'];
  return typeof id === 'string' ? id : undefined;
}

/** Render a decision timestamp as a plain date for the already-decided message. */
function formatDecisionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = MONTHS[d.getUTCMonth()] ?? '';
  return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * The F11 route handler, built with its dependencies. Exports exactly `{ post }`
 * — no put/patch/delete (no reopen/amend/undo; FR-11.10). Consumed by
 * `routes/index.ts` where it is registered from the single ROUTES array.
 */
export function decisionRoutes(deps: RouteDeps): { post: RequestHandler } {
  return { post: postDecision(deps) };
}
