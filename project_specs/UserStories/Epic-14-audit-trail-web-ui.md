## Epic 14: Per-Case Audit Trail Web UI (F14)

The audit trail region inside the case (`#audit-trail`, deep link `/cases/{caseReference}/audit`).
The trail is answered in place — read-only, no export, no second system.

### US-14.1: Read the whole story of a case in the case itself
**As a** cargo specialist, **I want to** read every state change on a case in chronological order without leaving the case screen, **so that** I can confirm what I just did and so that a later reviewer's question can be answered in place rather than by an extract.

**Acceptance Criteria:**
- [ ] Given a case decided by edit-and-approve, when the trail renders, then events appear in ascending `case_sequence` in this order: "Cargo entry received" → "Validated against required-information rules" → "Exception opened" → "AI recommendation generated" → "Recommendation edited and approved by specialist".
- [ ] Given the region, when it renders, then it is headed `<h2>` "Audit trail" with the sentence "Every state change on this case, oldest first. This record cannot be edited or deleted."
- [ ] Given each event, when it renders, then it shows the action in plain language as an `<h3>`, then **Who**, **When**, **What changed** (state before → after in words), the reason where captured, the value change table where value rows exist, and the sequence as supplementary small text ("Event 4 of 7").
- [ ] Given the trail, when it renders, then the client does not re-order, reverse, group, collapse by type, paginate, or truncate it, and no "show more" hides events by default.
- [ ] Given each event, when it is compared with the API response, then no field the API returned is omitted from the rendering.
- [ ] Given an unrecognised `action_type`, when it renders, then the raw action name is shown as the heading rather than the event being skipped — nothing in the record is hidden because the client did not recognise it.
- [ ] Given demonstration load, when the case opens, then the trail renders within 2 seconds and does not block the rest of the case screen from rendering.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.2: See the AI and the humans distinguished on every event and every value
**As a** cargo specialist, **I want to** have each event's actor and each value's origin marked unmistakably, with the AI never rendered as a person, **so that** a machine proposal can never be mistaken for a human act in the record.

**Acceptance Criteria:**
- [ ] Given an `AI`-actor event, when it renders, then the actor reads "AI ({model_id})" — never a person-like name, avatar, or pronoun.
- [ ] Given a specialist event, when it renders, then the actor reads "{display name} (specialist)"; given a `SYSTEM` event, then "System, during {display name}'s submission".
- [ ] Given an event returned with `actor_type = 'AI'` and a non-null actor name, when it renders, then it still renders as "AI" — the client never attributes an AI event to a person.
- [ ] Given each value change row, when it renders, then both the Before and After cells carry the provenance badge for their own side, and an Origin column states the after-value origin in words ("AI-suggested" / "Specialist-entered").
- [ ] Given colour removed and a screen reader in use, when I traverse the trail, then every event's and every value's origin is still distinguishable and announced (SM-3).
- [ ] Given the value change table, when it renders, then values appear in stable order by `field_name`, so repeated views of the same event are identical.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.3: Read the reason I gave, in full
**As a** cargo specialist, **I want to** see my reason rendered verbatim on the edit or rejection event, **so that** the record explains its own justification months after I have forgotten the case.

**Acceptance Criteria:**
- [ ] Given an edited-and-approved or rejected decision event, when it renders, then the reason appears in full under the label "Reason given".
- [ ] Given the reason, when it renders, then it is escaped text with line breaks preserved, and is not truncated, summarised, or collapsed behind a disclosure by default.
- [ ] Given an approval with no reason, when the event renders, then no empty reason block is shown.
- [ ] Given an approval that carried an optional reason, when the event renders, then that reason is shown in the same block.
- [ ] Given a reason containing characters that resemble markup, when it renders, then it is displayed literally and never interpreted as HTML or Markdown.
- [ ] Given all edits and rejections on the deployment, when their events are read, then 100% display a non-empty reason (SM-5).

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.4: See complete before-and-after values with nothing ambiguous
**As a** cargo specialist, **I want to** see both sides of every value change with explicit wording where a side has no value, **so that** I can never mistake "no value" for "not shown".

**Acceptance Criteria:**
- [ ] Given a value row, when it renders, then both the Before and After sides are rendered.
- [ ] Given a null side, when it renders, then it reads "Not provided" — an empty cell is never used.
- [ ] Given a rejection event whose `after_value` is null, when it renders, then the After cell reads "Not recorded (rejected)".
- [ ] Given a value added by the AI for a field I left empty, when it renders, then Before reads "Not provided" and After shows the proposal badged "AI-suggested".
- [ ] Given the value change table, when its markup is inspected, then it is a real `<table>` with a `<caption>` naming its event (for example "Values recorded — recommendation edited and approved"), `scope="col"` headers, and no ARIA grid roles.
- [ ] Given timestamps, when they render, then they are absolute local date and time with the month in words and the time-zone abbreviation, carried by `<time datetime>`; relative phrasing such as "2 hours ago" is never used, and where two events share a displayed minute, the sequence number disambiguates them.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.5: Be told if the record's integrity check fails
**As a** cargo specialist, **I want to** see a statement that the record's sequence and hash chain verified — and a prominent alert if it did not — **so that** I would know immediately if the history behind a case had been tampered with.

**Acceptance Criteria:**
- [ ] Given `chain_verified: true`, when the region renders, then it states "Record integrity verified — {n} events in sequence."
- [ ] Given `chain_verified: false`, when the region renders, then a prominent USWDS error alert states "Record integrity check failed at event {sequence}. Report this immediately.", announced assertively, while the events themselves still render.
- [ ] Given a failed integrity check, when the region renders, then no repair, rewrite, recompute, or acknowledge action is offered anywhere.
- [ ] Given a tampered copy of the database, when the case is opened, then the alert names the correct divergent sequence.
- [ ] Given the verification routine, when it runs, then it is read-only and never repairs, rewrites, or annotates the chain.
- [ ] Given an empty trail returned for a case, when it is handled, then `ErrorState` renders "The audit trail could not be loaded for this case." — because receipt always writes an entry, silence about history is an error rather than a normal empty state.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.6: Find nothing on the trail that can change it or take it away
**As a** cargo specialist, **I want to** have the trail offer no editing, correcting, deleting, or exporting affordance at all, **so that** its read-only, in-place nature is visible in the interface and not merely promised in a document.

**Acceptance Criteria:**
- [ ] Given the region, when its DOM is inspected, then it contains no button, link, menu, form control, or keyboard affordance that edits, annotates, corrects, hides, redacts, deletes, or re-orders an event — there is nothing to disable because nothing is rendered.
- [ ] Given the region, when it is inspected, then it offers no download, CSV, PDF, print-package, copy-all, share, or email action, and no print stylesheet, "print view", or "copy trail" control is added.
- [ ] Given the introductory sentence, when it renders, then it states that the record cannot be edited or deleted.
- [ ] Given an open case, when the trail renders, then it shows the events so far (typically receipt, validation, exception opening, and the recommendation outcome); given a closed case, it additionally shows the decision event.
- [ ] Given I record a decision on the same screen, when the `201` returns, then the trail refreshes in place so my own decision appears without a manual reload, announced as "Audit trail updated. {n} events."; otherwise it does not poll or auto-refresh.
- [ ] Given the direct URL `/cases/{caseReference}/audit`, when I open it, then the region is scrolled to and its heading receives focus; the region is also reachable from the case screen's in-page navigation.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.7: Answer the oversight questions from the case alone
**As a** cargo specialist, **I want to** be able to answer "who decided this, what did the AI say, and what did the human change" from this one region, **so that** a later reviewer gets a complete answer without an export, a query tool, or a second system.

**Acceptance Criteria:**
- [ ] Given a decided case, when I read the trail, then *who decided this* is answerable from the decision event's actor and timestamp.
- [ ] Given the same case, when I read the trail, then *what did the AI say* is answerable from the recommendation event's after values and model identifier, alongside the case's recommendation section.
- [ ] Given the same case, when I read the trail, then *what did the human change* is answerable from the decision event's value rows with per-value origin and before/after, and *why* from the reason (SM-2: 100% traceability from the UI alone).
- [ ] Given any case, when these questions are answered, then no export, query tool, download, or secondary system is used at any point (NFR-7).
- [ ] Given an accessible traversal, when a screen reader reads the trail, then list position is announced for each event ("4 of 7") and each value table is read with its column headers.
- [ ] Given the F2 accessibility checklist, when the case screen is signed off, then the record includes a screen-reader walkthrough traversing every event and confirming AI-versus-human origin is announced for each event and each value (SM-10, SM-11).
- [ ] Given a trail load failure, when it is handled, then `ErrorState` renders "We could not load the audit trail." with "Try again", announced assertively, and a `401` redirects to sign-in.

**Priority:** P0 | **Feature Ref:** F14

---
