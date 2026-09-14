/**
 * The single source of "now" for anything whose behaviour depends on elapsed
 * time — session absolute expiry, idle timeout, the failed-attempt throttle
 * window (TechArch §8.2: "Expiry and idle-timeout tests inject a clock").
 *
 * The clock is ALWAYS injected as a parameter; it is never read from the
 * environment. There is deliberately no `CLOCK_OFFSET` (or similar) key, and
 * there must not be one: a configuration value that lets a production process
 * skew its own notion of time is precisely the kind of scope leakage TechArch
 * §6.6 forbids — it would turn "the session expired eight hours after it was
 * created" into something an operator could quietly falsify. `systemClock` is
 * the only clock the running server ever uses; `fixedClock` exists solely so a
 * test can prove a 31-minute idle expiry without waiting 31 minutes.
 */

export interface Clock {
  now(): Date;
}

/** The real clock — the only one the production process uses. */
export const systemClock: Clock = { now: () => new Date() };

/**
 * Test-only helper: a clock that starts at `start` and can be advanced
 * deliberately by `advance(ms)`. It never reads the wall clock, so a test that
 * uses it is fully deterministic and never sleeps.
 */
export function fixedClock(start: Date): Clock & { advance(ms: number): void } {
  let current = start.getTime();
  return {
    now: () => new Date(current),
    advance: (ms: number) => {
      current += ms;
    },
  };
}
