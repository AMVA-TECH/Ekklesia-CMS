import { z } from 'zod';

import { FINDING_SEVERITIES, FINDING_STATUSES } from './constants';

export const listPlatformAuditQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    action: z.string().min(1).max(200).optional(),
    churchId: z.guid().optional(),
    actorUserId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListPlatformAuditQuery = z.infer<typeof listPlatformAuditQuerySchema>;

export const listFindingsQuerySchema = z
  .object({
    status: z.enum(FINDING_STATUSES).optional(),
    severity: z.enum(FINDING_SEVERITIES).optional(),
    churchId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListFindingsQuery = z.infer<typeof listFindingsQuerySchema>;

export const patchFindingBodySchema = z
  .object({
    status: z.enum(['ack', 'resolved', 'open']),
  })
  .strict();

export type PatchFindingBody = z.infer<typeof patchFindingBodySchema>;

export const enterTenantBodySchema = z
  .object({
    reason: z.string().trim().min(8).max(500),
  })
  .strict();

export type EnterTenantBody = z.infer<typeof enterTenantBodySchema>;

export const addOperatorBodySchema = z
  .object({
    userAccountId: z.guid(),
    permissions: z
      .array(
        z.enum([
          'platform:read',
          'platform:admin',
          'platform:impersonate_tenant',
          'platform:security_read',
        ]),
      )
      .min(1)
      .optional(),
  })
  .strict();

export type AddOperatorBody = z.infer<typeof addOperatorBodySchema>;

export const growthQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(90).default(30),
  })
  .strict();

export type GrowthQuery = z.infer<typeof growthQuerySchema>;

const e164Phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164 (e.g. +2557…)');

export const createChurchBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
      .min(2)
      .max(60)
      .optional(),
    timezone: z.string().trim().min(3).max(64).default('Africa/Dar_es_Salaam'),
    defaultLocale: z.enum(['en', 'sw']).default('sw'),
    admin: z
      .object({
        displayName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(254),
        phoneE164: e164Phone.optional(),
        pin: z
          .string()
          .regex(/^\d{4,8}$/, 'PIN must be 4–8 digits'),
      })
      .strict(),
  })
  .strict();

export type CreateChurchBody = z.infer<typeof createChurchBodySchema>;
