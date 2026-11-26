import {
  withPlatformApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { z } from 'zod';
import { getPlatformAuditEvent } from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

const querySchema = z
  .object({
    scope: z.enum(['platform', 'tenant']).default('platform'),
  })
  .strict();

export const GET = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx?.params)?.id;
  if (!id) throw notFound();
  const query = parseQuery(new URL(request.url), querySchema);
  const result = await getPlatformAuditEvent(ctx, id, query.scope);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
