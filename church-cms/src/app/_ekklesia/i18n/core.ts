/**
 * Ekklesia UI translation core (English source, Swahili translation).
 *
 * - UI text is written in English and wrapped in `t('…')`. The English text
 *   is the key; `sw.ts` maps it to Swahili. Anything without a Swahili entry
 *   falls back to English, so screens never show blanks or raw keys.
 * - Placeholders `{0}`, `{1}`… are filled from the extra arguments, so the
 *   Swahili wording can reorder them.
 * - `tk('…')` marks text that is defined outside render (module constants)
 *   so the coverage test can find it; translate it where it is rendered with
 *   `t(value)`.
 *
 * Plain module (no 'use client') so server code can import it; the active
 * locale is set by `I18nProvider` on the client.
 */
import type { ReactNode } from 'react';
import { sw } from './sw';

export const LOCALES = ['en', 'sw'] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'sw';
}

let active: Locale = 'en';

/** Set by the provider during render, before children render. */
export function setActiveLocale(locale: Locale): void {
  active = locale;
}

export function getActiveLocale(): Locale {
  return active;
}

/** BCP 47 tag for Intl date/number formatting. */
export function intlLocale(): string {
  return active === 'sw' ? 'sw-TZ' : 'en-GB';
}

type Arg = string | number | null | undefined;

function fill(text: string, args: ReadonlyArray<Arg>): string {
  if (args.length === 0) return text;
  return text.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = args[Number(index)];
    return value === undefined || value === null ? '' : String(value);
  });
}

/** Translate English UI text into the active locale. */
export function t(text: string | null | undefined, ...args: ReadonlyArray<Arg>): string {
  if (text === null || text === undefined) return '';
  const translated = active === 'sw' ? (sw[text] ?? text) : text;
  return fill(translated, args);
}

/** Translate a rich label only when it is plain text (elements pass through). */
export function tn(node: ReactNode): ReactNode {
  return typeof node === 'string' ? t(node) : node;
}

/** Mark English UI text defined outside render for the coverage test. */
export function tk<T extends string>(text: T): T {
  return text;
}
