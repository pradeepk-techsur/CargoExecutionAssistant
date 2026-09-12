## F6: Cargo Entry Web UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F3 · **PRD trace:** §5.2 F6, §11.1, NFR-1, NFR-2, NFR-10, SM-1, SM-11

**Description:** F6 is the screen a cargo specialist actually uses to create a cargo entry: a USWDS form with labelled fields, required-field indication, inline and summarised error messaging, and a submit action. On submission the specialist is told plainly what happened — the entry either passed validation or it opened an exception — with the case reference and a direct link to the case. Because there is no seeded demonstration dataset, this screen is the beginning of every demonstration path, and its explicitness about the receipt outcome is what makes the *validate* and *except* stages of the governed loop visible rather than inferred.

**Terminology (feature-specific):**
- **Entry form:** the single-page USWDS form rendering all fourteen entry fields in four labelled fieldsets.
- **Receipt outcome panel:** the region rendered after a successful `201`, stating `VALIDATED_CLEAN` or `EXCEPTION_OPENED` with the case reference and onward navigation.
- **Findings list:** the server's F4 findings, rendered both as an error summary and inline against each field.
- **Client hint:** a browser-side affordance (input mode, pattern hint, character counter). Advisory only; never authoritative.

**Sub-features:**
- USWDS cargo entry form with accessible labels, hints, and required marking
- Client-side affordances that never substitute for server validation
- Explicit receipt outcome presentation with case reference and link
- Server findings rendered field-by-field plus an error summary that moves focus
- Full keyboard operability and screen-reader-announced outcome
- Navigation from outcome into the queue or the opened case

---

### Screen: New Cargo Entry — `/entries/new`

**Layout** (inside the F2 shell; `<h1>` "New cargo entry"):

1. Intro paragraph: one sentence explaining that the entry is checked against required-information rules as soon as it is submitted, and that anything missing opens an exception for review.
2. Required-field convention statement ("A star (*) marks required information.").
3. Error summary slot (rendered only after a failed or exception-producing submission).
4. Four fieldsets:
   - **Entry identification** — `entry_number`*, `importer_of_record_id`*, `port_of_entry_code`*
   - **Transport** — `mode_of_transport`* (USWDS select: Ocean, Air, Truck, Rail), `carrier_code`*, `conveyance_name`*, `bill_of_lading_number`, `air_waybill_number`
   - **Goods** — `country_of_origin_code`*, `goods_description`* (textarea), `quantity`*, `quantity_uom`*, `declared_value_usd`*
   - **Arrival** — `arrival_date`* (USWDS date input, `YYYY-MM-DD`)
5. Primary button "Submit entry"; secondary link "Cancel" returning to `/queue`.
6. Receipt outcome panel slot (replaces the form region on success).

**Field presentation requirements:**

- **FR-6.1 — Field set parity.** The form MUST render exactly the fourteen fields of F3's entry field set — the four fieldsets above account for all fourteen, with `country_of_origin_code` placed first in **Goods** (origin of the goods belongs with the goods; UX-Mockup Y4 A-1) — no more (no free-text notes field, no attachment control, no HTS/classification field, no duty field) and no fewer.
- **FR-6.2 — Labels and hints.** Every control MUST have a visible `<label>` bound via `for`/`id`, plus USWDS hint text where a format expectation exists — for example "3-character filer code and 8 digits, for example ABC12345678" (`entry_number`), "4-digit port code" (`port_of_entry_code`), "2-letter country code, for example CN" (`country_of_origin_code`), "YYYY-MM-DD" (`arrival_date`). Hints MUST be associated via `aria-describedby` (F2 FR-2.10).
- **FR-6.3 — Required marking.** The twelve fields whose presence is checked by a `RIV-0x0` rule MUST be marked required with the USWDS indicator. `bill_of_lading_number` and `air_waybill_number` MUST NOT be individually marked required; their fieldset MUST carry the conditional statement "Enter an air waybill number for air shipments, or a bill of lading number otherwise." (rule `RIV-070`).
- **FR-6.4 — Client hints never gate submission.** The form MUST be submittable in any state, including entirely empty. Native `required` attributes and constraint-validation blocking MUST be disabled (`novalidate` on the form) so the server is always the authority and the specialist can deliberately create an incomplete entry — which is the primary demonstration path. Client-side hints may format or advise but MUST NOT prevent, alter, or pre-filter the submitted values.
- **FR-6.5 — Values submitted as typed.** The client MUST send values exactly as typed after trimming leading/trailing whitespace only. It MUST NOT uppercase codes, strip hyphens, reformat dates, round numbers, or drop fields it considers empty-equivalent beyond sending them as empty strings. What the specialist typed is what is recorded and audited.
- **FR-6.6 — Input affordances.** `quantity` and `declared_value_usd` MUST use `inputmode="decimal"` with `type="text"` (avoiding spinner and locale coercion); `arrival_date` MUST use the USWDS date input with an explicit format hint; `mode_of_transport` and `quantity_uom` MUST be USWDS selects populated from the F4 domain code lists, with an empty default option ("- Select -") so nothing is pre-chosen on the specialist's behalf.
- **FR-6.7 — No draft, autosave, or duplicate-entry shortcut.** The form MUST NOT autosave, persist a draft, or offer "duplicate this entry" / "create another from this one". Every entry is typed deliberately; a draft store would be an unaudited shadow of the entry of record.

---

### Process — Submit and outcome

1. Specialist activates "Submit entry".
2. The button enters its busy state ("Submitting…", `aria-disabled="true"`); repeat activation is ignored (F2 form pattern).
3. Client `POST`s the fourteen fields with the CSRF header.
4. **Response `201` with `receipt_outcome = "VALIDATED_CLEAN"`:** the form region is replaced by the receipt outcome panel — an `<h2>` "Entry received and validated", the case reference, a plain statement that no exception was opened, and two actions: "Create another entry" and "Go to review queue". Focus moves to the panel heading; the polite live region announces "Entry received. Validation passed. Case {reference}."
5. **Response `201` with `receipt_outcome = "EXCEPTION_OPENED"`:** the screen renders **both** (a) the receipt outcome panel — `<h2>` "Entry received. Exception opened.", the case reference, the count of unsatisfied rules, and the primary action "Open case {reference}" plus secondary "Go to review queue" and "Create another entry"; and (b) the findings, listed in the panel in server order and rendered inline against each affected field in the form below, which remains visible read-only beneath the panel so the specialist can see what they submitted. Focus moves to the panel heading; the polite live region announces "Entry received. {n} required-information problems. Exception opened as case {reference}."
6. **Response `4xx`:** the submission failed and nothing was saved. The error summary renders above the form with the server's per-field detail; focus moves to the summary; the assertive live region announces the problem count. All entered values are preserved.
7. **Response `5xx` or network failure:** the error summary states "The entry could not be received. Nothing was saved. Try again." with a "Try again" action that re-submits the unchanged form. Values are preserved.

---

### Functional Requirements

- **FR-6.8 — Outcome is never ambiguous.** The screen MUST distinguish three states in words, not by styling alone: *validated clean*, *exception opened*, and *submission failed (nothing saved)*. The specialist MUST never have to infer which occurred. An exception being opened MUST NOT be presented as an error or a failure — it is a successful receipt with a business outcome, and the copy MUST reflect that.
- **FR-6.9 — Double-submission prevention.** The client MUST block a second submission while one is in flight, and MUST NOT auto-retry a submission whose outcome is unknown (a timeout may have created an entry). On an unknown outcome the screen MUST say so and direct the specialist to the review queue to check, rather than silently retrying (receipt is not idempotent — F3 FR-3.16).
- **FR-6.10 — Inline findings binding.** Each F4 finding MUST be rendered on the control whose `id` matches its `field_name`, with `aria-invalid="true"` and `aria-describedby` pointing at the error text (F2 FR-2.13). The two cross-field rules `RIV-070` and `RIV-073` are the sole exception: although each carries a single `field_name` (its declared primary field — F4 §Cross-field rules), both MUST be rendered on the Transport fieldset containing both transport-document controls, inside the fieldset's error slot and associated via `aria-describedby` on the `<fieldset>`, because the finding concerns the pair rather than either field alone.
- **FR-6.11 — Summary ordering.** The error summary MUST list findings in the exact order the server returned them (ascending `rule_id` — F4 FR-4.8), each item linking to and focusing its control.
- **FR-6.12 — Message fidelity.** Server messages MUST be rendered verbatim. The client MUST NOT substitute its own wording, translate codes, merge findings, or suppress any finding. Rule identifiers MUST NOT be displayed as the primary message text; they MAY appear as supplementary small text next to the message.
- **FR-6.13 — Navigation from outcome.** "Open case {reference}" MUST navigate to `/cases/{case_reference}` (F10). "Go to review queue" MUST navigate to `/queue` (F8). "Create another entry" MUST reset to an empty form with focus on the first field and an announced status; it MUST NOT retain the previous values.
- **FR-6.14 — Read-only submitted values.** After a successful receipt, the form fields MUST become non-editable (rendered as a read-only summary list, not as disabled inputs, so screen-reader users can still read the values). Editing a received entry is impossible by design (F3 FR-3.6), and the screen MUST NOT imply otherwise.
- **FR-6.15 — Duplicate entry number.** A `409 ENTRY_NUMBER_DUPLICATE` MUST render in the error summary with the message plus a link to the existing case, and an inline error on `entry_number`.
- **FR-6.16 — Session expiry on submit.** A `401` MUST preserve the typed values in memory, navigate to `/sign-in?next=/entries/new`, and after re-authentication return to an empty form with a status message explaining that the entry was not saved and must be re-entered. The client MUST NOT silently re-submit after re-authentication (F1 FR-1.8).
- **FR-6.17 — Performance.** Initial render MUST complete within 2 seconds under demonstration load (NFR-10). Submission feedback MUST appear within 2 seconds or show the busy state continuously until it does.
- **FR-6.18 — Accessibility sign-off.** The screen MUST pass the F2 FR-2.26 checklist, including completion of "create an incomplete entry and read its outcome" using the keyboard alone and with a screen reader (SM-10, SM-11).
- **FR-6.19 — No ingestion affordance.** The screen MUST contain no file input, drag-and-drop target, paste-a-batch control, template download, "import from ACE" action, or any other bulk path (PRD §10 #6). Manual typing is the only input method.

---

**Inputs (from the specialist):** the fourteen entry fields as typed; the submit activation. **Inputs (from the server):** the `POST /api/entries` response — `receipt_outcome`, `case_reference`, `validation.findings[]`, `exception`, and error bodies.

**Outputs:**
- A `POST /api/entries` request containing exactly the fourteen fields
- A rendered receipt outcome panel stating the outcome, the case reference, and onward navigation
- Rendered findings (summary + inline) in server order
- Announcements for submission start, outcome, and errors

**Validation (client-side, advisory only):**
- Trim leading/trailing whitespace on all string values before sending.
- Cap input lengths at the F3 structural limits so a `422` for over-length is not reachable through normal typing (the server check remains authoritative).
- Send `quantity` and `declared_value_usd` as the typed string; do not coerce, round, or localise.
- Do **not** block submission for any reason other than an in-flight request.

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Validation findings (exception opened) | Outcome panel "Exception opened" + summary + inline errors | Panel heading | Polite: outcome and finding count |
| Duplicate entry number (409) | Error summary with link to existing case + inline error | Error summary | Assertive |
| Malformed request (422) | Error summary with per-field detail | Error summary | Assertive |
| Receipt failure (500) | Error summary "Nothing was saved. Try again." + retry | Error summary | Assertive |
| Network failure / unknown outcome | Error summary advising to check the review queue | Error summary | Assertive |
| Session expired (401) | Redirect to sign-in with explanatory status | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `POST /api/entries` (F3). No endpoint of its own. See `Y1-api.md` §2.

**Schema Surface (this feature):** none directly; renders `cargo_entries`, `validation_findings`, and `exceptions` data returned by F3.

**Acceptance Criteria:**
1. Submitting a completely empty form succeeds with `201`, opens an exception, and renders 13 findings inline and in the summary.
2. The browser does not block the empty submission (no native constraint-validation bubble appears).
3. A clean entry renders "Entry received and validated" with a case reference and no findings.
4. Each finding's summary item moves focus to its control when activated.
5. `RIV-070` renders on the Transport fieldset, not on an arbitrary single field.
6. Typing `abc12345678` submits `abc12345678`, and that exact string appears in the entry record and audit trail.
7. The whole task — fill, submit, read outcome, open the case — is completable by keyboard alone and announced to a screen reader.
8. The screen contains no file input, no draft save, and no field outside the fourteen.

---
