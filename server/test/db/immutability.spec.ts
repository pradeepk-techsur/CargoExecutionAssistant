import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import {
  createGovernedCase,
  createSpecialist,
  poolFor,
  type GovernedCase,
} from '../helpers/caseFixtures.js';
import { withTransaction } from '../../src/db/tx.js';
import { append } from '../../src/services/audit/writer.js';

// ─────────────────────────────────────────────────────────────────────────────
// Behavioural governance / immutability suite (RTM TEST-DB-01, 02, 03, 16, 17).
//
// This file proves the NEGATIVE: for every way history could be rewritten, the
// attempt is made and the database's refusal is asserted — including as
// `cargoexec_owner`, the case privilege revocation does not cover and the one
// phase success criterion 1 names explicitly. "We never call UPDATE" is not
// evidence; "UPDATE was attempted, the database rejected it as the schema owner,
// and the row is byte-identical afterwards" is. This is the SM-7 mechanism:
// 100% of mutation attempts rejected, including attempts made directly against
// the database.
//
// Suite conventions (see the plan's <suite_conventions>):
//  • One fresh database per file; teardown DROPs (TRUNCATE is impossible on the
//    audit tables — itself part of what this suite proves).
//  • Connect as all three roles: appUrl, aiUrl AND ownerUrl. Several assertions
//    are specifically about what the OWNER also cannot do; a suite testing only
//    the app role would pass against a completely unprotected audit store.
//  • Every refusal assertion checks the error text or SQLSTATE, never merely
//    that "something threw" — a `relation does not exist` would otherwise pass
//    as "refused". Trigger refusals: message contains AUDIT_IMMUTABLE, SQLSTATE
//    P0001. Privilege refusals: SQLSTATE 42501.
//  • No trigger is ever turned off, no replication-role escape hatch is used,
//    and no superuser connection is opened to make an assertion pass.
// ─────────────────────────────────────────────────────────────────────────────

const IMMUTABLE = 'AUDIT_IMMUTABLE';
const P0001 = 'P0001'; // raise_exception — the invariant triggers
const INSUFFICIENT_PRIVILEGE = '42501';

type PgError = { code?: string; message?: string };

function asPgError(err: unknown): PgError {
  expect(err, 'expected the statement to throw a Postgres error').toBeTruthy();
  return err as PgError;
}

/** Run a query and return the error it threw, failing the test if it did not throw. */
async function expectThrow(client: Pool | PoolClient, sql: string, params: unknown[] = []): Promise<PgError> {
  try {
    await client.query(sql, params);
  } catch (err) {
    return asPgError(err);
  }
  throw new Error(`expected SQL to be refused but it succeeded: ${sql}`);
}

/**
 * Assert a statement was refused BY THE TRIGGER — message contains
 * AUDIT_IMMUTABLE and SQLSTATE is P0001. Used for the owner cases, where the
 * trigger and not a privilege is the only thing that can refuse (FR-0.5).
 */
async function expectTriggerRefusal(
  client: Pool | PoolClient,
  sql: string,
  params: unknown[],
  layerNote: string,
): Promise<void> {
  const err = await expectThrow(client, sql, params);
  expect(err.code, `${layerNote} — expected SQLSTATE P0001 (trigger), got ${err.code}: ${err.message}`).toBe(P0001);
  expect(err.message, `${layerNote} — expected AUDIT_IMMUTABLE in the message`).toContain(IMMUTABLE);
}

/**
 * Assert a statement was refused by EITHER the privilege layer (42501) OR the
 * trigger (P0001 / AUDIT_IMMUTABLE) — accepting whichever the server evaluated
 * first. For cargoexec_app and cargoexec_ai on the audit tables both are
 * plausible depending on evaluation order; both are a genuine refusal.
 */
async function expectPrivilegeOrTriggerRefusal(
  client: Pool | PoolClient,
  sql: string,
  params: unknown[],
  layerNote: string,
): Promise<void> {
  const err = await expectThrow(client, sql, params);
  const refusedByPrivilege = err.code === INSUFFICIENT_PRIVILEGE;
  const refusedByTrigger = err.code === P0001 && (err.message ?? '').includes(IMMUTABLE);
  expect(
    refusedByPrivilege || refusedByTrigger,
    `${layerNote} — expected refusal by privilege (42501) or trigger (P0001/AUDIT_IMMUTABLE), got ${err.code}: ${err.message}`,
  ).toBe(true);
}

/** A full byte-level snapshot of a case's audit rows, for before/after comparison. */
type AuditSnapshot = {
  entries: Record<string, unknown>[];
  values: Record<string, unknown>[];
};

async function snapshotAudit(reader: Pool, caseId: string): Promise<AuditSnapshot> {
  const entries = await reader.query(
    `SELECT id, case_id, case_sequence, action_type, actor_type, actor_specialist_id,
            occurred_at, exception_id, recommendation_id, decision_id,
            before_state, after_state, reason, request_id,
            encode(prev_entry_hash, 'hex') AS prev_entry_hash,
            encode(entry_hash, 'hex') AS entry_hash
       FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence`,
    [caseId],
  );
  const values = await reader.query(
    `SELECT v.audit_entry_id, v.field_name, v.before_value, v.before_origin,
            v.after_value, v.after_origin, v.changed
       FROM audit_entry_values v
       JOIN audit_entries e ON e.id = v.audit_entry_id
      WHERE e.case_id = $1
      ORDER BY e.case_sequence, v.field_name`,
    [caseId],
  );
  return { entries: entries.rows, values: values.rows };
}

async function verifyChain(reader: Pool, caseId: string): Promise<{ chain_verified: boolean; entry_count: number }> {
  const res = await reader.query<{ chain_verified: boolean; entry_count: number }>(
    'SELECT chain_verified, entry_count FROM verify_audit_chain($1)',
    [caseId],
  );
  const row = res.rows[0]!;
  return { chain_verified: row.chain_verified, entry_count: Number(row.entry_count) };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('immutability: the audit store refuses mutation for every role', () => {
  let db: TestDatabase;
  // One pool per role. All three are exercised — a suite that only used appPool
  // would pass against a completely unprotected audit store.
  let ownerPool: Pool;
  let appPool: Pool;
  let aiPool: Pool;
  let gc: GovernedCase;
  let entrySeq1Id: string; // a real audit_entries.id to target with WHERE
  let firstValueEntryId: string; // an audit_entry_id that has value rows
  let before: AuditSnapshot; // the pre-attempt snapshot every block compares against

  beforeAll(async () => {
    db = await createTestDatabase();
    ownerPool = poolFor(db.ownerUrl);
    appPool = poolFor(db.appUrl);
    aiPool = poolFor(db.aiUrl);

    // Build one real three-entry governed case (through append, in one
    // transaction) so there are genuine audit rows and value rows to attack.
    gc = await createGovernedCase(appPool);

    const seq1 = await appPool.query<{ id: string }>(
      'SELECT id FROM audit_entries WHERE case_id = $1 AND case_sequence = 1',
      [gc.caseId],
    );
    entrySeq1Id = seq1.rows[0]!.id;

    const withValues = await appPool.query<{ audit_entry_id: string }>(
      `SELECT audit_entry_id FROM audit_entry_values v
         JOIN audit_entries e ON e.id = v.audit_entry_id
        WHERE e.case_id = $1 ORDER BY e.case_sequence LIMIT 1`,
      [gc.caseId],
    );
    firstValueEntryId = withValues.rows[0]!.audit_entry_id;

    // The before-snapshot: every audit and value row for the case, hashes as hex.
    before = await snapshotAudit(appPool, gc.caseId);
    expect(before.entries).toHaveLength(3);
    expect(before.values.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await Promise.all([ownerPool.end(), appPool.end(), aiPool.end()]);
    await dropTestDatabase(db);
  });

  // Roles paired with the layer we require for each. The owner MUST be refused
  // by the trigger (it holds no privilege that could stop it); app and ai may be
  // refused by either layer.
  const nonOwnerRoles = (): { name: string; pool: Pool }[] => [
    { name: 'cargoexec_app', pool: appPool },
    { name: 'cargoexec_ai', pool: aiPool },
  ];

  describe('TEST-DB-01: UPDATE refused for app, ai and owner', () => {
    it('UPDATE audit_entries (no WHERE) is refused for every role — the statement trigger fires before row selection', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `UPDATE audit_entries SET action_type = 'X'`,
          [],
          `${name}: unqualified UPDATE audit_entries`,
        );
      }
      // Owner: only the statement-level trigger can stop this — assert P0001.
      await expectTriggerRefusal(
        ownerPool,
        `UPDATE audit_entries SET action_type = 'X'`,
        [],
        'cargoexec_owner: unqualified UPDATE audit_entries',
      );
    });

    it('UPDATE audit_entries ... WHERE id targets a real entry — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `UPDATE audit_entries SET action_type = 'RECOMMENDATION_APPROVED' WHERE id = $1`,
          [entrySeq1Id],
          `${name}: UPDATE audit_entries WHERE id`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `UPDATE audit_entries SET action_type = 'RECOMMENDATION_APPROVED' WHERE id = $1`,
        [entrySeq1Id],
        'cargoexec_owner: UPDATE audit_entries WHERE id',
      );
    });

    it('UPDATE audit_entries ... WHERE case_id (reason rewrite) — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `UPDATE audit_entries SET reason = 'rewritten' WHERE case_id = $1`,
          [gc.caseId],
          `${name}: UPDATE audit_entries reason`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `UPDATE audit_entries SET reason = 'rewritten' WHERE case_id = $1`,
        [gc.caseId],
        'cargoexec_owner: UPDATE audit_entries reason',
      );
    });

    it('UPDATE audit_entry_values ... WHERE audit_entry_id — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `UPDATE audit_entry_values SET after_value = 'rewritten' WHERE audit_entry_id = $1`,
          [firstValueEntryId],
          `${name}: UPDATE audit_entry_values`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `UPDATE audit_entry_values SET after_value = 'rewritten' WHERE audit_entry_id = $1`,
        [firstValueEntryId],
        'cargoexec_owner: UPDATE audit_entry_values',
      );
    });

    it('UPDATE audit_entries ... WHERE false — zero matching rows and STILL refused (statement trigger, not a row trigger)', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `UPDATE audit_entries SET action_type = 'X' WHERE false`,
          [],
          `${name}: UPDATE audit_entries WHERE false`,
        );
      }
      // This is the crux of statement-vs-row: with zero rows selected a pure row
      // trigger would never fire, so the owner refusal here proves the
      // statement-level trigger did the refusing.
      await expectTriggerRefusal(
        ownerPool,
        `UPDATE audit_entries SET action_type = 'X' WHERE false`,
        [],
        'cargoexec_owner: UPDATE audit_entries WHERE false (statement trigger)',
      );
    });

    it('after every attempt the audit rows are byte-identical to the pre-attempt snapshot', async () => {
      const after = await snapshotAudit(appPool, gc.caseId);
      expect(after).toEqual(before);
      const chain = await verifyChain(appPool, gc.caseId);
      expect(chain.chain_verified).toBe(true);
      expect(chain.entry_count).toBe(3);
    });
  });

  describe('TEST-DB-02: DELETE and TRUNCATE refused for all three roles', () => {
    it('DELETE FROM audit_entry_values (unqualified) — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `DELETE FROM audit_entry_values`,
          [],
          `${name}: unqualified DELETE audit_entry_values`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `DELETE FROM audit_entry_values`,
        [],
        'cargoexec_owner: unqualified DELETE audit_entry_values',
      );
    });

    it('DELETE FROM audit_entry_values WHERE audit_entry_id — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `DELETE FROM audit_entry_values WHERE audit_entry_id = $1`,
          [firstValueEntryId],
          `${name}: DELETE audit_entry_values WHERE`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `DELETE FROM audit_entry_values WHERE audit_entry_id = $1`,
        [firstValueEntryId],
        'cargoexec_owner: DELETE audit_entry_values WHERE',
      );
    });

    it('DELETE FROM audit_entries WHERE case_id — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `DELETE FROM audit_entries WHERE case_id = $1`,
          [gc.caseId],
          `${name}: DELETE audit_entries WHERE`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `DELETE FROM audit_entries WHERE case_id = $1`,
        [gc.caseId],
        'cargoexec_owner: DELETE audit_entries WHERE',
      );
    });

    it('TRUNCATE audit_entries — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(pool, `TRUNCATE audit_entries`, [], `${name}: TRUNCATE audit_entries`);
      }
      // A lone TRUNCATE of audit_entries is refused, but by Postgres's FK-reference
      // guard (SQLSTATE 0A000: "cannot truncate a table referenced in a foreign
      // key constraint") because audit_entry_values references it and is not
      // included — that check precedes the TRUNCATE statement trigger. The refusal
      // is real (the table is NOT emptied); it is simply a different layer. The
      // trigger's own AUDIT_IMMUTABLE refusal of TRUNCATE is proved unambiguously
      // by the two cases below: audit_entry_values alone (nothing references it, so
      // only the trigger can stop it) and the CASCADE form covering both tables.
      const err = await expectThrow(ownerPool, `TRUNCATE audit_entries`, []);
      const refusedByTrigger = err.code === P0001 && (err.message ?? '').includes(IMMUTABLE);
      const refusedByFkGuard = err.code === '0A000';
      expect(
        refusedByTrigger || refusedByFkGuard,
        `cargoexec_owner: TRUNCATE audit_entries — expected AUDIT_IMMUTABLE (P0001) or the FK-reference guard (0A000), got ${err.code}: ${err.message}`,
      ).toBe(true);
    });

    it('TRUNCATE audit_entry_values — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `TRUNCATE audit_entry_values`,
          [],
          `${name}: TRUNCATE audit_entry_values`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `TRUNCATE audit_entry_values`,
        [],
        'cargoexec_owner: TRUNCATE audit_entry_values',
      );
    });

    it('TRUNCATE audit_entries, audit_entry_values CASCADE — refused for every role', async () => {
      for (const { name, pool } of nonOwnerRoles()) {
        await expectPrivilegeOrTriggerRefusal(
          pool,
          `TRUNCATE audit_entries, audit_entry_values CASCADE`,
          [],
          `${name}: TRUNCATE both CASCADE`,
        );
      }
      await expectTriggerRefusal(
        ownerPool,
        `TRUNCATE audit_entries, audit_entry_values CASCADE`,
        [],
        'cargoexec_owner: TRUNCATE both CASCADE',
      );
    });

    it('after every DELETE/TRUNCATE attempt the audit rows are byte-identical and the chain is intact', async () => {
      const after = await snapshotAudit(appPool, gc.caseId);
      expect(after).toEqual(before);
      const chain = await verifyChain(appPool, gc.caseId);
      expect(chain.chain_verified).toBe(true);
      expect(chain.entry_count).toBe(3);
    });
  });

  describe('TEST-DB-03: INSERT ... ON CONFLICT DO UPDATE refused; DO NOTHING allowed', () => {
    it('INSERT ... ON CONFLICT (case_id, case_sequence) DO UPDATE on audit_entries fires the BEFORE UPDATE row trigger — refused as owner', async () => {
      // As the owner so a privilege is not the reason. The DO UPDATE branch is a
      // real UPDATE and must fire the row trigger.
      const genesisHash = Buffer.alloc(32); // any 32 bytes; the trigger refuses before the chain check matters
      const anyHash = Buffer.from('11'.repeat(32), 'hex');
      const err = await expectThrow(
        ownerPool,
        `INSERT INTO audit_entries (id, case_id, case_sequence, action_type, actor_type,
            actor_specialist_id, after_state, prev_entry_hash, entry_hash)
         VALUES (gen_random_uuid(), $1, 1, 'ENTRY_RECEIVED', 'SPECIALIST', $2, 'RECEIVED', $3, $4)
         ON CONFLICT (case_id, case_sequence) DO UPDATE SET action_type = 'X'`,
        [gc.caseId, gc.specialistId, genesisHash, anyHash],
      );
      expect(err.code, `ON CONFLICT DO UPDATE audit_entries — expected P0001, got ${err.code}: ${err.message}`).toBe(
        P0001,
      );
      expect(err.message).toContain(IMMUTABLE);
    });

    it('INSERT ... ON CONFLICT (audit_entry_id, field_name) DO UPDATE on audit_entry_values is refused as owner', async () => {
      // Target an existing (audit_entry_id, field_name). Read one real pair first.
      const existing = await ownerPool.query<{ audit_entry_id: string; field_name: string }>(
        `SELECT audit_entry_id, field_name FROM audit_entry_values LIMIT 1`,
      );
      const row = existing.rows[0]!;
      const err = await expectThrow(
        ownerPool,
        `INSERT INTO audit_entry_values
            (audit_entry_id, field_name, before_value, before_origin, after_value, after_origin, changed)
         VALUES ($1, $2, NULL, NULL, 'x', 'HUMAN', true)
         ON CONFLICT (audit_entry_id, field_name) DO UPDATE SET after_value = 'rewritten'`,
        [row.audit_entry_id, row.field_name],
      );
      expect(
        err.code,
        `ON CONFLICT DO UPDATE audit_entry_values — expected P0001, got ${err.code}: ${err.message}`,
      ).toBe(P0001);
      expect(err.message).toContain(IMMUTABLE);
    });

    it('INSERT ... ON CONFLICT DO NOTHING on a conflicting row is ALLOWED (no update performed) — distinguishes "upsert blocked" from "insert broken"', async () => {
      // A conflicting insert with DO NOTHING performs no update, so the update
      // trigger never fires: it must succeed (affecting zero rows). This guards
      // against a future change that accidentally blocks legitimate inserts.
      const existing = await ownerPool.query<{ audit_entry_id: string; field_name: string }>(
        `SELECT audit_entry_id, field_name FROM audit_entry_values LIMIT 1`,
      );
      const row = existing.rows[0]!;
      const res = await ownerPool.query(
        `INSERT INTO audit_entry_values
            (audit_entry_id, field_name, before_value, before_origin, after_value, after_origin, changed)
         VALUES ($1, $2, NULL, NULL, 'x', 'HUMAN', true)
         ON CONFLICT (audit_entry_id, field_name) DO NOTHING`,
        [row.audit_entry_id, row.field_name],
      );
      expect(res.rowCount).toBe(0); // conflicted, nothing written, nothing refused
    });

    it('after the upsert attempts the audit rows are byte-identical and the chain is intact', async () => {
      const after = await snapshotAudit(appPool, gc.caseId);
      expect(after).toEqual(before);
      const chain = await verifyChain(appPool, gc.caseId);
      expect(chain.chain_verified).toBe(true);
      expect(chain.entry_count).toBe(3);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-DB-16 and TEST-DB-17 — the entry of record (D-3) and the AI privilege
// wall (A-1). A second fresh database, so the tricky-valued entry below is
// isolated from the mutation suite above.
//
// NOTE on the refusal layer for the entry of record (deviation from the plan's
// literal wording, user-approved during execution):
//   The plan asserted `UPDATE cargo_entries` is refused for cargoexec_app with
//   SQLSTATE 42501. That is NO LONGER the DB's behaviour. Migration 0011
//   (0011_case_anchor_lock_privilege.sql, the user-approved decision recorded in
//   STATE.md during plan 01-06) GRANTS UPDATE on cargo_entries to cargoexec_app,
//   because Postgres only grants the `SELECT ... FOR UPDATE` case-anchor row lock
//   the audit writer depends on (FR-0.6, FR-13.5) to a role holding table UPDATE.
//   A raw `UPDATE cargo_entries` therefore SUCCEEDS at the database.
//   Entry-of-record immutability is consequently an APPLICATION-LEVEL guarantee
//   (F0 FR-0.1: "no service method, endpoint, or UI affordance updates a cargo
//   entry after receipt") — there is no `UPDATE cargo_entries` statement anywhere
//   in server/src. This block therefore proves D-3 by the three things that ARE
//   still true at the persistence layer — DELETE cargo_entries is refused,
//   UPDATE/DELETE on cargo_entry_field_origins is refused, and the stored entry
//   reads back byte-identical — plus a direct source-level assertion that no
//   UPDATE statement against cargo_entries exists (the same guarantee 01-07
//   asserts, restated here so this behavioural suite is self-contained).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a governed case with a caller-chosen goods_description, mirroring
 * createGovernedCase but through the same exported primitives (createSpecialist,
 * withTransaction, append) so the tricky whitespace/case value is the stored
 * entry of record. No trigger is bypassed: the ENTRY_RECEIVED entry is written
 * through append inside the one transaction, exactly as the product does.
 */
async function createCaseWithGoodsDescription(
  pool: Pool,
  goodsDescription: string,
): Promise<{ caseId: string; exceptionId: string; specialistId: string; validationResultId: string }> {
  return withTransaction(pool, async (tx) => {
    const specialistId = await createSpecialist(tx);
    const refRes = await tx.query<{ case_reference: string }>(
      `SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS case_reference`,
    );
    const caseReference = refRes.rows[0]!.case_reference;

    const entryRes = await tx.query<{ id: string }>(
      `INSERT INTO cargo_entries
         (case_reference, created_by, receipt_outcome, goods_description, port_of_entry_code)
       VALUES ($1, $2, 'EXCEPTION_OPENED', $3, 'USLAX')
       RETURNING id`,
      [caseReference, specialistId, goodsDescription],
    );
    const caseId = entryRes.rows[0]!.id;

    await tx.query(
      `INSERT INTO cargo_entry_field_origins (entry_id, field_name, origin)
       VALUES ($1, 'goods_description', 'HUMAN'), ($1, 'port_of_entry_code', 'HUMAN')`,
      [caseId],
    );

    await append(tx, {
      case_id: caseId,
      action_type: 'ENTRY_RECEIVED',
      actor: { type: 'SPECIALIST', specialist_id: specialistId },
      before_state: null,
      after_state: 'RECEIVED',
      values: [
        {
          field_name: 'goods_description',
          before_value: null,
          before_origin: null,
          after_value: goodsDescription,
          after_origin: 'HUMAN',
        },
      ],
    });

    const vrRes = await tx.query<{ id: string }>(
      `INSERT INTO validation_results (entry_id, outcome, rule_set_version, rules_evaluated_count, findings_count)
       VALUES ($1, 'FAIL', 'v1', 31, 1) RETURNING id`,
      [caseId],
    );
    const validationResultId = vrRes.rows[0]!.id;
    await tx.query(
      `INSERT INTO validation_findings (validation_result_id, rule_id, field_name, failure_code, message)
       VALUES ($1, 'RIV-010', 'goods_description', 'MISSING_REQUIRED', 'required')`,
      [validationResultId],
    );

    await append(tx, {
      case_id: caseId,
      action_type: 'VALIDATION_COMPLETED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: 'RECEIVED',
      after_state: 'EXCEPTION_OPENED',
      values: [
        {
          field_name: 'goods_description',
          before_value: null,
          before_origin: null,
          after_value: 'RIV-010',
          after_origin: 'HUMAN',
        },
      ],
    });

    const exRes = await tx.query<{ id: string }>(
      `INSERT INTO exceptions (entry_id, validation_result_id) VALUES ($1, $2) RETURNING id`,
      [caseId, validationResultId],
    );
    const exceptionId = exRes.rows[0]!.id;

    await append(tx, {
      case_id: caseId,
      exception_id: exceptionId,
      action_type: 'EXCEPTION_OPENED',
      actor: { type: 'SYSTEM', on_behalf_of_specialist_id: specialistId },
      before_state: null,
      after_state: 'OPEN',
      values: [
        {
          field_name: 'goods_description',
          before_value: null,
          before_origin: null,
          after_value: 'RIV-010',
          after_origin: 'HUMAN',
        },
      ],
    });

    return { caseId, exceptionId, specialistId, validationResultId };
  });
}

describe('immutability: the entry of record and the AI privilege wall', () => {
  let db: TestDatabase;
  let ownerPool: Pool;
  let appPool: Pool;
  let aiPool: Pool;

  // A goods_description with TWO consecutive internal spaces and mixed case, so
  // "reads back byte-identical" is a real claim about whitespace and case (US-0.3).
  const TRICKY_GOODS = 'Assorted  Machine   PARTS';

  let caseId: string;
  let exceptionId: string;
  let specialistId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    ownerPool = poolFor(db.ownerUrl);
    appPool = poolFor(db.appUrl);
    aiPool = poolFor(db.aiUrl);
    const c = await createCaseWithGoodsDescription(appPool, TRICKY_GOODS);
    caseId = c.caseId;
    exceptionId = c.exceptionId;
    specialistId = c.specialistId;
  });

  afterAll(async () => {
    await Promise.all([ownerPool.end(), appPool.end(), aiPool.end()]);
    await dropTestDatabase(db);
  });

  describe('TEST-DB-16: cargoexec_app cannot destroy or corrupt the entry of record (D-3)', () => {
    it('DELETE FROM cargo_entries is refused with 42501 — the app holds no DELETE on any table', async () => {
      const err = await expectThrow(appPool, `DELETE FROM cargo_entries WHERE id = $1`, [caseId]);
      expect(err.code, `DELETE cargo_entries — expected 42501, got ${err.code}: ${err.message}`).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });

    it('UPDATE cargo_entry_field_origins is refused with 42501 — provenance is append-only for the app', async () => {
      const err = await expectThrow(
        appPool,
        `UPDATE cargo_entry_field_origins SET origin = 'AI' WHERE entry_id = $1`,
        [caseId],
      );
      expect(err.code, `UPDATE cefo — expected 42501, got ${err.code}: ${err.message}`).toBe(INSUFFICIENT_PRIVILEGE);
    });

    it('DELETE FROM cargo_entry_field_origins is refused with 42501', async () => {
      const err = await expectThrow(
        appPool,
        `DELETE FROM cargo_entry_field_origins WHERE entry_id = $1`,
        [caseId],
      );
      expect(err.code, `DELETE cefo — expected 42501, got ${err.code}: ${err.message}`).toBe(INSUFFICIENT_PRIVILEGE);
    });

    it('the entry-of-record immutability guarantee is source-level: no UPDATE cargo_entries statement exists in server/src (F0 FR-0.1)', async () => {
      // The DB grants cargoexec_app UPDATE on cargo_entries (migration 0011) so
      // the audit writer can take the FOR UPDATE anchor lock; a raw UPDATE would
      // therefore succeed. The guarantee that no correction ever overwrites the
      // entry of record is upheld by the ABSENCE of any `UPDATE cargo_entries`
      // statement in the source. Assert that absence directly here, so this
      // behavioural suite carries the guarantee it depends on rather than
      // assuming it (01-07 asserts the same in the architecture suite).
      const { readdir, readFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const srcRoot = new URL('../../src/', import.meta.url).pathname;

      async function walk(dir: string): Promise<string[]> {
        const entries = await readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory()) files.push(...(await walk(full)));
          else if (e.name.endsWith('.ts')) files.push(full);
        }
        return files;
      }

      const updateRe = /update\s+cargo_entries/i;
      const offenders: string[] = [];
      for (const file of await walk(srcRoot)) {
        const text = await readFile(file, 'utf8');
        if (updateRe.test(text)) offenders.push(file);
      }
      expect(
        offenders,
        `an UPDATE against cargo_entries appears in: ${offenders.join(', ')}. ` +
          'The entry of record is immutable (F0 FR-0.1); corrections live on decision_values.',
      ).toEqual([]);
    });

    it('the stored entry reads back byte-identical, preserving internal double-spaces and mixed case (US-0.3)', async () => {
      const res = await appPool.query<{ goods_description: string }>(
        `SELECT goods_description FROM cargo_entries WHERE id = $1`,
        [caseId],
      );
      expect(res.rows[0]!.goods_description).toBe(TRICKY_GOODS);
      // Belt and braces: explicitly the two runs of internal spaces survived.
      expect(res.rows[0]!.goods_description).toContain('Assorted  Machine');
      expect(res.rows[0]!.goods_description).toContain('Machine   PARTS');
    });

    it('the field origins read back unchanged and remain HUMAN', async () => {
      const res = await appPool.query<{ field_name: string; origin: string }>(
        `SELECT field_name, origin FROM cargo_entry_field_origins WHERE entry_id = $1 ORDER BY field_name`,
        [caseId],
      );
      for (const row of res.rows) {
        expect(row.origin).toBe('HUMAN');
      }
      expect(res.rows.map((r) => r.field_name)).toContain('goods_description');
    });

    it('positive capability: cargoexec_app CAN SELECT cargo_entries and CAN INSERT a new entry (with its ENTRY_RECEIVED entry) — a correctly restricted role, not a locked-out one', async () => {
      const sel = await appPool.query(`SELECT id FROM cargo_entries WHERE id = $1`, [caseId]);
      expect(sel.rowCount).toBe(1);

      // A full, audited insert of a NEW entry succeeds — INSERT is granted.
      const created = await createGovernedCase(appPool);
      const check = await appPool.query(`SELECT id FROM cargo_entries WHERE id = $1`, [created.caseId]);
      expect(check.rowCount).toBe(1);
    });
  });

  describe('TEST-DB-17: cargoexec_ai is structurally incapable of resolving a case (A-1)', () => {
    it('INSERT INTO decisions is refused with 42501 — the worker cannot record a resolution', async () => {
      const err = await expectThrow(
        aiPool,
        `INSERT INTO decisions (exception_id, decision_type, decided_by, resulting_state, recommendation_id)
         VALUES ($1, 'APPROVE', $2, 'RESOLVED', NULL)`,
        [exceptionId, specialistId],
      );
      expect(err.code, `ai INSERT decisions — expected 42501, got ${err.code}: ${err.message}`).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });

    it('INSERT INTO decision_values is refused with 42501', async () => {
      const err = await expectThrow(
        aiPool,
        `INSERT INTO decision_values (decision_id, field_name, value, origin, changed_from_proposal)
         VALUES (gen_random_uuid(), 'goods_description', 'x', 'AI', false)`,
        [],
      );
      expect(err.code, `ai INSERT decision_values — expected 42501, got ${err.code}: ${err.message}`).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });

    it('SELECT * FROM decisions is refused with 42501 — no privilege of any kind, even reading', async () => {
      const err = await expectThrow(aiPool, `SELECT * FROM decisions`, []);
      expect(err.code, `ai SELECT decisions — expected 42501, got ${err.code}: ${err.message}`).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });

    it('SELECT FROM specialists and sessions is refused with 42501 — the worker cannot read a human identity', async () => {
      const spErr = await expectThrow(aiPool, `SELECT * FROM specialists`, []);
      expect(spErr.code, `ai SELECT specialists — expected 42501, got ${spErr.code}`).toBe(INSUFFICIENT_PRIVILEGE);
      const seErr = await expectThrow(aiPool, `SELECT * FROM sessions`, []);
      expect(seErr.code, `ai SELECT sessions — expected 42501, got ${seErr.code}`).toBe(INSUFFICIENT_PRIVILEGE);
    });

    it('UPDATE exceptions is refused with 42501 — the worker cannot change an exception state', async () => {
      const err = await expectThrow(aiPool, `UPDATE exceptions SET state = 'RESOLVED' WHERE id = $1`, [exceptionId]);
      expect(err.code, `ai UPDATE exceptions — expected 42501, got ${err.code}: ${err.message}`).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });

    it('DELETE FROM exceptions is refused with 42501', async () => {
      const err = await expectThrow(aiPool, `DELETE FROM exceptions WHERE id = $1`, [exceptionId]);
      expect(err.code, `ai DELETE exceptions — expected 42501, got ${err.code}: ${err.message}`).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });

    it('positive capability: cargoexec_ai CAN SELECT the tables it reasons over (a narrow role, not a broken one)', async () => {
      for (const table of [
        'cargo_entries',
        'validation_results',
        'validation_findings',
        'exceptions',
        'recommendations',
        'recommendation_values',
      ]) {
        // Refusal would throw; a successful SELECT proves the read is granted.
        await aiPool.query(`SELECT * FROM ${table} LIMIT 1`);
      }
    });

    it('positive capability: cargoexec_ai CAN INSERT a PENDING recommendation and its recommendation_values — the worker\'s real write path is PROPOSALS, never resolutions', async () => {
      // The exception from beforeAll has no recommendation yet. The worker's
      // legitimate output is a proposal: a PENDING recommendation plus the
      // proposed values it justifies by rule. Both are granted (INSERT on
      // recommendations and recommendation_values), so the role is narrow, not
      // broken.
      const rec = await aiPool.query<{ id: string }>(
        `INSERT INTO recommendations (exception_id, status) VALUES ($1, 'PENDING') RETURNING id`,
        [exceptionId],
      );
      expect(rec.rowCount).toBe(1);
      const recId = rec.rows[0]!.id;

      const rv = await aiPool.query(
        `INSERT INTO recommendation_values (recommendation_id, field_name, proposed_value, addresses_rule_ids)
         VALUES ($1, 'goods_description', 'Proposed corrected description', '{RIV-010}')`,
        [recId],
      );
      expect(rv.rowCount).toBe(1);
    });

    it('the AI worker cannot even take the audit case-anchor lock — append() is unreachable to it, which is A-1 working, not a defect', async () => {
      // DEVIATION FROM PLAN (user-approved): the plan claimed cargoexec_ai could
      // write a RECOMMENDATION_UNAVAILABLE entry through append(). It cannot, and
      // that is correct. append() unconditionally takes the case-anchor lock
      //   SELECT id FROM cargo_entries WHERE id = $1 FOR UPDATE
      // (F13 FR-13.5), and Postgres grants a FOR UPDATE row lock only to a role
      // holding the table's UPDATE privilege. Migration 0011 deliberately does
      // NOT grant cargoexec_ai UPDATE on cargo_entries (A-1), so the lock — and
      // therefore append() itself — is refused with 42501 for the AI role. In the
      // product a recommendation-status audit entry is written on a path that
      // already holds the anchor (the request path), never by the worker's own
      // pool. Assert the refusal so this coupling is pinned: if a future change
      // grants the AI role UPDATE on cargo_entries, this test fails and forces the
      // author to confront that they have handed the worker the entry of record.
      const err = await expectThrow(
        aiPool,
        `SELECT id FROM cargo_entries WHERE id = $1 FOR UPDATE`,
        [exceptionId],
      );
      expect(
        err.code,
        `ai FOR UPDATE cargo_entries — expected 42501 (no UPDATE privilege → no anchor lock → no append), got ${err.code}: ${err.message}`,
      ).toBe(INSUFFICIENT_PRIVILEGE);
    });

    it('after every refused attempt the exception is still OPEN with no decision — three independent walls, the first proved behaviourally', async () => {
      const res = await appPool.query<{ state: string; closed_at: Date | null; decision_id: string | null }>(
        `SELECT state, closed_at, decision_id FROM exceptions WHERE id = $1`,
        [exceptionId],
      );
      const row = res.rows[0]!;
      expect(row.state).toBe('OPEN');
      expect(row.closed_at).toBeNull();
      expect(row.decision_id).toBeNull();

      const decisions = await appPool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM decisions WHERE exception_id = $1`,
        [exceptionId],
      );
      expect(decisions.rows[0]!.n).toBe(0);
    });
  });
});
