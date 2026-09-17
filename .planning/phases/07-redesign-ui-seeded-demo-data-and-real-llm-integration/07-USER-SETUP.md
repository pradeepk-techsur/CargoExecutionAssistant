# Phase 7: User Setup Required

**Generated:** 2026-09-17
**Phase:** 07-redesign-ui-seeded-demo-data-and-real-llm-integration
**Status:** Incomplete

Complete these items for the deployment to generate recommendations against a
real hosted LLM (FR-9.20). Claude automated everything possible — the compose
file and `.env.example` now *require* an explicit provider choice and fail
loudly without one — but signing up for a commercial LLM provider, choosing a
model, and retrieving an API key require human access to an external account
Claude does not hold.

See [`docs/ai-provider-configuration.md`](../../../docs/ai-provider-configuration.md)
for the full operator guide.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `AI_PROVIDER_URL` | The chosen provider's HTTPS chat/completions endpoint URL | `.env` |
| [ ] | `AI_API_KEY` | Chosen provider's dashboard → API keys / credentials section | `.env` |
| [ ] | `AI_MODEL_ID` | Chosen provider's model catalogue → exact model identifier + version | `.env` |
| [ ] | `PROMPT_VERSION` | Set to `2026.09.1` (must match `server/src/ai/prompt/manifest.json`) | `.env` |

## Account Setup

- [ ] **Choose and sign up for a hosted LLM provider** exposing an
      OpenAI-compatible `https://` chat/completions endpoint.
  - Skip if: You already have a provider account with chat/completions access.

## Dashboard Configuration

- [ ] **Create or locate an API key with access to a chat/completions model**
  - Location: The chosen provider's dashboard (API keys / credentials).
  - Notes: The key is required by `config.ts`'s boot self-check ONLY for a real
    `https://` provider. Never commit it — put it in `.env`, which is
    gitignored. If the provider's wire shape is NOT OpenAI-compatible, see
    §4 of `docs/ai-provider-configuration.md` (a deferred conditional change to
    `renderPromptRequest`/`extractPayload`, out of this phase's scope).

## Local Development / Test (no provider needed)

The deterministic fake provider remains available as an explicit override for
local/test use only — never a deployment default:

```bash
AI_PROVIDER_URL=fake:deterministic \
AI_MODEL_ID=demo-fake-model \
PROMPT_VERSION=2026.09.1 \
docker compose up --build
```

The automated suites are unaffected — `e2e/env.ts` hard-codes its own
`AI_PROVIDER_URL=fake:deterministic` independently of `docker-compose.yml`.

## Verification

After completing setup:

```bash
# Confirm the three real-provider vars are set in .env
grep -E 'AI_PROVIDER_URL|AI_API_KEY|AI_MODEL_ID' .env

# Compose validates cleanly with the vars set
docker compose config --quiet && echo "COMPOSE CONFIG VALID"

# And still refuses to boot with no provider chosen (the FR-9.20 guarantee)
env -u AI_PROVIDER_URL docker compose config 2>&1 | grep -qi AI_PROVIDER_URL \
  && echo "MANDATORY VAR ENFORCED"
```

Expected results:
- `docker compose config --quiet` succeeds when the vars are set.
- Unsetting `AI_PROVIDER_URL` makes `docker compose config` fail, naming the key.

---

**Once all items complete:** Mark status as "Complete" at top of file.
