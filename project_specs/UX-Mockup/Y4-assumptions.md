## Y4: Design Assumptions, Deliberate Absences, and Traceability

---

### 1. Design assumptions

Every design decision in this document is drawn from the attached specifications. Where a
detail was genuinely unspecified, the option most consistent with USWDS convention and the
governed-decision-loop goal was chosen, and it is recorded here rather than left silent.

| # | Assumption | Where it applies | Why this option |
|---|---|---|---|
| A-1 | **`country_of_origin_code` is placed in the "Goods" fieldset**, as the first field, labelled "Country of origin". | Entry form | F6's layout enumerates four fieldsets totalling thirteen fields while FR-6.1 requires all fourteen and FR-6.2 specifies a hint for `country_of_origin_code`. Origin of goods belongs with the goods, and its rule (`RIV-080/081/082`) is a goods-description neighbour. |
| A-2 | **The three decision actions are rendered as three identical `usa-button--outline` controls**; `usa-button` (primary/filled) is reserved exclusively for the single commit action "Record decision". | Decision region | FR-12.1 forbids Approve being the only primary-styled control. Making all three outline and reserving the filled style for the commit step satisfies "no emphasis asymmetry" while keeping a USWDS-conventional primary action on the page. |
| A-3 | **The decision region uses `usa-step-indicator` (Choose an action → Review what will be recorded → Decision recorded).** | Decision region | FR-12.2 mandates two-step commitment but does not name a component. The step indicator makes the second step *visible and announced* rather than merely implemented, and is the USWDS component for exactly this. |
| A-4 | **The case detail "On this page" links use `usa-in-page-navigation`**, rendered as a side list at desktop and as a plain list above the content below desktop; it follows the `h1` in DOM order. | Case detail | FR-10.10 requires in-page section links after the header; this is the stock USWDS component for that pattern. |
| A-5 | **Provenance icons:** `settings` (gear) = AI-suggested, `person` = Specialist-entered, `edit` (pencil) = Specialist-modified; all three are in the bundled USWDS sprite and all are `aria-hidden="true"` beside their text label. | All provenance surfaces | FR-2.20 requires "a distinct icon" without naming one. These are unambiguous, available offline in the bundled sprite, and never used elsewhere in the product. |
| A-6 | **Provenance badges add a border-shape cue** (dashed = AI, solid = human) as a fourth, non-colour carrier. | All provenance surfaces | Exceeds the "never colour alone" requirement and survives monochrome, greyscale printing and colour-filter software. |
| A-7 | **Provenance colour tokens:** AI-suggested `indigo-60v` / white; Specialist-entered `gray-cool-70` / white; Specialist-modified `gold-20v` / `ink`. | All provenance surfaces | USWDS system tokens with AA-compliant pairings; distinct hue families so the two are separable for most colour-vision types, while never being the sole carrier. |
| A-8 | **Case state is rendered as a text label with an icon** ("Open", "Resolved", "Rejected"), not a coloured dot or a status pill relying on colour. | Case detail header | FR-2.17 requires state to be conveyed by a text label; this is the minimal conformant rendering. |
| A-9 | **Datetime format:** "11 September 2026, 2:32 p.m. EDT" — month in words, local zone abbreviation, wrapped in `<time datetime="…">`. | Queue, case detail, decision, audit trail | FR-8.14 and FR-14.15 require absolute, month-in-words, zone-bearing timestamps and forbid relative phrasing; this is one consistent rendering for all four surfaces. |
| A-10 | **The queue's "Refresh" control is a `usa-button--outline` placed immediately after the visible count**, and keeps focus on itself after refreshing. | Review queue | FR-8.10 requires an explicit refresh "after the table heading". Keeping focus avoids throwing a keyboard user to the top of a re-rendered table. |
| A-11 | **Below 640 px, tables reflow to stacked labelled blocks while remaining real `<table>` elements** with headers associated to data cells. | Queue, comparison rows, audit value tables | Satisfies 1.4.10 reflow without sacrificing the table semantics and programmatic row count that FR-8.6 and FR-14.13 require. |
| A-12 | **The `usa-modal` is used exactly once** — to confirm discarding typed input on Cancel — and nowhere else. | Decision region | FR-12.15 requires a discard confirmation; a modal is the USWDS pattern, and limiting it to one use keeps the product free of dialog-based interaction elsewhere. |
| A-13 | **Entry form fields are never laid out side by side**, at any breakpoint. | Entry form | Guarantees that tab order, visual order and error-summary order can never disagree — a common failure mode in multi-column federal forms. |
| A-14 | **The footer uses `usa-footer--slim` plus `usa-identifier`.** | All screens | The USWDS pattern for a federal application footer; required links only, no navigation duplication, no third destination introduced. |
| A-15 | **The visible queue count ("11 open exceptions") is presented as the table's accessible row count, not as a metric**, and appears nowhere else in the product. | Review queue | FR-8.6 requires a programmatic row count; framing and placement keep it from reading as a dashboard number (PRD §10 #2). |
| A-16 | **Sign-in shows no session countdown timer.** Expiry is explained in words when the specialist arrives at sign-in after it happens. | Sign in, shell | No story requires a timer; a countdown would add a time-limit UI (WCAG 2.2.1 surface) with no product benefit. |
| A-17 | **"Create another entry" resets to a wholly empty form** with focus on the first field and an announced status; previous values are never retained. | Entry form | FR-6.13 requires the reset; retaining values would amount to a draft/duplicate affordance, which FR-6.7 forbids. |
| A-18 | **Degraded and success panels both use `usa-summary-box`**, differentiated by their heading and copy, never by colour alone. | Case detail, entry form, decision | Keeps "this is a statement about your case" visually consistent, and keeps `usa-alert--error` reserved for genuine failures. |
| A-19 | **The required-information rule content these screens render is an inherited assumption, not settled fact.** Field labels, hint text, required markers, the twelve required-marked fields and every `RIV-*` message shown in `Screen-01`, `Screen-03` and `Screen-05` are drawn from FRD F4's `[ASSUMPTION]` rule set `RIV-2026.09`, which is explicitly open to CBP refinement. | Entry form, case detail, audit trail | Recorded so a rule-set revision reads as an expected update to these screens rather than a design defect. The *mechanism* these designs must preserve is fixed and not an assumption: findings are rendered verbatim in server order, bound to their named control (or, for `RIV-070`/`RIV-073`, to the Transport fieldset), with no severity, ranking or grading. |

---

### 2. Deliberate absences (what is NOT designed, and why)

Nothing below is drawn anywhere in this document. Each is excluded by `.planning/PROJECT.md`
and PRD §10, and each is stated rather than silently omitted (SM-14, US-7.3, US-8.5, US-14.6).

| Excluded capability | Where a reviewer might look for it | Stated in |
|---|---|---|
| Supervisor dashboard | A third nav item; a landing page with tiles | `00-overview.md` §2, `Screen-02` |
| Queue health / aging / volume / throughput / workload | Queue columns; a metrics strip; "2 days ago" phrasing | `Screen-02` "Why the controls are deliberately absent" |
| Reassignment / assignment / "claim" | Queue row actions; case detail header | `Screen-02`, `Screen-03` |
| Filtering, sorting, search, pagination | Queue toolbar; sortable headers | `Screen-02` |
| Prioritisation / severity / risk score / confidence score | Queue badge; finding list; AI recommendation block | `Screen-02`, `Screen-03` |
| Audit export (CSV, PDF, print package, copy-all, share, email, print stylesheet) | Audit trail toolbar | `Screen-05`, `Flow-04` |
| Bulk upload / file or API ingestion / ACE-ATS interface / template download | Entry form | `Screen-01` |
| Role switcher / second role / permissions UI / user administration | Header; sign-in | `Screen-00`, `00-overview.md` §2 |
| Seeded demo data | Empty queue state | `Y3-state-designs.md` State 1 |
| Autonomous resolution / auto-apply / "apply and next" / "approve all" | Decision region | `Screen-04` |
| Duty / tariff calculation, HTS classification fields | Entry form; recommendation | `Screen-01`, `Screen-03` |
| Native mobile app | — (web only; narrow-width support exists for WCAG reflow, not as a mobile product) | `Y1-responsive.md` |
| CI accessibility gate | — (the per-screen checklist is the enforcement mechanism) | `Y2-accessibility.md` §12 |
| Reopen / undo / amend / delete / redact / annotate a decision or an audit event | Closed case; audit trail | `Screen-04`, `Screen-05` |
| Regenerate / retry the AI recommendation | Degraded block | `Flow-05`, `Screen-03` |
| Draft save / autosave / duplicate entry | Entry form | `Screen-01` |
| Canned-reason dropdown / quick-reason chips | Reason fields | `Screen-04` |
| Closed-case browsing, cross-case search | Queue | `Screen-02`, `Flow-04` |
| Popups, new windows, `target="_blank"`, print view | Anywhere | `Y0-patterns.md` Pattern 10 |

---

### 3. User-story traceability

Every UI-bearing story has a design home. Non-UI stories (Epics 0, 3, 4, 5, 7, 9, 11, 13) are
referenced where their guarantees surface in the interface.

| Story | Where designed |
|---|---|
| US-0.2 (per-value provenance), US-0.4 (event order, tamper evidence) | `Y0-patterns.md` §1; `Screen-05` (value rows, integrity statement) |
| US-1.1, US-1.2, US-1.4, US-1.5 | `Screen-00-sign-in.md`; `Flow-00` |
| US-1.3 (identity attached to everything) | `Screen-00` (header identity after sign-in); `Screen-05` (actor on every event) |
| US-2.1, US-2.2 | `00-overview.md` §1.2 and §2; every screen's shell section |
| US-2.3 (keyboard-only) | `Flow-06`; `Y2-accessibility.md` §6 |
| US-2.4 (error identification) | `Y0-patterns.md` Pattern 2; `Y2-accessibility.md` §4–§5 |
| US-2.5 (provenance without colour) | `Y0-patterns.md` Pattern 1; `Screen-03`, `Screen-04`, `Screen-05` |
| US-2.6 (per-screen sign-off) | `Y2-accessibility.md` §11–§12 |
| US-3.1, US-3.2, US-3.3, US-3.4 | `Screen-01` (as-typed values, duplicate handling, no ingestion affordance) |
| US-4.1, US-4.2, US-4.3, US-4.4 | `Screen-01` (findings verbatim, server order, clean outcome); `Y3` State 2 |
| US-5.1, US-5.2, US-5.4 | `Screen-02` (receipt order); `Screen-03` (stated basis); `Y0` Pattern 8 |
| US-5.3 (no park/reopen) | `Screen-03`, `Screen-04` (no reopen affordance) |
| US-6.1 … US-6.6 | `Screen-01-cargo-entry-form.md`; `Flow-00`, `Flow-01` |
| US-7.1, US-7.2, US-7.3, US-7.4, US-7.5 | `Screen-02`; `Screen-04` (`permitted_decisions` authoritative) |
| US-8.1 … US-8.6 | `Screen-02-review-queue.md` |
| US-9.1 … US-9.5 | `Screen-03` (proposal framing, model metadata, degraded); `Flow-05` |
| US-10.1 … US-10.8 | `Screen-03-case-detail.md` |
| US-11.1 … US-11.7 | `Screen-04-decision.md` (surfaced behaviour of the decision API) |
| US-12.1 … US-12.7 | `Screen-04-decision.md`; `Flow-02`, `Flow-03` |
| US-13.1 … US-13.5 | `Screen-05` (one event per change, who/what/when/before/after/origin, reason placement) |
| US-14.1 … US-14.7 | `Screen-05-audit-trail.md`; `Flow-04` |

### 4. Journey coverage

| Journey | Flow chunk |
|---|---|
| JRN-01.1 Happy path — clean receipt | `Flow-00-sign-in-and-clean-entry.md` |
| JRN-01.2 Core loop — exception to approval | `Flow-01-exception-to-approval.md` |
| JRN-01.3 Edit path | `Flow-02-edit-and-approve.md` |
| JRN-01.4 Reject path | `Flow-03-reject.md` |
| JRN-01.5 Audit reconstruction | `Flow-04-audit-reconstruction.md` |
| JRN-01.6 Degraded AI | `Flow-05-degraded-ai.md` |
| JRN-01.7 Accessibility path | `Flow-06-keyboard-screen-reader.md` |
| JRN-02.1, JRN-03.1 (non-user) | **No screen, route, role or control.** JRN-02.1's oversight questions are answered by a specialist reading `Screen-05`; JRN-03.1 is a witnessed walkthrough of Flows 0–6. |

### 5. Success-metric support

| Metric | How these designs support it |
|---|---|
| SM-1 loop completeness | Flows 0–1 walk all six stages through the six screens with no workaround |
| SM-2 decision traceability | `Screen-05` answers who / what the AI said / what the human changed / why, in place |
| SM-3 provenance attribution | `Y0` Pattern 1 applied to every value on `Screen-03`, `Screen-04`, `Screen-05` |
| SM-4 zero auto-apply | `Screen-04`: no default, no pre-selection, two-step commitment, controls removed after decision |
| SM-5 reason capture | `Screen-04`: required reason on edit and reject, free text only, rendered in the trail |
| SM-9 rationale intelligibility | `Screen-03`: full verbatim rationale, never truncated or collapsed, on the same screen as the proposal |
| SM-10 / SM-11 accessibility and keyboard | `Y2-accessibility.md`, `Flow-06` |
| SM-12 USWDS conformance | `00-overview.md` §1.2 component register |
| SM-13 degraded completability | `Flow-05`, `Y3` State 4 |
| SM-14 scope discipline | §2 of this chunk; per-screen "deliberately absent" blocks |

---
