---
status: complete
phase: 03-receive-validate-except
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md, 03-08-SUMMARY.md
started: 2026-09-15T17:34:23Z
updated: 2026-09-15T17:42:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Submit a clean cargo entry — receipt states "validated clean"
expected: POSTing a complete, correct cargo entry returns 201 with receipt_outcome "VALIDATED_CLEAN", validation.outcome "PASS", zero findings, and no exception. GET on the entry returns the same values byte-for-byte.
result: pass

### 2. Submit an incomplete cargo entry — exception opens with a case reference
expected: POSTing an entry missing required information (e.g. a completely empty body) returns 201 with receipt_outcome "EXCEPTION_OPENED", a case_reference, validation.outcome "FAIL", and every unsatisfied rule reported in the same pass — each finding named in plain language and bound to its field.
result: skipped
reason: "no UI exists yet to drive this without an API client"

### 3. Duplicate entry number is refused, naming the existing case
expected: POSTing a second entry re-using an entry_number already on record is refused (409) and the error names the entry number and the existing case_reference it collides with — nothing new is created.
result: skipped
reason: "no UI exists yet to drive this without an API client"

### 4. An exception cannot be authored except by a genuine validation failure
expected: There is no API shape, screen affordance, or SQL path reachable by the application role that can create an OPEN exception without a corresponding validation failure as its basis. (no screen)
result: skipped
reason: "no way to independently verify this system property"

### 5. A failed receipt saves nothing at all
expected: When any part of receiving an entry fails partway through, the database is left completely unchanged — no orphan entry, no orphan exception, no orphan audit entry. (no screen)
result: skipped
reason: "no way to independently verify this system property"

### 6. Unauthenticated access to the receipt API is refused
expected: A request to POST or GET against /api/entries with no signed-in session is refused (401) rather than silently processed or exposing data.
result: skipped
reason: "no UI exists yet to drive this without an API client"

## Self-Check

boot: 302 (redirects to /sign-in — app healthy)
data: skipped — self_check drove every flow directly with its own generated entries; no fixture data was required beyond the bootstrap specialist credential already provisioned by compose
routes_probed: 7 ok / 0 failed (GET /, POST /api/session, GET /api/session cookie inspect, POST /api/entries ×4, GET /api/entries/:id, unauthenticated POST /api/entries)
cookie: "iframe-hostile: SameSite=Lax Secure=absent" (carried over from Phase 2 — same shipped default, `SESSION_COOKIE_PROFILE=governed`; not a new Phase 3 defect, noted here for visibility since /api/entries is the first Phase-3 write path a specialist would use through the Preview panel)
browser_urls: 0 gaps / 0 advisories (one PUBLIC_ORIGIN=http://localhost:3000 sighting in .env/.env.example matched the classifier's PUBLIC_ prefix pattern, but this project is Vite-only — only VITE_-prefixed vars reach the browser bundle; grep of the built JS bundle and of web/src confirms PUBLIC_ORIGIN is read solely by server/src/config.ts server-side. False positive, not recorded as a gap.)
repairs: none — self-check made no changes to the running instance; git status clean before and after
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: POST /api/entries with a complete, RIV-clean 14-field body (entry_number DEF89493321, importer_of_record_id 12-3456789, ocean mode + bill of lading, no air waybill) returned 201 receipt_outcome=VALIDATED_CLEAN, validation.outcome=PASS, findings=[], exception=null, case_reference CE-2026-000002. GET /api/entries/{id} returned the identical stored values byte-for-byte with all 13 provided fields (air_waybill_number correctly null per RIV-073) marked HUMAN."
    confidence: proven
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: POST /api/entries with an empty body {} returned 201 receipt_outcome=EXCEPTION_OPENED, validation.outcome=FAIL with exactly 13 findings in one pass (RIV-010 through RIV-130), each field-bound (entry_number, importer_of_record_id, port_of_entry_code, mode_of_transport, carrier_code, conveyance_name, bill_of_lading_number, country_of_origin_code, goods_description, quantity, quantity_uom, declared_value_usd, arrival_date) with a plain-language message and a distinct rule_id/failure_code per field."
    confidence: proven
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: re-POSTing entry_number DEF89493321 (already on case CE-2026-000002 from test 1) returned 409 ENTRY_NUMBER_DUPLICATE naming both the entry number and the existing case_reference verbatim in the error message. No new case was created."
    confidence: proven
  - test: 4
    verdict: pass
    note: "🤖 Auto-check: 03-07's exceptionBasis.spec.ts (14 db-tier cases, cargoexec_app) proves an exception on a PASS validation_outcome is refused by exceptions_basis_fk (23503, a genuine foreign-key violation, not a P0001 trigger) and an explicit PASS basis is separately refused by exceptions_basis_is_failure_chk (23514). receiptPaths.spec.ts (11 architecture assertion groups) proves by source scan that the only INSERT INTO exceptions call site is receipt.service.ts, no route or UI affordance authors one, and both were proven RED on planted violations before being trusted. Full suite (unit 218/db 160/api 104/arch 148 = 630) green at HEAD; git diff for 03-07 touched only test files."
    confidence: proven
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: 03-07's receiptAtomicity.spec.ts (12 cases) forces real mid-transaction failures (forbidden audit content, duplicate entry_number, over-length field) after the entries table's own INSERT and finds an eight-table census byte-identical afterwards, including zero new cargo_entries rows; five whole-database orphan/coupling invariant queries each return 0. This self-check's own duplicate-entry probe (test 3) is a live instance of the same guarantee: the 409 left no new row behind."
    confidence: proven
  - test: 6
    verdict: pass
    note: "🤖 Auto-check: POST /api/entries with no session cookie returned 401 UNAUTHENTICATED before reaching the route handler, matching requireApiAuth's documented behaviour (03-03) — the same gate now covers this phase's first write path."
    confidence: proven

## Gaps

[none — self_check found no failures; all six tests reproducible and passing at HEAD. Note: the Phase 2 iframe-hostile-cookie gap (SESSION_COOKIE_PROFILE=governed default) remains open from the 02-UAT.md round and is not re-recorded here as a duplicate — it affects every authenticated flow including this phase's, and its fix belongs to the phase/deployment config that owns SESSION_COOKIE_PROFILE, not to Phase 3's own code.]

## Summary

total: 6
passed: 1
issues: 0
pending: 0
skipped: 5
