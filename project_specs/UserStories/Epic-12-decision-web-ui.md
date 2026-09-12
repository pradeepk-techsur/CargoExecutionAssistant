## Epic 12: Decision Web UI — Edit, Approve, Reject with Reason Capture (F12)

The "Your decision" region of the case screen: three deliberate, equally-available actions with no
default, a two-step commitment, and mandatory reason capture on edit and reject.

### US-12.1: Choose among three actions with nothing chosen for me
**As a** cargo specialist, **I want to** see approve, edit-and-approve, and reject presented as three equal actions with none pre-selected, **so that** approving the AI is a deliberate choice rather than the path of least resistance.

**Acceptance Criteria:**
- [ ] Given an open case with an `AVAILABLE` recommendation, when the decision region renders, then three separate activatable controls appear — "Approve", "Edit and approve", "Reject" — with no radio pre-selected, no `autofocus`, and no focus pre-placed on any one of them.
- [ ] Given the three controls, when their styling is reviewed, then they carry equal visual weight; "Approve" is not the only primary-styled control with the others de-emphasised as links.
- [ ] Given the keyboard, when I tab through the region, then order is Approve → Edit and approve → Reject, matching DOM order, and no keyboard shortcut exists for any action.
- [ ] Given `permitted_decisions` without `APPROVE`, when the region renders, then the Approve control is absent from the DOM (not disabled) and the note "There is no AI recommendation to approve." is shown, with "Edit and approve" labelled "Resolve directly".
- [ ] Given the region, when it is inspected, then there is no "approve all", "apply and next", or "decide and open next case" control, and nothing acts on more than the case being read.
- [ ] Given a closed case, when the region renders, then no action chooser and no form exist in the DOM.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.2: Edit the proposed values and see which ones I changed
**As a** cargo specialist, **I want to** edit the AI's proposed values in a form that marks each field I change, **so that** I can see the provenance my decision will record before I record it.

**Acceptance Criteria:**
- [ ] Given I choose "Edit and approve" on a case with a recommendation, when the edit form renders, then it shows one input per proposed field pre-populated with the AI-proposed value, each labelled and badged "AI-suggested".
- [ ] Given a direct resolution (no available recommendation), when the form renders, then it shows one input per field named by the validation findings, pre-populated with my submitted entry value or empty, badged "Specialist-entered".
- [ ] Given I change a value, when the field re-renders, then its badge becomes "Specialist-modified" and a "Changed" marker appears as text plus icon — never colour alone — exposed to assistive technology, announced politely at most once per field per change, with a running count announced ("2 fields changed").
- [ ] Given I revert a field to the exact proposed value, when it re-renders, then the "AI-suggested" badge is restored, because the client compares using the same trim-then-compare rule the server applies.
- [ ] Given the edit form, when it is submitted, then the client sends every rendered field as `{field_name, value}` — never an origin, a changed flag, a diff, or a partial set.
- [ ] Given a long field, when I type into it, then a character counter reflects the field's structural limit, and the client does not block the decision merely because I changed nothing.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.3: Write my reason, and be told accessibly if I have not
**As a** cargo specialist, **I want to** enter a free-text reason for an edit or a rejection and get a clear, focus-managed error if it is missing or too short, **so that** the record always carries my justification in my own words.

**Acceptance Criteria:**
- [ ] Given the edit form, when it renders, then a required "Reason for your changes" textarea appears with the USWDS required indicator, the hint "At least 10 characters. Explain why you changed the recommendation.", and a character counter.
- [ ] Given the reject form, when it renders, then a required "Reason for rejecting" textarea appears with the hint "At least 10 characters. Explain why the recommendation is not being adopted." and the plain statement "Rejecting closes this case without adopting the recommendation. No resolution values will be recorded."
- [ ] Given an empty or two-character reason, when I activate "Continue", then an inline error renders on the field, an error summary appears, focus moves to the summary, no request is sent, and I cannot reach the pre-submission summary.
- [ ] Given a reason the client considered valid but the server refuses, when `422 REASON_REQUIRED` returns, then the server's message renders in the error summary and inline on the field, focus moves to the summary, and every entered value is preserved.
- [ ] Given the reason input, when it is inspected, then it is a free-text `<textarea>` with no dropdown of pre-written reasons, no "quick reason" chips, no default text, and no placeholder that could be submitted as-is.
- [ ] Given the Approve action, when its reason field renders, then it is explicitly labelled "Reason (optional)".
- [ ] Given a `422 RESOLUTION_VALUES_INCOMPLETE`, when it returns, then the error summary names the missing fields and preserves my input.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.4: See exactly what will be recorded before it is recorded
**As a** cargo specialist, **I want to** review a summary of the decision, the values, and the reason before committing it, **so that** no single click both chooses and records a decision I have not read back.

**Acceptance Criteria:**
- [ ] Given any chosen action, when I continue, then the pre-submission summary renders before anything is sent — no single activation both chooses and records a decision.
- [ ] Given an approval summary, when it renders, then it states "Approve the AI-recommended resolution", lists every value that will be recorded with its "AI-suggested" badge, and states "All values will be recorded as AI-suggested, and this decision will be recorded against your name."
- [ ] Given an edit summary, when it renders, then each field reads *AI suggested X → you are recording Y*, unchanged fields are shown as retaining AI origin, and the reason text appears exactly as it will be stored.
- [ ] Given a rejection summary, when it renders, then it shows the decision type, the reason, and the declined values for the record.
- [ ] Given any summary, when it renders, then it states that the decision is recorded permanently against my name and cannot be changed afterwards, and offers "Back" which returns to the form with all input preserved.
- [ ] Given "Cancel" from any form, when I activate it, then no request is sent and nothing is recorded; if I had typed a reason or changed a value, I am asked to confirm before it is discarded.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.5: Be shown what was actually recorded, from the server's own record
**As a** cargo specialist, **I want to** see a confirmation built from the server response rather than from what my screen assumed, **so that** what I am told was recorded is exactly what the audit trail will show.

**Acceptance Criteria:**
- [ ] Given a `201` decision response, when the confirmation panel renders, then every displayed field comes from that response — never from the client's optimistic assumption.
- [ ] Given the confirmation, when it renders, then it shows `<h3>` "Decision recorded", the decision type in words, the deciding specialist and timestamp as returned, the reason, each recorded value with its server-assigned `AI`/`HUMAN` badge and the prior value where it changed, and the new case state.
- [ ] Given the confirmation, when it renders, then focus moves to the confirmation heading and the outcome is announced politely.
- [ ] Given the confirmation, when it renders, then it offers "View the audit trail for this case" (to the `#audit-trail` anchor) and "Back to review queue".
- [ ] Given the confirmation's values and origins, when they are compared with the audit trail, then they match exactly.
- [ ] Given a `500 DECISION_FAILED`, when it returns, then the error summary states "Nothing was saved. Try again." announced assertively, and the case remains open and decidable.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.6: Be handled gracefully when the case was already decided or the proposal changed
**As a** cargo specialist, **I want to** be told plainly when a case was already decided or the recommendation has changed, without it being framed as my mistake or producing a duplicate, **so that** a stale tab cannot corrupt the record.

**Acceptance Criteria:**
- [ ] Given a `409 EXCEPTION_ALREADY_DECIDED`, when it returns, then an informational alert renders "This case was already {resolved/rejected} by {name} on {date}.", the controls are removed, the case is refreshed from the server, and the change is announced assertively — not presented as my error.
- [ ] Given a `409 RECOMMENDATION_MISMATCH`, when it returns, then the case reloads with "The recommendation changed. Review it again before deciding." and the stale pre-submission summary is discarded rather than re-posted.
- [ ] Given a `409 RECOMMENDATION_NOT_AVAILABLE` on approval, when it returns, then an alert explains that there is no recommendation to approve and the action chooser is re-rendered without Approve.
- [ ] Given "Record decision" in flight, when I activate it again, then it is disabled with a busy state and the request carries the `Idempotency-Key` generated when the summary was rendered, so a retry cannot produce a second decision.
- [ ] Given an unknown outcome after a network failure, when it is handled, then the client does not auto-retry and tells me to reload the case to see whether the decision was recorded.
- [ ] Given a `401` during the decision path, when it returns, then I am redirected to sign-in with an explanation and my input is discarded rather than silently re-submitted.

**Priority:** P1 | **Feature Ref:** F12

---

### US-12.7: Complete the whole decision by keyboard, and find nothing left to click afterwards
**As a** cargo specialist, **I want to** take the entire decision — choose, edit, reason, review, record, read the confirmation — with the keyboard, and see the controls disappear once recorded, **so that** the accountable act is fully operable without a pointer and visibly final.

**Acceptance Criteria:**
- [ ] Given the keyboard only, when I complete an edit-and-approve, then every step is reachable and operable with visible focus and each outcome announced (SM-11).
- [ ] Given a recorded decision, when the region re-renders, then the action chooser and all forms are removed from the DOM and the recorded decision is shown read-only with the statement that the case is closed and the decision final — disabled-but-present controls are not used.
- [ ] Given a screen reader, when I complete an edit-and-approve with a reason, then the changed-field marking, the reason requirement, the summary, and the confirmation are all announced; recovering from a missing-reason error is also announced.
- [ ] Given the region, when it is inspected after a decision, then no control edits, amends, undoes, or supersedes the recorded decision.
- [ ] Given the F2 accessibility checklist, when the case screen is signed off, then the record includes a screen-reader walkthrough of an edit-and-approve with a reason and of a missing-reason error recovery (SM-10).
- [ ] Given the decision region, when the F2 form pattern is applied, then the submit control enters a busy state with `aria-disabled="true"` and repeat submission is blocked.

**Priority:** P0 | **Feature Ref:** F12

---
