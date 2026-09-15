# Phase 05 — Deferred Items

Out-of-scope discoveries logged during plan execution. Per the execute-plan
SCOPE BOUNDARY rule, these are NOT fixed by the plan that discovered them —
they belong to their owning plan/module.

## From 05-03 (F9 polling endpoint)

- **`server/test/unit/config.spec.ts` — 7 failures + `server/test/architecture/headers.spec.ts:274` — 1 failure**, both caused by an in-flight, uncommitted `server/src/config.ts` change (adds `AI_PROVIDER_URL` https/`fake:deterministic` validation) from a PARALLEL wave-1 plan (05-01/05-02). The new required env key is not yet supplied by these older config tests. **Not caused by 05-03** — 05-03 touches only `services/recommendationRead.service.ts`, `http/routes/recommendation.ts`, `http/routes/index.ts`, `test/api/boot.spec.ts`, `test/api/recommendation.spec.ts`, none of which import or exercise the AI provider config. Owner = the config-authoring plan (05-01/05-02): update `config.spec.ts` / `headers.spec.ts`'s `base` env fixture to include a valid `AI_PROVIDER_URL` (e.g. `fake:deterministic`). 05-03's own tiers (api 134, db 183, arch route/allowlist assertions) are all green.

## From 05-06 (F9/F10 e2e + a11y sign-off)

- **`docker-compose.yml`'s `web` service declares no AI environment variables**, but as of plan 05-01 `loadConfig` makes `AI_PROVIDER_URL`, `AI_MODEL_ID` and `PROMPT_VERSION` REQUIRED (the AI self-checks abort boot without them). A fresh `docker compose up --build` would now fail to start the web service. The currently-running `cargoexec-web` container predates those checks (an older image layer) and boots only because it was never rebuilt. **Not fixed here** — 05-06's declared files are `e2e/env.ts`, `e2e/case-detail.spec.ts`, `docs/a11y/case-detail.md`, `docs/uswds-conformance-register.md`; the e2e path is fully handled (the Playwright webServer gets the keys via `e2e/env.ts`). Owner = the deployment/compose plan (Phase 6's end-to-end demo, which brings the whole stack up under compose): add the five §6.6 AI keys to the `web` service's `environment:` block, with `AI_PROVIDER_URL` defaulting to `fake:deterministic` for the local/demo posture (mirroring `e2e/env.ts`). The plan 05-01 threat note (T-05-16) already accepts `fake:deterministic` as the explicit non-production posture. NOTE: to run the e2e suite locally now, `docker stop cargoexec-web` first so the Playwright webServer (which reuses an existing server on :3000) boots its own fresh server with the fake-provider env.
