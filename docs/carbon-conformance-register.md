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
| Review-queue open-exceptions table | **Composition:** Carbon's PLAIN table primitives — `Table` / `TableHead` / `TableRow` / `TableHeader` / `TableBody` / `TableCell` — composed BY HAND, with a native `<caption>`, four `TableHeader` cells rendered with **NO `isSortable`/`onClick`** (so each emits a bare `<th scope="col">` with no sort button, no `aria-sort`, no sort icon — verified against `@carbon/react`'s `TableHeader` source, which early-returns a plain `<th>` when `isSortable` is false), one row per exception IN SERVER (receipt) ORDER, inside a project-owned scrollable focusable region (`role="region"` / `tabIndex={0}`) for the 320px reflow requirement (FR-2.19). Emphatically **NOT** Carbon's `DataTable` batteries-included sort/filter pattern — that distinction is load-bearing because FR-8.3 / phase-criterion-4 REQUIRE the review queue to have no sort control, no filter, no assignment and no priority affordance anywhere in the DOM (`Queue.tsx`) | Review queue | `docs/a11y/queue.md` |
| Review-queue truncation notice | Carbon `InlineNotification kind="info"` (`role="status"`, `lowContrast`, `hideCloseButton`) stating "Showing the first 500 open exceptions in receipt order." — no pagination (FR-8.12) (`Queue.tsx`) | Review queue | `docs/a11y/queue.md` |
| Review-queue Refresh + "New cargo entry" actions | Carbon `Button` — Refresh as `kind="tertiary"` (explicit-refresh only, FR-8.10); "New cargo entry" as `Button as={Link} kind="tertiary"` (outline-equivalent weight, react-router client-side navigation) (`Queue.tsx`) | Review queue | `docs/a11y/queue.md` |
| Sign-in form + layout | The shared form pattern (`Field`/`SubmitButton`/`UswdsForm`/`ErrorSummary`, 07-06, UNCHANGED) laid out in Carbon `Grid`/`Column` (`sm=4 md=4 lg=6`, replacing the USWDS `grid-row`/`grid-col-12 tablet:grid-col-6 desktop:grid-col-4`); the sign-in exception is preserved — one generic fieldless error item on credential failure, NO `aria-invalid` on any input, no per-field leak (`SignIn.tsx`) | Sign in | `docs/a11y/sign-in.md` (re-signed 07-07) |
| Sign-in session notices (expired / signed-out) | Carbon `InlineNotification` — `kind="info"` "Your session expired. Sign in again to continue." and `kind="success"` "You are signed out." — each `role="status"` (a polite announcement, not an alert), `lowContrast`, `hideCloseButton`, replacing the inline `usa-alert--info` / `usa-alert--success`; the reason is read from a fixed `URLSearchParams` allowlist (`'expired'`/`'signed-out'`), never raw query content (T-07-21) (`SignIn.tsx`) | Sign in | `docs/a11y/sign-in.md` (re-signed 07-07) |
| NotBuiltYet transitional placeholder notice | Carbon `InlineNotification kind="info"` (`role="status"`, `lowContrast`, `hideCloseButton`) with an in-notice react-router `Link` to the OTHER nav destination (reads `NAV_ITEMS`, unchanged since 07-05), replacing `usa-alert--info`; renders NO disabled control, no "coming soon" chip, no tooltip (UX Pattern 7 / FR-12.11) (`NotBuiltYet.tsx`) | /entries/new placeholder (transitional) | `docs/a11y/shell.md` (fallback screens) |
| NotFound screen | Plain prose (`h1` + paragraph + a react-router `Link` back to `/queue`), Carbon typography via the shell's tokens; no alert/status role (a dead route is not an error condition to announce), focus moved to the `h1` and title announced on mount (unchanged `useScreenFocus`) (`NotFound.tsx`) | `*` not-found route | `docs/a11y/shell.md` (fallback screens) |
| Decision region — three equal-weight actions | **THE load-bearing equal-weight control (FR-12.1, UX Pattern 3):** three Carbon `Button`s (Approve / Edit-and-approve or Resolve-directly / Reject) sharing EXACTLY ONE `kind="tertiary"` — Carbon's outline-equivalent weight, the "three identical outline buttons" Pattern 3 requires — with NO `kind="primary"` on any, no pre-selection, no autoFocus, DOM order Approve→Edit→Reject; when Approve is not permitted it is ABSENT with a stated note, never a disabled button. Because all three pass an identical `kind` and no other class-affecting prop, Carbon renders the SAME class string on each, so a visual-weight regression fails `e2e/decision.spec.ts` test 1's "all three action buttons share one class" (`DecisionPanel.tsx`) | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Decision region — two-step-commitment step indicator (Pattern 3) | Carbon `ProgressIndicator` + `ProgressStep` (four steps: "Choose an action → Complete the form → Review what will be recorded → Record"), replacing USWDS's `usa-step-indicator`; Carbon sets `aria-current="step"` on the current `ProgressStep`, preserving Pattern 3's requirement that the current step be announced (`DecisionPanel.tsx`) | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Decision region — edit / reject resolution form | The shared form pattern (`UswdsForm`/`TextAreaField`/`SubmitButton`/`ErrorSummary`, 07-06, UNCHANGED) with the per-field text inputs on Carbon `TextInput` (`hideLabel` + `aria-label`, inside a `<dl>` row whose `<dt>` carries the value's `ProvenanceBadge`); the ≥10-char reason gate and the specialist-modified marking are unchanged behaviour. The "Continue" button is a Carbon `Button` (tertiary-weight submit via the shared `SubmitButton`), "Cancel" is `kind="tertiary"` — equal weight, no primary in the form (`DecisionPanel.tsx`) | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Decision region — pre-submission summary + Record | **Composition:** a native `<dl>` of the before/after values (each with its `ProvenanceBadge`), the permanence statement, and the ONE primary button in the whole path — the "Record decision" `SubmitButton` (Carbon `Button`, default `kind="primary"` — Pattern 3's "the commit button is the only primary-styled button") with a tertiary "Back". The idempotency key is minted when the summary renders (`DecisionPanel.tsx`) | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Decision region — server-driven confirmation | **Composition:** a native `<dl>` + the shared `DecisionSummaryTable` (`<dl>` of per-value `ProvenanceBadge`s), built ONLY from the server's `DecisionRecordResponse`, with Carbon `Link` navigation ("View the audit trail", "Back to review queue"); focus moves to the "Decision recorded" heading on record (`DecisionPanel.tsx`) | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Decision region — already-decided / network notices | Carbon `InlineNotification` — `kind="info"` (already-decided conflict, FR-12.12/FR-12.13) and `kind="warning"` (ambiguous network failure), each kept `role="alert"` so the condition is announced but NEVER `kind="error"` (not the specialist's error), replacing the USWDS `usa-alert--info`/`--warning` (`DecisionPanel.tsx`) | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Audit-trail region — chronological event list | Native `<ol>`/`<li>`/`<h3>` (Carbon ships no ordered-event-list primitive; it is correct structural markup assistive technology navigates well), each event carrying a `<dl>` Who/When/What-changed and a verbatim line-preserving reason block — server order, no truncation/re-ordering/pagination (FR-14.1) (`AuditTrailRegion.tsx`) | Case detail (audit trail) | `docs/a11y/case-detail.md` |
| Audit-trail region — before/after value-change table | **Composition:** Carbon's PLAIN table primitives — `Table` / `TableHead` / `TableRow` / `TableHeader` / `TableBody` / `TableCell` — a GENUINE data table (NOT `DataTable`, NOT an ARIA grid; same reasoning as the review-queue table in 07-08), with a native `<caption>`, four `TableHeader`s rendered with NO `isSortable`/`onClick` (each a bare `<th scope="col">`, no sort button/`aria-sort`/icon), a native `<th scope="row">` field header per row, and each present before/after cell carrying its `ProvenanceBadge`; the after-origin is stated IN WORDS in the Origin column (not colour alone, FR-14.6) (`AuditTrailRegion.tsx`) | Case detail (audit trail) | `docs/a11y/case-detail.md` |
| Audit-trail region — integrity-failure alert | Carbon `InlineNotification kind="error"` + `role="alert"` (assertive), naming the divergent sequence and instructing "Report this immediately" — carries ONLY text (`title`/`subtitle`), NO close button and NO repair/edit/export action of any kind (FR-14.10 read-only-by-construction), replacing the USWDS `usa-alert--error`; the healthy case renders a plain `<p>` integrity statement instead (`AuditTrailRegion.tsx`) | Case detail (audit trail) | `docs/a11y/case-detail.md` |

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
- **Review-queue open-exceptions table** is a composition of Carbon's PLAIN table
  primitives, and it is registered precisely because the SAFE way to build a
  Carbon table for this product is NOT the obvious one. Carbon's headline table
  offering is `DataTable`, a batteries-included component whose default rendering
  path adds sortable column chrome (a sort `<button>`, `aria-sort`, and an
  ArrowUp/ArrowsVertical icon on each header). This product's FR-8.3 /
  phase-criterion-4 REQUIRE the review queue to expose NO sort, NO filter, NO
  assignment and NO priority affordance anywhere in the DOM (PRD §10 — "absence
  is designed, not omitted"). So the queue deliberately avoids `DataTable`
  entirely and hand-composes the lower-level primitives (`Table`, `TableHead`,
  `TableRow`, `TableHeader`, `TableBody`, `TableCell`), which are the same
  building blocks `DataTable` itself uses internally but without its sort/filter
  toolbar and header wiring. The one subtlety, verified against the shipped
  `@carbon/react` source rather than assumed (T-07-22): `TableHeader` defaults
  `isSortable` to `false`, and in that state it early-returns a bare
  `<th scope="col">` containing only its label — no button, no `aria-sort`, no
  icon. Passing `isSortable` (or an `onClick`) would inject the sort button and
  would be a defect here, so those props are never passed. The rendered-DOM
  guarantee is proven twice: `e2e/queue.spec.ts` test 2 asserts zero `[aria-sort]`
  and that every `<th>` is free of any button/link, and
  `server/test/architecture/navigation.spec.ts` item 4's durable
  excluded-affordance scan would catch a stray "sort by"/"filter"/"assign"/
  "priority" string if one ever slipped in. The scrollable focusable wrapper
  (`role="region"` / `tabIndex={0}` / `aria-label="Open exceptions table"`) is
  retained around Carbon's `Table` because Carbon's table ships no scroll region
  of its own, and a wide table must scroll within its own region (not the
  document body) at 320px (FR-2.19). This mirrors the emphasis the retired USWDS
  register placed on the same absence guarantee, now re-established on Carbon.
- **Decision region — the equal-weight three actions** is registered precisely
  because, as with the queue table, the SAFE way to render it on Carbon is not
  the obvious one. Carbon's `Button` defaults to `kind="primary"`, and the
  natural instinct — a primary "Approve" beside secondary alternatives — would
  be a DEFECT here: FR-12.1 forbids any visual steer toward one action, because
  a nudge toward "Approve the AI's answer" is exactly the automation bias this
  whole product exists to resist ("nothing resolves without her" means she must
  choose, not rubber-stamp). So all three actions render on ONE shared
  `kind="tertiary"` (Carbon's outline-equivalent, the "three identical outline
  buttons" of UX Pattern 3), and the ONLY primary-weighted button anywhere in
  the decision path is the final "Record decision" button on the summary — the
  deliberate second, committing action of the two-step pattern (Pattern 3: "the
  commit button is the only primary-styled button"). The equal weight is not a
  styling preference; it is the mechanism by which "choosing the AI's answer
  costs exactly the same number of deliberate keystrokes as refusing it." A
  regression is caught structurally, not by inspection: `e2e/decision.spec.ts`
  test 1 reads all three buttons' `class` attributes and asserts the set has
  exactly one member, so any primary/secondary asymmetry sneaking onto one of
  them fails a permanent test (T-07-27). This mirrors the emphasis the retired
  USWDS register placed on the same equal-weight guarantee, now on Carbon.
- **Decision region — error summary inside a Carbon notification.** The decision
  forms reuse the shared `ErrorSummary` (07-06), whose in-page links are the
  pattern's whole point. During the 07-10 rebuild this surfaced a real defect
  fixed here (a `[Rule 1 - Bug]`): Carbon's `InlineNotification` runs
  `useNoInteractiveChildren` and THROWS on any interactive child, so the link
  list could not remain nested inside the notification. `ErrorSummary` now
  renders the Carbon `InlineNotification` (title only) and the interactive link
  list as SIBLINGS inside the same project-owned `role="alert"` focusable
  container — every focus/order/link mechanic unchanged; only the DOM nesting of
  the link list relative to the notification moved. See `ErrorSummary.tsx`.
- **Audit-trail value-change table** is a composition of Carbon's PLAIN table
  primitives for the SAME load-bearing reason as the review-queue table: the
  audit trail is read-only BY CONSTRUCTION (FR-14.7/FR-14.8), so Carbon's
  `DataTable` — with its sort/filter/selection chrome — is precisely the wrong
  tool. The table hand-composes `Table`/`TableHead`/`TableRow`/`TableHeader`/
  `TableBody`/`TableCell` with no `isSortable`/`onClick` on any header (each a
  bare `<th scope="col">`), so there is no interactive affordance in the table
  at all — no sort, no filter, and certainly no edit/correct/delete/export
  control. The whole region likewise renders zero buttons, links-to-downloads,
  `window.print()` calls or copy affordances; `e2e/audit-trail.spec.ts` test 5
  ("no edit, delete, print, download, or export control") re-verifies this
  against the Carbon rebuild (T-07-28). A row's field name is a native
  `<th scope="row">` (Carbon's `TableCell` renders a `<td>` and expresses no
  row-header semantic), preserving the accessible-table structure. The
  integrity-failure alert is a Carbon `InlineNotification kind="error"` carrying
  only text and no action — the read-only guarantee holds even in the failure
  path (FR-14.10). The AI-actor rendering ("AI ({model_id})", never a person's
  name, T-07-29) is unchanged logic, re-verified by `e2e/audit-trail.spec.ts`
  test 3 against the Carbon-rendered table.

## Register completeness (plan 07-10)

With this plan the register records a Carbon basis (component or composition)
for **every** interactive control and every structural composition the product
ships across all its screens — the shell, the shared form/state/badge library,
the sign-in screen, the review queue, and the complete five-section case-detail
screen (header, in-page nav, submitted entry, findings, AI recommendation,
decision region, and audit trail). All eighteen originally USWDS-coupled `.tsx`
files now render on Carbon; the register is complete for every case-detail
control. The only remaining Phase-7 UI work is retiring USWDS itself from the
dependency tree and build pipeline (a later cleanup plan), which removes markup
already superseded here rather than adding any new control.

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
