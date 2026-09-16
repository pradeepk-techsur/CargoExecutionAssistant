# User Journeys
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.1 |
| **Date** | 2026-09-11 (Phase 7 update: 2026-09-16) |
| **Related Personas** | PERSONAS-CargoExec.md (PER-01, PER-02, PER-03) |
| **Related JTBD** | JTBD-CargoExec.md (JTBD-01.1–01.7, 02.1–02.4, 03.1–03.4) |
| **Related PRD** | PRD-CargoExec.md (§5 Features F0–F15, §6 NFRs, §7 Success Metrics, §10 Out of Scope) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | STORY-MAP-CargoExec, UX-CargoExec, UserStories-CargoExec |
| **Revision Note** | Updated for Phase 7 — visual system replacing USWDS (wording made system-independent where USWDS was named only as a visual detail; accessibility bar unchanged), and JRN-03.1 updated for the seeded demonstration case (F15), which supersedes PROJECT.md's prior "no seeded dataset" exclusion. See inline Phase 7 notes below. |

---

## Scope Boundary — Read Before Using This Document

CargoExec v1 has **exactly one authenticated role: the cargo specialist (PER-01)**. Every journey in this document that contains a screen, a click, a keystroke, a form, a route, or an API call belongs to PER-01 and to no one else.

**There are exactly six interactive screens in v1**, and every interactive touchpoint in this document names one of them:

| Screen | Feature | What it is |
|--------|---------|------------|
| **Sign-in** | F1 on F2 | Credential sign-in establishing the authenticated identity the audit trail attributes decisions to |
| **Entry form** | F6 on F2 | The cargo entry form; submitting it triggers atomic receipt (F3 → F4 → F5) |
| **Queue** | F8 on F2 | The single receipt-ordered list of open exceptions — no filter, no sort, no assignment, no priority badge |
| **Case detail** | F10 on F2 | Entry values, validation findings, and the AI's proposal and rationale, marked AI-origin |
| **Decision** | F12 on F2 | Approve / Edit / Reject controls with mandatory reason capture, hosted within the case |
| **Audit trail** | F14 on F2 | Read-only chronological per-case history, reachable from the case |

**PER-02 (Marcus Hale, oversight reviewer) and PER-03 (Priya Raman, delivery sponsor) are non-user stakeholders.** They do not authenticate, hold no account, and operate no screen, route, export, dashboard, query tool or API in v1. Each has a journey below because their experience of the product is real — but each is labelled **non-user journey — no authenticated access, no dedicated interface**, and in each one the touchpoint column names *another human*, *a property of the record*, or *verification evidence*, never an interface of their own. JRN-02.1 is a reconstruction obtained by a specialist reading the per-case trail on Marcus's behalf, plus a database/test-level examination of the append-only guarantee. JRN-03.1 is a witnessed walkthrough driven by a specialist.

**Instruction to downstream generators (STORY-MAP, UserStories, UX):** no stage in JRN-02.1 or JRN-03.1 may become a screen, a route, a role, a permission, an API consumer, or a user story with PER-02 or PER-03 as actor. No stage anywhere in this document may become a supervisor dashboard, a queue metric (volume, aging, throughput, workload), a reassignment, filter, sort, assignment or prioritisation control, an audit export, a bulk/file/API ingestion path, a second role, an autonomous AI resolution, a duty or tariff calculation, a native mobile client, or a CI accessibility gate. Every one of those is excluded by `.planning/PROJECT.md` and PRD §10.

**Phase 7 exception to the list above:** a seeded demonstration dataset is no longer an exclusion — F15 (PRD §5.7) supersedes PROJECT.md/PRD §10 #7 and adds a hand-authored seed script that pre-loads one demonstration case already carried through the full lifecycle, strictly *additive* to the live hand-typed entry path (F6), never a replacement for it. This is the sole exception to the exclusion list above; every other item in it remains fully binding and untouched. Downstream generators may treat F15 as a real, buildable capability (data/tooling surface, not a screen or role) — but must not let it become a "presenter mode" or any surface built for PER-03, which remains excluded (see JRN-03.1).

---

## Journey Index

| ID | Persona | Access | Scenario | Key JTBD | Stages |
|----|---------|--------|----------|----------|--------|
| JRN-01.1 | PER-01 Dana | User | **Happy path** — sign in and hand-type an entry that passes required-information validation; no exception is created | JTBD-01.1 | 6 |
| JRN-01.2 | PER-01 Dana | User | **Core loop** — an entry fails validation, appears in the receipt-ordered queue, and she opens it, reads the AI recommendation and rationale, and approves it | JTBD-01.1, 01.2, 01.3, 01.4, 01.5 | 8 |
| JRN-01.3 | PER-01 Dana | User | **Edit path** — she disagrees with part of the recommendation, edits the resolution values, writes the mandatory reason, and submits; per-value AI-vs-human provenance is recorded | JTBD-01.3, 01.4, 01.5 | 7 |
| JRN-01.4 | PER-01 Dana | User | **Reject path** — she rejects the recommendation outright with a mandatory reason | JTBD-01.3, 01.4, 01.5 | 6 |
| JRN-01.5 | PER-01 Dana | User | **Audit reconstruction** — she opens a resolved case's audit trail and reads back who decided, what changed, when, and which values came from the AI versus the human | JTBD-01.5 | 6 |
| JRN-01.6 | PER-01 Dana | User | **Degraded AI** — no recommendation is available, and she must still reach a recorded decision | JTBD-01.6, 01.4 | 6 |
| JRN-01.7 | PER-01 Dana | User | **Accessibility path** — she completes a full decision keyboard-only with a screen reader, across all six screens | JTBD-01.7 | 8 |
| JRN-02.1 | PER-02 Marcus | **Non-user** | **Oversight reconstruction** — a resolved case is questioned; the answer is obtained by a specialist reading the per-case trail to him, and the immutability guarantee is examined at the database/test level, not through any interface | JTBD-02.1, 02.2, 02.3, 02.4 | 6 |
| JRN-03.1 | PER-03 Priya | **Non-user** | **Witnessed walkthrough** — she observes a specialist walk the full six-stage governed loop in one sitting and probes the accountability and scope claims verbally | JTBD-03.1, 03.2, 03.3, 03.4 | 7 |

**Coverage check:** PER-01 has 7 journeys, PER-02 has 1, PER-03 has 1 — every persona has at least one. All 7 interactive journeys belong to PER-01. Both non-user journeys are free of screens, logins, dashboards, exports, queries and API calls.

---

## PER-01: Dana Reyes

**Access: authenticated cargo specialist — the only role in CargoExec v1.** Every journey in this section is an interactive journey across the six screens named in the Scope Boundary above. Where a stage names a system behaviour, it is the behaviour of the feature listed in the touchpoint column.

---

### JRN-01.1: Sign In and File a Clean Entry

**Persona:** PER-01 (Dana Reyes)
**Scenario:** It is the start of Dana's shift. She has a paper cargo entry in front of her that she believes is complete, and she wants it into the system before she starts working the queue. She signs in, types the entry into the cargo entry form, and submits it. Validation runs on receipt and every required-information rule is satisfied, so no exception is opened. What Dana needs from this journey is not speed — it is to be told, without interpretation, that the entry passed, so she does not spend the next hour wondering whether something is quietly sitting unassessed. This is the branch of the loop where *receive → validate* completes and stops.

**Related Jobs:** JTBD-01.1, JTBD-01.7

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Arrive | Opens the browser to the application root; the server finds no session and redirects her to sign-in rather than showing her anything behind it | Sign-in (F1 on F2) | "Nothing should be visible before I say who I am." | Neutral, settled | She is one redirect away from work she has not started yet; a slow sign-in is felt as the whole product being slow | Land her on sign-in with focus already in the first field and the official-site banner already rendered, so the shell does not reflow under her |
| Authenticate | Types her credentials and submits; the system establishes a server-side session and binds her identity as the actor the audit writer will consume | Sign-in (F1 on F2) | "This is the name that ends up next to every decision I make today." | Slightly formal, accountable | Authentication here looks like a security gate but is actually an accountability gate; nothing on screen says so, so the stakes are invisible | State on the signed-in shell whose session is active, so the identity that will be attributed is visible the whole time rather than assumed |
| Compose | Navigates to the entry form and types the cargo entry field by field from the paper in front of her, using labels, hints and required-field markers to keep her place | Entry form (F6 on F2) | "Required fields are marked — I can see what this thing insists on before I submit it." | Focused, methodical | Hand-typing is the only way in — there is no upload and no import (PROJECT.md excludes both) — so a long form is a long form | Clear required-field indication and hint text so the shape of a complete entry is legible before submission rather than discovered by failing |
| Submit | Presses Submit; the system persists the entry, runs required-information validation and — because nothing failed — commits a clean-pass receipt in a single transaction | Entry form (F6 on F2) → F3 → F4 | "Did that land, or did it just look like it landed?" | Momentary suspense | The gap between pressing Submit and knowing the outcome is where she has historically lost entries; silence reads as failure | Return the receipt outcome inside the 2-second interactive budget (NFR-10) so the suspense never becomes doubt |
| Read outcome | Reads the explicit receipt message — *validated clean, no exception opened* — announced to assistive technology as well as shown | Entry form (F6 on F2) | "Validated clean. There is no case. I am done with this one." | Relieved, certain | An absence of errors is not the same as a statement of success; if the screen only *fails* to complain she will re-check the queue anyway | State the clean outcome positively and name it, so "no news" is never the thing she has to interpret |
| Move on | Follows the offered route from the receipt outcome to the review queue to start her actual working session | Entry form (F6 on F2) → Queue (F8) | "Nothing was created here, so nothing of mine is waiting. On to the open ones." | Composed, ready | Without a route onward she re-navigates by hand, which is where a specialist starts keeping side-notes about where she was | One-action continuation from receipt outcome into the queue, so the clean branch ends in the flow rather than in a dead end |

#### Key Moments
- **Decision Point:** Submit — Dana commits an entry she cannot take back; the atomicity of receipt (persist → validate → decide outcome in one transaction, F3) is what makes this safe rather than provisional.
- **Risk of Abandonment:** Read outcome — if the clean result is implied rather than stated, she will go and check the queue to confirm, and from there she will start keeping her own list. The whole value of the explicit receipt message is that it prevents a private side-channel from forming.
- **Delight Opportunity:** Read outcome — a plainly-worded "validated clean" is the smallest possible sentence that ends a task completely, and it is rare enough in federal line-of-business tooling to be noticed.

#### Success Outcome
Dana knows within one screen, and without inference, that her entry was received and assessed and that no exception exists — satisfying JTBD-01.1's requirement that the outcome be stated explicitly rather than inferred from an absence of errors. This is the negative half of SM-8 (zero exceptions exist without a validation failure behind them) demonstrated in the browser, and it is the *receive → validate* half of the SM-1 loop walked without an exception being manufactured to prove it.

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Arrive | F1, F2 |
| Authenticate | F1, F2, F13 |
| Compose | F6, F2 |
| Submit | F6, F3, F4, F13 |
| Read outcome | F6, F2, F4 |
| Move on | F6, F8 |

---

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

### JRN-01.3: Disagree in Part — Edit the Resolution and Approve It

**Persona:** PER-01 (Dana Reyes)
**Scenario:** Dana opens an exception where the AI has proposed a resolution across several values. She agrees with most of it but one proposed value is wrong for reasons the model could not have known — it has not seen the shipment and she has. She edits that value, leaves the others as proposed, writes a non-empty reason in her own words explaining why she changed it, and approves the modified resolution. This is the journey that makes per-value provenance load-bearing: afterwards the record must say, field by field, which values were the machine's and which were hers. A resolution that collapses into a single ambiguous origin would make her own contribution unprovable (R-5).

**Related Jobs:** JTBD-01.3, JTBD-01.4, JTBD-01.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Open and read | Opens the case from the queue and reads the entry values, the validation findings, and the AI's proposed resolution values with their rationale, each proposed value marked AI-origin | Case detail (F10 on F9) | "Most of this is right. That one value is not — it does not match what actually shipped." | Engaged, then sceptical on one point | The disagreement is partial, which is the hardest shape to record: whole-approve and whole-reject both misrepresent what she thinks | Present the proposal as a set of individually attributed values rather than one indivisible block, so partial disagreement has somewhere to go |
| Choose to edit | Selects Edit from the three undefaulted actions; the system opens the proposed values in an editable form pre-populated with what the AI proposed | Decision (F12 on F11) | "I do not want to reject the whole thing to fix one field." | Purposeful | If Edit were harder to reach than Approve, she would approve something she partly disagrees with — the exact failure mode the product exists to prevent | Three actions at equal weight and equal cost, so the accurate choice is never the expensive one |
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

## PER-03: Priya Raman

**Access: non-user stakeholder — does not authenticate, has no system access in v1.** Priya holds no account, no dashboard, no metrics view and no reporting surface. PRD §10 #2 excludes every supervisory and analytics surface; PRD §10 #3 excludes a second role; and a presenter mode, demo mode or read-along surface for her benefit is itself excluded. The journey below is a **non-user journey — no authenticated access, no dedicated interface**: she witnesses a session driven by a cargo specialist, asks questions out loud, and receives structural answers backed by test evidence. Not one stage may be implemented as a surface built for her.

---

### JRN-03.1: Witness the Governed Loop and Probe the Claim

**Persona:** PER-03 (Priya Raman)
**Scenario:** *Non-user journey — no authenticated access, no dedicated interface.* Priya leads delivery for a CBP programme portfolio, and her question is not about cargo at all — it is whether CBP can build governed applications fast enough to be worth building. She sits beside a cargo specialist at a running instance and watches her work: sign in, hand-type a deliberately incomplete entry, watch it fail validation and open as an exception, open it from the queue, read the AI's recommendation and rationale, change one value with a reason, approve it, and then open the audit trail and read the whole story back including which values the machine proposed. Priya touches nothing. Her instruments are her eyes, her questions, and the evidence offered in answer — a live browser walkthrough rather than an API transcript, automated test results rather than policy statements, and per-screen review sign-off rather than a promise about a later release. She is judging whether that sequence needed an explanation, a workaround, or a future-tense verb.

**Related Jobs:** JTBD-03.1, JTBD-03.2, JTBD-03.3, JTBD-03.4

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Set the terms | States before anything starts that she wants to see at least one case received and validated live in the browser, hand-typed during the session and not skipped via a seeded case — while accepting that a pre-loaded seeded case may additionally be used afterward to reach the later stages without waiting on a fresh one | The walkthrough agreed with the specialist (no system touchpoint) | "I have been shown a working backend and a missing interface before. Not this time. Show me at least one entry actually go through receipt and validation, live." | Sceptical, professionally so | Her scepticism is earned: a broad application arriving partially finished answers her delivery question with a no (R-7) | The live hand-typed entry (F6) keeps receive and validate inside the demonstrated path by construction, and the seed script (F15) is disclosed as a separate, additive shortcut to the later stages — never a silent substitute for the live demonstration she asked for |
| Watch receive and validate | Watches the specialist sign in and hand-type an incomplete entry, then watches the screen state plainly that an exception opened, naming the unsatisfied rules and their fields | Observed PER-01 session — sign-in (F1) and entry form (F6) | "Two of six stages, and the failure named itself. Nothing was staged for me." | Engaged, interest rising | A demonstration that begins at an already-existing case skips the two stages most easily faked | Atomic receipt — persist, validate, open the exception in one transaction — so there is no moment at which the entry exists unassessed |
| Watch except and recommend | Watches the case appear in the receipt-ordered queue, be opened in one action, and present the validation findings alongside the AI's proposed action and plain-language rationale, with AI origin marked on every proposed value | Observed PER-01 session — queue (F8) and case detail (F10) | "The proposal is visibly the machine's and visibly un-applied. It is a draft sitting there waiting for her." | Attentive | If AI output appeared merged into the record, the whole human-in-the-loop claim would be unverifiable by watching | Present the recommendation as an un-applied proposal with origin marked beyond colour alone, so the claim is legible to a witness and not only to the operator |
| Watch the human decide | Watches the specialist edit one value, write a reason in her own words, and approve — with the three actions arriving undefaulted and the reason enforced before the case can close | Observed PER-01 session — decision (F12) | "No option was pre-selected. Choosing the AI's answer cost her the same act as refusing it." | Convinced on the central point | A pre-selected default here would not be visible as a flaw to most witnesses, which is exactly why its absence is worth demonstrating explicitly | Undefaulted controls and mandatory reason capture shown live, so the accountability claim is observed rather than described |
| Watch audit close the loop | Watches the audit trail opened from inside the case and read aloud: actor, action, timestamp, before/after, reason, and `HUMAN` on the changed value beside `AI` on the retained ones — with no export and no second system involved | Observed PER-01 session — audit trail (F14) | "Six of six. And the record explained itself in place, which is the part that usually needs a caveat." | Impressed, guard lowering | The trail is where a thin implementation shows: a history that needs an export or a tool would have ended the demonstration honestly here | Answer in place (NFR-7) — the absence of an export is the guarantee, not a gap in it |
| Probe the accountability claim | Asks aloud whether anything in the system can resolve a case without a human, and receives a structural answer — no scheduled job, background worker, retry path or system actor can transition a case — backed by the automated test that proves the path does not exist | Verbal Q&A with the delivery team, plus automated test results (NFR-5, §4.3 #1) — no screen, no control panel | "That is a property of the build, not a discipline that depends on how people use it. A configuration switch would have been a worse answer." | Satisfied in a way a policy answer never achieves | A control panel showing that human review is enabled would, by existing, admit the alternative — which is why she is shown a test and not a toggle | Prove the absence of an auto-apply path by test, and let degraded mode (JRN-01.6) show the guarantee holds when the AI is down (SM-13) |
| Check what was declined | After the demonstration, checks the shipped feature set line by line against the PRD §10 exclusion list — as a delivery-evidence review on paper, not as anything rendered in the product | The shipped F0–F15 feature set checked against PRD §10 (offline review; no in-product view exists) | "Narrow on purpose, and the narrowness bought loop completeness. No dashboard, no second role, no export, no filters." | Reassured about judgement, not just execution | Scope drift toward dashboards and multi-role access would have consumed exactly the budget loop completeness needed (R-2) | Key exclusions enforced structurally — no filter, sort, assignment or priority dimension in the data model or API; one role by construction — so the discipline is checkable rather than merely claimed |

#### Key Moments
- **Decision Point:** Probe the accountability claim — the moment her judgement is actually formed. A structural answer backed by test converts the governance claim from an assertion into a property; a policy answer here would undo all six preceding stages.
- **Risk of Abandonment:** Watch receive and validate — if a seeded case were silently substituted for the live walkthrough, two of the six stages would be taken on trust, and a loop demonstrated at four-sixths is a no regardless of polish. The seed script (F15) does not remove this risk; what protects this stage is the specialist's up-front commitment to hand-type at least one entry live, so receive and validate are still demonstrated by construction rather than by promise.
- **Phase 7 Clarification:** Using the seeded case (F15) to jump to the later stages — recommendation, decision, audit trail — without waiting for a freshly-typed entry to clear validation and AI generation is a deliberate, disclosed efficiency, not a substitution: Priya still watches receive and validate happen live, on a separately hand-typed entry, before the specialist ever opens the pre-loaded seeded case. Silently presenting the seeded case as though it were the one just typed in front of her remains the failure mode this journey guards against; openly using it afterward to reach later stages does not.
- **Risk of Abandonment:** Watch audit close the loop — if the trail needed an export or a second system to be legible, the demonstration would end with a caveat, which for her is indistinguishable from a failure.
- **Delight Opportunity:** Watch the human decide — three equally weighted actions with no default is a small design fact that carries the entire human-in-the-loop claim, and seeing it operated is more persuasive than any architecture slide describing it.
- **Explicitly Not Built:** No programme or delivery dashboard, no volume/queue-health/aging/throughput/workload measure, no login or report of her own, no presenter or demo mode, no in-product scope-compliance view. All are recorded as out of scope in PERSONAS §PER-03 and JTBD §PER-03 and must stay there — a surface reporting on scope discipline would itself breach it. **Phase 7 note:** a seeded demonstration dataset is no longer on this list — F15 exists as a data/tooling capability the specialist operates, not as a presenter or demo mode built for Priya; she still touches nothing and still watches receive and validate happen live before any seeded case is opened.

#### Success Outcome
All six governed loop stages are demonstrated end to end in one unbroken browser sitting with no manual workaround and no verbal bridging (SM-1: 6 of 6), with 100% decision traceability answerable from the UI during the walkthrough (SM-2). The accountability guarantee is answered structurally and evidenced by test — zero auto-apply incidents (SM-4), 100% reason capture (SM-5) — rather than by policy. Federal standards are observed in the delivered screens, including a keyboard-only pass (SM-10, SM-11, SM-12). The loop remains completable with the AI provider unavailable (SM-13). And zero shipped features fall within a PRD §10 exclusion (SM-14), checked against the feature set after the demonstration rather than rendered in the product.

#### Feature Touchpoints

*Priya operates no feature. She observes a PER-01 session; the features below are the ones being demonstrated in front of her, and the evidence offered alongside them.*

| Stage | Features |
|-------|----------|
| Set the terms | — (no system touchpoint; conditions set on the walkthrough itself) |
| Watch receive and validate | F1, F6, F3, F4, F5 (observed, on F2) |
| Watch except and recommend | F8, F7, F10, F9 (observed, on F2) |
| Watch the human decide | F12, F11 (observed, on F2) |
| Watch audit close the loop | F14, F13, F0 (observed, on F2) |
| Probe the accountability claim | F11, F13 (structural guarantee; evidenced by test, not by a screen) |
| Check what was declined | Full F0–F15 set checked against PRD §10 (offline review, no surface) |

---

## Cross-Journey Patterns

### Common Pain Points

- **The silent interval between submitting and knowing** appears in JRN-01.1 (Submit), JRN-01.2 (Submit a deficient entry), JRN-01.6 (Wait, briefly) and JRN-01.7 (Hear the receipt outcome). In every one, the friction is the same: a system that does not state its outcome is a system a specialist stops trusting, and the compensating behaviour — a private side-list, a re-check of the queue — is the exact pain point the product exists to remove. Solved once by explicit, announced outcome messaging at the shell level (F2 live regions) and inherited by F6, F10 and F12.
- **Provenance carried by colour alone** would break JRN-01.3 (Verify the provenance), JRN-01.5 (Answer *AI versus human*), JRN-01.7 (Read the case in order) and — indirectly, since he hears it read — JRN-02.1 (Hear *what the AI said versus what the human chose*). One design rule fixes all four: origin conveyed programmatically and textually as well as visually, everywhere it appears (NFR-4).
- **A required reason with no visible consumer degrades into a formality** across JRN-01.3, JRN-01.4, JRN-01.6 and, as a consequence, JRN-02.1 and JRN-03.1 (R-8). The structural defence is not a longer minimum length but rendering the reason in the audit trail where it is actually read (F14), plus walkthrough review of decision-usefulness (SM-5, SM-9).
- **The absence of cross-case search** is felt at JRN-01.5 (Locate the case) and JRN-02.1 (Receive the question). Both journeys begin holding a case reference or they do not begin at all. This is a deliberate cost of PRD §10 and must be paid by making the case reference the durable identifier on every screen and in every receipt message — never by adding a search surface.
- **Mediated access is a single point of failure for oversight.** JRN-02.1 is conducted entirely through another human because Marcus has no account. Every thinness in the per-case trail becomes a thinness in his answer, with nothing downstream to compensate. This is why F14 is specified to be sufficient on its own rather than adequate-plus-export.
- **The lowest-effort path is the most dangerous one.** Approval is cheaper than editing and far cheaper than rejecting (JRN-01.2, JRN-01.3, JRN-01.4). Only the absence of a default and the equal weighting of the three actions keeps approval an act rather than an omission (R-1, JTBD-01.4).

### Shared Opportunities

- **Establish accessibility once, inherit it six times.** Landmarks, heading order, label/error association, focus management, live-region status and visible focus are built into the shell (F2) and inherited by F6, F8, F10, F12 and F14. This single investment carries JRN-01.7 end to end and removes the same class of pain point from all six PER-01 journeys — with no automated CI gate, per-screen manual and assistive-technology review is the gate (excluded by `.planning/PROJECT.md`; R-3).
- **Make the case reference the currency of the whole product.** It appears in the receipt outcome (F6), the queue row (F8), the case header (F10), the decision confirmation (F12) and the trail (F14). Strengthening it serves JRN-01.1, 01.2, 01.5, and JRN-02.1's opening stage simultaneously.
- **Answer in place rather than relocating the answer.** NFR-7 serves JRN-01.5, JRN-02.1 and JRN-03.1's closing stage with one property. An export would appear to help all three and would in fact weaken all three, by making the trail's sufficiency optional — which is why PRD §10 #5 excludes it.
- **State degraded conditions positively.** JRN-01.6's degraded-mode presentation and JRN-01.1's clean-pass message are the same design move: naming a condition rather than leaving it to be inferred from an absence. Both prevent the specialist from going to look somewhere else.
- **Transactional coupling removes a whole class of journey failure.** Because a state change and its audit entry commit together (NFR-6), no journey in this document can end in a resolved case with no history — the failure mode simply has no representation.

### Convergence Points

- **The per-case audit trail (F14) is where all three personas meet.** PER-01 reads it directly (JRN-01.2 Close the loop, JRN-01.3 Verify the provenance, JRN-01.5 in full, JRN-01.6 Verify the record, JRN-01.7 Read the trail back). PER-02 hears it read to him (JRN-02.1). PER-03 watches it being read (JRN-03.1 Watch audit close the loop). One screen, three relationships — operator, beneficiary, witness — and only one of them is a user.
- **The decision controls (F12) carry the product's central claim for everyone.** Dana's deliberateness (JRN-01.2, 01.3, 01.4, 01.6, 01.7), Marcus's certainty that a named human decided (JRN-02.1), and Priya's structural answer on accountability (JRN-03.1) all rest on the same undefaulted three-action control and its mandatory reason.
- **Validation findings (F4 → F5) converge at the start of every exception journey.** They are the basis Dana reasons from (JRN-01.2, 01.6), the answer to Marcus's "why was this case open at all" (JRN-02.1), and the visible proof to Priya that exceptions are derived rather than authored (JRN-03.1).
- **The non-user journeys converge on PER-01's session, never on a surface of their own.** JRN-02.1 depends on JRN-01.5 being complete; JRN-03.1 is JRN-01.2 and JRN-01.3 observed. Strengthening PER-01's record and screens is the only mechanism by which PER-02 and PER-03 are served — and the only one permitted.

---

## Journey-to-JTBD Traceability

| Journey Stage | JTBD ID | Expected Outcome | Metric |
|--------------|---------|-----------------|--------|
| JRN-01.1:Arrive | JTBD-01.7 | Unauthenticated access to a protected route is rejected and redirected to sign-in | SM-11 |
| JRN-01.1:Authenticate | JTBD-01.1 | An authenticated specialist identity is established and available to the audit writer as the actor | SM-4 |
| JRN-01.1:Compose | JTBD-01.1 | The required-information field set is legible before submission through labels, hints and required-field marking | SM-1 |
| JRN-01.1:Submit | JTBD-01.1 | Receipt is atomic — persist, validate, determine outcome in one transaction; no entry exists received but unassessed | SM-8, SM-1 |
| JRN-01.1:Read outcome | JTBD-01.1 | The clean-pass outcome is stated explicitly and announced, never inferred from an absence of errors | SM-8 |
| JRN-01.1:Move on | JTBD-01.2 | The receipt outcome offers a route onward into the queue, so the clean branch ends inside the flow | SM-1 |
| JRN-01.2:Submit a deficient entry | JTBD-01.1 | Server-side validation is authoritative; the entry is received exactly as it arrived and the exception is derived from its failure | SM-8 |
| JRN-01.2:Read the exception receipt | JTBD-01.1 | The outcome states *exception opened* with a navigable case reference and per-rule findings naming rule and field | SM-8, SM-1 |
| JRN-01.2:Enter the queue | JTBD-01.2 | Open exceptions appear as one stable receipt-ordered list with no filter, sort, assignment or priority parameter | SM-1, SM-11 |
| JRN-01.2:Open the case | JTBD-01.2 | A row is identifiable by reference, receipt time and failure summary, and opens in a single keyboard or pointer action | SM-11 |
| JRN-01.2:Read the case | JTBD-01.3 | Entry values, named findings, and an un-applied AI proposal with plain-language rationale, every proposed value origin-marked | SM-9, SM-3 |
| JRN-01.2:Decide | JTBD-01.4 | Approve, Edit and Reject are presented with no default or pre-selection, so approving the AI is a deliberate act | SM-4 |
| JRN-01.2:Confirm | JTBD-01.4 | Resolution state changes only through the recorded human decision, with the audit entry committed in the same transaction | SM-4, SM-6 |
| JRN-01.2:Close the loop | JTBD-01.5 | The full chronology — received, validated, excepted, recommended, decided — is readable inside the case | SM-2, SM-6 |
| JRN-01.3:Open and read | JTBD-01.3 | The proposal is presented as individually attributed values, so partial disagreement is expressible | SM-3, SM-9 |
| JRN-01.3:Choose to edit | JTBD-01.4 | Edit is reachable at equal weight and equal cost to Approve, so accuracy is never the expensive choice | SM-4 |
| JRN-01.3:Change the value | JTBD-01.4 | Changed fields are visibly marked as specialist-modified at decision time, not only afterwards | SM-3 |
| JRN-01.3:Write the reason | JTBD-01.4 | A non-empty reason is required on edit and enforced at the API boundary, not only in the browser | SM-5 |
| JRN-01.3:Review before commit | JTBD-01.4 | What will be recorded is shown before it is recorded, so append-only immutability is never experienced as a trap | SM-2 |
| JRN-01.3:Commit the decision | JTBD-01.4 | Changed values are re-stamped `HUMAN` while untouched values retain `AI`, committed with the audit entry | SM-3, SM-4 |
| JRN-01.3:Verify the provenance | JTBD-01.5 | Before/after values, reason, actor and per-value origin are legible in the trail beyond colour alone | SM-2, SM-3 |
| JRN-01.4:Read the proposal | JTBD-01.3 | The rationale is plain-language enough to locate which part of the reasoning fails | SM-9 |
| JRN-01.4:Commit to refusing | JTBD-01.4 | Reject is presented at equal weight with Approve and Edit, with no nudge back toward approval | SM-4 |
| JRN-01.4:Attempt without a reason | JTBD-01.4 | A missing reason is rejected at the API boundary and surfaced as an inline, focus-managed error | SM-5 |
| JRN-01.4:Write the reason | JTBD-01.4 | The rejection carries a non-empty reason written in the specialist's own words | SM-5 |
| JRN-01.4:Close the case | JTBD-01.4 | The case closes `REJECTED` through a recorded human decision, leaves the queue, and cannot be decided twice | SM-4, SM-6 |
| JRN-01.4:Read it back | JTBD-01.5 | The AI's original recommendation is preserved as it was made, alongside the refusal and its reason | SM-2 |
| JRN-01.5:Locate the case | JTBD-01.5 | The case reference is the stable identifier reaching a closed case with no cross-case search in scope | SM-2 |
| JRN-01.5:Open the closed case | JTBD-01.5 | Closed cases present read-only, with the recorded decision shown in place of decision controls | SM-2 |
| JRN-01.5:Open the trail | JTBD-01.5 | The per-case history renders in monotonic sequence order with no edit, correct or delete affordance | SM-6, SM-7 |
| JRN-01.5:Answer *who and when* | JTBD-01.5 | Actor identity and timestamp on every entry, with machine-originated entries distinguishable from specialist entries | SM-2, SM-4 |
| JRN-01.5:Answer *what changed* | JTBD-01.5 | Before and after values with the captured reason rendered inline at the entry it belongs to | SM-2, SM-5 |
| JRN-01.5:Answer *AI versus human* | JTBD-01.5 | Per-value `AI` or `HUMAN` origin rendered in the trail, so a mixed resolution decomposes cleanly | SM-3, SM-2 |
| JRN-01.6:Open the case | JTBD-01.6 | Queue and exception creation are unaffected by AI provider state | SM-13 |
| JRN-01.6:Wait, briefly | JTBD-01.6 | Generation shows accessible progress status without freezing the interface or blocking navigation | SM-13 |
| JRN-01.6:Read the degraded state | JTBD-01.6 | An explicit *no recommendation available* state, with the decision path visibly unaffected | SM-13 |
| JRN-01.6:Decide without a proposal | JTBD-01.4, JTBD-01.6 | Decision controls are bound to the case, not to the recommendation, so a degraded case stays decidable | SM-4, SM-13 |
| JRN-01.6:Record the reason | JTBD-01.4, JTBD-01.6 | Reason enforcement is identical on the degraded path — no second-class record shape exists | SM-5 |
| JRN-01.6:Verify the record | JTBD-01.5, JTBD-01.6 | The audit record is as complete as any other, with no fabricated or null-origin recommendation entry | SM-13, SM-6, SM-3 |
| JRN-01.7:Sign in by keyboard | JTBD-01.7 | Semantic landmarks, heading order and accessible names present from the first screen | SM-10, SM-11 |
| JRN-01.7:Fill the entry form | JTBD-01.7 | Programmatic required-field indication and label/hint association announced rather than discovered | SM-10, SM-12 |
| JRN-01.7:Recover from the error summary | JTBD-01.7, JTBD-01.1 | The error summary moves focus, is announced, and links field by field to the inputs concerned | SM-10, SM-11 |
| JRN-01.7:Hear the receipt outcome | JTBD-01.7, JTBD-01.1 | Outcome messaging exposed to assistive technology via live regions | SM-10 |
| JRN-01.7:Traverse the queue | JTBD-01.7, JTBD-01.2 | Accessible list/table semantics, programmatic row count, keyboard-operable row activation | SM-11, SM-12 |
| JRN-01.7:Read the case in order | JTBD-01.7, JTBD-01.3 | Heading structure carries entry → findings → recommendation → decision → audit; origin never colour-alone | SM-10, SM-3 |
| JRN-01.7:Decide by keyboard | JTBD-01.7, JTBD-01.4 | The undefaulted three-action decision, reason capture and error recovery complete by keyboard alone | SM-11, SM-4 |
| JRN-01.7:Read the trail back | JTBD-01.7, JTBD-01.5 | The history is traversable by screen reader with actor, action, time, before/after, reason and origin announced | SM-10, SM-2 |
| JRN-02.1:Receive the question | JTBD-02.4 | A case reference is sufficient to begin an oversight question; no search or reporting surface is required or exists | SM-8 |
| JRN-02.1:Ask a specialist | JTBD-02.3 | The per-case trail is complete enough that a mediated reading loses nothing — no export, no handoff surface | SM-2, NFR-7 |
| JRN-02.1:Hear *who decided, and when* | JTBD-02.1 | Every decision carries an authenticated specialist identity and timestamp; no system or anonymous actor exists | SM-4 |
| JRN-02.1:Hear *AI versus human* | JTBD-02.3 | Per-value provenance in storage and rendering makes the human's contribution provable for mixed resolutions | SM-3, SM-2 |
| JRN-02.1:Hear *why*, and *why open* | JTBD-02.3, JTBD-02.4 | Mandatory reason text and the derived validation basis are present in the record and read back | SM-5, SM-8 |
| JRN-02.1:Satisfy himself the record could not have been altered | JTBD-02.2 | Insert-only storage with revoked UPDATE/DELETE privileges, monotonic sequencing and hash linkage — proven by test | SM-7, SM-6 |
| JRN-03.1:Set the terms | JTBD-03.1 | At least one entry is hand-typed live for receive/validate; a seeded case (F15) may additionally be used for later stages, disclosed rather than substituted | SM-1 |
| JRN-03.1:Watch receive and validate | JTBD-03.1 | Two of six loop stages demonstrated live in the browser with data created during the session | SM-1 |
| JRN-03.1:Watch except and recommend | JTBD-03.1, JTBD-03.3 | Except and recommend demonstrated with the proposal visibly un-applied and origin-marked beyond colour alone | SM-1, SM-3 |
| JRN-03.1:Watch the human decide | JTBD-03.2 | Undefaulted decision controls and mandatory reason capture observed in operation, not described | SM-4, SM-5 |
| JRN-03.1:Watch audit close the loop | JTBD-03.1 | Six of six stages complete; the record explains itself in place with no export or second system | SM-1, SM-2 |
| JRN-03.1:Probe the accountability claim | JTBD-03.2 | No scheduled job, worker, retry path or system actor can resolve a case — answered structurally and by test | SM-4, SM-13 |
| JRN-03.1:Check what was declined | JTBD-03.4 | Zero shipped features fall within a PRD §10 exclusion, checked offline against the feature set | SM-14 |

**JTBD coverage check:** JTBD-01.1 (JRN-01.1, 01.2, 01.7), JTBD-01.2 (01.1, 01.2, 01.7), JTBD-01.3 (01.2, 01.3, 01.4, 01.7), JTBD-01.4 (01.2, 01.3, 01.4, 01.6, 01.7), JTBD-01.5 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7), JTBD-01.6 (01.6), JTBD-01.7 (01.1, 01.7), JTBD-02.1 (02.1), JTBD-02.2 (02.1), JTBD-02.3 (02.1), JTBD-02.4 (02.1), JTBD-03.1 (03.1), JTBD-03.2 (03.1), JTBD-03.3 (03.1), JTBD-03.4 (03.1). **15 of 15 jobs covered; every journey maps to at least one job.**

**Feature coverage check:** F0 (JRN-01.3, 01.5, 01.6, 02.1, 03.1), F1 (01.1, 01.7, 02.1, 03.1), F2 (all seven PER-01 journeys), F3 (01.1, 01.2, 01.7, 03.1), F4 (01.1, 01.2, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F5 (01.2, 01.7, 02.1, 03.1), F6 (01.1, 01.2, 01.7, 03.1), F7 (01.2, 01.4, 01.5, 01.6, 01.7, 03.1), F8 (01.1, 01.2, 01.5, 01.6, 01.7, 03.1), F9 (01.2, 01.3, 01.4, 01.6, 01.7, 02.1, 03.1), F10 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F11 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F12 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 03.1), F13 (01.1, 01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F14 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F15 (03.1, Phase 7 — Check what was declined). **16 of 16 features touched.**

**Metric coverage check:** SM-1, SM-2, SM-3, SM-4, SM-5, SM-6, SM-7, SM-8, SM-9, SM-10, SM-11, SM-12, SM-13, SM-14. **14 of 14 metrics referenced.**

---

## Scope & Quality Self-Check

| Check | Result |
|-------|--------|
| Every persona has at least one journey | ✅ PER-01 × 7, PER-02 × 1, PER-03 × 1 |
| Every interactive journey belongs to PER-01 | ✅ All seven screen-bearing journeys are PER-01's; JRN-02.1 and JRN-03.1 contain no screen operated by their persona |
| Non-user journeys contain no login, screen, dashboard, export, query or API call for their persona | ✅ JRN-02.1 touchpoints are another human, record properties, and test evidence; JRN-03.1 touchpoints are an observed PER-01 session, verbal Q&A, and an offline §10 check |
| Non-user journeys labelled explicitly | ✅ Both open with *non-user journey — no authenticated access, no dedicated interface* |
| All seven required PER-01 scenarios present as their own journey | ✅ Happy path (01.1), core loop/approve (01.2), edit (01.3), reject (01.4), audit reconstruction (01.5), degraded AI (01.6), accessibility (01.7) |
| Every touchpoint names one of the six screens (or a non-system touchpoint) | ✅ Sign-in, entry form, queue, case detail, decision, audit trail only |
| No stage requires an excluded capability | ✅ No supervisor dashboard, queue metric, aging, throughput, workload, reassignment, filter, sort, assignment, prioritisation, audit export, bulk/file/API ingestion, second role, autonomous AI resolution, duty/tariff calculation, native mobile, or CI accessibility gate appears in any stage. **Phase 7:** seeded demonstration data (F15) is no longer on this excluded-capability list — it is a shipped, additive feature (JRN-03.1) that supplements rather than replaces the live entry path |
| Every stage has all seven columns populated | ✅ No empty cells across all 60 stages |
| Every journey has at least one key moment | ✅ Each journey lists 3–5 |
| Success outcomes trace to JTBD success measures | ✅ Each cites its JTBD and SM IDs |
| Feature touchpoints reference valid PRD feature IDs | ✅ F0–F15 only (F15 added Phase 7); non-user journeys mark features as beneficiary/observed, never operated |
| Accessibility treated as journey steps, not a footnote | ✅ JRN-01.7 is a full eight-stage journey across all six screens, with WCAG 2.1 AA accessibility behaviours as stages (visual design system is USWDS through Phase 6, replaced Phase 7; the accessibility bar itself is unchanged) |
| Cross-journey patterns documented | ✅ Six common pain points, five shared opportunities, four convergence points |

---

*Document generated by Pivota Spec Framework — Journeys Generator*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11); derived from PERSONAS-CargoExec.md v1.0, JTBD-CargoExec.md v1.0, PRD-CargoExec.md v1.1*
*Last updated: 2026-09-11; Phase 7 targeted update: 2026-09-16 (USWDS wording made system-independent in F2-affected stages; JRN-03.1 updated for the seeded demonstration case, F15)*
