# User Journeys
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.0 |
| **Date** | 2026-09-11 |
| **Related Personas** | PERSONAS-CargoExec.md (PER-01, PER-02, PER-03) |
| **Related JTBD** | JTBD-CargoExec.md (JTBD-01.1–01.7, 02.1–02.4, 03.1–03.4) |
| **Related PRD** | PRD-CargoExec.md (§5 Features F0–F14, §6 NFRs, §7 Success Metrics, §10 Out of Scope) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | STORY-MAP-CargoExec, UX-CargoExec, UserStories-CargoExec |

---

## Scope Boundary — Read Before Using This Document

CargoExec v1 has **exactly one authenticated role: the cargo specialist (PER-01)**. Every journey in this document that contains a screen, a click, a keystroke, a form, a route, or an API call belongs to PER-01 and to no one else.

**There are exactly six interactive screens in v1**, and every interactive touchpoint in this document names one of them:

| Screen | Feature | What it is |
|--------|---------|------------|
| **Sign-in** | F1 on F2 | Credential sign-in establishing the authenticated identity the audit trail attributes decisions to |
| **Entry form** | F6 on F2 | USWDS cargo entry form; submitting it triggers atomic receipt (F3 → F4 → F5) |
| **Queue** | F8 on F2 | The single receipt-ordered list of open exceptions — no filter, no sort, no assignment, no priority badge |
| **Case detail** | F10 on F2 | Entry values, validation findings, and the AI's proposal and rationale, marked AI-origin |
| **Decision** | F12 on F2 | Approve / Edit / Reject controls with mandatory reason capture, hosted within the case |
| **Audit trail** | F14 on F2 | Read-only chronological per-case history, reachable from the case |

**PER-02 (Marcus Hale, oversight reviewer) and PER-03 (Priya Raman, delivery sponsor) are non-user stakeholders.** They do not authenticate, hold no account, and operate no screen, route, export, dashboard, query tool or API in v1. Each has a journey below because their experience of the product is real — but each is labelled **non-user journey — no authenticated access, no dedicated interface**, and in each one the touchpoint column names *another human*, *a property of the record*, or *verification evidence*, never an interface of their own. JRN-02.1 is a reconstruction obtained by a specialist reading the per-case trail on Marcus's behalf, plus a database/test-level examination of the append-only guarantee. JRN-03.1 is a witnessed walkthrough driven by a specialist.

**Instruction to downstream generators (STORY-MAP, UserStories, UX):** no stage in JRN-02.1 or JRN-03.1 may become a screen, a route, a role, a permission, an API consumer, or a user story with PER-02 or PER-03 as actor. No stage anywhere in this document may become a supervisor dashboard, a queue metric (volume, aging, throughput, workload), a reassignment, filter, sort, assignment or prioritisation control, an audit export, a bulk/file/API ingestion path, a second role, a seeded demonstration dataset, an autonomous AI resolution, a duty or tariff calculation, a native mobile client, or a CI accessibility gate. Every one of those is excluded by `.planning/PROJECT.md` and PRD §10.

---

## Journey Index

| ID | Persona | Access | Scenario | Key JTBD | Stages |
|----|---------|--------|----------|----------|--------|
| JRN-01.1 | PER-01 Dana | User | **Happy path** — sign in and hand-type an entry that passes required-information validation; no exception is created | JTBD-01.1 | 6 |
| JRN-01.2 | PER-01 Dana | User | **Core loop** — an entry fails validation, appears in the receipt-ordered queue, and she opens it, reads the AI recommendation and rationale, and approves it | JTBD-01.1, 01.2, 01.3, 01.4, 01.5 | 8 |
| JRN-01.3 | PER-01 Dana | User | **Edit path** — she disagrees with part of the recommendation, edits the resolution values, writes the mandatory reason, and submits; per-value AI-vs-human provenance is recorded | JTBD-01.3, 01.4, 01.5 | 7 |
| JRN-01.4 | PER-01 Dana | User | **Reject path** — she rejects the recommendation outright with a mandatory reason | JTBD-01.3, 01.4, 01.5 | 6 |
| JRN-01.5 | PER-01 Dana | User | **Audit reconstruction** — she opens a resolved case's audit trail and reads back who decided, what changed, when, and which values came from the AI versus the human | JTBD-01.5 | 6 |
| JRN-01.6 | PER-01 Dana | User | **Degraded AI** — no recommendation is available, and she must still reach a recorded decision | JTBD-01.6, 01.4 | 6 |
| JRN-01.7 | PER-01 Dana | User | **Accessibility path** — she completes a full decision keyboard-only with a screen reader, across all six screens | JTBD-01.7 | 8 |
| JRN-02.1 | PER-02 Marcus | **Non-user** | **Oversight reconstruction** — a resolved case is questioned; the answer is obtained by a specialist reading the per-case trail to him, and the immutability guarantee is examined at the database/test level, not through any interface | JTBD-02.1, 02.2, 02.3, 02.4 | 6 |
| JRN-03.1 | PER-03 Priya | **Non-user** | **Witnessed walkthrough** — she observes a specialist walk the full six-stage governed loop in one sitting and probes the accountability and scope claims verbally | JTBD-03.1, 03.2, 03.3, 03.4 | 7 |

**Coverage check:** PER-01 has 7 journeys, PER-02 has 1, PER-03 has 1 — every persona has at least one. All 7 interactive journeys belong to PER-01. Both non-user journeys are free of screens, logins, dashboards, exports, queries and API calls.

---
