## Flow 4: Reconstruct a resolved case from its audit trail

**Journey:** JRN-01.5 (and, indirectly, JRN-02.1 — the oversight reviewer has no interface of
his own and is answered by a specialist reading this screen).
**Trigger:** A case decided some time ago is questioned.
**User stories:** US-14.1, US-14.2, US-14.3, US-14.4, US-14.5, US-14.7, US-10.7, US-5.4, US-13.2
**Screens:** (queue, which does not list it) → Case detail, closed → Audit trail

```
[Specialist holds the case reference CE-2026-000137]
        │
        │ the queue lists OPEN cases only — a closed case is NOT browsable there,
        │ and there is no cross-case search box anywhere in the product
        ▼
[4. Case detail  /cases/CE-2026-000137]  ← reached by the retained reference / link
        │
   ┌────────────────────────────────────────────────────────────────────┐
   │ h1 Case CE-2026-000137                                             │
   │ State: Rejected  [■ Closed]        Received: 11 Sep 2026, 2:32 p.m.│
   │ usa-alert--info (slim): "This case is closed. The decision below   │
   │ is final and cannot be changed."                                   │
   │ No editing affordance exists anywhere on this screen.              │
   └────────────────────────────────────────────────────────────────────┘
        │ in-page nav: "Audit trail"   (or direct /cases/CE-2026-000137/audit)
        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ h2 Audit trail                                                           │
│ "Every state change on this case, oldest first. This record cannot be    │
│  edited or deleted."                                                     │
│ ✓ Record integrity verified — 5 events in sequence.                      │
│                                                                          │
│ <ol>                                                                     │
│  1. Cargo entry received                Event 1 of 5                     │
│     Who:  A. Rivera (specialist)  [👤 Specialist-entered]                │
│     When: 11 September 2026, 2:32 p.m. EDT                               │
│     What changed: — → Received                                           │
│     Values: 11 fields, each after_origin Specialist-entered              │
│  2. Validated against required-information rules                         │
│     Who:  System, during A. Rivera's submission                          │
│  3. Exception opened                     Who: System, during …           │
│  4. AI recommendation generated                                          │
│     Who:  AI (gpt-4o-2026-05)     [⚙ AI-suggested]                       │
│     Values: port_of_entry_code  Not provided → 2704  (AI-suggested)      │
│  5. Recommendation edited and approved by specialist                     │
│     Who:  A. Rivera (specialist)                                         │
│     Reason given: full verbatim text, line breaks preserved              │
│     Values table (usa-table):                                            │
│       Field │ Before │ After │ Origin of the recorded value              │
│       port… │ 2704 [⚙ AI] │ 2709 [👤 Specialist] │ Specialist-entered    │
│ </ol>                                                                    │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼
 Four oversight questions answered on this screen alone:
   who decided ........ event 5 actor
   what the AI said ... event 4 after-values + the preserved recommendation section
   what changed ....... event 5 before → after, per value
   why ................ event 5 "Reason given"
```

### Steps

1. **Locate the case.** The queue deliberately shows only open cases and there is no search, so
   the case reference is the durable currency — it appears on the receipt outcome panel, the
   queue row, the case `h1`, the confirmation panel and the trail, unchanged (US-5.4, US-7.2).
2. **Open the closed case.** The closed presentation is unmistakable: state as *text* in the
   header, a slim info alert, decision controls absent from the DOM rather than disabled
   (US-10.7, FR-12.11). A read-only screen that merely looks editable would invite doubt about
   whether the record is still live.
3. **Open the trail.** In-page from the case, or by the `/cases/{ref}/audit` deep link, which
   scrolls to and focuses the region heading (US-14.1, FR-14.11).
4. **Answer *who and when*.** The actor line distinguishes `SPECIALIST`, `SYSTEM` and `AI` as a
   first-class property, not as a naming convention. **The AI is never rendered as a person** —
   no avatar, no human-style name, no pronoun (US-14.2, FR-14.4).
5. **Answer *what changed***. Before and after on every value row, with "Not provided" shown
   wherever a side is null (US-14.4).
6. **Answer *AI versus human***. The provenance indicator on each side of every value row,
   conveyed by text + icon + programmatic name, legible in monochrome and to a screen reader
   (US-14.2, US-2.5, NFR-4).

### Design notes

- **The trail is complete and never paginated, collapsed, grouped or truncated.** No "show
  more" hides events by default; every event the API returns is rendered, including an
  `action_type` the client does not recognise, which renders with its raw action name rather
  than being silently dropped (US-14.1, FR-14.1, FR-14 validation).
- **Integrity statement.** `chain_verified: true` renders "Record integrity verified — {n}
  events in sequence." `false` renders a `usa-alert--error`, announced assertively, naming the
  first divergent sequence, **with no repair action offered** (US-14.5, US-0.4).
- **Nothing on this screen can change it or take it away**: no edit, annotate, correct, hide,
  redact, delete, re-order, download, CSV, PDF, print view, copy-all, share or email control
  exists. Their absence is the design (US-14.6, PRD §10 #5).
- An **empty trail is an error, not an empty state** — receipt always writes an event, so
  silence about history renders `ErrorState`, never "No history yet" (FR-14.17).
