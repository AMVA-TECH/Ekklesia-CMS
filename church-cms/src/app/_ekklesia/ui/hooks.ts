'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const noopSubscribe = (): (() => void) => () => {};

/**
 * `false` during SSR and hydration, `true` once rendering on the client.
 *
 * Use for output that must differ between server and client (portals that
 * need `document`, time-of-day text) without a `setMounted(true)` effect,
 * which causes a cascading render.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Object URL for a local `File` / `Blob` preview (e.g. an image picked in a
 * form). Returns `null` when `blob` is null or before the URL is ready.
 *
 * The URL is revoked when `blob` changes or the component unmounts, and the
 * create/revoke pair lives in one effect so React StrictMode's dev
 * mount → unmount → mount cycle never leaves a revoked URL on screen.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(
    null,
  );

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    let active = true;
    // Publish asynchronously so the effect body does not setState directly.
    void Promise.resolve().then(() => {
      if (active) setEntry({ blob, url });
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return blob && entry?.blob === blob ? entry.url : null;
}
