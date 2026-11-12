'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Session } from './types';

interface SessionContextValue {
  /** Resolved session, or `null` while unauthenticated / loading. */
  session: Session | null;
  /** True while the session is still being fetched. */
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

/** Props for `SessionProvider`. */
export interface SessionProviderProps {
  /** Preloaded session from a server component, or `null` for guests. */
  session: Session | null;
  /** Mark the tree as still resolving (e.g. for suspense boundaries). */
  loading?: boolean;
  children: ReactNode;
}

/**
 * Provide the current session to descendant client components.
 *
 * Typically mounted at each shell root (admin, member) with a session that
 * the server fetched via `/api/v1/auth/me`. Guests can pass `session={null}`.
 */
export function SessionProvider({
  session,
  loading = false,
  children,
}: SessionProviderProps): React.ReactElement {
  const value = useMemo<SessionContextValue>(
    () => ({ session, loading }),
    [session, loading],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Internal hook — reads the raw context value. */
export function useSessionContext(): SessionContextValue {
  return useContext(SessionContext);
}
