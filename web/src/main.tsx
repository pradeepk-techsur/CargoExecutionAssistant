// SPA bootstrap (FR-2.4 validation, T-02-33, §6.5).
//
// The session is resolved from GET /api/session BEFORE any protected screen
// renders — no flash of protected content. That resolution now lives in
// SessionProvider (web/src/session/SessionProvider.tsx), mounted as the router's
// root layout so it can use react-router's useNavigate and the live regions.
// The server-side htmlRouteGuard (plan 02-04) already 302s an unauthenticated
// document request to /sign-in; this client bootstrap is the belt to that
// braces. Both live regions are mounted by AnnounceProvider above the router, so
// they exist from first paint.
//
// The stylesheet is NOT imported here (CSP style-src 'self', §4.5): it is a
// <link> in index.html. No CSS import appears anywhere under web/src.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AnnounceProvider } from './shell/LiveRegions.js';
import { router } from './app/router.js';

function App(): JSX.Element {
  return (
    <AnnounceProvider>
      <RouterProvider router={router} />
    </AnnounceProvider>
  );
}

function main(): void {
  const rootEl = document.getElementById('root');
  if (rootEl === null) return;
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

main();
