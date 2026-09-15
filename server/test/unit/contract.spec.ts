import { describe, it, expect } from 'vitest';
import {
  ENTRY_FIELDS,
  ERROR_CODES,
  ERROR_MESSAGES,
  INTERNAL_INVARIANT_CODES,
  type EntryFieldName,
  type EntryFieldOrigins,
  type EntryValues,
  type ErrorCode,
} from '@cargoexec/contract';

describe('contract — Y2 error catalogue (§3.10, Y2 §1/§2/§7)', () => {
  it('ERROR_CODES has exactly 23 members', () => {
    expect(ERROR_CODES).toHaveLength(23);
  });

  it('ERROR_CODES contains no duplicates', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('INTERNAL_INVARIANT_CODES has exactly 9 members', () => {
    expect(INTERNAL_INVARIANT_CODES).toHaveLength(9);
  });

  it('INTERNAL_INVARIANT_CODES contains VALIDATION_ENGINE_FAILURE (F4 §Error States)', () => {
    expect(INTERNAL_INVARIANT_CODES).toContain('VALIDATION_ENGINE_FAILURE');
  });

  it('ERROR_CODES does NOT contain VALIDATION_ENGINE_FAILURE — it never reaches the wire', () => {
    expect(ERROR_CODES as readonly string[]).not.toContain('VALIDATION_ENGINE_FAILURE');
  });

  it('ERROR_CODES is disjoint from INTERNAL_INVARIANT_CODES (Y2 §7 — internal codes never reach the wire)', () => {
    const client = new Set<string>(ERROR_CODES);
    const overlap = INTERNAL_INVARIANT_CODES.filter((c) => client.has(c));
    expect(
      overlap,
      `Internal invariant code(s) leaked into the client-facing union: ${overlap.join(', ')}. ` +
        'HITL_VIOLATION and friends are logged against request_id, never returned (Y2 §7).',
    ).toEqual([]);
  });

  it('carries the five Y2 §1 session messages verbatim', () => {
    expect(ERROR_MESSAGES.AUTH_FAILED).toBe('Email or password is incorrect.');
    expect(ERROR_MESSAGES.UNAUTHENTICATED).toBe('Sign in to continue.');
    expect(ERROR_MESSAGES.ACCOUNT_INACTIVE).toBe('This account is not active.');
    expect(ERROR_MESSAGES.CSRF_INVALID).toBe(
      'Your session could not be verified. Refresh and try again.',
    );
    expect(ERROR_MESSAGES.TOO_MANY_ATTEMPTS).toBe(
      'Too many sign-in attempts. Try again in about 15 minutes.',
    );
  });

  it('type-level: ApiErrorBody error code is an ErrorCode', () => {
    const _check: ErrorCode = 'UNAUTHENTICATED';
    expect(_check).toBe('UNAUTHENTICATED');
  });
});

describe('contract — §3.12 entry wire types are keyed by exactly the fourteen ENTRY_FIELDS', () => {
  it('has exactly fourteen entry fields', () => {
    expect(ENTRY_FIELDS).toHaveLength(14);
    expect(new Set(ENTRY_FIELDS).size).toBe(ENTRY_FIELDS.length);
  });

  it('EntryValues is keyed by exactly ENTRY_FIELDS — a fifteenth field cannot be introduced on one side only', () => {
    // Compile-time: a literal keyed by every ENTRY_FIELD satisfies EntryValues.
    // A field added to EntryFieldName but not here (or vice versa) fails `tsc`.
    const values = {
      entry_number: 'x',
      importer_of_record_id: null,
      port_of_entry_code: null,
      mode_of_transport: null,
      carrier_code: null,
      conveyance_name: null,
      bill_of_lading_number: null,
      air_waybill_number: null,
      country_of_origin_code: null,
      goods_description: null,
      quantity: null,
      quantity_uom: null,
      declared_value_usd: null,
      arrival_date: null,
    } satisfies EntryValues;
    // Runtime: the constructed literal's keys are exactly ENTRY_FIELDS.
    expect(Object.keys(values).sort()).toEqual([...ENTRY_FIELDS].sort());
  });

  it('EntryFieldOrigins keys are a subset of ENTRY_FIELDS with the constant value HUMAN', () => {
    const origins = { entry_number: 'HUMAN', goods_description: 'HUMAN' } satisfies EntryFieldOrigins;
    const fieldSet = new Set<string>(ENTRY_FIELDS);
    for (const key of Object.keys(origins)) {
      expect(fieldSet.has(key)).toBe(true);
    }
    expect(Object.values(origins).every((v) => v === 'HUMAN')).toBe(true);
    // A key outside ENTRY_FIELDS is a compile error, proving the mapped-type link.
    const _fieldName: EntryFieldName = 'quantity';
    expect(fieldSet.has(_fieldName)).toBe(true);
  });
});
