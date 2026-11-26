import { z } from 'zod';

import { PLATFORM_PERMISSIONS } from './platform-permissions';

export const patchOperatorBodySchema = z
  .object({
    status: z.enum(['active', 'suspended']).optional(),
    permissions: z.array(z.enum(PLATFORM_PERMISSIONS)).min(1).optional(),
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
  })
  .strict()
  .refine(
    (b) => b.status !== undefined || b.permissions !== undefined,
    'Provide status and/or permissions to update.',
  );

export type PatchOperatorBody = z.infer<typeof patchOperatorBodySchema>;

export const listTenantAccountsQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    status: z.enum(['active', 'suspended', 'locked']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListTenantAccountsQuery = z.infer<
  typeof listTenantAccountsQuerySchema
>;

export const patchTenantAccountBodySchema = z
  .object({
    /** Technical account status only — never membership/roles/leadership. */
    status: z.enum(['active', 'suspended', 'locked']),
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
  })
  .strict();

export type PatchTenantAccountBody = z.infer<
  typeof patchTenantAccountBodySchema
>;

export const listSessionsQuerySchema = z
  .object({
    userAccountId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const createServiceAccountBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use a lowercase slug name like “notify-worker”.',
      ),
    purpose: z.string().trim().min(8).max(500),
    scopes: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
    environment: z.enum(['all', 'development', 'staging', 'production']).default('all'),
    ownerUserId: z.guid().optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();

export type CreateServiceAccountBody = z.infer<
  typeof createServiceAccountBodySchema
>;

export const rotateServiceAccountBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
  })
  .strict();

export type RotateServiceAccountBody = z.infer<
  typeof rotateServiceAccountBodySchema
>;

export const revokeServiceAccountBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
  })
  .strict();

export type RevokeServiceAccountBody = z.infer<
  typeof revokeServiceAccountBodySchema
>;
