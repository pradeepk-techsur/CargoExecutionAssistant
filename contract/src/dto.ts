import type { ErrorCode } from './errors.js';
import type { EntryFieldName } from './fields.js';

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

// ---- entry / validation / receipt types (§3.12) ----------------------------

/** The submitted values, exactly as stored (trimmed only). */
export type EntryValues = { readonly [K in EntryFieldName]: string | null };

/** Origin map: present only for fields the specialist actually provided. */
export type EntryFieldOrigins = { readonly [K in EntryFieldName]?: 'HUMAN' };

export interface EntryDto {
  readonly id: string;
  readonly case_reference: string;
  readonly received_at: string;
  readonly created_by: ActorRef;
  readonly values: EntryValues;
  readonly field_origins: EntryFieldOrigins; // always 'HUMAN' by construction
}

export interface FindingDto {
  readonly rule_id: string; // ^RIV-[0-9]{3}$
  readonly field_name: EntryFieldName; // the rule's primary_field (C-2)
  readonly failure_code: string;
  readonly message: string; // plain language, imperative, no rule ids
  // No severity, weight, score, or priority: findings are not graded.
}

export interface ValidationDto {
  readonly outcome: ValidationOutcome;
  readonly rule_set_version: string; // e.g. "RIV-2026.09"
  readonly evaluated_at: string;
  readonly findings: readonly FindingDto[]; // ascending rule_id, always
}

export interface ExceptionRef {
  readonly id: string;
  readonly state: ExceptionState;
  readonly receipt_position: number;
}

// ---- queue / case-detail types (F7 FR-7.5, FR-7.7, FR-7.8) -----------------

/** One row of the receipt-ordered queue. Exactly these seven fields (FR-7.5). */
export interface RowSummaryDto {
  readonly id: string;
  readonly case_reference: string;
  readonly receipt_position: number;
  readonly received_at: string;
  readonly entry_number: string | null;
  readonly finding_count: number;
  readonly failure_summary: string;
}

export interface QueueResponse {
  readonly exceptions: readonly RowSummaryDto[];
  readonly returned_count: number;
  readonly truncated: boolean;
}

/** One AI-proposed value on a case's recommendation (F9 FR-9.7). */
export interface RecommendationProposedValueDto {
  readonly field_name: EntryFieldName;
  readonly proposed_value: string;
  readonly origin: 'AI';
  readonly addresses_rule_ids: readonly string[];
}

/**
 * The recommendation section of a case detail (FR-7.7). Fields beyond
 * `status` are present ONLY for the matching status: AVAILABLE carries
 * recommended_action/rationale/proposed_values/model_id/prompt_version/
 * generated_at; UNAVAILABLE carries failure_reason/failed_at; PENDING carries
 * requested_at. Every exception this phase reads has a PENDING recommendation
 * (Phase 5 has not run yet) — that is normal, expected data, not a defect.
 */
export interface RecommendationDetailDto {
  readonly status: RecommendationStatus;
  readonly recommended_action?: string;
  readonly rationale?: string;
  readonly proposed_values?: readonly RecommendationProposedValueDto[];
  readonly model_id?: string;
  readonly prompt_version?: string;
  readonly generated_at?: string;
  readonly failure_reason?: RecommendationFailureReason;
  readonly failed_at?: string;
  readonly requested_at?: string;
}

/**
 * One value on a recorded decision (FR-7.7, FR-11.21). Carried by BOTH the F7
 * case-read decision section and the F11 decision-record response.
 * `changed_from_proposal` (FR-11.21) is computed server-side by the trim-then-
 * byte-compare rule (FR-11.8) and mirrors the `decision_values` column of the
 * same name (migration 0006); it is never accepted from the client.
 */
export interface DecisionValueDto {
  readonly field_name: EntryFieldName;
  readonly value: string;
  readonly origin: Origin;
  readonly prior_value: string | null;
  readonly prior_origin: Origin | null;
  readonly changed_from_proposal: boolean;
}

export interface DecisionDetailDto {
  readonly decision_type: DecisionType;
  readonly decided_at: string;
  readonly decided_by: ActorRef;
  readonly reason: string | null;
  readonly resolution_values: readonly DecisionValueDto[];
}

// ---- F11 decision request / response (FR-11.1–FR-11.21, TechArch §3.5) ------

/** One submitted resolution value on a decision request. Exactly `{field_name, value}`
 * — no `origin` slot, so a client-supplied origin is an unknown field (FR-11.15). */
export interface DecisionResolutionValueRequest {
  readonly field_name: EntryFieldName;
  readonly value: string;
}

/**
 * The client's request body for POST /api/exceptions/{exceptionId}/decision
 * (F11 FR-11.1–FR-11.21). There is deliberately no `decided_by`/`actor`/
 * `on_behalf_of`/`specialist_id`/`origin`/`applied` slot: the actor is the
 * session principal (FR-11.14) and origin is computed server-side (FR-11.8).
 */
export interface DecisionCreateRequest {
  readonly decision_type: DecisionType;
  readonly reason?: string;
  readonly resolution_values?: readonly DecisionResolutionValueRequest[];
  readonly recommendation_id?: string;
}

/**
 * The 201 response body for a recorded decision (FR-11.21, TechArch §3.5). The
 * client confirms what was recorded from the server's own record, not from its
 * optimistic assumption (F12 FR-12.10). `idempotent_replay` is `true` when this
 * is a replay of an earlier decision under the same Idempotency-Key.
 */
export interface DecisionRecordResponse {
  readonly decision: {
    readonly id: string;
    readonly decision_type: DecisionType;
    readonly decided_at: string;
    readonly decided_by: ActorRef;
    readonly reason: string | null;
  };
  readonly resolution_values: readonly DecisionValueDto[];
  readonly exception: {
    readonly id: string;
    readonly state: ExceptionState;
    readonly closed_at: string | null;
  };
  readonly audit_entry_id: string;
  readonly idempotent_replay: boolean;
}

// ---- F13 audit-trail read (TechArch §3.5.4, FRD F14) -----------------------

/**
 * The acting specialist on an audited event. Present ONLY on a human/system
 * event; an AI event carries `actor: null` on `AuditEntryDto` and NEVER a
 * person-like name (F14 FR-14.4). Identical shape to `ActorRef` but named for
 * the audit trail so the trail's contract reads self-contained.
 */
export interface AuditActorDto {
  readonly id: string;
  readonly display_name: string;
}

/** One per-field value row on an audit entry (before/after with origins). */
export interface AuditEntryValueDto {
  readonly field_name: string;
  readonly before_value: string | null;
  readonly before_origin: Origin | null;
  readonly after_value: string | null;
  readonly after_origin: Origin | null;
  readonly changed: boolean;
}

/**
 * One entry in a case's audit trail (TechArch §3.5.4). `actor` is `null` for an
 * AI-authored event and `model_id` is present only for
 * RECOMMENDATION_GENERATED / RECOMMENDATION_UNAVAILABLE — so an AI event is
 * distinguishable from a human one in the response shape itself (F14 FR-14.4).
 */
export interface AuditEntryDto {
  readonly id: string;
  readonly case_sequence: number;
  readonly action_type: AuditActionType;
  readonly actor_type: ActorType;
  readonly actor: AuditActorDto | null; // null for AI — NEVER a person-like name (F14 FR-14.4)
  readonly model_id?: string; // present only for RECOMMENDATION_GENERATED/UNAVAILABLE
  readonly occurred_at: string;
  readonly before_state: string | null;
  readonly after_state: string;
  readonly reason: string | null;
  readonly values: readonly AuditEntryValueDto[];
}

/**
 * The full audit-trail read response for one case (F13 FR-13.15/FR-13.18). The
 * entries are in ascending `case_sequence`. `chain_verified` reports whether the
 * hash chain still verifies, and `first_divergence_sequence` names the sequence
 * at which it first diverges (null when healthy) — reported, never repaired.
 */
export interface AuditTrailResponse {
  readonly case_reference: string;
  readonly entry_count: number;
  readonly chain_verified: boolean;
  readonly first_divergence_sequence: number | null;
  readonly entries: readonly AuditEntryDto[];
}

/** The exception identity + lifecycle section of a case detail (FR-7.7). */
export interface CaseExceptionRef {
  readonly id: string;
  readonly case_reference: string;
  readonly state: ExceptionState;
  readonly receipt_position: number;
  readonly opened_at: string;
  readonly closed_at: string | null;
}

/** The full case-detail read model (FR-7.7, FR-7.8). No exception this phase
 * reads will ever have a non-null `decision` (Phase 6 has not run) — that is
 * normal, expected data.
 */
export interface CaseDetailResponse {
  readonly exception: CaseExceptionRef;
  readonly entry: EntryDto;
  readonly validation: ValidationDto;
  readonly recommendation: RecommendationDetailDto;
  readonly decision: DecisionDetailDto | null;
  readonly is_closed: boolean;
  readonly permitted_decisions: readonly DecisionType[];
}

export interface ReceiptResponse {
  readonly entry: EntryDto;
  readonly case_reference: string;
  readonly receipt_outcome: ReceiptOutcome;
  readonly validation: ValidationDto;
  readonly exception: ExceptionRef | null;
  readonly next: { readonly case_url: string | null; readonly queue_url: string };
}

export interface EntryDetailResponse {
  readonly entry: EntryDto;
  readonly receipt_outcome: ReceiptOutcome;
  readonly validation: ValidationDto;
  readonly exception: ExceptionRef | null;
}

/**
 * The POST /api/entries body. EVERY field is optional at the transport layer
 * (F3 §The Entry Field Set): an incomplete entry must be receivable, because an
 * incomplete entry is exactly what the product exists to process. Completeness
 * is F4's verdict, which produces findings and an exception — never a 422.
 * Numbers are accepted as a JSON number OR a numeric string (F3 structural
 * validation); the server keeps the submitted text.
 */
export type EntryCreateRequest = {
  readonly [K in EntryFieldName]?: string | number | null;
};
