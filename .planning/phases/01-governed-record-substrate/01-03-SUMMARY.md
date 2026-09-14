---
phase: 01-governed-record-substrate
plan: 03
subsystem: database
tags: [canonical-json, sha256, hash-chain, audit, tamper-evidence, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-governed-record-substrate (plan 01-01)
    provides: "npm workspace + tsconfig.base.json (strict, noUncheckedIndexedAccess), vitest harness"
provides:
  - "server/src/db/canonical.ts — the single shared canonical serialiser + entry-hash computation used byte-for-byte by the audit writer and the SQL verifier"
  - "canonicalJson(value): deterministic JSON (UTF-16 key sort, no whitespace, null, microsecond RFC 3339, fixed-scale decimals, verbatim strings, throws on undefined)"
  - "computeEntryHash(entry, prevHash): SHA-256 over canonical JSON ‖ prev hash, value rows sorted by field_name"
  - "ZERO_HASH (32 zero bytes genesis link), sha256(input), fixedScale(value, scale)"
  - "TEST-UNIT-04 with a pinned fixed hash vector as a regression anchor"
affects: [01-05, 01-06, 01-10, F0, F13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One canonical serialiser implemented once (db/canonical.ts) and shared by writer + verifier so both compute identically (TechArch §2.12)"
    - "Explicit recursive serialiser instead of JSON.stringify+replacer — guarantees key order and rejects undefined loudly"
    - "Fixed-scale decimals formatted from the pg numeric string, never through a parsed float (no drift)"
    - "Value rows normalised (sorted by field_name) inside the hash, so reordering is detectable and not maskable by the caller"
    - "Fixed hash vector pinned in test as a regression anchor — any change to it means every prior audit entry's chain silently changed meaning"

key-files:
  created:
    - "server/src/db/canonical.ts"
  modified:
    - "server/test/unit/canonical.spec.ts"

key-decisions:
  - "ZERO_HASH is a plain Buffer.alloc(32), not Object.freeze'd — Node throws when freezing a typed-array view with elements; immutability of the genesis link is guaranteed instead by defensive Buffer.from copies at every internal use site"
  - "Microsecond RFC 3339 comes from date.toISOString() with the fractional part padded to six digits; a JS Date only carries ms so the low three digits are always 000 — genuine microseconds are passed as a pre-formatted string that serialises verbatim"
  - "fixedScale truncates (never rounds) extra fractional digits and normalises -0 to a non-negative token, so equal values always hash equally"

patterns-established:
  - "Purity by construction + a build-time grep guard: canonical.ts imports no db driver, reads no env/clock, draws no randomness (T-01-15 companion)"

# Metrics
duration: 4min
completed: 2026-09-12
---

# Phase 1 Plan 03: Canonical Serialisation & Hash Chain Summary

**A pure `db/canonical.ts` computing deterministic canonical JSON and the SHA-256 per-case entry-hash chain — the shared algorithm that makes a removed, altered, or reordered audit entry detectable — pinned by a fixed 32-byte hash vector in TEST-UNIT-04.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-09-12T13:22:57Z
- **Completed:** 2026-09-12T13:26:45Z
- **Tasks:** 2
- **Files modified:** 1 created, 1 modified

## Accomplishments
- `canonicalJson` produces byte-identical output across processes, locales, and object key insertion order (proven by a child-process assertion, the RTM TEST-UNIT-04 requirement).
- `computeEntryHash` implements TechArch §2.12 exactly: SHA-256 over the canonical JSON of the thirteen scalar keys plus `values`, byte-concatenated with the 32-byte previous hash; value rows are sorted internally by `field_name`, so reordering the array cannot change (or hide) a row.
- A fixed 32-byte hash vector (`367a71b6…aec15939`) is pinned as a regression anchor with a comment explaining that any change to it means the chain of every previously written entry has silently changed meaning.
- The module is pure — no database driver, no environment, no clock, no randomness — verified by a build-time grep guard.
- Full unit suite green: 23 tests (19 new + 4 existing), `tsc -b` clean under strict + `noUncheckedIndexedAccess`.

## Task Commits

Each task was committed atomically (RED → GREEN):

1. **Task 1: Failing unit suite (TEST-UNIT-04)** — `a03261f` (test)
2. **Task 2: Implement canonical.ts, suite green** — `fd06d6e` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md, committed after self-check)_

## Files Created/Modified
- `server/src/db/canonical.ts` — `canonicalJson`, `sha256`, `computeEntryHash`, `ZERO_HASH`, `fixedScale`, `CanonicalDecimal`, `Origin`, `CanonicalAuditValue`, `CanonicalAuditEntry`
- `server/test/unit/canonical.spec.ts` — 19 assertions across key order, whitespace, null, microsecond timestamps, fixed-scale decimals, verbatim strings, fixed vector, value-row ordering, chain sensitivity, cross-process determinism

## Integration contract (for plans 01-05 / 01-06 / 01-10)

Exported signatures the audit writer and the SQL-verifier parity check depend on:

```ts
export const ZERO_HASH: Buffer;                         // 32 zero bytes
export function sha256(input: Buffer | string): Buffer; // 32-byte digest
export function canonicalJson(value: unknown): string;
export function fixedScale(value: string | number, scale: number): CanonicalDecimal;

export type Origin = 'AI' | 'HUMAN';
export type CanonicalAuditValue = {
  field_name: string;
  before_value: string | null;
  before_origin: Origin | null;
  after_value: string | null;
  after_origin: Origin | null;
  changed: boolean;
};
export type CanonicalAuditEntry = {
  case_id: string; case_sequence: number; action_type: string;
  actor_type: 'SPECIALIST' | 'AI' | 'SYSTEM'; actor_specialist_id: string | null;
  occurred_at: Date; exception_id: string | null; recommendation_id: string | null;
  decision_id: string | null; before_state: string | null; after_state: string;
  reason: string | null; request_id: string | null; values: CanonicalAuditValue[];
};
export function computeEntryHash(entry: CanonicalAuditEntry, prevEntryHash: Buffer): Buffer;
```

**Hashed payload:** exactly the thirteen scalar keys above plus `values` — no `id`, `global_sequence`, `entry_hash`, or `prev_entry_hash`. `values` is sorted by `field_name` (plain `<`) inside `computeEntryHash`.

**Microsecond timestamp format:** RFC 3339 UTC, six fractional digits, always from the epoch value — e.g. `2026-09-11T14:32:07.512000Z` (a JS `Date` yields `…512000Z`; genuine microseconds are passed as a verbatim string).

**Pinned fixed hash vector:** `computeEntryHash(fixtureEntry, ZERO_HASH)` = `367a71b6a3e546fc4f9b5ffb9a1cd259c8fa42fb9a1f4fd522447871aec15939`. The SQL verifier's parity check (plan 01-10) must reproduce this exact value.

## Decisions Made
- **`ZERO_HASH` is not `Object.freeze`d.** The plan suggested freezing plus defensive copies; Node throws `Cannot freeze array buffer views with elements` on a `Buffer`, so immutability of the genesis link is guaranteed by the defensive-copy discipline alone (`Buffer.from(prevEntryHash)` before every hash) — the actual T-01-13 mitigation.
- **Microsecond precision from a `Date` is padding, not resolution.** JS `Date` is millisecond; the format pads to six digits, and genuine microseconds are supplied as a pre-formatted RFC 3339 string that serialises verbatim.
- **`fixedScale` truncates extra fractional digits and formats from the string** `pg` returns, avoiding float drift (T-01-14).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dropped `Object.freeze(Buffer.alloc(32))` for `ZERO_HASH`**
- **Found during:** Task 2 (first suite run)
- **Issue:** The plan's implementation note said to prefer `Object.freeze` on the module-level `ZERO_HASH` constant. Node throws `TypeError: Cannot freeze array buffer views with elements` when freezing a non-empty `Buffer`, so module load itself failed and every test errored at import.
- **Fix:** Declared `ZERO_HASH = Buffer.alloc(32)` and rely on the defensive `Buffer.from(prevEntryHash)` copy inside `computeEntryHash` (which the plan also mandates) for the T-01-13 mitigation. No behavioural change to the hash; the genesis link still cannot be poisoned via a mutated shared buffer.
- **Files modified:** `server/src/db/canonical.ts`
- **Verification:** Module loads; all 19 assertions pass, including the `ZERO_HASH is exactly 32 bytes of 0x00` test.
- **Committed in:** `fd06d6e` (Task 2 commit)

**2. [Rule 1 - Bug] Removed a stray, invalid tree-shake line from the microsecond test**
- **Found during:** Task 2 (turning the suite green)
- **Issue:** The failing test I authored in Task 1 contained a throwaway line `canonicalJson(fixedScale('unused', 0))` intended to keep the `fixedScale` import "honest"; `'unused'` is not a decimal string, so `fixedScale` correctly threw and failed the timestamp test for the wrong reason.
- **Fix:** Deleted the line; `fixedScale` is already exercised by the decimal-scale tests, so the import remains used.
- **Files modified:** `server/test/unit/canonical.spec.ts`
- **Verification:** The microsecond round-trip test passes; suite green.
- **Committed in:** `fd06d6e` (Task 2 commit)

**3. [Rule 3 - Blocking] Reworded the purity docstring so the build-time grep guard passes**
- **Found during:** Task 2 (running the plan's `<verification>` step 4)
- **Issue:** The plan's purity guard (`! grep -Eq "from 'pg'|process\.env|Date\.now\(\)|Math\.random\(\)|randomUUID"`) matched the *documentation comment* that lists those very tokens as prohibited — a false positive on a genuinely pure module (same class of issue as 01-01's `TRUNCATE` comment guard).
- **Fix:** Reworded the docstring to describe the prohibitions without using the literal tokens ("imports no database driver, reads no environment, reads no wall clock, draws no randomness"). The code was and remains pure.
- **Files modified:** `server/src/db/canonical.ts`
- **Verification:** Both the plan's exact regex and a broader purity regex (adding `new Date()`, `readFileSync`, `writeFileSync`) now return no match; `tsc -b` still clean; suite still green.
- **Committed in:** `fd06d6e` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking).
**Impact on plan:** All three are mechanical corrections needed to make the plan's own instructions/verifications executable on this runtime (`Buffer` cannot be frozen; a comment tripped a grep guard; a self-authored throwaway line). No change to the hashing algorithm, the exported surface, or scope.

## Tooling note (not a deviation)
The plan's verify commands use `npx vitest run … --reporter=list`. Vitest 2.1.5 (this repo's pinned version) has no `list` reporter and errors at startup with `Failed to load custom Reporter from list`. Verification was run with the default reporter instead (`npx vitest run …`), which reports pass/fail per test identically. Later plans in this phase should avoid `--reporter=list` on vitest 2.1.5.

## Known Stubs
None found — `grep` for `TODO|FIXME|placeholder|not.?implemented|coming soon` across `canonical.ts` and `canonical.spec.ts` returns nothing. The module is a complete, pure implementation of TechArch §2.12.

## Issues Encountered
None beyond the three documented deviations. The cross-process determinism test compiles `canonical.ts` on the fly with the TypeScript compiler API (a devDependency) and imports it from a child Node process, satisfying the RTM "in two processes" wording without requiring a separate build step.

## Database Contract Compliance
Not applicable to this plan by design — `canonical.ts` is a **pure** module with no database, network, clock, or environment access (that purity is a phase success criterion). The DB-backed compose stack was established in plan 01-01 and is unchanged here; no compose or migration changes were made.

## Next Phase Readiness
- Ready for **01-06** (audit writer) and **01-05 / 01-10** (verifier parity): the shared canonical serialiser, the exported signatures, the microsecond timestamp format, and the pinned fixed hash vector are all in place and pinned by test.
- No blockers.

## Self-Check: PASSED

- `server/src/db/canonical.ts` present on disk (294 lines ≥ 80 min); `server/test/unit/canonical.spec.ts` present (268 lines ≥ 90 min).
- Both task commits present in history: `a03261f` (test), `fd06d6e` (feat).
- Build check: `npx tsc -b contract server` → exit 0.
- Unit suite: `npx vitest run server/test/unit` → 23 passed, 0 failed, 0 skipped.
- Purity guard (plan regex + broader) → no match; `createHash('sha256')` present.
- `## Known Stubs` present; no blocking stubs.

---
*Phase: 01-governed-record-substrate*
*Completed: 2026-09-12*
