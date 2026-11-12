import { withApiHandler, jsonOk } from '@/platform/http';
import { submitAnnouncement } from '@/modules/messaging';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await submitAnnouncement(ctx, id), ctx.requestId);
});
