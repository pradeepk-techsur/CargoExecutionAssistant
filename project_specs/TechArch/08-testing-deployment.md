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
| Fixtures | Test data is constructed through the public API (`POST /api/entries`) wherever possible, because that path is the only way data enters the product. No seed script or fixture loader exists in the shipped application (PRD §10 #7); test-only builders live under `test/` and are excluded from the production build |

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
              interactively). This is the ONLY insert performed operationally;
              no seed data is created (§10 #7)
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

---
