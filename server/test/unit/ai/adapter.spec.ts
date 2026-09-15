import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import { createHttpProvider } from '../../../src/ai/adapter.http.js';
import type { ProviderRequest } from '../../../src/ai/provider.js';

// ─────────────────────────────────────────────────────────────────────────────
// Plan 05-04 Task 1 — the real HTTP provider adapter, unit-tested with a mocked
// `global.fetch` and NO real network. Ten cases cover the full status matrix,
// the timeout/retry policy, the terminal-vs-retryable distinction, and the
// FR-9.13/9.16 redaction guarantee (the API key never escapes into a
// ProviderResult or a log line).
//
// A distinctive test key is used everywhere so case 10 can grep for it in the
// serialised result and captured console output.
// ─────────────────────────────────────────────────────────────────────────────

const TEST_API_KEY = 'sk-UNIQUE-TEST-KEY-do-not-leak-0123456789';
const PROVIDER_URL = 'https://provider.example.test/v1/chat/completions';

/** A base request with two findings across two distinct fields. */
function baseRequest(): ProviderRequest {
  return {
    entryValues: {
      entry_number: 'ABC1234567',
      goods_description: 'machine parts',
    },
    findings: [
      {
        rule_id: 'RIV-010',
        field_name: 'goods_description',
        failure_code: 'MISSING_REQUIRED',
        message: 'Goods description is required.',
      },
      {
        rule_id: 'RIV-011',
        field_name: 'entry_number',
        failure_code: 'FORMAT',
        message: 'Entry number format is invalid.',
      },
    ],
    ruleSetVersion: 'RIV-2026.09',
    promptVersion: '2026.09.1',
  };
}

/** A fully valid model payload addressing exactly the two findings above. */
function validPayload() {
  return {
    recommended_action: 'Correct the flagged fields and resolve the case.',
    rationale: 'The submitted entry omitted required information on two fields.',
    proposed_values: [
      {
        field_name: 'goods_description',
        proposed_value: 'Assorted machine parts',
        addresses_rule_ids: ['RIV-010'],
      },
      {
        field_name: 'entry_number',
        proposed_value: 'ABC1234567',
        addresses_rule_ids: ['RIV-011'],
      },
    ],
  };
}

/** An OpenAI-compatible chat-completion envelope wrapping a JSON string body. */
function chatEnvelope(payload: unknown): unknown {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

/** Build a Response-like object for the mock fetch. */
function mockResponse(opts: {
  status: number;
  json?: unknown;
  jsonThrows?: boolean;
}): Response {
  const ok = opts.status >= 200 && opts.status < 300;
  return {
    ok,
    status: opts.status,
    async json() {
      if (opts.jsonThrows) {
        throw new SyntaxError('Unexpected token');
      }
      return opts.json;
    },
  } as unknown as Response;
}

function makeProvider(timeoutMs = 20_000) {
  return createHttpProvider({
    url: PROVIDER_URL,
    apiKey: TEST_API_KEY,
    modelId: 'test-model-x',
    timeoutMs,
  });
}

describe('createHttpProvider — status matrix and retry policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // 1 ──────────────────────────────────────────────────────────────────────
  it('1. a 200 with a fully valid payload ⇒ SUCCESS with the exact fields', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ status: 200, json: chatEnvelope(validPayload()) }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeProvider().generate(baseRequest());
    expect(result.outcome).toBe('SUCCESS');
    if (result.outcome === 'SUCCESS') {
      expect(result.recommended_action).toBe(validPayload().recommended_action);
      expect(result.rationale).toBe(validPayload().rationale);
      expect(result.proposed_values).toHaveLength(2);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // 2 ──────────────────────────────────────────────────────────────────────
  it('2. a 401 ⇒ PROVIDER_AUTH_FAILED, NO retry (fetch called exactly once)', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeProvider().generate(baseRequest());
    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'PROVIDER_AUTH_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('2b. a 403 ⇒ PROVIDER_AUTH_FAILED, NO retry', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeProvider().generate(baseRequest());
    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'PROVIDER_AUTH_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // 3 ──────────────────────────────────────────────────────────────────────
  it('3. a 429 then a 200-valid on the retry ⇒ SUCCESS (fetch called twice, ~2s gap)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ status: 429 }))
      .mockResolvedValueOnce(
        mockResponse({ status: 200, json: chatEnvelope(validPayload()) }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const promise = makeProvider().generate(baseRequest());
    // Advance past the 2s retry delay so the second attempt fires.
    await vi.advanceTimersByTimeAsync(2_100);
    const result = await promise;

    expect(result.outcome).toBe('SUCCESS');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // 4 ──────────────────────────────────────────────────────────────────────
  it('4. a 429 then a 429 ⇒ PROVIDER_RATE_LIMITED (fetch called twice, no third)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ status: 429 }))
      .mockResolvedValueOnce(mockResponse({ status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = makeProvider().generate(baseRequest());
    await vi.advanceTimersByTimeAsync(2_100);
    const result = await promise;

    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'PROVIDER_RATE_LIMITED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // 5 ──────────────────────────────────────────────────────────────────────
  it('5. a 500 ⇒ retried once, same policy as 429', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ status: 500 }))
      .mockResolvedValueOnce(
        mockResponse({ status: 200, json: chatEnvelope(validPayload()) }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const promise = makeProvider().generate(baseRequest());
    await vi.advanceTimersByTimeAsync(2_100);
    const result = await promise;

    expect(result.outcome).toBe('SUCCESS');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('5b. two 500s ⇒ PROVIDER_UNAVAILABLE (retried once, no third)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ status: 500 }))
      .mockResolvedValueOnce(mockResponse({ status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = makeProvider().generate(baseRequest());
    await vi.advanceTimersByTimeAsync(2_100);
    const result = await promise;

    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'PROVIDER_UNAVAILABLE' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // 6 ──────────────────────────────────────────────────────────────────────
  it('6. a request that never resolves before timeoutMs ⇒ PROVIDER_TIMEOUT', async () => {
    vi.useFakeTimers();
    // fetch honours the abort signal: reject with an AbortError when aborted,
    // and never resolve otherwise.
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = makeProvider(5_000).generate(baseRequest());
    // Fire the abort (timeout) for attempt 1, then the 2s retry delay, then the
    // abort for attempt 2.
    await vi.advanceTimersByTimeAsync(5_100);
    await vi.advanceTimersByTimeAsync(2_100);
    await vi.advanceTimersByTimeAsync(5_100);
    const result = await promise;

    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'PROVIDER_TIMEOUT' });
    // Timeout is retryable: two attempts.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // 7 ──────────────────────────────────────────────────────────────────────
  it('7. a connection-level rejection ⇒ PROVIDER_UNAVAILABLE, retried once', async () => {
    vi.useFakeTimers();
    const connErr = new Error('ECONNREFUSED 127.0.0.1:443');
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(connErr)
      .mockRejectedValueOnce(connErr);
    vi.stubGlobal('fetch', fetchMock);

    const promise = makeProvider().generate(baseRequest());
    await vi.advanceTimersByTimeAsync(2_100);
    const result = await promise;

    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'PROVIDER_UNAVAILABLE' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // 8 ──────────────────────────────────────────────────────────────────────
  it('8. a 200 with a body that fails the schema (contains hts_code) ⇒ SCHEMA_INVALID, NO retry', async () => {
    const bad = {
      recommended_action: 'do something',
      rationale: 'because',
      proposed_values: [],
      hts_code: '1234.56.78', // an excluded determination — .strict() rejects it
    };
    const fetchMock = vi.fn(async () =>
      mockResponse({ status: 200, json: chatEnvelope(bad) }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeProvider().generate(baseRequest());
    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'SCHEMA_INVALID' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // 9 ──────────────────────────────────────────────────────────────────────
  it('9. a 200 with unparseable JSON ⇒ SCHEMA_INVALID, NO retry', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ status: 200, jsonThrows: true }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeProvider().generate(baseRequest());
    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'SCHEMA_INVALID' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('9b. a 200 whose content is a non-JSON string ⇒ SCHEMA_INVALID, NO retry', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({
        status: 200,
        json: { choices: [{ message: { content: 'not json at all' } }] },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeProvider().generate(baseRequest());
    expect(result).toEqual({ outcome: 'FAILURE', failure_reason: 'SCHEMA_INVALID' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10 — Redaction. The API key must never appear in ANY returned ProviderResult
// (across every branch above) nor in any console output the module emits.
// ─────────────────────────────────────────────────────────────────────────────

describe('createHttpProvider — the API key never leaks (FR-9.13 / FR-9.16)', () => {
  let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
  const captured: string[] = [];

  beforeEach(() => {
    captured.length = 0;
    logSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
        captured.push(args.map((a) => String(a)).join(' '));
      }),
    );
  });

  afterEach(() => {
    for (const s of logSpies) s.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('10. the configured apiKey appears in no ProviderResult and no log line across all branches', async () => {
    // Drive the key through the success branch, the auth branch, the connection
    // branch, and the schema branch — every place a naive implementation might
    // echo it — and assert it never surfaces.
    const branches: Array<() => void> = [
      () =>
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => mockResponse({ status: 200, json: chatEnvelope(validPayload()) })),
        ),
      () => vi.stubGlobal('fetch', vi.fn(async () => mockResponse({ status: 401 }))),
      () => vi.stubGlobal('fetch', vi.fn(async () => mockResponse({ status: 200, jsonThrows: true }))),
      () =>
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => {
            throw new Error(`connect failed for ${PROVIDER_URL} with Bearer ${TEST_API_KEY}`);
          }),
        ),
    ];

    for (const setup of branches) {
      vi.unstubAllGlobals();
      setup();
      const result = await makeProvider().generate(baseRequest());
      const serialised = JSON.stringify(result);
      expect(
        serialised.includes(TEST_API_KEY),
        `the API key leaked into a ProviderResult: ${serialised}`,
      ).toBe(false);
    }

    // The module logs nothing at all in these paths; assert the captured buffer
    // carries no line containing the key (and, in fact, is empty).
    for (const line of captured) {
      expect(line.includes(TEST_API_KEY), `the API key leaked into a log line: ${line}`).toBe(false);
    }
    expect(captured).toEqual([]);
  });

  it('the outgoing Authorization header DOES carry the key (it is used, just never leaked)', async () => {
    let seenAuth: string | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      seenAuth = headers['authorization'];
      return mockResponse({ status: 200, json: chatEnvelope(validPayload()) });
    });
    vi.stubGlobal('fetch', fetchMock);

    await makeProvider().generate(baseRequest());
    expect(seenAuth).toBe(`Bearer ${TEST_API_KEY}`);
  });
});
