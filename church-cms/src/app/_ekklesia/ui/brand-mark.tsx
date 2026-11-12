import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from './utils';

/** Where the mark sits — selects light/dark assets for contrast. */
export type BrandSurface = 'light' | 'dark' | 'auto';

/**
 * `symbol` — transparent fish (sidebar, inline chrome).
 * `logo` — squircle app icon (light headers, splash, favicons).
 */
export type BrandMarkVariant = 'symbol' | 'logo';

/** Props for `<BrandMark>`. */
export interface BrandMarkProps {
  /** Pixel size of the mark (square). Defaults to 32. */
  size?: number;
  /** Render the word "Ekklesia" after the mark. */
  withWordmark?: boolean;
  /**
   * Optional church name shown as a second line under the wordmark.
   * Useful in multi-church contexts to make the active tenant obvious.
   */
  subline?: ReactNode;
  /** When set, the mark + wordmark become a single link. */
  href?: string;
  /** Additional classes for the outer element. */
  className?: string;
  /** Hide the wordmark visually but keep accessible text. */
  compact?: boolean;
  /**
   * Asset treatment. Prefer `symbol` on charcoal rails and `logo` on light
   * canvases. Legacy values `app` / `chrome` are still accepted.
   */
  variant?: BrandMarkVariant | 'app' | 'chrome';
  /** Surface contrast. `auto` follows the `.dark` class on `<html>`. */
  surface?: BrandSurface;
  /**
   * @deprecated Use `surface="dark"` instead.
   * Kept so existing call sites keep compiling during the brand cutover.
   */
  tone?: 'default' | 'inverse';
}

const ASSETS = {
  symbol: {
    light: '/branding/ekklesia-symbol-light.svg',
    dark: '/branding/ekklesia-symbol-dark.svg',
  },
  logo: {
    light: '/branding/ekklesia-logo-light.svg',
    dark: '/branding/ekklesia-logo-dark.svg',
  },
} as const;

function resolveVariant(
  variant: BrandMarkProps['variant'],
): BrandMarkVariant {
  if (variant === 'chrome') return 'symbol';
  if (variant === 'app') return 'logo';
  return variant ?? 'logo';
}

function resolveSurface(
  surface: BrandSurface | undefined,
  variant: BrandMarkProps['variant'],
  tone: BrandMarkProps['tone'],
): BrandSurface {
  if (surface) return surface;
  // Legacy: chrome / inverse always sat on charcoal.
  if (variant === 'chrome' || tone === 'inverse') return 'dark';
  if (variant === 'app') return 'light';
  return 'auto';
}

function MarkImage({
  src,
  size,
  className,
}: {
  src: string;
  size: number;
  className?: string;
}): React.ReactElement {
  return (
    // SVG brand marks — next/image adds little value and complicates SVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      decoding="async"
    />
  );
}

/**
 * Official Ekklesia brand mark + optional typeset wordmark.
 *
 * Asset selection is centralized here so shells never pick light/dark paths
 * themselves. Geometry comes from `/public/branding/*` (approved fish + cross).
 */
export function BrandMark({
  size = 32,
  withWordmark = true,
  subline,
  href,
  className,
  compact = false,
  variant = 'logo',
  surface,
  tone = 'default',
}: BrandMarkProps): React.ReactElement {
  const markVariant = resolveVariant(variant);
  const markSurface = resolveSurface(surface, variant, tone);
  const pair = ASSETS[markVariant];
  const inverse = markSurface === 'dark';

  const mark =
    markSurface === 'auto' ? (
      <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
        <MarkImage src={pair.light} size={size} className="dark:hidden" />
        <MarkImage
          src={pair.dark}
          size={size}
          className="absolute inset-0 hidden dark:block"
        />
      </span>
    ) : (
      <MarkImage
        src={markSurface === 'dark' ? pair.dark : pair.light}
        size={size}
      />
    );

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        inverse ? 'text-[color:var(--sidebar-foreground)]' : 'text-foreground',
        className,
      )}
    >
      {mark}
      {withWordmark ? (
        <span className={cn('flex min-w-0 flex-col leading-tight', compact && 'sr-only')}>
          <span
            className={cn(
              'text-base font-semibold tracking-tight',
              'font-[family-name:var(--font-scripture)] not-italic',
            )}
          >
            Ekklesia
          </span>
          {subline ? (
            <span
              className={cn(
                'truncate text-xs',
                inverse
                  ? 'text-[color:var(--sidebar-muted)]'
                  : 'text-muted-foreground',
              )}
            >
              {subline}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="sr-only">Ekklesia</span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="focus-ring rounded-sm" aria-label="Ekklesia home">
        {content}
      </Link>
    );
  }
  return content;
}
