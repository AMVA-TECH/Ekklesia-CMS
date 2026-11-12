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
  const displayName =
    (email && email.split('@')[0]) ?? phoneE164 ?? 'Signed-in user';
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
        name: me.church.name ?? 'Your church',
        slug: me.church.slug ?? undefined,
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
