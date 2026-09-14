---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01-governed-record-substrate-06-PLAN.md
last_updated: "2026-09-14T02:57:05.772Z"
last_activity: "2026-09-14 — 01-06 executed: the audit writer append(tx, entry) (single insert-only chokepoint), tx.ts (sole BEGIN), pool.app/ai.ts, createGovernedCase fixtures, writer.spec.ts (9 groups). Migration 0011 grants UPDATE on cargo_entries to cargoexec_app for the FR-0.6 anchor lock (immutability kept application-level per FR-0.1; user-approved). Full suite 101 tests green, tsc -b clean, migration set 0001–0011 applies cleanly"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 10
  completed_plans: 7
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-11)

**Core value:** A cargo exception is never resolved without an accountable human decision, and every decision — what was recommended, what was chosen, by whom, and when — is permanently traceable.
**Current focus:** Phase 1 — Governed Record Substrate

## Current Position

Phase: 1 of 6 (Governed Record Substrate)
Plan: 01-06 complete (audit writer append(tx, entry) — the single insert-only, transaction-bound audit chokepoint; tx.ts sole BEGIN; two lazy pools; createGovernedCase fixtures every wave-6 suite builds on; migration 0011). 01-07 (architecture suite) also complete. 7 of 10 phase-1 plans have SUMMARYs on disk.
Status: In progress — 01-06 and 01-07 done; next is plan 01-08 (behavioural governance/immutability suite) using createGovernedCase from 01-06
Last activity: 2026-09-14 — 01-06 executed: audit writer append(tx, entry) (single insert-only chokepoint), tx.ts (sole BEGIN), pool.app/ai.ts, createGovernedCase fixtures, writer.spec.ts (9 groups). Migration 0011 grants UPDATE on cargo_entries to cargoexec_app for the FR-0.6 anchor lock (immutability kept application-level per FR-0.1; user-approved). Full suite 101 tests green, tsc -b clean

Progress: [░░░░░░░░░░] 0%

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

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

- **Open assumption (REQUIREMENTS.md):** the 31 validation rules `RIV-010`–`RIV-132` are an implementation assumption open to CBP refinement. Build the Phase 3 rule registry so a rule change is a data change plus a `rule_set_version` bump — never an architectural one.
- **Scope pressure is the named project risk (PRD R-2).** Every phase carries at least one criterion asserting an exclusion is structural. Do not let a plan add a filter, metric, export, role or ingestion path.

## Session Continuity

Last session: 2026-09-14T02:57:05.770Z
Stopped at: Completed 01-governed-record-substrate-06-PLAN.md
Resume file: None
