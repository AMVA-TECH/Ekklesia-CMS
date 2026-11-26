import { z } from 'zod';

export const monitoringJobsQuerySchema = z
  .object({
    status: z
      .enum(['queued', 'sending', 'completed', 'failed', 'cancelled'])
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type MonitoringJobsQuery = z.infer<typeof monitoringJobsQuerySchema>;

export const monitoringCorrelateQuerySchema = z
  .object({
    requestId: z.string().trim().min(4).max(200),
  })
  .strict();

export type MonitoringCorrelateQuery = z.infer<
  typeof monitoringCorrelateQuerySchema
>;
