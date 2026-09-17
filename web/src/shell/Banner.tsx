// The U.S. government official-site banner (FR-2.5), above the header on EVERY
// screen, including /sign-in. Its "Here's how you know" disclosure is
// keyboard-operable and expands INLINE (no popup — UX Pattern 10, iframe-safe).
//
// Carbon has NO government-banner equivalent (it is a federal statutory element
// Carbon was never designed to include), and USWDS's own JS no longer drives the
// disclosure. So this is a DOCUMENTED Carbon-conformant COMPOSITION: Carbon
// layout primitives (`Grid`/`Column`) and a Carbon `Button` for the toggle,
// plus a small amount of project-owned React state managing `aria-expanded`.
// This is the SAME accordion-disclosure pattern the register already documented
// for USWDS's banner, re-implemented because Carbon does not ship the banner
// itself — NOT a new bespoke interactive widget in the sense FR-2.1 prohibits.
//
// Because React now OWNS the toggle (there is no USWDS JS to fight with), the
// button's aria-expanded reflects component state, aria-controls points at the
// content region, and the content region's `hidden` is driven by the same
// state — the WCAG-conformant disclosure contract. Every textual/structural
// detail is preserved unchanged: the flag image (aria-hidden="true"), the exact
// two guidance paragraphs, and inline (never popup) expansion.

import { useId, useState } from 'react';
import { Button } from '@carbon/react';

export function Banner(): JSX.Element {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className="cargoexec-banner"
      aria-label="Official website of the United States government"
    >
      <div className="cargoexec-banner__inner">
        <img
          aria-hidden="true"
          className="cargoexec-banner__flag"
          src="/assets/img/us_flag_small.png"
          alt=""
        />
        <p className="cargoexec-banner__text">
          An official website of the United States government
        </p>
        <Button
          kind="ghost"
          size="sm"
          className="cargoexec-banner__button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((e) => !e)}
        >
          Here&rsquo;s how you know
        </Button>
      </div>

      <div className="cargoexec-banner__content" id={contentId} hidden={!expanded}>
        <div className="cargoexec-banner__guidance">
          <p className="cargoexec-banner__body">
            <strong>Official websites use .gov</strong>
            <br />A <strong>.gov</strong> website belongs to an official
            government organization in the United States.
          </p>
          <p className="cargoexec-banner__body">
            <strong>Secure .gov websites use HTTPS</strong>
            <br />A <strong>lock</strong> or <strong>https://</strong> means
            you&rsquo;ve safely connected to the .gov website.
          </p>
        </div>
      </div>
    </section>
  );
}
