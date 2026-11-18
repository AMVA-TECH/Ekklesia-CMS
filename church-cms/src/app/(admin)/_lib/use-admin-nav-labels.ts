'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_ADMIN_NAV_LABELS,
  type AdminNavLabels,
} from './admin-nav-labels';

const NAV_KEYS = Object.keys(DEFAULT_ADMIN_NAV_LABELS) as Array<
  keyof typeof DEFAULT_ADMIN_NAV_LABELS
>;

/** Build sidebar labels from the `AdminNav` message catalog. */
export function useAdminNavLabels(): AdminNavLabels {
  const t = useTranslations('AdminNav');
  return useMemo(() => {
    const out: Partial<Record<keyof AdminNavLabels, string>> = {};
    for (const key of NAV_KEYS) {
      out[key] = t(key);
    }
    return out as AdminNavLabels;
  }, [t]);
}
