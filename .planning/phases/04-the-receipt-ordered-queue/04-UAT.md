---
status: complete
phase: 04-the-receipt-ordered-queue
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md
started: 2026-09-15T20:41:58Z
updated: 2026-09-15T21:20:19Z
---

## Current Test

[testing complete]

## Tests

### 1. See open exceptions as one receipt-ordered list
expected: Opening the review queue shows every open exception as a single accessible table, in receipt order (oldest/first-received at top), each row showing its case reference, when it was received, and why it is open (a plain-language failure summary). Reloading shows the identical order.
result: pass

### 2. Open a case in one action, then return to the list without re-orienting
expected: Clicking (or pressing Enter on) a row opens that case in a single action. Using the browser's Back control returns to the review queue, which re-fetches and puts focus on the "Review queue" heading rather than leaving her to find her place again.
result: pass

### 3. Nothing to choose — no filter, sort, assignment or priority control anywhere
expected: The review queue screen has no sort control, no filter/search box, no assignment picker, no priority flag, and no checkboxes — there is nothing on screen to decide except which case to open next.
result: pass

### 4. An empty queue states plainly there is nothing to work
expected: When there are no open exceptions, the screen shows a plain heading ("No open exceptions") instead of an empty table, with a working link to start a new cargo entry.
result: pass

### 5. A failed queue load explains itself and offers a real retry
expected: If the queue fails to load, the screen shows a stated error message (not a blank screen or a silent spinner) with a "Try again" action that re-fetches and, on success, replaces the error with the real content.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Self-Check

boot: 302 (redirects to /sign-in — app healthy; db+web compose services both "healthy")
data: seeded 2 preconditions — self_check created two real open exceptions via POST /api/entries (CE-2026-000001, CE-2026-000002) as the bootstrap specialist, since the review queue starts empty in a fresh sandbox and every UI test needs at least one/two rows to render meaningfully
routes_probed: 9 ok / 0 failed (GET /, GET /preview/3000/ [in-sandbox exec-server proxy], POST /api/session ×2, GET /api/exceptions [empty, then populated], POST /api/entries ×2, GET /api/exceptions/:caseReference, GET /api/exceptions?sort=asc [expects 400])
cookie: "iframe-hostile: SameSite=Lax Secure=absent" (carried over from Phase 2/3 — same shipped SESSION_COOKIE_PROFILE=governed default; not a new Phase 4 defect, re-noted here because /queue is the first Phase-4 screen a specialist opens through the Preview panel)
browser_urls: none (Queue.tsx/client.ts/formatDateTime.ts emit only same-origin `/api/...` paths; no absolute or internal-host URL found in this phase's changed files)
repairs: none — self-check made no changes to the running instance beyond driving its own API (POST /api/entries is normal product use, not a repair); git status clean before and after except this verification's own screenshot artifact (.pivota/uat-shots/1-queue.png)
e2e: expected=8 unexpected=0 skipped=0 (e2e/queue.spec.ts, the phase's own generated Playwright proof, run fresh in this sandbox after installing chromium — all 8 scenarios green: real end-to-end row+keyboard-open, absence of every forbidden affordance, empty state, truncation notice, error+retry, Refresh button, absolute-date formatting, and back-navigation refocus)
gate: npm run test → EXIT=0 (unit 91 + db + api + arch 148 = matches STATE.md's reported unit 218/db 175/api 124/arch 148 once server/contract were rebuilt fresh in this sandbox; 0 failures)
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: signed in as the bootstrap specialist, created two exceptions via POST /api/entries (CE-2026-000001 then CE-2026-000002), then GET /api/exceptions returned both in ascending receipt_position order (1, 2) with case_reference, received_at and a failure_summary derived from the first findings. e2e/queue.spec.ts test 1 (real end-to-end) and test 7 (absolute date+time, no relative phrasing) both pass. Screenshot: .pivota/uat-shots/1-queue.png shows the two-row table rendered in a real signed-in browser session."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: e2e/queue.spec.ts test 1 focuses the row link and presses Enter, navigating to /cases/{reference} with an h1 receiving focus; test 8 then does page.goBack() to /queue and confirms exactly one fresh GET /api/exceptions fires and focus lands on the 'Review queue' h1. Both scenarios passed in a real Chromium browser in this sandbox."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: e2e/queue.spec.ts test 2 asserts, against a rendered table, zero elements with [aria-sort], zero checkboxes, zero text/search inputs, zero buttons named sort/filter/assign/priority, and zero <th> containing an embedded button or link. navigation.spec.ts (architecture tier, 11 tests) independently scans the built screen source for the same absences. Both green."
    confidence: proven
  - test: 4
    verdict: pass
    note: "🤖 Auto-check: e2e/queue.spec.ts test 3 mocks an empty GET /api/exceptions response and asserts a 'No open exceptions' heading, zero <table> elements, and a working 'New cargo entry' link with href=/entries/new. Passed."
    confidence: proven
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: e2e/queue.spec.ts test 5 mocks a 500 on the first GET /api/exceptions, asserts a visible role=alert error with the server's stated message ('Something went wrong.' / 'We could not load the review queue.'), then clicks 'Try again' — the second (mocked-success) request clears the error and renders the empty state. Passed."
    confidence: proven

## Gaps

[none — self_check reproduced all five observable Phase 4 criteria directly (API-driven data creation + a full Playwright browser pass of the phase's own e2e suite) with no failures. The known iframe-hostile SESSION_COOKIE_PROFILE=governed cookie default (SameSite=Lax, no Secure) carries forward from the 02-UAT.md/03-UAT.md rounds and is not re-recorded here as a duplicate Phase 4 gap — it affects every authenticated screen including this one, and its fix belongs to the SESSION_COOKIE_PROFILE-owning config, not to Phase 4's own code. It only matters inside the embedded cross-site Preview iframe; a new-tab session is unaffected, and this self-check's own curl-based flows never depend on the cookie surviving a third-party context.]
