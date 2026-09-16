## Epic 15: Seeded Demonstration Case (F15)

An idempotent, operator-run seed script — never a UI feature, never something the cargo
specialist does inside the running application — that pre-loads exactly one demonstration case
already carried through the full governed loop (received → validated-failed → exception → AI
recommendation → human decision → audit trail), so every later-loop scenario can be demonstrated
repeatably without hand-typing an entry and its validation failure live first. This **reverses**
PRD §10 #7 (Phase 7); the reversal is strictly additive — manual entry through F6 (Epic 6) is
unchanged and remains the only way to create any cargo entry beyond the one seeded case.

### US-15.1: Build the demonstration case through the same code the live application uses, never a shortcut
**As an** operator preparing a demonstration, **I want to** have the seed script create the case only by calling the real entry-receipt, validation, exception, recommendation, and decision service functions — never a migration `INSERT` and never a bespoke write path, **so that** the seeded case is governed by exactly the same invariants as a case a specialist and the AI produced live.

**Acceptance Criteria:**
- [ ] Given the seed script, when its implementation is reviewed, then it contains no `INSERT INTO` statement against `cargo_entries`, `exceptions`, `recommendations`, `decisions`, or `audit_entries`, and no migration file inserts any of them — verified by the existing architecture test that forbids `INSERT INTO` in migration files (FR-15.1, F0 FR-0.18).
- [ ] Given the script's calls, when they are traced, then entry receipt goes through F3's own service function, validation through F4, exception derivation through F5, recommendation generation through F9, and the decision through F11 — the identical functions an authenticated HTTP request would invoke, called in-process without HTTP (FR-15.2, FR-15.8).
- [ ] Given the resulting rows, when they are compared to a live-created case's rows, then no structural difference exists other than fixture content — the same columns populated the same way, the same constraints satisfied (FR-15.2).
- [ ] Given the script, when it runs, then it never writes directly to `cargo_entries`, `exceptions.state`, `decisions`, or any other governed table outside those service calls, preserving F9's structural no-auto-apply guarantee and F0's human-in-the-loop constraint trigger exactly as for any other case (FR-15.8, F0 FR-0.9).
- [ ] Given the fixture entry values, when they are submitted through F3, then they genuinely fail at least one `RIV-0x0` rule through F4's real evaluation — the failure is real, not asserted or hand-set.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.2: Run the script any number of times without creating a duplicate of anything
**As an** operator preparing a demonstration, **I want to** be able to run the seed script repeatedly — against an empty database, a partially-seeded one, or a fully-seeded one — and have it create nothing twice, **so that** re-running it before a walkthrough is always safe.

**Acceptance Criteria:**
- [ ] Given a freshly migrated, empty database, when the script runs once, then it produces exactly one demonstration specialist, one demonstration cargo entry, one validation result, one exception, one recommendation, and one decision (FR-15.3, FR-15.6).
- [ ] Given that same database, when the script runs a second time immediately afterward, then it creates no additional specialist, case, recommendation, decision, or audit entry, logs that the demonstration case is already present, and exits `0` (FR-15.3).
- [ ] Given a database where only the entry and exception stages have been seeded, when the script runs, then it performs only the remaining stages (recommendation, decision) without repeating entry receipt — checking each stage's existence individually rather than relying on one all-or-nothing precondition (FR-15.3).
- [ ] Given a reserved demonstration email that already belongs to a specialist record, when the script runs, then it reuses that record — created, if absent, only through the same account-provisioning path F1's `create-specialist` CLI uses, never a raw `INSERT` (FR-15.4).
- [ ] Given two concurrent invocations of the script, when both run against the same database, then F3/F9/F11's own row locks and idempotence guards mean at most one invocation performs each stage's write, and no duplicate case results.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.3: See one case that genuinely demonstrates a mixed AI/human resolution
**As an** operator preparing a demonstration, **I want to** have the seeded case's decision be an edit-and-approve that changes one AI-proposed value while leaving another AI-proposed value untouched, **so that** the one thing a live walkthrough most needs to show — a resolution mixing AI-origin and human-origin values on one case — is present without waiting for an organic case to arrive at it.

**Acceptance Criteria:**
- [ ] Given the seeded exception's recommendation reaches `AVAILABLE` with `AI`-origin proposed values, when the script records the decision, then it invokes F11's decision service with `decision_type = 'EDIT_APPROVE'` (FR-15.5).
- [ ] Given that decision, when its resolution values are read, then at least one value is a specialist-style correction re-stamped `HUMAN` origin and at least one other value is left as the AI's original proposal, retaining `AI` origin — one resolved case exhibiting both origins side by side (FR-15.5, F0 FR-0.2, FR-0.3).
- [ ] Given the decision's reason text, when it is checked, then it satisfies the same ≥10-character-after-trim floor that F11's API and F0's storage constraint enforce for any specialist's edit-and-approve (FR-15.5, F0 FR-0.15).
- [ ] Given the recommendation has not yet reached `AVAILABLE` when the script runs (for example, the provider is unreachable), when the script reaches the decision stage, then it stops before recording a decision rather than recording one against an `UNAVAILABLE` or still-`PENDING` recommendation, exits non-zero naming the stage, and is safe to re-run once the provider is reachable.
- [ ] Given an exception that already has a decision, when the script is run again, then no second `decisions` row is attempted — `UNIQUE (exception_id)` would reject it regardless, and the script's own stage check already skips it.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.4: Trust that the seeded case's audit trail is real, complete, and indistinguishable from a live one
**As an** operator preparing a demonstration, **I want to** have every stage of the seeded case write through the same append-only audit chokepoint as a live case, with a genuine hash chain and no fabricated timestamp, **so that** a stakeholder who opens the audit trail during the demonstration is reading the same kind of record they would get from any other case.

**Acceptance Criteria:**
- [ ] Given each stage the script completes, when its audit entry is inspected, then it was written exclusively by F13, in the same transaction as the state change it describes, exactly as for a live actor — the script introduces no audit write of its own and no alternate write path (FR-15.7).
- [ ] Given the seeded case's full audit trail, when the F0 chain-verification routine runs against it, then it reports `chain_verified: true`, the same as any organically produced case (FR-15.7, F0 FR-0.8).
- [ ] Given the timestamps on the seeded case's audit entries, when they are checked, then they are the actual wall-clock time the script ran — no backdated, future-dated, or manually-constructed timestamp or hash value exists anywhere in the seeded case (FR-15.7, F0 FR-0.16).
- [ ] Given any README, operator runbook, or in-repo documentation describing the seed script, when it is read, then it states plainly that the seeded case is demonstration fixture data, not organic production history — and no `is_seed` or similar column exists on any table to carry that label at the data level (FR-15.9).
- [ ] Given the seeded case, when it is opened in the case detail screen (F10) and its audit trail (F14), then both render it exactly as they would render any other resolved case — no seed-specific UI path, banner, or exception exists.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.5: Keep the seed script a narrow, operator-only tool that the application itself can never reach
**As an** operator preparing a demonstration, **I want to** have the seed script runnable only as a direct command-line invocation against the deployment — never as an HTTP endpoint, a UI control, or a scheduled job — and scoped to exactly one demonstration case, **so that** the reversal of the "no seeded data" exclusion stays as narrow as the PRD actually grants, and manual entry remains the only way anyone using the running application creates a case.

**Acceptance Criteria:**
- [ ] Given the deployed application's routes and UI, when they are enumerated, then no endpoint, screen, button, or scheduled job invokes the seed script — it is reachable only by an operator running it directly against the deployment, analogous to F1's `create-specialist` command (FR-15.10).
- [ ] Given the script's design, when it is reviewed, then it accepts no parameters that would let it create additional or varied demonstration cases, batch-generate fixture data, or otherwise act as a general-purpose factory — it creates exactly one demonstration case and nothing else (FR-15.11).
- [ ] Given the cargo entry web UI (F6/Epic 6), when it is used after the seed script has run, then it functions completely unchanged and remains the only way to create any cargo entry beyond the one seeded case — the seed script neither gates, replaces, nor short-circuits it (FR-15.2 process note; F6 §Phase 7 note).
- [ ] Given a database that is not yet migrated, or a dependency the script needs (F1's provisioning path, F3/F9/F11's service functions) that is unavailable, when the script runs, then it refuses and exits non-zero rather than silently proceeding or partially writing.
- [ ] Given the review queue (F7/F8) after seeding, when it is opened, then the seeded case appears in it only while its exception is `OPEN` (before the decision stage completes) and is correctly excluded once resolved — the queue treats the seeded case exactly as it treats any other, with no special-casing.

**Priority:** P0 | **Feature Ref:** F15

---
