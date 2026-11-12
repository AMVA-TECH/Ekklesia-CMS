import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { notFound, validationFailed } from '@/platform/errors';
import { newId } from '@/platform/db/ids';
import { assertCanReadMedia, assertCanUploadMedia } from './policies';
import { readMediaBytes, writeMediaBytes } from './local-store';
import * as repo from './repository';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 8 * 1024 * 1024;

export async function uploadMedia(
  ctx: Ctx,
  input: {
    bytes: Buffer;
    contentType: string;
    kind?: string;
  },
) {
  assertCanUploadMedia(ctx);
  if (!ALLOWED_IMAGE_TYPES.has(input.contentType)) {
    throw validationFailed([
      {
        field: 'file',
        code: 'unsupported_type',
        message: 'Only JPEG, PNG, WebP, or GIF images are allowed',
      },
    ]);
  }
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_BYTES) {
    throw validationFailed([
      {
        field: 'file',
        code: 'invalid_size',
        message: 'Image must be between 1 byte and 8MB',
      },
    ]);
  }

  const id = newId();
  const ext =
    input.contentType === 'image/png'
      ? 'png'
      : input.contentType === 'image/webp'
        ? 'webp'
        : input.contentType === 'image/gif'
          ? 'gif'
          : 'jpg';
  const kind = input.kind?.trim() || 'event_poster';
  const storageKey = `${ctx.churchId}/${kind}/${id}.${ext}`;
  await writeMediaBytes(storageKey, input.bytes);

  const db = getDb();
  const mediaId = await repo.insertMediaAsset(db, ctx, {
    id,
    storageKey,
    contentType: input.contentType,
    byteSize: input.bytes.byteLength,
    kind,
  });

  await writeAudit(db, ctx, {
    action: 'media.uploaded',
    entityType: 'media_asset',
    entityId: mediaId,
    metadata: {
      kind,
      contentType: input.contentType,
      byteSize: input.bytes.byteLength,
    },
  });

  return {
    id: mediaId,
    contentType: input.contentType,
    byteSize: input.bytes.byteLength,
    kind,
    url: `/api/v1/media/${mediaId}/content`,
  };
}

export async function getMediaContent(ctx: Ctx, mediaId: string) {
  assertCanReadMedia(ctx);
  const db = getDb();
  const row = await repo.getMediaAsset(db, ctx, mediaId);
  if (!row) throw notFound();
  const bytes = await readMediaBytes(row.storageKey);
  return {
    bytes,
    contentType: row.contentType ?? 'application/octet-stream',
    byteSize: row.byteSize ?? bytes.byteLength,
  };
}

export async function getMediaMeta(ctx: Ctx, mediaId: string) {
  assertCanReadMedia(ctx);
  const row = await repo.getMediaAsset(getDb(), ctx, mediaId);
  if (!row) throw notFound();
  return {
    id: row.id,
    contentType: row.contentType,
    byteSize: row.byteSize,
    kind: row.kind,
    url: `/api/v1/media/${row.id}/content`,
  };
}
