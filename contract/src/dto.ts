import type { ErrorCode } from './errors.js';

// ---- provenance (§3.9) -----------------------------------------------------

/** Per-value provenance. Required everywhere a value is carried. */
export type Origin = 'AI' | 'HUMAN';

/**
 * A value that knows where it came from. There is deliberately NO variant of
 * this type with an optional origin: an unattributed value is unrepresentable
 * in the contract, so it cannot be returned by the API or rendered by the UI.
 */
export interface Attributed<T = string | null> {
  readonly value: T;
  readonly origin: Origin;
}

/** Actor of an audited event. `AI` never carries a specialist identity. */
export type ActorType = 'SPECIALIST' | 'AI' | 'SYSTEM';

export type AuditActionType =
  | 'ENTRY_RECEIVED'
  | 'VALIDATION_COMPLETED'
  | 'EXCEPTION_OPENED'
  | 'RECOMMENDATION_GENERATED'
  | 'RECOMMENDATION_UNAVAILABLE'
  | 'RECOMMENDATION_APPROVED'
  | 'RECOMMENDATION_EDITED_AND_APPROVED'
  | 'RECOMMENDATION_REJECTED';

export type ExceptionState = 'OPEN' | 'RESOLVED' | 'REJECTED';
export type ReceiptOutcome = 'VALIDATED_CLEAN' | 'EXCEPTION_OPENED';
export type RecommendationStatus = 'PENDING' | 'AVAILABLE' | 'UNAVAILABLE';
export type DecisionType = 'APPROVE' | 'EDIT_APPROVE' | 'REJECT';
export type ValidationOutcome = 'PASS' | 'FAIL';

export type RecommendationFailureReason =
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_AUTH_FAILED'
  | 'SCHEMA_INVALID'
  | 'CONTENT_FILTERED'
  | 'INTERNAL_ERROR';

// ---- error envelope (§3.10) ------------------------------------------------

export interface ApiErrorDetail {
  readonly field?: string; // dot path into the request body
  readonly code: string; // field-level code, bound to a control by the UI
  readonly message: string; // plain language, safe to display
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: ErrorCode; // stable identifier; clients branch on this
    readonly message: string; // never a stack trace, SQL, or provider text
    readonly details?: readonly ApiErrorDetail[];
    readonly request_id: string;
  };
}

// ---- session types (§3.11) -------------------------------------------------

export interface SpecialistDto {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  // No role, permissions, scope, or capability list: one role, binary auth.
}

export interface SessionRequest {
  readonly email: string;
  readonly password: string;
}

export interface SessionDto {
  readonly specialist: SpecialistDto;
  readonly csrf_token: string;
  readonly session: { readonly absolute_expires_at: string };
}

/** Actor reference as rendered in a case or a trail. */
export interface ActorRef {
  readonly id: string;
  readonly display_name: string;
}
