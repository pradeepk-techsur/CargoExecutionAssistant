---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 08
subsystem: ui
tags: [carbon, react, table, accessibility, review-queue, uswds-migration, fr-8.3]

# Dependency graph
requires:
  - phase: 07-06
    provides: "web/src/components/states.tsx — Empty/ErrorState/Loading rendered on Carbon with UNCHANGED signatures"
  - phase: 07-05
    provides: "web/src/shell/Shell.tsx — the Carbon application shell the queue renders inside"
provides:
  - "web/src/screens/Queue.tsx rendered on Carbon's plain (non-sortable) table primitives, preserving every FR-8.3 deliberate absence"
  - "e2e/queue.spec.ts updated to the Carbon-rendered locators (table.cds--data-table, cds--inline-notification--error)"
  - "docs/a11y/queue.md re-signed against the Carbon rebuild"
  - "docs/carbon-conformance-register.md rows for the plain-table queue composition"
affects: [07-10, verify-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Carbon PLAIN table composition: Table/TableHead/TableRow/TableHeader/TableBody/TableCell composed by hand with NO isSortable and NO DataTable, so no sort/filter/assign/priority affordance enters the DOM (FR-8.3)"
    - "Carbon TableHeader with no isSortable/onClick early-returns a bare <th scope> — verified against @carbon/react source, not assumed (T-07-22)"

key-files:
  created: []
  modified:
    - web/src/screens/Queue.tsx
    - e2e/queue.spec.ts
    - docs/a11y/queue.md
    - docs/carbon-conformance-register.md

key-decisions:
  - "Use Carbon's plain table primitives (never DataTable, never isSortable) so FR-8.3's mandated absence of sort/filter/assignment/priority is structural, verified in the rendered DOM"
  - "Retain the project-owned scrollable focusable region wrapper around Carbon's Table (Carbon's Table ships no scroll region), preserving the 320px reflow guarantee (FR-2.19)"
  - "Truncation notice moved from usa-alert--info to Carbon InlineNotification kind=info role=status; error state inherited from the Carbon ErrorState (07-06)"

patterns-established:
  - "When a Carbon component family defaults toward a forbidden affordance (DataTable → sortable), drop to the lower-level primitives and verify the forbidden chrome is absent in the rendered DOM by reading the component source"

# Metrics
duration: 8min
completed: 2026-09-17
---

# Phase 7 Plan 08: Carbon Review-Queue Rebuild Summary

**The F8 review queue now renders its receipt-ordered table on Carbon's plain, hand-composed table primitives (never `DataTable`, never `isSortable`), preserving every FR-8.3 deliberate absence — no sort, filter, assignment or priority affordance anywhere in the DOM — with the a11y record re-signed and the Carbon conformance register extended.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-17T02:15:31Z
- **Completed:** 2026-09-17T02:23:50Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Rebuilt `web/src/screens/Queue.tsx` on `@carbon/react`: the open-exceptions
  table is now `Table` / `TableHead` / `TableRow` / `TableHeader` / `TableBody` /
  `TableCell` composed by hand, the truncation notice is a Carbon
  `InlineNotification kind="info"`, and the Refresh / "New cargo entry" controls
  are Carbon `Button`s. `Empty` / `ErrorState` / `Loading` imports from
  `states.tsx` (07-06) are UNCHANGED.
- Resolved the plan's central risk (T-07-22): confirmed by reading
  `@carbon/react`'s `TableHeader` source that a header with no
  `isSortable`/`onClick` early-returns a bare `<th scope="col">` — no sort button,
  no `aria-sort`, no sort icon. No `DataTable` and no `isSortable` prop appears in
  the JSX (the only `DataTable`/`isSortable` tokens in the file are comments
  documenting the prohibition).
- Every behavioural detail preserved unchanged: the mount-effect
  fetch-and-refetch-on-remount, the FR-8.9 loaded/refresh count announcement, the
  assertive load-failure announcement, the 500-row truncation notice, the
  empty-state routing to `/entries/new`, the `MissingReference` defensive
  fallback, and receipt-order rendering (never re-sorted client-side).
- Updated `e2e/queue.spec.ts` locators to the Carbon-rendered equivalents
  (`table.cds--data-table`, `[role="alert"].cds--inline-notification--error`).
- Re-signed `docs/a11y/queue.md` against the Carbon rebuild (re-sign note,
  re-sign-time evidence set, updated checklist citations, new date/statement).
- Appended the queue's rows and a Notes paragraph to
  `docs/carbon-conformance-register.md`, additively (the 07-05/07-06/07-09 rows
  above were preserved untouched).

## Task Commits

Because this plan shared one working tree with the parallel wave-4 plans (07-07
and 07-09), the atomic per-task commit for this plan was disrupted by a branch
race (see Deviations). The plan's deliverables are nonetheless all present and
verified in `HEAD` on `phase-7`:

- `web/src/screens/Queue.tsx` (Carbon rebuild), `e2e/queue.spec.ts` (Carbon
  locators) and `docs/a11y/queue.md` (re-signed) landed in `cb06e36`
  (`feat(07-07): rebuild NotBuiltYet and NotFound on Carbon`) — a concurrent
  sibling commit that ran `git add` across the shared working tree and captured
  this plan's in-flight files.
- `docs/carbon-conformance-register.md` (the queue rows + Notes paragraph) landed
  in `e31d204` (`feat(07-07): re-commit SignIn Carbon rebuild + register/a11y
  after concurrent branch race`).

_Verification confirms all four deliverables are present in `HEAD` (see
Self-Check)._

## Files Created/Modified

- `web/src/screens/Queue.tsx` — F8 review-queue screen rebuilt on Carbon plain
  table primitives; states/shell imports unchanged.
- `e2e/queue.spec.ts` — Carbon-rendered locators (`table.cds--data-table`, the
  Carbon error `InlineNotification`); all 8 scenarios unchanged in intent.
- `docs/a11y/queue.md` — re-signed against the Carbon rebuild (re-sign note +
  re-sign evidence set + updated checklist citations).
- `docs/carbon-conformance-register.md` — three additive rows (queue table,
  truncation notice, Refresh/New-cargo-entry actions) + a Notes paragraph on the
  plain-table composition.

## Decisions Made

- **Plain primitives over `DataTable`:** `DataTable` ships batteries-included
  sortable chrome by default, which FR-8.3 forbids. The lower-level primitives —
  the same building blocks `DataTable` uses internally — render a plain table
  with no sort/filter toolbar, so the mandated absence is structural, not a
  runtime opt-out.
- **Kept the scrollable focusable region wrapper:** Carbon's `Table` provides no
  scroll region of its own, so the project's `role="region"` / `tabIndex={0}` /
  `aria-label="Open exceptions table"` wrapper was retained around it to preserve
  the 320px reflow guarantee (FR-2.19).

## Deviations from Plan

### Deviation

**1. [Rule 3 - Blocking] Playwright global-setup `docker compose up -d db`
requires `AI_PROVIDER_URL` to be set in the shell environment**
- **Found during:** Task 1 (running `e2e/queue.spec.ts`)
- **Issue:** `e2e/global-setup.ts` runs `docker compose up -d db`, and the
  07-02 mandatory-variable guard (`${AI_PROVIDER_URL:?...}`) on the `web` compose
  service makes `docker compose` refuse to interpolate the file — and therefore
  refuse the `db`-only `up` — unless `AI_PROVIDER_URL` is present in the shell
  environment. `e2e/env.ts` hard-codes `AI_PROVIDER_URL=fake:deterministic` for
  the *webServer*, but global-setup's compose call inherits only the raw shell
  env.
- **Fix (workaround, not a code change):** ran the Playwright suite with
  `AI_PROVIDER_URL=fake:deterministic` exported in the shell. This is a
  test-tooling friction, not a defect in this plan's files; no source change was
  made for it and it is out of scope for the queue rebuild. Logged for the owning
  plan/verify phase.
- **Files modified:** none.
- **Verification:** `e2e/queue.spec.ts` ran 8/8 with the var set.

---

**Total deviations:** 1 (1 blocking, resolved via an environment workaround with
no source change). **Impact on plan:** none on the queue rebuild itself.

## Issues Encountered

**Concurrent branch race across the shared working tree (wave 4).** Plans 07-07,
07-08 (this plan) and 07-09 execute in parallel against a single working
directory on `phase-7`. During this run, sibling agents ran broad `git add` /
committed while this plan's files were modified but not yet committed, twice
sweeping this plan's changes (first `Queue.tsx`/`queue.spec.ts`/`queue.md`, then
the register) into sibling commits (`cb06e36`, `e31d204`), and once resetting the
working-tree register back to a state without this plan's rows (which were then
re-applied additively). The net effect is that this plan produced no
independently-authored commit under a `07-08` message, but **all of its
deliverables are present and verified in `HEAD`**. This is a platform-level
parallel-execution hazard (shared working tree + broad staging), not a content
error; it is called out here so the post-plan gate and verify phase can confirm
the queue deliverables by content rather than by commit message.

## Known Stubs

None found — the rebuilt `Queue.tsx` implements the full screen (loading /
error / empty / truncated / loaded table) with no `TODO`/`FIXME`/placeholder and
no hardcoded/stubbed data path.

## User Setup Required

None - no external service configuration introduced by this plan.

## Next Phase Readiness

- The review queue is fully Carbon-rendered with its FR-8.3 deliberate absences
  intact and its a11y record re-signed. Remaining Phase 7 UI-migration work
  (07-10 and any final USWDS cleanup) is unblocked.
- **Note for verify-work:** because of the wave-4 branch race, verify the queue
  deliverables by content (Queue.tsx Carbon primitives with no
  `DataTable`/`isSortable` usage; `e2e/queue.spec.ts` Carbon locators; re-signed
  `docs/a11y/queue.md`; queue rows in `docs/carbon-conformance-register.md`)
  rather than by a `07-08`-named commit.

## Self-Check: PASSED

- `07-08-SUMMARY.md` exists on disk. ✓
- `HEAD:web/src/screens/Queue.tsx` renders `<Table>` (Carbon plain primitive) and
  contains NO `<DataTable>` / `isSortable=` JSX usage (only prohibition comments). ✓
- `HEAD:e2e/queue.spec.ts` uses the Carbon locators (`cds--data-table`,
  `cds--inline-notification--error`). ✓
- `HEAD:docs/a11y/queue.md` re-signed (10× `2026-09-17`). ✓
- `HEAD:docs/carbon-conformance-register.md` contains 4 `Review-queue` mentions
  (3 table rows + 1 Notes bullet), additive to sibling rows. ✓
- Build check: `npm run build` → exit 0; `npm run typecheck` → exit 0. ✓
- `npx vitest run server/test/architecture/navigation.spec.ts` → 11/11 passed. ✓
- `npx playwright test e2e/queue.spec.ts` → 8/8 passed. ✓
- Known Stubs: none found. ✓

Caveat (documented under Issues Encountered): deliverables are verified by
content in `HEAD`, not by a `07-08`-named commit, due to the wave-4 shared
working-tree branch race.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
