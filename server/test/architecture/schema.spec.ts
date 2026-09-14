// Architecture suite — SCHEMA SHAPE (TEST-ARCH-10, FR-Y0.5, TechArch §2.14).
//
// This suite runs against a FRESHLY MIGRATED database (createTestDatabase /
// dropTestDatabase), so every assertion is about the migration set 0001–0010
// itself, not about whatever the dev database happens to contain. It closes the
// schema half of FR-Y0.5: the absent-column list, the thirteen-table surface,
// the eight-action correspondence, and the absence of any delete path or
// scope-leaking object name.
//
// The three exported constants (FORBIDDEN_COLUMNS, APPLICATION_TABLES,
// AUDIT_ACTIONS) are the schema contract every later phase is measured against;
// they are re-exported so a future spec can import rather than re-copy them.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, dropTestDatabase, withClient, type TestDatabase } from '../helpers/testdb.js';

// TechArch §2.14 item 1 — the twenty-five forbidden column names, verbatim. Any
// one of them appearing on any table is a scope leak: a queue field (assignee,
// priority, SLA), a role/permission field (RBAC), a tenant field (multi-tenancy),
// an export/ingestion field, or a customs-domain field this record does not hold.
export const FORBIDDEN_COLUMNS = [
  'assigned_to',
  'assignee_id',
  'claimed_by',
  'priority',
  'severity',
  'severity_rank',
  'risk_score',
  'age_days',
  'due_at',
  'sla_due_at',
  'sla_status',
  'role',
  'is_supervisor',
  'permission',
  'permissions',
  'scope',
  'tenant_id',
  'exported_at',
  'export_format',
  'source_system',
  'ingestion_batch_id',
  'is_seed',
  'hts_code',
  'tariff_rate',
  'duty_amount',
] as const;

// TechArch §2.14 item 2 — the thirteen application tables (schema_migrations is
// the migration runner's own bookkeeping and is excluded).
export const APPLICATION_TABLES = [
  'specialists',
  'sessions',
  'cargo_entries',
  'cargo_entry_field_origins',
  'validation_results',
  'validation_findings',
  'exceptions',
  'recommendations',
  'recommendation_values',
  'decisions',
  'decision_values',
  'audit_entries',
  'audit_entry_values',
] as const;

// FR-Y0.5 / TechArch §2.14 item 7 — the eight transitions of FRD 00-header §0.6.
export const AUDIT_ACTIONS = [
  'ENTRY_RECEIVED',
  'VALIDATION_COMPLETED',
  'EXCEPTION_OPENED',
  'RECOMMENDATION_GENERATED',
  'RECOMMENDATION_UNAVAILABLE',
  'RECOMMENDATION_APPROVED',
  'RECOMMENDATION_EDITED_AND_APPROVED',
  'RECOMMENDATION_REJECTED',
] as const;

// Object names must not evoke an excluded capability. The five *_require_audit
// trigger functions, verify_audit_chain, audit_reject_mutation, audit_check_chain,
// exceptions_require_human_decision and require_audit_entry all pass this filter
// (none contains export/report/dashboard/metric/seed/fixture/ingest/assign/
// priorit) — if a future name does not pass, that mismatch is precisely the
// signal this test exists to raise.
const FORBIDDEN_OBJECT_NAME = /export|report|dashboard|metric|seed|fixture|ingest|assign|priorit/i;

// C-1 forbids failure_reason on the audit tables specifically; the remaining
// names are the redaction/retention/export capabilities F13 FR-13.14 / FR-13.18
// rule out.
const AUDIT_SCOPE_LEAK = /failure_reason|redact|correct|retention|archive|purge|delete|export/i;

describe('architecture — schema shape (freshly migrated)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    if (db) await dropTestDatabase(db);
  });

  it('carries none of the twenty-five forbidden columns on any table (§2.14 item 1)', async () => {
    const leaks = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name
           FROM information_schema.columns
          WHERE table_schema = 'public' AND column_name = ANY($1)
          ORDER BY table_name, column_name`,
        [FORBIDDEN_COLUMNS],
      );
      return res.rows;
    });
    expect(
      leaks,
      leaks.length === 0
        ? ''
        : 'Forbidden column(s) present: ' +
          leaks.map((r) => `${r.table_name}.${r.column_name}`).join(', ') +
          '. Each is an excluded capability (queue/RBAC/tenant/export/customs) per TechArch §2.14 item 1.',
    ).toEqual([]);
  });

  it('has exactly the thirteen application tables plus schema_migrations (§2.14 item 2)', async () => {
    const actual = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query<{ table_name: string }>(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      );
      return res.rows
        .map((r) => r.table_name)
        .filter((n) => n !== 'schema_migrations')
        .sort();
    });
    const expected = [...APPLICATION_TABLES].sort();
    // Compare both directions: an extra table and a missing table each fail,
    // with the diff named so the offending table is obvious.
    const added = actual.filter((n) => !expected.includes(n));
    const missing = expected.filter((n) => !actual.includes(n));
    expect(added, `Unexpected application table(s): ${added.join(', ')}`).toEqual([]);
    expect(missing, `Missing application table(s): ${missing.join(', ')}`).toEqual([]);
    expect(actual).toEqual(expected);
  });

  it('has no table/view/mview/function name matching the excluded-capability pattern (§2.14 item 9)', async () => {
    const offenders = await withClient(db.ownerUrl, async (client) => {
      // relkinds: r=table, v=view, m=matview, p=partitioned table.
      const rels = await client.query<{ kind: string; name: string }>(
        `SELECT c.relkind AS kind, c.relname AS name
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m','p')`,
      );
      const procs = await client.query<{ name: string }>(
        `SELECT p.proname AS name
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'`,
      );
      const names: string[] = [];
      for (const r of rels.rows) if (FORBIDDEN_OBJECT_NAME.test(r.name)) names.push(`${r.kind}:${r.name}`);
      for (const p of procs.rows) if (FORBIDDEN_OBJECT_NAME.test(p.name)) names.push(`function:${p.name}`);
      return names.sort();
    });
    expect(
      offenders,
      `Object name(s) evoking an excluded capability: ${offenders.join(', ')} ` +
        '(export/report/dashboard/metric/seed/fixture/ingest/assign/priorit — TechArch §2.14 item 9).',
    ).toEqual([]);
  });

  it('ae_action_chk enumerates exactly the eight FRD §0.6 actions (§2.14 item 7, FR-Y0.5)', async () => {
    const actual = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def
           FROM pg_constraint
          WHERE conname = 'ae_action_chk'
            AND connamespace = 'public'::regnamespace`,
      );
      if (res.rowCount !== 1) throw new Error('ae_action_chk not found (or found more than once)');
      const def = res.rows[0]!.def;
      // Extract every single-quoted literal from the CHECK definition.
      const literals = [...def.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
      return [...new Set(literals)].sort();
    });
    const expected = [...AUDIT_ACTIONS].sort();
    const added = actual.filter((a) => !expected.includes(a));
    const missing = expected.filter((a) => !actual.includes(a));
    expect(added, `Unexpected audit action(s) in ae_action_chk: ${added.join(', ')}`).toEqual([]);
    expect(missing, `Missing audit action(s) from ae_action_chk: ${missing.join(', ')}`).toEqual([]);
    expect(actual).toEqual(expected);
  });

  it('declares no cascading or nulling delete path on any foreign key (§2.2)', async () => {
    // confdeltype 'a' = NO ACTION, 'r' = RESTRICT — both refuse a delete. 'c'
    // (CASCADE) and 'n' (SET NULL) would be an indirect deletion route through a
    // table on which DELETE is granted to nobody. Assert none exist.
    const offenders = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query<{ conname: string; confdeltype: string }>(
        `SELECT conname, confdeltype
           FROM pg_constraint
          WHERE contype = 'f'
            AND connamespace = 'public'::regnamespace
            AND confdeltype IN ('c','n')`,
      );
      return res.rows.map((r) => `${r.conname}(${r.confdeltype})`);
    });
    expect(
      offenders,
      `Foreign key(s) with a cascading/nulling delete: ${offenders.join(', ')}. ` +
        'No delete path may exist (TechArch §2.2): DELETE is granted to nobody.',
    ).toEqual([]);
  });

  it('neither audit table carries a failure_reason / redaction / retention / export column', async () => {
    const leaks = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('audit_entries', 'audit_entry_values')`,
      );
      return res.rows.filter((r) => AUDIT_SCOPE_LEAK.test(r.column_name));
    });
    expect(
      leaks,
      leaks.length === 0
        ? ''
        : 'Audit-table scope leak: ' +
          leaks.map((r) => `${r.table_name}.${r.column_name}`).join(', ') +
          '. C-1 forbids failure_reason here; F13 FR-13.14/FR-13.18 rule out redaction/retention/export.',
    ).toEqual([]);
  });
});
