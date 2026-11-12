import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { notFound, validationFailed } from '@/platform/errors';
import { toChurchResponse, toChurchSettingsResponse } from './mappers';
import { assertCanReadChurch, assertCanUpdateChurch } from './policies';
import type { UpdateChurchBody, UpdateChurchSettingsBody } from './schemas';
import * as repo from './repository';

export async function getCurrentChurch(ctx: Ctx) {
  assertCanReadChurch(ctx);
  const row = await repo.getChurchById(getDb(), ctx.churchId);
  if (!row) throw notFound();
  return toChurchResponse(row);
}

export async function updateCurrentChurch(ctx: Ctx, body: UpdateChurchBody) {
  assertCanUpdateChurch(ctx);
  const db = getDb();
  const existing = await repo.getChurchById(db, ctx.churchId);
  if (!existing) throw notFound();

  await repo.updateChurch(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'church.profile.updated',
    entityType: 'church',
    entityId: ctx.churchId,
    metadata: { fields: Object.keys(body) },
  });
  const updated = await repo.getChurchById(db, ctx.churchId);
  if (!updated) throw notFound();
  return toChurchResponse(updated);
}

export async function getCurrentChurchSettings(ctx: Ctx) {
  assertCanReadChurch(ctx);
  const db = getDb();
  const church = await repo.getChurchById(db, ctx.churchId);
  if (!church) throw notFound();

  const row = await repo.getChurchSettings(db, ctx);
  if (!row) {
    return {
      churchId: ctx.churchId,
      settings: {},
      updatedAt: null as string | null,
    };
  }
  return toChurchSettingsResponse(row);
}

export async function updateCurrentChurchSettings(
  ctx: Ctx,
  body: UpdateChurchSettingsBody,
) {
  assertCanUpdateChurch(ctx);
  const db = getDb();
  const church = await repo.getChurchById(db, ctx.churchId);
  if (!church) throw notFound();

  // Reject nested Restricted-looking keys in values that look like secrets
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
  const merged = {
    ...((existing?.settings as Record<string, unknown> | undefined) ?? {}),
    ...body.settings,
  };

  await repo.upsertChurchSettings(db, ctx, merged);
  await writeAudit(db, ctx, {
    action: 'church.settings.updated',
    entityType: 'church_settings',
    entityId: ctx.churchId,
    metadata: { keys: Object.keys(body.settings) },
  });

  const row = await repo.getChurchSettings(db, ctx);
  if (!row) throw notFound();
  return toChurchSettingsResponse(row);
}
