## F14: Per-Case Audit Trail Web UI

**Priority:** P0 · **Surface:** **User-facing interface** · **Dependencies:** F2, F10, F13 · **PRD trace:** §5.6 F14, §11.1, NFR-2, NFR-4, NFR-7, SM-2, SM-3, SM-11

**Description:** F14 is the screen — presented within the case — where the specialist reads the complete history of a case in chronological order and gets a direct answer to "who decided this, what did the AI say, and what did the human change" without leaving the application. Each event shows its actor, action, timestamp, before and after values, the reason where one was captured, and an unmistakable AI-versus-human origin marker. It is read-only by construction: the UI exposes no editing, correcting, or deleting affordance, and no export. The trail is answered in place, which is the point.

**Terminology (feature-specific):**
- **Trail:** the ordered list of audit entries for one case, ascending by `case_sequence`.
- **Event:** one audit entry rendered as one item in the trail.
- **Value change row:** one `audit_entry_values` record rendered as *before → after* with origin badges on each side.
- **Integrity statement:** the rendering of `chain_verified` from the audit read.
- **In-place answer:** the design property that oversight questions are answered on this screen without export, query tooling, or a second system (NFR-7).

**Sub-features:**
- Chronological per-case event list with actor, action, timestamp, before/after values
- AI-versus-human origin shown per event and per changed value, beyond colour alone
- Reason text displayed for edits and rejections
- Read-only presentation with no edit, correct, or delete affordance anywhere
- Accessible list semantics and reading order for screen-reader traversal
- Reachable from case detail for both open and closed cases

---

### Presentation: Audit trail region — within `/cases/{caseReference}`, anchor `#audit-trail`, deep link `/cases/{caseReference}/audit`

**Structure:**

1. `<h2>` "Audit trail" with the sentence "Every state change on this case, oldest first. This record cannot be edited or deleted."
2. Integrity statement (FR-14.10).
3. An ordered list (`<ol>`) of events. Each event is an `<li>` containing:
   - `<h3>` with the action in plain language (see the action label table)
   - A definition list: **Who** (actor), **When** (absolute local datetime with `<time datetime>`), **What changed** (state before → after, in words)
   - The reason block, when a reason was captured
   - The value change table, when value rows exist
   - The sequence number as supplementary small text ("Event 4 of 7")

**Action labels (plain language, normative):**

| Action | Label | Actor rendering |
|---|---|---|
| `ENTRY_RECEIVED` | "Cargo entry received" | "{display name} (specialist)" |
| `VALIDATION_COMPLETED` | "Validated against required-information rules" | "System, during {display name}'s submission" |
| `EXCEPTION_OPENED` | "Exception opened" | "System, during {display name}'s submission" |
| `RECOMMENDATION_GENERATED` | "AI recommendation generated" | "AI ({model_id})" |
| `RECOMMENDATION_UNAVAILABLE` | "No AI recommendation available" | "AI ({model_id or 'not reached'})" |
| `RECOMMENDATION_APPROVED` | "Recommendation approved by specialist" | "{display name} (specialist)" |
| `RECOMMENDATION_EDITED_AND_APPROVED` | "Recommendation edited and approved by specialist" | "{display name} (specialist)" |
| `RECOMMENDATION_REJECTED` | "Recommendation rejected by specialist" | "{display name} (specialist)" |

**Value change table** (per event, USWDS table, four columns): Field · Before · After · Origin of the recorded value. Both the Before and After cells carry the provenance badge for their own side; the Origin column states the after-value origin in words ("AI-suggested" / "Specialist-entered").

---

### Functional Requirements

- **FR-14.1 — Chronological order, server order.** Events MUST render in ascending `case_sequence` exactly as returned, oldest first. The client MUST NOT re-order, reverse, group, collapse by type, or paginate the trail. Every event for the case MUST be rendered — no truncation, no "show more" that hides events by default.
- **FR-14.2 — Complete event content.** Each event MUST show actor, action, timestamp, before state, after state, reason (where captured), and every value row. No field of an audit entry that the API returns may be omitted from the rendering.
- **FR-14.3 — Provenance per event and per value.** The actor line MUST make AI-versus-human unmistakable, and each value in a change row MUST carry the F2 provenance badge for its own origin. Provenance MUST be conveyed by text and icon as well as colour, and MUST be exposed to assistive technology (NFR-2, NFR-4, SM-3).
- **FR-14.4 — The AI is never rendered as a person.** An `AI`-actor event MUST be labelled "AI" with the model identifier, never with a person-like name, avatar, or pronoun, so the reader can never mistake a machine proposal for a human action.
- **FR-14.5 — Reason displayed verbatim.** For edited and rejected decisions the reason MUST be rendered in full, escaped, preserving line breaks, under the label "Reason given". It MUST NOT be truncated, summarised, or collapsed behind a disclosure by default (SM-5, R-8).
- **FR-14.6 — Before/after completeness.** A value row MUST render both sides. "Not provided" MUST be shown where a side is null — an empty cell MUST NOT be used, because an empty cell is ambiguous between "no value" and "not rendered". A rejection's `after_value = NULL` MUST render as "Not recorded (rejected)".
- **FR-14.7 — Read-only by construction.** The region MUST contain no button, link, menu, form control, or keyboard affordance that edits, annotates, corrects, hides, redacts, deletes, or re-orders an event. There is nothing to disable, because nothing is rendered. The introductory sentence MUST state that the record cannot be edited or deleted.
- **FR-14.8 — No export.** The region MUST offer no download, CSV, PDF, print-package, copy-all, share, or email action (PRD §10 #5). Browser-native printing and text selection are not features and MUST NOT be enhanced with a print stylesheet, a "print view", or a "copy trail" control.
- **FR-14.9 — Answers the three questions in place.** For any decided case the region MUST make all three answerable without leaving the screen: *who decided this* (the decision event's actor), *what did the AI say* (the recommendation event's after values and the case's recommendation section), and *what did the human change* (the decision event's value rows with per-value origin and before/after) (NFR-7, SM-2).
- **FR-14.10 — Integrity statement.** The region MUST render the `chain_verified` result: when true, "Record integrity verified — {n} events in sequence."; when false, a prominent USWDS error alert "Record integrity check failed at event {sequence}. Report this immediately." announced assertively. The UI MUST NOT offer any repair action.
- **FR-14.11 — Available for open and closed cases.** The trail MUST render for a case in any state. On an open case it shows the events so far (typically receipt, validation, exception opening, and the recommendation outcome); on a closed case it additionally shows the decision event. It MUST be reachable from the case detail screen's in-page navigation and by the direct `/cases/{caseReference}/audit` URL, which scrolls to and focuses the region's heading.
- **FR-14.12 — Live update only on decision.** The trail MUST refresh after a decision is recorded on the same screen, so the specialist immediately sees their own decision in the record. It MUST NOT poll or auto-refresh otherwise.
- **FR-14.13 — Accessible list semantics.** The trail MUST be an `<ol>` of `<li>` events with `<h3>` per event, giving screen-reader users list position ("4 of 7") and heading navigation. Each value change table MUST be a real `<table>` with a `<caption>` naming its event ("Values recorded — recommendation edited and approved"), `scope="col"` headers, and no ARIA grid roles.
- **FR-14.14 — Reading order.** Within an event the DOM order MUST be heading → who → when → state change → reason → values, matching the visual order, so keyboard and screen-reader traversal follow the reading order.
- **FR-14.15 — Timestamps unambiguous.** Timestamps MUST render as absolute local date and time with month in words and the time zone abbreviation, carried by `<time datetime>`. Relative phrasing ("2 hours ago") MUST NOT be used. Where two events share a displayed minute, the sequence number disambiguates their order.
- **FR-14.16 — Escaping.** All values, reasons, and model-generated text MUST be rendered as escaped text; no field may be interpreted as HTML or Markdown.
- **FR-14.17 — Empty and loading states.** A trail can never legitimately be empty (receipt always writes an entry), so an empty result MUST render the `ErrorState` "The audit trail could not be loaded for this case." rather than an empty-state message — silence about history is an error, not a normal state. While loading, the F2 `Loading` component renders with `aria-busy`.
- **FR-14.18 — Performance.** The region MUST render within 2 seconds under demonstration load (NFR-10); it is fetched alongside or immediately after the case detail and MUST NOT block the rest of the case screen from rendering.
- **FR-14.19 — Accessibility sign-off.** The region MUST pass the F2 FR-2.26 checklist as part of the case detail screen, including a screen-reader walkthrough that traverses every event and confirms that AI-versus-human origin is announced for each event and each value (SM-10, SM-11).

---

**Inputs:**
- `GET /api/exceptions/{exceptionId}/audit` response: `entries[]` each with `case_sequence`, `action_type`, `actor_type`, `actor_display_name`, `occurred_at`, `before_state`, `after_state`, `reason`, `model_id` (for AI events), `values[]` (`field_name`, `before_value`, `before_origin`, `after_value`, `after_origin`, `changed`); plus `chain_verified`, `first_divergence_sequence`, `entry_count`
- Route/anchor context from F10

**Outputs:**
- A rendered chronological event list with full per-event detail
- Provenance badges on every actor and every value
- Reason text for edits and rejections
- The integrity statement
- A polite announcement on load ("Audit trail. {n} events.") and after a post-decision refresh ("Audit trail updated. {n} events.")

**Validation (presentation-level):**
- An unknown `action_type` MUST render with the raw action name as the heading rather than being skipped — nothing in the record may be hidden because the client did not recognise it.
- An event with `actor_type = 'AI'` and a non-null actor name MUST still render as "AI"; the client MUST NOT attribute an AI event to a person.
- `chain_verified: false` MUST render the failure alert even if the entries themselves render normally.
- `values[]` MUST render in stable order by `field_name` so repeated views of the same event are identical.

**Error States:**

| Scenario | Presentation | Focus | Announcement |
|---|---|---|---|
| Load failure (5xx/network) | `ErrorState` "We could not load the audit trail." + "Try again" | Error region | Assertive |
| Empty trail returned | `ErrorState` (a case always has events) | Error region | Assertive |
| Integrity check failed | USWDS error alert naming the sequence; events still rendered | Alert | Assertive |
| Case not found (404) | Handled by the case screen (F10 FR-10.15) | Screen `h1` | Polite |
| Session expired (401) | Redirect to sign-in | Sign-in `h1` | Polite |

**API Surface (this feature):** consumes `GET /api/exceptions/{exceptionId}/audit` (F13). No endpoint of its own, and no export endpoint exists. See `Y1-api.md` §4 Audit.

**Schema Surface (this feature):** none directly; renders `audit_entries` and `audit_entry_values` joined to `specialists` for display names.

**Acceptance Criteria:**
1. A case decided by edit-and-approve renders events in order: entry received → validated → exception opened → AI recommendation generated → recommendation edited and approved.
2. The decision event shows the deciding specialist, the timestamp, the reason verbatim, and per-value before/after with `AI` or `HUMAN` origin on each side.
3. The AI event is attributed to "AI ({model_id})" and never to a person.
4. With colour removed and with a screen reader, every event's and every value's origin is still distinguishable.
5. The region contains no control that edits, deletes, prints, downloads, or exports anything.
6. "Who decided this, what did the AI say, and what did the human change" is answerable for a decided case from this region alone, with no other tool (SM-2).
7. A tampered copy of the database renders the integrity failure alert at the correct sequence.
8. Recording a decision refreshes the trail in place so the new event appears without a manual reload.
9. A screen reader announces list position for each event and reads each value table with its column headers.

---
