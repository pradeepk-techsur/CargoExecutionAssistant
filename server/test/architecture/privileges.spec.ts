// Architecture suite — DECLARED PRIVILEGE MATRIX (FR-Y0.3, FR-Y0.5, TechArch
// §2.14 items 3–6 and A-1).
//
// This suite asserts what the schema *declares* — the grant matrix read from
// information_schema.table_privileges against a freshly migrated database. Its
// behavioural counterpart is `server/test/architecture/enforcement.spec.ts`
// (plan 01-08), which asserts what the database *does*: that UPDATE/DELETE on
// the audit tables actually fail (including as cargoexec_owner) because the
// migration 0009 triggers fire. BOTH are required and they catch different
// regressions:
//   • a declaration test catches a future migration that silently widens a grant;
//   • a behavioural test catches a trigger that was dropped while the grant map
//     still looks correct.
// See TechArch §2.14 item 8 for the behavioural assertions that live in 01-08.
//
// A note on ownership vs. grants (item 6). `cargoexec_owner` owns every table
// and therefore holds every privilege on it *implicitly by ownership* — those
// rows appear in information_schema.table_privileges but are not "grants" and
// cannot be revoked without breaking the migration runner. Item 6 ("DELETE and
// TRUNCATE are granted to no role") is about explicit grants to the non-owner
// roles; the owner's ability to issue a raw DELETE is separately *neutralised
// by trigger*, which is item 8's behavioural assertion (verified in 01-08, and
// noted at TechArch §2.14 line 281: "DELETE FROM audit_entries … fails as
// cargoexec_owner"). This suite therefore checks that no grantee OTHER THAN the
// schema owner holds DELETE or TRUNCATE anywhere.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, dropTestDatabase, withClient, type TestDatabase } from '../helpers/testdb.js';

const APP = 'cargoexec_app';
const AI = 'cargoexec_ai';
const OWNER = 'cargoexec_owner';

const AUDIT_TABLES = ['audit_entries', 'audit_entry_values'];

// FR-Y0.3 — the full cargoexec_app grant matrix, verbatim. UPDATE is held on
// the mutable-state tables AND on cargo_entries — the latter NOT to overwrite
// the entry of record (which no code path does; F0 FR-0.1 makes immutability an
// application guarantee) but because the case-anchor row lock the audit writer
// depends on, `SELECT id FROM cargo_entries WHERE id = $1 FOR UPDATE`
// (F0 FR-0.6, F13 FR-13.5, migration 0011), is only grantable to a role holding
// the table's UPDATE privilege. Everything else is append-only (SELECT + INSERT).
// DELETE/TRUNCATE appear nowhere.
const EXPECTED_APP: Record<string, string[]> = {
  specialists: ['INSERT', 'SELECT', 'UPDATE'],
  sessions: ['INSERT', 'SELECT', 'UPDATE'],
  recommendations: ['INSERT', 'SELECT', 'UPDATE'],
  exceptions: ['INSERT', 'SELECT', 'UPDATE'],
  cargo_entries: ['INSERT', 'SELECT', 'UPDATE'],
  cargo_entry_field_origins: ['INSERT', 'SELECT'],
  validation_results: ['INSERT', 'SELECT'],
  validation_findings: ['INSERT', 'SELECT'],
  recommendation_values: ['INSERT', 'SELECT'],
  decisions: ['INSERT', 'SELECT'],
  decision_values: ['INSERT', 'SELECT'],
  audit_entries: ['INSERT', 'SELECT'],
  audit_entry_values: ['INSERT', 'SELECT'],
};

/** {table -> sorted privilege list} for one grantee, from information_schema. */
async function grantMap(url: string, grantee: string): Promise<Record<string, string[]>> {
  return withClient(url, async (client) => {
    const res = await client.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type
         FROM information_schema.table_privileges
        WHERE table_schema = 'public' AND grantee = $1`,
      [grantee],
    );
    const map: Record<string, string[]> = {};
    for (const row of res.rows) (map[row.table_name] ??= []).push(row.privilege_type);
    for (const t of Object.keys(map)) map[t] = [...new Set(map[t]!)].sort();
    return map;
  });
}

describe('architecture — declared privilege matrix (freshly migrated)', () => {
  let db: TestDatabase;
  let appGrants: Record<string, string[]>;
  let aiGrants: Record<string, string[]>;

  beforeAll(async () => {
    db = await createTestDatabase();
    appGrants = await grantMap(db.ownerUrl, APP);
    aiGrants = await grantMap(db.ownerUrl, AI);
  });

  afterAll(async () => {
    if (db) await dropTestDatabase(db);
  });

  describe('cargoexec_app cannot mutate the audit store (§2.14 item 3)', () => {
    for (const table of AUDIT_TABLES) {
      it(`holds SELECT+INSERT but no UPDATE/DELETE/TRUNCATE on ${table}`, () => {
        const privs = appGrants[table] ?? [];
        // Positive: it must actually hold the append privileges, so this test
        // distinguishes "correctly revoked" from "never granted anything".
        expect(privs, `cargoexec_app must hold SELECT on ${table}`).toContain('SELECT');
        expect(privs, `cargoexec_app must hold INSERT on ${table}`).toContain('INSERT');
        // Negative: no mutation of the append-only store.
        for (const forbidden of ['UPDATE', 'DELETE', 'TRUNCATE']) {
          expect(privs, `cargoexec_app must NOT hold ${forbidden} on ${table}`).not.toContain(forbidden);
        }
      });
    }
  });

  it('the entry of record is immutable at the application layer, not by an UPDATE-privilege revocation (§2.14 item 4, F0 FR-0.1)', () => {
    // cargoexec_app DOES hold UPDATE on cargo_entries — but only so it can take
    // the case-anchor row lock `SELECT id FROM cargo_entries WHERE id = $1 FOR
    // UPDATE` that the audit writer's sequence assignment requires (F0 FR-0.6,
    // F13 FR-13.5). PostgreSQL grants that row lock only to a role holding the
    // table's UPDATE privilege. Immutability is instead guaranteed the way
    // FR-0.1 defines it: "no service method, endpoint, or UI affordance updates
    // a cargo entry after receipt" — asserted below by grepping server/src.
    const privs = appGrants['cargo_entries'] ?? [];
    expect(privs, 'cargoexec_app holds UPDATE on cargo_entries for the FOR UPDATE anchor lock').toContain('UPDATE');
    expect(privs, 'cargoexec_app must still hold SELECT on cargo_entries').toContain('SELECT');
    expect(privs, 'cargoexec_app must still hold INSERT on cargo_entries').toContain('INSERT');
  });

  it('no code path issues an UPDATE against cargo_entries (F0 FR-0.1 — application-level immutability)', async () => {
    // The application guarantee that backs the UPDATE grant above: the only use
    // of that privilege anywhere is the row lock; there is no `UPDATE
    // cargo_entries` statement in the source. If a future change adds one, this
    // fails and forces the author to justify overwriting the entry of record.
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

  it('the full cargoexec_app matrix equals FR-Y0.3 exactly (§2.14 item 3, item 4)', () => {
    // Set-for-set: a widened grant in a future migration fails here rather than
    // being discovered in production; a narrowed grant fails too.
    const normalise = (m: Record<string, string[]>) =>
      Object.fromEntries(Object.entries(m).map(([t, p]) => [t, [...p].sort()]));
    expect(normalise(appGrants)).toEqual(normalise(EXPECTED_APP));
  });

  describe('cargoexec_ai is structurally incapable of resolving a case (§2.14 item 5, A-1)', () => {
    it('has zero privilege of any kind on decisions and decision_values', () => {
      expect(aiGrants['decisions'], 'cargoexec_ai must have NO privilege on decisions').toBeUndefined();
      expect(aiGrants['decision_values'], 'cargoexec_ai must have NO privilege on decision_values').toBeUndefined();
    });

    it('has zero privilege of any kind on specialists and sessions', () => {
      expect(aiGrants['specialists'], 'cargoexec_ai must have NO privilege on specialists').toBeUndefined();
      expect(aiGrants['sessions'], 'cargoexec_ai must have NO privilege on sessions').toBeUndefined();
    });

    it('has no UPDATE on exceptions (cannot change an exception state)', () => {
      const privs = aiGrants['exceptions'] ?? [];
      expect(privs, 'cargoexec_ai must NOT hold UPDATE on exceptions').not.toContain('UPDATE');
      expect(privs, 'cargoexec_ai must still hold SELECT on exceptions').toContain('SELECT');
    });

    it('positively holds exactly its read set and its recommendation writes', () => {
      // SELECT on the six tables it reads.
      for (const t of [
        'cargo_entries',
        'validation_results',
        'validation_findings',
        'exceptions',
        'recommendations',
        'recommendation_values',
      ]) {
        expect(aiGrants[t] ?? [], `cargoexec_ai must hold SELECT on ${t}`).toContain('SELECT');
      }
      // INSERT + UPDATE on recommendations; INSERT on recommendation_values.
      expect(aiGrants['recommendations'] ?? []).toContain('INSERT');
      expect(aiGrants['recommendations'] ?? []).toContain('UPDATE');
      expect(aiGrants['recommendation_values'] ?? []).toContain('INSERT');
      // SELECT + INSERT on both audit tables (it writes RECOMMENDATION_* entries).
      for (const t of AUDIT_TABLES) {
        expect(aiGrants[t] ?? [], `cargoexec_ai must hold SELECT on ${t}`).toContain('SELECT');
        expect(aiGrants[t] ?? [], `cargoexec_ai must hold INSERT on ${t}`).toContain('INSERT');
      }
    });

    it('holds no UPDATE/DELETE/TRUNCATE on the audit tables', () => {
      for (const t of AUDIT_TABLES) {
        for (const forbidden of ['UPDATE', 'DELETE', 'TRUNCATE']) {
          expect(aiGrants[t] ?? [], `cargoexec_ai must NOT hold ${forbidden} on ${t}`).not.toContain(forbidden);
        }
      }
    });
  });

  it('DELETE and TRUNCATE are granted to no non-owner role on any table (§2.14 item 6)', async () => {
    // The schema owner (cargoexec_owner / the migration runner) holds DELETE and
    // TRUNCATE implicitly by ownership; those rows are not grants and cannot be
    // revoked. The owner's ability to actually delete an audit row is neutralised
    // by trigger, asserted behaviourally in plan 01-08 (§2.14 item 8). Here we
    // assert that NO OTHER grantee — including PUBLIC — was ever granted them.
    const offenders = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query<{ grantee: string; table_name: string; privilege_type: string }>(
        `SELECT grantee, table_name, privilege_type
           FROM information_schema.table_privileges
          WHERE table_schema = 'public'
            AND privilege_type IN ('DELETE', 'TRUNCATE')
            AND grantee <> $1`,
        [OWNER],
      );
      return res.rows.map((r) => `${r.grantee}:${r.privilege_type} on ${r.table_name}`);
    });
    expect(
      offenders,
      `DELETE/TRUNCATE granted to a non-owner role: ${offenders.join(', ')}. ` +
        'No role but the schema owner may hold them (TechArch §2.14 item 6).',
    ).toEqual([]);
  });

  it('neither runtime role holds schema CREATE, while both hold USAGE (§2.14, no-DDL)', async () => {
    // Without USAGE the grants above would be unreachable and this whole suite
    // would be asserting a fiction; with CREATE a runtime role could drop the
    // immutability triggers. Assert USAGE true, CREATE false for both.
    const r = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query<{
        app_create: boolean;
        ai_create: boolean;
        app_usage: boolean;
        ai_usage: boolean;
      }>(
        `SELECT has_schema_privilege($1, 'public', 'CREATE') AS app_create,
                has_schema_privilege($2, 'public', 'CREATE') AS ai_create,
                has_schema_privilege($1, 'public', 'USAGE')  AS app_usage,
                has_schema_privilege($2, 'public', 'USAGE')  AS ai_usage`,
        [APP, AI],
      );
      return res.rows[0]!;
    });
    expect(r.app_create, 'cargoexec_app must NOT hold schema CREATE').toBe(false);
    expect(r.ai_create, 'cargoexec_ai must NOT hold schema CREATE').toBe(false);
    expect(r.app_usage, 'cargoexec_app must hold schema USAGE').toBe(true);
    expect(r.ai_usage, 'cargoexec_ai must hold schema USAGE').toBe(true);
  });
});
