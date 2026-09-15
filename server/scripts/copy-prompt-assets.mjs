// Copy the versioned prompt templates + manifest into the compiled output.
//
// `tsc` only emits .js/.d.ts; the prompt .md templates and manifest.json in
// server/src/ai/prompt/ are static assets the runtime reads by SHA-256 digest
// (config.ts's addition-A-2 boot self-check, via ai/promptManifest.ts). They
// must sit beside the compiled promptManifest.js at dist/ai/prompt/, because
// the runtime resolves them relative to that module and the Docker runtime
// stage ships server/dist wholesale. Without this copy the server would refuse
// to boot: computeFileDigestSync would not find the template file.

import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../src/ai/prompt');
const outDir = resolve(here, '../dist/ai/prompt');

try {
  mkdirSync(outDir, { recursive: true });
  cpSync(srcDir, outDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.log(`copy-prompt-assets: ${srcDir} -> ${outDir}`);
} catch (err) {
  process.stderr.write(
    `copy-prompt-assets: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
}
