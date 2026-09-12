## Screen 6: Per-case audit trail

| | |
|---|---|
| **Route** | `/cases/{caseReference}` § "Audit trail" (anchor `#audit-trail`); deep link `/cases/{caseReference}/audit` scrolls to and focuses the region heading |
| **Feature** | F14 on the F2 shell |
| **Purpose** | Answer "who decided this, what did the AI say, and what did the human change" **in place** — who, what, when, before/after, and AI-vs-human origin — with no export and no second system. |
| **User stories** | US-14.1 … US-14.7, US-13.1, US-13.2, US-13.3, US-0.4, US-2.5 |

---

### Layout (desktop ≥ 1024 px)

```
══ h2  Audit trail ═══════════════════════════════════════  id="audit-trail" ══
 Every state change on this case, oldest first. This record cannot be edited
 or deleted.

 ✔ Record integrity verified — 5 events in sequence.        ← integrity statement

 <ol>
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Cargo entry received                              Event 1 of 5      │
 │  Who           A. Rivera (specialist)                                   │
 │  When          11 September 2026, 2:32 p.m. EDT   <time datetime="…">   │
 │  What changed  — → Received                                             │
 │  <table> Values recorded — cargo entry received                         │
 │   Field              │ Before       │ After        │ Origin of the      │
 │                      │              │              │ recorded value     │
 │   Entry number       │ Not provided │ abc12345678  │ Specialist-entered │
 │                      │              │ [👤]         │                    │
 │   Goods description  │ Not provided │ bolts  [👤]  │ Specialist-entered │
 │   … 9 more fields                                                       │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Validated against required-information rules      Event 2 of 5      │
 │  Who   System, during A. Rivera's submission                            │
 │  When  11 September 2026, 2:32 p.m. EDT                                 │
 │  What changed  Received → Exception opened                              │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Exception opened                                  Event 3 of 5      │
 │  Who   System, during A. Rivera's submission                            │
 │  What changed  — → Open        Values: one row per finding              │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  AI recommendation generated                       Event 4 of 5      │
 │  Who   AI (gpt-4o-2026-05)          [⚙ AI-suggested]                    │
 │        ↑ never a person, never an avatar, never a pronoun               │
 │  When  11 September 2026, 2:33 p.m. EDT                                 │
 │  What changed  Pending → Available                                      │
 │  <table> Values recorded — AI recommendation generated                  │
 │   Port of entry code │ Not provided │ 2704 [⚙]     │ AI-suggested       │
 │   Goods description  │ bolts [👤]   │ Stainless…[⚙]│ AI-suggested       │
 └─────────────────────────────────────────────────────────────────────────┘
 ┌─ <li> ──────────────────────────────────────────────────────────────────┐
 │ h3  Recommendation edited and approved by specialist  Event 5 of 5      │
 │  Who           A. Rivera (specialist)                                   │
 │  When          11 September 2026, 3:04 p.m. EDT                         │
 │  What changed  Open → Resolved                                          │
 │  Reason given                                                           │
 │    "Port code corrected to the actual arrival port per the bill of      │
 │     lading."            ← FULL, verbatim, line breaks preserved,        │
 │                           never truncated, never behind a disclosure    │
 │  <table> Values recorded — recommendation edited and approved           │
 │   Port of entry code │ 2704 [⚙ AI-  │ 2709 [👤      │ Specialist-entered│
 │                      │  suggested]  │  Specialist-  │                   │
 │                      │              │  entered]     │                   │
 │   Goods description  │ Stainless…[⚙]│ Stainless…[⚙] │ AI-suggested      │
 └─────────────────────────────────────────────────────────────────────────┘
 </ol>

 ── deliberately not here ───────────────────────────────────────────────────
 no export · no download · no CSV · no PDF · no print view · no print
 stylesheet · no "copy trail" · no share · no email · no edit · no annotate ·
 no correct · no redact · no delete · no re-order · no collapse-by-type ·
 no pagination · no "show more" · no filter by actor · no cross-case query
```

### Action labels (normative)

| Audit action | Rendered heading | Actor rendering |
|---|---|---|
| `ENTRY_RECEIVED` | Cargo entry received | "{display name} (specialist)" |
| `VALIDATION_COMPLETED` | Validated against required-information rules | "System, during {display name}'s submission" |
| `EXCEPTION_OPENED` | Exception opened | "System, during {display name}'s submission" |
| `RECOMMENDATION_GENERATED` | AI recommendation generated | "AI ({model_id})" |
| `RECOMMENDATION_UNAVAILABLE` | No AI recommendation available | "AI ({model_id or 'not reached'})" |
| `RECOMMENDATION_APPROVED` | Recommendation approved by specialist | "{display name} (specialist)" |
| `RECOMMENDATION_EDITED_AND_APPROVED` | Recommendation edited and approved by specialist | "{display name} (specialist)" |
| `RECOMMENDATION_REJECTED` | Recommendation rejected by specialist | "{display name} (specialist)" |

An **unrecognised** `action_type` renders with its raw action name as the heading rather than
being skipped — nothing in the record may be hidden because the client did not recognise it.

### Information hierarchy

| Priority | Content | Placement |
|---|---|---|
| Primary | The chronological event list, oldest first, complete | The `<ol>`, in ascending `case_sequence` |
| Primary | Actor (and whether it is a human, the system, or the AI) per event | First line of each event |
| Primary | Per-value before → after with an origin badge on **each side** | The value table inside each event |
| Primary | Reason given, in full | Above the value table, on edit and reject events |
| Secondary | Timestamp, state change in words | Event definition list |
| Secondary | Integrity statement | Directly under the section intro |
| Tertiary | Sequence number ("Event 4 of 5") | Small supplementary text in each event heading row |
| **Absent** | Every control listed in the "deliberately not here" block | — |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Default** | Full trail rendered, oldest first | Region `h2` when deep-linked; otherwise not moved | Polite: "Audit trail. 5 events." |
| **Loading** | F2 `Loading` with `aria-busy="true"` on the region; **does not block the rest of the case screen from rendering** | Not moved | Polite: "Loading…" |
| **Refreshed after a decision** | The new decision event appears in place, without a manual reload | Not moved (focus belongs to the confirmation heading) | Polite: "Audit trail updated. 5 events." |
| **Integrity verified** | "✔ Record integrity verified — {n} events in sequence." | — | Included in the load announcement |
| **Integrity failed** | `usa-alert--error`: *"Record integrity check failed at event {sequence}. Report this immediately."* Events still render. **No repair action is offered** | The alert | Assertive |
| **Load failure (5xx / network)** | F2 `ErrorState`: *"We could not load the audit trail."* + "Try again" | Error region | Assertive |
| **Empty trail returned** | `ErrorState`, **not** an empty state — a case always has events, so silence about history is an error (FR-14.17) | Error region | Assertive |
| **Open case** | Renders the events so far (receipt, validation, exception opened, recommendation outcome); no decision event yet | — | Polite |
| **Closed case** | Additionally renders the decision event with its reason and value rows | — | Polite |
| **Case not found (404)** | Handled by the case screen | Screen `h1` | Polite |
| **Session expired** | Redirect to sign-in | Sign-in `h1` | Polite |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| *(none that change anything)* | — | The region contains **no** button, link, menu, form control or keyboard affordance that edits, annotates, corrects, hides, redacts, deletes, re-orders or exports an event. There is nothing to disable, because nothing is rendered (US-14.6, FR-14.7) |
| Deep link `/cases/{ref}/audit` | route | Scrolls to and focuses the region `h2` |
| "View the audit trail for this case" (from the decision confirmation) | in-page link | Moves focus to the region `h2` |

Browser-native text selection and printing are not features here and are **not** enhanced with
a print stylesheet, a "print view" or a "copy trail" control (US-14.6, PRD §10 #5).

### Accessibility (screen-specific)

- **Structure:** `<ol>` of `<li>` events, each with an `<h3>`, so screen-reader users get both
  list position ("4 of 5") and heading navigation across the history (US-14.1, FR-14.13).
- **Reading order within an event:** heading → Who → When → What changed → Reason → Values,
  matching the visual order exactly.
- **Value tables** are real `<table>`s with a `<caption>` naming their event ("Values recorded
  — recommendation edited and approved"), `scope="col"` headers and no ARIA grid roles.
- **Provenance:** the actor line makes AI-vs-human unmistakable, and **each side** of every
  value row carries the shared badge, with the after-value origin also stated in words in the
  Origin column — three redundant carriers (US-14.2, US-2.5).
- **The AI is never rendered as a person:** label "AI ({model_id})" only. Even if the API
  returns a non-null actor name on an `AI` event, the client still renders "AI".
- **Colour independence:** origin, actor type and the integrity result are each carried by text
  plus icon; the integrity failure is an alert with a heading, not a red dot.
- **Completeness:** "Not provided" is rendered wherever a side is null, and a rejection's null
  after-value renders "Not recorded (rejected)" — an empty cell is ambiguous between *no value*
  and *not rendered* (US-14.4).
- **Escaping:** every value, reason and model-generated string is rendered as escaped text; no
  field is interpreted as HTML or Markdown.
- **Live regions:** polite on load and on post-decision refresh; assertive on integrity failure
  and load error. The trail **never polls** and never auto-refreshes except after a decision
  recorded on the same screen (FR-14.12).
- **Timestamps:** absolute local date and time, month in words, zone abbreviation, `<time
  datetime>`; relative phrasing never used; where two events share a displayed minute the
  sequence number disambiguates them.
- **Stable ordering of value rows:** by `field_name`, so repeated views of the same event are
  identical (FR-14 validation).
- **Zoom / reflow:** at 320 px each value table re-flows to stacked per-field blocks — Field,
  Before (with badge), After (with badge), Origin — preserving every badge next to its value.

### Acceptance checkpoints

1. An edit-and-approve case renders events in order: received → validated → exception opened →
   AI recommendation generated → recommendation edited and approved (US-14.1).
2. The decision event shows the deciding specialist, the timestamp, the reason verbatim, and
   per-value before/after with origin on each side (US-14.3, US-14.4).
3. The AI event is attributed to "AI ({model_id})" and never to a person (US-14.2).
4. With colour removed and with a screen reader, every event's and every value's origin is
   still distinguishable (US-2.5, SM-3).
5. The region contains no control that edits, deletes, prints, downloads or exports (US-14.6).
6. "Who decided this, what did the AI say, and what did the human change" is answerable from
   this region alone (US-14.7, SM-2).
7. A tampered database renders the integrity failure alert at the correct sequence (US-14.5).
8. Recording a decision refreshes the trail in place without a manual reload (US-14.1).
