import { withApiHandler, parseQuery, REQUEST_ID_HEADER } from '@/platform/http';
import { listUnpaidPledgesQuerySchema, listUnpaidPledges } from '@/modules/finance';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listUnpaidPledgesQuerySchema);
  const result = await listUnpaidPledges(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
