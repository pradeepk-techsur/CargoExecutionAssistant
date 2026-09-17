import process from 'node:process';
import type { EntryFieldName } from '@cargoexec/contract';
import { loadConfig, FAKE_PROVIDER_URL } from '../config.js';
import { createFakeProvider } from '../ai/fakeProvider.js';
import { createHttpProvider } from '../ai/adapter.http.js';
import { getAppPool, closeAppPool } from '../db/pool.app.js';
import { findSpecialistByEmail } from '../db/repositories/specialists.js';
import {
  findCaseReferenceByEntryNumber,
  type CanonicalEntryRecord,
} from '../db/repositories/entries.js';
import { resolveCaseIdentifier } from '../db/repositories/exceptions.js';
import {
  loadRecommendationByException,
  loadRecommendationValues,
} from '../db/repositories/recommendations.js';
import { loadDecisionByException } from '../db/repositories/decisions.js';
import { receiveEntry } from '../services/receipt.service.js';
import { recordDecision } from '../services/decision.service.js';
import { runGenerationJob } from '../ai/job.js';
import { createSpecialist } from './create-specialist.js';

/**
 * seed-demo-case — the F15 idempotent, stage-resumable demonstration seed.
 *
 * WHY THIS IS NOT SEED DATA (in the sense PRD §10 #7 forbade). The original v1
 * scope explicitly EXCLUDED a seeded demonstration dataset. Phase 7 REVERSES
 * that one decision (and only that one) via F15: a single, hand-authored
 * demonstration case, pre-carried through the entire governed loop, so every
 * later-loop scenario (recommendation review, decision, audit trail) is
 * demonstrable on demand without a specialist first hand-typing an incomplete
 * entry and watching validation fail live. It is NOT a general fixture factory
 * (FR-15.11: no `--count`/`--email`/batch flag exists — `main()` takes zero
 * arguments) and NOT a migration INSERT and NOT a direct `INSERT` into any
 * governed table. It calls the EXACT same service functions the running
 * application uses for a live request:
 *
 *   - `receiveEntry`      (F3/F4/F5 — the atomic receipt transaction)
 *   - `runGenerationJob`  (F9 — the per-exception AI recommendation job)
 *   - `recordDecision`    (F11 — the one governed decision transaction)
 *   - `createSpecialist`  (F1 FR-1.13 — the reused account-provisioning path)
 *
 * so the seeded case is byte-for-byte indistinguishable from an organically
 * produced one, and its audit chain verifies exactly like any other case's.
 *
 * WHY ONLY THE APP POOL. This file imports NEITHER `db/pool.ai.js` NOR
 * `getAiPool`. `aiCapability.spec.ts` test 3 asserts that the importer set of
 * `pool.ai.js` is EXACTLY `{ server/src/index.ts }`, and that test is NOT one of
 * the two named for a Phase 7 update — a future reader must NOT "fix" a missing
 * ai-pool import by adding one here. Instead, this CLI passes the SAME
 * `cargoexec_app` pool as BOTH `aiPool` and `appPool` when it calls
 * `runGenerationJob`. This is deliberate and safe, not a shortcut: the two-pool
 * split (`cargoexec_app` vs. `cargoexec_ai`) exists ONLY to keep the
 * asynchronous, network-facing recommendation worker from holding write
 * privilege it should never need (A-1). An operator-invoked CLI already runs at
 * a higher trust level than that async path, and `cargoexec_app`'s privileges
 * are a strict superset of `cargoexec_ai`'s for every read the job performs — so
 * no guarantee is weakened by reusing it, and `pool.ai.js`'s importer-set
 * invariant (aiCapability.spec.ts test 3) stays intact.
 *
 * IDEMPOTENT + STAGE-RESUMABLE (FR-15.3). Each stage is CHECKED before it
 * writes: a second run creates nothing and exits 0; a run after only some
 * stages exist performs only the remaining ones. There is no single
 * all-or-nothing precondition. A terminal UNAVAILABLE recommendation (F9
 * FR-9.14) is never automatically retried — the run exits non-zero naming the
 * recommendation stage, and a later run with a reachable provider resumes there.
 */

// ── Reserved fixed constants (FR-15.11: hard-coded, never parameterised) ──────

const DEMO_SPECIALIST_EMAIL = 'demo.specialist@cbp.example.gov';
const DEMO_SPECIALIST_DISPLAY_NAME = 'Demo Specialist (Seeded)';
// 30 chars, satisfies the 12–256 range. Fixed, non-secret, fixture-only — see
// docs/seed-demo-case.md. createSpecialist's Argon2id hashing + "never echoed"
// behaviour apply to this call exactly as to any other.
const DEMO_SPECIALIST_PASSWORD = 'cargoexec-demo-specialist-seed';
const DEMO_ENTRY_NUMBER = 'DEMO-0000001';
const DEMO_GOODS_DESCRIPTION =
  'Assorted retail merchandise for demonstration purposes';
const DEMO_DECISION_REASON =
  'Corrected the carrier code after confirming it against the demonstration manifest.';

/** The two fields the fixture entry supplies; the other 12 are null. */
const DEMO_PROVIDED: readonly EntryFieldName[] = ['entry_number', 'goods_description'];

/** Fatal: the fixture is authored wrong (a script bug, never a runtime state). */
class DemoFixtureInvalidError extends Error {
  constructor(stage: string, detail: string) {
    super(`DEMO_FIXTURE_INVALID at stage ${stage}: ${detail}`);
    this.name = 'DemoFixtureInvalidError';
  }
}

/** Read the owner connection string the same way create-specialist.ts does. */
function ownerUrlFromEnv(): string {
  const url = process.env['DATABASE_URL_OWNER'];
  if (url === undefined || url === '') {
    throw new Error(
      'DATABASE_URL_OWNER is not set; seeding the demonstration specialist connects as the owner role',
    );
  }
  return url;
}

/** Build the 14-key CanonicalEntryRecord, 12 keys null. */
function buildDemoEntry(): CanonicalEntryRecord {
  return {
    entry_number: DEMO_ENTRY_NUMBER,
    importer_of_record_id: null,
    port_of_entry_code: null,
    mode_of_transport: null,
    carrier_code: null,
    conveyance_name: null,
    bill_of_lading_number: null,
    air_waybill_number: null,
    country_of_origin_code: null,
    goods_description: DEMO_GOODS_DESCRIPTION,
    quantity: null,
    quantity_uom: null,
    declared_value_usd: null,
    arrival_date: null,
  };
}

// ── main ─────────────────────────────────────────────────────────────────────

export async function main(): Promise<number> {
  const config = loadConfig();
  // Construct the provider the same way index.ts does (duplicated, not shared —
  // a six-line ternary with two call sites is not worth a factory module).
  const provider =
    config.aiProviderUrl === FAKE_PROVIDER_URL
      ? createFakeProvider()
      : createHttpProvider({
          url: config.aiProviderUrl,
          apiKey: config.aiApiKey ?? '',
          modelId: config.aiModelId,
          timeoutMs: config.aiTimeoutMs,
        });

  const appPool = getAppPool();
  let stage = 'start';

  try {
    // ── Stage 1: Specialist ──────────────────────────────────────────────────
    stage = 'specialist';
    const existingSpecialist = await findSpecialistByEmail(appPool, DEMO_SPECIALIST_EMAIL);
    let specialistId: string;
    if (existingSpecialist === null) {
      const created = await createSpecialist(ownerUrlFromEnv(), {
        email: DEMO_SPECIALIST_EMAIL,
        display_name: DEMO_SPECIALIST_DISPLAY_NAME,
        password: DEMO_SPECIALIST_PASSWORD,
      });
      specialistId = created.id;
      process.stdout.write(
        `seed-demo-case: specialist created (${specialistId}).\n`,
      );
    } else {
      specialistId = existingSpecialist.id;
      process.stdout.write(
        `seed-demo-case: specialist already present (${specialistId}); reused.\n`,
      );
    }
    const principal = { id: specialistId, display_name: DEMO_SPECIALIST_DISPLAY_NAME };

    // ── Stage 2: Entry + exception ───────────────────────────────────────────
    stage = 'entry';
    let exceptionId: string;
    const caseReference = await findCaseReferenceByEntryNumber(appPool, DEMO_ENTRY_NUMBER);
    if (caseReference === null) {
      // Receive the incomplete fixture entry. requestId and
      // dispatchRecommendation are both OMITTED, so receipt does NOT fire the
      // async worker — this script drives the recommendation stage itself,
      // explicitly, next, so there is exactly one path to it.
      const submitted = buildDemoEntry();
      const response = await receiveEntry({ pool: appPool, principal }, submitted, DEMO_PROVIDED);
      if (response.exception === null) {
        // The fixture validated clean — a script-authoring bug, not a runtime
        // condition: the reserved entry MUST fail F4's presence rules.
        throw new DemoFixtureInvalidError(
          'entry',
          'the demonstration entry validated clean; it must fail required-information rules',
        );
      }
      exceptionId = response.exception.id;
      process.stdout.write(
        `seed-demo-case: entry ${DEMO_ENTRY_NUMBER} received, case ${response.case_reference}, exception opened.\n`,
      );
    } else {
      // The entry already exists — resolve its exception id.
      const resolution = await resolveCaseIdentifier(appPool, 'CASE_REF', caseReference);
      if (resolution.status !== 'FOUND') {
        // The reserved entry number must always resolve to the seeded exception.
        throw new DemoFixtureInvalidError(
          'entry',
          `reserved case ${caseReference} resolved to ${resolution.status}, expected FOUND`,
        );
      }
      exceptionId = resolution.exceptionId;
      process.stdout.write(
        `seed-demo-case: entry ${DEMO_ENTRY_NUMBER} already present (case ${caseReference}); reused.\n`,
      );
    }

    // ── Stage 3: Recommendation ──────────────────────────────────────────────
    stage = 'recommendation';
    let recommendation = await loadRecommendationByException(appPool, exceptionId);
    if (recommendation === null) {
      throw new DemoFixtureInvalidError(
        'recommendation',
        `exception ${exceptionId} has no recommendation row (F5 FR-5.12 guarantees one)`,
      );
    }
    let recommendationJustRun = false;
    if (recommendation.status === 'PENDING') {
      // This in-process, awaited call IS the same function the real worker
      // invokes per job; the CLI simply calls it directly and synchronously
      // instead of through ai/worker.ts's queue, which is correct for a
      // single-exception command. Both pools are the app pool (see header).
      await runGenerationJob(
        {
          aiPool: appPool,
          appPool,
          provider,
          modelId: config.aiModelId,
          promptVersion: config.promptVersion,
        },
        exceptionId,
      );
      recommendationJustRun = true;
      const reloaded = await loadRecommendationByException(appPool, exceptionId);
      if (reloaded === null) {
        throw new DemoFixtureInvalidError(
          'recommendation',
          `recommendation row for exception ${exceptionId} vanished after generation`,
        );
      }
      recommendation = reloaded;
    }

    if (recommendation.status === 'AVAILABLE') {
      process.stdout.write(
        recommendationJustRun
          ? 'seed-demo-case: recommendation generated (AVAILABLE).\n'
          : 'seed-demo-case: recommendation already present (AVAILABLE); reused.\n',
      );
    } else if (recommendation.status === 'UNAVAILABLE') {
      // F9 FR-9.14 forbids automatic retry after a terminal outcome. Do NOT run
      // the job again. A re-run once the provider is reachable resumes here.
      process.stderr.write(
        `seed-demo-case: recommendation is UNAVAILABLE (${recommendation.failure_reason ?? 'unknown'}); ` +
          'no automatic retry (F9 FR-9.14). Re-run once the AI provider is reachable to resume from ' +
          'the recommendation stage.\n',
      );
      return 1;
    } else {
      // Still PENDING after the synchronous call — should not happen given F9's
      // terminal-write contract, but defend anyway.
      process.stderr.write(
        `seed-demo-case: recommendation is still PENDING after generation for exception ${exceptionId}; ` +
          'the recommendation stage did not reach a terminal state.\n',
      );
      return 1;
    }
    const recommendationId = recommendation.id;

    // ── Stage 4: Decision ────────────────────────────────────────────────────
    stage = 'decision';
    const existingDecision = await loadDecisionByException(appPool, exceptionId);
    if (existingDecision !== null) {
      process.stdout.write(
        `seed-demo-case: decision already present (${existingDecision.decision_type}); reused.\n`,
      );
    } else {
      const proposed = await loadRecommendationValues(appPool, recommendationId);
      if (proposed.length === 0) {
        throw new DemoFixtureInvalidError(
          'decision',
          `AVAILABLE recommendation ${recommendationId} carries no proposed values`,
        );
      }
      // Build resolution_values: EDIT the first proposed value (guaranteed to
      // differ after trim, so decision.service.ts re-stamps it HUMAN); keep
      // every other proposed value unchanged (retaining AI origin). This yields
      // a decision with at least one HUMAN and at least one AI resolution value.
      // NOTE: when the AI proposed exactly one value, appending the suffix to it
      // still produces a HUMAN value; there would then be no AI value. The fake
      // provider proposes one value PER distinct flagged field, and the fixture
      // fails multiple presence rules, so >=2 values are produced in practice —
      // but if only one exists, the mixed-origin invariant cannot hold, so fail
      // loudly rather than seed a case that does not demonstrate mixed origin.
      const resolution_values = proposed.map((p, i) =>
        i === 0
          ? { field_name: p.field_name, value: `${p.proposed_value} (specialist-verified)` }
          : { field_name: p.field_name, value: p.proposed_value },
      );
      if (proposed.length < 2) {
        throw new DemoFixtureInvalidError(
          'decision',
          `recommendation ${recommendationId} proposed only ${proposed.length} value(s); ` +
            'at least two are needed to demonstrate a mixed HUMAN/AI decision',
        );
      }
      await recordDecision({ pool: appPool, principal }, exceptionId, {
        decision_type: 'EDIT_APPROVE',
        reason: DEMO_DECISION_REASON,
        resolution_values,
      }, null);
      process.stdout.write('seed-demo-case: decision recorded (EDIT_APPROVE, mixed HUMAN/AI).\n');
    }

    // ── Stage 5: Summary ─────────────────────────────────────────────────────
    stage = 'summary';
    // Read-only count of this case's audit entries (not a second write path).
    const auditCount = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM audit_entries a
         JOIN cargo_entries c ON c.id = a.case_id
        WHERE c.entry_number = $1`,
      [DEMO_ENTRY_NUMBER],
    );
    const count = auditCount.rows[0]?.count ?? '0';
    process.stdout.write(
      `seed-demo-case: done. entry ${DEMO_ENTRY_NUMBER}, sign in as ${DEMO_SPECIALIST_EMAIL}, ` +
        `${count} audit entries on this case.\n`,
    );

    await closeAppPool();
    return 0;
  } catch (err) {
    // Never swallow an error into a false success (return 0). Close the pool so
    // the process can exit cleanly, then surface the failure loudly.
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`seed-demo-case: failed at stage ${stage}: ${message}\n`);
    try {
      await closeAppPool();
    } catch {
      // Ignore a secondary pool-close error; the primary failure is what matters.
    }
    return 1;
  }
}

// Run when invoked directly (server/dist/cli/seed-demo-case.js).
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`seed-demo-case: ${(err as Error).message}\n`);
      process.exit(1);
    });
}
