import { and, eq, isNull } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { mediaAssets } from '@/modules/platform/db-schema';

export async function insertMediaAsset(
  db: Db,
  ctx: Ctx,
  input: {
    id?: string;
    storageKey: string;
    contentType: string;
    byteSize: number;
    kind: string;
  },
) {
  const id = input.id ?? newId();
  await db.insert(mediaAssets).values({
    id,
    churchId: ctx.churchId,
    storageKey: input.storageKey,
    contentType: input.contentType,
    byteSize: input.byteSize,
    kind: input.kind,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getMediaAsset(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, id),
        eq(mediaAssets.churchId, ctx.churchId),
        isNull(mediaAssets.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
