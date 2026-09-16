## Story Index

**91 stories across 16 epics (one epic per PRD feature, F0–F15; Epic 15 added Phase 7). Every
story's actor is the cargo specialist — PER-01, Dana Reyes — with two narrowly-scoped Phase 7
exceptions: Epic 15 (operator) and US-9.6 (delivery sponsor); see 00-header.md §Actor Constraint.**

### Summary by Epic

| Epic | Feature | Stories | P0 | P1 |
|------|---------|---------|----|----|
| Epic 0 — Case Data Model & Append-Only Audit Store | F0 | 5 | 5 | 0 |
| Epic 1 — Cargo Specialist Authentication & Session | F1 | 5 | 4 | 1 |
| Epic 2 — USWDS Application Shell & Accessibility Foundation | F2 | 7 | 7 | 0 |
| Epic 3 — Manual Cargo Entry Creation | F3 | 4 | 3 | 1 |
| Epic 4 — Required-Information Validation on Receipt | F4 | 4 | 4 | 0 |
| Epic 5 — Exception Creation from Validation Failure | F5 | 4 | 4 | 0 |
| Epic 6 — Cargo Entry Web UI | F6 | 6 | 5 | 1 |
| Epic 7 — Review Queue (API) | F7 | 5 | 5 | 0 |
| Epic 8 — Review Queue Web UI | F8 | 6 | 5 | 1 |
| Epic 9 — AI Resolution Recommendation Generation | F9 | 6 | 6 | 0 |
| Epic 10 — Exception Case Detail & Recommendation Presentation UI | F10 | 8 | 7 | 1 |
| Epic 11 — Human Decision Processing (API) | F11 | 7 | 6 | 1 |
| Epic 12 — Decision Web UI with Reason Capture | F12 | 7 | 6 | 1 |
| Epic 13 — Audit Entry Writer | F13 | 5 | 5 | 0 |
| Epic 14 — Per-Case Audit Trail Web UI | F14 | 7 | 7 | 0 |
| Epic 15 — Seeded Demonstration Case (Phase 7) | F15 | 5 | 5 | 0 |
| **Total** | **F0–F15** | **91** | **84** | **7** |

### Full Index

| Story | Title | Priority | Feature Ref |
|-------|-------|----------|-------------|
| US-0.1 | Decision history that cannot be rewritten afterwards | P0 | F0 |
| US-0.2 | Every recorded value attributed to AI or to me, value by value | P0 | F0 |
| US-0.3 | My submitted entry preserved exactly as I typed it | P0 | F0 |
| US-0.4 | Unambiguous event order with tamper evidence | P0 | F0 |
| US-0.5 | Structural impossibility of a case closing without my decision | P0 | F0 |
| US-1.1 | Sign in as a cargo specialist | P0 | F1 |
| US-1.2 | Be kept out of the application until I am signed in | P0 | F1 |
| US-1.3 | Have my identity attached to everything I do | P0 | F1 |
| US-1.4 | Have my session end predictably and sign out deliberately | P0 | F1 |
| US-1.5 | Be protected from repeated guessing at my account | P1 | F1 |
| US-2.1 | Work in a page frame that looks and behaves like a federal application | P0 | F2 |
| US-2.2 | Move between exactly the two places the product has | P0 | F2 |
| US-2.3 | Complete every task using the keyboard alone | P0 | F2 |
| US-2.4 | Be told clearly what went wrong and where, in a way my screen reader announces | P0 | F2 |
| US-2.5 | Tell an AI value from a human value without relying on colour | P0 | F2 |
| US-2.6 | Have every screen reviewed and signed off for accessibility before it is called done | P0 | F2 |
| US-2.7 | Keep meeting federal accessibility standards no matter which visual system renders the shell | P0 | F2 |
| US-3.1 | Have my entry received and assessed in one indivisible step | P0 | F3 |
| US-3.2 | Have my keystrokes recorded exactly as typed and attributed to me | P0 | F3 |
| US-3.3 | Be told plainly when the entry number already exists | P1 | F3 |
| US-3.4 | Have no way to get data in that skips validation | P0 | F3 |
| US-4.1 | Have my entry checked against the required-information rules the moment I submit it | P0 | F4 |
| US-4.2 | Read a plain-language reason naming the rule and the field | P0 | F4 |
| US-4.3 | Rely on the same entry always producing the same findings | P0 | F4 |
| US-4.4 | Have a clean entry recorded as explicitly clean | P0 | F4 |
| US-5.1 | Have a failing entry become a case with a stated basis | P0 | F5 |
| US-5.2 | Have cases ordered by when they arrived, permanently | P0 | F5 |
| US-5.3 | Have no way to open, reopen, or park a case outside the loop | P0 | F5 |
| US-5.4 | Identify a case by one human-readable reference everywhere | P0 | F5 |
| US-6.1 | Fill in a cargo entry on a clearly labelled USWDS form | P0 | F6 |
| US-6.2 | Submit a deliberately incomplete entry without the browser stopping me | P0 | F6 |
| US-6.3 | Be told plainly what happened to my entry | P0 | F6 |
| US-6.4 | See exactly which fields failed which rules | P0 | F6 |
| US-6.5 | Not lose my typing when something goes wrong | P1 | F6 |
| US-6.6 | Create an entry and open the resulting case with the keyboard alone | P0 | F6 |
| US-7.1 | Get the open exceptions in strict receipt order | P0 | F7 |
| US-7.2 | See only open cases in the queue, and still reach a decided one by its link | P0 | F7 |
| US-7.3 | Have the queue carry no management dimensions at all | P0 | F7 |
| US-7.4 | Open one case and receive everything I need to decide it | P0 | F7 |
| US-7.5 | Rely on the server, not the screen, to say which decisions are available | P0 | F7 |
| US-8.1 | See the open exceptions as an accessible list in receipt order | P0 | F8 |
| US-8.2 | Open a case from the queue with the keyboard | P0 | F8 |
| US-8.3 | Be told plainly when there is nothing to work, and be shown where to start | P0 | F8 |
| US-8.4 | Return to the queue after a decision and understand what changed | P0 | F8 |
| US-8.5 | Have no filtering, sorting, assignment, or aging language on the screen | P0 | F8 |
| US-8.6 | Be told when the list is showing only the first 500 cases | P1 | F8 |
| US-9.1 | Have a recommendation prepared for me without waiting for it | P0 | F9 |
| US-9.2 | Read a recommendation that is stored as a proposal, not as a change | P0 | F9 |
| US-9.3 | Know exactly what the AI said, and which model said it | P0 | F9 |
| US-9.4 | Keep working the case when the AI is unavailable | P0 | F9 |
| US-9.5 | Be certain the AI cannot decide, and cannot stray outside its remit | P0 | F9 |
| US-9.6 | Know that the recommendation shown came from a real model, not the test fake | P0 | F9 |
| US-10.1 | Read why this case is open | P0 | F10 |
| US-10.2 | Read back the values I submitted | P0 | F10 |
| US-10.3 | Read the recommended action and why the AI recommends it | P0 | F10 |
| US-10.4 | Tell every AI-suggested value from my own at the moment of deciding | P0 | F10 |
| US-10.5 | See a recommendation still being generated without being blocked or interrupted | P1 | F10 |
| US-10.6 | Decide a case that has no recommendation, without being told something failed | P0 | F10 |
| US-10.7 | Read a closed case as a final, unchangeable record | P0 | F10 |
| US-10.8 | Read the case in one predictable order with no queue or aging language | P0 | F10 |
| US-11.1 | Approve the recommendation as proposed | P0 | F11 |
| US-11.2 | Edit the recommendation and approve my version | P0 | F11 |
| US-11.3 | Reject a recommendation and close the case without adopting it | P0 | F11 |
| US-11.4 | Be required to say why whenever I edit or reject | P0 | F11 |
| US-11.5 | Be certain nothing resolves without my decision | P0 | F11 |
| US-11.6 | Never decide the same case twice, even from two tabs | P1 | F11 |
| US-11.7 | Be prevented from approving a recommendation that does not exist | P0 | F11 |
| US-12.1 | Choose among three actions with nothing chosen for me | P0 | F12 |
| US-12.2 | Edit the proposed values and see which ones I changed | P0 | F12 |
| US-12.3 | Write my reason, and be told accessibly if I have not | P0 | F12 |
| US-12.4 | See exactly what will be recorded before it is recorded | P0 | F12 |
| US-12.5 | Be shown what was actually recorded, from the server's own record | P0 | F12 |
| US-12.6 | Be handled gracefully when the case was already decided or the proposal changed | P1 | F12 |
| US-12.7 | Complete the whole decision by keyboard, and find nothing left to click afterwards | P0 | F12 |
| US-13.1 | Have every state change on my case recorded exactly once | P0 | F13 |
| US-13.2 | Have who, what, when, before, after, and origin all captured | P0 | F13 |
| US-13.3 | Have my reason travel with the event that carries it | P0 | F13 |
| US-13.4 | Know that no one can edit or delete the history — ever | P0 | F13 |
| US-13.5 | Have an unauditable change fail loudly rather than proceed quietly | P0 | F13 |
| US-14.1 | Read the whole story of a case in the case itself | P0 | F14 |
| US-14.2 | See the AI and the humans distinguished on every event and every value | P0 | F14 |
| US-14.3 | Read the reason I gave, in full | P0 | F14 |
| US-14.4 | See complete before-and-after values with nothing ambiguous | P0 | F14 |
| US-14.5 | Be told if the record's integrity check fails | P0 | F14 |
| US-14.6 | Find nothing on the trail that can change it or take it away | P0 | F14 |
| US-14.7 | Answer the oversight questions from the case alone | P0 | F14 |
| US-15.1 | Build the demonstration case through the same code the live application uses, never a shortcut | P0 | F15 |
| US-15.2 | Run the script any number of times without creating a duplicate of anything | P0 | F15 |
| US-15.3 | See one case that genuinely demonstrates a mixed AI/human resolution | P0 | F15 |
| US-15.4 | Trust that the seeded case's audit trail is real, complete, and indistinguishable from a live one | P0 | F15 |
| US-15.5 | Keep the seed script a narrow, operator-only tool that the application itself can never reach | P0 | F15 |

---

## Coverage Checks

### Feature coverage (PRD §5)

| Feature | Covered by |
|---|---|
| F0 | US-0.1 … US-0.5 |
| F1 | US-1.1 … US-1.5 |
| F2 | US-2.1 … US-2.7 |
| F3 | US-3.1 … US-3.4 |
| F4 | US-4.1 … US-4.4 |
| F5 | US-5.1 … US-5.4 |
| F6 | US-6.1 … US-6.6 |
| F7 | US-7.1 … US-7.5 |
| F8 | US-8.1 … US-8.6 |
| F9 | US-9.1 … US-9.6 |
| F10 | US-10.1 … US-10.8 |
| F11 | US-11.1 … US-11.7 |
| F12 | US-12.1 … US-12.7 |
| F13 | US-13.1 … US-13.5 |
| F14 | US-14.1 … US-14.7 |
| F15 | US-15.1 … US-15.5 |

Sixteen of sixteen features covered; every story references at least one feature.

### `.planning/PROJECT.md` Active requirement coverage

| Active requirement | Covered by |
|---|---|
| Cargo entries can be entered manually into the system | US-3.1, US-3.2, US-3.4, US-6.1, US-6.2 |
| Each entry is validated against required-information rules on receipt | US-3.1, US-4.1, US-4.2, US-4.3, US-4.4 |
| Entries that fail validation become exceptions and enter a review queue | US-5.1, US-5.2, US-5.3, US-6.3, US-7.1 |
| The queue lists open exceptions in receipt order, and a specialist can open one | US-7.1, US-7.2, US-7.4, US-8.1, US-8.2 |
| AI generates a recommended resolution action with a plain-language rationale | US-9.1, US-9.3, US-10.3, US-10.4 |
| A cargo specialist can edit, approve, or reject — no recommendation auto-applies | US-0.5, US-9.2, US-9.5, US-11.1, US-11.2, US-11.3, US-11.5, US-12.1 |
| Rejections and edits capture a reason so the record explains itself | US-11.4, US-12.3, US-13.3, US-14.3 |
| Every state change writes an append-only audit entry: who, what, when, before/after, AI-vs-human origin | US-0.1, US-0.2, US-0.4, US-13.1, US-13.2, US-13.4, US-13.5 |
| The audit trail is viewable per case in the UI | US-14.1, US-14.2, US-14.4, US-14.6, US-14.7 |
| Authenticated users sign in as a cargo specialist | US-1.1, US-1.2, US-1.3, US-1.4 |
| The UI follows USWDS and meets Section 508 / WCAG 2.1 AA (Phase 7: regardless of visual design system) | US-2.1 … US-2.7, and the accessibility criteria on US-6.6, US-8.2, US-10.8, US-12.7, US-14.7 |

Eleven of eleven Active requirements covered. **Phase 7 additionally supersedes one PROJECT.md Out
of Scope item** (§10 #7, seeded demonstration dataset), covered below.

### Phase 7 supersession coverage

| Superseded exclusion | Covered by |
|---|---|
| PROJECT.md §Out of Scope — "Seeded demonstration dataset" (PRD §10 #7, superseded by §5.7 F15) | US-15.1 … US-15.5 |

### Success-metric coverage (PRD §7)

| Metric | Asserted in |
|---|---|
| SM-1 Governed loop completeness | US-3.1, US-4.1, US-5.1, US-6.3, US-8.1, US-10.3, US-12.1, US-14.1 |
| SM-2 Decision traceability | US-14.7 |
| SM-3 Provenance attribution | US-0.2, US-10.4, US-11.2, US-14.2 |
| SM-4 Auto-apply incidents (0) | US-0.5, US-9.5, US-11.5 |
| SM-5 Reason capture completeness | US-11.4, US-12.3, US-14.3 |
| SM-6 Audit coverage 1:1 | US-13.1 |
| SM-7 Audit immutability | US-0.1, US-13.4 |
| SM-8 Exception derivation integrity | US-0.5, US-5.1 |
| SM-9 Rationale intelligibility | US-9.3 |
| SM-10 Accessibility conformance | US-2.6, US-2.7, US-6.6, US-8.2, US-10.8, US-12.7, US-14.7 |
| SM-11 Keyboard completeness | US-2.3, US-6.6, US-8.2, US-12.7 |
| SM-12 USWDS conformance (Phase 7: design-system-independent) | US-2.1, US-2.6, US-2.7 |
| SM-13 Degraded-mode loop completability | US-9.4, US-10.6, US-11.7 |
| SM-14 Scope discipline | US-3.4, US-5.2, US-5.3, US-7.3, US-8.5, US-10.7, US-13.4, US-14.6 |

### Scope-boundary check

| Check | Result |
|---|---|
| Every story's actor is the cargo specialist (PER-01), with two narrowly-scoped Phase 7 exceptions | ✅ 86 of 91 are PER-01; Epic 15 (5 stories) is written from the operator running a one-time, non-HTTP seed script (FR-15.10), and US-9.6 is written from the delivery sponsor's point of view for a deployment-configuration fact only — neither adds a second authenticated role (see 00-header.md §Actor Constraint) |
| PER-02 (oversight reviewer) appears as an actor | ✅ Never — referenced only in **so that** benefit clauses (US-0.1, US-14.7) |
| PER-03 (delivery sponsor) appears as an actor | ⚠️ Once — US-9.6 only, for a deployment-configuration assertion no cargo-specialist action can express; no screen, route, or account is implied (see 00-header.md §Actor Constraint) |
| A story implies a second role, permission, or RBAC check | ✅ None — US-1.2 and US-1.3 assert binary authorisation and the absence of a role column |
| A story implies a supervisor dashboard, queue metric, aging, throughput, workload, reassignment, or prioritisation | ✅ None — US-5.2, US-7.3, US-8.5, US-10.8 assert their absence |
| A story implies queue filtering or sorting | ✅ None — US-7.3 and US-8.5 assert rejection and absence |
| A story implies audit export | ✅ None — US-13.4 and US-14.6 assert no export surface |
| A story implies file, bulk, or API ingestion | ✅ None — US-3.4 and US-6.2 assert manual entry only |
| A story implies seeded demonstration data | ⚠️ Reversed in Phase 7, narrowly — Epic 15 (US-15.1 … US-15.5) is the deliberate exception (PRD §10 #7 superseded); manual entry (F6/Epic 6) remains the sole live-entry path, asserted unaffected by US-15.5 |
| A story implies autonomous AI resolution | ✅ None — US-9.2, US-9.5, US-11.5 assert structural impossibility |
| A story implies duty, tariff, or classification determination | ✅ None — US-4.1 and US-9.5 assert their exclusion |
| A story implies a CI accessibility gate or `.github/workflows` | ✅ None — US-2.6 asserts manual review and the absence of a gate |
| A story implies a native mobile client | ✅ None — US-2.6 covers responsive web at tablet width only |
| A story implies model training or fine-tuning | ✅ None — US-9.5 covers request/response consumption only |

---
