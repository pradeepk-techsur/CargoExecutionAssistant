---
phase: 03-receive-validate-except
plan: 05
subsystem: api
tags: [receipt, transaction, validation, exception, audit, postgres, atomicity]

# Dependency graph
requires:
  - phase: 03-01
    provides: entries/validation/exceptions repositories, ReceiptResponse contract
  - phase: 03-04
    provides: validation engine evaluate() + RULE_SET_VERSION
  - phase: 01
    provides: withTransaction (sole BEGIN site), audit writer append(tx), deferred coupling triggers, composite basis FK, case-anchor lock privilege
  - phase: 02
    provides: identity fixture, errorMapper internal-invariant handling
provides:
  - "receiveEntry(deps, submitted, provided): the single atomic receipt transaction"
  - "EntryNumberDuplicateError carrying the existing case_reference (409 path)"
  - "ReceiptPrincipal interface"
  - "db-tier proof the committed receipt is correct on both outcomes, with the audit chain verified"
affects: [03-06, 03-07, 03-09, 05, 06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validate-before-insert (D-3): receipt_outcome computed from the engine's outcome and written once in the single INSERT; no cargo_entries UPDATE anywhere"
    - "One withTransaction callback couples persistence + validation + exception + three audit entries; the deferred triggers turn a missing audit into a failed COMMIT, never an unaudited change"
    - "Post-commit fire-and-forget dispatch seam: optional injected callback, never awaited, try/catch-logged, cannot affect the committed receipt"
    - "23505 distinguished by named constraint (uq_cargo_entries_entry_number); duplicate case_reference looked up on the pool AFTER rollback"

key-files:
  created:
    - server/src/services/receipt.service.ts
    - server/test/db/receipt.spec.ts
  modified: []

key-decisions:
  - "receipt_outcome is written once in the INSERT, computed from the engine outcome; validation runs immediately before the insert (D-3), keeping entry immutability stronger than the FRD's step-10"
  - "An invalid arrival_date is stored NULL via a shallow copy (never mutating submitted) and reported as RIV-131 — never a 422 or 500"
  - "The 409 duplicate is signalled internally inside the transaction, then resolved to EntryNumberDuplicateError on the pool after rollback so the dead transaction serves no query"
  - "findingValueRow encodes 'failure_code: message' as after_value with HUMAN origin; a secret-shaped entry field aborts the whole receipt via the audit writer with no bypass added"

patterns-established:
  - "Committed db-tier proof: cases COMMIT so the Phase 1 coupling triggers + hash chain + composite basis FK are exercised for real, not worked around"

# Metrics
duration: 12 min
completed: 2026-09-15
---

# Phase 3 Plan 05: The Atomic Receipt Transaction Summary

**`receiveEntry` — the single `withTransaction` receipt that persists the entry, validates it before the INSERT (D-3), opens exactly one OPEN exception + PENDING recommendation on failure, writes all three audit entries, and returns the `ReceiptResponse`; proven end-to-end by a 16-case committed db-tier spec with the audit chain verified on both outcomes.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-15T16:28:00Z
- **Completed:** 2026-09-15T16:40:12Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- `server/src/services/receipt.service.ts` (404 lines): §1.5 steps 6–18 in normative order inside exactly one `withTransaction` call — receipt stamp → `evaluate` → single `cargo_entries` INSERT carrying the final `receipt_outcome` → case-anchor lock → provenance → validation result + findings → exception derivation on FAIL → response. Three `append(tx, …)` audit entries (`ENTRY_RECEIVED` SPECIALIST, `VALIDATION_COMPLETED` / `EXCEPTION_OPENED` SYSTEM-on-behalf), no `reason`.
- `EntryNumberDuplicateError` carries the existing `case_reference`, resolved on the pool after the transaction rolls back; a non-entry-number 23505 propagates as a generic failure.
- Invalid `arrival_date` stored NULL (shallow copy, never mutating `submitted`) and reported as RIV-131; a FAIL-with-zero-findings aborts with `EXCEPTION_WITHOUT_BASIS`.
- Post-commit, never-awaited `dispatchRecommendation` seam; no `server/src/ai/` import; no `BEGIN`/`COMMIT`/`ROLLBACK`; no cargo-entry or exceptions UPDATE.
- `server/test/db/receipt.spec.ts` (554 lines): 16 committed cases on `cargoexec_app` against a per-suite migrated DB — clean path (2 audit entries, PASS, zero findings/exceptions/recs, chain verified), exception path (3 audit entries, FAIL with 13 presence findings field-for-field, OPEN exception + PENDING rec + no decision, chain verified), provenance, byte-identical typed storage, determinism through the committed path, 409-saves-nothing, forbidden-content abort, strictly increasing `receipt_position`, and validation-result byte-stability + `uq_validation_results_entry` 23505 control.

## Task Commits

1. **Task 1: receiveEntry service** — `51043d5` (feat)
2. **Task 2: committed receipt db spec** — `269265b` (test)

## Files Created/Modified
- `server/src/services/receipt.service.ts` — the atomic receipt transaction; sole writer of `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings` and the `exceptions` insert.
- `server/test/db/receipt.spec.ts` — db-tier proof of the committed receipt on both outcomes, provenance, the three audit entries, determinism and the 409/forbidden-content atomicity guarantees.

## Decisions Made
- **Validate-before-insert (D-3):** `receipt_outcome` is computed from the engine's own outcome and written once in the single INSERT — no update path. This keeps entry immutability stronger than the FRD's unexecutable step-10.
- **Duplicate resolution off the dead transaction:** the 23505 is caught inside the callback (distinguished by the named constraint), signalled out, and the existing `case_reference` is looked up on the pool after rollback.
- **No bypass, no AI coupling:** `receiveEntry` takes no skip/mode/force argument; the AI seam is an optional injected callback dispatched strictly post-commit and never awaited.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected an inaccurate rule-behaviour claim in Task 2 case 11**
- **Found during:** Task 2 (case 11 initially failed)
- **Issue:** The plan asserted a lowercase `entry_number` `'abc12345678'` "also fails `RIV-011`". In the implemented rule (03-02/03-04), `RIV-011` normalises the value with `upperAlnum()` before matching `^[A-Z0-9]{3}[0-9]{8}$`, so `'abc12345678'` → `'ABC12345678'` **satisfies** the format rule. The plan's prediction contradicted the shipped rule.
- **Fix:** Case 11 now pins the load-bearing claim — byte-identical STORED / RETURNED / AUDITED value (never uppercased or reformatted) — and asserts the (non-)finding against the rule's real behaviour (neither `RIV-010` nor `RIV-011` fires), with a comment recording the discrepancy.
- **Files modified:** server/test/db/receipt.spec.ts
- **Verification:** `npx vitest run server/test/db/receipt.spec.ts` → 16/16 pass.
- **Committed in:** `269265b` (Task 2 commit)

**2. [Rule 3 - Blocking] Avoided tripping the immutability source-scan with a comment**
- **Found during:** Task 1
- **Issue:** `privileges.spec.ts` scans all of `server/src/**/*.ts` with `/update\s+cargo_entries/i` (case-insensitive, comments included). The service header comment named the D-3 constraint using that exact phrase, which would have failed `test:arch`.
- **Fix:** Reworded the comment to "no cargo-entry UPDATE statement anywhere" — same meaning, no matching token.
- **Files modified:** server/src/services/receipt.service.ts
- **Verification:** `npm run test:arch` → 137/137 pass; source scan clean.
- **Committed in:** `51043d5` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug in the test's asserted rule behaviour, 1 blocking comment-vs-source-scan collision).
**Impact on plan:** No scope change. Both fixes align the tests/comments with the shipped rule set and the existing architecture gate; the service logic matches the plan exactly.

## Known Stubs
None found. The only stub-scan hit is the word "placeholder" inside a comment describing the domain PENDING-recommendation placeholder (FR-5.12) — not an incomplete implementation.

## Issues Encountered
None — both tasks completed within the deviation rules; no checkpoints in this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The receipt transaction is complete and committed-path-proven. Plan 03-06 can mount the `POST /api/entries` route: normalise the raw body into a `CanonicalEntryRecord` + `provided` list, call `receiveEntry`, and map `EntryNumberDuplicateError` → 409 `ENTRY_NUMBER_DUPLICATE`, everything else → 500 `RECEIPT_FAILED`.
- Phase 5 can wire the real recommendation worker into the `dispatchRecommendation` seam without touching this service.

## Self-Check: PASSED
- `server/src/services/receipt.service.ts` — FOUND (404 lines ≥ 180 min).
- `server/test/db/receipt.spec.ts` — FOUND (554 lines ≥ 250 min).
- Commits `51043d5` (Task 1) and `269265b` (Task 2) — FOUND.
- Build check: `npm run build` → exit 0 (server tsc + web vite).
- Gates: `npm run typecheck` exit 0; `npm run test:db` 139/139; `npm run test:arch` 137/137; `receipt.spec.ts` 16/16.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 03-receive-validate-except*
*Completed: 2026-09-15*
