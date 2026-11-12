import { z } from 'zod';
import {
  ACCOUNT_TYPES,
  ACTIVE_STATUSES,
  CURRENCIES,
  FUND_TYPES,
  PERIOD_STATUSES,
  PROJECT_ASSIGNMENT_STATUSES,
  PROJECT_STATUSES,
} from './constants';

const money = z.number().int().positive();
const nonNegMoney = z.number().int().min(0);

export const createFundBodySchema = z.object({
  code: z.string().trim().min(1).max(50).regex(/^[A-Z0-9_]+$/),
  name: z.string().trim().min(1).max(200),
  fundType: z.enum(FUND_TYPES).optional(),
  status: z.enum(ACTIVE_STATUSES).optional(),
}).strict();
export type CreateFundBody = z.infer<typeof createFundBodySchema>;

export const createAccountBodySchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  accountType: z.enum(ACCOUNT_TYPES),
  parentId: z.guid().optional(),
  status: z.enum(ACTIVE_STATUSES).optional(),
}).strict();
export type CreateAccountBody = z.infer<typeof createAccountBodySchema>;

export const createFinancialYearBodySchema = z.object({
  label: z.string().trim().min(1).max(50),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(PERIOD_STATUSES).optional(),
}).strict();
export type CreateFinancialYearBody = z.infer<typeof createFinancialYearBodySchema>;

export const createOfferingBodySchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountMinor: money,
  currency: z.enum(CURRENCIES).optional(),
  fundId: z.guid().optional(),
  incomeAccountId: z.guid().optional(),
  depositAccountId: z.guid().optional(),
  note: z.string().trim().max(500).optional(),
  /** When true and both GL accounts are set, post income journal immediately. */
  post: z.boolean().optional(),
}).strict();
export type CreateOfferingBody = z.infer<typeof createOfferingBodySchema>;

export const listOfferingsQuerySchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();
export type ListOfferingsQuery = z.infer<typeof listOfferingsQuerySchema>;

export const createPledgeBodySchema = z.object({
  amountMinor: money,
  currency: z.enum(CURRENCIES).optional(),
  personId: z.guid().optional(),
  householdId: z.guid().optional(),
  fundId: z.guid().optional(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();
export type CreatePledgeBody = z.infer<typeof createPledgeBodySchema>;

export const createPledgeFollowUpBodySchema = z.object({
  note: z.string().trim().min(1).max(1000),
}).strict();
export type CreatePledgeFollowUpBody = z.infer<typeof createPledgeFollowUpBodySchema>;

export const createPledgeApplicationBodySchema = z
  .object({
    journalId: z.guid(),
    amountMinor: money,
  })
  .strict();
export type CreatePledgeApplicationBody = z.infer<
  typeof createPledgeApplicationBodySchema
>;

export const listUnpaidPledgesQuerySchema = z
  .object({
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListUnpaidPledgesQuery = z.infer<typeof listUnpaidPledgesQuerySchema>;

export const journalLineBodySchema = z.object({
  accountId: z.guid(),
  fundId: z.guid().optional(),
  debitMinor: nonNegMoney.default(0),
  creditMinor: nonNegMoney.default(0),
  currency: z.enum(CURRENCIES).optional(),
  memo: z.string().trim().max(300).optional(),
}).strict();

export const createJournalBodySchema = z.object({
  financialYearId: z.guid(),
  entryNumber: z.string().trim().min(1).max(50),
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().trim().max(500).optional(),
  paymentMethod: z.string().trim().max(50).optional(),
  lines: z.array(journalLineBodySchema).min(2).max(100),
}).strict();
export type CreateJournalBody = z.infer<typeof createJournalBodySchema>;

export const createProjectBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    organisationalUnitId: z.guid().optional(),
    fundId: z.guid().optional(),
    budgetId: z.guid().optional(),
    targetAmountMinor: z.number().int().positive().optional(),
    currency: z.enum(CURRENCIES).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;

export const listProjectsQuerySchema = z
  .object({
    status: z.enum(PROJECT_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const createProjectAssignmentBodySchema = z
  .object({
    personId: z.guid(),
    role: z.string().trim().min(1).max(100).optional(),
    status: z.enum(PROJECT_ASSIGNMENT_STATUSES).optional(),
  })
  .strict();
export type CreateProjectAssignmentBody = z.infer<
  typeof createProjectAssignmentBodySchema
>;

export const createProjectContributionBodySchema = z
  .object({
    amountMinor: money,
    contributedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    personId: z.guid().optional(),
    currency: z.enum(CURRENCIES).optional(),
  })
  .strict();
export type CreateProjectContributionBody = z.infer<
  typeof createProjectContributionBodySchema
>;

export const expressProjectInterestBodySchema = z
  .object({
    note: z.string().trim().min(1).max(1000).optional(),
    /** Admin may express interest on behalf of a person; members use linked person. */
    personId: z.guid().optional(),
  })
  .strict();
export type ExpressProjectInterestBody = z.infer<
  typeof expressProjectInterestBodySchema
>;

export const decideProjectInterestBodySchema = z
  .object({
    action: z.enum(['accept', 'decline']),
    decisionNote: z.string().trim().min(1).max(1000).optional(),
    role: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
export type DecideProjectInterestBody = z.infer<
  typeof decideProjectInterestBodySchema
>;
