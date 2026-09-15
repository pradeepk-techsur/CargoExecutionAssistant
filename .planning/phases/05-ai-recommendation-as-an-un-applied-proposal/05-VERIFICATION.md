---
phase: 05-ai-recommendation-as-an-un-applied-proposal
verified: 2026-09-15T23:29:47Z
status: passed
score: 5/5 must-haves verified
gate_evidence:
  gate_status: passed
  boot_smoke: pass
  review_blockers_open: 0
  waves_green: 5/5
  shadowed_sources: 0
  tests_disabled: none
  compose_web_ai_env_fixed: d328092
---

# Phase 05: AI Recommendation as an Un-Applied Proposal — Verification Report

**Phase Goal:** A cargo specialist reads why the case is open, what the AI recommends and why, with every machine-proposed value marked as the machine's at the moment she is deciding — and the case remains readable and workable when the AI does not answer at all. (Requirements F9, F10.)
**Verified:** 2026-09-15T23:29:47Z
**Status:** passed
**Re-verification:** No — initial verification

## Gate Evidence (mandatory input, cited not re-run)

Per 05-GATE.md and 05-REVIEW.md:

- `gate_status: passed` — all 5 wave gates `npm run build && npm run typecheck` + `npm test` **pass**, fix_attempts 0 across every wave.
- `boot_smoke: pass` — a fresh `docker compose up --build` was boot-smoked green including the F9 recommendation endpoint returning AVAILABLE with AI-origin values on a real deploy (compose `web` service AI env keys fixed this run, commit d328092).
- `review_blockers_open: 0`, `05-REVIEW.md status: clean` — all three iteration-1 WARNINGs (secret-shaped value stranding PENDING; hollow PENDING fabrication; inert `<title>` on aria-hidden icon) confirmed fixed with no fix-introduced regression.
- `shadowed_sources: 0`, `tests_disabled_during_fixes: none`.

Build/tests/boot are therefore treated as proven by the gates and are cited, not re-litigated. This verification adds goal-backward checks that gates do not perform: observable-truth mapping, artifact substance, and stub/wiring inspection.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria 1–5 — the contract)

| # | Truth (Success Criterion) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Opening a case shows typed values, findings in plain language, AI recommendation + rationale, traversable by heading in that order | ✓ VERIFIED | `CaseDetail.tsx` renders h1 then six h2s in normative order (`why-open`, `submitted-entry`, `ai-recommendation`, `your-decision`, `audit-trail` + `On this page`); `api.getCase` on mount (line 145); AVAILABLE branch renders `recommended_action` + rationale split into `<p>` paragraphs (never truncated), findings via `messageForRule` (FR-10.3) |
| 2 | Every AI-proposed value marked AI-originated in text and shape, not colour alone, SR-legible and monochrome-legible | ✓ VERIFIED | `ProvenanceBadge.tsx`: distinct TEXT ("AI-suggested"/"Specialist-entered") + distinct ICON sprite (`settings`/`person`) + USWDS token colours; icon `aria-hidden`, visible label is accessible name. Used per-value in comparison rows (`origin="AI"` line 573, `origin="HUMAN"` lines 332/570). REVIEW W3 confirmed colour-independence intact |
| 3 | Recommendation sits un-applied; no entry value / exception state changed; model id, prompt version, generation time recorded | ✓ VERIFIED | `job.ts` writes ONLY `recommendations`/`recommendation_values` (grep: no `cargo_entries`, no `UPDATE exceptions`, no state mutation); UI states "Nothing here has been applied. It is recorded only if you decide to approve it." (line 545); footnote renders `model_id · prompt_version · generated_at` (FR-10.5, line 591). Architecture proof `aiCapability.spec.ts` proves import-graph absence (mechanism #5) |
| 4 | Submitting an entry never waits on the AI; suggestion catches up with accessible in-progress status, no freeze/trap | ✓ VERIFIED | `dispatchRecommendation: worker.dispatch` seam wired at `index.ts:93` (bounded-concurrency in-process worker, off the request path); PENDING branch renders `aria-busy` `<Loading>` region and polls `api.getRecommendation` every 3s stopping at 60s / terminal status (CaseDetail 412–453) |
| 5 | With AI provider stopped, entry still received, exception still opens, case opens showing "no recommendation available" as a stated condition — not error, not endless spinner, not a reason to park | ✓ VERIFIED | UNAVAILABLE branch renders `<h3>No AI recommendation available</h3>` + `<Degraded>` with all 7 `FAILURE_CONDITIONS` mapped to plain language (FR-10.8); stale PENDING (>60s) also degrades to a stated condition, never an error; boot-smoke confirmed the degrade path on a real deploy; `job.ts` `writeUnavailable` records terminal UNAVAILABLE with correct `failure_reason` while leaving the case fully workable |

**Score:** 5/5 truths verified

### Required Artifacts (23 across 6 plans — all three levels)

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `server/src/ai/provider.ts` | RecommendationProvider interface + result types | ✓ VERIFIED | 91 lines; sole external type surface |
| `server/src/ai/outputSchema.ts` | closed-schema FR-9.7/9.8 validator | ✓ VERIFIED | 81 lines; allowlist (closed schema), not driftable denylist |
| `server/src/ai/fakeProvider.ts` | no-network double, all 7 failure + AVAILABLE branches | ✓ VERIFIED | 79 lines; sentinel-driven branches present |
| `server/src/ai/promptManifest.ts` | digest self-check primitives | ✓ VERIFIED | 60 lines |
| `server/src/config.ts` | AI config + fail-loud self-checks | ✓ VERIFIED | 288 lines; calls `getManifestEntry` + `computeFileDigestSync` (line 224/230) |
| `server/src/db/repositories/recommendations.ts` | idempotent terminal writes | ✓ VERIFIED | 208 lines; `WHERE id=$1 AND status='PENDING'` guard (148/172) |
| `server/src/db/repositories/exceptions.ts` | AI-safe read, no specialist join | ✓ VERIFIED | 294 lines |
| `server/src/db/repositories/entries.ts` | 14 field values, no specialist join | ✓ VERIFIED | 323 lines |
| `server/test/db/recommendationWrite.repo.spec.ts` | idempotence + audit-coupling + privilege wall | ✓ VERIFIED | 437 lines |
| `server/src/http/routes/recommendation.ts` | F9 read-only polling route | ✓ VERIFIED | 86 lines; calls `loadRecommendationDetail` (line 69) |
| `server/src/services/recommendationRead.service.ts` | loadRecommendationDetail | ✓ VERIFIED | 90 lines; `NOT_FOUND` return (REVIEW W2 fix) |
| `server/test/api/recommendation.spec.ts` | polling regression suite | ✓ VERIFIED | 288 lines |
| `server/src/ai/adapter.http.ts` | real HTTPS provider, timeout+retry | ✓ VERIFIED | 269 lines |
| `server/src/ai/job.ts` | per-exception generation job | ✓ VERIFIED | 249 lines; ai-pool read / app-pool write; CONTENT_FILTERED fallback (REVIEW W1 fix) |
| `server/src/ai/worker.ts` | bounded-concurrency dispatcher | ✓ VERIFIED | 55 lines |
| `server/src/index.ts` | dispatchRecommendation wired at boot | ✓ VERIFIED | 128 lines; `dispatchRecommendation: worker.dispatch` (line 93) |
| `server/test/db/generation.job.spec.ts` | outcome branches + idempotence + no-mutation | ✓ VERIFIED | 500 lines |
| `server/test/architecture/aiCapability.spec.ts` | A-1 import-graph absence proof | ✓ VERIFIED | 224 lines; pool.ai importer set proof |
| `web/src/components/ProvenanceBadge.tsx` | shared per-value badge | ✓ VERIFIED | 42 lines; text+icon+token |
| `web/src/screens/CaseDetail.tsx` | F10 case-detail screen | ✓ VERIFIED | 599 lines; 6 h2s, On-this-page nav, 3 status branches |
| `web/src/api/client.ts` | api.getRecommendation | ✓ VERIFIED | 292 lines (line 276) |
| `e2e/case-detail.spec.ts` | F9/F10 Playwright suite | ✓ VERIFIED | 555 lines |
| `docs/a11y/case-detail.md` | NFR-2 signed a11y record | ✓ VERIFIED | 214 lines |

No MISSING, no STUB (all substantive by content + line count), no ORPHANED (all imported and used).

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `config.ts` | `promptManifest.ts` | `getManifestEntry` + `computeFileDigestSync` before return | ✓ WIRED | lines 224, 230 |
| `recommendations.ts` | recommendations table | `WHERE id=$1 AND status='PENDING'` idempotence guard | ✓ WIRED | lines 148, 172 |
| `recommendation.ts` route | `recommendationRead.service` | direct call | ✓ WIRED | `loadRecommendationDetail(deps.pool` line 69 |
| `routes/index.ts` | `recommendation.ts` | buildRoutes composition | ✓ WIRED | import line 31, mounted line 108 |
| `receipt.service` seam | `worker.dispatch` | wired at index.ts | ✓ WIRED | `dispatchRecommendation: worker.dispatch` line 93 |
| `job.ts` | ai/app pools | read ai, write app | ✓ WIRED | `aiPool` reads (58–81), `appPool` tx writes (115, 231) |
| `CaseDetail.tsx` | `api.getCase` | fetch on mount | ✓ WIRED | line 145 |
| `CaseDetail.tsx` | `api.getRecommendation` | 3s poll while PENDING, 60s cap | ✓ WIRED | line 425, timers 412–453 |
| `router.tsx` | `CaseDetail.tsx` | `/cases/:caseReference` route | ✓ WIRED | line 80 |
| `e2e/case-detail.spec.ts` | `e2e/env.ts` | `AI_PROVIDER_URL=fake:deterministic` | ✓ WIRED | env.ts line 60 |

All key links WIRED — no stubs hiding at the seams.

### Requirements Coverage

| Requirement | Status | Notes |
| --- | --- | --- |
| F9 — AI recommendation + rationale, model/prompt identity persisted, degrade to "no recommendation available" on failure | ✓ SATISFIED | Truths 3, 4, 5; boot-smoke confirmed AVAILABLE + degrade paths on real deploy |
| F10 — case detail screen: exception, validation failures, recommendation + rationale, per-value AI origin without colour reliance | ✓ SATISFIED | Truths 1, 2; six-section screen + ProvenanceBadge + On-this-page nav |

### Anti-Patterns Found

None blocking. No TODO/FIXME/PLACEHOLDER in phase files; no `return null`/empty-handler stubs in the AI or UI paths. The "Your decision" and "Audit trail" sections are heading-only Phase-6 placeholders **by design** (Success Criterion in 05-05 explicitly requires them to be heading-only, not functioning controls) — correct scope, not a defect.

### Behavioral Spot-Checks

| Check | Result |
| --- | --- |
| `server/dist/ai/{job,adapter.http,fakeProvider,outputSchema}.js` build output present | ✓ present (gate build) |
| `web/dist/` build output present | ✓ present |
| F9 recommendation endpoint on real compose deploy returns AVAILABLE with AI-origin values | ✓ per gate boot-smoke |
| All 7 `failure_reason` values mapped to plain-language conditions in `FAILURE_CONDITIONS` | ✓ CaseDetail 90–99 |

Execution behavior (build/tests/boot) is proven by phase gates — not re-run here.

### Human Verification Required

None mandatory. Visual/AT aspects (screen-reader announcement distinctness, monochrome legibility, in-page nav focus behavior) are covered by the Playwright `e2e/case-detail.spec.ts` suite and the signed `docs/a11y/case-detail.md` NFR-2 record, both green under the gates.

### Deferred Items — Confirmed Closed

Both `deferred-items.md` entries are resolved and do not affect this phase's goal:
- Compose `web` service missing AI env keys → **fixed this run (commit d328092)**, fresh `docker compose up --build` boot-smoked green.
- `config.spec.ts`/`headers.spec.ts` transient failures from a parallel wave-1 config change → all 5 wave gates now show `tests: pass`.

### Gaps Summary

No gaps. All 5 ROADMAP Success Criteria (F9/F10) are met by substantive, wired artifacts; every key link is connected; gate evidence is fully green (build, tests, boot-smoke, clean review). The phase goal is achieved: the specialist can read why the case is open, what the AI recommends and why, with every machine-proposed value marked as the machine's, and the case remains readable and workable when the AI does not answer.

---

_Verified: 2026-09-15T23:29:47Z_
_Verifier: Claude (pivota_spec-verifier)_
