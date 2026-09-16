import { describe, it, expect } from 'vitest';
import {
  createFakeProvider,
  FAKE_AI_TRIGGERS,
} from '../../../src/ai/fakeProvider.js';
import type { ProviderRequest } from '../../../src/ai/provider.js';
import { PROVIDER_FAILURE_REASONS } from '../../../src/ai/provider.js';
import { validateProviderResponse } from '../../../src/ai/outputSchema.js';

/** A base request with two findings across two distinct fields. */
function baseRequest(
  overrideValues: Record<string, string | null> = {},
): ProviderRequest {
  return {
    entryValues: {
      entry_number: 'ABC1234567',
      bill_of_lading_number: 'BOL-1',
      ...overrideValues,
    },
    findings: [
      {
        rule_id: 'RIV-011',
        field_name: 'entry_number',
        failure_code: 'FORMAT',
        message: 'Entry number format is invalid.',
      },
      {
        rule_id: 'RIV-073',
        field_name: 'bill_of_lading_number',
        failure_code: 'REQUIRED',
        message: 'A bill of lading number is required.',
      },
    ],
    ruleSetVersion: 'RIV-2026.09',
    promptVersion: '2026.09.1',
  };
}

describe('createFakeProvider — default success', () => {
  it('produces SUCCESS with one proposed value per distinct field_name', async () => {
    const provider = createFakeProvider();
    const result = await provider.generate(baseRequest());
    expect(result.outcome).toBe('SUCCESS');
    if (result.outcome === 'SUCCESS') {
      expect(result.proposed_values).toHaveLength(2);
      const byField = new Map(
        result.proposed_values.map((v) => [v.field_name, v.addresses_rule_ids]),
      );
      expect(byField.get('entry_number')).toEqual(['RIV-011']);
      expect(byField.get('bill_of_lading_number')).toEqual(['RIV-073']);
    }
  });

  it('groups multiple rule ids on the same field into one proposed value', async () => {
    const req: ProviderRequest = {
      ...baseRequest(),
      findings: [
        {
          rule_id: 'RIV-011',
          field_name: 'entry_number',
          failure_code: 'FORMAT',
          message: 'x',
        },
        {
          rule_id: 'RIV-012',
          field_name: 'entry_number',
          failure_code: 'LENGTH',
          message: 'y',
        },
      ],
    };
    const result = await createFakeProvider().generate(req);
    expect(result.outcome).toBe('SUCCESS');
    if (result.outcome === 'SUCCESS') {
      expect(result.proposed_values).toHaveLength(1);
      expect(result.proposed_values[0]?.addresses_rule_ids).toEqual([
        'RIV-011',
        'RIV-012',
      ]);
    }
  });

  it('is deterministic across repeated calls', async () => {
    const provider = createFakeProvider();
    const a = await provider.generate(baseRequest());
    const b = await provider.generate(baseRequest());
    expect(a).toEqual(b);
  });
});

describe('createFakeProvider — failure sentinels', () => {
  for (const reason of PROVIDER_FAILURE_REASONS) {
    it(`returns FAILURE ${reason} when its marker is in any field`, async () => {
      const marker = FAKE_AI_TRIGGERS[reason];
      const provider = createFakeProvider();
      // Place the marker in a field that isn't otherwise significant.
      const result = await provider.generate(
        baseRequest({ conveyance_name: marker }),
      );
      expect(result.outcome).toBe('FAILURE');
      if (result.outcome === 'FAILURE') {
        expect(result.failure_reason).toBe(reason);
      }
    });
  }
});

describe('createFakeProvider — round-trip with the validator', () => {
  it("the success output passes validateProviderResponse against the same findings' rule ids", async () => {
    const req = baseRequest();
    const result = await createFakeProvider().generate(req);
    expect(result.outcome).toBe('SUCCESS');
    if (result.outcome === 'SUCCESS') {
      const knownRuleIds = new Set(req.findings.map((f) => f.rule_id));
      const { outcome: _o, ...body } = result;
      void _o;
      const validated = validateProviderResponse(body, knownRuleIds);
      expect(validated.ok).toBe(true);
    }
  });
});
