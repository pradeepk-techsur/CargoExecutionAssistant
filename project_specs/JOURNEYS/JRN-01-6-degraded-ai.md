
### JRN-01.6: Decide a Case With No Recommendation Available

**Persona:** PER-01 (Dana Reyes)
**Scenario:** The AI provider is unavailable — or slow enough, or returning something unusable enough, that no recommendation exists for the exception Dana has just opened. The case is otherwise complete: the entry values are there, the validation findings that opened it are there, and her authority to decide it is unchanged. What she must not encounter is a blocked case, a frozen screen, or a queue of "waiting on the AI" items that nothing later reconciles. She works the case directly, records a decision with a reason, and the audit record of that decision is exactly as complete as any other. A third party's outage costs her a suggestion, not the case's accountability.

**Related Jobs:** JTBD-01.6, JTBD-01.4, JTBD-01.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Open the case | Opens the next exception from the receipt-ordered queue as normal — the queue is unaffected by the AI's state, because exception creation derives from validation, not from recommendation | Queue (F8) → Case detail (F10) | "Same as any other case so far." | Routine | If AI failure had leaked into exception creation or queueing, the outage would have removed work from the queue instead of removing a suggestion from a case | Keep the recommend stage strictly downstream of except, so an AI failure narrows a case rather than breaking the loop (NFR-9) |
| Wait, briefly | Sees accessible progress status announced while generation is attempted; navigation stays available and the interface does not freeze | Case detail (F10 on F9, F2) | "It is still trying. I am not stuck — I can go elsewhere and come back." | Patient, not trapped | A silent wait is indistinguishable from a dead request, which is what makes specialists park cases in side lists (JTBD-01.6 current alternatives) | Live-region progress status rather than a spinner alone, with generation permitted to exceed the 2-second interactive budget without holding the page (NFR-10) |
| Read the degraded state | Reads an explicit *no recommendation available* presentation on the case; the entry values and the validation findings are unchanged and fully readable | Case detail (F10 on F9 degraded mode) | "No suggestion. Fine — the findings tell me why this is open, and that is what I actually reason from." | Unbothered, self-reliant | The temptation here is to wait for the AI rather than decide; anything that frames the state as "pending" invites parking the case | State the degraded condition plainly as a condition of this case, not as a temporary block, with the decision path visibly unaffected |
| Decide without a proposal | Chooses between the two actions the server permits on a case with no recommendation — *Resolve directly* (edit-and-approve, recording her own values) or *Reject* — presented undefaulted, with Approve absent from the screen rather than disabled, because there is nothing to approve; her resolution values are her own throughout | Decision (F12 on F11) | "There is nothing of the machine's in this one. All of it is mine." | Accountable | The decision controls must not depend on a recommendation existing, or the degraded case becomes undecidable | Decision controls bound to the case, never to the recommendation — the human decision path has no AI dependency at all |
| Record the reason | Writes a non-empty reason as required for her decision type, enforced at the API boundary exactly as it is on any other case | Decision (F12 on F11) | "Same rules as always. The outage does not lower the bar." | Consistent | A degraded path that relaxed the reason requirement would create a class of thinly-recorded cases, discoverable only later | Identical enforcement on the degraded path, so there is no second-class record shape in the system |
| Verify the record | Opens the audit trail and confirms the case's history is complete: received, validated, exception opened, decision taken with her identity, timestamp, before/after, reason — with `HUMAN` origin throughout and no phantom `AI` entry | Audit trail (F14 on F13) | "Complete. The only thing missing is the suggestion, and the suggestion was never the accountability." | Reassured | If the trail rendered an empty or placeholder recommendation entry, it would imply an AI contribution that never happened | Absence of a recommendation recorded as absence — no fabricated entry, no null-origin value (SM-3: zero unattributed) |

#### Key Moments
- **Decision Point:** Decide without a proposal — the stage that proves the governance guarantee does not depend on a third party being healthy. If the loop is only completable when the AI is up, then the AI is load-bearing for accountability, which is the opposite of the product's claim.
- **Risk of Abandonment:** Wait, briefly — a silent or frozen wait is where a specialist historically parks the case in a side list and backfills the decision outside the system, breaking the link between the decision and its record.
- **Delight Opportunity:** Read the degraded state — an application that says plainly "no recommendation available, carry on" rather than blocking is a rare and immediately trusted behaviour.
- **Structural Guarantee Visible:** Verify the record — audit completeness is identical on the degraded path; there is no reduced record shape when the AI is down (NFR-6).

#### Success Outcome
The case is resolved or rejected with a full audit record while the AI provider is unavailable, and no stage of entry creation, validation, exception opening, decision or audit writing is blocked — satisfying JTBD-01.6's success measure (SM-13: 100% of cases resolvable with a full audit record with the AI down) with no loss against decision traceability (SM-2) or audit coverage (SM-6). This is the P1 journey that makes the P0 loop hold under realistic failure.

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Open the case | F8, F7, F10 |
| Wait, briefly | F10, F9, F2 |
| Read the degraded state | F10, F9 (degraded mode), F4 |
| Decide without a proposal | F12, F11 |
| Record the reason | F12, F11 |
| Verify the record | F14, F13, F0 |

---
