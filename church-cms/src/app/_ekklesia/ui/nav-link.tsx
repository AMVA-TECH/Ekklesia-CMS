'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { cn } from './utils';

/** Props for `<NavLink>`. */
export interface NavLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  /** Visible label. */
  children: ReactNode;
  /** Short helper line under the label (sidebar context only). */
  hint?: ReactNode;
  /** Leading icon from the Ekklesia icon set. */
  icon?: IconName;
  /** Trailing count/badge area. */
  endSlot?: ReactNode;
  /**
   * How to decide the active state against the current pathname.
   * - `exact`: active only when pathnames match exactly.
   * - `startsWith`: active when the current path starts with `href`.
   * Defaults to `startsWith` with `href === '/'` fallback to exact.
   */
  matchMode?: 'exact' | 'startsWith';
  /** Override the computed active state. */
  active?: boolean;
  /** Visual density / treatment. */
  variant?: 'sidebar' | 'bottom' | 'topbar';
  className?: string;
}

const SIDEBAR_CLASSES =
  'group relative flex items-start gap-3 rounded-xl px-3 py-2.5 min-h-[44px] ' +
  'text-sm text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-foreground)] focus-ring ' +
  'motion-reduce:transition-none transition-colors';

const BOTTOM_CLASSES =
  'group relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ' +
  'text-[11px] font-medium text-muted-foreground min-h-[48px] focus-ring ';

const TOPBAR_CLASSES =
  'group inline-flex items-center gap-2 rounded-md px-3 py-2 ' +
  'text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring';

/**
 * Nav link with mockup-aligned treatments.
 *
 * - Sidebar: champagne-gold active pill on charcoal rail.
 * - Bottom-nav: gold label + icon when active.
 * - Topbar: muted underline treatment.
 */
export function NavLink({
  href,
  children,
  hint,
  icon,
  endSlot,
  matchMode = 'startsWith',
  active: activeProp,
  variant = 'sidebar',
  className,
  ...rest
}: NavLinkProps): React.ReactElement {
  const pathname = usePathname() ?? '';
  const hrefStr = typeof href === 'string' ? href : (href?.pathname ?? '');
  const isRoot = hrefStr === '/';
  const computed =
    matchMode === 'exact' || isRoot
      ? pathname === hrefStr
      : pathname === hrefStr || pathname.startsWith(`${hrefStr}/`);
  const isActive = activeProp ?? computed;

  if (variant === 'bottom') {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          BOTTOM_CLASSES,
          isActive && 'text-[color:var(--brand-gold-ink)]',
          className,
        )}
        {...rest}
      >
        <span className="relative inline-flex h-6 items-center justify-center">
          {icon ? (
            <Icon
              name={icon}
              size={22}
              className={isActive ? 'text-[color:var(--brand-gold-strong)]' : undefined}
            />
          ) : null}
          {isActive ? (
            <span
              aria-hidden="true"
              className="absolute -top-1.5 h-1 w-1 rounded-full bg-brand-gold"
            />
          ) : null}
        </span>
        <span className="leading-tight">{children}</span>
      </Link>
    );
  }

  if (variant === 'topbar') {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          TOPBAR_CLASSES,
          isActive && 'text-foreground bg-surface-muted',
          className,
        )}
        {...rest}
      >
        {icon ? <Icon name={icon} size={16} /> : null}
        <span>{children}</span>
        {endSlot}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        SIDEBAR_CLASSES,
        isActive &&
          'bg-gold-gradient font-semibold text-[color:var(--sidebar-active-foreground)] shadow-sm',
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center',
            isActive
              ? 'text-[color:var(--sidebar-active-foreground)]'
              : 'text-[color:var(--sidebar-muted)] group-hover:text-[color:var(--sidebar-foreground)]',
          )}
          aria-hidden="true"
        >
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{children}</span>
        {hint ? (
          <span
            className={cn(
              'mt-0.5 block text-xs truncate',
              isActive
                ? 'text-[color:var(--sidebar-active-foreground)]/70'
                : 'text-[color:var(--sidebar-muted)]',
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
      {endSlot ? <span className="ml-auto shrink-0">{endSlot}</span> : null}
    </Link>
  );
}
