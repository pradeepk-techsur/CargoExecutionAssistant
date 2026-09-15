import { ENTRY_FIELDS } from '@cargoexec/contract';
import type { RuleDefinition, RuleId } from './types.js';
import { RULES } from './rules.js';

/**
 * Boot-time registry integrity self-check (F4 §Error States row 2):
 *
 *   "Rule registry fails its integrity self-check at startup → Application
 *    refuses to start, RULE_SET_INVALID, deployment fails fast rather than
 *    validating inconsistently."
 *
 * Called once from server/src/index.ts, BEFORE createApp and app.listen. A rule
 * set that cannot be evaluated consistently must fail the deployment loudly, not
 * serve requests that would each hit the same inconsistency (T-03-20).
 *
 * Style follows config.ts's four fail-loud boot self-checks: the thrown Error's
 * message names the KEY at fault (the rule id and the violated property) and
 * NEVER dumps the whole registry. It is deliberately a plain Error whose message
 * begins `RULE_SET_INVALID:` — a boot failure, surfaced by main().catch which
 * already exits non-zero.
 *
 * R-L10 purity holds: this module imports only rules.ts, types.ts and the
 * contract — no clock, pool, repository, node:crypto, express, pg or network.
 */

const ENTRY_FIELD_SET: ReadonlySet<string> = new Set<string>(ENTRY_FIELDS);
const RULE_ID_RE = /^RIV-[0-9]{3}$/;
const MAX_MESSAGE_LEN = 500; // vf_message_len_chk is BETWEEN 1 AND 500

function fail(detail: string): never {
  throw new Error(`RULE_SET_INVALID: ${detail}`);
}

export function assertRuleRegistryValid(): void {
  const rules: readonly RuleDefinition[] = RULES;

  // 1. Well-formed, unique, ascending rule ids.
  const seenIds = new Set<string>();
  let previousId = '';
  for (const rule of rules) {
    if (!RULE_ID_RE.test(rule.rule_id)) {
      fail(`rule_id "${rule.rule_id}" does not match ^RIV-[0-9]{3}$`);
    }
    if (seenIds.has(rule.rule_id)) {
      fail(`rule_id "${rule.rule_id}" is duplicated`);
    }
    if (previousId !== '' && rule.rule_id <= previousId) {
      fail(`rule_id "${rule.rule_id}" is not in ascending order (after "${previousId}")`);
    }
    seenIds.add(rule.rule_id);
    previousId = rule.rule_id;
  }

  // 2. Unique failure codes.
  const seenCodes = new Set<string>();
  for (const rule of rules) {
    if (seenCodes.has(rule.failure_code)) {
      fail(`failure_code "${rule.failure_code}" (rule ${rule.rule_id}) is duplicated`);
    }
    seenCodes.add(rule.failure_code);
  }

  // 3. Every fields member is an entry field; every STATIC primary_field is an
  //    entry field (functional ones are checked per-call by the engine).
  for (const rule of rules) {
    for (const field of rule.fields) {
      if (!ENTRY_FIELD_SET.has(field)) {
        fail(`rule ${rule.rule_id} names field "${field}" outside ENTRY_FIELDS`);
      }
    }
    if (typeof rule.primary_field !== 'function' && !ENTRY_FIELD_SET.has(rule.primary_field)) {
      fail(`rule ${rule.rule_id} primary_field "${rule.primary_field}" is outside ENTRY_FIELDS`);
    }
  }

  // 4. Every requires_passed id exists; no rule gates on itself; the gating
  //    graph is acyclic.
  for (const rule of rules) {
    for (const dep of rule.requires_passed) {
      if (!seenIds.has(dep)) {
        fail(`rule ${rule.rule_id} requires_passed "${dep}", which is not a known rule`);
      }
      if (dep === rule.rule_id) {
        fail(`rule ${rule.rule_id} gates on itself`);
      }
    }
  }
  assertAcyclic(rules);

  // 5. Every static message is non-empty and ≤ 500 characters.
  for (const rule of rules) {
    if (typeof rule.message !== 'function') {
      const len = rule.message.length;
      if (len < 1) fail(`rule ${rule.rule_id} has an empty message`);
      if (len > MAX_MESSAGE_LEN) {
        fail(`rule ${rule.rule_id} message is ${len} chars, exceeding ${MAX_MESSAGE_LEN}`);
      }
    }
  }
}

/**
 * Topologically sort the declared gating graph; fail if a cycle prevents
 * completion (Kahn's algorithm — a remaining node with no resolvable
 * dependencies is a cycle).
 */
function assertAcyclic(rules: readonly RuleDefinition[]): void {
  const remaining = new Map<RuleId, Set<RuleId>>();
  for (const rule of rules) {
    remaining.set(rule.rule_id, new Set(rule.requires_passed));
  }

  let progressed = true;
  while (remaining.size > 0 && progressed) {
    progressed = false;
    for (const [id, deps] of remaining) {
      // Drop deps already resolved (removed from `remaining`).
      for (const dep of [...deps]) {
        if (!remaining.has(dep)) deps.delete(dep);
      }
      if (deps.size === 0) {
        remaining.delete(id);
        progressed = true;
      }
    }
  }

  if (remaining.size > 0) {
    const cyclic = [...remaining.keys()].join(', ');
    fail(`gating graph has a cycle among: ${cyclic}`);
  }
}
