import type { PlatformCtx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { notFound, validationFailed } from '@/platform/errors';
import {
  assertPlatformConfigRead,
  assertPlatformConfigWrite,
} from './policies';
import * as churchRepo from './repository';
import * as configRepo from './config-repository';
import {
  deepMergeConfig,
  DEFAULT_PLATFORM_DEFAULTS_CONFIG,
  DEFAULT_PLATFORM_GLOBAL_CONFIG,
  resolvePlatformDefaultsConfig,
  resolvePlatformGlobalConfig,
  validateDefaultsConfigDocument,
  validateGlobalConfigDocument,
} from './config-document';
import type {
  GetPlatformConfigQuery,
  ListTenantConfigQuery,
  PatchPlatformConfigBody,
} from './config-schemas';

export async function getPlatformConfig(
  ctx: PlatformCtx,
  query: GetPlatformConfigQuery,
) {
  assertPlatformConfigRead(ctx);
  const db = getDb();

  if (query.scope === 'global') {
    const row = await configRepo.getConfigByScope(db, 'global');
    return {
      scope: 'global' as const,
      churchId: null,
      document: resolvePlatformGlobalConfig(row?.document ?? null),
      stored: Boolean(row),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  if (query.scope === 'defaults') {
    const row = await configRepo.getConfigByScope(db, 'defaults');
    return {
      scope: 'defaults' as const,
      churchId: null,
      document: resolvePlatformDefaultsConfig(row?.document ?? null),
      stored: Boolean(row),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      note: 'Suggested defaults for new tenants. Never silently overwrites existing church_settings.',
    };
  }

  const churchId = query.churchId!;
  const church = await churchRepo.getChurchById(db, churchId);
  if (!church) throw notFound('Church not found.');
  const row = await configRepo.getTenantConfig(db, churchId);
  const defaultsRow = await configRepo.getConfigByScope(db, 'defaults');
  const merged = deepMergeConfig(
    resolvePlatformDefaultsConfig(defaultsRow?.document ?? null) as unknown as Record<
      string,
      unknown
    >,
    (row?.document ?? {}) as Record<string, unknown>,
  );

  return {
    scope: 'tenant' as const,
    churchId,
    churchName: church.name,
    document: resolvePlatformDefaultsConfig(merged),
    stored: Boolean(row),
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    note: 'Platform tenant suggestions only. Live church_settings remain the church source of truth.',
  };
}

export async function patchPlatformConfig(
  ctx: PlatformCtx,
  body: PatchPlatformConfigBody,
) {
  assertPlatformConfigWrite(ctx);
  const db = getDb();

  if (body.scope === 'global') {
    const errors = validateGlobalConfigDocument(body.document);
    if (errors.length > 0) throw validationFailed(errors);
    const existing = await configRepo.getConfigByScope(db, 'global');
    const merged = deepMergeConfig(
      (existing?.document ??
        DEFAULT_PLATFORM_GLOBAL_CONFIG) as unknown as Record<string, unknown>,
      body.document,
    );
    const validation = validateGlobalConfigDocument(merged);
    if (validation.length > 0) throw validationFailed(validation);

    const id = await configRepo.upsertConfig(db, {
      id: newId(),
      scope: 'global',
      churchId: null,
      document: merged,
      actorUserId: ctx.actor.userAccountId,
    });

    await writePlatformAudit(db, ctx, {
      action: 'platform.config.patch',
      entityType: 'platform_config',
      entityId: id,
      reason: body.reason,
      metadata: sanitizeAuditMetadata({ scope: 'global', keys: Object.keys(body.document) }),
    });

    return {
      scope: 'global' as const,
      document: resolvePlatformGlobalConfig(merged),
    };
  }

  if (body.scope === 'defaults') {
    const errors = validateDefaultsConfigDocument(body.document);
    if (errors.length > 0) throw validationFailed(errors);
    const existing = await configRepo.getConfigByScope(db, 'defaults');
    const merged = deepMergeConfig(
      (existing?.document ??
        DEFAULT_PLATFORM_DEFAULTS_CONFIG) as unknown as Record<string, unknown>,
      body.document,
    );
    const validation = validateDefaultsConfigDocument(merged);
    if (validation.length > 0) throw validationFailed(validation);

    const id = await configRepo.upsertConfig(db, {
      id: newId(),
      scope: 'defaults',
      churchId: null,
      document: merged,
      actorUserId: ctx.actor.userAccountId,
    });

    await writePlatformAudit(db, ctx, {
      action: 'platform.config.patch',
      entityType: 'platform_config',
      entityId: id,
      reason: body.reason,
      metadata: sanitizeAuditMetadata({
        scope: 'defaults',
        keys: Object.keys(body.document),
      }),
    });

    return {
      scope: 'defaults' as const,
      document: resolvePlatformDefaultsConfig(merged),
    };
  }

  const churchId = body.churchId!;
  const church = await churchRepo.getChurchById(db, churchId);
  if (!church) throw notFound('Church not found.');

  const errors = validateDefaultsConfigDocument(body.document);
  if (errors.length > 0) throw validationFailed(errors);

  const existing = await configRepo.getTenantConfig(db, churchId);
  const merged = deepMergeConfig(
    (existing?.document ?? {}) as Record<string, unknown>,
    body.document,
  );
  const validation = validateDefaultsConfigDocument(merged);
  if (validation.length > 0) throw validationFailed(validation);

  const id = await configRepo.upsertConfig(db, {
    id: newId(),
    scope: 'tenant',
    churchId,
    document: merged,
    actorUserId: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.config.patch',
    entityType: 'platform_config',
    entityId: id,
    churchId,
    reason: body.reason,
    metadata: sanitizeAuditMetadata({
      scope: 'tenant',
      churchId,
      keys: Object.keys(body.document),
    }),
  });

  return {
    scope: 'tenant' as const,
    churchId,
    document: resolvePlatformDefaultsConfig(merged),
  };
}

export async function listTenantConfigOverrides(
  ctx: PlatformCtx,
  query: ListTenantConfigQuery,
) {
  assertPlatformConfigRead(ctx);
  const db = getDb();
  const rows = await configRepo.listTenantConfigs(db, query.limit);
  const { churchNameById, labelOrDash } = await import('./display-labels');
  const names = await churchNameById(
    db,
    rows.map((r) => r.churchId),
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      churchName: labelOrDash(names, r.churchId),
      updatedAt: r.updatedAt.toISOString(),
      keys: Object.keys(r.document ?? {}),
    })),
  };
}

export async function getConfigStatus(ctx: PlatformCtx) {
  assertPlatformConfigRead(ctx);
  const db = getDb();
  return configRepo.configLayerStatus(db);
}
