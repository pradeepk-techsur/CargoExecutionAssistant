// The application shell (TechArch §7.4, §1A.4; UX Screen-00 wireframe).
//
// Shell renders the persistent frame ONCE, in this exact DOM order:
//   1. Banner        — government banner, above the header, on EVERY screen
//   2. SkipLink      — usa-skipnav, the first focusable element, → #main-content
//   3. Header        — role="banner"; reduced on /sign-in (no nav/name/sign-out)
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
      <Banner />
      <SkipLink />
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
