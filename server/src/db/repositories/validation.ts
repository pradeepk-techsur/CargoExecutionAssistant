import type { FindingDto } from '@cargoexec/contract';
import type { Queryable } from './types.js';

/**
 * Hand-written parameterised SQL for `validation_results` and
 * `validation_findings` (migration 0003).
 *
 * `Queryable`-first, static SQL, `$n` binds only (R-L1, R-L2, R-L8). The
 * multi-row findings insert uses `unnest()` so the query text stays a constant
 * string — no `($1,$2),($3,$4)` placeholder scaffold, keeping the
 * template-literal-SQL exclusion list at exactly two files.
 *
 * There is deliberately NO update or delete function for either table (F4
 * FR-4.12): a later human resolution does not amend the findings, so the
 * original basis of the exception survives intact. There is no re-validate path
 * anywhere — `uq_validation_results_entry` enforces exactly one result per entry.
 */

/**
 * Insert the single validation result for an entry. `evaluated_at` defaults to
 * `now()` in the DB so it lands in the same transaction snapshot. Exactly one
 * row per entry is enforced by `uq_validation_results_entry` (F4 FR-4.11); a
 * clean pass is recorded as a `PASS` row with `findings_count = 0` — the absence
 * of an exception is EVIDENCED, never inferred from missing data.
 */
export async function insertValidationResult(
  db: Queryable,
  input: {
    entry_id: string;
    outcome: 'PASS' | 'FAIL';
    rule_set_version: string;
    rules_evaluated_count: number;
    findings_count: number;
  },
): Promise<{ id: string; evaluated_at: string }> {
  const res = await db.query<{ id: string; evaluated_at: Date }>(
    `INSERT INTO validation_results
       (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, evaluated_at`,
    [
      input.entry_id,
      input.outcome,
      input.rule_set_version,
      input.rules_evaluated_count,
      input.findings_count,
    ],
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('insertValidationResult: INSERT returned no row');
  }
  return { id: row.id, evaluated_at: row.evaluated_at.toISOString() };
}

/**
 * Insert the findings for a validation result, preserving the caller's order
 * (ascending `rule_id` — F4 FR-4.8). Static SQL via `unnest`; returns early with
 * NO statement when `findings` is empty (a PASS result has none).
 */
export async function insertFindings(
  db: Queryable,
  validationResultId: string,
  findings: readonly FindingDto[],
): Promise<void> {
  if (findings.length === 0) {
    return;
  }
  const ruleIds: string[] = [];
  const fieldNames: string[] = [];
  const failureCodes: string[] = [];
  const messages: string[] = [];
  for (const f of findings) {
    ruleIds.push(f.rule_id);
    fieldNames.push(f.field_name);
    failureCodes.push(f.failure_code);
    messages.push(f.message);
  }
  await db.query(
    `INSERT INTO validation_findings
       (validation_result_id, rule_id, field_name, failure_code, message)
     SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::text[])`,
    [validationResultId, ruleIds, fieldNames, failureCodes, messages],
  );
}

/** The validation result for an entry, with its findings in ascending rule_id. */
export type ValidationByEntry = {
  id: string;
  outcome: 'PASS' | 'FAIL';
  rule_set_version: string;
  evaluated_at: string;
  findings: FindingDto[];
};

/**
 * Load the validation result and its findings for an entry (F3 FR-3.11 / F4
 * read). Findings come back in ascending `rule_id`. Returns `null` when the
 * entry has no result recorded.
 */
export async function loadValidationByEntry(
  db: Queryable,
  entryId: string,
): Promise<ValidationByEntry | null> {
  const resultRes = await db.query<{
    id: string;
    outcome: 'PASS' | 'FAIL';
    rule_set_version: string;
    evaluated_at: Date;
  }>(
    `SELECT id, outcome, rule_set_version, evaluated_at
       FROM validation_results
      WHERE entry_id = $1`,
    [entryId],
  );
  const result = resultRes.rows[0];
  if (result === undefined) {
    return null;
  }
  const findingsRes = await db.query<{
    rule_id: string;
    field_name: FindingDto['field_name'];
    failure_code: string;
    message: string;
  }>(
    `SELECT rule_id, field_name, failure_code, message
       FROM validation_findings
      WHERE validation_result_id = $1
      ORDER BY rule_id`,
    [result.id],
  );
  return {
    id: result.id,
    outcome: result.outcome,
    rule_set_version: result.rule_set_version,
    evaluated_at: result.evaluated_at.toISOString(),
    findings: findingsRes.rows.map((r) => ({
      rule_id: r.rule_id,
      field_name: r.field_name,
      failure_code: r.failure_code,
      message: r.message,
    })),
  };
}
