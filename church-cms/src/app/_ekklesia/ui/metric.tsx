import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { cn } from './utils';

/** Supporting tone for the tinted metric tile (mockup pastel cards). */
export type MetricTone = 'sage' | 'sky' | 'lavender' | 'peach' | 'gold' | 'neutral';

const TILE_SURFACE: Record<MetricTone, string> = {
  sage: 'border-transparent bg-[color:var(--sage-soft)]',
  sky: 'border-transparent bg-[color:var(--sky-soft)]',
  lavender: 'border-transparent bg-[color:var(--lavender-soft)]',
  peach: 'border-transparent bg-[color:var(--peach-soft)]',
  gold: 'border-transparent bg-[color:var(--brand-gold-tint)]',
  neutral: 'border-border bg-surface',
};

const ICON_TONE: Record<MetricTone, string> = {
  sage: 'tone-sage',
  sky: 'tone-sky',
  lavender: 'tone-lavender',
  peach: 'tone-peach',
  gold: 'tone-gold',
  neutral: 'bg-surface-muted text-muted-foreground',
};

/** Props for `<Metric>`. */
export interface MetricProps extends HTMLAttributes<HTMLElement> {
  /** Short, unit-free label (e.g. "Active members"). */
  label: ReactNode;
  /** Value (string so callers can pre-format currency/numbers). */
  value: ReactNode;
  /** Optional unit (rendered small, next to the value). */
  unit?: ReactNode;
  /** Optional hint / timeframe under the value. */
  hint?: ReactNode;
  /** Icon shown in the tone-tinted chip. */
  icon?: IconName;
  /** Tone of the tile + icon chip. Defaults to `neutral`. */
  tone?: MetricTone;
  /** Make the entire card a link. */
  href?: string;
  /** Delta row below the value (e.g. "+3 this week"). */
  change?: ReactNode;
  /** Direction of the change — switches arrow + colour. */
  changeDirection?: 'up' | 'down' | 'flat';
}

const CHANGE_CLASSES: Record<NonNullable<MetricProps['changeDirection']>, string> = {
  up: 'text-[color:var(--success-ink)]',
  down: 'text-[color:var(--danger-ink)]',
  flat: 'text-muted-foreground',
};

/**
 * KPI tile: tinted soft surface (mockup), large number, optional icon chip.
 */
export function Metric({
  label,
  value,
  unit,
  hint,
  icon,
  tone = 'neutral',
  href,
  change,
  changeDirection = 'flat',
  className,
  ...rest
}: MetricProps): React.ReactElement {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              ICON_TONE[tone],
            )}
            aria-hidden="true"
          >
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[1.75rem]">
        <span>{value}</span>
        {unit ? (
          <span className="text-sm font-medium text-muted-foreground">{unit}</span>
        ) : null}
      </p>
      {change ? (
        <p
          className={cn(
            'mt-1 inline-flex items-center gap-1 text-xs font-medium',
            CHANGE_CLASSES[changeDirection],
          )}
        >
          {changeDirection === 'up' ? (
            <Icon name="trending-up" size={14} />
          ) : changeDirection === 'down' ? (
            <Icon name="trending-down" size={14} />
          ) : null}
          <span>{change}</span>
        </p>
      ) : null}
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  const classes = cn(
    'block rounded-2xl border p-5 shadow-card',
    TILE_SURFACE[tone],
    href &&
      'transition-colors hover:brightness-[0.98] focus-ring motion-reduce:transition-none',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...(rest as object)}>
        {content}
      </Link>
    );
  }
  return (
    <article className={classes} {...rest}>
      {content}
    </article>
  );
}
