'use client';

import { useState, type ReactNode } from 'react';
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
        centerSlot={topbarCenter}
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
