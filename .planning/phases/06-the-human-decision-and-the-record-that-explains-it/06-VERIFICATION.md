---
phase: 06-the-human-decision-and-the-record-that-explains-it
verified: 2026-09-16T12:31:42Z
status: passed
score: 5/5 success criteria verified
gate_evidence:
  gate_status: passed
  boot_smoke: pass
  review_blockers_open: 0
  shadowed_sources: 0
  tests_disabled: none
  test_all: "883 tests (297 unit, 196 db, 170 api, 153 arch, 67 e2e), 0 failures, 0 skipped @ 06-05"
---

# Phase 6: The Human Decision and the Record That Explains It — Verification Report

**Phase Goal:** A cargo specialist edits, approves or rejects the recommendation with a reason the record keeps, and then reads the whole story of the case inside the case — **closing the governed loop end to end** — with no path by which anything resolves without her. (Requirements F11, F12, F14.)
**Verified:** 2026-09-16T12:31:42Z
**Status:** passed
**Re-verification:** No — initial verification

## Gate Evidence (mandatory input, cited not re-litigated)

The phase gate (`06-GATE.md`) and code review (`06-REVIEW.md`) are both green and are treated as authoritative for build/test/boot outcomes:

- `gate_status: passed` — five waves gated (four wave gates + final regression gate), every wave `build: pass`, `tests: pass`, `fix_attempts: 0`.
- `boot_smoke: pass` — the whole stack boots.
- `review_blockers_open: 0` — review status `clean`, 0 blockers, 0 warnings (iteration 2 verified both prior WARNINGs fixed by reading the applied code).
- `shadowed_sources: 0`, `tests_disabled_during_fixes: none`.
- `npm run test:all` green at 06-05: **883 tests (297 unit, 196 db, 170 api, 153 arch, 67 e2e), 0 failures, 0 skipped.**

Per protocol, these proven facts are cited, not re-run. Independent verification below focuses on goal-backward artifact/wiring/behavior checks.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria 1–5)

| # | Success Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Approve/Edit/Reject presented as three equal actions, nothing pre-selected; edit & reject refuse without a substantive reason (inline, announced, focus-managed error) | ✓ VERIFIED | `DecisionPanel.tsx` renders three controls with no autofocus/pre-selection; `continueToSummary` reason gate (≥10 chars) emits an inline error carrying `controlId: 'decision-reason'` (live `#decision-reason` textarea, lines 551/590), announced via `announceError`. Server enforces `REASON_MIN = 10` (`decision.service.ts:151`, `validateReason`). Regression: `decision.spec.ts` §5 tests empty/whitespace/too-short/absent → 422 REASON_REQUIRED, case stays OPEN, no audit entry. |
| 2 | After edit-and-approve, record says field-by-field which values became hers vs the machine's; she sees what will be recorded before and after | ✓ VERIFIED | Provenance computed **server-side only**: `decision.service.ts:399` `origin: (changed ? 'HUMAN' : 'AI')`, `changed_from_proposal: changed`; client value never accepted. Pre-submission summary panel + confirmation panel built from the server's 201 response in `DecisionPanel.tsx`. Regression: `decision.spec.ts` §4 — EDIT_APPROVE changing 1 of 3 values ⇒ that field HUMAN, other two AI, prior_value populated on all three. |
| 3 | Audit trail read inside the case answers who/what-AI/what-human/why, in full, before/after + verbatim reason, no export/query tool/second system, no edit/correct/delete affordance | ✓ VERIFIED | `AuditTrailRegion.tsx` renders every event in server order, oldest first, reason verbatim; header + code assert NO button/link/print/download/export/repair affordance ("record cannot be edited or deleted", line 229). Integrity surfaced via `IntegrityStatement` (chain_verified, first_divergence_sequence) with `role="alert"`, no repair action. Wired to `api.getAuditTrail` → `GET /audit` → `loadAuditTrailResponse` → `readCaseTrail` (read-only). Regression: `audit-trail.spec.ts` (541 lines). |
| 4 | Nothing resolves without her: no worker/scheduler/retry/batch/API can move an exception out of OPEN without her authenticated decision; a second decision is refused with a clear statement, not a silent overwrite | ✓ VERIFIED | `decision.service.ts` holds the **one** permitted `UPDATE exceptions` (line 329, guarded, `decided_by` from `deps.principal.id` only). `ExceptionAlreadyDecidedError` (409) names existing decision's type/decider/timestamp. Arch tests enforce it: `receiptPaths.spec.ts` test 6 asserts route table = 10 and `POST …/decision` is the ONLY state-changing exception route; the UPDATE-exceptions allowlist names `decision.service.ts` alone. Regression: `decision.spec.ts` already-decided + concurrency + CSRF/auth tests. |
| 5 | Complete loop walked in one unbroken keyboard-only browser session with hand-created data, and walked again with the AI provider stopped, still producing a full audit record | ✓ VERIFIED | `e2e/whole-loop.spec.ts` (501 lines): two passes — healthy (`fake:deterministic`) and AI-stopped (`FAKE_AI_TRIGGERS.PROVIDER_UNAVAILABLE` marker forcing the UNAVAILABLE branch). Keyboard-only discipline (Tab/Enter, no load-bearing `.click()`); sign-in through the real form; both passes assert a full decidable, auditable record. Wired to `e2e/env.ts` (`AI_PROVIDER_URL=fake:deterministic`). Counted in the green e2e suite (67 e2e). |

**Score:** 5/5 truths verified

### Required Artifacts (all three levels: exists · substantive · wired)

| Artifact | Provides | Status | Details |
| --- | --- | --- | --- |
| `contract/src/dto.ts` | Decision + Audit DTOs (`changed_from_proposal`, `AuditTrailResponse`…) | ✓ VERIFIED | 353 lines; server tsc exit 0 |
| `server/src/db/repositories/decisions.ts` | write path (insertDecision, insertDecisionValues, loadDecisionByIdempotencyKey) | ✓ VERIFIED | 251 lines |
| `server/src/services/decision.service.ts` | F11 transaction — the ONLY writer of decisions/decision_values + exceptions.state/closed_at/decision_id | ✓ VERIFIED | 611 lines; single guarded `UPDATE exceptions`; server-side provenance |
| `server/src/http/routes/decision.ts` | POST /api/exceptions/:id/decision | ✓ VERIFIED | 278 lines; calls `recordDecision` (line 134) |
| `server/test/api/decision.spec.ts` | permanent F11 regression suite | ✓ VERIFIED | 536 lines; covers reason gate, HUMAN/AI, already-decided, idempotency |
| `server/src/http/routes/audit.ts` | GET /api/exceptions/:id/audit | ✓ VERIFIED | 87 lines; calls `loadAuditTrailResponse` |
| `server/test/api/audit.spec.ts` | F13/F14-backend regression suite | ✓ VERIFIED | 426 lines |
| `web/src/components/DecisionPanel.tsx` | F12 decision region (chooser/edit/reject/summary/confirmation) | ✓ VERIFIED | 764 lines; reviewed clean (iteration 2) |
| `web/src/api/client.ts` | api.postDecision + api.getAuditTrail | ✓ VERIFIED | 345 lines |
| `e2e/decision.spec.ts` | decision-region Playwright suite | ✓ VERIFIED | 437 lines |
| `web/src/components/AuditTrailRegion.tsx` | F14 audit trail region | ✓ VERIFIED | 414 lines; no mutation affordances |
| `e2e/audit-trail.spec.ts` | audit-region Playwright suite | ✓ VERIFIED | 541 lines |
| `web/src/screens/CaseDetail.tsx` | hosts both regions, caseVersion refresh | ✓ VERIFIED | 724 lines |
| `web/src/app/router.tsx` | /cases/:ref/audit deep link | ✓ VERIFIED | 93 lines; `focusAuditTrail` route |
| `e2e/whole-loop.spec.ts` | criterion-5 keyboard-only walkthrough ×2 | ✓ VERIFIED | 501 lines |
| `e2e/env.ts` | AI provider env for both passes | ✓ VERIFIED | 65 lines |
| `docs/a11y/case-detail.md` | re-signed NFR-2 record (decision + audit regions) | ✓ VERIFIED | 440 lines; Phase 6 re-sign section |
| `docs/uswds-conformance-register.md` | append-only conformance register | ✓ VERIFIED | 103 lines |

No MISSING, no STUB, no ORPHANED artifacts.

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| routes/decision.ts | decision.service:recordDecision | direct call (line 134) | ✓ WIRED |
| decision.service.ts | audit/writer:append | `append(tx, …)` inside the closing transaction (line 339) | ✓ WIRED |
| routes/index.ts | decisionRoutes + auditRoutes | imported (32/33) + registered in buildRoutes (115/120) | ✓ WIRED |
| routes/audit.ts | auditRead.service:loadAuditTrailResponse | direct call (line 71) | ✓ WIRED |
| auditRead.service | readCaseTrail | extended existing F13 reader (line 236) | ✓ WIRED |
| CaseDetail.tsx | DecisionPanel | `<DecisionPanel` (line 405) | ✓ WIRED |
| DecisionPanel.tsx | api.postDecision | `api.postDecision(…)` on Record decision (line 300) | ✓ WIRED |
| CaseDetail.tsx | AuditTrailRegion | `<AuditTrailRegion refreshToken={caseVersion}` (line 436) | ✓ WIRED |
| router.tsx | CaseDetail(focusAuditTrail) | `/cases/:caseReference/audit` (line 85) | ✓ WIRED |
| AuditTrailRegion.tsx | api.getAuditTrail | `api.getAuditTrail(exceptionId)` (line 181) | ✓ WIRED |
| whole-loop.spec.ts | env.ts | `FAKE_AI_TRIGGERS.PROVIDER_UNAVAILABLE` / `AI_PROVIDER_URL=fake:deterministic` | ✓ WIRED |

### Requirements Coverage

| Requirement | Status | Notes |
| --- | --- | --- |
| F11 — human decision processing (API) | ✓ SATISFIED | recordDecision is the sole decision writer; truths 1,2,4 |
| F12 — decision web UI with reason capture | ✓ SATISFIED | DecisionPanel; truths 1,2 |
| F14 — per-case audit trail web UI | ✓ SATISFIED | AuditTrailRegion; truth 3 — **loop closes** |
| NFR-4 per-value re-stamping | ✓ SATISFIED | HUMAN/AI computed server-side on edit |
| NFR-5 no auto-apply | ✓ SATISFIED | arch tests + single guarded UPDATE; truth 4 |
| NFR-6 decision transaction / audit completeness | ✓ SATISFIED | one append() per decision inside the transaction |
| NFR-7 traceability without external tooling | ✓ SATISFIED | trail read in-case, no export/query tool; truth 3 |
| NFR-9 AI dependency resilience | ✓ SATISFIED | whole-loop AI-stopped pass; truth 5 |

### Anti-Patterns Found

None. Scanned decision/audit source and e2e files: no TODO/FIXME/placeholder, no empty-return stubs, no console.log-only handlers. Review iteration 2 already resolved both prior WARNINGs (dead in-page link on summary error; HUMAN prior_origin invariant documented) — verified in `06-REVIEW.md`.

### Behavioral Spot-Checks (independent)

| Check | Command | Result |
| --- | --- | --- |
| Server + contract type-check | `npx tsc -b contract server` | exit 0 (clean) — matches gate |
| All 20 artifacts exist & substantive | file/line-count scan | all present, 65–764 lines, no stubs |
| No-auto-apply enforced by test | read `receiptPaths.spec.ts` test 6 + UPDATE-exceptions allowlist | asserts table=10, `POST …/decision` sole mutating exception route, allowlist = decision.service.ts only |

Execution outcomes (full 883-test suite, boot smoke) cited from the green gate rather than re-run.

### Human Verification Required

None required for goal sign-off. The §7.7 accessibility / assistive-technology walkthrough for the decision and audit-trail regions was performed and recorded in `docs/a11y/case-detail.md` (Phase 6 re-sign), consistent with the project's per-screen manual sign-off policy (no CI a11y gate, by design).

### Gaps Summary

No gaps. All five ROADMAP success criteria are verified against substantive, wired code backed by permanent regression tests; all key links are connected; the audit trail carries no mutation affordance; the no-auto-apply guarantee is enforced by architecture tests (not merely inspected); and the whole loop is walked keyboard-only twice, including with the AI provider stopped. Gate evidence is fully green (gate passed, boot smoke pass, 0 open review blockers, 0 shadowed sources, no disabled tests, 883/883 tests passing). The governed loop closes end to end.

---

_Verified: 2026-09-16T12:31:42Z_
_Verifier: Claude (pivota_spec-verifier)_
