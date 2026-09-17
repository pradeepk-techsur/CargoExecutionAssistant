---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 10
subsystem: ui
tags: [carbon, react, decision-panel, audit-trail, provenance, uswds-migration, accessibility, wave-5]

# Dependency graph
requires:
  - phase: 07-09
    provides: "CaseDetail.tsx read sections on Carbon; the screen renders DecisionPanel/AuditTrailRegion as children with stable props"
  - phase: 07-06
    provides: "ProvenanceBadge (Carbon Tag), ErrorSummary, the UswdsForm form pattern (TextAreaField/SubmitButton/UswdsForm), shared states — all on Carbon, exports unchanged"
provides:
  - "DecisionPanel.tsx (F12) rendered entirely on Carbon: equal-weight actions on one Button kind, ProgressIndicator two-step commitment, Carbon InlineNotification notices"
  - "AuditTrailRegion.tsx (F14) rendered entirely on Carbon: value-change table on Carbon plain table primitives, integrity-failure alert on Carbon InlineNotification"
  - "Fix to shared ErrorSummary: interactive link list rendered as a sibling of Carbon InlineNotification (Carbon forbids interactive children)"
  - "docs/a11y/case-detail.md closed as one joint five-section sign-off, whole screen on Carbon"
  - "docs/carbon-conformance-register.md completed for every case-detail control"
affects: [07-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Carbon ProgressIndicator/ProgressStep for UX Pattern 3's visible two-step commitment (replacing usa-step-indicator)"
    - "Equal-weight action set = N Carbon Buttons sharing exactly one kind (tertiary), with the sole primary reserved for the committing action"
    - "Carbon InlineNotification carries title-only text; any interactive content must be a SIBLING inside the project-owned role=alert container (useNoInteractiveChildren throws otherwise)"
    - "Read-only audit data table on Carbon plain table primitives (Table/TableHead/TableRow/TableHeader/TableBody/TableCell), no DataTable/isSortable, native <th scope=row> for row headers"

key-files:
  created: []
  modified:
    - "web/src/components/DecisionPanel.tsx"
    - "web/src/components/AuditTrailRegion.tsx"
    - "web/src/components/ErrorSummary.tsx"
    - "web/styles/app.scss"
    - "e2e/decision.spec.ts"
    - "e2e/audit-trail.spec.ts"
    - "docs/carbon-conformance-register.md"
    - "docs/a11y/case-detail.md"

key-decisions:
  - "The three decision actions share one Carbon kind=tertiary (outline-equivalent, UX Pattern 3's 'three identical outline buttons'); the ONLY primary button in the whole path is the final Record decision — no visual steer toward Approve (FR-12.1)"
  - "Carbon's InlineNotification throws on interactive children (useNoInteractiveChildren), so ErrorSummary's in-page link list moved from the notification's children to a sibling inside the role=alert container — a real bug fixed, focus/order/link mechanics unchanged"
  - "The audit value-change table is a genuine Carbon data table (plain primitives, no DataTable/isSortable/grid role) — read-only by construction, matching the queue table's 07-08 reasoning"
  - "docs/a11y/case-detail.md closed as ONE joint five-section record (the sign-off 07-09 deliberately left open), citing the same real tests now green against Carbon-class locators"

patterns-established:
  - "Equal-weight action group: N Carbon Buttons, one shared kind, sole primary reserved for the committing step"
  - "Interactive content beside (never inside) a Carbon InlineNotification"

# Metrics
duration: 22 min
completed: 2026-09-17
---

# Phase 7 Plan 10: DecisionPanel & AuditTrailRegion on Carbon — the final two USWDS files Summary

**The last two USWDS-coupled files — the F12 `DecisionPanel` (equal-weight Approve/Edit/Reject on one Carbon `Button kind`, a Carbon `ProgressIndicator` two-step commitment, the only primary button being the final Record) and the F14 `AuditTrailRegion` (value-change table on Carbon's plain data-table primitives, integrity-failure alert on Carbon `InlineNotification` with no repair action) — now render entirely on Carbon, completing the eighteen-file USWDS→Carbon migration and closing the case-detail screen's per-screen accessibility sign-off as one joint five-section record.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-17T02:26:48Z
- **Completed:** 2026-09-17T02:48:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Rebuilt `DecisionPanel.tsx` on Carbon with the load-bearing equal-weight constraint intact: Approve / Edit-and-approve (or Resolve-directly) / Reject render as three Carbon `Button kind="tertiary"` sharing exactly one class; the sole primary-weighted button is the final "Record decision" — no visual steer toward any action (FR-12.1).
- Mapped UX Pattern 3's two-step commitment to a Carbon `ProgressIndicator`/`ProgressStep` (four steps: Choose → Complete → Review → Record), with `aria-current="step"` on the current step; a decision still requires a deliberate second action to record.
- Rebuilt `AuditTrailRegion.tsx` on Carbon: the before/after value-change table on Carbon's plain table primitives (a genuine data table — no `DataTable`, no `isSortable`, no grid role, native `<th scope="row">`), and the integrity-failure alert on Carbon `InlineNotification kind="error"` + `role="alert"` with no repair/edit/export affordance (FR-14.10).
- Fixed a real bug in the shared `ErrorSummary` (Rule 1): Carbon's `InlineNotification` throws on interactive children, so the in-page link list now renders as a sibling inside the `role="alert"` container — every focus/order/link mechanic unchanged.
- Migrated `e2e/decision.spec.ts` (8/8) and `e2e/audit-trail.spec.ts` (10/10) locators to Carbon's rendered classes; the FULL `e2e/case-detail.spec.ts` (10/10) is green against the now-fully-Carbon screen, and `e2e/whole-loop.spec.ts` (2/2) walks both rebuilt regions end to end.
- Closed `docs/a11y/case-detail.md` as ONE joint five-section sign-off (the record 07-09 left open), and completed `docs/carbon-conformance-register.md` for every case-detail control.

## Task Commits

Each task was committed atomically:

1. **Task 1: DecisionPanel on Carbon (+ ErrorSummary fix)** — `be9f280` (feat)
2. **Task 2: AuditTrailRegion on Carbon; joint a11y sign-off** — `e75241a` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified
- `web/src/components/DecisionPanel.tsx` — chooser/edit/reject/summary/confirmation rebuilt on Carbon; equal-weight actions; ProgressIndicator; InlineNotification notices.
- `web/src/components/AuditTrailRegion.tsx` — value-change table on Carbon plain table primitives; integrity-failure alert on Carbon InlineNotification; event list unchanged native `<ol>`.
- `web/src/components/ErrorSummary.tsx` — link list moved to a sibling of the Carbon InlineNotification (Rule 1 bug fix).
- `web/styles/app.scss` — scoped rules for the decision actions row, the commitment step indicator, and the audit table row header (Carbon spacing tokens, no raw hex).
- `e2e/decision.spec.ts` — locators migrated to Carbon classes (`.cds--tag`, `.cds--inline-notification--info`, `.cargoexec-error-summary`); the row-scoping xpath updated for Carbon `TextInput` wrapping.
- `e2e/audit-trail.spec.ts` — `.usa-tag` → `.cds--tag`; `.usa-alert--error` → `.cds--inline-notification--error`.
- `docs/carbon-conformance-register.md` — decision-region and audit-region rows + notes; register-complete section.
- `docs/a11y/case-detail.md` — joint five-section Carbon re-sign (evidence set, full §7.7 checklist, AT walkthrough addendum, sign-off).

## Decisions Made
- **Equal weight is the mechanism, not a preference.** All three decision actions share one Carbon `kind="tertiary"`; the sole primary is the committing "Record decision" (UX Pattern 3). This is what makes choosing the AI's answer cost the same deliberate keystrokes as refusing it (FR-12.1) — a regression fails `e2e/decision.spec.ts` test 1's one-shared-class assertion (T-07-27).
- **Interactive content beside, never inside, a Carbon `InlineNotification`.** Carbon's `useNoInteractiveChildren` throws on any focusable child; the error-summary's link list (the pattern's whole point) had to move out of the notification and sit as a sibling inside the `role="alert"` container.
- **The audit table is a read-only data table**, hand-composed from Carbon's plain primitives with no `DataTable`/`isSortable`/grid role — the same "absence is structural, not a runtime opt-out" reasoning the queue table used in 07-08.
- **One joint sign-off** — `docs/a11y/case-detail.md` was closed as a single record over all five sections (07-09 left it open on purpose), not two separate re-signs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Carbon `InlineNotification` throws on the ErrorSummary's interactive link children**
- **Found during:** Task 1 (running `e2e/decision.spec.ts` test 2 — the empty-reason gate)
- **Issue:** The shared `ErrorSummary` (migrated to Carbon in 07-06) rendered its list of in-page `<a>` links as the children of Carbon's `InlineNotification`. Carbon's `InlineNotification` runs `useNoInteractiveChildren`, which **throws** (`"component should have no interactive child nodes"`) when it finds a focusable child — crashing the React render into "Unexpected Application Error!" the moment the error summary appeared. This latent bug had not been exercised by a passing e2e before (07-09 ran only case-detail read-section scenarios; the sign-in ErrorSummary uses only fieldless items with no links).
- **Fix:** Render the Carbon `InlineNotification` with the `title` only, and move the interactive in-page link list to a SIBLING inside the project-owned `role="alert"` focusable container. Every focus/order/link mechanic (the `ref`/`useEffect` `.focus()`, server-order links, per-control focus-by-id) is unchanged; only the DOM nesting of the link list relative to the notification moved.
- **Files modified:** `web/src/components/ErrorSummary.tsx`
- **Verification:** `e2e/decision.spec.ts` test 2 passes (error summary appears, is `role="alert"`, receives focus, no decision POST fires); `e2e/sign-in.spec.ts` 13/13 still pass (the other ErrorSummary consumer).
- **Commit:** `be9f280` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug). **Impact on plan:** the fix was necessary for the decision region's client-side reason gate to render at all on Carbon; it is confined to the shared component's DOM nesting and preserves every certified behaviour. No scope creep.

## Issues Encountered

**Stale reused e2e server masked as a test-3 failure (environment, not code).** On the first `audit-trail.spec.ts` run, test 3 ("AI attributed to AI (model_id)") failed because Playwright's `reuseExistingServer: !CI` reused a leftover server process (PID 73855, started earlier in the session) whose env carried `AI_MODEL_ID=test-model`, while the current test's `E2E_ENV.AI_MODEL_ID` computed the default `e2e-fake-model`. The AI-attribution logic (`whoText`) is unchanged and correct. **Resolution:** killed the stale server so Playwright started a fresh one with the run's own env; test 3 (and all 10 audit scenarios) then passed. No code change — a sandbox process-hygiene artifact.

## Known Stubs
None found. Scanned all changed files (`DecisionPanel.tsx`, `AuditTrailRegion.tsx`, `ErrorSummary.tsx`, `app.scss`, both e2e specs, both docs) for TODO/FIXME/placeholder/not-implemented/coming-soon — none present. Both regions render real behaviour, unchanged from Phase 6.

## User Setup Required
None - no external service configuration required by this plan.

## Next Phase Readiness
- All eighteen originally USWDS-coupled `.tsx` files now render on Carbon — this plan closed the last two. The case-detail screen is fully Carbon in all five sections with a signed joint accessibility record.
- The only remaining Phase-7 UI cleanup work (wave 5+) is retiring USWDS itself from the dependency tree, the Sass entry (`web/styles/app.scss` `@forward "uswds"`), the `copy-uswds-assets` pipeline, and the `--cargoexec-*` token seam — removing markup already superseded here, not migrating any live control.
- Gate green: `npm run build` exit 0; `npm run typecheck` exit 0; architecture 155/155; e2e case-detail 10, decision 8, audit-trail 10, whole-loop 2 — all pass.

## Self-Check: PASSED

- Modified files all present on disk (8/8).
- Commits present: `be9f280` (Task 1), `e75241a` (Task 2).
- Plan-level build gate: `npm run build` → exit 0; `npm run typecheck` → exit 0.
- e2e verify: `e2e/audit-trail.spec.ts` (10) + `e2e/case-detail.spec.ts` (10) + `e2e/decision.spec.ts` (8) = 28 passed, 0 failed, 0 skipped; `e2e/whole-loop.spec.ts` 2 passed; architecture tier 155 passed.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
