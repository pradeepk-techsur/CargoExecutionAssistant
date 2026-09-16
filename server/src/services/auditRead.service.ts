import type { Pool } from 'pg';
import type {
  ActorType,
  AuditActionType,
  AuditEntryDto,
  AuditTrailResponse,
} from '@cargoexec/contract';
import { resolveCaseIdentifier, loadExceptionDetail } from '../db/repositories/exceptions.js';

/**
 * THE SINGLE AUDIT READER (F13 FR-13.15, FR-13.18).
 *
 * This module is the sole READ-ONLY consumer of the audit tables under
 * `server/src/`. It complements `services/audit/writer.ts`, the sole WRITER
 * (rule R-L3): plan 01-06 asserts the audit-row insert statement appears in
 * exactly one file and that it is the writer, so this reader — which only
 * SELECTs — does not trip that rule, and must never contain a write statement,
 * an upsert, or a repair of any kind.
 *
 * `readCaseTrail` is strictly PER-CASE and strictly READ-ONLY. It takes exactly
 * one `caseId` and returns exactly that case's trail. There is deliberately no
 * bulk read, no cross-case query, no multi-case listing, no file rendering, no
 * streaming feed, no output-shape option and no paging window over cases. The
 * trail is read one case at a time, in the UI, and nowhere else
 * (FR-13.18, T-01-63).
 *
 * When `verify_audit_chain` reports a broken chain, this service returns that
 * fact — `chain_verified: false` with the divergent sequence and the entries as
 * stored — and offers NO repair affordance. The UI surfaces the result and
 * offers no repair action (F14, Y2 §8).
 *
 * TEST-ARCH-03 scoping note: the architecture suite scopes its
 * "single audit writer" assertion to writes; this reader is the intended,
 * whitelisted read consumer of the audit tables.
 */

// ── Return shape (matches plan 01-10 integration_contracts.provides) ─────────

export type CaseTrailValue = {
  field_name: string;
  before_value: string | null;
  before_origin: 'AI' | 'HUMAN' | null;
  after_value: string | null;
  after_origin: 'AI' | 'HUMAN' | null;
  changed: boolean;
};

export type CaseTrailEntry = {
  id: string;
  case_sequence: number;
  action_type: string;
  actor_type: 'SPECIALIST' | 'AI' | 'SYSTEM';
  actor_id: string | null; // ae.actor_specialist_id; null for AI
  actor_display_name: string | null; // joined from specialists; null for AI
  occurred_at: Date;
  before_state: string | null;
  after_state: string;
  reason: string | null;
  exception_id: string | null;
  recommendation_id: string | null;
  decision_id: string | null;
  values: CaseTrailValue[];
};

export type CaseTrail = {
  entries: CaseTrailEntry[]; // ascending case_sequence
  chain_verified: boolean;
  first_divergence_sequence: number | null;
  entry_count: number;
};

// ── Internal row shapes (as pg returns them) ─────────────────────────────────

type EntryRow = {
  id: string;
  case_sequence: number | string;
  action_type: string;
  actor_type: 'SPECIALIST' | 'AI' | 'SYSTEM';
  actor_id: string | null;
  actor_display_name: string | null;
  occurred_at: Date;
  before_state: string | null;
  after_state: string;
  reason: string | null;
  exception_id: string | null;
  recommendation_id: string | null;
  decision_id: string | null;
};

type ValueRow = {
  audit_entry_id: string;
  field_name: string;
  before_value: string | null;
  before_origin: 'AI' | 'HUMAN' | null;
  after_value: string | null;
  after_origin: 'AI' | 'HUMAN' | null;
  changed: boolean;
};

type VerifyRow = {
  chain_verified: boolean;
  first_divergence_sequence: number | string | null;
  entry_count: number | string;
};

// ── The single operation ─────────────────────────────────────────────────────

/**
 * Read one case's audit trail: its entries in ascending `case_sequence`, each
 * carrying its per-value rows (with before/after origins), the acting
 * specialist's display name (null for AI actions), and the chain-verification
 * result returned unmodified from `verify_audit_chain`.
 *
 * Three parameterised `SELECT`s, no transaction required — `verify_audit_chain`
 * is `STABLE` and the two data reads are plain selects. The queries never
 * interpolate a caller value: every input is a bind parameter.
 */
export async function readCaseTrail(pool: Pool, caseId: string): Promise<CaseTrail> {
  // 1. Entries, ascending, with the acting specialist's display name.
  //    The LEFT JOIN is required: actor_specialist_id is NULL for AI actions,
  //    so actor_display_name is null there. No literal 'AI' name is substituted
  //    — actor_type already carries that distinction, and inventing a machine
  //    display name would blur exactly the AI-vs-human line the product exists
  //    to preserve (T-01-65).
  const entriesRes = await pool.query<EntryRow>(
    `SELECT ae.id, ae.case_sequence, ae.action_type, ae.actor_type,
            ae.actor_specialist_id AS actor_id,
            s.display_name AS actor_display_name, ae.occurred_at,
            ae.before_state, ae.after_state, ae.reason,
            ae.exception_id, ae.recommendation_id, ae.decision_id
       FROM audit_entries ae
       LEFT JOIN specialists s ON s.id = ae.actor_specialist_id
      WHERE ae.case_id = $1
      ORDER BY ae.case_sequence ASC`,
    [caseId],
  );

  const entryIds = entriesRes.rows.map((r) => r.id);

  // 2. Value rows for those entries, ordered deterministically by field_name so
  //    a rendered trail is stable and matches the order the entry hash covers.
  const valueRows: ValueRow[] =
    entryIds.length === 0
      ? []
      : (
          await pool.query<ValueRow>(
            `SELECT audit_entry_id, field_name, before_value, before_origin,
                    after_value, after_origin, changed
               FROM audit_entry_values
              WHERE audit_entry_id = ANY($1::uuid[])
              ORDER BY audit_entry_id, field_name ASC`,
            [entryIds],
          )
        ).rows;

  const valuesByEntry = new Map<string, CaseTrailValue[]>();
  for (const v of valueRows) {
    const list = valuesByEntry.get(v.audit_entry_id) ?? [];
    list.push({
      field_name: v.field_name,
      before_value: v.before_value,
      before_origin: v.before_origin,
      after_value: v.after_value,
      after_origin: v.after_origin,
      changed: v.changed,
    });
    valuesByEntry.set(v.audit_entry_id, list);
  }

  const entries: CaseTrailEntry[] = entriesRes.rows.map((r) => ({
    id: r.id,
    case_sequence: Number(r.case_sequence),
    action_type: r.action_type,
    actor_type: r.actor_type,
    actor_id: r.actor_id,
    actor_display_name: r.actor_display_name,
    occurred_at: r.occurred_at,
    before_state: r.before_state,
    after_state: r.after_state,
    reason: r.reason,
    exception_id: r.exception_id,
    recommendation_id: r.recommendation_id,
    decision_id: r.decision_id,
    values: valuesByEntry.get(r.id) ?? [],
  }));

  // 3. Chain verification, returned unmodified. Read-only by construction:
  //    verify_audit_chain is STABLE and reports the break rather than repairing
  //    it (F0 FR-0.8).
  const verifyRes = await pool.query<VerifyRow>(
    `SELECT chain_verified, first_divergence_sequence, entry_count
       FROM verify_audit_chain($1)`,
    [caseId],
  );
  const v = verifyRes.rows[0];
  if (v === undefined) {
    throw new Error('readCaseTrail: verify_audit_chain returned no row');
  }

  return {
    entries,
    chain_verified: v.chain_verified,
    first_divergence_sequence:
      v.first_divergence_sequence === null ? null : Number(v.first_divergence_sequence),
    entry_count: Number(v.entry_count),
  };
}

// ── The API composition (F13 endpoint 10; TechArch §3.5.4) ───────────────────

/**
 * Resolve a caller-supplied identifier (uuid — this route is uuid-only,
 * mirroring recommendation.ts, since the SPA always calls this with the
 * exception id it already holds from the case load) to the FULL
 * AuditTrailResponse the API returns. Composes resolveCaseIdentifier +
 * loadExceptionDetail (both existing, F7) with readCaseTrail (above, same
 * module — this is one more operation in the single reader, not a second
 * reader), and joins model_id from `recommendations` for any entry whose
 * recommendation_id is set (C-1: RECOMMENDATION_GENERATED /
 * RECOMMENDATION_UNAVAILABLE only). Returns 'NOT_FOUND' for an unmatched
 * exception id.
 *
 * READ-ONLY by construction: it issues only SELECTs (the model_id join,
 * resolveCaseIdentifier, loadExceptionDetail, readCaseTrail); it imports no
 * insert/update function from any repository, preserving this module's
 * "single reader, read-only" header guarantee (T-06-07).
 */
export async function loadAuditTrailResponse(
  pool: Pool,
  exceptionId: string,
): Promise<AuditTrailResponse | 'NOT_FOUND'> {
  const resolved = await resolveCaseIdentifier(pool, 'UUID', exceptionId);
  if (resolved.status !== 'FOUND') return 'NOT_FOUND';
  const exceptionRow = await loadExceptionDetail(pool, resolved.exceptionId);
  if (exceptionRow === null) return 'NOT_FOUND'; // defensive; should not happen
  const trail = await readCaseTrail(pool, exceptionRow.entry_id);

  // Join model_id for the recommendation_id set present in this trail — one
  // extra SELECT ... WHERE id = ANY($1::uuid[]), never a per-row query. Bounded
  // by the DISTINCT recommendation_ids in one case's trail (T-06-08).
  const recIds = [
    ...new Set(
      trail.entries.map((e) => e.recommendation_id).filter((x): x is string => x !== null),
    ),
  ];
  const modelIdByRecId = new Map<string, string>();
  if (recIds.length > 0) {
    const res = await pool.query<{ id: string; model_id: string | null }>(
      `SELECT id, model_id FROM recommendations WHERE id = ANY($1::uuid[])`,
      [recIds],
    );
    for (const r of res.rows) {
      if (r.model_id !== null) modelIdByRecId.set(r.id, r.model_id);
    }
  }

  const entries: AuditEntryDto[] = trail.entries.map((e) => {
    // model_id is present ONLY on the two AI recommendation events (C-1). A
    // DECISION event (APPROVE/EDIT_APPROVE/REJECT) also carries the
    // recommendation_id — it is the recommendation the human acted on — but the
    // MODEL that produced it belongs to the generation event, not the human's
    // decision, so it is never attached to a decision entry.
    const carriesModelId =
      e.action_type === 'RECOMMENDATION_GENERATED' ||
      e.action_type === 'RECOMMENDATION_UNAVAILABLE';
    return {
      id: e.id,
      case_sequence: e.case_sequence,
      action_type: e.action_type as AuditActionType,
      actor_type: e.actor_type as ActorType,
      actor:
        e.actor_id !== null && e.actor_display_name !== null
          ? { id: e.actor_id, display_name: e.actor_display_name }
          : null,
      ...(carriesModelId &&
      e.recommendation_id !== null &&
      modelIdByRecId.has(e.recommendation_id)
        ? { model_id: modelIdByRecId.get(e.recommendation_id) as string }
        : {}),
      occurred_at: e.occurred_at.toISOString(),
      before_state: e.before_state,
      after_state: e.after_state,
      reason: e.reason,
      values: e.values,
    };
  });

  return {
    case_reference: exceptionRow.case_reference,
    entry_count: trail.entry_count,
    chain_verified: trail.chain_verified,
    first_divergence_sequence: trail.first_divergence_sequence,
    entries,
  };
}
