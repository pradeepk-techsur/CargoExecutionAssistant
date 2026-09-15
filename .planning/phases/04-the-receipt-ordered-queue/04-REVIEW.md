---
phase: 4
status: issues_found
blockers: 0
warnings: 2
files_reviewed: 12
files_reviewed_list:
  - contract/src/dto.ts
  - server/src/db/repositories/decisions.ts
  - server/src/db/repositories/exceptions.ts
  - server/src/db/repositories/recommendations.ts
  - server/src/db/repositories/validation.ts
  - server/src/http/routes/exceptions.ts
  - server/src/http/routes/index.ts
  - server/src/services/caseRead.service.ts
  - server/src/services/queue.service.ts
  - web/src/api/client.ts
  - web/src/app/router.tsx
  - web/src/lib/formatDateTime.ts
  - web/src/screens/Queue.tsx
reviewed_at: 2026-09-15T20:30:03Z
iteration: 1
---

# Phase 4 Code Review

Scope: the F7 read model / composition services / HTTP surface and the F8 web
queue screen. Test files (`*.spec.ts`), the a11y doc, and the arch-spec
narrowing were read as evidence but are not source under review; the arch-spec
narrowing in `receiptPaths.spec.ts` was checked and does NOT weaken a real guard
(it still forbids any mutating method against an exception collection and adds a
per-call proximity check on `api/client.ts`).

Cross-file seams were traced end to end (routes ↔ services ↔ repositories ↔
contract; client ↔ routes; screen ↔ client ↔ DTOs). Auth was verified live:
`requireApiAuth()` is mounted globally before `registerRoutes`, exempts only
`POST /api/session`, and `boot.spec.ts` proves an anonymous `GET /api/exceptions`
returns 401 — no read endpoint is exposed unauthenticated. No BLOCKER survived
refutation.

## BLOCKERs

None.

## WARNINGs

### W1: `deriveFailureSummary` produces a malformed string if the findings list is ever shorter than the authoritative count
- **File:** server/src/services/queue.service.ts:67-71
- **Category:** bug (defensive-path only)
- **Evidence:** The summary is built from `findings.slice(0,2)` (the message
  text) while the "and N more" suffix uses the separate authoritative `count`
  (`validation_results.findings_count`). If `findingsByVr.get(id)` ever returned
  fewer than 2 entries while `count > 2` — e.g. an empty bucket via the `?? []`
  fallback at line 43 — the output degrades to a leading-space / dangling string
  such as `" and 3 more"` or (with one message) `"msg and 3 more"` with the
  suffix over-counting the shown messages. For real data this is unreachable:
  every OPEN exception is derived from a FAIL validation whose `findings_count`
  equals the number of rows inserted into `validation_findings` (they are written
  together, coupled by the receipt transaction), so the map lookup always returns
  exactly `count` findings. Flagged as a WARNING, not a BLOCKER, because it
  cannot fire against the governed schema — but the derivation trusts an
  invariant it does not assert. Stated with that uncertainty.
- **Fix direction:** Derive the "N more" count from `count - head.length` (what
  was actually shown) rather than a bare `count - 2`, and guard the leading
  separator so an empty `head` cannot emit a leading space. This makes the output
  well-formed regardless of how many messages the bucket carried.

### W2: `getSession()` (bootstrap) rotates the CSRF token that a just-signed-in e2e/API caller still holds — latent for phase-5 fixture creation, not this phase
- **File:** web/src/api/client.ts:191-198 (behaviour), e2e/queue.spec.ts:24-29 (the compensating comment)
- **Evidence:** `getSession()` calls `setCsrfToken(dto.csrf_token)` on every load,
  and the server rotates `csrf_token_hash` on each GET (02-04). The queue screen
  fires `GET /api/exceptions` on mount but never a mutating request, so within
  Phase 4 this is harmless. The e2e proof works only because it creates its
  fixture via `POST /api/entries` BEFORE any page navigation (queue.spec.ts:69-78,
  comment lines 24-29). Any future case-detail screen that both (a) loads via
  `getSession()` and (b) issues a POST using a token captured from a prior
  sign-in response will 403 unless it re-reads the rotated token. This is a
  pre-existing client contract carried forward, not introduced here; noted so the
  phase-5 reviewer does not rediscover it as a surprise. No change required in
  Phase 4.
- **Fix direction:** None for this phase. Phase 5 mutating flows must source the
  CSRF token from the in-client module variable (which `getSession` keeps
  current) rather than caching a sign-in-time token.

## Cross-file seams checked
- routes/exceptions.ts ↔ routes/index.ts: `exceptionRoutes(deps) -> {get,getOne}` wired into `buildRoutes` as `exceptions.get`/`exceptions.getOne`; ROUTES length 7 — OK.
- routes/exceptions.ts ↔ error codes: `UNSUPPORTED_QUERY_PARAMETER`, `INVALID_IDENTIFIER`, `EXCEPTION_NOT_FOUND`, `UNAUTHENTICATED` all present in contract/errors.ts; `EXCEPTION_NOT_FOUND` intentionally has no `ERROR_MESSAGES` default and both 404 messages are passed explicitly — OK.
- routes/exceptions.ts ↔ queue.service/caseRead.service: `listQueue(pool)` and `loadCase(pool, form, value)` signatures + three-outcome return match the route's mapping — OK.
- caseRead.service.ts ↔ repositories: `loadEntryDetail`(Date received_at → `.toISOString()`), `loadFieldOrigins`(EntryFieldOrigins), `loadValidationByEntry`, recommendation/decision reads — all return shapes match the DTO composition — OK.
- queue.service.ts ↔ exceptions/validation repos: `listOpenExceptions` LIMIT 501 → `truncated = len>500`, `slice(0,500)`, `returned_count = exceptions.length`; 500/501 boundary correct — OK.
- caseRead permitted_decisions ↔ recommendation status: `recommendationRow?.status ?? 'PENDING'` consistent with `composeRecommendation`'s null→PENDING default — OK.
- client.ts ↔ routes: `getQueue()` GET /api/exceptions (no CSRF), `getCase(id)` GET /api/exceptions/:idOrReference (encoded) — read-only, matches GET-only route surface — OK.
- Queue.tsx ↔ QueueResponse/RowSummaryDto: renders case_reference, received_at, entry_number, failure_summary; announces `returned_count` which equals `exceptions.length` by construction — OK.
- Queue.tsx ↔ router.tsx: row `<Link to={/cases/:case_reference}>` resolves to the `/cases/:caseReference` NotBuiltYet route (Phase 5 destination) — OK.
- Queue.tsx ↔ states.tsx: `Loading(region)`, `ErrorState(cause,onRetry)`, `Empty(message,action)` prop shapes match component definitions — OK.
- Auth gate ↔ read routes: `requireApiAuth()` global, exempts only POST /api/session; anonymous GET /api/exceptions → 401 (boot.spec proves) — OK, no read exposure.
- receiptPaths.spec.ts test 9 narrowing: still forbids mutating methods on an exception collection + adds per-call GET-only proximity check on client.ts — OK, guard intact.
