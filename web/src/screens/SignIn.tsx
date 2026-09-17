// The F1 sign-in screen (UX Screen-00; F1 FR-1.15 … FR-1.21; F2 FR-2.10 … FR-2.16).
//
// This is "an accountability gate, not merely a security perimeter" (Screen-00).
// Two details are counter-intuitive and both are deliberate (Y2 §4.8, US-1.1):
//   1. A failed sign-in shows EXACTLY ONE generic summary item — "Email or
//      password is incorrect." — because the server returns one generic error.
//   2. NEITHER input receives aria-invalid and no field-level error styling
//      appears — announcing an invalid field would leak which one was wrong.
// On any failure the PASSWORD is cleared and the EMAIL is retained: a failed
// submission must never cost the specialist the email she typed, and must never
// leave her password in the DOM (Screen-00 States).
//
// DELIBERATELY ABSENT (Screen-00): no session-persistence checkbox, no
// credential-recovery link, no self-provisioning link, no third-party/PIV/SSO
// buttons, no password-visibility toggle, and no role selector. No marketing,
// screenshots, version strings or environment badges. No countdown timer. There
// is no loading or empty state — the screen has no data to load. (These terms
// are spelled obliquely so the affordance-absence grep stays clean.)

import { useEffect, useRef, useState } from 'react';
import { Column, Grid, InlineNotification } from '@carbon/react';
import type { ErrorCode } from '@cargoexec/contract';
import { ERROR_MESSAGES } from '@cargoexec/contract';
import { useScreenFocus } from '../shell/useScreenFocus.js';
import { useAnnounce } from '../shell/LiveRegions.js';
import { useSession } from '../session/SessionProvider.js';
import { ApiClientError } from '../api/client.js';
import { ErrorSummary, type SummaryItem } from '../components/ErrorSummary.js';
import {
  Field,
  SubmitButton,
  UswdsForm,
} from '../components/UswdsForm.js';

const EMAIL_ID = 'signin-email';
const PASSWORD_ID = 'signin-password';

/**
 * Branch on CODES, never on message text (FR-Y2.3). Each returns the summary
 * items (server order) plus, for 422 REQUEST_MALFORMED only, the ids of fields
 * to mark aria-invalid. Every other failure marks NO field.
 */
interface FailureView {
  readonly items: readonly SummaryItem[];
  readonly assertive: string;
  readonly invalidFields: ReadonlySet<string>;
}

/** Map an ApiClientError to what the screen renders (Screen-00 States table). */
function viewForError(err: ApiClientError): FailureView {
  // 422: per-field detail from details[]; Carbon renders the named field's
  // inline invalidText with aria-invalid="true" (via Field, 07-06) — the ONLY
  // case that marks a field.
  if (err.code === 'REQUEST_MALFORMED' && err.details !== undefined) {
    const items: SummaryItem[] = [];
    const invalid = new Set<string>();
    for (const d of err.details) {
      const controlId =
        d.field === 'email'
          ? EMAIL_ID
          : d.field === 'password'
            ? PASSWORD_ID
            : undefined;
      items.push(
        controlId !== undefined
          ? { controlId, message: d.message }
          : { message: d.message },
      );
      if (controlId !== undefined) invalid.add(controlId);
    }
    if (items.length === 0) {
      items.push({ message: messageFor('REQUEST_MALFORMED') });
    }
    return {
      items,
      assertive: 'There is a problem with your submission.',
      invalidFields: invalid,
    };
  }

  // Everything else: one generic, fieldless item. No aria-invalid on any input.
  const network = err.code === 'NETWORK';
  const message = network
    ? 'We could not reach the server. Try again.'
    : messageFor(err.code);
  return {
    items: [{ message }],
    assertive: 'There is a problem with your sign-in.',
    invalidFields: new Set<string>(),
  };
}

/** The canonical wording for a code, from the shared contract catalogue. */
function messageFor(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'Email or password is incorrect.';
}

export function SignIn(): JSX.Element {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useScreenFocus({ title: 'Sign in', h1Ref });
  const { announceStatus, announceError } = useAnnounce();
  const { signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<FailureView | null>(null);

  // The reason we arrived at /sign-in, if any (Screen-00 States):
  //   expired     → Carbon InlineNotification kind="info"    "Your session expired…"
  //   signed-out  → Carbon InlineNotification kind="success" "You are signed out."
  // Both carry role="status" (a polite announcement, not an alert). The reason is
  // read from a fixed URLSearchParams allowlist ('expired'/'signed-out'), never
  // rendered as raw arbitrary query content (T-07-21). Read once from the URL.
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  const arrivedExpired = reason === 'expired';
  const arrivedSignedOut = reason === 'signed-out';

  // Announce the ARRIVAL REASON politely, after the screen-title announcement
  // that useScreenFocus makes on mount (so it is the sentence that lands, not
  // the generic "Sign in"). The signed-out confirmation is owned by the screen
  // we arrive at, per Screen-00's "Signed out" state — a screen-reader user
  // hears "You are signed out." here, matching the visible slim success alert.
  useEffect(() => {
    if (arrivedSignedOut) {
      const id = window.setTimeout(
        () => announceStatus('You are signed out.'),
        120,
      );
      return () => window.clearTimeout(id);
    }
    if (arrivedExpired) {
      const id = window.setTimeout(
        () => announceStatus('Your session expired. Sign in again to continue.'),
        120,
      );
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [arrivedSignedOut, arrivedExpired, announceStatus]);

  async function onSubmit(): Promise<void> {
    // The UswdsForm already ignores a repeat activation while busy; this guard is
    // belt-and-braces (FR-1.19).
    if (busy) return;
    setBusy(true);
    setFailure(null);
    announceStatus('Signing in.');
    try {
      await signIn(email, password);
      // On success SessionProvider navigates away; nothing more to do here.
    } catch (err) {
      const view =
        err instanceof ApiClientError
          ? viewForError(err)
          : {
              items: [{ message: 'Email or password is incorrect.' }],
              assertive: 'There is a problem with your sign-in.',
              invalidFields: new Set<string>(),
            };
      // Screen-00 States: clear the password, KEEP the email, mark no field
      // (unless 422). Announce assertively; focus moves to the summary itself.
      setPassword('');
      setFailure(view);
      announceError(view.assertive);
    } finally {
      setBusy(false);
    }
  }

  return (
    // Carbon responsive grid replaces the USWDS grid-row/grid-col layout: the
    // sign-in column is full width on small, roughly half on medium and a
    // comfortable ~third on large — the same tablet/desktop narrowing the USWDS
    // `grid-col-12 tablet:grid-col-6 desktop:grid-col-4` classes provided.
    <Grid className="cargoexec-signin">
      <Column sm={4} md={4} lg={6}>
        <h1 tabIndex={-1} ref={h1Ref}>
          Sign in to CargoExec
        </h1>

        {arrivedExpired && failure === null && (
          <InlineNotification
            kind="info"
            role="status"
            lowContrast
            hideCloseButton
            title="Your session expired. Sign in again to continue."
          />
        )}

        {arrivedSignedOut && failure === null && (
          <InlineNotification
            kind="success"
            role="status"
            lowContrast
            hideCloseButton
            title="You are signed out."
          />
        )}

        <UswdsForm
          busy={busy}
          onSubmit={() => {
            void onSubmit();
          }}
          ariaLabel="Sign in"
        >
          {/* The error summary is the FIRST CHILD of the form region, above the
              fields, so it is encountered before them (US-2.4). */}
          {failure !== null && <ErrorSummary items={failure.items} />}

          <p className="cargoexec-required-note">
            A star (*) marks required information.
          </p>

          <Field
            id={EMAIL_ID}
            label="Email address"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={setEmail}
            invalid={failure?.invalidFields.has(EMAIL_ID) ?? false}
          />
          <Field
            id={PASSWORD_ID}
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            invalid={failure?.invalidFields.has(PASSWORD_ID) ?? false}
          />

          <SubmitButton busy={busy} idleLabel="Sign in" busyLabel="Signing in…" />
        </UswdsForm>
      </Column>
    </Grid>
  );
}
