---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
plan: 02
subsystem: infra
tags: [docker-compose, ai, llm, deployment-posture, configuration, fr-9.20]

# Dependency graph
requires:
  - phase: 05-ai-recommendation-as-an-un-applied-proposal
    provides: "config.ts AI self-checks (AI_PROVIDER_URL https-or-fake:deterministic, AI_API_KEY https-only) and the fake:deterministic provider posture"
provides:
  - "docker-compose.yml AI_PROVIDER_URL is now a mandatory (no-default) variable — a deployment can no longer silently inherit the fake provider (FR-9.20)"
  - "docker-compose.yml AI_API_KEY passthrough (previously absent) so a compose-configured real-provider deployment can supply a key"
  - "docs/ai-provider-configuration.md: operator guide for pointing the deployment at a real hosted LLM by configuration alone"
  - ".env.example Phase 7 posture comment forcing an explicit real-provider or fake-override choice"
affects: [seed-demo-case, real-llm-integration, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compose mandatory-variable syntax ${VAR:?message} to convert a silent misconfiguration into a loud, named boot failure (mirrors config.ts's fail-loud self-checks)"

key-files:
  created:
    - docs/ai-provider-configuration.md
    - .planning/phases/07-redesign-ui-seeded-demo-data-and-real-llm-integration/07-USER-SETUP.md
  modified:
    - docker-compose.yml
    - .env.example

key-decisions:
  - "AI_PROVIDER_URL has no silent default: ${AI_PROVIDER_URL:?...} makes docker compose config/up fail loudly and named when unset, rather than defaulting to fake:deterministic (FR-9.20)"
  - "The mandatory-variable message value is double-quoted in YAML because its internal ': ' sequence broke the Compose v5 YAML scanner (deviation R1); the ':' after 'explicitly' was reworded to ' - ' to keep it unambiguous while preserving the AI_PROVIDER_URL:? contract token"
  - "Zero code changes to server/src/ai/* or config.ts — the provider abstraction and self-checks were already correct; this plan fixed only the deployment DEFAULT"

patterns-established:
  - "Deployment posture is enforced structurally in compose, not by operator discipline: a forbidden default is made impossible via ${VAR:?...}"

# Metrics
duration: 9 min
completed: 2026-09-17
---

# Phase 7 Plan 02: Real-LLM Deployment Posture (FR-9.20) Summary

**docker-compose.yml now refuses to boot without an explicit `AI_PROVIDER_URL` (mandatory `${VAR:?...}` variable + previously-missing `AI_API_KEY` passthrough), closing the FR-9.20 silent-fake-provider risk with zero code change, plus an operator guide for wiring a real hosted LLM.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-17T01:20:00Z
- **Completed:** 2026-09-17T01:29:35Z
- **Tasks:** 2
- **Files created/modified:** 4 (2 modified, 2 created)

## Accomplishments
- `docker-compose.yml` `AI_PROVIDER_URL` is a mandatory (no-default) variable — `docker compose config`/`up` fails loudly and names the key when unset, so a demonstration/production deployment can no longer silently inherit `fake:deterministic` (the exact FR-9.20 risk).
- Added the previously-absent `AI_API_KEY` passthrough to the `web` service (default empty), so a compose-only real-provider deployment can actually supply a key; `config.ts` requires it only for a real `https://` provider.
- `.env.example` now documents the Phase 7 posture, forcing a developer to choose a real provider or the explicit `fake:deterministic` override before `loadConfig()` boots.
- `docs/ai-provider-configuration.md` gives operators the configuration-only path (OpenAI-compatible → no code change) and states the `renderPromptRequest`/`extractPayload` follow-up as an explicit CONDITIONAL, not an implemented change.

## Task Commits

Each task was committed atomically:

1. **Task 1: docker-compose.yml and .env.example — no silent fake-provider default** — `845b0f3` (feat)
2. **Task 2: Operator documentation for configuring a real provider** — `e5cc22c` (docs)

**Plan metadata:** (docs: complete plan — committed after this SUMMARY)

## Files Created/Modified
- `docker-compose.yml` — `AI_PROVIDER_URL` made mandatory via `${AI_PROVIDER_URL:?...}`; added `AI_API_KEY` passthrough; rewrote the AI-env comment block to state the Phase 7 / FR-9.20 posture.
- `.env.example` — added a Phase 7 posture comment above the AI key block explaining the explicit real-provider vs fake-override choice.
- `docs/ai-provider-configuration.md` (created) — operator guide: FR-9.20 requirement, how to configure, the no-SDK/no-code-change guarantee (§5.9), and the conditional non-OpenAI-compatible follow-up.
- `.planning/phases/07-.../07-USER-SETUP.md` (created) — human-required provider signup / key retrieval, generated from the plan's `user_setup` frontmatter.

## Decisions Made
- **No silent default for `AI_PROVIDER_URL`.** The mandatory-variable syntax converts a silent misconfiguration into a loud, named boot failure — the structural enforcement FR-9.20 needs, mirroring `config.ts`'s fail-loud philosophy.
- **Quote the mandatory-variable message.** The plan's literal message contained a `: ` sequence that the Compose v5 YAML scanner reads as a mapping (see Deviations). Double-quoting the value and rewording the internal `:` to ` - ` fixed it while keeping the `AI_PROVIDER_URL:?` contract token intact.
- **Zero server/src changes.** The AI provider abstraction, HTTP adapter, and config self-checks were already correct (Phase 5); this plan fixed only the deployment default, as scoped.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Double-quote the `AI_PROVIDER_URL` mandatory-variable message to satisfy the YAML scanner**
- **Found during:** Task 1 (verification — `docker compose config --quiet`)
- **Issue:** The plan's literal value `${AI_PROVIDER_URL:?AI_PROVIDER_URL must be set explicitly: a real https:// ...}` contains the sequence `explicitly: ` (colon-space). Unquoted, Docker Compose v5's YAML scanner reads that colon-space as a mapping indicator and aborts with `mapping values are not allowed in this context` at that line — so compose config failed even with the variable set.
- **Fix:** Wrapped the whole value in double quotes and reworded the internal `explicitly:` to `explicitly -` so no colon-space remains inside the message. `https://` and `fake:deterministic` are colons *without* a following space and are safe inside a quoted scalar. The `${AI_PROVIDER_URL:?...}` structure and the `AI_PROVIDER_URL:?` contract-verify token are both preserved.
- **Files modified:** docker-compose.yml
- **Verification:** `docker compose config --quiet` → `COMPOSE CONFIG VALID`; unset branch still fails naming the key (`MANDATORY VAR ENFORCED`); contract grep `AI_PROVIDER_URL:?` + `AI_API_KEY` → `CONTRACT_OK`.
- **Committed in:** `845b0f3` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required for the plan's own Task 1 verification to pass; it changes only YAML quoting/wording, not the posture or the enforced behaviour. No scope creep.

## Issues Encountered
None beyond the deviation above. Note: several unrelated files (`server/test/architecture/absence.spec.ts`, `web/styles/*.scss`, `server/src/cli/seed-demo-case.ts`, `.planning/fragments/phase-7-roadmap.yaml`) are modified/untracked in the working tree from **parallel Phase 7 plans (07-01/07-03)** running on the same branch — deliberately left untouched; only this plan's four files were staged/committed.

## User Setup Required

**External service configuration required.** See [07-USER-SETUP.md](./07-USER-SETUP.md) for:
- Signing up for / choosing a hosted LLM provider
- Setting `AI_PROVIDER_URL`, `AI_API_KEY`, `AI_MODEL_ID` (+ `PROMPT_VERSION=2026.09.1`)
- Retrieving an API key from the provider dashboard
- Verification commands

Claude cannot sign up for or select a commercial provider on the operator's behalf (plan `user_setup` rationale).

## Verification Performed
- `docker build -t pivota-build-check .` → exit 0 (`BUILD OK`).
- `docker compose config --quiet` with the three vars set → `COMPOSE CONFIG VALID`.
- `docker compose up -d` → `cargoexec-db` and `cargoexec-web` both reach `Up (healthy)`; `curl http://127.0.0.1:3000/api/session` → `HTTP 401` (app reachable, auth gate as expected); `docker compose down` → all containers removed cleanly.
- `AI_PROVIDER_URL` unset → `docker compose config` fails and names `AI_PROVIDER_URL` → `MANDATORY VAR ENFORCED`.
- Contract: `grep 'AI_PROVIDER_URL:?'` + `grep 'AI_API_KEY'` → `CONTRACT_OK`.
- `test -f docs/ai-provider-configuration.md && grep renderPromptRequest && grep FR-9.20` → `DOC OK`.
- Test suites unaffected (not re-run): this plan touches only `docker-compose.yml`, `.env.example`, and docs; `e2e/env.ts` hard-codes its own `AI_PROVIDER_URL=fake:deterministic` independently of the compose defaults, and no `server/src/**` or test file was modified.

## Known Stubs
None found — the doc's `renderPromptRequest`/`extractPayload` note is an explicit, intentional documented conditional (a deferred future change gated on provider selection), not an incomplete implementation of this plan's objective.

## Next Phase Readiness
- FR-9.20 deployment posture is closed structurally: no deployment can boot against the fake provider by accident.
- A real-provider deployment is now a pure configuration exercise (documented) for any OpenAI-compatible provider.
- Follow-up (out of scope, deferred): if a chosen provider is not OpenAI-compatible, edit `renderPromptRequest`/`extractPayload` in `server/src/ai/adapter.http.ts` once its wire shape is known.

## Self-Check: PASSED
- Created files exist on disk: `docs/ai-provider-configuration.md`, `07-USER-SETUP.md`, `07-02-SUMMARY.md` — all FOUND.
- Task commits exist: `845b0f3` (Task 1), `e5cc22c` (Task 2) — both FOUND.
- Build check: `docker build -t pivota-build-check .` exited 0 during Task 1 verification.
- `## Known Stubs` present with no blocking entries.

---
*Phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration*
*Completed: 2026-09-17*
