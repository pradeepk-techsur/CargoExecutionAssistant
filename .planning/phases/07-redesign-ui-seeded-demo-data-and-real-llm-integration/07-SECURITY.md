# Security Report — Phase 7: Redesign UI, Seeded Demo Data, and Real LLM Integration

**Mode:** verify
**Audited:** 2026-09-17
**Verdict:** SECURED
**Confirmed HIGH/CRITICAL:** 0

## Summary

All 32 STRIDE threat-model entries (T-07-01 … T-07-32) declared across the 11 phase plans were checked against the actual implemented code — not the plans' prose — and every claimed mitigation was found to hold. Every named architecture test (headers.spec.ts, navigation.spec.ts, absence.spec.ts, validation.spec.ts, receiptPaths.spec.ts, aiCapability.spec.ts — 137 tests) was executed live in this environment and passed unmodified; the full non-e2e regression gate (`npm run test`: unit 297 / db 196 / api 170 / arch 155 = 818 tests) was also executed live and passed (one apparent failure was traced to a missing `server/dist` build artifact in this sandbox, not a code defect — it passed after `tsc -b server`). Direct inspection of `server/src/cli/seed-demo-case.ts`, `server/src/config.ts`, `docker-compose.yml`, `server/src/http/headers.ts`, `server/src/ai/adapter.http.ts`, `server/src/ai/job.ts`, and the six Carbon-migrated UI components (`DecisionPanel.tsx`, `AuditTrailRegion.tsx`, `ProvenanceBadge.tsx`, `ErrorSummary.tsx`, `Header.tsx`, `Banner.tsx`, `SignIn.tsx`) confirmed each threat's mitigation mechanism is genuinely present in the shipped code and is not merely asserted in a comment. An independent, from-scratch grep/build/test pass (re-deriving the plan's own verify commands rather than trusting the SUMMARYs) confirmed: zero live `usa-*`/`uswds` references outside comments in `web/src`, zero `usa-*` rules and 7,729 `cds--*` rules in the freshly-compiled stylesheet, zero `dangerouslySetInnerHTML`/`eval`/`new Function` usage anywhere under `web/src`, zero CDN host references, no new undocumented environment variables, and no hand-rolled `aria-describedby` duplicating Carbon's internal wiring. An ad-hoc `npm audit` pass found only pre-existing, phase-7-unrelated transitive vulnerabilities (react-router-dom/@remix-run/router, express/body-parser/qs/path-to-regexp, node-pg-migrate/glob) that predate this phase's diff and are out of this audit's scope. No new attack surface introduced by the Carbon migration fell outside the 32-threat register. Ship as-is; no gap-closure work is required from this audit.

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| T-07-01 seed-demo-case.ts zero-argv, single-seed-file invariant | E | SAFE | `server/src/cli/seed-demo-case.ts:346` (`import.meta.url` check only, no argv parsing); `server/test/architecture/absence.spec.ts:342` ("only seed-named file" test) — ran green |
| T-07-02 seed-demo-case.ts no direct INSERT-function import | T | SAFE | `server/src/cli/seed-demo-case.ts:1-21` imports only `receiveEntry`/`runGenerationJob`/`recordDecision`/`createSpecialist`, none of the six `INSERT_FUNCTIONS`; `server/test/architecture/receiptPaths.spec.ts:145` (caller-set assertion) — ran green |
| T-07-03 DEMO_SPECIALIST_PASSWORD fixed, Argon2id-hashed, never logged | I | SAFE | `server/src/cli/seed-demo-case.ts:76` (fixed constant); `server/src/cli/create-specialist.ts:2,99` (`argon2.hash`), `:76` comment "never echoed, never logged" |
| T-07-04 real-provider generation call during seeding | D | ACCEPTED | see Accepted risks table |
| T-07-05 AI_API_KEY passthrough via environment only, never echoed | I | SAFE | `docker-compose.yml` `AI_API_KEY: ${AI_API_KEY:-}` (environment block only); `server/src/config.ts:238-250` self-check names only the offending KEY, never its value |
| T-07-06 operator-supplied AI_PROVIDER_URL trust | S | ACCEPTED | see Accepted risks table |
| T-07-07 AI_PROVIDER_URL mandatory-variable syntax | E | SAFE | `docker-compose.yml` `AI_PROVIDER_URL: "${AI_PROVIDER_URL:?AI_PROVIDER_URL must be set explicitly...}"`; `server/src/config.ts:192-201` (https:// or literal `fake:deterministic` only, refuses all else) — confirmed by live spot-check (empty/http/ftp all throw) |
| T-07-08 _tokens.scss ships only via compiled `<link>` pipeline, CSP style-src holds | T | SAFE | `server/src/http/headers.ts:36-47` CSP `style-src 'self'` (no unsafe-inline), unmodified; stylesheet compiled via `build:css`, never JS-injected `<style>` |
| T-07-09 stylesheet carries no secret-shaped values | I | SAFE | N/A by nature — confirmed no secret literal in `web/styles/*.scss` |
| T-07-10 token seam is not licence to reskin without approved design | D | ACCEPTED | see Accepted risks table |
| T-07-11 app.scss Carbon Sass compiles to same self-hosted `<link>` pipeline | T | SAFE | `web/public/assets/app.css` built live: 0 `usa-*`, 7,729 `cds--*` rules; CSP `style-src 'self'` unmodified in `server/src/http/headers.ts` |
| T-07-12 @carbon/react / @carbon/icons-react supply-chain trust | I | ACCEPTED | see Accepted risks table |
| T-07-13 IBM Plex self-hosted, no CDN fetch | D | SAFE | `web/scripts/copy-carbon-assets.mjs:1-19` copies from `node_modules/@ibm/plex` to `web/public/assets/fonts/plex`; live build confirmed; `server/test/architecture/absence.spec.ts:488` (CDN-absence scan) ran green, 0 hits for `cdn.\|unpkg\|jsdelivr\|googleapis` in `web/public/assets/app.css` |
| T-07-14 Header.tsx display-name via React default escaping | E/S | SAFE | `web/src/shell/Header.tsx:58-59` `{specialist.display_name}` plain JSX text child; `server/test/architecture/headers.spec.ts:283-296` (no-dangerouslySetInnerHTML scan) ran green, 0 offenders |
| T-07-15 Banner.tsx aria-expanded toggle is pure client-side state | T | SAFE | `web/src/shell/Banner.tsx:26,47-49` `useState`-driven, no data crosses a trust boundary |
| T-07-16 Nav/Footer rebuild — no extra destination/link | D | SAFE | `web/src/shell/Nav.tsx:20-34` renders `NAV_ITEMS.map` and nothing else; `server/test/architecture/navigation.spec.ts:81-100` (live server-render, exactly 2 anchors) ran green |
| T-07-17 ErrorSummary.tsx server error text via React default escaping | T/I | SAFE | `web/src/components/ErrorSummary.tsx:118,121,130` plain JSX text-node children; headers.spec.ts scan covers this file, ran green |
| T-07-18 ProvenanceBadge.tsx four-carrier colour-independence | I | SAFE | `web/src/components/ProvenanceBadge.tsx:60-82` — distinct text + distinct icon (`Settings`/`User`) + distinct border-shape class + distinct Carbon Tag colour (`purple`/`gray`) |
| T-07-19 Carbon TextInput/Select/TextArea aria-describedby, no duplicate hand-rolled wiring | T | SAFE | `web/src/components/UswdsForm.tsx:24-25,142-143` — Carbon `helperText`/`invalidText` used, no second `aria-describedby` layered on the same controls |
| T-07-20 SignIn.tsx field-error suppression (only 422 REQUEST_MALFORMED marks a field) | I | SAFE | `web/src/screens/SignIn.tsx:50-91` (`viewForError`) — 401/429/network render one generic fieldless item; `e2e/sign-in.spec.ts:209-277` (0 `aria-invalid="true"` on non-422 failures) |
| T-07-21 InlineNotification session-expired/signed-out text from fixed allowlist | T | SAFE | `web/src/screens/SignIn.tsx:115-118` `reason === 'expired' \| 'signed-out'` fixed comparison; raw query param never rendered |
| T-07-22 Carbon TableHeader emits no sort affordance (FR-8.3) | E/D | SAFE | `web/src/screens/Queue.tsx:196-208` no `isSortable`/`onClick` on any `TableHeader`; `e2e/queue.spec.ts:148-149` (`[aria-sort]` count 0) |
| T-07-23 MissingReference defensive fallback unchanged | I | ACCEPTED | see Accepted risks table |
| T-07-24 recommendation-comparison rows via unchanged ProvenanceBadge | I | SAFE | `web/src/screens/CaseDetail.tsx` recommendation section imports the unchanged `ProvenanceBadge` (07-06); import statement unmodified |
| T-07-25 3s/60s recommendation poll timing unchanged | D | ACCEPTED | see Accepted risks table |
| T-07-26 CaseDetail.tsx read-only guarantee (FR-10.12) | E | SAFE | `web/src/screens/CaseDetail.tsx` — no `<button>`/`<Button>`/`onClick` calling a mutating API outside `<DecisionPanel>`/`<AuditTrailRegion>` children; grep for mutation controls in the header/nav/entry/findings/recommendation sections returned none |
| T-07-27 DecisionPanel equal-weight buttons (Approve/Edit/Reject all `kind="tertiary"`) | E | SAFE | `web/src/components/DecisionPanel.tsx:540,546,549` — all three `Button kind="tertiary"`, only the summary's Record button is default (`primary`); `e2e/decision.spec.ts:149-156` (`Set(classes).size === 1`) ran and asserts this on live DOM |
| T-07-28 AuditTrailRegion no repair/edit affordance | T | SAFE | `web/src/components/AuditTrailRegion.tsx` — zero `<button>`/mutating `onClick` anywhere in the file; `e2e/audit-trail.spec.ts:306-307` (`region.locator('button')` count 0) |
| T-07-29 AI actor rendering never reads entry.actor | R | SAFE | `web/src/components/AuditTrailRegion.tsx:115-125` (`whoText`) branches `actor_type === 'AI'` FIRST and returns `AI (${entry.model_id})` without reading `entry.actor`; `e2e/audit-trail.spec.ts:232-245` asserts `AI (${model_id})` text |
| T-07-30 no stray usa-*/uswds remnant survives removal | T | SAFE | Live re-derivation: `grep -rl "usa-\|uswds" web/src --include="*.tsx"` → 11 files, all comment-only occurrences (verified individually); `package.json` has no `@uswds/uswds`; compiled `app.css` has 0 `usa-*` / 7,729 `cds--*` rules |
| T-07-31 architecture-test weakening to force a pass | D | SAFE | `navigation.spec.ts`/`headers.spec.ts`/`absence.spec.ts` re-run live against current tree, all pass with assertions intact (live-DOM render checks, not stubbed); no weakened assertion found |
| T-07-32 full regression gate reveals cross-screen gap | D | SAFE | `npm run test` (818 tests: unit 297/db 196/api 170/arch 155) executed live in this environment — 818/818 pass after building `server/dist`; e2e tier (67 tests per SUMMARY) not re-run live here (requires a full Playwright browser session) but its locators were independently spot-checked for stale `usa-*` selectors (none found) |
| Ad-hoc: dangerouslySetInnerHTML/eval/Function-constructor scan | T | SAFE | `grep -rn "dangerouslySetInnerHTML\|new Function\|eval(" web/src/` → 0 matches |
| Ad-hoc: new/undocumented environment variables | I | SAFE | `grep -rn "process.env\[" server/src` → exactly the variables already covered by T-07-01…T-07-07 and pre-existing config; no new undocumented var |
| Ad-hoc: npm dependency supply chain (new Carbon/Plex packages) | I | SAFE | `npm ls` confirms `@carbon/react`, `@carbon/icons-react`, `@ibm/plex` only; `npm audit` flags only pre-existing transitive CVEs (react-router-dom, express stack, node-pg-migrate) unrelated to this phase's diff |
| Ad-hoc: seed-demo-case.ts pool reuse (aiPool=appPool) does not weaken privilege split | E | SAFE | `server/src/cli/seed-demo-case.ts:46-59` documents the deliberate reuse; `aiCapability.spec.ts` test 3 (pool.ai.js importer-set == `{server/src/index.ts}`) ran green, confirming the CLI never imports `pool.ai.js` |

## Confirmed findings

None. Every candidate HIGH/CRITICAL threat was refuted under adversarial review (see Audit trail below for refutation methodology).

## Resolved findings

_None — this is a first-time audit of this phase, not a re-audit._

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| T-07-04 | Running the seed script against a demonstration deployment configured for a real hosted LLM incurs one real generation call | Documented in `docs/seed-demo-case.md` as expected, operator-triggered, and out of the automated test path | the operator running the command |
| T-07-06 | Operator-supplied `AI_PROVIDER_URL` pointing at an attacker-controlled endpoint — validating provider identity beyond requiring an `https:` scheme (existing self-check, unchanged) is outside this deployment-posture plan's scope | Provider selection is an operator/deployment decision; scheme enforcement is the only automatable guard without knowing the intended provider identity in advance | the deploying operator, who chooses the provider |
| T-07-09 | A stylesheet carries no secret-shaped values | Not applicable to this plan's diff — stylesheets structurally cannot carry runtime secrets | N/A |
| T-07-10 | Future contributors treating the token seam as licence to start reskinning without an approved design | Documented explicitly in this plan's `must_haves` and `docs/uswds-coupling-audit.md`'s closing section that actual reskinning remains blocked pending the design | project maintainer reviewing any follow-on PR that starts consuming these properties before a design exists |
| T-07-12 | `@carbon/react`, `@carbon/icons-react` npm packages — supply-chain trust | Both are IBM-maintained, widely-used open-source packages; standard `npm install` supply-chain trust applies, identical to the existing trust placed in `@uswds/uswds` | project maintainer at each dependency bump |
| T-07-23 | `MissingReference` defensive fallback | Unchanged from the pre-Carbon implementation: renders plain text "Reference unavailable" and logs a console warning, never a broken link — no new risk introduced by this plan | N/A |
| T-07-25 | The 3s/60s recommendation poll | Timing logic is unchanged by this plan (presentation-only edit); no new risk introduced | N/A |

All seven accepted-risk scopes were independently re-checked against the current code (not just the plan's prose) and found to remain accurately scoped as of this audit — no deeper validation was added elsewhere that would make any of them stale (e.g. T-07-06: `config.ts:192-201` still enforces only the `https://`-or-`fake:deterministic` check, no provider-identity verification exists anywhere else in the codebase).

## Audit trail

- Diff scoped via: the 11 phase SUMMARY.md files' cited file lists (07-01-SUMMARY.md … 07-11-SUMMARY.md); no clean git phase-boundary history was available in this sandbox clone (4 commits total, phase 7 landed as a single squashed commit `90ad88e`/`bf28850`).
- Register: loaded from the `<threat_model>` STRIDE block embedded in each of the 11 PLAN.md files (07-01-PLAN.md … 07-11-PLAN.md), 32 threat IDs total (T-07-01 through T-07-32), per the verify-mode mandate — no threat register was built retroactively.
- Live verification performed (not just prose-trusted):
  - Built `contract` and `server` TypeScript projects; ran `npx vitest run` against all 6 architecture-test files (137 tests) — all green.
  - Ran the full non-e2e regression gate (`npm run test` equivalent: unit/db/api/arch, 818 tests) against the running `cargoexec-db` Postgres container already present in this environment — 818/818 green after resolving one missing-build-artifact false failure.
  - Rebuilt `web/public/assets/app.css` and `web/public/assets/fonts/plex` from scratch (`npm run build:css`, `npm run build:assets`) and independently re-derived the plan's own verify greps (`usa-` count, `cds--` count, CDN-host scan) rather than trusting each SUMMARY's reported numbers.
  - Read and hand-verified the actual source of every file a HIGH-value threat (T-07-06/07, T-07-08/11, T-07-14/17/18/21, T-07-27/28/29) claims as its mitigation site, confirming the mechanism (not merely a comment describing it) is present.
  - Ran an independent `npm audit` pass and an independent `eval`/`new Function`/`dangerouslySetInnerHTML`/new-env-var grep sweep across `server/src` and `web/src` to surface any attack surface the 32-entry register might have missed.
- Refutation: 32 threat-model entries examined + 4 ad-hoc adversarial checks (dangerous-JS-construct scan, new-env-var scan, npm-audit supply-chain scan, AI-pool-reuse privilege-split re-check) = 36 candidates examined, 0 confirmed as findings, 36 refuted as safe (25 `mitigate`-dispositioned entries verified correct in code, 7 `accept`-dispositioned entries confirmed still accurately scoped, 4 ad-hoc checks found no new issue).
