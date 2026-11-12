import type { HTMLAttributes } from 'react';
import { cn } from './utils';

/** Props for `<Skeleton>`. */
export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  /** Height scale. Use a utility class via `className` for custom. */
  size?: 'line' | 'heading' | 'block';
  /** Rounded corners. */
  radius?: 'sm' | 'md' | 'full';
}

const SIZE_CLASSES: Record<NonNullable<SkeletonProps['size']>, string> = {
  line: 'h-3 w-full',
  heading: 'h-5 w-2/3',
  block: 'h-20 w-full',
};

const RADIUS_CLASSES: Record<NonNullable<SkeletonProps['radius']>, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  full: 'rounded-full',
};

/**
 * Low-contrast shimmer placeholder for loading content.
 *
 * Uses a subtle `animate-pulse` + muted surface — no gold/coloured washes.
 * Respects `prefers-reduced-motion`.
 */
export function Skeleton({
  size = 'line',
  radius = 'sm',
  className,
  ...rest
}: SkeletonProps): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse bg-surface-muted motion-reduce:animate-none',
        SIZE_CLASSES[size],
        RADIUS_CLASSES[radius],
        className,
      )}
      {...rest}
    />
  );
}
