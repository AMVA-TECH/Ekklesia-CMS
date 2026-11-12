'use client';

import { useRole, useSession } from '@/app/_ekklesia/session';
import { Avatar, Badge } from '@/app/_ekklesia/ui';

/**
 * Small account summary shown at the bottom of the admin sidebar.
 *
 * Keeps identity visible even when the collapsed sidebar hides the topbar
 * avatar on narrow desktops. Role badge helps admins confirm their scope.
 */
export function SidebarFooter(): React.ReactElement | null {
  const { user, church, isAuthenticated } = useSession();
  const { isChurchAdministrator, isFinanceOfficer } = useRole();

  if (!isAuthenticated || !user) return null;

  const primaryRole = isChurchAdministrator
    ? { label: 'Administrator', tone: 'gold' as const }
    : isFinanceOfficer
      ? { label: 'Finance officer', tone: 'sage' as const }
      : { label: 'Member', tone: 'neutral' as const };

  return (
    <div className="flex items-center gap-3">
      <Avatar name={user.displayName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {user.displayName}
        </p>
        {church?.name ? (
          <p className="truncate text-xs text-muted-foreground">{church.name}</p>
        ) : null}
      </div>
      <Badge tone={primaryRole.tone} className="shrink-0">
        {primaryRole.label}
      </Badge>
    </div>
  );
}
