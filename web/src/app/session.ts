// The client session context (belt to the server-side htmlRouteGuard's braces).
//
// main.tsx bootstraps the session from GET /api/session BEFORE rendering a
// protected screen (FR-2.4 validation: no flash of protected content). The
// resolved specialist (or null) and the sign-out action are provided here so
// the shell layouts can render the header identity and wire "Sign out".

import { createContext, useContext } from 'react';
import type { SpecialistDto } from '@cargoexec/contract';

export interface SessionState {
  readonly specialist: SpecialistDto | null;
  readonly signOut: () => void;
}

export const SessionContext = createContext<SessionState>({
  specialist: null,
  signOut: () => {},
});

export function useSession(): SessionState {
  return useContext(SessionContext);
}
