'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  apiFetch,
  ApiError,
  SessionProvider,
  type Session,
} from '@/app/_ekklesia/session';
import { AdminShell } from '@/app/_ekklesia/shell';
import { ToastProvider } from '@/app/_ekklesia/ui';
import { buildAdminGroups } from '../_lib/nav-groups';
import type { AuthMeResponse } from '../_lib/api-types';
import { toUiSession } from '../_lib/session-mapper';
import { TopbarEnd } from './topbar-end';
import { SidebarFooter } from './sidebar-footer';
import { SessionBanner } from './session-banner';

interface AdminProvidersProps {
  children: ReactNode;
}

/**
 * Client-side root for the `(admin)` route group.
 *
 * Mounts a single `<ToastProvider>` + `<SessionProvider>` + `<AdminShell>`
 * for every admin page. The session is fetched client-side via `apiFetch`
 * (which attaches dev-auth headers when enabled) so the shell survives
 * browser-only identity in pilot and real session cookies in production.
 *
 * While loading, the shell renders with an empty nav + a soft banner. On
 * fetch failure, the banner surfaces the error without blocking the page —
 * child routes can still mount and render their own empty states.
 */
export function AdminProviders({ children }: AdminProvidersProps): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const me = await apiFetch<AuthMeResponse>('/api/v1/auth/me');
        if (!cancelled) {
          setSession(toUiSession(me));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error('Failed to load session'),
          );
          setSession(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => buildAdminGroups(session), [session]);
  const churchName = session?.church?.name;

  return (
    <SessionProvider session={session} loading={loading}>
      <ToastProvider>
        <AdminShell
          groups={groups}
          churchName={churchName ?? undefined}
          topbarEnd={<TopbarEnd />}
          sidebarFooter={<SidebarFooter />}
          banner={error ? <SessionBanner error={error} /> : undefined}
        >
          {children}
        </AdminShell>
      </ToastProvider>
    </SessionProvider>
  );
}
