---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-01-PLAN.md
last_updated: "2026-09-15T19:50:52.625Z"
last_activity: "2026-09-15 — 03-07 executed (test-only): exceptionBasis.spec.ts (14 cases), receiptAtomicity.spec.ts (12 cases), receiptPaths.spec.ts (11 groups). FINDING: the HITL trigger guards only state<>OPEN, so an UPDATE of validation_result_id/receipt_position on an OPEN exception is not refused at the DB — basis/receipt-position immutability rests on the single write path (asserted architecturally, not at the DB). Assertions 1/4/5/8 of receiptPaths proven RED on planted violations. Commits 1bf7156 (Task 1), d704fd6 (Task 2), 3f87f34 (Task 3)."
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 31
  completed_plans: 28
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-11)

**Core value:** A cargo exception is never resolved without an accountable human decision, and every decision — what was recommended, what was chosen, by whom, and when — is permanently traceable.
**Current focus:** Phase 4 — The Receipt-Ordered Queue

## Current Position

Phase: 4 of 6 (The Receipt-Ordered Queue) — IN PROGRESS
Plan: 04-01 complete — the F7 read-only data layer. It is eight parameterised-SQL functions over Phase 1/3 tables plus the contract DTOs both the server and SPA import; no migration, no new table, no write path. `contract/src/dto.ts` gains RowSummaryDto/QueueResponse (queue) and CaseExceptionRef/RecommendationDetailDto/RecommendationProposedValueDto/DecisionDetailDto/DecisionValueDto/CaseDetailResponse (case detail). `exceptions.ts` gains listOpenExceptions (parameterless, state='OPEN', ORDER BY receipt_position ASC, LIMIT 501), resolveCaseIdentifier (LEFT JOIN → FOUND/ENTRY_PASSED_VALIDATION/NOT_FOUND; value always bound $1, safe on unvalidated input per T-04-01), loadExceptionDetail. `validation.ts` gains loadFindingsByValidationResultIds (= ANY($1::uuid[]) grouped ascending by rule_id, []-short-circuit). New read-only recommendations.ts (loadRecommendationByException/Values) and decisions.ts (loadDecisionByException joins specialists / loadDecisionValues). Remaining phase-4 plans: 04-02 (F7 services), 04-03 (routes), 04-04 (F8 web screen) — status unknown to this run.
Status: Phase 1 complete (10/10). Phase 2 complete (9/9). Phase 3 in progress on disk (03-01..03-08 have summaries; 03-09 the /entries/new screen still to be authored). Phase 4 started: 04-01 gates green — `npm run build:server`/`npm run typecheck` exit 0; `npm run test:db` 167/167 (was 160, +7 new queueRead.repo.spec.ts), 0 regressions; receiptPaths.spec.ts 11/11 unmodified (the Phase 4 read services join its caller allowlist without deleting the test). NOTE for 04-02: compose these repositories in queue.service.ts / caseRead.service.ts — none of the eight functions writes, so the R-L5 guard stays green; the queue read takes NO filter/sort/paging bind (FR-7.2/7.3), only the fixed LIMIT 501 truncation ceiling. Env note: node_modules was absent on the fresh workspace — `npm install --include=dev` is the first command before any build/test.
Last activity: 2026-09-15 — 04-01 executed: contract DTOs (Task 1, df95cbb), five read repositories (Task 2, 5747fe5), DB-tier proof suite (Task 3, 80b6297). Two test-harness fixes caught by the real DB during Task 3: a clean-entry insert must go through append() (coupling trigger refuses a bare cargo_entries insert) and a case close must UPDATE the existing PENDING recommendation to AVAILABLE (uq_recommendations_exception). No production repository change resulted. Deviation: `npm install --include=dev` (Rule 3, blocking — toolchain absent).

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**

- Total plans completed: 1
- Average duration: 5 min
- Total execution time: ~0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-governed-record-substrate P01 | 5 min | 3 tasks | 14 files |
| Phase 01-governed-record-substrate P02 | 2 min | 3 tasks | 4 files |
| Phase 01-governed-record-substrate P03 | 4 min | 2 tasks | 2 files |
| Phase 01-governed-record-substrate P04 | 8 min | 3 tasks | 3 files |
| Phase 01-governed-record-substrate P05 | 6 min | 3 tasks | 3 files |
| Phase 01-governed-record-substrate P07 | 8 min | 3 tasks | 3 files |
| Phase 01-governed-record-substrate P06 | 12 min | 3 tasks | 8 files |
| Phase 01-governed-record-substrate P09 | 9 min | 3 tasks | 3 files |
| Phase 01-governed-record-substrate P08 | 14 min | 2 tasks | 1 files |
| Phase 01-governed-record-substrate P10 | 10 min | 3 tasks | 2 files |
| Phase 02-identity-and-the-federal-ui-foundation P01 | 5 min | 3 tasks | 13 files |
| Phase 02-identity-and-the-federal-ui-foundation P02 | 16 min | 3 tasks | 9 files |
| Phase 02-identity-and-the-federal-ui-foundation P03 | 9 min | 3 tasks | 9 files |
| Phase 02-identity-and-the-federal-ui-foundation P04 | 10 min | 3 tasks | 15 files |
| Phase 02-identity-and-the-federal-ui-foundation P06 | 13 min | 3 tasks | 3 files |
| Phase 02 P07 | 62 min | 3 tasks | 10 files |
| Phase 02 P08 | 6 min | 3 tasks | 6 files |
| Phase 02-identity-and-the-federal-ui-foundation P09 | 22 min | 3 tasks | 6 files |
| Phase 03-receive-validate-except P03 | 4 min | 2 tasks | 4 files |
| Phase 03 P01 | 35 min | 3 tasks | 8 files |
| Phase 03 P02 | 7 min | 2 tasks | 5 files |
| Phase 03-receive-validate-except P08 | 5 min | 2 tasks | 2 files |
| Phase 03-receive-validate-except P04 | 11 min | 3 tasks | 7 files |
| Phase 03-receive-validate-except P05 | 12 min | 2 tasks | 2 files |
| Phase 03-receive-validate-except P06 | 8 min | 3 tasks | 4 files |
| Phase 03 P07 | 12 min | 3 tasks | 3 files |
| Phase 04-the-receipt-ordered-queue P01 | 6 min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phases are vertical slices of the governed loop, not technical layers — every phase after Phase 2 ends with something a cargo specialist can do.
- [Roadmap]: The four structural invariants (append-only audit, per-value provenance, no auto-apply, one audit entry per state change) are scheduled first, in Phase 1, enforced at the database. Adding them later would mean rewriting the schema every other phase is built against.
- [Roadmap]: **The governed loop first closes end to end in Phase 6** (F11 + F12 + F14 together). Phase 6 is not complete until the whole loop is walked in one keyboard-only browser session with hand-created data — once healthy, once with the AI provider stopped.
- [Roadmap]: Accessibility is a Phase 2 foundation inherited by every screen, with per-screen manual + assistive-technology sign-off inside each UI phase. There is no accessibility remediation phase and no CI gate (NFR-2).
- [Roadmap]: Resilience (degraded AI, double decision, stale screen) is delivered inside the phase owning the capability, not deferred — a guarantee that holds only on the happy path is not a guarantee.
- [Stack, TechArch]: Node 22.11.0 / Express 4.21.1 / PostgreSQL 16.4 / USWDS 3.11.0 (Sass + JS), hand-written SQL with no ORM, server on 0.0.0.0:3000, no frame-blocking headers (preview IFRAME). Settled — not revisited by phases.
- [Phase 01-governed-record-substrate]: Migration table is schema_migrations (not node-pg-migrate's default); fixed for all later plans. node-pg-migrate is a runtime dep so the compose migrate service can run it.
- [Phase 01-governed-record-substrate]: exceptions.decision_id is a bare uuid with no FK yet; exceptions_decision_fk is added in migration 0006 (plan 01-04) after the decisions table exists
- [Phase 01-governed-record-substrate]: Entry provenance is a constant CHECK (origin = 'HUMAN') with NOT NULL and no default — no nullable path to an unattributed value; exception derivation integrity is a composite FK, both enforced at the DB with no trigger
- [Phase 01-governed-record-substrate]: Canonical serialisation + entry-hash chain live once in a pure server/src/db/canonical.ts (no db/env/clock/randomness), shared byte-for-byte by the audit writer and the SQL verifier; the fixed hash vector 367a71b6… is pinned by test as a regression anchor for the whole chain
- [Phase 01-governed-record-substrate]: The human-identity crux is decisions.decided_by uuid NOT NULL REFERENCES specialists (id) with no default, against a specialists table with no AI/SYSTEM row — a machine decision fails the FK before any trigger; mixed AI/HUMAN origin is representable only on decision_values
- [Phase 01-governed-record-substrate]: Audit store (0007) is created but LEFT MUTABLE until plan 01-05 (0008 privileges + 0009 triggers); FR-0.17/FR-Y0.2 require the whole set to land in one `npm run migrate` invocation so no deployment window exposes a mutable store. aev_origin_present_chk already makes an unattributed audit value unstorable
- [Phase 01-governed-record-substrate]: Enforcement lands in migrations 0008-0010 (privileges + 11 triggers + read-only verifier) in the same migration set as the tables, so no window exposes a mutable audit store (FR-Y0.2); four governance invariants raise P0001 with fixed prefixes AUDIT_IMMUTABLE/AUDIT_CHAIN_BROKEN/HITL_VIOLATION/AUDIT_COUPLING_VIOLATION asserted verbatim by plans 01-08/09/10
- [Phase 01-governed-record-substrate]: Architecture tests (server/test/architecture/) assert ABSENCE: a .github dir, CI file, forbidden dependency, 26th column, 14th table, widened grant, domain-data INSERT, or cascading delete fails npm run test:arch. Deferred future-surface assertions are comments naming the owning phase, never skipped tests.
- [Phase 01-governed-record-substrate]: §2.14 item 6 (DELETE/TRUNCATE granted to no role) is asserted against non-owner grantees only: cargoexec_owner holds them implicitly by ownership and cannot be revoked; the owner's raw-DELETE is neutralised by trigger and asserted behaviourally in plan 01-08 (§2.14 item 8).
- [Phase 01-governed-record-substrate]: GRANT UPDATE ON cargo_entries TO cargoexec_app (migration 0011): the FR-0.6/FR-13.5 case-anchor FOR UPDATE lock is only grantable to a role holding UPDATE; entry-of-record immutability is kept application-level per FR-0.1 (no UPDATE statement in src), superseding 01-05's privilege-revocation reading of D-3. cargoexec_ai deliberately not granted.
- [Phase 01-governed-record-substrate]: The audit writer (services/audit/writer.ts) is the single write chokepoint: one exported operation append(tx, entry), insert-only, cannot open a transaction; tx.ts is the sole BEGIN/COMMIT/ROLLBACK site (R-L2). occurred_at is SELECT now() inside the tx, never a parameter.
- [Phase 01-governed-record-substrate]: Plan 01-09 governance refusal suite: 52 DB tests prove phase success criteria 2/3/4 — deferred triggers (HITL, five coupling) refuse at COMMIT (P0001), CHECK/FK/UNIQUE/NOT NULL refuse at the statement, each asserted by SQLSTATE + constraint name with a positive control, all from cargoexec_app
- [Phase 01-governed-record-substrate]: TEST-DB-16 immutability of the entry of record is proved application-level (no UPDATE cargo_entries in server/src) not privilege-level: migration 0011 grants cargoexec_app UPDATE on cargo_entries for the FOR UPDATE anchor lock, so a raw UPDATE succeeds at the DB (user-approved reframe)
- [Phase 01-governed-record-substrate]: cargoexec_ai cannot invoke append(): append() takes SELECT ... FOR UPDATE on cargo_entries which needs table UPDATE privilege A-1 denies the AI role; recommendation-status audit entries are written on a path that already holds the anchor. Pinned by immutability.spec.ts so a future UPDATE grant to the AI role fails loudly
- [Phase 01-governed-record-substrate]: Plan 01-10 (final): chain verification proven — TEST-DB-13/14/15. Two concurrent appends serialise under the anchor lock (contiguous seq, no gap/dup, second observably blocked); forged prev_entry_hash refused at COMMIT (AUDIT_CHAIN_BROKEN/P0001); four independent TEMPLATE copies detect excision (false,4,3), alteration (false,3,3), reordering (false,2,2) via linkage and substitution (true,NULL,5) via computeEntryHash recomputation. verify_audit_chain repairs nothing (byte-identical post-tamper, identical second verify). readCaseTrail is the read-only per-case F13 read path. DROP TRIGGER confined to chain.spec.ts throwaway copies. Full test:db gate green (103 db tests).
- [Phase 02-identity-and-the-federal-ui-foundation]: test excludes test:e2e; test:all (with the keyboard-only/focus/in-iframe Playwright suites carrying criterion-4 + D-1 browser proof) is the phase-completion gate; test:unit/db/api/arch is the fast inner loop
- [Phase 02-identity-and-the-federal-ui-foundation]: contract exports resolve @cargoexec/contract to ./dist/index.js so the server runs; npm run build:server (or typecheck) is the first command after a fresh clone before any npx vitest importing the contract
- [Phase 02-identity-and-the-federal-ui-foundation]: server/src/config.ts is environment-only with four fail-loud boot self-checks (loopback HOST §6.5, FRAME_ANCESTORS none/self D-1 §4.5, demo-iframe over http §4.3, missing DATABASE_URL_APP); error messages name the key never the value §4.7; AI keys deferred to phase 5 as a comment not a skipped test
- [Phase 02-identity-and-the-federal-ui-foundation]: securityHeaders disables helmet's framing/CSP defaults and hand-writes the §4.5 CSP; X-Frame-Options is never set (matched on set-shape not the bare name so the explaining comment survives); frame-ancestors only when configured
- [Phase 02-identity-and-the-federal-ui-foundation]: The lazy module logger falls back to a default-config logger with identical §4.7 redaction when loadConfig() is unavailable, so request correlation/logging never crashes a config-less context; boot still refuses a bad env via loadConfig separately
- [Phase 02-identity-and-the-federal-ui-foundation]: errorMapper is the single §3.7 translation point: full PG table (incl phases 3/6 rows, no skipped tests), internal invariant codes logged against request_id and returned as generic 500, ZodError detected structurally, details omitted when empty
- [Phase 02-identity-and-the-federal-ui-foundation]: Password verified before the is_active check and the throttle checked before any DB access, so neither a deactivated account nor account existence is disclosable by response timing; unknown-email verifies against a module-level Argon2id DUMMY_HASH
- [Phase 02-identity-and-the-federal-ui-foundation]: Sessions store only 32-byte SHA-256 digests; raw token/CSRF returned once. revokeSession guarded by revoked_at IS NULL so a sign-out/expiry race keeps the first reason. Idle/absolute expiry proven via injected fixedClock
- [Phase 02-identity-and-the-federal-ui-foundation]: pg is CommonJS: value imports must use the interop-default form under native ESM (CLI fixed; pool.app/ai.ts flagged for 02-04). Queryable is a structural query-interface so Pool/PoolClient/one-shot Client all satisfy it
- [Phase 02-identity-and-the-federal-ui-foundation]: 02-04 ships production-mode SPA serving only (no Vite middleware); §6.5's one-origin-one-port-on-0.0.0.0:3000 is satisfied — a recorded deviation
- [Phase 02-identity-and-the-federal-ui-foundation]: createApp injects the pool and constructs nothing at import time, enabling per-suite test databases and the context-boot test; API_ROUTE_TABLE lists all ten §3.1 pairs as data with three implemented, no 501 placeholders
- [Phase 02-identity-and-the-federal-ui-foundation]: Rotate-on-GET CSRF has a mandatory client half: GET /api/session re-stores the token hash; 02-07's api.getSession must re-store csrf_token or a reload+POST/DELETE 403s while in-session tests still pass
- [Phase 02-identity-and-the-federal-ui-foundation]: csrfMiddleware lets a state-changing method with no implemented route pass so PUT /api/session answers 405, not a masking 403; pool.app/ai.ts converted to pg interop-default import for native ESM boot
- [Phase 02-identity-and-the-federal-ui-foundation]: 02-06 governance suites (guard/actor/expiry.spec, 60 tests) evidence phase criteria 2/3/1 as permanent regression assets; test-only, no production code changed. User decided to assert 02-04's shipped middleware behaviour rather than add an API auth gate.
- [Phase 02-identity-and-the-federal-ui-foundation]: Criterion 2 is only PARTIALLY evidenced: 02-04 has no API auth gate, so only GET /api/session returns 401 unauthenticated (DELETE⇒403, the 7 unimplemented pairs⇒404, /api/unknown⇒404). Follow-up in owning module 02-04: requireApiAuth after sessionMiddleware/before csrfMiddleware would restore uniform 401.
- [Phase 02-identity-and-the-federal-ui-foundation]: 02-07: the CSRF token lives only in a module variable in api/client.ts and is re-stored inside getSession()/signIn() — the client half of 02-04's rotate-on-GET, so a page reload never leaves a dead token (proven by the sign-out-after-reload 204 regression test)
- [Phase 02-identity-and-the-federal-ui-foundation]: 02-07: sign-in is the deliberate exception to the error pattern — one generic ERROR_MESSAGES.AUTH_FAILED item and NO aria-invalid on either input; unknown email and wrong password render an identical screen (asserted in e2e). SessionProvider became the router root layout (needs useNavigate/useAnnounce); old app/session.ts removed
- [Phase 02]: [Phase 02]: The app runs via its own docker-compose.yml — web service command is migrate → create-specialist --from-env --if-absent → serve, every step idempotent (schema_migrations forward-only, ON CONFLICT DO NOTHING); connection strings address the db service name, never localhost. This is the deployment path 02-04's e2e webServer already mirrored.
- [Phase 02]: [Phase 02]: Liveness is out-of-band (node server/dist/cli/ping.js, SELECT 1 on DATABASE_URL_APP, exit 0/1, never prints the connection string) with the §8.6 justification in the file header, so no future reader adds an eleventh HTTP health route past the exhaustive-at-ten inventory.
- [Phase 02]: [Phase 02]: The runtime Docker stage uses npm ci --omit=dev (not a node_modules copy from build); argon2's prebuild re-resolves cleanly in the slim runtime image, so the documented fallback was unnecessary. The bootstrap specialist is the FR-1.13 operational account path (one row in specialists), not seed data — distinction documented in compose/.env.example/README.
- [Phase 02]: 02-09: criterion 5 is now a build constraint. navigation.spec.ts imports web/src .tsx into the server architecture suite and renders via react-dom/server (createElement, no JSX so the file stays navigation.spec.ts) — safe under typecheck because server/tsconfig include=['src'] excludes test/, and vitest transforms via esbuild. It scans AFFORDANCES (to/href/path values in both object-literal and JSX forms, NAV_ITEMS labels, rendered link/button names) not raw tokens, so export/filter/sort/reporter cannot trip it; footer excluded but its link set pinned-and-asserted equal.
- [Phase 02]: 02-09: deviation D-1 is now a build constraint (headers.spec.ts) proven behaviourally over every API_ROUTE_TABLE path + SPA docs across governed±https and demo-iframe+https, and by source scan. The template-literal-SQL gate targets injection (caller data in query text); tx.ts SET LOCAL and writer.ts multi-row-INSERT placeholder scaffold are documented exclusions carrying no caller data.
- [Phase 02]: 02-09: absence.spec.ts's forbidden-dependency gate now covers web/package.json and self-guards the root workspaces array (proven red on a planted axe-core in web) — previously the whole point of the gate leaked for the newest workspace. Added persistent gates: no raw hex/px in web/src/**/*.tsx (web/styles/ excluded), no Playwright html/reports artefact, no CDN host under web/. Allowlist-equality assertion deferred to Phase 5 (named in the TODO).
- [Phase 02]: 02-09: accessibility enforcement = the signed §7.7 record, never a CI gate. docs/a11y/{shell,sign-in}.md carry the checklist (machine lines annotated with the proving test, human lines countersigned), the AT walkthrough, and reviewer Pradeep K / 2026-09-15 / no defects. docs/uswds-conformance-register.md maps every control to its USWDS basis and is append-only across phases.
- [Phase 03-receive-validate-except]: 03-03: requireApiAuth mounted after sessionMiddleware, before csrfMiddleware — every /api/* except POST /api/session with no principal ⇒ 401 UNAUTHENTICATED via errorMapper, uniform across implemented/unimplemented/unknown paths. Closes the 02-06 carry-forward; Phase 2 criterion 2 now fully evidenced (guard.spec 77 api tests). The 404/405 distinction is reserved for authenticated callers.
- [Phase 03-receive-validate-except]: VALIDATION_ENGINE_FAILURE is an application-level internal invariant code (rule predicate throws / out-of-set finding) — in INTERNAL_INVARIANT_CODES, never ERROR_CODES; surfaces only as generic 500 RECEIPT_FAILED. Receipt repositories are Queryable-first, static-SQL, bind-only; both multi-row inserts use unnest() keeping the template-literal-SQL exclusion list at two files. No migration added — schema.spec still pins thirteen tables.
- [Phase 03]: 03-02: RIV-2026.09 built as data — 31-rule RULES registry with per-rule pure predicates, four frozen domain code lists, and normalisers; a rule/message/code change is a data change plus a RULE_SET_VERSION bump, never architectural (STATE.md instruction satisfied). Mechanism (gating/ordering/determinism/engine) deferred to 03-04. 71 unit cases pass identically under TZ=UTC and TZ=Pacific/Kiritimati.
- [Phase 03-receive-validate-except]: 03-08: SelectField/TextAreaField/DateField/Fieldset added to the ONE form pattern via shared useFieldIds+FormGroup; Field markup byte-identical (29 e2e + navigation.spec green). Char count is React-rendered (aria-live=polite), not USWDS JS. DateField is type=text + YYYY-MM-DD hint, calendar init a guarded no-op — the installed @uswds build exposes only window.uswdsPresent, no imperative on() (deviation D-1). api.createEntry/getEntry route through request() so the rotated CSRF token attaches automatically; no retry/idempotency/coercion/401-casing added; DTO types from @cargoexec/contract.
- [Phase 03-receive-validate-except]: 03-05: receipt.service.ts receiveEntry() is THE atomic receipt transaction and the sole writer of cargo_entries/cargo_entry_field_origins/validation_results/validation_findings/exceptions-insert. §1.5 steps 6–18 in one withTransaction: validate BEFORE the single INSERT (D-3) so receipt_outcome is final and written once (no cargo_entries UPDATE); three append(tx) audit entries (ENTRY_RECEIVED SPECIALIST, VALIDATION_COMPLETED/EXCEPTION_OPENED SYSTEM-on-behalf, no reason); the deferred coupling triggers turn a missing audit into a failed COMMIT → 500 RECEIPT_FAILED. EntryNumberDuplicateError (23505 on the NAMED constraint) carries the existing case_reference, resolved on the pool AFTER rollback. Invalid arrival_date stored NULL via a shallow copy + RIV-131 (never mutate submitted). AI dispatch is a post-commit, optional, never-awaited injected seam — no server/src/ai import. No skip/mode/force arg. NOTE for 03-06: the ROUTE owns raw-body normalisation into CanonicalEntryRecord + provided[]; this service is HTTP-free and testable at the db tier. NOTE: RIV-011 normalises with upperAlnum() before matching, so a lowercase entry_number PASSES the format rule while being stored byte-verbatim (03-05 plan's contrary claim was inaccurate; test corrected).
- [Phase 03-receive-validate-except]: 03-04: F4 evaluation mechanism built over 03-02's rule data — pure evaluate(record, receivedAt) with declared requires_passed gating (never array position), no short-circuit, ascending rule_id findings, two-value PASS/FAIL, RULE_SET_VERSION stamp and no clock read; determinism PROVEN (two calls, two processes, advanced fake clock + converse received_at control). assertRuleRegistryValid() throws RULE_SET_INVALID before app.listen (not in createApp). validation.spec.ts makes purity/no-endpoint/no-bypass/no-grading/no-reference-table build constraints; purity assertion proven RED on a planted Date.now(). Deviation: purity regex narrowed to zero-arg new Date() so normalise.ts's deterministic argument-form date parse is allowed.
- [Phase 03-receive-validate-except]: 03-06: the two F3 endpoints live in routes/entries.ts over receiveEntry. The route draws the structural-vs-required-information line: a .strict() zod schema (all 14 fields optional) makes an unknown property / client-supplied actor / skip-force flag a 422, while a required-information failure is a 201 with receipt_outcome EXCEPTION_OPENED and findings — no RIV code is ever an HTTP error. quantity '0' / negative declared value / calendrically-invalid arrival_date are 201s with RIV findings (F4's business), never 422s. API_ROUTE_TABLE is five-of-ten implemented (still ten rows); CSRF and the 405-on-unregistered-method both follow from the flag with no code change.
- [Phase 03-receive-validate-except]: 03-06: a genuinely clean ocean entry provides THIRTEEN fields, not fourteen — RIV-073 forbids both a bill of lading and an air waybill, so field_origins has 13 HUMAN rows. Numeric byte-verbatim storage only holds at the column's scale (quantity numeric(14,3) / declared_value_usd numeric(14,2) reformat on the ::text read in loadEntryDetail), so the test submits numerics already at scale, matching 03-05's receipt.spec. requestId is read from res.locals['requestId'] (there is no req.requestId) and passed to receiveEntry for the audit request_id.
- [Phase 03]: 03-07: criterion 4 evidenced by SQL (exceptions_basis_fk 23503, a foreign key not a P0001 trigger) + by code/API/UI (one write path, no authoring route, no authoring affordance) and criterion 5 by an eight-table census identical after forced mid-transaction failures. FINDING: the HITL trigger guards only state<>OPEN, so an UPDATE of validation_result_id/receipt_position on an OPEN exception is NOT refused at the DB — basis/receipt-position immutability rests on the single write path, asserted architecturally. No production code changed.
- [Phase 04-the-receipt-ordered-queue]: 04-01: the F7 read model is eight parameterised-SQL functions over Phase 1/3 tables — listOpenExceptions (parameterless, state='OPEN', LIMIT 501, ascending receipt_position), resolveCaseIdentifier (LEFT JOIN → FOUND/ENTRY_PASSED_VALIDATION/NOT_FOUND, value always bound ), loadExceptionDetail, loadFindingsByValidationResultIds (= ANY(::uuid[]) grouped), plus new read-only recommendations.ts/decisions.ts. No migration, no write path; closed cases stay reachable by identifier while filtered from the open queue.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

- **Open assumption (REQUIREMENTS.md):** the 31 validation rules `RIV-010`–`RIV-132` are an implementation assumption open to CBP refinement. Build the Phase 3 rule registry so a rule change is a data change plus a `rule_set_version` bump — never an architectural one.
- **Scope pressure is the named project risk (PRD R-2).** Every phase carries at least one criterion asserting an exclusion is structural. Do not let a plan add a filter, metric, export, role or ingestion path.
- ~~Criterion 2 partially unmet (02-06)~~ **RESOLVED by 03-03:** requireApiAuth now runs after sessionMiddleware and before csrfMiddleware, so every /api/* except POST /api/session with no principal ⇒ 401 UNAUTHENTICATED (uniform across implemented/unimplemented/unknown paths). guard.spec tightened; api tier 77/77 green. Phase 2 criterion 2 is fully evidenced.
- **Pre-existing unit failure (out of scope for 03-03, owner = 03-01):** `server/test/unit/scaffolding.spec.ts` expects 8 `INTERNAL_INVARIANT_CODES` but 03-01 (commit f12ed52) added a 9th (`VALIDATION_ENGINE_FAILURE`) without updating the spec. Logged in `.planning/phases/03-receive-validate-except/deferred-items.md`.

## Session Continuity

Last session: 2026-09-15T19:50:52.623Z
Stopped at: Completed 04-01-PLAN.md
Resume file: None
