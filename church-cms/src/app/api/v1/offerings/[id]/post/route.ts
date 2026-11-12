import { withApiHandler, jsonOk } from '@/platform/http';
import { postOffering } from '@/modules/finance';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const offering = await postOffering(ctx, id);
  return jsonOk(offering, ctx.requestId);
});
