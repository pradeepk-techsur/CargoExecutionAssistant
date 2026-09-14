---
status: complete
phase: 01-governed-record-substrate
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-08-SUMMARY.md, 01-09-SUMMARY.md, 01-10-SUMMARY.md
started: 2026-09-14T14:30:00Z
updated: 2026-09-14T14:33:00Z
---

## Current Test

[testing complete]

## Tests

### 1. The audit record cannot be rewritten, even by the database owner
expected: As the schema owner in a direct psql session, UPDATE / DELETE / TRUNCATE against the audit store are all refused with "AUDIT_IMMUTABLE ... the audit store is append-only", and the stored entries remain unchanged. The two runtime roles (app, ai) are refused even earlier, at the privilege layer.
result: pass

### 2. A state change cannot be saved without its audit entry
expected: A transaction that creates a cargo entry but writes no audit entry is allowed to run its INSERT — and is then refused at COMMIT with "AUDIT_COUPLING_VIOLATION: cargo_entries insert expected 1 audit entr(y/ies), found 0". Nothing is half-saved: zero rows are left behind.
result: pass

### 3. Nothing resolves a case except a real, named human
expected: An exception cannot leave OPEN unless a decisions row names a real specialist and agrees with the state it is moving to. A fabricated specialist is refused; a phantom decision is refused; a decision that disagrees with the new state is refused at COMMIT with "HITL_VIOLATION: exception ... cannot leave OPEN without a matching human decision". A genuine human decision is accepted. The AI role is refused outright on decisions, specialists and exceptions.
result: pass

### 4. No value can exist without saying who authored it
expected: There is no route to an unattributed value. Supplying a value with a NULL origin is refused; omitting the origin column entirely is refused by NOT NULL (no default fills it in); an invalid origin like 'ROBOT' is refused; and an entry value claiming 'AI' origin is refused because entry values are constant-HUMAN by constraint.
result: pass

### 5. Tampering with the audit trail is detectable, and the verifier only reports it
expected: verify_audit_chain reports a healthy chain as verified. A forged chain link is allowed to INSERT but refused at COMMIT with "AUDIT_CHAIN_BROKEN: prev_entry_hash mismatch". Excision, alteration and reordering are each detected with the exact position of the break. The verifier repairs nothing — running it twice returns the same answer and leaves the rows byte-identical.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Self-Check

boot: n/a — phase ships no HTTP server (compose db healthy on :5432, 11 migrations applied, 14 tables, 3 roles)
data: skipped — API-only tests (every test drives SQL against fixtures the suite builds through the app's own writer)
routes_probed: 0 ok / 0 failed — no HTTP surface exists in this phase by design
cookie: n/a
browser_urls: none
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Drove it directly. As cargoexec_owner: UPDATE/DELETE on audit_entries and audit_entry_values, TRUNCATE audit_entry_values, and TRUNCATE audit_entries CASCADE were each refused with P0001 AUDIT_IMMUTABLE. As cargoexec_app and cargoexec_ai: refused with 42501 at the privilege layer. All 3 audit entries intact afterwards."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Drove it directly. The INSERT into cargo_entries SUCCEEDED at statement level; COMMIT was refused with P0001 'AUDIT_COUPLING_VIOLATION: cargo_entries insert expected 1 audit entr(y/ies), found 0'. 0 rows left behind — refusal genuinely arrives at COMMIT, not mid-transaction."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Drove it directly, as cargoexec_app (full application privileges). Fabricated specialist -> 23503 decisions_decided_by_fkey. Phantom decision_id -> 23503 exceptions_decision_fk. Decision disagreeing with the new state, with its coupling audit entry supplied so only the mismatch remained -> refused at COMMIT with P0001 'HITL_VIOLATION: exception ... cannot leave OPEN without a matching human decision'. Positive control: a genuine human REJECT decision COMMITTED, so the trigger discriminates rather than blanket-refusing. AI role refused 42501 on decisions, specialists and exceptions."
    confidence: proven
  - test: 4
    verdict: pass
    note: "🤖 Drove it directly. NULL after_origin -> 23514 aev_origin_present_chk. Origin column omitted entirely -> 23502 NOT NULL (proving no DEFAULT silently fills it). origin='ROBOT' -> 23514 aev_after_origin_chk. Entry value claiming 'AI' -> 23514 cefo_origin_human_chk."
    confidence: proven
  - test: 5
    verdict: pass
    note: "🤖 Drove it directly. Pristine chain verified (true, null, 3). A forged prev_entry_hash INSERTed fine but COMMIT was refused with P0001 'AUDIT_CHAIN_BROKEN: prev_entry_hash mismatch'. Chain unchanged after the refusal; a second verify returned an identical result, so the verifier reports without repairing. Unknown case returns (true, 0) rather than erroring. The phase's own chain.spec.ts additionally proves excision (false,4,3), alteration (false,3,3) and reordering (false,2,2) on four independent database copies."
    confidence: proven
suite: 193 tests green on the current tree — 23 unit + 103 db + 67 arch, 0 failures, 0 skips (npm run test)
repairs: none — the running instance was not modified; tree byte-identical to HEAD after the probe

## Gaps

[none — all five tests passed]
