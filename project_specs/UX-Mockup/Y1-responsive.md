## Y1: Responsive Considerations

**Platform:** web only, current mainstream desktop browsers, with a responsive layout usable at
tablet width. **No native mobile client** (NFR-12, PRD §10 #10). Mobile-width behaviour is
specified here because WCAG 2.1 AA reflow at 320 CSS px is a statutory requirement, not because
a phone is a target device (US-2.6, FR-2.19).

All breakpoints are USWDS grid breakpoints; no custom media queries or pixel values appear in
screen-level styles (FR-2.2).

| USWDS breakpoint | Width | Treated as |
|---|---|---|
| `desktop` | ≥ 1024 px | Primary working width |
| `tablet` | 640 – 1023 px | Fully supported working width |
| `mobile-lg` and below | < 640 px (down to 320 px) | Reflow correctness; usable, not optimised |

---

### Desktop (≥ 1024 px)

- **Shell:** USWDS banner, then a basic `usa-header` with the product name at left, the two
  primary nav links inline, and display name + "Sign out" in `usa-nav__secondary` at right.
- **Measure:** body content is constrained to the USWDS `grid-container` with a readable
  measure; long prose (the AI rationale, reason text) is capped at `measure-5` so lines stay
  legible.
- **Sign in:** form centred in `desktop:grid-col-4`.
- **Entry form:** single column at `desktop:grid-col-8`. **Fields are never placed side by
  side**, so the tab order, the visual order and the error-summary order can never disagree.
- **Queue:** full-width `usa-table` with all four columns visible.
- **Case detail:** single content column at `desktop:grid-col-8` with the
  `usa-in-page-navigation` rendered as a sticky side list at `desktop:grid-col-3`; the in-page
  nav follows the content in DOM order, so it is never a tab-order obstacle before the `h1`.
- **Comparison rows / audit value tables:** rendered as tables with all columns visible.
- **Decision actions:** the three buttons sit in one horizontal `usa-button-group` at equal
  width — equal weight is a layout property as well as a styling one.

### Tablet (640 – 1023 px)

- **Shell:** the header collapses to the USWDS menu button; the nav opens as an in-page slide
  panel containing exactly the same two links plus display name and "Sign out". No third item
  appears at any width.
- **Case detail:** the in-page navigation moves above the content as a plain list of links
  (still after the header and before the first `h2`).
- **Queue:** the table keeps all four columns; the "Why it is open" column takes the remaining
  width and wraps.
- **Entry form / decision forms:** unchanged single column, full width of the container.
- **Decision actions:** the three buttons remain horizontal if they fit at equal width;
  otherwise they stack (see below). They always share one treatment.

### Mobile / narrow (< 640 px, down to 320 px)

- **Everything is a single column.** No content is hidden, collapsed behind a disclosure, or
  moved off-screen; no function is lost (WCAG 1.4.10).
- **Queue table reflow:** the `usa-table` becomes one **stacked block per case**, each block
  retaining the four labelled data points:

```
┌────────────────────────────────────────────┐
│ Case          CE-2026-000137   ← the link  │
│ Received      11 September 2026, 2:32 p.m. │
│ Entry number  abc12345678                  │
│ Why it is open  Enter the port of entry    │
│                 code. and 2 more (3 rules) │
└────────────────────────────────────────────┘
```
  The element remains a real `<table>` with its `<caption>` and header cells associated to each
  data cell, so screen-reader table semantics and the programmatic row count survive the
  reflow. Rows never become pointer-only click targets.

- **Comparison rows (case detail) reflow** to stacked field blocks, keeping each provenance
  badge adjacent to its value:

```
Port of entry code
  You submitted   Not provided
  The AI suggests 2704  [⚙ AI-suggested]
  Addresses: "Enter the port of entry code."   (RIV-030)
```

- **Audit value tables reflow** to stacked per-field blocks — Field, Before (badged), After
  (badged), Origin — so no before/after pairing is ever separated from its origin.
- **Decision actions stack vertically at full width**, in the same DOM order
  (Approve → Edit and approve → Reject), with identical treatment. Stacking must not introduce
  emphasis asymmetry (US-12.1).
- **Provenance badges** wrap onto their own line beneath the value rather than truncating; a
  badge is never abbreviated to an icon alone, because the text label is a required carrier.
- **Long text** (rationale, reason) wraps; it is never truncated with an ellipsis and never
  collapsed behind "show more" (FR-10.4, FR-14.5).

### 200% zoom

- At 200% browser zoom on a 1280 px viewport (≈ 640 CSS px) the tablet layout applies; no
  function or content is lost and **body content does not scroll horizontally**.
- Sticky elements are limited to the in-page nav at desktop only, and it releases at tablet
  width so it can never cover content at high zoom.
- Text resizes with the page; no fixed-height containers clip text; character counters, hints
  and error messages remain visible and associated.

### Motion and reduced motion

- The product has almost no motion by design. The only transitions are the banner disclosure,
  the mobile nav panel, the modal, and the loading indicator.
- With `prefers-reduced-motion: reduce`, transitions are disabled or reduced to instantaneous
  state changes; the loading indicator becomes a static "Loading…" status.
- **Nothing relies on motion to be understood**, and nothing auto-animates for longer than
  5 seconds (US-2.6, FR-2.21).

### Performance budget (felt as responsiveness)

- Sign-in, entry form, queue, case detail and audit trail each render within **2 seconds**
  under demonstration load (NFR-10, FR-2.23).
- A load exceeding 300 ms shows the USWDS loading indicator with `aria-busy="true"` on the
  loading region and an announced "Loading…".
- AI recommendation generation is permitted to exceed the budget; it shows accessible progress
  **without freezing the interface or blocking navigation**, and `aria-busy` is scoped to the
  recommendation region only (US-10.5).
- USWDS styles, fonts and the icon sprite are bundled and self-served, so first paint does not
  depend on an external network — which also makes the layout stable inside the preview iframe
  (FR-2.3).

### Iframe embedding

- The application is embedded in a preview iframe and is designed to be **width-responsive to
  its container**, not to the top-level window: layout decisions use the USWDS grid inside the
  document, never `window.top` dimensions or framing checks.
- No popups, new windows, `target="_blank"`, or top-level navigation is used anywhere
  (see `Y0-patterns.md` Pattern 10).
- Anchor navigation (`#audit-trail`), focus management and scroll all operate within the
  embedded document.

---
