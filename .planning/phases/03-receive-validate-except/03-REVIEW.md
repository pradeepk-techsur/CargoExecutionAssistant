---
phase: 3
status: fixed
blockers: 1
warnings: 2
files_reviewed: 18
files_reviewed_list:
  - contract/src/dto.ts
  - contract/src/errors.ts
  - server/src/db/repositories/entries.ts
  - server/src/db/repositories/exceptions.ts
  - server/src/db/repositories/validation.ts
  - server/src/http/app.ts
  - server/src/http/requireApiAuth.ts
  - server/src/http/routes/entries.ts
  - server/src/http/routes/index.ts
  - server/src/index.ts
  - server/src/services/receipt.service.ts
  - server/src/services/validation/domain.ts
  - server/src/services/validation/engine.ts
  - server/src/services/validation/index.ts
  - server/src/services/validation/normalise.ts
  - server/src/services/validation/rules.ts
  - server/src/services/validation/selfCheck.ts
  - server/src/services/validation/types.ts
  - web/src/api/client.ts
  - web/src/components/UswdsForm.tsx
reviewed_at: 2026-09-15T17:10:27Z
iteration: 1
---

# Phase 3 Code Review

Reviewed the full phase-3 change set (18 source files plus the two web files;
the 16 test/spec files in the diff were read for evidence but are out of review
scope as production behaviour). The receipt transaction, the validation engine
and registry, the two F3 endpoints, the auth gate, and the typed client are all
structurally sound and the cross-file seams line up. One defect survives
refutation as a BLOCKER: a structurally-plausible numeric input overflows the
`numeric(14,3)` / `numeric(14,2)` columns and turns into a 500 the FRD forbids.

## BLOCKERs

### B1: Large-integer numeric input overflows the DB column → 500 RECEIPT_FAILED instead of 422 (or acceptance)
- **File:** server/src/http/routes/entries.ts:319-345 (`coerceNumerics`); reaches server/src/db/repositories/entries.ts:99-100 (`$15::numeric` / `$17::numeric`)
- **Category:** bug
- **Evidence:** The structural scale check bounds only the *total* digit count
  (`totalDigits > MAX_TOTAL_DIGITS` = 14) and the *fractional* count
  (`fracDigits.length > maxDecimals`). It never bounds the **integer** part to
  the column's `precision − scale`. The columns are `quantity numeric(14,3)`
  (max 11 integer digits) and `declared_value_usd numeric(14,2)` (max 12 integer
  digits) (migrations/0002_entries.sql:22,24). A value like
  `quantity: "123456789012"` (12 integer digits, 0 decimals) has totalDigits=12
  ≤ 14 and 0 decimals, so `coerceNumerics` **accepts** it (verified by
  simulation), it is bound at `$15::numeric` into `numeric(14,3)`, and Postgres
  raises `22003 numeric field overflow` — confirmed live:
  `SELECT 123456789012::numeric(14,3)` → `ERROR: numeric field overflow`.
  Likewise `declared_value_usd: "1234567890123"` (13 integer digits) →
  `SELECT '1234567890123'::numeric(14,2)` → overflow. The error is `22003`, not
  the `23505` the service distinguishes, so it is not a duplicate; it is not the
  arrival-date `22008` the service pre-empts either. It propagates out of
  `runReceipt`, the transaction rolls back, and `errorMapper` answers the
  generic **500 RECEIPT_FAILED**. Both the JSON-number path (`String(n)` with no
  `e`) and the numeric-string path reach it. This directly contradicts the
  stated contract: routes/entries.ts:143-145 ("Only unparseable or over-scale
  values are 422s") and entries.ts repo header (arrival-date §): "a malformed
  value MUST NOT become a 422 — nor a 500". A structural input the client
  supplied crashes the receipt with a message telling the specialist nothing was
  saved. No test exercises the integer-overflow case (entries.spec.ts case 10
  only covers `abc`, `1.2345`, `"0"`, `-5`).
- **Fix direction:** In `coerceNumerics`, additionally reject when the integer
  digit count exceeds `MAX_TOTAL_DIGITS − maxDecimals` for the field (11 for
  quantity, 12 for declared_value) with a 422 `too_many_decimals`/over-scale
  detail — i.e. bound the integer part to the column's `precision − scale`, not
  just the combined total. (Or treat over-precision as F4 business only if the
  column widened; it has not, so the 422 guard is the correct fix here.)
- **Resolution:** fixed (307ead5) — bound the integer digit count to
  `MAX_TOTAL_DIGITS − maxDecimals` (11 for quantity, 12 for declared_value) in
  `coerceNumerics`, refusing an over-precision value with a 422
  `too_many_decimals`. Leading zeros are stripped before the count so a legal
  zero-padded value is not spuriously rejected. Verified: tsc clean; api
  entries.spec case 10 green.

## WARNINGs

### W1: Structural `.max()` length check runs on the untrimmed value, so a leading/trailing space makes a would-be-valid value a 422
- **File:** server/src/http/routes/entries.ts:69-86 (`EntryBody`) vs 388-395 (`collapse` trims only afterward)
- **Evidence:** Zod's per-field `.max(n)` is applied to the raw submitted string
  BEFORE canonicalisation trims it. `canonicalise`/`collapse` trims and the DB
  `cargo_entries_len_chk` measures the trimmed stored value, but the schema does
  not. So `entry_number: " AAAAAAAAAAAAAAAAAAAA"` (a leading space + 20 chars =
  21) is refused `422 REQUEST_MALFORMED` for over-length, even though the value
  actually stored would be 20 chars and legal. Similarly a valid
  `arrival_date: " 2026-02-15"` (11 chars pre-trim) is 422 over-length instead
  of being accepted. FR-3.8 makes leading/trailing whitespace insignificant
  ("empty string, whitespace-only and absent are treated identically"), which
  argues the length gate should measure the trimmed value. Degraded edge-case
  handling on an otherwise-correct path — real, but not corrupting or blocking.
- **Fix direction:** Trim before the length check (e.g. `.transform(s => s.trim())`
  ahead of `.max()`, or move the `.max()` bound onto the canonical value), so the
  structural length gate and the stored-value length constraint measure the same
  string.
- **Resolution:** fixed (69c0da8) — introduced a `text(max)` schema helper that
  `.transform(s => s.trim())` before `.pipe(z.string().max(max))`, applied to all
  twelve structural text fields. The length gate now measures the trimmed value,
  matching `cargo_entries_len_chk`. Verified: tsc clean; api entries.spec (27)
  and unit canonical.spec (19) green.

### W2: `receipt_position` / bigint sequence coerced through `Number()` loses precision past 2^53
- **File:** server/src/db/repositories/exceptions.ts:46,86
- **Evidence:** `receipt_position` is a `bigint` (pg returns it as a string) and
  both `insertException` and `loadExceptionRefByEntry` do `Number(row.receipt_position)`.
  The inline comment acknowledges this ("far below Number.MAX_SAFE_INTEGER for
  any realistic receipt volume"). For the demonstration's scale this is fine, so
  it is a WARNING, not a BLOCKER — flagged only because the coercion is silent
  and the contract types `receipt_position` as `number` (dto.ts:125), meaning a
  future high-volume deployment would truncate without any error. Stated
  uncertainty: within phase-3 scope this is genuinely non-blocking.
- **Resolution:** fixed (6ed1686) — centralised the bigint→number coercion in a
  `toReceiptPosition()` helper used by both `insertException` and
  `loadExceptionRefByEntry`; it throws when the value is not a safe integer,
  turning a silent past-2^53 truncation into a loud internal-invariant breach.
  The contract type (`number`) is left intact per scope. Verified: tsc clean; db
  exceptionBasis.spec (14) and receipt.spec (16) green.

## Cross-file seams checked
- POST/GET /api/entries (routes/index.ts) ↔ API_ROUTE_TABLE `implemented: true` + app.ts 405/404 map — OK (five implemented rows, boot asserts five).
- `receiveEntry(deps, submitted, provided)` signature ↔ route call site (entries.ts:158-166) — OK (deps shape, canonical record, provided list all match).
- `evaluate(record, receivedAt)` engine ↔ receipt service call (receipt.service.ts:187) — OK; `ValidationEvaluation` fields all consumed.
- `insertEntry` 18-column bind order ↔ `cargo_entries` column list (migration 0002) — OK (14 fields + 4 header cols, casts at $15/$17/$18).
- `EntryCreateRequest` / `ReceiptResponse` / `EntryDetailResponse` (contract) ↔ web client `createEntry`/`getEntry` (client.ts:228-242) — OK, types imported and returned unchanged.
- `EntryFieldName` / `ENTRY_FIELDS` (contract fields.ts) ↔ EntryBody schema keys, rules.ts, selfCheck ENTRY_FIELD_SET, engine ENTRY_FIELD_SET — OK, all 14 aligned.
- `INTERNAL_INVARIANT_CODES` 9th code `VALIDATION_ENGINE_FAILURE` ↔ scaffolding.spec expectation — OK (deferred-items records it reconciled by 341e032; SUMMARY 03-04/03-06 confirm test:unit green).
- `requireApiAuth` ordering (app.ts session→requireApiAuth→csrf) ↔ 401-before-403 guarantee — OK; POST /api/session exemption present.
- `ExceptionRef` (state/receipt_position) shape ↔ `loadExceptionRefByEntry` return + receipt service `exceptionRef` — OK.
- `evaluated_at` produced by DB `now()` (insertValidationResult / loadValidationByEntry) ↔ never a clock read in engine — OK (FR-4.4 honoured).
- Known stubs (DateField USWDS no-op, D-1) verified non-blocking: plain text input is keyboard-operable and submits as typed; genuinely cosmetic — no escalation.
