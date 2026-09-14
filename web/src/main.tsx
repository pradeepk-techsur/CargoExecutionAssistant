// SPA bootstrap (FR-2.4 validation, T-02-33, §6.5).
//
// The session is resolved from GET /api/session BEFORE any protected screen
// renders — no flash of protected content. The server-side htmlRouteGuard (plan
// 02-04) already 302s an unauthenticated document request to /sign-in; this
// client bootstrap is the belt to that braces. Both live regions are mounted by
// AnnounceProvider above the router, so they exist from first paint.
//
// The stylesheet is NOT imported here (CSP style-src 'self', §4.5): it is a
// <link> in index.html. No CSS import appears anywhere under web/src.

import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import type { SessionDto, SpecialistDto } from '@cargoexec/contract';
import { AnnounceProvider } from './shell/LiveRegions.js';
import { SessionContext, type SessionState } from './app/session.js';
import { router } from './app/router.js';

/** Resolve the current session once, before rendering the router. */
async function loadSession(): Promise<SpecialistDto | null> {
  try {
    const res = await fetch('/api/session', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as SessionDto;
    return body.specialist;
  } catch {
    // A failed session probe is treated as "unauthenticated"; the server-side
    // guard is authoritative for protected documents.
    return null;
  }
}

function App(props: { initialSpecialist: SpecialistDto | null }): JSX.Element {
  const [specialist] = useState<SpecialistDto | null>(props.initialSpecialist);

  const session = useMemo<SessionState>(
    () => ({
      specialist,
      signOut: () => {
        // 02-07 wires the real CSRF-guarded DELETE /api/session; until the
        // sign-in screen exists, a sign-out simply returns to /sign-in.
        window.location.assign('/sign-in');
      },
    }),
    [specialist],
  );

  return (
    <SessionContext.Provider value={session}>
      <AnnounceProvider>
        <RouterProvider router={router} />
      </AnnounceProvider>
    </SessionContext.Provider>
  );
}

async function main(): Promise<void> {
  const rootEl = document.getElementById('root');
  if (rootEl === null) return;
  const specialist = await loadSession();
  createRoot(rootEl).render(
    <StrictMode>
      <App initialSpecialist={specialist} />
    </StrictMode>,
  );
}

void main();
