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
    expect(INTERNAL_INVARIANT_CODES).toHaveLength(8);
    expect(new Set(INTERNAL_INVARIANT_CODES)).toEqual(
      new Set([
        'AUDIT_IMMUTABLE',
        'AUDIT_CHAIN_BROKEN',
        'AUDIT_COUPLING_VIOLATION',
        'HITL_VIOLATION',
        'EXCEPTION_WITHOUT_BASIS',
        'AUDIT_SEQUENCE_CONFLICT',
        'AUDIT_WRITE_INVALID',
        'AUDIT_WRITE_FORBIDDEN_CONTENT',
      ]),
    );
  });
});
