import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { addHouseholdChildBodySchema, addHouseholdChild } from '@/modules/households';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, addHouseholdChildBodySchema);
  const household = await addHouseholdChild(ctx, id, body);
  return jsonOk(household, ctx.requestId);
});
