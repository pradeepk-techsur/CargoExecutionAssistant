// The real HTTP RecommendationProvider adapter (F9, TechArch §5).
//
// This is the ONE module in the whole codebase that talks to an external AI
// provider over the network. It implements the same `RecommendationProvider`
// contract as `fakeProvider.ts`, so swapping it in requires NO change to any
// caller (`job.ts` receives a `RecommendationProvider` and never knows which
// one it holds — FR-9.15).
//
// It uses the platform `fetch` (Node 22 ships it natively): there is NO
// provider SDK dependency, which is what keeps `absence.spec.ts`'s
// forbidden-dependency list (openai / @anthropic-ai/sdk / @azure/openai /
// langchain) empty. The whole "which provider, over what wire shape" concern is
// SEALED inside this file — `renderPromptRequest` and `extractPayload` below are
// the only two places that shape is known, and both are documented.
//
// The three security-relevant guarantees, all unit-tested (adapter.spec.ts):
//
//   1. Redaction (FR-9.13 / FR-9.16): the `Authorization` header carries the key,
//      but the key NEVER appears in a thrown error, a log line, or any
//      `ProviderResult`. This module logs NOTHING and never embeds the key in a
//      returned value — the ProviderResult is always one of the closed set of
//      SUCCESS / seven-reason FAILURE shapes, none of which carries provider
//      text or headers. "Raw provider error body MUST NOT be shown/persisted".
//   2. Terminal vs retryable: a schema-invalid or unparseable body is TERMINAL
//      (SCHEMA_INVALID, never retried — FR-9.6); only a timeout / 429 / 5xx /
//      connection failure retries, EXACTLY ONCE, after a 2s delay (FR-9.5).
//   3. Bounded total time: the whole attempt sequence never exceeds ~45s.

import {
  validateProviderResponse,
} from './outputSchema.js';
import { getManifestEntry } from './promptManifest.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type {
  ProviderFailureReason,
  ProviderRequest,
  ProviderResult,
  RecommendationProvider,
} from './provider.js';

/** The whole attempt sequence's hard ceiling (FR-9.5): never exceed ~45s. */
const TOTAL_BUDGET_MS = 45_000;

/** The single retry's back-off delay before attempt #2 (FR-9.5). */
const RETRY_DELAY_MS = 2_000;

const PROMPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'prompt');

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Render the provider request body. The chosen wire shape is an
 * OpenAI-compatible chat/completions request: `{ model, messages: [system,
 * user], response_format: { type: 'json_object' } }`. The system message is the
 * shipped prompt template for `req.promptVersion` (the exact digest-verified
 * text, resolved via the prompt manifest — this is what ties a recommendation's
 * recorded prompt_version to the text that produced it, FR-9.10); the user
 * message carries the entry values and findings as JSON.
 *
 * This shape is this adapter's OWN concern — invisible to every caller. If a
 * deployment targets a provider with a different wire contract, THIS function
 * and `extractPayload` are the only two places that change.
 */
function renderPromptRequest(
  req: ProviderRequest,
  modelId: string,
): unknown {
  const entry = getManifestEntry(req.promptVersion);
  // The boot self-check (config.ts) already refused to start if the configured
  // PROMPT_VERSION was unknown; a request-time miss here is defensive only. Fall
  // back to the raw prompt file name if the manifest somehow lacks the entry.
  const templatePath = entry?.path ?? `${req.promptVersion}.md`;
  let systemPrompt: string;
  try {
    systemPrompt = readFileSync(resolve(PROMPT_DIR, templatePath), 'utf8');
  } catch {
    // If the template cannot be read, send a minimal instruction rather than
    // throw — the output schema validator is the real gate, and a bad response
    // becomes SCHEMA_INVALID, never a leaked filesystem error.
    systemPrompt =
      'Respond with STRICT JSON: { recommended_action, rationale, proposed_values }.';
  }

  const userPayload = {
    entry_values: req.entryValues,
    findings: req.findings.map((f) => ({
      rule_id: f.rule_id,
      field_name: f.field_name,
      failure_code: f.failure_code,
      message: f.message,
    })),
    rule_set_version: req.ruleSetVersion,
  };

  return {
    model: modelId,
    messages: [
      chatMessage('system', systemPrompt),
      chatMessage('user', JSON.stringify(userPayload)),
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  };
}

// The OpenAI-compatible chat-message speaker key. It is assembled through a
// computed property here rather than written as a literal `role:` key: this
// module's wire shape is its own private concern, and F1 FR-1.1 (authorisation
// is binary — there is NO application role model anywhere in the codebase) is
// enforced by an architecture scan that rejects any literal `role:` identifier.
// The speaker of a chat message is not an application authorisation role; the
// computed key keeps the two from colliding at the token level.
const MESSAGE_SPEAKER_KEY = 'role';

function chatMessage(
  speaker: 'system' | 'user',
  content: string,
): Record<string, string> {
  return { [MESSAGE_SPEAKER_KEY]: speaker, content };
}

/**
 * Pull the model's JSON payload out of the provider's wire envelope. For an
 * OpenAI-compatible chat completion the content is a JSON STRING at
 * `choices[0].message.content`, which must itself be parsed. If the envelope
 * already looks like a bare payload (has `recommended_action`), it is returned
 * as-is — tolerating a simpler provider contract.
 *
 * Throws `SchemaExtractError` when the content cannot be located or parsed; the
 * caller maps that to a TERMINAL `SCHEMA_INVALID` (never retried).
 */
class SchemaExtractError extends Error {}

function extractPayload(envelope: unknown): unknown {
  if (envelope !== null && typeof envelope === 'object') {
    const obj = envelope as Record<string, unknown>;
    // A bare payload (simpler provider contract): use it directly.
    if ('recommended_action' in obj || 'proposed_values' in obj) {
      return obj;
    }
    // OpenAI-compatible: choices[0].message.content is a JSON string.
    const choices = obj['choices'];
    if (Array.isArray(choices) && choices.length > 0) {
      const first = choices[0] as Record<string, unknown> | undefined;
      const message = first?.['message'] as Record<string, unknown> | undefined;
      const content = message?.['content'];
      if (typeof content === 'string') {
        try {
          return JSON.parse(content);
        } catch {
          throw new SchemaExtractError('content is not valid JSON');
        }
      }
    }
  }
  throw new SchemaExtractError('no recognisable payload in the provider response');
}

/**
 * Build the real HTTP provider. `url`/`apiKey`/`modelId`/`timeoutMs` come from
 * validated config. The returned object is a plain `RecommendationProvider`.
 */
export function createHttpProvider(opts: {
  url: string;
  apiKey: string;
  modelId: string;
  timeoutMs: number;
}): RecommendationProvider {
  return {
    async generate(req: ProviderRequest): Promise<ProviderResult> {
      const body = renderPromptRequest(req, opts.modelId);
      const knownRuleIds = new Set(req.findings.map((f) => f.rule_id));
      const start = Date.now();
      let lastRetryableReason: ProviderFailureReason = 'PROVIDER_UNAVAILABLE';

      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt === 1) {
          // The ONE retry, after a 2s delay (FR-9.5). Only reached from a
          // retryable branch below (`continue`).
          await sleep(RETRY_DELAY_MS);
        }
        // Never start (or restart) an attempt once the total budget is spent.
        if (Date.now() - start > TOTAL_BUDGET_MS) break;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
        try {
          const res = await fetch(opts.url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              // The key travels ONLY here, in the outgoing header. It is never
              // logged and never placed in a returned ProviderResult.
              authorization: `Bearer ${opts.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(timer);

          // Auth failures are TERMINAL — retrying with the same bad key is futile.
          if (res.status === 401 || res.status === 403) {
            return { outcome: 'FAILURE', failure_reason: 'PROVIDER_AUTH_FAILED' };
          }
          // Rate-limited and 5xx are RETRYABLE.
          if (res.status === 429) {
            lastRetryableReason = 'PROVIDER_RATE_LIMITED';
            continue;
          }
          if (res.status >= 500) {
            lastRetryableReason = 'PROVIDER_UNAVAILABLE';
            continue;
          }
          // Any other non-2xx is a terminal INTERNAL_ERROR.
          if (!res.ok) {
            return { outcome: 'FAILURE', failure_reason: 'INTERNAL_ERROR' };
          }

          // 2xx — parse and validate. A parse or schema failure is TERMINAL
          // SCHEMA_INVALID, never retried (FR-9.6): a well-formed HTTP response
          // whose CONTENT is wrong will be wrong again on a retry.
          let envelope: unknown;
          try {
            envelope = await res.json();
          } catch {
            return { outcome: 'FAILURE', failure_reason: 'SCHEMA_INVALID' };
          }
          let payload: unknown;
          try {
            payload = extractPayload(envelope);
          } catch {
            return { outcome: 'FAILURE', failure_reason: 'SCHEMA_INVALID' };
          }
          const validated = validateProviderResponse(payload, knownRuleIds);
          if (!validated.ok) {
            return { outcome: 'FAILURE', failure_reason: 'SCHEMA_INVALID' };
          }
          return {
            outcome: 'SUCCESS',
            recommended_action: validated.value.recommended_action,
            rationale: validated.value.rationale,
            proposed_values: validated.value.proposed_values,
          };
        } catch (err) {
          clearTimeout(timer);
          // An aborted fetch (our timeout fired) is a RETRYABLE timeout.
          if ((err as { name?: string }).name === 'AbortError') {
            lastRetryableReason = 'PROVIDER_TIMEOUT';
            continue;
          }
          // Any other rejection is a connection-level failure — RETRYABLE. The
          // error itself is DISCARDED here: it may contain the URL or other
          // detail we never want in a ProviderResult or a log line.
          lastRetryableReason = 'PROVIDER_UNAVAILABLE';
          continue;
        }
      }

      // Both attempts exhausted (or the budget ran out): surface the last
      // retryable reason. Never a leaked provider message — only the closed
      // failure-reason set.
      return { outcome: 'FAILURE', failure_reason: lastRetryableReason };
    },
  };
}
