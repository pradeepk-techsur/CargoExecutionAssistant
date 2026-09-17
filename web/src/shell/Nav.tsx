// The primary navigation (FR-2.7, UX §2).
//
// <nav aria-label="Primary"> containing NAV_ITEMS.map(...) AND NOTHING ELSE.
// The list is rendered from data so the DOM cannot disagree with the two-member
// NAV_ITEMS array; the active destination carries aria-current="page". Rendered
// only on authenticated screens (the reduced /sign-in shell has no nav at all).
//
// Carbon's `HeaderNavigation` renders exactly `<nav aria-label="…"><ul>…</ul></nav>`
// (verified against the installed component) and works standalone — it does not
// require Carbon's own `Header` as a parent. Each destination is a Carbon
// `HeaderMenuItem` whose underlying `<a>` is supplied by react-router's
// `NavLink` via Carbon's polymorphic `as` prop, so `aria-current="page"` is set
// on the active item automatically — exactly FR-2.7's requirement, unchanged
// from the USWDS implementation; only the surrounding markup moved to Carbon.

import { NavLink } from 'react-router-dom';
import { HeaderNavigation, HeaderMenuItem } from '@carbon/react';
import { NAV_ITEMS } from './navItems.js';

export function Nav(): JSX.Element {
  return (
    <HeaderNavigation aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        // `as={NavLink}` renders the item's <a> through react-router, which sets
        // aria-current="page" on the active link by default — no manual
        // aria-current. The DOM stays <nav aria-label="Primary"> with exactly
        // two anchors (server/test/architecture/navigation.spec.ts, unchanged).
        <HeaderMenuItem key={item.to} as={NavLink} to={item.to}>
          {item.label}
        </HeaderMenuItem>
      ))}
    </HeaderNavigation>
  );
}
