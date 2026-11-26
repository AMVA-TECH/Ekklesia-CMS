'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Sync an area tab with `?tab=` (or bare path for the default tab).
 * Matches RentFlow: ConsoleHeader links and in-page state stay aligned.
 */
export function useConsoleTab<T extends string>(
  allowed: readonly T[],
  defaultTab: T,
): [T, (next: T) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = useMemo(() => {
    const raw = searchParams.get('tab');
    if (raw && (allowed as readonly string[]).includes(raw)) {
      return raw as T;
    }
    return defaultTab;
  }, [allowed, defaultTab, searchParams]);

  const setTab = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === defaultTab) {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [defaultTab, pathname, router, searchParams],
  );

  return [tab, setTab];
}
