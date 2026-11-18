'use client';

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from '../icons';
import { BrandMark } from '../ui/brand-mark';
import { cn } from '../ui/utils';
import { RoleNav, type NavGroup } from './role-nav';

const STORAGE_KEY = 'ek-sidebar-collapsed';

const collapsedListeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribeCollapsed(onStoreChange: () => void): () => void {
  collapsedListeners.add(onStoreChange);
  const onStorage = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    collapsedListeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

function writeCollapsed(next: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
  for (const listener of collapsedListeners) listener();
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
 * Desktop sidebar: charcoal rail + dark-surface BrandMark + soft-gold active nav.
 * FundFlow structure (sticky collapse-aware rail); Ekklesia mockup chrome.
 */
export function Sidebar({
  groups,
  churchName,
  footer,
}: SidebarProps): React.ReactElement {
  const t = useTranslations('Common');
  // External store keeps SSR (expanded) and client localStorage in sync
  // without setState-in-effect hydration cascades.
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  );

  // The admin rail is long; keep the current page's link in view so deep
  // pages (e.g. Settings → Audit log) don't open with their item hidden.
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = scrollRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [pathname, collapsed]);

  const toggle = (): void => {
    writeCollapsed(!collapsed);
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
      aria-label={t('primaryNav')}
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
      <div ref={scrollRef} className={cn('flex-1 overflow-y-auto pb-4', collapsed && 'px-1')}>
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
        aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        className={cn(
          'border-t border-[color:var(--sidebar-border)] py-2 text-xs font-medium',
          'text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-foreground)] focus-ring',
          'flex items-center justify-center gap-2',
        )}
      >
        <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={14} />
        {collapsed ? null : <span>{t('collapse')}</span>}
      </button>
    </aside>
  );
}

function CollapsedNav({ groups }: { groups: readonly NavGroup[] }): React.ReactElement {
  const t = useTranslations('Common');
  return (
    <nav aria-label={t('primaryNavCollapsed')} className="flex flex-col items-center gap-1 py-2">
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
