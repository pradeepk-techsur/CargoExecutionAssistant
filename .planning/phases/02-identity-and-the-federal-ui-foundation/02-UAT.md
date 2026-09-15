---
status: complete
phase: 02-identity-and-the-federal-ui-foundation
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md, 02-07-SUMMARY.md, 02-08-SUMMARY.md, 02-09-SUMMARY.md
started: 2026-09-15T01:05:00Z
updated: 2026-09-15T01:24:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sign in as the bootstrap specialist
expected: On the sign-in screen, entering the bootstrap email and password and submitting takes you into the application (the review queue screen), and the header shows your display name with a sign-out control.
result: pass

### 2. Wrong password shows one generic, announced error
expected: Submitting a wrong password (or an unknown email) keeps you on sign-in and shows a single error summary that receives focus and is announced. It must NOT say which of the two credentials was wrong, and neither field is marked individually invalid.
result: pass

### 3. Sign out deliberately
expected: Activating sign-out returns you to the sign-in screen and ends the session. Navigating back to a protected page does not show protected content — it sends you back to sign-in.
result: pass

### 4. An unidentified caller cannot reach a protected page
expected: While signed out, opening a protected page directly (e.g. /queue) redirects to the sign-in screen and remembers where you were headed, so signing in then lands you on that original destination rather than a default page.
result: pass

### 5. Navigation offers only the two places this product has
expected: The primary navigation shows exactly two destinations (Review queue and New cargo entry). Nothing on screen implies a dashboard, report, metric, search, settings, admin area or a second role.
result: pass

### 6. The whole sign-in path works by keyboard alone with visible focus
expected: Using only Tab/Shift+Tab/Enter you can reach the skip link, both fields and the submit button, sign in, and sign out. Focus is always visibly indicated, and after each screen change focus lands on the new page heading.
result: pass

### 7. The federal USWDS shell renders correctly
expected: The screen carries the official government banner (expandable "Official website of the United States government"), a working skip-to-main-content link, and the footer agency identifier — styled as USWDS, with fonts and icons loading from the app itself.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Self-Check

boot: 302
data: all preconditions present
routes_probed: 5 ok / 0 failed
cookie: "iframe-hostile: SameSite=Lax Secure=absent"
browser_urls: 0 gaps / 1 advisory
browser_urls_detail:
  - origin: localhost:3000
    tier: advisory
    emitted_by: "client-env PUBLIC_ORIGIN (.env, .env.example, docker-compose.yml)"
    sample: "http://localhost:3000"
    note: "FALSE POSITIVE of the client-exposure heuristic — the `PUBLIC_` prefix matched, but this is an Express/Vite app where the prefix carries no client-bundling meaning. Traced every consumer: server/src/config.ts:138-141 reads it ONLY to derive `originIsHttps`. Confirmed it is never serialized to the browser (no `localhost` in the served document or either JS bundle). Not a gap."
e2e: "green (29/29 expected, 0 unexpected, 0 flaky)"
contracts: "gaps=0 advisories=1 (routes=14, api_routes=2, front=22, back=27; api half skipped — routes register from API_ROUTE_TABLE data, not inline literals)"
browser_origin: pass
orphan_pages: none
file_roundtrip: "skipped (no file storage in this app)"
compose_health: "db healthy, web healthy; no fatal markers in either service log"
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: POST /api/session with the bootstrap credential returns 201 with display_name 'A. Rivera'; the session cookie then resolves GET /api/session 200 and GET /queue 200."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: wrong password AND unknown email both return an identical 401 AUTH_FAILED body ('Email or password is incorrect.') — byte-identical after normalizing the per-request request_id, so neither response discloses whether the account exists."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: DELETE /api/session with the CSRF token rotated by the bootstrap GET returns 204, clears the cookie, and a replay of the old session returns 401. Note the rotate-on-GET contract: a token minted by sign-in is already stale after any GET /api/session — the SPA client re-stores it internally (02-07), so this only bites hand-built requests."
    confidence: proven
  - test: 4
    verdict: pass
    note: "🤖 Auto-check: signed out, GET /queue -> 302 Location /sign-in?next=%2Fqueue, and a deeper path GET /cases/ABC-123/audit -> 302 /sign-in?next=%2Fcases%2FABC-123%2Faudit — the intended destination is preserved percent-encoded."
    confidence: proven
  - test: 5
    verdict: "skipped (needs human)"
    note: "🤖 Auto-check: NAV_ITEMS is a 2-member `as const` rendered by .map (web/src/shell/navItems.ts); the router declares exactly the seven §3.17 routes and no dashboard/report/search/admin route. Visual confirmation is yours."
    confidence: proven
  - test: 6
    verdict: "skipped (needs human)"
    note: "🤖 Auto-check: the keyboard-only walkthrough passes in the browser suite (e2e/sign-in.spec.ts, part of 29/29 green), but tab-order feel and focus visibility are judgement calls."
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: screenshot confirms the government banner, skip link, USWDS-styled form and footer agency identifier all render, served from the app's own origin (no CDN)."
    confidence: proven

## Gaps

- truth: "A specialist can sign in and hold a session in the embedded Preview panel"
  status: failed
  reason: "The session cookie is issued as `SameSite=Lax` with no `Secure` attribute (observed verbatim: `Set-Cookie: cargoexec_sid=...; HttpOnly; Path=/; SameSite=Lax`). The Pivota preview renders the app in a cross-site HTTPS iframe, where browsers drop Lax cookies on the framed navigation — so sign-in succeeds server-side (201) and then appears to fail in the Preview panel, with no visible cause. The app ALREADY implements the fix: server/src/http/cookies.ts:79-82 emits `SameSite=None; Secure` under the `demo-iframe` profile, and config.ts:148 correctly refuses that profile over plain HTTP. The defect is the shipped default — docker-compose.yml sets `SESSION_COOKIE_PROFILE=${SESSION_COOKIE_PROFILE:-governed}` and `PUBLIC_ORIGIN=${PUBLIC_ORIGIN:-http://localhost:3000}`, so the deployed stack takes the iframe-hostile branch. Fix: run the preview with SESSION_COOKIE_PROFILE=demo-iframe and an https:// PUBLIC_ORIGIN. Workaround for testing now: the Preview panel's 'Open in new tab'."
  severity: major
  test: 1
  source: self_check
  confidence: proven
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
