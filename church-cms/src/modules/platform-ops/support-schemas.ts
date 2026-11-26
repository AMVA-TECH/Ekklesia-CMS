import { z } from 'zod';

export const createSupportCaseBodySchema = z
  .object({
    title: z.string().trim().min(4).max(200),
    description: z.string().trim().max(4000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    churchId: z.guid().optional(),
  })
  .strict();

export type CreateSupportCaseBody = z.infer<typeof createSupportCaseBodySchema>;

export const patchSupportCaseBodySchema = z
  .object({
    title: z.string().trim().min(4).max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    status: z
      .enum(['open', 'in_progress', 'waiting', 'resolved', 'closed'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignedOperatorUserId: z.guid().nullable().optional(),
    churchId: z.guid().nullable().optional(),
  })
  .strict()
  .refine(
    (b) =>
      b.title !== undefined ||
      b.description !== undefined ||
      b.status !== undefined ||
      b.priority !== undefined ||
      b.severity !== undefined ||
      b.assignedOperatorUserId !== undefined ||
      b.churchId !== undefined,
    'Provide at least one field to update.',
  );

export type PatchSupportCaseBody = z.infer<typeof patchSupportCaseBodySchema>;

export const listSupportCasesQuerySchema = z
  .object({
    status: z
      .enum(['open', 'in_progress', 'waiting', 'resolved', 'closed'])
      .optional(),
    churchId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListSupportCasesQuery = z.infer<typeof listSupportCasesQuerySchema>;

export const startSupportSessionBodySchema = z
  .object({
    churchId: z.guid(),
    purpose: z
      .string()
      .trim()
      .min(8, 'Document the purpose (at least 8 characters).')
      .max(500),
    caseId: z.guid().optional(),
    accessLevel: z.enum(['read', 'interactive']).default('read'),
    expiresInMinutes: z.coerce.number().int().min(5).max(24 * 60).default(60),
  })
  .strict();

export type StartSupportSessionBody = z.infer<
  typeof startSupportSessionBodySchema
>;

export const revokeSupportSessionBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
  })
  .strict();

export type RevokeSupportSessionBody = z.infer<
  typeof revokeSupportSessionBodySchema
>;

export const listSupportSessionsQuerySchema = z
  .object({
    status: z.enum(['active', 'expired', 'revoked']).optional(),
    churchId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListSupportSessionsQuery = z.infer<
  typeof listSupportSessionsQuerySchema
>;

/** Extend enter-tenant with optional case / session controls. */
export const enterTenantSupportBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters) for the audit log.')
      .max(500),
    caseId: z.guid().optional(),
    accessLevel: z.enum(['read', 'interactive']).default('read'),
    expiresInMinutes: z.coerce.number().int().min(5).max(24 * 60).default(60),
  })
  .strict();

export type EnterTenantSupportBody = z.infer<typeof enterTenantSupportBodySchema>;
