/**
 * The "normalised comparison value" transformations for the RIV-2026.09 rule
 * set.
 *
 * F4 §Terminology is precise: a normalisation is "applied only for the purpose
 * of evaluating a predicate. The stored entry value is never normalised (F3)."
 * Every function here is therefore PURE: it takes `string | null`, returns a new
 * value, mutates nothing, and is never used to build the value that is stored.
 *
 * R-L10: no module under services/validation/ may import a clock, a pool, a
 * repository, node:crypto, express, pg, or anything that reaches the network.
 * The temporal helpers below use only integer arithmetic on parsed components —
 * they never read the ambient clock (no zero-argument Date construction) and
 * never touch the local timezone.
 */

/**
 * Identity trim. The canonical record is already trimmed (F3 FR-3.8), so this
 * simply lets a presence rule read explicitly. Returns null unchanged.
 */
export function trimOnly(v: string | null): string | null {
  return v === null ? null : v.trim();
}

/** Present = non-null and non-empty after the canonical trim. */
export function isPresent(v: string | null): boolean {
  return v !== null && v.length > 0;
}

/** Uppercase, then remove hyphens and spaces (RIV-011). */
export function upperAlnum(v: string | null): string {
  if (v === null) return '';
  return v.toUpperCase().replace(/[-\s]/g, '');
}

/** Uppercase, then remove spaces (RIV-072). */
export function upperNoSpace(v: string | null): string {
  if (v === null) return '';
  return v.toUpperCase().replace(/\s/g, '');
}

/** Uppercase only (RIV-021, RIV-041, RIV-051, RIV-081, RIV-111). */
export function upperKeepHyphen(v: string | null): string {
  if (v === null) return '';
  return v.toUpperCase();
}

/** Remove every non-digit (RIV-071). */
export function digitsOnly(v: string | null): string {
  if (v === null) return '';
  return v.replace(/\D/g, '');
}

/**
 * Lowercase, trim, collapse internal whitespace runs to a single space, and
 * strip trailing punctuation (RIV-092). E.g. `'  Assorted   Goods. '` →
 * `'assorted goods'`.
 */
export function collapseLower(v: string | null): string {
  if (v === null) return '';
  return v
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/u, '')
    .trim();
}

export type DecimalParse =
  | { readonly ok: true; readonly value: number; readonly decimals: number }
  | { readonly ok: false };

/**
 * Parse a fixed-point decimal string WITHOUT Number() locale surprises. Rejects
 * anything not matching `^-?\d+(\.\d+)?$` after trim, and reports the digit
 * count after the point so RIV-121 can check "at most 2 decimal places".
 * (RIV-101 / RIV-121.)
 */
export function parseDecimal(v: string | null): DecimalParse {
  if (v === null) return { ok: false };
  const s = v.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { ok: false };
  const dot = s.indexOf('.');
  const decimals = dot === -1 ? 0 : s.length - dot - 1;
  const value = Number(s);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value, decimals };
}

const DAYS_IN_MONTH = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const);

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  if (m === 2 && isLeapYear(y)) return 29;
  return DAYS_IN_MONTH[m - 1] ?? 0;
}

/**
 * True only for a syntactically valid `YYYY-MM-DD` that is ALSO calendrically
 * valid (`2026-02-30` is false, `2024-02-29` is true). Implemented by regex +
 * explicit component range check + a leap-year-aware days-in-month table.
 *
 * Deliberately does NOT use `new Date(v)` and compare: `Date` accepts
 * `2026-02-30` and rolls it to March 2nd, which would let an impossible date
 * pass RIV-131. (RIV-131.)
 */
export function isCalendarDate(v: string | null): boolean {
  if (v === null) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m === null) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  return day <= daysInMonth(year, month);
}

/**
 * The `YYYY-MM-DD` of an RFC-3339 timestamp IN UTC (RIV-132). Computes from the
 * parsed timestamp's UTC components; never uses the local timezone.
 */
export function dateOnlyUtc(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const time = d.getTime();
  if (Number.isNaN(time)) {
    throw new Error(`dateOnlyUtc: not a valid RFC-3339 timestamp: ${isoTimestamp}`);
  }
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const da = d.getUTCDate();
  return `${pad4(y)}-${pad2(mo)}-${pad2(da)}`;
}

/**
 * `YYYY-MM-DD` shifted by `n` whole days, computed via `Date.UTC` integer
 * arithmetic on the parsed components — no local timezone (RIV-132).
 */
export function addDaysUtc(yyyymmdd: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (m === null) {
    throw new Error(`addDaysUtc: not a YYYY-MM-DD date: ${yyyymmdd}`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const base = Date.UTC(year, month - 1, day);
  const shifted = new Date(base + n * 86_400_000);
  const y = shifted.getUTCFullYear();
  const mo = shifted.getUTCMonth() + 1;
  const da = shifted.getUTCDate();
  return `${pad4(y)}-${pad2(mo)}-${pad2(da)}`;
}

/**
 * The submitted value capped at 60 characters with a trailing `…` when longer
 * (FR-4.13), for the `{value}`-interpolating messages. A null submitted value
 * renders as the empty string.
 */
export function truncate60(v: string | null): string {
  if (v === null) return '';
  if (v.length <= 60) return v;
  return `${v.slice(0, 60)}…`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pad4(n: number): string {
  return String(n).padStart(4, '0');
}
