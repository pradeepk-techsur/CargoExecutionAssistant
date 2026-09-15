import type { EntryFieldName } from '@cargoexec/contract';
import type { CanonicalEntryRecord } from '../../db/repositories/entries.js';

/**
 * The rule set version. Bumping this string IS the refinement mechanism: rule
 * content is an inherited [ASSUMPTION] (FRD F4) open to CBP refinement, and a
 * revision must be a change to rules.ts / domain.ts plus a bump here — never a
 * change to the engine, the receipt service, the API shape or the UI.
 * It is stamped onto every validation_results row, so a case's findings are
 * always readable against the rule set that produced them.
 */
export const RULE_SET_VERSION = 'RIV-2026.09';

export type RuleId = `RIV-${string}`;

export interface RuleDefinition {
  readonly rule_id: RuleId;
  /** Every field this rule concerns. Must be members of the fourteen-field set. */
  readonly fields: readonly EntryFieldName[];
  /**
   * The DECLARED primary field (clarification C-2). A finding carries exactly
   * ONE field_name so it binds to one named control in storage and in the API.
   * RIV-070 is a function because its primary field depends on the normalised
   * mode of transport.
   */
  readonly primary_field: EntryFieldName | ((r: CanonicalEntryRecord) => EntryFieldName);
  /** Unique across the registry. */
  readonly failure_code: string;
  /**
   * Plain language, imperative where a corrective action exists, free of rule
   * identifiers, regular expressions and internal jargon (FR-4.13). A function
   * where the message interpolates {value}; the function receives the record and
   * must use the SUBMITTED (non-normalised) value, truncated to 60 characters
   * with a trailing ellipsis if longer.
   */
  readonly message: string | ((r: CanonicalEntryRecord) => string);
  /**
   * DECLARED gating (FR-4.5, FR-4.6, and the §Validation bullet "presence-gating
   * and format-gating relationships are declared on the rule, not implied by
   * evaluation order"). A rule is evaluated only if EVERY rule id listed here
   * produced no finding for this record.
   */
  readonly requires_passed: readonly RuleId[];
  /**
   * Conditional applicability beyond gating (FR-4.7) — e.g. RIV-071 applies only
   * when air_waybill_number is present. Default true where nothing is conditional.
   */
  applicable(r: CanonicalEntryRecord): boolean;
  /** The predicate. Pure. `receivedAt` is used by RIV-132 alone. */
  satisfied(r: CanonicalEntryRecord, receivedAt: string): boolean;
}

/**
 * A single finding, the durable per-rule outcome the engine (plan 03-04) builds
 * from a rule that produced no satisfaction. Exactly ONE field_name binds it to
 * one named control in storage and in the API.
 */
export interface Finding {
  readonly rule_id: string;
  readonly field_name: EntryFieldName;
  readonly failure_code: string;
  readonly message: string;
}

/**
 * The whole-record validation outcome the engine (plan 03-04) returns. Carried
 * with the rule set version so a case's findings are always readable against the
 * rule set that produced them.
 */
export interface ValidationEvaluation {
  readonly outcome: 'PASS' | 'FAIL';
  readonly rule_set_version: string;
  readonly rules_evaluated_count: number;
  readonly findings: readonly Finding[];
}
