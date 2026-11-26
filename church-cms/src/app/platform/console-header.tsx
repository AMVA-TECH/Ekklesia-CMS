'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import { PageHeader } from '@/app/_ekklesia/ui';
import { consoleArea, consoleGroupForArea } from './platform-console';

/**
 * RentFlow-style area chrome: breadcrumb → title → tab bar from PLATFORM_CONSOLE.
 */
export function ConsoleHeader({
  area,
  tab,
  title,
  description,
  actions,
}: {
  area: string;
  tab: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const meta = consoleArea(area);
  const group = consoleGroupForArea(area);
  const current = meta.tabs.find((item) => item.key === tab);
  const tabs = meta.tabs;

  return (
    <div className="mb-6 flex flex-col gap-4">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/platform" className="hover:text-foreground">
          Platform
        </Link>
        <Icon name="chevron-right" size={14} className="opacity-60" />
        <span>{group.label}</span>
        <Icon name="chevron-right" size={14} className="opacity-60" />
        <Link href={meta.href} className="hover:text-foreground">
          {meta.label}
        </Link>
        {current && current.href !== meta.href ? (
          <>
            <Icon name="chevron-right" size={14} className="opacity-60" />
            <span aria-current="page" className="text-foreground">
              {current.label}
            </span>
          </>
        ) : null}
      </nav>

      <PageHeader
        title={title ?? meta.label}
        lede={description ?? meta.hint}
        actions={actions}
        className="border-b-0 pb-0"
      />

      {tabs.length >= 2 ? (
        <nav
          aria-label="Sections"
          className="flex flex-wrap gap-1 border-b border-border pb-px"
        >
          {tabs.map((item) => {
            const active = item.key === tab;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'border-b-2 border-[color:var(--brand-gold)] px-3 py-2 text-sm font-semibold text-foreground'
                    : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
