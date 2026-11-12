import {
  hasPlatformPermission,
  type PlatformCtx,
} from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertPlatformRead(ctx: PlatformCtx): void {
  if (
    !hasPlatformPermission(ctx, 'platform:read') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}

export function assertPlatformAdmin(ctx: PlatformCtx): void {
  if (!hasPlatformPermission(ctx, 'platform:admin')) {
    throw forbidden();
  }
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
  if (
    !hasPlatformPermission(ctx, 'platform:impersonate_tenant') &&
    !hasPlatformPermission(ctx, 'platform:admin')
  ) {
    throw forbidden();
  }
}
