---
phase: 07-redesign-ui-seeded-demo-data-and-real-llm-integration
verified: 2026-09-17T03:14:23Z
status: passed
score: 6/6 must-haves verified
gaps: []
human_verification:
  - test: "Visual rendering of every screen on Carbon (shell, sign-in, queue, case detail with decision + audit-trail sections) in a real browser"
    expected: "Each screen renders on the Carbon White theme with correct layout, spacing and no visual regression vs. the pre-redesign USWDS build; IBM Plex fonts load same-origin (no CDN request)."
    why_human: "Visual appearance and font-loading over the network are not observable via static analysis or the non-e2e test tiers; the full Playwright e2e suite (which asserts these) requires a live server + browser not run in this environment."
  - test: "Full e2e suite (npm run test:e2e) against a running server + browser"
    expected: "Green — every FR-2.x per-screen e2e assertion referenced in the re-signed docs/a11y/*.md records passes."
    why_human: "e2e tier requires a real server + browser; only the unit/db/api/arch tiers (818 tests) ran green in this environment. The a11y records cite specific e2e test names as their evidence but those were not executed here."
---

# Phase 7: Redesign UI, Seeded Demo Data, and Real LLM Integration — Verification Report

**Phase Goal:** The demonstration is walkable without hand-typing every stage first — an operator-run seed script pre-loads one case already carried through the whole governed loop; the deployed AI now defaults toward a real hosted model rather than the deterministic fake; and the entire UI is redesigned from USWDS onto the Carbon Design System (@carbon/react), with every FR-2.x accessibility guarantee re-verified per screen rather than merely re-hosted.

**Verified:** 2026-09-17T03:14:23Z
**Status:** passed
**Re-verification:** No — initial verification

## Gate Evidence (mandatory input)

Read `07-GATE.md` and `07-REVIEW.md`. All gate signals are green and are cited (not re-litigated):

- `gate_status: passed` — all 7 waves recorded `build: pass`, `tests: pass`, `fix_attempts: 0`; Wave 7 is the phase-level final regression gate on the final tree (after fixer commits 7def176, 2b42397): unit 297 / db 196 / api 170 / arch 155 all green.
- `boot_smoke: pass` — the application boots; corroborated by `server/test/api/boot.spec.ts` (4 tests, passed) asserting `createApp` assembles against a real migrated DB, binds a non-loopback address, and registers exactly the ten implemented routes.
- `review_blockers_open: 0` — `07-REVIEW.md` iteration 2 is **clean** (0 blockers, 0 warnings). The two iteration-1 WARNINGs (`.grid-container` / `.cargoexec-prose` undefined after USWDS removal) were fixed and re-verified against recompiled CSS.
- `shadowed_sources: 0`, `tests_disabled_during_fixes: none`.

No unresolved gate failure or open BLOCKER exists → `passed` is permissible, and confirmed against the file.

## Goal Achievement

### Observable Truths

| #   | Truth (ROADMAP Success Criterion)                                                                                                                                                     | Status     | Evidence                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Seed against fresh DB → exactly one demo case RESOLVED via EDIT_APPROVE, mixed AI/HUMAN provenance, chain-verified audit; re-run creates nothing, exits 0.                            | ✓ VERIFIED | Ran seed CLI live: idempotent output ("reused" every stage), `EXIT=0`. DB query: exception `state=RESOLVED`; decision `EDIT_APPROVE`→`RESOLVED`; decision_values origins **AI×11 + HUMAN×1** (mixed); audit actor_types AI/SPECIALIST/SYSTEM; audit chain seq 2–5 `linked:true`, seq 1 genesis (prev=32 zero bytes). |
| 2   | Seed reachable only as operator command — no route/UI/schedule invokes it; manual entry (F6) unaffected.                                                                             | ✓ VERIFIED | `seed:demo-case` npm script only. Grep: no import of `seed-demo-case` in any route/UI (`server/src`, `web/src`). boot.spec asserts exactly 10 API routes (no seed route). No cron/schedule in docker-compose/Dockerfile. CLI imports neither `pool.ai` nor `getAiPool` (aiCapability invariant intact). |
| 3   | Fresh deploy refuses to boot with silently-defaulted fake AI; AI_PROVIDER_URL must be set explicitly (real https:// or literal `fake:deterministic`).                                | ✓ VERIFIED | `config.ts:192-201` refuses missing/empty/http/other-scheme; only https:// or exact `fake:deterministic` accepted. Live spot-check: empty, `http://`, `ftp://` all threw AI_PROVIDER_URL error. `config.spec.ts` self-check 5 covers all cases. `fake:deterministic` is a documented literal, never a default. |
| 4   | Every screen on Carbon; zero @uswds/uswds dependency; zero usa-\* class in any shipped stylesheet or .tsx file.                                                                       | ✓ VERIFIED | package.json has `@carbon/react` 1.116.0, no `@uswds/uswds` dep. `usa-` in className attributes: **0**. `usa-` in shipped `app.css`: **0**. The 12 `usa-` string hits in .tsx are all migration comments. build:css load-path is `node_modules` (Carbon), old `uswds.css` output gone. |
| 5   | Every FR-2.x structural/a11y guarantee survives, proven by green tests and a re-signed docs/a11y/{screen}.md per screen.                                                              | ✓ VERIFIED (with human item for e2e) | Non-e2e tiers green (297/196/170/155). a11y records re-signed for Phase 7 Carbon rebuild: shell (07-05), sign-in (07-07), queue (07-08), case-detail incl. **decision + audit-trail** sections (07-10). e2e suite flagged for human (requires live browser). |
| 6   | A concrete Carbon theme (White) is chosen and documented with reasoning.                                                                                                             | ✓ VERIFIED | `web/styles/app.scss:19-28` documents **White** theme with reasoning (read-heavy federal case review, eye-strain, USWDS-convention continuity, best-exercised Carbon theme clearing WCAG AA). Applied via `@use "@carbon/styles"` default `$theme: compat.$white`. Plus `docs/carbon-conformance-register.md`. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact                                      | Expected                                             | Status     | Details                                                                                     |
| --------------------------------------------- | --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `server/src/cli/seed-demo-case.ts`            | Idempotent, stage-resumable operator seed CLI       | ✓ VERIFIED | 353 lines; calls real services (receiveEntry, runGenerationJob, recordDecision); compiled to `server/dist/cli/seed-demo-case.js`; ran green live. |
| `server/src/config.ts`                        | Boot-time AI_PROVIDER_URL enforcement               | ✓ VERIFIED | `:192-201` refuses non-https, non-fake, missing values; live spot-check confirmed.         |
| `web/styles/app.scss`                         | Carbon-only Sass entry, White theme, self-hosted fonts | ✓ VERIFIED | `@use "@carbon/styles"`; White theme documented; no USWDS `@use`/`@forward`.               |
| `web/public/assets/app.css`                   | Compiled Carbon stylesheet, zero usa-\*             | ✓ VERIFIED | 1.09 MB Carbon output; `usa-` count = 0; linked (not JS-imported) via index.html.          |
| `docs/a11y/{shell,sign-in,queue,case-detail}.md` | Per-screen re-signed a11y records                | ✓ VERIFIED | All four re-signed for Phase 7; case-detail covers decision + audit-trail sub-sections.    |
| `package.json`                                | @carbon/react present, @uswds/uswds absent          | ✓ VERIFIED | `@carbon/react` 1.116.0, `@carbon/icons-react` 11.88.0; no uswds dependency.               |

### Key Link Verification

| From                     | To                          | Via                                   | Status | Details                                                                     |
| ------------------------ | --------------------------- | ------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `package.json`           | seed CLI                    | `seed:demo-case` script → dist js     | WIRED  | Script present; dist artifact exists and executes.                          |
| seed CLI                 | governed services           | receiveEntry / runGenerationJob / recordDecision | WIRED  | Same paths the live app uses; produced a real RESOLVED case in the DB.      |
| `config.ts`              | boot                        | ConfigError throw on bad provider     | WIRED  | Live spot-check: empty/http/ftp all rejected before boot.                   |
| `web/index.html`         | `app.css`                   | `<link rel="stylesheet" href="/assets/app.css">` | WIRED  | Linked stylesheet (CSP style-src 'self' held); no JS import.                |
| `app.scss`               | Carbon tokens               | `@use "@carbon/styles"` + White theme | WIRED  | `.grid-container`/`.cargoexec-prose` resolve to `var(--cds-spacing-*)`.     |
| seed CLI                 | `pool.ai.js`                | (deliberately ABSENT)                 | WIRED  | No ai-pool import — aiCapability.spec test 3 invariant preserved.           |

### Requirements Coverage

Success Criteria (the ROADMAP contract) map 1:1 to truths above; all 6 satisfied. FR-2.x structural guarantees proven green on unit/db/api/arch tiers (818 tests); FR-2.x e2e-observed guarantees flagged for human (e2e tier not runnable here).

### Anti-Patterns Found

| File                     | Line | Pattern             | Severity | Impact                                                                                 |
| ------------------------ | ---- | ------------------- | -------- | -------------------------------------------------------------------------------------- |
| `web/src/components/UswdsForm.tsx` | filename | Legacy name retained | ℹ️ Info  | File named `UswdsForm` but emits **zero** usa-\* classes — pure Carbon form wrapper. Cosmetic naming only; goal unaffected. |
| `.env` (deployment)      | 14   | `PROMPT_VERSION=` empty | ℹ️ Info  | Local env has empty PROMPT_VERSION; the boot check correctly refuses it. This is a deploy-config value, not a phase deliverable — correct value is `2026.09.1`. |

No 🛑 Blocker or ⚠️ Warning anti-patterns. No TODO/FIXME/placeholder/stub returns in phase artifacts.

### Behavioral Spot-Checks (evidence)

1. **Seed idempotency (live DB):** `node server/dist/cli/seed-demo-case.js` → all stages "already present … reused", "done. … 5 audit entries", `EXIT=0`.
2. **Seed outcome (DB query):** exception `state=RESOLVED`; decision `EDIT_APPROVE`/`resulting_state=RESOLVED`; decision_values `AI×11, HUMAN×1`; audit actor_types `AI, SPECIALIST, SYSTEM`.
3. **Audit chain:** case_sequence 2–5 `prev_entry_hash = lag(entry_hash)` (`linked:true`); sequence 1 = genesis (`prev_entry_hash` = 32 zero bytes) — correct, not a break.
4. **Boot refusal (loadConfig):** `AI_PROVIDER_URL` empty / `http://` / `ftp://` each threw `AI_PROVIDER_URL must be an https:// URL or the literal 'fake:deterministic'`.
5. **usa-\* absence:** `className` usa-\* count = 0; shipped `app.css` usa-\* count = 0.

### Human Verification Required

1. **Visual Carbon rendering per screen** — open each screen in a browser; confirm Carbon White-theme layout, spacing, and same-origin IBM Plex fonts (no CDN request). Not statically observable.
2. **Full e2e suite** — `npm run test:e2e` against a live server + browser; confirm the FR-2.x per-screen assertions cited by the re-signed a11y records pass. e2e tier not runnable in this environment (only the 818-test non-e2e tiers ran green).

### Gaps Summary

None. All six Phase 7 Success Criteria are verified — three (seed idempotency/outcome, boot refusal, usa-\* absence) confirmed by live behavioral spot-checks against the running DB and compiled config, the rest by static wiring checks corroborated by the green phase gates and clean code review. The only outstanding items are inherently human/e2e (visual appearance and the browser-dependent e2e tier), which do not represent gaps in the delivered work — the artifacts, wiring, and behaviors that produce those outcomes are all present and functioning.

---

_Verified: 2026-09-17T03:14:23Z_
_Verifier: Claude (pivota_spec-verifier)_
