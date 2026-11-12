import { withApiHandler, jsonOk } from '@/platform/http';
import { closeFinancialYear } from '@/modules/finance';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const year = await closeFinancialYear(ctx, id);
  return jsonOk(year, ctx.requestId);
});
