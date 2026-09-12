## Flow 2: Disagree in part — edit the resolution and approve it

**Journey:** JRN-01.3 — the journey that makes per-value provenance load-bearing.
**Trigger:** The AI proposes a set of values; the specialist agrees with most of them and
disputes one for a reason the model could not have known.
**User stories:** US-12.2, US-12.3, US-12.4, US-12.5, US-11.2, US-11.4, US-10.4, US-14.2, US-0.2
**Screens:** Case detail → Decision (edit form → summary → confirmation) → Audit trail

```
[4. Case detail] — AI recommendation section
   Comparison rows, one per proposed value:
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Port of entry code                                                   │
   │   Submitted   Not provided                                           │
   │   AI suggests 2704            [⚙ AI-suggested]                       │
   │   Addresses: "Enter the port of entry code."            (RIV-030)    │
   └──────────────────────────────────────────────────────────────────────┘
        │
        ▼
[5. Decision] Step 1 of 2 — Choose an action
   [Approve]  [Edit and approve]  [Reject]      ← equal weight, nothing pre-selected
        │ activate "Edit and approve"
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Edit form (usa-form) — one input per proposed field, pre-populated        │
│                                                                           │
│  Port of entry code            [2709            ]  [✎ Specialist-modified]│
│    AI suggested: 2704                              Changed                │
│  Goods description             [Stainless steel…]  [⚙ AI-suggested]       │
│  Country of origin             [CN              ]  [⚙ AI-suggested]       │
│                                                                           │
│  * Reason for your changes  (required)                                    │
│  [textarea, usa-character-count, min 10 chars, max 2000]                  │
│  Hint: "At least 10 characters. Explain why you changed the recommendation"│
│                                                                           │
│  [Continue]                                   [Cancel]                    │
└───────────────────────────────────────────────────────────────────────────┘
        │ polite: "Port of entry code changed." … "1 field changed."
        │
        ├── reason empty or < 10 chars ──▶ [Error summary takes focus,
        │                                   inline usa-error-message on the textarea,
        │                                   aria-invalid="true", NO request sent]
        │                                          │
        │        ◀─────────────────────────────────┘ (correct and Continue)
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 2 — Review what will be recorded (usa-summary-box)              │
│  Decision: Edit the AI-recommended resolution and approve it              │
│  Port of entry code   AI suggested 2704 → you are recording 2709          │
│                                            will be recorded as HUMAN      │
│  Goods description    unchanged → retains AI origin                       │
│  Country of origin    unchanged → retains AI origin                       │
│  Reason: "Port code corrected to the actual arrival port per the BoL."    │
│  "This decision is recorded permanently against your name and cannot be   │
│   changed afterwards."                                                    │
│  [Record decision]                            [Back]                      │
└───────────────────────────────────────────────────────────────────────────┘
        │ POST … decision_type=EDIT_APPROVE, reason, COMPLETE resolution_values set
        │ Idempotency-Key generated when this summary rendered
        ▼
   201 ──▶ [Confirmation panel, from the server response]
              Port of entry code  2709   [👤 Specialist-entered]  was 2704 [⚙ AI-suggested]
              Goods description   …      [⚙ AI-suggested]
              Country of origin   …      [⚙ AI-suggested]
              [View the audit trail for this case]  [Back to review queue]
        │
        ▼
   [6. Audit trail] event 5 "Recommendation edited and approved by specialist"
        Reason given: rendered in full, verbatim
        Values table:  Field │ Before │ After │ Origin of the recorded value
          port_of_entry_code │ 2704 [⚙ AI-suggested] │ 2709 [👤 Specialist-entered] │ Specialist-entered
          goods_description  │ … [⚙ AI] │ … [⚙ AI] │ AI-suggested
```

### Steps

1. **Open and read.** The proposal is rendered as *individually attributed values*, not as one
   indivisible block, so partial disagreement has somewhere to go (US-10.4, JRN-01.3).
2. **Choose to edit.** "Edit and approve" is exactly as reachable as "Approve" — same control
   type, same tab sequence, one activation (US-12.1, P4).
3. **Change the value.** The field's badge flips from "AI-suggested" to "Specialist-modified"
   **live, in the form**, with a "Changed" marker in text + icon (never colour alone), and the
   running count is announced politely. Reverting to the exact proposed value restores the
   AI badge, using the same trim-then-compare rule the server applies, so the preview can never
   disagree with the record (US-12.2, FR-12.6).
4. **Write the reason.** Free-text `<textarea>` only — **no canned-reason dropdown, no quick
   chips, no default text, no placeholder that could be submitted as-is** (US-12.3, FR-12.5,
   R-8). The payoff is visible: the reason is rendered in full in the audit trail.
5. **Review before commit.** The pre-submission summary is the last cheap moment; it names the
   origin each value *will* carry, so append-only immutability is never experienced as a trap
   (US-12.4).
6. **Commit.** The client submits the **complete** value set with no origin, no changed flag and
   no diff — provenance is computed server-side only (US-12.2, FR-12.7, FR-11.8).
7. **Verify the provenance.** The trail shows `HUMAN` on the one changed field and `AI` on the
   rest, conveyed by text and structure as well as visually (US-14.2, US-0.2, SM-3).

### Design notes

- **Cancel is lossless and non-mutating.** If a reason was typed or a value changed, Cancel
  opens a `usa-modal` confirming the discard; the modal is in-page, focus-trapped, `Esc`-
  dismissible, and returns focus to the Cancel control (FR-12.15). It is the only modal in the
  product.
- A **no-change edit is permitted**: the client never requires that at least one value differ.
  The server records all values retaining `AI` origin with the reason explaining the intent
  (FR-12 validation note).
- On `409 RECOMMENDATION_MISMATCH` the stale summary is discarded, not re-posted, and the case
  is reloaded with "The recommendation changed. Review it again before deciding." (US-12.6).
