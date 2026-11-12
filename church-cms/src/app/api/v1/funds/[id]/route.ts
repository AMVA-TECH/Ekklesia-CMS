import { withApiHandler, jsonOk } from '@/platform/http';
import { getFund } from '@/modules/finance';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await getFund(ctx, id), ctx.requestId);
});
