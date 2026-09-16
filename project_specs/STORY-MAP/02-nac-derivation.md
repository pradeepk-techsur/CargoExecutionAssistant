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
| JTBD-03.1 *(Phase 7)* | Seeded case reaches later stages on demand, built and audited through the identical service calls and chokepoint as any live case | JRN-03.1:Watch receive and validate → Watch audit close the loop | One demonstration case already carried through entry, validation failure, exception, recommendation, decision and audit trail exists before the walkthrough starts, and re-seeding is always safe **(no screen)** | US-15.1, US-15.2, US-15.4 |
| JTBD-03.1 *(Phase 7)* | The seeded case demonstrates a mixed AI/human resolution without waiting for one to occur organically | JRN-03.1:Watch the human decide | One resolved case shows a specialist-style correction re-stamped `HUMAN` beside an untouched `AI`-origin value, present from the first run of the walkthrough **(no screen)** | US-15.3 |
| JTBD-03.1 *(Phase 7)* | Manual entry stays the only way anyone using the running application creates a case | JRN-03.1:Set the terms | The seed script is reachable only by direct operator invocation — no endpoint, screen, or scheduled job — so F6 is unaffected **(no screen)** | US-15.5 |
| JTBD-03.1 *(Phase 7)* | What is watched in the walkthrough is genuine AI output, not a scripted stand-in | JRN-03.1:Watch receive and validate | The demonstration/production deployment calls a real hosted LLM by default, and the recorded model identity names that real provider, never the deterministic test fake **(no screen)** | US-9.6 |
| JTBD-03.2 | The accountability answer is structural and backed by test | JRN-03.1:Probe the accountability claim | She is shown a test, not a toggle — a configuration switch would admit the alternative **(no screen)** | US-0.5, US-9.5, US-11.5 |
| JTBD-03.2 | Reason capture is load-bearing rather than a formality | JRN-03.1:Watch the human decide | The reason is enforced before the case can close and rendered where it is read **(no screen)** | US-11.4, US-14.3 |
| JTBD-03.3 | USWDS and WCAG 2.1 AA conformance observable in the delivered screens | JRN-03.1:Watch receive and validate | Federal standards are something this release already has, not something the next one is promised to add **(no screen)** | US-2.1, US-2.3 |
| JTBD-03.3 | Every screen has a manual and assistive-technology review sign-off | JRN-03.1:Check the delivered UI against federal standards | Conformance is evidenced per screen, because there is no CI gate to lean on **(no screen)** | US-2.6 |
| JTBD-03.3 *(Phase 7)* | Conformance holds regardless of which visual design system renders the shell | JRN-03.1:Check the delivered UI against federal standards | Replacing the visual system is never experienced as an accessibility regression — the same WCAG 2.1 AA bar applies, re-signed-off screen by screen under the new design **(no screen)** | US-2.7 |
| JTBD-03.4 | Key exclusions are structural, not UI omissions | JRN-03.1:Check what was declined | The narrowness reads as a deliberate purchase of loop completeness, checkable line by line against PRD §10 **(no screen)** | US-7.3, US-8.5, US-2.2 |

---
