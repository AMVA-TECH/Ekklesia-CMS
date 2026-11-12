import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark, SkipLink } from '@/app/_ekklesia/ui';
import './auth-panel.css';

/**
 * Auth shell — FundFlow split structure, Ekklesia colour balance.
 *
 * Charcoal brand rail is slim (~1/5) so ivory/white stays ~65–72% of the view.
 * Gold appears as mark, rule, and soft form wash — not a large fill.
 */
export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <SkipLink />

      <aside
        className="ek-auth-brand-panel relative hidden w-[min(30%,26rem)] shrink-0 flex-col justify-between overflow-hidden p-8 text-[color:var(--sidebar-foreground)] lg:flex xl:p-10"
        aria-label="Ekklesia"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.22]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/imagery/hero-church.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--sidebar-background)] via-[color:var(--sidebar-background)]/75 to-[color:var(--sidebar-background)]/45" />
        </div>

        <div className="relative z-10">
          <BrandMark
            href="/"
            size={36}
            variant="symbol"
            surface="dark"
            withWordmark
          />
        </div>

        <div className="relative z-10">
          <p className="font-[family-name:var(--font-scripture)] text-2xl font-semibold not-italic leading-snug tracking-tight xl:text-[1.75rem]">
            Your church home, on any phone.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--sidebar-muted)]">
            Services, groups, and giving — calm and close to community.
          </p>
        </div>

        <p className="relative z-10 text-[10px] uppercase tracking-wide text-[color:var(--sidebar-muted)]">
          Ekklesia
        </p>
      </aside>

      <div className="ek-auth-form-canvas flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface/80 px-5 py-4 backdrop-blur-sm lg:px-10">
          <BrandMark
            href="/"
            size={28}
            variant="symbol"
            surface="light"
          />
          <Link
            href="/sign-in?help=1"
            className="link-ink text-xs font-medium underline-offset-2 hover:underline focus-ring rounded-sm"
          >
            Need help?
          </Link>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col justify-center px-5 py-8 outline-none sm:px-8 lg:px-12 xl:px-16"
        >
          <div className="ek-auth-form-enter mx-auto w-full max-w-[24rem]">{children}</div>
        </main>

        <footer className="border-t border-border bg-surface/60 px-5 py-4 text-center text-xs text-muted-foreground sm:px-8 lg:text-left">
          <p>
            <span className="font-semibold text-foreground">Ekklesia</span> ·
            built for the local church
          </p>
          <p className="mt-1">
            Need help signing in?{' '}
            <Link
              href="/sign-in?help=1"
              className="link-ink font-medium underline-offset-2 hover:underline focus-ring rounded-sm"
            >
              Talk to your church office
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
