---
phase: 03-receive-validate-except
plan: 08
subsystem: ui
tags: [react, uswds, forms, a11y, csrf, api-client, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: "contract/src/dto.ts §3.12 wire types (EntryCreateRequest, ReceiptResponse, EntryDetailResponse)"
  - phase: 02-identity-and-the-federal-ui-foundation
    provides: "the inherited USWDS form pattern (UswdsForm.tsx) and the rotate-on-GET CSRF client (api/client.ts)"
provides:
  - "SelectField, TextAreaField, DateField, Fieldset added to the single form pattern in UswdsForm.tsx"
  - "api.createEntry (POST /api/entries) and api.getEntry (GET /api/entries/{id}) on the typed client"
  - "useFieldIds + FormGroup shared internals — one label/hint/error/aria-describedby helper for all five controls"
affects: [03-09, 03-10, "Phase 6 F12 decision surface"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One form pattern, five controls: Field/SelectField/TextAreaField/DateField all share useFieldIds + FormGroup so the per-screen a11y review certifies one implementation"
    - "React-computed character count (aria-live=polite) instead of USWDS JS init — deterministic, mounts with React, needs no document-load behaviour"
    - "Progressive-enhancement date input: type=text + YYYY-MM-DD hint is authoritative; USWDS calendar init is a guarded no-op when the build exposes no imperative on()"
    - "Every new state-changing POST routes through request() so the rotated CSRF token is attached automatically"

key-files:
  created: []
  modified:
    - "web/src/components/UswdsForm.tsx"
    - "web/src/api/client.ts"

key-decisions:
  - "DateField renders a plain usa-input (type=text) + YYYY-MM-DD hint; the installed @uswds/uswds build exposes only window.uswdsPresent, no imperative usa-date-picker.on(), so calendar init is a guarded no-op by design (deviation D-1)"
  - "TextAreaField's character count is rendered in React, not initialised by USWDS JS, because the component mounts after document-load init would have run"
  - "createEntry/getEntry go through the shared request() primitive with no retry, no idempotency key, no coercion, no 401 special-casing — receipt is not idempotent and the body is submitted as typed"

patterns-established:
  - "useFieldIds(id, hint, invalid, errorText, extras): the id/aria-describedby contract shared by every control in UswdsForm.tsx"
  - "FormGroup: the usa-form-group shell (label + hint + inline error + control-as-children), preserving Field's original markup ordering byte-for-byte"

# Metrics
duration: 5min
completed: 2026-09-15
---

# Phase 3 Plan 08: Cargo-entry form primitives and client calls Summary

**Extended the single USWDS form pattern with select / character-counted textarea / as-typed date input / fieldset wrapper, and added `createEntry`/`getEntry` to the typed client — all reusing the one shared label/hint/error/CSRF machinery rather than a second implementation.**

## Performance

- **Duration:** ~5 min active (excl. one-time Playwright browser install)
- **Started:** 2026-09-15T16:24:08Z
- **Completed:** 2026-09-15T16:28:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Factored `Field`'s inline label/hint/error wiring into two shared internals (`useFieldIds`, `FormGroup`) and rebuilt `Field` on them with byte-identical rendered markup — proven by the 29 Phase 2 Playwright tests and `navigation.spec.ts` still passing.
- Added `SelectField` (empty `'- Select -'` first option, caller-supplied domain list), `TextAreaField` (React-computed `usa-character-count__message`, `aria-live="polite"`, in `aria-describedby`, `maxLength` cap), `DateField` (`type="text"` + `YYYY-MM-DD` hint, usable without USWDS JS), and `Fieldset` (legend, optional statement, fieldset-level error slot bound via `aria-describedby` on the `<fieldset>`, `tabIndex={-1}`).
- Added `api.createEntry` and `api.getEntry` routing through the shared `request()` primitive so the rotated CSRF token is attached automatically; types imported from `@cargoexec/contract` with no DTO redeclared in `web`.

## Task Commits

Each task was committed atomically:

1. **Task 1: SelectField/TextAreaField/DateField/Fieldset in the one form pattern** - `33c5e50` (feat)
2. **Task 2: api.createEntry and api.getEntry on the typed client** - `922a361` (feat)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified
- `web/src/components/UswdsForm.tsx` - Added `useFieldIds` + `FormGroup` shared internals and four new exported controls; `Field` refactored onto them with unchanged markup.
- `web/src/api/client.ts` - Added `createEntry`/`getEntry`, imported three contract DTO types, and named `createEntry` as the first phase-3 POST in the CSRF header note.

## Decisions Made
- **DateField calendar init is a guarded no-op (see Deviation D-1).** The plain text input is the authoritative, keyboard-operable control per Screen-01 §Interactive elements; the calendar is a progressive enhancement only, and the client never reformats the value (FR-6.5).
- **Character count in React, not USWDS JS** — the field-scoped `aria-live="polite"` region announces `"{n} characters allowed"` / `"{n} characters over limit"` deterministically without depending on document-load init that runs before React mounts.
- **No retry / no idempotency key / no coercion / no 401 special-casing** on the two new client methods — receipt is not idempotent (a timed-out POST may already have created an entry), and the body is submitted exactly as typed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed the Playwright chromium browser and its system dependencies**
- **Found during:** Task 1 verification (the `e2e` Playwright step)
- **Issue:** `browserType.launch: Executable doesn't exist at .../chromium-1140/chrome-linux/chrome` — the browser binary and its OS libraries were absent in the sandbox, so the plan's e2e verification could not run.
- **Fix:** `npx playwright install chromium` then `npx playwright install-deps chromium`. Also stopped the pre-existing compose `web` container (baked from the previous build) so Playwright's own `webServer` command built and served the current source, and rebuilt/restarted it afterward so the live preview reflects this plan's code.
- **Files modified:** none (environment only)
- **Verification:** 29 Phase 2 Playwright tests pass against a fresh build of the modified source.
- **Committed in:** n/a (no source change)

### Recorded design deviation

**D-1. DateField renders a plain `usa-input` rather than an initialised USWDS date-picker calendar.**
- **Reason:** The plan explicitly instructs: *"Read the exact accessor shape from the installed `@uswds/uswds` build before writing it, and if the global does not expose an imperative `on(...)`, skip initialisation entirely and render a plain `usa-input` with the hint."* Inspection of `web/public/assets/js/uswds.min.js` shows it exposes only `window.uswdsPresent=!0` and **no** `window.uswds.components['usa-date-picker'].on()` accessor. The `useEffect` still attempts the documented accessor inside a `try/catch` that swallows, so it is a guarded no-op today and would light up transparently if a future build exposes the imperative API.
- **Effect:** `type="text"` + `YYYY-MM-DD` hint is fully keyboard-operable, the value submits as typed, no error appears when USWDS JS is absent — exactly the Screen-01 §Interactive-elements guarantee. This also avoids USWDS's date-picker fighting React's controlled input (its hidden external input rewriting the visible value), which the plan flags as the fallback reason.

---

**Total deviations:** 1 auto-fixed (1 blocking: Playwright browser install) + 1 recorded design deviation (D-1, plan-sanctioned).
**Impact on plan:** No scope creep. The blocking fix was environment-only; D-1 is the plan's own stated fallback and preserves correct as-typed, keyboard-operable behaviour.

## Issues Encountered
- The Playwright default reporter rejects `--reporter=list` (a Playwright-only value) when passed to `vitest`; the architecture specs were run with vitest's default reporter instead. No source impact.

## Known Stubs
None found — the only `placeholder` matches are the legitimate `SelectField.placeholder` prop and a comment about USWDS label semantics.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The five form controls and the two client methods are ready for plan 03-09 to assemble the `/entries/new` cargo entry screen (the four Screen-01 fieldsets, error-summary wiring, and the receipt outcome panel).
- `Field`'s certified Phase 2 markup is unchanged, so no re-review of the signed `docs/a11y/sign-in.md` record is needed.
- No blockers.

## Self-Check: PASSED
- Files exist: `web/src/components/UswdsForm.tsx`, `web/src/api/client.ts` — both present and modified.
- Commits present: `33c5e50` (Task 1), `922a361` (Task 2).
- Build check: `npm run build` → exit 0.
- `npm run test:arch` → 130/130 passed; sign-in + shell Playwright → 29/29 passed.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 03-receive-validate-except*
*Completed: 2026-09-15*
