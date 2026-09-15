// The product header (FR-2.6, F1 FR-1.15, UX Screen-00).
//
// role="banner" with the product name linking to /queue. On authenticated
// screens it also shows the signed-in specialist's display name and a "Sign
// out" control wired to onSignOut, and renders the primary Nav. With `reduced`
// (the /sign-in shell) it shows the product name ONLY: no navigation, no
// display name, no sign-out (FR-2.6). No user menu, settings gear, notifications
// bell, search box, theme toggle or environment badge appears — each would
// imply a capability this product does not have (UX §2).

import type { SpecialistDto } from '@cargoexec/contract';
import { Link } from 'react-router-dom';
import { Nav } from './Nav.js';

export interface HeaderProps {
  readonly reduced: boolean;
  readonly specialist: SpecialistDto | null;
  readonly onSignOut?: () => void;
}

export function Header(props: HeaderProps): JSX.Element {
  const { reduced, specialist, onSignOut } = props;

  return (
    <header className="usa-header usa-header--basic" role="banner">
      <div className="usa-nav-container">
        <div className="usa-navbar">
          <span className="usa-logo">
            <em className="usa-logo__text">
              <Link to="/queue">CargoExec</Link>
            </em>
          </span>
        </div>

        {!reduced && (
          <>
            <Nav />
            {specialist !== null && (
              <div className="usa-nav__secondary">
                <span className="cargoexec-signed-in-name">
                  {specialist.display_name}
                </span>
                <button
                  type="button"
                  className="usa-button usa-button--unstyled"
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
