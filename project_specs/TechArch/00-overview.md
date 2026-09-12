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
 No CI workflow files. No seed data. One web service, one database.
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
- No seed script, fixture loader, or demonstration dataset; migrations create schema objects only.
- No autonomous resolution: no scheduler, cron, queue consumer, retry path, or system actor that can write `exceptions.state`.
- No duty/tariff calculation, HTS or classification field, rate derivation, or risk score — including in the AI output schema, which rejects such fields as schema-invalid.
- No native mobile client, no mobile push, no app shell for one.
- No model training, fine-tuning, embedding store, evaluation harness, or feedback-to-model loop.
- No future-proofing column, endpoint, feature flag, or abstraction layer for any of the above.

---
