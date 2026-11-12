import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

/** Props for `<Card>`. */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding density. `md` = 24px; `sm` = 16px; `lg` = 32px. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Toggle a hover state (gentle elevation + border tint).
   * Useful for cards that act as entire link targets.
   */
  interactive?: boolean;
  /** Toggle a subtle shadow in addition to the border. */
  shadow?: boolean;
  children?: ReactNode;
}

const PADDING_CLASSES: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * Standard white card: 12px radius, thin border, minimal shadow.
 *
 * Avoid white-on-white without a border; cards always carry `border-border`.
 */
export function Card({
  padding = 'md',
  interactive = false,
  shadow = false,
  className,
  children,
  ...rest
}: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface text-surface-foreground',
        PADDING_CLASSES[padding],
        shadow && 'shadow-card',
        interactive &&
          'transition-colors hover:border-foreground/15 hover:bg-surface-muted/60 motion-reduce:transition-none',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Thin heading area for a `<Card>`. */
export function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 pb-3 mb-3 border-b border-border',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Semantic card title. Use with `CardHeader`. */
export function CardTitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return (
    <h3
      className={cn('text-base font-semibold text-foreground', className)}
      {...rest}
    >
      {children}
    </h3>
  );
}

/** Supporting line under a card title. */
export function CardSubtitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>): React.ReactElement {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...rest}>
      {children}
    </p>
  );
}
