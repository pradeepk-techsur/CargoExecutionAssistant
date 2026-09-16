---
status: complete
phase: 05-ai-recommendation-as-an-un-applied-proposal
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md
started: 2026-09-15T23:43:17Z
updated: 2026-09-16T00:12:00Z
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
reported: "clicking \"New Cargo Entry\" shows the message \"This screen is not available in this build\""
severity: major

### 5. Case Shows "No Recommendation Available" When AI Fails
expected: Opening case CE-2026-000002 (AI provider forced to fail) shows a plainly stated "no recommendation available" condition in the AI recommendation section — never an error screen, never an endless spinner — and the rest of the case (entry, findings) is still fully readable.
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
data: seeded 2 preconditions (case CE-2026-000001 AVAILABLE recommendation; case CE-2026-000002 UNAVAILABLE recommendation) via the app's real POST /api/entries path — no seed file exists or is wanted in this repo (PRD §10 #7 explicitly excludes seed data); data lives only in the running instance
routes_probed: 5 ok / 0 failed
cookie: iframe-hostile: SameSite=Lax Secure=absent
browser_urls: 0 gaps / 1 advisory
browser_urls_detail:
  - origin: localhost:3000
    tier: advisory
    emitted_by: "client-env PUBLIC_ORIGIN (.env, .env.example, docker-compose.yml)"
    sample: "http://localhost:3000"
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/CE-2026-000001 (both by uuid e74c4a63-f4cd-4ea0-9127-179f8bf0352d and by case_reference) returns identical 200 bodies containing exception (state OPEN), entry.values (all 13 typed fields), validation.findings (RIV-032 PORT_OF_ENTRY_UNKNOWN, plain-language message), and recommendation (status AVAILABLE, recommended_action + rationale text present). CaseDetail.tsx renders h1 then h2s in the order why-open / submitted-entry / ai-recommendation / your-decision / audit-trail, each fetched via api.getCase on mount."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: recommendation.proposed_values on CE-2026-000001 carries {field_name: port_of_entry_code, proposed_value: \"Corrected value for port_of_entry_code\", origin: AI}, distinct from the specialist's originally-submitted \"9999\" (origin HUMAN in entry.field_origins). ProvenanceBadge.tsx renders each with distinct text (AI-suggested / Specialist-entered), a distinct USWDS sprite icon (settings/person), and a distinct token colour pair — verified in source, not colour-only."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: case CE-2026-000001 remains state=OPEN with decision=null and permitted_decisions=[APPROVE, EDIT_APPROVE, REJECT] after the recommendation resolved — nothing was auto-applied. The recommendation response carries model_id=demo-fake-model, prompt_version=2026.09.1, generated_at=2026-09-15T23:45:50.011Z. job.ts writes only to recommendations/recommendation_values (no cargo_entries or exceptions mutation), architecturally proven by aiCapability.spec.ts."
    confidence: proven
  - test: 4
    verdict: advisory
    note: "🤖 Auto-check: both seeded entries returned 201 EXCEPTION_OPENED immediately from POST /api/entries, and dispatchRecommendation is wired off the request path (server/src/index.ts, worker.dispatch) so the API response never waits on the AI job — confirmed by recommendationDispatch.spec.ts. However, this sandbox's AI_PROVIDER_URL=fake:deterministic resolves synchronously with no network delay, so a live PENDING state is not observable at rest — by the time either POST returned, the recommendation had already reached AVAILABLE/UNAVAILABLE. The in-progress UI (poll-in-place, aria-busy Loading region, 3s cadence capped at 60s) exists in CaseDetail.tsx (lines ~412-453) but could not be visually exercised in this environment; this is a fake-provider timing characteristic, not a defect. The human tester may or may not be able to catch the PENDING state depending on browser timing."
    confidence: hypothesis
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: case CE-2026-000002 (seeded with goods_description containing the FAKE_AI_TRIGGERS PROVIDER_UNAVAILABLE sentinel) resolved to recommendation status=UNAVAILABLE, failure_reason=PROVIDER_UNAVAILABLE. CaseDetail.tsx's UNAVAILABLE branch renders a stated 'No AI recommendation available' heading + Degraded component, never an ErrorState, per the FAILURE_CONDITIONS map covering all 7 provider failure reasons."
    confidence: proven
  - test: 6
    verdict: pass
    note: "🤖 Auto-check: CaseDetail.tsx renders exactly 5 native #fragment 'On this page' links targeting 5 <h2 id> sections (why-open, submitted-entry, ai-recommendation, your-decision, audit-trail); proven resolving in a real browser by e2e/case-detail.spec.ts (click + toBeInViewport assertion), 10/10 passing per the 05-06 summary."
    confidence: proven
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/e74c4a63-f4cd-4ea0-9127-179f8bf0352d and GET /api/exceptions/CE-2026-000001 return byte-identical 200 response bodies. CaseDetail.tsx performs the uuid→case-reference swap via react-router navigate(...,{replace:true}) — no reload, no focus move — proven by case-detail.spec.ts's canonicalisation test."
    confidence: proven

## Gaps

- truth: "A newly-submitted invalid entry opens its case immediately, letting the specialist see the recommendation catch up without being blocked"
  status: failed
  reason: "User reported: clicking \"New Cargo Entry\" shows the message \"This screen is not available in this build\""
  severity: major
  test: 4
  source: user
  confidence: hypothesis
  artifacts: []
  missing: []
  debug_session: ""

[The pre-existing iframe-hostile cookie default (SameSite=Lax, no Secure) was already diagnosed and recorded in Phase 2's UAT (02-UAT.md) as a deployment-configuration default, not a Phase 5 code defect; not re-opened here. Workaround for testing in the embedded Preview: use "Open in new tab", or proceed directly against the sandbox as this self-check did.]
