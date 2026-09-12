## F10: Exception Case Detail & Recommendation Presentation UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F7, F9 · **PRD trace:** §5.4 F10, §11.1, NFR-2, NFR-4, NFR-9, NFR-10, R-1

**Description:** F10 is the screen where the specialist does the work: the case in full — the submitted entry values, the validation findings that opened the exception, and the AI's recommended action with its plain-language rationale. The AI's contribution is marked as AI-originated visually **and** programmatically wherever it appears, so a reader can tell a machine proposal from a human value on sight and through assistive technology, not only by consulting the audit trail. The screen presents the recommendation as a proposal awaiting a decision and never as an applied outcome, and it hosts the decision controls (F12) and the per-case audit trail (F14).

**Terminology (feature-specific):**
- **Case detail screen:** the route `/cases/{caseReference}` rendering one exception in full.
- **Proposal framing:** the presentation rule that the recommendation is always described as suggested and not yet applied, in the heading, the badge, and the body copy.
- **Comparison row:** the presentation of one proposed value as *submitted value* → *AI-suggested value*, with the rules it addresses.
- **Pending presentation:** the state shown while the recommendation is `PENDING`.
- **Stale pending:** a `PENDING` recommendation older than 60 seconds, presented as no-recommendation-available while remaining technically pending (F9 FR-9.19).
- **Closed-case presentation:** the read-only rendering of a `RESOLVED` or `REJECTED` case.

**Sub-features:**
- Case header with reference, receipt time, and current state
- Submitted entry values and the validation findings that caused the exception
- AI recommended action and rationale, presented as an un-applied proposal
- Explicit AI-origin marking on every AI-proposed value, beyond colour alone
- "No recommendation available" presentation with the decision path unaffected
- Accessible heading structure and reading order across all case sections
- Closed-case read-only presentation showing the recorded decision

---

### Screen: Case Detail — `/cases/{caseReference}`

**Section order** (this reading order is normative — FR-10.10):

1. **Header** — `<h1>` "Case {case_reference}"; below it a definition list: current state (`Open` / `Resolved` / `Rejected` as text), received date and time, submitting specialist, receipt position label ("Received {n}th in order" is **not** shown — see FR-10.14), and a "Back to review queue" link.
2. **Why this case is open** (`<h2>`) — the findings from F4 in server order, as an ordered list; each item shows the plain-language message, the field it concerns, and the rule identifier as supplementary small text. A sentence above states "This entry did not satisfy {n} required-information rules when it was received."
3. **Submitted entry** (`<h2>`) — all fourteen fields as a definition list in the F6 fieldset order, each with its value or "Not provided", and each provided value carrying the "Specialist-entered" provenance badge (F2 FR-2.20).
4. **AI recommendation** (`<h2>`) — one of the four presentations in the table below.
5. **Your decision** (`<h2>`) — the F12 decision region (controls when open; recorded decision when closed).
6. **Audit trail** (`<h2>`) — the F14 region, rendered in place with a `#audit-trail` anchor and reachable directly at `/cases/{caseReference}/audit`.

**Recommendation presentations:**

| Recommendation status | Presentation |
|---|---|
| `AVAILABLE` | "AI-suggested resolution" badge + `recommended_action` + "Why the AI suggests this" rationale block + comparison rows for each proposed value + model metadata footnote |
| `PENDING` (< 60s) | F2 `Loading` with `aria-busy`, text "Generating an AI recommendation…", polite announcement, automatic refresh (FR-10.7) |
| `PENDING` (≥ 60s, stale) | Degraded presentation (below) with copy "No AI recommendation is available yet." |
| `UNAVAILABLE` | F2 `Degraded`: `<h3>` "No AI recommendation available", plain-language cause, and the sentence "You can still resolve or reject this case. Your decision and reason will be recorded as usual." |

---

### Functional Requirements

- **FR-10.1 — Proposal framing everywhere.** Every rendering of recommendation content MUST state that it is suggested and not applied. The section heading MUST be "AI recommendation"; the action MUST be introduced as "The AI suggests:"; the block MUST carry the sentence "Nothing here has been applied. It is recorded only if you decide to approve it." Words implying application ("Resolution applied", "Fixed", "Corrected", "Updated", "Auto-resolved") MUST NOT appear.
- **FR-10.2 — Per-value AI marking.** Every AI-proposed value MUST carry the F2 provenance badge with the text "AI-suggested", a distinct icon, and token colour — never colour alone (NFR-2, NFR-4). The badge text MUST be available to assistive technology, so a screen-reader user hears the provenance of each value.
- **FR-10.3 — Comparison rows.** Each proposed value MUST render as: the field's label; the submitted value (or "Not provided") badged "Specialist-entered" where one exists; the AI-suggested value badged "AI-suggested"; and the plain-language message(s) of the rules it addresses (from `addresses_rule_ids`). A proposal for a field that had no submitted value MUST be presented as an addition, not as a change.
- **FR-10.4 — Rationale presentation.** The rationale MUST be rendered in full, verbatim, as escaped plain text preserving paragraph breaks, under the sub-heading "Why the AI suggests this". It MUST NOT be truncated, summarised, collapsed behind a disclosure by default, or rendered as HTML/Markdown from the model.
- **FR-10.5 — Model metadata.** The model identifier, prompt version, and generation timestamp MUST be shown as a footnote to the recommendation section, so the reader can see which model produced the proposal and when (F9 FR-9.10).
- **FR-10.6 — Findings are the stated basis.** Findings MUST be rendered from the case's validation result in server order (F4 FR-4.8), verbatim, with no client re-wording, re-ordering, merging, or filtering, and with no severity, score, or ranking language (F4 FR-4.9).
- **FR-10.7 — Pending behaviour.** While `PENDING`, the screen MUST poll `GET /api/exceptions/{id}/recommendation` every 3 seconds for at most 60 seconds. Polling MUST NOT block navigation, MUST NOT disable the decision controls, and MUST stop on first terminal status, on stale timeout, or when the specialist leaves the screen. On reaching a terminal status the region MUST update in place and announce politely ("An AI recommendation is now available." / "No AI recommendation is available."). Focus MUST NOT be stolen by the update (NFR-10).
- **FR-10.8 — Degraded presentation is not an error.** An `UNAVAILABLE` recommendation MUST render with the `Degraded` component, not the `ErrorState` component: nothing failed from the specialist's point of view, and the copy MUST state plainly that the case is still decidable. The cause MUST be rendered from a mapped plain-language string per `failure_reason` (F9 FR-9.13) — for example `PROVIDER_TIMEOUT` → "The AI service did not respond in time." — and MUST NOT expose a raw provider error or a stack trace. No "Retry" or "Regenerate" control may be offered (F9 FR-9.14).
- **FR-10.9 — Decision controls always present when open.** For an `OPEN` case the decision region MUST render the F12 controls regardless of recommendation status, with the control set driven by `permitted_decisions` from the API (F7 FR-7.8). A pending or unavailable recommendation MUST NOT hide, disable, or defer the decision path (NFR-9, SM-13).
- **FR-10.10 — Heading structure and reading order.** The screen MUST have exactly one `<h1>` and `<h2>` headings in the normative order above (findings → entry → recommendation → decision → audit), with `<h3>` used only inside those sections. Visual layout MUST match DOM order so keyboard and screen-reader traversal follow the same sequence as the visual reading order. Sections MUST be navigable via a "On this page" set of in-page links placed after the header.
- **FR-10.11 — Closed-case presentation.** For `RESOLVED` or `REJECTED` cases the screen MUST render: the state as text in the header; the findings and submitted entry unchanged; the recommendation exactly as it stood (including `UNAVAILABLE`), still framed as a proposal; and the recorded decision read-only — decision type, deciding specialist, timestamp, reason (for edit and reject), and the resolution values each with their `AI`/`HUMAN` badge and the prior value where changed. The F12 controls MUST NOT be rendered at all (not merely disabled), and the screen MUST state "This case is closed. The decision below is final and cannot be changed."
- **FR-10.12 — No mutation of anything but the decision.** The screen MUST offer no control that edits the entry, edits or deletes a finding, edits the recommendation, reopens a closed case, deletes the case, or exports anything (PRD §10 #5). The only state-changing action reachable from this screen is the F12 decision.
- **FR-10.13 — Deep link and identifier tolerance.** The route MUST accept the case reference (`CE-YYYY-NNNNNN`); a URL bearing an exception uuid MUST resolve equivalently and canonicalise to the case-reference URL via replace-state, so links shared between specialists always work and the address bar always shows the human-readable reference.
- **FR-10.14 — No queue-position or aging language.** The screen MUST NOT display the numeric `receipt_position`, a place-in-queue indicator, a time-open duration, an age, or a due date. Receipt time is shown as an absolute datetime only (PRD §10 #2, #4).
- **FR-10.15 — Not-found and forbidden states.** A `404` MUST render "Case not found" inside the shell with a link to the queue, distinguishing the "this entry passed validation, so it has no exception" case (F7 FR-7.14). A `401` MUST redirect to sign-in (F1 FR-1.8).
- **FR-10.16 — Value escaping.** All model-generated text (`recommended_action`, `rationale`, `proposed_value`) and all specialist-entered text MUST be rendered as escaped text. Markup, scripts, and links in model output MUST NOT be interpreted.
- **FR-10.17 — Performance.** The screen MUST render within 2 seconds under demonstration load from a single `GET /api/exceptions/{idOrReference}` call; recommendation polling is additive and non-blocking (NFR-10).
- **FR-10.18 — Accessibility sign-off.** The screen MUST pass the F2 FR-2.26 checklist, including a screen-reader walkthrough that confirms every AI-suggested value is announced as AI-suggested and every specialist-entered value as specialist-entered, and a verification that provenance remains distinguishable with colour removed (SM-3, SM-10).

---

**Inputs:**
- `GET /api/exceptions/{idOrReference}` response (F7 FR-7.7): exception, entry with per-field origins, validation result with findings, recommendation with proposed values and metadata, decision when present, `permitted_decisions`
- `GET /api/exceptions/{id}/recommendation` polling response while `PENDING`
- Route parameter `caseReference`

**Outputs:**
- A fully rendered case: header, findings, submitted entry, recommendation (in one of four presentations), decision region (F12), audit trail region (F14)
- Provenance badges on every displayed value
- Polite announcements for load, recommendation arrival, and degraded outcome
- Navigation targets: back to queue, in-page section links, audit deep link

**Validation (presentation-level):**
- `permitted_decisions` MUST be treated as authoritative for which controls render; the client MUST NOT infer them from status fields, and the server re-checks on submission regardless (F11 FR-11.6).
- A recommendation with `status = 'AVAILABLE'` but a missing action or rationale MUST render the degraded presentation rather than an empty block, and log a client-side warning.
- A proposed value whose `field_name` does not match a known field MUST be rendered in a "Other suggested values" sub-list rather than dropped, so nothing the record contains is hidden from the reader.
- Timestamps MUST render as absolute local datetimes with month in words and a machine-readable `<time datetime>` value; relative phrasing MUST NOT be used (FR-10.14).

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Case load failure (5xx/network) | `ErrorState` "We could not load this case." + "Try again" | Error region | Assertive |
| Case not found (404) | "Case not found" screen + queue link | Screen `h1` | Polite |
| Entry passed validation (404 variant) | "That entry passed validation, so it has no exception." + queue link | Screen `h1` | Polite |
| Recommendation unavailable | `Degraded` block; decision controls unaffected | Not moved | Polite |
| Recommendation still pending at 60s | Stale-pending degraded copy; polling stops | Not moved | Polite |
| Recommendation poll failure | Degraded block with generic cause; polling stops | Not moved | Polite |
| Session expired | Redirect to sign-in | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `GET /api/exceptions/{idOrReference}` (F7) and `GET /api/exceptions/{id}/recommendation` (F9). Submits nothing itself; the decision request belongs to F12/F11. See `Y1-api.md` §3, §4.

**Schema Surface (this feature):** none directly; renders `exceptions`, `cargo_entries`, `cargo_entry_field_origins`, `validation_findings`, `recommendations`, `recommendation_values`, `decisions`, `decision_values`.

**Acceptance Criteria:**
1. An open case with an available recommendation shows the action, the full rationale, and one comparison row per proposed value, each badged "AI-suggested" with text and icon.
2. With CSS colour overridden to monochrome, AI-vs-specialist origin is still discoverable on every value; a screen reader announces it too.
3. The words "applied", "fixed", or "auto-resolved" appear nowhere on the screen.
4. With the provider stopped, the screen shows "No AI recommendation available" and the decision controls still work end to end.
5. A `PENDING` recommendation appears within 3 seconds of becoming available without the specialist reloading, and without focus moving.
6. Heading order is `h1` → the five `h2`s in the normative order, with no skipped level.
7. A closed case renders no decision controls in the DOM and states that the decision is final.
8. `/cases/{uuid}` canonicalises to `/cases/CE-YYYY-NNNNNN` in the address bar.
9. No control on the screen edits the entry, the findings, or the recommendation, and no export control exists.

---
