import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, forbidden, notFound, validationFailed } from '@/platform/errors';
import { can } from '@/modules/access-control/can';
import { findPersonIdForUser, getPersonInChurch } from '@/modules/people/repository';
import { journalLinesBalance } from './journal-math';
import { getUnitById } from '@/modules/organisation/repository';
import {
  pledgeStatusFromApplied,
  toAccountResponse, toFinancialYearResponse, toFundResponse, toJournalResponse, toOfferingResponse,
  toPledgeApplicationResponse, toPledgeResponse, toProjectAssignmentResponse,
  toProjectContributionResponse, toProjectInterestResponse, toProjectResponse,
} from './mappers';
import {
  assertCanAssignProjects, assertCanDraftJournals, assertCanExpressProjectInterest,
  assertCanFollowUpPledges, assertCanPostJournals, assertCanReadAccounts, assertCanReadFunds,
  assertCanReadJournals, assertCanReadPledges, assertCanReadProjects, assertCanReverseJournals,
  assertCanWriteAccounts, assertCanWriteFunds, assertCanWriteOfferings, assertCanWritePeriods,
  assertCanWritePledges, assertCanWriteProjects,
} from './policies';
import type {
  CreateAccountBody, CreateFinancialYearBody, CreateFundBody, CreateJournalBody, CreateOfferingBody,
  CreatePledgeApplicationBody, CreatePledgeBody, CreatePledgeFollowUpBody, CreateProjectAssignmentBody,
  CreateProjectBody, CreateProjectContributionBody, DecideProjectInterestBody,
  ExpressProjectInterestBody, ListOfferingsQuery, ListProjectsQuery, ListUnpaidPledgesQuery,
} from './schemas';
import * as repo from './repository';

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

export async function listFunds(ctx: Ctx) {
  assertCanReadFunds(ctx);
  return { data: (await repo.listFunds(getDb(), ctx)).map(toFundResponse) };
}
export async function getFund(ctx: Ctx, id: string) {
  assertCanReadFunds(ctx);
  const row = await repo.getFund(getDb(), ctx, id);
  if (!row) throw notFound();
  return toFundResponse(row);
}
export async function createFund(ctx: Ctx, body: CreateFundBody) {
  assertCanWriteFunds(ctx);
  try {
    const id = await repo.insertFund(getDb(), ctx, body);
    await writeAudit(getDb(), ctx, { action: 'finance.fund.created', entityType: 'fund', entityId: id });
    return getFund(ctx, id);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Fund code already exists.');
    throw e;
  }
}

export async function listAccounts(ctx: Ctx) {
  assertCanReadAccounts(ctx);
  return { data: (await repo.listAccounts(getDb(), ctx)).map(toAccountResponse) };
}
export async function createAccount(ctx: Ctx, body: CreateAccountBody) {
  assertCanWriteAccounts(ctx);
  const db = getDb();
  if (body.parentId) {
    const parent = await repo.getAccount(db, ctx, body.parentId);
    if (!parent) throw notFound();
  }
  try {
    const id = await repo.insertAccount(db, ctx, body);
    await writeAudit(db, ctx, { action: 'finance.account.created', entityType: 'account', entityId: id });
    const row = await repo.getAccount(db, ctx, id);
    if (!row) throw notFound();
    return toAccountResponse(row);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Account code already exists.');
    throw e;
  }
}

export async function listFinancialYears(ctx: Ctx) {
  assertCanReadFunds(ctx);
  return { data: (await repo.listFinancialYears(getDb(), ctx)).map(toFinancialYearResponse) };
}
export async function createFinancialYear(ctx: Ctx, body: CreateFinancialYearBody) {
  assertCanWritePeriods(ctx);
  if (body.endsOn < body.startsOn) {
    throw validationFailed([{ field: 'endsOn', code: 'invalid_range', message: 'endsOn must be on or after startsOn' }]);
  }
  try {
    const id = await repo.insertFinancialYear(getDb(), ctx, body);
    await writeAudit(getDb(), ctx, { action: 'finance.financial_year.created', entityType: 'financial_year', entityId: id });
    const row = await repo.getFinancialYear(getDb(), ctx, id);
    if (!row) throw notFound();
    return toFinancialYearResponse(row);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Financial year label already exists.');
    throw e;
  }
}

export async function closeFinancialYear(ctx: Ctx, id: string) {
  assertCanWritePeriods(ctx);
  const db = getDb();
  const year = await repo.getFinancialYear(db, ctx, id);
  if (!year) throw notFound();
  if (year.status === 'closed') {
    throw conflict('Financial year is already closed.');
  }
  const drafts = await repo.countDraftJournalsForYear(db, ctx, id);
  if (drafts > 0) {
    throw conflict('Cannot close financial year while draft journals remain.');
  }
  await repo.closeFinancialYear(db, ctx, id);
  await writeAudit(db, ctx, {
    action: 'finance.financial_year.closed',
    entityType: 'financial_year',
    entityId: id,
  });
  const row = await repo.getFinancialYear(db, ctx, id);
  if (!row) throw notFound();
  return toFinancialYearResponse(row);
}

export async function listOfferings(ctx: Ctx, query: ListOfferingsQuery) {
  assertCanWriteOfferings(ctx);
  return { data: (await repo.listOfferings(getDb(), ctx, query)).map(toOfferingResponse) };
}
export async function createOffering(ctx: Ctx, body: CreateOfferingBody) {
  assertCanWriteOfferings(ctx);
  const db = getDb();
  if (body.fundId) {
    const fund = await repo.getFund(db, ctx, body.fundId);
    if (!fund) throw notFound();
  }
  if (body.incomeAccountId) {
    const account = await repo.getAccount(db, ctx, body.incomeAccountId);
    if (!account) throw notFound();
  }
  if (body.depositAccountId) {
    const account = await repo.getAccount(db, ctx, body.depositAccountId);
    if (!account) throw notFound();
  }
  if (body.post && (!body.incomeAccountId || !body.depositAccountId)) {
    throw validationFailed([
      {
        field: 'incomeAccountId',
        code: 'required',
        message: 'incomeAccountId and depositAccountId are required when post=true',
      },
    ]);
  }
  const id = await repo.insertOffering(db, ctx, body);
  await writeAudit(db, ctx, { action: 'finance.offering.created', entityType: 'offering', entityId: id });
  if (body.post) {
    return postOffering(ctx, id);
  }
  const row = await repo.getOffering(db, ctx, id);
  if (!row) throw notFound();
  return toOfferingResponse(row);
}

/**
 * Create + post a balanced income journal for an offering.
 * Debit deposit (cash/bank), credit income account.
 */
export async function postOffering(ctx: Ctx, offeringId: string) {
  assertCanWriteOfferings(ctx);
  const db = getDb();
  const offering = await repo.getOffering(db, ctx, offeringId);
  if (!offering) throw notFound();
  if (offering.journalId) {
    return toOfferingResponse(offering);
  }
  if (!offering.incomeAccountId || !offering.depositAccountId) {
    throw validationFailed([
      {
        field: 'incomeAccountId',
        code: 'required',
        message: 'incomeAccountId and depositAccountId are required to post an offering',
      },
    ]);
  }
  if (offering.incomeAccountId === offering.depositAccountId) {
    throw validationFailed([
      {
        field: 'depositAccountId',
        code: 'invalid',
        message: 'depositAccountId must differ from incomeAccountId',
      },
    ]);
  }

  const incomeAccount = await repo.getAccount(db, ctx, offering.incomeAccountId);
  const depositAccount = await repo.getAccount(db, ctx, offering.depositAccountId);
  if (!incomeAccount || !depositAccount) throw notFound();

  const year = await repo.findOpenFinancialYearCovering(db, ctx, offering.serviceDate);
  if (!year) {
    throw conflict('No open financial year covers the offering service date.');
  }

  const entryNumber = `OFF-${offering.id.replace(/-/g, '').slice(0, 12)}`;
  let journalId: string;
  try {
    journalId = await repo.insertJournal(db, ctx, {
      financialYearId: year.id,
      entryNumber,
      journalDate: offering.serviceDate,
      memo: offering.note ?? `Offering ${offering.id}`,
      lines: [
        {
          accountId: offering.depositAccountId,
          fundId: offering.fundId ?? undefined,
          debitMinor: offering.amountMinor,
          creditMinor: 0,
          currency: offering.currency as 'TZS' | 'USD',
        },
        {
          accountId: offering.incomeAccountId,
          fundId: offering.fundId ?? undefined,
          debitMinor: 0,
          creditMinor: offering.amountMinor,
          currency: offering.currency as 'TZS' | 'USD',
        },
      ],
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw conflict('Offering journal entry already exists.');
    }
    throw e;
  }

  await repo.markJournalPosted(db, ctx, journalId);
  await repo.linkOfferingJournal(db, ctx, offering.id, journalId);
  await writeAudit(db, ctx, {
    action: 'finance.offering.posted',
    entityType: 'offering',
    entityId: offering.id,
    metadata: { journalId },
  });
  const row = await repo.getOffering(db, ctx, offering.id);
  if (!row) throw notFound();
  return toOfferingResponse(row);
}

export async function listPledges(ctx: Ctx) {
  assertCanReadPledges(ctx);
  return { data: (await repo.listPledges(getDb(), ctx)).map(toPledgeResponse) };
}
export async function createPledge(ctx: Ctx, body: CreatePledgeBody) {
  assertCanWritePledges(ctx);
  const db = getDb();
  if (!body.personId && !body.householdId) {
    throw validationFailed([{ field: 'personId', code: 'required', message: 'personId or householdId is required' }]);
  }
  if (body.personId) {
    const person = await getPersonInChurch(db, ctx, body.personId);
    if (!person) throw notFound();
  }
  if (body.fundId) {
    const fund = await repo.getFund(db, ctx, body.fundId);
    if (!fund) throw notFound();
  }
  const id = await repo.insertPledge(db, ctx, body);
  await writeAudit(db, ctx, { action: 'finance.pledge.created', entityType: 'pledge', entityId: id });
  const row = await repo.getPledge(db, ctx, id);
  if (!row) throw notFound();
  return toPledgeResponse(row);
}
export async function addPledgeFollowUp(ctx: Ctx, pledgeId: string, body: CreatePledgeFollowUpBody) {
  assertCanFollowUpPledges(ctx);
  const db = getDb();
  const pledge = await repo.getPledge(db, ctx, pledgeId);
  if (!pledge) throw notFound();
  const id = await repo.insertPledgeFollowUp(db, ctx, pledgeId, body.note);
  await writeAudit(db, ctx, { action: 'finance.pledge.follow_up', entityType: 'pledge', entityId: pledgeId, metadata: { followUpId: id } });
  return { id, pledgeId, note: body.note };
}

/** Link a posted journal receipt to a pledge and recompute open/partial/fulfilled. */
export async function applyPledgeReceipt(
  ctx: Ctx,
  pledgeId: string,
  body: CreatePledgeApplicationBody,
) {
  assertCanWritePledges(ctx);
  const db = getDb();
  const pledge = await repo.getPledge(db, ctx, pledgeId);
  if (!pledge) throw notFound();
  if (pledge.status === 'cancelled') {
    throw conflict('Cannot apply receipts to a cancelled pledge.');
  }

  const journal = await repo.getJournal(db, ctx, body.journalId);
  if (!journal) throw notFound();
  if (journal.status !== 'posted') {
    throw conflict('Only posted journals can be linked as pledge receipts.');
  }

  const id = await repo.insertPledgeApplication(db, ctx, pledgeId, body);
  const appliedMinor = await repo.sumPledgeApplications(db, pledgeId);
  const nextStatus = pledgeStatusFromApplied(
    pledge.amountMinor,
    appliedMinor,
    pledge.status,
  );
  if (nextStatus !== pledge.status) {
    await repo.updatePledgeStatus(db, ctx, pledgeId, nextStatus);
  }

  await writeAudit(db, ctx, {
    action: 'finance.pledge.application',
    entityType: 'pledge',
    entityId: pledgeId,
    metadata: { applicationId: id, journalId: body.journalId, amountMinor: body.amountMinor, status: nextStatus },
  });

  const application = await repo.getPledgeApplication(db, id);
  if (!application) throw notFound();
  const updated = await repo.getPledge(db, ctx, pledgeId);
  if (!updated) throw notFound();
  return {
    application: toPledgeApplicationResponse(application),
    pledge: toPledgeResponse(updated, appliedMinor),
  };
}

export async function listUnpaidPledges(ctx: Ctx, query: ListUnpaidPledgesQuery) {
  assertCanReadPledges(ctx);
  const db = getDb();
  const rows = await repo.listUnpaidPledges(db, ctx, query);
  const data = await Promise.all(
    rows.map(async (row) => {
      const appliedMinor = await repo.sumPledgeApplications(db, row.id);
      return toPledgeResponse(row, appliedMinor);
    }),
  );
  return { data };
}

export async function getJournal(ctx: Ctx, id: string) {
  assertCanReadJournals(ctx);
  const db = getDb();
  const row = await repo.getJournal(db, ctx, id);
  if (!row) throw notFound();
  const lines = await repo.listJournalLines(db, id);
  return toJournalResponse(row, lines);
}
export async function createJournal(ctx: Ctx, body: CreateJournalBody) {
  assertCanDraftJournals(ctx);
  const db = getDb();
  const year = await repo.getFinancialYear(db, ctx, body.financialYearId);
  if (!year) throw notFound();
  for (const line of body.lines) {
    const account = await repo.getAccount(db, ctx, line.accountId);
    if (!account) throw notFound();
    if (line.debitMinor > 0 && line.creditMinor > 0) {
      throw validationFailed([{ field: 'lines', code: 'invalid_line', message: 'A line cannot have both debit and credit' }]);
    }
    if (line.debitMinor === 0 && line.creditMinor === 0) {
      throw validationFailed([{ field: 'lines', code: 'invalid_line', message: 'A line must have debit or credit' }]);
    }
  }
  try {
    const id = await repo.insertJournal(db, ctx, body);
    await writeAudit(db, ctx, { action: 'finance.journal.created', entityType: 'journal', entityId: id });
    return getJournal(ctx, id);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Journal entry number already exists.');
    throw e;
  }
}
export async function postJournal(ctx: Ctx, id: string) {
  assertCanPostJournals(ctx);
  const db = getDb();
  const row = await repo.getJournal(db, ctx, id);
  if (!row) throw notFound();
  if (row.status !== 'draft') throw conflict('Only draft journals can be posted.');
  const year = await repo.getFinancialYear(db, ctx, row.financialYearId);
  if (!year) throw notFound();
  if (year.status !== 'open') throw conflict('Cannot post into a closed financial year.');
  const lines = await repo.listJournalLines(db, id);
  if (!journalLinesBalance(lines)) throw conflict('Journal lines must balance before posting.');
  await repo.markJournalPosted(db, ctx, id);
  await writeAudit(db, ctx, { action: 'finance.journal.posted', entityType: 'journal', entityId: id });
  return getJournal(ctx, id);
}

export async function reverseJournal(ctx: Ctx, id: string) {
  assertCanReverseJournals(ctx);
  const db = getDb();
  const original = await repo.getJournal(db, ctx, id);
  if (!original) throw notFound();
  if (original.status !== 'posted') {
    throw conflict('Only posted journals can be reversed.');
  }
  const existingReversal = await repo.findReversalForJournal(db, ctx, id);
  if (existingReversal) {
    throw conflict('Journal already has a reversing entry.');
  }
  const year = await repo.getFinancialYear(db, ctx, original.financialYearId);
  if (!year) throw notFound();
  if (year.status !== 'open') {
    throw conflict('Cannot reverse in a closed financial year.');
  }

  const lines = await repo.listJournalLines(db, id);
  if (lines.length < 2) throw conflict('Journal has insufficient lines to reverse.');
  if (!journalLinesBalance(lines)) throw conflict('Original journal lines must balance.');

  const entryNumber = `${original.entryNumber}-R`;
  let reversalId: string;
  try {
    reversalId = await repo.insertReversingJournal(db, ctx, {
      financialYearId: original.financialYearId,
      entryNumber,
      journalDate: original.journalDate,
      memo: original.memo
        ? `Reversal of ${original.entryNumber}: ${original.memo}`
        : `Reversal of ${original.entryNumber}`,
      paymentMethod: original.paymentMethod,
      reversesEntryId: id,
      lines: lines.map((line) => ({
        accountId: line.accountId,
        fundId: line.fundId,
        debitMinor: line.creditMinor,
        creditMinor: line.debitMinor,
        currency: line.currency,
        memo: line.memo,
      })),
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw conflict('Reversal entry number already exists.');
    }
    throw e;
  }

  await repo.markJournalReversed(db, ctx, id);
  await writeAudit(db, ctx, {
    action: 'finance.journal.reversed',
    entityType: 'journal',
    entityId: id,
    metadata: { reversalId },
  });
  await writeAudit(db, ctx, {
    action: 'finance.journal.reversal_posted',
    entityType: 'journal',
    entityId: reversalId,
    metadata: { reversesEntryId: id },
  });

  return {
    original: await getJournal(ctx, id),
    reversal: await getJournal(ctx, reversalId),
  };
}

type ExpenseLike = {
  id: string;
  accountId: string | null;
  paymentAccountId: string | null;
  fundId: string | null;
  amountMinor: number;
  currency: string;
  expenseDate: string;
  purpose: string | null;
  status: string;
  journalId: string | null;
};

/**
 * Create + post a balanced payment journal for an approved expense.
 * Debit expense account, credit payment (cash/bank) account.
 */
export async function postApprovedExpense(ctx: Ctx, expense: ExpenseLike) {
  if (expense.journalId) {
    return { journalId: expense.journalId, alreadyPosted: true as const };
  }
  if (expense.status !== 'approved' && expense.status !== 'posted') {
    throw conflict('Only approved expenses can be posted to the journal.');
  }
  if (!expense.accountId || !expense.paymentAccountId) {
    throw validationFailed([
      {
        field: 'accountId',
        code: 'required',
        message: 'accountId and paymentAccountId are required to post an expense',
      },
    ]);
  }
  if (expense.accountId === expense.paymentAccountId) {
    throw validationFailed([
      {
        field: 'paymentAccountId',
        code: 'invalid',
        message: 'paymentAccountId must differ from accountId',
      },
    ]);
  }

  const db = getDb();
  const expenseAccount = await repo.getAccount(db, ctx, expense.accountId);
  const paymentAccount = await repo.getAccount(db, ctx, expense.paymentAccountId);
  if (!expenseAccount || !paymentAccount) throw notFound();

  const year = await repo.findOpenFinancialYearCovering(db, ctx, expense.expenseDate);
  if (!year) {
    throw conflict('No open financial year covers the expense date.');
  }

  const entryNumber = `EXP-${expense.id.replace(/-/g, '').slice(0, 12)}`;
  let journalId: string;
  try {
    journalId = await repo.insertJournal(db, ctx, {
      financialYearId: year.id,
      entryNumber,
      journalDate: expense.expenseDate,
      memo: expense.purpose ?? `Expense ${expense.id}`,
      lines: [
        {
          accountId: expense.accountId,
          fundId: expense.fundId ?? undefined,
          debitMinor: expense.amountMinor,
          creditMinor: 0,
          currency: expense.currency as 'TZS' | 'USD',
        },
        {
          accountId: expense.paymentAccountId,
          fundId: expense.fundId ?? undefined,
          debitMinor: 0,
          creditMinor: expense.amountMinor,
          currency: expense.currency as 'TZS' | 'USD',
        },
      ],
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw conflict('Expense journal entry already exists.');
    }
    throw e;
  }

  await repo.markJournalPosted(db, ctx, journalId);
  await writeAudit(db, ctx, {
    action: 'finance.expense.posted',
    entityType: 'expense',
    entityId: expense.id,
    metadata: { journalId },
  });
  return { journalId, alreadyPosted: false as const };
}

export async function listProjects(ctx: Ctx, query: ListProjectsQuery) {
  assertCanReadProjects(ctx);
  const rows = await repo.listProjects(getDb(), ctx, query);
  return { data: rows.map((row) => toProjectResponse(row)) };
}

export async function getProject(ctx: Ctx, id: string) {
  assertCanReadProjects(ctx);
  const db = getDb();
  const row = await repo.getProject(db, ctx, id);
  if (!row) throw notFound();
  const assignments = await repo.listProjectAssignments(db, id);
  const contributions = await repo.listProjectContributions(db, id);
  const raisedMinor = await repo.sumProjectContributions(db, id);
  const interestRequests = await repo.listProjectInterests(db, id, 'pending');
  return toProjectResponse(row, {
    assignments,
    contributions,
    interestRequests,
    raisedMinor,
  });
}

export async function createProject(ctx: Ctx, body: CreateProjectBody) {
  assertCanWriteProjects(ctx);
  const db = getDb();
  if (body.endsOn && body.startsOn && body.endsOn < body.startsOn) {
    throw validationFailed([
      { field: 'endsOn', code: 'invalid_range', message: 'endsOn must be on or after startsOn' },
    ]);
  }
  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }
  if (body.fundId) {
    const fund = await repo.getFund(db, ctx, body.fundId);
    if (!fund) throw notFound();
  }
  if (body.budgetId) {
    const budget = await repo.getBudget(db, ctx, body.budgetId);
    if (!budget) throw notFound();
  }
  const id = await repo.insertProject(db, ctx, body);
  await writeAudit(db, ctx, { action: 'finance.project.created', entityType: 'project', entityId: id });
  return getProject(ctx, id);
}

export async function assignProjectPerson(
  ctx: Ctx,
  projectId: string,
  body: CreateProjectAssignmentBody,
) {
  assertCanAssignProjects(ctx);
  const db = getDb();
  const project = await repo.getProject(db, ctx, projectId);
  if (!project) throw notFound();
  if (project.status !== 'active') {
    throw conflict('Only active projects accept assignments.');
  }
  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();
  try {
    const id = await repo.insertProjectAssignment(db, ctx, projectId, body);
    await writeAudit(db, ctx, {
      action: 'finance.project.assigned',
      entityType: 'project',
      entityId: projectId,
      metadata: { assignmentId: id, personId: body.personId },
    });
    const row = await repo.getProjectAssignment(db, id);
    if (!row) throw notFound();
    return toProjectAssignmentResponse(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw conflict('Person is already assigned to this project.');
    }
    throw e;
  }
}

export async function recordProjectContribution(
  ctx: Ctx,
  projectId: string,
  body: CreateProjectContributionBody,
) {
  assertCanWriteProjects(ctx);
  const db = getDb();
  const project = await repo.getProject(db, ctx, projectId);
  if (!project) throw notFound();
  if (project.status !== 'active') {
    throw conflict('Only active projects accept contributions.');
  }
  if (body.personId) {
    const person = await getPersonInChurch(db, ctx, body.personId);
    if (!person) throw notFound();
  }
  const id = await repo.insertProjectContribution(db, ctx, projectId, body);
  await writeAudit(db, ctx, {
    action: 'finance.project.contribution',
    entityType: 'project',
    entityId: projectId,
    metadata: { contributionId: id, amountMinor: body.amountMinor },
  });
  const row = await repo.getProjectContribution(db, id);
  if (!row) throw notFound();
  return toProjectContributionResponse(row);
}

export async function expressProjectInterest(
  ctx: Ctx,
  projectId: string,
  body: ExpressProjectInterestBody,
) {
  assertCanExpressProjectInterest(ctx);
  const db = getDb();
  const project = await repo.getProject(db, ctx, projectId);
  if (!project) throw notFound();
  if (project.status !== 'active') {
    throw conflict('Only active projects accept interest.');
  }

  let personId = body.personId;
  if (personId) {
    if (!can(ctx, 'projects:assign') && !can(ctx, 'projects:write')) {
      throw forbidden();
    }
  } else {
    personId = (await findPersonIdForUser(db, ctx)) ?? undefined;
  }
  if (!personId) {
    throw validationFailed([
      {
        field: 'personId',
        code: 'required',
        message: 'No person linked to this account; pass personId or link a person',
      },
    ]);
  }
  const person = await getPersonInChurch(db, ctx, personId);
  if (!person) throw notFound();

  const pending = await repo.findPendingProjectInterest(db, projectId, personId);
  if (pending) {
    throw conflict('A pending interest request already exists for this person.');
  }

  try {
    const id = await repo.insertProjectInterest(db, ctx, projectId, personId, body);
    await writeAudit(db, ctx, {
      action: 'finance.project.interest',
      entityType: 'project',
      entityId: projectId,
      metadata: { interestRequestId: id, personId },
    });
    const row = await repo.getProjectInterest(db, ctx, id);
    if (!row) throw notFound();
    return toProjectInterestResponse(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw conflict('A pending interest request already exists for this person.');
    }
    throw e;
  }
}

export async function decideProjectInterest(
  ctx: Ctx,
  interestRequestId: string,
  body: DecideProjectInterestBody,
) {
  assertCanAssignProjects(ctx);
  const db = getDb();
  const existing = await repo.getProjectInterest(db, ctx, interestRequestId);
  if (!existing) throw notFound();
  if (existing.status !== 'pending') {
    throw conflict('Interest request is already decided.');
  }

  let resultingAssignmentId: string | undefined;
  if (body.action === 'accept') {
    try {
      resultingAssignmentId = await repo.insertProjectAssignment(
        db,
        ctx,
        existing.projectId,
        {
          personId: existing.personId,
          role: body.role ?? 'volunteer',
          status: 'active',
        },
      );
    } catch (e) {
      if (isUniqueViolation(e)) {
        // Already assigned — still accept the interest request
        const assignments = await repo.listProjectAssignments(db, existing.projectId);
        resultingAssignmentId = assignments.find(
          (a) => a.personId === existing.personId,
        )?.id;
      } else {
        throw e;
      }
    }
  }

  await repo.decideProjectInterestRow(
    db,
    ctx,
    interestRequestId,
    body.action === 'accept' ? 'accepted' : 'declined',
    body.decisionNote,
    resultingAssignmentId,
  );
  await writeAudit(db, ctx, {
    action: `finance.project.interest.${body.action}`,
    entityType: 'project_interest_request',
    entityId: interestRequestId,
    metadata: { resultingAssignmentId: resultingAssignmentId ?? null },
  });
  const row = await repo.getProjectInterest(db, ctx, interestRequestId);
  if (!row) throw notFound();
  return toProjectInterestResponse(row);
}
