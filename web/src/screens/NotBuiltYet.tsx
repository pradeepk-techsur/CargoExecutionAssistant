// NotBuiltYet — the transitional placeholder for the two navigation
// destinations owned by later phases: /entries/new is F6 (Phase 3) and /queue
// is F8 (Phase 4). A nav link to a route that 404s would be a broken shell and
// would fail UX §2's no-orphan-screen invariant, so both routes render this
// screen inside the shell with the correct h1, the correct document title, and
// one Carbon InlineNotification (kind="info", role="status").
//
// THIS FILE IS A TRANSITIONAL BUILD ARTEFACT. Phase 3 replaces /entries/new and
// Phase 4 replaces /queue; delete NotBuiltYet.tsx when the SECOND of those two
// phases lands.
//
// Constraints (so it does not become scope, UX Pattern 7 / FR-12.11): it
// renders NO disabled control, no "coming soon" chip, no greyed-out table, and
// no tooltip explaining a missing capability.

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { InlineNotification } from '@carbon/react';
import { NAV_ITEMS } from '../shell/navItems.js';
import { useScreenFocus } from '../shell/useScreenFocus.js';

export interface NotBuiltYetProps {
  readonly title: string;
}

export function NotBuiltYet(props: NotBuiltYetProps): JSX.Element {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useScreenFocus({ title: props.title, h1Ref });

  // Link to the OTHER destination so a specialist is never stranded.
  const other =
    NAV_ITEMS.find((n) => n.label !== props.title) ?? NAV_ITEMS[0];

  // The `usa-alert--info` becomes Carbon `InlineNotification kind="info"` with
  // role="status" preserved (a polite notice, not an alert). The "link to the
  // OTHER nav destination" affordance is carried in the notification's `children`
  // ReactNode slot (Carbon types `subtitle` as a plain string, so the react-router
  // `Link` goes in `children`, the same slot ErrorSummary uses for its link list)
  // — unchanged NAV_ITEMS logic. Prose typography now comes from Carbon's global
  // type styles (@carbon/styles), so the container is a plain element rather than
  // `usa-prose`. Still NO disabled control, no "coming soon" chip, no tooltip
  // (UX Pattern 7 / FR-12.11).
  return (
    <div className="cargoexec-prose">
      <h1 tabIndex={-1} ref={h1Ref}>
        {props.title}
      </h1>
      <InlineNotification
        kind="info"
        role="status"
        lowContrast
        hideCloseButton
        title="This screen is not available in this build."
      >
        <Link to={other.to}>{other.label}</Link>
      </InlineNotification>
    </div>
  );
}
