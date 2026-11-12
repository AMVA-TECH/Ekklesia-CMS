import type {
  accounts,
  financialYears,
  funds,
  journalLines,
  journals,
  offerings,
  pledgeApplications,
  pledges,
  projectAssignments,
  projectContributions,
  projectInterestRequests,
  projects,
} from './db-schema';

type Fund = typeof funds.$inferSelect;
type Account = typeof accounts.$inferSelect;
type Year = typeof financialYears.$inferSelect;
type Offering = typeof offerings.$inferSelect;
type Pledge = typeof pledges.$inferSelect;
type PledgeApplication = typeof pledgeApplications.$inferSelect;
type Journal = typeof journals.$inferSelect;
type Line = typeof journalLines.$inferSelect;
type Project = typeof projects.$inferSelect;
type ProjectAssignment = typeof projectAssignments.$inferSelect;
type ProjectContribution = typeof projectContributions.$inferSelect;
type ProjectInterest = typeof projectInterestRequests.$inferSelect;

export function toFundResponse(row: Fund) {
  return { id: row.id, code: row.code, name: row.name, fundType: row.fundType, status: row.status };
}
export function toAccountResponse(row: Account) {
  return { id: row.id, code: row.code, name: row.name, accountType: row.accountType, parentId: row.parentId, status: row.status };
}
export function toFinancialYearResponse(row: Year) {
  return { id: row.id, label: row.label, startsOn: row.startsOn, endsOn: row.endsOn, status: row.status };
}
export function toOfferingResponse(row: Offering) {
  return {
    id: row.id,
    serviceDate: row.serviceDate,
    fundId: row.fundId,
    incomeAccountId: row.incomeAccountId,
    depositAccountId: row.depositAccountId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    note: row.note,
    journalId: row.journalId,
  };
}
export function toPledgeResponse(row: Pledge, appliedMinor?: number) {
  return {
    id: row.id,
    personId: row.personId,
    householdId: row.householdId,
    fundId: row.fundId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    dueOn: row.dueOn,
    status: row.status,
    ...(appliedMinor !== undefined ? { appliedMinor } : {}),
  };
}

export function toPledgeApplicationResponse(row: PledgeApplication) {
  return {
    id: row.id,
    pledgeId: row.pledgeId,
    journalId: row.journalId,
    amountMinor: row.amountMinor,
  };
}

/** Derive pledge status from total applied vs pledge amount. */
export function pledgeStatusFromApplied(
  pledgeAmountMinor: number,
  appliedMinor: number,
  currentStatus: string,
): 'open' | 'partial' | 'fulfilled' | 'cancelled' {
  if (currentStatus === 'cancelled') return 'cancelled';
  if (appliedMinor <= 0) return 'open';
  if (appliedMinor >= pledgeAmountMinor) return 'fulfilled';
  return 'partial';
}
export function toJournalResponse(row: Journal, lines: Line[] = []) {
  return {
    id: row.id,
    financialYearId: row.financialYearId,
    entryNumber: row.entryNumber,
    journalDate: row.journalDate,
    memo: row.memo,
    paymentMethod: row.paymentMethod,
    status: row.status,
    reversesEntryId: row.reversesEntryId,
    postedAt: row.postedAt ? row.postedAt.toISOString() : null,
    lines: lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      fundId: l.fundId,
      debitMinor: l.debitMinor,
      creditMinor: l.creditMinor,
      currency: l.currency,
      memo: l.memo,
    })),
  };
}

export function toProjectResponse(
  row: Project,
  extras?: {
    assignments?: ProjectAssignment[];
    contributions?: ProjectContribution[];
    interestRequests?: ProjectInterest[];
    raisedMinor?: number;
  },
) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    organisationalUnitId: row.organisationalUnitId,
    fundId: row.fundId,
    budgetId: row.budgetId,
    targetAmountMinor: row.targetAmountMinor,
    currency: row.currency,
    status: row.status,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    raisedMinor: extras?.raisedMinor ?? undefined,
    assignments: extras?.assignments?.map((a) => ({
      id: a.id,
      personId: a.personId,
      role: a.role,
      status: a.status,
    })),
    contributions: extras?.contributions?.map((c) => ({
      id: c.id,
      personId: c.personId,
      amountMinor: c.amountMinor,
      currency: c.currency,
      contributedOn: c.contributedOn,
      journalId: c.journalId,
    })),
    interestRequests: extras?.interestRequests?.map(toProjectInterestResponse),
  };
}

export function toProjectInterestResponse(
  row: Pick<
    ProjectInterest,
    | 'id'
    | 'projectId'
    | 'personId'
    | 'note'
    | 'status'
    | 'decidedByUserId'
    | 'decidedAt'
    | 'decisionNote'
    | 'resultingAssignmentId'
    | 'createdAt'
  >,
) {
  return {
    id: row.id,
    projectId: row.projectId,
    personId: row.personId,
    note: row.note,
    status: row.status,
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    decisionNote: row.decisionNote,
    resultingAssignmentId: row.resultingAssignmentId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toProjectAssignmentResponse(row: ProjectAssignment) {
  return {
    id: row.id,
    projectId: row.projectId,
    personId: row.personId,
    role: row.role,
    status: row.status,
  };
}

export function toProjectContributionResponse(row: ProjectContribution) {
  return {
    id: row.id,
    projectId: row.projectId,
    personId: row.personId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    contributedOn: row.contributedOn,
    journalId: row.journalId,
  };
}
