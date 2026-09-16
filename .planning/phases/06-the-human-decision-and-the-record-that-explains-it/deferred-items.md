# Phase 6 — deferred / out-of-scope items

## Out of scope for 06-02 (owner = 06-03, the F12 decision web UI)

- **`server/test/architecture/receiptPaths.spec.ts` test 9 fails** — "web/src
  makes no state-changing fetch/api call to an exception collection". The
  offender is `web/src/api/client.ts`'s `POST /api/exceptions/${…}/decision`,
  committed on the phase branch by the PARALLEL wave-2 plan **06-03**
  (commit `2af4e9a feat(06-03): api.postDecision, ProvenanceBadge modified
  marker, DecisionPanel`). This is the F12 decision UI legitimately posting a
  decision — the arch assertion, written in Phase 4 when NO exceptions-collection
  mutation existed, must be RELAXED to permit the `/decision` endpoint under a
  state-changing method (the one deliberate, tested exception, mirroring the
  server-side `receiptPaths` allowlist that already names `decision.service.ts`).

  Plan 06-02 touches no `web/` file and adds no decision-posting call; this
  failure is therefore outside its scope (SCOPE BOUNDARY rule). It is 06-03's
  job to update `receiptPaths.spec.ts` alongside its `api.postDecision` addition.
  Recorded here so the phase gate / gap closure sees the real cause, not a
  06-02 regression.

  Verification that it is NOT a 06-02 regression: `npm run test:api` (170),
  `npm run test:db` (196), `npm run test:unit` (297) are all green after 06-02;
  the only arch failure names `web/src/api/client.ts`, a file 06-02 never edits.
