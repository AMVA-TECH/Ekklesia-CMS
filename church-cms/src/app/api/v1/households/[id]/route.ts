import { withApiHandler, jsonOk } from '@/platform/http';
import { getHousehold } from '@/modules/households';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const household = await getHousehold(ctx, id);
  return jsonOk(household, ctx.requestId);
});
