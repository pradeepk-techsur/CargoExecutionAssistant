---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 09
subsystem: ui
tags: [carbon, react, case-detail, provenance, ai-recommendation, uswds-migration, wave-4]

# Dependency graph
requires:
  - phase: 07-06
    provides: "ProvenanceBadge (Carbon Tag, four colour-independent carriers), shared states (Loading/Degraded/ErrorState) on Carbon"
  - phase: 07-05
    provides: "Carbon application shell the screen renders inside, unchanged"
provides:
  - "CaseDetail.tsx core reading sections (h1 header, On-this-page nav, submitted-entry, findings, AI-recommendation all four presentations) rendered on Carbon"
  - "e2e/case-detail.spec.ts locators migrated to Carbon classes for the sections this plan rebuilt"
  - "Carbon conformance register rows for the case-detail header/nav/entry/findings/recommendation compositions"
affects: [07-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native <dl>/<ol> structural markup styled with Carbon spacing tokens (.cargoexec-detail-list / .cargoexec-comparison-rows / .cargoexec-in-page-nav) for shapes Carbon ships no component for"
    - "In-page #fragment navigation as a documented Carbon composition (Carbon Link inside Stack/ListItem), not a bespoke control"

key-files:
  created: []
  modified:
    - "web/src/screens/CaseDetail.tsx"
    - "e2e/case-detail.spec.ts"
    - "web/styles/app.scss"
    - "docs/carbon-conformance-register.md"

key-decisions:
  - "The 'On this page' nav and the header/entry/comparison definition lists are documented Carbon compositions (Carbon has no in-page-nav or definition-list primitive), not bespoke controls, styled with Carbon spacing tokens so no raw hex/px enters web/src"
  - "DecisionPanel.tsx and AuditTrailRegion.tsx are deliberately untouched (07-10's job); CaseDetail keeps rendering both as children with their existing props — the screen is visually mixed (Carbon read sections, still-USWDS decision/audit) for one wave, which is acceptable"

patterns-established:
  - "Carbon-token-styled native structural markup for definition-list / comparison shapes with no Carbon primitive"

# Metrics
duration: 8 min
completed: 2026-09-17
---

# Phase 7 Plan 09: Case-Detail Core Sections on Carbon Summary

**The F10 case-detail screen's read-only reporting surface — h1 header, "On this page" nav, submitted-entry, validation findings, and the AI-recommendation section's four presentations (PENDING / AVAILABLE / UNAVAILABLE / stale) — now renders entirely on Carbon Design System primitives, with per-value provenance and the fixed FR-10.10 reading order intact.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-17T02:14:53Z
- **Completed:** 2026-09-17T02:23:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Rebuilt the case-detail header (h1 + status/received/submitted-by list + back-to-queue link) on Carbon typography/`Link`, preserving the `tabIndex={-1}` + `h1Ref` focus contract exactly.
- Rebuilt the unconditional "On this page" in-page navigation as a documented Carbon composition of native `#fragment` anchors (Carbon `Link` inside `Stack`/`ListItem`), keeping the fixed FR-10.10 reading order and genuine scroll/focus resolution.
- Rebuilt the 14-field submitted-entry display and the AI-vs-HUMAN comparison rows as Carbon-token-styled `<dl>`s, each value keeping its adjacent (unchanged 07-06) `ProvenanceBadge`.
- Rebuilt the validation-findings list on Carbon `OrderedList`/`ListItem`, verbatim server order, no severity language.
- Migrated the "AI-suggested resolution" whole-recommendation marker to Carbon `Tag` (`type="purple"`); PENDING keeps the shared Carbon `Loading`, stale/UNAVAILABLE keep the shared Carbon `Degraded` (not-an-error, never `ErrorState`); polling timing logic unchanged; rationale stays plain `<p>` paragraphs (FR-10.4).
- Migrated the e2e locators for the sections this plan rebuilt (`.usa-tag` → `.cds--tag`, `.usa-alert--warning` → `.cds--inline-notification--warning`); the full 10-scenario case-detail suite passes.

## Task Commits

1. **Task 1: header / in-page nav / submitted-entry / findings on Carbon** — `f60148f` (feat)
2. **Task 2: AI-recommendation section on Carbon (code)** — landed in `cb06e36` (see Deviations / Issues — parallel-plan commit interleaving)
3. **Task 2: register rows for the AI-recommendation Carbon compositions** — `a57bc0b` (docs)

_Note: Task 2's `.tsx`/`.scss`/`.spec` edits were authored and verified by this plan but were swept into a parallel wave-4 plan's commit (`cb06e36`) by shared-working-tree `git add`/`commit` interleaving; the changes are correct and present in the tree. The 07-09 register commit `a57bc0b` carries the plan attribution and references them._

## Files Created/Modified
- `web/src/screens/CaseDetail.tsx` — header, in-page nav, submitted-entry, findings, and AI-recommendation sections rebuilt on Carbon; DecisionPanel/AuditTrailRegion render calls and props unchanged.
- `e2e/case-detail.spec.ts` — provenance-badge and degraded-region locators migrated to Carbon classes for the rebuilt sections; decision/audit-region assertions left untouched.
- `web/styles/app.scss` — `.cargoexec-detail-list`, `.cargoexec-in-page-nav`, `.cargoexec-comparison-rows` scoped rules (Carbon spacing tokens, no raw hex).
- `docs/carbon-conformance-register.md` — appended rows + composition notes for the header/nav/entry/findings/recommendation controls.

## Decisions Made
- The "On this page" nav and the header/entry/comparison definition lists are **documented Carbon compositions**, not bespoke controls: Carbon ships no in-page-navigation or definition-list primitive, so native structural markup is styled with Carbon spacing tokens (keeping web/src free of raw hex/px per absence.spec).
- `DecisionPanel.tsx` and `AuditTrailRegion.tsx` are **deliberately untouched** (07-10's job). `CaseDetail` continues to render both as children with their existing props. The screen is visually mixed (Carbon read sections + still-USWDS decision/audit regions) for one wave — acceptable, as the full regression gate is deferred to 07-11 and this plan's verification only covers the sections it rebuilt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `AI_PROVIDER_URL` required to run the e2e verification**
- **Found during:** Task 2 (Playwright verification)
- **Issue:** `e2e/global-setup.ts` runs `docker compose up -d db`, and (per 07-02, FR-9.20) `docker-compose.yml` now makes `AI_PROVIDER_URL` a mandatory no-default variable, so the setup exited 1 with "required variable AI_PROVIDER_URL is missing a value".
- **Fix:** Ran the targeted Playwright suite with `AI_PROVIDER_URL=fake:deterministic` exported (the same posture `e2e/env.ts` uses for the web server). No file change — this is the correct local/test invocation.
- **Verification:** All 10 case-detail scenarios pass.
- **Commit:** n/a (invocation only)

---

**Total deviations:** 1 auto-fixed (1 blocking). **Impact on plan:** none on delivered code — the blocker was purely an e2e-invocation requirement introduced by a prior plan's deployment-posture fix.

## Issues Encountered

**Parallel-plan commit interleaving on the shared working tree (wave 4).** Plans 07-07, 07-08 and 07-09 execute concurrently on the same branch and working tree. Twice, another wave-4 plan's `git add`/`git commit` swept this plan's *unstaged* working-tree edits into its own commit:
- My first Task 2 commit accidentally captured plan 07-08's staged queue files; I soft-reset and re-staged only my paths.
- Plan 07-07's commit `cb06e36` then landed on top and captured my Task 2 `.tsx`/`.scss`/`.spec` edits (which were momentarily unstaged in the shared tree).

**Resolution:** The Task 2 code changes are correct and verifiably present in the committed tree (build + typecheck + 10/10 e2e green after the interleaving). I recorded the 07-09 register rows in a dedicated `docs(07-09)` commit (`a57bc0b`) and restored the parallel plans' in-flight register rows to the working tree so they are not stranded (they re-apply their own rows on commit, per the wave-4 coordination protocol). No work was lost; only per-task commit attribution for Task 2's code is imperfect.

## Known Stubs
None found in this plan's changed files. (The register contains a pre-existing "NotBuiltYet transitional placeholder" row from a parallel plan — not this plan's, and describing a deliberate-absence notice, not an unfinished stub.)

## Handoff to 07-10 — scenarios still USWDS-dependent

This plan rebuilt ONLY the case-detail read sections. `DecisionPanel.tsx` and `AuditTrailRegion.tsx` remain USWDS-rendered until 07-10. In `e2e/case-detail.spec.ts`:
- **Test 7** ("the decision and audit-trail sections are present and real") passes today because it asserts only *presence* (headings, the Approve button, the audit intro/receipt-event text) — NOT Carbon classes. It does not currently gate on the decision/audit regions being on Carbon, so it needed no change here and did not break.
- No test in this spec asserts a `.usa-*` selector against the decision or audit region (those regions' Carbon-class assertions are 07-10's to add when it migrates them).
- The joint five-section accessibility re-sign-off (`docs/a11y/case-detail.md`) is explicitly **07-10's**, not this plan's — the decision and audit regions are still stubs-in-progress on USWDS until then.

## User Setup Required
None - no external service configuration required by this plan.

## Next Phase Readiness
- Ready for 07-10 (decision + audit region migration and the joint five-section a11y re-sign-off).
- The case-detail screen is visually mixed for wave 4 (Carbon read sections, USWDS decision/audit) — expected and documented.
- Full `npm run test:e2e` regression remains deferred to the wave-5 cleanup plan (07-11) per the plan.

## Self-Check: PASSED

- Created/modified files all present on disk (5/5).
- Commits present: `f60148f` (Task 1), `a57bc0b` (07-09 register), and Task 2 code in `cb06e36` (parallel-plan interleaving, documented above).
- Plan-level build gate: `npm run build` → exit 0; `npm run typecheck` → exit 0.
- Targeted e2e: `npx playwright test e2e/case-detail.spec.ts -g "recommendation|entry|findings|On this page|not found"` → 10 passed.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
