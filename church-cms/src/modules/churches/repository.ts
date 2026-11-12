import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { churches, churchSettings } from './db-schema';
import type { UpdateChurchBody } from './schemas';

export async function getChurchById(db: Db, churchId: string) {
  const [row] = await db
    .select()
    .from(churches)
    .where(and(eq(churches.id, churchId), isNull(churches.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function updateChurch(
  db: Db,
  ctx: Ctx,
  body: UpdateChurchBody,
) {
  await db
    .update(churches)
    .set({
      ...body,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(and(eq(churches.id, ctx.churchId), isNull(churches.deletedAt)));
}

export async function getChurchSettings(db: Db, ctx: Ctx) {
  const [row] = await db
    .select()
    .from(churchSettings)
    .where(
      and(
        eq(churchSettings.churchId, ctx.churchId),
        isNull(churchSettings.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertChurchSettings(
  db: Db,
  ctx: Ctx,
  nextSettings: Record<string, unknown>,
) {
  const existing = await getChurchSettings(db, ctx);
  if (existing) {
    await db
      .update(churchSettings)
      .set({
        settings: nextSettings,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: sql`now()`,
      })
      .where(eq(churchSettings.id, existing.id));
    return existing.id;
  }
  const id = newId();
  await db.insert(churchSettings).values({
    id,
    churchId: ctx.churchId,
    settings: nextSettings,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}
