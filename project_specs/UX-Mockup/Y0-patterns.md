## Y0: Interaction Patterns

> ### ⚠ Phase 7 — pending redesign
>
> PRD §5.1 F2 (Phase 7 update) replaces USWDS as the visual system; the new tokens, colours and
> component styling are not yet known to this framework and will be captured during Phase 7
> planning. **The ten patterns below describe interaction behaviour** — focus movement, live-
> region timing and wording, state transitions, keyboard paths, DOM ordering — which is
> unaffected by which visual system renders it and **remains authoritative**. Where a pattern
> names a concrete USWDS colour token, icon, or component as its *current* implementation (most
> visibly Pattern 1's colour-token row below), that reference is Phase-6-era and will be
> superseded by a new token table once the Phase 7 design is imported; it is left in place here
> as the historically accurate record of what shipped through Phase 6, not as a constraint on
> the redesign. See `00-overview.md` for the full note.

Patterns are defined once in the F2 shell and inherited without variation by every screen
(US-2.1 … US-2.6). A screen that re-implements one of these divergently is a defect.

---

### Pattern 1 — Provenance indicator (the product's central pattern)

**When to use:** on every displayed value and every event that has an origin — case detail,
decision region, audit trail. Used identically in all three; never varied (US-2.5, US-10.4,
US-12.2, US-14.2, NFR-4).

**Composition:** `usa-tag` + `usa-icon` (bundled sprite) + visible text label +
`usa-sr-only` text where the visual treatment is compact. A documented USWDS-conformant
composition of stock components; not a bespoke control.

**Never colour alone — four redundant carriers:**

| Carrier | AI-suggested | Specialist-entered | Specialist-modified |
|---|---|---|---|
| **Text label** (always visible) | "AI-suggested" | "Specialist-entered" | "Specialist-modified" |
| **Icon** (`aria-hidden="true"`) | `settings` (gear) | `person` | `edit` (pencil) |
| **Border shape** | dashed 2px | solid 2px | solid 2px + "Changed" marker |
| **Programmatic name** | tag text read as-is by AT | tag text read as-is | tag text read as-is |
| *(colour, token-based, AA)* — **Phase-6 USWDS tokens, pending Phase 7 replacement** | `indigo-60v` bg / white text | `gray-cool-70` bg / white text | `gold-20v` bg / `ink` text |

```
  [ ⚙ AI-suggested ]        dashed border   ← machine proposal, never applied
  [ 👤 Specialist-entered ] solid border    ← typed by a human
  [ ✎ Specialist-modified ] solid border    ← a human changed a machine proposal
       Changed                              ← additional text marker, edit form only
```

**Rules**
1. A value with no value carries **no badge**; the text "Not provided" is shown instead — a
   badge on nothing would be an unattributed attribution.
2. The badge is adjacent to the value it describes, never in a separate legend or key column
   that could be scrolled away from it.
3. In the audit trail, **both** sides of a before → after row carry their own badge, and the
   after-value origin is *also* stated in words in the Origin column.
4. Removing colour (forced monochrome, greyscale printing, low-vision colour filters) must
   leave origin fully discoverable — verified per screen by review (US-2.5 AC).
5. A screen reader receives the same distinction as a sighted reader, on every value.
6. The badge is never interactive — it is not a filter, a link, or a tooltip trigger.

---

### Pattern 2 — Error summary with focus movement

**When to use:** any submission the server rejected, and any client-side check that blocks a
step (US-2.4, US-6.4, US-12.3).

**Behaviour**
1. Render a `usa-alert--error` as the **first child of the form region**, with `role="alert"`
   and `tabindex="-1"`.
2. **Move focus to it.** The assertive region announces "{n} problems with your submission".
3. List one item per error, **in the exact order the server returned them** (for findings,
   ascending rule id) — the client never re-orders, merges, re-words or suppresses.
4. Each item is a link; activating it moves focus to the offending control by `id`. A
   cross-field finding links to the `<fieldset>` that contains both fields.
5. Each affected control renders `usa-error-message` inside its `usa-form-group--error`, bound
   by `aria-describedby`, with `aria-invalid="true"`.
6. Error text states what is wrong **and what to do**, in plain language. A raw error code is
   never the only content; a rule id may appear as supplementary small text.
7. **Every entered value is preserved.** A failed submission never costs typing.

**Where used:** sign-in (one generic item, no field marked invalid), entry form (one item per
validation finding), decision region (reason and value-set errors).

---

### Pattern 3 — Two-step commitment (no single click decides)

**When to use:** the decision path, exclusively (US-12.2, US-12.4, R-1).

```
 Choose an action  ──▶  Complete the form  ──▶  Review what will be recorded  ──▶  Record
   (no default)          (reason required        (origins named per value,         (single
                          on edit/reject)         permanence stated)               primary
                                                  [Back] preserves input           button)
```

- A `usa-step-indicator` makes the steps visible and announces `aria-current="step"`.
- No single activation both chooses and records. Choosing the AI's answer costs exactly the
  same number of deliberate keystrokes as refusing it.
- The commit button is the **only** primary-styled button in the path; the three actions are
  identical outline buttons.
- The `Idempotency-Key` is generated when the summary renders, so an ambiguous network failure
  cannot produce a second decision.

---

### Pattern 4 — Explicit outcome statement (never inference)

**When to use:** after every state-changing submission (US-6.3, US-12.5, P1).

- The outcome is stated **in words** in a `usa-summary-box`: *"Entry received and validated"*,
  *"Entry received. Exception opened."*, *"Decision recorded"*, *"Nothing was saved."*
- Success panels are rendered **from the server response**, never from an optimistic client
  assumption, and restate the *content* recorded — not merely the fact that something was.
- A business outcome (an exception being opened) is **never** styled as an error.
- Focus moves to the outcome heading; the polite region announces the outcome including the
  case reference.
- Every outcome panel offers the onward route, so no branch of the flow dead-ends.

---

### Pattern 5 — Live-region announcements

Two regions exist in the shell **from first paint**, both visually hidden (US-2.4, FR-2.16):

| Region | Used for | Examples |
|---|---|---|
| `aria-live="polite"` (status) | Navigation, load, counts, progress, success, degraded conditions | "Review queue. 11 open exceptions." · "Generating an AI recommendation." · "Decision recorded. Case resolved." · "Case CE-2026-000137 was resolved and is no longer in the queue." |
| `aria-live="assertive"` (alert) | Submission failures and conflicts | "2 problems with your submission" · "This case was already resolved." · "Record integrity check failed at event 3." |

Rules: announcements are short complete sentences; they never duplicate text that focus
movement already reads; background updates announce but never move focus.

---

### Pattern 6 — Shared state components

Provided once by the shell so no screen re-implements them (FR-2.22).

| Component | Semantics | Used by |
|---|---|---|
| `Loading` | USWDS loading indicator, `aria-busy="true"` **scoped to the region being loaded**, rendered only after 300 ms, announced "Loading…" | Queue, case detail, recommendation region, audit region |
| `Empty` | A message plus at most one call to action. **Not an error.** Never an empty table skeleton, never "no results for your filter" | Queue only (the only legitimately empty surface) |
| `ErrorState` | A stated cause plus an optional "Try again". No stack trace, ever | Queue, case, audit, unhandled client exception |
| `Degraded` | **Not an error.** States a condition of the case plus what the specialist can still do | Case detail, recommendation unavailable |
| `ReadOnlyNotice` | States that a record is final and cannot be changed | Closed case, audit trail intro |

The distinction between `ErrorState` and `Degraded` is load-bearing: a missing AI recommendation
is not a failure from the specialist's point of view, and presenting it as one would invite
parking the case instead of deciding it (US-10.6).

---

### Pattern 7 — Deliberate-absence statement

**When to use:** wherever a reviewer would reasonably expect a control that scope excludes
(US-8.5, US-14.6, US-10.8, SM-14).

- Screens do **not** render disabled controls, greyed-out menus, "coming soon" chips, or
  tooltips explaining a missing capability. A disabled control implies a capability that does
  not exist (FR-12.11).
- Where the absence would otherwise read as an oversight, the *copy states the condition*
  positively — "There is no AI recommendation to approve.", "Every exception has been decided.",
  "This case is closed. The decision below is final and cannot be changed."
- This document records each absence and its reason in the relevant screen chunk and in
  `Y4-assumptions.md`.

---

### Pattern 8 — Case reference as the durable identifier

`CE-YYYY-NNNNNN` is the one thing a specialist carries between screens and hands to someone who
asks (US-5.4, JRN-01.5). It appears unchanged on: the receipt outcome panel, the queue row
(as the link), the case `h1`, the address bar (uuid URLs canonicalise to it), the decision
confirmation, and the audit trail header. Every announcement that names a case names it by
this reference. There is no cross-case search, so this identifier is load-bearing.

---

### Pattern 9 — Single-flight submission and unknown outcomes

- Every submit control enters a busy state with a visible text change plus `aria-disabled="true"`;
  a second activation is ignored (never a silently duplicated request).
- **No automatic retry** on an unknown outcome: receipt is not idempotent, and a decision is
  guarded by an idempotency key but must not be re-sent blindly.
- On an unknown outcome the screen says so and directs the specialist to check — the review
  queue after an entry submission, the case after a decision submission (US-6.5, US-12.6).

---

### Pattern 10 — Iframe-safe interaction

The running application is embedded in a preview iframe, so every pattern here is in-page:

- No `window.open`, no popups, no `target="_blank"`, no new browser windows or tabs.
- No dependence on top-level framing, `window.top`, framebusting, or the parent document.
- The only overlay is the `usa-modal` discard confirmation, which is in-document and
  focus-trapped.
- The USWDS banner's "Here's how you know" expands inline.
- No print view, no downloads, no file pickers (which are excluded on scope grounds anyway).
- Focus, scroll and anchor navigation (`#audit-trail`) operate within the embedded document.

---
