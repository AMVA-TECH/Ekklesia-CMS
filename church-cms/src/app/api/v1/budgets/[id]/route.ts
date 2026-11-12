import { withApiHandler, jsonOk } from '@/platform/http';
import { getBudget } from '@/modules/governance';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const budget = await getBudget(ctx, id);
  return jsonOk(budget, ctx.requestId);
});
