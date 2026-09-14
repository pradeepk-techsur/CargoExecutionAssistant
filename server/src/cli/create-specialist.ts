import process from 'node:process';
import argon2 from 'argon2';
// `pg` is a CommonJS module: under Node's native ESM loader a named import
// (`import { Client } from 'pg'`) throws "Named export 'Client' not found" at
// runtime, even though esModuleInterop lets the compiler accept it. This CLI is
// executed directly as an ESM entry point (server/dist/cli/create-specialist.js),
// so it must use the interop-default form.
import pg from 'pg';
import { insertSpecialist, findSpecialistByEmail } from '../db/repositories/specialists.js';
import { ARGON2_OPTIONS } from '../services/session.service.js';

const { Client } = pg;

/**
 * create-specialist — the ONLY operational path by which an account comes into
 * existence (F1 FR-1.13; TechArch §8.7 step 5: "This is the ONLY insert
 * performed operationally; no seed data is created.").
 *
 * WHY THIS IS NOT SEED DATA. PRD §10 #7 excludes a seeded demonstration dataset
 * — demo cargo entries, cases, decisions, audit history. This CLI inserts
 * exactly ONE row in `specialists` and touches no other table, because a sign-in
 * screen nobody can sign into is not a demonstrable product. It is the
 * operator-run account-creation path FR-1.13 requires, invoked from a keyboard
 * or (idempotently) from container configuration rather than from a migration.
 * The migration set stays INSERT-free (`absence.spec.ts` asserts it): this is a
 * CLI, not a migration.
 *
 * ABSENT BY DESIGN (FR-1.13). There is no self-registration endpoint, no
 * password-reset endpoint, no invite flow, no user-administration UI, and no
 * `--set-password`, `--deactivate`, `--list` or `--delete` subcommand. Each
 * would be an administrative surface the product has no role to operate — one
 * role, binary auth (FR-1.1).
 *
 * It connects on the OWNER connection string (`DATABASE_URL_OWNER`), not the app
 * pool: account creation runs operationally, outside the request path, and the
 * request-path role should never be the account-creation credential.
 */

// ── Validation (mirrors the DB CHECK constraints and FR-1.15 inputs) ─────────

export class SpecialistInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecialistInputError';
  }
}

/** Normalise + validate an email. Returns the normalised value or throws. */
export function normaliseEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) {
    throw new SpecialistInputError('email must be between 3 and 254 characters');
  }
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) {
    throw new SpecialistInputError('email must contain exactly one @ with a non-empty local part');
  }
  const domain = email.slice(at + 1);
  if (domain.length === 0 || !domain.includes('.')) {
    throw new SpecialistInputError('email domain must be non-empty and contain a dot');
  }
  return email;
}

/** Validate a display name (1–120 chars after trim), returning the trimmed value. */
export function validateDisplayName(raw: string): string {
  const name = raw.trim();
  if (name.length < 1 || name.length > 120) {
    throw new SpecialistInputError('display name must be between 1 and 120 characters after trimming');
  }
  return name;
}

/**
 * Validate a password. NEVER trimmed (leading/trailing spaces are legitimate
 * password characters), never echoed, never logged. 12–256 characters (FR-1.4).
 */
export function validatePassword(password: string): void {
  if (password.length < 12 || password.length > 256) {
    throw new SpecialistInputError('password must be between 12 and 256 characters');
  }
}

// ── The insert ───────────────────────────────────────────────────────────────

/**
 * Insert exactly one specialist. Idempotent by email: a second call with the
 * same email returns `created: false` and inserts nothing (ON CONFLICT DO
 * NOTHING in the repository). Touches no table other than `specialists`.
 */
export async function createSpecialist(
  ownerUrl: string,
  input: { email: string; display_name: string; password: string },
): Promise<{ id: string; created: boolean }> {
  const email = normaliseEmail(input.email);
  const display_name = validateDisplayName(input.display_name);
  validatePassword(input.password);

  const password_hash = await argon2.hash(input.password, ARGON2_OPTIONS);

  const client = new Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    const inserted = await insertSpecialist(client, { email, display_name, password_hash });
    if (inserted !== null) {
      return { id: inserted.id, created: true };
    }
    // Already existed — re-select to return the existing id (created: false).
    const existing = await findSpecialistByEmail(client, email);
    if (existing === null) {
      // A concurrent delete is impossible (no delete path exists), so this is a
      // genuine invariant violation worth surfacing loudly.
      throw new Error('createSpecialist: conflict on insert but no existing row found');
    }
    return { id: existing.id, created: false };
  } finally {
    await client.end();
  }
}

// ── Interactive password entry ───────────────────────────────────────────────

/**
 * Read a password from stdin with echo disabled (raw mode on a TTY). Prompts
 * twice and requires the two entries to match. The characters are never echoed
 * and never appear in shell history.
 */
async function readPasswordFromTty(prompt: string): Promise<string> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  stdout.write(prompt);

  return await new Promise<string>((resolve, reject) => {
    let value = '';
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (chunk: string): void => {
      for (const ch of chunk) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        } else if (ch === '\u0003') {
          // Ctrl-C
          cleanup();
          stdout.write('\n');
          reject(new Error('cancelled'));
          return;
        } else if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };

    const cleanup = (): void => {
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
      stdin.removeListener('data', onData);
    };

    stdin.on('data', onData);
  });
}

async function promptPasswordTwice(): Promise<string> {
  const first = await readPasswordFromTty('Password: ');
  const second = await readPasswordFromTty('Confirm password: ');
  if (first !== second) {
    throw new SpecialistInputError('passwords did not match');
  }
  return first;
}

// ── Argument parsing ─────────────────────────────────────────────────────────

type ParsedArgs = {
  email?: string;
  displayName?: string;
  fromEnv: boolean;
  ifAbsent: boolean;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { fromEnv: false, ifAbsent: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--email': {
        const v = argv[++i];
        if (v === undefined) throw new SpecialistInputError('--email requires a value');
        out.email = v;
        break;
      }
      case '--display-name': {
        const v = argv[++i];
        if (v === undefined) throw new SpecialistInputError('--display-name requires a value');
        out.displayName = v;
        break;
      }
      case '--from-env':
        out.fromEnv = true;
        break;
      case '--if-absent':
        out.ifAbsent = true;
        break;
      default:
        throw new SpecialistInputError(`unknown argument: ${String(arg)}`);
    }
  }
  return out;
}

function ownerUrlFromEnv(): string {
  const url = process.env['DATABASE_URL_OWNER'];
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL_OWNER is not set; create-specialist connects as the owner role');
  }
  return url;
}

// ── main ─────────────────────────────────────────────────────────────────────

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return 2;
  }

  // --from-env --if-absent: read the bootstrap keys from the environment. When
  // ANY is absent, exit 0 with a one-line notice and create nothing — checked
  // BEFORE the DB URL so the container command in plan 02-08 can invoke it
  // unconditionally even in an environment that never provisioned the owner URL.
  if (args.fromEnv) {
    const email = process.env['BOOTSTRAP_SPECIALIST_EMAIL'];
    const name = process.env['BOOTSTRAP_SPECIALIST_NAME'];
    const password = process.env['BOOTSTRAP_SPECIALIST_PASSWORD'];
    if (!email || !name || !password) {
      process.stdout.write(
        'create-specialist: BOOTSTRAP_SPECIALIST_{EMAIL,NAME,PASSWORD} not all set; nothing to do.\n',
      );
      return 0;
    }
    const ownerUrl = ownerUrlFromEnv();
    try {
      const res = await createSpecialist(ownerUrl, { email, display_name: name, password });
      process.stdout.write(
        res.created
          ? `create-specialist: created specialist ${res.id}\n`
          : `create-specialist: specialist for ${normaliseEmail(email)} already exists (${res.id}); nothing to do.\n`,
      );
      return 0;
    } catch (err) {
      // Never include the password in an error message.
      process.stderr.write(`create-specialist: ${(err as Error).message}\n`);
      return 1;
    }
  }

  // Interactive mode: --email and --display-name from flags, password from stdin.
  if (args.email === undefined || args.displayName === undefined) {
    process.stderr.write(
      'usage: create-specialist --email <e> --display-name <n>   (password read interactively)\n' +
        '       create-specialist --from-env --if-absent          (bootstrap from environment)\n',
    );
    return 2;
  }

  if (!process.stdin.isTTY) {
    process.stderr.write(
      'create-specialist: stdin is not a TTY and no password can be read interactively. ' +
        'Use --from-env to supply the password via the environment rather than piping a ' +
        'plaintext password into shell history.\n',
    );
    return 2;
  }

  let password: string;
  try {
    password = await promptPasswordTwice();
  } catch (err) {
    process.stderr.write(`create-specialist: ${(err as Error).message}\n`);
    return 1;
  }

  try {
    const res = await createSpecialist(ownerUrlFromEnv(), {
      email: args.email,
      display_name: args.displayName,
      password,
    });
    process.stdout.write(
      res.created
        ? `create-specialist: created specialist ${res.id}\n`
        : `create-specialist: specialist already exists (${res.id})\n`,
    );
    return 0;
  } catch (err) {
    process.stderr.write(`create-specialist: ${(err as Error).message}\n`);
    return 1;
  }
}

// Run when invoked directly (server/dist/cli/create-specialist.js).
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`create-specialist: ${(err as Error).message}\n`);
      process.exit(1);
    });
}
