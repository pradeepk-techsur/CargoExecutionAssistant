// The two ARIA live regions (FR-2.16, UX Pattern 5).
//
// Both regions are present in the DOM FROM FIRST PAINT, visually hidden with
// Carbon's `cds--visually-hidden` utility (the Carbon equivalent of USWDS's
// `usa-sr-only`). This is load-bearing: a screen reader only announces a change
// to a live region that already existed when the announcement is made, so a
// region inserted at the moment of the announcement is silent. They live here,
// above the router, so they persist across navigation.
//
// Announcements are short complete sentences and MUST NOT duplicate text that
// focus movement already reads (FR-2.16, Y2 §5) — useScreenFocus announces the
// screen title politely and moves focus to the h1; a screen should not also
// announce "You are on the …" for the same event.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface Announce {
  /** Polite (aria-live="polite"): status, progress, non-urgent confirmation. */
  announceStatus(text: string): void;
  /** Assertive (aria-live="assertive"): errors that interrupt. Use sparingly. */
  announceError(text: string): void;
}

const AnnounceContext = createContext<Announce | null>(null);

/**
 * Provides the announce functions and renders the two live regions. Mount ONCE,
 * above the router, so the regions exist from first paint and survive route
 * changes.
 */
export function AnnounceProvider(props: { children: ReactNode }): JSX.Element {
  const [status, setStatus] = useState('');
  const [alert, setAlert] = useState('');

  const announceStatus = useCallback((text: string): void => {
    // Clear then set on the next tick so an identical consecutive message is
    // still announced (an unchanged text node is not re-read).
    setStatus('');
    window.setTimeout(() => setStatus(text), 50);
  }, []);

  const announceError = useCallback((text: string): void => {
    setAlert('');
    window.setTimeout(() => setAlert(text), 50);
  }, []);

  const value = useMemo<Announce>(
    () => ({ announceStatus, announceError }),
    [announceStatus, announceError],
  );

  return (
    <AnnounceContext.Provider value={value}>
      {props.children}
      <LiveRegions status={status} alert={alert} />
    </AnnounceContext.Provider>
  );
}

/**
 * The two live regions themselves. Rendered by AnnounceProvider with the
 * current status/alert text. Exported so a test (and the provider) can render
 * them; both regions exist unconditionally.
 */
export function LiveRegions(props?: {
  status?: string;
  alert?: string;
}): JSX.Element {
  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="cds--visually-hidden"
        data-testid="live-status"
      >
        {props?.status ?? ''}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="cds--visually-hidden"
        data-testid="live-alert"
      >
        {props?.alert ?? ''}
      </div>
    </>
  );
}

/** Access the announce functions. Throws if used outside AnnounceProvider. */
export function useAnnounce(): Announce {
  const ctx = useContext(AnnounceContext);
  if (ctx === null) {
    throw new Error('useAnnounce must be used within an AnnounceProvider');
  }
  return ctx;
}
