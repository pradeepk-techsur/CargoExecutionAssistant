// The skip link (FR-2.4, Y2 §2).
//
// `usa-skipnav` targeting #main-content. It is the FIRST focusable element on
// every page (rendered first, before the header), so a keyboard user's first
// Tab lands here and Enter moves focus INTO main. The USWDS `usa-skipnav` class
// keeps it visually hidden until focused.

export function SkipLink(): JSX.Element {
  return (
    <a className="usa-skipnav" href="#main-content">
      Skip to main content
    </a>
  );
}
