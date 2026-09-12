# Personas
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.0 |
| **Date** | 2026-09-11 |
| **Related PRD** | PRD-CargoExec.md (§2.2 Target Users, §2.1 Pain Points, §5 Features, §7 Success Metrics) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | JTBD-CargoExec, Journeys-CargoExec, UserStories-CargoExec, UX-CargoExec |

---

## Scope Boundary — Read Before Using This Document

CargoExec v1 has **exactly one authenticated role: the cargo specialist**. PRD §10 #2 and #3 exclude a supervisor role, a read-only/auditor role, any role-based access separation, and the entire supervisory surface (queue health, aging, volume, workload, throughput, reassignment, prioritisation). PRD §10 #4 excludes queue filtering and sorting. PRD §10 #5 excludes audit export in any format.

Therefore this document contains:

- **One system persona — PER-01, the cargo specialist.** Every screen, every API call, every audit actor identity, and every user story in v1 belongs to this persona.
- **Two non-user stakeholder personas — PER-02 and PER-03.** Both are labelled **non-user stakeholder — does not authenticate, has no system access in v1**. They exist so downstream generators understand *who the governance guarantees are for*, not so screens get built for them.

**Instruction to downstream generators (JTBD, Journeys, UserStories, UX):** PER-02 and PER-03 must never be the actor of a user story, a journey step, a screen, a route, a permission, a role, or an API consumer. Their needs are satisfied **indirectly** — by PER-01 producing a complete record through F0, F13, and F14. Where a stakeholder need would require a system surface, it is recorded below under **Out-of-Scope-for-v1 Needs** and must stay there.

---

## Persona Summary

| ID | Name | Role | System Access | Primary Goal |
|----|------|------|---------------|--------------|
| PER-01 | Dana Reyes | Cargo Specialist — CBP (the only authenticated role) | **Authenticated user** | Resolve every cargo exception with a deliberate, recorded decision that survives later scrutiny |
| PER-02 | Marcus Hale | CBP Oversight / Audit Reviewer | **Non-user stakeholder — does not authenticate, has no system access in v1** | Be able to trust that any resolved case can answer "who decided this, what did the AI say, what did the human change" |
| PER-03 | Priya Raman | CBP Delivery Sponsor / Programme Leadership | **Non-user stakeholder — does not authenticate, has no system access in v1** | Judge, from a live walkthrough, whether CBP can build governed applications quickly |

---

## PER-01: Dana Reyes

**Status:** **Authenticated system user — the only role in CargoExec v1.**

**Role & Context:**
Dana is a cargo specialist at a CBP field office, responsible for working cargo entries that arrive incomplete or internally inconsistent. She spends most of her working day at a desktop workstation in a shared office, moving between a browser and a set of reference materials, and she is accustomed to federal applications that look and behave like USWDS: an official-site banner, plain labels, and no surprises. She works cases one at a time rather than in batches, and she is the one whose name ends up next to a decision when someone asks about it a year later.

In CargoExec her working loop is deliberately small and complete. She signs in as a cargo specialist (F1), types a cargo entry into the entry form (F6), and is told immediately whether it passed the required-information rules or opened an exception (F3, F4, F5). Open exceptions appear in a single list in receipt order (F8) — she works from the top, because there is no filter, no sort, no assignment and no priority badge to work from, and she does not want one for a list this size. She opens a case (F10), reads the AI's recommended resolution action and its plain-language rationale, checks the validation findings that put the case there, and then approves, edits-and-approves, or rejects it (F12), writing a reason whenever she edits or rejects. Before she moves on she can open the case's audit trail (F14) and read back exactly what she just did.

Dana is not suspicious of AI, but she is accountable for it. Her working assumption is that the recommendation is a draft written by something that has not seen the shipment, and her job is to decide whether it is right. What she needs from the product is not speed — it is that the record afterwards shows she decided, what she was shown when she decided, and why she changed what she changed.

**Goals:**
- Get an entry assessed the moment she submits it, and know without interpretation whether it passed or opened an exception, with a direct route to the resulting case (F3, F4, F5, F6)
- Work a known set of open exceptions in a predictable order and open any one of them in a single action, without deciding first *which* case to work (F7, F8)
- Understand a case fully before deciding it — the submitted values, the specific rules that were not satisfied, and the AI's proposed action with a rationale she can read in plain language (F9, F10)
- Tell an AI-proposed value from a human-entered value on sight and through her screen reader, at the moment of decision rather than by reconstructing it later (F0, F10, F14, NFR-4)
- Take a deliberate approve / edit / reject decision with no pre-selected default nudging her toward accepting the AI, and record the reason for any edit or rejection in her own words (F11, F12)
- Finish a case and be able to read the whole story back — who acted, what changed, when, and what the AI proposed versus what she chose — from the case itself, without asking anyone for an extract (F13, F14, NFR-7)
- Keep working a case to completion when the AI is slow or unavailable, rather than being blocked by a degraded dependency (F9 degraded mode, NFR-9)
- Complete every one of her tasks by keyboard alone, with focus, errors and status messages announced properly (F2, NFR-2, SM-11)

**Pain Points:**
- Today the corrected state of an entry is visible but the decision behind it is not: the record shows the fixed value, not who chose it, what alternative was proposed, or why that choice was made (PRD §2.1 #1)
- Where AI assistance has been introduced elsewhere, its output is merged into the record without provenance, so she cannot later prove which value was hers — her own accountability becomes unprovable (PRD §2.1 #2)
- Rejections and modifications carry no captured reason, so when a case resurfaces months later she is inferring her own past intent from an outcome with no justification attached (PRD §2.1 #3)
- Case history that can be edited after the fact, or that needs a separate tool to read, is useless to her at the moment she actually needs it — in the case, while deciding (PRD §2.1 #4)
- Exception handling modelled as a parallel data-entry path breaks the link between "which rule was not satisfied" and "why this case is open", leaving her guessing at the basis of an exception (PRD §2.1 #5, §4.3 #4)
- Ambiguous or unexplained validation outcomes make exceptions feel arbitrary; she needs the specific unsatisfied rule and field, not a generic failure (R-10)
- Tracking what she did across a workday in side channels — notes, memory, email — because the system does not hold the explanation

**Technical Expertise:** Intermediate — fluent in browser-based federal line-of-business applications and forms; comfortable with structured data entry and review screens; does not use command-line tools, query tools, or export/reporting utilities, and should never need one to answer a question about her own case. Some specialists in this role work with assistive technology full-time, so keyboard-only and screen-reader operability is a working requirement, not an accommodation added later.

**Top Tasks:**
1. **Create a cargo entry and read its receipt outcome** (multiple times per session, critical) — complete the USWDS entry form, submit, and see explicitly whether it validated clean or opened an exception, with the case reference and a link (F6)
2. **Open the next exception from the receipt-ordered queue** (multiple times per session, critical) — scan the single list, identify a case by reference, receipt time and failure summary, and activate the row by keyboard or pointer (F8)
3. **Read the case and the AI recommendation before deciding** (every case, critical) — review entry values, validation findings, and the AI's proposed action and rationale, with AI-origin marking visible on every proposed value (F10)
4. **Decide the case — approve, edit-and-approve, or reject — with a reason** (every case, critical) — choose deliberately among three equally-presented actions, edit proposed values where needed, and write a non-empty reason for any edit or rejection (F12, F11)
5. **Read the per-case audit trail** (per case, high) — confirm in the case itself that the record shows actor, action, timestamp, before/after values, reason, and AI-versus-human origin in chronological order (F14)
6. **Sign in and sign out of a session** (start and end of each session, medium) — establish the authenticated identity the audit trail attributes her decisions to (F1)

**Success Criteria:**
- Can complete the full loop — sign in, create an entry, watch it fail validation, open the case, read the recommendation, edit one value with a reason, approve, and read the audit trail — in one sitting with no workaround (SM-1: 6 of 6 stages)
- For 100% of cases she decides, "who decided, what did the AI recommend, what did the human change, and why" is answerable from the UI alone with no export or second system (SM-2, SM-7/NFR-7)
- Every resolution value she leaves or changes carries an unambiguous `AI` or `HUMAN` origin she can see in both the case view and the audit trail — zero unattributed values (SM-3)
- Zero cases ever reach a resolved state without her recorded decision (SM-4)
- 100% of her edits and rejections carry a non-empty reason she wrote (SM-5)
- Can complete every one of her tasks using the keyboard alone (SM-11), on screens with zero WCAG 2.1 AA violations found in manual and assistive-technology review (SM-10)
- Judges the AI rationale plain-language and decision-useful for 100% of sampled recommendations during walkthrough (SM-9)
- Can still resolve a case with a full audit record while the AI provider is down (SM-13)
- Every interactive screen she uses responds within 2 seconds under demonstration load; AI generation shows accessible progress rather than freezing her interface (NFR-10)

---

## PER-02: Marcus Hale

**Status:** **Non-user stakeholder — does not authenticate, has no system access in v1.** PRD §10 #3 excludes any read-only or auditor role; PRD §10 #5 excludes audit export in any format. Marcus has no account, no login, no screen, no permission, and no extract. He is documented here because he is the audience the audit trail is *designed to satisfy* (PRD §2.2), and because omitting him would leave downstream design without a reason for F0, F13 and F14 to be as strict as they are.

**Role & Context:**
Marcus works in a CBP oversight and review function. His work begins after the fact: a specific case is questioned — by internal review, by a later dispute, by a compliance inquiry — and he has to establish what happened and who was responsible. He does not work a queue, he does not resolve exceptions, and he does not operate the application. He asks questions about individual cases and needs the answers to exist somewhere durable and unrevisable.

In v1 his relationship to CargoExec is entirely indirect. When Marcus needs to know how a case was resolved, the answer is obtained by a cargo specialist (PER-01) opening that case's audit trail in the application and reading it (F14) — or, during a demonstration, by watching that trail be read. Marcus's requirements are therefore expressed as **properties of the record**, not as features he operates: the trail must be append-only and rejected on mutation at the database level (F0, F13, NFR-3), complete at 1:1 with state changes (NFR-6), attributed per value to AI or human (NFR-4), and detailed enough to answer his question without any external tooling (NFR-7). His confidence in CargoExec is a function of those guarantees holding, not of any interface he is given.

The important consequence for design: because Marcus never logs in, the per-case audit trail PER-01 reads must be *sufficient on its own*. There is no downstream oversight system to compensate for a thin record, and no export to hand him. The record either answers the question in place or it does not answer it.

**Goals:**
*(All satisfied indirectly, through the record PER-01 produces — not through any surface Marcus operates.)*
- Have confidence that no cargo exception was ever resolved without an identified, accountable human decision (F11, NFR-5, SM-4)
- Have confidence that a decision record cannot be revised after the fact — that an attempt to alter history is rejected, not merely discouraged or absent from application code (F0, F13, NFR-3, SM-7)
- Have confidence that history is complete: every state change carries exactly one audit entry, committed with the change it describes (F13, NFR-6, SM-6)
- Be able to distinguish, for any resolved case, which values the AI proposed and which the human chose or corrected — at value granularity, for partially-edited resolutions (F0, F11, NFR-4, SM-3)
- Have the *reason* for every edit and rejection present in the record, so a decision explains its own justification rather than merely reporting its outcome (F11, F12, F14, SM-5)
- Know that an exception always has a stated validation basis behind it, so "why was this case open" is never an inference (F4, F5, SM-8)
- Have the full answer reachable from within the application for any case, with no query tool or secondary system standing between the question and the answer (F14, NFR-7)

**Pain Points:**
- Asking "who decided this?" about a historical case and getting an answer assembled from memory, email, or side channels rather than from the record (PRD §2.1 #1)
- Being unable to tell a machine-proposed value from a deliberately-chosen human value, which makes the human's role in a decision unprovable and the oversight question unanswerable (PRD §2.1 #2)
- Encountering a rejection or modification with no captured justification, leaving him to infer intent months after the fact (PRD §2.1 #3)
- Case histories that are editable after the fact, or scattered across systems that need external tooling to read — neither can support oversight (PRD §2.1 #4)
- Governance described as an intention in a document rather than demonstrated as a property of a running system (PRD §2.1 #6)

**Technical Expertise:** Intermediate — reads structured case records and decision histories fluently as a domain matter; is not a database or query-tool user, which is precisely why NFR-7 requires the answer to be legible in the application rather than extractable from it.

**Top Tasks:**
*(Marcus performs **no tasks in CargoExec v1**. He has no account and no screen. The items below are the questions he brings to a case; each is answered by PER-01 reading the per-case audit trail in the UI, or by observing that reading during a walkthrough.)*
1. **Ask "who decided this case, and when?"** (as-needed, critical) — answered by the actor identity and timestamp on each audit entry (F13, F14)
2. **Ask "what did the AI recommend, and what did the human actually choose?"** (as-needed, critical) — answered by the preserved recommendation alongside the recorded decision, with per-value origin markers (F9, F11, F14)
3. **Ask "why was this edited or rejected?"** (as-needed, high) — answered by the mandatory reason text rendered in the trail (F11, F12, F14)
4. **Ask "why was this case open at all?"** (as-needed, medium) — answered by the validation findings carried onto the exception as its stated basis (F4, F5, F10)
5. **Satisfy himself that the record could not have been altered** (as-needed, high) — answered by the append-only guarantee, revoked UPDATE/DELETE privileges, and sequence/hash linkage, evidenced by test rather than by a screen (F0, F13, NFR-3, SM-7)

**Success Criteria:**
- 100% of resolved or rejected cases can answer his four questions — who decided, what the AI recommended, what the human changed, and why — from the application UI alone (SM-2)
- Zero exceptions reach a resolved state without a recorded human decision (SM-4)
- Zero unattributed resolution values; every value carries `AI` or `HUMAN` origin in both storage and rendering (SM-3)
- Zero unaudited state transitions; 1:1 audit coverage verified by automated test (SM-6)
- 100% of attempted updates or deletes against stored audit entries are rejected, including attempts made directly against the database (SM-7)
- 100% of edits and rejections carry a non-empty reason (SM-5)
- 100% of validation failures open an exception, and zero exceptions exist without a validation basis (SM-8)

**Out-of-Scope-for-v1 Needs** *(recorded so the need is visible, not planned — these must NOT become features, screens, roles, permissions, or user stories)*:
- A read-only / auditor login of his own — **excluded**, PRD §10 #3 (no second role, no role-based access separation)
- An audit export, oversight package, or reporting extract — **excluded**, PRD §10 #5 (the trail is answered in place, per NFR-7)
- Cross-case search, reporting, or aggregate review of decisions — **excluded**, no such surface exists; v1 answers per case only
- Any volume, aging, or compliance-rate measure — **excluded**, PRD §10 #2 and §7 (no metric of operational scale exists in scope)

---

## PER-03: Priya Raman

**Status:** **Non-user stakeholder — does not authenticate, has no system access in v1.** Priya is the audience for the demonstration itself (PRD §2.2). She observes a walkthrough driven by PER-01; she has no account, no dashboard, no metrics view, and no reporting surface. PRD §10 #2 excludes every supervisory and analytics surface she might otherwise be given.

**Role & Context:**
Priya leads delivery for a CBP programme portfolio. Her question is not about cargo exceptions at all — it is whether CBP can build *governed* applications fast enough to be worth building: accessible by construction, auditable by construction, and human-in-the-loop by construction. She has seen governance asserted in documents and architecture decks many times and has learned that an assertion is not evidence. What she has not often seen is a running application where the governance claim can be tested in front of her in a single sitting.

Her engagement with CargoExec is a walkthrough, not a login. She watches a cargo specialist sign in, hand-type a deliberately incomplete entry, watch it fail validation and land in the queue as an exception, open it, read the AI's recommendation and rationale, change a value and record the reason, approve it, and then open the audit trail and see the whole story including which values the AI proposed (PRD §3.2). She is judging whether that sequence needed an explanation, a workaround, or a promise about a future release. A loop with five working stages out of six is a "no" for her regardless of polish, which is why scope discipline itself is something she is evaluating.

She also cares about what was deliberately *not* built. A shipped feature that falls inside the §10 exclusion list is, to her, evidence that scope discipline failed — the same evidence in reverse.

**Goals:**
*(All satisfied by observing a walkthrough, not by any surface Priya operates.)*
- See all six governed loop stages — receive → validate → except → recommend → human decide → audit — demonstrated end to end in one unbroken sitting, through the browser rather than an API transcript (F3, F4, F5, F9, F11, F13, and the UI features F6, F8, F10, F12, F14; SM-1)
- See the human-in-the-loop guarantee as a structural property rather than a procedural promise: no path exists by which the AI resolves anything on its own (F11, NFR-5, SM-4)
- See the record explain itself — AI proposal, human choice, reason, and per-value provenance, read aloud from the audit trail in the case, not from an export (F14, NFR-7, SM-2)
- See federal standards met as delivered rather than promised: USWDS components and WCAG 2.1 AA conformance in the shipped screens she is watching (F2, NFR-1, NFR-2, SM-10, SM-12)
- See that the demonstration path includes creating the data by hand, so receive and validate are demonstrated rather than pre-staged (F6; PRD §10 #7)
- Confirm scope discipline held — that nothing shipped falls inside the §10 exclusion list (SM-14)
- See the loop remain completable when the AI provider is unavailable, so the governance guarantee does not depend on a third party being healthy (F9 degraded mode, NFR-9, SM-13)

**Pain Points:**
- Governed delivery is routinely asserted in documents rather than shown working in a running application a stakeholder can watch being operated (PRD §2.1 #6)
- Broad applications arrive partially finished, which answers the delivery-capability question with a "no" — a wide surface with an incomplete governance loop proves nothing (PRD §2, R-7)
- Backend capability gets built while the user-facing interface is under-delivered, leaving the claim provable only via API calls she cannot evaluate (R-7)
- Scope drifts toward dashboards, queue management, and multi-role access, consuming exactly the budget that loop completeness needed (R-2)
- Accessibility is treated as a later remediation rather than a property of what ships, so conformance is a promise attached to a future release (R-3)

**Technical Expertise:** Intermediate — reads architecture and delivery evidence fluently and evaluates a demonstration critically; she is not an operator of the application and evaluates it as a witness to someone else's session.

**Top Tasks:**
*(Priya performs **no tasks in CargoExec v1**. She has no account and no screen. The items below are what she does during a demonstration she observes.)*
1. **Watch the full governed loop walk end to end in one sitting** (per demonstration, critical) — sign-in through audit trail, with no workaround or verbal bridging (SM-1)
2. **Probe the accountability guarantee** (per demonstration, critical) — ask whether anything can resolve without a human, and receive a structural answer backed by test evidence rather than a policy answer (NFR-5, SM-4)
3. **Watch the audit trail answer the oversight questions in place** (per demonstration, high) — who decided, what the AI said, what the human changed, why (F14, SM-2)
4. **Check the delivered UI against federal standards** (per demonstration, high) — USWDS conformance and accessible operation, including a keyboard-only pass (SM-10, SM-11, SM-12)
5. **Check what was declined** (post-demonstration, medium) — confirm zero shipped features fall within the §10 exclusions (SM-14)

**Success Criteria:**
- 6 of 6 loop stages demonstrable end to end with no manual workaround (SM-1)
- 100% decision traceability answerable from the UI during the walkthrough (SM-2)
- Zero auto-apply incidents (SM-4); zero unaudited transitions (SM-6); 100% of mutation attempts rejected (SM-7)
- Zero WCAG 2.1 AA violations across every reviewed screen, with 100% of screens reviewed and signed off (SM-10); 100% of product tasks completable by keyboard alone (SM-11); 100% USWDS component conformance (SM-12)
- 100% of cases resolvable with a full audit record while the AI provider is unavailable (SM-13)
- Zero features shipped that fall within a §10 exclusion (SM-14)

**Out-of-Scope-for-v1 Needs** *(recorded so the need is visible, not planned — these must NOT become features, screens, roles, permissions, or user stories)*:
- A programme or delivery dashboard of any kind — **excluded**, PRD §10 #2 (no supervisory or analytics interface exists)
- Exception volume, queue health, aging, throughput, or workload-per-specialist measures — **excluded**, PRD §10 #2; §7 deliberately contains no operational-scale metric
- Any login, view, or report of her own — **excluded**, PRD §10 #3 (one authenticated role only)
- A seeded demonstration dataset to make the walkthrough faster — **excluded**, PRD §10 #7 (hand-created entries keep receive and validate inside the demonstrated path)

---

## Persona Relationships

| Persona | Interacts With | Nature of Interaction |
|---------|---------------|----------------------|
| PER-01 Cargo Specialist | The system | **The only interaction that exists in software.** Authenticates (F1), creates entries (F6), works the receipt-ordered queue (F8), reads recommendations (F10), decides with reason (F12), and reads the per-case audit trail (F14). Every audit actor identity in the system is a PER-01. |
| PER-01 Cargo Specialist | PER-02 Oversight Reviewer | **Indirect and asynchronous, entirely outside the application.** PER-01's decisions and captured reasons *become* the record PER-02 later relies on. When PER-02 raises a question about a case, it is answered by a PER-01 opening that case's audit trail in the UI and reading it — there is no handoff surface, no assignment, no notification, and no export (PRD §10 #5). |
| PER-01 Cargo Specialist | PER-03 Delivery Sponsor | **Demonstration only.** PER-01 drives the walkthrough; PER-03 observes. PER-03 never touches the application. No presenter mode, demo mode, or read-along surface exists or should be designed. |
| PER-02 Oversight Reviewer | PER-03 Delivery Sponsor | **Outside the product entirely.** PER-02's confidence in the record is part of the evidence PER-03 weighs when judging whether the governed loop is complete. No software mediates this. |
| PER-01 Cargo Specialist | Other cargo specialists | **No interaction modelled in v1.** There is no assignment, no reassignment, no ownership, no handoff, and no shared-state coordination (PRD §10 #2, #4). Two specialists working the same queue are distinguished only by the actor identity recorded on each audit entry; conflict is handled structurally by decision idempotency (F11, R-11), not by a coordination feature. |
| AI recommendation service | PER-01 Cargo Specialist | **Advisory only, never an actor on state.** The AI produces a draft proposal and rationale attached to a case (F9), recorded as an `AI` origin in the audit trail. It resolves nothing; it is presented to PER-01 as an un-applied proposal awaiting a decision (F10, NFR-5). |

---

## Feature-Persona Matrix

**Reading this matrix:**
- **Primary** — the persona operates this feature directly, as an authenticated user.
- **Secondary** — the persona depends on this feature to support the work they do elsewhere in the product.
- **Beneficiary (non-user)** — the persona never operates the feature and has no access to it; they benefit from the guarantee it produces. **Downstream generators must not derive screens, roles, permissions, routes, or user stories from a Beneficiary cell.**
- **—** — no relationship.

| Feature | PER-01 Dana (Cargo Specialist — system user) | PER-02 Marcus (Oversight — non-user) | PER-03 Priya (Delivery Sponsor — non-user) |
|---------|-----------------|--------------------|--------------------|
| **F0**: Case Data Model & Append-Only Audit Store | Primary | Beneficiary (non-user) — immutability & per-value provenance guarantee | Beneficiary (non-user) — governance-by-construction evidence |
| **F1**: Cargo Specialist Authentication & Session | Primary | — | — |
| **F2**: USWDS Application Shell & Accessibility Foundation | Primary | — | Beneficiary (non-user) — observes delivered 508/WCAG + USWDS conformance |
| **F3**: Manual Cargo Entry Creation (API) | Primary | — | — |
| **F4**: Required-Information Validation on Receipt | Primary | Beneficiary (non-user) — every exception has a stated validation basis | — |
| **F5**: Exception Creation from Validation Failure | Primary | Beneficiary (non-user) — exception derivation integrity | — |
| **F6**: Cargo Entry Web UI | Primary | — | Beneficiary (non-user) — observes receive/validate stages in the walkthrough |
| **F7**: Review Queue (API) | Primary | — | — |
| **F8**: Review Queue Web UI | Primary | — | Beneficiary (non-user) — observes except → open stage |
| **F9**: AI Resolution Recommendation Generation | Primary | Beneficiary (non-user) — the preserved "what did the AI say" record | Beneficiary (non-user) — observes recommend stage and degraded mode |
| **F10**: Exception Case Detail & Recommendation Presentation UI | Primary | — | Beneficiary (non-user) — observes AI-origin marking on proposed values |
| **F11**: Human Decision Processing — Edit / Approve / Reject (API) | Primary | Beneficiary (non-user) — no-auto-apply and mandatory-reason guarantees | Beneficiary (non-user) — the structural human-in-the-loop claim |
| **F12**: Decision Web UI — Edit, Approve, Reject with Reason Capture | Primary | — | Beneficiary (non-user) — observes the deliberate, undefaulted human decision |
| **F13**: Audit Entry Writer — Append-Only on Every State Change | Secondary (writes occur through her actions; she never invokes it directly) | Beneficiary (non-user) — completeness & append-only guarantee | Beneficiary (non-user) — audit coverage evidence |
| **F14**: Per-Case Audit Trail Web UI | Primary | Beneficiary (non-user) — **has no access; the trail is read on his behalf by PER-01** | Beneficiary (non-user) — observes the audit stage close the loop |

**Coverage check:** All fifteen features (F0–F14) are mapped. PER-01 is the operating actor for every user-facing and API feature — she is the only persona with a Primary or Secondary cell anywhere in the matrix, which is the intended consequence of the single-role constraint. PER-02 and PER-03 hold **Beneficiary (non-user)** cells only, and only against the governance and provenance guarantees (concentrated in F0, F13, F14, with observation cells against the loop stages they witness). Neither non-user persona is an operator of any feature.

---

## Persona Coverage & Constraint Check

| Check | Result |
|-------|--------|
| Every PRD §2.2 target user has a persona | ✅ Cargo Specialist → PER-01 |
| Every PRD §2.2 non-role stakeholder is represented and labelled as a non-user | ✅ Oversight/audit reviewer → PER-02; delivery leadership → PER-03; supervisor / branch chief → **deliberately not given a persona** (PRD §10 #2, #3 — no supervisory surface, no second role, nothing for a persona to do) |
| Exactly one persona authenticates | ✅ PER-01 only |
| No supervisor persona with system access | ✅ None created |
| No persona need expressed as a dashboard, metric, filter, sort, assignment, prioritisation, or audit export | ✅ All such needs recorded under **Out-of-Scope-for-v1 Needs** on PER-02 and PER-03, marked excluded with PRD §10 references |
| Goals trace to PRD features | ✅ Every goal bullet carries F-ID references |
| Pain points trace to PRD §2.1 Problem Statement | ✅ Every pain point carries a §2.1 or risk reference |
| Success criteria trace to PRD §7 Success Metrics | ✅ SM-1 through SM-14 referenced across personas |
| Feature-Persona Matrix covers all PRD features | ✅ F0–F14, fifteen of fifteen |
| Personas are distinct, not clones | ✅ One operator, one accountability audience, one delivery-capability audience — different questions, different evidence, no overlapping tasks |
| Persona count within 2–4 | ✅ 3 |

---

*Document generated by Pivota Spec Framework — Personas Generator*
*Source of truth: `.planning/PROJECT.md` (last updated 2026-09-11); derived from PRD-CargoExec.md v1.0*
*Last updated: 2026-09-11*
