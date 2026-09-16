---
phase: 05-ai-recommendation-as-an-un-applied-proposal
plan: 01
subsystem: ai
tags: [ai, provider-abstraction, zod, sha256, config, fake-provider, F9]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate
    provides: RecommendationFailureReason contract union, ENTRY_FIELDS field set
  - phase: 02-identity-and-the-federal-ui-foundation
    provides: config.ts fail-loud self-check pattern, logger fallback config
provides:
  - RecommendationProvider interface — the sole AI type surface (FR-9.15)
  - validateProviderResponse — FR-9.7/9.8/9.9 closed-schema output validator
  - createFakeProvider — deterministic no-network provider with all 8 outcome branches
  - getManifestEntry / computeFileDigestSync — prompt-digest boot self-check primitives
  - config.ts extended with six AI environment keys + six fail-loud self-checks
affects:
  - 05-02 (recommendation DB write path programs against ProviderResult)
  - 05-04 (real HTTP adapter implements RecommendationProvider, reuses validateProviderResponse)
  - 05-06 (e2e demonstration runs the fake:deterministic posture)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Provider abstraction: one interface (provider.ts) is the only AI type surface any consumer imports"
    - "Closed-schema validation: .strict() zod excludes forbidden determinations structurally, not by denylist"
    - "Named non-production posture: AI_PROVIDER_URL=fake:deterministic (mirrors SESSION_COOKIE_PROFILE=demo-iframe)"
    - "Static-asset build step: copy-prompt-assets.mjs ships non-.ts files into dist/ so the runtime image carries them"
    - "Boot-time trust anchor: SHA-256 digest self-check refuses to start on a template edited without a version bump"

key-files:
  created:
    - server/src/ai/provider.ts
    - server/src/ai/outputSchema.ts
    - server/src/ai/fakeProvider.ts
    - server/src/ai/promptManifest.ts
    - server/src/ai/prompt/2026.09.1.md
    - server/src/ai/prompt/manifest.json
    - server/scripts/copy-prompt-assets.mjs
    - server/test/unit/ai/outputSchema.spec.ts
    - server/test/unit/ai/fakeProvider.spec.ts
    - server/test/unit/ai/promptManifest.spec.ts
  modified:
    - server/src/config.ts
    - server/src/http/logger.ts
    - package.json
    - server/test/unit/config.spec.ts
    - server/test/architecture/headers.spec.ts
    - server/test/api/helpers/appHarness.ts

key-decisions:
  - "PROVIDER_FAILURE_REASONS is type-asserted mutually assignable with the contract union so the two can never drift"
  - "FR-9.8's excluded-determination list is enforced structurally by .strict(), never by a hand-listed denylist"
  - "validateProviderResponse takes knownRuleIds so addresses_rule_ids is cross-checked against this exception's findings"
  - "Prompt templates copied into dist/ai/prompt at build so the digest self-check works in the runtime Docker image"
  - "AI_PROVIDER_URL=fake:deterministic is a named, self-documenting posture; AI_API_KEY is required only for a real https provider"

patterns-established:
  - "AI type surface: import from server/src/ai/provider.ts only; swapping providers changes no consumer"
  - "Prompt version = template digest pinned in manifest.json; a text change requires a version bump or boot fails"

# Metrics
duration: 8 min
completed: 2026-09-15
---

# Phase 5 Plan 01: AI Provider Core Summary

**The pure no-DB no-network core of F9: the `RecommendationProvider` seam every later plan programs against, a `.strict()` FR-9.7/9.8/9.9 output validator, a SHA-256 prompt-digest boot self-check, a deterministic 8-branch `FakeProvider`, and six fail-loud AI config self-checks.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-15T22:21:26Z
- **Completed:** 2026-09-15T22:29:07Z
- **Tasks:** 2
- **Files modified:** 16 (10 created, 6 modified)

## Accomplishments
- `RecommendationProvider`/`ProviderRequest`/`ProviderResult` defined once as the sole AI type surface (FR-9.15), carrying no specialist identity (FR-9.16), with `PROVIDER_FAILURE_REASONS` type-locked to the contract's seven-value union.
- `validateProviderResponse` enforces FR-9.7/9.8/9.9 as a closed schema: `.strict()` rejects any excluded determination (hts_code, duty_amount, tariff_rate, classification, admissibility, penalty, risk_score) structurally; duplicate `field_name`, out-of-set `addresses_rule_ids`, and a rule id leaked into the rationale are rejected post-parse.
- `createFakeProvider` deterministically produces all eight outcome branches (seven sentinel-driven FAILUREs + the AVAILABLE success) with zero network access; its success output round-trips through the validator.
- The addition-A-2 boot self-check: `config.ts` refuses to start if `PROMPT_VERSION` is unknown or the shipped template's SHA-256 digest no longer matches the manifest — proven end-to-end (a tampered dist template refuses boot).
- Six new AI environment keys are now required and validated in the existing fail-loud style, error messages naming the key never the value (§4.7).

## Task Commits

1. **Task 1: provider interface + output validator** - `e786730` (feat)
2. **Task 2: prompt digest self-check + FakeProvider + config** - `e212e58` (feat)
3. **Test fixture fixes (arch + api harness)** - `3f34390` (fix)

_The Task 1 own-code rationale-scan bug was fixed inline within `e786730` (see Deviations)._

## Files Created/Modified
- `server/src/ai/provider.ts` - RecommendationProvider + request/result types, anti-drift assertion vs contract
- `server/src/ai/outputSchema.ts` - validateProviderResponse, the FR-9.7/9.8/9.9 closed-schema gate
- `server/src/ai/fakeProvider.ts` - deterministic no-network provider, FAKE_AI_TRIGGERS sentinels
- `server/src/ai/promptManifest.ts` - getManifestEntry + computeFileDigestSync (import.meta.url based)
- `server/src/ai/prompt/2026.09.1.md` - the versioned prompt template (immutable, digest-pinned)
- `server/src/ai/prompt/manifest.json` - version → {path, sha256} map
- `server/scripts/copy-prompt-assets.mjs` - ships prompt files into dist/ai/prompt at build
- `server/src/config.ts` - six AI self-checks, AppConfig extended
- `server/src/http/logger.ts` - fallback config extended with inert AI fields
- `package.json` - build:prompt wired into build:server
- `server/test/unit/ai/*.spec.ts` - 42 new AI unit tests
- `server/test/unit/config.spec.ts` - minimalValid + AI self-check blocks (51 tests)
- `server/test/architecture/headers.spec.ts`, `server/test/api/helpers/appHarness.ts` - fixtures updated for mandatory AI keys

## Decisions Made
- **Prompt assets shipped into `dist/`:** `tsc` emits only `.js`/`.d.ts`; the runtime Docker image copies `server/dist` wholesale, so the `.md`/`.json` prompt files would be absent at runtime and the digest self-check would fail to find the template. A `copy-prompt-assets.mjs` step wired into `build:server` places them at `dist/ai/prompt/`, and `promptManifest.ts` resolves them relative to its own module (`import.meta.url`), so the check works under both vitest (source) and the compiled image.
- **`validateProviderResponse` cross-checks findings:** it takes a `knownRuleIds` set so FR-9.7's "rule ids present in this exception's findings" is enforceable — a response cannot be judged valid in isolation.
- **Closed schema over denylist:** FR-9.8's excluded determinations are rejected by `.strict()` alone; no forbidden-name list is maintained (it would be a second, driftable mechanism).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Anchored rule-id regex missed embedded rule ids in the rationale**
- **Found during:** Task 1 (output validator)
- **Issue:** The FR-9.9 rationale scan reused the anchored `^RIV-\d{3}$` pattern, so a rule id embedded mid-sentence (`"...fails RIV-010 and..."`) was not detected — the rationale-leak test failed.
- **Fix:** Added a separate non-anchored `RULE_ID_ANYWHERE_RE` for the free-text rationale scan; kept the anchored form for whole-token `addresses_rule_ids` validation.
- **Files modified:** server/src/ai/outputSchema.ts
- **Verification:** outputSchema.spec.ts FR-9.9 case passes; all 25 cases green.
- **Committed in:** e786730 (Task 1 commit)

**2. [Rule 3 - Blocking] logger.ts fallback config missing new AppConfig fields**
- **Found during:** Task 2 (config extension)
- **Issue:** Extending `AppConfig` with six AI fields broke `logger.ts`'s config-less fallback object (TS2740 — build failed).
- **Fix:** Added inert AI fallbacks (empty strings / defaults) to the fallback config, with a comment noting it never reaches the AI path.
- **Files modified:** server/src/http/logger.ts
- **Verification:** npm run build:server exits 0.
- **Committed in:** e212e58 (Task 2 commit)

**3. [Rule 1 - Bug] Arch + api config fixtures broke once AI keys became mandatory**
- **Found during:** Post-task verification (arch tier failed, api tier would not compile)
- **Issue:** `headers.spec.ts` built a `loadConfig` positive-control env without the now-required AI keys (its `.not.toThrow()` control failed); `appHarness.ts` `TEST_CONFIG: AppConfig` was missing the six new fields (compile error in the api tier).
- **Fix:** Added the fake-posture AI keys/fields to both fixtures.
- **Files modified:** server/test/architecture/headers.spec.ts, server/test/api/helpers/appHarness.ts
- **Verification:** test:arch 148/148, test:api 134/134, test:db 183/183 all green.
- **Committed in:** 3f34390 (fix commit)

---

**Total deviations:** 3 auto-fixed (2× Rule 1 bug, 1× Rule 3 blocking)
**Impact on plan:** All three necessary for correctness/compilation. Deviation 1 was an own-code bug in the FR-9.9 check; deviations 2 and 3 are the unavoidable ripple of extending `AppConfig` (the plan named config.spec.ts but not logger.ts/arch/api fixtures). No scope creep.

## Known Stubs
None found. The AI dir is complete for this plan's scope; the real HTTP adapter is plan 05-04 (deliberately out of scope), and the prompt template's runtime variable substitution is also 05-04's (this file ships the static template text, as specified).

## Issues Encountered
- The plan's `<verify>` used `--reporter=list`, which this vitest 2.1.5 rejects (`Failed to load custom Reporter from list`). Ran the same suites with the default reporter — a tooling-flag mismatch, not a code issue. All named suites pass.
- Note: `server/src/http/routes/index.ts` + `recommendation.ts` and `.planning/fragments/phase-5-roadmap.yaml` are pre-existing uncommitted in-flight work from another context (the F9 recommendation-polling read + its db/api tests). They are OUT OF SCOPE for 05-01 and were left untouched; the db/api tiers pass with them present.

## Next Phase Readiness
- `RecommendationProvider`, `validateProviderResponse`, `createFakeProvider`, and the AI config self-checks are stable and ready for plan 05-02 (DB write path) and 05-04 (real HTTP adapter).
- The `fake:deterministic` posture lets the whole Phase 5 pipeline run in tests and in the e2e demonstration with no external dependency.
- Full test suite green: unit 283, db 183, api 134, arch 148; build + typecheck exit 0.

## Self-Check: PASSED

- All created files exist on disk (source + copied dist prompt assets).
- All three task commits present (e786730, e212e58, 3f34390).
- Plan-level build ran: `npm run build` → exit 0 (server + web).
- Full test suite green: unit 283, db 183, api 134, arch 148; typecheck exit 0.
- `## Known Stubs`: none blocking.

---
*Phase: 05-ai-recommendation-as-an-un-applied-proposal*
*Completed: 2026-09-15*
