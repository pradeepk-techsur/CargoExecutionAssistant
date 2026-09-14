// Placeholder module so the `web` workspace has a type-checkable input from
// plan 02-01 onward. The real SPA source (`web/src/*.tsx`, `web/vite.config.ts`,
// `web/styles/uswds.scss`, `web/scripts/copy-uswds-assets.mjs`) arrives in plan
// 02-05; until then `tsc -p web --noEmit` needs at least one file to check, or
// it exits 2 with TS18003 and breaks `npm run typecheck` for every plan between.
// Delete this file once real source exists.
export const WEB_WORKSPACE_INITIALISED = true;
