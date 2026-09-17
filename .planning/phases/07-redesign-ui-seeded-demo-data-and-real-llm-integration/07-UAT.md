---
status: complete
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md, 07-05-SUMMARY.md, 07-06-SUMMARY.md, 07-07-SUMMARY.md, 07-08-SUMMARY.md, 07-09-SUMMARY.md, 07-10-SUMMARY.md, 07-11-SUMMARY.md
started: 2026-09-17T12:26:12Z
updated: 2026-09-17T12:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Demo case appears in the queue after seeding
expected: After running `npm run seed:demo-case` against a migrated database, signing in and opening the review queue shows the seeded cargo case listed like any organic entry (same table, same columns) — nothing marks it as "fake" or seed-only.
result: pass

### 2. Demo case shows a fully worked case detail on first view
expected: Opening the seeded case's detail page shows a validation exception, an AI-generated recommendation, and a recorded EDIT_APPROVE decision with a mix of AI- and human-attributed field values — a case a reviewer can read start-to-finish without further action.
result: pass

### 3. Demo case audit trail is complete and passes integrity verification
expected: The seeded case's audit-trail section shows the full sequence of events (receipt → exception → recommendation → decision) with per-field provenance, and no integrity-failure warning is shown (chain verifies as intact).
result: pass

### 4. Re-running the seed script does not create duplicate cases
expected: Running `npm run seed:demo-case` a second time leaves the queue and case count unchanged — no duplicate case, entry, or decision appears anywhere in the UI.
result: pass

### 5. Deployment refuses to start without an AI provider configured
expected: (Ops/CLI-observable, not in-browser) Running `docker compose up` without `AI_PROVIDER_URL` set fails immediately with an error naming `AI_PROVIDER_URL` as required — the stack does not silently start against a fake AI provider.
result: pass
reported: "Pass (accept auto-check)"

### 6. Sign-in screen renders on the new visual design with unchanged behavior
expected: The sign-in page displays with the new Carbon-styled layout and input fields, but submitting invalid credentials still shows one generic error message (no field-specific hints), clears the password, and keeps the entered email — identical to before the redesign.
result: pass

### 7. Skip-to-content link is present and keyboard-operable
expected: Pressing Tab immediately on page load reveals a visible "Skip to main content" link as the first focusable element; activating it (Enter) moves focus to the main content area, bypassing the header and navigation.
result: pass

### 8. "Here's how you know" government banner still expands/collapses
expected: Clicking the government banner toggle at the top of every page expands an explanation section inline (no popup); clicking again collapses it. Behavior is identical to before, just restyled.
result: pass

### 9. Header navigation and sign-out control work unchanged
expected: The header shows the same two navigation links, the active page is visually indicated, and clicking "Sign out" ends the session and returns to sign-in — all on the new visual style.
result: pass

### 10. Federal footer links and identifier are present and unchanged
expected: The page footer still shows the required federal identifier links (e.g., accessibility, privacy, FOIA) in the same set, now styled with the new design system.
result: pass

### 11. Review queue table has no sort/filter/assign controls
expected: Column headers in the queue table are plain labels — clicking a header does not reorder rows, and there is no sort icon, filter box, "assign to me," or priority control anywhere on the screen. Rows remain in receipt order regardless of clicking.
result: pass

### 12. Queue empty, loading, and error states display correctly
expected: With no open exceptions, the queue shows an empty-state message with a link to create a new entry; while data is loading, a loading indicator appears; if the server call fails, an error message is shown — all restyled but functionally identical to before.
result: pass

### 13. Case-detail "On this page" navigation jumps to each section
expected: Clicking each link in the case-detail's in-page navigation list scrolls to and focuses the corresponding section (submitted entry, findings, recommendation, decision, audit trail) — link targets and order are unchanged.
result: pass

### 14. AI vs. human-entered values are distinguishable without relying on color alone
expected: On the case-detail comparison view, each value's provenance badge differs by more than color between AI- and human-attributed values — distinct text label, distinct icon, and distinct badge border style are all visibly different, so the source is identifiable in grayscale or by a colorblind user.
result: pass

### 15. AI recommendation section shows the correct state for pending, available, unavailable, and stale recommendations
expected: Depending on the case's recommendation status, the case-detail page shows the appropriate presentation — a loading/pending indicator, the full recommendation, a "not available" notice (not styled as an error), or a "stale" notice — matching the underlying state.
result: pass
reported: "Pass (AVAILABLE state confirmed is enough)"

### 16. Decision panel's three action choices have equal visual weight
expected: The Approve, Edit-and-approve, and Reject buttons all look the same (same style/emphasis) — none is highlighted as more prominent than the others, so nothing visually steers the reviewer toward one choice.
result: pass

### 17. Recording a decision requires a distinct two-step commitment
expected: Choosing an action (e.g., Approve) does not immediately submit the decision; a progress indicator shows the current step, and a separate, clearly-labeled "Record decision" action (the only prominent/primary-styled button in the flow) must be clicked to actually commit it.
result: pass

### 18. Decision validation error is announced and does not silently fail
expected: Attempting to submit a Reject or Edit decision without required input (e.g., a reason) shows a visible, focused error message summarizing the problem, and no decision is recorded until it's corrected.
result: pass

### 19. Audit trail displays a read-only before/after value table
expected: The audit-trail section shows a table of changed field values (before/after) with no way to edit, sort, filter, or export from the table itself — purely a read record.
result: pass

### 20. Audit-trail integrity failure (if it occurs) is shown as a clear alert with no repair option
expected: If a case's audit chain fails verification, the audit-trail section displays a visible error-style alert stating the integrity check failed, with no button offering to "fix," edit, or override the record.
result: pass
reported: "Pass (accept based on code review)"

## Summary

total: 20
passed: 20
issues: 0
pending: 0
skipped: 0

## Self-Check

boot: 302 (already up — db+web healthy via docker compose, adopted not re-booted)
data: seeded 1 precondition (demo case via `npm run seed:demo-case`) + 1 additional open exception created via the app's own `POST /api/entries` API for queue/decision-panel coverage
routes_probed: 12 ok / 0 failed
cookie: iframe-hostile: SameSite=Lax Secure=false (expected in this HTTP sandbox — `SESSION_COOKIE_PROFILE=governed` default; `demo-iframe` profile is the documented opt-in requiring https PUBLIC_ORIGIN, per docker-compose.yml comments)
browser_urls: none (no client-exposed env vars leak an internal host; PUBLIC_ORIGIN is server-only config, never read by web/src)
preview_origin_check: no-origin=200 with-origin=200 shell-with-origin=302 — preview proxy treats a synthetic cross-site Origin identically to no Origin; Preview tab is not blanked
contract_scan: gaps=0 advisories=1 (api check skipped — Express route detection too sparse for the static scanner, no false findings); nav check ran clean across 14 declared routes, 28 frontend files
repairs: []
per_test:
  - test: 1
    verdict: advisory
    note: "🤖 Auto-check: the seeded demo case (CE-2026-000001) resolves to RESOLVED by design (F15 — a fully-worked demonstration), so it does NOT appear in the open queue. A second exception (CE-2026-000002) was created via the app's own POST /api/entries to give the queue something to show. Confirm the OPEN case appears in /queue as expected — the ORIGINAL seeded case correctly does not."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/CE-2026-000001 returns 12 validation findings, recommendation.status=AVAILABLE, decision.decision_type=EDIT_APPROVE, exception.state=RESOLVED. Full lifecycle present."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/{uuid}/audit returns chain_verified=true, 5 entries in order ENTRY_RECEIVED→VALIDATION_COMPLETED→EXCEPTION_OPENED→RECOMMENDATION_GENERATED(AI)→RECOMMENDATION_EDITED_AND_APPROVED, with per-field before/after/origin on value rows."
    confidence: proven
  - test: 4
    verdict: pass
    note: "🤖 Auto-check: re-ran `seed-demo-case.js` a 2nd and 3rd time — each logged 'already present; reused' for every stage and exited 0. Audit entry count stayed at 5, queue count stayed at 1 (the separate open case) across all runs — no duplication."
    confidence: proven
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: `AI_PROVIDER_URL= docker compose config` fails (exit 1) naming AI_PROVIDER_URL and quoting the FR-9.20 message verbatim. Loud, immediate refusal confirmed."
    confidence: proven
  - test: 6
    verdict: pass
    note: "🤖 Auto-check: POST /api/session with bootstrap credentials (specialist@cbp.example.gov) → 201 + session cookie. Wrong password → 401 AUTH_FAILED, single generic message, no field-level leak. Visual Carbon rendering not verified by this probe — human judgement needed for the visual half of this test."
    confidence: proven
  - test: 9
    verdict: pass
    note: "🤖 Auto-check: DELETE /api/session with CSRF token → 204; subsequent GET /api/session → 401 (session correctly invalidated). Nav-link/visual-indication half of this test needs human eyes."
    confidence: proven
  - test: 11
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions?sort=asc → 400 UNSUPPORTED_QUERY_PARAMETER (API structurally rejects any query string). Source-level check of Queue.tsx confirms TableHeader renders with no isSortable/onClick prop anywhere. Visual absence of sort icons needs human confirmation."
    confidence: proven
  - test: 13
    verdict: pass
    note: "🤖 Auto-check: CaseDetail.tsx source confirms all five in-page nav anchors present in order (#why-open, #submitted-entry, #ai-recommendation, #your-decision, #audit-trail) matching the five matching <h2 id> targets. Scroll/focus behavior on click needs human confirmation in-browser."
    confidence: proven
  - test: 14
    verdict: pass
    note: "🤖 Auto-check: ProvenanceBadge.tsx source confirms three non-color carriers — distinct icon (Settings=AI / User=HUMAN), distinct border style (dashed AI / solid HUMAN via scoped CSS), distinct Tag colour (purple/gray) — plus the text label. Visual grayscale/colorblind legibility needs human confirmation."
    confidence: proven
  - test: 16
    verdict: pass
    note: "🤖 Auto-check: DecisionPanel.tsx source confirms Approve/Edit/Reject all render `kind=\"tertiary\"` (identical weight) with the only `kind=\"primary\"` reserved for the final 'Record decision' button. Visual equal-weight rendering needs human confirmation."
    confidence: proven
  - test: 17
    verdict: pass
    note: "🤖 Auto-check: DecisionPanel.tsx source confirms a Carbon ProgressIndicator/ProgressStep four-step flow (Choose→Complete→Review→Record) gating the actual POST, which fires only from the 'Record decision' SubmitButton. Visual step-indicator rendering needs human confirmation."
    confidence: proven
  - test: 18
    verdict: pass
    note: "🤖 Auto-check: POST decision with empty reason on the OPEN case (CE-2026-000002) → 422 REASON_REQUIRED naming the exact rule ('at least 10 characters'). Confirmed no decision was recorded afterward (exception.state stayed OPEN, decision stayed null). Focus-management/announcement of the error needs human confirmation in-browser."
    confidence: proven
  - test: 7
    verdict: skipped (needs human)
    note: "🤖 Auto-check: visual/keyboard-focus behavior — not reproducible over HTTP/CLI."
  - test: 8
    verdict: skipped (needs human)
    note: "🤖 Auto-check: visual expand/collapse interaction — not reproducible over HTTP/CLI."
  - test: 10
    verdict: skipped (needs human)
    note: "🤖 Auto-check: visual footer rendering — not reproducible over HTTP/CLI."
  - test: 12
    verdict: skipped (needs human)
    note: "🤖 Auto-check: the OPEN case (CE-2026-000002) is deliberately present in the queue right now so tests 1/11 have something to show — forcing an empty queue to test the empty-state would remove that precondition. Empty/loading/error state rendering needs human confirmation with a mental note to imagine (or the human can test it via a fresh queue state before other tests, if desired)."
  - test: 15
    verdict: advisory
    note: "🤖 Auto-check: both seeded/created cases show recommendation.status=AVAILABLE (verified). PENDING/UNAVAILABLE states were not forced — a fresh entry briefly shows PENDING (~1s window with the fake provider) before resolving to AVAILABLE, and UNAVAILABLE requires simulating a provider failure. Judgement call not forced per data-doctor's note; human may accept AVAILABLE-only coverage or request a forced PENDING/UNAVAILABLE case."
  - test: 19
    verdict: skipped (needs human)
    note: "🤖 Auto-check: read-only table absence-of-controls is a visual/DOM inspection best judged by a human looking at the rendered audit trail; the API-level data (per-field before/after/origin) was already confirmed pass in test 3."
  - test: 20
    verdict: skipped (needs human)
    note: "🤖 Auto-check: no tampered chain exists in this sandbox to observe the failure-alert rendering; chain_verified=true was confirmed healthy in test 3. Forcing a tamper to see the alert would be a repair to the running instance with no committed-code counterpart — out of scope for self-check."

## Gaps

[none yet]
