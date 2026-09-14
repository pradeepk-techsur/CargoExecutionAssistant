import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetThrottle,
  __recordFailureForTest,
  __isThrottled,
  __clearThrottleForTest,
  throttleState,
  throttleKeyFor,
  THROTTLE_MAX_FAILURES,
  THROTTLE_WINDOW_MS,
} from '../../src/services/session.service.js';

// Pure unit coverage of the in-process sign-in throttle (FR-1.10, §4.2). No
// database and no real clock: failures are recorded through the SAME
// recordFailure path production uses, with the notion of "now" supplied by hand,
// so the rolling window is proven without waiting fifteen minutes.

const T0 = 1_700_000_000_000; // an arbitrary fixed epoch ms

describe('sign-in throttle (FR-1.10, §4.2)', () => {
  beforeEach(() => {
    __resetThrottle();
  });

  it('the throttle key is a SHA-256 hash, never the plaintext email', () => {
    const email = 'inspector@cbp.example.gov';
    const key = throttleKeyFor(email);
    expect(key).toMatch(/^[0-9a-f]{64}$/); // 32-byte digest as hex
    expect(key).not.toContain(email);
    expect(key).not.toContain('inspector');
  });

  it('4 failures then a 5th stay at or below the limit; the 6th attempt is throttled', () => {
    const email = 'user@cbp.example.gov';
    // 4 failures — not throttled.
    for (let i = 0; i < 4; i++) __recordFailureForTest(email, T0 + i);
    expect(__isThrottled(email, T0 + 5).throttled).toBe(false);
    expect(__isThrottled(email, T0 + 5).failures).toBe(4);

    // 5th failure — now at the limit, so the NEXT (6th) attempt is throttled.
    __recordFailureForTest(email, T0 + 5);
    const r = __isThrottled(email, T0 + 6);
    expect(r.failures).toBe(THROTTLE_MAX_FAILURES);
    expect(r.throttled).toBe(true);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('the window rolls: advance past 15 min + 1 ms and the counter is clear again', () => {
    const email = 'roll@cbp.example.gov';
    for (let i = 0; i < THROTTLE_MAX_FAILURES; i++) __recordFailureForTest(email, T0 + i);
    expect(__isThrottled(email, T0 + 10).throttled).toBe(true);

    // Move the clock beyond the window relative to the NEWEST failure (recorded
    // at T0 + MAX-1), so every surviving failure ages out.
    const newest = T0 + THROTTLE_MAX_FAILURES - 1;
    const later = newest + THROTTLE_WINDOW_MS + 1;
    const r = __isThrottled(email, later);
    expect(r.throttled).toBe(false);
    expect(r.failures).toBe(0);
  });

  it('a successful sign-in resets the counter (clear helper mirrors the success path)', () => {
    const email = 'reset@cbp.example.gov';
    for (let i = 0; i < THROTTLE_MAX_FAILURES; i++) __recordFailureForTest(email, T0 + i);
    expect(__isThrottled(email, T0 + 10).throttled).toBe(true);

    __clearThrottleForTest(email);
    const key = throttleKeyFor(email);
    expect(throttleState(key)).toEqual([]);
    expect(__isThrottled(email, T0 + 10).throttled).toBe(false);
  });

  it('two different emails have independent counters', () => {
    const a = 'a@cbp.example.gov';
    const b = 'b@cbp.example.gov';
    for (let i = 0; i < THROTTLE_MAX_FAILURES; i++) __recordFailureForTest(a, T0 + i);

    expect(__isThrottled(a, T0 + 10).throttled).toBe(true);
    expect(__isThrottled(b, T0 + 10).throttled).toBe(false);
    expect(__isThrottled(b, T0 + 10).failures).toBe(0);
  });

  it('email normalisation folds case and trims before keying', () => {
    expect(throttleKeyFor('  Inspector@CBP.example.GOV ')).toEqual(
      throttleKeyFor('inspector@cbp.example.gov'),
    );
    // A failure recorded under one casing is seen under the normalised form.
    __recordFailureForTest('  User@CBP.example.GOV ', T0);
    expect(__isThrottled('user@cbp.example.gov', T0 + 1).failures).toBe(1);
  });

  it('no key in the exported state reader is ever a plaintext email string', () => {
    for (const email of ['one@cbp.example.gov', 'two@cbp.example.gov', 'three@cbp.example.gov']) {
      __recordFailureForTest(email, T0);
      const key = throttleKeyFor(email);
      expect(key).not.toEqual(email);
      expect(throttleState(key).length).toBe(1);
    }
  });

  it('the exported limit and window match the FR-1.10 policy (5 failures / 15 min)', () => {
    expect(THROTTLE_MAX_FAILURES).toBe(5);
    expect(THROTTLE_WINDOW_MS).toBe(15 * 60 * 1000);
  });
});
