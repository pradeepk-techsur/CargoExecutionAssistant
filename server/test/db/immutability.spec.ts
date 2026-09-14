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
