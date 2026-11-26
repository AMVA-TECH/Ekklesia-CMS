'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AdminShell, type NavGroup } from '@/app/_ekklesia/shell';
import { BrandMark } from '@/app/_ekklesia/ui';
import { navGroupsFromConsole } from './platform-console';
import { platformApi } from './platform-api';
import { PlatformNotificationBell } from './platform-notification-bell';

function appEnvironment(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

/**
 * Platform Admin shell — shared Ekklesia AdminShell chrome with permission-aware nav
 * driven by `PLATFORM_CONSOLE`.
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  const env = appEnvironment();
  const [perms, setPerms] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformApi<{ permissions: string[]; isAdmin: boolean }>(
      '/api/v1/platform/me',
    )
      .then((res) => {
        if (cancelled) return;
        setPerms(new Set(res.permissions));
      })
      .catch(() => {
        if (cancelled) return;
        setPerms(new Set(['platform:read']));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups: NavGroup[] = useMemo(() => {
    if (!perms) return [];
    return navGroupsFromConsole(perms);
  }, [perms]);

  return (
    <AdminShell
      groups={groups}
      churchName="Platform Admin"
      topbarEnd={<PlatformNotificationBell />}
      banner={
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
          <div className="flex items-center gap-2">
            <BrandMark size={20} />
            <span className="font-medium text-foreground">
              Ekklesia platform control plane
            </span>
            <span className="text-muted-foreground">
              · separate from church governance
            </span>
          </div>
          <span
            className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            title="Deployment environment"
          >
            {env}
          </span>
        </div>
      }
      footerProps={{
        tagline: (
          <>
            <span className="font-semibold text-foreground">Ekklesia</span> ·
            platform control plane
          </>
        ),
      }}
    >
      {children}
    </AdminShell>
  );
}
