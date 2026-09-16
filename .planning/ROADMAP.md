# Roadmap: CargoExecutionAssistant (CargoExec)

## Overview

CargoExec exists to prove one thing: that a **complete** governed decision loop — receive → validate → except → recommend → human decide → audit — can be built quickly and shown working. Five of six stages is not a smaller product, it is a worthless one, so this roadmap is sequenced by what the loop needs rather than by technical layer.

Two things are built first because everything else is written against them. **Phase 1** puts the four structural invariants into the database — append-only audit, per-value AI/HUMAN provenance, no-auto-apply, and exactly one audit entry per state change — where they are enforced by privileges and triggers rather than by application convention. Adding any of these later would mean rewriting the schema every other phase was built on. **Phase 2** establishes the identity that decisions are attributed to and the USWDS/accessibility foundation every screen inherits; accessibility is a property of the shell and is signed off per screen inside each UI phase, never deferred.

Phases 3–6 then walk the loop itself as vertical slices — each phase ships its API and its screen together, so every phase after the second ends with something a cargo specialist can actually do. **The loop first closes end to end in Phase 6**, when the human decision and the per-case audit trail land together; Phase 6 is not complete until the whole loop has been walked in one unbroken keyboard-only browser session with hand-created data, once healthy and once with the AI provider stopped.

Resilience (degraded AI, conflicting decisions, stale screens) and per-screen accessibility sign-off are **not** separate later phases. Each is delivered inside the phase that owns the capability, because a governance guarantee that only holds on the happy path is not a guarantee.

**Persona note:** PER-01, the cargo specialist, is the only authenticated user and the actor in every criterion below. PER-02 (oversight reviewer) and PER-03 (delivery sponsor) never operate the system; criteria that serve them are properties of the record, verified by test or by SQL, and are marked *(no screen)*.

**Scope boundary:** nothing in PROJECT.md's Out of Scope list appears in any phase. No CI workflow or axe-core gate, no supervisor view or queue metrics, no second role, no queue filter/sort/assignment, no audit export, no file or API ingestion, no seed data, no autonomous resolution, no duty/tariff logic, no native mobile, no model training. Several criteria exist specifically to assert those absences as testable behaviour.

**Stack is settled** in TechArch-CargoExec.md (Node 22.11.0 / Express 4.21.1 / PostgreSQL 16.4 / USWDS 3.11.0 as Sass + JS, hand-written SQL with no ORM, server on `0.0.0.0:3000`, no frame-blocking headers because the app is demonstrated inside a preview IFRAME). Phases schedule against it; they do not revisit it.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Governed Record Substrate** - The four invariants enforced by the database itself, before anything is built on top of them (completed 2026-09-14)
- [x] **Phase 2: Identity and the Federal UI Foundation** - Sign-in as the accountable actor, on the USWDS shell every screen inherits (completed 2026-09-15)
- [x] **Phase 3: Receive, Validate, Except** - A hand-typed entry is assessed on receipt and becomes a case, or is stated clean (completed 2026-09-15)
- [x] **Phase 4: The Receipt-Ordered Queue** - One list, one order, nothing to choose — open the next case in a single action (completed 2026-09-15)
- [x] **Phase 5: AI Recommendation as an Un-Applied Proposal** - Read the case, the AI's action and its rationale, with machine values marked as such (completed 2026-09-16)
- [ ] **Phase 6: The Human Decision and the Record That Explains It** - Edit / approve / reject with a reason, read the trail in place — **the loop closes here**

## Phase Details

### Phase 1: Governed Record Substrate
**Goal**: The record the whole loop writes into exists and is governed by the database rather than by application convention — append-only, per-value provenance, a human behind every resolution, and exactly one audit entry per state change — so that a defect in any code written later cannot produce a governance failure.
**Status**: Complete (2026-09-14)
**Depends on**: Nothing (first phase)
**Requirements**: F0, F13
**Non-functional carried**: NFR-3, NFR-4, NFR-6, part of NFR-5
**Success Criteria** (what must be TRUE):
  1. An `UPDATE`, `DELETE` or `TRUNCATE` against a stored audit entry is refused — including when issued directly in `psql` as the schema owner, not only through the application. *(no screen)*
  2. A transaction that changes case state without writing its audit entry, or writes an audit entry without its change, fails at `COMMIT` rather than committing half of itself — demonstrated by deliberately mis-writing such a transaction and watching it be rejected. *(no screen)*
  3. A transaction that moves an exception out of `OPEN` without a `decisions` row naming a real specialist is refused by the database, so "the AI resolved it" is unreachable even from a direct SQL session with full application privileges. *(no screen)*
  4. Every stored value carries an `AI` or `HUMAN` origin — there is no column default, nullable path, or insert route by which an unattributed value can come into existence. *(no screen)*
  5. A removed, altered or reordered audit entry is detectable from the per-case sequence and hash chain, and the verifier reports the break rather than repairing it. *(no screen)*
**Plans**: 10 plans in 6 waves
- [ ] 01-01-PLAN.md — Scaffolding, PostgreSQL 16.4 under compose, the three governance roles, forward-only migration runner, drop-not-truncate test harness (wave 1)
- [ ] 01-02-PLAN.md — Migrations 0001–0004: identity, entries with constant-HUMAN origin, validation, exception derivation integrity (wave 2)
- [ ] 01-03-PLAN.md — Canonical JSON serialisation and the SHA-256 entry-hash computation, with its fixed-vector unit suite (wave 2)
- [ ] 01-04-PLAN.md — Migrations 0005–0007: recommendations, decisions, and the append-only audit store (wave 3)
- [ ] 01-05-PLAN.md — Migrations 0008–0010: privilege revocations, the four trigger families, and the read-only chain verifier (wave 4)
- [ ] 01-06-PLAN.md — Connection pools, the only BEGIN, the audit writer `append(tx, entry)`, and the governed-case fixture builder (wave 5)
- [ ] 01-07-PLAN.md — Architecture suite: no CI, no forbidden dependency, thirteen tables, twenty-five forbidden columns absent, declared grant matrix (wave 5)
- [ ] 01-08-PLAN.md — Immutability suite: UPDATE/DELETE/TRUNCATE refused for app, ai **and owner**; entry of record and AI privilege wall (wave 6)
- [ ] 01-09-PLAN.md — HITL, audit-coupling and provenance suites: deliberately mis-written transactions refused at COMMIT (wave 6)
- [ ] 01-10-PLAN.md — Read-only per-case trail service, sequencing under concurrency, chain refusal, and excision detection in a copied database (wave 6)

*Criteria here are system properties rather than screen behaviours because this phase ships no screen. They are verified by SQL and by test, exactly as the story map marks them **(no screen)** — asserting them as observable failures now is what makes Phases 2–6 safe to build.*

### Phase 2: Identity and the Federal UI Foundation
**Goal**: A cargo specialist signs in on an accessible USWDS screen and holds a session, so that every decision she takes from here on names a real accountable person — and no unidentified request reaches any case data or decision surface.
**Status**: Complete (2026-09-15)
**Last Updated**: 2026-09-15T02:54:19Z
**Depends on**: Phase 1
**Requirements**: F1, F2
**Non-functional carried**: NFR-1, NFR-2 (foundation + this screen's sign-off), NFR-8, NFR-12
**Success Criteria** (what must be TRUE):
  1. A specialist signs in with her credentials on a USWDS sign-in screen and reaches the application; she can sign out deliberately, and an unattended session expires on its own rather than lending her accountability to whoever sits down next.
  2. Every route but sign-in refuses an unidentified caller — an HTML request redirects to sign-in and preserves where she was headed, an API request returns `401` — so there is no way into case data that skips identification.
  3. The actor on a request is the signed-in specialist as resolved by the server; a request that tries to name a different actor is rejected rather than honoured. *(no screen)*
  4. The whole sign-in and sign-out path completes by keyboard alone with visible focus, errors arrive in an announced, focus-managed summary, and the screen carries a written accessibility review sign-off including an assistive-technology walkthrough.
  5. Navigation offers only the two places this product has, so nothing on screen implies a dashboard, report, metric or second role the product deliberately does not have.
**Plans**: 9 plans in 7 waves
- [ ] 02-01-PLAN.md — Web-tier workspace and pinned dependencies, the shared session contract and Y2 error union, config with its startup self-checks (wave 1)
- [ ] 02-02-PLAN.md — Cross-cutting HTTP: redacting logger, request correlation, the §4.5 CSP with no frame-blocking header, cookie helper, errorMapper (wave 2)
- [ ] 02-03-PLAN.md — Identity below HTTP: specialists/sessions repositories, Argon2id session service with throttle, the create-specialist CLI, the DB suite (wave 2)
- [ ] 02-04-PLAN.md — Session/CSRF/HTML-guard middleware, the three session endpoints, app assembly, bootstrap on 0.0.0.0:3000, context-boot + session API suite (wave 3)
- [ ] 02-05-PLAN.md — USWDS Sass/asset pipeline and the shell: landmarks, skip link, the two-destination nav, live regions, focus and title, shared state components (wave 4)
- [ ] 02-06-PLAN.md — Governance suite: the unauthenticated matrix over all ten routes, the server-resolved actor, clock-driven idle and absolute expiry (wave 4)
- [ ] 02-07-PLAN.md — The sign-in screen on the reduced shell, the inherited form + error-summary pattern, the typed API client, keyboard-only and in-iframe e2e (wave 5)
- [ ] 02-08-PLAN.md — Multi-stage Dockerfile and the compose web service: migrate → idempotent account bootstrap → serve, out-of-band liveness, demonstration README (wave 6)
- [ ] 02-09-PLAN.md — Criterion-5 and D-1 architecture assertions, the USWDS conformance register, and the signed accessibility reviews with an AT walkthrough (wave 7)

*Criterion 3 is a structural property with no screen: it is asserted by driving every reachable attempt to name a different actor — body property, header, second cookie, query parameter — and watching each be rejected or ignored, the Phase 2 analogue of Phase 1's refusal suites. Criterion 4's deliverable is a signed record at `docs/a11y/{screen}.md` including an assistive-technology walkthrough, because NFR-2 excludes an automated accessibility gate and the review is therefore the only enforcement mechanism there is.*

### Phase 3: Receive, Validate, Except
**Goal**: A cargo specialist types a cargo entry into a USWDS form and is told plainly what happened to it — validated clean, or an exception opened with a case reference she can follow — with no entry ever able to exist having been received but never assessed.
**Status**: Complete (2026-09-15)
**Depends on**: Phase 2
**Requirements**: F3, F4, F5, F6
**Non-functional carried**: NFR-11, NFR-2 (this screen's sign-off), NFR-6 (applied to the receipt transaction)
**Success Criteria** (what must be TRUE):
  1. She completes the entry form by keyboard alone and submits a deliberately incomplete entry; the browser assists but never pre-empts, and the server decides the outcome.
  2. The receipt outcome is stated and announced — "validated clean", or "exception opened" with a case reference that links straight to the case — never left to be read out of an absence of errors.
  3. Every unsatisfied rule is reported in one pass, each finding named in plain language and bound programmatically to its field, with an error summary that moves focus; identical entry content always yields identical findings.
  4. An exception exists only where a validation failure exists — no API shape, screen affordance or application-role SQL path can author one directly — and every open case carries its findings as its stated basis with an immutable receipt position. *(no screen)*
  5. When any part of receipt fails, nothing at all is saved: no entry without its assessment, no exception without its entry, no orphan audit entry — proven by forcing a failure mid-transaction and finding the database unchanged. *(no screen)*
**Plans**: TBD

### Phase 4: The Receipt-Ordered Queue
**Goal**: A cargo specialist sees every open exception as one receipt-ordered list and opens the next one in a single action, so she spends her attention deciding cases rather than deciding which case to decide.
**Status**: Complete (2026-09-15)
**Depends on**: Phase 3
**Requirements**: F7, F8
**Non-functional carried**: NFR-2 (this screen's sign-off), NFR-10
**Success Criteria** (what must be TRUE):
  1. Open exceptions appear as a single accessible list in receipt order — identical across repeated loads — each row carrying its case reference, receipt time and why it is open.
  2. A row opens the case in one activation by keyboard or pointer, and returning from a case puts her back in the list without re-orienting.
  3. A decided case leaves the list while remaining reachable by its case reference, so what is listed is exactly what still needs a decision.
  4. There is nothing to choose: no filter, sort, assignment, priority or aging control appears on screen, and the API rejects any query string outright rather than silently ignoring it. *(no screen, in part)*
  5. An empty queue states plainly that there is nothing to work and offers the route to create an entry.
**Plans**: 4 plans in 4 waves
- [ ] 04-01-PLAN.md — Contract DTOs + read-only repositories for the queue and case-detail projections (wave 1)
- [ ] 04-02-PLAN.md — queue.service.ts and caseRead.service.ts: failure-summary derivation, truncation, permitted_decisions matrix (wave 2)
- [ ] 04-03-PLAN.md — The two F7 routes, route-table wiring, and the architecture/boot/API regression suites (wave 3)
- [ ] 04-04-PLAN.md — The F8 review-queue screen, its Playwright proof, and the NFR-2 accessibility sign-off (wave 4)

### Phase 5: AI Recommendation as an Un-Applied Proposal
**Goal**: A cargo specialist reads why the case is open, what the AI recommends and why, with every machine-proposed value marked as the machine's at the moment she is deciding — and the case remains readable and workable when the AI does not answer at all.
**Status**: Complete (2026-09-16)
**Depends on**: Phase 4
**Requirements**: F9, F10
**Non-functional carried**: NFR-4 (rendered), NFR-9, NFR-10, NFR-2 (this screen's sign-off)
**Success Criteria** (what must be TRUE):
  1. Opening a case shows the values as she typed them, the validation findings in plain language, and the AI's recommended action with a rationale intelligible enough to agree or disagree with — traversable by heading in that order.
  2. Every AI-proposed value is marked AI-originated in text and shape, not by colour alone, legible through a screen reader and in monochrome, so she can tell the machine's values from her own on sight rather than by reconstructing it from the trail afterwards.
  3. The recommendation sits on the case un-applied: no entry value and no exception state changed when it arrived, and the model identity, prompt version and generation time are recorded so "what did the AI say" is answerable exactly as it was said. *(no screen, in part)*
  4. Submitting an entry never waits on the AI — receipt completes on its own terms and the suggestion catches up, showing accessible in-progress status without freezing the interface or trapping her on the case.
  5. With the AI provider stopped, the entry is still received, the exception still opens, and the case still opens showing "no recommendation available" as a stated condition of the case — not an error, not a spinner that never ends, and not a reason to park the case.
**Plans**: 6 plans in 4 waves
- [ ] 05-01-PLAN.md — RecommendationProvider abstraction, FR-9.7/9.8 output schema, prompt-manifest digest self-check, FakeProvider, config.ts AI self-checks (wave 1)
- [ ] 05-02-PLAN.md — Recommendation write repositories (idempotent status transitions), AI-safe entry/exception reads, the cargoexec_ai privilege-wall proof (wave 1)
- [ ] 05-03-PLAN.md — The F9 polling endpoint (GET .../recommendation), route-table wiring (wave 1)
- [ ] 05-04-PLAN.md — The real HTTP provider adapter, the generation job + in-process worker, dispatch wiring, A-1 architecture proof (wave 2)
- [ ] 05-05-PLAN.md — ProvenanceBadge, the F10 case-detail screen (header/findings/entry/recommendation + Phase-6 stubs), router wiring (wave 3)
- [ ] 05-06-PLAN.md — Playwright end-to-end proof, NFR-2 accessibility sign-off, full phase verification (wave 4)

*Criterion 5 covers the resilience promise as far as this phase can: the decision path itself is only present from Phase 6, so Phase 6 criterion 5 re-walks the degraded case through to a recorded resolution.*

### Phase 6: The Human Decision and the Record That Explains It
**Goal**: A cargo specialist edits, approves or rejects the recommendation with a reason the record keeps, and then reads the whole story of the case inside the case — **closing the governed loop end to end** — with no path by which anything resolves without her.
**Depends on**: Phase 5
**Requirements**: F11, F12, F14
**Non-functional carried**: NFR-5, NFR-7, NFR-2 (these screens' sign-off), NFR-4 (per-value re-stamping), NFR-6 (decision transaction)
**Success Criteria** (what must be TRUE):
  1. Approve, Edit and Reject are presented as three equally available actions with nothing pre-selected, and edit and reject refuse to complete without a substantive reason — a missing one returns as an inline, announced, focus-managed error rather than being quietly accepted.
  2. After an edit-and-approve, the record says field by field which values became hers and which stayed the machine's, and she sees what will be recorded before it is recorded and what was recorded afterwards.
  3. The audit trail is read inside the case and answers who decided, what the AI recommended, what the human changed and why — in full, with before and after values and the reason verbatim — with no export, query tool or second system, and no edit, correct or delete affordance anywhere on it.
  4. Nothing resolves without her: no worker, scheduler, retry path, batch shape or API call can move an exception out of `OPEN` without her authenticated decision, and a case already decided refuses a second decision with a clear statement of what is already true instead of silently overwriting it. *(no screen)*
  5. The complete loop — sign in → enter an entry → watch it fail validation → find the case in the queue → read the recommendation → decide with a reason → read the audit trail — is walked in one unbroken browser session, keyboard-only, with hand-created data and no workaround; and walked again with the AI provider stopped, still producing a full audit record.
**Plans**: TBD

## Requirement Coverage

| Requirement | Phase | Loop stage carried |
|-------------|-------|--------------------|
| F0 — case data model & append-only audit store | Phase 1 | substrate |
| F13 — audit entry writer | Phase 1 | audit (write) |
| F1 — specialist authentication & session | Phase 2 | accountable identity |
| F2 — USWDS shell & accessibility foundation | Phase 2 | federal UI foundation |
| F3 — manual cargo entry creation (API) | Phase 3 | receive |
| F4 — required-information validation on receipt | Phase 3 | validate |
| F5 — exception creation from validation failure | Phase 3 | except |
| F6 — cargo entry web UI | Phase 3 | receive (screen) |
| F7 — review queue (API) | Phase 4 | except → queue |
| F8 — review queue web UI | Phase 4 | queue (screen) |
| F9 — AI resolution recommendation generation | Phase 5 | recommend |
| F10 — case detail & recommendation presentation UI | Phase 5 | recommend (screen) |
| F11 — human decision processing (API) | Phase 6 | human decide |
| F12 — decision web UI with reason capture | Phase 6 | human decide (screen) |
| F14 — per-case audit trail web UI | Phase 6 | audit (read) — **loop closes** |

**Coverage: 15 / 15 v1 functional requirements mapped, each to exactly one phase. No orphans, no duplicates.**

### Non-functional coverage

| NFR | Phase(s) where it is met |
|-----|--------------------------|
| NFR-1 USWDS conformance | 2 (foundation), then each UI phase 3, 4, 5, 6 |
| NFR-2 Section 508 / WCAG 2.1 AA | 2 (foundation + sign-in sign-off), then per-screen sign-off in 3, 4, 5, 6 — no CI gate, ever |
| NFR-3 Audit immutability | 1 |
| NFR-4 Per-value provenance | 1 (stored), 5 (rendered on the case), 6 (re-stamped on edit) |
| NFR-5 Human-in-the-loop / no auto-apply | 1 (database refusal), 6 (verified by test, no path exists) |
| NFR-6 Audit completeness | 1 (coupling triggers), 3 (receipt), 6 (decision) |
| NFR-7 Traceability without external tooling | 6 |
| NFR-8 Security & access control | 2 |
| NFR-9 AI dependency resilience | 5, re-walked end to end in 6 |
| NFR-10 Responsiveness | 4, 5 |
| NFR-11 Determinism of validation | 3 |
| NFR-12 Platform (desktop + tablet, no native mobile) | 2 (shell), inherited by 3, 4, 5, 6 |

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Governed Record Substrate | 0/TBD | Complete | 2026-09-14 |
| 2. Identity and the Federal UI Foundation | 0/TBD | Complete | 2026-09-15 |
| 3. Receive, Validate, Except | 0/TBD | Complete | 2026-09-15 |
| 4. The Receipt-Ordered Queue | 0/TBD | Complete | 2026-09-15 |
| 5. AI Recommendation as an Un-Applied Proposal | 0/TBD | Complete | 2026-09-16 |
| 6. The Human Decision and the Record That Explains It | 0/TBD | Not started | - |

---
*Roadmap created: 2026-09-12*