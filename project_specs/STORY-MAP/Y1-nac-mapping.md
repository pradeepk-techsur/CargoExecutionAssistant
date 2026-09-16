## NaC-to-Acceptance Criteria Mapping

Verifies that each NaC on the map is actually discharged by acceptance criteria already written
in UserStories-CargoExec.md — that the map added a *why*, not a new requirement. AC text is
abbreviated; the authoritative wording is in the story.

| NaC | Story | Acceptance criterion that discharges it | Aligned? |
|---|---|---|---|
| JTBD-01.1 → No entry can exist having been received but never assessed | US-3.1 | "Given a forced failure in the audit writer during receipt, when the transaction aborts, then zero `cargo_entries` rows exist … and no orphan validation result or exception exists." | Yes |
| JTBD-01.1 → "Validated clean" or "exception opened, here is the case" is stated, never inferred | US-6.3 | Receipt outcome stated explicitly with case reference and navigable link; outcome announced via live region | Yes |
| JTBD-01.1 → The absence of a case is evidenced positively | US-4.4 | "Given a `PASS` result … `receipt_outcome` is `VALIDATED_CLEAN` and `exception` is `null`"; and `404 EXCEPTION_NOT_FOUND` says "That entry passed validation, so it has no exception." | Yes |
| JTBD-01.1 → Client-side help never decides the outcome | US-6.2 | Browser does not block submission of a deliberately incomplete entry; server-side F4 is authoritative | Yes |
| JTBD-01.1 → An outcome is reproducible rather than situational | US-4.3 | "Given one entry's content, when it is validated twice in the same process and once in a second process, then the outcome and the finding list are identical … byte-for-byte" | Yes |
| JTBD-01.2 → One list, one settled order, identical across requests | US-7.1 | Open exceptions returned in ascending receipt order, stable and deterministic across repeated requests, no parameters | Yes |
| JTBD-01.2 → What is shown is exactly what still needs a decision | US-7.2 | Resolved/rejected cases excluded from the queue while remaining reachable by reference | Yes |
| JTBD-01.2 → The order never rearranges under her | US-5.2 | Immutable receipt position stamped at exception creation | Yes |
| JTBD-01.2 → Opening the next case is one action | US-8.2 | Row activation operable by keyboard and pointer, navigating to case detail | Yes |
| JTBD-01.3 → The exception never feels arbitrary | US-10.1 | Case detail renders the validation findings naming the unsatisfied rule and affected field | Yes |
| JTBD-01.3 → The rationale is intelligible enough to agree or disagree | US-10.3 | Recommended action and plain-language rationale rendered on the case, as an un-applied proposal | Yes |
| JTBD-01.3 → Origin is legible on sight, by screen reader and in monochrome | US-10.4, US-2.5 | "Given CSS colour overridden to monochrome … AI-versus-human origin remains discoverable on every value and every event"; provenance exposed as text to assistive technology | Yes |
| JTBD-01.4 → Choosing the AI's answer costs the same deliberate act as refusing it | US-12.1 | Approve/Edit/Reject rendered with no default and no pre-selection | Yes |
| JTBD-01.4 → A case cannot close refused or corrected without saying why | US-11.4 | Non-empty reason required on `EDIT_APPROVE` and `REJECT`, enforced at the API boundary; DB `CHECK` rejects a blank or short reason inserted directly in SQL | Yes |
| JTBD-01.4 → Append-only immutability is never experienced as a trap | US-12.4, US-12.5 | Pre-submission summary of exactly what will be recorded; post-decision confirmation rendered from the server's own record | Yes |
| JTBD-01.4 → Partial disagreement has somewhere to go | US-11.2, US-12.2 | Edit-and-approve stores changed values `HUMAN` and untouched values `AI`; changed fields visibly marked specialist-modified in the form | Yes |
| JTBD-01.5 → The question is answered in place, with no export or second system | US-14.1, US-14.7 | Chronological per-case trail rendered inside the case, answering the four oversight questions from the UI alone | Yes |
| JTBD-01.5 → Chronology is a property of the record, not an inference | US-0.4 | `UNIQUE (case_id, case_sequence)` from 1, `global_sequence` total order, `prev_entry_hash` linkage, `occurred_at` from the database's own `now()` | Yes |
| JTBD-01.5 → The record shows a genuine before and after | US-0.3 | Entry and its field origins byte-identical to receipt state after any later action; corrections written to `decision_values`, never to `cargo_entries` | Yes |
| JTBD-01.5 → The closed case is the record, not a working copy | US-10.7 | Closed-case read-only presentation with the recorded decision shown in place of decision controls | Yes |
| JTBD-01.6 → The outage costs a suggestion, not the case's accountability | US-9.4 | Degraded mode: explicit "no recommendation available"; entry creation, validation, exception opening, decision and audit writing all unblocked | Yes |
| JTBD-01.6 → A wait is never indistinguishable from a dead request | US-10.5 | Accessible progress status announced during generation; navigation remains available; the interface does not freeze | Yes |
| JTBD-01.6 → No phantom proposal is adoptable | US-11.7 | Approval of a recommendation that does not exist is refused at the API boundary | Yes |
| JTBD-01.7 → The whole job completes with no pointer-only step | US-2.3 | "Given the five product tasks … when each is attempted with the keyboard alone, then all five complete successfully (SM-11)" | Yes |
| JTBD-01.7 → Recovery is a short path, not a re-traversal | US-2.4, US-6.4 | Error summary is first child of the form region, `role="alert"`, `tabindex="-1"`, takes focus, items link to the offending control by `id` | Yes |
| JTBD-01.7 → The case is traversable by heading in the intended order | US-10.8 | Heading structure and reading order run entry → findings → recommendation → decision → audit | Yes |
| JTBD-02.1 → "The AI resolved it" is unreachable **(no screen)** | US-0.5, US-11.5 | "Given an `OPEN` exception, when a transaction sets `state = 'RESOLVED'` without inserting a `decisions` row, then the commit is refused with `HITL_VIOLATION`"; no `AI`/`SYSTEM` principal exists in `specialists` | Yes |
| JTBD-02.1 → The actor cannot be made to name someone else **(no screen)** | US-1.3 | `actor_specialist_id` taken from the session principal; a body containing `decided_by`/`actor`/`on_behalf_of` is rejected `422 REQUEST_MALFORMED` | Yes |
| JTBD-02.1 → A case cannot be decided twice into a contradictory record **(no screen)** | US-11.6, US-0.5 | `UNIQUE (exception_id)` on `decisions`; second decision surfaces HTTP 409 `EXCEPTION_ALREADY_DECIDED` | Yes |
| JTBD-02.2 → An attempt to alter history fails, including directly against the database **(no screen)** | US-0.1, US-13.4 | `cargoexec_app` holds `SELECT, INSERT` only; unconditional `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger raises `AUDIT_IMMUTABLE` even for owner/superuser | Yes |
| JTBD-02.2 → Tampering is evident and surfaced, never repaired **(no screen)** | US-0.4, US-14.5 | "Given a copy of the database with one middle entry excised … reports `chain_verified: false` and the `case_sequence` of the first divergence, and it performs no repair, rewrite, or annotation" | Yes |
| JTBD-02.2 → A change and its history commit together or neither commits **(no screen)** | US-13.5, US-13.1 | Deferred constraint triggers refuse commits lacking the matching audit entry (`AUDIT_COUPLING_VIOLATION`) | Yes |
| JTBD-02.3 → The human's contribution is provable, not plausible **(no screen)** | US-0.2 | "Given an edit-and-approve decision over three proposed values where one was changed … the changed value carries `HUMAN`, the two unchanged carry `AI` … zero unattributed values (SM-3)" | Yes |
| JTBD-02.3 → What the AI said is preserved as it was said **(no screen)** | US-9.3 | Model identity, prompt version and generation timestamp recorded with the proposal; proposal never written into the entry of record | Yes |
| JTBD-02.3 → The justification travels with the change **(no screen)** | US-13.3, US-14.3 | Reason text carried onto the audit entry for edit and reject and rendered in full in the trail | Yes |
| JTBD-02.4 → "Why was this case open" is a recorded fact **(no screen)** | US-5.1 | Exception references its `validation_result_id` with `validation_outcome = 'FAIL'`; findings read through the reference so basis and record cannot diverge | Yes |
| JTBD-02.4 → Exceptions cannot be authored or bypassed **(no screen)** | US-5.3, US-3.4 | No exception-authoring, reopen or park path; no import, bulk-upload, ingestion adapter or CLI import; `skip_validation`/`force` rejected `422` | Yes |
| JTBD-02.4 → The stated basis is specific, not generic **(no screen)** | US-4.2 | Presence gating means an empty field yields only `RIV-030`, never a contradictory pair; findings ordered by ascending `rule_id` and consumed unchanged everywhere | Yes |
| JTBD-03.1 → The walkthrough needs no explanation or workaround **(no screen)** | US-6.3, US-8.1, US-10.3, US-12.1, US-14.1 | Each of the six loop stages is carried by a named shipped screen with its own AC; no API transcript required | Yes |
| JTBD-03.1 → Receive and validate sit inside the demonstrated path **(no screen)** | US-3.4 | "Given the deployed database, when migrations are reviewed, then none inserts a cargo entry, exception, recommendation, decision, or audit entry — there is no seeded demonstration dataset." | Yes |
| JTBD-03.2 → She is shown a test, not a toggle **(no screen)** | US-9.5, US-11.5 | Absence of any scheduled job, background worker, retry path or system actor able to transition a case, verified by test rather than policy | Yes |
| JTBD-03.3 → Conformance is evidenced per screen **(no screen)** | US-2.6 | "Given each of the six screens/regions … a signed checklist record exists naming the reviewer, the date, the screen, and any defects with their resolution (SM-10)" | Yes |
| JTBD-03.4 → The exclusion is structural, not a UI omission **(no screen)** | US-7.3, US-0.5 | Queue API carries no filter/sort/assignment/priority parameter; schema dump contains no `assigned_to`, `priority`, `sla_due_at`, `age_days`, `role`, `permission`, `exported_at`, `source_system`, `is_seed`, `tariff_*` or `hts_code` column | Yes |
| JTBD-03.4 → Navigation implies nothing that does not exist **(no screen)** | US-2.2, US-8.5 | Exactly two navigation destinations; no dashboard, reports, metrics, settings, administration or export item; no filtering, sorting, assignment or aging language on the queue | Yes |
| JTBD-03.3 *(Phase 7)* → Conformance holds regardless of which visual design system renders the shell **(no screen)** | US-2.7 | "Given the shell rendered under the Phase 7 visual system, when it is reviewed against the checklist, then it still meets Section 508 / WCAG 2.1 AA in full … with no criterion relaxed because the visual system changed" | Yes |
| JTBD-03.1 *(Phase 7)* → What is watched in the walkthrough is genuine AI output, not a scripted stand-in **(no screen)** | US-9.6 | "Given the demonstration/production deployment, when it starts, then it is configured with `AI_PROVIDER_URL` pointing at a real HTTPS LLM endpoint … not the `fake:deterministic` provider"; recorded `model_id` names the real provider's model | Yes |
| JTBD-03.1 *(Phase 7)* → The seeded case is governed by the identical invariants as any live case **(no screen)** | US-15.1 | "Given the seed script, when its implementation is reviewed, then it contains no `INSERT INTO` statement against `cargo_entries`, `exceptions`, `recommendations`, `decisions`, or `audit_entries` … entry receipt goes through F3's own service function" | Yes |
| JTBD-03.1 *(Phase 7)* → Re-seeding before a demonstration is always safe **(no screen)** | US-15.2 | "Given that same database, when the script runs a second time immediately afterward, then it creates no additional specialist, case, recommendation, decision, or audit entry … and exits `0`" | Yes |
| JTBD-03.1 *(Phase 7)* → The seeded case demonstrates a mixed AI/human resolution without waiting for one to occur organically **(no screen)** | US-15.3 | "Given that decision, when its resolution values are read, then at least one value is a specialist-style correction re-stamped `HUMAN` origin and at least one other value is left as the AI's original proposal, retaining `AI` origin" | Yes |
| JTBD-03.1 *(Phase 7)* → The seeded trail passes the identical chain-verification test as any organic case **(no screen)** | US-15.4 | "Given the seeded case's full audit trail, when the F0 chain-verification routine runs against it, then it reports `chain_verified: true`, the same as any organically produced case" | Yes |
| JTBD-03.1 *(Phase 7)* → Manual entry stays the only way anyone using the running application creates a case **(no screen)** | US-15.5 | "Given the deployed application's routes and UI, when they are enumerated, then no endpoint, screen, button, or scheduled job invokes the seed script"; "Given the cargo entry web UI … it functions completely unchanged" | Yes |

**Alignment result: 51 of 51 NaC discharged by existing acceptance criteria — zero NaC requiring
a criterion that UserStories-CargoExec.md does not already contain, and zero acceptance criteria
contradicted by a NaC.**

---

## Self-Check

| Check | Result |
|---|---|
| Every UserStory (US-0.1 … US-15.5) appears in the map | ✅ 91 of 91, each exactly once |
| Every mapped story has a NaC derived from a JTBD outcome | ✅ every activity row carries a `JTBD-XX.Y →` NaC |
| NaC Derivation Table has full traceability chains | ✅ 59 chains, JTBD → journey stage → NaC → stories |
| Release planning groups defined with rationale | ✅ R1 (70), R2 (11), R3 (3), R4 (7, Phase 7), with the release rationale stated for each |
| No loop stage deferred past the first release | ✅ all six stages complete in R1; R2 is resilience, R3 is evidence, R4 (Phase 7) is demonstration enablement and design-system-independent conformance — none widens the loop itself |
| Each release enables at least one complete journey | ✅ R1: JRN-01.1–01.5, 01.7, 02.1; R2: JRN-01.6; R3: JRN-03.1 final stage; R4: no new journey — reinforces JRN-03.1's existing stages |
| Coverage analysis identifies gaps and orphans | ✅ zero JTBD gaps, zero orphan stories, deliberate absences listed separately, including the one Phase-7 exclusion reversal (seeded demonstration data) |
| NaC-to-Acceptance-Criteria mapping verifies alignment | ✅ 51 of 51 aligned |
| PER-02 / PER-03 never operate a backbone step | ✅ beneficiary/witness cells only, every non-user NaC tagged **(no screen)**; the Phase-7 **Operator** is held to the same rule and operates only the new Demonstration Enablement lane, never a backbone step |
| No excluded capability appears as a step, epic, story or NaC, beyond the one Phase-7 reversal | ✅ checked against `.planning/PROJECT.md` Out of Scope and PRD §10; the single exception — seeded demonstration data (§10 #7) — is superseded by PRD §5.7 F15 and is itself checked line by line (US-15.1–US-15.5), not merely present |
| Backbone matches the governed loop as the specialist experiences it | ✅ sign in → enter → validate → except/queue → open → read recommendation → decide with reason → audit written → review trail; the Phase-7 Demonstration Enablement lane sits deliberately outside this spine, since it is not a step the specialist takes |

---

*Document generated by Pivota Spec Framework — Story Map Generator*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11); derived from PRD v1.1 (Phase 7 update 2026-09-16), PERSONAS v1.0, JTBD v1.0, JOURNEYS v1.0, UserStories v1.0 (91 stories, Epics 0–15)*
*Last updated: 2026-09-16 (Phase 7: Epic 15 added; US-2.7 and US-9.6 added to Epics 2 and 9)*
