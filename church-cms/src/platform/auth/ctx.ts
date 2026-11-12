import type { PermissionCode } from '@/modules/access-control/permissions';
import type { AuthScope } from '@/modules/access-control/can';

export interface Actor {
  userAccountId: string;
  personId?: string;
  email?: string;
}

/**
 * Request context passed as the first argument to every service function.
 * churchId always comes from the server-side session — never from the client body.
 */
export interface Ctx {
  actor: Actor;
  churchId: string;
  requestId: string;
  locale: 'sw' | 'en';
  /** Effective permission codes for this request (roles + active delegations). */
  permissions: ReadonlySet<PermissionCode | string>;
  scopesByPermission?: ReadonlyMap<string, AuthScope[]>;
  /** True when the actor is an active platform operator (ADR-0003). */
  isPlatformOperator?: boolean;
}

/**
 * Platform-scoped context for `/api/v1/platform/*` (ADR-0003).
 * churchId is optional until the operator enters a tenant.
 */
export interface PlatformCtx {
  actor: Actor;
  requestId: string;
  locale: 'sw' | 'en';
  /** Platform permission codes from `platform_operators`. */
  platformPermissions: ReadonlySet<PermissionCode | string>;
  /** Active church when operator has entered a tenant (support pin). */
  churchId?: string;
  isPlatformOperator: true;
}

export function hasPermission(ctx: Ctx, permission: PermissionCode): boolean {
  return ctx.permissions.has(permission);
}

export function hasPlatformPermission(
  ctx: PlatformCtx,
  permission: PermissionCode | string,
): boolean {
  if (ctx.platformPermissions.has('platform:admin')) return true;
  return ctx.platformPermissions.has(permission);
}
