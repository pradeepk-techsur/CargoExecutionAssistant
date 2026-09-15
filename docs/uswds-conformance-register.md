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
| Shared status/error/empty/degraded/read-only states | `usa-alert` variants (`--info`/`--warning`/`--error`, `role="status"`/`"alert"`/`"note"`) | Shared (`states.tsx`) | reviewed at each consuming screen |
| Live regions (polite / assertive announcers) | `aria-live` regions (`usa-sr-only`), not an interactive control | Shell (all screens) | `docs/a11y/shell.md` |

## Notes on the compositions

- **Error summary** is the one control in this phase that is a composition rather
  than a single USWDS component. It combines the USWDS error alert with an
  unstyled list of in-page anchors; on activation, focus moves to the named
  control. This is the USWDS-documented error-summary pattern; it is registered
  here so the composition is auditable and re-reviewed whenever it changes.
- **Footer required-links row** (`usa-identifier`) is federal conformance markup
  whose link set is fixed by USWDS (it includes the statutory "Performance
  reports" link). It is pinned in `web/src/shell/Footer.tsx` and excluded from the
  criterion-5 affordance scan for that reason — the exclusion is auditable, not a
  blind spot (see `server/test/architecture/navigation.spec.ts` item 4d).

## How to extend this register

When a later phase ships a new interactive control:

1. Add a row above naming the control, its USWDS basis (component or
   composition), the screen(s) it appears on, and the a11y record that reviewed
   it.
2. If the control is a composition, add a paragraph under **Notes** explaining why
   it is USWDS-conformant.
3. Never remove or rewrite an existing row; the register is append-only across
   phases.
