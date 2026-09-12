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
## Story Map Matrix

Each lane below is one step of the governed loop (or one of the two cross-cutting foundations).
Every lane table carries the same six columns. **Persona** names the operator first and any
non-user beneficiary or witness second; only PER-01 ever operates.

---

### Substrate — The Record the Loop Writes Into

*Cross-cutting. Beneath every backbone step, not after any of them. Epic 0 / F0.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Establish a decision history that cannot be rewritten | PER-01 (operator) · PER-02 (beneficiary, no screen) | Epic 0 (F0) | US-0.1 | JTBD-02.2 → A recorded decision still means what it said when it is questioned a year later; an attempt to revise history is *refused*, not merely discouraged. **(no screen)** | R1 |
| Attribute every stored value to AI or to a human, value by value | PER-01 · PER-02 (beneficiary, no screen) | Epic 0 (F0) | US-0.2 | JTBD-02.3 → A partly-corrected resolution says, field by field, which part was the machine's and which was the specialist's judgement. **(no screen)** | R1 |
| Preserve the submitted entry as the entry of record | PER-01 | Epic 0 (F0) | US-0.3 | JTBD-01.5 → The record shows a genuine before and after, rather than a corrected value with its own history overwritten. | R1 |
| Order events unambiguously and make tampering evident | PER-01 · PER-02 (beneficiary, no screen) | Epic 0 (F0) | US-0.4 | JTBD-02.2 → The chronology of a case is a property of the record rather than an interpretation, and a removed or reordered event is detectable. **(no screen)** | R1 |
| Make a case closing without a human decision structurally impossible | PER-01 · PER-03 (witness, no screen) | Epic 0 (F0) | US-0.5 | JTBD-02.1 → "The AI resolved it" and "nobody knows who decided" are outcomes the system cannot reach, even if the application has a bug. **(no screen)** | R1 |

---

### Step 1 — Sign In: Establish the Identity Decisions Are Attributed To

*Epic 1 / F1. Sign-in exists for a governance reason, not a perimeter reason.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Sign in as a cargo specialist on an accessible USWDS screen | PER-01 | Epic 1 (F1) | US-1.1 | JTBD-02.1 → The specialist starts her session already identified, so every decision she takes afterwards names a real accountable person. | R1 |
| Be kept out of the application until identified | PER-01 | Epic 1 (F1) | US-1.2 | JTBD-02.1 → No case data and no decision surface is reachable by an unidentified user, so no decision can be attributed to nobody. | R1 |
| Have that identity attached to everything she causes | PER-01 · PER-02 (beneficiary, no screen) | Epic 1 (F1) | US-1.3 | JTBD-02.1 → The actor on an audit entry is the signed-in specialist, and cannot be made to name someone else. **(no screen)** | R1 |
| End the session deliberately, or have it end on its own | PER-01 | Epic 1 (F1) | US-1.4 | JTBD-02.1 → An unattended workstation cannot lend the specialist's accountability to whoever sits down next. | R1 |
| Resist repeated guessing at the account | PER-01 | Epic 1 (F1) | US-1.5 | JTBD-02.1 → The identity every decision is attributed to cannot be taken by brute force. | R2 |

---

### Step 2 — Enter a Cargo Entry

*Epics 3 and 6 / F3, F6. Hand-typing is the only way in; there is no seeded dataset, so this step
is the beginning of every demonstration path.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Fill in the entry on a clearly labelled USWDS form | PER-01 | Epic 6 (F6) | US-6.1 | JTBD-01.1 → The shape of a complete entry is legible before submitting it, rather than discovered by failing. | R1 |
| Submit a deliberately incomplete entry without the browser pre-empting the server | PER-01 · PER-03 (witness, no screen) | Epic 6 (F6) | US-6.2 | JTBD-01.1 → An entry can be recorded exactly as it arrived; client-side help assists but never decides the outcome. | R1 |
| Have the entry received and assessed in one indivisible step | PER-01 | Epic 3 (F3) | US-3.1 | JTBD-01.1 → No entry can exist having been received but never assessed. | R1 |
| Record the keystrokes exactly as typed, attributed to the specialist | PER-01 · PER-02 (beneficiary, no screen) | Epic 3 (F3) | US-3.2 | JTBD-02.3 → What the specialist actually typed is the baseline any later AI proposal is compared against. **(no screen)** | R1 |
| Keep manual entry the only way in, with validation unskippable | PER-01 · PER-03 (witness, no screen) | Epic 3 (F3) | US-3.4 | JTBD-02.4 → Every case in the queue has a genuine validation basis behind it; the loop has no back door. **(no screen)** | R1 |
| Create an entry and open the resulting case by keyboard alone | PER-01 | Epic 6 (F6) | US-6.6 | JTBD-01.7 → The receive step completes with no pointer-only stage in it. | R1 |
| Keep the typing when something goes wrong on submission | PER-01 | Epic 6 (F6) | US-6.5 | JTBD-01.1 → A failed submission costs a correction, never the whole entry. | R2 |
| Be told plainly when the entry number already exists | PER-01 | Epic 3 (F3) | US-3.3 | JTBD-01.1 → A shipment already in the system does not quietly acquire a second case. | R2 |

---

### Step 3 — Entry Validated on Receipt

*Epics 4 and 6 / F4, F6. Validation runs inside the receipt transaction; its findings become the
substance of the exception and the text the specialist reads.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Evaluate every applicable rule and report every failure | PER-01 · PER-02 (beneficiary, no screen) | Epic 4 (F4) | US-4.1 | JTBD-01.1 → Everything wrong with the entry is learned in one pass, not one problem at a time. | R1 |
| Name the unsatisfied rule and the field it concerns, in plain language | PER-01 · PER-02 (beneficiary, no screen) | Epic 4 (F4) | US-4.2 | JTBD-02.4 → The basis of an exception is never generic, arbitrary, or self-contradictory for the same field. **(no screen)** | R1 |
| Produce the same findings for the same entry, always | PER-01 · PER-02 (beneficiary, no screen) | Epic 4 (F4) | US-4.3 | JTBD-02.4 → A case's stated basis is reproducible when it is questioned a year later, and never looks like it depended on when it ran. **(no screen)** | R1 |
| Record a clean pass as explicitly clean | PER-01 | Epic 4 (F4) | US-4.4 | JTBD-01.1 → The absence of a case is evidenced positively, rather than inferred from missing data. | R1 |
| State the receipt outcome without interpretation | PER-01 · PER-03 (witness, no screen) | Epic 6 (F6) | US-6.3 | JTBD-01.1 → "Validated clean" or "exception opened, and here is the case" is stated and announced — never left to be read out of an absence of errors. | R1 |
| Show which fields failed which rules, with focus moved to the summary | PER-01 | Epic 6 (F6) | US-6.4 | JTBD-01.7 → A screen-reader user is told both what failed and where to fix it, and can go straight to the field. | R1 |

---

### Step 4 — Exception Raised and Queued

*Epics 5 and 7 / F5, F7. An exception is the failure outcome of validation and nothing else —
derived, never authored.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Derive one case from one validation failure, carrying its findings as the stated basis | PER-01 · PER-02 (beneficiary, no screen) | Epic 5 (F5) | US-5.1 | JTBD-02.4 → "Why is this case open" is always answerable from the record and never a matter of inference. **(no screen)** | R1 |
| Stamp an immutable receipt position at creation | PER-01 | Epic 5 (F5) | US-5.2 | JTBD-01.2 → The order of work is settled when a case is created and never rearranges itself under the specialist. | R1 |
| Close every door into a case other than a validation failure | PER-01 · PER-03 (witness, no screen) | Epic 5 (F5) | US-5.3 | JTBD-02.4 → Exceptions cannot be authored, parked, or reopened outside the loop. **(no screen)** | R1 |
| Give the case one human-readable reference used everywhere | PER-01 · PER-02 (beneficiary, no screen) | Epic 5 (F5) | US-5.4 | JTBD-01.5 → A question about a case can always be brought with the one identifier that resolves it. | R1 |
| Return open exceptions in strict receipt order | PER-01 | Epic 7 (F7) | US-7.1 | JTBD-01.2 → One list in one settled order, identical across repeated requests, with nothing to choose. | R1 |
| Drop decided cases from the list while keeping them reachable by reference | PER-01 | Epic 7 (F7) | US-7.2 | JTBD-01.2 → What is shown is exactly what still needs a decision, and nothing decided is lost. | R1 |
| Carry no management dimension in the projection at all | PER-01 · PER-03 (witness, no screen) | Epic 7 (F7) | US-7.3 | JTBD-03.4 → The absence of filter, sort, assignment and priority is structural in the data model and API, not a UI omission. **(no screen)** | R3 |

---
### Step 5 — Open an Exception from the Receipt-Ordered Queue

*Epics 7 and 8 / F7, F8. She works from the top, because there is nothing to decide about which
case to work.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| See the open exceptions as an accessible list in receipt order | PER-01 · PER-03 (witness, no screen) | Epic 8 (F8) | US-8.1 | JTBD-01.2 → The next case to work is identifiable without first deciding which case to work. | R1 |
| Open a case in a single action, by keyboard or by pointer | PER-01 | Epic 8 (F8) | US-8.2 | JTBD-01.7 → Row activation never becomes the stage at which the loop ends for a keyboard user. | R1 |
| Receive everything needed to decide in one case fetch | PER-01 | Epic 7 (F7) | US-7.4 | JTBD-01.3 → Entry values, findings, recommendation and decision state arrive together, so nothing needed to form a view is missing. | R1 |
| Let the server, not the screen, say which decisions are available | PER-01 · PER-02 (beneficiary, no screen) | Epic 7 (F7) | US-7.5 | JTBD-02.1 → What may be decided is a fact of the case's state, not of what a browser happens to render. **(no screen)** | R1 |
| Say plainly when there is nothing to work, and where to start | PER-01 | Epic 8 (F8) | US-8.3 | JTBD-01.2 → An empty queue is an honest statement with a route onward, not an ambiguous blank. | R1 |
| Return to the queue after a decision and understand what changed | PER-01 | Epic 8 (F8) | US-8.4 | JTBD-01.2 → Finishing a case puts her back in the flow without re-orienting or keeping side-notes. | R1 |
| Be told when the list is showing only the first 500 cases | PER-01 | Epic 8 (F8) | US-8.6 | JTBD-01.2 → A truncated list never silently misrepresents what still needs a decision. | R2 |
| Keep filtering, sorting, assignment and aging language off the screen | PER-01 · PER-03 (witness, no screen) | Epic 8 (F8) | US-8.5 | JTBD-03.4 → Nothing on the queue implies a management capability the product deliberately does not have. **(no screen)** | R3 |

---

### Step 6 — Read the AI Recommendation and Rationale

*Epics 9 and 10 / F9, F10. The recommendation is a draft written by something that has not seen
the shipment; her job is to decide whether it is right.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Prepare a recommendation without the specialist waiting for it | PER-01 | Epic 9 (F9) | US-9.1 | JTBD-01.1 → Receipt completes on its own terms; the suggestion catches up afterwards. | R1 |
| Store the recommendation as a proposal, never as a change | PER-01 · PER-03 (witness, no screen) | Epic 9 (F9) | US-9.2 | JTBD-03.2 → The AI's output sits on the case un-applied, so agreeing with it is an act of judgement rather than acceptance of a fait accompli. **(no screen)** | R1 |
| Preserve what the AI said, and which model said it | PER-01 · PER-02 (beneficiary, no screen) | Epic 9 (F9) | US-9.3 | JTBD-02.3 → "What did the AI say" is answerable exactly as it was said, beside what the human did about it. **(no screen)** | R1 |
| Make it structurally impossible for the AI to decide or to stray beyond its remit | PER-01 · PER-03 (witness, no screen) | Epic 9 (F9) | US-9.5 | JTBD-03.2 → The answer to "can anything resolve without a human" is the absence of a path, evidenced by test rather than by policy. **(no screen)** | R1 |
| Read why this case is open | PER-01 | Epic 10 (F10) | US-10.1 | JTBD-01.3 → The specific unsatisfied rule and field are on the case, so the exception never feels arbitrary. | R1 |
| Read back the values that were submitted | PER-01 | Epic 10 (F10) | US-10.2 | JTBD-01.3 → The values being reasoned about are the ones actually typed, not a cleaned-up restatement of them. | R1 |
| Read the recommended action and its plain-language rationale | PER-01 · PER-03 (witness, no screen) | Epic 10 (F10) | US-10.3 | JTBD-01.3 → The rationale is intelligible enough to agree or disagree with, without anyone explaining it. | R1 |
| Tell every AI-suggested value from her own at the moment of deciding | PER-01 · PER-02 (beneficiary, no screen) | Epic 10 (F10) | US-10.4 | JTBD-01.3 → Origin is legible on sight, through a screen reader, and in monochrome — at decision time rather than by reconstruction afterwards. | R1 |
| Read the case in one predictable order, with no queue or aging language | PER-01 | Epic 10 (F10) | US-10.8 | JTBD-01.7 → Entry → findings → recommendation → decision → audit is traversable by heading, in that order. | R1 |
| Show generation still in progress without blocking or interrupting | PER-01 | Epic 10 (F10) | US-10.5 | JTBD-01.6 → A slow suggestion never freezes the interface or traps her on the case. | R2 |
| Decide a case with no recommendation, without being told something failed | PER-01 · PER-03 (witness, no screen) | Epic 10 (F10) | US-10.6 | JTBD-01.6 → "No recommendation available" is a condition of the case, not a block on it or an invitation to park it. | R2 |
| Keep the case fully workable when the AI provider is unavailable | PER-01 · PER-03 (witness, no screen) | Epic 9 (F9) | US-9.4 | JTBD-01.6 → A third party's outage costs her a suggestion, not the case's accountability. | R2 |

---

### Step 7 — Decide: Edit / Approve / Reject with a Mandatory Reason

*Epics 11 and 12 / F11, F12. The entire product exists for this step.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Approve the recommendation as proposed | PER-01 | Epic 11 (F11) | US-11.1 | JTBD-01.4 → Adopting the machine's answer is recorded as her decision, not as something that happened while she was looking at the case. | R1 |
| Edit the recommendation and approve her own version | PER-01 · PER-02 (beneficiary, no screen) | Epic 11 (F11) | US-11.2 | JTBD-02.3 → Changed values become the human's and untouched values stay the machine's, field by field. **(no screen)** | R1 |
| Reject a recommendation and close the case without adopting it | PER-01 | Epic 11 (F11) | US-11.3 | JTBD-01.4 → Refusing the machine is a reachable outcome that costs no more than accepting it. | R1 |
| Require a non-empty reason on every edit and every rejection | PER-01 · PER-02 (beneficiary, no screen) | Epic 11 (F11) | US-11.4 | JTBD-02.3 → A decision explains its own justification rather than merely reporting its outcome. **(no screen)** | R1 |
| Refuse any resolution that lacks an authenticated human decision | PER-01 · PER-03 (witness, no screen) | Epic 11 (F11) | US-11.5 | JTBD-03.2 → Human-in-the-loop is a property of the build, not a discipline that depends on how people choose to use it. **(no screen)** | R1 |
| Present three actions with nothing chosen in advance | PER-01 · PER-03 (witness, no screen) | Epic 12 (F12) | US-12.1 | JTBD-01.4 → Choosing the AI's answer costs exactly the same deliberate act as refusing it. | R1 |
| Edit the proposed values and see which ones she changed | PER-01 | Epic 12 (F12) | US-12.2 | JTBD-01.4 → The shape of her edit is visible while she is making it, not only afterwards in the trail. | R1 |
| Write the reason, and be told accessibly when it is missing | PER-01 | Epic 12 (F12) | US-12.3 | JTBD-01.7 → A missing reason returns as an inline, focus-managed, announced error, so the requirement never degrades into a defensive habit. | R1 |
| See exactly what will be recorded before it is recorded | PER-01 | Epic 12 (F12) | US-12.4 | JTBD-01.4 → The last point at which a mistake is cheap comes before the record becomes append-only. | R1 |
| Be shown what was actually recorded, from the server's own record | PER-01 | Epic 12 (F12) | US-12.5 | JTBD-01.4 → Confirmation states the recorded content, not merely that something was recorded. | R1 |
| Complete the whole decision by keyboard, with nothing left to click afterwards | PER-01 | Epic 12 (F12) | US-12.7 | JTBD-01.7 → The decision step completes keyboard-only, and closes itself on a case that is now decided. | R1 |
| Never decide the same case twice, even from two tabs | PER-01 · PER-02 (beneficiary, no screen) | Epic 11 (F11) | US-11.6 | JTBD-02.1 → A case cannot be decided twice or concurrently into a contradictory record. **(no screen)** | R2 |
| Refuse approval of a recommendation that does not exist | PER-01 | Epic 11 (F11) | US-11.7 | JTBD-01.6 → A degraded case is decided on its own values, never by adopting a proposal that was never made. | R2 |
| Handle a case already decided, or a proposal that changed underneath her | PER-01 | Epic 12 (F12) | US-12.6 | JTBD-01.4 → A stale screen produces a clear explanation of what is already true, never a silent overwrite. | R2 |

---

### Step 8 — Audit Entry Written

*Epic 13 / F13. The single chokepoint through which all history is written, inside the same
transaction as the change it describes.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Record every state change on the case exactly once | PER-01 · PER-02 (beneficiary, no screen) | Epic 13 (F13) | US-13.1 | JTBD-02.2 → An unaudited change is not a possible outcome; coverage is one entry per transition, no more and no fewer. **(no screen)** | R1 |
| Capture who, what, when, before, after and origin on every entry | PER-01 · PER-02 (beneficiary, no screen) | Epic 13 (F13) | US-13.2 | JTBD-02.3 → Every question an oversight reviewer brings is already answered by the fields the entry carries. **(no screen)** | R1 |
| Carry the reason with the event that bears it | PER-01 · PER-02 (beneficiary, no screen) | Epic 13 (F13) | US-13.3 | JTBD-02.3 → The justification travels with the change it justifies and cannot be summarised away. **(no screen)** | R1 |
| Make editing or deleting history impossible for anyone, ever | PER-01 · PER-02 (beneficiary, no screen) | Epic 13 (F13) | US-13.4 | JTBD-02.2 → Mutation is rejected by the database privilege model, not merely absent from application code. **(no screen)** | R1 |
| Fail an unauditable change loudly rather than let it proceed quietly | PER-01 · PER-02 (beneficiary, no screen) | Epic 13 (F13) | US-13.5 | JTBD-02.2 → A change and its history commit together, or neither commits. **(no screen)** | R1 |

---

### Step 9 — Review the Per-Case Audit Trail

*Epics 10 and 14 / F10, F14. The step that closes the loop, and the mechanism by which the
oversight reviewer's questions are answered — because he has no access of his own.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Read a closed case as a final, unchangeable record | PER-01 | Epic 10 (F10) | US-10.7 | JTBD-01.5 → A closed case is unmistakably the record rather than a working copy still open to change. | R1 |
| Read the whole story of a case inside the case itself | PER-01 · PER-02 (beneficiary, no screen) · PER-03 (witness, no screen) | Epic 14 (F14) | US-14.1 | JTBD-01.5 → The question is answered in place, with no export, query tool or second system standing between it and the answer. | R1 |
| Distinguish the AI from the humans on every event and every value | PER-01 · PER-02 (beneficiary, no screen) | Epic 14 (F14) | US-14.2 | JTBD-02.3 → A year-old mixed resolution decomposes cleanly into machine proposal and human choice. | R1 |
| Read the reason she gave, in full | PER-01 · PER-02 (beneficiary, no screen) | Epic 14 (F14) | US-14.3 | JTBD-02.3 → Why a value changed is read where it is actually needed, rather than inferred from the outcome. | R1 |
| See complete before-and-after values with nothing ambiguous | PER-01 · PER-02 (beneficiary, no screen) | Epic 14 (F14) | US-14.4 | JTBD-01.5 → "What changed, and from what" needs no interpretation. | R1 |
| Find nothing on the trail that can change it or take it away | PER-01 · PER-02 (beneficiary, no screen) | Epic 14 (F14) | US-14.6 | JTBD-02.2 → The trail offers no edit, correct, delete or export affordance anywhere — the answer stays in place. | R1 |
| Answer the four oversight questions from the case alone | PER-01 · PER-02 (beneficiary, no screen) · PER-03 (witness, no screen) | Epic 14 (F14) | US-14.7 | JTBD-01.5 → Who decided, what the AI recommended, what the human changed and why are all answerable from the UI alone. | R1 |
| Be told if the record's integrity check fails | PER-01 · PER-02 (beneficiary, no screen) | Epic 14 (F14) | US-14.5 | JTBD-02.2 → Tampering surfaces as a visible, unrepaired failure rather than being silently corrected away. **(no screen)** | R2 |

---

### Federal UI Foundation — Inherited by Every Screen

*Cross-cutting. Epic 2 / F2. Established once and inherited by the entry form, queue, case
detail, decision and audit trail.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Work in a USWDS page frame with correct landmarks and banner | PER-01 · PER-03 (witness, no screen) | Epic 2 (F2) | US-2.1 | JTBD-03.3 → The application behaves the way every other federal system she uses behaves, as delivered rather than as promised. | R1 |
| Move between exactly the two places the product has | PER-01 · PER-03 (witness, no screen) | Epic 2 (F2) | US-2.2 | JTBD-03.4 → Navigation offers only the work that exists, implying no dashboard, report or metric the product declined to build. **(no screen)** | R1 |
| Complete every task using the keyboard alone | PER-01 | Epic 2 (F2) | US-2.3 | JTBD-01.7 → The whole job is doable without a pointer, with focus visible at every step. | R1 |
| Be told what went wrong and where, in a way the screen reader announces | PER-01 | Epic 2 (F2) | US-2.4 | JTBD-01.7 → A rejected submission is correctable without hunting the page for what failed. | R1 |
| Tell an AI value from a human value without relying on colour | PER-01 · PER-02 (beneficiary, no screen) | Epic 2 (F2) | US-2.5 | JTBD-01.3 → Provenance survives a screen reader and a monochrome display, everywhere it appears. | R1 |
| Review and sign off every screen before it is called done | PER-01 · PER-03 (witness, no screen) | Epic 2 (F2) | US-2.6 | JTBD-03.3 → Conformance is a property of what shipped, evidenced per screen, rather than a promise attached to a later release. **(no screen)** | R3 |

---
## NaC Derivation Table

Full traceability chain: **JTBD outcome → journey stage → NaC → story**. Every NaC below is
derived from a hiring criterion or success measure in JTBD-CargoExec.md, contextualised by the
journey stage at which the outcome actually matters. NaC serving PER-02 or PER-03 are tagged
**(no screen)** and are verified by test, sign-off, or walkthrough observation.

### PER-01 — Jobs Served Through the Interface

| JTBD ID | Outcome | Journey Stage | NaC | Stories |
|---|---|---|---|---|
| JTBD-01.1 | Receipt is atomic — no entry exists having been received but not assessed | JRN-01.2:Submit a deficient entry | The entry, its findings and its exception either all exist or none of them do | US-3.1, US-5.1 |
| JTBD-01.1 | The submission outcome is stated explicitly, never inferred from an absence of errors | JRN-01.1:Read outcome | She is told "validated clean" or "exception opened, and here is the case" and can act on it without interpreting silence | US-6.3, US-4.4 |
| JTBD-01.1 | The case reference is shown and directly navigable from the outcome | JRN-01.2:Read the exception receipt | The route from "your entry failed" to "the case it opened" is one action, not a search | US-6.3, US-5.4 |
| JTBD-01.1 | Server-side validation is authoritative; client affordances are additive | JRN-01.2:Submit a deficient entry | She can record an entry exactly as it arrived without defeating her own tooling | US-6.2, US-6.1 |
| JTBD-01.1 | The same entry content always produces the same findings | JRN-01.1:Submit | An outcome is reproducible rather than situational | US-4.3 |
| JTBD-01.1 | A deficient entry is not lost to a failed submission | JRN-01.1:Compose | A failed submission costs a correction, never the whole entry | US-6.5, US-3.3 |
| JTBD-01.2 | One list, one ordering, no parameters to choose | JRN-01.2:Enter the queue | She spends attention deciding cases rather than deciding which case to decide | US-7.1, US-8.1, US-5.2 |
| JTBD-01.2 | Closed cases leave the list, so what is shown is what still needs a decision | JRN-01.2:Enter the queue | The list means exactly one thing, and no side-notes are needed to interpret it | US-7.2, US-8.4, US-8.6 |
| JTBD-01.2 | An empty queue says so plainly and offers the route to create an entry | JRN-01.2:Enter the queue | Nothing to work is an honest statement rather than an ambiguous blank | US-8.3 |
| JTBD-01.2 | A row opens the case in a single activation | JRN-01.2:Open the case | Opening the next case is one action from a recognisable anchor | US-8.2, US-7.4 |
| JTBD-01.3 | The case names the unsatisfied rule and the affected field, not a generic failure | JRN-01.2:Read the case | She knows why the case is open before she considers what to do about it | US-10.1, US-10.2 |
| JTBD-01.3 | The rationale is plain-language and on the same screen as the thing it explains | JRN-01.2:Read the case | She can locate which part of the reasoning fails rather than agreeing or refusing on instinct | US-10.3 |
| JTBD-01.3 | Every AI-proposed value carries an origin marker, never by colour alone | JRN-01.3:Open and read | She can tell the machine's values from her own on sight and through her screen reader, at the moment of decision | US-10.4, US-2.5 |
| JTBD-01.3 | The recommendation is presented as an un-applied proposal | JRN-01.4:Read the proposal | Agreeing is an act of judgement rather than acceptance of something already in force | US-9.2 |
| JTBD-01.4 | Approve, Edit and Reject arrive with no default or pre-selection | JRN-01.2:Decide | Choosing the AI's answer costs the same deliberate act as refusing it | US-12.1, US-11.1 |
| JTBD-01.4 | Editing is no more expensive than approving | JRN-01.3:Choose to edit | Partial disagreement has somewhere to go, so it never collapses into a full approval | US-11.2, US-12.2 |
| JTBD-01.4 | A non-empty reason is required on edit and reject, enforced at the API boundary | JRN-01.4:Attempt without a reason | A case cannot close refused or corrected without saying why | US-11.4, US-12.3 |
| JTBD-01.4 | The screen shows what will be recorded before it is recorded, and confirms afterwards | JRN-01.3:Review before commit | Append-only immutability is never experienced as a trap | US-12.4, US-12.5 |
| JTBD-01.4 | Rejection is as reachable as approval | JRN-01.4:Commit to refusing | She can close a case refused rather than close it wrongly resolved | US-11.3 |
| JTBD-01.4 | A decided case cannot be decided again | JRN-01.4:Close the case | Two tabs, or two specialists, cannot produce a contradictory record | US-11.6, US-12.6 |
| JTBD-01.5 | The trail is read inside the case, for open and closed cases alike | JRN-01.5:Open the trail | The product answers the question in place or it does not answer it — and it answers | US-14.1, US-14.7 |
| JTBD-01.5 | Entries are monotonically sequenced per case | JRN-01.5:Open the trail | Chronology is a property of the record rather than an inference from timestamps | US-0.4, US-13.1 |
| JTBD-01.5 | Each entry records before and after values and the reason captured | JRN-01.5:Answer *what changed and from what* | The record explains itself, so she never infers her own past intent | US-14.4, US-14.3, US-0.3 |
| JTBD-01.5 | Origin markers are legible beyond colour alone in the trail | JRN-01.5:Answer *AI versus human* | She can say exactly which part of a mixed decision was her judgement | US-14.2 |
| JTBD-01.5 | A closed case shows the recorded decision in place of decision controls | JRN-01.5:Open the closed case | The record is unmistakably the record, not a working copy | US-10.7 |
| JTBD-01.5 | The case reference is the durable identifier across every screen | JRN-01.5:Locate the case | Whoever asks can hand her the one thing she needs to answer | US-5.4, US-7.2 |
| JTBD-01.6 | AI unavailability degrades to an explicit state and blocks nothing | JRN-01.6:Read the degraded state | The outage costs her a suggestion, not the case's accountability | US-9.4, US-10.6 |
| JTBD-01.6 | Generation shows accessible progress instead of freezing the interface | JRN-01.6:Wait, briefly | A wait is never indistinguishable from a dead request, so no case gets parked in a side list | US-10.5, US-9.1 |
| JTBD-01.6 | The decision path has no dependency on a recommendation existing | JRN-01.6:Decide without a proposal | A degraded case is decided on its own values, and no phantom proposal is adoptable | US-11.7 |
| JTBD-01.6 | The audit record on the degraded path is as complete as any other | JRN-01.6:Verify the record | The outage does not create a class of thinly-recorded cases | US-13.2 |
| JTBD-01.7 | Full keyboard operability with visible focus across every screen | JRN-01.7:Decide by keyboard | The whole job completes with no pointer-only step and no workaround | US-2.3, US-6.6, US-8.2, US-12.7 |
| JTBD-01.7 | Error summaries move focus and are announced; findings link to their fields | JRN-01.7:Recover from the error summary | Recovery is a short path rather than a re-traversal of the whole form | US-2.4, US-6.4 |
| JTBD-01.7 | Status and outcome messaging is exposed through live regions | JRN-01.7:Hear the receipt outcome | The outcome is spoken, so she never has to hunt for a message region | US-6.3 |
| JTBD-01.7 | Heading structure carries a screen-reader user through the case in order | JRN-01.7:Read the case in order | Entry → findings → recommendation → decision → audit is traversable in that order | US-10.8 |

### PER-02 — Jobs Served by Properties of the Record *(non-user; no screen, ever)*

| JTBD ID | Outcome | Journey Stage | NaC | Stories |
|---|---|---|---|---|
| JTBD-02.1 | No code path resolves a case without an authenticated human decision | JRN-03.1:Probe the accountability claim | "The AI resolved it" is an outcome the system cannot reach, evidenced by test **(no screen)** | US-11.5, US-0.5 |
| JTBD-02.1 | Every decision carries an authenticated specialist identity as its actor | JRN-02.1:Hear *who decided, and when* | A named person at a stated time — not "the system", not "the process" **(no screen)** | US-1.1, US-1.3, US-13.2 |
| JTBD-02.1 | Every mutating request resolves to a known specialist | JRN-02.1:Hear *who decided, and when* | Nothing reaches the record from an unidentified source, and no identity can be borrowed **(no screen)** | US-1.2, US-1.4, US-1.5, US-7.5 |
| JTBD-02.1 | Decisions are idempotent and conflict-handled | JRN-02.1:Hear *who decided, and when* | A case cannot be decided twice or concurrently into a contradictory record **(no screen)** | US-11.6 |
| JTBD-02.2 | Mutation is rejected at the database privilege level, not merely absent from code | JRN-02.1:Satisfy himself the record could not have been altered | An attempt to alter history fails, including one made directly against the database **(no screen)** | US-0.1, US-13.4, US-14.6 |
| JTBD-02.2 | Entries are monotonically sequenced and hash-linked | JRN-02.1:Satisfy himself the record could not have been altered | Tampering is evident rather than merely difficult, and is surfaced rather than repaired **(no screen)** | US-0.4, US-14.5 |
| JTBD-02.2 | Every state change produces exactly one entry, committed with the change | JRN-02.1:Satisfy himself the record could not have been altered | A change without its history, or history without its change, is prevented by coupling rather than convention **(no screen)** | US-13.1, US-13.5 |
| JTBD-02.3 | Origin is stored at value granularity and re-stamped on edit | JRN-02.1:Hear *what the AI said versus what the human chose* | The human's contribution to a partly-edited resolution is provable rather than plausible **(no screen)** | US-0.2, US-11.2, US-14.2 |
| JTBD-02.3 | What the AI said is preserved as it was said, with model identity and timestamp | JRN-02.1:Hear *what the AI said versus what the human chose* | A refusal is a refusal of something still visible in the record **(no screen)** | US-9.3, US-3.2 |
| JTBD-02.3 | A non-empty reason is mandatory and rendered where it is read | JRN-02.1:Hear *why*, and *why the case was open at all* | The decision explains its own justification instead of reporting only its outcome **(no screen)** | US-11.4, US-13.3, US-14.3 |
| JTBD-02.4 | An exception is opened only and automatically by a validation failure | JRN-02.1:Hear *why*, and *why the case was open at all* | "Why was this case open" is a recorded fact, never reconstructed from the correction that followed **(no screen)** | US-5.1, US-5.3, US-3.4 |
| JTBD-02.4 | Validation names each unsatisfied rule and field and is deterministic | JRN-02.1:Hear *why*, and *why the case was open at all* | The stated basis of an exception is specific and reproducible a year later **(no screen)** | US-4.1, US-4.2, US-4.3 |

### PER-03 — Jobs Served by Delivery Evidence *(non-user; no screen, ever)*

| JTBD ID | Outcome | Journey Stage | NaC | Stories |
|---|---|---|---|---|
| JTBD-03.1 | All six loop stages carried by shipped browser surfaces, walked in one sitting | JRN-03.1:Watch receive and validate → Watch audit close the loop | The walkthrough needs no explanation, no workaround, and no promise about a future release **(no screen)** | US-6.3, US-8.1, US-10.3, US-12.1, US-14.1 |
| JTBD-03.1 | Entries are created by hand during the demonstration | JRN-03.1:Set the terms | Receive and validate sit inside the demonstrated path rather than behind it **(no screen)** | US-3.4, US-6.1 |
| JTBD-03.1 | The loop remains completable with the AI stage degraded | JRN-03.1:Probe the accountability claim | The governance guarantee does not depend on a third party being healthy **(no screen)** | US-9.4, US-10.6 |
| JTBD-03.2 | The accountability answer is structural and backed by test | JRN-03.1:Probe the accountability claim | She is shown a test, not a toggle — a configuration switch would admit the alternative **(no screen)** | US-0.5, US-9.5, US-11.5 |
| JTBD-03.2 | Reason capture is load-bearing rather than a formality | JRN-03.1:Watch the human decide | The reason is enforced before the case can close and rendered where it is read **(no screen)** | US-11.4, US-14.3 |
| JTBD-03.3 | USWDS and WCAG 2.1 AA conformance observable in the delivered screens | JRN-03.1:Watch receive and validate | Federal standards are something this release already has, not something the next one is promised to add **(no screen)** | US-2.1, US-2.3 |
| JTBD-03.3 | Every screen has a manual and assistive-technology review sign-off | JRN-03.1:Check the delivered UI against federal standards | Conformance is evidenced per screen, because there is no CI gate to lean on **(no screen)** | US-2.6 |
| JTBD-03.4 | Key exclusions are structural, not UI omissions | JRN-03.1:Check what was declined | The narrowness reads as a deliberate purchase of loop completeness, checkable line by line against PRD §10 **(no screen)** | US-7.3, US-8.5, US-2.2 |

---
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
## NaC-to-Acceptance Criteria Mapping

Verifies that each NaC on the map is actually discharged by acceptance criteria already written
in UserStories-CargoExec.md — that the map added a *why*, not a new requirement. AC text is
abbreviated; the authoritative wording is in the story.

| NaC | Story | Acceptance criterion that discharges it | Aligned? |
|---|---|---|---|
| JTBD-01.1 → No entry can exist having been received but never assessed | US-3.1 | "Given a forced failure in the audit writer during receipt, when the transaction aborts, then zero `cargo_entries` rows exist … and no orphan validation result or exception exists." | Yes |
| JTBD-01.1 → "Validated clean" or "exception opened, here is the case" is stated, never inferred | US-6.3 | Receipt outcome stated explicitly with case reference and navigable link; outcome announced via live region | Yes |
| JTBD-01.1 → The absence of a case is evidenced positively | US-4.4 | "Given a `PASS` result … `receipt_outcome` is `VALIDATED_CLEAN` and `exception` is `null`"; and `404 EXCEPTION_NOT_FOUND` says "That entry passed validation, so it has no exception." | Yes |
| JTBD-01.1 → Client-side help never decides the outcome | US-6.2 | Browser does not block submission of a deliberately incomplete entry; server-side F4 is authoritative | Yes |
| JTBD-01.1 → An outcome is reproducible rather than situational | US-4.3 | "Given one entry's content, when it is validated twice in the same process and once in a second process, then the outcome and the finding list are identical … byte-for-byte" | Yes |
| JTBD-01.2 → One list, one settled order, identical across requests | US-7.1 | Open exceptions returned in ascending receipt order, stable and deterministic across repeated requests, no parameters | Yes |
| JTBD-01.2 → What is shown is exactly what still needs a decision | US-7.2 | Resolved/rejected cases excluded from the queue while remaining reachable by reference | Yes |
| JTBD-01.2 → The order never rearranges under her | US-5.2 | Immutable receipt position stamped at exception creation | Yes |
| JTBD-01.2 → Opening the next case is one action | US-8.2 | Row activation operable by keyboard and pointer, navigating to case detail | Yes |
| JTBD-01.3 → The exception never feels arbitrary | US-10.1 | Case detail renders the validation findings naming the unsatisfied rule and affected field | Yes |
| JTBD-01.3 → The rationale is intelligible enough to agree or disagree | US-10.3 | Recommended action and plain-language rationale rendered on the case, as an un-applied proposal | Yes |
| JTBD-01.3 → Origin is legible on sight, by screen reader and in monochrome | US-10.4, US-2.5 | "Given CSS colour overridden to monochrome … AI-versus-human origin remains discoverable on every value and every event"; provenance exposed as text to assistive technology | Yes |
| JTBD-01.4 → Choosing the AI's answer costs the same deliberate act as refusing it | US-12.1 | Approve/Edit/Reject rendered with no default and no pre-selection | Yes |
| JTBD-01.4 → A case cannot close refused or corrected without saying why | US-11.4 | Non-empty reason required on `EDIT_APPROVE` and `REJECT`, enforced at the API boundary; DB `CHECK` rejects a blank or short reason inserted directly in SQL | Yes |
| JTBD-01.4 → Append-only immutability is never experienced as a trap | US-12.4, US-12.5 | Pre-submission summary of exactly what will be recorded; post-decision confirmation rendered from the server's own record | Yes |
| JTBD-01.4 → Partial disagreement has somewhere to go | US-11.2, US-12.2 | Edit-and-approve stores changed values `HUMAN` and untouched values `AI`; changed fields visibly marked specialist-modified in the form | Yes |
| JTBD-01.5 → The question is answered in place, with no export or second system | US-14.1, US-14.7 | Chronological per-case trail rendered inside the case, answering the four oversight questions from the UI alone | Yes |
| JTBD-01.5 → Chronology is a property of the record, not an inference | US-0.4 | `UNIQUE (case_id, case_sequence)` from 1, `global_sequence` total order, `prev_entry_hash` linkage, `occurred_at` from the database's own `now()` | Yes |
| JTBD-01.5 → The record shows a genuine before and after | US-0.3 | Entry and its field origins byte-identical to receipt state after any later action; corrections written to `decision_values`, never to `cargo_entries` | Yes |
| JTBD-01.5 → The closed case is the record, not a working copy | US-10.7 | Closed-case read-only presentation with the recorded decision shown in place of decision controls | Yes |
| JTBD-01.6 → The outage costs a suggestion, not the case's accountability | US-9.4 | Degraded mode: explicit "no recommendation available"; entry creation, validation, exception opening, decision and audit writing all unblocked | Yes |
| JTBD-01.6 → A wait is never indistinguishable from a dead request | US-10.5 | Accessible progress status announced during generation; navigation remains available; the interface does not freeze | Yes |
| JTBD-01.6 → No phantom proposal is adoptable | US-11.7 | Approval of a recommendation that does not exist is refused at the API boundary | Yes |
| JTBD-01.7 → The whole job completes with no pointer-only step | US-2.3 | "Given the five product tasks … when each is attempted with the keyboard alone, then all five complete successfully (SM-11)" | Yes |
| JTBD-01.7 → Recovery is a short path, not a re-traversal | US-2.4, US-6.4 | Error summary is first child of the form region, `role="alert"`, `tabindex="-1"`, takes focus, items link to the offending control by `id` | Yes |
| JTBD-01.7 → The case is traversable by heading in the intended order | US-10.8 | Heading structure and reading order run entry → findings → recommendation → decision → audit | Yes |
| JTBD-02.1 → "The AI resolved it" is unreachable **(no screen)** | US-0.5, US-11.5 | "Given an `OPEN` exception, when a transaction sets `state = 'RESOLVED'` without inserting a `decisions` row, then the commit is refused with `HITL_VIOLATION`"; no `AI`/`SYSTEM` principal exists in `specialists` | Yes |
| JTBD-02.1 → The actor cannot be made to name someone else **(no screen)** | US-1.3 | `actor_specialist_id` taken from the session principal; a body containing `decided_by`/`actor`/`on_behalf_of` is rejected `422 REQUEST_MALFORMED` | Yes |
| JTBD-02.1 → A case cannot be decided twice into a contradictory record **(no screen)** | US-11.6, US-0.5 | `UNIQUE (exception_id)` on `decisions`; second decision surfaces HTTP 409 `EXCEPTION_ALREADY_DECIDED` | Yes |
| JTBD-02.2 → An attempt to alter history fails, including directly against the database **(no screen)** | US-0.1, US-13.4 | `cargoexec_app` holds `SELECT, INSERT` only; unconditional `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger raises `AUDIT_IMMUTABLE` even for owner/superuser | Yes |
| JTBD-02.2 → Tampering is evident and surfaced, never repaired **(no screen)** | US-0.4, US-14.5 | "Given a copy of the database with one middle entry excised … reports `chain_verified: false` and the `case_sequence` of the first divergence, and it performs no repair, rewrite, or annotation" | Yes |
| JTBD-02.2 → A change and its history commit together or neither commits **(no screen)** | US-13.5, US-13.1 | Deferred constraint triggers refuse commits lacking the matching audit entry (`AUDIT_COUPLING_VIOLATION`) | Yes |
| JTBD-02.3 → The human's contribution is provable, not plausible **(no screen)** | US-0.2 | "Given an edit-and-approve decision over three proposed values where one was changed … the changed value carries `HUMAN`, the two unchanged carry `AI` … zero unattributed values (SM-3)" | Yes |
| JTBD-02.3 → What the AI said is preserved as it was said **(no screen)** | US-9.3 | Model identity, prompt version and generation timestamp recorded with the proposal; proposal never written into the entry of record | Yes |
| JTBD-02.3 → The justification travels with the change **(no screen)** | US-13.3, US-14.3 | Reason text carried onto the audit entry for edit and reject and rendered in full in the trail | Yes |
| JTBD-02.4 → "Why was this case open" is a recorded fact **(no screen)** | US-5.1 | Exception references its `validation_result_id` with `validation_outcome = 'FAIL'`; findings read through the reference so basis and record cannot diverge | Yes |
| JTBD-02.4 → Exceptions cannot be authored or bypassed **(no screen)** | US-5.3, US-3.4 | No exception-authoring, reopen or park path; no import, bulk-upload, ingestion adapter or CLI import; `skip_validation`/`force` rejected `422` | Yes |
| JTBD-02.4 → The stated basis is specific, not generic **(no screen)** | US-4.2 | Presence gating means an empty field yields only `RIV-030`, never a contradictory pair; findings ordered by ascending `rule_id` and consumed unchanged everywhere | Yes |
| JTBD-03.1 → The walkthrough needs no explanation or workaround **(no screen)** | US-6.3, US-8.1, US-10.3, US-12.1, US-14.1 | Each of the six loop stages is carried by a named shipped screen with its own AC; no API transcript required | Yes |
| JTBD-03.1 → Receive and validate sit inside the demonstrated path **(no screen)** | US-3.4 | "Given the deployed database, when migrations are reviewed, then none inserts a cargo entry, exception, recommendation, decision, or audit entry — there is no seeded demonstration dataset." | Yes |
| JTBD-03.2 → She is shown a test, not a toggle **(no screen)** | US-9.5, US-11.5 | Absence of any scheduled job, background worker, retry path or system actor able to transition a case, verified by test rather than policy | Yes |
| JTBD-03.3 → Conformance is evidenced per screen **(no screen)** | US-2.6 | "Given each of the six screens/regions … a signed checklist record exists naming the reviewer, the date, the screen, and any defects with their resolution (SM-10)" | Yes |
| JTBD-03.4 → The exclusion is structural, not a UI omission **(no screen)** | US-7.3, US-0.5 | Queue API carries no filter/sort/assignment/priority parameter; schema dump contains no `assigned_to`, `priority`, `sla_due_at`, `age_days`, `role`, `permission`, `exported_at`, `source_system`, `is_seed`, `tariff_*` or `hts_code` column | Yes |
| JTBD-03.4 → Navigation implies nothing that does not exist **(no screen)** | US-2.2, US-8.5 | Exactly two navigation destinations; no dashboard, reports, metrics, settings, administration or export item; no filtering, sorting, assignment or aging language on the queue | Yes |

**Alignment result: 43 of 43 NaC discharged by existing acceptance criteria — zero NaC requiring
a criterion that UserStories-CargoExec.md does not already contain, and zero acceptance criteria
contradicted by a NaC.**

---

## Self-Check

| Check | Result |
|---|---|
| Every UserStory (US-0.1 … US-14.7) appears in the map | ✅ 84 of 84, each exactly once |
| Every mapped story has a NaC derived from a JTBD outcome | ✅ every activity row carries a `JTBD-XX.Y →` NaC |
| NaC Derivation Table has full traceability chains | ✅ 54 chains, JTBD → journey stage → NaC → stories |
| Release planning groups defined with rationale | ✅ R1 (70), R2 (11), R3 (3), with the single-release rationale stated |
| No loop stage deferred past the first release | ✅ all six stages complete in R1; R2 is resilience, R3 is evidence |
| Each release enables at least one complete journey | ✅ R1: JRN-01.1–01.5, 01.7, 02.1; R2: JRN-01.6; R3: JRN-03.1 final stage |
| Coverage analysis identifies gaps and orphans | ✅ zero JTBD gaps, zero orphan stories, deliberate absences listed separately |
| NaC-to-Acceptance-Criteria mapping verifies alignment | ✅ 43 of 43 aligned |
| PER-02 / PER-03 never operate a backbone step | ✅ beneficiary/witness cells only, every non-user NaC tagged **(no screen)** |
| No excluded capability appears as a step, epic, story or NaC | ✅ checked against `.planning/PROJECT.md` Out of Scope and PRD §10 |
| Backbone matches the governed loop as the specialist experiences it | ✅ sign in → enter → validate → except/queue → open → read recommendation → decide with reason → audit written → review trail |

---

*Document generated by Pivota Spec Framework — Story Map Generator*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11); derived from PRD v1.0, PERSONAS v1.0, JTBD v1.0, JOURNEYS v1.0, UserStories v1.0*
*Last updated: 2026-09-11*
