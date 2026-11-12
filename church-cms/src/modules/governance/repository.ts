import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  approvalActions,
  approvalRequests,
  budgetLines,
  budgets,
  expenses,
  funds,
  offerings,
  pledges,
} from '@/modules/finance/db-schema';
import { attendanceDayAggregates } from '@/modules/events/db-schema';
import { memberships, membershipApplications } from '@/modules/membership/db-schema';
import { participationRequests, participations } from '@/modules/ministries/db-schema';
import {
  announcements,
  messageDeliveries,
  messageJobs,
} from '@/modules/messaging/db-schema';
import {
  appointments,
  organisationalUnits,
  delegations,
} from '@/modules/organisation/db-schema';
import { people } from '@/modules/people/db-schema';
import { ATTENDANCE_BAND_THRESHOLDS, type AttendanceBand } from './constants';
import {
  appointmentRequests,
  meetingMinutes,
  savedReports,
} from './db-schema';
import type {
  CreateAppointmentRequestBody,
  CreateBudgetBody,
  CreateDelegationBody,
  CreateExpenseBody,
  CreateMeetingMinutesBody,
  CreateSavedReportBody,
  ListApprovalsQuery,
  ListDelegationsQuery,
} from './schemas';

export async function insertExpense(db: Db, ctx: Ctx, body: CreateExpenseBody) {
  const id = newId();
  await db.insert(expenses).values({
    id,
    churchId: ctx.churchId,
    amountMinor: body.amountMinor,
    currency: body.currency ?? 'TZS',
    expenseDate: body.expenseDate,
    purpose: body.purpose,
    organisationalUnitId: body.organisationalUnitId,
    accountId: body.accountId,
    paymentAccountId: body.paymentAccountId,
    fundId: body.fundId,
    status: 'draft',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function linkExpenseJournal(
  db: Db,
  ctx: Ctx,
  expenseId: string,
  journalId: string,
) {
  await db
    .update(expenses)
    .set({
      journalId,
      status: 'posted',
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.id, expenseId), eq(expenses.churchId, ctx.churchId)));
}

export async function getExpense(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.id, id),
        eq(expenses.churchId, ctx.churchId),
        isNull(expenses.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function setExpenseStatus(
  db: Db,
  ctx: Ctx,
  id: string,
  status: string,
) {
  await db
    .update(expenses)
    .set({
      status,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.id, id), eq(expenses.churchId, ctx.churchId)));
}

export async function insertApprovalRequest(
  db: Db,
  ctx: Ctx,
  subjectType: string,
  subjectId: string,
) {
  const id = newId();
  await db.insert(approvalRequests).values({
    id,
    churchId: ctx.churchId,
    subjectType,
    subjectId,
    requestedByUserId: ctx.actor.userAccountId,
    status: 'pending',
    currentStep: 1,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function listApprovalRequests(
  db: Db,
  ctx: Ctx,
  query: ListApprovalsQuery,
) {
  return db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.churchId, ctx.churchId),
        eq(approvalRequests.status, query.status),
        isNull(approvalRequests.deletedAt),
      ),
    )
    .orderBy(desc(approvalRequests.createdAt))
    .limit(query.limit);
}

export async function getApprovalRequest(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.id, id),
        eq(approvalRequests.churchId, ctx.churchId),
        isNull(approvalRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findPendingApprovalBySubject(
  db: Db,
  ctx: Ctx,
  subjectType: string,
  subjectId: string,
) {
  const [row] = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.churchId, ctx.churchId),
        eq(approvalRequests.subjectType, subjectType),
        eq(approvalRequests.subjectId, subjectId),
        eq(approvalRequests.status, 'pending'),
        isNull(approvalRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function recordApprovalDecision(
  db: Db,
  ctx: Ctx,
  approvalId: string,
  action: 'approve' | 'reject',
  note: string | undefined,
) {
  await db.insert(approvalActions).values({
    id: newId(),
    approvalRequestId: approvalId,
    actorUserId: ctx.actor.userAccountId,
    action,
    note,
  });
  await db
    .update(approvalRequests)
    .set({
      status: action === 'approve' ? 'approved' : 'rejected',
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(approvalRequests.id, approvalId),
        eq(approvalRequests.churchId, ctx.churchId),
      ),
    );
}

export async function countMembershipsByStatus(db: Db, ctx: Ctx) {
  const rows = await db
    .select({
      status: memberships.status,
      count: sql<number>`count(*)::int`,
    })
    .from(memberships)
    .where(
      and(eq(memberships.churchId, ctx.churchId), isNull(memberships.deletedAt)),
    )
    .groupBy(memberships.status);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = Number(r.count);
  return out;
}

export async function countPending(db: Db, ctx: Ctx) {
  const [approvals] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.churchId, ctx.churchId),
        eq(approvalRequests.status, 'pending'),
        isNull(approvalRequests.deletedAt),
      ),
    );
  const [joins] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participationRequests)
    .where(
      and(
        eq(participationRequests.churchId, ctx.churchId),
        eq(participationRequests.status, 'pending'),
        isNull(participationRequests.deletedAt),
      ),
    );
  const [apps] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(membershipApplications)
    .where(
      and(
        eq(membershipApplications.churchId, ctx.churchId),
        eq(membershipApplications.status, 'pending'),
        isNull(membershipApplications.deletedAt),
      ),
    );
  const [anns] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(announcements)
    .where(
      and(
        eq(announcements.churchId, ctx.churchId),
        eq(announcements.status, 'pending_approval'),
        isNull(announcements.deletedAt),
      ),
    );
  return {
    approvalRequests: Number(approvals?.count ?? 0),
    participationRequests: Number(joins?.count ?? 0),
    membershipApplications: Number(apps?.count ?? 0),
    announcementsPending: Number(anns?.count ?? 0),
  };
}

export async function listDelegations(db: Db, ctx: Ctx, query: ListDelegationsQuery) {
  const conditions = [
    eq(delegations.churchId, ctx.churchId),
    isNull(delegations.deletedAt),
  ];
  if (query.status) conditions.push(eq(delegations.status, query.status));
  return db
    .select()
    .from(delegations)
    .where(and(...conditions))
    .orderBy(desc(delegations.effectiveFrom))
    .limit(query.limit);
}

export async function getDelegation(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.id, id),
        eq(delegations.churchId, ctx.churchId),
        isNull(delegations.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertDelegation(
  db: Db,
  ctx: Ctx,
  body: CreateDelegationBody,
) {
  const id = newId();
  const from = new Date(body.effectiveFrom);
  const to = body.effectiveTo ? new Date(body.effectiveTo) : null;
  const now = new Date();
  const status =
    from <= now && (!to || to >= now) ? 'active' : from > now ? 'scheduled' : 'ended';
  await db.insert(delegations).values({
    id,
    churchId: ctx.churchId,
    delegatorUserId: ctx.actor.userAccountId,
    delegateUserId: body.delegateUserId,
    grants: body.grants,
    effectiveFrom: from,
    effectiveTo: to,
    status,
    reason: body.reason,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function revokeDelegation(db: Db, ctx: Ctx, id: string) {
  await db
    .update(delegations)
    .set({
      status: 'revoked',
      effectiveTo: new Date(),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(and(eq(delegations.id, id), eq(delegations.churchId, ctx.churchId)));
}

export async function listActiveDelegations(db: Db, ctx: Ctx) {
  return db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.churchId, ctx.churchId),
        eq(delegations.status, 'active'),
        isNull(delegations.deletedAt),
      ),
    )
    .orderBy(asc(delegations.effectiveFrom));
}

export async function attendanceOverview(
  db: Db,
  ctx: Ctx,
  from?: string,
  to?: string,
) {
  const dayConditions = [
    eq(attendanceDayAggregates.churchId, ctx.churchId),
    isNull(attendanceDayAggregates.deletedAt),
  ];
  if (from) dayConditions.push(gte(attendanceDayAggregates.serviceDate, from));
  if (to) dayConditions.push(lte(attendanceDayAggregates.serviceDate, to));

  const days = await db
    .select({
      serviceDate: attendanceDayAggregates.serviceDate,
      totalCount: attendanceDayAggregates.totalCount,
      breakdown: attendanceDayAggregates.breakdown,
    })
    .from(attendanceDayAggregates)
    .where(and(...dayConditions))
    .orderBy(desc(attendanceDayAggregates.serviceDate))
    .limit(90);

  const sessionRows = await db.execute(sql`
    SELECT e.service_date AS "serviceDate", e.title, s.mode, s.status,
           coalesce(sum.total_count, 0)::int AS "totalCount"
    FROM attendance_sessions s
    JOIN events e ON e.id = s.event_id
    LEFT JOIN attendance_summaries sum ON sum.session_id = s.id
    WHERE s.church_id = ${ctx.churchId}::uuid
      AND s.deleted_at IS NULL
      ${from ? sql`AND e.service_date >= ${from}` : sql``}
      ${to ? sql`AND e.service_date <= ${to}` : sql``}
    ORDER BY e.service_date DESC
    LIMIT 100
  `);
  const sessions = Array.isArray(sessionRows)
    ? sessionRows
    : ((sessionRows as { rows?: unknown[] }).rows ?? []);

  return { days, sessions };
}

export async function participationHealth(db: Db, ctx: Ctx) {
  const pendingByUnit = await db
    .select({
      organisationalUnitId: participationRequests.organisationalUnitId,
      count: sql<number>`count(*)::int`,
    })
    .from(participationRequests)
    .where(
      and(
        eq(participationRequests.churchId, ctx.churchId),
        eq(participationRequests.status, 'pending'),
        isNull(participationRequests.deletedAt),
      ),
    )
    .groupBy(participationRequests.organisationalUnitId);

  const activeParticipations = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participations)
    .where(
      and(
        eq(participations.churchId, ctx.churchId),
        eq(participations.status, 'active'),
        isNull(participations.deletedAt),
      ),
    );

  const units = await db
    .select({
      id: organisationalUnits.id,
      kind: organisationalUnits.kind,
      name: organisationalUnits.name,
    })
    .from(organisationalUnits)
    .where(
      and(
        eq(organisationalUnits.churchId, ctx.churchId),
        eq(organisationalUnits.status, 'active'),
        isNull(organisationalUnits.deletedAt),
      ),
    );

  return {
    activeParticipations: Number(activeParticipations[0]?.count ?? 0),
    pendingJoinsByUnit: pendingByUnit.map((r) => ({
      organisationalUnitId: r.organisationalUnitId,
      count: Number(r.count),
    })),
    units,
  };
}

export async function moneyFlow(db: Db, ctx: Ctx, from?: string, to?: string) {
  const offeringConditions = [
    eq(offerings.churchId, ctx.churchId),
    isNull(offerings.deletedAt),
  ];
  if (from) offeringConditions.push(gte(offerings.serviceDate, from));
  if (to) offeringConditions.push(lte(offerings.serviceDate, to));

  const [income] = await db
    .select({ total: sql<number>`coalesce(sum(${offerings.amountMinor}),0)::bigint` })
    .from(offerings)
    .where(and(...offeringConditions));

  const expenseConditions = [
    eq(expenses.churchId, ctx.churchId),
    isNull(expenses.deletedAt),
  ];
  if (from) expenseConditions.push(gte(expenses.expenseDate, from));
  if (to) expenseConditions.push(lte(expenses.expenseDate, to));

  const [outflow] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amountMinor}),0)::bigint` })
    .from(expenses)
    .where(
      and(
        ...expenseConditions,
        sql`${expenses.status} in ('approved','posted','pending_approval')`,
      ),
    );

  const fundRows = await db
    .select({ id: funds.id, code: funds.code, name: funds.name, fundType: funds.fundType })
    .from(funds)
    .where(and(eq(funds.churchId, ctx.churchId), isNull(funds.deletedAt)));

  const expenseByStatus = await db
    .select({
      status: expenses.status,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${expenses.amountMinor}),0)::bigint`,
    })
    .from(expenses)
    .where(and(eq(expenses.churchId, ctx.churchId), isNull(expenses.deletedAt)))
    .groupBy(expenses.status);

  return {
    incomeMinor: Number(income?.total ?? 0),
    expenseMinor: Number(outflow?.total ?? 0),
    netMinor: Number(income?.total ?? 0) - Number(outflow?.total ?? 0),
    funds: fundRows,
    disbursementsByStatus: expenseByStatus.map((r) => ({
      status: r.status,
      count: Number(r.count),
      totalMinor: Number(r.total),
    })),
  };
}

export async function pledgeSnapshot(db: Db, ctx: Ctx) {
  const rows = await db
    .select({
      status: pledges.status,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${pledges.amountMinor}),0)::bigint`,
    })
    .from(pledges)
    .where(and(eq(pledges.churchId, ctx.churchId), isNull(pledges.deletedAt)))
    .groupBy(pledges.status);
  return rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
    totalMinor: Number(r.total),
  }));
}

export async function communicationsSnapshot(db: Db, ctx: Ctx) {
  const [pendingAnn] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(announcements)
    .where(
      and(
        eq(announcements.churchId, ctx.churchId),
        eq(announcements.status, 'pending_approval'),
        isNull(announcements.deletedAt),
      ),
    );
  const jobs = await db
    .select({
      status: messageJobs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(messageJobs)
    .where(and(eq(messageJobs.churchId, ctx.churchId), isNull(messageJobs.deletedAt)))
    .groupBy(messageJobs.status);

  const [deliveries] = await db
    .select({
      sent: sql<number>`count(*) filter (where ${messageDeliveries.status} = 'sent')::int`,
      delivered: sql<number>`count(*) filter (where ${messageDeliveries.status} = 'delivered')::int`,
      failed: sql<number>`count(*) filter (where ${messageDeliveries.status} = 'failed')::int`,
      pending: sql<number>`count(*) filter (where ${messageDeliveries.status} = 'pending')::int`,
    })
    .from(messageDeliveries)
    .innerJoin(messageJobs, eq(messageJobs.id, messageDeliveries.jobId))
    .where(eq(messageJobs.churchId, ctx.churchId));

  return {
    announcementsPending: Number(pendingAnn?.count ?? 0),
    messageJobsByStatus: jobs.map((j) => ({
      status: j.status,
      count: Number(j.count),
    })),
    deliveries: {
      sent: Number(deliveries?.sent ?? 0),
      delivered: Number(deliveries?.delivered ?? 0),
      failed: Number(deliveries?.failed ?? 0),
      pending: Number(deliveries?.pending ?? 0),
    },
  };
}

export async function insertBudget(db: Db, ctx: Ctx, body: CreateBudgetBody) {
  const id = newId();
  await db.insert(budgets).values({
    id,
    churchId: ctx.churchId,
    financialYearId: body.financialYearId,
    fundId: body.fundId,
    organisationalUnitId: body.organisationalUnitId,
    name: body.name,
    periodKind: body.periodKind,
    periodKey: body.periodKey,
    startsOn: body.startsOn,
    endsOn: body.endsOn,
    status: 'draft',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  for (const line of body.lines) {
    await db.insert(budgetLines).values({
      id: newId(),
      budgetId: id,
      accountId: line.accountId,
      amountMinor: line.amountMinor,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }
  return id;
}

export async function getBudget(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(budgets)
    .where(
      and(eq(budgets.id, id), eq(budgets.churchId, ctx.churchId), isNull(budgets.deletedAt)),
    )
    .limit(1);
  return row ?? null;
}

export async function listBudgets(db: Db, ctx: Ctx) {
  return db
    .select()
    .from(budgets)
    .where(and(eq(budgets.churchId, ctx.churchId), isNull(budgets.deletedAt)))
    .orderBy(desc(budgets.createdAt))
    .limit(100);
}

export async function listBudgetLines(db: Db, budgetId: string) {
  return db.select().from(budgetLines).where(eq(budgetLines.budgetId, budgetId));
}

export async function budgetVsActual(db: Db, ctx: Ctx) {
  const rows = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      periodKind: budgets.periodKind,
      periodKey: budgets.periodKey,
      planned: sql<number>`coalesce(sum(${budgetLines.amountMinor}),0)::bigint`,
    })
    .from(budgets)
    .leftJoin(budgetLines, eq(budgetLines.budgetId, budgets.id))
    .where(and(eq(budgets.churchId, ctx.churchId), isNull(budgets.deletedAt)))
    .groupBy(budgets.id, budgets.name, budgets.periodKind, budgets.periodKey);
  return rows.map((r) => ({
    budgetId: r.id,
    name: r.name,
    periodKind: r.periodKind,
    periodKey: r.periodKey,
    plannedMinor: Number(r.planned),
  }));
}

export async function insertAppointmentRequest(
  db: Db,
  ctx: Ctx,
  body: CreateAppointmentRequestBody,
) {
  const id = newId();
  await db.insert(appointmentRequests).values({
    id,
    churchId: ctx.churchId,
    positionId: body.positionId,
    personId: body.personId,
    organisationalUnitId: body.organisationalUnitId,
    requestedByUserId: ctx.actor.userAccountId,
    status: 'pending',
    reason: body.reason,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getAppointmentRequest(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(appointmentRequests)
    .where(
      and(
        eq(appointmentRequests.id, id),
        eq(appointmentRequests.churchId, ctx.churchId),
        isNull(appointmentRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listAppointmentRequests(db: Db, ctx: Ctx, status = 'pending') {
  return db
    .select()
    .from(appointmentRequests)
    .where(
      and(
        eq(appointmentRequests.churchId, ctx.churchId),
        eq(appointmentRequests.status, status),
        isNull(appointmentRequests.deletedAt),
      ),
    )
    .orderBy(desc(appointmentRequests.createdAt))
    .limit(100);
}

export async function decideAppointmentRequestRow(
  db: Db,
  ctx: Ctx,
  id: string,
  status: 'approved' | 'rejected',
  note: string | undefined,
  resultingAppointmentId?: string,
) {
  await db
    .update(appointmentRequests)
    .set({
      status,
      decisionNote: note,
      decidedByUserId: ctx.actor.userAccountId,
      resultingAppointmentId,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointmentRequests.id, id),
        eq(appointmentRequests.churchId, ctx.churchId),
      ),
    );
}

export async function insertMeetingMinutes(
  db: Db,
  ctx: Ctx,
  body: CreateMeetingMinutesBody,
) {
  const id = newId();
  await db.insert(meetingMinutes).values({
    id,
    churchId: ctx.churchId,
    organisationalUnitId: body.organisationalUnitId,
    title: body.title,
    meetingDate: body.meetingDate,
    body: body.body,
    attendees: body.attendees ?? [],
    status: body.status ?? 'draft',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getMeetingMinutes(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(meetingMinutes)
    .where(
      and(
        eq(meetingMinutes.id, id),
        eq(meetingMinutes.churchId, ctx.churchId),
        isNull(meetingMinutes.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listMeetingMinutes(db: Db, ctx: Ctx) {
  return db
    .select()
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.churchId, ctx.churchId), isNull(meetingMinutes.deletedAt)))
    .orderBy(desc(meetingMinutes.meetingDate))
    .limit(100);
}

export async function insertSavedReport(
  db: Db,
  ctx: Ctx,
  body: CreateSavedReportBody,
) {
  const id = newId();
  await db.insert(savedReports).values({
    id,
    churchId: ctx.churchId,
    name: body.name,
    reportId: body.reportId,
    filters: body.filters ?? {},
    createdByUserId: ctx.actor.userAccountId,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function listSavedReports(db: Db, ctx: Ctx) {
  return db
    .select()
    .from(savedReports)
    .where(and(eq(savedReports.churchId, ctx.churchId), isNull(savedReports.deletedAt)))
    .orderBy(asc(savedReports.name));
}

export async function getSavedReport(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(savedReports)
    .where(
      and(
        eq(savedReports.id, id),
        eq(savedReports.churchId, ctx.churchId),
        isNull(savedReports.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

function bandForRate(presentCount: number, sessionsHeld: number): AttendanceBand {
  if (sessionsHeld <= 0) return 'insufficient_data';
  const rate = presentCount / sessionsHeld;
  if (rate >= ATTENDANCE_BAND_THRESHOLDS.consistentMinRate) return 'consistent';
  if (rate >= ATTENDANCE_BAND_THRESHOLDS.irregularMinRate) return 'irregular';
  return 'missing';
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return ((result as { rows?: Record<string, unknown>[] }).rows ?? []);
}

/** R-SP-03 / R-UNIT-04 — engagement bands + open absence notices. */
export async function attendanceFollowUp(
  db: Db,
  ctx: Ctx,
  opts: { from?: string; to?: string; unitId?: string; followUpOnly?: boolean },
) {
  const result = await db.execute(sql`
    WITH sessions AS (
      SELECT s.id
      FROM attendance_sessions s
      JOIN events e ON e.id = s.event_id
      WHERE s.church_id = ${ctx.churchId}::uuid
        AND s.status = 'finalized'
        AND s.deleted_at IS NULL
        ${opts.from ? sql`AND e.service_date >= ${opts.from}` : sql``}
        ${opts.to ? sql`AND e.service_date <= ${opts.to}` : sql``}
        ${opts.unitId ? sql`AND e.organisational_unit_id = ${opts.unitId}::uuid` : sql``}
    ),
    session_count AS (
      SELECT count(*)::int AS n FROM sessions
    ),
    population AS (
      ${
        opts.unitId
          ? sql`
        SELECT p.person_id AS "personId", pe.display_name AS "displayName"
        FROM participations p
        JOIN people pe ON pe.id = p.person_id
        WHERE p.church_id = ${ctx.churchId}::uuid
          AND p.organisational_unit_id = ${opts.unitId}::uuid
          AND p.status = 'active'
          AND p.deleted_at IS NULL
      `
          : sql`
        SELECT m.person_id AS "personId", pe.display_name AS "displayName"
        FROM memberships m
        JOIN people pe ON pe.id = m.person_id
        WHERE m.church_id = ${ctx.churchId}::uuid
          AND m.status = 'active'
          AND m.deleted_at IS NULL
      `
      }
    ),
    attended AS (
      SELECT ar.person_id AS "personId", count(*)::int AS "presentCount"
      FROM attendance_records ar
      WHERE ar.session_id IN (SELECT id FROM sessions)
        AND ar.presence IN ('present', 'late')
        AND ar.deleted_at IS NULL
      GROUP BY ar.person_id
    ),
    open_notices AS (
      SELECT an.person_id AS "personId", count(*)::int AS "openNotices"
      FROM absence_notices an
      WHERE an.church_id = ${ctx.churchId}::uuid
        AND an.status IN ('notified', 'open', 'pending')
        AND an.deleted_at IS NULL
        ${opts.from ? sql`AND an.service_date >= ${opts.from}` : sql``}
        ${opts.to ? sql`AND an.service_date <= ${opts.to}` : sql``}
      GROUP BY an.person_id
    )
    SELECT
      pop."personId",
      pop."displayName",
      coalesce(att."presentCount", 0)::int AS "presentCount",
      (SELECT n FROM session_count) AS "sessionsHeld",
      coalesce(n."openNotices", 0)::int AS "openNotices"
    FROM population pop
    LEFT JOIN attended att ON att."personId" = pop."personId"
    LEFT JOIN open_notices n ON n."personId" = pop."personId"
    ORDER BY pop."displayName"
  `);

  const peopleRows = rowsOf(result).map((r) => {
    const presentCount = Number(r.presentCount ?? 0);
    const sessionsHeld = Number(r.sessionsHeld ?? 0);
    const band = bandForRate(presentCount, sessionsHeld);
    return {
      personId: String(r.personId),
      displayName: String(r.displayName ?? ''),
      presentCount,
      sessionsHeld,
      rate: sessionsHeld > 0 ? Number((presentCount / sessionsHeld).toFixed(3)) : null,
      band,
      openNotices: Number(r.openNotices ?? 0),
    };
  });

  const filtered = opts.followUpOnly
    ? peopleRows.filter((p) => p.band === 'irregular' || p.band === 'missing')
    : peopleRows;

  const byBand = {
    consistent: peopleRows.filter((p) => p.band === 'consistent').length,
    irregular: peopleRows.filter((p) => p.band === 'irregular').length,
    missing: peopleRows.filter((p) => p.band === 'missing').length,
    insufficient_data: peopleRows.filter((p) => p.band === 'insufficient_data').length,
  };

  return {
    thresholds: ATTENDANCE_BAND_THRESHOLDS,
    sessionsHeld: peopleRows[0]?.sessionsHeld ?? 0,
    byBand,
    people: filtered,
  };
}

export async function unitRoster(db: Db, ctx: Ctx, unitId: string) {
  const members = await db
    .select({
      participationId: participations.id,
      personId: participations.personId,
      displayName: people.displayName,
      roleInUnit: participations.roleInUnit,
      effectiveFrom: participations.effectiveFrom,
      status: participations.status,
    })
    .from(participations)
    .innerJoin(people, eq(people.id, participations.personId))
    .where(
      and(
        eq(participations.churchId, ctx.churchId),
        eq(participations.organisationalUnitId, unitId),
        eq(participations.status, 'active'),
        isNull(participations.deletedAt),
      ),
    )
    .orderBy(asc(people.displayName));

  const leaders = await db
    .select({
      appointmentId: appointments.id,
      personId: appointments.personId,
      displayName: people.displayName,
      positionId: appointments.positionId,
      effectiveFrom: appointments.effectiveFrom,
      status: appointments.status,
    })
    .from(appointments)
    .innerJoin(people, eq(people.id, appointments.personId))
    .where(
      and(
        eq(appointments.churchId, ctx.churchId),
        eq(appointments.organisationalUnitId, unitId),
        eq(appointments.status, 'active'),
        isNull(appointments.deletedAt),
      ),
    )
    .orderBy(asc(people.displayName));

  return { members, leaders };
}

export async function unitAttendanceSessions(
  db: Db,
  ctx: Ctx,
  unitId: string,
  from?: string,
  to?: string,
) {
  const result = await db.execute(sql`
    SELECT e.id AS "eventId", e.title, e.service_date AS "serviceDate",
           s.id AS "sessionId", s.mode, s.status,
           coalesce(sum.total_count, (
             SELECT count(*)::int FROM attendance_records ar
             WHERE ar.session_id = s.id AND ar.presence IN ('present','late') AND ar.deleted_at IS NULL
           ), 0)::int AS "totalCount"
    FROM events e
    JOIN attendance_sessions s ON s.event_id = e.id
    LEFT JOIN attendance_summaries sum ON sum.session_id = s.id AND sum.deleted_at IS NULL
    WHERE e.church_id = ${ctx.churchId}::uuid
      AND e.organisational_unit_id = ${unitId}::uuid
      AND e.deleted_at IS NULL
      AND s.deleted_at IS NULL
      ${from ? sql`AND e.service_date >= ${from}` : sql``}
      ${to ? sql`AND e.service_date <= ${to}` : sql``}
    ORDER BY e.service_date DESC
    LIMIT 100
  `);
  return { sessions: rowsOf(result) };
}

export async function trialBalance(
  db: Db,
  ctx: Ctx,
  from: string,
  to: string,
) {
  const result = await db.execute(sql`
    SELECT a.id AS "accountId", a.code, a.name, a.account_type AS "accountType",
           jl.currency,
           coalesce(sum(jl.debit_minor), 0)::bigint AS "debitMinor",
           coalesce(sum(jl.credit_minor), 0)::bigint AS "creditMinor"
    FROM journal_lines jl
    JOIN journals j ON j.id = jl.journal_id
    JOIN accounts a ON a.id = jl.account_id
    WHERE j.church_id = ${ctx.churchId}::uuid
      AND j.status = 'posted'
      AND j.deleted_at IS NULL
      AND jl.deleted_at IS NULL
      AND j.journal_date >= ${from}
      AND j.journal_date <= ${to}
    GROUP BY a.id, a.code, a.name, a.account_type, jl.currency
    ORDER BY a.code, jl.currency
  `);

  const lines = rowsOf(result).map((r) => {
    const debitMinor = Number(r.debitMinor ?? 0);
    const creditMinor = Number(r.creditMinor ?? 0);
    return {
      accountId: String(r.accountId),
      code: String(r.code),
      name: String(r.name),
      accountType: String(r.accountType),
      currency: String(r.currency ?? 'TZS'),
      debitMinor,
      creditMinor,
      netMinor: debitMinor - creditMinor,
    };
  });

  const totalDebitMinor = lines.reduce((s, l) => s + l.debitMinor, 0);
  const totalCreditMinor = lines.reduce((s, l) => s + l.creditMinor, 0);
  return {
    from,
    to,
    lines,
    totalDebitMinor,
    totalCreditMinor,
    balanced: totalDebitMinor === totalCreditMinor,
  };
}

