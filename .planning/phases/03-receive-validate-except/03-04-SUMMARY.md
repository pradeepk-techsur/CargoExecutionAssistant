---
phase: 03-receive-validate-except
plan: 04
subsystem: validation
tags: [validation, engine, determinism, gating, registry, riv-2026.09, architecture-test]

# Dependency graph
requires:
  - phase: 03-02
    provides: RIV-2026.09 rule registry (RULES) + four domain code lists + pure normalisers + RULE_SET_VERSION/RuleDefinition/Finding/ValidationEvaluation types
  - phase: 03-01
    provides: CanonicalEntryRecord (entries repository), VALIDATION_ENGINE_FAILURE in INTERNAL_INVARIANT_CODES, errorMapper generic-500 fallback
provides:
  - "evaluate(record, receivedAt) — the single pure evaluation entry point (F4)"
  - "ValidationEngineError('VALIDATION_ENGINE_FAILURE', rule_id) — aborts, never a partial result"
  - "services/validation/index.ts — the directory's only public surface (evaluate, RULE_SET_VERSION, assertRuleRegistryValid, types)"
  - "assertRuleRegistryValid() — boot-time RULE_SET_INVALID integrity self-check, called before app.listen"
  - "validation.spec.ts — permanent purity / no-endpoint / no-bypass / no-grading / no-reference-table build constraints"
affects: [F3 receipt transaction, F5 exception creation, F6 cargo entry UI, F9 AI recommendation, F10 case detail, 03-07 single-call-site assertion, 03-11 absence.spec review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content vs mechanism split: rules.ts/domain.ts are DATA, engine.ts is the fixed mechanism; a rule revision is a data change + RULE_SET_VERSION bump"
    - "Determinism proven, not asserted: two in-process calls, a second Node process (byte comparison), an advanced fake system clock with a converse received_at control"
    - "Purity as a build constraint: architecture spec walks the directory and fails on any clock/pool/repository/crypto/fs/network/randomness"

key-files:
  created:
    - server/src/services/validation/engine.ts
    - server/src/services/validation/selfCheck.ts
    - server/src/services/validation/index.ts
    - server/test/unit/validation.engine.spec.ts
    - server/test/unit/validation.registry.spec.ts
    - server/test/architecture/validation.spec.ts
  modified:
    - server/src/index.ts

key-decisions:
  - "selfCheck.ts landed with the Task 1 commit (not Task 3) because index.ts's public surface re-exports assertRuleRegistryValid — Task 1's own typecheck verify requires it to exist"
  - "The purity assertion forbids the ZERO-ARGUMENT new Date() (a clock read) but permits new Date(value) — normalise.ts's RIV-132 UTC helpers parse a supplied timestamp deterministically; forbidding all new Date( would defeat the assertion's own purpose"
  - "The engine accepts an optional rules parameter (defaulting to RULES) so cases 19-20 inject a throwing / out-of-set rule without mutating the real registry"

patterns-established:
  - "index.ts is the sole import surface for callers outside services/validation/ — a rule-set revision cannot ripple outward"
  - "Engine failure aborts the whole evaluation (never catch-and-continue), surfacing via errorMapper's generic 500 RECEIPT_FAILED"

# Metrics
duration: ~11 min
completed: 2026-09-15
---

# Phase 3 Plan 04: Validation Engine, Determinism & Registry Integrity Summary

**A pure `evaluate(record, receivedAt)` with declared `requires_passed` gating, no short-circuiting, ascending-`rule_id` findings and a two-value PASS/FAIL outcome; a boot-time `RULE_SET_INVALID` registry self-check; and tests that PROVE determinism (NFR-11) across two calls, two processes and an advanced clock.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-09-15T16:19Z
- **Completed:** 2026-09-15T16:31Z
- **Tasks:** 3
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments
- `engine.ts`: the F4 evaluation mechanism — gating read from each rule's declared `requires_passed` (never array position), applicability asked of the rule, no early return / `break` / cap, ascending `rule_id` findings, `RULE_SET_VERSION` stamp, no `evaluated_at` and no clock read. `ValidationEngineError` aborts on a throwing predicate or an out-of-`ENTRY_FIELDS` field name.
- `selfCheck.ts`: `assertRuleRegistryValid()` throws `RULE_SET_INVALID: …` naming the offending rule — ids well-formed/unique/ascending, unique codes, fields & static primary_fields in `ENTRY_FIELDS`, gating acyclic (Kahn), messages 1..500. Wired into `server/src/index.ts` step 1a, before `createApp`/`app.listen`; `createApp` left untouched.
- `index.ts`: the directory's only public surface.
- `validation.engine.spec.ts` (23 cases) + `validation.registry.spec.ts` (6 cases): F4 acceptance 1–8 & 10, the blank entry asserted as the full ordered thirteen-presence array, determinism proven three ways, engine-failure abort, and the 31 FRD rule ids hard-coded as the registry anchor with every rule shown reachable.
- `validation.spec.ts` (7 cases): five permanent architecture constraints; the purity assertion was proven RED on a planted `Date.now()` then restored.

## Task Commits

1. **Task 1: engine + public surface + self-check** — `45963bb` (feat)
2. **Task 2: engine + registry specs** — `770ed58` (test)
3. **Task 3: boot self-check wiring + architecture spec** — `5339613` (feat)

## Files Created/Modified
- `server/src/services/validation/engine.ts` — pure `evaluate()` + `ValidationEngineError`
- `server/src/services/validation/selfCheck.ts` — `assertRuleRegistryValid()` (RULE_SET_INVALID)
- `server/src/services/validation/index.ts` — public surface (evaluate, version, self-check, types)
- `server/src/index.ts` — boot self-check called in step 1a before listen
- `server/test/unit/validation.engine.spec.ts` — 23 mechanism cases
- `server/test/unit/validation.registry.spec.ts` — 6 FR-4.15 integrity cases
- `server/test/architecture/validation.spec.ts` — 7 permanent build constraints

## Decisions Made
- **selfCheck.ts with Task 1, not Task 3.** `index.ts` (Task 1) re-exports `assertRuleRegistryValid`, and Task 1's `<verify>` runs `npm run typecheck` — the export must resolve, so the module landed in the Task 1 commit. Its wiring into `server/src/index.ts` and its architecture coverage remained in Task 3 as planned.
- **Optional `rules` parameter on `evaluate`.** Cases 19–20 need a throwing / out-of-set rule; a default-`RULES` third parameter injects one without mutating the real registry, which the plan explicitly permitted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Purity assertion refined to the zero-argument `new Date()` only**
- **Found during:** Task 3 (architecture spec first run)
- **Issue:** The plan's assertion-1 sketch forbids `new Date(` broadly. `normalise.ts` (plan 03-02) legitimately calls `new Date(isoTimestamp)` and `new Date(base + n*86400000)` in the RIV-132 UTC helpers — an argument-form parse that is deterministic and is exactly what the module's own header promises ("never uses zero-argument Date construction"). A blanket `new Date(` ban flags deterministic parsing and would defeat the assertion's own purpose (determinism). The first run failed on this true positive.
- **Fix:** Narrowed the forbidden pattern to `new\s+Date\s*\(\s*\)` (the empty-argument clock read), with a comment explaining why the argument form is permitted. `Date.now()`, `Math.random`, `process.env`, `crypto.`, `pg`/`express`/`node:crypto`/`node:fs`/`node:http(s)`, pool/tx/repository value imports remain forbidden.
- **Files modified:** `server/test/architecture/validation.spec.ts`
- **Verification:** Assertion proven RED on a planted `Date.now()` in `engine.ts` then restored (0 occurrences remain); the suite is green against the real directory.
- **Committed in:** `5339613` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a correctness fix to the test's own regex).
**Impact on plan:** No scope change. The assertion still forbids every clock read and non-deterministic source; it simply no longer misfires on deterministic argument-form date parsing, which is what "determinism is structural" actually requires.

## Known Stubs
None found — the changed files contain no TODO/FIXME/placeholder/not-implemented markers, no hardcoded returns, and no empty function bodies. `evaluate`, `assertRuleRegistryValid` and every test assertion are fully implemented.

## Issues Encountered
- The plan's `<verify>` blocks use `vitest --reporter=list`, which vitest 2.1.5 rejects ("Failed to load custom Reporter from list"). Ran the specs with `--reporter=verbose` instead — a runner-invocation detail, not a code issue; all specs pass.
- **Note (out of scope, resolved upstream):** the previously-deferred `scaffolding.spec.ts` INTERNAL_INVARIANT_CODES=9 mismatch is no longer failing — `test:unit` is 218/218 green, so 03-01's addition has since been reconciled. Left untouched (owner = 03-01).

## Deviations — Database Contract
Not applicable to this plan: it adds pure evaluation code and tests only — no schema, no migration, no compose change. `schema.spec.ts` still pins the thirteen application tables (verified green in `test:arch`).

## Next Phase Readiness
- F4's mechanism is complete and deterministic: `evaluate` is ready to be called inside F3's receipt transaction (plan 03-07 asserts the single call site), its `findings` are ready to derive the F5 exception basis and render in the F6 UI, and F9/F10 consume them unchanged.
- The boot self-check makes an inconsistent rule set a deployment failure; the architecture spec makes purity, the no-endpoint/no-bypass rule, the no-grading rule and the no-reference-table rule permanent build constraints re-run by every later phase.

## Self-Check: PASSED
- Created files exist on disk: engine.ts, selfCheck.ts, index.ts, validation.engine.spec.ts, validation.registry.spec.ts, validation.spec.ts — all present.
- Commits exist: `45963bb`, `770ed58`, `5339613`.
- Build check: `npm run build:server` → exit 0; `npm run typecheck` → exit 0.
- Test gates: `npm run test:unit` 218/218; `npm run test:arch` 137/137 (incl. validation.spec.ts 7/7, API_ROUTE_TABLE.length === 10); engine+registry specs TZ-stable under UTC and Pacific/Kiritimati.
- Known Stubs: none blocking (section present).

---
*Phase: 03-receive-validate-except*
*Completed: 2026-09-15*
