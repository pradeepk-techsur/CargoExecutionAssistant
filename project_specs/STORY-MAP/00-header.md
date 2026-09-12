# User Story Map
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.0 |
| **Date** | 2026-09-11 |
| **Related Personas** | PERSONAS-CargoExec.md (PER-01, PER-02, PER-03) |
| **Related Journeys** | JOURNEYS-CargoExec.md (JRN-01.1–01.7, JRN-02.1, JRN-03.1) |
| **Related JTBD** | JTBD-CargoExec.md (JTBD-01.1–01.7, 02.1–02.4, 03.1–03.4) |
| **Related User Stories** | UserStories-CargoExec.md (84 stories, Epics 0–14) |
| **Related PRD** | PRD-CargoExec.md (§5 Features F0–F14, §7 Success Metrics, §10 Out of Scope) |
| **Source of Truth** | `.planning/PROJECT.md` |

---

## Overview

This map places all 84 existing user stories onto the **governed decision loop as the cargo
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
foundation** (Epic 2) every screen inherits.

No story is invented here. Every `US-X.Y` in this document exists in UserStories-CargoExec.md,
and every one of the 84 appears exactly once.

---

## Scope Boundary — Read Before Using This Map

**PER-01 (Dana Reyes, cargo specialist) is the only authenticated user and the actor of all 84
stories.** She operates every screen, every endpoint, and is the actor identity on every audit
entry.

**PER-02 (Marcus Hale, oversight reviewer) and PER-03 (Priya Raman, delivery sponsor) are
non-user stakeholders.** In the Persona column of every lane table below they appear only as
**beneficiary (no screen)** or **witness (no screen)** — never as the operator of a backbone
step. Their JTBD outcomes are satisfied by *properties of the record PER-01 produces* and by
*verification evidence*, and are marked **(no screen)** wherever they appear as NaC.

Nothing excluded by `.planning/PROJECT.md` or PRD §10 appears anywhere in this map: no CI
accessibility gate, no supervisor dashboard, no queue metrics (volume, aging, throughput,
workload), no reassignment, no filtering, sorting, assignment or prioritisation, no audit export,
no bulk/file/API ingestion, no second role, no seeded demonstration data, no autonomous AI
resolution, no duty or tariff calculation, no native mobile client, and no model training.
Several map entries exist specifically to **assert the absence** of those capabilities as
testable behaviour (US-7.3, US-8.5, US-3.4, US-5.3, US-9.5, US-0.5).

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
