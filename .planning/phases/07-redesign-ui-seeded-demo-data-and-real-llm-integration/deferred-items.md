# Phase 7 — Deferred / Out-of-Scope Items

Items discovered during execution that are outside the current plan's scope.
Logged, not fixed, per the SCOPE BOUNDARY rule (execute-plan.md).

## From plan 07-03 (USWDS coupling audit + design-token seam)

### `test:arch` — 2 pre-existing F15 seed-file guard failures (owner: F15 seed plans, 07-01/07-02)

- **Discovered:** running `npm run test:arch` during 07-03 Task 2 verification.
- **Failing tests:**
  - `server/test/architecture/absence.spec.ts` → "exactly one seed-named file
    exists (F15, TechArch §1A.1a/§8.9)"
  - `server/test/architecture/validation.spec.ts` → "domain lists are
    compiled-in, not tables or seeds (FR-4.1) > …only seed-named file…"
- **Cause (NOT this plan):** both guards assert
  `server/src/cli/seed-demo-case.ts` is the *only* file in the repo whose name
  contains "seed". Three additional seed-named files now exist —
  `project_specs/UserStories/Epic-15-seeded-demonstration-case.md`,
  `project_specs/FRD/F15-seeded-demonstration-case.md`, and
  `.opencode/commands/pivota_spec-seed-uat-data.md`. The F15 seed CLI itself was
  committed by plan **07-01** (`a078aff`). None of these files are touched by
  07-03, whose diff is limited to `docs/uswds-coupling-audit.md`,
  `web/styles/app.scss`, and `web/styles/_tokens.scss`.
- **Proof it pre-exists 07-03:** stashing all 07-03 changes and re-running
  `test:arch` reproduces the identical 2 failures (153 passing, 2 failing).
- **Owner:** the F15 seeded-demonstration-case plan(s) must either narrow those
  two arch allowlists to permit the F15 spec/command docs, or relocate/rename
  those files. Not 07-03's concern.
