import { z } from 'zod';
import {
  APPROVAL_ACTIONS,
  APPROVAL_STATUSES,
  BUDGET_PERIOD_KINDS,
  DELEGATION_STATUSES,
  IMPLEMENTED_REPORT_IDS,
  MINUTES_STATUSES,
} from './constants';

export const createExpenseBodySchema = z
  .object({
    amountMinor: z.number().int().positive(),
    currency: z.enum(['TZS', 'USD']).optional(),
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    purpose: z.string().trim().min(1).max(1000),
    organisationalUnitId: z.guid().optional(),
    accountId: z.guid().optional(),
    paymentAccountId: z.guid().optional(),
    fundId: z.guid().optional(),
  })
  .strict();
export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;

export const listApprovalsQuerySchema = z
  .object({
    status: z.enum(APPROVAL_STATUSES).optional().default('pending'),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>;

export const decideApprovalBodySchema = z
  .object({
    action: z.enum(APPROVAL_ACTIONS),
    note: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type DecideApprovalBody = z.infer<typeof decideApprovalBodySchema>;

export const createDelegationBodySchema = z
  .object({
    delegateUserId: z.guid(),
    grants: z.array(z.string().min(1).max(80)).min(1).max(50),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().optional(),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type CreateDelegationBody = z.infer<typeof createDelegationBodySchema>;

export const listDelegationsQuerySchema = z
  .object({
    status: z.enum(DELEGATION_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListDelegationsQuery = z.infer<typeof listDelegationsQuerySchema>;

export const reportQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    unitId: z.guid().optional(),
  })
  .strict();
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const reportIdSchema = z.enum(IMPLEMENTED_REPORT_IDS);

export const createBudgetBodySchema = z
  .object({
    financialYearId: z.guid(),
    name: z.string().trim().min(1).max(200),
    periodKind: z.enum(BUDGET_PERIOD_KINDS),
    periodKey: z.string().trim().min(1).max(32),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    fundId: z.guid().optional(),
    organisationalUnitId: z.guid().optional(),
    lines: z
      .array(
        z
          .object({
            accountId: z.guid(),
            amountMinor: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();
export type CreateBudgetBody = z.infer<typeof createBudgetBodySchema>;

export const createAppointmentRequestBodySchema = z
  .object({
    positionId: z.guid(),
    personId: z.guid(),
    organisationalUnitId: z.guid().optional(),
    reason: z.string().trim().min(1).max(1000).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();
export type CreateAppointmentRequestBody = z.infer<
  typeof createAppointmentRequestBodySchema
>;

export const decideAppointmentRequestBodySchema = z
  .object({
    action: z.enum(APPROVAL_ACTIONS),
    note: z.string().trim().min(1).max(1000).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();
export type DecideAppointmentRequestBody = z.infer<
  typeof decideAppointmentRequestBodySchema
>;

export const createMeetingMinutesBodySchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    body: z.string().trim().min(1).max(50_000),
    organisationalUnitId: z.guid().optional(),
    attendees: z.array(z.union([z.guid(), z.string().min(1).max(200)])).max(500).optional(),
    status: z.enum(MINUTES_STATUSES).optional(),
  })
  .strict();
export type CreateMeetingMinutesBody = z.infer<typeof createMeetingMinutesBodySchema>;

export const createSavedReportBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    reportId: z.enum(IMPLEMENTED_REPORT_IDS),
    filters: z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        unitId: z.guid().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type CreateSavedReportBody = z.infer<typeof createSavedReportBodySchema>;
