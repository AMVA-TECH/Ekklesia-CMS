import {
  withPlatformApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { z } from 'zod';
import { listMessagingDeliveries } from '@/modules/platform-ops';

const querySchema = z
  .object({
    status: z
      .enum(['pending', 'sent', 'delivered', 'failed'])
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), querySchema);
  const result = await listMessagingDeliveries(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
