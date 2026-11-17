import type {
  Session,
  SessionChurch,
  SessionRole,
  SessionUser,
} from '@/app/_ekklesia/session';
import type { AuthMeResponse } from './api-types';

/**
 * Map the backend `/api/v1/auth/me` DTO onto the UI `Session` contract.
 *
 * The backend response is richer (actor + organisationUser + mfaRequired …);
 * the UI shell only needs the slim `{ user, church, churches, roles,
 * permissions }` surface, so we project it down here instead of leaking the
 * backend shape into every component.
 */
export function toUiSession(me: AuthMeResponse): Session {
  const email = me.actor.email ?? undefined;
  const phoneE164 = me.actor.phoneE164 ?? undefined;
  // No person name on /auth/me: derive a readable one from the email
  // ("amani.juma@…" → "Amani Juma"), else the phone number.
  const displayName =
    (email && nameFromEmail(email)) || phoneE164 || 'Signed-in user';
  const initials = computeInitials(displayName);

  const user: SessionUser = {
    id: me.actor.userAccountId,
    displayName,
    email,
    phoneE164,
    initials,
    locale: me.locale,
  };

  const church: SessionChurch | null = me.church?.id
    ? {
        id: me.church.id,
        name: me.church.displayName || me.church.name || 'Your church',
        shortName: me.church.shortName ?? null,
        displayName: me.church.displayName ?? null,
        slug: me.church.slug ?? undefined,
        logoMediaId: me.church.logoMediaId ?? null,
        logoUrl: me.church.logoUrl ?? null,
        config: me.church.config ?? null,
      }
    : null;

  const roles: SessionRole[] = (me.roles ?? []).map((r) => ({
    code: r.code,
    label: r.name,
  }));

  return {
    user,
    church,
    churches: church ? [church] : [],
    roles,
    permissions: me.permissions ?? [],
  };
}

function computeInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/u)
    .map((w) => Array.from(w)[0] ?? '')
    .filter(Boolean);
  if (letters.length === 0) return '?';
  if (letters.length === 1) return letters[0].toUpperCase();
  return (letters[0] + letters[letters.length - 1]).toUpperCase();
}

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]!
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
