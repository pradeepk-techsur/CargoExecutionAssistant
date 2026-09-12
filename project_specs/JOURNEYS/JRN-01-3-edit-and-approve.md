
### JRN-01.3: Disagree in Part — Edit the Resolution and Approve It

**Persona:** PER-01 (Dana Reyes)
**Scenario:** Dana opens an exception where the AI has proposed a resolution across several values. She agrees with most of it but one proposed value is wrong for reasons the model could not have known — it has not seen the shipment and she has. She edits that value, leaves the others as proposed, writes a non-empty reason in her own words explaining why she changed it, and approves the modified resolution. This is the journey that makes per-value provenance load-bearing: afterwards the record must say, field by field, which values were the machine's and which were hers. A resolution that collapses into a single ambiguous origin would make her own contribution unprovable (R-5).

**Related Jobs:** JTBD-01.3, JTBD-01.4, JTBD-01.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Open and read | Opens the case from the queue and reads the entry values, the validation findings, and the AI's proposed resolution values with their rationale, each proposed value marked AI-origin | Case detail (F10 on F9) | "Most of this is right. That one value is not — it does not match what actually shipped." | Engaged, then sceptical on one point | The disagreement is partial, which is the hardest shape to record: whole-approve and whole-reject both misrepresent what she thinks | Present the proposal as a set of individually attributed values rather than one indivisible block, so partial disagreement has somewhere to go |
| Choose to edit | Selects Edit from the three undefaulted actions; the system opens the proposed values in an editable USWDS form pre-populated with what the AI proposed | Decision (F12 on F11) | "I do not want to reject the whole thing to fix one field." | Purposeful | If Edit were harder to reach than Approve, she would approve something she partly disagrees with — the exact failure mode the product exists to prevent | Three actions at equal weight and equal cost, so the accurate choice is never the expensive one |
| Change the value | Overwrites the one value she disputes and leaves the rest untouched; the system visibly marks the changed field as specialist-modified while it is still on screen | Decision (F12) | "One field changed, four left as proposed. That is exactly what I mean." | Precise, in control | Without in-form marking she cannot see the shape of her own edit before committing it, and will re-read every field to be sure | Live specialist-modified marking on changed fields, so the diff is visible at decision time and not only afterwards in the trail |
| Write the reason | Types a non-empty reason explaining why the proposed value was wrong; the reason field is required, accessibly marked, and enforced at the API boundary as well as in the browser | Decision (F12 on F11) | "Future me, or someone asking about this in a year, needs the why and not just the what." | Conscientious, slightly slowed | A required field invites a single character (R-8); the control cannot make a reason meaningful, only mandatory | Render reasons in the trail where they are actually read, so writing a real one has a visible payoff rather than being a toll |
| Review before commit | Reads the pre-submission summary showing exactly what will be recorded — changed value, retained values, reason, decision type | Decision (F12) | "That is what I am about to put my name on." | Deliberate | This is the last point at which a mistake is cheap; after commit the record is append-only by construction | Show what will be recorded *before* it is recorded, so append-only immutability is never experienced as a trap |
| Commit the decision | Submits; the system records the decision with actor, timestamp, decision type, reason and resolved values — re-stamping the changed value `HUMAN` while untouched values retain `AI` — and writes the audit entry in the same transaction | Decision (F12) → F11, F13 | "Mine on that field, its on the rest, and the reason is attached to the change." | Relieved, accountable | If provenance were stored per record rather than per value, this whole journey would produce an unreadable outcome | Value-granular provenance in the schema itself (F0, §4.3 #3), so a mixed resolution stays attributable field by field |
| Verify the provenance | Opens the audit trail and confirms the edit entry shows before and after values, her reason, her identity, and `HUMAN` against the field she changed with `AI` retained on the others | Audit trail (F14 on F13) | "It distinguishes them. I can prove which part of this was my judgement." | Satisfied | The marking must survive into the trail and be legible beyond colour alone, or it is distinguishable only to a sighted reader | Origin conveyed by text and structure as well as visually, in both the case view and the trail (NFR-4) |

#### Key Moments
- **Decision Point:** Choose to edit — the moment the human stops being a ratifier and becomes a decider. If editing is more expensive than approving, the product quietly converts every partial disagreement into a full approval.
- **Risk of Abandonment:** Write the reason — a mandatory field with no visible consumer is where reason capture degrades to a formality. Its defence is that the reason is rendered in the trail (F14) where it is read.
- **Delight Opportunity:** Verify the provenance — seeing `HUMAN` against the one field she changed, next to `AI` on the four she did not, is the product proving its central claim to the person whose accountability depends on it.
- **Structural Guarantee Visible:** Commit the decision — re-stamping happens in the same transaction as the state change, so a resolution cannot exist with stale or missing origin.

#### Success Outcome
The stored resolution carries `HUMAN` origin on the value Dana changed and `AI` origin on every value she left, with a non-empty reason attached to the edit — satisfying JTBD-01.4 (SM-4 zero auto-apply, SM-5 100% reason capture) and JTBD-01.3's provenance measure (SM-3: 100% of recorded values attributed, zero unattributed). The partially-edited case answers "what did the human actually change" per value from the UI alone (SM-2).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Open and read | F10, F9, F4 |
| Choose to edit | F12, F11 |
| Change the value | F12, F2 |
| Write the reason | F12, F11, F2 |
| Review before commit | F12 |
| Commit the decision | F12, F11, F13, F0 |
| Verify the provenance | F14, F13 |

---
