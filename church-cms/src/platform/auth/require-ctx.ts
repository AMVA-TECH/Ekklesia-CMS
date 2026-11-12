import { unauthorized, forbidden } from '@/platform/errors';
import type { Ctx, Actor, PlatformCtx } from './ctx';
import type { PermissionCode } from '@/modules/access-control/permissions';

/**
 * Minimal session claims resolved by the auth layer (ADR-0002 / ADR-0003).
 * Handlers must never trust client-supplied churchId.
 */
export interface SessionClaims {
  userAccountId: string;
  personId?: string;
  email?: string;
  /** Required for church APIs; optional for platform-only sessions. */
  activeChurchId: string | null;
  permissions: ReadonlyArray<PermissionCode | string>;
  locale?: 'sw' | 'en';
  isPlatformOperator?: boolean;
  platformPermissions?: ReadonlyArray<PermissionCode | string>;
}

export interface RequireCtxInput {
  requestId: string;
  session: SessionClaims | null;
  acceptLanguage?: string | null;
}

function resolveLocale(
  session: SessionClaims,
  acceptLanguage?: string | null,
): 'sw' | 'en' {
  return (
    session.locale ??
    (acceptLanguage?.toLowerCase().startsWith('en') ? 'en' : 'sw')
  );
}

/**
 * Build a Ctx from a verified server session. Throws 401 if missing.
 * Church APIs require an active church on the session.
 */
export function requireCtx(input: RequireCtxInput): Ctx {
  if (!input.session) {
    throw unauthorized();
  }
  if (!input.session.activeChurchId) {
    throw unauthorized();
  }

  const actor: Actor = {
    userAccountId: input.session.userAccountId,
    personId: input.session.personId,
    email: input.session.email,
  };

  return {
    actor,
    churchId: input.session.activeChurchId,
    requestId: input.requestId,
    locale: resolveLocale(input.session, input.acceptLanguage),
    permissions: new Set(input.session.permissions),
    isPlatformOperator: input.session.isPlatformOperator === true,
  };
}

/**
 * Build a PlatformCtx. Requires active platform_operators membership.
 */
export function requirePlatformCtx(input: RequireCtxInput): PlatformCtx {
  if (!input.session) {
    throw unauthorized();
  }
  if (!input.session.isPlatformOperator) {
    throw forbidden();
  }

  const actor: Actor = {
    userAccountId: input.session.userAccountId,
    personId: input.session.personId,
    email: input.session.email,
  };

  return {
    actor,
    requestId: input.requestId,
    locale: resolveLocale(input.session, input.acceptLanguage),
    platformPermissions: new Set(input.session.platformPermissions ?? []),
    churchId: input.session.activeChurchId ?? undefined,
    isPlatformOperator: true,
  };
}
