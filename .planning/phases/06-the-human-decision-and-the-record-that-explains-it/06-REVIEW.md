---
phase: 6
status: clean
blockers: 0
warnings: 0
files_reviewed: 2
files_reviewed_list:
  - web/src/components/DecisionPanel.tsx
  - server/src/services/decision.service.ts
reviewed_at: 2026-09-16T13:10:00Z
iteration: 2
---

# Phase 6 Code Review

Re-review after the fixer applied W1 (4a98cc3) and W2 (73e4285) from iteration 1.
Scope: the two fixer-touched files. `git diff 97331ed HEAD` confirms exactly those
two source files changed since iteration 1 (14 insertions, 2 deletions), so no
other iteration-1 file needed re-reading. Both previous WARNINGs are verified
fixed by reading the applied code (not the commit message), the fixes introduced
no regressions, and both projects type-check clean. Status: clean.

## BLOCKERs

None.

## WARNINGs

None.

## Previous findings — verification

### W1 (fixed, verified) — summary-stage server field error no longer emits a dead link
- **File:** web/src/components/DecisionPanel.tsx:340
- The `default:` (non-conflict 4xx/5xx) branch of `recordDecision`, which runs
  while `stage === 'summary'`, now calls `setErrors([{ message: err.message }])`
  — the `controlId: 'decision-reason'` is gone. Verified against the
  `ErrorSummary` contract at the source: `ErrorSummary.tsx:78–90` branches on
  `item.controlId !== undefined`; an item WITHOUT a `controlId` renders as a
  `<span>` plain text node (line 89), never an `<a href="#…">` whose
  `focusControl` click handler would resolve to nothing. The dead in-page link is
  eliminated at root and the message text is still shown + announced
  (`announceError(err.message)` unchanged).
- Regression check: the `continueToSummary` reason gate (line 253–258) correctly
  RETAINS `controlId: 'decision-reason'` because it fires on the edit/reject
  stage where the `#decision-reason` textarea exists (TextAreaField id at lines
  551 / 590), so that in-page link is still live. `EditForm`/`RejectForm` still
  derive `reasonInvalid`/`reasonError` from `errors.some(e => e.controlId === …)`
  — those consumers are on form stages, never the summary, so the field-less
  summary error cannot mis-flag a form control. No other branch touched.

### W2 (fixed, verified) — HUMAN prior_origin invariant is documented, behavior unchanged
- **File:** server/src/services/decision.service.ts:428–435 (comment), 441 (logic)
- The fix is comment-only: an 8-line INVARIANT block was inserted above the
  returned object; the `prior_origin: (prior === null ? null : 'HUMAN')`
  expression at line 441 is byte-for-byte unchanged. Verified the invariant is
  real, not a hand-wave: `entry.values` is a `CanonicalEntryRecord` (fixed 14-key
  record, each value `string | null`) from `loadEntryDetail`
  (entries.ts:249–264), and `s.field_name` is pre-validated as a member of
  `ENTRY_FIELD_SET` (line 418), so `prior` is always a defined `string | null` —
  there is no `undefined` path that would slip past the `=== null` test. The
  `HUMAN`-for-present / `null`-for-unset mapping is therefore correct.
- Regression check: no behavioral edit, no new import, no signature change.

## Static verification
- `tsc -b contract server` → exit 0 (clean).
- `tsc -p web --noEmit` → exit 0 (clean).

## Cross-file seams checked
- DecisionPanel `default:` branch error shape (`SummaryItem` without `controlId`)
  ↔ `ErrorSummary` render contract (span vs anchor) — OK.
- DecisionPanel `continueToSummary` error shape (with `controlId`) ↔ EditForm/
  RejectForm `reasonInvalid`/`reasonError` derivation ↔ live `#decision-reason`
  control — OK.
- `editApproveDirect` return shape (`ResolutionValue`) ↔ `toDto`/`auditRowFor`
  consumers unchanged (comment-only fix) — OK.
- `entry.values[field]` type (`CanonicalEntryRecord`, always defined) ↔ the
  `prior === null` guard — OK.
