// The primary navigation (FR-2.7, UX §2).
//
// <nav aria-label="Primary"> containing NAV_ITEMS.map(...) AND NOTHING ELSE.
// The list is rendered from data so the DOM cannot disagree with the two-member
// NAV_ITEMS array; the active destination carries aria-current="page". Rendered
// only on authenticated screens (the reduced /sign-in shell has no nav at all).

import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems.js';

export function Nav(): JSX.Element {
  return (
    <nav aria-label="Primary" className="usa-nav">
      <ul className="usa-nav__primary usa-accordion">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="usa-nav__primary-item">
            {/* NavLink sets aria-current="page" on the active link by default,
                which is exactly FR-2.7's requirement — no manual aria-current. */}
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'usa-nav__link usa-current' : 'usa-nav__link'
              }
            >
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
