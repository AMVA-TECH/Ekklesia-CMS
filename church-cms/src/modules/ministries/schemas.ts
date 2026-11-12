import { z } from 'zod';

export const addParticipationBodySchema = z
  .object({
    personId: z.guid(),
    roleInUnit: z.string().trim().min(1).max(100).optional(),
    effectiveFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export type AddParticipationBody = z.infer<typeof addParticipationBodySchema>;

export const endParticipationBodySchema = z
  .object({
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export type EndParticipationBody = z.infer<typeof endParticipationBodySchema>;

export const createParticipationRequestBodySchema = z
  .object({
    organisationalUnitId: z.guid(),
    personId: z.guid().optional(),
  })
  .strict();

export type CreateParticipationRequestBody = z.infer<
  typeof createParticipationRequestBodySchema
>;

export const decideParticipationRequestBodySchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    roleInUnit: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export type DecideParticipationRequestBody = z.infer<
  typeof decideParticipationRequestBodySchema
>;

export const listMyParticipationRequestsQuerySchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListMyParticipationRequestsQuery = z.infer<
  typeof listMyParticipationRequestsQuerySchema
>;

export const participationResponseSchema = z.object({
  id: z.guid(),
  organisationalUnitId: z.guid(),
  personId: z.guid(),
  roleInUnit: z.string().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  status: z.string(),
});

export type ParticipationResponse = z.infer<typeof participationResponseSchema>;

export const participationRequestResponseSchema = z.object({
  id: z.guid(),
  organisationalUnitId: z.guid(),
  personId: z.guid(),
  status: z.string(),
  decidedAt: z.string().nullable(),
});

export type ParticipationRequestResponse = z.infer<
  typeof participationRequestResponseSchema
>;
