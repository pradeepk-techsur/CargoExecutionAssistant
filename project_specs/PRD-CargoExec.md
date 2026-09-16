# Product Requirements Document (PRD)
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.1 |
| **Date** | 2026-09-11 (Phase 7 update: 2026-09-16) |
| **Author** | Pivota Spec Framework — PRD Generator |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | FRD-CargoExec, TechArch-CargoExec, UserStories-CargoExec |
| **Revision Note** | Updated for Phase 7 (redesign UI, seeded demo data, real LLM integration) — see §4.1, §4.2, §5.1 F2, §5.4 F9, §5.7 F15, §8 R-9, §10 #7, §11 |

---

## 1. Executive Summary

CargoExec is a web application for U.S. Customs and Border Protection (CBP) cargo specialists that manages the resolution of cargo entry exceptions under explicit human accountability. A cargo specialist signs in, enters a cargo entry by hand, and the system validates it against required-information rules at the moment of receipt. Entries that fail validation become exceptions and appear in a single review queue ordered by receipt. The specialist opens an exception, reads an AI-generated recommended resolution action alongside a plain-language rationale for that recommendation, and then edits, approves, or rejects it. Nothing the AI produces is ever applied on its own.

Every state change writes an append-only audit entry capturing who acted, what changed, when it happened, the before and after values, and whether each value originated with the AI or with the human. That audit trail is viewable per case directly in the application, without export tooling or a separate oversight system. Rejections and edits require a reason, so the record explains its own decisions rather than merely recording that a decision occurred.

CargoExec exists to demonstrate that CBP can rapidly build **governed** applications. Breadth of features is deliberately and explicitly subordinate to one goal: making the governed decision loop — **receive → validate → except → recommend → human decide → audit** — complete and provable end to end. The scope is intentionally narrow (one authenticated role, manual entry only, one unordered-except-by-receipt queue) precisely so the loop can be finished and proven rather than partially demonstrated across a wider surface.

**Key Capabilities:**
- Manual cargo entry creation through a USWDS-compliant web interface
- Required-information validation applied on receipt, producing exceptions as the failure outcome
- A single review queue of open exceptions in receipt order, openable case by case
- AI-generated resolution recommendations with plain-language rationale, clearly marked as AI-originated
- Human edit / approve / reject on every recommendation, with mandatory reason capture on edits and rejections
- Append-only audit trail per case, viewable in the UI, recording who, what, when, before/after, and AI-vs-human provenance
- Authentication as a cargo specialist — exactly one role

### 1.1 Core Value

A cargo exception is never resolved without an accountable human decision, and every decision — what was recommended, what was chosen, by whom, and when — is permanently traceable.

---

## 2. Problem Statement

Cargo exception handling inside a federal agency is a decision-accountability problem before it is an efficiency problem. When an entry is incomplete or inconsistent, someone has to decide what to do about it, and that decision must survive later scrutiny. Introducing AI assistance into that workflow sharpens the problem rather than solving it: an AI that resolves exceptions on its own removes exactly the accountable human decision that oversight depends on, and an AI whose suggestions are indistinguishable from human entries makes the record unreadable after the fact.

At the same time, CBP faces a delivery-capability question that is separate from any single workflow: can governed applications — accessible, auditable, human-in-the-loop by construction — be built quickly enough to be worth building at all? A partially-finished broad application answers that question with a "no". A narrow application whose governance loop is demonstrably complete answers it with a "yes".

### 2.1 Current Pain Points

1. **Exceptions surface without an accountable decision record**: Incomplete entries get fixed, but the record shows the corrected state rather than who chose the correction, what alternative was recommended, and why that choice was made. "Who decided this?" is answerable only by memory or by reconstruction from side channels.
2. **AI assistance threatens the accountability it is meant to support**: Where AI output is applied automatically, or is merged into the record without provenance, the human's role becomes unprovable. Oversight cannot distinguish a value the machine proposed from a value a specialist deliberately chose.
3. **Decisions do not explain themselves**: A rejection or a modification with no captured reason forces later reviewers to infer intent. The record states an outcome but not its justification, so it cannot answer questions raised months later.
4. **Audit history is mutable and scattered**: A case history that can be edited after the fact cannot support oversight, and history that needs external tooling to read is not available at the moment a specialist or reviewer actually needs it.
5. **Exception handling gets modelled as a parallel data-entry path**: Where exceptions are created independently of validation, the link between "what rule was not satisfied" and "why this case is open" is lost, and the loop from receipt to resolution has a gap in it.
6. **Governed delivery is asserted rather than demonstrated**: Accessibility, auditability, and human-in-the-loop control are described as intentions in documents rather than shown working in a running application a stakeholder can operate.

### 2.2 Target Users

| Persona | Description |
|---------|-------------|
| **Cargo Specialist** (the only system role) | CBP staff who create cargo entries manually, work the resulting exception queue, read AI recommendations and their rationale, and edit / approve / reject each one. They are authenticated, they take the accountable decision, and they read the per-case audit trail in the UI. Every authenticated user of CargoExec v1 is this role. |

**Stakeholders who are explicitly NOT system roles in v1:**

| Stakeholder | Relationship to the product |
|-------------|-----------------------------|
| **CBP oversight / audit reviewer** | The audience the audit trail is designed to satisfy, but **not** a user account. v1 has no auditor or read-only role and no audit export; oversight questions are answered by viewing the per-case trail in the UI. See §10. |
| **Supervisor / branch chief** | Has no view, dashboard, metric, or reassignment capability in v1. There is no supervisory surface at all. See §10. |
| **CBP delivery leadership** | The audience for the demonstration itself — they judge whether the governed loop is complete and provable. Not a user of the application. |

### 2.3 Context and Baseline Assumptions

These are conditions of the product, not features to be negotiated or traded away:

- **Users are federal agency staff.** Section 508 / WCAG 2.1 AA accessibility is baseline, not an enhancement, regardless of which visual design system delivers it — USWDS was the mechanism for that conformance through Phase 6; Phase 7 replaces the visual system while holding the accessibility bar fixed (§5.1 F2).
- **AI is an assistant, not a decider.** It summarises the exception and drafts a resolution; the human retains the final decision on every case.
- **Provenance must be distinguishable, not merely logged.** A reader of the record must be able to tell an AI-proposed value from a human-entered one by looking at the record itself.
- **The audit trail is the product.** It is append-only, viewable per case, and detailed enough to answer "who decided this, what did the AI say, and what did the human change" without external tooling.
- **Exceptions are the failure outcome of validation on receipt**, never a separate data-entry path.
- **The purpose is demonstration of governed delivery.** Anything that widens surface area at the cost of loop completeness is the wrong trade.

---

## 3. Product Vision

**A cargo specialist works every exception with an AI draft in front of them and an unbreakable record behind them — the AI proposes, the human decides, and the decision explains itself permanently.**

### 3.1 Strategic Goals

1. **Complete the governed decision loop, provably.** Deliver all six stages — receive → validate → except → recommend → human decide → audit — as a single unbroken path a stakeholder can walk in one sitting. A loop with five working stages is a failed v1 regardless of how polished those five are.
2. **Guarantee the accountable human decision.** Enforce human-in-the-loop structurally rather than procedurally: no code path resolves an exception without a recorded human decision, so "the AI decided this" is not a possible outcome.
3. **Make the record self-explaining.** Every resolution carries what the AI recommended, what the human chose, the reason for any edit or rejection, and per-value AI-vs-human origin — readable in the UI, in one place, by the person who needs it.
4. **Make the audit trail trustworthy by construction.** Append-only storage so that the record of a decision cannot be revised after the fact, with mutation attempts rejected rather than merely discouraged.
5. **Meet federal standards as delivered, not as promised.** Section 508 / WCAG 2.1 AA conformance in the shipped UI, achieved by design and review — a hard requirement independent of which visual design system implements it. USWDS was that mechanism through Phase 6; Phase 7 replaces the visual system under a newly-approved external design while the conformance obligation itself does not move (§5.1 F2).
6. **Hold scope discipline as a first-class goal.** One role, manual entry, one receipt-ordered queue. Every capability declined in §10 is a deliberate purchase of loop completeness.

### 3.2 What Success Looks Like

A stakeholder sits down at the running application, signs in as a cargo specialist, types in a deliberately incomplete cargo entry, watches it fail validation and land in the queue as an exception, opens it, reads the AI's recommended action and why it recommends it, changes one value and records the reason, approves the result, and then opens the audit trail and sees the whole story — including which values the AI proposed and which they changed. Nothing in that sequence required an explanation, a workaround, or a promise about a future release.

---

## 4. Technical Architecture

Indicative stack, to be confirmed and detailed in TechArch-CargoExec. Selection criteria in priority order: USWDS conformance and accessibility control over the rendered markup, ability to enforce append-only audit storage at the persistence layer, and fast delivery of a complete loop.

### 4.1 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TypeScript; semantic HTML with full keyboard and assistive-technology support. Through Phase 6, USWDS (U.S. Web Design System) supplied the visual system; **Phase 7 replaces the visual system with a newly-approved external design** while Section 508 / WCAG 2.1 AA conformance remains mandatory and unchanged (§5.1 F2) — the specific conformance mechanism (themed reuse of USWDS interactive primitives vs. an independent accessibility program) is a decision for Phase 7 planning, not this document |
| **Backend** | Node.js + TypeScript HTTP API (service layer enforcing validation, decision, and audit invariants) |
| **Database** | PostgreSQL — relational, with append-only constraints and revoked UPDATE/DELETE privileges on the audit table |
| **AI** | Hosted large-language-model API behind a provider-abstracted recommendation service (consumed only — no training, no fine-tuning). **Phase 7 makes calling a real hosted LLM in the demonstration/production environment an explicit deliverable** (§5.4 F9); the deterministic fake provider remains available for automated tests only |
| **Authentication** | Server-side session authentication for the single `cargo specialist` role |
| **Deployment** | Containerised web application (single web service + database), suitable for local demonstration and a governed hosted environment |

### 4.2 Deployment Model

| Model | Description |
|-------|-------------|
| **Single-tenant web application** | One web service, one database, one AI provider dependency. Accessed via browser by authenticated cargo specialists. Web only — no native mobile client (§10). |
| **Demonstration deployment** | Run for live walkthroughs. **As of Phase 7**, a hand-authored seed script pre-loads a demonstration case that has already progressed through the full lifecycle (entry → validation failure → exception → AI recommendation → human decision → audit trail), so every stage of the loop is visible without re-typing every stage live (§10 #7, F15). Manual entry through F6 remains fully demonstrable alongside it — the seed script is additive, not a replacement for the live entry path. |

### 4.3 Architectural Invariants

These constrain the design and are verified in the FRD's acceptance criteria:

1. **No auto-apply path exists.** Resolution state can change only through a request that carries a human decision (approve, edit-and-approve, or reject). There is no server-side or scheduled code path that applies a recommendation.
2. **Audit writes are append-only and transactional with the change they describe.** A state change and its audit entry commit together, or neither commits.
3. **Provenance is stored per value, not per record.** Each recorded resolution value carries an `AI` or `HUMAN` origin, so a mixed AI/human resolution is fully attributable.
4. **Exceptions are derived, never authored.** The only way an exception comes into being is a validation failure on receipt of an entry.
5. **The queue is a single receipt-ordered projection.** No filter, sort, assignment, or priority dimension exists in the data model or the API (§10).

---

## 5. Feature Requirements

Sixteen features across seven categories (Phase 7 adds F15). Every v1 feature traces to at least one Active requirement in `.planning/PROJECT.md`, and every Active requirement is covered by at least one feature (see §12); F15 additionally traces to the Phase 7 supersession of PROJECT.md's Out of Scope item on seeded demonstration data (§10 #7). The user-facing web interface is carried by named features of its own (F2, F6, F8, F10, F12, F14) — backend endpoints do not satisfy it.

### 5.0 Priority Convention

| Priority | Meaning in CargoExec |
|----------|----------------------|
| **P0** | Required for the governed decision loop to be complete and provable, or required by a statutory/standards constraint. Absent this, v1 fails its purpose. |
| **P1** | Required for the loop to hold up under realistic failure conditions, but the loop is demonstrable without it. |
| **P2 / P3** | **None.** A capability that would rank P2 or lower in a product this narrow was excluded outright rather than deprioritised — see §10. An unbuilt P2 backlog would misrepresent scope. |

---

### 5.1 Category A — Governance Foundation

#### F0: Case Data Model & Append-Only Audit Store
- **Surface**: Data
- **Description**: The persistence foundation for the whole product: cargo entries, validation results, exceptions, AI recommendations, human decisions, and audit entries. The audit store is append-only by construction — insert-only, with UPDATE and DELETE privileges revoked at the database level so that an attempt to revise history is rejected rather than merely absent from the application code. Each audit entry records actor identity, action, timestamp, the before and after values, and the AI-vs-human origin of each value it describes. Provenance is modelled per value rather than per record, so a resolution that mixes an AI suggestion with a human correction is fully attributable field by field.
- **Capabilities**:
  - Schema for cargo entries, exceptions, recommendations, decisions, and audit entries with their relationships
  - Append-only audit table: inserts permitted, updates and deletes rejected at the privilege level
  - Audit entry structure: actor, action, timestamp, before value, after value, per-value origin (`AI` | `HUMAN`)
  - Monotonic per-case audit ordering so the sequence of events is unambiguous
  - Tamper-evidence via per-entry sequence and prior-entry hash linkage (mechanism to be confirmed in TechArch)
  - Transactional coupling: a state change and its audit entry commit together or not at all
  - Migrations to create and evolve the schema
- **Requirement trace**: Append-only audit entries; AI-vs-human origin; audit immutability constraint
- **Dependencies**: None (foundation)
- **Priority**: **P0**

#### F1: Cargo Specialist Authentication & Session
- **Surface**: Integrations / API
- **Description**: Sign-in, session management, and sign-out for the single authenticated role, `cargo specialist`. Authentication exists here for a governance reason rather than a security-perimeter reason: the audit trail cannot attribute a decision to an actor unless that actor is identified, so every mutating request resolves to a known specialist identity that the audit writer consumes. There is exactly one role — no supervisor, no read-only or auditor role, and no role-based access separation (§10). All application routes other than sign-in require an authenticated session.
- **Capabilities**:
  - Credential-based sign-in establishing a server-side session
  - Single role: every authenticated user is a cargo specialist with identical capabilities
  - Authenticated identity available to every request handler and to the audit writer as the actor
  - Session expiry and explicit sign-out
  - Unauthenticated access to protected routes and endpoints rejected and redirected to sign-in
- **Requirement trace**: Authenticated users sign in as a cargo specialist
- **Dependencies**: F0
- **Priority**: **P0**

#### F2: USWDS Application Shell & Accessibility Foundation
- **Surface**: User-facing interface / Content & assets
- **Description**: The shared web UI foundation every screen is built on: page layout, banner and header, navigation, form and validation-message patterns, error and empty states, and focus management. This is the feature that makes Section 508 / WCAG 2.1 AA conformance a property of the delivered interface rather than an aspiration — semantic landmarks, an accessible name for every control, visible focus, complete keyboard operability, correct heading order, and screen-reader-announced status and error messaging are established once here and inherited by F6, F8, F10, F12, and F14. Conformance is achieved by design and manual review, including assistive-technology walkthrough of each screen; v1 adds no automated accessibility gate and no CI workflow (§10).

  **Phase 7 update:** the shared shell is redesigned against a newly-approved external visual design, replacing USWDS as the visual system. This preserves the conformance requirement rather than relaxing it: Section 508 / WCAG 2.1 AA conformance stays mandatory and unchanged regardless of which visual system delivers it. Whether that conformance is achieved by continuing to reuse USWDS's interactive primitives under new theming, or by an independently-built accessibility program for the new design system, is a decision deferred to Phase 7 discovery/planning — it is not resolved by this PRD update.
- **Capabilities**:
  - Component library, design tokens, typography, and asset pipeline — USWDS-based through Phase 6; **Phase 7 replaces these with the newly-approved external visual design**, with exact tokens/components captured during Phase 7 planning
  - Standard page shell: official-site banner, header, main landmark, footer, sign-out affordance
  - Accessible form patterns: label association, required-field indication, inline error text, error summary with focus movement
  - Keyboard operability across all interactive components, with a visible focus indicator
  - Status and error announcements exposed to assistive technology via live regions
  - Colour contrast, text resizing, and reduced-motion behaviour meeting WCAG 2.1 AA
  - Accessibility design-and-review checklist applied per screen (manual process, not a CI gate)
- **Requirement trace**: The UI follows USWDS and meets Section 508 / WCAG 2.1 AA (Phase 7: read as — the UI meets Section 508 / WCAG 2.1 AA regardless of visual design system; USWDS was the mechanism through Phase 6, see description above)
- **Dependencies**: None
- **Priority**: **P0** (statutory constraint for federal applications)

---

### 5.2 Category B — Cargo Entry & Validation

#### F3: Manual Cargo Entry Creation (API)
- **Surface**: Programmatic API
- **Description**: The server-side capability to receive a manually authored cargo entry, persist it, and return the outcome of its receipt. This is the single entry point into the system: the entry is created by a human typing it in, not by file upload, bulk import, or an interface to ACE/ATS (§10). Receipt is an atomic operation — the entry is persisted, validated (F4), and, if validation fails, an exception is opened (F5) within one transaction, so an entry can never exist in a state where it was received but never assessed.
- **Capabilities**:
  - Create-entry endpoint accepting the cargo entry field set from an authenticated specialist
  - Persistence of the submitted entry with its author and receipt timestamp
  - Atomic receipt: persist → validate → open exception on failure, in a single transaction
  - Receipt response reporting validated-clean versus exception-opened, with the resulting case reference
  - Retrieval of a single entry and its current state
  - Entry field values recorded with `HUMAN` origin (provenance baseline for later comparison)
- **Requirement trace**: Cargo entries can be entered manually into the system
- **Dependencies**: F0, F1, F4, F5
- **Priority**: **P0**

#### F4: Required-Information Validation on Receipt
- **Surface**: Programmatic API / Data
- **Description**: The rule evaluation that runs against every entry at the moment of receipt, checking it against the required-information rules for a cargo entry. Validation is deterministic and explanatory: it does not merely return pass or fail but names each unsatisfied rule and the field it concerns, because those findings become the substance of the exception and the input the AI reasons over. Validation runs on receipt only — it is not a separately invocable user action, and there is no path by which an entry bypasses it.
- **Capabilities**:
  - Required-information rule set for cargo entries, evaluated as a unit on receipt
  - Per-rule findings identifying the rule, the affected field, and the reason it was not satisfied
  - Deterministic outcome: the same entry always produces the same findings
  - Complete evaluation — all failures reported, not just the first
  - Validation result persisted and attached to the entry as the evidentiary basis of any exception
  - Clean-pass outcome recorded for entries that satisfy every rule
- **Requirement trace**: Each entry is validated against required-information rules on receipt
- **Dependencies**: F0
- **Priority**: **P0**

#### F5: Exception Creation from Validation Failure
- **Surface**: Programmatic API / Data
- **Description**: The derivation of an exception from a failed validation. An exception is the failure outcome of F4 and nothing else — there is no independent exception-authoring path, which is what keeps the link between "which rule was not satisfied" and "why this case is open" intact for the life of the case. Creation opens the case in `OPEN` state, stamps its receipt position for queue ordering (F7), carries the validation findings forward, and writes the opening audit entry (F13).
- **Capabilities**:
  - Exception opened automatically and only when validation fails
  - Validation findings carried onto the exception as its stated basis
  - Lifecycle states: `OPEN` → `RESOLVED` (via approve or edit-and-approve) or `REJECTED`, with no path that skips a human decision
  - Receipt-order position assigned at creation, immutable thereafter
  - Case reference usable in the UI and the audit trail
  - Opening audit entry written in the same transaction as creation
- **Requirement trace**: Entries that fail validation become exceptions and enter a review queue
- **Dependencies**: F0, F4, F13
- **Priority**: **P0**

#### F6: Cargo Entry Web UI
- **Surface**: **User-facing interface**
- **Description**: The screen a cargo specialist actually uses to create a cargo entry — a form with labelled fields, required-field indication, inline and summarised error messaging, and a submit action, built on the shared shell (F2). On submission the specialist is told plainly what happened to their entry: it either passed validation or it opened an exception, with a direct link to the resulting case. Through Phase 6, this screen was the only way to see the receive/validate/except stages, because there was no seeded dataset (§10 #7, superseded). **As of Phase 7**, a seed script (F15) additionally pre-loads a demonstration case that has already passed through the whole lifecycle — manual entry via this screen remains fully demonstrable and is not removed; the seed script exists alongside it so later-loop scenarios (recommendation, decision, audit trail) can also be shown without hand-walking every earlier stage first.
- **Capabilities**:
  - USWDS cargo entry form with accessible labels, hints, and required-field marking
  - Client-side affordances that never substitute for server-side validation (F4 is authoritative)
  - Submission outcome shown explicitly: validated clean, or exception opened with case reference and link
  - Server validation findings rendered field-by-field with an error summary that moves focus
  - Full keyboard operability and screen-reader-announced outcome messaging
  - Navigation from receipt outcome directly into the review queue or the opened case
- **Requirement trace**: Cargo entries can be entered manually; validation and exception outcomes made visible to the user
- **Dependencies**: F2, F3
- **Priority**: **P0**

---

### 5.3 Category C — Review Queue

#### F7: Review Queue (API)
- **Surface**: Programmatic API
- **Description**: The server-side projection that returns open exceptions in receipt order. It is deliberately one query with one ordering and no parameters: no filtering, no sorting, no assignment, no prioritisation (§10). A receipt-ordered list is sufficient to demonstrate queue → open → decide, and adding dimensions to it would widen the surface without deepening the loop. The endpoint returns only open exceptions, with the minimum each list row needs.
- **Capabilities**:
  - List endpoint returning open exceptions in ascending receipt order
  - Stable, deterministic ordering across repeated requests
  - Row summary: case reference, receipt timestamp, originating entry identifier, validation-failure summary
  - Closed cases (resolved or rejected) excluded from the queue
  - Single-case retrieval endpoint returning the exception with its validation findings, recommendation, decision state, and entry values
- **Requirement trace**: The queue lists open exceptions in receipt order, and a specialist can open one
- **Dependencies**: F0, F1, F5
- **Priority**: **P0**

#### F8: Review Queue Web UI
- **Surface**: **User-facing interface**
- **Description**: The screen where a specialist sees the open exceptions and chooses one to work. A single USWDS list or table in receipt order, where each row identifies the case and why it is open, and opening a row navigates to the case detail screen (F10). No filter controls, sort headers, assignment actions, or priority badges appear — their absence is the design, not an omission. An empty queue states plainly that there are no open exceptions and offers the path to create an entry.
- **Capabilities**:
  - Receipt-ordered list of open exceptions with case reference, receipt time, and failure summary
  - Row activation opening the case detail screen, operable by keyboard and pointer
  - Accessible table/list semantics with a programmatic row count
  - Empty state with a route to cargo entry creation
  - Return-to-queue navigation from a case, preserving the specialist's place in the flow
- **Requirement trace**: The queue lists open exceptions in receipt order, and a specialist can open one
- **Dependencies**: F2, F7
- **Priority**: **P0**

---

### 5.4 Category D — AI Recommendation

#### F9: AI Resolution Recommendation Generation
- **Surface**: Integrations / Background-async
- **Description**: Generation of a recommended resolution action for an exception, together with a plain-language rationale explaining why that action is recommended. The AI is consumed through a hosted model API behind a provider abstraction; there is no training or fine-tuning infrastructure (§10). The recommendation is a **draft only** — it is persisted as a proposal attached to the case with every proposed value marked `AI` in origin, and it never mutates the entry or the exception state. Generation is triggered by the exception coming into being and its result is recorded with the model identity and timestamp, so the record can later answer "what did the AI say" exactly as it was said.

  **Phase 7 update:** the architecture does not change — a provider-abstracted HTTP adapter calling an OpenAI-compatible chat/completions shape, no vendor SDK, provider swappable — this was always the stated intent. What changes is **posture**: the shipped demonstration/production environment is configured to call a real hosted LLM, rather than the deterministic fake provider that earlier default configuration pointed at. The fake provider remains available and is used strictly for automated tests. No new dependency, no training or fine-tuning is introduced.
- **Capabilities**:
  - Recommendation request built from the entry values and the validation findings
  - Recommended resolution action plus a plain-language rationale intelligible to a non-technical reader
  - Every proposed value persisted with `AI` provenance and never written into the entry of record
  - Model identity, prompt version, and generation timestamp recorded alongside the recommendation
  - Recommendation-generated audit entry written via F13
  - **Degraded mode**: if the AI provider is unavailable, slow, or returns an unusable response, the exception remains fully workable — the case shows that no recommendation is available and the specialist resolves it directly; no failure blocks the human decision path
  - Provider abstraction so the model dependency can be swapped without touching the decision or audit layers
  - **(Phase 7)** Demonstration/production configuration calls a real hosted LLM by default; the deterministic fake provider is reserved for automated test runs only
- **Requirement trace**: AI generates a recommended resolution action for each exception, with a plain-language rationale
- **Dependencies**: F0, F5, F13
- **Priority**: **P0**

#### F10: Exception Case Detail & Recommendation Presentation UI
- **Surface**: **User-facing interface**
- **Description**: The screen where the specialist does the work: the case in full — the submitted entry values, the validation findings that opened the exception, and the AI's recommended action with its plain-language rationale. The AI's contribution is visually and programmatically marked as AI-originated wherever it appears, so a reader can tell a machine proposal from a human value on sight and via assistive technology, not only by consulting the audit trail. The screen presents the recommendation as a proposal awaiting a decision and never as an applied outcome, and it hosts the decision controls (F12) and the audit trail view (F14).
- **Capabilities**:
  - Case header with reference, receipt time, and current state
  - Submitted entry values and the validation findings that caused the exception
  - AI recommended action and plain-language rationale, presented as an un-applied proposal
  - Explicit AI-origin marking on every AI-proposed value, conveyed both visually and to assistive technology (not colour alone)
  - Clear "no recommendation available" presentation when F9 degraded mode applies, with the decision path unaffected
  - Accessible heading structure and reading order across entry, findings, recommendation, decision, and audit sections
  - Closed-case read-only presentation showing the recorded decision
- **Requirement trace**: AI recommendation and rationale presented to the specialist; provenance distinguishable in the record
- **Dependencies**: F2, F7, F9
- **Priority**: **P0**

---

### 5.5 Category E — Human Decision

#### F11: Human Decision Processing — Edit / Approve / Reject (API)
- **Surface**: Programmatic API
- **Description**: The server-side enforcement of the accountable human decision. An exception's resolution state changes only through this capability, and only when the request carries an explicit decision from an authenticated specialist: **approve** the recommendation as proposed, **edit** it and approve the modified resolution, or **reject** it. Edits and rejections require a non-empty reason, which is stored as part of the decision so the record explains itself. Values the specialist changes are recorded with `HUMAN` origin while untouched approved values retain `AI` origin, which is what makes "what did the human change" answerable per value. There is no auto-apply path and no scheduled or system actor that can resolve a case.
- **Capabilities**:
  - Approve: adopt the recommendation as proposed, recording the approving specialist
  - Edit-and-approve: adopt a specialist-modified resolution, with changed values re-stamped `HUMAN` and unchanged values retaining `AI` origin
  - Reject: close the case without adopting the recommendation
  - Mandatory reason on edit and on reject — non-empty and at least 10 characters after trimming — rejected at the API boundary when absent or too short, and enforced as a storage constraint as well
  - Structural refusal of any state transition lacking an authenticated human decision
  - Decision recorded with actor, timestamp, decision type, reason, resolved values, and per-value provenance
  - Idempotency and conflict handling so a case cannot be decided twice or concurrently
  - Decision audit entry written in the same transaction via F13
- **Requirement trace**: Specialist can edit, approve, or reject — no recommendation auto-applies; rejections and edits capture a reason
- **Dependencies**: F0, F1, F9, F13
- **Priority**: **P0**

#### F12: Decision Web UI — Edit, Approve, Reject with Reason Capture
- **Surface**: **User-facing interface**
- **Description**: The controls through which the specialist takes the decision: approve, edit, or reject, presented as three deliberate and equally available actions with no pre-selected default that would nudge the human toward rubber-stamping the AI. Choosing edit opens the recommended values in an editable USWDS form with a required reason field; choosing reject requires a reason before the action can complete. The screen shows what will be recorded before it is recorded, and confirms afterwards what was recorded, including which values the specialist changed.
- **Capabilities**:
  - Approve, Edit, and Reject actions presented without a default or pre-selected choice
  - Editable resolution form pre-populated with the AI-proposed values, with changed fields visibly marked as specialist-modified
  - Required reason input for edit and for reject (minimum 10 characters after trimming), with accessible required-field indication and error messaging when omitted or too short
  - Pre-submission summary of what will be recorded, and post-decision confirmation of what was recorded
  - Decision controls unavailable on closed cases, with the recorded decision shown read-only instead
  - Full keyboard operability of the entire decision path, with outcomes announced to assistive technology
  - Server-side rejection of a missing reason surfaced as an inline, focus-managed error
- **Requirement trace**: Specialist can edit, approve, or reject; rejections and edits capture a reason
- **Dependencies**: F2, F10, F11
- **Priority**: **P0**

---

### 5.6 Category F — Audit Trail

#### F13: Audit Entry Writer — Append-Only on Every State Change
- **Surface**: Programmatic API / Data
- **Description**: The single chokepoint through which all history is written. Every state change in the system — entry received, validation completed, exception opened, recommendation generated, recommendation approved, recommendation edited and approved, recommendation rejected — writes exactly one append-only audit entry recording who acted, what action occurred, when, the before and after values, and the AI-vs-human origin of each value involved. The writer is invoked inside the same transaction as the change it describes, so an unaudited state change is not a possible outcome, and it offers no update or delete operation at all.
- **Capabilities**:
  - One audit entry per state change, written transactionally with that change
  - Recorded fields: actor identity (or `AI` for machine-originated proposals), action type, timestamp, before value, after value, per-value origin
  - Reason text carried onto the audit entry for edit and reject decisions
  - Insert-only interface — no update or delete operation is exposed or implemented
  - Coverage of the full state-change set, verified by test as 1:1 with transitions
  - Monotonic per-case sequencing establishing unambiguous event order
  - Mutation attempts against stored entries rejected at the persistence layer
- **Requirement trace**: Every state change writes an append-only audit entry: who, what, when, before/after, and AI-vs-human origin
- **Dependencies**: F0
- **Priority**: **P0**

#### F14: Per-Case Audit Trail Web UI
- **Surface**: **User-facing interface**
- **Description**: The screen — presented within the case — where the specialist reads the complete history of a case in chronological order and gets a direct answer to "who decided this, what did the AI say, and what did the human change" without leaving the application. Each event shows its actor, action, timestamp, before and after values, the reason where one was captured, and an unmistakable AI-versus-human origin marker. It is read-only by construction: the UI exposes no editing, correcting, or deleting affordance, and no export (§10) — the trail is answered in place, which is the point.
- **Capabilities**:
  - Chronological per-case event list with actor, action, timestamp, before/after values
  - AI-versus-human origin shown per event and per changed value, conveyed beyond colour alone
  - Reason text displayed for edits and rejections
  - Read-only presentation with no edit, correct, or delete affordance anywhere
  - Accessible list/table semantics and reading order for screen-reader traversal of the history
  - Reachable from the exception case detail screen for both open and closed cases
- **Requirement trace**: The audit trail is viewable per case in the UI
- **Dependencies**: F2, F10, F13
- **Priority**: **P0**

---

### 5.7 Category G — Demonstration Enablement (Phase 7)

#### F15: Seeded Demonstration Case
- **Surface**: Data / Operational tooling
- **Description**: A hand-authored seed script that pre-loads the database with a demonstration cargo case that has already progressed through the full governed loop — entry → validation failure → exception → AI recommendation → human decision → audit trail — so that every stage of the user journey, including the later ones, can be shown without re-typing the earlier ones live every time. This **reverses** the v1.0 decision recorded at §10 #7, which excluded any seeded dataset so that receive and validate stayed part of the demonstrated path rather than a pre-staged precondition. Phase 7's reasoning: that trade-off made sense while the loop was still being proven stage by stage, but it makes every walkthrough of a later stage (recommendation, decision, audit) pay the full cost of hand-typing an entry and its validation failure first, which is what a repeatable demonstration of every scenario cannot afford. The reversal is strictly **additive** — the manual entry path (F6) is not removed, is not deprecated, and remains fully demonstrable on its own; the seed script exists alongside it.
- **Capabilities**:
  - Idempotent seed script runnable against a freshly-migrated database, producing one demonstration case carried through every loop stage (entry, validation failure, exception, AI recommendation, human decision, audit trail)
  - Seeded values carry the same `AI` / `HUMAN` per-value provenance rules as any other case (F0, NFR-4) — the seed script is a data-loading mechanism, not a bypass of governance invariants
  - Seeded audit entries are written through the same append-only writer as any other case (F13); no seed-specific write path exists
  - Manual entry through F6 remains available and unaffected — the seed script does not replace, gate, or short-circuit the live entry path
  - Seed data is clearly a demonstration fixture (not represented as organic production history) in any documentation or README describing its use
- **Requirement trace**: Supersedes PROJECT.md Out of Scope — "Seeded demonstration dataset" (§10 #7); enables repeatable demonstration of every loop stage
- **Dependencies**: F0, F3, F4, F5, F9, F11, F13
- **Priority**: **P0**

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| **NFR-1** | **Design system conformance** | Through Phase 6, the UI conformed to USWDS: every interactive component was a USWDS component or a documented USWDS-conformant composition, with USWDS design tokens governing typography, spacing, and colour, verified by per-screen design review against a USWDS checklist. **Phase 7 replaces the visual design system** with a newly-approved external design; the specific components/tokens and the per-screen conformance-review mechanism for the new system are defined during Phase 7 planning. The conformance obligation itself does not lessen — see NFR-2. |
| **NFR-2** | **Accessibility (Section 508 / WCAG 2.1 AA)** | Every screen meets WCAG 2.1 AA: full keyboard operability, visible focus, correct semantic structure and heading order, accessible names on all controls, AA colour contrast, programmatic label/error association, and status messages exposed to assistive technology. **Met by design and manual review — including an assistive-technology walkthrough of each screen — and explicitly NOT by an automated CI gate in v1** (see §10). Information conveying AI-vs-human origin is never carried by colour alone. **This requirement is independent of the visual design system in use** — it held under USWDS through Phase 6 and continues unchanged under the Phase 7 visual redesign (NFR-1); only the conformance mechanism, not the conformance bar, is subject to Phase 7 planning. |
| **NFR-3** | **Audit immutability (append-only)** | Audit entries are insert-only. No application code path, API endpoint, or UI affordance updates or deletes an audit entry, and UPDATE/DELETE privileges are revoked on the audit store so that a direct mutation attempt is rejected by the database. Per-case entries are monotonically sequenced; tamper-evidence is provided by sequence and prior-entry hash linkage. |
| **NFR-4** | **AI-vs-human provenance distinguishability** | Every recorded value carries an `AI` or `HUMAN` origin at value granularity, persisted in the record and rendered distinguishably in both the case view and the audit trail. Provenance is a structural property of the record, not incidental log metadata, and a mixed AI/human resolution is attributable field by field. |
| **NFR-5** | **Human-in-the-loop enforcement (no auto-apply)** | No AI recommendation may take effect without a human decision. Resolution state transitions are reachable only via an authenticated specialist's approve, edit-and-approve, or reject action. No scheduled job, background worker, retry path, or system actor can resolve an exception; the absence of an auto-apply path is verified by test. |
| **NFR-6** | **Audit completeness** | Every state change produces exactly one audit entry, written in the same transaction as the change. A state change committed without its audit entry — or an audit entry without its change — is prevented by transactional coupling, not by convention. |
| **NFR-7** | **Traceability without external tooling** | "Who decided this, what did the AI say, and what did the human change" is answerable for any case from the application UI alone, with no export, query tool, or secondary system required. |
| **NFR-8** | **Security & access control** | All routes and endpoints except sign-in require an authenticated session. One role only — no privilege tiers to configure or escalate. Standard web protections (session integrity, CSRF protection on state-changing requests, input validation, parameterised queries, secrets kept out of source) apply. Credentials and AI provider keys are never written to the audit trail or any log. |
| **NFR-9** | **AI dependency resilience** | AI provider unavailability, latency, or malformed output degrades to "no recommendation available" and never blocks entry creation, validation, exception opening, the human decision path, or audit writing. The governed loop remains completable with the AI stage degraded. |
| **NFR-10** | **Responsiveness** | Interactive screens (sign-in, entry form, queue, case detail, audit trail) respond within 2 seconds under demonstration load. AI recommendation generation is permitted to take longer and must show accessible progress status without freezing the interface or blocking navigation. |
| **NFR-11** | **Determinism of validation** | Required-information validation is deterministic: identical entry content always yields identical findings and identical pass/fail outcome, so an exception's stated basis is reproducible. |
| **NFR-12** | **Platform** | Web application accessed through current versions of mainstream desktop browsers, with a responsive layout usable on tablet-sized viewports. No native mobile application (§10). |

---

## 7. Success Metrics

CargoExec is a demonstration of governed delivery, so success is measured by **completeness and provability of the governed decision loop** — not by volume, throughput, queue health, or time saved. Metrics that would measure operational scale are deliberately absent; there is nothing in scope that would produce them.

| ID | Metric | Target |
|----|--------|--------|
| **SM-1** | **Governed loop completeness** — the six stages (receive → validate → except → recommend → human decide → audit) demonstrable end to end in a single unbroken walkthrough with no manual workaround | **6 of 6 stages; 100%** |
| **SM-2** | **Decision traceability** — resolved or rejected cases for which "who decided, what did the AI recommend, what did the human change, and why" is fully answerable from the UI alone | **100%** |
| **SM-3** | **Provenance attribution** — recorded resolution values carrying an unambiguous `AI` or `HUMAN` origin in both the stored record and the rendered view | **100%; 0 unattributed values** |
| **SM-4** | **Auto-apply incidents** — exceptions that reached a resolved state without a recorded human decision | **0** |
| **SM-5** | **Reason capture completeness** — edits and rejections carrying a substantive reason in the record (non-empty and ≥ 10 characters after trimming, the floor enforced at the API boundary and by a database constraint) | **100%** |
| **SM-6** | **Audit coverage** — state changes with exactly one corresponding audit entry (verified 1:1 by automated test across every transition type) | **100%; 0 unaudited transitions** |
| **SM-7** | **Audit immutability** — attempted updates or deletes against stored audit entries that are rejected, including attempts made directly against the database | **100% rejected** |
| **SM-8** | **Exception derivation integrity** — entries failing required-information validation that open an exception, and exceptions existing without a validation failure behind them | **100% open an exception; 0 exceptions without a validation basis** |
| **SM-9** | **Rationale intelligibility** — AI recommendations whose rationale is judged plain-language and decision-useful by reviewing specialists during walkthrough | **100% of sampled recommendations rated intelligible** |
| **SM-10** | **Accessibility conformance** — WCAG 2.1 AA violations found during manual and assistive-technology review of every screen | **0 violations; 100% of screens reviewed and signed off** |
| **SM-11** | **Keyboard completeness** — product tasks (sign in, create entry, open queue case, edit/approve/reject with reason, read audit trail) completable using the keyboard alone | **100% of tasks** |
| **SM-12** | **USWDS conformance** — interactive components drawn from USWDS or a documented USWDS-conformant composition | **100%** |
| **SM-13** | **Degraded-mode loop completability** — cases resolvable with a full audit record while the AI provider is unavailable | **100%** |
| **SM-14** | **Scope discipline** — features shipped that fall within an §10 exclusion | **0** |

---

## 8. Risks & Mitigations

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| **R-1** | AI produces a plausible but wrong recommendation and the specialist approves it without scrutiny | High | Human-in-the-loop is structural (NFR-5): nothing auto-applies. Rationale is always shown with the recommendation (F10), AI origin is marked on every proposed value (NFR-4), and no decision action is pre-selected or defaulted (F12) so approval is a deliberate act. The audit trail preserves what was recommended versus what was chosen (F13). |
| **R-2** | Scope drift toward a supervisor dashboard, queue management, or multi-role access, consuming the budget that loop completeness needs | High | §10 is binding and exhaustive. The queue API and data model carry no filter, sort, assignment, or priority dimension (F7, §4.3), and there is one role by construction (F1). SM-14 tracks shipped features against exclusions. |
| **R-3** | Accessibility defects ship because v1 has no automated accessibility gate | Medium | Accessibility is designed in once at the shell level (F2) and inherited by every screen; a per-screen design-and-review checklist plus an assistive-technology walkthrough gates sign-off (NFR-2, SM-10, SM-11). The absence of a CI gate is a recorded decision (§10), not an oversight — it shifts the burden onto review, which is therefore mandatory rather than optional. |
| **R-4** | Audit immutability is circumvented by application code, an ORM convenience, or a direct database change | High | Append-only enforced at the persistence layer with UPDATE/DELETE privileges revoked (F0, NFR-3); the audit writer exposes insert only (F13); sequence and prior-entry hash linkage make tampering evident; SM-7 tests rejection including direct database attempts. |
| **R-5** | Provenance is recorded too coarsely (per record, not per value), making "what did the human change" unanswerable for a partially edited resolution | High | Provenance is modelled at value granularity from the schema up (F0, §4.3, NFR-4); edit-and-approve re-stamps changed values `HUMAN` while untouched values retain `AI` (F11); SM-3 targets zero unattributed values. |
| **R-6** | AI provider latency or outage blocks the demonstration or stalls the queue | Medium | Degraded mode keeps every case workable without a recommendation, and no AI failure blocks entry, validation, decision, or audit (F9, NFR-9). SM-13 requires the loop be completable with the AI stage down. Provider abstraction permits substitution. |
| **R-7** | The backend is built and the user-facing UI is under-delivered, leaving the loop provable only via API calls | High | The UI is carried by named features with their own acceptance criteria (F2, F6, F8, F10, F12, F14) and is tracked as a distinct capability surface in §11. A stakeholder walkthrough through the browser — not an API transcript — is the SM-1 and SM-2 acceptance evidence. |
| **R-8** | Reason capture becomes a formality — a single character satisfying a required field | Medium | Reasons are required at the API boundary with a 10-character minimum after trimming, enforced in storage as well (F11, F0), rendered in the audit trail where they are read (F14), and judged for decision-usefulness during walkthrough review (SM-9 for rationale, SM-5 for reasons). |
| **R-9** | Live demonstration is slow or error-prone because every scenario must be hand-typed through every earlier stage first | Low | **Superseded decision (Phase 7):** through Phase 6 this was accepted deliberately — entries were created by hand so receipt and validation stayed part of the demonstrated path (§10 #7, original rationale). Phase 7 reverses that: a seed script (F15) pre-loads a demonstration case already carried through the full lifecycle, so recommendation, decision, and audit-trail scenarios are repeatably demonstrable without re-walking receipt and validation live every time. Manual entry via F6 is not removed and remains fully demonstrable on its own. |
| **R-10** | Required-information validation rules are ambiguous, so exceptions appear arbitrary | Medium | The rule set is defined explicitly and evaluated deterministically with per-rule findings (F4, NFR-11); findings are carried onto the exception as its stated basis (F5) and shown to the specialist on the case screen (F10). |
| **R-11** | An exception is decided twice, or concurrently, producing a contradictory record | Medium | Idempotency and conflict handling on the decision endpoint (F11); decision controls are unavailable on closed cases (F12); monotonic per-case audit sequencing keeps event order unambiguous (F13). |
| **R-12** | Sensitive entry data or provider credentials leak into logs or the audit trail | Medium | Credentials and AI provider keys are excluded from the audit trail and all logs (NFR-8); the audit trail records case values by design and is protected by authentication (F1) with no export surface (§10). |

---

## 9. Feature Index

| ID | Feature | Priority | Category | Surface |
|----|---------|----------|----------|---------|
| **F0** | Case Data Model & Append-Only Audit Store | P0 | A — Governance Foundation | Data |
| **F1** | Cargo Specialist Authentication & Session | P0 | A — Governance Foundation | Integrations / API |
| **F2** | USWDS Application Shell & Accessibility Foundation | P0 | A — Governance Foundation | **User-facing UI** / Assets |
| **F3** | Manual Cargo Entry Creation (API) | P0 | B — Entry & Validation | API |
| **F4** | Required-Information Validation on Receipt | P0 | B — Entry & Validation | API / Data |
| **F5** | Exception Creation from Validation Failure | P0 | B — Entry & Validation | API / Data |
| **F6** | Cargo Entry Web UI | P0 | B — Entry & Validation | **User-facing UI** |
| **F7** | Review Queue (API) | P0 | C — Review Queue | API |
| **F8** | Review Queue Web UI | P0 | C — Review Queue | **User-facing UI** |
| **F9** | AI Resolution Recommendation Generation | P0 | D — AI Recommendation | Integrations / Async |
| **F10** | Exception Case Detail & Recommendation Presentation UI | P0 | D — AI Recommendation | **User-facing UI** |
| **F11** | Human Decision Processing — Edit / Approve / Reject (API) | P0 | E — Human Decision | API |
| **F12** | Decision Web UI — Edit, Approve, Reject with Reason Capture | P0 | E — Human Decision | **User-facing UI** |
| **F13** | Audit Entry Writer — Append-Only on Every State Change | P0 | F — Audit Trail | API / Data |
| **F14** | Per-Case Audit Trail Web UI | P0 | F — Audit Trail | **User-facing UI** |
| **F15** | Seeded Demonstration Case | P0 | G — Demonstration Enablement (Phase 7) | Data / Operational tooling |

### 9.1 Priority Summary

| Priority | Count | Features |
|----------|-------|----------|
| **P0** | 16 | F0–F15 |
| **P1** | 0 | — |
| **P2 / P3** | 0 | None — see §5.0 and §10 |

Every v1 feature is P0 because the product's purpose is a **complete** governed loop: each feature carries one of the six loop stages, the statutory UI standard, or the accountability guarantee, and removing any one of them breaks the demonstration rather than reducing it. Capabilities that would have ranked lower were excluded outright (§10) rather than carried as a deprioritised backlog. F15 (Phase 7) is P0 for a related but distinct reason: without it, later-loop stages cannot be repeatably demonstrated without hand-walking every earlier stage each time.

### 9.2 Recommended Build Order

Dependency-driven; all items are P0, so this is sequencing rather than triage.

1. **Foundation** — F0 (data model + append-only audit store), F13 (audit writer), F1 (authentication), F2 (USWDS shell)
2. **Receive & validate** — F4 (validation), F5 (exception derivation), F3 (entry API), F6 (entry UI)
3. **Queue** — F7 (queue API), F8 (queue UI)
4. **Recommend** — F9 (AI recommendation), F10 (case detail + recommendation UI)
5. **Decide** — F11 (decision API), F12 (decision UI)
6. **Prove** — F14 (audit trail UI), then the full end-to-end walkthrough against §7
7. **Demonstrate repeatably (Phase 7)** — F15 (seeded demonstration case), so every scenario in the walkthrough is reachable without hand-typing every earlier stage

---

## 10. Out of Scope

The following are **explicitly excluded from v1**. This list is binding and exhaustive: each item is a deliberate decision to buy loop completeness with surface area, and none may reappear as a feature, as a sub-capability of a feature, or as a non-functional requirement that reintroduces the capability by another name.

| # | Exclusion | Reason |
|---|-----------|--------|
| **1** | **Accessibility enforcement in CI** — no automated accessibility gate, no axe-core workflow, no `.github/workflows` file | The UI must meet 508 / WCAG 2.1 AA (NFR-2), but the enforcement mechanism in v1 is design and manual review, not automation. Automating the gate is explicitly deferred; building it now would consume loop budget without improving the conformance of what ships. |
| **2** | **Supervisor dashboard** — including exception volume, queue health, aging or delay detection, workload per specialist, throughput metrics, and reassignment or re-prioritisation | v1 has one role and no supervisory view. Supervisory analytics widen the surface without deepening the governed loop being demonstrated; none of these measures says anything about whether the loop is complete. This is also why §7 contains no volume or throughput metric. |
| **3** | **Multiple roles** — no supervisor role, no read-only or auditor role, no role-based access separation | Exactly one authenticated role exists: cargo specialist. Access tiering is orthogonal to proving that an accountable human decision occurs and is recorded. |
| **4** | **Queue filtering, sorting, assignment, or prioritisation** | A single receipt-ordered list is sufficient to demonstrate queue → open → decide. Queue management is a separate product; the ordering dimension does not exist in the data model or the API (§4.3). |
| **5** | **Audit export in any format** — no export file, no oversight package, no reporting extract | The audit trail is viewable in the UI (F14) and must answer oversight questions in place (NFR-7). An export surface would substitute a file for the in-product traceability the product exists to prove. |
| **6** | **File or API ingestion** — no bulk upload, no ingestion adapter, no interface boundary to ACE/ATS | Manual entry only (F3, F6). Ingestion adapters and system boundaries are integration work that does not prove the decision loop. |
| **7** | ~~Seeded demonstration dataset~~ — **superseded in Phase 7** | Through Phase 6: entries were created by hand during the demonstration, which kept the receive and validate stages part of the demonstrated path instead of a pre-staged precondition. **Phase 7 reverses this decision:** a hand-authored seed script (F15) pre-loads a demonstration case already carried through the full lifecycle (entry → validation failure → exception → AI recommendation → human decision → audit trail), so every scenario in the user journey — not only the ones reachable by hand-typing in a single live session — is repeatably demonstrable. This is additive: manual entry through F6 is not removed and remains fully demonstrable in its own right. |
| **8** | **Autonomous AI resolution without human approval** | Directly contradicts the core value. An autonomous resolver removes the accountable human decision the product exists to guarantee (NFR-5). |
| **9** | **Duty / tariff calculation or classification rulings** | Substantive customs determinations are outside the governed-decision-loop demonstration and would add domain complexity that obscures rather than proves the loop. |
| **10** | **Native mobile apps** | Web only (NFR-12). A second client platform multiplies the accessibility and UI surface with no gain in loop provability. |
| **11** | **Model training or fine-tuning infrastructure** | AI is consumed through a hosted provider API, not trained (F9). Training infrastructure is unrelated to demonstrating governed delivery. |

**Note (Phase 7):** item #7 above is superseded by F15 and §4.2 — it is the sole exception to this list's exhaustiveness. Every other exclusion in this list remains binding and unchanged.

---

## 11. Capability Surface Coverage Matrix

Per `pivota_spec-framework/references/scope-coverage.md`: every capability surface implied by the requirements maps either to feature(s) or to an explicit exclusion. There is no third option.

| Capability surface | Covered by | Status |
|---|---|---|
| **User-facing web UI** — sign-in, cargo entry form, review queue, exception case detail, decision controls, per-case audit trail | F2, F6, F8, F10, F12, F14 | ✅ feature(s) |
| **Programmatic API / contract** — entry creation, validation, exception derivation, queue, recommendation, decision, audit read | F3, F4, F5, F7, F9, F11, F13 | ✅ feature(s) |
| **Background / async** — AI recommendation generation triggered by exception creation, with degraded mode | F9 | ✅ feature |
| **Data** — schema for entries, exceptions, recommendations, decisions; append-only audit store; migrations | F0, F13 | ✅ feature(s) |
| **Integrations — AI provider** | F9 (provider-abstracted hosted model API; Phase 7: real hosted LLM in demo/production, fake provider reserved for automated tests) | ✅ feature |
| **Integrations — authentication** | F1 (single-role session authentication) | ✅ feature |
| **Content / assets** — visual design system, design tokens, accessible layout patterns | F2 (USWDS through Phase 6; Phase 7 replaces the visual system, conformance mechanism deferred to Phase 7 planning) | ✅ feature |
| **Seed content / demonstration dataset** | F15 (Phase 7) | ✅ feature — **was** ⛔ EXCLUDED under §10 #7 through Phase 6; superseded (see §10 note) |
| **CI / automation surface (accessibility gate, workflow files)** | — | ⛔ EXCLUDED: §10 #1 (conformance by design and review in v1) |
| **Supervisory / analytics interface** | — | ⛔ EXCLUDED: §10 #2 (one role, no supervisory view) |
| **Export / reporting surface** | — | ⛔ EXCLUDED: §10 #5 (audit viewable in UI only) |
| **Ingestion surface (file, API, ACE/ATS boundary)** | — | ⛔ EXCLUDED: §10 #6 (manual entry only) |
| **Native mobile client** | — | ⛔ EXCLUDED: §10 #10 (web only) |
| **Model training / fine-tuning infrastructure** | — | ⛔ EXCLUDED: §10 #11 (AI consumed, not trained) |

### 11.1 User-Facing Screens

The human interface is not implied or absorbed into the API layer — it is enumerated:

| Screen | Feature | Loop stage served |
|--------|---------|-------------------|
| Sign in | F1 + F2 | Identity for accountability |
| Cargo entry form + receipt outcome | F6 | Receive → validate → except (made visible) |
| Review queue (receipt-ordered open exceptions) | F8 | Except → open |
| Exception case detail with AI recommendation and rationale | F10 | Recommend |
| Decision controls — edit / approve / reject with reason | F12 | Human decide |
| Per-case audit trail | F14 | Audit |

---

## 12. Requirements Traceability

Every Active requirement in `.planning/PROJECT.md` maps to at least one feature, and every feature maps back to at least one requirement or constraint.

| # | PROJECT.md Active requirement | Features | NFRs |
|---|---|---|---|
| 1 | Cargo entries can be entered manually into the system | F3, F6 | NFR-1, NFR-2 |
| 2 | Each entry is validated against required-information rules on receipt | F4, F3 | NFR-11 |
| 3 | Entries that fail validation become exceptions and enter a review queue | F5, F4, F7 | NFR-11 |
| 4 | The queue lists open exceptions in receipt order, and a specialist can open one | F7, F8 | NFR-1, NFR-2 |
| 5 | AI generates a recommended resolution action for each exception, with a plain-language rationale | F9, F10 | NFR-4, NFR-9 |
| 6 | A cargo specialist can edit, approve, or reject the AI recommendation — no recommendation auto-applies | F11, F12, F10 | NFR-5 |
| 7 | Rejections and edits capture a reason so the record explains itself | F11, F12, F14 | NFR-7 |
| 8 | Every state change writes an append-only audit entry: who, what, when, before/after, AI-vs-human origin | F13, F0 | NFR-3, NFR-4, NFR-6 |
| 9 | The audit trail is viewable per case in the UI | F14, F13 | NFR-7, NFR-2 |
| 10 | Authenticated users sign in as a cargo specialist | F1 | NFR-8 |
| 11 | The UI follows USWDS and meets Section 508 / WCAG 2.1 AA | F2, and applied across F6, F8, F10, F12, F14 | NFR-1, NFR-2 |

| PROJECT.md Constraint | Where enforced |
|---|---|
| Design system — USWDS | F2; NFR-1; SM-12 |
| Accessibility — 508 / WCAG 2.1 AA, by design and review, not CI | F2 and all UI features; NFR-2; SM-10, SM-11; §10 #1 |
| Auditability — append-only / immutable | F0, F13; NFR-3, NFR-6; SM-6, SM-7 |
| Human-in-the-loop — no auto-apply | F11, F12; §4.3; NFR-5; SM-4 |
| Data provenance — AI or human origin on every value | F0, F9, F11, F10, F14; NFR-4; SM-3 |
| Scope discipline — one role, manual entry, single ordered queue | F1, F3, F7; §4.3; §10; SM-14 |
| Platform — web only | NFR-12; §10 #10 |

| PROJECT.md Key Decision | Reflected in |
|---|---|
| AI recommends, human decides — nothing auto-applies | F11 (structural refusal), F12 (no default action), NFR-5, §4.3 #1 |
| Append-only audit trail rather than mutable case history | F0 (privileges revoked), F13 (insert-only), NFR-3 |
| Record AI-vs-human provenance on every value | F0 (per-value origin), F11 (re-stamping on edit), NFR-4, §4.3 #3 |
| Single role, no supervisor view in v1 | F1, §10 #2, §10 #3 |
| Manual entry only — no file/API ingestion | F3, F6, §10 #6 |
| Single ordered queue — no filter, sort, assignment, prioritisation | F7, F8, §4.3 #5, §10 #4 |
| USWDS + 508/WCAG 2.1 AA by design, no CI accessibility gate | F2, NFR-2, §10 #1 |

**Phase 7 note:** `.planning/PROJECT.md`'s Out of Scope entry on seeded demonstration data (line 47, "Entries are created by hand during the demo") is superseded by this PRD's §10 #7 and §4.2. `.planning/PROJECT.md` itself is expected to be updated to reflect this reversal during Phase 7 planning; this PRD revision updates the PRD only.

---

*Document generated by Pivota Spec Framework*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11)*
*Last updated: 2026-09-11; Phase 7 targeted update: 2026-09-16 (redesign UI, seeded demo data, real LLM integration — see §4.1, §4.2, §5.1 F2, §5.4 F9, §5.7 F15, §8 R-9, §10 #7, §11)*
