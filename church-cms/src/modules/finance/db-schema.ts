/** Stage 4 — funds, accounts, journals, offerings, pledges, budgets, projects. */
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { organisationalUnits } from '@/modules/organisation/db-schema';
import { people } from '@/modules/people/db-schema';
import { households } from '@/modules/households/db-schema';
import { auditColumns } from '@/platform/db/columns';

/** Chart of accounts node. Amounts elsewhere are integer minor units. */

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    // asset | liability | equity | income | expense
    accountType: text('account_type').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => accounts.id),
    status: text('status').notNull().default('active'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('accounts_church_code_uidx').on(table.churchId, table.code),
  ],
);

/** Fiscal period (catalog: FiscalPeriod). */
export const financialYears = pgTable(
  'financial_years',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    label: text('label').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    // open | closed
    status: text('status').notNull().default('open'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('financial_years_church_label_uidx').on(table.churchId, table.label),
  ],
);

export const funds = pgTable(
  'funds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    // unrestricted | restricted | designated
    fundType: text('fund_type').notNull().default('unrestricted'),
    status: text('status').notNull().default('active'),
    ...auditColumns,
  },
  (table) => [uniqueIndex('funds_church_code_uidx').on(table.churchId, table.code)],
);

export const journals = pgTable(
  'journals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    financialYearId: uuid('financial_year_id')
      .notNull()
      .references(() => financialYears.id),
    entryNumber: text('entry_number').notNull(),
    journalDate: date('journal_date').notNull(),
    memo: text('memo'),
    paymentMethod: text('payment_method'),
    reversesEntryId: uuid('reverses_entry_id').references((): AnyPgColumn => journals.id),
    // draft | posted | reversed
    status: text('status').notNull().default('draft'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('journals_church_entry_number_uidx').on(
      table.churchId,
      table.entryNumber,
    ),
  ],
);

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id')
    .notNull()
    .references(() => journals.id),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  fundId: uuid('fund_id').references(() => funds.id),
  debitMinor: integer('debit_minor').notNull().default(0),
  creditMinor: integer('credit_minor').notNull().default(0),
  currency: text('currency').notNull().default('TZS'),
  memo: text('memo'),
  ...auditColumns,
});

export const offerings = pgTable('offerings', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  serviceDate: date('service_date').notNull(),
  fundId: uuid('fund_id').references(() => funds.id),
  /** Credit / income GL account when posting. */
  incomeAccountId: uuid('income_account_id').references(() => accounts.id),
  /** Debit / cash-bank deposit account when posting. */
  depositAccountId: uuid('deposit_account_id').references(() => accounts.id),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('TZS'),
  note: text('note'),
  journalId: uuid('journal_id').references(() => journals.id),
  ...auditColumns,
});

export const pledges = pgTable('pledges', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  personId: uuid('person_id').references(() => people.id),
  householdId: uuid('household_id').references(() => households.id),
  fundId: uuid('fund_id').references(() => funds.id),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('TZS'),
  dueOn: date('due_on'),
  // open | partial | fulfilled | cancelled
  status: text('status').notNull().default('open'),
  ...auditColumns,
});

export const pledgeApplications = pgTable('pledge_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  pledgeId: uuid('pledge_id')
    .notNull()
    .references(() => pledges.id),
  journalId: uuid('journal_id')
    .notNull()
    .references(() => journals.id),
  amountMinor: integer('amount_minor').notNull(),
  ...auditColumns,
});

export const pledgeFollowUps = pgTable('pledge_follow_ups', {
  id: uuid('id').primaryKey().defaultRandom(),
  pledgeId: uuid('pledge_id')
    .notNull()
    .references(() => pledges.id),
  userId: uuid('user_id').notNull(),
  note: text('note'),
  followedUpAt: timestamp('followed_up_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Disbursement / expense request (needs approval). */
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  organisationalUnitId: uuid('organisational_unit_id').references(
    () => organisationalUnits.id,
  ),
  accountId: uuid('account_id').references(() => accounts.id),
  /** Credit / cash-bank side used when auto-posting on approve. */
  paymentAccountId: uuid('payment_account_id').references(() => accounts.id),
  fundId: uuid('fund_id').references(() => funds.id),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('TZS'),
  expenseDate: date('expense_date').notNull(),
  purpose: text('purpose'),
  // draft | pending_approval | approved | rejected | posted
  status: text('status').notNull().default('draft'),
  journalId: uuid('journal_id').references(() => journals.id),
  ...auditColumns,
});

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    financialYearId: uuid('financial_year_id')
      .notNull()
      .references(() => financialYears.id),
    fundId: uuid('fund_id').references(() => funds.id),
    organisationalUnitId: uuid('organisational_unit_id').references(
      () => organisationalUnits.id,
    ),
    name: text('name').notNull(),
    /** monthly | quarterly | yearly */
    periodKind: text('period_kind').notNull().default('yearly'),
    /** e.g. 2026-03, 2026-Q1, 2026 */
    periodKey: text('period_key').notNull().default(''),
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
    status: text('status').notNull().default('draft'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('budgets_church_year_name_uidx').on(
      table.churchId,
      table.financialYearId,
      table.name,
    ),
  ],
);

export const budgetLines = pgTable(
  'budget_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    amountMinor: integer('amount_minor').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('budget_lines_budget_account_uidx').on(table.budgetId, table.accountId),
  ],
);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  organisationalUnitId: uuid('organisational_unit_id').references(
    () => organisationalUnits.id,
  ),
  fundId: uuid('fund_id').references(() => funds.id),
  budgetId: uuid('budget_id').references(() => budgets.id),
  name: text('name').notNull(),
  description: text('description'),
  targetAmountMinor: integer('target_amount_minor'),
  currency: text('currency').notNull().default('TZS'),
  status: text('status').notNull().default('active'),
  startsOn: date('starts_on'),
  endsOn: date('ends_on'),
  ...auditColumns,
});

export const projectAssignments = pgTable(
  'project_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    role: text('role'),
    status: text('status').notNull().default('active'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('project_assignments_project_person_uidx').on(
      table.projectId,
      table.personId,
    ),
  ],
);

/** Member volunteer interest (pending until leader accepts/declines). */
export const projectInterestRequests = pgTable(
  'project_interest_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    note: text('note'),
    // pending | accepted | declined | withdrawn
    status: text('status').notNull().default('pending'),
    decidedByUserId: uuid('decided_by_user_id'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionNote: text('decision_note'),
    resultingAssignmentId: uuid('resulting_assignment_id').references(
      () => projectAssignments.id,
    ),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('project_interest_requests_open_uidx')
      .on(table.projectId, table.personId)
      .where(sql`${table.status} = 'pending' AND ${table.deletedAt} is null`),
  ],
);

export const projectContributions = pgTable('project_contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  personId: uuid('person_id').references(() => people.id),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('TZS'),
  contributedOn: date('contributed_on').notNull(),
  journalId: uuid('journal_id').references(() => journals.id),
  ...auditColumns,
});

/** Generic approval workflow (expenses, budgets, announcements, …). */
export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  subjectType: text('subject_type').notNull(),
  subjectId: uuid('subject_id').notNull(),
  requestedByUserId: uuid('requested_by_user_id').notNull(),
  status: text('status').notNull().default('pending'),
  currentStep: integer('current_step').notNull().default(1),
  ...auditColumns,
});

export const approvalActions = pgTable('approval_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  approvalRequestId: uuid('approval_request_id')
    .notNull()
    .references(() => approvalRequests.id),
  actorUserId: uuid('actor_user_id').notNull(),
  // approve | reject | comment
  action: text('action').notNull(),
  note: text('note'),
  actedAt: timestamp('acted_at', { withTimezone: true }).notNull().defaultNow(),
});
