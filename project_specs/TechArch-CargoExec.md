# Technical Architecture Document (TechArch)
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.0 |
| **Date** | 2026-09-11 |
| **Author** | Pivota Spec Framework — TechArch Generator |
| **Upstream Documents** | `.planning/PROJECT.md`, `project_specs/PRD-CargoExec.md`, `project_specs/FRD-CargoExec.md` |
| **Authoritative inputs reconciled** | FRD `Y0-schema` (DDL), `Y1-api` (endpoints + UI routes), `Y2-errors` (error catalogue), `00-header` (state machines), `Y3-integrations` (external contracts) |
| **Downstream Documents** | UserStories-CargoExec, implementation |
| **Chunk sources** | `project_specs/TechArch/` |

---

## 0. How To Read This Document

### 0.1 What this document is

This is the build blueprint for CargoExec v1: the architecture pattern, the module boundaries, the complete PostgreSQL DDL, the API contract expressed as TypeScript types, the security and accessibility architecture, the AI integration design, the testing strategy, and the runtime topology. It is written to be implemented without further design decisions.

### 0.2 Relationship to the FRD

The FRD is authoritative on *behaviour*. This document is authoritative on *construction*. Where the FRD already fixed a construction detail — the thirteen tables of `Y0-schema`, the ten endpoints of `Y1-api`, the eight audit actions of `00-header §0.6`, the error codes of `Y2-errors` — this document **carries it forward unchanged** rather than inventing a competing design. Specifically:

- **Schema**: the thirteen tables, their constraints, the privilege revocations, and the four trigger families of `Y0-schema` are reproduced in §2 with no table added, no table removed, and no column added.
- **API**: exactly the ten endpoints of `Y1-api` exist, with zero query parameters across the whole API. §3 adds TypeScript types for them; it adds no endpoint.
- **State machines**: the three state machines and the eight audit actions of `00-header §0.6` are the only transitions the code may implement.
- **Errors**: every error surface maps to a `Y2-errors` code. §3.7 is a mapping table, not a new catalogue.

Every place where this document *does* depart from the FRD is listed in §0.4 with its reason. There are three deviations, two additions, and four clarifications, and nothing else.

### 0.3 Non-negotiable design premises

1. **The database is the last line of enforcement, not the first.** Application code is expected to be correct; the schema is designed on the assumption that it will not be. Every governance guarantee has a database-level backstop that fails a bad transaction at `COMMIT`.
2. **A recommendation and a resolution are different records in different tables written by different code paths with different privileges.** This is the whole no-auto-apply argument, and it is physical.
3. **Provenance is a type, not a convention.** `origin` is `NOT NULL` in the schema, non-optional in the API types, and required by the props of the only component permitted to render a value. There is no representation of an unattributed value at any layer.
4. **Scope is enforced by absence.** No column, endpoint, route, table, adapter, worker capability, feature flag, or config key exists for anything in PRD §10. Architecture tests assert the absences (§8.4).

### 0.4 Deviation, addition, and clarification register

**Deviations from the FRD** — each is a deliberate departure, with its reason stated:

| ID | FRD requirement | Departure | Reason |
|---|---|---|---|
| **D-1** | `Y3-integrations` FR-Y3.9 requires `X-Frame-Options: DENY` | **No `X-Frame-Options` header is ever sent.** Frame policy is expressed only through CSP `frame-ancestors`, scoped to the preview origin (§4.5) | The application is demonstrated inside a sandbox preview **IFRAME**. `X-Frame-Options: DENY` (and `frame-ancestors 'none'`/`'self'`) makes the running application unreachable in the one environment a stakeholder walkthrough happens in, which defeats SM-1/SM-2 (walkthrough-through-the-browser is the acceptance evidence, PRD R-7). Clickjacking risk is mitigated instead by: CSRF double-submit on every state-changing request (F1 FR-1.9), no state-changing `GET`, an explicit `frame-ancestors` allowlist, and the fact that the only mutating action is a deliberate multi-field form submission, not a single click. |
| **D-2** | F1 FR-1.3 requires `SameSite=Lax` and `Secure` unconditionally | Cookie attributes are **configuration-driven** with two named profiles (`governed`, `demo-iframe`), defaulting to `Lax; Secure` (§4.3) | A `SameSite=Lax` cookie is not sent by browsers in a **cross-site** iframe, so the FRD's fixed value makes sign-in impossible under a cross-origin preview proxy. The recommended deployment keeps `Lax; Secure` by having the proxy serve the app **same-origin under a path**; the `demo-iframe` profile exists for proxies that cannot. CSRF protection does not depend on the cookie's `SameSite` value — it is double-submit against a server-stored token (§4.4). |
| **D-3** | F3 "Process — Receipt" orders the entry `INSERT` (step 4) before validation (step 8), then sets `receipt_outcome` (step 10) | **Validation runs immediately before the single `INSERT`**, which writes `receipt_outcome` with its final value. Nothing updates `cargo_entries`, ever (§1.5) | `cargo_entries.receipt_outcome` is `NOT NULL` with a two-value `CHECK`, and `Y0-schema` FR-Y0.3 grants `cargoexec_app` only `SELECT, INSERT` on `cargo_entries` — the FRD's own privilege set makes the FRD's own step 10 unexecutable. Rather than widen the grant (the rejected alternative was a column-level `GRANT UPDATE (receipt_outcome)`), the receipt transaction constructs the canonical entry record, validates *that exact record* against the transaction's `now()`, and inserts once. Evaluated content is byte-identical to recorded content (F4 §Inputs), `RIV-132` sees the same `received_at` that is stored (F4 FR-4.4), and the audit sequence remains `ENTRY_RECEIVED` → `VALIDATION_COMPLETED` → `EXCEPTION_OPENED`. Net effect: entry immutability is *stronger* than the FRD specified — the application role cannot update a cargo entry at all. |

**Additions** — capabilities not in the FRD, each strengthening a stated invariant rather than adding product surface:

| ID | Addition | Reason |
|---|---|---|
| **A-1** | A third **database** role, `cargoexec_ai`, used by the recommendation worker's connection pool. It holds `SELECT` on read-needed tables, `INSERT/UPDATE` on `recommendations`, `INSERT` on `recommendation_values`, `INSERT` on the two audit tables, and **no privilege of any kind on `decisions`, `decision_values`, or `UPDATE` on `exceptions`** (§2.9) | Makes "the AI cannot write a resolution" true at the privilege layer as well as the foreign-key and trigger layers. `Y0-schema` defines two DB roles; this adds a third *database* role and **no** application role — CargoExec still has exactly one authenticated role, `cargo specialist` (F1 FR-1.1). A DB role is not an RBAC tier: it is not selectable, not configurable, not surfaced, and not attached to any human. |
| **A-2** | A prompt-template **integrity manifest**: `prompt_version` → SHA-256 of the template text, checked at startup (§5.4) | The FRD persists `prompt_version` per recommendation but not the prompt text. The manifest makes `prompt_version` a *provable* pointer to exact text at a repo tag, giving full AI traceability without duplicating prompt text on every row or persisting entry content twice. |

**Clarifications** — the FRD is ambiguous or internally inconsistent; this is the reading the build follows:

| ID | Ambiguity | Resolution |
|---|---|---|
| **C-1** | F13 §Action coverage says `RECOMMENDATION_UNAVAILABLE` records the `failure_reason` "in `after_state` detail"; F9 FR-9.11 says `after_state = 'UNAVAILABLE'`. `audit_entries` has no `failure_reason` column and writes no value rows for this action | `after_state = 'UNAVAILABLE'` exactly. The enumerated `failure_reason` lives on `recommendations.failure_reason` and is joined for display via `audit_entries.recommendation_id`. No column is added to the audit tables. |
| **C-2** | `RIV-070` and `RIV-073` name two fields; `validation_findings.field_name` is singular | Each rule declares a `primary_field` in the registry; the finding is emitted against it (`RIV-070` → `bill_of_lading_number` when mode is not `AIR`, else `air_waybill_number`; `RIV-073` → `air_waybill_number`). Every finding therefore binds to exactly one control (F4 FR-4.15, acceptance criterion 10). |
| **C-3** | F3 §Validation references rule ids `RIV-150`, `RIV-170`, `RIV-180`, `RIV-181`, which do not exist in F4's rule table | F4's table is authoritative. The equivalents are `RIV-101` (quantity positive), `RIV-121` (declared value), `RIV-131` (date valid). The F3 references are stale and are not implemented. |
| **C-4** | `Y1-api` §0 says "there are nine" endpoints and then lists ten rows | **Ten** endpoint/method pairs exist, exactly as tabulated (§3.1). An architecture test pins the router's route table to that list of ten. |

**Register status after cross-document validation.** The FRD has since been corrected in place, so that a reader meets each resolution where the error was rather than only here. `Y3` FR-Y3.9 no longer requires `X-Frame-Options` and new FR-Y3.9a forbids it outright (**D-1** — the departure is now the FRD's own rule); F1 FR-1.3 now defines the two cookie profiles with `governed`/`Lax` as the default (**D-2**); F3 §Process now evaluates the canonical record and inserts `cargo_entries` once with its final `receipt_outcome` (**D-3**); `Y0` §Roles now permits the third connection role `cargoexec_ai` with its privilege restrictions (**A-1**); F13 §Action coverage and F9 FR-9.11 now state that `failure_reason` lives on `recommendations` and is reached through `audit_entries.recommendation_id` (**C-1**); F4 now declares the `primary_field` of `RIV-070`/`RIV-073` while F6 FR-6.10 retains their Transport-fieldset presentation binding (**C-2**); F3 §Validation now cites `RIV-101`, `RIV-121`, `RIV-130`/`RIV-131` and `RIV-041` (**C-3**); `Y1` §0 now says ten (**C-4**). The register is retained as the record of why each reading was chosen; no entry is now in conflict with FRD text.

### 0.5 Chunk index

| Chunk | Content |
|---|---|
| `00-overview.md` | Reading guide, deviation register, architecture pattern, diagrams, the four structural guarantees, request lifecycles |
| `01-components.md` | Module inventory, dependency rules, backend and frontend component responsibilities |
| `02a-data-model-core.md` | ER diagram; DDL for identity, entries, validation, exceptions |
| `02b-data-model-governance.md` | DDL for recommendations, decisions, audit store; privileges; four trigger families; hashing; migrations |
| `03a-api-contract.md` | Endpoint inventory and per-endpoint request/response contract |
| `03b-api-types.md` | Shared TypeScript contract package, DTO interfaces, UI route and component contracts |
| `04-security.md` | Authentication, session, CSRF, headers (incl. iframe policy), secrets, input handling |
| `05-ai-integration.md` | Provider abstraction, prompt and traceability, worker, degradation, no-write guarantee |
| `06-tech-stack.md` | Pinned versions with rationale, dev server binding, build pipeline |
| `07-accessibility.md` | USWDS architecture, 508 / WCAG 2.1 AA by construction, manual review gate, no CI gate |
| `08-testing-deployment.md` | Testing strategy, architecture tests, runtime topology, configuration, operations |
| `09-traceability.md` | Feature → component matrix, NFR → mechanism matrix, exclusion enforcement matrix |

---

## 1. Architectural Overview

### 1.1 Pattern: governed modular monolith with database-enforced invariants

CargoExec is **one deployment unit**: a single Node.js process serving both the API and the compiled single-page application from one origin, plus one PostgreSQL database. Inside that process the code is a **layered modular monolith** with a strictly one-directional dependency graph, and beneath it the database is an **active participant in correctness** rather than a passive store.

Four properties drove the pattern choice over the alternatives:

| Requirement | Consequence for the architecture |
|---|---|
| A state change and its audit entry must commit together or not at all (NFR-6) | One process, one transaction boundary per use case, no cross-service calls inside a use case, no eventual consistency anywhere in the loop. This rules out microservices and any queue-mediated write path. |
| Audit storage must reject mutation even from application code, an ORM convenience method, or a `psql` session (NFR-3, R-4) | Enforcement lives in privileges and triggers; the data access layer is **hand-written parameterised SQL with no ORM**, so there is no `save()`, `upsert()`, `findOrCreate()`, or dirty-tracking flush that could emit an `UPDATE` nobody wrote. |
| No code path may resolve an exception without a human decision (NFR-5) | The write capability is split by *connection role* (§2.9) and by *foreign key* (`decisions.decided_by → specialists`), not only by code review. The AI worker runs in the same process but on a different DB role. |
| USWDS conformance and full control of rendered markup (NFR-1, NFR-2) | USWDS's own Sass and HTML patterns are compiled into the app and wrapped in thin project components. No opaque third-party component library renders our markup. |

Deliberately **not** chosen: microservices (breaks transactional audit coupling), an ORM (introduces mutation paths the audit store must not have), a message broker (Y3 FR-Y3.12 forbids it; the only async work is one bounded in-process worker), server-side rendering (the FRD specifies an SPA that resolves `GET /api/session` on load), and a separate BFF (a second hop with nothing to do).

### 1.2 System diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  BROWSER (desktop / tablet, embedded in a preview IFRAME during demonstration)   │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  CargoExec SPA  —  React + TypeScript + USWDS                              │  │
│  │                                                                            │  │
│  │  Shell (F2): banner · header · nav(2 items) · main · footer · live regions  │  │
│  │  ┌──────────┬──────────┬───────────┬────────────────────────────────────┐   │  │
│  │  │ /sign-in │ /queue   │/entries/  │ /cases/{ref}                       │   │  │
│  │  │   (F1)   │  (F8)    │   new (F6)│  CaseDetail(F10) Decision(F12)     │   │  │
│  │  │          │          │           │  AuditTrail(F14)                   │   │  │
│  │  └──────────┴──────────┴───────────┴────────────────────────────────────┘   │  │
│  │  contract/ types (shared with server) · ProvenanceBadge · a11y primitives   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                │ HTTPS · cookie cargoexec_sid · X-CSRF-Token
                                │ same origin, no CDN, no third-party script
┌───────────────────────────────▼──────────────────────────────────────────────────┐
│  CARGOEXEC WEB SERVICE  —  one Node.js process, 0.0.0.0:3000                     │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ HTTP layer: helmet(no frameguard) · CSP w/ scoped frame-ancestors ·        │  │
│  │   requestId · session middleware · CSRF middleware · zod strict parsing ·  │  │
│  │   htmlRouteGuard (302 → /sign-in) · static SPA assets · error mapper       │  │
│  └───────────────┬───────────────────────────────────────────┬────────────────┘  │
│                  │ 10 API routes, 0 query parameters         │                   │
│  ┌───────────────▼─────────────────────────────┐  ┌──────────▼────────────────┐  │
│  │ SERVICE LAYER (one transaction per use case)│  │ RECOMMENDATION WORKER     │  │
│  │  session · receipt(entry+validate+except)   │  │  in-process, bounded      │  │
│  │  queue · caseRead · decision · auditRead    │  │  concurrency, post-commit │  │
│  │            ▲                                │  │  dispatch only            │  │
│  │            │ validation engine (RIV-2026.09)│  │        │                  │  │
│  │            │ audit writer  append(tx,entry) │  │        ▼                  │  │
│  └────────────┴─────────────────┬──────────────┘  │ RecommendationProvider    │  │
│                                 │                 │ (interface)               │  │
│  ┌──────────────────────────────▼──────────────┐  │        │ adapter          │  │
│  │ REPOSITORY LAYER — hand-written SQL, no ORM │◄─┘        │                  │  │
│  └──────────────┬──────────────────────────┬───┘           │                  │  │
│   pool: cargoexec_app                pool: cargoexec_ai    │                  │  │
└──────────────────┬──────────────────────────┬──────────────┼──────────────────┘  │
                   │                          │              │  HTTPS outbound
┌──────────────────▼──────────────────────────▼───────────┐  │  (only external call)
│  POSTGRESQL 16                                          │  │
│                                                         │  │   ┌───────────────┐
│  13 tables · per-value origin columns                   │  │   │ Hosted LLM    │
│  ┌───────────────────────────────────────────────────┐  │  └──►│ request/resp  │
│  │ ENFORCEMENT (not conventions):                    │  │      │ no training   │
│  │  • REVOKE UPDATE/DELETE/TRUNCATE on audit tables  │  │      └───────────────┘
│  │  • BEFORE UPDATE/DELETE/TRUNCATE reject trigger   │  │
│  │  • HITL deferred constraint trigger               │  │   Never sent: identities,
│  │  • audit-coupling deferred constraint triggers    │  │   tokens, credentials
│  │  • hash-chain deferred constraint trigger         │  │
│  │  • composite FK: exception ⇒ failing validation   │  │
│  │  • CHECK origin ∈ {AI,HUMAN}, constant per table  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
        ▲ DDL only, at deploy time
   ┌────┴──────────────┐   ┌─────────────────────────────┐
   │ migration runner  │   │ create-specialist CLI       │
   │ (cargoexec_owner) │   │ (operational provisioning)  │
   └───────────────────┘   └─────────────────────────────┘
```

### 1.3 The governed loop, end to end

```
 STAGE 1 RECEIVE        STAGE 2 VALIDATE        STAGE 3 EXCEPT
 ┌──────────────┐       ┌───────────────┐       ┌──────────────────┐
 │ Specialist   │       │ RIV-2026.09   │       │ exceptions       │
 │ types entry  ├──────►│ 31 rules,     ├──────►│ state=OPEN       │
 │ /entries/new │       │ all evaluated │  FAIL │ receipt_position │
 └──────────────┘       └───────┬───────┘       └────────┬─────────┘
        │                       │ PASS                    │
        │                       ▼                         │
        │             receipt_outcome=VALIDATED_CLEAN      │
        │             (no exception, case closed as clean) │
        │                                                  │
        │   ┌──────────── ONE TRANSACTION ─────────────────┘
        │   │  audit: ENTRY_RECEIVED → VALIDATION_COMPLETED → EXCEPTION_OPENED
        │   │  (deferred triggers verify coupling + chain at COMMIT)
        ▼   ▼
      COMMIT ──post-commit dispatch──► STAGE 4 RECOMMEND
                                       ┌────────────────────────────┐
                                       │ worker → provider          │
                                       │ recommendations: PENDING   │
                                       │   → AVAILABLE | UNAVAILABLE│
                                       │ recommendation_values      │
                                       │   origin = 'AI' (CHECK)    │
                                       │ audit: RECOMMENDATION_*    │
                                       │ exception state UNCHANGED  │
                                       └─────────────┬──────────────┘
                                                     │ proposal only
 STAGE 6 AUDIT                    STAGE 5 HUMAN DECIDE│
 ┌───────────────────────────┐    ┌──────────────────▼─────────────────────┐
 │ /cases/{ref} audit region │    │ APPROVE  → all values keep origin AI   │
 │ append-only, hash-chained │◄───┤ EDIT_APPROVE → changed values HUMAN,   │
 │ actor · action · when ·   │    │   unchanged AI; reason ≥ 10 chars      │
 │ before/after · origin     │    │ REJECT   → no values; reason ≥ 10      │
 │ chain_verified            │    │ decided_by → specialists (NOT NULL)    │
 └───────────────────────────┘    └────────────────────────────────────────┘
                                   ONE TRANSACTION: decision + values +
                                   exceptions.state + exactly one audit entry
```

The loop is completable with stage 4 degraded: an `UNAVAILABLE` or stuck-`PENDING` recommendation still permits `EDIT_APPROVE` (direct resolution, all values `HUMAN`) or `REJECT` (§5.6, SM-13).

### 1.4 The four structural guarantees and their enforcement

The brief for this architecture was that four properties be structural rather than conventional. Each is enforced at multiple independent layers, so a defect in any one layer does not produce a governance failure.

**(1) Audit immutability — append-only at the database**

| Layer | Mechanism |
|---|---|
| Privilege | `REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries, audit_entry_values FROM PUBLIC, cargoexec_app, cargoexec_ai`; `GRANT SELECT, INSERT` only (§2.9) |
| Trigger | `BEFORE UPDATE OR DELETE OR TRUNCATE` statement- and row-level triggers raising `AUDIT_IMMUTABLE` unconditionally — covers owner and superuser, which privileges do not (§2.10) |
| Tamper evidence | Per-case `case_sequence` + `prev_entry_hash`/`entry_hash` SHA-256 chain, verified by a deferred constraint trigger on insert and recomputed read-only on every audit read (§2.11, §2.12) |
| Interface | The audit writer module exposes exactly one function, `append(tx, entry)`. No update/delete/redact/backfill function exists in the module or anywhere else; an architecture test asserts the audit tables are referenced by exactly one module (§8.4) |
| Data access | No ORM anywhere, so no framework can emit an `UPDATE` on a loaded row (§1.1) |
| Retention | No purge, rollup, archive, or retention job exists; entries are permanent (F13 FR-13.14) |

The FRD's hash-chain design is **carried forward as sound**, with one hardening: the chain is verified by a *deferred constraint trigger at commit*, so a broken link cannot be committed even by a direct SQL session, and the read-only verifier (`verify_audit_chain`) never repairs.

**(2) Per-value AI-vs-human provenance, at every layer**

| Layer | Mechanism |
|---|---|
| Schema | Four value tables each carry `origin NOT NULL CHECK (origin IN ('AI','HUMAN'))`; `cargo_entry_field_origins` is `CHECK (origin='HUMAN')` and `recommendation_values` is `CHECK (origin='AI')`, so mixed origin is representable **only** on `decision_values` — exactly where a human edits an AI proposal (§2.4, §2.7) |
| Computation | `origin` is computed server-side by canonical comparison against the proposal and is rejected as an unknown field if a client sends it (§3.5, F11 FR-11.8/FR-11.15) |
| API types | `Origin = 'AI' \| 'HUMAN'` is a **required** property of every value-bearing DTO; there is no optional-origin type in the contract package (§3b.2) |
| UI contract | The only component permitted to render a case value takes `Attributed<T> = { value: T; origin: Origin }`; a bare `string` will not type-check into it (§3b.6) |
| Presentation | `ProvenanceBadge` renders text + icon + token colour, never colour alone, with visually-hidden text for compact contexts (§7.5) |
| Audit | `audit_entry_values` carries `before_origin` and `after_origin` per field, with a `CHECK` that an origin exists wherever a value exists (§2.8) |

**(3) Human-in-the-loop — a recommendation is not a resolution**

| Layer | Mechanism |
|---|---|
| Table separation | Proposals in `recommendations`/`recommendation_values`; resolutions in `decisions`/`decision_values`. No shared column, no view, no job, no trigger copies one into the other (§2.6, §2.7) |
| Identity FK | `decisions.decided_by uuid NOT NULL REFERENCES specialists(id)`, populated only from the authenticated request principal. No AI or system row exists in `specialists`, so an AI-authored decision fails a foreign key (§2.7) |
| Deferred trigger | `trg_exceptions_hitl` refuses any commit that moves an exception out of `OPEN` unless a matching `decisions` row exists whose `resulting_state` equals the new state — raises `HITL_VIOLATION` (§2.10) |
| Closure `CHECK` | `state='OPEN' ⇔ (closed_at IS NULL AND decision_id IS NULL)`: a closed exception with no decision is unrepresentable (§2.5) |
| Privilege | The worker's role `cargoexec_ai` has **no** privilege on `decisions`/`decision_values` and **no** `UPDATE` on `exceptions` (§2.9) |
| Code capability | The worker module cannot import the decision service (enforced by an import-graph test); there is no scheduler, cron, queue consumer, retry path, or admin tool that writes `exceptions.state` — a repo-wide test asserts exactly one writer (§8.4) |
| API shape | `decision_type` is required with no default; no batch, no "approve all", no empty-body semantics, no apply endpoint (§3.5) |

**(4) Exactly one audit entry per state change**

| Layer | Mechanism |
|---|---|
| Deferred constraint triggers | Five coupling triggers (entry, validation, exception, decision, recommendation-terminal) assert **exactly one** matching audit entry at `COMMIT`, raising `AUDIT_COUPLING_VIOLATION` (§2.10) |
| Transaction coupling | `append(tx, entry)` requires a transaction handle as its first parameter and has no ability to open its own — the change and its entry share one transaction (§1.6) |
| Sequence integrity | `case_sequence` assigned under the case-anchor row lock, with `UNIQUE (case_id, case_sequence)` as backstop (§2.11) |
| Failure policy | An `append` failure propagates and aborts the caller's transaction. It is never caught, retried out-of-band, queued, or written to a fallback file (F13 FR-13.16) |
| Test | The eight transitions of `00-header §0.6` are enumerated in a test that asserts one entry each, with expected action, actor, states, and value rows (§8.3, SM-6) |

### 1.5 Request lifecycle — receipt (`POST /api/entries`)

The transaction below implements deviation **D-3**: validate the canonical record, then insert once.

```
 1  requestId middleware assigns request_id; pino child logger bound to it
 2  session middleware resolves principal (401/302 if absent) ─ §4.2
 3  CSRF middleware verifies X-CSRF-Token ─ §4.4
 4  zod .strict() parse of the 14-field body → 422 REQUEST_MALFORMED on any
    unknown property, wrong type, or over-length value; nothing persisted
 5  normalise: trim leading/trailing whitespace; ''/whitespace-only → NULL
    (F3 FR-3.8) → CanonicalEntryRecord
 6  BEGIN
 7  SELECT now() AS received_at, nextval('case_reference_seq')  ─ tx-stable
 8  validationEngine.evaluate(CanonicalEntryRecord, received_at)
       → { outcome, findings[], rule_set_version, rules_evaluated_count }
 9  INSERT cargo_entries (…values…, received_at, case_reference,
       receipt_outcome = outcome==='FAIL' ? 'EXCEPTION_OPENED'
                                          : 'VALIDATED_CLEAN')  RETURNING id
       └─ 23505 on entry_number ⇒ ROLLBACK, SELECT existing case_reference,
          respond 409 ENTRY_NUMBER_DUPLICATE (F3 FR-3.9)
10  SELECT id FROM cargo_entries WHERE id=$1 FOR UPDATE      ─ case anchor lock
11  INSERT cargo_entry_field_origins  (one row per provided field, 'HUMAN')
12  auditWriter.append(tx, ENTRY_RECEIVED)     seq 1  actor SPECIALIST
13  INSERT validation_results (+ validation_findings, ascending rule_id)
14  auditWriter.append(tx, VALIDATION_COMPLETED) seq 2  actor SYSTEM (on behalf of)
15  if FAIL:  INSERT exceptions (state OPEN, receipt_position from sequence)
              INSERT recommendations (status PENDING)   ← no audit entry (FR-5.12)
              auditWriter.append(tx, EXCEPTION_OPENED)  seq 3  actor SYSTEM
16  COMMIT  ─ deferred triggers now verify: audit coupling (a,b,c), hash chain,
              HITL (insert path: state OPEN ⇒ no decision required)
              any violation ⇒ ROLLBACK ⇒ 500 RECEIPT_FAILED, "nothing was saved"
17  after commit only: worker.dispatch(exceptionId)  ─ fire-and-forget, logged,
              never awaited, failure cannot affect the committed receipt
18  201 { entry, case_reference, receipt_outcome, validation, exception, next }
```

### 1.6 Request lifecycle — decision (`POST /api/exceptions/{id}/decision`)

```
 1-4 requestId · session · CSRF · zod .strict() union parse by decision_type
     (unknown property, including origin/decided_by/applied ⇒ 422)
 5  Idempotency-Key present and matching an existing decision for this
    exception with an identical canonical body ⇒ return original 201 with
    idempotent_replay: true, write nothing.  Different body ⇒ 409.
 6  BEGIN
 7  SELECT … FROM exceptions WHERE id=$1 FOR UPDATE        ─ serialises deciders
 8  state <> 'OPEN' ⇒ ROLLBACK, 409 EXCEPTION_ALREADY_DECIDED (with existing
    decision type, deciding specialist display name, timestamp)
 9  load recommendation (+ proposed values). APPROVE requires status AVAILABLE,
    else 409 RECOMMENDATION_NOT_AVAILABLE.  Supplied recommendation_id must
    match, else 409 RECOMMENDATION_MISMATCH.
10  SELECT id FROM cargo_entries WHERE id=$case FOR UPDATE  ─ audit anchor lock
11  compute resolution values + per-value origin  ─ §3.5.3 (server only)
12  INSERT decisions (decided_by = principal.id, resulting_state, reason)
13  INSERT decision_values  (none for REJECT)
14  UPDATE exceptions SET state, closed_at, decision_id
15  auditWriter.append(tx, RECOMMENDATION_APPROVED | …EDITED_AND_APPROVED |
       …REJECTED)  ─ exactly one, reason copied verbatim, one value row each
16  COMMIT ─ deferred triggers verify HITL match + exactly one coupled audit
       entry + chain link.  Violation ⇒ 500 DECISION_FAILED, nothing saved.
17  201 { decision, exception, audit_entry_id, idempotent_replay:false }
```

Any `4xx`/`5xx` from either lifecycle means **nothing was written** — no partial state, no orphan row, no audit entry (Y2 FR-Y2.2).

### 1.7 Deployment topology

```
 DEMONSTRATION / SANDBOX PREVIEW
 ┌──────────────────────────────────────────────────────────────────────┐
 │ preview proxy  ──IFRAME──►  http(s)://<preview-host>  ──►  :3000     │
 │   (no X-Frame-Options anywhere; CSP frame-ancestors allows the host) │
 └──────────────┬───────────────────────────────────────────────────────┘
                │
 ┌──────────────▼─────────────────┐      ┌────────────────────────────┐
 │ container: cargoexec-web       │      │ container: cargoexec-db    │
 │  node 22 · listens 0.0.0.0:3000│◄────►│ postgres 16 · 5432         │
 │  serves SPA + /api + worker    │ pool │ volume: pgdata (persistent)│
 │  env-only configuration        │      │ roles: owner / app / ai    │
 └────────────────────────────────┘      └────────────────────────────┘
        │ one-shot at deploy               ▲
        ├─ migrate  (cargoexec_owner) ─────┘
        └─ create-specialist CLI (interactive password)

 No broker. No cache. No object store. No search index. No scheduler.
 No CI workflow files. One web service, one database.
 (Phase 7: an optional, idempotent, operator-run seed script may pre-load one
  demonstration case for walkthrough purposes — see 08-testing-deployment.md §8.9.
  It is not part of this deployment's steady-state topology.)
```

Runtime detail, environment variables, and operational procedures are in §8.5–§8.8.

### 1.8 What this architecture deliberately does not contain

Restated here because absence is a design output, verified by the architecture tests of §8.4:

- No `.github/workflows` directory, no CI pipeline file of any kind, no `axe-core`, no automated accessibility gate.
- No supervisor, dashboard, metrics, aging, volume, throughput, workload, reassignment, or re-prioritisation surface — and therefore no `assigned_to`, `priority`, `age_days`, `sla_*` column, no aggregate query, and no counting endpoint.
- No `role`, `permission`, or `scope` column, claim, or check. Exactly one authenticated role; authorisation is binary.
- No queue filter, sort, assignment, or prioritisation. `GET /api/exceptions` accepts zero query parameters; the API accepts zero query parameters in total.
- No export of anything, in any format, at any endpoint, under any `Accept` header or `?format=` parameter.
- No file/API ingestion, bulk upload, ingestion adapter, multipart handler, CSV parser, or ACE/ATS boundary.
- No seed script, fixture loader, or demonstration dataset; migrations create schema objects only. **(Phase 7 note: superseded in the narrow way described at F15 — an operator-invoked, idempotent `cli/seed-demo-case.ts` now exists, but it writes exclusively through the same service/repository functions a live request uses, never a migration and never a direct `INSERT`; migrations themselves are unaffected and still create schema objects only. See `01-components.md` §1A.1a and `08-testing-deployment.md` §8.9.)**
- No autonomous resolution: no scheduler, cron, queue consumer, retry path, or system actor that can write `exceptions.state`.
- No duty/tariff calculation, HTS or classification field, rate derivation, or risk score — including in the AI output schema, which rejects such fields as schema-invalid.
- No native mobile client, no mobile push, no app shell for one.
- No model training, fine-tuning, embedding store, evaluation harness, or feedback-to-model loop.
- No future-proofing column, endpoint, feature flag, or abstraction layer for any of the above.

---
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
## 2. Data Model

**Target: PostgreSQL 16.4** (FRD specifies 15+; 16 is pinned for the demonstration). The DDL in §2.3–§2.12 is complete and is the same schema as FRD `Y0-schema` — thirteen tables, no table added, no table removed, and no column added. Where this document adds anything it is a *privilege* (the `cargoexec_ai` role, addition A-1), never a column, table, or index that serves an excluded capability.

### 2.1 Entity–relationship diagram

```
                          ┌───────────────────┐
                          │    specialists    │  the ONLY actor table.
                          │  id (PK)          │  No role column. No AI row.
                          │  email (UQ)       │  No system row. Ever.
                          │  display_name     │
                          │  password_hash    │
                          │  is_active        │
                          └───┬───────────┬───┘
              created_by      │           │  decided_by (NOT NULL)
       ┌──────────────────────┘           └──────────────────┐
       │                                                      │
       │                  ┌──────────────┐                    │
       │                  │   sessions   │ specialist_id ─────┘ (FK only;
       │                  │  token_hash  │  server-side session state
       │                  │  csrf_hash   │  session events are NOT audit)
       │                  └──────────────┘
       ▼
┌──────────────────────────┐        1:N       ┌───────────────────────────────┐
│      cargo_entries       │─────────────────►│  cargo_entry_field_origins    │
│  id (PK) = CASE ANCHOR   │                  │  (entry_id, field_name) PK    │
│  case_reference (UQ)     │                  │  origin CHECK ('HUMAN')       │
│  created_by → specialists│                  └───────────────────────────────┘
│  received_at             │
│  receipt_outcome         │  IMMUTABLE: app role holds SELECT+INSERT only
│  14 submitted fields     │  (D-3: written once, with its final outcome)
└──────┬────────────┬──────┘
       │ 1:1        │ 1:N
       ▼            │                        ┌───────────────────────────────┐
┌──────────────────┐│                  1:N   │     validation_findings       │
│validation_results││─────────────────────── │  rule_id (RIV-nnn)            │
│  id (PK)         ││                        │  field_name · failure_code    │
│  outcome PASS|FAIL                         │  message                      │
│  UNIQUE(id,outcome) ◄──┐                   │  no severity/weight/priority  │
│  rule_set_version ││   │ composite FK      └───────────────────────────────┘
└──────────────────┘│   │ guarantees an exception's
                    │   │ basis is a FAILING result
       ┌────────────┘   │
       ▼ 1:0..1         │
┌─────────────────────────────────┐
│           exceptions            │  state OPEN → RESOLVED | REJECTED
│  id (PK)                        │  receipt_position (UQ, sole ordering)
│  entry_id (UQ) → cargo_entries  │  NO priority/assignee/age/SLA column
│  validation_result_id ──────────┘  closed_at & decision_id NULL iff OPEN
│  validation_outcome CHECK 'FAIL'│
│  decision_id → decisions ───────┐
└───────┬─────────────────┬───────┘│
        │ 1:0..1          │ 1:0..1 │
        ▼                 ▼        │
┌──────────────────┐  ┌────────────┴──────────────┐
│ recommendations  │  │        decisions          │  THE ONLY RESOLUTION
│ PROPOSAL ONLY    │  │  decided_by NOT NULL ─────┼─► specialists
│ status PENDING → │  │  decision_type            │  (AI has no row here,
│  AVAILABLE |     │  │   APPROVE|EDIT_APPROVE|   │   so it cannot decide)
│  UNAVAILABLE     │  │   REJECT                  │  UNIQUE(exception_id)
│ model_id         │  │  reason (CHECK ≥10 unless │  reason enforced in DDL
│ prompt_version   │  │   APPROVE)                │
│ failure_reason   │  │  resulting_state          │
└────────┬─────────┘  └──────────┬────────────────┘
         │ 1:N                   │ 1:N
         ▼                       ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│ recommendation_values  │  │       decision_values        │
│ origin CHECK ('AI')    │  │ origin ∈ {AI, HUMAN}  ◄──────┼── the ONLY table
│ addresses_rule_ids[]   │  │ prior_value / prior_origin   │   where origin is
│ proposed_value         │  │ changed_from_proposal        │   mixed: exactly
└────────────────────────┘  └──────────────────────────────┘   where a human
                                                               edits an AI value

   ╔════════════════════════════ APPEND-ONLY ════════════════════════════╗
   ║  ┌────────────────────────────┐        1:N  ┌──────────────────────┐ ║
   ║  │       audit_entries        │────────────►│  audit_entry_values  │ ║
   ║  │ case_id → cargo_entries    │             │ (audit_entry_id,     │ ║
   ║  │ case_sequence  UQ(case,seq)│             │  field_name) PK      │ ║
   ║  │ global_sequence (identity) │             │ before_value/origin  │ ║
   ║  │ action_type (8 values)     │             │ after_value/origin   │ ║
   ║  │ actor_type SPECIALIST|AI|  │             │ changed              │ ║
   ║  │            SYSTEM          │             └──────────────────────┘ ║
   ║  │ exception_id/recommendation│                                      ║
   ║  │  _id/decision_id           │   UPDATE · DELETE · TRUNCATE         ║
   ║  │ before_state / after_state │   revoked from every role AND        ║
   ║  │ reason · request_id        │   rejected by trigger for ALL roles  ║
   ║  │ prev_entry_hash/entry_hash │   incl. owner and superuser          ║
   ║  └────────────────────────────┘                                      ║
   ╚══════════════════════════════════════════════════════════════════════╝
```

**Relationship chain.** `cargo_entries 1—1 validation_results 1—0..N validation_findings`; `cargo_entries 1—0..1 exceptions 1—0..1 recommendations`; `exceptions 1—0..1 decisions`; `cargo_entries 1—N audit_entries 1—0..N audit_entry_values`. The **case anchor** is `cargo_entries.id`: every audit entry references it because the first case event (`ENTRY_RECEIVED`) predates the exception.

### 2.2 Mutability contract

| Table | After insert, the application may change | Enforced by |
|---|---|---|
| `specialists` | `last_sign_in_at`, `is_active` | grant: `SELECT, INSERT, UPDATE` (column discipline in the repository; no endpoint exposes either) |
| `sessions` | `last_seen_at`, `revoked_at`, `revocation_reason` | grant: `SELECT, INSERT, UPDATE` |
| `cargo_entries` | **nothing** | grant: `SELECT, INSERT` only (D-3) |
| `cargo_entry_field_origins` | **nothing** | grant: `SELECT, INSERT` only |
| `validation_results` | **nothing** | grant: `SELECT, INSERT` only |
| `validation_findings` | **nothing** | grant: `SELECT, INSERT` only |
| `exceptions` | `state`, `closed_at`, `decision_id` — once, `OPEN` → terminal | grant `UPDATE`; HITL trigger + closure `CHECK` |
| `recommendations` | `status` and result columns — once, `PENDING` → terminal | grant `UPDATE`; status `CHECK`s |
| `recommendation_values` | **nothing** | grant: `SELECT, INSERT` only |
| `decisions` | **nothing** | grant: `SELECT, INSERT` only |
| `decision_values` | **nothing** | grant: `SELECT, INSERT` only |
| `audit_entries` | **nothing — append-only** | privilege revocation **and** unconditional trigger |
| `audit_entry_values` | **nothing — append-only** | privilege revocation **and** unconditional trigger |

`DELETE` is granted on **no table**. `TRUNCATE` is granted on **no table**. There is no deletion path for an entry, a finding, an exception, a recommendation, a decision, or an audit entry (F5 FR-5.15, F13 FR-13.14).

### 2.3 Identity

```sql
-- Migration 0001_identity.sql  (owner: cargoexec_owner)
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), digest()

CREATE TABLE specialists (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  display_name     text NOT NULL,
  password_hash    text NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at  timestamptz,
  CONSTRAINT specialists_email_lower_chk CHECK (email = lower(email)),
  CONSTRAINT specialists_email_len_chk   CHECK (char_length(email) BETWEEN 3 AND 254),
  CONSTRAINT specialists_name_len_chk    CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 120)
);
CREATE UNIQUE INDEX uq_specialists_email ON specialists (email);
-- No role, is_supervisor, permissions, or scope column: every row is a cargo
-- specialist with identical capability (F1 FR-1.1). No AI row, no SYSTEM row --
-- which is what makes decisions.decided_by structurally human (F11 §structural).

CREATE TABLE sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id       uuid NOT NULL REFERENCES specialists (id),
  token_hash          bytea NOT NULL,
  csrf_token_hash     bytea NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  absolute_expires_at timestamptz NOT NULL,
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  revocation_reason   text,
  user_agent          text,
  CONSTRAINT sessions_token_hash_len_chk CHECK (octet_length(token_hash) = 32),
  CONSTRAINT sessions_csrf_hash_len_chk  CHECK (octet_length(csrf_token_hash) = 32),
  CONSTRAINT sessions_revocation_chk CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL) OR
    (revoked_at IS NOT NULL AND revocation_reason IN ('SIGNED_OUT','EXPIRED'))
  ),
  CONSTRAINT sessions_expiry_after_creation_chk CHECK (absolute_expires_at > created_at)
);
CREATE UNIQUE INDEX uq_sessions_token_hash ON sessions (token_hash);
CREATE INDEX idx_sessions_specialist ON sessions (specialist_id);
-- Raw tokens exist only in the client cookie; only SHA-256 hashes are stored.
-- No session-management screen and no admin surface reads this table.
```

### 2.4 Entries

```sql
-- Migration 0002_entries.sql
CREATE SEQUENCE case_reference_seq;

CREATE TABLE cargo_entries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_reference         text NOT NULL,
  created_by             uuid NOT NULL REFERENCES specialists (id),
  received_at            timestamptz NOT NULL DEFAULT now(),
  receipt_outcome        text NOT NULL,

  -- The fourteen submitted fields, stored exactly as typed (trimmed only).
  entry_number           text,
  importer_of_record_id  text,
  port_of_entry_code     text,
  mode_of_transport      text,
  carrier_code           text,
  conveyance_name        text,
  bill_of_lading_number  text,
  air_waybill_number     text,
  country_of_origin_code text,
  goods_description      text,
  quantity               numeric(14,3),
  quantity_uom           text,
  declared_value_usd     numeric(14,2),
  arrival_date           date,

  CONSTRAINT cargo_entries_case_reference_fmt_chk
    CHECK (case_reference ~ '^CE-[0-9]{4}-[0-9]{6}$'),
  CONSTRAINT cargo_entries_receipt_outcome_chk
    CHECK (receipt_outcome IN ('VALIDATED_CLEAN','EXCEPTION_OPENED')),
  CONSTRAINT cargo_entries_len_chk CHECK (
    coalesce(char_length(entry_number),0)           <= 20 AND
    coalesce(char_length(importer_of_record_id),0)  <= 20 AND
    coalesce(char_length(port_of_entry_code),0)     <= 8  AND
    coalesce(char_length(mode_of_transport),0)      <= 16 AND
    coalesce(char_length(carrier_code),0)           <= 8  AND
    coalesce(char_length(conveyance_name),0)        <= 100 AND
    coalesce(char_length(bill_of_lading_number),0)  <= 40 AND
    coalesce(char_length(air_waybill_number),0)     <= 20 AND
    coalesce(char_length(country_of_origin_code),0) <= 4  AND
    coalesce(char_length(goods_description),0)      <= 2000 AND
    coalesce(char_length(quantity_uom),0)           <= 8
  )
);
CREATE UNIQUE INDEX uq_cargo_entries_case_reference ON cargo_entries (case_reference);
CREATE UNIQUE INDEX uq_cargo_entries_entry_number
  ON cargo_entries (entry_number) WHERE entry_number IS NOT NULL;   -- F3 FR-3.9
CREATE INDEX idx_cargo_entries_received_at ON cargo_entries (received_at);
-- receipt_outcome is written in the single INSERT (D-3); the application role
-- holds no UPDATE privilege on this table, so the entry of record is physically
-- immutable. Corrections live on decision_values, never as an overwrite.

-- Per-value provenance baseline: one row per field the specialist actually
-- provided (absent and whitespace-only fields get no row -- F3 FR-3.8).
CREATE TABLE cargo_entry_field_origins (
  entry_id     uuid NOT NULL REFERENCES cargo_entries (id),
  field_name   text NOT NULL,
  origin       text NOT NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, field_name),
  CONSTRAINT cefo_origin_human_chk CHECK (origin = 'HUMAN'),          -- F0 FR-0.3
  CONSTRAINT cefo_field_name_chk CHECK (field_name IN (
    'entry_number','importer_of_record_id','port_of_entry_code','mode_of_transport',
    'carrier_code','conveyance_name','bill_of_lading_number','air_waybill_number',
    'country_of_origin_code','goods_description','quantity','quantity_uom',
    'declared_value_usd','arrival_date'))
);
-- A manually typed value is HUMAN by construction: the CHECK is a constant, so
-- no code path -- including a compromised one -- can mark an entry value as AI.
```

### 2.5 Validation and exceptions

```sql
-- Migration 0003_validation.sql
CREATE TABLE validation_results (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              uuid NOT NULL REFERENCES cargo_entries (id),
  outcome               text NOT NULL,
  rule_set_version      text NOT NULL,
  evaluated_at          timestamptz NOT NULL DEFAULT now(),
  rules_evaluated_count integer NOT NULL,
  findings_count        integer NOT NULL,
  CONSTRAINT validation_results_outcome_chk CHECK (outcome IN ('PASS','FAIL')),
  CONSTRAINT validation_results_counts_chk CHECK (
    findings_count >= 0 AND rules_evaluated_count >= findings_count AND
    ((outcome = 'PASS' AND findings_count = 0) OR (outcome = 'FAIL' AND findings_count > 0))
  ),
  -- Supports the composite FK that makes an exception without a failure
  -- impossible (F0 FR-0.11):
  CONSTRAINT uq_validation_results_id_outcome UNIQUE (id, outcome)
);
CREATE UNIQUE INDEX uq_validation_results_entry ON validation_results (entry_id);
-- Exactly one result per entry: validation runs once, on receipt, and there is
-- no re-validate path anywhere in the API or the CLI (F4 FR-4.2).

CREATE TABLE validation_findings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_result_id uuid NOT NULL REFERENCES validation_results (id),
  rule_id              text NOT NULL,
  field_name           text NOT NULL,
  failure_code         text NOT NULL,
  message              text NOT NULL,
  CONSTRAINT vf_rule_id_fmt_chk CHECK (rule_id ~ '^RIV-[0-9]{3}$'),
  CONSTRAINT vf_message_len_chk CHECK (char_length(message) BETWEEN 1 AND 500),
  CONSTRAINT uq_validation_findings_rule UNIQUE (validation_result_id, rule_id)
  -- No severity, weight, score, risk, or priority column (F4 FR-4.9): grading a
  -- finding would be prioritisation, which is out of scope (PRD §10 #4).
);
CREATE INDEX idx_validation_findings_result ON validation_findings (validation_result_id, rule_id);
-- field_name is the rule's declared primary_field (clarification C-2), so every
-- finding binds to exactly one control on the F6 form.

-- Migration 0004_exceptions.sql
CREATE SEQUENCE exception_receipt_position_seq;

CREATE TABLE exceptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id             uuid NOT NULL REFERENCES cargo_entries (id),
  validation_result_id uuid NOT NULL,
  validation_outcome   text NOT NULL DEFAULT 'FAIL',
  state                text NOT NULL DEFAULT 'OPEN',
  receipt_position     bigint NOT NULL DEFAULT nextval('exception_receipt_position_seq'),
  opened_at            timestamptz NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  decision_id          uuid,
  CONSTRAINT exceptions_state_chk CHECK (state IN ('OPEN','RESOLVED','REJECTED')),
  CONSTRAINT exceptions_basis_is_failure_chk CHECK (validation_outcome = 'FAIL'),
  CONSTRAINT exceptions_basis_fk
    FOREIGN KEY (validation_result_id, validation_outcome)
    REFERENCES validation_results (id, outcome),                       -- F0 FR-0.11
  CONSTRAINT exceptions_closure_consistency_chk CHECK (
    (state = 'OPEN'     AND closed_at IS NULL     AND decision_id IS NULL) OR
    (state <> 'OPEN'    AND closed_at IS NOT NULL AND decision_id IS NOT NULL)
  )                                                                    -- F5 FR-5.14
  -- No priority, severity, risk_score, due_at, sla_*, assigned_to, claimed_by,
  -- or escalated_at column (F5 FR-5.9). No IN_PROGRESS, ON_HOLD, ESCALATED,
  -- CLAIMED, SNOOZED, or PENDING_REVIEW state: those imply workflow,
  -- assignment, or supervision (PRD §10 #2, #4). No REOPEN transition.
);
CREATE UNIQUE INDEX uq_exceptions_entry ON exceptions (entry_id);
CREATE UNIQUE INDEX uq_exceptions_receipt_position ON exceptions (receipt_position);
-- The single index serving the queue projection (F7 FR-7.1). It is a partial
-- index on the only ordering dimension that exists; there is no index -- and
-- therefore no efficient query -- supporting any other ordering or filter.
CREATE INDEX idx_exceptions_open_receipt_order
  ON exceptions (receipt_position) WHERE state = 'OPEN';
```

The composite foreign key deserves emphasis: because `exceptions.validation_outcome` is `CHECK`-pinned to `'FAIL'` and `(validation_result_id, validation_outcome)` references `validation_results (id, outcome)`, **an exception whose basis is a passing validation is rejected by the database with no trigger involved** (SM-8: zero exceptions without a validation basis). Sequence gaps in `receipt_position` from rolled-back transactions are accepted and never compacted — renumbering would rewrite queue history (F5 FR-5.8).

### 2.6 Index inventory and rationale

Every index exists to serve a query the FRD requires. No index anticipates a capability that does not exist.

| Index | Serves | Why it is the only one needed |
|---|---|---|
| `uq_specialists_email` | sign-in lookup by normalised email | The only lookup key for an account |
| `uq_sessions_token_hash` | session resolution on every authenticated request | Hash lookup, O(1) per request |
| `idx_sessions_specialist` | sign-out and expiry housekeeping | FK index |
| `uq_cargo_entries_case_reference` | `/cases/{caseReference}` resolution | Case reference is a first-class identifier in URLs |
| `uq_cargo_entries_entry_number` (partial) | duplicate entry-number rejection (409) | Deliberately not a validation rule (F3 FR-3.9) |
| `idx_cargo_entries_received_at` | receipt-time ordering support for case reads | Not a queue ordering; the queue orders by `receipt_position` |
| `uq_validation_results_entry` | one-result-per-entry invariant + case read | Enforces F4 FR-4.11 |
| `uq_validation_results_id_outcome` | the exception basis composite FK | Structural, not performance |
| `idx_validation_findings_result` | findings in `rule_id` order for a case | Matches F4 FR-4.8 emission order |
| `uq_exceptions_entry` | one exception per entry (F5 FR-5.3) | |
| `uq_exceptions_receipt_position` | ordering uniqueness | |
| `idx_exceptions_open_receipt_order` (partial, `state='OPEN'`) | **the** queue query | Partial on `OPEN` because closed cases are excluded from the queue and there is no closed-case browse surface |
| `uq_recommendations_exception` | one recommendation per exception (F9 FR-9.5) | |
| `uq_recommendation_values_field` | one proposal per field | |
| `uq_decisions_exception` | one decision per exception, ever (F11 FR-11.10) | The double-decision backstop |
| `uq_decisions_idempotency` (partial) | idempotent replay | |
| `uq_decision_values_field` | one resolution value per field | |
| `idx_audit_entries_case` | the per-case trail read, ascending sequence | The only audit read shape that exists |
| `uq_audit_entries_case_sequence` | monotonic sequencing backstop | |
| `uq_audit_entries_entry_hash` | chain uniqueness / tamper evidence | |
| `idx_audit_entries_decision` (partial) | decision-coupling trigger | |
| `idx_audit_entries_recommendation` (partial) | recommendation-coupling trigger | |

**Absent by design:** no index on `exceptions.opened_at`, `closed_at`, or `state` alone (would serve aging, throughput, or state-count queries); no index on `decisions.decided_by` or `decided_at` (would serve per-specialist workload reporting); no full-text index on `goods_description` (would serve search). None of those queries exists, so neither do their indexes.

---
### 2.7 Recommendations — proposals that are structurally not resolutions

```sql
-- Migration 0005_recommendations.sql
CREATE TABLE recommendations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id       uuid NOT NULL REFERENCES exceptions (id),
  status             text NOT NULL DEFAULT 'PENDING',
  requested_at       timestamptz NOT NULL DEFAULT now(),
  recommended_action text,
  rationale          text,
  model_id           text,
  prompt_version     text,
  generated_at       timestamptz,
  latency_ms         integer,
  failure_reason     text,
  failed_at          timestamptz,
  CONSTRAINT recommendations_status_chk CHECK (status IN ('PENDING','AVAILABLE','UNAVAILABLE')),
  CONSTRAINT recommendations_available_chk CHECK (
    status <> 'AVAILABLE' OR (
      recommended_action IS NOT NULL AND char_length(btrim(recommended_action)) BETWEEN 1 AND 500 AND
      rationale          IS NOT NULL AND char_length(btrim(rationale))          BETWEEN 1 AND 2000 AND
      model_id IS NOT NULL AND prompt_version IS NOT NULL AND generated_at IS NOT NULL
    )
  ),
  CONSTRAINT recommendations_unavailable_chk CHECK (
    status <> 'UNAVAILABLE' OR (
      failed_at IS NOT NULL AND failure_reason IN (
        'PROVIDER_TIMEOUT','PROVIDER_UNAVAILABLE','PROVIDER_RATE_LIMITED',
        'PROVIDER_AUTH_FAILED','SCHEMA_INVALID','CONTENT_FILTERED','INTERNAL_ERROR')
    )
  ),
  CONSTRAINT recommendations_pending_chk CHECK (
    status <> 'PENDING' OR (generated_at IS NULL AND failed_at IS NULL)
  )
);
CREATE UNIQUE INDEX uq_recommendations_exception ON recommendations (exception_id);
-- An AVAILABLE recommendation cannot exist without its traceability metadata:
-- model_id, prompt_version, and generated_at are CHECK-required (F9 FR-9.10),
-- so "the record cannot say what the AI said" is not a reachable state.
-- NOTE: no column of this table participates in the exception's state, and no
-- view, job, or trigger copies a row here into decisions/decision_values.
-- That separation IS the no-auto-apply guarantee (F9 FR-9.1, F11 §structural).

CREATE TABLE recommendation_values (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id  uuid NOT NULL REFERENCES recommendations (id),
  field_name         text NOT NULL,
  proposed_value     text NOT NULL,
  origin             text NOT NULL DEFAULT 'AI',
  addresses_rule_ids text[] NOT NULL,
  CONSTRAINT rv_origin_ai_chk CHECK (origin = 'AI'),                   -- F0 FR-0.3
  CONSTRAINT rv_addresses_nonempty_chk CHECK (array_length(addresses_rule_ids, 1) >= 1),
  CONSTRAINT rv_value_len_chk CHECK (char_length(proposed_value) BETWEEN 1 AND 2000),
  CONSTRAINT uq_recommendation_values_field UNIQUE (recommendation_id, field_name)
);
-- origin is a CHECK-pinned constant: a proposal is machine-originated by
-- construction, and there is no mechanism anywhere to mark one HUMAN at this
-- stage. Every proposed value must also justify itself by naming the rule(s)
-- it addresses, all of which must be findings of this exception (F9 FR-9.7).
```

### 2.8 Decisions — the only writer of a resolution

```sql
-- Migration 0006_decisions.sql
CREATE TABLE decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id      uuid NOT NULL REFERENCES exceptions (id),
  decision_type     text NOT NULL,
  decided_by        uuid NOT NULL REFERENCES specialists (id),   -- human identity REQUIRED
  decided_at        timestamptz NOT NULL DEFAULT now(),
  reason            text,
  recommendation_id uuid REFERENCES recommendations (id),
  resulting_state   text NOT NULL,
  idempotency_key   text,
  CONSTRAINT decisions_type_chk CHECK (decision_type IN ('APPROVE','EDIT_APPROVE','REJECT')),
  CONSTRAINT decisions_resulting_state_chk CHECK (
    (decision_type IN ('APPROVE','EDIT_APPROVE') AND resulting_state = 'RESOLVED') OR
    (decision_type = 'REJECT' AND resulting_state = 'REJECTED')
  ),
  -- Mandatory reason on edit and reject, enforced in storage as well as at the
  -- API (F0 FR-0.15), so an API bypass still cannot record a reasonless edit:
  CONSTRAINT decisions_reason_required_chk CHECK (
    decision_type = 'APPROVE' OR (reason IS NOT NULL AND char_length(btrim(reason)) >= 10)
  ),
  CONSTRAINT decisions_reason_len_chk CHECK (reason IS NULL OR char_length(reason) <= 2000),
  CONSTRAINT decisions_approve_needs_recommendation_chk CHECK (
    decision_type <> 'APPROVE' OR recommendation_id IS NOT NULL
  ),
  CONSTRAINT decisions_idempotency_key_len_chk CHECK (
    idempotency_key IS NULL OR char_length(idempotency_key) <= 128
  )
);
CREATE UNIQUE INDEX uq_decisions_exception ON decisions (exception_id);   -- one decision, ever
CREATE UNIQUE INDEX uq_decisions_idempotency
  ON decisions (exception_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE exceptions
  ADD CONSTRAINT exceptions_decision_fk FOREIGN KEY (decision_id) REFERENCES decisions (id);

CREATE TABLE decision_values (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id           uuid NOT NULL REFERENCES decisions (id),
  field_name            text NOT NULL,
  value                 text NOT NULL,
  origin                text NOT NULL,
  prior_value           text,
  prior_origin          text,
  changed_from_proposal boolean NOT NULL,
  CONSTRAINT dv_origin_chk CHECK (origin IN ('AI','HUMAN')),
  CONSTRAINT dv_prior_origin_chk CHECK (prior_origin IS NULL OR prior_origin IN ('AI','HUMAN')),
  CONSTRAINT dv_value_len_chk CHECK (char_length(value) BETWEEN 1 AND 2000),
  CONSTRAINT uq_decision_values_field UNIQUE (decision_id, field_name)
);
-- This is the ONLY table where origin may be either value, because it is the
-- only place a human edits a machine proposal. origin is computed server-side
-- by canonical comparison (§3.5.3) and is rejected as an unknown field if a
-- client sends it (F11 FR-11.8, FR-11.15). No NULL origin is representable.
```

**Why `decided_by` is the crux.** It is `NOT NULL REFERENCES specialists(id)` and is populated *only* from the authenticated request principal. `specialists` contains no AI row and no system row (§2.3), and no code path inserts one. Therefore an AI-authored or job-authored decision fails a foreign-key check before any trigger is consulted — and because the HITL trigger (§2.10) additionally requires a matching decision row for any exit from `OPEN`, an exception cannot be closed by anything other than a named human.

### 2.9 Audit store (append-only)

```sql
-- Migration 0007_audit.sql
CREATE TABLE audit_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             uuid NOT NULL REFERENCES cargo_entries (id),
  case_sequence       integer NOT NULL,
  global_sequence     bigint GENERATED ALWAYS AS IDENTITY,
  action_type         text NOT NULL,
  actor_type          text NOT NULL,
  actor_specialist_id uuid REFERENCES specialists (id),
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  exception_id        uuid REFERENCES exceptions (id),
  recommendation_id   uuid REFERENCES recommendations (id),
  decision_id         uuid REFERENCES decisions (id),
  before_state        text,
  after_state         text NOT NULL,
  reason              text,
  request_id          text,
  prev_entry_hash     bytea NOT NULL,
  entry_hash          bytea NOT NULL,
  CONSTRAINT ae_action_chk CHECK (action_type IN (
    'ENTRY_RECEIVED','VALIDATION_COMPLETED','EXCEPTION_OPENED',
    'RECOMMENDATION_GENERATED','RECOMMENDATION_UNAVAILABLE',
    'RECOMMENDATION_APPROVED','RECOMMENDATION_EDITED_AND_APPROVED',
    'RECOMMENDATION_REJECTED')),
  CONSTRAINT ae_actor_type_chk CHECK (actor_type IN ('SPECIALIST','AI','SYSTEM')),
  CONSTRAINT ae_actor_pairing_chk CHECK (
    (actor_type = 'SPECIALIST' AND actor_specialist_id IS NOT NULL) OR
    (actor_type = 'AI'         AND actor_specialist_id IS NULL)     OR
    (actor_type = 'SYSTEM'     AND actor_specialist_id IS NOT NULL)
  ),
  CONSTRAINT ae_case_sequence_chk CHECK (case_sequence >= 1),
  CONSTRAINT ae_hash_len_chk CHECK (
    octet_length(prev_entry_hash) = 32 AND octet_length(entry_hash) = 32
  ),
  CONSTRAINT ae_reason_only_on_decisions_chk CHECK (
    reason IS NULL OR action_type IN (
      'RECOMMENDATION_APPROVED','RECOMMENDATION_EDITED_AND_APPROVED','RECOMMENDATION_REJECTED')
  ),
  CONSTRAINT ae_reason_required_chk CHECK (
    action_type NOT IN ('RECOMMENDATION_EDITED_AND_APPROVED','RECOMMENDATION_REJECTED')
    OR (reason IS NOT NULL AND char_length(btrim(reason)) >= 10)
  ),
  CONSTRAINT uq_audit_entries_case_sequence UNIQUE (case_id, case_sequence),
  CONSTRAINT uq_audit_entries_entry_hash UNIQUE (entry_hash)
);
CREATE INDEX idx_audit_entries_case ON audit_entries (case_id, case_sequence);
CREATE INDEX idx_audit_entries_decision ON audit_entries (decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX idx_audit_entries_recommendation
  ON audit_entries (recommendation_id) WHERE recommendation_id IS NOT NULL;
-- Eight action values, matching the eight transitions of FRD 00-header §0.6
-- exactly; a schema test asserts the CHECK list equals the transition list
-- (FR-Y0.5). occurred_at is DEFAULT now() and is never client-supplied.
-- For RECOMMENDATION_UNAVAILABLE, after_state = 'UNAVAILABLE' and the
-- enumerated failure_reason is read through recommendation_id (clarification
-- C-1): no failure_reason column is added here.

CREATE TABLE audit_entry_values (
  audit_entry_id uuid NOT NULL REFERENCES audit_entries (id),
  field_name     text NOT NULL,
  before_value   text,
  before_origin  text,
  after_value    text,
  after_origin   text,
  changed        boolean NOT NULL,
  PRIMARY KEY (audit_entry_id, field_name),
  CONSTRAINT aev_before_origin_chk CHECK (before_origin IS NULL OR before_origin IN ('AI','HUMAN')),
  CONSTRAINT aev_after_origin_chk  CHECK (after_origin  IS NULL OR after_origin  IN ('AI','HUMAN')),
  CONSTRAINT aev_some_value_chk CHECK (before_value IS NOT NULL OR after_value IS NOT NULL),
  CONSTRAINT aev_origin_present_chk CHECK (
    (before_value IS NULL OR before_origin IS NOT NULL) AND
    (after_value  IS NULL OR after_origin  IS NOT NULL)
  )                                                                    -- F13 FR-13.9
);
-- aev_origin_present_chk is the per-value provenance guarantee in its hardest
-- form: a value without an origin cannot be stored (SM-3: zero unattributed
-- values). Values are recorded verbatim -- no normalisation, truncation,
-- rounding, or case folding (F13 FR-13.11).
```

#### 2.9.1 Database roles and privileges

```sql
-- Migration 0008_privileges.sql   (applied in the same migration set as the
-- tables it protects, so no deployment window exists in which the audit store
-- is mutable -- F0 FR-0.17, FR-Y0.2)

-- Roles. NONE of these is an application role: CargoExec has exactly one
-- application role, `cargo specialist`, which is not represented in the
-- database privilege system at all (F1 FR-1.1).
--   cargoexec_owner : owns the schema; used ONLY by the migration runner
--   cargoexec_app   : the request-path connection pool
--   cargoexec_ai    : the recommendation worker's connection pool  (A-1)

-- ---- Audit store: append-only for every role (F0 FR-0.4) -------------------
REVOKE ALL ON audit_entries, audit_entry_values FROM PUBLIC;
GRANT SELECT, INSERT ON audit_entries, audit_entry_values TO cargoexec_app;
GRANT SELECT, INSERT ON audit_entries, audit_entry_values TO cargoexec_ai;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries, audit_entry_values FROM cargoexec_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries, audit_entry_values FROM cargoexec_ai;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE UPDATE, DELETE, TRUNCATE ON TABLES FROM PUBLIC;

-- ---- Request-path role (FR-Y0.3) ------------------------------------------
GRANT SELECT, INSERT, UPDATE ON specialists, sessions, recommendations, exceptions
  TO cargoexec_app;
GRANT SELECT, INSERT ON cargo_entries, cargo_entry_field_origins, validation_results,
  validation_findings, recommendation_values, decisions, decision_values TO cargoexec_app;
GRANT USAGE ON SEQUENCE case_reference_seq, exception_receipt_position_seq TO cargoexec_app;
-- DELETE is granted on no table. TRUNCATE is granted on no table.
-- No UPDATE on cargo_entries (D-3): the entry of record is physically immutable.

-- ---- AI worker role: structurally incapable of resolving a case (A-1) ------
GRANT SELECT ON cargo_entries, validation_results, validation_findings, exceptions,
  recommendations, recommendation_values TO cargoexec_ai;
GRANT INSERT, UPDATE ON recommendations TO cargoexec_ai;
GRANT INSERT ON recommendation_values TO cargoexec_ai;
-- Deliberately NOT granted to cargoexec_ai, and revoked explicitly so the
-- intent is auditable in the schema rather than implied by omission:
REVOKE ALL ON decisions, decision_values FROM cargoexec_ai;
REVOKE UPDATE, DELETE, TRUNCATE ON exceptions FROM cargoexec_ai;
REVOKE ALL ON specialists, sessions FROM cargoexec_ai;
-- The worker therefore cannot write a resolution, cannot change an exception's
-- state, and cannot read a specialist identity -- three independent reasons,
-- on top of the FK and the HITL trigger, why "the AI decided it" is impossible.

-- ---- No DDL for either runtime role ---------------------------------------
REVOKE CREATE ON SCHEMA public FROM cargoexec_app, cargoexec_ai, PUBLIC;
```

#### 2.9.2 Append-only enforcement — mutation trigger (F0 FR-0.5)

Privilege revocation does not bind the table owner or a superuser. The trigger does, unconditionally:

```sql
CREATE OR REPLACE FUNCTION audit_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_IMMUTABLE: % on % is not permitted; the audit store is append-only',
    TG_OP, TG_TABLE_NAME USING ERRCODE = 'P0001';
END $$;

CREATE TRIGGER trg_audit_entries_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_entries
  FOR EACH STATEMENT EXECUTE FUNCTION audit_reject_mutation();
CREATE TRIGGER trg_audit_entries_immutable_row
  BEFORE UPDATE OR DELETE ON audit_entries
  FOR EACH ROW EXECUTE FUNCTION audit_reject_mutation();
CREATE TRIGGER trg_audit_entry_values_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_entry_values
  FOR EACH STATEMENT EXECUTE FUNCTION audit_reject_mutation();
CREATE TRIGGER trg_audit_entry_values_immutable_row
  BEFORE UPDATE OR DELETE ON audit_entry_values
  FOR EACH ROW EXECUTE FUNCTION audit_reject_mutation();
```

Consequences worth stating explicitly, because they shape the application code: `INSERT ... ON CONFLICT DO UPDATE` against an audit table fails; a "fix a typo in history" migration fails; `DELETE FROM audit_entries WHERE …` fails as `cargoexec_owner`; and `TRUNCATE` fails even in a test teardown — test databases are dropped and recreated rather than truncated (§8.2).

### 2.10 Hash chain, HITL, and audit-coupling triggers

```sql
-- Migration 0009_invariant_triggers.sql

-- ---- 1. Hash chain linkage (F0 FR-0.7, F13 FR-13.6) -----------------------
CREATE OR REPLACE FUNCTION audit_check_chain() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE expected bytea;
BEGIN
  IF NEW.case_sequence = 1 THEN
    expected := decode(repeat('00', 32), 'hex');
  ELSE
    SELECT entry_hash INTO expected FROM audit_entries
     WHERE case_id = NEW.case_id AND case_sequence = NEW.case_sequence - 1;
  END IF;
  IF expected IS NULL OR expected <> NEW.prev_entry_hash THEN
    RAISE EXCEPTION 'AUDIT_CHAIN_BROKEN: prev_entry_hash mismatch at case % sequence %',
      NEW.case_id, NEW.case_sequence USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER trg_audit_chain
  AFTER INSERT ON audit_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION audit_check_chain();

-- ---- 2. Human-in-the-loop (F0 FR-0.9, NFR-5) ------------------------------
CREATE OR REPLACE FUNCTION exceptions_require_human_decision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state <> 'OPEN' THEN
    PERFORM 1 FROM decisions d
      JOIN specialists s ON s.id = d.decided_by
     WHERE d.exception_id = NEW.id
       AND d.id = NEW.decision_id
       AND d.resulting_state = NEW.state;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'HITL_VIOLATION: exception % cannot leave OPEN without a matching human decision',
        NEW.id USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER trg_exceptions_hitl
  AFTER INSERT OR UPDATE ON exceptions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION exceptions_require_human_decision();

-- ---- 3. Audit coupling: exactly one entry per state change (FR-0.10) ------
CREATE OR REPLACE FUNCTION require_audit_entry(
  p_case_id uuid, p_actions text[], p_count integer, p_context text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM audit_entries
   WHERE case_id = p_case_id AND action_type = ANY (p_actions);
  IF n <> p_count THEN
    RAISE EXCEPTION 'AUDIT_COUPLING_VIOLATION: % expected % audit entr(y/ies), found %',
      p_context, p_count, n USING ERRCODE = 'P0001';
  END IF;
END $$;

-- (a) entry received
CREATE OR REPLACE FUNCTION entries_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM require_audit_entry(NEW.id, ARRAY['ENTRY_RECEIVED'], 1, 'cargo_entries insert');
      RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER trg_entries_audit AFTER INSERT ON cargo_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION entries_require_audit();

-- (b) validation completed
CREATE OR REPLACE FUNCTION validation_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM require_audit_entry(NEW.entry_id, ARRAY['VALIDATION_COMPLETED'], 1, 'validation_results insert');
      RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER trg_validation_audit AFTER INSERT ON validation_results
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validation_require_audit();

-- (c) exception opened
CREATE OR REPLACE FUNCTION exceptions_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM require_audit_entry(NEW.entry_id, ARRAY['EXCEPTION_OPENED'], 1, 'exceptions insert');
      RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER trg_exceptions_audit AFTER INSERT ON exceptions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION exceptions_require_audit();

-- (d) decision recorded -- exactly one entry referencing this decision
CREATE OR REPLACE FUNCTION decisions_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM audit_entries WHERE decision_id = NEW.id;
  IF n <> 1 THEN
    RAISE EXCEPTION 'AUDIT_COUPLING_VIOLATION: decision % has % audit entries, expected 1',
      NEW.id, n USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_decisions_audit AFTER INSERT ON decisions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION decisions_require_audit();

-- (e) recommendation terminal status -- exactly one matching entry
CREATE OR REPLACE FUNCTION recommendations_require_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; expected text;
BEGIN
  IF NEW.status = 'PENDING' THEN RETURN NULL; END IF;
  expected := CASE NEW.status WHEN 'AVAILABLE' THEN 'RECOMMENDATION_GENERATED'
                              ELSE 'RECOMMENDATION_UNAVAILABLE' END;
  SELECT count(*) INTO n FROM audit_entries
   WHERE recommendation_id = NEW.id AND action_type = expected;
  IF n <> 1 THEN
    RAISE EXCEPTION 'AUDIT_COUPLING_VIOLATION: recommendation % status % has % % entries, expected 1',
      NEW.id, NEW.status, n, expected USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_recommendations_audit AFTER INSERT OR UPDATE ON recommendations
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION recommendations_require_audit();
```

**Why deferred constraint triggers.** `DEFERRABLE INITIALLY DEFERRED` lets the receipt transaction insert the entry *before* its audit entry (the audit row has a foreign key to the entry, so the order is forced) while still refusing to commit the combination if the audit entry never arrives. The invariant is checked at `COMMIT`, which is the only moment at which it is meaningful. A service that "forgets" to audit does not produce an unaudited change — it produces a failed transaction and a `500 RECEIPT_FAILED`/`DECISION_FAILED` telling the specialist nothing was saved.

### 2.11 Chain verification (read-only)

```sql
CREATE OR REPLACE FUNCTION verify_audit_chain(p_case_id uuid)
RETURNS TABLE (chain_verified boolean, first_divergence_sequence integer, entry_count integer)
LANGUAGE plpgsql STABLE AS $$
DECLARE r record; expected bytea := decode(repeat('00', 32), 'hex'); n integer := 0;
BEGIN
  FOR r IN SELECT case_sequence, prev_entry_hash, entry_hash FROM audit_entries
            WHERE case_id = p_case_id ORDER BY case_sequence LOOP
    n := n + 1;
    IF r.case_sequence <> n OR r.prev_entry_hash <> expected THEN
      RETURN QUERY SELECT false, r.case_sequence, n; RETURN;
    END IF;
    expected := r.entry_hash;
  END LOOP;
  RETURN QUERY SELECT true, NULL::integer, n;
END $$;
-- STABLE and read-only by construction: it reports divergence and never
-- repairs, rewrites, or annotates the chain (F0 FR-0.8). The UI surfaces the
-- result and offers no repair action (F14).
```

### 2.12 Canonical serialisation, hashing, and sequencing

These three algorithms are shared by the audit writer and the verifier and must be implemented once, in `db/canonical.ts`.

**Canonical JSON** (used for hashing and for value comparison):
- object keys sorted lexicographically by UTF-16 code unit; no insignificant whitespace
- `timestamptz` as RFC 3339 UTC with microsecond precision (`2026-09-11T14:32:07.512000Z`)
- SQL `NULL` as JSON `null`
- decimals as unquoted fixed-scale numbers at the column's scale (`quantity` → 3 dp, `declared_value_usd` → 2 dp)
- strings verbatim, NFC-unnormalised — the record shows exactly what was typed

**Entry hash**:

```
entry_hash = SHA-256(
    canonical_json({
      case_id, case_sequence, action_type, actor_type, actor_specialist_id,
      occurred_at, exception_id, recommendation_id, decision_id,
      before_state, after_state, reason, request_id,
      values: [ {field_name, before_value, before_origin,
                 after_value, after_origin, changed} ]   -- sorted by field_name
    })
 ‖ prev_entry_hash )                                      -- ‖ = byte concatenation
```

`prev_entry_hash` is 32 zero bytes at `case_sequence = 1`, otherwise the previous entry's `entry_hash` for the same case. Because `occurred_at` is the database's `now()` and is included, and because the value rows are included in sorted order, any excision, substitution, or reordering within a case breaks verification (R-4).

**Sequence assignment.** The caller holds the case-anchor lock (`SELECT id FROM cargo_entries WHERE id = $1 FOR UPDATE`) before calling `append`. The writer computes `case_sequence = coalesce(max(case_sequence), 0) + 1` for that case inside the lock, so concurrent writers to one case serialise; `UNIQUE (case_id, case_sequence)` is the backstop and surfaces as the internal code `AUDIT_SEQUENCE_CONFLICT`. `global_sequence` is an identity column providing a total order across cases for test tiebreaking.

### 2.13 Migrations

| Rule | Detail |
|---|---|
| **Forward-only** | Numbered files `0001_…sql` … `0010_…sql`, each applied in a single transaction, tracked in a `schema_migrations` table owned by `cargoexec_owner`. No down-migration path exists in v1 (FR-Y0.1). |
| **Applied as the owner** | The migration runner connects as `cargoexec_owner`; `cargoexec_app` and `cargoexec_ai` hold no DDL privilege and no `CREATE` on the schema. |
| **Protection lands with the table** | Every table is created in the same migration set as its constraints, indexes, grants, revocations, and triggers, so there is no deployment window in which the audit store is mutable or an invariant is unenforced (FR-Y0.2). |
| **No data** | Migrations create schema objects only. No migration inserts a cargo entry, validation result, exception, recommendation, decision, or audit entry, and none inserts a domain code list — those are compiled-in frozen constants of the rule set (F4 FR-4.1, PRD §10 #7). A test parses every migration file and fails on any `INSERT` into a domain table. |
| **The one operational insert** | The first specialist account is created by `create-specialist --email --display-name` (password entered interactively, hashed with Argon2id), run outside migrations (F1 FR-1.13). There is no self-registration, password-reset, invite, or user-administration surface. |

**Migration order** (also the dependency order of the schema):

```
0001_identity.sql            specialists, sessions, pgcrypto
0002_entries.sql             case_reference_seq, cargo_entries, cargo_entry_field_origins
0003_validation.sql          validation_results, validation_findings
0004_exceptions.sql          exception_receipt_position_seq, exceptions
0005_recommendations.sql     recommendations, recommendation_values
0006_decisions.sql           decisions, decision_values, exceptions.decision_id FK
0007_audit.sql               audit_entries, audit_entry_values
0008_privileges.sql          roles' grants + audit revocations + default privileges
0009_invariant_triggers.sql  chain, HITL, five coupling triggers, mutation triggers
0010_verify_chain_fn.sql     verify_audit_chain()
```

### 2.14 Schema-level scope assertions

A schema test (`test/architecture/schema.spec.ts`) asserts all of the following against a freshly migrated database, so scope discipline is verified rather than asserted (FR-Y0.5, SM-14):

1. No table has a column named `assigned_to`, `assignee_id`, `claimed_by`, `priority`, `severity`, `severity_rank`, `risk_score`, `age_days`, `due_at`, `sla_due_at`, `sla_status`, `role`, `is_supervisor`, `permission`, `permissions`, `scope`, `tenant_id`, `exported_at`, `export_format`, `source_system`, `ingestion_batch_id`, `is_seed`, `hts_code`, `tariff_rate`, or `duty_amount`.
2. Exactly thirteen application tables exist (plus `schema_migrations`).
3. `cargoexec_app` has no `UPDATE`, `DELETE`, or `TRUNCATE` on `audit_entries` or `audit_entry_values` (read from `information_schema.table_privileges`).
4. `cargoexec_app` has no `UPDATE` on `cargo_entries` (D-3).
5. `cargoexec_ai` has no privilege of any kind on `decisions` or `decision_values`, and no `UPDATE` on `exceptions` (A-1).
6. `DELETE` and `TRUNCATE` are granted to no role on any table.
7. The `ae_action_chk` value list is exactly the eight transitions of FRD `00-header §0.6`.
8. `UPDATE audit_entries` and `DELETE FROM audit_entry_values` fail as `cargoexec_app`, `cargoexec_ai`, **and** `cargoexec_owner`.
9. No table, view, materialised view, or function name matches `/export|report|dashboard|metric|seed|fixture|ingest|assign|priorit/i`.

---
## 3. API Design

### 3.1 Endpoint inventory — exactly ten, no query parameters

The inventory below is the FRD `Y1-api` list carried forward unchanged (clarification **C-4**: ten method/path pairs). The router registers routes from a single exported array, and an architecture test asserts that array equals this table — adding an endpoint requires editing both the test and this document, which is the intended friction.

| # | Method | Path | Feature | Auth | CSRF | Body | Query params |
|---|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/session` | F1 | none | no | yes | none |
| 2 | `GET` | `/api/session` | F1 | session | no | no | none |
| 3 | `DELETE` | `/api/session` | F1 | session | **yes** | no | none |
| 4 | `POST` | `/api/entries` | F3 | session | **yes** | yes | none |
| 5 | `GET` | `/api/entries/{entryId}` | F3 | session | no | no | none |
| 6 | `GET` | `/api/exceptions` | F7 | session | no | no | **none — rejects any** |
| 7 | `GET` | `/api/exceptions/{idOrReference}` | F7 | session | no | no | none |
| 8 | `GET` | `/api/exceptions/{exceptionId}/recommendation` | F9 | session | no | no | none |
| 9 | `POST` | `/api/exceptions/{exceptionId}/decision` | F11 | session | **yes** | yes | none |
| 10 | `GET` | `/api/exceptions/{exceptionId}/audit` | F13 | session | no | no | none |

**Anything not on this list does not exist**: no export, import, batch, admin, search, metrics, count, user-management, role-management, regenerate, apply, reopen, amend, undo, entry-mutation, entry-listing, or audit-mutation endpoint. Any other method on a listed path returns `405 METHOD_NOT_ALLOWED`. The whole API accepts **zero** query parameters (FR-Y1.2); `GET /api/exceptions` rejects any query string at all with `400 UNSUPPORTED_QUERY_PARAMETER`, which is the endpoint that would otherwise grow filtering, sorting, assignment, and pagination.

### 3.2 Conventions

| Concern | Rule |
|---|---|
| Transport | JSON over HTTPS under `/api`; `application/json; charset=utf-8` both ways. Any other content type on a body-bearing endpoint ⇒ `415 UNSUPPORTED_MEDIA_TYPE` (this is also what rejects a multipart or CSV upload attempt — PRD §10 #6). |
| Unknown properties | Rejected, never ignored: every body is parsed by a `zod` schema with `.strict()`, so an unknown property ⇒ `422 REQUEST_MALFORMED` with `details[]` naming it. This is the mechanism that blocks a client-supplied `origin`, `decided_by`, or `applied`. |
| Error envelope | `{"error":{"code","message","details"?,"request_id"}}` on every non-2xx. `details` is omitted when empty. |
| Identifiers | `{exceptionId}` / `{idOrReference}` accept a uuid **or** a case reference `CE-YYYY-NNNNNN`; anything else ⇒ `400 INVALID_IDENTIFIER`. |
| Timestamps | RFC 3339 UTC with offset, e.g. `2026-09-11T14:32:07.512Z`. Server-authoritative; never accepted from a client. |
| Caching | `Cache-Control: no-store` on every API response. |
| Correlation | `X-Request-Id` on every response; the same value appears in the error envelope, in server logs, and on any audit entry written during the request (FR-Y1.4). |
| Body size | 64 KB limit; larger ⇒ `413 REQUEST_TOO_LARGE`. The cap bounds one typed entry; it does not enable batching. |
| Rate limiting | `POST /api/session` only (5 failures / 15 min per normalised email). No other endpoint is throttled (FR-Y1.5). |
| SQL | Every statement is parameterised; no endpoint interpolates client input into SQL (FR-Y1.6). |

### 3.3 Session endpoints (F1)

**`POST /api/session`** — sign in. No auth, no CSRF.

```
Request   { email, password }
201       { specialist: {id, email, display_name},
            csrf_token, session: {absolute_expires_at} }
          Set-Cookie: cargoexec_sid=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/
Errors    401 AUTH_FAILED        (unknown email and wrong password are
                                  byte-identical responses)
          403 ACCOUNT_INACTIVE
          422 REQUEST_MALFORMED  (request shape, not credentials)
          429 TOO_MANY_ATTEMPTS  (+ Retry-After)
```

Argon2id verification runs even when no specialist row was found, against a dummy hash, so response timing does not disclose account existence. A present-but-short password still returns the generic `401`, never a length error.

**`GET /api/session`** — current principal and CSRF token; `200` with the same body shape, `401 UNAUTHENTICATED` if absent/expired. The SPA calls this on load to choose between the sign-in screen and the application shell.

**`DELETE /api/session`** — sign out. Session + CSRF. `204`, cookie cleared, `revoked_at`/`SIGNED_OUT` recorded. Revokes only the session that made the request; there is no session-management screen (an administrative surface).

Sign-in, sign-out, and expiry write **no** audit entry — `audit_entries.case_id` is `NOT NULL` and no case state changes at authentication. Session history lives on `sessions` (F1 FR-1.12, F13 FR-13.17). This is a boundary, not a gap.

### 3.4 Entry endpoints (F3, F4)

**`POST /api/entries`** — receive one manually authored entry. Session + CSRF.

Every one of the fourteen fields is optional at the transport layer. This is central, not lax: an incomplete entry must be *receivable*, because an incomplete entry is exactly what the product exists to process. Completeness is judged by F4, whose verdict produces findings and an exception — never a transport error.

```
Request   { entry_number?, importer_of_record_id?, port_of_entry_code?,
            mode_of_transport?, carrier_code?, conveyance_name?,
            bill_of_lading_number?, air_waybill_number?,
            country_of_origin_code?, goods_description?,
            quantity?, quantity_uom?, declared_value_usd?, arrival_date? }

201       { entry: { id, case_reference, received_at,
                     created_by: {id, display_name},
                     values: {…14 fields, null where absent…},
                     field_origins: {<provided field>: "HUMAN", …} },
            case_reference,
            receipt_outcome: "EXCEPTION_OPENED" | "VALIDATED_CLEAN",
            validation: { outcome, rule_set_version, evaluated_at,
                          findings: [{rule_id, field_name, failure_code, message}] },
            exception: { id, state, receipt_position } | null,
            next: { case_url, queue_url } }

Errors    401 · 403 CSRF_INVALID · 409 ENTRY_NUMBER_DUPLICATE (details carry the
          existing case_reference) · 413 · 415 · 422 REQUEST_MALFORMED ·
          500 RECEIPT_FAILED ("Nothing was saved.")
```

A required-information failure is **not** an error: it is a `201` with `receipt_outcome: "EXCEPTION_OPENED"` and findings (F3 FR-3.10, FR-Y2.1). No `RIV-*` code ever appears as an HTTP error code.

Structural vs. content validation, precisely:

| Input | Outcome |
|---|---|
| Unknown property, array body, wrong JSON type, over-length string, over-scale decimal | `422 REQUEST_MALFORMED` — nothing persisted, no audit entry |
| Empty string / whitespace-only / absent | Treated identically as "not provided": stored `NULL`, **no** `cargo_entry_field_origins` row (F3 FR-3.8) |
| Syntactically invalid `arrival_date` (within length) | Stored `NULL`; reported by F4 as `RIV-131` — a mistyped date is a required-information finding, not a client error |
| `quantity = "0"`, negative, or implausible | Parses structurally; judged by `RIV-101`/`RIV-121` (clarification **C-3**) |
| Duplicate `entry_number` | `409 ENTRY_NUMBER_DUPLICATE`, nothing persisted — deliberately not a validation rule, because uniqueness depends on database state and would break determinism (F4 FR-4.4) |

**`GET /api/entries/{entryId}`** — `200` with the stored entry values, `case_reference`, `received_at`, submitting specialist, per-field `HUMAN` origins, the validation result with findings, the `receipt_outcome`, and the exception summary or `null`. The entry's "current state" is **derived** (`receipt_outcome` + exception state); there is no mutable status column to drift. Errors: `400 INVALID_IDENTIFIER` · `401` · `404 ENTRY_NOT_FOUND`.

There is no `GET /api/entries` collection endpoint and no `PUT`/`PATCH`/`DELETE` on an entry (F3 FR-3.6, FR-3.12).

### 3.5 Queue, case, recommendation, decision, audit

**`GET /api/exceptions`** — the queue. Zero query parameters.

```
200       { exceptions: [ { id, case_reference, receipt_position, received_at,
                            entry_number, finding_count, failure_summary } ],
            returned_count, truncated }
Errors    400 UNSUPPORTED_QUERY_PARAMETER · 401 · 405
```

Ordering is `receipt_position ASC`, always, served by the partial index. `returned_count` and `truncated` describe the response, not the workload: there is no total count, no state breakdown, no age, no priority, and no assignee in any row (FR-Y1.3). `truncated` exists only as a hard safety bound on response size and is `false` in all realistic demonstration volumes.

**`GET /api/exceptions/{idOrReference}`** — full case detail in one call: exception, entry with per-field origins, validation result with findings, recommendation with proposed values and its traceability metadata, decision with resolution values (closed cases), and `permitted_decisions`. `permitted_decisions` is computed server-side:

| Exception state | Recommendation status | `permitted_decisions` |
|---|---|---|
| `OPEN` | `AVAILABLE` | `["APPROVE","EDIT_APPROVE","REJECT"]` |
| `OPEN` | `PENDING` or `UNAVAILABLE` | `["EDIT_APPROVE","REJECT"]` — nothing to approve, but the case stays decidable (SM-13) |
| `RESOLVED` / `REJECTED` | any | `[]` |

The UI renders its controls from this array rather than deriving permission locally, so the server remains the single authority on what may be decided.

**`GET /api/exceptions/{exceptionId}/recommendation`** — polled by the case screen while `PENDING` (every 3 s, at most 60 s). Three response shapes, discriminated on `status`: `AVAILABLE` (action, rationale, proposed values, `model_id`, `prompt_version`, `generated_at`), `UNAVAILABLE` (`failure_reason`, `failed_at`), `PENDING` (`requested_at` only). There is no `POST`, `PUT`, regenerate, or apply operation on this resource — deliberately, because a silent regeneration would change what the case showed at decision time (F9 FR-9.14).

**`POST /api/exceptions/{exceptionId}/decision`** — the only mutating case endpoint, and the only writer of a resolution. Session + CSRF, optional `Idempotency-Key`.

```
APPROVE        { decision_type:"APPROVE", recommendation_id }
               no resolution_values (⇒ 422 RESOLUTION_VALUES_NOT_ALLOWED)
               reason optional
EDIT_APPROVE   { decision_type:"EDIT_APPROVE", recommendation_id?, reason,
                 resolution_values:[{field_name, value}, …] }
               reason ≥ 10 chars after trim; complete field set required
REJECT         { decision_type:"REJECT", reason }
               no resolution_values; reason ≥ 10 chars

201            { decision: { id, decision_type, decided_at,
                             decided_by:{id, display_name}, reason,
                             resolution_values:[{field_name, value, origin,
                               prior_value, prior_origin, changed_from_proposal}] },
                 exception: { id, state, closed_at },
                 audit_entry_id, idempotent_replay }
```

#### 3.5.1 Decision rules the endpoint enforces

| Rule | Behaviour |
|---|---|
| Explicit decision required | `decision_type` is required with no default, no inference, no "accept all", no empty-body semantics (F11 FR-11.2) |
| One decision per case, ever | `FOR UPDATE` lock + `UNIQUE (exception_id)`; second attempt ⇒ `409 EXCEPTION_ALREADY_DECIDED` naming the existing type, deciding specialist, and timestamp. No reopen, amend, undo, correct, or supersede operation exists (F11 FR-11.10) |
| Approve needs an available proposal | `APPROVE` on `PENDING`/`UNAVAILABLE` ⇒ `409 RECOMMENDATION_NOT_AVAILABLE` — an absent recommendation can never be "approved" |
| Stale-tab detection | Supplied `recommendation_id` must match the case's current one ⇒ else `409 RECOMMENDATION_MISMATCH` |
| Complete value set | For `EDIT_APPROVE` with a recommendation, `resolution_values` must be exactly the proposal's field set ⇒ else `422 RESOLUTION_VALUES_INCOMPLETE` (naming missing and unexpected fields). Completeness removes any ambiguity about whether an omitted field was unchanged or dropped, so provenance is never inferred (F11 FR-11.7) |
| Direct resolution | For `EDIT_APPROVE` with no available recommendation, at least one value, every `field_name` in the 14-field set, all origins `HUMAN` |
| Reason | Required and 10–2000 chars after trim for `EDIT_APPROVE`/`REJECT`; optional (stored if present) for `APPROVE`. Enforced independently at the API and by `decisions_reason_required_chk`, so an API bypass still cannot record a reasonless edit (R-8) |
| Actor | `decided_by` comes from the session principal only; a body naming an actor (`decided_by`, `actor`, `on_behalf_of`, `specialist_id`) is rejected as unknown. No impersonation or delegation mechanism exists — there is one role and no supervisor |
| No bulk | Exactly one decision for exactly one exception. No batch, multi-case, or "approve all" endpoint or parameter — bulk approval is precisely the rubber-stamping the human-in-the-loop requirement exists to prevent (F11 FR-11.20, R-1) |
| Untouched records | The handler never writes `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, or `validation_findings`. The entry of record and the exception's stated basis survive the decision unchanged (F11 FR-11.18, FR-11.19) |

#### 3.5.2 Idempotency

`Idempotency-Key` (≤ 128 chars) is persisted on `decisions.idempotency_key` with `UNIQUE (exception_id, idempotency_key)`. Replay with the same key and the same canonical body returns the original `201` with `idempotent_replay: true` and writes nothing — no second decision, no second audit entry. Same key with a different body ⇒ `409 IDEMPOTENCY_KEY_REUSED`. Requests without the header are processed normally, with the one-decision-per-case uniqueness as the backstop.

#### 3.5.3 Per-value provenance computation (normative, server-only)

For each supplied resolution value, the server compares the submitted value against the AI's proposed value for the same field using canonical comparison — trim leading/trailing whitespace, then byte-for-byte:

```
proposal exists and equal      → origin='AI',    changed_from_proposal=false
proposal exists and different  → origin='HUMAN', changed_from_proposal=true
no proposal for that field     → origin='HUMAN', changed_from_proposal=true
```

`prior_value` is the AI's proposed value where one exists, otherwise the entry's submitted value, otherwise `null`; `prior_origin` is `'AI'`, `'HUMAN'`, or `null` correspondingly. `origin` is **never** accepted from a client under any circumstance. `APPROVE` copies values from `recommendation_values` server-side and every resolution value retains `origin = 'AI'` — the human's contribution is the *decision*, recorded on `decisions.decided_by`, not an authorship claim over values they did not write. `REJECT` writes no `decision_values`; the audit entry records the declined proposals as `before_value` with `after_value = NULL`.

#### 3.5.4 Audit read

**`GET /api/exceptions/{exceptionId}/audit`** — one case's trail in ascending `case_sequence`, with per-entry value rows, actor display names, and the chain verification result:

```
200       { case_reference, entry_count, chain_verified,
            first_divergence_sequence,
            entries: [ { id, case_sequence, action_type, actor_type,
                         actor: {id, display_name} | null, model_id | null,
                         occurred_at, before_state, after_state, reason,
                         values: [ { field_name, before_value, before_origin,
                                     after_value, after_origin, changed } ] } ] }
```

Read-only, single-case, JSON only. There is no export representation, no `Accept` variant producing a file, no `?format=`, no multi-case query, and no download route (F13 FR-13.18, PRD §10 #5). For an `AVAILABLE`/`UNAVAILABLE` recommendation entry, `model_id` is joined from `recommendations`; the enumerated `failure_reason` is likewise joined for display (clarification **C-1**).

### 3.6 Audit action → payload mapping

The eight actions are the complete transition set. This is the writer's contract:

| Action | Actor | `before_state` → `after_state` | Value rows |
|---|---|---|---|
| `ENTRY_RECEIVED` | `SPECIALIST` | `null` → `RECEIVED` | one per provided field; `after_value` = submitted value, `after_origin='HUMAN'` |
| `VALIDATION_COMPLETED` | `SYSTEM` (records the requesting specialist) | `RECEIVED` → `VALIDATED_CLEAN` \| `EXCEPTION_OPENED` | one per finding; `field_name` = finding's primary field, `after_value` = failure code + message |
| `EXCEPTION_OPENED` | `SYSTEM` | `null` → `OPEN` | one per finding (the stated basis) |
| `RECOMMENDATION_GENERATED` | `AI` (`actor_specialist_id NULL`) | `PENDING` → `AVAILABLE` | one per proposed value; `before_value` = entry's value (`before_origin='HUMAN'` or `null`), `after_value` = proposal, `after_origin='AI'` |
| `RECOMMENDATION_UNAVAILABLE` | `AI` | `PENDING` → `UNAVAILABLE` | none (C-1) |
| `RECOMMENDATION_APPROVED` | `SPECIALIST` | `OPEN` → `RESOLVED` | one per resolution value; before = proposal (`AI`), after = recorded value (`AI`) |
| `RECOMMENDATION_EDITED_AND_APPROVED` | `SPECIALIST` | `OPEN` → `RESOLVED` | one per resolution value; `after_origin` = `HUMAN` for changed, `AI` for unchanged; `changed` set accordingly; `reason` verbatim on the entry |
| `RECOMMENDATION_REJECTED` | `SPECIALIST` | `OPEN` → `REJECTED` | one per declined proposal; before = proposal (`AI`), `after_value = NULL`; `reason` verbatim on the entry |

A ninth action may not be added without a corresponding transition, and a transition may not exist without an action. A test enumerates the eight and asserts 1:1 coverage (SM-6).

### 3.7 Error mapping

`errorMapper.ts` is the single translation point. Domain errors and PostgreSQL `SQLSTATE`s map to `Y2` codes; internal database invariant codes never reach a client verbatim.

| Source | Surfaces as |
|---|---|
| zod parse failure | `422 REQUEST_MALFORMED` + `details[]` (field, field-level code, message) |
| `23505` on `cargo_entries.entry_number` | `409 ENTRY_NUMBER_DUPLICATE` (with the existing `case_reference`) |
| `23505` on `decisions.exception_id` | `409 EXCEPTION_ALREADY_DECIDED` |
| `23505` on `decisions (exception_id, idempotency_key)` | `409 IDEMPOTENCY_KEY_REUSED` |
| `23514` `decisions_reason_required_chk` | `422 REASON_REQUIRED` (defence in depth; the API check fires first) |
| `23503` on `exceptions_basis_fk` | internal `EXCEPTION_WITHOUT_BASIS` → `500 RECEIPT_FAILED` |
| `P0001 HITL_VIOLATION` | internal → `500 DECISION_FAILED` (and a `logger.error` with the `request_id`) |
| `P0001 AUDIT_COUPLING_VIOLATION` / `AUDIT_CHAIN_BROKEN` / `AUDIT_IMMUTABLE` | internal → `500 RECEIPT_FAILED` \| `DECISION_FAILED` |
| `42501` (privilege denied on an audit table) | internal `AUDIT_IMMUTABLE` → `500` |
| `AUDIT_WRITE_INVALID` / `AUDIT_WRITE_FORBIDDEN_CONTENT` | internal → `500` |
| Session middleware, no principal | `401 UNAUTHENTICATED` (API) or `302 /sign-in?next=` (HTML) |
| CSRF mismatch | `403 CSRF_INVALID` |
| Unknown route under `/api` | `404` with envelope; unknown method on a known path ⇒ `405 METHOD_NOT_ALLOWED` |
| Any query string on `GET /api/exceptions` | `400 UNSUPPORTED_QUERY_PARAMETER` |

Principles the mapper enforces: a `4xx`/`5xx` from a mutating endpoint means **nothing was written**, and the message says so where a specialist might otherwise retry blindly; error codes are stable identifiers that clients branch on (never message text); and no message discloses account existence, stack traces, SQL, provider error text, configuration, or internal identifiers beyond the case reference (FR-Y2.2–FR-Y2.7).

---
### 3.8 The shared contract package

`contract/` is a dependency-free TypeScript package imported by both `server` and `web`. It is the single definition of every wire type, every error code, and the entry field set. A type-duplication review rule (R-L9) forbids the SPA from re-declaring any shape defined here.

```typescript
// contract/src/fields.ts — the ONE definition of the entry field set.
export const ENTRY_FIELDS = [
  'entry_number', 'importer_of_record_id', 'port_of_entry_code',
  'mode_of_transport', 'carrier_code', 'conveyance_name',
  'bill_of_lading_number', 'air_waybill_number', 'country_of_origin_code',
  'goods_description', 'quantity', 'quantity_uom',
  'declared_value_usd', 'arrival_date',
] as const;

export type EntryFieldName = (typeof ENTRY_FIELDS)[number];
// The server's zod schema, the DB CHECK list, the AI output schema, and the
// form's field list are all derived from this constant. There is no custom
// field, extension point, or dynamic field mechanism.
```

### 3.9 Core governance types

These four declarations carry the product's central guarantees into the type system.

```typescript
// contract/src/dto.ts

/** Per-value provenance. Required everywhere a value is carried. */
export type Origin = 'AI' | 'HUMAN';

/**
 * A value that knows where it came from. There is deliberately NO variant of
 * this type with an optional origin: an unattributed value is unrepresentable
 * in the contract, so it cannot be returned by the API or rendered by the UI.
 */
export interface Attributed<T = string | null> {
  readonly value: T;
  readonly origin: Origin;
}

/** Actor of an audited event. `AI` never carries a specialist identity. */
export type ActorType = 'SPECIALIST' | 'AI' | 'SYSTEM';

/** The eight audit actions — the complete transition set (00-header §0.6). */
export type AuditActionType =
  | 'ENTRY_RECEIVED'
  | 'VALIDATION_COMPLETED'
  | 'EXCEPTION_OPENED'
  | 'RECOMMENDATION_GENERATED'
  | 'RECOMMENDATION_UNAVAILABLE'
  | 'RECOMMENDATION_APPROVED'
  | 'RECOMMENDATION_EDITED_AND_APPROVED'
  | 'RECOMMENDATION_REJECTED';

export type ExceptionState   = 'OPEN' | 'RESOLVED' | 'REJECTED';
export type ReceiptOutcome   = 'VALIDATED_CLEAN' | 'EXCEPTION_OPENED';
export type RecommendationStatus = 'PENDING' | 'AVAILABLE' | 'UNAVAILABLE';
export type DecisionType     = 'APPROVE' | 'EDIT_APPROVE' | 'REJECT';
export type ValidationOutcome = 'PASS' | 'FAIL';

export type RecommendationFailureReason =
  | 'PROVIDER_TIMEOUT' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_AUTH_FAILED' | 'SCHEMA_INVALID' | 'CONTENT_FILTERED'
  | 'INTERNAL_ERROR';
```

### 3.10 Error envelope

```typescript
export interface ApiErrorDetail {
  readonly field?: string;      // dot path into the request body
  readonly code: string;        // field-level code, bound to a control by the UI
  readonly message: string;     // plain language, safe to display
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: ErrorCode;           // stable identifier; clients branch on this
    readonly message: string;           // never a stack trace, SQL, or provider text
    readonly details?: readonly ApiErrorDetail[];
    readonly request_id: string;
  };
}

// contract/src/errors.ts — the Y2 catalogue as a closed union.
export type ErrorCode =
  // session
  | 'AUTH_FAILED' | 'UNAUTHENTICATED' | 'ACCOUNT_INACTIVE' | 'CSRF_INVALID'
  | 'TOO_MANY_ATTEMPTS'
  // request shape
  | 'INVALID_IDENTIFIER' | 'UNSUPPORTED_QUERY_PARAMETER' | 'METHOD_NOT_ALLOWED'
  | 'REQUEST_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' | 'REQUEST_MALFORMED'
  // receipt
  | 'ENTRY_NOT_FOUND' | 'ENTRY_NUMBER_DUPLICATE' | 'RECEIPT_FAILED'
  // case
  | 'EXCEPTION_NOT_FOUND'
  // decision
  | 'EXCEPTION_ALREADY_DECIDED' | 'RECOMMENDATION_NOT_AVAILABLE'
  | 'RECOMMENDATION_MISMATCH' | 'IDEMPOTENCY_KEY_REUSED' | 'REASON_REQUIRED'
  | 'RESOLUTION_VALUES_NOT_ALLOWED' | 'RESOLUTION_VALUES_INCOMPLETE'
  | 'DECISION_FAILED';
// Internal database invariant codes (AUDIT_IMMUTABLE, HITL_VIOLATION,
// AUDIT_COUPLING_VIOLATION, AUDIT_CHAIN_BROKEN, EXCEPTION_WITHOUT_BASIS,
// AUDIT_SEQUENCE_CONFLICT, AUDIT_WRITE_INVALID, AUDIT_WRITE_FORBIDDEN_CONTENT,
// RULE_SET_INVALID, VALIDATION_ENGINE_FAILURE) are deliberately ABSENT from
// this union: they are logged, never returned (Y2 §7).
```

### 3.11 Session types

```typescript
export interface SpecialistDto {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  // No role, permissions, scope, or capability list: one role, binary auth.
}

export interface SessionRequest { readonly email: string; readonly password: string; }

export interface SessionDto {
  readonly specialist: SpecialistDto;
  readonly csrf_token: string;
  readonly session: { readonly absolute_expires_at: string };
}

/** Actor reference as rendered in a case or a trail. */
export interface ActorRef { readonly id: string; readonly display_name: string; }
```

### 3.12 Entry, validation, and receipt types

```typescript
/** The submitted values, exactly as stored (trimmed only). */
export type EntryValues = { readonly [K in EntryFieldName]: string | null };

/** Origin map: present only for fields the specialist actually provided. */
export type EntryFieldOrigins = { readonly [K in EntryFieldName]?: 'HUMAN' };

export interface EntryDto {
  readonly id: string;
  readonly case_reference: string;
  readonly received_at: string;
  readonly created_by: ActorRef;
  readonly values: EntryValues;
  readonly field_origins: EntryFieldOrigins;   // always 'HUMAN' by construction
}

export interface FindingDto {
  readonly rule_id: string;         // ^RIV-[0-9]{3}$
  readonly field_name: EntryFieldName;   // the rule's primary_field (C-2)
  readonly failure_code: string;
  readonly message: string;         // plain language, imperative, no rule ids
  // No severity, weight, score, or priority: findings are not graded.
}

export interface ValidationDto {
  readonly outcome: ValidationOutcome;
  readonly rule_set_version: string;      // e.g. "RIV-2026.09"
  readonly evaluated_at: string;
  readonly findings: readonly FindingDto[];   // ascending rule_id, always
}

export interface ExceptionRef {
  readonly id: string;
  readonly state: ExceptionState;
  readonly receipt_position: number;
}

export interface ReceiptResponse {
  readonly entry: EntryDto;
  readonly case_reference: string;
  readonly receipt_outcome: ReceiptOutcome;
  readonly validation: ValidationDto;
  readonly exception: ExceptionRef | null;
  readonly next: { readonly case_url: string | null; readonly queue_url: string };
}

export interface EntryDetailResponse {
  readonly entry: EntryDto;
  readonly receipt_outcome: ReceiptOutcome;
  readonly validation: ValidationDto;
  readonly exception: ExceptionRef | null;
}
```

### 3.13 Queue and case types

```typescript
export interface QueueRow {
  readonly id: string;
  readonly case_reference: string;
  readonly receipt_position: number;    // the ONLY ordering dimension
  readonly received_at: string;
  readonly entry_number: string | null;
  readonly finding_count: number;
  readonly failure_summary: string;
  // Absent by design: priority, assignee, age_days, sla_status, severity,
  // state (the queue contains only OPEN), and any progress or claim marker.
}

export interface QueueResponse {
  readonly exceptions: readonly QueueRow[];   // receipt_position ASC, always
  readonly returned_count: number;
  readonly truncated: boolean;
}
// The request type is `void`. There is no QueueQuery interface, because the
// endpoint accepts no query parameters -- the absence is structural (§10 #4).

export interface ProposedValueDto {
  readonly field_name: EntryFieldName;
  readonly proposed_value: string;
  readonly origin: 'AI';                       // literal type: never 'HUMAN'
  readonly addresses_rule_ids: readonly string[];   // non-empty
}

export type RecommendationDto =
  | { readonly id: string; readonly status: 'PENDING';
      readonly requested_at: string }
  | { readonly id: string; readonly status: 'AVAILABLE';
      readonly requested_at: string;
      readonly recommended_action: string;     // one plain-language sentence
      readonly rationale: string;              // plain-language explanation
      readonly proposed_values: readonly ProposedValueDto[];
      readonly model_id: string;               // traceability: which model
      readonly prompt_version: string;         // traceability: which prompt
      readonly generated_at: string }
  | { readonly id: string; readonly status: 'UNAVAILABLE';
      readonly requested_at: string;
      readonly failure_reason: RecommendationFailureReason;
      readonly failed_at: string };
// A discriminated union, so `recommended_action` is simply not accessible on a
// degraded case: the UI cannot render a proposal that does not exist, and
// "no recommendation available" is a type-level state, not a null check.

export interface ResolutionValueDto {
  readonly field_name: EntryFieldName;
  readonly value: string;
  readonly origin: Origin;                 // computed server-side, always
  readonly prior_value: string | null;
  readonly prior_origin: Origin | null;
  readonly changed_from_proposal: boolean;
}

export interface DecisionDto {
  readonly id: string;
  readonly decision_type: DecisionType;
  readonly decided_at: string;
  readonly decided_by: ActorRef;           // never null: a human, always
  readonly reason: string | null;          // non-null for EDIT_APPROVE/REJECT
  readonly resolution_values: readonly ResolutionValueDto[];  // [] for REJECT
}

export interface CaseDetailResponse {
  readonly exception: {
    readonly id: string;
    readonly case_reference: string;
    readonly state: ExceptionState;
    readonly receipt_position: number;
    readonly opened_at: string;
    readonly closed_at: string | null;
  };
  readonly entry: EntryDto;
  readonly validation: ValidationDto;
  readonly recommendation: RecommendationDto | null;
  readonly decision: DecisionDto | null;
  readonly permitted_decisions: readonly DecisionType[];  // server authority
}
```

### 3.14 Decision request types

```typescript
/**
 * A discriminated union, so the illegal combinations the API rejects are also
 * unconstructible on the client: APPROVE has no resolution_values field, and
 * EDIT_APPROVE/REJECT have a required reason.
 *
 * NOTE what is absent: no `origin`, no `decided_by`, no `actor`,
 * no `on_behalf_of`, no `applied`, no `auto`, no `force`, no `case_ids[]`.
 * The server rejects all of them as unknown properties (422 REQUEST_MALFORMED).
 */
export type DecisionRequest =
  | { readonly decision_type: 'APPROVE';
      readonly recommendation_id: string;
      readonly reason?: string }                 // optional, 10-2000 if present
  | { readonly decision_type: 'EDIT_APPROVE';
      readonly recommendation_id?: string;
      readonly reason: string;                   // required, >= 10 chars
      readonly resolution_values: readonly {
        readonly field_name: EntryFieldName;
        readonly value: string;
      }[] }                                      // NOTE: no origin property
  | { readonly decision_type: 'REJECT';
      readonly reason: string };                 // required, >= 10 chars

export interface DecisionResponse {
  readonly decision: DecisionDto;
  readonly exception: { readonly id: string; readonly state: ExceptionState;
                        readonly closed_at: string };
  readonly audit_entry_id: string;   // the entry this decision is coupled to
  readonly idempotent_replay: boolean;
}
```

### 3.15 Audit types

```typescript
export interface AuditValueDto {
  readonly field_name: string;
  readonly before_value: string | null;
  readonly before_origin: Origin | null;   // null only when there was no value
  readonly after_value: string | null;
  readonly after_origin: Origin | null;    // null only on a declined value
  readonly changed: boolean;
}

export interface AuditEntryDto {
  readonly id: string;
  readonly case_sequence: number;          // monotonic from 1
  readonly action_type: AuditActionType;
  readonly actor_type: ActorType;
  readonly actor: ActorRef | null;         // null exactly when actor_type='AI'
  readonly model_id: string | null;        // joined for AI actions
  readonly occurred_at: string;            // database now(), never client
  readonly before_state: string | null;
  readonly after_state: string;
  readonly reason: string | null;          // verbatim on edit/reject
  readonly values: readonly AuditValueDto[];
}

export interface AuditTrailResponse {
  readonly case_reference: string;
  readonly entry_count: number;
  readonly chain_verified: boolean;
  readonly first_divergence_sequence: number | null;
  readonly entries: readonly AuditEntryDto[];   // ascending case_sequence
}
// No export, download, format, or multi-case shape exists in this contract.
```

### 3.16 Internal server types (not wire types)

```typescript
// server/src/services/audit/writer.ts
export interface AuditAppendInput {
  readonly case_id: string;
  readonly action_type: AuditActionType;
  readonly actor:
    | { readonly type: 'SPECIALIST'; readonly specialist_id: string }
    | { readonly type: 'AI' }                              // no identity
    | { readonly type: 'SYSTEM'; readonly on_behalf_of_specialist_id: string };
  readonly exception_id?: string;
  readonly recommendation_id?: string;
  readonly decision_id?: string;
  readonly before_state: string | null;
  readonly after_state: string;
  readonly reason?: string;
  readonly request_id?: string;
  readonly values: readonly {
    readonly field_name: string;
    readonly before_value: string | null;
    readonly before_origin: Origin | null;
    readonly after_value: string | null;
    readonly after_origin: Origin | null;
  }[];
}

/**
 * The ONLY audit operation in the system. `tx` is required and the writer
 * cannot open its own transaction, so the state change and its entry commit
 * together or neither commits. `occurred_at` is not a parameter: the database
 * assigns it. There is no update, delete, upsert, redact, correct, anonymise,
 * backfill, or truncate counterpart -- anywhere.
 */
export interface AuditWriter {
  append(tx: Tx, input: AuditAppendInput): Promise<{ audit_entry_id: string;
                                                     case_sequence: number }>;
}

// server/src/ai/provider.ts
export interface RecommendationRequest {
  readonly entry_values: EntryValues;       // the 14 fields as submitted
  readonly findings: readonly FindingDto[]; // ordered, rule_id ascending
  readonly rule_set_version: string;
  // Absent by construction: specialist id, display name, email, session token,
  // case reference, audit content. The model sees the cargo entry and why it
  // failed validation -- nothing about who typed it (FR-9.16, FR-Y3.2).
}

export interface RecommendationDraft {
  readonly recommended_action: string;      // 1-500 chars after trim
  readonly rationale: string;               // 1-2000 chars after trim
  readonly proposed_values: readonly {
    readonly field_name: EntryFieldName;    // members of the 14-field set only
    readonly proposed_value: string;
    readonly addresses_rule_ids: readonly string[];  // findings of THIS case
  }[];
}

export type ProviderResult =
  | { readonly ok: true;  readonly draft: RecommendationDraft;
      readonly model_id: string; readonly prompt_version: string;
      readonly latency_ms: number }
  | { readonly ok: false; readonly failure_reason: RecommendationFailureReason;
      readonly model_id: string; readonly prompt_version: string };

export interface RecommendationProvider {
  generate(req: RecommendationRequest): Promise<ProviderResult>;
}
// The provider returns a DRAFT. There is no method on this interface that
// writes anything, references a decision, or takes an exception state --
// the type surface itself cannot express "apply this".
```

### 3.17 UI route contract

| Route | Screen | Owner | Auth | Notes |
|---|---|---|---|---|
| `/sign-in` | Sign in | F1 + F2 | none | The only unauthenticated screen; reduced shell |
| `/` | redirect to `/queue` | F2 | session | |
| `/queue` | Review queue | F8 | session | Receipt-ordered open exceptions |
| `/entries/new` | New cargo entry + receipt outcome | F6 | session | Start of every demonstration path (no seed data) |
| `/cases/{caseReference}` | Case detail: entry, findings, recommendation (F10), decision (F12), audit (F14) | F10 | session | One route, five regions, one reading order |
| `/cases/{caseReference}/audit` | Case detail deep-linked and focused on the audit region | F14 | session | Same screen; focus and scroll target differ |
| `*` | Page not found (inside the shell) | F2 | session | |

There is no dashboard route, no reports route, no settings route, no admin route, no user-management route, no closed-case browse route, and no search route. An unauthenticated HTML request to a session route returns `302 /sign-in?next={validated path}`.

### 3.18 UI component contract for provenance

Provenance is carried into the rendering layer by types, so "we forgot to show the badge" is a compile error rather than a review finding:

```typescript
// web/src/components/AttributedValue.tsx
export interface AttributedValueProps {
  readonly label: string;              // always a visible, associated label
  readonly attributed: Attributed<string | null>;   // value + origin, required
  readonly changed?: boolean;          // renders "changed by specialist" marking
}
/**
 * The ONLY component permitted to render a case value (entry value, proposed
 * value, resolution value, or audit before/after value). It always renders a
 * ProvenanceBadge alongside the value. Passing a bare string does not compile.
 */

// web/src/components/ProvenanceBadge.tsx
export interface ProvenanceBadgeProps {
  readonly origin: Origin;
  readonly variant?: 'inline' | 'block';
}
/**
 * Renders text + icon + token colour, NEVER colour alone (FR-2.17, NFR-2):
 *   AI    -> "AI-suggested"       + icon(aria-hidden) + token colour
 *   HUMAN -> "Specialist-entered" + icon(aria-hidden) + token colour
 * In `inline` variant the text is visually hidden but present for assistive
 * technology, so a screen-reader user receives the same distinction a sighted
 * user does. Used unchanged by F10, F12, and F14 (FR-2.20).
 */
```

A lint rule forbids rendering `entry.values`, `proposed_values`, `resolution_values`, or `audit.values` content anywhere except through `AttributedValue`.

---
## 4. Security Architecture

### 4.1 Threat model and posture

CargoExec's security requirements are driven by **accountability** before perimeter defence: the audit trail cannot attribute a decision unless the actor is identified, so authentication exists to make the record truthful. The realistic threats this architecture is built against, in priority order:

| # | Threat | Primary control |
|---|---|---|
| T-1 | History is revised after the fact (by app bug, ORM convenience, or direct SQL) | Append-only privileges + unconditional mutation trigger + hash chain (§2.9) |
| T-2 | A resolution is recorded without an accountable human | `decided_by` FK to `specialists` + HITL deferred trigger + worker role with no decision privilege (§2.8, §2.9.1) |
| T-3 | A value's origin is falsified or lost | `origin` `NOT NULL` with constant `CHECK`s; server-only origin computation; client-supplied `origin` rejected as unknown property |
| T-4 | Cross-site request forgery against the decision endpoint | Double-submit CSRF token compared in constant time, required on every state-changing request |
| T-5 | Session theft / fixation | Opaque 256-bit token, only its SHA-256 stored, `HttpOnly`, absolute + idle expiry, revocation on sign-out and expiry |
| T-6 | Credential enumeration or brute force | Identical `401` for unknown email and wrong password, dummy-hash verification for timing parity, per-email throttle |
| T-7 | Secret leakage into logs, responses, or the audit trail | Env-only secrets, pino redaction, audit writer denylist that *fails the transaction* rather than dropping silently |
| T-8 | Injection | Parameterised SQL only, no ORM, no string interpolation of client input, `zod` strict parsing at the boundary |
| T-9 | Sensitive data sent to the AI provider | Request payload constructed from entry values + findings only; no identity, token, or credential can be in the type |

Explicitly **not** in the threat model for v1: privilege escalation between application roles (there is one role), tenant isolation (single tenant), export-channel leakage (no export exists), and federation compromise (no IdP exists).

### 4.2 Authentication — one role, server-side sessions

There is exactly one authenticated role, `cargo specialist`. Authorisation is **binary**: a request either carries a valid session or it does not. No `role`, `is_supervisor`, `permissions`, or `scope` column, claim, or configuration value exists anywhere in the system, and no handler performs a role check (F1 FR-1.1). Anything that looks like an authorisation decision in this architecture is really an *authentication* decision.

| Element | Design |
|---|---|
| Credential store | `specialists.password_hash`, Argon2id (memory ≥ 19 MiB, iterations ≥ 2, parallelism ≥ 1) via the native `argon2` binding |
| Sign-in | Email normalised (trim + lowercase); Argon2id verify runs **even when no row was found**, against a fixed dummy hash, so timing does not disclose account existence; identical `401 AUTH_FAILED` body for unknown email and wrong password |
| Session token | 256-bit CSPRNG value; the raw token exists **only** in the client cookie; `sessions.token_hash` stores its SHA-256. No JWT, no signed payload, no identity claim in the cookie |
| Absolute expiry | 8 hours from creation, not extendable |
| Idle expiry | 30 minutes from `last_seen_at`; `last_seen_at` is refreshed at most once per 60 s per session to bound write amplification |
| Expiry bookkeeping | An expired session is marked `revoked_at = now()`, `revocation_reason = 'EXPIRED'` at the moment it is rejected, so the `sessions` table records what happened |
| Sign-out | `DELETE /api/session` sets `revoked_at`/`SIGNED_OUT`, clears the cookie, returns `204`. Revokes only the requesting session; concurrent sessions are permitted and there is no session-management screen (administrative surface) |
| Request principal | Resolved by middleware and attached to the request; it is the **sole** source of `audit_entries.actor_specialist_id` and `decisions.decided_by`. A body property naming an actor is rejected as unknown (`422`) |
| Throttle | 5 failed attempts per normalised email within a rolling 15-minute window ⇒ `429 TOO_MANY_ATTEMPTS` with `Retry-After` for 15 minutes, without revealing whether the email exists. Counters live in an in-process TTL map keyed by a hash of the email — **not** a table, **not** account state: there is no lockout flag and no unlock surface, because there is no administrative role |
| Provisioning | `create-specialist --email --display-name` CLI, password entered interactively. No self-registration, no password reset, no invite flow, no user-administration UI — each absent because each is an administrative surface (F1 FR-1.13) |
| Federation | None. No SSO, SAML, OIDC, LDAP, or PIV/CAC, and no hook prepared for one (FR-Y3.8) |

**Unauthenticated request behaviour** — differentiated by request type, so both the API and the browser behave correctly (F1 FR-1.7):

| Request | Response |
|---|---|
| Path starts `/api/` or `Accept: application/json` | `401` `{"error":{"code":"UNAUTHENTICATED","message":"Sign in to continue."}}`, no `WWW-Authenticate`, no redirect, no data |
| HTML document request to a session route | `302 /sign-in?next={percent-encoded path}` |
| HTML request to `/sign-in` **with** a valid session | `302 /queue` |
| Any request to `POST /api/session`, `GET /sign-in`, or a static asset | Allowed unauthenticated |

`next` must match `^/[A-Za-z0-9/_\-]*$` (same-origin absolute path); anything else is discarded and `/queue` is used — open-redirect prevention. On mid-session expiry the SPA receives `401`, discards in-memory state, navigates to `/sign-in?next={current path}`, and announces "Your session expired. Sign in again to continue." In-progress form input is never silently resubmitted after re-authentication; the specialist re-enters it deliberately, because a silently replayed decision would be an unaccountable one.

### 4.3 Cookie profiles (deviation D-2)

```
Set-Cookie: cargoexec_sid=<opaque 256-bit token>; HttpOnly; Path=/;
            SameSite=<profile>; [Secure]
```

Fixed attributes in every profile: name `cargoexec_sid`, `HttpOnly`, `Path=/`, **no** `Domain`, and **no** `Max-Age`/`Expires` — it is a session cookie, so server-side expiry is the only authority on lifetime (F1 FR-1.3).

| Profile | `SameSite` | `Secure` | When to use | Trade-off |
|---|---|---|---|---|
| `governed` **(default)** | `Lax` | yes | Any TLS deployment, and any preview proxy that serves the app **same-origin under a path** | Exactly the FRD value; no deviation in effect |
| `demo-iframe` | `None` | yes | Only when the preview proxy embeds the app from a **different origin**, where a `Lax` cookie would not be sent at all and sign-in would be impossible | Relies on CSRF double-submit (which does not depend on `SameSite`) for cross-site request protection; documented as demonstration-only |

The profile is selected by `SESSION_COOKIE_PROFILE`; the application refuses to start if `demo-iframe` is combined with a non-TLS origin, because `SameSite=None` requires `Secure` and a silently dropped cookie is worse than a startup failure. **Recommendation: configure the preview proxy to serve the application same-origin under a path and keep the `governed` profile**, so the deviation stays documented-but-unused.

### 4.4 CSRF

- Every state-changing request (`POST /api/session` excepted, as it creates the session; `POST /api/entries`, `POST /api/exceptions/{id}/decision`, `DELETE /api/session` required) must carry `X-CSRF-Token`.
- Double-submit: the token is issued in the sign-in response and re-readable from `GET /api/session`; the server compares its SHA-256 against `sessions.csrf_token_hash` with a **constant-time** comparison.
- Mismatch or absence ⇒ `403 CSRF_INVALID`, and **no audit entry is written** — the request never reaches a service.
- `GET` requests are never CSRF-checked and never change state. This is an invariant, not a convention: there is no `GET` endpoint that writes, and the four read endpoints call read-only services on read-only queries.
- CSRF protection is independent of the cookie's `SameSite` value, which is what makes deviation D-2 acceptable.

### 4.5 Response headers and iframe policy (deviation D-1)

The application is demonstrated inside a sandbox preview **IFRAME**. Therefore:

**Never sent, under any configuration:**
- `X-Frame-Options` (no `DENY`, no `SAMEORIGIN`) — the header has no allowlist form, so any value would break the demonstration.
- CSP `frame-ancestors 'none'` or a bare `frame-ancestors 'self'`.
- `Cross-Origin-Embedder-Policy` (would break framing and third-party-free asset loading for no benefit here).

**Sent on every response:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  frame-src 'none';
  [frame-ancestors <FRAME_ANCESTORS>;]      ← emitted ONLY when configured
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Strict-Transport-Security: max-age=31536000    ← only when the origin is HTTPS
```

`frame-ancestors` behaviour is explicit and safe-by-default-for-the-demo:

| `FRAME_ANCESTORS` value | Emitted directive | Effect |
|---|---|---|
| unset (default) | **directive omitted entirely** | The app is embeddable; no frame-blocking exists. This is the demonstration default. |
| `*` | `frame-ancestors *` | Equivalent to omitting; explicit for operators who prefer it stated |
| `https://preview.example.dev https://*.sandbox.example` | that allowlist | Scoped embedding — the recommended value once the preview origin is known |
| `'none'` or `'self'` | **rejected at startup** | A configuration self-check refuses to boot, because these values break the one environment the walkthrough happens in (D-1) |

No inline script is used anywhere, so `script-src 'self'` needs no `unsafe-inline` and no nonce machinery. `style-src 'self'` holds because USWDS Sass is compiled to a served stylesheet (§6.4). `connect-src 'self'` holds because the SPA only ever calls its own origin — the AI provider is called **server-side only**, never from the browser.

`Cache-Control: no-store` is set on every `/api` response. Static assets are content-hashed and cached normally; `index.html` is `no-store` so a stale shell never renders against a new API.

### 4.6 Input handling

| Layer | Control |
|---|---|
| Body size | 64 KB hard limit before parsing (`413 REQUEST_TOO_LARGE`) |
| Content type | `application/json` only on body-bearing endpoints (`415`); this is also the rejection path for any multipart, CSV, or upload attempt — no multipart parser is installed at all |
| Shape | `zod` schema per endpoint with `.strict()`: unknown property, wrong type, over-length string, over-scale decimal, duplicate field ⇒ `422 REQUEST_MALFORMED` with `details[]` naming each offender. Silent ignoring never occurs, because a silently dropped value would be absent from the audit record the specialist believes they created |
| Identifiers | Path parameters must be a uuid or `CE-YYYY-NNNNNN`; anything else ⇒ `400 INVALID_IDENTIFIER` before any query runs |
| Query strings | The whole API accepts zero query parameters; `GET /api/exceptions` rejects any with `400 UNSUPPORTED_QUERY_PARAMETER` |
| SQL | Hand-written parameterised statements only; no ORM, no query builder, no interpolation of client input. A lint rule forbids template literals in the `pg` `query()` text position |
| Output encoding | React escapes by default; no `dangerouslySetInnerHTML` anywhere (lint-enforced). Finding messages that interpolate a submitted `{value}` are truncated to 60 characters and escaped at render |
| Storage | Values are stored verbatim after trimming leading/trailing whitespace only — the record must show what the specialist typed, so no normalisation, case folding, or rounding happens on the write path |

### 4.7 Secrets and logging

| Secret | Source | Never appears in |
|---|---|---|
| Database credentials (`app`, `ai`, `owner`) | environment only | source control, logs, responses, audit entries |
| AI provider API key | environment only | source control, logs (redacted), responses, audit entries |
| Session tokens, CSRF tokens | generated at runtime, hashed at rest | logs (session referenced by `sessions.id` only), responses beyond the issuing one, audit entries |
| Password hashes / plaintext passwords | never logged, never returned, never audited | anywhere |

Mechanisms:

- **pino redaction** configured with a denylist of paths (`req.headers.cookie`, `req.headers['x-csrf-token']`, `req.headers.authorization`, `password`, `token`, `api_key`, `authorization`) plus a serialiser that drops request bodies for `POST /api/session` entirely.
- **Audit writer denylist** (F13 FR-13.12): `append` rejects a value row whose `field_name` is outside the entry field set / finding-scoped names, or whose value matches a secret shape (bearer token, `sk-` prefixed key, Argon2 hash prefix, long base64url). The attempt raises `AUDIT_WRITE_FORBIDDEN_CONTENT` and **fails the transaction** rather than silently dropping the value — a partially-recorded audit entry is worse than a failed write.
- **Provider error handling**: provider response bodies are never persisted on the recommendation row and never returned to the client; they are logged with credentials redacted and summarised into one of the seven enumerated `failure_reason` values.
- **`.env.example`** lists every key with no real value; `.env` is git-ignored; a startup self-check fails fast on a missing required key rather than starting in a degraded security posture.

### 4.8 Data protection at rest and in transit

| Concern | Design |
|---|---|
| In transit (browser ↔ app) | HTTPS with HSTS in any hosted deployment; plain HTTP permitted only for a local demonstration on `localhost`/sandbox, where the `governed` cookie profile drops `Secure` and the application logs a startup warning naming the reduced posture |
| In transit (app ↔ provider) | HTTPS only; the adapter refuses a non-`https:` provider endpoint at startup |
| In transit (app ↔ database) | TLS when the database is remote (`PGSSLMODE=require`); in-cluster/compose demonstration uses the container network |
| At rest | Passwords: Argon2id. Session and CSRF tokens: SHA-256 of a 256-bit random value. Case content is stored in plaintext by design — the audit trail must show actual values to answer "what did the human change" (R-12); it is protected by authentication and by having **no export surface** at all |
| Backup / retention | No purge, rollup, archive, or retention job exists; audit entries are permanent for the life of the deployment (F13 FR-13.14). Database backup is an operational concern of the hosting environment, not an application feature |

### 4.9 Security properties verified by test

| Property | Test |
|---|---|
| Every endpoint except `POST /api/session` rejects an unauthenticated call | Parameterised test over the ten-route table |
| Unknown email and wrong password produce byte-identical responses | Response body + status comparison |
| A decision without `X-CSRF-Token` returns `403` and writes **no** audit entry | API test + audit-count assertion |
| A session used 31 minutes after its last request returns `401` and is marked `EXPIRED` | Clock-controlled test |
| A replayed post-sign-out cookie returns `401` | API test |
| An audit entry's actor always equals the signed-in specialist; no code path accepts a client-supplied actor | API test + schema/grep test |
| No response header named `X-Frame-Options` is ever emitted, on any route, in any profile | Header test across all ten routes + the SPA document |
| `frame-ancestors 'none'` / `'self'` configuration refuses to start | Startup self-check test |
| No log line, response body, or audit entry contains the provider API key | Log-capture test with a sentinel key value |
| The audit writer rejects a secret-shaped value and aborts the transaction | Writer unit test |
| No `dangerouslySetInnerHTML`, no template-literal SQL, no ORM dependency | Lint + dependency allowlist test |

---
## 5. AI Integration Design

### 5.1 What the AI is, architecturally

The AI is a **stateless, outbound, request/response drafting service** that produces a proposal record. It is not a participant in the case lifecycle. Expressed as capabilities:

| The AI *can* | The AI *cannot* |
|---|---|
| Read the fourteen entry values and the ordered validation findings for one exception | Read any specialist identity, session, credential, or audit entry |
| Return a recommended action, a plain-language rationale, and proposed field values | Write `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, or `validation_findings` |
| Cause one `recommendations` row to reach `AVAILABLE` or `UNAVAILABLE`, with `recommendation_values` marked `origin='AI'` | Write `decisions` or `decision_values`, or change `exceptions.state` — by code path, by foreign key, by trigger, **and** by database privilege |
| Cause exactly one `RECOMMENDATION_GENERATED` or `RECOMMENDATION_UNAVAILABLE` audit entry | Update or delete any audit entry, or write an audit entry with a `SPECIALIST` actor |
| Fail — visibly, terminally, and without blocking anything | Retry itself after a terminal outcome, be re-triggered from the UI, or be regenerated |

### 5.2 Component topology

```
 receipt transaction COMMITs
          │
          │ post-commit dispatch (fire-and-forget, logged, never awaited)
          ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ai/worker.ts        in-process · bounded concurrency (default 2)     │
 │   • accepts dispatch(exceptionId) only from receipt.service          │
 │   • no scheduler, no cron, no sweeper, no queue, no retry loop       │
 │   • connection pool: cargoexec_ai  ← cannot write decisions (A-1)    │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │ RecommendationRequest  (entry values + findings only)
                 ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ai/provider.ts      interface RecommendationProvider                 │
 │   generate(req) → ProviderResult  (ok:draft | ok:false:failure)      │
 │   The ONLY type surface the rest of the system sees. No method here  │
 │   writes anything or references a decision or an exception state.    │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │ (the only implementation, and the only module
                 │  permitted to import an HTTP client for this purpose)
                 ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ai/adapter.http.ts                                                   │
 │   prompt render (versioned template) → HTTPS POST → parse →          │
 │   output-schema validation → draft | enumerated failure_reason       │
 │   20 s per attempt · 1 retry on timeout/429/5xx/conn · 45 s budget   │
 │   credentials redacted from every log line                           │
 └───────────────┬──────────────────────────────────────────────────────┘
                 ▼  HTTPS (the only outbound network call in the system)
        ┌────────────────────────┐
        │ hosted LLM endpoint    │  consumed only; no training, no tuning,
        │ (OpenAI-compatible)    │  no embedding store, no feedback loop
        └────────────────────────┘
```

### 5.3 How the recommendation and its rationale are produced

1. **Trigger.** `receipt.service` commits a receipt that opened an exception (which also created the `PENDING` recommendation row inside that transaction) and *then* calls `worker.dispatch(exceptionId)`. Dispatch is the only trigger. There is no endpoint, UI control, schedule, or batch job that starts generation, and none that starts it for a closed case (F9 FR-9.6). Dispatch failure is logged and cannot affect the already-committed receipt.
2. **Idempotence gate.** The job opens a transaction on the `cargoexec_ai` pool, takes a row lock on the recommendation, and proceeds only while `status = 'PENDING'`. A duplicate dispatch therefore performs no second write and produces no second audit entry (F9 FR-9.17).
3. **Request composition.** `RecommendationRequest` is built from the fourteen entry values as submitted, the ordered findings (`rule_id`, `field_name`, `failure_code`, `message`), and the `rule_set_version`. The type has **no** field capable of carrying a specialist id, name, email, session token, case reference, or audit content — the model sees the cargo entry and why it failed validation, and nothing about who typed it (FR-9.16, FR-Y3.2).
4. **Prompt render.** The adapter renders the immutable template identified by `PROMPT_VERSION` (§5.4). The template instructs: plain language intelligible to a non-technical reader; no rule identifiers, regular expressions, internal codes, or model self-reference in the rationale; one sentence for the action; explain *why* the recommendation follows from the unsatisfied requirements (F9 FR-9.9).
5. **Call.** HTTPS POST with a 20-second per-attempt timeout. Exactly one retry after a 2-second delay on timeout, HTTP 429, 5xx, or connection failure. Total budget 45 seconds. A structured-output response format (JSON schema) is requested where the provider supports it, but the response is validated by the application regardless — the provider's schema support is an optimisation, never the guarantee.
6. **Output validation.** The response is validated against the `RecommendationDraft` schema **before any persistence**:
   - `recommended_action`: string, 1–500 chars after trim
   - `rationale`: string, 1–2000 chars after trim
   - `proposed_values`: 0–14 items of `{field_name, proposed_value, addresses_rule_ids}`; `field_name` must be a member of the fourteen-field set; `proposed_value` within that field's structural limit; `addresses_rule_ids` non-empty and every element a `rule_id` present in **this** exception's findings
   - duplicate `field_name` ⇒ invalid; any additional top-level property ⇒ invalid
   - **any** field outside the fourteen — including `hts_code`, `duty_amount`, `tariff_rate`, `classification`, `admissibility`, `penalty`, or `risk_score` — makes the response schema-invalid and drives the case to `UNAVAILABLE` (F9 FR-9.8, PRD §10 #9). Excluded determinations are unrepresentable in the output contract, not merely discouraged in the prompt.
   - An over-length `proposed_value` is **invalid rather than truncated**, so the record never shows a silently altered proposal.
7. **Persist success** — one transaction: `UPDATE recommendations SET status='AVAILABLE', recommended_action, rationale, model_id, prompt_version, generated_at, latency_ms`; `INSERT recommendation_values` (one per proposed value, `origin='AI'` by `CHECK`); `auditWriter.append(tx, RECOMMENDATION_GENERATED)` with `actor_type='AI'`, `actor_specialist_id=NULL`, `before_state='PENDING'`, `after_state='AVAILABLE'`, and one value row per proposal (`before_value` = the entry's current value with `before_origin='HUMAN'` or `NULL` if never provided; `after_value` = the proposal with `after_origin='AI'`). Commit.
8. **Persist failure** — one transaction: `UPDATE recommendations SET status='UNAVAILABLE', failure_reason, failed_at, model_id, prompt_version`; `auditWriter.append(tx, RECOMMENDATION_UNAVAILABLE)` with `actor_type='AI'`, `after_state='UNAVAILABLE'`, no value rows. Commit.
9. **In both branches**: `exceptions.state` remains `OPEN` and `cargo_entries` is untouched — the first is impossible for this role to change, the second is impossible for any role to change (§2.9.1, D-3).

### 5.4 What is persisted for traceability

| Persisted | Where | Why |
|---|---|---|
| `recommended_action`, `rationale` | `recommendations` | The record answers "what did the AI say" exactly as it was said — verbatim, never re-worded or summarised downstream |
| `proposed_value` per field, with `addresses_rule_ids` | `recommendation_values` (`origin='AI'`) | Per-value provenance, plus the justification linking each proposal to the rule it addresses |
| `model_id` | `recommendations` | Provider model identifier **and version string** (e.g. `gpt-4o-2024-11-20`), so the record states which model spoke |
| `prompt_version` | `recommendations` | Template identifier (e.g. `p-2026.09.1`) — a pointer to exact prompt text, see the manifest below |
| `generated_at`, `requested_at`, `latency_ms` | `recommendations` | When it was said, and how long it took |
| `failure_reason`, `failed_at` | `recommendations` | Why no recommendation exists, from a closed set of seven values |
| Exactly one audit entry per terminal outcome | `audit_entries` (+ values) | The trail shows the AI's contribution as an event, with `actor_type='AI'` and no specialist identity |

**Prompt traceability without duplicating prompts (addition A-2).** Prompt *text* is not persisted per case — it is identical for every case at a given `prompt_version`, and storing it per row would bloat the record without adding information. Instead:

- Templates live at `server/src/ai/prompt/{prompt_version}.md` and are **immutable once shipped**.
- `server/src/ai/prompt/manifest.json` maps each `prompt_version` to the SHA-256 of its template text.
- A **startup self-check** recomputes every digest and refuses to boot on a mismatch, so an edited template cannot run under an old version label.
- Editing a template therefore requires a new `prompt_version` and a manifest entry. `prompt_version` on a stored recommendation is consequently a *provable* pointer to exact text at a repository tag.

**Never persisted**: the raw provider response body, provider error text, the API key, and any request/response metadata beyond the columns above (F9 FR-9.13).

### 5.5 The hard guarantee: the AI cannot write a resolution

Five independent mechanisms, any one of which is sufficient. All five are present, so no single defect produces an auto-applied recommendation:

| # | Layer | Mechanism | Failure mode if code is wrong |
|---|---|---|---|
| 1 | **Record separation** | Proposals live in `recommendations`/`recommendation_values`; resolutions live in `decisions`/`decision_values`. No shared column; no view, job, or trigger copies one into the other. "Applying" a recommendation would require inserting a `decisions` row | There is nothing to "flip"; a proposal has no state that closes a case |
| 2 | **Foreign key** | `decisions.decided_by uuid NOT NULL REFERENCES specialists(id)`, populated only from the authenticated principal. `specialists` contains no AI row and no system row | Insert fails with a foreign-key violation |
| 3 | **Deferred trigger** | `trg_exceptions_hitl` refuses any commit that moves an exception out of `OPEN` without a matching `decisions` row whose `resulting_state` equals the new state | `COMMIT` refused, `HITL_VIOLATION` |
| 4 | **Database privilege (A-1)** | The worker's pool connects as `cargoexec_ai`, which holds **no** privilege on `decisions`/`decision_values` and **no** `UPDATE` on `exceptions` | Statement rejected, `42501` |
| 5 | **Code capability** | `ai/worker.ts` and `ai/adapter.http.ts` cannot import `decision.service` or any decision-writing repository (import-graph test). No scheduler, cron, queue consumer, retry path, database trigger, or migration writes `exceptions.state`; a repo-wide test asserts exactly one writer exists | Test failure before merge |

Two further structural facts complete the argument: **there is no non-request actor** in the system at all (the worker is the only asynchronous actor and its capability is limited to recommendation generation, FR-Y3.11), and **the API has no apply, auto, force, or bulk parameter** — `decision_type` is required, single-case, and has no default, so even a fully compromised client cannot express "apply this for me" (F11 FR-11.2, FR-11.20).

Verification: `EDIT_APPROVE` changing one of three proposed values records that value `HUMAN` and the other two `AI`; direct SQL setting `exceptions.state='RESOLVED'` without a decision fails at commit; the worker's code path contains no reference to the decision service; and SM-4 (auto-apply incidents) is asserted as zero by test rather than by observation.

### 5.6 Degradation and unavailability

**The specialist must still be able to decide.** Every failure mode is terminal, visible, and non-blocking:

| Failure | Recommendation status | `failure_reason` | Specialist can still | Displayed cause |
|---|---|---|---|---|
| Timeout after retry | `UNAVAILABLE` | `PROVIDER_TIMEOUT` | `EDIT_APPROVE` (direct resolution) or `REJECT` | "The AI service did not respond in time." |
| 5xx / connection failure | `UNAVAILABLE` | `PROVIDER_UNAVAILABLE` | same | "The AI service could not be reached." |
| 429 after retry | `UNAVAILABLE` | `PROVIDER_RATE_LIMITED` | same | "The AI service was busy." |
| 401/403 (bad key) | `UNAVAILABLE` | `PROVIDER_AUTH_FAILED` | same | "The AI service rejected this deployment's credentials." (key never shown or logged) |
| Response fails the output schema | `UNAVAILABLE` | `SCHEMA_INVALID` | same | "The AI response could not be used." |
| Provider content filter | `UNAVAILABLE` | `CONTENT_FILTERED` | same | "The AI service declined to answer for this case." |
| Unexpected internal error | `UNAVAILABLE` | `INTERNAL_ERROR` | same | "A recommendation could not be produced." |
| Dispatch lost / process restart | stays `PENDING` | — | same | "No AI recommendation is available yet." (stale after 60 s) |
| Provider entirely absent (no key configured) | `UNAVAILABLE` at first dispatch | `PROVIDER_AUTH_FAILED` | same | as above |

Guarantees around degradation:

- **Nothing in the receipt path depends on the provider.** Generation is post-commit and off the request path; stopping the provider does not change any receipt response (F9 acceptance 7).
- **No failure blocks entry creation, validation, exception opening, queue listing, the decision path, or audit writing** (NFR-9).
- **`APPROVE` is refused, not faked.** With `PENDING` or `UNAVAILABLE`, `APPROVE` ⇒ `409 RECOMMENDATION_NOT_AVAILABLE`; `permitted_decisions` returns `["EDIT_APPROVE","REJECT"]`. An absent recommendation can never be "approved" — which is why degraded mode does not create a rubber-stamp path.
- **Direct resolution** (`EDIT_APPROVE` with no available proposal) records every value with `origin='HUMAN'` and requires a reason ≥ 10 characters, so the degraded loop still produces a complete, attributable, self-explaining record (SM-13).
- **No automatic retry after a terminal outcome** — no background retry, scheduled re-attempt, retry-on-view, or "regenerate" button. A silent later retry would change what the case showed at decision time and would undermine the trail's account of what the AI said when the human decided (F9 FR-9.14).
- **No sweeper for stuck `PENDING`.** After a process restart a `PENDING` recommendation is presented as pending-then-stale by the UI rather than resurrected; v1 has no recovery scheduler, and a case with no recommendation is fully decidable (F9 FR-9.19).
- **Latency never affects interactive response time.** Bounded worker concurrency, generation off the request path, and a case screen that polls without blocking navigation or disabling the decision controls (NFR-10).

### 5.7 UI contract for the AI's contribution

The recommendation is always presented as an **un-applied proposal awaiting a decision**, never as an outcome:

- Every AI-proposed value renders through `AttributedValue` → `ProvenanceBadge` ("AI-suggested"), conveyed by text + icon + token colour and exposed to assistive technology as text — never colour alone.
- `model_id`, `prompt_version`, and `generated_at` are shown with the recommendation, so the reader can see which model said this, under which prompt, and when.
- The rationale is rendered in full, verbatim, adjacent to the recommended action — never collapsed behind a disclosure that a specialist could approve without opening.
- While `PENDING`: poll every 3 s for at most 60 s; the decision controls stay enabled, navigation is never blocked, focus is never stolen, and the terminal outcome is announced politely.
- `UNAVAILABLE`/stale-`PENDING`: the `Degraded` component states the plain-language cause and explicitly states that the case can still be decided.
- The three decision actions are presented with **no pre-selected default**, so approving the AI is a deliberate act rather than the path of least resistance (F12, R-1).

### 5.8 Provider substitution and configuration

| Property | Value |
|---|---|
| Interface | `RecommendationProvider.generate(req) → ProviderResult` — the only surface callers see |
| Substitution cost | Change `ai/adapter.http.ts` and configuration. No change to F5, F7, F10, F11, F12, F13, or F14 is permitted or required (FR-9.15) |
| SDK policy | No provider SDK is a dependency; the adapter uses the platform `fetch`. No provider-specific type may appear in a signature outside the adapter (FR-Y3.1, import-graph test) |
| Test double | `FakeProvider` can produce every outcome branch, including each of the seven `failure_reason` values, so degraded-mode behaviour is fully testable with no network access (FR-Y3.4) |
| Configuration (environment only) | `AI_PROVIDER_URL` (must be `https:`), `AI_API_KEY`, `AI_MODEL_ID`, `PROMPT_VERSION`, `AI_TIMEOUT_MS` (default 20000), `AI_WORKER_CONCURRENCY` (default 2) |
| Absent | No training, fine-tuning, embedding store, vector database, evaluation harness, or feedback-to-model loop. A specialist's edit or rejection is recorded in the audit trail and goes nowhere near the model (FR-Y3.7, PRD §10 #11) |

### 5.9 Phase 7 — deployment posture (F9 FR-9.20)

The architecture in §5.1–§5.8 is **unchanged by Phase 7** — the provider-abstracted HTTP adapter, the OpenAI-compatible chat/completions shape, the no-SDK policy, and the retry/timeout/schema-validation logic were always the stated design and remain exactly as described above. What Phase 7 changes is **deployment posture only**:

- **The demonstration/production `docker-compose.yml` and `.env.example` defaults change.** Today `AI_PROVIDER_URL` defaults to `fake:deterministic` in `docker-compose.yml` and ships empty in `.env.example`. As of Phase 7, the demonstration/production deployment MUST be configured with `AI_PROVIDER_URL` pointing at a real hosted LLM's HTTPS endpoint, with a valid `AI_API_KEY` and `AI_MODEL_ID` — the fake provider MUST NOT be the default, fallback, or unconfigured-state behaviour of a deployed environment (FR-9.20). The specific provider and model are a **Phase 7 planning decision** — this document does not name one.
- **The fake provider is not removed; its role narrows.** `server/src/ai/fakeProvider.ts` remains exactly as it is and remains the correct choice for the automated test suite's own configuration (`test:unit`, `test:api`, `test:e2e` may all still run with `AI_PROVIDER_URL=fake:deterministic` — nothing about the test environment of §8.2 changes). Its role narrows from "the shipped default" to "test-only" — a configuration-surface change, not a code change.
- **The no-SDK constraint is unchanged.** `server/src/ai/adapter.http.ts` continues to use the platform `fetch` only; no provider SDK (`openai`, `@anthropic-ai/sdk`, `@azure/openai`, `langchain`, or equivalent) becomes a dependency, and the architecture test forbidding those packages (§6.2, `test/architecture/dependencies.spec.ts`) is unaffected. A real, HTTPS-reachable, OpenAI-compatible endpoint is reachable through plain HTTP exactly as the fake provider is today.
- **If the chosen real provider's wire shape is not OpenAI-compatible chat/completions**, the only files this document expects to change are the two documented seam functions already isolated inside the adapter for exactly this reason: `renderPromptRequest` (builds the outbound request body from the versioned prompt template and the `RecommendationRequest`) and `extractPayload` (parses the provider's response envelope into the shape §5.3 step 6 validates against `RecommendationDraft`). Every other module in §5.2's component topology — `provider.ts`'s interface, `worker.ts`'s dispatch/idempotence logic, the persistence and audit-coupling steps of §5.3 steps 7–9, and the degradation table of §5.6 — is provider-shape-agnostic and requires no change. This document does not name the specific provider whose shape might require this; that determination is Phase 7 planning's, made against the actual chosen endpoint.

---
## 6. Technology Stack

### 6.1 Selection criteria

In the PRD's stated priority order: (1) USWDS conformance and full control over rendered markup, (2) ability to enforce append-only audit storage at the persistence layer, (3) fast delivery of a *complete* loop. A secondary constraint shaped several choices: the demonstration must run in a sandbox behind a preview iframe proxy, with no outbound network access except the AI provider call.

### 6.2 Pinned versions

Exact pins (no `^`, no `~`) in `package.json`, with a committed lockfile. Every line has one reason.

| Layer | Technology | Version | Rationale (one line) |
|---|---|---|---|
| Runtime | **Node.js** | `22.11.0` (LTS) | Active LTS with native `fetch`/`undici` and stable `node:test`-free tooling; one runtime for API, SPA build, worker, and CLI. |
| Language | **TypeScript** | `5.6.3` | `strict` + `noUncheckedIndexedAccess` make the provenance types of §3.9 enforceable rather than decorative. |
| HTTP server | **Express** | `4.21.1` | Smallest well-understood middleware chain for ten routes; deliberately not Express 5 (still stabilising) and not a framework with opinionated data access. |
| Security headers | **helmet** | `8.0.0` | Sane header defaults *with* the ability to disable `frameguard` and hand-write CSP — required by D-1. |
| Request validation | **zod** | `3.23.8` | `.strict()` gives unknown-property rejection (`422 REQUEST_MALFORMED`) for free, which is what blocks a client-supplied `origin`/`decided_by`. |
| Database | **PostgreSQL** | `16.4` | Deferred constraint triggers, partial indexes, column/table privileges, and `pgcrypto` — the four features the governance guarantees are built on. |
| DB driver | **pg** (node-postgres) | `8.13.1` | Thin, parameterised, transaction-explicit. **No ORM by design**: no `save()`/`upsert()`/dirty-flush that could emit an `UPDATE` against an append-only table (R-4). |
| Migrations | **node-pg-migrate** | `7.9.0` | Numbered, forward-only, transactional SQL migrations applied by the owner role; no down-migrations in v1. |
| Password hashing | **argon2** | `0.41.1` | Argon2id at the parameters F1 FR-1.4 requires; native binding, not a JS approximation. |
| Logging | **pino** | `9.5.0` | Structured logs with path-based redaction, so secrets cannot reach a log line by accident. |
| UI library | **React** | `18.3.1` | Mature, matches the FRD's SPA design; paired with a design system whose peer support is React 18. |
| | **react-dom** | `18.3.1` | Pinned with React. |
| Routing | **react-router-dom** | `6.28.0` | Declarative routes matching the seven-route table; no data-loader magic needed for four read endpoints. |
| Design system | **@uswds/uswds** | `3.11.0` | **Mandatory.** The federal standard for CBP-facing applications; consumed as Sass + JS + icon sprite so the project owns the rendered markup (NFR-1, §7). |
| Sass compiler | **sass** (dart-sass) | `1.80.6` | Compiles USWDS settings + tokens; the supported USWDS build path. |
| Build / dev server | **Vite** | `5.4.11` | Fast TS/React build; runs in **middleware mode inside Express**, so dev and production are one origin on one port (§6.5). |
| Unit / integration tests | **Vitest** | `2.1.5` | Same TS config as the app; fast enough to keep the DB-invariant suite in the normal loop. |
| HTTP tests | **supertest** | `7.0.0` | Exercises the real Express app including middleware order. |
| Browser tests | **@playwright/test** | `1.48.2` | Keyboard-only walkthrough of the six-stage loop (SM-11). **Functional only — not an accessibility gate**, and `axe-core` is deliberately not a dependency (§7.8). |
| Container base | **node:22.11-bookworm-slim** | pinned digest | Reproducible image; slim base with no build toolchain in the runtime stage. |
| Container base (db) | **postgres:16.4-bookworm** | pinned digest | Matches the pinned server version exactly. |

### 6.2a Phase 7 — visual redesign: Carbon Design System (`@carbon/react`)

Phase 7 replaces `@uswds/uswds@3.11.0` as the shell's visual system with the **Carbon Design System** (carbondesignsystem.com), IBM's open-source, MIT/Apache-family-licensed design system, consumed via the `@carbon/react` npm package — which in turn depends on `@carbon/styles` (the underlying Sass package) and `@carbon/icons-react` (SVG icon components) (PRD §4.1, §5.1 F2). The exact version pin and the exact Sass import surface are Phase 7 planning/execution work once the planner reads the installed package's API; this chunk does not pin a version here. What is fixed now, because Carbon is a concrete, verified target rather than an unknown:

- **Self-hosting survives the choice of design system, and Carbon satisfies it.** Today `web/scripts/copy-uswds-assets.mjs` copies fonts, icons, and JS into the build so nothing is fetched from a CDN at runtime (FR-2.3). Carbon satisfies this the same way: `@carbon/react`, `@carbon/styles`, and `@carbon/icons-react` are all npm-installable and self-hostable, and IBM Plex — Carbon's default typeface — is open-licensed and redistributable, so it can be self-hosted exactly as Public Sans is today. `@carbon/icons-react` ships icons as SVG React components rather than an icon-sprite file — a build-approach difference from USWDS's sprite, not a CDN dependency and not a blocker. No CDN dependency is introduced by this swap.
- **The CSP survives the choice of design system, and Carbon satisfies it.** `style-src 'self'` with no `unsafe-inline` (§4.5) means styles must arrive as a compiled, `<link>`-loaded stylesheet — today `web/styles/app.scss` compiled by dart-sass into `web/public/assets/uswds.css`. Carbon compiles from Sass to static CSS, the same as USWDS does today — it is **not** runtime CSS-in-JS — so it is compatible with the existing build-time `npm run build:css`-style pipeline and requires no CSP relaxation.
- **The build pipeline shape (one Sass entry point, one compiled stylesheet, no CDN) is preserved.** `web/styles/app.scss` remains that single Sass entry point; only its content changes, from USWDS's `@use`/`@forward` statements to Carbon's equivalent Sass entry points (exact surface: Phase 7 planning, against the installed `@carbon/react`/`@carbon/styles` version). See §6.4 for the current pipeline and `01-components.md` §1A.1b for the corresponding component-architecture note.
- **`docs/uswds-conformance-register.md` will be re-authored mapping every control to its Carbon component** (see `01-components.md` §1A.1b).
- **Section 508 / WCAG 2.1 AA conformance is unaffected**, and Carbon's own stated compliance target — WCAG AA, Section 508, and EN accessibility standards (IBM's own Accessibility Checklist) — matches this project's bar (`07-accessibility.md` §7.1a).

**Dependency allowlist test.** `test/architecture/dependencies.spec.ts` asserts the production dependency set equals the list above and fails on the presence of any of: an ORM or query builder (`typeorm`, `prisma`, `sequelize`, `knex`, `drizzle-orm`, `mikro-orm`), `axe-core` / `@axe-core/*` / `jest-axe`, any CSV/XLSX/PDF writer (`csv-stringify`, `exceljs`, `pdfkit`, `puppeteer`), any multipart parser (`multer`, `busboy`, `formidable`), any scheduler (`node-cron`, `agenda`, `bullmq`, `bull`, `node-schedule`), any broker/cache client (`amqplib`, `kafkajs`, `ioredis`, `redis`), any AI provider SDK (`openai`, `@anthropic-ai/sdk`, `@azure/openai`, `langchain`), any auth federation library (`passport-saml`, `openid-client`, `@node-saml/*`), and any analytics/telemetry/error-reporting SaaS client. Each absence corresponds to an explicit PRD §10 exclusion; the test is how §10 becomes a build constraint.

### 6.3 Why not the obvious alternatives

| Alternative | Why not |
|---|---|
| **An ORM** (Prisma/TypeORM/Sequelize) | Its convenience methods are exactly the risk R-4 names. An ORM that can `update()` a loaded row is a permanent standing threat to an append-only table, and its migration tooling would fight the privilege/trigger-first migration design. Hand-written SQL for thirteen tables and ten endpoints is less code than the ORM's configuration. |
| **Next.js** | Not needed: the FRD specifies an SPA that bootstraps from `GET /api/session`, and SSR buys nothing for five authenticated screens. It would also add a long-running-worker/route-handler mismatch for the in-process AI worker. **If Next.js is nevertheless substituted, the config-extension constraint is binding: Next < 15 cannot read `next.config.ts`. Either pin Next ≥ 15, or use `next.config.mjs`/`next.config.js`. Never ship `next.config.ts` on Next 14** — it is silently ignored, which in this project would silently drop the `0.0.0.0` binding and the header configuration that make the demonstration reachable and embeddable. |
| **A component library wrapper over USWDS** | An extra abstraction between the project and the markup whose accessibility is being certified by manual review. USWDS's own Sass and HTML patterns, wrapped in thin project components, keep the rendered DOM reviewable (§7.2). |
| **Separate API and SPA origins** | Two ports, CORS, and a cross-site cookie problem inside the preview iframe, in exchange for nothing. One origin on port 3000 is simpler and more robust in the sandbox. |
| **A job queue for AI generation** | Y3 FR-Y3.12 forbids a broker, and the work is one bounded in-process call per case with no retry semantics to manage. A queue would also create the durable "retry it later" behaviour F9 FR-9.14 explicitly prohibits. |

### 6.4 Build pipeline

```
 contract/  ──tsc──►  d.ts + js        (imported by both sides, no runtime deps)
 web/       ──vite build──►  dist/     hashed JS/CSS + index.html
     styles/uswds.scss ──sass──►  one stylesheet (tokens + components)
     @uswds/uswds assets ──copy──►  dist/assets/{fonts,img,uswds sprite}
 server/    ──tsc──►  dist/            express app + worker + CLI
 Dockerfile  stage 1: build all of the above
             stage 2: node:22.11-slim + dist/ + node_modules(prod) + migrations
```

USWDS assets — styles, fonts, and the icon sprite — are **bundled and served by the application itself**. There is no runtime CDN dependency, so the demonstration renders correctly with no external network access (FR-2.3), and CSP can stay `'self'`-only with no inline script anywhere (§4.5).

### 6.5 Dev server, binding, and the preview proxy

Both development and production serve **one origin, one port**:

```typescript
// server/src/index.ts (excerpt — normative)
const HOST = process.env.HOST ?? '0.0.0.0';   // never 'localhost' / 127.0.0.1
const PORT = Number(process.env.PORT ?? 3000); // deterministic, not ephemeral

if (config.nodeEnv === 'development') {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { port: PORT } },
    appType: 'spa',
  });
  app.use(vite.middlewares);          // SPA + HMR on the SAME port as /api
} else {
  app.use(express.static('web/dist', { index: false }));
  app.get('*', serveIndexHtml);       // SPA fallback, after the API routes
}

app.listen(PORT, HOST, () =>
  logger.info({ host: HOST, port: PORT }, 'cargoexec listening'));
```

```typescript
// web/vite.config.ts (excerpt — normative)
export default defineConfig({
  server: {
    host: '0.0.0.0',      // bind all interfaces so the proxy can reach it
    port: 3000,
    strictPort: true,     // fail loudly rather than drift to 3001
    allowedHosts: true,   // accept the preview proxy's Host header
    hmr: { clientPort: 3000 },
  },
});
```

Requirements this satisfies, stated explicitly because a sandbox preview fails silently otherwise:

| Requirement | How |
|---|---|
| Bound to `0.0.0.0` | `HOST` defaults to `0.0.0.0`; binding to `localhost`/`127.0.0.1` is prohibited — a startup self-check logs an error and exits if `HOST` resolves to loopback, because the proxy would see a refused connection |
| Deterministic port 3000 | `PORT` defaults to `3000`; `strictPort: true` means a busy port is a hard failure rather than a silent move to 3001 |
| Reachable through a host-rewriting proxy | `allowedHosts: true` in dev (Vite's host check otherwise rejects an unknown `Host`); the production path serves static files and performs no host check |
| Embeddable in an IFRAME | No `X-Frame-Options` is ever emitted; CSP `frame-ancestors` is omitted by default and may be scoped to the preview origin, but may never be `'none'` or bare `'self'` (§4.5, D-1) |
| One origin for SPA and API | Both are served by the same Express instance on the same port, so the session cookie is first-party and `connect-src 'self'` holds |
| Route order | API routes are registered **before** the SPA fallback, so `GET /api/unknown` returns a JSON `404` envelope rather than `index.html` |

### 6.6 Configuration surface (environment only)

No secret is in source control; every key is listed in `.env.example` with no real value; a startup self-check fails fast on a missing required key (FR-Y3.13).

| Key | Required | Default | Purpose |
|---|---|---|---|
| `HOST` | no | `0.0.0.0` | Bind address; loopback is rejected |
| `PORT` | no | `3000` | Listen port |
| `NODE_ENV` | no | `production` | Selects Vite middleware vs static serving |
| `DATABASE_URL_APP` | **yes** | — | `cargoexec_app` connection string (request path) |
| `DATABASE_URL_AI` | **yes** | — | `cargoexec_ai` connection string (worker) — addition A-1 |
| `DATABASE_URL_OWNER` | migrations only | — | `cargoexec_owner`; used by the migration runner and the CLI, never by the server process |
| `SESSION_COOKIE_PROFILE` | no | `governed` | `governed` \| `demo-iframe` (§4.3) |
| `FRAME_ANCESTORS` | no | *(unset ⇒ directive omitted)* | CSP `frame-ancestors` value; `'none'`/`'self'` rejected at startup (D-1) |
| `AI_PROVIDER_URL` | **yes** | — | Must be `https:` |
| `AI_API_KEY` | **yes** | — | Never logged, never returned, never audited |
| `AI_MODEL_ID` | **yes** | — | Recorded on every recommendation |
| `PROMPT_VERSION` | **yes** | — | Must exist in the prompt manifest with a matching digest |
| `AI_TIMEOUT_MS` | no | `20000` | Per-attempt timeout |
| `AI_WORKER_CONCURRENCY` | no | `2` | Bounded generation concurrency |
| `LOG_LEVEL` | no | `info` | pino level |

Absent by design: no feature flag of any kind, no `ENABLE_*` toggle, no `SKIP_VALIDATION`, no `AUTO_APPROVE`, no export path, no seed switch, no role or permission configuration, no IdP settings, no metrics endpoint or sink. A configuration key that could enable an excluded capability is itself scope leakage.

---
## 7. Accessibility Architecture (USWDS + Section 508 / WCAG 2.1 AA)

### 7.1 The strategy: conformance by construction, verified by manual review

Accessibility is statutory for a federal application, and v1 has **no automated gate** (PROJECT.md, PRD §10 #1). That combination dictates the architecture: conformance cannot depend on catching defects late, so it is built into the layer every screen inherits and then confirmed screen by screen by a human, including an assistive-technology walkthrough.

Three architectural moves carry the burden:

1. **One shell, one set of patterns.** Landmarks, skip link, focus management, form pattern, error summary, live regions, state components, and the provenance badge exist **once** in F2 and are inherited by every screen (F1's sign-in, F6, F8, F10, F12, F14). A screen cannot accidentally have a different heading structure or a different error pattern because it does not own those things.
2. **USWDS components only, no bespoke interactive controls.** Every interactive control is a USWDS component or a composition recorded in the conformance register. Custom widgets are the single largest source of accessibility defects; the architecture removes the ability to introduce one casually.
3. **Type-level and lint-level enforcement of the two requirements most likely to regress silently** — provenance not conveyed by colour alone, and values rendered without their origin (§3.18).

### 7.1a Phase 7 — accessibility process is unchanged by the visual redesign to Carbon

Phase 7 replaces USWDS as the shell's visual system with the Carbon Design System via `@carbon/react` (PRD §4.1, §5.1 F2; `01-components.md` §1A.1b, `06-tech-stack.md` §6.2a); it does **not** touch anything in this chunk. Restated explicitly so a reader of this chunk alone is not left to guess: the manual, per-screen review gate of §7.7 — a signed record at `docs/a11y/{screen}.md` covering the fixed checklist, including the assistive-technology walkthrough — remains the sole enforcement mechanism, and §7.8's "no CI accessibility gate, **ever**" holds exactly as before; Phase 7 does not introduce `axe-core`, a `.github/workflows` directory, or any other automated gate. One relevant fact: Carbon's own stated compliance target is WCAG AA, Section 508, and EN accessibility standards (per IBM's own Accessibility Checklist) — the same bar as this project's NFR-2 — so this swap is not itself a compliance relaxation. It is also not a substitute for the review: adopting a library that targets this bar does not mean the bar is met without verification. What *does* change: `docs/uswds-conformance-register.md` (§7.3) will need a wholesale re-authoring against Carbon's primitives, and every screen's existing sign-off record will need re-verifying against the new markup, rebuilt on Carbon components, before that screen is considered delivered again — but the *bar* (zero WCAG 2.1 AA violations, 100% of screens signed off, 100% keyboard task completion) and the *process* that verifies it do not move.

### 7.2 USWDS integration

| Concern | Design |
|---|---|
| Source | `@uswds/uswds@3.11.0` consumed as **Sass + JS + icon sprite**, not as a wrapper component library, so the project owns the rendered DOM that manual review certifies |
| Styles | `web/styles/uswds.scss` sets the USWDS settings (`$theme-*` tokens: font stack, type scale, spacing, colour palette, focus ring) and imports USWDS packages; compiled by dart-sass into one stylesheet |
| Tokens | Typography, spacing, and colour come **only** from USWDS design tokens. A stylelint rule forbids a raw hex colour or a raw `px` spacing value in any screen-level style (FR-2.2) |
| JS behaviours | USWDS's own JS initialises the government banner disclosure and any USWDS component requiring behaviour; no bespoke JS re-implements a USWDS interaction |
| Assets | Fonts and the icon sprite are bundled and served by the application — no runtime CDN, so the sandbox renders correctly with no external network access (FR-2.3) |
| Icons | Used only alongside text, always `aria-hidden="true"`; no icon-only control exists for any primary action (FR-2.9) |

### 7.3 The USWDS conformance register

`docs/uswds-conformance-register.md` is a required build artefact: a table of every interactive control in the product mapped to the USWDS component it is, or to the documented USWDS-conformant composition it is built from. It is reviewed per screen (NFR-1, SM-12).

| Product control | USWDS basis |
|---|---|
| Sign-in form, entry form, edit-resolution form | `usa-form`, `usa-input`, `usa-textarea`, `usa-select`, `usa-label`, `usa-hint`, `usa-error-message`, `usa-button` |
| Required-field marking | `usa-label--required` + `usa-legend` convention statement |
| Error summary | `usa-alert usa-alert--error` composition with `role="alert"`, `tabindex="-1"`, and in-page links to controls |
| Review queue | `usa-table` (bordered, striped-off), with an accessible caption and a programmatic row count |
| Case detail sections | `usa-card`/section composition with a fixed heading order |
| Findings list | `usa-list` with per-finding field name and plain-language message |
| Recommendation block | `usa-summary-box` composition marked as an un-applied proposal |
| Decision actions | three `usa-button` controls (`primary`, `outline`, `secondary`) with **no** default/pre-selected state |
| Provenance badge | `usa-tag` composition + icon + visually-hidden text (never colour alone) |
| Degraded / empty / error / read-only states | `usa-alert` variants (`info`, `warning`, `error`) |
| Loading | `usa-loader`/spinner pattern with `aria-busy` on the loading region |
| Banner, header, nav, footer, skip link | `usa-banner`, `usa-header`, `usa-nav`, `usa-footer`, `usa-skipnav` |

Bespoke interactive controls are prohibited; introducing one requires a register entry justifying it as a USWDS-conformant composition, reviewed as part of the screen sign-off.

### 7.4 Structural accessibility guarantees in the shell

| Guarantee | Implementation |
|---|---|
| Landmarks | Exactly one `<header role="banner">`, one `<main id="main-content">`, one `<footer role="contentinfo">`, and — on authenticated screens — one `<nav aria-label="Primary">` |
| Skip link | `usa-skipnav` is the first focusable element on every page and moves focus **into** `main` |
| Official-site banner | The USWDS government banner renders above the header on every screen, its expandable detail keyboard-operable |
| Navigation set | Exactly two destinations: "Review queue" (`/queue`) and "New cargo entry" (`/entries/new`), current marked `aria-current="page"`. No third item exists in the DOM — no dashboard, reports, settings, or administration item (a DOM-level test asserts the count) |
| Heading order | Exactly one `<h1>` per screen; levels descend without skipping. Case detail reading order is fixed: entry → findings → recommendation → decision → audit |
| Focus on navigation | On every completed navigation the shell sets `document.title` to `{Screen} — CargoExec`, announces it politely, and moves focus to the screen's `<h1>` (`tabindex="-1"`) |
| Focus on in-place change | Any content replacement that is not a navigation moves focus deliberately to the element that explains the outcome — the error summary on failure, the confirmation heading on success |
| Keyboard | Every interactive component reachable and operable by keyboard in DOM order, no keyboard trap, no `tabindex > 0` |
| Visible focus | A focus indicator meeting AA non-text contrast on every focusable element; `outline: none` without a compliant replacement is forbidden by lint |
| Live regions | One `aria-live="polite"` status region and one `aria-live="assertive"` alert region, both present in the DOM from initial load so later insertions are announced; screens use `announceStatus()` / `announceError()` |
| Language / metadata | `<html lang="en">`; unique descriptive `<title>` per screen |
| Contrast | AA contrast (4.5:1 body, 3:1 large text and UI boundaries) satisfied by using approved USWDS token pairings only |
| Zoom / reflow | Usable at 200% zoom and at a 320 CSS-px viewport with no horizontal body scrolling; responsive to tablet width |
| Reduced motion | Every transition or animated indicator is disabled or reduced to an instantaneous change under `prefers-reduced-motion: reduce`; nothing auto-animates beyond 5 s; no content depends on motion |
| No third-party anything | No external script, font, analytics tag, session-replay tool, error-reporting SaaS, chat widget, or tracking pixel is loaded by any screen (FR-Y3.10) |

### 7.5 Colour independence for provenance, errors, and state

`FR-2.17` binds specifically on three kinds of information, each of which is the sort a colour-only treatment would ruin:

| Information | Non-colour carriers |
|---|---|
| AI-vs-human origin | Text label ("AI-suggested" / "Specialist-entered") + icon + token colour. In compact contexts the text is visually hidden but present for assistive technology, so a screen-reader user receives the same distinction. Rendered only by `ProvenanceBadge` (§3.18), so there is exactly one implementation to review |
| Validation errors | Icon + inline error text + `aria-invalid="true"` + error-summary entry — never red styling alone |
| Exception state | A text label (`Open` / `Resolved` / `Rejected`) — never a coloured dot alone |
| Specialist-modified value | Explicit "changed by specialist" marking on the edit form and in the trail, not a colour diff |

### 7.6 Accessible form and error pattern (inherited by F1, F6, F12)

1. Submit control enters a busy state (visible text change + `aria-disabled="true"`); repeat submission is blocked.
2. **The server response is authoritative.** Client-side hints never prevent a submission the server has not judged — an important interaction with the product's design, because an incomplete entry *must* be submittable in order to become an exception.
3. On a validation failure: an error summary as the first child of the form region, `role="alert"`, `tabindex="-1"`, receiving focus, listing one item per server finding **in server order** (ascending `rule_id`), each item an in-page link that moves focus to its control.
4. Each affected field renders inline error text inside the USWDS error wrapper, associated via `aria-describedby`, with `aria-invalid="true"` on the control.
5. The assertive region announces "{n} problems with your submission".
6. On success the outcome region renders and focus moves to its heading, announced politely — for receipt, stating explicitly whether the entry validated clean or opened an exception, with the case reference.

Field-level errors are bound to controls by the `details[]` field path in the error envelope (FR-Y2.4), which is why the API returns a field-level code per detail rather than a single message.

### 7.7 The review gate (the actual enforcement mechanism)

Because there is no CI gate, the per-screen review is **mandatory, not advisory** (R-3). A screen is not "delivered" until a signed record exists at `docs/a11y/{screen}.md` recording reviewer, date, screen, defects, and their resolution. The checklist per screen, at minimum:

```
□ exactly one h1; heading levels descend without skipping
□ landmark structure: banner, nav (authenticated), main, contentinfo
□ skip link present, first in focus order, lands inside main
□ every control has a programmatic accessible name
□ every form control has <label for>; hints via aria-describedby
□ required fields marked (visible + `required`); convention stated above the form
□ error summary appears, is role="alert", receives focus, links to each field
□ inline errors associated via aria-describedby with aria-invalid="true"
□ full keyboard traversal of every control; no trap; no tabindex > 0
□ the screen's primary task completable with the keyboard ALONE
□ visible focus indicator on every focusable element (AA non-text contrast)
□ AA contrast on all text and meaningful UI boundaries
□ colour independence: provenance, error, and state all readable without colour
□ every status and error announced in the correct live region, once, completely
□ usable at 200% zoom and at 320 px width, no horizontal body scrolling
□ reduced-motion behaviour correct
□ ASSISTIVE-TECHNOLOGY WALKTHROUGH of the primary task with a screen reader
□ (case screens) provenance distinguishable via screen reader and with colour off
```

Targets: **zero** WCAG 2.1 AA violations, 100% of screens reviewed and signed off (SM-10); 100% of the five product tasks completable by keyboard alone (SM-11); 100% of interactive components drawn from USWDS or a registered conformant composition (SM-12).

The five product tasks the keyboard-only requirement covers: sign in; create an entry; open a case from the queue; edit/approve/reject with a reason; read the audit trail.

### 7.8 Explicitly no CI accessibility gate

Stated as an architectural property, because its absence must be deliberate and visible:

- The repository contains **no `.github/workflows` directory and no CI workflow file of any kind**.
- `axe-core`, `@axe-core/*`, `jest-axe`, `pa11y`, `lighthouse-ci`, and equivalents are **not dependencies**, and the dependency allowlist test (§6.2) fails if one appears.
- The Playwright suite (§8.3) exercises **keyboard operability and functional flow** — it is a functional test of SM-11's task completability, not an accessibility conformance gate, and it asserts no WCAG rule.
- The enforcement mechanism is §7.7. A screen without a signed review record is not delivered.
- An architecture test asserts both absences (`no .github/`, no accessibility runner in the build pipeline), so "we added a quick axe check in CI" fails the build it was meant to join (F2 acceptance 8, PRD §10 #1).

---
## 8. Testing Strategy, Runtime Topology, and Operations

### 8.1 Testing philosophy

This is a demonstration build whose *point* is that governance guarantees hold. So the test suite is weighted unusually: comparatively little effort on breadth of behaviour, and heavy effort on (a) invariants the database enforces, (b) the 1:1 audit coverage of the eight transitions, (c) per-value provenance under editing, (d) degraded-mode loop completability, and (e) **architecture tests that assert the absence of excluded capabilities**. Category (e) is unusual and deliberate: in a product whose scope discipline is a stated success metric (SM-14), absence must be verified, not remembered.

No CI workflow file exists (PRD §10 #1). Every suite runs from `package.json` scripts, locally and during a release walkthrough:

```
npm run test:unit      # pure logic, no I/O          — fast, run constantly
npm run test:db        # DB invariants, real Postgres — the governance suite
npm run test:api       # supertest against the app + DB
npm run test:arch      # structure, dependencies, absences
npm run test:e2e       # Playwright keyboard walkthrough of the whole loop
npm run test           # all of the above, in that order
```

### 8.2 Test environment

| Concern | Approach |
|---|---|
| Database | A real PostgreSQL 16.4 (docker compose service), never a mock or SQLite — the invariants under test are PostgreSQL triggers and privileges |
| Isolation | Each suite creates a fresh database, runs the full migration set, and **drops** it afterwards. `TRUNCATE` is impossible on the audit tables, so teardown-by-truncate is not an option — this is the append-only guarantee constraining the test harness, which is a good sign |
| Roles | Tests connect as `cargoexec_app`, `cargoexec_ai`, **and** `cargoexec_owner` as required, because several assertions are specifically about what the owner also cannot do |
| Time | Expiry and idle-timeout tests inject a clock; validation is clock-free by construction (`RIV-132` uses the entry's own `received_at`), so rule tests need no time control |
| AI provider | `FakeProvider` implementing `RecommendationProvider`, able to produce a valid draft, an invalid draft, and each of the seven `failure_reason` values. **No test performs a live provider call**, so the whole suite runs with no network access |
| Fixtures | Test data is constructed through the public API (`POST /api/entries`) wherever possible, because that path is the only way data enters the product. Test-only builders live under `test/` and are excluded from the production build. **Phase 7 note:** PRD §10 #7's "no seed script or fixture loader" is superseded — `server/src/cli/seed-demo-case.ts` now exists as a named, reviewed, operator-invoked exception (F15). It is not part of the *test* environment described in this table (the automated suites still build their own data through the public API and never invoke the seed script), and it changes nothing about how test suites construct data — see §8.9 |

### 8.3 Test inventory

**Unit (`test:unit`)**

| Target | Assertions |
|---|---|
| Rule registry | Each of the 31 `RIV-*` predicates has ≥ 1 passing and ≥ 1 failing case; unique `rule_id` and `failure_code`; every `primary_field` is in the 14-field set; presence/format gating is declared, not implied by order; the registry's id set exactly equals FRD F4's table (FR-4.15) |
| Determinism | The same entry evaluated twice, and in two processes, yields byte-identical serialised results; re-evaluating a stored entry a month later yields the same `RIV-132` result |
| Gating | Blank-everything yields exactly the 13 presence findings and no format/domain findings; `port_of_entry_code="ZZ"` yields `RIV-031` only; `"9999"` yields `RIV-032` only; `mode=AIR` with only a bill of lading yields `RIV-070`; both transport documents yields `RIV-073`; `"assorted goods"` yields `RIV-092` |
| Canonical serialisation + hashing | Key order, decimal scale, timestamp precision, and `null` handling are stable; the hash of a known entry is a fixed vector; reordering value rows changes the hash |
| Provenance computation | The three branches of §3.5.3, including whitespace-only differences (trimmed ⇒ equal ⇒ `AI`) and an absent proposal (⇒ `HUMAN`) |
| Output-schema validation | A draft containing `hts_code`, `duty_amount`, a duplicate `field_name`, an unknown top-level property, an over-length value, or a rule id not in this case's findings is rejected as `SCHEMA_INVALID` |
| Redaction | pino redaction drops cookies, CSRF headers, passwords, and API keys; the sign-in body is dropped entirely |

**Database invariants (`test:db`) — the governance suite**

| # | Assertion |
|---|---|
| 1 | `UPDATE audit_entries SET action_type='X'` fails as `cargoexec_app`, as `cargoexec_ai`, **and** as `cargoexec_owner` |
| 2 | `DELETE FROM audit_entry_values` fails for all three roles; `TRUNCATE` fails for all three |
| 3 | `INSERT … ON CONFLICT DO UPDATE` against an audit table fails |
| 4 | A transaction setting `exceptions.state='RESOLVED'` without inserting a `decisions` row fails at `COMMIT` with `HITL_VIOLATION` |
| 5 | A `decisions` insert with no audit entry fails at `COMMIT` with `AUDIT_COUPLING_VIOLATION`; so does one with **two** entries |
| 6 | A `cargo_entries` insert with no `ENTRY_RECEIVED` entry fails at commit; likewise `validation_results` and `exceptions` |
| 7 | A recommendation moving to `AVAILABLE`/`UNAVAILABLE` without exactly one matching entry fails at commit |
| 8 | An `exceptions` row referencing a `validation_results` row with `outcome='PASS'` is rejected (composite FK, no trigger) |
| 9 | A second `decisions` row for one exception is rejected by `UNIQUE (exception_id)` |
| 10 | `EDIT_APPROVE`/`REJECT` with a blank, whitespace-only, or 9-character reason is rejected by `decisions_reason_required_chk` |
| 11 | An `audit_entry_values` row with a value but no origin is rejected |
| 12 | A `recommendation_values` row with `origin='HUMAN'` is rejected; a `cargo_entry_field_origins` row with `origin='AI'` is rejected |
| 13 | Two concurrent audit writes to one case produce `case_sequence` 1 and 2 with correct linkage and no gap |
| 14 | A tampered `prev_entry_hash` insert is refused at commit (`AUDIT_CHAIN_BROKEN`) |
| 15 | In a copied database with a middle entry removed, `verify_audit_chain` returns `chain_verified=false` at the expected sequence |
| 16 | `cargoexec_app` cannot `UPDATE cargo_entries` (D-3) |
| 17 | `cargoexec_ai` cannot `INSERT` into `decisions` or `decision_values`, and cannot `UPDATE exceptions` (A-1) |
| 18 | A closed exception with `decision_id IS NULL`, or an open one with a decision, is rejected by the closure `CHECK` |

**API (`test:api`)**

| Group | Assertions |
|---|---|
| Auth | Every endpoint except `POST /api/session` returns `401` unauthenticated; `/queue` HTML without a session redirects to `/sign-in?next=%2Fqueue`; unknown email and wrong password are byte-identical; 31-minute idle returns `401` and marks the session `EXPIRED`; a replayed post-sign-out cookie returns `401`; a decision without CSRF returns `403` **and writes no audit entry** |
| Receipt | An entry with only `goods_description` returns `201 EXCEPTION_OPENED` with a case reference; a rule-satisfying entry returns `201 VALIDATED_CLEAN` with `exception: null`; an injected audit-writer failure leaves **zero** `cargo_entries` rows; array body, CSV body, and a `skip_validation` property are all rejected; duplicate `entry_number` returns `409` and creates nothing; every non-empty field has a `HUMAN` origin row and absent/whitespace fields have none; stopping the provider changes no receipt response |
| Queue | Ordering is `receipt_position ASC` and stable across requests; closed cases are excluded; any query string (`?sort=`, `?state=`, `?assignee=`, `?page=`) returns `400 UNSUPPORTED_QUERY_PARAMETER`; no response field exposes priority, assignee, age, or a count-by-state |
| Decision | `APPROVE` on an available proposal resolves with every value `AI` and exactly one `RECOMMENDATION_APPROVED` entry; `EDIT_APPROVE` changing one of three values records that one `HUMAN` and the others `AI` with `prior_value` on all three; a reason of `""`, `"   "`, or `"ok"` returns `422 REASON_REQUIRED`, leaves the case `OPEN`, writes no audit entry; two concurrent decisions yield one `201` and one `409` with one decision and one entry in the database; `APPROVE` on `UNAVAILABLE` returns `409` while `EDIT_APPROVE` succeeds with all values `HUMAN`; a body containing `origin`, `decided_by`, or `applied` is rejected; after any decision `cargo_entries` and `validation_findings` are byte-identical to before; an `Idempotency-Key` replay returns the original decision with `idempotent_replay: true` and no second entry |
| Audit read | Entries ascend by `case_sequence` with correct actors, states, reasons, and per-value origins; `chain_verified` is `true`; viewing a case and signing in write no entry; no endpoint returns entries for more than one case; no `?format=`, `Accept`-variant, or download route exists |
| Errors | Every `Y2` code is reachable by at least one test; no error body contains SQL, a stack trace, provider text, or an internal invariant code |

**Architecture (`test:arch`) — absence and structure**

| Assertion | Enforces |
|---|---|
| Router's route array equals the ten pairs of §3.1, exactly | Y1 FR-Y1.1, C-4 |
| No route registration contains a query-parameter read (`req.query`) except the rejection guard | FR-Y1.2 |
| `audit_entries`/`audit_entry_values` are referenced by exactly one module | F13 FR-13.1 |
| Exactly one module writes `exceptions.state`, `decisions`, or `decision_values` | F11 FR-11.1, SM-4 |
| `ai/*` does not import `decision.service` or any decision-writing repository | F9 acceptance 6 |
| No provider SDK type appears outside `ai/adapter.http.ts`; no provider SDK is a dependency | FR-Y3.1 |
| `BEGIN` appears only in `db/tx.ts` | R-L2 |
| Dependency set equals the §6.2 allowlist; none of the forbidden packages is present | PRD §10 (all) |
| No `.github/` directory; no CI workflow file anywhere; no accessibility runner in the build | §10 #1 |
| Schema contains none of the 25 forbidden column names; exactly 13 application tables | §10 #2–#9 |
| No migration file inserts domain data | §10 #7, FR-Y0.4 |
| No `X-Frame-Options` header is emitted on any of the ten routes or the SPA document | D-1 |
| Startup rejects `FRAME_ANCESTORS` of `'none'`/`'self'`, and rejects a loopback `HOST` | D-1, §6.5 |
| Prompt manifest digests match the template files | A-2 |
| Primary navigation renders exactly two items | FR-2.7 |
| No `dangerouslySetInnerHTML`; no template-literal SQL; no raw hex/px in screen styles | §4.6, §7.2 |
| Case values are rendered only through `AttributedValue` | §3.18 |

**End-to-end (`test:e2e`)** — Playwright, functional and keyboard-only, **not** an accessibility gate:

1. **The full governed loop, keyboard only**: sign in → create a deliberately incomplete entry → read the receipt outcome → open the queue → open the case → read the recommendation and rationale → edit one value and enter a reason → approve → read the audit trail and see the AI-proposed value, the human-changed value, and the reason. Asserts SM-1 (six stages, no workaround) and SM-11 (keyboard completability).
2. **Degraded loop**: with `FakeProvider` forced to `PROVIDER_UNAVAILABLE`, the same walkthrough completes via `EDIT_APPROVE` with a full audit record (SM-13).
3. **Rejection path**: reject with a reason; the case closes `REJECTED`, the trail shows declined proposals with `before_origin='AI'` and the reason verbatim.
4. **No-auto-apply observation**: a case left open for the duration of the suite never changes state on its own.
5. **Focus behaviour**: navigation moves focus to `h1`; a failed submission moves focus to the error summary; summary links focus their fields.
6. **Iframe embedding**: the app loads and completes sign-in inside an iframe, proving D-1's header policy works in the environment the demonstration uses.

### 8.4 Metric-to-test mapping

| Metric | How it is asserted |
|---|---|
| SM-1 loop completeness | `test:e2e` scenario 1 |
| SM-2 decision traceability | `test:api` audit read + `test:e2e` scenario 1 |
| SM-3 provenance attribution (0 unattributed) | DB invariants 11–12, decision API tests, `aev_origin_present_chk` |
| SM-4 auto-apply incidents = 0 | DB invariant 4, arch test (single writer), A-1 privilege test, `test:e2e` scenario 4 |
| SM-5 reason capture | DB invariant 10, decision API reason tests |
| SM-6 audit coverage 1:1 | Transition-enumeration test over all eight actions + DB invariants 5–7 |
| SM-7 audit immutability 100% rejected | DB invariants 1–3 (including as owner) |
| SM-8 exception derivation integrity | DB invariant 8 + receipt tests |
| SM-9 rationale intelligibility | Walkthrough review (human judgement; not automatable) |
| SM-10 / SM-11 / SM-12 accessibility, keyboard, USWDS | §7.7 signed reviews + `test:e2e` keyboard scenarios + conformance register |
| SM-13 degraded completability | `test:e2e` scenario 2 |
| SM-14 scope discipline | The whole `test:arch` suite |

### 8.5 Runtime topology

```
 ┌─────────────────────────────── docker compose ──────────────────────────────┐
 │                                                                             │
 │  ┌───────────────────────────────────────┐   ┌───────────────────────────┐   │
 │  │ cargoexec-web                         │   │ cargoexec-db              │   │
 │  │  node:22.11-slim                      │   │  postgres:16.4            │   │
 │  │  CMD: node dist/index.js              │   │  POSTGRES_DB=cargoexec    │   │
 │  │  listens 0.0.0.0:3000  (published)    │◄─►│  volume pgdata:/var/lib/… │   │
 │  │  ┌─────────────────────────────────┐  │   │  roles: owner / app / ai  │   │
 │  │  │ express: SPA + 10 API routes    │  │   │  healthcheck: pg_isready  │   │
 │  │  │ in-process worker (concurrency 2)│ │   └───────────────────────────┘   │
 │  │  │ pools: app (req) · ai (worker)   │ │                                   │
 │  │  └─────────────────────────────────┘  │   ┌───────────────────────────┐   │
 │  │  healthcheck: `node dist/cli/ping.js` │   │ cargoexec-migrate         │   │
 │  │   (opens a DB connection; NOT an HTTP │   │  one-shot, owner role,    │   │
 │  │    endpoint — see §8.6)               │   │  exits 0 then the web     │   │
 │  └───────────────────────────────────────┘   │  service starts           │   │
 │                                              └───────────────────────────┘   │
 └─────────────────────────────────────────────────────────────────────────────┘
             │ outbound HTTPS (the only egress)
             ▼
     hosted LLM provider
```

One web service, one database. **No** message broker, cache, object store, search index, scheduler, sidecar, or second replica (FR-Y3.12). The worker is in-process precisely so that "an asynchronous actor with more capability than intended" cannot come into existence as a separate deployable.

### 8.6 Why there is no health endpoint

An HTTP liveness endpoint would be an eleventh route, and the endpoint inventory is exhaustive by requirement (FR-Y1.1) with an architecture test pinning it at ten. Liveness is therefore checked **out of band**: the container healthcheck runs `node dist/cli/ping.js`, which opens and closes a database connection and exits non-zero on failure. This keeps the API surface exactly as specified while still giving the orchestrator a signal. Stated explicitly so a future reader does not "fix" the omission.

### 8.7 Deployment sequence

```
1. build      docker build (stage 1 builds contract, web, server; stage 2 runtime)
2. provision  create roles cargoexec_owner / cargoexec_app / cargoexec_ai
              with distinct credentials, supplied via environment only
3. migrate    cargoexec-migrate runs 0001…0010 as the owner, in transactions,
              forward-only. Tables, constraints, indexes, grants, revocations,
              and triggers land together — no window exists in which the audit
              store is mutable (FR-Y0.2)
4. verify     npm run test:db against the deployed database (optional but
              recommended): asserts audit immutability and the absent-column
              list on the real instance
5. account    create-specialist --email … --display-name …  (password entered
              interactively). This is the ONLY insert performed operationally
              through Phase 6 (§10 #7, superseded by step 5a below in Phase 7)
5a. seed      (Phase 7, demonstration deployments only, optional)
              seed-demo-case  — idempotent; safe to run 0, 1, or many times.
              Produces exactly one demonstration case carried through the full
              lifecycle via the real F3→F4→F5→F9→F11→F13 service functions.
              See §8.9. Not run against a deployment that must contain no
              fixture content.
6. start      cargoexec-web: startup self-checks run BEFORE listen —
                 • every required env key present
                 • AI_PROVIDER_URL is https
                 • PROMPT_VERSION exists in the manifest with a matching digest
                 • FRAME_ANCESTORS is not 'none'/'self'
                 • HOST is not loopback
                 • rule-registry integrity (else RULE_SET_INVALID, refuse boot)
              then listen on 0.0.0.0:3000
7. demonstrate  sign in → create an incomplete entry → work the queue →
                read the recommendation → decide with a reason → read the trail
```

Failure to start is always preferred to starting in a state where a governance guarantee is unenforced or the demonstration is unreachable. Each self-check exists because its silent failure mode is worse than a loud one.

### 8.8 Operational characteristics

| Concern | Position |
|---|---|
| Scaling | Single instance. Horizontal scaling is unnecessary at demonstration load and would need no design change if added: all state is in PostgreSQL, sessions are server-side rows, and the worker is idempotent per recommendation (row-locked, `PENDING`-gated) |
| Performance budget | Interactive screens (sign-in, entry form, queue, case detail, audit trail) render within 2 s under demonstration load from a single API call each; generation is off the request path and permitted to take longer with accessible progress status (NFR-10, FR-2.23) |
| Queries | Every query is single-case or the one indexed queue projection; there is no aggregate, no join fan-out beyond a case, and no unbounded list — the largest response is one case's audit trail |
| Timeouts | `SET LOCAL statement_timeout = 10s` on request-path transactions; 20 s per provider attempt with a 45 s budget off the request path |
| Logging | Structured JSON to stdout via pino, one line per request with `request_id`, method, path, status, duration; invariant violations logged at `error` with the internal code and `request_id`. No log aggregation SaaS, no telemetry export (FR-Y3.10) |
| Monitoring | None in v1 beyond container healthchecks and logs. Any metrics pipeline would be the first step toward the supervisory/throughput surface that is out of scope |
| Backups | An operational concern of the hosting environment. The application provides no purge, retention, rollup, archive, or "clear history" path — audit entries are permanent for the life of the deployment (F13 FR-13.14) |
| Data reset | Achieved by dropping and recreating the database (the audit tables cannot be truncated). There is no in-application reset, and no seed step to re-run afterwards |
| Recovery | A `PENDING` recommendation orphaned by a restart stays pending-then-stale; the case remains fully decidable. No sweeper, no recovery scheduler (F9 FR-9.19) |

### 8.9 Phase 7 — seed script: demonstration case (F15)

**What it is.** `server/src/cli/seed-demo-case.ts` is a new, operator-invoked CLI script — placed and provisioned exactly like `create-specialist.ts` (§8.7 step 5): run directly against a deployed environment by a human operator, never invoked by the application itself, never reachable through a session, never an HTTP route, never scheduled. It pre-loads exactly one demonstration cargo case that has already progressed through the full governed loop (received → validated-failed → exception opened → recommendation generated → `EDIT_APPROVE` decision, with mixed AI/HUMAN provenance on the resolution → full audit trail), so later-loop scenarios are repeatably demonstrable without hand-typing an entry live every time (PRD §10 #7, superseded; F15).

**How it avoids tripping the existing absence tests.** Two architecture tests actively forbid a seed/fixture surface, and the script is designed to satisfy both without weakening either:

- `server/test/architecture/absence.spec.ts` (`FORBIDDEN_DIRS` check) forbids a `seeds/` or `fixtures/` **directory** anywhere in the repository. The script is a single file, `server/src/cli/seed-demo-case.ts`, not a directory named `seeds` or `fixtures` — it does not trip this check, and the check's general form is untouched.
- `server/test/architecture/absence.spec.ts` (`TEST-ARCH-11`) and the migration-scanning logic it shares with `validation.spec.ts` forbid `INSERT INTO` in any migration file. The script contains **no migration file and no direct `INSERT`** of any kind: it calls the same repository/service functions the running application uses for a live request (`receipt.service`'s entry-receipt path for F3/F4/F5, `ai/worker.ts`'s generation function for F9, `decision.service` for F11), exactly as an authenticated specialist's request or the post-commit worker dispatch would. The migration-file scan finds nothing to flag because the script is not a migration.

**Both tests are updated, not weakened.** `absence.spec.ts` and `validation.spec.ts` gain a small, additional, narrowly-scoped assertion alongside their existing (unmodified) general prohibitions: that `server/src/cli/seed-demo-case.ts` is the *only* file in the repository whose name or path suggests a seed/fixture mechanism, so a second, undocumented seed script cannot be added later without a test change drawing attention to it. The general-purpose bans — no `seeds/`/`fixtures/` directory anywhere, no `INSERT INTO` in any migration file — remain exactly as strict as they were before Phase 7. This is a named, reviewed, one-script exception, not a hole opened for future use (see `01-components.md` §1A.1a for the same point stated against the component architecture).

**Idempotency.** The script is safe to run zero, one, or many times, including concurrently. At each lifecycle stage it checks whether that stage's row already exists (by the reserved demonstration specialist email, then by the reserved demonstration `entry_number`, then by the presence of a recommendation and a decision on the resulting exception) and performs only the stages not yet completed. Concurrent invocations rely on the same row locks and idempotence guards that make F3/F9/F11 safe under concurrent *live* requests (§1.5 step 10, §5.3 step 2, §1.6 step 7) — the script introduces no locking or idempotence mechanism of its own. A run that finds every stage already present performs no write and exits `0`.

**What it never does.** It never writes directly to `cargo_entries`, `exceptions.state`, `decisions`, `decision_values`, or any other governed table — only through the same service-layer functions a live request would invoke, in-process, without HTTP (F15 FR-15.8). It never fabricates a timestamp or a hash-chain value; every audit entry it causes is written by `audit/writer.ts`'s single `append(tx, entry)` chokepoint (§1A.3, R-L3), participates in the same per-case hash chain as any organically-created case, and passes the same `verify_audit_chain` routine. No `is_seed` column or equivalent exists anywhere in the schema (§2, unchanged) — the fixture/organic distinction is a documentation obligation (README / operator runbook), never a data-level flag.

**Test suite impact.** None. The automated test suites (`test:unit`, `test:db`, `test:api`, `test:e2e`) continue to build their own data through the public API exactly as §8.2 describes, and never invoke `seed-demo-case.ts`. The script is demonstration/operational tooling, orthogonal to the test harness.

---
## 9. Traceability

### 9.1 Feature → architecture matrix

Every FRD feature maps to named components, tables, and endpoints. Every component traces back to a feature.

| Feature | Endpoints | Tables written | Key components | Structural guarantee it carries |
|---|---|---|---|---|
| **F0** Case data model & audit store | none | all thirteen (via others) | `migrations/0001–0010`, `db/canonical`, privileges, four trigger families | Audit immutability, per-value provenance, HITL, audit coupling |
| **F1** Authentication & session | 1, 2, 3 | `specialists`, `sessions` | `session.service`, `session.middleware`, `csrf.middleware`, `htmlRouteGuard`, `cli/create-specialist` | Actor identity for attribution; binary authorisation |
| **F2** USWDS shell & accessibility | none | none | `Shell`, `LiveRegions`, `UswdsForm`, `ErrorSummary`, `ProvenanceBadge`, `AttributedValue`, state components | Colour-independent provenance; 508/AA by construction |
| **F3** Manual entry creation | 4, 5 | `cargo_entries`, `cargo_entry_field_origins` | `receipt.service`, `routes/entries` | Atomic receipt; `HUMAN` provenance baseline; entry immutability |
| **F4** Required-information validation | none | `validation_results`, `validation_findings` | `services/validation/` (31 predicates, frozen domain lists) | Determinism; exceptions derived, never authored |
| **F5** Exception creation | none | `exceptions`, `recommendations` (`PENDING`) | `receipt.service` | Composite FK: no exception without a failing validation |
| **F6** Cargo entry web UI | consumes 4 | none | `NewEntry` | Receipt outcome made visible, not inferred |
| **F7** Review queue & case read | 6, 7 | none | `queue.service`, `caseRead.service` | Single receipt-ordered projection; zero query parameters |
| **F8** Review queue web UI | consumes 6 | none | `Queue` | No filter/sort/assign control exists in the DOM |
| **F9** AI recommendation | 8 | `recommendations`, `recommendation_values` | `ai/provider`, `ai/adapter.http`, `ai/prompt`, `ai/worker`, `pool.ai` | Proposal ≠ resolution; AI cannot write a decision; degradation |
| **F10** Case detail & recommendation UI | consumes 7, 8 | none | `CaseDetail` | Proposal presented as un-applied; provenance on every AI value |
| **F11** Human decision processing | 9 | `decisions`, `decision_values`, `exceptions` (update) | `decision.service` | Only writer of a resolution; per-value origin computed server-side |
| **F12** Decision web UI | consumes 9 | none | `DecisionPanel` | No default action; mandatory reason; confirmation from the server record |
| **F13** Audit entry writer | 10 | `audit_entries`, `audit_entry_values` | `audit/writer` (`append` only), `auditRead.service`, `verify_audit_chain` | One entry per change; append-only; hash chain |
| **F14** Per-case audit trail UI | consumes 10 | none | `AuditTrailRegion` | Read-only; provenance visible; no export affordance |

### 9.2 NFR → mechanism matrix

| NFR | Mechanism in this architecture |
|---|---|
| **NFR-1** USWDS conformance | USWDS 3.11 Sass/JS/sprite bundled; token-only styling (stylelint-enforced); conformance register per control; no bespoke interactive controls (§7.2, §7.3) |
| **NFR-2** Section 508 / WCAG 2.1 AA | Shell-level landmarks, skip link, focus management, form/error pattern, live regions; colour-independent provenance/error/state; 200% zoom and 320 px reflow; signed per-screen review incl. AT walkthrough; **no CI gate** (§7) |
| **NFR-3** Audit immutability | Revoked `UPDATE`/`DELETE`/`TRUNCATE` for all runtime roles + unconditional mutation triggers (all roles incl. owner) + `case_sequence` + SHA-256 hash chain verified at commit + insert-only writer interface + no ORM + no purge path (§2.9, §2.10) |
| **NFR-4** Provenance distinguishability | `origin NOT NULL` with constant `CHECK`s per table; server-only computation; required in every DTO; `Attributed<T>` gate on the only value-rendering component; `ProvenanceBadge` text+icon+colour (§2, §3.9, §3.18) |
| **NFR-5** No auto-apply | Five independent layers: record separation, `decided_by` FK, HITL deferred trigger, `cargoexec_ai` privilege exclusion, import-graph capability test; plus no non-request actor and no bulk/apply parameter (§5.5) |
| **NFR-6** Audit completeness | Five deferred coupling triggers asserting *exactly one*; `append(tx, …)` cannot open its own transaction; loud failure policy; eight-transition enumeration test (§1.4, §2.10) |
| **NFR-7** Traceability without tooling | One case-detail call plus one audit call answer "who decided, what did the AI say, what did the human change, and why" in the UI; no export exists because none is needed (§3.5, §3.15) |
| **NFR-8** Security & access control | Session + CSRF on every state-changing request; binary authorisation; parameterised SQL; strict body parsing; env-only secrets; pino redaction; audit-writer secret denylist that aborts the transaction (§4) |
| **NFR-9** AI dependency resilience | Post-commit dispatch off the request path; terminal enumerated failures; `permitted_decisions` keeps every case decidable; no retry-on-view; bounded concurrency (§5.6) |
| **NFR-10** Responsiveness | One API call per screen; indexed queue projection; single-case queries only; 10 s statement timeout; generation never on the request path; non-blocking 3 s polling (§8.8) |
| **NFR-11** Validation determinism | Pure predicates with no clock/DB/network/random access; `RIV-132` evaluated against the entry's own `received_at`; uniqueness deliberately *not* a rule; byte-identical repeat-evaluation test (§1A.3, §8.3) |
| **NFR-12** Platform | Web only; responsive to tablet width; no native client, no mobile push, and no dependency that implies one (§6.2, §7.4) |

### 9.3 Exclusion → enforcement matrix

Each PROJECT.md / PRD §10 exclusion, and the *architectural* mechanism that makes it unbuildable rather than merely unbuilt.

| Exclusion | Enforcement |
|---|---|
| **Accessibility enforcement in CI** (axe-core, `.github/workflows`) | No `.github/` directory; `axe-core`/`pa11y`/`lighthouse-ci` on the forbidden-dependency list; arch test asserts no CI workflow file and no accessibility runner in the build; the enforcement mechanism is the signed manual review (§7.8) |
| **Supervisor dashboard** (volume, queue health, aging, workload, throughput, reassignment, re-prioritisation) | No `assigned_to`/`priority`/`age_days`/`sla_*` column (schema test, 25 forbidden names); no aggregate or count-by-state query anywhere; no index supporting aging or per-specialist grouping; no dashboard route in the seven-route table; no navigation item beyond two (DOM test); `FR-Y1.3` response-field prohibition (§2.14, §3.13) |
| **Multiple roles / RBAC** | No `role`/`permission`/`scope` column, claim, or config key; no handler performs a role check; authorisation is binary in one middleware; the three *database* roles are not application roles and are not selectable, configurable, or surfaced (§4.2, §2.9.1) |
| **Queue filtering, sorting, assignment, prioritisation** | `GET /api/exceptions` accepts zero query parameters (`400 UNSUPPORTED_QUERY_PARAMETER`); the API accepts zero query parameters in total; `queue.service` has no parameters in its signature; only one index (partial, `receipt_position`) exists, so no other ordering is even efficient; no filter/sort control in the DOM (§3.5, §2.6) |
| **Audit export** | No export endpoint, no `?format=`, no `Accept` variant, no download route, no multi-case audit query; no CSV/XLSX/PDF writer dependency; `auditRead.service` returns one case only; `F13 FR-13.18` asserted by test (§3.15, §6.2) |
| **File or API ingestion** (bulk upload, adapters, ACE/ATS) | Only `POST /api/entries` accepts data, one JSON object at a time; array bodies rejected; no multipart parser installed (so `415` is the only possible outcome); no CLI import command; no adapter module, config key, or interface stub (§3.4, §6.2) |
| **Seeded demonstration dataset** | Migrations create schema objects only (parser test fails on a domain `INSERT`); domain code lists are compiled-in frozen constants, not tables; no seed script or fixture loader in the shipped app; the only operational insert is the first specialist account (§2.13) |
| **Autonomous AI resolution** | The five layers of §5.5, plus: no scheduler/cron/broker dependency, worker capability limited to recommendation generation, `cargoexec_ai` has no decision privilege, and no `apply`/`auto`/`force`/bulk parameter exists in any request type (§5.5, §3.14) |
| **Duty/tariff calculation, classification rulings** | No `hts_code`/`tariff_rate`/`duty_amount` column (schema test); validation is presence/format/closed-domain only, with no computation rule; the AI output schema rejects any field outside the fourteen, making such a determination unrepresentable rather than discouraged (§2.14, §5.3) |
| **Native mobile apps** | Web only; responsive layout to tablet width; no native shell, no mobile push dependency, no app-store artefact (§6.2) |
| **Model training or fine-tuning** | Provider consumed through one request/response interface; no training, fine-tuning, embedding store, vector DB, evaluation harness, or feedback loop; a specialist's edit is recorded in the trail and goes nowhere near the model; no AI SDK or ML dependency (§5.8, §6.2) |

### 9.4 Where this document deviates from the FRD (summary)

Full reasoning is in §0.4. Restated here for the implementer who reads only this section:

| ID | One-line summary |
|---|---|
| **D-1** | **No `X-Frame-Options` is ever sent**, and CSP `frame-ancestors` may never be `'none'`/`'self'` — the app runs inside a preview IFRAME, and FR-Y3.9's `DENY` would make the demonstration unreachable. Compensated by CSRF, no state-changing `GET`, and a scoped `frame-ancestors` allowlist. |
| **D-2** | Cookie `SameSite` is profile-driven (`governed` = `Lax; Secure`, default; `demo-iframe` = `None; Secure`), because a `Lax` cookie is not sent in a cross-site iframe. Recommendation: keep `governed` by serving the app same-origin under a path. |
| **D-3** | Validation runs immediately before a **single** `cargo_entries` `INSERT` that writes the final `receipt_outcome`; nothing ever updates a cargo entry. The FRD's step order requires an `UPDATE` its own privilege grant forbids. Audit order and evaluated-vs-stored equality are preserved; entry immutability is strengthened. |
| **A-1** | A third **database** role, `cargoexec_ai`, for the worker's pool, with no privilege on `decisions`/`decision_values` and no `UPDATE` on `exceptions`. Not an application role; CargoExec still has exactly one. |
| **A-2** | A prompt-template integrity manifest (`prompt_version` → SHA-256), checked at startup, so `prompt_version` is a provable pointer to exact prompt text. |
| **C-1** | `RECOMMENDATION_UNAVAILABLE` records `after_state = 'UNAVAILABLE'`; the enumerated `failure_reason` is joined from `recommendations`. No audit column added. |
| **C-2** | Two-field rules (`RIV-070`, `RIV-073`) emit their finding against a declared `primary_field`, so every finding binds to exactly one control. |
| **C-3** | F3's references to `RIV-150/170/180/181` are stale; F4's table governs (`RIV-101`, `RIV-121`, `RIV-131`). |
| **C-4** | The endpoint inventory is **ten** method/path pairs, pinned by an architecture test. |

### 9.5 Implementation order

Dependency-driven, matching PRD §9.2. Every item is P0, so this is sequencing, not triage.

| # | Deliverable | Done when |
|---|---|---|
| 1 | Migrations 0001–0010, `db/` layer, `audit/writer`, `db/canonical` | The eighteen DB-invariant assertions of §8.3 pass, including as `cargoexec_owner` |
| 2 | Session, CSRF, HTML route guard, `create-specialist` CLI | Auth API tests pass; `/queue` redirects; no audit entry is written at sign-in |
| 3 | USWDS shell, form pattern, live regions, `ProvenanceBadge`, `AttributedValue` | Sign-in screen signed off against the §7.7 checklist, AT walkthrough included |
| 4 | Validation engine + rule registry | All 31 predicates tested; determinism and gating assertions pass |
| 5 | Receipt service (entry + validation + exception + `PENDING` recommendation) | An incomplete entry returns `201 EXCEPTION_OPENED`; an injected audit failure leaves zero rows |
| 6 | Entry UI (`/entries/new`) | Receipt outcome stated explicitly; findings bound field-by-field; screen signed off |
| 7 | Queue API + queue UI | Receipt ordering stable; every query string rejected; no filter/sort control in the DOM; screen signed off |
| 8 | Provider interface, HTTP adapter, prompt + manifest, worker, `pool.ai` | All seven failure branches produce `UNAVAILABLE` with the case still decidable; no decision-service import |
| 9 | Case detail UI with recommendation presentation and polling | Proposal shown as un-applied with provenance; degraded copy correct; screen signed off |
| 10 | Decision API | The ten F11 acceptance criteria pass, including concurrency and idempotency |
| 11 | Decision UI | Three actions with no default; reason required; confirmation rendered from the server response; screen signed off |
| 12 | Audit trail UI + chain surfacing | Trail readable; `chain_verified` shown; no repair, edit, or export affordance; screen signed off |
| 13 | Architecture test suite + E2E walkthroughs | `test:arch` and all six E2E scenarios pass |
| 14 | Walkthrough against PRD §7 | SM-1 through SM-14 evidenced; §7.7 records complete for all screens |

---

*End of TechArch-CargoExec. Source of truth: `.planning/PROJECT.md`; upstream: `project_specs/PRD-CargoExec.md`, `project_specs/FRD-CargoExec.md` (chunks in `project_specs/FRD/`). Chunk sources: `project_specs/TechArch/`.*
