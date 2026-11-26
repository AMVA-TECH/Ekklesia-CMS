import { createHash, randomBytes, randomInt } from 'node:crypto';
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
import { notifyJoinApproved } from './join-request-notify';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

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
        eq(churches.lifecycleStatus, 'active'),
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
  const phone = body.phoneE164.trim();

  const church = await db
    .select({
      id: churches.id,
      name: churches.name,
      lifecycleStatus: churches.lifecycleStatus,
    })
    .from(churches)
    .where(and(eq(churches.id, body.churchId), isNull(churches.deletedAt)))
    .limit(1);
  if (!church[0]) throw notFound('Church not found.');
  if (church[0].lifecycleStatus !== 'active') {
    throw conflict('This church is not accepting join requests yet.');
  }

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
  {
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
  const accessToken = newOpaqueToken();
  try {
    await db.insert(churchJoinRequests).values({
      id,
      churchId: body.churchId,
      displayName: body.displayName.trim(),
      email,
      phoneE164: phone,
      preferredLocale: body.preferredLocale,
      status: 'pending',
      applicantAccessTokenHash: hashToken(accessToken),
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
    accessToken,
    message:
      'Your request was submitted. The church will review it before you can sign in.',
  };
}

/** Public: applicant status poll (access token required). */
export async function getPublicJoinRequestStatus(
  requestId: string,
  accessToken: string,
) {
  const db = getDb();
  const rows = await db
    .select({
      id: churchJoinRequests.id,
      status: churchJoinRequests.status,
      displayName: churchJoinRequests.displayName,
      preferredLocale: churchJoinRequests.preferredLocale,
      decisionReason: churchJoinRequests.decisionReason,
      createdAt: churchJoinRequests.createdAt,
      decidedAt: churchJoinRequests.decidedAt,
      applicantAccessTokenHash: churchJoinRequests.applicantAccessTokenHash,
      churchId: churchJoinRequests.churchId,
      churchName: churches.name,
    })
    .from(churchJoinRequests)
    .innerJoin(churches, eq(churches.id, churchJoinRequests.churchId))
    .where(
      and(
        eq(churchJoinRequests.id, requestId),
        isNull(churchJoinRequests.deletedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw notFound('Join request not found.');
  if (
    !row.applicantAccessTokenHash ||
    row.applicantAccessTokenHash !== hashToken(accessToken)
  ) {
    throw notFound('Join request not found.');
  }

  const stage =
    row.status === 'approved'
      ? ('approved' as const)
      : row.status === 'rejected'
        ? ('rejected' as const)
        : ('pending' as const);

  const steps = [
    { key: 'submitted', state: 'done' as const },
    {
      key: 'review',
      state:
        stage === 'pending'
          ? ('current' as const)
          : stage === 'rejected'
            ? ('failed' as const)
            : ('done' as const),
    },
    {
      key: 'ready',
      state:
        stage === 'approved'
          ? ('current' as const)
          : stage === 'rejected'
            ? ('upcoming' as const)
            : ('upcoming' as const),
    },
  ];

  return {
    id: row.id,
    status: row.status,
    stage,
    displayName: row.displayName,
    churchName: row.churchName,
    preferredLocale: row.preferredLocale,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decisionReason:
      stage === 'rejected' ? row.decisionReason?.trim() || null : null,
    steps,
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

  const email = request.email?.trim().toLowerCase() || null;
  const phone = request.phoneE164?.trim() || null;
  if (!phone) {
    throw validationFailed([
      {
        field: 'phoneE164',
        code: 'required',
        message: 'Cannot approve: join request has no phone (required for login).',
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

  await db.insert(personContacts).values({
    id: newId(),
    personId,
    channel: 'phone',
    value: phone,
    isPrimary: true,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  if (email) {
    await db.insert(personContacts).values({
      id: newId(),
      personId,
      channel: 'email',
      value: email,
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
    roleId: memberRole[0].id,
    scopeType: 'church',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  // Better Auth requires a unique email column; phone-only members use a
  // non-login placeholder so sign-in stays phone + PIN (unchanged).
  const authEmail = email ?? `${userAccountId}@phone.users.local`;

  await provisionCredentialAccount(db, {
    userAccountId,
    displayName: request.displayName,
    email: authEmail,
    phoneE164: phone,
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
      phoneE164: phone,
    }),
  });

  const churchRow = await db
    .select({ name: churches.name })
    .from(churches)
    .where(eq(churches.id, ctx.churchId))
    .limit(1);
  const notify = await notifyJoinApproved({
    churchName: churchRow[0]?.name ?? 'your church',
    phoneE164: phone,
    email,
    pin,
    locale: request.preferredLocale,
  });

  return {
    id: requestId,
    status: 'approved' as const,
    member: {
      userAccountId,
      personId,
      email,
      phoneE164: phone,
      /** Shown once to the approving admin — not stored in audit. */
      initialPin: pin,
    },
    notify,
  };
}
