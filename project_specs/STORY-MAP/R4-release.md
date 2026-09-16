### Release R4 — Phase 7: Demonstration Enablement & Design-System-Independent Conformance

**Theme:** Two additions made after the governed loop, its resilience, and its conformance
evidence were already complete (R1–R3): an operator-run seed script that removes the
"hand-type an entry every time" cost from demonstrating later loop stages, and an explicit
assertion that the accessibility bar holds regardless of which visual design system renders the
shell — plus the deployment posture confirming the recommendation shown is real-LLM-backed, not
the deterministic test fake.

**Stories (7):**

| Epic | Stories | What it adds |
|---|---|---|
| Epic 2 (F2) | US-2.7 | Federal accessibility conformance is asserted as independent of the visual design system in use — the Phase 7 shell redesign carries no accessibility regression |
| Epic 9 (F9) | US-9.6 | The demonstrated recommendation is confirmed to come from a real hosted LLM in the demo/production posture, not the deterministic fake reserved for tests |
| Epic 15 (F15) | US-15.1, US-15.2, US-15.3, US-15.4, US-15.5 | A seeded demonstration case, built through the same service calls and audit chokepoint as any live case, so every later-loop scenario is demonstrable without hand-typing an entry first |

**Loop stages completed:** still 6 of 6 — unchanged. R4 adds no new loop stage; it adds a second,
operator-seeded entry point into the same six stages, and reinforces the accessibility guarantee
across a visual-system change.

**Journeys completed end to end:** no new JRN stage. JRN-03.1's *Check the delivered UI against
federal standards* stage is reinforced under the new visual system (US-2.7); the seeded case
gives JRN-03.1's walkthrough a second, faster route through JRN-01.1–01.5 without displacing the
manual-entry route.

**Personas served:**

| Persona | How R4 serves them |
|---|---|
| **PER-01 Dana** — operator of the application | Unaffected in her own capability — manual entry (F6) is unchanged and remains the only way she creates a case; she now also works from a UI that keeps its accessibility guarantee across the Phase 7 visual redesign |
| **Operator** (Phase 7, non-persona, no screen) | Can seed one demonstration case with a single CLI invocation, safely re-runnable, reaching only the same service functions and audit chokepoint any live request reaches |
| **PER-02 Marcus** — beneficiary, no screen | The seeded case's audit trail passes the identical chain-verification test as any organic case — no second-class record shape is introduced by seeding |
| **PER-03 Priya** — witness, no screen | Can watch a demonstration that reaches later loop stages without a live hand-typed precondition, and is told the recommendation shown is genuinely model-produced |

**JTBD addressed:** reinforcement of JTBD-03.1 (the walkthrough needs no workaround — now also
true starting from a later stage, and the AI output watched is genuinely model-produced),
reinforcement of JTBD-03.3 (conformance holds under a new visual system).

**Acceptance Gate:**
- [ ] All NaC for the 7 included stories pass
- [ ] Seed script produces exactly one demonstration case, idempotently, using only F3/F4/F5/F9/F11's own service functions and F13's own audit writer — no `INSERT INTO` against a governed table anywhere in the script or in any migration
- [ ] Seeded case's audit trail reports `chain_verified: true` under F0's own verification routine, with no backdated or fabricated timestamp
- [ ] Manual entry (F6) functions completely unchanged after the seed script has run
- [ ] Shell re-delivered under the Phase 7 visual system re-passes the full per-screen accessibility checklist (US-2.6) rather than carrying forward a Phase-6 sign-off
- [ ] Demonstration/production deployment configuration names a real HTTPS LLM endpoint and a real `model_id`, never `fake:deterministic`

---
