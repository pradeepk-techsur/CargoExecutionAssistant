---
status: diagnosed
phase: 05-ai-recommendation-as-an-un-applied-proposal
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md
started: 2026-09-16T01:14:00Z
updated: 2026-09-16T01:21:00Z
---

## Current Test

[testing complete]

## Tests

### 4. Case Opens Immediately While AI Recommendation Catches Up
expected: A newly-submitted invalid entry opens its case immediately (you are not blocked waiting on the AI); the recommendation section shows an accessible in-progress state that resolves to a result shortly after, without freezing the screen or trapping you on the case.
result: issue
reported: "I opened /entries/new directly and it showed the placeholder"
severity: major

## Summary

total: 1
passed: 0
issues: 1
pending: 0
skipped: 0

## Self-Check

boot: 302 (auth redirect — server up, db+web compose services healthy)
data: seeded 2 preconditions this round (fresh sandbox DB was empty — case CE-2026-000001 with a single RIV-032 port_of_entry_code=9999 finding, AI resolved AVAILABLE; case CE-2026-000002 with goods_description=__FAKE_AI_UNAVAILABLE__ sentinel, AI resolved UNAVAILABLE/PROVIDER_UNAVAILABLE) via the app's real POST /api/entries path — no seed file exists or is wanted in this repo (PRD §10 #7 explicitly excludes seed data); data lives only in the running instance
routes_probed: 6 ok / 0 failed
cookie: iframe-hostile: SameSite=Lax Secure=absent
browser_urls: 0 gaps / 0 advisories
repairs: []
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: source confirmed byte-identical to the prior SECURED round (`git diff 7b11e2f -- web/src/screens/CaseDetail.tsx` empty). Freshly re-seeded CE-2026-000001: GET /api/exceptions/CE-2026-000001 and GET /api/exceptions/{exception uuid} return byte-identical 200 bodies with exception (state OPEN), entry.values (13 typed fields), validation.findings (RIV-032 'Port of entry code 9999 is not a recognised port code.'), recommendation (status AVAILABLE). Not re-asked this round — carried forward as unchanged per the numbering rule; only test 4 is presented."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: recommendation.proposed_values on the freshly re-seeded CE-2026-000001 carries {field_name: port_of_entry_code, proposed_value: 'Corrected value for port_of_entry_code', origin: AI}, distinct from the specialist's submitted '9999' (origin HUMAN). ProvenanceBadge.tsx unchanged since the prior round. Not re-asked this round."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: CE-2026-000001 remains state=OPEN, permitted_decisions=[APPROVE, EDIT_APPROVE, REJECT] after the recommendation resolved to AVAILABLE — nothing auto-applied. recommendation.model_id=demo-fake-model, prompt_version=2026.09.1, generated_at present. job.ts unchanged (0 diff since prior SECURED audit). Not re-asked this round."
    confidence: proven
  - test: 4
    verdict: fail
    note: "🤖 Auto-check: re-confirmed the SAME gap as both prior UAT rounds — web/src/app/router.tsx lines 77-78 still map /entries/new to <NotBuiltYet title=\"New cargo entry\" />; web/src/screens/NotBuiltYet.tsx still renders the literal text \"This screen is not available in this build.\" `git diff` against the last SECURED commit (7b11e2f) shows zero changes to router.tsx or NotBuiltYet.tsx. This is the pre-existing, already-diagnosed Phase 3 gap (03-09/03-10 never authored), deferred per deferred-items.md — carried forward, not a new finding. Presented to the human this round because it is the only test whose truth has not already been re-confirmed unchanged."
    confidence: proven
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: freshly-seeded CE-2026-000002 (goods_description exactly '__FAKE_AI_UNAVAILABLE__', matched by fakeProvider.ts's strict-equality sentinel, unchanged since prior round) resolved to recommendation status=UNAVAILABLE, failure_reason=PROVIDER_UNAVAILABLE, with exception.state still OPEN and entry/findings fully present in the same response body. Not re-asked this round."
    confidence: proven
  - test: 6
    verdict: skipped (needs human)
    note: "🤖 Auto-check: cannot drive in-page anchor navigation + viewport scroll assertions over curl; source unchanged since 05-06's e2e/case-detail.spec.ts (10/10 passing, confirmed still green as of the last SECURED audit with zero implementation drift). Not re-asked this round."
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/{uuid} and GET /api/exceptions/CE-2026-000001 return byte-identical 200 response bodies against the freshly re-seeded case. CaseDetail.tsx's uuid→case-reference navigate(...,{replace:true}) swap unchanged since the prior round's e2e proof. Not re-asked this round."
    confidence: proven

## Gaps

- truth: "A newly-submitted invalid entry opens its case immediately, letting the specialist see the recommendation catch up without being blocked"
  status: deferred
  reason: "User reported: \"I opened /entries/new directly and it showed the placeholder\" — confirming the auto-check (self_check) finding re-confirmed this round: /entries/new still maps to NotBuiltYet, rendering \"This screen is not available in this build.\" Zero source drift since the prior SECURED audit (git diff 7b11e2f -- web/src/app/router.tsx web/src/screens/NotBuiltYet.tsx is empty). Cross-phase gap — owner is Phase 3 (plans 03-09/03-10, never authored), not Phase 5; no gap-closure plan created here per the SCOPE BOUNDARY rule. Already recorded in deferred-items.md across two prior UAT rounds."
  severity: major
  test: 4
  source: self_check
  confidence: proven
  root_cause: "The /entries/new route is wired in web/src/app/router.tsx (lines 77-78) to the NotBuiltYet placeholder instead of an assembled cargo-entry entry form. This is a pre-existing Phase 3 gap, not a Phase 5 defect: the assembled screen was scheduled as Phase 3 plans 03-09/03-10, which were never authored (only 03-01..03-08 exist), and 03-VERIFICATION.md already documented this exact gap before Phase 5 began. Phase 5's only router.tsx change (05-05-PLAN.md) was explicitly scoped to /cases/:caseReference and explicitly instructed NOT to touch /entries/new. Re-verified live this round against a freshly re-seeded case: GET /entries/new still resolves to the NotBuiltYet placeholder client route with zero source drift since the last two UAT rounds and the SECURED security audit."
  artifacts:
    - path: "web/src/app/router.tsx"
      issue: "Lines 77-78: /entries/new maps to <NotBuiltYet title=\"New cargo entry\" />, not an assembled entry-form screen."
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
