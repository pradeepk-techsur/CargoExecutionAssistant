## Coverage Analysis

### Persona Coverage

| Persona | Access | R1 | R2 | R3 | R4 (Phase 7) |
|---|---|---|---|---|---|
| **PER-01** Dana Reyes — cargo specialist | **Authenticated operator** | Operator of all 70 stories | Operator of all 11 stories | Operator/subject of all 3 stories | Beneficiary of US-2.7 (accessibility unchanged), US-15.5 (manual entry unaffected); operates no new screen |
| **PER-02** Marcus Hale — oversight reviewer | **Non-user — no screen** | Beneficiary of US-0.1, 0.2, 0.4, 0.5, 1.3, 3.2, 4.1–4.3, 5.1, 5.4, 7.5, 9.3, 10.4, 11.2, 11.4, 13.1–13.5, 14.1–14.4, 14.6, 14.7, 2.5 | Beneficiary of US-11.6, US-14.5 | — (no new guarantee; R1 guarantees unchanged) | Beneficiary of US-15.4 (seeded trail passes the identical chain-verification test) |
| **PER-03** Priya Raman — delivery sponsor | **Non-user — no screen** | Witness to US-0.5, 2.1, 2.2, 5.3, 6.2, 3.4, 8.1, 9.2, 9.5, 10.3, 11.5, 12.1, 14.1, 14.7 | Witness to US-9.4, US-10.6 | Witness to US-2.6, US-7.3, US-8.5 | Actor/witness of US-9.6 (real-LLM posture); witness to US-2.7, US-15.1–US-15.3 |
| **Operator** *(Phase 7, non-persona)* | **Non-user — no screen, CLI only** | — | — | — | Actor of US-15.1, US-15.2, US-15.3, US-15.4, US-15.5 — runs the seed script; never an authenticated application role |

**Non-user constraint check:** PER-02 and PER-03 appear in **beneficiary** and **witness** cells
only. Neither is the operator of a single backbone step, and no story, screen, route, permission,
export or dashboard exists with either as actor. Every NaC serving them is tagged **(no screen)**
and is verified by automated test, per-screen review sign-off, or walkthrough observation. **The
Phase 7 Operator row is the same kind of non-user cell** — a CLI-only actor with no screen, route,
or account, introduced solely to run Epic 15's seed script; it is not a second application role
and does not touch PER-01's single-role constraint (F1, §10).

### Loop-Stage Coverage by Release

| Loop stage | Carried by | R1 | R2 | R3 | R4 (Phase 7) |
|---|---|---|---|---|---|
| Sign in (identity for attribution) | Epic 1 | ✅ complete | hardened | — | — |
| Receive | Epics 3, 6 | ✅ complete | hardened | — | operator-seeded second entry point (Epic 15) |
| Validate | Epic 4 | ✅ complete | — | — | operator-seeded second entry point (Epic 15) |
| Except → queue → open | Epics 5, 7, 8 | ✅ complete | hardened | scope evidence | operator-seeded second entry point (Epic 15) |
| Recommend | Epics 9, 10 | ✅ complete | degraded mode | — | real-LLM posture confirmed (US-9.6); operator-seeded (Epic 15) |
| Human decide | Epics 11, 12 | ✅ complete | conflict handling | — | operator-seeded mixed-resolution case (Epic 15) |
| Audit | Epics 0, 13, 14 | ✅ complete | integrity surfacing | — | operator-seeded case audited through the identical chokepoint (Epic 15) |
| Federal UI foundation (cross-cutting) | Epic 2 | ✅ complete | — | sign-off evidence | design-system-independent conformance re-asserted (US-2.7) |
| Demonstration enablement (cross-cutting, outside the specialist's journey) | Epic 15 | — | — | — | ✅ complete — new in Phase 7 |

**No loop stage is deferred past R1.** R2 and R3 contain hardening, resilience and evidence only.
**R4 (Phase 7) adds no loop stage either** — it adds a second, operator-only entry point into the
same six stages (Epic 15) and reinforces the accessibility guarantee across a visual-system
change (US-2.7); it does not widen the loop itself.

### Journey Coverage

| Journey | Persona | Access | Completed in |
|---|---|---|---|
| JRN-01.1 Sign in and file a clean entry | PER-01 | User | R1 |
| JRN-01.2 Work an exception end to end and approve | PER-01 | User | R1 |
| JRN-01.3 Edit the resolution and approve it | PER-01 | User | R1 |
| JRN-01.4 Reject the recommendation with a reason | PER-01 | User | R1 |
| JRN-01.5 Reconstruct a resolved case from its trail | PER-01 | User | R1 |
| JRN-01.6 Decide with no recommendation available | PER-01 | User | **R2** |
| JRN-01.7 Complete a decision keyboard-only with a screen reader | PER-01 | User | R1 (evidence signed off in R3) |
| JRN-02.1 Oversight reconstruction | PER-02 | **Non-user** | R1 (record properties + test evidence; no surface built) |
| JRN-03.1 Witnessed walkthrough | PER-03 | **Non-user** | R1 for stages 2–5; R2 for the outage probe; **R3** for *Check what was declined*; **R4** reinforces *Watch receive and validate* (real-LLM posture, US-9.6) and *Check the delivered UI against federal standards* (design-system-independent conformance, US-2.7) — no new stage added |

**Every journey stage in JRN-01.1 through JRN-01.7 maps to at least one story.** No stage of
JRN-02.1 or JRN-03.1 became a screen, route, role, permission, API consumer, or user story — as
required by the JOURNEYS Scope Boundary. **Epic 15 (Phase 7) introduces no new journey stage
either** — its seed script gives JRN-03.1's walkthrough a second, faster route into JRN-01.1–01.5
without becoming a stage, screen, or story of its own within those journeys.

### JTBD Coverage

| JTBD ID | Persona | Release(s) | Stories | NaC count |
|---|---|---|---|---|
| JTBD-01.1 | PER-01 | R1, R2 | US-3.1, 3.3, 4.3, 4.4, 5.1, 5.4, 6.1, 6.2, 6.3, 6.5, 9.1 | 6 |
| JTBD-01.2 | PER-01 | R1, R2 | US-5.2, 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 8.4, 8.6 | 4 |
| JTBD-01.3 | PER-01 | R1 | US-2.5, 7.4, 9.2, 10.1, 10.2, 10.3, 10.4 | 4 |
| JTBD-01.4 | PER-01 | R1, R2 | US-11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 11.6, 12.6 | 6 |
| JTBD-01.5 | PER-01 | R1 | US-0.3, 0.4, 5.4, 7.2, 10.7, 13.1, 14.1, 14.3, 14.4, 14.7, 14.2 | 6 |
| JTBD-01.6 | PER-01 | **R2** | US-9.1, 9.4, 10.5, 10.6, 11.7, 13.2 | 4 |
| JTBD-01.7 | PER-01 | R1 (signed off R3) | US-2.3, 2.4, 6.4, 6.6, 8.2, 10.8, 12.3, 12.7 | 4 |
| JTBD-02.1 | PER-02 *(no screen)* | R1, R2 | US-0.5, 1.1, 1.2, 1.3, 1.4, 1.5, 7.5, 11.5, 11.6, 13.2 | 4 |
| JTBD-02.2 | PER-02 *(no screen)* | R1, R2 | US-0.1, 0.4, 13.1, 13.4, 13.5, 14.5, 14.6 | 3 |
| JTBD-02.3 | PER-02 *(no screen)* | R1 | US-0.2, 3.2, 9.3, 11.2, 11.4, 13.3, 14.2, 14.3 | 3 |
| JTBD-02.4 | PER-02 *(no screen)* | R1 | US-3.4, 4.1, 4.2, 4.3, 5.1, 5.3 | 2 |
| JTBD-03.1 | PER-03 *(no screen)*; Operator *(no screen, Phase 7)* | R1, R2, **R4** | US-3.4, 6.1, 6.3, 8.1, 9.4, 10.3, 10.6, 12.1, 14.1, 9.6, 15.1, 15.2, 15.3, 15.4, 15.5 | 8 |
| JTBD-03.2 | PER-03 *(no screen)* | R1 | US-0.5, 9.2, 9.5, 11.4, 11.5, 14.3 | 2 |
| JTBD-03.3 | PER-03 *(no screen)* | R1, R3, **R4** | US-2.1, 2.3, 2.6, 2.7 | 3 |
| JTBD-03.4 | PER-03 *(no screen)* | **R3** | US-2.2, 7.3, 8.5 | 1 |

**15 of 15 jobs covered. 14 of 14 success metrics (SM-1 … SM-14) reachable across R1–R3; SM-1,
SM-9, SM-10, SM-13 further reinforced in Phase 7's R4.**

### Gap Analysis

**JTBD outcomes with no story:** none. All fifteen jobs (JTBD-01.1–01.7, 02.1–02.4, 03.1–03.4)
carry at least one story and at least one NaC.

**Journey stages with no coverage:** none among the seven interactive journeys. Two stages are
*deliberately* uncovered by any story, and correctly so:
- **JRN-02.1:Receive the question** and **JRN-02.1:Ask a specialist** — conversations entirely
  outside the application. Building a notification, handoff or request surface here would breach
  PRD §10 #2 and #4. Their "coverage" is that the trail PER-01 reads is sufficient on its own
  (US-14.1, US-14.7).
- **JRN-03.1:Set the terms** — conditions agreed on the walkthrough itself, with no system
  touchpoint. Through Phase 6 this was covered structurally by the absence of a seeded dataset
  (US-3.4). **Phase 7 narrows, but does not remove, that coverage:** the "no seeded dataset"
  exclusion is superseded by F15 (Epic 15), so this stage is now covered instead by the assertion
  that the one operator-run seed script that does exist is reachable only outside the running
  application — never from a screen, endpoint, or scheduled job (US-15.5) — so "the terms" of the
  demonstration are still set before the walkthrough starts, by an operator, not by the system.

**Orphan stories (mapped to no backbone step):** none. All 91 stories sit on a backbone step or on
one of the three cross-cutting lanes (Substrate, Federal UI Foundation, and — new in Phase 7 —
Demonstration Enablement), the last of which is deliberately *outside* the specialist's journey
rather than beneath a backbone step, because Epic 15 has no specialist-facing surface.

**Personas not served by a release:** none. PER-01 operates in R1–R3 and is a beneficiary (not
operator) of two R4 stories; PER-02's guarantees land in full in R1, are reinforced in R2, and
gain one further guarantee in R4 (US-15.4); PER-03 witnesses in R1, R2, R3 and R4. The Phase-7
**Operator** is a CLI-only, non-persona actor confined entirely to R4 (US-15.1–US-15.5) — it is
never an authenticated application role and never appears outside Epic 15.

**Deliberate absences — checked, not gaps:**
- No story, lane, activity or NaC introduces a supervisor dashboard, queue metric (volume, aging,
  throughput, workload), reassignment, filter, sort, assignment, prioritisation, audit export,
  bulk/file/API ingestion, second role, autonomous AI resolution, duty or tariff calculation,
  native mobile client, or CI accessibility gate.
- Six stories exist specifically to assert those absences as testable behaviour: US-0.5 (no
  management columns in the schema), US-3.4 (no ingestion path), US-5.3 (no exception authoring),
  US-7.3 (no queue dimensions in the API), US-8.5 (no management language on screen), US-9.5 (no
  autonomous AI resolution). US-2.2 asserts navigation implies nothing that does not exist, and
  US-2.6 asserts the deliberate absence of a CI accessibility workflow.
- **One exclusion is no longer absolute:** *seeded demonstration data* (PRD §10 #7, v1.0) is
  **superseded, narrowly, by PRD §5.7 F15** (Phase 7). The reversal is checked, not a gap: it is
  scoped to exactly one operator-run, idempotent seed script (US-15.1, US-15.2, US-15.5), it
  writes through the same service calls and audit chokepoint as any live case (US-15.1, US-15.4),
  and manual entry (F6) is asserted unaffected (US-15.5) — the narrowness itself is the thing
  being verified, not merely the presence of seed data.

---
