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
| Text field (`Field`) | `TextInput` — owns label/id association, `invalid`/`invalidText` inline error, `helperText` hint, and the single hint+error `aria-describedby` wiring (`UswdsForm.tsx`) | Shared form pattern (Sign in, F6 entry, F12 decision) | reviewed at each consuming screen; carried forward from `docs/a11y/sign-in.md` |
| Select field (`SelectField`) | `Select` + `SelectItem`, with a load-bearing empty first option ("- Select -", nothing pre-chosen, FR-6.6); option list always caller-supplied, no built-in code list (`UswdsForm.tsx`) | Shared form pattern (F6 entry) | reviewed at each consuming screen |
| Text-area field (`TextAreaField`) | `TextArea` with its NATIVE `enableCounter` + `maxCount` character counter (replaces the hand-rolled React counter); `maxCount` caps input at the F3 structural limit (`UswdsForm.tsx`) | Shared form pattern (F6 entry, F12 reason) | reviewed at each consuming screen |
| Date field (`DateField`) | `DatePicker` (`datePickerType="single"`) + `DatePickerInput` — a real controlled React component; the text input alone (typed `YYYY-MM-DD`, submitted verbatim, no locale coercion) completes the task, the calendar is pure progressive enhancement (FR-6.5) (`UswdsForm.tsx`) | Shared form pattern (F6 entry) | reviewed at each consuming screen |
| Grouped fields (`Fieldset`) | **Composition:** native semantic `<fieldset>`/`<legend>` (standards-based HTML, not a bespoke control) styled with Carbon typography/spacing tokens; preserves the statement→error `aria-describedby` join order and the `tabIndex={-1}` error-summary focus target (FR-6.10 RIV-070/RIV-073 pair exception) (`UswdsForm.tsx`) | Shared form pattern (F6 Transport fieldset) | reviewed at each consuming screen |
| Required-field marking | **Composition:** the visible text `*` marking (`abbr title="required"`) layered into Carbon's `labelText` slot + the "* indicates a required field" convention line above the form — FR-2.11's exact wording preserved rather than deferring to Carbon's default indicator (`UswdsForm.tsx`) | Shared form pattern (all forms) | reviewed at each consuming screen |
| Primary submit (`SubmitButton`) | `Button` (busy state via `aria-disabled`, NOT `disabled`, to keep it in tab order — FR-1.19; idle/busy label swap) (`UswdsForm.tsx`) | Shared form pattern (all forms) | reviewed at each consuming screen |
| Form wrapper (`UswdsForm`) | **Composition:** Carbon `Form` wrapping a native `<form noValidate>` contract — client constraint validation never pre-empts the server (FR-1.16); a second in-flight submit is a no-op (FR-1.19) (`UswdsForm.tsx`) | Shared form pattern (all forms) | reviewed at each consuming screen |

## Notes on the compositions

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
