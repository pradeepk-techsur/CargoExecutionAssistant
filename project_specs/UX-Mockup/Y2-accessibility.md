## Y2: Accessibility — Section 508 / WCAG 2.1 AA

**Statutory, and met by design plus mandatory manual review with an assistive-technology
walkthrough per screen. There is no CI gate in v1** — the absence of an automated gate is a
recorded decision (`.planning/PROJECT.md`; PRD §10 #1), which is exactly why the per-screen
checklist below is mandatory rather than advisory (US-2.6, R-3, SM-10, SM-11).

---

### 1. Landmarks and document structure (every screen)

| Requirement | Specification |
|---|---|
| Landmarks | Exactly one `<header role="banner">`, one `<main id="main-content">`, one `<footer role="contentinfo">`, and — authenticated only — one `<nav aria-label="Primary">` |
| Skip link | `usa-skipnav` is the **first focusable element** on the page and moves focus into `main` |
| Government banner | `usa-banner` above the header on **every** screen including `/sign-in`, its disclosure keyboard-operable |
| Language | `<html lang="en">` |
| Title | Unique per screen, `{Screen name} — CargoExec`, announced politely on navigation |

### 2. Heading order (per screen)

| Screen | `h1` | `h2` (in DOM order) | `h3` |
|---|---|---|---|
| Sign in | "Sign in to CargoExec" | *(none)* | *(none)* |
| Cargo entry form | "New cargo entry" | Receipt outcome heading (after submit only) | *(none)*; fieldsets use `<legend>`: Entry identification, Transport, Goods, Arrival |
| Review queue | "Review queue" | "No open exceptions" (empty state only) | *(none)* |
| Case detail | "Case {reference}" | Why this case is open · Submitted entry · AI recommendation · Your decision · Audit trail | Why the AI suggests this · Suggested values · No AI recommendation available |
| Decision (region) | *(inherits case `h1`)* | "Your decision" | Edit the suggested resolution · Reject the recommendation · This is what will be recorded · Decision recorded |
| Audit trail (region) | *(inherits case `h1`)* | "Audit trail" | one per event (the action label) |

No level is ever skipped; each screen has exactly one `h1` carrying `tabindex="-1"`.

### 3. Focus management — the four deliberate moves, and nothing else

| Trigger | Focus destination |
|---|---|
| Completed navigation | The new screen's `<h1 tabindex="-1">`, after setting the document title |
| Submission rejected (client or server) | The error summary container (`role="alert"`, `tabindex="-1"`) |
| In-place success (receipt outcome, decision confirmation) | The outcome/confirmation heading (`tabindex="-1"`) |
| Activating an error-summary item | The named control by `id` (a fieldset for a cross-field finding) |

**Focus is never moved by:** recommendation polling, an audit-trail refresh, a queue refresh, a
live-region announcement, or any background update. The specialist may be mid-sentence in the
rationale; stealing focus there is a defect (US-10.5, FR-10.7).

Additional: "Back" from the pre-submission summary returns focus to the first form control;
dismissing the discard modal returns focus to the control that opened it; "Refresh" on the
queue keeps focus on itself.

### 4. Error identification and the error-summary pattern

1. Summary is the **first child of the form region**, `role="alert"`, `tabindex="-1"`, receives
   focus, and is associated to the form via `aria-describedby`.
2. One item per error, in the **exact server order** (findings ascending by rule id).
3. Each item is a link that moves focus to the offending control by `id`.
4. Each affected control: `usa-error-message` inside `usa-form-group--error`, bound via
   `aria-describedby`, with `aria-invalid="true"`.
5. Message text says what is wrong **and what to do**, in plain language; a raw code is never
   the only content. Rule ids appear as supplementary small text only.
6. Cross-field findings (`RIV-070`, `RIV-073`) bind to the `<fieldset>` via `aria-describedby`
   and their summary item focuses the fieldset.
7. Every entered value is preserved across a failure.
8. **Sign-in exception:** the server does not distinguish which credential was wrong, so the
   summary lists one generic item and **no input receives `aria-invalid`** — marking a field
   would leak account information (US-1.1).

### 5. Live regions — polite vs assertive

Both regions are present in the DOM from first paint (US-2.4, FR-2.16).

| Use | Region | Example |
|---|---|---|
| Navigation / document title | polite | "Review queue." |
| Load complete, counts | polite | "Review queue. 11 open exceptions." |
| Progress | polite | "Loading…" · "Generating an AI recommendation." · "Submitting entry." |
| Successful outcome | polite | "Entry received. Validation passed. Case CE-2026-000142." · "Decision recorded. Case resolved." |
| Degraded condition | polite | "No AI recommendation is available." |
| Changed-field marking | polite | "Port of entry code changed." · "1 field changed." |
| Queue row removal after a decision | polite | "Case CE-2026-000137 was resolved and is no longer in the queue. 10 open exceptions remain." |
| Session events | polite | "Your session expired. Sign in again to continue." · "You are signed out." |
| Submission failure | **assertive** | "2 problems with your submission" |
| Conflict | **assertive** | "This case was already resolved by A. Rivera on 11 September 2026." |
| Integrity failure | **assertive** | "Record integrity check failed at event 3." |
| Load failure | **assertive** | "We could not load the review queue." |

Announcements are short complete sentences and **never duplicate** text that focus movement
already reads.

### 6. Keyboard operability — the full keyboard-only task path

Every interactive component is reachable and operable by keyboard alone, in DOM order, with no
trap and no `tabindex > 0`. Icon-only controls are never used for a primary action; decorative
icons accompanying text are `aria-hidden="true"`.

**The five product tasks, keyboard-only (SM-11, US-2.3):**

| # | Task | Path |
|---|---|---|
| 1 | Sign in | Tab → email → password → `Enter` (or Tab → "Sign in" → `Enter`); on failure focus lands on the summary |
| 2 | Create an entry and read its outcome | Nav "New cargo entry" → Tab through four fieldsets → "Submit entry" → focus lands on the outcome heading → Tab → "Open case {ref}" → `Enter` |
| 3 | Open a queue case | Nav "Review queue" → Tab → "Refresh" → first case link → `Enter` |
| 4 | Edit / approve / reject with a reason | Tab (or `H` to "Your decision") → Approve / Edit and approve / Reject → `Enter` → value inputs → reason textarea → "Continue" → (on error: focus in summary, `Enter` on item → focus in textarea) → summary read → "Record decision" → focus lands on the confirmation heading |
| 5 | Read the audit trail | From the confirmation, Tab → "View the audit trail for this case" → `Enter` → focus on the trail `h2` → `H`/list navigation through the events |

Also keyboard-operable: the banner disclosure, the mobile nav menu button and panel, the date
picker calendar, the character counters (as live text, not controls), the in-page navigation,
and the discard-confirmation modal (focus-trapped, `Esc` to dismiss).

**No keyboard shortcut exists for any decision action** — a shortcut would create an asymmetry
between the three actions and risk an accidental approval (US-12.1).

### 7. Visible focus indicator

- The USWDS focus token outline appears on **every** focusable element, including links inside
  table cells, error-summary items, the skip link, and the badge-adjacent controls.
- The indicator meets WCAG 2.1 AA non-text contrast (3:1) against both adjacent backgrounds it
  can appear on.
- `outline: none` without a compliant replacement appears nowhere in the codebase (FR-2.15).
- `tabindex="-1"` is used only on programmatic focus targets (`h1`, error summary, outcome
  headings) — these take focus but are not in the tab sequence.

### 8. Contrast and colour independence

- Body text ≥ 4.5:1; large text and UI component boundaries ≥ 3:1, achieved with approved
  USWDS token pairings only (FR-2.18).
- **Colour never carries information alone.** This binds specifically on:
  - **Provenance** — text label + icon + border shape + programmatic name (`Y0-patterns.md` §1)
  - **Validation errors** — inline message text + USWDS error icon + the error wrapper's heavy
    left border, never red alone
  - **Case state** — "Open" / "Resolved" / "Rejected" as a text label with an icon, never a
    coloured dot
  - **Integrity result** — a headed alert with text, never a green/red indicator alone
  - **Changed-field marking** — badge text change + "Changed" text marker + icon
- Verification: each screen is reviewed with CSS colour forced to monochrome; origin, error and
  state must remain fully discoverable (US-2.5 AC, SM-3).

### 9. 200% zoom and 320 px reflow

- No loss of function or content at 200% browser zoom or at a 320 CSS-px viewport; **body
  content never scrolls horizontally**.
- Tables reflow to stacked, labelled blocks while remaining real tables (see `Y1-responsive.md`).
- Provenance badges wrap rather than truncate, and are never reduced to an icon alone.
- The layout remains usable at tablet width (NFR-12).

### 10. Forms

- Every control has a `<label for>` bound to its `id`; hints are associated via
  `aria-describedby`; **placeholder text is never a label and never the only hint**.
- Required fields carry the USWDS indicator **and** the `required` attribute, with the
  convention stated above the first field; optional fields are visibly marked "(optional)"
  where a form mixes both (the approve reason).
- The entry form is `novalidate` so native constraint validation can never block a deliberately
  incomplete submission — server validation is the authority (US-6.2).
- No control is pre-selected on the specialist's behalf: selects open on "- Select -", and the
  decision chooser has no default (US-12.1).

### 11. Assistive-technology walkthrough (required per screen)

Each screen's primary task is walked end to end with a screen reader, confirming at minimum:
landmark and heading navigation; required-field announcement **before** failure; error-summary
focus and announcement; outcome announcement including the case reference; table semantics and
row count on the queue; provenance announced as text on **every** value on case detail,
decision and audit trail; list position and per-event origin on the trail; no focus theft from
background updates.

### 12. Per-screen accessibility review checklist (the enforcement mechanism)

Signed off per screen before it is considered delivered, recording **reviewer, date, screen,
defects and their resolution**. Target: zero violations, 100% of screens reviewed (SM-10).

```
[ ] Single h1; heading levels descend without skipping
[ ] Landmarks: one banner, one main#main-content, one contentinfo, one primary nav (auth)
[ ] Skip link is first focusable and moves focus into main
[ ] Government banner present and its disclosure keyboard-operable
[ ] Every control has a label bound by for/id; hints bound by aria-describedby
[ ] Required fields marked visually and programmatically; convention stated
[ ] Error summary: first child of form region, role="alert", tabindex="-1", takes focus
[ ] Summary items in server order; each links to and focuses its control
[ ] Inline errors bound by aria-describedby with aria-invalid="true"
[ ] Full keyboard traversal of every control; screen's task completed keyboard-only
[ ] No keyboard trap; no tabindex > 0
[ ] Visible focus indicator on every focusable element, AA non-text contrast
[ ] AA contrast on all text and UI boundaries (USWDS token pairings)
[ ] Colour independence: provenance, error, case state, integrity — verified in monochrome
[ ] Live regions announce each status and each error; polite vs assertive correct
[ ] Announcements do not duplicate what focus movement reads
[ ] Focus is not stolen by polling or background refresh
[ ] 200% zoom: no loss of content or function, no horizontal body scrolling
[ ] 320 px reflow: single column, tables reflow with semantics intact
[ ] prefers-reduced-motion honoured; nothing auto-animates beyond 5 seconds
[ ] Assistive-technology walkthrough of the screen's primary task completed
[ ] Screen renders within 2 seconds under demonstration load
[ ] Reviewer, date and defect resolutions recorded
```

**There is no `.github/workflows` directory, no axe-core job and no accessibility test runner in
the build pipeline** (US-2.6, FR-2.25). This checklist is the enforcement mechanism and is
therefore mandatory.

---
