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
