# USWDS Coupling Audit

**Phase 7 · Feature F2 (USWDS Application Shell & Accessibility Foundation) ·
TechArch §1A.1b**

## Why this document exists

Phase 7 is scoped to replace the current USWDS-based visual system with a new,
externally-approved design. That approved design is a `claude.ai/design/...`
link supplied to the project; it **returned HTTP 403 during scoping and remains
inaccessible**. No colour, token, component, or layout detail from it is known.

This audit therefore does the one piece of preparation that is possible without
seeing the design: it enumerates **every point in the current codebase where
USWDS is coupled in**, so that a future visual-redesign phase — the moment the
approved design becomes readable — knows its exact blast radius. It reflects the
codebase as re-derived on 2026-09-17, not stale planning numbers.

> **This document changes nothing about what ships today.** No component was
> touched, no colour was invented, and the actual visual redesign remains
> **blocked pending** the (currently inaccessible, 403) approved design.

---

## 1. `.tsx` files coupled to USWDS

Re-derived with:

```bash
grep -rl "usa-\|uswds" web/src --include="*.tsx" | sort
comm -23 <(find web/src -name '*.tsx' | sort) \
         <(grep -rl "usa-\|uswds" web/src --include="*.tsx" | sort)
```

**18 of the 21 `.tsx` files under `web/src`** reference a USWDS `usa-*` class or
the `uswds` JS module. The **3 exceptions** carry no markup and reference no
USWDS class:

- `web/src/app/router.tsx` — route table only.
- `web/src/main.tsx` — React bootstrap only.
- `web/src/session/SessionProvider.tsx` — session context/layout logic only.

Each coupled file below is listed with the USWDS primitives it depends on. This
is an **inventory of the blast radius**, not a redesign specification — the
redesign spec is future work, once a design exists.

### `web/src/shell/` — the application shell (every screen inherits these)

- **`web/src/shell/Shell.tsx`** — `usa-skipnav`, `usa-identifier` (the shell
  frame that composes skip-link, banner, header, nav, footer, identifier).
- **`web/src/shell/SkipLink.tsx`** — `usa-skipnav` ("Skip to main content").
- **`web/src/shell/Banner.tsx`** — `usa-banner` + `usa-accordion` disclosure
  (`usa-banner__header`, `usa-banner__inner`, `usa-banner__button`,
  `usa-banner__guidance`, …) driven by the **USWDS banner JS** (`uswds`).
- **`web/src/shell/Header.tsx`** — `usa-header usa-header--basic`, `usa-navbar`,
  `usa-logo` / `usa-logo__text`, `usa-nav-container`, `usa-nav__secondary`,
  "Sign out" as `usa-button usa-button--unstyled`.
- **`web/src/shell/Nav.tsx`** — `usa-nav` + `usa-nav__primary` /
  `usa-nav__primary-item` / `usa-nav__link`, active link via `usa-current`;
  `usa-accordion` scaffolding.
- **`web/src/shell/Footer.tsx`** — `usa-footer usa-footer--slim` (logo heading,
  primary section) + `usa-identifier` (masthead, required-links list) +
  `usa-link`. The identifier link set is fixed by USWDS.
- **`web/src/shell/LiveRegions.tsx`** — `usa-sr-only` (visually-hidden
  polite/assertive ARIA live regions).

### `web/src/components/` — shared building blocks

- **`web/src/components/UswdsForm.tsx`** — the single form pattern: `usa-form`
  / `usa-form--large`, `usa-fieldset` / `usa-legend`, `usa-form-group`
  (`usa-form-group--error`), `usa-label`, `usa-input` (`usa-input--error`),
  `usa-select`, `usa-textarea`, `usa-hint` / `usa-hint--required`,
  `usa-error-message`, `usa-character-count` (`usa-character-count__message`),
  `usa-date-picker`, `usa-button`. Also touches the **USWDS JS** module
  (`uswds`, `uswdsPresent`) for progressive-enhancement guards.
- **`web/src/components/states.tsx`** — Loading / Empty / Error presentations:
  `usa-alert` (`--error`/`--info`/`--warning`/`--slim`, `__body`/`__heading`/
  `__text`), `usa-loader`, `usa-prose`, `usa-button` / `usa-button--outline`,
  `usa-sr-only`.
- **`web/src/components/ErrorSummary.tsx`** — `usa-alert usa-alert--error`
  (`__body`/`__heading`), `usa-list usa-list--unstyled` (focus-managed error
  summary).
- **`web/src/components/ProvenanceBadge.tsx`** — `usa-tag` + `usa-icon` (the
  per-value AI/HUMAN provenance control; distinct sprite icon + token colour,
  legible in monochrome).
- **`web/src/components/DecisionPanel.tsx`** — the F12 decision region:
  `usa-button` / `usa-button--outline`, `usa-button-group` /
  `usa-button-group__item`, `usa-input`, `usa-alert` (`--info`/`--warning`,
  `__body`/`__text`).
- **`web/src/components/AuditTrailRegion.tsx`** — the F14 audit region:
  `usa-table` / `usa-table--borderless`, `usa-alert usa-alert--error`
  (`__body`/`__text`) for the integrity-failure state.

### `web/src/screens/` — the four screens

- **`web/src/screens/SignIn.tsx`** — `usa-form--large`, `usa-alert`
  (`--info`/`--slim`/`--success`, `__body`/`__text`), `usa-error-message`,
  `usa-hint`.
- **`web/src/screens/Queue.tsx`** — the F8 review queue: `usa-table` inside a
  focusable `usa-table-container--scrollable`, `usa-alert` (`--info`/`--slim`),
  `usa-button` / `usa-button--outline`, `usa-prose`.
- **`web/src/screens/CaseDetail.tsx`** — the F10 case detail: `usa-prose`,
  `usa-list usa-list--unstyled`, `usa-tag`.
- **`web/src/screens/NotBuiltYet.tsx`** — `usa-alert usa-alert--info`
  (`__body`/`__text`), `usa-prose` (placeholder screen).
- **`web/src/screens/NotFound.tsx`** — `usa-prose` (404 screen).

---

## 2. The single Sass entry point: `web/styles/app.scss`

`web/styles/app.scss` is the **only** Sass entry point. It:

1. Configures `uswds-core` **once** with `@use "uswds-core" with (...)` — the
   theme-settings block (self-hosted `$theme-image-path: "/assets/img"`,
   `$theme-font-path: "/assets/fonts"`, compile-warning/notification toggles).
   Its header comment warns that re-configuring `uswds-core` a second time (e.g.
   a `@forward "uswds" with (...)`) would **deadlock** the module system.
2. `@forward "uswds";` — re-exposing the full, already-configured USWDS bundle.
3. Adds one `prefers-reduced-motion` global override (FR-2.21).

It is compiled by **`npm run build:css`** (dart-sass, with
`--load-path=node_modules --load-path=node_modules/@uswds/uswds/packages`) into
`web/public/assets/uswds.css`, which `web/index.html` loads as a **linked
`<link rel="stylesheet" href="/assets/uswds.css">`** — never a JS-injected
`<style>` tag.

As of this phase, `app.scss` also `@use`s the new
**`web/styles/_tokens.scss`** design-token seam (see §6 and the token seam
below) so the seam's `:root` custom properties land in the same compiled
`uswds.css`. That seam re-exposes USWDS's *own current* values under swappable
names; it invents nothing.

---

## 3. The asset self-hosting pipeline: `web/scripts/copy-uswds-assets.mjs`

`web/scripts/copy-uswds-assets.mjs` (run via **`npm run build:assets`**, wired
into `build:web`) copies USWDS's runtime assets from `node_modules/@uswds/uswds/
dist` into `web/public/assets` at build time:

- the **icon sprite** (and the full `img` tree, keeping
  `/assets/img/sprite.svg` consistent with `$theme-image-path`),
- the **fonts** (`/assets/fonts`, matching `$theme-font-path`), and
- the compiled **USWDS JS** (`/assets/js`).

So **nothing is fetched from a CDN at runtime** (FR-2.3). The copy is idempotent
(`fs.cp({ recursive, force })`). Any replacement design must supply an
equivalent self-hosted pipeline — its icons, fonts, and any runtime JS must be
copied into this origin at build time, not linked from an external host.

---

## 4. The CSP constraint: `server/src/http/headers.ts`

`server/src/http/headers.ts` hand-writes the §4.5 Content-Security-Policy on
every response. The always-on directives include **`style-src 'self'`** with
**no `unsafe-inline`** and no nonce machinery (`script-src 'self'` likewise, and
`font-src 'self'`, `img-src 'self' data:`).

**Structural consequence for any replacement visual system:** it MUST still
compile to a **single, self-hosted stylesheet loaded via `<link>`** from this
origin. A design system whose runtime **injects `<style>` tags** or assumes a
**CDN font/asset host** is **incompatible with this CSP as it stands** — the
injected styles would be silently blocked and the stylesheet would simply not
apply (TechArch §1A.1b). The header module's own comments already flag this: a
JS-injected `<style>` element would violate `style-src 'self'`.

(Note: `headers.ts` also owns the rule that `X-Frame-Options` and CSP
`frame-ancestors 'none'/'self'` are **never** emitted — the app is previewed in
a sandbox IFRAME. This is orthogonal to the style constraint but is part of the
same "do not break the preview / do not loosen the CSP" contract and must be
preserved by any redesign.)

---

## 5. `docs/uswds-conformance-register.md` — needs a wholesale re-authoring
(future output, NOT attempted here)

`docs/uswds-conformance-register.md` is the §7.3 / FR-2.1 / SM-12 evidence that
every interactive control the product ships is a USWDS component or a
**documented USWDS-conformant composition** of USWDS primitives. It maps every
control to a **specific USWDS primitive by name** (e.g. "Skip link → `usa-skipnav`",
"Government banner → `usa-banner` + `usa-accordion`", form fields →
`usa-form-group` + `usa-label` + `usa-input`, and so on across every phase).

When the replacement design's primitives are known, this register will need a
**wholesale re-authoring** so that "USWDS component or USWDS-conformant
composition" is restated against the new design system's primitives (TechArch
§1A.1b point 2). That is **required future output**, flagged here — **not
attempted in this phase** (no design to author it against).

---

## 6. What this phase actually adds (and what it does not)

- **Does NOT** reskin anything. No `.tsx` file is modified. No colour, spacing,
  or token **value** is invented. Today's rendered screens, USWDS wiring, CSP,
  and asset pipeline are behaviourally unchanged.
- **Does** add one piece of forward-looking infrastructure: the design-token
  abstraction seam at **`web/styles/_tokens.scss`**, forwarded into
  `web/styles/app.scss`. It exposes a small, clearly-named set of CSS custom
  properties (prefixed `--cargoexec-`) at `:root`, whose values are **computed
  from USWDS core's own existing theme configuration** (via the public `color()`,
  `units()`, and `family()` functions) — so they are guaranteed identical to
  what the shell already renders. **Nothing consumes these properties yet**;
  consumption is future work once a real design exists to apply.

  The seam's purpose: when the approved design finally becomes accessible,
  applying it becomes a **token/CSS override** (override these custom properties,
  or replace the compiled stylesheet entirely) rather than a per-component
  rewrite of all 18 coupled files enumerated in §1.

  **Named seam location:** `web/styles/_tokens.scss` is now the single place
  this seam lives. It `@use`s the same already-configured `uswds-core` instance
  (never re-configuring it), and `web/styles/app.scss` `@use`s it immediately
  after its own `@use "uswds-core" with (...)` block so the `:root` custom
  properties are emitted into the compiled `web/public/assets/uswds.css`. As of
  this phase the compiled stylesheet carries eight `--cargoexec-*` properties
  (`--cargoexec-color-primary`, `-primary-dark`, `-error`, `-base-ink`,
  `-space-1`, `-space-2`, `-space-3`, `-font-family-body`), each a
  function-derived echo of USWDS's own current value — additive to, and leaving
  unchanged, every pre-existing `usa-*` rule.

**The actual visual redesign remains blocked pending the (currently
inaccessible, 403) approved design and is deferred to a future phase.**

---

## Phase 7 update — Carbon installed (plan 07-04)

The concrete redesign target is now settled: the **Carbon Design System**
(`@carbon/react`, backed by `@carbon/styles`). Plan 07-04 installs and wires
it **additively** into the build — no `web/src/**/*.tsx` file changed, so every
currently-shipped screen still renders on USWDS. The next Phase-7 plans migrate
one file at a time against this working, CSP-compliant, self-hosted Carbon
build.

**Resolved versions (exact-pinned, project convention):**

- `@carbon/react` — `1.116.0`
- `@carbon/icons-react` — `11.88.0`
- `@ibm/plex` — `6.4.1` (promoted from a transitive dependency of
  `@carbon/styles` to a direct, pinned production dependency, so the font
  self-hosting has a declared source)

**Theme decision — White (Carbon's default light theme).** This is not left
open. Reasoning (also recorded in `web/styles/app.scss`): CargoExec's screens
(queue table, case detail, audit trail) are read-heavy and reviewed for
extended periods, so a light, high-contrast theme reduces eye strain over
sustained reading; it matches the light, high-contrast convention federal
specialists already expect from USWDS-built government tools (the transition
reads as a redesign, not a mode change); and White is Carbon's own most
extensively documented and exercised theme, reliably clearing WCAG AA contrast
pairings out of the box. White is the `@carbon/styles` `$theme` default
(`compat.$white`), so no explicit theme override is required.

**Build wiring.** `web/styles/app.scss` `@use`s `@carbon/styles` immediately
after the untouched `@forward "uswds";`, so `npm run build:css` compiles BOTH
USWDS's `usa-*` classes and Carbon's `cds--*` classes into the single
self-hosted `web/public/assets/uswds.css` (7726 `cds--` rules present; every
pre-existing `usa-*` rule unchanged — the two prefixes are disjoint, no
collision).

**IBM Plex self-hosting (no CDN).** Carbon's default typeface (IBM Plex Sans,
Mono, Serif) is copied into `web/public/assets/fonts/plex/` at build time by the
new idempotent `web/scripts/copy-carbon-assets.mjs`, wired into `build:assets`
alongside `copy-uswds-assets.mjs`. `$use-akamai-cdn` stays false and
`$font-path` is repointed to `/assets/fonts/plex`, so every compiled
`@font-face` `src: url(...)` is same-origin — never the IBM Akamai CDN
(`1.www.s81c.com`). `font-src 'self'` (unchanged, `server/src/http/headers.ts`)
and the CDN-absence architecture gate both continue to hold.

**The 07-03 token seam is superseded.** `web/styles/_tokens.scss` (the eight
`--cargoexec-*` custom properties computed from USWDS's own values) was built
on the premise that the redesign would be a recolour of USWDS. Carbon is not
that — it ships its own complete Sass token system — so that seam is **not the
redesign mechanism** and is retired dead weight. It is left in place, marked
`SUPERSEDED` in a comment directly above its `@use "tokens";` line in
`app.scss`; deletion is the Phase-7 final-cleanup plan's job, not a mid-migration
removal of a file another in-flight plan might still reference.
