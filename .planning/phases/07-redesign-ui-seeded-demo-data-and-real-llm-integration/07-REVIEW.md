---
phase: 7
status: clean
blockers: 0
warnings: 0
files_reviewed: 2
files_reviewed_list:
  - web/styles/app.scss
  - web/src/screens/Queue.tsx
reviewed_at: 2026-09-17T03:07:42Z
iteration: 2
---

# Phase 7 Code Review — Iteration 2 (re-review of iteration-1 fixes)

Iteration 1 filed two WARNINGs, one root cause: the USWDS removal (plan 07-11)
deleted the stylesheet that had supplied the page-content-container layout
classes, but left the components emitting those class names, so `.grid-container`
(W1) and `.cargoexec-prose` / the non-existent `.cds--content-prose` (W2) were
undefined in the shipped CSS.

Re-review scope = the previous `files_reviewed_list` **restricted to the two
files the fixer touched** (commits 7def176, 2b42397): `web/styles/app.scss` and
`web/src/screens/Queue.tsx`. The other 37 files reviewed at iteration 1 carried
no BLOCKERs/WARNINGs and were not touched by the fixer, so they are unchanged and
out of this iteration's scope. Both fixes are verified below against the freshly
recompiled `web/public/assets/app.css`; no regressions found.

## BLOCKERs

None.

## WARNINGs

None.

## Previous findings — verification

### W1 (grid-container undefined) — RESOLVED, verified
- **Fix:** 7def176 added a project-owned `.grid-container` rule to
  `web/styles/app.scss:69-74` (`max-inline-size: 80rem`, `margin-inline: auto`,
  `padding-inline: var(--cds-spacing-05)`, `padding-block: var(--cds-spacing-07)`).
  Shell.tsx wrapper (`<div className="grid-container">`, Shell.tsx:58) left
  unchanged — style-only fix, no component behaviour change, as directed.
- **Verified against compiled output:** re-ran `npm run build:css` (dart-sass,
  clean apart from Carbon's own upstream deprecation warnings). `grep -c
  '\.grid-container' web/public/assets/app.css` → **1** (was 0). The two spacing
  tokens the rule references resolve in the same compiled file:
  `--cds-spacing-05: 1rem`, `--cds-spacing-07: 2rem` (both present, non-empty), so
  the `var()`s are not dangling. No raw hex/px introduced (FR-2.2 posture held).

### W2 (cargoexec-prose / cds--content-prose undefined) — RESOLVED, verified
- **Fix:** 2b42397 added a project-owned `.cargoexec-prose` rule to
  `web/styles/app.scss:89-95` (`max-inline-size: 42rem` reading-width cap; a
  `> * + *` owl selector giving `margin-block-start: var(--cds-spacing-05)`
  vertical rhythm), and changed `Queue.tsx:93` from the non-existent
  `cds--content-prose` to `cargoexec-prose` so Queue and CaseDetail share one
  resolved class, exactly as the fix direction required.
- **Verified against compiled output:** `grep -c 'cargoexec-prose'
  web/public/assets/app.css` → **2** (base rule + the `> * + *` child selector;
  was 0). `grep -c 'content-prose'` → **0** — the dead class is fully gone from
  the CSS. `grep` across `web/src` confirms **no** remaining `cds--content-prose`
  emitter anywhere; the five surviving `cargoexec-prose` emitters (Queue,
  CaseDetail, states.Empty, NotBuiltYet, NotFound) now all resolve to the one
  defined rule. `tsc -p web/tsconfig.json --noEmit` → exit 0 (the Queue.tsx
  className edit is type-clean).

## Regression checks on the fixer's two files

- **Selector scope of `.cargoexec-prose > * + *`:** direct-child adjacent-sibling
  (owl) — applies only to top-level children of the prose wrapper, not to nested
  Carbon component internals (tables, buttons, notifications). It cannot reach
  inside Queue's `Table` or CaseDetail's `dl`, so no Carbon-internal spacing is
  clobbered. Correct, conventional prose-rhythm pattern. OK.
- **Nesting of the two new containers:** Shell renders
  `<main><div class="grid-container">…screen…</div></main>`, and each screen
  renders its content inside `<div class="cargoexec-prose">`. `grid-container`
  (80rem page cap + gutters) cleanly wraps `cargoexec-prose` (42rem reading cap) —
  the inner cap is tighter than the outer, so they compose without conflict and
  neither reintroduces a horizontal-scroll/reflow issue. OK.
- **Queue.tsx className swap — behaviour:** the edit is a single className string
  change on the outermost wrapper `<div>`; no change to state, effects, data flow,
  the plain-Carbon-table composition, focus handling, or announcements. The rest
  of the file is byte-identical to iteration 1. No behavioural regression. OK.
- **FR-2.2 (no raw hex / no raw px in screen-level style):** both new rules use
  Carbon spacing tokens for spacing; the two `max-inline-size` values are `rem`
  reading-width caps (a length Carbon exposes no token for) and no colour literal
  is introduced. Consistent with the file's existing documented posture. OK.
- **Build integrity:** `build:css` compiles clean and `tsc` passes; no new files,
  no removed rules, the other `web/styles/app.scss` rules (provenance badge,
  detail list, decision actions, audit rowhead, reduced-motion) are untouched. OK.

## Cross-file seams checked (this iteration)
- `.grid-container` emitter (Shell.tsx:58) ↔ rule (app.scss:69) ↔ compiled CSS — OK (1 rule, resolves).
- `.cargoexec-prose` emitters (Queue/CaseDetail/states/NotBuiltYet/NotFound) ↔ rule (app.scss:89) ↔ compiled CSS — OK (single shared rule, all five resolve).
- `.cds--content-prose` — OK, fully removed: 0 emitters in web/src, 0 occurrences in compiled CSS.
- `var(--cds-spacing-05/07)` in the two new rules ↔ Carbon token definitions in compiled CSS — OK (both defined, non-empty).

## Verdict
Both iteration-1 WARNINGs are genuinely fixed (verified against recompiled CSS
and a clean typecheck, not the commit messages), and the fixes introduced no
regressions. Phase 7 is **clean**.
