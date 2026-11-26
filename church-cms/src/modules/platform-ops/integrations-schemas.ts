import { z } from 'zod';

export const listWebhookEventsQuerySchema = z
  .object({
    integrationCode: z.string().trim().min(1).max(80).optional(),
    direction: z.enum(['incoming', 'outgoing']).optional(),
    status: z
      .enum([
        'received',
        'processing',
        'succeeded',
        'failed',
        'replayed',
      ])
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListWebhookEventsQuery = z.infer<typeof listWebhookEventsQuerySchema>;

export const replayWebhookBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(8, 'Write a short reason (at least 8 characters).')
      .max(500),
  })
  .strict();

export type ReplayWebhookBody = z.infer<typeof replayWebhookBodySchema>;
