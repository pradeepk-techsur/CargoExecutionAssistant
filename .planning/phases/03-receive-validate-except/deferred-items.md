# Deferred Items — Phase 03 (receive-validate-except)

Out-of-scope discoveries logged during plan execution. NOT fixed by the
discovering plan (scope boundary: only auto-fix issues directly caused by the
current task's changes).

## From plan 03-03 (API auth gate)

- **`server/test/unit/scaffolding.spec.ts` fails: `INTERNAL_INVARIANT_CODES`
  has 9 codes, test expects 8.**
  - Discovered during: 03-03 final `npm run test` (unit tier).
  - Root cause: plan **03-01** commit `f12ed52` added a 9th invariant code
    (`VALIDATION_ENGINE_FAILURE`) to `contract/src/errors.ts` but did not
    update `server/test/unit/scaffolding.spec.ts`, which still asserts
    `toHaveLength(8)` and a fixed 8-element set.
  - Owner: plan **03-01** (the plan that introduced the drift), or whichever
    later plan touches the contract error scaffolding. Fix = update the
    scaffolding spec to expect 9 codes including `VALIDATION_ENGINE_FAILURE`.
  - Out of scope for 03-03: this plan touches only `requireApiAuth.ts`,
    `app.ts`, `guard.spec.ts`, and `session.spec.ts` — none of which touch the
    contract or the scaffolding spec. The api and arch tiers that 03-03 owns
    are fully green (77 api, 130 arch).
