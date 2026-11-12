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
 * Account menu rendered on the right side of the admin topbar.
 *
 * Shows the signed-in user initials + display name with a dropdown of
 * identity, church settings, and sign out. Kept intentionally small — dense
 * admin chrome, not a dashboard.
 */
export function TopbarEnd(): React.ReactElement {
  const { user, church, loading } = useSession();
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (loading && !user) {
    return <Skeleton size="line" className="h-8 w-40 rounded-md" />;
  }

  const displayName = user?.displayName ?? 'Signed out';

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
      // Hard navigation so the root redirect (owned by Lead/Agent 5) re-runs.
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
      label="Account menu"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-surface-muted focus-ring"
        >
          <Avatar name={displayName} size="sm" />
          <span className="hidden min-w-0 max-w-[12rem] truncate text-left md:inline">
            {displayName}
          </span>
          <Icon
            name="chevron-down"
            size={14}
            className="text-muted-foreground"
          />
        </button>
      }
    >
      <MenuLabel>Signed in</MenuLabel>
      <div className="px-3 pb-2">
        <p className="truncate text-sm font-medium text-foreground">
          {displayName}
        </p>
        {user?.email ? (
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        ) : null}
        {church ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {church.name}
          </p>
        ) : null}
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
