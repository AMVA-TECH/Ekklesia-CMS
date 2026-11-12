'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ApiError,
  apiFetch,
  SessionProvider,
  type Session,
  type SessionChurch,
  type SessionUser,
} from '@/app/_ekklesia/session';
import {
  MemberShell,
  type BottomNavItem,
  type NavGroup,
} from '@/app/_ekklesia/shell';
import {
  Avatar,
  BrandMark,
  Button,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Spinner,
  ToastProvider,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';

/** Shape returned by `/api/v1/auth/me`. */
interface AuthMeResponse {
  actor: {
    userAccountId: string;
    personId: string | null;
    email: string | null;
    phoneE164: string | null;
    status: string | null;
  };
  church: {
    id: string;
    name: string | null;
    slug: string | null;
    timezone: string | null;
    defaultLocale: string | null;
  };
  roles: Array<{
    assignmentId: string;
    roleId: string;
    code: string;
    name: string;
  }>;
  permissions: string[];
  locale: string | null;
  authMode: string;
}

const BOTTOM_ITEMS: readonly BottomNavItem[] = [
  { label: 'Home', href: '/home', icon: 'home' },
  { label: 'Community', href: '/community', icon: 'users' },
  { label: 'Events', href: '/events', icon: 'calendar' },
  { label: 'Profile', href: '/profile', icon: 'user' },
];

const DRAWER_GROUPS: readonly NavGroup[] = [
  {
    label: 'Me',
    items: [
      { label: 'Home', href: '/home', icon: 'home', hint: 'What is happening this week' },
      { label: 'My profile', href: '/profile', icon: 'user', hint: 'Contact details & preferences' },
      { label: 'My attendance', href: '/attendance', icon: 'calendar-check', hint: 'Sundays and services' },
    ],
  },
  {
    label: 'Participation',
    items: [
      { label: 'Events', href: '/events', icon: 'calendar', hint: 'Browse and register' },
      { label: 'Community', href: '/community', icon: 'users', hint: 'Ministries & groups' },
      { label: 'Giving', href: '/giving', icon: 'hand', hint: 'Pledges & offerings' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Notifications', href: '/notifications', icon: 'bell', hint: 'How we reach you' },
    ],
  },
];

/**
 * Convert the raw `/api/v1/auth/me` payload into the UI `Session` contract.
 */
function toSession(me: AuthMeResponse): Session {
  const user: SessionUser = {
    id: me.actor.userAccountId,
    displayName: resolveDisplayName(me),
    email: me.actor.email ?? undefined,
    phoneE164: me.actor.phoneE164 ?? undefined,
    locale: me.locale ?? undefined,
  };
  const activeChurch: SessionChurch | null = me.church?.id
    ? {
        id: me.church.id,
        name: me.church.name ?? 'Your church',
        slug: me.church.slug ?? undefined,
      }
    : null;
  return {
    user,
    church: activeChurch,
    churches: activeChurch ? [activeChurch] : [],
    roles: me.roles.map((r) => ({ code: r.code, label: r.name })),
    permissions: me.permissions,
  };
}

function resolveDisplayName(me: AuthMeResponse): string {
  if (me.actor.email) {
    const localPart = me.actor.email.split('@')[0];
    return localPart ? titleize(localPart) : 'You';
  }
  if (me.actor.phoneE164) return me.actor.phoneE164;
  return 'You';
}

function titleize(s: string): string {
  return s
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface MemberShellMountProps {
  children: ReactNode;
}

/**
 * Loads the session, provides it to descendants, and renders the member shell.
 *
 * Important (Next.js 16 instant navigation): `{children}` must always stay in
 * the tree. Gating the page segment behind a spinner drops the route and
 * breaks client navigation ("Could not validate instant navigation").
 */
export function MemberShellMount({ children }: MemberShellMountProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname() ?? '/home';
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const me = await apiFetch<AuthMeResponse>('/api/v1/auth/me');
        if (!alive) return;
        setSession(toSession(me));
        setRedirecting(false);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setLoading(false);
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setRedirecting(true);
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            const next = encodeURIComponent(pathname || '/home');
            // Hard navigation — soft replace can stall under Cache Components.
            window.location.replace(`/sign-in?redirect=${next}`);
          }
          return;
        }
        if (e instanceof ApiError) {
          setLoadError(e.message || 'We could not load your account right now.');
        } else {
          setLoadError('Check your connection and try again.');
        }
      }
    })();

    return () => {
      alive = false;
    };
    // `attempt` lets the user retry on a transient error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const handleSignOut = useCallback(async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST', skipDevAuth: true });
    } catch {
      // Best-effort: still redirect even if logout API fails.
    }
    router.push('/sign-in');
  }, [router]);

  const gate =
    !session &&
    (loading || redirecting || Boolean(loadError));

  const churchName = session?.church?.name ?? undefined;
  const displayName = session?.user.displayName ?? 'You';

  const topbarEnd = (
    <>
      <Link
        href="/notifications"
        aria-label="Notification settings"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
      >
        <Icon name="bell" size={18} />
      </Link>
      <Menu
        align="end"
        trigger={
          <button
            type="button"
            aria-label="Account"
            className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium text-foreground hover:bg-surface-muted focus-ring"
          >
            <Avatar name={displayName} size="sm" />
            <span className="hidden max-w-[10rem] truncate md:inline">{displayName}</span>
            <Icon name="chevron-down" size={14} className="hidden md:inline text-muted-foreground" />
          </button>
        }
      >
        <MenuLabel>{displayName}</MenuLabel>
        {churchName ? (
          <div className="px-3 pb-2 text-xs text-muted-foreground">{churchName}</div>
        ) : null}
        <MenuSeparator />
        <MenuItem icon="user" onClick={() => router.push('/profile')}>
          My profile
        </MenuItem>
        <MenuItem icon="bell" onClick={() => router.push('/notifications')}>
          Notifications
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon="logout" onClick={() => void handleSignOut()} destructive>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <SessionProvider session={session} loading={loading}>
      <ToastProvider>
        {gate ? (
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-muted-foreground">
              <BrandMark size={40} withWordmark={false} variant="logo" surface="light" />
              {loadError ? (
                <>
                  <h1 className="text-xl font-semibold text-foreground">We hit a bump</h1>
                  <p className="max-w-sm text-sm">{loadError}</p>
                  <Button onClick={() => setAttempt((n) => n + 1)} iconLeft="refresh">
                    Try again
                  </Button>
                  <Link
                    href="/sign-in"
                    className="text-sm underline-offset-2 hover:text-foreground hover:underline focus-ring rounded-sm"
                  >
                    Sign in again
                  </Link>
                </>
              ) : redirecting ? (
                <>
                  <Spinner size="md" label="Redirecting to sign in" />
                  <p className="text-sm">Taking you to sign in…</p>
                  <Link
                    href={`/sign-in?redirect=${encodeURIComponent(pathname || '/home')}`}
                    className="text-sm underline-offset-2 hover:text-foreground hover:underline focus-ring rounded-sm"
                  >
                    Continue to sign in
                  </Link>
                </>
              ) : (
                <>
                  <Spinner size="md" label="Loading your church home" />
                  <p className="text-sm">Loading your church home…</p>
                </>
              )}
            </div>
            {/* Keep the page segment mounted for Next.js instant-navigation validation. */}
            <div className="hidden" aria-hidden="true">
              {children}
            </div>
          </div>
        ) : (
          <MemberShell
            drawerGroups={DRAWER_GROUPS}
            bottomItems={BOTTOM_ITEMS}
            topbarEnd={topbarEnd}
            churchName={churchName}
            footerProps={{
              tagline: (
                <>
                  <span className="font-semibold text-foreground">Ekklesia</span>
                  {churchName ? <> · {churchName}</> : null}
                </>
              ),
            }}
          >
            {children}
          </MemberShell>
        )}
      </ToastProvider>
    </SessionProvider>
  );
}
