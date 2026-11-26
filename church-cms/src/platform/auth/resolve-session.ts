import { getDb } from '@/platform/db/client';
import { getEnv } from '@/platform/config';
import { getAuth } from './better-auth';
import { readDevSession } from './dev-session';
import type { SessionClaims } from './require-ctx';
import { userHasAdminDashboardAccess } from './admin-access';
import {
  churchWideScopesForPermissions,
  findActiveOrganisationUser,
  listEffectiveGrants,
  serializeScopesByPermission,
} from './permissions-for-user';
import { findActivePlatformOperator } from './platform-operator';

/**
 * Resolve SessionClaims for withApiHandler / withPlatformApiHandler.
 * Prefer Better Auth cookie session; fall back to x-dev-* when ALLOW_DEV_AUTH=1.
 *
 * Admin users must complete MFA before a full session exists (BA deletes the
 * pre-MFA session and only sets the session cookie after OTP verify).
 * Platform operators (ADR-0003) may resolve without an active church.
 */
export async function resolveSessionClaims(
  request: Request,
): Promise<SessionClaims | null> {
  const env = getEnv();

  try {
    const auth = getAuth();
    const ba = await auth.api.getSession({ headers: request.headers });
    if (ba?.user?.id && ba.session) {
      const userAccountId = ba.user.id;
      const activeChurchId =
        (ba.session as { activeChurchId?: string | null }).activeChurchId ??
        null;

      const db = getDb();
      const platformOp = await findActivePlatformOperator(db, userAccountId);
      const isPlatformOperator = platformOp !== null;

      if (!activeChurchId && !isPlatformOperator) {
        return null;
      }

      const twoFactorEnabled = Boolean(
        (ba.user as { twoFactorEnabled?: boolean }).twoFactorEnabled,
      );

      if (isPlatformOperator && !twoFactorEnabled) {
        return null;
      }

      let personId: string | undefined;
      let permissions: string[] = [];
      let scopesByPermission: SessionClaims['scopesByPermission'];
      let actorHouseholdIds: string[] | undefined;

      if (activeChurchId) {
        const orgUser = await findActiveOrganisationUser(
          db,
          activeChurchId,
          userAccountId,
        );
        if (!orgUser && !isPlatformOperator) {
          return null;
        }
        personId = orgUser?.personId ?? undefined;

        const isAdmin = await userHasAdminDashboardAccess(
          db,
          userAccountId,
          activeChurchId,
        );
        if (isAdmin && !twoFactorEnabled) {
          return null;
        }

        if (orgUser) {
          const grants = await listEffectiveGrants(
            db,
            activeChurchId,
            userAccountId,
            personId,
          );
          permissions = grants.permissions;
          scopesByPermission = serializeScopesByPermission(
            grants.scopesByPermission,
          );
          actorHouseholdIds = grants.actorHouseholdIds;
        }

        // Controlled support enter-tenant: require an active support session.
        // Default accessLevel=read is diagnostic-only (no writes/finance/Restricted).
        if (isPlatformOperator) {
          const { findActiveSupportSession } = await import(
            '@/modules/platform-ops/support-repository'
          );
          const { churchPermissionsForSupportAccess } = await import(
            '@/modules/platform-ops/support-access'
          );
          const support = await findActiveSupportSession(
            db,
            userAccountId,
            activeChurchId,
          );
          if (support) {
            const level =
              support.accessLevel === 'interactive' ? 'interactive' : 'read';
            const supportPerms = churchPermissionsForSupportAccess(level);
            permissions = [...supportPerms];
            scopesByPermission = serializeScopesByPermission(
              churchWideScopesForPermissions(supportPerms),
            );
          } else if (!orgUser) {
            // Stale activeChurchId without a live support session: no church perms.
            permissions = [];
            scopesByPermission = undefined;
          }
          // If orgUser exists without support session, keep their own grants only.
        }
      }

      return {
        userAccountId,
        activeChurchId,
        personId,
        email: ba.user.email ?? undefined,
        permissions,
        scopesByPermission,
        actorHouseholdIds,
        isPlatformOperator: isPlatformOperator || undefined,
        platformPermissions: platformOp?.permissions,
      };
    }
  } catch {
    // Auth not configured / DB down — allow dev headers below in non-prod.
  }

  if (env.ALLOW_DEV_AUTH === '1') {
    return readDevSession(request);
  }

  return null;
}
