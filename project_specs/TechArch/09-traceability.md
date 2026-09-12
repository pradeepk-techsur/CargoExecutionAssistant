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
