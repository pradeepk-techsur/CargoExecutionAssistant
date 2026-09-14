// The route table (TechArch §3.17), react-router-dom 6.28.0.
//
// EXACTLY these routes exist. There is NO dashboard route, NO reports route, NO
// settings route, NO admin route, NO user-management route, NO closed-case
// browse route and NO search route (§3.17). Do not add one "for later".
//
//   /sign-in                      reduced shell; plan 02-07 supplies the screen.
//                                 Until then: NotBuiltYet title "Sign in".
//   /                             redirect to /queue
//   /queue                        NotBuiltYet "Review queue" (F8, Phase 4)
//   /entries/new                  NotBuiltYet "New cargo entry" (F6, Phase 3)
//   /cases/:caseReference         NotBuiltYet "Case" (F10, Phase 5)
//   /cases/:caseReference/audit   NotBuiltYet "Case" (F14, Phase 6)
//   *                             NotFound

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from '../shell/Shell.js';
import { NotBuiltYet } from '../screens/NotBuiltYet.js';
import { NotFound } from '../screens/NotFound.js';
import { useSession } from './session.js';

/** The authenticated shell: full header, nav, name and sign-out from context. */
function AuthenticatedShell(): JSX.Element {
  const { specialist, signOut } = useSession();
  return <Shell reduced={false} specialist={specialist} onSignOut={signOut} />;
}

/** The reduced shell for /sign-in: no nav, no display name, no sign-out. */
function ReducedShell(): JSX.Element {
  return <Shell reduced />;
}

export const router = createBrowserRouter([
  {
    element: <ReducedShell />,
    children: [
      // Plan 02-07 replaces this element with the real sign-in screen.
      { path: '/sign-in', element: <NotBuiltYet title="Sign in" /> },
    ],
  },
  {
    element: <AuthenticatedShell />,
    children: [
      { path: '/', element: <Navigate to="/queue" replace /> },
      { path: '/queue', element: <NotBuiltYet title="Review queue" /> },
      { path: '/entries/new', element: <NotBuiltYet title="New cargo entry" /> },
      { path: '/cases/:caseReference', element: <NotBuiltYet title="Case" /> },
      {
        path: '/cases/:caseReference/audit',
        element: <NotBuiltYet title="Case" />,
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
