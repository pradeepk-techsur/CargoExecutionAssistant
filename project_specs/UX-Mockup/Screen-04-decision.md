## Screen 5: Decision — edit / approve / reject with mandatory reason capture

| | |
|---|---|
| **Route** | `/cases/{caseReference}` § "Your decision" (section 5 of the case detail screen) |
| **Feature** | F12 on the F2 shell |
| **Purpose** | The accountable human act. Three deliberate, equally available actions, nothing pre-selected and nothing auto-applied; a mandatory reason on edit and on reject; what will be recorded shown before it is recorded, and what *was* recorded shown after. |
| **User stories** | US-12.1 … US-12.7, US-11.1, US-11.2, US-11.3, US-11.4, US-11.6, US-11.7, US-0.2 |

---

### Layout — Step 1: choose an action (open case, recommendation `AVAILABLE`)

```
══ h2  Your decision ═════════════════════════════════════════════════════════
 usa-step-indicator --counters
  (1) Choose an action   ← current, aria-current="step"
  (2) Review what will be recorded
  (3) Decision recorded

 Choose one. Nothing is selected for you, and nothing is applied until you
 record a decision.

 ┌───────────────────┐  ┌───────────────────────┐  ┌───────────────────┐
 │     Approve       │  │   Edit and approve    │  │      Reject       │
 └───────────────────┘  └───────────────────────┘  └───────────────────┘
   usa-button--outline     usa-button--outline       usa-button--outline
   ↑ IDENTICAL treatment. No primary styling on any one of them. No radio
     pre-selected. No autofocus. No keyboard shortcut. DOM/tab order is
     Approve → Edit and approve → Reject.

 Approve            Record the AI's suggested values exactly as proposed.
 Edit and approve   Change one or more suggested values, then record them.
                    A reason is required.
 Reject             Close this case without adopting the recommendation.
                    A reason is required.
```

### Layout — Step 1 when no recommendation exists (degraded / pending)

```
 ┌───────────────────────┐  ┌───────────────────┐
 │   Resolve directly    │  │      Reject       │
 └───────────────────────┘  └───────────────────┘
 There is no AI recommendation to approve.
 ↑ "Approve" is ABSENT FROM THE DOM — not rendered disabled. The control set
   comes from the server's `permitted_decisions`; the client never infers it.
```

### Layout — Step 2a: edit form

```
 usa-step-indicator: (1) done · (2) Choose values and reason ← current

 h3  Edit the suggested resolution
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ * Port of entry code                                                    │
 │   [ 2709                     ]        [✎ Specialist-modified]  Changed  │
 │   AI suggested: 2704                                                    │
 ├─────────────────────────────────────────────────────────────────────────┤
 │ * Goods description                                                     │
 │   [ Stainless steel M8 hex bolts, 1200 pieces ]   [⚙ AI-suggested]      │
 │   AI suggested: Stainless steel M8 hex bolts, 1200 pieces               │
 └─────────────────────────────────────────────────────────────────────────┘
   ↑ badge flips live as the value changes; reverting restores [⚙ AI-suggested]
   polite: "Port of entry code changed."  then  "1 field changed."

 * Reason for your changes                        (required)
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ usa-textarea  id="decision-reason"  aria-describedby="reason-hint …"    │
 └─────────────────────────────────────────────────────────────────────────┘
 Hint: At least 10 characters. Explain why you changed the recommendation.
 usa-character-count: 62 of 2000 characters used

 [ Continue ]                                  Cancel
```

### Layout — Step 2b: reject form

```
 h3  Reject the recommendation
 Rejecting closes this case without adopting the recommendation. No
 resolution values will be recorded.

 * Reason for rejecting                           (required)
 [ usa-textarea + usa-character-count ]
 Hint: At least 10 characters. Explain why the recommendation is not being
       adopted.

 [ Continue ]                                  Cancel
```

### Layout — Step 3: pre-submission summary (every path passes through it)

```
 usa-step-indicator: (1) done · (2) done · (3) Review what will be recorded ←

 ┌─ usa-summary-box ───────────────────────────────────────────────────────┐
 │ h3  This is what will be recorded                                       │
 │                                                                         │
 │ Decision       Edit the AI-recommended resolution and approve it        │
 │ Recorded by    A. Rivera                                                │
 │                                                                         │
 │ Port of entry code   AI suggested 2704 → you are recording 2709         │
 │                      will be recorded as  [👤 Specialist-entered]       │
 │ Goods description    unchanged → retains  [⚙ AI-suggested]              │
 │                                                                         │
 │ Reason         "Port code corrected to the actual arrival port per the  │
 │                 bill of lading."        ← exactly as it will be stored  │
 │                                                                         │
 │ This decision is recorded permanently against your name and cannot be   │
 │ changed afterwards.                                                     │
 │                                                                         │
 │ [ Record decision ]                       Back                          │
 │   usa-button (primary — the ONLY primary button in the decision path)   │
 └─────────────────────────────────────────────────────────────────────────┘
```

*Approve* reaches the same summary with the copy *"Approve the AI-recommended resolution"*,
every value badged "AI-suggested", the sentence *"All values will be recorded as AI-suggested,
and this decision will be recorded against your name."*, and a **"Reason (optional)"** field
explicitly labelled optional.

### Layout — Step 4: confirmation (rendered from the server's `201` body)

```
 usa-step-indicator: (1) done · (2) done · (3) Decision recorded ←

 ┌─ usa-summary-box ───────────────────────────────────────────────────────┐
 │ h3  Decision recorded                                    tabindex="-1"  │
 │ Recommendation edited and approved                                      │
 │ Recorded by A. Rivera · 11 September 2026, 3:04 p.m. EDT                │
 │ Case state: Resolved                                                    │
 │                                                                         │
 │ Reason given: "Port code corrected to the actual arrival port per the   │
 │                bill of lading."                                         │
 │                                                                         │
 │ Values recorded                                                         │
 │  Port of entry code  2709  [👤 Specialist-entered]   was 2704 [⚙ AI]    │
 │  Goods description   …     [⚙ AI-suggested]                            │
 │  ↑ origins come from the SERVER RESPONSE, never from a client guess     │
 │                                                                         │
 │ View the audit trail for this case      Back to review queue            │
 └─────────────────────────────────────────────────────────────────────────┘
  focus → h3 · polite: "Decision recorded. Case resolved."
  The action chooser and both forms are REMOVED FROM THE DOM.
```

### Information hierarchy

| Priority | Content | Placement |
|---|---|---|
| Primary | The three actions, at identical weight | Top of the decision region, after the step indicator |
| Primary | The reason field, on edit and reject | Below the values in the edit form; the only field in the reject form |
| Primary | The pre-submission summary — what *will* be recorded, including the origin each value will carry | Replaces the form before submission |
| Primary | The confirmation — what *was* recorded, from the server | Replaces everything after `201` |
| Secondary | Per-field "Changed" marker and the running changed-field count | Inline with each edited field |
| Secondary | The one-line description under each action | Under the button group |
| Secondary | Step indicator | Above the controls |
| Tertiary | Character counter; permanence statement | With the reason field; in the summary |
| **Absent** | Any default selection, "approve all", "apply and next", "decide and open next case", canned-reason dropdown, quick-reason chips, keyboard shortcut, undo, reopen, amend | — |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Open, recommendation `AVAILABLE`** | Three actions, nothing selected | Not moved (no autofocus) | — |
| **Open, `PENDING` / `UNAVAILABLE`** | "Resolve directly" + "Reject"; Approve absent from the DOM with the reason stated in text | Not moved | — |
| **Edit form open** | Values pre-populated from the AI proposal, each badged; required reason field | First form control | Polite: "Edit the suggested resolution." |
| **Direct-resolution form open** (no recommendation) | One input per field named by the findings, pre-populated from the submitted entry (or empty), badged "Specialist-entered" | First form control | Polite |
| **Field changed** | Badge flips to "Specialist-modified" + "Changed" marker (text + icon) | Stays in the field | Polite, at most once per field per change, plus "{n} fields changed" |
| **Reason missing / too short (client)** | Error summary above the form (focus) + inline `usa-error-message` + `aria-invalid="true"`; **no request is sent**; the specialist cannot reach the summary step | Error summary | Assertive: "1 problem with your submission" |
| **Reason rejected by the server (`422 REASON_REQUIRED`)** | Server message rendered in the summary and inline; **every entered value preserved** | Error summary | Assertive |
| **Incomplete value set (`422`)** | Error summary naming the missing fields | Error summary | Assertive |
| **Pre-submission summary** | Read-only restatement + "Record decision" + "Back" (Back preserves all input) | Summary `h3` | Polite: "Review what will be recorded." |
| **Recording** | "Record decision" busy + `aria-disabled="true"`; `Idempotency-Key` (generated when the summary rendered) is sent; **no auto-retry** | Button | Polite: "Recording decision." |
| **Success confirmation (`201`)** | Confirmation panel built from the response; controls removed from the DOM | Confirmation `h3` | Polite: "Decision recorded. Case {resolved/rejected}." |
| **Already decided (`409 EXCEPTION_ALREADY_DECIDED`)** | `usa-alert--info` — *"This case was already resolved by A. Rivera on 11 September 2026."* — controls removed, case refreshed from the server. **Never presented as the specialist's error** | The alert | Assertive |
| **Stale recommendation (`409 RECOMMENDATION_MISMATCH`)** | Alert: *"The recommendation changed. Review it again before deciding."* Stale summary discarded, not re-posted | The alert | Assertive |
| **Approve not permitted (`409 RECOMMENDATION_NOT_AVAILABLE`)** | Alert explaining there is no recommendation to approve; chooser re-rendered without Approve | The alert | Assertive |
| **Submission error (`500 DECISION_FAILED`)** | Error summary: *"The decision could not be recorded. Nothing was saved. Try again."* The case remains `OPEN`; all input preserved | Error summary | Assertive |
| **Unknown outcome (network)** | Alert advising the specialist to reload the case to see whether the decision was recorded; **no silent retry** | The alert | Assertive |
| **Session expired (`401`)** | Redirect to sign-in; input discarded with an explanation; never silently resubmitted after re-authentication | Sign-in `h1` | Polite |
| **Closed case** | Nothing of this region renders except the read-only recorded decision | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| "Approve" / "Edit and approve" / "Reject" | three identical `usa-button--outline` in a `usa-button-group` | One activation opens the corresponding step; **never** records a decision (two-step commitment) |
| Resolution value inputs | `usa-input` / `usa-textarea` (+ `usa-character-count` on long fields) | Pre-populated; live provenance badge; length capped at the structural limits |
| Reason | `usa-textarea` + `usa-character-count` (2000) | Free text only; required ≥ 10 chars after trim on edit/reject; labelled "(optional)" on approve |
| "Continue" | `usa-button--outline` | Applies client checks then renders the summary |
| "Record decision" | `usa-button` **primary** | The single commit action; single-flight; idempotency key |
| "Back" | `usa-button--unstyled` | Returns to the form with all input preserved; sends nothing |
| "Cancel" | `usa-button--unstyled` | Returns to the chooser; if anything was typed or changed, a `usa-modal` confirms the discard (focus-trapped, `Esc`-dismissible, focus returned to Cancel) |
| "View the audit trail for this case" | link to `#audit-trail` | In-page; moves focus to the trail heading |
| "Back to review queue" | link | Returns to `/queue`, re-fetched |

**Deliberately absent, and why:** a pre-selected or default action (a default converts
human-in-the-loop from a guarantee into a formality — R-1, US-12.1); any primary-button
emphasis on Approve alone; a keyboard shortcut for any action; a dropdown of canned reasons or
"quick reason" chips (they produce a record that does not actually explain the decision — R-8,
US-12.3); "approve all" / "apply and next" / "decide and open next case" (nothing may act on
more than the case being read — US-12.7); disabled-but-present controls after a decision (a
disabled control implies a capability that does not exist — FR-12.11); undo, reopen or amend.

### Accessibility (screen-specific)

- **Headings:** the region opens at `h2` "Your decision"; each step uses one `h3` ("Edit the
  suggested resolution", "Reject the recommendation", "This is what will be recorded",
  "Decision recorded"). No level skipped.
- **Step indicator:** `usa-step-indicator` with `aria-current="step"` on the current segment,
  so the two-step commitment is announced, not merely drawn.
- **No default / no autofocus:** focus is not placed on any of the three actions when the
  region renders; the specialist arrives at them by reading or tabbing (US-12.1).
- **Focus management:** after "Continue" → summary `h3`; after a client or server validation
  failure → error summary; after `201` → confirmation `h3`; after "Back" → the first form
  control; after cancelling the discard modal → the Cancel button.
- **Error identification:** error summary is `role="alert"`, `tabindex="-1"`, first child of
  the form region, one item per error in server order, each linking to its control;
  `aria-describedby` binds the inline message and `aria-invalid="true"` marks the control.
- **Live regions:** polite for changed-field marking, step transitions and the recorded
  outcome; assertive for validation failures and conflicts.
- **Changed-field marking is programmatic**: the badge text changes and the "Changed" marker is
  text + icon, exposed to AT — never colour alone (US-12.2, FR-12.6).
- **Keyboard-only path (complete task):** Tab → Approve → Edit and approve → Reject → `Enter` →
  value inputs → reason → "Continue" → (on error: focus lands in the summary, `Enter` on the
  item lands in the textarea) → summary read → "Record decision" → confirmation heading →
  "View the audit trail". Every step announced (US-12.7, SM-11).
- **Modal:** the discard-confirmation `usa-modal` traps focus while open, is dismissible with
  `Esc`, and is rendered in-page — no popup or new window, which the iframe preview forbids.
- **Zoom / reflow:** at 320 px the three actions stack vertically at full width in the same DOM
  order, preserving equal weight; the summary becomes a stacked definition list.

### Acceptance checkpoints

1. Three controls render with no pre-selection, no autofocus and equal visual weight (US-12.1).
2. "Continue" with an empty reason shows an inline error, moves focus to the error summary, and
   sends no request (US-12.3).
3. Changing one of three values marks it "Specialist-modified"; the confirmation shows it
   `HUMAN` with the other two `AI` (US-12.2, US-0.2).
4. The confirmation's values and origins come from the server response and match the audit
   trail exactly (US-12.5).
5. After recording, no decision control exists in the DOM and the case states it is final
   (US-12.7).
6. Deciding the same case in a second tab produces the already-decided alert, not a duplicate
   decision (US-11.6, US-12.6).
7. No "approve all", "apply and next" or canned-reason control exists anywhere (US-12.7).
