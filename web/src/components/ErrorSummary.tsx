// The error-summary pattern (TechArch §7.6, UX Pattern 2, Y2 §4).
//
// EVERY later screen inherits this VERBATIM — F6's entry form and F12's decision
// forms render this component unchanged. It is the single implementation of the
// pattern; no screen re-implements it.
//
// The contract, each part load-bearing:
//   - usa-alert usa-alert--error, role="alert", tabIndex={-1}.
//   - Rendered as the FIRST CHILD of the form region (the caller places it).
//   - RECEIVES FOCUS when it appears — a useEffect calling .focus(). Focus moves
//     TO the summary, not merely scrolls to it (Y2 §4, US-2.4).
//   - One item per error, IN THE EXACT ORDER the server returned them — never
//     re-ordered, merged, re-worded or suppressed.
//   - Each item with a `controlId` is an in-page link that moves focus to that
//     control by id. An item WITHOUT a controlId (the sign-in case) renders as
//     plain text — never a dead link that goes nowhere.
//   - No colour-only signalling: the error is carried by the heading text, the
//     alert icon and the position, not by colour (FR-2.17).

import { useEffect, useRef } from 'react';

export interface SummaryItem {
  /** The id of the offending control; omitted for a generic (fieldless) error. */
  readonly controlId?: string;
  readonly message: string;
}

export interface ErrorSummaryProps {
  /** ALWAYS in server order — the client never re-orders. */
  readonly items: readonly SummaryItem[];
  /** The alert heading; defaults to "There is a problem". */
  readonly heading?: string;
}

/**
 * Move focus to the offending control when an item link is activated. Uses the
 * control's id; a preventDefault keeps the browser from also jumping via the
 * hash (which would double-fire focus).
 */
function focusControl(controlId: string): void {
  const el = document.getElementById(controlId);
  if (el !== null) {
    el.focus();
  }
}

export function ErrorSummary(props: ErrorSummaryProps): JSX.Element | null {
  const { items, heading = 'There is a problem' } = props;
  const ref = useRef<HTMLDivElement>(null);

  // Focus the summary when it appears (or when its item set changes). Guard on a
  // non-empty item set so an empty render never steals focus.
  useEffect(() => {
    if (items.length > 0 && ref.current !== null) {
      ref.current.focus();
    }
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="usa-alert usa-alert--error"
      role="alert"
      tabIndex={-1}
      aria-labelledby="error-summary-heading"
    >
      <div className="usa-alert__body">
        <h2 className="usa-alert__heading" id="error-summary-heading">
          {heading}
        </h2>
        <ul className="usa-list usa-list--unstyled">
          {items.map((item, i) => (
            <li key={`${item.controlId ?? 'generic'}-${i}`}>
              {item.controlId !== undefined ? (
                <a
                  href={`#${item.controlId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    focusControl(item.controlId as string);
                  }}
                >
                  {item.message}
                </a>
              ) : (
                <span>{item.message}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
