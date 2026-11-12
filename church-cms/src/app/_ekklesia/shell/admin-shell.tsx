'use client';

import { useState, type ReactNode } from 'react';
import { SkipLink } from '../ui/skip-link';
import { cn } from '../ui/utils';
import { AppFooter, type AppFooterProps } from './app-footer';
import { MobileDrawer } from './mobile-drawer';
import type { NavGroup } from './role-nav';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

/** Props for `<AdminShell>`. */
export interface AdminShellProps {
  /** Role-aware nav groups (owner: the admin route group's layout). */
  groups: readonly NavGroup[];
  /** Active church name for the sidebar + drawer brand subline. */
  churchName?: string;
  /** Slot rendered on the right side of the topbar (e.g. account menu). */
  topbarEnd?: ReactNode;
  /** Slot rendered in the middle of the topbar on `lg+` viewports. */
  topbarCenter?: ReactNode;
  /** Optional sticky banner above the topbar (e.g. "System admin mode"). */
  banner?: ReactNode;
  /** Optional slot below the sidebar nav (account summary, build info). */
  sidebarFooter?: ReactNode;
  /** Footer customisation. */
  footerProps?: AppFooterProps;
  /** Page content. Rendered inside a centred main region. */
  children: ReactNode;
}

/**
 * Desktop-dense admin shell: sticky sidebar + topbar + main + footer.
 *
 * Phones use the hamburger button to open `<MobileDrawer>` with the same
 * navigation data. The shell never hardcodes nav items — pass `groups`.
 */
export function AdminShell({
  groups,
  churchName,
  topbarEnd,
  topbarCenter,
  banner,
  sidebarFooter,
  footerProps,
  children,
}: AdminShellProps): React.ReactElement {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <SkipLink />
      <Sidebar groups={groups} churchName={churchName} footer={sidebarFooter} />
      <div className="flex min-w-0 flex-1 flex-col">
        {banner ? <div className="border-b border-border bg-surface">{banner}</div> : null}
        <Topbar
          onOpenDrawer={() => setDrawerOpen(true)}
          centerSlot={topbarCenter}
          endSlot={topbarEnd}
          variant="admin"
        />
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'relative flex-1 outline-none',
            'px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
          )}
        >
          <div className="mx-auto w-full max-w-[var(--layout-content-max,80rem)]">
            {children}
          </div>
        </main>
        <AppFooter {...footerProps} />
      </div>
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={groups}
        churchName={churchName}
      />
    </div>
  );
}
