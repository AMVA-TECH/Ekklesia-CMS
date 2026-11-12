'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Nav paths are subdomain-root relative (`platform.example.com/security`).
 * `src/proxy.ts` rewrites them to `/platform/*` internally.
 * Plain anchors avoid App Router soft-nav missing the rewrite target.
 */
const NAV = [
  { href: '/', label: 'Overview', exact: true },
  { href: '/security', label: 'Security' },
  { href: '/audit', label: 'Audit' },
  { href: '/access', label: 'Access' },
  { href: '/growth', label: 'Growth' },
  { href: '/fault', label: 'Fault' },
  { href: '/churches', label: 'Churches' },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  const normalised =
    pathname === '/platform' ? '/' : pathname.replace(/^\/platform/, '') || '/';
  if (exact) return normalised === href;
  return normalised === href || normalised.startsWith(`${href}/`);
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="platform-console min-h-screen">
      <header className="platform-header">
        <div className="platform-brand">
          <span className="platform-brand-mark">CMS</span>
          <div>
            <p className="platform-brand-title">Platform Operator</p>
            <p className="platform-brand-sub">
              Oversight · Security · Growth ·{' '}
              <span className="platform-brand-host">platform subdomain</span>
            </p>
          </div>
        </div>
        <nav className="platform-nav" aria-label="Platform sections">
          {NAV.map((item) => {
            const exact = 'exact' in item ? item.exact : false;
            const active = isActive(pathname, item.href, exact);
            return (
              <a
                key={item.href}
                href={item.href}
                className={active ? 'platform-nav-link active' : 'platform-nav-link'}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>
      <main className="platform-main">{children}</main>
    </div>
  );
}
