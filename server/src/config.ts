// Environment-only configuration with startup self-checks (TechArch §6.6, §8.7 step 6).
//
// There is no config file, no feature flag, and no ENABLE_* toggle. Per §6.6:
// "A configuration key that could enable an excluded capability is itself scope
// leakage." Configuration is read from the process environment once, at boot,
// and validated before the server listens (§8.7 step 6).
//
// Each self-check THROWS rather than warns, because every one of them has a
// silent failure mode that is worse than a loud one: a demonstration that is
// simply unreachable, a guarantee that is quietly unenforced, or a cookie the
// browser silently drops. A loud refusal at boot is the point.

/**
 * Thrown when the environment cannot produce a valid configuration.
 *
 * The message names the offending KEY, never its value (§4.7): a connection
 * string, password, or API key must not reach a log line by way of an error
 * message.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export type CookieProfile = 'governed' | 'demo-iframe';

export interface AppConfig {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly host: string; // never loopback
  readonly port: number; // default 3000
  readonly databaseUrlApp: string;
  readonly sessionCookieProfile: CookieProfile;
  readonly frameAncestors: string | null; // null => directive omitted
  readonly logLevel: string;
  readonly originIsHttps: boolean;
}

// Loopback hosts the preview proxy cannot reach (§6.5). A server bound here
// looks "up" but the demonstration simply does not exist — a refused connection
// with no visible cause.
const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0:0:0:0:0:0:0:1',
]);

/**
 * Strip surrounding single quotes and lowercase, so `'none'`, `none`, `'None'`,
 * and `NONE` are all compared alike (D-1, §4.5).
 */
function normaliseFrameAncestorsToken(raw: string): string {
  return raw.trim().replace(/^'+|'+$/g, '').toLowerCase();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // 1. Missing required key. DATABASE_URL_APP is the request-path pool; without
  //    it the application cannot serve a single request.
  const databaseUrlApp = env.DATABASE_URL_APP;
  if (databaseUrlApp === undefined || databaseUrlApp.trim() === '') {
    throw new ConfigError(
      'DATABASE_URL_APP is required but was not set. The request-path database ' +
        'connection is mandatory (TechArch §6.6).',
    );
  }

  // NODE_ENV — default production; only three values are meaningful.
  const rawNodeEnv = (env.NODE_ENV ?? 'production').trim();
  if (
    rawNodeEnv !== 'development' &&
    rawNodeEnv !== 'production' &&
    rawNodeEnv !== 'test'
  ) {
    throw new ConfigError(
      `NODE_ENV must be one of development | production | test (got an unrecognised value for NODE_ENV).`,
    );
  }
  const nodeEnv = rawNodeEnv;

  // HOST — default 0.0.0.0. 2. Loopback HOST is rejected (§6.5).
  const host = (env.HOST ?? '0.0.0.0').trim();
  if (LOOPBACK_HOSTS.has(host.toLowerCase())) {
    throw new ConfigError(
      `HOST must not be a loopback address: the preview proxy would see a ` +
        `refused connection and the demonstration would not exist (§6.5). ` +
        `Bind 0.0.0.0 instead (offending key: HOST).`,
    );
  }

  // PORT — default 3000, must parse to an integer in 1..65535.
  const rawPort = (env.PORT ?? '3000').trim();
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(
      `PORT must be an integer between 1 and 65535 (offending key: PORT).`,
    );
  }

  // SESSION_COOKIE_PROFILE — default governed.
  const rawProfile = (env.SESSION_COOKIE_PROFILE ?? 'governed').trim();
  if (rawProfile !== 'governed' && rawProfile !== 'demo-iframe') {
    throw new ConfigError(
      `SESSION_COOKIE_PROFILE must be 'governed' or 'demo-iframe' (offending key: SESSION_COOKIE_PROFILE).`,
    );
  }
  const sessionCookieProfile: CookieProfile = rawProfile;

  // 3. FRAME_ANCESTORS of 'none' or 'self' is rejected (D-1, §4.5). Unset =>
  //    null => the directive is omitted, which is the demonstration default.
  //    '*' and an explicit origin allowlist are accepted, round-tripped
  //    unchanged (after a whitespace trim).
  const rawFrameAncestors = env.FRAME_ANCESTORS;
  let frameAncestors: string | null;
  if (rawFrameAncestors === undefined || rawFrameAncestors.trim() === '') {
    frameAncestors = null;
  } else {
    const tokens = rawFrameAncestors.trim().split(/\s+/);
    for (const token of tokens) {
      const norm = normaliseFrameAncestorsToken(token);
      if (norm === 'none' || norm === 'self') {
        throw new ConfigError(
          `FRAME_ANCESTORS must not contain 'none' or 'self': it would break the ` +
            `only environment the walkthrough happens in — the preview iframe — and ` +
            `the failure would be discovered in the preview, not at boot (D-1, §4.5). ` +
            `Use '*' or an explicit origin allowlist (offending key: FRAME_ANCESTORS).`,
        );
      }
    }
    frameAncestors = rawFrameAncestors.trim();
  }

  const logLevel = (env.LOG_LEVEL ?? 'info').trim();

  // originIsHttps is derived from PUBLIC_ORIGIN when set, otherwise false. Its
  // scheme decides whether the Secure cookie attribute may be emitted (§4.3).
  const publicOrigin = env.PUBLIC_ORIGIN?.trim();
  let originIsHttps = false;
  if (publicOrigin !== undefined && publicOrigin !== '') {
    originIsHttps = /^https:\/\//i.test(publicOrigin);
  }

  // 4. demo-iframe over plain HTTP is rejected (§4.3, F1 FR-1.3). SameSite=None
  //    requires Secure, and a Secure cookie on an http: origin is silently
  //    dropped by the browser — sign-in would be impossible with no visible
  //    cause. Do NOT emit Secure unconditionally: that is the same failure.
  if (sessionCookieProfile === 'demo-iframe' && !originIsHttps) {
    throw new ConfigError(
      `SESSION_COOKIE_PROFILE=demo-iframe requires an HTTPS origin: SameSite=None ` +
        `needs Secure, and a Secure cookie on a plain-HTTP origin is silently ` +
        `dropped by the browser, making sign-in impossible with no visible cause ` +
        `(§4.3, F1 FR-1.3). Set PUBLIC_ORIGIN to an https:// URL (offending keys: ` +
        `SESSION_COOKIE_PROFILE, PUBLIC_ORIGIN).`,
    );
  }

  // TODO(phase 5 — AI recommendation): promote AI_PROVIDER_URL, AI_API_KEY,
  // AI_MODEL_ID, PROMPT_VERSION, AI_TIMEOUT_MS and AI_WORKER_CONCURRENCY to
  // required here. §6.6 lists them as required, but they become required only
  // when ai/adapter.http.ts exists — reading them as required now would refuse
  // to boot a build that has no AI code at all. Kept optional (unread) until
  // then; this is a deferral comment, not a skipped test.
  // Same DATABASE_URL_AI: request-path only in phase 5.

  return {
    nodeEnv,
    host,
    port,
    databaseUrlApp,
    sessionCookieProfile,
    frameAncestors,
    logLevel,
    originIsHttps,
  };
}
