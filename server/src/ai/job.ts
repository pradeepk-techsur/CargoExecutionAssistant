// The per-exception generation job (F9 §Process steps 3–9, plan 05-04).
//
// This is what runs when a case is opened: it reads the exception, its entry
// values and its findings over the AI pool (`cargoexec_ai`), calls the provider,
// and writes the TERMINAL recommendation outcome — AVAILABLE or UNAVAILABLE —
// plus its coupled audit entry over the app pool (`cargoexec_app`) inside ONE
// transaction.
//
// The two-pool split is not incidental. `append()`'s case-anchor
// `SELECT … FOR UPDATE` on `cargo_entries` needs UPDATE privilege on that table,
// which is granted to `cargoexec_app` and DENIED to `cargoexec_ai` (migration
// 0011). So the terminal write — status transition + coupled audit entry —
// MUST run over the app pool; the reads that compose the provider request run
// over the strictly-weaker ai pool (recommendationWrite.repo.spec.ts §4 proves
// the wall). The AI code never writes a decision, never touches an entry value,
// never changes an exception's state.
//
// Idempotence (FR-9.17): the cheap pre-check over the ai pool skips a provider
// call for an already-resolved recommendation, and the conditional UPDATE
// (`WHERE status='PENDING'`) inside markRecommendation* is the AUTHORITATIVE
// guard — a second/duplicate dispatch that races past the pre-check writes zero
// rows and no audit entry.

import type { Pool } from 'pg';
import { ENTRY_FIELDS, type EntryFieldName } from '@cargoexec/contract';
import { withTransaction } from '../db/tx.js';
import { append } from '../services/audit/writer.js';
import { loadExceptionForGeneration } from '../db/repositories/exceptions.js';
import { loadEntryValuesForRecommendation } from '../db/repositories/entries.js';
import { loadValidationByEntry } from '../db/repositories/validation.js';
import {
  loadRecommendationByException,
  markRecommendationAvailable,
  markRecommendationUnavailable,
  insertRecommendationValues,
} from '../db/repositories/recommendations.js';
import type { RecommendationProvider } from './provider.js';
import { logger } from '../http/logger.js';

export interface GenerationJobDeps {
  aiPool: Pool;
  appPool: Pool;
  provider: RecommendationProvider;
  modelId: string;
  promptVersion: string;
}

export async function runGenerationJob(
  deps: GenerationJobDeps,
  exceptionId: string,
): Promise<void> {
  const start = Date.now();
  try {
    // 1. Cheap pre-check over the AI pool (step 3, FR-9.17): skip the provider
    //    call entirely if this exception's recommendation is already resolved.
    //    This is an OPTIMISATION, not the authoritative guard — the conditional
    //    UPDATE below is the real idempotence mechanism.
    const current = await loadRecommendationByException(deps.aiPool, exceptionId);
    if (current === null) {
      // A recommendation row must exist for every exception (F5 FR-5.12). Its
      // absence is not something to fabricate around; log and exit.
      logger.warn(
        { exception_id: exceptionId },
        'generation job: no recommendation row, exiting',
      );
      return;
    }
    if (current.status !== 'PENDING') return;

    const ex = await loadExceptionForGeneration(deps.aiPool, exceptionId);
    if (ex === null) {
      logger.warn(
        { exception_id: exceptionId },
        'generation job: exception not found, exiting',
      );
      return;
    }

    const [entryValues, validation] = await Promise.all([
      loadEntryValuesForRecommendation(deps.aiPool, ex.entry_id),
      loadValidationByEntry(deps.aiPool, ex.entry_id),
    ]);
    if (entryValues === null || validation === null) {
      logger.warn(
        { exception_id: exceptionId },
        'generation job: entry/validation vanished, exiting',
      );
      return;
    }

    const result = await deps.provider.generate({
      entryValues,
      findings: validation.findings.map((f) => ({
        rule_id: f.rule_id,
        field_name: f.field_name,
        failure_code: f.failure_code,
        message: f.message,
      })),
      ruleSetVersion: validation.rule_set_version,
      promptVersion: deps.promptVersion,
    });
    const latencyMs = Date.now() - start;

    if (result.outcome === 'SUCCESS') {
      // Narrow each proposed value's field_name to a real EntryFieldName. The
      // provider contract types it as a plain string; the real adapter already
      // validated membership via the output schema, and FakeProvider derives
      // names from findings — a non-member here would be a provider/validator
      // bug, so drop it defensively rather than write a bad row.
      const proposedValues = result.proposed_values.filter(
        (v): v is typeof v & { field_name: EntryFieldName } =>
          (ENTRY_FIELDS as readonly string[]).includes(v.field_name),
      );
      await withTransaction(deps.appPool, async (tx) => {
        const { updated } = await markRecommendationAvailable(tx, {
          recommendation_id: current.id,
          recommended_action: result.recommended_action,
          rationale: result.rationale,
          model_id: deps.modelId,
          prompt_version: deps.promptVersion,
          latency_ms: latencyMs,
        });
        // Already resolved by a concurrent/duplicate dispatch (FR-9.17): the
        // conditional UPDATE matched zero rows, so write nothing further —
        // NOT even the audit entry, which would otherwise be an orphan.
        if (!updated) return;
        await insertRecommendationValues(
          tx,
          current.id,
          proposedValues.map((v) => ({
            field_name: v.field_name,
            proposed_value: v.proposed_value,
            addresses_rule_ids: v.addresses_rule_ids,
          })),
        );
        await append(tx, {
          case_id: ex.entry_id,
          exception_id: exceptionId,
          recommendation_id: current.id,
          action_type: 'RECOMMENDATION_GENERATED',
          actor: { type: 'AI' },
          before_state: 'PENDING',
          after_state: 'AVAILABLE',
          values: proposedValues.map((v) => {
            const before = entryValues[v.field_name] ?? null;
            return {
              field_name: v.field_name,
              before_value: before,
              before_origin: before !== null ? ('HUMAN' as const) : null,
              after_value: v.proposed_value,
              after_origin: 'AI' as const,
            };
          }),
        });
      });
    } else {
      await withTransaction(deps.appPool, async (tx) => {
        const { updated } = await markRecommendationUnavailable(tx, {
          recommendation_id: current.id,
          failure_reason: result.failure_reason,
          model_id: deps.modelId,
          prompt_version: deps.promptVersion,
        });
        if (!updated) return;
        await append(tx, {
          case_id: ex.entry_id,
          exception_id: exceptionId,
          recommendation_id: current.id,
          action_type: 'RECOMMENDATION_UNAVAILABLE',
          actor: { type: 'AI' },
          before_state: 'PENDING',
          after_state: 'UNAVAILABLE',
        });
      });
    }
  } catch (err) {
    // A truly unexpected failure (a provider.generate() that THROWS rather than
    // resolving a FAILURE outcome, a transient DB error) must not crash the
    // worker or leave the recommendation silently PENDING forever without a
    // trace. Log loudly; the recommendation simply stays PENDING (F9's §Error
    // States: no sweeper/retry in v1 — FR-9.19, presented pending-then-stale by
    // F10). Do NOT attempt a write here: we may not know which pool is safe to
    // use, and a half-understood failure must not become a fabricated
    // UNAVAILABLE outcome.
    logger.error(
      { exception_id: exceptionId, err },
      'generation job failed unexpectedly; recommendation remains PENDING',
    );
  }
}
