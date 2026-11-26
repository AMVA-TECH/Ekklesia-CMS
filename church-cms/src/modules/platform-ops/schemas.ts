import { z } from 'zod';

import { optionalTanzaniaPhoneE164Schema } from '@/platform/phone';
import { FINDING_SEVERITIES, FINDING_STATUSES } from './constants';
import { PLATFORM_PERMISSIONS } from './platform-permissions';

export const listPlatformAuditQuerySchema = z
  .object({
    /** Platform operator trail vs church-plane tenant audit. */
    scope: z.enum(['platform', 'tenant']).default('platform'),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    /** Exact action match when provided. */
    action: z.string().min(1).max(200).optional(),
    /** Case-insensitive substring match on action (and reason). */
    q: z.string().trim().max(120).optional(),
    churchId: z.guid().optional(),
    actorUserId: z.guid().optional(),
    entityType: z.string().trim().max(40).optional(),
    outcome: z.enum(['success', 'failure', 'denied']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListPlatformAuditQuery = z.infer<typeof listPlatformAuditQuerySchema>;

/** Irreversible audit purge — platform:admin + PIN + typed confirmation. */
export const purgeAuditLogsBodySchema = z
  .object({
    scope: z.enum(['platform', 'tenant', 'all']),
    /** Optional: only delete events strictly older than this instant. Omit = wipe all in scope. */
    before: z.string().datetime().optional(),
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
    /** Must be exactly DELETE to proceed. */
    confirm: z.literal('DELETE'),
    pin: z
      .string()
      .regex(/^\d{4,8}$/, 'PIN must be 4 to 8 digits.'),
  })
  .strict();

export type PurgeAuditLogsBody = z.infer<typeof purgeAuditLogsBodySchema>;

export const listChurchesQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    lifecycleStatus: z
      .enum(['active', 'suspended', 'closed', 'pending_activation'])
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export type ListChurchesQuery = z.infer<typeof listChurchesQuerySchema>;

export const platformSearchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(100),
  })
  .strict();

export type PlatformSearchQuery = z.infer<typeof platformSearchQuerySchema>;

export const reauthBodySchema = z
  .object({
    pin: z
      .string()
      .regex(/^\d{4,8}$/, 'PIN must be 4 to 8 digits.'),
  })
  .strict();

export type ReauthBody = z.infer<typeof reauthBodySchema>;

export const messagingTestBodySchema = z
  .object({
    channel: z.enum(['sms', 'email']),
    /** Phone (SMS) or email address (email). */
    to: z.string().trim().min(3).max(254),
    /** Optional — blank uses the standard platform test text. */
    body: z.string().trim().max(300).optional(),
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
    pin: z
      .string()
      .regex(/^\d{4,8}$/, 'PIN must be 4 to 8 digits.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.channel === 'email') {
      const ok = z.string().email().safeParse(value.to).success;
      if (!ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['to'],
          message: 'Enter a valid email address.',
        });
      }
    }
  });

export type MessagingTestBody = z.infer<typeof messagingTestBodySchema>;

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
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters) for the audit log.')
      .max(500, 'Reason is too long (max 500 characters).'),
    caseId: z.guid().optional(),
    accessLevel: z.enum(['read', 'interactive']).default('read'),
    expiresInMinutes: z.coerce.number().int().min(5).max(24 * 60).default(60),
  })
  .strict();

export type EnterTenantBody = z.infer<typeof enterTenantBodySchema>;

export const addOperatorBodySchema = z
  .object({
    email: z.string().trim().email().max(200),
    permissions: z
      .array(z.enum(PLATFORM_PERMISSIONS))
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

export const createChurchBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Church name must be at least 2 characters.')
      .max(120, 'Church name is too long.'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use a simple slug like “hope-church” (lowercase letters, numbers, hyphens).',
      )
      .min(2, 'Slug must be at least 2 characters.')
      .max(60, 'Slug is too long.')
      .optional(),
    timezone: z
      .string()
      .trim()
      .min(3, 'Choose a timezone, e.g. Africa/Dar_es_Salaam.')
      .max(64)
      .default('Africa/Dar_es_Salaam'),
    defaultLocale: z.enum(['en', 'sw']).default('sw'),
    admin: z
      .object({
        displayName: z
          .string()
          .trim()
          .min(2, 'Admin name must be at least 2 characters.')
          .max(120, 'Admin name is too long.'),
        email: z
          .string()
          .trim()
          .email('Enter a valid admin email address.')
          .max(254),
        phoneE164: optionalTanzaniaPhoneE164Schema,
        pin: z
          .string()
          .regex(/^\d{4,8}$/, 'PIN must be 4 to 8 digits.'),
      })
      .strict(),
  })
  .strict();

export type CreateChurchBody = z.infer<typeof createChurchBodySchema>;
