'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '../icons';
import { BrandMark } from '../ui/brand-mark';
import { cn } from '../ui/utils';
import { RoleNav, type NavGroup } from './role-nav';

const STORAGE_KEY = 'ek-sidebar-collapsed';

function readInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Props for `<Sidebar>` (desktop rail). */
export interface SidebarProps {
  /** Role-aware nav groups. */
  groups: readonly NavGroup[];
  /** Active church name shown under the brand mark. */
  churchName?: string;
  /** Optional slot at the bottom (e.g. account summary). */
  footer?: ReactNode;
}

/**
 * Desktop sidebar: charcoal rail + dark-surface BrandMark + gold active nav.
 * FundFlow structure (sticky collapse-aware rail); Ekklesia mockup chrome.
 */
export function Sidebar({
  groups,
  churchName,
  footer,
}: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);

  const toggle = (): void => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        'sticky top-0 z-20 hidden h-screen shrink-0 flex-col overflow-hidden',
        'border-r border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-background)] text-[color:var(--sidebar-foreground)]',
        'lg:flex',
        collapsed
          ? 'w-[var(--layout-sidebar-collapsed)]'
          : 'w-[var(--layout-sidebar-width)]',
      )}
      aria-label="Primary navigation"
    >
      <div
        className={cn(
          'flex h-[var(--layout-topbar-height,3.5rem)] items-center border-b border-[color:var(--sidebar-border)] px-3',
          collapsed ? 'justify-center' : 'px-4',
        )}
      >
        <BrandMark
          href="/admin/dashboard"
          size={collapsed ? 28 : 32}
          withWordmark={!collapsed}
          subline={collapsed ? undefined : churchName}
          variant="symbol"
          surface="dark"
        />
      </div>
      <div className={cn('flex-1 overflow-y-auto pb-4', collapsed && 'px-1')}>
        <div className={collapsed ? 'sr-only' : ''}>
          <RoleNav groups={groups} />
        </div>
        {collapsed ? <CollapsedNav groups={groups} /> : null}
      </div>
      {footer ? (
        <div
          className={cn(
            'border-t border-[color:var(--sidebar-border)] p-3',
            collapsed && 'px-1 py-3',
          )}
        >
          <div className={collapsed ? 'sr-only' : ''}>{footer}</div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'border-t border-[color:var(--sidebar-border)] py-2 text-xs font-medium',
          'text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-foreground)] focus-ring',
          'flex items-center justify-center gap-2',
        )}
      >
        <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={14} />
        {collapsed ? null : <span>Collapse</span>}
      </button>
    </aside>
  );
}

function CollapsedNav({ groups }: { groups: readonly NavGroup[] }): React.ReactElement {
  return (
    <nav aria-label="Primary (collapsed)" className="flex flex-col items-center gap-1 py-2">
      {groups.flatMap((g) =>
        g.items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-foreground)] focus-ring"
            title={item.label}
          >
            {item.icon ? <Icon name={item.icon} size={18} /> : null}
            <span className="sr-only">{item.label}</span>
          </a>
        )),
      )}
    </nav>
  );
}
