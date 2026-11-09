import { unauthorized } from '@/platform/errors';
import type { Ctx, Actor } from './ctx';
import type { PermissionCode } from '@/modules/access-control/permissions';

/**
 * Minimal session claims resolved by the auth layer (ADR-0002 provider TBD).
 * Handlers must never trust client-supplied churchId.
 */
export interface SessionClaims {
  userAccountId: string;
  personId?: string;
  email?: string;
  activeChurchId: string;
  permissions: ReadonlyArray<PermissionCode | string>;
  locale?: 'sw' | 'en';
}

export interface RequireCtxInput {
  requestId: string;
  session: SessionClaims | null;
  acceptLanguage?: string | null;
}

/**
 * Build a Ctx from a verified server session. Throws 401 if missing.
 */
export function requireCtx(input: RequireCtxInput): Ctx {
  if (!input.session) {
    throw unauthorized();
  }

  const actor: Actor = {
    userAccountId: input.session.userAccountId,
    personId: input.session.personId,
    email: input.session.email,
  };

  const locale =
    input.session.locale ??
    (input.acceptLanguage?.toLowerCase().startsWith('en') ? 'en' : 'sw');

  return {
    actor,
    churchId: input.session.activeChurchId,
    requestId: input.requestId,
    locale,
    permissions: new Set(input.session.permissions),
  };
}
