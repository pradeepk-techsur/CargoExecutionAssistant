---
phase: 05-ai-recommendation-as-an-un-applied-proposal
plan: 06
subsystem: testing
tags: [playwright, e2e, accessibility, fake-provider, uswds, react, provenance]

requires:
  - phase: 05-05
    provides: web/src/screens/CaseDetail.tsx (the F10 case-detail screen), ProvenanceBadge, api.getRecommendation
  - phase: 05-04
    provides: the real F9 generation mechanism + fake:deterministic provider selection in index.ts
  - phase: 05-01
    provides: the mandatory §6.6 AI config self-checks and PROMPT_VERSION=2026.09.1
provides:
  - "e2e/case-detail.spec.ts — the F9/F10 Playwright regression suite (10 real-browser scenarios)"
  - "e2e/env.ts AI-environment additions (fake:deterministic wired into the shared webServer env)"
  - "docs/a11y/case-detail.md — the signed NFR-2 accessibility record for /cases/:caseReference"
  - "docs/uswds-conformance-register.md rows for ProvenanceBadge + the comparison-row composition"
  - "A fully green npm run test:all — the Phase 5 completion gate"
affects: [phase-6, decision-flow, audit-trail, e2e-suite]

tech-stack:
  added: []
  patterns:
    - "Real-browser proof of F9 via AI_PROVIDER_URL=fake:deterministic — the full generation pipeline runs with no network"
    - "FAKE_AI_TRIGGERS markers in a submitted field force a chosen provider FAILURE branch deterministically"
    - "In-page-nav resolution proven by clicking each link and asserting toBeInViewport(), not just href strings"
    - "Monochrome provenance proven by neutralising colour via direct inline-style DOM properties (CSP-safe, no addStyleTag)"

key-files:
  created:
    - e2e/case-detail.spec.ts
    - docs/a11y/case-detail.md
  modified:
    - e2e/env.ts
    - e2e/queue.spec.ts
    - web/src/screens/CaseDetail.tsx
    - docs/uswds-conformance-register.md
    - .planning/phases/05-ai-recommendation-as-an-un-applied-proposal/deferred-items.md

key-decisions:
  - "The e2e AI posture is fake:deterministic in e2e/env.ts only; the compose web service's missing AI env is deferred to Phase 6's compose plan (documented threat T-05-16 accepts the fake posture)."
  - "A real FR-2.24 focus regression on the case screen (focus fell to <body> after the loading→loaded transition) was auto-fixed by re-asserting h1 focus on the loading→terminal edge."

patterns-established:
  - "Provenance colour-independence is proven, not just asserted: colour is removed at runtime and the badge text is re-read."
  - "In-page nav links are proven to genuinely resolve (fragment set AND target scrolled into view), the FR-10.10 blocker-fix's browser-level evidence."

duration: 41min
completed: 2026-09-15
---

# Phase 5 Plan 6: F9/F10 Browser Proof & Accessibility Sign-off Summary

**Genuine PENDING→AVAILABLE and PENDING→UNAVAILABLE transitions proven in a real browser against a real server (fake:deterministic provider, no network), plus the signed NFR-2 case-detail accessibility record — closing Phase 5 with a fully green `npm run test:all` (782 unit/db/api/arch + 47 e2e, 0 failures, 0 skipped).**

## Performance

- **Duration:** ~41 min
- **Started:** 2026-09-15T22:54:38Z (session)
- **Completed:** 2026-09-15
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `e2e/case-detail.spec.ts` — 10 real-browser scenarios covering both recommendation outcomes end to end (via the FakeProvider), FR-10.7 focus-not-stolen, monochrome provenance (crit 2), heading order + a genuinely-resolving "On this page" nav (FR-10.10), verbatim value rendering (FR-10.6/10.16), uuid canonicalisation without reload (FR-10.13), the inert Phase-6 stubs (FR-10.12), and the dedicated case-not-found (FR-10.15). All 10 pass.
- `e2e/env.ts` — the five §6.6 AI keys wired into the shared webServer env so the e2e server boots the deterministic no-network provider.
- Auto-fixed a real FR-2.24 focus regression in `web/src/screens/CaseDetail.tsx`: navigation now lands focus on the case h1 (it was falling to `<body>` after the loading→loaded re-render).
- `docs/a11y/case-detail.md` signed off per NFR-2, every checklist line citing a passing case-detail.spec test with real Phase 5 counts; `docs/uswds-conformance-register.md` extended (append-only) with ProvenanceBadge and the comparison-row composition.
- The Phase 5 completion gate `npm run test:all` is fully green.

## Task Commits

1. **Task 1: wire fake AI into e2e + author the case-detail suite** — `25f3293` (test)
2. **Deviation fix (found running the phase gate): restore FR-2.24 h1 focus** — `7390d9c` (fix)
3. **Task 2: a11y sign-off + conformance register** — `8cadddb` (docs)

_Note: the focus fix is committed separately because it is a distinct production-code change, not a test-only change._

## Files Created/Modified

- `e2e/case-detail.spec.ts` — the F9/F10 Playwright regression suite (created)
- `docs/a11y/case-detail.md` — the signed §7.7/NFR-2 accessibility record (created)
- `e2e/env.ts` — added AI_PROVIDER_URL=fake:deterministic + AI_MODEL_ID/PROMPT_VERSION/AI_TIMEOUT_MS/AI_WORKER_CONCURRENCY
- `web/src/screens/CaseDetail.tsx` — re-assert h1 focus on the loading→terminal edge (FR-2.24 fix)
- `e2e/queue.spec.ts` — poll for the case screen's h1 focus (it is now the real async screen); corrected a stale NotBuiltYet comment
- `docs/uswds-conformance-register.md` — append-only ProvenanceBadge + comparison-row rows and a Notes paragraph
- `.planning/phases/.../deferred-items.md` — logged the compose AI-env gap for Phase 6

## Decisions Made

- **fake:deterministic lives in `e2e/env.ts` (test path) only.** The compose `web` service's missing AI env is a real deployment-path gap now that `loadConfig` requires the AI keys, but fixing it is outside 05-06's declared files; deferred to Phase 6's compose/demo plan and logged. T-05-16 already accepts `fake:deterministic` as the explicit non-production posture.
- **In-page nav resolution is proven, not assumed:** each link is clicked and its target heading asserted `toBeInViewport()` — the FR-10.10 blocker-fix's browser-level evidence, not a matching-href check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Case screen did not land focus on its h1 after loading (FR-2.24)**
- **Found during:** Task 2 (running the full e2e phase gate — `queue.spec.ts` test 1 and, on inspection, every arrival at the case screen)
- **Issue:** `CaseDetail` mounts in a `loading` state; `useScreenFocus` focuses the loading-state h1, which React then unmounts when the screen re-renders into its loaded/not-found/error presentation — dropping focus to `<body>`. A specialist arriving at a case had to Tab from the top to reach the content. The queue's own test 1 exposed it because the destination is now the real async screen (Phase 5), not the old NotBuiltYet placeholder.
- **Fix:** Added a focus effect keyed on the screen status that re-asserts `h1Ref.current.focus()` on the loading→terminal edge (moment 1 of the focus discipline; not a poll- or announcement-driven move).
- **Files modified:** `web/src/screens/CaseDetail.tsx` (+ `e2e/queue.spec.ts` and `e2e/case-detail.spec.ts` adjusted to poll for the settled focus destination rather than sampling it synchronously)
- **Verification:** the whole e2e suite (47) passes; the a11y record logs this as defect 1 with the fix commit.
- **Committed in:** `7390d9c`

**2. [Rule 3 - Blocking] Playwright Chromium + Linux deps not installed in the sandbox**
- **Found during:** Task 1 (first e2e run — "Executable doesn't exist … chromium-1140")
- **Issue:** the fresh sandbox had no Playwright browser binary or its Linux libraries, so no e2e could run.
- **Fix:** `npx playwright install chromium` + `npx playwright install-deps chromium` (sandbox has 63 GB RAM, well above the browser-launch memory guard).
- **Files modified:** none (environment only).
- **Verification:** all 47 e2e tests subsequently ran and passed.
- **Committed in:** n/a (no code change)

**3. [Rule 3 - Blocking] A stale `cargoexec-web` container held :3000 without the fake provider**
- **Found during:** Task 1 (the e2e webServer reuses an existing server on :3000 when not in CI; the running container predates the AI config self-checks and has no fake provider)
- **Issue:** reusing that container would run the AVAILABLE/UNAVAILABLE scenarios against a server with no fake:deterministic provider, so the real-mechanism proofs could not run.
- **Fix:** `docker stop cargoexec-web` so the Playwright webServer boots its own fresh server with `e2e/env.ts`'s AI env (db container left up, as global-setup expects).
- **Files modified:** none (environment only; documented in deferred-items for Phase 6).
- **Verification:** the fresh webServer booted with the AI keys and every real-mechanism test passed.
- **Committed in:** n/a (no code change)

---

**Total deviations:** 1 code auto-fix (1 bug) + 2 blocking environment fixes.
**Impact on plan:** the bug fix was necessary for FR-2.24 correctness (and to pass the phase gate); the two environment fixes were prerequisites for running the e2e tier at all. No scope creep — the compose AI-env gap was deferred, not fixed here.

## Issues Encountered

- One transient db-tier flake appeared on the first cold `npm run test` run (a single test file reported failed while all 196 tests passed); it did not reproduce on any subsequent run and the final gate was clean. Attributed to a first-connection race on the shared db container, not a defect.

## User Setup Required

None — no external service configuration required. The AI provider used throughout is `fake:deterministic` (no API key, no network).

## Next Phase Readiness

- **Phase 5 is COMPLETE.** F9 (real generation mechanism) and F10 (case-detail & recommendation presentation) are both proven end to end in a real browser; the accessibility record is signed; `npm run test:all` is fully green (782 + 47).
- **Carry-forward for Phase 6:** add the five §6.6 AI env keys to the compose `web` service (`AI_PROVIDER_URL` defaulting to `fake:deterministic`) — see `deferred-items.md`. A fresh `docker compose up --build` will otherwise fail the AI boot self-checks. Phase 6 owns the whole-stack compose demo, so it is the right place to close this.
- The case screen's "Your decision" and "Audit trail" sections are inert stubs with the correct headings and ids, ready for Phase 6 (F11/F12/F14) to attach its controls.

## Known Stubs

The case screen's "Your decision" and "Audit trail" sections are intentional
heading-only Phase-6 stubs (their "…not yet available in this build" status
messages are exactly what the plan specifies, so the normative section order and
the FR-10.10 in-page nav are already correct). These are **cosmetic / by-design**,
not blocking — the plan's objective (proving F9/F10 in a browser and signing off
NFR-2) does not depend on them, and their inertness is itself a tested guarantee
(case-detail.spec test 7). No other stubs introduced by this plan.

## Self-Check: PASSED

- Created files exist on disk: `e2e/case-detail.spec.ts`, `docs/a11y/case-detail.md`, `05-06-SUMMARY.md` — all FOUND.
- Task commits exist: `25f3293`, `7390d9c`, `8cadddb` — all FOUND.
- Plan-level build ran and passed: `npm run build` → exit 0; `npm run typecheck` → exit 0; `npm run test:all` → exit 0 (unit 297, db 196, api 136, arch 153, e2e 47; 0 failures, 0 skipped).
- `## Known Stubs` present; no entry classified blocking.

---
*Phase: 05-ai-recommendation-as-an-un-applied-proposal*
*Completed: 2026-09-15*
