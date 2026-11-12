import type { ReactNode } from 'react';
import type { IconName } from '../icons';
import { NavLink } from '../ui/nav-link';

/** A single navigation link row. */
export interface NavItem {
  /** Visible label. */
  label: string;
  /** Optional helper line (admin sidebar only). */
  hint?: string;
  /** Destination URL. */
  href: string;
  /** Leading icon. */
  icon?: IconName;
  /** Right-side slot (badge / count). */
  endSlot?: ReactNode;
  /**
   * Force active treatment. Omit to use pathname-based auto detection
   * (startsWith for non-root, exact for root).
   */
  active?: boolean;
}

/** A grouped collection of nav items. */
export interface NavGroup {
  /** Visible group label (e.g. "Pastoral care"). Empty string hides the heading. */
  label: string;
  items: readonly NavItem[];
}

/** Props for `<RoleNav>`. */
export interface RoleNavProps {
  /** Groups to render. Order is preserved. */
  groups: readonly NavGroup[];
  /** Accessible label for the `<nav>` landmark. */
  ariaLabel?: string;
  /** Variant to pass to each `<NavLink>` (`sidebar` by default). */
  variant?: 'sidebar' | 'topbar';
  /** Extra classes for the outer `<nav>`. */
  className?: string;
}

/**
 * Data-driven navigation renderer shared by all shells.
 *
 * FundFlow-style grouped nav, rebuilt in React with Ekklesia’s gold active
 * pill. Callers build groups per role — this component is role-agnostic.
 */
export function RoleNav({
  groups,
  ariaLabel = 'Primary',
  variant = 'sidebar',
  className,
}: RoleNavProps): React.ReactElement {
  return (
    <nav aria-label={ariaLabel} className={className ?? 'flex flex-col'}>
      {groups.map((group, i) => (
        <div
          key={`${group.label}-${i}`}
          className={variant === 'sidebar' ? 'px-2 pt-4 first:pt-2' : 'px-0'}
        >
          {variant === 'sidebar' && group.label ? (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--sidebar-muted)]">
              {group.label}
            </p>
          ) : null}
          <div
            className={
              variant === 'sidebar' ? 'flex flex-col gap-0.5' : 'flex items-center gap-1'
            }
          >
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                hint={variant === 'sidebar' ? item.hint : undefined}
                endSlot={item.endSlot}
                active={item.active}
                variant={variant}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
