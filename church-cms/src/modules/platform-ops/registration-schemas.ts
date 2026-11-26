import { z } from 'zod';

import { optionalTanzaniaPhoneE164Schema } from '@/platform/phone';
import { REGISTRATION_STATUSES } from './registration-constants';

export const submitChurchRegistrationBodySchema = z
  .object({
    officialName: z
      .string()
      .trim()
      .min(2, 'Church name must be at least 2 characters.')
      .max(160),
    displayName: z.string().trim().max(160).optional(),
    website: z
      .string()
      .trim()
      .max(300)
      .optional()
      .refine(
        (v) => !v || v === '' || /^https?:\/\//i.test(v),
        'Enter a valid website URL (https://…).',
      )
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    country: z.string().trim().min(2).max(2).default('TZ'),
    location: z.string().trim().max(200).optional(),
    address: z.string().trim().max(400).optional(),
    denomination: z.string().trim().max(120).optional(),
    yearEstablished: z.coerce.number().int().min(1800).max(2100).optional(),
    description: z.string().trim().max(2000).optional(),
    approxSize: z.string().trim().max(80).optional(),
    branchCount: z.coerce.number().int().min(0).max(10_000).optional(),
    representativeName: z
      .string()
      .trim()
      .min(2, 'Representative name is required.')
      .max(120),
    representativeRole: z.string().trim().max(120).optional(),
    email: z.string().trim().email('Enter a valid email.').max(254),
    phoneE164: optionalTanzaniaPhoneE164Schema,
    preferredContact: z.enum(['email', 'phone']).default('email'),
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
  })
  .strict();

export type SubmitChurchRegistrationBody = z.infer<
  typeof submitChurchRegistrationBodySchema
>;

export const verifyRegistrationEmailBodySchema = z
  .object({
    applicationId: z.guid(),
    token: z.string().trim().min(16).max(200),
  })
  .strict();

export type VerifyRegistrationEmailBody = z.infer<
  typeof verifyRegistrationEmailBodySchema
>;

export const publicRegistrationStatusQuerySchema = z
  .object({
    accessToken: z.string().trim().min(16).max(200),
  })
  .strict();

export type PublicRegistrationStatusQuery = z.infer<
  typeof publicRegistrationStatusQuerySchema
>;

export const listApplicationsQuerySchema = z
  .object({
    status: z.enum(REGISTRATION_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

export const assignApplicationBodySchema = z
  .object({
    reviewerUserId: z.guid().optional(),
  })
  .strict();

export type AssignApplicationBody = z.infer<typeof assignApplicationBodySchema>;

export const decideApplicationBodySchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(2000).optional(),
    /** Optional slug for approved tenants; otherwise derived from official name. */
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use a simple slug like “hope-church”.',
      )
      .min(2)
      .max(60)
      .optional(),
    timezone: z.string().trim().min(3).max(64).optional(),
    defaultLocale: z.enum(['en', 'sw']).optional(),
  })
  .strict();

export type DecideApplicationBody = z.infer<typeof decideApplicationBodySchema>;

const kycCheckKeySchema = z.enum([
  'email_verified',
  'church_identity',
  'location_plausible',
  'representative_identity',
  'contact_reachable',
  'no_duplicate_tenant',
  'profile_completeness',
  'risk_accepted',
]);

export const saveApplicationKycBodySchema = z
  .object({
    checks: z
      .array(
        z
          .object({
            key: kycCheckKeySchema,
            state: z.enum(['pending', 'pass', 'fail', 'na']),
            note: z.string().trim().max(500).nullable().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    reviewerNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type SaveApplicationKycBody = z.infer<typeof saveApplicationKycBodySchema>;

export const acceptAdminInviteBodySchema = z
  .object({
    token: z.string().trim().min(16).max(200),
    pin: z.string().regex(/^\d{4,8}$/, 'PIN must be 4 to 8 digits.'),
  })
  .strict();

export type AcceptAdminInviteBody = z.infer<typeof acceptAdminInviteBodySchema>;

export const patchTenantLifecycleBodySchema = z
  .object({
    lifecycleStatus: z.enum(['active', 'suspended', 'closed', 'pending_activation']),
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
    /** Required when suspending or closing a tenant. */
    pin: z
      .string()
      .regex(/^\d{4,8}$/, 'PIN must be 4 to 8 digits.')
      .optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (
      (body.lifecycleStatus === 'suspended' ||
        body.lifecycleStatus === 'closed') &&
      !body.pin
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['pin'],
        message: 'Confirm with your PIN to suspend or close a church.',
      });
    }
  });

export type PatchTenantLifecycleBody = z.infer<
  typeof patchTenantLifecycleBodySchema
>;
