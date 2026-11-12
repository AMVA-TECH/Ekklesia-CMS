import { withApiHandler, parseQuery, REQUEST_ID_HEADER } from '@/platform/http';
import { listAuditEvents, listAuditEventsQuerySchema } from '@/platform/audit';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listAuditEventsQuerySchema);
  const result = await listAuditEvents(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
