import { describe, it, expect } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  parseCookies,
  buildSessionCookie,
  buildClearedSessionCookie,
} from '../../src/http/cookies.js';
import type { AppConfig } from '../../src/config.js';

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    host: '0.0.0.0',
    port: 3000,
    databaseUrlApp: 'postgres://ignored',
    sessionCookieProfile: 'governed',
    frameAncestors: null,
    logLevel: 'info',
    originIsHttps: false,
    ...overrides,
  };
}

describe('parseCookies', () => {
  it('returns an empty map for an absent header', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('returns an empty map for an empty header', () => {
    expect(parseCookies('')).toEqual({});
    expect(parseCookies('   ')).toEqual({});
  });

  it('parses a single pair', () => {
    expect(parseCookies('cargoexec_sid=abc123')).toEqual({
      cargoexec_sid: 'abc123',
    });
  });

  it('parses several pairs', () => {
    expect(parseCookies('a=1; b=2;c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('splits each pair at the FIRST equals so a value may contain =', () => {
    expect(parseCookies('token=a=b=c')).toEqual({ token: 'a=b=c' });
  });

  it('url-decodes the value', () => {
    expect(parseCookies('x=%20spaced%20')).toEqual({ x: ' spaced ' });
  });

  it('does not throw on a malformed percent-escape (keeps the raw value)', () => {
    expect(() => parseCookies('x=%ZZ')).not.toThrow();
    expect(parseCookies('x=%ZZ')).toEqual({ x: '%ZZ' });
  });

  it('skips pairs with no equals sign', () => {
    expect(parseCookies('novalue; a=1')).toEqual({ a: '1' });
  });
});

describe('buildSessionCookie', () => {
  it('governed + http origin: HttpOnly, Path=/, SameSite=Lax, and NO Secure/Domain/Max-Age/Expires', () => {
    const c = buildSessionCookie('tok', makeConfig({ originIsHttps: false }));
    expect(c).toContain(`${SESSION_COOKIE_NAME}=tok`);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Path=/');
    expect(c).toContain('SameSite=Lax');
    expect(c).not.toContain('Secure');
    expect(c).not.toContain('Domain');
    expect(c).not.toContain('Max-Age');
    expect(c).not.toContain('Expires');
  });

  it('governed + https origin: adds Secure', () => {
    const c = buildSessionCookie('tok', makeConfig({ originIsHttps: true }));
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Secure');
    expect(c).not.toContain('Domain');
    expect(c).not.toContain('Max-Age');
  });

  it('demo-iframe: SameSite=None; Secure', () => {
    const c = buildSessionCookie(
      'tok',
      makeConfig({ sessionCookieProfile: 'demo-iframe', originIsHttps: true }),
    );
    expect(c).toContain('SameSite=None');
    expect(c).toContain('Secure');
    expect(c).not.toContain('Domain');
    expect(c).not.toContain('Max-Age');
    expect(c).not.toContain('Expires');
  });

  it('url-encodes the token value', () => {
    const c = buildSessionCookie('a b/c', makeConfig());
    expect(c).toContain(`${SESSION_COOKIE_NAME}=a%20b%2Fc`);
  });
});

describe('buildClearedSessionCookie', () => {
  it('emits the same name and path with Max-Age=0 and an empty value', () => {
    const c = buildClearedSessionCookie(makeConfig());
    expect(c).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(c).not.toContain(`${SESSION_COOKIE_NAME}=tok`);
    expect(c).toContain('Path=/');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Max-Age=0');
  });

  it('carries the demo-iframe attributes when that profile is active', () => {
    const c = buildClearedSessionCookie(
      makeConfig({ sessionCookieProfile: 'demo-iframe', originIsHttps: true }),
    );
    expect(c).toContain('SameSite=None');
    expect(c).toContain('Secure');
    expect(c).toContain('Max-Age=0');
  });
});
