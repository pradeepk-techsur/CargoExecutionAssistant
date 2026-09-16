# Phase 05 — Deferred Items

Out-of-scope discoveries logged during plan execution. Per the execute-plan
SCOPE BOUNDARY rule, these are NOT fixed by the plan that discovered them —
they belong to their owning plan/module.

## From 05-03 (F9 polling endpoint)

- **`server/test/unit/config.spec.ts` — 7 failures + `server/test/architecture/headers.spec.ts:274` — 1 failure**, both caused by an in-flight, uncommitted `server/src/config.ts` change (adds `AI_PROVIDER_URL` https/`fake:deterministic` validation) from a PARALLEL wave-1 plan (05-01/05-02). The new required env key is not yet supplied by these older config tests. **Not caused by 05-03** — 05-03 touches only `services/recommendationRead.service.ts`, `http/routes/recommendation.ts`, `http/routes/index.ts`, `test/api/boot.spec.ts`, `test/api/recommendation.spec.ts`, none of which import or exercise the AI provider config. Owner = the config-authoring plan (05-01/05-02): update `config.spec.ts` / `headers.spec.ts`'s `base` env fixture to include a valid `AI_PROVIDER_URL` (e.g. `fake:deterministic`). 05-03's own tiers (api 134, db 183, arch route/allowlist assertions) are all green.

## From 05-UAT (gap closure — deferred, NOT a Phase 5 defect)

- **UAT test 4 ("Case opens immediately while AI recommendation catches up") reported an
  issue: clicking "New Cargo Entry" shows "This screen is not available in this build."**
  `status: deferred` — see `05-UAT.md` Gaps section (`confidence: proven`, browser-verified).
  - **Root cause (proven, not this phase's code):** `web/src/app/router.tsx` maps
    `/entries/new` to the `NotBuiltYet` placeholder because the assembled cargo-entry
    form screen — Phase 3 plans **03-09/03-10** — was never authored (only 03-01..03-08
    exist). `03-VERIFICATION.md` (verified 2026-09-15T17:22:09Z, **before** Phase 5's UAT
    round on 2026-09-15T23:43Z+) already documents this exact gap under its own success
    criteria 1-3, naming 03-09/03-10 as the missing plans.
  - **Why this is out of Phase 5's scope:** Phase 5's plan 05-05 (the only plan in this
    phase to touch `router.tsx`) was explicitly scoped to `/cases/:caseReference` only,
    and explicitly instructed NOT to touch `/entries/new` or `NotBuiltYet.tsx` — confirmed
    in 05-05's own plan text and SUMMARY. Phase 5 built and proved F9 (async AI generation
    that never blocks receipt — `recommendationDispatch.spec.ts`) and F10 (the case-detail
    screen) end to end; the entry point that would let a specialist reach a NEW case in a
    live browser session belongs to Phase 3's undelivered scope, not Phase 5's.
  - **Owner:** Phase 3 gap-closure (author 03-09/03-10: the assembled `/entries/new`
    screen composing the existing `UswdsForm` primitives + `api.createEntry` + the
    focus-moving `ErrorSummary`, per `03-VERIFICATION.md`'s `missing` list). Once that
    screen exists, this same UAT scenario (test 4) should be re-walked — the async/
    in-progress AI behaviour it was actually trying to probe (PENDING→AVAILABLE poll,
    no blocking) is already proven in Phase 5 by `case-detail.spec.ts` and
    `recommendationDispatch.spec.ts`; only the entry point to reach a *new* case was
    missing.
  - **No PLAN.md created for this in Phase 5** — per the gap-closure scope rule
    (cross-phase work is deferred, never built as a different phase's "fix").

## From 05-06 (F9/F10 e2e + a11y sign-off)

- **`docker-compose.yml`'s `web` service declares no AI environment variables**, but as of plan 05-01 `loadConfig` makes `AI_PROVIDER_URL`, `AI_MODEL_ID` and `PROMPT_VERSION` REQUIRED (the AI self-checks abort boot without them). A fresh `docker compose up --build` would now fail to start the web service. The currently-running `cargoexec-web` container predates those checks (an older image layer) and boots only because it was never rebuilt. **Not fixed here** — 05-06's declared files are `e2e/env.ts`, `e2e/case-detail.spec.ts`, `docs/a11y/case-detail.md`, `docs/uswds-conformance-register.md`; the e2e path is fully handled (the Playwright webServer gets the keys via `e2e/env.ts`). Owner = the deployment/compose plan (Phase 6's end-to-end demo, which brings the whole stack up under compose): add the five §6.6 AI keys to the `web` service's `environment:` block, with `AI_PROVIDER_URL` defaulting to `fake:deterministic` for the local/demo posture (mirroring `e2e/env.ts`). The plan 05-01 threat note (T-05-16) already accepts `fake:deterministic` as the explicit non-production posture. NOTE: to run the e2e suite locally now, `docker stop cargoexec-web` first so the Playwright webServer (which reuses an existing server on :3000) boots its own fresh server with the fake-provider env.
