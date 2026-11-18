'use client';

import { cn } from '@/app/_ekklesia/ui/utils';
import { EkklesiaBrandMark } from './ekklesia-brand-mark';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
import './brand-motion.css';

export type EkklesiaLoaderSize = 'sm' | 'md' | 'lg';

export interface EkklesiaLoaderProps {
  size?: EkklesiaLoaderSize;
  /** Accessible status label. */
  label?: string;
  className?: string;
  /** Surface behind the loader — picks mark contrast. */
  tone?: 'dark' | 'light';
}

const SIZE_PX: Record<EkklesiaLoaderSize, number> = {
  sm: 40,
  md: 64,
  lg: 96,
};

/**
 * Lightweight, reusable Ekklesia logo loader.
 * Calm glow/pulse (or static mark when reduced-motion is preferred).
 */
export function EkklesiaLoader({
  size = 'md',
  label = 'Loading…',
  className,
  tone = 'light',
}: EkklesiaLoaderProps): React.ReactElement {
  const reduced = usePrefersReducedMotion();
  const px = SIZE_PX[size];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'ek-loader inline-flex flex-col items-center justify-center gap-3',
        reduced && 'ek-loader--reduced',
        className,
      )}
    >
      <span className="ek-loader-stage relative inline-flex items-center justify-center">
        <span className="ek-loader-glow" aria-hidden="true" />
        <span className="ek-loader-sweep" aria-hidden="true" />
        <EkklesiaBrandMark
          size={px}
          mode="static"
          tone={tone}
          className="ek-loader-mark relative z-[1]"
        />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
