import type { IconName } from '@/app/_ekklesia/icons';

/**
 * Platform Admin console map — single source for sidebar + area tabs.
 * Mirror RentFlow's PLATFORM_CONSOLE: every area page reads the same tabs.
 */

export type ConsoleTab = { key: string; label: string; href: string };

export type ConsoleArea = {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  href: string;
  anyOf: readonly string[];
  tabs: ConsoleTab[];
};

export type ConsoleGroup = {
  key: string;
  label: string;
  areas: ConsoleArea[];
};

const base = '/platform';

export const PLATFORM_CONSOLE: ConsoleGroup[] = [
  {
    key: 'control',
    label: 'Control centre',
    areas: [
      {
        key: 'overview',
        label: 'Overview',
        hint: 'Health and adoption',
        icon: 'home',
        href: base,
        anyOf: ['platform:read'],
        tabs: [],
      },
      {
        key: 'search',
        label: 'Search',
        hint: 'Churches, accounts, findings, audit',
        icon: 'search',
        href: `${base}/search`,
        anyOf: ['platform:read', 'platform:churches_read', 'platform:audit_read'],
        tabs: [],
      },
      {
        key: 'churches',
        label: 'Churches',
        hint: 'Tenants and lifecycle',
        icon: 'church',
        href: `${base}/churches`,
        anyOf: ['platform:churches_read', 'platform:churches_write'],
        tabs: [
          { key: 'directory', label: 'Directory', href: `${base}/churches` },
        ],
      },
      {
        key: 'applications',
        label: 'Application verification',
        hint: 'KYC and church onboarding queue',
        icon: 'check',
        href: `${base}/churches/applications`,
        anyOf: [
          'platform:applications_review',
          'platform:applications_decide',
        ],
        tabs: [
          {
            key: 'queue',
            label: 'Queue',
            href: `${base}/churches/applications`,
          },
        ],
      },
      {
        key: 'access',
        label: 'Accounts & access',
        hint: 'Operators, church accounts, service identities',
        icon: 'users',
        href: `${base}/access`,
        anyOf: [
          'platform:accounts_read',
          'platform:accounts_write',
          'platform:operators_manage',
          'platform:service_accounts',
        ],
        tabs: [
          { key: 'operators', label: 'Operators', href: `${base}/access` },
          {
            key: 'tenant',
            label: 'Church accounts',
            href: `${base}/access?tab=tenant`,
          },
          {
            key: 'service',
            label: 'Service accounts',
            href: `${base}/access?tab=service`,
          },
          {
            key: 'sessions',
            label: 'Sessions',
            href: `${base}/access?tab=sessions`,
          },
        ],
      },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    areas: [
      {
        key: 'messaging',
        label: 'Messaging',
        hint: 'Channels, delivery queue and testing',
        icon: 'chat',
        href: `${base}/messaging`,
        anyOf: ['platform:integrations_read', 'platform:monitoring_read'],
        tabs: [
          { key: 'overview', label: 'Overview', href: `${base}/messaging` },
          {
            key: 'delivery',
            label: 'Delivery queue',
            href: `${base}/messaging/delivery`,
          },
          {
            key: 'notifications',
            label: 'In-app',
            href: `${base}/messaging/notifications`,
          },
          {
            key: 'testing',
            label: 'Testing',
            href: `${base}/messaging/testing`,
          },
        ],
      },
      {
        key: 'integrations',
        label: 'Integrations',
        hint: 'Providers and webhooks',
        icon: 'globe',
        href: `${base}/integrations`,
        anyOf: ['platform:integrations_read', 'platform:integrations_write'],
        tabs: [
          {
            key: 'directory',
            label: 'Providers',
            href: `${base}/integrations`,
          },
          {
            key: 'webhooks',
            label: 'Webhooks',
            href: `${base}/integrations?tab=webhooks`,
          },
        ],
      },
      {
        key: 'monitoring',
        label: 'System monitoring',
        hint: 'Jobs, correlation, health',
        icon: 'chart',
        href: `${base}/monitoring`,
        anyOf: ['platform:monitoring_read'],
        tabs: [
          { key: 'overview', label: 'Overview', href: `${base}/monitoring` },
          {
            key: 'jobs',
            label: 'Background jobs',
            href: `${base}/monitoring?tab=jobs`,
          },
          {
            key: 'correlate',
            label: 'Correlation',
            href: `${base}/monitoring?tab=correlate`,
          },
          {
            key: 'logs',
            label: 'Log explorer',
            href: `${base}/monitoring?tab=logs`,
          },
        ],
      },
      {
        key: 'incidents',
        label: 'Incidents',
        hint: 'Report, acknowledge and resolve',
        icon: 'alert',
        href: `${base}/incidents`,
        anyOf: ['platform:support_cases'],
        tabs: [
          { key: 'queue', label: 'Incident queue', href: `${base}/incidents` },
          {
            key: 'new',
            label: 'Report incident',
            href: `${base}/incidents/new`,
          },
        ],
      },
      {
        key: 'support',
        label: 'Support centre',
        hint: 'Cases and controlled tenant sessions',
        icon: 'chat',
        href: `${base}/support`,
        anyOf: ['platform:support_cases', 'platform:impersonate_tenant'],
        tabs: [
          { key: 'cases', label: 'Cases', href: `${base}/support` },
          {
            key: 'sessions',
            label: 'Support sessions',
            href: `${base}/support?tab=sessions`,
          },
        ],
      },
      {
        key: 'fault',
        label: 'Fault response',
        hint: 'Signals and runbooks',
        icon: 'alert',
        href: `${base}/fault`,
        anyOf: ['platform:read'],
        tabs: [],
      },
    ],
  },
  {
    key: 'security',
    label: 'Security & insight',
    areas: [
      {
        key: 'security',
        label: 'Security',
        hint: 'Findings, reviews, break-glass',
        icon: 'shield',
        href: `${base}/security`,
        anyOf: [
          'platform:security_read',
          'platform:findings_manage',
          'platform:access_reviews',
          'platform:break_glass',
        ],
        tabs: [
          { key: 'findings', label: 'Findings', href: `${base}/security` },
          {
            key: 'reviews',
            label: 'Access reviews',
            href: `${base}/security?tab=reviews`,
          },
          {
            key: 'breakglass',
            label: 'Break-glass',
            href: `${base}/security?tab=breakglass`,
          },
        ],
      },
      {
        key: 'audit',
        label: 'Audit',
        hint: 'Operator and tenant activity',
        icon: 'file',
        href: `${base}/audit`,
        anyOf: ['platform:audit_read', 'platform:security_read'],
        tabs: [
          {
            key: 'platform',
            label: 'Platform operators',
            href: `${base}/audit`,
          },
          {
            key: 'tenant',
            label: 'Tenant activity',
            href: `${base}/audit?scope=tenant`,
          },
        ],
      },
      {
        key: 'growth',
        label: 'Growth',
        hint: 'Snapshots and adoption',
        icon: 'chart',
        href: `${base}/growth`,
        anyOf: ['platform:read', 'platform:metrics_write'],
        tabs: [],
      },
      {
        key: 'analytics',
        label: 'Analytics',
        hint: 'Aggregate reports',
        icon: 'chart',
        href: `${base}/analytics`,
        anyOf: ['platform:analytics_read'],
        tabs: [],
      },
    ],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    areas: [
      {
        key: 'configuration',
        label: 'Platform configuration',
        hint: 'Defaults and tenant suggestions',
        icon: 'wrench',
        href: `${base}/configuration`,
        anyOf: ['platform:config_read', 'platform:config_write'],
        tabs: [],
      },
      {
        key: 'settings',
        label: 'Platform settings',
        hint: 'Global flags and identity',
        icon: 'settings',
        href: `${base}/settings`,
        anyOf: ['platform:config_read', 'platform:config_write'],
        tabs: [],
      },
    ],
  },
];

export function consoleArea(key: string): ConsoleArea {
  for (const group of PLATFORM_CONSOLE) {
    const area = group.areas.find((candidate) => candidate.key === key);
    if (area) return area;
  }
  throw new Error(`Unknown console area: ${key}`);
}

export function consoleGroupForArea(areaKey: string): ConsoleGroup {
  const group = PLATFORM_CONSOLE.find((candidate) =>
    candidate.areas.some((item) => item.key === areaKey),
  );
  if (!group) throw new Error(`Unknown console area: ${areaKey}`);
  return group;
}

export function canSeeArea(
  perms: Set<string>,
  anyOf: readonly string[],
): boolean {
  if (perms.has('platform:admin')) return true;
  return anyOf.some((p) => perms.has(p));
}

export function navGroupsFromConsole(
  perms: Set<string>,
): Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: IconName }>;
}> {
  return PLATFORM_CONSOLE.map((group) => ({
    label: group.label,
    items: group.areas
      .filter((area) => canSeeArea(perms, area.anyOf))
      .map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((g) => g.items.length > 0);
}

/**
 * Church-admin modules the console opens after an audited enter-tenant.
 * Mirrors RentFlow WORKSPACE_MODULES.
 */
export const CHURCH_WORKSPACE_MODULES: {
  href: string;
  label: string;
  icon: IconName;
}[] = [
  { href: '/admin/people', label: 'People', icon: 'users' },
  { href: '/admin/households', label: 'Households', icon: 'home' },
  { href: '/admin/memberships', label: 'Memberships', icon: 'users' },
  { href: '/admin/ministries', label: 'Ministries', icon: 'church' },
  { href: '/admin/events', label: 'Events', icon: 'calendar' },
  { href: '/admin/attendance', label: 'Attendance', icon: 'check' },
  { href: '/admin/finance', label: 'Finance', icon: 'chart' },
  { href: '/admin/messaging/jobs', label: 'Messaging jobs', icon: 'chat' },
  { href: '/admin/leadership', label: 'Leadership', icon: 'users' },
  { href: '/admin/settings', label: 'Church settings', icon: 'settings' },
];
