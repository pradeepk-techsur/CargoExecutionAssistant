# Requirements: CargoExecutionAssistant

**Defined:** 2026-09-11
**Core Value:** A cargo exception is never resolved without an accountable human decision, and every decision — what was recommended, what was chosen, by whom, and when — is permanently traceable.

**ID policy:** v1 requirement IDs are the PRD feature IDs `F0`–`F14`, preserved verbatim. The FRD, UserStories (84 stories), StoryMap and RTM already trace against these IDs — a parallel numbering scheme would break that chain. Non-functional requirements keep their PRD `NFR-*` IDs.

---

## v1 Requirements

All 15 functional requirements are P0. This is a demonstration whose value is a **complete** governed decision loop (receive → validate → except → recommend → human decide → audit); a five-of-six loop is not a smaller product, it is a worthless one. There is deliberately no P2/P3 tier — anything that would rank that low was excluded outright (see Out of Scope).

### A — Governance Foundation

- [ ] **F0**: Case data model and append-only audit store — every recorded value carries an `AI` or `HUMAN` origin at value granularity, and audit entries are insert-only with UPDATE/DELETE revoked at the database
- [ ] **F1**: A user can sign in as a cargo specialist and hold an authenticated session; every route except sign-in rejects unauthenticated requests
- [ ] **F2**: USWDS application shell and accessibility foundation — landmarks, heading structure, focus management, error-summary pattern and live regions, inherited by every screen

### B — Cargo Entry & Validation

- [ ] **F3**: A cargo entry can be created manually through the API in a single transaction carrying its receipt outcome
- [ ] **F4**: Each entry is validated against the required-information rule set on receipt, deterministically, producing per-rule findings
- [ ] **F5**: An entry that fails validation becomes an exception carrying those findings as its stated basis, and enters the review queue
- [ ] **F6**: A cargo specialist can enter a cargo entry through a USWDS web form and see validation failures surfaced on receipt, with errors bound programmatically to their fields

### C — Review Queue

- [ ] **F7**: The queue API returns open exceptions in strict receipt order — and rejects any query string rather than silently ignoring it
- [ ] **F8**: A cargo specialist can see open exceptions as a single receipt-ordered list and open one

### D — AI Recommendation

- [ ] **F9**: The AI generates a recommended resolution action for each exception together with a plain-language rationale, persisting model and prompt identity for traceability, and degrades to "no recommendation available" on provider failure
- [ ] **F10**: A cargo specialist can read the exception, its validation failures, the AI recommendation and its rationale on a case detail screen, with per-value AI origin visible without relying on colour

### E — Human Decision

- [ ] **F11**: A cargo specialist can edit, approve, or reject the recommendation — nothing auto-applies; a resolution is a separate record that only an explicit specialist decision can write
- [ ] **F12**: The decision screen captures a mandatory reason on edit and on reject, pre-selects no action, and re-stamps edited values as `HUMAN` while untouched values retain `AI`

### F — Audit Trail

- [ ] **F13**: Every state change writes exactly one append-only audit entry in the same transaction — who, what, when, before/after, and AI-vs-human origin
- [ ] **F14**: A cargo specialist can view a case's complete audit trail in the UI and answer "who decided this, what did the AI say, what did the human change" without an export or any external tool

### Non-Functional

- [ ] **NFR-1**: UI conforms to USWDS — every interactive component is a USWDS component or a documented USWDS-conformant composition, with USWDS tokens governing type, spacing and colour
- [ ] **NFR-2**: Every screen meets Section 508 / WCAG 2.1 AA — met by design and manual per-screen review including an assistive-technology walkthrough, and explicitly **not** by an automated CI gate in v1
- [ ] **NFR-3**: Audit immutability — insert-only, UPDATE/DELETE revoked at the database, sequence and prior-entry hash linkage for tamper evidence
- [ ] **NFR-4**: AI-vs-human provenance is distinguishable at value granularity, in the record and in the UI — a structural property, not incidental log metadata
- [ ] **NFR-5**: Human-in-the-loop — no scheduled job, worker, retry path or system actor can resolve an exception; the absence of an auto-apply path is verified by test
- [ ] **NFR-6**: Audit completeness — a state change without its audit entry, or an audit entry without its change, is prevented by transactional coupling, not convention
- [ ] **NFR-7**: Traceability without external tooling — any case is fully answerable from the application UI alone
- [ ] **NFR-8**: Security — authenticated session required on all routes but sign-in, one role only, CSRF protection on state-changing requests, no credentials or provider keys in logs or the audit trail
- [ ] **NFR-9**: AI dependency resilience — provider failure never blocks entry, validation, exception opening, the human decision, or audit writing
- [ ] **NFR-10**: Interactive screens respond within 2 seconds under demonstration load; recommendation generation may take longer but shows accessible progress without blocking
- [ ] **NFR-11**: Validation is deterministic — identical entry content always yields identical findings and outcome
- [ ] **NFR-12**: Web application on current mainstream desktop browsers, responsive to tablet viewports; no native mobile

---

## v2 Requirements

**Deliberately empty.** The project description enumerated the v1 exclusions as *"do not build, do not plan, do not generate requirements for"* — so nothing is parked here as a tracked-but-deferred requirement. Everything excluded sits in Out of Scope below with its reason. Promoting any of it is a scope decision to be made explicitly, not a backlog item to be drifted into.

---

## Out of Scope

Explicitly excluded from v1. Each was named as out of scope in the project description; the reason is recorded to prevent re-adding.

| Feature | Reason |
|---------|--------|
| Accessibility enforcement in CI — no axe-core workflow, no `.github/workflows` file | The UI must meet 508 / WCAG 2.1 AA (NFR-2), but the v1 enforcement mechanism is design and manual review. Automating the gate would consume loop budget without improving what ships. |
| Supervisor dashboard — exception volume, queue health, aging/delay detection, workload per specialist, throughput metrics | v1 has one role and no supervisory view. Analytics widen the surface without deepening the governed loop being demonstrated. |
| Reassignment and re-prioritisation | Requires a supervisory actor that does not exist in v1. |
| Multiple roles — no supervisor, no read-only/auditor, no role-based access separation | One authenticated role: cargo specialist. RBAC machinery proves nothing about the decision loop. |
| Queue filtering, sorting, assignment or prioritisation | A single receipt-ordered list is sufficient to demonstrate queue → open → decide. The queue API rejects query parameters rather than ignoring them, so the absence is testable. |
| Audit export — no export format, no oversight package, no reporting extract | The trail is viewable in the UI (F14) and must answer oversight questions in place (NFR-7). An export substitutes a file for the in-product traceability the product exists to prove. |
| File or API ingestion — no bulk upload, no ingestion adapter, no ACE/ATS interface boundary | Manual entry only. Integration adapters are work that does not prove the decision loop. |
| Seeded demonstration dataset | Entries are created by hand during the demo. Seed data would let the loop appear complete without having been walked. |
| Autonomous AI resolution without human approval | Directly contradicts the core value — an autonomous resolver removes the accountable decision the product exists to guarantee. |
| Duty/tariff calculation or classification rulings | Customs determination logic is a different product; validation here is presence/format/code-list only. |
| Native mobile apps | Web only. A second client platform multiplies the accessibility and UI surface with no gain in loop provability. |
| Model training or fine-tuning infrastructure | The AI is consumed, not trained. |

---

## PROJECT.md Active Requirement Coverage

Each of the 11 Active requirements in PROJECT.md maps to at least one v1 requirement above.

| # | PROJECT.md Active requirement | Covered by |
|---|-------------------------------|------------|
| 1 | Cargo entries can be entered manually into the system | F3, F6 |
| 2 | Each entry is validated against required-information rules on receipt | F4, F3, NFR-11 |
| 3 | Entries that fail validation become exceptions and enter a review queue | F5 |
| 4 | The queue lists open exceptions in receipt order, and a specialist can open one | F7, F8 |
| 5 | AI generates a recommended resolution action with a plain-language rationale | F9, F10 |
| 6 | A specialist can edit, approve, or reject — no recommendation auto-applies | F11, F12, NFR-5 |
| 7 | Rejections and edits capture a reason | F11, F12 |
| 8 | Every state change writes an append-only audit entry: who, what, when, before/after, AI-vs-human origin | F0, F13, NFR-3, NFR-4, NFR-6 |
| 9 | The audit trail is viewable per case in the UI | F14, NFR-7 |
| 10 | Authenticated users sign in as a cargo specialist | F1, NFR-8 |
| 11 | The UI follows USWDS and meets Section 508 / WCAG 2.1 AA | F2, F6, F8, F10, F12, F14, NFR-1, NFR-2 |

---

## Open Assumption

**Required-information rule set (F4).** The 31 validation rules `RIV-010`–`RIV-132` enumerated in the FRD are an implementation assumption open to CBP refinement — they cover presence, format and code-list membership across ordinary cargo-entry fields (entry number, importer of record, port of entry, carrier/conveyance, bill of lading or air waybill, country of origin, goods description, quantity, declared value, arrival date, and related). The validation **mechanism** — deterministic, per-rule findings, findings carried onto the exception as its stated basis — is not an assumption. Refining the rule content changes data, not architecture.

---

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| F0 | — | Pending |
| F1 | — | Pending |
| F2 | — | Pending |
| F3 | — | Pending |
| F4 | — | Pending |
| F5 | — | Pending |
| F6 | — | Pending |
| F7 | — | Pending |
| F8 | — | Pending |
| F9 | — | Pending |
| F10 | — | Pending |
| F11 | — | Pending |
| F12 | — | Pending |
| F13 | — | Pending |
| F14 | — | Pending |

**Coverage:**
- v1 functional requirements: 15 total
- v1 non-functional requirements: 12 total
- Mapped to phases: 0 (roadmap not yet created)
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-09-11*
*Last updated: 2026-09-11 after initial definition*
