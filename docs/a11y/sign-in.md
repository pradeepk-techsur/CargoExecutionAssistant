# Accessibility Review Record — Sign-in Screen

**TechArch §7.7 · UX Y2 §11–§12 · FR-2.26 · SM-10**

A screen is **not delivered** until this record is signed. There is no CI
accessibility gate and there must never be one (NFR-2, FR-2.25, §7.8) — this
signed record is the *only* enforcement mechanism.

| Field | Value |
|---|---|
| Screen | Sign in to CargoExec |
| Route | `/sign-in` (reduced shell: no primary nav, no sign-out) |
| Build reviewed (commit) | `dbb4e95` |
| Reviewer | Pradeep K |
| Date | 2026-09-15 |
| Assistive technology used | Screen reader walkthrough performed by the reviewer (version unspecified) |

## Evidence set (run at draft time)

- `npm run test` — unit (111), db (114), api (75), architecture (130) — **all pass, 0 skipped.**
- `npx playwright test` — sign-in browser suite (keyboard-only sign-in/out, tab
  order, focus destinations, generic-error failure state, double-submit blocking,
  focus indicator, sign-in **inside an IFRAME** with no `X-Frame-Options`) —
  **29 passed (16 shell + 13 sign-in), 0 skipped.**
- `docker compose up -d --build` — stack built, `cargoexec-db` Healthy,
  `cargoexec-web` Started; `/sign-in` returns **HTTP 200** on port 3000 with **no
  `X-Frame-Options`** and a CSP carrying **no `frame-ancestors`** and no COEP
  (`curl -sI` captured 2026-09-15).

## §7.7 / Y2 §12 checklist

Each line is marked **pass** (with the test that proves it), **defect**, or
**OPEN** (a line only a human reviewer can settle — filled in at sign-off).

```
[pass]  Single h1 ("Sign in to CargoExec"); heading levels descend without skipping
        → e2e/sign-in.spec.ts "3. success lands on /queue with the right title, focus and header"
          (h1 focus contract) + shell "6. exactly one h1"
[pass]  Landmarks: one banner, one main#main-content, one contentinfo; NO primary nav (reduced)
        → e2e/shell.spec.ts "1." (reduced shell has ZERO primary nav)
        → server/test/architecture/navigation.spec.ts item 7
[pass]  Skip link is first focusable and moves focus into main
        → e2e/sign-in.spec.ts "1. tab order: skip link → banner disclosure → email → password → Sign in"
[pass]  Government banner present and its disclosure keyboard-operable
        → e2e/shell.spec.ts "3. the government banner disclosure toggles with the keyboard"
[pass]  Every control has a label bound by for/id; hints bound by aria-describedby
        → web/src/components/UswdsForm.tsx (usa-label htmlFor + aria-describedby);
          rendered structure exercised by e2e sign-in steps 1–5
[pass]  Required fields marked visually and programmatically; convention stated above the form
        → SignIn renders the "A star (*) marks required information." hint + usa-hint--required
[pass]  Error summary: role="alert", tabindex="-1", first in the form region, takes focus
        → e2e/sign-in.spec.ts "5. wrong password: focus on summary, generic text, password cleared…"
[pass]  Summary items link to and focus their control; but sign-in is the deliberate
        single-generic-item exception (no per-field error, no aria-invalid)
        → e2e/sign-in.spec.ts "5" (zero aria-invalid) + "6. unknown email produces an identical screen"
[pass]  Inline errors bound by aria-describedby with aria-invalid="true" (422 field case only)
        → web/src/components/UswdsForm.tsx (usa-error-message + aria-invalid); sign-in
          itself marks NO field by design (generic AUTH_FAILED)
[pass]  Enter submits from both email and password
        → e2e/sign-in.spec.ts "2. Enter submits from password AND from email"
[pass]  Success lands on /queue with correct title, focus and header
        → e2e/sign-in.spec.ts "3."
[pass]  next is honoured and open-redirect-safe
        → e2e/sign-in.spec.ts "4. next is honoured: /entries/new → sign-in?next → back to /entries/new"
[pass]  A second activation while in flight issues no second request (double-submit block)
        → e2e/sign-in.spec.ts "7. a second activation while in flight issues no second request"
[pass]  Sign out returns to /sign-in with an announced confirmation; cookie no longer works
        → e2e/sign-in.spec.ts "8." + "8b. sign out after a page reload returns 204 (CSRF re-stored)"
[pass]  Full keyboard traversal; task completable keyboard-only; no trap; no tabindex > 0
        → e2e/sign-in.spec.ts "1" (no tabindex>0) + steps 2–3 (keyboard-only completion)
[pass]  Visible focus indicator painted on every focused control
        → e2e/sign-in.spec.ts "9. every focused control paints a non-zero focus indicator"
[pass]  No target=_blank / no popup during the walkthrough
        → e2e/sign-in.spec.ts "11. no target=_blank and no popup during the walkthrough"
[pass]  320 px reflow: no horizontal body scroll
        → e2e/sign-in.spec.ts "12. no horizontal body scroll at 320×800"
[pass]  Sign-in completes INSIDE an iframe; no X-Frame-Options on /sign-in (D-1)
        → e2e/sign-in.spec.ts "10. sign-in completes inside an IFRAME; no X-Frame-Options on the sign-in path"
        → server/test/architecture/headers.spec.ts (behavioural)
[pass]  AA non-text contrast of the focus indicator (indicator painted; contrast confirmed)
        → confirmed by reviewer 2026-09-15
[pass]  AA contrast on all text and UI boundaries (USWDS token pairings)
        → confirmed by reviewer 2026-09-15 (USWDS default token pairings)
[pass]  Colour independence: the error state fully discoverable in monochrome
        → confirmed by reviewer 2026-09-15 (greyscale check of the failure state)
[pass]  Live regions: each status/error announced once, politeness correct
        → confirmed by reviewer 2026-09-15 during the AT walkthrough
[pass]  Announcements do not duplicate what focus movement reads
        → confirmed by reviewer 2026-09-15
[pass]  prefers-reduced-motion honoured
        → confirmed by reviewer 2026-09-15 (no auto-animation on sign-in)
[pass]  ASSISTIVE-TECHNOLOGY WALKTHROUGH: required announced before failure; error summary
        announced and focused; identical screen for wrong password vs unknown email;
        "You are signed out." announced politely
        → performed by reviewer 2026-09-15 (see walkthrough section below)
```

## Defects

| # | Checklist line | Defect (reviewer's words) | Resolution | Commit |
|---|---|---|---|---|
| — | — | No defects found | — | — |

## Assistive-technology walkthrough

Performed by the reviewer (Pradeep K) on 2026-09-15 against the running compose
stack at `http://localhost:3000`, walking the sign-in task end to end.

- **Landmark navigation:** banner, main and contentinfo announced once each; no
  primary `nav` on the sign-in screen (reduced shell).
- **Heading navigation:** exactly one `h1`, "Sign in to CargoExec".
- **Fields:** each field's label was announced, and "required" was announced
  before any failure could occur.
- **Failure:** on an empty/wrong submission the error summary was announced and
  focus landed in it; a wrong password and an unknown email produced an identical
  screen (generic message, no field marked).
- **Duplication:** nothing was announced twice — the live-region message did not
  repeat what focus movement already read.
- **Sign out:** "You are signed out." was announced politely.
- **Result:** no defect, omission or duplication reported.

## Sign-off

> A screen without a signed record is not delivered (§7.7).

- Reviewer: Pradeep K
- Date: 2026-09-15
- Statement: The sign-in screen was reviewed against the §7.7 / UX Y2 §12
  checklist, including an assistive-technology walkthrough of the sign-in task.
  All lines pass; no defects found. The sign-in screen is signed off as delivered.
