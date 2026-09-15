// The inherited form pattern (TechArch §7.6; F2 FR-2.10 … FR-2.13; UX Pattern 2).
//
// F6 and F12 render Field/SubmitButton/UswdsForm unchanged. This is the single
// implementation of the form pattern; no screen re-implements it.
//
// Load-bearing details:
//   - Field: usa-form-group, <label class="usa-label" for={id}> bound to the
//     control's id, optional hint in usa-hint associated via aria-describedby,
//     usa-input. Placeholder text is NEVER a label and never the only hint.
//     Required fields get the USWDS marking (visible * plus `required`).
//   - Inline error: when `invalid`, render usa-error-message inside
//     usa-form-group--error, bound via aria-describedby, with aria-invalid="true"
//     (FR-2.13). SignIn simply never sets `invalid` (the sign-in exception).
//   - SubmitButton: usa-button; while `busy`, the text changes and
//     aria-disabled="true" is set. A second activation is IGNORED via a handler
//     guard — NOT the `disabled` attribute, which drops the control out of the
//     tab order mid-interaction and strands a keyboard user (FR-1.19).
//   - UswdsForm: the <form> carries `noValidate` so native constraint validation
//     never pre-empts the server (FR-1.16). The browser may hint; the server
//     decides.
//   - No colour-only signalling and no raw hex/px — tokens only (FR-2.2, FR-2.17).

import { useEffect, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';

// ── Shared field internals ─────────────────────────────────────────────────────
//
// `Field` originally owned the label/hint/error wiring inline. F6 needs three
// more control types (select, textarea, date) that must obey the SAME
// label/hint/error/aria-describedby/aria-invalid contract, so that wiring is
// factored out here and reused by all four controls. The per-screen a11y review
// then certifies ONE implementation of the pattern, not four.
//
// ⚠️ `Field`'s rendered markup MUST stay byte-identical to its pre-refactor
// output: e2e/sign-in.spec.ts, e2e/shell.spec.ts and
// server/test/architecture/navigation.spec.ts all render it, and Phase 2's
// signed docs/a11y/sign-in.md certifies that exact markup.

/**
 * The id/aria-describedby contract shared by every control in this file.
 * `hintId` exists whenever a hint is supplied; `errorId` only when the control
 * is invalid AND carries error text. `describedBy` joins the supplied fragment
 * ids (extras first — e.g. a character-count region — then hint, then error),
 * and is `undefined` when empty so no bare attribute is emitted.
 */
function useFieldIds(
  id: string,
  hint: string | undefined,
  invalid: boolean,
  errorText: string | undefined,
  extraDescribedByIds: readonly string[] = [],
): { hintId?: string; errorId?: string; describedBy?: string } {
  const hintId = hint !== undefined ? `${id}-hint` : undefined;
  const errorId = invalid && errorText !== undefined ? `${id}-error` : undefined;
  const describedBy =
    [...extraDescribedByIds, hintId, errorId]
      .filter((x): x is string => x !== undefined)
      .join(' ') || undefined;
  const out: { hintId?: string; errorId?: string; describedBy?: string } = {};
  if (hintId !== undefined) out.hintId = hintId;
  if (errorId !== undefined) out.errorId = errorId;
  if (describedBy !== undefined) out.describedBy = describedBy;
  return out;
}

/**
 * The `usa-form-group` shell: the group div (with `--error` when invalid), the
 * `usa-label` (with the USWDS required marking), an optional hint, and the
 * inline `usa-error-message`. The control itself is passed as `children`.
 * `Field`'s original markup ordering — label, hint, error, then control — is
 * preserved exactly.
 */
function FormGroup(props: {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  readonly hint?: string;
  readonly hintId?: string;
  readonly invalid: boolean;
  readonly errorText?: string;
  readonly errorId?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const { id, label, required, hint, hintId, invalid, errorText, errorId, children } =
    props;
  return (
    <div className={`usa-form-group${invalid ? ' usa-form-group--error' : ''}`}>
      <label className="usa-label" htmlFor={id}>
        {label}
        {required && (
          <>
            {' '}
            <abbr title="required" className="usa-hint--required">
              *
            </abbr>
          </>
        )}
      </label>
      {hint !== undefined && (
        <span className="usa-hint" id={hintId}>
          {hint}
        </span>
      )}
      {invalid && errorText !== undefined && (
        <span className="usa-error-message" id={errorId} role="alert">
          {errorText}
        </span>
      )}
      {children}
    </div>
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

  const { hintId, errorId, describedBy } = useFieldIds(id, hint, invalid, errorText);

  return (
    <FormGroup
      id={id}
      label={label}
      required={required}
      {...(hint !== undefined ? { hint } : {})}
      {...(hintId !== undefined ? { hintId } : {})}
      invalid={invalid}
      {...(errorText !== undefined ? { errorText } : {})}
      {...(errorId !== undefined ? { errorId } : {})}
    >
      <input
        className={`usa-input${invalid ? ' usa-input--error' : ''}`}
        id={id}
        name={id}
        type={type}
        value={value}
        required={required}
        {...(autoComplete !== undefined ? { autoComplete } : {})}
        {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
        {...(invalid ? { 'aria-invalid': true } : {})}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormGroup>
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

  const { hintId, errorId, describedBy } = useFieldIds(id, hint, invalid, errorText);

  return (
    <FormGroup
      id={id}
      label={label}
      required={required}
      {...(hint !== undefined ? { hint } : {})}
      {...(hintId !== undefined ? { hintId } : {})}
      invalid={invalid}
      {...(errorText !== undefined ? { errorText } : {})}
      {...(errorId !== undefined ? { errorId } : {})}
    >
      <select
        className={`usa-select${invalid ? ' usa-input--error' : ''}`}
        id={id}
        name={id}
        value={value}
        required={required}
        {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
        {...(invalid ? { 'aria-invalid': true } : {})}
        onChange={(e) => onChange(e.target.value)}
      >
        {/* The empty first option is load-bearing: NOTHING is pre-chosen on the
            specialist's behalf (FR-6.6). Default copy is '- Select -' per the
            Screen-01 mockup. */}
        <option value="">{placeholder ?? '- Select -'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FormGroup>
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

  // The character count is a describedby target, so it is announced with the
  // control. It is listed BEFORE the hint/error fragments in aria-describedby.
  const infoId = `${id}-info`;
  const { hintId, errorId, describedBy } = useFieldIds(id, hint, invalid, errorText, [
    infoId,
  ]);

  // The counter is rendered in React, NOT via USWDS JS. The usa-character-count
  // behaviour is initialised by /assets/js/uswds.min.js at document load, but
  // this component mounts later from React, so that init would never see it. A
  // React-computed counter is deterministic, needs no init, and announces the
  // same text. `maxLength` caps input at the F3 structural limit so an
  // over-length 422 is not reachable by typing; the server check stays
  // authoritative. USWDS copy: "{n} characters allowed" under the limit,
  // "{n} characters over limit" if exceeded (unreachable with maxLength set,
  // but the branch keeps the copy correct).
  const overBy = value.length - maxLength;
  const message =
    overBy > 0
      ? `${overBy} character${overBy === 1 ? '' : 's'} over limit`
      : `${maxLength - value.length} character${
          maxLength - value.length === 1 ? '' : 's'
        } allowed`;

  return (
    <FormGroup
      id={id}
      label={label}
      required={required}
      {...(hint !== undefined ? { hint } : {})}
      {...(hintId !== undefined ? { hintId } : {})}
      invalid={invalid}
      {...(errorText !== undefined ? { errorText } : {})}
      {...(errorId !== undefined ? { errorId } : {})}
    >
      <textarea
        className={`usa-textarea${invalid ? ' usa-input--error' : ''}`}
        id={id}
        name={id}
        maxLength={maxLength}
        rows={rows ?? 5}
        value={value}
        required={required}
        {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
        {...(invalid ? { 'aria-invalid': true } : {})}
        onChange={(e) => onChange(e.target.value)}
      />
      <span
        className="usa-hint usa-character-count__message"
        id={infoId}
        aria-live="polite"
      >
        {message}
      </span>
    </FormGroup>
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

  const { hintId, errorId, describedBy } = useFieldIds(id, hint, invalid, errorText);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // ⚠️ The text input ALONE is sufficient to complete the task (Screen-01
  // §Interactive elements): typing YYYY-MM-DD works, the value submits, and no
  // error appears. The calendar is a progressive enhancement ONLY.
  //
  // The USWDS date-picker behaviour is normally initialised by
  // /assets/js/uswds.min.js at document load; this component mounts later from
  // React, so we attempt explicit init here. The installed @uswds/uswds build
  // (web/public/assets/js/uswds.min.js) exposes only `window.uswdsPresent` and
  // does NOT expose an imperative `window.uswds.components['usa-date-picker'].on()`
  // accessor, so this init is a guarded no-op by design: the plain `usa-input`
  // + YYYY-MM-DD hint is rendered and is fully keyboard-operable. We never let a
  // widget rewrite the value — the client submits the date AS TYPED (FR-6.5).
  // type="text" (never type="date") so the browser never coerces to a locale
  // format. See SUMMARY deviation D-1.
  useEffect(() => {
    const el = wrapperRef.current;
    if (el === null) return;
    try {
      const g = (
        window as {
          uswds?: {
            components?: {
              ['usa-date-picker']?: { on(el: Element): void };
            };
          };
        }
      ).uswds;
      g?.components?.['usa-date-picker']?.on(el);
    } catch {
      // Swallow: the plain text input is authoritative and already works.
    }
  }, []);

  return (
    <FormGroup
      id={id}
      label={label}
      required={required}
      {...(hint !== undefined ? { hint } : {})}
      {...(hintId !== undefined ? { hintId } : {})}
      invalid={invalid}
      {...(errorText !== undefined ? { errorText } : {})}
      {...(errorId !== undefined ? { errorId } : {})}
    >
      <div className="usa-date-picker" data-default-value="" ref={wrapperRef}>
        <input
          className={`usa-input${invalid ? ' usa-input--error' : ''}`}
          id={id}
          name={id}
          type="text"
          value={value}
          required={required}
          {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
          {...(invalid ? { 'aria-invalid': true } : {})}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </FormGroup>
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

  // aria-describedby on the <fieldset> joins the statement id (when present)
  // then the fieldset error id (when error texts exist), in that order.
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
      className="usa-fieldset"
      id={id}
      // Focusable as an error-summary link target (the summary link focuses the
      // fieldset when a finding lives on the pair, not on one field).
      tabIndex={-1}
      {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
    >
      <legend className="usa-legend">{legend}</legend>
      {hasStatement && (
        <p className="usa-hint" id={`${id}-statement`}>
          {statement}
        </p>
      )}
      {hasErrors && (
        <div className="usa-error-message" id={`${id}-error`} role="alert">
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
    <button
      type="submit"
      className="usa-button"
      // aria-disabled (NOT the disabled attribute) keeps the control in the tab
      // order while busy; the form's onSubmit guard ignores the repeat activation.
      aria-disabled={busy ? true : undefined}
    >
      {busy ? busyLabel : idleLabel}
    </button>
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

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Repeat-submission blocking (FR-1.19, UX Pattern 9): while a request is in
    // flight, a second Enter/click is a no-op.
    if (busy) return;
    onSubmit();
  }

  return (
    <form
      // noValidate: native constraint validation must never pre-empt the server
      // (FR-1.16, F2 process step 3). The server decides.
      noValidate
      className={`usa-form${className !== undefined ? ` ${className}` : ''}`}
      onSubmit={handleSubmit}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
    >
      {children}
    </form>
  );
}
