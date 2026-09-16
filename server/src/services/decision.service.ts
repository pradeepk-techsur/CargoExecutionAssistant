import type { Pool, PoolClient } from 'pg';
import {
  ENTRY_FIELDS,
  type DecisionCreateRequest,
  type DecisionRecordResponse,
  type DecisionType,
  type DecisionValueDto,
  type EntryFieldName,
  type Origin,
} from '@cargoexec/contract';
import { withTransaction } from '../db/tx.js';
import { append, type AuditActionType, type AuditAppendValue } from './audit/writer.js';
import {
  insertDecision,
  insertDecisionValues,
  loadDecisionByException,
  loadDecisionByIdempotencyKey,
  loadDecisionValues,
  type DecisionRow,
  type InsertDecisionValueInput,
} from '../db/repositories/decisions.js';
import {
  loadRecommendationByException,
  loadRecommendationValues,
  type RecommendationValueRow,
} from '../db/repositories/recommendations.js';
import { lockCaseAnchor, loadEntryDetail } from '../db/repositories/entries.js';

/**
 * THE decision transaction (F11, TechArch §3.5, FRD §Process — Decision).
 *
 * This module is the phase's — and the product's — load-bearing guarantee: a
 * cargo exception is never resolved without an accountable human decision, and
 * this is the ONLY code path in the codebase permitted to write
 * `decisions`/`decision_values` or `exceptions.state`/`closed_at`/`decision_id`
 * (FR-11.1). It holds because the decision insert, the value inserts, the
 * exception update and the single audit entry commit together or not at all —
 * everything runs inside ONE `withTransaction(pool, fn)` callback — and because
 * the Phase 1 deferred triggers refuse the COMMIT unless the state change has a
 * matching human decision (`HITL_VIOLATION`) and exactly one audit entry
 * (`AUDIT_COUPLING_VIOLATION`). A "forgot to audit" bug does not produce an
 * unaudited resolution; it produces a failed transaction and a generic
 * `500 DECISION_FAILED` telling the specialist nothing was saved.
 *
 * `decided_by` is populated ONLY from `deps.principal.id` (the session
 * principal), never from request input (FR-11.14). Per-value origin is computed
 * EXCLUSIVELY here by the trim-then-byte-compare rule (FR-11.8) — no code path
 * assigns origin from the client. The one `UPDATE exceptions` statement is the
 * single deliberate, tested exception on receiptPaths.spec's allowlist; it is
 * written directly here, parameterised, never interpolated (R-L8).
 *
 * The service imports NONE of the receipt INSERT functions
 * (insertEntry/insertFieldOrigins/insertValidationResult/insertFindings/
 * insertException/insertPendingRecommendation) — it writes no receipt row
 * (R-L5, FR-11.18/FR-11.19).
 */

// ── Error classes (all plain Error subclasses; the ROUTE maps them to Y2) ─────

/** state !== OPEN: the case already has a decision (FR-11.10). Carries the
 * existing decision's shape so the route can render the exact Y2 message. */
export class ExceptionAlreadyDecidedError extends Error {
  readonly decision_type: DecisionType;
  readonly decided_by_display_name: string;
  readonly decided_at: string;

  constructor(info: {
    decision_type: DecisionType;
    decided_by_display_name: string;
    decided_at: string;
  }) {
    super('EXCEPTION_ALREADY_DECIDED');
    this.name = 'ExceptionAlreadyDecidedError';
    this.decision_type = info.decision_type;
    this.decided_by_display_name = info.decided_by_display_name;
    this.decided_at = info.decided_at;
  }
}

/** APPROVE requested but the recommendation is not AVAILABLE (FR-11.6). */
export class RecommendationNotAvailableError extends Error {
  constructor() {
    super('RECOMMENDATION_NOT_AVAILABLE');
    this.name = 'RecommendationNotAvailableError';
  }
}

/** A supplied recommendation_id does not match the case's current one (FR-11.16). */
export class RecommendationMismatchError extends Error {
  constructor() {
    super('RECOMMENDATION_MISMATCH');
    this.name = 'RecommendationMismatchError';
  }
}

/** reason absent/blank/too-short (or too-long) where required (FR-11.9).
 * `tooShort` lets the route pick the exact FRD wording. */
export class ReasonRequiredError extends Error {
  readonly tooShort: boolean;
  constructor(tooShort: boolean) {
    super('REASON_REQUIRED');
    this.name = 'ReasonRequiredError';
    this.tooShort = tooShort;
  }
}

/** resolution_values supplied with APPROVE/REJECT, or absent for EDIT_APPROVE (FR-11.3/11.5). */
export class ResolutionValuesNotAllowedError extends Error {
  constructor() {
    super('RESOLUTION_VALUES_NOT_ALLOWED');
    this.name = 'ResolutionValuesNotAllowedError';
  }
}

/** EDIT_APPROVE value set does not exactly match the proposal's field set (FR-11.7). */
export class ResolutionValuesIncompleteError extends Error {
  readonly missing: string[];
  readonly unexpected: string[];
  constructor(info: { missing: string[]; unexpected: string[] }) {
    super('RESOLUTION_VALUES_INCOMPLETE');
    this.name = 'ResolutionValuesIncompleteError';
    this.missing = info.missing;
    this.unexpected = info.unexpected;
  }
}

/** A duplicate field_name within resolution_values — a structural malformation (FR-11.15). */
export class DecisionRequestMalformedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionRequestMalformedError';
  }
}

/** Same Idempotency-Key, different body (FR-11.11). */
export class IdempotencyKeyReusedError extends Error {
  constructor() {
    super('IDEMPOTENCY_KEY_REUSED');
    this.name = 'IdempotencyKeyReusedError';
  }
}

// ── Public surface ────────────────────────────────────────────────────────────

export interface DecisionPrincipal {
  readonly id: string;
  readonly display_name: string;
}

const ENTRY_FIELD_SET: ReadonlySet<string> = new Set(ENTRY_FIELDS);
const REASON_MIN = 10;
const REASON_MAX = 2000;

/**
 * Record the one human decision that closes a case (F11). `exceptionId` is
 * ALREADY resolved to a uuid by the route.
 */
export async function recordDecision(
  deps: { pool: Pool; principal: DecisionPrincipal; requestId?: string },
  exceptionId: string,
  body: DecisionCreateRequest,
  idempotencyKey: string | null,
): Promise<DecisionRecordResponse> {
  const { pool, principal, requestId } = deps;

  // FR-11.11 — the idempotency pre-check runs OUTSIDE the transaction, BEFORE
  // BEGIN (FRD process step 3, literally before step 4 "Transaction BEGIN").
  if (idempotencyKey !== null) {
    const existing = await loadDecisionByIdempotencyKey(pool, exceptionId, idempotencyKey);
    if (existing !== null) {
      const storedValues = await loadDecisionValues(pool, existing.id);
      if (!decisionMatchesReplay(existing, storedValues, body)) {
        throw new IdempotencyKeyReusedError();
      }
      return assembleReplayResponse(pool, existing, storedValues);
    }
  }

  return withTransaction(pool, (tx) =>
    runDecision(tx, principal, requestId ?? null, exceptionId, body, idempotencyKey),
  );
}

// ── The transaction ────────────────────────────────────────────────────────────

type ResolutionValue = InsertDecisionValueInput;

async function runDecision(
  tx: PoolClient,
  principal: DecisionPrincipal,
  requestId: string | null,
  exceptionId: string,
  body: DecisionCreateRequest,
  idempotencyKey: string | null,
): Promise<DecisionRecordResponse> {
  // 1 — serialise concurrent decisions on this case (FR-11.10, FR-11.12).
  const exRes = await tx.query<{ id: string; entry_id: string; state: string }>(
    `SELECT id, entry_id, state FROM exceptions WHERE id = $1 FOR UPDATE`,
    [exceptionId],
  );
  const exception = exRes.rows[0];
  if (exception === undefined) {
    // The route already resolved the identifier — a missing row here is an
    // internal invariant breach, surfaced as the generic 500 (never a 404).
    throw new Error(`DECISION_READ_INVARIANT: exception ${exceptionId} vanished after identifier resolution`);
  }

  // 2 — one decision per case, ever.
  if (exception.state !== 'OPEN') {
    const existing = await loadDecisionByException(tx, exceptionId);
    if (existing === null) {
      // A non-OPEN case with no decision row is an invariant breach (the HITL
      // trigger forbids it), never a client-facing state.
      throw new Error(`DECISION_READ_INVARIANT: exception ${exceptionId} is ${exception.state} with no decision`);
    }
    throw new ExceptionAlreadyDecidedError({
      decision_type: existing.decision_type,
      decided_by_display_name: existing.decided_by_display_name,
      decided_at: existing.decided_at,
    });
  }

  // 3 — load the recommendation. NEVER null (F5 FR-5.12 guarantees a PENDING
  // placeholder). recommendation.id is ALWAYS stamped on the decision row.
  const recommendation = await loadRecommendationByException(tx, exceptionId);
  if (recommendation === null) {
    throw new Error(`DECISION_READ_INVARIANT: exception ${exceptionId} has no recommendation row`);
  }
  const recommendationId = recommendation.id;

  // 4 — stale-tab guard (FR-11.16).
  if (body.recommendation_id !== undefined && body.recommendation_id !== recommendationId) {
    throw new RecommendationMismatchError();
  }

  // 5 — branch on decision type, computing resolution values, resulting state,
  // reason, and the audit value rows.
  let resolutionValues: ResolutionValue[];
  let auditValues: AuditAppendValue[];
  let resultingState: 'RESOLVED' | 'REJECTED';
  let reason: string | null;
  let actionType: AuditActionType;

  if (body.decision_type === 'APPROVE') {
    if (recommendation.status !== 'AVAILABLE') {
      throw new RecommendationNotAvailableError();
    }
    if (body.resolution_values !== undefined) {
      throw new ResolutionValuesNotAllowedError();
    }
    reason = validateReason(body.reason, false);
    const proposed = await loadRecommendationValues(tx, recommendationId);
    resolutionValues = proposed.map((p) => ({
      field_name: p.field_name,
      value: p.proposed_value,
      origin: 'AI' as Origin,
      prior_value: p.proposed_value,
      prior_origin: 'AI' as Origin,
      changed_from_proposal: false,
    }));
    auditValues = resolutionValues.map(auditRowFor);
    resultingState = 'RESOLVED';
    actionType = 'RECOMMENDATION_APPROVED';
  } else if (body.decision_type === 'EDIT_APPROVE') {
    reason = validateReason(body.reason, true);
    const submitted = body.resolution_values;
    if (submitted === undefined || submitted.length === 0) {
      // "required but missing" — structurally the route's zod layer catches an
      // absent field, but if an empty array reaches here treat it as incomplete.
      throw new ResolutionValuesIncompleteError({ missing: ['(at least one field)'], unexpected: [] });
    }
    assertNoDuplicateFields(submitted);

    if (recommendation.status === 'AVAILABLE') {
      const proposed = await loadRecommendationValues(tx, recommendationId);
      resolutionValues = editApproveAgainstProposal(submitted, proposed);
    } else {
      resolutionValues = await editApproveDirect(tx, submitted, exception.entry_id);
    }
    auditValues = resolutionValues.map(auditRowFor);
    resultingState = 'RESOLVED';
    actionType = 'RECOMMENDATION_EDITED_AND_APPROVED';
  } else {
    // REJECT (FR-11.5).
    reason = validateReason(body.reason, true);
    if (body.resolution_values !== undefined) {
      throw new ResolutionValuesNotAllowedError();
    }
    resolutionValues = []; // nothing adopted — zero decision_values rows.
    // The audit records the DECLINED proposal (TechArch §3.6): if AVAILABLE,
    // one row per proposed value (before = proposal, after = null); else none.
    if (recommendation.status === 'AVAILABLE') {
      const proposed = await loadRecommendationValues(tx, recommendationId);
      auditValues = proposed.map((p) => ({
        field_name: p.field_name,
        before_value: p.proposed_value,
        before_origin: 'AI' as Origin,
        after_value: null,
        after_origin: null,
      }));
    } else {
      auditValues = [];
    }
    resultingState = 'REJECTED';
    actionType = 'RECOMMENDATION_REJECTED';
  }

  // 6 — case-anchor lock (mirrors receipt.service.ts step 10; append() also
  // takes it defensively).
  await lockCaseAnchor(tx, exception.entry_id);

  // 7 — insert the decision row (recommendation_id ALWAYS set).
  const decision = await insertDecision(tx, {
    exception_id: exceptionId,
    decision_type: body.decision_type,
    decided_by: principal.id,
    reason,
    recommendation_id: recommendationId,
    resulting_state: resultingState,
    idempotency_key: idempotencyKey,
  });

  // 8 — insert the decision_values rows (empty for REJECT).
  await insertDecisionValues(tx, decision.id, resolutionValues);

  // 9 — close the case. THE one UPDATE exceptions this service is EVER permitted
  // (receiptPaths.spec allowlist). Parameterised, never interpolated (R-L8).
  const closeRes = await tx.query<{ closed_at: Date }>(
    `UPDATE exceptions SET state = $1, closed_at = now(), decision_id = $2 WHERE id = $3
     RETURNING closed_at`,
    [resultingState, decision.id, exceptionId],
  );
  const closedAt = closeRes.rows[0]?.closed_at;
  if (!(closedAt instanceof Date)) {
    throw new Error('recordDecision: closing the case returned no closed_at');
  }

  // 10 — exactly one audit entry (FR-11.13).
  const auditEntryId = await append(tx, {
    case_id: exception.entry_id,
    exception_id: exceptionId,
    recommendation_id: recommendationId,
    decision_id: decision.id,
    action_type: actionType,
    actor: { type: 'SPECIALIST', specialist_id: principal.id },
    before_state: 'OPEN',
    after_state: resultingState,
    reason,
    request_id: requestId,
    values: auditValues,
  });

  // 11 — assemble the response from the transaction's own values (never re-read).
  return {
    decision: {
      id: decision.id,
      decision_type: body.decision_type,
      decided_at: decision.decided_at,
      decided_by: { id: principal.id, display_name: principal.display_name },
      reason,
    },
    resolution_values: resolutionValues.map(toDto),
    exception: { id: exceptionId, state: resultingState, closed_at: closedAt.toISOString() },
    audit_entry_id: auditEntryId,
    idempotent_replay: false,
  };
}

// ── EDIT_APPROVE value computation ─────────────────────────────────────────────

/**
 * EDIT_APPROVE against an AVAILABLE proposal (FR-11.7, FR-11.8). The submitted
 * field-name SET must equal the proposed field-name SET EXACTLY. For each value,
 * trim-then-byte-compare against the proposal decides origin.
 */
function editApproveAgainstProposal(
  submitted: readonly { field_name: EntryFieldName; value: string }[],
  proposed: readonly RecommendationValueRow[],
): ResolutionValue[] {
  const proposedByField = new Map(proposed.map((p) => [p.field_name, p]));
  const submittedFields = new Set(submitted.map((s) => s.field_name));

  const missing = proposed.map((p) => p.field_name).filter((f) => !submittedFields.has(f));
  const unexpected = submitted.map((s) => s.field_name).filter((f) => !proposedByField.has(f));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new ResolutionValuesIncompleteError({ missing, unexpected });
  }

  return submitted.map((s) => {
    const p = proposedByField.get(s.field_name);
    // The exact-set match above guarantees a proposal exists for every field.
    if (p === undefined) {
      throw new Error(`DECISION_READ_INVARIANT: no proposal for submitted field ${s.field_name}`);
    }
    const changed = s.value.trim() !== p.proposed_value.trim();
    return {
      field_name: s.field_name,
      value: s.value,
      origin: (changed ? 'HUMAN' : 'AI') as Origin,
      prior_value: p.proposed_value,
      prior_origin: 'AI' as Origin,
      changed_from_proposal: changed,
    };
  });
}

/**
 * EDIT_APPROVE with no available recommendation — "direct resolution" (FR-11.2/
 * FR-11.8). Every field is specialist-authored (HUMAN); prior_value is the
 * entry's own submitted value (HUMAN origin when present, else null).
 */
async function editApproveDirect(
  tx: PoolClient,
  submitted: readonly { field_name: EntryFieldName; value: string }[],
  entryId: string,
): Promise<ResolutionValue[]> {
  for (const s of submitted) {
    if (!ENTRY_FIELD_SET.has(s.field_name)) {
      throw new DecisionRequestMalformedError(`field_name ${s.field_name} is not a member of the entry field set`);
    }
  }
  const entry = await loadEntryDetail(tx, entryId);
  if (entry === null) {
    throw new Error(`DECISION_READ_INVARIANT: entry ${entryId} not found for direct resolution`);
  }
  return submitted.map((s) => {
    const prior = entry.values[s.field_name];
    return {
      field_name: s.field_name,
      value: s.value,
      origin: 'HUMAN' as Origin,
      prior_value: prior,
      prior_origin: (prior === null ? null : 'HUMAN') as Origin | null,
      changed_from_proposal: true,
    };
  });
}

// ── helpers ────────────────────────────────────────────────────────────────────

/** Trim-and-length-check a reason. Required ⇒ 10..2000; not required (APPROVE)
 * ⇒ absent is valid, present is bounded by the 2000 ceiling only. Returns the
 * trimmed reason to store, or null. */
function validateReason(reason: string | undefined, required: boolean): string | null {
  if (reason === undefined) {
    if (required) {
      throw new ReasonRequiredError(false);
    }
    return null;
  }
  const trimmed = reason.trim();
  if (required) {
    if (trimmed.length < REASON_MIN) {
      throw new ReasonRequiredError(true);
    }
    if (trimmed.length > REASON_MAX) {
      throw new DecisionRequestMalformedError('reason exceeds 2000 characters');
    }
    return trimmed;
  }
  // APPROVE: an absent/blank reason records nothing; a present one is bounded.
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > REASON_MAX) {
    throw new DecisionRequestMalformedError('reason exceeds 2000 characters');
  }
  return trimmed;
}

/** Reject a duplicate field_name — a structural malformation (FR-11.15). */
function assertNoDuplicateFields(
  submitted: readonly { field_name: EntryFieldName }[],
): void {
  const seen = new Set<string>();
  for (const s of submitted) {
    if (seen.has(s.field_name)) {
      throw new DecisionRequestMalformedError(`duplicate field_name ${s.field_name} in resolution_values`);
    }
    seen.add(s.field_name);
  }
}

/** The audit value row for one adopted resolution value. */
function auditRowFor(v: ResolutionValue): AuditAppendValue {
  return {
    field_name: v.field_name,
    before_value: v.prior_value,
    before_origin: v.prior_origin,
    after_value: v.value,
    after_origin: v.origin,
  };
}

/** Map a stored/computed resolution value to the DTO shape. */
function toDto(v: ResolutionValue): DecisionValueDto {
  return {
    field_name: v.field_name,
    value: v.value,
    origin: v.origin,
    prior_value: v.prior_value,
    prior_origin: v.prior_origin,
    changed_from_proposal: v.changed_from_proposal,
  };
}

// ── idempotent replay ──────────────────────────────────────────────────────────

/**
 * Whether a replayed request (same Idempotency-Key) matches the stored decision
 * exactly (FR-11.11): decision_type, trimmed reason, the resolution-value
 * field/value pairs, and recommendation_id if supplied. ANY difference is a
 * key-reused conflict.
 */
function decisionMatchesReplay(
  existing: DecisionRow,
  storedValues: readonly DecisionValueDto[],
  body: DecisionCreateRequest,
): boolean {
  if (existing.decision_type !== body.decision_type) {
    return false;
  }
  const bodyReason = body.reason === undefined ? null : body.reason.trim() === '' ? null : body.reason.trim();
  if ((existing.reason ?? null) !== bodyReason) {
    return false;
  }
  // Only compare resolution_values when the client actually supplied them
  // (EDIT_APPROVE). For APPROVE/REJECT the body carries none — the stored values
  // are server-derived (copied from the proposal for APPROVE, empty for REJECT),
  // so there is nothing client-sent to compare and decision_type + reason fully
  // identify the request. When supplied, the submitted field/value pairs must
  // match the stored resolution values exactly (origin is server-computed and
  // not part of the request, so it is not compared).
  if (body.resolution_values !== undefined) {
    const submitted = body.resolution_values;
    if (submitted.length !== storedValues.length) {
      return false;
    }
    const storedByField = new Map(storedValues.map((v) => [v.field_name, v.value]));
    for (const s of submitted) {
      if (storedByField.get(s.field_name) !== s.value) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Reassemble the original 201 body for an idempotent replay (FR-11.11) — writes
 * NOTHING. The audit_entry_id is read back from the audit store by decision_id.
 */
async function assembleReplayResponse(
  pool: Pool,
  existing: DecisionRow,
  storedValues: readonly DecisionValueDto[],
): Promise<DecisionRecordResponse> {
  const decisionRow = await pool.query<{
    resulting_state: 'RESOLVED' | 'REJECTED';
  }>(`SELECT resulting_state FROM decisions WHERE id = $1`, [existing.id]);
  const resultingState = decisionRow.rows[0]?.resulting_state;
  if (resultingState === undefined) {
    throw new Error(`DECISION_READ_INVARIANT: decision ${existing.id} vanished during replay`);
  }

  const exRes = await pool.query<{ id: string; state: string; closed_at: Date | null }>(
    `SELECT e.id, e.state, e.closed_at FROM exceptions e
       JOIN decisions d ON d.exception_id = e.id
      WHERE d.id = $1`,
    [existing.id],
  );
  const ex = exRes.rows[0];
  if (ex === undefined) {
    throw new Error(`DECISION_READ_INVARIANT: no exception for decision ${existing.id} during replay`);
  }

  const auditRes = await pool.query<{ id: string }>(
    `SELECT id FROM audit_entries WHERE decision_id = $1`,
    [existing.id],
  );
  const auditEntryId = auditRes.rows[0]?.id;
  if (auditEntryId === undefined) {
    throw new Error(`DECISION_READ_INVARIANT: no audit entry for decision ${existing.id} during replay`);
  }

  return {
    decision: {
      id: existing.id,
      decision_type: existing.decision_type,
      decided_at: existing.decided_at,
      decided_by: { id: existing.decided_by_id, display_name: existing.decided_by_display_name },
      reason: existing.reason,
    },
    resolution_values: storedValues,
    exception: {
      id: ex.id,
      state: ex.state as DecisionRecordResponse['exception']['state'],
      closed_at: ex.closed_at === null ? null : ex.closed_at.toISOString(),
    },
    audit_entry_id: auditEntryId,
    idempotent_replay: true,
  };
}
