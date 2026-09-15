import type { EntryFieldName } from '@cargoexec/contract';
import { ENTRY_FIELDS } from '@cargoexec/contract';
import type { CanonicalEntryRecord } from '../../db/repositories/entries.js';
import type {
  Finding,
  RuleDefinition,
  RuleId,
  ValidationEvaluation,
} from './types.js';
import { RULE_SET_VERSION } from './types.js';
import { RULES } from './rules.js';

/**
 * The evaluation mechanism (F4 §Evaluation Semantics).
 *
 * Rule CONTENT is an inherited [ASSUMPTION] in rules.ts / domain.ts, open to CBP
 * refinement. This module is the part that is NOT an assumption, and it must keep
 * working unchanged across a rule-set revision:
 *   FR-4.3  every applicable rule is evaluated; evaluation NEVER short-circuits
 *   FR-4.5  a format rule is skipped when its presence rule failed
 *   FR-4.6  a domain rule is skipped when its format rule failed
 *   FR-4.7  conditional applicability is asked of the rule, not inferred here
 *   FR-4.8  findings are emitted in ascending rule_id
 *   FR-4.9  no severity, weight, score, priority or ranking — of a finding or of
 *           the outcome
 *   FR-4.10 outcome is PASS with zero findings or FAIL with one or more
 *   FR-4.4  determinism: the only inputs are the record and its own received_at
 *
 * R-L10 purity is preserved: the only imports are the sibling content modules,
 * the type-only CanonicalEntryRecord, and the frozen ENTRY_FIELDS value from the
 * contract. No clock, no pool, no repository value, no network, no randomness.
 * `evaluated_at` is DELIBERATELY not produced here — it is the database's now()
 * on the validation_results row, inside the receipt transaction; a clock read
 * here would violate FR-4.4.
 *
 * Callers OUTSIDE this directory must import from services/validation/index.js —
 * never reach into rules.ts / domain.ts — so a rule-set revision cannot ripple
 * outward. See index.ts.
 */

const ENTRY_FIELD_SET: ReadonlySet<string> = new Set<string>(ENTRY_FIELDS);

/**
 * Raised when a rule predicate throws, or when a rule resolves a field_name that
 * is not a member of ENTRY_FIELDS (F4 §Error States row 3). It carries the
 * internal invariant code 'VALIDATION_ENGINE_FAILURE' and the offending rule_id.
 *
 * A malfunctioning evaluator MUST abort the receipt transaction rather than
 * return a silently incomplete finding list (T-03-18): the receipt service and
 * errorMapper recognise this class, and errorMapper's existing fallback maps an
 * unknown internal failure to the generic 500 RECEIPT_FAILED — the required
 * behaviour. The message begins with the code so leadingInvariantCode() logs it.
 */
export class ValidationEngineError extends Error {
  readonly code = 'VALIDATION_ENGINE_FAILURE';
  readonly rule_id: string;

  constructor(rule_id: string, detail: string) {
    super(`VALIDATION_ENGINE_FAILURE: rule ${rule_id}: ${detail}`);
    this.name = 'ValidationEngineError';
    this.rule_id = rule_id;
  }
}

/**
 * Evaluate a canonical entry record against the whole RIV-2026.09 rule set.
 *
 * The optional `rules` parameter exists ONLY so tests can inject a throwing or
 * out-of-set rule without mutating the real RULES array (cases 19–20). Production
 * callers always use the default — the real registry.
 */
export function evaluate(
  record: CanonicalEntryRecord,
  receivedAt: string,
  rules: readonly RuleDefinition[] = RULES,
): ValidationEvaluation {
  // Rules that produced a finding for THIS record. "Skipped" is not "failed":
  // a rule whose gate was itself skipped is skipped too, which follows
  // transitively from the declared chain (RIV-030 → RIV-031 → RIV-032), never
  // from implicit transitivity logic here.
  const failed = new Set<RuleId>();
  const findings: Finding[] = [];
  let rulesEvaluatedCount = 0;

  // Iterate in registry order (guaranteed ascending rule_id by plan 03-02 and
  // by assertRuleRegistryValid). We neither sort here nor rely on array order
  // for gating — gating is read from each rule's declared requires_passed.
  for (const rule of rules) {
    // Gating (FR-4.5 / FR-4.6): skip entirely if any required rule failed. No
    // finding, and it does NOT count toward rules_evaluated_count.
    if (isGated(rule, failed)) continue;

    // Applicability (FR-4.7): asked of the rule, never inferred here.
    if (!callGuarded(rule, () => rule.applicable(record))) continue;

    // The rule is applicable and un-gated: it is evaluated.
    rulesEvaluatedCount += 1;

    const satisfied = callGuarded(rule, () => rule.satisfied(record, receivedAt));
    if (satisfied) continue;

    // Unsatisfied: resolve field_name and message, then record the finding.
    const fieldName = resolveField(rule, record);
    const message = resolveMessage(rule, record);
    findings.push({
      rule_id: rule.rule_id,
      field_name: fieldName,
      failure_code: rule.failure_code,
      message,
    });
    failed.add(rule.rule_id);
    // The loop always continues (FR-4.3 / R-10): there is no early exit once a
    // finding appears and no ceiling on the count — the specialist must see
    // every unsatisfied rule in one pass, so a second submission is not needed
    // to discover a second problem.
  }

  const outcome: ValidationEvaluation['outcome'] =
    findings.length === 0 ? 'PASS' : 'FAIL';

  return Object.freeze({
    outcome,
    rule_set_version: RULE_SET_VERSION,
    rules_evaluated_count: rulesEvaluatedCount,
    findings: Object.freeze(findings) as readonly Finding[],
  });
}

/** A rule is gated when any id in its requires_passed produced a finding. */
function isGated(rule: RuleDefinition, failed: ReadonlySet<RuleId>): boolean {
  for (const dep of rule.requires_passed) {
    if (failed.has(dep)) return true;
  }
  return false;
}

/**
 * Run a rule predicate, converting any thrown error into a ValidationEngineError
 * naming the rule. The engine never catches-and-continues (T-03-18): a throwing
 * predicate aborts the whole evaluation.
 */
function callGuarded<T>(rule: RuleDefinition, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ValidationEngineError(rule.rule_id, `predicate threw: ${detail}`);
  }
}

/** Resolve primary_field (calling it when functional) and assert it is a field. */
function resolveField(
  rule: RuleDefinition,
  record: CanonicalEntryRecord,
): EntryFieldName {
  const resolved = callGuarded(rule, () =>
    typeof rule.primary_field === 'function'
      ? rule.primary_field(record)
      : rule.primary_field,
  );
  if (!ENTRY_FIELD_SET.has(resolved)) {
    throw new ValidationEngineError(
      rule.rule_id,
      `resolved field_name "${String(resolved)}" is not a member of ENTRY_FIELDS`,
    );
  }
  return resolved;
}

/** Resolve message (calling it when functional). */
function resolveMessage(
  rule: RuleDefinition,
  record: CanonicalEntryRecord,
): string {
  return callGuarded(rule, () =>
    typeof rule.message === 'function' ? rule.message(record) : rule.message,
  );
}
