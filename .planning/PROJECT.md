# CargoExecutionAssistant

## What This Is

A cargo exception management application for U.S. Customs and Border Protection (CBP). A cargo specialist enters cargo entries, watches the ones that fail validation land in a review queue, reads an AI-generated resolution recommendation together with its plain-language rationale, and then edits, approves, or rejects it. Every decision is written to an immutable audit trail that records who decided, what changed, and whether the value came from the AI or the human.

It is a demonstration that CBP can rapidly build *governed* applications — breadth of features is explicitly less important than the governed decision loop being complete and provable.

## Core Value

A cargo exception is never resolved without an accountable human decision, and every decision — what was recommended, what was chosen, by whom, and when — is permanently traceable.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current v1 scope. Hypotheses until shipped and validated. -->

- [ ] Cargo entries can be entered manually into the system
- [ ] Each entry is validated against required-information rules on receipt
- [ ] Entries that fail validation become exceptions and enter a review queue
- [ ] The queue lists open exceptions in receipt order, and a specialist can open one
- [ ] AI generates a recommended resolution action for each exception, with a plain-language rationale
- [ ] A cargo specialist can edit, approve, or reject the AI recommendation — no recommendation auto-applies
- [ ] Rejections and edits capture a reason so the record explains itself
- [ ] Every state change writes an append-only audit entry: who, what, when, before/after, and AI-vs-human origin
- [ ] The audit trail is viewable per case in the UI
- [ ] Authenticated users sign in as a cargo specialist
- [ ] The UI meets Section 508 / WCAG 2.1 AA (mechanism through Phase 6 was USWDS; Phase 7 replaces the visual system — the accessibility bar is unchanged and system-independent)
- [ ] **(Phase 7)** A seed script pre-loads one demonstration case through the full lifecycle (entry → validation failure → exception → AI recommendation → human decision → audit trail), reusing the same code paths the live application uses — additive to, not a replacement of, manual entry
- [ ] **(Phase 7)** The demonstration/production deployment is configured against a real hosted LLM provider; the deterministic fake provider remains for automated tests only

### Out of Scope

<!-- Explicit boundaries. Do not build, do not plan, do not generate requirements for these. -->

- **Accessibility enforcement in CI** — the UI must meet 508 / WCAG 2.1 AA, but v1 adds no automated accessibility gate, no axe-core CI workflow, and no `.github/workflows` file
- **Supervisor dashboard** — exception volume, queue health, aging/delay detection, workload per specialist, throughput metrics, reassignment or re-prioritisation; v1 has one role and no supervisory view
- **Multiple roles** — no supervisor role, no read-only/auditor role, no role-based access separation; one authenticated role: cargo specialist
- **Queue filtering, sorting, assignment or prioritisation** — a single ordered list only
- **Audit export** — the audit trail is viewable in the UI; no export format, no oversight package
- **File or API ingestion** — manual entry only; no bulk upload, no ingestion adapter, no interface boundary to ACE/ATS
- ~~**Seeded demonstration dataset** — entries are created by hand during the demo~~ — **superseded in Phase 7**: a hand-authored seed script now pre-loads one fully-lifecycle demonstration case so every scenario is reachable without re-typing each stage live; manual entry (the original decision's intent) remains fully supported and is not replaced. See PRD-CargoExec.md §10 item #7.
- **Autonomous AI resolution without human approval** — contradicts the core value
- **Duty/tariff calculation or classification rulings** — out of the governed-decision-loop demonstration
- **Native mobile apps** — web only
- **Model training or fine-tuning infrastructure** — AI is consumed, not trained

## Context

- **Users are federal agency staff.** Cargo specialists working exceptions inside CBP. Federal agency users, statutory accessibility standards, and audit/oversight expectations are baseline assumptions, not features to be negotiated. (USWDS was the delivered design system through Phase 6; Phase 7 replaces it with a newly-approved visual system — the accessibility bar itself does not move.)
- **AI is an assistant, not a decider.** It summarises the exception and drafts a resolution; the user retains the final decision. Provenance — AI-suggested vs. human-entered — must be distinguishable in the record, not merely logged.
- **The audit trail is the product.** Append-only, per-case viewable, and detailed enough to answer "who decided this, what did the AI say, and what did the human change" without external tooling.
- **Purpose is demonstration of governed delivery.** The complete, provable governed decision loop (receive → validate → except → recommend → human decide → audit) matters more than feature breadth. Anything that widens surface area at the cost of loop completeness is the wrong trade.
- **Validation-driven exceptions.** Exceptions are not a separate data entry path — they are the failure outcome of required-information validation on receipt.

## Constraints

- **Design system**: Through Phase 6, the UI followed USWDS (U.S. Web Design System). Phase 7 replaces the visual system with a newly-approved design; Section 508 / WCAG 2.1 AA conformance is the binding constraint regardless of which system implements it.
- **Accessibility**: Section 508 / WCAG 2.1 AA compliance required — statutory for federal applications; enforced by design and review, not by CI in v1
- **Auditability**: Audit entries are append-only/immutable — an editable audit trail cannot support oversight
- **Human-in-the-loop**: No AI recommendation may auto-apply — accountability requires a human decision on every resolution
- **Data provenance**: Every recorded value must be attributable to AI or human origin — provenance is a core requirement, not metadata
- **Scope discipline**: One authenticated role (cargo specialist), manual entry only, single ordered queue — deliberately narrow so the governed loop can be completed and proven
- **Platform**: Web application (no native mobile)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI recommends, human decides — nothing auto-applies | Accountability is the core value; an autonomous resolver removes the accountable decision the product exists to guarantee | — Pending |
| Append-only audit trail rather than mutable case history | Oversight requires that the record of a decision cannot be revised after the fact | — Pending |
| Record AI-vs-human provenance on every value | "What did the AI suggest and what did the human change" is unanswerable without per-value origin | — Pending |
| Single role (cargo specialist), no supervisor view in v1 | Supervisory analytics widen the surface without deepening the governed loop being demonstrated | — Pending |
| Manual entry only — no file/API ingestion in v1 | Ingestion adapters and ACE/ATS boundaries are integration work that does not prove the decision loop | — Pending |
| Single ordered queue — no filter, sort, assignment or prioritisation | Receipt-order list is sufficient to demonstrate queue → open → decide; queue management is a separate product | — Pending |
| USWDS + 508/WCAG 2.1 AA by design, no CI accessibility gate in v1 | Compliance is a requirement of the UI; automating the gate is explicitly deferred | — Pending |
| [Phase 7] Replace USWDS with a newly-approved visual design | Requested redesign; 508/WCAG 2.1 AA conformance is preserved as a system-independent requirement, mechanism decided in Phase 7 planning | — Pending |
| [Phase 7] Reverse the no-seed-data exclusion; add a hand-authored seed script (F15) | Enables demonstrating every scenario (not just the ones reachable by hand-typing live) without removing manual entry | — Pending |
| [Phase 7] Require a real hosted LLM in the demo/production posture, not the default fake provider | The AI capability being demonstrated should be genuine; architecture (provider abstraction, no vendor SDK) is unchanged | — Pending |

---
*Last updated: 2026-09-11 after initialization*
