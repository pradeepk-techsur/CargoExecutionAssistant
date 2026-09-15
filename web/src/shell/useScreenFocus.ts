// The screen focus + title contract (FR-2.24, Y2 §3, Flow-06).
//
// FOCUS IS MOVED AT EXACTLY FOUR MOMENTS AND NEVER OTHERWISE:
//   1. completed navigation        → the screen's <h1 tabindex="-1">
//   2. a rejected submission       → the error summary
//   3. an in-place success         → the outcome heading
//   4. activating an error-summary → the named control
// Focus is NEVER moved by a poll, a background refresh, or a live-region
// announcement. Stealing focus from a specialist mid-sentence is a defect that
// every later phase inherits, so this list is the discipline, not a suggestion.
//
// This hook owns moment (1): on every completed navigation it sets the document
// title, announces it politely, and moves focus to the screen's h1.

import { useEffect, type RefObject } from 'react';
import { useAnnounce } from './LiveRegions.js';

export interface ScreenFocusOptions {
  /** The screen name; becomes "{title} — CargoExec" and the polite announcement. */
  readonly title: string;
  /** Ref to the screen's <h1 tabindex="-1"> — focus lands here. */
  readonly h1Ref: RefObject<HTMLHeadingElement>;
}

/**
 * Run once per screen mount (i.e. per completed navigation, since each route
 * renders a distinct screen). Sets `document.title`, announces the title
 * politely, and moves focus to the h1.
 */
export function useScreenFocus(opts: ScreenFocusOptions): void {
  const { title, h1Ref } = opts;
  const { announceStatus } = useAnnounce();

  useEffect(() => {
    document.title = `${title} — CargoExec`;
    announceStatus(title);
    // Focus the h1 after paint so the element is present and focusable.
    const h1 = h1Ref.current;
    if (h1 !== null) {
      h1.focus();
    }
    // title is the identity of the screen; re-run if a screen legitimately
    // changes its own title in place (rare, but correct).
  }, [title, h1Ref, announceStatus]);
}
