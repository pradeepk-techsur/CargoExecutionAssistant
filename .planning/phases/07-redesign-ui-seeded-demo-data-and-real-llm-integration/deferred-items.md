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

## From plan 07-06 (rebuild shared component library on Carbon)

### `web/src/shell/Header.tsx` typecheck error — Carbon `Header` `role`/children props (owner: plan 07-05, the shell)

- **Discovered:** running `npm run typecheck` / `npm run build` during 07-06
  Task 1 verification.
- **Failing check:** `tsc -p web --noEmit` →
  `web/src/shell/Header.tsx(35,19): error TS2322 ... Property 'role' does not
  exist on type '... HeaderProps ...'` (Carbon's `Header` prop-types shape does
  not surface `role`).
- **Cause (NOT this plan):** `web/src/shell/Header.tsx` and
  `web/src/shell/Banner.tsx` are plan **07-05**'s uncommitted, in-flight shell
  migration to Carbon (wave 3, shared branch — the coordination note's
  concurrency case). 07-06 touches ONLY `web/src/components/{UswdsForm,
  ErrorSummary,ProvenanceBadge,states}.tsx` and `docs/carbon-conformance-register.md`;
  it does not import, render, or edit any `web/src/shell/*` file.
- **Proof it pre-exists 07-06:** stashing all 07-06 working changes
  (`git stash push -- web/src/components/UswdsForm.tsx docs/carbon-conformance-register.md`)
  and re-running `npm run typecheck` reproduces the identical single
  `Header.tsx(35,19)` error — 07-06's own four files add zero typecheck errors,
  and all real consumers of them (`SignIn.tsx`, `CaseDetail.tsx`,
  `DecisionPanel.tsx`, `AuditTrailRegion.tsx`) compile clean, proving the
  export-name/prop-shape preservation this plan guarantees.
- **Owner:** plan **07-05** (the shell) — it owns making its Carbon `Header`
  render pass typecheck (drop the unsupported `role` prop or wrap the landmark
  correctly). Not 07-06's concern.
