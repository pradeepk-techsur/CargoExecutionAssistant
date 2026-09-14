import { randomBytes } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { withTransaction } from '../../src/db/tx.js';
import { append } from '../../src/services/audit/writer.js';

/**
 * The shared governed-case fixture every wave-6 database suite imports
 * (plans 01-08, 01-09, 01-10). It builds data the way the product does: through
 * `append`, inside ONE transaction, so the deferred coupling triggers are
 * genuinely satisfied rather than worked around.
 *
 * There is deliberately no step here that drops, disables, or bypasses a
 * trigger, no replication-role escape hatch, and no raw audit-table insert:
 * every audit row is written through append(). If createGovernedCase fails,
 * that is a real signal that an invariant is not satisfied, and the fix is to
 * satisfy it.
 */

export type GovernedCaseFinding = {
  rule_id: string;
  field_name: string;
  failure_code: string;
  message: string;
};

export type GovernedCase = {
  specialistId: string;
  caseId: string; // cargo_entries.id — the case anchor
  caseReference: string; // CE-YYYY-NNNNNN
  validationResultId: string;
  exceptionId: string;
  findings: GovernedCaseFinding[];
};

export type CreateGovernedCaseOptions = {
  /** Override the single populated finding (defaults to RIV-010 on goods_description). */
  findings?: GovernedCaseFinding[];
};

/** A pg.Pool bound to a test database's app-role URL. Caller must `.end()` it. */
export function poolFor(url: string): Pool {
  return new Pool({ connectionString: url });
}

/**
 * Insert a specialist and return its id. Emails are lower-case (to satisfy
 * specialists_email_lower_chk) and unique per call. password_hash is a
 * placeholder — phase 2 owns real hashing.
 */
export async function createSpecialist(
  tx: PoolClient,
  opts: { email?: string; display_name?: string } = {},
): Promise<string> {
  const email = (opts.email ?? `specialist-${randomBytes(6).toString('hex')}@example.gov`).toLowerCase();
  const displayName = opts.display_name ?? 'Test Specialist';
  const res = await tx.query<{ id: string }>(
    `INSERT INTO specialists (email, display_name, password_hash)
     VALUES ($1, $2, $3) RETURNING id`,
    [email, displayName, 'argon2id$placeholder'],
  );
  const row = res.rows[0];
  if (row === undefined) {
    throw new Error('createSpecialist: INSERT returned no id');
  }
  return row.id;
}

const DEFAULT_FINDINGS: GovernedCaseFinding[] = [
  {
    rule_id: 'RIV-010',
    field_name: 'goods_description',
    failure_code: 'MISSING_REQUIRED',
    message: 'Goods description is required for this mode of transport',
  },
];

/**
 * Build a full, fully-audited governed case in ONE transaction:
 *   seq 1  ENTRY_RECEIVED         (SPECIALIST)
 *   seq 2  VALIDATION_COMPLETED   (SYSTEM on behalf of the specialist)
 *   seq 3  EXCEPTION_OPENED       (SYSTEM on behalf of the specialist)
 * plus the cargo_entries row, its field origins, the validation_results/findings,
 * and the exceptions row — every state change coupled to its audit entry so the
 * deferred triggers pass at COMMIT.
 */
export async function createGovernedCase(
  pool: Pool,
  opts: CreateGovernedCaseOptions = {},
): Promise<GovernedCase> {
  const findings = opts.findings ?? DEFAULT_FINDINGS;
  if (findings.length < 1) {
    throw new Error('createGovernedCase: at least one finding is required (a FAIL result has findings_count > 0)');
  }

  return withTransaction(pool, async (tx) => {
    // 1. Specialist.
    const specialistId = await createSpecialist(tx);

    // 2. cargo_entries with a few populated fields + their HUMAN origins.
    const refRes = await tx.query<{ case_reference: string }>(
      `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS case_reference`,
    );
    const caseReference = refRes.rows[0]?.case_reference;
    if (caseReference === undefined) {
      throw new Error('createGovernedCase: failed to allocate a case_reference');
    }

    const populated: { field: string; value: string }[] = [
      { field: 'goods_description', value: 'Assorted machine parts' },
      { field: 'port_of_entry_code', value: 'USLAX' },
    ];

    const entryRes = await tx.query<{ id: string }>(
      `INSERT INTO cargo_entries
         (case_reference, created_by, receipt_outcome, goods_description, port_of_entry_code)
       VALUES ($1, $2, 'EXCEPTION_OPENED', $3, $4)
       RETURNING id`,
      [caseReference, specialistId, 'Assorted machine parts', 'USLAX'],
    );
    const caseId = entryRes.rows[0]?.id;
    if (caseId === undefined) {
      throw new Error('createGovernedCase: cargo_entries INSERT returned no id');
    }

    for (const { field } of populated) {
      await tx.query(
        `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
         VALUES ($1, $2, 'HUMAN')`,
        [caseId, field],
      );
    }

    // 3. ENTRY_RECEIVED — case_sequence 1.
    await append(tx, {
      case_id: caseId,
      action_type: 'ENTRY_RECEIVED',
      actor: { type: 'SPECIALIST', specialist_id: specialistId },
      before_state: null,
      after_state: 'RECEIVED',
      values: populated.map(({ field, value }) => ({
        field_name: field,
        before_value: null,
        before_origin: null,
        after_value: value,
        after_origin: 'HUMAN' as const,
      })),
    });

    // 4. validation_results (FAIL) + one finding per requested finding.
    const vrRes = await tx.query<{ id: string }>(
      `INSERT INTO validation_results
         (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
       VALUES ($1, 'FAIL', 'v1', 31, $2)
       RETURNING id`,
      [caseId, findings.length],
    );
    const validationResultId = vrRes.rows[0]?.id;
    if (validationResultId === undefined) {
      throw new Error('createGovernedCase: validation_results INSERT returned no id');
    }

    for (const f of findings) {
      await tx.query(
        `INSERT INTO validation_findings
           (validation_result_id, rule_id, field_name, failure_code, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [validationResultId, f.rule_id, f.field_name, f.failure_code, f.message],
      );
    }

    // 5. VALIDATION_COMPLETED — case_sequence 2.
    await append(tx, {
      case_id: caseId,
      action_type: 'VALIDATION_COMPLETED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: 'RECEIVED',
      after_state: 'EXCEPTION_OPENED',
      values: findings.map((f) => ({
        field_name: f.field_name,
        before_value: null,
        before_origin: null,
        after_value: f.rule_id,
        after_origin: 'HUMAN' as const,
      })),
    });

    // 6. exceptions referencing the failing validation result.
    const exRes = await tx.query<{ id: string }>(
      `INSERT INTO exceptions (entry_id, validation_result_id)
       VALUES ($1, $2) RETURNING id`,
      [caseId, validationResultId],
    );
    const exceptionId = exRes.rows[0]?.id;
    if (exceptionId === undefined) {
      throw new Error('createGovernedCase: exceptions INSERT returned no id');
    }

    // 7. EXCEPTION_OPENED — case_sequence 3.
    await append(tx, {
      case_id: caseId,
      exception_id: exceptionId,
      action_type: 'EXCEPTION_OPENED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: null,
      after_state: 'OPEN',
      values: findings.map((f) => ({
        field_name: f.field_name,
        before_value: null,
        before_origin: null,
        after_value: f.rule_id,
        after_origin: 'HUMAN' as const,
      })),
    });

    return {
      specialistId,
      caseId,
      caseReference,
      validationResultId,
      exceptionId,
      findings,
    };
  });
}

/**
 * Insert a PENDING recommendation for an exception and return its id. A PENDING
 * insert needs no audit entry (the coupling trigger returns early for PENDING).
 * Plans 01-09 and 01-10 need a recommendation to transition.
 */
export async function createPendingRecommendation(pool: Pool, exceptionId: string): Promise<string> {
  return withTransaction(pool, async (tx) => {
    const res = await tx.query<{ id: string }>(
      `INSERT INTO recommendations (exception_id, status) VALUES ($1, 'PENDING') RETURNING id`,
      [exceptionId],
    );
    const row = res.rows[0];
    if (row === undefined) {
      throw new Error('createPendingRecommendation: INSERT returned no id');
    }
    return row.id;
  });
}
