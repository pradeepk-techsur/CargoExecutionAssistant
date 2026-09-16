---
phase: 6
status: issues_found
blockers: 0
warnings: 2
files_reviewed: 13
files_reviewed_list:
  - contract/src/dto.ts
  - server/src/db/repositories/decisions.ts
  - server/src/http/csrf.middleware.ts
  - server/src/http/routes/audit.ts
  - server/src/http/routes/decision.ts
  - server/src/http/routes/index.ts
  - server/src/services/auditRead.service.ts
  - server/src/services/decision.service.ts
  - web/src/api/client.ts
  - web/src/app/router.tsx
  - web/src/components/AuditTrailRegion.tsx
  - web/src/components/DecisionPanel.tsx
  - web/src/components/ProvenanceBadge.tsx
  - web/src/screens/CaseDetail.tsx
reviewed_at: 2026-09-16T00:00:00Z
iteration: 1
---

# Phase 6 Code Review

The phase adds the F11 decision write, the F13 audit read, the F12 decision UI,
and the F14 audit-trail UI. The server transaction is well-guarded, the CSRF fix
is a genuine security improvement, the receiptPaths allowlist relaxations are
precise, and all cross-file seams (DTO changes ↔ consumers, new routes ↔ callers,
new exports ↔ imports) hold. The full gate is green (883 tests). No BLOCKERs
survived refutation. Two WARNINGs are recorded below — both are non-critical UX
degradations on unlikely paths, not correctness or security holes.

## BLOCKERs

None.

## WARNINGs

### W1: Server-returned field errors on the summary stage produce a dead error-summary link
- **File:** web/src/components/DecisionPanel.tsx:336 (with ErrorSummary.tsx:40–45)
- **Category:** bug
- **Evidence:** When `recordDecision` catches a non-conflict 4xx (the `default:`
  branch — e.g. `REASON_REQUIRED`, `RESOLUTION_VALUES_INCOMPLETE`), it sets
  `errors` to `[{ controlId: 'decision-reason', message: err.message }]` and
  stays on the `summary` stage. But the summary stage (the `Summary` component)
  renders no control with `id="decision-reason"` — that textarea lives only on
  the `edit`/`reject` stages. `ErrorSummary` renders the item as an in-page link
  (`href="#decision-reason"`) whose click handler calls
  `focusControl('decision-reason')`, which does `document.getElementById(...)`,
  gets `null`, and silently does nothing. The specialist sees a link that focuses
  nothing. The message text is still shown, so the error is not *hidden*, only
  the focus-jump affordance is dead. Likelihood is low because the client already
  gates reason length ≥10 before summary and always sends the complete
  EDIT_APPROVE field set, so these server errors are edge cases; but a
  server-side reason/field rejection the client did not anticipate lands here.
- **Fix direction:** On the summary stage, render server field errors without a
  `controlId` (so `ErrorSummary` emits plain text, per its own contract for
  field-less errors), OR route the user back to the originating form stage where
  `#decision-reason` exists before showing the summary error. Direction only.

### W2: EDIT_APPROVE direct-resolution stamps prior_origin HUMAN for any present entry value
- **File:** server/src/services/decision.service.ts:426–436 (`editApproveDirect`)
- **Category:** bug
- **Evidence:** In direct resolution (no AVAILABLE recommendation), each value's
  `prior_origin` is computed as `prior === null ? null : 'HUMAN'`. This assumes
  every previously-present entry value was human-authored. For a freshly
  submitted entry that is true (submitted values are HUMAN by construction), so
  in the current single-decision-per-case flow this is correct. It is flagged as
  a WARNING (not a blocker) because it is a latent assumption: if a value could
  ever have a non-HUMAN prior origin on the entry, the recorded `prior_origin`
  would be wrong. No current code path violates the assumption, so this is a
  robustness note, not an active defect. Stated with uncertainty per the
  classification rule.
- **Fix direction:** If the entry read model can expose the per-field origin,
  read the real prior origin rather than assuming HUMAN. Otherwise, a code
  comment asserting the invariant (entry submitted values are always HUMAN) would
  make the assumption explicit. No change is strictly required for v1.

## Cross-file seams checked
- `DecisionValueDto.changed_from_proposal` (new field) ↔ F7 consumer
  `caseRead.service.ts::composeDecision` spreads `loadDecisionValues` rows which
  now select the column — OK.
- `DecisionValueDto` ↔ web `DecisionSummaryTable` / `DecidedRecord` read
  `origin` + `changed_from_proposal` — OK.
- `DecisionCreateRequest` / `DecisionRecordResponse` ↔ `api.postDecision` ↔
  `DecisionPanel` — request omits origin/decided_by (server-derived), response
  drives confirmation — OK.
- `AuditTrailResponse` / `AuditEntryDto` (`actor: null` + optional `model_id`) ↔
  `api.getAuditTrail` ↔ `AuditTrailRegion` (`whoText` branches AI-first, never
  reads `entry.actor` for AI) — OK.
- New route `POST /api/exceptions/:exceptionId/decision` ↔ `csrf.middleware`
  pattern→regex now correctly guards the parameterised path (real fix verified) —
  OK.
- New route `GET /api/exceptions/:exceptionId/audit` ↔ `boot.spec` route-count
  (8→10) and `API_ROUTE_TABLE`/`ROUTES` registration — OK; 3-segment
  sub-resource paths do not collide with the 2-segment `:idOrReference` getOne —
  OK.
- Audit route is uuid-only; deep link `/cases/:caseReference/audit` passes
  `exception.id` (uuid) to `AuditTrailRegion` — OK.
- `csrf.middleware` imports `API_ROUTE_TABLE` from `routes/index.ts`; no reverse
  import — no circular dependency — OK.
- `insertDecisionValues` bulk INSERT builds `VALUES` tuples from index math with
  all values bound to `$n` (headers.spec exclusion is legitimate, not an
  injection) — OK.
- `readCaseTrail` + `loadAuditTrailResponse` are both read-only SELECTs;
  chain.spec exports allowlist updated to exactly those two — OK.
- Idempotent replay (`decisionMatchesReplay`) compares `resolution_values` only
  when the client supplied them; APPROVE/REJECT identified by type + trimmed
  reason — OK.
- ProvenanceBadge `modified` prop is optional/backward-compatible; F10 call sites
  unchanged — OK.
