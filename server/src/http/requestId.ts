// Per-request correlation id (TechArch §3.2, FR-Y1.4, FR-Y2.6).
//
// Every request is given a server-generated id, echoed to the caller as the
// `X-Request-Id` response header and bound to a pino child logger so that every
// line emitted while handling the request carries the same `request_id`. The
// error envelope (errorMapper.ts) reads the same value from `res.locals`, so a
// caller reporting a failure and the operator reading the log share one id.

import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import type { SpecialistDto } from '@cargoexec/contract';
import { logger } from './logger.js';

// ---- Express type augmentation ---------------------------------------------
//
// Declared here, once, so both this plan and plan 02-04 agree on the shape of
// `req.log` and `req.principal`. `req.principal` is FILLED by 02-04's auth
// middleware; it is typed here (as optional) so a route written against it
// type-checks before that middleware exists.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Per-request child logger carrying `request_id`. Bound by requestId(). */
      log: Logger;
      /** The authenticated specialist, filled by plan 02-04's auth middleware. */
      principal?: SpecialistDto;
    }
  }
}

/**
 * Assign a server-generated correlation id to the request.
 *
 * The id is always `crypto.randomUUID()`. An inbound `X-Request-Id` is NEVER
 * trusted or echoed: a client-chosen correlation id lets a caller deliberately
 * collide their log/audit entries with another request's, defeating the point
 * of correlation (T-02-09, FR-Y1.4).
 */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const id = crypto.randomUUID();
    res.locals.requestId = id;
    res.setHeader('X-Request-Id', id);
    // Bind a child so every line for this request carries request_id, and give
    // the serialiser an `id` to render on the `req` it logs.
    (req as { id?: string }).id = id;
    req.log = logger.child({ request_id: id });
    next();
  };
}
