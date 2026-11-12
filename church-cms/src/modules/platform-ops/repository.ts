import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { churches, churchSettings } from '@/modules/churches/db-schema';
import {
  organisationUsers,
  people,
  userAccounts,
} from '@/modules/people/db-schema';
import { memberships } from '@/modules/membership/db-schema';
import { attendanceRecords, eventTypes } from '@/modules/events/db-schema';
import { messageDeliveries, messageJobs } from '@/modules/messaging/db-schema';
import { auditEvents } from '@/modules/platform/db-schema';
import {
  permissions,
  rolePermissions,
  roles,
  userRoleAssignments,
} from '@/modules/access-control/db-schema';
import { DEFAULT_CHURCH_ROLES } from './role-bootstrap';
import {
  platformAuditEvents,
  platformMetricSnapshots,
  platformOperators,
  securityFindings,
} from './db-schema';
import type {
  ListFindingsQuery,
  ListPlatformAuditQuery,
} from './schemas';
import { DEFAULT_PLATFORM_PERMISSIONS } from './constants';

export async function countChurches(db: Db): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(churches)
    .where(isNull(churches.deletedAt));
  return Number(rows[0]?.n ?? 0);
}

export async function countPeople(db: Db): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(people)
    .where(isNull(people.deletedAt));
  return Number(rows[0]?.n ?? 0);
}

export async function countActiveMemberships(db: Db): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(memberships)
    .where(
      and(eq(memberships.status, 'active'), isNull(memberships.deletedAt)),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function countAttendanceCheckinsSince(
  db: Db,
  since: Date,
): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(attendanceRecords)
    .where(gte(attendanceRecords.createdAt, since));
  return Number(rows[0]?.n ?? 0);
}

export async function countMessageDeliveriesSince(
  db: Db,
  since: Date,
): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(messageDeliveries)
    .where(gte(messageDeliveries.createdAt, since));
  return Number(rows[0]?.n ?? 0);
}

export async function countOpenFindings(db: Db): Promise<{
  open: number;
  critical: number;
}> {
  const openRows = await db
    .select({ n: count() })
    .from(securityFindings)
    .where(eq(securityFindings.status, 'open'));
  const criticalRows = await db
    .select({ n: count() })
    .from(securityFindings)
    .where(
      and(
        eq(securityFindings.status, 'open'),
        eq(securityFindings.severity, 'critical'),
      ),
    );
  return {
    open: Number(openRows[0]?.n ?? 0),
    critical: Number(criticalRows[0]?.n ?? 0),
  };
}

export async function countFailedMessageJobsSince(
  db: Db,
  since: Date,
): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(messageJobs)
    .where(
      and(
        eq(messageJobs.status, 'failed'),
        gte(messageJobs.createdAt, since),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function countAuthFailureAuditsSince(
  db: Db,
  since: Date,
): Promise<number> {
  const platform = await db
    .select({ n: count() })
    .from(platformAuditEvents)
    .where(
      and(
        eq(platformAuditEvents.outcome, 'failure'),
        gte(platformAuditEvents.createdAt, since),
        sql`${platformAuditEvents.action} like 'auth.%'`,
      ),
    );
  const church = await db
    .select({ n: count() })
    .from(auditEvents)
    .where(
      and(
        gte(auditEvents.createdAt, since),
        sql`${auditEvents.action} like 'auth.%.fail%'`,
      ),
    );
  return Number(platform[0]?.n ?? 0) + Number(church[0]?.n ?? 0);
}

export async function listChurches(db: Db) {
  return db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      timezone: churches.timezone,
      defaultLocale: churches.defaultLocale,
      createdAt: churches.createdAt,
    })
    .from(churches)
    .where(isNull(churches.deletedAt))
    .orderBy(desc(churches.createdAt));
}

export async function getChurchById(db: Db, churchId: string) {
  const rows = await db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      timezone: churches.timezone,
      defaultLocale: churches.defaultLocale,
      createdAt: churches.createdAt,
    })
    .from(churches)
    .where(and(eq(churches.id, churchId), isNull(churches.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function churchCounts(db: Db, churchId: string) {
  const peopleN = await db
    .select({ n: count() })
    .from(memberships)
    .where(
      and(eq(memberships.churchId, churchId), isNull(memberships.deletedAt)),
    );
  const activeN = await db
    .select({ n: count() })
    .from(memberships)
    .where(
      and(
        eq(memberships.churchId, churchId),
        eq(memberships.status, 'active'),
        isNull(memberships.deletedAt),
      ),
    );
  return {
    memberships: Number(peopleN[0]?.n ?? 0),
    activeMemberships: Number(activeN[0]?.n ?? 0),
  };
}

export async function listPlatformAudit(
  db: Db,
  query: ListPlatformAuditQuery,
) {
  const conditions = [];
  if (query.from) conditions.push(gte(platformAuditEvents.createdAt, new Date(query.from)));
  if (query.to) conditions.push(lte(platformAuditEvents.createdAt, new Date(query.to)));
  if (query.action) conditions.push(eq(platformAuditEvents.action, query.action));
  if (query.churchId) conditions.push(eq(platformAuditEvents.churchId, query.churchId));
  if (query.actorUserId) {
    conditions.push(eq(platformAuditEvents.actorUserId, query.actorUserId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select({
      id: platformAuditEvents.id,
      actorUserId: platformAuditEvents.actorUserId,
      action: platformAuditEvents.action,
      outcome: platformAuditEvents.outcome,
      churchId: platformAuditEvents.churchId,
      entityType: platformAuditEvents.entityType,
      entityId: platformAuditEvents.entityId,
      requestId: platformAuditEvents.requestId,
      reason: platformAuditEvents.reason,
      metadata: platformAuditEvents.metadata,
      createdAt: platformAuditEvents.createdAt,
    })
    .from(platformAuditEvents)
    .where(where)
    .orderBy(desc(platformAuditEvents.createdAt))
    .limit(query.limit);

  return items;
}

export async function listFindings(db: Db, query: ListFindingsQuery) {
  const conditions = [];
  if (query.status) conditions.push(eq(securityFindings.status, query.status));
  if (query.severity) conditions.push(eq(securityFindings.severity, query.severity));
  if (query.churchId) conditions.push(eq(securityFindings.churchId, query.churchId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(securityFindings)
    .where(where)
    .orderBy(desc(securityFindings.lastSeenAt))
    .limit(query.limit);
}

export async function getFindingById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(securityFindings)
    .where(eq(securityFindings.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateFindingStatus(
  db: Db,
  id: string,
  status: string,
  actorUserId: string,
) {
  const now = new Date();
  await db
    .update(securityFindings)
    .set({
      status,
      ackBy: status === 'ack' || status === 'resolved' ? actorUserId : undefined,
      ackAt: status === 'ack' || status === 'resolved' ? now : undefined,
      resolvedAt: status === 'resolved' ? now : null,
    })
    .where(eq(securityFindings.id, id));
}

export async function upsertFinding(
  db: Db,
  input: {
    detectorKey: string;
    severity: string;
    category: string;
    title: string;
    churchId?: string;
    evidence?: Record<string, unknown>;
  },
) {
  const existing = await db
    .select({ id: securityFindings.id })
    .from(securityFindings)
    .where(
      and(
        eq(securityFindings.detectorKey, input.detectorKey),
        sql`${securityFindings.status} in ('open', 'ack')`,
      ),
    )
    .limit(1);

  const now = new Date();
  if (existing[0]) {
    await db
      .update(securityFindings)
      .set({
        lastSeenAt: now,
        severity: input.severity,
        title: input.title,
        evidence: input.evidence ?? {},
        churchId: input.churchId,
      })
      .where(eq(securityFindings.id, existing[0].id));
    return existing[0].id;
  }

  const id = newId();
  await db.insert(securityFindings).values({
    id,
    detectorKey: input.detectorKey,
    severity: input.severity,
    category: input.category,
    title: input.title,
    churchId: input.churchId,
    evidence: input.evidence ?? {},
    status: 'open',
    firstSeenAt: now,
    lastSeenAt: now,
  });
  return id;
}

export async function listOperators(db: Db) {
  return db
    .select({
      id: platformOperators.id,
      userAccountId: platformOperators.userAccountId,
      status: platformOperators.status,
      permissions: platformOperators.permissions,
      createdAt: platformOperators.createdAt,
      email: userAccounts.email,
    })
    .from(platformOperators)
    .leftJoin(
      userAccounts,
      eq(userAccounts.id, platformOperators.userAccountId),
    )
    .where(isNull(platformOperators.deletedAt))
    .orderBy(desc(platformOperators.createdAt));
}

export async function insertOperator(
  db: Db,
  input: {
    userAccountId: string;
    permissions?: string[];
    actorUserId: string;
  },
) {
  const id = newId();
  await db.insert(platformOperators).values({
    id,
    userAccountId: input.userAccountId,
    status: 'active',
    permissions: input.permissions ?? [...DEFAULT_PLATFORM_PERMISSIONS],
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });
  return id;
}

export async function accessSummary(db: Db) {
  const roleCounts = await db
    .select({
      churchId: userRoleAssignments.churchId,
      roleCode: roles.code,
      n: count(),
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
    .where(isNull(userRoleAssignments.deletedAt))
    .groupBy(userRoleAssignments.churchId, roles.code);

  const recentPrivilege = await db
    .select({
      id: platformAuditEvents.id,
      action: platformAuditEvents.action,
      actorUserId: platformAuditEvents.actorUserId,
      churchId: platformAuditEvents.churchId,
      createdAt: platformAuditEvents.createdAt,
      metadata: platformAuditEvents.metadata,
    })
    .from(platformAuditEvents)
    .where(
      sql`${platformAuditEvents.action} in (
        'platform.operator.add',
        'platform.tenant.enter',
        'access.role.assign',
        'access.role.revoke'
      )`,
    )
    .orderBy(desc(platformAuditEvents.createdAt))
    .limit(30);

  return { roleCounts, recentPrivilege };
}

export async function listMetricSeries(
  db: Db,
  metricKey: string,
  sinceDate: string,
) {
  return db
    .select({
      snapshotDate: platformMetricSnapshots.snapshotDate,
      value: platformMetricSnapshots.value,
      churchId: platformMetricSnapshots.churchId,
    })
    .from(platformMetricSnapshots)
    .where(
      and(
        eq(platformMetricSnapshots.metricKey, metricKey),
        gte(platformMetricSnapshots.snapshotDate, sinceDate),
        isNull(platformMetricSnapshots.churchId),
      ),
    )
    .orderBy(platformMetricSnapshots.snapshotDate);
}

export async function upsertMetricSnapshot(
  db: Db,
  input: {
    snapshotDate: string;
    metricKey: string;
    value: number;
    churchId?: string;
  },
) {
  const existing = await db
    .select({ id: platformMetricSnapshots.id })
    .from(platformMetricSnapshots)
    .where(
      and(
        eq(platformMetricSnapshots.snapshotDate, input.snapshotDate),
        eq(platformMetricSnapshots.metricKey, input.metricKey),
        input.churchId
          ? eq(platformMetricSnapshots.churchId, input.churchId)
          : isNull(platformMetricSnapshots.churchId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(platformMetricSnapshots)
      .set({ value: input.value })
      .where(eq(platformMetricSnapshots.id, existing[0].id));
    return;
  }

  await db.insert(platformMetricSnapshots).values({
    id: newId(),
    snapshotDate: input.snapshotDate,
    metricKey: input.metricKey,
    churchId: input.churchId,
    value: input.value,
  });
}

export async function recentFindings(db: Db, limit: number) {
  return db
    .select()
    .from(securityFindings)
    .where(eq(securityFindings.status, 'open'))
    .orderBy(desc(securityFindings.lastSeenAt))
    .limit(limit);
}

export async function countRoleAssignAuditsSince(
  db: Db,
  since: Date,
): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(auditEvents)
    .where(
      and(
        gte(auditEvents.createdAt, since),
        sql`${auditEvents.action} like '%.role.%'`,
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function countExportsSince(db: Db, since: Date): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(auditEvents)
    .where(
      and(
        gte(auditEvents.createdAt, since),
        sql`${auditEvents.action} like 'exports.%'`,
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function findChurchBySlug(db: Db, slug: string) {
  const rows = await db
    .select({ id: churches.id })
    .from(churches)
    .where(and(eq(churches.slug, slug), isNull(churches.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserAccountByEmail(db: Db, email: string) {
  const rows = await db
    .select({ id: userAccounts.id })
    .from(userAccounts)
    .where(and(eq(userAccounts.email, email), isNull(userAccounts.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserAccountByPhone(db: Db, phoneE164: string) {
  const rows = await db
    .select({ id: userAccounts.id })
    .from(userAccounts)
    .where(
      and(eq(userAccounts.phoneE164, phoneE164), isNull(userAccounts.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertChurch(
  db: Db,
  input: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    defaultLocale: string;
    actorUserId: string;
  },
) {
  await db.insert(churches).values({
    id: input.id,
    name: input.name,
    slug: input.slug,
    timezone: input.timezone,
    defaultLocale: input.defaultLocale,
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });
  await db.insert(churchSettings).values({
    id: newId(),
    churchId: input.id,
    settings: {},
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });
}

export async function bootstrapChurchRoles(
  db: Db,
  churchId: string,
  actorUserId: string,
): Promise<{ administratorRoleId: string; memberRoleId: string }> {
  const permissionRows = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions);

  const byCode = new Map(permissionRows.map((p) => [p.code, p.id]));
  let administratorRoleId = '';
  let memberRoleId = '';

  for (const roleDef of DEFAULT_CHURCH_ROLES) {
    const roleId = newId();
    await db.insert(roles).values({
      id: roleId,
      churchId,
      code: roleDef.code,
      name: roleDef.name,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    const permissionIds = roleDef.permissions
      .map((code) => byCode.get(code))
      .filter((id): id is string => Boolean(id));

    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      );
    }

    if (roleDef.code === 'church_administrator') administratorRoleId = roleId;
    if (roleDef.code === 'member') memberRoleId = roleId;
  }

  if (!administratorRoleId || !memberRoleId) {
    throw new Error('Failed to bootstrap required church roles');
  }

  return { administratorRoleId, memberRoleId };
}

export async function insertChurchAdminBundle(
  db: Db,
  input: {
    churchId: string;
    actorUserId: string;
    administratorRoleId: string;
    personId: string;
    userAccountId: string;
    displayName: string;
    email: string;
    phoneE164?: string | null;
  },
) {
  await db.insert(people).values({
    id: input.personId,
    displayName: input.displayName,
    fullName: input.displayName,
    preferredLocale: 'en',
    directoryOptIn: false,
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });

  await db.insert(userAccounts).values({
    id: input.userAccountId,
    email: input.email,
    phoneE164: input.phoneE164 ?? null,
    status: 'active',
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });

  await db.insert(organisationUsers).values({
    id: newId(),
    churchId: input.churchId,
    userAccountId: input.userAccountId,
    personId: input.personId,
    status: 'active',
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });

  await db.insert(memberships).values({
    id: newId(),
    churchId: input.churchId,
    personId: input.personId,
    membershipType: 'individual',
    status: 'active',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });

  await db.insert(userRoleAssignments).values({
    id: newId(),
    churchId: input.churchId,
    userAccountId: input.userAccountId,
    roleId: input.administratorRoleId,
    scopeType: 'church',
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });
}

export async function insertDefaultEventTypes(
  db: Db,
  churchId: string,
  actorUserId: string,
) {
  const defaults = [
    { code: 'sunday_service', name: 'Sunday Service' },
    { code: 'midweek_service', name: 'Midweek Service' },
    { code: 'special_event', name: 'Special Event' },
    { code: 'ministry_meeting', name: 'Ministry Meeting' },
  ] as const;

  await db.insert(eventTypes).values(
    defaults.map((row) => ({
      id: newId(),
      churchId,
      code: row.code,
      name: row.name,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })),
  );
}
