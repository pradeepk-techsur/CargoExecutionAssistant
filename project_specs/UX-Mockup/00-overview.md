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
