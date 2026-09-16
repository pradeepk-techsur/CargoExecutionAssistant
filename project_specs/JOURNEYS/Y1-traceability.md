
## Journey-to-JTBD Traceability

| Journey Stage | JTBD ID | Expected Outcome | Metric |
|--------------|---------|-----------------|--------|
| JRN-01.1:Arrive | JTBD-01.7 | Unauthenticated access to a protected route is rejected and redirected to sign-in | SM-11 |
| JRN-01.1:Authenticate | JTBD-01.1 | An authenticated specialist identity is established and available to the audit writer as the actor | SM-4 |
| JRN-01.1:Compose | JTBD-01.1 | The required-information field set is legible before submission through labels, hints and required-field marking | SM-1 |
| JRN-01.1:Submit | JTBD-01.1 | Receipt is atomic — persist, validate, determine outcome in one transaction; no entry exists received but unassessed | SM-8, SM-1 |
| JRN-01.1:Read outcome | JTBD-01.1 | The clean-pass outcome is stated explicitly and announced, never inferred from an absence of errors | SM-8 |
| JRN-01.1:Move on | JTBD-01.2 | The receipt outcome offers a route onward into the queue, so the clean branch ends inside the flow | SM-1 |
| JRN-01.2:Submit a deficient entry | JTBD-01.1 | Server-side validation is authoritative; the entry is received exactly as it arrived and the exception is derived from its failure | SM-8 |
| JRN-01.2:Read the exception receipt | JTBD-01.1 | The outcome states *exception opened* with a navigable case reference and per-rule findings naming rule and field | SM-8, SM-1 |
| JRN-01.2:Enter the queue | JTBD-01.2 | Open exceptions appear as one stable receipt-ordered list with no filter, sort, assignment or priority parameter | SM-1, SM-11 |
| JRN-01.2:Open the case | JTBD-01.2 | A row is identifiable by reference, receipt time and failure summary, and opens in a single keyboard or pointer action | SM-11 |
| JRN-01.2:Read the case | JTBD-01.3 | Entry values, named findings, and an un-applied AI proposal with plain-language rationale, every proposed value origin-marked | SM-9, SM-3 |
| JRN-01.2:Decide | JTBD-01.4 | Approve, Edit and Reject are presented with no default or pre-selection, so approving the AI is a deliberate act | SM-4 |
| JRN-01.2:Confirm | JTBD-01.4 | Resolution state changes only through the recorded human decision, with the audit entry committed in the same transaction | SM-4, SM-6 |
| JRN-01.2:Close the loop | JTBD-01.5 | The full chronology — received, validated, excepted, recommended, decided — is readable inside the case | SM-2, SM-6 |
| JRN-01.3:Open and read | JTBD-01.3 | The proposal is presented as individually attributed values, so partial disagreement is expressible | SM-3, SM-9 |
| JRN-01.3:Choose to edit | JTBD-01.4 | Edit is reachable at equal weight and equal cost to Approve, so accuracy is never the expensive choice | SM-4 |
| JRN-01.3:Change the value | JTBD-01.4 | Changed fields are visibly marked as specialist-modified at decision time, not only afterwards | SM-3 |
| JRN-01.3:Write the reason | JTBD-01.4 | A non-empty reason is required on edit and enforced at the API boundary, not only in the browser | SM-5 |
| JRN-01.3:Review before commit | JTBD-01.4 | What will be recorded is shown before it is recorded, so append-only immutability is never experienced as a trap | SM-2 |
| JRN-01.3:Commit the decision | JTBD-01.4 | Changed values are re-stamped `HUMAN` while untouched values retain `AI`, committed with the audit entry | SM-3, SM-4 |
| JRN-01.3:Verify the provenance | JTBD-01.5 | Before/after values, reason, actor and per-value origin are legible in the trail beyond colour alone | SM-2, SM-3 |
| JRN-01.4:Read the proposal | JTBD-01.3 | The rationale is plain-language enough to locate which part of the reasoning fails | SM-9 |
| JRN-01.4:Commit to refusing | JTBD-01.4 | Reject is presented at equal weight with Approve and Edit, with no nudge back toward approval | SM-4 |
| JRN-01.4:Attempt without a reason | JTBD-01.4 | A missing reason is rejected at the API boundary and surfaced as an inline, focus-managed error | SM-5 |
| JRN-01.4:Write the reason | JTBD-01.4 | The rejection carries a non-empty reason written in the specialist's own words | SM-5 |
| JRN-01.4:Close the case | JTBD-01.4 | The case closes `REJECTED` through a recorded human decision, leaves the queue, and cannot be decided twice | SM-4, SM-6 |
| JRN-01.4:Read it back | JTBD-01.5 | The AI's original recommendation is preserved as it was made, alongside the refusal and its reason | SM-2 |
| JRN-01.5:Locate the case | JTBD-01.5 | The case reference is the stable identifier reaching a closed case with no cross-case search in scope | SM-2 |
| JRN-01.5:Open the closed case | JTBD-01.5 | Closed cases present read-only, with the recorded decision shown in place of decision controls | SM-2 |
| JRN-01.5:Open the trail | JTBD-01.5 | The per-case history renders in monotonic sequence order with no edit, correct or delete affordance | SM-6, SM-7 |
| JRN-01.5:Answer *who and when* | JTBD-01.5 | Actor identity and timestamp on every entry, with machine-originated entries distinguishable from specialist entries | SM-2, SM-4 |
| JRN-01.5:Answer *what changed* | JTBD-01.5 | Before and after values with the captured reason rendered inline at the entry it belongs to | SM-2, SM-5 |
| JRN-01.5:Answer *AI versus human* | JTBD-01.5 | Per-value `AI` or `HUMAN` origin rendered in the trail, so a mixed resolution decomposes cleanly | SM-3, SM-2 |
| JRN-01.6:Open the case | JTBD-01.6 | Queue and exception creation are unaffected by AI provider state | SM-13 |
| JRN-01.6:Wait, briefly | JTBD-01.6 | Generation shows accessible progress status without freezing the interface or blocking navigation | SM-13 |
| JRN-01.6:Read the degraded state | JTBD-01.6 | An explicit *no recommendation available* state, with the decision path visibly unaffected | SM-13 |
| JRN-01.6:Decide without a proposal | JTBD-01.4, JTBD-01.6 | Decision controls are bound to the case, not to the recommendation, so a degraded case stays decidable | SM-4, SM-13 |
| JRN-01.6:Record the reason | JTBD-01.4, JTBD-01.6 | Reason enforcement is identical on the degraded path — no second-class record shape exists | SM-5 |
| JRN-01.6:Verify the record | JTBD-01.5, JTBD-01.6 | The audit record is as complete as any other, with no fabricated or null-origin recommendation entry | SM-13, SM-6, SM-3 |
| JRN-01.7:Sign in by keyboard | JTBD-01.7 | Semantic landmarks, heading order and accessible names present from the first screen | SM-10, SM-11 |
| JRN-01.7:Fill the entry form | JTBD-01.7 | Programmatic required-field indication and label/hint association announced rather than discovered | SM-10, SM-12 |
| JRN-01.7:Recover from the error summary | JTBD-01.7, JTBD-01.1 | The error summary moves focus, is announced, and links field by field to the inputs concerned | SM-10, SM-11 |
| JRN-01.7:Hear the receipt outcome | JTBD-01.7, JTBD-01.1 | Outcome messaging exposed to assistive technology via live regions | SM-10 |
| JRN-01.7:Traverse the queue | JTBD-01.7, JTBD-01.2 | Accessible list/table semantics, programmatic row count, keyboard-operable row activation | SM-11, SM-12 |
| JRN-01.7:Read the case in order | JTBD-01.7, JTBD-01.3 | Heading structure carries entry → findings → recommendation → decision → audit; origin never colour-alone | SM-10, SM-3 |
| JRN-01.7:Decide by keyboard | JTBD-01.7, JTBD-01.4 | The undefaulted three-action decision, reason capture and error recovery complete by keyboard alone | SM-11, SM-4 |
| JRN-01.7:Read the trail back | JTBD-01.7, JTBD-01.5 | The history is traversable by screen reader with actor, action, time, before/after, reason and origin announced | SM-10, SM-2 |
| JRN-02.1:Receive the question | JTBD-02.4 | A case reference is sufficient to begin an oversight question; no search or reporting surface is required or exists | SM-8 |
| JRN-02.1:Ask a specialist | JTBD-02.3 | The per-case trail is complete enough that a mediated reading loses nothing — no export, no handoff surface | SM-2, NFR-7 |
| JRN-02.1:Hear *who decided, and when* | JTBD-02.1 | Every decision carries an authenticated specialist identity and timestamp; no system or anonymous actor exists | SM-4 |
| JRN-02.1:Hear *AI versus human* | JTBD-02.3 | Per-value provenance in storage and rendering makes the human's contribution provable for mixed resolutions | SM-3, SM-2 |
| JRN-02.1:Hear *why*, and *why open* | JTBD-02.3, JTBD-02.4 | Mandatory reason text and the derived validation basis are present in the record and read back | SM-5, SM-8 |
| JRN-02.1:Satisfy himself the record could not have been altered | JTBD-02.2 | Insert-only storage with revoked UPDATE/DELETE privileges, monotonic sequencing and hash linkage — proven by test | SM-7, SM-6 |
| JRN-03.1:Set the terms | JTBD-03.1 | At least one entry is hand-typed live for receive/validate; a seeded case (F15) may additionally be used for later stages, disclosed rather than substituted | SM-1 |
| JRN-03.1:Watch receive and validate | JTBD-03.1 | Two of six loop stages demonstrated live in the browser with data created during the session | SM-1 |
| JRN-03.1:Watch except and recommend | JTBD-03.1, JTBD-03.3 | Except and recommend demonstrated with the proposal visibly un-applied and origin-marked beyond colour alone | SM-1, SM-3 |
| JRN-03.1:Watch the human decide | JTBD-03.2 | Undefaulted decision controls and mandatory reason capture observed in operation, not described | SM-4, SM-5 |
| JRN-03.1:Watch audit close the loop | JTBD-03.1 | Six of six stages complete; the record explains itself in place with no export or second system | SM-1, SM-2 |
| JRN-03.1:Probe the accountability claim | JTBD-03.2 | No scheduled job, worker, retry path or system actor can resolve a case — answered structurally and by test | SM-4, SM-13 |
| JRN-03.1:Check what was declined | JTBD-03.4 | Zero shipped features fall within a PRD §10 exclusion, checked offline against the feature set | SM-14 |

**JTBD coverage check:** JTBD-01.1 (JRN-01.1, 01.2, 01.7), JTBD-01.2 (01.1, 01.2, 01.7), JTBD-01.3 (01.2, 01.3, 01.4, 01.7), JTBD-01.4 (01.2, 01.3, 01.4, 01.6, 01.7), JTBD-01.5 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7), JTBD-01.6 (01.6), JTBD-01.7 (01.1, 01.7), JTBD-02.1 (02.1), JTBD-02.2 (02.1), JTBD-02.3 (02.1), JTBD-02.4 (02.1), JTBD-03.1 (03.1), JTBD-03.2 (03.1), JTBD-03.3 (03.1), JTBD-03.4 (03.1). **15 of 15 jobs covered; every journey maps to at least one job.**

**Feature coverage check:** F0 (JRN-01.3, 01.5, 01.6, 02.1, 03.1), F1 (01.1, 01.7, 02.1, 03.1), F2 (all seven PER-01 journeys), F3 (01.1, 01.2, 01.7, 03.1), F4 (01.1, 01.2, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F5 (01.2, 01.7, 02.1, 03.1), F6 (01.1, 01.2, 01.7, 03.1), F7 (01.2, 01.4, 01.5, 01.6, 01.7, 03.1), F8 (01.1, 01.2, 01.5, 01.6, 01.7, 03.1), F9 (01.2, 01.3, 01.4, 01.6, 01.7, 02.1, 03.1), F10 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F11 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F12 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 03.1), F13 (01.1, 01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F14 (01.2, 01.3, 01.4, 01.5, 01.6, 01.7, 02.1, 03.1), F15 (03.1, Phase 7 — Check what was declined). **16 of 16 features touched.**

**Metric coverage check:** SM-1, SM-2, SM-3, SM-4, SM-5, SM-6, SM-7, SM-8, SM-9, SM-10, SM-11, SM-12, SM-13, SM-14. **14 of 14 metrics referenced.**

---

## Scope & Quality Self-Check

| Check | Result |
|-------|--------|
| Every persona has at least one journey | ✅ PER-01 × 7, PER-02 × 1, PER-03 × 1 |
| Every interactive journey belongs to PER-01 | ✅ All seven screen-bearing journeys are PER-01's; JRN-02.1 and JRN-03.1 contain no screen operated by their persona |
| Non-user journeys contain no login, screen, dashboard, export, query or API call for their persona | ✅ JRN-02.1 touchpoints are another human, record properties, and test evidence; JRN-03.1 touchpoints are an observed PER-01 session, verbal Q&A, and an offline §10 check |
| Non-user journeys labelled explicitly | ✅ Both open with *non-user journey — no authenticated access, no dedicated interface* |
| All seven required PER-01 scenarios present as their own journey | ✅ Happy path (01.1), core loop/approve (01.2), edit (01.3), reject (01.4), audit reconstruction (01.5), degraded AI (01.6), accessibility (01.7) |
| Every touchpoint names one of the six screens (or a non-system touchpoint) | ✅ Sign-in, entry form, queue, case detail, decision, audit trail only |
| No stage requires an excluded capability | ✅ No supervisor dashboard, queue metric, aging, throughput, workload, reassignment, filter, sort, assignment, prioritisation, audit export, bulk/file/API ingestion, second role, autonomous AI resolution, duty/tariff calculation, native mobile, or CI accessibility gate appears in any stage. **Phase 7:** seeded demonstration data (F15) is no longer on this excluded-capability list — it is a shipped, additive feature (JRN-03.1) that supplements rather than replaces the live entry path |
| Every stage has all seven columns populated | ✅ No empty cells across all 60 stages |
| Every journey has at least one key moment | ✅ Each journey lists 3–5 |
| Success outcomes trace to JTBD success measures | ✅ Each cites its JTBD and SM IDs |
| Feature touchpoints reference valid PRD feature IDs | ✅ F0–F15 only (F15 added Phase 7); non-user journeys mark features as beneficiary/observed, never operated |
| Accessibility treated as journey steps, not a footnote | ✅ JRN-01.7 is a full eight-stage journey across all six screens, with WCAG 2.1 AA accessibility behaviours as stages (visual design system is USWDS through Phase 6, replaced Phase 7; the accessibility bar itself is unchanged) |
| Cross-journey patterns documented | ✅ Six common pain points, five shared opportunities, four convergence points |

---

*Document generated by Pivota Spec Framework — Journeys Generator*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11); derived from PERSONAS-CargoExec.md v1.0, JTBD-CargoExec.md v1.0, PRD-CargoExec.md v1.1*
*Last updated: 2026-09-11; Phase 7 targeted update: 2026-09-16 (USWDS wording made system-independent in F2-affected stages; JRN-03.1 updated for the seeded demonstration case, F15)*
