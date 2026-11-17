'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Icon } from '../icons';
import { BrandMark } from '../ui/brand-mark';
import { SkipLink } from '../ui/skip-link';
import { cn } from '../ui/utils';
import { AppFooter, type AppFooterProps } from './app-footer';
import { BottomNav, type BottomNavItem } from './bottom-nav';
import { MobileDrawer } from './mobile-drawer';
import type { NavGroup } from './role-nav';
import { Topbar } from './topbar';

/** Props for `<MemberShell>`. */
export interface MemberShellProps {
  /**
   * Nav groups shown in the overflow drawer on mobile and as a horizontal
   * strip under the topbar on desktop. Keep groups shallow (1–2 items).
   */
  drawerGroups: readonly NavGroup[];
  /** Phone-first bottom tabs (4 items recommended, max 5). */
  bottomItems: readonly BottomNavItem[];
  /**
   * Links in the desktop (lg+) top bar, where neither the bottom nav nor the
   * drawer button is shown. Defaults to the bottom nav items.
   */
  desktopItems?: readonly BottomNavItem[];
  /** Topbar right slot (notifications, account). */
  topbarEnd?: ReactNode;
  /** Optional centred slot (e.g. church name chip). */
  topbarCenter?: ReactNode;
  /** Sticky banner above the topbar (e.g. "Giving pledge due"). */
  banner?: ReactNode;
  /** Church name for the drawer brand subline. */
  churchName?: string;
  /** Footer customisation. */
  footerProps?: AppFooterProps;
  children: ReactNode;
}

/**
 * Member-facing shell.
 *
 * - Phones: topbar + content + sticky bottom nav + off-canvas drawer.
 * - Desktop: topbar + content + footer. The drawer groups become secondary
 *   links collapsed behind the hamburger (members don't need a dense rail).
 */
export function MemberShell({
  drawerGroups,
  bottomItems,
  desktopItems,
  topbarEnd,
  topbarCenter,
  banner,
  churchName,
  footerProps,
  children,
}: MemberShellProps): React.ReactElement {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink />
      {banner ? <div className="border-b border-border bg-surface">{banner}</div> : null}
      <Topbar
        onOpenDrawer={() => setDrawerOpen(true)}
        endSlot={topbarEnd}
        centerSlot={topbarCenter ?? <DesktopNav items={desktopItems ?? bottomItems} />}
        variant="member"
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'flex-1 outline-none',
          'px-4 py-5 sm:px-6 sm:py-6',
          'pb-24 md:pb-6',
        )}
      >
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
      <AppFooter className="hidden md:block" {...footerProps} />
      <BottomNav items={bottomItems} />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={drawerGroups}
        churchName={churchName}
      />
    </div>
  );
}

/** lg+ member navigation: brand mark plus a row of primary links. */
function DesktopNav({ items }: { items: readonly BottomNavItem[] }): React.ReactElement {
  const pathname = usePathname() ?? '';
  return (
    <div className="flex min-w-0 flex-1 items-center gap-6">
      <BrandMark href="/home" size={28} variant="symbol" surface="light" />
      <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const active =
            item.href === '/home' ? pathname === '/home' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium focus-ring',
                active
                  ? 'text-foreground after:absolute after:inset-x-3 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-brand-gold'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )}
            >
              {item.icon ? <Icon name={item.icon} size={16} /> : null}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
