## Release Planning

### Why the First Release Is the Whole Loop

CargoExec v1 is a **single-release demonstration**, and the thing being demonstrated is the
*complete* governed decision loop. That constrains release structure in a way most products are
not constrained:

- **A partial loop has no demonstration value.** PRD §3.1 #1 and JTBD-03.1 are explicit — five
  working stages out of six is a failed v1 regardless of how polished those five are. PER-03's
  judgement is binary on loop completeness, so a release that defers *recommend* or *audit* is
  not a smaller version of the product, it is a different and worthless one.
- **Every PRD feature is P0.** There is no P2/P3 backlog to stage (PRD §5.0, §9.1) — capabilities
  that would have ranked lower were excluded outright in §10 rather than deprioritised. So there
  is no natural "later" tier of loop capability to pull out of the first release.
- **Therefore R1 is the walking skeleton of the entire loop, end to end** — receive → validate →
  except → recommend → human decide → audit — on an accessible USWDS shell, with the append-only
  record underneath it. It is genuinely end-to-end: after R1, JRN-01.1, 01.2, 01.3, 01.4, 01.5,
  01.7 and 02.1 all complete with no workaround.
- **R2 and R3 are not missing loop stages.** R2 is *resilience* — the loop holding up under a
  degraded AI provider and under conflict, staleness and abuse. R3 is *conformance depth and
  delivery evidence* — the per-screen accessibility sign-off and the post-demonstration scope
  check that JRN-03.1 performs after the walkthrough, by definition not before it.

---

### Release R1 — The Governed Loop, Walking End to End

**Theme:** All six loop stages shipped as browser surfaces over an append-only record, walkable
in one unbroken sitting with hand-created data.

**Stories (70):**

| Epic | Stories |
|---|---|
| Epic 0 (F0) — record substrate | US-0.1, US-0.2, US-0.3, US-0.4, US-0.5 |
| Epic 1 (F1) — sign in | US-1.1, US-1.2, US-1.3, US-1.4 |
| Epic 2 (F2) — USWDS shell | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5 |
| Epic 3 (F3) — entry API | US-3.1, US-3.2, US-3.4 |
| Epic 4 (F4) — validation | US-4.1, US-4.2, US-4.3, US-4.4 |
| Epic 5 (F5) — exception derivation | US-5.1, US-5.2, US-5.3, US-5.4 |
| Epic 6 (F6) — entry UI | US-6.1, US-6.2, US-6.3, US-6.4, US-6.6 |
| Epic 7 (F7) — queue API | US-7.1, US-7.2, US-7.4, US-7.5 |
| Epic 8 (F8) — queue UI | US-8.1, US-8.2, US-8.3, US-8.4 |
| Epic 9 (F9) — recommendation | US-9.1, US-9.2, US-9.3, US-9.5 |
| Epic 10 (F10) — case detail | US-10.1, US-10.2, US-10.3, US-10.4, US-10.7, US-10.8 |
| Epic 11 (F11) — decision API | US-11.1, US-11.2, US-11.3, US-11.4, US-11.5 |
| Epic 12 (F12) — decision UI | US-12.1, US-12.2, US-12.3, US-12.4, US-12.5, US-12.7 |
| Epic 13 (F13) — audit writer | US-13.1, US-13.2, US-13.3, US-13.4, US-13.5 |
| Epic 14 (F14) — audit trail UI | US-14.1, US-14.2, US-14.3, US-14.4, US-14.6, US-14.7 |

**Loop stages completed:** 6 of 6 — receive (Epics 3, 6) → validate (Epic 4) → except (Epics 5,
7, 8) → recommend (Epics 9, 10) → human decide (Epics 11, 12) → audit (Epics 0, 13, 14).

**Journeys completed end to end:** JRN-01.1, JRN-01.2, JRN-01.3, JRN-01.4, JRN-01.5, JRN-01.7,
JRN-02.1.

**Personas served:**

| Persona | How R1 serves them |
|---|---|
| **PER-01 Dana** — operator | Operates every screen and every endpoint; completes the full loop including the keyboard-and-screen-reader path |
| **PER-02 Marcus** — beneficiary, no screen | The record he relies on now exists with every guarantee he needs: append-only, per-value provenance, mandatory reasons, 1:1 coverage, answerable in place by a specialist reading it to him (JRN-02.1) |
| **PER-03 Priya** — witness, no screen | Can watch all six stages walked in one sitting with hand-created data, and receive a structural, test-backed answer on accountability |

**JTBD addressed:** JTBD-01.1, 01.2, 01.3, 01.4, 01.5, 01.7 (in full); JTBD-02.1, 02.2, 02.3,
02.4 (in full); JTBD-03.1 (except the degraded-provider clause), JTBD-03.2, JTBD-03.3 (screens
built conformant; sign-off evidence lands in R3).

**Acceptance Gate:**
- [ ] All NaC for the 70 included stories pass
- [ ] SM-1: 6 of 6 loop stages demonstrable end to end in one browser session, no workaround, no pre-staged data
- [ ] SM-2: 100% of resolved/rejected cases answer the four oversight questions from the UI alone
- [ ] SM-3: zero unattributed values; SM-4: zero auto-apply incidents; SM-5: 100% reason capture
- [ ] SM-6: 1:1 audit coverage; SM-7: 100% of mutation attempts rejected; SM-8: zero exceptions without a validation basis
- [ ] SM-11: all five product tasks completable by keyboard alone
- [ ] PER-02 and PER-03 have received **no** screen, route, permission, export or dashboard

---
