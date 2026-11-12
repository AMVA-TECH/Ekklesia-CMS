import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { memberships } from '@/modules/membership/db-schema';
import { participations } from '@/modules/ministries/db-schema';
import {
  announcementAudiences,
  announcements,
  communicationPreferences,
  messageDeliveries,
  messageJobs,
  messageTemplates,
} from './db-schema';
import type {
  CreateAnnouncementBody,
  CreateMessageJobBody,
  CreateTemplateBody,
  UpdatePreferencesBody,
} from './schemas';

export async function listTemplates(db: Db, ctx: Ctx) {
  return db
    .select()
    .from(messageTemplates)
    .where(
      and(eq(messageTemplates.churchId, ctx.churchId), isNull(messageTemplates.deletedAt)),
    )
    .orderBy(asc(messageTemplates.code));
}
export async function getTemplate(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.id, id),
        eq(messageTemplates.churchId, ctx.churchId),
        isNull(messageTemplates.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
export async function insertTemplate(db: Db, ctx: Ctx, body: CreateTemplateBody) {
  const id = newId();
  await db.insert(messageTemplates).values({
    id,
    churchId: ctx.churchId,
    code: body.code,
    channel: body.channel,
    locale: body.locale ?? 'sw',
    body: body.body,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function listAnnouncements(db: Db, ctx: Ctx, publishedOnly: boolean) {
  const conditions = [
    eq(announcements.churchId, ctx.churchId),
    isNull(announcements.deletedAt),
  ];
  if (publishedOnly) conditions.push(eq(announcements.status, 'published'));
  return db
    .select()
    .from(announcements)
    .where(and(...conditions))
    .orderBy(desc(announcements.createdAt))
    .limit(100);
}

/** Published announcements targeted to all_members or the person's active units (DEC-032). */
export async function listAnnouncementsForMember(db: Db, ctx: Ctx, personId: string) {
  const unitRows = await db
    .select({ organisationalUnitId: participations.organisationalUnitId })
    .from(participations)
    .where(
      and(
        eq(participations.churchId, ctx.churchId),
        eq(participations.personId, personId),
        eq(participations.status, 'active'),
        isNull(participations.deletedAt),
      ),
    );
  const unitIds = unitRows.map((r) => r.organisationalUnitId);

  const audienceMatch =
    unitIds.length > 0
      ? or(
          eq(announcementAudiences.audienceType, 'all_members'),
          and(
            eq(announcementAudiences.audienceType, 'organisational_unit'),
            inArray(announcementAudiences.organisationalUnitId, unitIds),
          ),
        )
      : eq(announcementAudiences.audienceType, 'all_members');

  const matched = await db
    .selectDistinct({ announcementId: announcementAudiences.announcementId })
    .from(announcementAudiences)
    .where(audienceMatch!);

  const ids = matched.map((m) => m.announcementId);
  if (ids.length === 0) return [];

  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.churchId, ctx.churchId),
        eq(announcements.status, 'published'),
        isNull(announcements.deletedAt),
        inArray(announcements.id, ids),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(100);
}
export async function getAnnouncement(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.id, id),
        eq(announcements.churchId, ctx.churchId),
        isNull(announcements.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
export async function listAudiencesForAnnouncement(db: Db, announcementId: string) {
  return db
    .select()
    .from(announcementAudiences)
    .where(eq(announcementAudiences.announcementId, announcementId))
    .orderBy(asc(announcementAudiences.audienceType));
}
export async function listAudiencesForAnnouncements(db: Db, announcementIds: string[]) {
  if (announcementIds.length === 0) return [];
  return db
    .select()
    .from(announcementAudiences)
    .where(inArray(announcementAudiences.announcementId, announcementIds))
    .orderBy(asc(announcementAudiences.audienceType));
}
export async function insertAnnouncement(db: Db, ctx: Ctx, body: CreateAnnouncementBody) {
  const id = newId();
  const audiences =
    body.audiences && body.audiences.length > 0
      ? body.audiences
      : [{ audienceType: 'all_members' as const }];
  await db.insert(announcements).values({
    id,
    churchId: ctx.churchId,
    title: body.title,
    body: body.body,
    status: 'draft',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  await db.insert(announcementAudiences).values(
    audiences.map((a) => ({
      id: newId(),
      announcementId: id,
      audienceType: a.audienceType,
      organisationalUnitId:
        a.audienceType === 'organisational_unit' ? a.organisationalUnitId! : null,
    })),
  );
  return id;
}
export async function setAnnouncementStatus(
  db: Db,
  ctx: Ctx,
  id: string,
  status: string,
  opts?: { publishedAt?: Date | null },
) {
  await db
    .update(announcements)
    .set({
      status,
      ...(opts && 'publishedAt' in opts ? { publishedAt: opts.publishedAt } : {}),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(and(eq(announcements.id, id), eq(announcements.churchId, ctx.churchId)));
}
export async function publishAnnouncement(db: Db, ctx: Ctx, id: string) {
  await setAnnouncementStatus(db, ctx, id, 'published', { publishedAt: new Date() });
}

export async function getPreferences(db: Db, ctx: Ctx, personId: string) {
  const [row] = await db
    .select()
    .from(communicationPreferences)
    .where(
      and(
        eq(communicationPreferences.churchId, ctx.churchId),
        eq(communicationPreferences.personId, personId),
        isNull(communicationPreferences.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
export async function upsertPreferences(
  db: Db,
  ctx: Ctx,
  personId: string,
  body: UpdatePreferencesBody,
) {
  const existing = await getPreferences(db, ctx, personId);
  if (existing) {
    await db
      .update(communicationPreferences)
      .set({
        smsOptIn: body.smsOptIn ?? existing.smsOptIn,
        whatsappOptIn: body.whatsappOptIn ?? existing.whatsappOptIn,
        emailOptIn: body.emailOptIn ?? existing.emailOptIn,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: new Date(),
      })
      .where(eq(communicationPreferences.id, existing.id));
    return existing.id;
  }
  const id = newId();
  await db.insert(communicationPreferences).values({
    id,
    churchId: ctx.churchId,
    personId,
    smsOptIn: body.smsOptIn ?? true,
    whatsappOptIn: body.whatsappOptIn ?? true,
    emailOptIn: body.emailOptIn ?? true,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export type BlastCandidate = {
  personId: string;
  toAddress: string;
  smsOptIn: boolean | null;
  whatsappOptIn: boolean | null;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows ?? [];
  }
  return [];
}

/**
 * Active members (optionally participating in a unit) with phone + prefs.
 * Uses SQL so we can pick primary phone without N+1.
 */
export async function listBlastCandidates(
  db: Db,
  ctx: Ctx,
  audienceType: CreateMessageJobBody['audienceType'],
  organisationalUnitId: string | undefined,
  limit: number,
): Promise<BlastCandidate[]> {
  if (audienceType === 'organisational_unit') {
    const result = await db.execute(sql`
      SELECT
        m.person_id AS "personId",
        COALESCE(ph.value, '') AS "toAddress",
        pref.sms_opt_in AS "smsOptIn",
        pref.whatsapp_opt_in AS "whatsappOptIn"
      FROM memberships m
      INNER JOIN participations p
        ON p.person_id = m.person_id
       AND p.church_id = m.church_id
       AND p.organisational_unit_id = ${organisationalUnitId!}
       AND p.status = 'active'
       AND p.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT pc.value
        FROM person_contacts pc
        WHERE pc.person_id = m.person_id
          AND pc.channel = 'phone'
          AND pc.deleted_at IS NULL
        ORDER BY pc.is_primary DESC, pc.created_at ASC
        LIMIT 1
      ) ph ON true
      LEFT JOIN communication_preferences pref
        ON pref.person_id = m.person_id
       AND pref.church_id = m.church_id
       AND pref.deleted_at IS NULL
      WHERE m.church_id = ${ctx.churchId}::uuid
        AND m.status = 'active'
        AND m.deleted_at IS NULL
      LIMIT ${limit}
    `);
    return rowsOf<BlastCandidate>(result);
  }

  const result = await db.execute(sql`
    SELECT
      m.person_id AS "personId",
      COALESCE(ph.value, '') AS "toAddress",
      pref.sms_opt_in AS "smsOptIn",
      pref.whatsapp_opt_in AS "whatsappOptIn"
    FROM memberships m
    LEFT JOIN LATERAL (
      SELECT pc.value
      FROM person_contacts pc
      WHERE pc.person_id = m.person_id
        AND pc.channel = 'phone'
        AND pc.deleted_at IS NULL
      ORDER BY pc.is_primary DESC, pc.created_at ASC
      LIMIT 1
    ) ph ON true
    LEFT JOIN communication_preferences pref
      ON pref.person_id = m.person_id
     AND pref.church_id = m.church_id
     AND pref.deleted_at IS NULL
    WHERE m.church_id = ${ctx.churchId}::uuid
      AND m.status = 'active'
      AND m.deleted_at IS NULL
    LIMIT ${limit}
  `);
  return rowsOf<BlastCandidate>(result);
}

export async function insertMessageJob(
  db: Db,
  ctx: Ctx,
  input: {
    channel: string;
    title: string | null;
    body: string;
    audienceType: string;
    organisationalUnitId?: string;
    templateId?: string;
    announcementId?: string;
    scheduledFor?: Date;
  },
) {
  const id = newId();
  await db.insert(messageJobs).values({
    id,
    churchId: ctx.churchId,
    channel: input.channel,
    title: input.title,
    body: input.body,
    audienceType: input.audienceType,
    organisationalUnitId: input.organisationalUnitId,
    templateId: input.templateId,
    announcementId: input.announcementId,
    status: 'queued',
    scheduledFor: input.scheduledFor,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function insertDeliveries(
  db: Db,
  ctx: Ctx,
  jobId: string,
  channel: string,
  recipients: { personId: string; toAddress: string }[],
) {
  if (recipients.length === 0) return;
  await db.insert(messageDeliveries).values(
    recipients.map((r) => ({
      id: newId(),
      jobId,
      personId: r.personId,
      channel,
      toAddress: r.toAddress,
      status: 'pending',
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    })),
  );
}

export async function getMessageJob(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(messageJobs)
    .where(
      and(
        eq(messageJobs.id, id),
        eq(messageJobs.churchId, ctx.churchId),
        isNull(messageJobs.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function countDeliveriesForJob(db: Db, jobId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messageDeliveries)
    .where(eq(messageDeliveries.jobId, jobId));
  return Number(row?.count ?? 0);
}

export async function listDeliveriesForJob(db: Db, ctx: Ctx, jobId: string) {
  const job = await getMessageJob(db, ctx, jobId);
  if (!job) return null;
  return db
    .select()
    .from(messageDeliveries)
    .where(and(eq(messageDeliveries.jobId, jobId), isNull(messageDeliveries.deletedAt)))
    .orderBy(asc(messageDeliveries.createdAt))
    .limit(500);
}

export async function listMessageJobs(db: Db, ctx: Ctx, limit = 50) {
  return db
    .select()
    .from(messageJobs)
    .where(and(eq(messageJobs.churchId, ctx.churchId), isNull(messageJobs.deletedAt)))
    .orderBy(desc(messageJobs.createdAt))
    .limit(limit);
}

export async function listPendingDeliveries(db: Db, ctx: Ctx, jobId: string, limit = 500) {
  const job = await getMessageJob(db, ctx, jobId);
  if (!job) return null;
  const rows = await db
    .select()
    .from(messageDeliveries)
    .where(
      and(
        eq(messageDeliveries.jobId, jobId),
        eq(messageDeliveries.status, 'pending'),
        isNull(messageDeliveries.deletedAt),
      ),
    )
    .orderBy(asc(messageDeliveries.createdAt))
    .limit(limit);
  return { job, rows };
}

export async function markDeliverySent(
  db: Db,
  deliveryId: string,
  providerRef: string,
) {
  await db
    .update(messageDeliveries)
    .set({
      status: 'sent',
      providerRef,
      sentAt: new Date(),
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(messageDeliveries.id, deliveryId));
}

export async function markDeliveryFailed(
  db: Db,
  deliveryId: string,
  error: string,
) {
  await db
    .update(messageDeliveries)
    .set({
      status: 'failed',
      error: error.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(messageDeliveries.id, deliveryId));
}

export async function markDeliveryStatusByProviderRef(
  db: Db,
  providerRef: string,
  status: 'delivered' | 'failed' | 'sent',
  error?: string,
) {
  const [row] = await db
    .select()
    .from(messageDeliveries)
    .where(eq(messageDeliveries.providerRef, providerRef))
    .limit(1);
  if (!row) return null;
  await db
    .update(messageDeliveries)
    .set({
      status,
      error: error ? error.slice(0, 500) : row.error,
      updatedAt: new Date(),
      ...(status === 'sent' ? { sentAt: row.sentAt ?? new Date() } : {}),
    })
    .where(eq(messageDeliveries.id, row.id));
  return row;
}

/** Look up by exact providerRef or by Briq job/message id forms. */
export async function findDeliveryByBriqRefs(
  db: Db,
  refs: { jobId?: string; messageId?: string },
) {
  const candidates = [
    refs.jobId ? `briq:job:${refs.jobId}` : null,
    refs.messageId ? `briq:msg:${refs.messageId}` : null,
    refs.jobId ?? null,
    refs.messageId ?? null,
  ].filter((v): v is string => !!v);

  for (const ref of candidates) {
    const [row] = await db
      .select()
      .from(messageDeliveries)
      .where(eq(messageDeliveries.providerRef, ref))
      .limit(1);
    if (row) return row;
  }
  return null;
}

export async function updateDeliveryProviderRef(
  db: Db,
  deliveryId: string,
  providerRef: string,
) {
  await db
    .update(messageDeliveries)
    .set({ providerRef, updatedAt: new Date() })
    .where(eq(messageDeliveries.id, deliveryId));
}

export async function setJobStatus(
  db: Db,
  ctx: Ctx,
  jobId: string,
  status: 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled',
  opts?: { started?: boolean; completed?: boolean },
) {
  const patch: {
    status: string;
    updatedBy: string;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
  } = {
    status,
    updatedBy: ctx.actor.userAccountId,
    updatedAt: new Date(),
  };
  if (opts?.started) patch.startedAt = new Date();
  if (opts?.completed) patch.completedAt = new Date();
  await db
    .update(messageJobs)
    .set(patch)
    .where(and(eq(messageJobs.id, jobId), eq(messageJobs.churchId, ctx.churchId)));
}

export async function countDeliveryStatuses(db: Db, jobId: string) {
  const rows = await db
    .select({
      status: messageDeliveries.status,
      count: sql<number>`count(*)::int`,
    })
    .from(messageDeliveries)
    .where(eq(messageDeliveries.jobId, jobId))
    .groupBy(messageDeliveries.status);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = Number(r.count);
  return out;
}
