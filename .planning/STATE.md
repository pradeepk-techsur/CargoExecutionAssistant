---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 02-06-PLAN.md
last_updated: "2026-09-14T22:46:12.467Z"
last_activity: "2026-09-14 — 02-06 executed: three supertest suites (60 tests) on the withApi harness proving the unauthenticated matrix (criterion 2), the server-resolved actor across four naming vectors + a source scan (criterion 3), and idle/absolute/sign-out expiry recorded on the sessions row with a fixedClock (criterion 1). Test-only plan — no production code changed. User decided to assert 02-04's shipped middleware behaviour rather than restructure the chain."
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 19
  completed_plans: 15
  percent: 79
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-11)

**Core value:** A cargo exception is never resolved without an accountable human decision, and every decision — what was recommended, what was chosen, by whom, and when — is permanently traceable.
**Current focus:** Phase 2 — Identity and the Federal UI Foundation

## Current Position

Phase: 2 of 6 (Identity and the Federal UI Foundation) — IN PROGRESS
Plan: 02-06 complete (the governance suites: guard.spec, actor.spec, expiry.spec — the executable form of phase criteria 2, 3, 1). Plans 02-01/02/03/04/05/06 executed; 02-07 (the SPA calling the session endpoints) is next.
Status: Phase 1 complete (10/10). Phase 2: 02-01…02-06 executed. 02-06 gates green — full npm run test 0 (unit 111, db 114, api 75, arch 67 = 367), typecheck clean, no skipped tests under server/test/api. The three governance criteria are now permanent regression assets. NOTE: criterion 2 is only PARTIALLY evidenced — 02-04 has no API auth gate, so only GET /api/session answers 401 unauthenticated; DELETE⇒403, unimplemented pairs⇒404. Recommended follow-up (owning module 02-04): a requireApiAuth middleware after sessionMiddleware/before csrfMiddleware. See 02-06-SUMMARY.md "Unmet must-haves".
Last activity: 2026-09-14 — 02-06 executed: three supertest suites (60 tests) on the withApi harness proving the unauthenticated matrix (criterion 2), the server-resolved actor across four naming vectors + a source scan (criterion 3), and idle/absolute/sign-out expiry recorded on the sessions row with a fixedClock (criterion 1). Test-only plan — no production code changed. User decided to assert 02-04's shipped middleware behaviour rather than restructure the chain.

Progress: [███████░░░] 79%

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

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

- **Open assumption (REQUIREMENTS.md):** the 31 validation rules `RIV-010`–`RIV-132` are an implementation assumption open to CBP refinement. Build the Phase 3 rule registry so a rule change is a data change plus a `rule_set_version` bump — never an architectural one.
- **Scope pressure is the named project risk (PRD R-2).** Every phase carries at least one criterion asserting an exclusion is structural. Do not let a plan add a filter, metric, export, role or ingestion path.
- Criterion 2 partially unmet (02-06): the phase must_have 'all ten §3.1 pairs answer 401 unauthenticated' is not satisfied — 02-04 lacks an API auth gate. Fix in 02-04: add requireApiAuth (after sessionMiddleware, before csrfMiddleware) so any /api/* except POST /api/session with no principal ⇒ 401, then tighten guard.spec's 4 adjusted assertions back to 401. See 02-06-SUMMARY.md.

## Session Continuity

Last session: 2026-09-14T22:46:04.615Z
Stopped at: Completed 02-06-PLAN.md
Resume file: None
