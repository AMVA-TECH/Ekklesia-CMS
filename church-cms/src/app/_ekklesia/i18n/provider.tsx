'use client';

import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { isLocale, setActiveLocale, type Locale } from './core';

const STORAGE_KEY = 'ek-locale';
const listeners = new Set<() => void>();
/** Preference from the signed-in account, used when nothing was chosen here. */
let preferred: Locale | null = null;

function readStored(): Locale | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const clientSnapshot = (): Locale => readStored() ?? preferred ?? 'en';
// Server and hydration render in English; the stored choice applies right after.
const serverSnapshot = (): Locale => 'en';

/** Choose the UI language on this device (also used by the toggle). */
export function setLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* Private mode: keep it for this session only. */
    preferred = locale;
  }
  notify();
}

/**
 * Apply the account's saved language (e.g. a member's preferred locale)
 * unless this device already has an explicit choice.
 */
export function adoptPreferredLocale(value: string | null | undefined): void {
  const next = value?.toLowerCase().slice(0, 2);
  if (!isLocale(next) || preferred === next) return;
  preferred = next;
  if (readStored() === null) notify();
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

/**
 * Sets the active locale for `t()` and remounts the app subtree when it
 * changes, so every screen re-renders in the new language.
 */
export function I18nProvider({ children }: { children: ReactNode }): React.ReactElement {
  const locale = useLocale();
  setActiveLocale(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <Fragment key={locale}>{children}</Fragment>;
}
