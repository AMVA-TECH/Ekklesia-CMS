import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import { createPledgeFollowUpBodySchema, addPledgeFollowUp } from '@/modules/finance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, createPledgeFollowUpBodySchema);
  const followUp = await addPledgeFollowUp(ctx, id, body);
  return jsonCreated(followUp, ctx.requestId, `/api/v1/pledges/${id}/follow-ups/${followUp.id}`);
});
