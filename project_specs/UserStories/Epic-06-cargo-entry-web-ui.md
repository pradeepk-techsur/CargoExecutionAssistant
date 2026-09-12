## Epic 6: Cargo Entry Web UI (F6)

Screen `/entries/new`. Because there is no seeded dataset, this screen is the beginning of every
demonstration path, and its explicitness about the receipt outcome is what makes the *validate*
and *except* stages visible rather than inferred.

### US-6.1: Fill in a cargo entry on a clearly labelled USWDS form
**As a** cargo specialist, **I want to** complete a labelled entry form that tells me the expected format of each field, **so that** I can type an entry quickly and correctly without guessing at conventions.

**Acceptance Criteria:**
- [ ] Given `/entries/new`, when it renders, then it shows one `<h1>` "New cargo entry", a one-sentence explanation that the entry is checked against required-information rules as soon as it is submitted, and the statement "A star (*) marks required information."
- [ ] Given the form, when its controls are counted, then exactly the fourteen entry fields are rendered — grouped as Entry identification, Transport, Goods, Arrival — with no free-text notes field, no attachment control, no HTS/classification field, and no duty field.
- [ ] Given each control, when it renders, then it has a visible `<label for>` bound to its `id` plus hint text where a format expectation exists, associated via `aria-describedby` — for example "3-character filer code and 8 digits, for example ABC12345678", "4-digit port code", "2-letter country code, for example CN", and "YYYY-MM-DD".
- [ ] Given the twelve fields whose presence is checked by a `RIV-0x0` rule, when the form renders, then each carries the USWDS required indicator; `bill_of_lading_number` and `air_waybill_number` are not individually marked required and their fieldset states "Enter an air waybill number for air shipments, or a bill of lading number otherwise."
- [ ] Given `mode_of_transport` and `quantity_uom`, when they render, then they are USWDS selects populated from the validation domain code lists with an empty default option "- Select -", so nothing is pre-chosen on my behalf.
- [ ] Given `quantity` and `declared_value_usd`, when they render, then they use `type="text"` with `inputmode="decimal"` (no spinner, no locale coercion), and `arrival_date` uses the USWDS date input with an explicit format hint.
- [ ] Given the screen, when it is inspected, then it offers no autosave, no draft persistence, and no "duplicate this entry" or "create another from this one" shortcut.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.2: Submit a deliberately incomplete entry without the browser stopping me
**As a** cargo specialist, **I want to** be able to submit the form in any state, including empty, **so that** the server's required-information rules are the single authority and I can create the incomplete entry the review loop exists to process.

**Acceptance Criteria:**
- [ ] Given a completely empty form, when I activate "Submit entry", then the submission is sent and returns `201` with an exception opened — the browser does not block it and no native constraint-validation bubble appears (`novalidate` is set on the form).
- [ ] Given values as typed, when the request is built, then the client sends them after trimming leading and trailing whitespace only — it does not uppercase codes, strip hyphens, reformat dates, round numbers, or drop fields it considers empty-equivalent beyond sending empty strings.
- [ ] Given a client-side hint or character counter, when I ignore it, then it advises but does not prevent, alter, or pre-filter the submitted values.
- [ ] Given a submission in flight, when I activate "Submit entry" again, then the second activation is ignored; the button shows "Submitting…" with `aria-disabled="true"`.
- [ ] Given a submission whose outcome is unknown (timeout or network failure), when the client handles it, then it does **not** auto-retry, and it tells me to check the review queue to see whether the entry was created, because receipt is not idempotent.
- [ ] Given the screen, when it is inspected, then it contains no file input, drag-and-drop target, paste-a-batch control, template download, or "import from ACE" action — manual typing is the only input method.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.3: Be told plainly what happened to my entry
**As a** cargo specialist, **I want to** see in words whether my entry validated clean, opened an exception, or failed to save, **so that** I never have to infer the outcome from styling or from the absence of an error.

**Acceptance Criteria:**
- [ ] Given a `201` with `receipt_outcome: "VALIDATED_CLEAN"`, when the response renders, then the form region is replaced by a panel with `<h2>` "Entry received and validated", the case reference, a plain statement that no exception was opened, and the actions "Create another entry" and "Go to review queue"; focus moves to the panel heading and the polite region announces "Entry received. Validation passed. Case {reference}."
- [ ] Given a `201` with `receipt_outcome: "EXCEPTION_OPENED"`, when the response renders, then the panel states `<h2>` "Entry received. Exception opened.", the case reference, the count of unsatisfied rules, and offers "Open case {reference}" as the primary action plus "Go to review queue" and "Create another entry"; the polite region announces "Entry received. {n} required-information problems. Exception opened as case {reference}."
- [ ] Given an exception was opened, when the copy is reviewed, then it is not presented as an error or a failure — it is a successful receipt with a business outcome — and the three outcomes are distinguished in words, not by styling alone.
- [ ] Given the outcome panel, when I activate "Open case {reference}", then I navigate to `/cases/{case_reference}`; "Go to review queue" navigates to `/queue`; "Create another entry" resets to an empty form with focus on the first field, an announced status, and none of the previous values retained.
- [ ] Given a successful receipt, when the submitted values are shown, then the form fields become a read-only summary list (not disabled inputs, so screen-reader users can still read them), and the screen does not imply that a received entry can be edited.
- [ ] Given demonstration load, when I submit, then feedback appears within 2 seconds or the busy state remains visible continuously until it does.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.4: See exactly which fields failed which rules
**As a** cargo specialist, **I want to** see each validation finding both in a focus-taking summary and inline against the field it concerns, in the server's order, **so that** I can read the basis of the exception I just created field by field.

**Acceptance Criteria:**
- [ ] Given a receipt that opened an exception with 13 findings, when the screen renders, then all 13 appear in the panel list and inline against their fields, with the form still visible read-only beneath the panel so I can see what I submitted.
- [ ] Given each finding, when it renders inline, then it is bound to the control whose `id` matches its `field_name`, with `aria-invalid="true"` and `aria-describedby` pointing at the error text.
- [ ] Given a finding that references two fields (`RIV-070`, `RIV-073`), when it renders, then it appears in the error slot of the Transport fieldset containing both, associated via `aria-describedby` on the `<fieldset>` — not on an arbitrary single field.
- [ ] Given the error summary, when it renders, then items appear in the exact order the server returned them (ascending `rule_id`), and activating an item moves focus to its control.
- [ ] Given a server message, when it renders, then it is rendered verbatim — the client does not substitute wording, translate codes, merge findings, or suppress any finding; a rule identifier may appear only as supplementary small text.
- [ ] Given a `4xx` submission failure, when it renders, then the error summary appears above the form with the server's per-field detail, focus moves to the summary, the assertive region announces the problem count, and every value I entered is preserved.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.5: Not lose my typing when something goes wrong
**As a** cargo specialist, **I want to** keep the values I typed when a submission is refused or fails, and be told clearly when nothing was saved, **so that** an error costs me a correction rather than the whole entry.

**Acceptance Criteria:**
- [ ] Given a `409 ENTRY_NUMBER_DUPLICATE`, when it renders, then the error summary shows the message with a link to the existing case and an inline error on `entry_number`, and all other entered values are preserved.
- [ ] Given a `500 RECEIPT_FAILED`, when it renders, then the error summary states "The entry could not be received. Nothing was saved. Try again." with a "Try again" action that re-submits the unchanged form, and values are preserved.
- [ ] Given a network failure, when it is handled, then the error summary advises me to check the review queue rather than retrying silently, and the assertive region announces it.
- [ ] Given a `401` on submit, when it is handled, then my typed values are preserved in memory, I am navigated to `/sign-in?next=/entries/new`, and after re-authentication I return to an empty form with a status message explaining that the entry was not saved and must be re-entered — the client never silently re-submits.
- [ ] Given a `422 REQUEST_MALFORMED`, when it renders, then the per-field detail is bound to the named controls and focus moves to the error summary.
- [ ] Given any `4xx` or `5xx` from the submission, when the message is read, then it states explicitly that nothing was saved, so I do not create a duplicate by retrying blindly.

**Priority:** P1 | **Feature Ref:** F6

---

### US-6.6: Create an entry and open the resulting case with the keyboard alone
**As a** cargo specialist, **I want to** complete the whole entry task — fill, submit, read the outcome, open the case — using the keyboard and a screen reader, **so that** the first stage of the loop is operable without a pointer.

**Acceptance Criteria:**
- [ ] Given the keyboard only, when I fill the fourteen fields, submit, read the outcome panel, and activate "Open case {reference}", then the whole task completes with visible focus at every step (SM-11).
- [ ] Given a screen reader, when the outcome panel appears, then the outcome and case reference are announced in the polite live region and focus is on the panel heading.
- [ ] Given a screen reader, when I traverse the form, then every control announces its label, its hint, its required state, and — after a failed submission — its error text.
- [ ] Given the screen, when heading structure is inspected, then there is exactly one `<h1>` and no skipped heading level.
- [ ] Given the F2 accessibility checklist, when this screen is signed off, then the record includes completion of "create an incomplete entry and read its outcome" using the keyboard alone and with a screen reader (SM-10).
- [ ] Given initial render under demonstration load, when measured, then it completes within 2 seconds.

**Priority:** P0 | **Feature Ref:** F6

---
