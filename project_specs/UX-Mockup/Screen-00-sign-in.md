## Screen 1: Sign in

| | |
|---|---|
| **Route** | `/sign-in` (the only unauthenticated screen) |
| **Feature** | F1 on the F2 shell |
| **Purpose** | Establish the identity the audit trail attributes every decision to. This is an **accountability** gate, not merely a security perimeter. |
| **User stories** | US-1.1, US-1.2, US-1.4, US-1.5, US-2.1, US-2.3, US-2.4 |
| **Document title** | `Sign in — CargoExec` |
| **Shell form** | Reduced: `usa-banner` + header **without navigation and without sign-out** + `main` + footer |

---

### Layout (desktop ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ usa-banner  ▸ An official website of the United States government            │
│             [Here's how you know ▾]            ← expandable, keyboard-operable│
├──────────────────────────────────────────────────────────────────────────────┤
│ ⤷ Skip to main content            (usa-skipnav — first focusable element)     │
├──────────────────────────────────────────────────────────────────────────────┤
│ <header role="banner">                                                       │
│   CargoExec                                                                  │
│   — no primary nav, no display name, no Sign out on this screen —            │
├──────────────────────────────────────────────────────────────────────────────┤
│ <main id="main-content">                                                     │
│                                                                              │
│        ┌────────────────────────────────────────────────────┐                │
│        │  h1  Sign in to CargoExec                          │ tabindex="-1"  │
│        │                                                    │                │
│        │  [ error summary slot — rendered only on failure ]  │                │
│        │                                                    │                │
│        │  A star (*) marks required information.            │                │
│        │                                                    │                │
│        │  * Email address                                   │                │
│        │  [ usa-input  type=email autocomplete=username  ]  │                │
│        │                                                    │                │
│        │  * Password                                        │                │
│        │  [ usa-input  type=password                     ]  │                │
│        │              autocomplete=current-password         │                │
│        │                                                    │                │
│        │  [  Sign in  ]   ← single usa-button, primary       │                │
│        │                                                    │                │
│        │  (no "remember me" · no third-party sign-in ·      │                │
│        │   no register · no forgot password · no invite)    │                │
│        └────────────────────────────────────────────────────┘                │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ <footer role="contentinfo">  usa-footer--slim + usa-identifier               │
└──────────────────────────────────────────────────────────────────────────────┘
   [aria-live="polite" status region]   [aria-live="assertive" alert region]
   ← present in the DOM from first paint, visually hidden
```

The form is centred in a narrow measure (USWDS `grid-col-12 tablet:grid-col-6
desktop:grid-col-4`, `usa-form--large`) using spacing tokens only.

### Information hierarchy

| Priority | Content | Placement | Why |
|---|---|---|---|
| Primary | `h1` "Sign in to CargoExec"; the two credential fields; the single "Sign in" button | Centre of `main`, first in DOM after the error-summary slot | The only task on the screen |
| Primary (on failure) | Error summary | First child of the form region, above `h1`'s following content | Takes focus; must be encountered before the fields (US-2.4) |
| Secondary | Required-field convention statement | Directly above the first field | Convention must be stated before it is relied on (FR-2.11) |
| Secondary | Official-site banner and its expandable detail | Above the header, every screen | Federal convention; establishes the site's authority (US-2.1) |
| Tertiary | Footer identifier, required links | Bottom of page | Present for federal conformance; never competes with the task |
| **Absent** | Product marketing, screenshots, "what is CargoExec", version strings, environment badges | — | Nothing on this screen but the accountability gate |

### States

| State | Appearance | Focus | Live-region announcement |
|---|---|---|---|
| **Default** | Empty form, "Sign in" enabled | Screen `h1` on load; the specialist tabs to email | Polite: "Sign in to CargoExec." (document title) |
| **Submitting** | Button shows "Signing in…" with `aria-disabled="true"`; second activation ignored | Stays on the button | Polite: "Signing in." |
| **Auth failed (401)** | `usa-alert--error` summary: *"Email or password is incorrect."* Password field cleared, **email retained**. **No field-level error styling on either input** — the server does not distinguish them, so the UI must not imply it does | Error summary (`role="alert"`, `tabindex="-1"`) | Assertive: "There is a problem with your sign-in." |
| **Account inactive (403)** | Same summary pattern: *"This account is not active."* | Error summary | Assertive |
| **Throttled (429)** | Same summary pattern: *"Too many sign-in attempts. Try again in about 15 minutes."* | Error summary | Assertive |
| **Malformed request (422)** | Summary with per-field detail from `details[]`; inline `usa-error-message` on the named field with `aria-invalid="true"` | Error summary | Assertive |
| **Session expired (arriving here mid-task)** | `usa-alert--info` above the form: *"Your session expired. Sign in again to continue."* Unsaved input from the previous screen is **not** carried and **not** silently resubmitted after re-authentication | Screen `h1` | Polite |
| **Signed out (arriving here after sign-out)** | `usa-alert--success` (slim): *"You are signed out."* | Screen `h1` | Polite |
| **Network / 5xx** | Summary: *"We could not reach the server. Try again."* + "Try again" | Error summary | Assertive |
| **Empty / Loading** | Not applicable — the screen has no data to load; it never shows a skeleton | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| "Skip to main content" | `usa-skipnav` | First focusable element; moves focus into `main` |
| Banner "Here's how you know" | `usa-banner` accordion button | `Enter`/`Space` toggles, `aria-expanded` maintained, content inline (no popup — iframe-safe) |
| Email address | `usa-input` `type="email"`, `autocomplete="username"` | `<label for>` bound; `Enter` submits the form |
| Password | `usa-input` `type="password"`, `autocomplete="current-password"` | `<label for>` bound; `Enter` submits; cleared on any failure |
| "Sign in" | `usa-button` (primary) | Submits; enters busy state; double submission blocked |
| Error-summary items | `usa-alert--error` + links | Each link moves focus to the named control by `id` |

**Deliberately absent, and why a reviewer might look for it:** a "Remember me" checkbox
(session lifetime is server-authoritative and non-extendable — FR-1.3/FR-1.5); a "Forgot
password?" link and a "Create account" link (there is no self-service provisioning and no
administrative role — US-1.3, FR-1.13); third-party / PIV / SSO buttons (out of scope); a
"show password" toggle (not required by any story; would be a bespoke control); a role
selector (there is exactly one role — US-1.2).

### Accessibility (screen-specific; the full specification is in `Y2-accessibility.md`)

- **Landmarks:** one `banner`, one `main#main-content`, one `contentinfo`. **No `nav`** — the
  unauthenticated shell has no navigation (FR-2.4, FR-2.6).
- **Headings:** exactly one `h1`; no `h2` is needed and none is invented to fill a slot.
- **Focus management:** on load, focus is on the `h1`. On a failed submit, focus moves to the
  error summary. On success, the client navigates to `/queue` and focus moves to that screen's
  `h1`.
- **Error identification:** the summary is the **first child of the form region**, carries
  `role="alert"` and `tabindex="-1"`, is bound to the form by `aria-describedby`, and lists one
  item per error in server order. Because the server returns a single generic credential error,
  the summary lists exactly one item and **no input receives `aria-invalid`** — announcing an
  invalid field would leak which one was wrong (US-1.1).
- **Live regions:** assertive for the failure; polite for "Signing in", "You are signed out",
  and "Your session expired".
- **Keyboard-only path:** Tab → email → password → "Sign in"; `Enter` from either field
  submits; on failure focus lands on the summary and Shift+Tab returns to the fields. No trap;
  no `tabindex > 0`.
- **Visible focus:** USWDS focus outline (`outline: 0.25rem solid` focus token) on every
  focusable element, meeting AA non-text contrast; `outline: none` appears nowhere.
- **Zoom and reflow:** at 200% zoom and at 320 CSS px the form becomes a single full-width
  column with no horizontal body scrolling; the banner detail stacks; nothing is lost.
- **Colour independence:** the error state is carried by the alert's heading text, its icon and
  its position — not by red alone.
- **Timing:** the 8-hour absolute and 30-minute idle expiries are server-side; the screen never
  shows a countdown timer (no time-limit UI is introduced), and expiry is explained in words
  when the specialist arrives here (US-1.4).

### Acceptance checkpoints (from the stories)

1. Unknown email and wrong password produce **visually identical** screens (US-1.1).
2. The error summary receives focus and the password field is cleared while the email persists.
3. The whole sign-in completes by keyboard alone (US-2.3, SM-11).
4. The screen renders no navigation and no sign-out control (US-2.1).
5. A second activation of "Sign in" while a request is in flight does nothing (US-1.1).
