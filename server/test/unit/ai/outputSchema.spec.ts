import { describe, it, expect } from 'vitest';
import { validateProviderResponse } from '../../../src/ai/outputSchema.js';

// The rule ids this exception's findings actually reference. Every valid
// addresses_rule_ids entry must be a member of this set (FR-9.7).
const knownRuleIds = new Set(['RIV-011', 'RIV-073']);

/** A fully valid response body, used as the base for negative-case mutation. */
function validBody(): Record<string, unknown> {
  return {
    recommended_action: 'Correct the flagged fields, then resolve the case.',
    rationale:
      'This entry did not satisfy two required-information rules. The suggested ' +
      'values would address each flagged field; review them against the source ' +
      'documentation before deciding.',
    proposed_values: [
      {
        field_name: 'entry_number',
        proposed_value: 'ABC1234567',
        addresses_rule_ids: ['RIV-011'],
      },
      {
        field_name: 'bill_of_lading_number',
        proposed_value: 'BOL-99887766',
        addresses_rule_ids: ['RIV-073'],
      },
    ],
  };
}

describe('validateProviderResponse — accepts a valid body', () => {
  it('accepts a fully valid response', () => {
    const r = validateProviderResponse(validBody(), knownRuleIds);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.proposed_values).toHaveLength(2);
      expect(r.value.recommended_action).toContain('Correct');
    }
  });

  it('accepts an empty proposed_values array (min 0)', () => {
    const body = { ...validBody(), proposed_values: [] };
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(true);
  });
});

describe('validateProviderResponse — FR-9.8 closed schema rejects excluded determinations', () => {
  for (const forbidden of [
    'hts_code',
    'duty_amount',
    'tariff_rate',
    'classification_code',
    'admissibility_ruling',
    'penalty',
    'risk_score',
  ]) {
    it(`rejects an otherwise-valid body carrying a top-level ${forbidden}`, () => {
      const body = { ...validBody(), [forbidden]: 'anything' };
      expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
    });
  }

  it('rejects any unrecognised top-level key (strictness, not a denylist)', () => {
    const body = { ...validBody(), some_future_field: 1 };
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });

  it('rejects an unrecognised key inside a proposed value', () => {
    const body = validBody();
    (body.proposed_values as Array<Record<string, unknown>>)[0]!['weight'] = 5;
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });
});

describe('validateProviderResponse — FR-9.7 structural checks', () => {
  it('rejects a duplicate field_name across proposed_values', () => {
    const body = validBody();
    (body.proposed_values as Array<Record<string, unknown>>)[1]!['field_name'] =
      'entry_number';
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });

  it('rejects an addresses_rule_ids entry not in knownRuleIds', () => {
    const body = validBody();
    (body.proposed_values as Array<Record<string, unknown>>)[0]![
      'addresses_rule_ids'
    ] = ['RIV-999'];
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });

  it('rejects an empty addresses_rule_ids (min 1)', () => {
    const body = validBody();
    (body.proposed_values as Array<Record<string, unknown>>)[0]![
      'addresses_rule_ids'
    ] = [];
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });

  it('rejects a field_name outside ENTRY_FIELDS', () => {
    const body = validBody();
    (body.proposed_values as Array<Record<string, unknown>>)[0]!['field_name'] =
      'not_a_field';
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });
});

describe('validateProviderResponse — length boundaries', () => {
  it('rejects a 0-char recommended_action', () => {
    const body = { ...validBody(), recommended_action: '' };
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });

  it('accepts a 500-char recommended_action, rejects 501', () => {
    const at500 = { ...validBody(), recommended_action: 'a'.repeat(500) };
    const at501 = { ...validBody(), recommended_action: 'a'.repeat(501) };
    expect(validateProviderResponse(at500, knownRuleIds).ok).toBe(true);
    expect(validateProviderResponse(at501, knownRuleIds).ok).toBe(false);
  });

  it('rejects a 0-char rationale', () => {
    const body = { ...validBody(), rationale: '' };
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });

  it('accepts a 2000-char rationale, rejects 2001', () => {
    const at2000 = { ...validBody(), rationale: 'a'.repeat(2000) };
    const at2001 = { ...validBody(), rationale: 'a'.repeat(2001) };
    expect(validateProviderResponse(at2000, knownRuleIds).ok).toBe(true);
    expect(validateProviderResponse(at2001, knownRuleIds).ok).toBe(false);
  });
});

describe('validateProviderResponse — FR-9.9 no rule ids in rationale', () => {
  it('rejects a rationale containing a rule id', () => {
    const body = {
      ...validBody(),
      rationale: 'The value fails RIV-010 and must be corrected before resolving.',
    };
    expect(validateProviderResponse(body, knownRuleIds).ok).toBe(false);
  });
});

describe('validateProviderResponse — non-object / malformed input', () => {
  for (const bad of [null, undefined, 42, 'string', []]) {
    it(`rejects ${String(bad)}`, () => {
      expect(validateProviderResponse(bad, knownRuleIds).ok).toBe(false);
    });
  }
});
