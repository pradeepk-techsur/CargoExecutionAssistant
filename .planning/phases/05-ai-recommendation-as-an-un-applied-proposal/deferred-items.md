# Phase 05 — Deferred Items

Out-of-scope discoveries logged during plan execution. Per the execute-plan
SCOPE BOUNDARY rule, these are NOT fixed by the plan that discovered them —
they belong to their owning plan/module.

## From 05-03 (F9 polling endpoint)

- **`server/test/unit/config.spec.ts` — 7 failures + `server/test/architecture/headers.spec.ts:274` — 1 failure**, both caused by an in-flight, uncommitted `server/src/config.ts` change (adds `AI_PROVIDER_URL` https/`fake:deterministic` validation) from a PARALLEL wave-1 plan (05-01/05-02). The new required env key is not yet supplied by these older config tests. **Not caused by 05-03** — 05-03 touches only `services/recommendationRead.service.ts`, `http/routes/recommendation.ts`, `http/routes/index.ts`, `test/api/boot.spec.ts`, `test/api/recommendation.spec.ts`, none of which import or exercise the AI provider config. Owner = the config-authoring plan (05-01/05-02): update `config.spec.ts` / `headers.spec.ts`'s `base` env fixture to include a valid `AI_PROVIDER_URL` (e.g. `fake:deterministic`). 05-03's own tiers (api 134, db 183, arch route/allowlist assertions) are all green.
