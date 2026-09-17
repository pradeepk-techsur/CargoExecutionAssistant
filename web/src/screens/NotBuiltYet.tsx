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
  // role="status" preserved (a polite notice, not an alert). Prose typography now
  // comes from Carbon's global type styles (@carbon/styles), so the container is a
  // plain element rather than `usa-prose`. Still NO disabled control, no "coming
  // soon" chip, no tooltip (UX Pattern 7 / FR-12.11).
  //
  // The "link to the OTHER nav destination" affordance is a react-router `Link`
  // and therefore an INTERACTIVE node. It must NOT be a child of the
  // `InlineNotification`: Carbon's notification runs `useNoInteractiveChildren`
  // and THROWS ("component should have no interactive child nodes") on any
  // interactive descendant — the exact defect plan 07-10 fixed for `ErrorSummary`
  // by moving its link list to a sibling. The same fix applies here: the
  // notification carries text only (its `title`), and the recovery `Link` is a
  // SIBLING paragraph beneath it, so the polite `role="status"` notice and the
  // no-orphan-screen affordance both survive without crashing the route.
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
      />
      <p>
        <Link to={other.to}>{other.label}</Link>
      </p>
    </div>
  );
}
