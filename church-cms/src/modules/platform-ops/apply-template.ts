import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Ctx, PlatformCtx } from '@/platform/auth';
import { getDb, type Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writePlatformAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { churches, churchSettings } from '@/modules/churches/db-schema';
import {
  deepMergeSettings,
  normalizeLogoKeys,
  resolveChurchSettings,
  validateChurchSettingsDocument,
} from '@/modules/churches/settings-schema';
import {
  organisationalUnits,
  positions,
  programmes,
} from '@/modules/organisation/db-schema';
import {
  allocateChurchCode,
  codeNamespaceForUnitKind,
} from '@/modules/organisation/code-sequences';
import { assertPlatformChurchesWrite } from './policies';
import * as repo from './repository';
import {
  CROSSLIFE_PILOT_DEPARTMENTS,
  CROSSLIFE_PILOT_MINISTRIES,
  CROSSLIFE_PILOT_POSITIONS,
  CROSSLIFE_PILOT_PROFILE,
  CROSSLIFE_PILOT_TEMPLATE_ID,
} from './templates/crosslife-pilot';

const KNOWN_TEMPLATES = [CROSSLIFE_PILOT_TEMPLATE_ID] as const;
export type ChurchTemplateId = (typeof KNOWN_TEMPLATES)[number];

function templatesApplied(
  settings: Record<string, unknown>,
): Record<string, string> {
  const block = settings.templates;
  if (!block || typeof block !== 'object' || Array.isArray(block)) return {};
  const applied = (block as Record<string, unknown>).applied;
  if (!applied || typeof applied !== 'object' || Array.isArray(applied)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(applied as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

/**
 * Apply a named church configuration template to an existing tenant.
 * Idempotent by name/title within the church; `force` allows re-stamp of profile
 * settings and applied-at timestamp.
 */
export async function applyChurchTemplate(
  platformCtx: PlatformCtx,
  churchId: string,
  body: { templateId: string; force?: boolean },
) {
  assertPlatformChurchesWrite(platformCtx);

  if (!KNOWN_TEMPLATES.includes(body.templateId as ChurchTemplateId)) {
    throw validationFailed([
      {
        field: 'templateId',
        code: 'unknown_template',
        message: `Unknown template. Supported: ${KNOWN_TEMPLATES.join(', ')}`,
      },
    ]);
  }

  const db = getDb();
  const church = await repo.getChurchById(db, churchId);
  if (!church) throw notFound();

  const [settingsRow] = await db
    .select()
    .from(churchSettings)
    .where(
      and(
        eq(churchSettings.churchId, churchId),
        isNull(churchSettings.deletedAt),
      ),
    )
    .limit(1);

  const existingSettings =
    (settingsRow?.settings as Record<string, unknown> | undefined) ?? {};
  const applied = templatesApplied(existingSettings);
  if (applied[body.templateId] && !body.force) {
    throw conflict(
      `Template "${body.templateId}" was already applied at ${applied[body.templateId]}. Pass force=true to re-apply.`,
    );
  }

  const summary = await applyCrosslifePilot(db, platformCtx, churchId, {
    existingSettings,
    settingsRowId: settingsRow?.id ?? null,
  });

  await writePlatformAudit(db, platformCtx, {
    action: 'platform.church.template_applied',
    entityType: 'church',
    entityId: churchId,
    churchId,
    metadata: { templateId: body.templateId, ...summary },
  });

  return {
    churchId,
    templateId: body.templateId,
    ...summary,
  };
}

async function applyCrosslifePilot(
  db: Db,
  platformCtx: PlatformCtx,
  churchId: string,
  opts: {
    existingSettings: Record<string, unknown>;
    settingsRowId: string | null;
  },
) {
  const actorId = platformCtx.actor.userAccountId;

  await db
    .update(churches)
    .set({
      name: CROSSLIFE_PILOT_PROFILE.name,
      shortName: CROSSLIFE_PILOT_PROFILE.shortName,
      displayName: CROSSLIFE_PILOT_PROFILE.displayName,
      updatedBy: actorId,
      updatedAt: sql`now()`,
    })
    .where(and(eq(churches.id, churchId), isNull(churches.deletedAt)));

  const settingsPatch = {
    branding: { ...CROSSLIFE_PILOT_PROFILE.branding },
    identity: { ...CROSSLIFE_PILOT_PROFILE.identity },
    contact: { ...CROSSLIFE_PILOT_PROFILE.contact },
    location: { ...CROSSLIFE_PILOT_PROFILE.location },
    presence: { ...CROSSLIFE_PILOT_PROFILE.presence },
    templates: {
      applied: {
        ...templatesApplied(opts.existingSettings),
        [CROSSLIFE_PILOT_TEMPLATE_ID]: new Date().toISOString(),
      },
    },
  };

  let merged = deepMergeSettings(opts.existingSettings, settingsPatch);
  merged = normalizeLogoKeys(merged);
  const errors = validateChurchSettingsDocument(merged);
  if (errors.length > 0) throw validationFailed(errors);

  if (opts.settingsRowId) {
    await db
      .update(churchSettings)
      .set({
        settings: merged,
        updatedBy: actorId,
        updatedAt: sql`now()`,
      })
      .where(eq(churchSettings.id, opts.settingsRowId));
  } else {
    await db.insert(churchSettings).values({
      id: newId(),
      churchId,
      settings: merged,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  const ctxLike = { churchId, actorUserId: actorId };

  let departmentsCreated = 0;
  for (const dept of CROSSLIFE_PILOT_DEPARTMENTS) {
    const before = await findUnitId(db, churchId, 'department', dept.name);
    await ensureUnit(db, ctxLike, {
      kind: 'department',
      name: dept.name,
      description: dept.description,
      metadata: { proposed: true, source: CROSSLIFE_PILOT_TEMPLATE_ID },
    });
    if (!before) departmentsCreated += 1;
  }

  let programmesCreated = 0;
  for (const ministry of CROSSLIFE_PILOT_MINISTRIES) {
    const ministryId = await ensureUnit(db, ctxLike, {
      kind: 'ministry',
      name: ministry.name,
      description: ministry.description,
      metadata: { source: CROSSLIFE_PILOT_TEMPLATE_ID },
    });
    if (ministry.programmes) {
      for (const programmeName of ministry.programmes) {
        const created = await ensureProgramme(
          db,
          ctxLike,
          ministryId,
          programmeName,
        );
        if (created) programmesCreated += 1;
      }
    }
  }

  const departmentsPresent = CROSSLIFE_PILOT_DEPARTMENTS.length;
  const ministriesPresent = CROSSLIFE_PILOT_MINISTRIES.length;

  let rootPositionId: string | null = null;
  let positionsCreated = 0;
  for (const position of CROSSLIFE_PILOT_POSITIONS) {
    const existingId = await findPositionId(db, churchId, position.title);
    let positionId = existingId;
    if (!positionId) {
      positionId = await insertPosition(db, ctxLike, {
        title: position.title,
        description: position.description,
      });
      positionsCreated += 1;
    }
    if (!position.reportsToRoot) {
      rootPositionId = positionId;
    }
  }

  if (rootPositionId) {
    for (const position of CROSSLIFE_PILOT_POSITIONS) {
      if (!position.reportsToRoot) continue;
      const positionId = await findPositionId(db, churchId, position.title);
      if (!positionId) continue;
      await db
        .update(positions)
        .set({
          reportsToPositionId: rootPositionId,
          description: position.description,
          updatedBy: actorId,
          updatedAt: sql`now()`,
        })
        .where(eq(positions.id, positionId));
    }
  }

  return {
    departmentsCreated,
    departmentsPresent,
    ministriesPresent,
    programmesCreated,
    positionsCreated,
    resolvedPreview: {
      name: CROSSLIFE_PILOT_PROFILE.name,
      productName: resolveChurchSettings(merged).branding.productName,
    },
  };
}

type ActorCtx = { churchId: string; actorUserId: string };

async function findUnitId(
  db: Db,
  churchId: string,
  kind: string,
  name: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: organisationalUnits.id })
    .from(organisationalUnits)
    .where(
      and(
        eq(organisationalUnits.churchId, churchId),
        eq(organisationalUnits.kind, kind),
        eq(organisationalUnits.name, name),
        isNull(organisationalUnits.deletedAt),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

/** Returns unit id (existing or newly created). */
async function ensureUnit(
  db: Db,
  ctx: ActorCtx,
  input: {
    kind: string;
    name: string;
    description: string;
    metadata: Record<string, unknown>;
  },
): Promise<string> {
  const existing = await findUnitId(db, ctx.churchId, input.kind, input.name);
  if (existing) return existing;

  const id = newId();
  const code = await allocateChurchCode(
    db,
    ctx.churchId,
    codeNamespaceForUnitKind(input.kind),
  );
  await db.insert(organisationalUnits).values({
    id,
    churchId: ctx.churchId,
    code,
    kind: input.kind,
    name: input.name,
    description: input.description,
    status: 'active',
    metadata: input.metadata,
    createdBy: ctx.actorUserId,
    updatedBy: ctx.actorUserId,
  });
  return id;
}

async function ensureProgramme(
  db: Db,
  ctx: ActorCtx,
  ministryUnitId: string,
  name: string,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: programmes.id })
    .from(programmes)
    .where(
      and(
        eq(programmes.churchId, ctx.churchId),
        eq(programmes.ministryUnitId, ministryUnitId),
        eq(programmes.name, name),
        isNull(programmes.deletedAt),
      ),
    )
    .limit(1);
  if (existing) return false;

  await db.insert(programmes).values({
    id: newId(),
    churchId: ctx.churchId,
    ministryUnitId,
    name,
    status: 'active',
    createdBy: ctx.actorUserId,
    updatedBy: ctx.actorUserId,
  });
  return true;
}

async function findPositionId(
  db: Db,
  churchId: string,
  title: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: positions.id })
    .from(positions)
    .where(
      and(
        eq(positions.churchId, churchId),
        eq(positions.title, title),
        isNull(positions.deletedAt),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

async function insertPosition(
  db: Db,
  ctx: ActorCtx,
  input: { title: string; description: string },
): Promise<string> {
  const id = newId();
  const code = await allocateChurchCode(db, ctx.churchId, 'pos');
  await db.insert(positions).values({
    id,
    churchId: ctx.churchId,
    code,
    title: input.title,
    description: input.description,
    status: 'active',
    occupancyPolicy: 'single',
    createdBy: ctx.actorUserId,
    updatedBy: ctx.actorUserId,
  });
  return id;
}

/** Exported for tests — build a tenant ctx shape (unused by applicator DB path). */
export function templateTenantCtx(
  platform: PlatformCtx,
  churchId: string,
): Ctx {
  return {
    actor: platform.actor,
    churchId,
    requestId: platform.requestId,
    locale: platform.locale,
    permissions: new Set(['units:write', 'positions:write', 'church:update']),
    isPlatformOperator: true,
  };
}
