// The three session endpoints (TechArch §3.3, FRD Y1 §1; F1 FR-1.7, FR-1.11).
//
//   POST   /api/session   sign in.  No auth, no CSRF.
//   GET    /api/session   current principal + a fresh CSRF token.
//   DELETE /api/session   sign out. Session + CSRF.
//
// The field names of the request and the response are copied VERBATIM from
// §3.3 / Y1 §1; do not reshape one. The actor is NEVER read from the body — the
// only actor is `req.principal`, set by sessionMiddleware from the cookie alone
// (FR-1.6). `.strict()` on the request schema is what rejects a client-supplied
// `specialist_id` / `actor` / `decided_by` / `on_behalf_of` as an unknown
// property (422 REQUEST_MALFORMED): it is the mechanism behind that guarantee,
// not incidental hygiene.

import type { Pool } from 'pg';
import type { Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import type { SessionDto } from '@cargoexec/contract';
import type { Clock } from '../../clock.js';
import { systemClock } from '../../clock.js';
import type { AppConfig } from '../../config.js';
import { ApiError } from '../errorMapper.js';
import { buildSessionCookie, buildClearedSessionCookie } from '../cookies.js';
import { signIn, signOut } from '../../services/session.service.js';
import { rotateCsrfToken } from '../../services/session.service.js';

export interface SessionRouteDeps {
  pool: Pool;
  config: AppConfig;
  clock: Clock;
}

// ── Request validation (§3.2, §4.6) ─────────────────────────────────────────
//
// `.strict()` rejects any unknown property with 422 REQUEST_MALFORMED — this is
// how a client-supplied actor field is refused. `password` is validated for
// PRESENCE and TYPE only here; the 12–256 length bound is applied inside the
// handler and a violation is converted to the generic 401 AUTH_FAILED, never a
// 422, so the response never describes the credential policy of an existing
// account (F1 Validation). Email STRUCTURE is validated as shape (a malformed
// email is a 422); an unknown-but-well-formed email is a credential question
// answered 401.
const SignInBody = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .refine(isStructurallyValidEmail, { message: 'Enter a valid email address.' }),
    password: z.string(), // length checked in-handler → AUTH_FAILED, not 422
  })
  .strict();

/**
 * Structural email validation: ≤254 chars, exactly one `@`, a non-empty local
 * part, and a dot-containing domain. This is a SHAPE check (a 422), distinct
 * from whether the address names a real account (a 401).
 */
function isStructurallyValidEmail(raw: string): boolean {
  if (raw.length === 0 || raw.length > 254) {
    return false;
  }
  const at = raw.indexOf('@');
  if (at <= 0 || at !== raw.lastIndexOf('@')) {
    return false; // zero, or more than one, @ — or an empty local part
  }
  const domain = raw.slice(at + 1);
  if (domain.length === 0 || !domain.includes('.')) {
    return false;
  }
  // No whitespace anywhere in a structurally valid address.
  return !/\s/.test(raw);
}

// ── DTO assembly ─────────────────────────────────────────────────────────────

function sessionDto(
  specialist: SessionDto['specialist'],
  csrfToken: string,
  absoluteExpiresAt: Date,
): SessionDto {
  return {
    specialist,
    csrf_token: csrfToken,
    session: { absolute_expires_at: absoluteExpiresAt.toISOString() },
  };
}

// ── POST /api/session — sign in ──────────────────────────────────────────────

function postSession(deps: SessionRouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    const parsed = SignInBody.parse(req.body); // ZodError → 422 via errorMapper

    // The 12–256 password bound is enforced HERE, not in the schema, so a
    // present-but-short password returns the generic 401 AUTH_FAILED rather than
    // a length error that would describe the stored credential policy of an
    // existing account (F1 Validation, T-02-26). Never trim the password.
    if (parsed.password.length < 12 || parsed.password.length > 256) {
      throw new ApiError(401, 'AUTH_FAILED');
    }

    const userAgent = req.header('user-agent') ?? null;
    const result = await signIn(
      deps.pool,
      { email: parsed.email, password: parsed.password, userAgent },
      deps.clock,
    );

    if (!result.ok) {
      switch (result.reason) {
        case 'AUTH_FAILED':
          throw new ApiError(401, 'AUTH_FAILED');
        case 'ACCOUNT_INACTIVE':
          throw new ApiError(403, 'ACCOUNT_INACTIVE');
        case 'TOO_MANY_ATTEMPTS':
          res.setHeader('Retry-After', String(result.retryAfterSeconds));
          throw new ApiError(429, 'TOO_MANY_ATTEMPTS');
      }
    }

    res.setHeader('Set-Cookie', buildSessionCookie(result.token, deps.config));
    res
      .status(201)
      .json(sessionDto(result.specialist, result.csrfToken, result.absoluteExpiresAt));
  };
}

// ── GET /api/session — current principal + fresh CSRF token ──────────────────
//
// ⚠️ ROTATE-ON-GET IS LOAD-BEARING AND HAS A CLIENT HALF. Do not change either
// without the other. Only the CSRF token's HASH is stored, so it cannot be read
// back. §3.3 requires this token be re-readable from GET /api/session and makes
// this GET the SPA's load-time call. So every page load issues a FRESH CSRF
// token and updates `sessions.csrf_token_hash` in the same request; the token
// the caller receives is the one that will now verify. Any token a client held
// from a previous page is DEAD the moment the new page bootstraps.
//
// The client half is therefore mandatory: `api.getSession()` (plan 02-07) must
// store the returned `csrf_token`. If this rotation is ever "simplified" away —
// or the client stops re-storing — a reload followed by any POST/DELETE returns
// 403 CSRF_INVALID while every in-session test still passes. This pairing is
// also recorded in this plan's SUMMARY.
function getSession(deps: SessionRouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    if (req.principal === undefined || req.sessionId === undefined) {
      throw new ApiError(401, 'UNAUTHENTICATED');
    }
    // Rotate: mint a fresh CSRF token and persist its hash so the token handed
    // to this caller is the one that will verify their next state-changing call.
    const { csrfToken, absoluteExpiresAt } = await rotateCsrfToken(
      deps.pool,
      req.sessionId,
    );
    res.status(200).json(sessionDto(req.principal, csrfToken, absoluteExpiresAt));
  };
}

// ── DELETE /api/session — sign out ───────────────────────────────────────────

function deleteSession(deps: SessionRouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // CSRF has already been validated by csrfMiddleware for this DELETE, and the
    // session resolved by sessionMiddleware. If there is no session, there is
    // nothing to sign out — treat it as unauthenticated.
    if (req.sessionId === undefined) {
      throw new ApiError(401, 'UNAUTHENTICATED');
    }
    await signOut(deps.pool, req.sessionId, deps.clock); // revokes ONLY this session (FR-1.11)
    res.setHeader('Set-Cookie', buildClearedSessionCookie(deps.config));
    res.status(204).end();
  };
}

/**
 * The three session route handlers, built with their dependencies. Consumed by
 * `routes/index.ts` where they are registered from the single ROUTES array.
 */
export function sessionRoutes(deps: SessionRouteDeps): {
  post: RequestHandler;
  get: RequestHandler;
  delete: RequestHandler;
} {
  const withClock: SessionRouteDeps = {
    pool: deps.pool,
    config: deps.config,
    clock: deps.clock ?? systemClock,
  };
  return {
    post: postSession(withClock),
    get: getSession(withClock),
    delete: deleteSession(withClock),
  };
}
