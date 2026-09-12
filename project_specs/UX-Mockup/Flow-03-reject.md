## Flow 3: Reject the recommendation outright, with a reason

**Journey:** JRN-01.4 · **Trigger:** The specialist judges the proposed action wrong *in kind*,
not merely in detail.
**User stories:** US-12.1, US-12.3, US-12.5, US-12.7, US-11.3, US-11.4, US-14.3, US-10.7
**Screens:** Case detail → Decision (reject form → summary → confirmation) → Audit trail

```
[4. Case detail] read findings, entry, AI action + rationale
        │
        ▼
[5. Decision] Step 1 of 2 — Choose an action
   [Approve]   [Edit and approve]   [Reject]     ← no confirmation nudge back toward Approve
        │ activate "Reject"
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Reject form                                                               │
│  "Rejecting closes this case without adopting the recommendation.         │
│   No resolution values will be recorded."                                 │
│                                                                           │
│  * Reason for rejecting  (required)                                       │
│  [textarea + usa-character-count]                                         │
│  Hint: "At least 10 characters. Explain why the recommendation is not     │
│         being adopted."                                                   │
│  [Continue]                                  [Cancel]                     │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ├── submitted empty ─────────────────────────────────────────────┐
        │                                                                ▼
        │   ┌──────────────────────────────────────────────────────────────────┐
        │   │ usa-alert--error  role="alert"  tabindex="-1"  ← RECEIVES FOCUS   │
        │   │ "There is 1 problem with your submission"                        │
        │   │  • Enter a reason of at least 10 characters for this rejection.  │
        │   │    ↳ link focuses #decision-reason                               │
        │   └──────────────────────────────────────────────────────────────────┘
        │   assertive: "1 problem with your submission"
        │   inline usa-error-message on the textarea, aria-invalid="true"
        │        │
        │        ▼ (write the reason, Continue)
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 2 — Review what will be recorded                                │
│  Decision: Reject the AI-recommended resolution                           │
│  Reason: "The suggested port code conflicts with the vessel's manifest."  │
│  Declined values, for the record:  2704 [⚙ AI-suggested] — not recorded   │
│  "The case will close as Rejected. This cannot be changed afterwards."    │
│  [Record decision]                            [Back]                      │
└───────────────────────────────────────────────────────────────────────────┘
        │ POST … decision_type=REJECT, reason only
        ▼
   201 ──▶ [Confirmation panel]
              h3 "Decision recorded"
              Rejected by A. Rivera · 11 September 2026, 3:04 p.m. EDT
              Reason given: rendered verbatim
              Case state: Rejected
              [View the audit trail for this case]  [Back to review queue]
        │  focus → h3 · controls removed from the DOM · case now read-only
        ▼
   [4. Case detail, closed presentation]
      "This case is closed. The decision below is final and cannot be changed."
      The AI recommendation remains rendered exactly as it stood, still framed as a proposal
        │
        ▼
   [6. Audit trail] event "Recommendation rejected by specialist"
        Who: A. Rivera (specialist) · When: absolute local datetime
        What changed: Open → Rejected
        Reason given: full text
        Values: after_value NULL renders as "Not recorded (rejected)" — never a blank cell
```

### Steps

1. **Read the proposal.** The rationale is plain enough to locate *which part* of the reasoning
   fails, so refusal is reasoned rather than instinctive (US-10.3, JRN-01.4).
2. **Commit to refusing.** Reject sits at equal weight with Approve and Edit. There is **no**
   "Are you sure you want to reject?" nudge and no interstitial that steers back toward
   approval — refusing the machine costs exactly what accepting it costs (US-12.1, P4).
3. **Attempt without a reason.** Required-field indication is visible *before* submission and
   enforcement is server-side *after* it (US-11.4). The failure is handled with the shared
   error-summary pattern — focus moves, the message is announced, nothing is lost — because a
   badly handled required-field failure here is where a specialist learns to write "n/a"
   forever (JRN-01.4 risk of abandonment, R-8).
4. **Write the reason.** Free text, rendered in full in the trail where it is actually read.
5. **Close the case.** The case leaves the queue; the decision controls are **removed from the
   DOM**, replaced by the read-only recorded decision, so the case cannot be decided twice
   (US-12.7, US-10.7, R-11).
6. **Read it back.** The AI's original proposal is preserved verbatim beside the refusal —
   model identity, prompt version and generation timestamp intact — so the record shows a
   refusal *of something still visible* (US-9.3, US-14.3).

### Design notes

- A rejection records **no resolution values**; the summary says so explicitly rather than
  showing an empty value table (FR-12 reject process, Y2 `RESOLUTION_VALUES_NOT_ALLOWED`).
- "Not recorded (rejected)" is used wherever a rejected after-value would otherwise be blank —
  an empty cell is ambiguous between *no value* and *not rendered* (US-14.4, FR-14.6).
- There is deliberately **no undo, no reopen, no amend, and no "request changes"** control
  anywhere on a closed case (US-5.3, FR-10.12).
