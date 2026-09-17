// The five shared state components (FR-2.22, UX Pattern 6), defined ONCE so no
// screen re-implements one divergently, now rendered on the **Carbon Design
// System** (`@carbon/react`) in place of USWDS. The ErrorState / Degraded
// distinction is load-bearing and inherited by F10: a missing AI recommendation
// is NOT a failure from the specialist's point of view, and presenting it as one
// would invite parking the case instead of deciding it.
//
// Every exported function name and prop shape is UNCHANGED from the pre-Carbon
// version — only the JSX internals moved from `usa-*` to Carbon components — so
// no consumer needs a prop-shape edit (proven by `npm run typecheck`).

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, InlineNotification, Loading as CarbonLoading } from '@carbon/react';

/**
 * Loading — Carbon's `Loading` indicator, `aria-busy` SCOPED to the region being
 * loaded (not the whole page), rendered only after 300 ms so a fast response
 * never flashes a spinner, and announced "Loading…". Carbon's `Loading` renders
 * its own accessible description; we ALSO keep the region-scoped `role="status"`
 * + `aria-busy` wrapper and the visually-hidden status text so the
 * region-scoped, 300ms-delayed, "Loading…"-announced contract the pre-Carbon
 * version guaranteed is preserved exactly. `withOverlay={false}` keeps the
 * spinner in-flow (region-scoped, never a full-page overlay).
 */
export function Loading(props: {
  label?: string;
  region?: string;
}): JSX.Element | null {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div role="status" aria-busy="true" aria-label={props.region}>
      <CarbonLoading
        small
        withOverlay={false}
        description={props.label ?? 'Loading…'}
      />
      <span className="cargoexec-visually-hidden">{props.label ?? 'Loading…'}</span>
    </div>
  );
}

/**
 * Empty — a message plus at most one call to action. This is NOT an error, and
 * it is never "no results for your filter": there is no filter in this product.
 * Plain content (no `role` implying alert/status); the optional CTA is a Carbon
 * `Button` rendered as a react-router `Link` (`as={Link}`) so navigation stays
 * client-side.
 */
export function Empty(props: {
  message: string;
  action?: { to: string; label: string };
}): JSX.Element {
  return (
    <div className="cargoexec-prose">
      <p>{props.message}</p>
      {props.action !== undefined && (
        <Button as={Link} to={props.action.to}>
          {props.action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * ErrorState — a STATED CAUSE plus an optional "Try again". No stack trace,
 * ever (T-02-30: server-supplied text is escaped by React; no raw HTML).
 * Carbon `InlineNotification kind="error"` with `role="alert"` set explicitly
 * (Carbon defaults notifications to `role="status"`, so the alert semantics are
 * asserted here, not assumed).
 */
export function ErrorState(props: {
  cause: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div>
      <InlineNotification
        kind="error"
        role="alert"
        lowContrast
        hideCloseButton
        title="Something went wrong"
        subtitle={props.cause}
      />
      {props.onRetry !== undefined && (
        <Button kind="tertiary" onClick={props.onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Degraded — NOT an error: a condition of the case plus what the specialist can
 * still do. Inherited by F10 for the unavailable-recommendation case. Carbon
 * `InlineNotification kind="warning"` with `role="status"` (the "not an error"
 * distinction from ErrorState is load-bearing — a warning the specialist can act
 * around, not a failure).
 */
export function Degraded(props: {
  condition: string;
  whatYouCanStillDo: string;
}): JSX.Element {
  return (
    <InlineNotification
      kind="warning"
      role="status"
      lowContrast
      hideCloseButton
      title={props.condition}
      subtitle={props.whatYouCanStillDo}
    />
  );
}

/**
 * ReadOnlyNotice — states that a record is final and cannot be changed. Used by
 * later phases on resolved/rejected cases. Carbon `InlineNotification
 * kind="info"` (its low-contrast/slim variant), `role="note"`.
 */
export function ReadOnlyNotice(props: { message: string }): JSX.Element {
  // FR-2.22 wants `role="note"` here (a final record, neither an alert nor a live
  // status). Carbon types `InlineNotification`'s own `role` prop to `'alert' |
  // 'log' | 'status'` only, so the `note` landmark is carried by an outer wrapper
  // element rather than the notification's own root. The Carbon info notification
  // supplies the visual treatment; the `role="note"` on the container is the
  // authoritative region semantics AT navigates.
  return (
    <div role="note">
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title=""
        subtitle={props.message}
      />
    </div>
  );
}

// A tiny convenience re-export so screens can compose a state within prose.
export type StateChildren = { children?: ReactNode };
