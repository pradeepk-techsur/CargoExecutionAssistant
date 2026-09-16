// The FR-9.7 / FR-9.8 / FR-9.9 output-schema validator (TechArch §5).
//
// This is the FIRST gate an (untrusted) provider response passes through before
// any of its content can reach a database write or a screen. The real HTTP
// adapter (plan 05-04) does the fetch and JSON.parse; THIS module validates the
// already-parsed value's shape, and only its shape.
//
// FR-9.8 (the excluded-determination list — no HTS code, duty amount, tariff
// rate, classification, admissibility ruling, penalty, or risk score) is
// satisfied STRUCTURALLY, by a `.strict()` closed schema that rejects ANY
// additional top-level property. We deliberately do NOT also hand-list the
// forbidden names: a denylist is a second, driftable mechanism, and the closed
// schema already excludes every name not in the allow-set.

import { z } from 'zod';
import { ENTRY_FIELDS } from '@cargoexec/contract';

// A rule id as a WHOLE token — used to validate an addresses_rule_ids entry,
// which must be exactly a rule id and nothing else (anchored).
const RULE_ID_RE = /^RIV-[0-9]{3}$/;

// A rule id appearing ANYWHERE within a longer string — used to scan the
// free-text rationale for a leaked rule id (FR-9.9). Not anchored, so it
// matches `RIV-010` embedded in a sentence.
const RULE_ID_ANYWHERE_RE = /RIV-[0-9]{3}/;

const ProposedValueSchema = z
  .object({
    // Membership in the 14-field set (FR-9.7): a proposed value naming a field
    // outside the entry field set is not a valid proposal.
    field_name: z.enum(ENTRY_FIELDS),
    proposed_value: z.string().trim().min(1).max(2000),
    addresses_rule_ids: z.array(z.string().regex(RULE_ID_RE)).min(1),
  })
  .strict();

const ProviderResponseSchema = z
  .object({
    recommended_action: z.string().trim().min(1).max(500),
    rationale: z.string().trim().min(1).max(2000),
    proposed_values: z.array(ProposedValueSchema).min(0).max(14),
  })
  .strict();

export type ValidatedProviderResponse = z.infer<typeof ProviderResponseSchema>;

/**
 * Validate a parsed provider response against FR-9.7 / FR-9.8 / FR-9.9.
 *
 * `knownRuleIds` is the set of rule ids actually present in THIS exception's
 * findings; every `addresses_rule_ids` entry must be a member (FR-9.7 —
 * "rule ids present in this exception's findings"). This is why the request's
 * findings must be threaded through as a second argument: the response cannot
 * be judged valid in isolation.
 *
 * A caller (plan 05-04's generation job) treats any `{ ok: false }` as a
 * terminal `SCHEMA_INVALID`, never retried.
 */
export function validateProviderResponse(
  raw: unknown,
  knownRuleIds: ReadonlySet<string>,
): { ok: true; value: ValidatedProviderResponse } | { ok: false } {
  const parsed = ProviderResponseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };

  // FR-9.9: the rationale is plain language with no rule ids / internal codes.
  if (RULE_ID_ANYWHERE_RE.test(parsed.data.rationale)) return { ok: false };

  const seen = new Set<string>();
  for (const v of parsed.data.proposed_values) {
    // FR-9.7: a duplicate field_name across proposed_values ⇒ invalid.
    if (seen.has(v.field_name)) return { ok: false };
    seen.add(v.field_name);
    // FR-9.7: every addressed rule id must be one of this exception's findings.
    for (const rid of v.addresses_rule_ids) {
      if (!knownRuleIds.has(rid)) return { ok: false };
    }
  }

  return { ok: true, value: parsed.data };
}
