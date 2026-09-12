## Epic 8: Review Queue Web UI (F8)

Screen `/queue`, also the post-sign-in landing route. A single USWDS table in receipt order.

### US-8.1: See the open exceptions as an accessible list in receipt order
**As a** cargo specialist, **I want to** see every open exception in one table ordered by receipt, with enough on each row to tell cases apart, **so that** I can pick up the next case without deciding which case to work.

**Acceptance Criteria:**
- [ ] Given three open exceptions, when `/queue` renders, then rows appear oldest-first by receipt in the exact order the API returned them, and the client does not re-order, re-group, or re-rank them for any reason.
- [ ] Given the screen, when it renders, then it shows one `<h1>` "Review queue", the sentence "Open exceptions, oldest first by receipt. Open a case to review its AI recommendation and record your decision.", and a visible count "{n} open exceptions" (singular for 1).
- [ ] Given the table, when its markup is inspected, then it is a real `<table>` with `<caption>` "Open exceptions in receipt order — {n} cases", `<thead>` with `scope="col"` headers, and `<tbody>` rows — no layout table, no ARIA grid roles, no virtualised rendering.
- [ ] Given each row, when it renders, then it shows exactly four columns: Case (the reference as a link), Received, Entry number, and Why it is open (the failure summary with the finding count).
- [ ] Given a row whose `entry_number` is null, when it renders, then the cell reads "Not provided" rather than being blank; the failure summary is rendered as escaped text, never as HTML.
- [ ] Given a successful load, when it completes, then the polite live region announces "Review queue. {n} open exceptions."; given a load failure, the `ErrorState` renders "We could not load the review queue." with "Try again", announced assertively.
- [ ] Given demonstration load, when the screen renders, then it completes within 2 seconds.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.2: Open a case from the queue with the keyboard
**As a** cargo specialist, **I want to** open a case by tabbing to its row link and pressing Enter, **so that** I can start work on a case without a pointer and with a link I can also copy or middle-click.

**Acceptance Criteria:**
- [ ] Given a row, when I tab to the link in its Case cell and press `Enter`, then I navigate to `/cases/{case_reference}`.
- [ ] Given the row, when its markup is inspected, then the whole `<tr>` is not a click target with a JavaScript handler standing in for a link, so middle-click, copy-link, and screen-reader link navigation all work.
- [ ] Given the link, when a screen reader reads it, then its accessible name includes the case reference (for example "Open case CE-2026-000137").
- [ ] Given a screen reader's table navigation, when I traverse the table, then the caption, the row count, and each row's four cells with their column headers are reported.
- [ ] Given a row whose `case_reference` is missing or malformed, when it renders, then it renders without a link and logs a client-side warning rather than producing a broken route.
- [ ] Given the F2 accessibility checklist, when this screen is signed off, then the record includes traversing the table with a screen reader and opening a case using the keyboard alone (SM-10, SM-11).

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.3: Be told plainly when there is nothing to work, and be shown where to start
**As a** cargo specialist, **I want to** see a clear empty state with a route to the entry form when no exceptions are open, **so that** the normal starting state of a demonstration is obvious rather than looking like a failure or a hidden filter.

**Acceptance Criteria:**
- [ ] Given zero open exceptions, when `/queue` renders, then the `Empty` component shows `<h2>` "No open exceptions", the sentence "Every exception has been decided. Create a cargo entry to start a new case.", and a primary link "New cargo entry".
- [ ] Given the empty state, when it renders, then no table skeleton is shown, it is not styled or announced as an error, and it does not suggest that a filter is hiding results.
- [ ] Given the empty state, when the polite region announces, then it says "No open exceptions."
- [ ] Given the empty state, when I activate "New cargo entry", then I navigate to `/entries/new`.
- [ ] Given a non-empty queue, when it renders, then a secondary "New cargo entry" action is also available.
- [ ] Given focus after load, when the empty state renders, then focus is on the screen's `<h1>`.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.4: Return to the queue after a decision and understand what changed
**As a** cargo specialist, **I want to** come back to the queue after deciding a case and be told why its row has gone, **so that** I do not suspect a lost case when the list is one row shorter.

**Acceptance Criteria:**
- [ ] Given I have just decided a case, when I return via "Back to review queue" or the browser back button, then `/queue` re-fetches the list and focus is placed on the queue `<h1>`.
- [ ] Given the decided case is no longer listed, when the queue renders, then the polite region announces "Case {reference} was {resolved|rejected} and is no longer in the queue. {n} open exceptions remain."
- [ ] Given a refresh that changes the count, when it completes, then the new count is announced.
- [ ] Given the screen, when I leave it idle, then it does not poll, auto-refresh, or push updates — rows never move under a keyboard or screen-reader user mid-read.
- [ ] Given a "Refresh" button placed after the table heading, when I activate it, then the list is re-fetched explicitly.
- [ ] Given a session expiry while on the queue, when the next request returns `401`, then I am redirected to sign-in with the explanatory status announced politely.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.5: Have no filtering, sorting, assignment, or aging language on the screen
**As a** cargo specialist, **I want to** have the queue screen offer nothing but the row links and "New cargo entry", **so that** the single ordered list is visibly the design rather than an unfinished management screen.

**Acceptance Criteria:**
- [ ] Given the rendered DOM, when it is searched, then there is no search input, filter chip, date-range control, "show closed" toggle, select-all checkbox, row checkbox, bulk action bar, "assign to me" action, "claim" action, or per-row overflow menu.
- [ ] Given the column headers, when they are inspected, then they are plain `<th scope="col">` text — not buttons or links — carry no `aria-sort`, display no sort arrows, and the USWDS sortable-table variant is not used.
- [ ] Given the table, when its columns are counted, then there is no priority, severity, age, days-open, assignee, status, or action-menu column.
- [ ] Given `received_at`, when it renders, then it is an absolute local date and time with the month in words (for example "11 Sep 2026, 14:32") inside a `<time datetime="…">` element — never relative phrasing such as "2 days ago".
- [ ] Given the screen, when it is inspected, then it offers no tab, toggle, or "recently decided" panel for browsing closed cases, and the rendered response contains no representation of a closed case.
- [ ] Given the screen, when interactive elements are enumerated, then the only ones are the row links, "Refresh", and "New cargo entry" — nothing on the screen mutates case state.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.6: Be told when the list is showing only the first 500 cases
**As a** cargo specialist, **I want to** see an informational notice when the server had to bound the list, **so that** I am never silently shown a partial queue.

**Acceptance Criteria:**
- [ ] Given `truncated: true` in the response, when the screen renders, then an informational USWDS alert appears above the table reading "Showing the first 500 open exceptions in receipt order."
- [ ] Given the truncation notice, when it renders, then no pagination, "load more", or page-size control is offered alongside it.
- [ ] Given `truncated: false`, when the screen renders, then no notice appears.
- [ ] Given the notice, when a screen reader encounters it, then it is announced as informational rather than as an error.
- [ ] Given demonstration-scale data, when the queue is used, then the bound is not reached — it exists so an unbounded response cannot occur.
- [ ] Given the notice, when the rows are read, then the 500 shown are still the earliest by receipt position, so working from the top is still correct.

**Priority:** P1 | **Feature Ref:** F8

---
