/**
 * FR-2.7 / UX 00-overview §2: the primary navigation contains EXACTLY two
 * destinations. A third item does not exist anywhere in the DOM — not disabled,
 * not hidden, not commented out: absent. This is criterion 5 of the phase and
 * the structural answer to PRD R-2's named scope risk.
 *
 * The set is expressed as data so its cardinality is a value a test can read
 * (`NAV_ITEMS.length === 2`), and Nav.tsx renders it with `.map` so the DOM can
 * never disagree with the data. Plan 02-09 adds the architecture assertion;
 * e2e/shell.spec.ts adds the browser one (`toHaveCount(2)`).
 *
 * Do NOT add a dashboard, reports, metrics, settings, administration, export,
 * search, user-menu or notifications entry here. Each would imply a capability
 * this product does not have.
 */
export const NAV_ITEMS = [
  { to: '/queue', label: 'Review queue' },
  { to: '/entries/new', label: 'New cargo entry' },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
