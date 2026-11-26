import type { PermissionCode } from './permissions';
import { PERMISSIONS } from './permissions';

export type PermissionSensitivity = 'standard' | 'sensitive' | 'high_risk';

export type PermissionMeta = {
  code: PermissionCode;
  module: string;
  description: string;
  sensitivity: PermissionSensitivity;
};

/** Platform-maintained catalogue metadata (codes stay in PERMISSIONS). */
export const PERMISSION_CATALOGUE: readonly PermissionMeta[] = [
  { code: 'church:read', module: 'church', description: 'View church profile and settings', sensitivity: 'standard' },
  { code: 'church:update', module: 'church', description: 'Update church profile and configuration', sensitivity: 'sensitive' },
  { code: 'roles:read', module: 'access', description: 'View roles and assignments', sensitivity: 'sensitive' },
  { code: 'roles:assign', module: 'access', description: 'Assign roles and manage role permissions', sensitivity: 'high_risk' },
  { code: 'audit:read', module: 'access', description: 'View church audit events', sensitivity: 'sensitive' },
  { code: 'exports:run', module: 'access', description: 'Run data exports', sensitivity: 'high_risk' },
  { code: 'imports:run', module: 'access', description: 'Run data imports', sensitivity: 'high_risk' },
  { code: 'media:upload', module: 'access', description: 'Upload media assets', sensitivity: 'standard' },
  { code: 'people:read', module: 'people', description: 'View people records', sensitivity: 'sensitive' },
  { code: 'people:create', module: 'people', description: 'Create people', sensitivity: 'sensitive' },
  { code: 'people:update', module: 'people', description: 'Update people', sensitivity: 'sensitive' },
  { code: 'people:delete', module: 'people', description: 'Soft-delete people', sensitivity: 'high_risk' },
  { code: 'people:read_restricted', module: 'people', description: 'View restricted personal fields', sensitivity: 'high_risk' },
  { code: 'households:read', module: 'people', description: 'View households', sensitivity: 'sensitive' },
  { code: 'households:write', module: 'people', description: 'Manage households', sensitivity: 'sensitive' },
  { code: 'directory:read', module: 'people', description: 'View opt-in directory', sensitivity: 'standard' },
  { code: 'memberships:read', module: 'membership', description: 'View memberships', sensitivity: 'sensitive' },
  { code: 'memberships:create', module: 'membership', description: 'Create memberships', sensitivity: 'sensitive' },
  { code: 'memberships:approve', module: 'membership', description: 'Approve membership requests', sensitivity: 'sensitive' },
  { code: 'memberships:update_status', module: 'membership', description: 'Update membership status', sensitivity: 'sensitive' },
  { code: 'units:read', module: 'organisation', description: 'View organisational structure', sensitivity: 'standard' },
  { code: 'units:write', module: 'organisation', description: 'Manage organisational units', sensitivity: 'sensitive' },
  { code: 'programmes:write', module: 'organisation', description: 'Manage programmes', sensitivity: 'sensitive' },
  { code: 'positions:write', module: 'organisation', description: 'Manage leadership positions', sensitivity: 'sensitive' },
  { code: 'appointments:write', module: 'organisation', description: 'Manage appointments (not RBAC)', sensitivity: 'sensitive' },
  { code: 'participations:read', module: 'ministries', description: 'View participations', sensitivity: 'standard' },
  { code: 'participations:request', module: 'ministries', description: 'Request participation', sensitivity: 'standard' },
  { code: 'participations:approve', module: 'ministries', description: 'Approve participation', sensitivity: 'sensitive' },
  { code: 'events:read', module: 'events', description: 'View events', sensitivity: 'standard' },
  { code: 'events:write', module: 'events', description: 'Create and update events', sensitivity: 'sensitive' },
  { code: 'events:register', module: 'events', description: 'Register for events', sensitivity: 'standard' },
  { code: 'attendance:read', module: 'attendance', description: 'View attendance', sensitivity: 'sensitive' },
  { code: 'attendance:record', module: 'attendance', description: 'Record attendance', sensitivity: 'sensitive' },
  { code: 'attendance:check_in_self', module: 'attendance', description: 'Self check-in', sensitivity: 'standard' },
  { code: 'attendance:correct_request', module: 'attendance', description: 'Request attendance correction', sensitivity: 'standard' },
  { code: 'attendance:correct_resolve', module: 'attendance', description: 'Resolve attendance corrections', sensitivity: 'sensitive' },
  { code: 'attendance:absence_notice', module: 'attendance', description: 'Submit absence notice', sensitivity: 'standard' },
  { code: 'attendance:stats_leadership', module: 'attendance', description: 'View leadership attendance stats', sensitivity: 'sensitive' },
  { code: 'projects:read', module: 'finance', description: 'View projects', sensitivity: 'standard' },
  { code: 'projects:write', module: 'finance', description: 'Manage projects', sensitivity: 'sensitive' },
  { code: 'projects:assign', module: 'finance', description: 'Assign people to projects', sensitivity: 'sensitive' },
  { code: 'projects:interest', module: 'finance', description: 'Express project interest', sensitivity: 'standard' },
  { code: 'funds:read', module: 'finance', description: 'View funds', sensitivity: 'sensitive' },
  { code: 'funds:write', module: 'finance', description: 'Manage funds', sensitivity: 'high_risk' },
  { code: 'accounts:read', module: 'finance', description: 'View accounts', sensitivity: 'sensitive' },
  { code: 'accounts:write', module: 'finance', description: 'Manage accounts', sensitivity: 'high_risk' },
  { code: 'periods:write', module: 'finance', description: 'Manage accounting periods', sensitivity: 'high_risk' },
  { code: 'journals:read', module: 'finance', description: 'View journals', sensitivity: 'sensitive' },
  { code: 'journals:draft', module: 'finance', description: 'Draft journals', sensitivity: 'sensitive' },
  { code: 'journals:post', module: 'finance', description: 'Post journals', sensitivity: 'high_risk' },
  { code: 'journals:reverse', module: 'finance', description: 'Reverse journals', sensitivity: 'high_risk' },
  { code: 'disbursements:request', module: 'finance', description: 'Request disbursements/expenses', sensitivity: 'sensitive' },
  { code: 'disbursements:approve', module: 'finance', description: 'Approve disbursements/expenses', sensitivity: 'high_risk' },
  { code: 'budgets:read', module: 'finance', description: 'View budgets', sensitivity: 'sensitive' },
  { code: 'budgets:write', module: 'finance', description: 'Manage budgets', sensitivity: 'sensitive' },
  { code: 'finance_reports:read', module: 'finance', description: 'View financial reports', sensitivity: 'sensitive' },
  { code: 'offerings:write', module: 'finance', description: 'Record offerings', sensitivity: 'sensitive' },
  { code: 'pledges:read', module: 'finance', description: 'View pledges', sensitivity: 'sensitive' },
  { code: 'pledges:write', module: 'finance', description: 'Manage pledges', sensitivity: 'sensitive' },
  { code: 'pledges:follow_up', module: 'finance', description: 'Follow up on pledges', sensitivity: 'sensitive' },
  { code: 'templates:write', module: 'messaging', description: 'Manage message templates', sensitivity: 'sensitive' },
  { code: 'messages:send', module: 'messaging', description: 'Send messages', sensitivity: 'sensitive' },
  { code: 'messages:bulk_send', module: 'messaging', description: 'Bulk send messages', sensitivity: 'high_risk' },
  { code: 'announcements:write', module: 'messaging', description: 'Draft announcements', sensitivity: 'sensitive' },
  { code: 'announcements:publish', module: 'messaging', description: 'Publish announcements', sensitivity: 'sensitive' },
  { code: 'preferences:self', module: 'messaging', description: 'Manage own preferences', sensitivity: 'standard' },
  { code: 'platform:read', module: 'platform', description: 'Platform read access', sensitivity: 'high_risk' },
  { code: 'platform:admin', module: 'platform', description: 'Platform administration', sensitivity: 'high_risk' },
  { code: 'platform:impersonate_tenant', module: 'platform', description: 'Enter tenant support mode', sensitivity: 'high_risk' },
  { code: 'platform:security_read', module: 'platform', description: 'Read platform security findings', sensitivity: 'high_risk' },
] as const;

const BY_CODE = new Map(PERMISSION_CATALOGUE.map((p) => [p.code, p]));

export function getPermissionMeta(code: string): PermissionMeta | undefined {
  return BY_CODE.get(code as PermissionCode);
}

/** Church-facing catalogue excludes platform:* codes. */
export function listChurchPermissionCatalogue(): PermissionMeta[] {
  return PERMISSION_CATALOGUE.filter((p) => !p.code.startsWith('platform:'));
}

/** Ensure catalogue covers every PERMISSIONS entry (dev invariant). */
export function assertCatalogueComplete(): void {
  for (const code of PERMISSIONS) {
    if (!BY_CODE.has(code)) {
      throw new Error(`Missing permission catalogue entry for ${code}`);
    }
  }
}
