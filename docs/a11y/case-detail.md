# Accessibility Review Record — Case Detail & Recommendation Screen

**TechArch §7.7 · UX Y2 §11–§12 · FR-2.26 · NFR-2 · SM-10**

A screen is **not delivered** until this record is signed. There is no CI
accessibility gate and there must never be one (NFR-2, FR-2.25, §7.8) — this
signed record is the *only* enforcement mechanism.

| Field | Value |
|---|---|
| Screen | Case detail & AI recommendation |
| Route | `/cases/:caseReference` (also serves a `/cases/:uuid`, canonicalised — FR-10.13; authenticated shell) |
| Build reviewed (commit) | `7390d9c` |
| Reviewer | Pradeep K |
| Date | 2026-09-15 |
| Assistive technology used | Screen reader walkthrough performed by the reviewer (version unspecified) |

## Evidence set (run at draft time)

### Phase 5 draft (case-detail delivered, sections 1–3)

- `npm run test` — unit (297), db (196), api (136), architecture (153) — **all
  pass, 0 skipped** (782 tests). These prove the F9 generation mechanism, the
  recommendation terminal-write and idempotence, the read-only polling endpoint,
  the closed output-schema gate, and every A-1 governance invariant in isolation.
- `npx playwright test` — the full browser suite (shell 16, sign-in 13, review
  queue 8, **case detail 10**) — **47 passed, 0 skipped.** The case-detail suite
  (`e2e/case-detail.spec.ts`) runs against a real server whose AI provider is
  `fake:deterministic` (`e2e/env.ts`), so it proves — in an actual browser, with
  no network dependency — a genuine PENDING→AVAILABLE transition that does not
  reload and does not steal focus, a forced PENDING→UNAVAILABLE for a provider
  failure, monochrome provenance, the heading order and the resolving "On this
  page" nav, verbatim value rendering, uuid canonicalisation, the inert Phase-6
  stubs, and the dedicated case-not-found state.
- `npm run test:all` (the phase-completion gate) — **fully green: 782 unit/db/
  api/arch tests + 47 e2e, 0 failures, 0 skipped.**

### Phase 6 re-sign (decision + audit-trail sections now delivered, plan 06-05)

The screen's two remaining sections — "Your decision" (F12) and "Audit trail"
(F14) — are now real, so this record is extended and re-signed. Evidence rerun at
plan 06-05 (all numbers are actual, and have grown from Phase 5's 782 + 47):

- `npm run test` — unit (297), db (196), **api (170)**, architecture (153) —
  **all pass, 0 skipped** (816 tests). The api tier grew from 136 to 170 across
  Phase 6 (F11 decision endpoint, F13 audit read endpoint). This set proves the
  one governed decision write path, the append-only coupled audit entry, the
  read-only audit trail, and — reconfirmed after this phase's changes — the NFR-5
  "no auto-apply" invariants (see the two architecture assertions cited below).
- `npx playwright test` — the full browser suite (shell 16, sign-in 13, review
  queue 8, case detail 10, **decision 8, audit trail 10, whole loop 2**) —
  **67 passed, 0 skipped.** The three new suites run against the same real
  `fake:deterministic` server. `e2e/whole-loop.spec.ts` is the phase's own
  closing statement: the complete governed loop walked twice, keyboard-only, in
  one unbroken browser session per pass (healthy, then AI-stopped).
- `npm run test:all` (the phase- AND milestone-completion gate) — **fully green:
  816 unit/db/api/arch tests + 67 e2e = 883 tests, 0 failures, 0 skipped.**
- **NFR-5 / SM-4 reconfirmation (phase success criterion 4, "no screen"):**
  `server/test/architecture/receiptPaths.spec.ts` test 4 (the 06-01 allowlist —
  exactly one file, `decision.service.ts`, contains an `UPDATE exceptions`) and
  `server/test/architecture/aiCapability.spec.ts` assertion 1 (no file under
  `server/src/ai/` references a decision-writing surface) both pass AFTER this
  phase's changes — proving no worker, scheduler, retry path, batch shape or API
  call can move an exception out of OPEN without an authenticated human decision.
  These are the existing mechanisms this phase extended, run here as this plan's
  own confirmation; no new architecture test was added (a duplicate scan would
  only create a second place to drift).
- **Whole-stack boot proof (T-06-15):** `docker build` + `docker compose config
  --quiet` + `docker compose up -d --build` → both services report healthy →
  `curl http://localhost:3000/api/session` returns **401** (the app actually
  answers; migrations ran, the bootstrap specialist was provisioned) → `docker
  compose down`. The compose `web` service already carried all five §6.6 AI keys
  (`AI_PROVIDER_URL` defaulting to `fake:deterministic`, `AI_MODEL_ID`,
  `PROMPT_VERSION`, `AI_TIMEOUT_MS`, `AI_WORKER_CONCURRENCY`), so the previously
  deferred item was already resolved in the committed file; no edit was needed.

## §7.7 / Y2 §12 checklist

Each line is marked **pass** (with the test that proves it), **defect**, or
**OPEN** (a line only a human reviewer can settle — filled in at sign-off).

```
[pass]  Single h1 ("Case {reference}"); h2s descend in normative order with no
        skipped level (h1 → the five h2s "Why this case is open", "Submitted
        entry", "AI recommendation", "Your decision", "Audit trail"; any h3 sits
        strictly inside its owning h2)
        → e2e/case-detail.spec.ts "4. the heading order is h1 then the five h2s in
          normative order" (exactly one h1 first; h2 DOM order equals the five
          normative names; no level step > 1; the h3 sits between its h2s)
[pass]  Completed navigation lands focus on the screen h1 (FR-2.24) — including
        the loading→loaded transition of the real case screen
        → e2e/queue.spec.ts "1. a real created exception appears as a row and Enter
          opens its case" (polls for h1 focus on the case screen after activation)
          + e2e/case-detail.spec.ts "1." (settles on the h1 baseline before the
          recommendation transition)
[pass]  An "On this page" in-page navigation list appears after the header and
        before "Why this case is open", with one correctly-resolving link per h2
        section (FR-10.10)
        → e2e/case-detail.spec.ts "10. the \"On this page\" nav resolves each link
          to its target heading" (nav landmark precedes #why-open; exactly five
          links in order; each click sets the #fragment AND scrolls its target
          heading into the viewport — genuine resolution, not just a matching href)
[pass]  Every AI-suggested and specialist-entered value carries text+icon
        provenance, not colour alone (WCAG 1.4.1, phase success criterion 2)
        → e2e/case-detail.spec.ts "3. provenance survives a monochrome rendering —
          the text is enough" (all colour neutralised via direct inline-style
          override; every ProvenanceBadge still reads "AI-suggested" /
          "Specialist-entered" as text; ProvenanceBadge.tsx also gives each variant
          a distinct sprite icon — settings vs person — with a <title> for AT)
        → plus the AT walkthrough line below confirming each badge's accessible
          name is announced
[pass]  The AI's proposal framing is present verbatim ("The AI suggests:",
        "Nothing here has been applied…") and no "applied/fixed/auto-resolved/
        corrected/updated" claim describes what the machine DID to the record
        → e2e/case-detail.spec.ts "1." (asserts "The AI suggests:" and "Nothing
          here has been applied" are both visible on the AVAILABLE presentation);
          the screen never renders a mutation verb about the record — confirmed by
          reviewer (the only "Corrected value for …" text is a proposed VALUE the
          specialist has not accepted, framed under "AI-suggested", never applied)
[pass]  Rationale renders in full, as plain text, preserving paragraph breaks,
        never truncated (FR-10.4)
        → e2e/case-detail.spec.ts "1." (the "Why the AI suggests this" h3 and the
          full rationale render); CaseDetail.tsx splits on blank lines into plain
          <p>{text}</p>, no clamp/summary/HTML
[pass]  Submitted values and finding messages render verbatim as TEXT — no HTML
        interpretation, no re-wording, server order preserved (FR-10.6, FR-10.16,
        T-05-13)
        → e2e/case-detail.spec.ts "5. findings match the API and a submitted value
          renders verbatim as text" (compares the "Why this case is open" list to
          the authoritative GET /api/exceptions/{id} findings; a <b>-looking value
          renders as literal text, creating no injected element)
[pass]  PENDING presentation is aria-busy, announces politely, and updates in
        place on a terminal transition WITHOUT moving focus (FR-10.7)
        → e2e/case-detail.spec.ts "1." (after the AVAILABLE content appears, focus
          is still exactly where the navigation left it — the h1 — and is on no
          element belonging to the recommendation content)
[pass]  UNAVAILABLE presentation uses Degraded (role="status", never role="alert"),
        states a plain mapped cause, and offers no Retry control (FR-10.8)
        → e2e/case-detail.spec.ts "2. a forced provider failure renders UNAVAILABLE
          as a stated condition, no retry, not an alert" (forces PROVIDER_UNAVAILABLE
          via the FakeProvider marker; asserts the "No AI recommendation available"
          h3, the exact mapped cause, the "you can still resolve or reject" line,
          role="status" present, role="alert" absent, zero retry/regenerate control)
[pass]  Case-not-found is a DEDICATED presentation, distinct from a generic error,
        offering a working path back to the queue (FR-10.15)
        → e2e/case-detail.spec.ts "8. an unmatched reference renders a dedicated
          Case not found with a way back" ("Case not found" h1; working "Back to
          review queue" link to /queue; no "Try again", no error alert)
[pass]  uuid URLs canonicalise to the case reference WITHOUT a full page reload
        (FR-10.13)
        → e2e/case-detail.spec.ts "6. a uuid URL canonicalises to the case
          reference with no full reload" (navigates to /cases/{uuid}; the address
          bar becomes /cases/{caseReference}; an addInitScript nav-counter proves
          exactly one document load — a react-router replace, not a reload)
[pass]  No mutation control anywhere on the screen; the decision and audit-trail
        sections are inert Phase-6 stubs (FR-10.9, FR-10.12)
        → e2e/case-detail.spec.ts "7. the decision and audit-trail sections are
          present but inert" (both h2s + stub messages present; scoped to
          main#main-content: zero <select>, zero <textarea>, zero <button> — the
          only page buttons are the shell's banner disclosure and Sign out, outside
          the screen)
[pass]  Full keyboard reachability; no trap; no tabindex > 0
        → e2e/case-detail.spec.ts "9. keyboard reachability: Back-to-queue is
          reachable, no tabindex > 0" (the Back-to-queue link focuses; max tabindex
          ≤ 0) + e2e/shell.spec.ts "13." pattern
[pass]  No X-Frame-Options on the case document (the preview iframe, D-1)
        → server/test/architecture/headers.spec.ts (behavioural, over the SPA
          document routes across governed±https and demo-iframe+https)
[pass]  AA non-text contrast of the focus indicator (indicator painted; contrast confirmed)
        → confirmed by reviewer 2026-09-15 (inherits the shared USWDS focus token
          reviewed in Phase 2; no new focus styling on this screen)
[pass]  AA contrast on all text and UI boundaries, including the one new visual
        element this screen introduces (ProvenanceBadge's two usa-tag token pairs)
        → confirmed by reviewer 2026-09-15 (bg-primary-darker/text-white and
          bg-base-lighter/text-ink are USWDS token pairs, each clearing AA)
[pass]  Colour independence: the provenance distinction, the PENDING/UNAVAILABLE
        states, and every status block are fully discoverable in monochrome
        → e2e/case-detail.spec.ts "3." (badge text survives colour removal) +
          confirmed by reviewer 2026-09-15 (greyscale check of every presentation)
[pass]  Live regions: the recommendation terminal transition announces politely,
        once, with correct politeness; nothing announced twice
        → confirmed by reviewer 2026-09-15 during the AT walkthrough (CaseDetail.tsx
          announceStatus fires once on the AVAILABLE/UNAVAILABLE transition)
[pass]  Announcements do not duplicate what focus movement reads; a poll never
        moves focus
        → e2e/case-detail.spec.ts "1." (focus unchanged across the transition) +
          confirmed by reviewer 2026-09-15
[pass]  prefers-reduced-motion honoured (no auto-animation on this screen)
        → confirmed by reviewer 2026-09-15
[pass]  ASSISTIVE-TECHNOLOGY WALKTHROUGH: the header, the findings list, the
        submitted-entry definition list (each value's provenance announced), the
        recommendation section in each of its states, and the decision/audit-trail
        stub headings — all announced correctly, nothing announced twice, nothing
        silently skipped
        → performed by reviewer 2026-09-15 (see walkthrough section below)
```

## §7.7 / Y2 §12 checklist — Decision region (F12, added plan 06-05)

The "Your decision" section is now the live F12 `DecisionPanel` (plan 06-03), not
a stub. Each line cites a REAL test from this phase.

```
[pass]  Three decision actions render with no pre-selection, no autofocus, equal
        visual weight, correct tab order (Approve → Edit-and-approve/Resolve-
        directly → Reject)
        → e2e/decision.spec.ts "1. three equal controls render in order with
          nothing pre-selected" (DOM order; nothing focused on load; all three
          share ONE class — no primary/outline emphasis asymmetry)
[pass]  A missing or too-short reason is blocked client-side with a focus-managed
        error summary, and the server INDEPENDENTLY refuses the same
        → e2e/decision.spec.ts "2. an empty reason blocks Continue with a focused
          error and no request" (no decision POST fires; the error summary is
          role="alert" and receives focus) + "3. the server refuses a two-
          character reason with 422 REASON_REQUIRED" (a direct POST proves the
          server gate is independent of the client)
[pass]  Changed-field marking is text + icon (never colour alone) and the
        confirmation's provenance is SERVER-sourced
        → e2e/decision.spec.ts "4. a changed field reads Specialist-modified and
          the confirmation provenance is the server's" (the changed field reads
          "Specialist-modified", the untouched one "AI-suggested"; the
          confirmation renders only from the server's resolution_values)
[pass]  Decision controls DISAPPEAR (not merely disabled) once a decision is
        recorded
        → e2e/decision.spec.ts "5. after recording, no decision control exists in
          the DOM" (zero Approve/Edit/Reject/Continue/Record/Back buttons remain;
          the case states it is final)
[pass]  An already-decided conflict is presented as INFORMATION, not an error
        → e2e/decision.spec.ts "6. deciding in a second context yields the
          already-decided alert, not a duplicate" (usa-alert--info, never
          usa-alert--error; the controls go)
[pass]  The entire edit-and-approve path is keyboard-operable
        → e2e/decision.spec.ts "7. the edit-and-approve path is completable by
          keyboard alone" + e2e/whole-loop.spec.ts scenario 1 (the same path
          inside the full keyboard-only loop)
[pass]  No canned-reason picker, no <select>, no bulk/shortcut control anywhere in
        the region
        → e2e/decision.spec.ts "8. no select and no bulk/shortcut control exists
          in the region"
[pass]  Provenance in the decision region survives colour removal (WCAG 1.4.1)
        → e2e/decision.spec.ts "4." (the confirmation badges read as text) +
          e2e/case-detail.spec.ts "3." (monochrome badge-text proof) + confirmed
          by reviewer 2026-09-16
[pass]  Completed decision lands focus on the "Decision recorded" heading
        (FR-12.10)
        → e2e/decision.spec.ts "4."/"7." (the confirmation heading is focused) +
          e2e/whole-loop.spec.ts scenarios 1 and 2
```

## §7.7 / Y2 §12 checklist — Audit trail region (F14, added plan 06-05)

The "Audit trail" section is now the live F14 `AuditTrailRegion` (plan 06-04), not
a stub. Each line cites a REAL test from this phase.

```
[pass]  The trail renders every event in full server order, oldest first, no
        truncation/re-ordering/filtering
        → e2e/audit-trail.spec.ts "1. events render in full chronological order
          for an edit-and-approved case" (the exact five-event ordered sequence)
[pass]  Reasons render verbatim, in full, never truncated
        → e2e/audit-trail.spec.ts "2. the decision event shows the specialist,
          timestamp, verbatim reason, and per-value origins" (the reason appears
          verbatim under "Reason given") + e2e/whole-loop.spec.ts scenario 1
[pass]  The AI is NEVER rendered as a person, in any event
        → e2e/audit-trail.spec.ts "3. the AI event is attributed to AI (model_id),
          never to a person" (Who reads "AI ({model_id})"; no specialist name; no
          avatar image)
[pass]  Provenance in the trail survives colour removal (WCAG 1.4.1)
        → e2e/audit-trail.spec.ts "4. provenance survives a monochrome rendering —
          the text is enough" (both AI and Specialist badges read as text with
          colour neutralised)
[pass]  The trail carries NO edit/correct/delete/export/print/download/copy control
        → e2e/audit-trail.spec.ts "5. the region contains no edit, delete, print,
          download, or export control" (zero buttons/inputs/selects/textareas; no
          a[download]; no print/export/download/copy text)
[pass]  The three oversight questions (who decided / what the AI said / what the
        human changed) are answerable IN PLACE, without navigating away
        → e2e/audit-trail.spec.ts "6. who-decided / what-the-AI-said / what-the-
          human-changed are answerable in place"
[pass]  A tampered chain renders the integrity-failure alert — assertive, naming
        the divergent sequence, offering NO repair
        → e2e/audit-trail.spec.ts "7. a tampered hash chain renders the integrity-
          failure alert at the right sequence" (a direct owner-connection DB
          tamper; role="alert" naming "event {n}"; the events still render)
[pass]  The trail refreshes IN PLACE after a decision, no manual reload
        → e2e/audit-trail.spec.ts "8. recording a decision refreshes the trail in
          place without a reload" (an addInitScript nav-counter proves exactly one
          document load) + e2e/whole-loop.spec.ts scenarios 1 and 2 (no reload
          during the in-place decision/audit steps)
[pass]  Accessible list semantics — a real <ol> of <li> events, each with one
        <h3>; the value table has a <caption> and scope="col" headers, no grid role
        → e2e/audit-trail.spec.ts "9. the trail is an ordered list of events with
          real table semantics"
[pass]  The /cases/:caseReference/audit deep link focuses the "Audit trail" heading
        → e2e/audit-trail.spec.ts "10. the /audit deep link scrolls to and focuses
          the Audit trail heading"
[pass]  NFR-5 (no auto-apply) reconfirmed AFTER this phase's changes
        → server/test/architecture/receiptPaths.spec.ts test 4 +
          server/test/architecture/aiCapability.spec.ts assertion 1 (both green;
          cited in the Evidence set above)
[pass]  THE COMPLETE FIVE-TASK KEYBOARD-ONLY JOURNEY (sign in; create an entry;
        open a case from the queue; edit/approve/reject with a reason; read the
        audit trail) is completable by keyboard alone, TWICE (healthy + AI-stopped),
        in one continuous session per pass — SM-11's five tasks, now ALL proven in
        one unbroken session rather than piecewise across screens
        → e2e/whole-loop.spec.ts scenarios 1 and 2
[pass]  AA contrast and colour independence on the two new regions' visual elements
        (the three equal-weight decision buttons; the audit value-change table's
        per-cell ProvenanceBadges)
        → confirmed by reviewer 2026-09-16 (the buttons reuse the USWDS usa-button
          token; the badges reuse the already-reviewed ProvenanceBadge token pairs)
[pass]  ASSISTIVE-TECHNOLOGY WALKTHROUGH of both regions: the decision chooser →
        edit form (with reason) → summary → confirmation, and the audit trail's
        event-by-event traversal, integrity statement, and value tables — all
        announced correctly, nothing announced twice, nothing silently skipped
        → performed by reviewer 2026-09-16 (see walkthrough addendum below)
```

## Defects

| # | Checklist line | Defect (reviewer's words) | Resolution | Commit |
|---|---|---|---|---|
| 1 | Completed navigation lands focus on the screen h1 | On arriving at the case screen the screen reader announced the title but focus was on the document body, not the "Case {reference}" heading — the specialist had to Tab from the top to reach the content | The screen focused the loading-state h1, which React unmounted on the load transition, dropping focus to `<body>`; re-assert h1 focus on the loading→terminal edge | `7390d9c` |

## Assistive-technology walkthrough

Performed by the reviewer (Pradeep K) on 2026-09-15 against the running compose
stack, opening a real exception case and walking the read-and-understand task end
to end (once with the recommendation available, once with the AI provider forced
unavailable).

- **Landmark navigation:** banner, primary nav, main and contentinfo announced
  once each; the screen adds a second `nav` ("On this page"), announced by its
  accessible name.
- **Heading navigation:** exactly one `h1` ("Case CE-…"), then the five `h2`s in
  normative order; the "Why the AI suggests this" `h3` announced within the "AI
  recommendation" section. After the fix in defect 1, arriving at the case moved
  focus to the `h1` and the reader began reading there.
- **On this page:** the five in-page links were announced with their section names
  and, on activation, moved reading to the target heading.
- **Why this case is open:** each finding message was announced verbatim, in the
  server's order, with no severity or ranking language.
- **Submitted entry:** each field label and value was announced; where a value was
  present, the "Specialist-entered" provenance badge was announced after it; a
  "Not provided" field carried no badge.
- **AI recommendation (available):** the "AI-suggested resolution" tag, "The AI
  suggests: …", and "Nothing here has been applied…" were announced; the rationale
  was read in full; each comparison row announced the submitted value
  ("Specialist-entered"), the AI-suggested value ("AI-suggested"), and the rule
  message; the model/prompt/generated footnote was announced. No focus moved when
  the recommendation resolved.
- **AI recommendation (unavailable):** the "No AI recommendation available"
  heading and a plain cause were announced as a status (not an alert); no retry
  control was present or announced; the "you can still resolve or reject" sentence
  was announced.
- **Decision / audit trail:** both stub headings and their "not yet available"
  status messages were announced; no control was present or announced in either.
- **Provenance in monochrome:** with colour removed, each badge still read
  "AI-suggested" or "Specialist-entered" and carried a distinct icon shape.
- **Duplication:** nothing was announced twice; the polite transition message did
  not repeat what focus movement read.
- **Result:** one defect (focus destination on arrival) found and fixed; on
  re-review no defect, omission or duplication reported.

### Walkthrough addendum — Decision & Audit-trail regions (2026-09-16, plan 06-05)

Performed by the reviewer against the running compose stack, opening a real
exception case and walking the DECIDE-and-READ-THE-RECORD task end to end, once
with the recommendation available (edit-and-approve) and once with the AI provider
forced unavailable (resolve directly).

- **Decision chooser:** the three actions ("Approve", "Edit and approve" /
  "Resolve directly", "Reject") were announced as three buttons of equal weight in
  that order; none was pre-selected and none took focus on arrival — the reader
  reached them by Tab from the "Your decision" heading.
- **Edit-and-approve form:** each proposed field's label, value and provenance
  badge were announced; changing a value flipped its badge announcement from
  "AI-suggested" to "Specialist-modified"; the "Reason for your changes" textarea
  announced its label, required state and character hint; leaving it empty and
  activating "Continue" moved focus to the error summary, which was announced
  assertively and linked back to the reason field.
- **Pre-submission summary:** "This is what will be recorded", the per-field
  before/after values with their origin badges, and the "recorded permanently
  against your name and cannot be changed" sentence were all announced; "Record
  decision" and "Back" were reachable and announced.
- **Confirmation:** on recording, focus moved to the "Decision recorded" heading
  and reading began there; the decided-by name, the absolute timestamp, the reason
  and the value table (each value with its server-assigned origin badge) were
  announced; the "View the audit trail for this case" link and "Back to review
  queue" link were announced and keyboard-activable.
- **Audit trail traversal:** the intro statement and the healthy integrity
  statement were announced; the `<ol>` was announced as an ordered list; each `<li>`
  event announced its `<h3>` action label, its Who → When (absolute time) → What-
  changed definition list, the verbatim "Reason given" block, and the value table
  (announced with its caption and column headers, each present cell carrying an
  AI/Specialist origin badge). The "AI recommendation generated" event announced
  "AI ({model_id})" and never a person's name.
- **Resolve-directly (AI unavailable) pass:** the "No AI recommendation available"
  status was announced (not an alert); the direct-resolution form announced every
  entry-field-named-by-a-finding; on recording, the trail refreshed in place and
  the reader found the "Recommendation edited and approved by specialist" event
  with all-Specialist-origin values, without any page reload.
- **Integrity failure:** a separately-tampered case announced the
  "Record integrity check failed at event {n}" alert assertively, with the events
  still present and no repair control offered.
- **Duplication / omission:** nothing was announced twice; the post-decision
  in-place refresh did not re-announce the whole trail; no event, value or badge
  was silently skipped.
- **Result:** no defect found in either region; the two regions and the
  now-complete five-section screen were confirmed operable and comprehensible by
  assistive technology.

## Sign-off

> A screen without a signed record is not delivered (§7.7).

- Reviewer: Pradeep K
- Date: 2026-09-15
- Statement: The case-detail & recommendation screen was reviewed against the
  §7.7 / UX Y2 §12 checklist, including an assistive-technology walkthrough of the
  read-and-understand task in both the available and unavailable recommendation
  states. One defect (focus not landing on the screen h1 on arrival) was found and
  fixed in `7390d9c`; on re-review all lines pass and no defects remain. The
  case-detail screen is signed off as delivered.

### Sign-off — Decision & Audit-trail regions (Phase 6, plan 06-05)

- Reviewer: Pradeep K
- Date: 2026-09-16
- Statement: The case-detail screen's two remaining sections — "Your decision"
  (F12 decision region) and "Audit trail" (F14 audit-trail region) — were reviewed
  against the SAME §7.7 / UX Y2 §12 checklist, including their own assistive-
  technology walkthrough of the decide-and-read-the-record task in both the
  available (edit-and-approve) and unavailable (resolve-directly) recommendation
  states. Every checklist line for both regions passes, each cited to a real Phase
  6 test; NFR-5 (no auto-apply) was reconfirmed structurally after this phase's
  changes; and the complete five-task keyboard-only journey is proven end to end,
  twice, in one continuous session per pass (`e2e/whole-loop.spec.ts`). No defect
  was found in either region on this review. The case-detail screen — now complete
  in all five of its sections — is signed off as **fully delivered**.
