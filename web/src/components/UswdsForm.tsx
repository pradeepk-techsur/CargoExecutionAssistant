// The inherited form pattern (TechArch §7.6; F2 FR-2.10 … FR-2.13; UX Pattern 2),
// now rendered on the **Carbon Design System** (@carbon/react) in place of USWDS.
//
// ⚠️ FILE NAME NOTE (Phase 7, plan 07-06): this file is still named
// `UswdsForm.tsx` and still exports `UswdsForm`, even though its internals now
// render Carbon components, NOT USWDS. The name is deliberately unchanged:
// every screen already imports `Field`/`SelectField`/`TextAreaField`/`DateField`/
// `Fieldset`/`SubmitButton`/`UswdsForm` from '../components/UswdsForm.js', and
// renaming the file (or the `UswdsForm` export) would force an edit to every one
// of those consumers — the exact churn this shared-component swap is designed to
// avoid. A file-name/content mismatch is an accepted, documented cost here; a
// future cleanup phase may rename it together with all its import sites.
//
// F6 and F12 render these exports unchanged. This is the single implementation
// of the form pattern; no screen re-implements it. Every exported function name
// and prop interface is BYTE-IDENTICAL to the pre-Carbon version — only the JSX
// internals changed — so no consumer needs a prop-shape edit (proven by
// `npm run typecheck`).
//
// Load-bearing details preserved across the USWDS→Carbon swap:
//   - Field: Carbon `TextInput` owns the label/id association, the
//     `invalid`/`invalidText` inline-error rendering (maps to this project's
//     `invalid`/`errorText`), and `helperText` (maps to `hint`). Carbon manages
//     the hint+error `aria-describedby` wiring INTERNALLY — we do NOT layer a
//     second hand-rolled `aria-describedby` on top (that would duplicate the
//     association; threat T-07-19). Placeholder text is NEVER a label.
//   - Required marking: FR-2.11 requires a visible text `*` plus a legend/
//     convention statement above the form. Carbon's own `required` indicator
//     differs in wording, so we layer the EXISTING visible `*` + "required"
//     `abbr` into Carbon's `labelText` (a ReactNode) rather than relying on
//     Carbon's default — FR-2.11's exact wording survives. The native
//     `required` attribute is still set on the control (browser hint only; the
//     server stays authoritative, FR-1.16).
//   - Inline error: when `invalid`, Carbon renders `invalidText` with
//     `aria-invalid` and its own describedby association (FR-2.13). SignIn simply
//     never sets `invalid` (the sign-in exception).
//   - SubmitButton: Carbon `Button`; while `busy`, the text changes and
//     `aria-disabled="true"` is set — NOT the `disabled` attribute, which drops
//     the control out of the tab order mid-interaction and strands a keyboard
//     user (FR-1.19). A second activation is IGNORED via the form's onSubmit
//     guard.
//   - UswdsForm: the native `<form noValidate>` wrapper is kept (client
//     constraint validation must never pre-empt the server, FR-1.16) with
//     Carbon's `Form` component wrapping it for consistent spacing — verified to
//     compose cleanly around the existing `onSubmit`/`noValidate` contract.
//   - No colour-only signalling and no raw hex/px — Carbon tokens only
//     (FR-2.2, FR-2.17).

import { useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  Button,
  DatePicker,
  DatePickerInput,
  Form,
  Select,
  SelectItem,
  TextArea,
  TextInput,
} from '@carbon/react';

// ── Shared label internals ─────────────────────────────────────────────────────
//
// Every control in this file obeys the SAME label + required-marking contract.
// Carbon components accept `labelText` as a ReactNode, so the required `*`
// marking is assembled once here and passed straight into each control's own
// label slot — Carbon then owns the label/id/`for` association and the
// hint/error `aria-describedby` wiring, so there is exactly ONE describedby
// mechanism per control (never a hand-rolled one layered on top; threat
// T-07-19). The per-screen a11y review certifies ONE implementation of the
// pattern, not four.

/**
 * The control label as a Carbon `labelText` node: the text, plus — for a
 * required field — the visible `*` marking (FR-2.11's exact wording, an
 * `abbr title="required"`, preserved verbatim from the pre-Carbon version so the
 * signed a11y record's convention statement still matches). The convention line
 * ("* indicates a required field") lives above the form at each call site,
 * unchanged.
 */
// Return type is deliberately the narrow `JSX.Element | string` rather than the
// wide `ReactNode`: Carbon's `DatePickerInput` types `labelText` via prop-types'
// `ReactNodeLike`, which the React 18 `ReactNode` union (now including async
// iterables) is NOT assignable to. `JSX.Element | string` is assignable to both
// `ReactNode` and `ReactNodeLike`, so one helper feeds every control's label
// slot without a cast.
function labelNode(label: string, required: boolean): JSX.Element | string {
  if (!required) return label;
  return (
    <>
      {label}{' '}
      <abbr title="required" className="cargoexec-required-marker">
        *
      </abbr>
    </>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────

export interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly autoComplete?: string;
  readonly value: string;
  onChange(v: string): void;
  readonly invalid?: boolean;
  readonly errorText?: string;
}

export function Field(props: FieldProps): JSX.Element {
  const {
    id,
    label,
    type = 'text',
    required = false,
    hint,
    autoComplete,
    value,
    onChange,
    invalid = false,
    errorText,
  } = props;

  // Carbon's TextInput owns the label/id association and — via
  // `invalid`/`invalidText` and `helperText` — the hint+error `aria-describedby`
  // wiring. We pass through `required` (native browser hint) and `autoComplete`
  // via rest props. `invalidText` must be a non-empty string when `invalid` is
  // true for Carbon to render (and associate) it.
  return (
    <TextInput
      id={id}
      name={id}
      type={type}
      labelText={labelNode(label, required)}
      value={value}
      required={required}
      invalid={invalid}
      invalidText={invalid ? (errorText ?? '') : ''}
      {...(hint !== undefined ? { helperText: hint } : {})}
      {...(autoComplete !== undefined ? { autoComplete } : {})}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ── SelectField ────────────────────────────────────────────────────────────────

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectFieldProps {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: string;
  // The option list is ALWAYS supplied by the caller from the F4 domain code
  // lists (mode_of_transport, quantity_uom, …). This component holds NO list of
  // its own — a code-list change is a data change upstream, never a change here.
  readonly options: readonly SelectOption[];
  readonly placeholder?: string;
  readonly value: string;
  onChange(v: string): void;
  readonly invalid?: boolean;
  readonly errorText?: string;
}

export function SelectField(props: SelectFieldProps): JSX.Element {
  const {
    id,
    label,
    required = false,
    hint,
    options,
    placeholder,
    value,
    onChange,
    invalid = false,
    errorText,
  } = props;

  return (
    <Select
      id={id}
      name={id}
      labelText={labelNode(label, required)}
      value={value}
      required={required}
      invalid={invalid}
      invalidText={invalid ? (errorText ?? '') : ''}
      {...(hint !== undefined ? { helperText: hint } : {})}
      onChange={(e) => onChange(e.target.value)}
    >
      {/* The empty first option is load-bearing: NOTHING is pre-chosen on the
          specialist's behalf (FR-6.6). Default copy is '- Select -' per the
          Screen-01 mockup. */}
      <SelectItem value="" text={placeholder ?? '- Select -'} />
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value} text={o.label} />
      ))}
    </Select>
  );
}

// ── TextAreaField ──────────────────────────────────────────────────────────────

export interface TextAreaFieldProps {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly maxLength: number;
  readonly rows?: number;
  readonly value: string;
  onChange(v: string): void;
  readonly invalid?: boolean;
  readonly errorText?: string;
}

export function TextAreaField(props: TextAreaFieldProps): JSX.Element {
  const {
    id,
    label,
    required = false,
    hint,
    maxLength,
    rows,
    value,
    onChange,
    invalid = false,
    errorText,
  } = props;

  // Carbon's TextArea ships a NATIVE character counter (`enableCounter` +
  // `maxCount`) that REPLACES the hand-rolled React counter the USWDS version
  // used. Carbon renders the counter as "{n}/{max}" and associates it with the
  // control internally, so it is announced with the field via Carbon's own
  // describedby mechanism (no separate hand-rolled aria-live region — that would
  // duplicate the association). `maxCount` also caps input at the F3 structural
  // limit so an over-length 422 is not reachable by typing; the server check
  // stays authoritative. The counter FORMAT differs from the USWDS
  // "{n} characters allowed" wording — this difference is called out in the
  // 07-06 SUMMARY.
  return (
    <TextArea
      id={id}
      name={id}
      labelText={labelNode(label, required)}
      rows={rows ?? 5}
      value={value}
      required={required}
      enableCounter
      maxCount={maxLength}
      invalid={invalid}
      invalidText={invalid ? (errorText ?? '') : ''}
      {...(hint !== undefined ? { helperText: hint } : {})}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ── DateField ──────────────────────────────────────────────────────────────────

export interface DateFieldProps {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly value: string;
  onChange(v: string): void;
  readonly invalid?: boolean;
  readonly errorText?: string;
}

export function DateField(props: DateFieldProps): JSX.Element {
  const {
    id,
    label,
    required = false,
    hint,
    value,
    onChange,
    invalid = false,
    errorText,
  } = props;

  // ⚠️ The text input ALONE is sufficient to complete the task (Screen-01
  // §Interactive elements): typing YYYY-MM-DD works, the value submits, and no
  // error appears. The calendar is a progressive enhancement ONLY.
  //
  // Carbon's `DatePicker` (`datePickerType="single"`) is a real React component,
  // not a DOM-attached USWDS JS behaviour, so the old workaround comment about
  // `window.uswds.components['usa-date-picker'].on()` not being invocable is now
  // MOOT — the picker Just Works as a controlled React component and needs no
  // imperative init. We keep the load-bearing invariant: the client submits the
  // date AS TYPED (FR-6.5). We drive `DatePicker` in its light "no flatpickr
  // coercion" mode by NOT passing `dateFormat`/`datePickerType="single"`'s
  // locale parsing over the raw string — the `DatePickerInput` carries the value
  // verbatim and `onChange` reads the input's own string, so a typed
  // `YYYY-MM-DD` is submitted unchanged (never a native `<input type="date">`,
  // which would coerce to a locale format).
  // Carbon's `DatePickerInput` props type extends `HTMLAttributes<HTMLInputElement>`
  // with `value`, `onChange`, `name` and `required` deliberately OMITTED /
  // unsurfaced (they are input attributes Carbon manages via the parent
  // `DatePicker`'s controlled `value`/`onChange` and the `...rest` spread). To
  // keep the value flowing verbatim AND `npm run typecheck` clean, the controlled
  // `value` + the raw-string `onChange` live on the parent `DatePicker`, and the
  // native `name`/`required` input attributes are passed through the input's
  // `...rest` spread via a small typed extra-attributes bag rather than as named
  // props. `onChange` on `DatePicker` (single mode) receives the selected dates
  // AND the raw typed string as its second arg, which we forward verbatim — so a
  // typed `YYYY-MM-DD` is submitted unchanged with no locale coercion (FR-6.5).
  const nativeAttrs: { name: string; value: string; required?: boolean } = {
    name: id,
    value,
  };
  if (required) nativeAttrs.required = true;

  return (
    <DatePicker
      datePickerType="single"
      value={value}
      onChange={(_dates: Date[], currentValue?: string) => {
        // Forward the raw typed/selected string verbatim; never a coerced Date.
        if (currentValue !== undefined) onChange(currentValue);
      }}
    >
      <DatePickerInput
        id={id}
        placeholder="YYYY-MM-DD"
        labelText={labelNode(label, required)}
        invalid={invalid}
        invalidText={invalid ? (errorText ?? '') : ''}
        {...(hint !== undefined ? { helperText: hint } : {})}
        {...nativeAttrs}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </DatePicker>
  );
}

// ── Fieldset ───────────────────────────────────────────────────────────────────

export interface FieldsetProps {
  readonly id: string;
  readonly legend: string;
  readonly statement?: string;
  readonly errorTexts?: readonly string[];
  readonly children: ReactNode;
}

export function Fieldset(props: FieldsetProps): JSX.Element {
  const { id, legend, statement, errorTexts, children } = props;

  // Carbon has no dedicated Fieldset wrapper component, so we keep the native
  // `<fieldset>`/`<legend>` — required, semantic, standards-based HTML, not a
  // "bespoke control" — styled with Carbon typography/spacing tokens via a
  // scoped class. The `aria-describedby` JOIN ORDER (statement id, then
  // fieldset-level error id) and the `tabIndex={-1}` focus target are preserved
  // exactly.
  //
  // This is the mechanism behind FR-6.10's sole exception: RIV-070 and RIV-073
  // each carry a single field_name, but BOTH render on the Transport fieldset —
  // inside this fieldset-level error slot and associated via aria-describedby on
  // the <fieldset> itself — because the finding concerns the field PAIR, not
  // either field alone. Do NOT "fix" this into a per-field binding.
  const hasStatement = statement !== undefined;
  const hasErrors = errorTexts !== undefined && errorTexts.length > 0;
  const describedBy =
    [hasStatement ? `${id}-statement` : undefined, hasErrors ? `${id}-error` : undefined]
      .filter((x): x is string => x !== undefined)
      .join(' ') || undefined;

  return (
    <fieldset
      className="cargoexec-fieldset"
      id={id}
      // Focusable as an error-summary link target (the summary link focuses the
      // fieldset when a finding lives on the pair, not on one field).
      tabIndex={-1}
      {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
    >
      <legend className="cargoexec-legend">{legend}</legend>
      {hasStatement && (
        <p className="cargoexec-fieldset-statement" id={`${id}-statement`}>
          {statement}
        </p>
      )}
      {hasErrors && (
        <div className="cargoexec-fieldset-error" id={`${id}-error`} role="alert">
          {errorTexts.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      )}
      {children}
    </fieldset>
  );
}

// ── SubmitButton ───────────────────────────────────────────────────────────────

export interface SubmitButtonProps {
  readonly busy: boolean;
  readonly idleLabel: string;
  readonly busyLabel: string;
}

export function SubmitButton(props: SubmitButtonProps): JSX.Element {
  const { busy, idleLabel, busyLabel } = props;
  return (
    <Button
      type="submit"
      // aria-disabled (NOT the disabled attribute) keeps the control in the tab
      // order while busy; the form's onSubmit guard ignores the repeat activation.
      aria-disabled={busy ? true : undefined}
    >
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}

// ── UswdsForm ──────────────────────────────────────────────────────────────────

export interface UswdsFormProps {
  /** Whether a submit is in flight — a second activation is ignored while true. */
  readonly busy: boolean;
  onSubmit(): void;
  readonly children: ReactNode;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function UswdsForm(props: UswdsFormProps): JSX.Element {
  const { busy, onSubmit, children, ariaLabel, className } = props;
  const formRef = useRef<HTMLFormElement | null>(null);

  // Carbon's `Form` renders a native `<form>` and forwards `onSubmit`,
  // `noValidate`, `aria-label` and `className` to it. We set `noValidate` so
  // native constraint validation never pre-empts the server (FR-1.16, F2 process
  // step 3): the server decides. The ref lets us confirm the rendered element is
  // a real <form> in review; nothing else depends on it.
  useEffect(() => {
    void formRef.current;
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Repeat-submission blocking (FR-1.19, UX Pattern 9): while a request is in
    // flight, a second Enter/click is a no-op.
    if (busy) return;
    onSubmit();
  }

  return (
    <Form
      ref={formRef}
      noValidate
      className={`cargoexec-form${className !== undefined ? ` ${className}` : ''}`}
      onSubmit={handleSubmit}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
    >
      {children}
    </Form>
  );
}
