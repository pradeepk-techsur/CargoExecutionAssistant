# User Stories
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.1 |
| **Date** | 2026-09-11 (Phase 7 update: 2026-09-16) |
| **Related PRD** | `project_specs/PRD-CargoExec.md` (§5 Features F0–F15, §6 NFRs, §7 Success Metrics) |
| **Related FRD** | `project_specs/FRD-CargoExec.md` (chunked under `project_specs/FRD/`, F00–F15 + Y0–Y3) |
| **Related Personas** | `project_specs/PERSONAS-CargoExec.md` (PER-01 only — see Actor Constraint) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Feature Coverage** | F0–F15 (all sixteen PRD features) |

---

## Story Format

Each story follows: **As a [persona], I want to [action], so that [outcome].**

Acceptance criteria are written as verifiable Given / When / Then statements naming the
concrete states, error codes, rule identifiers, and field-level behaviours specified in the
FRD. Stories are grouped into one epic per PRD feature, so epic *N* is feature `F{N}`.

---

## Actor Constraint — Read Before Using This Document

CargoExec v1 has **exactly one authenticated role: the cargo specialist** (PERSONAS §Scope
Boundary; PRD §10 #3). Therefore:

- **Every story in this document has the same actor: the cargo specialist — PER-01, Dana
  Reyes.** She is the only user who authenticates, the only actor recorded on a decision, and
  the only operator of every screen and every endpoint.
- **PER-02 (CBP oversight / audit reviewer) and PER-03 (CBP delivery sponsor) are non-user
  stakeholders and never appear as the actor of a story.** They do not authenticate, hold no
  account, and have no screen, route, permission, or export in v1. Where the audit trail,
  provenance model, or append-only guarantee exists to serve them, that need is expressed as
  the specialist's story with the stakeholder benefit stated in the **so that** clause — for
  example "so that a later reviewer can reconstruct the decision without asking me for an
  extract". A benefit clause, never an actor.
- **Nothing excluded by `.planning/PROJECT.md` or PRD §10 has a story, with one deliberate
  Phase 7 reversal**: no CI accessibility gate, no supervisor dashboard, no queue
  metrics/aging/throughput/workload, no reassignment, no filtering, sorting, assignment or
  prioritisation, no audit export, no bulk/file/API ingestion, no second authenticated role, no
  autonomous AI resolution, no duty or tariff calculation, no native mobile client, and no model
  training. Several stories exist specifically to *assert the absence* of these capabilities as
  testable behaviour. **Phase 7 reverses exactly one item on this list — seeded demonstration
  data — via new Epic 15 (F15; PRD §5.7, §10 #7 superseded).** Every other exclusion above still
  has zero stories, and F15's reversal is additive: manual entry (F6/Epic 6) is unchanged and
  remains the only way to create any cargo entry beyond the one seeded case (US-15.5).
- **Phase 7 adds two narrowly-scoped, non-cargo-specialist stories; neither introduces a second
  authenticated role.** Epic 15's five stories (US-15.1 … US-15.5) are written from the point of
  view of an **operator** running a one-time, non-HTTP seed script — never the authenticated
  cargo specialist, never a UI feature, and never reachable through a session, screen, or
  endpoint (FRD F15 FR-15.10). Epic 9's new US-9.6 is written from the point of view of the
  **delivery sponsor** (PER-03) because it asserts a deployment-*configuration* fact — a real
  hosted LLM behind the recommendation the sponsor is shown — that no cargo-specialist action can
  express; the recommendation-generation mechanism and every other Epic 9 story are unchanged.
  Outside these two additions, the single-actor rule above is unbroken.

Accessibility criteria (keyboard operability, focus management, error identification, live-region
announcement, colour independence) appear as real acceptance criteria on the UI stories. They are
met **by design and manual review, including an assistive-technology walkthrough per screen — and
explicitly not by an automated CI gate** (PRD §10 #1, NFR-2, F2 FR-2.25/FR-2.26).

---

## The Governed Loop These Stories Cover

**receive → validate → except → recommend → human decide → audit**

| Loop stage | Epics |
|---|---|
| Sign in (identity for attribution) | Epic 1 |
| Receive | Epics 3, 6 |
| Validate | Epic 4 |
| Except → queue → open | Epics 5, 7, 8 |
| Recommend | Epics 9, 10 |
| Human decide | Epics 11, 12 |
| Audit | Epics 0, 13, 14 |
| Federal UI foundation (cross-cutting) | Epic 2 |
| Demonstration enablement (operator, pre-loads the whole loop; Phase 7) | Epic 15 |

---
