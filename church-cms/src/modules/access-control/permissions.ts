/** Stable global permission codes (see 11_RBAC_AND_PERMISSIONS.md). */
export const PERMISSIONS = [
  // Church & access
  'church:read',
  'church:update',
  'roles:read',
  'roles:assign',
  'audit:read',
  'exports:run',
  'imports:run',
  'media:upload',
  // People & households
  'people:read',
  'people:create',
  'people:update',
  'people:delete',
  'people:read_restricted',
  'households:read',
  'households:write',
  'directory:read',
  // Membership
  'memberships:read',
  'memberships:create',
  'memberships:approve',
  'memberships:update_status',
  // Organisation
  'units:read',
  'units:write',
  'programmes:write',
  'positions:write',
  'appointments:write',
  // Participation
  'participations:read',
  'participations:request',
  'participations:approve',
  // Events & attendance
  'events:read',
  'events:write',
  'events:register',
  'attendance:read',
  'attendance:record',
  'attendance:check_in_self',
  'attendance:correct_request',
  'attendance:correct_resolve',
  'attendance:absence_notice',
  'attendance:stats_leadership',
  // Projects
  'projects:read',
  'projects:write',
  'projects:assign',
  'projects:interest',
  // Accounting
  'funds:read',
  'funds:write',
  'accounts:read',
  'accounts:write',
  'periods:write',
  'journals:read',
  'journals:draft',
  'journals:post',
  'journals:reverse',
  'disbursements:request',
  'disbursements:approve',
  'budgets:read',
  'budgets:write',
  'finance_reports:read',
  'offerings:write',
  'pledges:read',
  'pledges:write',
  'pledges:follow_up',
  // Messaging
  'templates:write',
  'messages:send',
  'messages:bulk_send',
  'announcements:write',
  'announcements:publish',
  'preferences:self',
  // Platform operator (global — ADR-0003)
  'platform:read',
  'platform:admin',
  'platform:impersonate_tenant',
  'platform:security_read',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

/** Seed role codes (per church). */
export const ROLE_CODES = [
  'platform_operator',
  'senior_pastor',
  'pastoral_leadership',
  'church_administrator',
  'pogs',
  'finance_officer',
  'chief_financial_steward',
  'ministry_leader',
  'department_head',
  'registrar',
  'event_recorder',
  'announcer',
  'member',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];
