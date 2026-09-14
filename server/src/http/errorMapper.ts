// The single translation point from internal failure to a Y2 response envelope
// (TechArch §3.7, §1A.3, FRD Y2 §7/§9).
//
// This is the ONLY place in the server where a failure becomes a response body.
// Everything a route can throw — a deliberate `ApiError`, a Zod validation
// error, a raw PostgreSQL error bubbling up from the data layer, or an
// unexpected `Error` — is funnelled through `errorMapper()` and mapped to a
// stable Y2 code, an HTTP status, and the §3.10 envelope. Concentrating the
// translation here is what makes two guarantees enforceable in one place:
//
//   • No internal database invariant code (HITL_VIOLATION, AUDIT_CHAIN_BROKEN,
//     …) ever reaches the client — it is logged against the request_id and
//     surfaced as a generic 500 (Y2 §7, FR-Y2.5).
//   • No message discloses SQL, a stack trace, provider text, configuration, or
//     account existence (Y2 §9).

import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  ERROR_MESSAGES,
  INTERNAL_INVARIANT_CODES,
  type ApiErrorBody,
  type ApiErrorDetail,
  type ErrorCode,
} from '@cargoexec/contract';

/**
 * What a handler throws deliberately. Because the message defaults from
 * `ERROR_MESSAGES`, `new ApiError(401, 'AUTH_FAILED')` produces exactly the Y2
 * §1 text and no handler can drift it.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: readonly ApiErrorDetail[];

  constructor(
    status: number,
    code: ErrorCode,
    message?: string,
    details?: readonly ApiErrorDetail[],
  ) {
    super(message ?? ERROR_MESSAGES[code] ?? 'Request failed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

// ---- PostgreSQL error mapping (§3.7) ---------------------------------------
//
// A row here names the (SQLSTATE, constraint) pair the data layer can raise and
// the client-facing outcome. Several rows name tables that have no routes until
// phases 3 and 6 — the mapping table is implemented in full now anyway: it is
// one data structure, it is the documented contract, and splitting it across
// four phases guarantees drift. Rows not yet reachable are marked with the
// owning phase; there is deliberately no skipped test for them.

interface PgLikeError {
  code?: string; // SQLSTATE
  constraint?: string;
  message?: string;
}

function isPgLikeError(err: unknown): err is PgLikeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

/** A client-facing mapping: HTTP status + Y2 code. */
interface Mapping {
  status: number;
  code: ErrorCode;
}

/** An internal mapping: what to log, plus the generic code the client sees. */
interface InternalMapping {
  status: number;
  code: ErrorCode; // always a generic code, never the internal one
  internal: true;
}

/**
 * Map a PostgreSQL error to either a client mapping or an internal one. An
 * internal mapping means the true cause is logged and the client sees only the
 * generic code.
 */
function mapPgError(err: PgLikeError): Mapping | InternalMapping {
  const sqlState = err.code;
  const constraint = err.constraint;
  const message = err.message ?? '';

  // 23505 — unique_violation. Disambiguated by constraint/target.
  if (sqlState === '23505') {
    // phase 3 (receipt): cargo_entries.entry_number
    if (mentions(constraint, message, 'entry_number', 'cargo_entries')) {
      return { status: 409, code: 'ENTRY_NUMBER_DUPLICATE' };
    }
    // phase 6 (decision): decisions (exception_id, idempotency_key)
    if (mentions(constraint, message, 'idempotency_key')) {
      return { status: 409, code: 'IDEMPOTENCY_KEY_REUSED' };
    }
    // phase 6 (decision): decisions.exception_id
    if (mentions(constraint, message, 'exception_id', 'decisions')) {
      return { status: 409, code: 'EXCEPTION_ALREADY_DECIDED' };
    }
    // Unknown unique violation — do not guess a client meaning.
    return { status: 500, code: 'RECEIPT_FAILED', internal: true };
  }

  // 23514 — check_violation.
  if (sqlState === '23514') {
    // phase 6 (decision): decisions_reason_required_chk
    if (mentions(constraint, message, 'decisions_reason_required_chk')) {
      return { status: 422, code: 'REASON_REQUIRED' };
    }
    return { status: 500, code: 'RECEIPT_FAILED', internal: true };
  }

  // 23503 — foreign_key_violation.
  if (sqlState === '23503') {
    // phase 6: exceptions_basis_fk — an exception with no basis is an internal
    // invariant breach (EXCEPTION_WITHOUT_BASIS), never a client error.
    if (mentions(constraint, message, 'exceptions_basis_fk')) {
      return { status: 500, code: 'RECEIPT_FAILED', internal: true };
    }
    return { status: 500, code: 'RECEIPT_FAILED', internal: true };
  }

  // P0001 — raise_exception from a governance trigger. If the message begins
  // with one of the internal invariant codes, it is an invariant breach: log it
  // against request_id, return a generic 500. DECISION_FAILED vs RECEIPT_FAILED
  // is chosen by which invariant fired; both are generic to the client.
  if (sqlState === 'P0001') {
    const code = leadingInvariantCode(message);
    if (code !== undefined) {
      // HITL_VIOLATION guards the decision write path; the audit invariants can
      // fire on either path. Surface a decision-oriented generic where the
      // invariant is decision-specific, otherwise the receipt generic.
      const generic: ErrorCode =
        code === 'HITL_VIOLATION' ? 'DECISION_FAILED' : 'RECEIPT_FAILED';
      return { status: 500, code: generic, internal: true };
    }
    return { status: 500, code: 'RECEIPT_FAILED', internal: true };
  }

  // 42501 — insufficient_privilege. The append-only audit store rejected a
  // forbidden write (AUDIT_IMMUTABLE); internal, generic 500.
  if (sqlState === '42501') {
    return { status: 500, code: 'RECEIPT_FAILED', internal: true };
  }

  // Any other PG error — generic 500, internal.
  return { status: 500, code: 'RECEIPT_FAILED', internal: true };
}

/** Whether the message begins with one of the internal invariant codes. */
function leadingInvariantCode(message: string): string | undefined {
  for (const code of INTERNAL_INVARIANT_CODES) {
    if (message.startsWith(code)) {
      return code;
    }
  }
  return undefined;
}

/** Case-insensitive: does the constraint or message mention every needle. */
function mentions(
  constraint: string | undefined,
  message: string,
  ...needles: string[]
): boolean {
  const hay = `${constraint ?? ''} ${message}`.toLowerCase();
  return needles.every((n) => hay.includes(n.toLowerCase()));
}

// ---- Zod → REQUEST_MALFORMED -----------------------------------------------

/**
 * Structural detection of a ZodError. `instanceof` alone is unreliable when two
 * copies of zod are loaded (a real hazard under bundlers and test runners): a
 * ZodError from the "other" copy would slip through to the generic 500 branch
 * and lose its per-field details.
 */
function isZodError(err: unknown): err is ZodError {
  if (err instanceof ZodError) {
    return true;
  }
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'ZodError' &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

function zodToDetails(err: ZodError): ApiErrorDetail[] {
  return err.issues.map((issue) => {
    // The dot path into the request body. For an `unrecognized_keys` issue the
    // rejected property is in `issue.keys`, NOT in `issue.path` (which is the
    // path to the *object* that carried the extra key), so surface it there —
    // otherwise the detail that blocks a client-supplied actor (§4.6, §3.2)
    // would name no field at all.
    let field = issue.path.join('.');
    if (issue.code === 'unrecognized_keys') {
      const keys = (issue as { keys?: unknown }).keys;
      if (Array.isArray(keys) && keys.length > 0) {
        const prefix = field === '' ? '' : `${field}.`;
        field = `${prefix}${String(keys[0])}`;
      }
    }
    const detail: ApiErrorDetail = {
      code: issue.code,
      message: issue.message,
    };
    return field === '' ? detail : { ...detail, field };
  });
}

// ---- the middleware --------------------------------------------------------

/**
 * The Express error middleware. Registered LAST, so any error thrown or passed
 * to `next(err)` anywhere in the chain lands here (§1A.3). This is the single
 * translation point.
 */
export function errorMapper(): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const requestId =
      typeof res.locals?.['requestId'] === 'string'
        ? (res.locals['requestId'] as string)
        : '';

    // 1. Deliberate ApiError — pass through its own status/code/message/details.
    if (err instanceof ApiError) {
      return send(res, err.status, err.code, err.message, requestId, err.details);
    }

    // 2. Zod validation error — 422 REQUEST_MALFORMED with one detail per issue.
    //    An `instanceof` check can fail when two copies of zod are loaded (ESM
    //    vs CJS, or a test harness), so accept the structural shape too: a
    //    ZodError carries a `name === 'ZodError'` and an `issues` array.
    if (isZodError(err)) {
      const details = zodToDetails(err);
      return send(
        res,
        422,
        'REQUEST_MALFORMED',
        ERROR_MESSAGES.REQUEST_MALFORMED ?? 'The request could not be read.',
        requestId,
        details,
      );
    }

    // 3. PostgreSQL-shaped error — map by SQLSTATE/constraint.
    if (isPgLikeError(err)) {
      const mapping = mapPgError(err);
      if ('internal' in mapping) {
        // Log the TRUE cause against the request_id; the client sees only the
        // generic code (Y2 §7, FR-Y2.5). req.log is bound by requestId().
        const internalCode =
          leadingInvariantCode(err.message ?? '') ?? err.code ?? 'UNKNOWN';
        logInternal(req, {
          internal_code: internalCode,
          sqlstate: err.code,
          request_id: requestId,
        });
      }
      return send(
        res,
        mapping.status,
        mapping.code,
        genericMessage(mapping.code),
        requestId,
      );
    }

    // 4. Anything else — a generic 500 with no leak of the underlying message.
    logInternal(req, {
      internal_code: 'UNEXPECTED',
      request_id: requestId,
    });
    return send(res, 500, 'RECEIPT_FAILED', genericMessage('RECEIPT_FAILED'), requestId);
  };
}

/** The safe, generic message for a code (never SQL, stack, or provider text). */
function genericMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'Something went wrong. Try again.';
}

/**
 * Write the internal cause to the request logger at error level. Falls back to
 * nothing if no logger is bound (a bare test app that omits requestId()).
 */
function logInternal(
  req: { log?: { error: (obj: unknown) => void } },
  fields: Record<string, unknown>,
): void {
  const log = req.log;
  if (log !== undefined) {
    log.error(fields);
  }
}

/** Assemble and send the §3.10 envelope, omitting `details` when empty. */
function send(
  res: {
    status: (code: number) => { json: (body: ApiErrorBody) => unknown };
  },
  status: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: readonly ApiErrorDetail[],
): unknown {
  const error: ApiErrorBody['error'] =
    details !== undefined && details.length > 0
      ? { code, message, details, request_id: requestId }
      : { code, message, request_id: requestId };
  return res.status(status).json({ error });
}
