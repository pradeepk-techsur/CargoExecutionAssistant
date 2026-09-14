// The redacting application logger (TechArch §4.7, F1 FR-1.14).
//
// Two independent mechanisms keep secrets out of the log, because a single
// denylist that misses one shape is a plaintext password in a persisted file:
//
//   1. A path-based `redact` denylist censors the well-known secret-bearing
//      fields wherever pino serialises them (cookie/authorization/x-csrf-token
//      headers, and password/token/api_key at the top level or one level deep).
//   2. A `req` serialiser drops the POST /api/session body ENTIRELY. There is
//      no shape of a sign-in request whose body is worth keeping, and a
//      field-by-field redaction that misses one variant leaks the password.
//
// A log line references a session by `sessions.id` only, never by its token
// (FR-1.14) — see `sessionRef` below.

import {
  pino,
  type Logger,
  type LoggerOptions,
  type DestinationStream,
} from 'pino';
import { loadConfig, type AppConfig } from '../config.js';

/**
 * The §4.7 redaction denylist. Kept as a module constant so the exact set of
 * censored paths is greppable and testable, and so `createLogger` and any
 * future child-logger factory share one source of truth.
 */
const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'req.headers.authorization',
  'password',
  '*.password',
  'token',
  '*.token',
  'api_key',
  '*.api_key',
  'authorization',
] as const;

/**
 * Build a pino logger configured exactly as TechArch §4.7 requires. Callers
 * that already hold an `AppConfig` (the request path) pass it here; the module
 * also exposes a lazily-constructed `logger` for contexts that do not.
 *
 * An optional destination is accepted so a test can capture the emitted lines
 * against an in-memory sink without touching stdout.
 */
export function createLogger(
  config: AppConfig,
  destination?: DestinationStream,
): Logger {
  const options: LoggerOptions = {
    level: config.logLevel,
    redact: {
      paths: [...REDACT_PATHS],
      censor: '[redacted]',
    },
    serializers: {
      req(req: {
        method?: string;
        url?: string;
        id?: unknown;
        headers?: unknown;
      }) {
        // The sign-in body is dropped ENTIRELY, not redacted field-by-field:
        // a redaction path that misses one shape is a plaintext password in a
        // log file, and there is no shape of POST /api/session whose body is
        // worth keeping (§4.7). Dropping `headers` also drops the Cookie and
        // Authorization headers on the one request most likely to carry a
        // credential.
        const base = { method: req.method, url: req.url, id: req.id };
        if (
          req.method === 'POST' &&
          String(req.url ?? '').startsWith('/api/session')
        ) {
          return base;
        }
        return { ...base, headers: req.headers };
      },
    },
  };
  return destination === undefined
    ? pino(options)
    : pino(options, destination);
}

/**
 * A log line references a session by `sessions.id`, never by its token
 * (FR-1.14): the token is the bearer credential and must not survive into a
 * persisted line even in a hashed or truncated form. This helper makes the
 * only safe reference shape the obvious one to reach for.
 */
export function sessionRef(sessionId: string): { session_id: string } {
  return { session_id: sessionId };
}

// Lazily-constructed module-level logger, mirroring the pool.app.ts pattern:
// built on first access, never at import time, so importing this module in a
// type-only context (or a test that supplies its own logger via createLogger)
// reads no environment. The Proxy defers `loadConfig()` — which throws on a
// broken environment — to the first line that is actually logged.
let cachedLogger: Logger | undefined;

function resolveLogger(): Logger {
  if (cachedLogger === undefined) {
    cachedLogger = createLogger(loadConfig());
  }
  return cachedLogger;
}

/**
 * The process-wide logger. Constructed on first property access from the
 * environment via `loadConfig()`. Route code should prefer `req.log` (the
 * per-request child bound by `requestId()`); this is for startup and for
 * contexts with no request in scope.
 */
export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveLogger(), prop, receiver);
  },
});
