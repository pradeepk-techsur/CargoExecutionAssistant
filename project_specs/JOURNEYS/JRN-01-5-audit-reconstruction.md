
### JRN-01.5: Reconstruct a Resolved Case From Its Audit Trail

**Persona:** PER-01 (Dana Reyes)
**Scenario:** A case Dana resolved some time ago has been questioned — a colleague has asked about it, or a review has surfaced it, or she simply no longer trusts her own memory of what she did. She needs to answer four questions about it: who decided, what changed, when, and which values came from the AI versus from her. She has no export, no query tool and no second system, and she needs none: she opens the case and reads its trail in place. This journey is the one that makes CargoExec's central claim testable by the person who is accountable for it, and it is also the mechanism by which the oversight reviewer's questions (JRN-02.1) are answered, since he has no access of his own.

**Related Jobs:** JTBD-01.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Locate the case | Navigates to the case by its reference; the queue shows only open exceptions, so a closed case is reached by its reference rather than by browsing the list | Queue (F8) → Case detail (F10) | "It is closed, so it is not in the queue — I need the reference I already have." | Mildly effortful | Closed cases are deliberately absent from the queue and there is no cross-case search (excluded, PRD §10) — so she must arrive holding the reference | Case reference usable as the stable identifier across receipt message, queue row, case, and trail, so whoever asks can always hand her the one thing she needs |
| Open the closed case | Reads the case in its closed, read-only presentation: entry values, validation findings, the preserved recommendation, and the recorded decision, with no editing affordance anywhere | Case detail (F10) | "Nothing here is editable. Good — this is the record, not a working copy." | Reassured | A read-only screen that looks like an editable one invites a moment of doubt about whether the record is still live | Unmistakable closed-case presentation, with the recorded decision shown in place of the decision controls |
| Open the trail | Activates the audit trail from within the case; the chronological per-case event list renders in monotonic sequence order | Audit trail (F14 on F13) | "Every event, in the order it happened, without me having to reason about ordering." | Focused | A history whose order is a matter of interpretation is not a history | Monotonic per-case sequencing so chronology is a property of the record rather than an inference from timestamps |
| Answer *who and when* | Reads the actor identity and timestamp on each entry — entry received, validated, exception opened, recommendation generated (`AI` actor), decision taken (her identity) | Audit trail (F14) | "That is my name against the decision, and the machine's against the proposal. Different actors, plainly." | Confident | If the AI and the human appeared as the same kind of actor, the accountability question would be unanswerable at a glance | Distinguish machine-originated entries from specialist-originated entries as a first-class property of the entry, not as a naming convention |
| Answer *what changed and from what* | Reads the before and after values on the decision entry, and the reason text where one was captured | Audit trail (F14) | "Before, after, and the reason I gave for the difference. It explains itself." | Satisfied | A record that states an outcome without its justification forces her to infer her own past intent (PRD §2.1 #3) | Reason text rendered inline in the trail at the entry it belongs to, not summarised away |
| Answer *AI versus human* | Reads the per-value origin markers — `AI` against values retained as proposed, `HUMAN` against values she changed — conveyed by text and structure, not by colour alone | Audit trail (F14 on F0, NFR-4) | "Field by field. I can say exactly which part of this decision was mine." | Vindicated | Per-record provenance would collapse a mixed resolution into one ambiguous origin and end the reconstruction here (R-5) | Value-granular origin rendered in the trail as well as stored, so the reconstruction needs nothing outside the screen |

#### Key Moments
- **Decision Point:** Open the trail — this is where the product either answers the question in place or sends her looking elsewhere. There is no export and no second system (PRD §10 #5); the trail answers in place or it does not answer.
- **Risk of Abandonment:** Locate the case — with no cross-case search in v1, arriving without the reference is the one way this journey stalls. The case reference must therefore be the durable currency carried on every prior screen.
- **Delight Opportunity:** Answer *AI versus human* — the moment a year-old mixed resolution decomposes cleanly into machine proposal and human choice is the product delivering exactly what it promised.
- **Structural Guarantee Visible:** Open the trail — the UI exposes no edit, correct or delete affordance, and mutation is rejected at the database privilege level rather than merely omitted from the application (NFR-3).

#### Success Outcome
All four oversight questions — who decided, what the AI recommended, what the human changed, and why — are answered for the case from the application UI alone, with no export, query tool or secondary system involved (JTBD-01.5 success measure; SM-2 at 100%, against SM-6 100% audit coverage with zero unaudited transitions). This is also the mechanism that satisfies PER-02's needs indirectly, since JRN-02.1 depends entirely on this trail being sufficient on its own.

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Locate the case | F8, F7, F10 |
| Open the closed case | F10, F12 (read-only state) |
| Open the trail | F14, F13, F10 |
| Answer *who and when* | F14, F13, F1 |
| Answer *what changed and from what* | F14, F13, F11 |
| Answer *AI versus human* | F14, F13, F0, F9 |

---
