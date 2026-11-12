import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  accounts, financialYears, funds, journalLines, journals, offerings, pledgeApplications,
  pledgeFollowUps, pledges, projectAssignments, projectContributions, projectInterestRequests,
  projects, budgets,
} from './db-schema';
import type {
  CreateAccountBody, CreateFinancialYearBody, CreateFundBody, CreateJournalBody,
  CreateOfferingBody, CreatePledgeApplicationBody, CreatePledgeBody,
  CreateProjectAssignmentBody, CreateProjectBody, CreateProjectContributionBody,
  ExpressProjectInterestBody, ListOfferingsQuery, ListProjectsQuery, ListUnpaidPledgesQuery,
} from './schemas';

export async function listFunds(db: Db, ctx: Ctx) {
  return db.select().from(funds).where(and(eq(funds.churchId, ctx.churchId), isNull(funds.deletedAt))).orderBy(asc(funds.code));
}
export async function getFund(db: Db, ctx: Ctx, id: string) {
  const [row] = await db.select().from(funds).where(and(eq(funds.id, id), eq(funds.churchId, ctx.churchId), isNull(funds.deletedAt))).limit(1);
  return row ?? null;
}
export async function insertFund(db: Db, ctx: Ctx, body: CreateFundBody) {
  const id = newId();
  await db.insert(funds).values({ id, churchId: ctx.churchId, code: body.code, name: body.name, fundType: body.fundType ?? 'unrestricted', status: body.status ?? 'active', createdBy: ctx.actor.userAccountId, updatedBy: ctx.actor.userAccountId });
  return id;
}

export async function listAccounts(db: Db, ctx: Ctx) {
  return db.select().from(accounts).where(and(eq(accounts.churchId, ctx.churchId), isNull(accounts.deletedAt))).orderBy(asc(accounts.code));
}
export async function getAccount(db: Db, ctx: Ctx, id: string) {
  const [row] = await db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.churchId, ctx.churchId), isNull(accounts.deletedAt))).limit(1);
  return row ?? null;
}
export async function insertAccount(db: Db, ctx: Ctx, body: CreateAccountBody) {
  const id = newId();
  await db.insert(accounts).values({ id, churchId: ctx.churchId, code: body.code, name: body.name, accountType: body.accountType, parentId: body.parentId, status: body.status ?? 'active', createdBy: ctx.actor.userAccountId, updatedBy: ctx.actor.userAccountId });
  return id;
}

export async function listFinancialYears(db: Db, ctx: Ctx) {
  return db.select().from(financialYears).where(and(eq(financialYears.churchId, ctx.churchId), isNull(financialYears.deletedAt))).orderBy(desc(financialYears.startsOn));
}
export async function getFinancialYear(db: Db, ctx: Ctx, id: string) {
  const [row] = await db.select().from(financialYears).where(and(eq(financialYears.id, id), eq(financialYears.churchId, ctx.churchId), isNull(financialYears.deletedAt))).limit(1);
  return row ?? null;
}
export async function insertFinancialYear(db: Db, ctx: Ctx, body: CreateFinancialYearBody) {
  const id = newId();
  await db.insert(financialYears).values({ id, churchId: ctx.churchId, label: body.label, startsOn: body.startsOn, endsOn: body.endsOn, status: body.status ?? 'open', createdBy: ctx.actor.userAccountId, updatedBy: ctx.actor.userAccountId });
  return id;
}
export async function findOpenFinancialYearCovering(db: Db, ctx: Ctx, onDate: string) {
  const [row] = await db
    .select()
    .from(financialYears)
    .where(
      and(
        eq(financialYears.churchId, ctx.churchId),
        eq(financialYears.status, 'open'),
        lte(financialYears.startsOn, onDate),
        gte(financialYears.endsOn, onDate),
        isNull(financialYears.deletedAt),
      ),
    )
    .orderBy(desc(financialYears.startsOn))
    .limit(1);
  return row ?? null;
}

export async function listOfferings(db: Db, ctx: Ctx, query: ListOfferingsQuery) {
  const conditions = [eq(offerings.churchId, ctx.churchId), isNull(offerings.deletedAt)];
  if (query.serviceDate) conditions.push(eq(offerings.serviceDate, query.serviceDate));
  return db.select().from(offerings).where(and(...conditions)).orderBy(desc(offerings.serviceDate)).limit(query.limit);
}
export async function getOffering(db: Db, ctx: Ctx, id: string) {
  const [row] = await db.select().from(offerings).where(and(eq(offerings.id, id), eq(offerings.churchId, ctx.churchId), isNull(offerings.deletedAt))).limit(1);
  return row ?? null;
}
export async function insertOffering(db: Db, ctx: Ctx, body: CreateOfferingBody) {
  const id = newId();
  await db.insert(offerings).values({
    id,
    churchId: ctx.churchId,
    serviceDate: body.serviceDate,
    amountMinor: body.amountMinor,
    currency: body.currency ?? 'TZS',
    fundId: body.fundId,
    incomeAccountId: body.incomeAccountId,
    depositAccountId: body.depositAccountId,
    note: body.note,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function linkOfferingJournal(
  db: Db,
  ctx: Ctx,
  offeringId: string,
  journalId: string,
) {
  await db
    .update(offerings)
    .set({
      journalId,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(and(eq(offerings.id, offeringId), eq(offerings.churchId, ctx.churchId)));
}

export async function listPledges(db: Db, ctx: Ctx) {
  return db.select().from(pledges).where(and(eq(pledges.churchId, ctx.churchId), isNull(pledges.deletedAt))).orderBy(desc(pledges.createdAt)).limit(100);
}
export async function getPledge(db: Db, ctx: Ctx, id: string) {
  const [row] = await db.select().from(pledges).where(and(eq(pledges.id, id), eq(pledges.churchId, ctx.churchId), isNull(pledges.deletedAt))).limit(1);
  return row ?? null;
}
export async function insertPledge(db: Db, ctx: Ctx, body: CreatePledgeBody) {
  const id = newId();
  await db.insert(pledges).values({ id, churchId: ctx.churchId, amountMinor: body.amountMinor, currency: body.currency ?? 'TZS', personId: body.personId, householdId: body.householdId, fundId: body.fundId, dueOn: body.dueOn, status: 'open', createdBy: ctx.actor.userAccountId, updatedBy: ctx.actor.userAccountId });
  return id;
}
export async function insertPledgeFollowUp(db: Db, ctx: Ctx, pledgeId: string, note: string) {
  const id = newId();
  await db.insert(pledgeFollowUps).values({ id, pledgeId, userId: ctx.actor.userAccountId, note });
  return id;
}

export async function insertPledgeApplication(
  db: Db,
  ctx: Ctx,
  pledgeId: string,
  body: CreatePledgeApplicationBody,
) {
  const id = newId();
  await db.insert(pledgeApplications).values({
    id,
    pledgeId,
    journalId: body.journalId,
    amountMinor: body.amountMinor,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getPledgeApplication(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(pledgeApplications)
    .where(and(eq(pledgeApplications.id, id), isNull(pledgeApplications.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function sumPledgeApplications(db: Db, pledgeId: string) {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${pledgeApplications.amountMinor}),0)::bigint`,
    })
    .from(pledgeApplications)
    .where(
      and(eq(pledgeApplications.pledgeId, pledgeId), isNull(pledgeApplications.deletedAt)),
    );
  return Number(row?.total ?? 0);
}

export async function updatePledgeStatus(
  db: Db,
  ctx: Ctx,
  pledgeId: string,
  status: string,
) {
  await db
    .update(pledges)
    .set({
      status,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(and(eq(pledges.id, pledgeId), eq(pledges.churchId, ctx.churchId)));
}

export async function listUnpaidPledges(
  db: Db,
  ctx: Ctx,
  query: ListUnpaidPledgesQuery,
) {
  const asOf = query.asOf ?? new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(pledges)
    .where(
      and(
        eq(pledges.churchId, ctx.churchId),
        isNull(pledges.deletedAt),
        sql`${pledges.status} in ('open', 'partial')`,
        sql`${pledges.dueOn} is not null`,
        lte(pledges.dueOn, asOf),
      ),
    )
    .orderBy(asc(pledges.dueOn))
    .limit(query.limit);
}

export async function getJournal(db: Db, ctx: Ctx, id: string) {
  const [row] = await db.select().from(journals).where(and(eq(journals.id, id), eq(journals.churchId, ctx.churchId), isNull(journals.deletedAt))).limit(1);
  return row ?? null;
}
export async function listJournalLines(db: Db, journalId: string) {
  return db.select().from(journalLines).where(and(eq(journalLines.journalId, journalId), isNull(journalLines.deletedAt)));
}
export async function insertJournal(db: Db, ctx: Ctx, body: CreateJournalBody) {
  const id = newId();
  await db.insert(journals).values({ id, churchId: ctx.churchId, financialYearId: body.financialYearId, entryNumber: body.entryNumber, journalDate: body.journalDate, memo: body.memo, paymentMethod: body.paymentMethod, status: 'draft', createdBy: ctx.actor.userAccountId, updatedBy: ctx.actor.userAccountId });
  for (const line of body.lines) {
    await db.insert(journalLines).values({ id: newId(), journalId: id, accountId: line.accountId, fundId: line.fundId, debitMinor: line.debitMinor, creditMinor: line.creditMinor, currency: line.currency ?? 'TZS', memo: line.memo, createdBy: ctx.actor.userAccountId, updatedBy: ctx.actor.userAccountId });
  }
  return id;
}
export async function markJournalPosted(db: Db, ctx: Ctx, id: string) {
  await db.update(journals).set({ status: 'posted', postedAt: new Date(), updatedBy: ctx.actor.userAccountId, updatedAt: new Date() }).where(and(eq(journals.id, id), eq(journals.churchId, ctx.churchId)));
}

export async function markJournalReversed(db: Db, ctx: Ctx, id: string) {
  await db
    .update(journals)
    .set({
      status: 'reversed',
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(and(eq(journals.id, id), eq(journals.churchId, ctx.churchId)));
}

export async function findReversalForJournal(db: Db, ctx: Ctx, originalId: string) {
  const [row] = await db
    .select()
    .from(journals)
    .where(
      and(
        eq(journals.churchId, ctx.churchId),
        eq(journals.reversesEntryId, originalId),
        isNull(journals.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertReversingJournal(
  db: Db,
  ctx: Ctx,
  input: {
    financialYearId: string;
    entryNumber: string;
    journalDate: string;
    memo?: string;
    paymentMethod?: string | null;
    reversesEntryId: string;
    lines: Array<{
      accountId: string;
      fundId?: string | null;
      debitMinor: number;
      creditMinor: number;
      currency: string;
      memo?: string | null;
    }>;
  },
) {
  const id = newId();
  await db.insert(journals).values({
    id,
    churchId: ctx.churchId,
    financialYearId: input.financialYearId,
    entryNumber: input.entryNumber,
    journalDate: input.journalDate,
    memo: input.memo,
    paymentMethod: input.paymentMethod ?? undefined,
    reversesEntryId: input.reversesEntryId,
    status: 'posted',
    postedAt: new Date(),
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  for (const line of input.lines) {
    await db.insert(journalLines).values({
      id: newId(),
      journalId: id,
      accountId: line.accountId,
      fundId: line.fundId ?? undefined,
      debitMinor: line.debitMinor,
      creditMinor: line.creditMinor,
      currency: line.currency,
      memo: line.memo ?? undefined,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }
  return id;
}

export async function countDraftJournalsForYear(db: Db, ctx: Ctx, financialYearId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(journals)
    .where(
      and(
        eq(journals.churchId, ctx.churchId),
        eq(journals.financialYearId, financialYearId),
        eq(journals.status, 'draft'),
        isNull(journals.deletedAt),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function closeFinancialYear(db: Db, ctx: Ctx, id: string) {
  await db
    .update(financialYears)
    .set({
      status: 'closed',
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financialYears.id, id),
        eq(financialYears.churchId, ctx.churchId),
        isNull(financialYears.deletedAt),
      ),
    );
}

export async function getBudget(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.churchId, ctx.churchId), isNull(budgets.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function insertProject(db: Db, ctx: Ctx, body: CreateProjectBody) {
  const id = newId();
  await db.insert(projects).values({
    id,
    churchId: ctx.churchId,
    name: body.name,
    description: body.description,
    organisationalUnitId: body.organisationalUnitId,
    fundId: body.fundId,
    budgetId: body.budgetId,
    targetAmountMinor: body.targetAmountMinor,
    currency: body.currency ?? 'TZS',
    status: body.status ?? 'active',
    startsOn: body.startsOn,
    endsOn: body.endsOn,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getProject(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.churchId, ctx.churchId), isNull(projects.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function listProjects(db: Db, ctx: Ctx, query: ListProjectsQuery) {
  const conditions = [eq(projects.churchId, ctx.churchId), isNull(projects.deletedAt)];
  if (query.status) conditions.push(eq(projects.status, query.status));
  return db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(query.limit);
}

export async function listProjectAssignments(db: Db, projectId: string) {
  return db
    .select()
    .from(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), isNull(projectAssignments.deletedAt)))
    .orderBy(asc(projectAssignments.createdAt));
}

export async function listProjectContributions(db: Db, projectId: string) {
  return db
    .select()
    .from(projectContributions)
    .where(and(eq(projectContributions.projectId, projectId), isNull(projectContributions.deletedAt)))
    .orderBy(desc(projectContributions.contributedOn));
}

export async function sumProjectContributions(db: Db, projectId: string) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${projectContributions.amountMinor}),0)::bigint` })
    .from(projectContributions)
    .where(and(eq(projectContributions.projectId, projectId), isNull(projectContributions.deletedAt)));
  return Number(row?.total ?? 0);
}

export async function insertProjectAssignment(
  db: Db,
  ctx: Ctx,
  projectId: string,
  body: CreateProjectAssignmentBody,
) {
  const id = newId();
  await db.insert(projectAssignments).values({
    id,
    projectId,
    personId: body.personId,
    role: body.role,
    status: body.status ?? 'active',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getProjectAssignment(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(projectAssignments)
    .where(and(eq(projectAssignments.id, id), isNull(projectAssignments.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function insertProjectContribution(
  db: Db,
  ctx: Ctx,
  projectId: string,
  body: CreateProjectContributionBody,
) {
  const id = newId();
  await db.insert(projectContributions).values({
    id,
    projectId,
    personId: body.personId,
    amountMinor: body.amountMinor,
    currency: body.currency ?? 'TZS',
    contributedOn: body.contributedOn,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getProjectContribution(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(projectContributions)
    .where(and(eq(projectContributions.id, id), isNull(projectContributions.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function insertProjectInterest(
  db: Db,
  ctx: Ctx,
  projectId: string,
  personId: string,
  body: ExpressProjectInterestBody,
) {
  const id = newId();
  await db.insert(projectInterestRequests).values({
    id,
    projectId,
    personId,
    note: body.note,
    status: 'pending',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getProjectInterest(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select({
      id: projectInterestRequests.id,
      projectId: projectInterestRequests.projectId,
      personId: projectInterestRequests.personId,
      note: projectInterestRequests.note,
      status: projectInterestRequests.status,
      decidedByUserId: projectInterestRequests.decidedByUserId,
      decidedAt: projectInterestRequests.decidedAt,
      decisionNote: projectInterestRequests.decisionNote,
      resultingAssignmentId: projectInterestRequests.resultingAssignmentId,
      createdAt: projectInterestRequests.createdAt,
      churchId: projects.churchId,
    })
    .from(projectInterestRequests)
    .innerJoin(projects, eq(projects.id, projectInterestRequests.projectId))
    .where(
      and(
        eq(projectInterestRequests.id, id),
        eq(projects.churchId, ctx.churchId),
        isNull(projectInterestRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listProjectInterests(db: Db, projectId: string, status = 'pending') {
  return db
    .select()
    .from(projectInterestRequests)
    .where(
      and(
        eq(projectInterestRequests.projectId, projectId),
        eq(projectInterestRequests.status, status),
        isNull(projectInterestRequests.deletedAt),
      ),
    )
    .orderBy(desc(projectInterestRequests.createdAt));
}

export async function findPendingProjectInterest(
  db: Db,
  projectId: string,
  personId: string,
) {
  const [row] = await db
    .select()
    .from(projectInterestRequests)
    .where(
      and(
        eq(projectInterestRequests.projectId, projectId),
        eq(projectInterestRequests.personId, personId),
        eq(projectInterestRequests.status, 'pending'),
        isNull(projectInterestRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function decideProjectInterestRow(
  db: Db,
  ctx: Ctx,
  id: string,
  status: 'accepted' | 'declined',
  decisionNote: string | undefined,
  resultingAssignmentId?: string,
) {
  await db
    .update(projectInterestRequests)
    .set({
      status,
      decisionNote,
      decidedByUserId: ctx.actor.userAccountId,
      decidedAt: new Date(),
      resultingAssignmentId,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(eq(projectInterestRequests.id, id));
}
