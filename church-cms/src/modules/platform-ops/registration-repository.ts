import { and, count, desc, eq, isNull, or, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { churches } from '@/modules/churches/db-schema';
import {
  churchRegistrationApplications,
  churchRegistrationEvents,
  tenantProvisioningRequests,
} from './db-schema';
import type { RegistrationStatus } from './registration-constants';

export async function findApplicationByIdempotencyKey(
  db: Db,
  key: string,
) {
  const rows = await db
    .select()
    .from(churchRegistrationApplications)
    .where(
      and(
        eq(churchRegistrationApplications.idempotencyKey, key),
        isNull(churchRegistrationApplications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findApplicationById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(churchRegistrationApplications)
    .where(
      and(
        eq(churchRegistrationApplications.id, id),
        isNull(churchRegistrationApplications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findApplicationByAccessTokenHash(
  db: Db,
  tokenHash: string,
) {
  const rows = await db
    .select()
    .from(churchRegistrationApplications)
    .where(
      and(
        eq(churchRegistrationApplications.applicantAccessTokenHash, tokenHash),
        isNull(churchRegistrationApplications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findApplicationByEmailVerifyTokenHash(
  db: Db,
  tokenHash: string,
) {
  const rows = await db
    .select()
    .from(churchRegistrationApplications)
    .where(
      and(
        eq(churchRegistrationApplications.emailVerifyTokenHash, tokenHash),
        isNull(churchRegistrationApplications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertApplication(
  db: Db,
  input: {
    id: string;
    officialName: string;
    displayName?: string | null;
    website?: string | null;
    country: string;
    location?: string | null;
    address?: string | null;
    denomination?: string | null;
    yearEstablished?: number | null;
    description?: string | null;
    approxSize?: string | null;
    branchCount?: number | null;
    representativeName: string;
    representativeRole?: string | null;
    email: string;
    phoneE164?: string | null;
    preferredContact?: string | null;
    emailVerifyTokenHash: string;
    emailVerifyExpiresAt: Date;
    applicantAccessTokenHash: string;
    idempotencyKey?: string | null;
  },
) {
  await db.insert(churchRegistrationApplications).values({
    id: input.id,
    status: 'submitted',
    officialName: input.officialName,
    displayName: input.displayName ?? null,
    website: input.website ?? null,
    country: input.country,
    location: input.location ?? null,
    address: input.address ?? null,
    denomination: input.denomination ?? null,
    yearEstablished: input.yearEstablished ?? null,
    description: input.description ?? null,
    approxSize: input.approxSize ?? null,
    branchCount: input.branchCount ?? null,
    representativeName: input.representativeName,
    representativeRole: input.representativeRole ?? null,
    email: input.email,
    phoneE164: input.phoneE164 ?? null,
    preferredContact: input.preferredContact ?? 'email',
    emailVerifyTokenHash: input.emailVerifyTokenHash,
    emailVerifyExpiresAt: input.emailVerifyExpiresAt,
    applicantAccessTokenHash: input.applicantAccessTokenHash,
    idempotencyKey: input.idempotencyKey ?? null,
  });
}

export async function insertRegistrationEvent(
  db: Db,
  input: {
    applicationId: string;
    eventType: string;
    actorUserId?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(churchRegistrationEvents).values({
    id: newId(),
    applicationId: input.applicationId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    note: input.note ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function listRegistrationEvents(db: Db, applicationId: string) {
  return db
    .select()
    .from(churchRegistrationEvents)
    .where(eq(churchRegistrationEvents.applicationId, applicationId))
    .orderBy(desc(churchRegistrationEvents.createdAt));
}

export async function updateApplication(
  db: Db,
  id: string,
  patch: Partial<{
    status: RegistrationStatus;
    emailVerifiedAt: Date | null;
    emailVerifyTokenHash: string | null;
    emailVerifyExpiresAt: Date | null;
    assignedReviewerUserId: string | null;
    assignedAt: Date | null;
    decisionNote: string | null;
    decidedByUserId: string | null;
    decidedAt: Date | null;
    resultingChurchId: string | null;
    metadata: Record<string, unknown>;
    updatedBy: string | null;
  }>,
) {
  await db
    .update(churchRegistrationApplications)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(churchRegistrationApplications.id, id));
}

export async function listApplications(
  db: Db,
  query: { status?: RegistrationStatus; limit: number },
) {
  const conditions = [isNull(churchRegistrationApplications.deletedAt)];
  if (query.status) {
    conditions.push(eq(churchRegistrationApplications.status, query.status));
  }
  return db
    .select({
      id: churchRegistrationApplications.id,
      status: churchRegistrationApplications.status,
      officialName: churchRegistrationApplications.officialName,
      displayName: churchRegistrationApplications.displayName,
      country: churchRegistrationApplications.country,
      location: churchRegistrationApplications.location,
      email: churchRegistrationApplications.email,
      representativeName: churchRegistrationApplications.representativeName,
      emailVerifiedAt: churchRegistrationApplications.emailVerifiedAt,
      assignedReviewerUserId:
        churchRegistrationApplications.assignedReviewerUserId,
      decidedAt: churchRegistrationApplications.decidedAt,
      resultingChurchId: churchRegistrationApplications.resultingChurchId,
      createdAt: churchRegistrationApplications.createdAt,
    })
    .from(churchRegistrationApplications)
    .where(and(...conditions))
    .orderBy(desc(churchRegistrationApplications.createdAt))
    .limit(query.limit);
}

/** Applications waiting for operator KYC / decision. */
export async function listApplicationsNeedingReview(db: Db, limit = 20) {
  return db
    .select({
      id: churchRegistrationApplications.id,
      status: churchRegistrationApplications.status,
      officialName: churchRegistrationApplications.officialName,
      email: churchRegistrationApplications.email,
      representativeName: churchRegistrationApplications.representativeName,
      emailVerifiedAt: churchRegistrationApplications.emailVerifiedAt,
      createdAt: churchRegistrationApplications.createdAt,
    })
    .from(churchRegistrationApplications)
    .where(
      and(
        isNull(churchRegistrationApplications.deletedAt),
        or(
          eq(churchRegistrationApplications.status, 'email_verified'),
          eq(churchRegistrationApplications.status, 'under_review'),
          eq(churchRegistrationApplications.status, 'submitted'),
        )!,
      ),
    )
    .orderBy(desc(churchRegistrationApplications.createdAt))
    .limit(limit);
}

export async function countApplicationsByStatuses(
  db: Db,
  statuses: RegistrationStatus[],
) {
  if (statuses.length === 0) return 0;
  const rows = await db
    .select({ n: count() })
    .from(churchRegistrationApplications)
    .where(
      and(
        isNull(churchRegistrationApplications.deletedAt),
        or(
          ...statuses.map((s) =>
            eq(churchRegistrationApplications.status, s),
          ),
        )!,
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function countFailedProvisioning(db: Db) {
  const rows = await db
    .select({ n: count() })
    .from(tenantProvisioningRequests)
    .where(
      and(
        isNull(tenantProvisioningRequests.deletedAt),
        eq(tenantProvisioningRequests.status, 'failed'),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function listFailedProvisioning(db: Db, limit = 10) {
  return db
    .select({
      id: tenantProvisioningRequests.id,
      applicationId: tenantProvisioningRequests.applicationId,
      status: tenantProvisioningRequests.status,
      errorMessage: tenantProvisioningRequests.errorMessage,
      updatedAt: tenantProvisioningRequests.updatedAt,
    })
    .from(tenantProvisioningRequests)
    .where(
      and(
        isNull(tenantProvisioningRequests.deletedAt),
        eq(tenantProvisioningRequests.status, 'failed'),
      ),
    )
    .orderBy(desc(tenantProvisioningRequests.updatedAt))
    .limit(limit);
}

export async function insertProvisioningRequest(
  db: Db,
  input: {
    id: string;
    applicationId: string;
    idempotencyKey: string;
    status: string;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
  },
) {
  await db.insert(tenantProvisioningRequests).values({
    id: input.id,
    applicationId: input.applicationId,
    idempotencyKey: input.idempotencyKey,
    status: input.status,
    metadata: input.metadata ?? {},
    createdBy: input.createdBy ?? null,
    updatedBy: input.createdBy ?? null,
  });
}

export async function findProvisioningByIdempotencyKey(
  db: Db,
  key: string,
) {
  const rows = await db
    .select()
    .from(tenantProvisioningRequests)
    .where(eq(tenantProvisioningRequests.idempotencyKey, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function findProvisioningById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(tenantProvisioningRequests)
    .where(
      and(
        eq(tenantProvisioningRequests.id, id),
        isNull(tenantProvisioningRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findProvisioningByApplicationId(
  db: Db,
  applicationId: string,
) {
  const rows = await db
    .select()
    .from(tenantProvisioningRequests)
    .where(
      and(
        eq(tenantProvisioningRequests.applicationId, applicationId),
        isNull(tenantProvisioningRequests.deletedAt),
      ),
    )
    .orderBy(desc(tenantProvisioningRequests.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function findProvisioningByInviteTokenHash(
  db: Db,
  tokenHash: string,
) {
  const rows = await db
    .select()
    .from(tenantProvisioningRequests)
    .where(
      and(
        eq(tenantProvisioningRequests.adminInviteTokenHash, tokenHash),
        isNull(tenantProvisioningRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateProvisioning(
  db: Db,
  id: string,
  patch: Partial<{
    status: string;
    churchId: string | null;
    adminUserAccountId: string | null;
    adminInviteTokenHash: string | null;
    adminInviteExpiresAt: Date | null;
    errorMessage: string | null;
    attemptCount: number;
    startedAt: Date | null;
    completedAt: Date | null;
    metadata: Record<string, unknown>;
    updatedBy: string | null;
  }>,
) {
  await db
    .update(tenantProvisioningRequests)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tenantProvisioningRequests.id, id));
}

export async function claimQueuedProvisioning(db: Db, id: string) {
  const updated = await db
    .update(tenantProvisioningRequests)
    .set({
      status: 'running',
      startedAt: new Date(),
      attemptCount: sql`${tenantProvisioningRequests.attemptCount} + 1`,
      updatedAt: new Date(),
      errorMessage: null,
    })
    .where(
      and(
        eq(tenantProvisioningRequests.id, id),
        eq(tenantProvisioningRequests.status, 'queued'),
      ),
    )
    // Full-row returning: partial selection does not type-check on Db union.
    .returning();
  return updated[0] ? { id: updated[0].id } : null;
}

export async function claimFailedProvisioningForRetry(db: Db, id: string) {
  const updated = await db
    .update(tenantProvisioningRequests)
    .set({
      status: 'running',
      startedAt: new Date(),
      attemptCount: sql`${tenantProvisioningRequests.attemptCount} + 1`,
      updatedAt: new Date(),
      errorMessage: null,
    })
    .where(
      and(
        eq(tenantProvisioningRequests.id, id),
        eq(tenantProvisioningRequests.status, 'failed'),
      ),
    )
    .returning();
  return updated[0] ? { id: updated[0].id } : null;
}

export async function updateChurchLifecycle(
  db: Db,
  churchId: string,
  lifecycleStatus: string,
  actorUserId: string,
) {
  await db
    .update(churches)
    .set({
      lifecycleStatus,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(and(eq(churches.id, churchId), isNull(churches.deletedAt)));
}

export async function getChurchLifecycle(db: Db, churchId: string) {
  const rows = await db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      lifecycleStatus: churches.lifecycleStatus,
    })
    .from(churches)
    .where(and(eq(churches.id, churchId), isNull(churches.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}
