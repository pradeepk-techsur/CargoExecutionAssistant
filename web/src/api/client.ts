// The typed API client (TechArch §1A.4, FR-1.8, FR-1.14).
//
// A thin, typed `fetch` wrapper — the SINGLE place the SPA talks to the server.
// Every state-changing call carries the CSRF token; every response is parsed
// into a `contract` DTO; a 401 UNAUTHENTICATED (except on the sign-in call
// itself) discards in-memory state and navigates to /sign-in?next=<path>.
//
// ⚠️ THE CSRF TOKEN IS RE-STORED INSIDE THE CLIENT, NOT BY CALLERS. Plan 02-04
// has GET /api/session ROTATE `sessions.csrf_token_hash` on every call (§3.3),
// and §3.3 also makes that GET the SPA's load-time call — so every page load
// rotates the hash. `getSession()` and `signIn()` therefore both call
// `setCsrfToken(body.csrf_token)` themselves before resolving. Putting the call
// inside the client (rather than in each caller) is what makes it impossible to
// forget — including for every POST that phases 3 and 6 add after a reload.
// `createEntry` (POST /api/entries) is the FIRST such phase-3 POST: it routes
// through `request()` like every other call, so the rotated token is attached
// automatically — the rule anticipated here is now actually applied.
// Without it: reload /queue → bootstrap GET rotates the hash → the module
// variable is empty → DELETE /api/session sends no X-CSRF-Token → 403.
//
// The token lives in a MODULE VARIABLE, never in web storage (which is readable
// by any script and survives the tab — §4.3, FR-1.14). The session cookie is
// HttpOnly and unreadable by script.

import type {
  ApiErrorBody,
  ApiErrorDetail,
  AuditTrailResponse,
  CaseDetailResponse,
  DecisionCreateRequest,
  DecisionRecordResponse,
  EntryCreateRequest,
  EntryDetailResponse,
  ErrorCode,
  QueueResponse,
  ReceiptResponse,
  RecommendationDetailDto,
  SessionDto,
  SessionRequest,
} from '@cargoexec/contract';

/** The CSRF token, held only in memory. `null` until the first GET/POST stores it. */
let csrfToken: string | null = null;

/**
 * A structured client-side error carrying the server's stable `code` so the UI
 * can branch on it (never on message text — FR-Y2.3). `'NETWORK'` is the
 * synthetic code for a transport failure or an unparseable body.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK';
  readonly details?: readonly ApiErrorDetail[];
  readonly requestId?: string;

  constructor(init: {
    status: number;
    code: ErrorCode | 'NETWORK';
    message: string;
    details?: readonly ApiErrorDetail[];
    requestId?: string;
  }) {
    super(init.message);
    this.name = 'ApiClientError';
    this.status = init.status;
    this.code = init.code;
    if (init.details !== undefined) this.details = init.details;
    if (init.requestId !== undefined) this.requestId = init.requestId;
  }
}

type Method = 'GET' | 'POST' | 'DELETE';

/**
 * The message announced when a mid-session 401 forces a return to sign-in
 * (FR-1.8). Carried through the query so the sign-in screen can render it.
 */
const EXPIRED_MESSAGE = 'Your session expired. Sign in again to continue.';

/**
 * Navigate to /sign-in?next=<current path>&reason=expired on a mid-session 401.
 * A full-document navigation (not a router push) so all in-memory state is
 * discarded — the safest possible reset (FR-1.8, §1A.4).
 */
function redirectToSignIn(): void {
  csrfToken = null;
  const path = window.location.pathname + window.location.search;
  const next = encodeURIComponent(path);
  window.location.assign(`/sign-in?next=${next}&reason=expired`);
}

/**
 * The one request primitive. `expectBody` distinguishes a 204 (signOut) from a
 * JSON body. `isSignIn` exempts the sign-in call from the global 401 handler —
 * a 401 there is AUTH_FAILED and belongs to the screen, not a session expiry.
 */
async function request<T>(
  method: Method,
  path: string,
  opts: {
    body?: unknown;
    expectBody: boolean;
    isSignIn?: boolean;
    // A caller-supplied extra-headers bag. Its only use is the F11/F12
    // Idempotency-Key, which is neither content-type nor CSRF and has no other
    // home. It is spread in FIRST, so the content-type/x-csrf-token logic below
    // always wins and can never be overridden by a caller.
    headers?: Record<string, string>;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  // Attach the CSRF token to every state-changing request (§4.4). GET carries
  // none — it is not state-changing and the server does not require it there.
  if ((method === 'POST' || method === 'DELETE') && csrfToken !== null) {
    headers['x-csrf-token'] = csrfToken;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin', // send the cookie, only ever to this origin
      headers,
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
  } catch {
    // No retry on ANY request path here — a mutating request that failed with an
    // unknown outcome must NOT be silently re-sent (§1A.4, UX Pattern 9).
    throw new ApiClientError({
      status: 0,
      code: 'NETWORK',
      message: 'We could not reach the server.',
    });
  }

  if (res.ok) {
    if (!opts.expectBody) {
      return undefined as T;
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiClientError({
        status: res.status,
        code: 'NETWORK',
        message: 'The server response could not be read.',
      });
    }
  }

  // Non-2xx: parse the §3.10 error envelope. An unparseable body is a NETWORK
  // error, not a masked server code.
  let parsed: ApiErrorBody | null = null;
  try {
    parsed = (await res.json()) as ApiErrorBody;
  } catch {
    parsed = null;
  }

  const code = parsed?.error?.code;
  const requestId = parsed?.error?.request_id;
  const details = parsed?.error?.details;

  // A mid-session 401 (NOT on the sign-in call) discards state and returns to
  // sign-in (FR-1.8). The sign-in call's 401 is AUTH_FAILED for the screen.
  if (res.status === 401 && opts.isSignIn !== true) {
    redirectToSignIn();
    throw new ApiClientError({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: EXPIRED_MESSAGE,
      ...(requestId !== undefined ? { requestId } : {}),
    });
  }

  if (code === undefined) {
    throw new ApiClientError({
      status: res.status,
      code: 'NETWORK',
      message: 'The server returned an unexpected response.',
    });
  }

  throw new ApiClientError({
    status: res.status,
    code,
    message: parsed?.error?.message ?? 'The request failed.',
    ...(details !== undefined ? { details } : {}),
    ...(requestId !== undefined ? { requestId } : {}),
  });
}

/** The exported client. */
export const api = {
  /**
   * Load the current session. Calls `setCsrfToken(body.csrf_token)` INTERNALLY
   * before resolving: the server rotates `sessions.csrf_token_hash` on every GET
   * (02-04 T2), and this is the SPA's load-time call, so a reload that did not
   * re-store the token would break the next POST/DELETE. A 401 here means "no
   * session" — the bootstrap treats that as signed-out, so this call is exempt
   * from the redirect (it IS the load-time probe).
   */
  async getSession(): Promise<SessionDto> {
    const dto = await request<SessionDto>('GET', '/api/session', {
      expectBody: true,
      isSignIn: true, // exempt: a 401 here is "not signed in", handled by caller
    });
    setCsrfToken(dto.csrf_token);
    return dto;
  },

  /** Sign in. Also calls `setCsrfToken(body.csrf_token)` internally. */
  async signIn(body: SessionRequest): Promise<SessionDto> {
    const dto = await request<SessionDto>('POST', '/api/session', {
      body,
      expectBody: true,
      isSignIn: true, // a 401 here is AUTH_FAILED for the screen, not expiry
    });
    setCsrfToken(dto.csrf_token);
    return dto;
  },

  /** Sign out (204, no body). Sends the X-CSRF-Token stored above. */
  async signOut(): Promise<void> {
    await request<void>('DELETE', '/api/session', { expectBody: false });
    setCsrfToken(null);
  },

  /**
   * Receive one manually authored entry (F3). Goes through request() so the
   * in-memory CSRF token stored by getSession()/signIn() is attached — the
   * mandatory client half of 02-04's rotate-on-GET CSRF. A POST that bypassed
   * this client would send no X-CSRF-Token after a page reload and 403.
   *
   * A required-information failure is NOT an error here: it is a 201 with
   * receipt_outcome 'EXCEPTION_OPENED' and findings, so it resolves normally
   * and the screen reads the outcome off the response (F3 FR-3.10).
   *
   * The body is sent UNTOUCHED — no coercion, no idempotency key, no retry. See
   * the file header and the constraints recorded in plan 03-08.
   */
  async createEntry(body: EntryCreateRequest): Promise<ReceiptResponse> {
    return request<ReceiptResponse>('POST', '/api/entries', {
      body,
      expectBody: true,
    });
  },

  /** Retrieve one entry with its derived state (F3 FR-3.11). */
  async getEntry(entryId: string): Promise<EntryDetailResponse> {
    return request<EntryDetailResponse>(
      'GET',
      `/api/entries/${encodeURIComponent(entryId)}`,
      { expectBody: true },
    );
  },

  /**
   * Load the receipt-ordered review queue (F7 GET /api/exceptions). GET carries
   * no CSRF header — it is not state-changing — following getEntry's pattern.
   */
  async getQueue(): Promise<QueueResponse> {
    return request<QueueResponse>('GET', '/api/exceptions', {
      expectBody: true,
    });
  },

  /**
   * Load one case's full detail by id or case reference (F7 GET
   * /api/exceptions/:idOrReference). Consumed by Phase 5/6's case-detail
   * screens; provided here so the queue's row link target is a real endpoint.
   */
  async getCase(idOrReference: string): Promise<CaseDetailResponse> {
    return request<CaseDetailResponse>(
      'GET',
      `/api/exceptions/${encodeURIComponent(idOrReference)}`,
      { expectBody: true },
    );
  },

  /**
   * Poll the current status/content of a case's recommendation (F9's own API
   * surface, F10 FR-10.7). GET, no CSRF header — matches getCase/getQueue. The
   * case-detail screen calls this on a 3-second cadence while the recommendation
   * is PENDING, stopping on a terminal status or after 60s.
   */
  async getRecommendation(exceptionId: string): Promise<RecommendationDetailDto> {
    return request<RecommendationDetailDto>(
      'GET',
      `/api/exceptions/${encodeURIComponent(exceptionId)}/recommendation`,
      { expectBody: true },
    );
  },

  /**
   * Record a decision (F11 POST /api/exceptions/{id}/decision). The
   * Idempotency-Key is generated by the CALLER (DecisionPanel, at the moment
   * the pre-submission summary is rendered — FR-12.14) and passed in here
   * unchanged; this method does not generate or cache it. Goes through
   * request() so the rotated CSRF token stored by getSession()/signIn() is
   * attached automatically — the mandatory client half of 02-04's
   * rotate-on-GET CSRF.
   */
  async postDecision(
    exceptionId: string,
    body: DecisionCreateRequest,
    idempotencyKey: string,
  ): Promise<DecisionRecordResponse> {
    return request<DecisionRecordResponse>(
      'POST',
      `/api/exceptions/${encodeURIComponent(exceptionId)}/decision`,
      { body, expectBody: true, headers: { 'idempotency-key': idempotencyKey } },
    );
  },

  /**
   * Read a case's complete audit trail (F13 GET
   * /api/exceptions/{exceptionId}/audit). GET, no CSRF header — it is
   * read-only and not state-changing, matching getCase/getQueue/getRecommendation.
   * The F14 AuditTrailRegion fetches this on mount and after a decision is
   * recorded on the same screen; it never polls (FR-14.12). A tampered hash
   * chain is REPORTED in the 200 body (chain_verified:false), never an error —
   * the region renders the integrity-failure alert from the response.
   */
  async getAuditTrail(exceptionId: string): Promise<AuditTrailResponse> {
    return request<AuditTrailResponse>(
      'GET',
      `/api/exceptions/${encodeURIComponent(exceptionId)}/audit`,
      { expectBody: true },
    );
  },

  setCsrfToken(token: string | null): void {
    setCsrfToken(token);
  },
};

/** Store (or clear) the in-memory CSRF token. Never touches web storage. */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}
