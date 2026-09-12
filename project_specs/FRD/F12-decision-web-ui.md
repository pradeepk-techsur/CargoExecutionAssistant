## F12: Decision Web UI — Edit, Approve, Reject with Reason Capture

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F10, F11 · **PRD trace:** §5.5 F12, §11.1, NFR-2, NFR-5, SM-5, SM-11, R-1, R-8

**Description:** F12 is the region of the case detail screen through which the specialist takes the decision: approve, edit, or reject, presented as three deliberate and equally available actions with no pre-selected default that would nudge the human toward rubber-stamping the AI. Choosing edit opens the recommended values in an editable USWDS form with a required reason field; choosing reject requires a reason before the action can complete. The region shows what will be recorded before it is recorded, and confirms afterwards what was recorded, including which values the specialist changed.

**Terminology (feature-specific):**
- **Decision region:** the "Your decision" section of `/cases/{caseReference}` (F10 section 5).
- **Action chooser:** the three-button group (Approve / Edit and approve / Reject) presented when the case is open.
- **Edit form:** the USWDS form pre-populated with the AI-proposed values, plus the required reason field.
- **Reject form:** the reason-capture form shown after choosing Reject.
- **Pre-submission summary:** the "This is what will be recorded" panel shown before the decision is sent.
- **Confirmation:** the post-decision panel rendered from the server's `201` response.
- **Modified marker:** the visual + programmatic indication that a field's value now differs from the AI's proposal.

**Sub-features:**
- Approve, Edit, and Reject presented without a default or pre-selection
- Editable resolution form pre-populated with AI-proposed values, changed fields visibly marked
- Required reason input for edit and reject, with accessible required marking and error messaging
- Pre-submission summary and post-decision confirmation
- Controls absent on closed cases, with the recorded decision shown read-only
- Full keyboard operability with announced outcomes
- Server-side reason rejection surfaced as an inline, focus-managed error

---

### Presentation states

| Case / recommendation state | What renders |
|---|---|
| Open, recommendation `AVAILABLE` | Action chooser with all three actions |
| Open, recommendation `PENDING` or `UNAVAILABLE` | Action chooser with "Edit and approve" (labelled "Resolve directly") and "Reject"; Approve absent with the note "There is no AI recommendation to approve." |
| Edit chosen | Edit form (values + reason) + Cancel |
| Reject chosen | Reject form (reason) + Cancel |
| Any action confirmed | Pre-submission summary + "Record decision" + "Back" |
| Decision recorded | Confirmation panel |
| Closed case | No controls in the DOM; read-only recorded decision (F10 FR-10.11) |

---

### Process — Approve

1. Specialist activates "Approve".
2. The region renders the pre-submission summary: the decision type in words ("Approve the AI-recommended resolution"), every value that will be recorded with its "AI-suggested" badge, and the sentence "All values will be recorded as AI-suggested, and this decision will be recorded against your name."
3. An optional reason field is offered, labelled "Reason (optional)".
4. Specialist activates "Record decision". `POST /api/exceptions/{id}/decision` with `decision_type: "APPROVE"`, the optional reason, `recommendation_id`, and an `Idempotency-Key` generated when the summary was rendered.
5. On `201`, the confirmation panel renders from the response.

### Process — Edit and approve

1. Specialist activates "Edit and approve".
2. The edit form renders one input per proposed field, pre-populated with the AI-proposed value, each labelled with the field name and carrying its current provenance badge ("AI-suggested" until changed). For a **direct resolution** (no available recommendation) the form instead renders one input per field named by the validation findings, pre-populated with the submitted entry value (or empty), badged "Specialist-entered".
3. As the specialist changes a value, the field's badge changes to "Specialist-modified" and a "Changed" marker appears (text + icon, not colour alone). Reverting to the exact proposed value restores the "AI-suggested" badge. The marker is announced politely at most once per field per change, and the running count of changed fields is announced ("2 fields changed").
4. The required "Reason for your changes" textarea renders with the USWDS required indicator, hint "At least 10 characters. Explain why you changed the recommendation.", and a character counter.
5. Activating "Continue" applies client-side checks (FR-12.9) and renders the pre-submission summary: each field as *AI suggested X → you are recording Y*, with unchanged fields shown as retaining AI origin, plus the reason text as it will be stored.
6. Activating "Record decision" posts `decision_type: "EDIT_APPROVE"`, `reason`, and the **complete** `resolution_values` set (every field shown in the form — F11 FR-11.7).
7. On `201`, the confirmation panel renders from the response.

### Process — Reject

1. Specialist activates "Reject".
2. The reject form renders the required "Reason for rejecting" textarea (same pattern, hint "At least 10 characters. Explain why the recommendation is not being adopted.") and a plain statement: "Rejecting closes this case without adopting the recommendation. No resolution values will be recorded."
3. "Continue" → pre-submission summary showing the decision type, the reason, and the declined values for the record.
4. "Record decision" posts `decision_type: "REJECT"` with the reason only.
5. On `201`, the confirmation panel renders from the response.

---

### Functional Requirements

- **FR-12.1 — No default, no pre-selection, no emphasis asymmetry.** The three actions MUST be presented as three separate activatable controls with no radio pre-selected, no focus pre-placed on any one of them, no `autofocus`, and no styling that makes one the obvious path — specifically, "Approve" MUST NOT be the only primary-styled button while the others are de-emphasised links. Tab order MUST be Approve → Edit and approve → Reject, matching DOM order, and no keyboard shortcut may exist for any action (R-1).
- **FR-12.2 — Two-step commitment.** Every decision MUST pass through the pre-submission summary before it is sent. No single activation may both choose and record a decision, so approval is a deliberate act rather than one click on the screen the specialist was already reading.
- **FR-12.3 — Control set from the server.** Which actions render MUST be driven by `permitted_decisions` from the case response (F7 FR-7.8). When `APPROVE` is not permitted, the control MUST be absent from the DOM (not rendered disabled) and the reason stated in text.
- **FR-12.4 — Reason required on edit and reject.** Both forms MUST mark the reason required with the USWDS indicator, enforce a minimum of 10 characters after trim client-side, and render an inline error plus error summary when it is missing or too short. The specialist MUST NOT be able to reach the pre-submission summary without a satisfying reason. Approve's reason field MUST be explicitly labelled optional.
- **FR-12.5 — Reason is free text, never a canned list.** The reason MUST be a free-text `<textarea>`. There MUST be no dropdown of pre-written reasons, no "quick reason" chips, no default text, and no placeholder that could be submitted as-is — canned reasons produce a record that does not actually explain the decision (R-8).
- **FR-12.6 — Changed-field marking.** A field whose value differs from the AI proposal MUST be marked as specialist-modified with text and icon, conveyed to assistive technology, never by colour alone (F2 FR-2.17/FR-2.20). The marking MUST be derived by comparing against the proposed value using the same trim-then-compare rule the server applies (F11 FR-11.8), so the client's preview of provenance always matches the server's record.
- **FR-12.7 — Complete value set submitted.** For `EDIT_APPROVE` the client MUST submit every field rendered in the edit form, changed or not, as `{field_name, value}` pairs. It MUST NOT submit an origin, a changed flag, a diff, or a partial set — provenance is computed server-side and only server-side (F11 FR-11.8, FR-11.15).
- **FR-12.8 — Pre-submission summary content.** The summary MUST state, in words: the decision type; for each value, the AI-suggested value and the value being recorded, with which origin each will carry; the reason text exactly as it will be stored; and that the decision is recorded permanently against the specialist's name and cannot be changed afterwards. It MUST offer "Back" to return to the form with all input preserved.
- **FR-12.9 — Client checks never substitute for the server.** Client-side reason checking is a convenience. The screen MUST correctly handle a `422 REASON_REQUIRED`, `422 RESOLUTION_VALUES_INCOMPLETE`, or any other `4xx` for input the client considered valid, by rendering the server's message in the error summary and inline on the field, moving focus to the summary, and preserving every entered value (F2 FR-2.12).
- **FR-12.10 — Confirmation is rendered from the server response.** The confirmation panel MUST be built from the `201` body — never from the client's optimistic assumption. It MUST show: `<h3>` "Decision recorded"; the decision type in words; the deciding specialist and timestamp as returned; the reason; each recorded value with its server-assigned `AI` / `HUMAN` badge and the prior value where it changed; the new case state; and links "View the audit trail for this case" (to `#audit-trail`) and "Back to review queue". Focus MUST move to the confirmation heading and the outcome MUST be announced politely.
- **FR-12.11 — Controls disappear after a decision.** Once recorded, the action chooser and all forms MUST be removed from the DOM and the region MUST show the recorded decision read-only, with the statement that the case is closed and the decision final (F10 FR-10.11). Disabled-but-present controls MUST NOT be used, because a disabled control implies a capability that does not exist.
- **FR-12.12 — Already-decided handling.** A `409 EXCEPTION_ALREADY_DECIDED` (another tab, another specialist, a stale screen) MUST render an informational alert — "This case was already {resolved/rejected} by {name} on {date}." — remove the controls, refresh the case from the server, and announce the change assertively. It MUST NOT be presented as the specialist's error.
- **FR-12.13 — Stale recommendation handling.** A `409 RECOMMENDATION_MISMATCH` MUST prompt a reload of the case with the message "The recommendation changed. Review it again before deciding." and MUST discard the stale pre-submission summary rather than re-posting it.
- **FR-12.14 — Double-submission prevention.** "Record decision" MUST be disabled with a busy state while in flight, and the client MUST send the `Idempotency-Key` generated when the summary was rendered, so a retry after an ambiguous network failure cannot produce a second decision (F11 FR-11.11). The client MUST NOT auto-retry; on an unknown outcome it MUST tell the specialist to reload the case to see whether the decision was recorded.
- **FR-12.15 — Cancel is lossless and non-mutating.** "Cancel" from any form MUST return to the action chooser without sending a request and without recording anything. If the specialist typed a reason or changed a value, cancelling MUST ask for confirmation before discarding it.
- **FR-12.16 — No bulk or shortcut decision.** The region MUST offer no "approve all", no "apply and next", no "decide and open next case" control, and no way to act on more than the case being read (F11 FR-11.20, PRD §10 #4).
- **FR-12.17 — Keyboard completeness.** The entire decision path — choose an action, edit values, enter a reason, review the summary, record, read the confirmation — MUST be completable using the keyboard alone, with visible focus at every step and every outcome announced (SM-11).
- **FR-12.18 — Accessibility sign-off.** The region MUST pass the F2 FR-2.26 checklist as part of the case detail screen, including a screen-reader walkthrough of an edit-and-approve with a reason and of a missing-reason error recovery (SM-10).

---

**Inputs:**
- From the case response: `permitted_decisions`, recommendation proposed values, entry values, findings, current state
- From the specialist: chosen action, edited values, reason text, "Continue", "Record decision", "Back", "Cancel"

**Outputs:**
- `POST /api/exceptions/{id}/decision` with `decision_type`, `reason` (where required), complete `resolution_values` (edit only), `recommendation_id`, and `Idempotency-Key`
- Rendered pre-submission summary and server-derived confirmation
- Announcements for changed-field count, validation errors, and the recorded outcome
- Navigation to the audit trail region and back to the queue

**Validation (client-side, advisory; server is authoritative):**
- `reason` required, ≥ 10 chars after trim, ≤ 2000 chars for edit and reject; blocked at "Continue" with an inline error and focus movement.
- Every rendered field MUST be included in the submitted value set; the client MUST refuse to construct a partial payload.
- Each value MUST respect the F3 structural length limit, with a character counter on the longer fields.
- The client MUST NOT block a decision for any other reason; in particular, it MUST NOT require that at least one value be changed before allowing `EDIT_APPROVE` — that determination is the server's (a no-change edit is simply an edit that changed nothing, which the server records with all values retaining `AI` origin and the reason explaining the specialist's intent).

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Missing/short reason (client) | Inline error + error summary | Error summary | Assertive |
| Missing/short reason (server 422) | Server message inline + summary; input preserved | Error summary | Assertive |
| Incomplete value set (422) | Error summary naming missing fields | Error summary | Assertive |
| Already decided (409) | Informational alert; controls removed; case refreshed | Alert | Assertive |
| Stale recommendation (409) | Alert prompting review; summary discarded | Alert | Assertive |
| Approve not permitted (409) | Alert explaining no recommendation to approve; chooser re-rendered | Alert | Assertive |
| Decision failed (500) | Error summary "Nothing was saved. Try again." | Error summary | Assertive |
| Network failure / unknown outcome | Alert advising reload to check whether it was recorded | Alert | Assertive |
| Session expired (401) | Redirect to sign-in; input discarded with explanation | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `POST /api/exceptions/{exceptionId}/decision` (F11) and re-reads `GET /api/exceptions/{idOrReference}` (F7) after conflicts. See `Y1-api.md` §4.

**Schema Surface (this feature):** none directly; renders `recommendation_values`, `decisions`, and `decision_values` as returned by the API.

**Acceptance Criteria:**
1. On an open case with a recommendation, three controls render with no pre-selection, no autofocus, and equal visual weight.
2. Attempting "Continue" on the edit form with an empty reason shows an inline error, moves focus to the error summary, and sends no request.
3. A two-character reason is refused client-side and, when forced past the client, refused by the server with `422 REASON_REQUIRED`.
4. Changing one of three values marks that field "Specialist-modified", and the confirmation shows it `HUMAN` with the other two `AI`.
5. The confirmation panel's values and origins come from the server response and match the audit trail exactly.
6. After recording, no decision control exists in the DOM and the case states it is closed and final.
7. Deciding the same case in a second tab produces the already-decided alert, not a duplicate decision.
8. The entire edit-and-approve path is completable by keyboard alone with each step announced.
9. No "approve all", "apply and next", or canned-reason control exists anywhere in the region.

---
