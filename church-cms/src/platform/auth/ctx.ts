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
}

export function hasPermission(ctx: Ctx, permission: PermissionCode): boolean {
  return ctx.permissions.has(permission);
}
