import type { Pool } from 'pg';
import type { QueueResponse, RowSummaryDto, FindingDto } from '@cargoexec/contract';
import { listOpenExceptions } from '../db/repositories/exceptions.js';
import { loadFindingsByValidationResultIds } from '../db/repositories/validation.js';

/**
 * THE receipt-ordered queue projection (F7 FR-7.5 / FR-7.6 / FR-7.9 / FR-7.10).
 *
 * This service is READ-ONLY. It composes two read repositories —
 * `listOpenExceptions` and `loadFindingsByValidationResultIds` — into the
 * `QueueResponse` the route (04-03) hands to the client. It writes NOTHING and
 * calls NO `append()`: reading the queue is explicitly side-effect-free
 * (FR-7.10). It mirrors the split `entries.ts`/`receipt.service.ts` already
 * establishes — the business logic (the failure-summary derivation, the
 * truncation ceiling) lives here, out of the thin HTTP route.
 *
 * `listQueue` takes ONLY `pool`. There is deliberately no filter, sort, offset,
 * cursor, or limit parameter — the FRD forbids every one of them (FR-7.2 /
 * FR-7.3), and the signature itself is the enforcement: there is no argument a
 * future caller could pass to shift the fixed `LIMIT 501`/500-row boundary
 * (T-04-04).
 */
export async function listQueue(pool: Pool): Promise<QueueResponse> {
  // Up to 501 rows, ascending receipt_position (FR-7.1). The 501st, if present,
  // is the "truncated" signal — never rendered (FR-7.9).
  const rows = await listOpenExceptions(pool);
  const truncated = rows.length > 500;
  const page = truncated ? rows.slice(0, 500) : rows;

  const findingsByVr = await loadFindingsByValidationResultIds(
    pool,
    page.map((r) => r.validation_result_id),
  );

  const exceptions: RowSummaryDto[] = page.map((r) => ({
    id: r.id,
    case_reference: r.case_reference,
    receipt_position: r.receipt_position,
    received_at: r.received_at,
    entry_number: r.entry_number,
    finding_count: r.findings_count,
    failure_summary: deriveFailureSummary(
      findingsByVr.get(r.validation_result_id) ?? [],
      r.findings_count,
    ),
  }));

  return { exceptions, returned_count: exceptions.length, truncated };
}

/**
 * Derive a row's plain-language failure summary (FR-7.6, exact).
 *
 * Take the `message` of the first two findings (already in ascending `rule_id` —
 * "server order" — from `loadFindingsByValidationResultIds`), join them with
 * `'; '`, and if the exception has more than two findings, append
 * `` ` and ${count - 2} more` ``. The summary is plain finding text ONLY: no
 * severity, weight, score, priority or ranking term appears anywhere — findings
 * are not graded (contract `FindingDto` carries no such field, and the queue
 * must not synthesise one).
 *
 * `count` is the authoritative `findings_count` from `validation_results`, not
 * `findings.length`: the summary shows the first two messages while the "N more"
 * suffix reflects the true total, so the two never disagree even if a caller
 * ever passed a partial findings list.
 */
function deriveFailureSummary(findings: readonly FindingDto[], count: number): string {
  const head = findings.slice(0, 2).map((f) => f.message);
  const summary = head.join('; ');
  return count > 2 ? `${summary} and ${count - 2} more` : summary;
}
