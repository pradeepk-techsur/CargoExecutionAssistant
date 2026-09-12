## Coverage Analysis

### Persona Coverage

| Persona | Access | R1 | R2 | R3 |
|---|---|---|---|---|
| **PER-01** Dana Reyes — cargo specialist | **Authenticated operator** | Operator of all 70 stories | Operator of all 11 stories | Operator/subject of all 3 stories |
| **PER-02** Marcus Hale — oversight reviewer | **Non-user — no screen** | Beneficiary of US-0.1, 0.2, 0.4, 0.5, 1.3, 3.2, 4.1–4.3, 5.1, 5.4, 7.5, 9.3, 10.4, 11.2, 11.4, 13.1–13.5, 14.1–14.4, 14.6, 14.7, 2.5 | Beneficiary of US-11.6, US-14.5 | — (no new guarantee; R1 guarantees unchanged) |
| **PER-03** Priya Raman — delivery sponsor | **Non-user — no screen** | Witness to US-0.5, 2.1, 2.2, 5.3, 6.2, 3.4, 8.1, 9.2, 9.5, 10.3, 11.5, 12.1, 14.1, 14.7 | Witness to US-9.4, US-10.6 | Witness to US-2.6, US-7.3, US-8.5 |

**Non-user constraint check:** PER-02 and PER-03 appear in **beneficiary** and **witness** cells
only. Neither is the operator of a single backbone step, and no story, screen, route, permission,
export or dashboard exists with either as actor. Every NaC serving them is tagged **(no screen)**
and is verified by automated test, per-screen review sign-off, or walkthrough observation.

### Loop-Stage Coverage by Release

| Loop stage | Carried by | R1 | R2 | R3 |
|---|---|---|---|---|
| Sign in (identity for attribution) | Epic 1 | ✅ complete | hardened | — |
| Receive | Epics 3, 6 | ✅ complete | hardened | — |
| Validate | Epic 4 | ✅ complete | — | — |
| Except → queue → open | Epics 5, 7, 8 | ✅ complete | hardened | scope evidence |
| Recommend | Epics 9, 10 | ✅ complete | degraded mode | — |
| Human decide | Epics 11, 12 | ✅ complete | conflict handling | — |
| Audit | Epics 0, 13, 14 | ✅ complete | integrity surfacing | — |
| Federal UI foundation (cross-cutting) | Epic 2 | ✅ complete | — | sign-off evidence |

**No loop stage is deferred past R1.** R2 and R3 contain hardening, resilience and evidence only.

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
| JRN-03.1 Witnessed walkthrough | PER-03 | **Non-user** | R1 for stages 2–5; R2 for the outage probe; **R3** for *Check what was declined* |

**Every journey stage in JRN-01.1 through JRN-01.7 maps to at least one story.** No stage of
JRN-02.1 or JRN-03.1 became a screen, route, role, permission, API consumer, or user story — as
required by the JOURNEYS Scope Boundary.

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
| JTBD-03.1 | PER-03 *(no screen)* | R1, R2 | US-3.4, 6.1, 6.3, 8.1, 9.4, 10.3, 10.6, 12.1, 14.1 | 3 |
| JTBD-03.2 | PER-03 *(no screen)* | R1 | US-0.5, 9.2, 9.5, 11.4, 11.5, 14.3 | 2 |
| JTBD-03.3 | PER-03 *(no screen)* | R1, **R3** | US-2.1, 2.3, 2.6 | 2 |
| JTBD-03.4 | PER-03 *(no screen)* | **R3** | US-2.2, 7.3, 8.5 | 1 |

**15 of 15 jobs covered. 14 of 14 success metrics (SM-1 … SM-14) reachable across R1–R3.**

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
  touchpoint. Covered structurally by the absence of a seeded dataset (US-3.4).

**Orphan stories (mapped to no backbone step):** none. All 84 stories sit on a backbone step or on
one of the two cross-cutting foundation lanes (Substrate, Federal UI Foundation), both of which
are beneath every backbone step rather than outside the loop.

**Personas not served by a release:** none. PER-01 operates in all three; PER-02's guarantees land
in full in R1 and are reinforced in R2; PER-03 witnesses in R1, R2 and R3.

**Deliberate absences — checked, not gaps:**
- No story, lane, activity or NaC introduces a supervisor dashboard, queue metric (volume, aging,
  throughput, workload), reassignment, filter, sort, assignment, prioritisation, audit export,
  bulk/file/API ingestion, second role, seeded demonstration data, autonomous AI resolution, duty
  or tariff calculation, native mobile client, or CI accessibility gate.
- Six stories exist specifically to assert those absences as testable behaviour: US-0.5 (no
  management columns in the schema), US-3.4 (no ingestion path), US-5.3 (no exception authoring),
  US-7.3 (no queue dimensions in the API), US-8.5 (no management language on screen), US-9.5 (no
  autonomous AI resolution). US-2.2 asserts navigation implies nothing that does not exist, and
  US-2.6 asserts the deliberate absence of a CI accessibility workflow.

---
