'use client';

import type { ReactNode } from 'react';
import type { IconName } from '../icons';
import { NavLink } from '../ui/nav-link';
import { cn } from '../ui/utils';

/** A single bottom-nav destination. */
export interface BottomNavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Optional count/alert slot (e.g. unread badge). */
  endSlot?: ReactNode;
  active?: boolean;
}

/** Props for `<BottomNav>`. */
export interface BottomNavProps {
  items: readonly BottomNavItem[];
  /** Show on `< md` by default; override via `className`. */
  className?: string;
}

/**
 * Phone-first bottom tab bar for the member shell.
 *
 * Matches the Ekklesia "gold dot indicator" active treatment. Hidden on
 * desktop widths; member screens typically use a top sticky header there.
 */
export function BottomNav({ items, className }: BottomNavProps): React.ReactElement {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky bottom-0 z-30 flex items-stretch border-t border-border bg-surface md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {items.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          active={item.active}
          variant="bottom"
          endSlot={item.endSlot}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
