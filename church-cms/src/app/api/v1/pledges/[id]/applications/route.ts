import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import {
  createPledgeApplicationBodySchema,
  applyPledgeReceipt,
} from '@/modules/finance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, createPledgeApplicationBodySchema);
  const result = await applyPledgeReceipt(ctx, id, body);
  return jsonCreated(
    result,
    ctx.requestId,
    `/api/v1/pledges/${id}/applications/${result.application.id}`,
  );
});
