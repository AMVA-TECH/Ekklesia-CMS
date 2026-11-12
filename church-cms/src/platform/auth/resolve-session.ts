import { getDb } from '@/platform/db/client';
import { getEnv } from '@/platform/config';
import { getAuth } from './better-auth';
import { readDevSession } from './dev-session';
import type { SessionClaims } from './require-ctx';
import { userHasAdminDashboardAccess } from './admin-access';
import {
  findActiveOrganisationUser,
  listEffectivePermissionCodes,
} from './permissions-for-user';
import { PERMISSIONS } from '@/modules/access-control/permissions';
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
          permissions = await listEffectivePermissionCodes(
            db,
            activeChurchId,
            userAccountId,
          );
        }

        // ADR-0003: entered-tenant support mode grants full church permission set.
        if (isPlatformOperator) {
          permissions = [...PERMISSIONS];
        }
      }

      return {
        userAccountId,
        activeChurchId,
        personId,
        email: ba.user.email ?? undefined,
        permissions,
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
