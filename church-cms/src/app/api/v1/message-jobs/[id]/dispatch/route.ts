import { withApiHandler, jsonOk } from '@/platform/http';
import { dispatchMessageJob } from '@/modules/messaging';

/** Leadership-triggered send through the configured notify provider. */
export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const job = await dispatchMessageJob(ctx, id);
  return jsonOk(job, ctx.requestId);
});
