---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 06
subsystem: ui
tags: [carbon, react, design-system, accessibility, forms, provenance, wcag]

# Dependency graph
requires:
  - phase: 07-04
    provides: "@carbon/react 1.116.0 + @carbon/icons-react 11.88.0 installed additively; @carbon/styles (White theme) forwarded alongside USWDS into the one self-hosted uswds.css; IBM Plex self-hosted"
provides:
  - "The shared form pattern (Field, SelectField, TextAreaField, DateField, Fieldset, SubmitButton, UswdsForm) rendered on Carbon primitives with every exported name/prop shape UNCHANGED"
  - "ErrorSummary rebuilt on Carbon InlineNotification, focus/order/link mechanics unchanged"
  - "ProvenanceBadge rebuilt on Carbon Tag + @carbon/icons-react with four colour-independent carriers (text + icon + border-shape + colour)"
  - "The five shared state components (Loading, Empty, ErrorState, Degraded, ReadOnlyNotice) rebuilt on Carbon"
  - "docs/carbon-conformance-register.md rows + composition notes for all shared components"
affects: ["07-07", "07-08", "07-09", "07-10", "screen-level redesign plans"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Carbon component internals swapped behind identical export names/prop shapes so consumers need zero edits (drop-in swap)"
    - "labelText ReactNode slot carries the project's own required-marking, so Carbon owns the single hint+error aria-describedby wiring (no hand-rolled duplicate)"
    - "Colour-independence enforced via four carriers on ProvenanceBadge; the border-shape carrier lives in web/styles/ (excluded from the web/src raw-hex/px scan) using currentColor (no raw hex)"

key-files:
  created: []
  modified:
    - "web/src/components/UswdsForm.tsx"
    - "web/src/components/ErrorSummary.tsx"
    - "web/src/components/ProvenanceBadge.tsx"
    - "web/src/components/states.tsx"
    - "web/styles/app.scss"
    - "docs/carbon-conformance-register.md"

key-decisions:
  - "File name UswdsForm.tsx (and the UswdsForm export) kept despite Carbon internals — renaming would force an edit to every screen consumer, the exact churn this shared-component swap avoids"
  - "Carbon's TextArea native enableCounter/maxCount replaces the hand-rolled React character counter; the counter format differs (n/max vs 'n characters allowed') — documented, not hidden"
  - "AttributedValue (TechArch §1A.4) documented as non-existent in a ProvenanceBadge.tsx comment rather than invented as unplanned scope"
  - "ProvenanceBadge border-shape carrier placed in web/styles/app.scss via currentColor so no raw hex enters web/src (absence.spec scan stays green)"
  - "ReadOnlyNotice role='note' carried on an outer wrapper because Carbon types InlineNotification's role to alert|log|status only"

patterns-established:
  - "Carbon drop-in swap: change JSX internals only, keep export names + prop interfaces byte-identical, prove with typecheck of consumers"

# Metrics
duration: 9 min
completed: 2026-09-17
---

# Phase 7 Plan 06: Carbon Shared Component Library Summary

**The four load-bearing shared component files every screen inherits — the form pattern, error summary, provenance badge, and the five state components — now render on Carbon Design System primitives (@carbon/react + @carbon/icons-react) with every exported name and prop shape UNCHANGED, so every screen-level redesign plan is a pure internal swap with zero consumer edits.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-17T01:45:53Z
- **Completed:** 2026-09-17T01:55:15Z
- **Tasks:** 2
- **Files modified:** 6 (4 component .tsx, 1 stylesheet, 1 register)

## Accomplishments
- Rebuilt the entire shared form pattern (`Field`/`SelectField`/`TextAreaField`/`DateField`/`Fieldset`/`SubmitButton`/`UswdsForm`) on Carbon `TextInput`/`Select`/`TextArea`/`DatePicker`/`Button`/`Form` + native `<fieldset>`, preserving required-marking wording (FR-2.11), the single hint+error `aria-describedby` wiring (T-07-19), the fieldset pair-finding focus target (FR-6.10), `aria-disabled`-while-busy (FR-1.19), and the `noValidate` server-authoritative contract (FR-1.16).
- Rebuilt `ErrorSummary` on Carbon `InlineNotification kind="error"` while keeping the project-owned focus mechanics (`role="alert"`, `tabIndex="-1"`, `ref`+`useEffect` `.focus()`), server-order items, and per-control in-page links exactly as before.
- Rebuilt `ProvenanceBadge` on Carbon `Tag` + `@carbon/icons-react` with **four** colour-independent carriers — text, distinct icon (`Settings`/`User`), distinct border shape (dashed/solid), distinct token colour (`purple`/`gray`) — never colour alone (FR-2.17); `modified` prop unchanged (FR-12.6).
- Rebuilt all five state components (`Loading`, `Empty`, `ErrorState`, `Degraded`, `ReadOnlyNotice`) on Carbon `Loading`/`InlineNotification`, preserving the 300ms Loading gate and the `role` distinctions (alert/status/note) that keep the ErrorState-vs-Degraded "not an error" semantics.
- Documented the `AttributedValue` discrepancy honestly (a code comment + a register note), neither claiming a guarantee that does not exist nor inventing the wrapper.
- Extended `docs/carbon-conformance-register.md` additively with rows and composition notes for every shared control.

## Task Commits

1. **Task 1: Rebuild the form pattern on Carbon** - `0ce5696` (feat)
2. **Task 2: Rebuild ErrorSummary, ProvenanceBadge, and shared states on Carbon** - `29eed4e` (feat)

_Note: `docs/carbon-conformance-register.md`'s form-pattern rows were already present in HEAD (07-05's register-creation commit `3738cc0` carried identical content); Task 1's register additions therefore produced no diff, and Task 2 appended the remaining rows._

## Files Created/Modified
- `web/src/components/UswdsForm.tsx` - Form pattern rebuilt on Carbon; same exports/props, Carbon internals
- `web/src/components/ErrorSummary.tsx` - Carbon `InlineNotification` error summary; focus/order/link mechanics unchanged
- `web/src/components/ProvenanceBadge.tsx` - Carbon `Tag` badge, four colour-independent carriers; AttributedValue gap documented
- `web/src/components/states.tsx` - Five state components on Carbon
- `web/styles/app.scss` - Scoped `.cargoexec-provenance-badge` dashed/solid border-shape carrier (via `currentColor`, no raw hex)
- `docs/carbon-conformance-register.md` - Additive rows + notes for the shared controls

## Decisions Made
- Kept the `UswdsForm.tsx` filename and `UswdsForm` export despite Carbon internals — a rename forces every screen consumer to change, defeating the whole purpose of a drop-in swap. The filename/content mismatch is an accepted, documented cost (a future cleanup phase may rename together with all import sites).
- Adopted Carbon `TextArea`'s native `enableCounter`/`maxCount`, replacing the hand-rolled React counter. Carbon's counter format is `{n}/{max}` rather than USWDS's `{n} characters allowed` — a wording difference, called out here.
- Carbon's `DatePicker` is a real controlled React component, so the old USWDS `window.uswds...on()` workaround is moot; the typed `YYYY-MM-DD` string is submitted verbatim (no locale coercion, FR-6.5). Carbon's `DatePickerInput` type omits `value`/`onChange`/`name`/`required`, so the controlled value lives on the parent `DatePicker` and native attrs pass through a small typed rest bag.
- Placed the provenance border-shape rule in `web/styles/app.scss` (excluded from the `web/src` hex/px scan) and used `currentColor` so no raw hex is introduced anywhere.
- `ReadOnlyNotice`'s `role="note"` is carried on an outer wrapper because Carbon types `InlineNotification`'s `role` to `alert|log|status` only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Carbon `DatePickerInput`/`labelText` type incompatibilities**
- **Found during:** Task 1 (DateField on Carbon)
- **Issue:** (a) Carbon's `DatePickerInput` types `labelText` via prop-types' `ReactNodeLike`, which the React 18 `ReactNode` union is not assignable to — `tsc` rejected the shared `labelNode()` helper. (b) `DatePickerInputProps` extends `HTMLAttributes<HTMLInputElement>` and omits/unsurfaces `value`/`onChange`/`name`/`required`, so passing them as named props failed typecheck.
- **Fix:** Narrowed `labelNode()`'s return type to `JSX.Element | string` (assignable to both `ReactNode` and `ReactNodeLike`); moved the controlled `value` + raw-string `onChange` to the parent `DatePicker` and passed `name`/`required` through the input's typed rest bag.
- **Files modified:** web/src/components/UswdsForm.tsx
- **Verification:** `npm run typecheck` shows zero errors in UswdsForm.tsx; `npm run build` succeeds.
- **Committed in:** 0ce5696 (Task 1 commit)

**2. [Rule 3 - Blocking] Carbon `InlineNotification` `subtitle` typed `string`, `role` restricted, `children` used instead**
- **Found during:** Task 2 (ErrorSummary + ReadOnlyNotice on Carbon)
- **Issue:** `InlineNotification`'s `subtitle` is typed `string` (cannot carry the JSX link list), and its `role` prop is typed `alert|log|status` only (cannot express `role="note"`).
- **Fix:** Rendered the per-control link list as the notification's `children` (a `ReactNode` slot) instead of `subtitle`; carried `ReadOnlyNotice`'s `role="note"` on an outer wrapper element.
- **Files modified:** web/src/components/ErrorSummary.tsx, web/src/components/states.tsx
- **Verification:** `npm run typecheck` clean for both files; `absence.spec.ts` (raw hex/px scan) 54/54 green.
- **Committed in:** 29eed4e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking, API-shape adaptations to the installed Carbon version). **Impact:** No scope change — both are the plan's own "verify against the installed version, do not assume" instruction in action; the exported names/prop shapes of every component are unchanged.

## Issues Encountered

**Out-of-scope, pre-existing typecheck failure in `web/src/shell/Header.tsx` (owner: plan 07-05).** `npm run typecheck` reports exactly one error — `Header.tsx(35,19): role does not exist on Carbon HeaderProps`. This file is plan **07-05**'s uncommitted, in-flight Carbon shell migration (wave 3, shared branch — the coordination note's concurrency case). It is NOT imported by, rendered by, or edited by 07-06. Proven pre-existing: stashing all 07-06 changes and re-running `typecheck` reproduces the identical single error, and every real consumer of this plan's four files (`SignIn.tsx`, `CaseDetail.tsx`, `DecisionPanel.tsx`, `AuditTrailRegion.tsx`) compiles clean — the prop-shape-preservation guarantee holds. Logged to `deferred-items.md`; owner is 07-05. This is why the plan-level `npm run typecheck` does not report a fully clean exit here.

_Note: e2e specs (`case-detail.spec.ts`, `decision.spec.ts`, `audit-trail.spec.ts`, `sign-in.spec.ts`) still locate these controls by their old `usa-*` classes (e.g. `.usa-tag`, `.usa-alert--error`). Per the plan's threat model (T-07-18) those locators become the Carbon-rendered classes and are updated by each consuming screen's OWN plan (07-07…07-10) — not by this shared-component plan. This plan's `<verify>` deliberately runs only build + typecheck + the two arch specs, not e2e._

## Known Stubs
None found — no TODO/FIXME/placeholder or incomplete implementation in the four rebuilt files. The `placeholder` occurrences in `UswdsForm.tsx` are the legitimate `placeholder` prop of `SelectField`/`DateField`, not stub markers. The `AttributedValue` gap is a deliberately-documented, plan-mandated discrepancy (a comment recording that a TechArch-described type-enforcing wrapper was never built), not an incomplete implementation of this plan's scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Every screen-level redesign plan (07-07 through 07-10) can now import `Field`/`SelectField`/`TextAreaField`/`DateField`/`Fieldset`/`SubmitButton`/`UswdsForm` from `../components/UswdsForm.js`, `ErrorSummary`/`SummaryItem` from `ErrorSummary`, `ProvenanceBadge` from `ProvenanceBadge`, and the five states from `states` — completely unchanged — and get a fully Carbon-rendered result with zero prop-shape edits.
- Each consuming screen plan owns updating its own e2e locators from `usa-*` to the Carbon-rendered classes (T-07-18), and re-signing its accessibility record against the Carbon markup.
- Blocker for a fully-clean plan-level `npm run typecheck`: plan 07-05 must land its Carbon shell fix for `web/src/shell/Header.tsx` (out of 07-06's scope).

## Self-Check: PASSED

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
