// Self-host the Carbon Design System's default typeface, IBM Plex, into
// web/public/assets/fonts/plex so the application serves it from its OWN origin
// (FR-2.3, T-07-13). Carbon's compiled `@font-face` rules (see the `$font-path:
// "/assets/fonts/plex"` configuration in web/styles/app.scss) reference
// `/assets/fonts/plex/IBM-Plex-<Family>/fonts/split/...`, so nothing is ever
// fetched from the IBM Akamai CDN (1.www.s81c.com) at runtime — `$use-akamai-cdn`
// stays false and the CDN-absence architecture gate (server/test/architecture/
// absence.spec.ts) continues to pass.
//
// This mirrors copy-uswds-assets.mjs exactly: an idempotent `fs.cp({ recursive,
// force })` that overwrites in place, so re-running `npm run build:assets` is
// safe. The IBM Plex font files land in the SAME web/public/assets/fonts tree
// USWDS's own fonts already use — self-hosted assets keep living in one place,
// namespaced under a `plex/` subdirectory so the two font sets never collide.
//
// Only the three families Carbon emits `@font-face` for by default are copied
// (IBM-Plex-Sans — the UI body face, IBM-Plex-Mono, IBM-Plex-Serif); the many
// script-specific Plex families @carbon/styles ships disabled by default are
// not referenced by the compiled CSS and are not copied.

import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // web/scripts
const REPO_ROOT = resolve(HERE, '..', '..');
const PLEX_SRC = join(REPO_ROOT, 'node_modules', '@ibm', 'plex');
const FONTS_OUT = join(REPO_ROOT, 'web', 'public', 'assets', 'fonts', 'plex');

// The IBM Plex families Carbon's default `@font-face` set references. Each is a
// directory under @ibm/plex containing fonts/split + fonts/complete; copying the
// whole family directory keeps every weight/style the compiled CSS asks for.
const FAMILIES = ['IBM-Plex-Sans', 'IBM-Plex-Mono', 'IBM-Plex-Serif'];

// Project-owned static images that must be served from web/public/assets (which
// is a gitignored build directory). Their SOURCE lives under web/assets (which
// IS git-tracked), so a fresh clone can rebuild them with no dependency on any
// design-system package. The only such image is the U.S. government banner flag
// (web/src/shell/Banner.tsx, FR-2.5); it used to be copied out of the @uswds
// dist by copy-uswds-assets.mjs, which was removed in plan 07-11 when USWDS left
// the tree — the flag itself is a plain public-domain federal image, not a
// USWDS-coupled asset, so it is now vendored under web/assets/img and copied here.
const IMG_SRC = join(REPO_ROOT, 'web', 'assets', 'img');
const IMG_OUT = join(REPO_ROOT, 'web', 'public', 'assets', 'img');

async function main() {
  await mkdir(FONTS_OUT, { recursive: true });
  for (const family of FAMILIES) {
    const from = join(PLEX_SRC, family);
    const to = join(FONTS_OUT, family);
    await cp(from, to, { recursive: true, force: true });
    process.stdout.write(`copied ${from} -> ${to}\n`);
  }

  await mkdir(IMG_OUT, { recursive: true });
  await cp(IMG_SRC, IMG_OUT, { recursive: true, force: true });
  process.stdout.write(`copied ${IMG_SRC} -> ${IMG_OUT}\n`);

  process.stdout.write('carbon (IBM Plex) + project static assets copied\n');
}

main().catch((err) => {
  process.stderr.write(
    `copy-carbon-assets: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
