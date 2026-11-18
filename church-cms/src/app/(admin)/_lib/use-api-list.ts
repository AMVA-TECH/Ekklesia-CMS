'use client';

import { useCallback, useState } from 'react';
import { apiFetch, useLoadEffect } from '@/app/_ekklesia/session';
import { errorMessage } from './errors';
import { asList } from './list';
import { t } from '@/app/_ekklesia/i18n/core';

export interface ApiList<T> {
  items: T[];
  loading: boolean;
  /** Load error, or `null`. A 403 is reported as `forbidden` instead. */
  error: string | null;
  /** The caller lacks permission for this list. */
  forbidden: boolean;
  reload: () => Promise<void>;
}

/**
 * Load a `GET` list endpoint (`T[]` or `{ data: T[] }`) and keep it in state.
 * Pass `null` to skip loading (e.g. until a filter is chosen). The list
 * reloads whenever `url` changes; call `reload()` after a mutation.
 */
export function useApiList<T>(url: string | null): ApiList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    if (url === null) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<T[] | { data: T[] }>(url);
      setItems(asList(payload));
      setForbidden(false);
    } catch (err) {
      setItems([]);
      const status = (err as { status?: number }).status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setError(errorMessage(err, t('Unable to load this list.')));
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  useLoadEffect(reload);

  return { items, loading, error, forbidden, reload };
}
