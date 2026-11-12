import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { attendanceDayAggregates } from '@/modules/events/db-schema';
import { offerings } from '@/modules/finance/db-schema';
import { memberships } from '@/modules/membership/db-schema';
import { people } from '@/modules/people/db-schema';
import { EXPORT_ROW_CAP } from './constants';

export async function exportPeopleRows(db: Db, ctx: Ctx) {
  return db
    .select({
      personId: people.id,
      displayName: people.displayName,
      fullName: people.fullName,
      preferredLocale: people.preferredLocale,
      directoryOptIn: people.directoryOptIn,
      membershipStatus: memberships.status,
      membershipType: memberships.membershipType,
      effectiveFrom: memberships.effectiveFrom,
    })
    .from(memberships)
    .innerJoin(people, eq(people.id, memberships.personId))
    .where(
      and(
        eq(memberships.churchId, ctx.churchId),
        isNull(memberships.deletedAt),
        isNull(people.deletedAt),
      ),
    )
    .orderBy(asc(people.displayName))
    .limit(EXPORT_ROW_CAP);
}

export async function exportAttendanceRows(
  db: Db,
  ctx: Ctx,
  from: string,
  to: string,
) {
  return db
    .select({
      serviceDate: attendanceDayAggregates.serviceDate,
      totalCount: attendanceDayAggregates.totalCount,
      breakdown: attendanceDayAggregates.breakdown,
    })
    .from(attendanceDayAggregates)
    .where(
      and(
        eq(attendanceDayAggregates.churchId, ctx.churchId),
        gte(attendanceDayAggregates.serviceDate, from),
        lte(attendanceDayAggregates.serviceDate, to),
        isNull(attendanceDayAggregates.deletedAt),
      ),
    )
    .orderBy(asc(attendanceDayAggregates.serviceDate))
    .limit(EXPORT_ROW_CAP);
}

export async function exportFinanceOfferingRows(
  db: Db,
  ctx: Ctx,
  from: string,
  to: string,
) {
  return db
    .select({
      id: offerings.id,
      serviceDate: offerings.serviceDate,
      amountMinor: offerings.amountMinor,
      currency: offerings.currency,
      fundId: offerings.fundId,
      journalId: offerings.journalId,
    })
    .from(offerings)
    .where(
      and(
        eq(offerings.churchId, ctx.churchId),
        gte(offerings.serviceDate, from),
        lte(offerings.serviceDate, to),
        isNull(offerings.deletedAt),
      ),
    )
    .orderBy(asc(offerings.serviceDate))
    .limit(EXPORT_ROW_CAP);
}

export async function countExportPreview(
  db: Db,
  ctx: Ctx,
  kind: 'people' | 'attendance' | 'finance',
  from?: string,
  to?: string,
) {
  if (kind === 'people') {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(
        and(eq(memberships.churchId, ctx.churchId), isNull(memberships.deletedAt)),
      );
    return Number(row?.count ?? 0);
  }
  if (kind === 'attendance') {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceDayAggregates)
      .where(
        and(
          eq(attendanceDayAggregates.churchId, ctx.churchId),
          from ? gte(attendanceDayAggregates.serviceDate, from) : sql`true`,
          to ? lte(attendanceDayAggregates.serviceDate, to) : sql`true`,
          isNull(attendanceDayAggregates.deletedAt),
        ),
      );
    return Number(row?.count ?? 0);
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offerings)
    .where(
      and(
        eq(offerings.churchId, ctx.churchId),
        from ? gte(offerings.serviceDate, from) : sql`true`,
        to ? lte(offerings.serviceDate, to) : sql`true`,
        isNull(offerings.deletedAt),
      ),
    );
  return Number(row?.count ?? 0);
}
