import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { cn } from './utils';
import type { MetricTone } from './metric';

const TONE_CLASSES: Record<MetricTone, string> = {
  sage: 'tone-sage',
  sky: 'tone-sky',
  lavender: 'tone-lavender',
  peach: 'tone-peach',
  gold: 'tone-gold',
  neutral: 'bg-surface-muted text-muted-foreground',
};

/** Props for `<EmptyState>`. */
export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Supporting icon in the tinted tile. */
  icon?: IconName;
  /** Tone of the icon tile. */
  tone?: MetricTone;
  /** Short, encouraging title. */
  title: ReactNode;
  /** Body copy — one sentence, no trailing CTA (use `action`). */
  description?: ReactNode;
  /** Primary + optional secondary buttons/links. */
  action?: ReactNode;
}

/**
 * Empty state for lists, tables, and dashboards.
 *
 * Follows the brief: no gold flood, warm but calm, phones-friendly spacing.
 */
export function EmptyState({
  icon = 'book',
  tone = 'gold',
  title,
  description,
  action,
  className,
  ...rest
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-flex h-14 w-14 items-center justify-center rounded-xl',
          TONE_CLASSES[tone],
        )}
        aria-hidden="true"
      >
        <Icon name={icon} size={24} />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2 flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
