## Screen 4: Case detail

| | |
|---|---|
| **Route** | `/cases/{caseReference}` (a URL bearing an exception uuid resolves equivalently and canonicalises to the case-reference URL by replace-state) |
| **Feature** | F10 on the F2 shell; hosts the Decision region (Screen 5) and the Audit trail region (Screen 6) |
| **Purpose** | The screen where the work happens: the exception, the validation failures that opened it, the AI's recommendation and its plain-language rationale — with per-value provenance visible. |
| **User stories** | US-10.1 … US-10.8, US-9.2, US-9.3, US-9.4, US-4.2, US-5.1, US-2.5 |
| **Document title** | `Case CE-2026-000137 — CargoExec` |

---

### Layout — open case with an available recommendation (desktop ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ usa-banner │ ⤷ Skip to main content                                          │
│ CargoExec │ Review queue │ New cargo entry │      A. Rivera   [Sign out]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ <main id="main-content">                                                     │
│  ← Back to review queue                                                      │
│                                                                              │
│  h1  Case CE-2026-000137                                      tabindex="-1"  │
│  ┌────────────────────────┬───────────────────────────────────────────────┐  │
│  │ State                  │ Open        [▲ Open]  ← text + icon, not a dot │  │
│  │ Received               │ 11 September 2026, 2:32 p.m. EDT              │  │
│  │ Submitted by           │ A. Rivera                                     │  │
│  └────────────────────────┴───────────────────────────────────────────────┘  │
│   (no queue position · no "3rd in line" · no days open · no due date)        │
│                                                                              │
│  On this page  (usa-in-page-navigation)                                      │
│   • Why this case is open • Submitted entry • AI recommendation              │
│   • Your decision • Audit trail                                              │
│                                                                              │
│ ══ h2  Why this case is open ═══════════════════════════════════════════════ │
│  This entry did not satisfy 2 required-information rules when it was received│
│  <ol>                                                                        │
│   1. Enter the port of entry code.          Port of entry code   RIV-030     │
│   2. Describe the goods in at least 10 characters.                           │
│                                             Goods description    RIV-091     │
│  </ol>   ← verbatim, server order, no re-wording, no severity or score       │
│                                                                              │
│ ══ h2  Submitted entry ═════════════════════════════════════════════════════ │
│  <dl>  all fourteen fields, F6 fieldset order                                │
│   Entry number            abc12345678        [👤 Specialist-entered]         │
│   Importer of record id   12-3456789         [👤 Specialist-entered]         │
│   Port of entry code      Not provided       (no badge — no value to attribute)│
│   Mode of transport       OCEAN              [👤 Specialist-entered]         │
│   …                                                                          │
│  </dl>                                                                       │
│                                                                              │
│ ══ h2  AI recommendation ═══════════════════════════════════════════════════ │
│  [⚙ AI-suggested resolution]                                                 │
│  The AI suggests:                                                            │
│    "Add the missing port of entry code and expand the goods description."    │
│                                                                              │
│  Nothing here has been applied. It is recorded only if you decide to         │
│  approve it.                                                                 │
│                                                                              │
│  h3  Why the AI suggests this                                                │
│    The entry did not include a port of entry, and the goods description      │
│    "bolts" is too short to identify the commodity. The bill of lading        │
│    number indicates arrival at Los Angeles/Long Beach, whose port code is    │
│    2704. …                     ← FULL text, verbatim, escaped, paragraph      │
│                                  breaks preserved, never collapsed           │
│                                                                              │
│  h3  Suggested values                                                        │
│  ┌──────────────────────┬──────────────────┬───────────────────────────────┐ │
│  │ Field                │ You submitted    │ The AI suggests               │ │
│  ├──────────────────────┼──────────────────┼───────────────────────────────┤ │
│  │ Port of entry code   │ Not provided     │ 2704   [⚙ AI-suggested]       │ │
│  │  Addresses: "Enter the port of entry code."              (RIV-030)      │ │
│  │  ↑ presented as an ADDITION, not a change                               │ │
│  ├──────────────────────┼──────────────────┼───────────────────────────────┤ │
│  │ Goods description    │ bolts            │ Stainless steel M8 hex bolts, │ │
│  │                      │ [👤 Specialist-  │ 1200 pieces [⚙ AI-suggested]  │ │
│  │                      │  entered]        │                               │ │
│  │  Addresses: "Describe the goods in at least 10 characters." (RIV-091)   │ │
│  └──────────────────────┴──────────────────┴───────────────────────────────┘ │
│  Generated by gpt-4o-2026-05 · prompt p-2026.09.1 · 11 Sep 2026, 2:32 p.m.   │
│  ← model metadata footnote                                                   │
│                                                                              │
│ ══ h2  Your decision ═══════════════════════════════════════  [Screen 5]     │
│ ══ h2  Audit trail  ═══════════════════════════════════════   [Screen 6]     │
│                                            id="audit-trail"                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Layout — closed case (read-only)

```
│  h1  Case CE-2026-000137                                                     │
│   State  Rejected   [■ Closed]      Received  11 Sep 2026, 2:32 p.m. EDT    │
│  usa-alert--info (slim):                                                     │
│   "This case is closed. The decision below is final and cannot be changed."  │
│                                                                              │
│  Why this case is open → unchanged      Submitted entry → unchanged          │
│  AI recommendation → rendered EXACTLY as it stood, still framed as a         │
│    proposal (including an UNAVAILABLE recommendation)                        │
│  Your decision → the recorded decision, read-only. THE F12 CONTROLS ARE NOT  │
│    IN THE DOM AT ALL — not disabled, absent.                                 │
│  Audit trail → includes the decision event                                   │
```

### The provenance indicator on this screen (the product's central claim)

Every displayed value carries the shared badge — **text + icon + programmatic name, never
colour alone** (US-2.5, US-10.4, NFR-4). Full specification in `Y0-patterns.md`.

> ⚠ **Phase 7 — pending redesign:** the badge text and the never-colour-alone requirement below
> are the authoritative interaction behaviour and are unaffected by the redesign. The specific
> icon names and border-style cue in the table are Phase-6 USWDS choices, pending replacement
> once the Phase 7 design is imported (see `00-overview.md`).

| Value source | Badge text | Icon | Redundant non-colour cue | Where |
|---|---|---|---|---|
| Typed by the specialist | **Specialist-entered** | `person` | solid border | Submitted-entry list; "You submitted" column |
| Proposed by the AI | **AI-suggested** | `settings` | dashed border | "The AI suggests" column; section badge |
| Changed by the specialist during edit | **Specialist-modified** | `edit` | solid border + "Changed" marker | Decision region (Screen 5) |
| No value provided | *(no badge)* — the text "Not provided" | — | — | Anywhere a side is null |

A screen-reader user hears the provenance as text on every value. With CSS colour forced to
monochrome, origin remains discoverable on every value, because the label and the icon carry it.

### Information hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | The validation findings — *why this case is open* | First `h2`, before anything else | The stated basis of the exception is what the specialist actually reasons from, and it is the one thing that survives every outage (US-10.1) |
| Primary | The AI's recommended action + full rationale + per-value comparison | Third `h2` | The thing being judged, with its explanation on the same screen (US-10.3) |
| Primary | Provenance badge on every value | Inline with each value | The central value proposition (US-10.4) |
| Primary | The decision region | Fourth `h2` | The purpose of the screen |
| Secondary | The submitted entry, all fourteen fields | Second `h2` | Context for the findings; read before judging the proposal (US-10.2) |
| Secondary | Case state, received time, submitting specialist | Header definition list | Orientation |
| Secondary | Audit trail region | Fifth `h2` | Verification, one action from the work (US-14.1) |
| Tertiary | Rule identifiers; model id / prompt version / generation timestamp | Small supplementary text | Traceable but never competing with the plain-language message (US-9.3) |
| Tertiary | "On this page" links; "Back to review queue" | After the header | Navigation within a long screen |
| **Absent** | Receipt position, place-in-queue, time open, age, due date, SLA, severity, score, confidence percentage, "similar cases", export | — | Excluded by PROJECT.md; a confidence number would invite deference to the machine (US-10.8, FR-10.14) |

### States

| State | Appearance | Focus | Announcement |
|---|---|---|---|
| **Default — open, recommendation `AVAILABLE`** | All five sections; decision controls rendered | `h1` on arrival | Polite: "Case CE-2026-000137." |
| **Loading** | F2 `Loading`, `aria-busy="true"` on `main` (after 300 ms) | Unchanged | Polite: "Loading…" |
| **AI recommendation pending (< 60 s)** | Recommendation section only: `usa-loading` + *"Generating an AI recommendation…"*; `aria-busy` scoped to **that region**; polls every 3 s for at most 60 s; **the decision region below is fully usable throughout** | **Not moved** — polling never steals focus | Polite once: "Generating an AI recommendation." Then on arrival: "An AI recommendation is now available." |
| **AI recommendation unavailable (degraded)** | `usa-summary-box` (F2 `Degraded`, **not** `ErrorState`): `h3` "No AI recommendation available" + one mapped plain-language cause + *"You can still resolve or reject this case. Your decision and reason will be recorded as usual."* **No Retry / Regenerate control** | Not moved | Polite: "No AI recommendation is available." |
| **Stale pending (≥ 60 s)** | Same degraded presentation, copy *"No AI recommendation is available yet."*; polling stops | Not moved | Polite |
| **Recommendation poll failure** | Degraded block with a generic cause; polling stops | Not moved | Polite |
| **Malformed recommendation** (`AVAILABLE` but action/rationale missing) | Degraded presentation rather than an empty block; client-side warning logged | Not moved | Polite |
| **Closed / already decided** | Read-only presentation above; controls absent from the DOM; `usa-alert--info` stating finality | `h1` | Polite: "Case CE-2026-000137. Closed." |
| **Case load failure (5xx / network)** | F2 `ErrorState`: *"We could not load this case."* + "Try again" | Error region | Assertive |
| **Case not found (404)** | "Case not found" inside the shell + link to `/queue` | Screen `h1` | Polite |
| **Entry passed validation (404 variant)** | *"That entry passed validation, so it has no exception."* + link to `/queue` — distinguished from a genuine not-found | Screen `h1` | Polite |
| **Session expired** | Redirect to `/sign-in?next={path}` | Sign-in `h1` | Polite |
| **Empty state** | Not applicable — a case always has findings, an entry and a trail | — | — |

### Interactive elements

| Element | USWDS component | Behaviour |
|---|---|---|
| "Back to review queue" | `usa-button--unstyled` link | Returns to `/queue`, re-fetches, focus to that `h1` |
| "On this page" | `usa-in-page-navigation` | Anchor links to the five `h2` sections; keyboard-operable; same destinations as reading down the page |
| Decision controls | see `Screen-04-decision.md` | The **only** state-changing action reachable from this screen |
| Audit trail region | see `Screen-05-audit-trail.md` | Read-only |

**Deliberately absent:** any control that edits the entry, edits or deletes a finding, edits or
regenerates the recommendation, reopens or deletes a closed case, or exports anything; any
"mark as reviewed", "flag", "add note", "assign", "escalate" or "snooze" affordance; any
confidence score or thumbs-up/down feedback control on the AI output (US-10.7, FR-10.12,
PRD §10 #5). The words "applied", "fixed", "corrected", "updated" and "auto-resolved" appear
nowhere on the screen (US-9.2, FR-10.1).

### Accessibility (screen-specific)

- **Headings:** exactly one `h1` "Case {reference}", then the five `h2`s in the **normative
  order** — Why this case is open → Submitted entry → AI recommendation → Your decision →
  Audit trail. `h3` is used only inside those sections ("Why the AI suggests this", "Suggested
  values", "No AI recommendation available", "Decision recorded", one per audit event). No
  level is skipped (US-10.8, FR-10.10).
- **Visual layout matches DOM order**, so keyboard, screen-reader and visual reading order are
  the same sequence.
- **Provenance is programmatic:** each badge exposes its label as text (visually hidden where
  the visual treatment is compact), so an AT user hears "AI-suggested" on every proposed value
  and "Specialist-entered" on every typed value (US-2.5, FR-10.2).
- **Live regions:** polite for load, recommendation arrival, degraded outcome. **Focus is never
  moved by a background update** — the specialist may be mid-sentence in the rationale.
- **`aria-busy` is scoped to the recommendation region**, never to `main`, while polling — the
  rest of the case must stay readable and operable (US-10.5).
- **Keyboard-only path:** Tab through "Back to review queue" → in-page nav → findings list →
  entry list → recommendation → decision controls → audit trail; `H`-key heading navigation
  gives the same six destinations. No trap, no `tabindex > 0`.
- **Escaping:** all model-generated text (`recommended_action`, `rationale`, `proposed_value`)
  and all specialist text is rendered as escaped plain text. Markup, scripts and links in model
  output are never interpreted (FR-10.16) — this also keeps the iframe preview safe.
- **Timestamps:** absolute local datetime, month in words, zone abbreviation, `<time datetime>`;
  relative phrasing never used.
- **Colour independence:** case state is a text label with an icon, never a coloured dot;
  findings are a numbered list with text, not red-flagged rows.
- **Zoom / reflow:** at 320 px the comparison table re-flows to stacked field blocks
  (Field → You submitted → The AI suggests), keeping each badge adjacent to its value.
- **Unknown proposed field:** rendered under "Other suggested values" rather than dropped —
  nothing the record contains is hidden from the reader (FR-10 validation).

### Acceptance checkpoints

1. Every AI-proposed value is badged "AI-suggested" with text and icon; every submitted value
   is badged "Specialist-entered" (US-10.4).
2. With CSS colour overridden to monochrome, origin is still discoverable on every value, and a
   screen reader announces it too (US-2.5, SM-3).
3. The words "applied", "fixed", "auto-resolved" appear nowhere (US-9.2).
4. With the provider stopped, the degraded block renders and the decision controls still work
   end to end (US-10.6, SM-13).
5. Heading order is `h1` → the five `h2`s, no level skipped (US-10.8).
6. A closed case renders no decision controls in the DOM (US-10.7).
7. `/cases/{uuid}` canonicalises to `/cases/CE-2026-000137` in the address bar (US-5.4).
