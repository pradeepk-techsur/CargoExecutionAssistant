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
