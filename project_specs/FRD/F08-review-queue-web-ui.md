## F8: Review Queue Web UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F7 · **PRD trace:** §5.3 F8, §11.1, NFR-1, NFR-2, NFR-10, SM-11

**Description:** F8 is the screen where a specialist sees the open exceptions and chooses one to work. It is a single USWDS table in receipt order, where each row identifies the case and why it is open, and activating a row opens the case detail screen (F10). No filter controls, sort headers, assignment actions, or priority badges appear — their absence is the design, not an omission. An empty queue states plainly that there are no open exceptions and offers the path to create an entry, which matters because there is no seeded dataset and an empty queue is the normal starting state of a demonstration.

**Terminology (feature-specific):**
- **Queue table:** the USWDS table listing open exceptions, one row per case, in receipt order.
- **Row activation:** opening a case from a row, via a link in the case-reference cell.
- **Empty state:** the presentation shown when zero open exceptions exist.
- **Truncation notice:** the message shown when the server reports `truncated: true` (F7 FR-7.9).

**Sub-features:**
- Receipt-ordered list of open exceptions with case reference, receipt time, and failure summary
- Row activation opening the case detail screen, by keyboard and pointer
- Accessible table semantics with a programmatic row count
- Empty state with a route to cargo entry creation
- Return-to-queue navigation that preserves the specialist's place in the flow

---

### Screen: Review Queue — `/queue` (also the post-sign-in landing route)

**Layout** (inside the F2 shell; `<h1>` "Review queue"):

1. `<h1>` "Review queue", followed by a one-sentence explanation: "Open exceptions, oldest first by receipt. Open a case to review its AI recommendation and record your decision."
2. A visible count: "{n} open exceptions" (singular form for 1), which is also the table's accessible caption text.
3. The queue table, or the empty state.
4. A secondary action "New cargo entry" linking to `/entries/new`.

**Table structure:**

| Column | Content | Notes |
|---|---|---|
| Case | `case_reference` as a link to `/cases/{case_reference}` | Row's accessible entry point |
| Received | `received_at` | Absolute local datetime, e.g. "11 Sep 2026, 14:32" |
| Entry number | `entry_number` or "Not provided" | Never blank |
| Why it is open | `failure_summary` with the finding count | Plain text |

---

### Functional Requirements

- **FR-8.1 — Order mirrors the server.** Rows MUST be rendered in the exact order the API returned them (ascending receipt position). The client MUST NOT re-order, re-group, or re-rank rows for any reason.
- **FR-8.2 — Columns are fixed.** Exactly the four columns above MUST be rendered. There MUST be no priority, severity, age, days-open, assignee, status, or action-menu column (PRD §10 #2, #4).
- **FR-8.3 — No sort affordance.** Column headers MUST be plain `<th scope="col">` text. They MUST NOT be buttons, links, or otherwise activatable, MUST NOT carry `aria-sort`, and MUST NOT display sort arrows. The USWDS sortable-table variant MUST NOT be used.
- **FR-8.4 — No filter, search, assignment, or bulk control.** The screen MUST contain no search input, filter chip, date-range control, state toggle ("show closed"), select-all checkbox, row checkbox, bulk action bar, "assign to me" action, "claim" action, or per-row overflow menu. Nothing on the screen mutates state; the only interactive elements are the row links and the "New cargo entry" link.
- **FR-8.5 — Row activation.** Each row MUST be openable via the link in its Case cell, operable by pointer and by keyboard (`Enter`). The whole `<tr>` MUST NOT be a click target with a JavaScript handler in place of a real link, so middle-click, copy-link, and screen-reader link navigation all work. The link's accessible name MUST include the case reference (e.g. "Open case CE-2026-000137").
- **FR-8.6 — Table semantics.** The table MUST use `<table>` with a `<caption>` stating "Open exceptions in receipt order — {n} cases", `<thead>` with `scope="col"` headers, and `<tbody>` rows. Layout tables, ARIA grid roles, and virtualised rendering MUST NOT be used. The visible count plus the caption provide the programmatic row count (FR-8.9).
- **FR-8.7 — Empty state.** When zero open exceptions exist, the screen MUST render the F2 `Empty` component: `<h2>` "No open exceptions", the sentence "Every exception has been decided. Create a cargo entry to start a new case.", and a primary link "New cargo entry". The empty state MUST NOT be an error, MUST NOT suggest a filter is hiding results, and MUST NOT render an empty table skeleton.
- **FR-8.8 — Loading and error states.** While loading, the F2 `Loading` component renders with `aria-busy="true"` on the table region. A failed load renders the F2 `ErrorState` with "We could not load the review queue." and a "Try again" action; the error is announced assertively.
- **FR-8.9 — Announcements.** After a successful load the polite live region MUST announce "Review queue. {n} open exceptions." After a refresh that changes the count, the new count MUST be announced.
- **FR-8.10 — Refresh is explicit, not automatic.** The queue MUST NOT poll, auto-refresh, or push updates. It refreshes on navigation to the screen and on activation of a "Refresh" button placed after the table heading. Automatic refresh would move rows under a keyboard or screen-reader user mid-read, and a live-updating queue is the beginning of queue-health monitoring, which is out of scope.
- **FR-8.11 — Return-to-queue continuity.** Navigating back from a case (via the F10 "Back to review queue" link or the browser back button) MUST return to `/queue`, re-fetch the list, and place focus on the queue `<h1>`. When the case just decided is no longer in the list, the polite region MUST announce "Case {reference} was {resolved|rejected} and is no longer in the queue. {n} open exceptions remain." — so the specialist understands why the row vanished rather than suspecting a lost case.
- **FR-8.12 — Truncation notice.** When `truncated` is true, an informational USWDS alert MUST appear above the table: "Showing the first 500 open exceptions in receipt order." No pagination control may be offered (F7 FR-7.9).
- **FR-8.13 — Closed cases are not listed here.** The screen MUST NOT offer any way to browse closed cases (no tab, toggle, or "recently decided" panel). A closed case is reached by its direct URL, typically by following the link shown after a decision (F12) or a link retained by the specialist.
- **FR-8.14 — Dates are unambiguous.** `received_at` MUST render as an absolute local date and time with the month in words to avoid day/month ambiguity, and MUST carry the machine-readable value in a `<time datetime="…">` element. Relative phrasing ("2 days ago") MUST NOT be used — it is aging language, and aging is out of scope.
- **FR-8.15 — Performance.** The screen MUST render within 2 seconds under demonstration load (NFR-10).
- **FR-8.16 — Accessibility sign-off.** The screen MUST pass the F2 FR-2.26 checklist, including traversing the table with a screen reader's table navigation and opening a case using the keyboard alone (SM-10, SM-11).

---

**Inputs:**
- `GET /api/exceptions` response: `exceptions[]` (`id`, `case_reference`, `receipt_position`, `received_at`, `entry_number`, `finding_count`, `failure_summary`), `returned_count`, `truncated`
- Specialist interactions: row link activation, "Refresh", "New cargo entry"

**Outputs:**
- A rendered, receipt-ordered accessible table (or the empty state)
- Navigation to `/cases/{case_reference}` on row activation
- Navigation to `/entries/new` from the empty state or the secondary action
- Status announcements for load, count, refresh, and post-decision removal

**Validation (presentation-level):**
- `entry_number` that is null MUST render as "Not provided" rather than an empty cell.
- `failure_summary` MUST be rendered as text and escaped; it MUST NOT be rendered as HTML.
- `received_at` MUST be parsed as an ISO-8601 instant and rendered in the browser's local zone with the zone abbreviation shown.
- A row whose `case_reference` is missing or malformed MUST render without a link and log a client-side warning rather than producing a broken route.

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Load failure (5xx/network) | `ErrorState` with "Try again" | Error region | Assertive |
| Session expired | Redirect to sign-in (F1 FR-1.8) | Sign-in `h1` | Polite |
| Query-parameter rejection (400) | Cannot occur from the UI — the client never sends parameters; if seen, `ErrorState` with generic cause | Error region | Assertive |
| Zero open exceptions | `Empty` state (not an error) | Screen `h1` | Polite: "No open exceptions." |

**API Surface (this feature):** consumes `GET /api/exceptions` (F7) with no parameters. No endpoint of its own. See `Y1-api.md` §3.

**Schema Surface (this feature):** none directly.

**Acceptance Criteria:**
1. With three open exceptions, rows appear oldest-first by receipt and match the API order exactly.
2. No column header is activatable, and the rendered DOM contains no `aria-sort`, no sort icon, no search input, and no checkbox.
3. A case opens by tabbing to its link and pressing `Enter`.
4. With zero open exceptions, the empty state renders with a working "New cargo entry" link and no table.
5. Deciding a case and returning to the queue shows one fewer row, with the removal explained in an announcement.
6. The queue does not change without an explicit navigation or refresh.
7. A screen reader reports the table caption, the row count, and each row's four cells with their column headers.
8. The rendered response contains no representation of a closed case.

---
