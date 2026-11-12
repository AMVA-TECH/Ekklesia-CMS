'use client';

import { useSessionContext } from './session-context';
import type { Session, SessionUser, SessionChurch } from './types';

/**
 * Hook returning the current session, plus loading + authentication flags.
 *
 * Always safe to call: when no `SessionProvider` is mounted it returns
 * `{ session: null, loading: true }`.
 */
export function useSession(): {
  session: Session | null;
  user: SessionUser | null;
  church: SessionChurch | null;
  loading: boolean;
  isAuthenticated: boolean;
} {
  const { session, loading } = useSessionContext();
  return {
    session,
    user: session?.user ?? null,
    church: session?.church ?? null,
    loading,
    isAuthenticated: session !== null,
  };
}
