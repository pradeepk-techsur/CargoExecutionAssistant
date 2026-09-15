# Deferred items — Phase 04 (The Receipt-Ordered Queue)

Out-of-scope discoveries logged during plan execution. These are NOT fixed by
the plan that found them; each names the owning module/plan.

## 04-03

- **A mutating method on a PARAMETERISED /api path returns 404, not 405.**
  `app.ts::apiNotFoundOr405` keys its known-path set (`IMPLEMENTED_BY_PATH`) on
  the ROUTE PATTERNS from `API_ROUTE_TABLE` (e.g.
  `/api/exceptions/:idOrReference`), but compares them against the CONCRETE
  request path (e.g. `/api/exceptions/<uuid>`). A concrete parameterised path
  matches no pattern key, so `PUT/POST/DELETE/PATCH /api/exceptions/<uuid>` is
  treated as an unknown path → `404 ENTRY_NOT_FOUND` rather than
  `405 METHOD_NOT_ALLOWED`. This is framework-wide: `PUT /api/entries/<uuid>`
  behaves identically, and it pre-exists this plan (it lives in `app.ts`, owned
  by 02-04/03-06). The load-bearing guarantee — no mutation reaches an exception
  or an entry (F5 FR-5.1, FR-7.10) — holds either way, and the COLLECTION paths
  (`/api/exceptions`, `/api/entries`) do give a clean 405. Fixing it would mean
  teaching `apiNotFoundOr405` to match concrete paths against route patterns
  (an Express-router-style match) — an architectural change to shared HTTP
  plumbing, out of scope for a route-wiring plan. `exceptions.spec.ts` case 18
  accepts either 4xx and documents the reason inline.
  Owner: `server/src/http/app.ts` (02-04 / 03-06).
