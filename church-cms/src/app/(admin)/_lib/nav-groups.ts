import type { Session, SessionChurchConfig } from '@/app/_ekklesia/session';
import type { NavGroup, NavItem } from '@/app/_ekklesia/shell';
import { DEFAULT_CHURCH_SETTINGS } from '@/modules/churches/settings-schema';
import {
  DEFAULT_ADMIN_NAV_LABELS,
  type AdminNavLabels,
} from './admin-nav-labels';

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
 * Prefer church terminology when customized; otherwise use the locale nav label.
 * Stock English defaults would otherwise stick in Swahili (and other) UIs.
 */
function termOrLabel(
  custom: string | undefined,
  stockEnglish: string,
  localeLabel: string,
): string {
  const trimmed = custom?.trim();
  if (!trimmed || trimmed === stockEnglish) return localeLabel;
  return trimmed;
}

/**
 * Build the admin sidebar from permissions + church module flags (DEC-033).
 * Authorization uses permission codes — not leadership title / role-name strings.
 */
export function buildAdminGroups(
  session: Session | null,
  labels: AdminNavLabels = DEFAULT_ADMIN_NAV_LABELS,
): NavGroup[] {
  const permissions = new Set(session?.permissions ?? []);
  const modules = session?.church?.config?.modules;
  const terms = session?.church?.config?.terminology;
  const stock = DEFAULT_CHURCH_SETTINGS.terminology;
  const unitPlural = termOrLabel(
    terms?.organisationalUnitPlural,
    stock.organisationalUnitPlural,
    labels.ministries,
  );
  const membershipLabel = termOrLabel(
    terms?.membershipLabel,
    stock.membershipLabel,
    labels.memberships,
  );

  const hasAnyPermission = permissions.size > 0;

  const groups: NavGroup[] = [
    {
      label: labels.overview,
      items: [
        {
          label: labels.dashboard,
          hint: labels.dashboardHint,
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
      label: labels.people,
      hint: labels.peopleHint,
      href: '/admin/people',
      icon: 'users',
    });
  }
  if (moduleOn(modules, 'people') && can(permissions, 'households:read')) {
    peopleItems.push({
      label: labels.households,
      hint: labels.householdsHint,
      href: '/admin/households',
      icon: 'building',
    });
  }
  if (moduleOn(modules, 'membership') && can(permissions, 'memberships:read')) {
    peopleItems.push({
      label: membershipLabel,
      hint: labels.membershipsHint,
      href: '/admin/memberships',
      icon: 'user-plus',
    });
  }
  if (
    moduleOn(modules, 'membership') &&
    can(permissions, 'memberships:approve')
  ) {
    peopleItems.push({
      label: labels.joinRequests,
      hint: labels.joinRequestsHint,
      href: '/admin/join-requests',
      icon: 'inbox',
    });
  }
  if (peopleItems.length > 0) {
    groups.push({ label: labels.peopleGroup, items: peopleItems });
  }

  const ministryItems: NavItem[] = [];
  if (moduleOn(modules, 'organisation') && can(permissions, 'units:read')) {
    ministryItems.push({
      label: labels.organisation,
      hint: labels.organisationHint,
      href: '/admin/organisation',
      icon: 'building',
    });
    ministryItems.push({
      label: unitPlural,
      hint: labels.ministriesHint,
      href: '/admin/ministries',
      icon: 'hand',
    });
  }
  if (
    moduleOn(modules, 'organisation') &&
    (can(permissions, 'positions:write') || can(permissions, 'units:read'))
  ) {
    ministryItems.push({
      label: labels.leadership,
      hint: labels.leadershipHint,
      href: '/admin/leadership',
      icon: 'users',
    });
  }
  if (moduleOn(modules, 'events') && can(permissions, 'events:read')) {
    ministryItems.push({
      label: labels.events,
      hint: labels.eventsHint,
      href: '/admin/events',
      icon: 'calendar',
    });
  }
  if (moduleOn(modules, 'attendance') && can(permissions, 'attendance:read')) {
    ministryItems.push({
      label: labels.attendance,
      hint: labels.attendanceHint,
      href: '/admin/attendance',
      icon: 'calendar-check',
    });
  }
  if (moduleOn(modules, 'finance') && (can(permissions, 'projects:read') || can(permissions, 'projects:write'))) {
    ministryItems.push({
      label: labels.projects,
      hint: labels.projectsHint,
      href: '/admin/projects',
      icon: 'briefcase',
    });
  }
  if (ministryItems.length > 0) {
    groups.push({ label: labels.ministryGroup, items: ministryItems });
  }

  const anyOf = (...codes: string[]): boolean => codes.some((c) => can(permissions, c));

  const financeItems: NavItem[] = [];
  if (
    moduleOn(modules, 'finance') &&
    anyOf('funds:read', 'offerings:write', 'pledges:read', 'finance_reports:read')
  ) {
    financeItems.push(
      { label: labels.financeOverview, hint: labels.financeOverviewHint, href: '/admin/finance', icon: 'wallet' },
      { label: labels.offerings, hint: labels.offeringsHint, href: '/admin/finance/offerings', icon: 'coin' },
      { label: labels.funds, hint: labels.fundsHint, href: '/admin/finance/funds', icon: 'briefcase' },
      { label: labels.pledges, hint: labels.pledgesHint, href: '/admin/finance/pledges', icon: 'hand' },
    );
  }
  if (moduleOn(modules, 'finance') && anyOf('disbursements:request', 'disbursements:approve', 'finance_reports:read')) {
    financeItems.push({ label: labels.expenses, hint: labels.expensesHint, href: '/admin/finance/expenses', icon: 'card' });
  }
  if (moduleOn(modules, 'finance') && anyOf('journals:read', 'journals:draft', 'journals:post')) {
    financeItems.push({ label: labels.journals, hint: labels.journalsHint, href: '/admin/finance/journals', icon: 'book' });
  }
  if (moduleOn(modules, 'finance') && anyOf('budgets:read', 'budgets:write', 'finance_reports:read')) {
    financeItems.push({ label: labels.budgets, hint: labels.budgetsHint, href: '/admin/finance/budgets', icon: 'chart' });
  }
  if (moduleOn(modules, 'finance') && anyOf('accounts:read', 'accounts:write', 'periods:write')) {
    financeItems.push({ label: labels.accounts, hint: labels.accountsHint, href: '/admin/finance/accounts', icon: 'tag' });
  }
  if (financeItems.length > 0) {
    groups.push({ label: labels.financeGroup, items: financeItems });
  }

  const commsItems: NavItem[] = [];
  if (
    moduleOn(modules, 'messaging') &&
    (can(permissions, 'announcements:write') ||
      can(permissions, 'announcements:publish'))
  ) {
    commsItems.push({
      label: labels.announcements,
      hint: labels.announcementsHint,
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
      label: labels.sendJobs,
      hint: labels.sendJobsHint,
      href: '/admin/messaging/jobs',
      icon: 'inbox',
    });
  }
  if (moduleOn(modules, 'messaging') && can(permissions, 'templates:write')) {
    commsItems.push({
      label: labels.templates,
      hint: labels.templatesHint,
      href: '/admin/messaging/templates',
      icon: 'mail',
    });
  }
  if (commsItems.length > 0) {
    groups.push({ label: labels.communications, items: commsItems });
  }

  const governanceItems: NavItem[] = [];
  if (anyOf('disbursements:approve', 'disbursements:request', 'announcements:publish', 'memberships:approve')) {
    governanceItems.push({ label: labels.approvals, hint: labels.approvalsHint, href: '/admin/approvals', icon: 'check-circle' });
  }
  if (anyOf('memberships:read', 'finance_reports:read', 'units:read', 'disbursements:approve')) {
    governanceItems.push({ label: labels.reports, hint: labels.reportsHint, href: '/admin/reports', icon: 'trending-up' });
  }
  if (moduleOn(modules, 'governance') && anyOf('units:read', 'units:write', 'church:update', 'announcements:write')) {
    governanceItems.push({ label: labels.minutes, hint: labels.minutesHint, href: '/admin/governance/minutes', icon: 'file' });
  }
  if (moduleOn(modules, 'governance') && anyOf('appointments:write', 'roles:assign', 'church:update')) {
    governanceItems.push({ label: labels.delegations, hint: labels.delegationsHint, href: '/admin/governance/delegations', icon: 'key' });
  }
  if (governanceItems.length > 0) {
    groups.push({ label: labels.governance, items: governanceItems });
  }

  const settingsItems: NavItem[] = [];
  if (anyOf('church:read', 'church:update')) {
    settingsItems.push({
      label: labels.churchProfile,
      hint: labels.churchProfileHint,
      href: '/admin/settings',
      icon: 'settings',
    });
  }
  if (anyOf('roles:read', 'roles:assign')) {
    settingsItems.push({
      label: labels.rolesAccess,
      hint: labels.rolesAccessHint,
      href: '/admin/roles',
      icon: 'key',
    });
  }
  if (can(permissions, 'exports:run')) {
    settingsItems.push({ label: labels.exports, hint: labels.exportsHint, href: '/admin/exports', icon: 'download' });
  }
  if (can(permissions, 'audit:read')) {
    settingsItems.push({ label: labels.auditLog, hint: labels.auditLogHint, href: '/admin/audit', icon: 'shield' });
  }
  if (settingsItems.length > 0) {
    groups.push({ label: labels.settingsGroup, items: settingsItems });
  }

  return groups;
}
