import { z } from 'zod';

export const analyticsQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(90).default(30),
  })
  .strict();

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
