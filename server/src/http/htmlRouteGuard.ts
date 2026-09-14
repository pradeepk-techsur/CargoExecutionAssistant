// The HTML document guard (TechArch §1A.3, §6.5; F1 FR-1.7).
//
// Registered AFTER the API routes, so it only ever sees requests that were not
// answered by a route: an unmatched `/api/...` path has already fallen through
// to the JSON 404 envelope, so everything reaching here is a non-API GET that
// the SPA document would answer. Its job is the one place where an
// unauthenticated caller of a PROTECTED screen is redirected to sign-in instead
// of being handed the shell — and, symmetrically, where an already-signed-in
// caller of `/sign-in` is bounced to the application.
//
// The two outcomes for the same "no session" condition are why authentication
// is NOT enforced in `sessionMiddleware`: an API route needs 401 UNAUTHENTICATED
// (a JSON envelope), while an HTML document request needs a 302 to a login page
// (§4.2). This guard owns the HTML half.

import type { RequestHandler } from 'express';

/**
 * A validated `next` path is a same-origin ABSOLUTE path: it starts with a
 * single `/`, and contains only unreserved path characters. This deliberately
 * excludes `//host` (protocol-relative), `/\host`, a `:` (scheme), a `.`
 * (which would permit `/..`), and anything that could carry a query or fragment.
 */
export const NEXT_PATH_RE = /^\/[A-Za-z0-9/_\-]*$/;

/** The default landing screen when `next` is absent or fails validation. */
const DEFAULT_NEXT = '/queue';

/**
 * Return `raw` when it is a safe same-origin path, otherwise `/queue`. This is
 * open-redirect prevention (FR-1.7): `//evil.example`, `https://evil.example`,
 * `/queue?x=1`, `/%2F%2Fevil`, and any value containing `.` or `:` are all
 * discarded in favour of `/queue`.
 *
 * The RAW, UNDECODED value is validated, and any value containing a `%` is
 * rejected outright: a double-encoded escape (`%2F%2Fevil`) must not be able to
 * slip a `//` or a scheme past the character class after a later decode.
 */
export function validateNextPath(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return DEFAULT_NEXT;
  }
  if (raw.includes('%')) {
    return DEFAULT_NEXT; // no percent-escapes — cannot smuggle // or a scheme
  }
  return NEXT_PATH_RE.test(raw) ? raw : DEFAULT_NEXT;
}

/** Screens that require a session. A request for one with no principal → sign-in. */
function isProtectedDocumentPath(path: string): boolean {
  // Everything that is not the sign-in screen is protected. The SPA is a single
  // application behind authentication; `/sign-in` is the only public document.
  return path !== '/sign-in';
}

/**
 * Whether this is an HTML document request: a GET, not under `/api/`, whose
 * `Accept` includes `text/html`. A request for `application/json`, or any path
 * under `/api/`, is NOT handled here — it must already have been answered by a
 * route or have fallen through to the JSON 404 envelope (§4.2, §3.7).
 */
function isHtmlDocumentRequest(req: {
  method: string;
  path: string;
  accepts: (type: string) => string | false;
}): boolean {
  if (req.method.toUpperCase() !== 'GET') {
    return false;
  }
  if (req.path.startsWith('/api/')) {
    return false;
  }
  return req.accepts('html') !== false;
}

/**
 * Whether the path looks like a static asset (has a file extension), which is
 * always passed through untouched — it is served by `express.static`, not the
 * SPA document.
 */
function isStaticAssetPath(path: string): boolean {
  const last = path.split('/').pop() ?? '';
  return last.includes('.');
}

/**
 * The guard. See the table in plan 02-04 Task 1:
 *  | Condition                          | Response                              |
 *  | protected route, no principal      | 302 /sign-in?next=<validated path>    |
 *  | /sign-in, valid principal          | 302 /queue                            |
 *  | /sign-in, no principal             | pass through to the SPA document       |
 *  | static asset path                  | pass through                          |
 *  | otherwise, with a principal        | pass through to the SPA document       |
 */
export function htmlRouteGuard(): RequestHandler {
  return (req, res, next) => {
    if (!isHtmlDocumentRequest(req)) {
      return next(); // not an HTML document request — leave it alone
    }
    if (isStaticAssetPath(req.path)) {
      return next(); // hashed asset — express.static handles it
    }

    const hasPrincipal = req.principal !== undefined;

    if (req.path === '/sign-in') {
      if (hasPrincipal) {
        return res.redirect(302, DEFAULT_NEXT); // already in → go to the app
      }
      return next(); // public sign-in document
    }

    if (isProtectedDocumentPath(req.path) && !hasPrincipal) {
      const next_ = encodeURIComponent(validateNextPath(req.path));
      return res.redirect(302, `/sign-in?next=${next_}`);
    }

    return next(); // signed-in request for an application document
  };
}
