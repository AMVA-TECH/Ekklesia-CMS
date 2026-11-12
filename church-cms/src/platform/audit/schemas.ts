import { z } from 'zod';

export const listAuditEventsQuerySchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    action: z.string().trim().min(1).max(200).optional(),
    entityType: z.string().trim().min(1).max(100).optional(),
    entityId: z.guid().optional(),
    actorUserId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListAuditEventsQuery = z.infer<typeof listAuditEventsQuerySchema>;
