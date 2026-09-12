## Screen 3: Review queue

| | |
|---|---|
| **Route** | `/queue` — also the post-sign-in landing route |
| **Feature** | F8 on the F2 shell |
| **Purpose** | Show the open exceptions as **one list in strict receipt order** and let the specialist open one. Nothing else. |
| **User stories** | US-8.1, US-8.2, US-8.3, US-8.4, US-8.5, US-8.6, US-7.1, US-7.2, US-7.3, US-2.2 |
| **Document title** | `Review queue — CargoExec` |

---

### Layout — populated (desktop ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ usa-banner ▸ An official website of the United States government             │
│ ⤷ Skip to main content                                                       │
│ CargoExec │ Review queue ●│ New cargo entry │       A. Rivera   [Sign out]    │
├──────────────────────────────────────────────────────────────────────────────┤
│ <main id="main-content">                                                     │
│                                                                              │
│  h1  Review queue                                             tabindex="-1"  │
│  Open exceptions, oldest first by receipt. Open a case to review its AI      │
│  recommendation and record your decision.                                    │
│                                                                              │
│  11 open exceptions                        [ Refresh ]  ← usa-button--outline│
│                                                                              │
│  <table class="usa-table usa-table--borderless">                             │
│  <caption>Open exceptions in receipt order — 11 cases</caption>              │
│  ┌──────────────────┬──────────────────────────┬──────────────┬────────────┐ │
│  │ Case             │ Received                 │ Entry number │ Why it is  │ │
│  │ (th scope=col)   │ (th scope=col)           │ (th scope=col)│ open      │ │
│  ├──────────────────┼──────────────────────────┼──────────────┼────────────┤ │
│  │ CE-2026-000131   │ 11 September 2026,       │ ABC12345670  │ Enter the  │ │
│  │ ↑ <a> "Open case │ 9:04 a.m. EDT            │              │ port of    │ │
│  │   CE-2026-000131"│ <time datetime="…">      │              │ entry code.│ │
│  │                  │                          │              │ and 2 more │ │
│  │                  │                          │              │ (3 rules)  │ │
│  ├──────────────────┼──────────────────────────┼──────────────┼────────────┤ │
│  │ CE-2026-000134   │ 11 September 2026,       │ Not provided │ Describe   │ │
│  │                  │ 10:41 a.m. EDT           │ ↑ never blank│ the goods. │ │
│  │                  │                          │              │ (1 rule)   │ │
│  ├──────────────────┼──────────────────────────┼──────────────┼────────────┤ │
│  │ CE-2026-000137   │ 11 September 2026,       │ abc12345678  │ Enter the  │ │
│  │                  │ 2:32 p.m. EDT            │              │ port …     │ │
│  └──────────────────┴──────────────────────────┴──────────────┴────────────┘ │
│                                                                              │
│  New cargo entry     ← secondary link to /entries/new                        │
│                                                                              │
│  ── deliberately not here ────────────────────────────────────────────────── │
│  no search box · no filter chips · no date range · no "show closed" toggle   │
│  no sortable headers (no aria-sort, no arrows) · no priority or severity     │
│  column · no age / days-open column · no assignee column · no "assign to me" │
│  no checkboxes · no bulk action bar · no per-row overflow menu · no counts-  │
│  as-dashboard · no pagination                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Why the controls are deliberately absent

This is the screen a reviewer is most likely to think is unfinished. It is not. Each absence is
a recorded product decision (`.planning/PROJECT.md` "Out of Scope"; PRD §10 #2, #4; US-8.5,
US-7.3, SM-14):

| Missing control | Why it is not there |
|---|---|
| **Filter / search** | A receipt-ordered list is sufficient to demonstrate *queue → open → decide*. Filtering is the first step of queue management, which is a different product. `GET /api/exceptions` accepts **zero** query parameters and rejects any with `400 UNSUPPORTED_QUERY_PARAMETER`, so a filter control would have nothing to call. |
| **Sort headers** | Receipt position is the *only* ordering dimension and it is immutable, assigned at exception creation. A sortable header would imply an ordering the data model does not have — the USWDS sortable-table variant is explicitly not used (US-5.2, FR-8.3). |
| **Assignment / "claim" / reassignment** | There is one authenticated role and no `assigned_to` column anywhere in the schema. Ownership is not modelled, so it cannot be displayed. |
| **Prioritisation / severity / risk score** | Findings carry no severity, weight, score or rank, and validation outcomes are not graded — an entry either satisfies every applicable rule or it does not (US-4.2). A priority badge would be fabricated information. |
| **Metrics, counts-as-dashboard, aging** | Queue health, volume, throughput, workload and aging are excluded. The single "11 open exceptions" count exists **only** as the table's accessible row count, not as a metric; relative phrasing ("2 days ago") is never used because that is aging language (US-8.5, FR-8.14). |
| **Closed-case browsing** | The queue means exactly "what still needs a decision". A closed case is reached by its reference (US-7.2). |
| **Auto-refresh / polling** | Rows moving under a keyboard or screen-reader user mid-read is an accessibility failure, and a live-updating queue is the beginning of queue-health monitoring. Refresh is explicit (US-8.1, FR-8.10). |

### Layout — empty (the normal starting state of a demonstration)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  h1  Review queue                                                            │
│  Open exceptions, oldest first by receipt.                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  h2  No open exceptions                                                │  │
│  │  Every exception has been decided. Create a cargo entry to start a new │  │
│  │  case.                                                                 │  │
│  │  [ New cargo entry ]                                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ↑ F2 `Empty` component. NOT an error. No empty table skeleton is rendered,  │
│    and the copy never suggests a filter is hiding results.                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Information hierarchy

| Priority | Content | Placement |
|---|---|---|
| Primary | The ordered table; the case-reference link in each row | Centre of `main`, full width |
| Primary (empty) | "No open exceptions" + the route to create one | Replaces the table |
| Secondary | The row count "11 open exceptions" / table `<caption>` | Directly above the table |
| Secondary | The one-sentence explanation of what the list is and how it is ordered | Under the `h1` |
| Secondary | "Refresh" | After the count, before the table |
| Tertiary | "New cargo entry" secondary link | Below the table |
| Tertiary | Truncation notice, when `truncated: true` | `usa-alert--info` above the table |
| **Absent** | Every control listed in the table above | — |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Default (populated)** | Table in server order, one row per open exception | Screen `h1` on arrival | Polite: "Review queue. 11 open exceptions." |
| **Loading** | F2 `Loading` with `aria-busy="true"` on the table region (only after 300 ms) | Unchanged | Polite: "Loading…" |
| **Empty** | F2 `Empty` component with the "New cargo entry" call to action — **not** an error | Screen `h1` | Polite: "No open exceptions." |
| **Load error (5xx / network)** | F2 `ErrorState`: *"We could not load the review queue."* + "Try again" | Error region | Assertive |
| **Truncated (> 500)** | `usa-alert--info`: *"Showing the first 500 open exceptions in receipt order."* **No pagination control is offered** | Unchanged | Polite, with the count |
| **Returning after a decision** | The decided row is gone; the count is lower | Screen `h1` | Polite: "Case CE-2026-000137 was resolved and is no longer in the queue. 10 open exceptions remain." — so a vanished row never reads as a lost case (US-8.4) |
| **Refresh activated** | Table re-fetched in place; the button shows a busy state | Stays on the "Refresh" button | Polite: the new count, only when it changed |
| **Session expired** | Redirect to `/sign-in?next=/queue` | Sign-in `h1` | Polite |
| **Malformed row** (missing/invalid case reference) | The row renders **without** a link and a client-side warning is logged — never a broken route, never a dropped row | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| Case reference | `<a href="/cases/{ref}">` inside the Case cell | Accessible name "Open case CE-2026-000137"; operable by pointer and `Enter`; a **real link**, so middle-click, copy-link and screen-reader link navigation all work. The `<tr>` is **not** a JS click target (US-8.2, FR-8.5) |
| "Refresh" | `usa-button--outline` | Re-fetches the list; the only other interactive element on the screen besides the links |
| "New cargo entry" (secondary + empty-state) | `usa-button--unstyled` link / `usa-button` primary | Navigates to `/entries/new` |
| Column headers | plain `<th scope="col">` | **Not** buttons, **not** links, no `aria-sort`, no sort arrows |

Nothing on this screen mutates state. The only interactive elements are links plus "Refresh".

### Accessibility (screen-specific)

- **Landmarks & headings:** shell landmarks; exactly one `h1` "Review queue"; the empty state
  introduces one `h2`. No level skipped.
- **Table semantics:** a real `<table>` with `<caption>` "Open exceptions in receipt order —
  {n} cases", `<thead>` with `scope="col"` headers and `<tbody>` rows. No layout table, no ARIA
  grid roles, no virtualised rendering — so screen-reader table mode reads each cell with its
  column header (US-8.1).
- **Programmatic row count:** carried by the caption *and* the visible count, so the size of
  the list is knowable without traversing it (JRN-01.7 "Traverse the queue").
- **Focus management:** focus moves to the `h1` on arrival and on return from a case; "Refresh"
  keeps focus on itself so the specialist is not thrown to the top of a re-rendered table.
- **Live regions:** polite for load, count changes, refresh and post-decision removal;
  assertive for a load failure.
- **Keyboard-only path:** Tab → "Refresh" → first case link → … → `Enter` opens the case.
  `Shift+Tab` returns. No trap, no `tabindex > 0`.
- **Never reorders under the user:** no polling, no push, no auto-refresh (FR-8.10).
- **Dates:** absolute, month in words, time-zone abbreviation shown, machine-readable
  `<time datetime="…">`; relative/aging phrasing never used (US-8.5).
- **Escaping:** `failure_summary` is rendered as escaped text, never as HTML.
- **Zoom / reflow:** see `Y1-responsive.md` — below 640 px the table is re-flowed to stacked
  row cards with `<th scope="row">`-style labels while remaining a real table.
- **Colour independence:** no row is colour-coded; "Why it is open" is plain text and the row
  count is plain text.

### Acceptance checkpoints

1. Rows match the API order exactly; the client never re-orders, re-groups or re-ranks (US-8.1).
2. The rendered DOM contains no `aria-sort`, no sort icon, no search input and no checkbox
   (US-8.5).
3. A case opens by tabbing to its link and pressing `Enter` (US-8.2).
4. With zero open exceptions the empty state renders with a working "New cargo entry" link and
   no table (US-8.3).
5. The rendered response contains no representation of a closed case (US-7.2).
