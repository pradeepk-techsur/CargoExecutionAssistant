## 7. Accessibility Architecture (USWDS + Section 508 / WCAG 2.1 AA)

### 7.1 The strategy: conformance by construction, verified by manual review

Accessibility is statutory for a federal application, and v1 has **no automated gate** (PROJECT.md, PRD §10 #1). That combination dictates the architecture: conformance cannot depend on catching defects late, so it is built into the layer every screen inherits and then confirmed screen by screen by a human, including an assistive-technology walkthrough.

Three architectural moves carry the burden:

1. **One shell, one set of patterns.** Landmarks, skip link, focus management, form pattern, error summary, live regions, state components, and the provenance badge exist **once** in F2 and are inherited by every screen (F1's sign-in, F6, F8, F10, F12, F14). A screen cannot accidentally have a different heading structure or a different error pattern because it does not own those things.
2. **USWDS components only, no bespoke interactive controls.** Every interactive control is a USWDS component or a composition recorded in the conformance register. Custom widgets are the single largest source of accessibility defects; the architecture removes the ability to introduce one casually.
3. **Type-level and lint-level enforcement of the two requirements most likely to regress silently** — provenance not conveyed by colour alone, and values rendered without their origin (§3.18).

### 7.2 USWDS integration

| Concern | Design |
|---|---|
| Source | `@uswds/uswds@3.11.0` consumed as **Sass + JS + icon sprite**, not as a wrapper component library, so the project owns the rendered DOM that manual review certifies |
| Styles | `web/styles/uswds.scss` sets the USWDS settings (`$theme-*` tokens: font stack, type scale, spacing, colour palette, focus ring) and imports USWDS packages; compiled by dart-sass into one stylesheet |
| Tokens | Typography, spacing, and colour come **only** from USWDS design tokens. A stylelint rule forbids a raw hex colour or a raw `px` spacing value in any screen-level style (FR-2.2) |
| JS behaviours | USWDS's own JS initialises the government banner disclosure and any USWDS component requiring behaviour; no bespoke JS re-implements a USWDS interaction |
| Assets | Fonts and the icon sprite are bundled and served by the application — no runtime CDN, so the sandbox renders correctly with no external network access (FR-2.3) |
| Icons | Used only alongside text, always `aria-hidden="true"`; no icon-only control exists for any primary action (FR-2.9) |

### 7.3 The USWDS conformance register

`docs/uswds-conformance-register.md` is a required build artefact: a table of every interactive control in the product mapped to the USWDS component it is, or to the documented USWDS-conformant composition it is built from. It is reviewed per screen (NFR-1, SM-12).

| Product control | USWDS basis |
|---|---|
| Sign-in form, entry form, edit-resolution form | `usa-form`, `usa-input`, `usa-textarea`, `usa-select`, `usa-label`, `usa-hint`, `usa-error-message`, `usa-button` |
| Required-field marking | `usa-label--required` + `usa-legend` convention statement |
| Error summary | `usa-alert usa-alert--error` composition with `role="alert"`, `tabindex="-1"`, and in-page links to controls |
| Review queue | `usa-table` (bordered, striped-off), with an accessible caption and a programmatic row count |
| Case detail sections | `usa-card`/section composition with a fixed heading order |
| Findings list | `usa-list` with per-finding field name and plain-language message |
| Recommendation block | `usa-summary-box` composition marked as an un-applied proposal |
| Decision actions | three `usa-button` controls (`primary`, `outline`, `secondary`) with **no** default/pre-selected state |
| Provenance badge | `usa-tag` composition + icon + visually-hidden text (never colour alone) |
| Degraded / empty / error / read-only states | `usa-alert` variants (`info`, `warning`, `error`) |
| Loading | `usa-loader`/spinner pattern with `aria-busy` on the loading region |
| Banner, header, nav, footer, skip link | `usa-banner`, `usa-header`, `usa-nav`, `usa-footer`, `usa-skipnav` |

Bespoke interactive controls are prohibited; introducing one requires a register entry justifying it as a USWDS-conformant composition, reviewed as part of the screen sign-off.

### 7.4 Structural accessibility guarantees in the shell

| Guarantee | Implementation |
|---|---|
| Landmarks | Exactly one `<header role="banner">`, one `<main id="main-content">`, one `<footer role="contentinfo">`, and — on authenticated screens — one `<nav aria-label="Primary">` |
| Skip link | `usa-skipnav` is the first focusable element on every page and moves focus **into** `main` |
| Official-site banner | The USWDS government banner renders above the header on every screen, its expandable detail keyboard-operable |
| Navigation set | Exactly two destinations: "Review queue" (`/queue`) and "New cargo entry" (`/entries/new`), current marked `aria-current="page"`. No third item exists in the DOM — no dashboard, reports, settings, or administration item (a DOM-level test asserts the count) |
| Heading order | Exactly one `<h1>` per screen; levels descend without skipping. Case detail reading order is fixed: entry → findings → recommendation → decision → audit |
| Focus on navigation | On every completed navigation the shell sets `document.title` to `{Screen} — CargoExec`, announces it politely, and moves focus to the screen's `<h1>` (`tabindex="-1"`) |
| Focus on in-place change | Any content replacement that is not a navigation moves focus deliberately to the element that explains the outcome — the error summary on failure, the confirmation heading on success |
| Keyboard | Every interactive component reachable and operable by keyboard in DOM order, no keyboard trap, no `tabindex > 0` |
| Visible focus | A focus indicator meeting AA non-text contrast on every focusable element; `outline: none` without a compliant replacement is forbidden by lint |
| Live regions | One `aria-live="polite"` status region and one `aria-live="assertive"` alert region, both present in the DOM from initial load so later insertions are announced; screens use `announceStatus()` / `announceError()` |
| Language / metadata | `<html lang="en">`; unique descriptive `<title>` per screen |
| Contrast | AA contrast (4.5:1 body, 3:1 large text and UI boundaries) satisfied by using approved USWDS token pairings only |
| Zoom / reflow | Usable at 200% zoom and at a 320 CSS-px viewport with no horizontal body scrolling; responsive to tablet width |
| Reduced motion | Every transition or animated indicator is disabled or reduced to an instantaneous change under `prefers-reduced-motion: reduce`; nothing auto-animates beyond 5 s; no content depends on motion |
| No third-party anything | No external script, font, analytics tag, session-replay tool, error-reporting SaaS, chat widget, or tracking pixel is loaded by any screen (FR-Y3.10) |

### 7.5 Colour independence for provenance, errors, and state

`FR-2.17` binds specifically on three kinds of information, each of which is the sort a colour-only treatment would ruin:

| Information | Non-colour carriers |
|---|---|
| AI-vs-human origin | Text label ("AI-suggested" / "Specialist-entered") + icon + token colour. In compact contexts the text is visually hidden but present for assistive technology, so a screen-reader user receives the same distinction. Rendered only by `ProvenanceBadge` (§3.18), so there is exactly one implementation to review |
| Validation errors | Icon + inline error text + `aria-invalid="true"` + error-summary entry — never red styling alone |
| Exception state | A text label (`Open` / `Resolved` / `Rejected`) — never a coloured dot alone |
| Specialist-modified value | Explicit "changed by specialist" marking on the edit form and in the trail, not a colour diff |

### 7.6 Accessible form and error pattern (inherited by F1, F6, F12)

1. Submit control enters a busy state (visible text change + `aria-disabled="true"`); repeat submission is blocked.
2. **The server response is authoritative.** Client-side hints never prevent a submission the server has not judged — an important interaction with the product's design, because an incomplete entry *must* be submittable in order to become an exception.
3. On a validation failure: an error summary as the first child of the form region, `role="alert"`, `tabindex="-1"`, receiving focus, listing one item per server finding **in server order** (ascending `rule_id`), each item an in-page link that moves focus to its control.
4. Each affected field renders inline error text inside the USWDS error wrapper, associated via `aria-describedby`, with `aria-invalid="true"` on the control.
5. The assertive region announces "{n} problems with your submission".
6. On success the outcome region renders and focus moves to its heading, announced politely — for receipt, stating explicitly whether the entry validated clean or opened an exception, with the case reference.

Field-level errors are bound to controls by the `details[]` field path in the error envelope (FR-Y2.4), which is why the API returns a field-level code per detail rather than a single message.

### 7.7 The review gate (the actual enforcement mechanism)

Because there is no CI gate, the per-screen review is **mandatory, not advisory** (R-3). A screen is not "delivered" until a signed record exists at `docs/a11y/{screen}.md` recording reviewer, date, screen, defects, and their resolution. The checklist per screen, at minimum:

```
□ exactly one h1; heading levels descend without skipping
□ landmark structure: banner, nav (authenticated), main, contentinfo
□ skip link present, first in focus order, lands inside main
□ every control has a programmatic accessible name
□ every form control has <label for>; hints via aria-describedby
□ required fields marked (visible + `required`); convention stated above the form
□ error summary appears, is role="alert", receives focus, links to each field
□ inline errors associated via aria-describedby with aria-invalid="true"
□ full keyboard traversal of every control; no trap; no tabindex > 0
□ the screen's primary task completable with the keyboard ALONE
□ visible focus indicator on every focusable element (AA non-text contrast)
□ AA contrast on all text and meaningful UI boundaries
□ colour independence: provenance, error, and state all readable without colour
□ every status and error announced in the correct live region, once, completely
□ usable at 200% zoom and at 320 px width, no horizontal body scrolling
□ reduced-motion behaviour correct
□ ASSISTIVE-TECHNOLOGY WALKTHROUGH of the primary task with a screen reader
□ (case screens) provenance distinguishable via screen reader and with colour off
```

Targets: **zero** WCAG 2.1 AA violations, 100% of screens reviewed and signed off (SM-10); 100% of the five product tasks completable by keyboard alone (SM-11); 100% of interactive components drawn from USWDS or a registered conformant composition (SM-12).

The five product tasks the keyboard-only requirement covers: sign in; create an entry; open a case from the queue; edit/approve/reject with a reason; read the audit trail.

### 7.8 Explicitly no CI accessibility gate

Stated as an architectural property, because its absence must be deliberate and visible:

- The repository contains **no `.github/workflows` directory and no CI workflow file of any kind**.
- `axe-core`, `@axe-core/*`, `jest-axe`, `pa11y`, `lighthouse-ci`, and equivalents are **not dependencies**, and the dependency allowlist test (§6.2) fails if one appears.
- The Playwright suite (§8.3) exercises **keyboard operability and functional flow** — it is a functional test of SM-11's task completability, not an accessibility conformance gate, and it asserts no WCAG rule.
- The enforcement mechanism is §7.7. A screen without a signed review record is not delivered.
- An architecture test asserts both absences (`no .github/`, no accessibility runner in the build pipeline), so "we added a quick axe check in CI" fails the build it was meant to join (F2 acceptance 8, PRD §10 #1).

---
