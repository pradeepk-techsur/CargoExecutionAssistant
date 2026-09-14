import { defineConfig, type ServerOptions } from 'vite';

// The Vite build for the SPA (TechArch §6.4, §6.5).
//
// The `server` block below is TechArch §6.5's normative excerpt and is kept
// even though the demonstration path serves the production build through
// Express (server/src/index.ts): it is the contract for dev mode, and binding
// 0.0.0.0 with allowedHosts is what lets the preview proxy reach a dev server
// at all (runtime-environment §2).

export default defineConfig({
  root: __dirname, // web/
  publicDir: 'public',
  build: { outDir: 'dist', emptyOutDir: true },
  // Use esbuild's automatic JSX runtime rather than @vitejs/plugin-react — the
  // shell needs no Fast Refresh in the production build path and the plugin is
  // not a project dependency (§6.2 allowlist).
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  // @cargoexec/contract is workspace TypeScript source consumed with
  // `import type` only; keep Vite from trying to pre-bundle it as a dep.
  optimizeDeps: { exclude: ['@cargoexec/contract'] },
  // `allowedHosts: true` is required by §6.5 to accept the preview proxy's Host
  // header. Its type only lands in Vite 6's ServerOptions; this project pins
  // Vite 5.4.11 (§6.2), where the runtime already honours the option but the
  // type does not declare it — so the server block is typed one field wider.
  server: {
    host: '0.0.0.0', // bind all interfaces so the proxy can reach it
    port: 3000,
    strictPort: true, // fail loudly rather than drift to 3001
    allowedHosts: true, // accept the preview proxy's Host header
    hmr: { clientPort: 3000 },
  } as ServerOptions & { allowedHosts: true },
});
