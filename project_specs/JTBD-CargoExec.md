# Jobs to Be Done
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.1 |
| **Date** | 2026-09-11 (Phase 7 update: 2026-09-16) |
| **Related Personas** | PERSONAS-CargoExec.md v1.1 (PER-01, PER-02, PER-03) |
| **Related PRD** | PRD-CargoExec.md v1.1 (§5 Features incl. §5.7 F15, §6 NFRs, §7 Success Metrics, §10 Out of Scope) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | Journeys-CargoExec, UserStories-CargoExec, STORY-MAP-CargoExec, UX-CargoExec |
| **Revision Note** | Updated for Phase 7 (visual-system redesign, seeded demonstration case, real LLM posture) — see PRD §5.1 F2, §5.2 F6, §5.4 F9, §5.7 F15, §10 #7 |

---

## Scope Boundary — Read Before Using This Document

CargoExec v1 has **exactly one authenticated role: the cargo specialist (PER-01)**. Every job in this document that the product *serves through an interface* belongs to PER-01.

**PER-02 (oversight/audit reviewer) and PER-03 (delivery sponsor) are non-user stakeholders.** They do not authenticate, hold no account, and operate no screen, route, export, dashboard, or API in v1. Their jobs are real, and they are recorded here — but every one of them is **satisfied by a property of the delivered system** (the audit trail exists, is append-only, is provenance-tagged per value, is complete, and is legible in place) rather than by anything they use. Each PER-02 and PER-03 job carries an explicit **Served By** line saying so.

**Instruction to downstream generators (Journeys, UserStories, STORY-MAP, UX):**
- PER-02 and PER-03 must **never** be the actor of a user story, a journey step, a screen, a route, a permission, a role, or an API consumer.
- A PER-02 or PER-03 job is delivered by **strengthening the record PER-01 produces**, or by **verification evidence** (automated test, review sign-off, walkthrough observation) — never by building them a surface.
- Stakeholder needs that would require a system surface are recorded in **Out of Scope for v1** blocks with their PRD §10 exclusion reason. They must stay there.

Priority convention follows PRD §5.0: **P0** = required for the governed decision loop to be complete and provable, or required by a statutory/standards constraint. **P1** = required for the loop to hold up under realistic failure conditions, but the loop is demonstrable without it. **No P2/P3 exists in this product** — capabilities that would rank lower were excluded outright (§10) rather than deprioritised.

---

## JTBD Summary

| ID | Persona | Access | Job Statement (abbreviated) | Priority |
|----|---------|--------|-----------------------------|----------|
| JTBD-01.1 | PER-01 Dana | User | When I finish typing an entry, know at once whether it passed or opened a case — and reach that case directly | P0 |
| JTBD-01.2 | PER-01 Dana | User | When I return to the queue, see what still needs a decision without having to choose where to start | P0 |
| JTBD-01.3 | PER-01 Dana | User | When I open a case, understand why it is open and what the AI proposes well enough to agree or disagree | P0 |
| JTBD-01.4 | PER-01 Dana | User | When I resolve a case, make the decision unmistakably mine and say in my own words why | P0 |
| JTBD-01.5 | PER-01 Dana | User | When a case is questioned later, show from the case itself what was recommended, what changed, and why | P0 |
| JTBD-01.6 | PER-01 Dana | User | When the AI is slow or down, finish the case anyway with the record still intact | P1 |
| JTBD-01.7 | PER-01 Dana | User | When I work by keyboard and screen reader, complete every task without a workaround | P0 |
| JTBD-02.1 | PER-02 Marcus | **Non-user** | When a resolved case is questioned, be certain a named human decided it | P0 |
| JTBD-02.2 | PER-02 Marcus | **Non-user** | When relying on a case history, be certain it could not have been revised afterwards | P0 |
| JTBD-02.3 | PER-02 Marcus | **Non-user** | When a mixed AI/human resolution is challenged, tell machine proposal from human choice per value | P0 |
| JTBD-02.4 | PER-02 Marcus | **Non-user** | When asked why a case was ever open, get a stated validation basis rather than an inference | P0 |
| JTBD-03.1 | PER-03 Priya | **Non-user** | When judging delivery capability, watch all six loop stages complete in one unbroken sitting | P0 |
| JTBD-03.2 | PER-03 Priya | **Non-user** | When I probe the accountability claim, get a structural answer backed by test, not a policy answer | P0 |
| JTBD-03.3 | PER-03 Priya | **Non-user** | When I check federal standards, see them met in what shipped rather than promised for later | P0 |
| JTBD-03.4 | PER-03 Priya | **Non-user** | When I ask what was declined, confirm the exclusions actually held | P0 |

---

## PER-01: Dana Reyes — Jobs

**Access:** Authenticated system user — the only role in CargoExec v1. Every job below is served by a screen or API she operates directly.

### JTBD-01.1: Get an Entry Assessed the Moment I Submit It

**Job Statement:**
When I have just hand-typed a cargo entry and pressed submit, I want to be told without interpretation whether it passed the required-information rules or opened an exception — and be handed the case reference and a way straight into it — so I can carry the entry to its next step in one continuous action instead of going looking for what became of it.

**Current Alternatives:**
- Submits the entry and assumes it landed, then hunts for it later in a separate list to find out whether anything was wrong with it
- Learns an entry was deficient only when it resurfaces as somebody else's query, by which point the context of typing it is gone
- Where exceptions are authored separately from validation, has to open a second path to record that something failed — losing the link between the unsatisfied rule and the open case (PRD §2.1 #5)

**Hiring Criteria:**
- Receipt is atomic: the entry is persisted, validated, and — on failure — turned into an exception inside one transaction, so no entry can exist having been received but never assessed
- The submission outcome is stated explicitly on screen as either *validated clean* or *exception opened*, never left to be inferred from an absence of errors
- When an exception opens, the case reference is shown and is directly navigable from the outcome message
- Server-side validation is authoritative; any client-side affordance is additive and never the thing that decided the outcome
- Validation findings are rendered field by field with an error summary that moves focus, and the outcome is announced to assistive technology
- The same entry content always produces the same findings, so an outcome is reproducible rather than situational

**Success Measure:** 100% of entries failing required-information validation open an exception, and zero exceptions exist without a validation failure behind them (SM-8); the receive and validate stages are demonstrable from the browser as part of the unbroken loop (SM-1).

**Related Features:** F3, F4, F5, F6 (on F2)
**Related NFRs:** NFR-11, NFR-2, NFR-10
**Priority:** P0

---

### JTBD-01.2: Know What Still Needs a Decision Without Choosing Where to Start

**Job Statement:**
When I come back to the queue after finishing a case, I want to see the open exceptions in a single settled order and open the next one in one action, so I can spend my attention on deciding cases rather than on deciding which case to decide.

**Current Alternatives:**
- Cross-references several lists or spreadsheets to work out which items are still outstanding, and keeps her own side-notes of where she left off
- Relies on delayed email notifications to learn that something is waiting
- Works from tooling that offers filters, sorts and priority flags that, at this volume, are a decision tax rather than a help — and that let two people silently disagree about what "next" means

**Hiring Criteria:**
- One list, one ordering: open exceptions in ascending receipt order, stable and identical across repeated requests, with no parameters to choose
- Each row identifies the case well enough to recognise it without opening it: case reference, receipt time, and a summary of what failed
- A row opens the case in a single activation, by keyboard or by pointer
- Closed cases — resolved or rejected — leave the list, so what is shown is exactly what still needs a decision
- An empty queue says plainly that there are no open exceptions and offers the route to create an entry
- Returning from a case puts her back in the flow without re-orienting

**Success Measure:** The *except → open* stage is demonstrable end to end in the walkthrough with no manual workaround, as part of 6-of-6 loop completeness (SM-1); queue navigation is completable by keyboard alone (SM-11).

**Related Features:** F7, F8 (on F2)
**Related NFRs:** NFR-2, NFR-10
**Priority:** P0

**Out of scope for v1 (do not satisfy this job by building these):** queue filtering, sorting, assignment, prioritisation or priority badges — **excluded**, PRD §10 #4 and §4.3 #5 (no filter, sort, assignment or priority dimension exists in the data model or the API). Aging, volume, workload or throughput indicators on the queue — **excluded**, PRD §10 #2.

---

### JTBD-01.3: Understand the Case Well Enough to Disagree With the AI

**Job Statement:**
When I open an exception and a machine has already proposed how to resolve it, I want to see the submitted values, the specific rules that were not satisfied, and the AI's proposed action with a rationale I can read in plain language — with every AI-proposed value marked as such — so I can form my own view and be confident whether to agree or disagree rather than defaulting to whichever is easier.

**Current Alternatives:**
- Reads a generic failure message and has to reconstruct which rule and which field actually caused the problem, so the exception feels arbitrary (R-10)
- Encounters AI output already merged into the record with no marking, so she cannot tell a machine suggestion from a human value while she is deciding — only, at best, by reconstructing it afterwards (PRD §2.1 #2)
- Treats an unexplained suggestion as either authoritative or worthless, because there is no rationale to evaluate

**Hiring Criteria:**
- The case shows the submitted entry values and the validation findings that opened it, naming the unsatisfied rule and the affected field — not a generic failure
- The AI's recommended action is accompanied by a plain-language rationale intelligible to a non-technical reader, on the same screen as the thing it explains
- The recommendation is presented as an un-applied proposal awaiting a decision, never as an outcome already in force
- Every AI-proposed value carries an explicit AI-origin marker conveyed both visually and programmatically — never by colour alone — so it is distinguishable on sight and through a screen reader
- Heading structure and reading order carry a screen-reader user through entry → findings → recommendation → decision → audit coherently
- Where no recommendation exists, the case says so plainly and the decision path is unaffected

**Success Measure:** 100% of sampled recommendations are judged plain-language and decision-useful by reviewing specialists during walkthrough (SM-9); 100% of rendered proposed values carry an unambiguous `AI` origin, zero unattributed (SM-3).

**Related Features:** F9, F10 (on F2, F7)
**Related NFRs:** NFR-4, NFR-2, NFR-10
**Priority:** P0

---

### JTBD-01.4: Make the Decision Unmistakably Mine, and Say Why

**Job Statement:**
When I have read the case and formed a view, I want to approve, edit-and-approve, or reject it as three equally-weighted deliberate choices — writing my reason in my own words whenever I change or refuse the recommendation — so the resolution is recorded as a decision I took rather than as something that happened to the case while I was looking at it.

**Current Alternatives:**
- Accepts a pre-selected or pre-filled suggestion because it is the path of least resistance, making approval indistinguishable from inattention (R-1)
- Records a rejection or modification with no captured justification, leaving her inferring her own past intent months later from an outcome that never explained itself (PRD §2.1 #3)
- Keeps the explanation in notes, memory, or email because the system holds only the outcome

**Hiring Criteria:**
- Approve, Edit and Reject are presented without a default or pre-selection, so choosing the AI's answer is an act rather than an omission
- Editing opens the proposed values in an editable form, with fields she changes visibly marked as specialist-modified
- A non-empty reason is required on edit and on reject, enforced at the API boundary rather than only in the browser, and a missing reason returns as an inline focus-managed error
- Values she changes are re-stamped `HUMAN` while values she leaves retain `AI`, so a partly-edited resolution stays attributable field by field
- The screen shows what will be recorded before it is recorded, and confirms what was recorded afterwards
- No code path — scheduled job, background worker, retry, or system actor — can move a case to resolved without her decision
- A case already decided cannot be decided again; closed cases show the recorded decision read-only

**Success Measure:** Zero exceptions reach a resolved state without a recorded human decision (SM-4), and 100% of edits and rejections carry a non-empty reason in the record (SM-5).

**Related Features:** F11, F12 (on F2, F10)
**Related NFRs:** NFR-5, NFR-4, NFR-2
**Priority:** P0

---

### JTBD-01.5: Be Able to Show Afterwards Exactly What Happened

**Job Statement:**
When a case I decided is questioned later — by a colleague, a review, or my own memory — I want to read the whole story back from inside the case itself: who acted, what changed, when, what the AI proposed versus what I chose, and the reason I gave — so I can account for my decision without asking anyone for an extract or reconstructing it from side channels.

**Current Alternatives:**
- Answers "who decided this?" from memory, email threads, or reconstruction, because the record shows the corrected state and not the choice behind it (PRD §2.1 #1)
- Consults a case history that could have been edited after the fact, or that needs a query tool or second system to read — neither of which is available to her at the moment she needs it (PRD §2.1 #4)
- Maintains a private running log of what she did across the workday because the system does not hold the explanation

**Hiring Criteria:**
- Every state change writes exactly one audit entry, committed in the same transaction as the change it describes, so an unaudited change is not a possible outcome
- Each entry records actor identity, action, timestamp, before and after values, the reason where one was captured, and the AI-versus-human origin of each value
- Entries are ordered unambiguously per case by monotonic sequencing, so the chronology is not a matter of interpretation
- The trail is read inside the case, in the UI, for both open and closed cases — no export, query tool, or secondary system stands between the question and the answer
- The trail is read-only by construction: no edit, correct, or delete affordance exists anywhere, and mutation attempts are rejected at the database level, not merely absent from application code
- Origin markers and reasons are legible to a screen reader traversing the history, and conveyed beyond colour alone

**Success Measure:** 100% of resolved or rejected cases can answer "who decided, what did the AI recommend, what did the human change, and why" from the UI alone (SM-2), against 100% audit coverage with zero unaudited transitions (SM-6).

**Related Features:** F13, F14 (on F0, F2, F10)
**Related NFRs:** NFR-3, NFR-6, NFR-7, NFR-4
**Priority:** P0

**Out of scope for v1 (do not satisfy this job by building these):** audit export, oversight package, or reporting extract in any format — **excluded**, PRD §10 #5. The trail is answered *in place* (NFR-7); an export would relocate the answer rather than guarantee it.

---

### JTBD-01.6: Finish the Case Even When the AI Cannot Help

**Job Statement:**
When the AI provider is slow, unavailable, or returns something unusable, I want the case to stay fully workable and my decision to be recorded just as completely as it would have been, so a third party's outage costs me a suggestion rather than costing the case its accountability.

**Current Alternatives:**
- Stops work on the case and waits, or parks it in a side list of "blocked" items that nothing later reconciles
- Resolves it outside the system and backfills later, breaking the link between the decision and its record
- Waits on a frozen interface with no indication of whether the request is progressing or dead

**Hiring Criteria:**
- AI unavailability degrades to an explicit "no recommendation available" state on the case, and never blocks entry creation, validation, exception opening, the decision path, or audit writing
- She can resolve the case directly (edit-and-approve, recording her own values) or reject it, with a reason, when no recommendation is present — Approve is the one action that is withheld, because there is nothing to approve — and the audit record of that decision is as complete as any other
- Recommendation generation is permitted to take longer than other interactions but shows accessible progress status rather than freezing the interface or blocking navigation
- The model dependency sits behind a provider abstraction, so substituting it touches neither the decision layer nor the audit layer

**Success Measure:** 100% of cases are resolvable with a full audit record while the AI provider is unavailable (SM-13), with no loss against decision traceability (SM-2) or audit coverage (SM-6).

**Related Features:** F9 (degraded mode), F10, F11, F12
**Related NFRs:** NFR-9, NFR-10
**Priority:** P1 *(PRD §5.0: required for the loop to hold up under realistic failure conditions; the loop is demonstrable without it)*

---

### JTBD-01.7: Do the Whole Job by Keyboard and Screen Reader

**Job Statement:**
When I work entirely by keyboard and assistive technology, I want to complete every task in the product — sign in, create an entry, open a case, decide it with a reason, read the trail — with focus, errors, and status announced properly, so accessibility is how the product works rather than an accommodation bolted on to it.

**Current Alternatives:**
- Uses federal line-of-business applications where keyboard operability covers the common path but breaks on error summaries, modals, or confirmation states
- Depends on sighted assistance or a workaround for one or two steps, which quietly makes her dependent for the whole task
- Is told conformance is coming in a later release, so the current release is unusable now regardless of the promise

**Hiring Criteria:**
- Every interactive component conforms to whichever visual design system is shipped — USWDS through Phase 6, the newly-approved external design as of Phase 7 — or a documented conformant composition, with that system's tokens governing typography, spacing and colour
- Full keyboard operability with a visible focus indicator on every interactive element across every screen
- Semantic landmarks, correct heading order, accessible names on all controls, and programmatic label and error association
- Status and error messages exposed to assistive technology via live regions; error summaries move focus
- AI-versus-human origin is never conveyed by colour alone, in either the case view or the audit trail
- AA colour contrast, text resizing and reduced-motion behaviour, verified by per-screen design review and an assistive-technology walkthrough of each screen — the conformance bar is unchanged by the Phase 7 visual redesign; only the mechanism is

**Success Measure:** Zero WCAG 2.1 AA violations across every screen with 100% of screens reviewed and signed off (SM-10); 100% of product tasks completable by keyboard alone (SM-11); 100% conformance with the delivered visual design system's component library (SM-12).

**Related Features:** F2 (inherited by F6, F8, F10, F12, F14)
**Related NFRs:** NFR-1, NFR-2, NFR-4
**Priority:** P0 *(statutory constraint — Section 508)*

**Out of scope for v1 (do not satisfy this job by building these):** an automated accessibility gate, axe-core CI workflow, or `.github/workflows` file — **excluded**, PRD §10 #1. Conformance is met by design and mandatory manual review, which is why the per-screen review is a gate rather than a courtesy (R-3).

---

## PER-02: Marcus Hale — Jobs

**Access: Non-user stakeholder — does not authenticate, has no system access in v1.** Marcus has no account, no login, no screen, no permission, no query tool and no extract. Every job below is served by a **property of the record PER-01 produces** and by the verification evidence that the property holds. None of them may become a screen, a route, a role, a permission, an API consumer, or a user story with Marcus as actor. Where his question needs answering about a specific case, the answer is obtained by a cargo specialist opening that case's audit trail in the application and reading it — or, during a demonstration, by observing that reading.

### JTBD-02.1: Be Certain a Named Human Decided It

**Job Statement:**
When a resolved cargo case is questioned months after the fact, I want it to be already true that an identified, accountable person made that decision and that no other route to resolution existed, so I can establish responsibility as a fact of the record rather than as a conclusion I have to argue for.

**Served By (system property, not an interface):** The structural absence of an auto-apply path (NFR-5, §4.3 #1) plus actor identity on every decision audit entry (F13). Resolution state is reachable only through an authenticated specialist's approve, edit-and-approve or reject. Marcus is served by this being **impossible to violate**, not by being given a way to check it.

**Current Alternatives:**
- Asks "who decided this?" and receives an answer assembled from memory, email, or side channels rather than from the record (PRD §2.1 #1)
- Relies on a policy statement that a human reviews AI output, with nothing in the system that would have prevented the opposite
- Cannot distinguish a case a person deliberately resolved from one a process resolved on their behalf

**Hiring Criteria:**
- No server-side, scheduled, background, retry or system-actor path can change resolution state; the absence of that path is verified by automated test, not asserted in documentation
- Every decision carries an authenticated specialist identity, recorded as the actor on the audit entry written in the same transaction as the decision
- Authentication exists specifically so the actor is identifiable to the audit writer — every mutating request resolves to a known specialist
- Decisions are idempotent and conflict-handled, so a case cannot be decided twice or concurrently into a contradictory record

**Success Measure:** Zero auto-apply incidents — zero exceptions reaching a resolved state without a recorded human decision (SM-4), evidenced by test rather than by inspection of a screen.

**Related Features:** F1, F11, F13 (on F0)
**Related NFRs:** NFR-5, NFR-6, NFR-8
**Priority:** P0

---

### JTBD-02.2: Be Certain the History Could Not Have Been Revised

**Job Statement:**
When I rely on a case history to establish what happened, I want it to be structurally impossible for that history to have been altered after the fact, so my confidence rests on a guarantee of the system rather than on trust in everyone who has had access to it since.

**Served By (system property, not an interface):** Append-only audit storage with UPDATE and DELETE privileges revoked at the database level, monotonic per-case sequencing, and prior-entry hash linkage (F0, F13, NFR-3). Marcus never inspects this; he is served by mutation attempts being **rejected** rather than merely unavailable in the UI.

**Current Alternatives:**
- Reviews case histories that are editable after the fact, which cannot support oversight at all (PRD §2.1 #4)
- Accepts a system where immutability is a convention of the application code — one ORM convenience or one direct database change away from being untrue (R-4)
- Treats governance as an intention described in a document rather than a property of a running system (PRD §2.1 #6)

**Hiring Criteria:**
- Audit entries are insert-only: no application code path, API endpoint, or UI affordance updates or deletes one, and no update or delete operation is implemented at all
- UPDATE/DELETE privileges are revoked on the audit store, so a direct database mutation attempt is rejected by the database, not by the application
- Per-case entries are monotonically sequenced and hash-linked to the prior entry, making tampering evident rather than merely difficult
- Every state change produces exactly one audit entry committed transactionally with the change — a change without its entry, or an entry without its change, is prevented by coupling rather than by convention
- Rejection of mutation is demonstrated by test, including attempts made directly against the database

**Success Measure:** 100% of attempted updates or deletes against stored audit entries are rejected, including attempts made directly against the database (SM-7); 100% audit coverage with zero unaudited transitions, verified 1:1 by automated test (SM-6).

**Related Features:** F0, F13
**Related NFRs:** NFR-3, NFR-6
**Priority:** P0

---

### JTBD-02.3: Tell the Machine's Proposal From the Human's Choice, Value by Value

**Job Statement:**
When a resolution was partly accepted and partly corrected, I want the record itself to say which individual values the AI proposed and which the specialist chose — and why they changed what they changed — so the human's actual contribution to the decision is provable rather than merely plausible.

**Served By (system property, not an interface):** Per-value provenance modelled in the schema (`AI` | `HUMAN`), re-stamped on edit, rendered distinguishably in both the case view and the audit trail, with mandatory reason text carried onto the entry (F0, F11, F13, F14, NFR-4). Marcus reads nothing himself; the record is **sufficient on its own** because there is no export to hand him and no downstream system to compensate for a thin record.

**Current Alternatives:**
- Encounters AI output merged into the record without provenance, which makes the human's role unprovable and the oversight question unanswerable (PRD §2.1 #2)
- Finds provenance recorded per record rather than per value, so a partly-edited resolution collapses into a single ambiguous origin (R-5)
- Meets a rejection or modification with no captured justification and has to infer intent months later (PRD §2.1 #3)

**Hiring Criteria:**
- Origin is stored at value granularity in the record, not as incidental log metadata, so a mixed AI/human resolution is attributable field by field
- Edit-and-approve re-stamps changed values `HUMAN` while untouched values retain `AI`
- What the AI said is preserved as it was said, with model identity, prompt version and generation timestamp, alongside what the human chose
- Origin is rendered distinguishably in both the case view and the audit trail, conveyed beyond colour alone
- A non-empty reason is mandatory on every edit and rejection and is displayed in the trail where it is read — enforced at the API boundary so it cannot be bypassed

**Success Measure:** 100% of recorded resolution values carry an unambiguous `AI` or `HUMAN` origin in both storage and rendering, zero unattributed (SM-3); 100% of edits and rejections carry a non-empty reason (SM-5); 100% of resolved or rejected cases answer all four oversight questions from the UI alone (SM-2).

**Related Features:** F0, F9, F11, F13, F14
**Related NFRs:** NFR-4, NFR-7
**Priority:** P0

---

### JTBD-02.4: Never Have to Infer Why a Case Was Open

**Job Statement:**
When I ask why a case existed at all, I want the specific unsatisfied rule and field to be carried on the case as its stated basis, so the origin of an exception is a recorded fact rather than something reconstructed from the correction that followed it.

**Served By (system property, not an interface):** Exceptions being derived and never authored — the only way an exception comes into being is a validation failure on receipt — with the per-rule findings carried forward onto the case for its whole life (F4, F5, §4.3 #4). Marcus is served by the derivation integrity, not by a search or reporting surface.

**Current Alternatives:**
- Works with exception handling modelled as a parallel data-entry path, where the link between the unsatisfied rule and the open case was never captured (PRD §2.1 #5)
- Infers the basis of an exception backwards from whatever was corrected, which conflates the problem with the remedy
- Encounters generic failure text that names no rule and no field, making exceptions look arbitrary (R-10)

**Hiring Criteria:**
- An exception is opened automatically and only when validation fails; no independent exception-authoring path exists
- Validation names each unsatisfied rule and the field it concerns, reports all failures rather than the first, and persists the result attached to the entry
- The findings are carried onto the exception as its stated basis and remain visible on the case, including after it closes
- Validation is deterministic: identical entry content always yields identical findings, so an exception's stated basis is reproducible

**Success Measure:** 100% of entries failing required-information validation open an exception, and zero exceptions exist without a validation basis behind them (SM-8).

**Related Features:** F4, F5, F10
**Related NFRs:** NFR-11
**Priority:** P0

---

### PER-02 — Out of Scope for v1

*Recorded so the need is visible, not planned. These must **not** become features, screens, roles, permissions, routes, or user stories.*

| Need | Status | Exclusion reason |
|------|--------|------------------|
| A read-only / auditor login of his own | **Excluded** | PRD §10 #3 — no second role, no role-based access separation; one authenticated role only |
| An audit export, oversight package, or reporting extract | **Excluded** | PRD §10 #5 — the trail is answered in place per NFR-7; an export relocates the answer instead of guaranteeing it |
| Cross-case search, reporting, or aggregate review of decisions | **Excluded** | No such surface exists; v1 answers per case only (F14) |
| Any compliance-rate, volume or aging measure | **Excluded** | PRD §10 #2 and §7 — no metric of operational scale exists in scope |
| A notification or handoff surface when he raises a question about a case | **Excluded** | PRD §10 #2, #4 — no assignment, notification, or handoff exists; the interaction is entirely outside the application |

---

## PER-03: Priya Raman — Jobs

**Access: Non-user stakeholder — does not authenticate, has no system access in v1.** Priya observes a walkthrough driven by PER-01. She has no account, no dashboard, no metrics view and no reporting surface. Every job below is served by **what the delivered product is**, plus the evidence that it is that — a live browser walkthrough, automated test results, and per-screen review sign-off. None may become a screen, a demo mode, a presenter view, a role, or a user story with Priya as actor.

### JTBD-03.1: Watch a Governance Claim Be Tested Rather Than Described

**Job Statement:**
When I am deciding whether CBP can build governed applications quickly enough to be worth building, I want to watch all six stages — receive → validate → except → recommend → human decide → audit — run end to end in one unbroken sitting through the browser, so my judgement rests on a sequence I saw work rather than on an architecture deck asserting it would.

**Served By (product property, not an interface she operates):** Loop completeness itself — every stage carried by a shipped feature with a user-facing surface, demonstrable by a specialist in a single session with no verbal bridging. What serves Priya is that the walkthrough **needs no explanation, no workaround, and no promise about a future release** (PRD §3.2).

**Current Alternatives:**
- Reads governed delivery asserted in documents and architecture decks, having learned that an assertion is not evidence (PRD §2.1 #6)
- Is shown a broad application that arrives partially finished, which answers the delivery-capability question with a "no" (R-7)
- Is walked through an API transcript because the backend exists and the interface does not, leaving the claim provable only in a form she cannot evaluate (R-7)
- Is shown a dataset that silently substitutes for the receive and validate stages, so those two stages were never actually demonstrated live — as distinct from a deliberately-seeded case (F15) used on purpose to reach later-stage scenarios quickly, alongside a receive/validate stage that is still demonstrated by hand

**Hiring Criteria:**
- All six stages are carried by shipped features with named user-facing surfaces (F6, F8, F10, F12, F14 on F2) — backend endpoints do not satisfy the interface requirement
- The walkthrough runs through the browser, start to finish, in one sitting: sign in, hand-type a deliberately incomplete entry, watch it fail validation and open as an exception, open it, read the recommendation and rationale, change a value with a reason, approve, read the audit trail
- Receive and validate remain independently demonstrable by hand-typing a fresh entry through F6 — that live path is not removed, gated, or replaced; a pre-loaded demonstration case (F15) exists alongside it so recommend, decide and audit can also be reached directly, without hand-walking every earlier stage first each time
- The loop remains completable with the AI stage degraded, so the governance guarantee does not depend on a third party being healthy
- Interactive screens respond within 2 seconds under demonstration load; AI generation shows accessible progress instead of a frozen interface

**Success Measure:** 6 of 6 governed loop stages demonstrable end to end in a single unbroken walkthrough with no manual workaround (SM-1), and 100% of cases resolvable with a full audit record while the AI provider is unavailable (SM-13).

**Related Features:** F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15 (on F0, F1, F2)
**Related NFRs:** NFR-9, NFR-10
**Priority:** P0

---

### JTBD-03.2: Get a Structural Answer to the Accountability Question

**Job Statement:**
When I press on whether anything in this system can resolve a case without a human, I want the answer to be that no such path exists and to be backed by test evidence, so the human-in-the-loop guarantee is a property of the build rather than a discipline that depends on how people choose to use it.

**Served By (product property, not an interface she operates):** The architectural invariant that resolution state changes only through a request carrying a human decision (§4.3 #1, NFR-5), plus the automated test that proves no auto-apply path exists. Priya is served by the **answer being structural**, not by being given a control panel that shows it.

**Current Alternatives:**
- Receives a policy answer — "our process requires review" — which describes intent and constrains nothing
- Is shown a configuration setting that enables human review, which by existing admits the alternative
- Accepts that AI output is applied and then checked, which is a different guarantee wearing the same words

**Hiring Criteria:**
- No scheduled job, background worker, retry path or system actor can resolve an exception, and the absence of that path is verified by test rather than by policy
- The AI is advisory only: its proposals are persisted as un-applied drafts attached to the case and never written into the entry of record
- Decision actions are presented with no default or pre-selection, so approval of the AI is a deliberate act and not the outcome of inaction
- Reasons are required and non-empty on edits and rejections at the API boundary, and are rendered in the trail where they are read — so reason capture is load-bearing rather than a formality (R-8)
- The guarantee holds identically when the AI is unavailable — degraded mode removes the suggestion, never the human decision

**Success Measure:** Zero auto-apply incidents (SM-4), with 100% of edits and rejections carrying a non-empty reason (SM-5) — both evidenced by automated test rather than by observation alone.

**Related Features:** F9, F11, F12, F13
**Related NFRs:** NFR-5, NFR-9
**Priority:** P0

---

### JTBD-03.3: See Federal Standards Met in What Shipped

**Job Statement:**
When I evaluate whether governed delivery includes the parts that usually slip, I want Section 508 / WCAG 2.1 AA conformance to be observable in the screens I am watching right now — under whichever visual design system is shipped, including a keyboard-only pass — so accessibility is something the release already has rather than something the next release is promised to add.

**Served By (product property, not an interface she operates):** Accessibility and design-system conformance established once in the application shell (F2) and inherited by every screen, gated by a per-screen design-and-review checklist and an assistive-technology walkthrough. Priya observes conformance in the delivered screens; she is given no reporting view of it.

**Current Alternatives:**
- Sees accessibility treated as a later remediation item, so conformance is attached to a future release rather than to the thing being demonstrated (R-3)
- Is shown a compliance statement rather than an operable screen
- Is offered an automated scan result as a proxy for conformance, which v1 deliberately does not have and would not accept in place of review

**Hiring Criteria:**
- Every interactive component in the shipped UI conforms to whichever visual design system is delivered — USWDS through Phase 6, the newly-approved external design as of Phase 7 — or a documented conformant composition, with that system's tokens governing typography, spacing and colour
- Every screen can be operated keyboard-only end to end during the walkthrough, with visible focus throughout
- Semantic structure, heading order, accessible names, label/error association and live-region status messaging are present in the screens being demonstrated, not scheduled
- AI-versus-human origin is conveyed beyond colour alone everywhere it appears
- Every screen has been through manual design review and an assistive-technology walkthrough, and that sign-off is available as evidence — the absence of a CI gate is a recorded decision that makes review mandatory rather than optional; the review obligation carries over unchanged from the visual system it previously reviewed against to the one it now reviews against

**Success Measure:** Zero WCAG 2.1 AA violations across every reviewed screen with 100% of screens reviewed and signed off (SM-10); 100% of product tasks completable by keyboard alone (SM-11); 100% conformance with the delivered visual design system's component library (SM-12).

**Related Features:** F2 (inherited by F6, F8, F10, F12, F14)
**Related NFRs:** NFR-1, NFR-2, NFR-4
**Priority:** P0 *(statutory constraint — Section 508)*

---

### JTBD-03.4: Confirm That What Was Declined Actually Stayed Declined

**Job Statement:**
When I judge whether scope discipline held, I want to be able to confirm that nothing shipped falls inside the exclusion list, so I can read the narrowness of this product as a deliberate purchase of loop completeness rather than as an accident of what happened to get finished.

**Served By (product property, not an interface she operates):** The shipped feature set itself, checked against PRD §10. This is a delivery-evidence check performed after the demonstration against the §10 list — it is **not** a dashboard, report, or in-product view, and building one would itself be a scope failure.

**Current Alternatives:**
- Watches scope drift toward dashboards, queue management and multi-role access, consuming exactly the budget loop completeness needed (R-2)
- Reads an exclusion list written at the start of a project with nothing that later checks it
- Sees breadth delivered thinly and has to judge which parts are finished, with no stated boundary to judge against

**Hiring Criteria:**
- PRD §10 is binding and exhaustive; no excluded capability reappears as a feature, as a sub-capability of a feature, or as a non-functional requirement that reintroduces it by another name
- The queue API and data model carry no filter, sort, assignment or priority dimension — the exclusion is structural, not a UI omission
- Exactly one authenticated role exists by construction; there are no privilege tiers to configure
- The shipped feature set is checkable line by line against the §10 list after the demonstration

**Success Measure:** Zero features shipped that fall within a PRD §10 exclusion (SM-14).

**Related Features:** F1, F7, F8 (as the structural evidence of exclusions #2, #3, #4); the full F0–F14 set as the checkable scope
**Related NFRs:** NFR-8, NFR-12
**Priority:** P0

---

### PER-03 — Out of Scope for v1

*Recorded so the need is visible, not planned. These must **not** become features, screens, roles, permissions, routes, or user stories.*

| Need | Status | Exclusion reason |
|------|--------|------------------|
| A programme or delivery dashboard of any kind | **Excluded** | PRD §10 #2 — no supervisory or analytics interface exists |
| Exception volume, queue health, aging, throughput, or workload-per-specialist measures | **Excluded** | PRD §10 #2; PRD §7 deliberately contains no operational-scale metric |
| Any login, view, or report of her own | **Excluded** | PRD §10 #3 — one authenticated role only |
| A presenter mode, demo mode, or read-along surface for the walkthrough | **Excluded** | PRD §10 #3 and Persona Relationships — PER-03 observes a PER-01 session and never touches the application |
| An in-product scope-compliance or governance-status view | **Excluded** | PRD §10 #2 — a surface reporting on scope discipline would itself breach it; SM-14 is checked against the shipped feature set, not rendered |

*(Phase 7 note: a seeded demonstration dataset was excluded here under v1.0 — PRD §10 #7. That exclusion is superseded by PRD §5.7 F15, which adds a hand-authored seed script pre-loading one demonstration case through the full loop, additively alongside the still-live, hand-typed entry path (F6). This need is no longer excluded and has moved into JTBD-03.1 above.)*

---

## Outcome-to-Feature Traceability

| JTBD ID | Persona | Features | Expected Outcome | Success Metric |
|---------|---------|----------|------------------|----------------|
| JTBD-01.1 | PER-01 | F3, F4, F5, F6 | An entry is assessed atomically on receipt and its outcome — clean or exception, with case reference — is stated explicitly to the specialist who typed it | SM-8, SM-1 |
| JTBD-01.2 | PER-01 | F7, F8 | Open exceptions are visible as one receipt-ordered list with no selection decision to make, and any case opens in a single action | SM-1, SM-11 |
| JTBD-01.3 | PER-01 | F9, F10 | The case presents entry values, named validation findings, and an AI proposal with plain-language rationale, with AI origin marked on every proposed value | SM-9, SM-3 |
| JTBD-01.4 | PER-01 | F11, F12 | Resolution state changes only through an undefaulted, deliberate human decision carrying a mandatory reason on edit and reject | SM-4, SM-5 |
| JTBD-01.5 | PER-01 | F13, F14 | The complete chronological history of a case — actor, action, time, before/after, reason, origin — is readable inside the case with no external tooling | SM-2, SM-6 |
| JTBD-01.6 | PER-01 | F9 (degraded), F10, F11, F12 | The decision and audit path stays fully operable and fully recorded when the AI provider is unavailable | SM-13 |
| JTBD-01.7 | PER-01 | F2 (inherited by F6, F8, F10, F12, F14) | Every product task is completable keyboard-only on WCAG 2.1 AA screens, conformant with whichever visual design system is delivered, verified by per-screen review | SM-10, SM-11, SM-12 |
| JTBD-02.1 | PER-02 *(non-user)* | F1, F11, F13 | No code path resolves a case without an authenticated human decision, and every decision carries an identified actor | SM-4 |
| JTBD-02.2 | PER-02 *(non-user)* | F0, F13 | Audit history is insert-only with database-level mutation rejection, monotonic sequencing and hash linkage | SM-7, SM-6 |
| JTBD-02.3 | PER-02 *(non-user)* | F0, F9, F11, F13, F14 | Every resolution value carries `AI` or `HUMAN` origin in storage and rendering, with a mandatory reason on every edit and rejection | SM-3, SM-5, SM-2 |
| JTBD-02.4 | PER-02 *(non-user)* | F4, F5, F10 | Every exception is derived from a validation failure and carries its per-rule findings as its stated basis | SM-8 |
| JTBD-03.1 | PER-03 *(non-user)* | F3–F14, F15 (on F0, F1, F2) | All six loop stages are carried by shipped browser surfaces and walkable in one unbroken sitting, including with the AI degraded, reachable either by hand-typing a fresh entry (F6) or via a pre-loaded demonstration case (F15) that reaches every later stage directly | SM-1, SM-13 |
| JTBD-03.2 | PER-03 *(non-user)* | F9, F11, F12, F13 | Human-in-the-loop is enforced structurally with no auto-apply path, proven by test rather than policy | SM-4, SM-5 |
| JTBD-03.3 | PER-03 *(non-user)* | F2 (inherited by all UI features) | Section 508 / WCAG 2.1 AA conformance under the delivered visual design system is a property of the delivered screens, signed off per screen | SM-10, SM-11, SM-12 |
| JTBD-03.4 | PER-03 *(non-user)* | F1, F7, F8; full F0–F14 set | The shipped feature set contains nothing inside the PRD §10 exclusion list, with key exclusions enforced structurally | SM-14 |

**Feature coverage check:** F0 (01.5, 02.2, 02.3), F1 (02.1, 03.1, 03.4), F2 (01.7, 03.3), F3 (01.1, 03.1), F4 (01.1, 02.4), F5 (01.1, 02.4), F6 (01.1, 03.1), F7 (01.2, 03.4), F8 (01.2, 03.4), F9 (01.3, 01.6, 02.3, 03.2), F10 (01.3, 01.6, 02.4), F11 (01.4, 02.1, 02.3, 03.2), F12 (01.4, 01.6, 03.2), F13 (01.5, 02.1, 02.2, 02.3), F14 (01.5, 02.3), F15 (03.1). **16 of 16 features covered.**

**Metric coverage check:** SM-1 (01.1, 01.2, 03.1), SM-2 (01.5, 02.3), SM-3 (01.3, 02.3), SM-4 (01.4, 02.1, 03.2), SM-5 (01.4, 02.3, 03.2), SM-6 (01.5, 02.1, 02.2), SM-7 (02.2), SM-8 (01.1, 02.4), SM-9 (01.3), SM-10 (01.7, 03.3), SM-11 (01.2, 01.7, 03.3), SM-12 (01.7, 03.3), SM-13 (01.6, 03.1), SM-14 (03.4). **14 of 14 metrics covered.**

---

## NaC Preview

Candidate Natural Acceptance Criteria for STORY-MAP-CargoExec. **PER-01 criteria are verified through the user interface she operates. PER-02 and PER-03 criteria are verified by automated test, per-screen review sign-off, or walkthrough observation — never by a screen built for those personas.**

| JTBD ID | Outcome | Candidate NaC | Verified by |
|---------|---------|--------------|-------------|
| JTBD-01.1 | Receipt outcome is explicit and atomic | Given a specialist submits an entry missing a required field, when receipt completes, then the entry, its validation findings and an open exception are all committed in one transaction and the screen states "exception opened" with a navigable case reference | UI walkthrough + test |
| JTBD-01.1 | Validation is reproducible | Given the same entry content is submitted twice, when validated, then identical findings and an identical pass/fail outcome are produced both times | Test |
| JTBD-01.2 | Queue is one settled order | Given open exceptions exist, when the queue is requested repeatedly, then the same open exceptions are returned in ascending receipt order with no filter, sort, assignment or priority parameter available | UI walkthrough + test |
| JTBD-01.2 | Closed work leaves the list | Given a case is resolved or rejected, when the queue is next viewed, then that case no longer appears | UI walkthrough |
| JTBD-01.3 | AI origin is visible at decision time | Given a case with a recommendation, when the case detail screen is rendered, then every AI-proposed value carries an origin marker conveyed both visually and programmatically, and never by colour alone | UI + AT review |
| JTBD-01.3 | The rationale is decision-useful | Given a generated recommendation, when a reviewing specialist reads its rationale during walkthrough, then it is judged plain-language and sufficient to agree or disagree without further explanation | Walkthrough review |
| JTBD-01.4 | The decision is deliberate | Given a case with a recommendation, when the decision controls render, then Approve, Edit and Reject are presented with no default or pre-selected choice | UI + AT review |
| JTBD-01.4 | Reason is load-bearing | Given an edit or reject submitted without a non-empty reason, when the request reaches the API, then it is rejected at the API boundary and surfaced as an inline focus-managed error | Test + UI |
| JTBD-01.4 | Partial edits stay attributable | Given a specialist edits two of five proposed values and approves, when the resolution is stored, then the two changed values carry `HUMAN` origin and the three untouched values retain `AI` origin | Test |
| JTBD-01.5 | The case explains itself in place | Given any resolved or rejected case, when the specialist opens its audit trail in the UI, then who decided, what the AI recommended, what the human changed, and why are all answerable without an export, query tool or second system | UI walkthrough |
| JTBD-01.5 | History is ordered and complete | Given a case that has passed through receipt, exception, recommendation and decision, when the trail is read, then exactly one monotonically sequenced entry exists per state change, each with actor, action, timestamp, before/after and per-value origin | Test + UI |
| JTBD-01.6 | Degradation costs only the suggestion | Given the AI provider is unavailable, when the specialist opens the case, then it shows "no recommendation available" and she can still resolve it directly or reject it with a reason and a full audit record written | Test + walkthrough |
| JTBD-01.6 | Generation never freezes the interface | Given a slow recommendation request, when the case is open, then accessible progress status is announced and navigation remains available | UI + AT review |
| JTBD-01.7 | The whole job is keyboard-operable | Given a keyboard-only user, when they sign in, create an entry, open a queue case, edit/approve/reject with a reason and read the audit trail, then every task completes with visible focus and no pointer-only step | Keyboard pass |
| JTBD-01.7 | Screens conform as delivered | Given each shipped screen, when it is reviewed manually and with assistive technology, then zero WCAG 2.1 AA violations are recorded and every interactive component conforms to the delivered visual design system or a documented conformant composition | Per-screen sign-off |
| JTBD-02.1 | No route to resolution bypasses a human | Given the full code and schedule surface, when tested for auto-apply, then no scheduled job, background worker, retry path or system actor can transition a case to resolved | Test *(no screen)* |
| JTBD-02.1 | Every decision names its actor | Given any recorded decision, when its audit entry is inspected, then it carries an authenticated specialist identity, not a system or anonymous actor | Test *(no screen)* |
| JTBD-02.2 | Mutation is rejected, not merely absent | Given a stored audit entry, when an UPDATE or DELETE is attempted — including directly against the database — then it is rejected by the database privilege model | Test *(no screen)* |
| JTBD-02.2 | Tampering would be evident | Given a case's audit entries, when their sequence and prior-entry hash linkage are checked, then the chain is intact and any gap or alteration is detectable | Test *(no screen)* |
| JTBD-02.3 | Nothing is unattributed | Given every recorded resolution value across all cases, when provenance is checked in storage and in the rendered view, then each carries `AI` or `HUMAN` with zero unattributed values | Test *(no screen)* |
| JTBD-02.3 | Every change explains itself | Given every edit and rejection in the record, when reasons are checked, then 100% carry a non-empty reason rendered in the trail | Test *(no screen)* |
| JTBD-02.4 | Exceptions are derived, never authored | Given the exception creation surface, when tested, then no path opens an exception other than a validation failure on receipt, and every exception carries its per-rule findings | Test *(no screen)* |
| JTBD-03.1 | The loop walks unbroken | Given a running deployment and a specialist operator, when the walkthrough runs from sign-in to audit trail in one sitting through the browser, then all six stages complete with no manual workaround, no API transcript, and no silent substitution of a pre-staged case for the live receive/validate demonstration | Walkthrough *(no screen for PER-03)* |
| JTBD-03.1 | Governance survives provider outage | Given the AI provider is down, when the walkthrough is repeated, then the loop still completes with a full audit record | Walkthrough + test |
| JTBD-03.1 | Seeded case reaches later stages on demand | Given a freshly-migrated database, when the seed script runs, then exactly one demonstration case exists that has already passed through entry, validation failure, exception, AI recommendation, human decision and audit trail, written through the same append-only writer and per-value provenance rules as any other case | Test + walkthrough |
| JTBD-03.1 | Manual entry path stays live | Given the seeded demonstration case is present, when a specialist creates a new entry by hand through F6, then receive and validate are demonstrated live exactly as before, unaffected by the presence of the seeded case | UI walkthrough |
| JTBD-03.2 | The answer is structural | Given the question "can anything resolve without a human", when answered, then the answer is the absence of an auto-apply path evidenced by a passing test, not a policy statement | Test evidence *(no screen)* |
| JTBD-03.3 | Standards are met in the shipped build | Given every screen in the release, when reviewed, then 100% are signed off with zero WCAG 2.1 AA violations, 100% keyboard task completeness and 100% conformance with the delivered visual design system's component library | Per-screen sign-off |
| JTBD-03.4 | Exclusions held | Given the shipped feature set, when checked line by line against PRD §10, then zero shipped features fall within an exclusion, and no filter, sort, assignment, priority dimension or second role exists in the data model or API | Scope review *(no screen)* |

---

## Coverage & Constraint Check

| Check | Result |
|-------|--------|
| Every persona has at least 2 jobs | ✅ PER-01: 7, PER-02: 4, PER-03: 4 |
| Every job uses the When / I want / so I can form | ✅ 15 of 15 |
| Every job links to at least one PRD feature | ✅ 15 of 15 |
| Every success measure traces to a PRD §7 SM-* metric | ✅ SM-1 through SM-14 all referenced |
| Success measures avoid volume, speed and throughput | ✅ All measure loop completeness, traceability, provenance, accountability, conformance or scope discipline |
| Only PER-01 holds jobs served by an interface | ✅ PER-02 and PER-03 jobs each carry a **Served By (system property, not an interface)** line |
| No job would require building a §10 exclusion | ✅ Excluded needs recorded in Out-of-Scope blocks with §10 references, not as jobs |
| No dashboard, metric, filter, sort, assignment, prioritisation, export, bulk ingestion, second role, or autonomous AI job exists | ✅ None; all such needs recorded as excluded |
| Jobs are distinct, not duplicated across personas | ✅ PER-01 jobs are operational acts; PER-02 jobs are record properties; PER-03 jobs are delivery-evidence properties — different objects, different verification |
| All 16 features (F0–F15) traced | ✅ See Outcome-to-Feature Traceability coverage check |
| NaC Preview complete | ✅ 29 candidate criteria across all 15 jobs, each tagged with its verification route |

---

*Document generated by Pivota Spec Framework — JTBD Generator*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11); derived from PRD-CargoExec.md v1.1 and PERSONAS-CargoExec.md v1.1*
*Last updated: 2026-09-16 (Phase 7: visual-system redesign, seeded demonstration case, real LLM posture — see PRD §5.1 F2, §5.2 F6, §5.4 F9, §5.7 F15, §10 #7)*
