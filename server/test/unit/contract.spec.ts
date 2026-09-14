import { describe, it, expect } from 'vitest';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  INTERNAL_INVARIANT_CODES,
  type ErrorCode,
} from '@cargoexec/contract';

describe('contract — Y2 error catalogue (§3.10, Y2 §1/§2/§7)', () => {
  it('ERROR_CODES has exactly 23 members', () => {
    expect(ERROR_CODES).toHaveLength(23);
  });

  it('ERROR_CODES contains no duplicates', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('ERROR_CODES is disjoint from INTERNAL_INVARIANT_CODES (Y2 §7 — internal codes never reach the wire)', () => {
    const client = new Set<string>(ERROR_CODES);
    const overlap = INTERNAL_INVARIANT_CODES.filter((c) => client.has(c));
    expect(
      overlap,
      `Internal invariant code(s) leaked into the client-facing union: ${overlap.join(', ')}. ` +
        'HITL_VIOLATION and friends are logged against request_id, never returned (Y2 §7).',
    ).toEqual([]);
  });

  it('carries the five Y2 §1 session messages verbatim', () => {
    expect(ERROR_MESSAGES.AUTH_FAILED).toBe('Email or password is incorrect.');
    expect(ERROR_MESSAGES.UNAUTHENTICATED).toBe('Sign in to continue.');
    expect(ERROR_MESSAGES.ACCOUNT_INACTIVE).toBe('This account is not active.');
    expect(ERROR_MESSAGES.CSRF_INVALID).toBe(
      'Your session could not be verified. Refresh and try again.',
    );
    expect(ERROR_MESSAGES.TOO_MANY_ATTEMPTS).toBe(
      'Too many sign-in attempts. Try again in about 15 minutes.',
    );
  });

  it('type-level: ApiErrorBody error code is an ErrorCode', () => {
    const _check: ErrorCode = 'UNAUTHENTICATED';
    expect(_check).toBe('UNAUTHENTICATED');
  });
});
