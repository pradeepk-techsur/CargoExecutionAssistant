import { defineConfig, devices } from '@playwright/test';
import { E2E_ENV } from './e2e/env.js';

// Playwright configuration for the shell browser suite (TechArch §8.3, §7.8).
//
// §7.8: this suite is "a functional test of SM-11's task completability, not an
// accessibility conformance gate". It asserts NO WCAG rule and installs NO
// accessibility scanner — it asserts structure, focus and keyboard behaviour,
// which a browser can actually prove.

export default defineConfig({
  testDir: 'e2e',
  // NOT `reports/` — that directory name is forbidden by absence.spec.ts.
  outputDir: 'test-results',
  reporter: [['list']], // no HTML report directory (not a deliverable)
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The SAME sequence the compose service runs (plan 02-08), with a bounded
    // database wait in front of it: build → wait-for-db → migrate → provision
    // the account if absent → serve. e2e and deployment therefore exercise one
    // boot path, not two that can drift. The build runs first because it is the
    // slow step and needs no database — the container gets that time to come up.
    command: [
      'npm run build',
      'node e2e/wait-for-db.mjs',
      'node server/scripts/migrate.mjs',
      'node server/dist/cli/create-specialist.js --from-env --if-absent',
      'node server/dist/index.js',
    ].join(' && '),
    url: 'http://127.0.0.1:3000/sign-in',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // LOAD-BEARING: the COMPLETE E2E_ENV, not three keys. `npm start` reads no
    // env file and loadConfig requires DATABASE_URL_APP before listen; a partial
    // env aborts the web server at startup and takes every suite down.
    env: { ...E2E_ENV },
  },
});
