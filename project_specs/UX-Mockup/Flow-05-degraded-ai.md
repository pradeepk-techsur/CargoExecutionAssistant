## Flow 5: Decide a case with no recommendation available (degraded AI)

**Journey:** JRN-01.6 · **Trigger:** The AI provider is unavailable, slow, or returned an
unusable response, so no recommendation exists for the exception the specialist just opened.
**User stories:** US-10.5, US-10.6, US-9.1, US-9.4, US-12.1, US-11.4, US-14.2
**Screens:** Review queue → Case detail (pending → degraded) → Decision → Audit trail
**Guarantee proved:** the governed loop completes with the AI stage down (SM-13, NFR-9).

```
[3. Review queue] — unaffected by the AI's state, because exceptions derive from
                    validation, not from recommendation
        │ open the next case
        ▼
[4. Case detail] h2 "AI recommendation"
        │
        ├── status PENDING, < 60 s ────────────────────────────────────────┐
        │   ┌──────────────────────────────────────────────────────────┐   │
        │   │ usa-loading (aria-busy="true" on THIS REGION only)        │   │
        │   │ "Generating an AI recommendation…"                        │   │
        │   │ polite: "Generating an AI recommendation."                │   │
        │   │ Poll GET …/recommendation every 3 s, max 60 s             │   │
        │   │ Navigation stays available. Focus is never stolen.        │   │
        │   │ § Your decision below is ALREADY USABLE.                  │   │
        │   └──────────────────────────────────────────────────────────┘   │
        │              │                          │                        │
        │      becomes AVAILABLE          60 s elapse (stale)              │
        │              │                          │                        │
        │              ▼                          ▼                        │
        │     [in-place update,        ┌─────────────────────────────────┐ │
        │      polite: "An AI          │ same degraded presentation,     │ │
        │      recommendation is       │ copy: "No AI recommendation is  │ │
        │      now available."]        │  available yet."                │ │
        │                              └─────────────────────────────────┘ │
        │                                                                  │
        └── status UNAVAILABLE ────────────────────────────────────────────┘
            ┌────────────────────────────────────────────────────────────┐
            │ usa-summary-box (Degraded) — NOT usa-alert--error          │
            │ h3 "No AI recommendation available"                        │
            │ "The AI service did not respond in time."   ← mapped from  │
            │    failure_reason, plain language, never a raw provider     │
            │    error or stack trace                                    │
            │ "You can still resolve or reject this case. Your decision  │
            │  and reason will be recorded as usual."                    │
            │ No "Retry" or "Regenerate" control exists.                 │
            └────────────────────────────────────────────────────────────┘
        │
        ▼
[5. Decision] — control set driven by the server's permitted_decisions
   ┌────────────────────────────────────────────────────────────────────┐
   │ Step 1 of 2 — Choose an action                                     │
   │ [Resolve directly]        [Reject]                                 │
   │ "There is no AI recommendation to approve."                        │
   │  ← "Approve" is ABSENT FROM THE DOM, not rendered disabled         │
   └────────────────────────────────────────────────────────────────────┘
        │ "Resolve directly" → the same edit form, but pre-populated with the
        │ SUBMITTED ENTRY values (or empty) and badged "Specialist-entered",
        │ with the fields named by the validation findings
        ▼
   Reason required exactly as on any other case — the outage does not lower the bar
        ▼
   Step 2 of 2 → [Record decision] → 201 → Confirmation, every value HUMAN
        │
        ▼
[6. Audit trail]
   1 Cargo entry received                          A. Rivera (specialist)
   2 Validated against required-information rules  System …
   3 Exception opened                              System …
   4 No AI recommendation available                AI (not reached)   ← recorded as absence
   5 Recommendation edited and approved by specialist  A. Rivera
   No phantom AI value rows; no null-origin value; nothing implies a contribution
   that never happened.
```

### Steps

1. **Open the case.** Identical to any other case — the AI's state never removes work from the
   queue, it only narrows what a case contains (US-9.4, NFR-9).
2. **Wait, briefly.** Progress is a **live-region status**, not a bare spinner, and `aria-busy`
   is scoped to the recommendation region so the rest of the screen stays operable. Polling
   never disables the decision controls and never moves focus (US-10.5, FR-10.7).
3. **Read the degraded state.** Stated as a **condition of this case**, not as a temporary
   block and not as a failure. The copy explicitly tells the specialist to carry on, because
   anything that frames the state as "pending" invites parking the case in a side list
   (US-10.6, JRN-01.6 pain point).
4. **Decide without a proposal.** The decision controls are bound to the *case*, never to the
   recommendation. `permitted_decisions` from the server is authoritative; the client never
   infers it (US-7.5, FR-12.3).
5. **Record the reason.** Identical enforcement — there is no second-class record shape in the
   system (US-11.4).
6. **Verify the record.** Absence is recorded *as absence*: one `RECOMMENDATION_UNAVAILABLE`
   event attributed to AI with no value rows (US-9.4, SM-3).

### Design notes

- **`Degraded` ≠ `ErrorState`.** Nothing failed from the specialist's point of view. The
  `ErrorState` component (with "Try again") is reserved for a load the specialist actually
  needs re-attempted (FR-10.8, FR-2.22).
- **No retry, no regenerate.** A silent later retry would change what the case showed at
  decision time and undermine the trail's account of what the AI said when the human decided
  (US-9.4, FR-9.14). The absence is deliberate and stated in copy.
- Each `failure_reason` maps to one fixed plain-language sentence: `PROVIDER_TIMEOUT` → "The AI
  service did not respond in time."; `PROVIDER_UNAVAILABLE` → "The AI service could not be
  reached."; `PROVIDER_RATE_LIMITED` → "The AI service is busy."; `PROVIDER_AUTH_FAILED` /
  `INTERNAL_ERROR` → "The AI service could not be used."; `SCHEMA_INVALID` → "The AI response
  could not be read."; `CONTENT_FILTERED` → "The AI declined to answer for this entry."
- The stale-pending case (≥ 60 s) uses the **same** degraded presentation with different copy,
  so a specialist never faces two different-looking "no suggestion" screens (FR-10.7).
