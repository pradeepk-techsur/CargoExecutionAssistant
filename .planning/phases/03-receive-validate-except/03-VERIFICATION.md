---
phase: 03-receive-validate-except
verified: 2026-09-15T17:22:09Z
status: gaps_found
score: 2/5 success criteria fully verified (2 no-screen criteria pass; 3 UI criteria pass server-side but lack the assembled screen)
gaps:
  - truth: "She completes the entry form by keyboard alone and submits a deliberately incomplete entry; the browser assists but never pre-empts, and the server decides the outcome. (Criterion 1)"
    status: partial
    reason: "The server half is fully delivered and tested: POST /api/entries accepts every field optional, an empty body succeeds 201, validation is server-authoritative, and the browser-assist form PRIMITIVES exist (UswdsForm SelectField/TextAreaField/DateField/Fieldset). But no assembled cargo-entry SCREEN exists — /entries/new renders NotBuiltYet, so a specialist cannot in fact complete-and-submit an entry from the running app. This is the documented 03-09/03-10 scope that was never authored (only 8 of the planned 10 plans exist)."
    artifacts:
      - path: "web/src/app/router.tsx"
        issue: "Line 74-77: /entries/new maps to <NotBuiltYet title=\"New cargo entry\" />, not an entry-form screen."
      - path: "web/src/screens/NotBuiltYet.tsx"
        issue: "Transitional placeholder occupying the /entries/new route; renders a usa-alert--info 'This screen is not available in this build', no form, no fields, no submit."
    missing:
      - "An assembled cargo-entry screen at /entries/new that composes UswdsForm controls into the fourteen-field form, keyboard-operable, calling api.createEntry (plan 03-09/03-10)."
  - truth: "The receipt outcome is stated and announced — 'validated clean', or 'exception opened' with a case reference that links straight to the case — never left to be read out of an absence of errors. (Criterion 2)"
    status: partial
    reason: "The outcome contract is delivered and correct: ReceiptResponse carries receipt_outcome (VALIDATED_CLEAN | EXCEPTION_OPENED), case_reference, and exception ref (contract/src/dto.ts:33,128-133), and the API returns it. But there is no screen that STATES and ANNOUNCES the outcome to the user or renders the case-reference link, because /entries/new is NotBuiltYet. The announcement — the part the criterion is specifically about ('never left to be read out of an absence of errors') — is not observable in the running app."
    artifacts:
      - path: "web/src/screens/NotBuiltYet.tsx"
        issue: "No outcome banner, no live-region announcement of 'validated clean' / 'exception opened', no case-reference link at /entries/new."
    missing:
      - "Screen-level rendering of the receipt outcome with a case_reference link to /cases/{ref}, announced via a live region (plan 03-09/03-10)."
  - truth: "Every unsatisfied rule is reported in one pass, each finding named in plain language and bound programmatically to its field, with an error summary that moves focus; identical entry content always yields identical findings. (Criterion 3)"
    status: partial
    reason: "The server-side half is fully delivered and freshly re-proven: the engine evaluates every applicable rule without short-circuit, returns findings in deterministic ascending rule_id, and is byte-identical across calls (94 unit tests pass, incl. the eight F4 acceptance criteria). Findings carry a primary_field for programmatic binding, and the focus-moving ErrorSummary PRIMITIVE exists (role=alert, tabIndex=-1, useEffect .focus(), item links that focus the offending control). But the error summary is not wired to a live form — there is no /entries/new screen that binds findings to fields and moves focus on submit."
    artifacts:
      - path: "web/src/components/ErrorSummary.tsx"
        issue: "Focus-moving error-summary primitive exists but is not consumed by any entry screen — no importer at /entries/new."
      - path: "web/src/screens/NotBuiltYet.tsx"
        issue: "Occupies /entries/new with no field-bound findings and no focus-moving error summary."
    missing:
      - "The entry screen wiring that renders server findings into ErrorSummary, binds each to its field via aria-describedby/aria-invalid, and moves focus on submit (plan 03-09/03-10)."
---

# Phase 3: Receive, Validate, Except — Verification Report

**Phase Goal:** A cargo specialist types a cargo entry into a USWDS form and is told plainly what happened to it — validated clean, or an exception opened with a case reference she can follow — with no entry ever able to exist having been received but never assessed. (Requirements F3, F4, F5, F6)
**Verified:** 2026-09-15T17:22:09Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Gate Evidence (cited, not re-litigated)

Per `03-GATE.md` (gate_status: **passed**, last_updated 2026-09-15T17:19:53Z):
build `npm run build` → pass and tests `npm test` (unit+db+api+arch) → pass across
**all five waves**, 0 fix attempts, `boot_smoke: pass`, `shadowed_sources: 0`.
Per `03-REVIEW.md` (iteration 2): status **clean**, `review_blockers_open: 0`,
all three iteration-1 findings (B1 numeric overflow, W1 untrimmed length gate,
W2 bigint receipt_position) fixed and verified with no regression. Build, boot,
and the full test suite are therefore taken as proven by the gates; this report
does not re-run them wholesale and instead spot-checks specific behaviours and
audits the phase-goal deliverables against the codebase.

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth (Success Criterion) | Status | Evidence |
| - | ------------------------- | ------ | -------- |
| 1 | Keyboard-only form submit of an incomplete entry; browser assists, server decides | ✗ PARTIAL | Server side VERIFIED (POST /api/entries all-optional, empty body 201, server-authoritative). Form PRIMITIVES exist. But `/entries/new` → `NotBuiltYet` (router.tsx:74-77) — **no assembled screen** to complete/submit. |
| 2 | Outcome stated & announced — "validated clean" / "exception opened" + case-reference link | ✗ PARTIAL | Contract VERIFIED (dto.ts:33,128-133 receipt_outcome/case_reference/exception). No screen STATES/ANNOUNCES it or renders the case-reference link. |
| 3 | Every rule reported in one pass, findings bound to field, focus-moving error summary, deterministic | ✗ PARTIAL | Engine VERIFIED — 94 unit tests pass (one-pass, ascending rule_id, byte-identical). ErrorSummary focus primitive exists. **Not wired** to any entry screen. |
| 4 | Exception exists only where validation failed; no direct-authoring path; findings as basis + immutable receipt_position *(no screen)* | ✓ VERIFIED | receiptPaths + validation arch tests pass (18); exceptionBasis/receiptAtomicity db tests pass per gate; receipt.service.ts is the single write path. |
| 5 | Any receipt failure saves nothing — no orphan entry/exception/audit; proven by forced mid-tx failure *(no screen)* | ✓ VERIFIED | Single `withTransaction` (receipt.service.ts:129), three `append(tx,…)` audit writes, evaluate() inline; receiptAtomicity.spec.ts (408 lines) passes per gate. |

**Score:** 2/5 success criteria fully verified. Criteria 4 and 5 (explicitly *no screen*) are fully achieved. Criteria 1, 2, 3 are achieved on the server/contract side and their PRIMITIVES exist, but each fails at the SCREEN level because the assembled `/entries/new` cargo-entry form was scheduled as plans 03-09/03-10, which were never authored (only 03-01..03-08 exist).

### Required Artifacts

All 29 must-have artifacts across plans 03-01..03-08 exist and exceed their declared min_lines. Selected:

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `contract/src/dto.ts` | receipt wire types | ✓ VERIFIED | 154 lines; ReceiptResponse, receipt_outcome, case_reference, ExceptionRef present. |
| `server/src/db/repositories/entries.ts` | entry + origin inserts, case anchor | ✓ VERIFIED | 286 lines. |
| `server/src/db/repositories/validation.ts` | validation result/finding inserts | ✓ VERIFIED | 144 lines, unnest() multi-row. |
| `server/src/db/repositories/exceptions.ts` | exception + PENDING rec inserts | ✓ VERIFIED | 103 lines; W2 fix (toReceiptPosition) present. |
| `server/src/services/validation/rules.ts` | 31-rule RIV-2026.09 registry | ✓ VERIFIED | 442 lines (≥250). |
| `server/src/services/validation/engine.ts` | evaluate() single entry point | ✓ VERIFIED | 178 lines; 94 unit tests green. |
| `server/src/services/validation/selfCheck.ts` | boot-time integrity check | ✓ VERIFIED | 132 lines; called index.ts:38 before listen (:63). |
| `server/src/http/requireApiAuth.ts` | API auth gate | ✓ VERIFIED | 57 lines; wired app.ts:102 (session→auth→csrf). |
| `server/src/services/receipt.service.ts` | atomic receipt transaction | ✓ VERIFIED | 404 lines (≥180); single withTransaction. |
| `server/src/http/routes/entries.ts` | two F3 handlers, .strict() | ✓ VERIFIED | 429 lines (≥180); receiveEntry, principal-only actor. |
| `web/src/components/UswdsForm.tsx` | Select/TextArea/Date/Fieldset controls | ✓ VERIFIED (primitive) | 534 lines; all 5 exports, aria-describedby/aria-invalid. |
| `web/src/api/client.ts` | createEntry/getEntry typed client | ✓ VERIFIED (primitive) | 252 lines; auto CSRF (:100-101). |
| **assembled `/entries/new` screen** | keyboard form composing the above | ✗ **MISSING** | router.tsx:74-77 → NotBuiltYet; no screen file exists. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| app.ts | requireApiAuth.ts | `app.use(requireApiAuth())` after session, before csrf | ✓ WIRED | app.ts:93,102,105 exact order. |
| index.ts | selfCheck.ts | `assertRuleRegistryValid()` before listen | ✓ WIRED | index.ts:38 before :63. |
| receipt.service.ts | tx.ts | single `withTransaction` BEGIN site | ✓ WIRED | :129 only site. |
| receipt.service.ts | audit/writer.ts | three `append(tx,…)` | ✓ WIRED | :233 ENTRY_RECEIVED, :265 VALIDATION_COMPLETED, :290 EXCEPTION_OPENED. |
| receipt.service.ts | validation/index.ts | `evaluate()` once before insert | ✓ WIRED | :187. |
| routes/entries.ts | receipt.service.ts | `receiveEntry(...)` | ✓ WIRED | :165, actor=req.principal only. |
| client.ts | /api/entries | createEntry posts via shared request() w/ CSRF | ✓ WIRED | :228, :100-101. |
| UswdsForm.tsx | aria-describedby/aria-invalid | every control binds hint/error | ✓ WIRED | all 5 controls. |
| **ErrorSummary.tsx** | **entry screen** | consumed by /entries/new to bind findings + move focus | ✗ **NOT_WIRED** | No consumer; /entries/new is NotBuiltYet. |
| **UswdsForm / client** | **entry screen** | composed into a form at /entries/new | ✗ **NOT_WIRED** | Primitives exist but nothing assembles them. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
| ----------- | ------ | -------------- |
| F3 (receive: API POST/GET entries) | ✓ SATISFIED (server) | API + transaction delivered; no UI submit path yet. |
| F4 (validate: one-pass deterministic findings) | ✓ SATISFIED (engine) | Engine + rules proven; not surfaced on a screen. |
| F5 (except: exception only on failure, immutable basis) | ✓ SATISFIED | Criterion 4 proven, no-screen by design. |
| F6 (the USWDS entry form/screen) | ✗ BLOCKED | No assembled /entries/new screen (03-09/03-10 unauthored). |

### Behavioral Spot-Checks (Steps 7b/7c)

| Check | Command | Result |
| ----- | ------- | ------ |
| Validation engine + rules behave | `npx vitest run server/test/unit/validation.engine.spec.ts server/test/unit/validation.rules.spec.ts` | **94 passed** (23 engine + 71 rules), 181ms. Confirms one-pass, ascending-rule_id ordering, determinism, 8 F4 criteria. |
| No-authoring-path + purity (criterion 4) | `npx vitest run server/test/architecture/receiptPaths.spec.ts server/test/architecture/validation.spec.ts` | **18 passed** (11 + 7), 236ms. |
| DB tiers (criteria 4,5 atomicity/basis) | full `npm test` per 03-GATE.md waves 1-5 | **pass** (cited from gate; requires Postgres). |
| Screen presence | router inspection | `/entries/new` → `NotBuiltYet` — **no form rendered**. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (delivered source) | — | none | — | grep for TODO/FIXME/placeholder across receipt.service, entries route, engine, exceptions, UswdsForm, client → **no matches**. |
| web/src/screens/NotBuiltYet.tsx | 1-48 | intentional placeholder at /entries/new | ℹ️ Info | Documented transitional artefact; itself compliant (no disabled controls/"coming soon" chip), but it stands in for the missing F6 screen. |

### Human Verification Required

Not applicable as gating — the screen-level gaps are structurally provable (route maps to placeholder), so no human test can pass them. Once 03-09/03-10 land, the following would need human verification:
- Keyboard-only completion + submission of the fourteen-field form.
- Screen reader announces "validated clean" / "exception opened" and the case-reference link navigates to the case.
- Error summary receives focus on submit and each item link focuses its field.

### Gaps Summary

Phase 3's **server, contract, validation, transaction, and auth spine is complete and proven**: all 5 gates green, 94 validation unit tests and 18 architecture tests re-verified live, the receipt transaction is a single atomic write path, and the two *no-screen* success criteria (4 and 5) are fully achieved. The web-form **primitives** (UswdsForm controls, focus-moving ErrorSummary, typed CSRF-aware client) all exist and are individually sound.

The gap is singular and expected: **the assembled cargo-entry SCREEN at `/entries/new` was never built** — it was scheduled as plans 03-09/03-10, and only 03-01..03-08 were authored. `/entries/new` currently renders `NotBuiltYet`. Because criteria 1, 2, and 3 are phrased about what the *specialist* can do and be told **in the running UI**, they cannot be marked achieved on the server contract alone: there is no screen to type into, no rendered outcome/announcement, and no findings bound into a live error summary. These three gaps share one root cause (no assembled entry screen) and should be closed by a single focused plan set (03-09/03-10) that composes the existing primitives against the already-delivered API.

---

_Verified: 2026-09-15T17:22:09Z_
_Verifier: Claude (pivota_spec-verifier)_
