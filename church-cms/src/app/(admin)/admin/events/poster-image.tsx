'use client';

import { useEffect, useState } from 'react';
import {
  isDevAuthAllowed,
  readDevHeaders,
} from '@/app/_ekklesia/session';
import { Icon, type IconName } from '@/app/_ekklesia/icons';

interface PosterImageProps {
  /** URL of the poster — typically the signed media URL from `posterUrl`. */
  url: string | null;
  alt: string;
  className?: string;
  emptyIcon?: IconName;
}

/**
 * Display an authenticated poster image.
 *
 * Posters live behind the same credentialed `/api/v1/media/*` route the rest
 * of the admin uses, so we fetch the blob with `credentials: 'include'` and
 * dev-auth headers (when enabled), then turn it into an `objectURL`. This
 * mirrors the original `/admin/events` implementation but routes dev identity
 * through the shared helpers rather than hardcoded headers.
 */
export function PosterImage({
  url,
  alt,
  className,
  emptyIcon = 'image',
}: PosterImageProps): React.ReactElement {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(null);
    setFailed(false);
    if (!url) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const headers = isDevAuthAllowed()
          ? new Headers(readDevHeaders())
          : undefined;
        const res = await fetch(url, {
          credentials: 'include',
          headers,
        });
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!url || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-surface-muted text-muted-foreground ${className ?? ''}`}
      >
        <Icon name={emptyIcon} size={28} />
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-surface-muted text-muted-foreground ${className ?? ''}`}
        aria-busy="true"
      >
        <Icon name="loader" size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
