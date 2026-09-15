---
phase: 3
status: clean
blockers: 0
warnings: 0
files_reviewed: 2
files_reviewed_list:
  - server/src/http/routes/entries.ts
  - server/src/db/repositories/exceptions.ts
reviewed_at: 2026-09-15T17:16:11Z
iteration: 2
---

# Phase 3 Code Review — Iteration 2 (re-review)

Re-review after the code-fixer applied iteration-1's three findings across
commits 307ead5 (B1), 69c0da8 (W1), 6ed1686 (W2). The fixer touched exactly two
source files — `server/src/http/routes/entries.ts` and
`server/src/db/repositories/exceptions.ts` — both already in the iteration-1
files_reviewed_list; the fourth commit (cba12be) only records resolutions in
this REVIEW.md. I read each changed region in full, re-derived the boundary
cases by hand, and typechecked the workspace (`tsc -b contract server` → exit 0).
All three fixes are correct and complete, and no fix introduced a regression.
Status **clean**.

## Iteration-1 findings — verification

### B1 (was BLOCKER) — large-integer numeric overflow → 500 — FIXED, verified
- **Fix:** `coerceNumerics` (entries.ts:331,340-341) now strips leading zeros
  from the integer group (`(m[1] ?? '').replace(/^0+(?=\d)/, '')`) and rejects
  when `intDigits.length > MAX_TOTAL_DIGITS − maxDecimals` in addition to the
  existing combined-total gate.
- **Boundary re-derivation (hand-checked):**
  - `quantity "123456789012"` (12 int, 0 frac): `maxIntDigits = 14−3 = 11`;
    `12 > 11` → **422 too_many_decimals**. The reported overflow is closed.
  - `quantity "99999999999.999"` (11 int, 3 frac, fits numeric(14,3)):
    `11 > 11` false, `14 > 14` false, `3 > 3` false → **accepted**. No
    over-rejection of the legal maximum.
  - `declared_value_usd "1234567890123"` (13 int): `maxIntDigits = 14−2 = 12`;
    `13 > 12` → **422**. Closed. `"999999999999.99"` (12 int, 2 frac) accepted.
  - Leading-zero legality preserved: `"0"` → `/^0+(?=\d)/` needs a following
    digit, so `"0"` is untouched (1 int digit, accepted); `"000123"` → `"123"`;
    `"0.001"` → int `"0"` (1), frac 3, accepted.
  - Sign handling: `-?` sits outside capture group 1, so `"-99999999999.999"`
    counts 11 int digits exactly as the positive form — correct.
- The 422 path emits `too_many_decimals` matching entries.spec case 10's
  assertion; the contract (routes/entries.ts:150-151 "Only unparseable or
  over-scale values are 422s") is now honoured for the integer-part case. FIXED.

### W1 (was WARNING) — untrimmed `.max()` length gate — FIXED, verified
- **Fix:** new `text(max)` helper (entries.ts:74) =
  `z.string().transform((s) => s.trim()).pipe(z.string().max(max))`, applied to
  all twelve structural text fields; the length bound now measures the trimmed
  value, matching `cargo_entries_len_chk`.
- **Regression checks (hand-traced):**
  - Numeric fields (`quantity`, `declared_value_usd`) still use `numericish`,
    NOT `text()`; their trimming stays in `coerceNumerics` (line 315) — no
    double-transform, no behavioural shift.
  - `parsed` now holds pre-trimmed strings; `collapse` (line 406) trims again —
    idempotent, so canonicalisation is unchanged. Internal whitespace is
    preserved (`.trim()` is edges-only), so verbatim storage of internal spaces
    (spec case 25 `"  abc12345678  "` → `"abc12345678"`) still holds.
  - Empty/whitespace-only (spec case 26 `''` / `'   '`) → transform yields `''`
    → passes `.max()` → `.nullish()` returns `''` → `collapse` → null. Unchanged.
  - A JSON number sent to a text field is still rejected by `z.string()` exactly
    as the prior `z.string().max()` did — no widening.
  - Over-length WITHOUT surrounding whitespace is still 422: spec case 9
    (`'A'.repeat(21)`) and case 11 (`arrival_date 'not-a-date-x'`, 12 chars,
    no edge whitespace) both remain over-length after trim → 422. Confirmed the
    fix does not weaken the length gate.
- Note (not a finding — test coverage is out of scope): no spec exercises the
  precise W1 case (a value over-length raw but legal once trimmed, e.g.
  `' ' + 'A'.repeat(20)`); the fix is nonetheless correct by construction.

### W2 (was WARNING) — bigint `receipt_position` coerced via `Number()` — FIXED, verified
- **Fix:** `toReceiptPosition(raw)` (exceptions.ts:24-34) throws on
  `!Number.isSafeInteger(n)`; both call sites — `insertException` (line 62) and
  `loadExceptionRefByEntry` (line 102) — route through it. A past-2^53 value now
  raises a loud internal-invariant error instead of silently truncating.
- **Verification:** both prior `Number(row.receipt_position)` sites replaced; no
  third call site exists (grep). `Number.isSafeInteger` also rejects `NaN`, so a
  malformed pg value fails loudly too. The contract type stays `number`
  (dto.ts ExceptionRef) per scope — no seam break. FIXED.

## Cross-file seams re-checked (fixer-touched surface only)
- `insertException` / `loadExceptionRefByEntry` return shape (`{ id, state,
  receipt_position: number }`) ↔ `ExceptionRef` (contract dto) — unchanged by
  the W2 helper; still `number`. OK.
- `EntryBody` schema keys after the `text()` refactor ↔ `ParsedBody` /
  `ENTRY_FIELDS` / `NUMERIC_FIELDS` / `canonicalise` — all fourteen keys intact,
  numeric two untouched. OK.
- `coerceNumerics` output (`Partial<Record<EntryFieldName, string>>`) ↔
  `canonicalise` consumer — signature unchanged; only the internal gate widened.
  OK.
- `tsc -b contract server` → exit 0 (no type drift introduced by any fix). OK.

No new BLOCKERs or WARNINGs. All three iteration-1 findings are resolved with no
regression on the touched surface.
