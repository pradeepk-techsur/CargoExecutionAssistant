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
- **RESOLVED by plan 07-05 (commit `ce273c0`):** `Header.tsx` now re-types the
  Carbon `Header` through a localised `BannerHeader = CarbonHeader as
  ComponentType<ComponentProps<typeof CarbonHeader> & { role?: string }>` so
  `role="banner"` is passed as a JSX ATTRIBUTE (the documented ARIA-markup
  exclusion in `navigation.spec.ts`'s application-role scan) rather than an
  object-literal `role:` key. `npx tsc -p web --noEmit` exits 0 and
  `navigation.spec.ts` passes 11/11 against the rebuilt shell.

## From plan 07-05 (rebuild the application shell on Carbon)

### `docs/carbon-conformance-register.md` — concurrent rewrite dropped the 07-05 shell rows (handled, not deferred)

- **Discovered:** during 07-05 Task 2, the register 07-05 created in Task 1
  (`3738cc0`, with the skip-link / primary-nav / footer rows) had been rewritten
  by the concurrent wave-3 sibling **07-06** (`0ce5696` / `29eed4e`) with its own
  form-pattern preamble and rows, which did not preserve 07-05's shell rows.
- **Handled per the coordination note** ("re-read the file and re-apply your
  shell rows additively — never overwrite another plan's rows"): 07-05 re-applied
  all seven shell rows (skip link, government banner, masthead, primary nav, sign
  out, live regions, footer) at the top of the register table and added the
  banner/footer composition notes, PRESERVING every 07-06 row and note. Not a
  deferred item — recorded here only as the audit trail of the concurrent-edit
  reconciliation.
