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
