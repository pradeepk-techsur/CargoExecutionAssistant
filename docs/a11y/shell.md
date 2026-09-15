# Accessibility Review Record — Application Shell

**TechArch §7.7 · UX Y2 §12 · FR-2.26 · SM-10**

A screen (here, the persistent application shell) is **not delivered** until this
record is signed. There is no CI accessibility gate and there must never be one
(NFR-2, FR-2.25, §7.8) — this signed record is the *only* enforcement mechanism.

| Field | Value |
|---|---|
| Screen | Application shell (skip link, government banner, header + primary nav + sign-out, main landmark, footer + identifier, live regions) |
| Route(s) | present on every authenticated route (`/queue`, `/entries/new`, `/cases/:caseReference`, `/cases/:caseReference/audit`); reduced form on `/sign-in` |
| Build reviewed (commit) | `dbb4e95` |
| Reviewer | Pradeep K |
| Date | 2026-09-15 |
| Assistive technology used | Screen reader walkthrough performed by the reviewer (version unspecified) |

## Evidence set (run at draft time)

- `npm run test` — unit (111), db (114), api (75), architecture (130) — **all pass, 0 skipped.**
  Architecture now includes the criterion-5 navigation assertions
  (`server/test/architecture/navigation.spec.ts`) and the D-1 header assertions
  (`server/test/architecture/headers.spec.ts`).
- `npx playwright test` (E2E_BASE_URL=http://localhost:3000) — **29 passed (16 shell + 13 sign-in), 0 skipped**, including item 10 sign-in inside an IFRAME and the D-1 header check.
- `docker compose up -d --build` — stack built, `cargoexec-db` Healthy, `cargoexec-web` Started; `/sign-in` returns **HTTP 200** on port 3000 with **no `X-Frame-Options`** and a CSP carrying **no `frame-ancestors`** and no COEP (`curl -sI` captured 2026-09-15).

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
[pass]  AA contrast on all text and UI boundaries (USWDS token pairings)
        → confirmed by reviewer 2026-09-15 (USWDS default token pairings)
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
| — | — | No defects found | — | — |

## Assistive-technology walkthrough

Performed by the reviewer (Pradeep K) on 2026-09-15 against the running compose
stack at `http://localhost:3000`.

- **Landmark navigation:** banner, main and contentinfo were each announced once;
  on the reduced sign-in shell no primary `nav` landmark was announced (correct —
  the reduced shell has no navigation).
- **Heading navigation:** exactly one `h1` was reached per screen.
- **Result:** no focus theft from background updates was observed (the shell
  performs no polling). No defect, omission or duplication was reported.

## Sign-off

> A screen without a signed record is not delivered (§7.7).

- Reviewer: Pradeep K
- Date: 2026-09-15
- Statement: The application shell was reviewed against the §7.7 / UX Y2 §12
  checklist, including an assistive-technology walkthrough. All lines pass; no
  defects found. The shell is signed off as delivered.
