import { describe, it, expect } from 'vitest';
import { loadConfig, ConfigError } from '../../src/config.js';

// loadConfig is passed a literal env object in every test; process.env is never
// mutated (§8.7 self-checks are pure over their input).

const minimalValid: NodeJS.ProcessEnv = {
  DATABASE_URL_APP: 'postgres://cargoexec_app:pw@db:5432/cargoexec',
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
