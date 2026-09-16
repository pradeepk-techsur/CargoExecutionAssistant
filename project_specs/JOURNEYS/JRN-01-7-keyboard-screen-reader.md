
### JRN-01.7: Complete a Decision Keyboard-Only With a Screen Reader

**Persona:** PER-01 (Dana Reyes)
**Scenario:** Dana works entirely by keyboard with a screen reader — as some specialists in this role do full-time. She walks the same governed loop as JRN-01.2, but every stage is reached by Tab, arrow and Enter, and everything she needs to know must be announced rather than seen. This is not a variant of the product for her; it is the product. Section 508 and WCAG 2.1 AA are statutory for a federal application, and v1 meets them by design and by mandatory per-screen manual and assistive-technology review rather than by an automated CI gate — the absence of that gate is a recorded decision in `.planning/PROJECT.md`, which is precisely why this journey is a gate rather than a courtesy (R-3). Every one of the six screens appears here, because a loop that breaks on one screen breaks for her entirely.

**Related Jobs:** JTBD-01.7, JTBD-01.1, JTBD-01.3, JTBD-01.4, JTBD-01.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Sign in by keyboard | Tabs through the official-site banner and header landmarks to the credential fields, hears each field's accessible name announced from its programmatic label, and submits with Enter | Sign-in (F1 on F2) | "Landmarks first, then the form. I know where I am without looking." | Composed | A banner or header that is not a landmark turns the first screen into an undifferentiated tab sequence | Semantic landmarks and correct heading order established once in the shell (F2) and inherited by all five remaining screens |
| Fill the entry form | Tabs field by field through the entry form; required fields are announced as required from their programmatic marking, and hints are associated with the inputs they describe | Entry form (F6 on F2) | "It tells me a field is required before I fail it, not after." | Efficient | Required-field state carried only by a visual asterisk is silent to her, and she learns the constraint by tripping over it | Programmatic required-field indication and label/hint association, so form structure is announced rather than discovered |
| Recover from the error summary | Submits the deficient entry; the server validation findings render as an error summary that takes focus and is announced, with each finding naming its rule and its field and linking to the input concerned | Entry form (F6 on F2, F4) | "Focus moved to the summary and read me both failures. I can jump straight to the field." | Oriented rather than lost | Error summaries are where keyboard operability most often breaks in federal line-of-business tooling — focus stays put and the user is told nothing | Error summary that moves focus and is linked field by field, so recovery is a short path and not a re-traversal of the whole form |
| Hear the receipt outcome | Hears the receipt outcome — *exception opened*, with the case reference — announced via a live region, and tabs to the case reference link | Entry form (F6 on F2) | "It said the outcome out loud. I did not have to go hunting for a message region." | Confident | A status message rendered visually but not exposed to assistive technology leaves her unsure whether anything happened at all | Status and outcome messaging exposed through live regions as a shell-level pattern, so every screen announces outcomes the same way |
| Traverse the queue | Reaches the queue and traverses it with accessible table or list semantics and a programmatic row count, hearing each row's case reference, receipt time and failure summary | Queue (F8 on F2, F7) | "Eleven rows. First one is the case I just filed." | In control | A row activated only by pointer, or a list with no programmatic count, ends the loop here for her | Row activation operable by keyboard and pointer alike, with a programmatic row count so the size of the list is knowable without traversing it |
| Read the case in order | Opens the case and traverses it by heading, following the intended reading order: entry values → validation findings → recommendation → decision → audit; each AI-proposed value announces its origin as text, never by colour alone | Case detail (F10 on F2, F9) | "It said 'AI-proposed' on that value. I know what is the machine's before I decide anything." | Attentive | Provenance carried by a coloured badge alone is invisible to her at exactly the moment it matters most (NFR-4) | AI-origin conveyed programmatically as well as visually everywhere it appears, in the case view and in the trail |
| Decide by keyboard | Reaches the three decision actions — announced with no default and no pre-selection — chooses one, completes the reason field, and hears the missing-reason error inline and focus-managed when she submits without it | Decision (F12 on F2, F11) | "No option was pre-chosen for me. The choice is genuinely mine to make." | Deliberate, unhurried | A pre-selected control would make approval the announced default and quietly convert her decision into an omission | Undefaulted decision controls with accessible required-field indication, so deliberateness is preserved for keyboard and screen-reader users identically |
| Read the trail back | Opens the audit trail from the case and traverses the chronological history with accessible list semantics, hearing actor, action, timestamp, before/after, reason and per-value `AI` or `HUMAN` origin on each entry | Audit trail (F14 on F2, F13) | "The whole story, read in order, with the origins spoken. Nothing here needed a workaround." | Satisfied, unremarkable — which is the point | A history laid out only as a visual table with origin shown as colour is the last place the loop can fail for her | Accessible list or table semantics and reading order for screen-reader traversal of the history (F14), closing the loop for her exactly as for anyone else |

#### Key Moments
- **Decision Point:** Decide by keyboard — the accountability guarantee is only real if it is reachable. An undefaulted decision group that is announced correctly is what makes human-in-the-loop true for an assistive-technology user rather than nominally available.
- **Risk of Abandonment:** Recover from the error summary — this is the single most common break point. If focus does not move and the findings are not announced, she cannot get past receipt, and the remaining five screens never matter.
- **Risk of Abandonment:** Read the case in order — if provenance is colour-only, she can complete the task but cannot make the judgement the task exists for, which is a silent failure rather than a visible one.
- **Delight Opportunity:** Read the trail back — completing the entire governed loop with no sighted assistance and no workaround, in a federal application, is the outcome that makes accessibility a property of the release rather than a promise attached to the next one.
- **Structural Guarantee Visible:** Every stage — conformance is established once at the shell (F2) and inherited by F6, F8, F10, F12 and F14, so accessibility is a shared foundation rather than five independent efforts of varying quality.

#### Success Outcome
Dana completes every product task — sign in, create an entry, open a queue case, edit/approve/reject with a reason, and read the audit trail — using the keyboard alone, on screens with zero WCAG 2.1 AA violations found in manual and assistive-technology review — satisfying JTBD-01.7's success measure (SM-11: 100% of tasks keyboard-completable; SM-10: zero violations with 100% of screens reviewed and signed off; SM-12: 100% Section 508/WCAG 2.1 AA component conformance, independent of which visual design system renders the components — USWDS through Phase 6, the newly-approved external design from Phase 7 onward). Conformance is evidenced by per-screen review sign-off, not by an automated gate — excluded by `.planning/PROJECT.md`.

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Sign in by keyboard | F1, F2 |
| Fill the entry form | F6, F2 |
| Recover from the error summary | F6, F2, F4, F3 |
| Hear the receipt outcome | F6, F2, F5 |
| Traverse the queue | F8, F2, F7 |
| Read the case in order | F10, F2, F9 |
| Decide by keyboard | F12, F2, F11 |
| Read the trail back | F14, F2, F13 |

---
