# Deferred Items — Phase 01 Governed Record Substrate

Out-of-scope discoveries logged during plan execution. NOT fixed in the plan that found them.

## From plan 01-05

- **`npm run test:arch` exits 1 — "No test files found".** The
  `server/test/architecture/` directory does not exist yet. The schema/scope
  architecture suite (`test/architecture/schema.spec.ts`, TechArch §2.14) is a
  deliverable of later plans (01-08 / 01-09 / 01-10), not of 01-05. Pre-existing
  before this plan; `npm run test` therefore returns non-zero on the `test:arch`
  step until those plans land. Unit (23) and db (2) suites pass; typecheck clean;
  all 10 migrations apply. No action taken — out of scope for 01-05.
  RESOLVED by 01-07: `server/test/architecture/` now holds absence.spec.ts,
  schema.spec.ts and privileges.spec.ts; `npm run test:arch` is green (66 tests).

## From plan 01-07

- **`server/test/db/writer.spec.ts` fails with "permission denied for table
  cargo_entries" (8 of 11 tests).** These files (`writer.spec.ts` and
  `server/test/helpers/caseFixtures.ts`) are UNTRACKED artifacts of the parallel,
  in-flight plan **01-06** (the audit writer — `server/src/services/audit/writer.ts`).
  They appeared in the working tree during 01-07 execution and are not part of
  01-07's file set (which is the three `server/test/architecture/*.spec.ts` specs
  only). The failure is a fixture/privilege bug in 01-06's own helper
  (`caseFixtures.ts` `poolFor` connects with a role lacking INSERT on
  `cargo_entries`), unrelated to anything 01-07 changed. Per the SCOPE BOUNDARY
  rule, not fixed here. Owner: plan 01-06. 01-07's own deliverable
  (`npm run test:arch`) and the unit + harness suites are all green.
