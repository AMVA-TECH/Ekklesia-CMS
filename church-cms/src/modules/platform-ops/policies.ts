import {
  hasPlatformPermission,
  type PlatformCtx,
} from '@/platform/auth';
import { forbidden } from '@/platform/errors';
import type { PlatformPermissionCode } from './platform-permissions';

/** Require a specific platform permission (admin still satisfies via hasPlatformPermission). */
export function assertPlatformCan(
  ctx: PlatformCtx,
  permission: PlatformPermissionCode | string,
): void {
  if (!hasPlatformPermission(ctx, permission)) {
    throw forbidden();
  }
}

export function assertPlatformRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:read') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformAdmin(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:admin');
}

export function assertPlatformSecurityRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:security_read') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformImpersonate(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:impersonate_tenant');
}

export function assertPlatformChurchesRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:churches_read') &&
    !hasPlatformPermission(ctx, 'platform:read') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformChurchesWrite(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:churches_write');
}

export function assertPlatformApplicationsReview(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:applications_review') &&
    !hasPlatformPermission(ctx, 'platform:applications_decide') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformApplicationsDecide(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:applications_decide');
}

export function assertPlatformOperatorsManage(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:operators_manage');
}

export function assertPlatformAccountsRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:accounts_read') &&
    !hasPlatformPermission(ctx, 'platform:accounts_write') &&
    !hasPlatformPermission(ctx, 'platform:operators_manage') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformAccountsWrite(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:accounts_write');
}

export function assertPlatformServiceAccounts(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:service_accounts');
}

export function assertPlatformIntegrationsRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:integrations_read') &&
    !hasPlatformPermission(ctx, 'platform:integrations_write') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformIntegrationsWrite(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:integrations_write');
}

export function assertPlatformMonitoringRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:monitoring_read') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformSupportCases(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:support_cases');
}

export function assertPlatformAccessReviews(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:access_reviews');
}

export function assertPlatformBreakGlass(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:break_glass');
}

export function assertPlatformAuditRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:audit_read') &&
    !hasPlatformPermission(ctx, 'platform:security_read') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformFindingsManage(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:findings_manage');
}

export function assertPlatformMetricsWrite(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:metrics_write');
}

export function assertPlatformAnalyticsRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:analytics_read') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformConfigRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:config_read') &&
    !hasPlatformPermission(ctx, 'platform:config_write') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformConfigWrite(ctx: PlatformCtx): void {
  assertPlatformCan(ctx, 'platform:config_write');
}
