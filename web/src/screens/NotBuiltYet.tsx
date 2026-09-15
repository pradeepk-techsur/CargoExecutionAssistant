// NotBuiltYet — the transitional placeholder for the two navigation
// destinations owned by later phases: /entries/new is F6 (Phase 3) and /queue
// is F8 (Phase 4). A nav link to a route that 404s would be a broken shell and
// would fail UX §2's no-orphan-screen invariant, so both routes render this
// screen inside the shell with the correct h1, the correct document title, and
// one usa-alert--info.
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

  return (
    <div className="usa-prose">
      <h1 tabIndex={-1} ref={h1Ref}>
        {props.title}
      </h1>
      <div className="usa-alert usa-alert--info" role="status">
        <div className="usa-alert__body">
          <p className="usa-alert__text">
            This screen is not available in this build.{' '}
            <Link to={other.to}>{other.label}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
