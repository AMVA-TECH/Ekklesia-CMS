import { useId, type HTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '../icons';
import { cn } from './utils';

/** Props for `<Panel>`. */
export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Visible heading (becomes the `aria-labelledby` target). */
  title: ReactNode;
  /** Optional supporting line under the title. */
  subtitle?: ReactNode;
  /** Optional "View all" link rendered on the right of the header. */
  linkHref?: string;
  /** Label for `linkHref`. Defaults to "View all". */
  linkLabel?: string;
  /** Right-aligned action area (replaces the link when both are provided). */
  actions?: ReactNode;
  /**
   * Render body with no inner padding. Useful when the body is a `<Table>`
   * or a list of divided rows.
   */
  flush?: boolean;
  children?: ReactNode;
}

/**
 * Section wrapper with a titled header + body. A `<Panel>` is the admin-shell
 * equivalent of a `<Card>` with a sticky section heading. Always rendered as
 * a `<section>` with `aria-labelledby` for landmark navigation.
 */
export function Panel({
  title,
  subtitle,
  linkHref,
  linkLabel = 'View all',
  actions,
  flush = false,
  className,
  children,
  ...rest
}: PanelProps): React.ReactElement {
  const reactId = useId();
  const titleId = `panel-${reactId}`;
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'overflow-hidden rounded-card border border-border bg-surface shadow-card',
        className,
      )}
      {...rest}
    >
      <header
        className={cn(
          'flex items-start justify-between gap-4 border-b border-border px-5 py-4',
        )}
      >
        <div className="min-w-0">
          <h2
            id={titleId}
            className="text-base font-semibold text-foreground truncate"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : linkHref ? (
          <Link
            href={linkHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-[color:var(--brand-gold-ink)] focus-ring rounded-sm"
          >
            {linkLabel}
            <Icon name="chevron-right" size={16} />
          </Link>
        ) : null}
      </header>
      <div className={cn(flush ? '' : 'px-5 py-4')}>{children}</div>
    </section>
  );
}
