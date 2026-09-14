import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '../helpers/testdb.js';
import {
  createGovernedCase,
  poolFor,
  type GovernedCase,
} from '../helpers/caseFixtures.js';
import { withTransaction } from '../../src/db/tx.js';
import { append, AuditWriteError } from '../../src/services/audit/writer.js';

// Writer integration coverage (F13) against a real Postgres. The database is
// created and migrated in beforeAll and DROPped in afterAll (the audit tables
// cannot be truncated — §8.2), so every assertion runs against the real
// triggers, privileges and constraints.

describe('audit writer (append) integration', () => {
  let db: TestDatabase;
  let pool: Pool;

  beforeAll(async () => {
    db = await createTestDatabase();
    pool = poolFor(db.appUrl);
  });

  afterAll(async () => {
    await pool.end();
    await dropTestDatabase(db);
  });

  it('1. createGovernedCase produces exactly three entries with sequences 1,2,3 and no gap', async () => {
    const gc = await createGovernedCase(pool);
    const res = await pool.query<{ case_sequence: number }>(
      'SELECT case_sequence FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence',
      [gc.caseId],
    );
    expect(res.rows.map((r) => Number(r.case_sequence))).toEqual([1, 2, 3]);
  });

  it('2. the hash chain links: entry 1 prev is 32 zero bytes, entry n prev = entry n-1 hash, all 32 bytes, distinct', async () => {
    const gc = await createGovernedCase(pool);
    const res = await pool.query<{ case_sequence: number; prev_entry_hash: Buffer; entry_hash: Buffer }>(
      'SELECT case_sequence, prev_entry_hash, entry_hash FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence',
      [gc.caseId],
    );
    const rows = res.rows;
    expect(rows).toHaveLength(3);

    const first = rows[0]!;
    expect(first.prev_entry_hash.equals(Buffer.alloc(32))).toBe(true);

    for (const r of rows) {
      expect(r.prev_entry_hash.length).toBe(32);
      expect(r.entry_hash.length).toBe(32);
    }
    expect(rows[1]!.prev_entry_hash.equals(rows[0]!.entry_hash)).toBe(true);
    expect(rows[2]!.prev_entry_hash.equals(rows[1]!.entry_hash)).toBe(true);

    const hashes = rows.map((r) => r.entry_hash.toString('hex'));
    expect(new Set(hashes).size).toBe(3);
  });

  it('3. verify_audit_chain confirms the chain', async () => {
    const gc = await createGovernedCase(pool);
    const res = await pool.query<{
      chain_verified: boolean;
      first_divergence_sequence: number | null;
      entry_count: number;
    }>('SELECT * FROM verify_audit_chain($1)', [gc.caseId]);
    const row = res.rows[0]!;
    expect(row.chain_verified).toBe(true);
    expect(row.first_divergence_sequence).toBeNull();
    expect(Number(row.entry_count)).toBe(3);
  });

  it('4. occurred_at lies within the transaction wall-clock window, and append has no occurred_at parameter', async () => {
    const before = new Date();
    const gc = await createGovernedCase(pool);
    const after = new Date();

    const res = await pool.query<{ occurred_at: Date }>(
      'SELECT occurred_at FROM audit_entries WHERE case_id = $1 ORDER BY case_sequence',
      [gc.caseId],
    );
    for (const r of res.rows) {
      const t = r.occurred_at.getTime();
      // A small tolerance absorbs clock granularity between the JS clock and the
      // database's now(); the point is that occurred_at is the DB's time, near now.
      expect(t).toBeGreaterThanOrEqual(before.getTime() - 2000);
      expect(t).toBeLessThanOrEqual(after.getTime() + 2000);
    }

    // occurred_at is not part of AuditAppendInput — passing one is a type error.
    await withTransaction(pool, async (tx) => {
      await append(tx, {
        case_id: gc.caseId,
        action_type: 'RECOMMENDATION_APPROVED',
        actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
        before_state: 'OPEN',
        after_state: 'RESOLVED',
        // @ts-expect-error occurred_at is the database's now(), never a caller parameter (FR-13.8)
        occurred_at: new Date(),
      });
      // Roll this probe back so it does not leave a stray fourth entry.
      throw new Error('rollback the occurred_at type probe');
    }).catch((err: unknown) => {
      // The forced rollback OR a validation error is fine; we only care that the
      // @ts-expect-error above held at compile time.
      expect(err).toBeInstanceOf(Error);
    });
  });

  it('5. actor pairing violations throw AUDIT_WRITE_INVALID before any row is written', async () => {
    const gc = await createGovernedCase(pool);

    // AI actor carrying a specialist_id.
    await expect(
      withTransaction(pool, async (tx) => {
        await append(tx, {
          case_id: gc.caseId,
          action_type: 'RECOMMENDATION_GENERATED',
          // @ts-expect-error deliberately malformed actor for the runtime check
          actor: { type: 'AI', specialist_id: gc.specialistId },
          before_state: 'OPEN',
          after_state: 'OPEN',
        });
      }),
    ).rejects.toMatchObject({ code: 'AUDIT_WRITE_INVALID' });

    // SPECIALIST actor without a specialist_id.
    await expect(
      withTransaction(pool, async (tx) => {
        await append(tx, {
          case_id: gc.caseId,
          action_type: 'RECOMMENDATION_APPROVED',
          // @ts-expect-error deliberately malformed actor for the runtime check
          actor: { type: 'SPECIALIST' },
          before_state: 'OPEN',
          after_state: 'RESOLVED',
        });
      }),
    ).rejects.toMatchObject({ code: 'AUDIT_WRITE_INVALID' });

    // No fourth entry was written by either failed attempt.
    const res = await pool.query('SELECT count(*)::int AS n FROM audit_entries WHERE case_id = $1', [gc.caseId]);
    expect(res.rows[0].n).toBe(3);
  });

  it('6. reason rules: short reason on REJECTED throws; a reason on ENTRY_RECEIVED throws', async () => {
    const gc = await createGovernedCase(pool);

    await expect(
      withTransaction(pool, async (tx) => {
        await append(tx, {
          case_id: gc.caseId,
          action_type: 'RECOMMENDATION_REJECTED',
          actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
          before_state: 'OPEN',
          after_state: 'REJECTED',
          reason: 'too short', // 9 chars
        });
      }),
    ).rejects.toBeInstanceOf(AuditWriteError);

    await expect(
      withTransaction(pool, async (tx) => {
        await append(tx, {
          case_id: gc.caseId,
          action_type: 'ENTRY_RECEIVED',
          actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
          before_state: null,
          after_state: 'RECEIVED',
          reason: 'this action must not carry a reason',
        });
      }),
    ).rejects.toMatchObject({ code: 'AUDIT_WRITE_INVALID' });
  });

  it('7. secrets: denylisted field name and secret-shaped value both throw FORBIDDEN_CONTENT, and roll back', async () => {
    const gc = await createGovernedCase(pool);

    await expect(
      withTransaction(pool, async (tx) => {
        await append(tx, {
          case_id: gc.caseId,
          action_type: 'RECOMMENDATION_GENERATED',
          actor: { type: 'AI' },
          before_state: 'OPEN',
          after_state: 'OPEN',
          values: [
            {
              field_name: 'password',
              before_value: null,
              before_origin: null,
              after_value: 'hunter2',
              after_origin: 'AI',
            },
          ],
        });
      }),
    ).rejects.toMatchObject({ code: 'AUDIT_WRITE_FORBIDDEN_CONTENT' });

    await expect(
      withTransaction(pool, async (tx) => {
        await append(tx, {
          case_id: gc.caseId,
          action_type: 'RECOMMENDATION_GENERATED',
          actor: { type: 'AI' },
          before_state: 'OPEN',
          after_state: 'OPEN',
          values: [
            {
              field_name: 'goods_description',
              before_value: null,
              before_origin: null,
              after_value: 'Bearer abcd1234.efgh5678.ijkl9012',
              after_origin: 'AI',
            },
          ],
        });
      }),
    ).rejects.toMatchObject({ code: 'AUDIT_WRITE_FORBIDDEN_CONTENT' });

    // Both attempts rolled back: still exactly three entries.
    const res = await pool.query('SELECT count(*)::int AS n FROM audit_entries WHERE case_id = $1', [gc.caseId]);
    expect(res.rows[0].n).toBe(3);
  });

  it('8. loud failure: a transaction that inserts a cargo_entries row then throws inside append leaves zero rows', async () => {
    const caseReference = await pool
      .query<{ r: string }>(`SELECT 'CE-2026-' || to_char(nextval('case_reference_seq'), 'FM000000') AS r`)
      .then((res) => res.rows[0]!.r);

    await expect(
      withTransaction(pool, async (tx) => {
        const sp = await tx.query<{ id: string }>(
          `INSERT INTO specialists (email, display_name, password_hash)
           VALUES ($1, 'X', 'argon2id$placeholder') RETURNING id`,
          [`loud-${caseReference.toLowerCase()}@example.gov`],
        );
        const specialistId = sp.rows[0]!.id;
        await tx.query(
          `INSERT INTO cargo_entries (case_reference, created_by, receipt_outcome, goods_description)
           VALUES ($1, $2, 'EXCEPTION_OPENED', 'x') RETURNING id`,
          [caseReference, specialistId],
        );
        // Now throw inside append by passing an invalid action type.
        await append(tx, {
          case_id: '00000000-0000-0000-0000-000000000000',
          // @ts-expect-error deliberately invalid action for the loud-failure check
          action_type: 'NOT_A_REAL_ACTION',
          actor: { type: 'AI' },
          before_state: null,
          after_state: 'X',
        });
      }),
    ).rejects.toBeInstanceOf(AuditWriteError);

    const res = await pool.query('SELECT count(*)::int AS n FROM cargo_entries WHERE case_reference = $1', [
      caseReference,
    ]);
    expect(res.rows[0].n).toBe(0);
  });

  it('9. changed is verbatim: "  ACME  " -> "ACME" is changed=true and stored byte-identically', async () => {
    // Build a fresh case, then append a RECOMMENDATION_APPROVED entry carrying a
    // whitespace-only difference and read back what was stored.
    const gc = await createGovernedCase(pool);
    const before = '  ACME  ';
    const after = 'ACME';

    const entryId = await withTransaction(pool, async (tx) =>
      append(tx, {
        case_id: gc.caseId,
        action_type: 'RECOMMENDATION_APPROVED',
        actor: { type: 'SPECIALIST', specialist_id: gc.specialistId },
        before_state: 'OPEN',
        after_state: 'RESOLVED',
        values: [
          {
            field_name: 'goods_description',
            before_value: before,
            before_origin: 'HUMAN',
            after_value: after,
            after_origin: 'HUMAN',
          },
        ],
      }),
    );

    const res = await pool.query<{ before_value: string; after_value: string; changed: boolean }>(
      'SELECT before_value, after_value, changed FROM audit_entry_values WHERE audit_entry_id = $1',
      [entryId],
    );
    const row = res.rows[0]!;
    expect(row.changed).toBe(true);
    expect(row.before_value).toBe(before); // byte-identical, no trimming
    expect(row.after_value).toBe(after);
  });
});
