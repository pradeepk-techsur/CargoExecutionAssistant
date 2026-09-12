
### JRN-01.2: Work an Exception End to End and Approve the Recommendation

**Persona:** PER-01 (Dana Reyes)
**Scenario:** Dana types an entry that is missing required information. Receipt assesses it, validation fails, and an exception is derived and opened in the same transaction — she does not create the case, the failure creates it. The case appears in the single receipt-ordered queue. She opens it from the top of the list, reads the validation findings that put it there and the AI's recommended resolution action with its plain-language rationale, decides she agrees with it, and approves it as proposed. This is the reference walk of the complete governed loop: **receive → validate → except → recommend → human decide → audit**, all six stages, in one sitting, through the browser.

**Related Jobs:** JTBD-01.1, JTBD-01.2, JTBD-01.3, JTBD-01.4, JTBD-01.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Submit a deficient entry | Types the entry as it actually arrived — one required field genuinely absent — and submits; the system persists it, validates it, finds the unsatisfied rules and opens an exception, all inside one transaction | Entry form (F6) → F3, F4, F5 | "This one is going to fail, and it should fail." | Matter-of-fact | She is deliberately submitting something incomplete; if the form fought her client-side she would have to defeat her own tooling to record reality | Client-side affordances that assist but never pre-empt — F4 on the server is authoritative, so the entry can be received exactly as it arrived |
| Read the exception receipt | Reads the outcome message stating *exception opened*, with the case reference shown and directly navigable, and the failed rules named field by field with an error summary that takes focus | Entry form (F6) | "Two rules, and it names the fields. So I know why this is open before I ever open it." | Clear-headed, unsurprised | A generic "validation failed" would make the exception feel arbitrary and force her to reconstruct the basis later (R-10) | Carry the named per-rule findings forward onto the case so the basis is stated once and never re-derived (F4 → F5) |
| Enter the queue | Goes to the queue and sees the open exceptions as one list in ascending receipt order — no filter controls, no sort headers, no priority badges, no assignment | Queue (F8 on F7) | "Top of the list. I do not have to decide what to work, only how to decide it." | Unburdened | At larger volumes this ordering would be insufficient — but filtering, sorting, assignment and prioritisation are excluded by PROJECT.md, and their absence is the design | An honest empty state and a stable, repeatable order, so the list means exactly "what still needs a decision" and nothing else |
| Open the case | Identifies the row by case reference, receipt time and failure summary, and activates it in a single action | Queue (F8) → Case detail (F10) | "That is the one I just filed. Same reference." | Oriented | If row activation were pointer-only, the whole loop would break for a keyboard user at the second stage | Row activation operable by keyboard and pointer alike, with the case reference as the recognisable anchor between screens |
| Read the case | Reads the submitted entry values, the validation findings that opened the exception, and the AI's recommended action with its plain-language rationale — every AI-proposed value carrying an origin marker conveyed visually *and* programmatically, never by colour alone | Case detail (F10 on F9) | "It is proposing this because those two rules were not satisfied. I can follow the reasoning — and I can see which values are its, not mine." | Attentive, mildly sceptical by habit | A plausible-but-wrong recommendation read quickly is the central risk of the whole product (R-1); nothing on screen can make her read carefully | Rationale on the same screen as the thing it explains, and the proposal presented as un-applied — so agreeing is an act of judgement rather than an acceptance of a fait accompli |
| Decide | Chooses Approve from three equally-presented actions with no default and no pre-selection; reviews the pre-submission summary of exactly what will be recorded | Decision (F12 on F11) | "I agree with it as proposed. Nothing to change, so no reason to write." | Deliberate | Approval is the lowest-effort path and therefore the one most easily given without thought; only the absence of a default keeps it an act | No pre-selected choice anywhere in the control group, so choosing the AI's answer costs the same deliberate keystroke as refusing it |
| Confirm | Submits the approval; the system records the decision with her actor identity, timestamp and decision type, writes the audit entry in the same transaction, and confirms what was recorded — the untouched values retaining `AI` origin | Decision (F12) → F11, F13 | "Recorded as mine, with what it proposed kept as it said it." | Settled | A confirmation that merely says "success" would leave her unsure what was actually stored | Post-decision confirmation that states the recorded content, not just the recorded fact — and closes the decision controls on the now-closed case |
| Close the loop | Opens the case's audit trail and reads the chronology back: entry received, validated, exception opened, recommendation generated (`AI`), decision approved (her identity) | Audit trail (F14 on F13) | "Five events, in order, and it says which of them was the machine." | Confident | Nothing forces her to look; the trail's value is only realised if reading it is one action away from where she already is | Trail reachable from inside the case itself, for open and closed cases alike, so verification never requires leaving the work |

#### Key Moments
- **Decision Point:** Decide — the entire product exists for this stage. Approve, Edit and Reject must arrive equally weighted, because a default here would convert human-in-the-loop from a guarantee into a formality (R-1, NFR-5).
- **Risk of Abandonment:** Read the case — if the rationale is not plain-language, Dana either rubber-stamps it or ignores it entirely; both outcomes destroy the value of the recommend stage while leaving it apparently present (SM-9).
- **Delight Opportunity:** Close the loop — reading her own decision back in a chronology she did not have to assemble is the moment the audit trail stops being overhead and becomes the thing she trusts.
- **Structural Guarantee Visible:** Confirm — the decision and its audit entry commit together or neither commits (NFR-6), so an approved case with no history is not a state the system can be in.

#### Success Outcome
All six governed loop stages complete in one unbroken browser session with no workaround, no verbal bridging and no pre-staged data (SM-1: 6 of 6). The case reaches `RESOLVED` only through Dana's recorded decision (SM-4: zero auto-apply), every state change carries exactly one audit entry (SM-6), and the resolved case answers who decided, what the AI recommended, what the human changed and why from the UI alone (SM-2) — satisfying JTBD-01.4's and JTBD-01.5's success measures together.

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Submit a deficient entry | F6, F3, F4, F5, F13 |
| Read the exception receipt | F6, F4, F5 |
| Enter the queue | F8, F7 |
| Open the case | F8, F10, F7 |
| Read the case | F10, F9, F4 |
| Decide | F12, F11 |
| Confirm | F12, F11, F13 |
| Close the loop | F14, F13 |

---
