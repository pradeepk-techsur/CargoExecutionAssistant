## F2: USWDS Application Shell & Accessibility Foundation

**Priority:** P0 (statutory constraint) · **Surface:** **User-facing interface** / Content & assets · **Dependencies:** none · **PRD trace:** §5.1 F2, NFR-1, NFR-2, NFR-10, NFR-12, SM-10, SM-11, SM-12

**Description:** F2 is the shared user-interface foundation every screen is built from: the USWDS asset pipeline and component library, the page shell (official-site banner, header, `main` landmark, footer), navigation, the form and validation-message patterns, error/empty/loading/degraded states, focus management, and the live regions through which status and error messages reach assistive technology. It is the feature that makes Section 508 / WCAG 2.1 AA conformance a property of the delivered interface rather than an aspiration: the accessible patterns are defined and built once here and inherited by F1's sign-in screen, F6, F8, F10, F12, and F14. Conformance is achieved by design and **manual** review — including an assistive-technology walkthrough of every screen — and explicitly not by an automated gate; v1 adds no CI accessibility workflow and no `.github/workflows` file (PRD §10 #1).

**Terminology (feature-specific):**
- **Shell:** the persistent page frame (banner, header, main, footer) plus the routing outlet into which screens render.
- **Screen:** a routed view owned by a UI feature (sign-in, entry form, queue, case detail, audit trail).
- **Error summary:** the USWDS pattern that lists all field errors at the top of a form, is `role="alert"`, receives focus on appearance, and links to each offending field.
- **Live region:** an `aria-live` container used to announce state changes that are not focus changes. Two exist in the shell: one `polite` for status, one `assertive` for errors.
- **Provenance badge:** the shared component that marks a value or event as AI-originated or human-originated, using text plus icon plus colour — never colour alone (NFR-2, NFR-4).
- **Reduced-motion mode:** the behaviour applied when `prefers-reduced-motion: reduce` is set.

**Sub-features:**
- USWDS component library, design tokens, typography, and asset pipeline
- Standard page shell: banner, header with sign-out affordance, `main`, footer
- Primary navigation and route structure
- Accessible form pattern: labels, hints, required marking, inline errors, error summary with focus movement
- Shared state components: loading, empty, error, degraded, read-only
- Provenance badge component
- Status/error live-region announcement service
- Focus management on navigation and on dynamic content change
- Per-screen accessibility design-and-review checklist (manual process)

---

### Process — Screen render and focus management

1. Router resolves the route; if the session is absent, F1 FR-1.7 applies before any screen renders.
2. Shell renders banner, header, `main`, footer once; subsequent navigations replace only the contents of `main`.
3. On every completed navigation the shell sets the document title to `{Screen name} — CargoExec`, announces the new title in the polite live region, and moves focus to the screen's `<h1>`, which carries `tabindex="-1"`.
4. The screen renders its state: `loading` → (`ready` | `empty` | `error`).
5. A `loading` state that persists beyond 300 ms renders the USWDS loading indicator with `aria-busy="true"` on the region being loaded and an announced "Loading…" status.
6. An `error` state renders the shared error component with a stated cause and, where the action is retryable, a "Try again" button; the message is announced in the assertive region.
7. On any content replacement that is not a navigation (for example, submitting the decision form in place), focus MUST be moved deliberately to the element that explains the outcome — the error summary on failure, or the confirmation heading on success.

### Process — Form submission pattern (inherited by F6 and F12)

1. Specialist submits the form.
2. The submit control enters a busy state (visible text change plus `aria-disabled="true"`), and repeat submission is blocked.
3. The server response is authoritative. Client-side hints MUST NOT prevent a submission that the server has not yet judged (F6 FR-6.4, F12 FR-12.9).
4. On a validation failure response, the screen renders (a) an error summary listing every server finding in server order, each a link to its field, and (b) an inline error message on each affected field, programmatically associated via `aria-describedby` with `aria-invalid="true"` on the control.
5. Focus moves to the error summary container; the assertive live region announces "{n} problems with your submission".
6. On success, the screen renders the outcome region and moves focus to its heading, announcing the outcome politely.

---

### Functional Requirements

- **FR-2.1 — USWDS component provenance.** Every interactive control MUST be a USWDS component or a composition documented in the project's USWDS conformance register as USWDS-conformant. Bespoke interactive controls MUST NOT be introduced. Verified per screen by design review (NFR-1, SM-12).
- **FR-2.2 — Design tokens.** Typography, spacing, and colour MUST come from USWDS design tokens. No hard-coded hex colour or pixel spacing value may appear in screen-level styles.
- **FR-2.3 — Asset pipeline.** USWDS styles, fonts, and icon sprite MUST be bundled and served by the application itself (no third-party CDN dependency at runtime), so the demonstration environment renders correctly without external network access.
- **FR-2.4 — Page shell landmarks.** Every screen MUST render exactly one `<header role="banner">`, one `<main id="main-content">`, one `<footer role="contentinfo">`, and — on authenticated screens — one `<nav aria-label="Primary">`. A "Skip to main content" link MUST be the first focusable element on the page and MUST move focus into `main`.
- **FR-2.5 — Official-site banner.** The USWDS government banner ("An official website of the United States government") MUST render above the header on every screen, with its expandable detail keyboard-operable.
- **FR-2.6 — Header content.** The authenticated header MUST show the product name (linking to `/queue`), the signed-in specialist's display name, and a "Sign out" control wired to F1. The sign-in screen renders the header without navigation or sign-out (F1 FR-1.15).
- **FR-2.7 — Navigation set.** Primary navigation MUST contain exactly two destinations: "Review queue" (`/queue`) and "New cargo entry" (`/entries/new`). The current destination MUST be marked with `aria-current="page"`. No other navigation item exists — there is no dashboard, no reports, no settings, and no administration item (PRD §10 #2, #5).
- **FR-2.8 — Heading order.** Each screen MUST have exactly one `<h1>`, and heading levels MUST descend without skipping. Section headings within the case detail screen follow the reading order entry → findings → recommendation → decision → audit (F10 FR-10.10).
- **FR-2.9 — Accessible names.** Every interactive element MUST have a programmatic accessible name. Icon-only controls MUST NOT be used for any primary action; where an icon accompanies text, the icon MUST be `aria-hidden="true"`.
- **FR-2.10 — Label association.** Every form control MUST have a `<label for>` bound to its `id`. Hint text MUST be associated via `aria-describedby`. Placeholder text MUST NOT be used as a label or as the only hint.
- **FR-2.11 — Required-field indication.** Required fields MUST be marked with the USWDS required indicator (visible text `*` with a legend "Required", plus `required` on the control). A form containing required fields MUST state the convention above the first field. Optional fields MUST be visibly marked "(optional)" where a form mixes both.
- **FR-2.12 — Error summary.** The error summary MUST appear as the first child of the form region, use `role="alert"` and `tabindex="-1"`, receive focus when it appears, list one item per error in the order the server returned them, and link each item to the corresponding field's control `id`. Activating a summary link MUST move focus to that control.
- **FR-2.13 — Inline error text.** Each field error MUST render inside the field's USWDS error wrapper, be associated to the control via `aria-describedby`, and set `aria-invalid="true"`. Error text MUST state what is wrong and what to do, in plain language, and MUST NOT expose a raw error code as its only content (the code may appear as supplementary detail).
- **FR-2.14 — Keyboard operability.** Every interactive component MUST be reachable and operable by keyboard alone, in a DOM-order tab sequence, with no keyboard trap. Custom `tabindex` values greater than 0 MUST NOT be used. All five product tasks MUST be completable using the keyboard alone (SM-11).
- **FR-2.15 — Visible focus.** A visible focus indicator meeting WCAG 2.1 AA non-text contrast MUST be present on every focusable element; `outline: none` without a compliant replacement is prohibited.
- **FR-2.16 — Live regions.** The shell MUST render one `aria-live="polite"` status region and one `aria-live="assertive"` alert region, both present in the DOM from initial load (so that later content insertion is announced). An announcement service MUST expose `announceStatus(text)` and `announceError(text)` to screens. Announcements MUST be short, complete sentences and MUST NOT duplicate text that focus movement already reads.
- **FR-2.17 — Colour independence.** No information may be conveyed by colour alone. This binds specifically on: AI-vs-human provenance (FR-2.20), validation error indication (icon + text, not red alone), and exception state (text label, not a coloured dot alone). Verified per screen in review (NFR-2, NFR-4).
- **FR-2.18 — Contrast.** Text and meaningful non-text elements MUST meet WCAG 2.1 AA contrast (4.5:1 body text, 3:1 large text and UI component boundaries), satisfied by using USWDS token pairings from the project's approved palette.
- **FR-2.19 — Text resize and reflow.** Content MUST remain usable with no loss of function or content at 200% browser zoom and at a 320 CSS-pixel viewport width, with no horizontal scrolling of body content. The layout MUST be responsive and usable at tablet width (NFR-12). No native mobile client is in scope (PRD §10 #10).
- **FR-2.20 — Provenance badge component.** A shared component MUST render value and event provenance as: a text label ("AI-suggested" / "Specialist-entered"), a distinct icon, and a token-based colour treatment. It MUST expose the provenance to assistive technology as text (visually hidden text where the visual treatment is compact) so a screen-reader user receives the same distinction. The component is used by F10, F12, and F14 without variation.
- **FR-2.21 — Reduced motion.** Any transition or animated indicator MUST be disabled or reduced to an instantaneous state change when `prefers-reduced-motion: reduce` is set. No content may rely on motion to be understood, and nothing auto-animates for longer than 5 seconds.
- **FR-2.22 — Shared state components.** The shell MUST provide reusable `Loading`, `Empty`, `ErrorState`, `Degraded`, and `ReadOnlyNotice` components with consistent semantics, so F6/F8/F10/F12/F14 do not re-implement them divergently. `Empty` takes a message plus one optional call-to-action; `ErrorState` takes a cause plus an optional retry handler.
- **FR-2.23 — Responsiveness budget.** Shell and screen render MUST complete within 2 seconds under demonstration load for sign-in, entry form, queue, case detail, and audit trail (NFR-10). Long-running AI recommendation status is presented by F10 without blocking navigation or freezing the interface.
- **FR-2.24 — Language and document metadata.** `<html lang="en">` MUST be set; every page MUST have a unique, descriptive `<title>` following `{Screen name} — CargoExec`.
- **FR-2.25 — No automated accessibility gate.** v1 MUST NOT add an automated accessibility test gate, an axe-core CI job, or any `.github/workflows` file (PRD §10 #1). The enforcement mechanism is the checklist of FR-2.26, which is therefore mandatory rather than optional (R-3).
- **FR-2.26 — Per-screen accessibility review checklist.** Each screen MUST be signed off against a written checklist before it is considered delivered. The checklist MUST cover, at minimum: single `h1` and descending heading order; landmark structure; skip link; label and hint association; required marking; error summary focus movement; inline error association; full keyboard traversal of every control and completion of the screen's task by keyboard alone; visible focus on all controls; AA contrast on text and UI boundaries; colour-independence of provenance, error, and state indication; live-region announcement of each status and error; 200% zoom and 320 px reflow; reduced-motion behaviour; and an assistive-technology walkthrough of the screen's primary task with a screen reader. Sign-off records the reviewer, date, screen, and any defects with their resolution. Target: zero violations, 100% of screens reviewed (SM-10, SM-11).

---

**Inputs (to the shell, from screens and from F1):**
- Route path and parameters (case reference, etc.)
- Current session principal (display name) from `GET /api/session`
- Screen-supplied content: `h1` text, page title, state (`loading` | `ready` | `empty` | `error`), field error list, announcement text

**Outputs:**
- A rendered, landmark-correct, keyboard-operable page frame with USWDS styling
- Focus placed deterministically after every navigation and content replacement
- Status and error text announced to assistive technology
- Reusable form, state, and provenance components consumed by all other UI features
- A completed accessibility review record per screen

**Validation (shell-level):**
- An unknown route MUST render a "Page not found" screen inside the shell with a link to `/queue`, status announced, focus moved to its `h1`.
- An unexpected client-side exception MUST render the `ErrorState` component rather than a blank page, with a "Try again" action that re-runs the failed load.
- A route requiring a session MUST NOT render any screen content before the session check resolves (no flash of protected content).

**Error States:**

| Scenario | Presentation | Announcement | Recovery |
|---|---|---|---|
| Route not found | "Page not found" screen in shell | Polite: page title | Link to review queue |
| Session expired mid-use | Redirect to sign-in (F1 FR-1.8) | Polite: "Your session expired…" | Re-authenticate |
| Network failure on a load | `ErrorState`: "We could not load this page." | Assertive | "Try again" button |
| Network failure on a submit | Error summary above the form; input preserved | Assertive | Re-submit |
| Unhandled client exception | `ErrorState` with generic cause | Assertive | "Try again"; no stack trace shown |

**API Surface (this feature):** none of its own; consumes `GET /api/session` (F1) for header identity. See `Y1-api.md` §5 UI Routes for the route table this shell implements.

**Schema Surface (this feature):** none. F2 introduces no tables or columns.

**Acceptance Criteria:**
1. Every screen exposes exactly one `h1`, one `main`, one `banner`, one `contentinfo`, and (authenticated) one primary `nav`.
2. The skip link is the first focusable element and moves focus into `main`.
3. After navigating from the queue to a case, focus is on the case screen's `h1` and the document title has changed.
4. Submitting an invalid form moves focus to the error summary, whose items link to and focus their fields.
5. Primary navigation contains exactly "Review queue" and "New cargo entry" — no third item exists in the DOM.
6. Provenance is discoverable with colour disabled and via a screen reader on F10, F12, and F14.
7. All screens remain usable at 200% zoom and 320 px width with no horizontal body scrolling.
8. The repository contains no `.github/workflows` directory and no accessibility test runner in the build pipeline.
9. A signed accessibility review record exists for every screen, including an assistive-technology walkthrough.

---
