# User Stories
## CargoExecutionAssistant (CargoExec)

| Field | Value |
|-------|-------|
| **Product Name** | CargoExecutionAssistant |
| **Project Acronym** | CargoExec |
| **Document Version** | 1.1 |
| **Date** | 2026-09-11 (Phase 7 update: 2026-09-16) |
| **Related PRD** | `project_specs/PRD-CargoExec.md` (§5 Features F0–F15, §6 NFRs, §7 Success Metrics) |
| **Related FRD** | `project_specs/FRD-CargoExec.md` (chunked under `project_specs/FRD/`, F00–F15 + Y0–Y3) |
| **Related Personas** | `project_specs/PERSONAS-CargoExec.md` (PER-01 only — see Actor Constraint) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Feature Coverage** | F0–F15 (all sixteen PRD features) |

---

## Story Format

Each story follows: **As a [persona], I want to [action], so that [outcome].**

Acceptance criteria are written as verifiable Given / When / Then statements naming the
concrete states, error codes, rule identifiers, and field-level behaviours specified in the
FRD. Stories are grouped into one epic per PRD feature, so epic *N* is feature `F{N}`.

---

## Actor Constraint — Read Before Using This Document

CargoExec v1 has **exactly one authenticated role: the cargo specialist** (PERSONAS §Scope
Boundary; PRD §10 #3). Therefore:

- **Every story in this document has the same actor: the cargo specialist — PER-01, Dana
  Reyes.** She is the only user who authenticates, the only actor recorded on a decision, and
  the only operator of every screen and every endpoint.
- **PER-02 (CBP oversight / audit reviewer) and PER-03 (CBP delivery sponsor) are non-user
  stakeholders and never appear as the actor of a story.** They do not authenticate, hold no
  account, and have no screen, route, permission, or export in v1. Where the audit trail,
  provenance model, or append-only guarantee exists to serve them, that need is expressed as
  the specialist's story with the stakeholder benefit stated in the **so that** clause — for
  example "so that a later reviewer can reconstruct the decision without asking me for an
  extract". A benefit clause, never an actor.
- **Nothing excluded by `.planning/PROJECT.md` or PRD §10 has a story, with one deliberate
  Phase 7 reversal**: no CI accessibility gate, no supervisor dashboard, no queue
  metrics/aging/throughput/workload, no reassignment, no filtering, sorting, assignment or
  prioritisation, no audit export, no bulk/file/API ingestion, no second authenticated role, no
  autonomous AI resolution, no duty or tariff calculation, no native mobile client, and no model
  training. Several stories exist specifically to *assert the absence* of these capabilities as
  testable behaviour. **Phase 7 reverses exactly one item on this list — seeded demonstration
  data — via new Epic 15 (F15; PRD §5.7, §10 #7 superseded).** Every other exclusion above still
  has zero stories, and F15's reversal is additive: manual entry (F6/Epic 6) is unchanged and
  remains the only way to create any cargo entry beyond the one seeded case (US-15.5).
- **Phase 7 adds two narrowly-scoped, non-cargo-specialist stories; neither introduces a second
  authenticated role.** Epic 15's five stories (US-15.1 … US-15.5) are written from the point of
  view of an **operator** running a one-time, non-HTTP seed script — never the authenticated
  cargo specialist, never a UI feature, and never reachable through a session, screen, or
  endpoint (FRD F15 FR-15.10). Epic 9's new US-9.6 is written from the point of view of the
  **delivery sponsor** (PER-03) because it asserts a deployment-*configuration* fact — a real
  hosted LLM behind the recommendation the sponsor is shown — that no cargo-specialist action can
  express; the recommendation-generation mechanism and every other Epic 9 story are unchanged.
  Outside these two additions, the single-actor rule above is unbroken.

Accessibility criteria (keyboard operability, focus management, error identification, live-region
announcement, colour independence) appear as real acceptance criteria on the UI stories. They are
met **by design and manual review, including an assistive-technology walkthrough per screen — and
explicitly not by an automated CI gate** (PRD §10 #1, NFR-2, F2 FR-2.25/FR-2.26).

---

## The Governed Loop These Stories Cover

**receive → validate → except → recommend → human decide → audit**

| Loop stage | Epics |
|---|---|
| Sign in (identity for attribution) | Epic 1 |
| Receive | Epics 3, 6 |
| Validate | Epic 4 |
| Except → queue → open | Epics 5, 7, 8 |
| Recommend | Epics 9, 10 |
| Human decide | Epics 11, 12 |
| Audit | Epics 0, 13, 14 |
| Federal UI foundation (cross-cutting) | Epic 2 |
| Demonstration enablement (operator, pre-loads the whole loop; Phase 7) | Epic 15 |

---
## Epic 0: Case Data Model & Append-Only Audit Store (F0)

The persistence foundation. These stories are written from the cargo specialist's point of view
because the guarantees are hers to rely on: her decision is the thing being made unrewritable,
her keystrokes are the entry of record, and her accountability is what per-value provenance
protects. The behaviour is verified at the database, not in application code.

### US-0.1: Decision history that cannot be rewritten afterwards
**As a** cargo specialist, **I want to** know that once my decision is recorded it cannot be altered or deleted by anyone, **so that** the record still means what it said when a later reviewer questions the case months from now.

**Acceptance Criteria:**
- [ ] Given a stored audit entry, when `UPDATE audit_entries SET action_type = 'X'` is executed as the application role `cargoexec_app`, then the statement is rejected (privileges are `SELECT, INSERT` only) and the transaction aborts with internal code `AUDIT_IMMUTABLE`.
- [ ] Given the same entry, when the identical `UPDATE` is executed as `cargoexec_owner` or a superuser, then an unconditional `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger raises `AUDIT_IMMUTABLE` and the statement still fails.
- [ ] Given stored value rows, when `DELETE FROM audit_entry_values` or `TRUNCATE audit_entries` is attempted by any role, then it is rejected.
- [ ] Given an insert attempt written as `INSERT ... ON CONFLICT DO UPDATE` against an audit table, when it executes, then it fails rather than silently updating a row.
- [ ] Given the deployed application, when the codebase and API surface are searched, then no update, delete, redact, correct, anonymise, backfill, purge, retention-window, or archival operation exists for audit data.
- [ ] Given the privilege configuration, when a test reads `information_schema.table_privileges`, then `cargoexec_app` holds no `UPDATE`, `DELETE`, or `TRUNCATE` on either audit table, and the revocation was created in the same migration as the tables it protects.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Every recorded value attributed to AI or to me, value by value
**As a** cargo specialist, **I want to** have each individual value in the record marked as `AI` or `HUMAN` in origin, **so that** my own contribution to a partially-edited resolution is provable rather than inferred.

**Acceptance Criteria:**
- [ ] Given any table that stores a value (`cargo_entry_field_origins`, `recommendation_values`, `decision_values`, `audit_entry_values`), when its DDL is inspected, then it carries a `NOT NULL` `origin` column constrained to `('AI','HUMAN')` — nullable only for a `before_origin` where no prior value existed.
- [ ] Given a manually typed entry field, when it is persisted, then its origin row satisfies `CHECK (origin = 'HUMAN')`; there is no code path that stores a typed value as `AI`.
- [ ] Given an AI-proposed value, when it is persisted, then its row satisfies `CHECK (origin = 'AI')`; there is no mechanism to mark a proposal human-originated.
- [ ] Given an edit-and-approve decision over three proposed values where one was changed, when `decision_values` is read, then the changed value carries `HUMAN`, the two unchanged carry `AI`, and every row carries `prior_value` and `prior_origin` — zero unattributed values (SM-3).
- [ ] Given an attempt to persist a value with an `origin` outside `{AI, HUMAN}`, when the insert executes, then a `CHECK` constraint rejects it.
- [ ] Given `decision_values`, when the schema is reviewed, then it is the only value table permitting mixed origin, which is exactly where a human edit of a machine proposal is recorded.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.3: My submitted entry preserved exactly as I typed it
**As a** cargo specialist, **I want to** have the entry I submitted kept unchanged as the entry of record, with corrections recorded separately as a resolution, **so that** the audit trail can show a genuine before and after instead of an overwritten value.

**Acceptance Criteria:**
- [ ] Given a received entry, when any later action occurs (recommendation generation, approve, edit-and-approve, reject), then `cargo_entries` and `cargo_entry_field_origins` for that case are byte-identical to their state at receipt.
- [ ] Given a specialist correction to a field, when the decision is recorded, then the corrected value is written to `decision_values` and never to `cargo_entries`.
- [ ] Given the API surface, when routes are enumerated, then no `PUT`, `PATCH`, or `DELETE` route exists for a cargo entry, and no service method updates `cargo_entries` after the receipt transaction.
- [ ] Given a stored string value, when it is read back, then internal whitespace and letter case are preserved exactly as submitted (only leading and trailing whitespace was trimmed); normalisation used for rule evaluation never reaches storage.
- [ ] Given a validation result and its findings, when a decision is later recorded, then `validation_results` and `validation_findings` are unchanged — the stated basis of the exception survives the decision.
- [ ] Given the endpoint catalogue, when it is reviewed, then no endpoint or service method deletes an entry, validation result, exception, decision, or audit entry.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.4: Unambiguous event order with tamper evidence
**As a** cargo specialist, **I want to** read a case's events in one unambiguous order and be told if the record has been tampered with, **so that** nobody can quietly remove or reorder an event between my decision and a later review.

**Acceptance Criteria:**
- [ ] Given a case, when its audit entries are read, then each carries `case_sequence` starting at 1 with `UNIQUE (case_id, case_sequence)` and `CHECK (case_sequence >= 1)`, plus a `global_sequence` identity value giving a total order across cases.
- [ ] Given two concurrent audit writes to the same case, when both commit, then they hold sequences 1 and 2 with correct `prev_entry_hash` linkage and no gap or duplicate, because assignment occurs under `SELECT ... FROM cargo_entries WHERE id = :case_id FOR UPDATE`.
- [ ] Given the first entry of a case, when its hash columns are read, then `prev_entry_hash` is 32 zero bytes; for entry *n > 1* it equals entry *n−1*'s `entry_hash` for the same case, with both columns 32 bytes and `UNIQUE (entry_hash)`.
- [ ] Given an insert whose `prev_entry_hash` does not match the prior entry, when the transaction commits, then a deferred constraint trigger refuses it with `AUDIT_CHAIN_BROKEN`.
- [ ] Given a copy of the database with one middle entry excised, when the verification routine runs, then it reports `chain_verified: false` and the `case_sequence` of the first divergence, and it performs no repair, rewrite, or annotation.
- [ ] Given `occurred_at` on any audit entry, when its provenance is checked, then it is the database's `now()` inside the transaction and is not accepted as a parameter from any client or service.

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.5: Structural impossibility of a case closing without my decision
**As a** cargo specialist, **I want to** have the database itself refuse any case closure that lacks my recorded decision, an audit entry, or a validation basis, **so that** "the AI resolved it" and "nobody knows who decided" are not reachable outcomes even if the application has a bug.

**Acceptance Criteria:**
- [ ] Given an `OPEN` exception, when a transaction sets `state = 'RESOLVED'` without inserting a `decisions` row, then the commit is refused with `HITL_VIOLATION`.
- [ ] Given `decisions.decided_by`, when the schema is inspected, then it is `NOT NULL REFERENCES specialists(id)` and no `AI` or `SYSTEM` principal row exists in `specialists`, so a machine-authored decision fails the foreign key.
- [ ] Given a `decisions` insert with no audit entry referencing that `decision_id`, when the transaction commits, then it is refused with `AUDIT_COUPLING_VIOLATION`; the same applies to a `cargo_entries` insert without `ENTRY_RECEIVED`, a `validation_results` insert without `VALIDATION_COMPLETED`, an `exceptions` insert without `EXCEPTION_OPENED`, and a recommendation status transition without its matching entry.
- [ ] Given a `validation_results` row with `outcome = 'PASS'`, when an `exceptions` row referencing it is inserted, then the composite foreign key `(validation_result_id, validation_outcome)` with `CHECK (validation_outcome = 'FAIL')` rejects the insert (`EXCEPTION_WITHOUT_BASIS`).
- [ ] Given an exception that already has a decision, when a second `decisions` row is inserted for it, then `UNIQUE (exception_id)` rejects it and F11 surfaces HTTP 409 `EXCEPTION_ALREADY_DECIDED`.
- [ ] Given an `EDIT_APPROVE` or `REJECT` decision with a blank or 9-character reason, when it is inserted directly in SQL bypassing the API, then `CHECK (decision_type = 'APPROVE' OR (reason IS NOT NULL AND length(btrim(reason)) >= 10))` rejects it.
- [ ] Given a schema dump, when it is searched, then no `assigned_to`, `assignee_id`, `priority`, `severity_rank`, `sla_due_at`, `age_days`, `role`, `permission`, `exported_at`, `source_system`, `ingestion_batch_id`, `is_seed`, `tariff_*`, or `hts_code` column exists on any table, and no migration inserts demonstration data.

**Priority:** P0 | **Feature Ref:** F0

---
## Epic 1: Cargo Specialist Authentication & Session (F1)

Sign-in exists for a governance reason, not a perimeter reason: the audit trail cannot attribute
a decision to an actor unless that actor is identified. There is exactly one role.

### US-1.1: Sign in as a cargo specialist
**As a** cargo specialist, **I want to** sign in with my email and password on an accessible USWDS sign-in screen, **so that** the decisions I take afterwards are recorded against my identity.

**Acceptance Criteria:**
- [ ] Given the route `/sign-in`, when it renders, then it shows the official-site banner, a header without navigation or sign-out, one `<h1>` "Sign in to CargoExec", an email field (`type="email"`, `autocomplete="username"`), a password field (`type="password"`, `autocomplete="current-password"`), and exactly one primary "Sign in" button.
- [ ] Given correct credentials for an active account, when I submit, then the server creates a server-side session, returns `201` with my `id`, `display_name`, `email`, and a CSRF token, sets the `cargoexec_sid` cookie (`HttpOnly`, `Secure`, `Path=/`, no `Max-Age`, and `SameSite` per the configured cookie profile — `Lax` under the default `governed` profile, `None` only under the cross-origin `demo-iframe` profile, FRD F1 FR-1.3), and I land on `/queue` or the validated `next` path.
- [ ] Given an unknown email and, separately, a wrong password for a known email, when each is submitted, then both responses are byte-identical `401 AUTH_FAILED` with "Email or password is incorrect."; no field-level styling indicates which input was wrong.
- [ ] Given a failed sign-in, when the response renders, then a USWDS error summary appears at the top of `main` with `role="alert"` and `tabindex="-1"`, receives focus, states the generic message, clears the password field, and retains the email value.
- [ ] Given a deactivated account with correct credentials, when I submit, then the response is `403 ACCOUNT_INACTIVE` with "This account is not active." and no session is created.
- [ ] Given the screen and a keyboard only, when I tab, then order is email → password → submit, `Enter` submits from either field, focus is visibly indicated throughout, labels are programmatically associated, and the error summary is associated to the form via `aria-describedby`.
- [ ] Given a submission in flight, when I activate the button again, then the second activation is ignored — the button is `aria-disabled="true"` with visible "Signing in…" text and the status announced politely.
- [ ] Given the sign-in screen, when it is inspected, then it offers no "remember me", no third-party sign-in, no self-registration, no password-reset link, and no invite flow.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.2: Be kept out of the application until I am signed in
**As a** cargo specialist, **I want to** be sent to sign-in whenever I reach a protected screen without a session, **so that** no case data or decision surface is reachable by an unidentified user.

**Acceptance Criteria:**
- [ ] Given no session cookie, when `GET /api/exceptions` is called, then the response is `401` with body `{"error":{"code":"UNAUTHENTICATED","message":"Sign in to continue."}}`, no data, and no redirect.
- [ ] Given no session, when I navigate the browser to `/queue`, then I am redirected `302` to `/sign-in?next=%2Fqueue`.
- [ ] Given a `next` parameter that is not a same-origin absolute path matching `^/[A-Za-z0-9/_\-]*$`, when sign-in succeeds, then the value is discarded and I land on `/queue` (open-redirect prevention).
- [ ] Given a valid session, when I navigate to `/sign-in`, then I am redirected `302` to `/queue`.
- [ ] Given a state-changing request without a matching `X-CSRF-Token` header, when it is sent, then the response is `403 CSRF_INVALID`, no state changes, and no audit entry is written.
- [ ] Given the route table, when it is reviewed, then every route and endpoint except `POST /api/session`, `GET /sign-in`, and static assets requires a valid session, and authorisation is binary — no role, permission, scope, or RBAC check exists anywhere.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.3: Have my identity attached to everything I do
**As a** cargo specialist, **I want to** have my signed-in identity — and only my signed-in identity — recorded as the actor on every change I cause, **so that** the audit trail names a real accountable person and cannot be made to name someone else.

**Acceptance Criteria:**
- [ ] Given an authenticated request, when a handler writes an audit entry, then `audit_entries.actor_specialist_id` is taken from the request principal resolved from the session cookie.
- [ ] Given a request body containing `decided_by`, `actor`, `on_behalf_of`, or `specialist_id`, when it is submitted to any endpoint, then it is rejected as an unknown field with `422 REQUEST_MALFORMED` and nothing is written.
- [ ] Given a `SYSTEM`-actor derivation inside my request (validation completion, exception opening), when its audit entry is written, then `actor_type = 'SYSTEM'` and the entry still records me as the specialist whose submission caused it.
- [ ] Given an `AI`-actor entry, when it is written, then `actor_type = 'AI'` and `actor_specialist_id` is `NULL`, enforced by a `CHECK` on the actor pairing.
- [ ] Given the deployment, when accounts are provisioned, then they are created only by the operational CLI (`create-specialist --email --display-name`); there is no self-registration endpoint, no password-reset endpoint, and no user-administration screen.
- [ ] Given logs, error responses, and audit entries, when they are searched, then no plaintext password, password hash, session token, CSRF token, or AI provider key appears; log lines reference a session by its `id` only.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.4: Have my session end predictably and sign out deliberately
**As a** cargo specialist, **I want to** sign out explicitly and have an idle or overlong session expire on its own, **so that** my identity cannot be used at my unattended workstation and my in-progress typing is never submitted on my behalf.

**Acceptance Criteria:**
- [ ] Given a session created at *T*, when a request arrives after `T + 8 hours`, then it is rejected `401 UNAUTHENTICATED` regardless of activity, and `sessions.revoked_at` is set with `revocation_reason = 'EXPIRED'`.
- [ ] Given a session whose last request was 31 minutes ago, when the next request arrives, then it returns `401` and the session is marked revoked with reason `EXPIRED`.
- [ ] Given I activate "Sign out" in the header, when the client sends `DELETE /api/session` with the CSRF header, then the server sets `revoked_at` with reason `SIGNED_OUT`, clears the cookie, returns `204`, and I land on `/sign-in` with a confirmation announced in the polite live region.
- [ ] Given a signed-out session cookie, when it is replayed on any endpoint, then the response is `401`.
- [ ] Given a session that expires while I am filling in a form, when the next API call returns `401`, then the client discards state, navigates to `/sign-in?next={current path}`, and announces "Your session expired. Sign in again to continue." — and after re-authentication my unsaved input is **not** silently submitted.
- [ ] Given two browsers signed in as me, when I sign out of one, then only that session is revoked and the other remains valid; no session-management screen exists.
- [ ] Given sign-in, sign-out, and expiry events, when `audit_entries` is queried, then none of them wrote a case audit entry — session history lives on the `sessions` table, because no case state changed.

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.5: Be protected from repeated guessing at my account
**As a** cargo specialist, **I want to** have repeated failed sign-in attempts against my email throttled, **so that** my identity — the thing every decision is attributed to — cannot be brute-forced.

**Acceptance Criteria:**
- [ ] Given 5 failed attempts for one normalised email within a rolling 15-minute window, when a sixth is submitted, then the response is `429 TOO_MANY_ATTEMPTS` with a `Retry-After` header, for 15 minutes.
- [ ] Given a throttled email that does not exist in `specialists`, when it is submitted, then the throttled response is identical to that for an existing email, disclosing nothing about account existence.
- [ ] Given a `429`, when the screen renders, then "Too many sign-in attempts. Try again in about 15 minutes." appears in the same focus-receiving error-summary pattern as a failed sign-in.
- [ ] Given a successful sign-in, when it completes, then the throttle counter for that identifier is reset and `specialists.last_sign_in_at` is updated.
- [ ] Given throttle state, when the schema is inspected, then it is held in the application's own store keyed by a hash of the email — there is no account-lockout flag, no unlock surface, and no administrative role to operate one.
- [ ] Given a sign-in attempt for an email with no matching row, when it is processed, then password verification still runs against a dummy hash so response timing does not disclose account existence.

**Priority:** P1 | **Feature Ref:** F1

---
## Epic 2: USWDS Application Shell & Accessibility Foundation (F2)

The accessible, USWDS-conformant foundation every screen inherits. Conformance is a property of
what ships, achieved by design and **manual** review with an assistive-technology walkthrough per
screen — there is no automated accessibility gate and no CI workflow in v1 (PRD §10 #1).

> **Phase 7 note — visual system replaced, accessibility bar unchanged.** As of Phase 7, USWDS is
> being replaced as the visual system by a newly-approved external design; the specific
> replacement tokens, components, and class names are not yet decided and are deferred to Phase 7
> discovery/UX planning (PRD §4.1, §5.1 F2). The stories below that name USWDS specifically by
> component, token, or class — US-2.1, US-2.4, US-2.5, US-2.6 — are **retained verbatim as the
> Phase-6/USWDS baseline** and are superseded in place, not rewritten here, pending the Phase-7
> UI-SPEC that restates them against the new design system's actual tokens and components (FRD F2
> §Phase 7 note; FR-2.1, FR-2.2, FR-2.3, FR-2.5, FR-2.11, FR-2.12, FR-2.13, FR-2.18, FR-2.20,
> FR-2.22). What does **not** move, independent of which design system implements it, is asserted
> outcome-based by new **US-2.7** below: full Section 508 / WCAG 2.1 AA conformance, no bespoke
> interactive control without a documented accessible equivalent, and the mandatory per-screen
> manual review — never an automated gate.

### US-2.1: Work in a page frame that looks and behaves like a federal application
**As a** cargo specialist, **I want to** work inside a standard USWDS page shell with an official-site banner and correct landmarks, **so that** the application behaves the way every other federal system I use behaves and my assistive technology can navigate it structurally.

**Acceptance Criteria:**
- [ ] Given any screen, when its DOM is inspected, then it contains exactly one `<header role="banner">`, one `<main id="main-content">`, one `<footer role="contentinfo">`, and — when authenticated — exactly one `<nav aria-label="Primary">`.
- [ ] Given any screen, when I press Tab from page load, then the first focusable element is "Skip to main content" and activating it moves focus into `main`.
- [ ] Given any screen including sign-in, when it renders, then the USWDS government banner ("An official website of the United States government") appears above the header with its expandable detail operable by keyboard.
- [ ] Given an authenticated screen, when the header renders, then it shows the product name linking to `/queue`, my display name, and a "Sign out" control wired to `DELETE /api/session`; the sign-in screen renders neither navigation nor sign-out.
- [ ] Given any interactive control on any screen, when it is reviewed against the USWDS conformance register, then it is a USWDS component or a documented USWDS-conformant composition, and typography, spacing, and colour come from USWDS design tokens with no hard-coded hex or pixel values in screen-level styles.
- [ ] Given a demonstration environment with no external network access, when a screen loads, then USWDS styles, fonts, and the icon sprite render correctly because they are bundled and served by the application itself.
- [ ] Given any screen, when the document is inspected, then `<html lang="en">` is set and the title follows `{Screen name} — CargoExec` and is unique per screen.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.2: Move between exactly the two places the product has
**As a** cargo specialist, **I want to** navigate between the review queue and the new-entry form and nothing else, **so that** the interface offers me only the work that exists rather than implying dashboards or reports that do not.

**Acceptance Criteria:**
- [ ] Given primary navigation, when it renders, then it contains exactly two destinations: "Review queue" (`/queue`) and "New cargo entry" (`/entries/new`).
- [ ] Given the current screen, when navigation renders, then the current destination carries `aria-current="page"`.
- [ ] Given the rendered DOM of any authenticated screen, when it is searched, then no third navigation item exists — no dashboard, reports, metrics, settings, administration, or export item.
- [ ] Given an unknown route, when I navigate to it, then a "Page not found" screen renders inside the shell with a link to `/queue`, focus moves to its `<h1>`, and the title is announced politely.
- [ ] Given a route requiring a session, when the session check has not resolved, then no protected screen content renders (no flash of protected content).
- [ ] Given an unhandled client-side exception, when it occurs, then the shared `ErrorState` component renders with a generic cause and a "Try again" action rather than a blank page, and no stack trace is shown.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.3: Complete every task using the keyboard alone
**As a** cargo specialist, **I want to** reach and operate every control with the keyboard and always see where focus is, **so that** I can do my whole job without a pointer, as some specialists in my role must.

**Acceptance Criteria:**
- [ ] Given any screen, when I traverse it with Tab and Shift+Tab, then every interactive component is reachable and operable in DOM order, with no keyboard trap and no `tabindex` value greater than 0.
- [ ] Given any focusable element, when it receives focus, then a visible focus indicator meeting WCAG 2.1 AA non-text contrast is shown; `outline: none` without a compliant replacement appears nowhere.
- [ ] Given a completed navigation, when the new screen renders, then the document title is set, the title is announced in the polite live region, and focus moves to the screen's `<h1>` (which carries `tabindex="-1"`).
- [ ] Given a content replacement that is not a navigation (for example recording a decision in place), when it completes, then focus is moved deliberately to the element that explains the outcome — the error summary on failure, the confirmation heading on success.
- [ ] Given the five product tasks (sign in; create an entry and read its outcome; open a queue case; edit/approve/reject with a reason; read the audit trail), when each is attempted with the keyboard alone, then all five complete successfully (SM-11).
- [ ] Given every interactive element, when its accessible name is checked, then one is present; no icon-only control is used for a primary action, and a decorative icon accompanying text is `aria-hidden="true"`.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.4: Be told clearly what went wrong and where, in a way my screen reader announces
**As a** cargo specialist, **I want to** get an error summary that takes my focus, inline messages bound to the offending fields, and status changes announced, **so that** I can correct a submission without hunting the page for what failed.

**Acceptance Criteria:**
- [ ] Given a form whose submission the server rejected, when the response renders, then an error summary is the first child of the form region with `role="alert"` and `tabindex="-1"`, receives focus, and lists one item per error in the exact order the server returned them.
- [ ] Given an error-summary item, when I activate it, then focus moves to the corresponding control by `id`.
- [ ] Given a field with an error, when it renders, then the message sits inside the field's USWDS error wrapper, is associated via `aria-describedby`, the control carries `aria-invalid="true"`, and the text states what is wrong and what to do in plain language rather than exposing a raw error code as its only content.
- [ ] Given the shell, when it loads, then one `aria-live="polite"` status region and one `aria-live="assertive"` alert region are present in the DOM from the outset, so later insertions are announced.
- [ ] Given a validation failure, when focus moves to the summary, then the assertive region announces "{n} problems with your submission", and announcements do not duplicate text that focus movement already reads.
- [ ] Given every form control on any screen, when inspected, then it has a `<label for>` bound to its `id`, hint text associated via `aria-describedby`, and no placeholder used as a label or as the only hint.
- [ ] Given a form with required fields, when it renders, then required fields carry the USWDS required indicator plus `required`, the convention is stated above the first field, and optional fields are visibly marked "(optional)" where a form mixes both.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.5: Tell an AI value from a human value without relying on colour
**As a** cargo specialist, **I want to** see one consistent provenance badge that states "AI-suggested" or "Specialist-entered" in text and icon, **so that** I can tell machine proposals from human values on sight, through my screen reader, and in monochrome.

**Acceptance Criteria:**
- [ ] Given any displayed value or event with a provenance, when it renders, then the shared badge component shows a text label ("AI-suggested" / "Specialist-entered"), a distinct icon, and a token-based colour treatment — never colour alone.
- [ ] Given the badge, when a screen reader reads it, then the provenance is exposed as text (visually hidden text where the visual treatment is compact), so an assistive-technology user receives the same distinction.
- [ ] Given the case detail, decision, and audit trail regions, when each renders, then they use this component without variation.
- [ ] Given CSS colour overridden to monochrome, when I review the case detail, decision, and audit trail regions, then AI-versus-human origin remains discoverable on every value and every event.
- [ ] Given validation error indication and exception state, when they render, then each is conveyed by icon plus text or a text label — never by red alone or a coloured dot alone.
- [ ] Given text and meaningful non-text elements, when contrast is measured, then body text meets 4.5:1 and large text and UI component boundaries meet 3:1 using approved USWDS token pairings.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.6: Have every screen reviewed and signed off for accessibility before it is called done
**As a** cargo specialist, **I want to** use screens that have each passed a written accessibility checklist including a screen-reader walkthrough, **so that** conformance is a property of what I am given rather than a promise attached to a later release.

**Acceptance Criteria:**
- [ ] Given each of the six screens/regions (sign-in, entry form, queue, case detail, decision, audit trail), when it is declared delivered, then a signed checklist record exists naming the reviewer, the date, the screen, and any defects with their resolution (SM-10: 100% of screens reviewed).
- [ ] Given the checklist, when it is applied, then it covers at minimum: single `h1` and descending heading order; landmarks; skip link; label and hint association; required marking; error-summary focus movement; inline error association; full keyboard traversal and keyboard-only task completion; visible focus; AA contrast; colour independence of provenance, error, and state; live-region announcement of each status and error; 200% zoom and 320 px reflow; reduced-motion behaviour; and an assistive-technology walkthrough of the screen's primary task.
- [ ] Given any screen at 200% browser zoom and at a 320 CSS-pixel viewport width, when I use it, then no function or content is lost and body content does not scroll horizontally; the layout remains usable at tablet width.
- [ ] Given `prefers-reduced-motion: reduce`, when a screen renders, then transitions and animated indicators are disabled or reduced to instantaneous state changes, nothing relies on motion to be understood, and nothing auto-animates beyond 5 seconds.
- [ ] Given the repository, when it is inspected, then there is no `.github/workflows` directory, no axe-core job, and no accessibility test runner in the build pipeline — the checklist is the enforcement mechanism and is therefore mandatory.
- [ ] Given the shared state components (`Loading`, `Empty`, `ErrorState`, `Degraded`, `ReadOnlyNotice`), when any screen needs one, then it uses the shell's component rather than re-implementing it, and a load exceeding 300 ms renders the USWDS loading indicator with `aria-busy="true"` and an announced "Loading…".
- [ ] Given any interactive screen (sign-in, entry form, queue, case detail, audit trail), when it is measured under demonstration load, then render completes within 2 seconds.

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.7: Keep meeting federal accessibility standards no matter which visual system renders the shell
**As a** cargo specialist, **I want to** work in a shell that conforms to Section 508 / WCAG 2.1 AA regardless of which visual design system implements it, **so that** replacing what the application looks like never becomes a regression in who can use it.

**Acceptance Criteria:**
- [ ] Given the shell rendered under the Phase 7 visual system, when it is reviewed against the checklist, then it still meets Section 508 / WCAG 2.1 AA in full — landmarks, skip link, single `h1` and descending heading order, label/hint association, required-field indication, error-summary focus movement, full keyboard operability, visible focus, AA contrast, colour-independent signalling, and live-region announcement — with no criterion relaxed because the visual system changed (PRD §4.1, §5.1 F2; NFR-1, NFR-2).
- [ ] Given any interactive control introduced under the new visual system, when it is reviewed, then it is either drawn from that design system's own accessible component set, or a documented accessible-equivalence record exists naming the standard control or ARIA pattern it reproduces — a bespoke, undocumented control is not permitted under either design system (FRD F2 §Phase 7 note).
- [ ] Given the provenance badge, validation-error indication, and exception-state signalling that US-2.5 requires to be colour-independent, when the new visual system replaces their styling, then the same colour-independence property holds — text label plus icon, never colour alone — regardless of which token set supplies the colour.
- [ ] Given the per-screen accessibility review checklist (US-2.6), when a screen is re-delivered under the new visual system, then it is re-signed-off against that same checklist rather than carrying forward a Phase-6 sign-off for content that has visually changed.
- [ ] Given the FRD's Phase 7 note superseding the 26 USWDS-named rules in place, when this gap between USWDS removal and the Phase-7 UI-SPEC is reviewed, then this story — not a rewrite of US-2.1, US-2.4, US-2.5, or US-2.6 — is what continues to assert the accessibility bar during it.
- [ ] Given the repository, when it is inspected after the Phase 7 redesign ships, then there is still no `.github/workflows` accessibility gate and no axe-core job — conformance continues to be demonstrated by the manual checklist alone (PRD §10 #1).

**Priority:** P0 | **Feature Ref:** F2

---
## Epic 3: Manual Cargo Entry Creation (F3)

The only way data enters CargoExec: one human filling in one form. Receipt is atomic — persist,
validate, open an exception on failure, write the audit entries — in a single transaction.

### US-3.1: Have my entry received and assessed in one indivisible step
**As a** cargo specialist, **I want to** submit a cargo entry and have it persisted, validated, and turned into an exception if it fails, all in one transaction, **so that** an entry can never sit in the system having been received but never assessed.

**Acceptance Criteria:**
- [ ] Given an authenticated request with a valid CSRF token to `POST /api/entries`, when the body is one JSON object of the fourteen entry fields, then the server persists the entry with `created_by`, `received_at`, and a `case_reference` of the form `CE-{YYYY}-{NNNNNN}` allocated inside the transaction.
- [ ] Given an entry with only `goods_description` filled in, when it is submitted, then the response is `201` with `receipt_outcome: "EXCEPTION_OPENED"`, the case reference, the full validation result with findings, and `exception: { id, state: "OPEN", receipt_position }`.
- [ ] Given a complete, rule-satisfying entry, when it is submitted, then the response is `201` with `receipt_outcome: "VALIDATED_CLEAN"` and `exception: null`.
- [ ] Given a forced failure in the audit writer during receipt, when the transaction aborts, then zero `cargo_entries` rows exist for that submission, the response is `500 RECEIPT_FAILED` with "The entry could not be received. Nothing was saved. Try again.", and no orphan validation result or exception exists.
- [ ] Given receipt has committed, when the response is produced, then it is returned without waiting for AI generation; the `recommendations` row was created `PENDING` inside the transaction and generation is dispatched only after commit.
- [ ] Given the AI provider is stopped entirely, when an entry is submitted, then the receipt response is unchanged in shape and status.
- [ ] Given `GET /api/entries/{entryId}`, when it is called for a received entry, then it returns the stored values, `case_reference`, `received_at`, the submitting specialist's id and display name, per-field `HUMAN` origin, the validation result with findings, the `receipt_outcome`, and the exception's `id`, `state`, and `receipt_position` where one exists.

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.2: Have my keystrokes recorded exactly as typed and attributed to me
**As a** cargo specialist, **I want to** have every value I submit stored exactly as I typed it and marked `HUMAN` in origin, **so that** the audit record shows what I actually entered and gives a baseline against which any later AI proposal is compared.

**Acceptance Criteria:**
- [ ] Given a submitted field with a non-empty value, when receipt commits, then one `cargo_entry_field_origins` row exists for it with `origin = 'HUMAN'`.
- [ ] Given an absent property, an empty string, and a whitespace-only string for the same field, when each is submitted, then all three are treated identically as "not provided": the field is stored as `NULL` and receives **no** origin row.
- [ ] Given I type `abc12345678` into `entry_number`, when receipt commits, then `abc12345678` — not `ABC12345678` — is the stored value and the value appearing in the audit trail; normalisation applies only to rule comparison.
- [ ] Given a string field, when it is stored, then only leading and trailing whitespace has been trimmed; internal whitespace and letter case are preserved.
- [ ] Given the `ENTRY_RECEIVED` audit entry, when it is read, then it carries one value row per submitted field with `after_value` equal to the submitted value and `after_origin = 'HUMAN'`.
- [ ] Given `quantity` or `declared_value_usd` submitted as a numeric string, when it is stored, then it is not rounded, reformatted, or localised.

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.3: Be told plainly when the entry number already exists
**As a** cargo specialist, **I want to** be stopped with a clear message and a route to the existing case when I reuse an entry number, **so that** I do not create a second case for a shipment that is already in the system.

**Acceptance Criteria:**
- [ ] Given an entry number already stored on another entry, when I submit it, then the response is `409 ENTRY_NUMBER_DUPLICATE` with "Entry number {n} already exists on case {ref}." and nothing is persisted.
- [ ] Given that `409`, when the response body is read, then it identifies the `case_reference` of the existing entry so the UI can link to it.
- [ ] Given the validation rule set, when it is inspected, then entry-number uniqueness is deliberately **not** a `RIV-*` rule and therefore never produces a finding or an exception, because a uniqueness test depends on database state and would break determinism.
- [ ] Given two submissions of the same complete content with different entry numbers, when both are received, then two distinct entries exist — receipt is not idempotent and accepts no idempotency key.
- [ ] Given a structurally malformed request (unknown property, wrong type, over-length string, non-object body), when it is submitted, then the response is `422 REQUEST_MALFORMED` naming each offending field, and nothing is persisted and no audit entry is written.
- [ ] Given a request body over 64 KB, when it is submitted, then the response is `413 REQUEST_TOO_LARGE`; given a non-JSON content type, `415 UNSUPPORTED_MEDIA_TYPE`; given a non-uuid entry id on retrieval, `400 INVALID_IDENTIFIER`.

**Priority:** P1 | **Feature Ref:** F3

---

### US-3.4: Have no way to get data in that skips validation
**As a** cargo specialist, **I want to** have manual entry be the only ingestion path and validation be unskippable, **so that** every case in the queue has a genuine validation basis behind it and the loop has no back door.

**Acceptance Criteria:**
- [ ] Given a request body that is a JSON array, a multipart upload, or `text/csv`, when it is submitted to `POST /api/entries`, then it is rejected (`422 REQUEST_MALFORMED` or `415 UNSUPPORTED_MEDIA_TYPE`) and no batch wrapper is accepted.
- [ ] Given a property such as `skip_validation`, `force`, or `validate: false`, when it is included in the body, then it is rejected as an unknown field with `422 REQUEST_MALFORMED`; no request parameter, header, environment variable, or configuration switch skips, defers, weakens, or re-runs validation.
- [ ] Given the deployed application, when its routes and CLI commands are enumerated, then there is no import endpoint, no bulk-upload endpoint, no ingestion adapter, no CLI import command, and no ACE/ATS interface.
- [ ] Given the route table, when it is reviewed, then no `PUT`, `PATCH`, or `DELETE` route exists for a cargo entry and no `GET /api/entries` collection route exists — the only list surface in the product is the receipt-ordered open-exception queue.
- [ ] Given every received entry, when `validation_results` is queried, then exactly one row exists per entry, written inside that entry's receipt transaction.
- [ ] Given the deployed database, when migrations are reviewed, then none inserts a cargo entry, exception, recommendation, decision, or audit entry — there is no seeded demonstration dataset.

**Priority:** P0 | **Feature Ref:** F3

---
## Epic 4: Required-Information Validation on Receipt (F4)

The deterministic, explanatory rule evaluation that runs against every entry at the moment of
receipt, rule set `RIV-2026.09`. Its findings are the substance of the exception, the input the AI
reasons over, and the text the specialist reads.

> **[ASSUMPTION] The rule *content* is an implementation assumption, open to CBP refinement**
> (FRD F4 §[ASSUMPTION]). The PRD defines the validation *mechanism*; the 31 `RIV-*` rules,
> their thresholds, messages and domain code lists are a concrete demonstration-appropriate set,
> not a CBP-authored requirement. The rule ids and counts asserted in the criteria below are
> therefore testable against the rule set *as specified*, and will change with it. The rule
> *characteristics* are not open: every rule must remain deterministic, limited to presence /
> format / closed-domain membership, and independently testable, and none may compute a duty,
> assign an HTS or classification code, or make a substantive customs determination
> (PRD §10 #9). Stories US-4.1 … US-4.4 verify those characteristics; the specific ids verify
> the current set.

### US-4.1: Have my entry checked against the required-information rules the moment I submit it
**As a** cargo specialist, **I want to** have every applicable required-information rule evaluated on receipt with every failure reported, **so that** I learn everything that is wrong with the entry in one pass instead of one problem at a time.

**Acceptance Criteria:**
- [ ] Given an entry with every field blank, when it is received, then validation produces exactly the 13 presence findings `RIV-010, RIV-020, RIV-030, RIV-040, RIV-050, RIV-060, RIV-070, RIV-080, RIV-090, RIV-100, RIV-110, RIV-120, RIV-130` and no format or domain findings.
- [ ] Given an entry with several independent problems, when it is received, then evaluation does not short-circuit on the first failure — every applicable rule is evaluated and every failure is reported.
- [ ] Given `mode_of_transport = "AIR"` with only a bill of lading present, when the entry is received, then finding `RIV-070` (`TRANSPORT_DOCUMENT_MISSING`) is produced.
- [ ] Given both `bill_of_lading_number` and `air_waybill_number` present, when the entry is received, then finding `RIV-073` (`TRANSPORT_DOCUMENT_CONFLICT`) is produced.
- [ ] Given `goods_description = "assorted goods"`, when the entry is received, then `RIV-092` (`GOODS_DESCRIPTION_NOT_SPECIFIC`) is produced; given `"Stainless steel fasteners, M8"`, then no goods-description finding is produced.
- [ ] Given an `arrival_date` more than 60 days before or more than 180 days after the entry's own `received_at`, when the entry is received, then `RIV-132` (`ARRIVAL_DATE_OUT_OF_WINDOW`) is produced.
- [ ] Given the rule registry, when the startup self-check runs, then the registry's rule id set exactly matches the documented `RIV-2026.09` table; on mismatch the application refuses to start with `RULE_SET_INVALID` rather than validating inconsistently.
- [ ] Given the rule set, when it is reviewed, then no rule computes a duty amount, assigns or checks an HTS or classification code, derives a rate, or makes any substantive customs determination — checks are presence, format, and closed-domain membership only.

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.2: Read a plain-language reason naming the rule and the field
**As a** cargo specialist, **I want to** see each failure as a plain-language instruction bound to a named field, without duplicate or contradictory messages for the same field, **so that** the basis of the exception is never arbitrary or confusing to me or to a later reviewer.

**Acceptance Criteria:**
- [ ] Given a finding, when it is produced, then it carries exactly `{ rule_id, field_name, failure_code, message }` and its `field_name` resolves to a control on the entry form.
- [ ] Given an empty `port_of_entry_code`, when the entry is received, then only `RIV-030` (`PORT_OF_ENTRY_MISSING`, "Enter the port of entry code.") is produced — `RIV-031` and `RIV-032` are skipped by presence gating, so I never see "enter the port code" and "port code must be 4 digits" for the same empty field.
- [ ] Given `port_of_entry_code = "ZZ"`, when the entry is received, then only `RIV-031` (`PORT_OF_ENTRY_FORMAT`) is produced, not `RIV-032`; given `"9999"` (well-formed but unknown), then only `RIV-032` (`PORT_OF_ENTRY_UNKNOWN`) is produced.
- [ ] Given a message, when it is rendered, then it is plain-language and imperative where a corrective action exists, and contains no rule identifier, regular expression, or internal jargon; a rule id may appear only as supplementary small text.
- [ ] Given a message interpolating `{value}`, when it renders, then the submitted (non-normalised) value is used, truncated to 60 characters with an ellipsis if longer, and HTML-escaped.
- [ ] Given any finding, when it is inspected, then it carries no severity, weight, score, priority, or risk rating, and the outcome is not graded — an entry either satisfies every applicable rule or it does not.
- [ ] Given the findings of one validation result, when they are emitted, then they are ordered by ascending `rule_id`, and that order is consumed unchanged by the receipt response, the entry-form error summary, the case detail findings list, and the AI prompt.

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.3: Rely on the same entry always producing the same findings
**As a** cargo specialist, **I want to** have validation be fully deterministic, **so that** the stated basis of a case is reproducible when it is questioned a year later and never looks like it depended on when it ran.

**Acceptance Criteria:**
- [ ] Given one entry's content, when it is validated twice in the same process and once in a second process, then the outcome and the finding list are identical and identically ordered, byte-for-byte when serialised.
- [ ] Given a stored entry with a date-window finding, when validation is recomputed a month later, then `RIV-132` yields the same result, because it evaluates against the entry's own persisted `received_at` rather than the wall clock.
- [ ] Given any rule implementation, when its dependencies are checked under unit-test isolation, then it references no system clock, database, network call, random source, or mutable configuration.
- [ ] Given the domain code lists (`PORT_OF_ENTRY`, `COUNTRY`, `UNIT_OF_MEASURE`, `GENERIC_DESCRIPTION`), when the schema and deployment are inspected, then they are compiled-in constants versioned with `rule_set_version` — not database tables, seeded rows, editable configuration, or runtime-administered reference data.
- [ ] Given each rule, when tests are reviewed, then it is a discrete, independently unit-testable predicate registered by `rule_id` with at least one passing and one failing case.
- [ ] Given a rule predicate that throws, when receipt runs, then the whole receipt transaction aborts with `VALIDATION_ENGINE_FAILURE` surfaced as `500 RECEIPT_FAILED` and I am told nothing was saved — rather than an entry being stored with a partial verdict.

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.4: Have a clean entry recorded as explicitly clean
**As a** cargo specialist, **I want to** have an entry that satisfies every rule recorded as a positive clean pass with no exception, **so that** the absence of a case is itself evidenced rather than inferred from missing data.

**Acceptance Criteria:**
- [ ] Given an entry satisfying every applicable rule, when it is received, then exactly one `validation_results` row is persisted with `outcome = 'PASS'`, zero `validation_findings` rows, and no exception is opened.
- [ ] Given any validation result, when it is read, then it carries `outcome`, `rule_set_version`, `evaluated_at`, `rules_evaluated_count`, and `findings_count`, with `UNIQUE (entry_id)`.
- [ ] Given a `PASS` result, when the receipt response is returned, then `receipt_outcome` is `VALIDATED_CLEAN` and `exception` is `null`.
- [ ] Given a persisted validation result or finding, when an update or delete is attempted, then no application code path exists to perform it — a later human resolution does not amend the findings, it is recorded separately as a decision.
- [ ] Given the API surface, when it is enumerated, then there is no `POST /api/validate`, no re-validate action, no scheduled re-evaluation, and no UI control that re-runs validation on a stored entry.
- [ ] Given a clean entry's case reference, when `GET /api/exceptions/{reference}` is called, then the response is `404 EXCEPTION_NOT_FOUND` with the distinguishing message "That entry passed validation, so it has no exception."

**Priority:** P0 | **Feature Ref:** F4

---
## Epic 5: Exception Creation from Validation Failure (F5)

An exception is the failure outcome of validation and nothing else — derived, never authored.

### US-5.1: Have a failing entry become a case with a stated basis
**As a** cargo specialist, **I want to** have an entry that fails validation automatically open one exception carrying the findings as its stated basis, **so that** "why is this case open" is always answerable from the record and never a matter of inference.

**Acceptance Criteria:**
- [ ] Given a validation result with `outcome = 'FAIL'` and *n* ≥ 1 findings, when receipt commits, then exactly one `exceptions` row exists for that entry with `state = 'OPEN'`, `opened_at` set, `decision_id = NULL`, and `closed_at = NULL`.
- [ ] Given that exception, when it is read, then it references its `validation_result_id` with `validation_outcome = 'FAIL'`, and the findings are read through that reference rather than copied in mutable form, so the basis and the record of the basis cannot diverge.
- [ ] Given an entry that passes validation, when receipt commits, then no exception exists for it (100% derivation for failures, zero exceptions without a basis — SM-8).
- [ ] Given a failing entry, when receipt commits, then exactly one `EXCEPTION_OPENED` audit entry exists for the case with `before_state = NULL`, `after_state = 'OPEN'`, `actor_type = 'SYSTEM'`, the submitting specialist recorded, and one value row per finding.
- [ ] Given a receipt transaction in which the `EXCEPTION_OPENED` audit entry is missing, when it commits, then a deferred constraint trigger refuses the commit with `AUDIT_COUPLING_VIOLATION` and no exception is persisted.
- [ ] Given a newly opened exception, when it is read, then a `recommendations` row exists with `status = 'PENDING'` and no `decisions` row exists; the placeholder writes no audit entry of its own and affects no state.
- [ ] Given any exception, when `exceptions.entry_id` is checked, then it is `UNIQUE` — an entry can never accumulate a second exception.

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.2: Have cases ordered by when they arrived, permanently
**As a** cargo specialist, **I want to** have each exception stamped with an immutable receipt position at creation, **so that** I can work the queue from the top in a stable order that never rearranges itself under me.

**Acceptance Criteria:**
- [ ] Given three sequential failing entries, when each opens an exception, then each receives a strictly increasing `receipt_position` from a dedicated database sequence, `NOT NULL UNIQUE`.
- [ ] Given an exception, when any later action occurs, then `receipt_position` is unchanged — no application code path updates it.
- [ ] Given a rolled-back receipt that had already allocated a position, when subsequent entries are received, then the sequence gap remains and is never compacted, renumbered, or reused, and the queue order of surrounding cases is unaffected.
- [ ] Given the queue projection, when it is built, then `receipt_position` is the only ordering attribute exposed to it.
- [ ] Given an `exceptions` row, when its columns are inspected, then no `priority`, `severity`, `risk_score`, `due_at`, `sla_*`, `assigned_to`, `claimed_by`, or `escalated_at` column exists, and no such value is derivable from any API response.
- [ ] Given the case detail screen, when it renders, then the numeric receipt position is not displayed as a place-in-queue, age, duration, or due date.

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.3: Have no way to open, reopen, or park a case outside the loop
**As a** cargo specialist, **I want to** have exceptions be creatable only by a validation failure and closable only by my decision, **so that** the link between the unsatisfied rule and the open case holds for the life of the case and no workflow state hides work from the record.

**Acceptance Criteria:**
- [ ] Given the API surface, when it is enumerated, then there is no `POST /api/exceptions`, no admin creation tool, and no UI affordance that opens an exception; the only mutating exception endpoint is `POST /api/exceptions/{id}/decision`.
- [ ] Given the exception service, when it is invoked with a `PASS` validation result or with zero findings, then it raises `EXCEPTION_WITHOUT_BASIS`, the receipt transaction aborts, and nothing is saved.
- [ ] Given `exceptions.state`, when its allowed values are inspected, then they are exactly `OPEN`, `RESOLVED`, `REJECTED`, with transitions `OPEN → RESOLVED` and `OPEN → REJECTED` only; `RESOLVED` and `REJECTED` are terminal and no reopen, revert, or un-resolve transition exists.
- [ ] Given the state enumeration, when it is checked, then no `IN_PROGRESS`, `ON_HOLD`, `ESCALATED`, `PENDING_REVIEW`, `CLAIMED`, or `SNOOZED` state exists — each would imply workflow, assignment, or supervision that is out of scope.
- [ ] Given a direct SQL `UPDATE exceptions SET state = 'RESOLVED'` with no `decisions` row, when it is committed, then it fails with `HITL_VIOLATION`; the decision handler is the only writer of `state`, `closed_at`, and `decision_id`.
- [ ] Given `closed_at` and `decision_id`, when constraints are inspected, then both are `NULL` while `state = 'OPEN'` and `NOT NULL` in a terminal state — a closed exception with no decision, or an open exception with a decision, is unrepresentable.
- [ ] Given the endpoint catalogue, when it is reviewed, then no endpoint or service method deletes an exception.

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.4: Identify a case by one human-readable reference everywhere
**As a** cargo specialist, **I want to** refer to a case by a single readable reference used in the UI, the URL, and the audit trail, **so that** I can quote a case to a colleague or a reviewer without translating identifiers.

**Acceptance Criteria:**
- [ ] Given a received entry, when its case reference is allocated, then it matches `^CE-[0-9]{4}-[0-9]{6}$` (for example `CE-2026-000137`), is unique across the deployment, uses the UTC year of receipt, and is allocated inside the receipt transaction.
- [ ] Given a case reference, when any later action occurs, then it is immutable.
- [ ] Given an exception's API representation, when it is returned, then the case reference is obtained by join from the entry rather than duplicated, so one case has exactly one reference in exactly one place.
- [ ] Given `GET /api/exceptions/{idOrReference}`, when either the exception uuid or the case reference is supplied, then both resolve to the same case.
- [ ] Given a URL containing the exception uuid, when the case detail screen loads, then it canonicalises the address bar to `/cases/CE-YYYY-NNNNNN` so shared links always show the human-readable reference.
- [ ] Given a case reference, when it appears in the receipt outcome, the queue row, the case header, and each audit event, then it is the identical string in all four places.

**Priority:** P0 | **Feature Ref:** F5

---
## Epic 6: Cargo Entry Web UI (F6)

Screen `/entries/new`. Because there is no seeded dataset, this screen is the beginning of every
demonstration path, and its explicitness about the receipt outcome is what makes the *validate*
and *except* stages visible rather than inferred.

### US-6.1: Fill in a cargo entry on a clearly labelled USWDS form
**As a** cargo specialist, **I want to** complete a labelled entry form that tells me the expected format of each field, **so that** I can type an entry quickly and correctly without guessing at conventions.

**Acceptance Criteria:**
- [ ] Given `/entries/new`, when it renders, then it shows one `<h1>` "New cargo entry", a one-sentence explanation that the entry is checked against required-information rules as soon as it is submitted, and the statement "A star (*) marks required information."
- [ ] Given the form, when its controls are counted, then exactly the fourteen entry fields are rendered — grouped as Entry identification, Transport, Goods, Arrival — with no free-text notes field, no attachment control, no HTS/classification field, and no duty field.
- [ ] Given each control, when it renders, then it has a visible `<label for>` bound to its `id` plus hint text where a format expectation exists, associated via `aria-describedby` — for example "3-character filer code and 8 digits, for example ABC12345678", "4-digit port code", "2-letter country code, for example CN", and "YYYY-MM-DD".
- [ ] Given the twelve fields whose presence is checked by a `RIV-0x0` rule, when the form renders, then each carries the USWDS required indicator; `bill_of_lading_number` and `air_waybill_number` are not individually marked required and their fieldset states "Enter an air waybill number for air shipments, or a bill of lading number otherwise."
- [ ] Given `mode_of_transport` and `quantity_uom`, when they render, then they are USWDS selects populated from the validation domain code lists with an empty default option "- Select -", so nothing is pre-chosen on my behalf.
- [ ] Given `quantity` and `declared_value_usd`, when they render, then they use `type="text"` with `inputmode="decimal"` (no spinner, no locale coercion), and `arrival_date` uses the USWDS date input with an explicit format hint.
- [ ] Given the screen, when it is inspected, then it offers no autosave, no draft persistence, and no "duplicate this entry" or "create another from this one" shortcut.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.2: Submit a deliberately incomplete entry without the browser stopping me
**As a** cargo specialist, **I want to** be able to submit the form in any state, including empty, **so that** the server's required-information rules are the single authority and I can create the incomplete entry the review loop exists to process.

**Acceptance Criteria:**
- [ ] Given a completely empty form, when I activate "Submit entry", then the submission is sent and returns `201` with an exception opened — the browser does not block it and no native constraint-validation bubble appears (`novalidate` is set on the form).
- [ ] Given values as typed, when the request is built, then the client sends them after trimming leading and trailing whitespace only — it does not uppercase codes, strip hyphens, reformat dates, round numbers, or drop fields it considers empty-equivalent beyond sending empty strings.
- [ ] Given a client-side hint or character counter, when I ignore it, then it advises but does not prevent, alter, or pre-filter the submitted values.
- [ ] Given a submission in flight, when I activate "Submit entry" again, then the second activation is ignored; the button shows "Submitting…" with `aria-disabled="true"`.
- [ ] Given a submission whose outcome is unknown (timeout or network failure), when the client handles it, then it does **not** auto-retry, and it tells me to check the review queue to see whether the entry was created, because receipt is not idempotent.
- [ ] Given the screen, when it is inspected, then it contains no file input, drag-and-drop target, paste-a-batch control, template download, or "import from ACE" action — manual typing is the only input method.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.3: Be told plainly what happened to my entry
**As a** cargo specialist, **I want to** see in words whether my entry validated clean, opened an exception, or failed to save, **so that** I never have to infer the outcome from styling or from the absence of an error.

**Acceptance Criteria:**
- [ ] Given a `201` with `receipt_outcome: "VALIDATED_CLEAN"`, when the response renders, then the form region is replaced by a panel with `<h2>` "Entry received and validated", the case reference, a plain statement that no exception was opened, and the actions "Create another entry" and "Go to review queue"; focus moves to the panel heading and the polite region announces "Entry received. Validation passed. Case {reference}."
- [ ] Given a `201` with `receipt_outcome: "EXCEPTION_OPENED"`, when the response renders, then the panel states `<h2>` "Entry received. Exception opened.", the case reference, the count of unsatisfied rules, and offers "Open case {reference}" as the primary action plus "Go to review queue" and "Create another entry"; the polite region announces "Entry received. {n} required-information problems. Exception opened as case {reference}."
- [ ] Given an exception was opened, when the copy is reviewed, then it is not presented as an error or a failure — it is a successful receipt with a business outcome — and the three outcomes are distinguished in words, not by styling alone.
- [ ] Given the outcome panel, when I activate "Open case {reference}", then I navigate to `/cases/{case_reference}`; "Go to review queue" navigates to `/queue`; "Create another entry" resets to an empty form with focus on the first field, an announced status, and none of the previous values retained.
- [ ] Given a successful receipt, when the submitted values are shown, then the form fields become a read-only summary list (not disabled inputs, so screen-reader users can still read them), and the screen does not imply that a received entry can be edited.
- [ ] Given demonstration load, when I submit, then feedback appears within 2 seconds or the busy state remains visible continuously until it does.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.4: See exactly which fields failed which rules
**As a** cargo specialist, **I want to** see each validation finding both in a focus-taking summary and inline against the field it concerns, in the server's order, **so that** I can read the basis of the exception I just created field by field.

**Acceptance Criteria:**
- [ ] Given a receipt that opened an exception with 13 findings, when the screen renders, then all 13 appear in the panel list and inline against their fields, with the form still visible read-only beneath the panel so I can see what I submitted.
- [ ] Given each finding, when it renders inline, then it is bound to the control whose `id` matches its `field_name`, with `aria-invalid="true"` and `aria-describedby` pointing at the error text.
- [ ] Given a finding that references two fields (`RIV-070`, `RIV-073`), when it renders, then it appears in the error slot of the Transport fieldset containing both, associated via `aria-describedby` on the `<fieldset>` — not on an arbitrary single field.
- [ ] Given the error summary, when it renders, then items appear in the exact order the server returned them (ascending `rule_id`), and activating an item moves focus to its control.
- [ ] Given a server message, when it renders, then it is rendered verbatim — the client does not substitute wording, translate codes, merge findings, or suppress any finding; a rule identifier may appear only as supplementary small text.
- [ ] Given a `4xx` submission failure, when it renders, then the error summary appears above the form with the server's per-field detail, focus moves to the summary, the assertive region announces the problem count, and every value I entered is preserved.

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.5: Not lose my typing when something goes wrong
**As a** cargo specialist, **I want to** keep the values I typed when a submission is refused or fails, and be told clearly when nothing was saved, **so that** an error costs me a correction rather than the whole entry.

**Acceptance Criteria:**
- [ ] Given a `409 ENTRY_NUMBER_DUPLICATE`, when it renders, then the error summary shows the message with a link to the existing case and an inline error on `entry_number`, and all other entered values are preserved.
- [ ] Given a `500 RECEIPT_FAILED`, when it renders, then the error summary states "The entry could not be received. Nothing was saved. Try again." with a "Try again" action that re-submits the unchanged form, and values are preserved.
- [ ] Given a network failure, when it is handled, then the error summary advises me to check the review queue rather than retrying silently, and the assertive region announces it.
- [ ] Given a `401` on submit, when it is handled, then my typed values are preserved in memory, I am navigated to `/sign-in?next=/entries/new`, and after re-authentication I return to an empty form with a status message explaining that the entry was not saved and must be re-entered — the client never silently re-submits.
- [ ] Given a `422 REQUEST_MALFORMED`, when it renders, then the per-field detail is bound to the named controls and focus moves to the error summary.
- [ ] Given any `4xx` or `5xx` from the submission, when the message is read, then it states explicitly that nothing was saved, so I do not create a duplicate by retrying blindly.

**Priority:** P1 | **Feature Ref:** F6

---

### US-6.6: Create an entry and open the resulting case with the keyboard alone
**As a** cargo specialist, **I want to** complete the whole entry task — fill, submit, read the outcome, open the case — using the keyboard and a screen reader, **so that** the first stage of the loop is operable without a pointer.

**Acceptance Criteria:**
- [ ] Given the keyboard only, when I fill the fourteen fields, submit, read the outcome panel, and activate "Open case {reference}", then the whole task completes with visible focus at every step (SM-11).
- [ ] Given a screen reader, when the outcome panel appears, then the outcome and case reference are announced in the polite live region and focus is on the panel heading.
- [ ] Given a screen reader, when I traverse the form, then every control announces its label, its hint, its required state, and — after a failed submission — its error text.
- [ ] Given the screen, when heading structure is inspected, then there is exactly one `<h1>` and no skipped heading level.
- [ ] Given the F2 accessibility checklist, when this screen is signed off, then the record includes completion of "create an incomplete entry and read its outcome" using the keyboard alone and with a screen reader (SM-10).
- [ ] Given initial render under demonstration load, when measured, then it completes within 2 seconds.

**Priority:** P0 | **Feature Ref:** F6

---
## Epic 7: Review Queue (F7)

One query, one ordering, zero parameters — plus the single-case read model the case screen needs.

### US-7.1: Get the open exceptions in strict receipt order
**As a** cargo specialist, **I want to** retrieve the open exceptions in ascending receipt order with a stable ordering, **so that** I can work from the top of a list that never rearranges itself between requests.

**Acceptance Criteria:**
- [ ] Given three open exceptions, when `GET /api/exceptions` is called, then they are returned ordered `receipt_position ASC` and identically on repeated calls, with no secondary sort key and no ordering configuration.
- [ ] Given two specialists calling the queue at the same moment, when both responses are compared, then they contain the same rows in the same order.
- [ ] Given each row, when it is inspected, then it contains exactly `id`, `case_reference`, `receipt_position`, `received_at`, `entry_number` (nullable), `finding_count`, and `failure_summary` — and nothing else.
- [ ] Given a row's `failure_summary`, when it is derived, then it is the messages of the first two findings in server order joined by "; ", suffixed with " and {n} more" when more than two exist, and it contains no severity, score, or ranking term.
- [ ] Given more than 500 open exceptions, when the queue is called, then at most 500 rows are returned with `truncated: true` — and no page, offset, cursor, limit parameter, or "next page" link exists.
- [ ] Given the response, when its headers are inspected, then `Cache-Control: no-store` is set so a decided case never renders from cache as though still open.
- [ ] Given no session, when the queue is called, then the response is `401 UNAUTHENTICATED` with no data; every authenticated specialist sees the identical queue, because there is one role and no assignment.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.2: See only open cases in the queue, and still reach a decided one by its link
**As a** cargo specialist, **I want to** have the queue contain exactly the open exceptions while a decided case stays readable at its own URL, **so that** my working list is only work, and the record of a finished case is never lost.

**Acceptance Criteria:**
- [ ] Given exceptions in `OPEN`, `RESOLVED`, and `REJECTED` states, when the queue is called, then only the `OPEN` ones are returned.
- [ ] Given I decide the first case in the queue, when I call the queue again, then that row is absent and the order of the remaining rows is unchanged, because positions are immutable.
- [ ] Given a `RESOLVED` case, when `GET /api/exceptions/{idOrReference}` is called, then it returns the full case including its decision.
- [ ] Given the API surface, when it is enumerated, then no parameter, toggle, or alternate endpoint includes closed cases in a list, and no second list or history-browse surface exists.
- [ ] Given the queue or a case is read, when the database is inspected afterwards, then no row changed and no audit entry was written — viewing is not a state change, and no per-specialist activity record is created.
- [ ] Given a non-`GET` method on either read path, when it is sent, then the response is `405 METHOD_NOT_ALLOWED`.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.3: Have the queue carry no management dimensions at all
**As a** cargo specialist, **I want to** have the queue refuse filtering, sorting, assignment, and prioritisation outright, **so that** the single ordered list stays a single ordered list and cannot be quietly turned into a management surface.

**Acceptance Criteria:**
- [ ] Given `GET /api/exceptions?sort=received_at`, when it is called, then the response is `400 UNSUPPORTED_QUERY_PARAMETER` naming the offending parameter — not a sorted list.
- [ ] Given `GET /api/exceptions?state=RESOLVED`, when it is called, then the response is `400 UNSUPPORTED_QUERY_PARAMETER` — not a filtered list; the same applies to `order`, `q`, `assignee`, `priority`, `page`, `limit`, `since`, and any unrecognised parameter.
- [ ] Given any query string at all, when it is present, then it is rejected rather than silently ignored, making the absence of queue management an enforced contract rather than an undocumented gap.
- [ ] Given the queue response JSON, when it is searched, then it contains no `priority`, `severity`, `risk`, `assigned_to`, `claimed_by`, `age_days`, `age_bucket`, `due_at`, `sla_status`, or `is_overdue` field.
- [ ] Given any header, body, cookie, or configuration value, when it is varied, then neither the queue's membership nor its order changes.
- [ ] Given the queue index, when the schema is inspected, then it is `idx_exceptions_open_receipt_order` on `(receipt_position) WHERE state = 'OPEN'` — receipt order is the whole ordering model.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.4: Open one case and receive everything I need to decide it
**As a** cargo specialist, **I want to** retrieve a single case with its entry values, findings, recommendation, decision state, and the decisions I am permitted to take, **so that** I can judge the case from one read without assembling it from several calls.

**Acceptance Criteria:**
- [ ] Given `GET /api/exceptions/{idOrReference}`, when it succeeds, then it returns the exception (`id`, `case_reference`, `state`, `receipt_position`, `opened_at`, `closed_at`), the entry (all fourteen values with per-field `origin`, `received_at`, submitting specialist id and display name), and the validation result (`outcome`, `rule_set_version`, `evaluated_at`, findings in server order).
- [ ] Given a recommendation with `status = 'AVAILABLE'`, when the case is returned, then it includes `recommended_action`, `rationale`, `proposed_values[]` each with `field_name`, `proposed_value`, `origin: "AI"`, `addresses_rule_ids[]`, plus `model_id`, `prompt_version`, and `generated_at`.
- [ ] Given a recommendation with `status = 'UNAVAILABLE'`, when the case is returned, then it includes `failure_reason` and `failed_at`; given `PENDING`, it includes `requested_at`.
- [ ] Given a decided case, when it is returned, then it includes the decision's `decision_type`, `decided_at`, `decided_by` id and display name, `reason`, and `resolution_values[]` with per-value `origin` and `prior_value`.
- [ ] Given an open case with an `AVAILABLE` recommendation, when it is returned, then `permitted_decisions` is `["APPROVE","EDIT_APPROVE","REJECT"]`; with `PENDING` or `UNAVAILABLE`, `["EDIT_APPROVE","REJECT"]`; for any closed case, `[]`.
- [ ] Given a well-formed identifier matching no exception, when the case is requested, then the response is `404 EXCEPTION_NOT_FOUND`; given an identifier matching an entry that passed validation, then `404` with the message "That entry passed validation, so it has no exception."
- [ ] Given a path segment matching neither `^[0-9a-f-]{36}$` nor `^CE-[0-9]{4}-[0-9]{6}$`, when it is requested, then the response is `400 INVALID_IDENTIFIER`.

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.5: Rely on the server, not the screen, to say which decisions are available
**As a** cargo specialist, **I want to** have the available decision actions declared by the server and re-checked when I submit, **so that** a stale screen can never let me take a decision the case does not permit.

**Acceptance Criteria:**
- [ ] Given `permitted_decisions`, when it is produced, then it is computed server-side from the case state and recommendation status — the client does not re-implement the rule.
- [ ] Given a decision submitted for an action not in `permitted_decisions`, when the server processes it, then it re-checks and refuses regardless of what the client rendered (`409 RECOMMENDATION_NOT_AVAILABLE` for an approval with nothing to approve).
- [ ] Given a closed case, when its detail is read, then `permitted_decisions` is `[]` and the screen therefore renders no decision controls at all.
- [ ] Given an open case whose recommendation becomes `UNAVAILABLE` after the case was loaded, when a decision is submitted, then the server's current view governs the outcome.
- [ ] Given both read endpoints, when they are exercised, then they are side-effect free: they do not claim, lock, or reserve a case for the reader.
- [ ] Given demonstration load, when the case detail is read, then the composed read model is returned in a single call that renders within 2 seconds.

**Priority:** P0 | **Feature Ref:** F7

---
## Epic 8: Review Queue Web UI (F8)

Screen `/queue`, also the post-sign-in landing route. A single USWDS table in receipt order.

### US-8.1: See the open exceptions as an accessible list in receipt order
**As a** cargo specialist, **I want to** see every open exception in one table ordered by receipt, with enough on each row to tell cases apart, **so that** I can pick up the next case without deciding which case to work.

**Acceptance Criteria:**
- [ ] Given three open exceptions, when `/queue` renders, then rows appear oldest-first by receipt in the exact order the API returned them, and the client does not re-order, re-group, or re-rank them for any reason.
- [ ] Given the screen, when it renders, then it shows one `<h1>` "Review queue", the sentence "Open exceptions, oldest first by receipt. Open a case to review its AI recommendation and record your decision.", and a visible count "{n} open exceptions" (singular for 1).
- [ ] Given the table, when its markup is inspected, then it is a real `<table>` with `<caption>` "Open exceptions in receipt order — {n} cases", `<thead>` with `scope="col"` headers, and `<tbody>` rows — no layout table, no ARIA grid roles, no virtualised rendering.
- [ ] Given each row, when it renders, then it shows exactly four columns: Case (the reference as a link), Received, Entry number, and Why it is open (the failure summary with the finding count).
- [ ] Given a row whose `entry_number` is null, when it renders, then the cell reads "Not provided" rather than being blank; the failure summary is rendered as escaped text, never as HTML.
- [ ] Given a successful load, when it completes, then the polite live region announces "Review queue. {n} open exceptions."; given a load failure, the `ErrorState` renders "We could not load the review queue." with "Try again", announced assertively.
- [ ] Given demonstration load, when the screen renders, then it completes within 2 seconds.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.2: Open a case from the queue with the keyboard
**As a** cargo specialist, **I want to** open a case by tabbing to its row link and pressing Enter, **so that** I can start work on a case without a pointer and with a link I can also copy or middle-click.

**Acceptance Criteria:**
- [ ] Given a row, when I tab to the link in its Case cell and press `Enter`, then I navigate to `/cases/{case_reference}`.
- [ ] Given the row, when its markup is inspected, then the whole `<tr>` is not a click target with a JavaScript handler standing in for a link, so middle-click, copy-link, and screen-reader link navigation all work.
- [ ] Given the link, when a screen reader reads it, then its accessible name includes the case reference (for example "Open case CE-2026-000137").
- [ ] Given a screen reader's table navigation, when I traverse the table, then the caption, the row count, and each row's four cells with their column headers are reported.
- [ ] Given a row whose `case_reference` is missing or malformed, when it renders, then it renders without a link and logs a client-side warning rather than producing a broken route.
- [ ] Given the F2 accessibility checklist, when this screen is signed off, then the record includes traversing the table with a screen reader and opening a case using the keyboard alone (SM-10, SM-11).

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.3: Be told plainly when there is nothing to work, and be shown where to start
**As a** cargo specialist, **I want to** see a clear empty state with a route to the entry form when no exceptions are open, **so that** the normal starting state of a demonstration is obvious rather than looking like a failure or a hidden filter.

**Acceptance Criteria:**
- [ ] Given zero open exceptions, when `/queue` renders, then the `Empty` component shows `<h2>` "No open exceptions", the sentence "Every exception has been decided. Create a cargo entry to start a new case.", and a primary link "New cargo entry".
- [ ] Given the empty state, when it renders, then no table skeleton is shown, it is not styled or announced as an error, and it does not suggest that a filter is hiding results.
- [ ] Given the empty state, when the polite region announces, then it says "No open exceptions."
- [ ] Given the empty state, when I activate "New cargo entry", then I navigate to `/entries/new`.
- [ ] Given a non-empty queue, when it renders, then a secondary "New cargo entry" action is also available.
- [ ] Given focus after load, when the empty state renders, then focus is on the screen's `<h1>`.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.4: Return to the queue after a decision and understand what changed
**As a** cargo specialist, **I want to** come back to the queue after deciding a case and be told why its row has gone, **so that** I do not suspect a lost case when the list is one row shorter.

**Acceptance Criteria:**
- [ ] Given I have just decided a case, when I return via "Back to review queue" or the browser back button, then `/queue` re-fetches the list and focus is placed on the queue `<h1>`.
- [ ] Given the decided case is no longer listed, when the queue renders, then the polite region announces "Case {reference} was {resolved|rejected} and is no longer in the queue. {n} open exceptions remain."
- [ ] Given a refresh that changes the count, when it completes, then the new count is announced.
- [ ] Given the screen, when I leave it idle, then it does not poll, auto-refresh, or push updates — rows never move under a keyboard or screen-reader user mid-read.
- [ ] Given a "Refresh" button placed after the table heading, when I activate it, then the list is re-fetched explicitly.
- [ ] Given a session expiry while on the queue, when the next request returns `401`, then I am redirected to sign-in with the explanatory status announced politely.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.5: Have no filtering, sorting, assignment, or aging language on the screen
**As a** cargo specialist, **I want to** have the queue screen offer nothing but the row links and "New cargo entry", **so that** the single ordered list is visibly the design rather than an unfinished management screen.

**Acceptance Criteria:**
- [ ] Given the rendered DOM, when it is searched, then there is no search input, filter chip, date-range control, "show closed" toggle, select-all checkbox, row checkbox, bulk action bar, "assign to me" action, "claim" action, or per-row overflow menu.
- [ ] Given the column headers, when they are inspected, then they are plain `<th scope="col">` text — not buttons or links — carry no `aria-sort`, display no sort arrows, and the USWDS sortable-table variant is not used.
- [ ] Given the table, when its columns are counted, then there is no priority, severity, age, days-open, assignee, status, or action-menu column.
- [ ] Given `received_at`, when it renders, then it is an absolute local date and time with the month in words (for example "11 Sep 2026, 14:32") inside a `<time datetime="…">` element — never relative phrasing such as "2 days ago".
- [ ] Given the screen, when it is inspected, then it offers no tab, toggle, or "recently decided" panel for browsing closed cases, and the rendered response contains no representation of a closed case.
- [ ] Given the screen, when interactive elements are enumerated, then the only ones are the row links, "Refresh", and "New cargo entry" — nothing on the screen mutates case state.

**Priority:** P0 | **Feature Ref:** F8

---

### US-8.6: Be told when the list is showing only the first 500 cases
**As a** cargo specialist, **I want to** see an informational notice when the server had to bound the list, **so that** I am never silently shown a partial queue.

**Acceptance Criteria:**
- [ ] Given `truncated: true` in the response, when the screen renders, then an informational USWDS alert appears above the table reading "Showing the first 500 open exceptions in receipt order."
- [ ] Given the truncation notice, when it renders, then no pagination, "load more", or page-size control is offered alongside it.
- [ ] Given `truncated: false`, when the screen renders, then no notice appears.
- [ ] Given the notice, when a screen reader encounters it, then it is announced as informational rather than as an error.
- [ ] Given demonstration-scale data, when the queue is used, then the bound is not reached — it exists so an unbounded response cannot occur.
- [ ] Given the notice, when the rows are read, then the 500 shown are still the earliest by receipt position, so working from the top is still correct.

**Priority:** P1 | **Feature Ref:** F8

---
## Epic 9: AI Resolution Recommendation Generation (F9)

A recommended resolution action plus a plain-language rationale, generated when the exception
opens, persisted as a proposal marked `AI`, and never applied to anything.

### US-9.1: Have a recommendation prepared for me without waiting for it
**As a** cargo specialist, **I want to** have the AI recommendation generated automatically as soon as my entry opens an exception, without it delaying my receipt response, **so that** a draft is usually waiting when I open the case and the entry form never hangs on a model call.

**Acceptance Criteria:**
- [ ] Given a receipt that opened an exception, when the transaction commits, then generation is dispatched only after commit, never inside the receipt transaction, and the receipt response does not wait for it.
- [ ] Given a dispatch failure, when it occurs, then it is logged and the already-committed receipt is unaffected.
- [ ] Given the `PENDING` recommendation, when generation succeeds, then the row transitions to `AVAILABLE` with `recommended_action`, `rationale`, `model_id`, `prompt_version`, `generated_at`, and `latency_ms`, plus one `recommendation_values` row per proposed value.
- [ ] Given the provider, when it is called, then the per-attempt timeout is 20 seconds with exactly one retry after 2 seconds on a timeout or retryable transport error (429, 5xx, connection failure), within a total budget of 45 seconds.
- [ ] Given the job is dispatched twice for one exception, when both run, then the row lock and the `PENDING`-only guard mean one recommendation and one audit entry exist.
- [ ] Given the generation workers, when a backlog exists, then no interactive response is delayed — generation runs with bounded concurrency off the HTTP request path.
- [ ] Given the API surface, when it is enumerated, then generation is triggered only by that post-commit hook: there is no endpoint, UI control, schedule, or batch job that triggers or re-triggers it, and none that triggers it for a closed case.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.2: Read a recommendation that is stored as a proposal, not as a change
**As a** cargo specialist, **I want to** have every AI-proposed value stored as a separate proposal marked `AI` and never written into my entry, **so that** nothing the machine produced can be mistaken for something I entered or for an applied outcome.

**Acceptance Criteria:**
- [ ] Given a generated recommendation, when storage is inspected, then proposals live in `recommendations`/`recommendation_values`, which share no column with `decisions`/`decision_values`, and no view or job copies one into the other.
- [ ] Given any generated recommendation, when the entry is compared before and after, then `cargo_entries` and `cargo_entry_field_origins` are byte-identical — no proposed value ever appears in the entry of record.
- [ ] Given each `recommendation_values` row, when it is read, then `origin = 'AI'` enforced by `CHECK (origin = 'AI')`, with no mechanism to mark a proposal human-originated at this stage.
- [ ] Given generation in either branch, when it completes, then the exception's `state` remains `OPEN`.
- [ ] Given `recommendations`, when constraints are inspected, then `UNIQUE (exception_id)` applies — one recommendation per exception, with no regenerate action, no alternatives list, and no recommendation history.
- [ ] Given a proposed value, when it is stored, then it is stored verbatim within the field's structural limit; an over-long proposal makes the response schema-invalid rather than being silently truncated.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.3: Know exactly what the AI said, and which model said it
**As a** cargo specialist, **I want to** have the recommended action, the rationale, the model identity, the prompt version, and the generation time preserved as recorded, **so that** the case can later answer "what did the AI say when the human decided" exactly as it was said.

**Acceptance Criteria:**
- [ ] Given a successful generation, when the record is read, then `model_id`, `prompt_version`, `generated_at`, and `latency_ms` are persisted on the recommendation and rendered on the case screen.
- [ ] Given the provider response, when it is validated, then `recommended_action` is 1–500 characters after trim (one plain-language sentence stating the action) and `rationale` is 1–2000 characters after trim, both non-empty.
- [ ] Given `proposed_values`, when they are validated, then each has a `field_name` in the fourteen-field entry set, a `proposed_value` within that field's structural limit, and a non-empty `addresses_rule_ids` array whose members are rule ids present in this exception's findings; duplicate field names and any additional top-level property make the response schema-invalid.
- [ ] Given the prompt, when it is reviewed, then it instructs plain language intelligible to a non-technical reader, with no rule identifiers as the explanation, no regular expressions, no internal codes, and no model self-reference.
- [ ] Given reaching `AVAILABLE`, when audit is checked, then exactly one `RECOMMENDATION_GENERATED` entry exists with `actor_type = 'AI'`, `actor_specialist_id = NULL`, `before_state = 'PENDING'`, `after_state = 'AVAILABLE'`, and one value row per proposed value whose `before_value` is my submitted value (`before_origin = 'HUMAN'`, or `NULL` where I provided none) and whose `after_value` is the proposal with `after_origin = 'AI'`.
- [ ] Given sampled recommendations during walkthrough, when reviewing specialists judge them, then 100% are rated plain-language and decision-useful (SM-9).

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.4: Keep working the case when the AI is unavailable
**As a** cargo specialist, **I want to** be able to resolve or reject a case with a full audit record when the model fails, times out, or returns something unusable, **so that** a third-party outage never blocks the governed loop.

**Acceptance Criteria:**
- [ ] Given the provider is stopped, when an entry is submitted, then receipt still succeeds, the recommendation becomes `UNAVAILABLE` with `failure_reason = 'PROVIDER_UNAVAILABLE'`, and the case is still fully resolvable with a complete audit record (SM-13).
- [ ] Given a terminal failure, when `failure_reason` is set, then it is one of `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `SCHEMA_INVALID`, `CONTENT_FILTERED`, `INTERNAL_ERROR`, each mapped to plain-language copy for the case screen.
- [ ] Given a provider error body, when the failure is recorded, then the raw provider text is not persisted on the recommendation and is never shown to me; it may be logged only with secrets redacted.
- [ ] Given reaching `UNAVAILABLE`, when audit is checked, then exactly one `RECOMMENDATION_UNAVAILABLE` entry exists with `actor_type = 'AI'`, `after_state = 'UNAVAILABLE'`, the `failure_reason`, and no value rows.
- [ ] Given an `UNAVAILABLE` case, when I decide it, then `EDIT_APPROVE` (a direct resolution with every value `HUMAN`) and `REJECT` are both available, each requiring a reason, while `APPROVE` is refused because there is nothing to approve.
- [ ] Given a terminal `UNAVAILABLE` status, when time passes or I revisit the case, then no background retry, scheduled re-attempt, retry-on-view, or "regenerate" control occurs or exists — a silent later retry would change what the case showed at decision time.
- [ ] Given a recommendation left `PENDING` by a process restart, when I open the case, then it presents as pending-then-stale and the case remains decidable; no sweeper or recovery scheduler resurrects it.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.5: Be certain the AI cannot decide, and cannot stray outside its remit
**As a** cargo specialist, **I want to** have the generation path structurally unable to write a decision, compute an excluded determination, or see my identity, **so that** the accountable decision is unavoidably mine and the model is given only what it needs.

**Acceptance Criteria:**
- [ ] Given the generation code path, when it is inspected, then it has no import of or reference to the decision service, and a test asserts this along with the absence of any AI principal row in `specialists`.
- [ ] Given a hypothetical attempt by the generation job to write a decision, when it executes, then `decisions.decided_by NOT NULL REFERENCES specialists(id)` fails, so an AI-resolved exception is structurally unrepresentable.
- [ ] Given a provider response containing an `hts_code`, `duty_amount`, tariff rate, admissibility ruling, penalty, or risk score field, when it is validated, then it is rejected as `SCHEMA_INVALID` and the case goes `UNAVAILABLE`; the prompt requests none of them.
- [ ] Given the provider request, when it is composed, then it contains the fourteen entry field values, the ordered findings, and the rule set version — and no session token, credential, specialist name, or specialist identifier.
- [ ] Given the provider API key, when logs, response bodies, and audit entries are searched, then it appears in none of them; it is supplied only by environment configuration and never committed to source.
- [ ] Given the `RecommendationProvider` interface, when a provider is swapped, then no change is required in exception creation, the queue, the case screen, the decision API, the decision UI, the audit writer, or the audit trail UI, and a test double can produce every outcome branch including each `failure_reason`.

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.6: Know that the recommendation shown came from a real model, not the test fake
**As a** delivery sponsor, **I want to** see that the recommendation demonstrated to me was produced by a real hosted LLM rather than the deterministic fake used only for automated tests, **so that** the AI capability CargoExec is demonstrating is the genuine thing, not a scripted stand-in.

**Acceptance Criteria:**
- [ ] Given the demonstration/production deployment, when it starts, then it is configured with `AI_PROVIDER_URL` pointing at a real HTTPS LLM endpoint and a valid `AI_API_KEY`/`AI_MODEL_ID` — not the `fake:deterministic` provider (FR-9.20).
- [ ] Given the `fake:deterministic` provider, when its configuration is reviewed, then it appears only in the automated test suite's own configuration, never as the default, fallback, or unconfigured-state behaviour of a deployed environment (FR-9.20).
- [ ] Given this posture change, when the `RecommendationProvider` interface, retry/timeout logic, and output schema are reviewed, then none of them changed to introduce it — FR-9.20 governs deployment configuration only, not architecture (PRD §4.1, §5.4 F9 Phase 7 note).
- [ ] Given a walkthrough of the demonstrated case, when the recommended action and rationale are read, then they are the real model's own output — not a canned string returned by the deterministic fake — and the recorded `model_id` names the real provider's model, not a fake or test identifier.
- [ ] Given every other Epic 9 story (US-9.1 … US-9.5), when this posture change is applied, then their acceptance criteria are unaffected — degraded mode, provenance, provider abstraction, and audit behaviour are identical regardless of which concrete provider is configured.

**Priority:** P0 | **Feature Ref:** F9

---
## Epic 10: Exception Case Detail & Recommendation Presentation UI (F10)

Screen `/cases/{caseReference}` — where the work happens. Reading order is normative: findings →
submitted entry → recommendation → decision → audit trail.

### US-10.1: Read why this case is open
**As a** cargo specialist, **I want to** see the validation findings that opened the case, verbatim and in the server's order, **so that** the basis of the exception is never something I have to guess at.

**Acceptance Criteria:**
- [ ] Given an open case, when the screen renders, then a `<h2>` "Why this case is open" section lists the findings as an ordered list in ascending `rule_id`, each showing the plain-language message, the field it concerns, and the rule identifier as supplementary small text.
- [ ] Given the findings section, when it renders, then a sentence above it states "This entry did not satisfy {n} required-information rules when it was received."
- [ ] Given the findings, when they render, then the client performs no re-wording, re-ordering, merging, or filtering, and no severity, score, or ranking language appears.
- [ ] Given the case header, when it renders, then it shows `<h1>` "Case {case_reference}" and a definition list with the current state as text (`Open` / `Resolved` / `Rejected`), the received date and time, the submitting specialist, and a "Back to review queue" link.
- [ ] Given all specialist-entered and model-generated text, when it renders, then it is escaped text — markup, scripts, links, and Markdown in any field are not interpreted.
- [ ] Given demonstration load, when the case is opened, then the screen renders within 2 seconds from a single case-detail call.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.2: Read back the values I submitted
**As a** cargo specialist, **I want to** see all fourteen submitted fields with their values or "Not provided", each badged as specialist-entered, **so that** I can judge the case against what was actually typed rather than a corrected version of it.

**Acceptance Criteria:**
- [ ] Given the "Submitted entry" section, when it renders, then all fourteen fields appear as a definition list in the entry-form fieldset order.
- [ ] Given a field with no value, when it renders, then it reads "Not provided" rather than appearing blank.
- [ ] Given a field with a value, when it renders, then it carries the "Specialist-entered" provenance badge with text and icon, exposed to assistive technology.
- [ ] Given a value I typed as `abc12345678`, when it renders, then it appears exactly as typed, not normalised.
- [ ] Given the screen, when it is inspected, then no control edits, clears, or re-submits an entry value.
- [ ] Given a closed case, when it renders, then the submitted entry section is unchanged from the open-case presentation.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.3: Read the recommended action and why the AI recommends it
**As a** cargo specialist, **I want to** read the AI's recommended action with its full plain-language rationale, framed everywhere as an un-applied proposal, **so that** I can judge the draft rather than assume it has already taken effect.

**Acceptance Criteria:**
- [ ] Given an `AVAILABLE` recommendation, when the section renders, then it is headed `<h2>` "AI recommendation", the action is introduced with "The AI suggests:", and the block carries the sentence "Nothing here has been applied. It is recorded only if you decide to approve it."
- [ ] Given the screen, when its text is searched, then the words "Resolution applied", "Fixed", "Corrected", "Updated", and "Auto-resolved" appear nowhere.
- [ ] Given the rationale, when it renders, then it appears in full and verbatim as escaped plain text preserving paragraph breaks under the sub-heading "Why the AI suggests this" — not truncated, summarised, collapsed behind a disclosure by default, or rendered as HTML/Markdown from the model.
- [ ] Given the recommendation section, when it renders, then a footnote states the model identifier, the prompt version, and the generation timestamp.
- [ ] Given an `AVAILABLE` recommendation with a missing action or rationale, when the screen renders, then it shows the degraded presentation rather than an empty block, and logs a client-side warning.
- [ ] Given the recommendation is a proposal, when the screen is inspected, then no control applies, accepts, or partially applies it outside the decision region.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.4: Tell every AI-suggested value from my own at the moment of deciding
**As a** cargo specialist, **I want to** see each proposed value as submitted-value → AI-suggested-value with the rules it addresses and a badge on each side, **so that** I can see what the machine wants to change without reconstructing it from the audit trail afterwards.

**Acceptance Criteria:**
- [ ] Given each proposed value, when it renders as a comparison row, then it shows the field's label, the submitted value (or "Not provided") badged "Specialist-entered" where one exists, the AI-suggested value badged "AI-suggested", and the plain-language message(s) of the rules named in `addresses_rule_ids`.
- [ ] Given a proposal for a field I left empty, when it renders, then it is presented as an addition, not as a change.
- [ ] Given every AI-proposed value on the screen, when it renders, then the badge carries text, a distinct icon, and token colour — never colour alone — and the badge text is available to assistive technology.
- [ ] Given CSS colour overridden to monochrome, when I review the screen, then AI-versus-specialist origin remains discoverable on every value.
- [ ] Given a screen reader, when I traverse the recommendation and entry sections, then every AI-suggested value is announced as AI-suggested and every specialist-entered value as specialist-entered.
- [ ] Given a proposed value whose `field_name` matches no known field, when it renders, then it appears in an "Other suggested values" sub-list rather than being dropped, so nothing the record contains is hidden.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.5: See a recommendation still being generated without being blocked or interrupted
**As a** cargo specialist, **I want to** see a clear pending state that resolves itself in place, **so that** I know a draft is coming without losing my place on the screen or being prevented from deciding.

**Acceptance Criteria:**
- [ ] Given a `PENDING` recommendation under 60 seconds old, when the section renders, then the `Loading` component shows with `aria-busy`, the text "Generating an AI recommendation…", and a polite announcement.
- [ ] Given a `PENDING` recommendation, when the screen polls, then it calls the recommendation endpoint every 3 seconds for at most 60 seconds, stopping on first terminal status, on stale timeout, or when I leave the screen.
- [ ] Given a recommendation that becomes available while I am reading, when the poll returns, then the region updates in place within 3 seconds, announces "An AI recommendation is now available." politely, and does **not** move my focus.
- [ ] Given polling in progress, when I try to navigate or decide, then navigation is not blocked and the decision controls are neither hidden nor disabled.
- [ ] Given a `PENDING` recommendation at 60 seconds, when the stale threshold passes, then polling stops and the degraded presentation renders with "No AI recommendation is available yet."
- [ ] Given a poll request that fails, when it is handled, then polling stops and the degraded block renders with a generic cause, announced politely.

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.6: Decide a case that has no recommendation, without being told something failed
**As a** cargo specialist, **I want to** see a plain "No AI recommendation available" presentation that states I can still decide, **so that** a model outage reads as a degraded assist rather than a broken case.

**Acceptance Criteria:**
- [ ] Given an `UNAVAILABLE` recommendation, when the section renders, then it uses the `Degraded` component — not `ErrorState` — with `<h3>` "No AI recommendation available", the mapped plain-language cause, and the sentence "You can still resolve or reject this case. Your decision and reason will be recorded as usual."
- [ ] Given `failure_reason = 'PROVIDER_TIMEOUT'`, when the cause renders, then it reads "The AI service did not respond in time."; each other enumerated reason maps to its own plain-language string.
- [ ] Given the degraded block, when it renders, then no raw provider error, stack trace, or credential appears, and no "Retry" or "Regenerate" control is offered.
- [ ] Given an `OPEN` case with an unavailable or pending recommendation, when the decision region renders, then the controls are present and driven by `permitted_decisions`, with the decision path unaffected.
- [ ] Given the provider is stopped, when I work the case end to end, then I complete a decision and the case closes with a full audit record (SM-13).
- [ ] Given a closed case whose recommendation was `UNAVAILABLE`, when it renders, then the recommendation section shows exactly that state as it stood, still framed as a proposal.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.7: Read a closed case as a final, unchangeable record
**As a** cargo specialist, **I want to** see a decided case rendered read-only with the recorded decision and no decision controls at all, **so that** I cannot accidentally act on a case that is already finished, and the record's finality is visible.

**Acceptance Criteria:**
- [ ] Given a `RESOLVED` or `REJECTED` case, when it renders, then the state appears as text in the header and the screen states "This case is closed. The decision below is final and cannot be changed."
- [ ] Given the closed case, when the decision section renders, then it shows the decision type, the deciding specialist, the timestamp, the reason (for edit and reject), and the resolution values each with their `AI`/`HUMAN` badge and the prior value where changed.
- [ ] Given the closed case, when the DOM is inspected, then the decision controls are absent entirely — not rendered disabled — because `permitted_decisions` is `[]`.
- [ ] Given the closed case, when the screen is inspected, then no control edits the entry, edits or deletes a finding, edits the recommendation, reopens the case, deletes the case, or exports anything.
- [ ] Given the closed case, when the audit trail region renders, then it is reachable in place and includes the decision event.
- [ ] Given a `404` for an unknown case, when it renders, then a "Case not found" screen appears inside the shell with a link to the queue, distinguishing "That entry passed validation, so it has no exception."; a `401` redirects to sign-in.

**Priority:** P0 | **Feature Ref:** F10

---

### US-10.8: Read the case in one predictable order with no queue or aging language
**As a** cargo specialist, **I want to** traverse the case in the same order visually and with my screen reader, with no place-in-queue or age indicators anywhere, **so that** the screen shows me the case rather than a workload.

**Acceptance Criteria:**
- [ ] Given the screen, when headings are inspected, then there is exactly one `<h1>` followed by `<h2>` sections in the normative order findings → submitted entry → AI recommendation → your decision → audit trail, with `<h3>` used only inside those sections and no skipped level.
- [ ] Given the layout, when it is compared with the DOM, then visual order matches DOM order, so keyboard and screen-reader traversal follow the visual reading order.
- [ ] Given the header, when it renders, then an "On this page" set of in-page links follows it, allowing direct movement to each section.
- [ ] Given the screen, when it is searched, then it displays no numeric receipt position, place-in-queue indicator, time-open duration, age, or due date; receipt time appears only as an absolute local datetime with the month in words in a `<time datetime>` element.
- [ ] Given `/cases/{uuid}`, when it loads, then it resolves the same case and canonicalises the address bar to `/cases/CE-YYYY-NNNNNN` by replace-state.
- [ ] Given a case load failure, when it is handled, then `ErrorState` renders "We could not load this case." with "Try again", announced assertively.
- [ ] Given the F2 accessibility checklist, when this screen is signed off, then the record includes a screen-reader walkthrough confirming provenance announcement on every value and a colour-removed verification (SM-3, SM-10).

**Priority:** P0 | **Feature Ref:** F10

---
## Epic 11: Human Decision Processing — Edit / Approve / Reject (F11)

The server-side enforcement of the accountable human decision. `POST /api/exceptions/{id}/decision`
is the only path that writes a resolution or changes an exception's state.

### US-11.1: Approve the recommendation as proposed
**As a** cargo specialist, **I want to** approve a recommendation exactly as it stands and have my approval recorded against my name, **so that** adopting the AI's draft is still an accountable act with a traceable record.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case with an `AVAILABLE` recommendation, when I submit `decision_type: "APPROVE"`, then the response is `201`, the exception becomes `RESOLVED` with `closed_at` and `decision_id` set, and the decision records me as `decided_by` from the session principal.
- [ ] Given the approval, when resolution values are written, then they are copied server-side from `recommendation_values` and every one retains `origin = 'AI'`, because I adopted the machine's value unchanged — my contribution is the decision, not authorship of the values.
- [ ] Given an approval body containing `resolution_values`, when it is submitted, then the response is `422 RESOLUTION_VALUES_NOT_ALLOWED` and nothing is written.
- [ ] Given the approval, when audit is checked, then exactly one `RECOMMENDATION_APPROVED` entry exists with `actor_type = 'SPECIALIST'`, my id, `before_state = 'OPEN'`, `after_state = 'RESOLVED'`, and one value row per resolution value whose `before_value` is the proposal (`before_origin = 'AI'`) and `after_origin = 'AI'`.
- [ ] Given an optional reason supplied with an approval, when it is stored, then it must satisfy the same 10–2000 character bounds; a reason is not required, because approving as-is adds no divergence to explain.
- [ ] Given the `201` response, when it is read, then it returns the recorded decision (id, type, `decided_at`, my id and display name, reason), the resulting state, the resolution values with per-value `origin`, `prior_value`, and `changed_from_proposal`, the `audit_entry_id`, and `idempotent_replay`.

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.2: Edit the recommendation and approve my version
**As a** cargo specialist, **I want to** change the values I disagree with, approve the modified resolution, and have only my changes attributed to me, **so that** "what did the human change" is answerable value by value.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case with three proposed values, when I submit `decision_type: "EDIT_APPROVE"` with all three values and one changed, then the changed value is recorded `origin = 'HUMAN'` with `changed_from_proposal = true`, the other two retain `origin = 'AI'` with `changed_from_proposal = false`, and `prior_value` is populated on all three.
- [ ] Given each submitted value, when provenance is computed, then the server compares it with the AI proposal after trimming leading and trailing whitespace and comparing byte-for-byte thereafter; equal ⇒ `AI`, not equal ⇒ `HUMAN`, no proposal for that field ⇒ `HUMAN`.
- [ ] Given a body containing an `origin` property on any resolution value, when it is submitted, then it is rejected as an unknown field with `422 REQUEST_MALFORMED` — origin is never accepted from the client.
- [ ] Given an `EDIT_APPROVE` on a case with a recommendation, when the value set does not exactly equal the proposal's `field_name` set, then the response is `422 RESOLUTION_VALUES_INCOMPLETE` naming the missing and unexpected fields, so an omitted field is never ambiguous between "unchanged" and "dropped".
- [ ] Given a direct resolution (no available recommendation), when I submit `EDIT_APPROVE`, then at least one value is required, every `field_name` must be in the fourteen-field entry set, and every value is recorded `HUMAN` with `prior_value` taken from my submitted entry value where one exists.
- [ ] Given the edit-and-approve, when audit is checked, then exactly one `RECOMMENDATION_EDITED_AND_APPROVED` entry exists carrying my reason verbatim and per-value origins matching the decision exactly.
- [ ] Given an `EDIT_APPROVE` in which I changed nothing, when it is submitted with a reason, then it is accepted and recorded with all values retaining `AI` origin — the server, not the client, decides whether a change occurred.

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.3: Reject a recommendation and close the case without adopting it
**As a** cargo specialist, **I want to** reject a recommendation with my reason and have nothing adopted, **so that** declining a draft is recorded as deliberately as accepting one.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case, when I submit `decision_type: "REJECT"` with a valid reason, then the response is `201` and the exception becomes `REJECTED` with `closed_at` and `decision_id` set.
- [ ] Given a rejection, when storage is inspected, then no `decision_values` rows were written, because nothing was adopted.
- [ ] Given a rejection body containing `resolution_values`, when it is submitted, then the response is `422 RESOLUTION_VALUES_NOT_ALLOWED` and nothing is written.
- [ ] Given the rejection, when audit is checked, then exactly one `RECOMMENDATION_REJECTED` entry exists with my reason on the entry and one value row per declined proposed value where `before_value` is the proposal (`before_origin = 'AI'`) and `after_value` is `NULL`.
- [ ] Given a rejected case, when it is read, then no reopen, amend, undo, correct, or supersede operation exists — a mistaken decision is addressed by a new case, never by rewriting history.
- [ ] Given a rejection on a case with no available recommendation, when it is submitted with a reason, then it succeeds, so degraded cases can always be closed.

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.4: Be required to say why whenever I edit or reject
**As a** cargo specialist, **I want to** be required to write a substantive reason for every edit and every rejection, **so that** a later reviewer reads my justification rather than inferring my intent from an outcome.

**Acceptance Criteria:**
- [ ] Given `EDIT_APPROVE` or `REJECT` with `reason` absent, `""`, `"   "`, or `"ok"`, when it is submitted, then the response is `422 REASON_REQUIRED` with "Enter a reason of at least 10 characters for this {edit/rejection}.", the case remains `OPEN`, and no audit entry is written.
- [ ] Given a reason of 10–2000 characters after trim, when it is submitted, then it is accepted and stored verbatim.
- [ ] Given a reason over 2000 characters, when it is submitted, then it is rejected as malformed.
- [ ] Given an API bypass that writes a decision row directly, when an `EDIT_APPROVE` or `REJECT` row with a blank or short reason is inserted, then the database `CHECK` rejects it — the rule is enforced independently at both layers.
- [ ] Given a recorded edit or rejection, when the audit entry is read, then the reason is present on the entry itself, not merely referenced through the decision, so the trail is self-contained.
- [ ] Given all recorded edits and rejections in the deployment, when they are queried, then 100% carry a non-empty reason (SM-5).

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.5: Be certain nothing resolves without my decision
**As a** cargo specialist, **I want to** have resolution state reachable only through an explicit decision of mine, with no job, worker, or default that can close a case, **so that** "the AI decided this" is not a possible outcome and my accountability cannot be bypassed.

**Acceptance Criteria:**
- [ ] Given a request with no `decision_type`, when it is submitted, then it is rejected `422 REQUEST_MALFORMED` — there is no default, no inferred decision, no "accept all", and no empty-body semantics.
- [ ] Given a repository-wide search, when it is performed, then exactly one code path writes `exceptions.state`, and no scheduler, worker, queue consumer, retry path, database trigger, or migration references the decision service.
- [ ] Given direct SQL setting `exceptions.state = 'RESOLVED'` with no `decisions` row, when it commits, then it fails with `HITL_VIOLATION`.
- [ ] Given an unauthenticated or CSRF-invalid decision request, when it is sent, then it returns `401 UNAUTHENTICATED` or `403 CSRF_INVALID` respectively, with no state change and no audit entry.
- [ ] Given any failure inside the decision transaction, when it aborts, then the case remains `OPEN` with no decision and no audit entry, and the response is `500 DECISION_FAILED` stating that nothing was saved.
- [ ] Given the endpoint, when it is exercised, then it accepts exactly one decision for exactly one exception — no batch, multi-case, or "approve all" endpoint or parameter exists.
- [ ] Given any recorded decision, when the entry and findings are compared before and after, then `cargo_entries` and `validation_findings` for that case are byte-identical; the handler never modifies, closes, annotates, or deletes a finding.
- [ ] Given all resolved cases in the deployment, when they are audited, then zero reached a resolved state without a recorded human decision (SM-4).

**Priority:** P0 | **Feature Ref:** F11

---

### US-11.6: Never decide the same case twice, even from two tabs
**As a** cargo specialist, **I want to** have a second or concurrent decision on a case refused with an explanation, **so that** the record can never contain two contradictory outcomes for one case.

**Acceptance Criteria:**
- [ ] Given a decided case, when a second decision is submitted, then the response is `409 EXCEPTION_ALREADY_DECIDED` including the existing decision's type, the deciding specialist's display name, and the timestamp, so the screen can explain what happened.
- [ ] Given two concurrent decision requests for one case, when both are processed, then the `SELECT ... FOR UPDATE` lock plus `UNIQUE (exception_id)` yield exactly one `201` and one `409`, and the database holds one decision and one audit entry.
- [ ] Given a repeated request carrying the same `Idempotency-Key` and the same body, when it is replayed, then the original `201` body is returned with `idempotent_replay: true`, and no second decision and no second audit entry are created.
- [ ] Given the same `Idempotency-Key` with a different body, when it is submitted, then the response is `409 IDEMPOTENCY_KEY_REUSED`.
- [ ] Given a request without an `Idempotency-Key`, when it is processed, then it is handled normally with the single-decision constraint as the backstop.
- [ ] Given a supplied `recommendation_id` that is not the case's current one, when the decision is submitted, then the response is `409 RECOMMENDATION_MISMATCH`, so a stale-tab approval is detectable rather than silent.

**Priority:** P1 | **Feature Ref:** F11

---

### US-11.7: Be prevented from approving a recommendation that does not exist
**As a** cargo specialist, **I want to** have approval refused when there is nothing to approve, while still being able to resolve the case myself, **so that** an absent recommendation can never be rubber-stamped into the record.

**Acceptance Criteria:**
- [ ] Given an `OPEN` case whose recommendation is `UNAVAILABLE`, when I submit `APPROVE`, then the response is `409 RECOMMENDATION_NOT_AVAILABLE` with "There is no AI recommendation to approve. Edit and approve, or reject."
- [ ] Given the same case, when I submit `EDIT_APPROVE` with values and a reason, then it succeeds, every value is recorded `HUMAN`, and the case becomes `RESOLVED` (SM-13).
- [ ] Given an `OPEN` case whose recommendation is still `PENDING`, when I submit `APPROVE`, then it is refused with the same `409`.
- [ ] Given the same pending case, when I submit `REJECT` with a reason, then it succeeds and the case becomes `REJECTED`.
- [ ] Given the case detail response, when `permitted_decisions` is read for an unavailable or pending recommendation, then it is `["EDIT_APPROVE","REJECT"]`, and the server re-checks the rule on submission regardless of what the client rendered.
- [ ] Given a decision on a case that does not exist, when it is submitted, then the response is `404 EXCEPTION_NOT_FOUND` and nothing is written.

**Priority:** P0 | **Feature Ref:** F11

---
## Epic 12: Decision Web UI — Edit, Approve, Reject with Reason Capture (F12)

The "Your decision" region of the case screen: three deliberate, equally-available actions with no
default, a two-step commitment, and mandatory reason capture on edit and reject.

### US-12.1: Choose among three actions with nothing chosen for me
**As a** cargo specialist, **I want to** see approve, edit-and-approve, and reject presented as three equal actions with none pre-selected, **so that** approving the AI is a deliberate choice rather than the path of least resistance.

**Acceptance Criteria:**
- [ ] Given an open case with an `AVAILABLE` recommendation, when the decision region renders, then three separate activatable controls appear — "Approve", "Edit and approve", "Reject" — with no radio pre-selected, no `autofocus`, and no focus pre-placed on any one of them.
- [ ] Given the three controls, when their styling is reviewed, then they carry equal visual weight; "Approve" is not the only primary-styled control with the others de-emphasised as links.
- [ ] Given the keyboard, when I tab through the region, then order is Approve → Edit and approve → Reject, matching DOM order, and no keyboard shortcut exists for any action.
- [ ] Given `permitted_decisions` without `APPROVE`, when the region renders, then the Approve control is absent from the DOM (not disabled) and the note "There is no AI recommendation to approve." is shown, with "Edit and approve" labelled "Resolve directly".
- [ ] Given the region, when it is inspected, then there is no "approve all", "apply and next", or "decide and open next case" control, and nothing acts on more than the case being read.
- [ ] Given a closed case, when the region renders, then no action chooser and no form exist in the DOM.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.2: Edit the proposed values and see which ones I changed
**As a** cargo specialist, **I want to** edit the AI's proposed values in a form that marks each field I change, **so that** I can see the provenance my decision will record before I record it.

**Acceptance Criteria:**
- [ ] Given I choose "Edit and approve" on a case with a recommendation, when the edit form renders, then it shows one input per proposed field pre-populated with the AI-proposed value, each labelled and badged "AI-suggested".
- [ ] Given a direct resolution (no available recommendation), when the form renders, then it shows one input per field named by the validation findings, pre-populated with my submitted entry value or empty, badged "Specialist-entered".
- [ ] Given I change a value, when the field re-renders, then its badge becomes "Specialist-modified" and a "Changed" marker appears as text plus icon — never colour alone — exposed to assistive technology, announced politely at most once per field per change, with a running count announced ("2 fields changed").
- [ ] Given I revert a field to the exact proposed value, when it re-renders, then the "AI-suggested" badge is restored, because the client compares using the same trim-then-compare rule the server applies.
- [ ] Given the edit form, when it is submitted, then the client sends every rendered field as `{field_name, value}` — never an origin, a changed flag, a diff, or a partial set.
- [ ] Given a long field, when I type into it, then a character counter reflects the field's structural limit, and the client does not block the decision merely because I changed nothing.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.3: Write my reason, and be told accessibly if I have not
**As a** cargo specialist, **I want to** enter a free-text reason for an edit or a rejection and get a clear, focus-managed error if it is missing or too short, **so that** the record always carries my justification in my own words.

**Acceptance Criteria:**
- [ ] Given the edit form, when it renders, then a required "Reason for your changes" textarea appears with the USWDS required indicator, the hint "At least 10 characters. Explain why you changed the recommendation.", and a character counter.
- [ ] Given the reject form, when it renders, then a required "Reason for rejecting" textarea appears with the hint "At least 10 characters. Explain why the recommendation is not being adopted." and the plain statement "Rejecting closes this case without adopting the recommendation. No resolution values will be recorded."
- [ ] Given an empty or two-character reason, when I activate "Continue", then an inline error renders on the field, an error summary appears, focus moves to the summary, no request is sent, and I cannot reach the pre-submission summary.
- [ ] Given a reason the client considered valid but the server refuses, when `422 REASON_REQUIRED` returns, then the server's message renders in the error summary and inline on the field, focus moves to the summary, and every entered value is preserved.
- [ ] Given the reason input, when it is inspected, then it is a free-text `<textarea>` with no dropdown of pre-written reasons, no "quick reason" chips, no default text, and no placeholder that could be submitted as-is.
- [ ] Given the Approve action, when its reason field renders, then it is explicitly labelled "Reason (optional)".
- [ ] Given a `422 RESOLUTION_VALUES_INCOMPLETE`, when it returns, then the error summary names the missing fields and preserves my input.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.4: See exactly what will be recorded before it is recorded
**As a** cargo specialist, **I want to** review a summary of the decision, the values, and the reason before committing it, **so that** no single click both chooses and records a decision I have not read back.

**Acceptance Criteria:**
- [ ] Given any chosen action, when I continue, then the pre-submission summary renders before anything is sent — no single activation both chooses and records a decision.
- [ ] Given an approval summary, when it renders, then it states "Approve the AI-recommended resolution", lists every value that will be recorded with its "AI-suggested" badge, and states "All values will be recorded as AI-suggested, and this decision will be recorded against your name."
- [ ] Given an edit summary, when it renders, then each field reads *AI suggested X → you are recording Y*, unchanged fields are shown as retaining AI origin, and the reason text appears exactly as it will be stored.
- [ ] Given a rejection summary, when it renders, then it shows the decision type, the reason, and the declined values for the record.
- [ ] Given any summary, when it renders, then it states that the decision is recorded permanently against my name and cannot be changed afterwards, and offers "Back" which returns to the form with all input preserved.
- [ ] Given "Cancel" from any form, when I activate it, then no request is sent and nothing is recorded; if I had typed a reason or changed a value, I am asked to confirm before it is discarded.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.5: Be shown what was actually recorded, from the server's own record
**As a** cargo specialist, **I want to** see a confirmation built from the server response rather than from what my screen assumed, **so that** what I am told was recorded is exactly what the audit trail will show.

**Acceptance Criteria:**
- [ ] Given a `201` decision response, when the confirmation panel renders, then every displayed field comes from that response — never from the client's optimistic assumption.
- [ ] Given the confirmation, when it renders, then it shows `<h3>` "Decision recorded", the decision type in words, the deciding specialist and timestamp as returned, the reason, each recorded value with its server-assigned `AI`/`HUMAN` badge and the prior value where it changed, and the new case state.
- [ ] Given the confirmation, when it renders, then focus moves to the confirmation heading and the outcome is announced politely.
- [ ] Given the confirmation, when it renders, then it offers "View the audit trail for this case" (to the `#audit-trail` anchor) and "Back to review queue".
- [ ] Given the confirmation's values and origins, when they are compared with the audit trail, then they match exactly.
- [ ] Given a `500 DECISION_FAILED`, when it returns, then the error summary states "Nothing was saved. Try again." announced assertively, and the case remains open and decidable.

**Priority:** P0 | **Feature Ref:** F12

---

### US-12.6: Be handled gracefully when the case was already decided or the proposal changed
**As a** cargo specialist, **I want to** be told plainly when a case was already decided or the recommendation has changed, without it being framed as my mistake or producing a duplicate, **so that** a stale tab cannot corrupt the record.

**Acceptance Criteria:**
- [ ] Given a `409 EXCEPTION_ALREADY_DECIDED`, when it returns, then an informational alert renders "This case was already {resolved/rejected} by {name} on {date}.", the controls are removed, the case is refreshed from the server, and the change is announced assertively — not presented as my error.
- [ ] Given a `409 RECOMMENDATION_MISMATCH`, when it returns, then the case reloads with "The recommendation changed. Review it again before deciding." and the stale pre-submission summary is discarded rather than re-posted.
- [ ] Given a `409 RECOMMENDATION_NOT_AVAILABLE` on approval, when it returns, then an alert explains that there is no recommendation to approve and the action chooser is re-rendered without Approve.
- [ ] Given "Record decision" in flight, when I activate it again, then it is disabled with a busy state and the request carries the `Idempotency-Key` generated when the summary was rendered, so a retry cannot produce a second decision.
- [ ] Given an unknown outcome after a network failure, when it is handled, then the client does not auto-retry and tells me to reload the case to see whether the decision was recorded.
- [ ] Given a `401` during the decision path, when it returns, then I am redirected to sign-in with an explanation and my input is discarded rather than silently re-submitted.

**Priority:** P1 | **Feature Ref:** F12

---

### US-12.7: Complete the whole decision by keyboard, and find nothing left to click afterwards
**As a** cargo specialist, **I want to** take the entire decision — choose, edit, reason, review, record, read the confirmation — with the keyboard, and see the controls disappear once recorded, **so that** the accountable act is fully operable without a pointer and visibly final.

**Acceptance Criteria:**
- [ ] Given the keyboard only, when I complete an edit-and-approve, then every step is reachable and operable with visible focus and each outcome announced (SM-11).
- [ ] Given a recorded decision, when the region re-renders, then the action chooser and all forms are removed from the DOM and the recorded decision is shown read-only with the statement that the case is closed and the decision final — disabled-but-present controls are not used.
- [ ] Given a screen reader, when I complete an edit-and-approve with a reason, then the changed-field marking, the reason requirement, the summary, and the confirmation are all announced; recovering from a missing-reason error is also announced.
- [ ] Given the region, when it is inspected after a decision, then no control edits, amends, undoes, or supersedes the recorded decision.
- [ ] Given the F2 accessibility checklist, when the case screen is signed off, then the record includes a screen-reader walkthrough of an edit-and-approve with a reason and of a missing-reason error recovery (SM-10).
- [ ] Given the decision region, when the F2 form pattern is applied, then the submit control enters a busy state with `aria-disabled="true"` and repeat submission is blocked.

**Priority:** P0 | **Feature Ref:** F12

---
## Epic 13: Audit Entry Writer — Append-Only on Every State Change (F13)

The single chokepoint through which all history is written: one append-only entry per state change,
inside the same transaction as the change it describes.

### US-13.1: Have every state change on my case recorded exactly once
**As a** cargo specialist, **I want to** have each of the eight state changes write exactly one audit entry in the same transaction as the change, **so that** an unaudited change to a case I worked is not a possible outcome.

**Acceptance Criteria:**
- [ ] Given a test enumerating the eight transitions — `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED`, `RECOMMENDATION_GENERATED`, `RECOMMENDATION_UNAVAILABLE`, `RECOMMENDATION_APPROVED`, `RECOMMENDATION_EDITED_AND_APPROVED`, `RECOMMENDATION_REJECTED` — when each is exercised, then exactly one audit entry exists with the expected action, actor type, before/after states, and value rows (SM-6: 100%, zero unaudited transitions).
- [ ] Given the writer's interface, when it is inspected, then it exposes exactly one operation, `append(tx, entry)`, requiring an active transaction handle as its first argument, with no way to open its own transaction or write outside the caller's.
- [ ] Given a state change committed with zero or two audit entries, when the transaction commits, then the deferred coupling triggers refuse it with `AUDIT_COUPLING_VIOLATION`.
- [ ] Given the audit tables, when the codebase is searched, then they are referenced by exactly one module — no other module, repository, ORM model, or migration inserts into them.
- [ ] Given the action set, when it is compared with the state machine, then there are exactly eight actions and exactly eight transitions, with no action lacking a transition and no transition lacking an action.
- [ ] Given `occurred_at`, when an entry is written, then it is the database's `now()` within the transaction and is not a parameter of the writer.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.2: Have who, what, when, before, after, and origin all captured
**As a** cargo specialist, **I want to** have each entry record the actor, the action, the time, the before and after values, and the AI-versus-human origin of each value, **so that** the trail answers the oversight questions without anyone needing to ask me.

**Acceptance Criteria:**
- [ ] Given any audit entry, when it is read, then it carries `case_id`, `case_sequence`, `global_sequence`, `action_type`, `actor_type`, `actor_specialist_id`, `occurred_at`, `before_state`, `after_state`, the linked `exception_id`/`recommendation_id`/`decision_id` where applicable, `request_id`, `prev_entry_hash`, and `entry_hash`.
- [ ] Given a `SPECIALIST` entry, when it is written, then `actor_specialist_id` comes from the request principal and is non-null; given an `AI` entry, then it is `NULL`; given a `SYSTEM` entry, then it records the specialist whose request caused the derivation.
- [ ] Given each value row, when it is read, then it carries `field_name`, `before_value`, `before_origin`, `after_value`, `after_origin`, and `changed`, with `before_origin` null only where no prior value existed and `after_origin` null only where the after value is null (a decline).
- [ ] Given an `ENTRY_RECEIVED` entry, when it is read, then it holds one value row per submitted field with `after_origin = 'HUMAN'`; given `RECOMMENDATION_GENERATED`, one per proposed value with `before_origin = 'HUMAN'` or `NULL` and `after_origin = 'AI'`.
- [ ] Given a `RECOMMENDATION_EDITED_AND_APPROVED` entry, when it is read, then `after_origin` is `HUMAN` for changed values and `AI` for unchanged ones, with `changed` set accordingly.
- [ ] Given any stored value, when it is read, then it is exactly as submitted or proposed — without normalisation, truncation, rounding, or case folding — with numeric and date values serialised canonically so comparisons in the trail are exact.
- [ ] Given a value row, when it is validated, then at least one of `before_value` / `after_value` is non-null and every `field_name` is a member of the entry field set or a finding-scoped name.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.3: Have my reason travel with the event that carries it
**As a** cargo specialist, **I want to** have my reason copied verbatim onto the audit entry for an edit or a rejection, **so that** the trail explains the decision on its own when someone reads only the history.

**Acceptance Criteria:**
- [ ] Given a `RECOMMENDATION_EDITED_AND_APPROVED` entry, when it is read, then `reason` holds my text verbatim, not merely a reference to the decision row.
- [ ] Given a `RECOMMENDATION_REJECTED` entry, when it is read, then `reason` holds my text verbatim.
- [ ] Given `ENTRY_RECEIVED`, `VALIDATION_COMPLETED`, `EXCEPTION_OPENED`, `RECOMMENDATION_GENERATED`, or `RECOMMENDATION_UNAVAILABLE`, when each is written, then `reason` is absent or `NULL`.
- [ ] Given an edit or reject entry written with an empty reason, when the writer validates it, then it raises `AUDIT_WRITE_INVALID` and the transaction aborts.
- [ ] Given a reason containing line breaks, when it is stored and later rendered, then the text is preserved exactly and escaped at render time.
- [ ] Given `RECOMMENDATION_APPROVED` with an optional reason supplied, when the entry is written, then the reason is carried if present and the entry is valid without one.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.4: Know that no one can edit or delete the history — ever
**As a** cargo specialist, **I want to** have mutation of stored history rejected at the persistence layer for every role, with no retention or purge path, **so that** the record behind my decisions is permanent for the life of the deployment.

**Acceptance Criteria:**
- [ ] Given `UPDATE audit_entries` and `DELETE FROM audit_entries`, when each is executed as `cargoexec_app` and as `cargoexec_owner`, then all four attempts fail (SM-7: 100% rejected, including attempts made directly against the database).
- [ ] Given the writer's implementation, when it is inspected, then no update, delete, upsert, merge, redact, correct, anonymise, backfill, or truncate operation exists in the interface or the implementation.
- [ ] Given the deployment, when scheduled tasks are enumerated, then there is no scheduled deletion, retention window, rollup, compaction, archival job, or "clear history" operation.
- [ ] Given a copy of the database with a middle entry removed, when the chain is verified, then `chain_verified` is false at the expected sequence, because any excision, substitution, or reordering breaks the hash linkage.
- [ ] Given the read path, when it is used, then it is separate from the write path, strictly read-only, and returns a case's entries in ascending `case_sequence` with their value rows, the linked specialist display names, and the `chain_verified` result.
- [ ] Given F13's API surface, when it is enumerated, then it exposes only `GET /api/exceptions/{exceptionId}/audit` — no write endpoint, no bulk read, no download, no report, no streaming feed, and no cross-case query.

**Priority:** P0 | **Feature Ref:** F13

---

### US-13.5: Have an unauditable change fail loudly rather than proceed quietly
**As a** cargo specialist, **I want to** have any failure to write history abort the change it described, and have secrets refused outright, **so that** I never end up responsible for a change the record cannot explain.

**Acceptance Criteria:**
- [ ] Given the writer fails during a decision, when the transaction aborts, then the case remains `OPEN` with no decision row and no audit entry, and the API returns `500 DECISION_FAILED` stating nothing was saved.
- [ ] Given an `append` failure, when it occurs, then the exception propagates and aborts the caller's transaction — it is never caught and logged-and-continued, retried outside the transaction, queued for later, or written to a fallback file.
- [ ] Given an invalid action type or an actor pairing violation (`SPECIALIST` without an id, `AI` with one), when `append` is called, then it raises `AUDIT_WRITE_INVALID` and nothing commits.
- [ ] Given an attempt to write a password, session token, CSRF token, API key, or authorisation header as a value or a denylisted `field_name`, when `append` is called, then it raises `AUDIT_WRITE_FORBIDDEN_CONTENT` and fails the transaction rather than silently dropping the value.
- [ ] Given two writers racing on one case's audit sequence, when the `UNIQUE (case_id, case_sequence)` constraint is violated, then the transaction aborts with `AUDIT_SEQUENCE_CONFLICT` and is never silently retried by the server.
- [ ] Given any internal audit error, when it reaches the client, then it is surfaced only as the caller's generic `RECEIPT_FAILED` or `DECISION_FAILED` with the message that nothing was saved; internal audit codes are never returned to the client.
- [ ] Given I view a queue, a case, or an audit trail, and given I sign in or out, when the audit tables are queried afterwards, then no entry was written — reads and session events are deliberately outside the case audit boundary, because no case state changed.

**Priority:** P0 | **Feature Ref:** F13

---
## Epic 14: Per-Case Audit Trail Web UI (F14)

The audit trail region inside the case (`#audit-trail`, deep link `/cases/{caseReference}/audit`).
The trail is answered in place — read-only, no export, no second system.

### US-14.1: Read the whole story of a case in the case itself
**As a** cargo specialist, **I want to** read every state change on a case in chronological order without leaving the case screen, **so that** I can confirm what I just did and so that a later reviewer's question can be answered in place rather than by an extract.

**Acceptance Criteria:**
- [ ] Given a case decided by edit-and-approve, when the trail renders, then events appear in ascending `case_sequence` in this order: "Cargo entry received" → "Validated against required-information rules" → "Exception opened" → "AI recommendation generated" → "Recommendation edited and approved by specialist".
- [ ] Given the region, when it renders, then it is headed `<h2>` "Audit trail" with the sentence "Every state change on this case, oldest first. This record cannot be edited or deleted."
- [ ] Given each event, when it renders, then it shows the action in plain language as an `<h3>`, then **Who**, **When**, **What changed** (state before → after in words), the reason where captured, the value change table where value rows exist, and the sequence as supplementary small text ("Event 4 of 7").
- [ ] Given the trail, when it renders, then the client does not re-order, reverse, group, collapse by type, paginate, or truncate it, and no "show more" hides events by default.
- [ ] Given each event, when it is compared with the API response, then no field the API returned is omitted from the rendering.
- [ ] Given an unrecognised `action_type`, when it renders, then the raw action name is shown as the heading rather than the event being skipped — nothing in the record is hidden because the client did not recognise it.
- [ ] Given demonstration load, when the case opens, then the trail renders within 2 seconds and does not block the rest of the case screen from rendering.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.2: See the AI and the humans distinguished on every event and every value
**As a** cargo specialist, **I want to** have each event's actor and each value's origin marked unmistakably, with the AI never rendered as a person, **so that** a machine proposal can never be mistaken for a human act in the record.

**Acceptance Criteria:**
- [ ] Given an `AI`-actor event, when it renders, then the actor reads "AI ({model_id})" — never a person-like name, avatar, or pronoun.
- [ ] Given a specialist event, when it renders, then the actor reads "{display name} (specialist)"; given a `SYSTEM` event, then "System, during {display name}'s submission".
- [ ] Given an event returned with `actor_type = 'AI'` and a non-null actor name, when it renders, then it still renders as "AI" — the client never attributes an AI event to a person.
- [ ] Given each value change row, when it renders, then both the Before and After cells carry the provenance badge for their own side, and an Origin column states the after-value origin in words ("AI-suggested" / "Specialist-entered").
- [ ] Given colour removed and a screen reader in use, when I traverse the trail, then every event's and every value's origin is still distinguishable and announced (SM-3).
- [ ] Given the value change table, when it renders, then values appear in stable order by `field_name`, so repeated views of the same event are identical.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.3: Read the reason I gave, in full
**As a** cargo specialist, **I want to** see my reason rendered verbatim on the edit or rejection event, **so that** the record explains its own justification months after I have forgotten the case.

**Acceptance Criteria:**
- [ ] Given an edited-and-approved or rejected decision event, when it renders, then the reason appears in full under the label "Reason given".
- [ ] Given the reason, when it renders, then it is escaped text with line breaks preserved, and is not truncated, summarised, or collapsed behind a disclosure by default.
- [ ] Given an approval with no reason, when the event renders, then no empty reason block is shown.
- [ ] Given an approval that carried an optional reason, when the event renders, then that reason is shown in the same block.
- [ ] Given a reason containing characters that resemble markup, when it renders, then it is displayed literally and never interpreted as HTML or Markdown.
- [ ] Given all edits and rejections on the deployment, when their events are read, then 100% display a non-empty reason (SM-5).

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.4: See complete before-and-after values with nothing ambiguous
**As a** cargo specialist, **I want to** see both sides of every value change with explicit wording where a side has no value, **so that** I can never mistake "no value" for "not shown".

**Acceptance Criteria:**
- [ ] Given a value row, when it renders, then both the Before and After sides are rendered.
- [ ] Given a null side, when it renders, then it reads "Not provided" — an empty cell is never used.
- [ ] Given a rejection event whose `after_value` is null, when it renders, then the After cell reads "Not recorded (rejected)".
- [ ] Given a value added by the AI for a field I left empty, when it renders, then Before reads "Not provided" and After shows the proposal badged "AI-suggested".
- [ ] Given the value change table, when its markup is inspected, then it is a real `<table>` with a `<caption>` naming its event (for example "Values recorded — recommendation edited and approved"), `scope="col"` headers, and no ARIA grid roles.
- [ ] Given timestamps, when they render, then they are absolute local date and time with the month in words and the time-zone abbreviation, carried by `<time datetime>`; relative phrasing such as "2 hours ago" is never used, and where two events share a displayed minute, the sequence number disambiguates them.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.5: Be told if the record's integrity check fails
**As a** cargo specialist, **I want to** see a statement that the record's sequence and hash chain verified — and a prominent alert if it did not — **so that** I would know immediately if the history behind a case had been tampered with.

**Acceptance Criteria:**
- [ ] Given `chain_verified: true`, when the region renders, then it states "Record integrity verified — {n} events in sequence."
- [ ] Given `chain_verified: false`, when the region renders, then a prominent USWDS error alert states "Record integrity check failed at event {sequence}. Report this immediately.", announced assertively, while the events themselves still render.
- [ ] Given a failed integrity check, when the region renders, then no repair, rewrite, recompute, or acknowledge action is offered anywhere.
- [ ] Given a tampered copy of the database, when the case is opened, then the alert names the correct divergent sequence.
- [ ] Given the verification routine, when it runs, then it is read-only and never repairs, rewrites, or annotates the chain.
- [ ] Given an empty trail returned for a case, when it is handled, then `ErrorState` renders "The audit trail could not be loaded for this case." — because receipt always writes an entry, silence about history is an error rather than a normal empty state.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.6: Find nothing on the trail that can change it or take it away
**As a** cargo specialist, **I want to** have the trail offer no editing, correcting, deleting, or exporting affordance at all, **so that** its read-only, in-place nature is visible in the interface and not merely promised in a document.

**Acceptance Criteria:**
- [ ] Given the region, when its DOM is inspected, then it contains no button, link, menu, form control, or keyboard affordance that edits, annotates, corrects, hides, redacts, deletes, or re-orders an event — there is nothing to disable because nothing is rendered.
- [ ] Given the region, when it is inspected, then it offers no download, CSV, PDF, print-package, copy-all, share, or email action, and no print stylesheet, "print view", or "copy trail" control is added.
- [ ] Given the introductory sentence, when it renders, then it states that the record cannot be edited or deleted.
- [ ] Given an open case, when the trail renders, then it shows the events so far (typically receipt, validation, exception opening, and the recommendation outcome); given a closed case, it additionally shows the decision event.
- [ ] Given I record a decision on the same screen, when the `201` returns, then the trail refreshes in place so my own decision appears without a manual reload, announced as "Audit trail updated. {n} events."; otherwise it does not poll or auto-refresh.
- [ ] Given the direct URL `/cases/{caseReference}/audit`, when I open it, then the region is scrolled to and its heading receives focus; the region is also reachable from the case screen's in-page navigation.

**Priority:** P0 | **Feature Ref:** F14

---

### US-14.7: Answer the oversight questions from the case alone
**As a** cargo specialist, **I want to** be able to answer "who decided this, what did the AI say, and what did the human change" from this one region, **so that** a later reviewer gets a complete answer without an export, a query tool, or a second system.

**Acceptance Criteria:**
- [ ] Given a decided case, when I read the trail, then *who decided this* is answerable from the decision event's actor and timestamp.
- [ ] Given the same case, when I read the trail, then *what did the AI say* is answerable from the recommendation event's after values and model identifier, alongside the case's recommendation section.
- [ ] Given the same case, when I read the trail, then *what did the human change* is answerable from the decision event's value rows with per-value origin and before/after, and *why* from the reason (SM-2: 100% traceability from the UI alone).
- [ ] Given any case, when these questions are answered, then no export, query tool, download, or secondary system is used at any point (NFR-7).
- [ ] Given an accessible traversal, when a screen reader reads the trail, then list position is announced for each event ("4 of 7") and each value table is read with its column headers.
- [ ] Given the F2 accessibility checklist, when the case screen is signed off, then the record includes a screen-reader walkthrough traversing every event and confirming AI-versus-human origin is announced for each event and each value (SM-10, SM-11).
- [ ] Given a trail load failure, when it is handled, then `ErrorState` renders "We could not load the audit trail." with "Try again", announced assertively, and a `401` redirects to sign-in.

**Priority:** P0 | **Feature Ref:** F14

---
## Epic 15: Seeded Demonstration Case (F15)

An idempotent, operator-run seed script — never a UI feature, never something the cargo
specialist does inside the running application — that pre-loads exactly one demonstration case
already carried through the full governed loop (received → validated-failed → exception → AI
recommendation → human decision → audit trail), so every later-loop scenario can be demonstrated
repeatably without hand-typing an entry and its validation failure live first. This **reverses**
PRD §10 #7 (Phase 7); the reversal is strictly additive — manual entry through F6 (Epic 6) is
unchanged and remains the only way to create any cargo entry beyond the one seeded case.

### US-15.1: Build the demonstration case through the same code the live application uses, never a shortcut
**As an** operator preparing a demonstration, **I want to** have the seed script create the case only by calling the real entry-receipt, validation, exception, recommendation, and decision service functions — never a migration `INSERT` and never a bespoke write path, **so that** the seeded case is governed by exactly the same invariants as a case a specialist and the AI produced live.

**Acceptance Criteria:**
- [ ] Given the seed script, when its implementation is reviewed, then it contains no `INSERT INTO` statement against `cargo_entries`, `exceptions`, `recommendations`, `decisions`, or `audit_entries`, and no migration file inserts any of them — verified by the existing architecture test that forbids `INSERT INTO` in migration files (FR-15.1, F0 FR-0.18).
- [ ] Given the script's calls, when they are traced, then entry receipt goes through F3's own service function, validation through F4, exception derivation through F5, recommendation generation through F9, and the decision through F11 — the identical functions an authenticated HTTP request would invoke, called in-process without HTTP (FR-15.2, FR-15.8).
- [ ] Given the resulting rows, when they are compared to a live-created case's rows, then no structural difference exists other than fixture content — the same columns populated the same way, the same constraints satisfied (FR-15.2).
- [ ] Given the script, when it runs, then it never writes directly to `cargo_entries`, `exceptions.state`, `decisions`, or any other governed table outside those service calls, preserving F9's structural no-auto-apply guarantee and F0's human-in-the-loop constraint trigger exactly as for any other case (FR-15.8, F0 FR-0.9).
- [ ] Given the fixture entry values, when they are submitted through F3, then they genuinely fail at least one `RIV-0x0` rule through F4's real evaluation — the failure is real, not asserted or hand-set.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.2: Run the script any number of times without creating a duplicate of anything
**As an** operator preparing a demonstration, **I want to** be able to run the seed script repeatedly — against an empty database, a partially-seeded one, or a fully-seeded one — and have it create nothing twice, **so that** re-running it before a walkthrough is always safe.

**Acceptance Criteria:**
- [ ] Given a freshly migrated, empty database, when the script runs once, then it produces exactly one demonstration specialist, one demonstration cargo entry, one validation result, one exception, one recommendation, and one decision (FR-15.3, FR-15.6).
- [ ] Given that same database, when the script runs a second time immediately afterward, then it creates no additional specialist, case, recommendation, decision, or audit entry, logs that the demonstration case is already present, and exits `0` (FR-15.3).
- [ ] Given a database where only the entry and exception stages have been seeded, when the script runs, then it performs only the remaining stages (recommendation, decision) without repeating entry receipt — checking each stage's existence individually rather than relying on one all-or-nothing precondition (FR-15.3).
- [ ] Given a reserved demonstration email that already belongs to a specialist record, when the script runs, then it reuses that record — created, if absent, only through the same account-provisioning path F1's `create-specialist` CLI uses, never a raw `INSERT` (FR-15.4).
- [ ] Given two concurrent invocations of the script, when both run against the same database, then F3/F9/F11's own row locks and idempotence guards mean at most one invocation performs each stage's write, and no duplicate case results.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.3: See one case that genuinely demonstrates a mixed AI/human resolution
**As an** operator preparing a demonstration, **I want to** have the seeded case's decision be an edit-and-approve that changes one AI-proposed value while leaving another AI-proposed value untouched, **so that** the one thing a live walkthrough most needs to show — a resolution mixing AI-origin and human-origin values on one case — is present without waiting for an organic case to arrive at it.

**Acceptance Criteria:**
- [ ] Given the seeded exception's recommendation reaches `AVAILABLE` with `AI`-origin proposed values, when the script records the decision, then it invokes F11's decision service with `decision_type = 'EDIT_APPROVE'` (FR-15.5).
- [ ] Given that decision, when its resolution values are read, then at least one value is a specialist-style correction re-stamped `HUMAN` origin and at least one other value is left as the AI's original proposal, retaining `AI` origin — one resolved case exhibiting both origins side by side (FR-15.5, F0 FR-0.2, FR-0.3).
- [ ] Given the decision's reason text, when it is checked, then it satisfies the same ≥10-character-after-trim floor that F11's API and F0's storage constraint enforce for any specialist's edit-and-approve (FR-15.5, F0 FR-0.15).
- [ ] Given the recommendation has not yet reached `AVAILABLE` when the script runs (for example, the provider is unreachable), when the script reaches the decision stage, then it stops before recording a decision rather than recording one against an `UNAVAILABLE` or still-`PENDING` recommendation, exits non-zero naming the stage, and is safe to re-run once the provider is reachable.
- [ ] Given an exception that already has a decision, when the script is run again, then no second `decisions` row is attempted — `UNIQUE (exception_id)` would reject it regardless, and the script's own stage check already skips it.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.4: Trust that the seeded case's audit trail is real, complete, and indistinguishable from a live one
**As an** operator preparing a demonstration, **I want to** have every stage of the seeded case write through the same append-only audit chokepoint as a live case, with a genuine hash chain and no fabricated timestamp, **so that** a stakeholder who opens the audit trail during the demonstration is reading the same kind of record they would get from any other case.

**Acceptance Criteria:**
- [ ] Given each stage the script completes, when its audit entry is inspected, then it was written exclusively by F13, in the same transaction as the state change it describes, exactly as for a live actor — the script introduces no audit write of its own and no alternate write path (FR-15.7).
- [ ] Given the seeded case's full audit trail, when the F0 chain-verification routine runs against it, then it reports `chain_verified: true`, the same as any organically produced case (FR-15.7, F0 FR-0.8).
- [ ] Given the timestamps on the seeded case's audit entries, when they are checked, then they are the actual wall-clock time the script ran — no backdated, future-dated, or manually-constructed timestamp or hash value exists anywhere in the seeded case (FR-15.7, F0 FR-0.16).
- [ ] Given any README, operator runbook, or in-repo documentation describing the seed script, when it is read, then it states plainly that the seeded case is demonstration fixture data, not organic production history — and no `is_seed` or similar column exists on any table to carry that label at the data level (FR-15.9).
- [ ] Given the seeded case, when it is opened in the case detail screen (F10) and its audit trail (F14), then both render it exactly as they would render any other resolved case — no seed-specific UI path, banner, or exception exists.

**Priority:** P0 | **Feature Ref:** F15

---

### US-15.5: Keep the seed script a narrow, operator-only tool that the application itself can never reach
**As an** operator preparing a demonstration, **I want to** have the seed script runnable only as a direct command-line invocation against the deployment — never as an HTTP endpoint, a UI control, or a scheduled job — and scoped to exactly one demonstration case, **so that** the reversal of the "no seeded data" exclusion stays as narrow as the PRD actually grants, and manual entry remains the only way anyone using the running application creates a case.

**Acceptance Criteria:**
- [ ] Given the deployed application's routes and UI, when they are enumerated, then no endpoint, screen, button, or scheduled job invokes the seed script — it is reachable only by an operator running it directly against the deployment, analogous to F1's `create-specialist` command (FR-15.10).
- [ ] Given the script's design, when it is reviewed, then it accepts no parameters that would let it create additional or varied demonstration cases, batch-generate fixture data, or otherwise act as a general-purpose factory — it creates exactly one demonstration case and nothing else (FR-15.11).
- [ ] Given the cargo entry web UI (F6/Epic 6), when it is used after the seed script has run, then it functions completely unchanged and remains the only way to create any cargo entry beyond the one seeded case — the seed script neither gates, replaces, nor short-circuits it (FR-15.2 process note; F6 §Phase 7 note).
- [ ] Given a database that is not yet migrated, or a dependency the script needs (F1's provisioning path, F3/F9/F11's service functions) that is unavailable, when the script runs, then it refuses and exits non-zero rather than silently proceeding or partially writing.
- [ ] Given the review queue (F7/F8) after seeding, when it is opened, then the seeded case appears in it only while its exception is `OPEN` (before the decision stage completes) and is correctly excluded once resolved — the queue treats the seeded case exactly as it treats any other, with no special-casing.

**Priority:** P0 | **Feature Ref:** F15

---
## Story Index

**91 stories across 16 epics (one epic per PRD feature, F0–F15; Epic 15 added Phase 7). Every
story's actor is the cargo specialist — PER-01, Dana Reyes — with two narrowly-scoped Phase 7
exceptions: Epic 15 (operator) and US-9.6 (delivery sponsor); see 00-header.md §Actor Constraint.**

### Summary by Epic

| Epic | Feature | Stories | P0 | P1 |
|------|---------|---------|----|----|
| Epic 0 — Case Data Model & Append-Only Audit Store | F0 | 5 | 5 | 0 |
| Epic 1 — Cargo Specialist Authentication & Session | F1 | 5 | 4 | 1 |
| Epic 2 — USWDS Application Shell & Accessibility Foundation | F2 | 7 | 7 | 0 |
| Epic 3 — Manual Cargo Entry Creation | F3 | 4 | 3 | 1 |
| Epic 4 — Required-Information Validation on Receipt | F4 | 4 | 4 | 0 |
| Epic 5 — Exception Creation from Validation Failure | F5 | 4 | 4 | 0 |
| Epic 6 — Cargo Entry Web UI | F6 | 6 | 5 | 1 |
| Epic 7 — Review Queue (API) | F7 | 5 | 5 | 0 |
| Epic 8 — Review Queue Web UI | F8 | 6 | 5 | 1 |
| Epic 9 — AI Resolution Recommendation Generation | F9 | 6 | 6 | 0 |
| Epic 10 — Exception Case Detail & Recommendation Presentation UI | F10 | 8 | 7 | 1 |
| Epic 11 — Human Decision Processing (API) | F11 | 7 | 6 | 1 |
| Epic 12 — Decision Web UI with Reason Capture | F12 | 7 | 6 | 1 |
| Epic 13 — Audit Entry Writer | F13 | 5 | 5 | 0 |
| Epic 14 — Per-Case Audit Trail Web UI | F14 | 7 | 7 | 0 |
| Epic 15 — Seeded Demonstration Case (Phase 7) | F15 | 5 | 5 | 0 |
| **Total** | **F0–F15** | **91** | **84** | **7** |

### Full Index

| Story | Title | Priority | Feature Ref |
|-------|-------|----------|-------------|
| US-0.1 | Decision history that cannot be rewritten afterwards | P0 | F0 |
| US-0.2 | Every recorded value attributed to AI or to me, value by value | P0 | F0 |
| US-0.3 | My submitted entry preserved exactly as I typed it | P0 | F0 |
| US-0.4 | Unambiguous event order with tamper evidence | P0 | F0 |
| US-0.5 | Structural impossibility of a case closing without my decision | P0 | F0 |
| US-1.1 | Sign in as a cargo specialist | P0 | F1 |
| US-1.2 | Be kept out of the application until I am signed in | P0 | F1 |
| US-1.3 | Have my identity attached to everything I do | P0 | F1 |
| US-1.4 | Have my session end predictably and sign out deliberately | P0 | F1 |
| US-1.5 | Be protected from repeated guessing at my account | P1 | F1 |
| US-2.1 | Work in a page frame that looks and behaves like a federal application | P0 | F2 |
| US-2.2 | Move between exactly the two places the product has | P0 | F2 |
| US-2.3 | Complete every task using the keyboard alone | P0 | F2 |
| US-2.4 | Be told clearly what went wrong and where, in a way my screen reader announces | P0 | F2 |
| US-2.5 | Tell an AI value from a human value without relying on colour | P0 | F2 |
| US-2.6 | Have every screen reviewed and signed off for accessibility before it is called done | P0 | F2 |
| US-2.7 | Keep meeting federal accessibility standards no matter which visual system renders the shell | P0 | F2 |
| US-3.1 | Have my entry received and assessed in one indivisible step | P0 | F3 |
| US-3.2 | Have my keystrokes recorded exactly as typed and attributed to me | P0 | F3 |
| US-3.3 | Be told plainly when the entry number already exists | P1 | F3 |
| US-3.4 | Have no way to get data in that skips validation | P0 | F3 |
| US-4.1 | Have my entry checked against the required-information rules the moment I submit it | P0 | F4 |
| US-4.2 | Read a plain-language reason naming the rule and the field | P0 | F4 |
| US-4.3 | Rely on the same entry always producing the same findings | P0 | F4 |
| US-4.4 | Have a clean entry recorded as explicitly clean | P0 | F4 |
| US-5.1 | Have a failing entry become a case with a stated basis | P0 | F5 |
| US-5.2 | Have cases ordered by when they arrived, permanently | P0 | F5 |
| US-5.3 | Have no way to open, reopen, or park a case outside the loop | P0 | F5 |
| US-5.4 | Identify a case by one human-readable reference everywhere | P0 | F5 |
| US-6.1 | Fill in a cargo entry on a clearly labelled USWDS form | P0 | F6 |
| US-6.2 | Submit a deliberately incomplete entry without the browser stopping me | P0 | F6 |
| US-6.3 | Be told plainly what happened to my entry | P0 | F6 |
| US-6.4 | See exactly which fields failed which rules | P0 | F6 |
| US-6.5 | Not lose my typing when something goes wrong | P1 | F6 |
| US-6.6 | Create an entry and open the resulting case with the keyboard alone | P0 | F6 |
| US-7.1 | Get the open exceptions in strict receipt order | P0 | F7 |
| US-7.2 | See only open cases in the queue, and still reach a decided one by its link | P0 | F7 |
| US-7.3 | Have the queue carry no management dimensions at all | P0 | F7 |
| US-7.4 | Open one case and receive everything I need to decide it | P0 | F7 |
| US-7.5 | Rely on the server, not the screen, to say which decisions are available | P0 | F7 |
| US-8.1 | See the open exceptions as an accessible list in receipt order | P0 | F8 |
| US-8.2 | Open a case from the queue with the keyboard | P0 | F8 |
| US-8.3 | Be told plainly when there is nothing to work, and be shown where to start | P0 | F8 |
| US-8.4 | Return to the queue after a decision and understand what changed | P0 | F8 |
| US-8.5 | Have no filtering, sorting, assignment, or aging language on the screen | P0 | F8 |
| US-8.6 | Be told when the list is showing only the first 500 cases | P1 | F8 |
| US-9.1 | Have a recommendation prepared for me without waiting for it | P0 | F9 |
| US-9.2 | Read a recommendation that is stored as a proposal, not as a change | P0 | F9 |
| US-9.3 | Know exactly what the AI said, and which model said it | P0 | F9 |
| US-9.4 | Keep working the case when the AI is unavailable | P0 | F9 |
| US-9.5 | Be certain the AI cannot decide, and cannot stray outside its remit | P0 | F9 |
| US-9.6 | Know that the recommendation shown came from a real model, not the test fake | P0 | F9 |
| US-10.1 | Read why this case is open | P0 | F10 |
| US-10.2 | Read back the values I submitted | P0 | F10 |
| US-10.3 | Read the recommended action and why the AI recommends it | P0 | F10 |
| US-10.4 | Tell every AI-suggested value from my own at the moment of deciding | P0 | F10 |
| US-10.5 | See a recommendation still being generated without being blocked or interrupted | P1 | F10 |
| US-10.6 | Decide a case that has no recommendation, without being told something failed | P0 | F10 |
| US-10.7 | Read a closed case as a final, unchangeable record | P0 | F10 |
| US-10.8 | Read the case in one predictable order with no queue or aging language | P0 | F10 |
| US-11.1 | Approve the recommendation as proposed | P0 | F11 |
| US-11.2 | Edit the recommendation and approve my version | P0 | F11 |
| US-11.3 | Reject a recommendation and close the case without adopting it | P0 | F11 |
| US-11.4 | Be required to say why whenever I edit or reject | P0 | F11 |
| US-11.5 | Be certain nothing resolves without my decision | P0 | F11 |
| US-11.6 | Never decide the same case twice, even from two tabs | P1 | F11 |
| US-11.7 | Be prevented from approving a recommendation that does not exist | P0 | F11 |
| US-12.1 | Choose among three actions with nothing chosen for me | P0 | F12 |
| US-12.2 | Edit the proposed values and see which ones I changed | P0 | F12 |
| US-12.3 | Write my reason, and be told accessibly if I have not | P0 | F12 |
| US-12.4 | See exactly what will be recorded before it is recorded | P0 | F12 |
| US-12.5 | Be shown what was actually recorded, from the server's own record | P0 | F12 |
| US-12.6 | Be handled gracefully when the case was already decided or the proposal changed | P1 | F12 |
| US-12.7 | Complete the whole decision by keyboard, and find nothing left to click afterwards | P0 | F12 |
| US-13.1 | Have every state change on my case recorded exactly once | P0 | F13 |
| US-13.2 | Have who, what, when, before, after, and origin all captured | P0 | F13 |
| US-13.3 | Have my reason travel with the event that carries it | P0 | F13 |
| US-13.4 | Know that no one can edit or delete the history — ever | P0 | F13 |
| US-13.5 | Have an unauditable change fail loudly rather than proceed quietly | P0 | F13 |
| US-14.1 | Read the whole story of a case in the case itself | P0 | F14 |
| US-14.2 | See the AI and the humans distinguished on every event and every value | P0 | F14 |
| US-14.3 | Read the reason I gave, in full | P0 | F14 |
| US-14.4 | See complete before-and-after values with nothing ambiguous | P0 | F14 |
| US-14.5 | Be told if the record's integrity check fails | P0 | F14 |
| US-14.6 | Find nothing on the trail that can change it or take it away | P0 | F14 |
| US-14.7 | Answer the oversight questions from the case alone | P0 | F14 |
| US-15.1 | Build the demonstration case through the same code the live application uses, never a shortcut | P0 | F15 |
| US-15.2 | Run the script any number of times without creating a duplicate of anything | P0 | F15 |
| US-15.3 | See one case that genuinely demonstrates a mixed AI/human resolution | P0 | F15 |
| US-15.4 | Trust that the seeded case's audit trail is real, complete, and indistinguishable from a live one | P0 | F15 |
| US-15.5 | Keep the seed script a narrow, operator-only tool that the application itself can never reach | P0 | F15 |

---

## Coverage Checks

### Feature coverage (PRD §5)

| Feature | Covered by |
|---|---|
| F0 | US-0.1 … US-0.5 |
| F1 | US-1.1 … US-1.5 |
| F2 | US-2.1 … US-2.7 |
| F3 | US-3.1 … US-3.4 |
| F4 | US-4.1 … US-4.4 |
| F5 | US-5.1 … US-5.4 |
| F6 | US-6.1 … US-6.6 |
| F7 | US-7.1 … US-7.5 |
| F8 | US-8.1 … US-8.6 |
| F9 | US-9.1 … US-9.6 |
| F10 | US-10.1 … US-10.8 |
| F11 | US-11.1 … US-11.7 |
| F12 | US-12.1 … US-12.7 |
| F13 | US-13.1 … US-13.5 |
| F14 | US-14.1 … US-14.7 |
| F15 | US-15.1 … US-15.5 |

Sixteen of sixteen features covered; every story references at least one feature.

### `.planning/PROJECT.md` Active requirement coverage

| Active requirement | Covered by |
|---|---|
| Cargo entries can be entered manually into the system | US-3.1, US-3.2, US-3.4, US-6.1, US-6.2 |
| Each entry is validated against required-information rules on receipt | US-3.1, US-4.1, US-4.2, US-4.3, US-4.4 |
| Entries that fail validation become exceptions and enter a review queue | US-5.1, US-5.2, US-5.3, US-6.3, US-7.1 |
| The queue lists open exceptions in receipt order, and a specialist can open one | US-7.1, US-7.2, US-7.4, US-8.1, US-8.2 |
| AI generates a recommended resolution action with a plain-language rationale | US-9.1, US-9.3, US-10.3, US-10.4 |
| A cargo specialist can edit, approve, or reject — no recommendation auto-applies | US-0.5, US-9.2, US-9.5, US-11.1, US-11.2, US-11.3, US-11.5, US-12.1 |
| Rejections and edits capture a reason so the record explains itself | US-11.4, US-12.3, US-13.3, US-14.3 |
| Every state change writes an append-only audit entry: who, what, when, before/after, AI-vs-human origin | US-0.1, US-0.2, US-0.4, US-13.1, US-13.2, US-13.4, US-13.5 |
| The audit trail is viewable per case in the UI | US-14.1, US-14.2, US-14.4, US-14.6, US-14.7 |
| Authenticated users sign in as a cargo specialist | US-1.1, US-1.2, US-1.3, US-1.4 |
| The UI follows USWDS and meets Section 508 / WCAG 2.1 AA (Phase 7: regardless of visual design system) | US-2.1 … US-2.7, and the accessibility criteria on US-6.6, US-8.2, US-10.8, US-12.7, US-14.7 |

Eleven of eleven Active requirements covered. **Phase 7 additionally supersedes one PROJECT.md Out
of Scope item** (§10 #7, seeded demonstration dataset), covered below.

### Phase 7 supersession coverage

| Superseded exclusion | Covered by |
|---|---|
| PROJECT.md §Out of Scope — "Seeded demonstration dataset" (PRD §10 #7, superseded by §5.7 F15) | US-15.1 … US-15.5 |

### Success-metric coverage (PRD §7)

| Metric | Asserted in |
|---|---|
| SM-1 Governed loop completeness | US-3.1, US-4.1, US-5.1, US-6.3, US-8.1, US-10.3, US-12.1, US-14.1 |
| SM-2 Decision traceability | US-14.7 |
| SM-3 Provenance attribution | US-0.2, US-10.4, US-11.2, US-14.2 |
| SM-4 Auto-apply incidents (0) | US-0.5, US-9.5, US-11.5 |
| SM-5 Reason capture completeness | US-11.4, US-12.3, US-14.3 |
| SM-6 Audit coverage 1:1 | US-13.1 |
| SM-7 Audit immutability | US-0.1, US-13.4 |
| SM-8 Exception derivation integrity | US-0.5, US-5.1 |
| SM-9 Rationale intelligibility | US-9.3 |
| SM-10 Accessibility conformance | US-2.6, US-2.7, US-6.6, US-8.2, US-10.8, US-12.7, US-14.7 |
| SM-11 Keyboard completeness | US-2.3, US-6.6, US-8.2, US-12.7 |
| SM-12 USWDS conformance (Phase 7: design-system-independent) | US-2.1, US-2.6, US-2.7 |
| SM-13 Degraded-mode loop completability | US-9.4, US-10.6, US-11.7 |
| SM-14 Scope discipline | US-3.4, US-5.2, US-5.3, US-7.3, US-8.5, US-10.7, US-13.4, US-14.6 |

### Scope-boundary check

| Check | Result |
|---|---|
| Every story's actor is the cargo specialist (PER-01), with two narrowly-scoped Phase 7 exceptions | ✅ 86 of 91 are PER-01; Epic 15 (5 stories) is written from the operator running a one-time, non-HTTP seed script (FR-15.10), and US-9.6 is written from the delivery sponsor's point of view for a deployment-configuration fact only — neither adds a second authenticated role (see 00-header.md §Actor Constraint) |
| PER-02 (oversight reviewer) appears as an actor | ✅ Never — referenced only in **so that** benefit clauses (US-0.1, US-14.7) |
| PER-03 (delivery sponsor) appears as an actor | ⚠️ Once — US-9.6 only, for a deployment-configuration assertion no cargo-specialist action can express; no screen, route, or account is implied (see 00-header.md §Actor Constraint) |
| A story implies a second role, permission, or RBAC check | ✅ None — US-1.2 and US-1.3 assert binary authorisation and the absence of a role column |
| A story implies a supervisor dashboard, queue metric, aging, throughput, workload, reassignment, or prioritisation | ✅ None — US-5.2, US-7.3, US-8.5, US-10.8 assert their absence |
| A story implies queue filtering or sorting | ✅ None — US-7.3 and US-8.5 assert rejection and absence |
| A story implies audit export | ✅ None — US-13.4 and US-14.6 assert no export surface |
| A story implies file, bulk, or API ingestion | ✅ None — US-3.4 and US-6.2 assert manual entry only |
| A story implies seeded demonstration data | ⚠️ Reversed in Phase 7, narrowly — Epic 15 (US-15.1 … US-15.5) is the deliberate exception (PRD §10 #7 superseded); manual entry (F6/Epic 6) remains the sole live-entry path, asserted unaffected by US-15.5 |
| A story implies autonomous AI resolution | ✅ None — US-9.2, US-9.5, US-11.5 assert structural impossibility |
| A story implies duty, tariff, or classification determination | ✅ None — US-4.1 and US-9.5 assert their exclusion |
| A story implies a CI accessibility gate or `.github/workflows` | ✅ None — US-2.6 asserts manual review and the absence of a gate |
| A story implies a native mobile client | ✅ None — US-2.6 covers responsive web at tablet width only |
| A story implies model training or fine-tuning | ✅ None — US-9.5 covers request/response consumption only |

---
## Priority Definitions

CargoExec uses only two priority levels. The definitions are inherited from PRD §5.0, applied at
story granularity.

| Priority | Definition in CargoExec |
|----------|-------------------------|
| **P0** | Required for the governed decision loop to be complete and provable, or required by a statutory / standards constraint (USWDS, Section 508 / WCAG 2.1 AA), or required by an accountability guarantee (append-only audit, per-value provenance, no auto-apply, mandatory reason). Absent this story, v1 fails its purpose. |
| **P1** | Required for the loop to hold up under realistic failure conditions — a duplicate entry number, a lost network response, a second browser tab, a bounded list, a slow model — but the loop is demonstrable end to end without it. |
| **P2 / P3** | **None.** A capability that would have ranked P2 or lower in a product this narrow was excluded outright rather than deprioritised (PRD §10). Carrying a P2 backlog here would misrepresent the scope. |

Every one of the sixteen features is P0 (PRD §9.1), so priority at story level is sequencing and
hardening detail within P0 features — never a suggestion that a feature is optional. Phase 7 adds
seven stories (US-2.7, US-9.6, US-15.1 … US-15.5), all P0, for the same reason: each asserts either
the statutory accessibility bar (US-2.7), the deployment posture the demonstration depends on
(US-9.6), or the governed-loop invariants the seed script must not weaken (Epic 15) — none is
sequencing-optional hardening.

### Priority Breakdown

| Priority | Stories | Share |
|----------|---------|-------|
| **P0** | 84 | 92% |
| **P1** | 7 | 8% |
| **P2 / P3** | 0 | — |
| **Total** | **91** | **100%** |

### The Seven P1 Stories

| Story | Title | Why P1 rather than P0 |
|-------|-------|------------------------|
| US-1.5 | Be protected from repeated guessing at my account | Sign-in throttling hardens the identity the audit trail attributes decisions to; the loop is walkable without it. |
| US-3.3 | Be told plainly when the entry number already exists | Duplicate-number handling is a realistic data condition, but receipt, validation, and exception derivation are demonstrable without triggering it. |
| US-6.5 | Not lose my typing when something goes wrong | Value preservation across a refused or failed submission protects the specialist's work; the happy path does not depend on it. |
| US-8.6 | Be told when the list is showing only the first 500 cases | The 500-row bound is a safety property unreachable at demonstration scale. |
| US-10.5 | See a recommendation still being generated without being blocked or interrupted | Pending-state polling improves the recommendation stage; the decision path is never blocked by its absence (US-10.6 covers the degraded path at P0). |
| US-11.6 | Never decide the same case twice, even from two tabs | Idempotency and conflict handling guard a realistic concurrency condition; the single-decision constraint at P0 (US-11.5, US-0.5) is the structural backstop. |
| US-12.6 | Be handled gracefully when the case was already decided or the proposal changed | Conflict presentation is the UI counterpart of US-11.6 and shares its rationale. |

### Suggested Delivery Sequence

Dependency-driven, following PRD §9.2. All items are P0 features, so this is sequencing rather
than triage; the P1 stories in each band are taken after that band's P0 stories.

| Band | Stories |
|---|---|
| 1 — Foundation | US-0.1 … US-0.5, US-13.1 … US-13.5, US-1.1 … US-1.4, US-2.1 … US-2.7, then US-1.5 |
| 2 — Receive & validate | US-4.1 … US-4.4, US-5.1 … US-5.4, US-3.1, US-3.2, US-3.4, US-6.1 … US-6.4, US-6.6, then US-3.3, US-6.5 |
| 3 — Queue | US-7.1 … US-7.5, US-8.1 … US-8.5, then US-8.6 |
| 4 — Recommend | US-9.1 … US-9.6, US-10.1 … US-10.4, US-10.6 … US-10.8, then US-10.5 |
| 5 — Decide | US-11.1 … US-11.5, US-11.7, US-12.1 … US-12.5, US-12.7, then US-11.6, US-12.6 |
| 6 — Prove | US-14.1 … US-14.7, then the full end-to-end walkthrough against PRD §7 |
| 7 — Demonstration enablement (Phase 7) | US-15.1 … US-15.5, run once Bands 1–6 exist for the seed script to seed against |

---

*Document generated by Pivota Spec Framework — User Stories Generator*
*Source of truth: `.planning/PROJECT.md`; derived from PRD-CargoExec.md v1.1, FRD-CargoExec.md v1.1, and PERSONAS-CargoExec.md v1.0*
*Last updated: 2026-09-16 (Phase 7 amendment: F2 UI redesign posture, F9 real-LLM posture, new F15 seeded demonstration case)*
