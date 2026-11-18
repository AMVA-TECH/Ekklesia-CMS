import type { Session, SessionChurchConfig } from '@/app/_ekklesia/session';
import type { NavGroup, NavItem } from '@/app/_ekklesia/shell';
import { t } from '@/app/_ekklesia/i18n/core';

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
  const unitPlural = terms?.organisationalUnitPlural ?? t('Ministries');
  const membershipLabel = terms?.membershipLabel ?? t('Memberships');

  const hasAnyPermission = permissions.size > 0;

  const groups: NavGroup[] = [
    {
      label: t('Overview'),
      items: [
        {
          label: t('Dashboard'),
          hint: t('Today at a glance'),
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
      label: t('People'),
      hint: t('Members and visitors'),
      href: '/admin/people',
      icon: 'users',
    });
  }
  if (moduleOn(modules, 'people') && can(permissions, 'households:read')) {
    peopleItems.push({
      label: t('Households'),
      hint: t('Families and groups'),
      href: '/admin/households',
      icon: 'building',
    });
  }
  if (moduleOn(modules, 'membership') && can(permissions, 'memberships:read')) {
    peopleItems.push({
      label: membershipLabel,
      hint: t('Status and journeys'),
      href: '/admin/memberships',
      icon: 'user-plus',
    });
  }
  if (
    moduleOn(modules, 'membership') &&
    can(permissions, 'memberships:approve')
  ) {
    peopleItems.push({
      label: t('Join requests'),
      hint: t('Approve new members'),
      href: '/admin/join-requests',
      icon: 'inbox',
    });
  }
  if (peopleItems.length > 0) {
    groups.push({ label: t('People'), items: peopleItems });
  }

  const ministryItems: NavItem[] = [];
  if (moduleOn(modules, 'organisation') && can(permissions, 'units:read')) {
    ministryItems.push({
      label: t('Organisation'),
      hint: t('Structure and hierarchy'),
      href: '/admin/organisation',
      icon: 'building',
    });
    ministryItems.push({
      label: unitPlural,
      hint: t('Units and participation'),
      href: '/admin/ministries',
      icon: 'hand',
    });
  }
  if (moduleOn(modules, 'organisation') && can(permissions, 'participations:approve')) {
    ministryItems.push({
      label: t('Ministry requests'),
      hint: t('Members asking to join'),
      href: '/admin/ministries/requests',
      icon: 'user-plus',
    });
  }
  if (
    moduleOn(modules, 'organisation') &&
    (can(permissions, 'positions:write') || can(permissions, 'units:read'))
  ) {
    ministryItems.push({
      label: t('Leadership'),
      hint: t('Positions and reporting'),
      href: '/admin/leadership',
      icon: 'users',
    });
  }
  if (moduleOn(modules, 'events') && can(permissions, 'events:read')) {
    ministryItems.push({
      label: t('Events'),
      hint: t('Services and gatherings'),
      href: '/admin/events',
      icon: 'calendar',
    });
  }
  if (moduleOn(modules, 'attendance') && can(permissions, 'attendance:read')) {
    ministryItems.push({
      label: t('Attendance'),
      hint: t('Services recorded'),
      href: '/admin/attendance',
      icon: 'calendar-check',
    });
  }
  if (moduleOn(modules, 'finance') && (can(permissions, 'projects:read') || can(permissions, 'projects:write'))) {
    ministryItems.push({
      label: t('Projects'),
      hint: t('Goals and volunteers'),
      href: '/admin/projects',
      icon: 'briefcase',
    });
  }
  if (ministryItems.length > 0) {
    groups.push({ label: t('Ministry'), items: ministryItems });
  }

  const anyOf = (...codes: string[]): boolean => codes.some((c) => can(permissions, c));

  const financeItems: NavItem[] = [];
  if (
    moduleOn(modules, 'finance') &&
    anyOf('funds:read', 'offerings:write', 'pledges:read', 'finance_reports:read')
  ) {
    financeItems.push(
      { label: t('Overview'), hint: t('Giving and funds'), href: '/admin/finance', icon: 'wallet' },
      { label: t('Offerings'), hint: t('Sunday collections'), href: '/admin/finance/offerings', icon: 'coin' },
      { label: t('Funds'), hint: t('Restricted and general'), href: '/admin/finance/funds', icon: 'briefcase' },
      { label: t('Pledges'), hint: t('Promises and follow-ups'), href: '/admin/finance/pledges', icon: 'hand' },
    );
  }
  if (moduleOn(modules, 'finance') && anyOf('disbursements:request', 'disbursements:approve', 'finance_reports:read')) {
    financeItems.push({ label: t('Expenses'), hint: t('Spending requests'), href: '/admin/finance/expenses', icon: 'card' });
  }
  if (moduleOn(modules, 'finance') && anyOf('journals:read', 'journals:draft', 'journals:post')) {
    financeItems.push({ label: t('Journals'), hint: t('General ledger'), href: '/admin/finance/journals', icon: 'book' });
  }
  if (moduleOn(modules, 'finance') && anyOf('budgets:read', 'budgets:write', 'finance_reports:read')) {
    financeItems.push({ label: t('Budgets'), hint: t('Planned vs actual'), href: '/admin/finance/budgets', icon: 'chart' });
  }
  if (moduleOn(modules, 'finance') && anyOf('accounts:read', 'accounts:write', 'periods:write')) {
    financeItems.push({ label: t('Accounts & years'), hint: t('Chart of accounts'), href: '/admin/finance/accounts', icon: 'tag' });
  }
  if (financeItems.length > 0) {
    groups.push({ label: t('Finance'), items: financeItems });
  }

  const commsItems: NavItem[] = [];
  if (
    moduleOn(modules, 'messaging') &&
    (can(permissions, 'announcements:write') ||
      can(permissions, 'announcements:publish'))
  ) {
    commsItems.push({
      label: t('Announcements'),
      hint: t('Church-wide notices'),
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
      label: t('Send jobs'),
      hint: t('SMS and WhatsApp blasts'),
      href: '/admin/messaging/jobs',
      icon: 'inbox',
    });
  }
  if (moduleOn(modules, 'messaging') && can(permissions, 'templates:write')) {
    commsItems.push({
      label: t('Templates'),
      hint: t('Reusable messages'),
      href: '/admin/messaging/templates',
      icon: 'mail',
    });
  }
  if (commsItems.length > 0) {
    groups.push({ label: t('Communications'), items: commsItems });
  }

  const governanceItems: NavItem[] = [];
  if (anyOf('disbursements:approve', 'disbursements:request', 'announcements:publish', 'memberships:approve')) {
    governanceItems.push({ label: t('Approvals'), hint: t('Second sign-off'), href: '/admin/approvals', icon: 'check-circle' });
  }
  if (anyOf('memberships:read', 'finance_reports:read', 'units:read', 'disbursements:approve')) {
    governanceItems.push({ label: t('Reports'), hint: t('Leadership and finance'), href: '/admin/reports', icon: 'trending-up' });
  }
  if (moduleOn(modules, 'governance') && anyOf('units:read', 'units:write', 'church:update', 'announcements:write')) {
    governanceItems.push({ label: t('Minutes'), hint: t('Meeting records'), href: '/admin/governance/minutes', icon: 'file' });
  }
  if (moduleOn(modules, 'governance') && anyOf('appointments:write', 'roles:assign', 'church:update')) {
    governanceItems.push({ label: t('Delegations'), hint: t('Temporary hand-over'), href: '/admin/governance/delegations', icon: 'key' });
  }
  if (governanceItems.length > 0) {
    groups.push({ label: t('Governance'), items: governanceItems });
  }

  const settingsItems: NavItem[] = [];
  if (anyOf('church:read', 'church:update')) {
    settingsItems.push({
      label: t('Church profile'),
      hint: t('Organisation and access'),
      href: '/admin/settings',
      icon: 'settings',
    });
  }
  if (can(permissions, 'exports:run')) {
    settingsItems.push({ label: t('Exports'), hint: t('CSV downloads'), href: '/admin/exports', icon: 'download' });
  }
  if (can(permissions, 'audit:read')) {
    settingsItems.push({ label: t('Audit log'), hint: t('Who did what'), href: '/admin/audit', icon: 'shield' });
  }
  if (settingsItems.length > 0) {
    groups.push({ label: t('Settings'), items: settingsItems });
  }

  return groups;
}
