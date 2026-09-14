// Principal resolution from the session cookie (TechArch §1A.3, §4.2; F1
// FR-1.5, FR-1.6).
//
// ─── req.principal is the SOLE source of actor identity in the product ───────
// FR-1.6 is absolute: the authenticated specialist is attached HERE, from the
// `cargoexec_sid` cookie ALONE, resolved through the session service. No route,
// no service, and no other middleware may read an actor identifier from a
// request body, a header, a query value, or anything else the caller controls.
// A handler that reads an actor identifier (decided_by, actor, specialist_id,
// on_behalf_of, …) from the request body, a header or a query value is forging
// identity, and plan 02-09 adds an architecture assertion that greps
// `server/src` for exactly that shape and fails the build if it appears. If you
// need "who is acting", the only correct answer is `req.principal`.
//
// This middleware NEVER rejects. An absent, expired, revoked or inactive
// session simply leaves `req.principal` undefined and calls next(). Rejection
// is deliberately split between two later stages because the same condition
// needs two different answers (§4.2): a protected API route answers 401
// UNAUTHENTICATED, while an HTML document request answers 302 to /sign-in. A
// middleware that rejected here could only produce one of those.

import type { Pool } from 'pg';
import type { Request, RequestHandler } from 'express';
import type { Clock } from '../clock.js';
import { SESSION_COOKIE_NAME, parseCookies } from './cookies.js';
import {
  loadSessionByToken,
  expireSessionByToken,
  touchSession,
  LAST_SEEN_THROTTLE_MS,
} from '../services/session.service.js';

/**
 * Attach `req.principal` from the `cargoexec_sid` cookie when — and only when —
 * that cookie resolves to a VALID session (FR-1.6).
 *
 * Behaviour per outcome of `loadSessionByToken`:
 *  - VALID    → attach `req.principal`, `req.sessionId`, `req.csrfTokenHash`;
 *               advance `last_seen_at` at most once per `LAST_SEEN_THROTTLE_MS`.
 *  - EXPIRED  → record the expiry (`revoked_at` + `'EXPIRED'`) at the moment it
 *               is rejected (FR-1.5, §4.2), then leave the principal unset.
 *  - REVOKED / INACTIVE / ABSENT → leave the principal unset; write nothing.
 *
 * A database failure while resolving the session is logged against the
 * request_id and the request continues with NO principal, so the caller gets
 * the ordinary 401/302 rather than a 500 that could leak internal detail
 * (T-02-29, FR-Y2.5).
 */
export function sessionMiddleware(deps: {
  pool: Pool;
  clock: Clock;
}): RequestHandler {
  const { pool, clock } = deps;
  return (req, _res, next) => {
    void resolve(req, pool, clock)
      .catch((err: unknown) => {
        // Never 500 the origin on a public path because the session store
        // hiccuped: log and continue unauthenticated (T-02-29).
        const log = (req as { log?: { error: (o: unknown) => void } }).log;
        if (log !== undefined) {
          log.error({
            event: 'session_resolution_failed',
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
      })
      .finally(() => next());
  };
}

async function resolve(
  req: Request,
  pool: Pool,
  clock: Clock,
): Promise<void> {
  const rawToken = parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME];
  if (rawToken === undefined || rawToken === '') {
    return; // no cookie ⇒ no principal, no work
  }

  const outcome = await loadSessionByToken(pool, rawToken, clock);

  if (outcome.state === 'EXPIRED') {
    // Record what happened at the moment the session is rejected: the sessions
    // row must carry revoked_at + 'EXPIRED' so the trail reflects the timeout
    // (FR-1.5, §4.2). loadSessionByToken deliberately does not surface the id on
    // a non-VALID outcome, so the service re-resolves it by token hash.
    await expireSessionByToken(pool, rawToken, clock);
    return;
  }

  if (outcome.state !== 'VALID') {
    // REVOKED / INACTIVE / ABSENT — leave the principal unset, write nothing.
    // Do NOT re-revoke an already-revoked session.
    return;
  }

  const { session } = outcome;
  req.principal = session.specialist;
  req.sessionId = session.sessionId;
  req.csrfTokenHash = session.csrfTokenHash;

  // last_seen_at write throttling (§4.2): advance at most once per 60 s per
  // session, so a burst of requests does not amplify into a write per request.
  const nowMs = clock.now().getTime();
  if (nowMs - session.lastSeenAt.getTime() >= LAST_SEEN_THROTTLE_MS) {
    await touchSession(pool, session.sessionId, clock.now());
  }
}
