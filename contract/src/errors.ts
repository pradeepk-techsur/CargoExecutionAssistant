export const INTERNAL_INVARIANT_CODES = [
  'AUDIT_IMMUTABLE',
  'AUDIT_CHAIN_BROKEN',
  'AUDIT_COUPLING_VIOLATION',
  'HITL_VIOLATION',
  'EXCEPTION_WITHOUT_BASIS',
  'AUDIT_SEQUENCE_CONFLICT',
  'AUDIT_WRITE_INVALID',
  'AUDIT_WRITE_FORBIDDEN_CONTENT',
] as const;

export type InternalInvariantCode = (typeof INTERNAL_INVARIANT_CODES)[number];

/**
 * The client-facing Y2 catalogue as a closed union.
 *
 * The internal database invariant codes above (`INTERNAL_INVARIANT_CODES`:
 * `HITL_VIOLATION`, `AUDIT_CHAIN_BROKEN`, and friends) are DELIBERATELY ABSENT
 * from this union (TechArch §3.10, Y2 §7). They are logged against the
 * `request_id` and never returned — a client only ever sees the generic
 * `RECEIPT_FAILED` / `DECISION_FAILED` for a transaction that hit one. The
 * disjointness of the two sets is pinned by a unit test.
 */
export const ERROR_CODES = [
  // session (Y2 §1)
  'AUTH_FAILED',
  'UNAUTHENTICATED',
  'ACCOUNT_INACTIVE',
  'CSRF_INVALID',
  'TOO_MANY_ATTEMPTS',
  // request shape (Y2 §2)
  'INVALID_IDENTIFIER',
  'UNSUPPORTED_QUERY_PARAMETER',
  'METHOD_NOT_ALLOWED',
  'REQUEST_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'REQUEST_MALFORMED',
  // receipt (Y2 §3)
  'ENTRY_NOT_FOUND',
  'ENTRY_NUMBER_DUPLICATE',
  'RECEIPT_FAILED',
  // case (Y2 §4)
  'EXCEPTION_NOT_FOUND',
  // decision (Y2 §5)
  'EXCEPTION_ALREADY_DECIDED',
  'RECOMMENDATION_NOT_AVAILABLE',
  'RECOMMENDATION_MISMATCH',
  'IDEMPOTENCY_KEY_REUSED',
  'REASON_REQUIRED',
  'RESOLUTION_VALUES_NOT_ALLOWED',
  'RESOLUTION_VALUES_INCOMPLETE',
  'DECISION_FAILED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * The exact Y2 §1/§2 text, so the server and the SPA cannot drift. Codes are
 * stable identifiers (FR-Y2.3); this is the canonical wording for the codes
 * whose message is fixed copy rather than an interpolated sentence.
 */
export const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  AUTH_FAILED: 'Email or password is incorrect.',
  UNAUTHENTICATED: 'Sign in to continue.',
  ACCOUNT_INACTIVE: 'This account is not active.',
  CSRF_INVALID: 'Your session could not be verified. Refresh and try again.',
  TOO_MANY_ATTEMPTS: 'Too many sign-in attempts. Try again in about 15 minutes.',
  REQUEST_MALFORMED: 'The request could not be read.',
  METHOD_NOT_ALLOWED: 'That action is not available.',
  REQUEST_TOO_LARGE: 'This entry is too large to accept.',
  UNSUPPORTED_MEDIA_TYPE: 'Send this entry as JSON.',
  INVALID_IDENTIFIER: 'That identifier is not valid.',
  UNSUPPORTED_QUERY_PARAMETER: 'This endpoint accepts no query parameters.',
};
