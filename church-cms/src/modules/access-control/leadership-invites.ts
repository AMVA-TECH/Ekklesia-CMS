import { randomInt } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import { provisionCredentialAccount } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writeAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { conflict, validationFailed } from '@/platform/errors';
import {
  DEFAULT_CHURCH_ROLES,
  INVITABLE_LEADERSHIP_ROLE_CODES,
} from '@/modules/platform-ops/role-bootstrap';
import { memberships } from '@/modules/membership/db-schema';
import {
  organisationUsers,
  people,
  personContacts,
  userAccounts,
} from '@/modules/people/db-schema';
import {
  permissions,
  rolePermissions,
  roles,
  userRoleAssignments,
} from './db-schema';
import { assertCanAssignRoles } from './policies';
import type { InviteLeadershipBody } from './schemas';

function generatePin(): string {
  return String(randomInt(100000, 999999));
}

async function ensureInvitableRole(
  churchId: string,
  roleCode: (typeof INVITABLE_LEADERSHIP_ROLE_CODES)[number],
  actorUserId: string,
): Promise<{ id: string; code: string; name: string }> {
  const db = getDb();
  const existing = await db
    .select({
      id: roles.id,
      code: roles.code,
      name: roles.name,
    })
    .from(roles)
    .where(
      and(
        eq(roles.churchId, churchId),
        eq(roles.code, roleCode),
        isNull(roles.deletedAt),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const def = DEFAULT_CHURCH_ROLES.find((r) => r.code === roleCode);
  if (!def) {
    throw validationFailed([
      {
        field: 'roleCode',
        code: 'unsupported',
        message: `Role ${roleCode} is not available for invite.`,
      },
    ]);
  }

  const permissionRows = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions);
  const byCode = new Map(permissionRows.map((p) => [p.code, p.id]));

  const roleId = newId();
  await db.insert(roles).values({
    id: roleId,
    churchId,
    code: def.code,
    name: def.name,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  const permissionIds = def.permissions
    .map((code) => byCode.get(code))
    .filter((id): id is string => Boolean(id));
  if (permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    );
  }

  return { id: roleId, code: def.code, name: def.name };
}

/** Church admin invites a leadership account with PIN (shown once). */
export async function inviteLeadership(ctx: Ctx, body: InviteLeadershipBody) {
  assertCanAssignRoles(ctx);
  const db = getDb();
  const email = body.email.trim().toLowerCase();
  const phone = body.phoneE164?.trim() || null;
  const pin = body.pin ?? generatePin();

  const emailTaken = await db
    .select({ id: userAccounts.id })
    .from(userAccounts)
    .where(and(eq(userAccounts.email, email), isNull(userAccounts.deletedAt)))
    .limit(1);
  if (emailTaken[0]) {
    throw conflict('An account with this email already exists.');
  }
  if (phone) {
    const phoneTaken = await db
      .select({ id: userAccounts.id })
      .from(userAccounts)
      .where(
        and(eq(userAccounts.phoneE164, phone), isNull(userAccounts.deletedAt)),
      )
      .limit(1);
    if (phoneTaken[0]) {
      throw conflict('An account with this phone already exists.');
    }
  }

  const role = await ensureInvitableRole(
    ctx.churchId,
    body.roleCode,
    ctx.actor.userAccountId,
  );

  const personId = newId();
  const userAccountId = newId();

  await db.insert(people).values({
    id: personId,
    displayName: body.displayName.trim(),
    fullName: body.displayName.trim(),
    preferredLocale: body.preferredLocale,
    directoryOptIn: false,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await db.insert(personContacts).values({
    id: newId(),
    personId,
    channel: 'email',
    value: email,
    isPrimary: true,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  if (phone) {
    await db.insert(personContacts).values({
      id: newId(),
      personId,
      channel: 'phone',
      value: phone,
      isPrimary: false,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }

  await db.insert(userAccounts).values({
    id: userAccountId,
    email,
    phoneE164: phone,
    status: 'active',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await db.insert(organisationUsers).values({
    id: newId(),
    churchId: ctx.churchId,
    userAccountId,
    personId,
    status: 'active',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await db.insert(memberships).values({
    id: newId(),
    churchId: ctx.churchId,
    personId,
    membershipType: 'individual',
    status: 'active',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await db.insert(userRoleAssignments).values({
    id: newId(),
    churchId: ctx.churchId,
    userAccountId,
    roleId: role.id,
    scopeType: 'church',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await provisionCredentialAccount(db, {
    userAccountId,
    displayName: body.displayName.trim(),
    email,
    phoneE164: phone,
    pin,
    twoFactorEnabled: true,
  });

  await writeAudit(db, ctx, {
    action: 'leadership.invited',
    entityType: 'user_account',
    entityId: userAccountId,
    metadata: sanitizeAuditMetadata({
      roleCode: role.code,
      email,
      personId,
    }),
  });

  return {
    userAccountId,
    personId,
    email,
    phoneE164: phone,
    roleCode: role.code,
    roleName: role.name,
    /** Shown once to the inviting admin — not stored in audit. */
    initialPin: pin,
  };
}
