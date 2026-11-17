import { z } from 'zod';

import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { getMediaAsset } from '@/modules/media';
import {
  CHURCH_LOGO_MEDIA_SETTING,
  readLogoMediaId,
} from './constants';
import { toChurchResponse, toChurchSettingsResponse } from './mappers';
import { assertCanReadChurch, assertCanUpdateChurch } from './policies';
import type { UpdateChurchBody, UpdateChurchSettingsBody } from './schemas';
import * as repo from './repository';
import {
  deepMergeSettings,
  normalizeLogoKeys,
  resolveChurchSettings,
  validateChurchSettingsDocument,
} from './settings-schema';

const logoMediaIdSchema = z.guid();

async function settingsRawForChurch(
  ctx: Ctx,
): Promise<Record<string, unknown>> {
  const settingsRow = await repo.getChurchSettings(getDb(), ctx);
  return (
    (settingsRow?.settings as Record<string, unknown> | undefined) ?? {}
  );
}

async function logoMediaIdForChurch(ctx: Ctx): Promise<string | null> {
  return readLogoMediaId(await settingsRawForChurch(ctx));
}

export async function getCurrentChurch(ctx: Ctx) {
  assertCanReadChurch(ctx);
  const row = await repo.getChurchById(getDb(), ctx.churchId);
  if (!row) throw notFound();
  const raw = await settingsRawForChurch(ctx);
  return toChurchResponse(row, {
    logoMediaId: readLogoMediaId(raw),
    config: resolveChurchSettings(raw),
  });
}

export async function updateCurrentChurch(ctx: Ctx, body: UpdateChurchBody) {
  assertCanUpdateChurch(ctx);
  const db = getDb();
  const existing = await repo.getChurchById(db, ctx.churchId);
  if (!existing) throw notFound();

  if (body.slug && body.slug !== existing.slug) {
    const taken = await repo.isSlugTaken(db, body.slug, ctx.churchId);
    if (taken) {
      throw conflict('This church slug is already in use.');
    }
  }

  try {
    await repo.updateChurch(db, ctx, body);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      throw conflict('This church slug is already in use.');
    }
    throw error;
  }

  await writeAudit(db, ctx, {
    action: 'church.profile.updated',
    entityType: 'church',
    entityId: ctx.churchId,
    metadata: {
      fields: Object.keys(body),
      previousSlug:
        body.slug && body.slug !== existing.slug ? existing.slug : undefined,
    },
  });
  const updated = await repo.getChurchById(db, ctx.churchId);
  if (!updated) throw notFound();
  const raw = await settingsRawForChurch(ctx);
  return toChurchResponse(updated, {
    logoMediaId: readLogoMediaId(raw),
    config: resolveChurchSettings(raw),
  });
}

export async function getCurrentChurchSettings(ctx: Ctx) {
  assertCanReadChurch(ctx);
  const db = getDb();
  const church = await repo.getChurchById(db, ctx.churchId);
  if (!church) throw notFound();

  const row = await repo.getChurchSettings(db, ctx);
  const raw =
    (row?.settings as Record<string, unknown> | undefined) ?? {};
  return {
    churchId: ctx.churchId,
    settings: raw,
    resolved: resolveChurchSettings(raw),
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}

async function assertLogoMediaExists(
  ctx: Ctx,
  mediaId: string,
  field: string,
): Promise<void> {
  const media = await getMediaAsset(getDb(), ctx, mediaId);
  if (!media) {
    throw validationFailed([
      {
        field,
        code: 'not_found',
        message: 'Logo media was not found for this church',
      },
    ]);
  }
}

export async function updateCurrentChurchSettings(
  ctx: Ctx,
  body: UpdateChurchSettingsBody,
) {
  assertCanUpdateChurch(ctx);
  const db = getDb();
  const church = await repo.getChurchById(db, ctx.churchId);
  if (!church) throw notFound();

  for (const [key, value] of Object.entries(body.settings)) {
    if (/password|secret|token|api.?key/i.test(key)) {
      throw validationFailed([
        {
          field: `settings.${key}`,
          code: 'forbidden_key',
          message: 'Sensitive keys are not allowed in church settings',
        },
      ]);
    }
    if (typeof value === 'string' && value.length > 2000) {
      throw validationFailed([
        {
          field: `settings.${key}`,
          code: 'too_long',
          message: 'Setting string values must be at most 2000 characters',
        },
      ]);
    }
  }

  const existing = await repo.getChurchSettings(db, ctx);
  const base =
    (existing?.settings as Record<string, unknown> | undefined) ?? {};
  let merged = deepMergeSettings(base, body.settings as Record<string, unknown>);
  merged = normalizeLogoKeys(merged);

  const fieldErrors = validateChurchSettingsDocument(merged);
  if (fieldErrors.length > 0) {
    throw validationFailed(fieldErrors);
  }

  const resolvedLogo = readLogoMediaId(merged);
  if (resolvedLogo) {
    const parsed = logoMediaIdSchema.safeParse(resolvedLogo);
    if (!parsed.success) {
      throw validationFailed([
        {
          field: `settings.${CHURCH_LOGO_MEDIA_SETTING}`,
          code: 'invalid',
          message: 'logoMediaId must be a media asset id or null',
        },
      ]);
    }
    await assertLogoMediaExists(
      ctx,
      parsed.data,
      `settings.branding.logoMediaId`,
    );
  }

  await repo.upsertChurchSettings(db, ctx, merged);
  await writeAudit(db, ctx, {
    action: 'church.settings.updated',
    entityType: 'church_settings',
    entityId: ctx.churchId,
    metadata: { keys: Object.keys(body.settings) },
  });

  const row = await repo.getChurchSettings(db, ctx);
  if (!row) throw notFound();
  const raw = (row.settings as Record<string, unknown>) ?? {};
  return {
    ...toChurchSettingsResponse(row),
    resolved: resolveChurchSettings(raw),
  };
}
