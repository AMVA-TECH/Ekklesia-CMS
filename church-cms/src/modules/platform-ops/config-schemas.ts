import { z } from 'zod';

export const platformConfigScopeSchema = z.enum([
  'global',
  'defaults',
  'tenant',
]);

export const getPlatformConfigQuerySchema = z
  .object({
    scope: platformConfigScopeSchema.default('global'),
    churchId: z.guid().optional(),
  })
  .strict()
  .refine(
    (q) => q.scope !== 'tenant' || Boolean(q.churchId),
    'churchId is required for tenant scope.',
  );

export type GetPlatformConfigQuery = z.infer<typeof getPlatformConfigQuerySchema>;

export const patchPlatformConfigBodySchema = z
  .object({
    scope: platformConfigScopeSchema,
    churchId: z.guid().optional(),
    document: z.record(z.string(), z.unknown()),
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters) for the audit log.')
      .max(500),
  })
  .strict()
  .refine(
    (b) => b.scope !== 'tenant' || Boolean(b.churchId),
    'churchId is required for tenant scope.',
  );

export type PatchPlatformConfigBody = z.infer<
  typeof patchPlatformConfigBodySchema
>;

export const listTenantConfigQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListTenantConfigQuery = z.infer<typeof listTenantConfigQuerySchema>;
