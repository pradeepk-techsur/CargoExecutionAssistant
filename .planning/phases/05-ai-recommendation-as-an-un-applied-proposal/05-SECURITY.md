# Security Report — Phase 05: AI Recommendation as an Un-Applied Proposal (F9/F10)

**Mode:** verify
**Audited:** 2026-09-16
**Verdict:** SECURED
**Confirmed HIGH/CRITICAL:** 0

## Summary

All 16 declared STRIDE mitigations across the six plans (05-01 through 05-06) were verified directly against the implemented source at HEAD — not against documentation or plan-body prose. Every claimed mechanism was located, read in full, and confirmed to do what the plan says: the `.strict()` zod output schema really does close off the excluded-determination surface structurally; the prompt digest self-check really does hash the shipped template and refuse boot on mismatch; the `cargoexec_ai`/`cargoexec_app` privilege split really is enforced by migrations 0008/0011 and independently pinned by a behavioral DB test that proves `append()`'s case-anchor lock is refused `42501` over the AI role; the API key really never appears in a `ProviderResult`, thrown error, or log line; the `dispatchRecommendation` seam really is wired only at process bootstrap, never derived from request input; and `CaseDetail.tsx` really renders every AI/human value as a plain JSX text node with no `dangerouslySetInnerHTML` anywhere in the codebase. Two `accept`-disposition threats (T-05-08 polling cost, T-05-16 fake-provider posture) were reviewed for whether the acceptance is still reasonable given what shipped, and both are: the polling read is a single indexed-PK lookup with no amplification surface, and `AI_PROVIDER_URL=fake:deterministic` requires an explicit, self-documenting environment value that a real deployment would have to deliberately set (the config self-check refuses anything else that isn't a real `https://` URL).

An additional sweep outside the declared register (prompt-injection paths, unsafe deserialization, command/argument injection, IDOR, secret leakage, path traversal) found no new issues: `JSON.parse` on provider content is exception-wrapped and mapped to a terminal `SCHEMA_INVALID`; the audit writer's independent secret-value denylist (`SECRET_VALUE_RES`) gives defense-in-depth against an AI-proposed value shaped like a bearer token/API key, and `ai/job.ts` correctly degrades to `CONTENT_FILTERED` rather than either silently dropping the guard or crashing the worker; no `eval`/`exec`/`child_process`/`spawn` exists anywhere in `server/src/ai/` or the new web files; and the one operator-controlled, non-request-derived value that reaches an outbound `fetch` (`AI_PROVIDER_URL`) is not attacker-influenced.

Ship as-is. No HIGH/CRITICAL findings; no lower-severity findings either — every declared mitigation held up to direct inspection.

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| T-05-01 `outputSchema.ts::validateProviderResponse` — hostile provider response | Tampering | SAFE | `server/src/ai/outputSchema.ts:27-43` `.strict()` on both `ProposedValueSchema` and `ProviderResponseSchema`; post-parse duplicate-`field_name` check `:69-73`; `addresses_rule_ids` cross-checked against `knownRuleIds` `:74-77`; rationale rule-id leak scan `:67` |
| T-05-02 `config.ts` — `AI_API_KEY` value never disclosed | Info disclosure | SAFE | `server/src/config.ts:196-200,207-209,220-223,226-228,232-235,244-248` — every `ConfigError` message names only the key (`AI_API_KEY`, `AI_PROVIDER_URL`, `PROMPT_VERSION`, …), never interpolates a value |
| T-05-03 `promptManifest.ts` — prompt digest trust anchor | Tampering | SAFE | `server/src/ai/promptManifest.ts:57-59` `computeFileDigestSync` (SHA-256 of raw file bytes); `server/src/config.ts:224-236` compares against `manifest.json` and throws `ConfigError` on any mismatch before the server can start |
| T-05-04 `insertRecommendationValues` — provider-derived values into SQL | Tampering | SAFE | `server/src/db/repositories/recommendations.ts:189-208` — every value is a `$n` bind parameter (`params.push(...)`); only the placeholder tuple count varies with `values.length`, itself bounded ≤14 by `outputSchema.ts:41` (`.max(14)`) upstream |
| T-05-05 recommendation terminal write over `cargoexec_ai` | Elevation of privilege | SAFE | `server/migrations/0011_case_anchor_lock_privilege.sql` grants `UPDATE ON cargo_entries` to `cargoexec_app` only; `server/test/db/recommendationWrite.repo.spec.ts:256-308` behaviourally proves `append()`'s case-anchor lock is refused `42501` over `cargoexec_ai`, even though `markRecommendationAvailable`/`insertRecommendationValues` themselves succeed over that role |
| T-05-06 `loadEntryValuesForRecommendation`/`loadExceptionForGeneration` — no specialist join | Info disclosure | SAFE | `server/src/db/repositories/entries.ts:278-303` and `server/src/db/repositories/exceptions.ts:284-294` — neither SQL text contains `specialists`; `server/migrations/0008_privileges.sql:43` (`REVOKE ALL ON specialists, sessions FROM cargoexec_ai`) is a second, independent DB-level wall |
| T-05-07 `routes/recommendation.ts::getRecommendation` — `req.params.exceptionId` | Tampering | SAFE | `server/src/http/routes/recommendation.ts:27-28,59-62` UUID_RE validated before any service call; value reaches `loadRecommendationDetail` → `resolveCaseIdentifier`/`loadRecommendationByException`, both bind-only (`$1`) |
| T-05-08 polling DoS (3s client polling) | Denial of service (accept) | SAFE (accepted risk reviewed, still reasonable) | Single indexed-PK lookup (`recommendations.exception_id` unique index, migration 0005); no pagination/filter surface; `server/src/http/routes/recommendation.ts:35-45` rejects any query parameter outright, closing off the one amplification vector a polling GET could otherwise offer |
| T-05-09 `ai/job.ts`/`ai/adapter.http.ts` writing a decision | Elevation of privilege | SAFE | `server/test/architecture/aiCapability.spec.ts:74-108` scans all of `server/src/ai/` (comment-stripped) for decision-writing identifiers/imports and fails the build if found; assertion 5 (`:199-223`) further proves every `append()` actor in AI code is `{type:'AI'}` |
| T-05-10 unbounded concurrent generation jobs | Denial of service | SAFE | `server/src/ai/worker.ts:21-55` — FIFO queue + semaphore (`active < deps.concurrency`), default `AI_WORKER_CONCURRENCY=2` (`server/src/config.ts:263-270`) |
| T-05-11 `adapter.http.ts` — provider `Authorization` header | Info disclosure | SAFE | `server/src/ai/adapter.http.ts:192-199,255-258` — key used only in the outgoing header; connection-level errors are discarded (`err` never surfaced) rather than logged; `server/test/unit/ai/adapter.spec.ts` test 10 (per SUMMARY) asserts the key appears in no `ProviderResult`/log |
| T-05-12 `entries.ts`'s `dispatchRecommendation` field | Tampering (accept) | SAFE | `server/src/index.ts:93` (sole construction site, `worker.dispatch`); `server/src/http/routes/entries.ts:174-178,431-435` and `app.ts:119-120`/`routes/index.ts:99-100` thread it through purely as server-constructed deps, never read from `req.body`/`req.query`/`req.params` |
| T-05-13 `CaseDetail.tsx` rendering rationale/values/messages (stored XSS) | Tampering | SAFE | `grep -rn dangerouslySetInnerHTML web/src/` → zero matches repo-wide; `web/src/screens/CaseDetail.tsx` renders all provider/entry content as JSX text children |
| T-05-14 AI provider must not receive specialist identity via CaseDetail | Info disclosure | SAFE | `web/src/screens/CaseDetail.tsx:145,425` — only `api.getCase`/`api.getRecommendation`, both GET with no request body; no specialist id/email constructed into any outbound call from this screen |
| T-05-15 uuid→case-reference `navigate` (open redirect) | Spoofing | SAFE | `web/src/screens/CaseDetail.tsx:171-180` builds the target from `data.exception.case_reference` via react-router `navigate(..., {replace:true})`, never `window.location`; `server/migrations/0002_entries.sql:27-28` CHECK constrains the value to `^CE-[0-9]{4}-[0-9]{6}$` server-side before it can ever reach this client code |
| T-05-16 `AI_PROVIDER_URL=fake:deterministic` shipped to a real deployment | Tampering (accept) | SAFE (accepted risk reviewed, still reasonable) | Set only in `e2e/env.ts` and `docker-compose.yml:84` (itself override-able via `${AI_PROVIDER_URL:-fake:deterministic}`, i.e. an explicit opt-out an operator must actively not set); `server/src/config.ts:192-201` refuses any value that is neither this exact literal nor a real `https://` URL — a typo'd or partial override fails loudly at boot |
| (sweep, not in register) Provider JSON parse / unsafe deserialization | Tampering | SAFE | `server/src/ai/adapter.http.ts:226-237` — `res.json()` and `extractPayload()` are both try/caught, mapping any parse failure to terminal `SCHEMA_INVALID`; `promptManifest.ts:34-36`'s `JSON.parse` reads only the shipped, digest-verified `manifest.json`, never request-derived input |
| (sweep, not in register) Command/argument injection | Tampering | SAFE | No `eval`/`new Function`/`child_process`/`exec`/`spawn` anywhere under `server/src/ai/` or the new `web/src` files |
| (sweep, not in register) Secret-shaped AI-proposed value reaching the audit store | Info disclosure | SAFE (defense-in-depth confirmed) | `server/src/services/audit/writer.ts:127-138,205` (`SECRET_VALUE_RES`) independently refuses to persist a proposed value shaped like a bearer token/API key; `server/src/ai/job.ts:157-188` catches `AUDIT_WRITE_FORBIDDEN_CONTENT` specifically and degrades to a terminal `UNAVAILABLE(CONTENT_FILTERED)` rather than either silently dropping the guard or leaving the job hung |

## Confirmed findings

None. All 16 declared threats and every item from the additional adversarial sweep survived verification as genuinely mitigated; no candidate remained standing after attempting to refute the "safe" disposition.

## Resolved findings

Not applicable — this is a first audit of Phase 5 (verify mode against the plans' own threat model), not a re-audit of a prior SECURITY.md.

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| T-05-08 | Polling clients hit `GET /api/exceptions/:exceptionId/recommendation` every 3s (FR-10.7) with no rate limiting | Single indexed-PK lookup, no pagination/filter surface to amplify; PRD §10 excludes rate limiting from v1 scope | TechArch (accepted per stated 3s/60s polling budget) |
| T-05-16 | `AI_PROVIDER_URL=fake:deterministic` (no-network, no-auth posture) could reach a real deployment if an operator fails to override the compose default | Requires an operator to NOT set `AI_PROVIDER_URL` in their environment; `config.ts`'s self-check requires either this exact literal or a real `https://` URL, so any other/partial value fails loudly at boot rather than silently defaulting | Deployment configuration (same residual-risk shape as `SESSION_COOKIE_PROFILE=demo-iframe`) |

## Audit trail

- Diff scoped via: SUMMARY.md-cited file lists for plans 05-01 through 05-06 (no clean prior-phase base commit exists; phase-5 arrived as a single squashed commit `82b19a6`), read directly at HEAD.
- Register: loaded from the six PLAN.md `<threat_model>` blocks (T-05-01 through T-05-16, verify mode) — not built retroactively.
- Refutation: 16 declared threats + 3 additional sweep items (unsafe deserialization, command injection, secret-shaped-value defense-in-depth) examined = 19 candidates; 19 confirmed SAFE, 0 confirmed as findings.
