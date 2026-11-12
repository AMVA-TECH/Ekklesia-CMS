import type {
  approvalRequests,
  budgetLines,
  budgets,
  expenses,
} from '@/modules/finance/db-schema';
import type { delegations } from '@/modules/organisation/db-schema';
import type {
  appointmentRequests,
  meetingMinutes,
  savedReports,
} from './db-schema';

type Expense = typeof expenses.$inferSelect;
type Approval = typeof approvalRequests.$inferSelect;
type Delegation = typeof delegations.$inferSelect;
type Budget = typeof budgets.$inferSelect;
type BudgetLine = typeof budgetLines.$inferSelect;
type AppointmentRequest = typeof appointmentRequests.$inferSelect;
type Minutes = typeof meetingMinutes.$inferSelect;
type SavedReport = typeof savedReports.$inferSelect;

export function toExpenseResponse(row: Expense) {
  return {
    id: row.id,
    amountMinor: row.amountMinor,
    currency: row.currency,
    expenseDate: row.expenseDate,
    purpose: row.purpose,
    organisationalUnitId: row.organisationalUnitId,
    accountId: row.accountId,
    paymentAccountId: row.paymentAccountId,
    fundId: row.fundId,
    status: row.status,
    journalId: row.journalId,
  };
}

export function toApprovalResponse(row: Approval) {
  return {
    id: row.id,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    requestedByUserId: row.requestedByUserId,
    status: row.status,
    currentStep: row.currentStep,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toDelegationResponse(row: Delegation) {
  return {
    id: row.id,
    delegatorUserId: row.delegatorUserId,
    delegateUserId: row.delegateUserId,
    grants: row.grants as string[],
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
    status: row.status,
    reason: row.reason,
  };
}

export function toBudgetResponse(row: Budget, lines: BudgetLine[]) {
  return {
    id: row.id,
    financialYearId: row.financialYearId,
    fundId: row.fundId,
    organisationalUnitId: row.organisationalUnitId,
    name: row.name,
    periodKind: row.periodKind,
    periodKey: row.periodKey,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    status: row.status,
    lines: lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      amountMinor: l.amountMinor,
    })),
    plannedMinor: lines.reduce((sum, l) => sum + l.amountMinor, 0),
  };
}

export function toAppointmentRequestResponse(row: AppointmentRequest) {
  return {
    id: row.id,
    positionId: row.positionId,
    personId: row.personId,
    organisationalUnitId: row.organisationalUnitId,
    requestedByUserId: row.requestedByUserId,
    status: row.status,
    reason: row.reason,
    decisionNote: row.decisionNote,
    decidedByUserId: row.decidedByUserId,
    resultingAppointmentId: row.resultingAppointmentId,
  };
}

export function toMeetingMinutesResponse(row: Minutes) {
  return {
    id: row.id,
    organisationalUnitId: row.organisationalUnitId,
    title: row.title,
    meetingDate: row.meetingDate,
    body: row.body,
    attendees: row.attendees as unknown[],
    status: row.status,
  };
}

export function toSavedReportResponse(row: SavedReport) {
  return {
    id: row.id,
    name: row.name,
    reportId: row.reportId,
    filters: row.filters as Record<string, unknown>,
    createdByUserId: row.createdByUserId,
  };
}
