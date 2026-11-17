'use client';

import { Icon } from '@/app/_ekklesia/icons';
import { useRole, useSession } from '@/app/_ekklesia/session';
import { Avatar } from '@/app/_ekklesia/ui';

const ROLE_PRIORITY = [
  'church_administrator',
  'platform_operator',
  'senior_pastor',
  'pastor',
  'pastoral_leadership',
  'finance_officer',
  'ministry_leader',
  'member',
] as const;

const ROLE_FALLBACK_LABELS: Record<string, string> = {
  church_administrator: 'Church Administrator',
  platform_operator: 'Platform Operator',
  senior_pastor: 'Senior Pastor',
  pastor: 'Pastor',
  pastoral_leadership: 'Pastoral Leadership',
  finance_officer: 'Finance Officer',
  ministry_leader: 'Ministry Leader',
  member: 'Member',
};

/**
 * Account summary at the bottom of the admin sidebar.
 * Shows user avatar, display name, role, and Admin when applicable.
 */
export function SidebarFooter(): React.ReactElement | null {
  const { session, user, isAuthenticated } = useSession();
  const { isChurchAdministrator, isPlatformOperator } = useRole();

  if (!isAuthenticated || !user) return null;

  const roles = session?.roles ?? [];
  const primary =
    ROLE_PRIORITY.map((code) => roles.find((role) => role.code === code)).find(
      Boolean,
    ) ?? roles[0];

  const roleLabel =
    primary?.label?.trim() ||
    (primary?.code ? ROLE_FALLBACK_LABELS[primary.code] : null) ||
    primary?.code?.replaceAll('_', ' ') ||
    'Member';

  const displayName =
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    'Signed in';

  const showAdmin = isChurchAdministrator || isPlatformOperator;

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <Avatar
          name={displayName}
          size="sm"
          tone="brand"
          ring
          className="ring-[color:var(--sidebar-background)]"
        />
        <span
          className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--ek-charcoal-deep)] text-[color:var(--sidebar-active-accent)] ring-2 ring-[color:var(--sidebar-background)]"
          aria-hidden="true"
        >
          <Icon name="user" size={10} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--sidebar-foreground)]">
            {displayName}
          </p>
          {showAdmin ? (
            <span className="shrink-0 rounded-md bg-[color:var(--sidebar-active-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--sidebar-active-accent)] ring-1 ring-inset ring-[color:var(--sidebar-active-border)]">
              Admin
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-[color:var(--sidebar-muted)]">
          {roleLabel}
        </p>
      </div>
    </div>
  );
}
