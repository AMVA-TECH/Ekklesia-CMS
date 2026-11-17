'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  apiFetch,
  ApiError,
  useSession,
} from '@/app/_ekklesia/session';
import {
  Avatar,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Skeleton,
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';

/**
 * Church profile cluster on the far right of the admin topbar.
 *
 * Shows the active church avatar + name. The menu still covers church
 * settings and sign-out; the signed-in person lives in the sidebar footer.
 */
export function TopbarEnd(): React.ReactElement {
  const { user, church, loading } = useSession();
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (loading && !user) {
    return <Skeleton size="line" className="h-8 w-44 rounded-md" />;
  }

  const churchName = church?.name?.trim() || 'No church selected';
  const userName = user?.displayName?.trim() || 'Signed out';

  const handleSignOut = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
      push({
        tone: 'success',
        title: 'Signed out',
        message: 'See you soon.',
      });
      window.location.href = '/';
    } catch (err) {
      push({
        tone: 'danger',
        title: 'Could not sign out',
        message:
          err instanceof ApiError
            ? err.message
            : 'Please try again in a moment.',
      });
      setBusy(false);
    }
  };

  return (
    <Menu
      align="end"
      label="Church profile menu"
      trigger={
        <button
          type="button"
          className="inline-flex max-w-[16rem] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-muted focus-ring"
        >
          <Avatar
            name={churchName}
            src={church?.logoUrl}
            size="sm"
            tone="charcoal"
            ring
            className="ring-border"
          />
          <span className="hidden min-w-0 md:block">
            <span className="block truncate font-semibold leading-tight">
              {churchName}
            </span>
            <span className="block truncate text-[11px] leading-tight text-muted-foreground">
              Church profile
            </span>
          </span>
          <Icon
            name="chevron-down"
            size={14}
            className="shrink-0 text-muted-foreground"
          />
        </button>
      }
    >
      <MenuLabel>Active church</MenuLabel>
      <div className="px-3 pb-2">
        <p className="truncate text-sm font-medium text-foreground">
          {churchName}
        </p>
        {church?.slug ? (
          <p className="truncate text-xs text-muted-foreground">
            /{church.slug}
          </p>
        ) : null}
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Signed in as {userName}
        </p>
      </div>
      <MenuSeparator />
      <MenuItem icon="settings" onClick={() => router.push('/admin/settings')}>
        Church settings
      </MenuItem>
      <MenuItem
        icon="book"
        onClick={() => {
          window.location.href = '/api/docs';
        }}
      >
        API reference
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        icon="logout"
        onClick={() => {
          void handleSignOut();
        }}
        disabled={busy}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </MenuItem>
    </Menu>
  );
}
