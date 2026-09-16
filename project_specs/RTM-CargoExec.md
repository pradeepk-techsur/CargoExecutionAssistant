# Requirements Traceability Matrix (RTM)
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.0 |
| **Date** | 2026-09-11 |
| **Author** | Pivota Spec Framework — RTM Generator |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Upstream Documents** | PRD-CargoExec, FRD-CargoExec, TechArch-CargoExec, UserStories-CargoExec, PERSONAS-CargoExec, JTBD-CargoExec, JOURNEYS-CargoExec, STORY-MAP-CargoExec |
| **Status** | Baselined for delivery |
| **Phase 7 Addendum** | Added 2026-09-16 — traces F15 (new), and the F2/F9 Phase 7 revisions, into this baseline. See §3.9. Original baseline rows above and throughout this document are unmodified; all Phase 7 content is additive. |

---

## 1. Overview

This Requirements Traceability Matrix provides bidirectional traceability across every specification document produced for CargoExec. It exists to make one question answerable at a glance and without reconstruction: for any requirement in `.planning/PROJECT.md`, what feature carries it, what functional requirement specifies it, what architectural mechanism enforces it, what user story describes it from the specialist's point of view, and what test proves it — and, read in the other direction, for any shipped artefact, which stated requirement authorised it to exist.

CargoExec is a demonstration of *governed delivery* for U.S. Customs and Border Protection. Its purpose is not feature breadth but the completeness and provability of a single governed decision loop — **receive → validate → except → recommend → human decide → audit**. In a product whose thesis is governance, traceability is not documentation overhead attached to the product; traceability **is** the product. This matrix is therefore written to be audited rather than merely filed: every identifier below is extracted from a source document, no placeholder identifiers appear, and the four structural invariants that carry the accountability guarantee are traced individually from requirement through schema enforcement to the named test that proves each one (§5).

Traceability here runs in both directions and across two additional axes that a conventional RTM omits. The first is **absence**: because PRD §10 excludes eleven capabilities and `.planning/PROJECT.md` declares the same boundary, this matrix traces the exclusions as first-class rows, naming the story or architecture test that asserts the capability was *not* built (§6). A requirement that something does not exist is unfalsifiable unless something checks for it, so those checks are recorded here with the same rigour as positive requirements. The second is **verification method**: §7 states explicitly, per test case, whether the evidence is automated or a manual per-screen Section 508 / WCAG 2.1 AA sign-off. v1 deliberately ships **no CI accessibility gate** (PRD §10 #1); that is recorded in this matrix as a stated and enforced policy with a named substitute mechanism, not as a coverage gap.

### 1.1 Traceability Chain

```
 .planning/PROJECT.md          PRD-CargoExec         FRD-CargoExec         TechArch-CargoExec        UserStories         Verification
 ────────────────────          ─────────────         ─────────────         ──────────────────        ───────────         ────────────
 11 Active requirements  ───►  F0 … F14        ───►  FR-0.1 … FR-14.19 ──►  §1.4 guarantees     ───►  US-0.1 … US-14.7 ──►  TEST-UNIT-*
  7 Constraints          ───►  NFR-1 … NFR-12  ───►  RIV-010 … RIV-132 ──►  13 tables · 10 endpoints   84 stories          TEST-DB-*
  7 Key decisions        ───►  SM-1 … SM-14    ───►  8 audit actions   ──►  D-1…D-3 · A-1…A-2         Epics 0–14          TEST-API-*
 11 Out-of-scope items   ───►  §10 #1 … #11    ───►  §0.7 non-reqs     ──►  §8.4 absence tests        absence stories     TEST-ARCH-*
                                                                                                                          TEST-E2E-*
 PERSONAS PER-01…03 ──► JTBD-01.1…03.4 ──► JOURNEYS JRN-01.1…03.1 ──► STORY-MAP R1/R2/R3                                   TEST-MAN-*
```

Each arrow is bidirectional. §3 traces forward (requirement to test); §3.2 and §4 trace backward (artefact to authorising requirement); §5 traces the four invariants vertically through every enforcement layer.

### 1.2 ID Conventions

| Prefix | Level | Document | Range in CargoExec |
|--------|-------|----------|--------------------|
| `F` | PRD feature | PRD §5 | `F0` – `F14` (15 features, all P0) |
| `NFR` | Non-functional requirement | PRD §6 | `NFR-1` – `NFR-12` |
| `SM` | Success metric | PRD §7 | `SM-1` – `SM-14` |
| `R` | Risk | PRD §8 | `R-1` – `R-12` |
| `§10 #n` | Exclusion | PRD §10 | `#1` – `#11` |
| `FR-{feature}.{n}` | FRD functional requirement | FRD F00–F14 | `FR-0.1` – `FR-14.19` |
| `FR-Y{n}.{m}` | FRD cross-feature requirement | FRD Y0–Y3 | `FR-Y0.1` – `FR-Y3.13` |
| `RIV-{nnn}` | Required-information validation rule | FRD F04 | `RIV-010` – `RIV-132` (31 rules, set `RIV-2026.09`) |
| `D-{n}` / `A-{n}` / `C-{n}` | TechArch deviation / addition / clarification | TechArch §0.4 | `D-1`–`D-3`, `A-1`–`A-2`, `C-1`–`C-4` |
| `R-L{n}` | TechArch layering rule | TechArch §1A.2 | `R-L1` – `R-L10` |
| `US-{epic}.{n}` | User story | UserStories Epic 0–14 | `US-0.1` – `US-14.7` (84 stories, 77 P0 / 7 P1) |
| `TEST-{suite}-{nn}` | Test case | Derived, TechArch §8.3 + FRD acceptance criteria | see §7.1 |
| `PER-{nn}` | Persona | PERSONAS | `PER-01` – `PER-03` |
| `JTBD-{p}.{n}` | Job to be done | JTBD | `JTBD-01.1` – `JTBD-03.4` |
| `JRN-{p}.{n}` | Journey | JOURNEYS | `JRN-01.1` – `JRN-03.1` |
| `R1` / `R2` / `R3` | Release | STORY-MAP | three releases |

### 1.3 Source Document Inventory

| Document | Location | Contributes to this RTM |
|---|---|---|
| PROJECT.md | `.planning/PROJECT.md` | 11 Active requirements, 7 constraints, 7 key decisions, 11 out-of-scope items |
| PRD | `project_specs/PRD-CargoExec.md` | F0–F14, NFR-1–12, SM-1–14, R-1–12, §10 exclusions, §11 surface coverage |
| FRD | `project_specs/FRD-CargoExec.md` (chunks `FRD/F00`–`F14`, `Y0`–`Y3`) | 305 FR-* requirements, 31 RIV rules, 13 tables, 10 endpoints, 8 audit actions, 8 state transitions, 127 acceptance criteria |
| TechArch | `project_specs/TechArch-CargoExec.md` (chunks `TechArch/00`–`09`) | Four structural-guarantee enforcement layers (§1.4), decision register D/A/C, test inventory (§8.3), exclusion enforcement (§9.3) |
| UserStories | `project_specs/UserStories-CargoExec.md` (chunks `UserStories/Epic-00`–`Epic-14`, `Y0`–`Y1`) | 84 stories, acceptance criteria, absence assertions |
| PERSONAS / JTBD / JOURNEYS / STORY-MAP | `project_specs/` | Discovery-side trace: who, why, when, in which release |

---

## 2. Requirements Summary

**By source requirement (`.planning/PROJECT.md`):**
- **11 Active requirements** — all traced to at least one PRD feature (§3.3); zero unmapped
- **7 Constraints** — design system, accessibility, auditability, human-in-the-loop, data provenance, scope discipline, platform (§3.5)
- **7 Key decisions** — each reflected in a named feature and enforcement mechanism (§3.6)
- **11 Out-of-scope items** — each traced to an absence assertion (§6); zero silently dropped

**By PRD artefact:**
- **15 features F0–F14**, all **P0**, across six categories — A Governance Foundation (F0, F1, F2), B Entry & Validation (F3–F6), C Review Queue (F7, F8), D AI Recommendation (F9, F10), E Human Decision (F11, F12), F Audit Trail (F13, F14)
- **6 user-facing screens** carried by named features — F1+F2 sign-in, F6 entry form, F8 queue, F10 case detail, F12 decision, F14 audit trail
- **12 non-functional requirements NFR-1–NFR-12**, each traced to an architectural mechanism (§3.4)
- **14 success metrics SM-1–SM-14**, each traced to a named test or review (§3.7)
- **No P2/P3 tier exists** — capabilities that would rank lower were excluded outright rather than deprioritised
- **Phase 7 addendum (additive, does not alter the count above):** **16th feature F15** (Seeded Demonstration Case) added under a new Category G, reversing PRD §10 #7; **F2** and **F9** each carry a Phase 7 revision note (visual-system supersession and real-LLM deployment posture respectively) without a change to their feature numbering or P0 priority. See §3.9.

**By FRD artefact:**
- **305 functional requirements** — 273 feature-scoped (`FR-0.1`–`FR-14.19`) plus 32 cross-feature (`FR-Y0.1`–`FR-Y3.13`)
- **31 validation rules** `RIV-010`–`RIV-132` in rule set `RIV-2026.09` — 13 presence, plus format, conditional-applicability and closed-domain rules
- **13 database tables**, **10 API endpoints** (zero query parameters across the entire API), **8 audit action types**, **8 state transitions**
- **127 feature acceptance criteria** across F0–F14
- **Domain exclusion:** no rule computes duty, assigns an HTS or classification code, or makes a substantive customs determination

**By UserStories artefact:**
- **84 stories** across **15 epics** (epic *N* = feature F*N*) — **77 P0 / 7 P1**
- **One actor throughout:** the cargo specialist (PER-01). PER-02 and PER-03 appear only in *so that* benefit clauses, never as actors
- **Absence-assertion stories:** US-0.5, US-3.4, US-5.3, US-7.3, US-8.5, US-9.5, US-13.4, US-14.6, US-2.6
- **Release allocation:** R1 = 70 stories (the loop, end to end), R2 = 11 (resilience), R3 = 3 (conformance sign-off and scope evidence)

---

## 3. Traceability Matrix

### 3.1 Master Matrix — PRD Feature → FRD → TechArch → User Stories → Tests

| PRD Feature | FRD Requirements | TechArch Specification | User Stories | Test Cases |
|---|---|---|---|---|
| **F0** Case Data Model & Append-Only Audit Store | `FR-0.1`–`FR-0.18`; `FR-Y0.1`–`FR-Y0.5` | §2 (13 tables), §2.9 privileges (`cargoexec_owner`/`app`/`ai`), §2.10 four trigger families, §2.11 sequencing, §2.12 hash chain, §2.13 migrations 0001–0010, `db/canonical` | US-0.1, US-0.2, US-0.3, US-0.4, US-0.5 | TEST-DB-01…18, TEST-UNIT-04, TEST-ARCH-10, TEST-ARCH-11 |
| **F1** Cargo Specialist Authentication & Session | `FR-1.1`–`FR-1.21` | §4.2 session, §4.3 cookie profiles (**D-2**), §4.4 CSRF double-submit; `session.service`, `session.middleware`, `csrf.middleware`, `htmlRouteGuard`, `cli/create-specialist`; endpoints 1–3 | US-1.1, US-1.2, US-1.3, US-1.4, US-1.5 | TEST-API-01, TEST-UNIT-07, TEST-E2E-01, TEST-MAN-01 |
| **F2** USWDS Application Shell & Accessibility Foundation | `FR-2.1`–`FR-2.26` | §7 accessibility architecture, §7.3 conformance register, §7.5 colour independence, §7.6 form/error pattern, §7.7 review gate, §7.8 **no CI gate**; `Shell`, `LiveRegions`, `UswdsForm`, `ErrorSummary`, `ProvenanceBadge`, `AttributedValue` | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5, US-2.6 | TEST-MAN-01…06, TEST-MAN-08, TEST-ARCH-09, TEST-ARCH-15, TEST-ARCH-16, TEST-E2E-05 |
| **F3** Manual Cargo Entry Creation (API) | `FR-3.1`–`FR-3.16` | §1.5 receipt lifecycle (**D-3**: validate → single `INSERT`), `receipt.service`, `routes/entries`; endpoints 4, 5 | US-3.1, US-3.2, US-3.3, US-3.4 | TEST-API-02, TEST-DB-16, TEST-ARCH-01 |
| **F4** Required-Information Validation on Receipt | `FR-4.1`–`FR-4.15`; rules `RIV-010`–`RIV-132` | §1A.3 `services/validation/` — 31 pure predicates, frozen domain lists, startup integrity self-check (`RULE_SET_INVALID`); **C-2** `primary_field`, **C-3** stale-rule correction; `R-L10` purity rule | US-4.1, US-4.2, US-4.3, US-4.4 | TEST-UNIT-01, TEST-UNIT-02, TEST-UNIT-03 |
| **F5** Exception Creation from Validation Failure | `FR-5.1`–`FR-5.15` | §2.5 `exceptions` + composite FK `(validation_result_id, validation_outcome)`, closure `CHECK`, `receipt_position` sequence; `receipt.service` step 15 | US-5.1, US-5.2, US-5.3, US-5.4 | TEST-DB-08, TEST-DB-18, TEST-API-02 |
| **F6** Cargo Entry Web UI | `FR-6.1`–`FR-6.19` | §3b.6 UI contracts, `screens/NewEntry`, §7.6 inherited form/error pattern | US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-6.6 | TEST-MAN-02, TEST-API-02, TEST-E2E-01, TEST-E2E-05 |
| **F7** Review Queue (API) | `FR-7.1`–`FR-7.14`; `FR-Y1.1`–`FR-Y1.7` | §3.5 endpoints 6, 7 with **zero** query parameters; `queue.service` (no parameters in signature), `caseRead.service`, single partial index on `receipt_position` | US-7.1, US-7.2, US-7.3, US-7.4, US-7.5 | TEST-API-03, TEST-ARCH-01, TEST-ARCH-02 |
| **F8** Review Queue Web UI | `FR-8.1`–`FR-8.16` | `screens/Queue`, §7.4 state components, two-item navigation (`FR-2.7`) | US-8.1, US-8.2, US-8.3, US-8.4, US-8.5, US-8.6 | TEST-MAN-03, TEST-ARCH-15, TEST-E2E-01 |
| **F9** AI Resolution Recommendation Generation | `FR-9.1`–`FR-9.19`; `FR-Y3.1`–`FR-Y3.13` | §5 provider abstraction, §5.4 prompt integrity manifest (**A-2**), §5.5 no-write guarantee, §5.6 degradation, `ai/worker` on `pool.ai` (**A-1**); `R-L6`, `R-L7`; endpoint 8 | US-9.1, US-9.2, US-9.3, US-9.4, US-9.5 | TEST-UNIT-06, TEST-DB-07, TEST-DB-17, TEST-ARCH-05, TEST-ARCH-06, TEST-ARCH-14, TEST-E2E-02, TEST-MAN-07 |
| **F10** Exception Case Detail & Recommendation UI | `FR-10.1`–`FR-10.18` | `screens/CaseDetail`, §3.18 `AttributedValue` gate, §3b.2 required `Origin` DTO property, §7.5 `ProvenanceBadge` | US-10.1 … US-10.8 | TEST-MAN-04, TEST-ARCH-17, TEST-E2E-02 |
| **F11** Human Decision Processing (API) | `FR-11.1`–`FR-11.21` | §1.6 decision lifecycle, §3.5.3 server-side provenance computation, `decision.service` as sole writer (`R-L4`); endpoint 9 | US-11.1 … US-11.7 | TEST-API-04, TEST-UNIT-05, TEST-DB-04, TEST-DB-05, TEST-DB-09, TEST-DB-10, TEST-ARCH-04 |
| **F12** Decision Web UI — Edit / Approve / Reject with Reason | `FR-12.1`–`FR-12.18` | `components/DecisionPanel`, §7.6 form/error pattern, §3b.6 `permitted_decisions` contract | US-12.1 … US-12.7 | TEST-MAN-05, TEST-E2E-01, TEST-E2E-03, TEST-E2E-05 |
| **F13** Audit Entry Writer — Append-Only | `FR-13.1`–`FR-13.18` | §2.10 five coupling triggers + mutation triggers, §2.11 `case_sequence`, §2.12 SHA-256 chain, `audit/writer.append(tx, entry)` as only writer (`R-L3`), `auditRead.service`, `verify_audit_chain`; endpoint 10 | US-13.1 … US-13.5 | TEST-DB-01, 02, 03, 05, 06, 07, 13, 14, TEST-ARCH-03, TEST-API-05 |
| **F14** Per-Case Audit Trail Web UI | `FR-14.1`–`FR-14.19` | `components/AuditTrailRegion`, `chain_verified` surfacing, read-only by construction, no export affordance | US-14.1 … US-14.7 | TEST-MAN-06, TEST-API-05, TEST-DB-15, TEST-E2E-01, TEST-E2E-03 |
| **F15** *(Phase 7)* Seeded Demonstration Case | `FR-15.1`–`FR-15.11` | `cli/seed-demo-case.ts` (TechArch §1A.1a, §8.9, §8.7 step 5a) — calls F3/F4/F5/F9/F11's own service functions and F13's own audit writer; no migration `INSERT`, no bespoke write path | US-15.1, US-15.2, US-15.3, US-15.4, US-15.5 | TEST-ARCH-11 (unchanged), TEST-ARCH-18 (new), TEST-MAN-10 (new) |

**Forward-coverage check:** 15 of 15 PRD features carry FRD requirements, TechArch components, user stories, and test cases. **Zero features unmapped at any level.**

**Phase 7 addendum to the coverage check (additive):** with F15 added, **16 of 16** PRD features now carry FRD requirements, TechArch components, user stories, and test cases. Zero features unmapped at any level, including the Phase 7 addition. See §3.9 for the full Phase 7 trace, including the F9 (`FR-9.20`) and F2 (superseding note) revisions that do not add rows here because they revise existing F9/F2 requirements rather than introducing a new feature.

### 3.2 Backward Trace — FRD / TechArch Artefact → Authorising PRD Feature

Every constructed artefact traces up to a feature that authorised it. An artefact with no upstream authorisation is scope leakage.

| Artefact | Instance | Authorising feature |
|---|---|---|
| **Endpoint 1** `POST /api/session` | sign in | F1 |
| **Endpoint 2** `GET /api/session` | current principal + CSRF token | F1 |
| **Endpoint 3** `DELETE /api/session` | sign out | F1 |
| **Endpoint 4** `POST /api/entries` | receipt | F3 (with F4, F5 inside the transaction) |
| **Endpoint 5** `GET /api/entries/{entryId}` | entry retrieval | F3 |
| **Endpoint 6** `GET /api/exceptions` | receipt-ordered queue, zero parameters | F7 |
| **Endpoint 7** `GET /api/exceptions/{idOrReference}` | case detail projection | F7 (consumed by F10) |
| **Endpoint 8** `GET /api/exceptions/{exceptionId}/recommendation` | proposal read | F9 |
| **Endpoint 9** `POST /api/exceptions/{exceptionId}/decision` | the accountable decision | F11 |
| **Endpoint 10** `GET /api/exceptions/{exceptionId}/audit` | per-case trail + `chain_verified` | F13 (consumed by F14) |
| **Tables 1–2** `specialists`, `sessions` | identity | F1 |
| **Tables 3–4** `cargo_entries`, `cargo_entry_field_origins` | entry of record + `HUMAN` baseline | F0, F3 |
| **Tables 5–6** `validation_results`, `validation_findings` | stated basis | F0, F4 |
| **Table 7** `exceptions` | derived case | F0, F5 |
| **Tables 8–9** `recommendations`, `recommendation_values` | proposal (`origin='AI'`) | F0, F9 |
| **Tables 10–11** `decisions`, `decision_values` | resolution (mixed origin permitted) | F0, F11 |
| **Tables 12–13** `audit_entries`, `audit_entry_values` | append-only history | F0, F13 |
| **Audit actions 1–3** `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED` | receipt transaction | F3, F4, F5 (written by F13) |
| **Audit actions 4–5** `RECOMMENDATION_GENERATED`, `RECOMMENDATION_UNAVAILABLE` | proposal terminal outcomes | F9 (written by F13) |
| **Audit actions 6–8** `RECOMMENDATION_APPROVED`, `RECOMMENDATION_EDITED_AND_APPROVED`, `RECOMMENDATION_REJECTED` | decision outcomes | F11 (written by F13) |
| **UI routes** `/sign-in`, `/entries/new`, `/queue`, `/cases/{ref}` | four routed screens, six review surfaces | F1+F2, F6, F8, F10+F12+F14 |
| **DB roles** `cargoexec_owner`, `cargoexec_app`, `cargoexec_ai` | DDL / request path / worker path (**A-1**) | F0, F9 — *not* application roles; F1 `FR-1.1` remains one authenticated role |

**Backward-coverage check:** 10 of 10 endpoints, 13 of 13 tables, 8 of 8 audit actions, 4 of 4 UI routes, and 3 of 3 database roles trace to an authorising feature. **Zero orphan artefacts.**

### 3.3 PROJECT.md Active Requirement → Feature → FRD → TechArch → Stories

All **11** Active requirements traced. This is the primary audit row-set: no Active requirement may be unmapped.

| # | PROJECT.md Active requirement | PRD Features | Key FRD Requirements | TechArch Mechanism | User Stories |
|---|---|---|---|---|---|
| **1** | Cargo entries can be entered manually into the system | F3, F6 | `FR-3.1`, `FR-3.2`, `FR-3.3`, `FR-3.13`, `FR-6.1`, `FR-6.5`, `FR-6.19` | §1.5 receipt transaction (**D-3**); `receipt.service`; `screens/NewEntry`; no multipart parser installed | US-3.1, US-3.2, US-3.4, US-6.1, US-6.2 |
| **2** | Each entry is validated against required-information rules on receipt | F4, F3 | `FR-4.2`, `FR-4.3`, `FR-4.4`, `FR-4.10`, `FR-4.11`, `FR-3.4` | `services/validation/` 31 pure predicates; `R-L10` no clock/DB/network/random; startup registry self-check | US-3.1, US-4.1, US-4.2, US-4.3, US-4.4 |
| **3** | Entries that fail validation become exceptions and enter a review queue | F5, F4, F7 | `FR-5.1`, `FR-5.2`, `FR-5.4`, `FR-5.8`, `FR-0.11` | Composite FK `(validation_result_id, validation_outcome)` with `CHECK (validation_outcome='FAIL')` — no exception without a failing basis | US-5.1, US-5.2, US-5.3, US-6.3, US-7.1 |
| **4** | The queue lists open exceptions in receipt order, and a specialist can open one | F7, F8 | `FR-7.1`, `FR-7.2`, `FR-7.4`, `FR-8.1`, `FR-8.5` | `queue.service` with a parameterless signature; single partial index on `receipt_position`; `400 UNSUPPORTED_QUERY_PARAMETER` on any query string | US-7.1, US-7.2, US-7.4, US-8.1, US-8.2 |
| **5** | AI generates a recommended resolution action for each exception, with a plain-language rationale | F9, F10 | `FR-9.1`, `FR-9.7`, `FR-9.9`, `FR-9.10`, `FR-10.3`, `FR-10.4` | §5 provider abstraction; **A-2** prompt integrity manifest; `recommendation_values CHECK (origin='AI')` | US-9.1, US-9.3, US-10.3, US-10.4 |
| **6** | A cargo specialist can edit, approve, or reject the AI recommendation — no recommendation auto-applies | F11, F12, F10 | `FR-11.1`, `FR-11.2`, `FR-11.3`, `FR-11.4`, `FR-11.5`, `FR-12.1`, `FR-0.9` | §1.4(3) five independent layers: table separation, `decided_by` FK, `trg_exceptions_hitl`, `cargoexec_ai` privilege exclusion, import-graph test | US-0.5, US-9.2, US-9.5, US-11.1, US-11.2, US-11.3, US-11.5, US-12.1 |
| **7** | Rejections and edits capture a reason so the record explains itself | F11, F12, F14 | `FR-11.9`, `FR-0.15`, `FR-12.4`, `FR-12.5`, `FR-13.10`, `FR-14.5` | `decisions_reason_required_chk` — ≥10 chars after trim, enforced in storage as well as at the API boundary | US-11.4, US-12.3, US-13.3, US-14.3 |
| **8** | Every state change writes an append-only audit entry: who, what, when, before/after, AI-vs-human origin | F13, F0 | `FR-13.1`–`FR-13.9`, `FR-0.4`, `FR-0.5`, `FR-0.6`, `FR-0.7`, `FR-0.10` | §1.4(1) and §1.4(4): revoked privileges + mutation triggers + five deferred coupling triggers + `append(tx, entry)` signature | US-0.1, US-0.2, US-0.4, US-13.1, US-13.2, US-13.4, US-13.5 |
| **9** | The audit trail is viewable per case in the UI | F14, F13 | `FR-14.1`, `FR-14.2`, `FR-14.7`, `FR-14.9`, `FR-14.10`, `FR-13.15` | `auditRead.service` single-case only; `verify_audit_chain` read-only; no export endpoint, `?format=`, or `Accept` variant | US-14.1, US-14.2, US-14.4, US-14.6, US-14.7 |
| **10** | Authenticated users sign in as a cargo specialist | F1 | `FR-1.1`, `FR-1.2`, `FR-1.6`, `FR-1.7`, `FR-1.9` | §4.2 binary authorisation in one middleware; no `role`/`permission`/`scope` column, claim, or check | US-1.1, US-1.2, US-1.3, US-1.4 |
| **11** | The UI follows USWDS and meets Section 508 / WCAG 2.1 AA | F2 (applied across F6, F8, F10, F12, F14) | `FR-2.1`–`FR-2.26`, notably `FR-2.17`, `FR-2.25`, `FR-2.26` | §7 accessibility by construction; §7.7 signed per-screen review incl. AT walkthrough; §7.8 **no CI gate, asserted by test** | US-2.1 … US-2.6, plus a11y criteria on US-6.6, US-8.2, US-10.8, US-12.7, US-14.7 |

**Result: 11 of 11 Active requirements traced to at least one PRD feature, FRD requirement, TechArch mechanism, and user story. Zero unmapped.**

### 3.4 Non-Functional Requirement Trace

| NFR | PRD Requirement | FRD Requirements | TechArch Mechanism | Stories | Tests |
|---|---|---|---|---|---|
| **NFR-1** | USWDS conformance | `FR-2.1`, `FR-2.2`, `FR-2.3` | USWDS 3.11 bundled; token-only styling (stylelint-enforced); conformance register per control (§7.2, §7.3) | US-2.1, US-2.6 | TEST-MAN-08, TEST-ARCH-16 |
| **NFR-2** | Section 508 / WCAG 2.1 AA | `FR-2.4`–`FR-2.26` | Shell landmarks, focus management, live regions, colour independence, 200% zoom / 320 px reflow; signed per-screen review; **no CI gate** (§7) | US-2.1 … US-2.6 | TEST-MAN-01…06 *(manual)*, TEST-E2E-05 |
| **NFR-3** | Audit immutability (append-only) | `FR-0.4`, `FR-0.5`, `FR-0.6`, `FR-0.7`, `FR-13.13`, `FR-13.14` | §1.4(1): revoked `UPDATE`/`DELETE`/`TRUNCATE` for all runtime roles + unconditional mutation triggers covering owner + hash chain verified at commit + no ORM + no purge path | US-0.1, US-0.4, US-13.4 | TEST-DB-01, 02, 03, 14, TEST-ARCH-03 |
| **NFR-4** | AI-vs-human provenance distinguishability | `FR-0.2`, `FR-0.3`, `FR-11.8`, `FR-13.9`, `FR-10.2`, `FR-14.3`, `FR-2.20` | §1.4(2): `origin NOT NULL` with constant `CHECK`s; server-only computation; required DTO property; `Attributed<T>` render gate; `ProvenanceBadge` text+icon+colour | US-0.2, US-2.5, US-10.4, US-11.2, US-14.2 | TEST-DB-11, 12, TEST-UNIT-05, TEST-ARCH-17 |
| **NFR-5** | Human-in-the-loop enforcement (no auto-apply) | `FR-0.9`, `FR-11.1`, `FR-11.2`, `FR-9.1`, `FR-9.2`, `FR-5.7` | §1.4(3) and §5.5: five independent layers plus no scheduler/cron/broker and no `apply`/`auto`/`force`/bulk parameter | US-0.5, US-9.2, US-9.5, US-11.5, US-12.1 | TEST-DB-04, 17, TEST-ARCH-04, 05, TEST-E2E-04 |
| **NFR-6** | Audit completeness (1:1) | `FR-0.10`, `FR-13.3`, `FR-13.4`, `FR-11.13`, `FR-9.11` | §1.4(4): five deferred coupling triggers asserting *exactly one*; `append(tx, …)` cannot open its own transaction; loud failure policy | US-13.1, US-13.5 | TEST-DB-05, 06, 07, TEST-API-04 |
| **NFR-7** | Traceability without external tooling | `FR-14.9`, `FR-14.8`, `FR-13.18` | One case-detail call plus one audit call answer all four oversight questions; no export exists because none is needed (§3.15) | US-14.6, US-14.7 | TEST-API-05, TEST-E2E-01 |
| **NFR-8** | Security & access control | `FR-1.4`, `FR-1.7`, `FR-1.9`, `FR-1.14`, `FR-13.12`, `FR-Y1.6` | §4: session + CSRF on every state-changing request; parameterised SQL; strict body parsing; env-only secrets; pino redaction; audit-writer secret denylist | US-1.2, US-1.3, US-1.5 | TEST-API-01, TEST-UNIT-07, TEST-ARCH-16 |
| **NFR-9** | AI dependency resilience | `FR-9.12`, `FR-9.13`, `FR-9.14`, `FR-9.19`, `FR-10.8` | §5.6: post-commit dispatch off the request path; enumerated terminal failures; `permitted_decisions` keeps every case decidable; no retry-on-view | US-9.4, US-10.5, US-10.6 | TEST-E2E-02, TEST-API-02 |
| **NFR-10** | Responsiveness | `FR-2.23`, `FR-6.17`, `FR-8.15`, `FR-10.17`, `FR-14.18` | §8.8: one API call per screen; indexed queue projection; 10 s statement timeout; generation never on the request path; non-blocking 3 s polling | US-2.6, US-10.5 | TEST-MAN-01…06 *(2 s budget, measured during review)* |
| **NFR-11** | Determinism of validation | `FR-4.4`, `FR-4.5`, `FR-4.8`, `FR-4.15` | Pure predicates with no clock/DB/network/random; `RIV-132` against the entry's own `received_at`; uniqueness deliberately *not* a rule | US-4.1, US-4.3 | TEST-UNIT-01, 02, 03 |
| **NFR-12** | Platform (web only) | `FR-2.19`, `FR-2.23` | Web only; responsive to tablet width; no native shell, no mobile push dependency, no app-store artefact (§6.2) | US-2.6 | TEST-ARCH-08, TEST-MAN-01…06 |

### 3.5 PROJECT.md Constraint Trace

| Constraint | PRD | FRD | TechArch | Stories | Tests |
|---|---|---|---|---|---|
| Design system — USWDS | F2, NFR-1, SM-12 | `FR-2.1`–`FR-2.3` | §7.2, §7.3 conformance register | US-2.1, US-2.6 | TEST-MAN-08, TEST-ARCH-16 |
| Accessibility — 508 / AA, by design and review, **not CI** | F2, NFR-2, SM-10, SM-11, §10 #1 | `FR-2.25`, `FR-2.26` | §7.7 review gate, §7.8 no CI gate | US-2.6 | TEST-MAN-01…06, TEST-ARCH-09 |
| Auditability — append-only / immutable | F0, F13, NFR-3, NFR-6, SM-6, SM-7 | `FR-0.4`, `FR-0.5`, `FR-13.2`, `FR-13.13` | §1.4(1), §2.9, §2.10 | US-0.1, US-13.4 | TEST-DB-01…03, TEST-ARCH-03 |
| Human-in-the-loop — no auto-apply | F11, F12, NFR-5, SM-4 | `FR-0.9`, `FR-11.1`, `FR-11.2` | §1.4(3), §5.5 | US-0.5, US-11.5 | TEST-DB-04, 17, TEST-E2E-04 |
| Data provenance — AI or human origin on every value | F0, F9, F10, F11, F14, NFR-4, SM-3 | `FR-0.2`, `FR-0.3`, `FR-11.8` | §1.4(2), §3.18 | US-0.2, US-10.4, US-14.2 | TEST-DB-11, 12, TEST-UNIT-05 |
| Scope discipline — one role, manual entry, single ordered queue | F1, F3, F7, §10, SM-14 | `FR-1.1`, `FR-3.2`, `FR-7.2`, `FR-7.3` | §1.8, §8.4, §9.3 | US-1.2, US-3.4, US-7.3, US-8.5 | Whole TEST-ARCH-* suite |
| Platform — web only | NFR-12, §10 #10 | `FR-2.19` | §6.2 dependency allowlist | US-2.6 | TEST-ARCH-08 |

### 3.6 PROJECT.md Key Decision Trace

| Key decision | Reflected in | Enforcement | Evidence |
|---|---|---|---|
| AI recommends, human decides — nothing auto-applies | F11 (`FR-11.1`, `FR-11.2`), F12 (`FR-12.1`), NFR-5 | §1.4(3) five layers | US-11.5, US-12.1 · TEST-DB-04, TEST-E2E-04 |
| Append-only audit trail rather than mutable case history | F0 (`FR-0.4`, `FR-0.5`), F13 (`FR-13.2`, `FR-13.13`), NFR-3 | §1.4(1) six layers | US-0.1, US-13.4 · TEST-DB-01, 02, 03 |
| Record AI-vs-human provenance on every value | F0 (`FR-0.2`, `FR-0.3`), F11 (`FR-11.8`), NFR-4 | §1.4(2) seven layers | US-0.2, US-11.2 · TEST-DB-11, 12 |
| Single role (cargo specialist), no supervisor view in v1 | F1 (`FR-1.1`), §10 #2, §10 #3 | No `role` column, claim, or check; binary authorisation | US-1.2, US-7.3 · TEST-ARCH-10 |
| Manual entry only — no file/API ingestion | F3 (`FR-3.2`), F6 (`FR-6.19`), §10 #6 | No multipart parser installed; array bodies rejected | US-3.4 · TEST-API-02, TEST-ARCH-08 |
| Single ordered queue — no filter, sort, assignment, prioritisation | F7 (`FR-7.2`, `FR-7.3`), F8 (`FR-8.3`, `FR-8.4`), §10 #4 | Zero query parameters API-wide; one partial index | US-7.3, US-8.5 · TEST-API-03, TEST-ARCH-02 |
| USWDS + 508/AA by design, no CI accessibility gate | F2 (`FR-2.25`, `FR-2.26`), NFR-2, §10 #1 | No `.github/`; a11y runners on the forbidden-dependency list; signed review is the gate | US-2.6 · TEST-ARCH-09, TEST-MAN-01…06 |

### 3.7 Success Metric Trace

| Metric | Target | Features | Stories | Verification | Type |
|---|---|---|---|---|---|
| **SM-1** Governed loop completeness | 6 of 6 stages | F3–F14 on F0, F1, F2 | US-3.1, US-4.1, US-5.1, US-6.3, US-8.1, US-10.3, US-12.1, US-14.1 | TEST-E2E-01 | Automated |
| **SM-2** Decision traceability | 100% | F13, F14 | US-14.7 | TEST-API-05 + TEST-E2E-01 | Automated |
| **SM-3** Provenance attribution | 100%, 0 unattributed | F0, F9, F10, F11, F14 | US-0.2, US-10.4, US-11.2, US-14.2 | TEST-DB-11, 12, TEST-API-04, TEST-UNIT-05 | Automated |
| **SM-4** Auto-apply incidents | 0 | F9, F11, F12 | US-0.5, US-9.5, US-11.5 | TEST-DB-04, TEST-DB-17, TEST-ARCH-04, TEST-E2E-04 | Automated |
| **SM-5** Reason capture completeness | 100% | F11, F12 | US-11.4, US-12.3, US-14.3 | TEST-DB-10, TEST-API-04 | Automated |
| **SM-6** Audit coverage 1:1 | 100%, 0 unaudited | F13, F0 | US-13.1 | Eight-transition enumeration test + TEST-DB-05, 06, 07 | Automated |
| **SM-7** Audit immutability | 100% rejected | F0, F13 | US-0.1, US-13.4 | TEST-DB-01, 02, 03 *(including as `cargoexec_owner`)* | Automated |
| **SM-8** Exception derivation integrity | 100% / 0 without basis | F4, F5 | US-0.5, US-5.1 | TEST-DB-08 + TEST-API-02 | Automated |
| **SM-9** Rationale intelligibility | 100% of sampled | F9, F10 | US-9.3 | TEST-MAN-07 | **Manual — human judgement, not automatable** |
| **SM-10** Accessibility conformance | 0 violations; 100% screens signed off | F2 + all UI features | US-2.6, US-6.6, US-8.2, US-10.8, US-12.7, US-14.7 | TEST-MAN-01…06 | **Manual — per-screen 508/AA sign-off incl. AT walkthrough** |
| **SM-11** Keyboard completeness | 100% of 5 tasks | F2, F6, F8, F12, F14 | US-2.3, US-6.6, US-8.2, US-12.7 | TEST-E2E-01 (functional) + TEST-MAN-01…06 (review) | Mixed |
| **SM-12** USWDS conformance | 100% | F2 | US-2.1, US-2.6 | TEST-MAN-08 conformance register | **Manual — design review** |
| **SM-13** Degraded-mode loop completability | 100% | F9, F10, F11 | US-9.4, US-10.6, US-11.7 | TEST-E2E-02 | Automated |
| **SM-14** Scope discipline | 0 features within an exclusion | F0–F14 | US-3.4, US-5.2, US-5.3, US-7.3, US-8.5, US-10.7, US-13.4, US-14.6 | Whole TEST-ARCH-* suite + TEST-MAN-09 | Mixed |

### 3.8 Discovery-Side Trace — Personas, JTBD, Journeys, Releases

| Persona | Access | JTBD | Journeys | Features serving | Stories |
|---|---|---|---|---|---|
| **PER-01** Dana Reyes — cargo specialist | **Authenticated operator** (the only role) | JTBD-01.1 … JTBD-01.7 | JRN-01.1 … JRN-01.7 | F0–F14 (all) | All 84 stories — she is the actor of every one |
| **PER-02** Marcus Hale — CBP oversight / audit reviewer | **Non-user — no account, no screen, no export** | JTBD-02.1 … JTBD-02.4 | JRN-02.1 *(reconstruction via a specialist reading the trail)* | F0, F1, F4, F5, F9, F11, F13, F14 | Benefit clause only — US-0.1, US-14.7 and others; never an actor |
| **PER-03** Priya Raman — CBP delivery sponsor | **Non-user — witness to the walkthrough** | JTBD-03.1 … JTBD-03.4 | JRN-03.1 *(witnessed walkthrough driven by a specialist)* | F3–F14 on F0, F1, F2 | Witness to US-0.5, US-2.6, US-7.3, US-8.5, US-9.5, US-11.5, US-14.7 and others |

| JTBD | Persona | Features | Success metrics | Journeys |
|---|---|---|---|---|
| JTBD-01.1 Know at once whether the entry passed or opened a case | PER-01 | F3, F4, F5, F6 | SM-1, SM-8 | JRN-01.1, JRN-01.2 |
| JTBD-01.2 See what still needs a decision without choosing where to start | PER-01 | F7, F8 | SM-1, SM-11 | JRN-01.3 |
| JTBD-01.3 Understand why a case is open and what the AI proposes | PER-01 | F9, F10 | SM-9, SM-3 | JRN-01.4 |
| JTBD-01.4 Make the decision unmistakably mine and say why | PER-01 | F11, F12 | SM-4, SM-5 | JRN-01.5 |
| JTBD-01.5 Show later what was recommended, what changed, and why | PER-01 | F13, F14 | SM-2, SM-6 | JRN-01.5, JRN-01.7 |
| JTBD-01.6 Finish the case when the AI is slow or down | PER-01 | F9 (degraded), F10, F11, F12 | SM-13 | JRN-01.6 |
| JTBD-01.7 Complete every task by keyboard and screen reader | PER-01 | F2 (inherited by F6, F8, F10, F12, F14) | SM-10, SM-11, SM-12 | JRN-01.7 |
| JTBD-02.1 Be certain a named human decided | PER-02 *(non-user)* | F1, F11, F13 | SM-4 | JRN-02.1 |
| JTBD-02.2 Be certain the history could not have been revised | PER-02 *(non-user)* | F0, F13 | SM-7, SM-6 | JRN-02.1 |
| JTBD-02.3 Tell machine proposal from human choice per value | PER-02 *(non-user)* | F0, F9, F11, F13, F14 | SM-3, SM-5, SM-2 | JRN-02.1 |
| JTBD-02.4 Get a stated validation basis, not an inference | PER-02 *(non-user)* | F4, F5, F10 | SM-8 | JRN-02.1 |
| JTBD-03.1 Watch all six stages complete in one sitting | PER-03 *(non-user)* | F3–F14 on F0, F1, F2 | SM-1, SM-13 | JRN-03.1 |
| JTBD-03.2 Get a structural, test-backed accountability answer | PER-03 *(non-user)* | F9, F11, F12, F13 | SM-4, SM-5 | JRN-03.1 |
| JTBD-03.3 See federal standards met in what shipped | PER-03 *(non-user)* | F2 (inherited by all UI features) | SM-10, SM-11, SM-12 | JRN-03.1 |
| JTBD-03.4 Confirm the exclusions actually held | PER-03 *(non-user)* | F1, F7, F8; full F0–F14 set | SM-14 | JRN-03.1 |

| Release | Theme | Stories | Loop stages | Journeys closed | Gate metrics |
|---|---|---|---|---|---|
| **R1** | The governed loop, walking end to end | 70 | **6 of 6** | JRN-01.1, 01.2, 01.3, 01.4, 01.5, 01.7, 02.1 | SM-1, SM-2, SM-3, SM-4, SM-5, SM-6, SM-7, SM-8, SM-11 |
| **R2** | The loop holds when the AI does not | 11 (US-1.5, US-3.3, US-6.5, US-8.6, US-9.4, US-10.5, US-10.6, US-11.6, US-11.7, US-12.6, US-14.5) | 6 of 6 — unchanged | JRN-01.6 | SM-13; no loss against SM-2, SM-6 |
| **R3** | Conformance sign-off and scope evidence | 3 (US-2.6, US-7.3, US-8.5) | 6 of 6 — unchanged | JRN-03.1 | SM-10, SM-12, SM-14 |
| **R4** *(= Phase 7, per `STORY-MAP/R4-release.md`)* | Demonstration enablement & design-system-independent conformance | 7 (US-2.7, US-9.6, US-15.1, US-15.2, US-15.3, US-15.4, US-15.5) | 6 of 6 — unchanged; adds a second, seeded entry point into the same six stages | JRN-03.1 reinforced (no new journey stage) | Seed-script idempotency + `chain_verified` gate; re-signed per-screen a11y checklist under the new visual system; real-LLM deployment posture confirmed (no metric added or changed) |

---

### 3.9 Phase 7 Traceability Addendum

This subsection was added for Phase 7 ("Redesign UI, seeded demo data, and real LLM integration"). It is purely additive: every row in §3.1–§3.8 above is unchanged. Phase 7 introduces one new feature (F15), one new functional requirement on an existing feature (F9 `FR-9.20`), and one superseding note on an existing feature's rule set (F2), none of which required renumbering or removing anything already baselined.

#### 3.9.1 F15 — Seeded Demonstration Case (new feature, new requirement, reverses PRD §10 #7)

| Trace level | Identifier |
|---|---|
| **Roadmap** | Phase 7 — "Redesign UI, seeded demo data, and real LLM integration" (`.planning/ROADMAP.md`) |
| **Release** | R4 (`project_specs/STORY-MAP/R4-release.md`) |
| **PRD** | §5.7 F15 (new Category G — Demonstration Enablement); §4.2 deployment model; §10 #7 (reversed, not removed — the original exclusion is retained in PRD history and superseded in place) |
| **FRD** | `FRD/F15-seeded-demonstration-case.md`, `FR-15.1`–`FR-15.11` |
| **TechArch** | `01-components.md` §1A.1a (repository placement, absence-test treatment), `08-testing-deployment.md` §8.7 step 5a and §8.9 (full behavioural contract) |
| **User Stories** | `UserStories/Epic-15-seeded-demonstration-case.md`: US-15.1 (same code paths as production), US-15.2 (idempotent / stage-resumable), US-15.3 (mixed AI/HUMAN provenance decision), US-15.4 (audit trail integrity), US-15.5 (operator-only, narrowly scoped) |
| **Test evidence** | **Reused, unchanged:** `TEST-ARCH-11` (no migration-file `INSERT INTO`; still passes because F15 is not a migration) · `TEST-ARCH-09` (no `seeds/`/`fixtures/` directory; still passes because the script is a single named file, not a directory). **New:** `TEST-ARCH-18` (repo-wide scan confirms `server/src/cli/seed-demo-case.ts` is the *only* file whose name/path suggests a seed/fixture mechanism) · `TEST-MAN-10` (operator walkthrough: run twice/concurrently with no duplicate writes; stage-resumable partial-seed run; `EDIT_APPROVE` decision with mixed `AI`/`HUMAN` resolution values; `chain_verified: true`; F6 manual entry unaffected) |
| **Exclusion status** | Supersedes PRD §10 #7 / PROJECT.md Out-of-Scope "Seeded demonstration dataset" — see §3.9.4 below for how §6's existing exclusion row is treated |
| **Dependencies traced** | F0 (audit/schema invariants apply identically), F3, F4, F5, F9, F11 (same service functions), F13 (same audit chokepoint) — no new table, no new column, no new endpoint |

#### 3.9.2 F9 — `FR-9.20` Real-Provider Deployment Posture (existing feature, new requirement)

| Trace level | Identifier |
|---|---|
| **Roadmap / Release** | Phase 7 / R4 |
| **PRD** | §5.4 F9 Phase 7 update paragraph; §4.1 Tech Stack (AI row); §8 R-9 |
| **FRD** | `FRD/F09-ai-recommendation-generation.md` Phase 7 note (provider posture) and `FR-9.20` |
| **TechArch** | `05-ai-integration.md` §5.9 — architecture (§5.1–§5.8) explicitly unchanged; only deployment configuration defaults change (`AI_PROVIDER_URL`, `AI_API_KEY`, `AI_MODEL_ID`); `fake:deterministic` narrows to test-only use |
| **User Stories** | `UserStories/Epic-09-ai-recommendation-generation.md` — new **US-9.6** ("Know that the recommendation shown came from a real model, not the test fake") |
| **Test evidence** | **Reused, unchanged:** `TEST-ARCH-06` (no provider SDK type/dependency — still holds, no SDK introduced) · `TEST-ARCH-08` (dependency allowlist unaffected). **New:** `TEST-MAN-11` (deployment configuration review confirming `AI_PROVIDER_URL` resolves to a real HTTPS endpoint with valid `AI_API_KEY`/`AI_MODEL_ID` in the demonstration/production environment, and that `fake:deterministic` appears only in automated test configuration) |
| **Explicit non-claim** | This addendum does **not** assert any change to NFR-9 (AI dependency resilience) or Invariant I-3 (§5.3) — the degraded-mode architecture, retry/timeout logic, and output schema are unchanged by `FR-9.20`, which governs deployment configuration only |

#### 3.9.3 F2 — Phase 7 Superseding Note on USWDS-Named Rules (existing feature, superseding note + new story)

| Trace level | Identifier |
|---|---|
| **Roadmap / Release** | Phase 7 / R4 |
| **PRD** | §5.1 F2 Phase 7 update paragraph; §4.1 Tech Stack (Frontend row); §3.1 goal 5 |
| **FRD** | `FRD/F02-uswds-shell-accessibility.md` Phase 7 note — 26 named `FR-2.x` rules (including `FR-2.1`, `FR-2.2`, `FR-2.3`, `FR-2.5`, `FR-2.11`, `FR-2.12`, `FR-2.13`, `FR-2.18`, `FR-2.20`, `FR-2.22`) and SM-12 are **superseded in place**, pending a Phase 7 UI-SPEC; all other `FR-2.x` rules (accessibility-outcome rules, not USWDS-naming rules) are explicitly retained unchanged |
| **TechArch** | `01-components.md` §1A.1b — build-pipeline constraints (self-hosted assets, CSP `style-src 'self'`) held fixed as a baseline; `docs/uswds-conformance-register.md` flagged for wholesale re-authoring once the new design system's primitives are known |
| **User Stories** | `UserStories/Epic-02-uswds-shell-accessibility.md` — new **US-2.7** ("Keep meeting federal accessibility standards no matter which visual system renders the shell"); existing US-2.1, US-2.4, US-2.5, US-2.6 are retained verbatim as the Phase-6/USWDS baseline per the epic's own Phase 7 note, not rewritten by this RTM |
| **Test evidence** | **Reused, unchanged in mechanism, requiring re-execution once the new design ships:** `TEST-MAN-01`…`TEST-MAN-06` (each screen's per-screen accessibility sign-off must be **re-signed**, not carried forward, per US-2.7 AC4) · `TEST-ARCH-09` (still asserts no `.github/workflows`/CI gate — unaffected by the visual redesign) |
| **Explicit non-claim** | NFR-2 (Section 508 / WCAG 2.1 AA) and NFR-1's underlying conformance *obligation* are unchanged — only the conformance *mechanism* (which concrete component/token library delivers it) is deferred to Phase 7 UI-SPEC. This is not an accessibility regression and does not touch Invariant enforcement in §5. |

#### 3.9.4 Exclusion Coverage — Phase 7 Treatment of §6 Row #7 (no existing row altered)

The existing §6 exclusion table row **#7 "Seeded demonstration dataset"** is retained verbatim below, unmodified, as the historical v1.0 baseline decision. Phase 7 reverses that decision via F15 (PRD §5.7, §10 #7 superseded) rather than deleting or renumbering the exclusion. The reversal is traced here, not by editing §6:

| # | Original exclusion (§6, unchanged) | Phase 7 disposition | Reversing requirement | Evidence the reversal stayed narrow |
|---|---|---|---|---|
| **7** | Seeded demonstration dataset | **Reversed** — a single, named, reviewed operator script now exists | `FR-15.1`–`FR-15.11`; PRD §5.7 F15, §4.2, §10 #7 | `FR-15.11` (exactly one demonstration case; not a general fixture tool); `TEST-ARCH-18`; the general-purpose bans this exclusion originally relied on (no `seeds/`/`fixtures/` directory, no migration `INSERT INTO`) remain exactly as strict as before (`TEST-ARCH-09`, `TEST-ARCH-11`, both unchanged) |

#### 3.9.5 NFR Coverage — Phase 7 Touchpoint

| NFR | Phase 7 touched? | What changed | What explicitly did not change |
|---|---|---|---|
| **NFR-1** Design system conformance | **Yes** | Visual system replaced (USWDS → newly-approved external design, F2); the per-screen conformance-verification *mechanism* (`docs/uswds-conformance-register.md`) requires wholesale re-authoring and every screen requires re-sign-off (US-2.7) | The conformance *obligation* itself — every interactive control must still have a documented accessible equivalence; see NFR-2 |
| **NFR-2** Accessibility (508/WCAG 2.1 AA) | Reinforced, not changed | Explicitly reasserted as independent of visual system (US-2.7) | The conformance bar, the manual-review-only enforcement mechanism (`FR-2.26`), and the no-CI-gate policy (§7.4) — all unchanged |
| **NFR-9** AI dependency resilience | **No — explicitly not claimed** | — | Degraded-mode architecture, retry/timeout logic, enumerated `failure_reason` set, and `test:e2e` scenario 2 are all unchanged by `FR-9.20`, which is a deployment-configuration requirement only (§3.9.2) |

---

## 4. Requirements Detail

Per-feature detail: the PRD feature, the FRD requirements that specify it, the stories that describe it, and the tests that prove it. FRD requirement identifiers are given in full where the group is small and by range with named members where it is large.

### 4.1 Category A — Governance Foundation

**F0 — Case Data Model & Append-Only Audit Store** · P0 · Data · no dependencies
- **FRD requirements (18):** `FR-0.1` entry immutability · `FR-0.2` per-value provenance · `FR-0.3` constant-origin enforcement · `FR-0.4` audit append-only privileges · `FR-0.5` audit mutation trigger · `FR-0.6` monotonic per-case sequence · `FR-0.7` hash linkage · `FR-0.8` chain verifiability · `FR-0.9` human-in-the-loop constraint trigger · `FR-0.10` audit-coupling constraint triggers · `FR-0.11` exception derivation integrity · `FR-0.12` single decision per exception · `FR-0.13` single recommendation per exception · `FR-0.14` receipt ordering · `FR-0.15` reason storage and non-emptiness · `FR-0.16` timestamps · `FR-0.17` migrations · `FR-0.18` no seed data. Cross-feature: `FR-Y0.1`–`FR-Y0.5`
- **TechArch:** 13 tables (§2); three DB roles incl. `cargoexec_ai` (**A-1**); four trigger families (immutability, chain, HITL, audit coupling); migrations 0001–0010 create tables and their protections in the same migration so no mutable window exists
- **Stories (5):** US-0.1 immutable history · US-0.2 per-value attribution · US-0.3 entry of record preserved · US-0.4 unambiguous order + tamper evidence · US-0.5 structural impossibility of closure without a decision
- **FRD acceptance criteria:** 7 · **Tests:** TEST-DB-01…18, TEST-UNIT-04, TEST-ARCH-10, TEST-ARCH-11
- **Carries:** all four structural invariants (§5)

**F1 — Cargo Specialist Authentication & Session** · P0 · API + sign-in screen · depends on F0, F2
- **FRD requirements (21):** `FR-1.1` single role · `FR-1.2` server-side sessions · `FR-1.3` cookie attributes (**D-2** profiles) · `FR-1.4` Argon2id password storage · `FR-1.5` absolute 8 h / idle 30 min expiry · `FR-1.6` identity available to the audit writer · `FR-1.7` unauthenticated access outcome · `FR-1.8` expiry during use · `FR-1.9` CSRF double-submit · `FR-1.10` sign-in throttling · `FR-1.11` concurrent sessions · `FR-1.12` session events are not case audit entries · `FR-1.13` account provisioning by CLI only · `FR-1.14` secrets handling · `FR-1.15`–`FR-1.21` sign-in screen structure, error presentation, pending state, keyboard/AT, destination
- **TechArch:** §4.2–§4.4; endpoints 1–3; `cli/create-specialist`; binary authorisation in one middleware
- **Stories (5):** US-1.1 sign in · US-1.2 kept out until signed in · US-1.3 identity attached to everything · US-1.4 predictable expiry and deliberate sign-out · US-1.5 throttling *(P1)*
- **FRD acceptance criteria:** 8 · **Tests:** TEST-API-01, TEST-UNIT-07, TEST-MAN-01, TEST-E2E-01
- **Boundary recorded:** sign-in/out/expiry write **no** case audit entry (`FR-1.12`, `FR-13.17`) — a deliberate boundary, not an audit gap, because no case state changes

**F2 — USWDS Application Shell & Accessibility Foundation** · P0 (statutory) · UI / assets · no dependencies
- **FRD requirements (26):** `FR-2.1`–`FR-2.3` USWDS provenance, tokens, self-hosted assets · `FR-2.4`–`FR-2.9` landmarks, banner, header, two-item navigation, heading order, accessible names · `FR-2.10`–`FR-2.13` label association, required marking, error summary, inline error text · `FR-2.14`–`FR-2.19` keyboard operability, visible focus, live regions, colour independence, contrast, resize/reflow · `FR-2.20`–`FR-2.24` provenance badge, reduced motion, shared state components, responsiveness budget, document metadata · **`FR-2.25` no automated accessibility gate** · **`FR-2.26` per-screen accessibility review checklist**
- **TechArch:** §7 in full; §7.5 colour-independence carriers; §7.6 form/error pattern inherited by F1, F6, F12; §7.7 the review gate; §7.8 explicitly no CI gate
- **Stories (6):** US-2.1 federal page frame · US-2.2 exactly two destinations · US-2.3 keyboard-only completion · US-2.4 accessible error identification · US-2.5 provenance without colour · US-2.6 per-screen signed review
- **FRD acceptance criteria:** 9 · **Tests:** TEST-MAN-01…06, TEST-MAN-08, TEST-ARCH-09, TEST-ARCH-15, TEST-ARCH-16, TEST-E2E-05
- **Phase 7 addendum (additive; does not revise the above):** the 26 FRD requirements listed above are **superseded in place**, not rewritten, by a Phase 7 note pending a Phase 7 UI-SPEC once the newly-approved external design's concrete tokens/components are known. New **US-2.7** carries the outcome-based accessibility guarantee (508/WCAG 2.1 AA independent of visual system) through the gap. Full trace: §3.9.3.

### 4.2 Category B — Cargo Entry & Validation

**F3 — Manual Cargo Entry Creation (API)** · P0 · API · depends on F0, F1, F4, F5
- **FRD requirements (16):** `FR-3.1` authenticated creation only · `FR-3.2` manual entry only · `FR-3.3` atomicity · `FR-3.4` validation unconditional and non-bypassable · `FR-3.5` `HUMAN` provenance baseline · `FR-3.6` entry immutability · `FR-3.7` unknown fields rejected · `FR-3.8` empty-string handling · `FR-3.9` duplicate entry number · `FR-3.10` receipt response explicit · `FR-3.11` entry retrieval · `FR-3.12` no listing endpoint · `FR-3.13` case reference allocation · `FR-3.14` post-commit, non-blocking generation · `FR-3.15` 64 KB request limit · `FR-3.16` receipt not idempotent
- **TechArch:** §1.5 receipt lifecycle implementing **D-3** (validate the canonical record, then a single `INSERT` writing the final `receipt_outcome`; `cargoexec_app` cannot `UPDATE cargo_entries` at all); `R-L5` single write path
- **Stories (4):** US-3.1 atomic receipt · US-3.2 keystrokes as typed, attributed · US-3.3 duplicate entry number *(P1)* · US-3.4 no path that skips validation
- **FRD acceptance criteria:** 8 · **Tests:** TEST-API-02, TEST-DB-16, TEST-ARCH-01

**F4 — Required-Information Validation on Receipt** · P0 · API / Data · depends on F0
- **FRD requirements (15):** `FR-4.1` domain lists are constants, not data · `FR-4.2` runs on receipt, only on receipt · `FR-4.3` completeness (no short-circuit) · `FR-4.4` determinism · `FR-4.5` presence gating · `FR-4.6` format gating for domain rules · `FR-4.7` conditional applicability · `FR-4.8` finding order (ascending `rule_id`) · `FR-4.9` no severity or ranking · `FR-4.10` outcome · `FR-4.11` result persistence · `FR-4.12` result immutability · `FR-4.13` message rendering · `FR-4.14` findings feed downstream unchanged · `FR-4.15` rule registry testability
- **Rule set `RIV-2026.09` (31 rules):** presence `RIV-010, 020, 030, 040, 050, 060, 070, 080, 090, 100, 110, 120, 130` (13) · format and domain `RIV-011, 021, 031, 032, 041, 051, 071, 072, 073, 081, 082, 091, 092, 101, 111, 121, 131, 132` (18)
- **`[ASSUMPTION]` carried forward:** rule *content* is an implementation assumption open to CBP refinement; rule *characteristics* (deterministic, presence/format/closed-domain only, independently testable, no duty or classification determination) are not open
- **TechArch:** `services/validation/` with `R-L10` purity (no clock, DB, network, or random source); startup registry integrity self-check refusing boot with `RULE_SET_INVALID`; **C-2** `primary_field` for `RIV-070`/`RIV-073`; **C-3** F3's stale `RIV-150/170/180/181` references are not implemented
- **Stories (4):** US-4.1 all applicable rules on receipt · US-4.2 plain-language reason bound to a field · US-4.3 determinism · US-4.4 clean pass recorded explicitly
- **FRD acceptance criteria:** 10 · **Tests:** TEST-UNIT-01, TEST-UNIT-02, TEST-UNIT-03

**F5 — Exception Creation from Validation Failure** · P0 · API / Data · depends on F0, F4, F13
- **FRD requirements (15):** `FR-5.1` sole creation path · `FR-5.2` universal derivation · `FR-5.3` one exception per entry · `FR-5.4` stated basis binding · `FR-5.5` basis immutability · `FR-5.6` lifecycle states · `FR-5.7` no transition without a human decision · `FR-5.8` receipt position · `FR-5.9` no prioritisation surface · `FR-5.10` case reference exposure · `FR-5.11` opening audit entry · `FR-5.12` recommendation placeholder · `FR-5.13` placeholder is not a resolution · `FR-5.14` closure fields · `FR-5.15` no deletion
- **TechArch:** composite FK `(validation_result_id, validation_outcome)` with `CHECK (validation_outcome='FAIL')` — an exception on a passing validation is rejected by the database with no trigger required; closure `CHECK`: `state='OPEN' ⇔ (closed_at IS NULL AND decision_id IS NULL)`
- **Stories (4):** US-5.1 failing entry becomes a case with a stated basis · US-5.2 permanent receipt ordering · US-5.3 no open/reopen/park outside the loop · US-5.4 one human-readable reference everywhere
- **FRD acceptance criteria:** 8 · **Tests:** TEST-DB-08, TEST-DB-18, TEST-API-02

**F6 — Cargo Entry Web UI** · P0 · **User-facing** · depends on F2, F3
- **FRD requirements (19):** `FR-6.1` field set parity · `FR-6.2` labels and hints · `FR-6.3` required marking · `FR-6.4` **client hints never gate submission** · `FR-6.5` values submitted as typed · `FR-6.6` input affordances · `FR-6.7` no draft, autosave, or duplicate shortcut · `FR-6.8` outcome never ambiguous · `FR-6.9` double-submission prevention · `FR-6.10` inline findings binding · `FR-6.11` summary ordering · `FR-6.12` message fidelity · `FR-6.13` navigation from outcome · `FR-6.14` read-only submitted values · `FR-6.15` duplicate entry number · `FR-6.16` session expiry on submit · `FR-6.17` performance · `FR-6.18` accessibility sign-off · `FR-6.19` no ingestion affordance
- **Stories (6):** US-6.1 labelled USWDS form · US-6.2 submit a deliberately incomplete entry · US-6.3 plain outcome · US-6.4 field-by-field findings · US-6.5 typing survives failure *(P1)* · US-6.6 keyboard-only creation and case open
- **FRD acceptance criteria:** 8 · **Tests:** TEST-MAN-02, TEST-API-02, TEST-E2E-01, TEST-E2E-05
- **Design note traced:** `FR-6.4` is load-bearing — an incomplete entry **must** be submittable in order to become an exception, so client validation may never block it

### 4.3 Category C — Review Queue

**F7 — Review Queue (API)** · P0 · API · depends on F0, F1, F5
- **FRD requirements (14):** `FR-7.1` strict receipt order · **`FR-7.2` zero query parameters** · **`FR-7.3` no filtering, sorting, assignment, or prioritisation, anywhere** · `FR-7.4` open cases only · `FR-7.5` row summary payload · `FR-7.6` failure summary derivation · `FR-7.7` case detail payload · `FR-7.8` permitted decisions are server-declared · `FR-7.9` bounded response without pagination · `FR-7.10` read-only · `FR-7.11` authenticated, single role · `FR-7.12` no caching of stale state · `FR-7.13` determinism under concurrency · `FR-7.14` not found. Cross-feature `FR-Y1.1`–`FR-Y1.7`
- **TechArch:** `queue.service` has no parameters in its signature; one partial index on `receipt_position` so no other ordering is even efficient; any query string ⇒ `400 UNSUPPORTED_QUERY_PARAMETER`
- **Stories (5):** US-7.1 strict receipt order · US-7.2 open cases only, decided still reachable by link · US-7.3 **no management dimensions at all** · US-7.4 everything needed to decide · US-7.5 server declares permitted decisions
- **FRD acceptance criteria:** 8 · **Tests:** TEST-API-03, TEST-ARCH-01, TEST-ARCH-02

**F8 — Review Queue Web UI** · P0 · **User-facing** · depends on F2, F7
- **FRD requirements (16):** `FR-8.1` order mirrors the server · `FR-8.2` fixed columns · **`FR-8.3` no sort affordance** · **`FR-8.4` no filter, search, assignment, or bulk control** · `FR-8.5` row activation · `FR-8.6` table semantics · `FR-8.7` empty state · `FR-8.8` loading and error states · `FR-8.9` announcements · `FR-8.10` refresh is explicit · `FR-8.11` return-to-queue continuity · `FR-8.12` truncation notice · `FR-8.13` closed cases not listed · `FR-8.14` unambiguous dates · `FR-8.15` performance · `FR-8.16` accessibility sign-off
- **Stories (6):** US-8.1 accessible receipt-ordered list · US-8.2 keyboard open · US-8.3 empty state with a route to start · US-8.4 return after a decision · US-8.5 **no filtering, sorting, assignment, or aging language** · US-8.6 truncation notice *(P1)*
- **FRD acceptance criteria:** 8 · **Tests:** TEST-MAN-03, TEST-ARCH-15, TEST-E2E-01

### 4.4 Category D — AI Recommendation

**F9 — AI Resolution Recommendation Generation** · P0 · Integration / async · depends on F0, F5, F13
- **FRD requirements (19):** **`FR-9.1` a recommendation is a proposal, structurally** · **`FR-9.2` the AI cannot write a decision** · `FR-9.3` entry of record untouched · `FR-9.4` origin is `AI`, always · `FR-9.5` one recommendation per exception · `FR-9.6` trigger is exception creation only · `FR-9.7` output contract · `FR-9.8` no computation of excluded determinations · `FR-9.9` rationale quality · `FR-9.10` provenance metadata recorded · `FR-9.11` exactly one audit entry per terminal outcome · `FR-9.12` degraded mode never blocks the loop · `FR-9.13` enumerated failure reasons (7) · `FR-9.14` no automatic retry after a terminal outcome · `FR-9.15` provider abstraction · `FR-9.16` credentials and data handling · `FR-9.17` concurrency and idempotence · `FR-9.18` bounded resource use · `FR-9.19` process restart. Cross-feature `FR-Y3.1`–`FR-Y3.13`
- **TechArch:** §5 provider abstraction; **A-2** prompt integrity manifest (`prompt_version` → SHA-256, checked at startup); **A-1** `cargoexec_ai` pool with no privilege on `decisions`/`decision_values` and no `UPDATE` on `exceptions`; `R-L6` worker cannot import the decision service; `R-L7` no provider SDK type outside the adapter; **C-1** `failure_reason` lives on `recommendations`, joined via `audit_entries.recommendation_id`
- **Stories (5):** US-9.1 prepared without waiting · US-9.2 stored as a proposal, not a change · US-9.3 exactly what the AI said and which model said it · US-9.4 keep working when the AI is unavailable · US-9.5 **the AI cannot decide and cannot stray outside its remit**
- **FRD acceptance criteria:** 8 · **Tests:** TEST-UNIT-06, TEST-DB-07, TEST-DB-17, TEST-ARCH-05, TEST-ARCH-06, TEST-ARCH-14, TEST-E2E-02, TEST-MAN-07
- **Phase 7 addendum (additive; does not revise the above):** new `FR-9.20` requires the demonstration/production deployment to be configured against a real hosted LLM rather than the `fake:deterministic` provider (deployment posture only — no change to the provider abstraction, retry/timeout logic, or output schema above). New **US-9.6** carries this. Full trace: §3.9.2.

**F10 — Exception Case Detail & Recommendation Presentation UI** · P0 · **User-facing** · depends on F2, F7, F9
- **FRD requirements (18):** `FR-10.1` proposal framing everywhere · `FR-10.2` per-value AI marking · `FR-10.3` comparison rows · `FR-10.4` rationale presentation · `FR-10.5` model metadata · `FR-10.6` findings as stated basis · `FR-10.7` pending behaviour · `FR-10.8` degraded presentation is not an error · `FR-10.9` decision controls always present when open · `FR-10.10` heading structure and reading order · `FR-10.11` closed-case presentation · `FR-10.12` no mutation of anything but the decision · `FR-10.13` deep link and identifier tolerance · **`FR-10.14` no queue-position or aging language** · `FR-10.15` not-found and forbidden states · `FR-10.16` value escaping · `FR-10.17` performance · `FR-10.18` accessibility sign-off
- **Stories (8):** US-10.1 why the case is open · US-10.2 values read back · US-10.3 recommended action and rationale · US-10.4 AI value vs mine at decision time · US-10.5 generation in progress *(P1)* · US-10.6 decide without a recommendation · US-10.7 closed case as final record · US-10.8 predictable order, no queue or aging language
- **FRD acceptance criteria:** 9 · **Tests:** TEST-MAN-04, TEST-ARCH-17, TEST-E2E-02

### 4.5 Category E — Human Decision

**F11 — Human Decision Processing — Edit / Approve / Reject (API)** · P0 · API · depends on F0, F1, F9, F13
- **FRD requirements (21):** **`FR-11.1` decisions are the only writer of resolution and state** · **`FR-11.2` explicit decision required** · `FR-11.3` approve · `FR-11.4` edit-and-approve · `FR-11.5` reject · `FR-11.6` permitted decisions by recommendation status · `FR-11.7` resolution value set completeness · **`FR-11.8` provenance computation (normative)** · **`FR-11.9` mandatory reason on edit and reject** · `FR-11.10` one decision per case, ever · `FR-11.11` idempotency · `FR-11.12` transactional coupling · `FR-11.13` exactly one audit entry · `FR-11.14` actor from session only · `FR-11.15` unknown fields rejected · `FR-11.16` recommendation reference consistency · `FR-11.17` value length limits · `FR-11.18` entry of record untouched · `FR-11.19` findings untouched · `FR-11.20` no bulk decision · `FR-11.21` response content
- **TechArch:** §1.6 decision lifecycle (row lock → permitted-decision check → server-computed origin → decision + values → state → exactly one audit entry → commit-time trigger verification); `R-L4` `decision.service` is the only writer of `exceptions.state`, `closed_at`, `decision_id`, `decisions`, `decision_values`
- **Stories (7):** US-11.1 approve · US-11.2 edit and approve · US-11.3 reject · US-11.4 **required reason on edit or reject** · US-11.5 **nothing resolves without my decision** · US-11.6 never decide twice *(P1)* · US-11.7 no approving a proposal that does not exist
- **FRD acceptance criteria:** 10 · **Tests:** TEST-API-04, TEST-UNIT-05, TEST-DB-04, TEST-DB-05, TEST-DB-09, TEST-DB-10, TEST-ARCH-04

**F12 — Decision Web UI — Edit, Approve, Reject with Reason Capture** · P0 · **User-facing** · depends on F2, F10, F11
- **FRD requirements (18):** **`FR-12.1` no default, no pre-selection, no emphasis asymmetry** · `FR-12.2` two-step commitment · `FR-12.3` control set from the server · `FR-12.4` reason required on edit and reject · `FR-12.5` reason is free text, never a canned list · `FR-12.6` changed-field marking · `FR-12.7` complete value set submitted · `FR-12.8` pre-submission summary content · `FR-12.9` client checks never substitute for the server · `FR-12.10` confirmation rendered from the server response · `FR-12.11` controls disappear after a decision · `FR-12.12` already-decided handling · `FR-12.13` stale recommendation handling · `FR-12.14` double-submission prevention · `FR-12.15` cancel is lossless and non-mutating · `FR-12.16` no bulk or shortcut decision · `FR-12.17` keyboard completeness · `FR-12.18` accessibility sign-off
- **Stories (7):** US-12.1 three actions, nothing chosen for me · US-12.2 edit and see what I changed · US-12.3 write my reason, told accessibly if I have not · US-12.4 see what will be recorded · US-12.5 see what was recorded, from the server's record · US-12.6 already-decided / changed proposal handled *(P1)* · US-12.7 whole decision by keyboard
- **FRD acceptance criteria:** 9 · **Tests:** TEST-MAN-05, TEST-E2E-01, TEST-E2E-03, TEST-E2E-05
- **Risk traced:** R-1 (rubber-stamping) is mitigated structurally by `FR-12.1` — no default and no emphasis asymmetry — so approval is a deliberate act

### 4.6 Category F — Audit Trail

**F13 — Audit Entry Writer — Append-Only on Every State Change** · P0 · API / Data · depends on F0
- **FRD requirements (18):** **`FR-13.1` single writer** · **`FR-13.2` insert-only interface** · `FR-13.3` transactional coupling · **`FR-13.4` exactly one entry per state change** · `FR-13.5` sequence assignment under the case-anchor lock · `FR-13.6` hash chain computation · `FR-13.7` actor rules (`SPECIALIST` / `AI` / `SYSTEM`) · `FR-13.8` timestamp authority (`now()` in-transaction, never client-supplied) · `FR-13.9` per-value before/after with origin · `FR-13.10` reason carried onto the entry · `FR-13.11` values recorded verbatim · `FR-13.12` secrets never written · `FR-13.13` mutation rejected at the persistence layer · **`FR-13.14` no retention, archival, or purge path** · `FR-13.15` read path · `FR-13.16` failure is loud · `FR-13.17` boundary: session events are not case audit entries · **`FR-13.18` no export surface**
- **Audit action coverage (8, 1:1 with transitions):** `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED`, `RECOMMENDATION_GENERATED`, `RECOMMENDATION_UNAVAILABLE`, `RECOMMENDATION_APPROVED`, `RECOMMENDATION_EDITED_AND_APPROVED`, `RECOMMENDATION_REJECTED`
- **TechArch:** `audit/writer.ts` exposes exactly one function `append(tx, entry)` which cannot open its own transaction; `R-L3` asserts the audit tables are referenced by exactly one module; no ORM anywhere, so no framework can emit an `UPDATE` nobody wrote
- **Stories (5):** US-13.1 recorded exactly once · US-13.2 who/what/when/before/after/origin · US-13.3 reason travels with its event · US-13.4 **no one can edit or delete history, ever** · US-13.5 an unauditable change fails loudly
- **FRD acceptance criteria:** 8 · **Tests:** TEST-DB-01, 02, 03, 05, 06, 07, 13, 14, TEST-ARCH-03, TEST-API-05

**F14 — Per-Case Audit Trail Web UI** · P0 · **User-facing** · depends on F2, F10, F13
- **FRD requirements (19):** `FR-14.1` chronological, server order · `FR-14.2` complete event content · `FR-14.3` provenance per event and per value · `FR-14.4` the AI is never rendered as a person · `FR-14.5` reason displayed verbatim · `FR-14.6` before/after completeness · **`FR-14.7` read-only by construction** · **`FR-14.8` no export** · `FR-14.9` answers the three questions in place · `FR-14.10` integrity statement (`chain_verified`) · `FR-14.11` available for open and closed cases · `FR-14.12` live update only on decision · `FR-14.13` accessible list semantics · `FR-14.14` reading order · `FR-14.15` unambiguous timestamps · `FR-14.16` escaping · `FR-14.17` empty and loading states · `FR-14.18` performance · `FR-14.19` accessibility sign-off
- **Stories (7):** US-14.1 the whole story in the case itself · US-14.2 AI and humans distinguished per event and value · US-14.3 my reason in full · US-14.4 complete before-and-after · US-14.5 integrity-check failure surfaced · US-14.6 **nothing on the trail can change it or take it away** · US-14.7 answer the oversight questions from the case alone
- **FRD acceptance criteria:** 9 · **Tests:** TEST-MAN-06, TEST-API-05, TEST-DB-15, TEST-E2E-01, TEST-E2E-03

### 4.7 Category G — Demonstration Enablement (Phase 7)

**F15 — Seeded Demonstration Case** · P0 · Data / Operational tooling · depends on F0, F3, F4, F5, F9, F11, F13 · introduced Phase 7, Release R4
- **FRD requirements (11):** `FR-15.1` no migration-based insertion · `FR-15.2` same code paths as production · `FR-15.3` idempotency and stage-resumability · `FR-15.4` demonstration specialist provisioning · `FR-15.5` decision type demonstrated: `EDIT_APPROVE` with mixed provenance · `FR-15.6` full lifecycle coverage · `FR-15.7` audit trail integrity preserved · `FR-15.8` no auto-apply exception for the seeded case either · `FR-15.9` demonstration fixture labelling · `FR-15.10` operational invocation only · `FR-15.11` exactly one demonstration case; not a general fixture tool
- **TechArch:** `server/src/cli/seed-demo-case.ts`, placed and provisioned exactly like `cli/create-specialist.ts` (§1A.1a); calls F3/F4/F5/F9/F11's own service functions and F13's own `append(tx, entry)` chokepoint, in-process, never HTTP; no new table, column, or endpoint; deployment sequence step 5a (§8.7); full behavioural/idempotency contract at §8.9
- **Stories (5):** US-15.1 built through the same code the live application uses, never a shortcut · US-15.2 run any number of times without creating a duplicate of anything · US-15.3 see one case that genuinely demonstrates a mixed AI/human resolution · US-15.4 trust that the audit trail is real, complete, and indistinguishable from a live one · US-15.5 kept a narrow, operator-only tool the application itself can never reach
- **FRD acceptance criteria:** 8 · **Tests:** TEST-ARCH-11 (unchanged, reused), TEST-ARCH-09 (unchanged, reused), TEST-ARCH-18 (new), TEST-MAN-10 (new)
- **Reverses:** PRD §10 #7 / PROJECT.md Out-of-Scope "Seeded demonstration dataset" — see §3.9.1, §3.9.4 for the full reversal trace. The reversal is additive: F6 manual entry is unaffected and remains the only way to create any cargo entry beyond the one seeded case.

---

## 5. Structural Invariant Traceability

The product's accountability guarantee rests on four properties that were required to be **structural rather than conventional**. Each is traced here from the source requirement, through every independent enforcement layer, to the named test that proves it. These are the rows an auditor should read first: if any one of them is unenforced, the product has failed its purpose regardless of feature completeness.

### 5.1 Invariant I-1 — Append-Only Audit Immutability

| Trace level | Identifier | Statement |
|---|---|---|
| **Source requirement** | PROJECT.md Active #8; Constraint "Auditability"; Key decision "Append-only audit trail rather than mutable case history" | Every state change writes an append-only audit entry; an editable audit trail cannot support oversight |
| **PRD** | F0, F13, **NFR-3**, SM-7, R-4 | Insert-only; UPDATE/DELETE privileges revoked; mutation attempts rejected, not merely absent |
| **FRD requirement** | `FR-0.4`, `FR-0.5`, `FR-0.6`, `FR-0.7`, `FR-0.8`, `FR-13.2`, `FR-13.13`, `FR-13.14`, `FR-13.18` | Privileges, unconditional mutation trigger, monotonic sequence, hash linkage, read-only verifier, insert-only interface, no purge, no export |
| **Schema / trigger enforcement** | TechArch §1.4(1), §2.9, §2.10, §2.11, §2.12 | **Privilege layer:** `REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries, audit_entry_values FROM PUBLIC, cargoexec_app, cargoexec_ai`; `GRANT SELECT, INSERT` only. **Trigger layer:** `BEFORE UPDATE OR DELETE OR TRUNCATE` statement- and row-level triggers raising `AUDIT_IMMUTABLE` unconditionally — covering owner and superuser, which privileges do not. **Tamper evidence:** `case_sequence` + `prev_entry_hash`/`entry_hash` SHA-256 chain verified by a **deferred constraint trigger at commit**, so a broken link cannot be committed even from a direct SQL session. **Interface layer:** one function `append(tx, entry)`; no update/delete/redact/backfill function exists. **Data-access layer:** no ORM, so no dirty-tracking flush can emit an `UPDATE`. **Retention layer:** no purge, rollup, archive, or retention job exists |
| **Deployment safety** | `FR-0.17` | Revocations and triggers are created in the **same migration** as the tables they protect — no deployment window exists in which the audit store is mutable |
| **User story** | **US-0.1**, US-0.4, **US-13.4**, US-14.6 | "Decision history that cannot be rewritten afterwards"; "Know that no one can edit or delete the history — ever" |
| **Proving test** | **TEST-DB-01** `UPDATE audit_entries SET action_type='X'` fails as `cargoexec_app`, as `cargoexec_ai`, **and as `cargoexec_owner`** · **TEST-DB-02** `DELETE FROM audit_entry_values` and `TRUNCATE` fail for all three roles · **TEST-DB-03** `INSERT … ON CONFLICT DO UPDATE` against an audit table fails · **TEST-DB-14** tampered `prev_entry_hash` refused at commit (`AUDIT_CHAIN_BROKEN`) · **TEST-DB-15** excised middle entry ⇒ `verify_audit_chain` returns `chain_verified=false` at the expected sequence · **TEST-ARCH-03** audit tables referenced by exactly one module | Automated |
| **Metric** | **SM-7** — 100% of mutation attempts rejected, including attempts made directly against the database | |
| **Harness side-effect (corroborating)** | TechArch §8.2 | Test teardown cannot use `TRUNCATE` on the audit tables, so each suite drops its database instead — the guarantee constrains the test harness itself |

### 5.2 Invariant I-2 — Per-Value AI-vs-Human Provenance

| Trace level | Identifier | Statement |
|---|---|---|
| **Source requirement** | PROJECT.md Active #8; Constraint "Data provenance"; Key decision "Record AI-vs-human provenance on every value"; Context "Provenance must be distinguishable, not merely logged" | Every recorded value must be attributable to AI or human origin — a core requirement, not metadata |
| **PRD** | F0, F9, F10, F11, F14, **NFR-4**, SM-3, R-5 | Provenance at value granularity, stored structurally and rendered distinguishably; a mixed AI/human resolution attributable field by field |
| **FRD requirement** | `FR-0.2`, `FR-0.3`, `FR-9.4`, `FR-11.8`, `FR-13.9`, `FR-10.2`, `FR-14.3`, `FR-2.17`, `FR-2.20` | `origin NOT NULL` on all four value tables; constant-origin `CHECK`s; normative server-side provenance computation; per-value before/after origin on audit values; rendering rules |
| **Schema / trigger enforcement** | TechArch §1.4(2), §2.4, §2.7, §2.8 | **Schema:** four value tables carry `origin NOT NULL CHECK (origin IN ('AI','HUMAN'))`; `cargo_entry_field_origins` is `CHECK (origin='HUMAN')`; `recommendation_values` is `CHECK (origin='AI')` — so **mixed origin is representable only on `decision_values`**, exactly where a human edits an AI proposal. `audit_entry_values` carries `before_origin`/`after_origin` with a `CHECK` that an origin exists wherever a value exists. **Computation:** `origin` computed server-side by canonical comparison against the proposal; a client-sent `origin` is rejected as an unknown field (`422 REQUEST_MALFORMED`). **Type layer:** `Origin = 'AI' \| 'HUMAN'` is a **required** property of every value-bearing DTO — no optional-origin type exists in the contract package. **Render gate:** the only component permitted to render a case value takes `Attributed<T> = { value: T; origin: Origin }`; a bare `string` will not type-check into it. **Presentation:** `ProvenanceBadge` renders text + icon + token colour, never colour alone, with visually-hidden text in compact contexts |
| **User story** | **US-0.2**, US-2.5, US-10.4, US-11.2, US-14.2 | "Every recorded value attributed to AI or to me, value by value"; "Tell an AI value from a human value without relying on colour" |
| **Proving test** | **TEST-DB-11** an `audit_entry_values` row with a value but no origin is rejected · **TEST-DB-12** `recommendation_values` with `origin='HUMAN'` rejected; `cargo_entry_field_origins` with `origin='AI'` rejected · **TEST-UNIT-05** the three branches of provenance computation, including whitespace-only differences (trimmed ⇒ equal ⇒ `AI`) and an absent proposal (⇒ `HUMAN`) · **TEST-API-04** `EDIT_APPROVE` changing one of three values records that one `HUMAN` and the others `AI`, with `prior_value` on all three · **TEST-ARCH-17** case values are rendered only through `AttributedValue` | Automated |
| **Metric** | **SM-3** — 100% attribution; **0 unattributed values** | |

### 5.3 Invariant I-3 — Human-in-the-Loop / No Auto-Apply

| Trace level | Identifier | Statement |
|---|---|---|
| **Source requirement** | PROJECT.md Active #6; Constraint "Human-in-the-loop"; Key decision "AI recommends, human decides — nothing auto-applies"; Out of scope #8 "Autonomous AI resolution without human approval" | No AI recommendation may auto-apply — accountability requires a human decision on every resolution |
| **PRD** | F9, F11, F12, **NFR-5**, §4.3 #1, SM-4, R-1 | Resolution state reachable only via an authenticated specialist's approve, edit-and-approve, or reject; the absence of an auto-apply path is verified by test |
| **FRD requirement** | `FR-0.9`, `FR-5.7`, `FR-9.1`, `FR-9.2`, `FR-11.1`, `FR-11.2`, `FR-11.14`, `FR-11.20`, `FR-12.1` | HITL constraint trigger; no transition without a human decision; a recommendation is a proposal structurally; the AI cannot write a decision; decisions are the only writer of resolution and state; actor from session only; no bulk decision; no default action in the UI |
| **Schema / trigger enforcement** | TechArch §1.4(3), §2.5, §2.6, §2.7, §2.9, §2.10, §5.5 | **Layer 1 — table separation:** proposals live in `recommendations`/`recommendation_values`; resolutions in `decisions`/`decision_values`. No shared column, no view, no job, no trigger copies one into the other. **Layer 2 — identity FK:** `decisions.decided_by uuid NOT NULL REFERENCES specialists(id)`, populated only from the authenticated request principal; **no `AI` or `SYSTEM` row exists in `specialists`**, so a machine-authored decision fails a foreign key. **Layer 3 — deferred trigger:** `trg_exceptions_hitl` refuses any commit moving an exception out of `OPEN` unless a matching `decisions` row exists whose `resulting_state` equals the new state — raises `HITL_VIOLATION`. **Layer 4 — closure `CHECK`:** `state='OPEN' ⇔ (closed_at IS NULL AND decision_id IS NULL)`; a closed exception with no decision is unrepresentable. **Layer 5 — privilege:** the worker's role `cargoexec_ai` (**A-1**) has **no** privilege on `decisions`/`decision_values` and **no** `UPDATE` on `exceptions`. **Layer 6 — code capability:** `R-L6` forbids `ai/*` importing the decision service; `R-L4` asserts exactly one writer of `exceptions.state`; no scheduler, cron, queue consumer, retry path, or admin tool exists. **Layer 7 — API shape:** `decision_type` is required with no default; no batch, no "approve all", no empty-body semantics, no apply endpoint |
| **User story** | **US-0.5**, US-9.2, **US-9.5**, **US-11.5**, US-12.1 | "Structural impossibility of a case closing without my decision"; "Be certain the AI cannot decide, and cannot stray outside its remit"; "Be certain nothing resolves without my decision" |
| **Proving test** | **TEST-DB-04** a transaction setting `exceptions.state='RESOLVED'` without inserting a `decisions` row fails at `COMMIT` with `HITL_VIOLATION` · **TEST-DB-17** `cargoexec_ai` cannot `INSERT` into `decisions`/`decision_values` and cannot `UPDATE exceptions` · **TEST-DB-18** a closed exception with `decision_id IS NULL`, or an open one with a decision, is rejected by the closure `CHECK` · **TEST-ARCH-04** exactly one module writes `exceptions.state`, `decisions`, or `decision_values` · **TEST-ARCH-05** `ai/*` does not import `decision.service` or any decision-writing repository · **TEST-E2E-04** a case left open for the duration of the suite never changes state on its own | Automated |
| **Metric** | **SM-4** — auto-apply incidents: **0** | |

### 5.4 Invariant I-4 — Exactly One Audit Entry per State Change

| Trace level | Identifier | Statement |
|---|---|---|
| **Source requirement** | PROJECT.md Active #8 | Every state change writes an append-only audit entry |
| **PRD** | F13, F0, **NFR-6**, SM-6 | Exactly one audit entry per state change, written in the same transaction; prevented by transactional coupling, not by convention |
| **FRD requirement** | `FR-0.10`, `FR-13.3`, `FR-13.4`, `FR-13.5`, `FR-13.16`, `FR-11.12`, `FR-11.13`, `FR-9.11`, `FR-5.11` | Five audit-coupling constraint triggers; transactional coupling; one entry per state change; sequence assignment under the case-anchor lock; loud failure |
| **State-transition set (8)** | FRD §0.6 | `(none)→RECEIVED` ⇒ `ENTRY_RECEIVED` · `RECEIVED→VALIDATED_CLEAN` and `RECEIVED→EXCEPTION_OPENED` ⇒ `VALIDATION_COMPLETED` · `(none)→OPEN` ⇒ `EXCEPTION_OPENED` · `PENDING→AVAILABLE` ⇒ `RECOMMENDATION_GENERATED` · `PENDING→UNAVAILABLE` ⇒ `RECOMMENDATION_UNAVAILABLE` · `OPEN→RESOLVED` (approve) ⇒ `RECOMMENDATION_APPROVED` · `OPEN→RESOLVED` (edit-approve) ⇒ `RECOMMENDATION_EDITED_AND_APPROVED` · `OPEN→REJECTED` ⇒ `RECOMMENDATION_REJECTED` |
| **Schema / trigger enforcement** | TechArch §1.4(4), §2.10, §2.11, §1.6 | **Coupling triggers (5, deferred):** refuse to commit (a) a `cargo_entries` insert without an `ENTRY_RECEIVED` entry, (b) a `validation_results` insert without `VALIDATION_COMPLETED`, (c) an `exceptions` insert without `EXCEPTION_OPENED`, (d) a `decisions` insert without **exactly one** audit entry referencing that `decision_id`, (e) a `recommendations` terminal transition without exactly one matching entry — raising `AUDIT_COUPLING_VIOLATION`. **Transaction coupling:** `append(tx, entry)` requires a transaction handle as its first parameter and has **no ability to open its own**, so the change and its entry necessarily share one transaction. **Sequence integrity:** `case_sequence` assigned under the case-anchor row lock with `UNIQUE (case_id, case_sequence)` as backstop. **Failure policy:** an `append` failure propagates and aborts the caller's transaction — never caught, retried out-of-band, queued, or written to a fallback file |
| **Boundary (traced, not a gap)** | `FR-1.12`, `FR-13.17` | Sign-in, sign-out, and session expiry write **no** case audit entry — `audit_entries.case_id` is `NOT NULL` and no case state changes at authentication. Session history lives on the `sessions` table |
| **User story** | **US-13.1**, US-13.5, US-0.5, US-1.4 | "Have every state change on my case recorded exactly once"; "Have an unauditable change fail loudly rather than proceed quietly" |
| **Proving test** | **Eight-transition enumeration test** — the eight transitions of FRD §0.6 enumerated with expected action, actor, before/after states and value rows, asserting exactly one entry each · **TEST-DB-05** a `decisions` insert with no audit entry fails at `COMMIT`; **so does one with two entries** · **TEST-DB-06** `cargo_entries`, `validation_results`, `exceptions` inserts without their coupled entry fail at commit · **TEST-DB-07** a recommendation moving to `AVAILABLE`/`UNAVAILABLE` without exactly one matching entry fails at commit · **TEST-DB-13** two concurrent audit writes to one case produce `case_sequence` 1 and 2 with correct linkage and no gap · **TEST-API-01** a decision without CSRF returns `403` **and writes no audit entry** | Automated |
| **Metric** | **SM-6** — 100% coverage; **0 unaudited transitions** | |

---

## 6. Exclusion Coverage

PRD §10 and `.planning/PROJECT.md` "Out of Scope" declare eleven capabilities as excluded. An exclusion that nothing checks for is an intention, not a boundary. This table traces each exclusion to the requirement that declares it, the story that asserts its absence as testable behaviour, and the architecture test that fails if the capability reappears.

| # | Exclusion (PROJECT.md / PRD §10) | Declared in | Absence-assertion story | Architecture / test evidence |
|---|---|---|---|---|
| **1** | **Accessibility enforcement in CI** — no automated gate, no axe-core workflow, no `.github/workflows` file | `FR-2.25`, TechArch §7.8, NFR-2 | **US-2.6** — "there is no `.github/workflows` directory, no axe-core job, and no accessibility test runner in the build pipeline — the checklist is the enforcement mechanism and is therefore mandatory" | **TEST-ARCH-09** no `.github/` directory, no CI workflow file anywhere, no accessibility runner in the build; `axe-core`, `@axe-core/*`, `jest-axe`, `pa11y`, `lighthouse-ci` on the forbidden-dependency list (**TEST-ARCH-08**). Substitute mechanism: **TEST-MAN-01…06** signed per-screen review |
| **2** | **Supervisor dashboard** — volume, queue health, aging, workload, throughput, reassignment, re-prioritisation | `FR-5.9`, `FR-7.3`, `FR-8.4`, `FR-10.14`, FRD §0.7 #2 | **US-7.3** "Have the queue carry no management dimensions at all" · **US-8.5** "no filtering, sorting, assignment, or aging language on the screen" · US-5.2, US-10.8 | **TEST-ARCH-10** schema contains none of the 25 forbidden column names (`assigned_to`, `assignee_id`, `priority`, `severity_rank`, `sla_due_at`, `age_days`, …) and has exactly 13 tables · **TEST-ARCH-15** primary navigation renders exactly two items · **TEST-API-03** no response field exposes priority, assignee, age, or a count-by-state; no aggregate or count-by-state query exists anywhere |
| **3** | **Multiple roles** — no supervisor, no read-only/auditor, no RBAC | `FR-1.1`, FRD §0.7 #3 | **US-1.2** — "authorisation is binary — no role, permission, scope, or RBAC check exists anywhere" · US-1.3 | **TEST-ARCH-10** no `role`/`permission`/`scope` column; no handler performs a role check; the three **database** roles (`owner`/`app`/`ai`) are not application roles and are not selectable, configurable, or surfaced |
| **4** | **Queue filtering, sorting, assignment, prioritisation** | `FR-7.2`, `FR-7.3`, `FR-8.3`, `FR-8.4`, FRD §0.7 #4 | **US-7.3** · **US-8.5** | **TEST-API-03** `?sort=`, `?state=`, `?assignee=`, `?page=` each return `400 UNSUPPORTED_QUERY_PARAMETER`; the whole API accepts zero query parameters · **TEST-ARCH-02** no route registration reads `req.query` except the rejection guard · only one partial index (`receipt_position`) exists, so no other ordering is even efficient |
| **5** | **Audit export in any format** | `FR-13.18`, `FR-14.8`, FRD §0.7 #5 | **US-13.4** · **US-14.6** "Find nothing on the trail that can change it or take it away" | **TEST-API-05** no `?format=`, no `Accept` variant, no download route; no endpoint returns entries for more than one case; no CSV/XLSX/PDF writer dependency (**TEST-ARCH-08**) |
| **6** | **File or API ingestion** — bulk upload, adapters, ACE/ATS boundary | `FR-3.2`, `FR-6.19`, FRD §0.7 #6 | **US-3.4** "Have no way to get data in that skips validation" — array body, multipart, and `text/csv` rejected; no import endpoint, no CLI import command, no ACE/ATS interface | **TEST-API-02** array body, CSV body, and a `skip_validation` property are all rejected · **TEST-ARCH-08** no multipart parser installed, so `415` is the only possible outcome; no adapter module, config key, or interface stub |
| **7** | **Seeded demonstration dataset** | `FR-0.18`, `FR-4.1`, FRD §0.7 #7 | **US-3.4** — "no migration inserts a cargo entry, exception, recommendation, decision, or audit entry" · US-8.3 treats the empty queue as normal | **TEST-ARCH-11** migration parser test fails on a domain `INSERT`; domain code lists are compiled-in frozen constants, not tables; no seed script or fixture loader in the shipped app — the only operational insert is the first specialist account |
| **8** | **Autonomous AI resolution without human approval** | `FR-9.1`, `FR-9.2`, `FR-11.1`, `FR-0.9`, FRD §0.7 #8 | **US-0.5** · **US-9.2** · **US-9.5** · **US-11.5** | **TEST-DB-04**, **TEST-DB-17**, **TEST-ARCH-04**, **TEST-ARCH-05**, **TEST-E2E-04**; no scheduler/cron/broker dependency; no `apply`/`auto`/`force`/bulk parameter exists in any request type (see §5.3) |
| **9** | **Duty / tariff calculation or classification rulings** | `FR-9.8`, F4 rule characteristics, FRD §0.7 #9 | **US-4.1** — "no rule computes a duty amount, assigns or checks an HTS or classification code, derives a rate, or makes any substantive customs determination" · **US-9.5** | **TEST-UNIT-06** a draft containing `hts_code` or `duty_amount` is rejected as `SCHEMA_INVALID` — such a determination is unrepresentable rather than discouraged · **TEST-ARCH-10** no `hts_code`/`tariff_rate`/`duty_amount` column |
| **10** | **Native mobile apps** | NFR-12, `FR-2.19`, FRD §0.7 #10 | **US-2.6** — responsive web usable at 200% zoom and 320 px width / tablet width only | **TEST-ARCH-08** dependency allowlist: no native shell, no mobile push dependency, no app-store artefact |
| **11** | **Model training or fine-tuning infrastructure** | `FR-9.15`, `FR-Y3.*`, FRD §0.7 #11 | **US-9.5** — the provider is consumed through request/response only | **TEST-ARCH-06** no provider SDK type outside `ai/adapter.http.ts` and no provider SDK as a dependency · **TEST-ARCH-08** no training, fine-tuning, embedding store, vector DB, evaluation harness, or feedback loop; a specialist's edit is recorded in the trail and goes nowhere near the model |

**Additional absence assertions traced (beyond the eleven):**

| Absence | Requirement | Story | Test |
|---|---|---|---|
| No entry mutation route (`PUT`/`PATCH`/`DELETE` on an entry) | `FR-0.1`, `FR-3.6`, `FR-11.18` | **US-0.3**, US-3.4 | TEST-ARCH-01 (route table pinned to ten), **TEST-DB-16** `cargoexec_app` cannot `UPDATE cargo_entries` (**D-3**) |
| No re-validation surface (`POST /api/validate`, re-run control, scheduled re-evaluation) | `FR-4.2`, `FR-4.12` | **US-4.4** | TEST-ARCH-01 |
| No exception reopen, park, or manual-open path | `FR-5.1`, `FR-5.6`, `FR-5.15` | **US-5.3** | TEST-ARCH-01, TEST-DB-08 |
| No entry-listing endpoint (`GET /api/entries`) | `FR-3.12` | US-3.4 | TEST-ARCH-01 |
| No eleventh route, including a health endpoint | `FR-Y1.1`, **C-4**, TechArch §8.6 | — | **TEST-ARCH-01** router array equals the ten pairs exactly; liveness is out-of-band via `cli/ping.js` |
| No `X-Frame-Options` header (**D-1**, so the demonstration is reachable in its preview IFRAME) | `FR-Y3.9a` | — | **TEST-ARCH-12** no `X-Frame-Options` on any of the ten routes or the SPA document · **TEST-ARCH-13** startup rejects `FRAME_ANCESTORS` of `'none'`/`'self'` · **TEST-E2E-06** sign-in completes inside an iframe |
| No audit retention, purge, rollup, or archive job | `FR-13.14` | US-13.4 | TEST-ARCH-03, TechArch §8.8 (data reset is by dropping the database) |

**SM-14 result: zero shipped features fall within an exclusion.** Verified by the whole `test:arch` suite plus the R3 line-by-line scope review (TEST-MAN-09).

---

## 7. Test Case Coverage

### 7.1 Test Case Inventory

Test case identifiers are derived from the FRD's testable assertions (the 127 feature acceptance criteria and the FR-* MUST statements) and from the TechArch §8.3 test inventory. Suites are run from `package.json` scripts; **no CI workflow file exists** (PRD §10 #1), so execution is local and at release walkthrough.

**`TEST-UNIT-*` — pure logic, no I/O (`npm run test:unit`) — Automated**

| ID | Target | Traces to |
|---|---|---|
| TEST-UNIT-01 | Rule registry: each of 31 `RIV-*` predicates has ≥1 passing and ≥1 failing case; unique `rule_id` and `failure_code`; every `primary_field` in the 14-field set; registry id set equals FRD F4's table | `FR-4.15`, **C-2**, US-4.1 |
| TEST-UNIT-02 | Determinism: same entry evaluated twice and in two processes yields byte-identical serialised results; `RIV-132` re-evaluated a month later is unchanged | `FR-4.4`, NFR-11, US-4.3 |
| TEST-UNIT-03 | Gating: blank-everything ⇒ exactly the 13 presence findings, no format/domain findings; `"ZZ"` ⇒ `RIV-031` only; `"9999"` ⇒ `RIV-032` only; `mode=AIR` + bill of lading ⇒ `RIV-070`; both documents ⇒ `RIV-073`; `"assorted goods"` ⇒ `RIV-092` | `FR-4.5`, `FR-4.6`, `FR-4.7`, US-4.1, US-4.2 |
| TEST-UNIT-04 | Canonical serialisation + hashing: key order, decimal scale, timestamp precision, `null` handling stable; fixed hash vector; reordering value rows changes the hash | `FR-0.7`, `FR-13.6`, US-0.4 |
| TEST-UNIT-05 | Provenance computation: the three branches, incl. whitespace-only difference (trimmed ⇒ equal ⇒ `AI`) and absent proposal (⇒ `HUMAN`) | `FR-11.8`, NFR-4, US-11.2 |
| TEST-UNIT-06 | Output-schema validation: a draft with `hts_code`, `duty_amount`, a duplicate `field_name`, an unknown top-level property, an over-length value, or a rule id not in this case's findings ⇒ `SCHEMA_INVALID` | `FR-9.7`, `FR-9.8`, US-9.5 |
| TEST-UNIT-07 | Redaction: pino drops cookies, CSRF headers, passwords, API keys; the sign-in body is dropped entirely | `FR-1.14`, `FR-13.12`, US-1.3 |

**`TEST-DB-*` — database invariants against real PostgreSQL 16 (`npm run test:db`) — Automated · the governance suite**

| ID | Assertion | Traces to |
|---|---|---|
| TEST-DB-01 | `UPDATE audit_entries SET action_type='X'` fails as `cargoexec_app`, `cargoexec_ai`, **and `cargoexec_owner`** | `FR-0.4`, `FR-0.5`, **I-1**, US-0.1, SM-7 |
| TEST-DB-02 | `DELETE FROM audit_entry_values` fails for all three roles; `TRUNCATE` fails for all three | `FR-0.5`, **I-1**, US-0.1, SM-7 |
| TEST-DB-03 | `INSERT … ON CONFLICT DO UPDATE` against an audit table fails | `FR-0.5`, **I-1**, US-0.1 |
| TEST-DB-04 | Setting `exceptions.state='RESOLVED'` without a `decisions` row fails at `COMMIT` with `HITL_VIOLATION` | `FR-0.9`, **I-3**, US-0.5, SM-4 |
| TEST-DB-05 | A `decisions` insert with **no** audit entry fails with `AUDIT_COUPLING_VIOLATION`; so does one with **two** | `FR-0.10`, **I-4**, US-13.1, SM-6 |
| TEST-DB-06 | `cargo_entries`, `validation_results`, `exceptions` inserts without their coupled entry fail at commit | `FR-0.10`, **I-4**, US-0.5 |
| TEST-DB-07 | A recommendation moving to `AVAILABLE`/`UNAVAILABLE` without exactly one matching entry fails at commit | `FR-0.10`, `FR-9.11`, **I-4** |
| TEST-DB-08 | An `exceptions` row referencing a `validation_results` row with `outcome='PASS'` is rejected (composite FK, no trigger) | `FR-0.11`, `FR-5.4`, US-5.1, SM-8 |
| TEST-DB-09 | A second `decisions` row for one exception is rejected by `UNIQUE (exception_id)` | `FR-0.12`, `FR-11.10`, US-11.6 |
| TEST-DB-10 | `EDIT_APPROVE`/`REJECT` with a blank, whitespace-only, or 9-character reason is rejected by `decisions_reason_required_chk` | `FR-0.15`, `FR-11.9`, US-11.4, SM-5 |
| TEST-DB-11 | An `audit_entry_values` row with a value but no origin is rejected | `FR-0.2`, `FR-13.9`, **I-2**, SM-3 |
| TEST-DB-12 | `recommendation_values` with `origin='HUMAN'` rejected; `cargo_entry_field_origins` with `origin='AI'` rejected | `FR-0.3`, **I-2**, US-0.2 |
| TEST-DB-13 | Two concurrent audit writes to one case produce `case_sequence` 1 and 2 with correct linkage and no gap | `FR-0.6`, `FR-13.5`, **I-4**, US-0.4 |
| TEST-DB-14 | A tampered `prev_entry_hash` insert is refused at commit (`AUDIT_CHAIN_BROKEN`) | `FR-0.7`, **I-1**, US-0.4 |
| TEST-DB-15 | In a copied database with a middle entry removed, `verify_audit_chain` returns `chain_verified=false` at the expected sequence | `FR-0.8`, `FR-14.10`, US-0.4, US-14.5 |
| TEST-DB-16 | `cargoexec_app` cannot `UPDATE cargo_entries` (**D-3**) | `FR-0.1`, `FR-3.6`, US-0.3 |
| TEST-DB-17 | `cargoexec_ai` cannot `INSERT` into `decisions`/`decision_values` and cannot `UPDATE exceptions` (**A-1**) | `FR-9.2`, **I-3**, US-9.5, SM-4 |
| TEST-DB-18 | A closed exception with `decision_id IS NULL`, or an open one with a decision, is rejected by the closure `CHECK` | `FR-5.14`, **I-3**, US-5.3 |

**`TEST-API-*` — supertest against the app and database (`npm run test:api`) — Automated**

| ID | Group | Principal assertions | Traces to |
|---|---|---|---|
| TEST-API-01 | Auth | Every endpoint except `POST /api/session` returns `401` unauthenticated; `/queue` HTML redirects to `/sign-in?next=%2Fqueue`; unknown email and wrong password byte-identical; 31-minute idle ⇒ `401` + `EXPIRED`; replayed post-sign-out cookie ⇒ `401`; a decision without CSRF ⇒ `403` **and no audit entry** | F1, `FR-1.7`–`FR-1.10`, US-1.1…US-1.5 |
| TEST-API-02 | Receipt | Only `goods_description` ⇒ `201 EXCEPTION_OPENED`; rule-satisfying entry ⇒ `201 VALIDATED_CLEAN` with `exception: null`; injected audit-writer failure leaves **zero** `cargo_entries` rows; array body, CSV body and `skip_validation` rejected; duplicate `entry_number` ⇒ `409`, nothing created; every non-empty field has a `HUMAN` origin row, absent/whitespace fields none; stopping the provider changes no receipt response | F3, F4, F5, `FR-3.3`, `FR-3.9`, US-3.1…US-3.4, US-6.2 |
| TEST-API-03 | Queue | Ordering `receipt_position ASC`, stable across requests; closed cases excluded; any query string ⇒ `400 UNSUPPORTED_QUERY_PARAMETER`; no response field exposes priority, assignee, age, or count-by-state | F7, `FR-7.1`–`FR-7.4`, US-7.1…US-7.3 |
| TEST-API-04 | Decision | `APPROVE` on an available proposal ⇒ every value `AI` and exactly one `RECOMMENDATION_APPROVED` entry; `EDIT_APPROVE` of one of three ⇒ that one `HUMAN`, others `AI`, `prior_value` on all three; reason `""`/`"   "`/`"ok"` ⇒ `422 REASON_REQUIRED`, case stays `OPEN`, no audit entry; two concurrent decisions ⇒ one `201` and one `409` with one decision and one entry; `APPROVE` on `UNAVAILABLE` ⇒ `409` while `EDIT_APPROVE` succeeds all-`HUMAN`; body containing `origin`/`decided_by`/`applied` rejected; after any decision `cargo_entries` and `validation_findings` byte-identical; `Idempotency-Key` replay ⇒ original decision, `idempotent_replay: true`, no second entry | F11, `FR-11.3`–`FR-11.11`, US-11.1…US-11.7, SM-3, SM-5 |
| TEST-API-05 | Audit read | Entries ascend by `case_sequence` with correct actors, states, reasons and per-value origins; `chain_verified` is `true`; viewing a case and signing in write no entry; no endpoint returns entries for more than one case; no `?format=`, `Accept`-variant, or download route exists | F13, F14, `FR-13.15`, `FR-13.18`, `FR-14.1`, US-14.1…US-14.7, SM-2 |
| TEST-API-06 | Errors | Every `Y2` error code reachable by at least one test; no error body contains SQL, a stack trace, provider text, or an internal invariant code | `FR-Y2.1`–`FR-Y2.6`, NFR-8 |

**`TEST-ARCH-*` — structure, dependencies, and absence (`npm run test:arch`) — Automated**

| ID | Assertion | Enforces |
|---|---|---|
| TEST-ARCH-01 | Router's route array equals the ten pairs of the endpoint inventory, exactly | `FR-Y1.1`, **C-4** |
| TEST-ARCH-02 | No route registration reads `req.query` except the rejection guard | `FR-Y1.2`, §10 #4 |
| TEST-ARCH-03 | `audit_entries`/`audit_entry_values` referenced by exactly one module | `FR-13.1`, **I-1** |
| TEST-ARCH-04 | Exactly one module writes `exceptions.state`, `decisions`, or `decision_values` | `FR-11.1`, **I-3**, SM-4 |
| TEST-ARCH-05 | `ai/*` does not import `decision.service` or any decision-writing repository | `FR-9.2`, **I-3**, `R-L6` |
| TEST-ARCH-06 | No provider SDK type outside `ai/adapter.http.ts`; no provider SDK as a dependency | `FR-Y3.1`, `R-L7`, §10 #11 |
| TEST-ARCH-07 | `BEGIN` appears only in `db/tx.ts` | `R-L2`, **I-4** |
| TEST-ARCH-08 | Dependency set equals the allowlist; none of the forbidden packages is present | PRD §10 (all), §6.2 |
| TEST-ARCH-09 | **No `.github/` directory; no CI workflow file anywhere; no accessibility runner in the build** | §10 #1, `FR-2.25` |
| TEST-ARCH-10 | Schema contains none of the 25 forbidden column names; exactly 13 application tables | §10 #2–#9, `FR-Y0.5` |
| TEST-ARCH-11 | No migration file inserts domain data | §10 #7, `FR-0.18`, `FR-Y0.4` |
| TEST-ARCH-12 | No `X-Frame-Options` header is emitted on any of the ten routes or the SPA document | **D-1**, `FR-Y3.9a` |
| TEST-ARCH-13 | Startup rejects `FRAME_ANCESTORS` of `'none'`/`'self'`, and rejects a loopback `HOST` | **D-1**, §6.5 |
| TEST-ARCH-14 | Prompt manifest digests match the template files | **A-2**, `FR-9.10` |
| TEST-ARCH-15 | Primary navigation renders exactly two items | `FR-2.7`, §10 #2 |
| TEST-ARCH-16 | No `dangerouslySetInnerHTML`; no template-literal SQL; no raw hex/px in screen styles | `FR-2.2`, `FR-Y1.6`, NFR-8 |
| TEST-ARCH-17 | Case values rendered only through `AttributedValue` | `FR-10.2`, **I-2**, NFR-4 |
| TEST-ARCH-18 *(Phase 7)* | Repo-wide scan confirms `server/src/cli/seed-demo-case.ts` is the *only* file whose name/path suggests a seed/fixture mechanism; the general `seeds/`/`fixtures/`-directory ban (TEST-ARCH-09) and no-migration-`INSERT` ban (TEST-ARCH-11) remain unmodified alongside it | `FR-15.1`, `FR-15.10`, `FR-15.11`, §3.9.1, §3.9.4 |

**`TEST-E2E-*` — Playwright, functional and keyboard-only (`npm run test:e2e`) — Automated · explicitly *not* an accessibility gate**

| ID | Scenario | Traces to |
|---|---|---|
| TEST-E2E-01 | **The full governed loop, keyboard only:** sign in → create a deliberately incomplete entry → read the receipt outcome → open the queue → open the case → read the recommendation and rationale → edit one value and enter a reason → approve → read the audit trail and see the AI-proposed value, the human-changed value, and the reason | **SM-1**, SM-11, JRN-01.5, US-6.6, US-8.2, US-12.7, US-14.7 |
| TEST-E2E-02 | **Degraded loop:** with `FakeProvider` forced to `PROVIDER_UNAVAILABLE`, the same walkthrough completes via `EDIT_APPROVE` with a full audit record | **SM-13**, NFR-9, JRN-01.6, US-9.4, US-10.6 |
| TEST-E2E-03 | **Rejection path:** reject with a reason; the case closes `REJECTED`; the trail shows declined proposals with `before_origin='AI'` and the reason verbatim | `FR-11.5`, `FR-14.5`, US-11.3, US-14.3 |
| TEST-E2E-04 | **No-auto-apply observation:** a case left open for the duration of the suite never changes state on its own | **SM-4**, **I-3**, US-11.5 |
| TEST-E2E-05 | **Focus behaviour:** navigation moves focus to `h1`; a failed submission moves focus to the error summary; summary links focus their fields | `FR-2.12`, `FR-2.15`, US-2.3, US-2.4 |
| TEST-E2E-06 | **Iframe embedding:** the app loads and completes sign-in inside an iframe, proving the **D-1** header policy works in the environment the demonstration uses | **D-1**, `FR-Y3.9a` |

**`TEST-MAN-*` — manual review and walkthrough — NOT automated, by stated policy**

| ID | Review | Method | Traces to |
|---|---|---|---|
| TEST-MAN-01 | **Sign-in screen** — Section 508 / WCAG 2.1 AA sign-off | 18-point checklist incl. **assistive-technology walkthrough** of the primary task; signed record at `docs/a11y/sign-in.md` | `FR-2.26`, `FR-1.20`, NFR-2, US-2.6, US-1.1, **SM-10** |
| TEST-MAN-02 | **Cargo entry form** — 508 / AA sign-off | as above; `docs/a11y/entry-form.md` | `FR-6.18`, NFR-2, US-2.6, US-6.6, **SM-10** |
| TEST-MAN-03 | **Review queue** — 508 / AA sign-off | as above; `docs/a11y/queue.md` | `FR-8.16`, NFR-2, US-2.6, US-8.2, **SM-10** |
| TEST-MAN-04 | **Exception case detail** — 508 / AA sign-off, incl. provenance distinguishable via screen reader and with colour off | as above; `docs/a11y/case-detail.md` | `FR-10.18`, `FR-2.17`, NFR-2, NFR-4, US-2.5, US-10.8, **SM-10** |
| TEST-MAN-05 | **Decision region** — 508 / AA sign-off | as above; `docs/a11y/decision.md` | `FR-12.18`, NFR-2, US-2.6, US-12.7, **SM-10** |
| TEST-MAN-06 | **Audit trail region** — 508 / AA sign-off | as above; `docs/a11y/audit-trail.md` | `FR-14.19`, NFR-2, US-2.6, US-14.7, **SM-10** |
| TEST-MAN-07 | **AI rationale intelligibility** — reviewing specialists judge each sampled rationale plain-language and decision-useful | Walkthrough review; human judgement, explicitly not automatable | `FR-9.9`, US-9.3, **SM-9** |
| TEST-MAN-08 | **USWDS conformance register** — every interactive control mapped to a USWDS component or a documented conformant composition | Design review against `docs/uswds-conformance-register.md` | `FR-2.1`, NFR-1, US-2.1, US-2.6, **SM-12** |
| TEST-MAN-09 | **Scope review against PRD §10** — shipped feature set checked line by line against the eleven exclusions | R3 acceptance gate review, supported by the whole `test:arch` suite | PRD §10, JTBD-03.4, **SM-14** |
| TEST-MAN-10 *(Phase 7)* | **Seed script operator walkthrough** — run twice/concurrently with no duplicate writes; stage-resumable partial-seed run; `EDIT_APPROVE` decision with at least one `HUMAN`- and one `AI`-origin resolution value; `chain_verified: true`; F6 manual entry unaffected | R4 acceptance gate review; automated suites deliberately never invoke this script (TechArch §8.9) | `FR-15.1`–`FR-15.11`, US-15.1…US-15.5, §3.9.1 |
| TEST-MAN-11 *(Phase 7)* | **Deployment configuration review** — demonstration/production `AI_PROVIDER_URL`/`AI_API_KEY`/`AI_MODEL_ID` resolve to a real HTTPS LLM endpoint, not `fake:deterministic`; the fake provider confirmed present only in automated test configuration | R4 acceptance gate review; configuration inspection, not a code test | `FR-9.20`, US-9.6, §3.9.2 |

### 7.2 Coverage Matrix by Feature

| Feature | Stories | FRD Requirements | FRD Acceptance Criteria | Automated Test Cases | Manual Test Cases | Coverage |
|---|---|---|---|---|---|---|
| **F0** Data model & audit store | 5 | 18 (+5 `Y0`) | 7 | 21 (TEST-DB-01…18, TEST-UNIT-04, TEST-ARCH-10, 11) | — | **100%** |
| **F1** Authentication & session | 5 | 21 | 8 | 3 (TEST-API-01, TEST-UNIT-07, TEST-E2E-01) | 1 (TEST-MAN-01) | **100%** |
| **F2** USWDS shell & accessibility | 6 | 26 | 9 | 4 (TEST-ARCH-09, 15, 16, TEST-E2E-05) | 7 (TEST-MAN-01…06, 08) | **100%** |
| **F3** Manual entry creation | 4 | 16 | 8 | 3 (TEST-API-02, TEST-DB-16, TEST-ARCH-01) | — | **100%** |
| **F4** Required-information validation | 4 | 15 (+31 `RIV-*`) | 10 | 3 (TEST-UNIT-01, 02, 03) | — | **100%** |
| **F5** Exception creation | 4 | 15 | 8 | 3 (TEST-DB-08, 18, TEST-API-02) | — | **100%** |
| **F6** Cargo entry web UI | 6 | 19 | 8 | 3 (TEST-API-02, TEST-E2E-01, 05) | 1 (TEST-MAN-02) | **100%** |
| **F7** Review queue (API) | 5 | 14 (+7 `Y1`) | 8 | 3 (TEST-API-03, TEST-ARCH-01, 02) | — | **100%** |
| **F8** Review queue web UI | 6 | 16 | 8 | 2 (TEST-ARCH-15, TEST-E2E-01) | 1 (TEST-MAN-03) | **100%** |
| **F9** AI recommendation generation | 5 | 19 (+14 `Y3`) | 8 | 7 (TEST-UNIT-06, TEST-DB-07, 17, TEST-ARCH-05, 06, 14, TEST-E2E-02) | 1 (TEST-MAN-07) | **100%** |
| **F10** Case detail & recommendation UI | 8 | 18 | 9 | 2 (TEST-ARCH-17, TEST-E2E-02) | 1 (TEST-MAN-04) | **100%** |
| **F11** Human decision processing | 7 | 21 | 10 | 7 (TEST-API-04, TEST-UNIT-05, TEST-DB-04, 05, 09, 10, TEST-ARCH-04) | — | **100%** |
| **F12** Decision web UI | 7 | 18 | 9 | 3 (TEST-E2E-01, 03, 05) | 1 (TEST-MAN-05) | **100%** |
| **F13** Audit entry writer | 5 | 18 | 8 | 10 (TEST-DB-01, 02, 03, 05, 06, 07, 13, 14, TEST-ARCH-03, TEST-API-05) | — | **100%** |
| **F14** Audit trail web UI | 7 | 19 | 9 | 4 (TEST-API-05, TEST-DB-15, TEST-E2E-01, 03) | 1 (TEST-MAN-06) | **100%** |
| **F15** *(Phase 7)* Seeded demonstration case | 5 | 11 | 8 | 2, reused (TEST-ARCH-09, 11) + 1 new (TEST-ARCH-18) | 1 new (TEST-MAN-10) | **100%** |
| **Cross-feature** | — | 32 (`Y0`–`Y3`) | — | TEST-API-06, TEST-ARCH-07, 08, 12, 13, TEST-E2E-06 | TEST-MAN-09 | **100%** |
| **Total** | **84** | **305** | **127** | **7 unit + 18 db + 6 api + 17 arch + 6 e2e = 54** | **9** | **100%** |
| **Phase 7 addendum** *(not folded into Total above; additive)* | **+7** (US-2.7, US-9.6, US-15.1…15.5) | **+11** F15 (`FR-15.1`–`15.11`) **+1** F9 (`FR-9.20`) = **+12** | **+8** (F15 AC) | **+1 new** (TEST-ARCH-18) **+2 reused** (TEST-ARCH-09, 11) | **+3 new** (TEST-MAN-10, 11) + **F2's TEST-MAN-01…06 requiring re-sign-off** | **100%** |

### 7.3 Automated vs Manual Verification — Stated Policy

| Verification class | Suite | Cases | Gate | Notes |
|---|---|---|---|---|
| **Automated — unit** | `npm run test:unit` | 7 | Run constantly; blocks release | Pure logic, no I/O |
| **Automated — database invariants** | `npm run test:db` | 18 | Blocks release; also run against the deployed database at step 4 of the deployment sequence | The governance suite. Connects as `cargoexec_app`, `cargoexec_ai` **and** `cargoexec_owner`, because several assertions are specifically about what the owner also cannot do |
| **Automated — API** | `npm run test:api` | 6 groups | Blocks release | Supertest against the app + real Postgres |
| **Automated — architecture / absence** | `npm run test:arch` | 17 | Blocks release; **is** the SM-14 mechanism | Asserts absences, not just behaviour — unusual and deliberate |
| **Automated — end to end** | `npm run test:e2e` | 6 | Blocks release | Playwright, functional and keyboard-only. **Explicitly not an accessibility conformance gate — it asserts no WCAG rule** |
| **Manual — Section 508 / WCAG 2.1 AA per-screen sign-off** | Human review, 18-point checklist incl. AT walkthrough | 6 (one per screen/region) | **Blocks delivery of the screen.** A screen without a signed record at `docs/a11y/{screen}.md` is not delivered | This is the enforcement mechanism, not a supplement to one |
| **Manual — rationale intelligibility** | Walkthrough review | 1 | R1 walkthrough gate | SM-9 is a human judgement and is not automatable |
| **Manual — USWDS conformance register** | Design review | 1 | R3 gate | SM-12 |
| **Manual — scope review against PRD §10** | Line-by-line review | 1 | R3 gate | SM-14, supported by `test:arch` |

### 7.4 Accessibility Verification Policy — Recorded as Policy, Not as a Gap

**There is deliberately no CI accessibility gate in v1. This is a recorded decision, not an oversight, and it is not a coverage gap in this matrix.**

- **Declared at source:** `.planning/PROJECT.md` "Out of Scope" — *"the UI must meet 508 / WCAG 2.1 AA, but v1 adds no automated accessibility gate, no axe-core CI workflow, and no `.github/workflows` file"*; and Constraints — *"enforced by design and review, not by CI in v1"*.
- **Carried forward unchanged:** PRD §10 #1 and NFR-2 (*"Met by design and manual review — including an assistive-technology walkthrough of each screen — and explicitly NOT by an automated CI gate in v1"*); FRD `FR-2.25`; TechArch §7.8.
- **The requirement itself is undiminished.** NFR-2 stands in full, and SM-10 targets **zero** WCAG 2.1 AA violations with **100%** of screens reviewed and signed off. What is deferred is the *automation of the gate*, not the *conformance*.
- **The substitute mechanism is mandatory, not advisory** (PRD R-3). `FR-2.26` and TechArch §7.7 require a signed per-screen record at `docs/a11y/{screen}.md` naming reviewer, date, screen, defects and their resolution, against an 18-point checklist that ends with an **assistive-technology walkthrough of the screen's primary task**. Because there is no automated gate, the burden shifts onto review, which is therefore mandatory rather than optional.
- **The absence is itself tested.** TEST-ARCH-09 fails the build if a `.github/` directory, any CI workflow file, or an accessibility runner appears; TEST-ARCH-08 fails if `axe-core`, `@axe-core/*`, `jest-axe`, `pa11y`, or `lighthouse-ci` becomes a dependency. As TechArch §7.8 puts it, *"we added a quick axe check in CI" fails the build it was meant to join*. US-2.6 asserts the same absence as testable behaviour.
- **Where automation does touch accessibility, its scope is bounded and stated.** TEST-E2E-01 and TEST-E2E-05 exercise keyboard operability and focus behaviour — a **functional** test of SM-11 task completability. They assert no WCAG rule and must not be represented as conformance evidence.

**Coverage verdict for accessibility:** covered at **100%** of screens by TEST-MAN-01…06, with the verification method recorded as manual by policy. No row in §7.2 is marked as a gap on this basis.

---

## 8. Change Management

### 8.1 Change Log

| Version | Date | Author | Change | Affected traces |
|---|---|---|---|---|
| 1.0 | 2026-09-11 | Pivota Spec Framework — RTM Generator | Initial baseline. Traces 11 PROJECT.md Active requirements, 7 constraints, 7 key decisions and 11 exclusions through F0–F14, NFR-1–12, SM-1–14, 305 FRD requirements, 31 `RIV-*` rules, 13 tables, 10 endpoints, 8 audit actions, TechArch D-1–D-3 / A-1–A-2 / C-1–C-4 and the four structural-guarantee layers, 84 user stories, and 63 test cases across six suites | All |
| 1.1 | 2026-09-16 | Pivota Spec RTM Generator (Phase 7 update) | **Additive update for Phase 7** ("Redesign UI, seeded demo data, and real LLM integration" / Release R4). Adds: new feature **F15** (Category G, `FR-15.1`–`FR-15.11`, US-15.1–US-15.5) reversing PRD §10 #7; new requirement **`FR-9.20`** on existing feature F9 (US-9.6, deployment posture only, NFR-9 explicitly unaffected); Phase 7 superseding note on existing feature F2's 26 USWDS-named `FR-2.x` rules (new US-2.7, NFR-2 unaffected); new test IDs `TEST-ARCH-18`, `TEST-MAN-10`, `TEST-MAN-11`; new Release **R4** row in §3.8; new §3.9 Phase 7 Traceability Addendum. **No existing row in this document was removed, renumbered, or edited** — see §3.9 for the complete addendum and §3.9.4 for how the pre-existing §6 exclusion row is treated. | New: §3.9 (all); Extended (rows added only): §1 header, §2, §3.1, §3.8, §4.1 (F2), §4.4 (F9), §4.7 (new), §7.1, §7.2, §8.1, §9.1 |

**Upstream corrections already reconciled into this baseline** (TechArch §0.4 register status): the FRD was corrected in place so that each resolution is met where the error was. `FR-Y3.9` no longer requires `X-Frame-Options` and new `FR-Y3.9a` forbids it (**D-1**); `FR-1.3` defines two cookie profiles with `governed`/`Lax` as default (**D-2**); F3's receipt process now validates the canonical record and inserts `cargo_entries` once with its final `receipt_outcome` (**D-3**); `Y0` §Roles permits the third connection role `cargoexec_ai` (**A-1**); F13 and `FR-9.11` state that `failure_reason` lives on `recommendations` (**C-1**); F4 declares `primary_field` for `RIV-070`/`RIV-073` (**C-2**); F3 §Validation cites `RIV-101`, `RIV-121`, `RIV-130`/`RIV-131`, `RIV-041` (**C-3**); `Y1` §0 says ten endpoints (**C-4**). **No register entry is now in conflict with FRD text.**

### 8.2 Change Control Procedure

| Change type | Required updates | Approval |
|---|---|---|
| **New or changed PROJECT.md Active requirement** | PROJECT.md → PRD §5/§12 → FRD feature chunk → TechArch §9.1 → UserStories epic → this RTM §3.1, §3.3, §4, §7.2 | Product Owner + Technical Lead |
| **New or changed PRD feature** | PRD §5, §9, §11 → FRD chunk with `FR-*` ids → TechArch component + traceability matrix → new `US-*` stories → RTM §3.1, §4, §7.2 | Product Owner |
| **New or changed FRD requirement** | FRD chunk → acceptance criteria → affected `US-*` acceptance criteria → test case(s) → RTM §3.1, §4, §7.1 | Technical Lead |
| **New or changed `RIV-*` rule** | FRD F04 rule table + `rule_set_version` bump → registry data change (no other module touched, by design) → TEST-UNIT-01/03 → RTM §4.2 | Technical Lead + CBP subject-matter input (the rule set is a carried `[ASSUMPTION]`) |
| **New endpoint or table** | Requires an authorising feature in §3.2 first. FRD `Y0`/`Y1` → TechArch §2/§3 → **TEST-ARCH-01 and TEST-ARCH-10 must be updated deliberately** → RTM §3.2 | Technical Lead + Architecture review — the pinned route array and forbidden-column list make this intentional friction |
| **Change to a structural invariant (I-1 … I-4)** | Treated as a change to the product's core value. Requires PROJECT.md key-decision update, PRD NFR update, FRD requirement update, TechArch §1.4 layer update, story update, and new proving tests → RTM §5 | **Product Owner + Technical Lead + Compliance/Accessibility Lead jointly.** No single-role approval |
| **Adding anything on the PRD §10 exclusion list** | Requires removing the exclusion from PROJECT.md and PRD §10 first, then updating the absence-assertion story and the architecture test that currently forbids it → RTM §6 | **Product Owner + Delivery Sponsor.** SM-14 is a stated success metric; a scope re-entry is a metric-affecting decision |
| **Adding a CI accessibility gate** | Would reverse PROJECT.md's recorded decision and PRD §10 #1; requires updating `FR-2.25`, TechArch §7.8, US-2.6 and TEST-ARCH-09 before any workflow file may exist → RTM §7.4 | **Product Owner + Compliance/Accessibility Lead.** Note the manual review gate (`FR-2.26`) remains mandatory regardless |

### 8.3 Traceability Maintenance Rules

1. **No orphan artefacts.** Every endpoint, table, column, route, module, and dependency must appear in §3.2 with an authorising feature. An artefact that cannot be traced up is scope leakage and is removed, not documented.
2. **No unmapped requirements.** Every PROJECT.md Active requirement must appear in §3.3 with at least one feature, FRD requirement, TechArch mechanism, and story. §3.3 is checked at every release gate.
3. **Absence is traced like presence.** Every item on the PRD §10 list must retain a row in §6 naming the story and/or architecture test that asserts it. Removing such a test requires the change-control path in §8.2.
4. **Invariants are traced vertically.** Each of I-1 … I-4 must retain every enforcement layer listed in §5. Removing a layer is a core-value change, not a refactor.
5. **Verification method is declared.** Every test case in §7.1 carries an explicit automated/manual designation. A manual designation is a policy statement requiring the named substitute mechanism, never an unfilled gap.
6. **The RTM is regenerated, not patched, on any upstream baseline change**, so identifiers can never drift from their sources.

---

## 9. Approval

This Requirements Traceability Matrix is submitted for review and sign-off. Approval confirms that the traceability represented here is complete and accurate against the baselined specification set, that all 11 Active requirements are mapped, that all 15 features are traced forward and backward, that the four structural invariants are enforced and proven, that all 11 exclusions carry an absence assertion, and that the accessibility verification policy of §7.4 — manual per-screen sign-off with no CI gate in v1 — is understood and accepted as a deliberate decision rather than a coverage gap.

### 9.1 Review Record

| Review item | Result | Reference |
|---|---|---|
| All 11 PROJECT.md Active requirements traced to ≥1 PRD feature | ✅ 11 of 11 | §3.3 |
| All 15 PRD features traced forward to FRD, TechArch, stories and tests | ✅ 15 of 15 | §3.1 |
| All constructed artefacts traced backward to an authorising feature | ✅ 10 endpoints, 13 tables, 8 audit actions, 4 routes, 3 DB roles | §3.2 |
| All 12 NFRs traced to an architectural mechanism | ✅ 12 of 12 | §3.4 |
| All 14 success metrics traced to a named test or review | ✅ 14 of 14 | §3.7 |
| All 84 user stories traced to a feature | ✅ 84 of 84 (77 P0 / 7 P1) | §3.1, §4 |
| Four structural invariants traced requirement → enforcement → test | ✅ I-1, I-2, I-3, I-4 | §5 |
| All 11 exclusions traced to an absence assertion | ✅ 11 of 11, plus 7 additional absence assertions | §6 |
| Test coverage across all features | ✅ 100%; 54 automated + 9 manual test cases | §7.2 |
| Accessibility verification policy recorded (no CI gate, manual sign-off mandatory) | ✅ Recorded as stated policy | §7.4 |
| Unmapped requirements, orphan artefacts, or empty traceability cells | ✅ **None** | — |
| **Phase 7 addendum:** F15 (new feature) traced forward/backward; F9 `FR-9.20` and F2 superseding note traced as revisions to existing features; R4/Phase 7 mapped; NFR-1 touchpoint recorded, NFR-9 explicitly confirmed unaffected; no existing row altered | ✅ Traced | §3.9 |

### 9.2 Sign-Off

| Role | Name | Responsibility in this RTM | Signature | Date |
|---|---|---|---|---|
| **Product Owner** | ________________________ | Confirms §3.3 Active-requirement coverage is complete and §6 exclusions remain the intended boundary | ________________________ | ____________ |
| **Technical Lead** | ________________________ | Confirms §3.2 backward trace has no orphan artefacts and §5 invariant enforcement layers are implemented as traced | ________________________ | ____________ |
| **Compliance / Accessibility Lead** | ________________________ | Confirms §7.4 policy is accepted and that TEST-MAN-01…06 signed records exist for all six screens (SM-10, SM-11, SM-12) | ________________________ | ____________ |
| **Quality Assurance Lead** | ________________________ | Confirms §7.1 test inventory is executable and §7.2 coverage is achieved, with automated/manual designations accurate | ________________________ | ____________ |
| **Governance / Audit Reviewer** *(advisory — not a system role, PRD §2.2)* | ________________________ | Confirms I-1 … I-4 satisfy oversight expectations and that SM-2, SM-3, SM-4, SM-6, SM-7 evidence is sufficient | ________________________ | ____________ |
| **Delivery Sponsor** | ________________________ | Confirms SM-1 loop completeness and SM-14 scope discipline are evidenced, and authorises the R1/R2/R3 release sequence | ________________________ | ____________ |

---

*Document generated by Pivota Spec Framework — RTM Generator*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11)*
*Upstream: `project_specs/PRD-CargoExec.md`, `project_specs/FRD-CargoExec.md`, `project_specs/TechArch-CargoExec.md`, `project_specs/UserStories-CargoExec.md`*
*Last updated: 2026-09-11*
