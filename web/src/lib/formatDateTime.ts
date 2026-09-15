// The ONE date+time formatter for the whole SPA (FR-8.14, UX conventions).
//
// Absolute, LOCAL date+time, month in words, 24-hour clock, NO relative phrasing
// ("2 days ago" / "yesterday" is forbidden anywhere in this codebase). This is
// the single deliberately fixed-locale formatting function: `en-GB` gives the
// FRD's "11 Sep 2026, 14:32" ordering (day-month-year) and a 24-hour clock with
// no AM/PM, matching the FRD's example exactly. Phase 5/6's case-detail screens
// reuse this unchanged, so the whole product renders one date shape.

/** "11 Sep 2026, 14:32" — absolute local date+time, 24-hour clock, month in words. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart}, ${timePart}`;
}
