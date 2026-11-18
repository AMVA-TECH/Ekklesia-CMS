'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LocaleSwitcher } from '@/app/_ekklesia/i18n/locale-switcher';
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
 * Right cluster on the admin topbar: locale switcher + church menu.
 *
 * Language stays always visible; the signed-in person lives in the sidebar footer.
 */
export function TopbarEnd(): React.ReactElement {
  const t = useTranslations('AdminChrome');
  const { user, church, loading } = useSession();
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (loading && !user) {
    return (
      <div className="flex items-center gap-2">
        <LocaleSwitcher tone="light" />
        <Skeleton size="line" className="h-8 w-44 rounded-md" />
      </div>
    );
  }

  const churchName = church?.name?.trim() || t('noChurch');
  const userName = user?.displayName?.trim() || t('signedOut');

  const handleSignOut = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
      push({
        tone: 'success',
        title: t('signedOutTitle'),
        message: t('seeYouSoon'),
      });
      // Full reload (not router.push) so no signed-in client state survives.
      window.location.assign(new URL('/', window.location.origin));
    } catch (err) {
      push({
        tone: 'danger',
        title: t('signOutFail'),
        message:
          err instanceof ApiError
            ? err.message
            : t('tryAgain'),
      });
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <LocaleSwitcher tone="light" persistProfile />
      <Menu
        align="end"
        label={t('churchMenu')}
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
                {t('churchProfile')}
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
        <MenuLabel>{t('activeChurch')}</MenuLabel>
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
            {t('signedInAs', { name: userName })}
          </p>
        </div>
        <MenuSeparator />
        <MenuItem icon="settings" onClick={() => router.push('/admin/settings')}>
          {t('churchSettings')}
        </MenuItem>
        <MenuItem
          icon="book"
          onClick={() => {
            // Route handler, not a Next page — needs a document navigation.
            window.location.assign(new URL('/api/docs', window.location.origin));
          }}
        >
          {t('apiReference')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon="logout"
          onClick={() => {
            void handleSignOut();
          }}
          disabled={busy}
        >
          {busy ? t('signingOut') : t('signOut')}
        </MenuItem>
      </Menu>
    </div>
  );
}
