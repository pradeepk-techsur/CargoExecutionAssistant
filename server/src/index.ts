// The process bootstrap (TechArch §6.5, §8.7 step 6).
//
// The order here is normative (§8.7 step 6): configuration and its self-checks
// run BEFORE the server listens, so a misconfiguration refuses to boot loudly
// rather than serving a broken origin. loadConfig() throws on a bad environment
// (loopback HOST, demo-iframe over http, a frame-blocking FRAME_ANCESTORS, a
// missing DATABASE_URL_APP); we let it throw and the process exits non-zero.
//
// One origin, one port, bound to 0.0.0.0:3000 (§6.5). The preview proxy reaches
// the app only over 127.0.0.1:<port>, so binding a loopback host would make the
// demonstration simply not exist — config already refuses that.

import { loadConfig } from './config.js';
import { createLogger } from './http/logger.js';
import { createApp } from './http/app.js';
import { getAppPool, closeAppPool } from './db/pool.app.js';

// ── Serving mode ─────────────────────────────────────────────────────────────
//
// DEVIATION (recorded in this plan's SUMMARY): §6.5's Vite-middleware excerpt is
// normative, but this bootstrap ships PRODUCTION-MODE SERVING ONLY. In
// development, run `npm run build && npm start` — the demonstration path is the
// production path, and §6.5's requirement that matters is one origin, one port,
// bound to 0.0.0.0:3000, which production-mode serving satisfies exactly.
// Mounting Vite in middleware mode via a dynamic import() is deliberately not
// done here: it adds a dev-only code path (and a dev-only failure surface) that
// the walkthrough never exercises. The SPA and its assets are served by
// express.static + the SPA fallback from the built web bundle.

async function main(): Promise<void> {
  // 1. Config + self-checks. Throws here, BEFORE listen (§8.7 step 6).
  const config = loadConfig();
  const logger = createLogger(config);

  // 2. §4.8 reduced-posture warning on a non-HTTPS origin: the session cookie
  //    will omit Secure, which is acceptable for a local demonstration but must
  //    be stated at boot so no one mistakes it for a production posture.
  if (!config.originIsHttps) {
    logger.warn(
      { cookie_profile: config.sessionCookieProfile },
      'origin is not HTTPS: the session cookie will omit Secure (local demonstration posture, TechArch §4.8)',
    );
  }

  // 3. Assemble the app with the request-path pool. Serve static in any mode
  //    other than development (the demonstration runs the production path).
  const serveStatic = config.nodeEnv !== 'development';
  const app = createApp({
    config,
    pool: getAppPool(),
    serveStatic,
    // The built web bundle. web/vite.config.ts builds to web/dist (plan 02-05).
    webDist: new URL('../../web/dist', import.meta.url).pathname,
  });

  // 4. Bind 0.0.0.0:3000 (defaults). One origin, one port (§6.5).
  const server = app.listen(config.port, config.host, () => {
    logger.info(
      { host: config.host, port: config.port },
      'cargoexec listening',
    );
  });

  // 5. Graceful shutdown: stop accepting, close the pool, exit 0.
  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void closeAppPool().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  // A boot failure (bad config, a pool that cannot be constructed) must exit
  // non-zero and loudly. Do not swallow it into a half-started process.
  // eslint-disable-next-line no-console
  console.error(
    'cargoexec failed to start:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
