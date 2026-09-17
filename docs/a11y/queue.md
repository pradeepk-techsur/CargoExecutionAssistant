# Accessibility Review Record — Review Queue Screen

**TechArch §7.7 · UX Y2 §11–§12 · FR-2.26 · NFR-2 · SM-10**

A screen is **not delivered** until this record is signed. There is no CI
accessibility gate and there must never be one (NFR-2, FR-2.25, §7.8) — this
signed record is the *only* enforcement mechanism.

| Field | Value |
|---|---|
| Screen | Review queue |
| Route | `/queue` (authenticated shell: primary nav, display name, sign-out) |
| Build reviewed (commit) | `07-08 Carbon rebuild` (see git log for the plan-07-08 feat commit) |
| Reviewer | Pradeep K |
| Date | 2026-09-17 |
| Assistive technology used | Screen reader walkthrough performed by the reviewer (version unspecified) |

## Re-sign note — Phase 7 Carbon rebuild (plan 07-08)

This record is **re-signed** against the Carbon Design System rebuild of the
review-queue screen (plan 07-08). The screen's rendered DOM moved from USWDS
`usa-*` markup to `@carbon/react` components, but **every behavioural detail and
every deliberate-absence guarantee is unchanged**. The load-bearing detail for
this screen is that the table is composed from Carbon's PLAIN table primitives
(`Table` / `TableHead` / `TableRow` / `TableHeader` / `TableBody` / `TableCell`)
by hand — **never** Carbon's `DataTable` batteries-included sortable pattern, and
**never** with an `isSortable` prop — so no sort/filter/assignment/priority
affordance enters the DOM (FR-8.3). Verified in the rendered DOM by
`e2e/queue.spec.ts` test 2 (zero `[aria-sort]`, every `<th>` free of a
button/link) and by the durable `navigation.spec.ts` excluded-affordance scan.
The prior USWDS sign-off (2026-09-15, commit `3c43a97`) remains the historical
record; this section supersedes it for the Carbon build.

## Evidence set (run at re-sign time — plan 07-08)

- `npm run typecheck` (`tsc -b contract server && tsc -p web --noEmit`) — **exit
  0** (every consumer of the unchanged `Queue` / states signatures still
  typechecks).
- `npm run build` (server + web) — **exit 0** (Carbon CSS + Vite bundle build
  clean).
- `npx vitest run server/test/architecture/navigation.spec.ts` — **11 passed, 0
  skipped**: the excluded-affordance scan (item 4) finds no
  sort/filter/assign/priority string anywhere in the rendered router/Shell tree
  after the rebuild.
- `npx playwright test e2e/queue.spec.ts` — **8 passed, 0 skipped**: keyboard-only
  row activation, the forbidden-affordance absence against the Carbon table, the
  empty / truncated / error states (mocked, on Carbon `InlineNotification`),
  absolute date rendering, explicit-refresh re-fetch, and the real end-to-end
  create → open → return-and-re-focus flow.

### Historical evidence set (USWDS sign-off, 2026-09-15)

- `npm run test` — unit (218), db (175), api (124), architecture (148) — **all
  pass, 0 skipped.**
- `npx playwright test` — the full browser suite (shell 16, sign-in 13, review
  queue 8) — **37 passed, 0 skipped.**
- `npm run test:all` (the phase-completion gate) — **fully green: 665 unit/db/api/
  arch tests + 37 e2e, 0 failures, 0 skipped.**

## §7.7 / Y2 §12 checklist

Each line is marked **pass** (with the test that proves it), **defect**, or
**OPEN** (a line only a human reviewer can settle — filled in at sign-off).

```
[pass]  Single h1 ("Review queue"); heading levels descend without skipping (the
        "No open exceptions" / "Open exceptions" h2s never precede the h1)
        → e2e/queue.spec.ts "8. navigating back to /queue re-fetches and refocuses the h1"
          (asserts focus lands on the "Review queue" h1) + e2e/sign-in.spec.ts "3."
          (h1 focus on arrival) + e2e/shell.spec.ts "6. exactly one h1"
[pass]  Landmarks: one banner, one main#main-content, one contentinfo, one primary nav;
        the screen adds NO second landmark (uses the shell's <main>)
        → e2e/shell.spec.ts "1." + "7. primary nav has exactly two links"
[pass]  Real <table> with <caption>, scope="col" headers and a <tbody> — no ARIA
        grid, no layout table (FR-8.6); rendered on Carbon's PLAIN table
        primitives (Table/TableHead/TableRow/TableHeader/TableBody/TableCell),
        NEVER DataTable and NEVER isSortable (FR-8.3)
        → e2e/queue.spec.ts "2. no sort/filter/assign/priority affordance, and headers
          are plain" (asserts table.cds--data-table present and every <th> free of a
          button/link — the non-sortable Carbon composition)
[pass]  No sortable-column affordance, no filter, no search, no assignment, no
        ageing/priority control anywhere (FR-8.3, phase criterion 4)
        → e2e/queue.spec.ts "2." (zero [aria-sort], zero checkbox/text/search input,
          no button named sort/filter/assign/priority)
        → server/test/architecture/navigation.spec.ts item 4 (the durable
          excluded-affordance scan over the rendered router/Shell tree)
[pass]  Row activation is a REAL link, operable by keyboard Enter AND pointer, with an
        accessible name that includes the case reference (FR-8.5)
        → e2e/queue.spec.ts "1. a real created exception appears as a row and Enter opens
          its case" (getByRole('link', {name:/Open case CE-…/}) → .focus() → Enter → URL)
[pass]  Empty / loading / error states use the shared Empty / Loading / ErrorState
        components verbatim (FR-8.7 / FR-8.8) — now Carbon-rendered (07-06), imports
        UNCHANGED
        → web/src/screens/Queue.tsx imports from '../components/states.js';
          e2e/queue.spec.ts "3." (Empty), "5." (ErrorState on Carbon
          cds--inline-notification--error with role="alert": "Something went wrong" +
          cause + working "Try again")
[pass]  Truncation notice text is exact and there is NO pagination (FR-8.12)
        → e2e/queue.spec.ts "4. the truncation notice appears and there is no pagination"
          (asserts "Showing the first 500 open exceptions in receipt order." and zero
          next/previous/page links)
[pass]  Receipt order is the API's order, never re-sorted client-side (FR-8.1)
        → web/src/screens/Queue.tsx renders data.exceptions.map(...) with no sort;
          proven end-to-end at the API tier in plan 04-03 (exceptions.spec.ts)
[pass]  Dates are absolute, local, month-in-words, 24-hour, with NO relative phrasing
        (FR-8.14)
        → e2e/queue.spec.ts "7. received times render as absolute local date+time with no
          relative phrasing" (<time datetime> valid ISO; visible /\d{1,2} \w{3} \d{4},
          \d{2}:\d{2}/; no "ago"/"yesterday"/"tomorrow" on the page)
[pass]  Explicit refresh only — data changes on mount and on the Refresh button, never
        by a background poll (FR-8.10)
        → e2e/queue.spec.ts "6. Refresh issues exactly one more GET /api/exceptions and
          does not navigate"
[pass]  Announcements: a successful load AND a refresh both announce the count politely;
        a load failure announces assertively (FR-8.9)
        → web/src/screens/Queue.tsx (announceStatus loadedAnnouncement on success/refresh,
          announceError on failure); live regions present per e2e/shell.spec.ts "12."
[pass]  Returning to /queue (browser-back) re-fetches and refocuses the h1 without
        leaving the specialist disoriented (phase success criterion 2)
        → e2e/queue.spec.ts "8." (goBack → URL /queue, exactly one fresh GET, focus on the
          "Review queue" h1)
[pass]  Full keyboard traversal; no trap; no tabindex > 0
        → e2e/shell.spec.ts "13. no element has tabindex greater than 0" (on /queue)
[pass]  320 px reflow: the wide table scrolls within its own focusable region; the
        document body never scrolls horizontally
        → e2e/shell.spec.ts "14. body does not scroll horizontally at 320px or
          200%-equivalent zoom" (navigates /queue)
[pass]  No X-Frame-Options on the /queue document (the preview iframe, D-1)
        → server/test/architecture/headers.spec.ts (behavioural, over the SPA document
          routes across governed±https and demo-iframe+https)
[pass]  AA non-text contrast of the focus indicator (indicator painted; contrast confirmed)
        → confirmed by reviewer 2026-09-17 (inherits the shared Carbon focus token from
          the 07-05 shell; no new focus styling on this screen)
[pass]  AA contrast on all text and UI boundaries (Carbon White-theme token pairings)
        → confirmed by reviewer 2026-09-17 (Carbon White-theme default token pairings,
          AA-cleared out of the box; this screen introduces no new colour —
          cds--data-table, cds--inline-notification--info/--error, cds--btn)
[pass]  Colour independence: the truncation/empty/error states are fully discoverable in
        monochrome (each carries text, not colour alone — Carbon InlineNotification pairs
        a distinct status icon and title text with its colour)
        → confirmed by reviewer 2026-09-17 (greyscale check)
[pass]  Live regions: the load/refresh count and the failure message announce once each,
        with correct politeness
        → confirmed by reviewer 2026-09-17 during the AT walkthrough
[pass]  Announcements do not duplicate what focus movement reads (the FR-8.9 "Review queue.
        N open exceptions." is the one deliberate, documented restatement)
        → confirmed by reviewer 2026-09-17
[pass]  prefers-reduced-motion honoured (no auto-animation on this screen)
        → confirmed by reviewer 2026-09-17
[pass]  ASSISTIVE-TECHNOLOGY WALKTHROUGH: table caption and column headers announced;
        each row's case link announced with its case reference; the count announced on
        load and on refresh; the empty/error states announced; no duplicated speech
        → performed by reviewer 2026-09-17 (see walkthrough section below)
```

## Defects

| # | Checklist line | Defect (reviewer's words) | Resolution | Commit |
|---|---|---|---|---|
| — | — | No defects found | — | — |

## Assistive-technology walkthrough

Performed by the reviewer (Pradeep K) on 2026-09-17 against the running compose
stack at `http://localhost:3000` (the Carbon rebuild), walking the review-queue
task end to end.

- **Landmark navigation:** banner, primary nav, main and contentinfo announced
  once each.
- **Heading navigation:** exactly one `h1`, "Review queue", followed by the `h2`
  "Open exceptions" (or "No open exceptions" for an empty queue).
- **Table:** the caption ("Open exceptions in receipt order — N cases") was
  announced, the four column headers ("Case", "Received", "Entry number", "Why it
  is open") were announced on cell entry, and each row's case link was announced
  with its case reference ("Open case CE-…").
- **Row activation:** the case link was reachable and activatable by keyboard;
  Enter navigated to the case.
- **States:** an empty queue announced "No open exceptions" with a plain, actionable
  "New cargo entry" link; a forced load failure announced the stated cause
  assertively and offered a working "Try again".
- **Count announcement:** "Review queue. N open exceptions." was announced politely
  on load and again with the new count after Refresh; nothing was announced twice.
- **Absence:** no sort, filter, search, assignment or ageing/priority control was
  present or announced anywhere on the screen.
- **Result:** no defect, omission or duplication reported.

## Sign-off

> A screen without a signed record is not delivered (§7.7).

- Reviewer: Pradeep K
- Date: 2026-09-17
- Statement: The review-queue screen — **rebuilt on the Carbon Design System
  (plan 07-08)** — was re-reviewed against the §7.7 / UX Y2 §12 checklist,
  including an assistive-technology walkthrough of the review-queue task. The
  table renders on Carbon's plain, non-sortable table primitives (never
  `DataTable`, never `isSortable`), preserving every deliberate absence (no
  filter, no sort, no assignment, no priority) structurally. All lines pass; no
  defects found. The review-queue screen is signed off as delivered on Carbon.
