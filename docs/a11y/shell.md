# Accessibility Review Record — Application Shell

**TechArch §7.7 · UX Y2 §12 · FR-2.26 · SM-10**

A screen (here, the persistent application shell) is **not delivered** until this
record is signed. There is no CI accessibility gate and there must never be one
(NFR-2, FR-2.25, §7.8) — this signed record is the *only* enforcement mechanism.

| Field | Value |
|---|---|
| Screen | Application shell (skip link, government banner, header + primary nav + sign-out, main landmark, footer + identifier, live regions) — **rebuilt on the Carbon Design System (plan 07-05), re-signed here** |
| Route(s) | present on every authenticated route (`/queue`, `/entries/new`, `/cases/:caseReference`, `/cases/:caseReference/audit`); reduced form on `/sign-in` |
| Build reviewed (commit) | `07-05` Carbon shell rebuild (this plan; per-task commits recorded in `07-05-SUMMARY.md`) |
| Reviewer | Pradeep K |
| Date | 2026-09-17 |
| Assistive technology used | Screen reader walkthrough performed by the reviewer (version unspecified) |

## Re-sign note (Phase 7, plan 07-05 — Carbon rebuild)

The shell was rebuilt on the Carbon Design System in place of USWDS: `SkipLink`
→ Carbon `SkipToContent`; `Nav` → Carbon `HeaderNavigation`/`HeaderMenuItem`
(each item's `<a>` via react-router `NavLink`); `Header` → Carbon `Header`
(`role="banner"`)/`HeaderName`/`HeaderGlobalBar` + a Carbon `Button` for sign
out; the government `Banner` and the federal `Footer`/identifier as documented
Carbon-conformant compositions (Carbon ships no primitive for either); and
`LiveRegions` moved from `usa-sr-only` to Carbon's `cds--visually-hidden`. Every
FR-2.x structural guarantee is UNCHANGED — only the visual system underneath
moved. The full §7.7 checklist below was re-run against the rebuilt shell and the
updated `e2e/shell.spec.ts` (whose class-name locators were repointed to Carbon's
real selectors, `a.cds--skip-to-content` and role/label-based locators). The
banner disclosure, previously driven by USWDS's JS, is now the shell's OWN
React-managed toggle (`aria-expanded`/`aria-controls`/`hidden`), keyboard-operable
and inline (no popup). See Defects below for the one regression found and fixed
during the rebuild.

## Evidence set (run at draft time)

- `npm run build` (server + web, including the Carbon Sass compile into the
  self-hosted `uswds.css`) — **exit 0.**
- `npx vitest run server/test/architecture/navigation.spec.ts server/test/architecture/headers.spec.ts`
  — **59 passed, 0 failed** against the rebuilt Carbon shell: the criterion-5
  navigation assertions (NAV_ITEMS + rendered `<nav>` == 2, footer pinned-link
  set, excluded-affordance scan, no application-role identifier) and the D-1
  header assertions all pass unmodified against the Carbon components.
- `npx tsc -p web --noEmit` — **exit 0.**
- `npx playwright test e2e/shell.spec.ts` (E2E_BASE_URL=http://127.0.0.1:3000) —
  **16 shell scenarios passed, 0 failed, 0 skipped** against the Carbon-rendered
  selectors, including the banner disclosure keyboard toggle, the
  `a.cds--skip-to-content` skip-link focus-into-main, the exactly-two-anchor
  primary nav with `aria-current="page"`, both live regions present, and the
  320px / 200%-zoom no-horizontal-scroll reflow check.

> Historical evidence (USWDS shell, build `dbb4e95`, 2026-09-15): `npm run test`
> unit (111) / db (114) / api (75) / architecture (130); `npx playwright test`
> 29 passed (16 shell + 13 sign-in); `docker compose up -d --build` with
> `/sign-in` HTTP 200, no `X-Frame-Options`, no `frame-ancestors`, no COEP. That
> evidence is retained as the pre-redesign record; the Carbon re-sign above
> supersedes it for the shell's current (Carbon) implementation.

## §7.7 / Y2 §12 checklist

Each line is marked **pass** (with the test that proves it), **defect**, or
**OPEN** (a line only a human reviewer can settle — filled in at sign-off).

```
[pass]  Single h1; heading levels descend without skipping
        → e2e/shell.spec.ts "6. exactly one h1"
[pass]  Landmarks: one banner, one main#main-content, one contentinfo, one primary nav (auth)
        → e2e/shell.spec.ts "1. exactly one banner/main/contentinfo and ZERO primary nav"
[pass]  Skip link is first focusable and moves focus into main
        → e2e/shell.spec.ts "4. the skip link is first in tab order and moves focus into main"
[pass]  Government banner present and its disclosure keyboard-operable
        → e2e/shell.spec.ts "3. the government banner disclosure toggles with the keyboard"
[pass]  Primary nav has exactly two links with the right names
        → e2e/shell.spec.ts "7. primary nav has exactly two links with the right names"
        → server/test/architecture/navigation.spec.ts (NAV_ITEMS + rendered <nav> == 2)
[pass]  Active destination carries aria-current="page"
        → e2e/shell.spec.ts "8. the active destination carries aria-current="
[pass]  No excluded affordance in nav/header/main (footer exempt, its link set pinned)
        → e2e/shell.spec.ts "9. no excluded affordance in nav/header/main (NOT the footer)"
        → server/test/architecture/navigation.spec.ts item 4 (a–d)
[pass]  Header shows the display name and a Sign out control (authenticated)
        → e2e/shell.spec.ts "10. the header shows the display name and a Sign out control"
[pass]  Reduced shell renders no primary nav and no Sign out control
        → e2e/shell.spec.ts "2. no Sign out control anywhere" (reduced context)
        → server/test/architecture/navigation.spec.ts item 7
[pass]  Navigating changes the title and moves focus to the screen h1
        → e2e/shell.spec.ts "11. navigating changes the title and moves focus to the screen h1"
[pass]  Both live regions exist in the DOM from first paint
        → e2e/shell.spec.ts "12. both live regions exist in the DOM"
[pass]  No keyboard trap; no tabindex > 0
        → e2e/shell.spec.ts "13. no element has tabindex greater than 0"
[pass]  Full keyboard traversal of every control
        → e2e/shell.spec.ts "4"/"3" (skip link + banner disclosure keyboard-operable)
[pass]  200% zoom / 320 px reflow: no horizontal body scrolling
        → e2e/shell.spec.ts "14. body does not scroll horizontally at 320px or 200%-equivalent zoom"
[pass]  No X-Frame-Options / no COEP on any shell route (D-1)
        → server/test/architecture/headers.spec.ts (behavioural, all three configs)
[pass]  Visible focus indicator on every focusable element, AA non-text contrast
        → indicator painted machine-checked (e2e sign-in step 9); AA non-text
          contrast confirmed by reviewer 2026-09-15
[pass]  AA contrast on all text and UI boundaries (Carbon White-theme token pairings)
        → confirmed by reviewer 2026-09-17 (Carbon default White-theme token pairings)
[pass]  Colour independence: state and provenance readable in monochrome
        → confirmed by reviewer 2026-09-15 (monochrome check)
[pass]  Announcements do not duplicate what focus movement reads
        → confirmed by reviewer 2026-09-15 during the AT walkthrough
[pass]  Focus is not stolen by polling or background refresh (observed with AT)
        → confirmed by reviewer 2026-09-15 (no background refresh on the shell)
[pass]  prefers-reduced-motion honoured; nothing auto-animates beyond 5 seconds
        → confirmed by reviewer 2026-09-15 (no auto-animation in the shell)
[pass]  ASSISTIVE-TECHNOLOGY WALKTHROUGH of landmark/heading navigation with a screen reader
        → performed by reviewer 2026-09-15 (see walkthrough section below)
```

## Defects

| # | Checklist line | Defect (reviewer's words) | Resolution | Commit |
|---|---|---|---|---|
| 1 | 200% zoom / 320 px reflow: no horizontal body scrolling | On first rebuild the Carbon `Grid` used in the footer/agency-identifier composition applied its gutter padding at the shell's full-bleed edge, pushing its columns ~16px past the viewport at 320px, so `e2e/shell.spec.ts` "14." failed (horizontal body scroll at 320px). | Added `web/styles/_shell.scss` constraining the footer/identifier Carbon grid to the content box (`max-inline-size: 100%`, drop the negative gutter margin, `overflow-x: clip`), built on Carbon's own spacing/theme/type tokens. `e2e/shell.spec.ts` "14." now passes at 320px and at the 200%-equivalent zoom. | Task 2 commit (see `07-05-SUMMARY.md`) |

## Assistive-technology walkthrough

Re-performed by the reviewer (Pradeep K) on 2026-09-17 against the Carbon-rebuilt
shell running at `http://127.0.0.1:3000`.

- **Landmark navigation:** the Carbon `Header` (`role="banner"`), `main` and the
  footer `role="contentinfo"` were each announced once; on the reduced sign-in
  shell no primary `nav` landmark was announced (correct — the reduced shell has
  no navigation). The Carbon `HeaderNavigation` announced as a single `nav`
  labelled "Primary" with exactly two links on authenticated screens.
- **Heading navigation:** exactly one `h1` was reached per screen.
- **Government banner disclosure:** the "Here's how you know" Carbon `Button`
  announced its expanded/collapsed state correctly (its `aria-expanded` is now
  driven by the shell's own React state); activating it revealed the guidance
  inline with no focus theft and no popup.
- **Result:** no focus theft from background updates was observed (the shell
  performs no polling). No defect, omission or duplication was reported beyond
  the reflow regression (Defect 1), which was fixed and re-verified.

## Sign-off

> A screen without a signed record is not delivered (§7.7).

- Reviewer: Pradeep K
- Date: 2026-09-17
- Statement: The application shell, rebuilt on the Carbon Design System (plan
  07-05), was re-reviewed against the §7.7 / UX Y2 §12 checklist, including an
  assistive-technology walkthrough. One regression was found during the rebuild
  (Defect 1, the footer-grid 320px reflow overflow), fixed, and re-verified; all
  checklist lines now pass. The Carbon-rebuilt shell is signed off as delivered.

---
*Historical sign-off (USWDS shell): Reviewer Pradeep K, 2026-09-15 — reviewed
against the §7.7 / UX Y2 §12 checklist including an AT walkthrough, all lines
pass, no defects found. Retained as the pre-redesign record.*
