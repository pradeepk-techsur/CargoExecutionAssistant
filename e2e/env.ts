// The ONE definition of the e2e server environment and the bootstrap
// credentials. Imported by playwright.config.ts, e2e/global-setup.ts and every
// spec, so no part of the e2e tier can drift from another.
//
// Why the whole environment lives here: `npm start` is `node
// server/dist/index.js` with NO --env-file (the container has no .env, and Node
// 22's --env-file errors on a missing file). loadConfig makes DATABASE_URL_APP
// required and throws BEFORE listen, so the webServer must be handed the
// complete environment or it aborts at startup and takes every Playwright suite
// in the phase down. That is why webServer.env is the whole E2E_ENV, not three
// keys.

const pick = (k: string, fallback: string): string =>
  process.env[k] ?? fallback;

/** Everything the server needs to boot, and everything the specs need to sign in. */
export const E2E_ENV = {
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: '3000',
  PUBLIC_ORIGIN: pick('PUBLIC_ORIGIN', 'http://127.0.0.1:3000'),
  SESSION_COOKIE_PROFILE: 'governed',
  LOG_LEVEL: pick('LOG_LEVEL', 'warn'),
  DATABASE_URL_OWNER: pick(
    'DATABASE_URL_OWNER',
    'postgres://cargoexec_owner:cargoexec_local_owner@localhost:5432/cargoexec',
  ),
  DATABASE_URL_APP: pick(
    'DATABASE_URL_APP',
    'postgres://cargoexec_app:cargoexec_local_app@localhost:5432/cargoexec',
  ),
  DATABASE_URL_AI: pick(
    'DATABASE_URL_AI',
    'postgres://cargoexec_ai:cargoexec_local_ai@localhost:5432/cargoexec',
  ),
  BOOTSTRAP_SPECIALIST_EMAIL: pick(
    'BOOTSTRAP_SPECIALIST_EMAIL',
    'specialist@cbp.example.gov',
  ),
  BOOTSTRAP_SPECIALIST_NAME: pick('BOOTSTRAP_SPECIALIST_NAME', 'A. Rivera'),
  BOOTSTRAP_SPECIALIST_PASSWORD: pick(
    'BOOTSTRAP_SPECIALIST_PASSWORD',
    'cargoexec-local-demo-password',
  ),

  // ── The AI recommendation environment (§6.6; plan 05-01's required keys) ────
  // loadConfig now makes these mandatory (AI code exists as of Phase 5), so the
  // e2e web server aborts at boot without them — exactly like DATABASE_URL_APP.
  // The whole object is handed to the webServer child process, so a PARTIAL
  // addition would fail the AI self-checks and take every Phase 5 e2e suite down.
  //
  // AI_PROVIDER_URL=fake:deterministic wires createFakeProvider (config.ts §6.6
  // / index.ts): the full generation pipeline runs with NO network dependency
  // and NO real API key, so the browser suite proves genuine PENDING→AVAILABLE
  // and PENDING→UNAVAILABLE transitions deterministically. AI_API_KEY is NOT
  // needed for the fake posture (config.ts only requires it for a real https://
  // provider). PROMPT_VERSION MUST be byte-identical to the version shipped in
  // plan 05-01 (server/src/ai/prompt/manifest.json → '2026.09.1'); a mismatch
  // fails the boot digest self-check.
  AI_PROVIDER_URL: pick('AI_PROVIDER_URL', 'fake:deterministic'),
  AI_MODEL_ID: pick('AI_MODEL_ID', 'e2e-fake-model'),
  PROMPT_VERSION: pick('PROMPT_VERSION', '2026.09.1'),
  AI_TIMEOUT_MS: pick('AI_TIMEOUT_MS', '20000'),
  AI_WORKER_CONCURRENCY: pick('AI_WORKER_CONCURRENCY', '2'),
} as const;
