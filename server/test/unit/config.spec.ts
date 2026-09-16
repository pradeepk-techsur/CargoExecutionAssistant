import { describe, it, expect } from 'vitest';
import { loadConfig, ConfigError } from '../../src/config.js';

// loadConfig is passed a literal env object in every test; process.env is never
// mutated (§8.7 self-checks are pure over their input).

// minimalValid carries the three now-required AI keys in their fake posture
// (self-checks 5–7): AI_PROVIDER_URL=fake:deterministic needs no API key, and
// PROMPT_VERSION names the real shipped, digest-verified manifest entry. Every
// existing test in this file inherits these three from its baseline.
const minimalValid: NodeJS.ProcessEnv = {
  DATABASE_URL_APP: 'postgres://cargoexec_app:pw@db:5432/cargoexec',
  AI_PROVIDER_URL: 'fake:deterministic',
  AI_MODEL_ID: 'test-model',
  PROMPT_VERSION: '2026.09.1',
};

describe('config — minimal valid env', () => {
  it('applies the documented defaults', () => {
    const cfg = loadConfig(minimalValid);
    expect(cfg.host).toBe('0.0.0.0');
    expect(cfg.port).toBe(3000);
    expect(cfg.frameAncestors).toBeNull();
    expect(cfg.sessionCookieProfile).toBe('governed');
    expect(cfg.nodeEnv).toBe('production');
    expect(cfg.logLevel).toBe('info');
    expect(cfg.originIsHttps).toBe(false);
    expect(cfg.databaseUrlApp).toBe(minimalValid.DATABASE_URL_APP);
  });
});

describe('config — self-check 1: missing required key (§6.6, §4.7)', () => {
  it('throws ConfigError when DATABASE_URL_APP is absent', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });

  it('throws ConfigError when DATABASE_URL_APP is empty', () => {
    expect(() => loadConfig({ DATABASE_URL_APP: '' })).toThrow(ConfigError);
  });

  it('names the key but discloses no neighbouring env value (§4.7)', () => {
    // A password placed in a neighbouring key must never appear in the message.
    const secret = 'sup3rsecret-password-xyz';
    let message = '';
    try {
      loadConfig({ SOME_PASSWORD: secret });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('DATABASE_URL_APP');
    expect(message).not.toContain(secret);
  });
});

describe('config — self-check 2: loopback HOST rejected (§6.5)', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '0:0:0:0:0:0:0:1']) {
    it(`throws for HOST=${host}`, () => {
      expect(() => loadConfig({ ...minimalValid, HOST: host })).toThrow(
        ConfigError,
      );
    });
  }

  it('accepts a routable HOST', () => {
    const cfg = loadConfig({ ...minimalValid, HOST: '0.0.0.0' });
    expect(cfg.host).toBe('0.0.0.0');
  });
});

describe('config — self-check 3: FRAME_ANCESTORS none/self rejected (D-1, §4.5)', () => {
  for (const value of ["'none'", 'none', "'self'", 'self', "'SELF'", 'NONE']) {
    it(`throws for FRAME_ANCESTORS=${value}`, () => {
      expect(() =>
        loadConfig({ ...minimalValid, FRAME_ANCESTORS: value }),
      ).toThrow(ConfigError);
    });
  }

  it('rejects self/none appearing inside a token list', () => {
    expect(() =>
      loadConfig({
        ...minimalValid,
        FRAME_ANCESTORS: "https://preview.example.dev 'self'",
      }),
    ).toThrow(ConfigError);
  });

  it("accepts '*' and round-trips it unchanged", () => {
    const cfg = loadConfig({ ...minimalValid, FRAME_ANCESTORS: '*' });
    expect(cfg.frameAncestors).toBe('*');
  });

  it('accepts an explicit origin allowlist and round-trips it unchanged', () => {
    const allow = 'https://preview.example.dev https://*.sandbox.example';
    const cfg = loadConfig({ ...minimalValid, FRAME_ANCESTORS: allow });
    expect(cfg.frameAncestors).toBe(allow);
  });

  it('returns null when unset', () => {
    expect(loadConfig(minimalValid).frameAncestors).toBeNull();
  });
});

describe('config — self-check 4: demo-iframe over plain HTTP rejected (§4.3, F1 FR-1.3)', () => {
  it('throws for demo-iframe on a http PUBLIC_ORIGIN', () => {
    expect(() =>
      loadConfig({
        ...minimalValid,
        SESSION_COOKIE_PROFILE: 'demo-iframe',
        PUBLIC_ORIGIN: 'http://localhost:3000',
      }),
    ).toThrow(ConfigError);
  });

  it('throws for demo-iframe with no PUBLIC_ORIGIN (origin not HTTPS)', () => {
    expect(() =>
      loadConfig({ ...minimalValid, SESSION_COOKIE_PROFILE: 'demo-iframe' }),
    ).toThrow(ConfigError);
  });

  it('loads demo-iframe on an https PUBLIC_ORIGIN', () => {
    const cfg = loadConfig({
      ...minimalValid,
      SESSION_COOKIE_PROFILE: 'demo-iframe',
      PUBLIC_ORIGIN: 'https://preview.example.dev',
    });
    expect(cfg.sessionCookieProfile).toBe('demo-iframe');
    expect(cfg.originIsHttps).toBe(true);
  });
});

describe('config — self-check 5: AI_PROVIDER_URL (§5)', () => {
  it('throws when AI_PROVIDER_URL is absent', () => {
    const { AI_PROVIDER_URL: _omit, ...rest } = minimalValid;
    void _omit;
    expect(() => loadConfig(rest)).toThrow(ConfigError);
  });

  it('throws for a plain-http provider url', () => {
    expect(() =>
      loadConfig({ ...minimalValid, AI_PROVIDER_URL: 'http://insecure' }),
    ).toThrow(ConfigError);
  });

  it('throws for an unrecognised scheme', () => {
    expect(() =>
      loadConfig({ ...minimalValid, AI_PROVIDER_URL: 'ftp://provider' }),
    ).toThrow(ConfigError);
  });

  it("accepts the literal 'fake:deterministic' with no AI_API_KEY", () => {
    const cfg = loadConfig(minimalValid);
    expect(cfg.aiProviderUrl).toBe('fake:deterministic');
    expect(cfg.aiApiKey).toBeNull();
  });

  it('accepts an https provider only WITH an AI_API_KEY', () => {
    const cfg = loadConfig({
      ...minimalValid,
      AI_PROVIDER_URL: 'https://real.example',
      AI_API_KEY: 'sk-secret',
    });
    expect(cfg.aiProviderUrl).toBe('https://real.example');
    expect(cfg.aiApiKey).toBe('sk-secret');
  });

  it('names the key but discloses no AI_API_KEY value on a bad-scheme throw (§4.7)', () => {
    const secret = 'sk-should-never-leak';
    let message = '';
    try {
      loadConfig({
        ...minimalValid,
        AI_PROVIDER_URL: 'http://insecure',
        AI_API_KEY: secret,
      });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('AI_PROVIDER_URL');
    expect(message).not.toContain(secret);
  });
});

describe('config — self-check 6: AI_MODEL_ID', () => {
  it('throws when AI_MODEL_ID is absent', () => {
    const { AI_MODEL_ID: _omit, ...rest } = minimalValid;
    void _omit;
    expect(() => loadConfig(rest)).toThrow(ConfigError);
  });

  it('throws when AI_MODEL_ID is blank', () => {
    expect(() => loadConfig({ ...minimalValid, AI_MODEL_ID: '   ' })).toThrow(
      ConfigError,
    );
  });
});

describe('config — self-check 7: PROMPT_VERSION + digest (§5 A-2)', () => {
  it('throws when PROMPT_VERSION is absent', () => {
    const { PROMPT_VERSION: _omit, ...rest } = minimalValid;
    void _omit;
    expect(() => loadConfig(rest)).toThrow(ConfigError);
  });

  it('throws naming PROMPT_VERSION for an unknown version', () => {
    let message = '';
    try {
      loadConfig({ ...minimalValid, PROMPT_VERSION: '1999.01.1' });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('PROMPT_VERSION');
  });

  it('accepts the real shipped prompt version (digest matches)', () => {
    const cfg = loadConfig(minimalValid);
    expect(cfg.promptVersion).toBe('2026.09.1');
  });
});

describe('config — self-check 8: AI_API_KEY required only for https', () => {
  it('throws for an https provider with no AI_API_KEY', () => {
    expect(() =>
      loadConfig({
        ...minimalValid,
        AI_PROVIDER_URL: 'https://real.example',
      }),
    ).toThrow(ConfigError);
  });

  it('throws for an https provider with a blank AI_API_KEY', () => {
    expect(() =>
      loadConfig({
        ...minimalValid,
        AI_PROVIDER_URL: 'https://real.example',
        AI_API_KEY: '   ',
      }),
    ).toThrow(ConfigError);
  });
});

describe('config — self-checks 9/10: AI_TIMEOUT_MS + AI_WORKER_CONCURRENCY', () => {
  it('applies the documented defaults 20000 / 2', () => {
    const cfg = loadConfig(minimalValid);
    expect(cfg.aiTimeoutMs).toBe(20000);
    expect(cfg.aiWorkerConcurrency).toBe(2);
  });

  it('round-trips explicit valid overrides', () => {
    const cfg = loadConfig({
      ...minimalValid,
      AI_TIMEOUT_MS: '5000',
      AI_WORKER_CONCURRENCY: '4',
    });
    expect(cfg.aiTimeoutMs).toBe(5000);
    expect(cfg.aiWorkerConcurrency).toBe(4);
  });

  for (const bad of ['0', '-1', 'abc', '1.5']) {
    it(`throws for AI_TIMEOUT_MS=${bad}`, () => {
      expect(() =>
        loadConfig({ ...minimalValid, AI_TIMEOUT_MS: bad }),
      ).toThrow(ConfigError);
    });
    it(`throws for AI_WORKER_CONCURRENCY=${bad}`, () => {
      expect(() =>
        loadConfig({ ...minimalValid, AI_WORKER_CONCURRENCY: bad }),
      ).toThrow(ConfigError);
    });
  }
});

describe('config — PORT validation', () => {
  it('parses a valid PORT', () => {
    expect(loadConfig({ ...minimalValid, PORT: '8080' }).port).toBe(8080);
  });

  for (const bad of ['0', '70000', 'abc', '3000.5', '-1']) {
    it(`throws for PORT=${bad}`, () => {
      expect(() => loadConfig({ ...minimalValid, PORT: bad })).toThrow(
        ConfigError,
      );
    });
  }
});
