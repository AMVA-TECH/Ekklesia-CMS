'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';

/**
 * Best-effort `id → name` map from a list endpoint (e.g. ministries, funds),
 * for labelling rows that only carry an id. Fails quietly (empty map) when
 * the member can't read the list, so callers render a friendly fallback.
 */
export function useNameLookup(url: string): ReadonlyMap<string, string> {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(() => new Map());
  useEffect(() => {
    let active = true;
    apiFetch<Array<{ id: string; name: string }> | { data: Array<{ id: string; name: string }> }>(url)
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
        if (active) setNames(new Map(rows.map((r) => [r.id, r.name])));
      })
      .catch(() => {
        /* No access or offline: keep the fallback labels. */
      });
    return () => {
      active = false;
    };
  }, [url]);
  return names;
}
