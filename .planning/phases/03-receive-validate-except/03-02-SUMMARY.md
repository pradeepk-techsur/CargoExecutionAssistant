---
phase: 03-receive-validate-except
plan: 02
subsystem: validation
tags: [validation, rules-as-data, riv-2026.09, pure-functions, tdd, iso-3166, cbp-ports]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate
    provides: the fourteen-field set (contract/src/fields.ts, ENTRY_FIELDS / EntryFieldName)
  - phase: 03-receive-validate-except (plan 03-01, parallel wave 1)
    provides: CanonicalEntryRecord (server/src/db/repositories/entries.ts) — type-only import
provides:
  - RIV-2026.09 rule set as DATA — 31-entry RULES registry with per-rule pure predicates
  - RULE_SET_VERSION = 'RIV-2026.09' as the single refinement anchor
  - four compiled-in frozen domain code lists (ports, countries, units, generic descriptions) + MODE_OF_TRANSPORT
  - pure normalised-comparison-value helpers (calendar-aware date validity, UTC-only date arithmetic)
  - 71-case unit spec proving every rule pass+fail, TZ-stable
affects: [03-04, 03-05, 03-06, 03-09, 03-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rules-as-data: a rule change is a change to rules.ts / domain.ts plus a RULE_SET_VERSION bump — never an architectural change"
    - "R-L10 module purity: nothing under services/validation/ imports a clock, pool, repository, node:crypto, express, pg, or the network; every predicate is pure over (record, receivedAt)"
    - "Normalisation applied only to the comparison value; the stored/passed record is never mutated"
    - "Declared gating (requires_passed) and declared primary_field on each rule, never implied by array order"

key-files:
  created:
    - server/src/services/validation/types.ts
    - server/src/services/validation/domain.ts
    - server/src/services/validation/normalise.ts
    - server/src/services/validation/rules.ts
    - server/test/unit/validation.rules.spec.ts
  modified: []

key-decisions:
  - "RULE_SET_VERSION lives in one place (types.ts); bumping it IS the CBP-refinement mechanism"
  - "isCalendarDate uses regex + leap-year days-in-month table, never new Date(v), so 2026-02-30 stays invalid"
  - "RIV-132 compares zero-padded YYYY-MM-DD strings lexicographically after UTC-only date arithmetic against the entry's own received_at — timezone-stable"
  - "RIV-051 SCAC/IATA branch keys off the normalised mode; a missing/unknown mode falls back to SCAC"
  - "PORT_OF_ENTRY is a documented 26-code demonstration subset (contains 2704, excludes 9999); COUNTRY is the full ISO 3166-1 alpha-2 set (contains CN/US, excludes XX/ZZ)"

patterns-established:
  - "Rules-as-data registry: content in rules.ts/domain.ts, mechanism deferred to the engine (03-04)"
  - "Pure, unit-testable per-rule predicates answering only applicable() and satisfied()"

# Metrics
duration: 7min
completed: 2026-09-15
---

# Phase 3 Plan 2: RIV-2026.09 Required-Information Rule Set (as data) Summary

**A 31-rule required-information rule set expressed entirely as data — four frozen domain code lists, pure normalisers, and a registry where each rule carries its id, fields, declared primary field, failure code, message, declared gating and a pure predicate — proven by 71 unit cases that pass identically under UTC and UTC+14.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-15T16:11:23Z
- **Completed:** 2026-09-15T16:18:23Z
- **Tasks:** 2 (Task 2 executed test-first: RED → GREEN)
- **Files created:** 5

## Accomplishments

- `RULE_SET_VERSION = 'RIV-2026.09'` established as the single refinement anchor — a rule/message/code change is a data change plus a version bump, touching no engine, service, API or UI module (the STATE.md architectural instruction).
- The 31-rule `RULES` registry built as data: ascending `rule_id`, unique ids and failure codes, every message/code verbatim from FRD F4, declared gating via `requires_passed`, declared `primary_field` (function for RIV-070's mode-dependent field), pure `applicable`/`satisfied` predicates.
- Four compiled-in frozen domain code lists (FR-4.1 — constants, never tables/seeds/config) plus `MODE_OF_TRANSPORT`.
- Pure normalisation helpers including a calendar-accurate `isCalendarDate` (rejects `2026-02-30`) and UTC-only `dateOnlyUtc`/`addDaysUtc` used by RIV-132's inclusive window.
- 71-case unit spec: one pass + one fail per rule, RIV-051/070/073 branches, RIV-092 normalisation, RIV-131 calendar validity, RIV-132 inclusive boundaries + timezone stability, registry hygiene, `{value}` interpolation from the submitted value, and predicate immutability against a deep-frozen record.

## Task Commits

Each task was committed atomically (Task 2 test-first):

1. **Task 1: Domain code lists, rule types, and normalisation helpers** — `a79339c` (feat)
2. **Task 2 (RED): failing spec for the rule registry** — `0ba8b34` (test)
3. **Task 2 (GREEN): the 31-rule registry implementation** — `0b17e94` (feat)

_No REFACTOR commit was needed — the GREEN implementation was already clean._

_Plan metadata commit: appended below in the docs commit._

## Files Created/Modified

- `server/src/services/validation/types.ts` — `RULE_SET_VERSION`, `RuleDefinition`, `RuleId`, `Finding`, `ValidationEvaluation`
- `server/src/services/validation/domain.ts` — `PORT_OF_ENTRY` (26 codes, incl. 2704, excl. 9999), `COUNTRY` (full ISO 3166-1 alpha-2), `UNIT_OF_MEASURE`, `GENERIC_DESCRIPTION` (both verbatim/ordered), `MODE_OF_TRANSPORT`; all frozen `ReadonlySet`s
- `server/src/services/validation/normalise.ts` — `trimOnly`, `isPresent`, `upperAlnum`, `upperNoSpace`, `upperKeepHyphen`, `digitsOnly`, `collapseLower`, `parseDecimal`, `isCalendarDate`, `dateOnlyUtc`, `addDaysUtc`, `truncate60`
- `server/src/services/validation/rules.ts` — `RULES`: the 31-entry RIV-2026.09 registry
- `server/test/unit/validation.rules.spec.ts` — 71 pure unit cases

## Decisions Made

See frontmatter `key-decisions`. Notably: calendar validity is computed without `Date` parsing so impossible dates cannot pass RIV-131; RIV-132 is timezone-stable by construction (UTC-only arithmetic, lexicographic string comparison of zero-padded dates); RIV-051 branches on the normalised mode with a SCAC fallback for missing/unknown mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created a minimal `entries.ts` type stub to unblock the type-only import**
- **Found during:** Task 1
- **Issue:** The plan's modules import `CanonicalEntryRecord` from `server/src/db/repositories/entries.ts` (owned by the parallel wave-1 plan 03-01), which did not yet exist when Task 1 began — `npm run typecheck` could not resolve the type.
- **Fix:** Wrote a minimal `entries.ts` exporting only `export type CanonicalEntryRecord = { readonly [K in EntryFieldName]: string | null }` — byte-identical to the definition plan 03-01 declares — with a header note explaining the coordination. Plan 03-01 subsequently landed its full repository on the same branch; git cleanly replaced the stub with the complete file, which still exports `CanonicalEntryRecord` verbatim, so the type-only import now resolves against the real repository.
- **Files modified:** server/src/db/repositories/entries.ts (superseded by 03-01)
- **Verification:** `npm run typecheck` exits 0 at current HEAD against the full 03-01 `entries.ts`.
- **Committed in:** a79339c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** No scope change. The stub was a transient unblock for parallel execution; the real file from 03-01 superseded it with no conflict. No production behaviour of this plan's modules changed.

## Issues Encountered

- **Parallel execution on the shared `phase-3` branch.** Plans 03-01 and 03-03 were committing interleaved with this plan. A transient `test:unit` failure in `scaffolding.spec.ts` (expected 8 internal-invariant codes, got 9) appeared while my working tree lagged behind HEAD; it was **not** caused by this plan (that file is 03-01's), and 03-01's own follow-up commit `341e032` fixed it. Re-running `test:unit` at HEAD is fully green (189 passed, 0 skipped). No action needed on this plan's part.

## Known Stubs

None found in this plan's files (`server/src/services/validation/*.ts`, `server/test/unit/validation.rules.spec.ts`). The `entries.ts` stub noted under Deviations was superseded by plan 03-01's full implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The rule set (content) is ready for plan **03-04**, which builds the evaluation engine (gating semantics, ordering, completeness, determinism, the registry integrity self-check, and the R-L10 architecture assertion) on top of these pure predicates.
- Findings shape (`Finding`, `ValidationEvaluation`) is exported for 03-04/03-05 to consume.
- No blockers.

## Self-Check: PASSED

- All five created files exist on disk.
- All three task commits (`a79339c`, `0ba8b34`, `0b17e94`) present in history.
- Plan-level build (`npm run build:server` → `tsc -b contract server`) exits 0.
- `## Known Stubs` present; no blocking stubs.
- Verification: `npm run typecheck` exit 0; `test:unit` 189 passed / 0 skipped; `test:arch` 130 passed (unchanged); validation spec 71 passed identically under `TZ=UTC` and `TZ=Pacific/Kiritimati`.

---
*Phase: 03-receive-validate-except*
*Completed: 2026-09-15*
