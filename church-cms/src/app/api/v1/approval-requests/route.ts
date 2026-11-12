import { withApiHandler, parseQuery, REQUEST_ID_HEADER } from '@/platform/http';
import { listApprovalsQuerySchema, listApprovalRequests } from '@/modules/governance';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listApprovalsQuerySchema);
  const result = await listApprovalRequests(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
