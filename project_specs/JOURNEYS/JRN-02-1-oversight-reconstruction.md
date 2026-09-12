
## PER-02: Marcus Hale

**Access: non-user stakeholder — does not authenticate, has no system access in v1.** Marcus holds no account, no login, no screen, no route, no permission, no export and no reporting surface. PRD §10 #3 excludes any second or read-only role; PRD §10 #5 excludes audit export in any format. The journey below is therefore a **non-user journey — no authenticated access, no dedicated interface**: every touchpoint is another human, a property of the stored record, or verification evidence, and not one stage may be implemented as a surface built for him.

---

### JRN-02.1: Reconstruct a Questioned Decision Without Touching the System

**Persona:** PER-02 (Marcus Hale)
**Scenario:** *Non-user journey — no authenticated access, no dedicated interface.* A resolved cargo case has been questioned months after the fact — through internal review, a later dispute, or a compliance inquiry — and Marcus has to establish what happened and who was responsible. He does not work a queue, does not resolve exceptions, and does not operate the application; he has no way to. His journey is conducted entirely through two things: **a conversation with a cargo specialist who opens that case's audit trail and reads it back to him** (the specialist's journey is JRN-01.5, which is where the screens actually live), and **engineering evidence about the properties of the stored record** — that it is append-only, that mutation is rejected at the database privilege level, that coverage is 1:1 with state changes — demonstrated by test rather than by any interface. What serves Marcus is that the record is sufficient on its own, because there is no export to hand him and no downstream oversight system to compensate for a thin one.

**Related Jobs:** JTBD-02.1, JTBD-02.2, JTBD-02.3, JTBD-02.4

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Receive the question | Receives a challenge about a specific resolved case and notes its case reference — the only identifier he needs, and the only one he has | The inquiry itself and the case reference quoted in it (no system touchpoint) | "One case, one reference. I do not need a search, I need an answer about this one." | Businesslike | With no cross-case search or aggregate review in v1 (excluded, PRD §10), an inquiry that arrives without a case reference cannot begin — the reference must travel with the question | Keep the case reference the single durable currency across receipt message, queue row, case and trail, so the thing an inquiry naturally quotes is the thing that resolves it |
| Ask a specialist | Asks a cargo specialist to open that case and read its history back to him; there is no notification, assignment, handoff or request surface — the interaction is a conversation entirely outside the application | A cargo specialist (PER-01), acting in JRN-01.5 | "I am relying on someone else's access. The record had better answer without me being able to press on it." | Slightly dependent | His answer is mediated by another person's availability; a handoff or notification surface would fix that and is explicitly excluded (PRD §10 #2, #4) | Make the per-case trail complete enough that a mediated reading loses nothing — the specialist reads, she does not interpret |
| Hear *who decided, and when* | Listens as the specialist reads the actor identity and timestamp on each entry, including the decision entry naming an authenticated specialist rather than a system or anonymous actor | The record's properties — actor identity on every audit entry (F13), read aloud by PER-01 | "A named person, at a stated time. Not 'the system', not 'the process'." | Reassured | An answer assembled from memory or email would sound the same in conversation but mean nothing — the difference is that this one is being read off a record | Actor identity as a structural field on every entry, so "who decided" is a fact of the record rather than a conclusion someone argues for |
| Hear *what the AI said versus what the human chose* | Listens as the specialist reads the preserved recommendation as it was made alongside the recorded decision, with per-value `AI` and `HUMAN` origin markers stated for each resolution value | The record's properties — per-value provenance in storage and rendering (F0, F9, F11, F14) | "Two values were the machine's, one was hers. Her contribution is provable, not plausible." | Confident | If provenance were per record rather than per value, a partly-edited resolution would collapse into one ambiguous origin and his central question would be unanswerable (R-5) | Value-granular origin re-stamped on edit — changed values `HUMAN`, untouched values retaining `AI` — so a mixed resolution stays attributable field by field |
| Hear *why*, and *why the case was open at all* | Listens to the mandatory reason text captured on the edit or rejection, and to the validation findings carried onto the case naming the unsatisfied rule and field | The record's properties — mandatory reason (F11) and derived validation basis (F4, F5), read aloud by PER-01 | "The decision explains its own justification, and the exception states its own basis. Neither is an inference." | Satisfied | A rejection with no captured reason would leave him inferring intent months later — the oldest and most corrosive of his pain points (PRD §2.1 #3) | Exceptions derived and never authored, so the link between the unsatisfied rule and the open case survives for the life of the case |
| Satisfy himself the record could not have been altered | Is shown, by engineering rather than through any interface, that the audit store is insert-only, that UPDATE and DELETE privileges are revoked so a direct database mutation attempt is rejected by the database, that entries are monotonically sequenced and hash-linked, and that coverage is 1:1 with state changes | Database privilege model and automated test evidence (F0, F13, NFR-3, NFR-6) — examined at test level, never through a screen | "The guarantee is in the database, not in a policy and not in the application code. That is the difference between a promise and a property." | Convinced, and unusually so | This is the one question no reading of the trail can answer — a trail that could have been edited reads identically to one that could not | Prove rejection by test, including attempts made directly against the database, so immutability is demonstrated rather than asserted (SM-7) |

#### Key Moments
- **Decision Point:** Satisfy himself the record could not have been altered — everything else Marcus hears is only worth what the immutability guarantee is worth. This stage is answered by test evidence and the database privilege model, **never** by a screen; building him one would breach PRD §10 #3.
- **Risk of Abandonment:** Ask a specialist — his whole journey is mediated. If the per-case trail were thin, the mediation would be where the answer degraded, and he would fall back to memory, email and side channels, which is the pain point the product exists to end. The defence is not a surface for Marcus; it is the completeness of the record PER-01 reads.
- **Delight Opportunity:** Hear *what the AI said versus what the human chose* — hearing a mixed resolution decompose cleanly, value by value, into machine proposal and human correction is the moment oversight becomes possible rather than aspirational.
- **Explicitly Not Built:** No auditor login, no read-only role, no audit export or oversight package, no cross-case search or reporting, no volume/aging/compliance-rate measure, no notification or handoff surface. All are recorded as out of scope in PERSONAS §PER-02 and JTBD §PER-02 and must stay there.

#### Success Outcome
For 100% of resolved or rejected cases, Marcus's four questions — who decided, what the AI recommended, what the human changed, and why — are answerable from the application UI alone as read by a specialist, with no export, query tool or secondary system involved (SM-2, NFR-7). Zero exceptions reached a resolved state without a recorded human decision (SM-4); zero resolution values are unattributed (SM-3); 100% of edits and rejections carry a non-empty reason (SM-5); 100% of exceptions have a validation basis (SM-8); 100% of attempted updates or deletes against stored audit entries are rejected including direct database attempts (SM-7), against 100% audit coverage (SM-6). Every one of these is satisfied by a property of the record or by test evidence — none by an interface built for Marcus.

#### Feature Touchpoints

*Marcus operates no feature. The features below are the ones whose **guarantees** serve each stage; he is a beneficiary of each and an operator of none.*

| Stage | Features |
|-------|----------|
| Receive the question | — (no system touchpoint; the case reference originates from F5) |
| Ask a specialist | — (conversation outside the application; the specialist's reading is F10, F14) |
| Hear *who decided, and when* | F1, F11, F13 (beneficiary) |
| Hear *what the AI said versus what the human chose* | F0, F9, F11, F14 (beneficiary) |
| Hear *why*, and *why the case was open at all* | F4, F5, F11, F14 (beneficiary) |
| Satisfy himself the record could not have been altered | F0, F13 (beneficiary; evidenced by test, not by a screen) |

---
