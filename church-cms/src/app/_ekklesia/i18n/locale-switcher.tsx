'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import { cn } from '@/app/_ekklesia/ui/utils';
import {
  APP_LOCALES,
  type AppLocale,
  isAppLocale,
} from '@/i18n/config';

export interface LocaleSwitcherProps {
  className?: string;
  /** Visual tone for dark landing / light chrome. */
  tone?: 'light' | 'dark';
  /** When set, also PATCH `/api/v1/people/me` with preferredLocale (signed-in). */
  persistProfile?: boolean;
}

/**
 * Compact EN | SW control. Sets locale cookie then hard-reloads.
 * Soft `router.refresh()` under Cache Components can hydrate the wrong catalog.
 */
export function LocaleSwitcher({
  className,
  tone = 'light',
  persistProfile = false,
}: LocaleSwitcherProps): React.ReactElement {
  const t = useTranslations('Locale');
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const active = isAppLocale(locale) ? locale : 'sw';

  async function select(next: AppLocale): Promise<void> {
    if (next === active || pending) return;
    setPending(true);

    try {
      const cookieRes = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      if (!cookieRes.ok) {
        setPending(false);
        return;
      }

      if (persistProfile) {
        try {
          // apiFetch attaches session / x-dev-* headers; bare fetch 403'd and
          // left preferredLocale stale so the next /auth/me sync undid the cookie.
          await apiFetch('/api/v1/people/me', {
            method: 'PATCH',
            json: { preferredLocale: next },
          });
        } catch {
          // Cookie still applied; profile sync can retry from settings.
        }
      }

      window.location.reload();
    } catch {
      setPending(false);
    }
  }

  return (
    <div
      role="group"
      aria-label={t('switchTo')}
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full border p-0.5 text-xs font-medium',
        tone === 'dark'
          ? 'border-white/20 bg-black/35 text-white/70'
          : 'border-border bg-surface text-muted-foreground',
        pending && 'opacity-70',
        className,
      )}
    >
      {APP_LOCALES.map((code) => {
        const selected = code === active;
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            aria-pressed={selected}
            onClick={() => {
              void select(code);
            }}
            className={cn(
              'rounded-full px-2.5 py-1 transition-colors focus-ring',
              selected
                ? tone === 'dark'
                  ? 'bg-white/15 text-white'
                  : 'bg-foreground/90 text-background'
                : tone === 'dark'
                  ? 'hover:text-white'
                  : 'hover:text-foreground',
            )}
          >
            {code === 'en' ? 'EN' : 'SW'}
            <span className="sr-only"> — {t(code)}</span>
          </button>
        );
      })}
    </div>
  );
}
