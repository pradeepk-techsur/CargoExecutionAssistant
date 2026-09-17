## 1A. Component Architecture

### 1A.1 Repository layout

One repository, one deployment unit, three TypeScript projects sharing a contract package. Paths below are normative: an architecture test asserts the top-level shape and the absence of the forbidden directories.

```
cargoexec/
├── package.json                 workspaces: server, web, contract
├── tsconfig.base.json           strict: true, noUncheckedIndexedAccess: true
├── docker-compose.yml           web + db, demonstration topology
├── Dockerfile                   multi-stage: build web + server, run node 22
├── .env.example                 every key, no value that is a secret
├── contract/                    shared DTOs + error codes (no runtime deps)
│   ├── src/dto.ts               every type in §3b
│   ├── src/errors.ts            the Y2 error-code union
│   └── src/fields.ts            the 14-field entry field set (single source)
├── server/
│   ├── src/index.ts             process bootstrap: config → selfChecks → listen
│   ├── src/http/
│   │   ├── app.ts               express app assembly, ordered middleware
│   │   ├── headers.ts           helmet config, CSP, frame-ancestors  (§4.5)
│   │   ├── requestId.ts         X-Request-Id in/out, logger binding
│   │   ├── session.middleware.ts principal resolution, idle/absolute expiry
│   │   ├── csrf.middleware.ts   double-submit, constant-time compare
│   │   ├── htmlRouteGuard.ts    302 → /sign-in?next= for HTML doc requests
│   │   ├── errorMapper.ts       domain/DB error → Y2 code + HTTP status
│   │   └── routes/              session · entries · exceptions  (10 routes)
│   ├── src/services/
│   │   ├── session.service.ts   sign-in/out, Argon2id, throttle
│   │   ├── receipt.service.ts   THE receipt transaction (§1.5)
│   │   ├── validation/          rule registry, predicates, domain constants
│   │   ├── queue.service.ts     receipt-ordered projection
│   │   ├── caseRead.service.ts  case detail assembly
│   │   ├── decision.service.ts  THE ONLY writer of exceptions.state (§1.6)
│   │   ├── auditRead.service.ts read-only trail + chain verification
│   │   └── audit/writer.ts      append(tx, entry) — the only audit writer
│   ├── src/ai/
│   │   ├── provider.ts          RecommendationProvider interface + types
│   │   ├── adapter.http.ts      the ONLY module that speaks to the provider
│   │   ├── prompt/              versioned templates + integrity manifest
│   │   └── worker.ts            bounded-concurrency dispatcher (pool: ai)
│   ├── src/db/
│   │   ├── pool.app.ts          pg Pool as cargoexec_app
│   │   ├── pool.ai.ts           pg Pool as cargoexec_ai          (A-1)
│   │   ├── tx.ts               withTransaction(pool, fn) — the only BEGIN
│   │   ├── canonical.ts         canonical JSON serialisation + SHA-256
│   │   └── repositories/        one module per table group, SQL only
│   ├── migrations/              0001_…sql … forward-only, owner role
│   ├── cli/create-specialist.ts operational provisioning
│   ├── cli/seed-demo-case.ts    Phase 7 — idempotent demo-case seed (§1A.1a, 08 §8.9)
│   └── test/                    unit · db-invariant · api · architecture
├── web/
│   ├── vite.config.ts           host 0.0.0.0, port 3000, allowedHosts (§6.5)
│   ├── src/main.tsx             mount, router, session bootstrap
│   ├── src/shell/               Shell, Banner, Header, Nav, LiveRegions
│   ├── src/components/          UswdsForm, ErrorSummary, ProvenanceBadge,
│   │                            Loading, Empty, ErrorState, Degraded,
│   │                            ReadOnlyNotice, AttributedValue
│   ├── src/screens/             SignIn · Queue · NewEntry · CaseDetail
│   │                            (Decision + AuditTrail regions) · NotFound
│   ├── src/api/client.ts        typed fetch, CSRF header, 401 handling
│   └── styles/uswds.scss        USWDS settings + compiled tokens
└── docs/
    ├── uswds-conformance-register.md   every control → USWDS component (§7.3)
    └── a11y/{screen}.md                signed per-screen review records (§7.7)

 ABSENT BY DESIGN (asserted by test):
   .github/            no CI workflow files at all
   seeds/ fixtures/    no demonstration-data DIRECTORY, ever (unchanged, see §1A.1a)
   adapters/ingest/    no file or API ingestion
   export/ reports/    no export surface
   rbac/ roles/        one role, no permission model
```

### 1A.1a Phase 7 addition — demonstration-case seed script (F15)

Phase 7 adds exactly one new operational CLI script, `server/src/cli/seed-demo-case.ts`, placed alongside `cli/create-specialist.ts` because it is provisioned the same way: an operator-invoked command against a deployed environment, never an HTTP route, never a UI control, never scheduled (PRD §10 #7, superseded; F15). It is **not** the `seeds/`/`fixtures/` directory the architecture tests forbid — that prohibition is a directory-shape ban (§1A.1's `ABSENT BY DESIGN` list) and is **retained unchanged**; a single named CLI file is a different shape from a fixture-loading directory and the two tests below make that distinction explicit rather than incidental:

- `server/test/architecture/absence.spec.ts` (`FORBIDDEN_DIRS` check, TEST-ARCH-09) — still forbids any `seeds/` or `fixtures/` **directory** anywhere in the repo, unmodified in its general form. It is updated only to the extent of confirming `server/src/cli/seed-demo-case.ts` is a file, not a directory, and therefore does not trip the check — no relaxation of the directory ban itself.
- `server/test/architecture/validation.spec.ts` ("no seeds/ or fixtures/ directory anywhere in the repository", TEST-ARCH-11's neighbour) — same treatment: the repo-wide directory walk is untouched; it is joined by a new, narrowly-scoped assertion that the *only* file whose name contains `seed` is this one named script, so a future contributor cannot quietly add a second seed/fixture mechanism under a different name without the test noticing.

Both tests' general-purpose prohibitions on a seeds/fixtures **directory** and on migration-file `INSERT INTO` (`TEST-ARCH-11`) remain exactly as strict as before. What is added is a single, named, reviewed exception for `cli/seed-demo-case.ts` — not a hole for future scripts. Full behavioural detail, idempotency contract, and the exact test updates are in `08-testing-deployment.md` §8.9.

### 1A.1b Phase 7 — visual redesign: Carbon Design System (F2)

Phase 7 replaces USWDS as the shell's visual system. The replacement is now **decided**: the **Carbon Design System** (carbondesignsystem.com), IBM's open-source design system, consumed via the `@carbon/react` npm package (PRD §4.1, §5.1 F2; FRD F2's Phase 7 note). This document does not invent Carbon's screen-by-screen component mapping or its exact Sass import surface — that is Phase 7 planning/execution work once the planner reads the installed `@carbon/react`/`@carbon/styles` API — but the design system itself is no longer an open question, and three things follow from having a named, concrete target:

1. **The current build pipeline is the baseline, and Carbon is compatible with it.** `web/styles/app.scss` remains the single Sass entry point; its ROLE is unchanged, only its CONTENT changes — from `@use "uswds-core"` / `@forward "uswds"` to Carbon's equivalent Sass entry points, the exact import surface to be worked out by the Phase 7 planner against the installed `@carbon/react`/`@carbon/styles` version. This is compatible with the existing self-hosted, `<link>`-loaded, CSP-compliant build shape because Carbon compiles from Sass to static CSS — like USWDS does today — and is **not** runtime CSS-in-JS: it satisfies `style-src 'self'` with no `unsafe-inline` (§4.5) the same way, via a compiled stylesheet, not a JS-injected `<style>` tag. `web/scripts/copy-uswds-assets.mjs`'s self-hosting role also carries forward: IBM Plex (Carbon's default typeface, open-licensed and redistributable) and `@carbon/icons-react` (Carbon's SVG icon components) are both npm-installable and self-hostable exactly as Public Sans and the USWDS icon sprite are today — no CDN dependency is introduced (FR-2.3). One build-approach difference worth noting, not a blocker: `@carbon/icons-react` ships icons as SVG React components rather than a single icon-sprite file, so the icon-asset step of the copy script will need adjusting to the component-based approach rather than sprite-copying.
2. **`docs/uswds-conformance-register.md` needs a wholesale re-authoring, mapping every control to its Carbon component.** The register (§7.3) maps every interactive control to a specific USWDS primitive by name; it will be re-authored to map every control to its Carbon `@carbon/react` equivalent instead. There is now a concrete target to map to — Carbon's published component set — even though the re-authoring itself, screen by screen, is still Phase 7 planning/execution work, required before any screen can be re-signed-off under FR-2.26's per-screen checklist.
3. **Section 508 / WCAG 2.1 AA conformance does not move.** It is an architectural constraint independent of which design system delivers it (PRD NFR-1, NFR-2), and this remains exactly as strict after the swap — Carbon's own stated accessibility compliance target (WCAG AA, Section 508, and EN accessibility standards, per IBM's own Accessibility Checklist) matches this project's bar, so adopting Carbon does not itself relax the requirement, but it also does not fight it: choosing a library that already targets this project's compliance bar makes the per-screen re-verification more tractable than a library with no such target would. Adopting Carbon does not itself satisfy FR-2.26's per-screen review, however — every screen still needs re-verifying against the checklist once rebuilt on Carbon components. The testing/sign-off *process* — a signed per-screen record at `docs/a11y/{screen}.md` covering the checklist of `07-accessibility.md` §7.7, with **no CI accessibility gate, ever** (§7.8) — is unchanged by this phase. See `06-tech-stack.md` §6.2a and `07-accessibility.md` §7.1a for the same note stated against the tech-stack and accessibility chunks respectively.

### 1A.2 Layering and dependency rules

```
        contract  ◄──────────────── web           (types only, no runtime code)
            ▲
            │
   http ──► services ──► repositories ──► pg pools ──► PostgreSQL
            │                                            ▲
            └► ai/worker ──► ai/adapter ──► provider      │ enforcement:
                                                          │ privileges + triggers
```

| Rule | Statement | Verified by |
|---|---|---|
| **R-L1** | Dependencies point one way: `http → services → repositories → db`. A repository never imports a service; a service never imports `express`; `contract` imports nothing. | import-graph test (§8.4) |
| **R-L2** | `withTransaction` is the only place a `BEGIN` is issued. No service or repository opens its own transaction. | grep test for `BEGIN` |
| **R-L3** | `audit/writer.ts` is the only module referencing `audit_entries` / `audit_entry_values`. | table-reference test (F13 FR-13.1) |
| **R-L4** | `decision.service.ts` is the only module writing `exceptions.state`, `closed_at`, `decision_id`, `decisions`, or `decision_values`. | table/column write test (F11 FR-11.1, SM-4) |
| **R-L5** | `receipt.service.ts` is the only module writing `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, `exceptions` (insert). | write-path test |
| **R-L6** | `ai/worker.ts` and `ai/adapter.http.ts` must not import `decision.service`, `receipt.service`, or any repository that writes `decisions`/`decision_values`/`exceptions.state`. | import-graph test (F9 acceptance 6) |
| **R-L7** | No provider SDK type may appear outside `ai/adapter.http.ts`; the provider is reached only through `RecommendationProvider`. | import-graph test (FR-Y3.1) |
| **R-L8** | No ORM, query builder, or active-record library is a dependency. All SQL is hand-written and parameterised; no string interpolation of client input. | dependency allowlist test (§6.2), lint rule |
| **R-L9** | `web` imports types from `contract` and never duplicates a DTO shape locally. | type-duplication review + `contract` re-export test |
| **R-L10** | The validation rule modules have no access to a clock, the database, the network, or a random source — they are pure functions of `(CanonicalEntryRecord, receivedAt)`. | unit-test isolation, no imports permitted (F4 FR-4.4) |

### 1A.3 Backend components

#### HTTP layer

| Component | Responsibility | Notes / traces |
|---|---|---|
| `app.ts` | Assembles middleware in a fixed order: `requestId → headers → bodyLimit(64 KB) → cookieParser → staticAssets → session → csrf → routes → htmlRouteGuard → errorMapper`. The order is normative: CSRF runs after session because it compares against the session's stored token. | F3 FR-3.15, F1 FR-1.9 |
| `headers.ts` | `helmet` with `frameguard: false` and a hand-written CSP whose `frame-ancestors` is built from `FRAME_ANCESTORS`; emits `Strict-Transport-Security` (when TLS), `X-Content-Type-Options`, `Referrer-Policy: same-origin`, `Cache-Control: no-store` on `/api`. **Never** emits `X-Frame-Options` (D-1). | §4.5 |
| `requestId.ts` | Generates a `request_id` per request, echoes it in `X-Request-Id`, binds it to the pino child logger, and passes it to the audit writer so an audit entry correlates with server logs. | FR-Y1.4 |
| `session.middleware.ts` | Hashes the cookie token, loads the session, applies absolute (8 h) and idle (30 min) expiry, marks expired sessions `revoked_at`/`EXPIRED`, loads the specialist, rejects `is_active = false`, throttles `last_seen_at` writes to once per 60 s, attaches the **request principal**. | F1 process, FR-1.5 |
| `csrf.middleware.ts` | For `POST`/`DELETE`: constant-time comparison of `X-CSRF-Token` against the session's stored token hash; mismatch ⇒ `403 CSRF_INVALID`. `GET` is never CSRF-checked and never changes state. | F1 FR-1.9 |
| `htmlRouteGuard.ts` | For HTML document requests to a session route without a valid session: `302 /sign-in?next={validated path}`. `next` must match `^/[A-Za-z0-9/_\-]*$` or is discarded for `/queue`. API requests get `401 UNAUTHENTICATED` with no redirect. | F1 FR-1.7 |
| `routes/` | Exactly the ten method/path pairs of §3.1. Any other method on those paths ⇒ `405 METHOD_NOT_ALLOWED`. Route registration is data-driven from one array so the architecture test can pin it. | Y1 §0, C-4 |
| `errorMapper.ts` | Single translation point: domain errors and PostgreSQL `SQLSTATE`s → `{HTTP status, Y2 code, message, details[]}`. Internal codes (`AUDIT_IMMUTABLE`, `HITL_VIOLATION`, `AUDIT_COUPLING_VIOLATION`, `AUDIT_CHAIN_BROKEN`, …) are logged against the `request_id` and surface as the caller's generic `500`, never verbatim. | Y2 §7, FR-Y2.5 |

#### Service layer

| Component | Transaction | Responsibility | Traces |
|---|---|---|---|
| `session.service.ts` | short, non-audited | Argon2id verify (always, against a dummy hash on unknown email, for timing parity); session creation with 256-bit token (SHA-256 stored); CSRF token issue; sign-out revocation; in-process sliding-window throttle keyed by a hash of the normalised email, 5 failures / 15 min. Writes **no** audit entry — session events are not case events. | F1 FR-1.4, FR-1.10, FR-1.12 |
| `receipt.service.ts` | **one** — §1.5 | The atomic receipt: canonicalise → validate → insert entry once (with final `receipt_outcome`, D-3) → field origins → audit → validation result + findings → audit → exception + `PENDING` recommendation + audit → commit → post-commit dispatch. Owns case-reference allocation `CE-{YYYY}-{NNNNNN}`. | F3, F4, F5 |
| `validation/` | none (pure) | The `RIV-2026.09` rule registry — **rule *content* is an inherited `[ASSUMPTION]` (FRD F4), open to CBP refinement; the registry is built so a revision is a data change plus a `rule_set_version` bump, touching no other module**: 31 predicates keyed by `rule_id`, each with `primary_field` (C-2), `failure_code`, message template, and declared presence/format gating. Evaluates all applicable rules, never short-circuits, emits findings in ascending `rule_id`. Domain code lists (`PORT_OF_ENTRY`, `COUNTRY`, `UNIT_OF_MEASURE`, `GENERIC_DESCRIPTION`) are compiled-in frozen constants — not tables, not seeds, not editable config. A startup self-check validates registry integrity or refuses to boot (`RULE_SET_INVALID`). | F4 FR-4.1–4.15 |
| `queue.service.ts` | read-only | One query: open exceptions ordered by `receipt_position ASC`, served by the partial index. No parameters of any kind reach this service — no filter, sort, page, assignee, or state argument exists in its signature. | F7, §10 #4 |
| `caseRead.service.ts` | read-only | Assembles the case-detail projection: exception, entry values + field origins, validation result + findings, recommendation + proposed values, decision + resolution values, and `permitted_decisions` computed from state and recommendation status. | F7, F10 |
| `decision.service.ts` | **one** — §1.6 | The only writer of a resolution and of `exceptions.state`. Row-locks the exception, enforces permitted decisions by recommendation status, computes per-value origin server-side, inserts the decision and its values, closes the exception, writes exactly one audit entry, handles idempotency. | F11 |
| `auditRead.service.ts` | read-only | Single-case trail in ascending `case_sequence` with value rows and actor display names, plus `chain_verified`/`first_divergence_sequence` from `verify_audit_chain`. Strictly separate from the writer; no bulk, cross-case, download, or streaming operation exists. | F13 FR-13.15, FR-13.18 |
| `audit/writer.ts` | caller's | `append(tx, entry)` — the single chokepoint. Requires a transaction handle as its first argument and cannot open one. Validates action/actor pairing, required reason, field-name denylist and secret-shaped values, assigns `case_sequence` under the caller's anchor lock, computes the hash chain, inserts the entry and its value rows, returns the new `audit_entry_id`. Exposes nothing else. | F13 |

#### AI components

| Component | Responsibility | Traces |
|---|---|---|
| `ai/provider.ts` | `interface RecommendationProvider { generate(req: RecommendationRequest): Promise<RecommendationDraft> }` plus the request/draft types and the `ProviderFailure` union. Provider-agnostic; no SDK types. | FR-9.15, FR-Y3.1 |
| `ai/adapter.http.ts` | The only module performing the outbound HTTPS call. Builds the prompt from the versioned template, sets the 20 s per-attempt timeout, performs at most one retry (timeout/429/5xx/connection) within a 45 s budget, parses and schema-validates the response, maps every failure onto one of the seven enumerated `failure_reason` values, and redacts credentials from anything it logs. | F9 steps 4–8, FR-9.13 |
| `ai/prompt/` | Immutable versioned templates (`p-2026.09.1.md`) plus `manifest.json` mapping `prompt_version → sha256`. A startup self-check recomputes the digests; a mismatch refuses to boot (A-1/A-2). | §5.4 |
| `ai/worker.ts` | In-process dispatcher with bounded concurrency (default 2). Accepts post-commit dispatches only. Per job: row-lock the recommendation, act only while `PENDING`, call the provider, then write the terminal status + values + exactly one audit entry in **one** transaction on the `cargoexec_ai` pool. No scheduler, no sweeper, no retry after a terminal status, no queue. | F9 FR-9.6, FR-9.14, FR-9.17, FR-Y3.11 |

#### Data components

| Component | Responsibility |
|---|---|
| `db/pool.app.ts` | `pg.Pool` connected as `cargoexec_app`. Used by every request-path service. |
| `db/pool.ai.ts` | `pg.Pool` connected as `cargoexec_ai` (**A-1**). Used only by `ai/worker.ts`. Two distinct credentials in configuration; a test asserts the worker imports only this pool. |
| `db/tx.ts` | `withTransaction(pool, fn)`: `BEGIN` → `fn(tx)` → `COMMIT`, `ROLLBACK` on any throw. The only place transaction control statements appear. Sets `SET LOCAL statement_timeout = 10s` for request-path transactions. |
| `db/canonical.ts` | Canonical JSON serialisation (lexicographic keys, no insignificant whitespace, RFC 3339 UTC microseconds, `null` for `NULL`, unquoted fixed-scale decimals) and the SHA-256 helpers used for `entry_hash`. Shared by the writer and the verifier so both compute identically. |
| `db/repositories/` | One module per table group (`specialists`, `sessions`, `entries`, `validation`, `exceptions`, `recommendations`, `decisions`, `audit`). Hand-written parameterised SQL. No repository exposes an `update` or `delete` function for an immutable table — the absence is the point. |

### 1A.4 Frontend components

The SPA is a thin, accessible rendering of the API. It holds no governance logic: it cannot compute an origin, cannot decide a case locally, and treats every server response as authoritative.

#### Shell (F2)

| Component | Responsibility |
|---|---|
| `Shell` | Renders the persistent frame once — USWDS government banner, `<header role="banner">`, `<nav aria-label="Primary">` with exactly two destinations, `<main id="main-content">`, `<footer role="contentinfo">` — plus the routing outlet. On every completed navigation: set `document.title` to `{Screen} — CargoExec`, announce it politely, move focus to the screen's `<h1>` (`tabindex="-1"`). |
| `SkipLink` | First focusable element on every page; moves focus into `main`. |
| `LiveRegions` | One `aria-live="polite"` status region and one `aria-live="assertive"` alert region, both present from initial load. Exposes `announceStatus(text)` / `announceError(text)`. |
| `UswdsForm` + `ErrorSummary` + `Field` | The inherited form pattern: label/`for` association, hint via `aria-describedby`, USWDS required marking, busy submit state with repeat-submission blocking, server-authoritative errors rendered as a focus-receiving `role="alert"` summary in server order, each item linking to its control, plus inline error text with `aria-invalid="true"`. |
| `ProvenanceBadge` | The single component that renders provenance: text label ("AI-suggested" / "Specialist-entered") + icon (`aria-hidden`) + token colour. Never colour alone. Visually-hidden text where the visual treatment is compact. Used unchanged by F10, F12, F14. |
| `AttributedValue` | The only component permitted to render a case value. Its props require `Attributed<T>` (§3b.6), so a value without an origin cannot be rendered — provenance is enforced by the type system, not by reviewer vigilance. |
| `Loading` `Empty` `ErrorState` `Degraded` `ReadOnlyNotice` | Shared state components with consistent semantics, so no screen re-implements them divergently. |

#### Screens

| Screen | Route | Owner | Responsibilities |
|---|---|---|---|
| `SignIn` | `/sign-in` | F1 + F2 | Reduced shell (no nav, no sign-out). Email + password, `autocomplete` hints, both programmatically required. Generic failure message with focus moved to the error summary; password cleared, email retained; no field-level "which one was wrong". Throttle message for `429`. Busy state with double-submit prevention. No remember-me, no SSO button, no registration or reset link. |
| `Queue` | `/queue` | F8 | Receipt-ordered table of open exceptions: case reference, receipt time, entry number, finding count, failure summary. Accessible table semantics with a programmatic row count. Row activation navigates to the case, keyboard and pointer. `Empty` state with a route to `/entries/new`. **No** filter control, sort header, assignment action, or priority badge exists in the DOM. |
| `NewEntry` | `/entries/new` | F6 | The 14-field USWDS form. Client hints never block a submission the server has not judged. On `201`, the receipt outcome is stated explicitly — `VALIDATED_CLEAN`, or `EXCEPTION_OPENED` with the case reference and a link to the case and to the queue. Server findings render field-by-field with a focus-moving error summary. |
| `CaseDetail` | `/cases/{caseReference}` | F10 | Reading order: header (reference, receipt time, state) → submitted entry values → validation findings → recommendation → decision → audit. The recommendation is presented as an un-applied proposal with `ProvenanceBadge` on every proposed value. While `PENDING`, polls the recommendation endpoint every 3 s for at most 60 s without blocking navigation, disabling the decision controls, or stealing focus; announces the terminal outcome politely. `UNAVAILABLE`/stale-`PENDING` renders `Degraded` with plain-language cause and the decision path unaffected. Closed cases render read-only with the recorded decision. |
| `DecisionPanel` | within `/cases/{ref}` | F12 | Approve / Edit / Reject as three equally available actions with **no pre-selected default**. Edit opens the proposed values in an editable USWDS form with changed fields visibly marked as specialist-modified and a required reason (≥ 10 characters, server-authoritative). Reject requires a reason. Pre-submission summary of what will be recorded; post-decision confirmation of what *was* recorded, rendered from the server's response. Controls absent on closed cases. |
| `AuditTrailRegion` | within `/cases/{ref}`, deep-link `/cases/{ref}/audit` | F14 | Chronological, read-only list: sequence, actor, action, timestamp, before/after values with per-value provenance badges, reason where captured. Surfaces `chain_verified`; on failure renders a USWDS error alert naming the divergent sequence and offers **no repair action**. No edit, correct, delete, print, or download affordance anywhere. |
| `NotFound` | `*` | F2 | "Page not found" inside the shell with a link to the queue; announced politely, focus to `h1`. |

#### Client API layer

`api/client.ts` is a typed `fetch` wrapper: attaches `X-CSRF-Token` from the session bootstrap to every `POST`/`DELETE`, sets `Accept: application/json`, parses the `contract` DTOs, and on `401 UNAUTHENTICATED` discards in-memory state and navigates to `/sign-in?next={current path}` with the announced message "Your session expired. Sign in again to continue." In-progress form input is never silently resubmitted after re-authentication. It has no retry logic for mutating requests: an unknown submit outcome advises the specialist to reload the case rather than risking a second decision.

### 1A.5 Component-to-feature matrix

| Feature | Backend | Frontend |
|---|---|---|
| F0 data model & audit store | `migrations/`, `db/`, `repositories/` | — |
| F1 authentication | `session.service`, `session.middleware`, `csrf.middleware`, `htmlRouteGuard`, `cli/create-specialist` | `SignIn`, `api/client` 401 handling |
| F2 USWDS shell & a11y | static asset pipeline | `Shell`, `SkipLink`, `LiveRegions`, `UswdsForm`, `ErrorSummary`, `ProvenanceBadge`, `AttributedValue`, state components |
| F3 entry creation | `receipt.service`, `routes/entries` | — |
| F4 validation | `services/validation/` | — |
| F5 exception creation | `receipt.service` (exception + `PENDING` recommendation) | — |
| F6 entry UI | — | `NewEntry` |
| F7 queue & case read | `queue.service`, `caseRead.service`, `routes/exceptions` | — |
| F8 queue UI | — | `Queue` |
| F9 AI recommendation | `ai/provider`, `ai/adapter.http`, `ai/prompt`, `ai/worker`, `pool.ai` | — |
| F10 case detail UI | — | `CaseDetail` |
| F11 decision API | `decision.service` | — |
| F12 decision UI | — | `DecisionPanel` |
| F13 audit writer | `audit/writer`, `auditRead.service`, `db/canonical` | — |
| F14 audit trail UI | — | `AuditTrailRegion` |

---
