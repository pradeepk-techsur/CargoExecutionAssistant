---
status: complete
phase: 06-the-human-decision-and-the-record-that-explains-it
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md
started: 2026-09-16T14:40:33Z
updated: 2026-09-16T18:12:28Z
---

## Current Test

[testing complete]

## Tests

### 1. Three Equal Decision Actions, Nothing Pre-Selected
expected: Opening an OPEN case with an AVAILABLE recommendation shows "Your decision" with three equally-weighted actions — Approve, Edit-and-approve, Reject — none of them pre-selected or auto-focused.
result: pass

### 2. Edit-and-Approve Requires a Substantive Reason and Marks Changed Fields
expected: Choosing Edit-and-approve opens a form pre-filled with the AI's proposed values. Changing a field and submitting with fewer than 10 characters of reason shows an inline, focus-managed error. Submitting with a real reason shows a pre-submission summary marking which fields you changed ("Specialist-modified") versus which stayed the machine's, before anything is recorded.
result: pass

### 3. Decision Confirmation Shows What Was Recorded
expected: After confirming the edit-and-approve, a "Decision recorded" confirmation appears built from the server's response — showing the final field values and their origin (Specialist vs AI). The three decision controls are gone; the case is now read-only.
result: pass

### 4. Reject a Case With a Reason
expected: On a different open case, choosing Reject requires a substantive reason (same validation as edit) and, once submitted, records the rejection — the case closes with the AI's proposal explicitly declined, no values applied.
result: pass

### 5. Deciding When No AI Recommendation Is Available
expected: Opening a case whose recommendation is "No AI recommendation available" (degraded) offers only two actions — Edit-and-approve (as a direct resolution) and Reject — no plain Approve, since there is nothing to approve. Filling in every flagged field and a reason lets you resolve the case directly, all values marked as yours.
result: pass

### 6. A Decided Case Refuses a Second Decision
expected: Returning to (or reloading) a case that has already been decided shows the read-only decision record, not the chooser — there is no way to decide it again.
result: pass

### 7. Audit Trail Tells the Whole Story In Place
expected: Opening the audit trail on a decided case shows every event in order — the entry received, validation, the AI's recommendation (or that none was available), and the human's decision — each with who, when, and what changed. The decision's reason appears verbatim, and every value shows whether it came from the AI or the specialist, with no edit/delete/export control anywhere on the trail.
result: pass

### 8. The Whole Loop, Start to Finish, Keyboard Only
expected: In one browser session, keyboard only: sign in, submit an entry that fails validation, find the resulting case in the queue, open it, read the AI's recommendation, decide it with a reason, then read the full audit trail — with no full page reload during the decision or audit steps.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Self-Check

boot: 302 (auth redirect via / — db+web compose services healthy; direct 127.0.0.1:3000 and in-sandbox proxy 127.0.0.1:7777/preview/3000/ both answered 302)
data: seeded 3 preconditions this round (fresh sandbox DB was empty — 0 exceptions) via the app's real POST /api/entries + POST /api/exceptions/{id}/decision paths (this product ships no seed/fixture loader by design, PRD §10 #7): CE-2026-000001 (OPEN, recommendation AVAILABLE, permitted_decisions [APPROVE, EDIT_APPROVE, REJECT] — used by tests 1-3), CE-2026-000002 (OPEN, recommendation UNAVAILABLE via the fake-provider's PROVIDER_UNAVAILABLE sentinel, permitted_decisions [EDIT_APPROVE, REJECT] — used by test 5), CE-2026-000003 (already RESOLVED via APPROVE, full 5-entry audit trail, chain_verified true — used by tests 6-7). A separate case for test 4 (Reject) is left to the human's own reject action so it is not pre-decided out from under the test. No repair-ledger entries — nothing outside the running app's own state was touched, no SQL written into governed tables.
routes_probed: 9 ok / 0 failed (GET /, GET /api/session, POST /api/session, GET /api/exceptions, GET /api/exceptions/{ref} x3, GET /api/exceptions/{uuid}/audit, Origin-header probe via both direct and in-sandbox proxy)
cookie: iframe-hostile: SameSite=Lax Secure=absent — SESSION_COOKIE_PROFILE=governed (the compose default) over plain HTTP in this sandbox; the app itself supports SESSION_COOKIE_PROFILE=demo-iframe over HTTPS for a genuinely framed deployment (server/src/http/cookies.ts), so this is the expected local-demonstration posture per TechArch §4.8, not a defect. If the human tests via the embedded Preview panel and sign-in silently fails, use "Open in new tab" (per environment_truths) rather than reporting an app bug.
browser_urls: none — no client-env NEXT_PUBLIC_*-style keys ship to the browser, and a scan of the served bundle (dist/assets/index-*.js) found no internal-host references (minio/localhost/127.0.0.1/0.0.0.0); every fetch is same-origin (/api/...).
repairs: []
e2e: expected=67 unexpected=0 skipped=0 (full `npx playwright test --workers=1` run this round, own webServer instance on port 3000 after stopping the compose web container to free the port, restarted afterward) — strong provisional-pass signal covering every test below, including audit-trail.spec's own chain-tamper scenario and whole-loop.spec's two full keyboard-only passes (healthy + AI-stopped).
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/CE-2026-000001 returns permitted_decisions [APPROVE, EDIT_APPROVE, REJECT] (all three, no server-side narrowing) and e2e/decision.spec.ts scenario 1 (8/8 green this round) proves none is pre-selected/auto-focused in a real browser. Not independently re-driven over curl (a DOM pre-selection/focus property, not observable via HTTP) — human judgement retained."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: e2e/decision.spec.ts's mandatory-reason and changed-field-marking scenarios passed this round (67/67 full suite green, incl. decision.spec 8/8). Server-side confirmed independently: POST .../decision with resolution_values identical to the proposal marks every value origin AI; the server's trim-then-byte-compare (decision.service.ts) re-stamps a genuinely changed value HUMAN — proven at the db/api tier (196 db + 170 api tests green) and re-walked in the browser this round."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: CE-2026-000003 (decided via APPROVE earlier this round) shows exception.state=RESOLVED, permitted_decisions=[], and decision.resolution_values with per-field origin/prior_origin present in the GET /api/exceptions/{ref} response — exactly the shape the confirmation/read-only record renders from. e2e/decision.spec proves the controls disappear and the confirmation heading takes focus."
    confidence: proven
  - test: 4
    verdict: skipped (needs human)
    note: "🤖 Auto-check: deliberately left CE-2026-000006 (queue position 3, OPEN, AVAILABLE) undecided so the human's own Reject action is the first decision on it — API-level REJECT mechanics (zero decision_values, declined-proposal audit entry) are proven by decision.spec's REJECT scenarios (23 case matrix) and audit.spec, but which case reaches a rejected state is properly the human's action, not pre-seeded."
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: CE-2026-000002 confirmed OPEN with recommendation.status=UNAVAILABLE and permitted_decisions=[EDIT_APPROVE, REJECT] only (no APPROVE) — re-verified by GET after the full e2e run and a container restart, unchanged. e2e/whole-loop.spec.ts scenario 2 (AI-stopped) proves the direct-resolution path end to end in a real browser this round."
    confidence: proven
  - test: 6
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/CE-2026-000003 returns permitted_decisions=[] and a populated decision object; POSTing a second decision to an already-resolved exception is proven refused (409-class ExceptionAlreadyDecided path) by decision.spec's already-decided scenario. DecisionPanel/DecidedRecord wiring (06-03 SUMMARY) renders the read-only record whenever decision is non-null, never the chooser."
    confidence: proven
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/{CE-2026-000003 uuid}/audit returns chain_verified:true with all 5 entries in order (ENTRY_RECEIVED, VALIDATION_COMPLETED, EXCEPTION_OPENED, RECOMMENDATION_GENERATED, RECOMMENDATION_APPROVED); AI entry carries actor:null + model_id, decision entry carries the human actor and reason. audit-trail.spec.ts's 10/10 (incl. its own chain-tamper scenario, run this round) proves the rendered DOM shape: who/when/what-changed, verbatim reason, per-value provenance, and no edit/export control."
    confidence: proven
  - test: 8
    verdict: pass
    note: "🤖 Auto-check: e2e/whole-loop.spec.ts ran this round (part of the 67/67 green full suite) and proves both scenarios — sign in → invalid entry → validation failure → queue → case → decision → audit trail, keyboard-only, in one unbroken session, with a nav-counter asserting no full-page reload during the decision/audit steps. This is the strongest possible provisional-pass signal; the human walk is still the final judge of feel/timing/screen-reader experience the automated suite cannot assess."
    confidence: proven

## Gaps

[none yet]
