import { withApiHandler, jsonOk } from '@/platform/http';
import { cancelMyEventRegistration } from '@/modules/events';

export const DELETE = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await cancelMyEventRegistration(ctx, id), ctx.requestId);
});
