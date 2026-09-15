import type { Pool } from 'pg';
import type {
  EntryFieldName,
  ReceiptResponse,
  ReceiptOutcome,
  FindingDto,
} from '@cargoexec/contract';
import { withTransaction } from '../db/tx.js';
import { append, type AuditAppendValue } from './audit/writer.js';
import { evaluate } from './validation/index.js';
import { isCalendarDate } from './validation/normalise.js';
import {
  allocateReceiptStamp,
  insertEntry,
  lockCaseAnchor,
  insertFieldOrigins,
  findCaseReferenceByEntryNumber,
  type CanonicalEntryRecord,
} from '../db/repositories/entries.js';
import {
  insertValidationResult,
  insertFindings,
} from '../db/repositories/validation.js';
import {
  insertException,
  insertPendingRecommendation,
} from '../db/repositories/exceptions.js';
import { logger } from '../http/logger.js';

/**
 * THE receipt transaction (F3 / F4 / F5, TechArch §1.5 steps 6–18).
 *
 * This module is the phase's load-bearing guarantee: *no entry can exist having
 * been received but never assessed*. It holds because persistence, validation,
 * exception derivation and audit all commit together or not at all — everything
 * from the receipt stamp through the last `append` runs inside ONE
 * `withTransaction(pool, fn)` callback — and because the Phase 1 deferred
 * coupling triggers refuse the COMMIT if any of the three audit entries is
 * missing. A "forgot to audit" bug does not produce an unaudited change; it
 * produces a failed transaction and a generic `500 RECEIPT_FAILED` telling the
 * specialist nothing was saved.
 *
 * Two architectural constraints this module obeys (STATE.md):
 *
 *   R-L2 — `db/tx.ts` is the SOLE `BEGIN`/`COMMIT`/`ROLLBACK` site. This service
 *   issues no transaction-control statement of its own; it calls
 *   `withTransaction` exactly once.
 *
 *   D-3 — there is NO cargo-entry UPDATE statement anywhere in `server/src`.
 *   `receipt_outcome` is written with its final value in the single INSERT,
 *   computed from the engine's own outcome, never a parameter and never updated.
 *   Validating BEFORE the insert is what keeps entry immutability *stronger*
 *   than the FRD's step-10 "set receipt_outcome" (which is deliberately
 *   unexecutable under the `cargoexec_app` grant).
 *
 * R-L4 / R-L5: this module is the only writer of `cargo_entries`,
 * `cargo_entry_field_origins`, `validation_results`, `validation_findings` and
 * the `exceptions` INSERT. It contains NO function that writes
 * `exceptions.state`, `closed_at` or `decision_id` — `decision.service.ts`
 * (Phase 6) is the sole writer of those. It exports nothing but `receiveEntry`,
 * `EntryNumberDuplicateError` and `ReceiptPrincipal`.
 *
 * There is NO bypass: `receiveEntry` takes no flag, mode, option or
 * `skipValidation` argument, and there is no second entry point. Validation is
 * unconditional (F3 FR-3.4).
 */

export interface ReceiptPrincipal {
  readonly id: string;
  readonly display_name: string;
}

/**
 * Raised for the 409 path (F3 FR-3.9). Carries the reference of the case that
 * already owns the entry number so the specialist can navigate to it. It carries
 * no specialist identity, no entry values and no internal id — a duplicate probe
 * reveals nothing beyond the case reference the caller may already navigate to
 * (T-03-27).
 */
export class EntryNumberDuplicateError extends Error {
  readonly entry_number: string;
  readonly case_reference: string | null;

  constructor(entry_number: string, case_reference: string | null) {
    super(`ENTRY_NUMBER_DUPLICATE: entry number ${entry_number} already exists`);
    this.name = 'EntryNumberDuplicateError';
    this.entry_number = entry_number;
    this.case_reference = case_reference;
  }
}

/**
 * Internal marker thrown inside the transaction callback when the unique
 * violation on `uq_cargo_entries_entry_number` is caught. It carries the
 * submitted entry number so the outer handler — running AFTER the rolled-back
 * transaction, on the pool — can look up the existing case reference. Not
 * exported: it never escapes this module.
 */
class DuplicateEntryNumberSignal extends Error {
  readonly entry_number: string;
  constructor(entry_number: string) {
    super('duplicate entry number');
    this.name = 'DuplicateEntryNumberSignal';
    this.entry_number = entry_number;
  }
}

const UNIQUE_ENTRY_NUMBER_CONSTRAINT = 'uq_cargo_entries_entry_number';

export async function receiveEntry(
  deps: {
    pool: Pool;
    principal: ReceiptPrincipal;
    requestId?: string;
    /**
     * Post-commit AI dispatch. Injected so the request path can pass a no-op and
     * Phase 5 can pass the real worker. NEVER awaited (FR-3.14): AI provider
     * failure MUST NOT affect receipt success.
     */
    dispatchRecommendation?: (exceptionId: string) => void;
  },
  submitted: CanonicalEntryRecord,
  provided: readonly EntryFieldName[],
): Promise<ReceiptResponse> {
  const { pool, principal, requestId } = deps;

  let result: TransactionResult;
  try {
    result = await withTransaction(pool, (tx) =>
      runReceipt(tx, principal, requestId ?? null, submitted, provided),
    );
  } catch (err) {
    // The duplicate entry number surfaces AFTER the transaction has rolled back
    // (the dead transaction cannot serve the lookup query), so resolve the
    // existing case reference here, on the pool.
    if (err instanceof DuplicateEntryNumberSignal) {
      const existing = await findCaseReferenceByEntryNumber(pool, err.entry_number);
      throw new EntryNumberDuplicateError(err.entry_number, existing);
    }
    // Every other failure — including a deferred coupling-trigger violation at
    // COMMIT — propagates unchanged so errorMapper answers 500 RECEIPT_FAILED
    // with "nothing was saved".
    throw err;
  }

  // Step 17 — post-commit dispatch, and ONLY after commit. Never awaited; wrap
  // in try/catch that logs and swallows so a synchronous throw in the injected
  // callback cannot affect the already-committed receipt (FR-3.14, NFR-9).
  if (result.exception !== null && deps.dispatchRecommendation !== undefined) {
    try {
      deps.dispatchRecommendation(result.exception.id);
    } catch (err) {
      logger.error(
        { request_id: requestId ?? null, exception_id: result.exception.id, err },
        'post-commit recommendation dispatch threw; receipt is unaffected',
      );
    }
  }

  return result.response;
}

type TransactionResult = {
  response: ReceiptResponse;
  exception: { id: string } | null;
};

/**
 * Steps 7–18 of TechArch §1.5, all inside the caller's open transaction. Nothing
 * here is retried: an `AUDIT_SEQUENCE_CONFLICT` is surfaced to the caller, never
 * silently retried (F13 §Error States).
 */
async function runReceipt(
  tx: import('pg').PoolClient,
  principal: ReceiptPrincipal,
  requestId: string | null,
  submitted: CanonicalEntryRecord,
  provided: readonly EntryFieldName[],
): Promise<TransactionResult> {
  // 7 — the receipt stamp: received_at and case_reference from ONE statement, so
  // both come from the same transaction snapshot.
  const { received_at, case_reference } = await allocateReceiptStamp(tx);

  // 8 — validation, BEFORE the single INSERT (D-3). The engine sees the exact
  // received_at that will be stored (RIV-132), and it evaluates the SUBMITTED
  // record — including a mistyped arrival_date, which it reports as RIV-131.
  const evaluation = evaluate(submitted, received_at);
  const outcome: ReceiptOutcome =
    evaluation.outcome === 'FAIL' ? 'EXCEPTION_OPENED' : 'VALIDATED_CLEAN';

  // arrival_date precondition: `insertEntry` binds `$18::date`, and an
  // impossible date like '2026-02-30' raises 22008. Store NULL for a
  // non-calendar date (the FRD requires it stored as NULL and reported as
  // RIV-131, never a 422 or 500). Build a shallow copy — NEVER mutate
  // `submitted`, which the audit entry and the response also read.
  const storedValues: CanonicalEntryRecord =
    submitted.arrival_date !== null && !isCalendarDate(submitted.arrival_date)
      ? { ...submitted, arrival_date: null }
      : submitted;

  // 9 — the single INSERT, carrying the FINAL receipt_outcome.
  let entryId: string;
  try {
    const inserted = await insertEntry(tx, {
      values: storedValues,
      created_by: principal.id,
      received_at,
      case_reference,
      receipt_outcome: outcome,
    });
    entryId = inserted.id;
  } catch (err) {
    // Distinguish the entry-number uniqueness violation by its named constraint,
    // not by SQLSTATE alone, so a different 23505 in this transaction is not
    // misreported as a duplicate entry number. The transaction rolls back;
    // `receiveEntry` resolves the existing case reference on the pool.
    if (isUniqueViolation(err, UNIQUE_ENTRY_NUMBER_CONSTRAINT)) {
      throw new DuplicateEntryNumberSignal(submitted.entry_number ?? '');
    }
    throw err;
  }

  // 10 — case-anchor lock. `append` assigns case_sequence under this lock; take
  // it ONCE here, so all three appends run under the same lock.
  await lockCaseAnchor(tx, entryId);

  // 11 — provenance: one HUMAN row per provided field. An entirely empty entry
  // legitimately gets zero rows (F3 FR-3.8) — the primary demonstration path.
  await insertFieldOrigins(tx, entryId, provided);

  // 12 — ENTRY_RECEIVED (seq 1), actor SPECIALIST. One value row per provided
  // field: after_value = the SUBMITTED value, after_origin = HUMAN.
  await append(tx, {
    case_id: entryId,
    action_type: 'ENTRY_RECEIVED',
    actor: { type: 'SPECIALIST', specialist_id: principal.id },
    before_state: null,
    after_state: 'RECEIVED',
    request_id: requestId,
    values: provided.map((field) => submittedValueRow(field, submitted[field])),
  });

  // 13 — validation result (+ findings, in the engine's ascending rule_id
  // order). A clean pass writes a PASS row with zero findings — never no row
  // (F4 FR-4.11). Passing the engine's own counts keeps
  // validation_results_counts_chk satisfied.
  const findings: readonly FindingDto[] = evaluation.findings.map((f) => ({
    rule_id: f.rule_id,
    field_name: f.field_name,
    failure_code: f.failure_code,
    message: f.message,
  }));
  const validation = await insertValidationResult(tx, {
    entry_id: entryId,
    outcome: evaluation.outcome,
    rule_set_version: evaluation.rule_set_version,
    rules_evaluated_count: evaluation.rules_evaluated_count,
    findings_count: findings.length,
  });
  await insertFindings(tx, validation.id, findings);

  // 14 — VALIDATION_COMPLETED (seq 2), actor SYSTEM on behalf of the specialist.
  // One value row per finding; a clean pass has zero value rows, which is
  // correct (the writer accepts it).
  await append(tx, {
    case_id: entryId,
    action_type: 'VALIDATION_COMPLETED',
    actor: { type: 'SYSTEM', on_behalf_of_specialist_id: principal.id },
    before_state: 'RECEIVED',
    after_state: outcome,
    request_id: requestId,
    values: findings.map((f) => findingValueRow(f)),
  });

  // 15 — exception derivation, only on FAIL. No `reason` on any of these three
  // actions (they are in the writer's REASON_FORBIDDEN set).
  let exceptionRef: ReceiptResponse['exception'] = null;
  if (evaluation.outcome === 'FAIL') {
    // A FAIL with zero findings is an engine contradiction — abort rather than
    // open an exception with no basis (F5 §Error States).
    if (findings.length < 1) {
      throw new ExceptionWithoutBasisError();
    }
    const exception = await insertException(tx, {
      entry_id: entryId,
      validation_result_id: validation.id,
    });
    // The PENDING recommendation placeholder writes NO audit entry (FR-5.12).
    await insertPendingRecommendation(tx, exception.id);
    await append(tx, {
      case_id: entryId,
      exception_id: exception.id,
      action_type: 'EXCEPTION_OPENED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: principal.id },
      before_state: null,
      after_state: 'OPEN',
      request_id: requestId,
      values: findings.map((f) => findingValueRow(f)),
    });
    exceptionRef = {
      id: exception.id,
      state: exception.state,
      receipt_position: exception.receipt_position,
    };
  }

  // 18 — the response. `entry.values` reflect the RECORD as stored (including a
  // nulled invalid date), not the request. `evaluated_at` is the database's
  // now() returned by insertValidationResult, never a clock read.
  const fieldOrigins: { -readonly [K in EntryFieldName]?: 'HUMAN' } = {};
  for (const field of provided) {
    fieldOrigins[field] = 'HUMAN';
  }

  const response: ReceiptResponse = {
    entry: {
      id: entryId,
      case_reference,
      received_at,
      created_by: { id: principal.id, display_name: principal.display_name },
      values: storedValues,
      field_origins: fieldOrigins,
    },
    case_reference,
    receipt_outcome: outcome,
    validation: {
      outcome: evaluation.outcome,
      rule_set_version: evaluation.rule_set_version,
      evaluated_at: validation.evaluated_at,
      findings,
    },
    exception: exceptionRef,
    next: {
      case_url: evaluation.outcome === 'FAIL' ? `/cases/${case_reference}` : null,
      queue_url: '/queue',
    },
  };

  return { response, exception: exceptionRef === null ? null : { id: exceptionRef.id } };
}

/**
 * Raised when the engine reports FAIL with no findings — an internal
 * contradiction that must abort the receipt (F5 §Error States,
 * `EXCEPTION_WITHOUT_BASIS`). It surfaces as the generic 500 RECEIPT_FAILED via
 * errorMapper's internal-invariant fallback; the message begins with the code so
 * the log correlates it.
 */
class ExceptionWithoutBasisError extends Error {
  readonly code = 'EXCEPTION_WITHOUT_BASIS';
  constructor() {
    super('EXCEPTION_WITHOUT_BASIS: validation reported FAIL with zero findings');
    this.name = 'ExceptionWithoutBasisError';
  }
}

/** The ENTRY_RECEIVED value row for one provided field. */
function submittedValueRow(field: EntryFieldName, value: string | null): AuditAppendValue {
  return {
    field_name: field,
    before_value: null,
    before_origin: null,
    after_value: value,
    after_origin: 'HUMAN',
  };
}

/**
 * The VALIDATION_COMPLETED / EXCEPTION_OPENED value row for one finding: the
 * failure code plus its plain-language message, bound to the finding's primary
 * field. NOTE (intended behaviour, not a bug): the audit writer refuses
 * secret-shaped field NAMES and VALUES. All fourteen field names are safe and a
 * finding's after_value is a failure code + message, but a specialist could type
 * a bearer-token-shaped string into e.g. goods_description whose ENTRY_RECEIVED
 * value row the writer would refuse (AUDIT_WRITE_FORBIDDEN_CONTENT), correctly
 * aborting the whole receipt with 500 RECEIPT_FAILED. This service deliberately
 * adds NO bypass — see receipt.spec.ts case 14.
 */
function findingValueRow(f: FindingDto): AuditAppendValue {
  return {
    field_name: f.field_name,
    before_value: null,
    before_origin: null,
    after_value: `${f.failure_code}: ${f.message}`,
    after_origin: 'HUMAN',
  };
}

/** Recognise a Postgres unique violation (SQLSTATE 23505) on a named constraint. */
function isUniqueViolation(err: unknown, constraint: string): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const e = err as { code?: unknown; constraint?: unknown; message?: unknown };
  if (e.code !== '23505') {
    return false;
  }
  // Prefer the structured constraint name; fall back to the message in case the
  // driver did not populate it.
  if (e.constraint === constraint) {
    return true;
  }
  return typeof e.message === 'string' && e.message.includes(constraint);
}
