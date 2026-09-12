### Release R2 — The Loop Holds When the AI Does Not

**Theme:** Resilience and conflict hardening. **No loop stage is introduced here** — every stage
already walks after R1. R2 makes the same loop survive a degraded AI provider, a stale screen,
two tabs, a truncated list, and a lost submission.

**Stories (11):**

| Epic | Stories | What it hardens |
|---|---|---|
| Epic 1 (F1) | US-1.5 | The identity decisions are attributed to cannot be brute-forced |
| Epic 3 (F3) | US-3.3 | A reused entry number is stopped with a route to the existing case |
| Epic 6 (F6) | US-6.5 | Typing survives a failed submission |
| Epic 8 (F8) | US-8.6 | A truncated queue says so rather than misrepresenting outstanding work |
| Epic 9 (F9) | US-9.4 | The case stays fully workable when the AI provider is unavailable |
| Epic 10 (F10) | US-10.5, US-10.6 | Generation in progress never blocks; "no recommendation available" is a condition, not a block |
| Epic 11 (F11) | US-11.6, US-11.7 | No double decision, no adoption of a proposal that was never made |
| Epic 12 (F12) | US-12.6 | An already-decided case or a changed proposal is explained, never silently overwritten |
| Epic 14 (F14) | US-14.5 | An integrity-check failure is surfaced, never silently repaired |

**Loop stages completed:** still 6 of 6 — unchanged. R2 adds no stage and removes no stage.

**Journeys completed end to end:** JRN-01.6 (degraded AI). All R1 journeys remain complete and
gain failure-path depth.

**Personas served:**

| Persona | How R2 serves them |
|---|---|
| **PER-01 Dana** — operator | Keeps working a case to completion when the AI is slow or down, and is never blocked, double-decided, or silently overwritten |
| **PER-02 Marcus** — beneficiary, no screen | The degraded path produces no second-class record shape: same actor, same reason enforcement, same 1:1 coverage, and integrity failures are visible rather than repaired |
| **PER-03 Priya** — witness, no screen | Can watch the walkthrough repeated with the provider stopped and see the loop still complete with a full audit record |

**JTBD addressed:** JTBD-01.6 (in full); the degraded-provider clause of JTBD-03.1; the
outage-invariance clause of JTBD-03.2; reinforcement of JTBD-02.1 (idempotency) and JTBD-02.2
(tamper evidence surfaced).

**Acceptance Gate:**
- [ ] All NaC for the 11 included stories pass
- [ ] SM-13: 100% of cases resolvable with a full audit record while the AI provider is unavailable
- [ ] No loss against SM-2 (traceability) or SM-6 (audit coverage) on the degraded path
- [ ] No phantom or null-origin recommendation entry appears in any trail when no recommendation was generated
- [ ] Release extends failure-path depth without altering any R1 loop behaviour

---

### Release R3 — Conformance Sign-Off and Scope Evidence

**Theme:** The evidence gates that are performed *against* what R1 and R2 shipped. Neither adds a
loop stage; both are, by their nature, checks that can only run after the thing they check
exists. JRN-03.1's final stage — *Check what was declined* — is explicitly a post-demonstration
review.

**Stories (3):**

| Epic | Stories | What it evidences |
|---|---|---|
| Epic 2 (F2) | US-2.6 | A signed per-screen accessibility checklist and assistive-technology walkthrough for all six screens — the enforcement mechanism that replaces the deliberately absent CI gate |
| Epic 7 (F7) | US-7.3 | The queue projection and data model carry no filter, sort, assignment or priority dimension — the exclusion is structural |
| Epic 8 (F8) | US-8.5 | No filtering, sorting, assignment or aging language appears on the queue screen |

**Loop stages completed:** still 6 of 6 — unchanged.

**Journeys completed end to end:** JRN-03.1 (witnessed walkthrough) closes with its
*Check what was declined* stage.

**Personas served:**

| Persona | How R3 serves them |
|---|---|
| **PER-01 Dana** — operator | Uses screens that have each passed a written checklist including a screen-reader walkthrough, rather than screens with conformance promised for later |
| **PER-02 Marcus** — beneficiary, no screen | Unaffected; his guarantees landed in R1 and are unchanged |
| **PER-03 Priya** — witness, no screen | Receives the two things she cannot get from watching the loop run: per-screen sign-off evidence, and a line-by-line scope check against PRD §10 |

**JTBD addressed:** JTBD-03.3 (sign-off evidence), JTBD-03.4 (in full), completion of JTBD-01.7's
verification route.

**Acceptance Gate:**
- [ ] All NaC for the 3 included stories pass
- [ ] SM-10: zero WCAG 2.1 AA violations; 100% of screens reviewed and signed off
- [ ] SM-12: 100% USWDS component conformance across every interactive control
- [ ] SM-14: zero shipped features fall within a PRD §10 exclusion, checked line by line
- [ ] No in-product scope-compliance or governance-status view was built to satisfy this release

---
