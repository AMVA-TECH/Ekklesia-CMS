import { z } from 'zod';

import { tanzaniaPhoneE164Schema } from '@/platform/phone';

export const publicChurchSearchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(120),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type PublicChurchSearchQuery = z.infer<
  typeof publicChurchSearchQuerySchema
>;

export const createJoinRequestBodySchema = z
  .object({
    churchId: z.guid(),
    displayName: z.string().trim().min(2).max(120),
    /** Optional — phone is the primary login identifier for members. */
    email: z.string().trim().email().max(254).optional(),
    phoneE164: tanzaniaPhoneE164Schema,
    preferredLocale: z.enum(['en', 'sw']).default('sw'),
  })
  .strict();

export type CreateJoinRequestBody = z.infer<typeof createJoinRequestBodySchema>;

export const listJoinRequestsQuerySchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ListJoinRequestsQuery = z.infer<typeof listJoinRequestsQuerySchema>;

export const decideJoinRequestBodySchema = z
  .object({
    outcome: z.enum(['approved', 'rejected']),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type DecideJoinRequestBody = z.infer<typeof decideJoinRequestBodySchema>;
