import { describe, it, expect } from 'vitest';
import { ENTRY_FIELDS, INTERNAL_INVARIANT_CODES } from '@cargoexec/contract';

describe('contract scaffolding', () => {
  it('ENTRY_FIELDS has exactly the fourteen submitted entry fields', () => {
    expect(ENTRY_FIELDS).toHaveLength(14);
  });

  it('ENTRY_FIELDS contains no duplicates', () => {
    expect(new Set(ENTRY_FIELDS).size).toBe(ENTRY_FIELDS.length);
  });

  it('ENTRY_FIELDS matches the FRD Y0 §2 cefo_field_name_chk list exactly', () => {
    expect([...ENTRY_FIELDS]).toEqual([
      'entry_number',
      'importer_of_record_id',
      'port_of_entry_code',
      'mode_of_transport',
      'carrier_code',
      'conveyance_name',
      'bill_of_lading_number',
      'air_waybill_number',
      'country_of_origin_code',
      'goods_description',
      'quantity',
      'quantity_uom',
      'declared_value_usd',
      'arrival_date',
    ]);
  });

  it('INTERNAL_INVARIANT_CODES contains the eight Y2 §7 database-enforced codes', () => {
    // These eight are the DATABASE-enforced invariant codes (triggers / CHECKs /
    // FKs). They must all be present, always.
    const dbEnforced = new Set([
      'AUDIT_IMMUTABLE',
      'AUDIT_CHAIN_BROKEN',
      'AUDIT_COUPLING_VIOLATION',
      'HITL_VIOLATION',
      'EXCEPTION_WITHOUT_BASIS',
      'AUDIT_SEQUENCE_CONFLICT',
      'AUDIT_WRITE_INVALID',
      'AUDIT_WRITE_FORBIDDEN_CONTENT',
    ]);
    for (const code of dbEnforced) {
      expect(INTERNAL_INVARIANT_CODES as readonly string[]).toContain(code);
    }
  });

  it('INTERNAL_INVARIANT_CODES additionally carries the application-level VALIDATION_ENGINE_FAILURE (F4 §Error States)', () => {
    // Not a database-enforced code: it is raised when a rule predicate throws or a
    // finding names an out-of-set field (plan 03-01). Like the DB codes it is
    // logged against request_id and surfaces only as the generic 500 RECEIPT_FAILED,
    // so it belongs in INTERNAL_INVARIANT_CODES and NOT in ERROR_CODES.
    expect(INTERNAL_INVARIANT_CODES).toHaveLength(9);
    expect(INTERNAL_INVARIANT_CODES as readonly string[]).toContain('VALIDATION_ENGINE_FAILURE');
  });
});
