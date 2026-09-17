# USWDS Conformance Register

**TechArch §7.3 · FR-2.1 · SM-12**

Every interactive control the product ships is built from a USWDS component, or
from a **documented USWDS-conformant composition** of USWDS primitives. This
register is the evidence for that guarantee.

> **Bespoke interactive controls are prohibited.** Introducing one requires an
> entry in this register that justifies it as a USWDS-conformant composition, and
> that entry is reviewed at the screen's accessibility sign-off (§7.7). A control
> that is neither a USWDS component nor a registered composition is not delivered.

The register **grows with every UI phase** — each later phase appends the rows
for the controls it ships and does not rewrite the rows above.

## Register

| Product control | USWDS basis | Screen(s) | Reviewed (record) |
|---|---|---|---|
| Skip link ("Skip to main content") | `usa-skipnav` | Shell (all screens) | `docs/a11y/shell.md` |
| Government banner + "Here's how you know" disclosure | `usa-banner` + `usa-accordion` (USWDS banner JS drives the disclosure) | Shell (all screens) | `docs/a11y/shell.md` |
| Product masthead / name link | `usa-header usa-header--basic` + `usa-logo` (link is a plain `usa-link`) | Shell (authenticated) | `docs/a11y/shell.md` |
| Primary navigation (the two destination links) | `usa-nav` + `usa-nav__primary` (`NavLink`, `aria-current="page"` on active) | Shell (authenticated) | `docs/a11y/shell.md` |
| "Sign out" control | `usa-button usa-button--unstyled` inside `usa-nav__secondary` | Shell (authenticated) | `docs/a11y/shell.md` |
| Footer + agency identifier + required-links row | `usa-footer--slim` + `usa-identifier` (link set fixed by USWDS) | Shell (all screens) | `docs/a11y/shell.md` |
| Email address field | `usa-form-group` + `usa-label` (bound `for`/`id`) + `usa-input` | Sign in | `docs/a11y/sign-in.md` |
| Password field | `usa-form-group` + `usa-label` (bound `for`/`id`) + `usa-input` | Sign in | `docs/a11y/sign-in.md` |
| Required-field marking | `usa-hint--required` (`abbr title="required"`) + `usa-hint` convention line above the form | Sign in | `docs/a11y/sign-in.md` |
| Primary submit ("Sign in") | `usa-button` (busy state via `aria-disabled`, not `disabled`, to keep it in tab order) | Sign in | `docs/a11y/sign-in.md` |
| Error summary | **Composition:** `usa-alert usa-alert--error` + `role="alert"` + `tabindex="-1"` + `usa-list--unstyled` of in-page links to each named control | Sign in | `docs/a11y/sign-in.md` |
| Inline field error | `usa-error-message` inside `usa-form-group--error`, bound by `aria-describedby`, `aria-invalid="true"` | Sign in | `docs/a11y/sign-in.md` |
| Session-expired notice | `usa-alert usa-alert--info` (`role="status"`) | Sign in | `docs/a11y/sign-in.md` |
| Signed-out confirmation | `usa-alert usa-alert--success usa-alert--slim` (`role="status"`) | Sign in | `docs/a11y/sign-in.md` |
| Shared status/error/empty/degraded/read-only states | `usa-alert` variants (`--info`/`--warning`/`--error`, `role="status"`/`"alert"`/`"note"`) | Shared (`states.tsx`); Case detail (`Degraded` for the UNAVAILABLE recommendation, `role="status"`) | reviewed at each consuming screen; `docs/a11y/case-detail.md` |
| Live regions (polite / assertive announcers) | `aria-live` regions (`usa-sr-only`), not an interactive control | Shell (all screens) | `docs/a11y/shell.md` |
| Provenance badge ("AI-suggested" / "Specialist-entered") | `usa-tag` + a distinct USWDS sprite icon per variant (`settings` for AI, `person` for HUMAN) — text + shape + token colour, legible in monochrome (`ProvenanceBadge.tsx`) | Case detail | `docs/a11y/case-detail.md` |
| AI-recommendation comparison row | **Composition:** a definition-list row (`dl`/`dt`/`dd`) carrying the submitted value + its HUMAN `ProvenanceBadge`, the AI-suggested value + its AI `ProvenanceBadge`, and the plain-language rule message(s) as text | Case detail | `docs/a11y/case-detail.md` |
| The three decision-action buttons ("Approve" / "Edit and approve" or "Resolve directly" / "Reject") | **Composition:** `usa-button` × 3, all three sharing one class (equal weight, no `--outline`/primary distinction), inside a `usa-button-group` | Case detail (decision region) | `docs/a11y/case-detail.md` |
| The edit-resolution form (per-field text inputs + reason) | `usa-form` + `Field`/`TextAreaField` — the SAME shared form pattern already registered generically (Sign-in rows above); `DecisionPanel` reuses that inherited pattern, introducing no new primitive | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Pre-submission decision summary | **Composition:** a plain review panel (`dl`/`dt`/`dd` rows + text), no new interactive control | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Decision confirmation panel | **Composition:** plain content (`dl` + text) + already-registered `ProvenanceBadge` per value, no new interactive control | Case detail (decision region) | `docs/a11y/case-detail.md` |
| Audit trail value-change table | **Composition:** a real `<table>` + `<caption>` + `scope="col"` column headers + an already-registered `ProvenanceBadge` per present cell (FR-14.13); no ARIA grid role | Case detail (audit trail region) | `docs/a11y/case-detail.md` |
| Audit integrity-failure alert | `usa-alert usa-alert--error` (`role="alert"`) — an already-registered `usa-alert` variant, noted here for its new consuming context (a tampered-chain integrity failure that offers no repair) | Case detail (audit trail region) | `docs/a11y/case-detail.md` |

## Notes on the compositions

- **Error summary** is the one control in this phase that is a composition rather
  than a single USWDS component. It combines the USWDS error alert with an
  unstyled list of in-page anchors; on activation, focus moves to the named
  control. This is the USWDS-documented error-summary pattern; it is registered
  here so the composition is auditable and re-reviewed whenever it changes.
- **AI-recommendation comparison row** is a composition, not a single USWDS
  component. It combines a USWDS definition-list row with two registered
  `ProvenanceBadge` tags (one HUMAN, one AI) and plain text; it introduces no
  bespoke interactive control (the whole case screen is read-only — FR-10.12).
  It is registered here so the composition is auditable and re-reviewed whenever
  it changes, exactly as the Error-summary composition is. `ProvenanceBadge`
  itself is a single `usa-tag` differentiated by text AND a distinct sprite icon
  per variant, so its meaning survives a colour-removed rendering (WCAG 1.4.1,
  phase success criterion 2) and is announced by assistive technology from the
  adjacent text and the icon `<title>`.
- **Footer required-links row** (`usa-identifier`) is federal conformance markup
  whose link set is fixed by USWDS (it includes the statutory "Performance
  reports" link). It is pinned in `web/src/shell/Footer.tsx` and excluded from the
  criterion-5 affordance scan for that reason — the exclusion is auditable, not a
  blind spot (see `server/test/architecture/navigation.spec.ts` item 4d).
- **The three decision-action buttons** are a composition, not a single USWDS
  component, in the specific sense that their EQUAL WEIGHT is the load-bearing
  design decision: all three are the plain `usa-button` with the identical class,
  deliberately WITHOUT the `usa-button--outline`/secondary or a primary emphasis
  that USWDS button groups often mix. FR-12.1 requires the three choices to carry
  no visual steer toward any one of them (the product must not nudge a specialist
  toward approving, editing or rejecting), so the composition's rule is "one
  `usa-button` class across all three, inside a `usa-button-group`". This equality
  is asserted by `e2e/decision.spec.ts` "1." (the three buttons share exactly one
  class). It introduces no bespoke control — only a constrained use of the
  registered `usa-button` — and is registered so the equality constraint is
  auditable and re-reviewed whenever the region changes.
- **The audit value-change table** is a composition of a real HTML `<table>` with
  a `<caption>` and `scope="col"` column headers and, in each present value cell,
  the already-registered `ProvenanceBadge` (`usa-tag` + sprite icon). It uses no
  ARIA grid role — it is a genuine data table, which is what assistive technology
  navigates best — and introduces no interactive control (the whole audit region
  is read-only by construction, FR-14; there is not a single button, input or
  link with a mutation affordance in it, asserted by `e2e/audit-trail.spec.ts`
  "5."). Per-cell provenance survives colour removal because each badge carries
  text and a distinct icon shape (`e2e/audit-trail.spec.ts` "4."). It is registered
  so the table composition — the shape in which the record's per-value provenance
  is presented — is auditable and re-reviewed whenever it changes, exactly as the
  AI-recommendation comparison row is.

## How to extend this register

When a later phase ships a new interactive control:

1. Add a row above naming the control, its USWDS basis (component or
   composition), the screen(s) it appears on, and the a11y record that reviewed
   it.
2. If the control is a composition, add a paragraph under **Notes** explaining why
   it is USWDS-conformant.
3. Never remove or rewrite an existing row; the register is append-only across
   phases.

## Superseded

> Superseded by `docs/carbon-conformance-register.md` as of Phase 7's Carbon
> adoption; this file is retained as the historical record of what shipped
> through Phase 6.

Phase 7 complete — `@uswds/uswds` is no longer a dependency of this repository as of this commit; `docs/carbon-conformance-register.md` is now the current register.
