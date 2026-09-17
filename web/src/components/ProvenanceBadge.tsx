// The provenance badge (FR-10.2; F2 FR-2.20 as the FRD references it) — the ONE
// shared control every AI-suggested or specialist-entered value renders through
// from here on, now rendered on the **Carbon Design System** (`@carbon/react`
// `Tag` + `@carbon/icons-react`) in place of USWDS. Per-value provenance is the
// phase's whole point: the specialist must be able to tell, at a glance and by a
// screen reader, which values a machine proposed and which a person entered.
//
// ⚠️ THE `AttributedValue` DISCREPANCY, RECORDED HONESTLY (do not be misled):
// TechArch §1A.4 describes an `AttributedValue` component as "the only component
// permitted to render a case value," type-enforcing that a value cannot render
// without an `Attributed<T>` origin. **That component does NOT exist in this
// codebase.** Every screen renders a value inline (e.g. `entry.values.foo`)
// adjacent to a `ProvenanceBadge`, and the guarantee "a value with an origin is
// shown with its provenance" is held by per-screen code-review CONVENTION, not
// by the type system. This plan (07-06) deliberately does NOT invent that
// wrapper — building it is new scope the redesign was not asked to add. The
// actual, currently-shipped guarantee is therefore: *every value that has an
// origin is rendered with an adjacent `ProvenanceBadge`, verified per screen by
// review, never by the type system.* This comment exists so a future reader is
// not misled into believing a stronger, type-enforced guarantee exists than
// actually does.
//
// FOUR redundant, COLOUR-INDEPENDENT carriers (phase success criterion 2, WCAG
// 1.4.1 — information never conveyed by colour alone, FR-2.17). Each variant
// carries all four:
//   1. distinct TEXT ("AI-suggested" / "Specialist-entered" /
//      "Specialist-modified"), and
//   2. a distinct ICON — a genuinely different glyph per origin, not one glyph
//      recoloured: `Settings` (@carbon/icons-react) for AI, `User` for HUMAN,
//      rendered aria-hidden so AT ignores it (the visible label is the
//      accessible name), and
//   3. a distinct SHAPE/BORDER treatment — the AI variant a dashed 2px border,
//      the HUMAN variant a solid 2px border (one documented scoped CSS rule in
//      web/styles/app.scss under `.cargoexec-provenance-badge`; see the Carbon
//      register), and
//   4. a distinct token COLOUR — two visually-distinct Carbon `Tag` `type`
//      values (`purple` for AI, `gray` for HUMAN), an AA-documented Carbon pair,
//      never one colour re-used for both.
// So the badge stays legible in monochrome and through assistive technology by
// the adjacent visible text ALONE. ONLY Carbon tokens/`Tag` types are used for
// colour (FR-2.2; absence.spec.ts's scan forbids a raw hex or px literal
// anywhere in web/src) — the border-shape rule lives in web/styles/, which the
// scan excludes.

import { Tag } from '@carbon/react';
import { Settings, User } from '@carbon/icons-react';

export function ProvenanceBadge(props: {
  readonly origin: 'AI' | 'HUMAN';
  /** F12 FR-12.6: when true and origin='HUMAN', the label reads
   *  "Specialist-modified" instead of "Specialist-entered" — this label swap
   *  IS the FR-12.6 "Changed" marker (text + the existing distinct HUMAN icon);
   *  no second widget is introduced. A modified HUMAN value keeps the SAME
   *  icon/colour/border pair as a plain HUMAN one (the origin is genuinely HUMAN
   *  either way); only the text changes. Ignored when origin='AI'. Optional and
   *  defaulting to false, so every existing call site is unchanged. */
  readonly modified?: boolean;
}): JSX.Element {
  const isAi = props.origin === 'AI';
  const label = isAi
    ? 'AI-suggested'
    : props.modified === true
      ? 'Specialist-modified'
      : 'Specialist-entered';

  // Carrier 4 (colour): distinct AA-documented Carbon Tag types.
  // Carrier 3 (shape): a variant class app.scss turns into a dashed (AI) vs
  //   solid (HUMAN) 2px border — so the two are distinguishable with colour
  //   removed.
  // Carrier 2 (icon): a genuinely distinct glyph, aria-hidden (Carbon's Tag
  //   renderIcon renders it decoratively; the visible label is the name).
  const tagType = isAi ? 'purple' : 'gray';
  const variantClass = isAi
    ? 'cargoexec-provenance-badge cargoexec-provenance-badge--ai'
    : 'cargoexec-provenance-badge cargoexec-provenance-badge--human';
  const Icon = isAi ? Settings : User;

  return (
    <Tag type={tagType} renderIcon={Icon} className={variantClass}>
      {label}
    </Tag>
  );
}
