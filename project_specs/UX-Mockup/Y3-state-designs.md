## Y3: State Designs — cross-screen matrix

The seven states this product must get right, each specified once here and cross-referenced to
its screen chunk. Every one is designed; none is left to a generic fallback.

---

### State 1 — Empty queue

**Screen:** Review queue (`/queue`) · **Stories:** US-8.3, US-8.1 · **Component:** F2 `Empty`

```
┌────────────────────────────────────────────────────────────────────────┐
│  h1  Review queue                                                      │
│  Open exceptions, oldest first by receipt.                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  h2  No open exceptions                                          │  │
│  │  Every exception has been decided. Create a cargo entry to start │  │
│  │  a new case.                                                     │  │
│  │  [ New cargo entry ]                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Not an error**, and never styled as one.
- **Never suggests a filter is hiding results** — there is no filter (US-8.5).
- **No empty table skeleton** and no zero-row table with headers.
- Offers exactly one route onward, which matters because there is no seeded dataset: an empty
  queue is the *normal starting state* of every demonstration (PRD §10 #7, R-9).
- Focus stays on the `h1`; polite announcement "No open exceptions."

---

### State 2 — Validation failure on the entry form (exception opened on receipt)

**Screen:** Cargo entry form · **Stories:** US-6.3, US-6.4, US-4.1, US-4.2, US-5.1

This is a **`201` success with a business outcome**, not an error. It is presented in a
`usa-summary-box`, never `usa-alert--error` (FR-6.8).

```
┌─ usa-summary-box ──────────────────────────────────────────────────────┐
│ h2  Entry received. Exception opened.                    tabindex="-1" │
│ Case CE-2026-000137                                                    │
│ This entry did not satisfy 2 required-information rules when it was    │
│ received.                                                              │
│   1. Enter the port of entry code.          Port of entry code RIV-030 │
│   2. Describe the goods in at least 10 characters.                     │
│                                             Goods description  RIV-091 │
│ [ Open case CE-2026-000137 ]  Go to review queue   Create another entry│
└────────────────────────────────────────────────────────────────────────┘
  + each finding also rendered inline on its field, aria-invalid="true",
    bound by aria-describedby; RIV-070/073 render on the Transport fieldset
  + the submitted values remain readable as a read-only definition list
```

- Findings rendered **verbatim, in server order** (ascending rule id), consumed unchanged by
  the panel, the summary and the inline messages (US-4.2).
- Focus → panel `h2`; polite: "Entry received. 2 required-information problems. Exception
  opened as case CE-2026-000137."
- Rule identifiers appear only as supplementary small text, never as the message itself.
- Distinguished in words from the other two outcomes — *validated clean* and *submission failed
  (nothing saved)* — so the specialist never has to infer which occurred.

---

### State 3 — AI recommendation pending

**Screen:** Case detail § AI recommendation · **Stories:** US-10.5, US-9.1

```
══ h2  AI recommendation ══════════════════════════════════════════════════
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ◐ Generating an AI recommendation…      aria-busy="true" on THIS      │
 │                                          region only                  │
 └──────────────────────────────────────────────────────────────────────┘
 Polling every 3 s, for at most 60 s.  Navigation stays available.
 ▼ § Your decision below is already usable — the decision path does not
   depend on a recommendation existing.
```

- Progress is a **live-region status**, not a bare spinner: polite "Generating an AI
  recommendation." announced once.
- `aria-busy` is scoped to the recommendation region, **never** to `main`.
- Polling never disables the decision controls, never blocks navigation, and **never moves
  focus** (US-10.5, FR-10.7).
- On arrival: the region updates in place and announces "An AI recommendation is now
  available."; at 60 s without a result it becomes State 4 with the copy "No AI recommendation
  is available yet."

---

### State 4 — AI recommendation unavailable (degraded; the specialist must still decide)

**Screen:** Case detail § AI recommendation + Decision region · **Stories:** US-10.6, US-9.4,
US-11.3 · **Component:** F2 `Degraded` — **not** `ErrorState`

```
══ h2  AI recommendation ══════════════════════════════════════════════════
 ┌─ usa-summary-box ────────────────────────────────────────────────────┐
 │ h3  No AI recommendation available                                   │
 │ The AI service did not respond in time.                              │
 │ You can still resolve or reject this case. Your decision and reason  │
 │ will be recorded as usual.                                           │
 │ (no Retry · no Regenerate · no "check again" control)                │
 └──────────────────────────────────────────────────────────────────────┘

══ h2  Your decision ══════════════════════════════════════════════════════
 [ Resolve directly ]   [ Reject ]
 There is no AI recommendation to approve.
 ↑ "Approve" is absent from the DOM, not disabled; the control set comes
   from the server's permitted_decisions.
```

- **Nothing failed from the specialist's point of view**, so the copy states a *condition of
  this case* and points at the way forward. Framing it as "pending" or as an error would invite
  parking the case in a side list (JRN-01.6).
- Cause strings are mapped per `failure_reason`; a raw provider error or stack trace is never
  shown (`Flow-05-degraded-ai.md` lists the seven mappings).
- "Resolve directly" opens the same edit form pre-populated from the **submitted entry** values,
  badged "Specialist-entered"; reason enforcement is identical to any other case.
- The audit trail records the absence as absence: one `RECOMMENDATION_UNAVAILABLE` event
  attributed to AI, with no value rows and no null-origin value (US-9.4, SM-3).

---

### State 5 — Already decided / conflict

**Screen:** Decision region · **Stories:** US-12.6, US-11.6, US-10.7 · **Components:**
`usa-alert--info`

```
┌─ usa-alert--info ──────────────────────────────────────────────────────┐
│ This case was already resolved by A. Rivera on 11 September 2026.     │
└────────────────────────────────────────────────────────────────────────┘
  → the action chooser and all forms are REMOVED FROM THE DOM
  → the case is re-fetched and re-rendered in its closed, read-only form
  → assertive announcement
  → "This case is closed. The decision below is final and cannot be changed."
```

- **Never presented as the specialist's error** — it is information about the record, typically
  caused by a second tab or a stale screen (FR-12.12).
- Related conflicts, same pattern:
  - `409 RECOMMENDATION_MISMATCH` → *"The recommendation changed. Review it again before
    deciding."* The stale pre-submission summary is **discarded, not re-posted**.
  - `409 RECOMMENDATION_NOT_AVAILABLE` → *"There is no AI recommendation to approve. Edit and
    approve, or reject."* The chooser re-renders without Approve.
  - `409 IDEMPOTENCY_KEY_REUSED` → advise reloading the case to see what was recorded.
- A closed case renders **no** decision control at all — not a disabled one, because a disabled
  control implies a capability that does not exist (US-12.7).
- There is no reopen, undo, amend or "decide again" affordance anywhere.

---

### State 6 — Submission error (nothing was saved)

**Screens:** Cargo entry form, Decision region · **Stories:** US-6.5, US-12.6, US-3.1

```
┌─ usa-alert--error  role="alert"  tabindex="-1"  ← RECEIVES FOCUS ──────┐
│ There is 1 problem with your submission                                │
│  • The entry could not be received. Nothing was saved. Try again.      │
│  [ Try again ]                                                         │
└────────────────────────────────────────────────────────────────────────┘
  → every typed value is preserved
  → assertive announcement
```

| Case | Copy | Behaviour |
|---|---|---|
| `500 RECEIPT_FAILED` | "The entry could not be received. Nothing was saved. Try again." | Atomic rollback means nothing partial exists; "Try again" re-submits the unchanged form |
| `500 DECISION_FAILED` | "The decision could not be recorded. Nothing was saved. Try again." | The case remains `OPEN`; all input preserved |
| `409 ENTRY_NUMBER_DUPLICATE` | "Entry number {n} already exists on case {ref}." | Summary carries a **link to the existing case**; inline error on `entry_number`; nothing persisted |
| `422 REQUEST_MALFORMED` / `REASON_REQUIRED` / `RESOLUTION_VALUES_INCOMPLETE` | The catalogue message, per field | Rendered in the summary **and** inline; input preserved |
| Network failure / unknown outcome | Entry: "We could not confirm whether this entry was received. Check the review queue before submitting it again." Decision: "Reload the case to see whether your decision was recorded." | **No automatic retry** — receipt is not idempotent, and a decision must not be blindly re-sent |
| `401` session expired | "Your session expired. Sign in again to continue." | Redirect to sign-in; input is **not** silently resubmitted after re-authentication |

Common to all: the error summary takes focus, states what happened **and what to do**, never
shows a stack trace or raw code as its only content, and never loses typing.

---

### State 7 — Success confirmation

**Screens:** Cargo entry form (receipt), Decision region (decision) · **Stories:** US-6.3,
US-12.5, US-4.4

```
┌─ usa-summary-box ──────────────────────────────────────────────────────┐
│ h2  Entry received and validated.                        tabindex="-1" │
│ Case CE-2026-000142                                                    │
│ No exception was opened — there is nothing to review for this entry.   │
│ [ Create another entry ]   Go to review queue                          │
└────────────────────────────────────────────────────────────────────────┘

┌─ usa-summary-box ──────────────────────────────────────────────────────┐
│ h3  Decision recorded                                    tabindex="-1" │
│ Recommendation edited and approved                                     │
│ Recorded by A. Rivera · 11 September 2026, 3:04 p.m. EDT               │
│ Case state: Resolved                                                   │
│ Reason given: "Port code corrected to the actual arrival port…"        │
│ Values recorded                                                        │
│   Port of entry code  2709 [👤 Specialist-entered]  was 2704 [⚙ AI]    │
│   Goods description   …    [⚙ AI-suggested]                            │
│ View the audit trail for this case      Back to review queue           │
└────────────────────────────────────────────────────────────────────────┘
```

- **States what was recorded, not merely that something was.** A confirmation that only says
  "Success" leaves the specialist unsure what was stored (JRN-01.2 "Confirm").
- **Built from the server response**, never from an optimistic client assumption, so the values
  and origins shown match the audit trail exactly (US-12.5).
- A clean receipt states its outcome **positively** — "no news" is never the thing the
  specialist has to interpret (US-4.4, P1).
- Focus → the panel heading; polite announcement including the case reference.
- The decision confirmation removes all decision controls from the DOM and offers the two
  onward routes, one of which is the trail — so verification is one action from the work.

---

### State coverage matrix

| State | Sign in | Entry form | Queue | Case detail | Decision | Audit trail |
|---|---|---|---|---|---|---|
| Default / ready | ● | ● | ● | ● | ● | ● |
| Loading | n/a | n/a | ● | ● | n/a | ● |
| Empty | n/a | n/a | **● State 1** | n/a (a case always has content) | n/a | n/a — an empty trail is an **error** |
| Validation failure | ● (generic, one item) | **● State 2** | n/a | n/a | ● (reason / value set) | n/a |
| AI pending | n/a | n/a | n/a | **● State 3** | ● (Approve absent) | n/a |
| AI unavailable | n/a | n/a | n/a | **● State 4** | ● (Resolve directly / Reject) | ● (records the absence) |
| Already decided / closed | n/a | n/a | row absent | ● read-only | **● State 5** | ● includes the decision event |
| Submission error | ● (401/403/429) | **● State 6** | ● (load error) | ● (load error) | **● State 6** | ● (load error, integrity failure) |
| Success confirmation | → lands on `/queue` | **● State 7** | ● (post-decision announcement) | n/a | **● State 7** | ● (refreshed in place) |
| Session expired | ● (info alert) | ● | ● | ● | ● | ● |

---
