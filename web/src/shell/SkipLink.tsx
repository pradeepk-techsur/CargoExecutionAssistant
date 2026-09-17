// The skip link (FR-2.4, Y2 §2).
//
// Carbon ships `SkipToContent` precisely for this purpose (it is part of the
// UI Shell). It renders an `<a class="cds--skip-to-content" href="#main-content">`
// that is visually hidden until focused, exactly the affordance `usa-skipnav`
// provided under USWDS. It is the FIRST focusable element on every page
// (rendered first, before the banner and header), so a keyboard user's first
// Tab lands here and Enter moves focus INTO main (#main-content).

import { SkipToContent } from '@carbon/react';

export function SkipLink(): JSX.Element {
  return <SkipToContent href="#main-content">Skip to main content</SkipToContent>;
}
