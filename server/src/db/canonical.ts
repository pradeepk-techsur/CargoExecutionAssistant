import { createHash } from 'node:crypto';

/**
 * Canonical serialisation, hashing, and the per-case hash chain.
 *
 * TechArch §2.12 requires these algorithms be implemented **once**, here, and
 * shared byte-for-byte by the audit writer (plan 01-06) and by the SQL verifier
 * (plans 01-05 / 01-10). If the writer and verifier ever diverge, chain
 * verification is silently disabled — so this module has exactly one definition
 * of "canonical".
 *
 * PURITY: this module is a pure function of its arguments. It imports no
 * database driver, reads no environment, reads no wall clock, and draws no
 * randomness; it touches neither filesystem nor network. `occurred_at` is
 * supplied by the caller (it is the database's transaction timestamp —
 * FR-13.8). A later architecture test asserts this isolation, and a build-time
 * guard greps this file for the forbidden tokens; it is written pure now.
 */

// ── Fixed-scale decimals ────────────────────────────────────────────────────
//
// `pg` returns `numeric` columns as strings precisely so full precision
// survives. We keep them as strings and format them to a fixed scale without
// ever routing through a float — `Number.prototype.toFixed` on a parsed float
// would drift (e.g. 0.1 + 0.2). A branded type prevents a fixed-scale decimal
// being confused with a plain JSON number at a call site.

const DECIMAL_BRAND: unique symbol = Symbol('CanonicalDecimal');

export type CanonicalDecimal = {
  readonly __decimal: string;
  readonly [DECIMAL_BRAND]: true;
};

function isCanonicalDecimal(value: unknown): value is CanonicalDecimal {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[DECIMAL_BRAND] === true
  );
}

/**
 * Format `value` to exactly `scale` fractional digits from its string form,
 * emitting an unquoted JSON numeric token (`fixedScale('12.5', 3)` → `12.500`,
 * `fixedScale('1200', 2)` → `1200.00`). String-based so a value arriving from
 * `pg` as a string never loses precision through a float round-trip.
 */
export function fixedScale(value: string | number, scale: number): CanonicalDecimal {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new Error(`fixedScale: scale must be a non-negative integer, got ${String(scale)}`);
  }
  const raw = typeof value === 'number' ? numberToDecimalString(value) : value.trim();
  const token = formatFixedFromString(raw, scale);
  return { __decimal: token, [DECIMAL_BRAND]: true };
}

function numberToDecimalString(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`fixedScale: non-finite number ${String(value)}`);
  }
  // Integers and small values render exactly; anything with an exponent would
  // be ambiguous, so reject exponential notation from the number path — callers
  // with high-precision values must pass the string `pg` returned.
  const s = String(value);
  if (s.includes('e') || s.includes('E')) {
    throw new Error(`fixedScale: number ${s} in exponential form; pass the numeric string instead`);
  }
  return s;
}

function formatFixedFromString(input: string, scale: number): string {
  const m = /^(-?)(\d+)(?:\.(\d*))?$/.exec(input);
  if (m === null) {
    throw new Error(`fixedScale: not a decimal string: ${JSON.stringify(input)}`);
  }
  const sign = m[1] ?? '';
  const intPart = m[2] ?? '0';
  let frac = m[3] ?? '';

  if (frac.length > scale) {
    // Truncate extra fractional digits. Values are already at (or below) the
    // column's scale in practice; a longer input is truncated, never rounded,
    // so the token is a deterministic function of the string.
    frac = frac.slice(0, scale);
  } else {
    frac = frac.padEnd(scale, '0');
  }

  const magnitude = scale === 0 ? intPart : `${intPart}.${frac}`;
  // Normalise "-0" / "-0.00" to a non-negative token so equal values hash equally.
  if (sign === '-' && /^0(?:\.0*)?$/.test(magnitude)) {
    return magnitude;
  }
  return `${sign}${magnitude}`;
}

// ── Microsecond RFC 3339 timestamps ─────────────────────────────────────────

/**
 * A `Date` as RFC 3339 UTC with microsecond precision, e.g.
 * `2026-09-11T14:32:07.512000Z`. JavaScript `Date` only carries millisecond
 * precision, so the low three digits are always `000` for a `Date`; callers
 * needing genuine microseconds pass a pre-formatted string (which serialises
 * verbatim as a JSON string). Always formatted from the epoch value, so a
 * non-UTC representation cannot leak in.
 */
function toMicrosecondRfc3339(date: Date): string {
  const ms = date.getTime();
  if (Number.isNaN(ms)) {
    throw new Error('canonicalJson: invalid Date');
  }
  const iso = date.toISOString(); // e.g. 2026-09-11T14:32:07.512Z (always UTC, ms precision)
  // Strip trailing 'Z', pad the fractional part to six digits, re-append 'Z'.
  const body = iso.slice(0, -1); // drop 'Z'
  const dot = body.lastIndexOf('.');
  if (dot === -1) {
    return `${body}.000000Z`;
  }
  const head = body.slice(0, dot);
  const frac = body.slice(dot + 1).padEnd(6, '0').slice(0, 6);
  return `${head}.${frac}Z`;
}

// ── Canonical JSON ──────────────────────────────────────────────────────────

/**
 * Deterministic JSON used for hashing and for value comparison.
 *
 * - object keys sorted lexicographically by UTF-16 code unit (V8's default
 *   string sort — never `localeCompare`, which is locale-dependent)
 * - no insignificant whitespace
 * - `Date` → microsecond RFC 3339 UTC string
 * - SQL `NULL` (JS `null`) → JSON `null`
 * - `CanonicalDecimal` → unquoted fixed-scale numeric token
 * - strings verbatim (correct JSON escaping, no trimming / case-folding / NFC
 *   normalisation) — the record shows exactly what was typed (FR-13.11)
 * - `undefined` throws, so a missing field fails loudly instead of silently
 *   changing a hash (T-01-15)
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined) {
    throw new Error('canonicalJson: undefined is not serialisable (missing field would change the hash silently)');
  }
  if (value === null) {
    return 'null';
  }
  if (isCanonicalDecimal(value)) {
    return value.__decimal;
  }
  if (value instanceof Date) {
    return JSON.stringify(toMicrosecondRfc3339(value));
  }

  const t = typeof value;
  if (t === 'string') {
    return JSON.stringify(value); // verbatim + correct escaping, no normalisation
  }
  if (t === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error(`canonicalJson: non-finite number ${String(value)}`);
    }
    return JSON.stringify(value);
  }
  if (t === 'bigint') {
    throw new Error('canonicalJson: bigint is not supported; pass a fixed-scale decimal or string');
  }

  if (Array.isArray(value)) {
    // Arrays preserve the caller's order (value-row ordering is normalised by
    // computeEntryHash, not here).
    const parts = value.map((el) => canonicalJson(el));
    return `[${parts.join(',')}]`;
  }

  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort(); // UTF-16 code-unit order
    const parts: string[] = [];
    for (const key of keys) {
      const v = obj[key];
      if (v === undefined) {
        throw new Error(
          `canonicalJson: key ${JSON.stringify(key)} is undefined (missing field would change the hash silently)`,
        );
      }
      parts.push(`${JSON.stringify(key)}:${canonicalJson(v)}`);
    }
    return `{${parts.join(',')}}`;
  }

  throw new Error(`canonicalJson: unsupported value of type ${t}`);
}

// ── Hashing ─────────────────────────────────────────────────────────────────

/** SHA-256 of a UTF-8 string or raw Buffer, as a 32-byte Buffer. */
export function sha256(input: Buffer | string): Buffer {
  return createHash('sha256').update(input).digest();
}

/**
 * The genesis link: 32 zero bytes, used as `prev_entry_hash` at
 * `case_sequence = 1`.
 *
 * A Node `Buffer` is a typed-array view and cannot be `Object.freeze`d (Node
 * throws "Cannot freeze array buffer views with elements"), so mutation is
 * prevented by discipline instead: every internal use copies via `Buffer.from`
 * before hashing (see `computeEntryHash`), so even if a caller zeroed or altered
 * this buffer it could not poison the genesis link of another case (T-01-13).
 */
export const ZERO_HASH: Buffer = Buffer.alloc(32);

// ── Audit entry shape ───────────────────────────────────────────────────────

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
  case_id: string;
  case_sequence: number;
  action_type: string;
  actor_type: 'SPECIALIST' | 'AI' | 'SYSTEM';
  actor_specialist_id: string | null;
  occurred_at: Date; // the database's now() for the transaction (FR-13.8)
  exception_id: string | null;
  recommendation_id: string | null;
  decision_id: string | null;
  before_state: string | null;
  after_state: string;
  reason: string | null;
  request_id: string | null;
  values: CanonicalAuditValue[];
};

/**
 * Compute an entry's hash: SHA-256 over the canonical JSON of the hashed payload
 * concatenated with the 32-byte previous hash (TechArch §2.12).
 *
 * The hashed payload is exactly the thirteen scalar keys plus `values`; it does
 * NOT include `id`, `global_sequence`, `entry_hash`, or `prev_entry_hash`.
 * `values` is sorted by `field_name` with a plain `<` comparison so a caller
 * cannot change an entry's hash — or hide a row — by reordering the array
 * (T-01-11).
 */
export function computeEntryHash(entry: CanonicalAuditEntry, prevEntryHash: Buffer): Buffer {
  if (!Buffer.isBuffer(prevEntryHash) || prevEntryHash.length !== 32) {
    throw new Error('computeEntryHash: prevEntryHash must be a 32-byte Buffer');
  }

  const sortedValues = [...entry.values]
    .sort((a, b) => (a.field_name < b.field_name ? -1 : a.field_name > b.field_name ? 1 : 0))
    .map((v) => ({
      field_name: v.field_name,
      before_value: v.before_value,
      before_origin: v.before_origin,
      after_value: v.after_value,
      after_origin: v.after_origin,
      changed: v.changed,
    }));

  const payload = {
    case_id: entry.case_id,
    case_sequence: entry.case_sequence,
    action_type: entry.action_type,
    actor_type: entry.actor_type,
    actor_specialist_id: entry.actor_specialist_id,
    occurred_at: entry.occurred_at,
    exception_id: entry.exception_id,
    recommendation_id: entry.recommendation_id,
    decision_id: entry.decision_id,
    before_state: entry.before_state,
    after_state: entry.after_state,
    reason: entry.reason,
    request_id: entry.request_id,
    values: sortedValues,
  };

  const jsonBytes = Buffer.from(canonicalJson(payload), 'utf8');
  // Copy ZERO_HASH / any prev hash defensively before concatenation.
  const prevCopy = Buffer.from(prevEntryHash);
  return createHash('sha256').update(Buffer.concat([jsonBytes, prevCopy])).digest();
}
