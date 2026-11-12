import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, forbidden, notFound, validationFailed } from '@/platform/errors';
import { can } from '@/modules/access-control/can';
import { postApprovedExpense } from '@/modules/finance/service';
import { applyAnnouncementApprovalDecision } from '@/modules/messaging/service';
import { getPersonInChurch } from '@/modules/people/repository';
import {
  getPositionById,
  getUnitById,
  insertAppointment,
} from '@/modules/organisation/repository';
import { REPORT_CATALOGUE } from './constants';
import {
  toApprovalResponse,
  toAppointmentRequestResponse,
  toBudgetResponse,
  toDelegationResponse,
  toExpenseResponse,
  toMeetingMinutesResponse,
  toSavedReportResponse,
} from './mappers';
import {
  assertCanApproveDisbursement,
  assertCanDecideAppointment,
  assertCanManageDelegations,
  assertCanReadApprovals,
  assertCanReadBudgets,
  assertCanReadLeadershipReports,
  assertCanReadMinutes,
  assertCanRequestAppointment,
  assertCanRequestDisbursement,
  assertCanWriteBudgets,
  assertCanWriteMinutes,
} from './policies';
import type {
  CreateAppointmentRequestBody,
  CreateBudgetBody,
  CreateDelegationBody,
  CreateExpenseBody,
  CreateMeetingMinutesBody,
  CreateSavedReportBody,
  DecideAppointmentRequestBody,
  DecideApprovalBody,
  ListApprovalsQuery,
  ListDelegationsQuery,
  ReportQuery,
} from './schemas';
import * as repo from './repository';

export async function createExpense(ctx: Ctx, body: CreateExpenseBody) {
  assertCanRequestDisbursement(ctx);
  const db = getDb();
  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }
  const id = await repo.insertExpense(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'governance.expense.created',
    entityType: 'expense',
    entityId: id,
  });
  const row = await repo.getExpense(db, ctx, id);
  if (!row) throw notFound();
  return toExpenseResponse(row);
}

export async function submitExpense(ctx: Ctx, expenseId: string) {
  assertCanRequestDisbursement(ctx);
  const db = getDb();
  const expense = await repo.getExpense(db, ctx, expenseId);
  if (!expense) throw notFound();
  if (expense.status !== 'draft') {
    throw conflict('Only draft expenses can be submitted for approval.');
  }
  if (expense.createdBy && expense.createdBy !== ctx.actor.userAccountId) {
    // allow same church finance officers; still require request perm
  }
  const approvalId = await repo.insertApprovalRequest(
    db,
    ctx,
    'expense',
    expenseId,
  );
  await repo.setExpenseStatus(db, ctx, expenseId, 'pending_approval');
  await writeAudit(db, ctx, {
    action: 'governance.expense.submitted',
    entityType: 'expense',
    entityId: expenseId,
    metadata: { approvalRequestId: approvalId },
  });
  const row = await repo.getExpense(db, ctx, expenseId);
  if (!row) throw notFound();
  return {
    expense: toExpenseResponse(row),
    approvalRequestId: approvalId,
  };
}

export async function listApprovalRequests(ctx: Ctx, query: ListApprovalsQuery) {
  assertCanReadApprovals(ctx);
  const rows = await repo.listApprovalRequests(getDb(), ctx, query);
  return { data: rows.map(toApprovalResponse) };
}

export async function decideApproval(
  ctx: Ctx,
  approvalId: string,
  body: DecideApprovalBody,
) {
  const db = getDb();
  const approval = await repo.getApprovalRequest(db, ctx, approvalId);
  if (!approval) throw notFound();
  if (approval.status !== 'pending') {
    throw conflict('Approval request is already decided.');
  }

  if (approval.subjectType === 'expense') {
    assertCanApproveDisbursement(ctx);
  } else if (approval.subjectType === 'announcement') {
    if (!can(ctx, 'announcements:publish')) throw forbidden();
  } else {
    assertCanReadApprovals(ctx);
  }

  // Dual control: requester cannot approve their own request
  if (approval.requestedByUserId === ctx.actor.userAccountId) {
    throw forbidden('You cannot decide on a request you submitted.');
  }

  await repo.recordApprovalDecision(db, ctx, approvalId, body.action, body.note);

  let journalId: string | null = null;
  if (approval.subjectType === 'expense') {
    if (body.action === 'approve') {
      await repo.setExpenseStatus(db, ctx, approval.subjectId, 'approved');
      const expense = await repo.getExpense(db, ctx, approval.subjectId);
      if (expense?.accountId && expense.paymentAccountId) {
        const posted = await postApprovedExpense(ctx, expense);
        journalId = posted.journalId;
        if (!posted.alreadyPosted) {
          await repo.linkExpenseJournal(db, ctx, expense.id, posted.journalId);
        }
      }
    } else {
      await repo.setExpenseStatus(db, ctx, approval.subjectId, 'rejected');
    }
  } else if (approval.subjectType === 'announcement') {
    await applyAnnouncementApprovalDecision(ctx, approval.subjectId, body.action);
  }

  await writeAudit(db, ctx, {
    action: `governance.approval.${body.action}`,
    entityType: 'approval_request',
    entityId: approvalId,
    metadata: {
      subjectType: approval.subjectType,
      subjectId: approval.subjectId,
      note: body.note ?? null,
      journalId,
    },
  });

  const updated = await repo.getApprovalRequest(db, ctx, approvalId);
  if (!updated) throw notFound();
  return { ...toApprovalResponse(updated), journalId };
}

function reportEnvelope(reportId: keyof typeof REPORT_CATALOGUE, data: unknown) {
  const meta = REPORT_CATALOGUE[reportId];
  return {
    reportId,
    name: meta.name,
    audience: meta.audience,
    generatedAt: new Date().toISOString(),
    data,
  };
}

export async function listReportCatalogue(ctx: Ctx) {
  assertCanReadLeadershipReports(ctx);
  return {
    data: Object.entries(REPORT_CATALOGUE).map(([id, meta]) => ({
      id,
      ...meta,
    })),
  };
}

export async function getLeadershipReport(
  ctx: Ctx,
  reportId: string,
  query: ReportQuery,
) {
  assertCanReadLeadershipReports(ctx);
  const db = getDb();

  if (reportId === 'R-SP-01') {
    const byStatus = await repo.countMembershipsByStatus(db, ctx);
    const queues = await repo.countPending(db, ctx);
    return reportEnvelope('R-SP-01', {
      membership: {
        active: byStatus.active ?? 0,
        visitor: byStatus.visitor ?? 0,
        inactive: byStatus.inactive ?? 0,
      },
      openApprovalQueues: queues,
    });
  }

  if (reportId === 'R-SP-02') {
    const data = await repo.attendanceOverview(db, ctx, query.from, query.to);
    return reportEnvelope('R-SP-02', data);
  }

  if (reportId === 'R-SP-03') {
    if (!can(ctx, 'attendance:stats_leadership') && !can(ctx, 'memberships:read')) {
      throw forbidden();
    }
    const data = await repo.attendanceFollowUp(db, ctx, {
      from: query.from,
      to: query.to,
      unitId: query.unitId,
      followUpOnly: true,
    });
    await writeAudit(db, ctx, {
      action: 'governance.report.follow_up.read',
      entityType: 'report',
      metadata: { reportId: 'R-SP-03' },
    });
    return reportEnvelope('R-SP-03', data);
  }

  if (reportId === 'R-SP-04') {
    const data = await repo.participationHealth(db, ctx);
    return reportEnvelope('R-SP-04', data);
  }

  if (reportId === 'R-SP-05' || reportId === 'R-FIN-03') {
    const data = await repo.moneyFlow(db, ctx, query.from, query.to);
    return reportEnvelope(reportId, data);
  }

  if (reportId === 'R-SP-06') {
    const rows = await repo.listActiveDelegations(db, ctx);
    return reportEnvelope('R-SP-06', { active: rows.map(toDelegationResponse) });
  }

  if (reportId === 'R-ADM-01') {
    const byStatus = await repo.countMembershipsByStatus(db, ctx);
    const queues = await repo.countPending(db, ctx);
    return reportEnvelope('R-ADM-01', {
      visitors: byStatus.visitor ?? 0,
      pendingMembershipApplications: queues.membershipApplications,
      pendingParticipationRequests: queues.participationRequests,
    });
  }

  if (reportId === 'R-ADM-03') {
    const data = await repo.communicationsSnapshot(db, ctx);
    return reportEnvelope('R-ADM-03', data);
  }

  if (reportId === 'R-UNIT-01') {
    if (!query.unitId) {
      throw validationFailed([
        { field: 'unitId', code: 'required', message: 'unitId is required for unit roster' },
      ]);
    }
    if (!can(ctx, 'units:read') && !can(ctx, 'participations:read')) throw forbidden();
    const unit = await getUnitById(db, ctx, query.unitId);
    if (!unit) throw notFound();
    const data = await repo.unitRoster(db, ctx, query.unitId);
    return reportEnvelope('R-UNIT-01', { unitId: query.unitId, ...data });
  }

  if (reportId === 'R-UNIT-02') {
    const queues = await repo.countPending(db, ctx);
    const health = await repo.participationHealth(db, ctx);
    return reportEnvelope('R-UNIT-02', {
      pendingParticipationRequests: queues.participationRequests,
      pendingJoinsByUnit: health.pendingJoinsByUnit,
    });
  }

  if (reportId === 'R-UNIT-03') {
    if (!query.unitId) {
      throw validationFailed([
        {
          field: 'unitId',
          code: 'required',
          message: 'unitId is required for unit attendance',
        },
      ]);
    }
    if (!can(ctx, 'attendance:read') && !can(ctx, 'units:read')) throw forbidden();
    const unit = await getUnitById(db, ctx, query.unitId);
    if (!unit) throw notFound();
    const data = await repo.unitAttendanceSessions(
      db,
      ctx,
      query.unitId,
      query.from,
      query.to,
    );
    return reportEnvelope('R-UNIT-03', { unitId: query.unitId, ...data });
  }

  if (reportId === 'R-UNIT-04') {
    if (!query.unitId) {
      throw validationFailed([
        {
          field: 'unitId',
          code: 'required',
          message: 'unitId is required for unit engagement',
        },
      ]);
    }
    if (
      !can(ctx, 'attendance:stats_leadership') &&
      !can(ctx, 'units:read') &&
      !can(ctx, 'participations:read')
    ) {
      throw forbidden();
    }
    const unit = await getUnitById(db, ctx, query.unitId);
    if (!unit) throw notFound();
    const data = await repo.attendanceFollowUp(db, ctx, {
      from: query.from,
      to: query.to,
      unitId: query.unitId,
      followUpOnly: true,
    });
    return reportEnvelope('R-UNIT-04', { unitId: query.unitId, ...data });
  }

  if (reportId === 'R-FIN-01') {
    if (!can(ctx, 'finance_reports:read') && !can(ctx, 'journals:read')) {
      throw forbidden();
    }
    if (!query.from || !query.to) {
      throw validationFailed([
        {
          field: 'from',
          code: 'required',
          message: 'from and to are required for trial balance',
        },
      ]);
    }
    const data = await repo.trialBalance(db, ctx, query.from, query.to);
    return reportEnvelope('R-FIN-01', data);
  }

  if (reportId === 'R-FIN-02') {
    const data = await repo.moneyFlow(db, ctx, query.from, query.to);
    return reportEnvelope('R-FIN-02', { funds: data.funds });
  }

  if (reportId === 'R-FIN-04') {
    const data = await repo.moneyFlow(db, ctx, query.from, query.to);
    return reportEnvelope('R-FIN-04', {
      disbursementsByStatus: data.disbursementsByStatus,
    });
  }

  if (reportId === 'R-FIN-05') {
    const data = await repo.pledgeSnapshot(db, ctx);
    return reportEnvelope('R-FIN-05', { byStatus: data });
  }

  if (reportId === 'R-FIN-06') {
    const data = await repo.budgetVsActual(db, ctx);
    return reportEnvelope('R-FIN-06', { budgets: data });
  }

  throw validationFailed([
    {
      field: 'reportId',
      code: 'unsupported',
      message: `Report ${reportId} is not implemented yet`,
    },
  ]);
}

export async function listDelegations(ctx: Ctx, query: ListDelegationsQuery) {
  assertCanManageDelegations(ctx);
  const rows = await repo.listDelegations(getDb(), ctx, query);
  return { data: rows.map(toDelegationResponse) };
}

export async function createDelegation(ctx: Ctx, body: CreateDelegationBody) {
  assertCanManageDelegations(ctx);
  if (body.delegateUserId === ctx.actor.userAccountId) {
    throw validationFailed([
      {
        field: 'delegateUserId',
        code: 'invalid',
        message: 'Cannot delegate to yourself',
      },
    ]);
  }
  if (body.effectiveTo && body.effectiveTo < body.effectiveFrom) {
    throw validationFailed([
      {
        field: 'effectiveTo',
        code: 'invalid_range',
        message: 'effectiveTo must be on or after effectiveFrom',
      },
    ]);
  }
  const db = getDb();
  const id = await repo.insertDelegation(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'governance.delegation.created',
    entityType: 'delegation',
    entityId: id,
    metadata: { grants: body.grants },
  });
  const row = await repo.getDelegation(db, ctx, id);
  if (!row) throw notFound();
  return toDelegationResponse(row);
}

export async function revokeDelegation(ctx: Ctx, id: string) {
  assertCanManageDelegations(ctx);
  const db = getDb();
  const existing = await repo.getDelegation(db, ctx, id);
  if (!existing) throw notFound();
  if (existing.status === 'revoked' || existing.status === 'ended') {
    throw conflict('Delegation is already closed.');
  }
  await repo.revokeDelegation(db, ctx, id);
  await writeAudit(db, ctx, {
    action: 'governance.delegation.revoked',
    entityType: 'delegation',
    entityId: id,
  });
  const row = await repo.getDelegation(db, ctx, id);
  if (!row) throw notFound();
  return toDelegationResponse(row);
}

/** Retry / manual post for an already-approved expense missing a journal. */
export async function postExpense(ctx: Ctx, expenseId: string) {
  assertCanApproveDisbursement(ctx);
  const db = getDb();
  const expense = await repo.getExpense(db, ctx, expenseId);
  if (!expense) throw notFound();
  if (expense.status !== 'approved' && expense.status !== 'posted') {
    throw conflict('Only approved expenses can be posted.');
  }
  const posted = await postApprovedExpense(ctx, expense);
  if (!posted.alreadyPosted) {
    await repo.linkExpenseJournal(db, ctx, expense.id, posted.journalId);
  }
  const row = await repo.getExpense(db, ctx, expenseId);
  if (!row) throw notFound();
  return toExpenseResponse(row);
}

export async function createBudget(ctx: Ctx, body: CreateBudgetBody) {
  assertCanWriteBudgets(ctx);
  if (body.endsOn && body.startsOn && body.endsOn < body.startsOn) {
    throw validationFailed([
      {
        field: 'endsOn',
        code: 'invalid_range',
        message: 'endsOn must be on or after startsOn',
      },
    ]);
  }
  const db = getDb();
  const id = await repo.insertBudget(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'governance.budget.created',
    entityType: 'budget',
    entityId: id,
    metadata: { periodKind: body.periodKind, periodKey: body.periodKey },
  });
  return getBudget(ctx, id);
}

export async function getBudget(ctx: Ctx, id: string) {
  assertCanReadBudgets(ctx);
  const db = getDb();
  const row = await repo.getBudget(db, ctx, id);
  if (!row) throw notFound();
  const lines = await repo.listBudgetLines(db, id);
  return toBudgetResponse(row, lines);
}

export async function listBudgets(ctx: Ctx) {
  assertCanReadBudgets(ctx);
  const rows = await repo.listBudgets(getDb(), ctx);
  return {
    data: await Promise.all(
      rows.map(async (row) =>
        toBudgetResponse(row, await repo.listBudgetLines(getDb(), row.id)),
      ),
    ),
  };
}

export async function createAppointmentRequest(
  ctx: Ctx,
  body: CreateAppointmentRequestBody,
) {
  assertCanRequestAppointment(ctx);
  const db = getDb();
  const position = await getPositionById(db, ctx, body.positionId);
  if (!position) throw notFound();
  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();
  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }
  const id = await repo.insertAppointmentRequest(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'governance.appointment_request.created',
    entityType: 'appointment_request',
    entityId: id,
  });
  const row = await repo.getAppointmentRequest(db, ctx, id);
  if (!row) throw notFound();
  return toAppointmentRequestResponse(row);
}

export async function listAppointmentRequests(ctx: Ctx) {
  assertCanRequestAppointment(ctx);
  const rows = await repo.listAppointmentRequests(getDb(), ctx, 'pending');
  return { data: rows.map(toAppointmentRequestResponse) };
}

export async function decideAppointmentRequest(
  ctx: Ctx,
  id: string,
  body: DecideAppointmentRequestBody,
) {
  assertCanDecideAppointment(ctx);
  const db = getDb();
  const existing = await repo.getAppointmentRequest(db, ctx, id);
  if (!existing) throw notFound();
  if (existing.status !== 'pending') {
    throw conflict('Appointment request already decided.');
  }

  let resultingAppointmentId: string | undefined;
  if (body.action === 'approve') {
    const effectiveFrom =
      body.effectiveFrom ?? new Date().toISOString().slice(0, 10);
    resultingAppointmentId = await insertAppointment(db, ctx, {
      positionId: existing.positionId,
      personId: existing.personId,
      organisationalUnitId: existing.organisationalUnitId ?? undefined,
      effectiveFrom,
    });
  }

  await repo.decideAppointmentRequestRow(
    db,
    ctx,
    id,
    body.action === 'approve' ? 'approved' : 'rejected',
    body.note,
    resultingAppointmentId,
  );
  await writeAudit(db, ctx, {
    action: `governance.appointment_request.${body.action}`,
    entityType: 'appointment_request',
    entityId: id,
    metadata: { resultingAppointmentId: resultingAppointmentId ?? null },
  });
  const row = await repo.getAppointmentRequest(db, ctx, id);
  if (!row) throw notFound();
  return toAppointmentRequestResponse(row);
}

export async function createMeetingMinutes(
  ctx: Ctx,
  body: CreateMeetingMinutesBody,
) {
  assertCanWriteMinutes(ctx);
  const db = getDb();
  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }
  const id = await repo.insertMeetingMinutes(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'governance.meeting_minutes.created',
    entityType: 'meeting_minutes',
    entityId: id,
  });
  const row = await repo.getMeetingMinutes(db, ctx, id);
  if (!row) throw notFound();
  return toMeetingMinutesResponse(row);
}

export async function listMeetingMinutes(ctx: Ctx) {
  assertCanReadMinutes(ctx);
  const rows = await repo.listMeetingMinutes(getDb(), ctx);
  return { data: rows.map(toMeetingMinutesResponse) };
}

export async function createSavedReport(ctx: Ctx, body: CreateSavedReportBody) {
  assertCanReadLeadershipReports(ctx);
  const db = getDb();
  try {
    const id = await repo.insertSavedReport(db, ctx, body);
    await writeAudit(db, ctx, {
      action: 'governance.saved_report.created',
      entityType: 'saved_report',
      entityId: id,
    });
    const row = await repo.getSavedReport(db, ctx, id);
    if (!row) throw notFound();
    return toSavedReportResponse(row);
  } catch (e) {
    if (
      typeof e === 'object' &&
      e &&
      'code' in e &&
      (e as { code?: string }).code === '23505'
    ) {
      throw conflict('A saved report with this name already exists.');
    }
    throw e;
  }
}

export async function listSavedReports(ctx: Ctx) {
  assertCanReadLeadershipReports(ctx);
  const rows = await repo.listSavedReports(getDb(), ctx);
  return { data: rows.map(toSavedReportResponse) };
}

/** Run a saved custom report view (catalogue report + stored filters). */
export async function runSavedReport(ctx: Ctx, id: string) {
  assertCanReadLeadershipReports(ctx);
  const row = await repo.getSavedReport(getDb(), ctx, id);
  if (!row) throw notFound();
  const filters = (row.filters ?? {}) as ReportQuery;
  const result = await getLeadershipReport(ctx, row.reportId, filters);
  return { savedReport: toSavedReportResponse(row), result };
}
