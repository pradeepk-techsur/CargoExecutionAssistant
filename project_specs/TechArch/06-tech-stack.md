## 6. Technology Stack

### 6.1 Selection criteria

In the PRD's stated priority order: (1) USWDS conformance and full control over rendered markup, (2) ability to enforce append-only audit storage at the persistence layer, (3) fast delivery of a *complete* loop. A secondary constraint shaped several choices: the demonstration must run in a sandbox behind a preview iframe proxy, with no outbound network access except the AI provider call.

### 6.2 Pinned versions

Exact pins (no `^`, no `~`) in `package.json`, with a committed lockfile. Every line has one reason.

| Layer | Technology | Version | Rationale (one line) |
|---|---|---|---|
| Runtime | **Node.js** | `22.11.0` (LTS) | Active LTS with native `fetch`/`undici` and stable `node:test`-free tooling; one runtime for API, SPA build, worker, and CLI. |
| Language | **TypeScript** | `5.6.3` | `strict` + `noUncheckedIndexedAccess` make the provenance types of §3.9 enforceable rather than decorative. |
| HTTP server | **Express** | `4.21.1` | Smallest well-understood middleware chain for ten routes; deliberately not Express 5 (still stabilising) and not a framework with opinionated data access. |
| Security headers | **helmet** | `8.0.0` | Sane header defaults *with* the ability to disable `frameguard` and hand-write CSP — required by D-1. |
| Request validation | **zod** | `3.23.8` | `.strict()` gives unknown-property rejection (`422 REQUEST_MALFORMED`) for free, which is what blocks a client-supplied `origin`/`decided_by`. |
| Database | **PostgreSQL** | `16.4` | Deferred constraint triggers, partial indexes, column/table privileges, and `pgcrypto` — the four features the governance guarantees are built on. |
| DB driver | **pg** (node-postgres) | `8.13.1` | Thin, parameterised, transaction-explicit. **No ORM by design**: no `save()`/`upsert()`/dirty-flush that could emit an `UPDATE` against an append-only table (R-4). |
| Migrations | **node-pg-migrate** | `7.9.0` | Numbered, forward-only, transactional SQL migrations applied by the owner role; no down-migrations in v1. |
| Password hashing | **argon2** | `0.41.1` | Argon2id at the parameters F1 FR-1.4 requires; native binding, not a JS approximation. |
| Logging | **pino** | `9.5.0` | Structured logs with path-based redaction, so secrets cannot reach a log line by accident. |
| UI library | **React** | `18.3.1` | Mature, matches the FRD's SPA design; paired with a design system whose peer support is React 18. |
| | **react-dom** | `18.3.1` | Pinned with React. |
| Routing | **react-router-dom** | `6.28.0` | Declarative routes matching the seven-route table; no data-loader magic needed for four read endpoints. |
| Design system | **@uswds/uswds** | `3.11.0` | **Mandatory.** The federal standard for CBP-facing applications; consumed as Sass + JS + icon sprite so the project owns the rendered markup (NFR-1, §7). |
| Sass compiler | **sass** (dart-sass) | `1.80.6` | Compiles USWDS settings + tokens; the supported USWDS build path. |
| Build / dev server | **Vite** | `5.4.11` | Fast TS/React build; runs in **middleware mode inside Express**, so dev and production are one origin on one port (§6.5). |
| Unit / integration tests | **Vitest** | `2.1.5` | Same TS config as the app; fast enough to keep the DB-invariant suite in the normal loop. |
| HTTP tests | **supertest** | `7.0.0` | Exercises the real Express app including middleware order. |
| Browser tests | **@playwright/test** | `1.48.2` | Keyboard-only walkthrough of the six-stage loop (SM-11). **Functional only — not an accessibility gate**, and `axe-core` is deliberately not a dependency (§7.8). |
| Container base | **node:22.11-bookworm-slim** | pinned digest | Reproducible image; slim base with no build toolchain in the runtime stage. |
| Container base (db) | **postgres:16.4-bookworm** | pinned digest | Matches the pinned server version exactly. |

### 6.2a Phase 7 — visual redesign: Carbon Design System (`@carbon/react`)

Phase 7 replaces `@uswds/uswds@3.11.0` as the shell's visual system with the **Carbon Design System** (carbondesignsystem.com), IBM's open-source, MIT/Apache-family-licensed design system, consumed via the `@carbon/react` npm package — which in turn depends on `@carbon/styles` (the underlying Sass package) and `@carbon/icons-react` (SVG icon components) (PRD §4.1, §5.1 F2). The exact version pin and the exact Sass import surface are Phase 7 planning/execution work once the planner reads the installed package's API; this chunk does not pin a version here. What is fixed now, because Carbon is a concrete, verified target rather than an unknown:

- **Self-hosting survives the choice of design system, and Carbon satisfies it.** Today `web/scripts/copy-uswds-assets.mjs` copies fonts, icons, and JS into the build so nothing is fetched from a CDN at runtime (FR-2.3). Carbon satisfies this the same way: `@carbon/react`, `@carbon/styles`, and `@carbon/icons-react` are all npm-installable and self-hostable, and IBM Plex — Carbon's default typeface — is open-licensed and redistributable, so it can be self-hosted exactly as Public Sans is today. `@carbon/icons-react` ships icons as SVG React components rather than an icon-sprite file — a build-approach difference from USWDS's sprite, not a CDN dependency and not a blocker. No CDN dependency is introduced by this swap.
- **The CSP survives the choice of design system, and Carbon satisfies it.** `style-src 'self'` with no `unsafe-inline` (§4.5) means styles must arrive as a compiled, `<link>`-loaded stylesheet — today `web/styles/app.scss` compiled by dart-sass into `web/public/assets/uswds.css`. Carbon compiles from Sass to static CSS, the same as USWDS does today — it is **not** runtime CSS-in-JS — so it is compatible with the existing build-time `npm run build:css`-style pipeline and requires no CSP relaxation.
- **The build pipeline shape (one Sass entry point, one compiled stylesheet, no CDN) is preserved.** `web/styles/app.scss` remains that single Sass entry point; only its content changes, from USWDS's `@use`/`@forward` statements to Carbon's equivalent Sass entry points (exact surface: Phase 7 planning, against the installed `@carbon/react`/`@carbon/styles` version). See §6.4 for the current pipeline and `01-components.md` §1A.1b for the corresponding component-architecture note.
- **`docs/uswds-conformance-register.md` will be re-authored mapping every control to its Carbon component** (see `01-components.md` §1A.1b).
- **Section 508 / WCAG 2.1 AA conformance is unaffected**, and Carbon's own stated compliance target — WCAG AA, Section 508, and EN accessibility standards (IBM's own Accessibility Checklist) — matches this project's bar (`07-accessibility.md` §7.1a).

**Dependency allowlist test.** `test/architecture/dependencies.spec.ts` asserts the production dependency set equals the list above and fails on the presence of any of: an ORM or query builder (`typeorm`, `prisma`, `sequelize`, `knex`, `drizzle-orm`, `mikro-orm`), `axe-core` / `@axe-core/*` / `jest-axe`, any CSV/XLSX/PDF writer (`csv-stringify`, `exceljs`, `pdfkit`, `puppeteer`), any multipart parser (`multer`, `busboy`, `formidable`), any scheduler (`node-cron`, `agenda`, `bullmq`, `bull`, `node-schedule`), any broker/cache client (`amqplib`, `kafkajs`, `ioredis`, `redis`), any AI provider SDK (`openai`, `@anthropic-ai/sdk`, `@azure/openai`, `langchain`), any auth federation library (`passport-saml`, `openid-client`, `@node-saml/*`), and any analytics/telemetry/error-reporting SaaS client. Each absence corresponds to an explicit PRD §10 exclusion; the test is how §10 becomes a build constraint.

### 6.3 Why not the obvious alternatives

| Alternative | Why not |
|---|---|
| **An ORM** (Prisma/TypeORM/Sequelize) | Its convenience methods are exactly the risk R-4 names. An ORM that can `update()` a loaded row is a permanent standing threat to an append-only table, and its migration tooling would fight the privilege/trigger-first migration design. Hand-written SQL for thirteen tables and ten endpoints is less code than the ORM's configuration. |
| **Next.js** | Not needed: the FRD specifies an SPA that bootstraps from `GET /api/session`, and SSR buys nothing for five authenticated screens. It would also add a long-running-worker/route-handler mismatch for the in-process AI worker. **If Next.js is nevertheless substituted, the config-extension constraint is binding: Next < 15 cannot read `next.config.ts`. Either pin Next ≥ 15, or use `next.config.mjs`/`next.config.js`. Never ship `next.config.ts` on Next 14** — it is silently ignored, which in this project would silently drop the `0.0.0.0` binding and the header configuration that make the demonstration reachable and embeddable. |
| **A component library wrapper over USWDS** | An extra abstraction between the project and the markup whose accessibility is being certified by manual review. USWDS's own Sass and HTML patterns, wrapped in thin project components, keep the rendered DOM reviewable (§7.2). |
| **Separate API and SPA origins** | Two ports, CORS, and a cross-site cookie problem inside the preview iframe, in exchange for nothing. One origin on port 3000 is simpler and more robust in the sandbox. |
| **A job queue for AI generation** | Y3 FR-Y3.12 forbids a broker, and the work is one bounded in-process call per case with no retry semantics to manage. A queue would also create the durable "retry it later" behaviour F9 FR-9.14 explicitly prohibits. |

### 6.4 Build pipeline

```
 contract/  ──tsc──►  d.ts + js        (imported by both sides, no runtime deps)
 web/       ──vite build──►  dist/     hashed JS/CSS + index.html
     styles/uswds.scss ──sass──►  one stylesheet (tokens + components)
     @uswds/uswds assets ──copy──►  dist/assets/{fonts,img,uswds sprite}
 server/    ──tsc──►  dist/            express app + worker + CLI
 Dockerfile  stage 1: build all of the above
             stage 2: node:22.11-slim + dist/ + node_modules(prod) + migrations
```

USWDS assets — styles, fonts, and the icon sprite — are **bundled and served by the application itself**. There is no runtime CDN dependency, so the demonstration renders correctly with no external network access (FR-2.3), and CSP can stay `'self'`-only with no inline script anywhere (§4.5).

### 6.5 Dev server, binding, and the preview proxy

Both development and production serve **one origin, one port**:

```typescript
// server/src/index.ts (excerpt — normative)
const HOST = process.env.HOST ?? '0.0.0.0';   // never 'localhost' / 127.0.0.1
const PORT = Number(process.env.PORT ?? 3000); // deterministic, not ephemeral

if (config.nodeEnv === 'development') {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { port: PORT } },
    appType: 'spa',
  });
  app.use(vite.middlewares);          // SPA + HMR on the SAME port as /api
} else {
  app.use(express.static('web/dist', { index: false }));
  app.get('*', serveIndexHtml);       // SPA fallback, after the API routes
}

app.listen(PORT, HOST, () =>
  logger.info({ host: HOST, port: PORT }, 'cargoexec listening'));
```

```typescript
// web/vite.config.ts (excerpt — normative)
export default defineConfig({
  server: {
    host: '0.0.0.0',      // bind all interfaces so the proxy can reach it
    port: 3000,
    strictPort: true,     // fail loudly rather than drift to 3001
    allowedHosts: true,   // accept the preview proxy's Host header
    hmr: { clientPort: 3000 },
  },
});
```

Requirements this satisfies, stated explicitly because a sandbox preview fails silently otherwise:

| Requirement | How |
|---|---|
| Bound to `0.0.0.0` | `HOST` defaults to `0.0.0.0`; binding to `localhost`/`127.0.0.1` is prohibited — a startup self-check logs an error and exits if `HOST` resolves to loopback, because the proxy would see a refused connection |
| Deterministic port 3000 | `PORT` defaults to `3000`; `strictPort: true` means a busy port is a hard failure rather than a silent move to 3001 |
| Reachable through a host-rewriting proxy | `allowedHosts: true` in dev (Vite's host check otherwise rejects an unknown `Host`); the production path serves static files and performs no host check |
| Embeddable in an IFRAME | No `X-Frame-Options` is ever emitted; CSP `frame-ancestors` is omitted by default and may be scoped to the preview origin, but may never be `'none'` or bare `'self'` (§4.5, D-1) |
| One origin for SPA and API | Both are served by the same Express instance on the same port, so the session cookie is first-party and `connect-src 'self'` holds |
| Route order | API routes are registered **before** the SPA fallback, so `GET /api/unknown` returns a JSON `404` envelope rather than `index.html` |

### 6.6 Configuration surface (environment only)

No secret is in source control; every key is listed in `.env.example` with no real value; a startup self-check fails fast on a missing required key (FR-Y3.13).

| Key | Required | Default | Purpose |
|---|---|---|---|
| `HOST` | no | `0.0.0.0` | Bind address; loopback is rejected |
| `PORT` | no | `3000` | Listen port |
| `NODE_ENV` | no | `production` | Selects Vite middleware vs static serving |
| `DATABASE_URL_APP` | **yes** | — | `cargoexec_app` connection string (request path) |
| `DATABASE_URL_AI` | **yes** | — | `cargoexec_ai` connection string (worker) — addition A-1 |
| `DATABASE_URL_OWNER` | migrations only | — | `cargoexec_owner`; used by the migration runner and the CLI, never by the server process |
| `SESSION_COOKIE_PROFILE` | no | `governed` | `governed` \| `demo-iframe` (§4.3) |
| `FRAME_ANCESTORS` | no | *(unset ⇒ directive omitted)* | CSP `frame-ancestors` value; `'none'`/`'self'` rejected at startup (D-1) |
| `AI_PROVIDER_URL` | **yes** | — | Must be `https:` |
| `AI_API_KEY` | **yes** | — | Never logged, never returned, never audited |
| `AI_MODEL_ID` | **yes** | — | Recorded on every recommendation |
| `PROMPT_VERSION` | **yes** | — | Must exist in the prompt manifest with a matching digest |
| `AI_TIMEOUT_MS` | no | `20000` | Per-attempt timeout |
| `AI_WORKER_CONCURRENCY` | no | `2` | Bounded generation concurrency |
| `LOG_LEVEL` | no | `info` | pino level |

Absent by design: no feature flag of any kind, no `ENABLE_*` toggle, no `SKIP_VALIDATION`, no `AUTO_APPROVE`, no export path, no seed switch, no role or permission configuration, no IdP settings, no metrics endpoint or sink. A configuration key that could enable an excluded capability is itself scope leakage.

---
