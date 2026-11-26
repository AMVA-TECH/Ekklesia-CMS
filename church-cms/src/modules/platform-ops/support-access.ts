import { PERMISSIONS } from '@/modules/access-control/permissions';

/**
 * Church-plane permissions for controlled support enter-tenant.
 * Default `read` is diagnostic-only: no writes, no finance, no Restricted fields.
 * `interactive` is exceptional full church tooling (still excludes platform:*).
 */

const FINANCE_OR_RESTRICTED = new Set([
  'people:read_restricted',
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
]);

const CHURCH_PLANE = PERMISSIONS.filter((p) => !p.startsWith('platform:'));

/** Read-oriented support: *:read diagnostics only, no finance/Restricted. */
export const SUPPORT_READ_CHURCH_PERMISSIONS: readonly string[] =
  CHURCH_PLANE.filter(
    (p) =>
      (p.endsWith(':read') || p === 'directory:read') &&
      !FINANCE_OR_RESTRICTED.has(p),
  );

/** Interactive support: full church catalogue except platform:* codes. */
export const SUPPORT_INTERACTIVE_CHURCH_PERMISSIONS: readonly string[] =
  CHURCH_PLANE;

export type SupportAccessLevel = 'read' | 'interactive';

export function churchPermissionsForSupportAccess(
  accessLevel: SupportAccessLevel,
): readonly string[] {
  return accessLevel === 'interactive'
    ? SUPPORT_INTERACTIVE_CHURCH_PERMISSIONS
    : SUPPORT_READ_CHURCH_PERMISSIONS;
}
