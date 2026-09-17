# Carbon Conformance Register

**TechArch §7.3 · FR-2.1 · SM-12 (Phase 7 redesign — the Carbon successor to `uswds-conformance-register.md`)**

Every interactive control the product ships is built from a Carbon Design System
(`@carbon/react`) component, or from a **documented Carbon-conformant
composition** of Carbon primitives. This register is the evidence for that
guarantee under the Phase-7 redesign, in the same role the USWDS register held
before it.

> **Bespoke interactive controls are prohibited.** Introducing one requires an
> entry in this register that justifies it as a Carbon-conformant composition,
> and that entry is reviewed at the screen's accessibility sign-off (§7.7). A
> control that is neither a Carbon component nor a registered composition is not
> delivered.

The register **grows with every redesign plan** — each plan appends the rows for
the controls it ships and does not rewrite the rows above. The plan-07-05 shell
rows and the plan-07-06 shared-component rows below are additive; neither
overwrites the other.

## Register

| Product control | Carbon basis | Screen(s) | Reviewed (record) |
|---|---|---|---|
| Skip link ("Skip to main content") | `SkipToContent` (`@carbon/react` UI Shell; renders `a.cds--skip-to-content`, hidden until focused, first focusable → `#main-content`) (`SkipLink.tsx`) | Shell (all screens) | `docs/a11y/shell.md` |
| Government banner + "Here's how you know" disclosure | **Composition:** Carbon `Button` (`kind="ghost"`) for the toggle inside project-owned banner layout, with the disclosure driven by the shell's OWN React `useState` managing `aria-expanded`/`aria-controls`/`hidden` — Carbon ships no government-banner primitive and USWDS's JS no longer drives it; inline (never popup) expansion, iframe-safe (UX Pattern 10) (`Banner.tsx`) | Shell (all screens) | `docs/a11y/shell.md` |
| Product masthead / name link | `HeaderName` (`@carbon/react` UI Shell; `prefix=""` suppresses Carbon's default "IBM" prefix; the link is react-router `Link` via the polymorphic `as`) inside Carbon `Header` (`role="banner"`) (`Header.tsx`) | Shell (authenticated) | `docs/a11y/shell.md` |
| Primary navigation (the two destination links) | `HeaderNavigation` + `HeaderMenuItem` (`@carbon/react` UI Shell; each item's `<a>` supplied by react-router `NavLink` via Carbon's polymorphic `as`, so `aria-current="page"` is set on the active item; the DOM stays `<nav aria-label="Primary">` with exactly two anchors) (`Nav.tsx`) | Shell (authenticated) | `docs/a11y/shell.md` |
| "Sign out" control | Carbon `Button` (`kind="ghost"`) inside `HeaderGlobalBar`, wired to the shell's `onSignOut` prop (`Header.tsx`) | Shell (authenticated) | `docs/a11y/shell.md` |
| Live regions (polite / assertive announcers) | `aria-live` regions with Carbon's `cds--visually-hidden` utility (the Carbon equivalent of USWDS's `usa-sr-only`); not an interactive control (`LiveRegions.tsx`) | Shell (all screens) | `docs/a11y/shell.md` |
| Footer + agency identifier + required-links row | **Composition:** Carbon `Grid`/`Column`/`Link` styled with Carbon tokens, preserving the federal `role="contentinfo"` landmark, the `aria-label="Agency identifier"` / `aria-label="Important links"` structural labels, the `cbp.gov` domain line, and the seven-link required-links set fixed by federal conformance (pinned in `web/src/shell/Footer.tsx`) (`Footer.tsx`) | Shell (all screens) | `docs/a11y/shell.md` |
| Text field (`Field`) | `TextInput` — owns label/id association, `invalid`/`invalidText` inline error, `helperText` hint, and the single hint+error `aria-describedby` wiring (`UswdsForm.tsx`) | Shared form pattern (Sign in, F6 entry, F12 decision) | reviewed at each consuming screen; carried forward from `docs/a11y/sign-in.md` |
| Select field (`SelectField`) | `Select` + `SelectItem`, with a load-bearing empty first option ("- Select -", nothing pre-chosen, FR-6.6); option list always caller-supplied, no built-in code list (`UswdsForm.tsx`) | Shared form pattern (F6 entry) | reviewed at each consuming screen |
| Text-area field (`TextAreaField`) | `TextArea` with its NATIVE `enableCounter` + `maxCount` character counter (replaces the hand-rolled React counter); `maxCount` caps input at the F3 structural limit (`UswdsForm.tsx`) | Shared form pattern (F6 entry, F12 reason) | reviewed at each consuming screen |
| Date field (`DateField`) | `DatePicker` (`datePickerType="single"`) + `DatePickerInput` — a real controlled React component; the text input alone (typed `YYYY-MM-DD`, submitted verbatim, no locale coercion) completes the task, the calendar is pure progressive enhancement (FR-6.5) (`UswdsForm.tsx`) | Shared form pattern (F6 entry) | reviewed at each consuming screen |
| Grouped fields (`Fieldset`) | **Composition:** native semantic `<fieldset>`/`<legend>` (standards-based HTML, not a bespoke control) styled with Carbon typography/spacing tokens; preserves the statement→error `aria-describedby` join order and the `tabIndex={-1}` error-summary focus target (FR-6.10 RIV-070/RIV-073 pair exception) (`UswdsForm.tsx`) | Shared form pattern (F6 Transport fieldset) | reviewed at each consuming screen |
| Required-field marking | **Composition:** the visible text `*` marking (`abbr title="required"`) layered into Carbon's `labelText` slot + the "* indicates a required field" convention line above the form — FR-2.11's exact wording preserved rather than deferring to Carbon's default indicator (`UswdsForm.tsx`) | Shared form pattern (all forms) | reviewed at each consuming screen |
| Primary submit (`SubmitButton`) | `Button` (busy state via `aria-disabled`, NOT `disabled`, to keep it in tab order — FR-1.19; idle/busy label swap) (`UswdsForm.tsx`) | Shared form pattern (all forms) | reviewed at each consuming screen |
| Form wrapper (`UswdsForm`) | **Composition:** Carbon `Form` wrapping a native `<form noValidate>` contract — client constraint validation never pre-empts the server (FR-1.16); a second in-flight submit is a no-op (FR-1.19) (`UswdsForm.tsx`) | Shared form pattern (all forms) | reviewed at each consuming screen |
| Error summary (`ErrorSummary`) | **Composition:** Carbon `InlineNotification kind="error"` + a project-owned focusable container (`role="alert"` + `tabIndex="-1"` + `ref`/`useEffect` `.focus()` on appearance, in server order) whose children are an unstyled list of in-page links, each moving focus to its named control by id (`ErrorSummary.tsx`) | Shared (Sign in, F6 entry, F12 decision) | carried forward from `docs/a11y/sign-in.md`; reviewed at each consuming screen |
| Provenance badge (`ProvenanceBadge`) | Carbon `Tag` (`type="purple"` AI / `type="gray"` HUMAN) + a distinct `@carbon/icons-react` icon per origin (`Settings` AI / `User` HUMAN, `aria-hidden`) + a distinct border SHAPE (dashed AI / solid HUMAN, one scoped rule in `web/styles/app.scss`) — **four** colour-independent carriers (text + icon + shape + colour), legible in monochrome and via AT (`ProvenanceBadge.tsx`) | Case detail, decision region, audit trail | `docs/a11y/case-detail.md`; reviewed at each consuming screen |
| Shared status/error/empty/degraded/read-only states | Carbon `Loading` (region-scoped, 300ms-delayed, `role="status"`+`aria-busy`), plain prose + `Button`-as-`Link` (`Empty`, no alert role), `InlineNotification kind="error"`+`role="alert"` (`ErrorState`), `InlineNotification kind="warning"`+`role="status"` (`Degraded`, the "not an error" distinction), `InlineNotification kind="info"` in a `role="note"` wrapper (`ReadOnlyNotice`) (`states.tsx`) | Shared (`states.tsx`); Case detail (`Degraded` for UNAVAILABLE recommendation) | reviewed at each consuming screen; `docs/a11y/case-detail.md` |
| Case-detail header + status/received/submitted-by list | **Composition:** `h1` on Carbon productive typography (focus contract `tabIndex={-1}`+`h1Ref` unchanged) + a native `<dl>`/`<dt>`/`<dd>` styled with Carbon spacing tokens (`.cargoexec-detail-list` in `web/styles/app.scss`) — Carbon ships no definition-list component; a `<dl>` is correct structural markup + a Carbon `Link` (`as={RouterLink}`) "Back to review queue" (`CaseDetail.tsx`) | Case detail | `docs/a11y/case-detail.md` (re-sign in 07-10) |
| Case-detail "On this page" in-page navigation | **Composition:** an unconditional `<nav aria-label="On this page">` list of native `#fragment` anchors rendered with Carbon `Link` inside a Carbon `Stack` (`as="ul"`)/`ListItem`, styled with Carbon tokens (`.cargoexec-in-page-nav`) — Carbon has no in-page-navigation primitive; native `<a href="#…">` in-page navigation is standard HTML, not a bespoke interactive control (FR-2.1); fixed FR-10.10 reading order preserved (`CaseDetail.tsx`) | Case detail | `docs/a11y/case-detail.md` (re-sign in 07-10) |
| Case-detail submitted-entry 14-field display | **Composition:** a native `<dl>` styled with Carbon spacing tokens (`.cargoexec-detail-list`), each present value rendered with its adjacent (unchanged 07-06) `ProvenanceBadge` (HUMAN); "Not provided" carries no badge (FR-10.3) (`CaseDetail.tsx`) | Case detail | `docs/a11y/case-detail.md` (re-sign in 07-10) |
| Case-detail validation-findings list | Carbon `OrderedList` + `ListItem` (native `<ol>`/`<li>`), rendering findings verbatim in server order with NO severity language added (FR-10.6) (`CaseDetail.tsx`) | Case detail | `docs/a11y/case-detail.md` (re-sign in 07-10) |
| Case-detail AI-recommendation "AI-suggested resolution" whole-recommendation tag | Carbon `Tag` (`type="purple"`, matching the per-value AI badge colour carrier) — a whole-recommendation marker, not a per-value badge (`CaseDetail.tsx`) | Case detail | `docs/a11y/case-detail.md` (re-sign in 07-10) |
| Case-detail AI-recommendation comparison rows (AI vs HUMAN per value) | **Composition:** a native `<dl>` styled with Carbon spacing tokens (`.cargoexec-detail-list.cargoexec-comparison-rows`), each row showing the submitted (HUMAN) value with its badge and the AI-suggested value with its badge — both via the unchanged 07-06 `ProvenanceBadge`; rationale as plain `<p>` paragraphs (no accordion/collapse, FR-10.4). Carbon ships no definition-list/comparison primitive (`CaseDetail.tsx`) | Case detail | `docs/a11y/case-detail.md` (re-sign in 07-10) |
| Case-detail AI-recommendation PENDING / stale / UNAVAILABLE presentations | Carbon `Loading` (region-scoped, from shared `states.tsx`, 07-06) for PENDING; Carbon `Degraded` (`InlineNotification kind="warning"`+`role="status"`, 07-06) for stale-PENDING and UNAVAILABLE — the "not an error" distinction (UX Pattern 8), never `ErrorState`; polling timing logic unchanged (`CaseDetail.tsx`) | Case detail | `docs/a11y/case-detail.md` (re-sign in 07-10) |

## Notes on the compositions

- **Government banner + "Here's how you know" disclosure** is a composition, not
  a single Carbon component, because Carbon ships no government-banner primitive
  (it is a federal statutory element Carbon was never designed to include) and
  USWDS's JS no longer drives the disclosure. The toggle is now the shell's OWN
  React state: a Carbon `Button` whose `aria-expanded` reflects `useState`, whose
  `aria-controls` points at the content region, and a content region whose
  `hidden` is driven by the same state — the WCAG-conformant disclosure contract,
  keyboard-operable (asserted by `e2e/shell.spec.ts` "3."), expanding INLINE with
  no `window.open`/popup (iframe-safe, UX Pattern 10). Every textual/structural
  detail is preserved: the flag image (`aria-hidden`), the two guidance
  paragraphs, and the exact banner text. It is the same accordion-disclosure
  pattern the USWDS register documented for USWDS's banner, re-implemented on
  Carbon — not a new bespoke interactive widget in the sense FR-2.1 prohibits.
  Registered so the composition is auditable and re-reviewed whenever it changes.
- **Footer + agency identifier + required-links row** is a composition, not a
  single Carbon component, because Carbon ships no federal-footer or
  agency-identifier primitive — this is federal conformance markup, not a design
  system control. It is assembled from Carbon `Grid`/`Column`/`Link` primitives
  and Carbon tokens while preserving the exact federal structure USWDS provided:
  the `role="contentinfo"` landmark, the two `aria-label`led identifier sections,
  the `cbp.gov` domain line, and the seven statutory required links (which
  include "Performance reports", a statutory identifier link, not a product
  reporting surface). The required-links set is fixed by federal conformance and
  is pinned in `web/src/shell/Footer.tsx`; the footer subtree is excluded from
  the criterion-5 affordance scan for that reason — the exclusion is auditable,
  not a blind spot (`server/test/architecture/navigation.spec.ts` item 4d
  asserts the rendered footer link set equals exactly that pinned list, so the
  exemption cannot be used to smuggle in an eighth link). The Carbon `Grid` there
  is constrained by a small scoped rule in `web/styles/_shell.scss` so its gutter
  never introduces horizontal body scroll at 320px / 200% zoom (FR-2.20;
  `e2e/shell.spec.ts` "14.").
- **`Fieldset`** is a composition, not a single Carbon component: Carbon ships no
  dedicated fieldset wrapper, so the native `<fieldset>`/`<legend>` is retained
  (it is the correct, standards-based grouping element, which assistive
  technology navigates best) and styled with Carbon tokens. Its
  `aria-describedby` join order (statement id, then fieldset-level error id) and
  its `tabIndex={-1}` focus target are load-bearing: FR-6.10's RIV-070/RIV-073
  cross-field findings render on the fieldset itself, not on either field alone,
  and the error-summary link focuses the fieldset. Registered so the composition
  is auditable and re-reviewed whenever it changes.
- **`UswdsForm`** wraps Carbon's `Form` around a native `<form noValidate>`
  contract. The `noValidate` attribute is not cosmetic: it prevents the browser
  from short-circuiting submission on native constraint validation so the server
  remains the sole authority on a required-information failure (FR-1.16).
- **Required-field marking** layers the project's own visible `*`
  (`abbr title="required"`) into Carbon's `labelText` ReactNode slot rather than
  using Carbon's built-in required indicator, so FR-2.11's exact wording and the
  signed a11y record's convention statement continue to match. The native
  `required` attribute is still set on each control as a browser hint only.
- **Error summary** is the one control here that is a composition rather than a
  single Carbon component. It combines Carbon's `InlineNotification kind="error"`
  with a project-owned focusable container: the `role="alert"` + `tabIndex="-1"`
  wrapper and the `ref`/`useEffect` that calls `.focus()` when a non-empty item
  set appears are NOT provided by Carbon (its notifications do not auto-focus),
  so they are asserted explicitly and are UNCHANGED from the pre-Carbon version.
  The children are an unstyled list of in-page anchors in SERVER ORDER; on
  activation, focus moves to the named control by id (`preventDefault` +
  `.focus()`). An item with no `controlId` renders as plain text, never a dead
  link. Registered so the composition is auditable and re-reviewed whenever it
  changes.
- **Provenance badge** is a single Carbon `Tag` differentiated by FOUR
  colour-independent carriers, so its meaning survives a colour-removed rendering
  (WCAG 1.4.1, FR-2.17): (1) distinct **text**, (2) a distinct **icon** — a
  genuinely different `@carbon/icons-react` glyph per origin (`Settings` for AI,
  `User` for HUMAN), rendered `aria-hidden` so the visible label is the
  accessible name; (3) a distinct **border shape** — one small scoped rule in
  `web/styles/app.scss` (`.cargoexec-provenance-badge--ai` dashed 2px,
  `--human` solid 2px, colour via `currentColor` so no raw hex is introduced and
  the absence.spec hex/px scan on `web/src` is untouched); and (4) a distinct
  Carbon `Tag` `type` **colour** (`purple` AI / `gray` HUMAN, an AA-documented
  pair). The border-shape rule is a styling refinement of a registered Carbon
  `Tag`, not a bespoke interactive control. **`AttributedValue` gap (recorded,
  not hidden):** TechArch §1A.4 describes an `AttributedValue` component that
  type-enforces "a value cannot render without an origin" — it does NOT exist in
  this codebase; the actual shipped guarantee is "every value that has an origin
  is rendered with an adjacent `ProvenanceBadge`, verified per screen by review,
  never by the type system." This plan documents that discrepancy (a code comment
  at the top of `ProvenanceBadge.tsx`) rather than inventing the wrapper as
  unplanned scope.

- **Case-detail definition lists (`.cargoexec-detail-list`)** are compositions,
  not single Carbon components, because Carbon ships no definition-list
  primitive. The header status/received/submitted-by block and the 14-field
  submitted-entry display are native `<dl>`/`<dt>`/`<dd>` — the correct,
  standards-based structural markup for term→value pairs, which assistive
  technology navigates well — styled with Carbon spacing tokens in one small
  scoped rule in `web/styles/app.scss` (Carbon spacing custom properties, no raw
  hex; the absence.spec hex/px scan on `web/src` is untouched). Registered so the
  compositions are auditable and re-reviewed whenever they change.
- **Case-detail "On this page" in-page navigation** is a composition, not a
  single Carbon component, because Carbon ships no in-page-navigation primitive
  equivalent to USWDS's `usa-in-page-navigation`. It is an unconditional
  `<nav aria-label="On this page">` holding a plain list of native `#fragment`
  anchors (rendered with Carbon `Link` inside a Carbon `Stack`/`ListItem`,
  styled with Carbon tokens). Native `<a href="#…">` in-page navigation is
  standard HTML using the browser's own scroll-and-focus-to-target — NOT a
  bespoke interactive control in the sense FR-2.1 prohibits. The fixed FR-10.10
  reading order (entry → findings → recommendation → decision → audit) is
  preserved verbatim, and `e2e/case-detail.spec.ts` "10." clicks each link and
  asserts its target heading is in the viewport. Registered so the composition is
  auditable and re-reviewed whenever it changes.
- **Case-detail AI-recommendation comparison rows** are a composition, not a
  single Carbon component, for the same reason the retired USWDS register
  recorded them a composition: there is no design-system primitive for a
  per-value "submitted (HUMAN) vs AI-suggested (AI)" comparison. It is a native
  `<dl>` (the correct structural markup for the field-label → value-pair shape,
  which assistive technology navigates well) styled with Carbon spacing tokens,
  where EACH value renders with its adjacent, unchanged 07-06 `ProvenanceBadge`
  so the four-carrier colour-independence guarantee (FR-2.17) holds per value
  (T-07-24). The un-applied-proposal framing ("Nothing here has been applied…")
  is verbatim wording (UX Pattern 2, P2), and the rationale is plain `<p>`
  paragraphs — never an accordion or any collapsing control (FR-10.4). Registered
  so the composition is auditable and re-reviewed whenever it changes.

## Relationship to the USWDS register

`docs/uswds-conformance-register.md` remains the append-only record of the
pre-redesign USWDS controls and is not rewritten. This Carbon register is its
Phase-7 successor: as each screen migrates from USWDS to Carbon, its controls are
recorded here. A control appears in whichever register matches the primitives it
actually renders on.

## How to extend this register

When a later redesign plan ships or migrates an interactive control:

1. Add a row above naming the control, its Carbon basis (component or
   composition), the screen(s) it appears on, and the a11y record that reviewed
   it.
2. If the control is a composition, add a paragraph under **Notes** explaining
   why it is Carbon-conformant.
3. Never remove or rewrite an existing row; the register is append-only across
   plans.
