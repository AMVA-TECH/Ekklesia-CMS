import { z } from 'zod';

const e164Phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164 (e.g. +2557…)');

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
    email: z.string().trim().email().max(254).optional(),
    phoneE164: e164Phone.optional(),
    preferredLocale: z.enum(['en', 'sw']).default('sw'),
  })
  .strict()
  .refine((v) => Boolean(v.email || v.phoneE164), {
    message: 'Provide an email or phone number.',
  });

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
