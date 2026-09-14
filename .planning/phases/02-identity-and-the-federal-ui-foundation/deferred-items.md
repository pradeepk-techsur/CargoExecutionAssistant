# Deferred items — phase 02

Out-of-scope discoveries logged during plan execution. Not fixed by the
discovering plan (scope boundary rule).

## From plan 02-02 (execution 2026-09-14)

- **Attribution correction to the 02-03 notes below.** The
  `server/src/http/{logger,cookies,requestId,headers,errorMapper}.ts` files and
  their unit suites are owned by plan **02-02** (this plan), NOT 02-04. 02-03,
  running in parallel on this branch (wave 2, `parallelization: true`), swept
  three of my untracked source files as "leftovers" mid-execution; I recreated
  and committed them (with the pino ESM-import fix applied) so they are now
  tracked and safe from further sweeps. The parallel collision cost a recreate
  cycle but no lost work. Lesson for future parallel waves: commit each task's
  source files immediately after its tests pass, before another plan's build
  sweep can remove untracked files it does not recognise.

- **Inherited (from 02-01, flagged by 02-03): `import { Pool } from 'pg'` in
  `server/src/db/pool.app.ts` / `pool.ai.ts` fails under native ESM.** Not in
  02-02's scope (my HTTP modules do not import `pg`), but noted here because
  02-04 wires the server entry point that first executes those pools. The
  interop-default form (`import pg from 'pg'; const { Pool } = pg;`) is the fix,
  as 02-03 already applied to the CLI's `Client` import.

## From plan 02-04 (execution 2026-09-14)

- **`npm run build` (the full build) fails at `build:web` because
  `web/styles/uswds.scss` and the SPA do not exist yet.** `web/` currently holds
  only `package.json`, `src/` and `tsconfig.json` — the USWDS stylesheet, the
  shell and the Vite entry are plan **02-05**'s deliverables. 02-04's scope is
  the SERVER build (`npm run build:server`, exit 0) and the API surface; the web
  build is out of scope. Not fixed here (scope boundary). `server/src/index.ts`
  already serves the built web bundle from `web/dist` when `serveStatic` is on,
  so once 02-05 lands the web build the full `npm run build` will pass with no
  server change. The three prior 02-04 deferred flags in the 02-03 section below
  (pool ESM imports, the errorMapper WIP, the untracked http/ leftovers) are all
  RESOLVED: pool.app.ts/pool.ai.ts converted to the interop-default form in this
  plan (Task 1 commit); errorMapper + its suite were completed and committed by
  02-02; the http/ files are all tracked.

## From plan 02-03 (execution 2026-09-14)

- **Untracked `server/src/http/` leftovers break `npm run typecheck`.**
  Three files — `server/src/http/{logger,cookies,requestId}.ts` — exist in the
  working tree, untracked and belonging to no committed plan (they are the
  HTTP-middleware layer owned by plan **02-04**, not 02-03). `logger.ts:80-81`
  fails to compile: `pino(...)` "has no call signatures" — the ESM default
  import is being used as a call target under `moduleResolution: NodeNext`
  (needs `import pino from 'pino'` handled as `pino.default` / a namespace
  fix). Plan 02-03 does not touch the HTTP layer, so this is left for the
  owning plan (02-04) to resolve when it lands those files properly. The 02-03
  code (`clock.ts`, `db/repositories/*`, `services/session.service.ts`,
  `cli/create-specialist.ts`) compiles cleanly on its own; verified by building
  `contract` + the 02-03 sources in isolation.
  **Update (same session):** plan 02-04 was executing in parallel on this branch
  (config `parallelization: true`, this is wave 2). It landed/repaired the
  `server/src/http/` files (adding `headers.ts`) mid-way through 02-03; the full
  `npm run typecheck` subsequently passed clean. No action was ever taken by
  02-03 on those files. Resolved.

- **`server/test/unit/errorMapper.spec.ts` has 3 failing tests.** Untracked, and
  it plus `server/src/http/errorMapper.ts` belong to the same parallel plan
  02-04 (HTTP error-envelope mapping). Its 3 failures are 02-04's in-flight
  state, not a 02-03 regression: `npm run test:db`, `npm run test:arch`,
  `npm run typecheck` and the 02-03 unit test (`throttle.spec.ts`, 8/8) are all
  green. Left for 02-04 to finish. Out of scope for 02-03.

- **Latent runtime bug in committed `server/src/db/pool.app.ts` / `pool.ai.ts`
  (from plan 02-01): `import { Pool } from 'pg'`.** `pg` is CommonJS, so a NAMED
  value import throws `SyntaxError: Named export 'Pool' not found` under Node's
  native ESM loader when the module is executed directly (not bundled). The
  02-03 CLI hit the identical problem with `import { Client } from 'pg'` and was
  fixed to the interop-default form (`import pg from 'pg'; const { Client } =
  pg;`). The pool modules have the same defect and will fail when the server
  entry point boots them at runtime (they were never executed before this phase
  — only type-checked). NOT fixed here: they are 02-01's committed files, and
  02-04 owns the server bootstrap that first runs them; flagging so whoever wires
  the server entry converts both pool imports to the interop-default form.
