// Copy the USWDS runtime assets into web/public/assets so the application
// serves them from its OWN origin (FR-2.3, T-02-31). The demonstration must
// render correctly with NO external network access, so nothing may be fetched
// from a CDN at runtime — the icon sprite, the fonts and the compiled USWDS JS
// are all copied here at build time.
//
// Idempotent: `fs.cp({ recursive, force })` overwrites in place, so re-running
// `npm run build:assets` is safe.

import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // web/scripts
const REPO_ROOT = resolve(HERE, '..', '..');
const USWDS_DIST = join(REPO_ROOT, 'node_modules', '@uswds', 'uswds', 'dist');
const OUT = join(REPO_ROOT, 'web', 'public', 'assets');

/** @type {Array<{ from: string; to: string }>} */
const COPIES = [
  // The icon sprite lives inside dist/img; copying the whole img tree keeps the
  // sprite path (/assets/img/sprite.svg) consistent with $theme-image-path.
  { from: join(USWDS_DIST, 'img'), to: join(OUT, 'img') },
  { from: join(USWDS_DIST, 'fonts'), to: join(OUT, 'fonts') },
  { from: join(USWDS_DIST, 'js'), to: join(OUT, 'js') },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const { from, to } of COPIES) {
    await cp(from, to, { recursive: true, force: true });
    process.stdout.write(`copied ${from} -> ${to}\n`);
  }
  process.stdout.write('uswds assets copied\n');
}

main().catch((err) => {
  process.stderr.write(
    `copy-uswds-assets: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
