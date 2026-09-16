import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  getManifestEntry,
  computeFileDigestSync,
} from '../../../src/ai/promptManifest.js';

// The prompt directory as the module itself resolves it (relative to source
// under vitest's esbuild transform). Used to read the real shipped template.
const PROMPT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/ai/prompt',
);

describe('getManifestEntry', () => {
  it('returns the entry for the shipped version', () => {
    const entry = getManifestEntry('2026.09.1');
    expect(entry).toBeDefined();
    expect(entry?.path).toBe('2026.09.1.md');
    expect(entry?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns undefined for an unknown version', () => {
    expect(getManifestEntry('1999.01.1')).toBeUndefined();
  });

  it('does not treat inherited Object properties as versions', () => {
    expect(getManifestEntry('toString')).toBeUndefined();
    expect(getManifestEntry('constructor')).toBeUndefined();
  });
});

describe('computeFileDigestSync', () => {
  it('matches the pinned digest for the shipped template (the boot self-check passes)', () => {
    const entry = getManifestEntry('2026.09.1');
    expect(entry).toBeDefined();
    expect(computeFileDigestSync(entry!.path)).toBe(entry!.sha256);
  });

  it('computes the true SHA-256 of the raw file bytes', () => {
    const bytes = readFileSync(resolve(PROMPT_DIR, '2026.09.1.md'));
    const expected = createHash('sha256').update(bytes).digest('hex');
    expect(computeFileDigestSync('2026.09.1.md')).toBe(expected);
  });

  it('detects a genuine content change — the digest of altered bytes differs from the manifest', () => {
    // Prove the mechanism config.ts relies on: any change to the template text
    // yields a different digest, so a shipped-file edit without a version bump
    // would fail the equality check at boot.
    const entry = getManifestEntry('2026.09.1');
    expect(entry).toBeDefined();
    const bytes = readFileSync(resolve(PROMPT_DIR, '2026.09.1.md'));
    const tampered = Buffer.concat([bytes, Buffer.from('X')]);
    const tamperedDigest = createHash('sha256').update(tampered).digest('hex');
    expect(tamperedDigest).not.toBe(entry!.sha256);
  });
});
