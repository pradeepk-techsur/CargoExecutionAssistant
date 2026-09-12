### 3.8 The shared contract package

`contract/` is a dependency-free TypeScript package imported by both `server` and `web`. It is the single definition of every wire type, every error code, and the entry field set. A type-duplication review rule (R-L9) forbids the SPA from re-declaring any shape defined here.

```typescript
// contract/src/fields.ts — the ONE definition of the entry field set.
export const ENTRY_FIELDS = [
  'entry_number', 'importer_of_record_id', 'port_of_entry_code',
  'mode_of_transport', 'carrier_code', 'conveyance_name',
  'bill_of_lading_number', 'air_waybill_number', 'country_of_origin_code',
  'goods_description', 'quantity', 'quantity_uom',
  'declared_value_usd', 'arrival_date',
] as const;

export type EntryFieldName = (typeof ENTRY_FIELDS)[number];
// The server's zod schema, the DB CHECK list, the AI output schema, and the
// form's field list are all derived from this constant. There is no custom
// field, extension point, or dynamic field mechanism.
```

### 3.9 Core governance types

These four declarations carry the product's central guarantees into the type system.

```typescript
// contract/src/dto.ts

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

/** The eight audit actions — the complete transition set (00-header §0.6). */
export type AuditActionType =
  | 'ENTRY_RECEIVED'
  | 'VALIDATION_COMPLETED'
  | 'EXCEPTION_OPENED'
  | 'RECOMMENDATION_GENERATED'
  | 'RECOMMENDATION_UNAVAILABLE'
  | 'RECOMMENDATION_APPROVED'
  | 'RECOMMENDATION_EDITED_AND_APPROVED'
  | 'RECOMMENDATION_REJECTED';

export type ExceptionState   = 'OPEN' | 'RESOLVED' | 'REJECTED';
export type ReceiptOutcome   = 'VALIDATED_CLEAN' | 'EXCEPTION_OPENED';
export type RecommendationStatus = 'PENDING' | 'AVAILABLE' | 'UNAVAILABLE';
export type DecisionType     = 'APPROVE' | 'EDIT_APPROVE' | 'REJECT';
export type ValidationOutcome = 'PASS' | 'FAIL';

export type RecommendationFailureReason =
  | 'PROVIDER_TIMEOUT' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_AUTH_FAILED' | 'SCHEMA_INVALID' | 'CONTENT_FILTERED'
  | 'INTERNAL_ERROR';
```

### 3.10 Error envelope

```typescript
export interface ApiErrorDetail {
  readonly field?: string;      // dot path into the request body
  readonly code: string;        // field-level code, bound to a control by the UI
  readonly message: string;     // plain language, safe to display
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: ErrorCode;           // stable identifier; clients branch on this
    readonly message: string;           // never a stack trace, SQL, or provider text
    readonly details?: readonly ApiErrorDetail[];
    readonly request_id: string;
  };
}

// contract/src/errors.ts — the Y2 catalogue as a closed union.
export type ErrorCode =
  // session
  | 'AUTH_FAILED' | 'UNAUTHENTICATED' | 'ACCOUNT_INACTIVE' | 'CSRF_INVALID'
  | 'TOO_MANY_ATTEMPTS'
  // request shape
  | 'INVALID_IDENTIFIER' | 'UNSUPPORTED_QUERY_PARAMETER' | 'METHOD_NOT_ALLOWED'
  | 'REQUEST_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' | 'REQUEST_MALFORMED'
  // receipt
  | 'ENTRY_NOT_FOUND' | 'ENTRY_NUMBER_DUPLICATE' | 'RECEIPT_FAILED'
  // case
  | 'EXCEPTION_NOT_FOUND'
  // decision
  | 'EXCEPTION_ALREADY_DECIDED' | 'RECOMMENDATION_NOT_AVAILABLE'
  | 'RECOMMENDATION_MISMATCH' | 'IDEMPOTENCY_KEY_REUSED' | 'REASON_REQUIRED'
  | 'RESOLUTION_VALUES_NOT_ALLOWED' | 'RESOLUTION_VALUES_INCOMPLETE'
  | 'DECISION_FAILED';
// Internal database invariant codes (AUDIT_IMMUTABLE, HITL_VIOLATION,
// AUDIT_COUPLING_VIOLATION, AUDIT_CHAIN_BROKEN, EXCEPTION_WITHOUT_BASIS,
// AUDIT_SEQUENCE_CONFLICT, AUDIT_WRITE_INVALID, AUDIT_WRITE_FORBIDDEN_CONTENT,
// RULE_SET_INVALID, VALIDATION_ENGINE_FAILURE) are deliberately ABSENT from
// this union: they are logged, never returned (Y2 §7).
```

### 3.11 Session types

```typescript
export interface SpecialistDto {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  // No role, permissions, scope, or capability list: one role, binary auth.
}

export interface SessionRequest { readonly email: string; readonly password: string; }

export interface SessionDto {
  readonly specialist: SpecialistDto;
  readonly csrf_token: string;
  readonly session: { readonly absolute_expires_at: string };
}

/** Actor reference as rendered in a case or a trail. */
export interface ActorRef { readonly id: string; readonly display_name: string; }
```

### 3.12 Entry, validation, and receipt types

```typescript
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
  readonly field_origins: EntryFieldOrigins;   // always 'HUMAN' by construction
}

export interface FindingDto {
  readonly rule_id: string;         // ^RIV-[0-9]{3}$
  readonly field_name: EntryFieldName;   // the rule's primary_field (C-2)
  readonly failure_code: string;
  readonly message: string;         // plain language, imperative, no rule ids
  // No severity, weight, score, or priority: findings are not graded.
}

export interface ValidationDto {
  readonly outcome: ValidationOutcome;
  readonly rule_set_version: string;      // e.g. "RIV-2026.09"
  readonly evaluated_at: string;
  readonly findings: readonly FindingDto[];   // ascending rule_id, always
}

export interface ExceptionRef {
  readonly id: string;
  readonly state: ExceptionState;
  readonly receipt_position: number;
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
```

### 3.13 Queue and case types

```typescript
export interface QueueRow {
  readonly id: string;
  readonly case_reference: string;
  readonly receipt_position: number;    // the ONLY ordering dimension
  readonly received_at: string;
  readonly entry_number: string | null;
  readonly finding_count: number;
  readonly failure_summary: string;
  // Absent by design: priority, assignee, age_days, sla_status, severity,
  // state (the queue contains only OPEN), and any progress or claim marker.
}

export interface QueueResponse {
  readonly exceptions: readonly QueueRow[];   // receipt_position ASC, always
  readonly returned_count: number;
  readonly truncated: boolean;
}
// The request type is `void`. There is no QueueQuery interface, because the
// endpoint accepts no query parameters -- the absence is structural (§10 #4).

export interface ProposedValueDto {
  readonly field_name: EntryFieldName;
  readonly proposed_value: string;
  readonly origin: 'AI';                       // literal type: never 'HUMAN'
  readonly addresses_rule_ids: readonly string[];   // non-empty
}

export type RecommendationDto =
  | { readonly id: string; readonly status: 'PENDING';
      readonly requested_at: string }
  | { readonly id: string; readonly status: 'AVAILABLE';
      readonly requested_at: string;
      readonly recommended_action: string;     // one plain-language sentence
      readonly rationale: string;              // plain-language explanation
      readonly proposed_values: readonly ProposedValueDto[];
      readonly model_id: string;               // traceability: which model
      readonly prompt_version: string;         // traceability: which prompt
      readonly generated_at: string }
  | { readonly id: string; readonly status: 'UNAVAILABLE';
      readonly requested_at: string;
      readonly failure_reason: RecommendationFailureReason;
      readonly failed_at: string };
// A discriminated union, so `recommended_action` is simply not accessible on a
// degraded case: the UI cannot render a proposal that does not exist, and
// "no recommendation available" is a type-level state, not a null check.

export interface ResolutionValueDto {
  readonly field_name: EntryFieldName;
  readonly value: string;
  readonly origin: Origin;                 // computed server-side, always
  readonly prior_value: string | null;
  readonly prior_origin: Origin | null;
  readonly changed_from_proposal: boolean;
}

export interface DecisionDto {
  readonly id: string;
  readonly decision_type: DecisionType;
  readonly decided_at: string;
  readonly decided_by: ActorRef;           // never null: a human, always
  readonly reason: string | null;          // non-null for EDIT_APPROVE/REJECT
  readonly resolution_values: readonly ResolutionValueDto[];  // [] for REJECT
}

export interface CaseDetailResponse {
  readonly exception: {
    readonly id: string;
    readonly case_reference: string;
    readonly state: ExceptionState;
    readonly receipt_position: number;
    readonly opened_at: string;
    readonly closed_at: string | null;
  };
  readonly entry: EntryDto;
  readonly validation: ValidationDto;
  readonly recommendation: RecommendationDto | null;
  readonly decision: DecisionDto | null;
  readonly permitted_decisions: readonly DecisionType[];  // server authority
}
```

### 3.14 Decision request types

```typescript
/**
 * A discriminated union, so the illegal combinations the API rejects are also
 * unconstructible on the client: APPROVE has no resolution_values field, and
 * EDIT_APPROVE/REJECT have a required reason.
 *
 * NOTE what is absent: no `origin`, no `decided_by`, no `actor`,
 * no `on_behalf_of`, no `applied`, no `auto`, no `force`, no `case_ids[]`.
 * The server rejects all of them as unknown properties (422 REQUEST_MALFORMED).
 */
export type DecisionRequest =
  | { readonly decision_type: 'APPROVE';
      readonly recommendation_id: string;
      readonly reason?: string }                 // optional, 10-2000 if present
  | { readonly decision_type: 'EDIT_APPROVE';
      readonly recommendation_id?: string;
      readonly reason: string;                   // required, >= 10 chars
      readonly resolution_values: readonly {
        readonly field_name: EntryFieldName;
        readonly value: string;
      }[] }                                      // NOTE: no origin property
  | { readonly decision_type: 'REJECT';
      readonly reason: string };                 // required, >= 10 chars

export interface DecisionResponse {
  readonly decision: DecisionDto;
  readonly exception: { readonly id: string; readonly state: ExceptionState;
                        readonly closed_at: string };
  readonly audit_entry_id: string;   // the entry this decision is coupled to
  readonly idempotent_replay: boolean;
}
```

### 3.15 Audit types

```typescript
export interface AuditValueDto {
  readonly field_name: string;
  readonly before_value: string | null;
  readonly before_origin: Origin | null;   // null only when there was no value
  readonly after_value: string | null;
  readonly after_origin: Origin | null;    // null only on a declined value
  readonly changed: boolean;
}

export interface AuditEntryDto {
  readonly id: string;
  readonly case_sequence: number;          // monotonic from 1
  readonly action_type: AuditActionType;
  readonly actor_type: ActorType;
  readonly actor: ActorRef | null;         // null exactly when actor_type='AI'
  readonly model_id: string | null;        // joined for AI actions
  readonly occurred_at: string;            // database now(), never client
  readonly before_state: string | null;
  readonly after_state: string;
  readonly reason: string | null;          // verbatim on edit/reject
  readonly values: readonly AuditValueDto[];
}

export interface AuditTrailResponse {
  readonly case_reference: string;
  readonly entry_count: number;
  readonly chain_verified: boolean;
  readonly first_divergence_sequence: number | null;
  readonly entries: readonly AuditEntryDto[];   // ascending case_sequence
}
// No export, download, format, or multi-case shape exists in this contract.
```

### 3.16 Internal server types (not wire types)

```typescript
// server/src/services/audit/writer.ts
export interface AuditAppendInput {
  readonly case_id: string;
  readonly action_type: AuditActionType;
  readonly actor:
    | { readonly type: 'SPECIALIST'; readonly specialist_id: string }
    | { readonly type: 'AI' }                              // no identity
    | { readonly type: 'SYSTEM'; readonly on_behalf_of_specialist_id: string };
  readonly exception_id?: string;
  readonly recommendation_id?: string;
  readonly decision_id?: string;
  readonly before_state: string | null;
  readonly after_state: string;
  readonly reason?: string;
  readonly request_id?: string;
  readonly values: readonly {
    readonly field_name: string;
    readonly before_value: string | null;
    readonly before_origin: Origin | null;
    readonly after_value: string | null;
    readonly after_origin: Origin | null;
  }[];
}

/**
 * The ONLY audit operation in the system. `tx` is required and the writer
 * cannot open its own transaction, so the state change and its entry commit
 * together or neither commits. `occurred_at` is not a parameter: the database
 * assigns it. There is no update, delete, upsert, redact, correct, anonymise,
 * backfill, or truncate counterpart -- anywhere.
 */
export interface AuditWriter {
  append(tx: Tx, input: AuditAppendInput): Promise<{ audit_entry_id: string;
                                                     case_sequence: number }>;
}

// server/src/ai/provider.ts
export interface RecommendationRequest {
  readonly entry_values: EntryValues;       // the 14 fields as submitted
  readonly findings: readonly FindingDto[]; // ordered, rule_id ascending
  readonly rule_set_version: string;
  // Absent by construction: specialist id, display name, email, session token,
  // case reference, audit content. The model sees the cargo entry and why it
  // failed validation -- nothing about who typed it (FR-9.16, FR-Y3.2).
}

export interface RecommendationDraft {
  readonly recommended_action: string;      // 1-500 chars after trim
  readonly rationale: string;               // 1-2000 chars after trim
  readonly proposed_values: readonly {
    readonly field_name: EntryFieldName;    // members of the 14-field set only
    readonly proposed_value: string;
    readonly addresses_rule_ids: readonly string[];  // findings of THIS case
  }[];
}

export type ProviderResult =
  | { readonly ok: true;  readonly draft: RecommendationDraft;
      readonly model_id: string; readonly prompt_version: string;
      readonly latency_ms: number }
  | { readonly ok: false; readonly failure_reason: RecommendationFailureReason;
      readonly model_id: string; readonly prompt_version: string };

export interface RecommendationProvider {
  generate(req: RecommendationRequest): Promise<ProviderResult>;
}
// The provider returns a DRAFT. There is no method on this interface that
// writes anything, references a decision, or takes an exception state --
// the type surface itself cannot express "apply this".
```

### 3.17 UI route contract

| Route | Screen | Owner | Auth | Notes |
|---|---|---|---|---|
| `/sign-in` | Sign in | F1 + F2 | none | The only unauthenticated screen; reduced shell |
| `/` | redirect to `/queue` | F2 | session | |
| `/queue` | Review queue | F8 | session | Receipt-ordered open exceptions |
| `/entries/new` | New cargo entry + receipt outcome | F6 | session | Start of every demonstration path (no seed data) |
| `/cases/{caseReference}` | Case detail: entry, findings, recommendation (F10), decision (F12), audit (F14) | F10 | session | One route, five regions, one reading order |
| `/cases/{caseReference}/audit` | Case detail deep-linked and focused on the audit region | F14 | session | Same screen; focus and scroll target differ |
| `*` | Page not found (inside the shell) | F2 | session | |

There is no dashboard route, no reports route, no settings route, no admin route, no user-management route, no closed-case browse route, and no search route. An unauthenticated HTML request to a session route returns `302 /sign-in?next={validated path}`.

### 3.18 UI component contract for provenance

Provenance is carried into the rendering layer by types, so "we forgot to show the badge" is a compile error rather than a review finding:

```typescript
// web/src/components/AttributedValue.tsx
export interface AttributedValueProps {
  readonly label: string;              // always a visible, associated label
  readonly attributed: Attributed<string | null>;   // value + origin, required
  readonly changed?: boolean;          // renders "changed by specialist" marking
}
/**
 * The ONLY component permitted to render a case value (entry value, proposed
 * value, resolution value, or audit before/after value). It always renders a
 * ProvenanceBadge alongside the value. Passing a bare string does not compile.
 */

// web/src/components/ProvenanceBadge.tsx
export interface ProvenanceBadgeProps {
  readonly origin: Origin;
  readonly variant?: 'inline' | 'block';
}
/**
 * Renders text + icon + token colour, NEVER colour alone (FR-2.17, NFR-2):
 *   AI    -> "AI-suggested"       + icon(aria-hidden) + token colour
 *   HUMAN -> "Specialist-entered" + icon(aria-hidden) + token colour
 * In `inline` variant the text is visually hidden but present for assistive
 * technology, so a screen-reader user receives the same distinction a sighted
 * user does. Used unchanged by F10, F12, and F14 (FR-2.20).
 */
```

A lint rule forbids rendering `entry.values`, `proposed_values`, `resolution_values`, or `audit.values` content anywhere except through `AttributedValue`.

---
