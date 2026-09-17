// NotFound — "Page not found" inside the shell (FR-2.4 validation, US-2.2).
// One h1, focus moved to it, title announced politely, and a link back to
// /queue so the specialist is never stranded on a dead route.

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useScreenFocus } from '../shell/useScreenFocus.js';

export function NotFound(): JSX.Element {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useScreenFocus({ title: 'Page not found', h1Ref });

  // No alert/status role: a dead route is not an error condition to announce —
  // it is plain prose (h1 + paragraph + a link back to /queue). Prose typography
  // now comes from Carbon's global type styles (@carbon/styles); only the
  // container class changes from `usa-prose` to `cargoexec-prose`. Focus is
  // still moved to the h1 and the title announced politely on mount (unchanged
  // useScreenFocus).
  return (
    <div className="cargoexec-prose">
      <h1 tabIndex={-1} ref={h1Ref}>
        Page not found
      </h1>
      <p>The page you were looking for does not exist in this application.</p>
      <p>
        <Link to="/queue">Go to the review queue</Link>
      </p>
    </div>
  );
}
