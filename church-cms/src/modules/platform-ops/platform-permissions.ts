/**
 * Platform control-plane permission catalogue (ADR-0003).
 * Separate from church `resource:action` codes — never assign these to church roles.
 */

export const PLATFORM_PERMISSIONS = [
  'platform:read',
  'platform:admin',
  'platform:impersonate_tenant',
  'platform:security_read',
  'platform:churches_read',
  'platform:churches_write',
  'platform:applications_review',
  'platform:applications_decide',
  'platform:operators_manage',
  'platform:accounts_read',
  'platform:accounts_write',
  'platform:service_accounts',
  'platform:audit_read',
  'platform:findings_manage',
  'platform:metrics_write',
  'platform:config_read',
  'platform:config_write',
  'platform:integrations_read',
  'platform:integrations_write',
  'platform:support_cases',
  'platform:access_reviews',
  'platform:break_glass',
  'platform:monitoring_read',
  'platform:analytics_read',
] as const;

export type PlatformPermissionCode = (typeof PLATFORM_PERMISSIONS)[number];

export const PLATFORM_PERMISSION_META: Record<
  PlatformPermissionCode,
  { description: string; sensitivity: 'standard' | 'sensitive' | 'high_risk' }
> = {
  'platform:read': {
    description: 'View platform overview and aggregate health',
    sensitivity: 'sensitive',
  },
  'platform:admin': {
    description: 'Full platform administrator super-set (privileged)',
    sensitivity: 'high_risk',
  },
  'platform:impersonate_tenant': {
    description: 'Enter a tenant for controlled support',
    sensitivity: 'high_risk',
  },
  'platform:security_read': {
    description: 'View security findings and related security evidence',
    sensitivity: 'high_risk',
  },
  'platform:churches_read': {
    description: 'View church tenant directory (aggregate fields)',
    sensitivity: 'sensitive',
  },
  'platform:churches_write': {
    description: 'Create or update tenants / apply templates',
    sensitivity: 'high_risk',
  },
  'platform:applications_review': {
    description: 'View and assign church registration applications',
    sensitivity: 'sensitive',
  },
  'platform:applications_decide': {
    description: 'Approve or reject church registration applications',
    sensitivity: 'high_risk',
  },
  'platform:operators_manage': {
    description: 'Invite and manage platform operators',
    sensitivity: 'high_risk',
  },
  'platform:accounts_read': {
    description: 'View platform/tenant technical accounts, MFA flags, and sessions',
    sensitivity: 'sensitive',
  },
  'platform:accounts_write': {
    description:
      'Suspend/restore accounts and revoke sessions (no church governance edits)',
    sensitivity: 'high_risk',
  },
  'platform:service_accounts': {
    description: 'Create, rotate, and revoke non-human service account credentials',
    sensitivity: 'high_risk',
  },
  'platform:audit_read': {
    description: 'Read platform audit events',
    sensitivity: 'high_risk',
  },
  'platform:findings_manage': {
    description: 'Acknowledge or resolve security findings; run detectors',
    sensitivity: 'high_risk',
  },
  'platform:metrics_write': {
    description: 'Write platform metric snapshots',
    sensitivity: 'sensitive',
  },
  'platform:config_read': {
    description: 'View global platform configuration',
    sensitivity: 'sensitive',
  },
  'platform:config_write': {
    description: 'Change global platform configuration',
    sensitivity: 'high_risk',
  },
  'platform:integrations_read': {
    description: 'View integration directory, webhook monitor, and health evidence',
    sensitivity: 'sensitive',
  },
  'platform:integrations_write': {
    description: 'Manual webhook replay and integration directory updates',
    sensitivity: 'high_risk',
  },
  'platform:support_cases': {
    description: 'Manage support cases and controlled support sessions',
    sensitivity: 'high_risk',
  },
  'platform:access_reviews': {
    description: 'Create and complete platform access reviews',
    sensitivity: 'high_risk',
  },
  'platform:break_glass': {
    description: 'Issue and revoke time-limited emergency privilege grants',
    sensitivity: 'high_risk',
  },
  'platform:monitoring_read': {
    description: 'View system monitoring and technical logs',
    sensitivity: 'sensitive',
  },
  'platform:analytics_read': {
    description: 'View platform analytics and reports',
    sensitivity: 'sensitive',
  },
};

/** Bootstrap / owner-style grant: full platform catalogue. */
export const PLATFORM_OWNER_PERMISSIONS: readonly PlatformPermissionCode[] = [
  ...PLATFORM_PERMISSIONS,
];

/**
 * Default grant for a new Platform Administrator (includes admin super-set).
 * Existing four-code operators remain valid; admin still bypasses checks.
 */
export const DEFAULT_PLATFORM_PERMISSIONS: readonly PlatformPermissionCode[] = [
  'platform:read',
  'platform:admin',
  'platform:impersonate_tenant',
  'platform:security_read',
  'platform:churches_read',
  'platform:churches_write',
  'platform:applications_review',
  'platform:applications_decide',
  'platform:operators_manage',
  'platform:accounts_read',
  'platform:accounts_write',
  'platform:service_accounts',
  'platform:integrations_read',
  'platform:integrations_write',
  'platform:support_cases',
  'platform:access_reviews',
  'platform:break_glass',
  'platform:monitoring_read',
  'platform:audit_read',
  'platform:findings_manage',
  'platform:metrics_write',
  'platform:config_read',
  'platform:config_write',
  'platform:analytics_read',
];

/** Proposed role → permission map (documentation + future role templates). */
export const PLATFORM_ROLE_TEMPLATES = [
  {
    code: 'platform_owner',
    name: 'Platform Owner',
    protected: true,
    permissions: PLATFORM_OWNER_PERMISSIONS,
  },
  {
    code: 'platform_administrator',
    name: 'Platform Administrator',
    protected: false,
    permissions: DEFAULT_PLATFORM_PERMISSIONS,
  },
  {
    code: 'platform_operations',
    name: 'Platform Operations Administrator',
    protected: false,
    permissions: [
      'platform:read',
      'platform:churches_read',
      'platform:integrations_read',
      'platform:monitoring_read',
      'platform:metrics_write',
      'platform:analytics_read',
      'platform:config_read',
    ] as const satisfies readonly PlatformPermissionCode[],
  },
  {
    code: 'platform_support',
    name: 'Platform Support Administrator',
    protected: false,
    permissions: [
      'platform:read',
      'platform:churches_read',
      'platform:applications_review',
      'platform:accounts_read',
      'platform:integrations_read',
      'platform:support_cases',
      'platform:impersonate_tenant',
      'platform:audit_read',
    ] as const satisfies readonly PlatformPermissionCode[],
  },
  {
    code: 'platform_security',
    name: 'Platform Security Administrator',
    protected: false,
    permissions: [
      'platform:read',
      'platform:security_read',
      'platform:audit_read',
      'platform:findings_manage',
      'platform:operators_manage',
      'platform:accounts_read',
      'platform:accounts_write',
      'platform:service_accounts',
      'platform:integrations_read',
      'platform:integrations_write',
      'platform:access_reviews',
      'platform:break_glass',
    ] as const satisfies readonly PlatformPermissionCode[],
  },
  {
    code: 'platform_auditor',
    name: 'Platform Auditor',
    protected: false,
    permissions: [
      'platform:read',
      'platform:audit_read',
      'platform:security_read',
      'platform:analytics_read',
      'platform:churches_read',
      'platform:accounts_read',
      'platform:integrations_read',
      'platform:access_reviews',
    ] as const satisfies readonly PlatformPermissionCode[],
  },
] as const;

export function isPlatformPermissionCode(
  value: string,
): value is PlatformPermissionCode {
  return (PLATFORM_PERMISSIONS as readonly string[]).includes(value);
}
