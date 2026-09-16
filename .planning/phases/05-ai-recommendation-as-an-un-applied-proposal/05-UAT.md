---
status: complete
phase: 05-ai-recommendation-as-an-un-applied-proposal
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md
started: 2026-09-16T01:27:45Z
updated: 2026-09-16T01:58:16Z
---

## Current Test

[testing complete]

## Tests

### 4. Case Opens Immediately While AI Recommendation Catches Up
expected: A newly-submitted invalid entry opens its case immediately (you are not blocked waiting on the AI); the recommendation section shows an accessible in-progress state that resolves to a result shortly after, without freezing the screen or trapping you on the case.
result: pass

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0

## Self-Check

boot: 302 (auth redirect — server up, db+web compose services healthy)
data: seeded 2 preconditions this round (fresh sandbox DB was empty again — case CE-2026-000001 with a single confirmatory RIV-032 port_of_entry_code=9999 finding among 5 findings, AI resolved AVAILABLE; case CE-2026-000002 with goods_description=__FAKE_AI_UNAVAILABLE__ sentinel, AI resolved UNAVAILABLE/PROVIDER_UNAVAILABLE) via the app's real POST /api/entries path — no seed file exists or is wanted in this repo (PRD §10 #7 explicitly excludes seed data); data lives only in the running instance
routes_probed: 6 ok / 0 failed
cookie: iframe-hostile: SameSite=Lax Secure=absent
browser_urls: 0 gaps / 0 advisories
repairs: []
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: source confirmed byte-identical to the prior round (git status clean, HEAD unchanged at 53761af — the SECURED security-audit commit, no new commits since). Freshly re-seeded CE-2026-000001: GET /api/exceptions/CE-2026-000001 and GET /api/exceptions/{uuid} return byte-identical 200 bodies with exception (state OPEN), entry.values (14 typed fields), validation.findings (5 findings incl. RIV-032 'Port of entry code 9999 is not a recognised port code.'), recommendation (status AVAILABLE). Not re-asked this round — carried forward as unchanged."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: recommendation.proposed_values on the freshly re-seeded CE-2026-000001 carries 5 AI-origin proposed values (e.g. {field_name: port_of_entry_code, proposed_value: 'Corrected value for port_of_entry_code', origin: AI}), distinct from the specialist's submitted values (origin HUMAN in field_origins). ProvenanceBadge.tsx unchanged (HEAD unchanged). Not re-asked this round."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: CE-2026-000001 remains state=OPEN, permitted_decisions=[APPROVE, EDIT_APPROVE, REJECT] after the recommendation resolved to AVAILABLE — nothing auto-applied. recommendation.model_id=demo-fake-model, prompt_version=2026.09.1, generated_at present. job.ts unchanged (HEAD unchanged since prior audit). Not re-asked this round."
    confidence: proven
  - test: 4
    verdict: advisory
    note: "🤖 Auto-check: /entries/new still maps to NotBuiltYet (web/src/app/router.tsx lines 77-78; HEAD unchanged at 53761af since the prior SECURED commit) — the same pre-existing, already-diagnosed Phase 3 gap as all three prior UAT rounds (03-09/03-10 never authored), out of Phase 5's declared scope (05-05's only router.tsx touch was explicitly scoped to /cases/:caseReference). The mechanism this test actually probes — a case opening immediately while the AI recommendation resolves without blocking — is independently proven working via POST /api/entries (see `data:` line): case opens with a 201 and case_reference immediately, recommendation resolves PENDING→AVAILABLE/UNAVAILABLE seconds later, exception stays OPEN throughout. Surfaced to the human as context on test 4; the human passed the test with that context."
    confidence: proven
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: freshly-seeded CE-2026-000002 (goods_description exactly '__FAKE_AI_UNAVAILABLE__', matched by fakeProvider.ts's strict-equality sentinel, unchanged) resolved to recommendation status=UNAVAILABLE, failure_reason=PROVIDER_UNAVAILABLE, with exception.state still OPEN and entry/findings fully present in the same response body. Not re-asked this round."
    confidence: proven
  - test: 6
    verdict: skipped (needs human)
    note: "🤖 Auto-check: cannot drive in-page anchor navigation + viewport scroll assertions over curl; source unchanged since 05-06's e2e/case-detail.spec.ts (10/10 passing at last full test:all run, zero implementation drift since — HEAD unchanged). Not re-asked this round."
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: GET /api/exceptions/{uuid} and GET /api/exceptions/CE-2026-000001 return byte-identical 200 response bodies against the freshly re-seeded case (verified this round: diff of both bodies is empty). CaseDetail.tsx's uuid→case-reference navigate(...,{replace:true}) swap unchanged since the prior round's e2e proof. Not re-asked this round."
    confidence: proven

## Gaps

[none this round — 1/1 passed. The pre-existing /entries/new → NotBuiltYet gap
(Phase 3 scope, plans 03-09/03-10 never authored) remains tracked in
`.planning/phases/05-ai-recommendation-as-an-un-applied-proposal/deferred-items.md`
and in `03-VERIFICATION.md`; not re-opened here per the SCOPE BOUNDARY rule —
see the note under `## Summary` above.]
