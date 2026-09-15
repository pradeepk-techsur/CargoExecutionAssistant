// The provenance badge (FR-10.2; F2 FR-2.20 as the FRD references it) — the ONE
// shared control every AI-suggested or specialist-entered value renders through
// from here on. Per-value provenance is the phase's whole point: the specialist
// must be able to tell, at a glance and by a screen reader, which values a
// machine proposed and which a person entered.
//
// The two variants differ in MORE THAN COLOUR (phase success criterion 2, WCAG
// 1.4.1 — information not conveyed by colour alone). Each variant carries:
//   - distinct TEXT ("AI-suggested" vs "Specialist-entered"), and
//   - a distinct ICON (a different USWDS sprite symbol, not the same glyph
//     recoloured — `settings` for AI, `person` for HUMAN, both confirmed present
//     in web/public/assets/img/sprite.svg), and
//   - a distinct USWDS utility-token colour pair.
// So the badge is legible in monochrome and through assistive technology by the
// adjacent text alone; the icon's <title> makes its meaning available to AT too.
//
// ONLY USWDS design tokens are used for colour (FR-2.2; absence.spec.ts's scan
// forbids a raw hex or px literal anywhere in web/src). bg-primary-darker /
// text-white and bg-base-lighter / text-ink are USWDS utility classes present in
// the compiled bundle; each pair clears AA contrast for its variant.

export function ProvenanceBadge(props: {
  readonly origin: 'AI' | 'HUMAN';
}): JSX.Element {
  const isAi = props.origin === 'AI';
  const label = isAi ? 'AI-suggested' : 'Specialist-entered';
  const iconId = isAi ? 'settings' : 'person';
  const tokenClasses = isAi
    ? 'bg-primary-darker text-white'
    : 'bg-base-lighter text-ink';

  return (
    <span className={`usa-tag ${tokenClasses}`}>
      <svg className="usa-icon" aria-hidden="true" focusable="false">
        <title>{label}</title>
        <use xlinkHref={`/assets/img/sprite.svg#${iconId}`} />
      </svg>{' '}
      {label}
    </span>
  );
}
