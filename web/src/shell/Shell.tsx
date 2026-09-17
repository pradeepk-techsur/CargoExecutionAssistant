// The application shell (TechArch §7.4, §1A.4; UX Screen-00 wireframe).
//
// The frame is now rendered on the Carbon Design System (SkipLink/Banner/
// Header/Footer are Carbon-based); the landmark structure and DOM order are
// UNCHANGED — only the visual system underneath moved from USWDS to Carbon.
//
// Shell renders the persistent frame ONCE, in this DOM order:
//   1. SkipLink      — Carbon SkipToContent, THE FIRST FOCUSABLE ELEMENT, → #main-content
//   2. Banner        — government banner, above the header, on EVERY screen
//   3. Header        — role="banner"; reduced on /sign-in (no nav/name/sign-out)
//
// DEVIATION (Rule 1) from the plan's listed order (Banner #1, SkipLink #2): the
// plan's own stated truth — "the skip link is the first focusable element on
// every page" (FR-2.4, US-2.2, and this plan's must_haves + success criteria) —
// requires the skip link to precede the banner's focusable disclosure button.
// The banner renders visually first via source-order; the skip link is hidden
// until focused, so it takes no visual space above the banner. The invariant
// wins over the illustrative ordering.
//   4. Nav           — via Header, only when NOT reduced (<nav aria-label="Primary">)
//   5. main          — id="main-content", the routing outlet
//   6. Footer        — role="contentinfo" + usa-identifier
//   7. LiveRegions   — mounted by AnnounceProvider above the router (see main.tsx)
//
// EXACTLY ONE of each landmark per screen: one banner, one main, one
// contentinfo, and one nav ONLY when authenticated. Nothing outside the shell
// renders a second landmark.

import type { SpecialistDto } from '@cargoexec/contract';
import { Outlet } from 'react-router-dom';
import { Banner } from './Banner.js';
import { SkipLink } from './SkipLink.js';
import { Header } from './Header.js';
import { Footer } from './Footer.js';

export interface ShellProps {
  /** Reduced shell for /sign-in: no nav, no display name, no sign-out. */
  readonly reduced?: boolean;
  readonly specialist?: SpecialistDto | null;
  readonly onSignOut?: () => void;
  /** Optional explicit children; defaults to the router <Outlet>. */
  readonly children?: React.ReactNode;
}

export function Shell(props: ShellProps): JSX.Element {
  const reduced = props.reduced ?? false;
  const specialist = props.specialist ?? null;

  return (
    <>
      <SkipLink />
      <Banner />
      <Header
        reduced={reduced}
        specialist={specialist}
        {...(props.onSignOut !== undefined ? { onSignOut: props.onSignOut } : {})}
      />
      <main id="main-content" tabIndex={-1}>
        <div className="grid-container">
          {props.children ?? <Outlet />}
        </div>
      </main>
      <Footer />
    </>
  );
}
