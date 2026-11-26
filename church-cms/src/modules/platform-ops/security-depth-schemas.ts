import { z } from 'zod';

import { PLATFORM_PERMISSIONS } from './platform-permissions';

export const createAccessReviewBodySchema = z
  .object({
    title: z.string().trim().min(4).max(200),
    scope: z.enum([
      'platform_operators',
      'service_accounts',
      'break_glass',
      'support_sessions',
    ]),
    dueAt: z.string().datetime().optional(),
  })
  .strict();

export type CreateAccessReviewBody = z.infer<typeof createAccessReviewBodySchema>;

export const completeAccessReviewBodySchema = z
  .object({
    findingsSummary: z
      .string()
      .trim()
      .min(8, 'Summarise findings (at least 8 characters).')
      .max(4000),
  })
  .strict();

export type CompleteAccessReviewBody = z.infer<
  typeof completeAccessReviewBodySchema
>;

export const createBreakGlassBodySchema = z
  .object({
    operatorEmail: z.string().trim().email().max(200),
    reason: z
      .string()
      .trim()
      .min(12, 'Document the emergency reason (at least 12 characters).')
      .max(500),
    permissions: z.array(z.enum(PLATFORM_PERMISSIONS)).min(1).max(20),
    expiresInMinutes: z.coerce.number().int().min(5).max(12 * 60).default(60),
    /** Operator PIN step-up (required for emergency grants). */
    pin: z
      .string()
      .regex(/^\d{4,8}$/, 'PIN must be 4 to 8 digits.'),
  })
  .strict();

export type CreateBreakGlassBody = z.infer<typeof createBreakGlassBodySchema>;

export const revokeBreakGlassBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
  })
  .strict();

export type RevokeBreakGlassBody = z.infer<typeof revokeBreakGlassBodySchema>;
