---
status: diagnosed
phase: 05-ai-recommendation-as-an-un-applied-proposal
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md
started: 2026-09-16T00:52:10Z
updated: 2026-09-16T01:03:26Z
---

## Current Test

[testing complete]

## Tests

### 1. Case Detail Screen Shows Entry, Findings, and AI Recommendation in Order
expected: Opening case CE-2026-000001 shows the header, then in-page nav, then "Why this case is open" (finding: port of entry code 9999 not recognised), then "Submitted entry" (all typed values), then "AI recommendation" (recommended action + rationale) — in that heading order.
result: pass

### 2. AI-Suggested Values Marked Distinct from Specialist-Entered Values
expected: On case CE-2026-000001, the AI's proposed correction for "Port of entry code" is visibly marked "AI-suggested" (with its own icon/label), and the specialist's originally-typed value is marked "Specialist-entered" — distinguishable by text and icon, not by colour alone.
result: pass

### 3. AI Recommendation Sits Un-Applied
expected: On case CE-2026-000001, the recommendation is presented as a proposal only — the case is still OPEN, no field has actually been changed, and the screen states plainly that nothing has been applied. The model identity, prompt version, and generation time are shown.
result: pass

### 4. Case Opens Immediately While AI Recommendation Catches Up
expected: A newly-submitted invalid entry opens its case immediately (you are not blocked waiting on the AI); the recommendation section shows an accessible in-progress state that resolves to a result shortly after, without freezing the screen or trapping you on the case.
result: issue
reported: "Fail — confirmed, same known issue (user confirmed the auto-check's finding that /entries/new still shows \"This screen is not available in this build.\")"
severity: major

### 5. Case Shows "No Recommendation Available" When AI Fails
expected: Opening case CE-2026-000003 (AI provider forced to fail) shows a plainly stated "no recommendation available" condition in the AI recommendation section — never an error screen, never an endless spinner — and the rest of the case (entry, findings) is still fully readable.
result: pass

### 6. "On This Page" In-Page Navigation Resolves to Correct Sections
expected: On case CE-2026-000001, an "On this page" list of links appears right after the header, one per section. Clicking each link moves you to that section's heading.
result: pass

### 7. URL Canonicalizes from UUID to Case Reference
expected: Opening the case by its raw uuid in the address bar replaces the URL with the case-reference form (CE-2026-000001) automatically, without a full page reload or losing your place on the page.
result: pass

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Self-Check

boot: 302 (auth redirect — server up, db+web compose services healthy)
data: seeded 2 preconditions this round (case CE-2026-000001 AVAILABLE recommendation — re-confirmed still present from prior round's seed; case CE-2026-000003 UNAVAILABLE/PROVIDER_UNAVAILABLE recommendation, newly seeded — CE-2026-000002 also exists as a harmless AVAILABLE-recommendation leftover from an intermediate seeding attempt, not used by any test) via the app's real POST /api/entries path — no seed file exists or is wanted in this repo (PRD §10 #7 explicitly excludes seed data); data lives only in the running instance
routes_probed: 5 ok / 0 failed
cookie: iframe-hostile: SameSite=Lax Secure=absent
browser_urls: 0 gaps / 1 advisory
browser_urls_detail:
  - origin: localhost:3000
    tier: advisory
    emitted_by: "server-side config PUBLIC_ORIGIN (.env, .env.example) — read only by server/src/config.ts for cookie/CSP posture, never shipped to the browser bundle"
    sample: "http://localhost:3000"
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/CE-2026-000001 (both by uuid dbcaced2-3bd4-4001-9315-98d78b399b34 and by case_reference) returns byte-identical 200 bodies containing exception (state OPEN), entry.values (13 typed fields), validation.findings (RIV-032 PORT_OF_ENTRY_UNKNOWN, plain-language message 'Port of entry code 9999 is not a recognised port code.'), and recommendation (status AVAILABLE, model_id demo-fake-model, proposed_values present). CaseDetail.tsx renders h1 then h2s in the fixed order why-open / submitted-entry / ai-recommendation / your-decision / audit-trail (source unchanged since 05-VERIFICATION.md)."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: recommendation.proposed_values on CE-2026-000001 carries {field_name: port_of_entry_code, proposed_value: \"Corrected value for port_of_entry_code\", origin: AI, addresses_rule_ids: [RIV-032]}, distinct from the specialist's originally-submitted \"9999\" (origin HUMAN). ProvenanceBadge.tsx (unchanged since verification) renders each with distinct text (AI-suggested / Specialist-entered), a distinct USWDS sprite icon (settings/person), and a distinct token colour pair."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: case CE-2026-000001 remains state=OPEN with permitted_decisions=[APPROVE, EDIT_APPROVE, REJECT] after the recommendation resolved — nothing auto-applied. Recommendation carries model_id=demo-fake-model, prompt_version=2026.09.1. job.ts (unchanged) writes only recommendations/recommendation_values, architecturally proven absent from cargo_entries/exceptions mutation by aiCapability.spec.ts."
    confidence: proven
  - test: 4
    verdict: fail
    note: "🤖 Auto-check: re-confirmed the SAME gap as the prior UAT round — GET /entries/new (authenticated) still renders NotBuiltYet's literal text via router.tsx lines 77-79, unchanged since the prior round (git HEAD 9f367e0, no commits since). This is the pre-existing, already-diagnosed Phase 3 gap (03-09/03-10 never authored), deferred per deferred-items.md — carried forward, not a new finding."
    confidence: proven
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: newly-seeded case CE-2026-000003 (goods_description exactly '__FAKE_AI_UNAVAILABLE__', matched by fakeProvider.ts's strict-equality sentinel) resolved to recommendation status=UNAVAILABLE, failure_reason=PROVIDER_UNAVAILABLE, with exception.state still OPEN and entry/findings fully present in the same response body. CaseDetail.tsx's UNAVAILABLE branch (unchanged) renders a stated 'No AI recommendation available' heading + Degraded component, never ErrorState."
    confidence: proven
  - test: 6
    verdict: skipped (needs human)
    note: "🤖 Auto-check: cannot drive in-page anchor navigation + viewport scroll assertions over curl; source unchanged since 05-06's e2e/case-detail.spec.ts (10/10 passing per that SUMMARY) proved 5 links resolve to 5 matching h2 sections in a real browser. Human judgement retained for this round."
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/dbcaced2-3bd4-4001-9315-98d78b399b34 and GET /api/exceptions/CE-2026-000001 return byte-identical 200 response bodies this round too. CaseDetail.tsx's uuid→case-reference navigate(...,{replace:true}) swap is unchanged since the prior round's e2e proof."
    confidence: proven

## Gaps

- truth: "A newly-submitted invalid entry opens its case immediately, letting the specialist see the recommendation catch up without being blocked"
  status: deferred
  reason: "Auto-check (self_check) re-confirmed: clicking/opening \"New Cargo Entry\" (/entries/new) still shows \"This screen is not available in this build.\" No code has changed for this route since the prior UAT round (same commit 9f367e0). Cross-phase gap — owner is Phase 3 (plans 03-09/03-10, never authored), not Phase 5; no gap-closure plan created here per the SCOPE BOUNDARY rule. Already recorded in deferred-items.md."
  severity: major
  test: 4
  source: self_check
  confidence: proven
  root_cause: "The /entries/new route is wired in web/src/app/router.tsx (lines 76-79) to the NotBuiltYet placeholder instead of an assembled cargo-entry entry form. This is a pre-existing Phase 3 gap, not a Phase 5 defect: the assembled screen was scheduled as Phase 3 plans 03-09/03-10, which were never authored (only 03-01..03-08 exist), and 03-VERIFICATION.md already documented this exact gap before Phase 5 began. Phase 5's only router.tsx change (05-05-PLAN.md) was explicitly scoped to /cases/:caseReference and explicitly instructed NOT to touch /entries/new. Re-verified live this round: GET /entries/new (authenticated) still returns NotBuiltYet's literal placeholder text."
  artifacts:
    - path: "web/src/app/router.tsx"
      issue: "Lines 76-79: /entries/new maps to <NotBuiltYet title=\"New cargo entry\" />, not an assembled entry-form screen."
    - path: "web/src/screens/NotBuiltYet.tsx"
      issue: "Transitional placeholder occupying /entries/new; renders the exact reported text \"This screen is not available in this build.\""
    - path: ".planning/phases/03-receive-validate-except/03-VERIFICATION.md"
      issue: "Pre-dates Phase 5 UAT; documents this same gap as unauthored plans 03-09/03-10 under its own success criteria 1-3."
    - path: ".planning/phases/05-ai-recommendation-as-an-un-applied-proposal/deferred-items.md"
      issue: "Already records this exact gap as deferred to Phase 3 gap-closure (owner = author 03-09/03-10), not fixable within Phase 5's scope."
  missing:
    - "The assembled cargo-entry screen at /entries/new (Phase 3 plans 03-09/03-10) composing the existing UswdsForm primitives + api.createEntry into a real, submittable form."
  debug_session: ".planning/debug/case-opens-immediately-while-ai-catches-up.md"

[The pre-existing iframe-hostile cookie default (SameSite=Lax, no Secure) was already diagnosed and recorded in Phase 2's UAT (02-UAT.md) as a deployment-configuration default, not a Phase 5 code defect; not re-opened here. Workaround for testing in the embedded Preview: use "Open in new tab", or proceed directly against the sandbox as this self-check did.]
