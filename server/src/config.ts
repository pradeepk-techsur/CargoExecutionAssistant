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

import {
  getManifestEntry,
  computeFileDigestSync,
} from './ai/promptManifest.js';

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

// The explicit, named non-production AI posture. Setting AI_PROVIDER_URL to
// exactly this literal wires in the deterministic no-network FakeProvider,
// letting the demonstration and every automated test run the full generation
// pipeline with zero external dependency and zero real API key. It is the same
// pattern SESSION_COOKIE_PROFILE=demo-iframe establishes: an intentional,
// self-documenting alternate posture, never a silent default (TechArch §5).
export const FAKE_PROVIDER_URL = 'fake:deterministic';

export interface AppConfig {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly host: string; // never loopback
  readonly port: number; // default 3000
  readonly databaseUrlApp: string;
  readonly sessionCookieProfile: CookieProfile;
  readonly frameAncestors: string | null; // null => directive omitted
  readonly logLevel: string;
  readonly originIsHttps: boolean;
  // AI recommendation environment (§6.6). Required now that AI code exists.
  readonly aiProviderUrl: string; // https:// URL OR 'fake:deterministic'
  readonly aiApiKey: string | null; // null in fake posture (no provider to auth)
  readonly aiModelId: string;
  readonly promptVersion: string; // a known, digest-verified manifest entry
  readonly aiTimeoutMs: number; // default 20000
  readonly aiWorkerConcurrency: number; // default 2
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

  // The AI recommendation environment (§6.6). These are required now, because
  // AI code now exists (this plan builds the provider abstraction the whole of
  // Phase 5 programs against). §6.6 lists them as required; the earlier
  // deferral held only while there was no AI code to configure.

  // 5. AI_PROVIDER_URL — required. Accepts EITHER a https:// URL (a real hosted
  //    provider) OR the exact literal 'fake:deterministic' (the named,
  //    explicit, non-production posture — see FAKE_PROVIDER_URL). Anything else
  //    (missing, empty, http://, any other scheme) is refused. 'fake:...' is a
  //    deliberate, self-documenting alternate posture, never a silent default:
  //    it lets the demonstration and every automated test exercise the full
  //    generation pipeline with no external network dependency and no real API
  //    key (TechArch §5's explicit allowance that the real HTTP adapter be
  //    exercised narrowly or not at all in the automated suite).
  const rawProviderUrl = (env.AI_PROVIDER_URL ?? '').trim();
  const isFakeProvider = rawProviderUrl === FAKE_PROVIDER_URL;
  const isHttpsProvider = /^https:\/\//i.test(rawProviderUrl);
  if (!isFakeProvider && !isHttpsProvider) {
    throw new ConfigError(
      `AI_PROVIDER_URL must be an https:// URL or the literal ` +
        `'${FAKE_PROVIDER_URL}'. A plain-http provider, another scheme, or a ` +
        `missing value is refused (offending key: AI_PROVIDER_URL).`,
    );
  }
  const aiProviderUrl = rawProviderUrl;

  // 6. AI_MODEL_ID — required, non-empty.
  const aiModelId = (env.AI_MODEL_ID ?? '').trim();
  if (aiModelId === '') {
    throw new ConfigError(
      `AI_MODEL_ID is required but was not set (offending key: AI_MODEL_ID).`,
    );
  }

  // 7. PROMPT_VERSION — required, and it must name a known manifest entry whose
  //    template file's SHA-256 digest still matches the pinned digest. This is
  //    the addition-A-2 boot self-check: it refuses to start the server if the
  //    shipped prompt text changed without a version bump, so a prompt_version
  //    recorded on a recommendation always corresponds to the exact template
  //    text that produced it (FR-9.10 traceability).
  const promptVersion = (env.PROMPT_VERSION ?? '').trim();
  if (promptVersion === '') {
    throw new ConfigError(
      `PROMPT_VERSION is required but was not set (offending key: PROMPT_VERSION).`,
    );
  }
  const manifestEntry = getManifestEntry(promptVersion);
  if (manifestEntry === undefined) {
    throw new ConfigError(
      `PROMPT_VERSION is not a known prompt version (offending key: PROMPT_VERSION).`,
    );
  }
  const actualDigest = computeFileDigestSync(manifestEntry.path);
  if (actualDigest !== manifestEntry.sha256) {
    throw new ConfigError(
      `PROMPT_VERSION template digest mismatch — the shipped prompt text ` +
        `changed without a version bump (offending key: PROMPT_VERSION).`,
    );
  }

  // 8. AI_API_KEY — required ONLY when talking to a real https:// provider. The
  //    fake posture has no provider to authenticate to, so the key may be
  //    absent/empty there; stored as null in that case.
  let aiApiKey: string | null = null;
  if (isHttpsProvider) {
    const rawKey = (env.AI_API_KEY ?? '').trim();
    if (rawKey === '') {
      throw new ConfigError(
        `AI_API_KEY is required when AI_PROVIDER_URL is a real https:// ` +
          `provider (offending key: AI_API_KEY).`,
      );
    }
    aiApiKey = rawKey;
  }

  // 9. AI_TIMEOUT_MS — optional, default 20000; a positive integer if set.
  const rawTimeout = (env.AI_TIMEOUT_MS ?? '20000').trim();
  const aiTimeoutMs = Number(rawTimeout);
  if (!Number.isInteger(aiTimeoutMs) || aiTimeoutMs < 1) {
    throw new ConfigError(
      `AI_TIMEOUT_MS must be a positive integer (offending key: AI_TIMEOUT_MS).`,
    );
  }

  // 10. AI_WORKER_CONCURRENCY — optional, default 2; a positive integer if set.
  const rawConcurrency = (env.AI_WORKER_CONCURRENCY ?? '2').trim();
  const aiWorkerConcurrency = Number(rawConcurrency);
  if (!Number.isInteger(aiWorkerConcurrency) || aiWorkerConcurrency < 1) {
    throw new ConfigError(
      `AI_WORKER_CONCURRENCY must be a positive integer (offending key: ` +
        `AI_WORKER_CONCURRENCY).`,
    );
  }

  return {
    nodeEnv,
    host,
    port,
    databaseUrlApp,
    sessionCookieProfile,
    frameAncestors,
    logLevel,
    originIsHttps,
    aiProviderUrl,
    aiApiKey,
    aiModelId,
    promptVersion,
    aiTimeoutMs,
    aiWorkerConcurrency,
  };
}
