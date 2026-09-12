
### JRN-01.4: Reject the Recommendation Outright, With a Reason

**Persona:** PER-01 (Dana Reyes)
**Scenario:** Dana opens an exception and reads a recommendation she does not merely want to adjust — she thinks the proposed action is wrong in kind. The AI has reasoned from the entry values and the validation findings, but it has not seen the underlying shipment documentation and its proposal would resolve the case in a way she is not willing to have her name on. She rejects it, writes a mandatory reason in her own words, and closes the case as `REJECTED`. The record must afterwards show not only that it was refused, but why — because a rejection with no captured justification is the pain point that forces a reviewer, or Dana herself, to infer intent months later (PRD §2.1 #3).

**Related Jobs:** JTBD-01.3, JTBD-01.4, JTBD-01.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Read the proposal | Opens the case from the queue and reads the entry values, the named validation findings, and the AI's recommended action with its rationale | Case detail (F10 on F9) | "It is internally consistent, but it is reasoning from the form and the form is not the whole story." | Alert, unconvinced | The recommendation is plausible, which is harder to refuse than an obviously wrong one (R-1) | Rationale stated plainly enough that she can locate *which* part of the reasoning fails, rather than rejecting on instinct |
| Commit to refusing | Selects Reject from the three undefaulted actions, with no confirmation nudge steering her back toward approval | Decision (F12 on F11) | "No. Not this action. I would rather this case close refused than close wrongly resolved." | Firm, slightly exposed | Rejecting is socially the heaviest of the three actions; any asymmetry in the UI toward approving would tax exactly the choice that most needs to stay cheap | Reject presented at equal weight with Approve and Edit, so refusing the machine costs no more than accepting it |
| Attempt without a reason | Tries to submit before completing the reason field; the API rejects the request and the browser surfaces an inline, focus-managed error announced to assistive technology | Decision (F12 on F11, F2) | "It will not let me close this without saying why. Fair enough." | Briefly checked, then compliant | An error at submit rather than an indication before it costs her a round trip | Required-field indication before submission *and* server-side enforcement at the boundary, so the rule is visible early and unbypassable late |
| Write the reason | Types a non-empty reason naming what the proposal got wrong and what she relied on instead | Decision (F12 on F11) | "This needs to read as a justification, not as a checkbox — someone will read it cold." | Deliberate, conscientious | Nothing can force the reason to be substantive; a single character satisfies the constraint (R-8) | Render the reason prominently in the audit trail where it will actually be read, and review it for decision-usefulness at walkthrough (SM-5, SM-9) |
| Close the case | Submits the rejection; the system records actor, timestamp, decision type `REJECTED` and the reason, writes the audit entry in the same transaction, transitions the case out of the queue, and replaces the decision controls with a read-only view of what was recorded | Decision (F12) → F11, F13, F7 | "Closed, refused, and it says who refused it and why." | Resolved | A rejected case leaves the queue, so if the record were thin the case would be both closed and unexplained | Decision controls unavailable on closed cases with the recorded decision shown read-only, so a case cannot be decided twice (R-11) |
| Read it back | Opens the audit trail and confirms the rejection entry carries her identity, the timestamp, the preserved AI recommendation as it was made, and her reason text | Audit trail (F14 on F13) | "What it said is still there next to what I did about it. That is the whole story." | Confident | If the recommendation were discarded on rejection, the record would show a refusal of something no longer visible | Preserve the recommendation as it was said — model identity, generation timestamp and all — alongside the decision that refused it (F9, F13) |

#### Key Moments
- **Decision Point:** Commit to refusing — rejection is the clearest possible evidence that human-in-the-loop is real, because it is the one outcome the AI cannot produce. It must be as easy to reach as approval.
- **Risk of Abandonment:** Attempt without a reason — a poorly handled required-field failure at this stage is where a specialist learns to write "n/a" forever. Focus management and clear inline error text are what keep the reason meaningful rather than defensive.
- **Delight Opportunity:** Read it back — seeing the AI's original proposal preserved verbatim beside her refusal is what makes the record a story rather than a status.
- **Structural Guarantee Visible:** Close the case — `REJECTED` is reachable only through her authenticated decision; there is no path by which a case closes itself (NFR-5).

#### Success Outcome
The case closes as `REJECTED` carrying Dana's identity, timestamp and a non-empty reason, with the AI's original recommendation preserved alongside it — satisfying JTBD-01.4's success measure (SM-4: zero resolutions without a recorded human decision; SM-5: 100% of rejections carry a non-empty reason) and JTBD-01.5 (SM-2: the closed case answers who decided, what the AI recommended and why, from the UI alone).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Read the proposal | F10, F9, F4 |
| Commit to refusing | F12, F11 |
| Attempt without a reason | F12, F11, F2 |
| Write the reason | F12, F11 |
| Close the case | F12, F11, F13, F7 |
| Read it back | F14, F13, F9 |

---
