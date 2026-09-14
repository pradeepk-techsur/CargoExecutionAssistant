// The footer (FR-2.4): usa-footer--slim + usa-identifier, role="contentinfo".
//
// AFFORDANCE-SCAN EXEMPTION (auditable, not a blind spot). The
// <excluded_affordance_scan> deliberately EXCLUDES the footer[role="contentinfo"]
// subtree from the criterion-5 scan, because the USWDS `usa-identifier`
// required-links row is FEDERAL CONFORMANCE MARKUP whose link set is fixed by
// USWDS — it includes "Performance reports" — and is NOT a product capability.
// To keep the exemption auditable rather than a convenient blind spot, the
// identifier's link set is PINNED EXPLICITLY here, below.
//
// NOTE: "Performance reports" is a STATUTORY identifier link, not a product
// reporting surface. PRD §10 #5 excludes the latter; this is exactly why the
// footer is exempt from the affordance scan rather than the scan being weakened
// to accommodate it. None of these links has a destination in a demonstration
// build (each is href="#").

/** The seven USWDS-standard required-links, pinned so the exemption is auditable. */
const IDENTIFIER_LINKS: ReadonlyArray<{ label: string }> = [
  { label: 'About CBP' },
  { label: 'Accessibility statement' },
  { label: 'FOIA requests' },
  { label: 'No FEAR Act data' },
  { label: 'Office of the Inspector General' },
  { label: 'Performance reports' }, // statutory identifier link, NOT a product report surface
  { label: 'Privacy policy' },
];

export function Footer(): JSX.Element {
  return (
    <>
      <footer className="usa-footer usa-footer--slim" role="contentinfo">
        <div className="usa-footer__primary-section">
          <div className="usa-footer__primary-container grid-row">
            <div className="mobile-lg:grid-col-8">
              <p className="usa-footer__logo-heading">
                CargoExec — Cargo Exception Resolution
              </p>
            </div>
          </div>
        </div>
      </footer>

      <div className="usa-identifier">
        <section
          className="usa-identifier__section usa-identifier__section--masthead"
          aria-label="Agency identifier"
        >
          <div className="usa-identifier__container">
            <div className="usa-identifier__identity">
              <p className="usa-identifier__identity-domain">cbp.gov</p>
              <p className="usa-identifier__identity-disclaimer">
                An official website of the{' '}
                <span>U.S. Customs and Border Protection</span>
              </p>
            </div>
          </div>
        </section>
        <nav
          className="usa-identifier__section usa-identifier__section--required-links"
          aria-label="Important links"
        >
          <div className="usa-identifier__container">
            <ul className="usa-identifier__required-links-list">
              {IDENTIFIER_LINKS.map(({ label }) => (
                <li key={label} className="usa-identifier__required-links-item">
                  {/* Federal conformance markup: no destination in a demo build. */}
                  <a href="#" className="usa-identifier__required-link usa-link">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}
