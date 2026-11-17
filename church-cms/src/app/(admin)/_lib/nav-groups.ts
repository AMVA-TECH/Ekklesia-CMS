import type { Session, SessionChurchConfig } from '@/app/_ekklesia/session';
import type { NavGroup, NavItem } from '@/app/_ekklesia/shell';

function can(permissions: ReadonlySet<string>, code: string): boolean {
  return permissions.has(code);
}

function moduleOn(
  modules: SessionChurchConfig['modules'] | undefined,
  id: keyof SessionChurchConfig['modules'],
): boolean {
  if (!modules) return true;
  return modules[id] !== false;
}

/**
 * Build the admin sidebar from permissions + church module flags (DEC-033).
 * Authorization uses permission codes — not leadership title / role-name strings.
 */
export function buildAdminGroups(session: Session | null): NavGroup[] {
  const permissions = new Set(session?.permissions ?? []);
  const modules = session?.church?.config?.modules;
  const terms = session?.church?.config?.terminology;
  const unitPlural = terms?.organisationalUnitPlural ?? 'Ministries';
  const membershipLabel = terms?.membershipLabel ?? 'Memberships';

  const hasAnyPermission = permissions.size > 0;

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

  if (!hasAnyPermission) {
    return groups;
  }

  const peopleItems: NavItem[] = [];
  if (
    moduleOn(modules, 'people') &&
    (can(permissions, 'people:read') || can(permissions, 'people:create'))
  ) {
    peopleItems.push({
      label: 'People',
      hint: 'Members and visitors',
      href: '/admin/people',
      icon: 'users',
    });
  }
  if (moduleOn(modules, 'people') && can(permissions, 'households:read')) {
    peopleItems.push({
      label: 'Households',
      hint: 'Families and groups',
      href: '/admin/households',
      icon: 'building',
    });
  }
  if (moduleOn(modules, 'membership') && can(permissions, 'memberships:read')) {
    peopleItems.push({
      label: membershipLabel,
      hint: 'Status and journeys',
      href: '/admin/memberships',
      icon: 'user-plus',
    });
  }
  if (
    moduleOn(modules, 'membership') &&
    can(permissions, 'memberships:approve')
  ) {
    peopleItems.push({
      label: 'Join requests',
      hint: 'Approve new members',
      href: '/admin/join-requests',
      icon: 'inbox',
    });
  }
  if (peopleItems.length > 0) {
    groups.push({ label: 'People', items: peopleItems });
  }

  const ministryItems: NavItem[] = [];
  if (moduleOn(modules, 'organisation') && can(permissions, 'units:read')) {
    ministryItems.push({
      label: 'Organisation',
      hint: 'Structure and hierarchy',
      href: '/admin/organisation',
      icon: 'building',
    });
    ministryItems.push({
      label: unitPlural,
      hint: 'Units and participation',
      href: '/admin/ministries',
      icon: 'hand',
    });
  }
  if (
    moduleOn(modules, 'organisation') &&
    (can(permissions, 'positions:write') || can(permissions, 'units:read'))
  ) {
    ministryItems.push({
      label: 'Leadership',
      hint: 'Positions and reporting',
      href: '/admin/leadership',
      icon: 'users',
    });
  }
  if (moduleOn(modules, 'events') && can(permissions, 'events:read')) {
    ministryItems.push({
      label: 'Events',
      hint: 'Services and gatherings',
      href: '/admin/events',
      icon: 'calendar',
    });
  }
  if (moduleOn(modules, 'attendance') && can(permissions, 'attendance:read')) {
    ministryItems.push({
      label: 'Attendance',
      hint: 'Services recorded',
      href: '/admin/attendance',
      icon: 'calendar-check',
    });
  }
  if (moduleOn(modules, 'finance') && (can(permissions, 'projects:read') || can(permissions, 'projects:write'))) {
    ministryItems.push({
      label: 'Projects',
      hint: 'Goals and volunteers',
      href: '/admin/projects',
      icon: 'briefcase',
    });
  }
  if (ministryItems.length > 0) {
    groups.push({ label: 'Ministry', items: ministryItems });
  }

  const anyOf = (...codes: string[]): boolean => codes.some((c) => can(permissions, c));

  const financeItems: NavItem[] = [];
  if (
    moduleOn(modules, 'finance') &&
    anyOf('funds:read', 'offerings:write', 'pledges:read', 'finance_reports:read')
  ) {
    financeItems.push(
      { label: 'Overview', hint: 'Giving and funds', href: '/admin/finance', icon: 'wallet' },
      { label: 'Offerings', hint: 'Sunday collections', href: '/admin/finance/offerings', icon: 'coin' },
      { label: 'Funds', hint: 'Restricted and general', href: '/admin/finance/funds', icon: 'briefcase' },
      { label: 'Pledges', hint: 'Promises and follow-ups', href: '/admin/finance/pledges', icon: 'hand' },
    );
  }
  if (moduleOn(modules, 'finance') && anyOf('disbursements:request', 'disbursements:approve', 'finance_reports:read')) {
    financeItems.push({ label: 'Expenses', hint: 'Spending requests', href: '/admin/finance/expenses', icon: 'card' });
  }
  if (moduleOn(modules, 'finance') && anyOf('journals:read', 'journals:draft', 'journals:post')) {
    financeItems.push({ label: 'Journals', hint: 'General ledger', href: '/admin/finance/journals', icon: 'book' });
  }
  if (moduleOn(modules, 'finance') && anyOf('budgets:read', 'budgets:write', 'finance_reports:read')) {
    financeItems.push({ label: 'Budgets', hint: 'Planned vs actual', href: '/admin/finance/budgets', icon: 'chart' });
  }
  if (moduleOn(modules, 'finance') && anyOf('accounts:read', 'accounts:write', 'periods:write')) {
    financeItems.push({ label: 'Accounts & years', hint: 'Chart of accounts', href: '/admin/finance/accounts', icon: 'tag' });
  }
  if (financeItems.length > 0) {
    groups.push({ label: 'Finance', items: financeItems });
  }

  const commsItems: NavItem[] = [];
  if (
    moduleOn(modules, 'messaging') &&
    (can(permissions, 'announcements:write') ||
      can(permissions, 'announcements:publish'))
  ) {
    commsItems.push({
      label: 'Announcements',
      hint: 'Church-wide notices',
      href: '/admin/messaging/announcements',
      icon: 'bell',
    });
  }
  if (
    moduleOn(modules, 'messaging') &&
    (can(permissions, 'messages:send') ||
      can(permissions, 'messages:bulk_send'))
  ) {
    commsItems.push({
      label: 'Send jobs',
      hint: 'SMS and WhatsApp blasts',
      href: '/admin/messaging/jobs',
      icon: 'inbox',
    });
  }
  if (moduleOn(modules, 'messaging') && can(permissions, 'templates:write')) {
    commsItems.push({
      label: 'Templates',
      hint: 'Reusable messages',
      href: '/admin/messaging/templates',
      icon: 'mail',
    });
  }
  if (commsItems.length > 0) {
    groups.push({ label: 'Communications', items: commsItems });
  }

  const governanceItems: NavItem[] = [];
  if (anyOf('disbursements:approve', 'disbursements:request', 'announcements:publish', 'memberships:approve')) {
    governanceItems.push({ label: 'Approvals', hint: 'Second sign-off', href: '/admin/approvals', icon: 'check-circle' });
  }
  if (anyOf('memberships:read', 'finance_reports:read', 'units:read', 'disbursements:approve')) {
    governanceItems.push({ label: 'Reports', hint: 'Leadership and finance', href: '/admin/reports', icon: 'trending-up' });
  }
  if (moduleOn(modules, 'governance') && anyOf('units:read', 'units:write', 'church:update', 'announcements:write')) {
    governanceItems.push({ label: 'Minutes', hint: 'Meeting records', href: '/admin/governance/minutes', icon: 'file' });
  }
  if (moduleOn(modules, 'governance') && anyOf('appointments:write', 'roles:assign', 'church:update')) {
    governanceItems.push({ label: 'Delegations', hint: 'Temporary hand-over', href: '/admin/governance/delegations', icon: 'key' });
  }
  if (governanceItems.length > 0) {
    groups.push({ label: 'Governance', items: governanceItems });
  }

  const settingsItems: NavItem[] = [];
  if (anyOf('church:read', 'church:update')) {
    settingsItems.push({
      label: 'Church profile',
      hint: 'Organisation and access',
      href: '/admin/settings',
      icon: 'settings',
    });
  }
  if (can(permissions, 'exports:run')) {
    settingsItems.push({ label: 'Exports', hint: 'CSV downloads', href: '/admin/exports', icon: 'download' });
  }
  if (can(permissions, 'audit:read')) {
    settingsItems.push({ label: 'Audit log', hint: 'Who did what', href: '/admin/audit', icon: 'shield' });
  }
  if (settingsItems.length > 0) {
    groups.push({ label: 'Settings', items: settingsItems });
  }

  return groups;
}
