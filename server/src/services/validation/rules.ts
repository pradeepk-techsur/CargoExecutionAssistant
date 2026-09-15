import type { CanonicalEntryRecord } from '../../db/repositories/entries.js';
import type { RuleDefinition, RuleId } from './types.js';
import {
  PORT_OF_ENTRY,
  COUNTRY,
  UNIT_OF_MEASURE,
  GENERIC_DESCRIPTION,
  MODE_OF_TRANSPORT,
} from './domain.js';
import {
  isPresent,
  upperAlnum,
  upperNoSpace,
  upperKeepHyphen,
  digitsOnly,
  collapseLower,
  parseDecimal,
  isCalendarDate,
  dateOnlyUtc,
  addDaysUtc,
  truncate60,
} from './normalise.js';

/**
 * The RIV-2026.09 required-information rule set, expressed AS DATA.
 *
 * This module is CONTENT, not mechanism. Each rule carries its id, the field(s)
 * it concerns, its DECLARED primary field, its unique failure code, its plain
 * language message, its DECLARED gating (`requires_passed`, FR-4.5/4.6), an
 * `applicable` predicate (FR-4.7), and a pure `satisfied` predicate. It answers
 * only "am I applicable?" and "am I satisfied?" for a given record — the
 * evaluation loop, gating semantics, ordering, completeness, determinism and the
 * registry integrity self-check are plan 03-04's engine.
 *
 * The 31 rules are an inherited [ASSUMPTION] (FRD F4) open to CBP refinement. A
 * revision is a change here (and/or in domain.ts) plus a RULE_SET_VERSION bump in
 * types.ts — never a change to the engine, the receipt service, the API shape or
 * the UI.
 *
 * R-L10: nothing in this directory imports a clock, a pool, a repository value,
 * node:crypto, express, pg, or anything that reaches the network. Every predicate
 * is a pure function of (CanonicalEntryRecord, receivedAt). RIV-132 is the only
 * rule that reads receivedAt, and it is the entry's own persisted value.
 */

const ALWAYS = (): boolean => true;

/** The normalised mode of transport, or '' when missing. */
function mode(r: CanonicalEntryRecord): string {
  return upperKeepHyphen(r.mode_of_transport);
}

// The RIV-2026.09 window bounds, in whole days, relative to the receipt date.
const WINDOW_DAYS_BEFORE = 60;
const WINDOW_DAYS_AFTER = 180;

export const RULES: readonly RuleDefinition[] = [
  // --- entry_number ---
  {
    rule_id: 'RIV-010',
    fields: ['entry_number'],
    primary_field: 'entry_number',
    failure_code: 'ENTRY_NUMBER_MISSING',
    message: 'Enter the entry number.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.entry_number),
  },
  {
    rule_id: 'RIV-011',
    fields: ['entry_number'],
    primary_field: 'entry_number',
    failure_code: 'ENTRY_NUMBER_FORMAT',
    message:
      'Entry number must be a 3-character filer code followed by 8 digits, for example ABC12345678.',
    requires_passed: ['RIV-010'],
    applicable: ALWAYS,
    satisfied: (r) => /^[A-Z0-9]{3}[0-9]{8}$/.test(upperAlnum(r.entry_number)),
  },

  // --- importer_of_record_id ---
  {
    rule_id: 'RIV-020',
    fields: ['importer_of_record_id'],
    primary_field: 'importer_of_record_id',
    failure_code: 'IMPORTER_ID_MISSING',
    message: 'Enter the importer of record identifier.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.importer_of_record_id),
  },
  {
    rule_id: 'RIV-021',
    fields: ['importer_of_record_id'],
    primary_field: 'importer_of_record_id',
    failure_code: 'IMPORTER_ID_FORMAT',
    message:
      'Importer of record identifier must be an IRS number like 12-3456789 or a CBP-assigned number like AB1234567.',
    requires_passed: ['RIV-020'],
    applicable: ALWAYS,
    satisfied: (r) => {
      const v = upperKeepHyphen(r.importer_of_record_id);
      return /^[0-9]{2}-?[0-9]{7}(-?[0-9]{2})?$/.test(v) || /^[A-Z]{2}[0-9]{7}$/.test(v);
    },
  },

  // --- port_of_entry_code ---
  {
    rule_id: 'RIV-030',
    fields: ['port_of_entry_code'],
    primary_field: 'port_of_entry_code',
    failure_code: 'PORT_OF_ENTRY_MISSING',
    message: 'Enter the port of entry code.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.port_of_entry_code),
  },
  {
    rule_id: 'RIV-031',
    fields: ['port_of_entry_code'],
    primary_field: 'port_of_entry_code',
    failure_code: 'PORT_OF_ENTRY_FORMAT',
    message: 'Port of entry code must be 4 digits, for example 2704.',
    requires_passed: ['RIV-030'],
    applicable: ALWAYS,
    satisfied: (r) => /^[0-9]{4}$/.test(upperAlnum(r.port_of_entry_code)),
  },
  {
    rule_id: 'RIV-032',
    fields: ['port_of_entry_code'],
    primary_field: 'port_of_entry_code',
    failure_code: 'PORT_OF_ENTRY_UNKNOWN',
    message: (r) => `Port of entry code ${truncate60(r.port_of_entry_code)} is not a recognised port code.`,
    requires_passed: ['RIV-030', 'RIV-031'],
    applicable: ALWAYS,
    satisfied: (r) => PORT_OF_ENTRY.has(upperAlnum(r.port_of_entry_code)),
  },

  // --- mode_of_transport ---
  {
    rule_id: 'RIV-040',
    fields: ['mode_of_transport'],
    primary_field: 'mode_of_transport',
    failure_code: 'MODE_OF_TRANSPORT_MISSING',
    message: 'Select the mode of transport.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.mode_of_transport),
  },
  {
    rule_id: 'RIV-041',
    fields: ['mode_of_transport'],
    primary_field: 'mode_of_transport',
    failure_code: 'MODE_OF_TRANSPORT_UNKNOWN',
    message: 'Mode of transport must be ocean, air, truck, or rail.',
    requires_passed: ['RIV-040'],
    applicable: ALWAYS,
    satisfied: (r) => MODE_OF_TRANSPORT.has(upperKeepHyphen(r.mode_of_transport)),
  },

  // --- carrier_code ---
  {
    rule_id: 'RIV-050',
    fields: ['carrier_code'],
    primary_field: 'carrier_code',
    failure_code: 'CARRIER_CODE_MISSING',
    message: 'Enter the carrier code.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.carrier_code),
  },
  {
    rule_id: 'RIV-051',
    fields: ['carrier_code'],
    primary_field: 'carrier_code',
    failure_code: 'CARRIER_CODE_FORMAT',
    message:
      'Carrier code must be a 2–4 letter SCAC, or a 2–3 character airline code for air shipments.',
    requires_passed: ['RIV-050'],
    applicable: ALWAYS,
    satisfied: (r) => {
      const v = upperKeepHyphen(r.carrier_code);
      // Air uses the 2–3 char IATA/ICAO form; every other mode — including a
      // missing or unknown mode — uses the SCAC form.
      if (mode(r) === 'AIR') return /^[A-Z0-9]{2,3}$/.test(v);
      return /^[A-Z]{2,4}$/.test(v);
    },
  },

  // --- conveyance_name ---
  {
    rule_id: 'RIV-060',
    fields: ['conveyance_name'],
    primary_field: 'conveyance_name',
    failure_code: 'CONVEYANCE_MISSING',
    message: 'Enter the conveyance — vessel and voyage, flight number, or vehicle identifier.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.conveyance_name),
  },

  // --- transport document (bill of lading / air waybill) ---
  {
    rule_id: 'RIV-070',
    fields: ['bill_of_lading_number', 'air_waybill_number'],
    primary_field: (r) => (mode(r) === 'AIR' ? 'air_waybill_number' : 'bill_of_lading_number'),
    failure_code: 'TRANSPORT_DOCUMENT_MISSING',
    message:
      'Enter the transport document number — an air waybill for air shipments, or a bill of lading otherwise.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => {
      const m = mode(r);
      const hasAwb = isPresent(r.air_waybill_number);
      const hasBol = isPresent(r.bill_of_lading_number);
      if (m === 'AIR') return hasAwb;
      if (m === 'OCEAN' || m === 'TRUCK' || m === 'RAIL') return hasBol;
      // Mode missing or unknown: at least one of the two present.
      return hasAwb || hasBol;
    },
  },
  {
    rule_id: 'RIV-071',
    fields: ['air_waybill_number'],
    primary_field: 'air_waybill_number',
    failure_code: 'AIR_WAYBILL_FORMAT',
    message:
      'Air waybill number must be 11 digits — a 3-digit airline prefix and an 8-digit serial.',
    requires_passed: [],
    applicable: (r) => isPresent(r.air_waybill_number),
    satisfied: (r) => /^[0-9]{11}$/.test(digitsOnly(r.air_waybill_number)),
  },
  {
    rule_id: 'RIV-072',
    fields: ['bill_of_lading_number'],
    primary_field: 'bill_of_lading_number',
    failure_code: 'BILL_OF_LADING_FORMAT',
    message: 'Bill of lading number must be 6 to 30 letters and digits.',
    requires_passed: [],
    applicable: (r) => isPresent(r.bill_of_lading_number),
    satisfied: (r) => /^[A-Z0-9]{6,30}$/.test(upperNoSpace(r.bill_of_lading_number)),
  },
  {
    rule_id: 'RIV-073',
    fields: ['bill_of_lading_number', 'air_waybill_number'],
    primary_field: 'air_waybill_number',
    failure_code: 'TRANSPORT_DOCUMENT_CONFLICT',
    message: 'Enter either an air waybill number or a bill of lading number, not both.',
    requires_passed: [],
    applicable: (r) => isPresent(r.bill_of_lading_number) && isPresent(r.air_waybill_number),
    // Not both present. When applicable (both are present), this is never true —
    // a conflict always exists — so the rule reports on exactly the both-present case.
    satisfied: (r) => !(isPresent(r.bill_of_lading_number) && isPresent(r.air_waybill_number)),
  },

  // --- country_of_origin_code ---
  {
    rule_id: 'RIV-080',
    fields: ['country_of_origin_code'],
    primary_field: 'country_of_origin_code',
    failure_code: 'COUNTRY_OF_ORIGIN_MISSING',
    message: 'Enter the country of origin.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.country_of_origin_code),
  },
  {
    rule_id: 'RIV-081',
    fields: ['country_of_origin_code'],
    primary_field: 'country_of_origin_code',
    failure_code: 'COUNTRY_OF_ORIGIN_FORMAT',
    message: 'Country of origin must be a 2-letter country code, for example CN.',
    requires_passed: ['RIV-080'],
    applicable: ALWAYS,
    satisfied: (r) => /^[A-Z]{2}$/.test(upperKeepHyphen(r.country_of_origin_code)),
  },
  {
    rule_id: 'RIV-082',
    fields: ['country_of_origin_code'],
    primary_field: 'country_of_origin_code',
    failure_code: 'COUNTRY_OF_ORIGIN_UNKNOWN',
    message: (r) =>
      `Country of origin ${truncate60(r.country_of_origin_code)} is not a recognised country code.`,
    requires_passed: ['RIV-080', 'RIV-081'],
    applicable: ALWAYS,
    satisfied: (r) => COUNTRY.has(upperKeepHyphen(r.country_of_origin_code)),
  },

  // --- goods_description ---
  {
    rule_id: 'RIV-090',
    fields: ['goods_description'],
    primary_field: 'goods_description',
    failure_code: 'GOODS_DESCRIPTION_MISSING',
    message: 'Describe the goods.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.goods_description),
  },
  {
    rule_id: 'RIV-091',
    fields: ['goods_description'],
    primary_field: 'goods_description',
    failure_code: 'GOODS_DESCRIPTION_TOO_SHORT',
    message: 'Describe the goods in at least 10 characters.',
    requires_passed: ['RIV-090'],
    applicable: ALWAYS,
    satisfied: (r) => (r.goods_description ?? '').trim().length >= 10,
  },
  {
    rule_id: 'RIV-092',
    fields: ['goods_description'],
    primary_field: 'goods_description',
    failure_code: 'GOODS_DESCRIPTION_NOT_SPECIFIC',
    message: (r) => `"${truncate60(r.goods_description)}" is too general. Describe what the goods actually are.`,
    requires_passed: ['RIV-090'],
    applicable: ALWAYS,
    satisfied: (r) => !GENERIC_DESCRIPTION.has(collapseLower(r.goods_description)),
  },

  // --- quantity ---
  {
    rule_id: 'RIV-100',
    fields: ['quantity'],
    primary_field: 'quantity',
    failure_code: 'QUANTITY_MISSING',
    message: 'Enter the quantity.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.quantity),
  },
  {
    rule_id: 'RIV-101',
    fields: ['quantity'],
    primary_field: 'quantity',
    failure_code: 'QUANTITY_NOT_POSITIVE',
    message: 'Quantity must be greater than zero.',
    requires_passed: ['RIV-100'],
    applicable: ALWAYS,
    satisfied: (r) => {
      const p = parseDecimal(r.quantity);
      return p.ok && p.value > 0;
    },
  },

  // --- quantity_uom ---
  {
    rule_id: 'RIV-110',
    fields: ['quantity_uom'],
    primary_field: 'quantity_uom',
    failure_code: 'QUANTITY_UOM_MISSING',
    message: 'Enter the unit of measure for the quantity.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.quantity_uom),
  },
  {
    rule_id: 'RIV-111',
    fields: ['quantity_uom'],
    primary_field: 'quantity_uom',
    failure_code: 'QUANTITY_UOM_UNKNOWN',
    message: (r) => `Unit of measure ${truncate60(r.quantity_uom)} is not a recognised unit.`,
    requires_passed: ['RIV-110'],
    applicable: ALWAYS,
    satisfied: (r) => UNIT_OF_MEASURE.has(upperKeepHyphen(r.quantity_uom)),
  },

  // --- declared_value_usd ---
  {
    rule_id: 'RIV-120',
    fields: ['declared_value_usd'],
    primary_field: 'declared_value_usd',
    failure_code: 'DECLARED_VALUE_MISSING',
    message: 'Enter the declared value in US dollars.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.declared_value_usd),
  },
  {
    rule_id: 'RIV-121',
    fields: ['declared_value_usd'],
    primary_field: 'declared_value_usd',
    failure_code: 'DECLARED_VALUE_INVALID',
    message: 'Declared value must be greater than zero, with at most 2 decimal places.',
    requires_passed: ['RIV-120'],
    applicable: ALWAYS,
    satisfied: (r) => {
      const p = parseDecimal(r.declared_value_usd);
      return p.ok && p.value > 0 && p.decimals <= 2;
    },
  },

  // --- arrival_date ---
  {
    rule_id: 'RIV-130',
    fields: ['arrival_date'],
    primary_field: 'arrival_date',
    failure_code: 'ARRIVAL_DATE_MISSING',
    message: 'Enter the arrival date.',
    requires_passed: [],
    applicable: ALWAYS,
    satisfied: (r) => isPresent(r.arrival_date),
  },
  {
    rule_id: 'RIV-131',
    fields: ['arrival_date'],
    primary_field: 'arrival_date',
    failure_code: 'ARRIVAL_DATE_INVALID',
    message: 'Arrival date must be a real date in YYYY-MM-DD form.',
    requires_passed: ['RIV-130'],
    applicable: ALWAYS,
    satisfied: (r) => isCalendarDate(r.arrival_date),
  },
  {
    rule_id: 'RIV-132',
    fields: ['arrival_date'],
    primary_field: 'arrival_date',
    failure_code: 'ARRIVAL_DATE_OUT_OF_WINDOW',
    message:
      'Arrival date must be within 60 days before or 180 days after the date this entry was received.',
    requires_passed: ['RIV-130', 'RIV-131'],
    applicable: ALWAYS,
    satisfied: (r, receivedAt) => {
      const arrival = r.arrival_date;
      if (arrival === null) return false;
      // Evaluate in UTC against the entry's own persisted received_at. Both
      // bounds inclusive.
      const receiptDay = dateOnlyUtc(receivedAt);
      const lower = addDaysUtc(receiptDay, -WINDOW_DAYS_BEFORE);
      const upper = addDaysUtc(receiptDay, WINDOW_DAYS_AFTER);
      // Lexicographic comparison of zero-padded YYYY-MM-DD strings is a valid
      // chronological comparison.
      return arrival >= lower && arrival <= upper;
    },
  },
] as const;

// A compile-time assurance that every rule_id is a well-formed RuleId literal.
// (The runtime hygiene assertions live in the spec; this only guards the type.)
type _AssertRuleIds = (typeof RULES)[number]['rule_id'] extends RuleId ? true : never;
const _ruleIdsAreRuleIds: _AssertRuleIds = true;
void _ruleIdsAreRuleIds;
