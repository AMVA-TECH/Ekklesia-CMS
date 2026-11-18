'use client';

import { cn } from '../ui/utils';
import { t, type Locale } from './core';
import { setLocale, useLocale } from './provider';

const OPTIONS: ReadonlyArray<{ value: Locale; short: string; long: string }> = [
  { value: 'sw', short: 'SW', long: 'Kiswahili' },
  { value: 'en', short: 'EN', long: 'English' },
];

/** Compact EN/SW switch for headers. */
export function LanguageToggle({ className }: { className?: string }): React.ReactElement {
  const locale = useLocale();
  return (
    <div
      role="group"
      aria-label={t('Language')}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-border bg-surface p-0.5 text-xs font-semibold',
        className,
      )}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          aria-pressed={locale === o.value}
          aria-label={o.long}
          title={o.long}
          onClick={() => setLocale(o.value)}
          className={cn(
            'inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2 focus-ring',
            locale === o.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
