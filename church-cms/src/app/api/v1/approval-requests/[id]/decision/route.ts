import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { decideApprovalBodySchema, decideApproval } from '@/modules/governance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, decideApprovalBodySchema);
  const approval = await decideApproval(ctx, id, body);
  return jsonOk(approval, ctx.requestId);
});
