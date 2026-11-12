import { withApiHandler, jsonOk } from '@/platform/http';
import { getMessageJob } from '@/modules/messaging';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const job = await getMessageJob(ctx, id);
  return jsonOk(job, ctx.requestId);
});
