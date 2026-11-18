'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/** Keeps `<html lang>` aligned with the active UI locale. */
export function HtmlLang(): null {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
