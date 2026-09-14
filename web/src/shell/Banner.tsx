// The USWDS government banner (FR-2.5), above the header on EVERY screen,
// including /sign-in. Its "Here's how you know" disclosure is keyboard-operable
// and expands INLINE (no popup — UX Pattern 10, iframe-safe).
//
// This is the STOCK `usa-banner` markup (FR-2.1) driven by the USWDS JS
// (/assets/js/uswds.min.js, loaded from index.html): USWDS owns the disclosure
// toggle, managing aria-expanded and the hidden content the WCAG-conformant way.
// React does NOT also control it — two controllers on one button fight and the
// toggle stops working. The initial `hidden` + `aria-expanded="false"` here is
// the collapsed default USWDS then takes over on mount.

import { useId } from 'react';

export function Banner(): JSX.Element {
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
              aria-expanded={false}
              aria-controls={contentId}
            >
              <span className="usa-banner__button-text">Here&rsquo;s how you know</span>
            </button>
          </div>
        </header>
        <div
          className="usa-banner__content usa-accordion__content"
          id={contentId}
          hidden
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
