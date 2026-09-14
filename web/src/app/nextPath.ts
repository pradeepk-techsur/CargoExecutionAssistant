// Client-side `next` validation (FR-1.7, T-02-47).
//
// Mirrors the server's validateNextPath (server/src/http/htmlRouteGuard.ts)
// byte-for-byte: a safe `next` is a same-origin ABSOLUTE path — a single leading
// `/`, only unreserved path characters, and no percent-escapes. The server
// already validated its own redirect; the client must not become the weaker of
// the two, so it re-validates before navigating on sign-in success.

/** Same-origin absolute path: one leading `/`, unreserved path chars only. */
export const NEXT_PATH_RE = /^\/[A-Za-z0-9/_\-]*$/;

/** Default landing screen when `next` is absent or fails validation. */
const DEFAULT_NEXT = '/queue';

/**
 * Return `raw` when it is a safe same-origin path, otherwise `/queue`.
 * `//evil`, `https://evil`, `/queue?x=1`, `%2F%2Fevil`, and any value containing
 * `.` or `:` are discarded — identical to the server rule.
 */
export function validateNextPath(raw: string | undefined | null): string {
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_NEXT;
  }
  if (raw.includes('%')) {
    return DEFAULT_NEXT;
  }
  return NEXT_PATH_RE.test(raw) ? raw : DEFAULT_NEXT;
}
