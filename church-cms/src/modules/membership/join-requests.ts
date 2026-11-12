import { randomInt } from 'node:crypto';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import { provisionCredentialAccount } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writeAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import {
  conflict,
  notFound,
  validationFailed,
} from '@/platform/errors';
import { churches } from '@/modules/churches/db-schema';
import {
  organisationUsers,
  people,
  personContacts,
  userAccounts,
} from '@/modules/people/db-schema';
import {
  roles,
  userRoleAssignments,
} from '@/modules/access-control/db-schema';
import { memberships, churchJoinRequests } from './db-schema';
import {
  assertCanApproveMemberships,
  assertCanReadMemberships,
} from './policies';
import type {
  CreateJoinRequestBody,
  DecideJoinRequestBody,
  ListJoinRequestsQuery,
  PublicChurchSearchQuery,
} from './join-request-schemas';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

function generateMemberPin(): string {
  return String(randomInt(100000, 999999));
}

/** Public: safe church directory for registration search. */
export async function searchPublicChurches(query: PublicChurchSearchQuery) {
  const db = getDb();
  const q = query.q.trim();
  if (q.length < 2) {
    throw validationFailed(
      [{ field: 'q', code: 'too_short', message: 'Search query must be at least 2 characters.' }],
    );
  }

  const rows = await db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      timezone: churches.timezone,
      defaultLocale: churches.defaultLocale,
    })
    .from(churches)
    .where(
      and(
        isNull(churches.deletedAt),
        or(
          ilike(churches.name, `%${q}%`),
          ilike(churches.slug, `%${q}%`),
        ),
      ),
    )
    .orderBy(churches.name)
    .limit(query.limit);

  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      timezone: r.timezone,
      defaultLocale: r.defaultLocale,
    })),
  };
}

/** Public: submit a join request — no session granted. */
export async function createPublicJoinRequest(body: CreateJoinRequestBody) {
  const db = getDb();
  const email = body.email?.trim().toLowerCase() || null;
  const phone = body.phoneE164?.trim() || null;
  if (!email && !phone) {
    throw validationFailed([
      {
        field: 'email',
        code: 'required',
        message: 'Provide an email or phone number.',
      },
    ]);
  }

  const church = await db
    .select({ id: churches.id, name: churches.name })
    .from(churches)
    .where(and(eq(churches.id, body.churchId), isNull(churches.deletedAt)))
    .limit(1);
  if (!church[0]) throw notFound('Church not found.');

  if (email) {
    const existingAccount = await db
      .select({ id: userAccounts.id })
      .from(userAccounts)
      .where(and(eq(userAccounts.email, email), isNull(userAccounts.deletedAt)))
      .limit(1);
    if (existingAccount[0]) {
      throw conflict('An account with this email already exists. Sign in instead.');
    }
  }
  if (phone) {
    const existingAccount = await db
      .select({ id: userAccounts.id })
      .from(userAccounts)
      .where(
        and(eq(userAccounts.phoneE164, phone), isNull(userAccounts.deletedAt)),
      )
      .limit(1);
    if (existingAccount[0]) {
      throw conflict('An account with this phone already exists. Sign in instead.');
    }
  }

  const id = newId();
  try {
    await db.insert(churchJoinRequests).values({
      id,
      churchId: body.churchId,
      displayName: body.displayName.trim(),
      email,
      phoneE164: phone,
      preferredLocale: body.preferredLocale,
      status: 'pending',
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A pending join request already exists for this church.');
    }
    throw error;
  }

  return {
    id,
    churchId: body.churchId,
    churchName: church[0].name,
    status: 'pending' as const,
    message:
      'Your request was submitted. The church will review it before you can sign in.',
  };
}

export async function listJoinRequests(ctx: Ctx, query: ListJoinRequestsQuery) {
  assertCanReadMemberships(ctx);
  const db = getDb();
  const rows = await db
    .select()
    .from(churchJoinRequests)
    .where(
      and(
        eq(churchJoinRequests.churchId, ctx.churchId),
        isNull(churchJoinRequests.deletedAt),
        query.status
          ? eq(churchJoinRequests.status, query.status)
          : sql`true`,
      ),
    )
    .orderBy(desc(churchJoinRequests.createdAt))
    .limit(query.limit);

  return {
    items: rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      email: r.email,
      phoneE164: r.phoneE164,
      preferredLocale: r.preferredLocale,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? null,
      decisionReason: r.decisionReason,
    })),
  };
}

export async function decideJoinRequest(
  ctx: Ctx,
  requestId: string,
  body: DecideJoinRequestBody,
) {
  assertCanApproveMemberships(ctx);
  const db = getDb();

  const rows = await db
    .select()
    .from(churchJoinRequests)
    .where(
      and(
        eq(churchJoinRequests.id, requestId),
        eq(churchJoinRequests.churchId, ctx.churchId),
        isNull(churchJoinRequests.deletedAt),
      ),
    )
    .limit(1);
  const request = rows[0];
  if (!request) throw notFound();
  if (request.status !== 'pending') {
    throw conflict('This join request was already decided.');
  }

  if (body.outcome === 'rejected') {
    await db
      .update(churchJoinRequests)
      .set({
        status: 'rejected',
        decidedByUserId: ctx.actor.userAccountId,
        decidedAt: new Date(),
        decisionReason: body.reason?.trim() || null,
        updatedAt: new Date(),
        updatedBy: ctx.actor.userAccountId,
      })
      .where(eq(churchJoinRequests.id, requestId));

    await writeAudit(db, ctx, {
      action: 'join_request.rejected',
      entityType: 'church_join_request',
      entityId: requestId,
      metadata: sanitizeAuditMetadata({ reason: body.reason ?? null }),
    });

    return {
      id: requestId,
      status: 'rejected' as const,
    };
  }

  const email = request.email;
  if (!email) {
    throw validationFailed([
      {
        field: 'email',
        code: 'required',
        message: 'Cannot approve: join request has no email (required for login).',
      },
    ]);
  }

  const memberRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.churchId, ctx.churchId),
        eq(roles.code, 'member'),
        isNull(roles.deletedAt),
      ),
    )
    .limit(1);
  if (!memberRole[0]) {
    throw validationFailed([
      {
        field: 'role',
        code: 'missing',
        message: 'Church has no member role configured.',
      },
    ]);
  }

  const personId = newId();
  const userAccountId = newId();
  const pin = generateMemberPin();

  await db.insert(people).values({
    id: personId,
    displayName: request.displayName,
    fullName: request.displayName,
    preferredLocale: request.preferredLocale,
    directoryOptIn: false,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  if (email) {
    await db.insert(personContacts).values({
      id: newId(),
      personId,
      channel: 'email',
      value: email,
      isPrimary: true,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }
  if (request.phoneE164) {
    await db.insert(personContacts).values({
      id: newId(),
      personId,
      channel: 'phone',
      value: request.phoneE164,
      isPrimary: !email,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }

  await db.insert(userAccounts).values({
    id: userAccountId,
    email,
    phoneE164: request.phoneE164,
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
    roleId: memberRole[0].id,
    scopeType: 'church',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await provisionCredentialAccount(db, {
    userAccountId,
    displayName: request.displayName,
    email,
    phoneE164: request.phoneE164,
    pin,
    twoFactorEnabled: false,
  });

  await db
    .update(churchJoinRequests)
    .set({
      status: 'approved',
      decidedByUserId: ctx.actor.userAccountId,
      decidedAt: new Date(),
      decisionReason: body.reason?.trim() || null,
      personId,
      userAccountId,
      updatedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
    })
    .where(eq(churchJoinRequests.id, requestId));

  await writeAudit(db, ctx, {
    action: 'join_request.approved',
    entityType: 'church_join_request',
    entityId: requestId,
    metadata: sanitizeAuditMetadata({
      userAccountId,
      personId,
      email,
    }),
  });

  return {
    id: requestId,
    status: 'approved' as const,
    member: {
      userAccountId,
      personId,
      email,
      phoneE164: request.phoneE164,
      /** Shown once to the approving admin — not stored in audit. */
      initialPin: pin,
    },
  };
}
