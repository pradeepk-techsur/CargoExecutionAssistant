// The USWDS government banner (FR-2.5), above the header on EVERY screen,
// including /sign-in. Its "Here's how you know" disclosure is keyboard-operable
// and expands INLINE (no popup — UX Pattern 10, iframe-safe): the shell never
// depends on window.top and opens no new window.
//
// This is a documented USWDS-conformant composition of the stock `usa-banner`
// markup (FR-2.1); the disclosure toggle is wired in React rather than relying
// on the USWDS JS so its behaviour is deterministic under test.

import { useId, useState } from 'react';

export function Banner(): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <section
      className="usa-banner"
      aria-label="Official website of the United States government"
    >
      <div className="usa-accordion">
        <header className="usa-banner__header">
          <div className="usa-banner__inner">
            <div className="grid-col-auto">
              <img
                aria-hidden="true"
                className="usa-banner__header-flag"
                src="/assets/img/us_flag_small.png"
                alt=""
              />
            </div>
            <div className="grid-col-fill tablet:grid-col-auto">
              <p className="usa-banner__header-text">
                An official website of the United States government
              </p>
              <p className="usa-banner__header-action">Here&rsquo;s how you know</p>
            </div>
            <button
              type="button"
              className="usa-accordion__button usa-banner__button"
              aria-expanded={expanded}
              aria-controls={contentId}
              onClick={() => setExpanded((v) => !v)}
            >
              <span className="usa-banner__button-text">Here&rsquo;s how you know</span>
            </button>
          </div>
        </header>
        <div
          className="usa-banner__content usa-accordion__content"
          id={contentId}
          hidden={!expanded}
        >
          <div className="grid-row grid-gap-lg">
            <div className="usa-banner__guidance tablet:grid-col-6">
              <p className="usa-banner__body">
                <strong>Official websites use .gov</strong>
                <br />A <strong>.gov</strong> website belongs to an official
                government organization in the United States.
              </p>
            </div>
            <div className="usa-banner__guidance tablet:grid-col-6">
              <p className="usa-banner__body">
                <strong>Secure .gov websites use HTTPS</strong>
                <br />A <strong>lock</strong> or <strong>https://</strong> means
                you&rsquo;ve safely connected to the .gov website.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
