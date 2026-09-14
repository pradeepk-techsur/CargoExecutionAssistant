import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { Pool } from 'pg';
import type { SpecialistDto } from '@cargoexec/contract';
import { systemClock, type Clock } from '../clock.js';
import {
  findSpecialistByEmail,
  touchLastSignIn,
} from '../db/repositories/specialists.js';
import {
  insertSession,
  findSessionByTokenHash,
  revokeSession,
  updateLastSeen,
} from '../db/repositories/sessions.js';

/**
 * The ONLY module in the product that verifies a credential (F1). It imports
 * `express` nowhere (R-L1: a service never imports the web framework) and writes
 * NO audit row of any kind (FR-1.12: session events are not case audit entries —
 * the audit table's case_id is NOT NULL and no case state changes at
 * authentication; session history lives on the `sessions` table). This module
 * deliberately never imports the audit writer.
 *
 * The raw session token and CSRF token exist only in the caller's response
 * exactly once. Only their 32-byte SHA-256 digests reach the database. Nothing
 * here logs, and the caller (the route in plan 02-04) is responsible for never
 * logging the returned tokens either.
 */

// ── Constants (shared with the middleware and the tests) ─────────────────────

export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000; // FR-1.5: 8-hour hard cap
export const SESSION_IDLE_MS = 30 * 60 * 1000; // FR-1.5: 30-minute idle timeout
export const LAST_SEEN_THROTTLE_MS = 60 * 1000; // §4.2: last_seen write throttle
export const THROTTLE_MAX_FAILURES = 5; // FR-1.10: failures before throttling
export const THROTTLE_WINDOW_MS = 15 * 60 * 1000; // FR-1.10: rolling window

/**
 * Argon2id parameters — FR-1.4's floor. Named once so the CLI, the fixture and
 * the dummy hash all agree; a drift between where a password is created and
 * where it is verified would silently reject every sign-in.
 */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

// ── Result types ─────────────────────────────────────────────────────────────

export type SignInFailure =
  | { ok: false; reason: 'AUTH_FAILED' }
  | { ok: false; reason: 'ACCOUNT_INACTIVE' }
  | { ok: false; reason: 'TOO_MANY_ATTEMPTS'; retryAfterSeconds: number };

export type SignInResult =
  | {
      ok: true;
      specialist: SpecialistDto;
      sessionId: string;
      token: string;
      csrfToken: string;
      absoluteExpiresAt: Date;
    }
  | SignInFailure;

export type LoadedSession = {
  sessionId: string;
  specialist: SpecialistDto;
  lastSeenAt: Date;
  absoluteExpiresAt: Date;
  csrfTokenHash: Buffer;
};

export type LoadOutcome =
  | { state: 'VALID'; session: LoadedSession }
  | { state: 'ABSENT' }
  | { state: 'EXPIRED' }
  | { state: 'REVOKED' }
  | { state: 'INACTIVE' };

// ── Hashing helpers ──────────────────────────────────────────────────────────

/**
 * SHA-256 of the STRING form of a token, as a 32-byte Buffer. Minting and
 * lookup both hash the base64url TEXT (never the raw bytes) — hashing the two
 * differently would make every session lookup miss, and the failure mode
 * (silent sign-out on the next request) is miserable to diagnose.
 */
function sha256(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

/**
 * A real Argon2id hash of a fixed throwaway string, computed once and reused as
 * the verification target when no specialist row was found. Verifying against it
 * makes the unknown-email path spend the same time as the wrong-password path,
 * so response timing cannot disclose whether an account exists (FR step 4, §4.2,
 * T-6/T-02-14). Computed lazily so importing this module opens no CPU cost.
 */
let dummyHashPromise: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  if (dummyHashPromise === undefined) {
    dummyHashPromise = argon2.hash('cargoexec-timing-equaliser-not-a-real-password', ARGON2_OPTIONS);
  }
  return dummyHashPromise;
}

// ── Throttle store (in-process, keyed by a hash of the email) ────────────────
//
// §4.2 is explicit that this is NOT a table and NOT account state: there is no
// lockout flag and no unlock surface, because there is no administrative role to
// operate one. Counters live in-process and are lost on restart by design
// (T-02-21). Keyed by sha256(normalisedEmail) so the plaintext email never
// becomes a map key.

type ThrottleEntry = { failures: number[] };
const throttleStore = new Map<string, ThrottleEntry>();

function throttleKey(normalisedEmail: string): string {
  return sha256(normalisedEmail).toString('hex');
}

/** Prune failures outside the rolling window and return the surviving list. */
function pruneFailures(entry: ThrottleEntry, now: number): number[] {
  entry.failures = entry.failures.filter((t) => now - t < THROTTLE_WINDOW_MS);
  return entry.failures;
}

/**
 * How many ms until the throttle clears for this key, given the current failure
 * timestamps. The window clears once the OLDEST surviving failure ages out.
 */
function retryAfterMs(entry: ThrottleEntry, now: number): number {
  const oldest = entry.failures[0];
  if (oldest === undefined) {
    return 0;
  }
  return Math.max(0, THROTTLE_WINDOW_MS - (now - oldest));
}

function recordFailure(key: string, now: number): void {
  const entry = throttleStore.get(key) ?? { failures: [] };
  pruneFailures(entry, now);
  entry.failures.push(now);
  throttleStore.set(key, entry);
}

function clearThrottle(key: string): void {
  throttleStore.delete(key);
}

/** Test-only: wipe all throttle state. */
export function __resetThrottle(): void {
  throttleStore.clear();
}

/** Test-only reader: the surviving failure timestamps for a key (by email hash). */
export function throttleState(emailHash: string): number[] {
  const entry = throttleStore.get(emailHash);
  return entry ? [...entry.failures] : [];
}

/** Test-only: the throttle key for a raw email, so a test can assert it is a hash. */
export function throttleKeyFor(email: string): string {
  return throttleKey(email.trim().toLowerCase());
}

/**
 * Test-only: record one failed attempt for `email` at the given wall time,
 * exercising the SAME `recordFailure` path production uses. Lets a unit test
 * drive the rolling window deterministically without a database or a real clock.
 */
export function __recordFailureForTest(email: string, atMs: number): void {
  recordFailure(throttleKey(email.trim().toLowerCase()), atMs);
}

/**
 * Test-only: whether `email` is currently throttled at wall time `atMs`,
 * pruning aged-out failures exactly as `signIn` does. Returns the retry-after
 * seconds when throttled so a test can assert the window math.
 */
export function __isThrottled(
  email: string,
  atMs: number,
): { throttled: boolean; retryAfterSeconds: number; failures: number } {
  const key = throttleKey(email.trim().toLowerCase());
  const entry = throttleStore.get(key);
  if (entry === undefined) {
    return { throttled: false, retryAfterSeconds: 0, failures: 0 };
  }
  const surviving = pruneFailures(entry, atMs);
  const throttled = surviving.length >= THROTTLE_MAX_FAILURES;
  return {
    throttled,
    retryAfterSeconds: throttled ? Math.ceil(retryAfterMs(entry, atMs) / 1000) : 0,
    failures: surviving.length,
  };
}

/** Test-only: reset one email's throttle (mirrors the success-path clear). */
export function __clearThrottleForTest(email: string): void {
  clearThrottle(throttleKey(email.trim().toLowerCase()));
}

// ── signIn ───────────────────────────────────────────────────────────────────

export async function signIn(
  pool: Pool,
  input: { email: string; password: string; userAgent?: string | null },
  clock: Clock = systemClock,
): Promise<SignInResult> {
  // 1. Normalise the email.
  const email = input.email.trim().toLowerCase();
  const key = throttleKey(email);
  const nowMs = clock.now().getTime();

  // 2. Throttle check FIRST — before any database access, identically whether or
  //    not that email exists, so the throttle cannot be used as an account
  //    oracle (FR-1.10, US-1.5).
  const existing = throttleStore.get(key);
  if (existing !== undefined) {
    const surviving = pruneFailures(existing, nowMs);
    if (surviving.length >= THROTTLE_MAX_FAILURES) {
      return {
        ok: false,
        reason: 'TOO_MANY_ATTEMPTS',
        retryAfterSeconds: Math.ceil(retryAfterMs(existing, nowMs) / 1000),
      };
    }
  }

  // 3. Look up the specialist.
  const specialist = await findSpecialistByEmail(pool, email);

  // 4. Verify the password with Argon2id in BOTH branches. When no row was
  //    found, verify against the module-level dummy hash and discard the result,
  //    so the elapsed time is the same (FR step 4, §4.2). A throw from
  //    argon2.verify (e.g. a corrupt stored hash) is treated as a failed
  //    verification, never a 500 that discloses the row exists.
  let passwordOk: boolean;
  if (specialist === null) {
    try {
      await argon2.verify(await dummyHash(), input.password);
    } catch {
      /* discarded — the point is the elapsed time, not the boolean */
    }
    passwordOk = false;
  } else {
    try {
      passwordOk = await argon2.verify(specialist.password_hash, input.password);
    } catch {
      passwordOk = false;
    }
  }

  // 5. Verification failure: record the attempt and return AUTH_FAILED. Unknown
  //    email and wrong password return the IDENTICAL value (US-1.1, AC-3).
  if (!passwordOk) {
    recordFailure(key, nowMs);
    return { ok: false, reason: 'AUTH_FAILED' };
  }

  // 6. Activity check AFTER password verification, so a deactivated account
  //    cannot be probed by response timing either.
  if (specialist === null || specialist.is_active === false) {
    return { ok: false, reason: 'ACCOUNT_INACTIVE' };
  }

  // 7. Mint the session.
  const createdAt = clock.now();
  const absoluteExpiresAt = new Date(createdAt.getTime() + SESSION_ABSOLUTE_MS);

  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const csrfTokenHash = sha256(csrfToken);

  const userAgent =
    input.userAgent == null ? null : input.userAgent.slice(0, 512);

  const { id: sessionId } = await insertSession(pool, {
    specialist_id: specialist.id,
    token_hash: tokenHash,
    csrf_token_hash: csrfTokenHash,
    created_at: createdAt,
    absolute_expires_at: absoluteExpiresAt,
    user_agent: userAgent,
  });

  // 8. Reset the throttle for this key and record the successful sign-in.
  clearThrottle(key);
  await touchLastSignIn(pool, specialist.id, createdAt);

  // 9. Return the principal and the raw tokens — they leave this function once
  //    and are never stored, logged or returned again (FR-1.2, FR-1.14).
  return {
    ok: true,
    specialist: {
      id: specialist.id,
      email: specialist.email,
      display_name: specialist.display_name,
    },
    sessionId,
    token,
    csrfToken,
    absoluteExpiresAt,
  };
}

// ── loadSessionByToken ───────────────────────────────────────────────────────

/**
 * Resolve a session by its raw token. This is a READ path: it never writes.
 * Recording an expiry is `expireSession`, called by the middleware, so this
 * function stays safe to call from a read-only context.
 */
export async function loadSessionByToken(
  pool: Pool,
  rawToken: string,
  clock: Clock = systemClock,
): Promise<LoadOutcome> {
  const row = await findSessionByTokenHash(pool, sha256(rawToken));
  if (row === null) {
    return { state: 'ABSENT' };
  }
  if (row.revoked_at !== null) {
    return { state: 'REVOKED' };
  }

  const now = clock.now().getTime();
  const absoluteExpired = now > row.absolute_expires_at.getTime();
  const idleExpired = now > row.last_seen_at.getTime() + SESSION_IDLE_MS;
  if (absoluteExpired || idleExpired) {
    return { state: 'EXPIRED' };
  }

  if (row.specialist.is_active === false) {
    return { state: 'INACTIVE' };
  }

  return {
    state: 'VALID',
    session: {
      sessionId: row.id,
      specialist: {
        id: row.specialist.id,
        email: row.specialist.email,
        display_name: row.specialist.display_name,
      },
      lastSeenAt: row.last_seen_at,
      absoluteExpiresAt: row.absolute_expires_at,
      csrfTokenHash: row.csrf_token_hash,
    },
  };
}

// ── Revocation and touch ─────────────────────────────────────────────────────

/** Record an expiry: revoked_at + revocation_reason = 'EXPIRED'. */
export async function expireSession(
  pool: Pool,
  sessionId: string,
  clock: Clock = systemClock,
): Promise<void> {
  await revokeSession(pool, sessionId, 'EXPIRED', clock.now());
}

/**
 * Record an expiry given only the raw token, resolving the session id through
 * the same read path first. `loadSessionByToken` deliberately does not surface
 * the id on a non-VALID outcome, so the middleware — which learns a session is
 * EXPIRED but not which row — calls this to write the revocation without
 * reaching into a repository itself (keeping the no-repository-in-http rule).
 * `revokeSession` is guarded by `revoked_at IS NULL`, so this is idempotent
 * and cannot overwrite an already-recorded reason under a concurrent request.
 */
export async function expireSessionByToken(
  pool: Pool,
  rawToken: string,
  clock: Clock = systemClock,
): Promise<void> {
  const row = await findSessionByTokenHash(pool, sha256(rawToken));
  if (row !== null && row.revoked_at === null) {
    await revokeSession(pool, row.id, 'EXPIRED', clock.now());
  }
}

/** Record a sign-out: revoked_at + revocation_reason = 'SIGNED_OUT'. Revokes only this session (FR-1.11). */
export async function signOut(
  pool: Pool,
  sessionId: string,
  clock: Clock = systemClock,
): Promise<void> {
  await revokeSession(pool, sessionId, 'SIGNED_OUT', clock.now());
}

/** Advance last_seen_at. The caller decides whether the 60-second throttle has elapsed. */
export async function touchSession(pool: Pool, sessionId: string, lastSeenAt: Date): Promise<void> {
  await updateLastSeen(pool, sessionId, lastSeenAt);
}
