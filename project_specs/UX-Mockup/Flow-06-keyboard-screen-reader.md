## Flow 6: Complete a decision keyboard-only with a screen reader

**Journey:** JRN-01.7 · **Trigger:** The specialist works entirely by keyboard with a screen
reader — full time, as some specialists in this role do. This is not a variant of the product;
it is the product.
**User stories:** US-2.1, US-2.3, US-2.4, US-2.5, US-2.6, US-1.1, US-6.6, US-8.2, US-10.4,
US-12.7, US-14.2
**Screens:** all six. A loop that breaks on one screen breaks entirely.
**Gate:** SM-11 — 100% of the five product tasks completable by keyboard alone.

```
TAB SEQUENCE, EVERY SCREEN (DOM order; no tabindex > 0; no keyboard trap)

  1  "Skip to main content"            (usa-skipnav — always first focusable)
  2  usa-banner "Here's how you know"  (expandable, Enter/Space, aria-expanded)
  3  Header: product name → /queue
  4  Nav: "Review queue"   (aria-current="page" when active)
  5  Nav: "New cargo entry"
  6  "Sign out"
  7  … screen content in reading order …
  n  Footer links, usa-identifier

FOCUS ON ARRIVAL AT ANY SCREEN
  document.title = "{Screen name} — CargoExec"   → announced politely
  focus → screen <h1 tabindex="-1">              → heading read
  (announcement never duplicates what focus movement already reads)
```

```
[1. Sign in]  Tab: email → password → "Sign in";  Enter submits from either field
     fail ──▶ focus JUMPS to usa-alert--error (role="alert", tabindex="-1")
              "Email or password is incorrect."  password cleared, email kept
        │
        ▼
[2. Entry form]  Tab field by field; each announces label, hint (aria-describedby),
     and "required" from the programmatic marking — BEFORE she can fail it
        │ submit deficient entry
        ▼
     focus JUMPS to the error summary; assertive: "2 problems with your submission"
     each summary item is a link → Enter moves focus to the offending control
     inline message announced from aria-describedby, aria-invalid="true"
        │
        ▼
     Receipt outcome: focus → panel h2; polite: "Entry received. 2 required-information
     problems. Exception opened as case CE-2026-000137."   Tab → "Open case CE-2026-000137"
        │
        ▼
[3. Queue]  <table> with <caption> "Open exceptions in receipt order — 11 cases"
     screen-reader table mode reads each row's 4 cells with their column headers;
     the row count is programmatic (caption + visible count), knowable without traversing
     Tab → case link (accessible name "Open case CE-2026-000137") → Enter
        │
        ▼
[4. Case detail]  H-key traversal: h1 → h2 Why this case is open → h2 Submitted entry
     → h2 AI recommendation → h2 Your decision → h2 Audit trail   (no skipped level)
     Every AI value announces "AI-suggested" AS TEXT; every submitted value
     "Specialist-entered" — never a colour, never an unlabelled icon
     usa-in-page-navigation offers the same six destinations as links
        │
        ▼
[5. Decision]  Step indicator announces "Step 1 of 2 — Choose an action"
     Tab: Approve → Edit and approve → Reject.  NOTHING pre-selected, no autofocus,
     no keyboard shortcut for any action — the choice is genuinely hers
     Edit form: each field announces its current provenance badge; on change,
     polite "Port of entry code changed" then "1 field changed"
     Reason omitted → focus JUMPS to error summary → Enter on the item → focus in textarea
     Step 2 of 2 read in full before [Record decision]
        │
        ▼
     201 → focus → h3 "Decision recorded"; polite: "Decision recorded. Case resolved."
     No decision control remains in the DOM — nothing left to tab to
        │
        ▼
[6. Audit trail]  <ol>/<li> gives list position ("Event 4 of 5"); h3 per event allows
     heading navigation; each value table is a real table with a caption naming its event;
     actor and per-value origin spoken on every event
```

### Steps and the guarantees they depend on

| Stage | What must be true | Story |
|---|---|---|
| Sign in by keyboard | Banner and header are landmarks, not an undifferentiated tab run; labels programmatically associated | US-2.1, US-1.1 |
| Fill the entry form | Required state is programmatic, not a visual asterisk alone; hints bound by `aria-describedby` | US-2.4, US-6.1 |
| Recover from the error summary | Focus **moves** to the summary; items link to fields; this is the single most common break point in federal line-of-business tooling | US-2.4, US-6.4 |
| Hear the receipt outcome | Outcome exposed through the shell's live regions, identically on every screen | US-6.3, US-2.4 |
| Traverse the queue | Real table semantics, programmatic row count, link-based row activation | US-8.1, US-8.2 |
| Read the case in order | Visual order == DOM order; provenance announced as text | US-10.8, US-10.4, US-2.5 |
| Decide by keyboard | No default, no pre-selection, no autofocus, no shortcut; required indication accessible | US-12.1, US-12.7 |
| Read the trail back | List semantics + headings + real tables; origin spoken per event and per value | US-14.1, US-14.2 |

### Design notes

- **Focus is moved deliberately at exactly four moments** and never otherwise: after
  navigation (to `h1`), after a failed submit (to the error summary), after a successful
  in-place submit (to the outcome heading), and after activating an error-summary link (to the
  control). Background updates — recommendation polling, trail refresh — **never** steal focus
  (FR-2.16, FR-10.7).
- **Announcements do not duplicate** what focus movement already reads, so the specialist does
  not hear the same sentence twice (FR-2.16).
- Both live regions (`polite` status, `assertive` alert) exist in the DOM **from initial load**
  so later insertions are announced at all (US-2.4).
- The keyboard-only walkthrough of all five product tasks is a **sign-off gate per screen**,
  recorded with reviewer and date — it is the enforcement mechanism, because there is no CI
  accessibility gate (US-2.6, FR-2.25, FR-2.26, R-3).
