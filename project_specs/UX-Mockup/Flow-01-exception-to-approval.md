## Flow 1: Work an exception end to end and approve the recommendation

**Journey:** JRN-01.2 — the reference walk of the complete governed loop.
**Trigger:** Specialist types an entry that is missing required information.
**User stories:** US-6.2, US-6.4, US-5.1, US-8.1, US-8.2, US-10.1, US-10.2, US-10.3, US-10.4,
US-12.1, US-12.4, US-12.5, US-14.1, US-11.1
**Screens:** Cargo entry form → Review queue → Case detail → Decision → Audit trail
**Loop stages covered:** all six (receive → validate → except → recommend → human decide → audit)

```
[2. Cargo entry form] ── submit deliberately incomplete entry
        │
        ▼  201  receipt_outcome = EXCEPTION_OPENED
┌──────────────────────────────────────────────────────────────────┐
│ Receipt outcome panel (usa-summary-box)                          │
│  h2 "Entry received. Exception opened."                          │
│  Case CE-2026-000137 · 2 required-information rules not satisfied│
│  Findings listed in server order (ascending rule id)             │
│  [Open case CE-2026-000137]  [Go to review queue] [Create another]│
│  ▼ findings also rendered inline on the fields below             │
└──────────────────────────────────────────────────────────────────┘
        │  focus → panel h2 · polite: "Entry received. 2 required-information
        │  problems. Exception opened as case CE-2026-000137."
        │
        ├──────────────▶ [3. Review queue /queue]
        │                     │ single receipt-ordered table, top row is the new case
        │                     │ Tab to the case-reference link, Enter
        │                     ▼
        └──────────────▶ [4. Case detail /cases/CE-2026-000137]
                              │
        reading order (normative):
        h1 Case CE-2026-000137
          └ h2 Why this case is open        ← the findings, verbatim, server order
          └ h2 Submitted entry              ← every value badged "Specialist-entered"
          └ h2 AI recommendation            ← action + rationale + comparison rows,
          │                                   every proposed value badged "AI-suggested"
          │                                   "Nothing here has been applied."
          └ h2 Your decision                ← [5. Decision]
          └ h2 Audit trail                  ← [6. Audit trail]
                              │
                              ▼
              ┌──────────────────────────────────────────────┐
              │ [5. Decision] Step 1 of 2 — Choose an action │
              │  ( ) nothing pre-selected, no autofocus      │
              │  [Approve] [Edit and approve] [Reject]       │  ← equal weight
              └──────────────────────────────────────────────┘
                              │ activate "Approve"
                              ▼
              ┌──────────────────────────────────────────────┐
              │ Step 2 of 2 — Review what will be recorded   │
              │  usa-summary-box: decision type in words,    │
              │  every value with its "AI-suggested" badge,  │
              │  optional reason field, permanence statement │
              │  [Record decision]        [Back]             │
              └──────────────────────────────────────────────┘
                              │ POST /api/exceptions/{id}/decision
              ┌───────────────┴───────────────┬──────────────────────────┐
           201 │                        409 ALREADY_DECIDED       500 DECISION_FAILED
               ▼                               ▼                          ▼
   [Confirmation panel, built          [usa-alert--info:            [Error summary:
    from the server response]           "already resolved by         "Nothing was saved.
    h3 "Decision recorded"              {name} on {date}",            Try again."
    type · who · when · values +        controls removed,             case still OPEN]
    server-assigned origin badges       case refreshed]
    [View the audit trail] [Back to review queue]
               │  focus → h3 · polite announcement · controls removed from the DOM
               ▼
   [6. Audit trail — refreshed in place]
     1 Cargo entry received                    A. Rivera (specialist)
     2 Validated against required-information rules   System, during A. Rivera's submission
     3 Exception opened                        System, during A. Rivera's submission
     4 AI recommendation generated             AI (gpt-4o-2026-05)
     5 Recommendation approved by specialist   A. Rivera (specialist)
     "Record integrity verified — 5 events in sequence."
               │
               ▼
   [3. Review queue]  polite: "Case CE-2026-000137 was resolved and is no longer in the
                       queue. 4 open exceptions remain."
```

### Steps

1. **Submit a deficient entry.** The browser does not fight the specialist: native constraint
   validation is off, so reality can be recorded as it arrived (US-6.2).
2. **Read the exception receipt.** An opened exception is presented as a **successful receipt
   with a business outcome**, never as an error — the panel is a `usa-summary-box`, not
   `usa-alert--error` (US-6.3, FR-6.8). The named per-rule findings appear here *and* inline on
   the fields, so the basis is stated once and never re-derived (US-6.4).
3. **Enter the queue.** One table, ascending receipt position, no filter, no sort headers, no
   priority badge, no assignment. The visible count doubles as the table caption (US-8.1).
4. **Open the case.** The case-reference cell is a real `<a href>` — middle-click, copy-link
   and screen-reader link navigation all work; the whole `<tr>` is not a JS click target
   (US-8.2, FR-8.5).
5. **Read the case.** Findings first (why it is open), then what was submitted, then what the
   AI suggests — with the rationale on the same screen as the thing it explains, in full, never
   collapsed (US-10.1, US-10.3, FR-10.4).
6. **Decide.** Three equally-presented actions, nothing pre-selected. Choosing does not record:
   step 2 shows exactly what will be recorded before it is recorded (US-12.1, US-12.4).
7. **Confirm.** The confirmation panel is rendered **from the server's `201` body**, never from
   an optimistic client assumption, so what the specialist reads is what was stored (US-12.5).
   The decision controls are removed from the DOM — not disabled (FR-12.11).
8. **Close the loop.** The audit trail refreshes in place so the specialist's own decision
   appears without a reload (US-14.1, FR-14.12).

### Design notes

- **Approve is the lowest-effort path and is therefore made deliberately equal-cost**: same
  button treatment, same DOM order weight, same two-step commitment as Reject (P4, P5, R-1).
- The queue row disappearing after a decision is **explained in a live announcement**, so a
  vanished row never reads as a lost case (US-8.4, FR-8.11).
- Nothing on this path opens a new window, popup or top-level frame — the whole flow is
  in-page navigation inside the shell, which is a hard constraint of the iframe preview.
