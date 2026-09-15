// The two F3 endpoints (TechArch §3.1, §1.5; FRD Y2 §3; F3 FR-3.1–3.16).
//
//   POST /api/entries            receive one manually authored entry.
//   GET  /api/entries/:entryId   retrieve one entry with its derived state.
//
// This module is where the line between STRUCTURAL validation (a client error —
// a 422/415/413) and REQUIRED-INFORMATION validation (a business outcome — a
// 201 with findings and possibly an exception) is drawn. The FRD is emphatic:
// NO error code in F3's table is produced by a required-information failure. A
// validation failure is a `201` with `receipt_outcome: 'EXCEPTION_OPENED'` — a
// successful receipt with a business outcome, never an HTTP error (FR-3.10). An
// entirely empty body succeeds with 201 (F3 acceptance 1).
//
// The structural schema is `.strict()`: every one of the fourteen fields is
// OPTIONAL at the transport layer, and any unknown property is refused
// `422 REQUEST_MALFORMED` naming it. That single mechanism is the whole of
// FR-3.7 (silent ignoring is prohibited) AND the guarantee that a client cannot
// supply `created_by`, `origin`, `receipt_outcome`, `case_reference`,
// `validation`, `findings`, `exception`, or any bypass flag — each is just an
// unknown property. The actor is `req.principal` alone (FR-1.6); it is never
// read from the body.
//
// There is deliberately NO PUT/PATCH/DELETE on an entry (FR-3.6), NO collection
// listing endpoint (FR-3.12), NO idempotency-key handling (receipt is not
// idempotent — FR-3.16; the Idempotency-Key header is ignored by design, with
// double-submit prevention living client-side in F6 FR-6.9), and NO query
// parameter of any kind on the GET.

import type { Pool } from 'pg';
import type { Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import {
  ENTRY_FIELDS,
  type EntryFieldName,
  type EntryDetailResponse,
} from '@cargoexec/contract';
import type { Clock } from '../../clock.js';
import { systemClock } from '../../clock.js';
import type { AppConfig } from '../../config.js';
import { ApiError } from '../errorMapper.js';
import {
  receiveEntry,
  EntryNumberDuplicateError,
} from '../../services/receipt.service.js';
import {
  loadEntryDetail,
  loadFieldOrigins,
  type CanonicalEntryRecord,
} from '../../db/repositories/entries.js';
import { loadValidationByEntry } from '../../db/repositories/validation.js';
import { loadExceptionRefByEntry } from '../../db/repositories/exceptions.js';

export interface EntryRouteDeps {
  pool: Pool;
  config: AppConfig;
  clock: Clock;
}

// ── Structural schema (§4.6): shape only, every field optional ───────────────
//
// `.strict()` is what rejects an unknown property with 422 REQUEST_MALFORMED
// naming it (via errorMapper's ZodError branch). The per-field `.max()` limits
// are copied from F3 §The Entry Field Set and match `cargo_entries_len_chk`
// exactly — 20 / 20 / 8 / 16 / 8 / 100 / 40 / 20 / 4 / 2000 / (numeric) / 8 /
// (numeric) / 10. A numeric field accepts a JSON number OR a numeric string
// here; the semantic parse (scale, notation) happens after the schema.
const numericish = z.union([z.string(), z.number()]);

const EntryBody = z
  .object({
    entry_number: z.string().max(20).nullish(),
    importer_of_record_id: z.string().max(20).nullish(),
    port_of_entry_code: z.string().max(8).nullish(),
    mode_of_transport: z.string().max(16).nullish(),
    carrier_code: z.string().max(8).nullish(),
    conveyance_name: z.string().max(100).nullish(),
    bill_of_lading_number: z.string().max(40).nullish(),
    air_waybill_number: z.string().max(20).nullish(),
    country_of_origin_code: z.string().max(4).nullish(),
    goods_description: z.string().max(2000).nullish(),
    quantity: numericish.nullish(),
    quantity_uom: z.string().max(8).nullish(),
    declared_value_usd: numericish.nullish(),
    arrival_date: z.string().max(10).nullish(),
  })
  .strict();

type ParsedBody = z.infer<typeof EntryBody>;

/** The set of fields that carry a numeric value (JSON number or numeric string). */
const NUMERIC_FIELDS = new Set<EntryFieldName>(['quantity', 'declared_value_usd']);

/** Structural scale limits per numeric field (F3 §The Entry Field Set). */
const MAX_TOTAL_DIGITS = 14;
const MAX_DECIMALS: Record<'quantity' | 'declared_value_usd', number> = {
  quantity: 3,
  declared_value_usd: 2,
};

// ── POST /api/entries — receive one entry ────────────────────────────────────

function postEntry(deps: EntryRouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // 1. Content-type belt (§4.6). app.ts's express.json({ type:
    //    'application/json' }) leaves a non-JSON body unparsed and bodyErrorGuard
    //    maps parser failures; add the explicit refusal so a body-bearing
    //    non-JSON request is 415 rather than reaching the schema as `{}`. There
    //    is no multipart parser installed anywhere and this endpoint accepts
    //    exactly one JSON object — never an array, a file, text/csv or a batch
    //    wrapper (FR-3.2).
    if (hasBody(req) && req.is('application/json') === false) {
      throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    // 2. The actor is req.principal alone (FR-1.6), guaranteed by requireApiAuth
    //    and CSRF-guarded by csrfMiddleware (which derives its set from
    //    API_ROUTE_TABLE's implemented state-changing pairs). Re-check here so the
    //    handler is correct in isolation and a middleware regression fails loudly.
    if (req.principal === undefined) {
      throw new ApiError(401, 'UNAUTHENTICATED');
    }

    // 3. A body MUST be a JSON object — not an array, not a scalar. Reject before
    //    the schema so an array does not produce a confusing zod path (FR-3.2).
    const body: unknown = req.body;
    if (Array.isArray(body) || typeof body !== 'object' || body === null) {
      throw new ApiError(422, 'REQUEST_MALFORMED', undefined, [
        {
          field: '(body)',
          code: 'wrong_type',
          message: 'The request body must be a single JSON object.',
        },
      ]);
    }

    // 4. Structural validation. A ZodError propagates to errorMapper, the single
    //    §3.7 translation point, which emits 422 REQUEST_MALFORMED with details.
    const parsed = EntryBody.parse(body);

    // 5. The structural rules the schema cannot express (numeric scale/notation),
    //    each a 422 with a per-field detail. A value that PARSES but is zero,
    //    negative or otherwise implausible is NOT a structural error — it is F4's
    //    business (RIV-101 / RIV-121, clarification C-3). Only unparseable or
    //    over-scale values are 422s. A mistyped arrival_date within 10 characters
    //    is NOT a 422 either — it is stored NULL and reported RIV-131 by F4.
    const numericStrings = coerceNumerics(parsed);

    // 6. Canonicalisation (FR-3.8, §1.5 step 5): trim only, and treat '' /
    //    whitespace-only / undefined / null identically as "not provided".
    const canonical = canonicalise(parsed, numericStrings);
    const provided = ENTRY_FIELDS.filter((f) => canonical[f] !== null);

    // 7. Receive. The actor is the session principal; created_by is never read
    //    from the body. There is no idempotency key — receipt is deliberately not
    //    idempotent (FR-3.16); the Idempotency-Key header is ignored by design.
    const requestId = requestIdOf(res);
    try {
      const response = await receiveEntry(
        {
          pool: deps.pool,
          principal: { id: req.principal.id, display_name: req.principal.display_name },
          ...(requestId !== undefined ? { requestId } : {}),
        },
        canonical,
        provided,
      );
      res.status(201).json(response);
    } catch (err) {
      // The 409 path: name the existing case reference so the SPA can link to it
      // (FR-3.9, F6 FR-6.15). Interpolate the SUBMITTED entry number. Every other
      // failure propagates unchanged so errorMapper answers 500 RECEIPT_FAILED
      // with "Nothing was saved." — no catch-and-rewrite here.
      if (err instanceof EntryNumberDuplicateError) {
        const n = err.entry_number;
        const ref = err.case_reference ?? 'an existing case';
        const message = `Entry number ${n} already exists on case ${ref}.`;
        throw new ApiError(409, 'ENTRY_NUMBER_DUPLICATE', message, [
          {
            field: 'entry_number',
            code: 'ENTRY_NUMBER_DUPLICATE',
            message,
          },
        ]);
      }
      throw err;
    }
  };
}

// ── GET /api/entries/:entryId — retrieve one entry with its derived state ─────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getEntry(deps: EntryRouteDeps): RequestHandler {
  return async (req: Request, res: Response) => {
    // 1. No query parameter of any kind on this route. The only list surface in
    //    the product is the receipt-ordered open-exception queue (F7); an entry
    //    read takes no filter, no include, nothing (§3.1). Refuse any query
    //    string with 400 UNSUPPORTED_QUERY_PARAMETER.
    if (Object.keys(req.query).length > 0) {
      throw new ApiError(400, 'UNSUPPORTED_QUERY_PARAMETER');
    }

    // 2. entryId MUST be a uuid — a non-uuid value is 400 INVALID_IDENTIFIER, a
    //    400 not a 404 (F3 error table). It is bound in the query, but a 400 is
    //    the specified answer.
    const entryId = req.params['entryId'] ?? '';
    if (!UUID_RE.test(entryId)) {
      throw new ApiError(400, 'INVALID_IDENTIFIER');
    }

    // 3. Load the entry of record. A missing row is 404 ENTRY_NOT_FOUND.
    const detail = await loadEntryDetail(deps.pool, entryId);
    if (detail === null) {
      throw new ApiError(404, 'ENTRY_NOT_FOUND');
    }

    // 4. Assemble the derived state. The entry's "current state" is DERIVED —
    //    receipt_outcome plus the exception's state — there is no separate mutable
    //    status column to drift out of sync (FR-3.11). Findings come back in
    //    ascending rule_id from the repository.
    const [fieldOrigins, validation, exception] = await Promise.all([
      loadFieldOrigins(deps.pool, entryId),
      loadValidationByEntry(deps.pool, entryId),
      loadExceptionRefByEntry(deps.pool, entryId),
    ]);

    if (validation === null) {
      // An entry always has exactly one validation result (F4 FR-4.11); its
      // absence is an internal invariant breach, never a client-visible state.
      throw new Error(
        `VALIDATION_ENGINE_FAILURE: entry ${entryId} has no validation result`,
      );
    }

    const responseBody: EntryDetailResponse = {
      entry: {
        id: detail.id,
        case_reference: detail.case_reference,
        received_at: detail.received_at.toISOString(),
        created_by: {
          id: detail.created_by_id,
          display_name: detail.created_by_display_name,
        },
        values: detail.values,
        field_origins: fieldOrigins,
      },
      receipt_outcome: detail.receipt_outcome,
      validation: {
        outcome: validation.outcome,
        rule_set_version: validation.rule_set_version,
        evaluated_at: validation.evaluated_at,
        findings: validation.findings,
      },
      exception,
    };
    res.status(200).json(responseBody);
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Whether the request carries a body worth a content-type check. */
function hasBody(req: Request): boolean {
  const len = req.headers['content-length'];
  if (typeof len === 'string' && len !== '' && len !== '0') {
    return true;
  }
  const te = req.headers['transfer-encoding'];
  return typeof te === 'string' && te.length > 0;
}

/** The correlation id assigned by requestId(); read from res.locals. */
function requestIdOf(res: Response): string | undefined {
  const id = res.locals['requestId'];
  return typeof id === 'string' ? id : undefined;
}

/**
 * Convert each numeric field to its submitted STRING form, refusing an
 * unparseable or over-scale value with a 422. A JSON number is rendered in
 * fixed notation (never exponential): a value whose `String(n)` contains `e`/`E`
 * is refused `not_numeric` rather than silently reformatted. A value that parses
 * cleanly but is zero or negative is NOT refused — that is F4's business.
 */
function coerceNumerics(parsed: ParsedBody): Partial<Record<EntryFieldName, string>> {
  const out: Partial<Record<EntryFieldName, string>> = {};
  const details: { field: string; code: string; message: string }[] = [];

  for (const field of NUMERIC_FIELDS) {
    const raw = (parsed as Record<string, unknown>)[field];
    if (raw === undefined || raw === null) {
      continue;
    }
    let str: string;
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) {
        details.push({ field, code: 'not_numeric', message: notNumericMessage(field) });
        continue;
      }
      str = String(raw);
      if (str.includes('e') || str.includes('E')) {
        details.push({ field, code: 'not_numeric', message: notNumericMessage(field) });
        continue;
      }
    } else {
      str = String(raw).trim();
    }

    // Empty / whitespace-only collapses to "not provided" during canonicalisation
    // — leave it for that stage rather than treating it as a numeric error.
    if (str === '') {
      continue;
    }

    // Structural decimal shape: an optional sign, digits, an optional fractional
    // part. Anything else is unparseable → not_numeric.
    const m = /^-?(\d+)(?:\.(\d+))?$/.exec(str);
    if (m === null) {
      details.push({ field, code: 'not_numeric', message: notNumericMessage(field) });
      continue;
    }
    const intDigits = (m[1] ?? '').replace(/^0+(?=\d)/, '');
    const fracDigits = m[2] ?? '';
    const totalDigits = intDigits.length + fracDigits.length;
    const maxDecimals = MAX_DECIMALS[field as 'quantity' | 'declared_value_usd'];
    // The DB column is numeric(14, maxDecimals): its integer part holds at most
    // precision − scale = MAX_TOTAL_DIGITS − maxDecimals digits. Bound the integer
    // part explicitly — bounding only the combined total lets a value like
    // quantity "123456789012" (12 int digits, precision 12 ≤ 14) through the total
    // gate and overflow numeric(14,3) as Postgres 22003 → an FRD-forbidden 500.
    const maxIntDigits = MAX_TOTAL_DIGITS - maxDecimals;
    if (intDigits.length > maxIntDigits || totalDigits > MAX_TOTAL_DIGITS) {
      details.push({
        field,
        code: 'too_many_decimals',
        message: `${labelOf(field)} has too many digits.`,
      });
      continue;
    }
    if (fracDigits.length > maxDecimals) {
      details.push({
        field,
        code: 'too_many_decimals',
        message: `${labelOf(field)} may have at most ${maxDecimals} decimal places.`,
      });
      continue;
    }
    out[field] = str;
  }

  if (details.length > 0) {
    throw new ApiError(422, 'REQUEST_MALFORMED', undefined, details);
  }
  return out;
}

function notNumericMessage(field: string): string {
  return `${labelOf(field)} must be a number.`;
}

function labelOf(field: string): string {
  return field === 'quantity' ? 'Quantity' : 'Declared value';
}

/**
 * Build the CanonicalEntryRecord (FR-3.8): for each of the fourteen fields, take
 * the submitted value (a numeric field's already-stringified form), TRIM only,
 * and map '' / whitespace-only / undefined / null to null. An empty string, a
 * whitespace-only string and an absent property are IDENTICAL — all "not
 * provided". Trim only: no uppercasing, hyphen-stripping, date reformatting or
 * rounding — normalisation for rule evaluation is F4's, and applies to the
 * comparison, never to the stored value (F3 §The Entry Field Set, F6
 * acceptance 6).
 */
function canonicalise(
  parsed: ParsedBody,
  numericStrings: Partial<Record<EntryFieldName, string>>,
): CanonicalEntryRecord {
  const record = {} as { -readonly [K in EntryFieldName]: string | null };
  for (const field of ENTRY_FIELDS) {
    let value: unknown;
    if (NUMERIC_FIELDS.has(field)) {
      value = numericStrings[field];
    } else {
      value = (parsed as Record<string, unknown>)[field];
    }
    record[field] = collapse(value);
  }
  return record;
}

/** Trim a string value; map '' / whitespace-only / nullish to null. */
function collapse(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The two F3 route handlers, built with their dependencies. Consumed by
 * `routes/index.ts` where they are registered from the single ROUTES array.
 * Exports exactly this factory — no PUT/PATCH/DELETE handler for an entry, and
 * no update path (FR-3.6).
 */
export function entryRoutes(deps: EntryRouteDeps): {
  post: RequestHandler;
  get: RequestHandler;
} {
  const withClock: EntryRouteDeps = {
    pool: deps.pool,
    config: deps.config,
    clock: deps.clock ?? systemClock,
  };
  return {
    post: postEntry(withClock),
    get: getEntry(withClock),
  };
}
