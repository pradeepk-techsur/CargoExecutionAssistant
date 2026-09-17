---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 01
subsystem: cli
tags: [seed, demo-data, cli, idempotent, provenance, audit, f15]

# Dependency graph
requires:
  - phase: 03-receive-validate-except
    provides: receiveEntry (F3/F4/F5 atomic receipt transaction) + CanonicalEntryRecord
  - phase: 05-ai-recommendation-as-an-un-applied-proposal
    provides: runGenerationJob (F9 per-exception recommendation job) + FakeProvider/HTTP adapter
  - phase: 06-the-human-decision-and-the-record-that-explains-it
    provides: recordDecision (F11 governed decision transaction with per-value provenance)
  - phase: 02-identity-and-the-federal-ui-foundation
    provides: createSpecialist (F1 FR-1.13 account provisioning) + config self-checks
provides:
  - "server/src/cli/seed-demo-case.ts — the idempotent, stage-resumable F15 seed command"
  - "npm run seed:demo-case script"
  - "docs/seed-demo-case.md — the FR-15.9 fixture-labelling operator runbook"
  - "Narrow one-seed-file architecture assertion in absence.spec.ts and validation.spec.ts"
affects: [ui-redesign, uat, demonstration-walkthrough]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Operator CLI drives the full governed loop by calling the SAME service functions a live request uses (never a direct INSERT, never a migration)"
    - "Stage-by-stage idempotence: each stage checked before it writes; a re-run is a no-op, an interrupted run resumes"
    - "App pool reused as both aiPool and appPool for an operator-trust in-process generation call, preserving pool.ai.js's importer-set invariant"

key-files:
  created:
    - server/src/cli/seed-demo-case.ts
    - docs/seed-demo-case.md
  modified:
    - server/test/architecture/absence.spec.ts
    - server/test/architecture/validation.spec.ts
    - package.json
    - README.md

key-decisions:
  - "F15 reverses exactly one v1 exclusion (PRD §10 #7 no-seed-data), with a single named reviewed file — proven by a narrow architecture assertion"
  - "The seed calls receiveEntry/runGenerationJob/recordDecision/createSpecialist directly, so the seeded case is structurally indistinguishable from an organic one (chain_verified: true)"
  - "seed-demo-case.ts imports only the app pool (never pool.ai.js); it passes the app pool as both aiPool and appPool to runGenerationJob — safe at operator trust, preserving aiCapability.spec test 3"
  - "The one-seed-file arch scan is scoped to code trees (server/, web/, db/), not prose (project_specs/, docs/) — a spec/runbook named after F15 is not a seed mechanism"

patterns-established:
  - "Fixture labelling lives in documentation (docs/seed-demo-case.md), not a data-level is_seed column, because a seeded case must be indistinguishable from a real one"

# Metrics
duration: 40 min
completed: 2026-09-17
---

# Phase 7 Plan 01: Seeded Demonstration Case (F15) Summary

**An idempotent, stage-resumable operator CLI (`seed-demo-case`) that pre-loads one demonstration cargo case carried through the entire governed loop — received → validated-failed → exception → AI recommendation → EDIT_APPROVE decision with mixed AI/HUMAN provenance → full verifiable audit trail — by calling the same service functions a live request uses.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-17T00:52:00Z (approx)
- **Completed:** 2026-09-17T01:32:35Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `server/src/cli/seed-demo-case.ts`: a zero-argument operator CLI that drives one demonstration case through F3/F4/F5 receipt, F9 recommendation, and F11 decision by calling `receiveEntry`, `runGenerationJob`, `recordDecision`, and `createSpecialist` directly — no INSERT into a governed table, no migration.
- Idempotent and stage-resumable, proven against a real database: first run creates exactly one of each row; a second run is a full no-op (exit 0, no duplicates); an interrupted run with the recommendation left PENDING resumes from the recommendation stage and completes.
- A terminal UNAVAILABLE recommendation is never auto-retried (F9 FR-9.14): the run exits non-zero naming the recommendation stage and states a later run resumes once the provider is reachable.
- Two named architecture tests (`absence.spec.ts`, `validation.spec.ts`) gain the narrow one-seed-file exception without weakening their existing general prohibitions.
- `docs/seed-demo-case.md` satisfies FR-15.9's fixture-labelling obligation; `package.json` gains `seed:demo-case`; README §9 corrected.

## Task Commits

1. **Task 1: idempotent stage-resumable seed script** — `a078aff` (feat)
2. **Task 2: arch exception, npm script, FR-15.9 runbook** — `a23aadb` (test)

## Files Created/Modified

- `server/src/cli/seed-demo-case.ts` — the F15 seed command (created)
- `docs/seed-demo-case.md` — the FR-15.9 fixture-labelling operator runbook (created)
- `server/test/architecture/absence.spec.ts` — narrow one-seed-file assertion added
- `server/test/architecture/validation.spec.ts` — mirrored one-seed-file assertion added
- `package.json` — `seed:demo-case` script added
- `README.md` — §9 data-reset corrected to point at the new seed step

## Decisions Made

- **Fixture labelling is documentation, not a data column.** No `is_seed` column exists; adding one would defeat the requirement that a seeded case be indistinguishable from a real one. `docs/seed-demo-case.md` IS the FR-15.9 label. (Followed plan.)
- **App pool reused as both `aiPool` and `appPool`.** Documented in the file header naming `aiCapability.spec.ts` test 3 explicitly, so a future reader does not "fix" the missing `pool.ai.js` import. (Followed plan.)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Narrowed the one-seed-file architecture scan from the whole repository to the code trees**
- **Found during:** Task 2 (running `npm run test:arch` after adding the two assertions)
- **Issue:** The plan specified a scan of the ENTIRE repository for any file whose name contains "seed". That scan tripped on four legitimate non-mechanism files: `project_specs/UserStories/Epic-15-seeded-demonstration-case.md`, `project_specs/FRD/F15-seeded-demonstration-case.md`, `docs/seed-demo-case.md` (the FR-15.9 runbook this very plan requires), and `.opencode/commands/pivota_spec-seed-uat-data.md` (a platform agent-command file). None is a seed loader/script/mechanism; forbidding them (especially the required runbook) is a contradiction in the plan as written.
- **Fix:** Scoped both new assertions to the code trees where a real seed mechanism would live (`server/`, `web/`, `db/`), excluding prose trees and platform tooling. The guarantee is preserved — a second seed loader/script/migration/helper in the source still fails the build — while documentation of F15 does not. Reasoning documented in-test.
- **Files modified:** server/test/architecture/absence.spec.ts, server/test/architecture/validation.spec.ts
- **Verification:** `npm run test:arch` green (155 tests: 153 pre-existing + 2 new).
- **Committed in:** a23aadb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — assertion scoping)
**Impact on plan:** The deviation preserves the plan's stated intent (a single, named, reviewed seed exception) while making the assertion self-consistent with the runbook the plan itself mandates. No scope creep; no production behaviour changed.

## Issues Encountered

- The compose file's `AI_PROVIDER_URL` mandatory-variable syntax (from 07-02) means bare `docker compose up -d db` refuses to interpolate; passing `AI_PROVIDER_URL=fake:deterministic` on the command line brings the db up cleanly. This is expected 07-02 behaviour, not a problem with this plan.
- The `pgdata` volume occasionally could not be removed on the first `docker compose down -v` ("Resource is still in use"); a follow-up `docker volume rm project_pgdata` cleared it before each fresh-database proof.

## Manual Verification (F15's whole verification surface — no permanent test file, per TechArch §8.9)

Against a freshly migrated database with the `fake:deterministic` provider:

- **First run:** exit 0; created spec=1, entry=1, exception=1 (RESOLVED after decision), recommendation=1 (AVAILABLE), decision=1 (EDIT_APPROVE); decision values = 1 HUMAN + 11 AI; `verify_audit_chain(...).chain_verified = true`; 5 audit entries.
- **Second run:** exit 0; every stage logged "already present / reused"; counts unchanged (no duplicates).
- **Stage-resume:** with specialist+entry+exception present and the recommendation left PENDING, a full run reused stages 1–2 and performed only stages 3–4, reaching exit 0 and the same valid end state (RESOLVED / AVAILABLE / EDIT_APPROVE, 1 HUMAN + 11 AI).
- **Terminal UNAVAILABLE:** run against an unreachable https provider yielded `PROVIDER_UNAVAILABLE`, exited 1 naming the recommendation stage, and did NOT auto-retry (F9 FR-9.14).

## Known Stubs

None found — no TODO/FIXME/placeholder introduced in this plan's changed files (the sole `TODO` in absence.spec.ts is a pre-existing Phase-5 allowlist note, out of scope).

## Next Phase Readiness

- F15 is complete and terminal (it enables faster demonstration walkthroughs, not a further feature).
- The seeded case is available on demand for the Phase 7 UI redesign and any UAT: `npm run seed:demo-case` after migration, or `docker compose exec web node server/dist/cli/seed-demo-case.js`.
- No new migration, table, or column was added; `receipt.service.ts`, `decision.service.ts`, and `ai/job.ts` are unchanged.

## Self-Check: PASSED

- Created files exist: `server/src/cli/seed-demo-case.ts` FOUND, `docs/seed-demo-case.md` FOUND.
- Commits exist: `a078aff` FOUND, `a23aadb` FOUND.
- Plan-level build: `npm run build:server` → exit 0; `npm run typecheck` → exit 0.
- Test tiers: arch 155, unit 297, db 196, api 170 — all green, zero regressions.
- `## Known Stubs` section present; no blocking stubs.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
