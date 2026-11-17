'use client';

import { useEffect } from 'react';

/**
 * Run an async loader when the component mounts and whenever `load`
 * changes identity (i.e. its `useCallback` deps change).
 *
 * Loaders typically flip `loading` / `error` state before awaiting the
 * request. Calling them synchronously inside an effect body causes a
 * cascading re-render (`react-hooks/set-state-in-effect`), so the call is
 * deferred to a microtask. The deferral is cancelled on cleanup, which also
 * drops the duplicate request React StrictMode makes on its mount → unmount
 * → mount dev cycle.
 *
 * Keep calling `load()` directly from event handlers (Refresh buttons,
 * after a mutation) — this hook only covers the effect-driven load.
 */
export function useLoadEffect(load: () => unknown): void {
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
}
