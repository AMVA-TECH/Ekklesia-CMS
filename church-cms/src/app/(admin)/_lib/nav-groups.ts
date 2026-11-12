import { ROLE_CODES, type Session } from '@/app/_ekklesia/session';
import type { NavGroup } from '@/app/_ekklesia/shell';

/**
 * Build the admin sidebar nav from the active session.
 *
 * Checkpoint A Q9 pilot roles: `church_administrator` (full admin surface)
 * plus `finance_officer` (finance screens where they exist). Other roles
 * (pastor, ministry_leader, …) fall back to the "core" group only; expand
 * when their screens land.
 *
 * The factory stays data-driven so the shell/drawer render the same tree on
 * desktop and mobile — Agent 3's `<RoleNav>` handles the chrome.
 */
export function buildAdminGroups(session: Session | null): NavGroup[] {
  const roles = new Set((session?.roles ?? []).map((r) => r.code));
  const isChurchAdmin = roles.has(ROLE_CODES.churchAdministrator);
  const isFinanceOfficer = roles.has(ROLE_CODES.financeOfficer);
  // Grant the full admin shell to administrators by default. Finance officers
  // see the finance block without the people/governance surfaces.
  const showAll = isChurchAdmin || roles.size === 0;

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        {
          label: 'Dashboard',
          hint: 'Today at a glance',
          href: '/admin/dashboard',
          icon: 'home',
        },
      ],
    },
  ];

  if (showAll) {
    groups.push({
      label: 'People',
      items: [
        {
          label: 'People',
          hint: 'Members and visitors',
          href: '/admin/people',
          icon: 'users',
        },
        {
          label: 'Households',
          hint: 'Families and groups',
          href: '/admin/households',
          icon: 'building',
        },
        {
          label: 'Memberships',
          hint: 'Status and journeys',
          href: '/admin/memberships',
          icon: 'user-plus',
        },
      ],
    });

    groups.push({
      label: 'Ministry',
      items: [
        {
          label: 'Ministries',
          hint: 'Units and teams',
          href: '/admin/ministries',
          icon: 'hand',
        },
        {
          label: 'Events',
          hint: 'Services and gatherings',
          href: '/admin/events',
          icon: 'calendar',
        },
        {
          label: 'Attendance',
          hint: 'Services recorded',
          href: '/admin/attendance',
          icon: 'calendar-check',
        },
      ],
    });
  }

  if (showAll || isFinanceOfficer) {
    groups.push({
      label: 'Finance',
      items: [
        {
          label: 'Overview',
          hint: 'Giving and funds',
          href: '/admin/finance',
          icon: 'wallet',
        },
        {
          label: 'Offerings',
          hint: 'Sunday collections',
          href: '/admin/finance/offerings',
          icon: 'coin',
        },
        {
          label: 'Funds',
          hint: 'Restricted and general',
          href: '/admin/finance/funds',
          icon: 'briefcase',
        },
        {
          label: 'Pledges',
          hint: 'Promises and follow-ups',
          href: '/admin/finance/pledges',
          icon: 'hand',
        },
      ],
    });
  }

  if (showAll) {
    groups.push({
      label: 'Communications',
      items: [
        {
          label: 'Announcements',
          hint: 'Church-wide notices',
          href: '/admin/messaging/announcements',
          icon: 'bell',
        },
        {
          label: 'Send jobs',
          hint: 'SMS and WhatsApp blasts',
          href: '/admin/messaging/jobs',
          icon: 'inbox',
        },
        {
          label: 'Templates',
          hint: 'Reusable messages',
          href: '/admin/messaging/templates',
          icon: 'mail',
        },
      ],
    });

    groups.push({
      label: 'Settings',
      items: [
        {
          label: 'Church profile',
          hint: 'Organisation and access',
          href: '/admin/settings',
          icon: 'settings',
        },
      ],
    });
  }

  return groups;
}
