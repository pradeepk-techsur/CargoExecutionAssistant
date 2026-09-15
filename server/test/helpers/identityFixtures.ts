import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { Client } from 'pg';
import { insertSpecialist } from '../../src/db/repositories/specialists.js';
import { ARGON2_OPTIONS } from '../../src/services/session.service.js';

/**
 * The specialist fixture every later API/DB suite in this phase reuses. It
 * hashes with the SAME Argon2id parameters and inserts through the SAME
 * repository function the CLI uses, so the fixture cannot drift from the
 * production account-creation path.
 *
 * This is test-only code under `server/test/`, excluded from any production
 * build. It is NOT a fixture *loader*: `absence.spec.ts` forbids a `fixtures/`
 * directory at the repository ROOT (a domain-data seed loader); this constructs
 * a single specialist row in test code, which is exactly what TechArch §8.2
 * prescribes.
 *
 * Argon2id at 19 MiB is deliberately slow. Prefer hashing ONCE per suite and
 * reusing the specialist across tests rather than creating one per test.
 */

export const TEST_PASSWORD = 'correct-horse-battery-staple'; // 28 chars, >= 12

let cachedHash: string | undefined;
let cachedHashForPassword: string | undefined;

/** Hash TEST_PASSWORD once and reuse it; a custom password is hashed each time. */
async function hashFor(password: string): Promise<string> {
  if (password === TEST_PASSWORD) {
    if (cachedHash === undefined || cachedHashForPassword !== password) {
      cachedHash = await argon2.hash(password, ARGON2_OPTIONS);
      cachedHashForPassword = password;
    }
    return cachedHash;
  }
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function createTestSpecialist(
  appUrl: string,
  opts?: { email?: string; display_name?: string; is_active?: boolean; password?: string },
): Promise<{ id: string; email: string; display_name: string }> {
  const email = (opts?.email ?? `spec-${randomBytes(4).toString('hex')}@cbp.example.gov`).toLowerCase();
  const display_name = opts?.display_name ?? 'Test Specialist';
  const password = opts?.password ?? TEST_PASSWORD;
  const password_hash = await hashFor(password);

  const client = new Client({ connectionString: appUrl });
  await client.connect();
  try {
    const inserted = await insertSpecialist(client, { email, display_name, password_hash });
    if (inserted === null) {
      throw new Error(`createTestSpecialist: email ${email} already exists`);
    }
    // The ACCOUNT_INACTIVE case needs is_active = false; the column defaults to
    // true, so only flip it when explicitly asked.
    if (opts?.is_active === false) {
      await client.query('UPDATE specialists SET is_active = false WHERE id = $1', [inserted.id]);
    }
    return { id: inserted.id, email, display_name };
  } finally {
    await client.end();
  }
}
