---
phase: 1
status: issues_found
blockers: 0
warnings: 3
files_reviewed: 6
files_reviewed_list:
  - server/migrations/0011_case_anchor_lock_privilege.sql
  - server/src/db/pool.ai.ts
  - server/src/db/pool.app.ts
  - server/src/db/tx.ts
  - server/src/services/audit/writer.ts
  - server/src/services/auditRead.service.ts
reviewed_at: 2026-09-14T03:28:24Z
iteration: 1
---

# Phase 1 Code Review

Scope: the six source/migration files changed in the phase-1 branch since its
divergence point (`git diff 13bd66b..HEAD`, planning/lock/test files excluded per
policy; the `.spec.ts` and `caseFixtures.ts` files were read as corroborating
evidence for the source under review but are not themselves the review target).
`tsc -b contract server` is clean. The single-BEGIN rule holds (only `tx.ts`
issues transaction control as a statement; the writer references it in comments
only). Contract exports consumed by the writer (`ENTRY_FIELDS`,
`InternalInvariantCode`) and canonical exports (`computeEntryHash`, `ZERO_HASH`,
`CanonicalAuditEntry`, `CanonicalAuditValue`, `Origin`) all exist.

No BLOCKERs found. The writer's validation is a faithful superset of the DB
CHECK constraints (`ae_actor_pairing_chk`, `ae_reason_*_chk`,
`aev_origin_present_chk`, `aev_some_value_chk`), all writes are `$n`-parameterised,
the hash chain is read under the anchor lock, and the writer↔verifier hash parity
is proven in `chain.spec.ts` Step 2. Three WARNINGs below.

## BLOCKERs

None.

## WARNINGs

### W1: `readCaseTrail` surfaces linkage-only verification — a content-substituted entry reads as `chain_verified: true`
- **File:** server/src/services/auditRead.service.ts:179-195
- **Category:** bug (integration with the phase-6 audit-trail UI)
- **Evidence:** `readCaseTrail` computes `chain_verified` solely from
  `verify_audit_chain($1)`, which (migration 0010) checks only sequence
  contiguity and `prev_entry_hash` linkage — it never recomputes `entry_hash`
  from row content. The phase's own `chain.spec.ts` copy-D case proves this:
  a rewritten `after_state` + a rewritten value row yield
  `verify_audit_chain → (true, NULL, 5)`, and the test detects the tamper ONLY
  by an independent `computeEntryHash` recomputation (lines 815-892). The spec's
  own conclusion (chain.spec.ts:894-898) and 01-10-SUMMARY.md:108 both state
  "any future verification endpoint must run BOTH mechanisms." `readCaseTrail`
  is exactly the verification surface F14's per-case audit-trail UI consumes
  (01-10-SUMMARY.md:23,167), and it runs only one. A concrete failing state:
  an attacker (or a bug) rewrites a stored `after_state`/value leaving the chain
  columns intact → the UI would render `chain_verified: true`, a silent
  tamper-evidence gap for precisely the substitution class §2.12 says must break
  verification.
- **Refutation attempted:** The reader's doc comment is honest (it only claims to
  return `verify_audit_chain`'s result), the division of labour is a documented
  key-decision, and the UI consumer does not exist yet — so this degrades a
  future guarantee rather than breaking phase-1's goal (whose success criterion 5
  is *detectability*, proven by the test suite running both mechanisms). Hence
  WARNING, not BLOCKER. But it is flagged because the only shipped read-path is
  incomplete against its own stated contract for the mechanism it exposes, and
  the fix (recompute per-entry hashes in the reader and fold the result into
  `chain_verified`, or return a distinct `content_verified` field) is cheapest to
  land now while the hasher and row shapes are fresh, before phase 6 wires a UI
  that trusts the single boolean.

### W2: `withTransaction` interpolates `statement_timeout` into SQL while its comment claims a bind parameter
- **File:** server/src/db/tx.ts:53-56
- **Category:** bug (misleading invariant; not currently exploitable)
- **Evidence:** The comment (lines 53-55) says the ms value is formatted "into a
  `<n>ms` interval literal via a bind parameter", but the code is
  `client.query(`SET LOCAL statement_timeout = '${statementTimeoutMs}ms'`)` —
  string interpolation, no bind parameter (`SET LOCAL` cannot take one, which is
  why interpolation is used). It is safe *today* only because lines 44-48
  validate `Number.isInteger(statementTimeoutMs) && statementTimeoutMs > 0`
  before the interpolation. The defect is the false comment: a future maintainer
  who trusts "via a bind parameter" could relax or remove the integer guard (or
  route a caller-controlled value here) believing pg escaping protects them, at
  which point the interpolation becomes an injection sink. Correct the comment to
  state that safety rests on the positive-integer validation above, not on
  parameterisation.
- **Refutation attempted:** Confirmed the guard runs unconditionally before the
  interpolation and rejects any non-positive-integer, so no injection exists in
  the current code — WARNING, not BLOCKER.

### W3: duplicate `field_name`s in one entry's `values[]` are not caught by the writer; they surface as an unclassified 23505
- **File:** server/src/services/audit/writer.ts:174-243, 419-444
- **Category:** bug (poor error surface on a non-critical path)
- **Evidence:** `normaliseValues` validates each row independently but never
  checks for a repeated `field_name` within the same entry. `audit_entry_values`
  has `PRIMARY KEY (audit_entry_id, field_name)` (migration 0007:65), so a caller
  passing two value rows with the same `field_name` produces a multi-row INSERT
  (lines 438-443) that fails with SQLSTATE 23505 on the PK. That violation is NOT
  the `uq_audit_entries_case_sequence` constraint the writer classifies
  (lines 407-412), so it propagates as a raw pg error rather than a typed
  `AuditWriteError`, and — because it is raised inside the caller's transaction
  after the entry row is already inserted — it aborts the whole transaction. The
  contract promises validation raises "BEFORE any SQL is issued" (lines 142-146);
  a duplicate-field caller instead gets a half-executed transaction and an
  internal pg error, defeating that guarantee for this input class.
- **Refutation attempted:** The DB still rejects the bad write loudly (no silent
  corruption), and TypeScript callers are internal, so this is degraded error
  handling rather than a data or security hole — WARNING. Fix direction: add a
  duplicate-`field_name` check in `normaliseValues` that raises
  `AUDIT_WRITE_INVALID` before any SQL, matching the module's stated pre-SQL
  validation contract.

## Cross-file seams checked
- writer.ts → contract (`ENTRY_FIELDS`, `InternalInvariantCode`): OK — both exported from contract/src.
- writer.ts → canonical.ts (`computeEntryHash`, `ZERO_HASH`, `CanonicalAuditEntry`, `CanonicalAuditValue`, `Origin`): OK — all present; hash parity proven in chain.spec Step 2.
- writer.ts validation ↔ 0007_audit.sql CHECKs (actor pairing, reason rules, origin presence, some-value): OK — writer is a faithful superset of the DB constraints.
- writer.ts INSERT column list ↔ audit_entries schema (15 cols) and audit_entry_values (7 cols): OK — column/param counts match.
- writer.ts hash chain ↔ 0010 verify_audit_chain linkage semantics: OK for linkage; content-substitution gap in the READER surfaced as W1.
- auditRead.service.ts SELECTs ↔ audit_entries / audit_entry_values / specialists / verify_audit_chain: OK — columns, LEFT JOIN, and function signature (`uuid` param bound as text) all match; verified against passing chain.spec queries.
- auditRead return shape ↔ 01-10 plan integration_contracts.provides (`CaseTrail`/`CaseTrailEntry`/`CaseTrailValue`): OK — matches SUMMARY §readCaseTrail.
- tx.ts BEGIN/COMMIT/ROLLBACK uniqueness (rule R-L2 / TEST-ARCH-07): OK — only statement occurrences are in tx.ts; writer mentions them in comments only.
- 0011 GRANT UPDATE on cargo_entries to cargoexec_app ↔ writer's `SELECT ... FOR UPDATE` anchor lock: OK — grant is the minimum needed for FOR UPDATE; ai role deliberately not granted, consistent with pool.ai.ts privilege intent.
- pool.app.ts / pool.ai.ts exports (`getAppPool`/`getAiPool`/`close*Pool`): OK — lazy construction, no import-time socket, no src consumers yet (expected; consumed by later request paths and tests).
