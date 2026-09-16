// The prompt-template digest self-check primitives (TechArch §5 addition A-2).
//
// The prompt template is the trust anchor for "what did the AI say" (FR-9.10
// traceability): a recommendation records the prompt_version it was generated
// with, and that must correspond to the exact template text that produced it.
// So at boot (config.ts) the server compares the SHIPPED template file's
// SHA-256 digest against the digest pinned in manifest.json, and refuses to
// start if they differ — the template text cannot change without a version bump.
//
// Paths resolve relative to THIS module's own directory (via import.meta.url),
// never process.cwd(), so the self-check works regardless of the working
// directory the process was launched from. The build copies
// `src/ai/prompt/` into `dist/ai/prompt/` (see server build:prompt), and the
// runtime image ships `server/dist` wholesale, so the files ride alongside the
// compiled module in every environment.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface PromptManifestEntry {
  readonly path: string;
  readonly sha256: string;
}

// The directory holding the prompt template + manifest, resolved relative to
// this module (dist/ai/prompt/ at runtime, src/ai/prompt/ under ts-node).
const PROMPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'prompt');

type Manifest = Readonly<Record<string, PromptManifestEntry>>;

function readManifest(): Manifest {
  const raw = readFileSync(resolve(PROMPT_DIR, 'manifest.json'), 'utf8');
  return JSON.parse(raw) as Manifest;
}

/**
 * The manifest entry for a prompt version, or `undefined` if the version is
 * not known. A caller that gets `undefined` treats the configured
 * PROMPT_VERSION as invalid.
 */
export function getManifestEntry(
  promptVersion: string,
): PromptManifestEntry | undefined {
  const manifest = readManifest();
  return Object.prototype.hasOwnProperty.call(manifest, promptVersion)
    ? manifest[promptVersion]
    : undefined;
}

/**
 * The SHA-256 hex digest of a template file's raw bytes. `relPath` is resolved
 * relative to the prompt directory (the same base as the manifest), so a
 * manifest `path` value is passed straight through.
 */
export function computeFileDigestSync(relPath: string): string {
  const bytes = readFileSync(resolve(PROMPT_DIR, relPath));
  return createHash('sha256').update(bytes).digest('hex');
}
