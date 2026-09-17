// The product header (FR-2.6, F1 FR-1.15, UX Screen-00), rebuilt on the Carbon
// Design System UI Shell in place of USWDS.
//
// role="banner" with the product name linking to /queue. On authenticated
// screens it also shows the signed-in specialist's display name and a "Sign
// out" control wired to onSignOut, and renders the primary Nav. With `reduced`
// (the /sign-in shell) it shows the product name ONLY: no navigation, no
// display name, no sign-out (FR-2.6). No user menu, settings gear, notifications
// bell, search box, theme toggle or environment badge appears — each would
// imply a capability this product does not have (UX §2).
//
// Carbon's `Header` renders a plain `<header class="cds--header">` and does NOT
// emit role="banner" itself (verified against the installed component), so
// role="banner" is passed explicitly — FR-2.4 requires exactly one
// <header role="banner">. `HeaderName` (with prefix="" so Carbon's default
// "IBM" prefix is suppressed) supplies the product-name link via react-router's
// Link through Carbon's polymorphic `as` prop. The display name is a plain span
// and "Sign out" is a Carbon ghost `Button` wired to the SAME onSignOut prop.

import type { ComponentProps, ComponentType } from 'react';
import type { SpecialistDto } from '@cargoexec/contract';
import { Link } from 'react-router-dom';
import { Header as CarbonHeader, HeaderName, HeaderGlobalBar, Button } from '@carbon/react';
import { Nav } from './Nav.js';

export interface HeaderProps {
  readonly reduced: boolean;
  readonly specialist: SpecialistDto | null;
  readonly onSignOut?: () => void;
}

// Carbon's `Header` renders a plain `<header>` and forwards unknown props via
// `...rest`, but its published prop type does not declare the ARIA `role`
// attribute. FR-2.4 requires exactly one `<header role="banner">`, so the
// component is re-typed to accept the standard `role` attribute here. This keeps
// `role` as a JSX ATTRIBUTE (`role="banner"`) rather than an object-literal
// `role:` key — the former is the documented ARIA-markup exclusion in
// server/test/architecture/navigation.spec.ts's application-role scan; an
// object-literal `role:` would (correctly) trip that scan.
const BannerHeader = CarbonHeader as ComponentType<
  ComponentProps<typeof CarbonHeader> & { role?: string }
>;

export function Header(props: HeaderProps): JSX.Element {
  const { reduced, specialist, onSignOut } = props;

  return (
    <BannerHeader role="banner" aria-label="CargoExec">
      <HeaderName as={Link} to="/queue" prefix="">
        CargoExec
      </HeaderName>

      {!reduced && (
        <>
          <Nav />
          {specialist !== null && (
            <HeaderGlobalBar>
              <span className="cargoexec-signed-in-name">
                {specialist.display_name}
              </span>
              <Button kind="ghost" size="sm" onClick={onSignOut}>
                Sign out
              </Button>
            </HeaderGlobalBar>
          )}
        </>
      )}
    </BannerHeader>
  );
}
