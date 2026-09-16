## F15: Seeded Demonstration Case

**Priority:** P0 · **Surface:** Data / Operational tooling · **Dependencies:** F0, F3, F4, F5, F9, F11, F13 · **PRD trace:** §5.7 F15, §4.2, §10 #7 (superseded), R-9

**Description:** F15 is an idempotent, operator-run seed script that pre-loads the database with exactly one demonstration cargo case that has already progressed through the full governed loop — received → validated-failed → exception opened → AI recommendation generated with rationale → human decision recorded → audit trail written. It exists so that later-loop scenarios (recommendation review, decision, audit trail) can be demonstrated repeatably without hand-typing an entry and its validation failure live every time. This **reverses** the v1.0 exclusion at PRD §10 #7, which kept receipt and validation part of the demonstrated path precisely because no seed data existed; Phase 7 judges that trade no longer worth making once every later stage must also be shown on demand. The reversal is strictly additive: manual entry through F6 is unchanged, remains fully functional, and is the only way to create any cargo entry beyond the one seeded case (F6 §Phase 7 note).

The script produces its effect exclusively by calling the same repository/service functions the running application uses for a live request — never a migration file and never a direct `INSERT`. This is not a style preference: an existing architecture test forbids `INSERT INTO` in migration files (F0 FR-0.18), and going through the real service layer is also what makes the seeded rows structurally indistinguishable from data a specialist and the AI would have produced live, so every invariant that holds for an organic case (append-only audit, per-value provenance, no auto-apply, hash-chain integrity) holds identically for the seeded one.

**Terminology (feature-specific):**
- **Seed script:** the idempotent, operator-invoked command that creates (or verifies the presence of) the demonstration case. Not a route, not a UI control, not scheduled.
- **Demonstration case:** the one cargo case the script produces, carried through every stage of the governed loop with fixture content.
- **Demonstration specialist:** the specialist record — reused if already present, created via the same provisioning path as F1 FR-1.13 if absent — attributed as the actor for the seeded entry and decision.
- **One-time operator action:** a command run directly against the deployment by a human operator, analogous to F1's `create-specialist` CLI — never invoked by the application itself, never reachable through a session.
- **Stage-resumable seeding:** the script's behaviour of checking, at each lifecycle stage, whether that stage's row already exists and performing only the stages not yet completed, rather than an all-or-nothing single check.

**Sub-features:**
- Idempotent, stage-resumable seed command producing exactly one demonstration case
- Demonstration specialist provisioning (reuse if present, create via the F1 provisioning path if absent)
- Full lifecycle construction through the real F3 → F4 → F5 → F9 → F11 → F13 service functions
- No migration-based data insertion; compliant with the existing no-`INSERT INTO`-in-migrations architecture test
- `EDIT_APPROVE` demonstrated as the decision type, producing a resolution with both `AI`-origin and `HUMAN`-origin values on one case
- Clear operator-facing logging distinguishing "created" from "already present" at each stage
- Documentation labelling the seeded case as demonstration fixture content, never organic history

---

### Process — Seeding

1. Operator runs the seed command (e.g. `npm run seed:demo-case`) against a freshly migrated deployment. The script is never invoked by the application itself.
2. Script resolves the demonstration specialist: looks up by a reserved, clearly-labelled demonstration email. If absent, it creates one through the same account-provisioning path F1 FR-1.13 uses (never a raw `INSERT`), with a display name that visibly marks it as a demonstration account (e.g. "Demo Specialist"). If present, it is reused unchanged.
3. Script looks up the demonstration cargo entry by a reserved, fixed `entry_number`. If absent, it calls F3's entry-receipt service function with a fixed, deliberately-incomplete set of the fourteen entry field values, attributed to the demonstration specialist — the same call path a live submission takes, so F4 validation, F5 exception creation, and F13's `ENTRY_RECEIVED` / `VALIDATION_COMPLETED` / `EXCEPTION_OPENED` audit writes all fire exactly as they would for a human-typed entry. The fixture values are chosen to genuinely fail at least one `RIV-0x0` rule — the failure is real, not asserted.
4. If the resulting exception's recommendation is not already `AVAILABLE`, the script invokes F9's generation function in-process for that exception. F9's own concurrency guard (FR-9.17: act only while `status = 'PENDING'`) makes a repeated or redundant call a no-op, so the script needs no separate idempotence check of its own here.
5. If the exception does not already have a decision, the script invokes F11's decision service function with `decision_type = 'EDIT_APPROVE'`, a fixed reason of at least 10 characters, and a resolution that edits exactly one AI-proposed value (re-stamped `HUMAN` origin per F11's edit-and-approve rule) while leaving at least one other AI-proposed value unedited (retaining `AI` origin) — so the seeded case is the one place in the system that visibly demonstrates a single resolution mixing both origins. If a decision already exists, no further write is attempted; F0 FR-0.12's `UNIQUE (exception_id)` would reject a second one regardless.
6. At every stage, the audit entry for that stage is written exclusively by F13, in the same transaction as the state change it describes, exactly as for a live actor. The script introduces no audit write of its own and no alternate write path.
7. Script logs, per stage, whether it created something or found it already present, then a one-line summary (case reference, demonstration specialist email, count of audit entries), and exits `0`. Any unhandled error during a stage causes the script to exit non-zero, naming the stage that failed; because each stage uses that feature's own transaction boundary, a failure never leaves that stage's own write half-done — it only leaves later stages un-attempted, which a subsequent run resumes from.

---

### Functional Requirements

- **FR-15.1 — No migration-based insertion.** The demonstration case MUST NOT be created by a migration file or by any `INSERT INTO` statement outside the application's own repository/service layer. This complies with the existing architecture test that forbids `INSERT INTO` in migration files (F0 FR-0.18); F15 is delivered as a separate, operator-invoked script rather than as a migration.
- **FR-15.2 — Same code paths as production.** The script MUST create the demonstration case using the identical service/repository functions the running application uses for a live entry (F3), live validation (F4), live exception derivation (F5), live recommendation generation (F9), and live decision processing (F11) — never bespoke seed-only SQL and never a parallel write path. The seeded rows MUST therefore be structurally indistinguishable, in shape, from rows the application would produce from real specialist and AI activity; only their content is fixture data.
- **FR-15.3 — Idempotency and stage-resumability.** Running the script any number of times, including concurrently, against a database that already contains some or all of the demonstration case's stages MUST produce no duplicate specialist, no duplicate case, no duplicate recommendation, no duplicate decision, and no duplicate audit entry. The script MUST check, before each stage, whether that stage's row already exists and perform only the remaining stages, rather than relying on a single all-or-nothing precondition.
- **FR-15.4 — Demonstration specialist provisioning.** The script MUST attribute the seeded entry and decision to a specialist record. If no specialist with the reserved demonstration email exists, the script MUST create one through the same account-provisioning path as F1 FR-1.13 — never a raw `INSERT` — with a display name clearly labelled as a demonstration account. If that specialist already exists, the script MUST reuse it rather than creating a duplicate.
- **FR-15.5 — Decision type demonstrated: EDIT_APPROVE with mixed provenance.** The seeded case's decision MUST be `EDIT_APPROVE`, with at least one resolution value edited (re-stamped `HUMAN` origin) and at least one resolution value left as the AI's original proposal (retaining `AI` origin) — so the seeded case demonstrates, on one resolved exception, AI-origin and human-origin values coexisting in a single record (F11 edit-and-approve; F0 FR-0.2, FR-0.3).
- **FR-15.6 — Full lifecycle coverage.** The seeded case MUST pass through every stage of the governed loop in order: `ENTRY_RECEIVED` → `VALIDATION_COMPLETED` (failing, ≥ 1 finding) → `EXCEPTION_OPENED` → `RECOMMENDATION_GENERATED` (reaching `AVAILABLE`, not `UNAVAILABLE`) → `RECOMMENDATION_EDITED_AND_APPROVED`. No stage may be skipped, stubbed, or represented by a placeholder row.
- **FR-15.7 — Audit trail integrity preserved.** Every audit entry the script causes to be written MUST go through F13's single audit-writing chokepoint, MUST participate in the same per-case hash chain as any other case (F0 FR-0.7), and MUST pass the same chain-verification routine (F0 FR-0.8) as an organically produced case. No seed-specific audit bypass, no backdated or fabricated timestamp, and no manually-constructed hash value is permitted — audit timestamps are the actual wall-clock time the script ran (F0 FR-0.16).
- **FR-15.8 — No auto-apply exception for the seeded case either.** The script MUST NOT write directly to `cargo_entries`, `exceptions.state`, `decisions`, or any other governed table; it may only invoke the same service-layer functions an authenticated specialist's request would invoke, in-process, without HTTP. This preserves F9's structural guarantee (FR-9.1, FR-9.2) and F0's human-in-the-loop constraint trigger (FR-0.9) for the seeded case exactly as for any other: only a human-authored decision call — real or scripted through the identical code path — can resolve it.
- **FR-15.9 — Demonstration fixture labelling.** Any README, operator runbook, or in-repo documentation describing the seed script MUST state clearly that the seeded case is demonstration fixture data, not organic production history. No `is_seed` or similar column is introduced on any table to carry this label at the data level (no such column exists — PRD §10; F0 §Explicitly absent columns); the labelling obligation is documentation-only.
- **FR-15.10 — Operational invocation only.** The seed script MUST be runnable only as an operator-invoked command against the deployment (a CLI script or task runner target), analogous to F1 FR-1.13's `create-specialist` command. It MUST NOT be exposed as an HTTP endpoint, a UI control, a scheduled job, or any capability reachable by an authenticated specialist through the running application (F6 §Phase 7 note).
- **FR-15.11 — Exactly one demonstration case; not a general fixture tool.** The script MUST create exactly one demonstration case and MUST NOT be parameterised to create additional or varied demonstration cases, batch-generate fixture data, or otherwise serve as a general-purpose seeding/factory tool. This keeps the reversal of PRD §10 #7 narrowly scoped to what the PRD's Phase 7 update actually grants.

---

**Inputs:**
- Operator command-line invocation (no HTTP request, no session, no request body)
- Fixed demonstration entry field values, hard-coded in the script, deliberately chosen to fail at least one `RIV-0x0` rule
- Reserved demonstration specialist email and display name, hard-coded in the script
- A fixed, ≥ 10-character demonstration decision reason, hard-coded in the script

**Outputs:**
- One demonstration specialist record (created or reused)
- One demonstration cargo entry with `receipt_outcome = 'EXCEPTION_OPENED'`
- One validation result with at least one finding
- One exception in state `RESOLVED`
- One recommendation in status `AVAILABLE`, with `AI`-origin proposed values
- One decision of type `EDIT_APPROVE`, with at least one `HUMAN`-origin and at least one `AI`-origin resolution value
- The full, hash-chained sequence of audit entries F13 would write for that lifecycle
- Console log output stating, per stage, what was created versus what was already present, and a final summary line

**Validation:**
- The script MUST verify, at each stage, whether that stage's row already exists before writing (FR-15.3) rather than checking only overall case existence.
- The fixed demonstration entry values MUST pass through F3/F4's real validation logic unmodified — the script MUST NOT mark the exception as opened directly; the validation failure MUST be genuine.
- The demonstration decision's reason text MUST satisfy the same ≥ 10-character-after-trim constraint enforced by F0 FR-0.15 and F11's API validation; the script's fixed reason is chosen to already satisfy it.
- The script MUST refuse (exit non-zero) rather than silently proceed if the schema is not migrated or a dependency (F1 provisioning path, F3/F9/F11 service functions) is unavailable.

**Error States:**

| Scenario | Behaviour | Operator-visible result |
|---|---|---|
| Database not migrated / required tables missing | Script aborts before any write | Non-zero exit; message states migration is required |
| Demonstration case already fully seeded | No stage performs a write | Logs "demonstration case already present"; exits 0 |
| Demonstration case partially seeded (e.g. entry and exception exist, no decision yet) | Script performs only the remaining stages | Logs which stages ran and which were skipped as already present; exits 0 |
| Recommendation generation reaches `UNAVAILABLE` rather than `AVAILABLE` (e.g. provider unreachable when seeding) | Script stops before the decision stage, since FR-15.5 requires an `AVAILABLE` recommendation with AI-origin values to demonstrate edit-and-approve | Non-zero exit with a clear message; operator re-runs once the provider is reachable, and the script resumes from the recommendation stage |
| Concurrent invocation of the script | F3/F9/F11's own row locks and idempotence guards apply exactly as for concurrent live requests | At most one concurrent run performs each stage's write; no duplicate case results |
| Demonstration specialist email already used by an unrelated, differently-configured specialist | Script reuses the existing record rather than erroring | Logs a warning identifying the reused record; exits 0 |

**API Surface (this feature):** none. F15 is operator tooling, not a route — it is never reachable over HTTP, has no request/response schema, and is not catalogued in `Y1-api.md`.

**Schema Surface (this feature):** introduces no new table and no new column. The script writes only into existing tables — `specialists`, `cargo_entries`, `cargo_entry_field_origins`, `validation_results`, `validation_findings`, `exceptions`, `recommendations`, `recommendation_values`, `decisions`, `decision_values`, `audit_entries`, `audit_entry_values` — exclusively via F3/F4/F5/F9/F11/F13's own repository functions. No `is_seed` or equivalent flag column exists anywhere (F0 §Explicitly absent columns; PRD §10). See `Y0-schema.md` for the underlying DDL, which F15 does not modify.

**Acceptance Criteria:**
1. Running the seed script against a freshly migrated, empty database produces exactly one case in state `RESOLVED`, with a validation result containing at least one finding, a recommendation in status `AVAILABLE` with `AI`-origin proposed values, and a decision of type `EDIT_APPROVE` with at least one `HUMAN`-origin and at least one `AI`-origin resolution value.
2. Running the seed script a second time immediately afterward produces no additional case, specialist, recommendation, decision, or audit entry, and exits 0.
3. The demonstration case's audit trail passes the F0 FR-0.8 chain-verification routine with `chain_verified: true`.
4. No `INSERT INTO` statement referencing `cargo_entries`, `exceptions`, `recommendations`, `decisions`, or `audit_entries` exists in any migration file, verified by the existing architecture test.
5. Manually inspecting the demonstration case's rows shows no structural difference from a live-created case other than fixture content (entry field values, rationale text, decision reason text).
6. Deleting nothing and re-running the script after only the entry/exception stages previously succeeded completes the remaining stages (recommendation, decision) without repeating the entry receipt.
7. The seed script is not reachable via any HTTP route, and no UI control in F6, F8, F10, F12, or F14 invokes it.
8. Manual entry through F6 continues to function unchanged and remains the only way to create a cargo entry other than the one seeded case.

---
