import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

/** Visual tone for `<Badge>`. */
export type BadgeTone =
  | 'neutral'
  | 'gold'
  | 'sage'
  | 'sky'
  | 'lavender'
  | 'peach'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/** Props for `<Badge>`. */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** When true, use a solid filled chip instead of the default soft/outline. */
  solid?: boolean;
  children: ReactNode;
}

const SOFT_CLASSES: Record<BadgeTone, string> = {
  neutral:
    'bg-surface-muted text-foreground border border-border',
  gold:
    'bg-brand-gold-tint text-[color:var(--brand-gold-ink)] border border-[color:var(--brand-gold-soft)]',
  sage: 'tone-sage',
  sky: 'tone-sky',
  lavender: 'tone-lavender',
  peach: 'tone-peach',
  success:
    'bg-[color:var(--success-soft)] text-[color:var(--success-ink)]',
  warning:
    'bg-[color:var(--warning-soft)] text-[color:var(--warning-ink)]',
  danger:
    'bg-[color:var(--danger-soft)] text-[color:var(--danger-ink)]',
  info:
    'bg-[color:var(--info-soft)] text-[color:var(--info-ink)]',
};

const SOLID_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-primary text-primary-foreground',
  gold: 'bg-brand-gold text-foreground',
  sage: 'bg-sage text-primary-foreground',
  sky: 'bg-sky text-primary-foreground',
  lavender: 'bg-lavender text-primary-foreground',
  peach: 'bg-peach text-primary-foreground',
  success: 'bg-success text-primary-foreground',
  warning: 'bg-warning text-foreground',
  danger: 'bg-danger text-primary-foreground',
  info: 'bg-info text-primary-foreground',
};

/**
 * Small, non-interactive label. Use for counts, categories, metadata.
 *
 * Status pills with semantic meaning should use `<StatusPill>` instead so
 * the UI exposes status to assistive tech consistently.
 */
export function Badge({
  tone = 'neutral',
  solid = false,
  className,
  children,
  ...rest
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        solid ? SOLID_CLASSES[tone] : SOFT_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
