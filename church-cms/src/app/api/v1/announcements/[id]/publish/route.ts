import { withApiHandler, jsonOk } from '@/platform/http';
import { publishAnnouncement } from '@/modules/messaging';

export const POST = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await publishAnnouncement(ctx, id), ctx.requestId);
});
