import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { memberships } from '@/modules/membership/db-schema';
import { personContacts } from '@/modules/people/db-schema';
import { importJobs, importRowResults, mediaAssets } from '@/modules/platform/db-schema';

export async function getJob(db: Db, ctx: Ctx, jobId: string) {
  const [row] = await db
    .select()
    .from(importJobs)
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.churchId, ctx.churchId),
        isNull(importJobs.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertMembersImportJob(
  db: Db,
  ctx: Ctx,
  rows: Record<string, string>[],
) {
  const mediaId = newId();
  const jobId = newId();
  const storageKey = `imports/${ctx.churchId}/${jobId}.json`;

  await db.insert(mediaAssets).values({
    id: mediaId,
    churchId: ctx.churchId,
    storageKey,
    contentType: 'application/json',
    byteSize: Buffer.byteLength(JSON.stringify(rows), 'utf8'),
    kind: 'import_source',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await db.insert(importJobs).values({
    id: jobId,
    churchId: ctx.churchId,
    mediaAssetId: mediaId,
    jobType: 'members_excel',
    status: 'uploaded',
    sourceSnapshot: rows,
    startedAt: new Date(),
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  return jobId;
}

export async function replaceRowResults(
  db: Db,
  jobId: string,
  rows: Array<{
    rowNumber: number;
    status: string;
    payload: unknown;
    errorCode: string | null;
  }>,
) {
  await db.delete(importRowResults).where(eq(importRowResults.jobId, jobId));
  for (const row of rows) {
    await db.insert(importRowResults).values({
      id: newId(),
      jobId,
      rowNumber: row.rowNumber,
      status: row.status,
      payload: row.payload,
      errorCode: row.errorCode,
    });
  }
}

export async function listRowResults(db: Db, jobId: string) {
  return db
    .select()
    .from(importRowResults)
    .where(eq(importRowResults.jobId, jobId))
    .orderBy(asc(importRowResults.rowNumber));
}

export async function setJobStatus(
  db: Db,
  ctx: Ctx,
  jobId: string,
  status: string,
  finished = false,
) {
  await db
    .update(importJobs)
    .set({
      status,
      updatedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
      ...(finished ? { finishedAt: new Date() } : {}),
    })
    .where(and(eq(importJobs.id, jobId), eq(importJobs.churchId, ctx.churchId)));
}

export async function findPersonIdByPhone(db: Db, ctx: Ctx, phoneE164: string) {
  const [row] = await db
    .select({ personId: personContacts.personId })
    .from(personContacts)
    .innerJoin(memberships, eq(memberships.personId, personContacts.personId))
    .where(
      and(
        eq(memberships.churchId, ctx.churchId),
        isNull(memberships.deletedAt),
        isNull(personContacts.deletedAt),
        eq(personContacts.channel, 'phone'),
        eq(personContacts.value, phoneE164),
      ),
    )
    .limit(1);
  return row?.personId ?? null;
}

export async function findPersonIdByEmail(db: Db, ctx: Ctx, email: string) {
  const [row] = await db
    .select({ personId: personContacts.personId })
    .from(personContacts)
    .innerJoin(memberships, eq(memberships.personId, personContacts.personId))
    .where(
      and(
        eq(memberships.churchId, ctx.churchId),
        isNull(memberships.deletedAt),
        isNull(personContacts.deletedAt),
        eq(personContacts.channel, 'email'),
        sql`lower(${personContacts.value}) = lower(${email})`,
      ),
    )
    .limit(1);
  return row?.personId ?? null;
}
