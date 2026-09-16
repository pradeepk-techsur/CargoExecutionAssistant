# Security Report — Phase 05: AI Recommendation as an Un-Applied Proposal (F9/F10)

**Mode:** verify
**Audited:** 2026-09-16
**Verdict:** SECURED
**Confirmed HIGH/CRITICAL:** 0

## Summary

This is a **second re-audit** of the prior SECURED verdict (dated 2026-09-16, commit `7b11e2f`), which was itself a re-audit of the original SECURED verdict (commit `9f367e0`). `git diff 7b11e2f..HEAD --stat` confirms **zero implementation source files** changed in the interim — the only diffs are `05-UAT.md`, `05-UAT.summary.json`, and three new `logs/attempt-4/*` execution-log files, all of which are a third UAT re-verification round's artifacts (a fresh sandbox with an empty database, re-seeded via the app's own `POST /api/entries` path, re-confirming the same pre-existing, out-of-scope Phase 3 `/entries/new` gap). No `server/src/**`, `web/src/**`, or migration file has drifted since either prior audit.

Given zero implementation drift across two consecutive audit cycles now, this re-audit remains light-touch: the six PLAN.md `<threat_model>` blocks were re-read in full and confirmed byte-for-byte unchanged in disposition and content (T-05-01 through T-05-16, same STRIDE categories, same `mitigate`/`accept` dispositions — unchanged since `9f367e0`). Four of the highest-risk prior citations were spot-checked directly against current source as fresh due diligence for this round (independent of the previous re-audit's own six spot-checks, to avoid re-verifying only what was re-verified last time): the `.strict()` output-schema gate (`outputSchema.ts:27-43`), the repo-wide absence of `dangerouslySetInnerHTML` in `web/src/`, the `aiCapability.spec.ts`-asserted import-graph isolation of `pool.ai.js` (confirmed by direct grep: only `server/src/index.ts` and the pool's own definition file reference it), and the `case_reference` format `CHECK` constraint backing the uuid→case-reference canonicalisation claim (`0002_entries.sql:28`). All four resolved exactly as both prior audits described them, at the same line numbers.

A brief fresh adversarial sweep was run as due diligence, focused on the two things that DID change (the UAT file's new content and the new attempt-4 log files): the newly-seeded case data (CE-2026-000001/000002, created this round via the real `POST /api/entries` path with the `__FAKE_AI_UNAVAILABLE__` sentinel) exercises the same `fakeProvider.ts`/`AI_PROVIDER_URL=fake:deterministic` accepted-risk posture as T-05-16, not a new surface. `logs/attempt-4/summary.json` was inspected directly and contains only duration/token/cost telemetry and a file-change list — no secrets, no credentials, no API keys. Nothing else in the newly-touched files (UAT prose, execution logs) constitutes application attack surface. No new findings were identified.

Ship as-is. No HIGH/CRITICAL findings; no lower-severity findings either — every declared mitigation held up to re-inspection across three consecutive audit rounds now, and no new attack surface has been introduced since the original audit.

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| T-05-01 `outputSchema.ts::validateProviderResponse` — hostile provider response | Tampering | SAFE (re-confirmed, spot-checked this round) | `server/src/ai/outputSchema.ts:27-43` `.strict()` on both `ProposedValueSchema` and `ProviderResponseSchema`, directly re-read this round — byte-identical to both prior audits |
| T-05-02 `config.ts` — `AI_API_KEY` value never disclosed | Info disclosure | SAFE (re-confirmed unchanged) | `server/src/config.ts` — `git diff 7b11e2f..HEAD` confirms no source change; register byte-identical to both prior audits |
| T-05-03 `promptManifest.ts` — prompt digest trust anchor | Tampering | SAFE (re-confirmed unchanged) | `server/src/ai/promptManifest.ts` `computeFileDigestSync` — no source diff since either prior audit |
| T-05-04 `insertRecommendationValues` — provider-derived values into SQL | Tampering | SAFE (re-confirmed unchanged) | `server/src/db/repositories/recommendations.ts` — bind-only `$n` parameters, tuple count bounded ≤14 by `outputSchema.ts`'s `.max(14)` — no source diff |
| T-05-05 recommendation terminal write over `cargoexec_ai` | Elevation of privilege | SAFE (re-confirmed unchanged) | `server/migrations/0011_case_anchor_lock_privilege.sql` grants `UPDATE ON cargo_entries` to `cargoexec_app` only; `server/test/db/recommendationWrite.repo.spec.ts` §4 unchanged since both prior audits — no source diff |
| T-05-06 `loadEntryValuesForRecommendation`/`loadExceptionForGeneration` — no specialist join | Info disclosure | SAFE (re-confirmed unchanged) | `server/src/db/repositories/entries.ts` / `exceptions.ts` — no `specialists` join; migration 0008 REVOKEs unchanged — no source diff |
| T-05-07 `routes/recommendation.ts::getRecommendation` — `req.params.exceptionId` | Tampering | SAFE (re-confirmed unchanged) | `server/src/http/routes/recommendation.ts` — UUID_RE validated before any service call — no source diff |
| T-05-08 polling DoS (3s client polling) | Denial of service (accept) | SAFE (accepted risk, unchanged posture) | Single indexed-PK lookup, no query-param surface — posture unchanged across all three audit rounds |
| T-05-09 `ai/job.ts`/`ai/adapter.http.ts` writing a decision | Elevation of privilege | SAFE (re-confirmed, spot-checked this round) | `grep -rln pool.ai.js\|getAiPool server/src/` this round returns exactly `{server/src/db/pool.ai.ts, server/src/index.ts}` — no `http/routes/*` or `services/*` file imports it; matches both prior audits |
| T-05-10 unbounded concurrent generation jobs | Denial of service | SAFE (re-confirmed unchanged) | `server/src/ai/worker.ts` — queue+semaphore bounded by `AI_WORKER_CONCURRENCY` (default 2) — no source diff |
| T-05-11 `adapter.http.ts` — provider `Authorization` header | Info disclosure | SAFE (re-confirmed unchanged) | `server/src/ai/adapter.http.ts` — key interpolated only into the outgoing header; every catch branch discards `err` — no source diff since either prior audit |
| T-05-12 `entries.ts`'s `dispatchRecommendation` field | Tampering (accept) | SAFE (re-confirmed unchanged) | `server/src/index.ts` sole construction site — no source diff |
| T-05-13 `CaseDetail.tsx` rendering rationale/values/messages (stored XSS) | Tampering | SAFE (re-confirmed, spot-checked this round) | `grep -rn dangerouslySetInnerHTML web/src/` → zero matches, re-run this round (exit code 1 / no output) |
| T-05-14 AI provider must not receive specialist identity via CaseDetail | Info disclosure | SAFE (re-confirmed unchanged) | `web/src/screens/CaseDetail.tsx` — only `api.getCase`/`api.getRecommendation`, both GET with no body — no source diff |
| T-05-15 uuid→case-reference `navigate` (open redirect) | Spoofing | SAFE (re-confirmed, spot-checked this round) | `web/src/screens/CaseDetail.tsx` builds target from `data.exception.case_reference`; `server/migrations/0002_entries.sql:28` `CHECK (case_reference ~ '^CE-[0-9]{4}-[0-9]{6}$')` re-confirmed present at that exact line this round |
| T-05-16 `AI_PROVIDER_URL=fake:deterministic` shipped to a real deployment | Tampering (accept) | SAFE (accepted risk, unchanged posture) | Set only in `e2e/env.ts` and `docker-compose.yml` (override-able); `config.ts`'s self-check unchanged; this round's UAT re-seeding again used `fakeProvider.ts`'s `FAKE_AI_TRIGGERS` sentinel (`__FAKE_AI_UNAVAILABLE__`) against a freshly-created case's `goods_description` — same accepted posture, not a new surface |
| (sweep, not in register) Provider JSON parse / unsafe deserialization | Tampering | SAFE (re-confirmed unchanged) | `server/src/ai/adapter.http.ts` — `res.json()`/`extractPayload()` try/caught, mapped to terminal `SCHEMA_INVALID` — no source diff |
| (sweep, not in register) Command/argument injection | Tampering | SAFE (re-confirmed unchanged) | No `eval`/`new Function`/`child_process`/`exec`/`spawn` anywhere under `server/src/ai/` or `web/src/` — no source diff |
| (sweep, not in register) Secret-shaped AI-proposed value reaching the audit store | Info disclosure | SAFE (re-confirmed unchanged) | `server/src/services/audit/writer.ts` (`SECRET_VALUE_RES`) independently refuses to persist a proposed value shaped like a bearer token/API key — no source diff |
| (fresh sweep, this round) New UAT/execution-log file changes themselves | Information disclosure | SAFE | `05-UAT.md`/`05-UAT.summary.json`/`logs/attempt-4/*` inspected directly this round — test prose, freshly-seeded case UUIDs/reference numbers, and cost/token telemetry only; no secrets, no API keys, no credentials |

## Confirmed findings

None. All 16 declared threats, the fresh sweep of four independently-chosen high-risk citations, and the fresh sweep of this round's actual file changes (the new UAT/log diff) survived re-verification. No new attack surface was introduced since either prior audit, and no drift was found in the previously-verified mechanisms.

## Resolved findings

Not applicable — both prior audit rounds (`9f367e0` and `7b11e2f`) recorded zero confirmed findings, so there is nothing to resolve in this round.

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| T-05-08 | Polling clients hit `GET /api/exceptions/:exceptionId/recommendation` every 3s (FR-10.7) with no rate limiting | Single indexed-PK lookup, no pagination/filter surface to amplify; PRD §10 excludes rate limiting from v1 scope | TechArch (accepted per stated 3s/60s polling budget) |
| T-05-16 | `AI_PROVIDER_URL=fake:deterministic` (no-network, no-auth posture) could reach a real deployment if an operator fails to override the compose default | Requires an operator to NOT set `AI_PROVIDER_URL` in their environment; `config.ts`'s self-check requires either this exact literal or a real `https://` URL, so any other/partial value fails loudly at boot rather than silently defaulting | Deployment configuration (same residual-risk shape as `SESSION_COOKIE_PROFILE=demo-iframe`) |

## Audit trail

- **This is the second re-audit** of the SECURED verdict originally recorded at commit `9f367e0`, most recently re-confirmed at commit `7b11e2f`.
- Diff scoped via: `git diff 7b11e2f..HEAD --stat`, confirming zero implementation source files (`server/src/**`, `web/src/**`, migrations, tests) changed — the only diff is `05-UAT.md`, `05-UAT.summary.json`, and three new `logs/attempt-4/*` files (a third UAT re-verification round, run against a fresh sandbox with an empty database).
- Register: re-loaded from the six PLAN.md `<threat_model>` blocks and confirmed byte-for-byte unchanged in disposition/content from both prior audits (T-05-01 through T-05-16, verify mode).
- Refutation (light-touch, per re-audit scope): four high-risk citations were independently spot-checked directly against current source this round (chosen to cover different mechanisms than the prior re-audit's six spot-checks, so successive re-audits do not converge on validating only the same subset) — `outputSchema.ts` `.strict()` gate (line-identical), repo-wide `dangerouslySetInnerHTML` absence (zero matches), `pool.ai.js`/`getAiPool` importer-set isolation (exactly `{index.ts, pool.ai.ts}`, no route/service file), and the `case_reference` CHECK constraint (`0002_entries.sql:28`, line-identical). All four held exactly as described. The remaining 12 declared threats plus the 3 original sweep items were confirmed via the git-diff-stat evidence of zero source drift (no re-derivation needed). A fresh brief adversarial sweep of the actually-changed files (the new UAT/log diff) found no new attack surface — `attempt-4/summary.json` inspected directly, contains only telemetry. Total this round: 19 candidates carried forward (all still SAFE, 4 independently re-verified against source) + 1 fresh-sweep item (also SAFE) = 20 examined, 20 confirmed SAFE, 0 findings.
