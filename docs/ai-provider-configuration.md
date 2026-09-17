# Configuring the AI recommendation provider

This document is the operator's guide to pointing a CargoExec deployment at a
real hosted LLM, as required by **FR-9.20** (TechArch §5.9). It covers what the
requirement is, how to satisfy it by configuration alone, the no-SDK /
no-code-change guarantee, and the single conditional follow-up that only applies
if the chosen provider does not speak an OpenAI-compatible wire shape.

Nothing here changes application code. Plan 07-02 makes the deployment *default*
refuse to run against the fake provider; this document tells an operator what to
set instead.

---

## 1. What FR-9.20 requires

A **demonstration or production deployment must generate its resolution
recommendations by calling a real hosted LLM** over HTTPS — not the built-in
deterministic fake provider.

Concretely, a real-provider deployment sets three environment variables:

| Variable          | What it is                                                                 |
| ----------------- | -------------------------------------------------------------------------- |
| `AI_PROVIDER_URL` | The provider's `https://` chat/completions endpoint URL.                   |
| `AI_API_KEY`      | A valid API key / credential for that endpoint, with access to the model.  |
| `AI_MODEL_ID`     | The exact model identifier (and version string) to request.               |

The deterministic fake provider — `AI_PROVIDER_URL=fake:deterministic` — is
valid **only** as an explicit, deliberate override for local development and the
automated test suites. It must never be the shipped default.

Plan 07-02 makes this structural rather than a matter of discipline:
`docker-compose.yml` declares `AI_PROVIDER_URL` as a **mandatory** variable
(`${AI_PROVIDER_URL:?...}`). A `docker compose config` or `docker compose up`
with no value set **fails loudly, naming `AI_PROVIDER_URL`**, instead of silently
inheriting the fake provider. There is deliberately no silent default — a
demonstration deployment can no longer boot against the fake provider by
accident.

The application's own boot self-check (`server/src/config.ts`, §6.6) then
enforces the rest:

- `AI_PROVIDER_URL` must be either an `https://` URL **or** the literal
  `fake:deterministic`. A plain-`http://` provider, any other scheme, an empty
  value, or a missing value is refused at boot.
- `AI_API_KEY` is required (non-empty) **only** when `AI_PROVIDER_URL` is a real
  `https://` provider. In the fake posture there is no provider to authenticate
  to, so the key may be absent.
- `AI_MODEL_ID` and `PROMPT_VERSION` are always required. `PROMPT_VERSION` must
  name a known prompt manifest entry whose template digest still matches, or the
  server refuses to start.

Every one of these checks names the offending **key**, never its value (§4.7),
so an API key never reaches a log line by way of an error message.

---

## 2. How to configure it

You supply the three variables in either of two ways. Both feed the same
`web` service in `docker-compose.yml`.

### Option A — a local `.env` consumed by `docker compose`

```bash
cp .env.example .env
# then edit .env and set, at minimum:
#   AI_PROVIDER_URL=https://api.your-provider.example/v1/chat/completions
#   AI_API_KEY=sk-...your-real-key...
#   AI_MODEL_ID=your-provider-model-id
#   PROMPT_VERSION=2026.09.1
docker compose up --build
```

`.env.example` ships these four keys **empty** on purpose: `loadConfig()` refuses
to boot until you choose explicitly, so there is no way to start a real
deployment that quietly falls back to the fake provider.

### Option B — shell-exported overrides passed directly to compose

```bash
export AI_PROVIDER_URL=https://api.your-provider.example/v1/chat/completions
export AI_API_KEY=sk-...your-real-key...
export AI_MODEL_ID=your-provider-model-id
export PROMPT_VERSION=2026.09.1
docker compose up --build
```

### The fake provider, when you deliberately want it (local/test only)

```bash
AI_PROVIDER_URL=fake:deterministic \
AI_MODEL_ID=demo-fake-model \
PROMPT_VERSION=2026.09.1 \
docker compose up --build
```

This is the *only* supported way to run against the fake provider: an explicit,
one-line, self-documenting override — never the default.

### What "unset" now does

```bash
# AI_PROVIDER_URL not set at all:
docker compose config
# → error while interpolating services.web.environment.AI_PROVIDER_URL:
#   required variable AI_PROVIDER_URL is missing a value: AI_PROVIDER_URL must
#   be set explicitly - a real https:// LLM endpoint ... or the literal
#   fake:deterministic ...
```

The deployment refuses to proceed rather than silently defaulting to the fake
provider. That loud failure is the point of FR-9.20.

---

## 3. The no-SDK, no-code-change guarantee (TechArch §5.9)

The HTTP adapter (`server/src/ai/adapter.http.ts`) speaks **plain HTTPS using the
platform `fetch`** — there is no vendor SDK anywhere in the AI path (the
architecture's absence test keeps the forbidden-dependency list empty). It sends
and expects an **OpenAI-compatible chat/completions request/response shape**.

Consequently, **if the provider you choose is OpenAI-compatible, no code changes
are required — only the configuration in §2.** Point `AI_PROVIDER_URL` at its
chat/completions endpoint, supply `AI_API_KEY` and `AI_MODEL_ID`, and the
existing retry, timeout, and schema-validation logic all apply unchanged:

- one retry after a short delay on timeout / `429` / `5xx` / connection failure,
  within a bounded total budget;
- a schema-invalid or unparseable response is **terminal**, never retried;
- the API key travels only in the `Authorization` header and never appears in a
  thrown error, a log line, or a `ProviderResult`.

None of that logic changes to onboard an OpenAI-compatible provider.

---

## 4. Conditional follow-up: a non-OpenAI-compatible provider

**This is a conditional, not a certainty.** No specific provider has been chosen
yet, and this document does **not** modify any code. It records — for whoever
later selects a provider — the *only* place a change would be needed if that
provider's wire shape is **not** OpenAI-compatible chat/completions.

If, and only if, the chosen provider's request/response shape differs from
OpenAI's chat/completions, the two functions expected to need adjustment are
both inside `server/src/ai/adapter.http.ts` (TechArch §5.9):

- **`renderPromptRequest`** — builds the outbound request body from the internal
  prompt request; and
- **`extractPayload`** — pulls the model's answer envelope out of the provider's
  response body before it is schema-validated.

Everything else is deliberately **provider-shape-agnostic** and needs no change:

- the `RecommendationProvider` interface in `server/src/ai/provider.ts`;
- the dispatch / idempotence machinery in `server/src/ai/worker.ts`;
- the persistence and audit steps in `server/src/ai/job.ts`;
- the degradation / failure-reason table.

The wire shape is intentionally **sealed** inside those two functions so that a
new provider's format is a localised edit, not an architectural change. That
edit is **deferred, explicitly, until an actual provider is chosen and its wire
shape is known** — it is out of scope for this configuration document.

---

## 5. Interaction with the demo seed script

The demo seed script (see [`docs/seed-demo-case.md`](./seed-demo-case.md),
plan 07-01) walks a case through the full lifecycle. When it runs against a
**real-provider** deployment configured as above, its recommendation-generation
step performs one **genuine** generation call against the configured hosted LLM —
not the deterministic fake provider. Running the same script against a
`fake:deterministic` deployment instead exercises the no-network fake path. The
provider the seed uses is therefore whatever `AI_PROVIDER_URL` names at boot;
there is no separate switch.
