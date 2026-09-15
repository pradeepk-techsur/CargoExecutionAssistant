// The deterministic, no-network RecommendationProvider test double (TechArch §5).
//
// This is the default/injected provider EVERYWHERE except the one real HTTP
// adapter (plan 05-04): it lets every Phase 5 test (unit, db, api, e2e) run the
// full generation pipeline with zero external dependency, and it is safe to
// wire into the REAL running server (via AI_PROVIDER_URL=fake:deterministic)
// for the e2e demonstration (plan 05-06).
//
// It has NO setTimeout, NO real delay, and NO network call: it resolves
// synchronously-fast so the test tiers stay fast. A specific outcome branch is
// selected by placing the matching sentinel string in ANY submitted entry
// field value (FAKE_AI_TRIGGERS); with no sentinel present it returns a
// deterministic SUCCESS addressing every finding.

import type {
  ProviderFailureReason,
  ProviderRequest,
  ProviderResult,
  RecommendationProvider,
} from './provider.js';

/**
 * A sentinel marker per failure reason. Placing a marker in any one entry field
 * value makes FakeProvider return that FAILURE outcome — the mechanism by which
 * tests exercise every degraded-provider branch without a real provider.
 */
export const FAKE_AI_TRIGGERS: Record<ProviderFailureReason, string> = {
  PROVIDER_TIMEOUT: '__FAKE_AI_TIMEOUT__',
  PROVIDER_UNAVAILABLE: '__FAKE_AI_UNAVAILABLE__',
  PROVIDER_RATE_LIMITED: '__FAKE_AI_RATE_LIMITED__',
  PROVIDER_AUTH_FAILED: '__FAKE_AI_AUTH_FAILED__',
  SCHEMA_INVALID: '__FAKE_AI_SCHEMA_INVALID__',
  CONTENT_FILTERED: '__FAKE_AI_CONTENT_FILTERED__',
  INTERNAL_ERROR: '__FAKE_AI_INTERNAL_ERROR__',
};

export function createFakeProvider(): RecommendationProvider {
  return {
    async generate(req: ProviderRequest): Promise<ProviderResult> {
      const allValues = Object.values(req.entryValues);
      for (const [reason, marker] of Object.entries(FAKE_AI_TRIGGERS)) {
        if (allValues.some((v) => v === marker)) {
          return {
            outcome: 'FAILURE',
            failure_reason: reason as ProviderFailureReason,
          };
        }
      }

      // Default: a deterministic success addressing every finding — one
      // proposed value per distinct field_name, each carrying that field's
      // rule ids exactly.
      const byField = new Map<string, string[]>();
      for (const f of req.findings) {
        const arr = byField.get(f.field_name) ?? [];
        arr.push(f.rule_id);
        byField.set(f.field_name, arr);
      }
      const proposed_values = [...byField.entries()].map(
        ([field_name, ruleIds]) => ({
          field_name,
          proposed_value: `Corrected value for ${field_name}`,
          addresses_rule_ids: ruleIds,
        }),
      );

      return {
        outcome: 'SUCCESS',
        recommended_action:
          'Review and correct the flagged fields, then resolve the case.',
        rationale:
          `This entry did not satisfy ${req.findings.length} required-information ` +
          'rule(s). The suggested values above would address each flagged field. ' +
          'Review them against the original documentation before deciding.',
        proposed_values,
      };
    },
  };
}
