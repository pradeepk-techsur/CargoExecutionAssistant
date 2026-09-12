## Epic 10: Exception Case Detail & Recommendation Presentation UI (F10)

Screen `/cases/{caseReference}` — where the work happens. Reading order is normative: findings →
submitted entry → recommendation → decision → audit trail.

### US-10.1: Read why this case is open
**As a** cargo specialist, **I want to** see the validation findings that opened the case, verbatim and in the server's order, **so that** the basis of the exception is never something I have to guess at.

**Acceptance Criteria:**
- [ ] Given an open case, when the screen renders, then a `<h2>` "Why this case is open" section lists the findings as an ordered list in ascending `rule_id`, each showing the plain-language message, the field it concerns, and the rule identifier as supplementary small text.
- [ ] Given the findings section, when it renders, then a sentence above it states "This entry did not satisfy {n} required-information rules when it was received."
- [ ] Given the findings, when they render, then the client performs no re-wording, re-ordering, merging, or filtering, and no severity, score, or ranking language appears.
- [ ] Given the case header, when it renders, then it shows `<h1>` "Case {case_reference}" and a definition list with the current state as text (`Open` / `Resolved` / `Rejected`), the received date and time, the submitting specialist, and a "Back to review queue" link.
- [ ] Given all specialist-entered and model-generated text, when it renders, then it is escaped text — markup, scripts, links, and Markdown in any field are not interpreted.
- [ ] Given demonstration load, when the case is opened, then the screen renders within 2 seconds from a single case-detail call.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.2: Read back the values I submitted
**As a** cargo specialist, **I want to** see all fourteen submitted fields with their values or "Not provided", each badged as specialist-entered, **so that** I can judge the case against what was actually typed rather than a corrected version of it.

**Acceptance Criteria:**
- [ ] Given the "Submitted entry" section, when it renders, then all fourteen fields appear as a definition list in the entry-form fieldset order.
- [ ] Given a field with no value, when it renders, then it reads "Not provided" rather than appearing blank.
- [ ] Given a field with a value, when it renders, then it carries the "Specialist-entered" provenance badge with text and icon, exposed to assistive technology.
- [ ] Given a value I typed as `abc12345678`, when it renders, then it appears exactly as typed, not normalised.
- [ ] Given the screen, when it is inspected, then no control edits, clears, or re-submits an entry value.
- [ ] Given a closed case, when it renders, then the submitted entry section is unchanged from the open-case presentation.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.3: Read the recommended action and why the AI recommends it
**As a** cargo specialist, **I want to** read the AI's recommended action with its full plain-language rationale, framed everywhere as an un-applied proposal, **so that** I can judge the draft rather than assume it has already taken effect.

**Acceptance Criteria:**
- [ ] Given an `AVAILABLE` recommendation, when the section renders, then it is headed `<h2>` "AI recommendation", the action is introduced with "The AI suggests:", and the block carries the sentence "Nothing here has been applied. It is recorded only if you decide to approve it."
- [ ] Given the screen, when its text is searched, then the words "Resolution applied", "Fixed", "Corrected", "Updated", and "Auto-resolved" appear nowhere.
- [ ] Given the rationale, when it renders, then it appears in full and verbatim as escaped plain text preserving paragraph breaks under the sub-heading "Why the AI suggests this" — not truncated, summarised, collapsed behind a disclosure by default, or rendered as HTML/Markdown from the model.
- [ ] Given the recommendation section, when it renders, then a footnote states the model identifier, the prompt version, and the generation timestamp.
- [ ] Given an `AVAILABLE` recommendation with a missing action or rationale, when the screen renders, then it shows the degraded presentation rather than an empty block, and logs a client-side warning.
- [ ] Given the recommendation is a proposal, when the screen is inspected, then no control applies, accepts, or partially applies it outside the decision region.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.4: Tell every AI-suggested value from my own at the moment of deciding
**As a** cargo specialist, **I want to** see each proposed value as submitted-value → AI-suggested-value with the rules it addresses and a badge on each side, **so that** I can see what the machine wants to change without reconstructing it from the audit trail afterwards.

**Acceptance Criteria:**
- [ ] Given each proposed value, when it renders as a comparison row, then it shows the field's label, the submitted value (or "Not provided") badged "Specialist-entered" where one exists, the AI-suggested value badged "AI-suggested", and the plain-language message(s) of the rules named in `addresses_rule_ids`.
- [ ] Given a proposal for a field I left empty, when it renders, then it is presented as an addition, not as a change.
- [ ] Given every AI-proposed value on the screen, when it renders, then the badge carries text, a distinct icon, and token colour — never colour alone — and the badge text is available to assistive technology.
- [ ] Given CSS colour overridden to monochrome, when I review the screen, then AI-versus-specialist origin remains discoverable on every value.
- [ ] Given a screen reader, when I traverse the recommendation and entry sections, then every AI-suggested value is announced as AI-suggested and every specialist-entered value as specialist-entered.
- [ ] Given a proposed value whose `field_name` matches no known field, when it renders, then it appears in an "Other suggested values" sub-list rather than being dropped, so nothing the record contains is hidden.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.5: See a recommendation still being generated without being blocked or interrupted
**As a** cargo specialist, **I want to** see a clear pending state that resolves itself in place, **so that** I know a draft is coming without losing my place on the screen or being prevented from deciding.

**Acceptance Criteria:**
- [ ] Given a `PENDING` recommendation under 60 seconds old, when the section renders, then the `Loading` component shows with `aria-busy`, the text "Generating an AI recommendation…", and a polite announcement.
- [ ] Given a `PENDING` recommendation, when the screen polls, then it calls the recommendation endpoint every 3 seconds for at most 60 seconds, stopping on first terminal status, on stale timeout, or when I leave the screen.
- [ ] Given a recommendation that becomes available while I am reading, when the poll returns, then the region updates in place within 3 seconds, announces "An AI recommendation is now available." politely, and does **not** move my focus.
- [ ] Given polling in progress, when I try to navigate or decide, then navigation is not blocked and the decision controls are neither hidden nor disabled.
- [ ] Given a `PENDING` recommendation at 60 seconds, when the stale threshold passes, then polling stops and the degraded presentation renders with "No AI recommendation is available yet."
- [ ] Given a poll request that fails, when it is handled, then polling stops and the degraded block renders with a generic cause, announced politely.

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.6: Decide a case that has no recommendation, without being told something failed
**As a** cargo specialist, **I want to** see a plain "No AI recommendation available" presentation that states I can still decide, **so that** a model outage reads as a degraded assist rather than a broken case.

**Acceptance Criteria:**
- [ ] Given an `UNAVAILABLE` recommendation, when the section renders, then it uses the `Degraded` component — not `ErrorState` — with `<h3>` "No AI recommendation available", the mapped plain-language cause, and the sentence "You can still resolve or reject this case. Your decision and reason will be recorded as usual."
- [ ] Given `failure_reason = 'PROVIDER_TIMEOUT'`, when the cause renders, then it reads "The AI service did not respond in time."; each other enumerated reason maps to its own plain-language string.
- [ ] Given the degraded block, when it renders, then no raw provider error, stack trace, or credential appears, and no "Retry" or "Regenerate" control is offered.
- [ ] Given an `OPEN` case with an unavailable or pending recommendation, when the decision region renders, then the controls are present and driven by `permitted_decisions`, with the decision path unaffected.
- [ ] Given the provider is stopped, when I work the case end to end, then I complete a decision and the case closes with a full audit record (SM-13).
- [ ] Given a closed case whose recommendation was `UNAVAILABLE`, when it renders, then the recommendation section shows exactly that state as it stood, still framed as a proposal.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.7: Read a closed case as a final, unchangeable record
**As a** cargo specialist, **I want to** see a decided case rendered read-only with the recorded decision and no decision controls at all, **so that** I cannot accidentally act on a case that is already finished, and the record's finality is visible.

**Acceptance Criteria:**
- [ ] Given a `RESOLVED` or `REJECTED` case, when it renders, then the state appears as text in the header and the screen states "This case is closed. The decision below is final and cannot be changed."
- [ ] Given the closed case, when the decision section renders, then it shows the decision type, the deciding specialist, the timestamp, the reason (for edit and reject), and the resolution values each with their `AI`/`HUMAN` badge and the prior value where changed.
- [ ] Given the closed case, when the DOM is inspected, then the decision controls are absent entirely — not rendered disabled — because `permitted_decisions` is `[]`.
- [ ] Given the closed case, when the screen is inspected, then no control edits the entry, edits or deletes a finding, edits the recommendation, reopens the case, deletes the case, or exports anything.
- [ ] Given the closed case, when the audit trail region renders, then it is reachable in place and includes the decision event.
- [ ] Given a `404` for an unknown case, when it renders, then a "Case not found" screen appears inside the shell with a link to the queue, distinguishing "That entry passed validation, so it has no exception."; a `401` redirects to sign-in.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.8: Read the case in one predictable order with no queue or aging language
**As a** cargo specialist, **I want to** traverse the case in the same order visually and with my screen reader, with no place-in-queue or age indicators anywhere, **so that** the screen shows me the case rather than a workload.

**Acceptance Criteria:**
- [ ] Given the screen, when headings are inspected, then there is exactly one `<h1>` followed by `<h2>` sections in the normative order findings → submitted entry → AI recommendation → your decision → audit trail, with `<h3>` used only inside those sections and no skipped level.
- [ ] Given the layout, when it is compared with the DOM, then visual order matches DOM order, so keyboard and screen-reader traversal follow the visual reading order.
- [ ] Given the header, when it renders, then an "On this page" set of in-page links follows it, allowing direct movement to each section.
- [ ] Given the screen, when it is searched, then it displays no numeric receipt position, place-in-queue indicator, time-open duration, age, or due date; receipt time appears only as an absolute local datetime with the month in words in a `<time datetime>` element.
- [ ] Given `/cases/{uuid}`, when it loads, then it resolves the same case and canonicalises the address bar to `/cases/CE-YYYY-NNNNNN` by replace-state.
- [ ] Given a case load failure, when it is handled, then `ErrorState` renders "We could not load this case." with "Try again", announced assertively.
- [ ] Given the F2 accessibility checklist, when this screen is signed off, then the record includes a screen-reader walkthrough confirming provenance announcement on every value and a colour-removed verification (SM-3, SM-10).

**Priority:** P0 | **Feature Ref:** F10

---
