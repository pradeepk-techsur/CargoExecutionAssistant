/**
 * The public surface of the validation directory.
 *
 * Callers OUTSIDE services/validation/ import from THIS module only — never from
 * rules.ts or domain.ts directly. That is the boundary that makes a rule-set
 * revision (F4 [ASSUMPTION], open to CBP refinement) a change to rules.ts /
 * domain.ts plus a RULE_SET_VERSION bump, with nothing rippling outward: the
 * receipt transaction (F3), exception derivation (F5), the UI (F6) and the AI /
 * case-detail consumers (F9/F10) all read `evaluate`, the version and the types
 * from here, and nothing else.
 *
 * The whole directory is pure (R-L10): no clock, no pool, no repository value,
 * no network, no randomness. server/test/architecture/validation.spec.ts turns
 * that into a build constraint.
 */

export { evaluate, ValidationEngineError } from './engine.js';
export { RULE_SET_VERSION } from './types.js';
// assertRuleRegistryValid is added to this surface by the boot self-check
// (selfCheck.ts) in this same plan — see below.
export { assertRuleRegistryValid } from './selfCheck.js';

export type {
  Finding,
  RuleDefinition,
  RuleId,
  ValidationEvaluation,
} from './types.js';
