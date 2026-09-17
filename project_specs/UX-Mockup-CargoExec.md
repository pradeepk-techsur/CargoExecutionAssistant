# UX Mockup
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.0 |
| **Date** | 2026-09-11 |
| **Based on** | `UserStories-CargoExec.md` (US-0.1 … US-14.7), `JOURNEYS-CargoExec.md` (JRN-01.1 … JRN-03.1), `PRD-CargoExec.md` (F0–F14, NFR-1 … NFR-12), `FRD-CargoExec.md` (F02, F06, F08, F10, F12, F14, Y1-api, Y2-errors) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Design system** | **U.S. Web Design System (USWDS) 3.x** — mandatory, no bespoke visual language |
| **Accessibility target** | Section 508 / WCAG 2.1 AA, met by design and manual review with an assistive-technology walkthrough per screen; **no CI gate** (PRD §10 #1, US-2.6) |

---

> ### ⚠ Phase 7 — redesign decided: Carbon Design System
>
> PRD §5.1 F2 (Phase 7 update) replaces USWDS as the product's visual system. The replacement has
> now been **decided: the Carbon Design System (carbondesignsystem.com), IBM's open-source design
> system, via the `@carbon/react` package.** Carbon is open source and IBM-maintained; it ships
> its own design tokens (IBM Design Language type scale, spacing, and named colour themes — White
> / Gray 10 / Gray 90 / Gray 100), its own icon set (`@carbon/icons-react`, SVG React components),
> and IBM Plex as its default typeface. It explicitly targets WCAG AA, Section 508 and EN
> accessibility standards (the IBM Accessibility Checklist) — the same bar this project already
> requires (NFR-2) — and it compiles from Sass to static CSS, not runtime CSS-in-JS, which is
> compatible with this project's build-time, self-hosted, CSP `style-src 'self'`-with-no-
> `unsafe-inline` pipeline. This is no longer an unknown external design; it is a concrete,
> documented target. Three things follow, and they hold for every chunk in this document, not
> only this one:
>
> 1. **Every screen/flow spec below describes interaction behaviour** — focus order, state
>    transitions, error handling, live-region announcements, keyboard paths, DOM structure and
>    ordering. That behaviour is unaffected by which visual system renders it and **remains
>    authoritative** through and beyond the redesign.
> 2. **Every visual/token reference below is Phase-6-era** — the USWDS component register in
>    §1.2, and any specific colour token, icon name, or component name named anywhere in this
>    document — and will be superseded once a Carbon theme is chosen and the mapping is authored
>    into a new `Y0-patterns.md` token table. Nothing below is deleted for this reason: it
>    remains historically accurate for what shipped through Phase 6.
> 3. **No screen in this document is redesigned by this update, and no specific Carbon theme or
>    per-screen component mapping is committed here.** Which Carbon theme (White / Gray 10 /
>    Gray 90 / Gray 100) and which Carbon component replaces each USWDS-composed control are
>    still Phase 7 planning/execution work — that work is simply no longer blocked on an unknown
>    design, since the replacement system is now named and documented. This note, and the inline
>    flags placed beside concrete visual/token references, are the full extent of this wave's
>    change to the UX Mockup.

---

## 1. Overview

CargoExec has **exactly six screens**. Every one of them exists to carry one stage of the
governed decision loop — **receive → validate → except → recommend → human decide → audit** —
and nothing else is drawn. The UX problem here is not discovery, throughput, or navigation
depth; it is *legibility of accountability*. A specialist must be able to see, at the moment of
deciding and again a year later, which values a machine proposed and which a human chose.

Three consequences shape every design in this document:

1. **The interface is small on purpose.** Two navigation destinations, one ordered list, one
   case screen. Where a reviewer would expect a filter, a sort, an assignment control, a
   dashboard tile or an export button, this document states that it is *deliberately absent*
   rather than drawing it (US-8.5, US-7.3, US-14.6).
2. **Provenance is a first-class UI component, not styling.** The provenance indicator is
   text + icon + programmatic name, and it appears identically on case detail, decision and
   audit trail (US-2.5, US-10.4, US-14.2). It is legible in monochrome and to a screen reader.
3. **Nothing is pre-selected, pre-applied, or defaulted.** The AI's proposal is rendered as an
   un-applied draft; the three decision actions carry equal visual weight and equal keystroke
   cost; approval always costs a deliberate second step (US-12.1, US-12.4, R-1).

### 1.1 Design principles

| # | Principle | Consequence in the designs |
|---|---|---|
| P1 | **State the outcome; never let the user infer it** | "Entry received and validated", "Exception opened", "Nothing was saved" are written in words, never conveyed by the absence of an error (US-6.3, FR-6.8) |
| P2 | **Proposal framing everywhere** | Recommendation copy says "suggests", never "applied", "fixed", "corrected", "auto-resolved" (US-10.3, FR-10.1) |
| P3 | **Colour is never the carrier of meaning** | Provenance, error, and case state each use text + icon + shape (US-2.5, FR-2.17) |
| P4 | **Equal weight for Approve / Edit / Reject** | Three identical `usa-button--outline` controls, DOM order Approve → Edit and approve → Reject, no autofocus, no shortcut (US-12.1, FR-12.1) |
| P5 | **Two-step commitment** | No single activation both chooses and records a decision; a `usa-step-indicator` makes the two steps visible (US-12.4, FR-12.2) |
| P6 | **Absence is designed, not omitted** | Every screen section names the controls that are deliberately not there and why (US-8.5, US-14.6, SM-14) |
| P7 | **The record answers in place** | Audit trail lives inside the case; no export, no second system, no print view (US-14.7, NFR-7) |
| P8 | **Degradation narrows the case, never blocks it** | "No AI recommendation available" is a `Degraded` presentation, not an `ErrorState`, and the decision path is untouched (US-10.6, US-9.4, NFR-9) |

### 1.2 USWDS component register (every interactive control in the product)

Every control below is a stock USWDS 3.x component or a documented USWDS-conformant
composition of stock components (FR-2.1, SM-12). There are no bespoke widgets.

| USWDS component | Where used |
|---|---|
| `usa-banner` (official government banner) | Every screen including `/sign-in` — required (FR-2.5) |
| `usa-header` (basic) + `usa-nav` + `usa-nav__secondary` | Shell header: product name → `/queue`, two nav links, display name, "Sign out" |
| `usa-skipnav` | First focusable element on every page |
| `usa-identifier` + `usa-footer--slim` | Footer on every screen (agency identifier, required-links row) |
| `usa-form`, `usa-fieldset`, `usa-label`, `usa-hint`, `usa-input`, `usa-textarea`, `usa-select`, `usa-date-picker`, `usa-character-count` | Sign-in form, cargo entry form, decision edit / reject forms |
| `usa-error-message` + `usa-input--error` + `usa-form-group--error` | Inline field errors, bound by `aria-describedby` / `aria-invalid` |
| `usa-alert` — `--error`, `--warning`, `--info`, `--success`, `--slim` | Error summary, already-decided conflict, truncation notice, integrity failure |
| `usa-summary-box` | Receipt outcome panel, pre-submission summary, decision confirmation, degraded notice |
| `usa-table` (plain, **never** `usa-table--sortable`) | Review queue, comparison rows, audit value-change tables |
| `usa-button`, `usa-button--outline`, `usa-button--unstyled`, `usa-button-group` | All actions; three decision actions are identical `--outline` |
| `usa-tag` (+ `usa-icon` + `usa-sr-only`) | **Provenance indicator** and case-state indicator (composition, see `Y0-patterns.md`) |
| `usa-step-indicator` (`--counters`, `--center` off) | Decision region: Choose action → Review → Recorded |
| `usa-modal` | One use only: confirm discard of typed input on Cancel (FR-12.15) |
| `usa-in-page-navigation` | Case detail "On this page" section links (FR-10.10) |
| `usa-icon` (bundled sprite) | Decorative-with-text only; `aria-hidden="true"` (FR-2.9) |
| `usa-process-list` | Not used |
| `usa-accordion` | Not used for any content required to make a decision (rationale is never collapsed — FR-10.4) |

USWDS design tokens govern all colour, spacing and typography; no hard-coded hex or pixel
values appear in screen-level styles (FR-2.2). Assets are bundled and self-served — no CDN —
so the demonstration renders with no external network (FR-2.3, US-2.1).

---

## 2. Navigation Map

The single source of truth for how every screen is **reached**.

| Screen | Route | Reached from | Nav element |
|--------|-------|--------------|-------------|
| **1. Sign in** | `/sign-in` | Unauthenticated request to any route; session expiry mid-task; after sign-out | Server `302` to `/sign-in?next={path}` (FR-1.7); no nav element exists — it is the entry point (US-1.2) |
| **2. Cargo entry form** | `/entries/new` | App shell on every authenticated screen; queue empty state; receipt outcome panel | Header `usa-nav` link **"New cargo entry"**; queue empty-state primary button "New cargo entry"; outcome panel button "Create another entry" (US-2.2, US-8.3) |
| **3. Review queue** | `/queue` | App shell on every authenticated screen; post-sign-in landing; product name in header; receipt outcome panel; case detail | Header `usa-nav` link **"Review queue"** (`aria-current="page"` when active); header product-name link; outcome panel button "Go to review queue"; case detail link "Back to review queue" (US-2.2, US-8.4) |
| **4. Case detail** | `/cases/{caseReference}` | Review queue row; receipt outcome panel; decision confirmation link retained by the specialist | Queue table **case-reference link** in the Case cell, accessible name "Open case CE-2026-000137" (US-8.2); outcome panel primary button "Open case {reference}" (US-6.3) |
| **5. Decision** | `/cases/{caseReference}` § "Your decision" | Case detail — it is section 5 of that screen, always rendered for an `OPEN` case | Case detail `usa-in-page-navigation` link **"Your decision"**; also reached by reading down the page (US-10.8, US-12.1) |
| **6. Per-case audit trail** | `/cases/{caseReference}` § "Audit trail" (anchor `#audit-trail`) and deep link `/cases/{caseReference}/audit` | Case detail — section 6 of that screen; decision confirmation panel | Case detail `usa-in-page-navigation` link **"Audit trail"**; confirmation panel link "View the audit trail for this case"; direct URL focuses the region heading (US-14.1, US-12.5) |
| *(supporting)* Page not found | `*` | Any unknown route | Renders inside the shell with a link to `/queue`; focus moves to its `h1` (US-2.2) |
| *(supporting)* Root redirect | `/` | Browser opened at the application root | `302` → `/queue` when a session exists, else `/sign-in` |

**Invariant — no orphan screens.** Every screen above has at least one inbound path traceable
to the app shell:

```
app shell header (authenticated, every screen)
  ├── "Review queue"  ──────────▶ /queue ──▶ row link ──▶ /cases/{ref}
  │                                                        ├── § Your decision   (in-page nav)
  │                                                        └── § Audit trail     (in-page nav, #audit-trail)
  └── "New cargo entry" ────────▶ /entries/new ──▶ receipt outcome panel
                                                   ├── "Open case {ref}" ──▶ /cases/{ref}
                                                   └── "Go to review queue" ─▶ /queue
/sign-in ──(on success)──▶ /queue          (sign-in is the unauthenticated entry point)
```

The Decision and Audit trail screens are *sections of the case detail screen*, reached from a
parent that itself traces to the shell — they are not separate routes requiring their own nav
item, and the audit trail additionally carries a shareable deep link. No screen in this
document is reachable only by typing a URL. **A third navigation item does not exist anywhere
in the DOM** — no dashboard, reports, metrics, settings, administration or export item
(FR-2.7, US-2.2).

---

## 3. Screen index

| # | Screen | Route | Feature | Chunk | Primary user stories |
|---|--------|-------|---------|-------|----------------------|
| 1 | Sign in | `/sign-in` | F1 on F2 | `Screen-00-sign-in.md` | US-1.1, US-1.2, US-1.4, US-1.5, US-2.1 |
| 2 | Cargo entry form | `/entries/new` | F6 on F2 | `Screen-01-cargo-entry-form.md` | US-6.1 … US-6.6, US-3.3, US-4.2 |
| 3 | Review queue | `/queue` | F8 on F2 | `Screen-02-review-queue.md` | US-8.1 … US-8.6, US-7.3 |
| 4 | Case detail | `/cases/{ref}` | F10 on F2 | `Screen-03-case-detail.md` | US-10.1 … US-10.8, US-9.3, US-9.4 |
| 5 | Decision | `/cases/{ref}` § 5 | F12 on F2 | `Screen-04-decision.md` | US-12.1 … US-12.7, US-11.4, US-11.6 |
| 6 | Per-case audit trail | `/cases/{ref}` § 6 | F14 on F2 | `Screen-05-audit-trail.md` | US-14.1 … US-14.7, US-13.2 |

**F15 (Phase 7, Seeded Demonstration Case) has no screen.** It is an operator-run seed script
(PRD §5.7 F15, FRD F15) invoked from the command line against the deployment — never an HTTP
route, a UI control, or a specialist-reachable capability. It has no route, no nav element, and
no specialist-facing surface of any kind, so it does not appear in the Navigation Map above and
is not assigned a chunk in this document. The screen inventory above — Screen-00 through
Screen-05 — is **unchanged and complete** for every specialist-facing surface in the product,
including after Phase 7.

## 4. Document index

| Chunk | Content |
|---|---|
| `00-overview.md` | This file — approach, principles, USWDS register, navigation map |
| `Flow-00` … `Flow-06` | Seven user flows, one per PER-01 journey (JRN-01.1 … JRN-01.7) |
| `Screen-00` … `Screen-05` | Six screen designs: wireframe, information hierarchy, states, interactive elements, per-screen accessibility |
| `Y0-patterns.md` | Interaction patterns — provenance indicator, error summary, two-step commitment, live regions, shared state components |
| `Y1-responsive.md` | Desktop / tablet / mobile behaviour, 200% zoom, 320 px reflow |
| `Y2-accessibility.md` | Section 508 / WCAG 2.1 AA specification and the per-screen review checklist |
| `Y3-state-designs.md` | Cross-screen state matrix for the seven required states |
| `Y4-assumptions.md` | Design assumptions, deliberate absences, and user-story traceability |

---
## Flow 0: Sign in and file a clean entry

**Journey:** JRN-01.1 · **Trigger:** Specialist opens the application at the start of a shift
holding a paper cargo entry she believes is complete.
**User stories:** US-1.1, US-1.2, US-2.1, US-2.2, US-6.1, US-6.2, US-6.3, US-4.4, US-3.1
**Screens:** Sign in → Cargo entry form → (offered) Review queue
**Loop stages covered:** receive → validate (and stop — no exception is manufactured)

```
[Browser opened at / ]
        │
        ▼
[Server: no session] ──302──▶ [1. Sign in  /sign-in?next=%2Fqueue]
        │
        │ enter email + password, Enter
        ▼
   ┌────────────────────────────────────────────────┐
   │ POST /api/session                              │
   └────────────────────────────────────────────────┘
        ├── 401 AUTH_FAILED ──▶ [Sign-in error state: error summary takes focus,
        │                        generic message, password cleared, email kept]  ──┐
        ├── 403 ACCOUNT_INACTIVE ─▶ [same summary pattern, "This account is not active."]
        ├── 429 TOO_MANY_ATTEMPTS ▶ [same summary pattern, "Try again in about 15 minutes."]
        │                                                                          │
        └── 201 ──▶ [3. Review queue  /queue]  ◀───────── (re-attempt) ────────────┘
                        │
                        │ header nav: "New cargo entry"
                        ▼
                  [2. Cargo entry form  /entries/new]
                        │
                        │ type 14 fields from paper; activate "Submit entry"
                        ▼
              ┌──────────────────────────────────────┐
              │ POST /api/entries  (atomic receipt)  │
              └──────────────────────────────────────┘
                        │
        ┌───────────────┼────────────────────────────┬─────────────────────────┐
        │               │                            │                         │
   201 VALIDATED_  201 EXCEPTION_               409 ENTRY_NUMBER_        500 RECEIPT_FAILED
      CLEAN           OPENED                      DUPLICATE              / network failure
        │           (see Flow 1)                      │                         │
        ▼                                             ▼                         ▼
 [Receipt outcome panel]                    [Error summary + inline       [Error summary:
  h2 "Entry received and validated"          error on entry_number +       "Nothing was saved.
  Case CE-2026-000142                        link to existing case]        Try again."
  "No exception was opened."                 focus → summary               values preserved]
  [Create another entry] [Go to review queue]
        │
        │ focus → panel h2; polite: "Entry received. Validation passed. Case CE-2026-000142."
        ▼
 [3. Review queue  /queue]  ── work begins
```

### Steps

1. **Arrive.** Any unauthenticated navigation is redirected to `/sign-in?next={path}`; no
   protected content renders even momentarily (US-1.2, FR-2.4 "no flash of protected
   content"). The `usa-banner` and shell are painted before the form so the page does not
   reflow under the specialist.
2. **Authenticate.** Tab order is email → password → "Sign in"; `Enter` submits from either
   field (US-1.1). On success the shell header gains the display name and "Sign out", which is
   the standing answer to *whose identity will be attributed today* (JRN-01.1 "Authenticate"
   opportunity).
3. **Compose.** The entry form states the required-field convention above the first field, and
   marks the twelve presence-checked fields with the USWDS required indicator, so the shape of
   a complete entry is legible before submission rather than discovered by failing (US-6.1).
4. **Submit.** The button enters its busy state ("Submitting…", `aria-disabled="true"`) and a
   second activation is ignored (US-6.5, FR-6.9). The client does **not** block submission —
   the form is `novalidate` (US-6.2).
5. **Read outcome.** On `VALIDATED_CLEAN` the form region is replaced by a `usa-summary-box`
   stating the outcome **positively and in words**, with the case reference. The submitted
   values remain readable below as a read-only definition list (not disabled inputs), so a
   screen-reader user can still read them back (FR-6.14). Focus moves to the panel heading;
   the polite region announces the outcome (US-6.3, US-4.4).
6. **Move on.** The panel offers exactly two onward actions — "Create another entry" (resets
   to an empty form, focus on the first field) and "Go to review queue" — so the clean branch
   ends inside the flow rather than in a dead end (JRN-01.1 "Move on").

### Design notes

- The clean outcome is a **positive statement**, never an absence of errors (P1). Copy: *"Entry
  received and validated. Case CE-2026-000142. No exception was opened — there is nothing to
  review for this entry."*
- There is deliberately **no link to a case** on the clean branch, because no case exists;
  `next.case_url` is `null` (Y1-api §2). Offering one would imply a record that does not exist.
- Sign-in offers **no** "remember me", third-party sign-in, self-registration, password-reset
  or invite affordance — their absence is specified, not accidental (US-1.1, FR-1.13).
## Flow 1: Work an exception end to end and approve the recommendation

**Journey:** JRN-01.2 — the reference walk of the complete governed loop.
**Trigger:** Specialist types an entry that is missing required information.
**User stories:** US-6.2, US-6.4, US-5.1, US-8.1, US-8.2, US-10.1, US-10.2, US-10.3, US-10.4,
US-12.1, US-12.4, US-12.5, US-14.1, US-11.1
**Screens:** Cargo entry form → Review queue → Case detail → Decision → Audit trail
**Loop stages covered:** all six (receive → validate → except → recommend → human decide → audit)

```
[2. Cargo entry form] ── submit deliberately incomplete entry
        │
        ▼  201  receipt_outcome = EXCEPTION_OPENED
┌──────────────────────────────────────────────────────────────────┐
│ Receipt outcome panel (usa-summary-box)                          │
│  h2 "Entry received. Exception opened."                          │
│  Case CE-2026-000137 · 2 required-information rules not satisfied│
│  Findings listed in server order (ascending rule id)             │
│  [Open case CE-2026-000137]  [Go to review queue] [Create another]│
│  ▼ findings also rendered inline on the fields below             │
└──────────────────────────────────────────────────────────────────┘
        │  focus → panel h2 · polite: "Entry received. 2 required-information
        │  problems. Exception opened as case CE-2026-000137."
        │
        ├──────────────▶ [3. Review queue /queue]
        │                     │ single receipt-ordered table, top row is the new case
        │                     │ Tab to the case-reference link, Enter
        │                     ▼
        └──────────────▶ [4. Case detail /cases/CE-2026-000137]
                              │
        reading order (normative):
        h1 Case CE-2026-000137
          └ h2 Why this case is open        ← the findings, verbatim, server order
          └ h2 Submitted entry              ← every value badged "Specialist-entered"
          └ h2 AI recommendation            ← action + rationale + comparison rows,
          │                                   every proposed value badged "AI-suggested"
          │                                   "Nothing here has been applied."
          └ h2 Your decision                ← [5. Decision]
          └ h2 Audit trail                  ← [6. Audit trail]
                              │
                              ▼
              ┌──────────────────────────────────────────────┐
              │ [5. Decision] Step 1 of 2 — Choose an action │
              │  ( ) nothing pre-selected, no autofocus      │
              │  [Approve] [Edit and approve] [Reject]       │  ← equal weight
              └──────────────────────────────────────────────┘
                              │ activate "Approve"
                              ▼
              ┌──────────────────────────────────────────────┐
              │ Step 2 of 2 — Review what will be recorded   │
              │  usa-summary-box: decision type in words,    │
              │  every value with its "AI-suggested" badge,  │
              │  optional reason field, permanence statement │
              │  [Record decision]        [Back]             │
              └──────────────────────────────────────────────┘
                              │ POST /api/exceptions/{id}/decision
              ┌───────────────┴───────────────┬──────────────────────────┐
           201 │                        409 ALREADY_DECIDED       500 DECISION_FAILED
               ▼                               ▼                          ▼
   [Confirmation panel, built          [usa-alert--info:            [Error summary:
    from the server response]           "already resolved by         "Nothing was saved.
    h3 "Decision recorded"              {name} on {date}",            Try again."
    type · who · when · values +        controls removed,             case still OPEN]
    server-assigned origin badges       case refreshed]
    [View the audit trail] [Back to review queue]
               │  focus → h3 · polite announcement · controls removed from the DOM
               ▼
   [6. Audit trail — refreshed in place]
     1 Cargo entry received                    A. Rivera (specialist)
     2 Validated against required-information rules   System, during A. Rivera's submission
     3 Exception opened                        System, during A. Rivera's submission
     4 AI recommendation generated             AI (gpt-4o-2026-05)
     5 Recommendation approved by specialist   A. Rivera (specialist)
     "Record integrity verified — 5 events in sequence."
               │
               ▼
   [3. Review queue]  polite: "Case CE-2026-000137 was resolved and is no longer in the
                       queue. 4 open exceptions remain."
```

### Steps

1. **Submit a deficient entry.** The browser does not fight the specialist: native constraint
   validation is off, so reality can be recorded as it arrived (US-6.2).
2. **Read the exception receipt.** An opened exception is presented as a **successful receipt
   with a business outcome**, never as an error — the panel is a `usa-summary-box`, not
   `usa-alert--error` (US-6.3, FR-6.8). The named per-rule findings appear here *and* inline on
   the fields, so the basis is stated once and never re-derived (US-6.4).
3. **Enter the queue.** One table, ascending receipt position, no filter, no sort headers, no
   priority badge, no assignment. The visible count doubles as the table caption (US-8.1).
4. **Open the case.** The case-reference cell is a real `<a href>` — middle-click, copy-link
   and screen-reader link navigation all work; the whole `<tr>` is not a JS click target
   (US-8.2, FR-8.5).
5. **Read the case.** Findings first (why it is open), then what was submitted, then what the
   AI suggests — with the rationale on the same screen as the thing it explains, in full, never
   collapsed (US-10.1, US-10.3, FR-10.4).
6. **Decide.** Three equally-presented actions, nothing pre-selected. Choosing does not record:
   step 2 shows exactly what will be recorded before it is recorded (US-12.1, US-12.4).
7. **Confirm.** The confirmation panel is rendered **from the server's `201` body**, never from
   an optimistic client assumption, so what the specialist reads is what was stored (US-12.5).
   The decision controls are removed from the DOM — not disabled (FR-12.11).
8. **Close the loop.** The audit trail refreshes in place so the specialist's own decision
   appears without a reload (US-14.1, FR-14.12).

### Design notes

- **Approve is the lowest-effort path and is therefore made deliberately equal-cost**: same
  button treatment, same DOM order weight, same two-step commitment as Reject (P4, P5, R-1).
- The queue row disappearing after a decision is **explained in a live announcement**, so a
  vanished row never reads as a lost case (US-8.4, FR-8.11).
- Nothing on this path opens a new window, popup or top-level frame — the whole flow is
  in-page navigation inside the shell, which is a hard constraint of the iframe preview.
## Flow 2: Disagree in part — edit the resolution and approve it

**Journey:** JRN-01.3 — the journey that makes per-value provenance load-bearing.
**Trigger:** The AI proposes a set of values; the specialist agrees with most of them and
disputes one for a reason the model could not have known.
**User stories:** US-12.2, US-12.3, US-12.4, US-12.5, US-11.2, US-11.4, US-10.4, US-14.2, US-0.2
**Screens:** Case detail → Decision (edit form → summary → confirmation) → Audit trail

```
[4. Case detail] — AI recommendation section
   Comparison rows, one per proposed value:
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Port of entry code                                                   │
   │   Submitted   Not provided                                           │
   │   AI suggests 2704            [⚙ AI-suggested]                       │
   │   Addresses: "Enter the port of entry code."            (RIV-030)    │
   └──────────────────────────────────────────────────────────────────────┘
        │
        ▼
[5. Decision] Step 1 of 2 — Choose an action
   [Approve]  [Edit and approve]  [Reject]      ← equal weight, nothing pre-selected
        │ activate "Edit and approve"
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Edit form (usa-form) — one input per proposed field, pre-populated        │
│                                                                           │
│  Port of entry code            [2709            ]  [✎ Specialist-modified]│
│    AI suggested: 2704                              Changed                │
│  Goods description             [Stainless steel…]  [⚙ AI-suggested]       │
│  Country of origin             [CN              ]  [⚙ AI-suggested]       │
│                                                                           │
│  * Reason for your changes  (required)                                    │
│  [textarea, usa-character-count, min 10 chars, max 2000]                  │
│  Hint: "At least 10 characters. Explain why you changed the recommendation"│
│                                                                           │
│  [Continue]                                   [Cancel]                    │
└───────────────────────────────────────────────────────────────────────────┘
        │ polite: "Port of entry code changed." … "1 field changed."
        │
        ├── reason empty or < 10 chars ──▶ [Error summary takes focus,
        │                                   inline usa-error-message on the textarea,
        │                                   aria-invalid="true", NO request sent]
        │                                          │
        │        ◀─────────────────────────────────┘ (correct and Continue)
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 2 — Review what will be recorded (usa-summary-box)              │
│  Decision: Edit the AI-recommended resolution and approve it              │
│  Port of entry code   AI suggested 2704 → you are recording 2709          │
│                                            will be recorded as HUMAN      │
│  Goods description    unchanged → retains AI origin                       │
│  Country of origin    unchanged → retains AI origin                       │
│  Reason: "Port code corrected to the actual arrival port per the BoL."    │
│  "This decision is recorded permanently against your name and cannot be   │
│   changed afterwards."                                                    │
│  [Record decision]                            [Back]                      │
└───────────────────────────────────────────────────────────────────────────┘
        │ POST … decision_type=EDIT_APPROVE, reason, COMPLETE resolution_values set
        │ Idempotency-Key generated when this summary rendered
        ▼
   201 ──▶ [Confirmation panel, from the server response]
              Port of entry code  2709   [👤 Specialist-entered]  was 2704 [⚙ AI-suggested]
              Goods description   …      [⚙ AI-suggested]
              Country of origin   …      [⚙ AI-suggested]
              [View the audit trail for this case]  [Back to review queue]
        │
        ▼
   [6. Audit trail] event 5 "Recommendation edited and approved by specialist"
        Reason given: rendered in full, verbatim
        Values table:  Field │ Before │ After │ Origin of the recorded value
          port_of_entry_code │ 2704 [⚙ AI-suggested] │ 2709 [👤 Specialist-entered] │ Specialist-entered
          goods_description  │ … [⚙ AI] │ … [⚙ AI] │ AI-suggested
```

### Steps

1. **Open and read.** The proposal is rendered as *individually attributed values*, not as one
   indivisible block, so partial disagreement has somewhere to go (US-10.4, JRN-01.3).
2. **Choose to edit.** "Edit and approve" is exactly as reachable as "Approve" — same control
   type, same tab sequence, one activation (US-12.1, P4).
3. **Change the value.** The field's badge flips from "AI-suggested" to "Specialist-modified"
   **live, in the form**, with a "Changed" marker in text + icon (never colour alone), and the
   running count is announced politely. Reverting to the exact proposed value restores the
   AI badge, using the same trim-then-compare rule the server applies, so the preview can never
   disagree with the record (US-12.2, FR-12.6).
4. **Write the reason.** Free-text `<textarea>` only — **no canned-reason dropdown, no quick
   chips, no default text, no placeholder that could be submitted as-is** (US-12.3, FR-12.5,
   R-8). The payoff is visible: the reason is rendered in full in the audit trail.
5. **Review before commit.** The pre-submission summary is the last cheap moment; it names the
   origin each value *will* carry, so append-only immutability is never experienced as a trap
   (US-12.4).
6. **Commit.** The client submits the **complete** value set with no origin, no changed flag and
   no diff — provenance is computed server-side only (US-12.2, FR-12.7, FR-11.8).
7. **Verify the provenance.** The trail shows `HUMAN` on the one changed field and `AI` on the
   rest, conveyed by text and structure as well as visually (US-14.2, US-0.2, SM-3).

### Design notes

- **Cancel is lossless and non-mutating.** If a reason was typed or a value changed, Cancel
  opens a `usa-modal` confirming the discard; the modal is in-page, focus-trapped, `Esc`-
  dismissible, and returns focus to the Cancel control (FR-12.15). It is the only modal in the
  product.
- A **no-change edit is permitted**: the client never requires that at least one value differ.
  The server records all values retaining `AI` origin with the reason explaining the intent
  (FR-12 validation note).
- On `409 RECOMMENDATION_MISMATCH` the stale summary is discarded, not re-posted, and the case
  is reloaded with "The recommendation changed. Review it again before deciding." (US-12.6).
## Flow 3: Reject the recommendation outright, with a reason

**Journey:** JRN-01.4 · **Trigger:** The specialist judges the proposed action wrong *in kind*,
not merely in detail.
**User stories:** US-12.1, US-12.3, US-12.5, US-12.7, US-11.3, US-11.4, US-14.3, US-10.7
**Screens:** Case detail → Decision (reject form → summary → confirmation) → Audit trail

```
[4. Case detail] read findings, entry, AI action + rationale
        │
        ▼
[5. Decision] Step 1 of 2 — Choose an action
   [Approve]   [Edit and approve]   [Reject]     ← no confirmation nudge back toward Approve
        │ activate "Reject"
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Reject form                                                               │
│  "Rejecting closes this case without adopting the recommendation.         │
│   No resolution values will be recorded."                                 │
│                                                                           │
│  * Reason for rejecting  (required)                                       │
│  [textarea + usa-character-count]                                         │
│  Hint: "At least 10 characters. Explain why the recommendation is not     │
│         being adopted."                                                   │
│  [Continue]                                  [Cancel]                     │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ├── submitted empty ─────────────────────────────────────────────┐
        │                                                                ▼
        │   ┌──────────────────────────────────────────────────────────────────┐
        │   │ usa-alert--error  role="alert"  tabindex="-1"  ← RECEIVES FOCUS   │
        │   │ "There is 1 problem with your submission"                        │
        │   │  • Enter a reason of at least 10 characters for this rejection.  │
        │   │    ↳ link focuses #decision-reason                               │
        │   └──────────────────────────────────────────────────────────────────┘
        │   assertive: "1 problem with your submission"
        │   inline usa-error-message on the textarea, aria-invalid="true"
        │        │
        │        ▼ (write the reason, Continue)
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 2 — Review what will be recorded                                │
│  Decision: Reject the AI-recommended resolution                           │
│  Reason: "The suggested port code conflicts with the vessel's manifest."  │
│  Declined values, for the record:  2704 [⚙ AI-suggested] — not recorded   │
│  "The case will close as Rejected. This cannot be changed afterwards."    │
│  [Record decision]                            [Back]                      │
└───────────────────────────────────────────────────────────────────────────┘
        │ POST … decision_type=REJECT, reason only
        ▼
   201 ──▶ [Confirmation panel]
              h3 "Decision recorded"
              Rejected by A. Rivera · 11 September 2026, 3:04 p.m. EDT
              Reason given: rendered verbatim
              Case state: Rejected
              [View the audit trail for this case]  [Back to review queue]
        │  focus → h3 · controls removed from the DOM · case now read-only
        ▼
   [4. Case detail, closed presentation]
      "This case is closed. The decision below is final and cannot be changed."
      The AI recommendation remains rendered exactly as it stood, still framed as a proposal
        │
        ▼
   [6. Audit trail] event "Recommendation rejected by specialist"
        Who: A. Rivera (specialist) · When: absolute local datetime
        What changed: Open → Rejected
        Reason given: full text
        Values: after_value NULL renders as "Not recorded (rejected)" — never a blank cell
```

### Steps

1. **Read the proposal.** The rationale is plain enough to locate *which part* of the reasoning
   fails, so refusal is reasoned rather than instinctive (US-10.3, JRN-01.4).
2. **Commit to refusing.** Reject sits at equal weight with Approve and Edit. There is **no**
   "Are you sure you want to reject?" nudge and no interstitial that steers back toward
   approval — refusing the machine costs exactly what accepting it costs (US-12.1, P4).
3. **Attempt without a reason.** Required-field indication is visible *before* submission and
   enforcement is server-side *after* it (US-11.4). The failure is handled with the shared
   error-summary pattern — focus moves, the message is announced, nothing is lost — because a
   badly handled required-field failure here is where a specialist learns to write "n/a"
   forever (JRN-01.4 risk of abandonment, R-8).
4. **Write the reason.** Free text, rendered in full in the trail where it is actually read.
5. **Close the case.** The case leaves the queue; the decision controls are **removed from the
   DOM**, replaced by the read-only recorded decision, so the case cannot be decided twice
   (US-12.7, US-10.7, R-11).
6. **Read it back.** The AI's original proposal is preserved verbatim beside the refusal —
   model identity, prompt version and generation timestamp intact — so the record shows a
   refusal *of something still visible* (US-9.3, US-14.3).

### Design notes

- A rejection records **no resolution values**; the summary says so explicitly rather than
  showing an empty value table (FR-12 reject process, Y2 `RESOLUTION_VALUES_NOT_ALLOWED`).
- "Not recorded (rejected)" is used wherever a rejected after-value would otherwise be blank —
  an empty cell is ambiguous between *no value* and *not rendered* (US-14.4, FR-14.6).
- There is deliberately **no undo, no reopen, no amend, and no "request changes"** control
  anywhere on a closed case (US-5.3, FR-10.12).
## Flow 4: Reconstruct a resolved case from its audit trail

**Journey:** JRN-01.5 (and, indirectly, JRN-02.1 — the oversight reviewer has no interface of
his own and is answered by a specialist reading this screen).
**Trigger:** A case decided some time ago is questioned.
**User stories:** US-14.1, US-14.2, US-14.3, US-14.4, US-14.5, US-14.7, US-10.7, US-5.4, US-13.2
**Screens:** (queue, which does not list it) → Case detail, closed → Audit trail

```
[Specialist holds the case reference CE-2026-000137]
        │
        │ the queue lists OPEN cases only — a closed case is NOT browsable there,
        │ and there is no cross-case search box anywhere in the product
        ▼
[4. Case detail  /cases/CE-2026-000137]  ← reached by the retained reference / link
        │
   ┌────────────────────────────────────────────────────────────────────┐
   │ h1 Case CE-2026-000137                                             │
   │ State: Rejected  [■ Closed]        Received: 11 Sep 2026, 2:32 p.m.│
   │ usa-alert--info (slim): "This case is closed. The decision below   │
   │ is final and cannot be changed."                                   │
   │ No editing affordance exists anywhere on this screen.              │
   └────────────────────────────────────────────────────────────────────┘
        │ in-page nav: "Audit trail"   (or direct /cases/CE-2026-000137/audit)
        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ h2 Audit trail                                                           │
│ "Every state change on this case, oldest first. This record cannot be    │
│  edited or deleted."                                                     │
│ ✓ Record integrity verified — 5 events in sequence.                      │
│                                                                          │
│ <ol>                                                                     │
│  1. Cargo entry received                Event 1 of 5                     │
│     Who:  A. Rivera (specialist)  [👤 Specialist-entered]                │
│     When: 11 September 2026, 2:32 p.m. EDT                               │
│     What changed: — → Received                                           │
│     Values: 11 fields, each after_origin Specialist-entered              │
│  2. Validated against required-information rules                         │
│     Who:  System, during A. Rivera's submission                          │
│  3. Exception opened                     Who: System, during …           │
│  4. AI recommendation generated                                          │
│     Who:  AI (gpt-4o-2026-05)     [⚙ AI-suggested]                       │
│     Values: port_of_entry_code  Not provided → 2704  (AI-suggested)      │
│  5. Recommendation edited and approved by specialist                     │
│     Who:  A. Rivera (specialist)                                         │
│     Reason given: full verbatim text, line breaks preserved              │
│     Values table (usa-table):                                            │
│       Field │ Before │ After │ Origin of the recorded value              │
│       port… │ 2704 [⚙ AI] │ 2709 [👤 Specialist] │ Specialist-entered    │
│ </ol>                                                                    │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼
 Four oversight questions answered on this screen alone:
   who decided ........ event 5 actor
   what the AI said ... event 4 after-values + the preserved recommendation section
   what changed ....... event 5 before → after, per value
   why ................ event 5 "Reason given"
```

### Steps

1. **Locate the case.** The queue deliberately shows only open cases and there is no search, so
   the case reference is the durable currency — it appears on the receipt outcome panel, the
   queue row, the case `h1`, the confirmation panel and the trail, unchanged (US-5.4, US-7.2).
2. **Open the closed case.** The closed presentation is unmistakable: state as *text* in the
   header, a slim info alert, decision controls absent from the DOM rather than disabled
   (US-10.7, FR-12.11). A read-only screen that merely looks editable would invite doubt about
   whether the record is still live.
3. **Open the trail.** In-page from the case, or by the `/cases/{ref}/audit` deep link, which
   scrolls to and focuses the region heading (US-14.1, FR-14.11).
4. **Answer *who and when*.** The actor line distinguishes `SPECIALIST`, `SYSTEM` and `AI` as a
   first-class property, not as a naming convention. **The AI is never rendered as a person** —
   no avatar, no human-style name, no pronoun (US-14.2, FR-14.4).
5. **Answer *what changed***. Before and after on every value row, with "Not provided" shown
   wherever a side is null (US-14.4).
6. **Answer *AI versus human***. The provenance indicator on each side of every value row,
   conveyed by text + icon + programmatic name, legible in monochrome and to a screen reader
   (US-14.2, US-2.5, NFR-4).

### Design notes

- **The trail is complete and never paginated, collapsed, grouped or truncated.** No "show
  more" hides events by default; every event the API returns is rendered, including an
  `action_type` the client does not recognise, which renders with its raw action name rather
  than being silently dropped (US-14.1, FR-14.1, FR-14 validation).
- **Integrity statement.** `chain_verified: true` renders "Record integrity verified — {n}
  events in sequence." `false` renders a `usa-alert--error`, announced assertively, naming the
  first divergent sequence, **with no repair action offered** (US-14.5, US-0.4).
- **Nothing on this screen can change it or take it away**: no edit, annotate, correct, hide,
  redact, delete, re-order, download, CSV, PDF, print view, copy-all, share or email control
  exists. Their absence is the design (US-14.6, PRD §10 #5).
- An **empty trail is an error, not an empty state** — receipt always writes an event, so
  silence about history renders `ErrorState`, never "No history yet" (FR-14.17).
## Flow 5: Decide a case with no recommendation available (degraded AI)

**Journey:** JRN-01.6 · **Trigger:** The AI provider is unavailable, slow, or returned an
unusable response, so no recommendation exists for the exception the specialist just opened.
**User stories:** US-10.5, US-10.6, US-9.1, US-9.4, US-12.1, US-11.4, US-14.2
**Screens:** Review queue → Case detail (pending → degraded) → Decision → Audit trail
**Guarantee proved:** the governed loop completes with the AI stage down (SM-13, NFR-9).

```
[3. Review queue] — unaffected by the AI's state, because exceptions derive from
                    validation, not from recommendation
        │ open the next case
        ▼
[4. Case detail] h2 "AI recommendation"
        │
        ├── status PENDING, < 60 s ────────────────────────────────────────┐
        │   ┌──────────────────────────────────────────────────────────┐   │
        │   │ usa-loading (aria-busy="true" on THIS REGION only)        │   │
        │   │ "Generating an AI recommendation…"                        │   │
        │   │ polite: "Generating an AI recommendation."                │   │
        │   │ Poll GET …/recommendation every 3 s, max 60 s             │   │
        │   │ Navigation stays available. Focus is never stolen.        │   │
        │   │ § Your decision below is ALREADY USABLE.                  │   │
        │   └──────────────────────────────────────────────────────────┘   │
        │              │                          │                        │
        │      becomes AVAILABLE          60 s elapse (stale)              │
        │              │                          │                        │
        │              ▼                          ▼                        │
        │     [in-place update,        ┌─────────────────────────────────┐ │
        │      polite: "An AI          │ same degraded presentation,     │ │
        │      recommendation is       │ copy: "No AI recommendation is  │ │
        │      now available."]        │  available yet."                │ │
        │                              └─────────────────────────────────┘ │
        │                                                                  │
        └── status UNAVAILABLE ────────────────────────────────────────────┘
            ┌────────────────────────────────────────────────────────────┐
            │ usa-summary-box (Degraded) — NOT usa-alert--error          │
            │ h3 "No AI recommendation available"                        │
            │ "The AI service did not respond in time."   ← mapped from  │
            │    failure_reason, plain language, never a raw provider     │
            │    error or stack trace                                    │
            │ "You can still resolve or reject this case. Your decision  │
            │  and reason will be recorded as usual."                    │
            │ No "Retry" or "Regenerate" control exists.                 │
            └────────────────────────────────────────────────────────────┘
        │
        ▼
[5. Decision] — control set driven by the server's permitted_decisions
   ┌────────────────────────────────────────────────────────────────────┐
   │ Step 1 of 2 — Choose an action                                     │
   │ [Resolve directly]        [Reject]                                 │
   │ "There is no AI recommendation to approve."                        │
   │  ← "Approve" is ABSENT FROM THE DOM, not rendered disabled         │
   └────────────────────────────────────────────────────────────────────┘
        │ "Resolve directly" → the same edit form, but pre-populated with the
        │ SUBMITTED ENTRY values (or empty) and badged "Specialist-entered",
        │ with the fields named by the validation findings
        ▼
   Reason required exactly as on any other case — the outage does not lower the bar
        ▼
   Step 2 of 2 → [Record decision] → 201 → Confirmation, every value HUMAN
        │
        ▼
[6. Audit trail]
   1 Cargo entry received                          A. Rivera (specialist)
   2 Validated against required-information rules  System …
   3 Exception opened                              System …
   4 No AI recommendation available                AI (not reached)   ← recorded as absence
   5 Recommendation edited and approved by specialist  A. Rivera
   No phantom AI value rows; no null-origin value; nothing implies a contribution
   that never happened.
```

### Steps

1. **Open the case.** Identical to any other case — the AI's state never removes work from the
   queue, it only narrows what a case contains (US-9.4, NFR-9).
2. **Wait, briefly.** Progress is a **live-region status**, not a bare spinner, and `aria-busy`
   is scoped to the recommendation region so the rest of the screen stays operable. Polling
   never disables the decision controls and never moves focus (US-10.5, FR-10.7).
3. **Read the degraded state.** Stated as a **condition of this case**, not as a temporary
   block and not as a failure. The copy explicitly tells the specialist to carry on, because
   anything that frames the state as "pending" invites parking the case in a side list
   (US-10.6, JRN-01.6 pain point).
4. **Decide without a proposal.** The decision controls are bound to the *case*, never to the
   recommendation. `permitted_decisions` from the server is authoritative; the client never
   infers it (US-7.5, FR-12.3).
5. **Record the reason.** Identical enforcement — there is no second-class record shape in the
   system (US-11.4).
6. **Verify the record.** Absence is recorded *as absence*: one `RECOMMENDATION_UNAVAILABLE`
   event attributed to AI with no value rows (US-9.4, SM-3).

### Design notes

- **`Degraded` ≠ `ErrorState`.** Nothing failed from the specialist's point of view. The
  `ErrorState` component (with "Try again") is reserved for a load the specialist actually
  needs re-attempted (FR-10.8, FR-2.22).
- **No retry, no regenerate.** A silent later retry would change what the case showed at
  decision time and undermine the trail's account of what the AI said when the human decided
  (US-9.4, FR-9.14). The absence is deliberate and stated in copy.
- Each `failure_reason` maps to one fixed plain-language sentence: `PROVIDER_TIMEOUT` → "The AI
  service did not respond in time."; `PROVIDER_UNAVAILABLE` → "The AI service could not be
  reached."; `PROVIDER_RATE_LIMITED` → "The AI service is busy."; `PROVIDER_AUTH_FAILED` /
  `INTERNAL_ERROR` → "The AI service could not be used."; `SCHEMA_INVALID` → "The AI response
  could not be read."; `CONTENT_FILTERED` → "The AI declined to answer for this entry."
- The stale-pending case (≥ 60 s) uses the **same** degraded presentation with different copy,
  so a specialist never faces two different-looking "no suggestion" screens (FR-10.7).
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
## Screen 1: Sign in

| | |
|---|---|
| **Route** | `/sign-in` (the only unauthenticated screen) |
| **Feature** | F1 on the F2 shell |
| **Purpose** | Establish the identity the audit trail attributes every decision to. This is an **accountability** gate, not merely a security perimeter. |
| **User stories** | US-1.1, US-1.2, US-1.4, US-1.5, US-2.1, US-2.3, US-2.4 |
| **Document title** | `Sign in — CargoExec` |
| **Shell form** | Reduced: `usa-banner` + header **without navigation and without sign-out** + `main` + footer |

---

### Layout (desktop ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ usa-banner  ▸ An official website of the United States government            │
│             [Here's how you know ▾]            ← expandable, keyboard-operable│
├──────────────────────────────────────────────────────────────────────────────┤
│ ⤷ Skip to main content            (usa-skipnav — first focusable element)     │
├──────────────────────────────────────────────────────────────────────────────┤
│ <header role="banner">                                                       │
│   CargoExec                                                                  │
│   — no primary nav, no display name, no Sign out on this screen —            │
├──────────────────────────────────────────────────────────────────────────────┤
│ <main id="main-content">                                                     │
│                                                                              │
│        ┌────────────────────────────────────────────────────┐                │
│        │  h1  Sign in to CargoExec                          │ tabindex="-1"  │
│        │                                                    │                │
│        │  [ error summary slot — rendered only on failure ]  │                │
│        │                                                    │                │
│        │  A star (*) marks required information.            │                │
│        │                                                    │                │
│        │  * Email address                                   │                │
│        │  [ usa-input  type=email autocomplete=username  ]  │                │
│        │                                                    │                │
│        │  * Password                                        │                │
│        │  [ usa-input  type=password                     ]  │                │
│        │              autocomplete=current-password         │                │
│        │                                                    │                │
│        │  [  Sign in  ]   ← single usa-button, primary       │                │
│        │                                                    │                │
│        │  (no "remember me" · no third-party sign-in ·      │                │
│        │   no register · no forgot password · no invite)    │                │
│        └────────────────────────────────────────────────────┘                │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ <footer role="contentinfo">  usa-footer--slim + usa-identifier               │
└──────────────────────────────────────────────────────────────────────────────┘
   [aria-live="polite" status region]   [aria-live="assertive" alert region]
   ← present in the DOM from first paint, visually hidden
```

The form is centred in a narrow measure (USWDS `grid-col-12 tablet:grid-col-6
desktop:grid-col-4`, `usa-form--large`) using spacing tokens only.

### Information hierarchy

| Priority | Content | Placement | Why |
|---|---|---|---|
| Primary | `h1` "Sign in to CargoExec"; the two credential fields; the single "Sign in" button | Centre of `main`, first in DOM after the error-summary slot | The only task on the screen |
| Primary (on failure) | Error summary | First child of the form region, above `h1`'s following content | Takes focus; must be encountered before the fields (US-2.4) |
| Secondary | Required-field convention statement | Directly above the first field | Convention must be stated before it is relied on (FR-2.11) |
| Secondary | Official-site banner and its expandable detail | Above the header, every screen | Federal convention; establishes the site's authority (US-2.1) |
| Tertiary | Footer identifier, required links | Bottom of page | Present for federal conformance; never competes with the task |
| **Absent** | Product marketing, screenshots, "what is CargoExec", version strings, environment badges | — | Nothing on this screen but the accountability gate |

### States

| State | Appearance | Focus | Live-region announcement |
|---|---|---|---|
| **Default** | Empty form, "Sign in" enabled | Screen `h1` on load; the specialist tabs to email | Polite: "Sign in to CargoExec." (document title) |
| **Submitting** | Button shows "Signing in…" with `aria-disabled="true"`; second activation ignored | Stays on the button | Polite: "Signing in." |
| **Auth failed (401)** | `usa-alert--error` summary: *"Email or password is incorrect."* Password field cleared, **email retained**. **No field-level error styling on either input** — the server does not distinguish them, so the UI must not imply it does | Error summary (`role="alert"`, `tabindex="-1"`) | Assertive: "There is a problem with your sign-in." |
| **Account inactive (403)** | Same summary pattern: *"This account is not active."* | Error summary | Assertive |
| **Throttled (429)** | Same summary pattern: *"Too many sign-in attempts. Try again in about 15 minutes."* | Error summary | Assertive |
| **Malformed request (422)** | Summary with per-field detail from `details[]`; inline `usa-error-message` on the named field with `aria-invalid="true"` | Error summary | Assertive |
| **Session expired (arriving here mid-task)** | `usa-alert--info` above the form: *"Your session expired. Sign in again to continue."* Unsaved input from the previous screen is **not** carried and **not** silently resubmitted after re-authentication | Screen `h1` | Polite |
| **Signed out (arriving here after sign-out)** | `usa-alert--success` (slim): *"You are signed out."* | Screen `h1` | Polite |
| **Network / 5xx** | Summary: *"We could not reach the server. Try again."* + "Try again" | Error summary | Assertive |
| **Empty / Loading** | Not applicable — the screen has no data to load; it never shows a skeleton | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| "Skip to main content" | `usa-skipnav` | First focusable element; moves focus into `main` |
| Banner "Here's how you know" | `usa-banner` accordion button | `Enter`/`Space` toggles, `aria-expanded` maintained, content inline (no popup — iframe-safe) |
| Email address | `usa-input` `type="email"`, `autocomplete="username"` | `<label for>` bound; `Enter` submits the form |
| Password | `usa-input` `type="password"`, `autocomplete="current-password"` | `<label for>` bound; `Enter` submits; cleared on any failure |
| "Sign in" | `usa-button` (primary) | Submits; enters busy state; double submission blocked |
| Error-summary items | `usa-alert--error` + links | Each link moves focus to the named control by `id` |

**Deliberately absent, and why a reviewer might look for it:** a "Remember me" checkbox
(session lifetime is server-authoritative and non-extendable — FR-1.3/FR-1.5); a "Forgot
password?" link and a "Create account" link (there is no self-service provisioning and no
administrative role — US-1.3, FR-1.13); third-party / PIV / SSO buttons (out of scope); a
"show password" toggle (not required by any story; would be a bespoke control); a role
selector (there is exactly one role — US-1.2).

### Accessibility (screen-specific; the full specification is in `Y2-accessibility.md`)

- **Landmarks:** one `banner`, one `main#main-content`, one `contentinfo`. **No `nav`** — the
  unauthenticated shell has no navigation (FR-2.4, FR-2.6).
- **Headings:** exactly one `h1`; no `h2` is needed and none is invented to fill a slot.
- **Focus management:** on load, focus is on the `h1`. On a failed submit, focus moves to the
  error summary. On success, the client navigates to `/queue` and focus moves to that screen's
  `h1`.
- **Error identification:** the summary is the **first child of the form region**, carries
  `role="alert"` and `tabindex="-1"`, is bound to the form by `aria-describedby`, and lists one
  item per error in server order. Because the server returns a single generic credential error,
  the summary lists exactly one item and **no input receives `aria-invalid`** — announcing an
  invalid field would leak which one was wrong (US-1.1).
- **Live regions:** assertive for the failure; polite for "Signing in", "You are signed out",
  and "Your session expired".
- **Keyboard-only path:** Tab → email → password → "Sign in"; `Enter` from either field
  submits; on failure focus lands on the summary and Shift+Tab returns to the fields. No trap;
  no `tabindex > 0`.
- **Visible focus:** USWDS focus outline (`outline: 0.25rem solid` focus token) on every
  focusable element, meeting AA non-text contrast; `outline: none` appears nowhere.
- **Zoom and reflow:** at 200% zoom and at 320 CSS px the form becomes a single full-width
  column with no horizontal body scrolling; the banner detail stacks; nothing is lost.
- **Colour independence:** the error state is carried by the alert's heading text, its icon and
  its position — not by red alone.
- **Timing:** the 8-hour absolute and 30-minute idle expiries are server-side; the screen never
  shows a countdown timer (no time-limit UI is introduced), and expiry is explained in words
  when the specialist arrives here (US-1.4).

### Acceptance checkpoints (from the stories)

1. Unknown email and wrong password produce **visually identical** screens (US-1.1).
2. The error summary receives focus and the password field is cleared while the email persists.
3. The whole sign-in completes by keyboard alone (US-2.3, SM-11).
4. The screen renders no navigation and no sign-out control (US-2.1).
5. A second activation of "Sign in" while a request is in flight does nothing (US-1.1).
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
## Screen 4: Case detail

| | |
|---|---|
| **Route** | `/cases/{caseReference}` (a URL bearing an exception uuid resolves equivalently and canonicalises to the case-reference URL by replace-state) |
| **Feature** | F10 on the F2 shell; hosts the Decision region (Screen 5) and the Audit trail region (Screen 6) |
| **Purpose** | The screen where the work happens: the exception, the validation failures that opened it, the AI's recommendation and its plain-language rationale — with per-value provenance visible. |
| **User stories** | US-10.1 … US-10.8, US-9.2, US-9.3, US-9.4, US-4.2, US-5.1, US-2.5 |
| **Document title** | `Case CE-2026-000137 — CargoExec` |

---

### Layout — open case with an available recommendation (desktop ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ usa-banner │ ⤷ Skip to main content                                          │
│ CargoExec │ Review queue │ New cargo entry │      A. Rivera   [Sign out]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ <main id="main-content">                                                     │
│  ← Back to review queue                                                      │
│                                                                              │
│  h1  Case CE-2026-000137                                      tabindex="-1"  │
│  ┌────────────────────────┬───────────────────────────────────────────────┐  │
│  │ State                  │ Open        [▲ Open]  ← text + icon, not a dot │  │
│  │ Received               │ 11 September 2026, 2:32 p.m. EDT              │  │
│  │ Submitted by           │ A. Rivera                                     │  │
│  └────────────────────────┴───────────────────────────────────────────────┘  │
│   (no queue position · no "3rd in line" · no days open · no due date)        │
│                                                                              │
│  On this page  (usa-in-page-navigation)                                      │
│   • Why this case is open • Submitted entry • AI recommendation              │
│   • Your decision • Audit trail                                              │
│                                                                              │
│ ══ h2  Why this case is open ═══════════════════════════════════════════════ │
│  This entry did not satisfy 2 required-information rules when it was received│
│  <ol>                                                                        │
│   1. Enter the port of entry code.          Port of entry code   RIV-030     │
│   2. Describe the goods in at least 10 characters.                           │
│                                             Goods description    RIV-091     │
│  </ol>   ← verbatim, server order, no re-wording, no severity or score       │
│                                                                              │
│ ══ h2  Submitted entry ═════════════════════════════════════════════════════ │
│  <dl>  all fourteen fields, F6 fieldset order                                │
│   Entry number            abc12345678        [👤 Specialist-entered]         │
│   Importer of record id   12-3456789         [👤 Specialist-entered]         │
│   Port of entry code      Not provided       (no badge — no value to attribute)│
│   Mode of transport       OCEAN              [👤 Specialist-entered]         │
│   …                                                                          │
│  </dl>                                                                       │
│                                                                              │
│ ══ h2  AI recommendation ═══════════════════════════════════════════════════ │
│  [⚙ AI-suggested resolution]                                                 │
│  The AI suggests:                                                            │
│    "Add the missing port of entry code and expand the goods description."    │
│                                                                              │
│  Nothing here has been applied. It is recorded only if you decide to         │
│  approve it.                                                                 │
│                                                                              │
│  h3  Why the AI suggests this                                                │
│    The entry did not include a port of entry, and the goods description      │
│    "bolts" is too short to identify the commodity. The bill of lading        │
│    number indicates arrival at Los Angeles/Long Beach, whose port code is    │
│    2704. …                     ← FULL text, verbatim, escaped, paragraph      │
│                                  breaks preserved, never collapsed           │
│                                                                              │
│  h3  Suggested values                                                        │
│  ┌──────────────────────┬──────────────────┬───────────────────────────────┐ │
│  │ Field                │ You submitted    │ The AI suggests               │ │
│  ├──────────────────────┼──────────────────┼───────────────────────────────┤ │
│  │ Port of entry code   │ Not provided     │ 2704   [⚙ AI-suggested]       │ │
│  │  Addresses: "Enter the port of entry code."              (RIV-030)      │ │
│  │  ↑ presented as an ADDITION, not a change                               │ │
│  ├──────────────────────┼──────────────────┼───────────────────────────────┤ │
│  │ Goods description    │ bolts            │ Stainless steel M8 hex bolts, │ │
│  │                      │ [👤 Specialist-  │ 1200 pieces [⚙ AI-suggested]  │ │
│  │                      │  entered]        │                               │ │
│  │  Addresses: "Describe the goods in at least 10 characters." (RIV-091)   │ │
│  └──────────────────────┴──────────────────┴───────────────────────────────┘ │
│  Generated by gpt-4o-2026-05 · prompt p-2026.09.1 · 11 Sep 2026, 2:32 p.m.   │
│  ← model metadata footnote                                                   │
│                                                                              │
│ ══ h2  Your decision ═══════════════════════════════════════  [Screen 5]     │
│ ══ h2  Audit trail  ═══════════════════════════════════════   [Screen 6]     │
│                                            id="audit-trail"                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Layout — closed case (read-only)

```
│  h1  Case CE-2026-000137                                                     │
│   State  Rejected   [■ Closed]      Received  11 Sep 2026, 2:32 p.m. EDT    │
│  usa-alert--info (slim):                                                     │
│   "This case is closed. The decision below is final and cannot be changed."  │
│                                                                              │
│  Why this case is open → unchanged      Submitted entry → unchanged          │
│  AI recommendation → rendered EXACTLY as it stood, still framed as a         │
│    proposal (including an UNAVAILABLE recommendation)                        │
│  Your decision → the recorded decision, read-only. THE F12 CONTROLS ARE NOT  │
│    IN THE DOM AT ALL — not disabled, absent.                                 │
│  Audit trail → includes the decision event                                   │
```

### The provenance indicator on this screen (the product's central claim)

Every displayed value carries the shared badge — **text + icon + programmatic name, never
colour alone** (US-2.5, US-10.4, NFR-4). Full specification in `Y0-patterns.md`.

> ⚠ **Phase 7 — redesign decided: Carbon Design System.** The badge text and the never-colour-
> alone requirement below are the authoritative interaction behaviour and are unaffected by the
> redesign. The specific icon names and border-style cue in the table are Phase-6 USWDS choices,
> pending replacement with Carbon-equivalent iconography (`@carbon/icons-react`) and visual
> treatment — the exact icon and treatment remain Phase 7 planning work (see `00-overview.md`).

| Value source | Badge text | Icon | Redundant non-colour cue | Where |
|---|---|---|---|---|
| Typed by the specialist | **Specialist-entered** | `person` | solid border | Submitted-entry list; "You submitted" column |
| Proposed by the AI | **AI-suggested** | `settings` | dashed border | "The AI suggests" column; section badge |
| Changed by the specialist during edit | **Specialist-modified** | `edit` | solid border + "Changed" marker | Decision region (Screen 5) |
| No value provided | *(no badge)* — the text "Not provided" | — | — | Anywhere a side is null |

A screen-reader user hears the provenance as text on every value. With CSS colour forced to
monochrome, origin remains discoverable on every value, because the label and the icon carry it.

### Information hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | The validation findings — *why this case is open* | First `h2`, before anything else | The stated basis of the exception is what the specialist actually reasons from, and it is the one thing that survives every outage (US-10.1) |
| Primary | The AI's recommended action + full rationale + per-value comparison | Third `h2` | The thing being judged, with its explanation on the same screen (US-10.3) |
| Primary | Provenance badge on every value | Inline with each value | The central value proposition (US-10.4) |
| Primary | The decision region | Fourth `h2` | The purpose of the screen |
| Secondary | The submitted entry, all fourteen fields | Second `h2` | Context for the findings; read before judging the proposal (US-10.2) |
| Secondary | Case state, received time, submitting specialist | Header definition list | Orientation |
| Secondary | Audit trail region | Fifth `h2` | Verification, one action from the work (US-14.1) |
| Tertiary | Rule identifiers; model id / prompt version / generation timestamp | Small supplementary text | Traceable but never competing with the plain-language message (US-9.3) |
| Tertiary | "On this page" links; "Back to review queue" | After the header | Navigation within a long screen |
| **Absent** | Receipt position, place-in-queue, time open, age, due date, SLA, severity, score, confidence percentage, "similar cases", export | — | Excluded by PROJECT.md; a confidence number would invite deference to the machine (US-10.8, FR-10.14) |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Default — open, recommendation `AVAILABLE`** | All five sections; decision controls rendered | `h1` on arrival | Polite: "Case CE-2026-000137." |
| **Loading** | F2 `Loading`, `aria-busy="true"` on `main` (after 300 ms) | Unchanged | Polite: "Loading…" |
| **AI recommendation pending (< 60 s)** | Recommendation section only: `usa-loading` + *"Generating an AI recommendation…"*; `aria-busy` scoped to **that region**; polls every 3 s for at most 60 s; **the decision region below is fully usable throughout** | **Not moved** — polling never steals focus | Polite once: "Generating an AI recommendation." Then on arrival: "An AI recommendation is now available." |
| **AI recommendation unavailable (degraded)** | `usa-summary-box` (F2 `Degraded`, **not** `ErrorState`): `h3` "No AI recommendation available" + one mapped plain-language cause + *"You can still resolve or reject this case. Your decision and reason will be recorded as usual."* **No Retry / Regenerate control** | Not moved | Polite: "No AI recommendation is available." |
| **Stale pending (≥ 60 s)** | Same degraded presentation, copy *"No AI recommendation is available yet."*; polling stops | Not moved | Polite |
| **Recommendation poll failure** | Degraded block with a generic cause; polling stops | Not moved | Polite |
| **Malformed recommendation** (`AVAILABLE` but action/rationale missing) | Degraded presentation rather than an empty block; client-side warning logged | Not moved | Polite |
| **Closed / already decided** | Read-only presentation above; controls absent from the DOM; `usa-alert--info` stating finality | `h1` | Polite: "Case CE-2026-000137. Closed." |
| **Case load failure (5xx / network)** | F2 `ErrorState`: *"We could not load this case."* + "Try again" | Error region | Assertive |
| **Case not found (404)** | "Case not found" inside the shell + link to `/queue` | Screen `h1` | Polite |
| **Entry passed validation (404 variant)** | *"That entry passed validation, so it has no exception."* + link to `/queue` — distinguished from a genuine not-found | Screen `h1` | Polite |
| **Session expired** | Redirect to `/sign-in?next={path}` | Sign-in `h1` | Polite |
| **Empty state** | Not applicable — a case always has findings, an entry and a trail | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| "Back to review queue" | `usa-button--unstyled` link | Returns to `/queue`, re-fetches, focus to that `h1` |
| "On this page" | `usa-in-page-navigation` | Anchor links to the five `h2` sections; keyboard-operable; same destinations as reading down the page |
| Decision controls | see `Screen-04-decision.md` | The **only** state-changing action reachable from this screen |
| Audit trail region | see `Screen-05-audit-trail.md` | Read-only |

**Deliberately absent:** any control that edits the entry, edits or deletes a finding, edits or
regenerates the recommendation, reopens or deletes a closed case, or exports anything; any
"mark as reviewed", "flag", "add note", "assign", "escalate" or "snooze" affordance; any
confidence score or thumbs-up/down feedback control on the AI output (US-10.7, FR-10.12,
PRD §10 #5). The words "applied", "fixed", "corrected", "updated" and "auto-resolved" appear
nowhere on the screen (US-9.2, FR-10.1).

### Accessibility (screen-specific)

- **Headings:** exactly one `h1` "Case {reference}", then the five `h2`s in the **normative
  order** — Why this case is open → Submitted entry → AI recommendation → Your decision →
  Audit trail. `h3` is used only inside those sections ("Why the AI suggests this", "Suggested
  values", "No AI recommendation available", "Decision recorded", one per audit event). No
  level is skipped (US-10.8, FR-10.10).
- **Visual layout matches DOM order**, so keyboard, screen-reader and visual reading order are
  the same sequence.
- **Provenance is programmatic:** each badge exposes its label as text (visually hidden where
  the visual treatment is compact), so an AT user hears "AI-suggested" on every proposed value
  and "Specialist-entered" on every typed value (US-2.5, FR-10.2).
- **Live regions:** polite for load, recommendation arrival, degraded outcome. **Focus is never
  moved by a background update** — the specialist may be mid-sentence in the rationale.
- **`aria-busy` is scoped to the recommendation region**, never to `main`, while polling — the
  rest of the case must stay readable and operable (US-10.5).
- **Keyboard-only path:** Tab through "Back to review queue" → in-page nav → findings list →
  entry list → recommendation → decision controls → audit trail; `H`-key heading navigation
  gives the same six destinations. No trap, no `tabindex > 0`.
- **Escaping:** all model-generated text (`recommended_action`, `rationale`, `proposed_value`)
  and all specialist text is rendered as escaped plain text. Markup, scripts and links in model
  output are never interpreted (FR-10.16) — this also keeps the iframe preview safe.
- **Timestamps:** absolute local datetime, month in words, zone abbreviation, `<time datetime>`;
  relative phrasing never used.
- **Colour independence:** case state is a text label with an icon, never a coloured dot;
  findings are a numbered list with text, not red-flagged rows.
- **Zoom / reflow:** at 320 px the comparison table re-flows to stacked field blocks
  (Field → You submitted → The AI suggests), keeping each badge adjacent to its value.
- **Unknown proposed field:** rendered under "Other suggested values" rather than dropped —
  nothing the record contains is hidden from the reader (FR-10 validation).

### Acceptance checkpoints

1. Every AI-proposed value is badged "AI-suggested" with text and icon; every submitted value
   is badged "Specialist-entered" (US-10.4).
2. With CSS colour overridden to monochrome, origin is still discoverable on every value, and a
   screen reader announces it too (US-2.5, SM-3).
3. The words "applied", "fixed", "auto-resolved" appear nowhere (US-9.2).
4. With the provider stopped, the degraded block renders and the decision controls still work
   end to end (US-10.6, SM-13).
5. Heading order is `h1` → the five `h2`s, no level skipped (US-10.8).
6. A closed case renders no decision controls in the DOM (US-10.7).
7. `/cases/{uuid}` canonicalises to `/cases/CE-2026-000137` in the address bar (US-5.4).
## Screen 5: Decision — edit / approve / reject with mandatory reason capture

| | |
|---|---|
| **Route** | `/cases/{caseReference}` § "Your decision" (section 5 of the case detail screen) |
| **Feature** | F12 on the F2 shell |
| **Purpose** | The accountable human act. Three deliberate, equally available actions, nothing pre-selected and nothing auto-applied; a mandatory reason on edit and on reject; what will be recorded shown before it is recorded, and what *was* recorded shown after. |
| **User stories** | US-12.1 … US-12.7, US-11.1, US-11.2, US-11.3, US-11.4, US-11.6, US-11.7, US-0.2 |

---

### Layout — Step 1: choose an action (open case, recommendation `AVAILABLE`)

```
══ h2  Your decision ═════════════════════════════════════════════════════════
 usa-step-indicator --counters
  (1) Choose an action   ← current, aria-current="step"
  (2) Review what will be recorded
  (3) Decision recorded

 Choose one. Nothing is selected for you, and nothing is applied until you
 record a decision.

 ┌───────────────────┐  ┌───────────────────────┐  ┌───────────────────┐
 │     Approve       │  │   Edit and approve    │  │      Reject       │
 └───────────────────┘  └───────────────────────┘  └───────────────────┘
   usa-button--outline     usa-button--outline       usa-button--outline
   ↑ IDENTICAL treatment. No primary styling on any one of them. No radio
     pre-selected. No autofocus. No keyboard shortcut. DOM/tab order is
     Approve → Edit and approve → Reject.

 Approve            Record the AI's suggested values exactly as proposed.
 Edit and approve   Change one or more suggested values, then record them.
                    A reason is required.
 Reject             Close this case without adopting the recommendation.
                    A reason is required.
```

### Layout — Step 1 when no recommendation exists (degraded / pending)

```
 ┌───────────────────────┐  ┌───────────────────┐
 │   Resolve directly    │  │      Reject       │
 └───────────────────────┘  └───────────────────┘
 There is no AI recommendation to approve.
 ↑ "Approve" is ABSENT FROM THE DOM — not rendered disabled. The control set
   comes from the server's `permitted_decisions`; the client never infers it.
```

### Layout — Step 2a: edit form

```
 usa-step-indicator: (1) done · (2) Choose values and reason ← current

 h3  Edit the suggested resolution
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ * Port of entry code                                                    │
 │   [ 2709                     ]        [✎ Specialist-modified]  Changed  │
 │   AI suggested: 2704                                                    │
 ├─────────────────────────────────────────────────────────────────────────┤
 │ * Goods description                                                     │
 │   [ Stainless steel M8 hex bolts, 1200 pieces ]   [⚙ AI-suggested]      │
 │   AI suggested: Stainless steel M8 hex bolts, 1200 pieces               │
 └─────────────────────────────────────────────────────────────────────────┘
   ↑ badge flips live as the value changes; reverting restores [⚙ AI-suggested]
   polite: "Port of entry code changed."  then  "1 field changed."

 * Reason for your changes                        (required)
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ usa-textarea  id="decision-reason"  aria-describedby="reason-hint …"    │
 └─────────────────────────────────────────────────────────────────────────┘
 Hint: At least 10 characters. Explain why you changed the recommendation.
 usa-character-count: 62 of 2000 characters used

 [ Continue ]                                  Cancel
```

### Layout — Step 2b: reject form

```
 h3  Reject the recommendation
 Rejecting closes this case without adopting the recommendation. No
 resolution values will be recorded.

 * Reason for rejecting                           (required)
 [ usa-textarea + usa-character-count ]
 Hint: At least 10 characters. Explain why the recommendation is not being
       adopted.

 [ Continue ]                                  Cancel
```

### Layout — Step 3: pre-submission summary (every path passes through it)

```
 usa-step-indicator: (1) done · (2) done · (3) Review what will be recorded ←

 ┌─ usa-summary-box ───────────────────────────────────────────────────────┐
 │ h3  This is what will be recorded                                       │
 │                                                                         │
 │ Decision       Edit the AI-recommended resolution and approve it        │
 │ Recorded by    A. Rivera                                                │
 │                                                                         │
 │ Port of entry code   AI suggested 2704 → you are recording 2709         │
 │                      will be recorded as  [👤 Specialist-entered]       │
 │ Goods description    unchanged → retains  [⚙ AI-suggested]              │
 │                                                                         │
 │ Reason         "Port code corrected to the actual arrival port per the  │
 │                 bill of lading."        ← exactly as it will be stored  │
 │                                                                         │
 │ This decision is recorded permanently against your name and cannot be   │
 │ changed afterwards.                                                     │
 │                                                                         │
 │ [ Record decision ]                       Back                          │
 │   usa-button (primary — the ONLY primary button in the decision path)   │
 └─────────────────────────────────────────────────────────────────────────┘
```

*Approve* reaches the same summary with the copy *"Approve the AI-recommended resolution"*,
every value badged "AI-suggested", the sentence *"All values will be recorded as AI-suggested,
and this decision will be recorded against your name."*, and a **"Reason (optional)"** field
explicitly labelled optional.

### Layout — Step 4: confirmation (rendered from the server's `201` body)

```
 usa-step-indicator: (1) done · (2) done · (3) Decision recorded ←

 ┌─ usa-summary-box ───────────────────────────────────────────────────────┐
 │ h3  Decision recorded                                    tabindex="-1"  │
 │ Recommendation edited and approved                                      │
 │ Recorded by A. Rivera · 11 September 2026, 3:04 p.m. EDT                │
 │ Case state: Resolved                                                    │
 │                                                                         │
 │ Reason given: "Port code corrected to the actual arrival port per the   │
 │                bill of lading."                                         │
 │                                                                         │
 │ Values recorded                                                         │
 │  Port of entry code  2709  [👤 Specialist-entered]   was 2704 [⚙ AI]    │
 │  Goods description   …     [⚙ AI-suggested]                            │
 │  ↑ origins come from the SERVER RESPONSE, never from a client guess     │
 │                                                                         │
 │ View the audit trail for this case      Back to review queue            │
 └─────────────────────────────────────────────────────────────────────────┘
  focus → h3 · polite: "Decision recorded. Case resolved."
  The action chooser and both forms are REMOVED FROM THE DOM.
```

### Information hierarchy

| Priority | Content | Placement |
|---|---|---|
| Primary | The three actions, at identical weight | Top of the decision region, after the step indicator |
| Primary | The reason field, on edit and reject | Below the values in the edit form; the only field in the reject form |
| Primary | The pre-submission summary — what *will* be recorded, including the origin each value will carry | Replaces the form before submission |
| Primary | The confirmation — what *was* recorded, from the server | Replaces everything after `201` |
| Secondary | Per-field "Changed" marker and the running changed-field count | Inline with each edited field |
| Secondary | The one-line description under each action | Under the button group |
| Secondary | Step indicator | Above the controls |
| Tertiary | Character counter; permanence statement | With the reason field; in the summary |
| **Absent** | Any default selection, "approve all", "apply and next", "decide and open next case", canned-reason dropdown, quick-reason chips, keyboard shortcut, undo, reopen, amend | — |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Open, recommendation `AVAILABLE`** | Three actions, nothing selected | Not moved (no autofocus) | — |
| **Open, `PENDING` / `UNAVAILABLE`** | "Resolve directly" + "Reject"; Approve absent from the DOM with the reason stated in text | Not moved | — |
| **Edit form open** | Values pre-populated from the AI proposal, each badged; required reason field | First form control | Polite: "Edit the suggested resolution." |
| **Direct-resolution form open** (no recommendation) | One input per field named by the findings, pre-populated from the submitted entry (or empty), badged "Specialist-entered" | First form control | Polite |
| **Field changed** | Badge flips to "Specialist-modified" + "Changed" marker (text + icon) | Stays in the field | Polite, at most once per field per change, plus "{n} fields changed" |
| **Reason missing / too short (client)** | Error summary above the form (focus) + inline `usa-error-message` + `aria-invalid="true"`; **no request is sent**; the specialist cannot reach the summary step | Error summary | Assertive: "1 problem with your submission" |
| **Reason rejected by the server (`422 REASON_REQUIRED`)** | Server message rendered in the summary and inline; **every entered value preserved** | Error summary | Assertive |
| **Incomplete value set (`422`)** | Error summary naming the missing fields | Error summary | Assertive |
| **Pre-submission summary** | Read-only restatement + "Record decision" + "Back" (Back preserves all input) | Summary `h3` | Polite: "Review what will be recorded." |
| **Recording** | "Record decision" busy + `aria-disabled="true"`; `Idempotency-Key` (generated when the summary rendered) is sent; **no auto-retry** | Button | Polite: "Recording decision." |
| **Success confirmation (`201`)** | Confirmation panel built from the response; controls removed from the DOM | Confirmation `h3` | Polite: "Decision recorded. Case {resolved/rejected}." |
| **Already decided (`409 EXCEPTION_ALREADY_DECIDED`)** | `usa-alert--info` — *"This case was already resolved by A. Rivera on 11 September 2026."* — controls removed, case refreshed from the server. **Never presented as the specialist's error** | The alert | Assertive |
| **Stale recommendation (`409 RECOMMENDATION_MISMATCH`)** | Alert: *"The recommendation changed. Review it again before deciding."* Stale summary discarded, not re-posted | The alert | Assertive |
| **Approve not permitted (`409 RECOMMENDATION_NOT_AVAILABLE`)** | Alert explaining there is no recommendation to approve; chooser re-rendered without Approve | The alert | Assertive |
| **Submission error (`500 DECISION_FAILED`)** | Error summary: *"The decision could not be recorded. Nothing was saved. Try again."* The case remains `OPEN`; all input preserved | Error summary | Assertive |
| **Unknown outcome (network)** | Alert advising the specialist to reload the case to see whether the decision was recorded; **no silent retry** | The alert | Assertive |
| **Session expired (`401`)** | Redirect to sign-in; input discarded with an explanation; never silently resubmitted after re-authentication | Sign-in `h1` | Polite |
| **Closed case** | Nothing of this region renders except the read-only recorded decision | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| "Approve" / "Edit and approve" / "Reject" | three identical `usa-button--outline` in a `usa-button-group` | One activation opens the corresponding step; **never** records a decision (two-step commitment) |
| Resolution value inputs | `usa-input` / `usa-textarea` (+ `usa-character-count` on long fields) | Pre-populated; live provenance badge; length capped at the structural limits |
| Reason | `usa-textarea` + `usa-character-count` (2000) | Free text only; required ≥ 10 chars after trim on edit/reject; labelled "(optional)" on approve |
| "Continue" | `usa-button--outline` | Applies client checks then renders the summary |
| "Record decision" | `usa-button` **primary** | The single commit action; single-flight; idempotency key |
| "Back" | `usa-button--unstyled` | Returns to the form with all input preserved; sends nothing |
| "Cancel" | `usa-button--unstyled` | Returns to the chooser; if anything was typed or changed, a `usa-modal` confirms the discard (focus-trapped, `Esc`-dismissible, focus returned to Cancel) |
| "View the audit trail for this case" | link to `#audit-trail` | In-page; moves focus to the trail heading |
| "Back to review queue" | link | Returns to `/queue`, re-fetched |

**Deliberately absent, and why:** a pre-selected or default action (a default converts
human-in-the-loop from a guarantee into a formality — R-1, US-12.1); any primary-button
emphasis on Approve alone; a keyboard shortcut for any action; a dropdown of canned reasons or
"quick reason" chips (they produce a record that does not actually explain the decision — R-8,
US-12.3); "approve all" / "apply and next" / "decide and open next case" (nothing may act on
more than the case being read — US-12.7); disabled-but-present controls after a decision (a
disabled control implies a capability that does not exist — FR-12.11); undo, reopen or amend.

### Accessibility (screen-specific)

- **Headings:** the region opens at `h2` "Your decision"; each step uses one `h3` ("Edit the
  suggested resolution", "Reject the recommendation", "This is what will be recorded",
  "Decision recorded"). No level skipped.
- **Step indicator:** `usa-step-indicator` with `aria-current="step"` on the current segment,
  so the two-step commitment is announced, not merely drawn.
- **No default / no autofocus:** focus is not placed on any of the three actions when the
  region renders; the specialist arrives at them by reading or tabbing (US-12.1).
- **Focus management:** after "Continue" → summary `h3`; after a client or server validation
  failure → error summary; after `201` → confirmation `h3`; after "Back" → the first form
  control; after cancelling the discard modal → the Cancel button.
- **Error identification:** error summary is `role="alert"`, `tabindex="-1"`, first child of
  the form region, one item per error in server order, each linking to its control;
  `aria-describedby` binds the inline message and `aria-invalid="true"` marks the control.
- **Live regions:** polite for changed-field marking, step transitions and the recorded
  outcome; assertive for validation failures and conflicts.
- **Changed-field marking is programmatic**: the badge text changes and the "Changed" marker is
  text + icon, exposed to AT — never colour alone (US-12.2, FR-12.6).
- **Keyboard-only path (complete task):** Tab → Approve → Edit and approve → Reject → `Enter` →
  value inputs → reason → "Continue" → (on error: focus lands in the summary, `Enter` on the
  item lands in the textarea) → summary read → "Record decision" → confirmation heading →
  "View the audit trail". Every step announced (US-12.7, SM-11).
- **Modal:** the discard-confirmation `usa-modal` traps focus while open, is dismissible with
  `Esc`, and is rendered in-page — no popup or new window, which the iframe preview forbids.
- **Zoom / reflow:** at 320 px the three actions stack vertically at full width in the same DOM
  order, preserving equal weight; the summary becomes a stacked definition list.

### Acceptance checkpoints

1. Three controls render with no pre-selection, no autofocus and equal visual weight (US-12.1).
2. "Continue" with an empty reason shows an inline error, moves focus to the error summary, and
   sends no request (US-12.3).
3. Changing one of three values marks it "Specialist-modified"; the confirmation shows it
   `HUMAN` with the other two `AI` (US-12.2, US-0.2).
4. The confirmation's values and origins come from the server response and match the audit
   trail exactly (US-12.5).
5. After recording, no decision control exists in the DOM and the case states it is final
   (US-12.7).
6. Deciding the same case in a second tab produces the already-decided alert, not a duplicate
   decision (US-11.6, US-12.6).
7. No "approve all", "apply and next" or canned-reason control exists anywhere (US-12.7).
## Screen 6: Per-case audit trail

| | |
|---|---|
| **Route** | `/cases/{caseReference}` § "Audit trail" (anchor `#audit-trail`); deep link `/cases/{caseReference}/audit` scrolls to and focuses the region heading |
| **Feature** | F14 on the F2 shell |
| **Purpose** | Answer "who decided this, what did the AI say, and what did the human change" **in place** — who, what, when, before/after, and AI-vs-human origin — with no export and no second system. |
| **User stories** | US-14.1 … US-14.7, US-13.1, US-13.2, US-13.3, US-0.4, US-2.5 |

---

### Layout (desktop ≥ 1024 px)

```
══ h2  Audit trail ═══════════════════════════════════════  id="audit-trail" ══
 Every state change on this case, oldest first. This record cannot be edited
 or deleted.

 ✔ Record integrity verified — 5 events in sequence.        ← integrity statement

 <ol>
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Cargo entry received                              Event 1 of 5      │
 │  Who           A. Rivera (specialist)                                   │
 │  When          11 September 2026, 2:32 p.m. EDT   <time datetime="…">   │
 │  What changed  — → Received                                             │
 │  <table> Values recorded — cargo entry received                         │
 │   Field              │ Before       │ After        │ Origin of the      │
 │                      │              │              │ recorded value     │
 │   Entry number       │ Not provided │ abc12345678  │ Specialist-entered │
 │                      │              │ [👤]         │                    │
 │   Goods description  │ Not provided │ bolts  [👤]  │ Specialist-entered │
 │   … 9 more fields                                                       │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Validated against required-information rules      Event 2 of 5      │
 │  Who   System, during A. Rivera's submission                            │
 │  When  11 September 2026, 2:32 p.m. EDT                                 │
 │  What changed  Received → Exception opened                              │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Exception opened                                  Event 3 of 5      │
 │  Who   System, during A. Rivera's submission                            │
 │  What changed  — → Open        Values: one row per finding              │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  AI recommendation generated                       Event 4 of 5      │
 │  Who   AI (gpt-4o-2026-05)          [⚙ AI-suggested]                    │
 │        ↑ never a person, never an avatar, never a pronoun               │
 │  When  11 September 2026, 2:33 p.m. EDT                                 │
 │  What changed  Pending → Available                                      │
 │  <table> Values recorded — AI recommendation generated                  │
 │   Port of entry code │ Not provided │ 2704 [⚙]     │ AI-suggested       │
 │   Goods description  │ bolts [👤]   │ Stainless…[⚙]│ AI-suggested       │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Recommendation edited and approved by specialist  Event 5 of 5      │
 │  Who           A. Rivera (specialist)                                   │
 │  When          11 September 2026, 3:04 p.m. EDT                         │
 │  What changed  Open → Resolved                                          │
 │  Reason given                                                           │
 │    "Port code corrected to the actual arrival port per the bill of      │
 │     lading."            ← FULL, verbatim, line breaks preserved,        │
 │                           never truncated, never behind a disclosure    │
 │  <table> Values recorded — recommendation edited and approved           │
 │   Port of entry code │ 2704 [⚙ AI-  │ 2709 [👤      │ Specialist-entered│
 │                      │  suggested]  │  Specialist-  │                   │
 │                      │              │  entered]     │                   │
 │   Goods description  │ Stainless…[⚙]│ Stainless…[⚙] │ AI-suggested      │
 └─────────────────────────────────────────────────────────────────────────┘
 </ol>

 ── deliberately not here ───────────────────────────────────────────────────
 no export · no download · no CSV · no PDF · no print view · no print
 stylesheet · no "copy trail" · no share · no email · no edit · no annotate ·
 no correct · no redact · no delete · no re-order · no collapse-by-type ·
 no pagination · no "show more" · no filter by actor · no cross-case query
```

### Action labels (normative)

| Audit action | Rendered heading | Actor rendering |
|---|---|---|
| `ENTRY_RECEIVED` | Cargo entry received | "{display name} (specialist)" |
| `VALIDATION_COMPLETED` | Validated against required-information rules | "System, during {display name}'s submission" |
| `EXCEPTION_OPENED` | Exception opened | "System, during {display name}'s submission" |
| `RECOMMENDATION_GENERATED` | AI recommendation generated | "AI ({model_id})" |
| `RECOMMENDATION_UNAVAILABLE` | No AI recommendation available | "AI ({model_id or 'not reached'})" |
| `RECOMMENDATION_APPROVED` | Recommendation approved by specialist | "{display name} (specialist)" |
| `RECOMMENDATION_EDITED_AND_APPROVED` | Recommendation edited and approved by specialist | "{display name} (specialist)" |
| `RECOMMENDATION_REJECTED` | Recommendation rejected by specialist | "{display name} (specialist)" |

An **unrecognised** `action_type` renders with its raw action name as the heading rather than
being skipped — nothing in the record may be hidden because the client did not recognise it.

### Information hierarchy

| Priority | Content | Placement |
|---|---|---|
| Primary | The chronological event list, oldest first, complete | The `<ol>`, in ascending `case_sequence` |
| Primary | Actor (and whether it is a human, the system, or the AI) per event | First line of each event |
| Primary | Per-value before → after with an origin badge on **each side** | The value table inside each event |
| Primary | Reason given, in full | Above the value table, on edit and reject events |
| Secondary | Timestamp, state change in words | Event definition list |
| Secondary | Integrity statement | Directly under the section intro |
| Tertiary | Sequence number ("Event 4 of 5") | Small supplementary text in each event heading row |
| **Absent** | Every control listed in the "deliberately not here" block | — |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Default** | Full trail rendered, oldest first | Region `h2` when deep-linked; otherwise not moved | Polite: "Audit trail. 5 events." |
| **Loading** | F2 `Loading` with `aria-busy="true"` on the region; **does not block the rest of the case screen from rendering** | Not moved | Polite: "Loading…" |
| **Refreshed after a decision** | The new decision event appears in place, without a manual reload | Not moved (focus belongs to the confirmation heading) | Polite: "Audit trail updated. 5 events." |
| **Integrity verified** | "✔ Record integrity verified — {n} events in sequence." | — | Included in the load announcement |
| **Integrity failed** | `usa-alert--error`: *"Record integrity check failed at event {sequence}. Report this immediately."* Events still render. **No repair action is offered** | The alert | Assertive |
| **Load failure (5xx / network)** | F2 `ErrorState`: *"We could not load the audit trail."* + "Try again" | Error region | Assertive |
| **Empty trail returned** | `ErrorState`, **not** an empty state — a case always has events, so silence about history is an error (FR-14.17) | Error region | Assertive |
| **Open case** | Renders the events so far (receipt, validation, exception opened, recommendation outcome); no decision event yet | — | Polite |
| **Closed case** | Additionally renders the decision event with its reason and value rows | — | Polite |
| **Case not found (404)** | Handled by the case screen | Screen `h1` | Polite |
| **Session expired** | Redirect to sign-in | Sign-in `h1` | Polite |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| *(none that change anything)* | — | The region contains **no** button, link, menu, form control or keyboard affordance that edits, annotates, corrects, hides, redacts, deletes, re-orders or exports an event. There is nothing to disable, because nothing is rendered (US-14.6, FR-14.7) |
| Deep link `/cases/{ref}/audit` | route | Scrolls to and focuses the region `h2` |
| "View the audit trail for this case" (from the decision confirmation) | in-page link | Moves focus to the region `h2` |

Browser-native text selection and printing are not features here and are **not** enhanced with
a print stylesheet, a "print view" or a "copy trail" control (US-14.6, PRD §10 #5).

### Accessibility (screen-specific)

- **Structure:** `<ol>` of `<li>` events, each with an `<h3>`, so screen-reader users get both
  list position ("4 of 5") and heading navigation across the history (US-14.1, FR-14.13).
- **Reading order within an event:** heading → Who → When → What changed → Reason → Values,
  matching the visual order exactly.
- **Value tables** are real `<table>`s with a `<caption>` naming their event ("Values recorded
  — recommendation edited and approved"), `scope="col"` headers and no ARIA grid roles.
- **Provenance:** the actor line makes AI-vs-human unmistakable, and **each side** of every
  value row carries the shared badge, with the after-value origin also stated in words in the
  Origin column — three redundant carriers (US-14.2, US-2.5).
- **The AI is never rendered as a person:** label "AI ({model_id})" only. Even if the API
  returns a non-null actor name on an `AI` event, the client still renders "AI".
- **Colour independence:** origin, actor type and the integrity result are each carried by text
  plus icon; the integrity failure is an alert with a heading, not a red dot.
- **Completeness:** "Not provided" is rendered wherever a side is null, and a rejection's null
  after-value renders "Not recorded (rejected)" — an empty cell is ambiguous between *no value*
  and *not rendered* (US-14.4).
- **Escaping:** every value, reason and model-generated string is rendered as escaped text; no
  field is interpreted as HTML or Markdown.
- **Live regions:** polite on load and on post-decision refresh; assertive on integrity failure
  and load error. The trail **never polls** and never auto-refreshes except after a decision
  recorded on the same screen (FR-14.12).
- **Timestamps:** absolute local date and time, month in words, zone abbreviation, `<time
  datetime>`; relative phrasing never used; where two events share a displayed minute the
  sequence number disambiguates them.
- **Stable ordering of value rows:** by `field_name`, so repeated views of the same event are
  identical (FR-14 validation).
- **Zoom / reflow:** at 320 px each value table re-flows to stacked per-field blocks — Field,
  Before (with badge), After (with badge), Origin — preserving every badge next to its value.

### Acceptance checkpoints

1. An edit-and-approve case renders events in order: received → validated → exception opened →
   AI recommendation generated → recommendation edited and approved (US-14.1).
2. The decision event shows the deciding specialist, the timestamp, the reason verbatim, and
   per-value before/after with origin on each side (US-14.3, US-14.4).
3. The AI event is attributed to "AI ({model_id})" and never to a person (US-14.2).
4. With colour removed and with a screen reader, every event's and every value's origin is
   still distinguishable (US-2.5, SM-3).
5. The region contains no control that edits, deletes, prints, downloads or exports (US-14.6).
6. "Who decided this, what did the AI say, and what did the human change" is answerable from
   this region alone (US-14.7, SM-2).
7. A tampered database renders the integrity failure alert at the correct sequence (US-14.5).
8. Recording a decision refreshes the trail in place without a manual reload (US-14.1).
## Y0: Interaction Patterns

> ### ⚠ Phase 7 — redesign decided: Carbon Design System
>
> PRD §5.1 F2 (Phase 7 update) replaces USWDS as the visual system. The replacement is now
> **decided: the Carbon Design System, IBM's open-source design system, via `@carbon/react`** —
> it ships its own token set (IBM Design Language type scale, spacing, and named colour themes
> such as White / Gray 10 / Gray 90 / Gray 100) and its own icon set (`@carbon/icons-react`).
> **The ten patterns below describe interaction behaviour** — focus movement, live-region timing
> and wording, state transitions, keyboard paths, DOM ordering — which is unaffected by which
> visual system renders it and **remains authoritative**. Where a pattern names a concrete USWDS
> colour token, icon, or component as its *current* implementation (most visibly Pattern 1's
> colour-token row below), that reference is Phase-6-era and will be superseded by a new token
> table drawn from Carbon's own status/severity colour tokens once a Carbon theme is chosen and
> the exact mapping is authored; it is left in place here as the historically accurate record of
> what shipped through Phase 6, not as a constraint on the redesign. See `00-overview.md` for the
> full note.

Patterns are defined once in the F2 shell and inherited without variation by every screen
(US-2.1 … US-2.6). A screen that re-implements one of these divergently is a defect.

---

### Pattern 1 — Provenance indicator (the product's central pattern)

**When to use:** on every displayed value and every event that has an origin — case detail,
decision region, audit trail. Used identically in all three; never varied (US-2.5, US-10.4,
US-12.2, US-14.2, NFR-4).

**Composition:** `usa-tag` + `usa-icon` (bundled sprite) + visible text label +
`usa-sr-only` text where the visual treatment is compact. A documented USWDS-conformant
composition of stock components; not a bespoke control.

**Never colour alone — four redundant carriers:**

| Carrier | AI-suggested | Specialist-entered | Specialist-modified |
|---|---|---|---|
| **Text label** (always visible) | "AI-suggested" | "Specialist-entered" | "Specialist-modified" |
| **Icon** (`aria-hidden="true"`) | `settings` (gear) | `person` | `edit` (pencil) |
| **Border shape** | dashed 2px | solid 2px | solid 2px + "Changed" marker |
| **Programmatic name** | tag text read as-is by AT | tag text read as-is | tag text read as-is |
| *(colour, token-based, AA)* — **Phase-6 USWDS tokens, pending Phase 7 replacement** | `indigo-60v` bg / white text | `gray-cool-70` bg / white text | `gold-20v` bg / `ink` text |

```
  [ ⚙ AI-suggested ]        dashed border   ← machine proposal, never applied
  [ 👤 Specialist-entered ] solid border    ← typed by a human
  [ ✎ Specialist-modified ] solid border    ← a human changed a machine proposal
       Changed                              ← additional text marker, edit form only
```

**Rules**
1. A value with no value carries **no badge**; the text "Not provided" is shown instead — a
   badge on nothing would be an unattributed attribution.
2. The badge is adjacent to the value it describes, never in a separate legend or key column
   that could be scrolled away from it.
3. In the audit trail, **both** sides of a before → after row carry their own badge, and the
   after-value origin is *also* stated in words in the Origin column.
4. Removing colour (forced monochrome, greyscale printing, low-vision colour filters) must
   leave origin fully discoverable — verified per screen by review (US-2.5 AC).
5. A screen reader receives the same distinction as a sighted reader, on every value.
6. The badge is never interactive — it is not a filter, a link, or a tooltip trigger.

---

### Pattern 2 — Error summary with focus movement

**When to use:** any submission the server rejected, and any client-side check that blocks a
step (US-2.4, US-6.4, US-12.3).

**Behaviour**
1. Render a `usa-alert--error` as the **first child of the form region**, with `role="alert"`
   and `tabindex="-1"`.
2. **Move focus to it.** The assertive region announces "{n} problems with your submission".
3. List one item per error, **in the exact order the server returned them** (for findings,
   ascending rule id) — the client never re-orders, merges, re-words or suppresses.
4. Each item is a link; activating it moves focus to the offending control by `id`. A
   cross-field finding links to the `<fieldset>` that contains both fields.
5. Each affected control renders `usa-error-message` inside its `usa-form-group--error`, bound
   by `aria-describedby`, with `aria-invalid="true"`.
6. Error text states what is wrong **and what to do**, in plain language. A raw error code is
   never the only content; a rule id may appear as supplementary small text.
7. **Every entered value is preserved.** A failed submission never costs typing.

**Where used:** sign-in (one generic item, no field marked invalid), entry form (one item per
validation finding), decision region (reason and value-set errors).

---

### Pattern 3 — Two-step commitment (no single click decides)

**When to use:** the decision path, exclusively (US-12.2, US-12.4, R-1).

```
 Choose an action  ──▶  Complete the form  ──▶  Review what will be recorded  ──▶  Record
   (no default)          (reason required        (origins named per value,         (single
                          on edit/reject)         permanence stated)               primary
                                                  [Back] preserves input           button)
```

- A `usa-step-indicator` makes the steps visible and announces `aria-current="step"`.
- No single activation both chooses and records. Choosing the AI's answer costs exactly the
  same number of deliberate keystrokes as refusing it.
- The commit button is the **only** primary-styled button in the path; the three actions are
  identical outline buttons.
- The `Idempotency-Key` is generated when the summary renders, so an ambiguous network failure
  cannot produce a second decision.

---

### Pattern 4 — Explicit outcome statement (never inference)

**When to use:** after every state-changing submission (US-6.3, US-12.5, P1).

- The outcome is stated **in words** in a `usa-summary-box`: *"Entry received and validated"*,
  *"Entry received. Exception opened."*, *"Decision recorded"*, *"Nothing was saved."*
- Success panels are rendered **from the server response**, never from an optimistic client
  assumption, and restate the *content* recorded — not merely the fact that something was.
- A business outcome (an exception being opened) is **never** styled as an error.
- Focus moves to the outcome heading; the polite region announces the outcome including the
  case reference.
- Every outcome panel offers the onward route, so no branch of the flow dead-ends.

---

### Pattern 5 — Live-region announcements

Two regions exist in the shell **from first paint**, both visually hidden (US-2.4, FR-2.16):

| Region | Used for | Examples |
|---|---|---|
| `aria-live="polite"` (status) | Navigation, load, counts, progress, success, degraded conditions | "Review queue. 11 open exceptions." · "Generating an AI recommendation." · "Decision recorded. Case resolved." · "Case CE-2026-000137 was resolved and is no longer in the queue." |
| `aria-live="assertive"` (alert) | Submission failures and conflicts | "2 problems with your submission" · "This case was already resolved." · "Record integrity check failed at event 3." |

Rules: announcements are short complete sentences; they never duplicate text that focus
movement already reads; background updates announce but never move focus.

---

### Pattern 6 — Shared state components

Provided once by the shell so no screen re-implements them (FR-2.22).

| Component | Semantics | Used by |
|---|---|---|
| `Loading` | USWDS loading indicator, `aria-busy="true"` **scoped to the region being loaded**, rendered only after 300 ms, announced "Loading…" | Queue, case detail, recommendation region, audit region |
| `Empty` | A message plus at most one call to action. **Not an error.** Never an empty table skeleton, never "no results for your filter" | Queue only (the only legitimately empty surface) |
| `ErrorState` | A stated cause plus an optional "Try again". No stack trace, ever | Queue, case, audit, unhandled client exception |
| `Degraded` | **Not an error.** States a condition of the case plus what the specialist can still do | Case detail, recommendation unavailable |
| `ReadOnlyNotice` | States that a record is final and cannot be changed | Closed case, audit trail intro |

The distinction between `ErrorState` and `Degraded` is load-bearing: a missing AI recommendation
is not a failure from the specialist's point of view, and presenting it as one would invite
parking the case instead of deciding it (US-10.6).

---

### Pattern 7 — Deliberate-absence statement

**When to use:** wherever a reviewer would reasonably expect a control that scope excludes
(US-8.5, US-14.6, US-10.8, SM-14).

- Screens do **not** render disabled controls, greyed-out menus, "coming soon" chips, or
  tooltips explaining a missing capability. A disabled control implies a capability that does
  not exist (FR-12.11).
- Where the absence would otherwise read as an oversight, the *copy states the condition*
  positively — "There is no AI recommendation to approve.", "Every exception has been decided.",
  "This case is closed. The decision below is final and cannot be changed."
- This document records each absence and its reason in the relevant screen chunk and in
  `Y4-assumptions.md`.

---

### Pattern 8 — Case reference as the durable identifier

`CE-YYYY-NNNNNN` is the one thing a specialist carries between screens and hands to someone who
asks (US-5.4, JRN-01.5). It appears unchanged on: the receipt outcome panel, the queue row
(as the link), the case `h1`, the address bar (uuid URLs canonicalise to it), the decision
confirmation, and the audit trail header. Every announcement that names a case names it by
this reference. There is no cross-case search, so this identifier is load-bearing.

---

### Pattern 9 — Single-flight submission and unknown outcomes

- Every submit control enters a busy state with a visible text change plus `aria-disabled="true"`;
  a second activation is ignored (never a silently duplicated request).
- **No automatic retry** on an unknown outcome: receipt is not idempotent, and a decision is
  guarded by an idempotency key but must not be re-sent blindly.
- On an unknown outcome the screen says so and directs the specialist to check — the review
  queue after an entry submission, the case after a decision submission (US-6.5, US-12.6).

---

### Pattern 10 — Iframe-safe interaction

The running application is embedded in a preview iframe, so every pattern here is in-page:

- No `window.open`, no popups, no `target="_blank"`, no new browser windows or tabs.
- No dependence on top-level framing, `window.top`, framebusting, or the parent document.
- The only overlay is the `usa-modal` discard confirmation, which is in-document and
  focus-trapped.
- The USWDS banner's "Here's how you know" expands inline.
- No print view, no downloads, no file pickers (which are excluded on scope grounds anyway).
- Focus, scroll and anchor navigation (`#audit-trail`) operate within the embedded document.

---
## Y1: Responsive Considerations

**Platform:** web only, current mainstream desktop browsers, with a responsive layout usable at
tablet width. **No native mobile client** (NFR-12, PRD §10 #10). Mobile-width behaviour is
specified here because WCAG 2.1 AA reflow at 320 CSS px is a statutory requirement, not because
a phone is a target device (US-2.6, FR-2.19).

All breakpoints are USWDS grid breakpoints; no custom media queries or pixel values appear in
screen-level styles (FR-2.2).

| USWDS breakpoint | Width | Treated as |
|---|---|---|
| `desktop` | ≥ 1024 px | Primary working width |
| `tablet` | 640 – 1023 px | Fully supported working width |
| `mobile-lg` and below | < 640 px (down to 320 px) | Reflow correctness; usable, not optimised |

---

### Desktop (≥ 1024 px)

- **Shell:** USWDS banner, then a basic `usa-header` with the product name at left, the two
  primary nav links inline, and display name + "Sign out" in `usa-nav__secondary` at right.
- **Measure:** body content is constrained to the USWDS `grid-container` with a readable
  measure; long prose (the AI rationale, reason text) is capped at `measure-5` so lines stay
  legible.
- **Sign in:** form centred in `desktop:grid-col-4`.
- **Entry form:** single column at `desktop:grid-col-8`. **Fields are never placed side by
  side**, so the tab order, the visual order and the error-summary order can never disagree.
- **Queue:** full-width `usa-table` with all four columns visible.
- **Case detail:** single content column at `desktop:grid-col-8` with the
  `usa-in-page-navigation` rendered as a sticky side list at `desktop:grid-col-3`; the in-page
  nav follows the content in DOM order, so it is never a tab-order obstacle before the `h1`.
- **Comparison rows / audit value tables:** rendered as tables with all columns visible.
- **Decision actions:** the three buttons sit in one horizontal `usa-button-group` at equal
  width — equal weight is a layout property as well as a styling one.

### Tablet (640 – 1023 px)

- **Shell:** the header collapses to the USWDS menu button; the nav opens as an in-page slide
  panel containing exactly the same two links plus display name and "Sign out". No third item
  appears at any width.
- **Case detail:** the in-page navigation moves above the content as a plain list of links
  (still after the header and before the first `h2`).
- **Queue:** the table keeps all four columns; the "Why it is open" column takes the remaining
  width and wraps.
- **Entry form / decision forms:** unchanged single column, full width of the container.
- **Decision actions:** the three buttons remain horizontal if they fit at equal width;
  otherwise they stack (see below). They always share one treatment.

### Mobile / narrow (< 640 px, down to 320 px)

- **Everything is a single column.** No content is hidden, collapsed behind a disclosure, or
  moved off-screen; no function is lost (WCAG 1.4.10).
- **Queue table reflow:** the `usa-table` becomes one **stacked block per case**, each block
  retaining the four labelled data points:

```
┌────────────────────────────────────────────┐
│ Case          CE-2026-000137   ← the link  │
│ Received      11 September 2026, 2:32 p.m. │
│ Entry number  abc12345678                  │
│ Why it is open  Enter the port of entry    │
│                 code. and 2 more (3 rules) │
└────────────────────────────────────────────┘
```
  The element remains a real `<table>` with its `<caption>` and header cells associated to each
  data cell, so screen-reader table semantics and the programmatic row count survive the
  reflow. Rows never become pointer-only click targets.

- **Comparison rows (case detail) reflow** to stacked field blocks, keeping each provenance
  badge adjacent to its value:

```
Port of entry code
  You submitted   Not provided
  The AI suggests 2704  [⚙ AI-suggested]
  Addresses: "Enter the port of entry code."   (RIV-030)
```

- **Audit value tables reflow** to stacked per-field blocks — Field, Before (badged), After
  (badged), Origin — so no before/after pairing is ever separated from its origin.
- **Decision actions stack vertically at full width**, in the same DOM order
  (Approve → Edit and approve → Reject), with identical treatment. Stacking must not introduce
  emphasis asymmetry (US-12.1).
- **Provenance badges** wrap onto their own line beneath the value rather than truncating; a
  badge is never abbreviated to an icon alone, because the text label is a required carrier.
- **Long text** (rationale, reason) wraps; it is never truncated with an ellipsis and never
  collapsed behind "show more" (FR-10.4, FR-14.5).

### 200% zoom

- At 200% browser zoom on a 1280 px viewport (≈ 640 CSS px) the tablet layout applies; no
  function or content is lost and **body content does not scroll horizontally**.
- Sticky elements are limited to the in-page nav at desktop only, and it releases at tablet
  width so it can never cover content at high zoom.
- Text resizes with the page; no fixed-height containers clip text; character counters, hints
  and error messages remain visible and associated.

### Motion and reduced motion

- The product has almost no motion by design. The only transitions are the banner disclosure,
  the mobile nav panel, the modal, and the loading indicator.
- With `prefers-reduced-motion: reduce`, transitions are disabled or reduced to instantaneous
  state changes; the loading indicator becomes a static "Loading…" status.
- **Nothing relies on motion to be understood**, and nothing auto-animates for longer than
  5 seconds (US-2.6, FR-2.21).

### Performance budget (felt as responsiveness)

- Sign-in, entry form, queue, case detail and audit trail each render within **2 seconds**
  under demonstration load (NFR-10, FR-2.23).
- A load exceeding 300 ms shows the USWDS loading indicator with `aria-busy="true"` on the
  loading region and an announced "Loading…".
- AI recommendation generation is permitted to exceed the budget; it shows accessible progress
  **without freezing the interface or blocking navigation**, and `aria-busy` is scoped to the
  recommendation region only (US-10.5).
- USWDS styles, fonts and the icon sprite are bundled and self-served, so first paint does not
  depend on an external network — which also makes the layout stable inside the preview iframe
  (FR-2.3).

### Iframe embedding

- The application is embedded in a preview iframe and is designed to be **width-responsive to
  its container**, not to the top-level window: layout decisions use the USWDS grid inside the
  document, never `window.top` dimensions or framing checks.
- No popups, new windows, `target="_blank"`, or top-level navigation is used anywhere
  (see `Y0-patterns.md` Pattern 10).
- Anchor navigation (`#audit-trail`), focus management and scroll all operate within the
  embedded document.

---
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
## Y3: State Designs — cross-screen matrix

The seven states this product must get right, each specified once here and cross-referenced to
its screen chunk. Every one is designed; none is left to a generic fallback.

---

### State 1 — Empty queue

**Screen:** Review queue (`/queue`) · **Stories:** US-8.3, US-8.1 · **Component:** F2 `Empty`

```
┌────────────────────────────────────────────────────────────────────────┐
│  h1  Review queue                                                      │
│  Open exceptions, oldest first by receipt.                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  h2  No open exceptions                                          │  │
│  │  Every exception has been decided. Create a cargo entry to start │  │
│  │  a new case.                                                     │  │
│  │  [ New cargo entry ]                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Not an error**, and never styled as one.
- **Never suggests a filter is hiding results** — there is no filter (US-8.5).
- **No empty table skeleton** and no zero-row table with headers.
- Offers exactly one route onward, which matters because there is no seeded dataset: an empty
  queue is the *normal starting state* of every demonstration (PRD §10 #7, R-9).
- Focus stays on the `h1`; polite announcement "No open exceptions."

---

### State 2 — Validation failure on the entry form (exception opened on receipt)

**Screen:** Cargo entry form · **Stories:** US-6.3, US-6.4, US-4.1, US-4.2, US-5.1

This is a **`201` success with a business outcome**, not an error. It is presented in a
`usa-summary-box`, never `usa-alert--error` (FR-6.8).

```
┌─ usa-summary-box ──────────────────────────────────────────────────────┐
│ h2  Entry received. Exception opened.                    tabindex="-1" │
│ Case CE-2026-000137                                                    │
│ This entry did not satisfy 2 required-information rules when it was    │
│ received.                                                              │
│   1. Enter the port of entry code.          Port of entry code RIV-030 │
│   2. Describe the goods in at least 10 characters.                     │
│                                             Goods description  RIV-091 │
│ [ Open case CE-2026-000137 ]  Go to review queue   Create another entry│
└────────────────────────────────────────────────────────────────────────┘
  + each finding also rendered inline on its field, aria-invalid="true",
    bound by aria-describedby; RIV-070/073 render on the Transport fieldset
  + the submitted values remain readable as a read-only definition list
```

- Findings rendered **verbatim, in server order** (ascending rule id), consumed unchanged by
  the panel, the summary and the inline messages (US-4.2).
- Focus → panel `h2`; polite: "Entry received. 2 required-information problems. Exception
  opened as case CE-2026-000137."
- Rule identifiers appear only as supplementary small text, never as the message itself.
- Distinguished in words from the other two outcomes — *validated clean* and *submission failed
  (nothing saved)* — so the specialist never has to infer which occurred.

---

### State 3 — AI recommendation pending

**Screen:** Case detail § AI recommendation · **Stories:** US-10.5, US-9.1

```
══ h2  AI recommendation ══════════════════════════════════════════════════
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ◐ Generating an AI recommendation…      aria-busy="true" on THIS      │
 │                                          region only                  │
 └──────────────────────────────────────────────────────────────────────┘
 Polling every 3 s, for at most 60 s.  Navigation stays available.
 ▼ § Your decision below is already usable — the decision path does not
   depend on a recommendation existing.
```

- Progress is a **live-region status**, not a bare spinner: polite "Generating an AI
  recommendation." announced once.
- `aria-busy` is scoped to the recommendation region, **never** to `main`.
- Polling never disables the decision controls, never blocks navigation, and **never moves
  focus** (US-10.5, FR-10.7).
- On arrival: the region updates in place and announces "An AI recommendation is now
  available."; at 60 s without a result it becomes State 4 with the copy "No AI recommendation
  is available yet."

---

### State 4 — AI recommendation unavailable (degraded; the specialist must still decide)

**Screen:** Case detail § AI recommendation + Decision region · **Stories:** US-10.6, US-9.4,
US-11.3 · **Component:** F2 `Degraded` — **not** `ErrorState`

```
══ h2  AI recommendation ══════════════════════════════════════════════════
 ┌─ usa-summary-box ────────────────────────────────────────────────────┐
 │ h3  No AI recommendation available                                   │
 │ The AI service did not respond in time.                              │
 │ You can still resolve or reject this case. Your decision and reason  │
 │ will be recorded as usual.                                           │
 │ (no Retry · no Regenerate · no "check again" control)                │
 └──────────────────────────────────────────────────────────────────────┘

══ h2  Your decision ══════════════════════════════════════════════════════
 [ Resolve directly ]   [ Reject ]
 There is no AI recommendation to approve.
 ↑ "Approve" is absent from the DOM, not disabled; the control set comes
   from the server's permitted_decisions.
```

- **Nothing failed from the specialist's point of view**, so the copy states a *condition of
  this case* and points at the way forward. Framing it as "pending" or as an error would invite
  parking the case in a side list (JRN-01.6).
- Cause strings are mapped per `failure_reason`; a raw provider error or stack trace is never
  shown (`Flow-05-degraded-ai.md` lists the seven mappings).
- "Resolve directly" opens the same edit form pre-populated from the **submitted entry** values,
  badged "Specialist-entered"; reason enforcement is identical to any other case.
- The audit trail records the absence as absence: one `RECOMMENDATION_UNAVAILABLE` event
  attributed to AI, with no value rows and no null-origin value (US-9.4, SM-3).

---

### State 5 — Already decided / conflict

**Screen:** Decision region · **Stories:** US-12.6, US-11.6, US-10.7 · **Components:**
`usa-alert--info`

```
┌─ usa-alert--info ──────────────────────────────────────────────────────┐
│ This case was already resolved by A. Rivera on 11 September 2026.     │
└────────────────────────────────────────────────────────────────────────┘
  → the action chooser and all forms are REMOVED FROM THE DOM
  → the case is re-fetched and re-rendered in its closed, read-only form
  → assertive announcement
  → "This case is closed. The decision below is final and cannot be changed."
```

- **Never presented as the specialist's error** — it is information about the record, typically
  caused by a second tab or a stale screen (FR-12.12).
- Related conflicts, same pattern:
  - `409 RECOMMENDATION_MISMATCH` → *"The recommendation changed. Review it again before
    deciding."* The stale pre-submission summary is **discarded, not re-posted**.
  - `409 RECOMMENDATION_NOT_AVAILABLE` → *"There is no AI recommendation to approve. Edit and
    approve, or reject."* The chooser re-renders without Approve.
  - `409 IDEMPOTENCY_KEY_REUSED` → advise reloading the case to see what was recorded.
- A closed case renders **no** decision control at all — not a disabled one, because a disabled
  control implies a capability that does not exist (US-12.7).
- There is no reopen, undo, amend or "decide again" affordance anywhere.

---

### State 6 — Submission error (nothing was saved)

**Screens:** Cargo entry form, Decision region · **Stories:** US-6.5, US-12.6, US-3.1

```
┌─ usa-alert--error  role="alert"  tabindex="-1"  ← RECEIVES FOCUS ──────┐
│ There is 1 problem with your submission                                │
│  • The entry could not be received. Nothing was saved. Try again.      │
│  [ Try again ]                                                         │
└────────────────────────────────────────────────────────────────────────┘
  → every typed value is preserved
  → assertive announcement
```

| Case | Copy | Behaviour |
|---|---|---|
| `500 RECEIPT_FAILED` | "The entry could not be received. Nothing was saved. Try again." | Atomic rollback means nothing partial exists; "Try again" re-submits the unchanged form |
| `500 DECISION_FAILED` | "The decision could not be recorded. Nothing was saved. Try again." | The case remains `OPEN`; all input preserved |
| `409 ENTRY_NUMBER_DUPLICATE` | "Entry number {n} already exists on case {ref}." | Summary carries a **link to the existing case**; inline error on `entry_number`; nothing persisted |
| `422 REQUEST_MALFORMED` / `REASON_REQUIRED` / `RESOLUTION_VALUES_INCOMPLETE` | The catalogue message, per field | Rendered in the summary **and** inline; input preserved |
| Network failure / unknown outcome | Entry: "We could not confirm whether this entry was received. Check the review queue before submitting it again." Decision: "Reload the case to see whether your decision was recorded." | **No automatic retry** — receipt is not idempotent, and a decision must not be blindly re-sent |
| `401` session expired | "Your session expired. Sign in again to continue." | Redirect to sign-in; input is **not** silently resubmitted after re-authentication |

Common to all: the error summary takes focus, states what happened **and what to do**, never
shows a stack trace or raw code as its only content, and never loses typing.

---

### State 7 — Success confirmation

**Screens:** Cargo entry form (receipt), Decision region (decision) · **Stories:** US-6.3,
US-12.5, US-4.4

```
┌─ usa-summary-box ──────────────────────────────────────────────────────┐
│ h2  Entry received and validated.                        tabindex="-1" │
│ Case CE-2026-000142                                                    │
│ No exception was opened — there is nothing to review for this entry.   │
│ [ Create another entry ]   Go to review queue                          │
└────────────────────────────────────────────────────────────────────────┘

┌─ usa-summary-box ──────────────────────────────────────────────────────┐
│ h3  Decision recorded                                    tabindex="-1" │
│ Recommendation edited and approved                                     │
│ Recorded by A. Rivera · 11 September 2026, 3:04 p.m. EDT               │
│ Case state: Resolved                                                   │
│ Reason given: "Port code corrected to the actual arrival port…"        │
│ Values recorded                                                        │
│   Port of entry code  2709 [👤 Specialist-entered]  was 2704 [⚙ AI]    │
│   Goods description   …    [⚙ AI-suggested]                            │
│ View the audit trail for this case      Back to review queue           │
└────────────────────────────────────────────────────────────────────────┘
```

- **States what was recorded, not merely that something was.** A confirmation that only says
  "Success" leaves the specialist unsure what was stored (JRN-01.2 "Confirm").
- **Built from the server response**, never from an optimistic client assumption, so the values
  and origins shown match the audit trail exactly (US-12.5).
- A clean receipt states its outcome **positively** — "no news" is never the thing the
  specialist has to interpret (US-4.4, P1).
- Focus → the panel heading; polite announcement including the case reference.
- The decision confirmation removes all decision controls from the DOM and offers the two
  onward routes, one of which is the trail — so verification is one action from the work.

---

### State coverage matrix

| State | Sign in | Entry form | Queue | Case detail | Decision | Audit trail |
|---|---|---|---|---|---|---|
| Default / ready | ● | ● | ● | ● | ● | ● |
| Loading | n/a | n/a | ● | ● | n/a | ● |
| Empty | n/a | n/a | **● State 1** | n/a (a case always has content) | n/a | n/a — an empty trail is an **error** |
| Validation failure | ● (generic, one item) | **● State 2** | n/a | n/a | ● (reason / value set) | n/a |
| AI pending | n/a | n/a | n/a | **● State 3** | ● (Approve absent) | n/a |
| AI unavailable | n/a | n/a | n/a | **● State 4** | ● (Resolve directly / Reject) | ● (records the absence) |
| Already decided / closed | n/a | n/a | row absent | ● read-only | **● State 5** | ● includes the decision event |
| Submission error | ● (401/403/429) | **● State 6** | ● (load error) | ● (load error) | **● State 6** | ● (load error, integrity failure) |
| Success confirmation | → lands on `/queue` | **● State 7** | ● (post-decision announcement) | n/a | **● State 7** | ● (refreshed in place) |
| Session expired | ● (info alert) | ● | ● | ● | ● | ● |

---
## Y4: Design Assumptions, Deliberate Absences, and Traceability

---

> **Phase 7 — F15 has no UI.** PRD §5.7 F15 (Seeded Demonstration Case) and FRD F15 add an
> idempotent, operator-run seed script to the product. It has no screen, no flow, and no
> specialist-facing surface of any kind — it is invisible to the UI layer entirely, reachable
> only as a command-line invocation against the deployment (FRD F15 FR-15.10). The screen
> inventory this document designs — Screen-00 through Screen-05 — is **unchanged and complete**
> for all specialist-facing surfaces; F15 does not add, remove, or alter any of them. See
> `00-overview.md` §3 for the corresponding note in the screen index.
>
> **Phase 7 — redesign decided: Carbon Design System.** PRD §5.1 F2 replaces USWDS as the visual
> system. The replacement is now **decided: the Carbon Design System, via `@carbon/react`**,
> which ships its own icon set (`@carbon/icons-react`) and its own colour tokens. Assumptions
> A-5, A-6 and A-7 below name concrete USWDS icons and colour tokens; those are Phase-6-era
> implementation choices, left in place as the historically accurate record of what shipped
> through Phase 6. The *underlying requirement* each assumption satisfies — a distinct icon per
> origin (FR-2.20), a non-colour border cue, and colour that is never the sole carrier — is a
> behavioural constraint that is unaffected by the redesign and must be re-satisfied by whichever
> specific `@carbon/icons-react` icons and Carbon colour tokens are chosen once Phase 7 planning
> selects a Carbon theme and authors the mapping. See `00-overview.md` for the full note.

### 1. Design assumptions

Every design decision in this document is drawn from the attached specifications. Where a
detail was genuinely unspecified, the option most consistent with USWDS convention and the
governed-decision-loop goal was chosen, and it is recorded here rather than left silent.

| # | Assumption | Where it applies | Why this option |
|---|---|---|---|
| A-1 | **`country_of_origin_code` is placed in the "Goods" fieldset**, as the first field, labelled "Country of origin". | Entry form | F6's layout enumerates four fieldsets totalling thirteen fields while FR-6.1 requires all fourteen and FR-6.2 specifies a hint for `country_of_origin_code`. Origin of goods belongs with the goods, and its rule (`RIV-080/081/082`) is a goods-description neighbour. |
| A-2 | **The three decision actions are rendered as three identical `usa-button--outline` controls**; `usa-button` (primary/filled) is reserved exclusively for the single commit action "Record decision". | Decision region | FR-12.1 forbids Approve being the only primary-styled control. Making all three outline and reserving the filled style for the commit step satisfies "no emphasis asymmetry" while keeping a USWDS-conventional primary action on the page. |
| A-3 | **The decision region uses `usa-step-indicator` (Choose an action → Review what will be recorded → Decision recorded).** | Decision region | FR-12.2 mandates two-step commitment but does not name a component. The step indicator makes the second step *visible and announced* rather than merely implemented, and is the USWDS component for exactly this. |
| A-4 | **The case detail "On this page" links use `usa-in-page-navigation`**, rendered as a side list at desktop and as a plain list above the content below desktop; it follows the `h1` in DOM order. | Case detail | FR-10.10 requires in-page section links after the header; this is the stock USWDS component for that pattern. |
| A-5 | **Provenance icons:** `settings` (gear) = AI-suggested, `person` = Specialist-entered, `edit` (pencil) = Specialist-modified; all three are in the bundled USWDS sprite and all are `aria-hidden="true"` beside their text label. | All provenance surfaces | FR-2.20 requires "a distinct icon" without naming one. These are unambiguous, available offline in the bundled sprite, and never used elsewhere in the product. |
| A-6 | **Provenance badges add a border-shape cue** (dashed = AI, solid = human) as a fourth, non-colour carrier. | All provenance surfaces | Exceeds the "never colour alone" requirement and survives monochrome, greyscale printing and colour-filter software. |
| A-7 | **Provenance colour tokens:** AI-suggested `indigo-60v` / white; Specialist-entered `gray-cool-70` / white; Specialist-modified `gold-20v` / `ink`. | All provenance surfaces | USWDS system tokens with AA-compliant pairings; distinct hue families so the two are separable for most colour-vision types, while never being the sole carrier. |
| A-8 | **Case state is rendered as a text label with an icon** ("Open", "Resolved", "Rejected"), not a coloured dot or a status pill relying on colour. | Case detail header | FR-2.17 requires state to be conveyed by a text label; this is the minimal conformant rendering. |
| A-9 | **Datetime format:** "11 September 2026, 2:32 p.m. EDT" — month in words, local zone abbreviation, wrapped in `<time datetime="…">`. | Queue, case detail, decision, audit trail | FR-8.14 and FR-14.15 require absolute, month-in-words, zone-bearing timestamps and forbid relative phrasing; this is one consistent rendering for all four surfaces. |
| A-10 | **The queue's "Refresh" control is a `usa-button--outline` placed immediately after the visible count**, and keeps focus on itself after refreshing. | Review queue | FR-8.10 requires an explicit refresh "after the table heading". Keeping focus avoids throwing a keyboard user to the top of a re-rendered table. |
| A-11 | **Below 640 px, tables reflow to stacked labelled blocks while remaining real `<table>` elements** with headers associated to data cells. | Queue, comparison rows, audit value tables | Satisfies 1.4.10 reflow without sacrificing the table semantics and programmatic row count that FR-8.6 and FR-14.13 require. |
| A-12 | **The `usa-modal` is used exactly once** — to confirm discarding typed input on Cancel — and nowhere else. | Decision region | FR-12.15 requires a discard confirmation; a modal is the USWDS pattern, and limiting it to one use keeps the product free of dialog-based interaction elsewhere. |
| A-13 | **Entry form fields are never laid out side by side**, at any breakpoint. | Entry form | Guarantees that tab order, visual order and error-summary order can never disagree — a common failure mode in multi-column federal forms. |
| A-14 | **The footer uses `usa-footer--slim` plus `usa-identifier`.** | All screens | The USWDS pattern for a federal application footer; required links only, no navigation duplication, no third destination introduced. |
| A-15 | **The visible queue count ("11 open exceptions") is presented as the table's accessible row count, not as a metric**, and appears nowhere else in the product. | Review queue | FR-8.6 requires a programmatic row count; framing and placement keep it from reading as a dashboard number (PRD §10 #2). |
| A-16 | **Sign-in shows no session countdown timer.** Expiry is explained in words when the specialist arrives at sign-in after it happens. | Sign in, shell | No story requires a timer; a countdown would add a time-limit UI (WCAG 2.2.1 surface) with no product benefit. |
| A-17 | **"Create another entry" resets to a wholly empty form** with focus on the first field and an announced status; previous values are never retained. | Entry form | FR-6.13 requires the reset; retaining values would amount to a draft/duplicate affordance, which FR-6.7 forbids. |
| A-18 | **Degraded and success panels both use `usa-summary-box`**, differentiated by their heading and copy, never by colour alone. | Case detail, entry form, decision | Keeps "this is a statement about your case" visually consistent, and keeps `usa-alert--error` reserved for genuine failures. |
| A-19 | **The required-information rule content these screens render is an inherited assumption, not settled fact.** Field labels, hint text, required markers, the twelve required-marked fields and every `RIV-*` message shown in `Screen-01`, `Screen-03` and `Screen-05` are drawn from FRD F4's `[ASSUMPTION]` rule set `RIV-2026.09`, which is explicitly open to CBP refinement. | Entry form, case detail, audit trail | Recorded so a rule-set revision reads as an expected update to these screens rather than a design defect. The *mechanism* these designs must preserve is fixed and not an assumption: findings are rendered verbatim in server order, bound to their named control (or, for `RIV-070`/`RIV-073`, to the Transport fieldset), with no severity, ranking or grading. |

---

### 2. Deliberate absences (what is NOT designed, and why)

Nothing below is drawn anywhere in this document. Each is excluded by `.planning/PROJECT.md`
and PRD §10, and each is stated rather than silently omitted (SM-14, US-7.3, US-8.5, US-14.6).

| Excluded capability | Where a reviewer might look for it | Stated in |
|---|---|---|
| Supervisor dashboard | A third nav item; a landing page with tiles | `00-overview.md` §2, `Screen-02` |
| Queue health / aging / volume / throughput / workload | Queue columns; a metrics strip; "2 days ago" phrasing | `Screen-02` "Why the controls are deliberately absent" |
| Reassignment / assignment / "claim" | Queue row actions; case detail header | `Screen-02`, `Screen-03` |
| Filtering, sorting, search, pagination | Queue toolbar; sortable headers | `Screen-02` |
| Prioritisation / severity / risk score / confidence score | Queue badge; finding list; AI recommendation block | `Screen-02`, `Screen-03` |
| Audit export (CSV, PDF, print package, copy-all, share, email, print stylesheet) | Audit trail toolbar | `Screen-05`, `Flow-04` |
| Bulk upload / file or API ingestion / ACE-ATS interface / template download | Entry form | `Screen-01` |
| Role switcher / second role / permissions UI / user administration | Header; sign-in | `Screen-00`, `00-overview.md` §2 |
| Seeded demo data | Empty queue state | `Y3-state-designs.md` State 1 |
| Autonomous resolution / auto-apply / "apply and next" / "approve all" | Decision region | `Screen-04` |
| Duty / tariff calculation, HTS classification fields | Entry form; recommendation | `Screen-01`, `Screen-03` |
| Native mobile app | — (web only; narrow-width support exists for WCAG reflow, not as a mobile product) | `Y1-responsive.md` |
| CI accessibility gate | — (the per-screen checklist is the enforcement mechanism) | `Y2-accessibility.md` §12 |
| Reopen / undo / amend / delete / redact / annotate a decision or an audit event | Closed case; audit trail | `Screen-04`, `Screen-05` |
| Regenerate / retry the AI recommendation | Degraded block | `Flow-05`, `Screen-03` |
| Draft save / autosave / duplicate entry | Entry form | `Screen-01` |
| Canned-reason dropdown / quick-reason chips | Reason fields | `Screen-04` |
| Closed-case browsing, cross-case search | Queue | `Screen-02`, `Flow-04` |
| Popups, new windows, `target="_blank"`, print view | Anywhere | `Y0-patterns.md` Pattern 10 |

---

### 3. User-story traceability

Every UI-bearing story has a design home. Non-UI stories (Epics 0, 3, 4, 5, 7, 9, 11, 13) are
referenced where their guarantees surface in the interface.

| Story | Where designed |
|---|---|
| US-0.2 (per-value provenance), US-0.4 (event order, tamper evidence) | `Y0-patterns.md` §1; `Screen-05` (value rows, integrity statement) |
| US-1.1, US-1.2, US-1.4, US-1.5 | `Screen-00-sign-in.md`; `Flow-00` |
| US-1.3 (identity attached to everything) | `Screen-00` (header identity after sign-in); `Screen-05` (actor on every event) |
| US-2.1, US-2.2 | `00-overview.md` §1.2 and §2; every screen's shell section |
| US-2.3 (keyboard-only) | `Flow-06`; `Y2-accessibility.md` §6 |
| US-2.4 (error identification) | `Y0-patterns.md` Pattern 2; `Y2-accessibility.md` §4–§5 |
| US-2.5 (provenance without colour) | `Y0-patterns.md` Pattern 1; `Screen-03`, `Screen-04`, `Screen-05` |
| US-2.6 (per-screen sign-off) | `Y2-accessibility.md` §11–§12 |
| US-3.1, US-3.2, US-3.3, US-3.4 | `Screen-01` (as-typed values, duplicate handling, no ingestion affordance) |
| US-4.1, US-4.2, US-4.3, US-4.4 | `Screen-01` (findings verbatim, server order, clean outcome); `Y3` State 2 |
| US-5.1, US-5.2, US-5.4 | `Screen-02` (receipt order); `Screen-03` (stated basis); `Y0` Pattern 8 |
| US-5.3 (no park/reopen) | `Screen-03`, `Screen-04` (no reopen affordance) |
| US-6.1 … US-6.6 | `Screen-01-cargo-entry-form.md`; `Flow-00`, `Flow-01` |
| US-7.1, US-7.2, US-7.3, US-7.4, US-7.5 | `Screen-02`; `Screen-04` (`permitted_decisions` authoritative) |
| US-8.1 … US-8.6 | `Screen-02-review-queue.md` |
| US-9.1 … US-9.5 | `Screen-03` (proposal framing, model metadata, degraded); `Flow-05` |
| US-10.1 … US-10.8 | `Screen-03-case-detail.md` |
| US-11.1 … US-11.7 | `Screen-04-decision.md` (surfaced behaviour of the decision API) |
| US-12.1 … US-12.7 | `Screen-04-decision.md`; `Flow-02`, `Flow-03` |
| US-13.1 … US-13.5 | `Screen-05` (one event per change, who/what/when/before/after/origin, reason placement) |
| US-14.1 … US-14.7 | `Screen-05-audit-trail.md`; `Flow-04` |

### 4. Journey coverage

| Journey | Flow chunk |
|---|---|
| JRN-01.1 Happy path — clean receipt | `Flow-00-sign-in-and-clean-entry.md` |
| JRN-01.2 Core loop — exception to approval | `Flow-01-exception-to-approval.md` |
| JRN-01.3 Edit path | `Flow-02-edit-and-approve.md` |
| JRN-01.4 Reject path | `Flow-03-reject.md` |
| JRN-01.5 Audit reconstruction | `Flow-04-audit-reconstruction.md` |
| JRN-01.6 Degraded AI | `Flow-05-degraded-ai.md` |
| JRN-01.7 Accessibility path | `Flow-06-keyboard-screen-reader.md` |
| JRN-02.1, JRN-03.1 (non-user) | **No screen, route, role or control.** JRN-02.1's oversight questions are answered by a specialist reading `Screen-05`; JRN-03.1 is a witnessed walkthrough of Flows 0–6. |

### 5. Success-metric support

| Metric | How these designs support it |
|---|---|
| SM-1 loop completeness | Flows 0–1 walk all six stages through the six screens with no workaround |
| SM-2 decision traceability | `Screen-05` answers who / what the AI said / what the human changed / why, in place |
| SM-3 provenance attribution | `Y0` Pattern 1 applied to every value on `Screen-03`, `Screen-04`, `Screen-05` |
| SM-4 zero auto-apply | `Screen-04`: no default, no pre-selection, two-step commitment, controls removed after decision |
| SM-5 reason capture | `Screen-04`: required reason on edit and reject, free text only, rendered in the trail |
| SM-9 rationale intelligibility | `Screen-03`: full verbatim rationale, never truncated or collapsed, on the same screen as the proposal |
| SM-10 / SM-11 accessibility and keyboard | `Y2-accessibility.md`, `Flow-06` |
| SM-12 USWDS conformance | `00-overview.md` §1.2 component register |
| SM-13 degraded completability | `Flow-05`, `Y3` State 4 |
| SM-14 scope discipline | §2 of this chunk; per-screen "deliberately absent" blocks |

---
