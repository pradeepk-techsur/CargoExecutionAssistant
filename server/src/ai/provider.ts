// The RecommendationProvider abstraction (TechArch §5, FR-9.15).
//
// This module is the ONLY type surface anything outside server/src/ai/ ever
// sees for AI generation. Swapping the deterministic FakeProvider for the real
// HTTP adapter (plan 05-04) requires NO change to any consumer — that is the
// whole point of defining the interface once, here, before anything calls it.
// FR-9.15: "swapping providers requires no change to F5/F7/F10/F11/F12/F13/F14."
//
// A ProviderRequest deliberately carries NO session or specialist identity
// (FR-9.16): the model is given the submitted field values and the findings,
// and nothing about who submitted them.

import type { RecommendationFailureReason } from '@cargoexec/contract';

/** One finding handed to the provider (a subset of the internal finding). */
export interface ProviderFindingInput {
  readonly rule_id: string;
  readonly field_name: string;
  readonly failure_code: string;
  readonly message: string;
}

/**
 * The request handed to a provider. `entryValues` is the 14 submitted fields
 * AS SUBMITTED — no session/specialist identity travels with it (FR-9.16).
 */
export interface ProviderRequest {
  readonly entryValues: Record<string, string | null>;
  readonly findings: readonly ProviderFindingInput[];
  readonly ruleSetVersion: string;
  readonly promptVersion: string;
}

/** One AI-proposed value (FR-9.7). */
export interface ProviderProposedValue {
  readonly field_name: string;
  readonly proposed_value: string;
  readonly addresses_rule_ids: readonly string[];
}

/** A successful generation. */
export interface ProviderSuccess {
  readonly outcome: 'SUCCESS';
  readonly recommended_action: string;
  readonly rationale: string;
  readonly proposed_values: readonly ProviderProposedValue[];
}

/**
 * The seven provider failure reasons. This tuple is asserted (below) to be
 * exactly the contract's `RecommendationFailureReason` union — the two must
 * never drift, so the recommendation-status write path (plan 05-02) and the
 * provider agree on the closed set of failure reasons.
 */
export const PROVIDER_FAILURE_REASONS = [
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_AUTH_FAILED',
  'SCHEMA_INVALID',
  'CONTENT_FILTERED',
  'INTERNAL_ERROR',
] as const;

export type ProviderFailureReason = (typeof PROVIDER_FAILURE_REASONS)[number];

// Type-level anti-drift assertion: ProviderFailureReason and the contract's
// RecommendationFailureReason must be mutually assignable. If either set gains
// or loses a member, one of these lines fails to compile.
type _AssertProviderIsContract =
  ProviderFailureReason extends RecommendationFailureReason ? true : never;
type _AssertContractIsProvider =
  RecommendationFailureReason extends ProviderFailureReason ? true : never;
const _providerMatchesContract: _AssertProviderIsContract = true;
const _contractMatchesProvider: _AssertContractIsProvider = true;
// Reference the checks so tsc keeps them and no-unused-vars stays quiet.
void _providerMatchesContract;
void _contractMatchesProvider;

/** A failed generation. Carries only the reason — no partial content. */
export interface ProviderFailure {
  readonly outcome: 'FAILURE';
  readonly failure_reason: ProviderFailureReason;
}

export type ProviderResult = ProviderSuccess | ProviderFailure;

/** The sole provider contract. One method, one shape in, one shape out. */
export interface RecommendationProvider {
  generate(req: ProviderRequest): Promise<ProviderResult>;
}
