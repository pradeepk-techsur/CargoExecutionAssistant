// The five shared state components (FR-2.22, UX Pattern 6), defined ONCE so no
// screen re-implements one divergently. The ErrorState / Degraded distinction
// is load-bearing and inherited by F10: a missing AI recommendation is NOT a
// failure from the specialist's point of view, and presenting it as one would
// invite parking the case instead of deciding it.

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Loading — the USWDS loading indicator, `aria-busy` SCOPED to the region being
 * loaded (not the whole page), rendered only after 300 ms so a fast response
 * never flashes a spinner, and announced "Loading…".
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
    <div
      role="status"
      aria-busy="true"
      aria-label={props.region}
      className="usa-loader"
    >
      <span className="usa-sr-only">{props.label ?? 'Loading…'}</span>
    </div>
  );
}

/**
 * Empty — a message plus at most one call to action. This is NOT an error, and
 * it is never "no results for your filter": there is no filter in this product.
 */
export function Empty(props: {
  message: string;
  action?: { to: string; label: string };
}): JSX.Element {
  return (
    <div className="usa-prose">
      <p>{props.message}</p>
      {props.action !== undefined && (
        <Link className="usa-button" to={props.action.to}>
          {props.action.label}
        </Link>
      )}
    </div>
  );
}

/**
 * ErrorState — a STATED CAUSE plus an optional "Try again". No stack trace,
 * ever (T-02-30: server-supplied text is escaped by React; no raw HTML).
 */
export function ErrorState(props: {
  cause: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="usa-alert usa-alert--error" role="alert">
      <div className="usa-alert__body">
        <h2 className="usa-alert__heading">Something went wrong</h2>
        <p className="usa-alert__text">{props.cause}</p>
        {props.onRetry !== undefined && (
          <button
            type="button"
            className="usa-button usa-button--outline"
            onClick={props.onRetry}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Degraded — NOT an error: a condition of the case plus what the specialist can
 * still do. Inherited by F10 for the unavailable-recommendation case.
 */
export function Degraded(props: {
  condition: string;
  whatYouCanStillDo: string;
}): JSX.Element {
  return (
    <div className="usa-alert usa-alert--warning" role="status">
      <div className="usa-alert__body">
        <p className="usa-alert__text">{props.condition}</p>
        <p className="usa-alert__text">{props.whatYouCanStillDo}</p>
      </div>
    </div>
  );
}

/**
 * ReadOnlyNotice — states that a record is final and cannot be changed. Used by
 * later phases on resolved/rejected cases.
 */
export function ReadOnlyNotice(props: { message: string }): JSX.Element {
  return (
    <div className="usa-alert usa-alert--info usa-alert--slim" role="note">
      <div className="usa-alert__body">
        <p className="usa-alert__text">{props.message}</p>
      </div>
    </div>
  );
}

// A tiny convenience re-export so screens can compose a state within prose.
export type StateChildren = { children?: ReactNode };
