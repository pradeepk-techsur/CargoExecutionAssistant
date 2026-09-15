---
phase: 5
status: issues_found
blockers: 0
warnings: 3
files_reviewed: 24
files_reviewed_list:
  - server/src/ai/provider.ts
  - server/src/ai/outputSchema.ts
  - server/src/ai/fakeProvider.ts
  - server/src/ai/job.ts
  - server/src/ai/worker.ts
  - server/src/ai/adapter.http.ts
  - server/src/ai/promptManifest.ts
  - server/src/ai/prompt/manifest.json
  - server/src/config.ts
  - server/src/index.ts
  - server/src/db/pool.ai.ts
  - server/src/db/repositories/recommendations.ts
  - server/src/db/repositories/exceptions.ts
  - server/src/db/repositories/entries.ts
  - server/src/services/recommendationRead.service.ts
  - server/src/services/receipt.service.ts
  - server/src/services/audit/writer.ts
  - server/src/http/app.ts
  - server/src/http/routes/index.ts
  - server/src/http/routes/recommendation.ts
  - server/src/http/routes/entries.ts
  - server/src/http/logger.ts
  - web/src/api/client.ts
  - web/src/components/ProvenanceBadge.tsx
  - web/src/screens/CaseDetail.tsx
  - web/src/app/router.tsx
  - e2e/case-detail.spec.ts
  - e2e/env.ts
reviewed_at: 2026-09-15T23:18:47Z
iteration: 1
---

# Phase 5 Code Review

Phase goal: an AI recommendation surfaces as an un-applied *proposal* — generated
asynchronously off the receipt path, provably unable to write a decision,
polled by the F10 case-detail screen, with every machine-proposed value marked
as the machine's.

The change set was verified against `961d0d9` (phase branch point) → HEAD. The
core seams are sound: `tsc -b contract server` compiles cleanly, the
provider↔contract failure-reason anti-drift assertion holds, the prompt digest
in `manifest.json` matches the shipped template byte-for-byte (recomputed:
`9c8980e1…642d3`), the two-pool privilege split is respected, receipt never
awaits dispatch, the polling route is GET-only and auth-guarded, and every
frontend↔contract↔backend type seam lines up. No BLOCKER survived refutation.

Three WARNINGs below are real but degraded-not-broken defects.

## BLOCKERs

None.

## WARNINGs

### W1: An AI-proposed value whose text matches a secret-shape regex silently strands the recommendation PENDING forever
- **File:** server/src/services/audit/writer.ts:203-208 (via server/src/ai/job.ts:136-155)
- **Category:** bug
- **Evidence:** In the SUCCESS branch, `job.ts` calls `append()` with `values`
  carrying each proposed value's `after_value: v.proposed_value`. The audit
  writer's `normaliseValues` runs `SECRET_VALUE_RES` against both sides of every
  value (`/^Bearer\s+\S+/i`, `/\bsk-[A-Za-z0-9_-]{16,}\b/`, and a JWT-shaped
  `x.y.z` pattern). A proposed correction whose text happens to match — e.g. a
  `goods_description` or `bill_of_lading_number` correction shaped like
  `AAAAAAAA.BBBBBBBB.CCCCCCCC` — makes `append()` throw `AuditWriteError`. That
  throw is *inside* the `withTransaction`, so the whole AVAILABLE write rolls
  back; the throw then propagates to `runGenerationJob`'s outer `catch` (job.ts:176),
  which logs and returns, leaving the recommendation PENDING. F10 will poll for
  60s and then show the "no recommendation yet" stale condition, with no trace
  that a valid recommendation was produced and discarded. Note the schema
  validator (`outputSchema.ts`) does NOT screen for these shapes, so a real
  provider response can reach this path. Likelihood is low (cargo-field
  corrections rarely look like bearer tokens/JWTs), hence WARNING not BLOCKER.
- **Fix direction:** Decide the intended contract for a proposed value that trips
  the secret denylist — either translate it to a terminal UNAVAILABLE outcome
  (so the case degrades cleanly rather than hanging PENDING), or scope the
  secret-value screen so it does not apply to AI proposed-value rows whose
  field_name is a known non-secret entry field. Do not weaken the denylist for
  human-authored audit values.

### W2: `loadRecommendationDetail`'s defensive PENDING branch omits `requested_at`, degrading F10's stale-clock accuracy
- **File:** server/src/services/recommendationRead.service.ts:53
- **Category:** bug
- **Evidence:** The normal PENDING return (line 85) is
  `{ status: 'PENDING', requested_at: row.requested_at }`, but the defensive
  "row === null" branch (line 53) returns `{ status: 'PENDING' }` with no
  `requested_at`. `CaseDetail.tsx`'s `RecommendationSection` seeds its 60s stale
  clock from `initial.requested_at ?? Date.now()` (line 403-407); the two
  branches therefore measure the budget from different origins. This branch is
  documented as "should not happen" (every exception has a PENDING placeholder),
  so it is a genuine defect on an ostensibly-unreachable path rather than a live
  one — WARNING. The inconsistency is only observable if the placeholder
  invariant is ever violated.
- **Fix direction:** Either make the defensive branch consistent (it has no row,
  so it cannot supply a real `requested_at` — consider returning NOT_FOUND
  instead of fabricating a PENDING, matching the "loudly refuse rather than
  fabricate" posture used in `job.ts`), or explicitly document that the stale
  clock falls back to mount time here.

### W3: ProvenanceBadge's icon `<title>` is inert under `aria-hidden`, so the sprite adds no AT semantics
- **File:** web/src/components/ProvenanceBadge.tsx:34-37
- **Category:** bug
- **Evidence:** The `<svg>` carries `aria-hidden="true"` yet contains
  `<title>{label}</title>`. `aria-hidden` removes the entire subtree (including
  the title) from the accessibility tree, so the `<title>` is never announced —
  the file header's claim that "the icon's `<title>` makes its meaning available
  to AT too" is not actually true. This is NOT a functional a11y failure because
  the adjacent visible text label (`AI-suggested` / `Specialist-entered`) carries
  the meaning and is read by AT, and the phase's colour-independence criterion is
  satisfied by that text (proven by case-detail.spec test 3). So the badge is
  legible and conveys provenance correctly; only the redundant `<title>` is dead.
  WARNING for the misleading guarantee, not a broken screen.
- **Fix direction:** Remove the now-inert `<title>` (the visible text is the
  accessible name) or drop `aria-hidden` if the icon is meant to be announced
  independently — pick one so the code matches its documented intent.

## Cross-file seams checked

- GET /api/exceptions/:exceptionId/recommendation (recommendation.ts) ↔ api.getRecommendation (client.ts): path, method (GET, no CSRF), and uuid form all agree — OK
- api.getRecommendation → RecommendationDetailDto ↔ loadRecommendationDetail return shape ↔ contract dto.ts: status-discriminated optional fields consistent (AVAILABLE/UNAVAILABLE/PENDING) — OK
- CaseDetail.tsx consumes CaseDetailResponse.{exception,entry,validation,recommendation,is_closed}: every field present on the contract (dto.ts 207-215, EntryDto 98-105, FindingDto 107-113) — OK
- ProviderFailureReason (provider.ts) ↔ RecommendationFailureReason (contract dto.ts 38-45): 7-for-7, anti-drift assertion compiles (tsc exit 0) — OK
- FAKE_AI_TRIGGERS (fakeProvider.ts) ↔ e2e/case-detail.spec.ts: imports the real constant; whole-field-value sentinel matches FakeProvider's `v === marker` exactly — OK
- runGenerationJob append() case_id = ex.entry_id ↔ append() locks cargo_entries WHERE id=case_id: entry_id is the case anchor — OK
- markRecommendationAvailable latency_ms=$6 ↔ migration 0005 recommendations.latency_ms column: column exists — OK
- job.ts RECOMMENDATION_GENERATED / RECOMMENDATION_UNAVAILABLE ↔ trg_recommendations_audit (0009) expected action per status ↔ AUDIT_ACTION_TYPES (writer.ts): all present and matched — OK
- dispatchRecommendation seam: index.ts → createApp → routes/index.ts → entries.ts → receipt.service.ts (post-commit, never awaited, throw-swallowed): threaded correctly, FR-3.14 preserved — OK
- getAiPool import site: only index.ts imports pool.ai.js; job.ts takes Pool as a parameter — OK
- config.ts AI self-checks ↔ e2e/env.ts keys ↔ prompt manifest digest: fake:deterministic posture boots, PROMPT_VERSION=2026.09.1 digest verified — OK
- API_ROUTE_TABLE 8 implemented ↔ boot.spec.ts assertion (8) ↔ buildRoutes array (8): consistent — OK

## Notes (out of scope, not findings)

- The compose `web` service lacks the now-mandatory AI env keys (deferred-items.md, owner = Phase 6 compose plan). A fresh `docker compose up --build` would fail the AI boot self-checks. This is a pre-declared carry-forward, correctly deferred, not a Phase 5 source defect.
