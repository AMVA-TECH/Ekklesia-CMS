import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

/** Props for `<PageHeader>`. */
export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Page title (rendered as an `<h1>`). */
  title: ReactNode;
  /** Optional body copy ("lede") under the title. */
  lede?: ReactNode;
  /** Optional slot above the title (breadcrumbs, back link, context chip). */
  eyebrow?: ReactNode;
  /** Right-aligned actions (buttons, filters). */
  actions?: ReactNode;
}

/**
 * Standard page title row.
 *
 * Shared between admin and member shells. Reserved for the main `<h1>` on a
 * page — nested sections should use `<Panel title>` or `<CardTitle>` instead.
 */
export function PageHeader({
  title,
  lede,
  eyebrow,
  actions,
  className,
  ...rest
}: PageHeaderProps): React.ReactElement {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 pb-4 border-b border-border md:flex-row md:items-end md:justify-between',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {lede ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{lede}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
