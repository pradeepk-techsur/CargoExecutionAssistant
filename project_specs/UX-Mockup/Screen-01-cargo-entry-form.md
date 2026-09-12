## Screen 2: Cargo entry form

| | |
|---|---|
| **Route** | `/entries/new` |
| **Feature** | F6 on the F2 shell |
| **Purpose** | The only way data enters CargoExec: one human typing one entry. Submitting it triggers atomic receipt (persist → validate → open an exception on failure) and states the outcome plainly. |
| **User stories** | US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-6.6, US-3.1, US-3.2, US-3.3, US-4.1, US-4.2, US-2.4 |
| **Document title** | `New cargo entry — CargoExec` |

---

### Layout — default state (desktop ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ usa-banner ▸ An official website of the United States government             │
│ ⤷ Skip to main content                                                       │
│ CargoExec │ Review queue │ New cargo entry ●│        A. Rivera   [Sign out]   │
│                            aria-current="page"                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ <main id="main-content">                                                     │
│                                                                              │
│  h1  New cargo entry                                        tabindex="-1"    │
│  This entry is checked against the required-information rules as soon as     │
│  you submit it. Anything missing opens an exception for review.              │
│                                                                              │
│  A star (*) marks required information.                                      │
│                                                                              │
│  [ error summary slot — rendered only after a failed submission ]            │
│                                                                              │
│  ┌─ <fieldset> Entry identification ──────────────────────────────────────┐  │
│  │ * Entry number        [____________]                                   │  │
│  │   Hint: 3-character filer code and 8 digits, for example ABC12345678   │  │
│  │ * Importer of record identifier  [____________]                        │  │
│  │   Hint: IRS number like 12-3456789, or CBP number like AB1234567       │  │
│  │ * Port of entry code  [______]     Hint: 4-digit port code             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌─ <fieldset> Transport ─────────────────────────────────────────────────┐  │
│  │ Enter an air waybill number for air shipments, or a bill of lading     │  │
│  │ number otherwise.                      ← conditional statement (RIV-070)│  │
│  │ [ fieldset error slot — RIV-070 / RIV-073 render HERE ]                │  │
│  │ * Mode of transport   [ - Select -            ▾]  Ocean/Air/Truck/Rail │  │
│  │ * Carrier code        [________]                                       │  │
│  │ * Conveyance name     [______________________]                         │  │
│  │   Bill of lading number  [__________________]                          │  │
│  │   Air waybill number     [__________________]                          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌─ <fieldset> Goods ─────────────────────────────────────────────────────┐  │
│  │ * Country of origin   [____]   Hint: 2-letter country code, e.g. CN    │  │
│  │ * Goods description   [ usa-textarea + usa-character-count (2000) ]    │  │
│  │   Hint: Describe what the goods actually are, in at least 10 characters│  │
│  │ * Quantity  [________] inputmode=decimal   * Unit of measure [ - ▾]    │  │
│  │ * Declared value (USD)  [________] inputmode=decimal                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌─ <fieldset> Arrival ───────────────────────────────────────────────────┐  │
│  │ * Arrival date  [ usa-date-picker  YYYY-MM-DD ]                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [ Submit entry ]            Cancel                                          │
│    usa-button primary        usa-button--unstyled link → /queue              │
│                                                                              │
│  (no file input · no drag-and-drop · no template download · no "import from  │
│   ACE" · no save-as-draft · no autosave · no "duplicate this entry")         │
└──────────────────────────────────────────────────────────────────────────────┘
```

Fourteen fields, exactly — no notes field, no attachment control, no HTS/classification field,
no duty field (US-6.1, FR-6.1). Two fields (`bill_of_lading_number`, `air_waybill_number`) are
**not** individually marked required; the conditional statement on their fieldset carries the
rule instead (FR-6.3).

### Layout — after receipt (outcome panel replaces the form region)

```
┌─ EXCEPTION OPENED (201) ─────────────────────────────────────────────────────┐
│ usa-summary-box                                     ← NOT an error alert     │
│  h2  Entry received. Exception opened.                        tabindex="-1"  │
│  Case CE-2026-000137                                                         │
│  This entry did not satisfy 2 required-information rules when it was received│
│                                                                              │
│   1. Enter the port of entry code.                Port of entry code RIV-030 │
│   2. Describe the goods in at least 10 characters.  Goods description RIV-091│
│      ↑ server order (ascending rule id), rendered verbatim, each item a link │
│                                                                              │
│  [ Open case CE-2026-000137 ]   Go to review queue    Create another entry   │
├──────────────────────────────────────────────────────────────────────────────┤
│  What you submitted                    ← read-only definition list, NOT      │
│    Entry number            abc12345678    disabled inputs, so it stays       │
│    Port of entry code      Not provided   readable to a screen reader        │
│    …                                                                         │
│    ⚠ inline finding text remains bound to each affected field's entry        │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ VALIDATED CLEAN (201) ──────────────────────────────────────────────────────┐
│ usa-summary-box                                                              │
│  h2  Entry received and validated.                                           │
│  Case CE-2026-000142                                                         │
│  No exception was opened — there is nothing to review for this entry.        │
│  [ Create another entry ]   Go to review queue                               │
│  (no case link is offered, because no case exists)                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Information hierarchy

| Priority | Content | Placement |
|---|---|---|
| Primary (before submit) | The four fieldsets in receipt order, with required marking and hints | `main`, single column, DOM order == visual order |
| Primary (after submit) | The receipt outcome statement in words + case reference | `usa-summary-box` replacing the form region; receives focus |
| Primary (on failure) | Error summary listing every finding in server order | First child of the form region |
| Secondary | Findings inline against each field | Inside each field's `usa-form-group--error` wrapper |
| Secondary | What you submitted (read-only) | Below the outcome panel |
| Secondary | Onward actions (open case / queue / another entry) | Inside the outcome panel |
| Tertiary | Rule identifiers (`RIV-030`) | Supplementary small text beside each message — **never** the primary message text (US-4.2, FR-6.12) |
| Tertiary | Intro sentence, required-field convention | Above the first fieldset |
| **Absent** | Progress bar / multi-step wizard, field-completion counter, "validate now" button, draft indicator, upload affordances | — (validation is not separately invocable — US-4.4) |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Default** | Empty form; all values blank; selects show "- Select -" so nothing is pre-chosen on the specialist's behalf | Screen `h1` | Polite: page title |
| **Submitting** | "Submit entry" → "Submitting…", `aria-disabled="true"`; repeat activation ignored; no auto-retry | Button | Polite: "Submitting entry." |
| **Validation-failure / exception opened** (`201`) | Outcome `usa-summary-box` ("Entry received. Exception opened.") + findings list + inline errors + read-only submitted values. **Presented as a successful receipt with a business outcome, never as an error** | Panel `h2` | Polite: "Entry received. {n} required-information problems. Exception opened as case {ref}." |
| **Validated clean** (`201`) | Outcome box, positive statement, no findings, no case link | Panel `h2` | Polite: "Entry received. Validation passed. Case {ref}." |
| **Duplicate entry number** (`409`) | Error summary: *"Entry number abc12345678 already exists on case CE-2026-000101."* + a link to that case; inline error on `entry_number`. **Nothing was saved** | Error summary | Assertive |
| **Malformed request** (`422`) | Error summary with one item per offending field from `details[]`; inline errors bound | Error summary | Assertive: "{n} problems with your submission" |
| **Receipt failure** (`500`) | Error summary: *"The entry could not be received. Nothing was saved. Try again."* + "Try again" re-submitting the unchanged form. **All values preserved** | Error summary | Assertive |
| **Unknown outcome** (timeout / network) | Error summary: *"We could not confirm whether this entry was received. Check the review queue before submitting it again."* + link to `/queue`. **No automatic retry** — receipt is not idempotent | Error summary | Assertive |
| **Too large / wrong type** (`413` / `415`) | Error summary with the catalogue message; `415` cannot arise from this form and indicates a client defect | Error summary | Assertive |
| **Session expired** (`401`) | Navigate to `/sign-in?next=/entries/new`; on return, an **empty** form with *"Your entry was not saved. Sign in again and re-enter it."* — never silently resubmitted | Sign-in `h1`, then form `h1` | Polite |
| **Empty state** | Not applicable — a blank form is the default, not an empty state | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| 12 required + 2 conditional fields | `usa-input`, `usa-textarea`, `usa-select`, `usa-date-picker`, `usa-character-count` | `<label for>` bound to `id`; hint via `aria-describedby`; required indicator + `required`; **form is `novalidate`** so the browser never blocks an incomplete submission (US-6.2) |
| Mode of transport / Unit of measure | `usa-select` | Populated from the compiled-in domain code lists, empty default option "- Select -" |
| Quantity / Declared value | `usa-input` `type="text"` + `inputmode="decimal"` | No spinner, no locale coercion, no rounding — submitted as typed (US-3.2) |
| Arrival date | `usa-date-picker` with explicit `YYYY-MM-DD` hint | Keyboard-operable calendar; the text input alone is sufficient to complete the task |
| "Submit entry" | `usa-button` primary | Submits all fourteen fields with the CSRF header; busy state; single-flight |
| "Cancel" | `usa-button--unstyled` link | Returns to `/queue`; sends no request |
| Error-summary items | links | Focus the named control; for `RIV-070`/`RIV-073` they focus the **Transport fieldset**, not an arbitrary field (US-6.4, FR-6.10) |
| "Open case {ref}" / "Go to review queue" / "Create another entry" | `usa-button` primary / `usa-button--outline` / `usa-button--unstyled` | In-page navigation only; "Create another" resets to an empty form with focus on the first field and an announced status — it never retains the previous values |

**Deliberately absent:** any file input, drag-and-drop target, CSV/template download, "import
from ACE/ATS" action or batch paste control (manual typing is the only ingestion path —
US-3.4, PRD §10 #6); save-as-draft / autosave (a draft store would be an unaudited shadow of
the entry of record — FR-6.7); "duplicate this entry"; a client-side "check my entry" button
(validation runs only on receipt — US-4.4); any field outside the fourteen.

### Accessibility (screen-specific)

- **Landmarks & headings:** `banner` / `nav[aria-label="Primary"]` / `main` / `contentinfo`;
  one `h1` "New cargo entry"; each `<fieldset>` carries a `<legend>` (Entry identification,
  Transport, Goods, Arrival); the outcome panel introduces one `h2`. No level is skipped.
- **Required marking:** USWDS indicator (`*` + "required" legend) plus the `required` attribute;
  the convention is stated above the first field; the two conditional transport fields are
  **not** marked required and their fieldset carries the condition in text (US-6.1).
- **Error identification:** error summary is the first child of the form region, `role="alert"`,
  `tabindex="-1"`, receives focus, lists findings in the server's exact order, each item a link
  to the offending control. Each inline message sits in the field's `usa-error-message`, bound
  by `aria-describedby`, with `aria-invalid="true"` on the control. Cross-field findings bind to
  the `<fieldset>` via `aria-describedby` (FR-6.10).
- **Message fidelity:** server messages are rendered verbatim — never re-worded, merged,
  re-ordered or suppressed; a rule id may appear only as supplementary small text (US-4.2).
- **Live regions:** polite for submission start and for the receipt outcome; assertive for
  submission failures. The outcome announcement includes the case reference so a screen-reader
  user has the durable identifier without hunting for it.
- **Keyboard-only path:** Tab through the four fieldsets in DOM order → "Submit entry" → on
  failure, focus lands on the summary → `Enter` on an item lands in the field → resubmit → on
  success, focus lands on the outcome heading → Tab to "Open case {ref}" → `Enter`. Completes
  the whole task without a pointer (US-6.6, SM-11).
- **Visible focus** on every control including the date picker's calendar buttons.
- **Zoom / reflow:** single-column at every breakpoint, so 200% zoom and 320 px need no layout
  change; the character counter and hints remain visible and associated; no horizontal body
  scrolling.
- **Colour independence:** an errored field is marked by its inline message text, the USWDS
  error icon, and the heavy left border of the error wrapper — never by red alone (US-2.5).
- **Values as typed:** the client trims only leading/trailing whitespace; it never uppercases
  codes, strips hyphens, reformats dates or rounds numbers — what is announced back to the
  specialist is exactly what will appear in the audit trail (US-3.2).

### Acceptance checkpoints

1. Submitting a completely empty form succeeds with `201`, opens an exception and renders 13
   findings — inline and in the summary — with no browser validation bubble (US-6.2, US-4.1).
2. `RIV-070` renders on the Transport fieldset, not on an arbitrary single field (US-6.4).
3. Typing `abc12345678` submits `abc12345678`; that exact string appears in the record (US-3.2).
4. A `409` duplicate shows a link to the existing case and saves nothing (US-3.3).
5. A `500` preserves every typed value and states that nothing was saved (US-6.5).
