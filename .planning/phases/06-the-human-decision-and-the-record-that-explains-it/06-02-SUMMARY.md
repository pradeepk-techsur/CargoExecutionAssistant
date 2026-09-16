---
phase: 06-the-human-decision-and-the-record-that-explains-it
plan: 02
subsystem: api
tags: [audit, f13, f14, express, postgres, hash-chain, read-only]

requires:
  - phase: 01-governed-record-substrate
    provides: "append-only audit store, verify_audit_chain, readCaseTrail (the single audit reader)"
  - phase: 04-the-receipt-ordered-queue
    provides: "resolveCaseIdentifier + loadExceptionDetail (F7 read model)"
  - phase: 06-01
    provides: "API_ROUTE_TABLE row 9 (F11 decision) implemented — the ninth route this plan builds the tenth alongside"
provides:
  - "GET /api/exceptions/:exceptionId/audit — the tenth and final §3.1 route; the API surface is now complete"
  - "AuditTrailResponse / AuditEntryDto / AuditEntryValueDto / AuditActorDto contract types (TechArch §3.5.4)"
  - "loadAuditTrailResponse — the F13 endpoint composition over the extended readCaseTrail"
  - "server/test/api/audit.spec.ts — the permanent F13/F14-backend regression suite (incl. the chain-tamper path)"
affects: [F14 per-case audit-trail UI (plan 06-04)]

tech-stack:
  added: []
  patterns:
    - "Read endpoint mirrors recommendation.ts exactly: no-query-param + auth re-check + uuid-form check before any DB call, GET-only"
    - "A broken hash chain is REPORTED in a 200 (chain_verified false + first_divergence_sequence), never an error and never repaired"
    - "model_id is attached only to RECOMMENDATION_GENERATED/UNAVAILABLE entries, never to a human decision entry that also carries recommendation_id"

key-files:
  created:
    - server/src/http/routes/audit.ts
    - server/test/api/audit.spec.ts
    - .planning/phases/06-the-human-decision-and-the-record-that-explains-it/deferred-items.md
  modified:
    - contract/src/dto.ts
    - server/src/services/auditRead.service.ts
    - server/src/http/routes/index.ts
    - server/test/api/boot.spec.ts
    - server/test/db/chain.spec.ts

key-decisions:
  - "model_id belongs to the AI generation event, not the human decision event, even though a REJECT decision stamps recommendation_id — restricted in the reader to RECOMMENDATION_GENERATED/UNAVAILABLE"
  - "The audit reader module now exports two read functions (readCaseTrail + loadAuditTrailResponse); chain.spec's exports allowlist updated to match — both are read-only, no repair op exists"
  - "The tamper test drops the immutability triggers on withApi's own throwaway DB (mirroring chain.spec), because even cargoexec_owner cannot UPDATE audit_entries"

patterns-established:
  - "The audit-trail read completes F13's API surface (endpoint 10 of 10) — §3.1 is exhaustive, the boot-test count never changes again"

duration: 8min
completed: 2026-09-16
---

# Phase 6 Plan 02: F13 Audit-Trail Read Endpoint Summary

**`GET /api/exceptions/:exceptionId/audit` — the tenth and final API route: a case's complete audit trail in ascending sequence, AI events distinguishable (actor null + model_id) from human ones in the response shape itself, with the hash-chain verification result reported (never repaired) and the entries rendered even when the chain is broken.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-16T11:31:11Z
- **Completed:** 2026-09-16T11:38:42Z
- **Tasks:** 2
- **Files modified/created:** 8 (3 created, 5 modified)

## Accomplishments

- Completed F13's API surface: `GET /api/exceptions/:exceptionId/audit` is the tenth and final `§3.1` route — the whole API surface is now implemented.
- Extended the single audit reader (`readCaseTrail`) additively with the acting specialist's id, and added `loadAuditTrailResponse`, which composes it with the F7 identifier/exception readers and a single bounded `model_id` join — read-only by construction.
- Gave F14's UI (plan 06-04) a real endpoint to render: the `AuditTrailResponse` contract (TechArch §3.5.4) with AI-vs-human distinguishable in the shape (`actor: null` + `model_id` for AI, `{id, display_name}` for a person).
- Proved the chain-integrity FAILURE path renders correctly, not just the healthy path: an 11-scenario regression suite drives a case to a REJECT decision and, via a tampered `entry_hash`, asserts `chain_verified: false` with the correct `first_divergence_sequence` and the entries still returned in a 200.

## Task Commits

Each task was committed atomically:

1. **Task 1: Contract types + extend the audit reader** — `ca6e586` (feat)
2. **Task 2: HTTP route + route-table wiring + regression tests** — `b6b891e` (feat)

## Files Created/Modified

- `contract/src/dto.ts` — added `AuditActorDto`, `AuditEntryValueDto`, `AuditEntryDto`, `AuditTrailResponse` (TechArch §3.5.4).
- `server/src/services/auditRead.service.ts` — added `actor_id` to `EntryRow`/`CaseTrailEntry` + the SELECT (additive LEFT-JOIN column); added `loadAuditTrailResponse` (read-only composition with a bounded `model_id` join, restricted to the two AI recommendation events).
- `server/src/http/routes/audit.ts` — the F13 read handler, mirroring `recommendation.ts` exactly; GET-only, reports a broken chain in a 200.
- `server/src/http/routes/index.ts` — imported `auditRoutes`, marked route-table row 10 `implemented: true`, added the builder, appended the last ROUTES entry, updated the header docs to "all ten implemented".
- `server/test/api/boot.spec.ts` — 9→10 implemented routes; added the audit path to the sorted expected list.
- `server/test/api/audit.spec.ts` — the permanent F13/F14-backend regression suite (11 scenarios).
- `server/test/db/chain.spec.ts` — updated the reader-exports allowlist to `{loadAuditTrailResponse, readCaseTrail}`.
- `.planning/.../deferred-items.md` — recorded the out-of-scope parallel-plan arch failure.

## Decisions Made

- **`model_id` is the generation event's, not the decision's.** A REJECT decision entry also carries `recommendation_id` (it names the recommendation the human acted on), but the model that produced the recommendation belongs to `RECOMMENDATION_GENERATED`/`UNAVAILABLE`. The reader attaches `model_id` only to those two action types.
- **The reader stays "the single reader".** `loadAuditTrailResponse` lives in the same module as `readCaseTrail` and issues only SELECTs; the module now exports two read functions and still no repair op, so `chain.spec`'s exports assertion was updated to `{loadAuditTrailResponse, readCaseTrail}` rather than forking a second module.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `chain.spec.ts` exports allowlist rejected the new reader export**
- **Found during:** Task 1
- **Issue:** `chain.spec.ts` asserts `auditRead.service.ts` exports EXACTLY `['readCaseTrail']`; adding `loadAuditTrailResponse` (the plan's required new function) made that assertion fail — the plan could not be completed without touching it.
- **Fix:** Updated the assertion to the sorted set `['loadAuditTrailResponse', 'readCaseTrail']`, both read-only, with a comment explaining the composition adds no repair op.
- **Files modified:** `server/test/db/chain.spec.ts`
- **Verification:** `chain.spec.ts` (6 tests) green; `test:db` 196 green.
- **Committed in:** `ca6e586` (Task 1 commit)

**2. [Rule 1 - Bug] `model_id` leaked onto the REJECT decision entry**
- **Found during:** Task 2 (audit.spec test 3 red: `expected 'gpt-test-1' to be undefined`)
- **Issue:** My Task-1 reader attached `model_id` to any entry whose `recommendation_id` was set. A REJECT decision stamps `recommendation_id`, so `model_id` wrongly appeared on the human decision entry, violating the contract's C-1 ("present only for RECOMMENDATION_GENERATED/UNAVAILABLE").
- **Fix:** Restricted the `model_id` attach to `action_type ∈ {RECOMMENDATION_GENERATED, RECOMMENDATION_UNAVAILABLE}`.
- **Files modified:** `server/src/services/auditRead.service.ts`
- **Verification:** audit.spec test 3 green; full `test:api` 170 green.
- **Committed in:** `b6b891e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug). Both necessary for correctness; no scope creep — the model_id fix tightened the response to the contract, and the exports-allowlist edit was mandatory to add the plan's required function.

## Known Stubs

None found — the reader issues real SELECTs, the route returns real data, and the suite exercises real governed fixtures and a real tamper. (The only `placeholder`/`501` string in the changed files is descriptive prose in `index.ts` explaining that no 501 placeholder exists.)

## Deferred Issues

- **`server/test/architecture/receiptPaths.spec.ts` test 9 fails — OUT OF SCOPE for 06-02, owner = 06-03.** The offender is `web/src/api/client.ts`'s `POST /api/exceptions/${…}/decision`, committed on the phase branch by the PARALLEL wave-2 plan **06-03** (`2af4e9a feat(06-03): api.postDecision …`). Plan 06-02 touches no `web/` file and adds no decision-posting call; 06-03 owns relaxing this Phase-4 arch assertion to permit the F12 decision UI's legitimate POST. Full detail + proof-of-non-regression in `deferred-items.md`. Not a 06-02 regression: `test:api` (170), `test:db` (196), `test:unit` (297) are all green after 06-02, and the sole arch failure names a file 06-02 never edits.

## Issues Encountered

- **Parallel-plan coordination on the shared phase branch.** Between Task 1 and Task 2, plan 06-03's commit (`2af4e9a`) landed, committing `web/` files that had appeared as pre-existing dirty state at 06-02's start. Handled by staging only 06-02's own files individually per commit (never `git add -A`) and by recording 06-03's arch-test consequence as a deferred item rather than fixing another plan's file.

## Verification

- `npm run build` → exit 0
- `npm run typecheck` → exit 0
- `npm run test:api` → 170 passed (11 new in audit.spec, boot.spec updated to 10 routes)
- `npm run test:db` → 196 passed (chain.spec exports-allowlist update)
- `npm run test:unit` → 297 passed
- `npm run test:arch` → 152 passed, 1 failed (out-of-scope 06-03 `web/src/api/client.ts` — see Deferred Issues)

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- F13 is complete end to end: the read endpoint is real, reachable, read-only, and returns the exact TechArch §3.5.4 shape; all ten §3.1 routes are implemented.
- Ready for **06-04** (the F14 per-case audit-trail UI) — it now has a real endpoint to fetch.
- One cross-plan follow-up for **06-03**: relax `receiptPaths.spec` to permit the F12 decision UI's `POST …/decision` call (tracked in `deferred-items.md`).

---
*Phase: 06-the-human-decision-and-the-record-that-explains-it*
*Completed: 2026-09-16*

## Self-Check: PASSED

- Created files exist: server/src/http/routes/audit.ts, server/test/api/audit.spec.ts — FOUND
- Task commits exist: ca6e586 (Task 1), b6b891e (Task 2) — FOUND
- Plan-level build ran: `npm run build` → exit 0; `npm run typecheck` → exit 0
- Known Stubs section present: none blocking
- Test gates: test:api 170, test:db 196, test:unit 297 all green; the single test:arch failure is out-of-scope (parallel plan 06-03's web/src/api/client.ts), documented under Deferred Issues
