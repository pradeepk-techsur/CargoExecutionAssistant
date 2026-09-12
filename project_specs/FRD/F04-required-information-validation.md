## F4: Required-Information Validation on Receipt

**Priority:** P0 · **Surface:** Programmatic API / Data · **Dependencies:** F0 · **PRD trace:** §5.2 F4, §4.3 #4, NFR-11, SM-8, R-10

**Description:** F4 is the rule evaluation that runs against every cargo entry at the moment of receipt, inside the receipt transaction (F3). It is deterministic and explanatory: it does not return a bare pass/fail but names every unsatisfied rule, the field it concerns, and why it was not satisfied, because those findings become the stated basis of the exception (F5), the input the AI reasons over (F9), and the text the specialist reads on the case screen (F10). Validation runs on receipt only — it is not a separately invocable user action, there is no re-validate endpoint, and no code path lets an entry reach a persisted state without a validation result attached.

**Terminology (feature-specific):**
- **Rule:** one independently testable check with a stable `rule_id`, a target field, a deterministic predicate, a failure code, and a human-readable message.
- **Rule set:** the complete, ordered collection of rules, identified by a `rule_set_version` string (v1: `RIV-2026.09`).
- **Finding:** the record of one failed rule — `{ rule_id, field_name, failure_code, message }`.
- **Applicable rule:** a rule whose preconditions hold for this entry (see Evaluation Semantics). Non-applicable rules are skipped and produce no finding.
- **Normalised comparison value:** a transformation applied only for the purpose of evaluating a predicate (trim, collapse internal whitespace, uppercase, strip hyphens/spaces from identifier codes). The stored entry value is never normalised (F3).
- **Domain code list:** a closed, compiled-in set of valid codes, versioned together with the rule set.

**Sub-features:**
- The required-information rule set, evaluated as a unit on receipt
- Per-rule findings naming rule, field, and reason
- Deterministic, order-stable, complete evaluation (all failures reported)
- Persisted validation result as the evidentiary basis of any exception
- Clean-pass result recorded for entries satisfying every rule

---

### [ASSUMPTION] The Required-Information Rule Set — `RIV-2026.09`

> **This rule set is an implementation assumption, open to CBP refinement.** The PRD defines the validation *mechanism* (F4) but deliberately leaves the required-information rule content to be specified. What follows is a concrete, demonstration-appropriate rule set built from ordinary cargo-entry data elements. It is recorded here as an assumption so it is visible as one rather than mistaken for a CBP-authored requirement.
>
> **Refinement boundary.** The rule *content* may be revised without touching any other feature: rules are data-driven, version-stamped, and consumed only through the finding structure. The rule *characteristics* are not negotiable — every rule must remain (a) deterministic, (b) presence / format / closed-domain-membership only, and (c) independently testable. In particular this rule set contains **no duty or tariff computation and no classification determination** (PRD §10 #9): no rule computes a duty amount, assigns or checks an HTS code, derives a rate, or makes a substantive customs determination.

#### Rules

| Rule ID | Field | Deterministic check |
|---|---|---|
| `RIV-010` | `entry_number` | Present (non-empty after trim) |
| `RIV-011` | `entry_number` | Normalised (uppercase, hyphens/spaces removed) matches `^[A-Z0-9]{3}[0-9]{8}$` |
| `RIV-020` | `importer_of_record_id` | Present |
| `RIV-021` | `importer_of_record_id` | Normalised matches IRS EIN form `^[0-9]{2}-?[0-9]{7}(-?[0-9]{2})?$` **or** CBP-assigned form `^[A-Z]{2}[0-9]{7}$` |
| `RIV-030` | `port_of_entry_code` | Present |
| `RIV-031` | `port_of_entry_code` | Normalised matches `^[0-9]{4}$` |
| `RIV-032` | `port_of_entry_code` | Normalised value is a member of the `PORT_OF_ENTRY` domain code list |
| `RIV-040` | `mode_of_transport` | Present |
| `RIV-041` | `mode_of_transport` | Normalised value ∈ `{OCEAN, AIR, TRUCK, RAIL}` |
| `RIV-050` | `carrier_code` | Present |
| `RIV-051` | `carrier_code` | If `mode_of_transport` normalises to `AIR`: matches `^[A-Z0-9]{2,3}$`; otherwise (including when mode is missing or unknown): matches SCAC form `^[A-Z]{2,4}$` |
| `RIV-060` | `conveyance_name` | Present (vessel name and voyage, flight number, or truck/rail conveyance identifier) |
| `RIV-070` | `bill_of_lading_number`, `air_waybill_number` | A transport document is present: if mode normalises to `AIR`, `air_waybill_number` present; if mode ∈ `{OCEAN, TRUCK, RAIL}`, `bill_of_lading_number` present; if mode is missing or unknown, at least one of the two present |
| `RIV-071` | `air_waybill_number` | Normalised (digits only) matches `^[0-9]{11}$` (3-digit airline prefix + 8-digit serial) |
| `RIV-072` | `bill_of_lading_number` | Normalised (uppercase, spaces removed) matches `^[A-Z0-9]{6,30}$` |
| `RIV-073` | `bill_of_lading_number`, `air_waybill_number` | Not both present (a single shipment carries one transport document type) |
| `RIV-080` | `country_of_origin_code` | Present |
| `RIV-081` | `country_of_origin_code` | Normalised matches `^[A-Z]{2}$` |
| `RIV-082` | `country_of_origin_code` | Normalised value is a member of the `COUNTRY` domain code list (ISO 3166-1 alpha-2) |
| `RIV-090` | `goods_description` | Present |
| `RIV-091` | `goods_description` | Length after trim ≥ 10 characters |
| `RIV-092` | `goods_description` | Normalised (lowercase, trimmed, internal whitespace collapsed, trailing punctuation removed) is **not** a member of the `GENERIC_DESCRIPTION` denylist |
| `RIV-100` | `quantity` | Present |
| `RIV-101` | `quantity` | Parses as a decimal and is strictly greater than 0 |
| `RIV-110` | `quantity_uom` | Present |
| `RIV-111` | `quantity_uom` | Normalised value is a member of the `UNIT_OF_MEASURE` domain code list |
| `RIV-120` | `declared_value_usd` | Present |
| `RIV-121` | `declared_value_usd` | Parses as a decimal, is strictly greater than 0, and has at most 2 decimal places |
| `RIV-130` | `arrival_date` | Present |
| `RIV-131` | `arrival_date` | Is a syntactically and calendrically valid ISO-8601 date (`YYYY-MM-DD`) |
| `RIV-132` | `arrival_date` | Falls within `[date(received_at) − 60 days, date(received_at) + 180 days]` inclusive, evaluated in UTC against the entry's own persisted `received_at` |

#### Failure codes and messages

| Rule ID | Failure code | Human-readable message |
|---|---|---|
| `RIV-010` | `ENTRY_NUMBER_MISSING` | "Enter the entry number." |
| `RIV-011` | `ENTRY_NUMBER_FORMAT` | "Entry number must be a 3-character filer code followed by 8 digits, for example ABC12345678." |
| `RIV-020` | `IMPORTER_ID_MISSING` | "Enter the importer of record identifier." |
| `RIV-021` | `IMPORTER_ID_FORMAT` | "Importer of record identifier must be an IRS number like 12-3456789 or a CBP-assigned number like AB1234567." |
| `RIV-030` | `PORT_OF_ENTRY_MISSING` | "Enter the port of entry code." |
| `RIV-031` | `PORT_OF_ENTRY_FORMAT` | "Port of entry code must be 4 digits, for example 2704." |
| `RIV-032` | `PORT_OF_ENTRY_UNKNOWN` | "Port of entry code {value} is not a recognised port code." |
| `RIV-040` | `MODE_OF_TRANSPORT_MISSING` | "Select the mode of transport." |
| `RIV-041` | `MODE_OF_TRANSPORT_UNKNOWN` | "Mode of transport must be ocean, air, truck, or rail." |
| `RIV-050` | `CARRIER_CODE_MISSING` | "Enter the carrier code." |
| `RIV-051` | `CARRIER_CODE_FORMAT` | "Carrier code must be a 2–4 letter SCAC, or a 2–3 character airline code for air shipments." |
| `RIV-060` | `CONVEYANCE_MISSING` | "Enter the conveyance — vessel and voyage, flight number, or vehicle identifier." |
| `RIV-070` | `TRANSPORT_DOCUMENT_MISSING` | "Enter the transport document number — an air waybill for air shipments, or a bill of lading otherwise." |
| `RIV-071` | `AIR_WAYBILL_FORMAT` | "Air waybill number must be 11 digits — a 3-digit airline prefix and an 8-digit serial." |
| `RIV-072` | `BILL_OF_LADING_FORMAT` | "Bill of lading number must be 6 to 30 letters and digits." |
| `RIV-073` | `TRANSPORT_DOCUMENT_CONFLICT` | "Enter either an air waybill number or a bill of lading number, not both." |
| `RIV-080` | `COUNTRY_OF_ORIGIN_MISSING` | "Enter the country of origin." |
| `RIV-081` | `COUNTRY_OF_ORIGIN_FORMAT` | "Country of origin must be a 2-letter country code, for example CN." |
| `RIV-082` | `COUNTRY_OF_ORIGIN_UNKNOWN` | "Country of origin {value} is not a recognised country code." |
| `RIV-090` | `GOODS_DESCRIPTION_MISSING` | "Describe the goods." |
| `RIV-091` | `GOODS_DESCRIPTION_TOO_SHORT` | "Describe the goods in at least 10 characters." |
| `RIV-092` | `GOODS_DESCRIPTION_NOT_SPECIFIC` | "\"{value}\" is too general. Describe what the goods actually are." |
| `RIV-100` | `QUANTITY_MISSING` | "Enter the quantity." |
| `RIV-101` | `QUANTITY_NOT_POSITIVE` | "Quantity must be greater than zero." |
| `RIV-110` | `QUANTITY_UOM_MISSING` | "Enter the unit of measure for the quantity." |
| `RIV-111` | `QUANTITY_UOM_UNKNOWN` | "Unit of measure {value} is not a recognised unit." |
| `RIV-120` | `DECLARED_VALUE_MISSING` | "Enter the declared value in US dollars." |
| `RIV-121` | `DECLARED_VALUE_INVALID` | "Declared value must be greater than zero, with at most 2 decimal places." |
| `RIV-130` | `ARRIVAL_DATE_MISSING` | "Enter the arrival date." |
| `RIV-131` | `ARRIVAL_DATE_INVALID` | "Arrival date must be a real date in YYYY-MM-DD form." |
| `RIV-132` | `ARRIVAL_DATE_OUT_OF_WINDOW` | "Arrival date must be within 60 days before or 180 days after the date this entry was received." |

#### Cross-field rules and the singular `field_name`

`RIV-070` and `RIV-073` are the only rules that concern two fields. A finding carries exactly **one** `field_name`, which is the rule's declared **primary field**, so every finding binds to one named control in storage and in the API:

| Rule | Declared primary field |
|---|---|
| `RIV-070` | `air_waybill_number` when `mode_of_transport` normalises to `AIR`; otherwise `bill_of_lading_number` |
| `RIV-073` | `air_waybill_number` |

Their **presentation binding is the enclosing fieldset, not that single control**: F6 FR-6.10 renders both on the Transport fieldset via `aria-describedby` on the `<fieldset>`, which is the intended behaviour and deliberately overrides the general "render on the control whose `id` matches `field_name`" rule for these two rules only. The primary field is what the record stores; the fieldset is what the specialist sees.

#### Domain code lists

| List | Contents | Source |
|---|---|---|
| `PORT_OF_ENTRY` | Closed set of 4-digit CBP port codes | Compiled-in constant, versioned with the rule set |
| `COUNTRY` | ISO 3166-1 alpha-2 codes | Compiled-in constant |
| `UNIT_OF_MEASURE` | `KG, LB, MT, L, M3, PCS, CTN, PLT, BOX, SET` | Compiled-in constant |
| `GENERIC_DESCRIPTION` | `goods, cargo, freight, merchandise, items, products, general merchandise, various, various goods, assorted, assorted goods, misc, miscellaneous, sample, samples, parts, spare parts, n/a, na, tbd, unknown, see attached, as per invoice` | Compiled-in constant |

- **FR-4.1 — Domain lists are constants, not data.** Domain code lists MUST be compiled-in application constants versioned with `rule_set_version`. They MUST NOT be database tables, seeded rows, editable configuration, or a runtime-administered reference data set. This keeps evaluation deterministic, keeps the schema free of reference tables, and keeps the deployment free of seed data (PRD §10 #7). Changing a list is a code change that increments `rule_set_version`.

---

### Evaluation Semantics

- **FR-4.2 — Runs on receipt, only on receipt.** F4 MUST be invoked exactly once per entry, inside the receipt transaction (F3 step 4, immediately before the single `cargo_entries` insert). There MUST be no `POST /api/validate`, no re-validate action, no scheduled re-evaluation, and no UI control that re-runs validation on a stored entry. Client-side hints in F6 are not validation and carry no authority.
- **FR-4.3 — Completeness.** All *applicable* rules MUST be evaluated and **every** failure reported. Evaluation MUST NOT short-circuit on the first failure (R-10).
- **FR-4.4 — Determinism.** Identical entry content MUST always produce an identical outcome and an identical, identically-ordered finding list (NFR-11). Therefore a rule MUST NOT read the wall clock, database state, another entry, a random source, an external service, or any mutable configuration. `RIV-132` satisfies this by evaluating against the entry's own persisted `received_at`, so re-evaluating a stored entry at any later time yields the same result. Uniqueness of the entry number is deliberately **not** a rule, because it would depend on database state (F3 FR-3.9).
- **FR-4.5 — Presence gating.** A field's format and domain rules are applicable only if that field's presence rule passed. When `RIV-010` fails, `RIV-011` is skipped and produces no finding; likewise for every other field. A specialist therefore never sees "enter the port code" and "port code must be 4 digits" for the same empty field.
- **FR-4.6 — Format gating for domain rules.** A domain-membership rule is applicable only if the same field's format rule passed: `RIV-032` is skipped when `RIV-031` failed, and `RIV-082` is skipped when `RIV-081` failed.
- **FR-4.7 — Conditional applicability.** `RIV-051` and `RIV-070` branch on the normalised `mode_of_transport`, with a defined fallback when mode is missing or unknown (stated in the rule text). `RIV-071` is applicable only when `air_waybill_number` is present; `RIV-072` only when `bill_of_lading_number` is present. `RIV-073` is applicable only when both are present. There MUST be no unreachable rule and no combination of inputs for which applicability is ambiguous.
- **FR-4.8 — Finding order.** Findings MUST be emitted in ascending `rule_id` order. This order is the contract consumed by the API response, the F6 error summary, and the F10 findings list, so the specialist sees a stable presentation.
- **FR-4.9 — No severity, no ranking.** A finding MUST NOT carry a severity, weight, score, priority, or risk rating, and the outcome MUST NOT be graded. An entry either satisfies every applicable rule or it does not. Introducing severity would introduce prioritisation, which is out of scope (PRD §10 #4).
- **FR-4.10 — Outcome.** The outcome MUST be `PASS` when zero findings are produced and `FAIL` when one or more are produced. There is no partial, warning, or conditional outcome.
- **FR-4.11 — Result persistence.** Exactly one `validation_results` row MUST be persisted per entry (`UNIQUE (entry_id)`), carrying `outcome`, `rule_set_version`, `evaluated_at`, `rules_evaluated_count`, `findings_count`, and one immutable `validation_findings` row per finding (`UNIQUE (validation_result_id, rule_id)`). A clean pass MUST be recorded as a `PASS` row with zero findings — the absence of an exception is itself evidenced, not inferred from missing data.
- **FR-4.12 — Result immutability.** `validation_results` and `validation_findings` MUST have no update or delete path in application code. A later human resolution does not amend the findings; it is recorded separately as a decision (F11), so the original basis of the exception survives intact.
- **FR-4.13 — Message rendering.** Messages MUST be plain-language, imperative where a corrective action exists, and free of rule identifiers, regular expressions, and internal jargon. Where a message interpolates `{value}`, the submitted (non-normalised) value MUST be used, truncated to 60 characters with an ellipsis if longer, and HTML-escaped at render time.
- **FR-4.14 — Findings feed downstream consumers unchanged.** The same finding structure MUST be consumed by F5 (basis of the exception), F6 (field-level error rendering), F9 (AI prompt input), and F10 (findings display). No consumer re-derives, re-words, re-orders, or filters findings.
- **FR-4.15 — Rule registry testability.** Each rule MUST be implemented as a discrete, independently unit-testable predicate registered in a rule registry keyed by `rule_id`, with at least one passing and one failing test case each, plus a test asserting that the registry's rule id set exactly matches this document's table.

---

**Inputs:**
- The canonical cargo entry record (all fourteen fields, exactly as they are about to be stored) — F4 evaluates the record that the receipt transaction inserts verbatim in the same step, so the evaluated content is byte-identical to the recorded content
- `received_at` (timestamptz) — sole temporal input, used only by `RIV-132`
- `rule_set_version` (string constant) and the compiled-in domain code lists

**Outputs:**
- `ValidationResult`: `{ outcome: "PASS" | "FAIL", rule_set_version, evaluated_at, rules_evaluated_count, findings: Finding[] }`
- `Finding`: `{ rule_id, field_name, failure_code, message }`
- Persisted `validation_results` and `validation_findings` rows
- The `VALIDATION_COMPLETED` audit entry written by F3 step 9 via F13

**Validation (of the rule set itself, verified by test):**
- Every rule in the registry has a unique `rule_id` and a unique `failure_code`.
- Every rule targets at least one field in the F3 field set; no rule targets a field that does not exist.
- Every `field_name` emitted by a finding is a member of the F3 field set, so F6 can always bind the error to a control.
- Presence-gating and format-gating relationships are declared on the rule, not implied by evaluation order.
- Evaluating the same entry twice in the same process, and in two processes, yields byte-identical serialised results.
- No rule implementation references the system clock, the database, the network, or a random source (enforced by unit-test isolation: the rule module has no such dependencies available).

**Error States:**

Required-information failure is a **business outcome, not an error** — it yields `outcome: "FAIL"` with findings and a successfully received entry (F3 FR-3.10). The error states below concern the evaluator malfunctioning:

| Scenario | Handling | Error code | Result |
|---|---|---|---|
| A rule predicate throws | Receipt transaction aborts; nothing persisted | `VALIDATION_ENGINE_FAILURE` | HTTP 500; specialist told nothing was saved |
| Rule registry fails its integrity self-check at startup | Application refuses to start | `RULE_SET_INVALID` | Deployment fails fast rather than validating inconsistently |
| A finding names a field outside the entry field set | Blocked by test; would abort receipt at runtime | `VALIDATION_ENGINE_FAILURE` | HTTP 500 |

**API Surface (this feature):** none of its own. F4 has **no** endpoint — it is invoked only inside F3's receipt transaction, and its output is returned within the `POST /api/entries` response and the case detail response (`Y1-api.md` §2, §3).

**Schema Surface (this feature):** writes `validation_results` (with `UNIQUE (id, outcome)` supporting F0 FR-0.11) and `validation_findings`. No reference/lookup tables. See `Y0-schema.md` §3 Validation.

**Acceptance Criteria:**
1. An entry with every field blank produces exactly the 13 presence findings (`RIV-010, 020, 030, 040, 050, 060, 070, 080, 090, 100, 110, 120, 130`) and no format or domain findings.
2. An entry with `port_of_entry_code = "ZZ"` produces `RIV-031` only, not `RIV-032`.
3. An entry with `port_of_entry_code = "9999"` (well-formed, unknown) produces `RIV-032` only.
4. An entry with `mode_of_transport = "AIR"` and only a bill of lading produces `RIV-070`.
5. An entry with both a bill of lading and an air waybill produces `RIV-073`.
6. `goods_description = "assorted goods"` produces `RIV-092`; `"Stainless steel fasteners, M8"` produces none.
7. The same entry validated twice produces identical, identically ordered findings; re-validating a stored entry a month later still produces the same `RIV-132` result.
8. A clean entry persists a `validation_results` row with `outcome = 'PASS'` and zero findings, and opens no exception.
9. No endpoint accepts a validation request, and no flag disables validation.
10. Every finding's `field_name` resolves to a control on the F6 form.

---
