// The session provider (TechArch §1A.4; F1 FR-1.8, FR-1.21; FR-2.4).
//
// React context over `api`. On mount it resolves GET /api/session before any
// protected content renders (no flash of protected content). Because
// `api.getSession()` re-stores the rotated CSRF token itself (client.ts), the
// provider holds a usable token the moment `status` leaves `loading` — which is
// also the moment the first state-changing control (Sign out) becomes
// reachable. The provider holds NO draft form state, so in-progress input can
// never be retained across re-authentication or resubmitted (FR-1.8).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SpecialistDto } from '@cargoexec/contract';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAnnounce } from '../shell/LiveRegions.js';
import { validateNextPath } from '../app/nextPath.js';

export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

export interface SessionContextValue {
  readonly specialist: SpecialistDto | null;
  readonly status: SessionStatus;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider(props: { children: ReactNode }): JSX.Element {
  const [specialist, setSpecialist] = useState<SpecialistDto | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const navigate = useNavigate();
  const { announceStatus } = useAnnounce();

  // Resolve the session once on mount. getSession() re-stores the rotated CSRF
  // token internally, so a token is in hand the instant status leaves loading.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const dto = await api.getSession();
        if (cancelled) return;
        setSpecialist(dto.specialist);
        setStatus('signed-in');
      } catch {
        if (cancelled) return;
        setSpecialist(null);
        setStatus('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      const dto = await api.signIn({ email, password });
      setSpecialist(dto.specialist);
      setStatus('signed-in');
      // Honour ?next= (validated client-side to the same rule the server uses),
      // defaulting to /queue (FR-1.21). The server already validated its own
      // redirect; the client must not be the weaker of the two.
      const params = new URLSearchParams(window.location.search);
      const dest = validateNextPath(params.get('next') ?? undefined);
      navigate(dest, { replace: true });
    },
    [navigate],
  );

  const signOut = useCallback(async (): Promise<void> => {
    await api.signOut();
    setSpecialist(null);
    setStatus('signed-out');
    // ?reason=signed-out lets /sign-in render the "You are signed out."
    // confirmation (Screen-00 "Signed out" state); the polite announcement is
    // made here so a screen-reader user hears it regardless of the screen.
    navigate('/sign-in?reason=signed-out', { replace: true });
    announceStatus('You are signed out.');
  }, [navigate, announceStatus]);

  const value = useMemo<SessionContextValue>(
    () => ({ specialist, status, signIn, signOut }),
    [specialist, status, signIn, signOut],
  );

  return (
    <SessionContext.Provider value={value}>
      {props.children}
    </SessionContext.Provider>
  );
}

/** Access the session. Throws if used outside SessionProvider. */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (ctx === null) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
