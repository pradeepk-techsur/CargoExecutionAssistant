## Epic 2: USWDS Application Shell & Accessibility Foundation (F2)

The accessible, USWDS-conformant foundation every screen inherits. Conformance is a property of
what ships, achieved by design and **manual** review with an assistive-technology walkthrough per
screen — there is no automated accessibility gate and no CI workflow in v1 (PRD §10 #1).

> **Phase 7 note — visual system replaced, accessibility bar unchanged.** As of Phase 7, USWDS is
> being replaced as the visual system by a newly-approved external design; the specific
> replacement tokens, components, and class names are not yet decided and are deferred to Phase 7
> discovery/UX planning (PRD §4.1, §5.1 F2). The stories below that name USWDS specifically by
> component, token, or class — US-2.1, US-2.4, US-2.5, US-2.6 — are **retained verbatim as the
> Phase-6/USWDS baseline** and are superseded in place, not rewritten here, pending the Phase-7
> UI-SPEC that restates them against the new design system's actual tokens and components (FRD F2
> §Phase 7 note; FR-2.1, FR-2.2, FR-2.3, FR-2.5, FR-2.11, FR-2.12, FR-2.13, FR-2.18, FR-2.20,
> FR-2.22). What does **not** move, independent of which design system implements it, is asserted
> outcome-based by new **US-2.7** below: full Section 508 / WCAG 2.1 AA conformance, no bespoke
> interactive control without a documented accessible equivalent, and the mandatory per-screen
> manual review — never an automated gate.

### US-2.1: Work in a page frame that looks and behaves like a federal application
**As a** cargo specialist, **I want to** work inside a standard USWDS page shell with an official-site banner and correct landmarks, **so that** the application behaves the way every other federal system I use behaves and my assistive technology can navigate it structurally.

**Acceptance Criteria:**
- [ ] Given any screen, when its DOM is inspected, then it contains exactly one `<header role="banner">`, one `<main id="main-content">`, one `<footer role="contentinfo">`, and — when authenticated — exactly one `<nav aria-label="Primary">`.
- [ ] Given any screen, when I press Tab from page load, then the first focusable element is "Skip to main content" and activating it moves focus into `main`.
- [ ] Given any screen including sign-in, when it renders, then the USWDS government banner ("An official website of the United States government") appears above the header with its expandable detail operable by keyboard.
- [ ] Given an authenticated screen, when the header renders, then it shows the product name linking to `/queue`, my display name, and a "Sign out" control wired to `DELETE /api/session`; the sign-in screen renders neither navigation nor sign-out.
- [ ] Given any interactive control on any screen, when it is reviewed against the USWDS conformance register, then it is a USWDS component or a documented USWDS-conformant composition, and typography, spacing, and colour come from USWDS design tokens with no hard-coded hex or pixel values in screen-level styles.
- [ ] Given a demonstration environment with no external network access, when a screen loads, then USWDS styles, fonts, and the icon sprite render correctly because they are bundled and served by the application itself.
- [ ] Given any screen, when the document is inspected, then `<html lang="en">` is set and the title follows `{Screen name} — CargoExec` and is unique per screen.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.2: Move between exactly the two places the product has
**As a** cargo specialist, **I want to** navigate between the review queue and the new-entry form and nothing else, **so that** the interface offers me only the work that exists rather than implying dashboards or reports that do not.

**Acceptance Criteria:**
- [ ] Given primary navigation, when it renders, then it contains exactly two destinations: "Review queue" (`/queue`) and "New cargo entry" (`/entries/new`).
- [ ] Given the current screen, when navigation renders, then the current destination carries `aria-current="page"`.
- [ ] Given the rendered DOM of any authenticated screen, when it is searched, then no third navigation item exists — no dashboard, reports, metrics, settings, administration, or export item.
- [ ] Given an unknown route, when I navigate to it, then a "Page not found" screen renders inside the shell with a link to `/queue`, focus moves to its `<h1>`, and the title is announced politely.
- [ ] Given a route requiring a session, when the session check has not resolved, then no protected screen content renders (no flash of protected content).
- [ ] Given an unhandled client-side exception, when it occurs, then the shared `ErrorState` component renders with a generic cause and a "Try again" action rather than a blank page, and no stack trace is shown.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.3: Complete every task using the keyboard alone
**As a** cargo specialist, **I want to** reach and operate every control with the keyboard and always see where focus is, **so that** I can do my whole job without a pointer, as some specialists in my role must.

**Acceptance Criteria:**
- [ ] Given any screen, when I traverse it with Tab and Shift+Tab, then every interactive component is reachable and operable in DOM order, with no keyboard trap and no `tabindex` value greater than 0.
- [ ] Given any focusable element, when it receives focus, then a visible focus indicator meeting WCAG 2.1 AA non-text contrast is shown; `outline: none` without a compliant replacement appears nowhere.
- [ ] Given a completed navigation, when the new screen renders, then the document title is set, the title is announced in the polite live region, and focus moves to the screen's `<h1>` (which carries `tabindex="-1"`).
- [ ] Given a content replacement that is not a navigation (for example recording a decision in place), when it completes, then focus is moved deliberately to the element that explains the outcome — the error summary on failure, the confirmation heading on success.
- [ ] Given the five product tasks (sign in; create an entry and read its outcome; open a queue case; edit/approve/reject with a reason; read the audit trail), when each is attempted with the keyboard alone, then all five complete successfully (SM-11).
- [ ] Given every interactive element, when its accessible name is checked, then one is present; no icon-only control is used for a primary action, and a decorative icon accompanying text is `aria-hidden="true"`.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.4: Be told clearly what went wrong and where, in a way my screen reader announces
**As a** cargo specialist, **I want to** get an error summary that takes my focus, inline messages bound to the offending fields, and status changes announced, **so that** I can correct a submission without hunting the page for what failed.

**Acceptance Criteria:**
- [ ] Given a form whose submission the server rejected, when the response renders, then an error summary is the first child of the form region with `role="alert"` and `tabindex="-1"`, receives focus, and lists one item per error in the exact order the server returned them.
- [ ] Given an error-summary item, when I activate it, then focus moves to the corresponding control by `id`.
- [ ] Given a field with an error, when it renders, then the message sits inside the field's USWDS error wrapper, is associated via `aria-describedby`, the control carries `aria-invalid="true"`, and the text states what is wrong and what to do in plain language rather than exposing a raw error code as its only content.
- [ ] Given the shell, when it loads, then one `aria-live="polite"` status region and one `aria-live="assertive"` alert region are present in the DOM from the outset, so later insertions are announced.
- [ ] Given a validation failure, when focus moves to the summary, then the assertive region announces "{n} problems with your submission", and announcements do not duplicate text that focus movement already reads.
- [ ] Given every form control on any screen, when inspected, then it has a `<label for>` bound to its `id`, hint text associated via `aria-describedby`, and no placeholder used as a label or as the only hint.
- [ ] Given a form with required fields, when it renders, then required fields carry the USWDS required indicator plus `required`, the convention is stated above the first field, and optional fields are visibly marked "(optional)" where a form mixes both.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.5: Tell an AI value from a human value without relying on colour
**As a** cargo specialist, **I want to** see one consistent provenance badge that states "AI-suggested" or "Specialist-entered" in text and icon, **so that** I can tell machine proposals from human values on sight, through my screen reader, and in monochrome.

**Acceptance Criteria:**
- [ ] Given any displayed value or event with a provenance, when it renders, then the shared badge component shows a text label ("AI-suggested" / "Specialist-entered"), a distinct icon, and a token-based colour treatment — never colour alone.
- [ ] Given the badge, when a screen reader reads it, then the provenance is exposed as text (visually hidden text where the visual treatment is compact), so an assistive-technology user receives the same distinction.
- [ ] Given the case detail, decision, and audit trail regions, when each renders, then they use this component without variation.
- [ ] Given CSS colour overridden to monochrome, when I review the case detail, decision, and audit trail regions, then AI-versus-human origin remains discoverable on every value and every event.
- [ ] Given validation error indication and exception state, when they render, then each is conveyed by icon plus text or a text label — never by red alone or a coloured dot alone.
- [ ] Given text and meaningful non-text elements, when contrast is measured, then body text meets 4.5:1 and large text and UI component boundaries meet 3:1 using approved USWDS token pairings.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.6: Have every screen reviewed and signed off for accessibility before it is called done
**As a** cargo specialist, **I want to** use screens that have each passed a written accessibility checklist including a screen-reader walkthrough, **so that** conformance is a property of what I am given rather than a promise attached to a later release.

**Acceptance Criteria:**
- [ ] Given each of the six screens/regions (sign-in, entry form, queue, case detail, decision, audit trail), when it is declared delivered, then a signed checklist record exists naming the reviewer, the date, the screen, and any defects with their resolution (SM-10: 100% of screens reviewed).
- [ ] Given the checklist, when it is applied, then it covers at minimum: single `h1` and descending heading order; landmarks; skip link; label and hint association; required marking; error-summary focus movement; inline error association; full keyboard traversal and keyboard-only task completion; visible focus; AA contrast; colour independence of provenance, error, and state; live-region announcement of each status and error; 200% zoom and 320 px reflow; reduced-motion behaviour; and an assistive-technology walkthrough of the screen's primary task.
- [ ] Given any screen at 200% browser zoom and at a 320 CSS-pixel viewport width, when I use it, then no function or content is lost and body content does not scroll horizontally; the layout remains usable at tablet width.
- [ ] Given `prefers-reduced-motion: reduce`, when a screen renders, then transitions and animated indicators are disabled or reduced to instantaneous state changes, nothing relies on motion to be understood, and nothing auto-animates beyond 5 seconds.
- [ ] Given the repository, when it is inspected, then there is no `.github/workflows` directory, no axe-core job, and no accessibility test runner in the build pipeline — the checklist is the enforcement mechanism and is therefore mandatory.
- [ ] Given the shared state components (`Loading`, `Empty`, `ErrorState`, `Degraded`, `ReadOnlyNotice`), when any screen needs one, then it uses the shell's component rather than re-implementing it, and a load exceeding 300 ms renders the USWDS loading indicator with `aria-busy="true"` and an announced "Loading…".
- [ ] Given any interactive screen (sign-in, entry form, queue, case detail, audit trail), when it is measured under demonstration load, then render completes within 2 seconds.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.7: Keep meeting federal accessibility standards no matter which visual system renders the shell
**As a** cargo specialist, **I want to** work in a shell that conforms to Section 508 / WCAG 2.1 AA regardless of which visual design system implements it, **so that** replacing what the application looks like never becomes a regression in who can use it.

**Acceptance Criteria:**
- [ ] Given the shell rendered under the Phase 7 visual system, when it is reviewed against the checklist, then it still meets Section 508 / WCAG 2.1 AA in full — landmarks, skip link, single `h1` and descending heading order, label/hint association, required-field indication, error-summary focus movement, full keyboard operability, visible focus, AA contrast, colour-independent signalling, and live-region announcement — with no criterion relaxed because the visual system changed (PRD §4.1, §5.1 F2; NFR-1, NFR-2).
- [ ] Given any interactive control introduced under the new visual system, when it is reviewed, then it is either drawn from that design system's own accessible component set, or a documented accessible-equivalence record exists naming the standard control or ARIA pattern it reproduces — a bespoke, undocumented control is not permitted under either design system (FRD F2 §Phase 7 note).
- [ ] Given the provenance badge, validation-error indication, and exception-state signalling that US-2.5 requires to be colour-independent, when the new visual system replaces their styling, then the same colour-independence property holds — text label plus icon, never colour alone — regardless of which token set supplies the colour.
- [ ] Given the per-screen accessibility review checklist (US-2.6), when a screen is re-delivered under the new visual system, then it is re-signed-off against that same checklist rather than carrying forward a Phase-6 sign-off for content that has visually changed.
- [ ] Given the FRD's Phase 7 note superseding the 26 USWDS-named rules in place, when this gap between USWDS removal and the Phase-7 UI-SPEC is reviewed, then this story — not a rewrite of US-2.1, US-2.4, US-2.5, or US-2.6 — is what continues to assert the accessibility bar during it.
- [ ] Given the repository, when it is inspected after the Phase 7 redesign ships, then there is still no `.github/workflows` accessibility gate and no axe-core job — conformance continues to be demonstrated by the manual checklist alone (PRD §10 #1).

**Priority:** P0 | **Feature Ref:** F2

---
