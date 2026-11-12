import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import type { Ctx } from '@/platform/auth/ctx';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { forbidden, unauthorized, validationFailed } from '@/platform/errors';
import { churches } from '@/modules/churches/db-schema';
import { listActiveAssignmentsForUser } from '@/modules/access-control/repository';
import { organisationUsers, userAccounts } from '@/modules/people/db-schema';
import { getAuth } from './better-auth';
import { userHasAdminDashboardAccess } from './admin-access';
import {
  findActiveOrganisationUser,
  listEffectivePermissionCodes,
} from './permissions-for-user';
import { getEnv } from '@/platform/config';

const pinSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'PIN must be 4–8 digits');

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164');

export const loginBodySchema = z
  .object({
    email: z.string().email().optional(),
    phoneE164: phoneSchema.optional(),
    pin: pinSchema,
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasEmail = Boolean(val.email);
    const hasPhone = Boolean(val.phoneE164);
    if (hasEmail === hasPhone) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide exactly one of email or phoneE164',
        path: hasEmail ? ['email'] : ['phoneE164'],
      });
    }
  });

export const mfaVerifyBodySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    trustDevice: z.boolean().optional(),
  })
  .strict();

export const activeChurchBodySchema = z
  .object({
    churchId: z.guid(),
  })
  .strict();

export type LoginBody = z.infer<typeof loginBodySchema>;
export type MfaVerifyBody = z.infer<typeof mfaVerifyBodySchema>;
export type ActiveChurchBody = z.infer<typeof activeChurchBodySchema>;

/**
 * Session identity for the current actor.
 * Returns actor + active church + role assignments + effective permissions.
 */
export async function getAuthMe(ctx: Ctx) {
  const db = getDb();
  const env = getEnv();

  const [account] = await db
    .select({
      id: userAccounts.id,
      email: userAccounts.email,
      phoneE164: userAccounts.phoneE164,
      status: userAccounts.status,
    })
    .from(userAccounts)
    .where(
      and(eq(userAccounts.id, ctx.actor.userAccountId), isNull(userAccounts.deletedAt)),
    )
    .limit(1);

  const [church] = await db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      timezone: churches.timezone,
      defaultLocale: churches.defaultLocale,
    })
    .from(churches)
    .where(and(eq(churches.id, ctx.churchId), isNull(churches.deletedAt)))
    .limit(1);

  const [orgUser] = await db
    .select({
      id: organisationUsers.id,
      personId: organisationUsers.personId,
      status: organisationUsers.status,
    })
    .from(organisationUsers)
    .where(
      and(
        eq(organisationUsers.churchId, ctx.churchId),
        eq(organisationUsers.userAccountId, ctx.actor.userAccountId),
        isNull(organisationUsers.deletedAt),
      ),
    )
    .limit(1);

  const assignments = await listActiveAssignmentsForUser(
    db,
    ctx,
    ctx.actor.userAccountId,
  );

  const mfaRequired = await userHasAdminDashboardAccess(
    db,
    ctx.actor.userAccountId,
    ctx.churchId,
  );

  const authMode =
    env.ALLOW_DEV_AUTH === '1' && process.env.NODE_ENV !== 'production'
      ? 'session_or_dev_headers'
      : 'session';

  return {
    actor: {
      userAccountId: ctx.actor.userAccountId,
      personId: ctx.actor.personId ?? orgUser?.personId ?? null,
      email: account?.email ?? ctx.actor.email ?? null,
      phoneE164: account?.phoneE164 ?? null,
      status: account?.status ?? null,
    },
    church: church
      ? {
          id: church.id,
          name: church.name,
          slug: church.slug,
          timezone: church.timezone,
          defaultLocale: church.defaultLocale,
        }
      : { id: ctx.churchId, name: null, slug: null, timezone: null, defaultLocale: null },
    organisationUser: orgUser
      ? {
          id: orgUser.id,
          personId: orgUser.personId,
          status: orgUser.status,
        }
      : null,
    roles: assignments.map((a) => ({
      assignmentId: a.assignmentId,
      roleId: a.roleId,
      code: a.roleCode,
      name: a.roleName,
      scopeType: a.scopeType,
      organisationalUnitId: a.organisationalUnitId,
    })),
    permissions: [...ctx.permissions].sort(),
    locale: ctx.locale,
    authMode,
    mfaRequired,
  };
}

/**
 * Email+PIN or phone+PIN sign-in.
 * Admins with twoFactorEnabled get `{ twoFactorRedirect: true }` (no session yet).
 */
export async function loginWithPin(
  request: Request,
  body: LoginBody,
): Promise<Response> {
  const auth = getAuth();
  if (body.email) {
    return auth.api.signInEmail({
      body: {
        email: body.email,
        password: body.pin,
      },
      headers: request.headers,
      asResponse: true,
    });
  }
  return auth.api.signInPhoneNumber({
    body: {
      phoneNumber: body.phoneE164!,
      password: body.pin,
    },
    headers: request.headers,
    asResponse: true,
  });
}

/** Send MFA OTP after PIN challenge (admin). */
export async function sendMfaOtp(request: Request): Promise<Response> {
  const auth = getAuth();
  return auth.api.sendTwoFactorOTP({
    body: {},
    headers: request.headers,
    asResponse: true,
  });
}

/** Verify MFA OTP and establish full session. */
export async function verifyMfaOtp(
  request: Request,
  body: MfaVerifyBody,
): Promise<Response> {
  const auth = getAuth();
  return auth.api.verifyTwoFactorOTP({
    body: {
      code: body.code,
      trustDevice: body.trustDevice,
    },
    headers: request.headers,
    asResponse: true,
  });
}

/** Proxy sign-out to Better Auth; returns the raw Response (clears cookies). */
export async function logout(request: Request): Promise<Response> {
  const auth = getAuth();
  return auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
}

/**
 * Switch active church on the Better Auth session after membership check.
 * Audited. Returns updated auth/me payload.
 */
export async function setActiveChurch(ctx: Ctx, request: Request, body: ActiveChurchBody) {
  const db = getDb();
  const env = getEnv();
  const orgUser = await findActiveOrganisationUser(
    db,
    body.churchId,
    ctx.actor.userAccountId,
  );
  if (!orgUser) {
    throw forbidden('Not a member of that church');
  }

  const auth = getAuth();
  const ba = await auth.api.getSession({ headers: request.headers });
  const allowDevAuth =
    env.ALLOW_DEV_AUTH === '1' && process.env.NODE_ENV !== 'production';

  let setCookieHeaders: string[] = [];

  if (ba?.session?.token) {
    const updateResponse = await auth.api.updateSession({
      body: { activeChurchId: body.churchId },
      headers: request.headers,
      asResponse: true,
    });

    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      throw validationFailed(
        [{ field: 'churchId', code: 'session_update_failed', message: text.slice(0, 200) }],
        'Failed to update active church on session',
      );
    }

    setCookieHeaders =
      typeof updateResponse.headers.getSetCookie === 'function'
        ? updateResponse.headers.getSetCookie()
        : [];
  } else if (!allowDevAuth) {
    throw unauthorized();
  }
  // Dev headers: no cookie session to update — client switches via x-dev-church-id.

  await writeAudit(db, ctx, {
    action: 'auth.active_church.changed',
    entityType: 'church',
    entityId: body.churchId,
    metadata: {
      previousChurchId: ctx.churchId,
      via: ba?.session?.token ? 'session' : 'dev_headers',
    },
  });

  const permissions = await listEffectivePermissionCodes(
    db,
    body.churchId,
    ctx.actor.userAccountId,
  );

  const nextCtx: Ctx = {
    ...ctx,
    churchId: body.churchId,
    permissions: new Set(permissions),
    actor: {
      ...ctx.actor,
      personId: orgUser.personId ?? ctx.actor.personId,
    },
  };

  const me = await getAuthMe(nextCtx);
  return { me, setCookieHeaders };
}
