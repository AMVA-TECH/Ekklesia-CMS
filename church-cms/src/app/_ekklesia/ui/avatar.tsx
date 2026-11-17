'use client';

import { useState, type HTMLAttributes } from 'react';
import { cn, initialsFromName, stableIndex } from './utils';

/** Props for `<Avatar>`. */
export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Full name used to derive initials + deterministic tone. */
  name: string;
  /**
   * Optional image URL (e.g. church organisation logo).
   * Person avatars stay initials-only by default — pass `src` only for
   * organisation marks that intentionally use uploaded media.
   */
  src?: string | null;
  /** Size scale. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Force a tone instead of the deterministic one.
   * - `brand`: champagne gradient (reserved for current-user hero).
   * - `charcoal`: inverse treatment.
   */
  tone?: 'auto' | 'brand' | 'charcoal';
  /** Add a subtle ring (useful over busy backgrounds). */
  ring?: boolean;
  /** Mark decorative — do not announce name to screen readers. */
  decorative?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[11px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

/**
 * No tones use raw hex — they combine Ekklesia tone utilities (sage, sky, …)
 * and the gold tint. Deterministic from the name so the same person always
 * gets the same tile.
 */
const AUTO_TONE_CLASSES = [
  'tone-sage',
  'tone-sky',
  'tone-lavender',
  'tone-peach',
  'tone-gold',
] as const;

/**
 * Initials avatar with optional organisation image.
 *
 * Person tiles stay initials-only (see `docs/04-security.md`). Church logos
 * may pass `src` from authorised media content URLs.
 *
 * ```tsx
 * <Avatar name="Ada Noah" size="md" />
 * <Avatar name="CrossLife" src={church.logoUrl} size="sm" />
 * ```
 */
export function Avatar({
  name,
  src,
  size = 'md',
  tone = 'auto',
  ring = false,
  decorative = false,
  className,
  ...rest
}: AvatarProps): React.ReactElement {
  const [imageFailed, setImageFailed] = useState(false);
  // Retry the image when `src` changes (adjusted during render, not in an
  // effect).
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setImageFailed(false);
  }
  const initials = initialsFromName(name);
  const showImage = Boolean(src) && !imageFailed;
  const toneClass =
    tone === 'brand'
      ? 'bg-gold-gradient text-foreground'
      : tone === 'charcoal'
        ? 'bg-primary text-primary-foreground'
        : AUTO_TONE_CLASSES[stableIndex(name, AUTO_TONE_CLASSES.length)];

  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold',
        SIZE_CLASSES[size],
        !showImage && toneClass,
        showImage && 'bg-surface-muted',
        ring && 'ring-2 ring-surface',
        className,
      )}
      {...rest}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- authorised media URL, not a static asset
        <img
          src={src ?? undefined}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
