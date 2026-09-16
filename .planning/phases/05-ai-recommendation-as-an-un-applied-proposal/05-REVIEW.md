---
phase: 5
status: clean
blockers: 0
warnings: 0
files_reviewed: 3
files_reviewed_list:
  - server/src/ai/job.ts
  - server/src/services/recommendationRead.service.ts
  - web/src/components/ProvenanceBadge.tsx
reviewed_at: 2026-09-15T23:24:32Z
iteration: 2
---

# Phase 5 Code Review — iteration 2 (re-review of W1/W2/W3 fixes)

Scope: the three fixer-touched files (`server/src/ai/job.ts`,
`server/src/services/recommendationRead.service.ts`,
`web/src/components/ProvenanceBadge.tsx`) plus their live cross-file seams
(the audit writer's error contract, the F9 route consumer, the ENTRY_FIELDS
denylist interaction). Each iteration-1 WARNING was re-read against the applied
commit; each was confirmed genuinely fixed, and each fix was checked for a
regression it might have introduced. `tsc -b contract server` and `tsc --noEmit`
(web) both exit 0.

All three WARNINGs are resolved with no fix-introduced regression. Status is
`clean`.

## BLOCKERs

None.

## WARNINGs

None.

## Verified fixes (iteration-1 findings)

### W1 — secret-shaped proposed value no longer strands PENDING — FIXED (1fa5736)
- **File:** server/src/ai/job.ts:114-196, 213-249
- **Verification:** The SUCCESS `withTransaction` is now wrapped in a `try/catch`.
  The catch narrows on `err instanceof AuditWriteError && err.code ===
  'AUDIT_WRITE_FORBIDDEN_CONTENT'` and, on a match, records a terminal
  UNAVAILABLE(`CONTENT_FILTERED`) via the new shared `writeUnavailable` helper,
  then `return`s. Any other error is re-thrown (`throw err`) to the outer catch
  (job.ts:197), which logs and leaves PENDING — behaviour unchanged for
  transient/DB/sequence errors.
- **Refutation checks that held:**
  - `AuditWriteError.code` is a real field (writer.ts:44-50) and
    `AUDIT_WRITE_FORBIDDEN_CONTENT` is emitted by both the secret-VALUE-shape
    path (writer.ts:203-208) and the secret-FIELD-NAME path (writer.ts:194-196).
    The SUCCESS branch feeds `proposedValues` already filtered to `ENTRY_FIELDS`
    members (job.ts:110-113); none of the 14 field names (contract/fields.ts)
    match `SECRET_FIELD_NAME_RE` (`password|passwd|token|secret|api[_-]?key|
    authorization|cookie|csrf|credential`), so the ONLY reachable
    `AUDIT_WRITE_FORBIDDEN_CONTENT` from this branch is the value-shape denylist
    — exactly what `CONTENT_FILTERED` is meant to represent. Classification is
    sound.
  - `'CONTENT_FILTERED'` is a member of `ProviderFailureReason`
    (provider.ts:61), so `writeUnavailable({ failureReason: 'CONTENT_FILTERED' })`
    typechecks and lands a valid `RecommendationFailureReason` (anti-drift
    assertion still compiles).
  - `writeUnavailable` is an extraction of the pre-existing FAILURE-branch tx:
    same `markRecommendationUnavailable` conditional UPDATE (idempotence guard
    intact — `if (!updated) return`), same coupled `RECOMMENDATION_UNAVAILABLE`
    append. The FAILURE branch (job.ts:189-195) now routes through the same
    helper. `generation.job.spec.ts` test 2 exercises all seven failure reasons
    through this path; tests 1/1b exercise the wrapped SUCCESS path — both
    refactored seams remain covered.
  - The denylist itself is untouched (no weakening).

### W2 — no-row branch no longer fabricates a hollow PENDING — FIXED (27aa415)
- **File:** server/src/services/recommendationRead.service.ts:49-58
- **Verification:** The `row === null` branch now `return 'NOT_FOUND'` instead of
  `{ status: 'PENDING' }`. The function's declared return type is already
  `Promise<RecommendationDetailDto | 'NOT_FOUND'>` (line 40), and the sole
  consumer — `recommendation.ts:70-72` — maps `'NOT_FOUND'` to `404
  EXCEPTION_NOT_FOUND`. The skewed 60s stale-clock origin that W1's finding
  described can no longer arise: the fabricated PENDING-without-`requested_at`
  is gone. The normal PENDING return (line 89) still carries `requested_at`.
- **Refutation checks that held:** `loadRecommendationDetail` has exactly one
  consumer (grep: only recommendation.ts), so no other caller relied on the old
  fabricated PENDING. Return-type contract unchanged; typecheck clean.

### W3 — inert `<title>` removed from the aria-hidden icon — FIXED (66dbee0)
- **File:** web/src/components/ProvenanceBadge.tsx:34-40, 14-17
- **Verification:** The `<title>{label}</title>` child of the `aria-hidden`
  `<svg>` is deleted; the icon remains decorative (`aria-hidden="true"
  focusable="false"`) and the visible `{label}` text ("AI-suggested" /
  "Specialist-entered") is the accessible name. The file-header comment no
  longer claims the `<title>` conveys meaning to AT — it now correctly states
  the icon is decorative and the visible label is the accessible name.
- **Refutation checks that held:** `label` is still rendered as visible text
  (line 39), so no accessible-name regression; the colour-independence criterion
  (distinct text + distinct sprite id per variant) is unaffected. web `tsc
  --noEmit` clean.

## Cross-file seams checked (this iteration)

- job.ts `AuditWriteError` import + `.code` narrowing ↔ writer.ts error contract (code is `InternalInvariantCode`, `AUDIT_WRITE_FORBIDDEN_CONTENT` thrown by `forbidden()`) — OK
- job.ts `writeUnavailable(failureReason: 'CONTENT_FILTERED')` ↔ provider.ts `ProviderFailureReason` union (member present) ↔ contract anti-drift assertion (still compiles) — OK
- job.ts SUCCESS `proposedValues` (ENTRY_FIELDS-filtered) ↔ writer.ts `SECRET_FIELD_NAME_RE` (no ENTRY_FIELDS name matches ⇒ only value-shape can trip CONTENT_FILTERED) — OK
- recommendationRead.service.ts `'NOT_FOUND'` return ↔ recommendation.ts:70 (404 EXCEPTION_NOT_FOUND) ↔ declared return type — OK
- loadRecommendationDetail consumers: exactly one (recommendation.ts); no stale dependency on the removed PENDING fabrication — OK
- ProvenanceBadge visible `{label}` retained ↔ CaseDetail provenance rendering + case-detail.spec colour-independence test 3 (unaffected) — OK
- writeUnavailable extraction ↔ generation.job.spec.ts tests 1/1b (SUCCESS wrapped path) and test 2 (7 failure reasons via helper): both refactored seams covered — OK

## Notes (out of scope, not findings)

- The CONTENT_FILTERED fallback attributes the outcome to "a proposed value"
  even when it is the HUMAN `before_value` (`entryValues[field]`) that trips the
  value-shape regex. The end state (terminal UNAVAILABLE, clean degrade) is
  identical and correct either way; only the log message's attribution is
  slightly imprecise. Non-blocking, not a defect.
- The compose `web` service AI-env carry-forward (Phase 6, noted iteration 1)
  remains out of scope and unaffected by these fixes.
