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

import type { FormEvent, ReactNode } from 'react';

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

  const hintId = hint !== undefined ? `${id}-hint` : undefined;
  const errorId = invalid && errorText !== undefined ? `${id}-error` : undefined;
  // aria-describedby links the control to its hint and (when present) its error,
  // in that order. Undefined when neither exists so no empty attribute is set.
  const describedBy =
    [hintId, errorId].filter((x): x is string => x !== undefined).join(' ') ||
    undefined;

  return (
    <div
      className={`usa-form-group${invalid ? ' usa-form-group--error' : ''}`}
    >
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
    </div>
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
