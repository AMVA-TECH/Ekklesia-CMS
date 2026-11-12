import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

/** Semantic status tones for `<StatusPill>`. */
export type StatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'pending';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    'bg-surface-muted text-foreground border-border',
  success:
    'bg-[color:var(--success-soft)] text-[color:var(--success-ink)] border-[color:var(--success-soft)]',
  warning:
    'bg-[color:var(--warning-soft)] text-[color:var(--warning-ink)] border-[color:var(--warning-soft)]',
  danger:
    'bg-[color:var(--danger-soft)] text-[color:var(--danger-ink)] border-[color:var(--danger-soft)]',
  info:
    'bg-[color:var(--info-soft)] text-[color:var(--info-ink)] border-[color:var(--info-soft)]',
  pending:
    'bg-brand-gold-tint text-[color:var(--brand-gold-ink)] border-[color:var(--brand-gold-soft)]',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  success: 'bg-[color:var(--success)]',
  warning: 'bg-[color:var(--warning)]',
  danger: 'bg-[color:var(--danger)]',
  info: 'bg-[color:var(--info)]',
  pending: 'bg-brand-gold',
};

/** Props for `<StatusPill>`. */
export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  /** Hides the leading dot (useful in dense rows). */
  hideDot?: boolean;
  children: ReactNode;
}

/**
 * Pill that communicates the state of a resource (e.g. `draft`, `published`,
 * `overdue`). Always pairs colour with a text label (WCAG 1.4.1).
 */
export function StatusPill({
  tone = 'neutral',
  hideDot = false,
  className,
  children,
  ...rest
}: StatusPillProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {hideDot ? null : (
        <span
          aria-hidden="true"
          className={cn('inline-block h-1.5 w-1.5 rounded-full', DOT_CLASSES[tone])}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
