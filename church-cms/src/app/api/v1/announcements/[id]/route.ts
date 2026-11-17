import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  getAnnouncement,
  updateAnnouncement,
  updateAnnouncementBodySchema,
} from '@/modules/messaging';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await getAnnouncement(ctx, id), ctx.requestId);
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, updateAnnouncementBodySchema);
  return jsonOk(await updateAnnouncement(ctx, id, body), ctx.requestId);
});
