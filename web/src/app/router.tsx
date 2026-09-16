// The route table (TechArch §3.17), react-router-dom 6.28.0.
//
// EXACTLY these routes exist. There is NO dashboard route, NO reports route, NO
// settings route, NO admin route, NO user-management route, NO closed-case
// browse route and NO search route (§3.17). Do not add one "for later".
//
//   /sign-in                      reduced shell; the F1 sign-in screen (02-07).
//   /                             redirect to /queue
//   /queue                        the F8 Review queue screen (Phase 4)
//   /entries/new                  NotBuiltYet "New cargo entry" (F6, Phase 3)
//   /cases/:caseReference         the F10 case-detail screen (Phase 5)
//   /cases/:caseReference/audit   NotBuiltYet "Case" (F14, Phase 6)
//   *                             NotFound
//
// The root layout mounts SessionProvider (which resolves GET /api/session before
// any protected content renders) around the whole tree, so useSession is
// available everywhere and the bootstrap runs once.

import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Shell } from '../shell/Shell.js';
import { CaseDetail } from '../screens/CaseDetail.js';
import { NotBuiltYet } from '../screens/NotBuiltYet.js';
import { NotFound } from '../screens/NotFound.js';
import { Queue } from '../screens/Queue.js';
import { SignIn } from '../screens/SignIn.js';
import { SessionProvider, useSession } from '../session/SessionProvider.js';

/** The root layout: SessionProvider around the whole route tree. */
function Root(): JSX.Element {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}

/** The reduced shell for /sign-in: no nav, no display name, no sign-out. */
function ReducedShell(): JSX.Element {
  return <Shell reduced />;
}

/**
 * The authenticated shell. Renders nothing until the session bootstrap resolves
 * (no flash of protected content, FR-2.4). The server-side htmlRouteGuard is
 * authoritative for document requests; this is the client-side belt to it.
 */
function AuthenticatedShell(): JSX.Element | null {
  const { specialist, status, signOut } = useSession();
  if (status === 'loading') {
    return null; // resolving the session — render no protected content, no header
  }
  return (
    <Shell
      reduced={false}
      specialist={specialist}
      onSignOut={() => {
        void signOut();
      }}
    />
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <ReducedShell />,
        children: [{ path: '/sign-in', element: <SignIn /> }],
      },
      {
        element: <AuthenticatedShell />,
        children: [
          { path: '/', element: <Navigate to="/queue" replace /> },
          { path: '/queue', element: <Queue /> },
          {
            path: '/entries/new',
            element: <NotBuiltYet title="New cargo entry" />,
          },
          { path: '/cases/:caseReference', element: <CaseDetail /> },
          {
            path: '/cases/:caseReference/audit',
            element: <NotBuiltYet title="Case" />,
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
