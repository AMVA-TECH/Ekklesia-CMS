'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import { t } from '@/app/_ekklesia/i18n/core';

/** Session-wide cache: personId → display name (or a promise in flight). */
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function fetchName(id: string): Promise<string> {
  const known = cache.get(id);
  if (known) return Promise.resolve(known);
  const pending = inflight.get(id);
  if (pending) return pending;
  const request = apiFetch<{ displayName?: string }>(`/api/v1/people/${id}`)
    .then((p) => p.displayName || t('Unknown person'))
    .catch(() => t('Unknown person'))
    .then((name) => {
      cache.set(id, name);
      inflight.delete(id);
      return name;
    });
  inflight.set(id, request);
  return request;
}

/**
 * Resolve display names for person ids returned by list endpoints that only
 * carry `personId`. Names are cached for the session; unknown ids render as
 * `undefined` until loaded.
 */
export function usePeopleNames(
  ids: ReadonlyArray<string | null | undefined>,
): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = Array.from(new Set(ids.filter((x): x is string => !!x)))
    .sort()
    .join(',');

  useEffect(() => {
    if (!key) return;
    let active = true;
    void Promise.all(
      key.split(',').map(async (id) => [id, await fetchName(id)] as const),
    ).then((pairs) => {
      if (active) setNames(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
  }, [key]);

  return names;
}
