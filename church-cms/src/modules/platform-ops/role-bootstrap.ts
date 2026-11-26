import type { PermissionCode } from '@/modules/access-control/permissions';
import type { RoleScopeType } from '@/modules/access-control/constants';

/** Church Administrator — ops without finance approve/post/reverse (SoD). */
export const CHURCH_ADMINISTRATOR_PERMISSIONS = [
  'people:read',
  'people:create',
  'people:update',
  'households:read',
  'households:write',
  'memberships:read',
  'memberships:create',
  'memberships:update_status',
  'memberships:approve',
  'units:read',
  'units:write',
  'programmes:write',
  'positions:write',
  'appointments:write',
  'participations:read',
  'participations:request',
  'participations:approve',
  'events:read',
  'events:write',
  'events:register',
  'attendance:read',
  'attendance:record',
  'attendance:stats_leadership',
  'attendance:absence_notice',
  'attendance:check_in_self',
  'attendance:correct_request',
  'attendance:correct_resolve',
  'templates:write',
  'announcements:write',
  'announcements:publish',
  'preferences:self',
  'messages:send',
  'messages:bulk_send',
  'projects:read',
  'projects:write',
  'projects:assign',
  'projects:interest',
  'directory:read',
  'media:upload',
  'audit:read',
  'church:read',
  'church:update',
  'roles:read',
  'roles:assign',
  'exports:run',
  'imports:run',
] as const satisfies readonly PermissionCode[];

/** Permission codes for the default member role. */
export const MEMBER_ROLE_PERMISSIONS = [
  'church:read',
  'preferences:self',
  'directory:read',
  'units:read',
  'participations:request',
  'events:read',
  'events:register',
  'attendance:read',
  'attendance:check_in_self',
  'attendance:absence_notice',
  'attendance:correct_request',
  'projects:read',
  'projects:interest',
  'pledges:read',
] as const satisfies readonly PermissionCode[];

/** Senior Pastor — church-wide oversight incl. roles:assign (RBAC matrix). */
export const SENIOR_PASTOR_PERMISSIONS = [
  'church:read',
  'church:update',
  'people:read',
  'people:create',
  'people:update',
  'people:read_restricted',
  'households:read',
  'households:write',
  'memberships:read',
  'memberships:create',
  'memberships:update_status',
  'memberships:approve',
  'units:read',
  'units:write',
  'appointments:write',
  'events:read',
  'events:write',
  'attendance:read',
  'attendance:record',
  'attendance:stats_leadership',
  'projects:read',
  'projects:write',
  'disbursements:approve',
  'finance_reports:read',
  'messages:send',
  'messages:bulk_send',
  'announcements:write',
  'announcements:publish',
  'directory:read',
  'roles:read',
  'roles:assign',
  'audit:read',
] as const satisfies readonly PermissionCode[];

/** Other pastors — pastoral ops without roles:assign / church:update. */
export const PASTORAL_LEADERSHIP_PERMISSIONS = [
  'church:read',
  'people:read',
  'people:create',
  'people:update',
  'people:read_restricted',
  'households:read',
  'households:write',
  'memberships:read',
  'memberships:approve',
  'units:read',
  'events:read',
  'events:write',
  'attendance:read',
  'attendance:record',
  'attendance:stats_leadership',
  'projects:read',
  'disbursements:approve',
  'finance_reports:read',
  'announcements:write',
  'announcements:publish',
  'directory:read',
  'roles:read',
] as const satisfies readonly PermissionCode[];

/**
 * Finance Officer — recording path. Requests disbursements; does not approve.
 * May draft and post journals; reverse reserved for steward.
 */
export const FINANCE_OFFICER_PERMISSIONS = [
  'funds:read',
  'funds:write',
  'accounts:read',
  'accounts:write',
  'periods:write',
  'offerings:write',
  'pledges:read',
  'pledges:write',
  'pledges:follow_up',
  'journals:read',
  'journals:draft',
  'journals:post',
  'disbursements:request',
  'finance_reports:read',
  'budgets:read',
  'budgets:write',
  'church:read',
  'people:read',
  'audit:read',
] as const satisfies readonly PermissionCode[];

export const CHIEF_FINANCIAL_STEWARD_PERMISSIONS = [
  'church:read',
  'funds:read',
  'funds:write',
  'accounts:read',
  'accounts:write',
  'journals:read',
  'journals:reverse',
  'disbursements:approve',
  'finance_reports:read',
  'budgets:read',
  'audit:read',
] as const satisfies readonly PermissionCode[];

export const MINISTRY_LEADER_PERMISSIONS = [
  'church:read',
  'people:read',
  'people:create',
  'people:update',
  'units:read',
  'participations:read',
  'participations:approve',
  'events:read',
  'events:write',
  'attendance:read',
  'attendance:record',
  'attendance:stats_leadership',
  'projects:read',
  'projects:write',
  'announcements:write',
  'announcements:publish',
  'directory:read',
  'preferences:self',
] as const satisfies readonly PermissionCode[];

export const DEPARTMENT_HEAD_PERMISSIONS = [
  'church:read',
  'people:read',
  'units:read',
  'events:read',
  'events:write',
  'attendance:read',
  'attendance:record',
  'directory:read',
  'preferences:self',
] as const satisfies readonly PermissionCode[];

export const REGISTRAR_PERMISSIONS = [
  'church:read',
  'people:read',
  'people:create',
  'people:update',
  'households:read',
  'households:write',
  'memberships:read',
  'memberships:create',
  'memberships:approve',
  'memberships:update_status',
  'directory:read',
  'imports:run',
  'preferences:self',
] as const satisfies readonly PermissionCode[];

export const EVENT_RECORDER_PERMISSIONS = [
  'church:read',
  'events:read',
  'attendance:read',
  'attendance:record',
  'preferences:self',
] as const satisfies readonly PermissionCode[];

export const ANNOUNCER_PERMISSIONS = [
  'church:read',
  'announcements:write',
  'announcements:publish',
  'messages:send',
  'messages:bulk_send',
  'templates:write',
  'preferences:self',
] as const satisfies readonly PermissionCode[];

export const AUDITOR_PERMISSIONS = [
  'church:read',
  'people:read',
  'people:read_restricted',
  'finance_reports:read',
  'journals:read',
  'funds:read',
  'accounts:read',
  'audit:read',
  'roles:read',
  'preferences:self',
] as const satisfies readonly PermissionCode[];

export type RoleTemplateDef = {
  code: string;
  name: string;
  description: string;
  permissions: readonly PermissionCode[];
  allowedScopes: readonly RoleScopeType[];
  /** When true, created automatically on new church bootstrap. */
  bootstrap: boolean;
};

/** Full platform template library (opt-in + bootstrap). */
export const ROLE_TEMPLATES: readonly RoleTemplateDef[] = [
  {
    code: 'church_administrator',
    name: 'Church Administrator',
    description: 'Church-wide operations and access management without finance approve/post.',
    permissions: CHURCH_ADMINISTRATOR_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: true,
  },
  {
    code: 'senior_pastor',
    name: 'Senior Pastor',
    description: 'Church-wide oversight template (pilot label; not a hard-coded auth title).',
    permissions: SENIOR_PASTOR_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: true,
  },
  {
    code: 'pastoral_leadership',
    name: 'Pastoral Leadership',
    description: 'Pastoral operations without roles:assign.',
    permissions: PASTORAL_LEADERSHIP_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: true,
  },
  {
    code: 'member',
    name: 'Member',
    description: 'Member portal self/household capabilities.',
    permissions: MEMBER_ROLE_PERMISSIONS,
    allowedScopes: ['self', 'household'],
    bootstrap: true,
  },
  {
    code: 'finance_officer',
    name: 'Finance Officer',
    description: 'Financial recording; may request but not approve disbursements.',
    permissions: FINANCE_OFFICER_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: true,
  },
  {
    code: 'chief_financial_steward',
    name: 'Chief Financial Steward',
    description: 'Finance oversight and disbursement approval.',
    permissions: CHIEF_FINANCIAL_STEWARD_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: false,
  },
  {
    code: 'ministry_leader',
    name: 'Ministry Leader',
    description: 'Manage an assigned ministry (organisational unit scope).',
    permissions: MINISTRY_LEADER_PERMISSIONS,
    allowedScopes: ['organisational_unit'],
    bootstrap: false,
  },
  {
    code: 'department_head',
    name: 'Department Head',
    description: 'Manage an assigned department (organisational unit scope).',
    permissions: DEPARTMENT_HEAD_PERMISSIONS,
    allowedScopes: ['organisational_unit'],
    bootstrap: false,
  },
  {
    code: 'registrar',
    name: 'Membership Officer',
    description: 'Membership and people desk operations.',
    permissions: REGISTRAR_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: false,
  },
  {
    code: 'event_recorder',
    name: 'Events Coordinator',
    description: 'Event attendance recording at unit scope.',
    permissions: EVENT_RECORDER_PERMISSIONS,
    allowedScopes: ['organisational_unit'],
    bootstrap: false,
  },
  {
    code: 'announcer',
    name: 'Communications Officer',
    description: 'Announcements and messaging.',
    permissions: ANNOUNCER_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: false,
  },
  {
    code: 'auditor',
    name: 'Auditor / Reviewer',
    description: 'Read-only review of authorized records.',
    permissions: AUDITOR_PERMISSIONS,
    allowedScopes: ['church'],
    bootstrap: false,
  },
] as const;

/** Roles seeded automatically for every new church. */
export const DEFAULT_CHURCH_ROLES = ROLE_TEMPLATES.filter((t) => t.bootstrap).map(
  (t) => ({
    code: t.code,
    name: t.name,
    permissions: t.permissions,
  }),
);

/** Roles an admin may invite via leadership invite flow. */
export const INVITABLE_LEADERSHIP_ROLE_CODES = [
  'senior_pastor',
  'pastoral_leadership',
  'church_administrator',
  'finance_officer',
] as const;

export function getRoleTemplate(code: string): RoleTemplateDef | undefined {
  return ROLE_TEMPLATES.find((t) => t.code === code);
}
