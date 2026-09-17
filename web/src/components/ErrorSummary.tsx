// The error-summary pattern (TechArch §7.6, UX Pattern 2, Y2 §4), now rendered
// on the **Carbon Design System** (`@carbon/react` `InlineNotification`) in place
// of USWDS.
//
// EVERY later screen inherits this VERBATIM — F6's entry form and F12's decision
// forms render this component unchanged. It is the single implementation of the
// pattern; no screen re-implements it. The exported `ErrorSummary` and its
// `SummaryItem` type are UNCHANGED.
//
// The contract, each part load-bearing and PRESERVED across the USWDS→Carbon
// swap (these are focus/order/link mechanics, NOT visual styling — they do not
// change with the primitive):
//   - Rendered on Carbon `InlineNotification kind="error"` (title only), with the
//     custom list of per-control in-page links rendered as a SIBLING of the
//     notification inside the project-owned `role="alert"` container — NOT as the
//     notification's children. Carbon's `InlineNotification` runs
//     `useNoInteractiveChildren` and THROWS on any interactive child, so the
//     links (the pattern's whole point) cannot be nested inside it.
//     `ActionableNotification` is likewise unsuitable: its content model is a
//     single action button, not a list of in-page links.
//   - `role="alert"` and `tabIndex={-1}` on the focusable container. Carbon's
//     notification does not auto-focus itself and does not itself carry
//     `tabIndex={-1}`, so BOTH are asserted explicitly here.
//   - RECEIVES FOCUS when it appears — a `ref`+`useEffect` calling `.focus()`.
//     This project-owned focus management is UNCHANGED (Carbon notifications do
//     not manage it). Focus moves TO the summary, not merely scrolls to it
//     (Y2 §4, US-2.4).
//   - One item per error, IN THE EXACT ORDER the server returned them — never
//     re-ordered, merged, re-worded or suppressed.
//   - Each item with a `controlId` is an in-page link that moves focus to that
//     control by id (`preventDefault` + `.focus()`, UNCHANGED). An item WITHOUT
//     a controlId (the sign-in case) renders as plain text — never a dead link.
//   - No colour-only signalling: the error is carried by the heading text, the
//     notification's error icon and the position, not by colour (FR-2.17).

import { useEffect, useRef } from 'react';
import { InlineNotification } from '@carbon/react';

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
  // non-empty item set so an empty render never steals focus. UNCHANGED from the
  // pre-Carbon version — Carbon's notification does not auto-focus.
  useEffect(() => {
    if (items.length > 0 && ref.current !== null) {
      ref.current.focus();
    }
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  // The per-control link list is rendered as a SIBLING of the Carbon
  // `InlineNotification`, INSIDE the project-owned focusable container — NOT as
  // the notification's children. This is load-bearing (07-10 fix): Carbon's
  // `InlineNotification` runs `useNoInteractiveChildren` on its own content and
  // THROWS if it contains an interactive node (the error-summary pattern's whole
  // point is a list of in-page `<a>` links). So the notification carries only
  // the bold `title` (the heading + its error icon), and the ordered link list —
  // the interactive part — lives beside it within the same `role="alert"`
  // container. Every focus/order/link mechanic is unchanged; only the DOM nesting
  // of the link list relative to the notification moved (out of, not into, it).
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby="error-summary-heading"
      className="cargoexec-error-summary"
    >
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={heading}
      />
      {/* The per-control link list, rendered IN SERVER ORDER, as a sibling of the
          notification (never its child — Carbon forbids interactive children). */}
      <ul className="cargoexec-error-summary__list">
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
      {/* The accessible name of the alert container is the heading text, exposed
          via aria-labelledby → this visually-hidden mirror (the Carbon title is
          inside the notification and not reliably the container's label). */}
      <span id="error-summary-heading" className="cargoexec-visually-hidden">
        {heading}
      </span>
    </div>
  );
}
