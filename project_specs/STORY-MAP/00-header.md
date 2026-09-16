# User Story Map
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.1 |
| **Date** | 2026-09-11 (Phase 7 update: 2026-09-16) |
| **Related Personas** | PERSONAS-CargoExec.md (PER-01, PER-02, PER-03) |
| **Related Journeys** | JOURNEYS-CargoExec.md (JRN-01.1–01.7, JRN-02.1, JRN-03.1) |
| **Related JTBD** | JTBD-CargoExec.md (JTBD-01.1–01.7, 02.1–02.4, 03.1–03.4) |
| **Related User Stories** | UserStories-CargoExec.md (91 stories, Epics 0–15; Epic 15 added Phase 7) |
| **Related PRD** | PRD-CargoExec.md (§5 Features F0–F15, §7 Success Metrics, §10 Out of Scope) |
| **Source of Truth** | `.planning/PROJECT.md` |

---

## Overview

This map places all 91 existing user stories onto the **governed decision loop as the cargo
specialist experiences it**, and annotates each activity with a Natural Acceptance Criterion
(NaC) derived from a JTBD outcome statement.

**The backbone** — the horizontal spine of the map — is that loop, read left to right in the
order a specialist lives it:

> **sign in → enter a cargo entry → entry validated on receipt → exception raised and queued →
> open an exception from the receipt-ordered queue → read the AI recommendation and rationale →
> decide (edit / approve / reject) with a mandatory reason → audit entry written → review the
> per-case audit trail**

Two lanes sit outside that spine because they are beneath every step of it rather than after any
one of them: the **record substrate** (Epic 0) the loop writes into, and the **federal UI
foundation** (Epic 2) every screen inherits. **Phase 7 adds a third, differently-shaped
outside-the-spine lane:** Epic 15's demonstration-case seed script (F15). Unlike Epic 0 and
Epic 2, it is not beneath or inherited by any specialist-facing step — it is an operator-only,
no-screen tool, run once from the command line, that reaches the same six loop stages through
the identical service calls a live request would use. It is placed at the end of the matrix,
after Federal UI Foundation, precisely because it is outside the cargo specialist's journey
rather than a step within it.

No story is invented here. Every `US-X.Y` in this document exists in UserStories-CargoExec.md,
and every one of the 91 appears exactly once.

---

## Scope Boundary — Read Before Using This Map

**PER-01 (Dana Reyes, cargo specialist) is the only authenticated user of the application and the
actor of 86 of the 91 stories mapped here.** She operates every screen, every endpoint, and is the
actor identity on every audit entry her own actions produce.

**PER-02 (Marcus Hale, oversight reviewer) and PER-03 (Priya Raman, delivery sponsor) are
non-user stakeholders.** In the Persona column of every lane table below they appear only as
**beneficiary (no screen)** or **witness (no screen)** — never as the operator of a backbone
step. Their JTBD outcomes are satisfied by *properties of the record PER-01 produces* and by
*verification evidence*, and are marked **(no screen)** wherever they appear as NaC.

**Phase 7 introduces two narrowly-scoped exceptions to the PER-01-only actor rule, matching
UserStories-CargoExec.md's own Actor Constraint:** Epic 15's five stories (US-15.1–US-15.5) are
written from the point of view of an **operator** — someone preparing a demonstration who runs a
one-time, non-HTTP seed script directly against the deployment — never the authenticated cargo
specialist and never a second application role; and US-9.6 is written from **PER-03's**
point of view, asserting a deployment-configuration fact (a real hosted LLM is what the
walkthrough demonstrates) that no cargo-specialist action can express. Neither exception adds a
screen, a route, or an account, and neither is counted as a PER-01 backbone step.

Nothing excluded by `.planning/PROJECT.md` or PRD §10 appears anywhere in this map, **with one
narrow, Phase-7 exception noted below:** no CI accessibility gate, no supervisor dashboard, no
queue metrics (volume, aging, throughput, workload), no reassignment, no filtering, sorting,
assignment or prioritisation, no audit export, no bulk/file/API ingestion, no second role, no
autonomous AI resolution, no duty or tariff calculation, no native mobile client, and no model
training. Several map entries exist specifically to **assert the absence** of those capabilities
as testable behaviour (US-7.3, US-8.5, US-3.4, US-5.3, US-9.5, US-0.5).

**Phase-7 exception:** the v1.0 exclusion of a *seeded demonstration dataset* (PRD §10 #7) is
**superseded, narrowly, by PRD §5.7 F15.** Epic 15 adds one idempotent, operator-only seed script
that pre-loads exactly one demonstration case through the full governed loop. The reversal is
strictly additive: manual entry (Epic 6 / F6) is unchanged, remains the only way anyone using the
running application creates a case, and is asserted unaffected by US-15.5. This is the only
exclusion in the list above that has moved.

---

## What a NaC Is in This Product

A Natural Acceptance Criterion is **not** a restatement of UI mechanics. It is produced by
intersecting three things that already exist:

1. a **JTBD outcome statement** — the *what matters* (JTBD-01.1 … 03.4);
2. a **journey stage** — the *when and where* (JRN-01.1 … 03.1);
3. a **user story** — the *what is built* (US-0.1 … US-14.7).

The result is written in the specialist's own terms, outcome-shaped, and verifiable. Examples of
the shape used throughout:

- ✅ *"No entry can exist having been received but never assessed."* — outcome-shaped, derived
  from JTBD-01.1's atomicity hiring criterion.
- ❌ *"The POST /api/entries handler wraps persist and validate in a transaction."* — a mechanic,
  not an outcome.

**Non-user NaC.** Where a NaC serves PER-02 or PER-03, it states a property of the system rather
than something either of them can see, and is tagged **(no screen)**. Those are verified by
automated test, per-screen review sign-off, or walkthrough observation — never by a surface built
for a non-user persona.

---
