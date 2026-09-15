# CargoExecutionAssistant

A cargo exception is never resolved without an accountable human decision, and
every decision — what was recommended, what was chosen, by whom, and when — is
permanently traceable.

This is the demonstration run procedure. It is TechArch §8.7 made runnable.

## 1. Prerequisites

- **Docker** with **Compose**. Nothing else — Node is needed only for local
  development, not to run the demonstration.

## 2. Run

```bash
cp .env.example .env       # adjust the bootstrap credentials if you wish
docker compose up -d --build
# open http://localhost:3000/sign-in
```

Sign in with the bootstrap account:

- **Email:** `specialist@cbp.example.gov` (default; `BOOTSTRAP_SPECIALIST_EMAIL`)
- **Password:** comes from `BOOTSTRAP_SPECIALIST_PASSWORD`
  (default `cargoexec-local-demo-password` — **change it before any non-local use**)

## 3. What the container does on every boot

The `web` service command runs, in order:

1. **migrate** — `node server/scripts/migrate.mjs` applies the migration set as
   `cargoexec_owner`. Forward-only; already-applied migrations are skipped.
2. **create the specialist if absent** —
   `create-specialist --from-env --if-absent` inserts the bootstrap account.
3. **serve** — `node server/dist/index.js` binds `0.0.0.0:3000`.

The first two steps are **idempotent**: the volume persists, so the command
re-runs on every boot, migrate reports nothing to apply and the bootstrap
creates nothing a second time. A second `docker compose up` neither fails nor
duplicates.

## 4. The account is not seed data

The bootstrap inserts **one row in `specialists`** and nothing else — no cargo
entries, no cases, no recommendations, no decisions, no audit history (PRD §10
#7). It exists only so the sign-in screen can be signed into (TechArch §8.7
step 5: "the ONLY insert performed operationally; no seed data is created").
The record starts empty; the demonstration begins by typing an entry (which
arrives in Phase 3). Do not extend the bootstrap into a demonstration dataset,
and do not delete it as scope leakage.

## 5. Creating another account

```bash
docker compose exec web \
  node server/dist/cli/create-specialist.js --email you@example.gov --display-name "Your Name"
# the password is entered interactively (never on the command line)
```

There is no self-registration, no password reset and no user-administration
screen, by design (F1 FR-1.13): one application role, binary authentication.

## 6. Embedding in a preview proxy

The application sends **no** `X-Frame-Options` header, ever (D-1), so it can be
embedded in the preview iframe.

- Leave `FRAME_ANCESTORS` **unset** to be embeddable anywhere, or set it to the
  preview origin's allowlist. It may **never** be `'none'` or `'self'` — the app
  refuses to start, because that would break the only environment the
  walkthrough happens in.
- The cookie profile defaults to `governed` (`SameSite=Lax`), which is correct
  when the proxy serves the app **same-origin under a path** (§4.3, the
  preferred configuration). If the proxy instead serves the app **cross-origin**
  and sign-in silently fails, set `SESSION_COOKIE_PROFILE=demo-iframe` **and**
  ensure `PUBLIC_ORIGIN` is an `https:` URL. `loadConfig` refuses `demo-iframe`
  over plain HTTP, so this failure is loud at boot rather than a silently
  dropped cookie.

## 7. Liveness

```bash
docker compose exec web node server/dist/cli/ping.js
```

`ping.js` opens a database connection, runs `SELECT 1`, closes it, and exits
non-zero on failure. There is deliberately **no HTTP health endpoint** (§8.6):
the endpoint inventory is exhaustive at ten routes by requirement, so liveness
is checked out of band rather than as an eleventh route.

## 8. Tests

```bash
npm run test          # unit, db, api, arch (vitest)
npx playwright test   # browser, keyboard-only (against the built server)
```

To run the browser suites against the composed stack (deployment, not just
code):

```bash
docker compose up -d --build
E2E_BASE_URL=http://localhost:3000 npx playwright test --reporter=list
```

There is **no CI workflow and no automated accessibility gate** in v1 (PRD §10
#1, NFR-2); accessibility is enforced by the signed per-screen reviews in
`docs/a11y/`.

## 9. Data reset

```bash
docker compose down -v
```

This removes the database volume. There is no in-application reset and no seed
step to re-run, because the audit tables cannot be truncated (§8.8): a reset is
a new volume, not a mutation of the old one.
