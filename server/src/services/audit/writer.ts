import type { PoolClient } from 'pg';
import { ENTRY_FIELDS, type InternalInvariantCode } from '@cargoexec/contract';
import {
  computeEntryHash,
  ZERO_HASH,
  type CanonicalAuditEntry,
  type CanonicalAuditValue,
  type Origin,
} from '../../db/canonical.js';

/**
 * THE SINGLE AUDIT CHOKEPOINT (F13).
 *
 * This module exposes exactly ONE operation — `append(tx, entry)` — and it is
 * the only module under `server/src/` permitted to WRITE `audit_entries` or
 * `audit_entry_values` (rule R-L3; a read-only reader in plan 01-10 may SELECT
 * from them). There is deliberately NO update, delete, upsert, merge, redact,
 * correct, anonymise, backfill, purge or truncate function here — not exported,
 * and not present as a private helper either. History is append-only, and this
 * interface makes "history is append-only" a property of the type system, not
 * merely of the database privileges (FR-13.2).
 *
 * `append` cannot open its own transaction. It takes an already-open
 * `PoolClient` as its first, required argument (FR-13.3): the state change and
 * its audit entry commit together or neither does, because the deferred coupling
 * triggers only decide at COMMIT. It imports neither the pools nor
 * `withTransaction`, and never issues `BEGIN`.
 *
 * `occurred_at` is NOT a parameter (FR-13.8): it is read from the database with
 * `SELECT now()` inside the caller's transaction, and the actor identity comes
 * from the caller's typed principal, never from request input (FR-13.7).
 */

// ── Errors ──────────────────────────────────────────────────────────────────

/**
 * The writer's failure type. It carries an internal invariant `code` from
 * `@cargoexec/contract` so the API layer of a later phase maps it to the generic
 * `500 RECEIPT_FAILED` / `DECISION_FAILED` without ever leaking the internal
 * code to a client. Failure is LOUD (FR-13.16): the writer never swallows,
 * never falls back to a file or a queue, never logs-and-continues.
 */
export class AuditWriteError extends Error {
  readonly code: InternalInvariantCode;

  constructor(code: InternalInvariantCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'AuditWriteError';
    this.code = code;
  }
}

// ── Public input types ──────────────────────────────────────────────────────

export const AUDIT_ACTION_TYPES = [
  'ENTRY_RECEIVED',
  'VALIDATION_COMPLETED',
  'EXCEPTION_OPENED',
  'RECOMMENDATION_GENERATED',
  'RECOMMENDATION_UNAVAILABLE',
  'RECOMMENDATION_APPROVED',
  'RECOMMENDATION_EDITED_AND_APPROVED',
  'RECOMMENDATION_REJECTED',
] as const;

export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];

export type AuditActor =
  | { type: 'SPECIALIST'; specialist_id: string }
  | { type: 'AI' }
  | { type: 'SYSTEM'; on_behalf_of_specialist_id: string };

export type AuditAppendValue = {
  field_name: string;
  before_value: string | null;
  before_origin: Origin | null;
  after_value: string | null;
  after_origin: Origin | null;
};

export type AuditAppendInput = {
  case_id: string;
  exception_id?: string | null;
  recommendation_id?: string | null;
  decision_id?: string | null;
  action_type: AuditActionType;
  actor: AuditActor;
  before_state: string | null;
  after_state: string;
  reason?: string | null;
  values?: AuditAppendValue[];
  request_id?: string | null;
};

// ── Validation constants ────────────────────────────────────────────────────

const ACTION_SET: ReadonlySet<string> = new Set(AUDIT_ACTION_TYPES);

// before_state may be null only for these creation actions.
const CREATION_ACTIONS: ReadonlySet<AuditActionType> = new Set([
  'ENTRY_RECEIVED',
  'EXCEPTION_OPENED',
]);

// reason is REQUIRED (btrim length >= 10) for these.
const REASON_REQUIRED: ReadonlySet<AuditActionType> = new Set([
  'RECOMMENDATION_EDITED_AND_APPROVED',
  'RECOMMENDATION_REJECTED',
]);

// reason must be absent/null for these (RECOMMENDATION_APPROVED may carry one).
const REASON_FORBIDDEN: ReadonlySet<AuditActionType> = new Set([
  'ENTRY_RECEIVED',
  'VALIDATION_COMPLETED',
  'EXCEPTION_OPENED',
  'RECOMMENDATION_GENERATED',
  'RECOMMENDATION_UNAVAILABLE',
]);

const ENTRY_FIELD_SET: ReadonlySet<string> = new Set(ENTRY_FIELDS);

// Secret-shaped field NAMES (FR-13.12). A denylisted name is refused whatever
// the value is — the name alone signals the wrong kind of data.
const SECRET_FIELD_NAME_RE = /password|passwd|token|secret|api[_-]?key|authorization|cookie|csrf|credential/i;

// Secret-shaped VALUES: a bearer header, an OpenAI-style key, or a JWT.
const SECRET_VALUE_RES: readonly RegExp[] = [
  /^Bearer\s+\S+/i,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/,
];

function invalid(message: string): never {
  throw new AuditWriteError('AUDIT_WRITE_INVALID', message);
}

function forbidden(message: string): never {
  throw new AuditWriteError('AUDIT_WRITE_FORBIDDEN_CONTENT', message);
}

// ── Validation ──────────────────────────────────────────────────────────────
//
// Every check below raises BEFORE any SQL is issued: a rejected entry must never
// leave a half-written transaction, and a caller that gets an error knows no row
// exists. The order matches the plan (action → actor → state → reason → fields →
// secrets → value shape).

function validateActor(actor: AuditActor): { actorType: CanonicalAuditEntry['actor_type']; actorSpecialistId: string | null } {
  switch (actor.type) {
    case 'SPECIALIST':
      if (typeof actor.specialist_id !== 'string' || actor.specialist_id === '') {
        invalid('SPECIALIST actor requires a specialist_id');
      }
      return { actorType: 'SPECIALIST', actorSpecialistId: actor.specialist_id };
    case 'AI':
      // No id: an AI actor must carry no specialist identity (ae_actor_pairing_chk).
      if ('specialist_id' in actor && (actor as { specialist_id?: unknown }).specialist_id != null) {
        invalid('AI actor must not carry a specialist_id');
      }
      return { actorType: 'AI', actorSpecialistId: null };
    case 'SYSTEM':
      if (
        typeof actor.on_behalf_of_specialist_id !== 'string' ||
        actor.on_behalf_of_specialist_id === ''
      ) {
        invalid('SYSTEM actor requires on_behalf_of_specialist_id');
      }
      return { actorType: 'SYSTEM', actorSpecialistId: actor.on_behalf_of_specialist_id };
    default:
      invalid(`unknown actor type ${JSON.stringify((actor as { type?: unknown }).type)}`);
  }
}

function normaliseValues(input: AuditAppendValue[] | undefined): CanonicalAuditValue[] {
  if (input === undefined) {
    return [];
  }
  return input.map((v, i) => {
    if (v === null || typeof v !== 'object') {
      invalid(`value row ${i} is not an object`);
    }
    const { field_name, before_value, before_origin, after_value, after_origin } = v;

    // Field name must be a known entry field (FR-13.11 records only real fields).
    if (typeof field_name !== 'string' || !ENTRY_FIELD_SET.has(field_name)) {
      invalid(`value row ${i}: field_name ${JSON.stringify(field_name)} is not a member of ENTRY_FIELDS`);
    }

    // Secrets denylist — by field name.
    if (SECRET_FIELD_NAME_RE.test(field_name)) {
      forbidden(`field_name ${JSON.stringify(field_name)} is denylisted; secrets are never written to the audit store`);
    }

    // Secrets denylist — by value shape, both sides.
    for (const candidate of [before_value, after_value]) {
      if (typeof candidate === 'string' && SECRET_VALUE_RES.some((re) => re.test(candidate))) {
        forbidden(`a value on field ${JSON.stringify(field_name)} matches a secret shape; refusing to write it verbatim`);
      }
    }

    // At least one side non-null (aev_some_value_chk).
    if (before_value == null && after_value == null) {
      invalid(`value row ${i} (${field_name}): at least one of before_value / after_value must be non-null`);
    }

    // Origin present on each side that has a value (aev_origin_present_chk).
    if (before_value != null && (before_origin == null)) {
      invalid(`value row ${i} (${field_name}): before_value present without before_origin`);
    }
    if (after_value != null && (after_origin == null)) {
      invalid(`value row ${i} (${field_name}): after_value present without after_origin`);
    }
    if (before_origin != null && before_origin !== 'AI' && before_origin !== 'HUMAN') {
      invalid(`value row ${i} (${field_name}): before_origin must be 'AI' or 'HUMAN'`);
    }
    if (after_origin != null && after_origin !== 'AI' && after_origin !== 'HUMAN') {
      invalid(`value row ${i} (${field_name}): after_origin must be 'AI' or 'HUMAN'`);
    }

    // `changed` is computed VERBATIM: strict string comparison, no trimming, no
    // case folding (FR-13.11). Two distinct strings are a change even if they
    // differ only in surrounding whitespace.
    const changed = before_value !== after_value;

    return {
      field_name,
      before_value: before_value ?? null,
      before_origin: before_origin ?? null,
      after_value: after_value ?? null,
      after_origin: after_origin ?? null,
      changed,
    };
  });
}

function validate(entry: AuditAppendInput): {
  actorType: CanonicalAuditEntry['actor_type'];
  actorSpecialistId: string | null;
  reason: string | null;
  values: CanonicalAuditValue[];
} {
  // 1. action_type is one of the eight.
  if (!ACTION_SET.has(entry.action_type)) {
    invalid(`action_type ${JSON.stringify(entry.action_type)} is not one of the eight audit actions`);
  }

  // 2. Actor pairing.
  const { actorType, actorSpecialistId } = validateActor(entry.actor);

  // 3. State.
  if (typeof entry.after_state !== 'string' || entry.after_state === '') {
    invalid('after_state must be a non-empty string');
  }
  if (entry.before_state === null && !CREATION_ACTIONS.has(entry.action_type)) {
    invalid(`before_state may be null only for ENTRY_RECEIVED and EXCEPTION_OPENED, not ${entry.action_type}`);
  }

  // 4. Reason rules.
  const rawReason = entry.reason ?? null;
  if (REASON_REQUIRED.has(entry.action_type)) {
    if (rawReason === null || rawReason.trim().length < 10) {
      invalid(`${entry.action_type} requires a reason of at least 10 non-blank characters`);
    }
  } else if (REASON_FORBIDDEN.has(entry.action_type)) {
    if (rawReason !== null) {
      invalid(`${entry.action_type} must not carry a reason`);
    }
  }

  // 5–7. Field membership, secrets denylist, value shape.
  const values = normaliseValues(entry.values);

  return { actorType, actorSpecialistId, reason: rawReason, values };
}

// ── The single operation ────────────────────────────────────────────────────

/**
 * Append one audit entry (and its value rows) inside the caller's transaction.
 *
 * The caller is expected to hold the case-anchor lock already; `append` takes it
 * again defensively (`FOR UPDATE` is idempotent when already held), so the
 * sequence invariant holds even if a caller forgets. Returns the new
 * `audit_entries.id` (FR-13.16 callers need it to link a decision/recommendation).
 */
export async function append(tx: PoolClient, entry: AuditAppendInput): Promise<string> {
  // Transactional coupling: the first argument must be an open client, not a
  // pool and not a value we could accidentally open a transaction on.
  if (tx === null || typeof tx !== 'object' || typeof (tx as { query?: unknown }).query !== 'function') {
    throw new AuditWriteError('AUDIT_WRITE_INVALID', 'append requires an open transaction client as its first argument');
  }

  const { actorType, actorSpecialistId, reason, values } = validate(entry);

  // Case-anchor lock (FR-13.5). Idempotent if the caller already holds it.
  const lockRes = await tx.query('SELECT id FROM cargo_entries WHERE id = $1 FOR UPDATE', [entry.case_id]);
  if (lockRes.rowCount === 0) {
    invalid(`case_id ${JSON.stringify(entry.case_id)} does not exist`);
  }

  // Sequence assignment under the lock.
  const seqRes = await tx.query<{ next_sequence: string }>(
    'SELECT coalesce(max(case_sequence), 0) + 1 AS next_sequence FROM audit_entries WHERE case_id = $1',
    [entry.case_id],
  );
  const caseSequence = Number(seqRes.rows[0]?.next_sequence ?? 1);

  // Timestamp authority (FR-13.8): occurred_at is the database's transaction
  // `now()`, read back here so the SAME value covers both the hash payload and
  // the stored column. It is read (not left to the column default) because the
  // hash must cover the exact timestamp the row stores, and an audit row can
  // never be updated afterwards to reconcile a mismatch.
  const nowRes = await tx.query<{ occurred_at: Date }>('SELECT now() AS occurred_at');
  const occurredAt = nowRes.rows[0]?.occurred_at;
  if (!(occurredAt instanceof Date)) {
    throw new AuditWriteError('AUDIT_WRITE_INVALID', 'failed to read transaction timestamp');
  }

  // Hash chain (FR-13.6). Genesis link at sequence 1, else the previous entry's
  // hash — read under the same lock so no concurrent writer can slot in between.
  let prevEntryHash: Buffer;
  if (caseSequence === 1) {
    prevEntryHash = ZERO_HASH;
  } else {
    const prevRes = await tx.query<{ entry_hash: Buffer }>(
      'SELECT entry_hash FROM audit_entries WHERE case_id = $1 AND case_sequence = $2',
      [entry.case_id, caseSequence - 1],
    );
    const prev = prevRes.rows[0]?.entry_hash;
    if (!Buffer.isBuffer(prev)) {
      // The previous entry is missing — the chain is not continuous. Surfaced as
      // a conflict so the caller retries the whole transaction from scratch.
      throw new AuditWriteError(
        'AUDIT_SEQUENCE_CONFLICT',
        `previous entry at sequence ${caseSequence - 1} for case ${entry.case_id} not found`,
      );
    }
    prevEntryHash = prev;
  }

  const canonicalEntry: CanonicalAuditEntry = {
    case_id: entry.case_id,
    case_sequence: caseSequence,
    action_type: entry.action_type,
    actor_type: actorType,
    actor_specialist_id: actorSpecialistId,
    occurred_at: occurredAt,
    exception_id: entry.exception_id ?? null,
    recommendation_id: entry.recommendation_id ?? null,
    decision_id: entry.decision_id ?? null,
    before_state: entry.before_state,
    after_state: entry.after_state,
    reason,
    request_id: entry.request_id ?? null,
    values,
  };

  const entryHash = computeEntryHash(canonicalEntry, prevEntryHash);

  // Single parameterised INSERT ... RETURNING id. Every value is a $n bind
  // parameter (T-01-31): no template-literal interpolation of any caller value.
  let insertedId: string;
  try {
    const ins = await tx.query<{ id: string }>(
      `INSERT INTO audit_entries (
         case_id, case_sequence, action_type, actor_type, actor_specialist_id,
         occurred_at, exception_id, recommendation_id, decision_id,
         before_state, after_state, reason, request_id, prev_entry_hash, entry_hash
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        entry.case_id,
        caseSequence,
        entry.action_type,
        actorType,
        actorSpecialistId,
        occurredAt,
        entry.exception_id ?? null,
        entry.recommendation_id ?? null,
        entry.decision_id ?? null,
        entry.before_state,
        entry.after_state,
        reason,
        entry.request_id ?? null,
        Buffer.from(prevEntryHash),
        entryHash,
      ],
    );
    const row = ins.rows[0];
    if (row === undefined) {
      throw new AuditWriteError('AUDIT_WRITE_INVALID', 'INSERT INTO audit_entries returned no id');
    }
    insertedId = row.id;
  } catch (err) {
    // The ONLY permitted catch: map the unique (case_id, case_sequence) violation
    // to AUDIT_SEQUENCE_CONFLICT and rethrow immediately. Never retry (F13
    // §Error States). Everything else propagates unchanged.
    if (isUniqueViolation(err, 'uq_audit_entries_case_sequence')) {
      throw new AuditWriteError(
        'AUDIT_SEQUENCE_CONFLICT',
        `case ${entry.case_id} sequence ${caseSequence} already exists`,
      );
    }
    throw err;
  }

  // Value rows: one parameterised multi-row INSERT. No upsert clause — the
  // immutability trigger rejects an update branch and there is no legitimate
  // conflict here.
  if (values.length > 0) {
    const cols = 7;
    const params: unknown[] = [];
    const tuples: string[] = [];
    values.forEach((v, i) => {
      const base = i * cols;
      tuples.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`,
      );
      params.push(
        insertedId,
        v.field_name,
        v.before_value,
        v.before_origin,
        v.after_value,
        v.after_origin,
        v.changed,
      );
    });
    await tx.query(
      `INSERT INTO audit_entry_values
         (audit_entry_id, field_name, before_value, before_origin, after_value, after_origin, changed)
       VALUES ${tuples.join(',')}`,
      params,
    );
  }

  return insertedId;
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Recognise a Postgres unique-violation (SQLSTATE 23505) on a named constraint.
 * The only error the writer classifies rather than propagates verbatim.
 */
function isUniqueViolation(err: unknown, constraint: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === '23505' &&
    (err as { constraint?: unknown }).constraint === constraint
  );
}
