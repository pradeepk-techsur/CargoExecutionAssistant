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
