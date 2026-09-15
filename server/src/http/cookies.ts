// Cookie parsing and Set-Cookie construction for the two §4.3 profiles.
//
// There is deliberately no third-party cookie-parsing dependency (02-01's
// <no_new_dependency_rule>): the two things this server does with cookies — read
// one named value from the request, and write one session cookie in exactly two
// attribute profiles — are a dozen lines and carry security-critical invariants
// (HttpOnly always, no Domain ever, Secure conditional) that are clearer stated
// here than configured through a library.

import type { AppConfig } from '../config.js';

/**
 * The single session cookie name. Fixed in every profile (§4.3, F1 FR-1.3).
 */
export const SESSION_COOKIE_NAME = 'cargoexec_sid';

/**
 * Parse a `Cookie` request header into a name→value map.
 *
 * Unknown or malformed pairs are skipped, never thrown on: a hand-crafted
 * `Cookie` header (e.g. a malformed percent-escape) must not 500 the request
 * — it simply is not a cookie this server issued (T-02-12).
 */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (header === undefined || header.trim() === '') {
    return out;
  }
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 0) {
      continue; // not a name=value pair
    }
    const name = pair.slice(0, eq).trim();
    if (name === '') {
      continue;
    }
    const rawValue = pair.slice(eq + 1).trim();
    let value = rawValue;
    try {
      value = decodeURIComponent(rawValue);
    } catch {
      // A malformed percent-escape is not a cookie this server issued. Keep the
      // raw value rather than throwing — a crafted header cannot 500 the origin.
      value = rawValue;
    }
    out[name] = value;
  }
  return out;
}

// Attributes fixed in EVERY profile (§4.3, F1 FR-1.3):
//   - name `cargoexec_sid`
//   - HttpOnly            (never script-readable — no XSS session theft)
//   - Path=/              (one cookie for the whole app)
//   - NO Domain           (cannot be scoped to a parent domain)
//   - NO Max-Age/Expires  (a session cookie; server-side expiry is the only
//                           authority on lifetime — the browser must not hold a
//                           persistent copy)
//
// Per-profile attributes:
//   | Profile              | SameSite | Secure                         |
//   | governed (default)   | Lax      | only when config.originIsHttps  |
//   | demo-iframe          | None     | always (config already refused  |
//   |                      |          | a non-HTTPS origin)             |
//
// Why Secure is CONDITIONAL under `governed`: §4.8 permits plain HTTP for a
// local demonstration, where the governed profile drops Secure. A Secure cookie
// on an http: origin is silently discarded by the browser with no error
// anywhere — sign-in would fail with no diagnosable cause. Plan 02-04's
// bootstrap logs the §4.8 startup warning naming the reduced posture.

function sameSiteAndSecure(config: AppConfig): {
  sameSite: 'Lax' | 'None';
  secure: boolean;
} {
  if (config.sessionCookieProfile === 'demo-iframe') {
    // SameSite=None mandates Secure; loadConfig already refused a non-HTTPS
    // origin under this profile, so `always` is safe here.
    return { sameSite: 'None', secure: true };
  }
  // governed
  return { sameSite: 'Lax', secure: config.originIsHttps };
}

/**
 * Build the `Set-Cookie` value that establishes the session. `token` is the
 * opaque session id the browser presents on subsequent requests; it is never
 * logged (see logger.ts / sessionRef).
 */
export function buildSessionCookie(token: string, config: AppConfig): string {
  const { sameSite, secure } = sameSiteAndSecure(config);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `SameSite=${sameSite}`,
  ];
  if (secure) {
    parts.push('Secure');
  }
  // Deliberately NO Domain, NO Max-Age, NO Expires.
  return parts.join('; ');
}

/**
 * Build the `Set-Cookie` value that clears the session. Same name/path and the
 * same per-profile SameSite/Secure attributes, an empty value, and `Max-Age=0`
 * — clearing is the one case where an expiry attribute is correct, since it is
 * the instruction to the browser to drop the cookie now.
 */
export function buildClearedSessionCookie(config: AppConfig): string {
  const { sameSite, secure } = sameSiteAndSecure(config);
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    `SameSite=${sameSite}`,
    'Max-Age=0',
  ];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}
